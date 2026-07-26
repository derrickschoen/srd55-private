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
import type { EffectReliabilityCategory } from '../../src/domain/enums';
import { effectReliabilityCategories } from '../../src/domain/enums';
import {
  datetime,
  laravelDefault,
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
    ritual: tinyint1('ritual').notNull().default(laravelDefault('0')),
    concentration: tinyint1('concentration')
      .notNull()
      .default(laravelDefault('0')),
    casting_time: varchar()('casting_time'),
    action_type: varchar()('action_type'),
    range: varchar()('range'),
    duration: varchar()('duration'),
    /**
     * Declared `VARCHAR` and written as an opaque string by the importer.
     * `src/domain/models.ts` typed this `JsonValue | null`, which contradicted
     * both the DDL and the writer; the contract follows the writer.
     */
    components: varchar()('components'),
    material_component_summary: sqlText()('material_component_summary'),
    healing: tinyint1('healing').notNull().default(laravelDefault('0')),
    short_summary: sqlText()('short_summary'),
    upcast_type: varchar()('upcast_type'),
    upcast_summary: sqlText()('upcast_summary'),
    requires_mod_for_effect: tinyint1('requires_mod_for_effect')
      .notNull()
      .default(laravelDefault('0')),
    effect_reliability_category: varchar<EffectReliabilityCategory>()(
      'effect_reliability_category',
    )
      .notNull()
      .default(laravelDefault('fixed_effect')),
    provenance: varchar()('provenance')
      .notNull()
      .default(laravelDefault('import')),
    seed_version: varchar()('seed_version'),
    is_active: tinyint1('is_active').notNull().default(laravelDefault('1')),
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
