import { describe, expect, it } from 'vitest';
import {
  AssertedContentOwnerNamespaceError,
  CatalogKeyComponentEmptyError,
  assertedExternalContentKey,
  homebrewSpellKey,
  isSpellVersionKey,
  normalizeCatalogKeyComponent,
  officialSpellKey,
} from '../../../src/catalog/catalog-key';

function refusal(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a refusal, but the call returned.');
}

describe('catalog spell keys', () => {
  it('normalizes official keys to lowercase ASCII slugs', () => {
    expect(normalizeCatalogKeyComponent('  Melf’s Acid Arrow! ')).toBe(
      'melf-s-acid-arrow',
    );
    expect(officialSpellKey('2024', 'Misty Step')).toBe(
      '2024:misty-step',
    );
    const error = refusal(() => normalizeCatalogKeyComponent('—'));
    expect(error).toBeInstanceOf(CatalogKeyComponentEmptyError);
    expect(error).toMatchObject({});
  });

  it('requires a registered reverse-DNS owner for homebrew keys', () => {
    const owners = new Set(['com.example.spells']);
    expect(
      homebrewSpellKey(
        '2024',
        'COM.Example.Spells',
        'Starward Aegis',
        owners,
      ),
    ).toBe('2024:com.example.spells:starward-aegis');
    expect(() =>
      homebrewSpellKey('2024', 'aria', 'Aegis', owners),
    ).toThrow(/not registered/);
    expect(() =>
      homebrewSpellKey('2024', 'org.unknown', 'Aegis', owners),
    ).toThrow(/not registered/);
  });

  it('validates without rewriting existing keys', () => {
    expect(isSpellVersionKey('2024:shield')).toBe(true);
    expect(
      isSpellVersionKey('2024:com.example.spells:shield'),
    ).toBe(true);
    expect(isSpellVersionKey('2024:Aria:Shield')).toBe(false);
    expect(isSpellVersionKey('2024::shield')).toBe(false);
  });

  it('tags malformed asserted owner namespaces with the normalized value', () => {
    const error = refusal(() =>
      assertedExternalContentKey('feat', '2024', 'Fixture', 'invalid'));
    expect(error).toBeInstanceOf(AssertedContentOwnerNamespaceError);
    expect(error).toMatchObject({ owner_namespace: 'invalid' });
  });
});
