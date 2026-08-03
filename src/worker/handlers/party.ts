import type { SqlRow } from '../../db/codecs';
import {
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
} from '../../db/codecs';
import type { DatabaseContext } from '../../db/database';
import type { CharacterId, PartyPublicationId } from '../../domain/ids';
import {
  PARTY_DOCUMENT_KINDS,
  PARTY_FORGES,
  PARTY_OBSERVATION_STATES,
  observationStateKind,
  type PartyDocumentKind,
  type PartyObservationState,
} from '../../party/document-state';
import {
  PARTY_RPC,
  type PartyDocumentState,
  type PartyRepositoryIdentity,
} from '../../party/client';
import { parseRepositoryPath } from '../../party/storage/repository-path';
import type {
  Forge,
  RepositoryPath,
  RepositoryRevision,
} from '../../party/storage/contracts';
import {
  defineRpcHandler,
  isRecord,
  type RpcHandler,
} from '../handler';

interface SaveDocumentStateParams {
  readonly state: PartyDocumentState;
}

const STATE_COLUMNS = `
  forge,
  repository,
  observed_ref,
  path,
  document_kind,
  publication_id,
  character_id,
  last_observed_remote_revision,
  last_imported_revision,
  last_published_local_revision,
  last_successful_refresh_at,
  observation_state
`;

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0);
}

function isNullableSafeInteger(value: unknown): value is number | null {
  return value === null || Number.isSafeInteger(value);
}

function isForge(value: unknown): value is Forge {
  return typeof value === 'string' && PARTY_FORGES.some((forge) => forge === value);
}

function isDocumentKind(value: unknown): value is PartyDocumentKind {
  return typeof value === 'string' &&
    PARTY_DOCUMENT_KINDS.some((kind) => kind === value);
}

function isObservationState(value: unknown): value is PartyObservationState {
  return typeof value === 'string' &&
    PARTY_OBSERVATION_STATES.some((state) => state === value);
}

function isConfirmedPublishState(state: PartyObservationState): boolean {
  switch (state) {
    case 'Published at revision N from this device':
    case 'Published; refresh required before another publish':
      return true;
    case 'Never published':
    case 'Unpublished local changes':
    case 'No longer published':
    case 'Never refreshed':
    case 'Last refreshed successfully':
    case 'Latest refresh attempt':
      return false;
  }
}

