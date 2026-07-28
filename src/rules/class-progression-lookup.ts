/**
 * The class names and progression tables in this file are derived from the
 * System Reference Document 5.2 and ship inside the bundle, so they carry the
 * same obligation as any bundled data file: see SRD_ATTRIBUTION_NOTICE in
 * ./srd-attribution, which the running application renders, and
 * docs/srd/ATTRIBUTION.md.
 */
import type { Ability, ProgressionType } from '../domain/enums';
import type { DatabaseContext } from '../db/database';
import { CasterContribution } from './caster-contribution';
import { contributesToSharedSlots } from './progression-type';
import {
  maxPreparableLevelForClass,
  pactMagic,
  slots,
  type PactMagicSlots,
  type SpellSlotCounts,
} from './spell-slots';

interface ClassSeed {
  readonly ability: Ability | null;
  readonly type: ProgressionType;
  readonly fraction: string | null;
  readonly rounding: string | null;
  readonly cantrips: readonly number[];
  readonly prepared: readonly number[];
}

type GrantRule = Readonly<Record<string, unknown>>;

const STANDARD_PREPARED = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20,
  21, 22,
] as const;

const SORCERER_PREPARED = [
  2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20,
  21, 22,
] as const;

const WIZARD_PREPARED = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23,
  24, 25,
] as const;

const HALF_PREPARED = [
  2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15,
  15,
] as const;

const WARLOCK_PREPARED = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15,
  15,
] as const;

const zeroes = () => Array.from({ length: 20 }, () => 0);

function cantrips(
  levelsOneToThree: number,
  levelsFourToNine: number,
  levelsTenToTwenty: number,
): readonly number[] {
  return [
    ...Array.from({ length: 3 }, () => levelsOneToThree),
    ...Array.from({ length: 6 }, () => levelsFourToNine),
    ...Array.from({ length: 11 }, () => levelsTenToTwenty),
  ];
}

function classSeeds(): Readonly<Record<string, ClassSeed>> {
  return {
    Barbarian: {
      ability: null,
      type: 'none',
      fraction: null,
      rounding: null,
      cantrips: zeroes(),
      prepared: zeroes(),
    },
    Bard: {
      ability: 'charisma',
      type: 'full',
      fraction: '1',
      rounding: null,
      cantrips: cantrips(2, 3, 4),
      prepared: STANDARD_PREPARED,
    },
    Cleric: {
      ability: 'wisdom',
      type: 'full',
      fraction: '1',
      rounding: null,
      cantrips: cantrips(3, 4, 5),
      prepared: STANDARD_PREPARED,
    },
    Druid: {
      ability: 'wisdom',
      type: 'full',
      fraction: '1',
      rounding: null,
      cantrips: cantrips(2, 3, 4),
      prepared: STANDARD_PREPARED,
    },
    Fighter: {
      ability: null,
      type: 'none',
      fraction: null,
      rounding: null,
      cantrips: zeroes(),
      prepared: zeroes(),
    },
    Monk: {
      ability: null,
      type: 'none',
      fraction: null,
      rounding: null,
      cantrips: zeroes(),
      prepared: zeroes(),
    },
    Paladin: {
      ability: 'charisma',
      type: 'half_up',
      fraction: '1/2',
      rounding: 'up',
      cantrips: zeroes(),
      prepared: HALF_PREPARED,
    },
    Ranger: {
      ability: 'wisdom',
      type: 'half_up',
      fraction: '1/2',
      rounding: 'up',
      cantrips: zeroes(),
      prepared: HALF_PREPARED,
    },
    Rogue: {
      ability: null,
      type: 'none',
      fraction: null,
      rounding: null,
      cantrips: zeroes(),
      prepared: zeroes(),
    },
    Sorcerer: {
      ability: 'charisma',
      type: 'full',
      fraction: '1',
      rounding: null,
      cantrips: cantrips(4, 5, 6),
      prepared: SORCERER_PREPARED,
    },
    Warlock: {
      ability: 'charisma',
      type: 'pact',
      fraction: null,
      rounding: null,
      cantrips: cantrips(2, 3, 4),
      prepared: WARLOCK_PREPARED,
    },
    Wizard: {
      ability: 'intelligence',
      type: 'full',
      fraction: '1',
      rounding: null,
      cantrips: cantrips(3, 4, 5),
      prepared: WIZARD_PREPARED,
    },
  };
}

const BUNDLED_RULES_EDITION = '2024';

/** Every bundled progression table covers character levels 1 through 20. */
const PROGRESSION_LEVELS = 20;

