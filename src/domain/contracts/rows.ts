import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import {
  COLUMN_FACTS,
  type AnyColumnKey,
  type DegradedColumnKey,
} from './generated/column-facts';
import {
  JSON_COLUMNS,
  jsonColumnError,
  type JsonColumnKey,
} from './json-columns';
import type { BackupTable, TableFor } from './tables';
import {
  abilities,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  domainSourceTypes,
  rulesEditions,
  selectionEligibilities,
  slotBuckets,
  skills,
  slotStates,
  speciesTraitEffectKinds,
  srdWeaponGroups,
  weaponMasteryGrants,
  weaponMasteryProperties,
} from '../enums';

/**
 * PER-TABLE ROW CONTRACTS FOR UNTRUSTED ROWS.
 *
 * The portable character backup is a foreign artifact: a JSON document a user
 * hands us, whose `tables.<name>[]` entries are written into SQLite VERBATIM BY
 * COLUMN NAME (`insertPortableRow` in `src/backup/character-backup.ts`). Before
 * this module the backup validator checked ownership, unique ids and catalog
 * references but NEVER the shape of a row — a row carrying an unknown column
 * reached the INSERT statement, and a row carrying a JSON object where a string
 * belongs reached the driver.
 *
 * WHERE THE CONTRACTS COME FROM.
 * `generated/column-facts.ts` is produced at build time by running drizzle-zod
 * over `db/schema/*.ts`. It is the single source of truth for which columns
 * exist and which are nullable. This module never restates either.
 *
 * WHAT DRIZZLE-ZOD COULD NOT DO, AND WHAT REPLACES IT.
 * 223 of the schema's 332 columns — 72 of the 118 in the tables contracted here
 * — come out of drizzle-zod as `z.any()`, because every text-ish column is a
 * Drizzle `customType` (`db/schema/columns.ts`) and a custom type carries no
 * runtime schema. Shipping those as `z.any()` would be validation theatre, so
 * every one of them is refined: eight are JSON columns whose shape comes from
 * `./json-columns.ts`, and the remaining 64 are refined by `REFINEMENTS` below.
 * The split is COMPILE-ENFORCED and the two sides cannot overlap:
 * `REFINEMENTS satisfies Record<RequiredRefinementKey, …>` fails to compile if a
 * degraded column has neither a refinement nor a JSON classification, and
 * `RequiredRefinementKey` excludes the JSON columns, so declaring one in both
 * places is also a compile error.
 *
 * JSON COLUMNS ARE CLASSIFIED ELSEWHERE, ON PURPOSE.
 * `./json-columns.ts` says which TEXT columns hold serialized JSON and what
 * shape each column's READER requires. A single "parses as JSON" refinement was
 * measured to be wrong in both directions — `allowed_spell_lists = '{}'` parses
 * and then silently erases a slot's spell restrictions, while `config = ''` is
 * refused here although `jsonRecord` deliberately reads it as `{}`. The
 * classification is shared with `src/db/candidate-audit.ts` so a backup document
 * and a restored image are held to exactly the same standard.
 *
 * THE D6b GUARD, AND EXACTLY WHAT IT DOES NOT SEE.
 * D6b governs: "a contract stricter than the column will reject valid rows on
 * import, which is a data-loss bug". `_NoOverTightening` at the bottom of this
 * file discharges the part of that a type can discharge — see its own comment
 * for the precise, deliberately narrow claim. It does NOT see any narrowing that
 * `z.infer` erases, and `.min(1)` on a `varchar NOT NULL` is exactly such a
 * narrowing: the model type is `string`, `''` is a member of it, and the guard
 * still compiles. Those narrowings are therefore declared by hand in
 * {@link NARROWED_REFINEMENTS} and each one is proved to reject by
 * `tests/unit/contracts/row-contracts.test.ts`. A new ad-hoc narrowing cannot be
 * smuggled in: every value of `REFINEMENTS` must be one of the shared schemas in
 * {@link COLUMN_REFINEMENTS}, and that is asserted by test.
 *
 * DELIBERATELY NOT PINNED.
 * Timestamp FORMAT is not constrained past "is a string". The writers disagree
 * — `src/character/character-state.ts` uses SQLite `CURRENT_TIMESTAMP`
 * (`YYYY-MM-DD HH:MM:SS`) while ~20 call sites use `new Date().toISOString()`
 * — so any single format would reject rows this application itself produces.
 * `z.string()` is still a real constraint: it refuses the objects, arrays and
 * numbers that a hostile document would use.
 *
 * STRING LENGTH is not constrained either, except on the two columns where the
 * pre-existing validator already required non-emptiness. An empty
 * `display_name` or `slot_key` is a poor row, not a dangerous one, and refusing
 * it would reject a row the schema permits for no security gain.
 */

// --- shared column refinements -------------------------------------------

/** Any TEXT/VARCHAR value. Rejects every non-string, which is the point. */
const sqlText = z.string();

/**
 * TEXT/VARCHAR that must not be empty.
 *
 * Used on exactly the two columns where the PRE-EXISTING backup validator
 * already required a non-empty string, so this changes nothing about which
 * documents are accepted: `characters.name`
 * (`Character backup character.name must be a non-empty string`) and
 * `character_source_instances.instance_uuid`
 * (`instance_uuid must be a unique non-empty string`). Both of those checks are
 * still in `src/backup/character-backup.ts` and both are stricter than this one.
 * It is registered in {@link NARROWED_REFINEMENTS} regardless, because the
 * compile guard cannot see it.
 */
