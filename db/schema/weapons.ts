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
  DamageType,
  KnownDamageType,
  RulesEdition,
  SrdWeaponGroup,
  WeaponAttackKind,
  WeaponMasteryGrant,
  WeaponMasteryProperty,
  WeaponProficiencyCategory,
} from '../../src/domain/enums';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../../src/domain/weapon-damage';
import type { WeaponRangeKind } from '../../src/domain/weapon-range';
import {
  damageTypes,
  rulesEditions,
  srdWeaponGroups,
  weaponMasteryGrants,
  weaponMasteryProperties,
  weaponAttackKinds,
  weaponProficiencyCategories,
} from '../../src/domain/enums';
import {
  datetime,
  integerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { characters } from './character';
import { class_definitions } from './catalog-classes';

/**
 * WEAPONS. Four tables, hand-inventoried in `tests/unit/schema.test.ts` from
 * `.claude/plans/weapons-design.md` §4 — which was written before this file
 * existed, and is why these four are the only entries in that inventory that
 * are not a transcription of the declarations they judge.
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
    // NO PROVENANCE COLUMN, BY OWNER RULING (D69). E-A added a
    // `source_instance_id` here (migration 0011); the owner struck it —
    // a weapon is a weapon, whoever put it there — and migration 0012
    // removed it. Do not reintroduce it without a new ruling.
    name: varchar()('name').notNull(),
    /**
     * `simple | martial`, or NULL for NOT STATED — D27.
     *
     * D27 AMENDS D1b, WHICH HAD STRUCK THIS FIELD DOWN. D1b's reasoning was
     * that a character stores VALUES and not a reference to the template it was
     * filled from, and that reasoning survives intact: this is a VALUE copied
     * once at pre-fill, with no live link back to `weapon_templates` and nothing
     * to upgrade in place. What falls is only the claim that a character's
     * weapon needs no category AT ALL. It does: without it every printed attack
     * adds the proficiency bonus, so a Rogue holding a Greatsword reads too
     * high, and D28's multiclass proficiency union has nothing to test a weapon
     * against.
     *
     * TWO VALUES WHERE `weapon_templates.srd_group` HAS FOUR, deliberately. The
     * template's four are the source's own table HEADINGS, melee and ranged
     * split, and grouping a 38-item picker is all they are for. PROFICIENCY is
     * granted per CATEGORY: no class's Core Traits row says "Simple melee". The
     * fold from four to two happens once, in `weaponFromTemplate`, over an
     * exhaustive switch with no default arm.
     *
     * NULLABLE, AND THE NULL IS THE SOURCED ABSENCE D6b PROTECTS. A weapon
     * someone typed in, or one that arrived on a share link minted before this
     * column existed, genuinely has no category — and D11 part 2 says the
     * boundary tolerates. Null means NOT STATED, never `simple`: the sheet says
     * it cannot check that weapon rather than asserting a proficiency the
     * character may not have.
     */
    proficiency_category: varchar<WeaponProficiencyCategory>()(
      'proficiency_category',
    ),
    /**
     * `melee | ranged`, or NULL for NOT RECORDED — D46.
     *
     * This is a value on the character's copy, derived once from a selected
     * template's `srd_group`. A custom or historically unmatchable weapon stays
     * NULL. In particular, range distances and the Thrown, Reach, and
     * Ammunition properties are not substitutes for this fact.
     */
    attack_kind: varchar<WeaponAttackKind>()('attack_kind'),
    damage_kind: varchar<WeaponDamage['kind']>()('damage_kind')
      .notNull()
      .default('not_recorded'),
    damage_dice: varchar()('damage_dice'),
    damage_flat: integer('damage_flat'),
    damage_custom: varchar()('damage_custom'),
    /**
     * Open vocabulary, now typed as the SRD known set plus passthrough.
     *
     * The earlier argument for a bare `varchar()` was RIGHT about storage and
     * WRONG that plain `string` was the only way to preserve it: a weapon the
     * user invented may do whatever damage the user says, so there is still no
     * CHECK, while `DamageType` keeps known values visible in the type system.
     */
    damage_type: varchar<DamageType>()('damage_type'),
    versatile_damage_kind: varchar<VersatileWeaponDamage['kind']>()(
      'versatile_damage_kind',
    )
      .notNull()
      .default('not_applicable'),
    versatile_damage_dice: varchar()('versatile_damage_dice'),
    versatile_damage_flat: integer('versatile_damage_flat'),
    versatile_damage_custom: varchar()('versatile_damage_custom'),
    finesse: tinyint1('finesse').notNull().default(false),
    heavy: tinyint1('heavy').notNull().default(false),
    light: tinyint1('light').notNull().default(false),
    loading: tinyint1('loading').notNull().default(false),
    reach: tinyint1('reach').notNull().default(false),
    thrown: tinyint1('thrown').notNull().default(false),
    two_handed: tinyint1('two_handed').notNull().default(false),
    ammunition: tinyint1('ammunition').notNull().default(false),
    ammunition_kind: varchar()('ammunition_kind'),
    range_kind: varchar<WeaponRangeKind>()('range_kind')
      .notNull()
      .default('none'),
    range_near_feet: integer('range_near_feet'),
    range_far_feet: integer('range_far_feet'),
    /**
     * Nullable HERE and NOT NULL on the template, and the difference is the
     * sourced fact rather than an inconsistency: all 38 SRD weapons have
     * exactly one mastery property, and a weapon the user invented need not.
     */
    mastery_property: varchar<WeaponMasteryProperty>()('mastery_property'),
    mastery_selected: tinyint1('mastery_selected')
      .notNull()
      .default(false),
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
    check(
      'character_weapons_damage_check',
      sql`(
        (damage_kind = 'dice' AND damage_dice IS NOT NULL AND damage_flat IS NULL AND damage_custom IS NULL)
        OR (damage_kind = 'flat' AND damage_dice IS NULL AND damage_flat IS NOT NULL AND damage_flat >= 0 AND damage_custom IS NULL)
        OR (damage_kind = 'custom' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NOT NULL)
        OR (damage_kind = 'not_recorded' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NULL)
      )`,
    ),
    check(
      'character_weapons_versatile_damage_check',
      sql`(
        (versatile_damage_kind = 'dice' AND versatile_damage_dice IS NOT NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'flat' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NOT NULL AND versatile_damage_flat >= 0 AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'custom' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NOT NULL)
        OR (versatile_damage_kind = 'not_applicable' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
      )`,
    ),
    check(
      'character_weapons_range_check',
      sql`(
        (range_near_feet IS NULL OR (typeof(range_near_feet) = 'integer' AND range_near_feet BETWEEN 0 AND 100000))
        AND (range_far_feet IS NULL OR (typeof(range_far_feet) = 'integer' AND range_far_feet BETWEEN 0 AND 100000))
        AND (
          (range_kind = 'none' AND range_near_feet IS NULL AND range_far_feet IS NULL)
          OR (range_kind = 'ranged' AND range_near_feet IS NOT NULL AND (range_far_feet IS NULL OR range_far_feet >= range_near_feet))
          OR (range_kind = 'legacy' AND range_far_feet IS NOT NULL AND (range_near_feet IS NULL OR range_far_feet < range_near_feet))
        )
      )`,
    ),
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
    /**
     * The companion to the constraint above: that one says mastery cannot be
     * SELECTED without a property, this one says the property must be one of
     * the eight that exist. Together the mastery invariant is closed.
     *
     * The null limb is the sourced fact D6b protects — all 38 SRD weapons have
     * exactly one mastery property and a weapon the user invented need not.
     * `AddWeaponCommand`/`UpdateWeaponCommand` already coerce a non-member to
     * null through `isEnumValue(weaponMasteryProperties, …)`.
     *
     * NOT CONSTRAINED: `damage_type`, which is deliberately an open vocabulary
     * (see its column comment) — a user's weapon may do whatever damage their
     * table agreed on.
     */
    check(
      'character_weapons_mastery_property_check',
      nullOrOneOf('mastery_property', weaponMasteryProperties),
    ),
    /**
     * D27's column, constrained to the two categories a class can grant.
     *
     * THE NULL LIMB IS THE POINT and it is not laxity: `nullOrOneOf` is used
     * exactly where `mastery_property` uses it, for the same D6b reason. What
     * the limb defends is an IMPORTED character — a share link minted before
     * this column existed carries no category, and refusing that row would make
     * someone's character unopenable to close a gap that only costs a warning.
     *
     * `'simple'` ON ITS OWN IS ACCEPTED HERE AND REJECTED ON THE TEMPLATE, and
     * the asymmetry is the whole of D27. `weapon_templates_srd_group_check`
     * refuses a bare `simple` because that table's vocabulary is the source's
     * four headings; this column's vocabulary is the two categories the Core
     * Traits tables name, and `simple` is a member of it.
     */
    check(
      'character_weapons_proficiency_category_check',
      nullOrOneOf('proficiency_category', weaponProficiencyCategories),
    ),
    check(
      'character_weapons_attack_kind_check',
      nullOrOneOf('attack_kind', weaponAttackKinds),
    ),
    index('character_weapons_character_id_index').on(table.character_id),
  ],
);

