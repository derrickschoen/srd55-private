import type { ContentKey } from '../domain/ids';

/** A stored source configuration has a shape the share exporter cannot project. */
export class ShareSourceConfigShapeError extends Error {
  override readonly name = 'ShareSourceConfigShapeError' as const;

  constructor() {
    super('Source config must be an object.');
  }
}

/** A stored foreign-key-like reference no longer resolves to catalog content. */
export class ShareContentReferenceMissingError extends Error {
  override readonly name = 'ShareContentReferenceMissingError' as const;

  constructor(
    readonly table: string,
    readonly reference_id: string,
  ) {
    super(`Missing ${table} reference ${reference_id}.`);
  }
}

/** A stored weapon carries a range kind outside the storage vocabulary. */
export class ShareStoredWeaponRangeKindError extends TypeError {
  override readonly name = 'ShareStoredWeaponRangeKindError' as const;

  constructor(readonly range_kind: string) {
    super(`Unknown weapon range kind "${range_kind}".`);
  }
}

/** The database failed to retain the durable identity assigned to a share. */
export class ShareDocumentIdentityPersistenceError extends Error {
  override readonly name =
    'ShareDocumentIdentityPersistenceError' as const;

  constructor(readonly character_id: number) {
    super('Character share identity could not be persisted.');
  }
}

/** A selected spell points at a version absent from the export projection. */
export class ShareSelectedSpellVersionMissingError extends Error {
  override readonly name =
    'ShareSelectedSpellVersionMissingError' as const;

  constructor(readonly spell_version_id: number) {
    super('A selected spell version does not exist.');
  }
}

/** A spell reached the compatibility-issue branch reserved for non-spells. */
export class ShareSpellCompatibilityInvariantError extends Error {
  override readonly name =
    'ShareSpellCompatibilityInvariantError' as const;

  constructor(readonly content_key: ContentKey) {
    super('Missing spells become placeholders, not compatibility issues.');
  }
}

/** A committed content import returned without running the character installer. */
export class ShareCommittedImportResultMissingError extends Error {
  override readonly name =
    'ShareCommittedImportResultMissingError' as const;

  constructor(readonly document_id: string | null) {
    super('Committed share import did not create a character.');
  }
}
