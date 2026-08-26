import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import type { ApplicationSeedProfile } from '../../src/db/application-seed-profile';
import { DatabaseContext } from '../../src/db/database';
import {
  databaseHasOpenStatements,
  databaseIsInTransaction,
  registerSqliteQueryEngine,
} from '../../src/db/query';
import { getSqlite3, openSeededTestDatabase } from './open-db';

export type SharedDbMode = 'ro' | 'rw';

export interface SharedDbLease {
  readonly connection: Database;
  readonly db: DatabaseContext;
  release(): Promise<void>;
}

interface ConnectionFingerprint {
  readonly schemaVersion: number;
  readonly databases: string;
}

interface SharedDbProfileState {
  connection: Database | null;
  engine: Pick<Sqlite3Static, 'capi' | 'oo1'> | null;
  fingerprint: ConnectionFingerprint | null;
  rebuildCount: number;
}

interface SharedDbWorkerState {
  active: boolean;
  readonly profiles: Record<ApplicationSeedProfile, SharedDbProfileState>;
}

const workerProcess = process as typeof process & {
  __dndSharedDbWorkerStateV2?: SharedDbWorkerState;
};

const leaseSavepoint = 'dnd_shared_db_lease';

function emptyProfileState(): SharedDbProfileState {
  return {
    connection: null,
    engine: null,
    fingerprint: null,
    rebuildCount: 0,
  };
}

function workerState(): SharedDbWorkerState {
  workerProcess.__dndSharedDbWorkerStateV2 ??= {
    active: false,
    profiles: {
      full: emptyProfileState(),
      'test-core': emptyProfileState(),
    },
  };
  return workerProcess.__dndSharedDbWorkerStateV2;
}

function connectionFingerprint(connection: Database): ConnectionFingerprint {
  return {
    schemaVersion: Number(connection.selectValue('PRAGMA schema_version')),
    databases: JSON.stringify(connection.selectArrays('PRAGMA database_list')),
  };
}

function initializeExpectedDatabases(connection: Database): void {
  // SQLite adds the built-in `temp` database lazily. Ordinary catalog writers
  // use TEMP revision triggers, so materialize that built-in before recording
  // the expected database_list; later entries then identify real ATTACH leaks.
  connection.selectValue('SELECT count(*) FROM temp.sqlite_schema');
}

function commonPoisonReasons(
  connection: Database,
  expected: ConnectionFingerprint,
): string[] {
  const reasons: string[] = [];
  if (databaseIsInTransaction(connection)) {
    reasons.push('connection was not in autocommit mode');
  }
  if (databaseHasOpenStatements(connection)) {
    reasons.push('connection retained an open statement');
  }
  const actual = connectionFingerprint(connection);
  if (actual.schemaVersion !== expected.schemaVersion) {
    reasons.push(
      `schema_version changed from ${String(expected.schemaVersion)} to ` +
        String(actual.schemaVersion),
    );
  }
  if (actual.databases !== expected.databases) {
    reasons.push('database_list changed');
  }
  return reasons;
}

function readyPoisonReason(
  connection: Database,
  expected: ConnectionFingerprint,
): string | null {
  if (!connection.isOpen()) return 'connection was closed';
  const reasons = commonPoisonReasons(connection, expected);
  if (Number(connection.selectValue('PRAGMA query_only')) !== 0) {
    reasons.push('connection remained query-only');
  }
  return reasons.length === 0 ? null : reasons.join('; ');
}

async function rebuild(
  state: SharedDbProfileState,
  profile: ApplicationSeedProfile,
  reason: string,
): Promise<Database> {
  if (state.connection?.isOpen()) {
    state.connection.close();
  }
  state.rebuildCount += 1;
  console.warn(
    `[shared-db] POISONED ${profile} worker connection; rebuilding from the ` +
      `seeded image (rebuild #${String(state.rebuildCount)}): ${reason}`,
  );
  const connection = await openSeededTestDatabase({ profile });
  initializeExpectedDatabases(connection);
  state.connection = connection;
  state.engine = await getSqlite3();
  state.fingerprint = connectionFingerprint(connection);
  return connection;
}

