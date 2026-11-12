'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');

const {
  createProfileAdapter
} = require('./whatsapp-profile-adapter');

async function main() {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'aslns-processing-')
  );

  try {
    const source = path.join(dir, '22222222-2222-4222-8222-222222222222.webp');

    await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 3,
        background: '#336699'
      }
    })
      .webp()
      .toFile(source);

    let received = false;

    const client = {
      async getState() {
        return 'CONNECTED';
      },

      async setProfilePicture(media) {
        assert.equal(media.mimetype, 'image/jpeg');

        const output = Buffer.from(
          media.data,
          'base64'
        );

        const metadata = await sharp(output).metadata();

        assert.equal(metadata.format, 'jpeg');
        assert.equal(metadata.width, 640);
        assert.equal(metadata.height, 640);

        received = true;
        return true;
      }
    };

    const adapter = createProfileAdapter(client, {
      uploadDirectory: dir
    });

    const result =
      await adapter.updateProfilePicture(source);

    assert.equal(result.success, true);
    assert.equal(received, true);

    console.log('WebP to JPEG conversion: PASSED');
    console.log('640x640 square crop: PASSED');
    console.log('WhatsApp media creation: PASSED');

    const disconnected = createProfileAdapter({
      async getState() {
        return 'DISCONNECTED';
      },
      async setProfilePicture() {
        throw new Error('Should not be called');
      }
    }, {
      uploadDirectory: dir
    });

    await assert.rejects(
      disconnected.updateProfilePicture(source),
      /not connected/
    );

    console.log('Disconnected client blocked: PASSED');

    console.log(
      '\nPROFILE PROCESSING TEST PASSED — Step 113D.3C.58'
    );
  } finally {
    await fs.rm(dir, {
      recursive: true,
      force: true
    });
  }
}

main().catch(error => {
  console.error('TEST FAILED:', error.stack);
  process.exitCode = 1;
});
