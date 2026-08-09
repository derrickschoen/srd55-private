import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import { assertedExternalContentKeyFromDeclared } from './catalog-key';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  contentKinds,
  deriveContentIdentityForScheme,
  isContentFingerprintScheme,
  parseDerivedContentKeyV1,
  type ContentFingerprintDigest,
  type ContentFingerprintScheme,
  type ContentKind,
} from './content-identity';
import { projectStoredContentV1 } from './stored-content-projector-v1';
import { projectStoredContentV2 } from './stored-content-projector-v2';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from './catalog-disclosure';
import {
  ContentIdentityCollision,
  ContentIdentityKeyRefusal,
  projectContentGraphInDependencyOrder,
  registerAssertedContentIdentity,
  repairAssertedPlaceholderContentIdentityName,
  rememberContentMatchDecision,
  rememberedContentMatchDecision,
  resolveContentAggregate,
  resolveContentReference,
  type CatalogContentMatchDecision,
  type ContentResolution,
} from './content-registry';

export type ContentImportPlanToken = string & {
  readonly __contentImportPlanToken: unique symbol;
};

export interface ContentImportDependencyTarget {
  readonly contentKey: ContentKey;
  readonly kind: ContentKind;
  readonly scheme: ContentFingerprintScheme;
  readonly digest: ContentFingerprintDigest;
}

export interface ContentImportProjection<K extends ContentKind = ContentKind> {
  readonly kind: K;
  readonly edition: string;
  readonly name: string;
  readonly assertedKey: ContentKey;
  readonly payload: unknown;
  /** Omitted by every frozen v1 node; content-v2 nodes opt in explicitly. */
  readonly fingerprintScheme?: ContentFingerprintScheme;
  readonly declaredAlias?: ContentKey;
  readonly metadataConflict?: boolean;
  readonly conflictDetails?: readonly ContentImportConflictDetail[];
  /** Immutable aggregates omit this; mutable exact-key imports opt in. */
  readonly installExact?: boolean;
  /**
   * Ordinary imports may reuse a decision the user already reviewed. Authoring
   * previews opt out: D198 permits a dialog-free publish only for the exact,
   * byte-identical self-match being published now.
   */
  readonly allowRememberedDecision?: boolean;
  /**
   * A share link carries only this asserted reference, never aggregate bytes.
   * The local candidate supplies the projection solely so Clone can copy it;
   * Match must resolve this key through the registry's reference-only path.
   */
  readonly referenceOnly?: {
    readonly contentKey: ContentKey;
  };
  readonly install: (
    db: DatabaseContext,
    contentKey: ContentKey,
    projection: ContentImportProjection,
    phase: 'plan' | 'commit',
  ) => void;
  readonly projectStored: (
    db: DatabaseContext,
    contentKey: ContentKey,
  ) => {
    readonly kind: K;
    readonly edition: string;
    readonly name: string;
    readonly payload: unknown;
  };
}

export interface ContentImportNode<K extends ContentKind = ContentKind> {
  readonly id: string;
  /** Compatibility-only input. The planner deliberately ignores this field. */
  readonly dependencies?: readonly string[];
  readonly projection: ContentImportProjection<K>;
  /**
   * Called for every simulation, not only clones. A parent clone therefore
   * changes the dependency targets before this node is fingerprinted.
   */
  readonly reproject?: (input: {
    readonly name: string;
    readonly assertedKey: ContentKey;
    /** Keyed by the referenced fingerprint in the incoming projector payload. */
    readonly dependencies: ReadonlyMap<string, ContentImportDependencyTarget>;
  }) => ContentImportProjection<K>;
}

export interface ContentImportChoice {
  readonly decision: CatalogContentMatchDecision;
  readonly cloneName?: string;
}

export type ContentImportChoices = Readonly<Record<string, ContentImportChoice>>;

export type ContentImportMatchClass =
  | 'alias'
  | 'compatible-fingerprint'
  | 'srd-fallback'
  | 'metadata-conflict'
  | 'key-collision';

export interface ContentImportConflictDetail {
  readonly field: string;
  readonly incomingValue: string;
  readonly localValue: string;
}

export interface ContentImportReviewRow {
  readonly id: string;
  readonly kind: ContentKind;
  readonly incomingName: string;
  readonly localName: string;
  readonly localCatalogLayer: CatalogLayerDisclosure;
  readonly targetContentKey: ContentKey;
  readonly incomingFingerprint: ContentFingerprintDigest | null;
  readonly matchClass: ContentImportMatchClass;
  readonly defaultChoice: 'match';
  readonly selectedChoice: CatalogContentMatchDecision;
  readonly cloneName: string;
  readonly dependencies: readonly string[];
  readonly conflictDetails: readonly ContentImportConflictDetail[];
}

export type ContentImportEntryOutcome =
  | {
      readonly id: string;
      readonly kind: 'create' | 'match' | 'remembered-match' | 'remembered-clone';
      readonly contentKey: ContentKey;
    }
  | {
      readonly id: string;
      readonly kind: 'review';
      readonly contentKey: ContentKey;
      readonly matchClass: ContentImportMatchClass;
    }
  | {
      readonly id: string;
      readonly kind: 'refused';
      readonly reason:
        | 'ambiguous_alias'
        | 'ambiguous_fingerprint'
        | 'unresolved_reference'
        | 'dependency_refused'
        | 'clone_name_required'
        | 'clone_name_unchanged'
        | 'clone_key_collision'
        | 'identity_collision'
        | 'target_integrity_refused'
        | 'install_refused';
      readonly candidates?: readonly ContentKey[];
    };

