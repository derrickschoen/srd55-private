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
  ConditionType,
  DamageType,
  EffectReliabilityCategory,
  MaterialCostKind,
  SpellAreaShape,
  SpellRangeKind,
  SpellSchool,
} from '../../src/domain/enums';
import {
  effectReliabilityCategories,
  materialCostKinds,
  spellAreaShapes,
  spellRangeKinds,
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
import { catalog_content_identities } from './catalog-content';

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
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
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
    /**
     * Known SRD schools plus passthrough. Catalog documents are user-imported
     * and may contain homebrew, so there is deliberately no `oneOf` CHECK.
     */
    school: varchar<SpellSchool>()('school').notNull(),
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
     * The owner's *"text description"* half of the upcast ruling. Declared
     * since the Laravel schema, never written until now, and kept for the same
     * reason `material_component_summary` is: it already means what the ruling
     * asks for.
     *
     * IT DESCRIBES SLOT LEVELS AND NOTHING ELSE. `spell_version_upcast_levels`
     * is bounded 1..9 for the same reason; a cantrip's character-level ladder
     * has its own pair of homes below.
     */
    upcast_summary: sqlText()('upcast_summary'),
    /**
     * THE CANTRIP UPGRADE'S TEXT — the sibling of `upcast_summary`, and a
     * SEPARATE COLUMN rather than a second use of it.
     *
     * A spell has at most one of these in practice, but the two facts are not
     * the same fact and nothing in the schema says they are exclusive: one
     * describes what a bigger SLOT buys, the other what a higher CHARACTER
     * LEVEL buys. Sharing one column would make "which mechanic is this
     * sentence about" a question the reader answers by looking at which level
     * table has rows — which is exactly the ambiguity `upcast_scale` existed to
     * paper over, reintroduced one column to the left.
     */
    cantrip_upgrade_summary: sqlText()('cantrip_upgrade_summary'),
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
    /**
     * The bundled spell this user-authored version was copied from.
     *
     * This is a CONTENT KEY rather than a database id because bundled rows are
     * re-seeded and portable documents resolve catalog content by key. NULL
     * means the version was not created by the in-app fork dispatch.
     *
     * Declared last so a fresh schema is byte-identical to the ALTER TABLE
     * migration, which necessarily appends the column.
     */
    forked_from_content_key: varchar<ContentKey>()(
      'forked_from_content_key',
    ),
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
    uniqueIndex('spell_versions_content_key_unique').on(table.content_key),
    index('spell_versions_spell_identity_id_rules_edition_index').on(
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
 * THE SPELL SLOT LEVELS AT WHICH A SPELL'S EFFECT CHANGES — the owner's *"list
 * of levels that can upcast"*, as a list, and measured in SLOT LEVELS ONLY.
 *
 * THE LIST IS THE RIGHT SHAPE PRECISELY BECAUSE THE CADENCE VARIES. The owner:
 * *"Some spells can be upcast every spell slot level, others only upcast every
 * other spell slot level (ex. Spiritual weapon)"*. A spell that gains something
 * at every slot level above its base stores every one of them; a spell that
 * gains something every OTHER slot level stores only those. That second case is
 * what rules out every column-shaped alternative:
 *
 *  - a BOOLEAN (`can_upcast`) drops which levels entirely;
 *  - a THRESHOLD (`upcasts_from`) or a RANGE (`upcast_from`, `upcast_to`)
 *    cannot express `2, 4, 6, 8` at all — it says `2..9`, which is a claim the
 *    source never made and four slot levels the spell does not improve at;
 *  - a JSON array makes the contract a shape check rather than a row, and
 *    `src/domain/contracts/json-columns.ts` exists precisely to keep that
 *    decision deliberate.
 *
 * `BETWEEN 1 AND 9` — SLOT LEVELS, and the same bound every other spell/slot
 * level in this schema carries: `spell_versions.level` (0..9),
 * `spell_selection_slots.spell_level_min`/`_max` (0..9),
 * `subclass_progressions.max_spell_level` (0..9). The floor is 1 rather than 0
 * because level 0 is a cantrip, which is not a slot and cannot be upcast into.
 *
 * IT USED TO BE 1..20, AND THAT ONLY EVER EXISTED TO LET THIS COLUMN ALSO HOLD
 * CHARACTER LEVELS. It cannot any more: the Cantrip Upgrade is a different
 * mechanic with its own table below, so the loose bound had nothing left to
 * accommodate and the discriminant that selected between the two meanings
 * (`spell_versions.upcast_scale`) went with it.
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
      sql`typeof(\`level\`) = 'integer' AND \`level\` BETWEEN 1 AND 9`,
    ),
    uniqueIndex(
      'spell_version_upcast_levels_spell_version_id_level_unique',
    ).on(table.spell_version_id, table.level),
  ],
);

/**
 * THE CHARACTER LEVELS AT WHICH A CANTRIP'S EFFECT CHANGES — the SRD's *Cantrip
 * Upgrade*, which is a DIFFERENT MECHANIC from upcasting and gets its own table
 * for that reason.
 *
 * The two were one table with a discriminant column until the owner ruled them
 * apart: *"Separate concept, own table"*. What made the shipped model ambiguous
 * was calling this upcasting at all. It is not. Upcasting spends a bigger SLOT;
 * a Cantrip Upgrade happens because the CHARACTER got older, spends nothing,
 * and a cantrip has no slot to spend. The bundled text says so in the units it
 * uses:
 *
 *  - *"Cantrip Upgrade. … when you reach levels 5 (1d6), 11 (2d6), and 17
 *    (3d6)"* (`docs/srd/source/weapon-attack-cantrips.txt:26-29`);
 *  - *"The damage die changes when you reach levels 5 (d10), 11 (d12), and 17
 *    (2d6)"* (`:53-54`).
 *
 * A SIBLING OF `spell_version_upcast_levels`, NOT A VARIANT OF IT. Identical
 * shape, different subject, different bound — and the difference in bound is
 * the whole argument for two tables rather than one with a scale column: a
 * CHECK can state `1..9` here and `1..20` there, where one shared column could
 * only state the union and let the parent's discriminant carry the real rule.
 * A `20` in a slot list is now refused by the database rather than by a
 * contract that can see the discriminant.
 *
 * `BETWEEN 1 AND 20` is the owner's *"Yes — 1 to 9, refuse the rest"* answered
 * for the other table; here 20 is the highest character level, matching
 * `class_progressions_class_level_check` and every other character-level bound
 * in this schema.
 */
export const spell_version_cantrip_upgrade_levels = sqliteTable(
  'spell_version_cantrip_upgrade_levels',
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
      'spell_version_cantrip_upgrade_levels_level_check',
      sql`typeof(\`level\`) = 'integer' AND \`level\` BETWEEN 1 AND 20`,
    ),
    uniqueIndex(
      'spell_version_cantrip_upgrade_levels_spell_version_id_level_unique',
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
    damage_type: varchar<DamageType>()('damage_type').notNull(),
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
    condition_type: varchar<ConditionType>()('condition_type').notNull(),
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
