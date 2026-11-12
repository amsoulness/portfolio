'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function validateImage(imagePath, uploadDirectory) {
  if (
    typeof imagePath !== 'string' ||
    !path.isAbsolute(imagePath)
  ) {
    throw new Error('Absolute image path required');
  }

  const root = await fs.realpath(uploadDirectory);
  const resolved = path.resolve(imagePath);
  const relative = path.relative(root, resolved);

  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith('..' + path.sep) ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Image outside upload directory');
  }

  const stat = await fs.lstat(resolved);

  if (stat.isSymbolicLink()) {
    throw new Error('Symbolic links are not allowed');
  }

  if (!stat.isFile()) {
    throw new Error('Image is not a regular file');
  }

  if (
    stat.size === 0 ||
    stat.size > MAX_IMAGE_BYTES
  ) {
    throw new Error('Invalid image size');
  }

  const ext = path.extname(resolved).toLowerCase();

  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    throw new Error('Unsupported image extension');
  }

  const handle = await fs.open(
    resolved,
    fs.constants.O_RDONLY |
    (fs.constants.O_NOFOLLOW || 0)
  );

  try {
    const buffer = Buffer.alloc(32);

    const { bytesRead } = await handle.read(
      buffer,
      0,
      buffer.length,
      0
    );

    const header = buffer.subarray(0, bytesRead);

    const png =
      header.length >= 8 &&
      header.subarray(0, 8).equals(
        Buffer.from('89504e470d0a1a0a', 'hex')
      );

    const jpeg =
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff;

    if (!png && !jpeg) {
      throw new Error('Invalid image file signature');
    }

    if (
      (ext === '.png' && !png) ||
      (ext !== '.png' && !jpeg)
    ) {
      throw new Error('Image extension does not match format');
    }

    return {
      path: resolved,
      format: png ? 'PNG' : 'JPEG',
      size: stat.size
    };
  } finally {
    await handle.close();
  }
}

module.exports = {
  validateImage
};
