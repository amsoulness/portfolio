'use strict';

const {
  createWorkerManager
} = require('./whatsapp-worker-manager');

const {
  LIVE_ENABLED
} = require('./whatsapp-live-config');

let active = null;

function getWorkerPairingStatus(sessionId) {
  if (!active || active.sessionId !== sessionId) {
    return null;
  }

  return {
    sessionId,
    status: active.status,
    pairingCode: active.pairingCode,
    whatsappConnected: active.status === 'READY',
    worker: active.manager.getStatus()
  };
}

async function startWorkerPairing(
  sessionId,
  phoneNumber,
  consent
) {
  if (active) {
    throw new Error(
      'Another worker pairing is already active'
    );
  }

  const manager = createWorkerManager({
    sessionId,
    commandTimeoutMs: 10000,
    protectedShutdown: LIVE_ENABLED,
    shutdownTimeoutMs: LIVE_ENABLED ? 35000 : 5000
  });

  const entry = {
    sessionId,
    manager,
    status: 'STARTING',
    pairingCode: null,
    unsubscribe: null,
    startPromise: null,
    stopPromise: null,
    stopRequested: false,
    authenticated: false,
    profileUpdatePending: false,
    profileUpdateUncertain: false
  };

  active = entry;

  entry.unsubscribe = manager.onEvent(event => {
    if (
      active !== entry ||
      entry.stopRequested ||
      entry.status === 'STOPPING' ||
      entry.status === 'FAILED'
    ) {
      return;
    }

    const payload = event.payload;

    if (event.type === 'AUTHENTICATED') {
      entry.authenticated = true;
      entry.status = 'AUTHENTICATED';
      entry.pairingCode = null;
      return;
    }

    if (event.type === 'QR_UPDATED') {
      entry.status = 'QR_READY';
      entry.pairingCode = null;
      return;
    }

    if (event.type !== 'PAIR_STATUS') {
      return;
    }

    if (['AUTHENTICATED', 'READY'].includes(payload.status)) {
      entry.authenticated = true;
    }

    entry.status = payload.status;

    entry.pairingCode =
      payload.status === 'CODE_READY'
        ? payload.pairingCode || null
        : null;
  });

  const startup = (async () => {
    try {
      await manager.start();

      if (entry.stopRequested) {
        throw new Error('Pairing startup cancelled');
      }

      const response = await manager.sendCommand(
        'PAIR_START',
        { sessionId, phoneNumber, consent }
      );

      if (
        response.type !== 'PAIR_STATUS' ||
        response.payload.sessionId !== sessionId ||
        response.payload.mock !== !LIVE_ENABLED
      ) {
        throw new Error('Unexpected worker pairing response');
      }

      if (entry.stopRequested) {
        throw new Error('Pairing startup cancelled');
      }

      if (
        entry.status === 'STARTING' ||
        entry.status === 'PAIRING'
      ) {
        entry.status = response.payload.status;
      }

      return getWorkerPairingStatus(sessionId);
    } catch (error) {
      entry.status = 'FAILED';

      try {
        await manager.shutdown();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Pairing startup and cleanup failed'
        );
      }

      if (entry.unsubscribe) {
        entry.unsubscribe();
        entry.unsubscribe = null;
      }

      if (active === entry) {
        active = null;
      }

      throw error;
    }
  })();

  entry.startPromise = startup;
  return startup;
}

async function updateWorkerProfilePicture(
  sessionId,
  imagePath
) {
  if (!LIVE_ENABLED) {
    throw new Error(
      'Profile updates are disabled in mock mode'
    );
  }

  if (!active || active.sessionId !== sessionId) {
    throw new Error(
      'No WhatsApp worker belongs to this session'
    );
  }

  const entry = active;

  if (
    entry.stopRequested ||
    entry.stopPromise ||
    entry.status !== 'READY'
  ) {
    throw new Error(
      'WhatsApp worker is not ready for profile update'
    );
  }

  if (entry.profileUpdatePending) {
    throw new Error(
      'Profile update already in progress'
    );
  }

  if (entry.profileUpdateUncertain) {
    throw new Error(
      'Previous profile update outcome is uncertain; ' +
      'worker shutdown is required before retrying'
    );
  }

  // Reserve the operation before the first await.
  entry.profileUpdatePending = true;

  // Once dispatched, any unconfirmed outcome is
  // treated as uncertain. A new worker session is
  // required before another attempt.
  entry.profileUpdateUncertain = true;

  try {
    const response = await entry.manager.sendCommand(
      'PROFILE_UPDATE',
      {
        sessionId,
        imagePath
      }
    );

    if (
      response.type !== 'PROFILE_UPDATED' ||
      response.payload.sessionId !== sessionId ||
      response.payload.success !== true
    ) {
      throw new Error(
        'WhatsApp profile update was not confirmed'
      );
    }

    entry.profileUpdateUncertain = false;

    return {
      sessionId,
      success: true
    };
  } finally {
    entry.profileUpdatePending = false;
  }
}

