import type { DatabaseLifecycle } from '../db/database-lifecycle';
import {
  assertBackupHeader,
  assertExactKeys,
  backupRecord,
  BackupValidationError,
  DATABASE_BACKUP_FORMAT,
  DATABASE_BACKUP_VERSION,
} from './backup-version';

export interface DatabaseBackup {
  readonly format: typeof DATABASE_BACKUP_FORMAT;
  readonly version: typeof DATABASE_BACKUP_VERSION;
  readonly exported_at: string;
  readonly sqlite: Uint8Array;
}

/**
 * THERE IS DELIBERATELY NO SIZE OR ROW CAP HERE. THE MEASUREMENTS BEHIND THAT.
 *
 * A cap was considered, because this boundary had a genuine denial-of-service
 * behind it: `auditCandidateDatabase` used to detect source-parent cycles in
 * O(N²), and one hand-made 5.6 MB image with a 50,000-long parent chain blocked
 * `DatabaseLifecycle.validateBytes` — which is synchronous, inside the app's one
 * dedicated worker — for 80.5 SECONDS, queueing every other RPC behind it.
 *
 * That was the ALGORITHM, not the size, and the algorithm is fixed (see
 * `assertNoParentCycle`). Re-measured on the same images afterwards:
 *
 *     the same 5.6 MB / 50,000-chain image      80.5 s  →  0.10 s
 *     3.1 MB, 24,000-chain                      16.57 s →  0.070 s
 *     11.9 MB, 2,000 sources × 20 save points    1.15 s →  0.133 s
 *
 * Cost is now linear in image bytes at roughly 10 ms per megabyte, so a
 * hypothetical 100 MB import costs about a second — the same order as reading
 * the file the user just picked.
 *
 * A cap would therefore buy a bound on work that is already proportional to the
 * bytes, and it would cost the one thing D6b forbids: an import refused for a
 * legitimate user. There is no honest ceiling to set it at. The database grows
 * with the catalog AND with undo history — `character_save_points` stores a
 * whole JSON snapshot of a character per save point, and nothing in the product
 * bounds how many a user accumulates — so any number here would be a guess whose
 * only failure mode is destroying a real restore. If a cap is ever added it needs
 * a measured distribution of real database sizes behind it, which we do not have.
 *
 * What DOES bound the damage is already here and is not a guess: the candidate
 * is validated while quarantined in a throwaway in-memory connection, and stored
 * bytes are untouched until every pass has passed.
 */
export function validateDatabaseBackup(
  input: unknown,
): asserts input is DatabaseBackup {
  const backup = backupRecord(input, 'Database backup');
  assertExactKeys(
    backup,
    ['format', 'version', 'exported_at', 'sqlite'],
    'Database backup',
  );
  assertBackupHeader(
    backup,
    DATABASE_BACKUP_FORMAT,
    DATABASE_BACKUP_VERSION,
    'database backup',
  );
  if (!(backup.sqlite instanceof Uint8Array)) {
    throw new BackupValidationError(
      'Database backup sqlite must be a Uint8Array.',
    );
  }
  if (backup.sqlite.byteLength === 0) {
    throw new BackupValidationError(
      'Database backup sqlite image must not be empty.',
    );
  }
}

export async function exportDatabaseBackup(
  lifecycle: DatabaseLifecycle,
  exportedAt = new Date().toISOString(),
): Promise<DatabaseBackup> {
  return {
    format: DATABASE_BACKUP_FORMAT,
    version: DATABASE_BACKUP_VERSION,
    exported_at: exportedAt,
    sqlite: await lifecycle.exportBytes(),
  };
}

export async function importDatabaseBackup(
  lifecycle: DatabaseLifecycle,
  input: unknown,
): Promise<void> {
  validateDatabaseBackup(input);
  await lifecycle.replace(input.sqlite.slice());
}
