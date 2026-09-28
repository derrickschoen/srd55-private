import { describe, expect, it } from 'vitest';
import { bundledContentManifestV1 } from '../../../src/catalog/bundled-content-registry-v1';
import {
  RecordedContentKeyError,
  recordedContentKeys,
} from '../../../src/domain/recorded-content-keys';
import { bundledArmorContentKey } from '../../../src/rules/armor-srd';
import {
  bundledBackgroundContentKey,
  bundledSpeciesContentKey,
} from '../../../src/rules/origins-srd';
import { bundledSpellContentKey } from '../../../src/rules/spells-srd';
import {
  BUNDLED_CLASS_CONTENT_KEYS,
  bundledClassContentKey,
  isBundledClassContentKey,
} from '../../../src/rules/srd-class-names';
import { bundledWeaponContentKey } from '../../../src/rules/weapons-srd';

/**
 * EVERY BUNDLED KEY EARNS ITS `ContentKey` BRAND BY MEMBERSHIP in the keys the
 * build recorded (fix round 2, P2); nothing casts one. Every present and
 * absent name below was checked against its extract by hand: the SRD prints
 * `Splint Armor` (`armor-table.txt:24`), not "Splint Mail"; it has no Katana
 * (`weapons-table.txt`); Aasimar is not an SRD 5.2.1 species
 * (`species-descriptions.txt` header); it licenses four backgrounds, Acolyte,
 * Criminal, Sage and Soldier (`backgrounds.txt` header); Chronal Shift is not
 * among its spells (`spell-descriptions.txt`); Artificer is not a class.
 */
describe('the recorded-key constructor', () => {
  const keys = recordedContentKeys('probe', ['2024:alpha', '2024:beta']);

  it('mints a recorded key, keeping its text', () => {
    expect(keys.key('2024:beta')).toBe('2024:beta');
    expect(keys.keys).toEqual(['2024:alpha', '2024:beta']);
    expect(Object.isFrozen(keys.keys)).toBe(true);
  });

  it('refuses text the build did not record, naming the kind', () => {
    expect(keys.has('2024:gamma')).toBe(false);
    expect(() => keys.key('2024:gamma')).toThrow(
      new RecordedContentKeyError('2024:gamma is not a bundled probe content key.'),
    );
  });

  it('refuses a recorded set that repeats a key', () => {
    expect(() => recordedContentKeys('probe', ['2024:alpha', '2024:alpha'])).toThrow(
      new RecordedContentKeyError('the bundled probe content keys repeat a key.'),
    );
  });
});

describe('each bundled kind mints only the keys its artifact records', () => {
  it.each([
    ['spell', bundledSpellContentKey, '2024:acid-arrow', '2024:chronal-shift'],
    ['weapon', bundledWeaponContentKey, '2024:weapon:longsword', '2024:weapon:katana'],
    ['armor', bundledArmorContentKey, '2024:armor:splint-armor', '2024:armor:splint-mail'],
    ['species', bundledSpeciesContentKey, '2024:species:tiefling', '2024:species:aasimar'],
    ['background', bundledBackgroundContentKey, '2024:background:sage', '2024:background:noble'],
    ['class', bundledClassContentKey, '2024:class:bard', '2024:class:artificer'],
  ] as const)('%s', (kind, mint, printed, absent) => {
    expect(mint(printed)).toBe(printed);
    expect(() => mint(absent)).toThrow(
      new RecordedContentKeyError(`${absent} is not a bundled ${kind} content key.`),
    );
  });

  it('the class keys are the twelve SRD classes, lower-cased', () => {
    expect(BUNDLED_CLASS_CONTENT_KEYS).toEqual([
      '2024:class:barbarian', '2024:class:bard', '2024:class:cleric',
      '2024:class:druid', '2024:class:fighter', '2024:class:monk',
      '2024:class:paladin', '2024:class:ranger', '2024:class:rogue',
      '2024:class:sorcerer', '2024:class:warlock', '2024:class:wizard',
    ]);
    expect(isBundledClassContentKey('2024:class:Bard')).toBe(false);
  });
});

describe('the bundled registry manifest', () => {
  const manifest = bundledContentManifestV1();
  const keysOf = (kind: string): readonly string[] =>
    manifest.filter((entry) => entry.kind === kind).map((entry) => entry.contentKey);

  it('holds the nine SRD species and the four SRD backgrounds, definitions and templates as one key each', () => {
    expect(keysOf('species')).toEqual([
      '2024:species:dragonborn', '2024:species:dwarf', '2024:species:elf',
      '2024:species:gnome', '2024:species:goliath', '2024:species:halfling',
      '2024:species:human', '2024:species:orc', '2024:species:tiefling',
    ]);
    expect(keysOf('background')).toEqual([
      '2024:background:acolyte', '2024:background:criminal',
      '2024:background:sage', '2024:background:soldier',
    ]);
  });

  it('holds thirteen armour rows (twelve armours and Shield) and the thirty-eight weapons', () => {
    expect(keysOf('armor')).toHaveLength(13);
    expect(keysOf('armor')).toContain('2024:armor:shield');
    expect(keysOf('weapon')).toHaveLength(38);
    expect(keysOf('class')).toHaveLength(12);
  });
});