async function readyConnection(
  state: SharedDbProfileState,
  profile: ApplicationSeedProfile,
): Promise<Database> {
  if (state.connection === null) {
    state.connection = await openSeededTestDatabase({ profile });
    initializeExpectedDatabases(state.connection);
    state.engine = await getSqlite3();
    state.fingerprint = connectionFingerprint(state.connection);
    return state.connection;
  }
  // This state lives on `process` and outlives a module graph, but the query
  // engine registry in src/db/query.ts is module-local. A fresh graph in the
  // same worker (Stryker reruns; any isolation change) must re-register the
  // cached connection's own sqlite3 instance or capi lookups on it throw.
  if (state.engine === null || state.fingerprint === null) {
    return rebuild(
      state,
      profile,
      'before lease: connection has no recorded engine or fingerprint',
    );
  }
  registerSqliteQueryEngine(state.engine);
  const reason = readyPoisonReason(state.connection, state.fingerprint);
  return reason === null
    ? state.connection
    : rebuild(state, profile, `before lease: ${reason}`);
}

async function rejectPoisonedLease(
  state: SharedDbProfileState,
  profile: ApplicationSeedProfile,
  connection: Database,
  reason: string,
): Promise<never> {
  if (state.connection === connection) {
    await rebuild(state, profile, `after lease: ${reason}`);
  }
  throw new Error(
    `[shared-db] Shared ${profile} database lease violated isolation: ${reason}`,
  );
}

export function sharedDbRebuildCount(): number {
  const profiles = workerState().profiles;
  return profiles.full.rebuildCount + profiles['test-core'].rebuildCount;
}

export async function acquireSharedDb(options: {
  mode: SharedDbMode;
  profile?: ApplicationSeedProfile;
}): Promise<SharedDbLease> {
  const worker = workerState();
  if (worker.active) {
    throw new Error('A shared database lease is already active in this worker.');
  }
  worker.active = true;

  const profile = options.profile ?? 'full';
  const state = worker.profiles[profile];
  let connection: Database;
  let fingerprint: ConnectionFingerprint;
  let startingChanges: number;
  try {
    connection = await readyConnection(state, profile);
    if (state.fingerprint === null) {
      throw new Error('Shared database connection has no baseline fingerprint.');
    }
    fingerprint = state.fingerprint;
    startingChanges = Number(connection.changes(true));
    if (options.mode === 'ro') {
      connection.exec('PRAGMA query_only = ON');
    } else {
      connection.exec(`SAVEPOINT ${leaseSavepoint}`);
    }
  } catch (error) {
    worker.active = false;
    throw error;
  }

  let released = false;
  return {
    connection,
    db: new DatabaseContext(connection),
    async release(): Promise<void> {
      if (released) {
        throw new Error('Shared database lease was already released.');
      }
      released = true;
      try {
        if (!connection.isOpen()) {
          await rejectPoisonedLease(
            state,
            profile,
            connection,
            'connection was closed',
          );
        }

        if (options.mode === 'ro') {
          const reasons = commonPoisonReasons(connection, fingerprint);
          if (Number(connection.selectValue('PRAGMA query_only')) !== 1) {
            reasons.push('read-only lease changed query_only');
          }
          const rowChangeDelta = Number(connection.changes(true)) - startingChanges;
          if (rowChangeDelta !== 0) {
            reasons.push(`read-only lease changed ${String(rowChangeDelta)} rows`);
          }
          if (reasons.length > 0) {
            await rejectPoisonedLease(
              state,
              profile,
              connection,
              reasons.join('; '),
            );
          }
          connection.exec('PRAGMA query_only = OFF');
        } else {
          try {
            connection.exec(
              `ROLLBACK TO ${leaseSavepoint}; RELEASE ${leaseSavepoint}`,
            );
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            await rejectPoisonedLease(
              state,
              profile,
              connection,
              `lease savepoint was unavailable: ${detail}`,
            );
          }
        }

        const reason = readyPoisonReason(connection, fingerprint);
        if (reason !== null) {
          await rejectPoisonedLease(state, profile, connection, reason);
        }
      } finally {
        worker.active = false;
      }
    },
  };
}
