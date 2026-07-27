import {
  check,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  ContentKey,
  SpellIdentityId,
  SpellVersionId,
} from '../../src/domain/ids';
import type {
  EffectReliabilityCategory,
  MaterialCostKind,
  SpellAreaShape,
  SpellRangeKind,
  UpcastScale,
} from '../../src/domain/enums';
import {
  effectReliabilityCategories,
  materialCostKinds,
  spellAreaShapes,
  spellRangeKinds,
  upcastScales,
} from '../../src/domain/enums';
import {
  datetime,
  nullOrIntegerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';

/**
 * THE SPELL CATALOG.
 *
 * The single most important relationship in the product, and the one the
 * hand-written read models got inconsistent: a spell has TWO identities.
 *
 *  - `spell_identities` is the spell CONCEPT, stable across rules editions.
 *  - `spell_versions` is the spell AS PRINTED IN ONE EDITION.
 *
 * Everything a character can point at is a VERSION. Deduplication, aliasing
 * and "is this the same spell" questions are IDENTITY questions. Because both
 * ids were plain `number` before, they were structurally interchangeable and
 * were in fact conflated across read models. `.$type<SpellVersionId>()` /
 * `.$type<SpellIdentityId>()` make the confusion a compile error.
 */

export const spell_identities = sqliteTable(
  'spell_identities',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SpellIdentityId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    canonical_name: varchar()('canonical_name').notNull(),
    normalized_name: varchar()('normalized_name').notNull(),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('spell_identities_content_key_unique').on(table.content_key),
    index('spell_identities_normalized_name_index').on(table.normalized_name),
  ],
);

export const spell_identity_aliases = sqliteTable(
  'spell_identity_aliases',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_identity_id: integer('spell_identity_id')
      .notNull()
      .$type<SpellIdentityId>()
      .references(() => spell_identities.id, { onDelete: 'cascade' }),
    alias: varchar()('alias').notNull(),
    normalized_alias: varchar()('normalized_alias').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('spell_identity_aliases_normalized_alias_unique').on(
      table.normalized_alias,
    ),
  ],
);

/**
 * `spell_identity_id` is NOT NULL: a version ALWAYS resolves to an identity.
 * The converse is deliberately not claimed — nothing enforces that an identity
 * has at least one version, so the contract does not guarantee it.
 *
 * `level` is `INTEGER NOT NULL`, but it is NOT always 0..9. Share import mints
 * placeholder rows for uncatalogued spells with `level = -1`,
 * `provenance = 'placeholder'` and an unvalidated `rules_edition` taken from
 * the content key prefix. `provenance` is therefore a real discriminant, and
 * the spell contract models it as one rather than narrowing `level` here and
 * throwing on a shipped path.
 */
