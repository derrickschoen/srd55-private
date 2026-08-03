import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
} from '../../../src/backup/database-backup';
import type {
  CharacterId,
  PartyPublicationId,
} from '../../../src/domain/ids';
import {
  PARTY_RPC,
  type PartyDocumentState,
} from '../../../src/party/client';
import type {
  RepositoryPath,
  RepositoryRevision,
} from '../../../src/party/storage/contracts';
import { handlers } from '../../../src/worker/handlers/party';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

function state(overrides: Partial<PartyDocumentState> = {}): PartyDocumentState {
  return {
    forge: 'github',
    repository: 'table/party',
    observedRef: null,
    path: 'characters/ash--pub-1.json' as RepositoryPath,
    documentKind: 'character',
    publicationId: 'pub-1' as PartyPublicationId,
    characterId: null,
    lastObservedRemoteRevision: null,
    lastImportedRevision: null,
    lastPublishedLocalRevision: null,
    lastSuccessfulRefreshAt: null,
    observationState: 'Never published',
    ...overrides,
  };
}

async function save(value: PartyDocumentState) {
  if (harness === undefined) throw new Error('RPC harness is not open.');
  return harness.call<{ state: PartyDocumentState }, PartyDocumentState>(
    PARTY_RPC.saveDocumentState,
    { state: value },
  );
}

