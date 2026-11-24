'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { WhatsAppClient } = require('../client');

test('profile pairing avoids history sync and exposes link lifecycle events', async () => {
  // Reserved fictional North American test number; no real account is used.
  const testPhone = '15550100123';
  const events = [];
  const socketEvents = new EventEmitter();
  const socket = {
    ev: socketEvents,
    user: { id: `${testPhone}@s.whatsapp.net` },
    async waitForSocketOpen() { events.push('open'); },
    async requestPairingCode(phone, ...args) {
      events.push(['pair', phone, ...args]);
      return 'AB12CD34';
    },
    async updateProfilePicture(...args) { events.push(['picture', ...args]); },
    async logout() { events.push('logout'); },
    end() { events.push('end'); }
  };
  const state = { creds: { registered: false } };
  const client = new WhatsAppClient({
    authDir: 'runtime/session/auth', phoneNumber: testPhone,
    loadBaileys: async () => ({
      default: config => { events.push(config); queueMicrotask(() => socketEvents.emit('connection.update', { qr: 'test-handshake' })); return socket; },
      Browsers: { macOS: name => [name] },
      DisconnectReason: { loggedOut: 401 },
      proto: { HistorySync: { HistorySyncType: { INITIAL_BOOTSTRAP: 1, RECENT: 2, FULL: 3 } } },
      async fetchLatestWaWebVersion() { return { version: [2, 3000, 1], isLatest: true }; },
      async useMultiFileAuthState(dir) { assert.equal(dir, 'runtime/session/auth'); return { state, saveCreds: async () => { events.push('save'); } }; }
    })
  });
  const codes = []; const ready = [];
  client.on('code', code => codes.push(code));
  client.on('ready', () => ready.push(true));
  await client.initialize();
  assert.equal(codes[0], 'AB12CD34');
  assert.deepEqual(events.find(event => Array.isArray(event) && event[0] === 'pair'), ['pair', testPhone]);
  const config = events.find(event => event && typeof event === 'object' && 'syncFullHistory' in event);
  assert.equal(config.syncFullHistory, false);
  assert.deepEqual(config.browser, ['Chrome']);
  assert.equal(config.shouldSyncHistoryMessage(), false);
  assert.equal(config.shouldIgnoreJid('chat@s.whatsapp.net'), true);
  assert.equal(config.markOnlineOnConnect, false);
  socketEvents.emit('connection.update', { connection: 'open' });
  assert.equal(await client.getState(), 'CONNECTED');
  assert.deepEqual(ready, [true]);
  await client.updateProfilePicture(Buffer.from('jpeg'), { width: 640, height: 213 });
  assert.equal(events.at(-1)[0], 'picture');
  await client.logout();
  await client.destroy();
  assert.equal(events.includes('logout'), true);
  assert.equal(events.includes('end'), true);
});

test('status sync reads only saved-contact app state and excludes the linked account', async () => {
  const testPhone = '15550100123';
  const events = [];
  const socketEvents = new EventEmitter();
  const socket = {
    ev: socketEvents,
    user: { id: `${testPhone}@s.whatsapp.net` },
    async waitForSocketOpen() { events.push('open'); },
    async resyncAppState(collections, initial) {
      events.push(['sync', collections, initial]);
      socketEvents.emit('contacts.upsert', [
        { id: '15550100124@s.whatsapp.net', jid: '15550100124@s.whatsapp.net', name: 'Saved Contact' },
        { id: `${testPhone}@s.whatsapp.net`, jid: `${testPhone}@s.whatsapp.net`, name: 'Own Account' },
        { id: '15550100125@s.whatsapp.net', jid: '15550100125@s.whatsapp.net', name: '' }
      ]);
    },
    async fetchPrivacySettings() { return { status: 'contacts' }; },
    async logout() {},
    end() {}
  };
  const state = { creds: { registered: true } };
  const client = new WhatsAppClient({
    authDir: 'runtime/session/auth', phoneNumber: testPhone, operation: 'status',
    loadBaileys: async () => ({
      default: config => { events.push(config); return socket; },
      Browsers: { macOS: name => [name] },
      DisconnectReason: { loggedOut: 401 },
      proto: { HistorySync: { HistorySyncType: { INITIAL_BOOTSTRAP: 1, RECENT: 2, FULL: 3 } } },
      async fetchLatestWaWebVersion() { return { version: [2, 3000, 1], isLatest: true }; },
      async useMultiFileAuthState() { return { state, saveCreds: async () => {} }; }
    })
  });
  await client.initialize();
  socketEvents.emit('connection.update', { connection: 'open' });
  assert.deepEqual(await client.getStatusAudience(), ['15550100124@s.whatsapp.net']);
  assert.deepEqual(events.find(event => Array.isArray(event) && event[0] === 'sync'), ['sync', ['critical_unblock_low'], true]);
  const config = events.find(event => event && typeof event === 'object' && 'syncFullHistory' in event);
  assert.equal(config.syncFullHistory, true);
  assert.deepEqual(config.browser, ['Desktop']);
  assert.equal(config.shouldSyncHistoryMessage({ syncType: 2 }), true);
  assert.equal(config.shouldSyncHistoryMessage({ syncType: 3 }), false);
  await client.destroy();
});

test('status sync extracts contacts from recent sync without reading message content', async () => {
  const testPhone = '15550100123';
  const events = [];
  const socketEvents = new EventEmitter();
  const socket = {
    ev: socketEvents,
    user: { id: `${testPhone}@s.whatsapp.net` },
    async waitForSocketOpen() {},
    async resyncAppState(collections, initial) { events.push(['sync', collections, initial]); },
    async fetchPrivacySettings() { return { status: 'contacts' }; },
    async logout() {},
    end() {}
  };
  const state = { creds: { registered: true } };
  const client = new WhatsAppClient({
    authDir: 'runtime/session/auth', phoneNumber: testPhone, operation: 'status',
    loadBaileys: async () => ({
      default: config => { events.push(config); return socket; },
      Browsers: { macOS: name => [name] },
      DisconnectReason: { loggedOut: 401 },
      proto: { HistorySync: { HistorySyncType: { INITIAL_BOOTSTRAP: 1, RECENT: 2, FULL: 3 } } },
      async fetchLatestWaWebVersion() { return { version: [2, 3000, 1], isLatest: true }; },
      async useMultiFileAuthState() { return { state, saveCreds: async () => {} }; }
    })
  });
  await client.initialize();
  socketEvents.emit('connection.update', { connection: 'open' });
  const audienceTask = client.getStatusAudience();
  await new Promise(resolve => setImmediate(resolve));
  socketEvents.emit('messaging-history.set', {
    syncType: 2,
    contacts: [
      { id: '15550100124@s.whatsapp.net', jid: '15550100124@s.whatsapp.net', name: 'Saved Contact' },
      { id: `${testPhone}@s.whatsapp.net`, jid: `${testPhone}@s.whatsapp.net`, name: 'Own Account' },
      { id: '15550100125@s.whatsapp.net', jid: '15550100125@s.whatsapp.net', name: '' }
    ],
    messages: [{ message: { conversation: 'must not be inspected' } }]
  });
  assert.deepEqual(await audienceTask, ['15550100124@s.whatsapp.net']);
  const config = events.find(event => event && typeof event === 'object' && 'syncFullHistory' in event);
  assert.equal(config.shouldSyncHistoryMessage({ syncType: 2 }), true);
  assert.equal(config.shouldSyncHistoryMessage({ syncType: 3 }), false);
  await client.destroy();
});