export interface ContentImportPlan {
  readonly token: ContentImportPlanToken;
  readonly inputHash: string;
  readonly graphHash: string;
  readonly targetHash: string;
  /** Catalog lifecycle writes that are part of, and authenticated by, this plan. */
  readonly spellActivityChanges: readonly ContentImportSpellActivityChange[];
  readonly reviews: readonly ContentImportReviewRow[];
  readonly outcomes: readonly ContentImportEntryOutcome[];
}

export interface ContentImportSpellActivityChange {
  readonly contentKey: ContentKey;
  readonly action: 'deactivate' | 'reactivate';
}

interface EvaluatedEntry {
  readonly node: ContentImportNode;
  readonly projection: ContentImportProjection;
  readonly identity: ReturnType<typeof deriveContentIdentityForScheme>;
  readonly resolution: ContentResolution;
  readonly outcome: ContentImportEntryOutcome;
  readonly reviewedDecision?: CatalogContentMatchDecision;
  readonly incomingDigest: ContentFingerprintDigest;
  readonly incomingScheme: ContentFingerprintScheme;
  readonly targetContentKey?: ContentKey;
  readonly targetDigest?: ContentFingerprintDigest;
  readonly targetCanonicalJson?: string;
}

interface Evaluation {
  readonly plan: ContentImportPlan;
  readonly entries: readonly EvaluatedEntry[];
}

class PlanRollback extends Error {
  constructor(readonly evaluation: Evaluation) {
    super('Content import plan simulation rollback.');
  }
}

function registryGraphHash(db: DatabaseContext): string {
  const tables = [
    'catalog_content_identities',
    'catalog_content_fingerprints',
    'catalog_content_aliases',
    'catalog_content_match_decisions',
  ] as const;
  const graph = tables.map((table) => ({
    table,
    rows: db.allRaw(`SELECT * FROM ${table} ORDER BY 1, 2, 3, 4`),
  }));
  return sha256(canonicalJson(graph));
}

function inputHash(nodes: readonly ContentImportNode[]): string {
  return sha256(canonicalJson(nodes.map((node) => ({
    id: node.id,
    kind: node.projection.kind,
    edition: node.projection.edition,
    name: node.projection.name,
    assertedKey: node.projection.assertedKey,
    payload: node.projection.payload,
    ...(node.projection.fingerprintScheme === undefined
      ? {}
      : { fingerprintScheme: node.projection.fingerprintScheme }),
    declaredAlias: node.projection.declaredAlias ?? null,
    metadataConflict: node.projection.metadataConflict ?? false,
    conflictDetails: node.projection.conflictDetails ?? [],
    referenceOnly: node.projection.referenceOnly ?? null,
  }))));
}

function projectionFingerprintScheme(
  projection: Pick<ContentImportProjection, 'fingerprintScheme'>,
): ContentFingerprintScheme {
  return projection.fingerprintScheme ?? CONTENT_FINGERPRINT_SCHEME_V1;
}

function deriveProjectionIdentity(
  projection: Pick<
    ContentImportProjection,
    'kind' | 'edition' | 'name' | 'payload' | 'fingerprintScheme'
  >,
) {
  return deriveContentIdentityForScheme(
    projectionFingerprintScheme(projection),
    projection,
  );
}

function incomingDecisionFingerprint(
  projection: ContentImportProjection,
  identity: ReturnType<typeof deriveContentIdentityForScheme>,
): {
  readonly scheme: ContentFingerprintScheme;
  readonly digest: ContentFingerprintDigest;
  readonly evidenceDigest: ContentFingerprintDigest | null;
} {
  if (projection.referenceOnly === undefined) {
    return Object.freeze({
      scheme: identity.envelope.scheme,
      digest: identity.digest,
      evidenceDigest: identity.digest,
    });
  }
  const parsed = parseDerivedContentKeyV1(projection.referenceOnly.contentKey);
  if (parsed !== null) {
    return Object.freeze({ ...parsed, evidenceDigest: parsed.digest });
  }

  // A reference-only share contributes no aggregate bytes. Scope its receipt
  // to the share reference itself instead of presenting the recipient's local
  // clone candidate as incoming evidence. The same reference remains stable
  // across repeat shares, while a backup receipt for the candidate's genuine
  // fingerprint cannot be reused here.
  return Object.freeze({
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: sha256(canonicalJson({
      receiptScope: 'share-reference-v1',
      kind: projection.kind,
      contentKey: projection.referenceOnly.contentKey,
    })) as ContentFingerprintDigest,
    evidenceDigest: null,
  });
}

interface ProjectionFingerprintReference {
  readonly kind: ContentKind;
  readonly scheme: ContentFingerprintScheme;
  readonly digest: ContentFingerprintDigest;
}

interface DerivedDependencyGraph {
  readonly dependenciesByNode: ReadonlyMap<string, readonly string[]>;
  readonly reviewEdgesByNode: ReadonlyMap<string, readonly string[]>;
  readonly targetsByNode: ReadonlyMap<
    string,
    ReadonlyMap<string, ContentImportDependencyTarget>
  >;
  readonly unresolvedNodes: ReadonlySet<string>;
  readonly externalSnapshots: readonly {
    readonly reference: string;
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
    readonly canonicalJson: string;
  }[];
}

export function contentFingerprintReferenceKey(
  reference: ProjectionFingerprintReference,
): string {
  return `${reference.kind}\u0000${reference.scheme}\u0000${reference.digest}`;
}

