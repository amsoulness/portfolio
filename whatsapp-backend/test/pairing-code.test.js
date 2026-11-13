'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPairingCode } = require('../pairing-code');

test('creates an eight-character ASLNS code with a fresh alphabet suffix', () => {
  const code = createPairingCode(Buffer.from([0, 31, 14]));
  assert.equal(code, 'ASLNS0ZE');
  assert.match(code, /^ASLNS[0-9A-HJKMNP-TV-Z]{3}$/);
  assert.equal(createPairingCode(Buffer.from([1, 31, 14])), 'ASLNS1ZE');
});

test('rejects a random source with the wrong number of bytes', () => {
  assert.throws(() => createPairingCode(Buffer.alloc(2)), /3 random bytes/);
});
