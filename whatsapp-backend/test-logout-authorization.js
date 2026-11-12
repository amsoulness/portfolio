'use strict';

const assert = require('node:assert/strict');

const {
  createLiveLifecycle
} = require('./whatsapp-live-lifecycle');

async function main() {
  let logoutCalls = 0;
  let destroyCalls = 0;

  const lifecycle = createLiveLifecycle();

  lifecycle.attach({
    async logout() {
      logoutCalls++;
    },
    async destroy() {
      destroyCalls++;
    }
  });

  lifecycle.markAuthenticated();

  await assert.rejects(
    lifecycle.cleanup(),
    /requires explicit authorization/
  );

  assert.equal(logoutCalls, 0);
  assert.equal(destroyCalls, 0);
  assert.equal(
    lifecycle.getState().cleanupStarted,
    false
  );

  console.log(
    'PASS: automatic authenticated logout blocked'
  );

  await lifecycle.cleanup({
    authorizeLogout: true
  });

  assert.equal(logoutCalls, 1);
  assert.equal(destroyCalls, 1);
  assert.equal(
    lifecycle.getState().logoutConfirmed,
    true
  );

  console.log(
    'PASS: explicitly authorized logout succeeds'
  );

  console.log(
    'PASS: logout authorization guard'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error);
  process.exitCode = 1;
});
