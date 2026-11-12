'use strict';

const { randomUUID } = require('node:crypto');

const {
  createMessage
} = require('./whatsapp-ipc-protocol');

const {
  createWorkerCommandHandler
} = require('./whatsapp-worker-commands');

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const boundSessionId = process.env.ASLNS_WORKER_SESSION_ID;

const commandHandler =
  typeof boundSessionId === 'string' &&
  SESSION_ID_PATTERN.test(boundSessionId)
    ? createWorkerCommandHandler(
        boundSessionId,
        event => {
          if (process.connected) {
            process.send({
              ...createMessage(
                event.type,
                event.payload,
                event.requestId || randomUUID()
              ),
              workerId
            });
          }
        }
      )
    : null;

const workerId = randomUUID();

let shuttingDown = false;

function send(type, data = {}, callback) {
  if (
    typeof process.send === 'function' &&
    process.connected
  ) {
    process.send(
      {
        type,
        workerId,
        ...data
      },
      callback
    );
  } else if (callback) {
    callback(new Error('IPC channel unavailable'));
  }
}

async function shutdown() {
  if (shuttingDown) return;

  shuttingDown = true;

  try {
    if (commandHandler) {
      await commandHandler.cleanupForShutdown();
    }

    process.exitCode = 0;

    send('SHUTDOWN_COMPLETE', {}, error => {
      if (error) {
        console.error(
          'Shutdown acknowledgment failed:',
          error.message
        );
        process.exitCode = 1;
      }

      if (process.connected) {
        process.disconnect();
      }
    });
  } catch (error) {
    console.error(
      'WhatsApp cleanup failed during shutdown:',
      error.message
    );

    process.exitCode = 1;

    // Do not acknowledge successful cleanup.
    // Keep IPC connected so the manager can detect
    // shutdown failure or timeout.
    shuttingDown = false;
  }
}

process.on('message', message => {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.version === 1 && commandHandler) {
    if (shuttingDown) return;

    Promise.resolve()
      .then(() => commandHandler.handle(message))
      .then(response => {
        if (!process.connected) return;

        process.send({
          ...createMessage(
            response.type,
            response.payload,
            response.requestId
          ),
          workerId
        });
      })
      .catch(error => {
        if (!process.connected) return;

        const requestId =
          typeof message.requestId === 'string' &&
          SESSION_ID_PATTERN.test(message.requestId)
            ? message.requestId
            : randomUUID();

        process.send({
          ...createMessage(
            'PAIR_ERROR',
            {
              message: error.message
            },
            requestId
          ),
          workerId
        });
      });

    return;
  }

  if (message.type === 'PING' && !shuttingDown) {
    send('PONG');
    return;
  }

  if (message.type === 'SHUTDOWN') {
    shutdown();
  }
});

process.on('disconnect', () => {
  if (!shuttingDown) {
    shuttingDown = true;
    process.exitCode = 0;
  }
});

send('WORKER_READY', {
  pid: process.pid
});
