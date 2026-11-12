'use strict';

const assert = require('node:assert/strict');

const {
  createWorkerManager
} = require('./whatsapp-worker-manager');

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const a = createWorkerManager();

  const ready = await a.start();
  assert.ok(ready.pid > 1);

  assert.deepEqual(
    await Promise.all([
      a.shutdown(),
      a.shutdown()
    ]),
    [true, true]
  );

  console.log('Graceful concurrent shutdown: PASSED');

  const b = createWorkerManager();

  const worker = await b.start();

  process.kill(worker.pid, 'SIGKILL');

  const deadline = Date.now() + 5000;

  while (
    b.getStatus().state !== 'CLEANED' &&
    Date.now() < deadline
  ) {
    await sleep(50);
  }

  assert.equal(b.getStatus().state, 'CLEANED');

  console.log('Crash without descendants: PASSED');

  const c = createWorkerManager();

  await c.start();
  await c.shutdown();

  console.log('Worker slot reuse: PASSED');

  console.log(
    '\nALL TESTS PASSED — Step 113D.3C.35'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  process.exitCode = 1;
});
