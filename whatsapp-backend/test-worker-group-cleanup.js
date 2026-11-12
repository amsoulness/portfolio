'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const { isAlive } = require('./process-tree-cleanup');

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function getGroup(pid) {
  const output = execFileSync(
    'ps',
    ['-o', 'pgid=', '-p', String(pid)],
    { encoding: 'utf8' }
  );
  return Number(output.trim());
}

async function waitUntil(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(50);
  }

  return predicate();
}

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-group-crash-')
  );

  const pidFile = path.join(dir, 'child.pid');
  const workerFile = path.join(dir, 'worker.js');

  fs.writeFileSync(workerFile, `
    const fs = require('node:fs');
    const { spawn } = require('node:child_process');

    const child = spawn(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { stdio: 'ignore' }
    );

    fs.writeFileSync(
      ${JSON.stringify(pidFile)},
      String(child.pid)
    );

    setInterval(() => {}, 1000);
  `);

  const worker = spawn(process.execPath, [workerFile], {
    detached: true,
    stdio: 'ignore'
  });

  let childPid = null;
  let groupOwned = false;
  let childGroupVerified = false;

  try {
    assert.ok(worker.pid > 1);

    assert.equal(getGroup(worker.pid), worker.pid);
    assert.notEqual(getGroup(process.pid), worker.pid);

    groupOwned = true;

    console.log('Isolated group ownership: PASSED');

    assert.equal(
      await waitUntil(() => fs.existsSync(pidFile)),
      true
    );

    childPid = Number(fs.readFileSync(pidFile, 'utf8'));

    assert.ok(Number.isSafeInteger(childPid));
    assert.equal(getGroup(childPid), worker.pid);

    childGroupVerified = true;

    console.log('Child group membership: PASSED');

    // Simulate the worker crashing without stopping its child.
    process.kill(worker.pid, 'SIGKILL');

    assert.equal(
      await waitUntil(() => !isAlive(worker.pid)),
      true
    );

    console.log('Worker crash simulated: PASSED');

    // The child should remain alive after the leader crashes.
    assert.equal(isAlive(childPid), true);
    assert.equal(getGroup(childPid), worker.pid);

    console.log('Orphaned child detected: PASSED');

    // The group remains addressable even though its leader exited.
    process.kill(-worker.pid, 'SIGKILL');

    assert.equal(
      await waitUntil(() => !isAlive(childPid)),
      true
    );

    console.log('Orphaned child terminated: PASSED');

    console.log(
      '\nALL TESTS PASSED — Step 113D.3C.25'
    );
  } finally {
    // Only signal the test-owned group while its membership
    // is still verified. Never target the parent group.
    if (
      groupOwned &&
      childGroupVerified &&
      childPid &&
      isAlive(childPid)
    ) {
      try {
        if (getGroup(childPid) === worker.pid) {
          process.kill(-worker.pid, 'SIGKILL');
        }
      } catch (error) {
        if (error.code !== 'ESRCH') {
          console.error('Cleanup warning:', error.message);
        }
      }
    }

    fs.rmSync(dir, {
      recursive: true,
      force: true
    });
  }
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  process.exitCode = 1;
});
