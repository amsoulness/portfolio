'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { SessionManager } = require('../sessions');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function fixture(overrides = {}) {
  const calls = [];
  const client = Object.assign(new EventEmitter(), {
    async initialize() { calls.push('initialize'); this.emit('code', 'ABCD1234'); },
    async getState() { return 'CONNECTED'; },
    async logout() { calls.push('logout'); this.emit('disconnected'); },
    async destroy() { calls.push('destroy'); },
    ...overrides.client
  });
  const manager = new SessionManager({
    createClient: () => client,
    sendPicture: async (_client, image) => { assert.equal(image.picture, 'full'); calls.push('update'); return true; },
    removeData: async () => { calls.push('removeData'); },
    ...overrides.manager
  });
  const credentials = manager.create({ picture: 'full' }, '919876543210');
  const session = manager.authorize(credentials.sessionId, credentials.accessToken);
  return { calls, client, manager, session, credentials };
}

test('pair, update once, then logout and remove local data before success', async () => {
  const f = fixture(); await tick();
  assert.equal(f.session.status, 'CODE_READY');
  assert.equal(f.session.code, 'ABCD1234');
  assert.equal(f.manager.authorize(f.session.id, '0'.repeat(64)), null);
  assert.equal(f.manager.authorize(f.session.id, 'bad'), null);
  assert.throws(() => f.manager.create({}, '919876543210'), /busy/);
  f.client.emit('authenticated'); f.client.emit('ready'); f.client.emit('ready');
  await f.session.updateTask;
  assert.deepEqual(f.calls, ['initialize', 'update', 'logout', 'destroy', 'removeData']);
  assert.equal(f.session.status, 'SUCCESS');
  assert.equal(f.session.updated, true);
  assert.equal(f.session.deviceRemoved, true);
  assert.equal(f.session.image, null);
  assert.equal(f.manager.active, null);
  assert.equal(f.manager.snapshot(f.session).accessToken, undefined);
  f.manager.cancel(f.session);
  assert.equal(f.calls.filter(c => c === 'update').length, 1);
});

test('cancellation while startup is pending prevents late ready from updating', async () => {
  const start = deferred();
  const f = fixture({ client: { initialize: () => start.promise } }); await tick();
  f.manager.cancel(f.session);
  f.client.emit('authenticated'); f.client.emit('ready');
  assert.equal(f.session.updateStarted, false);
  start.resolve(); await f.session.startTask;
  assert.deepEqual(f.calls, ['logout', 'destroy', 'removeData']);
  assert.equal(f.session.status, 'CANCELLED');
});

test('cancellation during update waits for the actual outcome before logout', async () => {
  const update = deferred();
  const f = fixture({ manager: { sendPicture: () => update.promise } }); await tick();
  f.client.emit('ready'); await tick();
  f.manager.cancel(f.session); await tick();
  assert.ok(!f.calls.includes('logout'));
  assert.ok(f.manager.active);
  update.resolve(true); await f.session.updateTask;
  assert.equal(f.session.status, 'SUCCESS');
  assert.deepEqual(f.calls, ['initialize', 'logout', 'destroy', 'removeData']);
});

test('failed logout retains ownership and credentials until successful retry', async () => {
  let attempts = 0;
  const f = fixture({ client: { async logout() { if (++attempts === 1) throw new Error('offline'); } } }); await tick();
  f.client.emit('ready'); await f.session.updateTask;
  assert.equal(f.session.status, 'CLEANUP_REQUIRED');
  assert.equal(f.session.updated, true);
  assert.equal(f.session.deviceRemoved, false);
  assert.ok(!f.calls.includes('removeData'));
  assert.equal(f.manager.active, f.session);
  f.manager.cancel(f.session); await f.session.cleanupTask;
  assert.equal(f.session.status, 'SUCCESS');
  assert.equal(f.session.deviceRemoved, true);
  assert.equal(f.manager.active, null);
});

for (const result of [false, undefined, 'throw']) {
  test(`never reports success for an unconfirmed update (${result})`, async () => {
    const f = fixture({ manager: { sendPicture: async () => { if (result === 'throw') throw new Error('lost response'); return result; } } }); await tick();
    f.client.emit('ready'); await f.session.updateTask;
    assert.equal(f.session.status, 'ERROR');
    assert.equal(f.session.updated, false);
    assert.equal(f.session.deviceRemoved, true);
    assert.equal(f.session.outcome, result === 'throw' ? 'unconfirmed' : 'failed');
    assert.ok(!f.manager.active);
  });
}

test('expiry cancels unlinked sessions and clears image memory', async () => {
  const f = fixture({ manager: { ttl: 15 } });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(f.session.status, 'ERROR');
  assert.equal(f.session.image, null);
  assert.ok(!f.manager.active);
  assert.ok(!f.calls.includes('update'));
});

test('shutdown waits for active cleanup and does not allow new work', async () => {
  const logout = deferred();
  const f = fixture({ client: { logout: () => logout.promise } }); await tick();
  f.client.emit('ready'); await tick();
  const closing = f.manager.close();
  assert.throws(() => f.manager.create({}, '919876543210'), /busy/);
  logout.resolve(); await closing;
  assert.equal(f.manager.active, null);
});
