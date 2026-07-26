import {
  check,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  ClassDefinitionId,
  ContentKey,
  SubclassDefinitionId,
} from '../../src/domain/ids';
import type {
  Ability,
  ProgressionType,
  RulesEdition,
} from '../../src/domain/enums';
import { abilities, progressionTypes } from '../../src/domain/enums';
import {
  datetime,
  laravelDefault,
  nullOrOneOf,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';

/**
 * CLASSES AND SUBCLASSES.
 *
 * `subclass_definitions` carries a redundant unique index on
 * `(id, class_definition_id)`. That is not decoration: it is the target of the
 * composite foreign key from `character_class_levels`, which exists so a
 * character cannot be given a subclass belonging to a different class.
 *
 * NOT MODELLED: whether `progression_type = 'none'` implies the four caster
 * columns are all null (or the converse). That correlation is unproven in both
 * directions, and asserting an unproven correlation is exactly the correctness
 * bug this work exists to avoid. They stay independently nullable.
 */

export const class_definitions = sqliteTable(
  'class_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ClassDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    spellcasting_ability: varchar<Ability>()('spellcasting_ability'),
    progression_type: varchar<ProgressionType>()('progression_type')
      .notNull()
      .default(laravelDefault('none')),
    caster_fraction: varchar()('caster_fraction'),
    caster_rounding: varchar()('caster_rounding'),
    prepares_or_knows: varchar()('prepares_or_knows'),
    supports_ritual_casting: tinyint1('supports_ritual_casting')
      .notNull()
      .default(laravelDefault('0')),
    ritual_casting_mode: varchar()('ritual_casting_mode'),
    primary_ability_expression: sqlText()('primary_ability_expression'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * The caster fraction, the multiclass slot table and every "is this class a
     * caster" branch resolve off `progression_type`. A value outside the closed
     * set falls through every one of them, producing a slot table that is
     * quietly wrong rather than absent. The sole writer
     * (`seedClassDefinition` in `src/rules/class-progression-lookup.ts`) binds
     * `ClassSeed.type`, which is typed `ProgressionType`.
     */
    check(
      'class_definitions_progression_type_check',
      oneOf('progression_type', progressionTypes),
    ),
    /**
     * Nullable, and the null is the sourced fact rather than a gap: a
     * non-casting class HAS no spellcasting ability. What is refused is a
     * non-member, which would compute a save DC off a column that does not
     * exist.
     *
     * NOT CONSTRAINED HERE: `rules_edition`. See the note on
     * `spell_versions.rules_edition`; the same argument applies to any catalog
     * table a future import can reach.
     */
    check(
      'class_definitions_spellcasting_ability_check',
      nullOrOneOf('spellcasting_ability', abilities),
    ),
    uniqueIndex('class_definitions_content_key_unique').on(table.content_key),
    uniqueIndex('class_definitions_name_rules_edition_unique').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

export const class_progressions = sqliteTable(
  'class_progressions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    cantrips_known: integer('cantrips_known')
      .notNull()
      .default(laravelDefault('0')),
    prepared_count: integer('prepared_count')
      .notNull()
      .default(laravelDefault('0')),
    slots: sqlText()('slots'),
    pact_slots: sqlText()('pact_slots'),
    grant_rules: sqlText()('grant_rules'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * A progression row is looked up by `WHERE class_level <= ?`, so a row at
     * level 0 or 21 is a row that either always matches or never does. The
     * seeder walks exactly 1..20.
     */
    check(
      'class_progressions_class_level_check',
      sql`class_level BETWEEN 1 AND 20`,
    ),
    uniqueIndex('class_progressions_class_definition_id_class_level_unique').on(
      table.class_definition_id,
      table.class_level,
    ),
  ],
);

export const subclass_definitions = sqliteTable(
  'subclass_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SubclassDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    spellcasting_ability: varchar<Ability>()('spellcasting_ability'),
    caster_fraction: varchar()('caster_fraction'),
    caster_rounding: varchar()('caster_rounding'),
    grant_rules: sqlText()('grant_rules'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('subclass_definitions_content_key_unique').on(
      table.content_key,
    ),
    uniqueIndex(
      'subclass_definitions_class_definition_id_name_rules_edition_unique',
    ).on(table.class_definition_id, table.name, table.rules_edition),
    // The composite-FK companion: without this unique key the composite
    // reference from character_class_levels cannot be declared at all.
    uniqueIndex('subclass_definitions_id_class_definition_id_unique').on(
      table.id,
      table.class_definition_id,
    ),
  ],
);

export const subclass_progressions = sqliteTable(
  'subclass_progressions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    subclass_definition_id: integer('subclass_definition_id')
      .notNull()
      .$type<SubclassDefinitionId>()
      .references(() => subclass_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    cantrips_known: integer('cantrips_known')
      .notNull()
      .default(laravelDefault('0')),
    prepared_count: integer('prepared_count')
      .notNull()
      .default(laravelDefault('0')),
    max_spell_level: integer('max_spell_level')
      .notNull()
      .default(laravelDefault('0')),
    slots: sqlText()('slots'),
    grant_rules: sqlText()('grant_rules'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'subclass_progressions_class_level_check',
      sql`class_level BETWEEN 1 AND 20`,
    ),
    /**
     * `max_spell_level` becomes the `level_max` of a minted slot, so it is
     * bounded by the same 0..9 the slot's own window is. Zero is legitimate and
     * is the seeded value below the level a subclass gets spells at.
     */
    check(
      'subclass_progressions_max_spell_level_check',
      sql`max_spell_level BETWEEN 0 AND 9`,
    ),
    uniqueIndex(
      'subclass_progressions_subclass_definition_id_class_level_unique',
    ).on(table.subclass_definition_id, table.class_level),
  ],
);
