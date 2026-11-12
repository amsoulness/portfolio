'use strict';

const { spawn } = require('node:child_process');

function spawnIsolated(command, args = [], options = {}) {
  if (process.platform !== 'linux') {
    throw new Error('Linux is required');
  }

  return spawn(command, args, {
    ...options,
    detached: true,
    stdio: options.stdio || 'ignore'
  });
}

function terminateGroup(child, signal = 'SIGTERM') {
  if (!child || !Number.isSafeInteger(child.pid) ||
      child.pid <= 1) {
    throw new Error('Invalid process group leader');
  }

  // A detached Linux child becomes its own group leader.
  // Never use this with a non-isolated child.
  if (!child.__aslnsIsolated) {
    throw new Error('Process group ownership not verified');
  }

  try {
    process.kill(-child.pid, signal);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

function createIsolatedProcess(command, args = [], options = {}) {
  const child = spawnIsolated(command, args, options);

  // This marker is only valid for children created here.
  child.__aslnsIsolated = true;

  return child;
}

module.exports = {
  createIsolatedProcess,
  terminateGroup
};
