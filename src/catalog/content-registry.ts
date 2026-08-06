import type { DatabaseContext } from '../db/database';
import { sqlString, type SqlRow } from '../db/codecs';
import type { ContentKey } from '../domain/ids';
import { sha256 } from '../crypto/sha256';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  contentFingerprintSchemeRegistry,
  deriveContentIdentityV1,
  parseDerivedContentKeyV1,
  type CanonicalContentIdentityJson,
  type ContentFingerprintDigest,
  type ContentFingerprintScheme,
  type ContentKind,
  type DerivedContentIdentityV1,
} from './content-identity';
import {
  assertedExternalContentKeyFromDeclared,
  isAssertedExternalContentKey,
} from './catalog-key';

export const catalogContentKeyKinds = [
  'derived',
  'asserted',
  'bundled-stable',
] as const;
export type CatalogContentKeyKind = (typeof catalogContentKeyKinds)[number];

export const catalogContentLayers = ['bundled', 'external'] as const;
export type CatalogContentLayer = (typeof catalogContentLayers)[number];

export const catalogContentFingerprintRoles = [
  'current',
  'compatible',
  'bundled-historical',
] as const;
export type CatalogContentFingerprintRole =
  (typeof catalogContentFingerprintRoles)[number];

export const catalogContentAliasKinds = [
  'declared-legacy',
  'rekeyed-primary',
  'bundled-legacy',
] as const;
export type CatalogContentAliasKind =
  (typeof catalogContentAliasKinds)[number];

export const catalogContentMatchDecisions = ['match', 'clone'] as const;
export type CatalogContentMatchDecision =
  (typeof catalogContentMatchDecisions)[number];

export interface ContentFingerprintCandidate {
  readonly scheme: ContentFingerprintScheme;
  readonly digest: ContentFingerprintDigest;
  readonly canonicalJson?: CanonicalContentIdentityJson;
}

export type ContentResolution =
  | {
      readonly kind: 'exact';
      readonly contentKey: ContentKey;
      readonly matchClass: 'stored-key' | 'trivial-self-match';
      readonly reviewRequired: false;
    }
  | {
      readonly kind: 'exact';
      readonly contentKey: ContentKey;
      readonly matchClass: 'metadata-conflict' | 'key-collision';
      readonly reviewRequired: true;
    }
  | {
      readonly kind: 'alias';
      readonly contentKey: ContentKey;
      readonly matchClass: 'alias' | 'key-collision';
      readonly reviewRequired: true;
    }
  | {
      readonly kind: 'fingerprint';
      readonly contentKey: ContentKey;
      readonly scheme: ContentFingerprintScheme;
      readonly matchClass: 'compatible-fingerprint' | 'srd-fallback';
      readonly reviewRequired: true;
    }
  | { readonly kind: 'missing'; readonly reviewRequired: false }
  | {
      readonly kind: 'ambiguous';
      readonly candidates: readonly ContentKey[];
      readonly at: 'alias' | 'fingerprint';
      readonly reviewRequired: false;
    };

export class ContentIdentityCollision extends Error {
  constructor() {
    super('Content identity digest matched different canonical bytes.');
    this.name = 'ContentIdentityCollision';
  }
}

interface IdentityRow {
  readonly content_key: ContentKey;
  readonly key_kind: CatalogContentKeyKind;
  readonly catalog_layer: CatalogContentLayer;
}

interface FingerprintRow extends IdentityRow {
  readonly fingerprint_digest: ContentFingerprintDigest;
  readonly canonical_json: string;
}

export interface RememberedContentMatchDecision {
  readonly decision: CatalogContentMatchDecision;
  readonly targetContentKey: ContentKey;
}

const identityRowCodec = (row: SqlRow): IdentityRow => {
  return {
    content_key: sqlString(row, 'content_key') as ContentKey,
    key_kind: sqlString(row, 'key_kind') as CatalogContentKeyKind,
    catalog_layer: sqlString(row, 'catalog_layer') as CatalogContentLayer,
  };
};

const fingerprintRowCodec = (row: SqlRow): FingerprintRow => {
  return {
    ...identityRowCodec(row),
    fingerprint_digest: sqlString(
      row,
      'fingerprint_digest',
    ) as ContentFingerprintDigest,
    canonical_json: sqlString(row, 'canonical_json'),
  };
};

