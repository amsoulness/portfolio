'use strict';
const sharp = require('sharp');

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

async function prepareImage(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES) {
    throw new Error('Choose an image smaller than 20 MB.');
  }
  const metadata = await sharp(bytes, { limitInputPixels: MAX_PIXELS }).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
    throw new Error('Choose a still JPG, PNG, or WebP image.');
  }
  // WhatsApp accepts JPEG payloads. Preserve the full oriented image; never crop,
  // stretch, or add a square canvas. Transparency is flattened onto white.
  const image = () => sharp(bytes, { limitInputPixels: MAX_PIXELS }).rotate().flatten({ background: '#fff' });
  const { data, info } = await image()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer({ resolveWithObject: true });
  const thumbnail = await image()
    .resize({ width: 96, height: 96, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  return {
    picture: 'data:image/jpeg;base64,' + data.toString('base64'),
    thumbnail: 'data:image/jpeg;base64,' + thumbnail.toString('base64'),
    width: info.width, height: info.height
  };
}

module.exports = { prepareImage, MAX_BYTES };