const nonEmptyText = z.string().min(1);

/** A DATETIME column. Format deliberately unpinned — see the module comment. */
const sqlTimestamp = z.string();

/**
 * A `TINYINT(1)` column.
 *
 * SQLite stores 0/1 and the export path produces numbers, but the pre-existing
 * validator accepted a JSON `true`/`false` for `characters.allow_legacy`, and
 * narrowing that away here would be a weakening of nothing and a rejection of
 * documents that are accepted today.
 */
const sqlBool = z.union([z.literal(0), z.literal(1), z.boolean()]);

/** A row id or a reference to one. */
const positiveInt = z.int().min(1);

/** An ability score, matching the range the backup validator already enforced. */
const abilityScore = z.int().min(1).max(30);

/**
 * A CLASS level, 1..20, matching the CHECK its column already carries.
 *
 * D13 recorded this as a divergence and said which way to close it: the schema
 * constrains `class_weapon_mastery_counts.class_level` to 1..20, the contract
 * accepted any positive integer, and the fix is to TIGHTEN the contract rather
 * than loosen the constraint.
 *
 * Tightening cannot lose data. The CHECK has been on the table since it was
 * created, so no database can hold a row outside the range, and a portable
 * backup is generated from such a database — there is no legitimate document
 * carrying a class level of 0 or 21 for this contract to reject.
 */
const classLevel = z.int().min(1).max(20);

const nonNegativeInt = z.int().min(0);

/** What an `integer()` column gets when it needs nothing narrower. */
const sqlInteger = z.int();

const rulesEditionEnum = z.enum(rulesEditions);
const abilityEnum = z.enum(abilities);
const sourceTypeEnum = z.enum(domainSourceTypes);
const slotBucketEnum = z.enum(slotBuckets);
const slotStateEnum = z.enum(slotStates);
const selectionEligibilityEnum = z.enum(selectionEligibilities);
const weaponMasteryPropertyEnum = z.enum(weaponMasteryProperties);
const weaponMasteryGrantEnum = z.enum(weaponMasteryGrants);
const srdWeaponGroupEnum = z.enum(srdWeaponGroups);
/**
 * The closed set of mechanical effects a species trait may carry.
 *
 * An enum and not `sqlText`, unlike `creature_type` / `size` /
 * `effect_damage_type` beside it — the difference is not tidiness. Those three
 * are OPEN vocabularies by decision (see `db/schema/origins.ts`), so a
 * contract narrowing them would reject rows the schema permits. `effect_kind`
 * is closed in the schema too, by
 * `species_template_traits_effect_kind_check`, and a value outside it reads as
 * "no effect" to `src/rules/species-effects.ts` — a trait whose mechanics
 * vanish with no error anywhere.
 */
const speciesTraitEffectKindEnum = z.enum(speciesTraitEffectKinds);
const armorSlotEnum = z.enum(armorSlots);
const armorCategoryEnum = z.enum(armorCategories);
const armorDexBonusEnum = z.enum(armorDexBonuses);
/**
 * The eighteen skills, closed. An enum rather than `sqlText` for the reason
 * `character_skill_proficiencies_skill_check` gives: `abilityForSkill` is an
 * exhaustive map over exactly this vocabulary, so a nineteenth value has no
 * ability to be checked with and reads as "no modifier" to any non-exhaustive
 * branch — a proficiency that vanishes with no error anywhere.
 */
const skillEnum = z.enum(skills);

/**
 * THE CLOSED SET of shared refinements.
 *
 * `REFINEMENTS` below may only use these. The test that asserts it is what stops
 * someone adding an inline `z.string().min(3)` to one column: an unregistered
 * schema fails the closed-set check, and a registered one must declare whether
 * it narrows the model type.
 */
export const COLUMN_REFINEMENTS = {
  sqlText,
  nonEmptyText,
  sqlTimestamp,
  sqlBool,
  positiveInt,
  abilityScore,
  classLevel,
  nonNegativeInt,
  sqlInteger,
  rulesEditionEnum,
  abilityEnum,
  sourceTypeEnum,
  slotBucketEnum,
  slotStateEnum,
  selectionEligibilityEnum,
  weaponMasteryPropertyEnum,
  weaponMasteryGrantEnum,
  srdWeaponGroupEnum,
  speciesTraitEffectKindEnum,
  armorSlotEnum,
  armorCategoryEnum,
  armorDexBonusEnum,
  skillEnum,
} as const;

/**
 * EVERY REFINEMENT THAT ACCEPTS LESS THAN THE DRIZZLE MODEL TYPE PERMITS.
 *
 * `_NoOverTightening` compares `z.infer` of the contract against
 * `InferSelectModel` of the table, and `z.infer` erases `.min()`, `.max()` and
 * `.refine()` — `z.string().min(1)` infers as `string`, so a length constraint
 * is invisible to it. Rather than let that hide, each such narrowing is listed
 * here with the value it refuses and the reason it is defensible, and
 * `tests/unit/contracts/row-contracts.test.ts` proves every `rejects` value is
 * genuinely refused. Enum refinements are absent on purpose: `z.enum` DOES
 * survive `z.infer`, so the compile guard already proves each enum matches the
 * column's declared domain type.
 */
