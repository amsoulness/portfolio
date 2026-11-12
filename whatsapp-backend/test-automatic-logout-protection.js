'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const {
  reservePairing,
  getPairing,
  releasePairing
} = require('./pairing');

async function main() {
  const id = randomUUID();
  const pairing = reservePairing(id);

  let logoutCalls = 0;
  let destroyCalls = 0;

  pairing.client = {
    async logout() {
      logoutCalls++;
    },
    async destroy() {
      destroyCalls++;
    }
  };

  pairing.authenticated = true;
  pairing.initializationStarted = true;
  pairing.initializationSettled = true;

  try {
    await assert.rejects(
      releasePairing(id),
      /requires explicit authorization/
    );

    assert.equal(logoutCalls, 0);
    assert.equal(destroyCalls, 0);
    assert.equal(getPairing(id), pairing);

    console.log(
      'PASS: automatic logout rejected'
    );
    console.log(
      'PASS: browser not destroyed'
    );
    console.log(
      'PASS: pairing ownership preserved'
    );

    // Simulate explicit authorization to clean up
    // the test fixture.
    await releasePairing(id, {
      authorizeLogout: true
    });

    assert.equal(logoutCalls, 1);
    assert.equal(destroyCalls, 1);
    assert.equal(getPairing(id), null);

    console.log(
      'PASS: authorized cleanup succeeds'
    );
    console.log(
      'FAST-TRACK BATCH 1E COMPLETE'
    );
  } finally {
    if (pairing.timeout) {
      clearTimeout(pairing.timeout);
    }
  }
}

main().catch(error => {
  console.error('TEST FAILED:', error);
  process.exitCode = 1;
});
