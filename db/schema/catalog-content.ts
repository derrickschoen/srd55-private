import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  primaryKey,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type {
  ContentKey,
  Timestamp,
} from '../../src/domain/ids';
import type {
  CanonicalContentIdentityJson,
  ContentFingerprintDigest,
  ContentFingerprintScheme,
  ContentKind,
  NormalizedContentName,
} from '../../src/catalog/content-identity';
import { contentKinds } from '../../src/catalog/content-identity';
import { datetime, oneOf, sqlText, tinyint1, varchar } from './columns';

export const catalogContentOriginKinds = [
  'authored_here',
  'built_in',
  'unknown',
] as const;
export type CatalogContentOriginKind =
  (typeof catalogContentOriginKinds)[number];

export type CatalogContentKeyKind =
  | 'derived'
  | 'asserted'
  | 'bundled-stable';
export type CatalogContentLayer = 'bundled' | 'external';
export type CatalogContentFingerprintRole =
  | 'current'
  | 'compatible'
  | 'bundled-historical';
export type CatalogContentAliasKind =
  | 'declared-legacy'
  | 'rekeyed-primary'
  | 'bundled-legacy';
export type CatalogContentMatchDecision = 'match' | 'clone';

/**
 * Applied markers for the append-only TypeScript catalog data-migration
 * registry. Schema migrations create structure; these markers record the
 * separately frozen semantic projector passes that have reached this image.
 */
export const catalog_data_migrations = sqliteTable(
  'catalog_data_migrations',
  {
    id: varchar()('id').primaryKey().notNull(),
    scheme: varchar<ContentFingerprintScheme>()('scheme').notNull(),
    checksum: varchar()('checksum').notNull(),
    applied_at: datetime<Timestamp>()('applied_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      'catalog_data_migrations_id_check',
      sql`length(${table.id}) > 0`,
    ),
    check(
      'catalog_data_migrations_scheme_check',
      sql`${table.scheme} IN ('content-v1', 'content-v2')`,
    ),
    check(
      'catalog_data_migrations_checksum_check',
      sql`length(${table.checksum}) = 64
        AND ${table.checksum} NOT GLOB '*[^0-9a-f]*'`,
    ),
  ],
);

