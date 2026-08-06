import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import {
  authoredContentKinds,
  type AuthoredContentKind,
} from '../../src/authoring/contracts';
import { AUTHORING_DOCUMENT_LIMITS } from '../../src/authoring/limits';
import type { HomebrewDraftUuid } from '../../src/authoring/ids';
import type { ContentKey, Timestamp } from '../../src/domain/ids';
import { catalog_content_identities } from './catalog-content';
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
