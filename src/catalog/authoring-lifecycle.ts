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

export const SUPERSESSION_SUCCESSOR_LAYER_REFUSAL =
  'A superseding version must resolve to Homebrew · external layer.';

export class CatalogSupersessionRefusal extends Error {
  constructor(
    readonly reason: 'successor_not_external',
    options?: ErrorOptions,
  ) {
    super(SUPERSESSION_SUCCESSOR_LAYER_REFUSAL, options);
    this.name = 'CatalogSupersessionRefusal';
  }
}

export function recordSupersession(
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
  const newLayer = db.scalar<string>(
    `SELECT catalog_layer
     FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, newContentKey],
  );
  if (newLayer !== 'external') {
    throw new CatalogSupersessionRefusal('successor_not_external');
  }

  // A bundled “make a copy” operation is ancestry, not a claim that the
  // bundled aggregate has been superseded. Only edits of external creations
  // participate in local version lineage.
  if (oldLayer !== 'external') return;

  db.exec(
    `INSERT INTO catalog_content_supersessions (
       content_kind, superseded_content_key, successor_content_key
     ) VALUES (?, ?, ?)`,
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
  let supersessionRefusal: CatalogSupersessionRefusal | null = null;
  const committed = commitContentImport(db, {
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
          const recordsLineage = outcome.kind === 'create' ||
            transaction.scalar<string>(
              `SELECT catalog_layer
                 FROM catalog_content_identities
                WHERE content_kind = ? AND content_key = ?`,
              [publication.node.projection.kind, outcome.contentKey],
            ) === 'external';
          // A Match to an external aggregate is still a same-layer version
          // resolution used by CI-7. Only a non-external Match resolves without
          // claiming a lineage relationship.
          if (
            supersedes !== undefined && supersedes !== null &&
            recordsLineage
          ) {
            try {
              recordSupersession(
                transaction,
                publication.node.projection.kind,
                supersedes,
                outcome.contentKey,
              );
            } catch (error) {
              if (error instanceof CatalogSupersessionRefusal) {
                supersessionRefusal = error;
              }
              throw error;
            }
          }
          publication.afterInstall?.(transaction, outcome);
        } }),
  });
  if (supersessionRefusal !== null) throw supersessionRefusal;
  return committed;
}
