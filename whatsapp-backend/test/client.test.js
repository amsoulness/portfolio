'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { WhatsAppClient } = require('../client');

test('requests WhatsApp-generated code, disables history sync, and exposes link lifecycle events', async () => {
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
      default: config => { events.push(config); return socket; },
      Browsers: { macOS: () => ['Chrome'] },
      DisconnectReason: { loggedOut: 401 },
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
