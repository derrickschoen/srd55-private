export const DATABASE_BACKUP_FORMAT =
  'dnd-multiclass-spells/database' as const;
export const DATABASE_BACKUP_VERSION = 1 as const;

export const CHARACTER_BACKUP_FORMAT =
  'dnd-multiclass-spells/character' as const;
export const CHARACTER_BACKUP_VERSION = 1 as const;

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export function backupRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new BackupValidationError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new BackupValidationError(
      `${label} must contain exactly: ${expected.join(', ')}.`,
    );
  }
}

export function assertBackupHeader(
  value: Record<string, unknown>,
  expectedFormat: string,
  expectedVersion: number,
  label: string,
): void {
  if (value.format !== expectedFormat) {
    throw new BackupValidationError(
      `Unsupported ${label} format ${JSON.stringify(value.format)}.`,
    );
  }
  if (value.version !== expectedVersion) {
    throw new BackupValidationError(
      `Unsupported ${label} version ${JSON.stringify(value.version)}.`,
    );
  }
  if (
    typeof value.exported_at !== 'string' ||
    !Number.isFinite(Date.parse(value.exported_at)) ||
    new Date(value.exported_at).toISOString() !== value.exported_at
  ) {
    throw new BackupValidationError(
      `${label} exported_at must be an ISO date string.`,
    );
  }
}
