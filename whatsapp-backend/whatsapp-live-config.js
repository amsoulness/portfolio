'use strict';

const LIVE_ENABLED =
  process.env.ASLNS_ENABLE_LIVE_WHATSAPP === 'true';

function assertLiveEnabled() {
  if (!LIVE_ENABLED) {
    throw new Error(
      'Live WhatsApp authentication is disabled'
    );
  }
}

module.exports = {
  LIVE_ENABLED,
  assertLiveEnabled
};
