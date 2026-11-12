'use strict';

const { validateCommand } =
  require('./whatsapp-ipc-payloads');

const SESSION_COMMANDS = new Set([
  'PAIR_START',
  'PAIR_CANCEL',
  'PROFILE_UPDATE',
  'LOGOUT'
]);

function createSessionGuard(sessionId) {
  if (
    typeof sessionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)
  ) {
    throw new Error('Invalid worker session ID');
  }

  function authorize(message) {
    validateCommand(message);

    if (
      SESSION_COMMANDS.has(message.type) &&
      message.payload.sessionId !== sessionId
    ) {
      throw new Error(
        'IPC command targets a different session'
      );
    }

    return message;
  }

  return Object.freeze({
    authorize
  });
}

module.exports = {
  createSessionGuard
};
