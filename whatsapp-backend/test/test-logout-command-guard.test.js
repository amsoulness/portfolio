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

test('mock worker rejects concurrent logout commands', async () => {
  const sessionId = randomUUID();

  const handler = createWorkerCommandHandler(
    sessionId,
    () => {}
  );

  const logoutCommand = () =>
    createMessage('LOGOUT', {
      sessionId,
      authorizeLogout: true
    });

  const results = await Promise.allSettled([
    handler.handle(logoutCommand()),
    handler.handle(logoutCommand())
  ]);

  assert.equal(results.length, 2);

  for (const result of results) {
    assert.equal(result.status, 'rejected');

    assert.match(
      result.reason.message,
      /authenticated WhatsApp client/i
    );
  }
});
