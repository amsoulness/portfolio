'use strict';
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { isIP } = require('node:net');
const multer = require('multer');
const fs = require('node:fs/promises');
const path = require('node:path');
const { SessionManager } = require('./sessions');
const { prepareImage, MAX_BYTES } = require('./image');
const { sendPicture } = require('./transport');

function createApp({ manager, liveEnabled, origins = ['http://localhost:5173'] }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use((req, res, next) => {
    if (req.headers.origin && !origins.includes(req.headers.origin)) {
      return res.status(403).json({ error: 'This website is not allowed to use the WhatsApp service.' });
    }
    next();
  });
  app.use(cors({ origin: origins, allowedHeaders: ['Content-Type', 'X-Session-Token'] }));
  app.get('/api/whatsapp/health', (_req, res) => res.json({ available: liveEnabled, version: 2 }));
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false,
    // Railway documents X-Real-IP as the client address and overwrites the
    // header at public ingress. X-Forwarded-For is not used as its proxy hop
    // count is not a stable contract. Keep Express trust proxy disabled.
    keyGenerator: req => {
      const railwayIp = req.get('X-Real-IP')?.trim();
      const clientIp = railwayIp && isIP(railwayIp) ? railwayIp : req.ip;
      return ipKeyGenerator(clientIp);
    },
    validate: { xForwardedForHeader: false },
    message: { error: 'Too many attempts. Please try again in 15 minutes.' } });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 2, fieldSize: 256, parts: 3 } });
  app.post('/api/whatsapp/sessions', limiter, (req, res, next) => {
    if (!liveEnabled) return res.status(503).json({ error: 'The WhatsApp tool is temporarily unavailable.' });
    if (manager.active || manager.closing) return res.status(409).json({ error: 'Another update is in progress. Please try again shortly.' });
    next();
  }, upload.single('image'), async (req, res) => {
    if (req.body?.consent !== 'true') return res.status(400).json({ error: 'Confirm account ownership and the update before continuing.' });
    if (!/^[1-9][0-9]{7,14}$/.test(req.body?.phoneNumber || '')) return res.status(400).json({ error: 'Enter your full phone number with country code.' });
    if (!req.file) return res.status(400).json({ error: 'Choose a photo first.' });
    let image;
    try { image = await prepareImage(req.file.buffer); }
    catch { return res.status(400).json({ error: 'Choose a valid still JPG, PNG, or WebP image, up to 20 MB and 40 megapixels.' }); }
    try { return res.status(201).json(manager.create(image, req.body.phoneNumber)); }
    catch { return res.status(409).json({ error: 'Another update is in progress. Please try again shortly.' }); }
  });
  app.use('/api/whatsapp/sessions/:id', (req, res, next) => {
    const session = manager.authorize(req.params.id, req.get('X-Session-Token'));
    if (!session) return res.status(404).json({ error: 'This session is no longer available. Check Linked devices in WhatsApp if you linked this tool.' });
    res.locals.session = session;
    next();
  });
  app.get('/api/whatsapp/sessions/:id', (_req, res) => res.json(manager.snapshot(res.locals.session)));
  // The original consent covers closing this temporary linked session. This
  // endpoint is idempotent and never retries an uncertain profile update.
  app.delete('/api/whatsapp/sessions/:id', (_req, res) => res.json(manager.cancel(res.locals.session)));
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) return res.status(400).json({ error: 'Upload one image no larger than 20 MB.' });
    res.status(500).json({ error: 'The WhatsApp service could not complete this request.' });
  });
  return app;
}

async function start() {
  const liveEnabled = process.env.ASLNS_ENABLE_LIVE_WHATSAPP === 'true';
  const runtime = path.resolve(process.env.ASLNS_RUNTIME_DIR || path.join(__dirname, '.runtime'));
  const owner = path.join(runtime, 'owner');
  await fs.mkdir(runtime, { recursive: true, mode: 0o700 });
  // Exclusive ownership also blocks unsafe automatic recovery after a crash.
  await fs.mkdir(owner, { mode: 0o700 });
  await fs.writeFile(path.join(owner, 'pid'), String(process.pid), { mode: 0o600 });
  const manager = new SessionManager({
    createClient(id, phoneNumber) {
      const { Client, NoAuth } = require('whatsapp-web.js');
      return new Client({
        authStrategy: new NoAuth(),
        deviceName: 'AMSOULNESS Profile Tool',
        browserName: 'Chrome',
        pairWithPhoneNumber: { phoneNumber, showNotification: true, intervalMs: 180000 },
        puppeteer: {
          headless: true, userDataDir: path.join(owner, id),
          ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
          ...(process.env.ASLNS_CHROME_NO_SANDBOX === 'true' ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : {})
        }
      });
    },
    sendPicture,
    removeData: id => fs.rm(path.join(owner, id), { recursive: true, force: true, maxRetries: 3 })
  });
  const origins = (process.env.ASLNS_ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean);
  const app = createApp({ manager, liveEnabled, origins });
  const server = app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => {
    console.log('WhatsApp profile service listening on port', server.address().port);
  });
  server.on('error', async () => {
    console.error('Could not start WhatsApp service. Check the listen address and port.');
    await manager.close();
    await fs.rm(owner, { recursive: true, force: true });
    process.exitCode = 1;
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    const deadline = setTimeout(() => {
      console.error('Cleanup incomplete; runtime ownership retained. Check WhatsApp Linked devices before recovery.');
      process.exit(1);
    }, 15000);
    try {
      await manager.close();
      await fs.rm(owner, { recursive: true, force: true });
      clearTimeout(deadline);
    } catch {
      clearTimeout(deadline);
      console.error('Cleanup incomplete; runtime ownership retained. Check WhatsApp Linked devices before recovery.');
      process.exitCode = 1;
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (require.main === module) start().catch(() => {
  console.error('Startup blocked. Check permissions and .runtime/owner for an existing or interrupted session. See README.md.');
  process.exitCode = 1;
});
module.exports = { createApp };
