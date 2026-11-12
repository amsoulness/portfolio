'use strict';

const path = require('node:path');
const { fork } = require('node:child_process');

const {
  createMessage,
  validateMessage
} = require('./whatsapp-ipc-protocol');

const {
  validateCommand
} = require('./whatsapp-ipc-payloads');

const {
  validateLiveEvent
} = require('./whatsapp-live-event-guard');
const {
  getProcessInfo,
  listGroupMembers
} = require('./worker-group-guard');

const DEFAULT_WORKER = path.join(
  __dirname,
  'whatsapp-worker.js'
);

let activeManager = null;

const delay = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function createWorkerManager(options = {}) {
  const workerFile = options.workerFile || DEFAULT_WORKER;

  const sessionId = options.sessionId ?? null;

  if (
    sessionId !== null &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)
  ) {
    throw new Error('Invalid worker session ID');
  }

  const commandTimeoutMs =
    options.commandTimeoutMs ?? 10000;

  const protectedShutdown =
    options.protectedShutdown === true;

  const pendingCommands = new Map();
  const startupTimeoutMs = options.startupTimeoutMs ?? 5000;
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? 5000;
  const cleanupTimeoutMs = options.cleanupTimeoutMs ?? 3000;

  let child = null;
  let state = 'IDLE';
  let identity = null;
  let exitPromise = null;
  let exitResult = null;
  let cleanupPromise = null;
  let shutdownPromise = null;
  let startupInProgress = false;
  let cleanupError = null;
  let shutdownAcknowledged = false;
  const eventListeners = new Set();

  function onEvent(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Event listener must be a function');
    }

    eventListeners.add(listener);

    return () => eventListeners.delete(listener);
  }

  function emitEvent(message) {
    for (const listener of eventListeners) {
      try {
        listener(message);
      } catch (error) {
        console.error(
          'Worker event listener failed:',
          error.message
        );
      }
    }
  }

  function rejectPending(error) {
    for (const [id, pending] of pendingCommands) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pendingCommands.delete(id);
    }
  }

  function onCommandMessage(message) {
    if (
      message &&
      message.type === 'SHUTDOWN_COMPLETE'
    ) {
      shutdownAcknowledged = true;
      return;
    }

    if (!message || message.version !== 1) {
      return;
    }

    try {
      validateMessage(message);
    } catch {
      return;
    }

    const pending = pendingCommands.get(message.requestId);

    if (!pending) {
      if (sessionId !== null) {
        const validated = validateLiveEvent(
          message,
          sessionId
        );

        if (validated) {
          emitEvent(validated);
        }
      }

      return;
    }

    // Ignore events that are not valid responses
    // to the command associated with this request.
    if (
      message.type !== 'PAIR_ERROR' &&
      message.type !== pending.expectedType
    ) {
      return;
    }

    clearTimeout(pending.timer);
    pendingCommands.delete(message.requestId);

    if (message.type === 'PAIR_ERROR') {
      pending.reject(
        new Error(
          message.payload.message || 'Worker command failed'
        )
      );
      return;
    }

    pending.resolve(message);
  }

  function sendCommand(type, payload = {}) {
    if (!sessionId) {
      return Promise.reject(
        new Error('Worker has no bound session')
      );
    }

    if (
      state !== 'READY' ||
      !child ||
      !child.connected ||
      exitResult
    ) {
      return Promise.reject(
        new Error('Worker is not ready')
      );
    }

    let message;

    try {
      message = createMessage(type, payload);
      validateCommand(message);
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingCommands.delete(message.requestId);
        reject(new Error('Worker command timed out'));
      }, commandTimeoutMs);

      const responseTypes = {
        PING: 'PONG',
        PAIR_START: 'PAIR_STATUS',
        PAIR_CANCEL: 'PAIR_STATUS',
        PROFILE_UPDATE: 'PROFILE_UPDATED',
        LOGOUT: 'LOGOUT_COMPLETE'
      };

      const expectedType = responseTypes[type];

      if (!expectedType) {
        clearTimeout(timer);
        reject(new Error('Unsupported response type'));
        return;
      }

      pendingCommands.set(message.requestId, {
        resolve,
        reject,
        timer,
        expectedType
      });

      try {
        child.send(message, error => {
          if (!error) return;

          const pending =
            pendingCommands.get(message.requestId);

          if (!pending) return;

          clearTimeout(pending.timer);
          pendingCommands.delete(message.requestId);
          reject(error);
        });
      } catch (error) {
        clearTimeout(timer);
        pendingCommands.delete(message.requestId);
        reject(error);
      }
    });
  }

  function getStatus() {
    return {
      state,
      pid: child?.pid ?? null,
      connected: Boolean(child?.connected),
      cleanupError: cleanupError?.message ?? null
    };
  }

  async function withTimeout(promise, ms, label) {
    let timer;

    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(label)),
            ms
          );
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  function snapshotGroup() {
    if (!identity) return [];

    const parent = getProcessInfo(process.pid);

    if (parent.pgrp === identity.pid) {
      throw new Error(
        'Refusing to inspect parent process group as worker group'
      );
    }

    return listGroupMembers(identity.pid);
  }

  function verifyGroupForSignal(members) {
    if (!identity) {
      throw new Error('Worker identity was not verified');
    }

    const parent = getProcessInfo(process.pid);

    if (parent.pgrp === identity.pid) {
      throw new Error(
        'Refusing to signal parent process group'
      );
    }

    const leader = members.find(
      member => member.pid === identity.pid
    );

    if (leader && leader.starttime !== identity.starttime) {
      throw new Error(
        'Worker process-group leader identity changed'
      );
    }

    if (members.length && !leader) {
      throw new Error(
        'Worker leader no longer present; cannot safely signal process group'
      );
    }
  }

  async function cleanup() {
    if (cleanupPromise) return cleanupPromise;

    cleanupPromise = (async () => {
      try {
        if (!child) return true;

        if (!identity) {
          throw new Error(
            'Worker identity unavailable; manual recovery required'
          );
        }

        state = 'CLEANING_UP';

        let members = snapshotGroup();

        if (members.length) {
          verifyGroupForSignal(members);
          process.kill(-identity.pid, 'SIGKILL');
        }

        const deadline = Date.now() + cleanupTimeoutMs;

        while (Date.now() < deadline) {
          members = snapshotGroup();

          if (!members.length) break;

          await delay(50);
        }

        if (members.length) {
          throw new Error(
            'Worker group still has live members'
          );
        }

        await withTimeout(
          exitPromise,
          cleanupTimeoutMs,
          'Worker exit not observed'
        );

        state = 'CLEANED';
        cleanupError = null;

        if (activeManager === api) {
          activeManager = null;
        }

        return true;
      } catch (error) {
        cleanupError = error;
        state = 'CLEANUP_FAILED';
        throw error;
      }
    })();

    try {
      return await cleanupPromise;
    } catch (error) {
      cleanupPromise = null;
      throw error;
    }
  }

  async function stopWorker() {
    if (!child) return null;
    if (exitResult) return exitResult;

    if (child.connected) {
      try {
        child.send({ type: 'SHUTDOWN' });
      } catch {
        // Worker may have exited.
      }
    }

    try {
      const result = await withTimeout(
        exitPromise,
        shutdownTimeoutMs,
        'Worker graceful shutdown timed out'
      );

      if (
        protectedShutdown &&
        !shutdownAcknowledged
      ) {
        throw new Error(
          'Worker exited without confirmed shutdown'
        );
      }

      return result;
    } catch (error) {
      if (protectedShutdown) {
        throw new Error(
          'Protected worker shutdown was not confirmed',
          { cause: error }
        );
      }

      if (!exitResult) {
        child.kill('SIGKILL');
      }

      await withTimeout(
        exitPromise,
        cleanupTimeoutMs,
        'Worker failed to exit after SIGKILL'
      );

      throw error;
    }
  }

  async function shutdown() {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      if (!child) return true;

      if (
        state !== 'CLEANED' &&
        state !== 'CLEANUP_FAILED'
      ) {
        state = 'STOPPING';
      }

      let stopError;

      try {
        await stopWorker();
      } catch (error) {
        stopError = error;
      }

      if (stopError && protectedShutdown) {
        state = 'CLEANUP_FAILED';
        cleanupError = stopError;

        // Preserve ownership. Do not automatically
        // kill an authenticated worker after a failed
        // graceful shutdown.
        throw stopError;
      }

      await cleanup();

      if (stopError) throw stopError;

      return true;
    })();

    try {
      return await shutdownPromise;
    } catch (error) {
      shutdownPromise = null;
      throw error;
    }
  }

  async function start() {
    if (state !== 'IDLE') {
      throw new Error('Manager already used');
    }

    if (activeManager) {
      throw new Error('Another WhatsApp worker is active');
    }

    if (process.platform !== 'linux') {
      throw new Error('Linux required');
    }

    activeManager = api;
    state = 'STARTING';
    startupInProgress = true;

    try {
      child = fork(workerFile, [], {
        detached: true,
        stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
        env: {
          ...process.env,
          ASLNS_WORKER_SESSION_ID: sessionId || ''
        }
      });
    } catch (error) {
      activeManager = null;
      state = 'STARTUP_FAILED';
      startupInProgress = false;
      throw error;
    }

    child.on('message', onCommandMessage);

    exitPromise = new Promise(resolve => {
      child.once('exit', (code, signal) => {
        rejectPending(new Error('Worker exited'));
        exitResult = { code, signal };
        resolve(exitResult);

        if (
          !startupInProgress &&
          !shutdownPromise &&
          !cleanupPromise
        ) {
          const recovery = cleanup();

          recovery.catch(error => {
            console.error(
              'Worker crash cleanup failed:',
              error.message
            );
          });
        }
      });
    });

    // Capture identity while the worker is still alive.
    // A detached child may need a brief moment to establish
    // its own Linux process group.
    const identityCapture = (async () => {
      const deadline = Date.now() + 1000;

      while (Date.now() < deadline && !exitResult) {
        try {
          const info = getProcessInfo(child.pid);

          if (info.pgrp === child.pid) {
            identity = {
              pid: child.pid,
              starttime: info.starttime
            };
            return true;
          }
        } catch (error) {
          if (
            error.code !== 'ENOENT' &&
            error.code !== 'ESRCH'
          ) {
            throw error;
          }
        }

        await delay(20);
      }

      return false;
    })();

    // Observe capture errors even if startup fails first.
    identityCapture.catch(() => {});

    let readyPromiseCleanup = null;

    const readyPromise = new Promise((resolve, reject) => {
      function onMessage(message) {
        if (message?.type === 'WORKER_READY') {
          clear();
          resolve(message);
        }
      }

      function onExit(code, signal) {
        clear();

        reject(
          new Error(
            `Worker exited during startup: ${code}, ${signal}`
          )
        );
      }

      function clear() {
        child.off('message', onMessage);
        child.off('exit', onExit);
      }

      child.on('message', onMessage);
      child.on('exit', onExit);

      readyPromiseCleanup = clear;
    });

    try {
      const ready = await withTimeout(
        readyPromise,
        startupTimeoutMs,
        'Worker startup timed out'
      );

      const info = getProcessInfo(child.pid);

      if (info.pgrp !== child.pid) {
        throw new Error('Worker not isolated');
      }

      identity = {
        pid: child.pid,
        starttime: info.starttime
      };

      state = 'READY';

      return {
        pid: child.pid,
        workerId: ready.workerId
      };
    } catch (error) {
      let recoveryError;

      try {
        await identityCapture;
        await shutdown();
      } catch (cleanupFailure) {
        recoveryError = cleanupFailure;
      }

      if (recoveryError) {
        throw new AggregateError(
          [error, recoveryError],
          'Startup and cleanup failed'
        );
      }

      throw error;
    } finally {
      startupInProgress = false;
      readyPromiseCleanup?.();
    }
  }

  async function recover() {
    if (state !== 'CLEANUP_FAILED') {
      throw new Error(
        'Recovery requires CLEANUP_FAILED state'
      );
    }

    if (!child || !exitResult) {
      throw new Error(
        'Cannot recover while worker exit is unconfirmed'
      );
    }

    if (!identity) {
      throw new Error(
        'Cannot recover without verified worker identity'
      );
    }

    if (cleanupPromise) {
      await cleanupPromise;
    }

    const parent = getProcessInfo(process.pid);

    if (parent.pgrp === identity.pid) {
      throw new Error(
        'Refusing recovery for parent process group'
      );
    }

    const members = listGroupMembers(identity.pid);

    if (members.length !== 0) {
      throw new Error(
        'Cannot recover: worker group still has live members'
      );
    }

    if (activeManager !== api) {
      throw new Error(
        'Worker ownership changed during recovery'
      );
    }

    state = 'CLEANED';
    cleanupError = null;
    activeManager = null;

    return true;
  }

  const api = {
    onEvent,
    recover,
    sendCommand,
    start,
    stop: stopWorker,

    forceStop: async () => {
      if (child && !exitResult) {
        child.kill('SIGKILL');
      }

      return exitPromise;
    },

    cleanupGroup: cleanup,
    shutdown,
    getStatus,

    waitForCrashCleanup: async () => {
      if (exitPromise) await exitPromise;
      return cleanup();
    }
  };

  return api;
}

module.exports = {
  createWorkerManager
};