export const spell_versions = sqliteTable(
  'spell_versions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SpellVersionId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    spell_identity_id: integer('spell_identity_id')
      .notNull()
      .$type<SpellIdentityId>()
      .references(() => spell_identities.id, { onDelete: 'cascade' }),
    display_name: varchar()('display_name').notNull(),
    /**
     * NOT narrowed to `RulesEdition`. Share import writes the raw prefix of an
     * uncatalogued spell's content key here (`key.split(':')[0]`), which is
     * grammar-checked but not vocabulary-checked, so `homebrew:fireball`
     * legitimately stores `'homebrew'`. Narrowing here would make a shipped,
     * adversarially-tested import path throw.
     *
     * AND THEREFORE NO CHECK CONSTRAINT EITHER. The proof phase listed
     * `rules_edition IN ('2014','2024','expanded')` as accepted because the
     * whole vitest suite passed with it applied — but the suite never sends a
     * share document whose spell key carries a non-edition prefix, and
     * `isSpellVersionKey` in `src/catalog/catalog-key.ts` checks GRAMMAR ONLY.
     * `homebrew:fireball` is a valid key, so the placeholder writer would bind
     * `'homebrew'` here and the CHECK would abort a legitimate import. A
     * passing suite is not proof of a writer's range when the writer's range is
     * an unvalidated string; this one is REJECTED on inspection.
     */
    rules_edition: varchar()('rules_edition').notNull(),
    level: integer('level').notNull(),
    school: varchar()('school').notNull(),
    ritual: tinyint1('ritual').notNull().default(false),
    concentration: tinyint1('concentration')
      .notNull()
      .default(false),
    casting_time: varchar()('casting_time'),
    action_type: varchar()('action_type'),
    /**
     * THE PRINTED RANGE LINE, VERBATIM, AND IT REMAINS THE AUTHORITY FOR
     * DISPLAY. The four structured columns below are DERIVED from it and are
     * NULL wherever the parse could not read it whole — see
     * `src/domain/spell-range.ts`. This column is the D12/Q4 passthrough limb
     * and it was already here, which is why closing the range vocabulary costs
     * no data: `Range: Anywhere on this plane` is stored, printed and never
     * refused.
     */
    range: varchar()('range'),
    /**
     * WHERE THE SPELL'S EFFECT ORIGINATES — `self`, `touch`, `ranged`, and the
     * three non-distance forms. NULL means the range line was not recognised,
     * which is DIFFERENT from `Touch` and different again from a blank line.
     * Those were one storage state until this column existed.
     */
    range_kind: varchar<SpellRangeKind>()('range_kind'),
    /**
     * THE DISTANCE, IN FEET, AND ONLY FOR `range_kind = 'ranged'`.
     *
     * NULLABLE BECAUSE ABSENCE IS A FACT AND NOT A ZERO (D24). A `0` here means
     * a spell whose printed range is zero feet; "we do not know the range" is
     * NULL, and the CHECK below refuses a distance that is not attached to a
     * `ranged` kind so the two can never be confused by a future writer.
     */
    range_feet: integer('range_feet'),
    /**
     * THE AREA'S SHAPE — the owner's *"spheres, cylinders, cones, straight
     * line"*, as a separate nullable enum exactly as ruled.
     *
     * SEPARATE FROM `range_feet` BECAUSE `Self (30-foot Cone)` HAS TWO NUMBERS
     * IN IT and only one of them is a range. The 30 is the cone's length; the
     * distance to the target point is zero-ish and unprinted. Folding them into
     * one column would have made a 30-foot cone indistinguishable from a
     * 30-foot range.
     */
    area_shape: varchar<SpellAreaShape>()('area_shape'),
    /** The area's one printed dimension. See `src/domain/spell-range.ts`. */
    area_feet: integer('area_feet'),
    /**
     * TEXT, AND DELIBERATELY SO. The owner ruled it: *"On second thought, spell
     * duration can just be text."* Under D26 the table adjudicates how long a
     * spell lasts, so nothing here counts it down.
     */
    duration: varchar()('duration'),
    /**
     * THE PRINTED COMPONENTS LINE, VERBATIM — `V, S, M (a sprig of mistletoe)`.
     * The passthrough limb again, and the reason structuring the cost loses no
     * V/S/M: this column is untouched and is still what the printable card
     * renders.
     *
     * Declared `VARCHAR` and written as an opaque string by the importer.
     * `src/domain/models.ts` typed this `JsonValue | null`, which contradicted
     * both the DDL and the writer; the contract follows the writer.
     */
    components: varchar()('components'),
    /**
     * WHAT IS INSIDE `M (…)`, VERBATIM. This column has existed since the
     * Laravel schema and NOTHING HAS EVER WRITTEN IT — it was declared, decoded
     * and left empty. It is the "plus text" half of the owner's components
     * ruling and needed no schema change, so it is now written rather than
     * replaced.
     */
    material_component_summary: sqlText()('material_component_summary'),
    /**
     * THE MATERIAL COMPONENT'S PRICE IN COPPER PIECES.
     *
     * COPPER RATHER THAN THE PRINTED DENOMINATION because the owner ruled the
     * unit, and one unit is what makes two prices comparable. `src/domain/coin.ts`
     * holds the conversion and states plainly that the exchange rates are NOT in
     * any bundled extract.
     *
     * NOT AN INVENTORY. The owner's rule beside this one: *"We don't track user
     * gold or inventory outside of what affects numbers on the character
     * sheet."* This states a spell's requirement; nothing debits it.
     */
    material_cost_copper: integer('material_cost_copper'),
    /**
     * IS THAT PRICE A FLOOR OR AN EXACT AMOUNT? The SRD prints `worth 1+ CP`,
     * and an integer alone drops the `+`. See `materialCostKinds`.
     */
    material_cost_kind: varchar<MaterialCostKind>()('material_cost_kind'),
    healing: tinyint1('healing').notNull().default(false),
    short_summary: sqlText()('short_summary'),
    /**
     * WHICH LEVEL `spell_version_upcast_levels` COUNTS IN — slot levels for a
     * levelled spell, character levels for a cantrip upgrade.
     *
     * THIS REPLACES `upcast_type`, WHICH WAS DELETED RATHER THAN REUSED. That
     * column had ZERO writers anywhere in the repository, the Tier 1 document
     * format had no field for it, and no code ever compared it against
     * anything — so no database this application can produce ever held a
     * non-NULL value in it. Two agent-facing docs classified it as an OPEN
     * vocabulary with "known values recognised"; there were no known values.
     * D25 says replace rather than accommodate, and keeping a column because it
     * was there is exactly the accommodation it names.
     */
    upcast_scale: varchar<UpcastScale>()('upcast_scale'),
    /**
     * The owner's *"text description"* half of the upcast ruling. Declared
     * since the Laravel schema, never written until now, and kept for the same
     * reason `material_component_summary` is: it already means what the ruling
     * asks for.
     */
    upcast_summary: sqlText()('upcast_summary'),
    requires_mod_for_effect: tinyint1('requires_mod_for_effect')
      .notNull()
      .default(false),
    effect_reliability_category: varchar<EffectReliabilityCategory>()(
      'effect_reliability_category',
    )
      .notNull()
      .default('fixed_effect'),
    provenance: varchar()('provenance')
      .notNull()
      .default('import'),
    seed_version: varchar()('seed_version'),
    is_active: tinyint1('is_active').notNull().default(true),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * THE GUARD IS THE WHOLE CONSTRAINT.
     *
     * The obvious form — `level BETWEEN 0 AND 9` — is wrong, and wrong on a
     * shipped path: `mintPlaceholderSpellVersion` in
     * `src/sharing/character-share.ts` inserts the literal `level = -1` for a
     * spell the receiving catalog does not hold. That row is correct; -1 is how
     * "no printed level, because this is not a real catalog entry" is spelled.
     * The proof phase applied the unguarded form and it broke share import in
     * four adversarial and round-trip tests.
     *
     * So `provenance` is the discriminant — exactly as
     * `src/domain/models.ts` already treats it — and the bound applies only to
     * rows claiming to be catalog spells. A future writer that mints a
     * placeholder must say so in `provenance`, which is the point.
     *
     * `IS` AND NOT `=`, AND THE DIFFERENCE IS THE WHOLE CONSTRAINT. SQLite
     * passes a CHECK that evaluates to NULL, not only one that evaluates to
     * true. Under `=`, a NULL `provenance` makes the left limb NULL, `NULL OR
     * false` is NULL, and the constraint SILENTLY DISABLES ITSELF for precisely
     * the row that has lost the fact discriminating it. `IS` is SQLite's
     * null-safe equality: `NULL IS 'placeholder'` is 0, so that row is refused,
     * while `'placeholder' IS 'placeholder'` and `'import' IS 'placeholder'`
     * answer identically to `=`. All three measured.
     *
     * `provenance` is `NOT NULL`, so this is unreachable today — but that
     * notnull is then the only thing standing between the written constraint
     * and no constraint at all, and a guard against hand-edited images should
     * not rest on a modifier in another column's declaration. `IS` removes the
     * dependency rather than documenting it.
     */
    check(
      'spell_versions_level_check',
      sql`provenance IS 'placeholder' OR level BETWEEN 0 AND 9`,
    ),
    check(
      'spell_versions_effect_reliability_category_check',
      oneOf('effect_reliability_category', effectReliabilityCategories),
    ),
    /* ------------------------------------------------------------------ *
     * THE STRUCTURED RANGE.
     *
     * FOUR CONSTRAINTS, AND THE THIRD IS THE ONE THAT EARNS ITS KEEP. Closing
     * the two vocabularies is the easy half; what actually prevents a wrong
     * number is refusing the COMBINATIONS that mean nothing:
     *
     *  - a `range_feet` on a row whose kind is not `ranged` — a distance
     *    attached to `Touch` would print as a range the source never gave;
     *  - a shape with no size, or a size with no shape — half an area, which a
     *    reader would have to invent the other half of.
     *
     * `IS NOT 'ranged'` RATHER THAN `<> 'ranged'`, for the reason the level
     * CHECK above spells out at length: SQLite passes a CHECK that evaluates to
     * NULL, so under `<>` a row with a NULL `range_kind` and a non-NULL
     * `range_feet` would make the limb NULL and the whole constraint would
     * silently disable itself for exactly the row that has lost the fact
     * discriminating it. `IS NOT` is null-safe.
     * ------------------------------------------------------------------ */
    check(
      'spell_versions_range_kind_check',
      nullOrOneOf('range_kind', spellRangeKinds),
    ),
    check(
      'spell_versions_range_feet_check',
      sql`${nullOrIntegerAtLeast('range_feet', 0)}
        AND (\`range_feet\` IS NULL OR \`range_kind\` IS 'ranged')`,
    ),
    check(
      'spell_versions_area_shape_check',
      nullOrOneOf('area_shape', spellAreaShapes),
    ),
    check(
      'spell_versions_area_check',
      sql`${nullOrIntegerAtLeast('area_feet', 1)}
        AND ((\`area_shape\` IS NULL) = (\`area_feet\` IS NULL))`,
    ),
    /* ------------------------------------------------------------------ *
     * THE MATERIAL COST. Both columns or neither: a copper amount with no
     * `exact`/`minimum` cannot be printed without inventing which one it is,
     * and a kind with no amount says nothing at all.
     * ------------------------------------------------------------------ */
    check(
      'spell_versions_material_cost_check',
      sql`${nullOrIntegerAtLeast('material_cost_copper', 0)}
        AND ${nullOrOneOf('material_cost_kind', materialCostKinds)}
        AND ((\`material_cost_copper\` IS NULL) = (\`material_cost_kind\` IS NULL))`,
    ),
    check(
      'spell_versions_upcast_scale_check',
      nullOrOneOf('upcast_scale', upcastScales),
    ),
    uniqueIndex('spell_versions_content_key_unique').on(table.content_key),
    uniqueIndex('spell_versions_spell_identity_id_rules_edition_unique').on(
      table.spell_identity_id,
      table.rules_edition,
    ),
    index('spell_versions_rules_edition_level_index').on(
      table.rules_edition,
      table.level,
    ),
    index('spell_versions_is_active_index').on(table.is_active),
  ],
);

