import { expect } from 'vitest';

/**
 * Byte-for-byte equality of two database images.
 *
 * This exists for SPEED, and the speed is not a micro-optimisation.
 * `expect(actual).toEqual(expected)` on two `Uint8Array`s walks them through
 * the generic structural-equality machinery one indexed property at a time.
 * A database image in this project is ~2.1 MB, and one such comparison costs
 * ~3.8 seconds — measured, not guessed: in the 37-prefix normal-boot loop it
 * accounted for 140.5s of the test's 146s.
 *
 * What is proved is unchanged. `toEqual` on two `Uint8Array`s asserts the same
 * length and the same byte at every offset; so does this, and the parameter
 * types make passing anything that is not a `Uint8Array` a compile error rather
 * than a runtime comparison. A mismatch reports the first differing offset and
 * both byte values, which the structural diff did not.
 */
export function expectIdenticalDatabaseImages(
  actual: Uint8Array,
  expected: Uint8Array,
  label: string,
): void {
  expect(actual.byteLength, `${label}: image length`).toBe(expected.byteLength);

  let firstDifference = -1;
  for (let offset = 0; offset < expected.byteLength; offset += 1) {
    if (actual[offset] !== expected[offset]) {
      firstDifference = offset;
      break;
    }
  }

  if (firstDifference !== -1) {
    expect.fail(
      `${label}: images differ at byte ${String(firstDifference)} ` +
        `(expected ${String(expected[firstDifference])}, ` +
        `got ${String(actual[firstDifference])}).`,
    );
  }
}
