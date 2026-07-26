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

/**
 * Like `assertExactKeys`, but tolerates the named keys being ABSENT.
 *
 * WHY A SECOND FUNCTION RATHER THAN A LOOSER FIRST ONE. `assertExactKeys` is
 * what makes a backup document's shape a closed set — an unknown key is refused
 * in both directions, and every other call site depends on that. Exactly one
 * kind of key needs to be optional: a table that did not exist when a file the
 * user is holding was written. Naming those explicitly keeps the closed set
 * closed for everything else; a general "extra keys are fine" would silently
 * accept a typo'd table name and drop its rows.
 *
 * An UNEXPECTED key is still refused, so a document from a future build is
 * rejected rather than partially read.
 */
export function assertKeysAllowingAbsent(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const present = new Set(Object.keys(value));
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !present.has(key));
  const unknown = [...present].filter((key) => !allowed.has(key));
  if (missing.length > 0 || unknown.length > 0) {
    throw new BackupValidationError(
      `${label} must contain exactly: ${required.join(', ')}` +
        `${optional.length === 0 ? '' : ` (optionally: ${optional.join(', ')})`}.`,
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