export const spell_version_publications = sqliteTable(
  'spell_version_publications',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    source_book: varchar()('source_book').notNull(),
    source_page: integer('source_page'),
    source_reference: varchar()('source_reference'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'spell_version_publications_spell_version_id_source_book_unique',
    ).on(table.spell_version_id, table.source_book),
  ],
);

export const spell_list_memberships = sqliteTable(
  'spell_list_memberships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    spell_list_key: varchar()('spell_list_key').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'spell_list_memberships_spell_version_id_spell_list_key_unique',
    ).on(table.spell_version_id, table.spell_list_key),
    index('spell_list_memberships_spell_list_key_index').on(
      table.spell_list_key,
    ),
  ],
);

/**
 * THE LEVELS AT WHICH A SPELL CAN BE UPCAST — the owner's *"list of levels that
 * can upcast"*, as a list.
 *
 * A CHILD TABLE AND NOT A COLUMN, because the ruling says LIST and the three
 * column-shaped alternatives all lose something the list has:
 *
 *  - a BOOLEAN (`can_upcast`) drops which levels;
 *  - a RANGE (`upcast_from`, `upcast_to`) cannot express the bundled cantrip
 *    upgrades at all — `5, 11, 17` is not an interval, and neither is any
 *    other cantrip's ladder;
 *  - a JSON array makes the contract a shape check rather than a row, and
 *    `src/domain/contracts/json-columns.ts` exists precisely to keep that
 *    decision deliberate.
 *
 * WHICH LEVEL THESE ARE COUNTED IN LIVES ON THE PARENT, in
 * `spell_versions.upcast_scale`, and NOT on this row. The scale is a fact about
 * the spell — a cantrip's ladder is character levels, a levelled spell's is
 * slot levels — so putting it here would let one spell hold two answers, and a
 * reader would have no way to say which was right.
 *
 * `BETWEEN 1 AND 20` COVERS BOTH SCALES AND IS DELIBERATELY THE LOOSER OF THE
 * TWO. Slot levels run 1..9 and character levels 1..20, so a tighter bound
 * would have to be conditional on the parent's scale, which a column CHECK
 * cannot see. The bound that IS enforceable here is enforced; the scale-aware
 * one is enforced where the scale is known, in
 * `src/catalog/catalog-schema.ts`.
 *
 * `typeof(…) = 'integer'` for the reason `db/schema/columns.ts` measured: a
 * bare `BETWEEN` already rejects text on its upper limb, but a REAL `2.5` slips
 * through one and not the other, and a level is not a fraction.
 */
