'use strict';

const fs = require('node:fs');

function getProcessInfo(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) {
    throw new Error('Invalid PID');
  }

  const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
  const close = stat.lastIndexOf(')');

  if (close < 0) {
    throw new Error('Invalid process stat');
  }

  const fields = stat.slice(close + 2).trim().split(/\s+/);

  return {
    pid,
    state: fields[0],
    ppid: Number(fields[1]),
    pgrp: Number(fields[2]),
    starttime: fields[19]
  };
}

function listGroupMembers(pgid) {
  const members = [];

  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;

    const pid = Number(entry);

    try {
      const info = getProcessInfo(pid);

      if (
        info.pgrp === pgid &&
        info.state !== 'Z' &&
        info.state !== 'X'
      ) {
        members.push(info);
      }
    } catch (error) {
      if (
        error.code !== 'ENOENT' &&
        error.code !== 'ESRCH'
      ) {
        throw error;
      }
    }
  }

  return members;
}

function verifyWorkerGroup(workerPid, starttime) {
  const parent = getProcessInfo(process.pid);

  if (parent.pgrp === workerPid) {
    throw new Error('Refusing to target parent process group');
  }

  const worker = getProcessInfo(workerPid);

  if (worker.pgrp !== workerPid) {
    throw new Error('Worker is not process-group leader');
  }

  if (worker.starttime !== starttime) {
    throw new Error('Worker PID identity changed');
  }

  return true;
}

module.exports = {
  getProcessInfo,
  listGroupMembers,
  verifyWorkerGroup
};
