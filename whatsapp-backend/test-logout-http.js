'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const BASE = 'http://127.0.0.1:31987';
const PORT = '31987';

const server = spawn(
  process.execPath,
  ['server.js'],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT,
      ASLNS_ENABLE_LIVE_WHATSAPP: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  }
);

let logs = '';

server.stdout.on('data', data => {
  logs += data.toString();
});

server.stderr.on('data', data => {
  logs += data.toString();
});

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function request(url, options) {
  const response = await fetch(BASE + url, options);

  return {
    status: response.status,
    body: await response.json()
  };
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) {
      throw new Error('Backend exited:\n' + logs);
    }

    try {
      const response = await fetch(BASE + '/api/health');

      if (response.ok) return;
    } catch {}

    await sleep(100);
  }

  throw new Error('Backend startup timed out:\n' + logs);
}

async function main() {
  await waitForServer();

  const created = await request('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: '{}'
  });

  assert.equal(created.status, 201, JSON.stringify(created));

  const { sessionId, accessToken } = created.body;

  assert.ok(sessionId);
  assert.ok(accessToken);

  const url = `/api/sessions/${sessionId}/logout`;

  const invalidToken = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': '0'.repeat(64)
    },
    body: JSON.stringify({ confirmLogout: true })
  });

  assert.equal(invalidToken.status, 403);

  console.log('PASS: invalid token rejected');

  const missingConfirmation = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': accessToken
    },
    body: '{}'
  });

  assert.equal(missingConfirmation.status, 403);

  console.log('PASS: explicit confirmation required');

  const mockLogout = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': accessToken
    },
    body: JSON.stringify({ confirmLogout: true })
  });

  assert.equal(mockLogout.status, 409);
  assert.notEqual(mockLogout.body.logoutConfirmed, true);

  console.log('PASS: mock logout cannot claim success');
  console.log('FAST-TRACK BATCH 1U COMPLETE');
}

main()
  .catch(error => {
    console.error('TEST FAILED:', error);
    console.error(logs);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.kill('SIGTERM');

    await Promise.race([
      new Promise(resolve => server.once('exit', resolve)),
      sleep(3000)
    ]);
  });
