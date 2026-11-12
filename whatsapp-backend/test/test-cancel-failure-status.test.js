'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const lifecyclePath = require.resolve(
  '../whatsapp-live-lifecycle'
);
const commandsPath = require.resolve(
  '../whatsapp-worker-commands'
);
const clientPath = require.resolve(
  '../whatsapp-live-client'
);

test('failed cancellation must not report cleanup in progress', async () => {
  const lifecycleModule = require(lifecyclePath);
  const original = lifecycleModule.createLiveLifecycle;

  let cleanupCalls = 0;

  lifecycleModule.createLiveLifecycle = () => ({
    attach() {},
    markAuthenticated() {},
    getState() {
      return { cleanupStarted: false };
    },
    async cleanup() {
      cleanupCalls++;
      throw new Error(
        'Authenticated WhatsApp logout requires explicit authorization'
      );
    }
  });

  const clientModule = require(clientPath);
  const originalClient = clientModule.createLiveWhatsAppClient;

  clientModule.createLiveWhatsAppClient = () => ({
    initialize: async () => {},
    logout: async () => {},
    destroy: async () => {},
    setProfilePicture: async () => true,
    getState: async () => 'CONNECTED'
  });

  delete require.cache[commandsPath];

  try {
    const {
      createWorkerCommandHandler
    } = require(commandsPath);

    const sessionId = randomUUID();
    const handler = createWorkerCommandHandler(
      sessionId,
      () => {}
    );

    await handler.handle({
      version: 1,
      type: 'PAIR_START',
      requestId: randomUUID(),
      payload: {
        sessionId,
        phoneNumber: '919876543210',
        consent: true
      }
    });

    await assert.rejects(
      handler.handle({
        version: 1,
        type: 'PAIR_CANCEL',
        requestId: randomUUID(),
        payload: { sessionId }
      }),
      /explicit authorization/
    );

    assert.equal(cleanupCalls, 1);
    assert.notEqual(
      handler.getStatus(),
      'CLEANING_UP',
      'Rejected cancellation must not leave a misleading cleanup status'
    );
  } finally {
    lifecycleModule.createLiveLifecycle = original;
    clientModule.createLiveWhatsAppClient = originalClient;
    delete require.cache[commandsPath];
  }
});
