'use strict';

const { EventEmitter } = require('node:events');
const pino = require('pino');

class WhatsAppClient extends EventEmitter {
  constructor({ authDir, phoneNumber, pairingCode, loadBaileys = () => import('@whiskeysockets/baileys') }) {
    super();
    Object.assign(this, { authDir, phoneNumber, pairingCode, loadBaileys });
    this.closing = false;
    this.connected = false;
  }

  async initialize() {
    const baileys = await this.loadBaileys();
    const { state, saveCreds } = await baileys.useMultiFileAuthState(this.authDir);
    this.authState = state;
    this.saveCreds = saveCreds;
    this.socket = baileys.default({
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: baileys.Browsers.macOS('Chrome'),
      printQRInTerminal: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: () => true,
      markOnlineOnConnect: false,
      fireInitQueries: false,
      getMessage: async () => undefined
    });

    this.socket.ev.on('creds.update', () => {
      void this.saveCreds().catch(() => this.emit('auth_failure'));
    });
    this.socket.ev.on('connection.update', update => {
      if (update.connection === 'open') {
        this.connected = true;
        this.emit('authenticated');
        this.emit('ready');
      } else if (update.connection === 'close' && !this.closing) {
        this.connected = false;
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        if (statusCode === baileys.DisconnectReason?.loggedOut) this.emit('auth_failure');
        else this.emit('disconnected', update.lastDisconnect?.error?.message || 'connection closed');
      }
    });

    await this.socket.waitForSocketOpen();
    if (!state.creds.registered) {
      const code = await this.socket.requestPairingCode(this.phoneNumber, this.pairingCode);
      await this.saveCreds();
      this.emit('code', code);
    }
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