export const NARROWED_REFINEMENTS: readonly {
  readonly name: keyof typeof COLUMN_REFINEMENTS;
  readonly rejects: unknown;
  readonly reason: string;
}[] = [
  {
    name: 'nonEmptyText',
    rejects: '',
    reason:
      'Pre-existing: the backup validator already refused an empty characters.name and instance_uuid, with stricter checks that still run.',
  },
  {
    name: 'positiveInt',
    rejects: 0,
    reason:
      'Pre-existing: `positiveInteger()` in the backup validator refused a non-positive id, reference or proficiency_bonus_override.',
  },
  {
    name: 'abilityScore',
    rejects: 31,
    reason:
      'Pre-existing: the backup validator required 1..30, and `update-ability.ts:30` enforces the same range on every write.',
  },
  {
    name: 'classLevel',
    rejects: 21,
    reason:
      'Matches the `class_level BETWEEN 1 AND 20` CHECK the column has carried since the table was created, so no stored row and no backup generated from one can fall outside it (D13).',
  },
  {
    name: 'nonNegativeInt',
    rejects: -1,
    reason:
      'Pre-existing for characters.revision. New for spell_selection_slots.ordinal, whose only writer is a loop index — a negative ordinal cannot be produced by this application.',
  },
  {
    name: 'sqlInteger',
    rejects: 1.5,
    reason:
      'What drizzle-zod itself established for an `integer()` column, and what the pre-existing validator asserted with `Number.isSafeInteger`.',
  },
];

// --- the tables that get a row contract ------------------------------------

/**
 * Every table whose rows a portable backup writes.
 *
 * `BackupTable` is derived from `TABLE_SCOPES`, so classifying a new table as
 * `backup: true` makes it a member here — and since `REFINEMENTS` must then
 * cover its degraded columns, the new table cannot reach `insertPortableRow`
 * without a contract. `characters` is added by hand because the aggregate root
 * is deliberately all-false in the scope table: it travels in the document's
 * own `character` field, not through the table loop.
 */
export type RowContractTable =
  | 'characters'
  | BackupTable
  | NativeContractTable;

/**
 * Tables that get a row contract WITHOUT being backup-scoped.
 *
 * `BackupTable` is the reason most contracts exist — a backup document is a
 * foreign artifact written into SQLite verbatim by column name — but it is not
 * the only reason a row can be untrusted or worth checking before it is
 * written:
 *
 *  - `weapon_templates` rows are PARSED out of `docs/srd/source/weapons-table.txt`
 *    by `src/rules/weapons-srd.ts`. A parser is exactly the kind of writer that
 *    can produce a plausible-looking wrong row, and the contract is what stands
 *    between a mis-parse and 38 quietly wrong catalog entries.
 *  - `character_weapons` rows are assembled from a user-authored command
 *    payload in `src/commands/weapons.ts`.
 *  - the two mastery tables are seeded from the progression extract by the same
 *    parser.
 *
 * Listing them here is what makes their nullability DERIVED rather than
 * restated: `columnSchema` reads `COLUMN_FACTS`, and `_NoOverTightening` below
 * fails to compile if any of these contracts refuses a value the column allows.
 */
type NativeContractTable =
  | 'character_weapons'
  | 'weapon_templates'
  | 'class_weapon_mastery_grants'
  | 'class_weapon_mastery_counts'
  // The origins TEMPLATE tables. Same reason `weapon_templates` is here: their
  // rows are PARSED out of `docs/srd/source/species-descriptions.txt` and
  // `docs/srd/source/backgrounds.txt` by `src/rules/origins-srd.ts`, and a
  // parser is exactly the writer that can produce a plausible-looking wrong
  // row. The three CHARACTER-side origin tables are not listed: they are
  // `backup: true` and arrive through `BackupTable` already.
  | 'species_templates'
  | 'species_template_traits'
  | 'background_templates';

type Facts = typeof COLUMN_FACTS;

/**
 * A degraded column needs a refinement UNLESS it is a JSON column, which gets
 * its contract from `./json-columns.ts` instead. Excluding them from both key
 * unions makes the two sources mutually exclusive by construction: a column
 * cannot be classified in both places, so there is never a question of which
 * one wins.
 */
type RequiredRefinementKey = Exclude<
  { [T in RowContractTable]: DegradedColumnKey<T> }[RowContractTable],
  JsonColumnKey
>;

type OptionalRefinementKey = Exclude<
  { [T in RowContractTable]: AnyColumnKey<T> }[RowContractTable],
  JsonColumnKey
>;

/**
 * THE REFINEMENT TABLE.
 *
 * Required for every column drizzle-zod degraded to `z.any()` that is not a
 * classified JSON column; permitted for any other contracted column that
 * deserves a narrower check than "an integer".
 *
 * The enum choices are NOT a second transcription of the schema: the Drizzle
 * declaration writes `varchar<RulesEdition>()` using the type from
 * `src/domain/enums.ts` and this table uses the VALUE array from that same
 * module, so there is one source. `_NoOverTightening` proves the pairing —
 * naming the wrong enum for a column stops compiling.
 *
 * Columns declared as a plain `varchar()` deliberately get a text refinement
 * rather than an enum even where a single writer happens to produce enum-like
 * values (`eligibility_kind`, `character_source_instances.state`): inventing a
 * constraint the schema does not declare is exactly the over-tightening D6b
 * forbids.
 */
