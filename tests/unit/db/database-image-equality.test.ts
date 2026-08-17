import { describe, expect, it } from 'vitest';
import {
  expectIdenticalDatabaseImages,
} from '../../helpers/database-image-equality';

/**
 * `expectIdenticalDatabaseImages` replaced `expect(bytes).toEqual(bytes)` in
 * the schema-prefix boot tests because the structural walk cost 3.8s per 2.1MB
 * image. A faster assertion is worth nothing unless it still FAILS on a wrong
 * image, so this proves it fails on each way two images can differ: a wrong
 * byte anywhere in the buffer, and a wrong length with an identical prefix.
 */
describe('database image equality', () => {
  const image = Uint8Array.from([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65]);

  it('accepts a distinct buffer holding identical bytes', () => {
    expectIdenticalDatabaseImages(image.slice(), image, 'identical');
  });

  it('rejects a single wrong byte at every offset', () => {
    for (let offset = 0; offset < image.byteLength; offset += 1) {
      const mutated = image.slice();
      mutated[offset] = (image[offset]! + 1) % 256;
      expect(
        () => expectIdenticalDatabaseImages(mutated, image, 'mutated'),
        `offset ${String(offset)}`,
      ).toThrow(`mutated: images differ at byte ${String(offset)}`);
    }
  });

  it('rejects a truncated image whose surviving bytes all match', () => {
    expect(
      () => expectIdenticalDatabaseImages(image.slice(0, 5), image, 'short'),
    ).toThrow('short: image length');
  });

  it('rejects an extended image whose leading bytes all match', () => {
    const longer = new Uint8Array(image.byteLength + 1);
    longer.set(image);
    expect(
      () => expectIdenticalDatabaseImages(longer, image, 'long'),
    ).toThrow('long: image length');
  });
});
