'use strict';

const { EventEmitter } = require('node:events');
const pino = require('pino');

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class WhatsAppClient extends EventEmitter {
  constructor({ authDir, phoneNumber, loadBaileys = () => import('@whiskeysockets/baileys') }) {
    super();
    Object.assign(this, { authDir, phoneNumber, loadBaileys });
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
    if (!state.creds.registered) await this.requestPairingCode(socket);
    else await socket.waitForSocketOpen();
  }

  async requestPairingCode(socket) {
    try {
      // Ask Baileys for WhatsApp's own code. Keep brand identity in the UI
      // label only; custom code patterns can be rejected for the target account.
      await new Promise((resolve, reject) => {
        const finish = error => {
          clearTimeout(timeout);
          socket.ev.off('connection.update', onUpdate);
          if (error) reject(error);
          else resolve();
        };
        const onUpdate = update => {
          if (update.qr) finish();
          else if (update.connection === 'close') {
            finish(update.lastDisconnect?.error || new Error('WhatsApp pairing connection closed'));
          }
        };
        const timeout = setTimeout(() => finish(new Error('WhatsApp pairing handshake timed out')), 30000);
        socket.ev.on('connection.update', onUpdate);
      });
      if (this.closing || socket !== this.socket) return;
      const code = await socket.requestPairingCode(this.phoneNumber);
      await this.persistCredentials();
      if (!this.closing && socket === this.socket) this.emit('code', code);
    } catch (error) {
      const statusCode = error?.output?.statusCode;
      const closed = this.baileys.DisconnectReason?.connectionClosed;
      if (statusCode === closed && !this.closing && socket === this.socket) {
        void this.restartSocket();
        return;
      }
      throw error;
    }
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
        if (this.authState.creds.registered) this.restartAttempts = 0;
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
        // WhatsApp can force a protocol reconnect during companion-device
        // pairing, before credentials have become registered.
        if (statusCode === reasons.restartRequired || statusCode === reasons.connectionClosed) {
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
      const isPairing = !this.authState.creds.registered;
      const maxAttempts = isPairing ? 3 : 2;
      if (++this.restartAttempts > maxAttempts) {
        this.emit('disconnected', isPairing
          ? 'WhatsApp closed the pairing connection again. Wait a few minutes before starting a new attempt.'
          : 'WhatsApp could not keep the temporary connection open');
        return;
      }
      try {
        // Avoid rapid reconnect/code churn while WhatsApp is closing an
        // unregistered pairing socket. Back off so WhatsApp has time to settle.
        await delay(isPairing ? 5000 * (2 ** (this.restartAttempts - 1)) : this.restartAttempts * 1000);
        await this.persistCredentials();
        if (this.closing) return;
        const { state, saveCreds } = await this.baileys.useMultiFileAuthState(this.authDir);
        this.authState = state;
        this.saveCreds = saveCreds;
        this.saveQueue = Promise.resolve();
        const socket = this.openSocket();
        if (!state.creds.registered) {
          // Allow a subsequent close to schedule the next bounded retry.
          void this.requestPairingCode(socket).catch(error => {
            if (!this.closing && socket === this.socket) {
              const statusCode = error?.output?.statusCode;
              if (statusCode === this.baileys.DisconnectReason?.connectionClosed) void this.restartSocket();
              else this.emit('disconnected', error?.message || 'WhatsApp pairing could not be restarted');
            }
          });
        } else await socket.waitForSocketOpen();
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

  async sendSelfMessage(text) {
    const jid = this.socket?.user?.id;
    if (!jid || !this.connected) throw new Error('WhatsApp account identity is unavailable');
    await this.socket.sendMessage(jid, { text });
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
