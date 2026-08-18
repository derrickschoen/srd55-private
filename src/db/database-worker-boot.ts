import { RpcError } from '../rpc/protocol';
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
 * `another_tab_holds_database` exists because that failure has a REMEDY the
 * user can perform, and a generic "Failed: …" line does not say so. Everything
 * else keeps the previous single failure presentation — a shape with one arm
 * per engine message would be a taxonomy of prose, not of states.
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
      readonly kind: 'boot_failed';
      readonly headline: string;
      readonly detail: string;
    };

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
  return {
    kind: 'boot_failed',
    headline: 'The local database did not start',
    detail,
  };
}
