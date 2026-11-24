'use strict';

const { EventEmitter } = require('node:events');
const pino = require('pino');

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class WhatsAppClient extends EventEmitter {
  constructor({ authDir, phoneNumber, operation = 'profile', loadBaileys = () => import('@whiskeysockets/baileys') }) {
    super();
    Object.assign(this, { authDir, phoneNumber, operation, loadBaileys });
    this.closing = false;
    this.connected = false;
    this.saveQueue = Promise.resolve();
    this.restartTask = null;
    this.restartAttempts = 0;
    this.savedContacts = new Set();
    this.statusSyncTask = null;
    this.statusSyncPromise = operation === 'status' ? new Promise((resolve, reject) => {
      this.resolveStatusSync = resolve;
      this.rejectStatusSync = reject;
    }) : null;
    // A user may cancel before the audience wait starts; mark rejection as
    // handled while preserving the original promise for the later await.
    this.statusSyncPromise?.catch(() => {});
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
      // WhatsApp sends the contact/history bootstrap to desktop-style linked
      // devices. Profile updates do not need that sync and keep the lighter UA.
      browser: this.baileys.Browsers.macOS(this.operation === 'status' ? 'Desktop' : 'Chrome'),
      printQRInTerminal: false,
      // The Status flow needs WhatsApp's recent/initial contact bootstrap.
      // shouldSyncHistoryMessage below still rejects full/on-demand history.
      syncFullHistory: this.operation === 'status',
      // Only accept WhatsApp's recent/initial sync types for Status Studio.
      // The sync payload may contain messages; listeners below read contacts
      // only and never retain or log the history payload.
      shouldSyncHistoryMessage: message => {
        if (this.operation !== 'status') return false;
        const types = this.baileys.proto?.HistorySync?.HistorySyncType;
        return message?.syncType === types?.RECENT || message?.syncType === types?.INITIAL_BOOTSTRAP;
      },
      shouldIgnoreJid: () => true,
      markOnlineOnConnect: false,
      fireInitQueries: false,
      getMessage: async () => undefined
    });
    this.socket = socket;

    if (this.operation === 'status') {
      socket.ev.on('contacts.upsert', contacts => {
        this.collectSavedContacts(contacts);
        this.finishStatusSyncIfReady(socket);
      });
      socket.ev.on('messaging-history.set', event => {
        const types = this.baileys.proto?.HistorySync?.HistorySyncType;
        if (event?.syncType !== types?.RECENT && event?.syncType !== types?.INITIAL_BOOTSTRAP) return;
        // Read only the contact array. Do not inspect, copy, or store event.messages.
        this.collectSavedContacts(event.contacts);
        this.finishStatusSyncIfReady(socket);
      });
    }

    socket.ev.on('creds.update', () => {
      void this.persistCredentials().catch(() => this.emit('auth_failure'));
    });
    socket.ev.on('connection.update', update => {
      if (update.connection === 'open') {
        this.connected = true;
        if (this.operation === 'status' && this.authState.creds.registered && this.resolveStatusSync && !this.statusSyncTimer) {
          this.statusSyncTimer = setTimeout(() => {
            this.rejectStatusSync?.(this.statusError('WhatsApp did not provide your saved contacts. Check your connection and try again.'));
            this.clearStatusSync();
          }, 90000);
          this.statusSyncTimer.unref?.();
          void this.syncSavedContacts(socket);
        }
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

  statusError(message) {
    const error = new Error(message);
    error.publicMessage = message;
    return error;
  }

  clearStatusSync() {
    clearTimeout(this.statusSyncTimer);
    this.resolveStatusSync = null;
    this.rejectStatusSync = null;
  }

  collectSavedContacts(contacts) {
    for (const contact of contacts || []) {
      if (typeof contact?.name !== 'string' || !contact.name.trim()) continue;
      const jid = String(contact.jid || contact.id || '').replace(/:\d+(?=@)/, '');
      const match = jid.match(/^([1-9][0-9]{7,14})@s\.whatsapp\.net$/);
      if (match) this.savedContacts.add(match[1]);
    }
  }

  finishStatusSyncIfReady(socket) {
    if (this.closing || socket !== this.socket || !this.resolveStatusSync) return;
    const own = String(socket.user?.id || '').replace(/:\d+(?=@)/, '').match(/^([1-9][0-9]{7,14})@s\.whatsapp\.net$/)?.[1];
    if (own) this.savedContacts.delete(own);
    if (!this.savedContacts.size) return;
    const contacts = [...this.savedContacts];
    const resolve = this.resolveStatusSync;
    this.clearStatusSync();
    resolve(contacts);
  }

  async syncSavedContacts(socket) {
    if (this.statusSyncTask || !this.resolveStatusSync || !socket) return;
    const task = (async () => {
      if (typeof socket.resyncAppState !== 'function') throw this.statusError('This WhatsApp connection cannot sync saved contacts. Try again later.');
      // WhatsApp stores address-book contact actions in this app-state
      // collection. Sync only that collection; no chats or message history.
      await socket.resyncAppState(['critical_unblock_low'], true);
      await new Promise(resolve => setImmediate(resolve));
      if (this.closing || socket !== this.socket || !this.resolveStatusSync) return;
      // If this collection has no entries, wait for the recent/initial sync
      // event instead of failing before WhatsApp provides its contact array.
      this.finishStatusSyncIfReady(socket);
    })().catch(error => {
      // A replaced socket gets a fresh sync attempt when it opens.
      if (this.closing || socket !== this.socket || !this.resolveStatusSync) return;
      // Keep waiting for a recent-sync contact array if the app-state query
      // fails. The session timer reports a single generic failure if both fail.
      console.warn('WhatsApp saved-contact app-state sync failed', { errorName: typeof error?.name === 'string' ? error.name.slice(0, 48) : null });
    });
    this.statusSyncTask = task;
    try { await task; }
    finally {
      if (this.statusSyncTask === task) {
        this.statusSyncTask = null;
        if (socket !== this.socket && this.connected && this.resolveStatusSync) {
          void this.syncSavedContacts(this.socket);
        }
      }
    }
  }

  cancelStatusAudienceWait() {
    this.rejectStatusSync?.(this.statusError('Contact sync cancelled.'));
    this.clearStatusSync();
    this.savedContacts.clear();
  }

  async getStatusAudience() {
    if (this.operation !== 'status' || !this.statusSyncPromise) throw this.statusError('Status audience is unavailable.');
    let contacts;
    try { contacts = await this.statusSyncPromise; }
    catch (error) { throw error?.publicMessage ? error : this.statusError('Could not sync saved WhatsApp contacts. Try again.'); }
    this.savedContacts.clear();
    if (!contacts.length) throw this.statusError('No saved WhatsApp contacts were available for this status.');
    const privacy = await this.socket.fetchPrivacySettings(true).catch(() => null);
    if (privacy?.status !== 'contacts') throw this.statusError('Set WhatsApp Status privacy to “My contacts” and try again. The tool does not change your privacy settings.');
    return contacts.map(number => `${number}@s.whatsapp.net`);
  }

  async sendStatus(media, audience) {
    if (!this.connected || !this.socket?.user) throw new Error('WhatsApp account identity is unavailable');
    const content = media.kind === 'video'
      ? { video: media.buffer, mimetype: media.mimetype, caption: media.caption || undefined }
      : { image: media.buffer, mimetype: media.mimetype, caption: media.caption || undefined };
    await this.socket.sendMessage('status@broadcast', content, {
      statusJidList: audience,
      broadcast: true
    });
    return true;
  }

  async logout() {
    if (!this.socket || this.closing) return;
    this.closing = true;
    await this.socket.logout();
  }

  async destroy() {
    this.closing = true;
    this.connected = false;
    this.cancelStatusAudienceWait();
    this.savedContacts.clear();
    if (this.socket) this.socket.end();
  }
}

module.exports = { WhatsAppClient };
