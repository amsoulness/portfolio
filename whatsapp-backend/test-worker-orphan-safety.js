'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createWorkerManager
} = require('./whatsapp-worker-manager');

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-orphan-')
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
      workerId: 'orphan-test'
    });

    process.on('message', message => {
      if (message?.type === 'SHUTDOWN') {
        child.kill('SIGKILL');
        process.exit(0);
      }
    });
  `);

  let manager;
  let workerPid;

  try {
    manager = createWorkerManager({
      workerFile,
      startupTimeoutMs: 3000
    });

    const ready = await manager.start();
    workerPid = ready.pid;

    console.log('Worker started:', workerPid);

    await sleep(500);

    process.kill(workerPid, 'SIGKILL');

    await sleep(500);

    const status = manager.getStatus();

    console.log('State after crash:', status.state);
    console.log('Cleanup error:', status.cleanupError);

    assert.equal(status.state, 'CLEANUP_FAILED');

    assert.match(
      status.cleanupError,
      /leader no longer present/
    );

    console.log('Orphan cleanup failure detected: PASSED');

    const replacement = createWorkerManager();

    await assert.rejects(
      replacement.start(),
      /Another WhatsApp worker is active/
    );

    console.log('Unsafe worker replacement blocked: PASSED');

    console.log(
      '\nORPHAN SAFETY TEST PASSED — Step 113D.3C.38'
    );
  } finally {
    // Remove the temporary test files.
    // The surviving child process is not terminated here.
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
