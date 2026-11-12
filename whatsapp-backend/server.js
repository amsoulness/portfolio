
'use strict';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const {
  createSession,
  getSession,
  cancelSession
} = require('./sessions');

const {
  getPairing,
  reservePairing,
  releasePairing,
  releaseAllPairings,
  validatePairingRequest
} = require('./pairing');

const {
  releaseSessionPairing,
  releaseEveryPairing
} = require('./pairing-cleanup');

const {
  inspectStartupRecovery
} = require('./startup-recovery');

const {
  acquireInstanceLock,
  releaseInstanceLock
} = require('./instance-lock');

// =====================================================
// CONFIGURATION
// =====================================================

const {
  startWorkerPairing,
  stopWorkerPairing,
  getWorkerPairingStatus,
  updateWorkerProfilePicture,
  logoutWorkerPairing
} = require('./pairing-worker-bridge');

const app = express();

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const SHUTDOWN_TIMEOUT_MS = 10_000;

const uploadDir = path.join(__dirname, 'uploads');

const UPLOAD_TTL_MS = 15 * 60 * 1000;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

const allowedTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const filenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

let server = null;
let shuttingDown = false;
let startupInProgress = false;
let startupCompleted = false;
let lockAcquired = false;
let startupPromise = null;

// =====================================================
// EXPRESS SECURITY
// =====================================================

app.disable('x-powered-by');

app.use(
  cors({
    origin: 'http://localhost:5173',
    allowedHeaders: [
      'Content-Type',
      'X-Session-Id',
      'X-Session-Token'
    ]
  })
);

app.use(
  express.json({
    limit: '32kb'
  })
);

function noStore(res) {
  res.set('Cache-Control', 'no-store');
}

// =====================================================
// SESSION HELPERS
// =====================================================

function publicSession(session) {
  return {
    sessionId: session.id,
    status: session.status,
    expiresAt: new Date(
      session.expiresAt
    ).toISOString()
  };
}

function authorizeSession(req, res) {
  const session = getSession(req.params.id);

  if (!session) {
    res.status(404).json({
      error: 'Session not found'
    });

    return null;
  }

  const token = req.get('X-Session-Token');

  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(token) ||
    typeof session.accessToken !== 'string' ||
    !/^[0-9a-f]{64}$/.test(session.accessToken) ||
    !crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(session.accessToken, 'hex')
    )
  ) {
    res.status(403).json({
      error: 'Access denied'
    });

    return null;
  }

  return session;
}

function isActiveSession(session) {
  return (
    session.status === 'CREATED' &&
    Date.now() < session.expiresAt
  );
}

// =====================================================
// IMAGE VALIDATION
// =====================================================

function isValidImage(bytes, mime) {
  if (!Buffer.isBuffer(bytes)) {
    return false;
  }

  if (mime === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mime === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(
        Buffer.from([
          137, 80, 78, 71,
          13, 10, 26, 10
        ])
      )
    );
  }

  if (mime === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedTypes[file.mimetype]) {
      return callback(
        new Error('Unsupported image format')
      );
    }

    callback(null, true);
  }
});

// =====================================================
// IMAGE CLEANUP
// =====================================================

async function deleteUploadedImage(session) {
  if (!session?.uploadFilename) {
    return;
  }

  const filename = session.uploadFilename;

  if (!filenamePattern.test(filename)) {
    throw new Error('Invalid upload filename');
  }

  try {
    await fs.unlink(
      path.join(uploadDir, filename)
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  session.uploadFilename = null;
}

async function cleanupExpiredUploads() {
  await fs.mkdir(uploadDir, {
    recursive: true
  });

  const entries = await fs.readdir(
    uploadDir,
    { withFileTypes: true }
  );

  const now = Date.now();

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !filenamePattern.test(entry.name)
    ) {
      continue;
    }

    const filePath = path.join(
      uploadDir,
      entry.name
    );

    try {
      const stats = await fs.stat(filePath);

      if (
        now - stats.mtimeMs >= UPLOAD_TTL_MS
      ) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(
          'Expired upload cleanup failed:',
          error.message
        );
      }
    }
  }
}

// =====================================================
// HEALTH ENDPOINT
// =====================================================

