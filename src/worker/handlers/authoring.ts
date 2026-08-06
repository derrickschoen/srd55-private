import {
  AUTHORING_RPC,
  type ContentUsagesParams,
  type CreateDraftParams,
  type DiscardDraftParams,
  type ReadDraftParams,
  type SaveDraftParams,
} from '../../authoring/client';
import {
  CatalogAuthoringService,
  AuthoringServiceError,
} from '../../authoring/draft-service';
import type { HomebrewDraft } from '../../authoring/contracts';
import { AUTHORING_TEXT_LIMITS } from '../../authoring/limits';
import type { JsonValue } from '../../domain/models';
import { RpcError } from '../../rpc/protocol';
import {
  defineRpcHandler,
  isEmptyParams,
  isRecord,
  type RpcHandler,
} from '../handler';

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isAuthoredKind(value: unknown): value is CreateDraftParams['content_kind'] {
  return value === 'species' || value === 'subclass' || value === 'background';
}

function isBoundedKey(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    [...value].length <= AUTHORING_TEXT_LIMITS.contentKey;
}

function isDraftUuid(value: unknown): value is ReadDraftParams['draft_uuid'] {
  return typeof value === 'string' && value.length > 0;
}

function isDraftRevision(value: unknown): value is SaveDraftParams['expected_revision'] {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isCreateDraftParams(value: unknown): value is CreateDraftParams {
  if (!isRecord(value) || !isAuthoredKind(value.content_kind)) return false;
  if (hasExactKeys(value, ['content_kind'])) return true;
  return hasExactKeys(value, ['content_kind', 'base_content_key']) &&
    isBoundedKey(value.base_content_key);
}

function isReadDraftParams(value: unknown): value is ReadDraftParams {
  return isRecord(value) &&
    hasExactKeys(value, ['draft_uuid']) &&
    isDraftUuid(value.draft_uuid);
}

function isSaveDraftParams(value: unknown): value is SaveDraftParams {
  return isRecord(value) &&
    hasExactKeys(value, ['draft_uuid', 'expected_revision', 'document']) &&
    isDraftUuid(value.draft_uuid) &&
    isDraftRevision(value.expected_revision) &&
    isRecord(value.document);
}

function isDiscardDraftParams(value: unknown): value is DiscardDraftParams {
  return isRecord(value) &&
    hasExactKeys(value, ['draft_uuid', 'expected_revision']) &&
    isDraftUuid(value.draft_uuid) &&
    isDraftRevision(value.expected_revision);
}

function isContentUsagesParams(value: unknown): value is ContentUsagesParams {
  return isRecord(value) &&
    hasExactKeys(value, ['content_key']) &&
    isBoundedKey(value.content_key);
}

function authoringError(error: unknown): never {
  if (error instanceof AuthoringServiceError) {
    throw new RpcError(
      'handler_error',
      error.message,
      error.data as unknown as JsonValue,
    );
  }
  throw error;
}

export const handlers: readonly RpcHandler[] = [
  defineRpcHandler(
    AUTHORING_RPC.list,
    isEmptyParams,
    ({ db }) => new CatalogAuthoringService(db).list(),
  ),
  defineRpcHandler(
    AUTHORING_RPC.createDraft,
    isCreateDraftParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).createDraft(params);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.readDraft,
    isReadDraftParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).readDraft(params.draft_uuid);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.saveDraft,
    isSaveDraftParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).saveDraft({
          ...params,
          document: params.document as HomebrewDraft,
        });
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.discardDraft,
    isDiscardDraftParams,
    ({ db }, params) => {
      try {
        new CatalogAuthoringService(db).discardDraft(
          params.draft_uuid,
          params.expected_revision,
        );
        return null;
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.usages,
    isContentUsagesParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).usages(params.content_key);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
];
