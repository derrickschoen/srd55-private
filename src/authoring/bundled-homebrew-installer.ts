import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import {
  assertedExternalContentKey,
  normalizeCatalogKeyComponent,
} from '../catalog/catalog-key';
import {
  deriveContentIdentityV1,
  type ContentFingerprintDigest,
} from '../catalog/content-identity';
import type {
  ContentImportCommitResult,
  ContentImportEntryOutcome,
  ContentImportPlan,
  ContentImportPlanToken,
} from '../catalog/content-adoption';
import { projectAuthoredContentAggregateV1 } from '../catalog/stored-authored-content-projector-v1';
import {
  type AuthoredContentKind,
  type HomebrewDraft,
  type PublishResult,
  type PublishableHomebrew,
} from './contracts';
import { AuthoringServiceError, CatalogAuthoringService } from './draft-service';
import { speciesDraftToAggregate } from './species-publisher';
import { backgroundDraftToAggregate } from './background-publisher';
import { subclassDraftToAggregate } from './subclass-publisher';
import type { BundledHomebrewCatalogEntry } from './bundled-homebrew-catalog';
import { BUNDLED_HOMEBREW_CATALOG } from './bundled-homebrew-catalog';

export interface BundledHomebrewEntrySummary {
  readonly catalog_key: string;
  readonly kind: AuthoredContentKind;
  readonly name: string;
  readonly outcome: 'create' | 'matched_existing' | 'successor' | 'refused';
  readonly error: string | null;
}

export interface BundledHomebrewInstallPlan extends ContentImportPlan {
  readonly entries: readonly BundledHomebrewEntrySummary[];
}

export type BundledHomebrewInstallResult = ContentImportCommitResult;

interface RevisionIdentity {
  readonly document: HomebrewDraft;
  readonly publicationDocument: HomebrewDraft;
  readonly aggregate: PublishableHomebrew;
  readonly digest: ContentFingerprintDigest;
}

interface EntryTarget {
  readonly baseContentKey: ContentKey | null;
  readonly outcome: Exclude<BundledHomebrewEntrySummary['outcome'], 'refused'>;
}

class PreviewRollback extends Error {
  constructor(
    readonly results: readonly PublishResult[],
    readonly entries: readonly BundledHomebrewEntrySummary[],
  ) {
    super('Bundled homebrew preview rollback.');
    this.name = 'PreviewRollback';
  }
}

class BundledEntryInstallError extends Error {
  constructor(
    readonly entry: BundledHomebrewCatalogEntry,
    cause: unknown,
  ) {
    const semanticIssues = cause !== null && typeof cause === 'object' &&
      Array.isArray(Reflect.get(cause, 'issues'))
      ? ` ${JSON.stringify(Reflect.get(cause, 'issues'))}`
      : '';
    const detail = cause instanceof AuthoringServiceError
      ? `${cause.message} ${JSON.stringify(cause.data)}`
      : cause instanceof Error ? `${cause.message}${semanticIssues}` : String(cause);
    super(detail, { cause });
    this.name = 'BundledEntryInstallError';
  }
}

function draftAggregate(db: DatabaseContext, document: HomebrewDraft): PublishableHomebrew {
  switch (document.kind) {
    case 'species': return speciesDraftToAggregate(db, document);
    case 'background': return backgroundDraftToAggregate(db, document);
    case 'subclass': return subclassDraftToAggregate(db, document, null);
  }
}

function revisionIdentity(db: DatabaseContext, document: HomebrewDraft): RevisionIdentity {
  const aggregate = draftAggregate(db, document);
  const projected = projectAuthoredContentAggregateV1(aggregate);
  const identity = deriveContentIdentityV1({
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  });
  return Object.freeze({ document, publicationDocument: document, aggregate, digest: identity.digest });
}

function revisions(
  db: DatabaseContext,
  entry: BundledHomebrewCatalogEntry,
): readonly RevisionIdentity[] {
  const identities = entry.revisions.map((document, index) => {
    const publicationDocument = index === 0
      ? document
      : { ...document, name: `${document.name} (Bundled revision ${String(index + 1)})` };
    const identity = revisionIdentity(db, publicationDocument);
    return Object.freeze({ ...identity, document, publicationDocument });
  });
  const first = identities[0]!;
  for (const current of identities.slice(1)) {
    if (
      current.document.kind !== first.document.kind ||
      current.document.name !== first.document.name ||
      current.document.rules_edition !== first.document.rules_edition
    ) {
      throw new TypeError(
        `Bundled entry "${entry.catalog_key}" revisions must keep kind, name, and edition.`,
      );
    }
  }
  if (new Set(identities.map((identity) => identity.digest)).size !== identities.length) {
    throw new TypeError(`Bundled entry "${entry.catalog_key}" repeats a content revision.`);
  }
  return Object.freeze(identities);
}

