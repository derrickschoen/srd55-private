import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportCommitResult,
  type ContentImportPlanner,
  type ContentImportPlanToken,
} from '../catalog/content-adoption';
import {
  exportLibraryDocument,
  libraryContentImportNodes,
  portableImportPlan,
  restorePortableContentSupersessions,
  restorePortableContentLifecycle,
  validateLibraryDocument,
  type CurrentLibraryExportDocument,
  type LibraryExportDocument,
  type PortableImportPlan,
} from './portable-content';
import { BackupValidationError } from './backup-version';

export interface LibraryImportResult {
  readonly outcomes: Extract<ContentImportCommitResult, { readonly kind: 'committed' }>['outcomes'];
  readonly lifecycleWasRecorded: boolean;
}

function libraryImportOperationIdentity(document: LibraryExportDocument): string {
  return sha256(canonicalJson(document));
}

export function exportWholeLibrary(
  db: DatabaseContext,
  exportedAt?: string,
): CurrentLibraryExportDocument {
  return exportLibraryDocument(db, undefined, exportedAt);
}

export function exportSelectedLibraryContent(
  db: DatabaseContext,
  selectedContentKeys: readonly ContentKey[],
  exportedAt?: string,
): CurrentLibraryExportDocument {
  return exportLibraryDocument(db, selectedContentKeys, exportedAt);
}

export function planLibraryImport(
  db: DatabaseContext,
  document: unknown,
  choices: ContentImportChoices = Object.freeze({}),
): PortableImportPlan {
  validateLibraryDocument(document);
  return portableImportPlan(
    planContentImport(
      db,
      libraryContentImportNodes(db, document),
      choices,
      Object.freeze([]),
      libraryImportOperationIdentity(document),
    ),
    { content: document.content, supersessions: document.supersessions ?? [] },
  );
}

export function commitLibraryImport(
  db: DatabaseContext,
  document: unknown,
  token: ContentImportPlanToken,
  choices: ContentImportChoices = Object.freeze({}),
  planner: ContentImportPlanner = planContentImport,
): ContentImportCommitResult {
  validateLibraryDocument(document);
  const nodes = libraryContentImportNodes(db, document);
  const operationIdentity = libraryImportOperationIdentity(document);
  const plan = planner(
    db,
    nodes,
    choices,
    Object.freeze([]),
    operationIdentity,
  );
  const targets = new Map<string, ContentKey>();
  const lifecycleTargets = new Map<string, ContentKey>();
  for (const [index, node] of nodes.entries()) {
    const entry = document.content[index];
    const outcome = plan.outcomes.find((candidate) => candidate.id === node.id);
    if (
      entry !== undefined && outcome !== undefined &&
      outcome.kind !== 'refused' && (
        outcome.kind !== 'review' || plan.reviews.some(
          (review) => review.id === outcome.id && review.selectedChoice !== null,
        )
      )
    ) {
      const marker = `${entry.kind}\u0000${entry.content_key}`;
      targets.set(marker, outcome.contentKey);
      if (outcome.kind === 'create') {
        lifecycleTargets.set(marker, outcome.contentKey);
      }
    }
  }
  return commitContentImport(db, {
    nodes,
    token,
    choices,
    operationIdentity,
    precommitPlan: plan,
    planner,
    afterInstall: (transaction) => {
      restorePortableContentSupersessions(
        transaction,
        { content: document.content, supersessions: document.supersessions ?? [] },
        targets,
      );
      restorePortableContentLifecycle(transaction, document, lifecycleTargets);
    },
  });
}

/** Convenience seam for non-reviewing callers and exact/fresh imports. */
export function importLibraryDocument(
  db: DatabaseContext,
  document: unknown,
): LibraryImportResult {
  validateLibraryDocument(document);
  const plan = planLibraryImport(db, document);
  if (plan.reviews.length > 0) {
    throw new BackupValidationError(
      'Library import requires adoption review; use planLibraryImport and commitLibraryImport.',
    );
  }
  const result = commitLibraryImport(db, document, plan.token);
  if (result.kind !== 'committed') {
    throw new BackupValidationError(`Library import was ${result.kind}.`);
  }
  return Object.freeze({
    outcomes: result.outcomes,
    lifecycleWasRecorded: document.version === 3,
  });
}
