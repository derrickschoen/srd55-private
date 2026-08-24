export type ShareWireSchemaCheckedVersion = 12 | 13 | 14 | 15 | 17 | 19 | 20;

/** A frozen schema lacks fields its adjacent migration requires. */
export class ShareWireSchemaRequiredFieldError extends Error {
  override readonly name = 'ShareWireSchemaRequiredFieldError' as const;

  constructor(
    readonly version: ShareWireSchemaCheckedVersion,
    readonly required_fields: readonly string[],
  ) {
    super(
      `wire v${String(version)} schema is missing ${
        version === 12 || version === 13
          ? 'a required field'
          : 'the version field'
      }.`,
    );
  }
}

/** Assert the field indexes a frozen adjacent migration depends on. */
export function assertShareWireSchemaRequiredFields(
  version: ShareWireSchemaCheckedVersion,
  field_indexes: Readonly<Record<string, number>>,
): void {
  const requiredFields = Object.entries(field_indexes)
    .filter(([, index]) => index < 0)
    .map(([field]) => field);
  if (requiredFields.length > 0) {
    throw new ShareWireSchemaRequiredFieldError(version, requiredFields);
  }
}