function isProjectionFingerprintReference(
  value: unknown,
): value is ProjectionFingerprintReference {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === 'string' &&
    (contentKinds as readonly string[]).includes(candidate.kind) &&
    isContentFingerprintScheme(candidate.scheme) &&
    typeof candidate.digest === 'string' &&
    /^[0-9a-f]{64}$/.test(candidate.digest);
}

/** Every portable reference emitted anywhere inside a projector payload. */
export function projectionFingerprintReferences(
  payload: unknown,
): readonly ProjectionFingerprintReference[] {
  const references = new Map<string, ProjectionFingerprintReference>();
  const visit = (value: unknown): void => {
    if (isProjectionFingerprintReference(value)) {
      references.set(contentFingerprintReferenceKey(value), Object.freeze({
        kind: value.kind,
        scheme: value.scheme,
        digest: value.digest,
      }));
      return;
    }
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const child of Object.values(value as Record<string, unknown>)) {
        visit(child);
      }
    }
  };
  visit(payload);
  return Object.freeze([...references.values()].sort((left, right) =>
    contentFingerprintReferenceKey(left).localeCompare(
      contentFingerprintReferenceKey(right),
    ),
  ));
}

/** Rewrites only projector-emitted fingerprint reference leaves. */
export function remapProjectionFingerprintReferences<T>(
  value: T,
  dependencies: ReadonlyMap<string, ContentImportDependencyTarget>,
): T {
  const visit = (current: unknown): unknown => {
    if (isProjectionFingerprintReference(current)) {
      const target = dependencies.get(contentFingerprintReferenceKey(current));
      return target === undefined
        ? current
        : Object.freeze({
            kind: target.kind,
            scheme: target.scheme,
            digest: target.digest,
          });
    }
    if (Array.isArray(current)) return current.map(visit);
    if (current !== null && typeof current === 'object') {
      return Object.fromEntries(Object.entries(current).map(([key, child]) => [
        key,
        visit(child),
      ]));
    }
    return current;
  };
  return visit(value) as T;
}

function resolveFingerprintTarget(
  db: DatabaseContext,
  reference: ProjectionFingerprintReference,
): ContentKey | null {
  const rows = db.allRaw(
    `SELECT content_key
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND fingerprint_scheme = ?
       AND fingerprint_digest = ?
       AND fingerprint_role IN ('current', 'compatible')
     ORDER BY content_key`,
    [reference.kind, reference.scheme, reference.digest],
  ).map((row) => String(row.content_key) as ContentKey);
  return rows.length === 1 ? rows[0]! : null;
}

function deriveDependencyGraph(
  db: DatabaseContext,
  nodes: readonly ContentImportNode[],
): DerivedDependencyGraph {
  const incomingByFingerprint = new Map<string, string[]>();
  for (const node of nodes) {
    const identity = deriveProjectionIdentity(node.projection);
    const key = contentFingerprintReferenceKey({
      kind: node.projection.kind,
      scheme: identity.envelope.scheme,
      digest: identity.digest,
    });
    incomingByFingerprint.set(key, [
      ...(incomingByFingerprint.get(key) ?? []),
      node.id,
    ]);
  }

  const dependenciesByNode = new Map<string, readonly string[]>();
  const reviewEdgesByNode = new Map<string, readonly string[]>();
  const targetsByNode = new Map<
    string,
    ReadonlyMap<string, ContentImportDependencyTarget>
  >();
  const unresolvedNodes = new Set<string>();
  const externalSnapshots = new Map<string, {
    readonly reference: string;
    readonly kind: ContentKind;
    readonly contentKey: ContentKey;
    readonly canonicalJson: string;
  }>();

  for (const node of nodes) {
    const dependencies = new Set<string>();
    const reviewEdges = new Set<string>();
    const targets = new Map<string, ContentImportDependencyTarget>();
    for (const reference of projectionFingerprintReferences(node.projection.payload)) {
      const referenceKey = contentFingerprintReferenceKey(reference);
      const incoming = incomingByFingerprint.get(referenceKey) ?? [];
      if (incoming.length === 1) {
        dependencies.add(incoming[0]!);
        reviewEdges.add(incoming[0]!);
        continue;
      }
      if (incoming.length > 1) {
        unresolvedNodes.add(node.id);
        continue;
      }
      const contentKey = resolveFingerprintTarget(db, reference);
      if (contentKey === null) {
        unresolvedNodes.add(node.id);
        continue;
      }
      try {
        const stored = reference.scheme === CONTENT_FINGERPRINT_SCHEME_V1
          ? projectStoredContentV1(db, reference.kind, contentKey)
          : projectStoredContentV2(db, reference.kind, contentKey);
        const liveIdentity = deriveContentIdentityForScheme(reference.scheme, {
          kind: stored.kind,
          edition: stored.edition,
          name: stored.name,
          payload: stored.payload,
        });
        targets.set(referenceKey, Object.freeze({
          contentKey,
          kind: reference.kind,
          scheme: reference.scheme,
          digest: liveIdentity.digest,
        }));
        reviewEdges.add(`${reference.kind}:${contentKey}`);
        externalSnapshots.set(referenceKey, Object.freeze({
          reference: referenceKey,
          kind: reference.kind,
          contentKey,
          canonicalJson: liveIdentity.canonicalJson,
        }));
      } catch {
        unresolvedNodes.add(node.id);
      }
    }
    dependenciesByNode.set(node.id, Object.freeze([...dependencies].sort()));
    reviewEdgesByNode.set(node.id, Object.freeze([...reviewEdges].sort()));
    targetsByNode.set(node.id, targets);
  }
  return Object.freeze({
    dependenciesByNode,
    reviewEdgesByNode,
    targetsByNode,
    unresolvedNodes,
    externalSnapshots: Object.freeze([...externalSnapshots.values()].sort(
      (left, right) => left.reference.localeCompare(right.reference),
    )),
  });
}