function uniqueSortedContentKeys(rows: readonly IdentityRow[]): readonly ContentKey[] {
  return Object.freeze(
    [...new Set(rows.map((row) => row.content_key))].sort(),
  );
}

/**
 * Exact keys and aliases are authority locators, not permission to trust
 * damaged registry bytes. Reference-only callers use this check even when no
 * incoming canonical payload exists to compare.
 */
export function assertContentFingerprintIntegrity(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: string;
  },
): void {
  const rows = db.all(
    `SELECT
       identity.content_key,
       identity.key_kind,
       identity.catalog_layer,
       fingerprint.fingerprint_digest,
       fingerprint.canonical_json
     FROM catalog_content_fingerprints AS fingerprint
     JOIN catalog_content_identities AS identity
       ON identity.content_key = fingerprint.content_key
      AND identity.content_kind = fingerprint.content_kind
     WHERE fingerprint.content_kind = ? AND fingerprint.content_key = ?`,
    [input.kind, input.contentKey],
    fingerprintRowCodec,
  );
  if (rows.some((row) => sha256(row.canonical_json) !== row.fingerprint_digest)) {
    throw new ContentIdentityCollision();
  }
}

function exactResolution(
  db: DatabaseContext,
  contentKind: ContentKind,
  contentKey: ContentKey,
  derivedIdentity: DerivedContentIdentityV1<ContentKind, unknown> | undefined,
  referenceFingerprint: ContentFingerprintCandidate | undefined,
  metadataConflict: boolean,
): ContentResolution | null {
  const identity = db.one(
    `SELECT content_key, key_kind, catalog_layer
     FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [contentKind, contentKey],
    identityRowCodec,
  );
  if (identity === null) {
    return null;
  }

  assertContentFingerprintIntegrity(db, {
    kind: contentKind,
    contentKey: identity.content_key,
  });

  // D84 makes bundled stable keys authoritative even when extraction fixes
  // move their fingerprints. External references have no such authority: an
  // embedded content.v1 digest must agree with the recipient's current
  // fingerprint, and an asserted key with no fingerprint evidence needs the
  // recipient's explicit confirmation.
  if (
    derivedIdentity === undefined &&
    !(identity.catalog_layer === 'bundled' && identity.key_kind === 'bundled-stable')
  ) {
    if (referenceFingerprint === undefined) {
      return Object.freeze({
        kind: 'exact',
        contentKey: identity.content_key,
        matchClass: 'key-collision',
        reviewRequired: true,
      });
    }
    const storedCurrentDigest = db.scalar<string>(
      `SELECT fingerprint_digest
       FROM catalog_content_fingerprints
       WHERE content_kind = ? AND content_key = ?
         AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
      [contentKind, contentKey, referenceFingerprint.scheme],
    );
    if (storedCurrentDigest !== referenceFingerprint.digest) {
      return Object.freeze({
        kind: 'exact',
        contentKey: identity.content_key,
        matchClass: 'key-collision',
        reviewRequired: true,
      });
    }
  }

  if (derivedIdentity !== undefined) {
    const storedCurrent = db.one(
      `SELECT
         identity.content_key,
         identity.key_kind,
         identity.catalog_layer,
         fingerprint.fingerprint_digest,
         fingerprint.canonical_json
       FROM catalog_content_fingerprints AS fingerprint
       JOIN catalog_content_identities AS identity
         ON identity.content_key = fingerprint.content_key
        AND identity.content_kind = fingerprint.content_kind
       WHERE fingerprint.content_kind = ?
         AND fingerprint.content_key = ?
         AND fingerprint.fingerprint_scheme = ?
         AND fingerprint.fingerprint_role = 'current'`,
      [contentKind, contentKey, derivedIdentity.envelope.scheme],
      fingerprintRowCodec,
    );
    if (
      storedCurrent === null ||
      storedCurrent.fingerprint_digest !== derivedIdentity.digest ||
      storedCurrent.canonical_json !== derivedIdentity.canonicalJson
    ) {
      return Object.freeze({
        kind: 'exact',
        contentKey: identity.content_key,
        matchClass: 'key-collision',
        reviewRequired: true,
      });
    }
  }

  if (metadataConflict) {
    return Object.freeze({
      kind: 'exact',
      contentKey: identity.content_key,
      matchClass: 'metadata-conflict',
      reviewRequired: true,
    });
  }

  if (derivedIdentity !== undefined) {
    return Object.freeze({
      kind: 'exact',
      contentKey: identity.content_key,
      matchClass: 'trivial-self-match',
      reviewRequired: false,
    });
  }

  return Object.freeze({
    kind: 'exact',
    contentKey: identity.content_key,
    matchClass: 'stored-key',
    reviewRequired: false,
  });
}

