'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  createWorkerManager
} = require('./whatsapp-worker-manager');

async function main() {
  const sessionId = randomUUID();

  const manager = createWorkerManager({
    sessionId,
    commandTimeoutMs: 5000
  });

  try {
    await manager.start();

    const pong = await manager.sendCommand(
      'PING',
      {}
    );

    assert.equal(pong.type, 'PONG');
    console.log('Manager-to-worker PING: PASSED');

    const pairing = await manager.sendCommand(
      'PAIR_START',
      {
        sessionId,
        phoneNumber: '919876543210',
        consent: true
      }
    );

    assert.equal(pairing.type, 'PAIR_STATUS');
    assert.equal(pairing.payload.sessionId, sessionId);
    assert.equal(pairing.payload.mock, true);

    console.log('Session-bound mock pairing: PASSED');

    await assert.rejects(
      manager.sendCommand('PAIR_CANCEL', {
        sessionId: randomUUID()
      }),
      /session/i
    );

    console.log('Wrong-session command rejected: PASSED');
  } finally {
    await manager.shutdown();
  }

  console.log(
    '\nWORKER MANAGER IPC TEST PASSED — Step 113D.3C.61'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  process.exitCode = 1;
});
