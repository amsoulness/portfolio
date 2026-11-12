'use strict';

const assert = require('node:assert/strict');

const {
  createLiveLifecycle
} = require('./whatsapp-live-lifecycle');

async function main() {
  let logoutCalls = 0;
  let destroyCalls = 0;
  let resolveLogout;

  const logoutOperation = new Promise(resolve => {
    resolveLogout = resolve;
  });

  const client = {
    logout() {
      logoutCalls += 1;
      return logoutOperation;
    },

    async destroy() {
      destroyCalls += 1;
    }
  };

  const lifecycle = createLiveLifecycle({
    timeoutMs: 30
  });

  lifecycle.attach(client, Promise.resolve());
  lifecycle.markAuthenticated();

  // First cleanup times out while logout is pending.
  await assert.rejects(
    lifecycle.cleanup({ authorizeLogout: true }),
    /WhatsApp logout timed out/
  );

  assert.equal(logoutCalls, 1);
  assert.equal(destroyCalls, 0);

  console.log(
    'PASS: logout timeout prevents browser destruction'
  );

  // Retrying must not invoke logout a second time.
  await assert.rejects(
    lifecycle.cleanup({ authorizeLogout: true }),
    /WhatsApp logout timed out/
  );

  assert.equal(
    logoutCalls,
    1,
    'Logout must not be called twice'
  );

  assert.equal(destroyCalls, 0);

  console.log(
    'PASS: cleanup retry reuses original logout'
  );

  // Complete the original operation.
  resolveLogout();

  // Allow the promise resolution to propagate.
  await logoutOperation;

  // A later retry can finish cleanup safely.
  await lifecycle.cleanup({ authorizeLogout: true });

  assert.equal(logoutCalls, 1);
  assert.equal(destroyCalls, 1);

  const state = lifecycle.getState();

  assert.equal(state.logoutConfirmed, true);
  assert.equal(state.attached, false);

  console.log(
    'PASS: completed logout permits safe destruction'
  );

  console.log(
    'PASS: logout single-flight tests'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error);
  process.exitCode = 1;
});
