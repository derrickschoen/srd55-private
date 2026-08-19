export class CatalogDataMigrationMarkerMalformedError extends Error {
  override readonly name = 'CatalogDataMigrationMarkerMalformedError' as const;
  constructor() {
    super('Catalog data-migration marker is malformed.');
  }
}

export class CatalogDataMigrationIdEmptyError extends Error {
  override readonly name = 'CatalogDataMigrationIdEmptyError' as const;
  constructor() {
    super('Catalog data-migration id must not be empty.');
  }
}

export class CatalogDataMigrationDuplicateIdError extends Error {
  override readonly name = 'CatalogDataMigrationDuplicateIdError' as const;
  constructor(readonly migration_id: string) {
    super(`Duplicate catalog data-migration id "${migration_id}".`);
  }
}

export class CatalogDataMigrationProjectorSchemeError extends Error {
  override readonly name = 'CatalogDataMigrationProjectorSchemeError' as const;
  constructor(
    readonly migration_id: string,
    readonly projector_scheme: string,
  ) {
    super(
      `Catalog data migration "${migration_id}" uses unknown projector ` +
        `scheme "${projector_scheme}".`,
    );
  }
}

export class CatalogDataMigrationSourcesEmptyError extends Error {
  override readonly name = 'CatalogDataMigrationSourcesEmptyError' as const;
  constructor(readonly migration_id: string) {
    super(`Catalog data migration "${migration_id}" has no checksum sources.`);
  }
}

export class CatalogDataMigrationDuplicateSourcePathError extends Error {
  override readonly name = 'CatalogDataMigrationDuplicateSourcePathError' as const;
  constructor(readonly migration_id: string) {
    super(
      `Catalog data migration "${migration_id}" has duplicate checksum ` +
        'source paths.',
    );
  }
}

export class CatalogDataMigrationChecksumMismatchError extends Error {
  override readonly name = 'CatalogDataMigrationChecksumMismatchError' as const;
  constructor(
    readonly migration_id: string,
    readonly expected_checksum: string,
    readonly actual_checksum: string,
  ) {
    super(
      `Catalog data migration "${migration_id}" source checksum mismatch: ` +
        `expected ${expected_checksum}, got ${actual_checksum}.`,
    );
  }
}

export class CatalogDataMigrationUnregisteredMarkerError extends Error {
  override readonly name = 'CatalogDataMigrationUnregisteredMarkerError' as const;
  constructor(readonly migration_id: string) {
    super(
      `Applied catalog data migration "${migration_id}" is not registered by ` +
        'this application.',
    );
  }
}

export class CatalogDataMigrationMarkerDisagreementError extends Error {
  override readonly name = 'CatalogDataMigrationMarkerDisagreementError' as const;
  constructor(readonly migration_id: string) {
    super(
      `Applied catalog data migration "${migration_id}" does not match the ` +
        'registered projector scheme and checksum.',
    );
  }
}

export class CatalogDataMigrationForeignKeyError extends Error {
  override readonly name = 'CatalogDataMigrationForeignKeyError' as const;
  constructor(
    readonly migration_id: string,
    readonly problem: string,
  ) {
    super(
      `Catalog data migration "${migration_id}" foreign-key check ` +
        `failed for ${problem}.`,
    );
  }
}