function isIsoTimestamp(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function pathMatchesState(
  path: string,
  kind: PartyDocumentKind,
  publicationId: unknown,
): publicationId is PartyPublicationId | null {
  const parsed = parseRepositoryPath(path);
  if (parsed.kind !== 'success' || !path.endsWith('.json')) return false;
  if (!path.startsWith(`${kind === 'library' ? 'library' : 'characters'}/`)) {
    return false;
  }
  if (path === 'library/party-library.json') return publicationId === null;
  return typeof publicationId === 'string' &&
    publicationId.length > 0 &&
    path.endsWith(`--${publicationId}.json`);
}

function isRepositoryIdentity(
  value: unknown,
): value is PartyRepositoryIdentity {
  return isRecord(value) &&
    hasExactKeys(value, ['forge', 'repository']) &&
    isForge(value.forge) &&
    typeof value.repository === 'string' &&
    value.repository.length > 0;
}

function isPartyDocumentState(value: unknown): value is PartyDocumentState {
  if (!isRecord(value) || !hasExactKeys(value, [
    'forge',
    'repository',
    'observedRef',
    'path',
    'documentKind',
    'publicationId',
    'characterId',
    'lastObservedRemoteRevision',
    'lastImportedRevision',
    'lastPublishedLocalRevision',
    'lastSuccessfulRefreshAt',
    'observationState',
  ])) return false;
  if (!isForge(value.forge) ||
      typeof value.repository !== 'string' ||
      value.repository.length === 0 ||
      !isNullableNonEmptyString(value.observedRef) ||
      typeof value.path !== 'string' ||
      !isDocumentKind(value.documentKind) ||
      !pathMatchesState(value.path, value.documentKind, value.publicationId) ||
      !isNullableSafeInteger(value.characterId) ||
      (typeof value.characterId === 'number' && value.characterId < 1) ||
      !isNullableNonEmptyString(value.lastObservedRemoteRevision) ||
      !isNullableNonEmptyString(value.lastImportedRevision) ||
      !isNullableSafeInteger(value.lastPublishedLocalRevision) ||
      (typeof value.lastPublishedLocalRevision === 'number' &&
        value.lastPublishedLocalRevision < 0) ||
      !isIsoTimestamp(value.lastSuccessfulRefreshAt) ||
      !isObservationState(value.observationState)) {
    return false;
  }
  observationStateKind(value.observationState);
  return true;
}

function isSaveDocumentStateParams(
  value: unknown,
): value is SaveDocumentStateParams {
  return isRecord(value) &&
    hasExactKeys(value, ['state']) &&
    isPartyDocumentState(value.state);
}

function decodeForge(value: string): Forge {
  switch (value) {
    case 'github':
    case 'gitlab':
    case 'codeberg':
      return value;
  }
  throw new TypeError(`Column "forge" contains an unknown forge ${value}.`);
}

function decodeDocumentKind(value: string): PartyDocumentKind {
  switch (value) {
    case 'library':
    case 'character':
      return value;
  }
  throw new TypeError(
    `Column "document_kind" contains an unknown kind ${value}.`,
  );
}

function decodeObservationState(value: string): PartyObservationState {
  switch (value) {
    case 'Never published':
    case 'Unpublished local changes':
    case 'Published at revision N from this device':
    case 'Published; refresh required before another publish':
    case 'No longer published':
    case 'Never refreshed':
    case 'Last refreshed successfully':
    case 'Latest refresh attempt':
      return value;
  }
  throw new TypeError(
    `Column "observation_state" contains an unknown state ${value}.`,
  );
}

function decodeState(row: SqlRow): PartyDocumentState {
  const publicationId = sqlNullableString(row, 'publication_id');
  const characterId = sqlNullableInteger(row, 'character_id');
  const remoteRevision = sqlNullableString(
    row,
    'last_observed_remote_revision',
  );
  const importedRevision = sqlNullableString(row, 'last_imported_revision');
  return {
    forge: decodeForge(sqlString(row, 'forge')),
    repository: sqlString(row, 'repository'),
    observedRef: sqlNullableString(row, 'observed_ref'),
    path: sqlString(row, 'path') as RepositoryPath,
    documentKind: decodeDocumentKind(sqlString(row, 'document_kind')),
    publicationId:
      publicationId === null ? null : publicationId as PartyPublicationId,
    characterId: characterId === null ? null : characterId as CharacterId,
    lastObservedRemoteRevision:
      remoteRevision === null ? null : remoteRevision as RepositoryRevision,
    lastImportedRevision:
      importedRevision === null ? null : importedRevision as RepositoryRevision,
    lastPublishedLocalRevision: sqlNullableInteger(
      row,
      'last_published_local_revision',
    ),
    lastSuccessfulRefreshAt: sqlNullableString(
      row,
      'last_successful_refresh_at',
    ),
    observationState: decodeObservationState(
      sqlString(row, 'observation_state'),
    ),
  };
}

function listDocumentStates(
  db: DatabaseContext,
  repository: PartyRepositoryIdentity,
): readonly PartyDocumentState[] {
  return db.all(
    `SELECT ${STATE_COLUMNS}
     FROM party_document_states
     WHERE forge = ? AND repository = ?
     ORDER BY path`,
    [repository.forge, repository.repository],
    decodeState,
  );
}

function saveDocumentState(
  db: DatabaseContext,
  state: PartyDocumentState,
): PartyDocumentState {
  return db.transaction((transaction) => {
    const current = transaction.one(
      `SELECT ${STATE_COLUMNS}
       FROM party_document_states
       WHERE forge = ? AND repository = ? AND path = ?`,
      [state.forge, state.repository, state.path],
      decodeState,
    );
    const confirmedPublish = isConfirmedPublishState(state.observationState);
    if (confirmedPublish && state.lastPublishedLocalRevision === null) {
      throw new Error(
        'A confirmed publish requires its published local revision.',
      );
    }
    if (
      !confirmedPublish &&
      state.lastPublishedLocalRevision !==
        (current?.lastPublishedLocalRevision ?? null)
    ) {
      throw new Error(
        'Only a confirmed publish may change the published local revision.',
      );
    }
    if (
      state.observationState === 'Last refreshed successfully' &&
      state.lastSuccessfulRefreshAt === null
    ) {
      throw new Error('A successful refresh requires its observed time.');
    }
    if (
      state.observationState === 'Never refreshed' &&
      state.lastSuccessfulRefreshAt !== null
    ) {
      throw new Error('A never-refreshed observation cannot carry a success time.');
    }
    if (
      state.observationState !== 'Last refreshed successfully' &&
      state.lastSuccessfulRefreshAt !==
        (current?.lastSuccessfulRefreshAt ?? null)
    ) {
      throw new Error(
        'Only a successful refresh may advance the successful refresh time.',
      );
    }
    if (
      state.observationState === 'Last refreshed successfully' &&
      current?.lastSuccessfulRefreshAt !== null &&
      current?.lastSuccessfulRefreshAt !== undefined &&
      state.lastSuccessfulRefreshAt !== null &&
      state.lastSuccessfulRefreshAt < current.lastSuccessfulRefreshAt
    ) {
      throw new Error(
        'A successful refresh cannot rewind the successful refresh time.',
      );
    }

    transaction.exec(
      `INSERT INTO party_document_states (${STATE_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(forge, repository, path) DO UPDATE SET
         observed_ref = excluded.observed_ref,
         document_kind = excluded.document_kind,
         publication_id = excluded.publication_id,
         character_id = excluded.character_id,
         last_observed_remote_revision = excluded.last_observed_remote_revision,
         last_imported_revision = excluded.last_imported_revision,
         last_published_local_revision = excluded.last_published_local_revision,
         last_successful_refresh_at = excluded.last_successful_refresh_at,
         observation_state = excluded.observation_state`,
      [
        state.forge,
        state.repository,
        state.observedRef,
        state.path,
        state.documentKind,
        state.publicationId,
        state.characterId,
        state.lastObservedRemoteRevision,
        state.lastImportedRevision,
        state.lastPublishedLocalRevision,
        state.lastSuccessfulRefreshAt,
        state.observationState,
      ],
    );
    const saved = transaction.one(
      `SELECT ${STATE_COLUMNS}
       FROM party_document_states
       WHERE forge = ? AND repository = ? AND path = ?`,
      [state.forge, state.repository, state.path],
      decodeState,
    );
    if (saved === null) {
      throw new Error('Saved party document state could not be read back.');
    }
    return saved;
  });
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    PARTY_RPC.listDocumentStates,
    isRepositoryIdentity,
    (context, params) => listDocumentStates(context.db, params),
  ),
  defineRpcHandler(
    PARTY_RPC.saveDocumentState,
    isSaveDocumentStateParams,
    (context, params) => saveDocumentState(context.db, params.state),
  ),
]);
