'use strict';

const { randomBytes } = require('node:crypto');
// WhatsApp's pairing codes use the Crockford alphabet (no I, L, O, or U).
// Use 1 as the visual stand-in for L so the ASLNS-style prefix stays valid.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function createPairingCode(bytes = randomBytes(3)) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== 3) throw new TypeError('Expected 3 random bytes');
  return 'AS1NS' + [...bytes].map(value => ALPHABET[value & 31]).join('');
}

module.exports = { createPairingCode, ALPHABET };