/**
 * The SRD weapon catalog, seeded by parsing `docs/srd/source/weapons-table.txt`.
 *
 * `srd_group` IS STILL NOT THE SAME FIELD AS `character_weapons`.
 * `proficiency_category`, AND THE ORIGINAL COMMENT HERE IS NOW WRONG IN ITS
 * LAST SENTENCE. It read "A character's weapon has no category, before or
 * after." D27 amends D1b and gives the character's weapon a nullable
 * `simple | martial`; leaving that sentence standing would have left the
 * schema contradicted by a comment in the same file.
 *
 * WHAT SURVIVES THE AMENDMENT, and it is most of it. These are two different
 * vocabularies serving two different jobs, and neither is a reference to the
 * other:
 *
 *  - `srd_group` has FOUR members because they are the source's own table
 *    HEADINGS, melee and ranged split, and a 38-item picker groups on them. No
 *    class grants proficiency in "Simple melee", so this vocabulary cannot
 *    answer a proficiency question and is not asked one.
 *  - `character_weapons.proficiency_category` has TWO, because that is what the
 *    Core Traits tables grant.
 *
 * IT IS STILL NOT COPIED ACROSS VERBATIM. `weaponFromTemplate` FOLDS four to
 * two through an exhaustive switch, so the character's row holds a derived
 * value rather than a second spelling of this column, and D1b's real principle
 * — a character's weapon is values, with no live link back here — is untouched.
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
      .default('2024'),
    name: varchar()('name').notNull(),
    srd_group: varchar<SrdWeaponGroup>()('srd_group').notNull(),
    damage_kind: varchar<WeaponDamage['kind']>()('damage_kind').notNull(),
    damage_dice: varchar()('damage_dice'),
    damage_flat: integer('damage_flat'),
    damage_custom: varchar()('damage_custom'),
    damage_type: varchar<KnownDamageType>()('damage_type').notNull(),
    versatile_damage_kind: varchar<VersatileWeaponDamage['kind']>()(
      'versatile_damage_kind',
    )
      .notNull()
      .default('not_applicable'),
    versatile_damage_dice: varchar()('versatile_damage_dice'),
    versatile_damage_flat: integer('versatile_damage_flat'),
    versatile_damage_custom: varchar()('versatile_damage_custom'),
    finesse: tinyint1('finesse').notNull().default(false),
    heavy: tinyint1('heavy').notNull().default(false),
    light: tinyint1('light').notNull().default(false),
    loading: tinyint1('loading').notNull().default(false),
    reach: tinyint1('reach').notNull().default(false),
    thrown: tinyint1('thrown').notNull().default(false),
    two_handed: tinyint1('two_handed').notNull().default(false),
    ammunition: tinyint1('ammunition').notNull().default(false),
    ammunition_kind: varchar()('ammunition_kind'),
    range_kind: varchar<WeaponRangeKind>()('range_kind')
      .notNull()
      .default('none'),
    range_near_feet: integer('range_near_feet'),
    range_far_feet: integer('range_far_feet'),
    mastery_property: varchar<WeaponMasteryProperty>()(
      'mastery_property',
    ).notNull(),
    other_properties: sqlText()('other_properties'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'weapon_templates_damage_check',
      sql`(
        (damage_kind = 'dice' AND damage_dice IS NOT NULL AND damage_flat IS NULL AND damage_custom IS NULL)
        OR (damage_kind = 'flat' AND damage_dice IS NULL AND damage_flat IS NOT NULL AND damage_flat >= 0 AND damage_custom IS NULL)
        OR (damage_kind = 'custom' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NOT NULL)
        OR (damage_kind = 'not_recorded' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NULL)
      )`,
    ),
    check(
      'weapon_templates_versatile_damage_check',
      sql`(
        (versatile_damage_kind = 'dice' AND versatile_damage_dice IS NOT NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'flat' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NOT NULL AND versatile_damage_flat >= 0 AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'custom' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NOT NULL)
        OR (versatile_damage_kind = 'not_applicable' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
      )`,
    ),
    check(
      'weapon_templates_range_check',
      sql`(
        (range_near_feet IS NULL OR (typeof(range_near_feet) = 'integer' AND range_near_feet BETWEEN 0 AND 100000))
        AND (range_far_feet IS NULL OR (typeof(range_far_feet) = 'integer' AND range_far_feet BETWEEN 0 AND 100000))
        AND (
          (range_kind = 'none' AND range_near_feet IS NULL AND range_far_feet IS NULL)
          OR (range_kind = 'ranged' AND range_near_feet IS NOT NULL AND (range_far_feet IS NULL OR range_far_feet >= range_near_feet))
        )
      )`,
    ),
    /**
     * NOT NULL here where the character's copy is nullable, so no null limb:
     * every row comes from a table in which every weapon has a property, and a
     * mis-parse of `docs/srd/source/weapons-table.txt` writing 38 wrong rows is
     * exactly what this refuses.
     */
    check(
      'weapon_templates_mastery_property_check',
      oneOf('mastery_property', weaponMasteryProperties),
    ),
    check(
      'weapon_templates_damage_type_check',
      oneOf('damage_type', damageTypes),
    ),
    /** The four headings the source's own table uses; the picker groups on it. */
    check('weapon_templates_srd_group_check', oneOf('srd_group', srdWeaponGroups)),
    /**
     * Safe here where it is not safe on `spell_versions`: this table is NATIVE,
     * its only writer is the SRD seeder in `src/rules/weapons-srd.ts` binding
     * the `'2024'` constant, and no import path can reach it.
     */
    check(
      'weapon_templates_rules_edition_check',
      oneOf('rules_edition', rulesEditions),
    ),
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
    /**
     * The one that matters most in this file. An unrecognised `grant` reads as
     * "not granted" to every branch that is not an exhaustive switch, which
     * COLLAPSES `counts_unsourced` into `not_granted` — the precise silent-wrong
     * this three-member vocabulary was invented to prevent, and one that costs
     * the character an entitlement without a single error anywhere.
     */
    check(
      'class_weapon_mastery_grants_grant_check',
      oneOf('grant', weaponMasteryGrants),
    ),
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
    /**
     * Resolved by `WHERE class_level <= ? ORDER BY class_level DESC LIMIT 1`,
     * so a row outside 1..20 either always wins or never does. Every row here
     * is transcribed from a printed line covering levels 1..20.
     *
     * `mastery_count >= 0` and not `> 0`: zero is a legitimate count in
     * principle even though no printed row carries one, and refusing it would
     * invent a rule the source does not state (the row contract makes the same
     * call).
     *
     * The count limb goes through `integerAtLeast` while the level limb stays a
     * plain `BETWEEN` — not an inconsistency, the measured difference in
     * `columns.ts`: `BETWEEN` already rejects text on its upper limb, a bare
     * `>= 0` does not reject it at all.
     *
     * ON `class_level` BEING TIGHTER THAN ITS ROW CONTRACT — deliberate, and
     * NOT to be reconciled by loosening this. `ROW_CONTRACTS` types
     * `class_weapon_mastery_counts.class_level` as `positiveInt` (unbounded
     * above), so 21 clears the contract and dies here instead. The bound is
     * right: `class-progression-lookup.ts` resolves these rows with
     * `class_level <= ?` and its own queries say `BETWEEN 1 AND 20`,
     * `PROGRESSION_LEVELS` is 20, and the parsed SRD tables cover 1..20 — the
     * identical bound on `class_progressions_class_level_check` has no contract
     * to disagree with only because that table has no row contract at all.
     * Tightening the contract to match belongs in `src/domain/contracts/`,
     * which this change does not own.
     */
    check(
      'class_weapon_mastery_counts_check',
      sql`class_level BETWEEN 1 AND 20 AND ${integerAtLeast('mastery_count', 0)}`,
    ),
    uniqueIndex(
      'class_weapon_mastery_counts_class_definition_id_class_level_unique',
    ).on(table.class_definition_id, table.class_level),
  ],
);
