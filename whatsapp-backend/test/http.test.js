'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { EventEmitter } = require('node:events');
const { createApp } = require('../server');
const { SessionManager } = require('../sessions');

test('HTTP upload validates consent, content, origin, and session ownership', async t => {
  const manager = new SessionManager({
    createClient: () => Object.assign(new EventEmitter(), { initialize: async () => {}, destroy: async () => {} }),
    sendPicture: async () => true, removeData: async () => {}
  });
  const server = createApp({ manager, liveEnabled: true }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await manager.close(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}/api/whatsapp`;
  const bytes = await sharp({ create: { width: 300, height: 100, channels: 3, background: '#336699' } }).png().toBuffer();
  const form = (consent = 'true', image = bytes) => {
    const data = new FormData(); data.append('phoneNumber', '919876543210'); data.append('consent', consent);
    data.append('image', new Blob([image], { type: 'image/png' }), 'photo.png'); return data;
  };
  assert.equal((await fetch(base + '/sessions', { method: 'POST', body: form('false') })).status, 400);
  assert.equal((await fetch(base + '/sessions', { method: 'POST', body: form('true', Buffer.from('bad')) })).status, 400);
  assert.equal((await fetch(base + '/sessions', { method: 'POST', body: form(), headers: { Origin: 'https://untrusted.example' } })).status, 403);
  const response = await fetch(base + '/sessions', { method: 'POST', body: form() });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const session = await response.json();
  const url = base + '/sessions/' + session.sessionId;
  assert.equal((await fetch(url)).status, 404);
  assert.equal((await fetch(url, { method: 'DELETE', headers: { 'X-Session-Token': '0'.repeat(64) } })).status, 404);
  const headers = { 'X-Session-Token': session.accessToken };
  const current = await (await fetch(url, { headers })).json();
  assert.equal(current.accessToken, undefined);
  assert.equal(current.phoneNumber, undefined);
  assert.equal((await fetch(url, { method: 'DELETE', headers })).status, 200);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await (await fetch(url, { headers })).json()).status, 'CANCELLED');
});

test('disabled live mode cannot create a session', async t => {
  const server = createApp({ manager: {}, liveEnabled: false }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/whatsapp`;
  assert.equal((await (await fetch(base + '/health')).json()).available, false);
  assert.equal((await fetch(base + '/sessions', { method: 'POST' })).status, 503);
});
