import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type {
  BackgroundDefinitionId,
  ContentKey,
  FeatDefinitionId,
  SpeciesDefinitionId,
} from '../../src/domain/ids';
import {
  featAbilityPoints,
  type CharacterLevel,
  type FeatAbilityPoints,
  type FeatGrouping,
  type RulesEdition,
} from '../../src/domain/enums';
import {
  datetime,
  integerOneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { catalog_content_identities } from './catalog-content';

/**
 * STANDALONE SOURCE DEFINITIONS: feats, species, backgrounds.
 *
 * All three are column-identical — they are the same Laravel migration
 * repeated — but they are NOT interchangeable domain objects. Each gets its
 * own branded id, because `character_source_instances.source_definition_id` is
 * a bare integer whose target table is chosen at runtime by the
 * `source_type` string. That polymorphic reference is unenforceable in SQL;
 * distinct brands are what make it checkable in TypeScript.
 */

export const feat_definitions = sqliteTable(
  'feat_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<FeatDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    category: varchar<FeatGrouping>()('category'),
    min_level: integer('min_level').$type<CharacterLevel>(),
    ability_points: integer('ability_points')
      .$type<FeatAbilityPoints>()
      .notNull()
      .default(0),
    /**
     * JSON-encoded `AbilityIncreaseAbilities`: either the literal `"any"` or
     * a non-empty closed Ability list. Nullable is an honest unprovable state
     * for pre-0024 and imported/homebrew definitions.
     */
    ability_increase_abilities: sqlText()('ability_increase_abilities'),
    /**
     * This feat contribution's own cap (20 or 30 in the bundled corpus).
     * Nullable for definitions whose ability options cannot be proved.
     */
    ability_increase_maximum: integer('ability_increase_maximum'),
    repeatable: tinyint1('repeatable').notNull().default(false),
    prerequisites: sqlText()('prerequisites'),
    grant_rules: sqlText()('grant_rules'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'feat_definitions_min_level_check',
      sql`\`min_level\` IS NULL OR (typeof(\`min_level\`) = 'integer' AND \`min_level\` BETWEEN 1 AND 20)`,
    ),
    check(
      'feat_definitions_ability_points_check',
      integerOneOf('ability_points', featAbilityPoints),
    ),
    check(
      'feat_definitions_ability_increase_maximum_check',
      sql`\`ability_increase_maximum\` IS NULL OR (typeof(\`ability_increase_maximum\`) = 'integer' AND \`ability_increase_maximum\` BETWEEN 1 AND 30)`,
    ),
    uniqueIndex('feat_definitions_content_key_unique').on(table.content_key),
    index('feat_definitions_name_rules_edition_index').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

export const species_definitions = sqliteTable(
  'species_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SpeciesDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    category: varchar()('category'),
    repeatable: tinyint1('repeatable').notNull().default(false),
    prerequisites: sqlText()('prerequisites'),
    grant_rules: sqlText()('grant_rules'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('species_definitions_content_key_unique').on(table.content_key),
    index('species_definitions_name_rules_edition_index').on(
      table.name,
      table.rules_edition,
    ),
  ],
);

export const background_definitions = sqliteTable(
  'background_definitions',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<BackgroundDefinitionId>(),
    content_key: varchar<ContentKey>()('content_key')
      .notNull()
      .references(() => catalog_content_identities.content_key),
    name: varchar()('name').notNull(),
    rules_edition: varchar<RulesEdition>()('rules_edition').notNull(),
    category: varchar()('category'),
    repeatable: tinyint1('repeatable').notNull().default(false),
    prerequisites: sqlText()('prerequisites'),
    grant_rules: sqlText()('grant_rules'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('background_definitions_content_key_unique').on(
      table.content_key,
    ),
    index('background_definitions_name_rules_edition_index').on(
      table.name,
      table.rules_edition,
    ),
  ],
);
