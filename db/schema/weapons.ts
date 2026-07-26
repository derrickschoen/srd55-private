import {
  check,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  CharacterId,
  CharacterWeaponId,
  ClassDefinitionId,
  ContentKey,
  WeaponTemplateId,
} from '../../src/domain/ids';
import type {
  RulesEdition,
  SrdWeaponGroup,
  WeaponMasteryGrant,
  WeaponMasteryProperty,
} from '../../src/domain/enums';
import {
  datetime,
  laravelDefault,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { characters } from './character';
import { class_definitions } from './catalog-classes';

/**
 * WEAPONS. Four NATIVE tables — the first tables in this schema that reproduce
 * no Laravel migration. `tests/unit/schema.test.ts` keeps them in a separate,
 * hand-transcribed inventory for exactly that reason: the Laravel parity claim
 * is still made over the original 38 and is not diluted by them.
 *
 * WHAT THIS DOES NOT MODEL. No proficiency, no attack bonus, no damage roll, no
 * inventory, no weight, no cost, no equipped state and no ammunition count. A
 * character here OWNS A LIST OF WEAPONS and records which of them they have
 * chosen their weapon mastery on. Nothing derives a number from that.
 *
 * THE CENTRAL SHAPE DECISION (D1b). `character_weapons` stores VALUES, never a
 * reference to `weapon_templates`. Picking a template is a one-time column-wise
 * COPY, after which every field is the character's own and editing it cannot
 * reach back into the catalog. That is why the two tables' fillable columns are
 * deliberately IDENTICAL in name and type: the copy needs no mapping table, a
 * template column a weapon cannot hold would be dead weight, and a weapon field
 * a template cannot fill would leave the picker silently blanking it.
 *
 * MASTERY CONTENT IS SPLIT ACROSS TWO TABLES ON PURPOSE. The obvious single
 * table has a nullable `mastery_count` where NULL means "we have not
 * transcribed this class's number yet". That null would stand for OUR
 * TRANSCRIPTION STATE rather than for anything in the domain — the
 * migration-artifact nullability D6 forbids in a contract. `..._grants` says
 * whether a class grants Weapon Mastery and whether we hold its numbers;
 * `..._counts` holds only numbers that exist verbatim in
 * `docs/srd/source/weapon-mastery-progression.txt`. Both tables are null-free
 * and the counts table is a pure, diffable image of the extract.
 */

/**
 * One weapon a character owns.
 *
 * Cascade child of `characters`, exactly as `character_class_levels` is.
 * Ordered by `id`; there is no `sort_order` column because nothing has asked to
 * reorder a weapon list and an unused ordering column is a column that drifts.
 */
export const character_weapons = sqliteTable(
  'character_weapons',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<CharacterWeaponId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    name: varchar()('name').notNull(),
    /**
     * Nullable, and a completeness observation rather than a defect: a user may
     * add "Grandfather's sword" before looking its damage up, and forbidding
     * that turns weapon creation into an all-or-nothing modal (D6b limbs 1
     * and 3). There is no sensible default and `''` would be a null in costume.
     *
     * A string, not a dice struct: the Blowgun's damage is `1`, not `NdX`.
     */
    damage_dice: varchar()('damage_dice'),
    /**
     * Open vocabulary, not an enum. Precedent:
     * `spell_version_damage_types.damage_type` is a bare `varchar()`. A weapon
     * the user invented may do whatever damage the user says; the UI offers the
     * three types the SRD weapons table uses as suggestions and accepts more.
     */
    damage_type: varchar()('damage_type'),
    /**
     * The Versatile property's die, and the ONLY record that the property is
     * present. A companion `versatile` boolean was rejected: it is derivable
     * from the die and keeping both admits the impossible row
     * `versatile = 1, die = NULL`. 31 of the 38 SRD weapons genuinely have no
     * versatile die, so the absence is the source's own (D6b limb 2).
     */
    versatile_damage_dice: varchar()('versatile_damage_dice'),
    finesse: tinyint1('finesse').notNull().default(laravelDefault('0')),
    heavy: tinyint1('heavy').notNull().default(laravelDefault('0')),
    light: tinyint1('light').notNull().default(laravelDefault('0')),
    loading: tinyint1('loading').notNull().default(laravelDefault('0')),
    reach: tinyint1('reach').notNull().default(laravelDefault('0')),
    thrown: tinyint1('thrown').notNull().default(laravelDefault('0')),
    two_handed: tinyint1('two_handed').notNull().default(laravelDefault('0')),
    ammunition: tinyint1('ammunition').notNull().default(laravelDefault('0')),
    ammunition_kind: varchar()('ammunition_kind'),
    /**
     * No both-or-neither CHECK on the range pair, deliberately. A user typing a
     * normal range and tabbing away before typing the long one would trip it,
     * and D6b makes half-decided a first-class state. A half-filled range is a
     * completeness observation, not a constraint violation.
     */
    range_normal_feet: integer('range_normal_feet'),
    range_long_feet: integer('range_long_feet'),
    /**
     * Nullable HERE and NOT NULL on the template, and the difference is the
     * sourced fact rather than an inconsistency: all 38 SRD weapons have
     * exactly one mastery property, and a weapon the user invented need not.
     */
    mastery_property: varchar<WeaponMasteryProperty>()('mastery_property'),
    mastery_selected: tinyint1('mastery_selected')
      .notNull()
      .default(laravelDefault('0')),
    /**
     * Q4's free-text escape hatch, and the Lance is what proves it is needed:
     * its property is `Two-Handed (unless mounted)`, so the boolean alone is a
     * lie. Exactly one SRD weapon uses it; most user weapons will not.
     */
    other_properties: sqlText()('other_properties'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * Following the `spell_slots_exclusive_assignment_check` precedent: mastery
     * cannot be selected on a weapon that has no mastery property to select.
     * Cheap, real, and it makes an incoherent row unrepresentable rather than
     * merely discouraged.
     */
    check(
      'character_weapons_mastery_requires_property_check',
      sql`mastery_selected = 0 OR mastery_property IS NOT NULL`,
    ),
    index('character_weapons_character_id_index').on(table.character_id),
  ],
);

/**
 * The SRD weapon catalog, seeded by parsing `docs/srd/source/weapons-table.txt`.
 *
 * `srd_group` is NOT the `category: simple | martial` field R1 and D1b struck
 * down. That one lived on the CHARACTER'S weapon and implied a proficiency
 * model this app does not have. This one lives only on the catalog row, is
 * never copied into `character_weapons`, and exists so a 38-item picker can be
 * grouped the way the source's own table groups it. A character's weapon has no
 * category, before or after.
 */
export const weapon_templates = sqliteTable(
  'weapon_templates',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<WeaponTemplateId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition')
      .notNull()
      .default(laravelDefault('2024')),
    name: varchar()('name').notNull(),
    srd_group: varchar<SrdWeaponGroup>()('srd_group').notNull(),
    // NOT NULL where the character's copy is nullable: every row here comes
    // from a table in which every weapon has both.
    damage_dice: varchar()('damage_dice').notNull(),
    damage_type: varchar()('damage_type').notNull(),
    versatile_damage_dice: varchar()('versatile_damage_dice'),
    finesse: tinyint1('finesse').notNull().default(laravelDefault('0')),
    heavy: tinyint1('heavy').notNull().default(laravelDefault('0')),
    light: tinyint1('light').notNull().default(laravelDefault('0')),
    loading: tinyint1('loading').notNull().default(laravelDefault('0')),
    reach: tinyint1('reach').notNull().default(laravelDefault('0')),
    thrown: tinyint1('thrown').notNull().default(laravelDefault('0')),
    two_handed: tinyint1('two_handed').notNull().default(laravelDefault('0')),
    ammunition: tinyint1('ammunition').notNull().default(laravelDefault('0')),
    ammunition_kind: varchar()('ammunition_kind'),
    range_normal_feet: integer('range_normal_feet'),
    range_long_feet: integer('range_long_feet'),
    mastery_property: varchar<WeaponMasteryProperty>()(
      'mastery_property',
    ).notNull(),
    other_properties: sqlText()('other_properties'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('weapon_templates_content_key_unique').on(table.content_key),
  ],
);

/**
 * One row per class: does this class grant Weapon Mastery, and do we hold its
 * numbers?
 *
 * `counts_unsourced` is a first-class SEEDED value, not an absent row. A class
 * that grants the feature but whose count is not in `docs/srd/source/` says so,
 * and the UI repeats it. Showing such a character zero mastery choices would
 * quietly cost them an entitlement.
 */
export const class_weapon_mastery_grants = sqliteTable(
  'class_weapon_mastery_grants',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    grant: varchar<WeaponMasteryGrant>()('grant').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('class_weapon_mastery_grants_class_definition_id_unique').on(
      table.class_definition_id,
    ),
  ],
);

/**
 * Sourced numbers ONLY. Every row here is traceable to a printed line in
 * `docs/srd/source/weapon-mastery-progression.txt` and nothing else may be
 * written into it.
 *
 * Counts are ABSOLUTE per level, matching how the source prints them, so
 * resolution is `WHERE class_level <= ? ORDER BY class_level DESC LIMIT 1` and
 * never a running sum. A partially-seeded table then degrades to a stale-but-
 * real number instead of to a wrong one.
 */
export const class_weapon_mastery_counts = sqliteTable(
  'class_weapon_mastery_counts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    mastery_count: integer('mastery_count').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'class_weapon_mastery_counts_class_definition_id_class_level_unique',
    ).on(table.class_definition_id, table.class_level),
  ],
);
