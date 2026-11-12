
'use strict';

const {
  inspectInstanceLock
} = require('./lock-inspector');

// =====================================================
// MANUAL LOCK RECOVERY ASSESSMENT
// =====================================================

async function assessLockRecovery(lockDir) {
  const inspection = await inspectInstanceLock(lockDir);

  switch (inspection.status) {
    case 'NO_LOCK':
      return {
        status: 'NO_RECOVERY_NEEDED',
        safeToAutoDelete: false,
        message: 'No instance lock exists.'
      };

    case 'OWNER_VERIFIED':
      return {
        status: 'ACTIVE_OWNER',
        safeToAutoDelete: false,
        message:
          'The recorded process identity is active. ' +
          'Do not remove the lock.'
      };

    case 'PROCESS_NOT_FOUND':
    case 'IDENTITY_MISMATCH':
      return {
        status: 'MANUAL_REVIEW_REQUIRED',
        safeToAutoDelete: false,
        inspectionStatus: inspection.status,
        message:
          'The recorded owner is not running under ' +
          'the recorded process identity. ' +
          'Confirm all backend instances are stopped ' +
          'before considering manual recovery.'
      };

    case 'INVALID_LOCK':
    case 'PROCESS_UNKNOWN':
    default:
      return {
        status: 'RECOVERY_BLOCKED',
        safeToAutoDelete: false,
        inspectionStatus: inspection.status,
        message:
          'Lock ownership cannot be established safely. ' +
          'Preserve the lock and investigate manually.'
      };
  }
}

// =====================================================
// COMMAND-LINE INTERFACE
// =====================================================

if (require.main === module) {
  assessLockRecovery()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error(
        'Lock recovery assessment failed:',
        error.message
      );

      process.exitCode = 1;
    });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  assessLockRecovery
};
