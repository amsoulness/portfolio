'use strict';
const { randomUUID, randomBytes, timingSafeEqual } = require('node:crypto');

const TERMINAL = new Set(['SUCCESS', 'CANCELLED', 'ERROR']);
const TTL = 10 * 60 * 1000;

class SessionManager {
  constructor({ createClient, sendPicture, removeData, ttl = TTL, retention = 30 * 60 * 1000 }) {
    Object.assign(this, { createClient, sendPicture, removeData, ttl, retention });
    this.sessions = new Map();
    this.active = null;
    this.closing = false;
  }

  create(image, phoneNumber) {
    if (this.closing || this.active) throw new Error('The tool is busy with another update. Please try again shortly.');
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (TERMINAL.has(session.status) && now - session.finishedAt > this.retention) this.sessions.delete(id);
    }
    // Bound even lightweight completed records under sustained requests.
    if (this.sessions.size >= 100) {
      const oldest = [...this.sessions.values()].find(s => TERMINAL.has(s.status));
      if (oldest) this.sessions.delete(oldest.id);
    }
    const s = {
      id: randomUUID(), token: randomBytes(32).toString('hex'), image,
      status: 'STARTING', code: null, expiresAt: now + this.ttl,
      authenticated: false, updated: false, deviceRemoved: false,
      cancelled: false, initializing: true, updating: false, cleaning: false,
      updateStarted: false, error: null, outcome: 'pending'
    };
    this.active = s;
    this.sessions.set(s.id, s);
    s.timer = setTimeout(() => {
      s.error = 'The connection timed out. Start again after the session is closed.';
      this.cancel(s);
    }, this.ttl);
    s.timer.unref?.();
    // Return credentials before asynchronous browser work starts.
    s.startTask = Promise.resolve().then(() => this.start(s, phoneNumber));
    return { ...this.snapshot(s), accessToken: s.token };
  }

  authorize(id, token) {
    const s = this.sessions.get(id);
    if (!s || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(s.token, 'hex')) ? s : null;
  }

  snapshot(s) {
    return {
      sessionId: s.id, status: s.status, pairingCode: s.code,
      expiresAt: new Date(s.expiresAt).toISOString(),
      updated: s.updated, deviceRemoved: s.deviceRemoved,
      outcome: s.outcome, error: s.error, confirmationSent: s.confirmationSent
    };
  }

  async start(s, phone) {
    try {
      if (s.cancelled) return;
      const client = this.createClient(s.id, phone);
      s.client = client;
      client.on('code', code => {
        if (s.cancelled || s.authenticated || s.updateStarted || s.cleaning) return;
        s.code = String(code);
        s.status = 'CODE_READY';
      });
      client.on('authenticated', () => {
        s.authenticated = true;
        s.code = null;
        if (!s.cancelled && !s.updateStarted && !s.cleaning) s.status = 'LINKED';
      });
      client.on('ready', () => {
        s.authenticated = true;
        s.code = null;
        if (s.cancelled || s.updateStarted || s.cleaning) return;
        s.updateStarted = true;
        s.updating = true;
        s.updateTask = this.update(s);
      });
      client.on('auth_failure', () => this.fail(s, 'WhatsApp could not link this device.'));
      client.on('disconnected', reason => {
        if (!s.cleaning && !TERMINAL.has(s.status)) {
          this.fail(s, typeof reason === 'string' && reason.length < 180
            ? reason
            : 'WhatsApp disconnected before the session finished.');
        }
      });
      await client.initialize();
    } catch {
      if (!s.error) s.error = 'WhatsApp could not start the connection. Please try again after cleanup.';
      s.cancelled = true;
    } finally {
      s.initializing = false;
      if (s.cancelled || s.updateStarted) await this.cleanup(s);
    }
  }

  fail(s, message) {
    if (TERMINAL.has(s.status)) return;
    s.error = message;
    this.cancel(s);
  }

  async update(s) {
    s.status = 'UPDATING';
    try {
      if (await s.client.getState() !== 'CONNECTED') throw new Error('Disconnected');
      if (s.cancelled) return;
      const result = await this.sendPicture(s.client, s.image);
      if (result !== true) {
        s.outcome = 'failed';
        s.error = 'WhatsApp did not accept this photo. The profile update was not confirmed.';
      } else {
        s.updated = true;
        s.outcome = 'confirmed';
        try {
          await s.client.sendSelfMessage('✦ YOUR PROFILE, REIMAGINED ✦\n\nYour new photo is live. A small change, a whole new presence.\n\nThank you for creating with AMSOULNESS. Keep making every detail your own.\n\nExplore more from the creative lab:\nhttps://aslns.online/tools\n\n— AMSOULNESS / ASLNS');
          s.confirmationSent = true;
        } catch {
          // Keep a successful photo update successful if the follow-up message fails.
          s.confirmationSent = false;
        }
      }
    } catch {
      s.outcome = 'unconfirmed';
      s.error = 'The update could not be confirmed. Check your profile in WhatsApp before trying again.';
    } finally {
      s.image = null;
      s.updating = false;
      await this.cleanup(s);
    }
  }

  cancel(s) {
    if (TERMINAL.has(s.status)) return this.snapshot(s);
    s.cancelled = true;
    s.code = null;
    // Never race logout against an update or browser initialization.
    if (!s.cleaning) s.status = 'CANCELLING';
    void this.cleanup(s);
    return this.snapshot(s);
  }

  cleanup(s) {
    if (s.cleaning) return s.cleanupTask;
    if (TERMINAL.has(s.status) || s.updating || s.initializing) return Promise.resolve();
    s.cleanupTask = this.performCleanup(s);
    return s.cleanupTask;
  }

  async performCleanup(s) {
    s.cleaning = true;
    s.code = null;
    s.status = 'REMOVING_DEVICE';
    try {
      if (s.client) {
        // A successful logout must precede deletion of authenticated credentials.
        if (s.authenticated && !s.deviceRemoved) {
          await s.client.logout();
          s.deviceRemoved = true;
        }
        await s.client.destroy();
        if (s.client.pupBrowser?.isConnected()) throw new Error('Browser still connected');
      }
      await this.removeData(s.id);
      s.status = s.updated ? 'SUCCESS' : s.error ? 'ERROR' : 'CANCELLED';
      s.finishedAt = Date.now();
      s.image = null;
      s.client = null;
      clearTimeout(s.timer);
      if (this.active === s) this.active = null;
    } catch {
      s.status = 'CLEANUP_REQUIRED';
      s.error = s.updated
        ? 'Your photo was updated, but device removal is not confirmed. Retry cleanup or remove this device in WhatsApp → Linked devices.'
        : 'Session cleanup is incomplete. Retry cleanup or remove this device in WhatsApp → Linked devices.';
    } finally {
      s.cleaning = false;
    }
  }

  async close() {
    this.closing = true;
    const s = this.active;
    if (!s) return;
    this.cancel(s);
    await s.startTask;
    await s.updateTask;
    await this.cleanup(s);
    if (this.active) throw new Error('Session cleanup is incomplete');
  }
}

module.exports = { SessionManager };
