import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256 } from '../../../src/crypto/sha256';

function nodeSha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

describe('sha256', () => {
  it.each([
    ['empty string', ''],
    ['short input', 'abc'],
    ['55-byte padding boundary', 'a'.repeat(55)],
    ['56-byte padding boundary', 'a'.repeat(56)],
    ['63-byte padding boundary', 'a'.repeat(63)],
    ['64-byte padding boundary', 'a'.repeat(64)],
    ['65-byte padding boundary', 'a'.repeat(65)],
    ['long input', 'long-input-'.repeat(1_000)],
    ['multibyte UTF-8', 'D&D 🐉 café 日本語'],
  ])('matches node:crypto for %s', (_label, value) => {
    expect(sha256(value)).toBe(nodeSha256(value));
  });

  it('has a negative control that the oracle comparison rejects', () => {
    expect(sha256('negative control')).not.toBe(
      nodeSha256('different input'),
    );
  });
});
