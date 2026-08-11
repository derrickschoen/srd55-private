import {
  AUTHORING_RPC,
  type ContentUsagesParams,
  type CommitReplacementParams,
  type CommitReplacementSetParams,
  type CommitArchiveSetParams,
  type ContentLifecycleParams,
  type CreateDraftParams,
  type DiscardDraftParams,
  type CommitPublishParams,
  type InstallBundledHomebrewParams,
  type PreviewPublishParams,
  type PreviewReplacementParams,
  type PreviewReplacementSetParams,
  type PermanentPurgeParams,
  type ReadDraftParams,
  type SaveDraftParams,
} from '../../authoring/client';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../authoring/bundled-homebrew-installer';
import {
  CatalogAuthoringService,
  AuthoringServiceError,
} from '../../authoring/draft-service';
import {
  ArchiveSetLifecycleError,
  HomebrewArchiveSetService,
} from '../../authoring/archive-set-lifecycle';
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

function isPreviewPublishParams(value: unknown): value is PreviewPublishParams {
  return isRecord(value) &&
    hasExactKeys(value, ['draft_uuid', 'expected_revision']) &&
    isDraftUuid(value.draft_uuid) &&
    isDraftRevision(value.expected_revision);
}

function isPublishDecision(value: unknown): boolean {
  if (!isRecord(value) || !isBoundedKey(value.candidate_content_key)) return false;
  if (value.decision === 'match') {
    return hasExactKeys(value, ['candidate_content_key', 'decision']);
  }
  return value.decision === 'clone' &&
    hasExactKeys(value, ['candidate_content_key', 'decision', 'clone_name']) &&
    typeof value.clone_name === 'string' && value.clone_name.trim() !== '' &&
    [...value.clone_name].length <= AUTHORING_TEXT_LIMITS.name;
}

function isCommitPublishParams(value: unknown): value is CommitPublishParams {
  return isRecord(value) &&
    hasExactKeys(value, ['token', 'decisions']) &&
    typeof value.token === 'string' && value.token.length > 0 &&
    Array.isArray(value.decisions) && value.decisions.every(isPublishDecision);
}

function isInstallBundledHomebrewParams(
  value: unknown,
): value is InstallBundledHomebrewParams {
  return isRecord(value) && hasExactKeys(value, ['token']) &&
    typeof value.token === 'string' && value.token.length > 0;
}

function isCharacterId(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isPreviewReplacementParams(value: unknown): value is PreviewReplacementParams {
  return isRecord(value) &&
    hasExactKeys(value, ['old_content_key', 'new_content_key', 'character_id']) &&
    isBoundedKey(value.old_content_key) &&
    isBoundedKey(value.new_content_key) &&
    isCharacterId(value.character_id);
}

function isReplacementDecision(value: unknown): boolean {
  return isPublishDecision(value);
}

function isReplacementChoice(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, ['path', 'value']) &&
    Array.isArray(value.path) &&
    value.path.every((part) => typeof part === 'string' || Number.isSafeInteger(part)) &&
    typeof value.value === 'string';
}

function isCommitReplacementParams(value: unknown): value is CommitReplacementParams {
  return isRecord(value) &&
    hasExactKeys(value, ['token', 'decisions', 'choices']) &&
    typeof value.token === 'string' && value.token.length > 0 &&
    Array.isArray(value.decisions) && value.decisions.every(isReplacementDecision) &&
    Array.isArray(value.choices) && value.choices.every(isReplacementChoice);
}

function isPreviewReplacementSetParams(
  value: unknown,
): value is PreviewReplacementSetParams {
  return isRecord(value) &&
    hasExactKeys(value, ['old_content_key', 'new_content_key']) &&
    isBoundedKey(value.old_content_key) && isBoundedKey(value.new_content_key);
}

