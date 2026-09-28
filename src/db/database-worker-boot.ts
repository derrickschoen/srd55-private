import { RpcError } from '../rpc/protocol';
import {
  decodeDegradedBootReason,
  type DegradedBootReason,
} from './degraded-boot-reason';
import { DatabaseStoragePoolLockedError } from './storage-pool-lock';

export interface DatabaseWorkerBootPort {
  activate(): void;
  restart(): void;
}

export async function bootDatabaseWorkerWithRetry(
  worker: DatabaseWorkerBootPort,
  info: () => Promise<unknown>,
): Promise<void> {
  worker.activate();
  try {
    await info();
  } catch (error) {
    if (!(error instanceof RpcError) || error.code !== 'transport_error') {
      throw error;
    }
    worker.restart();
    await info();
  }
}

export function databaseBootFailureMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message !== '') {
      return message;
    }
    if (error instanceof RpcError) {
      return `Database worker ${error.code.replaceAll('_', ' ')}; no details were reported.`;
    }
    const name = error.name.trim() || 'Error';
    return `${name}; no details were reported.`;
  }
  const message = String(error).trim();
  return message || 'Unknown database boot failure; no details were reported.';
}

/**
 * The boot outcomes the shell renders differently.
 *
 * `another_tab_holds_database` and `local_database_needs_reset` exist because
 * each has a REMEDY the user can perform, and a generic "Failed: …" line does
 * not say so. Everything else keeps the previous single failure presentation —
 * a shape with one arm per engine message would be a taxonomy of prose, not of
 * states.
 *
 * `local_database_needs_reset` is the worker's degraded boot: the stored image
 * is one this build will not open, and the worker keeps exactly two methods
 * dispatchable — `system.exportDatabase` and `system.reset`. It carries the
 * worker's typed {@link DegradedBootReason} unchanged, so the screen can name
 * what is stale (the catalog data update the owner accepted a reset for, D923
 * Q11) instead of collapsing it into a failure with no action.
 */
export type DatabaseBootFailure =
  | {
      readonly kind: 'another_tab_holds_database';
      readonly headline: string;
      readonly explanation: string;
      readonly remedy: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'local_database_needs_reset';
      readonly reason: DegradedBootReason;
      readonly headline: string;
      readonly explanation: string;
      readonly remedy: string;
      readonly detail: string;
    }
  | {
      readonly kind: 'boot_failed';
      readonly headline: string;
      readonly detail: string;
    };

const RESET_REMEDY =
  'Choose Export database to save a copy of the stored file first if you ' +
  'want one, then choose Reset local database to start again with an empty ' +
  'database. Resetting deletes everything in the local database of this ' +
  'browser, including your characters and homebrew content.';

function localDatabaseNeedsReset(
  reason: DegradedBootReason,
  detail: string,
): Extract<DatabaseBootFailure, { kind: 'local_database_needs_reset' }> {
  switch (reason.kind) {
    case 'catalog_data_marker_disagreement':
      return {
        kind: 'local_database_needs_reset',
        reason,
        headline: 'Your local database was made by an earlier build',
        explanation:
          'The database stored in this browser was prepared by an earlier ' +
          `build of this app. This build changed its catalog data update ` +
          `"${reason.migrationId}", and this pre-alpha app does not convert ` +
          'older databases, so it cannot open this one.',
        remedy: RESET_REMEDY,
        detail,
      };
    case 'image_rejected':
      return {
        kind: 'local_database_needs_reset',
        reason,
        headline: 'Your local database cannot be opened',
        explanation:
          'The database stored in this browser does not match what this ' +
          'build of the app expects, so it cannot be opened. It may come ' +
          'from a different build, or it may be damaged.',
        remedy: RESET_REMEDY,
        detail,
      };
  }
}

/**
 * NO SECOND DATABASE. This tab is blocked, and it says so: the honest state
 * for D284's minimum is "the other tab owns your data, this tab is not showing
 * it", never a silently-empty second image that looks like data loss and
 * accepts writes nobody reads.
 *
 * Both arms of the guard are real. `RpcError('storage_pool_locked')` is the
 * production path — the tag was flattened by structured clone at the worker
 * boundary and rebuilt from the code. The class arm covers a failure raised on
 * the main thread's own side of that boundary, where the instance survives.
 */
export function classifyDatabaseBootFailure(
  error: unknown,
): DatabaseBootFailure {
  const detail = databaseBootFailureMessage(error);
  const locked =
    error instanceof DatabaseStoragePoolLockedError ||
    (error instanceof RpcError && error.code === 'storage_pool_locked');
  if (locked) {
    return {
      kind: 'another_tab_holds_database',
      headline: 'Another tab has this database open',
      explanation:
        'Your characters are safe and unchanged, but only one tab at a time ' +
        'can open the local database, and a different tab of this app is ' +
        'holding it. This tab cannot read or edit your characters while that ' +
        'is true.',
      remedy:
        'Switch to the other tab to keep working there, or close it and then ' +
        'choose Try again here.',
      detail,
    };
  }
  // The code alone is not enough: a `schema_mismatch` whose data is not a
  // reason this build can read exactly stays on the generic state, because
  // the screen below offers a destructive action on the strength of it.
  if (error instanceof RpcError && error.code === 'schema_mismatch') {
    const reason = decodeDegradedBootReason(error.data);
    if (reason !== null) {
      return localDatabaseNeedsReset(reason, detail);
    }
  }
  return {
    kind: 'boot_failed',
    headline: 'The local database did not start',
    detail,
  };
}