function lineageHead(
  db: DatabaseContext,
  kind: AuthoredContentKind,
  stableKey: ContentKey,
): ContentKey | null {
  const stable = db.oneRaw(
    `SELECT catalog_layer FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, stableKey],
  );
  if (stable === null) return null;
  if (stable.catalog_layer !== 'external') {
    throw new TypeError(`Bundled key "${stableKey}" is not external content.`);
  }
  const head = db.scalar<string>(
    `WITH RECURSIVE lineage(content_key) AS (
       SELECT ?
       UNION ALL
       SELECT successor.successor_content_key
       FROM catalog_content_supersessions AS successor
       JOIN lineage ON successor.content_kind = ?
        AND successor.superseded_content_key = lineage.content_key
     )
     SELECT lineage.content_key
     FROM lineage
     LEFT JOIN catalog_content_supersessions AS successor
       ON successor.content_kind = ?
      AND successor.superseded_content_key = lineage.content_key
     WHERE successor.successor_content_key IS NULL`,
    [stableKey, kind, kind],
  );
  if (head === null) throw new TypeError(`Bundled lineage "${stableKey}" has no head.`);
  return head as ContentKey;
}

function currentDigest(
  db: DatabaseContext,
  kind: AuthoredContentKind,
  contentKey: ContentKey,
): ContentFingerprintDigest {
  const digest = db.scalar<string>(
    `SELECT fingerprint_digest FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = 'content-v1' AND fingerprint_role = 'current'`,
    [kind, contentKey],
  );
  if (digest === null) throw new TypeError(`Current fingerprint is missing for "${contentKey}".`);
  return digest as ContentFingerprintDigest;
}

function entryTarget(
  db: DatabaseContext,
  entry: BundledHomebrewCatalogEntry,
  identities: readonly RevisionIdentity[],
): EntryTarget {
  const latest = identities.at(-1)!;
  const first = identities[0]!;
  const stableKey = assertedExternalContentKey(
    first.document.kind,
    first.document.rules_edition ?? '',
    first.document.name,
  );
  const head = lineageHead(db, latest.aggregate.kind, stableKey);
  if (head === null) {
    return Object.freeze({ baseContentKey: null, outcome: 'create' });
  }
  const headDigest = currentDigest(db, latest.aggregate.kind, head);
  if (!identities.some((identity) => identity.digest === headDigest)) {
    throw new TypeError(
      `Installed content at "${stableKey}" is not a registered revision of bundled entry "${entry.catalog_key}".`,
    );
  }
  if (headDigest === latest.digest) {
    return Object.freeze({ baseContentKey: head, outcome: 'matched_existing' });
  }
  return Object.freeze({ baseContentKey: head, outcome: 'successor' });
}

function deterministicUuids(entry: BundledHomebrewCatalogEntry): () => string {
  let ordinal = 0;
  return () => {
    ordinal += 1;
    return `bundled-${normalizeCatalogKeyComponent(entry.catalog_key)}-${String(ordinal)}`;
  };
}

/**
 * The one authored-kind install route: real draft, save, publisher preview,
 * publisher commit. Every current catalog entry is a subclass, but this switch
 * remains generic for the three HA publishers.
 */
function installEntry(
  db: DatabaseContext,
  entry: BundledHomebrewCatalogEntry,
): { readonly result: PublishResult; readonly summary: BundledHomebrewEntrySummary } {
  const identities = revisions(db, entry);
  const latest = identities.at(-1)!;
  const target = entryTarget(db, entry, identities);
  const authoring = new CatalogAuthoringService(db, {
    randomUuid: deterministicUuids(entry),
  });
  const created = authoring.createDraft({
    content_kind: latest.document.kind,
    ...(target.baseContentKey === null ? {} : { base_content_key: target.baseContentKey }),
  });
  const saved = authoring.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document: latest.publicationDocument,
  });
  const preview = authoring.previewPublish({
    draft_uuid: saved.draft_uuid,
    expected_revision: saved.revision,
  });
  if (preview.review.length !== 0) {
    throw new TypeError(`Bundled entry "${entry.catalog_key}" unexpectedly requires adoption review.`);
  }
  const result = authoring.commitPublish({ token: preview.token, decisions: [] });
  if (target.outcome === 'matched_existing' && result.outcome !== 'matched_existing') {
    throw new TypeError(`Bundled entry "${entry.catalog_key}" failed its idempotent match.`);
  }
  return Object.freeze({
    result,
    summary: Object.freeze({
      catalog_key: entry.catalog_key,
      kind: latest.document.kind,
      name: latest.document.name,
      outcome: target.outcome,
      error: null,
    }),
  });
}

function installAll(
  db: DatabaseContext,
  catalog: readonly BundledHomebrewCatalogEntry[],
): { readonly results: readonly PublishResult[]; readonly entries: readonly BundledHomebrewEntrySummary[] } {
  const installed = catalog.map((entry) => {
    try {
      return installEntry(db, entry);
    } catch (error) {
      throw new BundledEntryInstallError(entry, error);
    }
  });
  return Object.freeze({
    results: Object.freeze(installed.map(({ result }) => result)),
    entries: Object.freeze(installed.map(({ summary }) => summary)),
  });
}

function simulate(
  db: DatabaseContext,
  catalog: readonly BundledHomebrewCatalogEntry[],
): { readonly results: readonly PublishResult[]; readonly entries: readonly BundledHomebrewEntrySummary[] } {
  try {
    db.transaction(() => {
      const installed = installAll(db, catalog);
      throw new PreviewRollback(installed.results, installed.entries);
    });
  } catch (error) {
    if (error instanceof PreviewRollback) {
      return Object.freeze({ results: error.results, entries: error.entries });
    }
    throw error;
  }
  throw new Error('Bundled homebrew preview failed to roll back.');
}

function outcomes(
  results: readonly PublishResult[],
  entries: readonly BundledHomebrewEntrySummary[],
): readonly ContentImportEntryOutcome[] {
  return Object.freeze(results.map((result, index) => Object.freeze({
    id: `${entries[index]!.kind}:bundled:${entries[index]!.catalog_key}`,
    kind: result.outcome === 'created' ? 'create' as const : 'match' as const,
    contentKey: result.content_key,
  })));
}

export function planBundledHomebrewInstall(
  db: DatabaseContext,
  catalog: readonly BundledHomebrewCatalogEntry[] = BUNDLED_HOMEBREW_CATALOG,
): BundledHomebrewInstallPlan {
  try {
    const simulated = simulate(db, catalog);
    const plannedOutcomes = outcomes(simulated.results, simulated.entries);
    const inputHash = sha256(canonicalJson(catalog));
    const targetHash = sha256(canonicalJson(plannedOutcomes));
    const graphHash = sha256(canonicalJson(simulated.entries));
    const token = sha256(canonicalJson({ inputHash, targetHash, graphHash })) as ContentImportPlanToken;
    return Object.freeze({
      token,
      inputHash,
      graphHash,
      targetHash,
      spellActivityChanges: Object.freeze([]),
      reviews: Object.freeze([]),
      outcomes: plannedOutcomes,
      entries: simulated.entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const inputHash = sha256(canonicalJson(catalog));
    const entry = error instanceof BundledEntryInstallError ? error.entry : catalog[0];
    const kind = entry?.revisions.at(-1)?.kind ?? 'subclass';
    const catalogKey = entry?.catalog_key ?? 'unknown';
    const refused = Object.freeze({
      id: `${kind}:bundled:${catalogKey}`,
      kind: 'refused' as const,
      reason: 'install_refused' as const,
    });
    return Object.freeze({
      token: sha256(canonicalJson({ inputHash, message })) as ContentImportPlanToken,
      inputHash,
      graphHash: sha256(message),
      targetHash: sha256(message),
      spellActivityChanges: Object.freeze([]),
      reviews: Object.freeze([]),
      outcomes: Object.freeze([refused]),
      entries: Object.freeze([{
        catalog_key: catalogKey,
        kind,
        name: entry?.revisions.at(-1)?.name ?? 'Unknown bundled entry',
        outcome: 'refused' as const,
        error: message,
      }]),
    });
  }
}

export function commitBundledHomebrewInstall(
  db: DatabaseContext,
  token: ContentImportPlanToken,
  catalog: readonly BundledHomebrewCatalogEntry[] = BUNDLED_HOMEBREW_CATALOG,
): BundledHomebrewInstallResult {
  const freshPlan = planBundledHomebrewInstall(db, catalog);
  if (freshPlan.token !== token) return Object.freeze({ kind: 'stale-plan', freshPlan });
  if (freshPlan.outcomes.some((outcome) => outcome.kind === 'refused')) {
    return Object.freeze({ kind: 'refused', reason: 'entry_refused', outcomes: freshPlan.outcomes });
  }
  try {
    return db.transaction(() => {
      const installed = installAll(db, catalog);
      return Object.freeze({
        kind: 'committed' as const,
        outcomes: outcomes(installed.results, installed.entries),
      });
    });
  } catch {
    return Object.freeze({ kind: 'refused', reason: 'commit_failed', outcomes: freshPlan.outcomes });
  }
}
