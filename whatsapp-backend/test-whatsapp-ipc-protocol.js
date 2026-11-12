'use strict';

const assert = require('node:assert/strict');

const {
  PROTOCOL_VERSION,
  COMMANDS,
  EVENTS,
  createMessage,
  validateMessage
} = require('./whatsapp-ipc-protocol');

const message = createMessage('PING', {
  source: 'backend'
});

assert.equal(message.version, PROTOCOL_VERSION);
assert.equal(message.type, 'PING');

assert.equal(
  validateMessage(message),
  message
);

assert.ok(COMMANDS.includes('PAIR_START'));
assert.ok(EVENTS.includes('AUTHENTICATED'));

assert.throws(
  () => createMessage('UNKNOWN'),
  /Unknown IPC message type/
);

assert.throws(
  () => createMessage('PING', []),
  /payload must be an object/
);

assert.throws(
  () => validateMessage({
    ...message,
    version: 999
  }),
  /Unsupported IPC protocol version/
);

assert.throws(
  () => validateMessage({
    ...message,
    requestId: 'invalid'
  }),
  /Invalid IPC request ID/
);

assert.throws(
  () => validateMessage(
    message,
    new Set(['SHUTDOWN'])
  ),
  /Invalid IPC message type/
);

console.log('Message creation: PASSED');
console.log('Protocol validation: PASSED');
console.log('Invalid messages rejected: PASSED');
console.log('Command/event definitions: PASSED');

console.log(
  '\nIPC PROTOCOL TEST PASSED — Step 113D.3C.45'
);
