'use strict';

// whatsapp-web.js's public setProfilePicture() always crops to a square.
// Send our already-prepared, uncropped images through the same underlying API.
// Keep this compatibility boundary isolated and fail rather than silently crop.
async function sendPicture(client, { picture, thumbnail }) {
  const id = client.info?.wid?._serialized;
  if (!id || typeof client.pupPage?.evaluate !== 'function') {
    throw new Error('WhatsApp profile transport is unavailable');
  }
  return client.pupPage.evaluate(async (chatId, thumb, full) => {
    const wid = window.require('WAWebWidFactory').createWid(chatId);
    const collection = window.require('WAWebCollections').ProfilePicThumb;
    const profile = collection.get(chatId) || await collection.find(chatId);
    if (!profile?.canSet()) return false;
    try {
      const result = await window.require('WAWebContactProfilePicThumbBridge')
        .sendSetPicture(wid, thumb, full);
      return result?.status === 200;
    } catch (error) {
      if (error.name === 'ServerStatusCodeError') return false;
      throw error;
    }
  }, id, thumbnail, picture);
}

module.exports = { sendPicture };
