import { integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type {
  BackgroundDefinitionId,
  ContentKey,
  FeatDefinitionId,
  SpeciesDefinitionId,
} from '../../src/domain/ids';
import type { RulesEdition } from '../../src/domain/enums';
import {
  datetime,
  sqlText,
  tinyint1,
  varchar,
} from './columns';

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
    content_key: varchar<ContentKey>()('content_key').notNull(),
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
    uniqueIndex('feat_definitions_content_key_unique').on(table.content_key),
    uniqueIndex('feat_definitions_name_rules_edition_unique').on(
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
    content_key: varchar<ContentKey>()('content_key').notNull(),
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
    uniqueIndex('species_definitions_name_rules_edition_unique').on(
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
    content_key: varchar<ContentKey>()('content_key').notNull(),
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
    uniqueIndex('background_definitions_name_rules_edition_unique').on(
      table.name,
      table.rules_edition,
    ),
  ],
);