export function classContentKey(name: string): string {
  return `${BUNDLED_RULES_EDITION}:class:${name.toLowerCase()}`;
}

const ELDRITCH_KNIGHT_CONTENT_KEY = '2024:subclass:eldritch-knight';
const ARCANE_TRICKSTER_CONTENT_KEY = '2024:subclass:arcane-trickster';

/**
 * Content keys of every class and subclass this module bundles. The seeder
 * writes exactly these; `hasBundledClassContent` reads exactly these.
 */
export function bundledClassContentKeys(): {
  readonly classes: readonly string[];
  readonly subclasses: readonly string[];
} {
  return {
    classes: Object.keys(classSeeds()).map(classContentKey),
    subclasses: [ELDRITCH_KNIGHT_CONTENT_KEY, ARCANE_TRICKSTER_CONTENT_KEY],
  };
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function countRows(
  db: DatabaseContext,
  sql: string,
  bind: readonly string[],
): number {
  return Number(db.scalar<number>(sql, [...bind]) ?? 0);
}

/**
 * True when every bundled class and subclass is present AND carries its full
 * twenty levels of progression rows. Used as the boot-time guard so a database
 * that already carries the content is not rewritten on every open.
 *
 * Counting the progression rows rather than only the definition keys matters:
 * a database holding the fourteen definition keys with missing progression rows
 * is broken — every level lookup on it throws — and a definitions-only guard
 * would declare it healthy and never repair it.
 */
export function hasBundledClassContent(db: DatabaseContext): boolean {
  const keys = bundledClassContentKeys();
  const classKeys = placeholders(keys.classes.length);
  const subclassKeys = placeholders(keys.subclasses.length);
  return (
    countRows(
      db,
      `SELECT count(*) FROM class_definitions
       WHERE content_key IN (${classKeys})`,
      keys.classes,
    ) === keys.classes.length &&
    countRows(
      db,
      `SELECT count(*) FROM class_progressions AS progression
       JOIN class_definitions AS definition
         ON definition.id = progression.class_definition_id
       WHERE definition.content_key IN (${classKeys})
         AND progression.class_level BETWEEN 1 AND ${PROGRESSION_LEVELS}`,
      keys.classes,
    ) ===
      keys.classes.length * PROGRESSION_LEVELS &&
    countRows(
      db,
      `SELECT count(*) FROM subclass_definitions
       WHERE content_key IN (${subclassKeys})`,
      keys.subclasses,
    ) === keys.subclasses.length &&
    countRows(
      db,
      `SELECT count(*) FROM subclass_progressions AS progression
       JOIN subclass_definitions AS definition
         ON definition.id = progression.subclass_definition_id
       WHERE definition.content_key IN (${subclassKeys})
         AND progression.class_level BETWEEN 1 AND ${PROGRESSION_LEVELS}`,
      keys.subclasses,
    ) ===
      keys.subclasses.length * PROGRESSION_LEVELS
  );
}

/**
 * Boot-time entry point: seeds the bundled class content when it is missing or
 * incomplete, and does nothing when it is already whole. Returns whether it
 * wrote anything.
 */
export function ensureBundledClassContent(db: DatabaseContext): boolean {
  if (hasBundledClassContent(db)) {
    return false;
  }
  seedClassProgressions(db);
  return true;
}

function jsonSlotCounts(value: SpellSlotCounts): string {
  return JSON.stringify(Object.keys(value).length === 0 ? [] : value);
}

function jsonPactSlots(value: PactMagicSlots | null): string {
  return JSON.stringify(value ?? []);
}

/**
 * Upserts one bundled class, or returns `null` when the `(name, rules_edition)`
 * slot is already held by a DIFFERENT content key — a user-authored "Wizard",
 * say. `class_definitions` is unique on both `content_key` and
 * `(name, rules_edition)`, so the two rows cannot coexist and the bundled row
 * has no claim to win: overwriting would silently replace content the user
 * authored, and inserting would abort the whole seed. Yielding the name and
 * seeding the other eleven classes is the only non-destructive option.
 */
function upsertClass(
  db: DatabaseContext,
  name: string,
  seed: ClassSeed,
  timestamp: string,
): number | null {
  const contentKey = classContentKey(name);
  const holder = db.scalar<string>(
    `SELECT content_key FROM class_definitions
     WHERE name = ? AND rules_edition = ?`,
    [name, BUNDLED_RULES_EDITION],
  );
  if (holder !== null && holder !== contentKey) {
    return null;
  }

  db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, spellcasting_ability, progression_type,
       caster_fraction, caster_rounding, prepares_or_knows,
       supports_ritual_casting, ritual_casting_mode, created_at, updated_at
     ) VALUES (?, ?, '2024', ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(content_key) DO UPDATE SET
       name = excluded.name,
       rules_edition = excluded.rules_edition,
       spellcasting_ability = excluded.spellcasting_ability,
       progression_type = excluded.progression_type,
       caster_fraction = excluded.caster_fraction,
       caster_rounding = excluded.caster_rounding,
       prepares_or_knows = excluded.prepares_or_knows,
       supports_ritual_casting = excluded.supports_ritual_casting,
       ritual_casting_mode = excluded.ritual_casting_mode,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [
      contentKey,
      name,
      seed.ability,
      seed.type,
      seed.fraction,
      seed.rounding,
      seed.ability === null ? null : 'prepared',
      seed.ability === null ? 0 : 1,
      name === 'Wizard'
        ? 'spellbook'
        : seed.ability === null
          ? null
          : 'prepared',
      timestamp,
      timestamp,
    ],
  );

  const id = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE content_key = ?',
    [contentKey],
  );
  if (id === null) {
    throw new Error(`Failed to persist class definition ${name}.`);
  }
  return id;
}

