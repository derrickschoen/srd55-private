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

/** One side of a marker comparison: the scheme and checksum a migration ran under. */
export interface CatalogDataMigrationStamp {
  readonly scheme: string;
  readonly checksum: string;
}

/**
 * An image whose applied marker disagrees with this build's registration.
 *
 * The marker's frozen sources changed after the image ran the migration, so
 * this build cannot tell what the stored rows mean. There is no migration for
 * that in this pre-alpha project: the owner accepted resetting the local
 * database instead (D923 Q11). The error therefore NAMES the marker and the
 * remedy, as fields the boot reports by type and in its message, rather than
 * a sentence only a developer could act on.
 */
export class CatalogDataMigrationMarkerDisagreementError extends Error {
  override readonly name = 'CatalogDataMigrationMarkerDisagreementError' as const;
  readonly remedy = 'reset_local_database' as const;
  constructor(
    readonly migration_id: string,
    readonly stored: CatalogDataMigrationStamp,
    readonly registered: CatalogDataMigrationStamp,
  ) {
    super(
      `This local database was prepared by an earlier build: its catalog data ` +
        `update "${migration_id}" was applied as ${stored.scheme} ` +
        `${stored.checksum.slice(0, 12)}, and this build registers ` +
        `${registered.scheme} ${registered.checksum.slice(0, 12)}. This ` +
        'pre-alpha build does not migrate it: export the database if you ' +
        'want a copy, then reset the local database.',
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
