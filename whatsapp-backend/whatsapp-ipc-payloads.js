'use strict';

const {
  validateMessage
} = require('./whatsapp-ipc-protocol');

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const PHONE_PATTERN = /^[1-9][0-9]{7,14}$/;

const COMMANDS = new Set([
  'PING',
  'SHUTDOWN',
  'PAIR_START',
  'PAIR_CANCEL',
  'PROFILE_UPDATE',
  'LOGOUT'
]);

function requireSessionId(payload) {
  if (
    typeof payload.sessionId !== 'string' ||
    !SESSION_ID_PATTERN.test(payload.sessionId)
  ) {
    throw new Error('Invalid session ID');
  }
}

function validateCommand(message) {
  validateMessage(message, COMMANDS);

  const { type, payload } = message;

  switch (type) {
    case 'PING':
    case 'SHUTDOWN':
      if (Object.keys(payload).length !== 0) {
        throw new Error(
          `${type} does not accept a payload`
        );
      }
      break;

    case 'PAIR_START':
      requireSessionId(payload);

      if (payload.consent !== true) {
        throw new Error(
          'Account-owner consent is required'
        );
      }

      if (
        typeof payload.phoneNumber !== 'string' ||
        !PHONE_PATTERN.test(payload.phoneNumber)
      ) {
        throw new Error('Invalid phone number');
      }
      break;

    case 'PAIR_CANCEL':
    case 'LOGOUT':
      requireSessionId(payload);
      break;

    case 'PROFILE_UPDATE':
      requireSessionId(payload);

      if (
        typeof payload.imagePath !== 'string' ||
        payload.imagePath.length === 0 ||
        payload.imagePath.length > 4096
      ) {
        throw new Error('Invalid image path');
      }
      break;

    default:
      throw new Error('Unsupported command');
  }

  return message;
}

module.exports = {
  validateCommand
};