function classGrantRules(
  name: string,
  contribution: CasterContribution,
  cantripCount: number,
  preparedCount: number,
): GrantRule[] {
  if (contribution.progressionType === CasterContribution.NONE) {
    return [];
  }

  const key = name.toLowerCase();
  const rules: GrantRule[] = [];
  if (cantripCount > 0) {
    rules.push({
      kind: 'choice_from_list',
      rule_key: `${key}-cantrips`,
      count: cantripCount,
      bucket: 'cantrip_known',
      list: name,
      level_min: 0,
      level_max: 0,
      with_slots: false,
    });
  }
  if (preparedCount > 0) {
    rules.push({
      kind: 'choice_from_list',
      rule_key: `${key}-prepared`,
      count: preparedCount,
      bucket: 'prepared',
      list: name,
      level_min: 1,
      level_max: maxPreparableLevelForClass(contribution),
      with_slots: true,
    });
  }
  if (name === 'Cleric') {
    rules.push({
      kind: 'choice_from_list',
      rule_key: 'cleric-divine-order-cantrip',
      count: 1,
      bucket: 'cantrip_known',
      list: '$config.divine_order.chosen_list',
      level_min: 0,
      level_max: 0,
      with_slots: false,
      active_from_class_level: 1,
      active_if_config: {
        key: 'divine_order.chosen_option',
        equals: 'Thaumaturge',
      },
    });
  }
  if (name === 'Druid') {
    rules.push({
      kind: 'choice_from_list',
      rule_key: 'druid-primal-order-cantrip',
      count: 1,
      bucket: 'cantrip_known',
      list: '$config.primal_order.chosen_list',
      level_min: 0,
      level_max: 0,
      with_slots: false,
      active_from_class_level: 1,
      active_if_config: {
        key: 'primal_order.chosen_option',
        equals: 'Magician',
      },
    });
  }
  if (name === 'Warlock') {
    for (const [spellLevel, activeLevel] of [
      [6, 11],
      [7, 13],
      [8, 15],
      [9, 17],
    ] as const) {
      if (contribution.classLevel >= activeLevel) {
        rules.push({
          kind: 'choice_from_list',
          rule_key: `warlock-mystic-arcanum-${spellLevel}`,
          count: 1,
          bucket: 'prepared',
          list: 'Warlock',
          level_min: spellLevel,
          level_max: spellLevel,
          with_slots: false,
          free_cast: {
            uses: 1,
            recovery: 'long_rest',
            pool_scope: 'per_spell',
          },
        });
      }
    }
  }
  if (name === 'Wizard') {
    rules.push({
      kind: 'spellbook_acquisition',
      rule_key: 'wizard-spellbook',
      bucket: 'spellbook',
      list: 'Wizard',
      acquisitions_config: 'wizard_spellbook_acquisitions',
    });
    rules.push({
      kind: 'capability',
      rule_key: 'ritual-adept',
      capability_key: 'wizard-ritual-adept',
      collection: 'wizard_spellbook',
      tags: ['ritual'],
      access_mode: 'ritual_only',
    });
  }

  return rules;
}

