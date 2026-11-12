'use strict';

const assert = require('node:assert/strict');

const BASE_URL =
  process.env.ASLNS_TEST_BASE_URL ||
  'http://127.0.0.1:3001';

async function request(path, options = {}) {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function main() {
  const created = await request('/api/sessions', {
    method: 'POST',
    body: '{}'
  });

  assert.equal(
    created.status,
    201,
    'Session creation should return HTTP 201'
  );

  const sessionId =
    created.body.sessionId ||
    created.body.id;

  const token =
    created.body.accessToken;

  assert.ok(sessionId, 'Session ID missing');
  assert.ok(token, 'Session token missing');

  const endpoint =
    `/api/sessions/${sessionId}/profile-picture`;

  const missingToken = await request(endpoint, {
    method: 'POST',
    body: '{}'
  });

  assert.equal(
    missingToken.status,
    403,
    'Missing token must be rejected'
  );

  console.log('PASS: missing session token rejected');

  const wrongToken = await request(endpoint, {
    method: 'POST',
    headers: {
      'X-Session-Token': '0'.repeat(64)
    },
    body: '{}'
  });

  assert.equal(
    wrongToken.status,
    403,
    'Wrong token must be rejected'
  );

  console.log('PASS: wrong session token rejected');

  const validToken = await request(endpoint, {
    method: 'POST',
    headers: {
      'X-Session-Token': token
    },
    body: '{}'
  });

  assert.equal(
    validToken.status,
    403,
    'Session without consent must be rejected'
  );

  assert.match(
    validToken.body.error,
    /consent/i,
    'Rejection must identify missing consent'
  );

  console.log('PASS: missing consent rejected');

  console.log(
    'PASS: profile HTTP authentication tests'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error);
  process.exitCode = 1;
});
