'use strict';

const assert = require('node:assert/strict');
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

const sessionId =
  '22222222-2222-4222-8222-222222222222';

let listener;
let updateCalls = 0;
let shutdownCalls = 0;
let failShutdown = false;

const fakeManager = {
  onEvent(callback) {
    listener = callback;
    return () => {};
  },

  async start() {},

  async sendCommand(type, payload) {
    if (type === 'PAIR_START') {
      return {
        type: 'PAIR_STATUS',
        payload: {
          sessionId,
          status: 'PAIRING',
          mock: false
        }
      };
    }

    if (type === 'PROFILE_UPDATE') {
      updateCalls += 1;

      return {
        type: 'PROFILE_UPDATED',
        payload: {
          sessionId: payload.sessionId,
          success: true
        }
      };
    }

    throw new Error('Unexpected command: ' + type);
  },

  getStatus() {
    return {
      state: 'READY',
      connected: true
    };
  },

  async shutdown() {
    shutdownCalls += 1;

    if (failShutdown) {
      throw new Error('Simulated shutdown failure');
    }
  }
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

  await bridge.startWorkerPairing(
    sessionId,
    '919876543210',
    true
  );

  listener({
    type: 'PAIR_STATUS',
    payload: {
      sessionId,
      status: 'READY'
    }
  });

  const first = await bridge.updateWorkerProfilePicture(
    sessionId,
    '/tmp/test-profile.jpg'
  );

  assert.equal(first.success, true);

  const second = await bridge.updateWorkerProfilePicture(
    sessionId,
    '/tmp/test-profile.jpg'
  );

  assert.equal(second.success, true);
  assert.equal(updateCalls, 2);

  console.log(
    'PASS: confirmed success permits another update'
  );

  await assert.rejects(
    bridge.stopWorkerPairing(sessionId),
    /requires explicit logout/i
  );

  assert.equal(
    shutdownCalls,
    0,
    'Authenticated worker must not be shut down automatically'
  );

  assert.ok(
    bridge.getWorkerPairingStatus(sessionId),
    'Authenticated worker ownership must be preserved'
  );

  await assert.rejects(
    bridge.startWorkerPairing(
      '33333333-3333-4333-8333-333333333333',
      '919876543210',
      true
    ),
    /already active/i
  );

  console.log(
    'PASS: authenticated worker shutdown blocked'
  );

  console.log(
    'PASS: authenticated worker ownership preserved'
  );

  console.log(
    'PASS: profile update lifecycle tests'
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
