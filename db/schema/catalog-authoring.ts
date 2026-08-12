import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import {
  authoredContentKinds,
  type AuthoredContentKind,
} from '../../src/authoring/contracts';
import { AUTHORING_DOCUMENT_LIMITS } from '../../src/authoring/limits';
import type { HomebrewDraftUuid } from '../../src/authoring/ids';
import type {
  CharacterId,
  CharacterRevision,
  ContentKey,
  Timestamp,
} from '../../src/domain/ids';
import { catalog_content_identities } from './catalog-content';
import { characters } from './character';
import { datetime, oneOf, sqlText, varchar } from './columns';

/**
 * Durable incomplete editor state. Published catalog rows remain semantic
 * truth; this envelope deliberately permits only the three D133 authoring
 * kinds and keeps every draft outside portable character/library documents.
 */
export const catalog_content_drafts = sqliteTable(
  'catalog_content_drafts',
  {
    draft_uuid: varchar<HomebrewDraftUuid>()('draft_uuid').primaryKey().notNull(),
    content_kind: varchar<AuthoredContentKind>()('content_kind').notNull(),
    document_version: integer('document_version').notNull(),
    base_content_key: varchar<ContentKey>()('base_content_key'),
    revision: integer('revision').notNull().default(0),
    document_json: sqlText()('document_json').notNull(),
    created_at: datetime<Timestamp>()('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updated_at: datetime<Timestamp>()('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      'catalog_content_drafts_uuid_check',
      sql`length(${table.draft_uuid}) > 0`,
    ),
    check(
      'catalog_content_drafts_kind_check',
      oneOf('content_kind', authoredContentKinds),
    ),
    check(
      'catalog_content_drafts_document_version_check',
      sql`typeof(${table.document_version}) = 'integer' AND ${table.document_version} >= 1`,
    ),
    check(
      'catalog_content_drafts_revision_check',
      sql`typeof(${table.revision}) = 'integer' AND ${table.revision} >= 0`,
    ),
    check(
      'catalog_content_drafts_document_size_check',
      sql`length(CAST(${table.document_json} AS BLOB)) BETWEEN 1 AND ${sql.raw(String(AUTHORING_DOCUMENT_LIMITS.encodedBytes))}`,
    ),
    foreignKey({
      name: 'catalog_content_drafts_base_content_foreign',
      columns: [table.content_kind, table.base_content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('restrict'),
    index('catalog_content_drafts_kind_updated_index').on(
      table.content_kind,
      table.updated_at,
      table.draft_uuid,
    ),
    index('catalog_content_drafts_base_content_index').on(
      table.content_kind,
      table.base_content_key,
    ),
  ],
);

/**
 * The durable membership promise for one archived homebrew set (D214).
 *
 * `character_id` deliberately has no foreign key: deleting an archived
 * character must leave this evidence behind so restore can name the missing
 * member and refuse instead of silently shrinking the set. The catalog
 * identity owns the manifest and a future whole-lineage purge may remove it
 * together with that identity.
 */
export const catalog_content_archive_members = sqliteTable(
  'catalog_content_archive_members',
  {
    content_kind: varchar<AuthoredContentKind>()('content_kind').notNull(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    character_id: integer('character_id').notNull().$type<CharacterId>(),
    character_revision: integer('character_revision')
      .notNull()
      .$type<CharacterRevision>(),
    character_name: varchar()('character_name').notNull(),
    archived_at: datetime<Timestamp>()('archived_at').notNull(),
  },
  (table) => [
    check(
      'catalog_content_archive_members_kind_check',
      oneOf('content_kind', authoredContentKinds),
    ),
    check(
      'catalog_content_archive_members_character_id_check',
      sql`typeof(${table.character_id}) = 'integer' AND ${table.character_id} >= 1`,
    ),
    check(
      'catalog_content_archive_members_character_revision_check',
      sql`typeof(${table.character_revision}) = 'integer' AND ${table.character_revision} >= 0`,
    ),
    check(
      'catalog_content_archive_members_archived_at_check',
      sql`typeof(${table.archived_at}) = 'text'`,
    ),
    foreignKey({
      name: 'catalog_content_archive_members_content_foreign',
      columns: [table.content_kind, table.content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('cascade'),
    primaryKey({
      name: 'catalog_content_archive_members_primary',
      columns: [table.content_kind, table.content_key, table.character_id],
    }),
  ],
);

/** A recipient's durable decision to leave one character on an older version. */
export const catalog_content_replacement_choices = sqliteTable(
  'catalog_content_replacement_choices',
  {
    content_kind: varchar<AuthoredContentKind>()('content_kind').notNull(),
    superseded_content_key: varchar<ContentKey>()('superseded_content_key').notNull(),
    successor_content_key: varchar<ContentKey>()('successor_content_key').notNull(),
    character_id: integer('character_id').notNull().$type<CharacterId>(),
    decided_at: datetime<Timestamp>()('decided_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      'catalog_content_replacement_choices_kind_check',
      oneOf('content_kind', authoredContentKinds),
    ),
    check(
      'catalog_content_replacement_choices_distinct_keys_check',
      sql`${table.superseded_content_key} <> ${table.successor_content_key}`,
    ),
    check(
      'catalog_content_replacement_choices_character_id_check',
      sql`typeof(${table.character_id}) = 'integer' AND ${table.character_id} >= 1`,
    ),
    check(
      'catalog_content_replacement_choices_decided_at_check',
      sql`typeof(${table.decided_at}) = 'text'`,
    ),
    foreignKey({
      name: 'catalog_content_replacement_choices_superseded_foreign',
      columns: [table.content_kind, table.superseded_content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('cascade'),
    foreignKey({
      name: 'catalog_content_replacement_choices_successor_foreign',
      columns: [table.content_kind, table.successor_content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('cascade'),
    foreignKey({
      name: 'catalog_content_replacement_choices_character_foreign',
      columns: [table.character_id],
      foreignColumns: [characters.id],
    }).onDelete('cascade'),
    primaryKey({
      name: 'catalog_content_replacement_choices_primary',
      columns: [
        table.content_kind,
        table.superseded_content_key,
        table.successor_content_key,
        table.character_id,
      ],
    }),
    index('catalog_content_replacement_choices_character_index').on(
      table.character_id,
      table.content_kind,
    ),
  ],
);
