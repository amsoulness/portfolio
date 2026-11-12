'use strict';

const { validateMessage } = require(
  './whatsapp-ipc-protocol'
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_EVENTS = new Set([
  'PAIR_STATUS',
  'QR_UPDATED',
  'AUTHENTICATED'
]);

const ALLOWED_STATUSES = new Set([
  'INITIALIZING',
  'PAIRING',
  'CODE_READY',
  'READY',
  'AUTH_FAILED',
  'DISCONNECTED',
  'INITIALIZATION_FAILED'
]);

function validateLiveEvent(message, expectedSessionId) {
  if (
    !UUID_PATTERN.test(expectedSessionId) ||
    !message ||
    typeof message !== 'object' ||
    !ALLOWED_EVENTS.has(message.type)
  ) {
    return null;
  }

  try {
    validateMessage(message);
  } catch {
    return null;
  }

  const payload = message.payload;

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    payload.sessionId !== expectedSessionId
  ) {
    return null;
  }

  if (message.type === 'PAIR_STATUS') {
    if (!ALLOWED_STATUSES.has(payload.status)) {
      return null;
    }

    if (
      payload.pairingCode !== undefined &&
      (
        payload.status !== 'CODE_READY' ||
        typeof payload.pairingCode !== 'string' ||
        !/^[A-Za-z0-9-]{4,32}$/.test(
          payload.pairingCode
        )
      )
    ) {
      return null;
    }
  }

  if (message.type === 'QR_UPDATED') {
    if (
      typeof payload.qr !== 'string' ||
      payload.qr.length < 1 ||
      payload.qr.length > 8192
    ) {
      return null;
    }
  }

  return {
    type: message.type,
    payload
  };
}

module.exports = {
  validateLiveEvent
};