function isCommitReplacementSetParams(
  value: unknown,
): value is CommitReplacementSetParams {
  return isRecord(value) &&
    hasExactKeys(value, ['old_content_key', 'new_content_key', 'replacements']) &&
    isBoundedKey(value.old_content_key) && isBoundedKey(value.new_content_key) &&
    Array.isArray(value.replacements) &&
    value.replacements.every(isCommitReplacementParams);
}

function isContentLifecycleParams(value: unknown): value is ContentLifecycleParams {
  return isRecord(value) && hasExactKeys(value, ['content_key']) &&
    isBoundedKey(value.content_key);
}

function isCommitArchiveSetParams(value: unknown): value is CommitArchiveSetParams {
  return isRecord(value) && hasExactKeys(value, ['token']) &&
    typeof value.token === 'string' && value.token.length > 0;
}

function isPermanentPurgeParams(value: unknown): value is PermanentPurgeParams {
  return isRecord(value) &&
    hasExactKeys(value, ['content_kind', 'content_key']) &&
    (value.content_kind === 'species' || value.content_kind === 'background' ||
      value.content_kind === 'subclass') &&
    isBoundedKey(value.content_key);
}

function authoringError(error: unknown): never {
  if (error instanceof AuthoringServiceError || error instanceof ArchiveSetLifecycleError) {
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
    AUTHORING_RPC.previewBundledHomebrew,
    isEmptyParams,
    ({ db }) => planBundledHomebrewInstall(db),
  ),
  defineRpcHandler(
    AUTHORING_RPC.installBundledHomebrew,
    isInstallBundledHomebrewParams,
    ({ db }, params) => commitBundledHomebrewInstall(db, params.token),
  ),
  defineRpcHandler(
    AUTHORING_RPC.list,
    isEmptyParams,
    ({ db }) => new CatalogAuthoringService(db).list(),
  ),
  defineRpcHandler(
    AUTHORING_RPC.backgroundReferences,
    isEmptyParams,
    ({ db }) => new CatalogAuthoringService(db).backgroundReferences(),
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
    AUTHORING_RPC.previewPublish,
    isPreviewPublishParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).previewPublish(params);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.commitPublish,
    isCommitPublishParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).commitPublish(params);
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
  defineRpcHandler(
    AUTHORING_RPC.previewReplacement,
    isPreviewReplacementParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).previewReplacement(params);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.commitReplacement,
    isCommitReplacementParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).commitReplacement(params);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.previewReplacementSet,
    isPreviewReplacementSetParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).previewReplacementSet(params);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.commitReplacementSet,
    isCommitReplacementSetParams,
    ({ db }, params) => {
      try {
        return new CatalogAuthoringService(db).commitReplacementSet(params);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.previewArchiveSet,
    isContentLifecycleParams,
    ({ db }, params) => {
      try {
        return new HomebrewArchiveSetService(db).previewArchive(params.content_key);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.commitArchiveSet,
    isCommitArchiveSetParams,
    ({ db }, params) => {
      try {
        return new HomebrewArchiveSetService(db).commitArchive(params.token);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.listArchivedSets,
    isEmptyParams,
    ({ db }) => new HomebrewArchiveSetService(db).listArchived(),
  ),
  defineRpcHandler(
    AUTHORING_RPC.previewRestoreSet,
    isContentLifecycleParams,
    ({ db }, params) => {
      try {
        return new HomebrewArchiveSetService(db).previewRestore(params.content_key);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.commitRestoreSet,
    isCommitArchiveSetParams,
    ({ db }, params) => {
      try {
        return new HomebrewArchiveSetService(db).commitRestore(params.token);
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
  defineRpcHandler(
    AUTHORING_RPC.purgeArchivedSet,
    isPermanentPurgeParams,
    ({ db }, params) => {
      try {
        return new HomebrewArchiveSetService(db).purgeArchived(
          params.content_kind,
          params.content_key,
        );
      } catch (error) {
        return authoringError(error);
      }
    },
  ),
];