app.get('/api/health', (_req, res) => {
  noStore(res);

  res.json({
    status: 'ok',
    service: 'ASLNS WhatsApp DP Studio',
    version: '1.0.0',
    whatsappConnected: false
  });
});

// =====================================================
// CREATE SESSION
// =====================================================

app.post('/api/sessions', (_req, res) => {
  const session = createSession();

  noStore(res);

  res.status(201).json({
    ...publicSession(session),
    accessToken: session.accessToken
  });
});

// =====================================================
// GET SESSION
// =====================================================

app.get('/api/sessions/:id', (req, res) => {
  const session = authorizeSession(req, res);

  if (!session) {
    return;
  }

  noStore(res);

  return res.json(
    publicSession(session)
  );
});

// =====================================================
// IMAGE UPLOAD
// =====================================================

app.post('/api/upload', (req, res) => {
  const sessionId = req.get('X-Session-Id');

  if (
    typeof sessionId !== 'string' ||
    !uuidPattern.test(sessionId)
  ) {
    return res.status(400).json({
      error: 'Invalid session ID'
    });
  }

  req.params.id = sessionId;

  const session = authorizeSession(
    req,
    res
  );

  if (!session) {
    return;
  }

  if (!isActiveSession(session)) {
    return res.status(409).json({
      error: 'Session is not active'
    });
  }

  if (session.uploadInProgress) {
    return res.status(409).json({
      error: 'Upload already in progress'
    });
  }

  if (session.uploadFilename) {
    return res.status(409).json({
      error: 'Image already uploaded'
    });
  }

  session.uploadInProgress = true;

  upload.single('image')(
    req,
    res,
    async error => {
      try {
        if (error) {
          return res.status(400).json({
            error: error.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            error: 'Image is required'
          });
        }

        if (
          !isValidImage(
            req.file.buffer,
            req.file.mimetype
          )
        ) {
          return res.status(400).json({
            error: 'Invalid image file'
          });
        }

        if (!isActiveSession(session)) {
          return res.status(409).json({
            error: 'Session expired during upload'
          });
        }

        await fs.mkdir(uploadDir, {
          recursive: true
        });

        const extension =
          allowedTypes[req.file.mimetype];

        const filename =
          `${crypto.randomUUID()}.${extension}`;

        const filePath = path.join(
          uploadDir,
          filename
        );

        await fs.writeFile(
          filePath,
          req.file.buffer,
          {
            flag: 'wx',
            mode: 0o600
          }
        );

        session.uploadFilename = filename;

        if (!isActiveSession(session)) {
          await deleteUploadedImage(session);

          return res.status(409).json({
            error: 'Session expired during upload'
          });
        }

        noStore(res);

        return res.status(201).json({
          sessionId: session.id,
          uploaded: true,
          filename
        });
      } catch (error) {
        console.error(
          'Upload failed:',
          error.message
        );

        return res.status(500).json({
          error: 'Upload failed'
        });
      } finally {
        session.uploadInProgress = false;
      }
    }
  );
});

// =====================================================
// RESERVE PAIRING
// =====================================================

