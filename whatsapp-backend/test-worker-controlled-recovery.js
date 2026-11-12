'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createWorkerManager
} = require('./whatsapp-worker-manager');

const {
  getProcessInfo,
  listGroupMembers
} = require('./worker-group-guard');

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-recovery-')
  );

  const workerFile = path.join(dir, 'worker.js');

  fs.writeFileSync(workerFile, `
    const { spawn } = require('node:child_process');

    const child = spawn(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { stdio: 'ignore' }
    );

    process.send({
      type: 'WORKER_READY',
      workerId: 'recovery-test',
      childPid: child.pid
    });

    process.on('message', message => {
      if (message?.type === 'SHUTDOWN') {
        child.kill('SIGKILL');
        process.exit(0);
      }
    });
  `);

  let childPid = null;
  let childStarttime = null;

  try {
    const manager = createWorkerManager({
      workerFile
    });

    const ready = await manager.start();

    const workerPid = ready.pid;

    const members = listGroupMembers(workerPid);

    const child = members.find(
      item => item.pid !== workerPid
    );

    assert.ok(child, 'Test child not found');

    childPid = child.pid;
    childStarttime = child.starttime;

    process.kill(workerPid, 'SIGKILL');

    await sleep(500);

    assert.equal(
      manager.getStatus().state,
      'CLEANUP_FAILED'
    );

    console.log('Orphan detected: PASSED');

    const current = getProcessInfo(childPid);

    assert.equal(
      current.starttime,
      childStarttime,
      'Child PID identity changed'
    );

    process.kill(childPid, 'SIGKILL');

    const deadline = Date.now() + 3000;

    while (
      listGroupMembers(workerPid).length &&
      Date.now() < deadline
    ) {
      await sleep(50);
    }

    assert.equal(
      listGroupMembers(workerPid).length,
      0
    );

    console.log('Orphan terminated: PASSED');

    assert.equal(await manager.recover(), true);

    console.log('Manager recovered: PASSED');

    const replacement = createWorkerManager();

    await replacement.start();
    await replacement.shutdown();

    console.log('Worker slot reused: PASSED');

    console.log(
      '\nCONTROLLED RECOVERY PASSED — Step 113D.3C.41'
    );
  } finally {
    // Do not signal an unverified PID during cleanup.
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