function resolveAlias(
  db: DatabaseContext,
  contentKind: ContentKind,
  aliasKey: ContentKey,
  derivedIdentity: DerivedContentIdentityV1<ContentKind, unknown> | undefined,
): ContentResolution | null {
  const rows = db.all(
    `SELECT identity.content_key, identity.key_kind, identity.catalog_layer
     FROM catalog_content_aliases AS alias
     JOIN catalog_content_identities AS identity
       ON identity.content_key = alias.content_key
      AND identity.content_kind = alias.content_kind
     WHERE alias.content_kind = ? AND alias.alias_key = ?
     ORDER BY identity.content_key`,
    [contentKind, aliasKey],
    identityRowCodec,
  );
  const candidates = uniqueSortedContentKeys(rows);
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length > 1) {
    return Object.freeze({
      kind: 'ambiguous',
      candidates,
      at: 'alias',
      reviewRequired: false,
    });
  }
  const contentKey = candidates[0]!;
  assertContentFingerprintIntegrity(db, { kind: contentKind, contentKey });
  if (derivedIdentity !== undefined) {
    const storedCurrent = db.one(
      `SELECT
         identity.content_key,
         identity.key_kind,
         identity.catalog_layer,
         fingerprint.fingerprint_digest,
         fingerprint.canonical_json
       FROM catalog_content_fingerprints AS fingerprint
       JOIN catalog_content_identities AS identity
         ON identity.content_key = fingerprint.content_key
        AND identity.content_kind = fingerprint.content_kind
       WHERE fingerprint.content_kind = ?
         AND fingerprint.content_key = ?
         AND fingerprint.fingerprint_scheme = ?
         AND fingerprint.fingerprint_role = 'current'`,
      [contentKind, contentKey, derivedIdentity.envelope.scheme],
      fingerprintRowCodec,
    );
    if (
      storedCurrent === null ||
      storedCurrent.fingerprint_digest !== derivedIdentity.digest ||
      storedCurrent.canonical_json !== derivedIdentity.canonicalJson
    ) {
      return Object.freeze({
        kind: 'alias',
        contentKey,
        matchClass: 'key-collision',
        reviewRequired: true,
      });
    }
  }
  return Object.freeze({
    kind: 'alias',
    contentKey,
    matchClass: 'alias',
    reviewRequired: true,
  });
}

function supportedFingerprintCandidates(
  candidates: readonly ContentFingerprintCandidate[],
): readonly ContentFingerprintCandidate[] {
  const supported = candidates.filter((candidate) =>
    Object.hasOwn(contentFingerprintSchemeRegistry, candidate.scheme),
  );
  return Object.freeze(
    [...supported].sort((left, right) =>
      left.scheme === right.scheme
        ? 0
        : left.scheme === CONTENT_FINGERPRINT_SCHEME_V1
          ? -1
          : 1,
    ),
  );
}

