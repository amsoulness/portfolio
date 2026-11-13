'use strict';

// Pass the prepared image dimensions so the client library preserves its aspect ratio.
async function sendPicture(client, image) {
  if (typeof client?.updateProfilePicture !== 'function') {
    throw new Error('WhatsApp profile transport is unavailable');
  }
  if (typeof image?.picture !== 'string' || !image.picture.startsWith('data:image/jpeg;base64,')) return false;
  const bytes = Buffer.from(image.picture.slice('data:image/jpeg;base64,'.length), 'base64');
  if (!bytes.length || !Number.isInteger(image.width) || !Number.isInteger(image.height)) return false;
  await client.updateProfilePicture(bytes, { width: image.width, height: image.height });
  return true;
}

module.exports = { sendPicture };
