const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLiveLifecycle
} = require('../whatsapp-live-lifecycle');

test('authenticated cleanup requires explicit authorization', async () => {
  const lifecycle = createLiveLifecycle();

  let logoutCalls = 0;
  let destroyCalls = 0;

  const fakeClient = {
    async logout() {
      logoutCalls++;
    },
    async destroy() {
      destroyCalls++;
    }
  };

  lifecycle.attach(fakeClient);
  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup(),
    /explicit authorization/i
  );

  assert.equal(logoutCalls, 0);
  assert.equal(destroyCalls, 0);
  assert.equal(lifecycle.getState().logoutConfirmed, false);

  await lifecycle.cleanup({ authorizeLogout: true });

  assert.equal(logoutCalls, 1);
  assert.equal(destroyCalls, 1);
  assert.equal(lifecycle.getState().logoutConfirmed, true);
});


test('logout timeout must not claim success', async () => {
  const lifecycle = createLiveLifecycle({
    timeoutMs: 50
  });

  let resolveLogout;
  let destroyCalls = 0;

  const fakeClient = {
    logout() {
      return new Promise(resolve => {
        resolveLogout = resolve;
      });
    },
    async destroy() {
      destroyCalls++;
    }
  };

  lifecycle.attach(fakeClient);
  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup({ authorizeLogout: true }),
    /timeout|timed out/i
  );

  assert.equal(lifecycle.getState().logoutConfirmed, false);
  assert.equal(destroyCalls, 0);

  resolveLogout();
});

test('browser destruction failure preserves logout confirmation', async () => {
  const lifecycle = createLiveLifecycle();

  let logoutCalls = 0;

  const fakeClient = {
    async logout() {
      logoutCalls++;
    },
    async destroy() {
      throw new Error('Simulated browser destruction failure');
    }
  };

  lifecycle.attach(fakeClient);
  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup({ authorizeLogout: true }),
    /Simulated browser destruction failure/
  );

  assert.equal(logoutCalls, 1);
  assert.equal(lifecycle.getState().logoutConfirmed, true);
  assert.equal(lifecycle.getState().attached, true);
});


test('cleanup can recover after timed-out logout completes', async () => {
  const lifecycle = createLiveLifecycle({ timeoutMs: 50 });

  let resolveLogout;
  let logoutCalls = 0;
  let destroyCalls = 0;

  const fakeClient = {
    logout() {
      logoutCalls++;
      return new Promise(resolve => {
        resolveLogout = resolve;
      });
    },
    async destroy() {
      destroyCalls++;
    }
  };

  lifecycle.attach(fakeClient);
  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup({ authorizeLogout: true }),
    /timeout|timed out/i
  );

  assert.equal(lifecycle.getState().logoutConfirmed, false);

  // Simulate the original logout finishing after timeout.
  resolveLogout();

  // Allow the original promise to settle.
  await new Promise(resolve => setImmediate(resolve));

  // Recovery must use explicit authorization again.
  await lifecycle.cleanup({ authorizeLogout: true });

  assert.equal(logoutCalls, 1);
  assert.equal(destroyCalls, 1);
  assert.equal(lifecycle.getState().logoutConfirmed, true);
  assert.equal(lifecycle.getState().attached, false);
});