function resolveFingerprint(
  db: DatabaseContext,
  contentKind: ContentKind,
  candidates: readonly ContentFingerprintCandidate[],
): ContentResolution | null {
  for (const candidate of supportedFingerprintCandidates(candidates)) {
    const rows = db.all(
      `SELECT
         identity.content_key,
         identity.key_kind,
         identity.catalog_layer,
         fingerprint.fingerprint_digest,
         fingerprint.canonical_json
       FROM catalog_content_fingerprints AS fingerprint
       JOIN catalog_content_identities AS identity
         ON identity.content_key = fingerprint.content_key
        AND identity.content_kind = fingerprint.content_kind
       WHERE fingerprint.content_kind = ?
         AND fingerprint.fingerprint_scheme = ?
         AND fingerprint.fingerprint_digest = ?
       ORDER BY identity.content_key`,
      [contentKind, candidate.scheme, candidate.digest],
      fingerprintRowCodec,
    );
    if (rows.length === 0) {
      continue;
    }

    if (rows.some(
      (row) => sha256(row.canonical_json) !== row.fingerprint_digest,
    )) {
      throw new ContentIdentityCollision();
    }

    if (
      candidate.canonicalJson !== undefined &&
      rows.some((row) => row.canonical_json !== candidate.canonicalJson)
    ) {
      throw new ContentIdentityCollision();
    }

    const contentKeys = uniqueSortedContentKeys(rows);
    if (contentKeys.length > 1) {
      return Object.freeze({
        kind: 'ambiguous',
        candidates: contentKeys,
        at: 'fingerprint',
        reviewRequired: false,
      });
    }
    const target = rows[0]!;
    return Object.freeze({
      kind: 'fingerprint',
      contentKey: target.content_key,
      scheme: candidate.scheme,
      matchClass:
        target.catalog_layer === 'bundled' &&
        target.key_kind === 'bundled-stable'
          ? 'srd-fallback'
          : 'compatible-fingerprint',
      reviewRequired: true,
    });
  }
  return null;
}

function resolveInRegistry(
  db: DatabaseContext,
  input: {
    readonly contentKind: ContentKind;
    readonly primaryKey: ContentKey;
    readonly aliasKey?: ContentKey;
    readonly fingerprints: readonly ContentFingerprintCandidate[];
    readonly derivedIdentity?: DerivedContentIdentityV1<ContentKind, unknown>;
    readonly exactReferenceFingerprint?: ContentFingerprintCandidate;
    readonly metadataConflict: boolean;
  },
): ContentResolution {
  const exact = exactResolution(
    db,
    input.contentKind,
    input.primaryKey,
    input.derivedIdentity,
    input.exactReferenceFingerprint,
    input.metadataConflict,
  );
  if (exact !== null) {
    return exact;
  }

  const alias = resolveAlias(
    db,
    input.contentKind,
    input.aliasKey ?? input.primaryKey,
    input.derivedIdentity,
  );
  if (alias !== null) {
    return alias;
  }

  return (
    resolveFingerprint(db, input.contentKind, input.fingerprints) ??
    Object.freeze({ kind: 'missing', reviewRequired: false })
  );
}

export function resolveContentAggregate<K extends ContentKind, P>(
  db: DatabaseContext,
  input: {
    readonly kind: K;
    readonly edition: string;
    readonly name: string;
    readonly payload: P;
    readonly declaredAlias?: ContentKey;
    readonly compatibleFingerprints?: readonly ContentFingerprintCandidate[];
    readonly metadataConflict?: boolean;
    readonly assertedKey?: ContentKey;
  },
): {
  readonly identity: DerivedContentIdentityV1<K, P>;
  readonly resolution: ContentResolution;
} {
  const identity = deriveContentIdentityV1(input);
  const fingerprints: readonly ContentFingerprintCandidate[] = Object.freeze([
    {
      scheme: identity.envelope.scheme,
      digest: identity.digest,
      canonicalJson: identity.canonicalJson,
    },
    ...(input.compatibleFingerprints ?? []),
  ]);
  const resolution = resolveInRegistry(db, {
    contentKind: input.kind,
    primaryKey: input.assertedKey ?? identity.derivedKey,
    ...(input.declaredAlias === undefined
      ? {}
      : { aliasKey: input.declaredAlias }),
    fingerprints,
    derivedIdentity: identity as DerivedContentIdentityV1<ContentKind, unknown>,
    metadataConflict: input.metadataConflict ?? false,
  });
  return Object.freeze({ identity, resolution });
}

export function resolveContentReference(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
  },
): ContentResolution {
  const parsed = parseDerivedContentKeyV1(input.contentKey);
  const referenceFingerprint: ContentFingerprintCandidate | undefined =
    parsed === null
      ? undefined
      : { scheme: parsed.scheme, digest: parsed.digest };
  const fingerprints: readonly ContentFingerprintCandidate[] =
    referenceFingerprint === undefined ? [] : [referenceFingerprint];
  return resolveInRegistry(db, {
    contentKind: input.kind,
    primaryKey: input.contentKey,
    fingerprints,
    ...(referenceFingerprint === undefined
      ? {}
      : { exactReferenceFingerprint: referenceFingerprint }),
    metadataConflict: false,
  });
}

