'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLiveLifecycle
} = require('../whatsapp-live-lifecycle');

test('authenticated cleanup requires explicit logout', async () => {
  let logoutCalls = 0;
  let destroyCalls = 0;

  const client = {
    async logout() {
      logoutCalls++;
    },
    async destroy() {
      destroyCalls++;
    }
  };

  const lifecycle = createLiveLifecycle({
    timeoutMs: 1000
  });

  lifecycle.attach(client, Promise.resolve());
  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup(),
    /explicit authorization/
  );

  assert.equal(logoutCalls, 0);
  assert.equal(destroyCalls, 0);
  assert.equal(lifecycle.getState().authenticated, true);

  const result = await lifecycle.cleanup({
    authorizeLogout: true
  });

  assert.equal(result, true);
  assert.equal(logoutCalls, 1);
  assert.equal(destroyCalls, 1);
  assert.equal(lifecycle.getState().logoutConfirmed, true);
});

test('authenticated shutdown cleanup fails closed', async () => {
  let logoutCalls = 0;
  let destroyCalls = 0;

  const lifecycle = createLiveLifecycle({
    timeoutMs: 1000
  });

  lifecycle.attach({
    async logout() {
      logoutCalls++;
    },
    async destroy() {
      destroyCalls++;
    }
  }, Promise.resolve());

  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup(),
    /explicit authorization/
  );

  assert.equal(logoutCalls, 0);
  assert.equal(destroyCalls, 0);
  assert.equal(lifecycle.getState().authenticated, true);
});
