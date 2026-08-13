import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseSrdSubclasses,
  SPELL_TABLE_ACTIVATION_LEVELS,
  srdSubclassSpellVersionKeyEntries,
  SrdSubclassesError,
  type SrdCircleLandSpellTable,
  type SrdSubclassManifest,
  type SrdUnconditionalSpellTable,
  type SrdUnconditionalSpellTableName,
} from '../../../src/rules/srd-subclasses';
import { SRD_ATTRIBUTION_NOTICE } from '../../../src/rules/srd-attribution';
import { parseSrdSpellDescriptions } from '../../../src/rules/spells-srd';

const SOURCE_URL = new URL(
  '../../../docs/srd/source/subclasses.txt',
  import.meta.url,
);
const FULL_SOURCE_URL = new URL(
  '../../../docs/srd/full/srd-5.2.1.txt',
  import.meta.url,
);
const SOURCE = readFileSync(SOURCE_URL, 'utf8');

const EXPECTED_ATTRIBUTION_PREAMBLE = `This work includes material from the System Reference Document 5.2.1
("SRD 5.2.1") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

function normalizedLineCount(source: string, expected: string): number {
  return source
    .split('\n')
    .filter((line) => collapseWhitespace(line) === expected).length;
}

const EXPECTED_SUBCLASSES = [
  ['Barbarian', 'Path of the Berserker'],
  ['Bard', 'College of Lore'],
  ['Cleric', 'Life Domain'],
  ['Druid', 'Circle of the Land'],
  ['Fighter', 'Champion'],
  ['Monk', 'Warrior of the Open Hand'],
  ['Paladin', 'Oath of Devotion'],
  ['Ranger', 'Hunter'],
  ['Rogue', 'Thief'],
  ['Sorcerer', 'Draconic Sorcery'],
  ['Warlock', 'Fiend Patron'],
  ['Wizard', 'Evoker'],
] as const;

/**
 * Hand-enumerated from the subclass headings on printed pages 30, 35, 40, 46,
 * 49, 52, 56-57, 61, 64, 69-70, 76 and 82 of SRD 5.2.1. Full-text evidence:
 * docs/srd/full/srd-5.2.1.txt:1872-1916, 2166-2203, 2445-2494,
 * 2789-2845, 2968-3009, 3130-3169, 3364-3442, 3649-3711, 3827-3885,
 * 4167-4244, 4565-4607 and 4902-4959. These tuples are the oracle; they are
 * not generated from the parser or extract.
 */
const EXPECTED_FEATURES = {
  Barbarian: [
    [3, 'Frenzy'],
    [6, 'Mindless Rage'],
    [10, 'Retaliation'],
    [14, 'Intimidating Presence'],
  ],
  Bard: [
    [3, 'Bonus Proficiencies'],
    [3, 'Cutting Words'],
    [6, 'Magical Discoveries'],
    [14, 'Peerless Skill'],
  ],
  Cleric: [
    [3, 'Disciple of Life'],
    [3, 'Life Domain Spells'],
    [3, 'Preserve Life'],
    [6, 'Blessed Healer'],
    [17, 'Supreme Healing'],
  ],
  Druid: [
    [3, 'Circle of the Land Spells'],
    [3, 'Land’s Aid'],
    [6, 'Natural Recovery'],
    [10, 'Nature’s Ward'],
    [14, 'Nature’s Sanctuary'],
  ],
  Fighter: [
    [3, 'Improved Critical'],
    [3, 'Remarkable Athlete'],
    [7, 'Additional Fighting Style'],
    [10, 'Heroic Warrior'],
    [15, 'Superior Critical'],
    [18, 'Survivor'],
  ],
  Monk: [
    [3, 'Open Hand Technique'],
    [6, 'Wholeness of Body'],
    [11, 'Fleet Step'],
    [17, 'Quivering Palm'],
  ],
  Paladin: [
    [3, 'Oath of Devotion Spells'],
    [3, 'Sacred Weapon'],
    [7, 'Aura of Devotion'],
    [15, 'Smite of Protection'],
    [20, 'Holy Nimbus'],
  ],
  Ranger: [
    [3, 'Hunter’s Lore'],
    [3, 'Hunter’s Prey'],
    [7, 'Defensive Tactics'],
    [11, 'Superior Hunter’s Prey'],
    [15, 'Superior Hunter’s Defense'],
  ],
  Rogue: [
    [3, 'Fast Hands'],
    [3, 'Second-Story Work'],
    [9, 'Supreme Sneak'],
    [13, 'Use Magic Device'],
    [17, 'Thief’s Reflexes'],
  ],
  Sorcerer: [
    [3, 'Draconic Resilience'],
    [3, 'Draconic Spells'],
    [6, 'Elemental Affinity'],
    [14, 'Dragon Wings'],
    [18, 'Dragon Companion'],
  ],
  Warlock: [
    [3, 'Dark One’s Blessing'],
    [3, 'Fiend Spells'],
    [6, 'Dark One’s Own Luck'],
    [10, 'Fiendish Resilience'],
    [14, 'Hurl Through Hell'],
  ],
  Wizard: [
    [3, 'Evocation Savant'],
    [3, 'Potent Cantrip'],
    [6, 'Sculpt Spells'],
    [10, 'Empowered Evocation'],
    [14, 'Overchannel'],
  ],
} as const;

type SpellTuple = readonly [number, string, string];

/**
 * Hand-enumerated from the Life Domain table on printed page 40, full-text
 * lines 2453-2466. Content keys are transcribed, not slugged in this test.
 */
const EXPECTED_LIFE_DOMAIN = [
  [3, 'Aid', '2024:aid'],
  [3, 'Bless', '2024:bless'],
  [3, 'Cure Wounds', '2024:cure-wounds'],
  [3, 'Lesser Restoration', '2024:lesser-restoration'],
  [5, 'Mass Healing Word', '2024:mass-healing-word'],
  [5, 'Revivify', '2024:revivify'],
  [7, 'Aura of Life', '2024:aura-of-life'],
  [7, 'Death Ward', '2024:death-ward'],
  [9, 'Greater Restoration', '2024:greater-restoration'],
  [9, 'Mass Cure Wounds', '2024:mass-cure-wounds'],
] as const satisfies readonly SpellTuple[];

/**
 * Hand-enumerated from the Circle of the Land tables on printed page 46,
 * full-text lines 2808-2845. All 24 entries remain an oracle even though no
 * active grant is emitted.
 */
const EXPECTED_CIRCLE = {
  'Arid Land': [
    [3, 'Blur', '2024:blur'],
    [3, 'Burning Hands', '2024:burning-hands'],
    [3, 'Fire Bolt', '2024:fire-bolt'],
    [5, 'Fireball', '2024:fireball'],
    [7, 'Blight', '2024:blight'],
    [9, 'Wall of Stone', '2024:wall-of-stone'],
  ],
  'Polar Land': [
    [3, 'Fog Cloud', '2024:fog-cloud'],
    [3, 'Hold Person', '2024:hold-person'],
    [3, 'Ray of Frost', '2024:ray-of-frost'],
    [5, 'Sleet Storm', '2024:sleet-storm'],
    [7, 'Ice Storm', '2024:ice-storm'],
    [9, 'Cone of Cold', '2024:cone-of-cold'],
  ],
  'Temperate Land': [
    [3, 'Misty Step', '2024:misty-step'],
    [3, 'Shocking Grasp', '2024:shocking-grasp'],
    [3, 'Sleep', '2024:sleep'],
    [5, 'Lightning Bolt', '2024:lightning-bolt'],
    [7, 'Freedom of Movement', '2024:freedom-of-movement'],
    [9, 'Tree Stride', '2024:tree-stride'],
  ],
  'Tropical Land': [
    [3, 'Acid Splash', '2024:acid-splash'],
    [3, 'Ray of Sickness', '2024:ray-of-sickness'],
    [3, 'Web', '2024:web'],
    [5, 'Stinking Cloud', '2024:stinking-cloud'],
    [7, 'Polymorph', '2024:polymorph'],
    [9, 'Insect Plague', '2024:insect-plague'],
  ],
} as const satisfies Readonly<Record<string, readonly SpellTuple[]>>;

/** Printed page 56, full-text lines 3390-3398. */
const EXPECTED_OATH_OF_DEVOTION = [
  [3, 'Protection from Evil and Good', '2024:protection-from-evil-and-good'],
  [3, 'Shield of Faith', '2024:shield-of-faith'],
  [5, 'Aid', '2024:aid'],
  [5, 'Zone of Truth', '2024:zone-of-truth'],
  [9, 'Beacon of Hope', '2024:beacon-of-hope'],
  [9, 'Dispel Magic', '2024:dispel-magic'],
  [13, 'Freedom of Movement', '2024:freedom-of-movement'],
  [13, 'Guardian of Faith', '2024:guardian-of-faith'],
  [17, 'Commune', '2024:commune'],
  [17, 'Flame Strike', '2024:flame-strike'],
] as const satisfies readonly SpellTuple[];

/** Printed page 69, full-text lines 4200-4213. */
const EXPECTED_DRACONIC_SORCERY = [
  [3, 'Alter Self', '2024:alter-self'],
  [3, 'Chromatic Orb', '2024:chromatic-orb'],
  [3, 'Command', '2024:command'],
  [3, 'Dragon’s Breath', '2024:dragon-s-breath'],
  [5, 'Fear', '2024:fear'],
  [5, 'Fly', '2024:fly'],
  [7, 'Arcane Eye', '2024:arcane-eye'],
  [7, 'Charm Monster', '2024:charm-monster'],
  [9, 'Legend Lore', '2024:legend-lore'],
  [9, 'Summon Dragon', '2024:summon-dragon'],
] as const satisfies readonly SpellTuple[];

/** Printed page 76, full-text lines 4565-4571. */
const EXPECTED_FIEND_PATRON = [
  [3, 'Burning Hands', '2024:burning-hands'],
  [3, 'Command', '2024:command'],
  [3, 'Scorching Ray', '2024:scorching-ray'],
  [3, 'Suggestion', '2024:suggestion'],
  [5, 'Fireball', '2024:fireball'],
  [5, 'Stinking Cloud', '2024:stinking-cloud'],
  [7, 'Fire Shield', '2024:fire-shield'],
  [7, 'Wall of Fire', '2024:wall-of-fire'],
  [9, 'Geas', '2024:geas'],
  [9, 'Insect Plague', '2024:insect-plague'],
] as const satisfies readonly SpellTuple[];

const EXPECTED_FIXED_TABLES: Readonly<
  Record<SrdUnconditionalSpellTableName, readonly SpellTuple[]>
> = {
  life_domain: EXPECTED_LIFE_DOMAIN,
  oath_of_devotion: EXPECTED_OATH_OF_DEVOTION,
  draconic_sorcery: EXPECTED_DRACONIC_SORCERY,
  fiend_patron: EXPECTED_FIEND_PATRON,
};

/**
 * Authored from the same five printed tables as the tuple oracles above. This
 * is deliberately not collected from parser output or from the explicit map
 * it checks.
 */
const EXPECTED_SPELL_VOCABULARY = [
  ...EXPECTED_LIFE_DOMAIN,
  ...Object.values(EXPECTED_CIRCLE).flat(),
  ...EXPECTED_OATH_OF_DEVOTION,
  ...EXPECTED_DRACONIC_SORCERY,
  ...EXPECTED_FIEND_PATRON,
] as const satisfies readonly SpellTuple[];

const EXPECTED_RULE_SET_IDENTITIES = {
  Cleric: {
    class_name: 'Cleric',
    subclass_name: 'Life Domain',
    spell_table: 'life_domain',
    rule_keys: [
      'life-domain-aid',
      'life-domain-bless',
      'life-domain-cure-wounds',
      'life-domain-lesser-restoration',
      'life-domain-mass-healing-word',
      'life-domain-revivify',
      'life-domain-aura-of-life',
      'life-domain-death-ward',
      'life-domain-greater-restoration',
      'life-domain-mass-cure-wounds',
    ],
  },
  Paladin: {
    class_name: 'Paladin',
    subclass_name: 'Oath of Devotion',
    spell_table: 'oath_of_devotion',
    rule_keys: [
      'oath-of-devotion-protection-from-evil-and-good',
      'oath-of-devotion-shield-of-faith',
      'oath-of-devotion-aid',
      'oath-of-devotion-zone-of-truth',
      'oath-of-devotion-beacon-of-hope',
      'oath-of-devotion-dispel-magic',
      'oath-of-devotion-freedom-of-movement',
      'oath-of-devotion-guardian-of-faith',
      'oath-of-devotion-commune',
      'oath-of-devotion-flame-strike',
    ],
  },
  Sorcerer: {
    class_name: 'Sorcerer',
    subclass_name: 'Draconic Sorcery',
    spell_table: 'draconic_sorcery',
    rule_keys: [
      'draconic-sorcery-alter-self',
      'draconic-sorcery-chromatic-orb',
      'draconic-sorcery-command',
      'draconic-sorcery-dragon-s-breath',
      'draconic-sorcery-fear',
      'draconic-sorcery-fly',
      'draconic-sorcery-arcane-eye',
      'draconic-sorcery-charm-monster',
      'draconic-sorcery-legend-lore',
      'draconic-sorcery-summon-dragon',
    ],
  },
  Warlock: {
    class_name: 'Warlock',
    subclass_name: 'Fiend Patron',
    spell_table: 'fiend_patron',
    rule_keys: [
      'fiend-patron-burning-hands',
      'fiend-patron-command',
      'fiend-patron-scorching-ray',
      'fiend-patron-suggestion',
      'fiend-patron-fireball',
      'fiend-patron-stinking-cloud',
      'fiend-patron-fire-shield',
      'fiend-patron-wall-of-fire',
      'fiend-patron-geas',
      'fiend-patron-insect-plague',
    ],
  },
} as const;

function manifest(): SrdSubclassManifest {
  return parseSrdSubclasses();
}

function unconditionalTable(
  parsed: SrdSubclassManifest,
  name: SrdUnconditionalSpellTableName,
): SrdUnconditionalSpellTable {
  const table = parsed.spell_tables.find(
    (candidate) => candidate.table_name === name,
  );
  if (table === undefined || table.kind !== 'unconditional') {
    throw new Error(`Missing unconditional table ${name}.`);
  }
  return table;
}

function circleTable(parsed: SrdSubclassManifest): SrdCircleLandSpellTable {
  const table = parsed.spell_tables.find(
    (candidate) => candidate.table_name === 'circle_of_the_land',
  );
  if (table === undefined || table.kind !== 'renewable_choice') {
    throw new Error('Missing Circle of the Land table.');
  }
  return table;
}

function spellTuples(table: SrdUnconditionalSpellTable): SpellTuple[] {
  return table.entries.map((entry) => [
    entry.active_from_class_level,
    entry.printed_name,
    entry.spell_version_key,
  ]);
}

function sourceSection(start: string, end: string): string {
  const startAt = SOURCE.indexOf(start);
  const endAt = SOURCE.indexOf(end, startAt + start.length);
  if (startAt < 0 || endAt < 0) {
    throw new Error(`Mutation anchors are absent: ${start} -> ${end}.`);
  }
  return SOURCE.slice(startAt, endAt);
}

function withoutChampion(): string {
  const champion = sourceSection(
    '\f     Fighter Subclass: Champion',
    ' Monk Subclass: Warrior of the',
  );
  return SOURCE.replace(champion, '');
}

function withDuplicateThiefAndNoChampion(): string {
  const thief = sourceSection(
    '\f     Rogue Subclass: Thief',
    '   Sorcerer Subclass: Draconic',
  );
  return withoutChampion().replace(
    '   Sorcerer Subclass: Draconic',
    `${thief}   Sorcerer Subclass: Draconic`,
  );
}

function withBardBeforeBarbarian(): string {
  const barbarian = sourceSection(
    '   Barbarian Subclass:',
    '     Bard Subclass:',
  );
  const bard = sourceSection(
    '     Bard Subclass:',
    '     Cleric Subclass:',
  );
  return SOURCE.replace(`${barbarian}${bard}`, `${bard}${barbarian}`);
}

function withLifeDomainTableInBard(): string {
  const lifeDomainTable = sourceSection(
    '   Life Domain Spells\n',
    '   Level 3: Preserve Life',
  );
  return SOURCE.replace(lifeDomainTable, '').replace(
    '     Cleric Subclass: Life Domain',
    `${lifeDomainTable}     Cleric Subclass: Life Domain`,
  );
}

function withPolarBeforeArid(): string {
  const arid = sourceSection('     Arid Land', '     Polar Land');
  const polar = sourceSection('     Polar Land', '     Temperate Land');
  return SOURCE.replace(`${arid}${polar}`, `${polar}${arid}`);
}

function sourceClassOrder(source: string): string[] {
  return [...source.matchAll(/^\f?\s*(?<className>[A-Za-z]+) Subclass:/gmu)].map(
    (match) => match.groups?.className ?? '',
  );
}

function ruleSetIdentity(
  set: SrdSubclassManifest['unconditional_rule_sets'][number],
): {
  class_name: string;
  subclass_name: string;
  spell_table: string;
  rule_keys: string[];
} {
  return {
    class_name: set.class_name,
    subclass_name: set.subclass_name,
    spell_table: set.spell_table,
    rule_keys: set.rules.map((rule) => rule.rule_key),
  };
}

function fixedRuleSetThroughClass(
  parsed: SrdSubclassManifest,
  className: 'Cleric' | 'Paladin' | 'Sorcerer' | 'Warlock',
): ReturnType<typeof ruleSetIdentity> {
  const outcome = parsed.by_class[className].mechanical_outcome;
  if (outcome.kind !== 'unconditional_fixed_spells') {
    throw new Error(`${className} has no unconditional fixed-spell rule set.`);
  }
  return ruleSetIdentity(outcome.rule_set);
}

function expectDeepFrozen(value: unknown): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    expectDeepFrozen(Reflect.get(value, key));
  }
}

describe('SRD subclass manifest', () => {
  it('the checked-in subclass extract carries the required attribution preamble', () => {
    const preambleEnd = SOURCE.search(/\n\s*\n/u);
    expect(preambleEnd).toBeGreaterThan(0);

    expect(SOURCE.slice(0, preambleEnd)).toBe(EXPECTED_ATTRIBUTION_PREAMBLE);
    expect(collapseWhitespace(SOURCE.slice(0, preambleEnd))).toBe(
      collapseWhitespace(SRD_ATTRIBUTION_NOTICE),
    );
  });

  it('parses exactly the twelve SRD subclass sections, one per class', () => {
    const parsed = manifest();
    const actual = Object.values(parsed.by_class).map(
      (entry) => [entry.class_name, entry.subclass_name] as const,
    );
    const actualClasses = new Set(
      Object.values(parsed.by_class).map((entry) => entry.class_name),
    );
    const expectedClasses = new Set(
      EXPECTED_SUBCLASSES.map(([className]) => className),
    );

    expect(actual).toEqual(EXPECTED_SUBCLASSES);
    expect([...actualClasses].filter((name) => !expectedClasses.has(name))).toEqual([]);
    expect([...expectedClasses].filter((name) => !actualClasses.has(name))).toEqual([]);

    // Negative controls named by §2.3: neither a deletion nor a count-neutral
    // duplicate can satisfy the closed set.
    expect(() => parseSrdSubclasses(withoutChampion())).toThrow(
      SrdSubclassesError,
    );
    expect(() => parseSrdSubclasses(withDuplicateThiefAndNoChampion())).toThrow(
      SrdSubclassesError,
    );
  });

  it('parses all 58 feature headings with printed levels and SRD order', () => {
    const parsed = manifest();
    const actual = Object.fromEntries(
      Object.values(parsed.by_class).map((entry) => [
        entry.class_name,
        entry.features.map((feature) => [feature.class_level, feature.name]),
      ]),
    );
    const positions = Object.values(parsed.by_class).flatMap((entry) =>
      entry.features.map((feature) => [entry.class_name, feature.sort_position]),
    );

    expect(actual).toEqual(EXPECTED_FEATURES);
    expect(positions).toEqual(
      Object.entries(EXPECTED_FEATURES).flatMap(([className, features]) =>
        features.map((_, index) => [className, index]),
      ),
    );
    expect(Object.values(parsed.by_class).flatMap((entry) => entry.features)).toHaveLength(58);
  });

  it('parses the Life Domain spell table entry by entry', () => {
    expect(spellTuples(unconditionalTable(manifest(), 'life_domain'))).toEqual(
      EXPECTED_LIFE_DOMAIN,
    );
  });

  it('returns Circle of the Land choices in printed order', () => {
    expect(
      circleTable(manifest()).choices.map((choice) => choice.land),
    ).toEqual([
      'Arid Land',
      'Polar Land',
      'Temperate Land',
      'Tropical Land',
    ]);
  });

  it('retains all 24 Circle of the Land spell entries by renewable choice', () => {
    const actual = Object.fromEntries(
      circleTable(manifest()).choices.map((choice) => [
        choice.land,
        choice.entries.map((entry) => [
          entry.active_from_class_level,
          entry.printed_name,
          entry.spell_version_key,
        ]),
      ]),
    );
    expect(actual).toEqual(EXPECTED_CIRCLE);
  });

  it('parses the Oath of Devotion spell table entry by entry', () => {
    expect(
      spellTuples(unconditionalTable(manifest(), 'oath_of_devotion')),
    ).toEqual(EXPECTED_OATH_OF_DEVOTION);
  });

  it('parses the Draconic Sorcery spell table entry by entry', () => {
    expect(
      spellTuples(unconditionalTable(manifest(), 'draconic_sorcery')),
    ).toEqual(EXPECTED_DRACONIC_SORCERY);
  });

  it('parses the Fiend Patron spell table entry by entry', () => {
    expect(spellTuples(unconditionalTable(manifest(), 'fiend_patron'))).toEqual(
      EXPECTED_FIEND_PATRON,
    );
  });

  it('returns the five spell tables in documented SRD order', () => {
    expect(manifest().spell_tables.map((table) => table.table_name)).toEqual([
      'life_domain',
      'circle_of_the_land',
      'oath_of_devotion',
      'draconic_sorcery',
      'fiend_patron',
    ]);
  });

  it('closes spell-table activation levels to the authored printed set', () => {
    expect(SPELL_TABLE_ACTIVATION_LEVELS).toEqual([3, 5, 7, 9, 13, 17]);
  });

  it('closes the explicit spell map to the authored five-table vocabulary', () => {
    const authoredVocabulary = new Map(
      EXPECTED_SPELL_VOCABULARY.map(([, printedName, contentKey]) => [
        printedName,
        contentKey,
      ] as const),
    );
    const byPrintedName = (
      left: readonly [string, string],
      right: readonly [string, string],
    ): number => left[0].localeCompare(right[0]);

    expect([...srdSubclassSpellVersionKeyEntries].sort(byPrintedName)).toEqual(
      [...authoredVocabulary.entries()].sort(byPrintedName),
    );
  });

  it('resolves every explicit subclass spell key in the bundled spell catalog', () => {
    const catalogContentKeys = new Set(
      parseSrdSpellDescriptions().map((spell) => spell.content_key),
    );
    const unresolved = srdSubclassSpellVersionKeyEntries.filter(
      ([, contentKey]) => !catalogContentKeys.has(contentKey),
    );

    expect(unresolved).toEqual([]);
  });

  it('emits four unconditional rule sets and exactly 40 fixed-spell rules', () => {
    const sets = manifest().unconditional_rule_sets;
    expect(sets.map((set) => set.class_name)).toEqual([
      'Cleric',
      'Paladin',
      'Sorcerer',
      'Warlock',
    ]);
    expect(sets.flatMap((set) => set.rules)).toHaveLength(40);
    for (const set of sets) {
      const expected = EXPECTED_FIXED_TABLES[set.spell_table];
      expect(
        set.rules.map((rule) => [
          rule.active_from_class_level,
          rule.spell_version_key,
        ]),
      ).toEqual(expected.map(([level, , key]) => [level, key]));
      for (const rule of set.rules) {
        expect(rule.kind).toBe('fixed_spell');
        expect(rule.bucket).toBe('prepared');
        expect(rule.always_prepared).toBe(true);
        expect(rule.with_slots).toBe(true);
        expect('active_if_config' in rule).toBe(false);
      }
    }
    const ruleKeys = sets.flatMap((set) => set.rules.map((rule) => rule.rule_key));
    expect(new Set(ruleKeys).size).toBe(40);
  });

  it('pins each rule-set subclass and persisted rule locator to its table', () => {
    expect(manifest().unconditional_rule_sets.map(ruleSetIdentity)).toEqual(
      Object.values(EXPECTED_RULE_SET_IDENTITIES),
    );
  });

  it('reaches the exact fixed-spell rule set through each by_class outcome', () => {
    const parsed = manifest();
    expect({
      Cleric: fixedRuleSetThroughClass(parsed, 'Cleric'),
      Paladin: fixedRuleSetThroughClass(parsed, 'Paladin'),
      Sorcerer: fixedRuleSetThroughClass(parsed, 'Sorcerer'),
      Warlock: fixedRuleSetThroughClass(parsed, 'Warlock'),
    }).toEqual(EXPECTED_RULE_SET_IDENTITIES);
  });

  it('represents each unsupported choice or timing case as its typed deferral', () => {
    const parsed = manifest();
    expect(parsed.by_class.Bard.mechanical_outcome).toEqual({
      kind: 'deferred',
      deferral: {
        kind: 'magical_discoveries_multi_list_choice',
        feature_name: 'Magical Discoveries',
        reason: 'the_current_list_rule_resolves_exactly_one_list',
      },
    });
    expect(parsed.by_class.Druid.mechanical_outcome).toEqual({
      kind: 'deferred',
      deferral: {
        kind: 'circle_land_renewable_choice',
        feature_name: 'Circle of the Land Spells',
        evidence_table: 'circle_of_the_land',
        reason: 'the_renewable_land_choice_has_no_typed_capture_path',
      },
    });
    expect(parsed.by_class.Wizard.mechanical_outcome).toEqual({
      kind: 'deferred',
      deferral: {
        kind: 'evocation_savant_timing_excluded',
        feature_name: 'Evocation Savant',
        reason:
          'the_acquisition_timing_exists_only_in_excluded_feature_prose',
      },
    });
  });

  /**
   * SRD 5.2.1, Fighter Subclass: Champion — "Level 7: Additional Fighting
   * Style. You gain another Fighting Style feat of your choice."
   * (`docs/srd/full/srd-5.2.1.txt` lines 2993-2994.)
   *
   * REPLACES the former `additional_fighting_style_open_choice` deferral,
   * whose stated reason — "the rule requires a fixed style key" — was true
   * only of the `fighting_style` GRANT KIND. An open feat choice is the
   * `grant_source` shape the backgrounds already use for their Origin feat,
   * so the feature is now carried rather than deferred. Strict superset: the
   * deferral asserted the feature was NOT modelled; this asserts exactly how
   * it is.
   */
  it('carries Champion’s level-7 extra Fighting Style as a real grant rule', () => {
    const outcome = manifest().by_class.Fighter.mechanical_outcome;
    expect(outcome).toEqual({
      kind: 'granted_feat_choice',
      rule_set: {
        class_name: 'Fighter',
        subclass_name: 'Champion',
        feature_name: 'Additional Fighting Style',
        feat_grouping: 'fighting_style',
        rules: [
          {
            kind: 'grant_source',
            rule_key: 'champion-additional-fighting-style',
            source_type: 'feat',
            definition_key_config: 'additional_fighting_style_key',
            child_config_config: 'additional_fighting_style_config',
            active_from_class_level: 7,
          },
        ],
      },
    });
  });

  it('reads the extra Fighting Style level off the printed heading', () => {
    // F27: the level is sourced, not a literal. Move the printed heading and
    // the rule must move with it.
    const moved = parseSrdSubclasses(
      SOURCE.replace(
        '     Level 7: Additional Fighting Style',
        '     Level 9: Additional Fighting Style',
      ),
    );
    const outcome = moved.by_class.Fighter.mechanical_outcome;
    expect(outcome.kind).toBe('granted_feat_choice');
    expect(
      outcome.kind === 'granted_feat_choice'
        ? outcome.rule_set.rules[0]?.active_from_class_level
        : null,
    ).toBe(9);
  });

  it('refuses a Champion whose extra Fighting Style heading is renamed', () => {
    // The feature-count guard already catches a DELETED heading, so this
    // renames one instead: the rule may not survive its own feature.
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          '     Level 7: Additional Fighting Style',
          '     Level 7: Additional Fighting Stance',
        ),
      ),
    ).toThrow(/Additional Fighting Style/u);
  });

  it('distinguishes legitimate no-rule subclasses from deferrals and parsed rules', () => {
    const parsed = manifest();
    for (const className of ['Barbarian', 'Monk', 'Ranger', 'Rogue'] as const) {
      expect(parsed.by_class[className].mechanical_outcome).toEqual({
        kind: 'no_catalog_rule',
        reason: 'the_extracted_catalog_facts_contain_no_spell_or_choice_rule',
      });
    }
    for (const className of ['Bard', 'Druid', 'Wizard'] as const) {
      expect(parsed.by_class[className].mechanical_outcome.kind).toBe('deferred');
    }
    expect(parsed.by_class.Fighter.mechanical_outcome.kind).toBe(
      'granted_feat_choice',
    );
    for (const className of ['Cleric', 'Paladin', 'Sorcerer', 'Warlock'] as const) {
      expect(parsed.by_class[className].mechanical_outcome.kind).toBe(
        'unconditional_fixed_spells',
      );
    }
  });

  it('returns a deeply frozen read-only manifest', () => {
    expectDeepFrozen(manifest());
  });
});

describe('SRD subclass parser rejections', () => {
  it('rejects a truncated wrapped subclass heading', () => {
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('   Path of the Berserker\n', '')),
    ).toThrow(/Barbarian subclass name/u);
  });

  it('rejects neighbouring-column bleed before a subclass heading', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          ' Monk Subclass: Warrior of the\n',
          ' Patient Defense. When you expend a Focus Point Monk Subclass: Warrior of the\n',
        ),
      ),
    ).toThrow(/non-heading prose/u);
  });

  it('rejects malformed feature and subclass headings', () => {
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('Level 3: Frenzy', 'Level Three: Frenzy')),
    ).toThrow(/non-heading prose/u);
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          'Barbarian Subclass:',
          'Barbarian Subclass Path of the Berserker:',
        ),
      ),
    ).toThrow(/precedes the first subclass heading/u);
  });

  it('rejects a missing class section', () => {
    expect(() => parseSrdSubclasses(withoutChampion())).toThrow(/missing classes Fighter/u);
  });

  it('rejects a duplicate class section', () => {
    const duplicateHeading = SOURCE.replace(
      '\f     Rogue Subclass: Thief',
      '\f     Rogue Subclass: Thief\n\f     Rogue Subclass: Thief',
    );
    expect(() => parseSrdSubclasses(duplicateHeading)).toThrow(/repeats class Rogue/u);
  });

  it('rejects complete class sections swapped in the parsed source order', () => {
    const swapped = withBardBeforeBarbarian();
    expect(sourceClassOrder(swapped)).toEqual([
      'Bard',
      'Barbarian',
      'Cleric',
      'Druid',
      'Fighter',
      'Monk',
      'Paladin',
      'Ranger',
      'Rogue',
      'Sorcerer',
      'Warlock',
      'Wizard',
    ]);
    expect(() => parseSrdSubclasses(swapped)).toThrow(
      /expected the twelve classes in SRD order; found Bard, Barbarian/u,
    );
  });

  it('rejects an unknown class name', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace('Fighter Subclass: Champion', 'Artificer Subclass: Champion'),
      ),
    ).toThrow(/unknown class "Artificer"/u);
  });

  it('rejects a feature level outside 1-20', () => {
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('Level 3: Frenzy', 'Level 0: Frenzy')),
    ).toThrow(/feature level 0 is outside 1-20/u);
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('Level 20: Holy Nimbus', 'Level 21: Holy Nimbus')),
    ).toThrow(/feature level 21 is outside 1-20/u);
  });

  it('rejects a duplicate feature name within a subclass', () => {
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('Level 6: Mindless Rage', 'Level 6: Frenzy')),
    ).toThrow(/repeats feature name "Frenzy"/u);

    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          '   Level 3: Frenzy\n',
          '   Level 3: Frenzy\n   Level 3: Frenzy\n',
        ),
      ),
    ).toThrow(/repeats feature name "Frenzy"/u);
  });

  it('rejects duplicate feature sort positions', () => {
    const thief = sourceSection(
      '\f     Rogue Subclass: Thief',
      '   Sorcerer Subclass: Draconic',
    );
    const duplicateThief = SOURCE.replace(
      '   Sorcerer Subclass: Draconic',
      `${thief}   Sorcerer Subclass: Draconic`,
    );
    expect(() => parseSrdSubclasses(duplicateThief)).toThrow(
      /Rogue repeats feature sort position 0/u,
    );
  });

  it('rejects a malformed spell row', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          '         5       Mass Healing Word, Revivify',
          '         five    Mass Healing Word, Revivify',
        ),
      ),
    ).toThrow(/non-heading prose or an unrecognised table row/u);
  });

  it('rejects a missing spell-row continuation', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace('                    Shield of Faith\n', ''),
      ),
    ).toThrow(/starts a spell row before completing the previous row/u);
  });

  it('rejects a duplicate level in one physical spell table', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          '         5       Mass Healing Word, Revivify',
          '         3       Mass Healing Word, Revivify',
        ),
      ),
    ).toThrow(/life_domain repeats level 3/u);
  });

  it('rejects a foreign, missing, or duplicate spell-table header', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace('Cleric        Prepared Spells', 'Sorcerer'),
      ),
    ).toThrow(/malformed or missing table headers/u);

    expect(() => parseSrdSubclasses(SOURCE.replace('   Level\n', ''))).toThrow(
      /malformed or missing table headers/u,
    );

    expect(() =>
      parseSrdSubclasses(SOURCE.replace('   Level\n', '   Level\n   Level\n')),
    ).toThrow(/malformed or missing table headers/u);
  });

  it('rejects the Life Domain table when its parsed owner is Bard', () => {
    const misplaced = withLifeDomainTableInBard();
    const bardAt = misplaced.indexOf('Bard Subclass:');
    const tableAt = misplaced.indexOf('Life Domain Spells', bardAt);
    const clericAt = misplaced.indexOf('Cleric Subclass:', bardAt);
    expect(bardAt).toBeGreaterThan(-1);
    expect(tableAt).toBeGreaterThan(bardAt);
    expect(tableAt).toBeLessThan(clericAt);
    expect(() => parseSrdSubclasses(misplaced)).toThrow(
      /Life Domain Spells appears under Bard/u,
    );
  });

  it('rejects a Paladin header moved after the first row of its physical table', () => {
    const lateHeader = SOURCE.replace('    Paladin Level   Spells\n', '').replace(
      '                    Shield of Faith\n',
      '                    Shield of Faith\n    Paladin Level   Spells\n',
    );

    expect(normalizedLineCount(lateHeader, 'Paladin Level Spells')).toBe(1);
    expect(lateHeader.indexOf('    Paladin Level   Spells')).toBeGreaterThan(
      lateHeader.indexOf('         3          Protection from Evil and Good,'),
    );
    expect(() => parseSrdSubclasses(lateHeader)).toThrow(
      /oath_of_devotion has malformed or missing table headers before a physical table row/u,
    );
  });

  it('rejects a Circle header moved from Polar Land into Arid Land', () => {
    const aridHeader =
      '      Druid Level    Circle Spells                          \n';
    const displacedHeader = SOURCE.replace(
      aridHeader,
      `${aridHeader}${aridHeader}`,
    ).replace('       Druid Level    Circle Spells\n', '');
    const aridStart = displacedHeader.indexOf('Arid Land');
    const polarStart = displacedHeader.indexOf('Polar Land', aridStart);
    const temperateStart = displacedHeader.indexOf('Temperate Land', polarStart);

    expect(normalizedLineCount(displacedHeader, 'Druid Level Circle Spells')).toBe(4);
    expect(
      normalizedLineCount(
        displacedHeader.slice(aridStart, polarStart),
        'Druid Level Circle Spells',
      ),
    ).toBe(2);
    expect(
      normalizedLineCount(
        displacedHeader.slice(polarStart, temperateStart),
        'Druid Level Circle Spells',
      ),
    ).toBe(0);
    expect(() => parseSrdSubclasses(displacedHeader)).toThrow(
      /circle_of_the_land has malformed or missing table headers before a physical table row/u,
    );
  });

  it('rejects a spell-table activation level not printed in the pinned extract', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          '         3       Aid, Bless, Cure Wounds,',
          '         4       Aid, Bless, Cure Wounds,',
        ),
      ),
    ).toThrow(/spell-table activation level 4 .* expected one of 3, 5, 7, 9, 13, 17/u);
  });

  it('rejects missing or duplicate Circle physical tables', () => {
    const missingLands = SOURCE.replace(
      /     Polar Land[\s\S]*?(?=  Level 3: Land’s Aid)/u,
      '',
    );
    expect(() => parseSrdSubclasses(missingLands)).toThrow(SrdSubclassesError);
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('Polar Land', 'Arid Land')),
    ).toThrow(/repeats physical table title Arid Land/u);
  });

  it('rejects complete Circle tables swapped in the parsed land order', () => {
    const swapped = withPolarBeforeArid();
    const polarAt = swapped.indexOf('Polar Land');
    const aridAt = swapped.indexOf('Arid Land', polarAt);
    const temperateAt = swapped.indexOf('Temperate Land', aridAt);
    expect(polarAt).toBeGreaterThan(-1);
    expect(aridAt).toBeGreaterThan(polarAt);
    expect(temperateAt).toBeGreaterThan(aridAt);
    expect(() => parseSrdSubclasses(swapped)).toThrow(
      /four land tables in printed order/u,
    );
  });

  it('rejects stray prose in a subclass section', () => {
    expect(() =>
      parseSrdSubclasses(
        SOURCE.replace(
          '   Level 3: Frenzy',
          '   Level 3: Frenzy\n   This paragraph must never enter the manifest.',
        ),
      ),
    ).toThrow(/non-heading prose/u);
  });

  it('requires the attribution and SC-1 provenance preamble', () => {
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('This work includes', 'This includes')),
    ).toThrow(/required attribution and extract provenance preamble/u);

    const insertedHeaderProse = SOURCE.replace(
      'https://creativecommons.org/licenses/by/4.0/legalcode.\n\n',
      'https://creativecommons.org/licenses/by/4.0/legalcode.\n\nForeign prose does not belong in the header.\n\n',
    );
    expect(() => parseSrdSubclasses(insertedHeaderProse)).toThrow(
      /required attribution and extract provenance preamble/u,
    );
  });

  it('rejects the full two-column SRD text as parser input', () => {
    expect(() => parseSrdSubclasses(readFileSync(FULL_SOURCE_URL, 'utf8'))).toThrow(
      /required attribution and extract provenance preamble/u,
    );
  });

  it('rejects a missing or duplicate spell table', () => {
    const missing = SOURCE.replace('   Life Domain Spells\n', '');
    expect(() => parseSrdSubclasses(missing)).toThrow(SrdSubclassesError);

    const duplicate = SOURCE.replace(
      '   Life Domain Spells\n',
      '   Life Domain Spells\n   Life Domain Spells\n',
    );
    expect(() => parseSrdSubclasses(duplicate)).toThrow(SrdSubclassesError);
  });

  it('rejects an unknown spell rather than minting a key from its name', () => {
    expect(() =>
      parseSrdSubclasses(SOURCE.replace('Aid, Bless', 'Aid, Chronomancy')),
    ).toThrow(/unregistered spell "Chronomancy"/u);
  });
});