export const catalog_content_identities = sqliteTable(
  'catalog_content_identities',
  {
    content_key: varchar<ContentKey>()('content_key').primaryKey().notNull(),
    content_kind: varchar<ContentKind>()('content_kind').notNull(),
    key_kind: varchar<CatalogContentKeyKind>()('key_kind').notNull(),
    catalog_layer: varchar<CatalogContentLayer>()('catalog_layer').notNull(),
    normalized_name: varchar<NormalizedContentName>()(
      'normalized_name',
    ).notNull(),
    created_at: datetime<Timestamp>()('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    archived_at: datetime<Timestamp>()('archived_at'),
  },
  (table) => [
    check(
      'catalog_content_identities_content_kind_check',
      oneOf('content_kind', contentKinds),
    ),
    check(
      'catalog_content_identities_key_kind_check',
      sql`${table.key_kind} IN ('derived', 'asserted', 'bundled-stable')`,
    ),
    check(
      'catalog_content_identities_catalog_layer_check',
      sql`${table.catalog_layer} IN ('bundled', 'external')`,
    ),
    check(
      'catalog_content_identities_normalized_name_check',
      sql`length(${table.normalized_name}) > 0`,
    ),
    check(
      'catalog_content_identities_archived_at_check',
      sql`${table.archived_at} IS NULL OR typeof(${table.archived_at}) = 'text'`,
    ),
    check(
      'catalog_content_identities_key_layer_check',
      sql`(
        (${table.key_kind} = 'derived'
          AND ${table.catalog_layer} = 'external'
          AND instr(${table.content_key}, ':content.v1:') > 1
          AND substr(
            ${table.content_key},
            1,
            instr(${table.content_key}, ':content.v1:') - 1
          ) NOT GLOB '*[^a-z0-9-]*'
          AND substr(${table.content_key}, 1, 1) <> '-'
          AND substr(
            ${table.content_key},
            instr(${table.content_key}, ':content.v1:') - 1,
            1
          ) <> '-'
          AND instr(
            substr(
              ${table.content_key},
              1,
              instr(${table.content_key}, ':content.v1:') - 1
            ),
            '--'
          ) = 0
          AND length(substr(
            ${table.content_key},
            instr(${table.content_key}, ':content.v1:') + 12
          )) = 64
          AND substr(
            ${table.content_key},
            instr(${table.content_key}, ':content.v1:') + 12
          ) NOT GLOB '*[^0-9a-f]*')
        OR (${table.key_kind} = 'asserted'
          AND ${table.catalog_layer} = 'external'
          -- Exact grammar shared with isAssertedExternalContentKey:
          -- edition:name, or edition:dotted.owner:name. Every component is a
          -- lowercase alphanumeric/hyphen slug with no empty hyphen segment.
          AND length(${table.content_key}) > 2
          AND ${table.content_key} NOT GLOB '*[^a-z0-9:.-]*'
          AND instr(${table.content_key}, ':') > 1
          AND substr(${table.content_key}, 1, 1) NOT IN ('-', '.', ':')
          AND substr(${table.content_key}, -1, 1) NOT IN ('-', '.', ':')
          AND instr(${table.content_key}, '::') = 0
          AND instr(${table.content_key}, '..') = 0
          AND instr(${table.content_key}, '--') = 0
          AND instr(${table.content_key}, ':.') = 0
          AND instr(${table.content_key}, '.:') = 0
          AND instr(${table.content_key}, ':-') = 0
          AND instr(${table.content_key}, '-:') = 0
          AND instr(${table.content_key}, '.-') = 0
          AND instr(${table.content_key}, '-.') = 0
          AND (
            (length(${table.content_key}) - length(replace(${table.content_key}, ':', '')) = 1
              AND instr(${table.content_key}, '.') = 0)
            OR
            (length(${table.content_key}) - length(replace(${table.content_key}, ':', '')) = 2
              AND instr(substr(${table.content_key}, instr(${table.content_key}, ':') + 1), ':') > 1
              AND instr(substr(${table.content_key}, 1, instr(${table.content_key}, ':') - 1), '.') = 0
              AND instr(substr(
                ${table.content_key},
                instr(${table.content_key}, ':') + 1,
                instr(substr(${table.content_key}, instr(${table.content_key}, ':') + 1), ':') - 1
              ), '.') > 1
              AND instr(substr(
                ${table.content_key},
                instr(${table.content_key}, ':') +
                  instr(substr(${table.content_key}, instr(${table.content_key}, ':') + 1), ':') + 1
              ), '.') = 0)
          ))
        OR (${table.key_kind} = 'bundled-stable'
          AND ${table.catalog_layer} = 'bundled')
      )`,
    ),
    uniqueIndex('catalog_content_identities_kind_key_unique').on(
      table.content_kind,
      table.content_key,
    ),
    index('catalog_content_identities_layer_kind_index').on(
      table.catalog_layer,
      table.content_kind,
    ),
    index('catalog_content_identities_name_index').on(
      table.content_kind,
      table.normalized_name,
    ),
    index('catalog_content_identities_archive_list_index').on(
      sql`${table.archived_at} desc`,
      table.content_kind,
      table.normalized_name,
      table.content_key,
    ),
  ],
);

/**
 * Transfer provenance is not rules identity. The fingerprint says what an
 * aggregate is; this row says what we honestly know about where it came from.
 * Nullable attribution stays nullable all the way through re-export.
 */
export const catalog_content_provenance = sqliteTable(
  'catalog_content_provenance',
  {
    content_kind: varchar<ContentKind>()('content_kind').notNull(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    origin_kind: varchar<CatalogContentOriginKind>()('origin_kind').notNull(),
    received: tinyint1('received').notNull(),
    local_derivation: tinyint1('local_derivation').notNull(),
    author_label: varchar()('author_label'),
    source_label: varchar()('source_label'),
    license_label: varchar()('license_label'),
    attribution_text: sqlText()('attribution_text'),
    recorded_at: datetime<Timestamp>()('recorded_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      'catalog_content_provenance_kind_check',
      oneOf('content_kind', contentKinds),
    ),
    check(
      'catalog_content_provenance_origin_kind_check',
      oneOf('origin_kind', catalogContentOriginKinds),
    ),
    check(
      'catalog_content_provenance_received_check',
      sql`${table.received} IN (0, 1)`,
    ),
    check(
      'catalog_content_provenance_local_derivation_check',
      sql`${table.local_derivation} IN (0, 1)`,
    ),
    check(
      'catalog_content_provenance_labels_check',
      sql`(${table.author_label} IS NULL OR length(${table.author_label}) BETWEEN 1 AND 200)
        AND (${table.source_label} IS NULL OR length(${table.source_label}) BETWEEN 1 AND 200)
        AND (${table.license_label} IS NULL OR length(${table.license_label}) BETWEEN 1 AND 200)
        AND (${table.attribution_text} IS NULL OR length(CAST(${table.attribution_text} AS BLOB)) BETWEEN 1 AND 4096)`,
    ),
    foreignKey({
      name: 'catalog_content_provenance_identity_foreign',
      columns: [table.content_kind, table.content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('cascade'),
    primaryKey({
      name: 'catalog_content_provenance_primary',
      columns: [table.content_kind, table.content_key],
    }),
    index('catalog_content_provenance_received_index').on(
      table.received,
      table.origin_kind,
      table.content_kind,
    ),
  ],
);

/**
 * Recipient-local version lineage for immutable external catalog content.
 * The old and new aggregates both remain installed; this row is metadata for
 * library presentation and later explicit replacement workflows only. Named
 * storage triggers reject updates and any insert that closes a lineage cycle.
 */
export const catalog_content_supersessions = sqliteTable(
  'catalog_content_supersessions',
  {
    content_kind: varchar<ContentKind>()('content_kind').notNull(),
    superseded_content_key: varchar<ContentKey>()(
      'superseded_content_key',
    ).notNull(),
    successor_content_key: varchar<ContentKey>()(
      'successor_content_key',
    ).notNull(),
    recorded_at: datetime<Timestamp>()('recorded_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      'catalog_content_supersessions_content_kind_check',
      oneOf('content_kind', contentKinds),
    ),
    check(
      'catalog_content_supersessions_distinct_keys_check',
      sql`${table.superseded_content_key} <> ${table.successor_content_key}`,
    ),
    foreignKey({
      name: 'catalog_content_supersessions_superseded_foreign',
      columns: [table.content_kind, table.superseded_content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('restrict'),
    foreignKey({
      name: 'catalog_content_supersessions_successor_foreign',
      columns: [table.content_kind, table.successor_content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('restrict'),
    primaryKey({
      name: 'catalog_content_supersessions_primary',
      columns: [table.content_kind, table.superseded_content_key],
    }),
    index('catalog_content_supersessions_successor_index').on(
      table.content_kind,
      table.successor_content_key,
    ),
  ],
);

export const catalog_content_fingerprints = sqliteTable(
  'catalog_content_fingerprints',
  {
    content_kind: varchar<ContentKind>()('content_kind').notNull(),
    fingerprint_scheme: varchar<ContentFingerprintScheme>()(
      'fingerprint_scheme',
    ).notNull(),
    fingerprint_digest: varchar<ContentFingerprintDigest>()(
      'fingerprint_digest',
    ).notNull(),
    canonical_json: varchar<CanonicalContentIdentityJson>()(
      'canonical_json',
    ).notNull(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    fingerprint_role: varchar<CatalogContentFingerprintRole>()(
      'fingerprint_role',
    ).notNull(),
  },
  (table) => [
    check(
      'catalog_content_fingerprints_content_kind_check',
      oneOf('content_kind', contentKinds),
    ),
    foreignKey({
      name: 'catalog_content_fingerprints_identity_foreign',
      columns: [table.content_kind, table.content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('cascade'),
    check(
      'catalog_content_fingerprints_scheme_check',
      sql`${table.fingerprint_scheme} IN ('content-v1', 'content-v2')`,
    ),
    check(
      'catalog_content_fingerprints_digest_check',
      sql`length(${table.fingerprint_digest}) = 64
        AND ${table.fingerprint_digest} NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      'catalog_content_fingerprints_role_check',
      sql`${table.fingerprint_role}
        IN ('current', 'compatible', 'bundled-historical')`,
    ),
    primaryKey({
      name: 'catalog_content_fingerprints_primary',
      columns: [
        table.content_kind,
        table.fingerprint_scheme,
        table.fingerprint_digest,
        table.content_key,
      ],
    }),
    uniqueIndex('catalog_content_fingerprints_current_unique')
      .on(table.content_key)
      .where(sql`${table.fingerprint_role} = 'current'`),
    index('catalog_content_fingerprints_resolution_index').on(
      table.content_kind,
      table.fingerprint_scheme,
      table.fingerprint_digest,
    ),
  ],
);

export const catalog_content_aliases = sqliteTable(
  'catalog_content_aliases',
  {
    content_kind: varchar<ContentKind>()('content_kind').notNull(),
    alias_key: varchar<ContentKey>()('alias_key').notNull(),
    content_key: varchar<ContentKey>()('content_key').notNull(),
    alias_kind: varchar<CatalogContentAliasKind>()('alias_kind').notNull(),
  },
  (table) => [
    check(
      'catalog_content_aliases_content_kind_check',
      oneOf('content_kind', contentKinds),
    ),
    foreignKey({
      name: 'catalog_content_aliases_identity_foreign',
      columns: [table.content_kind, table.content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('cascade'),
    check(
      'catalog_content_aliases_alias_kind_check',
      sql`${table.alias_kind}
        IN ('declared-legacy', 'rekeyed-primary', 'bundled-legacy')`,
    ),
    primaryKey({
      name: 'catalog_content_aliases_primary',
      columns: [table.content_kind, table.alias_key, table.content_key],
    }),
    index('catalog_content_aliases_resolution_index').on(
      table.content_kind,
      table.alias_key,
    ),
  ],
);

export const catalog_content_match_decisions = sqliteTable(
  'catalog_content_match_decisions',
  {
    content_kind: varchar<ContentKind>()('content_kind').notNull(),
    incoming_fingerprint_scheme: varchar<ContentFingerprintScheme>()(
      'incoming_fingerprint_scheme',
    ).notNull(),
    incoming_fingerprint_digest: varchar<ContentFingerprintDigest>()(
      'incoming_fingerprint_digest',
    ).notNull(),
    decision: varchar<CatalogContentMatchDecision>()('decision').notNull(),
    target_content_key: varchar<ContentKey>()('target_content_key').notNull(),
    reviewed_at: datetime<Timestamp>()('reviewed_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      'catalog_content_match_decisions_content_kind_check',
      oneOf('content_kind', contentKinds),
    ),
    foreignKey({
      name: 'catalog_content_match_decisions_identity_foreign',
      columns: [table.content_kind, table.target_content_key],
      foreignColumns: [
        catalog_content_identities.content_kind,
        catalog_content_identities.content_key,
      ],
    }).onDelete('restrict'),
    check(
      'catalog_content_match_decisions_scheme_check',
      sql`${table.incoming_fingerprint_scheme} IN ('content-v1', 'content-v2')`,
    ),
    check(
      'catalog_content_match_decisions_digest_check',
      sql`length(${table.incoming_fingerprint_digest}) = 64
        AND ${table.incoming_fingerprint_digest} NOT GLOB '*[^0-9a-f]*'`,
    ),
    check(
      'catalog_content_match_decisions_decision_check',
      sql`${table.decision} IN ('match', 'clone')`,
    ),
    primaryKey({
      name: 'catalog_content_match_decisions_primary',
      columns: [
        table.content_kind,
        table.incoming_fingerprint_scheme,
        table.incoming_fingerprint_digest,
      ],
    }),
  ],
);
