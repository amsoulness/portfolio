'use strict';

const { randomUUID } = require('node:crypto');

const PROTOCOL_VERSION = 1;

const COMMANDS = Object.freeze([
  'PING',
  'SHUTDOWN',
  'PAIR_START',
  'PAIR_CANCEL',
  'PROFILE_UPDATE',
  'LOGOUT'
]);

const EVENTS = Object.freeze([
  'WORKER_READY',
  'PONG',
  'SHUTDOWN_COMPLETE',
  'PAIR_STATUS',
  'PAIR_ERROR',
  'QR_UPDATED',
  'AUTHENTICATED',
  'PROFILE_UPDATED',
  'LOGOUT_COMPLETE'
]);

const ALL_TYPES = new Set([
  ...COMMANDS,
  ...EVENTS
]);

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function createMessage(type, payload = {}, requestId) {
  if (!ALL_TYPES.has(type)) {
    throw new Error('Unknown IPC message type');
  }

  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error('IPC payload must be an object');
  }

  const id = requestId ?? randomUUID();

  if (
    typeof id !== 'string' ||
    !REQUEST_ID_PATTERN.test(id)
  ) {
    throw new Error('Invalid IPC request ID');
  }

  return {
    version: PROTOCOL_VERSION,
    type,
    requestId: id,
    payload
  };
}

function validateMessage(message, allowedTypes = ALL_TYPES) {
  if (
    !message ||
    typeof message !== 'object' ||
    Array.isArray(message)
  ) {
    throw new Error('Invalid IPC message');
  }

  if (message.version !== PROTOCOL_VERSION) {
    throw new Error('Unsupported IPC protocol version');
  }

  if (
    typeof message.type !== 'string' ||
    !ALL_TYPES.has(message.type) ||
    !allowedTypes.has(message.type)
  ) {
    throw new Error('Invalid IPC message type');
  }

  if (
    typeof message.requestId !== 'string' ||
    !REQUEST_ID_PATTERN.test(message.requestId)
  ) {
    throw new Error('Invalid IPC request ID');
  }

  if (
    !message.payload ||
    typeof message.payload !== 'object' ||
    Array.isArray(message.payload)
  ) {
    throw new Error('Invalid IPC payload');
  }

  return message;
}

module.exports = {
  PROTOCOL_VERSION,
  COMMANDS,
  EVENTS,
  createMessage,
  validateMessage
};
