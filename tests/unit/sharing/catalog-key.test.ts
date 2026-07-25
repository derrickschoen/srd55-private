import { describe, expect, it } from 'vitest';
import {
  homebrewSpellKey,
  isSpellVersionKey,
  normalizeCatalogKeyComponent,
  officialSpellKey,
} from '../../../src/catalog/catalog-key';

describe('catalog spell keys', () => {
  it('normalizes official keys to lowercase ASCII slugs', () => {
    expect(normalizeCatalogKeyComponent('  Melf’s Acid Arrow! ')).toBe(
      'melf-s-acid-arrow',
    );
    expect(officialSpellKey('2024', 'Misty Step')).toBe(
      '2024:misty-step',
    );
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
});

