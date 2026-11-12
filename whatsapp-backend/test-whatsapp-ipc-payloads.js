'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  createMessage
} = require('./whatsapp-ipc-protocol');

const {
  validateCommand
} = require('./whatsapp-ipc-payloads');

const sessionId = randomUUID();

const validPair = createMessage('PAIR_START', {
  sessionId,
  phoneNumber: '919876543210',
  consent: true
});

assert.equal(
  validateCommand(validPair),
  validPair
);

assert.throws(
  () => validateCommand(
    createMessage('PAIR_START', {
      sessionId,
      phoneNumber: '919876543210',
      consent: false
    })
  ),
  /consent/
);

assert.throws(
  () => validateCommand(
    createMessage('PAIR_START', {
      sessionId,
      phoneNumber: '+919876543210',
      consent: true
    })
  ),
  /phone number/
);

assert.throws(
  () => validateCommand(
    createMessage('PROFILE_UPDATE', {
      sessionId,
      imagePath: ''
    })
  ),
  /image path/
);

assert.throws(
  () => validateCommand(
    createMessage('LOGOUT', {
      sessionId: 'invalid'
    })
  ),
  /session ID/
);

assert.throws(
  () => validateCommand(
    createMessage('PING', {
      unexpected: true
    })
  ),
  /does not accept a payload/
);

console.log('Valid pairing command: PASSED');
console.log('Consent enforcement: PASSED');
console.log('Phone number validation: PASSED');
console.log('Image path validation: PASSED');
console.log('Session validation: PASSED');
console.log('Unexpected payload rejection: PASSED');

console.log(
  '\nIPC PAYLOAD TEST PASSED — Step 113D.3C.46'
);