export const spell_version_upcast_levels = sqliteTable(
  'spell_version_upcast_levels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    level: integer('level').notNull(),
  },
  (table) => [
    check(
      'spell_version_upcast_levels_level_check',
      sql`typeof(\`level\`) = 'integer' AND \`level\` BETWEEN 1 AND 20`,
    ),
    uniqueIndex(
      'spell_version_upcast_levels_spell_version_id_level_unique',
    ).on(table.spell_version_id, table.level),
  ],
);

/**
 * The four attribute pivots. All four have the same shape and none carries
 * timestamps — `#syncSimplePivot` in the catalog importer defaults
 * `timestamps = false` and every call site takes that default.
 *
 * `spell_version_damage_types` and `spell_version_conditions` are DORMANT:
 * they are referenced only by the application-table inventory and have no
 * reader or writer anywhere. They used to share the round-trip rationale of the
 * Laravel infrastructure tables, and that rationale left with those tables.
 * What keeps them is narrower and worth stating plainly: they are catalog
 * pivots with real foreign keys into `spell_versions`, declared in the shape a
 * catalog import writes, and whether they should be pruned is a separate
 * decision nobody has made. They are NOT kept because something reads them.
 */
export const spell_version_tags = sqliteTable(
  'spell_version_tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    tag: varchar()('tag').notNull(),
  },
  (table) => [
    uniqueIndex('spell_version_tags_spell_version_id_tag_unique').on(
      table.spell_version_id,
      table.tag,
    ),
    index('spell_version_tags_tag_index').on(table.tag),
  ],
);

