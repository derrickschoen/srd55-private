import { CatalogImporter } from '../../catalog/catalog-importer';
import {
  isCatalogImportParams,
  isCatalogImportCommitParams,
  isCatalogImportPlanParams,
  isContentImportChoices,
  isForkSpellParams,
} from '../../catalog/catalog-schema';
import {
  commitSrdSpellFork,
  forkSrdSpell,
  planSrdSpellFork,
} from '../../catalog/spell-fork';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  contentKinds,
  type ContentFingerprintDigest,
} from '../../catalog/content-identity';
import { forgetContentMatchDecision } from '../../catalog/content-registry';
import {
  defineRpcHandler,
  isEmptyParams,
  isRecord,
  type RpcHandler,
} from '../handler';

function isForgetMatchDecisionParams(params: unknown): params is {
  readonly kind: (typeof contentKinds)[number];
  readonly scheme: typeof CONTENT_FINGERPRINT_SCHEME_V1;
  readonly digest: string;
} {
  return isRecord(params) &&
    Object.keys(params).every((key) => ['kind', 'scheme', 'digest'].includes(key)) &&
    typeof params.kind === 'string' &&
    (contentKinds as readonly string[]).includes(params.kind) &&
    params.scheme === CONTENT_FINGERPRINT_SCHEME_V1 &&
    typeof params.digest === 'string' && /^[0-9a-f]{64}$/.test(params.digest);
}

function isForkPlanParams(params: unknown): params is {
  readonly sourceContentKey: string;
  readonly name?: string;
  readonly choices?: import('../../catalog/content-adoption').ContentImportChoices;
} {
  if (!isRecord(params)) return false;
  const base = {
    sourceContentKey: params.sourceContentKey,
    ...(params.name === undefined ? {} : { name: params.name }),
  };
  return isForkSpellParams(base) &&
    Object.keys(params).every((key) =>
      ['sourceContentKey', 'name', 'choices'].includes(key),
    ) &&
    (params.choices === undefined || isContentImportChoices(params.choices));
}

function isForkCommitParams(params: unknown): params is Parameters<
  typeof commitSrdSpellFork
>[1] & {
  readonly token: import('../../catalog/content-adoption').ContentImportPlanToken;
  readonly choices?: import('../../catalog/content-adoption').ContentImportChoices;
} {
  if (!isRecord(params)) return false;
  const base = {
    sourceContentKey: params.sourceContentKey,
    ...(params.name === undefined ? {} : { name: params.name }),
  };
  return isForkSpellParams(base) &&
    Object.keys(params).every((key) =>
      ['sourceContentKey', 'name', 'token', 'choices'].includes(key),
    ) &&
    typeof params.token === 'string' && /^[0-9a-f]{64}$/.test(params.token) &&
    (params.choices === undefined || isContentImportChoices(params.choices));
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'catalog.import',
    isCatalogImportParams,
    (context, params) => new CatalogImporter(context.db).import(params),
  ),
  defineRpcHandler(
    'catalog.planImport',
    isCatalogImportPlanParams,
    (context, params) => new CatalogImporter(context.db).plan(
      params,
      params.choices,
    ),
  ),
  defineRpcHandler(
    'catalog.commitImport',
    isCatalogImportCommitParams,
    (context, params) => new CatalogImporter(context.db).commit(
      params,
      params.token,
      params.choices,
    ),
  ),
  defineRpcHandler(
    'catalog.forkSpell',
    isForkSpellParams,
    (context, params) => forkSrdSpell(context.db, params),
  ),
  defineRpcHandler(
    'catalog.planForkSpell',
    isForkPlanParams,
    (context, params) => planSrdSpellFork(context.db, params, params.choices),
  ),
  defineRpcHandler(
    'catalog.commitForkSpell',
    isForkCommitParams,
    (context, params) => commitSrdSpellFork(
      context.db,
      params,
      params.token,
      params.choices,
    ),
  ),
  defineRpcHandler(
    'catalog.matchDecisions',
    isEmptyParams,
    (context) => context.db.allRaw(
      `SELECT content_kind AS kind,
              incoming_fingerprint_scheme AS scheme,
              incoming_fingerprint_digest AS digest,
              decision, target_content_key AS targetContentKey,
              reviewed_at AS reviewedAt
       FROM catalog_content_match_decisions
       ORDER BY reviewed_at DESC, content_kind, incoming_fingerprint_digest`,
    ),
  ),
  defineRpcHandler(
    'catalog.forgetMatchDecision',
    isForgetMatchDecisionParams,
    (context, params) => ({
      forgotten: forgetContentMatchDecision(context.db, {
        ...params,
        digest: params.digest as ContentFingerprintDigest,
      }),
    }),
  ),
]);
