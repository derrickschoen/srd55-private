import type { RpcClient } from '../rpc/client';
import type {
  CatalogImportCommitResult,
  CatalogImportResult,
} from './catalog-importer';
import type {
  CatalogImportCommitParams,
  CatalogImportParams,
  CatalogImportPlanParams,
} from './catalog-schema';
import type {
  ContentImportChoices,
  ContentImportPlan,
  ContentImportPlanToken,
} from './content-adoption';
import type {
  ContentFingerprintScheme,
  ContentKind,
} from './content-identity';
import type {
  ForkSpellCommitResult,
  ForkSpellImportResult,
} from './spell-fork';

export interface CatalogClient {
  importCatalog(
    documents: readonly string[],
    options?: {
      textDocuments?: readonly string[];
      dryRun?: boolean;
    },
  ): Promise<CatalogImportResult>;
  planImport(
    documents: readonly string[],
    choices: ContentImportChoices,
    options?: { readonly textDocuments?: readonly string[] },
  ): Promise<ContentImportPlan>;
  commitImport(
    documents: readonly string[],
    token: ContentImportPlanToken,
    choices: ContentImportChoices,
    options?: { readonly textDocuments?: readonly string[] },
  ): Promise<CatalogImportCommitResult>;
  forkSpell(
    sourceContentKey: string,
    name?: string,
  ): Promise<ForkSpellImportResult>;
  planForkSpell(
    sourceContentKey: string,
    name: string | undefined,
    choices: ContentImportChoices,
  ): Promise<ContentImportPlan>;
  commitForkSpell(
    sourceContentKey: string,
    name: string | undefined,
    token: ContentImportPlanToken,
    choices: ContentImportChoices,
  ): Promise<ForkSpellCommitResult>;
  listMatchDecisions(): Promise<readonly CatalogMatchDecisionReceipt[]>;
  forgetMatchDecision(input: {
    readonly kind: ContentKind;
    readonly scheme: ContentFingerprintScheme;
    readonly digest: string;
  }): Promise<{ readonly forgotten: boolean }>;
}

export interface CatalogMatchDecisionReceipt {
  readonly kind: ContentKind;
  readonly scheme: ContentFingerprintScheme;
  readonly digest: string;
  readonly decision: 'match' | 'clone';
  readonly targetContentKey: string;
  readonly reviewedAt: string;
}

type CatalogImportOptions = Parameters<CatalogClient['importCatalog']>[1];

export function createCatalogClient(rpc: RpcClient): CatalogClient {
  const client: CatalogClient = {
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
      return rpc.call<CatalogImportParams, CatalogImportResult>(
        'catalog.import',
        params,
      );
    },
    planImport: (documents, choices, options = {}) => {
      const params: CatalogImportPlanParams = {
        documents: [...documents],
        choices,
        ...(options.textDocuments === undefined
          ? {}
          : { textDocuments: [...options.textDocuments] }),
      };
      return rpc.call<CatalogImportPlanParams, ContentImportPlan>(
        'catalog.planImport',
        params,
      );
    },
    commitImport: (documents, token, choices, options = {}) => {
      const params: CatalogImportCommitParams = {
        documents: [...documents],
        token,
        choices,
        ...(options.textDocuments === undefined
          ? {}
          : { textDocuments: [...options.textDocuments] }),
      };
      return rpc.call<CatalogImportCommitParams, CatalogImportCommitResult>(
        'catalog.commitImport',
        params,
      );
    },
    forkSpell: (sourceContentKey: string, name?: string) =>
      rpc.call<
        { sourceContentKey: string; name?: string },
        ForkSpellImportResult
      >(
        'catalog.forkSpell',
        name === undefined ? { sourceContentKey } : { sourceContentKey, name },
      ),
    planForkSpell: (sourceContentKey, name, choices) => rpc.call<
      {
        sourceContentKey: string;
        name?: string;
        choices: ContentImportChoices;
      },
      ContentImportPlan
    >('catalog.planForkSpell', {
      sourceContentKey,
      choices,
      ...(name === undefined ? {} : { name }),
    }),
    commitForkSpell: (sourceContentKey, name, token, choices) => rpc.call<
      {
        sourceContentKey: string;
        name?: string;
        token: ContentImportPlanToken;
        choices: ContentImportChoices;
      },
      ForkSpellCommitResult
    >('catalog.commitForkSpell', {
      sourceContentKey,
      token,
      choices,
      ...(name === undefined ? {} : { name }),
    }),
    listMatchDecisions: () => rpc.call<
      Record<string, never>,
      readonly CatalogMatchDecisionReceipt[]
    >('catalog.matchDecisions', {}),
    forgetMatchDecision: (input) => rpc.call<
      typeof input,
      { readonly forgotten: boolean }
    >('catalog.forgetMatchDecision', input),
  };
  return Object.freeze(client);
}
