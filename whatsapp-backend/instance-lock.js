
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const {
  getProcessIdentity
} = require('./process-identity');

// =====================================================
// CONFIGURATION
// =====================================================

const LOCK_DIR = path.join(
  __dirname,
  '.aslns-instance-lock'
);

const OWNER_FILE = path.join(
  LOCK_DIR,
  'owner.json'
);

let lockOwned = false;
let lockOperationInProgress = false;

// =====================================================
// ACQUIRE EXCLUSIVE INSTANCE LOCK
// =====================================================

async function acquireInstanceLock() {
  if (lockOwned || lockOperationInProgress) {
    throw new Error(
      'Instance lock is already held or being acquired by this process'
    );
  }

  lockOperationInProgress = true;

  try {
    // Atomic directory creation ensures only one
    // process can create this lock directory.
    try {
      await fs.mkdir(LOCK_DIR);
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error(
          'STARTUP BLOCKED: Another backend instance may be running. ' +
          'The instance lock already exists.'
        );
      }

      throw error;
    }

    // Preserve the lock if metadata creation fails.
    lockOwned = true;

    const identity = await getProcessIdentity();

    const owner = {
      pid: identity.pid,
      processStartTime: identity.startTime,
      startedAt: new Date().toISOString()
    };

    await fs.writeFile(
      OWNER_FILE,
      JSON.stringify(owner, null, 2),
      {
        flag: 'wx',
        mode: 0o600
      }
    );

    return owner;
  } catch (error) {
    if (lockOwned) {
      console.error(
        'Instance lock metadata creation failed. Lock preserved for manual recovery.'
      );
    }

    throw error;
  } finally {
    lockOperationInProgress = false;
  }
}

// =====================================================
// RELEASE EXCLUSIVE INSTANCE LOCK
// =====================================================

async function releaseInstanceLock() {
  if (lockOperationInProgress) {
    throw new Error(
      'LOCK RELEASE BLOCKED: Another lock operation is in progress'
    );
  }

  if (!lockOwned) {
    return;
  }

  lockOperationInProgress = true;

  try {
    const currentIdentity = await getProcessIdentity();

    let owner;

    try {
      const content = await fs.readFile(
        OWNER_FILE,
        'utf8'
      );

      owner = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `LOCK RELEASE BLOCKED: Ownership metadata could not be read: ${error.message}`
      );
    }

    // Verify both PID and Linux process start time.
    // This prevents accidental release when the
    // recorded process identity does not match.
    if (
      !owner ||
      owner.pid !== currentIdentity.pid ||
      owner.processStartTime !== currentIdentity.startTime
    ) {
      throw new Error(
        'LOCK RELEASE BLOCKED: Process identity does not match lock owner'
      );
    }

    // Remove only after successful identity verification.
    await fs.rm(LOCK_DIR, {
      recursive: true,
      force: true
    });

    lockOwned = false;
  } finally {
    lockOperationInProgress = false;
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  acquireInstanceLock,
  releaseInstanceLock
};
