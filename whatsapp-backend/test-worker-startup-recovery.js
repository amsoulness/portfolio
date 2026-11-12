'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createWorkerManager
} = require('./whatsapp-worker-manager');

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-startup-')
  );

  const fakeWorker = path.join(dir, 'silent-worker.js');

  fs.writeFileSync(
    fakeWorker,
    "process.on('message', () => {});\n"
  );

  try {
    const failed = createWorkerManager({
      workerFile: fakeWorker,
      startupTimeoutMs: 300,
      shutdownTimeoutMs: 300,
      cleanupTimeoutMs: 1000
    });

    let startupError = null;

    try {
      await failed.start();
    } catch (error) {
      startupError = error;
    }

    assert.ok(startupError);

    console.log('Startup timeout detected: PASSED');
    console.log('Manager state:', failed.getStatus());

    const next = createWorkerManager();

    try {
      const ready = await next.start();

      assert.ok(ready.pid > 1);

      console.log('Worker slot recovered: PASSED');

      await next.shutdown();
    } catch (error) {
      if (
        /Another WhatsApp worker is active/.test(
          error.message
        )
      ) {
        console.log(
          'Worker slot remains blocked after startup failure'
        );
        console.log(
          'RECOVERY FIX REQUIRED — Step 113D.3C.36'
        );
      } else {
        throw error;
      }
    }
  } finally {
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
