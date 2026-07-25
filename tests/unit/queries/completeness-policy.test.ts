import { expect, it } from 'vitest';
import { slotBuckets } from '../../../src/domain/enums';
import { reportsUnderFill } from '../../../src/queries/character-completeness';

it('reports partial under-fill only for permanent buckets and never for an unknown one', () => {
  expect(
    slotBuckets.map((bucket) => [
      bucket,
      reportsUnderFill(bucket, 1, 3),
      reportsUnderFill(bucket, 3, 3),
    ]),
  ).toEqual([
    ['cantrip_known', true, true],
    ['prepared', false, true],
    ['known', true, true],
    ['spellbook', true, true],
    ['automatic', false, false],
  ]);
  expect(reportsUnderFill('homebrew_bucket', 1, 3)).toBe(false);
  expect(reportsUnderFill('homebrew_bucket', 3, 3)).toBe(false);
});