const REFINEMENTS = {
  // --- characters ---------------------------------------------------------
  'characters.id': positiveInt,
  'characters.name': nonEmptyText,
  'characters.strength': abilityScore,
  'characters.dexterity': abilityScore,
  'characters.constitution': abilityScore,
  'characters.intelligence': abilityScore,
  'characters.wisdom': abilityScore,
  'characters.charisma': abilityScore,
  'characters.proficiency_bonus_override': positiveInt,
  'characters.rules_edition_preference': rulesEditionEnum,
  'characters.allow_legacy': sqlBool,
  'characters.revision': nonNegativeInt,
  'characters.notes': sqlText,
  'characters.created_at': sqlTimestamp,
  'characters.updated_at': sqlTimestamp,

  // --- character_class_levels ---------------------------------------------
  'character_class_levels.id': positiveInt,
  'character_class_levels.character_id': positiveInt,
  'character_class_levels.class_definition_id': positiveInt,
  'character_class_levels.subclass_definition_id': positiveInt,
  'character_class_levels.level': positiveInt,
  'character_class_levels.is_starting_class': sqlBool,
  'character_class_levels.spellcasting_ability_override': abilityEnum,
  'character_class_levels.notes': sqlText,
  'character_class_levels.created_at': sqlTimestamp,
  'character_class_levels.updated_at': sqlTimestamp,

  // --- character_source_instances -----------------------------------------
  'character_source_instances.id': positiveInt,
  'character_source_instances.character_id': positiveInt,
  'character_source_instances.instance_uuid': nonEmptyText,
  'character_source_instances.parent_source_instance_id': positiveInt,
  'character_source_instances.source_type': sourceTypeEnum,
  'character_source_instances.source_definition_id': positiveInt,
  'character_source_instances.display_name': sqlText,
  'character_source_instances.state': sqlText,
  'character_source_instances.notes': sqlText,
  'character_source_instances.created_at': sqlTimestamp,
  'character_source_instances.updated_at': sqlTimestamp,

  // --- spell_selection_slots ----------------------------------------------
  'spell_selection_slots.id': positiveInt,
  'spell_selection_slots.character_id': positiveInt,
  'spell_selection_slots.source_instance_id': positiveInt,
  'spell_selection_slots.slot_key': sqlText,
  'spell_selection_slots.rule_key': sqlText,
  'spell_selection_slots.ordinal': nonNegativeInt,
  'spell_selection_slots.bucket': slotBucketEnum,
  'spell_selection_slots.eligibility_kind': sqlText,
  'spell_selection_slots.fixed_spell_version_id': positiveInt,
  'spell_selection_slots.current_spell_version_id': positiveInt,
  'spell_selection_slots.label': sqlText,
  'spell_selection_slots.always_prepared': sqlBool,
  'spell_selection_slots.with_slots': sqlBool,
  'spell_selection_slots.counts_against_limit': sqlBool,
  'spell_selection_slots.required': sqlBool,
  'spell_selection_slots.is_locked': sqlBool,
  'spell_selection_slots.state': slotStateEnum,
  'spell_selection_slots.orphan_reason_code': sqlText,
  'spell_selection_slots.orphaned_at': sqlTimestamp,
  'spell_selection_slots.override_note': sqlText,
  'spell_selection_slots.notes': sqlText,
  'spell_selection_slots.created_at': sqlTimestamp,
  'spell_selection_slots.updated_at': sqlTimestamp,
  'spell_selection_slots.selection_collection': sqlText,
  'spell_selection_slots.selection_eligibility': selectionEligibilityEnum,
  'spell_selection_slots.selection_invalid_reason': sqlText,

  // --- wizard_spellbook_entries -------------------------------------------
  'wizard_spellbook_entries.id': positiveInt,
  'wizard_spellbook_entries.character_id': positiveInt,
  'wizard_spellbook_entries.spell_version_id': positiveInt,
  'wizard_spellbook_entries.created_at': sqlTimestamp,
  'wizard_spellbook_entries.updated_at': sqlTimestamp,

  // --- character_spell_preferences ----------------------------------------
  'character_spell_preferences.id': positiveInt,
  'character_spell_preferences.character_id': positiveInt,
  'character_spell_preferences.spell_version_id': positiveInt,
  'character_spell_preferences.favourite': sqlBool,
  'character_spell_preferences.notes': sqlText,
  'character_spell_preferences.created_at': sqlTimestamp,
  'character_spell_preferences.updated_at': sqlTimestamp,

  // --- character_rule_overrides -------------------------------------------
  'character_rule_overrides.id': positiveInt,
  'character_rule_overrides.character_id': positiveInt,
  'character_rule_overrides.rule_key': sqlText,
  'character_rule_overrides.note': sqlText,
  'character_rule_overrides.created_at': sqlTimestamp,
  'character_rule_overrides.updated_at': sqlTimestamp,

  // --- warning_acknowledgements -------------------------------------------
  'warning_acknowledgements.id': positiveInt,
  'warning_acknowledgements.character_id': positiveInt,
  'warning_acknowledgements.warning_fingerprint': sqlText,
  'warning_acknowledgements.note': sqlText,
  'warning_acknowledgements.invalidated_at': sqlTimestamp,
  'warning_acknowledgements.created_at': sqlTimestamp,
  'warning_acknowledgements.updated_at': sqlTimestamp,

  // --- character_save_points ----------------------------------------------
  'character_save_points.id': positiveInt,
  'character_save_points.character_id': positiveInt,
  // A save-point label is user-authored free text; an empty one is a poor label,
  // not an invalid row.
  'character_save_points.label': sqlText,
  // Not an enum: the one accepted value is asserted by the backup validator and
  // by the audit, which both compare against CHARACTER_SNAPSHOT_SCHEMA_VERSION.
  'character_save_points.schema_version': sqlText,
  'character_save_points.created_at': sqlTimestamp,
  'character_save_points.updated_at': sqlTimestamp,

  // --- spell_loadouts ------------------------------------------------------
  'spell_loadouts.id': positiveInt,
  'spell_loadouts.character_id': positiveInt,
  'spell_loadouts.name': sqlText,
  'spell_loadouts.notes': sqlText,
  'spell_loadouts.created_at': sqlTimestamp,
  'spell_loadouts.updated_at': sqlTimestamp,

  // --- spell_loadout_entries ----------------------------------------------
  'spell_loadout_entries.id': positiveInt,
  'spell_loadout_entries.spell_loadout_id': positiveInt,
  'spell_loadout_entries.spell_version_id': positiveInt,
  'spell_loadout_entries.role': sqlText,
  'spell_loadout_entries.created_at': sqlTimestamp,
  'spell_loadout_entries.updated_at': sqlTimestamp,

  // --- character_weapons ---------------------------------------------------
  // NOTE THE NULLABLE COLUMNS ARE NOT LISTED AS NULLABLE HERE. `columnSchema`
  // adds `| null` from `COLUMN_FACTS[table][column].notNull`, so a contract can
  // never be stricter than its column by accident — which is the whole D6b
  // point, and the reason `damage_dice` below reads exactly like
  // `weapon_templates.damage_dice` although one is nullable and one is not.
  'character_weapons.id': positiveInt,
  'character_weapons.character_id': positiveInt,
  // Non-empty: a weapon with no name cannot be picked out of a list, and the
  // add/update commands already refuse one.
  'character_weapons.name': nonEmptyText,
  // Free text, NOT a dice-expression pattern. The source's own Blowgun row is
  // `1 Piercing` — a flat number — and a user may write anything their table
  // agreed on. Pinning a `NdM` shape here would reject rows the schema permits.
  'character_weapons.damage_dice': sqlText,
  'character_weapons.damage_type': sqlText,
  'character_weapons.versatile_damage_dice': sqlText,
  'character_weapons.finesse': sqlBool,
  'character_weapons.heavy': sqlBool,
  'character_weapons.light': sqlBool,
  'character_weapons.loading': sqlBool,
  'character_weapons.reach': sqlBool,
  'character_weapons.thrown': sqlBool,
  'character_weapons.two_handed': sqlBool,
  'character_weapons.ammunition': sqlBool,
  'character_weapons.ammunition_kind': sqlText,
  'character_weapons.mastery_property': weaponMasteryPropertyEnum,
  'character_weapons.mastery_selected': sqlBool,
  'character_weapons.other_properties': sqlText,
  'character_weapons.notes': sqlText,
  'character_weapons.created_at': sqlTimestamp,
  'character_weapons.updated_at': sqlTimestamp,

  // --- the four stored sheet inputs ----------------------------------------
  // Nullability is DERIVED, not restated: `columnSchema` adds `| null` from
  // `COLUMN_FACTS[table][column].notNull`, so none of these can be stricter
  // than its column by accident.
  'character_armor.id': positiveInt,
  'character_armor.character_id': positiveInt,
  'character_armor.slot': armorSlotEnum,
  // Non-empty: armour with no name cannot be told apart from the unarmoured
  // case on the sheet, and the write command already refuses one.
  'character_armor.name': nonEmptyText,
  'character_armor.category': armorCategoryEnum,
  // At least 1 for every category. For `light`/`medium`/`heavy` this is a base
  // Armor Class and for `shield` it is the printed `+2` bonus — a distinction
  // `category` carries, not this contract.
  'character_armor.armor_class': positiveInt,
  'character_armor.dex_bonus': armorDexBonusEnum,
  // ZERO IS LEGITIMATE and `positiveInt` would be wrong: a cap of 0 is a
  // coherent house rule, and the pairing with `dex_bonus = 'capped'` is what
  // the CHECK enforces, not the magnitude.
  'character_armor.dex_bonus_max': nonNegativeInt,
  'character_armor.strength_requirement': positiveInt,
  'character_armor.stealth_disadvantage': sqlBool,
  'character_armor.notes': sqlText,
  'character_armor.created_at': sqlTimestamp,
  'character_armor.updated_at': sqlTimestamp,

  'character_hit_point_rolls.id': positiveInt,
  'character_hit_point_rolls.character_id': positiveInt,
  // The class this roll is filed under, by NAME. Non-empty because an empty
  // name matches no class and the roll would be permanently unreadable.
  'character_hit_point_rolls.class_name': nonEmptyText,
  'character_hit_point_rolls.class_level': classLevel,
  // `positiveInt` and not the tighter 1..12 the CHECK declares, deliberately
  // and in the same direction as `class_weapon_mastery_counts.class_level`: the
  // contract may not be STRICTER than the column, and the upper bound belongs
  // to the database and to the two boundaries, which all read
  // `SHEET_ROLL_BOUNDS`. A 13 clears this contract and dies at the CHECK.
  'character_hit_point_rolls.rolled_value': positiveInt,
  'character_hit_point_rolls.created_at': sqlTimestamp,
  'character_hit_point_rolls.updated_at': sqlTimestamp,

  'character_skill_proficiencies.id': positiveInt,
  'character_skill_proficiencies.character_id': positiveInt,
  'character_skill_proficiencies.skill': skillEnum,
  'character_skill_proficiencies.created_at': sqlTimestamp,
  'character_skill_proficiencies.updated_at': sqlTimestamp,

  'character_sheet_adjustments.id': positiveInt,
  'character_sheet_adjustments.character_id': positiveInt,
  // SIGNED — `sqlInteger`, never `nonNegativeInt`. A negative adjustment is a
  // cursed item or a house rule, and refusing it would invent a rule the source
  // does not state. The symmetric magnitude bound is the CHECK's and the two
  // boundaries', all from `SHEET_ADJUSTMENT_BOUNDS`.
  'character_sheet_adjustments.armor_class_adjustment': sqlInteger,
  'character_sheet_adjustments.armor_class_adjustment_note': sqlText,
  'character_sheet_adjustments.created_at': sqlTimestamp,
  'character_sheet_adjustments.updated_at': sqlTimestamp,

  // --- weapon_templates ----------------------------------------------------
  'weapon_templates.id': positiveInt,
  'weapon_templates.content_key': nonEmptyText,
  'weapon_templates.rules_edition': rulesEditionEnum,
  'weapon_templates.name': nonEmptyText,
  'weapon_templates.srd_group': srdWeaponGroupEnum,
  'weapon_templates.damage_dice': nonEmptyText,
  'weapon_templates.damage_type': nonEmptyText,
  'weapon_templates.versatile_damage_dice': sqlText,
  'weapon_templates.finesse': sqlBool,
  'weapon_templates.heavy': sqlBool,
  'weapon_templates.light': sqlBool,
  'weapon_templates.loading': sqlBool,
  'weapon_templates.reach': sqlBool,
  'weapon_templates.thrown': sqlBool,
  'weapon_templates.two_handed': sqlBool,
  'weapon_templates.ammunition': sqlBool,
  'weapon_templates.ammunition_kind': sqlText,
  'weapon_templates.mastery_property': weaponMasteryPropertyEnum,
  'weapon_templates.other_properties': sqlText,
  'weapon_templates.created_at': sqlTimestamp,
  'weapon_templates.updated_at': sqlTimestamp,

  // --- class weapon mastery content ---------------------------------------
  'class_weapon_mastery_grants.id': positiveInt,
  'class_weapon_mastery_grants.class_definition_id': positiveInt,
  'class_weapon_mastery_grants.grant': weaponMasteryGrantEnum,
  'class_weapon_mastery_grants.created_at': sqlTimestamp,
  'class_weapon_mastery_grants.updated_at': sqlTimestamp,
  'class_weapon_mastery_counts.id': positiveInt,
  'class_weapon_mastery_counts.class_definition_id': positiveInt,
  'class_weapon_mastery_counts.class_level': classLevel,
  // Zero is a legitimate mastery count in principle and no printed row carries
  // one, so this is `nonNegativeInt` rather than `positiveInt`: refusing 0
  // would be inventing a rule the source does not state.
  'class_weapon_mastery_counts.mastery_count': nonNegativeInt,
  'class_weapon_mastery_counts.created_at': sqlTimestamp,
  'class_weapon_mastery_counts.updated_at': sqlTimestamp,

  // --- species_templates ---------------------------------------------------
  'species_templates.id': positiveInt,
  'species_templates.content_key': nonEmptyText,
  'species_templates.rules_edition': rulesEditionEnum,
  'species_templates.name': nonEmptyText,
  // `sqlText` and NOT an enum: both are deliberately OPEN vocabularies in the
  // schema, and a contract tighter than its column rejects rows the schema
  // permits — the D6b failure this module exists to avoid.
  'species_templates.creature_type': sqlText,
  'species_templates.size': sqlText,
  'species_templates.alternate_size': sqlText,
  'species_templates.base_speed_feet': positiveInt,
  'species_templates.created_at': sqlTimestamp,
  'species_templates.updated_at': sqlTimestamp,

  // --- species_template_traits ---------------------------------------------
  'species_template_traits.id': positiveInt,
  'species_template_traits.species_template_id': positiveInt,
  'species_template_traits.sort_order': positiveInt,
  'species_template_traits.name': nonEmptyText,
  // Non-empty: every printed trait has text, and an empty description here is a
  // two-column mis-join rather than a trait.
  'species_template_traits.description': nonEmptyText,
  'species_template_traits.effect_kind': speciesTraitEffectKindEnum,
  'species_template_traits.effect_damage_type': sqlText,
  'species_template_traits.created_at': sqlTimestamp,
  'species_template_traits.updated_at': sqlTimestamp,

  // --- background_templates ------------------------------------------------
  'background_templates.id': positiveInt,
  'background_templates.content_key': nonEmptyText,
  'background_templates.rules_edition': rulesEditionEnum,
  'background_templates.name': nonEmptyText,
  // The printed WORDS, not the lowercase `abilities` members — see the column
  // comments in `db/schema/origins.ts`. `abilityEnum` here would reject every
  // row the seeder writes.
  'background_templates.ability_score_1': nonEmptyText,
  'background_templates.ability_score_2': nonEmptyText,
  'background_templates.ability_score_3': nonEmptyText,
  'background_templates.feat_name': nonEmptyText,
  'background_templates.skill_proficiency_1': nonEmptyText,
  'background_templates.skill_proficiency_2': nonEmptyText,
  'background_templates.tool_proficiency': nonEmptyText,
  'background_templates.equipment_option_a': nonEmptyText,
  'background_templates.equipment_option_b': nonEmptyText,
  'background_templates.created_at': sqlTimestamp,
  'background_templates.updated_at': sqlTimestamp,

  // --- character_species ---------------------------------------------------
  // As with `character_weapons`, the nullable columns are NOT written as
  // nullable here: `columnSchema` adds `| null` from `COLUMN_FACTS`, so a
  // contract can never be tighter than its column by accident.
  'character_species.id': positiveInt,
  'character_species.character_id': positiveInt,
  // Non-empty: the absence of a species is the absence of the ROW, so a row
  // with no name could not be shown or told apart from having none.
  'character_species.name': nonEmptyText,
  'character_species.creature_type': sqlText,
  'character_species.size': sqlText,
  'character_species.base_speed_feet': positiveInt,
  'character_species.notes': sqlText,
  'character_species.created_at': sqlTimestamp,
  'character_species.updated_at': sqlTimestamp,

  // --- character_species_traits --------------------------------------------
  'character_species_traits.id': positiveInt,
  'character_species_traits.character_id': positiveInt,
  'character_species_traits.sort_order': positiveInt,
  'character_species_traits.name': nonEmptyText,
  // `sqlText` and not `nonEmptyText`, unlike the template's: a user may name a
  // trait before writing what it does, and the column is nullable for exactly
  // that reason (D6b limb 3).
  'character_species_traits.description': sqlText,
  'character_species_traits.effect_kind': speciesTraitEffectKindEnum,
  'character_species_traits.effect_damage_type': sqlText,
  'character_species_traits.notes': sqlText,
  'character_species_traits.created_at': sqlTimestamp,
  'character_species_traits.updated_at': sqlTimestamp,

  // --- character_background ------------------------------------------------
  'character_background.id': positiveInt,
  'character_background.character_id': positiveInt,
  'character_background.name': nonEmptyText,
  'character_background.ability_score_1': sqlText,
  'character_background.ability_score_2': sqlText,
  'character_background.ability_score_3': sqlText,
  'character_background.feat_name': sqlText,
  'character_background.skill_proficiency_1': sqlText,
  'character_background.skill_proficiency_2': sqlText,
  'character_background.tool_proficiency': sqlText,
  'character_background.equipment_option_a': sqlText,
  'character_background.equipment_option_b': sqlText,
  'character_background.notes': sqlText,
  'character_background.created_at': sqlTimestamp,
  'character_background.updated_at': sqlTimestamp,
} as const satisfies Record<RequiredRefinementKey, z.ZodType> &
  Partial<Record<OptionalRefinementKey, z.ZodType>>;

