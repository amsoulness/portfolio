
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  reservePairing,
  getPairing,
  releasePairing
} = require('./pairing');

async function testFailedLogout() {
  const sessionId = crypto.randomUUID();
  const pairing = reservePairing(sessionId);

  let destroyCalled = false;
  let logoutCalls = 0;

  pairing.authenticated = true;

  pairing.client = {
    async logout() {
      logoutCalls += 1;
      throw new Error('Simulated logout failure');
    },

    async destroy() {
      destroyCalled = true;
    }
  };

  await assert.rejects(
    releasePairing(sessionId, {
      authorizeLogout: true
    }),
    /Simulated logout failure/
  );

  assert.equal(
    logoutCalls,
    1,
    'Logout must be attempted exactly once'
  );

  assert.equal(
    destroyCalled,
    false,
    'Browser must not be destroyed after failed logout'
  );

  assert.equal(
    pairing.logoutConfirmed,
    false,
    'Failed logout must never be confirmed'
  );

  assert.equal(
    pairing.status,
    'CLEANUP_FAILED',
    'Cleanup failure must remain visible'
  );

  assert.equal(
    getPairing(sessionId),
    pairing,
    'Pairing ownership must survive failed logout'
  );

  console.log('Cleanup failure reporting: PASSED');
}

testFailedLogout().catch(error => {
  console.error(
    'Cleanup failure reporting: FAILED'
  );
  console.error(error.message);
  process.exitCode = 1;
});
