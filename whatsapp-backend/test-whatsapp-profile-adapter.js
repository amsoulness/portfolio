'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createProfileAdapter
} = require('./whatsapp-profile-adapter');

async function main() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'aslns-profile-')
  );

  const imagePath = path.join(dir, '11111111-1111-4111-8111-111111111111.png');

  // Generate a valid PNG fixture using Sharp.
  await require('sharp')({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: '#336699'
    }
  })
    .png()
    .toFile(imagePath);

  let called = false;

  const client = {
    async getState() {
      return 'CONNECTED';
    },

    async setProfilePicture(media) {
      assert.ok(media);
      called = true;
      return true;
    }
  };

  try {
    const adapter = createProfileAdapter(client, {
      uploadDirectory: dir
    });

    const result = await adapter.updateProfilePicture(
      imagePath
    );

    assert.equal(result.success, true);
    assert.equal(called, true);

    console.log('Profile update adapter: PASSED');

    await assert.rejects(
      adapter.updateProfilePicture('/etc/passwd'),
      /upload directory/
    );

    console.log('Outside-directory path blocked: PASSED');

    await assert.rejects(
      adapter.updateProfilePicture(
        path.join(dir, '33333333-3333-4333-8333-333333333333.png')
      ),
      /ENOENT/
    );

    console.log('Missing image rejected: PASSED');

    console.log(
      '\nPROFILE ADAPTER TEST PASSED — Step 113D.3C.52'
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