export const ROW_REFINEMENTS: Readonly<Record<string, z.ZodType>> = REFINEMENTS;

type Refinements = typeof REFINEMENTS;

// --- contract construction -------------------------------------------------

const jsonSchemaCache = new Map<JsonColumnKey, z.ZodType>();

function jsonColumnSchema(key: JsonColumnKey): z.ZodType {
  const cached = jsonSchemaCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const fact = JSON_COLUMNS[key];
  // `superRefine` rather than `refine` so the shape's own message — "must be a
  // JSON array" versus "must be a JSON object" — reaches the caller instead of a
  // single generic one. The verdict itself comes from `jsonColumnError`, the
  // same function the quarantined-image audit calls.
  const schema = z.string().superRefine((value, context) => {
    const error = jsonColumnError(fact, value);
    if (error !== null) {
      context.addIssue({ code: 'custom', message: error });
    }
  });
  jsonSchemaCache.set(key, schema);
  return schema;
}

function columnSchema(table: RowContractTable, column: string): z.ZodType {
  const key = `${table}.${column}`;
  const fact = (COLUMN_FACTS[table] as Record<string, { notNull: boolean }>)[
    column
  ];
  /* c8 ignore next 3 -- unreachable: the caller iterates COLUMN_FACTS[table]. */
  if (fact === undefined) {
    throw new Error(`No column facts for ${table}.${column}.`);
  }
  // A degraded column always has either a JSON classification or a refinement
  // (compile-enforced above); an integer column falls back to what drizzle-zod
  // established for it.
  const base: z.ZodType = Object.hasOwn(JSON_COLUMNS, key)
    ? jsonColumnSchema(key as JsonColumnKey)
    : (REFINEMENTS[key as keyof Refinements] ?? sqlInteger);
  return fact.notNull ? base : z.union([base, z.null()]);
}