function upsertClassProgression(
  db: DatabaseContext,
  classDefinitionId: number,
  classLevel: number,
  cantripCount: number,
  preparedCount: number,
  sharedSlots: SpellSlotCounts,
  pactSlots: PactMagicSlots | null,
  grantRules: readonly GrantRule[],
  timestamp: string,
): void {
  db.exec(
    `INSERT INTO class_progressions (
       class_definition_id, class_level, cantrips_known, prepared_count,
       slots, pact_slots, grant_rules, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(class_definition_id, class_level) DO UPDATE SET
       cantrips_known = excluded.cantrips_known,
       prepared_count = excluded.prepared_count,
       slots = excluded.slots,
       pact_slots = excluded.pact_slots,
       grant_rules = excluded.grant_rules,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [
      classDefinitionId,
      classLevel,
      cantripCount,
      preparedCount,
      jsonSlotCounts(sharedSlots),
      jsonPactSlots(pactSlots),
      JSON.stringify(grantRules),
      timestamp,
      timestamp,
    ],
  );
}

/**
 * Upserts one bundled third-caster subclass. Returns `null` when its parent
 * class was not seeded, or when the `(class, name, rules_edition)` slot is held
 * by a different content key — the same yield-to-the-user rule as `upsertClass`.
 * The parent is resolved by CONTENT KEY, never by name, so a user-authored
 * class that happens to be called "Fighter" can never adopt Eldritch Knight.
 */
function upsertThirdCaster(
  db: DatabaseContext,
  className: string,
  subclassName: string,
  contentKey: string,
  timestamp: string,
): number | null {
  const classId = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE content_key = ?',
    [classContentKey(className)],
  );
  if (classId === null) {
    return null;
  }
  const holder = db.scalar<string>(
    `SELECT content_key FROM subclass_definitions
     WHERE class_definition_id = ? AND name = ? AND rules_edition = ?`,
    [classId, subclassName, BUNDLED_RULES_EDITION],
  );
  if (holder !== null && holder !== contentKey) {
    return null;
  }

  db.exec(
    `INSERT INTO subclass_definitions (
       content_key, class_definition_id, name, rules_edition,
       spellcasting_ability, caster_fraction, caster_rounding,
       created_at, updated_at
     ) VALUES (?, ?, ?, '2024', 'intelligence', '1/3', 'down', ?, ?)
     ON CONFLICT(content_key) DO UPDATE SET
       class_definition_id = excluded.class_definition_id,
       name = excluded.name,
       rules_edition = excluded.rules_edition,
       spellcasting_ability = excluded.spellcasting_ability,
       caster_fraction = excluded.caster_fraction,
       caster_rounding = excluded.caster_rounding,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [contentKey, classId, subclassName, timestamp, timestamp],
  );

  const subclassId = db.scalar<number>(
    'SELECT id FROM subclass_definitions WHERE content_key = ?',
    [contentKey],
  );
  if (subclassId === null) {
    throw new Error(`Failed to persist subclass definition ${subclassName}.`);
  }
  return subclassId;
}

function thirdCasterSlots(classLevel: number): SpellSlotCounts {
  if (classLevel < 3) {
    return {};
  }
  if (classLevel === 3) {
    return { 1: 2 };
  }
  if (classLevel < 7) {
    return { 1: 3 };
  }
  if (classLevel < 10) {
    return { 1: 4, 2: 2 };
  }
  if (classLevel < 13) {
    return { 1: 4, 2: 3 };
  }
  if (classLevel < 16) {
    return { 1: 4, 2: 3, 3: 2 };
  }
  if (classLevel < 19) {
    return { 1: 4, 2: 3, 3: 3 };
  }
  return { 1: 4, 2: 3, 3: 3, 4: 1 };
}

function thirdCasterMaxSpellLevel(classLevel: number): number {
  if (classLevel < 3) {
    return 0;
  }
  if (classLevel < 7) {
    return 1;
  }
  if (classLevel < 13) {
    return 2;
  }
  if (classLevel < 19) {
    return 3;
  }
  return 4;
}