async function logoutWorkerPairing(sessionId) {
  if (!LIVE_ENABLED) {
    throw new Error(
      'WhatsApp logout is disabled in mock mode'
    );
  }

  if (!active || active.sessionId !== sessionId) {
    throw new Error(
      'No WhatsApp worker belongs to this session'
    );
  }

  const entry = active;

  if (
    entry.stopRequested ||
    entry.stopPromise ||
    !['READY', 'AUTHENTICATED', 'DISCONNECTED'].includes(entry.status)
  ) {
    throw new Error(
      'WhatsApp worker is not ready for logout'
    );
  }

  if (
    entry.profileUpdatePending ||
    entry.profileUpdateUncertain
  ) {
    throw new Error(
      'Cannot logout while profile update is pending or uncertain'
    );
  }

  // Reserve logout synchronously to prevent
  // concurrent profile updates or cleanup.
  entry.stopRequested = true;
  entry.status = 'LOGGING_OUT';

  try {
    const response = await entry.manager.sendCommand(
      'LOGOUT',
      {
        sessionId,
        authorizeLogout: true
      }
    );

    if (
      response.type !== 'LOGOUT_COMPLETE' ||
      response.payload.sessionId !== sessionId ||
      response.payload.logoutConfirmed !== true
    ) {
      throw new Error(
        'WhatsApp logout was not confirmed'
      );
    }

    entry.status = 'LOGGED_OUT';

    // Logout has been confirmed. Now shut down the
    // worker before releasing its ownership.
    try {
      await entry.manager.shutdown();
    } catch (error) {
      entry.status = 'CLEANUP_FAILED';
      throw new Error(
        'WhatsApp logout confirmed, but worker shutdown failed',
        { cause: error }
      );
    }

    if (entry.unsubscribe) {
      entry.unsubscribe();
      entry.unsubscribe = null;
    }

    entry.pairingCode = null;

    if (active === entry) {
      active = null;
    }

    return {
      sessionId,
      logoutConfirmed: true,
      workerShutdownConfirmed: true
    };
  } catch (error) {
    // Preserve ownership when logout or shutdown
    // has not completed safely.
    if (entry.status !== 'CLEANUP_FAILED') {
      entry.status = 'LOGOUT_UNCERTAIN';
    }
    throw error;
  }
}

async function stopWorkerPairing(sessionId) {
  if (!active || active.sessionId !== sessionId) {
    return false;
  }

  const entry = active;

  // Automatic cleanup must not stop an authenticated
  // WhatsApp worker without explicit logout.
  if (
    entry.authenticated === true ||
    ['READY', 'AUTHENTICATED', 'LOGGING_OUT',
     'LOGOUT_UNCERTAIN', 'CLEANUP_FAILED'].includes(entry.status)
  ) {
    throw new Error(
      'Authenticated WhatsApp worker requires explicit logout'
    );
  }

  entry.stopRequested = true;

  if (entry.stopPromise) {
    return entry.stopPromise;
  }

  entry.stopPromise = (async () => {
    entry.status = 'STOPPING';

    if (entry.startPromise) {
      try {
        await entry.startPromise;
      } catch {
        // Startup failure is handled by its own cleanup path.
      }
    }

    // Retain ownership if shutdown fails.
    await entry.manager.shutdown();

    if (entry.unsubscribe) {
      entry.unsubscribe();
      entry.unsubscribe = null;
    }

    entry.pairingCode = null;

    if (active === entry) {
      active = null;
    }

    return true;
  })();

  try {
    return await entry.stopPromise;
  } finally {
    if (active === entry) {
      entry.stopPromise = null;
    }
  }
}

async function stopAllWorkerPairings() {
  if (!active) {
    return true;
  }

  await stopWorkerPairing(active.sessionId);
  return true;
}

module.exports = {
  startWorkerPairing,
  stopWorkerPairing,
  stopAllWorkerPairings,
  getWorkerPairingStatus,
  updateWorkerProfilePicture,
  logoutWorkerPairing
};