function defaultCloneName(name: string): string {
  return `${name} (Private copy)`;
}

function availableCloneName(
  db: DatabaseContext,
  projection: ContentImportProjection,
): string {
  for (let suffix = 1; suffix <= 10_000; suffix += 1) {
    const name = suffix === 1
      ? defaultCloneName(projection.name)
      : `${projection.name} (Private copy ${String(suffix)})`;
    let key: ContentKey;
    try {
      key = assertedExternalContentKeyFromDeclared(
        projection.kind,
        projection.edition,
        name,
        projection.assertedKey,
      );
    } catch {
      continue;
    }
    if (!rememberedTargetExists(db, projection.kind, key)) return name;
  }
  throw new ContentIdentityKeyRefusal('key_collision');
}

function localName(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
): string {
  let queries: readonly string[];
  switch (kind) {
    case 'class':
      queries = ['SELECT name FROM class_definitions WHERE content_key = ?'];
      break;
    case 'subclass':
      queries = ['SELECT name FROM subclass_definitions WHERE content_key = ?'];
      break;
    case 'feat':
      queries = ['SELECT name FROM feat_definitions WHERE content_key = ?'];
      break;
    case 'species':
      queries = [
        'SELECT name FROM species_definitions WHERE content_key = ?',
        'SELECT name FROM species_templates WHERE content_key = ?',
      ];
      break;
    case 'background':
      queries = [
        'SELECT name FROM background_definitions WHERE content_key = ?',
        'SELECT name FROM background_templates WHERE content_key = ?',
      ];
      break;
    case 'spell':
      queries = ['SELECT display_name FROM spell_versions WHERE content_key = ?'];
      break;
    case 'weapon':
      queries = ['SELECT name FROM weapon_templates WHERE content_key = ?'];
      break;
    case 'armor':
      queries = ['SELECT name FROM armor_templates WHERE content_key = ?'];
      break;
    case 'item':
      queries = ['SELECT name FROM item_definitions WHERE content_key = ?'];
      break;
  }
  for (const query of queries) {
    const displayName = db.scalar<string>(query, [contentKey]);
    if (displayName !== null) return displayName;
  }
  return String(contentKey);
}

function localCatalogLayer(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
): CatalogLayerDisclosure {
  return catalogLayerDisclosure(
    db.scalar<string>(
      `SELECT catalog_layer FROM catalog_content_identities
       WHERE content_kind = ? AND content_key = ?`,
      [kind, contentKey],
    ),
  );
}

function matchClass(resolution: ContentResolution): ContentImportMatchClass | null {
  if (!resolution.reviewRequired) return null;
  switch (resolution.matchClass) {
    case 'alias':
    case 'compatible-fingerprint':
    case 'srd-fallback':
    case 'metadata-conflict':
    case 'key-collision':
      return resolution.matchClass;
  }
}

