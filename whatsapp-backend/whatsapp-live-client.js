'use strict';

const {
  createWhatsAppClient
} = require('./pairing');

const {
  assertLiveEnabled
} = require('./whatsapp-live-config');

function createLiveWhatsAppClient(
  sessionId,
  phoneNumber,
  onEvent
) {
  assertLiveEnabled();

  const client = createWhatsAppClient(
    sessionId,
    phoneNumber
  );

  client.on('qr', qr => {
    onEvent('QR_UPDATED', {
      sessionId,
      qr
    });
  });

  client.on('code', code => {
    onEvent('PAIR_STATUS', {
      sessionId,
      status: 'CODE_READY',
      pairingCode: code
    });
  });

  client.on('authenticated', () => {
    onEvent('AUTHENTICATED', {
      sessionId
    });
  });

  client.on('ready', () => {
    onEvent('PAIR_STATUS', {
      sessionId,
      status: 'READY'
    });
  });

  client.on('auth_failure', () => {
    onEvent('PAIR_STATUS', {
      sessionId,
      status: 'AUTH_FAILED'
    });
  });

  client.on('disconnected', () => {
    onEvent('PAIR_STATUS', {
      sessionId,
      status: 'DISCONNECTED'
    });
  });

  return client;
}

module.exports = {
  createLiveWhatsAppClient
};