/**
 * Contracts are STRICT in both directions.
 *
 *  - unknown key → rejected. This is the security-relevant half: an unknown key
 *    became a column name in a generated `INSERT` statement.
 *  - missing key → rejected. Every producer of a backup row is `SELECT *`
 *    against a schema-signature-validated database, so a partial row is not a
 *    legitimate document. Accepting one silently substitutes column defaults
 *    for the user's data, or fails at the driver on a NOT NULL column with a
 *    message naming neither the table nor the row.
 */
function buildContract(
  table: RowContractTable,
  columns: readonly string[],
): z.ZodType {
  return z.strictObject(
    Object.fromEntries(
      columns.map((column) => [column, columnSchema(table, column)]),
    ),
  );
}

const contractCache = new Map<string, z.ZodType>();

function contractFor(
  table: RowContractTable,
  only: readonly string[] | undefined,
): z.ZodType {
  const cacheKey = only === undefined ? table : `${table}|${only.join(',')}`;
  const cached = contractCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const columns = only ?? Object.keys(COLUMN_FACTS[table]);
  const contract = buildContract(table, columns);
  contractCache.set(cacheKey, contract);
  return contract;
}

/**
 * Validates one row against its table's contract.
 *
 * Returns `null` when the row is well-shaped, or a message naming the TABLE and
 * ROW (through `label`, e.g. `Character backup tables.spell_selection_slots[3]`)
 * and the FIELD. Returning rather than throwing keeps this module free of any
 * dependency on the backup layer's error type.
 *
 * `only` restricts the contract to a subset of the table's columns — the one
 * caller is the undo/redo snapshot's `character` object, which is a projection
 * of `characters` onto `CHARACTER_STATE_COLUMNS` rather than a whole row.
 */