function currentFingerprintDigest(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
  scheme: ContentFingerprintScheme,
): string {
  return db.scalar<string>(
    `SELECT fingerprint_digest FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
    [kind, contentKey, scheme],
  ) ?? 'not recorded';
}

function reviewConflictDetails(
  db: DatabaseContext,
  projection: ContentImportProjection,
  match: ContentImportMatchClass,
  incomingDigest: ContentFingerprintDigest | null,
  targetContentKey: ContentKey,
): readonly ContentImportConflictDetail[] {
  const details = [...(projection.conflictDetails ?? [])];
  if (match === 'key-collision') {
    details.push({
      field: 'Rules identity',
      incomingValue: incomingDigest ?? 'not supplied by reference',
      localValue: currentFingerprintDigest(
        db,
        projection.kind,
        targetContentKey,
        projectionFingerprintScheme(projection),
      ),
    });
  }
  return Object.freeze(details.map((detail) => Object.freeze({ ...detail })));
}

function isExactAssertedPlaceholderUpgrade(
  db: DatabaseContext,
  projection: ContentImportProjection,
  resolution: ContentResolution,
): resolution is Extract<ContentResolution, { readonly kind: 'exact' }> {
  return projection.kind === 'spell' &&
    projection.installExact === true &&
    resolution.kind === 'exact' &&
    resolution.contentKey === projection.assertedKey &&
    db.scalar<number>(
      `SELECT 1
       FROM spell_versions AS spell
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'spell'
        AND identity.content_key = spell.content_key
       WHERE spell.content_key = ? AND spell.provenance = 'placeholder'
         AND identity.key_kind = 'asserted'
         AND identity.catalog_layer = 'external'`,
      [resolution.contentKey],
    ) === 1;
}

function withLiveTargetSnapshot(
  db: DatabaseContext,
  entry: EvaluatedEntry,
): EvaluatedEntry {
  if (entry.targetContentKey === undefined || entry.outcome.kind === 'refused') {
    return entry;
  }
  if (
    entry.resolution.kind === 'exact' &&
    entry.targetContentKey === entry.resolution.contentKey &&
    isExactAssertedPlaceholderUpgrade(db, entry.projection, entry.resolution)
  ) {
    return entry;
  }
  try {
    const stored = entry.projection.projectStored(db, entry.targetContentKey);
    if (stored.kind !== entry.projection.kind) {
      throw new TypeError('Stored target kind does not match its adoption node.');
    }
    const identity = deriveContentIdentityForScheme(
      projectionFingerprintScheme(entry.projection),
      {
      kind: stored.kind,
      edition: stored.edition,
      name: stored.name,
      payload: stored.payload,
      },
    );
    const registeredCanonical = db.scalar<string>(
      `SELECT canonical_json FROM catalog_content_fingerprints
       WHERE content_kind = ? AND content_key = ?
         AND fingerprint_scheme = ? AND fingerprint_role = 'current'`,
      [
        entry.projection.kind,
        entry.targetContentKey,
        identity.envelope.scheme,
      ],
    );
    if (
      registeredCanonical !== null &&
      registeredCanonical !== identity.canonicalJson
    ) {
      throw new ContentIdentityCollision();
    }
    return {
      ...entry,
      targetDigest: identity.digest,
      targetCanonicalJson: identity.canonicalJson,
    };
  } catch {
    const {
      targetContentKey: _targetContentKey,
      targetDigest: _targetDigest,
      targetCanonicalJson: _targetCanonicalJson,
      ...rest
    } = entry;
    return {
      ...rest,
      outcome: refused(entry.node.id, 'target_integrity_refused'),
    };
  }
}

function targetHash(
  entries: readonly EvaluatedEntry[],
  externalSnapshots: DerivedDependencyGraph['externalSnapshots'],
): string {
  return sha256(canonicalJson([
    ...entries.flatMap((entry) =>
    entry.targetContentKey === undefined || entry.targetCanonicalJson === undefined
      ? []
      : [{
          id: entry.node.id,
          kind: entry.projection.kind,
          contentKey: entry.targetContentKey,
          canonicalJson: entry.targetCanonicalJson,
        }],
    ),
    ...externalSnapshots,
  ]));
}

function canonicalChoices(
  nodes: readonly ContentImportNode[],
  choices: ContentImportChoices,
): readonly { readonly id: string; readonly cloneName: string | null }[] {
  return Object.freeze(nodes.flatMap((node) => {
    const choice = choices[node.id];
    if (choice?.decision !== 'clone') return [];
    return [{ id: node.id, cloneName: choice.cloneName?.trim() ?? null }];
  }));
}

function dependencyTarget(
  entry: EvaluatedEntry,
): ContentImportDependencyTarget | null {
  if (entry.outcome.kind === 'refused') return null;
  const contentKey = entry.targetContentKey ?? entry.projection.assertedKey;
  return Object.freeze({
    contentKey,
    kind: entry.projection.kind,
    scheme: entry.identity.envelope.scheme,
    digest: entry.targetDigest ?? entry.identity.digest,
  });
}

function refused(
  id: string,
  reason: Extract<ContentImportEntryOutcome, { kind: 'refused' }>['reason'],
  candidates?: readonly ContentKey[],
): Extract<ContentImportEntryOutcome, { kind: 'refused' }> {
  return Object.freeze({
    id,
    kind: 'refused',
    reason,
    ...(candidates === undefined ? {} : { candidates }),
  });
}

function projectNode(
  node: ContentImportNode,
  choice: ContentImportChoice,
  dependencies: ReadonlyMap<string, ContentImportDependencyTarget>,
): ContentImportProjection | ContentImportEntryOutcome {
  const cloning = choice.decision === 'clone';
  const cloneName = choice.cloneName?.trim() ?? defaultCloneName(node.projection.name);
  if (cloning && cloneName === '') return refused(node.id, 'clone_name_required');
  let assertedKey = node.projection.assertedKey;
  if (cloning) {
    try {
      assertedKey = assertedExternalContentKeyFromDeclared(
        node.projection.kind,
        node.projection.edition,
        cloneName,
        node.projection.assertedKey,
      );
    } catch {
      return refused(node.id, 'clone_name_required');
    }
    if (assertedKey === node.projection.assertedKey) {
      return refused(node.id, 'clone_name_unchanged');
    }
  }
  const projection = node.reproject?.({
    name: cloning ? cloneName : node.projection.name,
    assertedKey,
    dependencies,
  }) ?? {
    ...node.projection,
    name: cloning ? cloneName : node.projection.name,
    assertedKey,
  };
  if (!cloning) return projection;
  const {
    declaredAlias: _declaredAlias,
    referenceOnly: _referenceOnly,
    ...cloneProjection
  } = projection;
  return cloneProjection;
}

function rememberedTargetExists(
  db: DatabaseContext,
  kind: ContentKind,
  target: ContentKey,
): boolean {
  return db.scalar<number>(
    `SELECT 1 FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, target],
  ) === 1;
}

function planToken(input: {
  readonly inputHash: string;
  readonly graphHash: string;
  readonly targetHash: string;
  readonly operationIdentity: string | null;
  readonly spellActivityChanges: readonly ContentImportSpellActivityChange[];
  readonly choices: readonly { readonly id: string; readonly cloneName: string | null }[];
  readonly outcomes: readonly ContentImportEntryOutcome[];
  readonly reviews: readonly ContentImportReviewRow[];
}): ContentImportPlanToken {
  return sha256(canonicalJson(input)) as ContentImportPlanToken;
}

