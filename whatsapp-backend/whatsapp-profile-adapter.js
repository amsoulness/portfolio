'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const sharp = require('sharp');

const {
  MessageMedia
} = require('whatsapp-web.js');

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const UPLOAD_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

function createProfileAdapter(client, options = {}) {
  if (
    !client ||
    typeof client.setProfilePicture !== 'function' ||
    typeof client.getState !== 'function'
  ) {
    throw new Error('Invalid WhatsApp client');
  }

  const uploadDirectory = path.resolve(
    options.uploadDirectory ||
    path.join(__dirname, 'uploads')
  );

  let updating = false;

  async function updateProfilePicture(imagePath) {
    if (updating) {
      throw new Error('Profile update already in progress');
    }

    updating = true;

    try {
      if (
        typeof imagePath !== 'string' ||
        !path.isAbsolute(imagePath)
      ) {
        throw new Error('Absolute image path required');
      }

      const resolved = path.resolve(imagePath);
      const relative = path.relative(
        uploadDirectory,
        resolved
      );

      if (
        !relative ||
        relative === '..' ||
        relative.startsWith('..' + path.sep) ||
        path.isAbsolute(relative)
      ) {
        throw new Error('Image outside upload directory');
      }

      if (
        !UPLOAD_FILENAME_PATTERN.test(
          path.basename(resolved)
        ) ||
        path.dirname(resolved) !== uploadDirectory
      ) {
        throw new Error(
          'Image must be a backend-managed upload'
        );
      }

      const handle = await fs.open(
        resolved,
        constants.O_RDONLY | constants.O_NOFOLLOW
      );

      let imageBytes;

      try {
        const stat = await handle.stat();

        if (
          !stat.isFile() ||
          stat.size === 0 ||
          stat.size > MAX_IMAGE_BYTES
        ) {
          throw new Error('Invalid image size');
        }

        imageBytes = await handle.readFile();

        if (
          imageBytes.length !== stat.size ||
          imageBytes.length > MAX_IMAGE_BYTES
        ) {
          throw new Error('Image changed during reading');
        }
      } finally {
        await handle.close();
      }

      const metadata = await sharp(imageBytes, {
        limitInputPixels: 40000000
      }).metadata();

      if (
        !['jpeg', 'png', 'webp'].includes(
          metadata.format
        )
      ) {
        throw new Error('Unsupported image format');
      }

      const state = await client.getState();

      if (state !== 'CONNECTED') {
        throw new Error(
          'WhatsApp client is not connected'
        );
      }

      const jpeg = await sharp(imageBytes, {
        limitInputPixels: 40000000
      })
        .rotate()
        .resize(640, 640, {
          fit: 'cover',
          position: 'centre'
        })
        .jpeg({
          quality: 88,
          mozjpeg: true
        })
        .toBuffer();

      const media = new MessageMedia(
        'image/jpeg',
        jpeg.toString('base64'),
        'profile.jpg'
      );

      const result =
        await client.setProfilePicture(media);

      if (result === false) {
        throw new Error(
          'WhatsApp rejected profile picture update'
        );
      }

      return {
        success: true,
        message: 'Profile picture updated',
        format: 'jpeg',
        width: 640,
        height: 640
      };
    } finally {
      updating = false;
    }
  }

  return {
    updateProfilePicture
  };
}

module.exports = {
  createProfileAdapter
};
