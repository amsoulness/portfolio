'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { createMessage } =
  require('./whatsapp-ipc-protocol');

const { createSessionGuard } =
  require('./whatsapp-ipc-session-guard');

const sessionA = randomUUID();
const sessionB = randomUUID();

const guard = createSessionGuard(sessionA);

const valid = createMessage('PAIR_START', {
  sessionId: sessionA,
  phoneNumber: '919876543210',
  consent: true
});

assert.equal(guard.authorize(valid), valid);

console.log('Matching session authorized: PASSED');

assert.throws(
  () => guard.authorize(
    createMessage('PAIR_START', {
      sessionId: sessionB,
      phoneNumber: '919876543210',
      consent: true
    })
  ),
  /different session/
);

console.log('Cross-session pairing blocked: PASSED');

assert.throws(
  () => guard.authorize(
    createMessage('PROFILE_UPDATE', {
      sessionId: sessionB,
      imagePath: '/tmp/photo.jpg'
    })
  ),
  /different session/
);

console.log('Cross-session profile update blocked: PASSED');

assert.throws(
  () => guard.authorize(
    createMessage('LOGOUT', {
      sessionId: sessionB
    })
  ),
  /different session/
);

console.log('Cross-session logout blocked: PASSED');

assert.equal(
  guard.authorize(createMessage('PING')).type,
  'PING'
);

console.log('Session-independent PING allowed: PASSED');

console.log(
  '\nSESSION GUARD TEST PASSED — Step 113D.3C.47'
);
