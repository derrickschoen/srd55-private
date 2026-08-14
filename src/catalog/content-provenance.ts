import type { CatalogContentOriginKind } from '../../db/schema/catalog-content';
import type { DatabaseContext } from '../db/database';
import {
  contentLicenseLabel,
  type ContentLicenseLabel,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { ContentKind } from './content-identity';

export const CONTENT_PROVENANCE_LIMITS = Object.freeze({
  label: 200,
  attributionBytes: 4_096,
});

export interface ContentProvenance {
  readonly origin_kind: CatalogContentOriginKind;
  readonly received: boolean;
  readonly local_derivation: boolean;
  readonly author_label?: string;
  readonly source_label?: string;
  /**
   * Machine-readable to the extent it honestly can be: one of the licences we
   * know (`ContentLicenseLabel`'s known set) or whatever the author wrote,
   * carried through unchanged. See `src/domain/enums.ts` for why this is a
   * known set with a passthrough limb rather than an enum or free text.
   */
  readonly license_label?: ContentLicenseLabel;
  readonly attribution_text?: string;
}

export interface ContentProvenanceDetail {
  readonly label: 'Original author' | 'Source' | 'License' | 'Attribution';
  readonly value: string;
}

export function contentProvenanceDetails(
  provenance: ContentProvenance,
): readonly ContentProvenanceDetail[] {
  return Object.freeze([
    ...(provenance.author_label === undefined
      ? []
      : [{ label: 'Original author' as const, value: provenance.author_label }]),
    ...(provenance.source_label === undefined
      ? []
      : [{ label: 'Source' as const, value: provenance.source_label }]),
    ...(provenance.license_label === undefined
      ? []
      : [{ label: 'License' as const, value: provenance.license_label }]),
    ...(provenance.attribution_text === undefined
      ? []
      : [{ label: 'Attribution' as const, value: provenance.attribution_text }]),
  ]);
}

export function storedContentProvenance(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
): ContentProvenance {
  const row = db.oneRaw(
    `SELECT provenance.origin_kind, provenance.received,
            provenance.local_derivation, provenance.author_label, provenance.source_label,
            provenance.license_label, provenance.attribution_text,
            identity.catalog_layer
     FROM catalog_content_identities AS identity
     LEFT JOIN catalog_content_provenance AS provenance
       ON provenance.content_kind = identity.content_kind
      AND provenance.content_key = identity.content_key
     WHERE identity.content_kind = ? AND identity.content_key = ?`,
    [kind, contentKey],
  );
  if (row === null) {
    throw new TypeError(`Catalog content '${contentKey}' has no identity.`);
  }
  const origin = row.origin_kind === 'authored_here' ||
      row.origin_kind === 'built_in' || row.origin_kind === 'unknown'
    ? row.origin_kind
    : row.catalog_layer === 'bundled' ? 'built_in' : 'unknown';
  return Object.freeze({
    origin_kind: origin,
    received: row.received === 1,
    local_derivation: row.local_derivation === 1,
    ...(typeof row.author_label === 'string'
      ? { author_label: row.author_label }
      : {}),
    ...(typeof row.source_label === 'string'
      ? { source_label: row.source_label }
      : {}),
    ...(typeof row.license_label === 'string'
      ? { license_label: contentLicenseLabel(row.license_label) }
      : {}),
    ...(typeof row.attribution_text === 'string'
      ? { attribution_text: row.attribution_text }
      : {}),
  });
}

export function recordContentProvenance(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
    readonly provenance: ContentProvenance;
    readonly replace?: boolean;
  },
): void {
  const verb = input.replace === true ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE';
  db.exec(
    `${verb} INTO catalog_content_provenance (
       content_kind, content_key, origin_kind, received, local_derivation,
       author_label, source_label, license_label, attribution_text
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.kind,
      input.contentKey,
      input.provenance.origin_kind,
      input.provenance.received ? 1 : 0,
      input.provenance.local_derivation ? 1 : 0,
      input.provenance.author_label ?? null,
      input.provenance.source_label ?? null,
      input.provenance.license_label ?? null,
      input.provenance.attribution_text ?? null,
    ],
  );
}

export function authoredContentProvenance(
  db: DatabaseContext,
  kind: ContentKind,
  baseContentKey: ContentKey | null,
): ContentProvenance {
  if (baseContentKey === null) {
    return Object.freeze({
      origin_kind: 'authored_here', received: false, local_derivation: false,
    });
  }
  const base = storedContentProvenance(db, kind, baseContentKey);
  if (!base.received && !base.local_derivation) {
    return Object.freeze({
      origin_kind: 'authored_here', received: false, local_derivation: false,
    });
  }
  return Object.freeze({
    ...base,
    origin_kind: 'authored_here',
    received: false,
    local_derivation: true,
  });
}

export function contentProvenanceLabel(
  provenance: ContentProvenance,
): string {
  if (provenance.received) {
    if (provenance.local_derivation) {
      return provenance.author_label === undefined
        ? 'Received homebrew adaptation — original author not recorded'
        : `Received homebrew adaptation — original rules by ${provenance.author_label}`;
    }
    return provenance.author_label === undefined
      ? 'Received homebrew — origin author not recorded; this is your local copy'
      : `Received homebrew by ${provenance.author_label} — this is your local copy`;
  }
  switch (provenance.origin_kind) {
    case 'authored_here':
      return provenance.local_derivation
        ? 'Adapted here from received homebrew'
        : 'Authored here';
    case 'built_in':
      return 'Built into the app';
    case 'unknown':
      return 'Homebrew — origin not recorded';
  }
}

export function incomingContentProvenanceLabel(
  provenance: ContentProvenance,
): string {
  if (provenance.author_label !== undefined) {
    return provenance.local_derivation
      ? `Homebrew adapted by the sender from rules by ${provenance.author_label} — a local copy will be added to your library`
      : `Homebrew by ${provenance.author_label} — a local copy will be added to your library`;
  }
  if (provenance.received) {
    return 'Received homebrew — original author not recorded; a local copy will be added to your library';
  }
  switch (provenance.origin_kind) {
    case 'authored_here':
      return 'Homebrew from the sender — a local copy will be added to your library';
    case 'built_in':
      return 'Bundled homebrew from the sender — a local copy will be added to your library';
    case 'unknown':
      return 'Homebrew from the sender — origin not recorded; a local copy will be added to your library';
  }
}