export function rowContractError(
  table: RowContractTable,
  row: unknown,
  label: string,
  only?: readonly string[],
): string | null {
  const result = contractFor(table, only).safeParse(row);
  if (result.success) {
    return null;
  }
  const issue = result.error.issues[0];
  /* c8 ignore next 3 -- zod never reports a failure with no issues. */
  if (issue === undefined) {
    return `${label} does not match the ${table} row contract.`;
  }
  const field = issue.path.map(String).join('.');
  return field === ''
    ? `${label} (${table}): ${issue.message}.`
    : `${label}.${field}: ${issue.message}.`;
}

// --- compile-checked invariants -------------------------------------------

type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

/** What the contract accepts for one column, as a type. */
type ColumnAccepts<
  T extends RowContractTable,
  C extends keyof Facts[T],
> = `${T}.${C & string}` extends infer K
  ? K extends JsonColumnKey
    ? string
    : K extends keyof Refinements
      ? z.infer<Refinements[K]>
      : number
  : never;

type RowAccepts<T extends RowContractTable> = {
  [C in keyof Facts[T]]: Facts[T][C] extends { notNull: true }
    ? ColumnAccepts<T, C>
    : ColumnAccepts<T, C> | null;
};

type RowModel<T extends RowContractTable> = InferSelectModel<TableFor<T>>;

