import { describe, expect, it } from 'vitest';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import srdFullText from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import {
  decodeClassResourceFormula,
  classFormulaResourceLabel,
  classResourceLabel,
} from '../../../src/domain/class-resources';
import {
  parseSrdClassResourceFormulaManifest,
  parseSrdClassResourceManifest,
  SrdClassResourcesError,
} from '../../../src/rules/class-resources-srd';

describe('SRD class resource source parsers', () => {
  const expectedLadders = {
    Barbarian: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6],
    Cleric: [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4],
    Druid: [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
    Fighter: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    Monk: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    Paladin: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    Ranger: [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6],
    Sorcerer: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  } as const;

  it('pins all eight sourced ladders and all 160 exact level rows', () => {
    const parsed = parseSrdClassResourceManifest();
    expect(parsed.map((entry) => entry.class_name)).toEqual([
      'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
      'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
    ]);
    const ladders = parsed.flatMap((entry) => entry.ladders);
    expect(ladders).toHaveLength(8);
    expect(ladders.reduce((sum, entry) => sum + entry.maxima.length, 0)).toBe(160);
    expect(
      Object.fromEntries(ladders.map((entry) => [entry.class_name, entry.maxima])),
    ).toEqual(expectedLadders);
    expect(
      parsed.filter((entry) => entry.ladders.length === 0).map((entry) => entry.class_name),
    ).toEqual(['Bard', 'Rogue', 'Warlock', 'Wizard']);
  });

  it('negative control: Barbarian level 6 Rage 4-to-5 breaks the pinned vector', () => {
    const mutated = classLevelTables.replace(
      '         6           +3        Subclass feature                                            4          +2           3',
      '         6           +3        Subclass feature                                            5          +2           3',
    );
    const barbarian = parseSrdClassResourceManifest(mutated)
      .flatMap((entry) => entry.ladders)
      .find((entry) => entry.class_name === 'Barbarian');
    expect(barbarian?.maxima).not.toEqual(expectedLadders.Barbarian);
  });

  it('treats the Monk level 1 dash as sourced zero and rejects invalid coverage', () => {
    const monk = parseSrdClassResourceManifest()
      .flatMap((entry) => entry.ladders)
      .find((entry) => entry.class_name === 'Monk');
    expect(monk?.maxima[0]).toBe(0);
    const missing = classLevelTables.replace(
      '        1         +2      Martial Arts, Unarmored Defense                         1d6          —             —\n',
      '',
    );
    expect(() => parseSrdClassResourceManifest(missing)).toThrow(
      'Monk table does not enumerate resource levels 1..20',
    );

    const acquiredEarly = classLevelTables.replace(
      '        1         +2      Martial Arts, Unarmored Defense                         1d6          —             —\n',
      '        1         +2      Martial Arts, Unarmored Defense                         1d6          1             —\n',
    );
    expect(() => parseSrdClassResourceManifest(acquiredEarly)).toThrow(
      'Monk level 1 must use a dash before Focus Points is acquired',
    );

    const monkLevelTwo =
      '        2         +2      Monk’s Focus, Unarmored Movement,                       ' +
      '1d6           2          +10 ft.\n';
    const duplicate = classLevelTables.replace(
      monkLevelTwo,
      monkLevelTwo + monkLevelTwo,
    );
    expect(() => parseSrdClassResourceManifest(duplicate)).toThrow(
      'Monk table repeats level 2',
    );

    const nonInteger = classLevelTables.replace(
      monkLevelTwo,
      monkLevelTwo.replace('1d6           2          +10 ft.', '1d6         two          +10 ft.'),
    );
    expect(() => parseSrdClassResourceManifest(nonInteger)).toThrow(
      'Monk level 2 Focus Points is not an integer count',
    );
  });

  it('rejects a decimal resource cell as a non-integer complete cell token', () => {
    const mutated = classLevelTables.replace(
      '1d6           2          +10 ft.',
      '1d6         2.5          +10 ft.',
    );
    expect(() => parseSrdClassResourceManifest(mutated)).toThrow(
      'Monk level 2 Focus Points is not an integer count',
    );
  });

  it('rejects a literal zero where only a pre-acquisition dash is valid', () => {
    const mutated = classLevelTables.replace(
      '1d6          —             —',
      '1d6          0             —',
    );
    expect(() => parseSrdClassResourceManifest(mutated)).toThrow(
      'Monk level 1 must use a dash before Focus Points is acquired',
    );
  });

  it('rejects an unexpected resource-like header on a known-none class', () => {
    const mutated = classLevelTables.replace(
      'Level   Bonus         Class Features                                                        Sneak Attack',
      'Level   Bonus         Class Features                     Luck Uses                          Sneak Attack',
    );
    expect(() => parseSrdClassResourceManifest(mutated)).toThrow(
      'Rogue has unexpected resource-like headers',
    );
  });

  it('rejects a known and unexpected resource-like header on the same class table', () => {
    const mutated = classLevelTables.replace(
      'Rages      Damage',
      'Rages      Fury Uses      Damage',
    );
    expect(() => parseSrdClassResourceManifest(mutated)).toThrow(
      'Barbarian table resource headers are ["Rages","Fury Uses"]',
    );
  });

  it('pins all eighteen decoded formulas and the three deliberate absences', () => {
    const parsed = parseSrdClassResourceFormulaManifest();
    expect(parsed.formulas).toHaveLength(18);
    expect(
      parsed.formulas.map(({ content_key, resource_kind, formula }) => ({
        content_key,
        resource_kind,
        formula,
      })),
    ).toEqual([
      { content_key: '2024:class:barbarian', resource_kind: 'persistent_rage_recovery', formula: { kind: 'fixed_count', minimum_class_level: 15, count: 1 } },
      { content_key: '2024:class:cleric', resource_kind: 'divine_intervention', formula: { kind: 'fixed_count', minimum_class_level: 10, count: 1 } },
      { content_key: '2024:class:druid', resource_kind: 'wild_resurgence_conversion', formula: { kind: 'fixed_count', minimum_class_level: 5, count: 1 } },
      { content_key: '2024:class:druid', resource_kind: 'nature_magician_conversion', formula: { kind: 'fixed_count', minimum_class_level: 20, count: 1 } },
      { content_key: '2024:class:monk', resource_kind: 'uncanny_metabolism', formula: { kind: 'fixed_count', minimum_class_level: 2, count: 1 } },
      { content_key: '2024:class:paladin', resource_kind: 'paladins_smite', formula: { kind: 'fixed_count', minimum_class_level: 2, count: 1 } },
      { content_key: '2024:class:paladin', resource_kind: 'faithful_steed', formula: { kind: 'fixed_count', minimum_class_level: 5, count: 1 } },
      { content_key: '2024:class:rogue', resource_kind: 'stroke_of_luck', formula: { kind: 'fixed_count', minimum_class_level: 20, count: 1 } },
      { content_key: '2024:class:sorcerer', resource_kind: 'innate_sorcery', formula: { kind: 'fixed_count', minimum_class_level: 1, count: 2 } },
      { content_key: '2024:class:sorcerer', resource_kind: 'sorcerous_restoration', formula: { kind: 'fixed_count', minimum_class_level: 5, count: 1 } },
      { content_key: '2024:class:warlock', resource_kind: 'magical_cunning', formula: { kind: 'fixed_count', minimum_class_level: 2, count: 1 } },
      { content_key: '2024:class:warlock', resource_kind: 'contact_patron', formula: { kind: 'fixed_count', minimum_class_level: 9, count: 1 } },
      { content_key: '2024:class:bard', resource_kind: 'bardic_inspiration', formula: { kind: 'ability_modifier_minimum_one', minimum_class_level: 1, ability: 'charisma' } },
      { content_key: '2024:class:ranger', resource_kind: 'tireless', formula: { kind: 'ability_modifier_minimum_one', minimum_class_level: 10, ability: 'wisdom' } },
      { content_key: '2024:class:ranger', resource_kind: 'natures_veil', formula: { kind: 'ability_modifier_minimum_one', minimum_class_level: 14, ability: 'wisdom' } },
      { content_key: '2024:class:paladin', resource_kind: 'lay_on_hands', formula: { kind: 'class_level_multiple', minimum_class_level: 1, multiplier: 5 } },
      { content_key: '2024:class:fighter', resource_kind: 'action_surge', formula: { kind: 'fixed_count_by_class_level', steps: [{ minimum_class_level: 2, count: 1 }, { minimum_class_level: 17, count: 2 }] } },
      { content_key: '2024:class:fighter', resource_kind: 'indomitable', formula: { kind: 'fixed_count_by_class_level', steps: [{ minimum_class_level: 9, count: 1 }, { minimum_class_level: 13, count: 2 }, { minimum_class_level: 17, count: 3 }] } },
    ]);
    expect(parsed.unmodelled.map((entry) => entry.resource_kind)).toEqual([
      'arcane_recovery', 'mystic_arcanum', 'signature_spells',
    ]);
  });

  it('negative control: removing Bardic Inspiration minimum-of-once evidence is rejected', () => {
    const mutated = srdFullText.replace('(minimum of once)', '(at least once)');
    expect(() => parseSrdClassResourceFormulaManifest(mutated)).toThrow(
      'Level 1: Bardic Inspiration no longer matches its cited source phrase',
    );
  });

  it('rejects Bardic Inspiration when its feature heading moves under Cleric', () => {
    const withoutBardicHeading = srdFullText.replace(
      'Level 1: Bardic Inspiration',
      'Level 1: Displaced Inspiration',
    );
    const clericStart = withoutBardicHeading.indexOf('Cleric Class Features');
    expect(clericStart).toBeGreaterThanOrEqual(0);
    const mutated = withoutBardicHeading.slice(0, clericStart) +
      withoutBardicHeading.slice(clericStart).replace(
        'Level 1: Spellcasting',
        'Level 1: Bardic Inspiration',
      );
    expect(() => parseSrdClassResourceFormulaManifest(mutated)).toThrow(
      'Level 1: Bardic Inspiration occurs outside the Bard class section',
    );
  });

  it('decodes stepped payload JSON only when levels increase and counts change', () => {
    const base = {
      formula_kind: 'fixed_count_by_class_level',
      minimum_class_level: 2,
      fixed_count: 1,
      ability: null,
      multiplier: null,
      later_fixed_count_steps: '[{"minimum_class_level":17,"count":2}]',
    };
    expect(decodeClassResourceFormula(base)).toEqual({
      kind: 'fixed_count_by_class_level',
      steps: [
        { minimum_class_level: 2, count: 1 },
        { minimum_class_level: 17, count: 2 },
      ],
    });
    expect(() => decodeClassResourceFormula({
      ...base,
      later_fixed_count_steps: '[{"minimum_class_level":2,"count":2}]',
    })).toThrow('step levels must be strictly increasing');
    expect(() => decodeClassResourceFormula({
      ...base,
      later_fixed_count_steps: '[{"minimum_class_level":17,"count":1}]',
    })).toThrow('each step must change the count');
  });

  it('maps both closed resource vocabularies through exhaustive labels', () => {
    expect(classResourceLabel('focus_points')).toBe('Focus Points');
    expect(classFormulaResourceLabel('paladins_smite')).toBe("Paladin's Smite");
  });

  it('uses a dedicated parser error type', () => {
    expect(() => parseSrdClassResourceManifest('')).toThrow(SrdClassResourcesError);
  });
});
