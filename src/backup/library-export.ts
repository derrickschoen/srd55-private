import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportCommitResult,
  type ContentImportPlanToken,
} from '../catalog/content-adoption';
import {
  exportLibraryDocument,
  libraryContentImportNodes,
  portableImportPlan,
  validateLibraryDocument,
  type LibraryExportDocument,
  type PortableImportPlan,
} from './portable-content';
import { BackupValidationError } from './backup-version';

export interface LibraryImportResult {
  readonly outcomes: Extract<ContentImportCommitResult, { readonly kind: 'committed' }>['outcomes'];
}

export function exportWholeLibrary(
  db: DatabaseContext,
  exportedAt?: string,
): LibraryExportDocument {
  return exportLibraryDocument(db, undefined, exportedAt);
}

export function exportSelectedLibraryContent(
  db: DatabaseContext,
  selectedContentKeys: readonly ContentKey[],
  exportedAt?: string,
): LibraryExportDocument {
  return exportLibraryDocument(db, selectedContentKeys, exportedAt);
}

export function planLibraryImport(
  db: DatabaseContext,
  document: unknown,
  choices: ContentImportChoices = Object.freeze({}),
): PortableImportPlan {
  validateLibraryDocument(document);
  return portableImportPlan(
    planContentImport(db, libraryContentImportNodes(db, document), choices),
  );
}

export function commitLibraryImport(
  db: DatabaseContext,
  document: unknown,
  token: ContentImportPlanToken,
  choices: ContentImportChoices = Object.freeze({}),
): ContentImportCommitResult {
  validateLibraryDocument(document);
  return commitContentImport(db, {
    nodes: libraryContentImportNodes(db, document),
    token,
    choices,
  });
}

/** Convenience seam for non-reviewing callers and exact/fresh imports. */
export function importLibraryDocument(
  db: DatabaseContext,
  document: unknown,
): LibraryImportResult {
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
  return Object.freeze({ outcomes: result.outcomes });
}
