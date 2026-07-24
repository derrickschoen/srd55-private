import type { RpcClient } from '../rpc/client';
import type { CatalogImportSummary } from './catalog-importer';
import type { CatalogImportParams } from './catalog-schema';

export interface CatalogClient {
  importCatalog(
    documents: readonly string[],
    options?: {
      textDocuments?: readonly string[];
      dryRun?: boolean;
    },
  ): Promise<CatalogImportSummary>;
}

type CatalogImportOptions = Parameters<CatalogClient['importCatalog']>[1];

export function createCatalogClient(rpc: RpcClient): CatalogClient {
  return Object.freeze({
    importCatalog: (
      documents: readonly string[],
      options: CatalogImportOptions = {},
    ) => {
      const params: CatalogImportParams = {
        documents: [...documents],
        ...(options.textDocuments === undefined
          ? {}
          : { textDocuments: [...options.textDocuments] }),
        ...(options.dryRun === undefined
          ? {}
          : { dryRun: options.dryRun }),
      };
      return rpc.call<CatalogImportParams, CatalogImportSummary>(
        'catalog.import',
        params,
      );
    },
  });
}