/**
 * THE D6b DISCHARGE, AND ITS EXACT LIMITS.
 *
 * For every contracted table and every column, every value the schema's own
 * model type permits must be a value the contract's INFERRED TYPE permits.
 * `Exclude<…>` is `never` when that holds.
 *
 * WHAT THIS PROVES. Three specific mistakes stop compiling:
 *
 *  1. dropping `null` from a column the schema declares nullable;
 *  2. pairing a column with the wrong enum, or with an enum at all where the
 *     schema types the column as plain `string` — `z.enum` survives `z.infer`,
 *     so enum narrowing IS visible here;
 *  3. using a scalar refinement on a column the schema types as something else
 *     (a text refinement on a `boolean` column, say).
 *
 * WHAT IT CANNOT PROVE, STATED PLAINLY SO NOBODY OVER-READS IT. `z.infer` erases
 * every runtime constraint that does not change the static type. `z.string()`
 * and `z.string().min(1)` both infer as `string`; `z.int()` and
 * `z.int().min(1).max(30)` both infer as `number`; the JSON shape refinements
 * infer as `string`. So this guard is BLIND to length, range and shape
 * narrowing, and the compile passing says nothing about them. That blind spot is
 * covered by declaration instead: {@link NARROWED_REFINEMENTS} lists every one,
 * `./json-columns.ts` names the reader each JSON shape mirrors, and
 * `tests/unit/contracts/row-contracts.test.ts` proves both that each declared
 * narrowing really rejects and that no undeclared one can be introduced.
 */
type OverTightenedColumns<T extends RowContractTable> = {
  [C in keyof RowModel<T>]: C extends keyof RowAccepts<T>
    ? IsNever<Exclude<RowModel<T>[C], RowAccepts<T>[C]>> extends true
      ? never
      : C
    : C;
}[keyof RowModel<T>];

export type _NoOverTightening = Expect<
  IsNever<
    { [T in RowContractTable]: OverTightenedColumns<T> }[RowContractTable]
  >
>;

/**
 * ...and the contract covers exactly the columns the model has, so a column
 * added to the schema cannot slip past `strictObject` unvalidated.
 */
export type _ContractCoversEveryColumn = Expect<
  IsNever<
    {
      [T in RowContractTable]: Exclude<
        keyof RowModel<T>,
        keyof RowAccepts<T>
      >;
    }[RowContractTable]
  >
>;
