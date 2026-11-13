'use strict';

const { EventEmitter } = require('node:events');
const pino = require('pino');

class WhatsAppClient extends EventEmitter {
  constructor({ authDir, phoneNumber, pairingCode, loadBaileys = () => import('@whiskeysockets/baileys') }) {
    super();
    Object.assign(this, { authDir, phoneNumber, pairingCode, loadBaileys });
    this.closing = false;
    this.connected = false;
    this.saveQueue = Promise.resolve();
    this.restartTask = null;
    this.restartAttempts = 0;
  }

  async initialize() {
    const baileys = await this.loadBaileys();
    const { state, saveCreds } = await baileys.useMultiFileAuthState(this.authDir);
    this.baileys = baileys;
    this.authState = state;
    this.saveCreds = saveCreds;

    const webVersion = await baileys.fetchLatestWaWebVersion({ timeout: 10000 });
    this.version = Array.isArray(webVersion?.version) ? webVersion.version : baileys.version;
    console.info('WhatsApp Web protocol version', {
      version: this.version?.join('.'),
      latest: Boolean(webVersion?.isLatest)
    });

    const socket = this.openSocket();
    if (!state.creds.registered) {
      const pairingReady = typeof socket.waitForConnectionUpdate === 'function'
        ? socket.waitForConnectionUpdate(update => update.connection === 'connecting' || Boolean(update.qr), 30000)
        : Promise.resolve();
      await Promise.all([socket.waitForSocketOpen(), pairingReady]);
      const code = await socket.requestPairingCode(this.phoneNumber, this.pairingCode);
      await this.persistCredentials();
      this.emit('code', code);
    } else await socket.waitForSocketOpen();
  }

  openSocket() {
    const socket = this.baileys.default({
      auth: this.authState,
      version: this.version,
      logger: pino({ level: 'silent' }),
      browser: this.baileys.Browsers.macOS('Chrome'),
      printQRInTerminal: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: () => true,
      markOnlineOnConnect: false,
      fireInitQueries: false,
      getMessage: async () => undefined
    });
    this.socket = socket;

    socket.ev.on('creds.update', () => {
      void this.persistCredentials().catch(() => this.emit('auth_failure'));
    });
    socket.ev.on('connection.update', update => {
      if (update.connection === 'open') {
        this.connected = true;
        this.emit('authenticated');
        this.emit('ready');
      } else if (update.connection === 'close' && !this.closing) {
        if (socket !== this.socket) return;
        this.connected = false;
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        console.warn('WhatsApp connection closed', {
          statusCode: Number.isInteger(statusCode) ? statusCode : null,
          errorName: typeof update.lastDisconnect?.error?.name === 'string'
            ? update.lastDisconnect.error.name.slice(0, 48)
            : null
        });
        const reasons = this.baileys.DisconnectReason || {};
        if (this.authState.creds.registered &&
            (statusCode === reasons.restartRequired || statusCode === reasons.connectionClosed)) {
          void this.restartSocket();
        } else if (statusCode === reasons.loggedOut) this.emit('auth_failure');
        else if (!this.authState.creds.registered) {
          this.emit('disconnected', 'WhatsApp closed the pairing connection before the device was linked. Wait before trying again.');
        } else this.emit('disconnected', update.lastDisconnect?.error?.message || 'connection closed');
      }
    });
    return socket;
  }

  persistCredentials() {
    this.saveQueue = this.saveQueue.then(() => this.saveCreds());
    return this.saveQueue;
  }

  restartSocket() {
    if (this.restartTask || this.closing) return this.restartTask;
    this.restartTask = (async () => {
      if (++this.restartAttempts > 2) {
        this.emit('disconnected', 'WhatsApp could not keep the temporary connection open');
        return;
      }
      try {
        await new Promise(resolve => setTimeout(resolve, this.restartAttempts * 1000));
        await this.persistCredentials();
        if (this.closing) return;
        const { state, saveCreds } = await this.baileys.useMultiFileAuthState(this.authDir);
        this.authState = state;
        this.saveCreds = saveCreds;
        this.saveQueue = Promise.resolve();
        const socket = this.openSocket();
        await socket.waitForSocketOpen();

      } catch (error) {
        if (!this.closing) this.emit('disconnected', error?.message || 'connection restart failed');
      } finally {
        this.restartTask = null;
      }
    })();
    return this.restartTask;
  }

  async getState() {
    return this.connected && this.socket?.user ? 'CONNECTED' : 'OPENING';
  }

  async updateProfilePicture(bytes, dimensions) {
    const jid = this.socket?.user?.id;
    if (!jid) throw new Error('WhatsApp account identity is unavailable');
    await this.socket.updateProfilePicture(jid, bytes, dimensions);
  }

  async logout() {
    if (!this.socket || this.closing) return;
    this.closing = true;
    await this.socket.logout();
  }

  async destroy() {
    this.closing = true;
    this.connected = false;
    if (this.socket) this.socket.end();
  }
}

module.exports = { WhatsAppClient };
