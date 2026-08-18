import type { Database } from '@sqlite.org/sqlite-wasm';
import { DatabaseContext } from '../../src/db/database';
import {
  databaseHasOpenStatements,
  databaseIsInTransaction,
} from '../../src/db/query';
import { openSeededTestDatabase } from './open-db';

export type SharedDbMode = 'ro' | 'rw';

export interface SharedDbLease {
  readonly connection: Database;
  readonly db: DatabaseContext;
  release(): Promise<void>;
}

interface SharedDbWorkerState {
  connection: Database | null;
  leaseActive: boolean;
  rebuildCount: number;
}

const workerProcess = process as typeof process & {
  __dndSharedDbWorkerState?: SharedDbWorkerState;
};

const leaseSavepoint = 'dnd_shared_db_lease';

function workerState(): SharedDbWorkerState {
  workerProcess.__dndSharedDbWorkerState ??= {
    connection: null,
    leaseActive: false,
    rebuildCount: 0,
  };
  return workerProcess.__dndSharedDbWorkerState;
}

function poisonReason(connection: Database): string | null {
  if (!connection.isOpen()) return 'connection was closed';
  if (databaseIsInTransaction(connection)) {
    return 'connection remained in a transaction';
  }
  if (databaseHasOpenStatements(connection)) {
    return 'connection retained an open statement';
  }
  if (Number(connection.selectValue('PRAGMA query_only')) !== 0) {
    return 'connection remained query-only';
  }
  return null;
}

async function rebuild(
  state: SharedDbWorkerState,
  reason: string,
): Promise<Database> {
  if (state.connection?.isOpen()) {
    state.connection.close();
  }
  state.rebuildCount += 1;
  console.warn(
    `[shared-db] POISONED worker connection; rebuilding from the seeded image ` +
      `(rebuild #${String(state.rebuildCount)}): ${reason}`,
  );
  const connection = await openSeededTestDatabase();
  state.connection = connection;
  return connection;
}

async function readyConnection(state: SharedDbWorkerState): Promise<Database> {
  if (state.connection === null) {
    state.connection = await openSeededTestDatabase();
    return state.connection;
  }
  const reason = poisonReason(state.connection);
  return reason === null
    ? state.connection
    : rebuild(state, `before lease: ${reason}`);
}

async function recoverPoisonedLease(
  state: SharedDbWorkerState,
  connection: Database,
  reason: string,
): Promise<void> {
  if (state.connection !== connection) return;
  await rebuild(state, `after lease: ${reason}`);
}

export function sharedDbRebuildCount(): number {
  return workerState().rebuildCount;
}

export async function acquireSharedDb(options: {
  mode: SharedDbMode;
}): Promise<SharedDbLease> {
  const state = workerState();
  if (state.leaseActive) {
    throw new Error('A shared database lease is already active in this worker.');
  }
  state.leaseActive = true;

  let connection: Database;
  try {
    connection = await readyConnection(state);
    if (options.mode === 'ro') {
      connection.exec('PRAGMA query_only = ON');
    } else {
      if (databaseIsInTransaction(connection)) {
        throw new Error('Shared database connection is not in autocommit mode.');
      }
      connection.exec(`SAVEPOINT ${leaseSavepoint}`);
    }
  } catch (error) {
    state.leaseActive = false;
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
          await recoverPoisonedLease(state, connection, 'connection was closed');
          return;
        }

        if (options.mode === 'rw') {
          try {
            connection.exec(
              `ROLLBACK TO ${leaseSavepoint}; RELEASE ${leaseSavepoint}`,
            );
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            await recoverPoisonedLease(
              state,
              connection,
              `lease savepoint was unavailable: ${detail}`,
            );
            return;
          }
        }

        connection.exec('PRAGMA query_only = OFF');
        const reason = poisonReason(connection);
        if (reason !== null) {
          await recoverPoisonedLease(state, connection, reason);
        }
      } finally {
        state.leaseActive = false;
      }
    },
  };
}
