
'use strict';

const fs = require('node:fs/promises');

function parseLinuxProcessStartTime(content) {
  if (typeof content !== 'string') {
    throw new Error('Invalid process information');
  }

  // The comm field is enclosed in parentheses and
  // may itself contain spaces or parentheses.
  const closing = content.lastIndexOf(')');

  if (closing < 0) {
    throw new Error('Malformed Linux process information');
  }

  const remaining = content
    .slice(closing + 1)
    .trim()
    .split(/\s+/);

  // /proc/PID/stat field 22 is starttime.
  // After comm (field 2), remaining[0] is field 3.
  const startTime = remaining[19];

  if (
    !startTime ||
    !/^[0-9]+$/.test(startTime)
  ) {
    throw new Error('Invalid Linux process start time');
  }

  return startTime;
}

async function getProcessIdentity(pid = process.pid) {
  if (
    !Number.isSafeInteger(pid) ||
    pid <= 0
  ) {
    throw new Error('Invalid process ID');
  }

  if (process.platform !== 'linux') {
    throw new Error(
      'Process identity verification requires Linux'
    );
  }

  const content = await fs.readFile(
    `/proc/${pid}/stat`,
    'utf8'
  );

  return {
    pid,
    startTime: parseLinuxProcessStartTime(content)
  };
}

async function verifyProcessIdentity(identity) {
  if (
    !identity ||
    !Number.isSafeInteger(identity.pid) ||
    identity.pid <= 0 ||
    typeof identity.startTime !== 'string' ||
    !/^[0-9]+$/.test(identity.startTime)
  ) {
    return {
      status: 'INVALID_IDENTITY'
    };
  }

  try {
    const current = await getProcessIdentity(
      identity.pid
    );

    return {
      status:
        current.startTime === identity.startTime
          ? 'IDENTITY_MATCH'
          : 'IDENTITY_MISMATCH',
      pid: identity.pid
    };
  } catch (error) {
    if (error.code === 'ENOENT' ||
        error.code === 'ESRCH') {
      return {
        status: 'PROCESS_NOT_FOUND',
        pid: identity.pid
      };
    }

    return {
      status: 'IDENTITY_UNKNOWN',
      pid: identity.pid,
      reason: error.message
    };
  }
}

module.exports = {
  parseLinuxProcessStartTime,
  getProcessIdentity,
  verifyProcessIdentity
};
