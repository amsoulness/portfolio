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
    this.openSocket();
    await this.socket.waitForSocketOpen();
    if (!state.creds.registered) {
      const code = await this.socket.requestPairingCode(this.phoneNumber, this.pairingCode);
      await this.persistCredentials();
      this.emit('code', code);
    }
  }

  openSocket() {
    const socket = this.baileys.default({
      auth: this.authState,
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
        if (statusCode === this.baileys.DisconnectReason?.restartRequired) {
          void this.restartSocket();
        } else if (statusCode === this.baileys.DisconnectReason?.loggedOut) this.emit('auth_failure');
        else this.emit('disconnected', update.lastDisconnect?.error?.message || 'connection closed');
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
        this.emit('disconnected', 'WhatsApp requested too many connection restarts');
        return;
      }
      try {
        await this.persistCredentials();
        if (this.closing) return;
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