export function registerDerivedContentIdentity<K extends ContentKind, P>(
  db: DatabaseContext,
  input: {
    readonly kind: K;
    readonly edition: string;
    readonly name: string;
    readonly payload: P;
  },
): DerivedContentIdentityV1<K, P> {
  const identity = deriveContentIdentityV1(input);
  db.transaction(() => {
    db.exec(
      `INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES (?, ?, 'derived', 'external', ?)`,
      [
        identity.derivedKey,
        input.kind,
        identity.envelope.normalizedName,
      ],
    );
    db.exec(
      `INSERT INTO catalog_content_fingerprints (
         content_kind, fingerprint_scheme, fingerprint_digest, canonical_json,
         content_key, fingerprint_role
       ) VALUES (?, ?, ?, ?, ?, 'current')`,
      [
        input.kind,
        identity.envelope.scheme,
        identity.digest,
        identity.canonicalJson,
        identity.derivedKey,
      ],
    );
  });
  return identity;
}

export class ContentIdentityKeyRefusal extends Error {
  constructor(
    readonly reason: 'invalid_asserted_key' | 'name_key_mismatch' | 'key_collision',
  ) {
    super(
      reason === 'invalid_asserted_key'
        ? 'The asserted content key is outside the portable slug grammar.'
        : reason === 'name_key_mismatch'
          ? 'The asserted content key is not derived from the aggregate name.'
          : 'The asserted content key is already registered to different content.',
    );
    this.name = 'ContentIdentityKeyRefusal';
  }
}

export function registerAssertedContentIdentity<K extends ContentKind, P>(
  db: DatabaseContext,
  input: {
    readonly kind: K;
    readonly edition: string;
    readonly name: string;
    readonly payload: P;
    readonly assertedKey: ContentKey;
  },
): DerivedContentIdentityV1<K, P> {
  if (!isAssertedExternalContentKey(input.assertedKey)) {
    throw new ContentIdentityKeyRefusal('invalid_asserted_key');
  }
  let expected: ContentKey;
  try {
    expected = assertedExternalContentKeyFromDeclared(
      input.kind,
      input.edition,
      input.name,
      input.assertedKey,
    );
  } catch {
    throw new ContentIdentityKeyRefusal('invalid_asserted_key');
  }
  if (expected !== input.assertedKey) {
    throw new ContentIdentityKeyRefusal('name_key_mismatch');
  }
  const identity = deriveContentIdentityV1(input);
  try {
    db.exec(
      `INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES (?, ?, 'asserted', 'external', ?)`,
      [input.assertedKey, input.kind, identity.envelope.normalizedName],
    );
  } catch {
    throw new ContentIdentityKeyRefusal('key_collision');
  }
  registerContentFingerprint(db, {
    kind: input.kind,
    contentKey: input.assertedKey,
    scheme: identity.envelope.scheme,
    digest: identity.digest,
    canonicalJson: identity.canonicalJson,
    role: 'current',
  });
  return identity;
}

export function registerBundledStableContentIdentity(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
    readonly normalizedName: string;
  },
): void {
  db.exec(
    `INSERT INTO catalog_content_identities (
       content_key, content_kind, key_kind, catalog_layer, normalized_name
     ) VALUES (?, ?, 'bundled-stable', 'bundled', ?)`,
    [input.contentKey, input.kind, input.normalizedName],
  );
}