app.post(
  '/api/sessions/:id/pairing',
  async (req, res) => {
    const session = authorizeSession(req, res);
    if (!session) return;

    if (!isActiveSession(session)) {
      return res.status(409).json({
        error: 'Session is not active'
      });
    }

    if (session.uploadInProgress) {
      return res.status(409).json({
        error: 'Upload in progress'
      });
    }

    if (!session.uploadFilename) {
      return res.status(409).json({
        error: 'Upload an image first'
      });
    }

    try {
      validatePairingRequest(
        req.body?.phoneNumber,
        req.body?.consent
      );
    } catch (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    try {
      reservePairing(session.id);

      const worker = await startWorkerPairing(
        session.id,
        req.body.phoneNumber,
        req.body.consent
      );

      session.profileUpdateConsent = true;

      noStore(res);

      return res.status(201).json({
        sessionId: session.id,
        pairingStatus: worker.status,
        pairingCode: worker.pairingCode || null,
        whatsappConnected:
          worker.whatsappConnected === true
      });
    } catch (error) {
      // Do not silently delete credentials or release
      // worker ownership after an uncertain shutdown.
      noStore(res);

      return res.status(409).json({
        error: error.message
      });
    }
  }
);

// =====================================================
// PAIRING STATUS
// =====================================================

app.get(
  '/api/sessions/:id/pairing',
  (req, res) => {
    const session = authorizeSession(req, res);
    if (!session) return;

    if (!isActiveSession(session)) {
      noStore(res);

      return res.status(409).json({
        error: 'Session is not active'
      });
    }

    const worker = getWorkerPairingStatus(
      session.id
    );

    const pairing = getPairing(session.id);

    noStore(res);

    return res.json({
      sessionId: session.id,
      pairingStatus: worker
        ? worker.status
        : pairing
          ? pairing.status
          : 'NOT_STARTED',
      pairingCode: worker
        ? worker.pairingCode || null
        : null,
      whatsappConnected: worker
        ? worker.whatsappConnected === true
        : false
    });
  }
);

// =====================================================
// CANCEL SESSION
// =====================================================

app.post(
  '/api/sessions/:id/cancel',
  async (req, res) => {
    const session = authorizeSession(
      req,
      res
    );

    if (!session) {
      return;
    }

    if (session.uploadInProgress) {
      return res.status(409).json({
        error:
          'Upload in progress. Please retry cancellation.'
      });
    }

    try {
      await releaseSessionPairing(
        session.id
      );
    } catch (error) {
      console.error(
        'WhatsApp cleanup failed:',
        error.message
      );

      return res.status(500).json({
        error:
          'WhatsApp cleanup failed. Please retry cancellation.'
      });
    }

    const cancelled = cancelSession(
      session.id
    );

    try {
      await deleteUploadedImage(
        cancelled
      );
    } catch (error) {
      console.error(
        'Image cleanup failed:',
        error.message
      );

      return res.status(500).json({
        error:
          'Session cancelled, but image cleanup failed'
      });
    }

    noStore(res);

    return res.json(
      publicSession(cancelled)
    );
  }
);

// =====================================================
// HTTP SERVER CLEANUP
// =====================================================

async function closeHttpServer() {
  if (!server) {
    return;
  }

  const currentServer = server;

  await new Promise((resolve, reject) => {
    if (!currentServer.listening) {
      resolve();
      return;
    }

    currentServer.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  if (server === currentServer) {
    server = null;
  }
}

// =====================================================
// STEP 112D: BOUNDED GRACEFUL SHUTDOWN
// =====================================================

async function gracefulShutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `Received ${signal}. Shutting down...`
  );

  let timer;

  const shutdownWork = async () => {
    // Wait for startup to finish acquiring resources.
    if (startupPromise) {
      await startupPromise;
    }

    // Attempt HTTP and pairing cleanup independently.
    const results = await Promise.allSettled([
      closeHttpServer(),
      releaseEveryPairing()
    ]);

    let cleanupFailed = false;

    for (const result of results) {
      if (result.status === 'rejected') {
        cleanupFailed = true;

        console.error(
          'Shutdown cleanup failed:',
          result.reason?.message ||
          String(result.reason)
        );
      }
    }

    // Preserve the lock if cleanup failed.
    if (cleanupFailed) {
      console.error(
        'Instance lock preserved because cleanup failed'
      );

      return false;
    }

    // Release the lock only after successful cleanup.
    if (lockAcquired) {
      try {
        await releaseInstanceLock();
        lockAcquired = false;

        console.log(
          'Exclusive backend instance lock released'
        );
      } catch (error) {
        console.error(
          'Instance lock release failed:',
          error.message
        );

        return false;
      }
    }

    return true;
  };

  // The deadline covers startup waiting,
  // HTTP cleanup, pairing cleanup, and lock release.
  const timeout = new Promise(resolve => {
    timer = setTimeout(
      () => resolve({
        status: 'TIMEOUT'
      }),
      SHUTDOWN_TIMEOUT_MS
    );
  });

  const work = shutdownWork()
    .then(success => ({
      status: success
        ? 'COMPLETED'
        : 'FAILED'
    }))
    .catch(error => {
      console.error(
        'Shutdown coordination failed:',
        error.message
      );

      return {
        status: 'FAILED'
      };
    });

  const result = await Promise.race([
    work,
    timeout
  ]);

  clearTimeout(timer);

  if (result.status === 'TIMEOUT') {
    console.error(
      'Shutdown timed out. Instance lock state requires manual inspection.'
    );

    process.exit(1);
  }

  if (result.status === 'FAILED') {
    console.error(
      'Shutdown incomplete. Check cleanup logs and instance lock before restarting.'
    );
  }

  process.exitCode =
    result.status === 'COMPLETED' ? 0 : 1;
}

// =====================================================
// STARTUP
// =====================================================

// =====================================================
// AUTHENTICATED PROFILE PICTURE UPDATE
// =====================================================

const activeProfileUpdates = new Set();

app.post(
  '/api/sessions/:id/profile-picture',
  async (req, res) => {
    noStore(res);

    const session = authorizeSession(req, res);
    if (!session) return;

    if (!isActiveSession(session)) {
      return res.status(409).json({
        error: 'Session is not active'
      });
    }

    if (session.profileUpdateConsent !== true) {
      return res.status(403).json({
        error: 'Profile update consent is required'
      });
    }

    if (
      req.body?.confirmProfileUpdate !== true
    ) {
      return res.status(403).json({
        error: 'Explicit profile update confirmation required'
      });
    }

    if (
      !session.uploadFilename ||
      !filenamePattern.test(session.uploadFilename)
    ) {
      return res.status(409).json({
        error: 'No valid image uploaded for this session'
      });
    }

    const worker = getWorkerPairingStatus(session.id);

    if (
      !worker ||
      worker.status !== 'READY' ||
      worker.whatsappConnected !== true
    ) {
      return res.status(409).json({
        error: 'WhatsApp is not ready'
      });
    }

    if (activeProfileUpdates.has(session.id)) {
      return res.status(409).json({
        error: 'Profile update already in progress'
      });
    }

    activeProfileUpdates.add(session.id);
    session.profileUpdateAuthorized = true;

    const imagePath = path.join(
      uploadDir,
      session.uploadFilename
    );

    try {
      const result = await updateWorkerProfilePicture(
        session.id,
        imagePath
      );

      return res.status(200).json({
        sessionId: session.id,
        success: result.success === true,
        message: 'Profile picture update reported successful'
      });
    } catch (error) {
      console.error(
        'Profile picture update failed:',
        error.message
      );

      return res.status(409).json({
        error: 'Profile picture update failed'
      });
    } finally {
      session.profileUpdateAuthorized = false;
      activeProfileUpdates.delete(session.id);
    }
  }
);

// =====================================================
// EXPLICIT WHATSAPP LOGOUT
// =====================================================

const activeLogouts = new Set();

app.post(
  '/api/sessions/:id/logout',
  async (req, res) => {
    noStore(res);

    const session = authorizeSession(req, res);
    if (!session) return;

    if (req.body?.confirmLogout !== true) {
      return res.status(403).json({
        error: 'Explicit logout confirmation required'
      });
    }

    if (activeProfileUpdates.has(session.id)) {
      return res.status(409).json({
        error: 'Profile update is in progress'
      });
    }

    if (activeLogouts.has(session.id)) {
      return res.status(409).json({
        error: 'Logout already in progress'
      });
    }

    const worker = getWorkerPairingStatus(session.id);

    if (
      !worker ||
      !['READY', 'AUTHENTICATED', 'DISCONNECTED'].includes(worker.status)
    ) {
      return res.status(409).json({
        error: 'No authenticated WhatsApp worker ready for logout'
      });
    }

    activeLogouts.add(session.id);

    try {
      const result = await logoutWorkerPairing(session.id);

      if (result.logoutConfirmed !== true) {
        throw new Error('Logout was not confirmed');
      }

      if (result.workerShutdownConfirmed !== true) {
        throw new Error('Worker shutdown was not confirmed');
      }

      // The worker has already confirmed WhatsApp logout
      // and exited safely. Release the local reservation.
      await releasePairing(session.id);

      // Verify that the live worker's LocalAuth profile
      // is absent before claiming local cleanup succeeded.
      const credentialDirectory = path.join(
        __dirname,
        '.wwebjs_auth',
        'session-aslns-' + session.id
      );

      try {
        await fs.stat(credentialDirectory);

        throw new Error(
          'WhatsApp credentials remain after logout'
        );
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      session.profileUpdateConsent = false;
      session.profileUpdateAuthorized = false;

      return res.status(200).json({
        sessionId: session.id,
        logoutConfirmed: true,
        workerShutdownConfirmed: true,
        localCleanupConfirmed: true,
        message: 'WhatsApp logout and local cleanup confirmed'
      });
    } catch (error) {
      console.error(
        'Explicit WhatsApp logout failed:',
        error.message
      );

      return res.status(409).json({
        error:
          'Logout or cleanup is incomplete. Do not retry pairing until recovery is checked.'
      });
    } finally {
      activeLogouts.delete(session.id);
    }
  }
);

async function startServer() {
  if (startupInProgress || startupCompleted) {
    return;
  }

  startupInProgress = true;

  try {
    await acquireInstanceLock();
    lockAcquired = true;

    console.log(
      'Exclusive backend instance lock acquired'
    );

    const recovery = await inspectStartupRecovery();

    if (recovery.status !== 'CLEAN') {
      throw new Error(
        `Authentication recovery required: ${
          recovery.orphanedProfiles ?? 'unknown'
        } leftover profile(s) detected`
      );
    }

    if (shuttingDown) {
      throw new Error(
        'Startup interrupted by shutdown'
      );
    }

    console.log(
      'Startup recovery inspection: CLEAN'
    );

    await new Promise((resolve, reject) => {
      const httpServer = app.listen(
        PORT,
        HOST
      );

      server = httpServer;

      function onListening() {
        httpServer.off(
          'error',
          onStartupError
        );

        resolve();
      }

      function onStartupError(error) {
        httpServer.off(
          'listening',
          onListening
        );

        reject(error);
      }

      httpServer.once(
        'listening',
        onListening
      );

      httpServer.once(
        'error',
        onStartupError
      );
    });

    if (shuttingDown) {
      throw new Error(
        'Startup interrupted by shutdown'
      );
    }

    startupCompleted = true;

    server.on('error', error => {
      console.error(
        'HTTP server error:',
        error.message
      );

      gracefulShutdown(
        'HTTP_SERVER_ERROR'
      ).then(() => {
        process.exitCode = 1;
      }).catch(shutdownError => {
        console.error(
          'Emergency shutdown failed:',
          shutdownError.message
        );

        process.exitCode = 1;
      });
    });

    console.log(
      `ASLNS WhatsApp backend running on port ${PORT}`
    );
  } catch (error) {
    console.error(
      'STARTUP BLOCKED:',
      error.message
    );

    // Shutdown handles cleanup after startup settles.
    if (shuttingDown) {
      process.exitCode = 1;
      return;
    }

    try {
      await closeHttpServer();
      await releaseEveryPairing();

      if (lockAcquired) {
        await releaseInstanceLock();
        lockAcquired = false;

        console.log(
          'Instance lock released after safe startup failure'
        );
      }
    } catch (cleanupError) {
      console.error(
        'Startup cleanup failed:',
        cleanupError.message
      );

      console.error(
        'Instance lock preserved for manual recovery'
      );
    }

    process.exitCode = 1;
  } finally {
    startupInProgress = false;
  }
}

// =====================================================
// START BACKEND
// =====================================================

startupPromise = startServer().catch(error => {
  console.error(
    'Backend startup failed:',
    error.message
  );

  process.exitCode = 1;
});

// =====================================================
// PERIODIC UPLOAD CLEANUP
// =====================================================

cleanupExpiredUploads().catch(error => {
  console.error(
    'Initial upload cleanup failed:',
    error.message
  );
});

setInterval(() => {
  cleanupExpiredUploads().catch(error => {
    console.error(
      'Periodic upload cleanup failed:',
      error.message
    );
  });
}, 60 * 1000).unref();

// =====================================================
// SIGNAL HANDLERS
// =====================================================

process.once('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(error => {
    console.error(
      'Shutdown error:',
      error.message
    );

    process.exitCode = 1;
  });
});

process.once('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(error => {
    console.error(
      'Shutdown error:',
      error.message
    );

    process.exitCode = 1;
  });
});