function seedThirdCasterProgression(
  db: DatabaseContext,
  subclassId: number,
  rulePrefix: string,
  prepared: readonly number[],
  startingCantrips: number,
  levelTenCantrips: number,
  timestamp: string,
): void {
  for (let classLevel = 1; classLevel <= PROGRESSION_LEVELS; classLevel++) {
    const cantripCount =
      classLevel < 3
        ? 0
        : classLevel < 10
          ? startingCantrips
          : levelTenCantrips;
    const preparedCount = prepared[classLevel - 1] ?? 0;
    const maxSpellLevel = thirdCasterMaxSpellLevel(classLevel);
    const classSlots = thirdCasterSlots(classLevel);
    const rules: GrantRule[] = [];

    if (cantripCount > 0) {
      rules.push({
        kind: 'choice_from_list',
        rule_key: `${rulePrefix}-cantrips`,
        count: cantripCount,
        bucket: 'cantrip_known',
        list: 'Wizard',
        level_min: 0,
        level_max: 0,
        with_slots: false,
      });
    }
    if (preparedCount > 0) {
      rules.push({
        kind: 'choice_from_list',
        rule_key: `${rulePrefix}-prepared`,
        count: preparedCount,
        bucket: 'prepared',
        list: 'Wizard',
        level_min: 1,
        level_max: maxSpellLevel,
        with_slots: true,
      });
    }

    db.exec(
      `INSERT INTO subclass_progressions (
         subclass_definition_id, class_level, cantrips_known, prepared_count,
         max_spell_level, slots, grant_rules, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(subclass_definition_id, class_level) DO UPDATE SET
         cantrips_known = excluded.cantrips_known,
         prepared_count = excluded.prepared_count,
         max_spell_level = excluded.max_spell_level,
         slots = excluded.slots,
         grant_rules = excluded.grant_rules,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [
        subclassId,
        classLevel,
        cantripCount,
        preparedCount,
        maxSpellLevel,
        jsonSlotCounts(classSlots),
        JSON.stringify(rules),
        timestamp,
        timestamp,
      ],
    );
  }
}

/**
 * Reconciles the PHP oracle's complete 2024 class and third-caster progression
 * catalog. Stable unique keys make reruns update rows without replacing IDs.
 *
 * A class or subclass whose name is already claimed by user-authored content is
 * skipped rather than overwritten, so this seeds as much of the bundle as the
 * database has room for instead of failing whole.
 */
export function seedClassProgressions(db: DatabaseContext): void {
  db.transaction(() => {
    const timestamp = new Date().toISOString();
    for (const [name, seed] of Object.entries(classSeeds())) {
      const classId = upsertClass(db, name, seed, timestamp);
      if (classId === null) {
        continue;
      }
      for (let classLevel = 1; classLevel <= PROGRESSION_LEVELS; classLevel++) {
        const contribution = new CasterContribution(
          name,
          classLevel,
          seed.type,
        );
        const cantripCount = seed.cantrips[classLevel - 1] ?? 0;
        const preparedCount = seed.prepared[classLevel - 1] ?? 0;
        upsertClassProgression(
          db,
          classId,
          classLevel,
          cantripCount,
          preparedCount,
          contributesToSharedSlots(seed.type) ? slots([contribution]) : {},
          seed.type === 'pact' ? pactMagic([contribution]) : null,
          classGrantRules(
            name,
            contribution,
            cantripCount,
            preparedCount,
          ),
          timestamp,
        );
      }
    }

    const eldritchKnightId = upsertThirdCaster(
      db,
      'Fighter',
      'Eldritch Knight',
      ELDRITCH_KNIGHT_CONTENT_KEY,
      timestamp,
    );
    const arcaneTricksterId = upsertThirdCaster(
      db,
      'Rogue',
      'Arcane Trickster',
      ARCANE_TRICKSTER_CONTENT_KEY,
      timestamp,
    );
    const thirdCasterPrepared = [
      0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13,
    ] as const;
    if (eldritchKnightId !== null) {
      seedThirdCasterProgression(
        db,
        eldritchKnightId,
        'eldritch-knight',
        thirdCasterPrepared,
        2,
        3,
        timestamp,
      );
    }
    if (arcaneTricksterId !== null) {
      seedThirdCasterProgression(
        db,
        arcaneTricksterId,
        'arcane-trickster',
        thirdCasterPrepared,
        3,
        4,
        timestamp,
      );
    }
  });
}

export class ClassProgressionLookup {
  constructor(private readonly db: DatabaseContext) {}

  preparedCountForCharacterClass(
    characterId: number,
    classDefinitionId: number,
  ): number {
    const classLevel = this.db.scalar<number>(
      `SELECT level
       FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classDefinitionId],
    );
    if (classLevel === null) {
      throw new Error(
        `Character ${characterId} does not have class ${classDefinitionId}.`,
      );
    }

    const preparedCount = this.db.scalar<number>(
      `SELECT prepared_count
       FROM class_progressions
       WHERE class_definition_id = ? AND class_level = ?`,
      [classDefinitionId, classLevel],
    );
    if (preparedCount === null) {
      throw new Error(
        `Class ${classDefinitionId} has no progression row at level ${classLevel}.`,
      );
    }

    return preparedCount;
  }
}
