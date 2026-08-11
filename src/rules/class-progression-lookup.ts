/**
 * The class names and progression tables in this file are derived from the
 * System Reference Document 5.2 and ship inside the bundle, so they carry the
 * same obligation as any bundled data file: see SRD_ATTRIBUTION_NOTICE in
 * ./srd-attribution, which the running application renders, and
 * docs/srd/ATTRIBUTION.md.
 */
import type { Ability, ProgressionType } from '../domain/enums';
import type { DatabaseContext } from '../db/database';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
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

export const BUNDLED_RULES_EDITION = '2024';

/**
 * The base Rogue Sneak Attack term, stored in migration-0042's general typed
 * contribution table. Its class-qualified source is the multiclass guard: the
 * expression can read Rogue levels only, never total character level.
 */
export const ROGUE_SNEAK_ATTACK_CONTRIBUTION = Object.freeze({
  contribution_key: 'sneak-attack',
  label: 'Sneak Attack',
  target_kind: 'feature_dice_count',
  target_key: 'sneak_attack',
  op: 'add',
  active_from_level: 1,
  active_to_level: 20,
  value_json: JSON.stringify({
    kind: 'scale',
    source: {
      kind: 'class_level',
      class_content_key: '2024:class:rogue',
    },
    divide: 2,
    round: 'ceiling',
  }),
  supersedes_ref: null,
});

/** Every bundled progression table covers character levels 1 through 20. */
const PROGRESSION_LEVELS = 20;

export function classContentKey(name: string): string {
  return `${BUNDLED_RULES_EDITION}:class:${name.toLowerCase()}`;
}

/**
 * Content keys of every class this module bundles. The seeder writes exactly
 * these; `hasBundledClassContent` reads exactly these.
 */
export function bundledClassContentKeys(): {
  readonly classes: readonly string[];
} {
  return {
    classes: Object.keys(classSeeds()).map(classContentKey),
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
 * True when every bundled class is present and carries its full twenty levels
 * of progression rows. Used as the boot-time guard so a database that already
 * carries the content is not rewritten on every open.
 *
 * Counting the progression rows rather than only the definition keys matters:
 * a database holding all twelve class definitions with missing progression
 * rows is broken — every level lookup on it throws — and a definitions-only
 * guard would declare it healthy and never repair it.
 */
export function hasBundledClassContent(db: DatabaseContext): boolean {
  const keys = bundledClassContentKeys();
  const classKeys = placeholders(keys.classes.length);
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
    hasBundledClassFeatureValueContributions(db, keys.classes)
  );
}

/** Exact manifest check: one Rogue row, and no unclaimed bundled-class rows. */
function hasBundledClassFeatureValueContributions(
  db: DatabaseContext,
  classKeys: readonly string[],
): boolean {
  const keySlots = placeholders(classKeys.length);
  const total = countRows(
    db,
    `SELECT count(*)
       FROM class_feature_value_contributions AS contribution
       JOIN class_definitions AS definition
         ON definition.id = contribution.class_definition_id
      WHERE definition.content_key IN (${keySlots})`,
    classKeys,
  );
  if (total !== 1) {
    return false;
  }
  const row = db.oneRaw(
    `SELECT contribution_key, label, target_kind, target_key, op,
            active_from_level, active_to_level, value_json, supersedes_ref
       FROM class_feature_value_contributions AS contribution
       JOIN class_definitions AS definition
         ON definition.id = contribution.class_definition_id
      WHERE definition.content_key = ?`,
    [classContentKey('Rogue')],
  );
  return row !== null &&
    row.contribution_key === ROGUE_SNEAK_ATTACK_CONTRIBUTION.contribution_key &&
    row.label === ROGUE_SNEAK_ATTACK_CONTRIBUTION.label &&
    row.target_kind === ROGUE_SNEAK_ATTACK_CONTRIBUTION.target_kind &&
    row.target_key === ROGUE_SNEAK_ATTACK_CONTRIBUTION.target_key &&
    row.op === ROGUE_SNEAK_ATTACK_CONTRIBUTION.op &&
    row.active_from_level === ROGUE_SNEAK_ATTACK_CONTRIBUTION.active_from_level &&
    row.active_to_level === ROGUE_SNEAK_ATTACK_CONTRIBUTION.active_to_level &&
    row.value_json === ROGUE_SNEAK_ATTACK_CONTRIBUTION.value_json &&
    row.supersedes_ref === null;
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
  ensureBundledStableContentIdentity(db, {
    kind: 'class',
    contentKey,
    normalizedName: normalizeContentIdentityName(name),
  });

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
      count: 6 + Math.max(0, contribution.classLevel - 1) * 2,
      initial_count: 6,
      count_per_level: 2,
      bucket: 'spellbook',
      list: 'Wizard',
      level_min: 1,
      level_max: maxPreparableLevelForClass(contribution),
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
 * Reconciles the PHP oracle's complete 2024 class progression catalog. Stable
 * unique keys make reruns update rows without replacing IDs.
 *
 * A class whose name is already claimed by user-authored content is skipped
 * rather than overwritten, so this seeds as much of the bundle as the database
 * has room for instead of failing whole.
 */
export function seedClassProgressions(db: DatabaseContext): void {
  db.transaction(() => {
    const timestamp = new Date().toISOString();
    for (const [name, seed] of Object.entries(classSeeds())) {
      const classId = upsertClass(db, name, seed, timestamp);
      if (classId === null) {
        continue;
      }
      // Base classes are bundled-only (D133), so this owner-specific child set
      // is source-replaced exactly like the progression rows it accompanies.
      // Replacing the set repairs deletion, key drift, and unexpected extras.
      db.exec(
        'DELETE FROM class_feature_value_contributions WHERE class_definition_id = ?',
        [classId],
      );
      if (name === 'Rogue') {
        const contribution = ROGUE_SNEAK_ATTACK_CONTRIBUTION;
        db.exec(
          `INSERT INTO class_feature_value_contributions (
             class_definition_id, contribution_key, label, target_kind,
             target_key, op, active_from_level, active_to_level, value_json,
             supersedes_ref, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            classId,
            contribution.contribution_key,
            contribution.label,
            contribution.target_kind,
            contribution.target_key,
            contribution.op,
            contribution.active_from_level,
            contribution.active_to_level,
            contribution.value_json,
            contribution.supersedes_ref,
            timestamp,
            timestamp,
          ],
        );
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
