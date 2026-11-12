'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const managerModule = require('./whatsapp-worker-manager');
const originalCreate = managerModule.createWorkerManager;

let emitEvent;
let currentSessionId;

managerModule.createWorkerManager = () => ({
  onEvent(callback) {
    emitEvent = callback;
    return () => {};
  },
  async start() {},
  async sendCommand(type) {
    if (type !== 'PAIR_START') {
      throw new Error('Unexpected command');
    }

    return {
      type: 'PAIR_STATUS',
      payload: {
        sessionId: currentSessionId,
        status: 'PAIRING',
        mock: true
      }
    };
  },
  async shutdown() {
    throw new Error('Shutdown should not occur');
  },
  getStatus() {
    return { status: 'RUNNING' };
  }
});

const bridge = require('./pairing-worker-bridge');
managerModule.createWorkerManager = originalCreate;

async function main() {
  const sessionId = randomUUID();
  currentSessionId = sessionId;

  await bridge.startWorkerPairing(
    sessionId,
    '919876543210',
    true
  );

  emitEvent({
    type: 'AUTHENTICATED',
    payload: { sessionId }
  });

  emitEvent({
    type: 'PAIR_STATUS',
    payload: {
      sessionId,
      status: 'DISCONNECTED'
    }
  });

  assert.equal(
    bridge.getWorkerPairingStatus(sessionId).status,
    'DISCONNECTED'
  );

  await assert.rejects(
    bridge.stopWorkerPairing(sessionId),
    /requires explicit logout/
  );

  console.log(
    'PASS: authenticated worker cannot be automatically stopped after disconnection'
  );
}

main().catch(error => {
  console.error('FAIL:', error.stack);
  process.exitCode = 1;
});
