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
