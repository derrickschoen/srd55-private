/** A compile-checked JSON-column key has no generated schema facts. */
export class JsonColumnFactsMissingError extends Error {
  override readonly name = 'JsonColumnFactsMissingError' as const;

  constructor(readonly column_key: string) {
    super(`No column facts for ${column_key}.`);
  }
}
