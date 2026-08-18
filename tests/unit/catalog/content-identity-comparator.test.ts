import { describe, expect, it } from 'vitest';
import { compareUnicodeCodePoints } from '../../../src/catalog/content-identity';

function compareUnicodeCodePointsOracle(left: string, right: string): number {
  const leftCodePoints = Array.from(left, (value) => value.codePointAt(0)!);
  const rightCodePoints = Array.from(right, (value) => value.codePointAt(0)!);
  const length = Math.min(leftCodePoints.length, rightCodePoints.length);

  for (let index = 0; index < length; index += 1) {
    const difference = leftCodePoints[index]! - rightCodePoints[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  return leftCodePoints.length - rightCodePoints.length;
}

function generatedComparatorCorpus(): readonly string[] {
  const tokenGroups = [
    ['a', 'Z', '0', '_', '-', '\u0000', '\u007F'],
    ['À', 'é', 'ß', 'ÿ', '\u0080', '\u00FF'],
    ['一', '中', '日', '本', '語', '\u9FFF'],
    ['\u0300', '\u0301', '\u0327', '\u036F'],
    ['😀', '🚀', '\u{10000}', '\u{10400}', '\u{1F9D9}'],
    ['\uD7FF', '\uE000', '\uFFFF', '\uD800', '\uDBFF', '\uDC00', '\uDFFF'],
  ] as const;
  const fixed = [
    '',
    'ascii',
    'café',
    '日本語',
    'e\u0301',
    '😀',
    '🚀 launch',
    '\u{10000}',
    '\u{10400}',
    '\uE000',
    '\uD800',
    '\uDC00',
    '\uD800a',
    'a\uDC00',
  ];
  let state = 0x6D2B79F5;
  const randomIndex = (length: number): number => {
    state = Math.imul(state ^ state >>> 15, state | 1);
    state ^= state + Math.imul(state ^ state >>> 7, state | 61);
    return ((state ^ state >>> 14) >>> 0) % length;
  };
  const generated = Array.from({ length: 640 }, (_, sample) => {
    const tokenCount = 1 + randomIndex(7);
    let value = '';
    for (let token = 0; token < tokenCount; token += 1) {
      const group = tokenGroups[(sample + token) % tokenGroups.length]!;
      value += group[randomIndex(group.length)];
    }
    return value;
  });

  return [...new Set([...fixed, ...generated])];
}

describe('canonical JSON key comparator', () => {
  it('preserves code-point ordering for every pair in a mixed Unicode corpus', () => {
    const corpus = generatedComparatorCorpus();
    expect(corpus.length).toBeGreaterThanOrEqual(500);

    for (const left of corpus) {
      for (const right of corpus) {
        expect(Math.sign(compareUnicodeCodePoints(left, right))).toBe(
          Math.sign(compareUnicodeCodePointsOracle(left, right)),
        );
      }
    }
  });
});
