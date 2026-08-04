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

export const catalogContentKeyKinds = [
  'derived',
  'bundled-stable',
  'legacy-opaque',
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
      readonly matchClass: 'metadata-conflict';
      readonly reviewRequired: true;
    }
  | {
      readonly kind: 'alias';
      readonly contentKey: ContentKey;
      readonly matchClass: 'alias';
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

function exactResolution(
  db: DatabaseContext,
  contentKind: ContentKind,
  contentKey: ContentKey,
  derivedIdentity: DerivedContentIdentityV1<ContentKind, unknown> | undefined,
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

  if (metadataConflict) {
    return Object.freeze({
      kind: 'exact',
      contentKey: identity.content_key,
      matchClass: 'metadata-conflict',
      reviewRequired: true,
    });
  }

  if (
    derivedIdentity !== undefined &&
    contentKey === derivedIdentity.derivedKey
  ) {
    const storedCanonical = db.scalar<string>(
      `SELECT canonical_json
       FROM catalog_content_fingerprints
       WHERE content_kind = ?
         AND content_key = ?
         AND fingerprint_scheme = ?
         AND fingerprint_digest = ?`,
      [
        contentKind,
        contentKey,
        derivedIdentity.envelope.scheme,
        derivedIdentity.digest,
      ],
    );
    if (storedCanonical !== null) {
      if (storedCanonical !== derivedIdentity.canonicalJson) {
        throw new ContentIdentityCollision();
      }
      return Object.freeze({
        kind: 'exact',
        contentKey: identity.content_key,
        matchClass: 'trivial-self-match',
        reviewRequired: false,
      });
    }
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
  return Object.freeze({
    kind: 'alias',
    contentKey: candidates[0]!,
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
    readonly metadataConflict: boolean;
  },
): ContentResolution {
  const exact = exactResolution(
    db,
    input.contentKind,
    input.primaryKey,
    input.derivedIdentity,
    input.metadataConflict,
  );
  if (exact !== null) {
    return exact;
  }

  const alias = resolveAlias(
    db,
    input.contentKind,
    input.aliasKey ?? input.primaryKey,
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
    primaryKey: identity.derivedKey,
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
  return resolveInRegistry(db, {
    contentKind: input.kind,
    primaryKey: input.contentKey,
    fingerprints:
      parsed === null
        ? []
        : [{ scheme: parsed.scheme, digest: parsed.digest }],
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
