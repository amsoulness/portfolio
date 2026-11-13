'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { prepareImage, MAX_BYTES } = require('../image');
const { sendPicture } = require('../transport');

for (const [width, height] of [[900, 600], [600, 900], [700, 700], [2400, 120], [120, 2400]]) {
  test(`preserves all image edges and proportions for ${width}x${height}`, async () => {
    // Four differently colored edges make accidental center crops detectable.
    const rgb = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      const color = x < width / 4 ? [240, 10, 10] : x > width * .75 ? [10, 240, 10] : y < height / 4 ? [10, 10, 240] : [240, 240, 10];
      rgb.set(color, offset);
    }
    const source = await sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer();
    const image = await prepareImage(source);
    for (const key of ['picture', 'thumbnail']) {
      const bytes = Buffer.from(image[key].split(',')[1], 'base64');
      const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
      const limit = key === 'picture' ? 640 : 96;
      assert.ok(info.width <= limit && info.height <= limit);
      assert.ok(Math.abs(info.width - info.height * width / height) <= width / height + 1);
      const pixel = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
      assert.ok(pixel(0, Math.floor(info.height / 2))[0] > 180, 'left red edge retained');
      assert.ok(pixel(info.width - 1, Math.floor(info.height / 2))[1] > 180, 'right green edge retained');
      assert.ok(pixel(Math.floor(info.width / 2), 0)[2] > 150, 'top blue edge retained');
      const bottom = pixel(Math.floor(info.width / 2), info.height - 1);
      assert.ok(bottom[0] > 180 && bottom[1] > 180, 'bottom yellow edge retained');
    }
  });
}

test('honors EXIF orientation, does not enlarge, and flattens transparency', async () => {
  const bytes = await sharp({ create: { width: 120, height: 60, channels: 4, background: '#00000000' } }).png().withMetadata({ orientation: 6 }).toBuffer();
  const output = await prepareImage(bytes);
  assert.equal(output.width, 60);
  assert.equal(output.height, 120);
  const { data } = await sharp(Buffer.from(output.picture.split(',')[1], 'base64')).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 245 && data[1] > 245 && data[2] > 245);
});

test('rejects unsupported, corrupt and oversized images', async () => {
  await assert.rejects(prepareImage(Buffer.from('<svg></svg>')));
  await assert.rejects(prepareImage(Buffer.from('not an image')));
  await assert.rejects(prepareImage(Buffer.alloc(MAX_BYTES + 1)));
  const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).gif().toBuffer();
  await assert.rejects(prepareImage(gif), /still JPG/);
});

test('transport sends the complete rectangular JPEG with matching dimensions', async () => {
  const source = await sharp({ create: { width: 300, height: 100, channels: 3, background: '#336699' } }).png().toBuffer();
  const image = await prepareImage(source);
  let received;
  const client = { async updateProfilePicture(...args) { received = args; } };
  assert.equal(await sendPicture(client, image), true);
  assert.deepEqual(received, [Buffer.from(image.picture.split(',')[1], 'base64'), { width: 300, height: 100 }]);
  assert.equal(await sendPicture(client, { ...image, picture: 'bad' }), false);
  await assert.rejects(sendPicture({}, image), /unavailable/);
});
