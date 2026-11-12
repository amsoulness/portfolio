
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const {
  createBrowserLaunchCoordinator
} = require('./browser-launch-coordinator');

// ASLNS_COORDINATOR_INTEGRATION


const active = new Map();

const AUTH_DIR = path.join(__dirname, '.wwebjs_auth');
const PAIRING_TIMEOUT_MS = 2 * 60 * 1000;
const SHUTDOWN_TIMEOUT_MS = 10 * 1000;

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const PHONE_NUMBER_PATTERN = /^[1-9][0-9]{7,14}$/;

function validateSessionId(sessionId) {
  if (
    typeof sessionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)
  ) {
    throw new Error('Invalid session ID');
  }

  return sessionId;
}

function validatePairingRequest(phoneNumber, consent) {
  if (consent !== true) {
    throw new Error('Account-owner consent is required');
  }

  if (typeof phoneNumber !== 'string') {
    throw new Error('Phone number is required');
  }

  const normalized = phoneNumber.trim();

  if (!PHONE_NUMBER_PATTERN.test(normalized)) {
    throw new Error(
      'Enter a valid international phone number without + or spaces'
    );
  }

  return normalized;
}

function getPairing(sessionId) {
  return active.get(sessionId) || null;
}

function getPairingStatus(sessionId) {
  validateSessionId(sessionId);

  const pairing = getPairing(sessionId);

  if (!pairing) {
    return {
      pairingStatus: 'NOT_STARTED',
      whatsappConnected: false,
      qrAvailable: false
    };
  }

  return {
    pairingStatus: pairing.status,
    whatsappConnected: pairing.status === 'READY',
    qrAvailable: Boolean(pairing.qrCode)
  };
}


function createGuardedPuppeteer(pairing) {
  const puppeteer = require('puppeteer');

  return {
    ...puppeteer,

    async launch(options) {
      const browser = await puppeteer.launch(options);

      if (
        pairing.status === 'CLEANING_UP' ||
        pairing.status === 'CLEANUP_FAILED'
      ) {
        await browser.close();

        throw new Error(
          'WhatsApp browser startup cancelled'
        );
      }

      return browser;
    }
  };
}

