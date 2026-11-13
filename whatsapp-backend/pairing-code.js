'use strict';

const { randomBytes } = require('node:crypto');
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function createPairingCode(bytes = randomBytes(3)) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== 3) throw new TypeError('Expected 3 random bytes');
  return 'ASLNS' + [...bytes].map(value => ALPHABET[value & 31]).join('');
}

module.exports = { createPairingCode, ALPHABET };
