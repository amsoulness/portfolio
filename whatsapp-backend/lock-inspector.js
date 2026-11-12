
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const {
  verifyProcessIdentity
} = require('./process-identity');

// =====================================================
// CONFIGURATION
// =====================================================

const DEFAULT_LOCK_DIR = path.join(
  __dirname,
  '.aslns-instance-lock'
);

// =====================================================
// READ-ONLY INSTANCE LOCK INSPECTION
// =====================================================

async function inspectInstanceLock(
  lockDir = DEFAULT_LOCK_DIR
) {
  let lockStats;

  // Check whether the lock directory exists.
  try {
    lockStats = await fs.lstat(lockDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        status: 'NO_LOCK'
      };
    }

    return {
      status: 'PROCESS_UNKNOWN',
      reason: `Cannot inspect lock: ${error.message}`
    };
  }

  // Reject files and symbolic links.
  if (!lockStats.isDirectory()) {
    return {
      status: 'INVALID_LOCK',
      reason: 'Lock path is not a directory'
    };
  }

  const ownerFile = path.join(
    lockDir,
    'owner.json'
  );

  let owner;

  // Read and parse ownership metadata.
  try {
    const ownerStats = await fs.lstat(ownerFile);

    if (!ownerStats.isFile()) {
      return {
        status: 'INVALID_LOCK',
        reason: 'Owner metadata is not a regular file'
      };
    }

    const content = await fs.readFile(
      ownerFile,
      'utf8'
    );

    owner = JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        status: 'INVALID_LOCK',
        reason: 'Owner metadata is missing'
      };
    }

    if (error instanceof SyntaxError) {
      return {
        status: 'INVALID_LOCK',
        reason: 'Owner metadata contains invalid JSON'
      };
    }

    return {
      status: 'PROCESS_UNKNOWN',
      reason: `Cannot read owner metadata: ${error.message}`
    };
  }

  // Validate ownership metadata.
  if (
    !owner ||
    !Number.isSafeInteger(owner.pid) ||
    owner.pid <= 0 ||
    typeof owner.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(owner.startedAt))
  ) {
    return {
      status: 'INVALID_LOCK',
      reason: 'Owner metadata is invalid'
    };
  }

  // Linux process start time is required.
  if (
    typeof owner.processStartTime !== 'string' ||
    !/^[0-9]+$/.test(owner.processStartTime)
  ) {
    return {
      status: 'INVALID_LOCK',
      reason: 'Linux process start time is missing or invalid'
    };
  }

  // ===================================================
  // VERIFY PROCESS IDENTITY
  // ===================================================

  const verification = await verifyProcessIdentity({
    pid: owner.pid,
    startTime: owner.processStartTime
  });

  if (verification.status === 'IDENTITY_MATCH') {
    return {
      status: 'OWNER_VERIFIED',
      pid: owner.pid,
      processStartTime: owner.processStartTime,
      startedAt: owner.startedAt
    };
  }

  if (verification.status === 'IDENTITY_MISMATCH') {
    return {
      status: 'IDENTITY_MISMATCH',
      pid: owner.pid,
      startedAt: owner.startedAt,
      reason: 'PID exists but process start time differs'
    };
  }

  if (verification.status === 'PROCESS_NOT_FOUND') {
    return {
      status: 'PROCESS_NOT_FOUND',
      pid: owner.pid,
      startedAt: owner.startedAt
    };
  }

  return {
    status: 'PROCESS_UNKNOWN',
    pid: owner.pid,
    startedAt: owner.startedAt,
    reason: verification.reason || verification.status
  };
}

// =====================================================
// COMMAND-LINE INSPECTION
// =====================================================

if (require.main === module) {
  inspectInstanceLock()
    .then(result => {
      console.log(
        JSON.stringify(result, null, 2)
      );
    })
    .catch(error => {
      console.error(
        'Lock inspection failed:',
        error.message
      );

      process.exitCode = 1;
    });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  inspectInstanceLock
};