/** Trusted seeders call this before inserting a root on a fresh image. */
export function ensureBundledStableContentIdentity(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: string;
    readonly normalizedName: string;
  },
): void {
  const existing = db.one(
    `SELECT content_key, key_kind, catalog_layer
     FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [input.kind, input.contentKey],
    identityRowCodec,
  );
  if (existing === null) {
    registerBundledStableContentIdentity(db, {
      ...input,
      contentKey: input.contentKey as ContentKey,
    });
    return;
  }
  if (
    existing.key_kind === 'bundled-stable' && existing.catalog_layer === 'bundled'
  ) {
    return;
  }
  throw new ContentIdentityKeyRefusal('key_collision');
}

/**
 * Register an unavailable share spell under the exact portable key asserted by
 * the share document. A placeholder has no projectable rules payload, so it
 * deliberately has no fingerprint until a real catalog aggregate replaces it.
 */
export function registerAssertedPlaceholderContentIdentity(
  db: DatabaseContext,
  input: {
    readonly contentKey: string;
    readonly normalizedName: string;
  },
): void {
  if (!isAssertedExternalContentKey(input.contentKey)) {
    throw new ContentIdentityKeyRefusal('invalid_asserted_key');
  }
  try {
    db.exec(
      `INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES (?, 'spell', 'asserted', 'external', ?)`,
      [input.contentKey, input.normalizedName],
    );
  } catch {
    throw new ContentIdentityKeyRefusal('key_collision');
  }
}

export function registerContentFingerprint(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
    readonly scheme: ContentFingerprintScheme;
    readonly digest: ContentFingerprintDigest;
    readonly canonicalJson: CanonicalContentIdentityJson;
    readonly role: CatalogContentFingerprintRole;
  },
): void {
  if (
    !Object.hasOwn(contentFingerprintSchemeRegistry, input.scheme) ||
    sha256(input.canonicalJson) !== input.digest
  ) {
    throw new TypeError(
      'Content fingerprint scheme, digest, and canonical bytes do not agree.',
    );
  }
  db.exec(
    `INSERT INTO catalog_content_fingerprints (
       content_kind, fingerprint_scheme, fingerprint_digest, canonical_json,
       content_key, fingerprint_role
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.kind,
      input.scheme,
      input.digest,
      input.canonicalJson,
      input.contentKey,
      input.role,
    ],
  );
}

/**
 * Move one aggregate's content-v1 fingerprint without changing its stable key.
 * Seeders and the bundled reconciliation pass share this seam so replacement
 * writes cannot update live content while leaving registry history behind.
 */
export function reconcileCurrentContentFingerprintV1(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
    readonly identity: DerivedContentIdentityV1<ContentKind, unknown>;
  },
): 'registered' | 'unchanged' | 'moved' {
  const current = db.oneRaw(
    `SELECT fingerprint_digest, canonical_json
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
    [input.kind, input.contentKey, CONTENT_FINGERPRINT_SCHEME_V1],
  );
  const currentDigest = current === null
    ? null
    : sqlString(current, 'fingerprint_digest');
  const currentCanonical = current === null
    ? null
    : sqlString(current, 'canonical_json');
  if (
    currentDigest !== null && currentCanonical !== null &&
    sha256(currentCanonical) !== currentDigest
  ) {
    throw new ContentIdentityCollision();
  }
  if (currentDigest === input.identity.digest) {
    if (currentCanonical !== input.identity.canonicalJson) {
      throw new ContentIdentityCollision();
    }
    return 'unchanged';
  }

  if (current !== null) {
    db.exec(
      `UPDATE catalog_content_fingerprints
       SET fingerprint_role = 'bundled-historical'
       WHERE content_kind = ? AND content_key = ?
         AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
      [input.kind, input.contentKey, CONTENT_FINGERPRINT_SCHEME_V1],
    );
  }

  const prior = db.oneRaw(
    `SELECT canonical_json
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = ? AND fingerprint_digest = ?`,
    [
      input.kind,
      input.contentKey,
      CONTENT_FINGERPRINT_SCHEME_V1,
      input.identity.digest,
    ],
  );
  if (prior !== null) {
    const priorCanonical = sqlString(prior, 'canonical_json');
    if (
      sha256(priorCanonical) !== input.identity.digest ||
      priorCanonical !== input.identity.canonicalJson
    ) {
      throw new ContentIdentityCollision();
    }
    db.exec(
      `UPDATE catalog_content_fingerprints
       SET fingerprint_role = 'current'
       WHERE content_kind = ? AND content_key = ?
         AND fingerprint_scheme = ? AND fingerprint_digest = ?`,
      [
        input.kind,
        input.contentKey,
        CONTENT_FINGERPRINT_SCHEME_V1,
        input.identity.digest,
      ],
    );
  } else {
    registerContentFingerprint(db, {
      kind: input.kind,
      contentKey: input.contentKey,
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: input.identity.digest,
      canonicalJson: input.identity.canonicalJson,
      role: 'current',
    });
  }
  return current === null ? 'registered' : 'moved';
}

