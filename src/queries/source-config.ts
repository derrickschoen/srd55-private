export interface JsonRecord {
  readonly [key: string]: unknown;
}

/** Decoded source configuration is JSON, but not the required record shape. */
export class SourceConfigurationShapeError extends TypeError {
  override readonly name = 'SourceConfigurationShapeError' as const;
  constructor() {
    super('Source configuration must be a JSON object.');
  }
}

export function jsonRecord(value: string | null): JsonRecord {
  if (value === null || value === '') {
    return {};
  }
  const decoded: unknown = JSON.parse(value);
  if (
    decoded === null ||
    Array.isArray(decoded) ||
    typeof decoded !== 'object'
  ) {
    throw new SourceConfigurationShapeError();
  }
  return decoded as JsonRecord;
}
