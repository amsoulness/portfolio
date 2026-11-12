'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  startWorkerPairing,
  stopWorkerPairing,
  getWorkerPairingStatus
} = require('./pairing-worker-bridge');

async function main() {
  const sessionId = randomUUID();

  const starting = startWorkerPairing(
    sessionId,
    '919876543210',
    true
  );

  // Attach a rejection handler immediately so a cancelled
  // startup cannot produce an unhandled rejection.
  const startupResult = starting.then(
    value => ({ success: true, value }),
    error => ({ success: false, error })
  );

  const stopped = await stopWorkerPairing(sessionId);
  const result = await startupResult;

  assert.equal(stopped, true);
  assert.equal(
    getWorkerPairingStatus(sessionId),
    null,
    'Worker ownership must be cleared after cancellation'
  );

  assert.equal(
    result.success,
    false,
    'Concurrent cancellation must prevent successful pairing'
  );

  console.log(
    'Cancellation during startup: PASSED'
  );

  console.log(
    'Worker ownership released: PASSED'
  );

  // Confirm a new session can start after cleanup.
  const nextSessionId = randomUUID();

  const next = await startWorkerPairing(
    nextSessionId,
    '919876543210',
    true
  );

  assert.equal(next.status, 'PAIRING');

  await stopWorkerPairing(nextSessionId);

  assert.equal(
    getWorkerPairingStatus(nextSessionId),
    null
  );

  console.log(
    'New pairing after cancellation: PASSED'
  );

  console.log(
    '\nSTEP 113D.3C.72 PASSED'
  );
}

main().catch(error => {
  console.error(
    'STEP 113D.3C.72 FAILED:',
    error
  );
  process.exitCode = 1;
});
