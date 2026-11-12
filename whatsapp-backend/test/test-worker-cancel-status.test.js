'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  createWorkerCommandHandler
} = require('../whatsapp-worker-commands');

const {
  createMessage
} = require('../whatsapp-ipc-protocol');

test('mock cancellation completes safely', async () => {
  const sessionId = randomUUID();

  const handler = createWorkerCommandHandler(
    sessionId,
    () => {}
  );

  await handler.handle(
    createMessage('PAIR_START', {
      sessionId,
      phoneNumber: '919876543210',
      consent: true
    })
  );

  const response = await handler.handle(
    createMessage('PAIR_CANCEL', {
      sessionId
    })
  );

  assert.equal(response.payload.status, 'CANCELLED');
  assert.equal(handler.getStatus(), 'CANCELLED');
});

test('mock shutdown cleanup succeeds', async () => {
  const handler = createWorkerCommandHandler(
    randomUUID(),
    () => {}
  );

  await handler.cleanupForShutdown();

  assert.equal(handler.getStatus(), 'IDLE');
});
