'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const {
  getProcessInfo,
  listGroupMembers,
  verifyWorkerGroup
} = require('./worker-group-guard');

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function waitUntil(check, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (check()) return true;
    await sleep(50);
  }

  return check();
}

function isRunning(pid) {
  try {
    const info = getProcessInfo(pid);
    return info.state !== 'Z' && info.state !== 'X';
  } catch (error) {
    if (error.code === 'ENOENT' ||
        error.code === 'ESRCH') return false;
    throw error;
  }
}

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-guarded-')
  );

  const pidFile = path.join(dir, 'child.pid');
  const script = path.join(dir, 'worker.js');

  fs.writeFileSync(script, `
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

  const worker = spawn(process.execPath, [script], {
    detached: true,
    stdio: 'ignore'
  });

  let ownedGroup = false;
  let childPid = null;

  try {
    const info = getProcessInfo(worker.pid);

    assert.equal(info.pgrp, worker.pid);
    assert.equal(
      verifyWorkerGroup(worker.pid, info.starttime),
      true
    );

    ownedGroup = true;
    console.log('Worker identity captured: PASSED');

    assert.equal(
      await waitUntil(() => fs.existsSync(pidFile)),
      true
    );

    childPid = Number(fs.readFileSync(pidFile, 'utf8'));

    assert.ok(Number.isSafeInteger(childPid));

    const childInfo = getProcessInfo(childPid);

    assert.equal(childInfo.pgrp, worker.pid);

    const childStarttime = childInfo.starttime;

    console.log('Child identity captured: PASSED');

    // Simulate worker crash.
    process.kill(worker.pid, 'SIGKILL');

    assert.equal(
      await waitUntil(() => !isRunning(worker.pid)),
      true
    );

    console.log('Worker crash detected: PASSED');

    // Verify surviving child by PID, group and start time.
    const survivor = getProcessInfo(childPid);

    assert.equal(survivor.pgrp, worker.pid);
    assert.equal(survivor.starttime, childStarttime);

    console.log('Survivor identity verified: PASSED');

    const members = listGroupMembers(worker.pid);

    assert.ok(
      members.some(member =>
        member.pid === childPid &&
        member.starttime === childStarttime
      )
    );

    console.log('Surviving group member found: PASSED');

    // Terminate only after verifying surviving membership.
    process.kill(-worker.pid, 'SIGKILL');

    assert.equal(
      await waitUntil(() => !isRunning(childPid)),
      true
    );

    console.log('Surviving child terminated: PASSED');

    console.log(
      '\nALL TESTS PASSED — Step 113D.3C.27'
    );
  } finally {
    // Best-effort cleanup of this test's isolated group.
    if (ownedGroup && childPid && isRunning(childPid)) {
      try {
        const info = getProcessInfo(childPid);

        if (info.pgrp === worker.pid) {
          process.kill(-worker.pid, 'SIGKILL');
        }
      } catch (error) {
        if (error.code !== 'ESRCH' &&
            error.code !== 'ENOENT') {
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
