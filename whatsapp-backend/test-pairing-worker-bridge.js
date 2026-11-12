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

  try {
    const result = await startWorkerPairing(
      sessionId,
      '919876543210',
      true
    );

    assert.equal(result.sessionId, sessionId);
    assert.equal(result.status, 'PAIRING');

    console.log('Worker pairing started: PASSED');

    const status =
      getWorkerPairingStatus(sessionId);

    assert.equal(status.status, 'PAIRING');

    console.log('Worker pairing status: PASSED');

    await assert.rejects(
      startWorkerPairing(
        randomUUID(),
        '919876543210',
        true
      ),
      /already active/
    );

    console.log('Concurrent pairing blocked: PASSED');
  } finally {
    await stopWorkerPairing(sessionId);
  }

  assert.equal(
    getWorkerPairingStatus(sessionId),
    null
  );

  console.log('Worker cleanup: PASSED');

  console.log(
    '\nPAIRING WORKER BRIDGE TEST PASSED — Step 113D.3C.63'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  process.exitCode = 1;
});
