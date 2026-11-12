'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const bridgePath = path.resolve(
  __dirname,
  'pairing-worker-bridge.js'
);

const managerPath = require.resolve(
  './whatsapp-worker-manager'
);

const configPath = require.resolve(
  './whatsapp-live-config'
);

const originalManager = require.cache[managerPath];
const originalConfig = require.cache[configPath];
const originalBridge = require.cache[bridgePath];

let updateCalls = 0;
let resolveUpdate;
let rejectUpdate;
let eventListener;

const fakeManager = {
  onEvent(listener) {
    eventListener = listener;
    return () => {};
  },

  async start() {},

  async sendCommand(type, payload) {
    if (type === 'PAIR_START') {
      return {
        type: 'PAIR_STATUS',
        payload: {
          sessionId: payload.sessionId,
          status: 'PAIRING',
          mock: false
        }
      };
    }

    if (type === 'PROFILE_UPDATE') {
      updateCalls += 1;

      return new Promise((resolve, reject) => {
        resolveUpdate = resolve;
        rejectUpdate = reject;
      });
    }

    throw new Error('Unexpected command: ' + type);
  },

  getStatus() {
    return {
      state: 'READY',
      connected: true
    };
  },

  async shutdown() {}
};

async function main() {
  require.cache[managerPath] = {
    id: managerPath,
    filename: managerPath,
    loaded: true,
    exports: {
      createWorkerManager: () => fakeManager
    }
  };

  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      LIVE_ENABLED: true
    }
  };

  delete require.cache[bridgePath];

  const bridge = require(bridgePath);

  const sessionId =
    '11111111-1111-4111-8111-111111111111';

  await bridge.startWorkerPairing(
    sessionId,
    '919876543210',
    true
  );

  eventListener({
    type: 'PAIR_STATUS',
    payload: {
      sessionId,
      status: 'READY'
    }
  });

  const first = bridge.updateWorkerProfilePicture(
    sessionId,
    '/tmp/test-profile.jpg'
  );

  await assert.rejects(
    bridge.updateWorkerProfilePicture(
      sessionId,
      '/tmp/test-profile.jpg'
    ),
    /already in progress/i
  );

  assert.equal(
    updateCalls,
    1,
    'Concurrent request must not dispatch again'
  );

  console.log(
    'PASS: concurrent update rejected'
  );

  rejectUpdate(
    new Error('Worker command timed out')
  );

  await assert.rejects(
    first,
    /timed out/i
  );

  await assert.rejects(
    bridge.updateWorkerProfilePicture(
      sessionId,
      '/tmp/test-profile.jpg'
    ),
    /outcome is uncertain/i
  );

  assert.equal(
    updateCalls,
    1,
    'Retry after timeout must not be dispatched'
  );

  console.log(
    'PASS: retry after timeout blocked'
  );

  await assert.rejects(
    bridge.stopWorkerPairing(sessionId),
    /requires explicit logout/i
  );

  assert.ok(
    bridge.getWorkerPairingStatus(sessionId),
    'Worker ownership must survive uncertain profile update'
  );

  console.log(
    'PASS: automatic shutdown blocked after uncertain update'
  );

  console.log(
    'PASS: worker ownership preserved'
  );

  console.log(
    'PASS: profile update timeout guard tests'
  );
}

main()
  .catch(error => {
    console.error('TEST FAILED:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (originalManager) {
      require.cache[managerPath] = originalManager;
    } else {
      delete require.cache[managerPath];
    }

    if (originalConfig) {
      require.cache[configPath] = originalConfig;
    } else {
      delete require.cache[configPath];
    }

    if (originalBridge) {
      require.cache[bridgePath] = originalBridge;
    } else {
      delete require.cache[bridgePath];
    }
  });