function evaluate(
  db: DatabaseContext,
  nodes: readonly ContentImportNode[],
  choices: ContentImportChoices,
  phase: 'plan' | 'commit' = 'plan',
  spellActivityChanges: readonly ContentImportSpellActivityChange[] = Object.freeze([]),
  operationIdentity: string | null = null,
): Evaluation {
  const beforeGraphHash = registryGraphHash(db);
  const hashedInput = inputHash(nodes);
  const reviews: ContentImportReviewRow[] = [];
  const entries: EvaluatedEntry[] = [];
  const byId = new Map<string, EvaluatedEntry>();
  const graph = deriveDependencyGraph(db, nodes);

  let order: readonly string[];
  try {
    order = projectContentGraphInDependencyOrder(
      nodes.map((node) => ({
        key: node.id,
        dependencies: graph.dependenciesByNode.get(node.id) ?? [],
      })),
      (key) => key,
    );
  } catch {
    const outcomes = nodes.map((node) => refused(node.id, 'dependency_refused'));
    const plan: ContentImportPlan = Object.freeze({
      token: planToken({
        inputHash: hashedInput,
        graphHash: beforeGraphHash,
        targetHash: sha256(canonicalJson([])),
        operationIdentity,
        spellActivityChanges,
        choices: canonicalChoices(nodes, choices),
        outcomes,
        reviews,
      }),
      inputHash: hashedInput,
      graphHash: beforeGraphHash,
      targetHash: sha256(canonicalJson([])),
      spellActivityChanges,
      reviews: Object.freeze(reviews),
      outcomes: Object.freeze(outcomes),
    });
    return { plan, entries: [] };
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const id of order) {
    const node = nodesById.get(id)!;
    const dependencyMap = new Map<string, ContentImportDependencyTarget>();
    let blocked = false;
    const derivedDependencies = graph.dependenciesByNode.get(node.id) ?? [];
    for (const dependency of derivedDependencies) {
      const target = dependencyTarget(byId.get(dependency)!);
      if (target === null) {
        blocked = true;
        break;
      }
      const dependencyNode = nodesById.get(dependency)!;
      const sourceIdentity = deriveProjectionIdentity(
        dependencyNode.projection,
      );
      dependencyMap.set(contentFingerprintReferenceKey({
        kind: target.kind,
        scheme: sourceIdentity.envelope.scheme,
        digest: sourceIdentity.digest,
      }), target);
    }
    for (const [reference, target] of graph.targetsByNode.get(node.id) ?? []) {
      dependencyMap.set(reference, target);
    }
    if (graph.unresolvedNodes.has(node.id)) blocked = true;
    if (blocked) {
      const projection = node.projection;
      const identity = deriveProjectionIdentity(projection);
      const incomingFingerprint = incomingDecisionFingerprint(projection, identity);
      const entry: EvaluatedEntry = {
        node,
        projection,
        identity,
        resolution: { kind: 'missing', reviewRequired: false },
        outcome: refused(
          id,
          graph.unresolvedNodes.has(node.id)
            ? 'unresolved_reference'
            : 'dependency_refused',
        ),
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
      };
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }

    const requestedChoice = choices[id] ?? { decision: 'match' as const };
    const choice = requestedChoice.decision === 'clone' &&
        requestedChoice.cloneName === undefined
      ? { ...requestedChoice, cloneName: availableCloneName(db, node.projection) }
      : requestedChoice;
    const incomingProjection = node.reproject?.({
      name: node.projection.name,
      assertedKey: node.projection.assertedKey,
      dependencies: dependencyMap,
    }) ?? node.projection;
    const incomingIdentity = deriveProjectionIdentity(incomingProjection);
    const incomingFingerprint = incomingDecisionFingerprint(
      incomingProjection,
      incomingIdentity,
    );
    const projected = projectNode(node, choice, dependencyMap);
    if ('id' in projected && projected.kind === 'refused') {
      const projection = node.projection;
      const identity = deriveProjectionIdentity(projection);
      const entry: EvaluatedEntry = {
        node,
        projection,
        identity,
        resolution: { kind: 'missing', reviewRequired: false },
        outcome: projected,
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
      };
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }
    const projection = projected as ContentImportProjection;
    let resolved: ReturnType<typeof resolveContentAggregate>;
    try {
      const identity = deriveProjectionIdentity(projection);
      resolved = projection.referenceOnly === undefined
        ? resolveContentAggregate(db, {
            kind: projection.kind,
            edition: projection.edition,
            name: projection.name,
            payload: projection.payload,
            assertedKey: projection.assertedKey,
            fingerprintScheme: projectionFingerprintScheme(projection),
            ...(projection.declaredAlias === undefined
              ? {}
              : { declaredAlias: projection.declaredAlias }),
            metadataConflict: projection.metadataConflict ?? false,
          })
        : Object.freeze({
            identity,
            resolution: resolveContentReference(db, {
              kind: projection.kind,
              contentKey: projection.referenceOnly.contentKey,
            }),
          });
    } catch (error) {
      const identity = deriveProjectionIdentity(projection);
      const entry: EvaluatedEntry = {
        node,
        projection,
        identity,
        resolution: { kind: 'missing', reviewRequired: false },
        outcome: refused(
          id,
          error instanceof ContentIdentityCollision
            ? 'identity_collision'
            : 'install_refused',
        ),
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
      };
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }
    const identity = resolved.identity;
    const resolution: ContentResolution = isExactAssertedPlaceholderUpgrade(
      db,
      projection,
      resolved.resolution,
    )
      ? Object.freeze({
          kind: 'exact' as const,
          contentKey: resolved.resolution.contentKey,
          matchClass: 'trivial-self-match' as const,
          reviewRequired: false as const,
        })
      : resolved.resolution;
    if (projection.referenceOnly !== undefined && resolution.kind === 'missing') {
      const entry: EvaluatedEntry = {
        node,
        projection,
        identity,
        resolution,
        outcome: refused(id, 'unresolved_reference'),
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
      };
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }
    const remembered = rememberedContentMatchDecision(db, {
      kind: projection.kind,
      scheme: incomingFingerprint.scheme,
      digest: incomingFingerprint.digest,
    });
    if (
      projection.allowRememberedDecision !== false &&
      remembered !== null &&
      rememberedTargetExists(db, projection.kind, remembered.targetContentKey)
    ) {
      const outcome: ContentImportEntryOutcome = Object.freeze({
        id,
        kind: remembered.decision === 'clone'
          ? 'remembered-clone'
          : 'remembered-match',
        contentKey: remembered.targetContentKey,
      });
      const entry = withLiveTargetSnapshot(db, {
        node,
        projection,
        identity,
        resolution,
        outcome,
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
        targetContentKey: remembered.targetContentKey,
      });
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }

    if (resolution.kind === 'ambiguous') {
      const entry: EvaluatedEntry = {
        node,
        projection,
        identity,
        resolution,
        outcome: refused(
          id,
          resolution.at === 'alias'
            ? 'ambiguous_alias'
            : 'ambiguous_fingerprint',
          resolution.candidates,
        ),
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
      };
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }

    const reviewClass = matchClass(resolution);
    if (
      resolution.reviewRequired &&
      reviewClass !== null &&
      choice.decision === 'match'
    ) {
      const outcome: ContentImportEntryOutcome = Object.freeze({
        id,
        kind: 'review',
        contentKey: resolution.contentKey,
        matchClass: reviewClass,
      });
      const entry = withLiveTargetSnapshot(db, {
        node,
        projection,
        identity,
        resolution,
        outcome,
        reviewedDecision: 'match',
        incomingDigest: incomingFingerprint.digest,
        incomingScheme: incomingFingerprint.scheme,
        targetContentKey: resolution.contentKey,
      });
      if (entry.outcome.kind === 'refused') {
        entries.push(entry);
        byId.set(id, entry);
        continue;
      }
      const review: ContentImportReviewRow = Object.freeze({
        id,
        kind: projection.kind,
        incomingName: projection.name,
        localName: localName(db, projection.kind, resolution.contentKey),
        localCatalogLayer: localCatalogLayer(
          db,
          projection.kind,
          resolution.contentKey,
        ),
        targetContentKey: resolution.contentKey,
        incomingFingerprint: incomingFingerprint.evidenceDigest,
        matchClass: reviewClass,
        defaultChoice: 'match',
        selectedChoice: 'match',
        cloneName: availableCloneName(db, incomingProjection),
        dependencies: graph.reviewEdgesByNode.get(node.id) ?? Object.freeze([]),
        conflictDetails: reviewConflictDetails(
          db,
          projection,
          reviewClass,
          incomingFingerprint.evidenceDigest,
          resolution.contentKey,
        ),
      });
      reviews.push(review);
      entries.push(entry);
      byId.set(id, entry);
      continue;
    }

    if (choice.decision === 'clone') {
      if (resolution.kind !== 'missing' && !(
        resolution.kind === 'exact' &&
        resolution.matchClass === 'trivial-self-match'
      )) {
        const entry: EvaluatedEntry = {
          node,
          projection,
          identity,
          resolution,
          outcome: refused(id, 'clone_key_collision'),
          incomingDigest: incomingFingerprint.digest,
          incomingScheme: incomingFingerprint.scheme,
        };
        entries.push(entry);
        byId.set(id, entry);
        continue;
      }
    }

    const installsAssertedAggregate = resolution.kind === 'missing' ||
      projection.installExact === true &&
      resolution.kind === 'exact' &&
        resolution.matchClass === 'trivial-self-match';
    if (installsAssertedAggregate) {
      if (resolution.kind === 'exact') {
        const liveExactTarget = withLiveTargetSnapshot(db, {
          node,
          projection,
          identity,
          resolution,
          outcome: Object.freeze({
            id,
            kind: 'match',
            contentKey: resolution.contentKey,
          }),
          incomingDigest: incomingFingerprint.digest,
          incomingScheme: incomingFingerprint.scheme,
          targetContentKey: resolution.contentKey,
        });
        if (liveExactTarget.outcome.kind === 'refused') {
          entries.push(liveExactTarget);
          byId.set(id, liveExactTarget);
          continue;
        }
      }
      try {
        if (
          resolution.kind === 'exact' &&
          isExactAssertedPlaceholderUpgrade(db, projection, resolution)
        ) {
          repairAssertedPlaceholderContentIdentityName(db, {
            contentKey: resolution.contentKey,
            normalizedName: identity.envelope.normalizedName,
          });
        }
        if (resolution.kind === 'missing') {
          registerAssertedContentIdentity(db, {
            kind: projection.kind,
            edition: projection.edition,
            name: projection.name,
            payload: projection.payload,
            assertedKey: projection.assertedKey,
            fingerprintScheme: projectionFingerprintScheme(projection),
          });
        }
        const installedKey = resolution.kind === 'missing'
          ? projection.assertedKey
          : resolution.contentKey;
        projection.install(db, installedKey, projection, phase);
      } catch (error) {
        const entry: EvaluatedEntry = {
          node,
          projection,
          identity,
          resolution,
          outcome: refused(
            id,
            error instanceof ContentIdentityCollision
              ? 'identity_collision'
              : error instanceof ContentIdentityKeyRefusal &&
                  error.reason === 'key_collision'
                ? 'clone_key_collision'
                : 'install_refused',
          ),
          incomingDigest: incomingFingerprint.digest,
          incomingScheme: incomingFingerprint.scheme,
        };
        entries.push(entry);
        byId.set(id, entry);
        continue;
      }
    }
    const contentKey = resolution.kind === 'missing'
      ? projection.assertedKey
      : resolution.contentKey;
    const outcome: ContentImportEntryOutcome = Object.freeze({
      id,
      kind: resolution.kind === 'missing' ? 'create' : 'match',
      contentKey,
    });
    const entry = withLiveTargetSnapshot(db, {
      node,
      projection,
      identity,
      resolution,
      outcome,
      ...(choice.decision === 'clone'
        ? { reviewedDecision: 'clone' as const }
        : {}),
      incomingDigest: incomingFingerprint.digest,
      incomingScheme: incomingFingerprint.scheme,
      targetContentKey: contentKey,
    });
    entries.push(entry);
    byId.set(id, entry);
  }

  const liveTargetHash = targetHash(entries, graph.externalSnapshots);
  const outcomes = Object.freeze(entries.map((entry) => entry.outcome));
  const frozenReviews = Object.freeze(reviews);
  const plan: ContentImportPlan = Object.freeze({
    token: planToken({
      inputHash: hashedInput,
      graphHash: beforeGraphHash,
      targetHash: liveTargetHash,
      operationIdentity,
      spellActivityChanges,
      choices: canonicalChoices(nodes, choices),
      outcomes,
      reviews: frozenReviews,
    }),
    inputHash: hashedInput,
    graphHash: beforeGraphHash,
    targetHash: liveTargetHash,
    spellActivityChanges,
    reviews: frozenReviews,
    outcomes,
  });
  return Object.freeze({ plan, entries: Object.freeze(entries) });
}

