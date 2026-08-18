/** A row-contract column is absent from the generated schema facts. */
export class RowColumnFactsMissingError extends Error {
  override readonly name = 'RowColumnFactsMissingError' as const;

  constructor(
    readonly table: string,
    readonly column: string,
  ) {
    super(`No column facts for ${table}.${column}.`);
  }
}
