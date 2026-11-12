'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { fork } = require('node:child_process');
const path = require('node:path');

const { createMessage } =
  require('./whatsapp-ipc-protocol');

const sessionId = randomUUID();

const child = fork(
  path.join(__dirname, 'whatsapp-worker.js'),
  [],
  {
    env: {
      ...process.env,
      ASLNS_WORKER_SESSION_ID: sessionId
    },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc']
  }
);

function waitForMessage(predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('IPC response timed out'));
    }, timeoutMs);

    function onMessage(message) {
      if (!predicate(message)) return;
      cleanup();
      resolve(message);
    }

    function onExit() {
      cleanup();
      reject(new Error('Worker exited unexpectedly'));
    }

    function cleanup() {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('exit', onExit);
    }

    child.on('message', onMessage);
    child.on('exit', onExit);
  });
}

async function main() {
  await waitForMessage(
    message => message.type === 'WORKER_READY'
  );

  console.log('Worker startup: PASSED');

  const command = createMessage('PAIR_START', {
    sessionId,
    phoneNumber: '919876543210',
    consent: true
  });

  const responsePromise = waitForMessage(
    message =>
      message.requestId === command.requestId &&
      message.type === 'PAIR_STATUS'
  );

  child.send(command);

  const response = await responsePromise;

  assert.equal(response.version, 1);
  assert.equal(response.payload.status, 'PAIRING');
  assert.equal(response.payload.mock, true);

  console.log('Cross-process pairing command: PASSED');

  child.send({ type: 'SHUTDOWN' });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Shutdown timed out')),
      3000
    );

    child.once('exit', (code, signal) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(
          new Error(
            `Unexpected exit: ${code}, ${signal}`
          )
        );
      } else {
        resolve();
      }
    });
  });

  console.log('Worker shutdown: PASSED');

  console.log(
    '\nWORKER IPC TEST PASSED — Step 113D.3C.50'
  );
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  child.kill('SIGKILL');
  process.exitCode = 1;
});
