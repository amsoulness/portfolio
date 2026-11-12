'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  validateImage
} = require('./whatsapp-image-validator');

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-images-')
  );

  try {
    const png = path.join(dir, 'photo.png');

    fs.writeFileSync(
      png,
      Buffer.from(
        '89504e470d0a1a0a',
        'hex'
      )
    );

    const valid = await validateImage(png, dir);

    assert.equal(valid.format, 'PNG');

    console.log('PNG signature recognized: PASSED');

    const fake = path.join(dir, 'fake.png');

    fs.writeFileSync(fake, 'not an image');

    await assert.rejects(
      validateImage(fake, dir),
      /Invalid image file signature/
    );

    console.log('Fake image rejected: PASSED');

    const mismatch = path.join(dir, 'wrong.jpg');

    fs.writeFileSync(
      mismatch,
      Buffer.from(
        '89504e470d0a1a0a',
        'hex'
      )
    );

    await assert.rejects(
      validateImage(mismatch, dir),
      /does not match format/
    );

    console.log('Extension mismatch rejected: PASSED');

    const link = path.join(dir, 'linked.png');

    fs.symlinkSync(png, link);

    await assert.rejects(
      validateImage(link, dir),
      /Symbolic links are not allowed/
    );

    console.log('Symlink rejected: PASSED');

    console.log(
      '\nIMAGE VALIDATOR TEST PASSED — Step 113D.3C.53'
    );
  } finally {
    fs.rmSync(dir, {
      recursive: true,
      force: true
    });
  }
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  process.exitCode = 1;
});
