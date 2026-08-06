import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import type { ContentKind } from './content-identity';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportCommitResult,
  type ContentImportEntryOutcome,
  type ContentImportNode,
  type ContentImportPlan,
  type ContentImportPlanToken,
} from './content-adoption';

/**
 * The common immutable boundary for a single authored aggregate.
 *
 * A spell fork, a hand-authored aggregate, and an edit of published external
 * content differ only in how they build their node. Planning, D82 review,
 * installation, optional version lineage, and caller cleanup are one lifecycle.
 */
export interface ImmutableCatalogPublication<K extends ContentKind> {
  readonly node: ContentImportNode<K>;
  readonly operationIdentity?: string;
  /** UI/catalog history only. It never retargets a character reference. */
  readonly supersedesContentKey?: ContentKey | null;
  readonly afterInstall?: (
    db: DatabaseContext,
    outcome: Exclude<ContentImportEntryOutcome, { readonly kind: 'refused' }>,
  ) => void;
}

export function planImmutableCatalogPublication<K extends ContentKind>(
  db: DatabaseContext,
  publication: ImmutableCatalogPublication<K>,
  choices: ContentImportChoices = Object.freeze({}),
): ContentImportPlan {
  return planContentImport(
    db,
    [publication.node],
    choices,
    Object.freeze([]),
    publication.operationIdentity ?? null,
  );
}

function nonRefusedOutcome(
  plan: ContentImportPlan,
): Exclude<ContentImportEntryOutcome, { readonly kind: 'refused' }> | null {
  const outcome = plan.outcomes[0];
  return outcome === undefined || outcome.kind === 'refused' ? null : outcome;
}

function recordSupersession(
  db: DatabaseContext,
  kind: ContentKind,
  oldContentKey: ContentKey,
  newContentKey: ContentKey,
): void {
  if (oldContentKey === newContentKey) return;

  const oldLayer = db.scalar<string>(
    `SELECT catalog_layer
     FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, oldContentKey],
  );
  // A bundled “make a copy” operation is ancestry, not a claim that the
  // bundled aggregate has been superseded. Only edits of external creations
  // participate in local version lineage.
  if (oldLayer !== 'external') return;

  db.exec(
    `INSERT INTO catalog_content_supersessions (
       content_kind, superseded_content_key, successor_content_key
     ) VALUES (?, ?, ?)
     ON CONFLICT(content_kind, superseded_content_key) DO UPDATE SET
       successor_content_key = excluded.successor_content_key,
       recorded_at = CURRENT_TIMESTAMP`,
    [kind, oldContentKey, newContentKey],
  );
}

export function commitImmutableCatalogPublication<K extends ContentKind>(
  db: DatabaseContext,
  publication: ImmutableCatalogPublication<K>,
  input: {
    readonly token: ContentImportPlanToken;
    readonly choices?: ContentImportChoices;
  },
): ContentImportCommitResult {
  const choices = input.choices ?? Object.freeze({});
  const freshPlan = planImmutableCatalogPublication(db, publication, choices);
  const outcome = nonRefusedOutcome(freshPlan);

  return commitContentImport(db, {
    nodes: [publication.node],
    token: input.token,
    choices,
    ...(publication.operationIdentity === undefined
      ? {}
      : { operationIdentity: publication.operationIdentity }),
    ...(outcome === null
      ? {}
      : { afterInstall: (transaction: DatabaseContext) => {
          const supersedes = publication.supersedesContentKey;
          if (supersedes !== undefined && supersedes !== null) {
            recordSupersession(
              transaction,
              publication.node.projection.kind,
              supersedes,
              outcome.contentKey,
            );
          }
          publication.afterInstall?.(transaction, outcome);
        } }),
  });
}
