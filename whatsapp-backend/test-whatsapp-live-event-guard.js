'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { createMessage } = require(
  './whatsapp-ipc-protocol'
);

const { validateLiveEvent } = require(
  './whatsapp-live-event-guard'
);

const sessionId = randomUUID();
const otherSessionId = randomUUID();

function event(type, payload) {
  return createMessage(
    type,
    payload,
    randomUUID()
  );
}

const validCode = event('PAIR_STATUS', {
  sessionId,
  status: 'CODE_READY',
  pairingCode: 'ABCD-1234'
});

assert.equal(
  validateLiveEvent(validCode, sessionId)
    .payload.pairingCode,
  'ABCD-1234'
);

assert.equal(
  validateLiveEvent(validCode, otherSessionId),
  null,
  'Cross-session pairing code must be rejected'
);

assert.equal(
  validateLiveEvent(
    event('PAIR_STATUS', {
      sessionId,
      status: 'UNKNOWN'
    }),
    sessionId
  ),
  null,
  'Unknown status must be rejected'
);

assert.equal(
  validateLiveEvent(
    event('PAIR_STATUS', {
      sessionId,
      status: 'READY',
      pairingCode: 'ABCD-1234'
    }),
    sessionId
  ),
  null,
  'Pairing code must not accompany READY'
);

assert.equal(
  validateLiveEvent(
    event('QR_UPDATED', {
      sessionId,
      qr: 'qr-test-value'
    }),
    sessionId
  ).type,
  'QR_UPDATED'
);

assert.equal(
  validateLiveEvent(
    event('AUTHENTICATED', {
      sessionId
    }),
    sessionId
  ).type,
  'AUTHENTICATED'
);

assert.equal(
  validateLiveEvent(
    event('PROFILE_UPDATED', {
      sessionId
    }),
    sessionId
  ),
  null,
  'Unapproved event must be rejected'
);

console.log(
  'PASS: live pairing event security tests'
);
