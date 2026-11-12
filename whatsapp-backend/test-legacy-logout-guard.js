'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const {
  reservePairing,
  releasePairing,
  getPairing
} = require('./pairing');

async function main() {
  const sessionId = randomUUID();
  const pairing = reservePairing(sessionId);

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
  pairing.initializationPromise = Promise.resolve();
  pairing.status = 'READY';

  const authDir = path.join(
    __dirname,
    '.wwebjs_auth',
    `session-aslns-${sessionId}`
  );

  const marker = path.join(authDir, 'test-marker.txt');

  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(marker, 'TEST CREDENTIAL');

  try {
    await assert.rejects(
      releasePairing(sessionId),
      /explicit authorization/
    );

    assert.equal(logoutCalls, 0);
    assert.equal(destroyCalls, 0);
    assert.equal(getPairing(sessionId), pairing);
    assert.equal(
      await fs.readFile(marker, 'utf8'),
      'TEST CREDENTIAL'
    );

    console.log(
      'PASS: automatic cleanup preserves credentials'
    );

    await releasePairing(sessionId, {
      authorizeLogout: true
    });

    assert.equal(logoutCalls, 1);
    assert.equal(destroyCalls, 1);
    assert.equal(getPairing(sessionId), null);

    await assert.rejects(
      fs.access(marker),
      { code: 'ENOENT' }
    );

    console.log(
      'PASS: authorized logout removes test credentials'
    );

    console.log(
      'FAST-TRACK BATCH 1S COMPLETE'
    );
  } finally {
    // Remove only this test's random directory.
    await fs.rm(authDir, {
      recursive: true,
      force: true
    });
  }
}

main().catch(error => {
  console.error('TEST FAILED:', error);
  process.exitCode = 1;
});