export function planContentImport(
  db: DatabaseContext,
  nodes: readonly ContentImportNode[],
  choices: ContentImportChoices = Object.freeze({}),
  spellActivityChanges: readonly ContentImportSpellActivityChange[] = Object.freeze([]),
  operationIdentity: string | null = null,
): ContentImportPlan {
  try {
    db.transaction(() => {
      throw new PlanRollback(evaluate(
        db,
        nodes,
        choices,
        'plan',
        spellActivityChanges,
        operationIdentity,
      ));
    });
  } catch (error) {
    if (error instanceof PlanRollback) return error.evaluation.plan;
    throw error;
  }
  throw new Error('Content import planner failed to roll back its simulation.');
}

export type ContentImportCommitResult =
  | {
      readonly kind: 'committed';
      readonly outcomes: readonly ContentImportEntryOutcome[];
    }
  | {
      readonly kind: 'stale-plan';
      readonly freshPlan: ContentImportPlan;
    }
  | {
      readonly kind: 'refused';
      readonly reason: 'entry_refused' | 'commit_failed';
      readonly outcomes: readonly ContentImportEntryOutcome[];
    };

export type ContentImportPlanner = typeof planContentImport;

export function commitContentImport(
  db: DatabaseContext,
  input: {
    readonly nodes: readonly ContentImportNode[];
    readonly token: ContentImportPlanToken;
    readonly choices?: ContentImportChoices;
    readonly spellActivityChanges?: readonly ContentImportSpellActivityChange[];
    /** Digest of enclosing writes that must remain identical through commit. */
    readonly operationIdentity?: string;
    /**
     * A plan already evaluated against the same pre-commit state. Commit still
     * re-evaluates inside its write transaction, so a state change remains a
     * stale plan; this only avoids repeating the rollback-only planning pass.
     */
    readonly precommitPlan?: ContentImportPlan;
    /** Planner dependency retained so callers can count planning passes. */
    readonly planner?: ContentImportPlanner;
    /** Enclosing character/document writes run here and share the transaction. */
    readonly afterInstall?: (db: DatabaseContext) => void;
  },
): ContentImportCommitResult {
  const choices = input.choices ?? Object.freeze({});
  const spellActivityChanges = input.spellActivityChanges ?? Object.freeze([]);
  const operationIdentity = input.operationIdentity ?? null;
  const freshPlan = input.precommitPlan ?? (input.planner ?? planContentImport)(
    db,
    input.nodes,
    choices,
    spellActivityChanges,
    operationIdentity,
  );
  if (freshPlan.token !== input.token) {
    return Object.freeze({ kind: 'stale-plan', freshPlan });
  }
  if (freshPlan.outcomes.some((outcome) => outcome.kind === 'refused')) {
    return Object.freeze({
      kind: 'refused',
      reason: 'entry_refused',
      outcomes: freshPlan.outcomes,
    });
  }

  try {
    return db.transaction(() => {
      const evaluation = evaluate(
        db,
        input.nodes,
        choices,
        'commit',
        spellActivityChanges,
        operationIdentity,
      );
      if (evaluation.plan.token !== input.token) {
        throw new PlanRollback(evaluation);
      }
      for (const entry of evaluation.entries) {
        if (
          entry.reviewedDecision !== undefined &&
          entry.targetContentKey !== undefined
        ) {
          rememberContentMatchDecision(db, {
            kind: entry.projection.kind,
            scheme: entry.incomingScheme,
            digest: entry.incomingDigest,
            decision: entry.reviewedDecision,
            targetContentKey: entry.targetContentKey,
          });
        }
      }
      input.afterInstall?.(db);
      return Object.freeze({
        kind: 'committed' as const,
        outcomes: evaluation.plan.outcomes,
      });
    });
  } catch (error) {
    if (error instanceof PlanRollback) {
      return Object.freeze({ kind: 'stale-plan', freshPlan: error.evaluation.plan });
    }
    return Object.freeze({
      kind: 'refused',
      reason: 'commit_failed',
      outcomes: freshPlan.outcomes,
    });
  }
}