function createWhatsAppClient(sessionId, phoneNumber) {
  validateSessionId(sessionId);

  const options = {
    authStrategy: new LocalAuth({
      clientId: `aslns-${sessionId}`,
      dataPath: AUTH_DIR
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    },
    authTimeoutMs: 60_000,
    qrMaxRetries: 3
  };

  if (phoneNumber !== undefined) {
    if (
      typeof phoneNumber !== 'string' ||
      !PHONE_NUMBER_PATTERN.test(phoneNumber)
    ) {
      throw new Error('Invalid phone number');
    }

    options.pairWithPhoneNumber = {
      phoneNumber,
      showNotification: true,
      intervalMs: 180_000
    };
  }

  return new Client(options);
}

function reservePairing(sessionId) {
  validateSessionId(sessionId);

  if (active.has(sessionId)) {
    throw new Error('Pairing already exists for this session');
  }

  if (active.size > 0) {
    throw new Error('Another pairing attempt is active');
  }

  const now = Date.now();

  const pairing = {
    sessionId,
    status: 'RESERVED',
    createdAt: now,
    expiresAt: now + PAIRING_TIMEOUT_MS,

    client: null,
    qrCode: null,
    pairingCode: null,

    authenticated: false,
    ready: false,

    initializationStarted: false,
    initializationSettled: false,
    initializationPromise: null,
    coordinator: null,

    timeout: null,
    cleanupPromise: null,

    logoutAttempted: false,
    logoutConfirmed: false,
    browserDestroyed: false,

    lastError: null
  };

  active.set(sessionId, pairing);

  pairing.timeout = setTimeout(() => {
    if (active.get(sessionId) !== pairing) return;

    if (
      pairing.status === 'READY' ||
      pairing.status === 'CLEANING_UP' ||
      pairing.status === 'CLEANUP_FAILED'
    ) {
      return;
    }

    pairing.status = 'TIMED_OUT';

    // Load lazily to avoid the pairing-cleanup
    // module's circular dependency during startup.
    const {
      releaseSessionPairing
    } = require('./pairing-cleanup');

    releaseSessionPairing(sessionId).catch(error => {
      console.error(
        'Pairing timeout cleanup failed:',
        error.message
      );
    });
  }, PAIRING_TIMEOUT_MS);

  pairing.timeout.unref();

  return pairing;
}

function registerClientEvents(pairing, client) {
  function isCurrent() {
    return (
      active.get(pairing.sessionId) === pairing &&
      pairing.client === client &&
      pairing.status !== 'CLEANING_UP' &&
      pairing.status !== 'CLEANUP_FAILED'
    );
  }

  client.on('qr', qr => {
    if (!isCurrent()) return;

    pairing.qrCode = qr;
    pairing.pairingCode = null;
    pairing.status = 'QR_READY';
  });

  client.on('code', code => {
    if (!isCurrent()) return;

    pairing.pairingCode = code;
    pairing.qrCode = null;
    pairing.status = 'CODE_READY';
  });

  client.on('authenticated', () => {
    if (!isCurrent()) return;

    pairing.authenticated = true;
    pairing.status = 'AUTHENTICATED';
    pairing.qrCode = null;
    pairing.pairingCode = null;
  });

  client.on('ready', () => {
    if (!isCurrent()) return;

    pairing.authenticated = true;
    pairing.ready = true;
    pairing.status = 'READY';

    pairing.qrCode = null;
    pairing.pairingCode = null;

    if (pairing.timeout) {
      clearTimeout(pairing.timeout);
      pairing.timeout = null;
    }
  });

  client.on('auth_failure', () => {
    if (!isCurrent()) return;

    pairing.status = 'AUTH_FAILED';
    pairing.ready = false;
    pairing.qrCode = null;
    pairing.pairingCode = null;
    pairing.lastError = 'WhatsApp authentication failed';
  });

  client.on('disconnected', () => {
    if (!isCurrent()) return;

    pairing.status = 'DISCONNECTED';
    pairing.ready = false;
    pairing.qrCode = null;
    pairing.pairingCode = null;
    pairing.lastError = 'WhatsApp client disconnected';
  });
}

function preparePairingClient(sessionId, phoneNumber) {
  validateSessionId(sessionId);

  const pairing = active.get(sessionId);

  if (!pairing) {
    throw new Error('Pairing reservation not found');
  }

  if (pairing.status !== 'RESERVED' || pairing.client) {
    throw new Error('Pairing cannot be prepared');
  }

  if (Date.now() >= pairing.expiresAt) {
    throw new Error('Pairing reservation expired');
  }

  const client = createWhatsAppClient(sessionId, phoneNumber);

  pairing.client = client;
  pairing.status = 'PREPARED';

  registerClientEvents(pairing, client);

  return pairing;
}


function startPairingClient(sessionId) {
  validateSessionId(sessionId);

  const pairing = active.get(sessionId);

  if (!pairing || !pairing.client) {
    throw new Error('Pairing client not prepared');
  }

  if (
    pairing.status !== 'PREPARED' ||
    pairing.initializationStarted
  ) {
    throw new Error('Pairing cannot be initialized');
  }

  if (Date.now() >= pairing.expiresAt) {
    throw new Error('Pairing reservation expired');
  }

  const coordinator = createBrowserLaunchCoordinator();

  coordinator.install();

  pairing.coordinator = coordinator;
  pairing.initializationStarted = true;
  pairing.initializationSettled = false;
  pairing.status = 'INITIALIZING';

  const initializationPromise = Promise.resolve()
    .then(() => {
      if (
        pairing.status === 'CLEANING_UP' ||
        pairing.status === 'CLEANUP_FAILED'
      ) {
        throw new Error('Initialization cancelled');
      }

      return pairing.client.initialize();
    });

  pairing.initializationPromise = initializationPromise;

  initializationPromise.then(
    () => {
      pairing.initializationSettled = true;
    },
    error => {
      pairing.initializationSettled = true;
      pairing.lastError = 'WhatsApp initialization failed';

      if (
        active.get(sessionId) === pairing &&
        pairing.status !== 'CLEANING_UP' &&
        pairing.status !== 'CLEANUP_FAILED'
      ) {
        pairing.status = 'INITIALIZATION_FAILED';
      }

      console.error(
        'WhatsApp initialization failed:',
        error.message
      );
    }
  );

  return pairing;
}

async function withTimeout(operation, milliseconds, label) {
  let timer;

  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out`));
        }, milliseconds);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}


async function releasePairing(sessionId, options = {}) {
  validateSessionId(sessionId);

  const pairing = active.get(sessionId);

  if (!pairing) return;

  if (pairing.cleanupPromise) {
    return pairing.cleanupPromise;
  }

  // Automatic cleanup must never initiate logout
  // of an authenticated WhatsApp account.
  if (
    pairing.authenticated &&
    !pairing.logoutConfirmed &&
    options.authorizeLogout !== true
  ) {
    throw new Error(
      'Authenticated WhatsApp logout requires explicit authorization'
    );
  }

  // A pre-existing LocalAuth profile may contain valid
  // credentials even when in-memory authentication is false.
  // Never discard it through automatic cleanup.
  const preservedProfileDir = path.join(
    AUTH_DIR,
    'session-aslns-' + sessionId
  );

  if (options.authorizeLogout !== true) {
    try {
      await fs.stat(preservedProfileDir);
      throw new Error(
        'Existing WhatsApp profile requires manual recovery'
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  pairing.status = 'CLEANING_UP';
  pairing.ready = false;
  pairing.qrCode = null;
  pairing.pairingCode = null;

  if (pairing.timeout) {
    clearTimeout(pairing.timeout);
    pairing.timeout = null;
  }

  pairing.cleanupPromise = (async () => {
    const client = pairing.client;
    const coordinator = pairing.coordinator;

    if (coordinator) {
      coordinator.cancel();
    }

    if (
      pairing.initializationStarted &&
      !pairing.initializationSettled
    ) {
      await withTimeout(
        () => pairing.initializationPromise.catch(() => {}),
        SHUTDOWN_TIMEOUT_MS,
        'WhatsApp initialization shutdown'
      );

      pairing.initializationSettled = true;
    }

    if (
      pairing.authenticated &&
      !pairing.logoutConfirmed &&
      options.authorizeLogout !== true
    ) {
      throw new Error(
        'Authenticated WhatsApp logout requires explicit authorization'
      );
    }

    if (client && pairing.authenticated &&
        !pairing.logoutConfirmed) {
      pairing.logoutAttempted = true;

      // Reuse an existing logout operation after a
      // timeout instead of starting another one.
      if (!pairing.logoutPromise) {
        pairing.logoutPromise = Promise.resolve().then(
          () => client.logout()
        );

        // Observe rejection if the timed wait ends first.
        pairing.logoutPromise.catch(() => {});
      }

      await withTimeout(
        () => pairing.logoutPromise,
        SHUTDOWN_TIMEOUT_MS,
        'WhatsApp logout'
      );

      pairing.logoutConfirmed = true;
    }

    if (coordinator) {
      await withTimeout(
        () => coordinator.closeBrowsers(),
        SHUTDOWN_TIMEOUT_MS,
        'Browser coordinator shutdown'
      );

      coordinator.uninstall();

      pairing.browserDestroyed = true;
    } else if (
      client &&
      pairing.initializationStarted &&
      !pairing.browserDestroyed
    ) {
      await withTimeout(
        () => client.destroy(),
        SHUTDOWN_TIMEOUT_MS,
        'WhatsApp browser shutdown'
      );

      pairing.browserDestroyed = true;
    }

    if (
      pairing.authenticated &&
      !pairing.logoutConfirmed
    ) {
      throw new Error(
        'WhatsApp logout has not been confirmed'
      );
    }

    const profileDir = require('node:path').join(
      AUTH_DIR,
      'session-aslns-' + sessionId
    );

    await fs.rm(profileDir, {
      recursive: true,
      force: true
    });

    if (active.get(sessionId) === pairing) {
      active.delete(sessionId);
    }
  })();

  try {
    await pairing.cleanupPromise;
  } catch (error) {
    pairing.status = 'CLEANUP_FAILED';
    pairing.lastError = error.message;
    throw error;
  } finally {
    if (active.get(sessionId) === pairing) {
      pairing.cleanupPromise = null;
    }
  }
}

async function releaseAllPairings() {
  const ids = Array.from(active.keys());

  const results = await Promise.allSettled(
    ids.map(id => releasePairing(id))
  );

  const errors = results
    .filter(result => result.status === 'rejected')
    .map(result => result.reason);

  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      'One or more WhatsApp pairing cleanups failed'
    );
  }
}

module.exports = {
  getPairing,
  getPairingStatus,
  reservePairing,
  releasePairing,
  releaseAllPairings,
  createWhatsAppClient,
  preparePairingClient,
  startPairingClient,
  validatePairingRequest
};