export const spell_version_damage_types = sqliteTable(
  'spell_version_damage_types',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    damage_type: varchar()('damage_type').notNull(),
  },
  (table) => [
    uniqueIndex(
      'spell_version_damage_types_spell_version_id_damage_type_unique',
    ).on(table.spell_version_id, table.damage_type),
    index('spell_version_damage_types_damage_type_index').on(table.damage_type),
  ],
);

export const spell_version_conditions = sqliteTable(
  'spell_version_conditions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    condition_type: varchar()('condition_type').notNull(),
  },
  (table) => [
    uniqueIndex(
      'spell_version_conditions_spell_version_id_condition_type_unique',
    ).on(table.spell_version_id, table.condition_type),
    index('spell_version_conditions_condition_type_index').on(
      table.condition_type,
    ),
  ],
);

export const spell_version_attack_modes = sqliteTable(
  'spell_version_attack_modes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    attack_mode: varchar()('attack_mode').notNull(),
  },
  (table) => [
    uniqueIndex(
      'spell_version_attack_modes_spell_version_id_attack_mode_unique',
    ).on(table.spell_version_id, table.attack_mode),
    index('spell_version_attack_modes_attack_mode_index').on(table.attack_mode),
  ],
);

export const spell_version_save_abilities = sqliteTable(
  'spell_version_save_abilities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id, { onDelete: 'cascade' }),
    save_ability: varchar()('save_ability').notNull(),
  },
  (table) => [
    uniqueIndex(
      'spell_version_save_abilities_spell_version_id_save_ability_unique',
    ).on(table.spell_version_id, table.save_ability),
    index('spell_version_save_abilities_save_ability_index').on(
      table.save_ability,
    ),
  ],
);