describe('party publication and observation index', () => {
  it('PARTY-INDEX-NULLS-STAY-NULL stores unknown facts as null without schema defaults', async () => {
    harness = await createRpcHarness(handlers);
    const saved = await save(state());
    expect(saved).toEqual({ id: 1, ok: true, result: state() });

    const columns = harness.context.db.allRaw(
      'PRAGMA table_info("party_document_states")',
    );
    for (const name of [
      'observed_ref',
      'publication_id',
      'character_id',
      'last_observed_remote_revision',
      'last_imported_revision',
      'last_published_local_revision',
      'last_successful_refresh_at',
    ]) {
      const column = columns.find((candidate) => candidate.name === name);
      expect(column, name).toMatchObject({ notnull: 0, dflt_value: null });
    }
  });

  it('enforces the closed observation vocabulary in SQLite, including the semicolon-bearing state', async () => {
    harness = await createRpcHarness(handlers);
    harness.context.db.exec(
      `INSERT INTO party_document_states
         (forge, repository, path, document_kind, observation_state)
       VALUES
         ('github', 'table/party', 'characters/ash--pub-1.json',
          'character',
          'Published; refresh required before another publish')`,
    );
    expect(() =>
      harness?.context.db.exec(
        `INSERT INTO party_document_states
           (forge, repository, path, document_kind, observation_state)
         VALUES
           ('github', 'table/party', 'characters/bex--pub-2.json',
            'character', 'Unknown')`,
      ),
    ).toThrow(/party_document_states_observation_state_check/u);
  });

  it('PARTY-INDEX-NOT-CHARACTER-TRUTH rebinds one publication path to the newest clone without mutating character truth', async () => {
    harness = await createRpcHarness(handlers);
    const first = harness.context.db.exec(
      "INSERT INTO characters (name, revision) VALUES ('Old Ash', 4)",
    ).lastInsertId;
    const newest = harness.context.db.exec(
      "INSERT INTO characters (name, revision) VALUES ('New Ash', 9)",
    ).lastInsertId;

    await save(state({ characterId: first as CharacterId }));
    await save(state({ characterId: newest as CharacterId }));
    const listed = await harness.call<
      { forge: 'github'; repository: string },
      readonly PartyDocumentState[]
    >(PARTY_RPC.listDocumentStates, {
      forge: 'github',
      repository: 'table/party',
    });

    expect(listed).toMatchObject({
      ok: true,
      result: [{ characterId: newest, path: 'characters/ash--pub-1.json' }],
    });
    expect(
      harness.context.db.allRaw(
        'SELECT id, name, revision FROM characters ORDER BY id',
      ),
    ).toEqual([
      { id: first, name: 'Old Ash', revision: 4 },
      { id: newest, name: 'New Ash', revision: 9 },
    ]);
  });

  it('supports the primary library and multiple named subset rows in one repository', async () => {
    harness = await createRpcHarness(handlers);
    await save(state({
      path: 'library/party-library.json' as RepositoryPath,
      documentKind: 'library',
      publicationId: null,
      observationState: 'Never refreshed',
    }));
    await save(state({
      path: 'library/spells--subset-1.json' as RepositoryPath,
      documentKind: 'library',
      publicationId: 'subset-1' as PartyPublicationId,
      observationState: 'Never refreshed',
    }));

    const rows = harness.context.db.allRaw(
      `SELECT path FROM party_document_states
       WHERE forge = 'github' AND repository = 'table/party' ORDER BY path`,
    );
    expect(rows).toEqual([
      { path: 'library/party-library.json' },
      { path: 'library/spells--subset-1.json' },
    ]);
  });

  describe('PARTY-NO-FALSE-FRESHNESS', () => {
    it('PUBLISHED-WITHOUT-REVISION refuses an invented publish success', async () => {
      harness = await createRpcHarness(handlers);

      const result = await save(state({
        observationState: 'Published at revision N from this device',
      }));

      expect(result).toMatchObject({
        ok: false,
        error: { code: 'handler_error' },
      });
      expect(
        harness.context.db.oneRaw('SELECT COUNT(*) AS count FROM party_document_states'),
      ).toEqual({ count: 0 });
    });

    it('FAILURE-CANNOT-ASSERT-PUBLISH refuses a publish revision during failure', async () => {
      harness = await createRpcHarness(handlers);
      await save(state({
        lastPublishedLocalRevision: 7,
        observationState: 'Published at revision N from this device',
      }));

      const result = await save(state({
        lastPublishedLocalRevision: 8,
        observationState: 'Latest refresh attempt',
      }));

      expect(result).toMatchObject({
        ok: false,
        error: { code: 'handler_error' },
      });
      expect(
        harness.context.db.oneRaw(
          `SELECT last_published_local_revision, observation_state
           FROM party_document_states`,
        ),
      ).toEqual({
        last_published_local_revision: 7,
        observation_state: 'Published at revision N from this device',
      });
    });

    it('SUCCESSFUL-TIME-REWIND refuses a regressing success timestamp', async () => {
      harness = await createRpcHarness(handlers);
      const latestSuccessfulAt = '2026-08-02T12:05:00.000Z';
      await save(state({
        lastSuccessfulRefreshAt: latestSuccessfulAt,
        observationState: 'Last refreshed successfully',
      }));

      const result = await save(state({
        lastSuccessfulRefreshAt: '2026-08-02T12:00:00.000Z',
        observationState: 'Last refreshed successfully',
      }));

      expect(result).toMatchObject({
        ok: false,
        error: { code: 'handler_error' },
      });
      expect(
        harness.context.db.oneRaw(
          `SELECT last_successful_refresh_at, observation_state
           FROM party_document_states`,
        ),
      ).toEqual({
        last_successful_refresh_at: latestSuccessfulAt,
        observation_state: 'Last refreshed successfully',
      });
    });

    it('FAILED-ATTEMPT-PRESERVES-SUCCESS accepts unchanged proved freshness', async () => {
      harness = await createRpcHarness(handlers);
      const successfulAt = '2026-08-02T12:00:00.000Z';
      await save(state({
        lastSuccessfulRefreshAt: successfulAt,
        observationState: 'Last refreshed successfully',
      }));

      const partial = await save(state({
        lastObservedRemoteRevision: 'remote-2' as RepositoryRevision,
        lastImportedRevision: 'remote-2' as RepositoryRevision,
        lastSuccessfulRefreshAt: successfulAt,
        observationState: 'Latest refresh attempt',
      }));
      expect(partial).toMatchObject({
        ok: true,
        result: {
          lastImportedRevision: 'remote-2',
          lastSuccessfulRefreshAt: successfulAt,
          observationState: 'Latest refresh attempt',
        },
      });
    });
  });

  it('PARTY-ROSTER-NEWEST-IMPORTED-CLONE imports twice and binds exactly one row to the second clone', async () => {
    harness = await createRpcHarness(handlers);
    const sourceId = harness.context.db.exec(
      "INSERT INTO characters (name, revision) VALUES ('Published Ash', 7)",
    ).lastInsertId;
    const document = exportCharacterBackup(
      harness.context.db,
      sourceId,
      '2026-08-02T12:00:00.000Z',
    );
    harness.context.db.exec('DELETE FROM characters WHERE id = ?', [sourceId]);

    const first = importCharacterBackup(harness.context.db, document);
    await save(state({
      characterId: first.characterId as CharacterId,
      lastPublishedLocalRevision: 7,
      observationState: 'Published at revision N from this device',
    }));
    const second = importCharacterBackup(harness.context.db, document);
    await save(state({
      characterId: second.characterId as CharacterId,
      lastPublishedLocalRevision: 7,
      observationState: 'Published at revision N from this device',
    }));

    expect(first.characterId).not.toBe(second.characterId);
    expect(
      harness.context.db.allRaw('SELECT id FROM characters ORDER BY id'),
    ).toEqual([{ id: first.characterId }, { id: second.characterId }]);
    expect(
      harness.context.db.allRaw(
        'SELECT character_id, path FROM party_document_states',
      ),
    ).toEqual([
      {
        character_id: second.characterId,
        path: 'characters/ash--pub-1.json',
      },
    ]);
  });

  it('PARTY-INDEX-CLONE-NO-BINDING leaves an imported D62 clone unbound', async () => {
    harness = await createRpcHarness(handlers);
    const originalId = harness.context.db.exec(
      "INSERT INTO characters (name) VALUES ('Published Ash')",
    ).lastInsertId;
    await save(state({ characterId: originalId as CharacterId }));
    const document = exportCharacterBackup(
      harness.context.db,
      originalId,
      '2026-08-02T12:00:00.000Z',
    );
    const imported = importCharacterBackup(harness.context.db, document);

    expect(imported.characterId).not.toBe(originalId);
    expect(
      harness.context.db.allRaw(
        'SELECT character_id, path FROM party_document_states',
      ),
    ).toEqual([
      { character_id: originalId, path: 'characters/ash--pub-1.json' },
    ]);
  });

  it('PARTY-INDEX-DB-BACKUP-ROUND-TRIP survives whole-image restore but stays out of character backups', async () => {
    harness = await createRpcHarness(handlers);
    const characterId = harness.context.db.exec(
      "INSERT INTO characters (name) VALUES ('Backup Ash')",
    ).lastInsertId;
    await save(state({ characterId: characterId as CharacterId }));
    const characterDocument = exportCharacterBackup(
      harness.context.db,
      characterId,
      '2026-08-02T12:00:00.000Z',
    );
    expect(JSON.stringify(characterDocument)).not.toContain('party_document_states');

    const databaseDocument = await exportDatabaseBackup(
      harness.lifecycle,
      '2026-08-02T12:00:00.000Z',
    );
    harness.context.db.exec('DELETE FROM party_document_states');
    await importDatabaseBackup(harness.lifecycle, databaseDocument);
    expect(
      harness.context.db.oneRaw(
        'SELECT character_id, path FROM party_document_states',
      ),
    ).toEqual({ character_id: characterId, path: 'characters/ash--pub-1.json' });
  });

  it('registers only the two observation methods and rejects surplus input keys', async () => {
    harness = await createRpcHarness(handlers);
    expect(rpcRegistry.methods).toEqual(
      expect.arrayContaining([
        PARTY_RPC.listDocumentStates,
        PARTY_RPC.saveDocumentState,
      ]),
    );
    const rejected = await harness.call(
      PARTY_RPC.saveDocumentState,
      { state: state(), credential: 'must-not-cross' },
    );
    expect(rejected).toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
  });
});
