
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const {
  releaseSessionPairing
} = require('./pairing-cleanup');

// =====================================================
// CONFIGURATION
// =====================================================

const sessions = new Map();

const SESSION_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');

const UPLOAD_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

let cleanupRunning = false;

// =====================================================
// CREATE SESSION
// =====================================================

function createSession() {
  const id = crypto.randomUUID();
  const now = Date.now();

  const session = {
    id,
    accessToken: crypto.randomBytes(32).toString('hex'),

    status: 'CREATED',

    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,

    pairingCode: null,
    profileUpdateConsent: false,
    profileUpdateAuthorized: false,
    uploadFilename: null,
    uploadInProgress: false,

    error: null
  };

  sessions.set(id, session);

  return session;
}

// =====================================================
// GET SESSION
// =====================================================

function getSession(id) {
  const session = sessions.get(id);

  if (!session) {
    return null;
  }

  if (Date.now() >= session.expiresAt) {
    if (
      session.status !== 'COMPLETED' &&
      session.status !== 'CANCELLED'
    ) {
      session.status = 'EXPIRED';
    }
  }

  return session;
}

// =====================================================
// CANCEL SESSION
// =====================================================

function cancelSession(id) {
  const session = getSession(id);

  if (!session) {
    return null;
  }

  if (
    !['COMPLETED', 'EXPIRED', 'FAILED'].includes(
      session.status
    )
  ) {
    session.status = 'CANCELLED';
  }

  return session;
}

// =====================================================
// DELETE EXPIRED UPLOAD
// =====================================================

async function deleteExpiredUpload(session) {
  if (!session.uploadFilename) {
    return;
  }

  const filename = session.uploadFilename;

  if (!UPLOAD_FILENAME_PATTERN.test(filename)) {
    throw new Error('Invalid expired upload filename');
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  session.uploadFilename = null;
}

// =====================================================
// CLEAN UP EXPIRED SESSIONS
// =====================================================

async function cleanupSessions() {
  if (cleanupRunning) {
    return;
  }

  cleanupRunning = true;

  try {
    const now = Date.now();

    for (const [id, session] of sessions) {
      if (now < session.expiresAt) {
        continue;
      }

      // Mark expired sessions.
      if (
        session.status !== 'COMPLETED' &&
        session.status !== 'CANCELLED'
      ) {
        session.status = 'EXPIRED';
      }

      // Avoid deleting an upload while it is being written.
      if (session.uploadInProgress) {
        continue;
      }

      // First, release any WhatsApp pairing.
      try {
        await releaseSessionPairing(id);
      } catch (error) {
        console.error(
          'Expired session pairing cleanup failed:',
          error.message
        );

        // Keep session for cleanup retry.
        continue;
      }

      // Next, delete the uploaded image.
      try {
        await deleteExpiredUpload(session);
      } catch (error) {
        console.error(
          'Expired session upload cleanup failed:',
          error.message
        );

        // Keep session for cleanup retry.
        continue;
      }

      // Remove session only after local cleanup succeeds.
      sessions.delete(id);
    }
  } finally {
    cleanupRunning = false;
  }
}

// =====================================================
// AUTOMATIC CLEANUP SCHEDULER
// =====================================================

const cleanupTimer = setInterval(() => {
  cleanupSessions().catch(error => {
    console.error(
      'Session cleanup error:',
      error.message
    );
  });
}, CLEANUP_INTERVAL_MS);

cleanupTimer.unref();

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createSession,
  getSession,
  cancelSession,
  cleanupSessions
};
