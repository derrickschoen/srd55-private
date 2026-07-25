export interface JsonRecord {
  readonly [key: string]: unknown;
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
    throw new TypeError('Source configuration must be a JSON object.');
  }
  return decoded as JsonRecord;
}
