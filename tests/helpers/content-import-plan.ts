import type { ContentImportPlan } from '../../src/catalog/content-adoption';
import type { CatalogImportResult } from '../../src/catalog/catalog-importer';

export function assertContentImportPlan(
  result: CatalogImportResult,
  message: string,
): asserts result is ContentImportPlan {
  if (!('reviews' in result)) {
    throw new Error(message);
  }
}
