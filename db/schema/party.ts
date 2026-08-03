import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import type {
  CharacterId,
  PartyPublicationId,
} from '../../src/domain/ids';
import {
  PARTY_DOCUMENT_KINDS,
  PARTY_FORGES,
  PARTY_OBSERVATION_STATES,
  type PartyDocumentKind,
  type PartyObservationState,
} from '../../src/party/document-state';
import type {
  Forge,
  RepositoryPath,
  RepositoryRevision,
} from '../../src/party/storage/contracts';
import { datetime, integerAtLeast, varchar } from './columns';
import { characters } from './character';

function textMembers(values: readonly string[]): string {
  return values
    .map((value) =>
      value
        .split(';')
        .map((part) => `'${part.replaceAll("'", "''")}'`)
        .join(' || char(59) || '),
    )
    .join(', ');
}

export const party_document_states = sqliteTable(
  'party_document_states',
  {
    forge: varchar<Forge>()('forge').notNull(),
    repository: varchar()('repository').notNull(),
    observed_ref: varchar()('observed_ref'),
    path: varchar<RepositoryPath>()('path').notNull(),
    document_kind: varchar<PartyDocumentKind>()('document_kind').notNull(),
    publication_id: varchar<PartyPublicationId>()('publication_id'),
    character_id: integer('character_id')
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'set null' }),
    last_observed_remote_revision: varchar<RepositoryRevision>()(
      'last_observed_remote_revision',
    ),
    last_imported_revision: varchar<RepositoryRevision>()(
      'last_imported_revision',
    ),
    last_published_local_revision: integer('last_published_local_revision'),
    last_successful_refresh_at: datetime()('last_successful_refresh_at'),
    observation_state:
      varchar<PartyObservationState>()('observation_state').notNull(),
  },
  (table) => [
    check(
      'party_document_states_forge_check',
      sql.raw(`\`forge\` IN (${textMembers(PARTY_FORGES)})`),
    ),
    check(
      'party_document_states_kind_check',
      sql.raw(`\`document_kind\` IN (${textMembers(PARTY_DOCUMENT_KINDS)})`),
    ),
    check(
      'party_document_states_observation_state_check',
      sql.raw(
        `\`observation_state\` IN (${textMembers(PARTY_OBSERVATION_STATES)})`,
      ),
    ),
    check(
      'party_document_states_local_revision_check',
      sql`last_published_local_revision IS NULL OR ${integerAtLeast(
        'last_published_local_revision',
        0,
      )}`,
    ),
    primaryKey({
      name: 'party_document_states_primary',
      columns: [table.forge, table.repository, table.path],
    }),
  ],
);