export function registerContentAlias(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly aliasKey: ContentKey;
    readonly contentKey: ContentKey;
    readonly aliasKind: CatalogContentAliasKind;
  },
): void {
  db.exec(
    `INSERT INTO catalog_content_aliases (
       content_kind, alias_key, content_key, alias_kind
     ) VALUES (?, ?, ?, ?)`,
    [input.kind, input.aliasKey, input.contentKey, input.aliasKind],
  );
}

export function rememberedContentMatchDecision(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly scheme: ContentFingerprintScheme;
    readonly digest: ContentFingerprintDigest;
  },
): RememberedContentMatchDecision | null {
  const row = db.oneRaw(
    `SELECT decision, target_content_key
     FROM catalog_content_match_decisions
     WHERE content_kind = ?
       AND incoming_fingerprint_scheme = ?
       AND incoming_fingerprint_digest = ?`,
    [input.kind, input.scheme, input.digest],
  );
  if (row === null) {
    return null;
  }
  const decision = sqlString(row, 'decision');
  if (decision !== 'match' && decision !== 'clone') {
    throw new TypeError('Stored content match decision is outside its vocabulary.');
  }
  return Object.freeze({
    decision,
    targetContentKey: sqlString(row, 'target_content_key') as ContentKey,
  });
}

export function rememberContentMatchDecision(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly scheme: ContentFingerprintScheme;
    readonly digest: ContentFingerprintDigest;
    readonly decision: CatalogContentMatchDecision;
    readonly targetContentKey: ContentKey;
  },
): void {
  db.exec(
    `INSERT INTO catalog_content_match_decisions (
       content_kind, incoming_fingerprint_scheme,
       incoming_fingerprint_digest, decision, target_content_key, reviewed_at
     ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(
       content_kind, incoming_fingerprint_scheme, incoming_fingerprint_digest
     ) DO UPDATE SET
       decision = excluded.decision,
       target_content_key = excluded.target_content_key,
       reviewed_at = excluded.reviewed_at`,
    [
      input.kind,
      input.scheme,
      input.digest,
      input.decision,
      input.targetContentKey,
    ],
  );
}

export function forgetContentMatchDecision(
  db: DatabaseContext,
  input: {
    readonly kind: ContentKind;
    readonly scheme: ContentFingerprintScheme;
    readonly digest: ContentFingerprintDigest;
  },
): boolean {
  return (
    db.exec(
      `DELETE FROM catalog_content_match_decisions
       WHERE content_kind = ?
         AND incoming_fingerprint_scheme = ?
         AND incoming_fingerprint_digest = ?`,
      [input.kind, input.scheme, input.digest],
    ).changes === 1
  );
}

export interface ContentDependencyNode {
  readonly key: string;
  readonly dependencies: readonly string[];
}

export function projectContentGraphInDependencyOrder<T>(
  nodes: readonly ContentDependencyNode[],
  project: (key: string) => T,
): readonly T[] {
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  if (byKey.size !== nodes.length) {
    throw new TypeError('Content dependency graph contains duplicate keys.');
  }
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const node of nodes) {
    indegree.set(node.key, node.dependencies.length);
    for (const dependency of node.dependencies) {
      if (!byKey.has(dependency)) {
        throw new TypeError(
          `Content dependency graph is missing dependency "${dependency}".`,
        );
      }
      const children = dependents.get(dependency) ?? [];
      children.push(node.key);
      dependents.set(dependency, children);
    }
  }

  const ready = [...nodes]
    .filter((node) => indegree.get(node.key) === 0)
    .map((node) => node.key)
    .sort();
  const order: string[] = [];
  while (ready.length > 0) {
    const key = ready.shift()!;
    order.push(key);
    for (const child of (dependents.get(key) ?? []).sort()) {
      const next = indegree.get(child)! - 1;
      indegree.set(child, next);
      if (next === 0) {
        ready.push(child);
        ready.sort();
      }
    }
  }
  if (order.length !== nodes.length) {
    throw new TypeError(
      'Content dependency graph contains a cycle; no content was projected.',
    );
  }
  return Object.freeze(order.map(project));
}
