import type { RpcClient } from '../rpc/client';
import type { CharacterId, ContentKey } from '../domain/ids';
import {
  type AuthoredContentKind,
  type AuthoringLibrary,
  type BackgroundAuthoringReferences,
  type ContentUsageList,
  type DraftRevision,
  type HomebrewDraft,
  type HomebrewDraftUuid,
  type PublishDecision,
  type PublishPlanToken,
  type PublishPreview,
  type PublishResult,
  type ReplacementChoiceSelection,
  type ReplacementDecision,
  type ReplacementPlan,
  type ReplacementPlanToken,
  type ReplacementResult,
  type StoredHomebrewDraft,
} from './contracts';

export const AUTHORING_RPC = Object.freeze({
  list: 'authoring.list',
  backgroundReferences: 'authoring.backgroundReferences',
  createDraft: 'authoring.createDraft',
  readDraft: 'authoring.readDraft',
  saveDraft: 'authoring.saveDraft',
  discardDraft: 'authoring.discardDraft',
  previewPublish: 'authoring.previewPublish',
  commitPublish: 'authoring.commitPublish',
  usages: 'authoring.usages',
  previewReplacement: 'authoring.previewReplacement',
  commitReplacement: 'authoring.commitReplacement',
} as const);

export type AuthoringRpcMethod =
  (typeof AUTHORING_RPC)[keyof typeof AUTHORING_RPC];

export interface CreateDraftParams {
  readonly content_kind: AuthoredContentKind;
  readonly base_content_key?: ContentKey;
}

export interface ReadDraftParams {
  readonly draft_uuid: HomebrewDraftUuid;
}

export interface SaveDraftParams {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly expected_revision: DraftRevision;
  readonly document: HomebrewDraft;
}

export interface DiscardDraftParams {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly expected_revision: DraftRevision;
}

export interface PreviewPublishParams {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly expected_revision: DraftRevision;
}

export interface CommitPublishParams {
  readonly token: PublishPlanToken;
  readonly decisions: readonly PublishDecision[];
}

export interface ContentUsagesParams {
  readonly content_key: ContentKey;
}

export interface PreviewReplacementParams {
  readonly old_content_key: ContentKey;
  readonly new_content_key: ContentKey;
  readonly character_id: CharacterId;
}

export interface CommitReplacementParams {
  readonly token: ReplacementPlanToken;
  readonly decisions: readonly ReplacementDecision[];
  readonly choices: readonly ReplacementChoiceSelection[];
}

export interface AuthoringClient {
  list(): Promise<AuthoringLibrary>;
  backgroundReferences(): Promise<BackgroundAuthoringReferences>;
  createDraft(params: CreateDraftParams): Promise<StoredHomebrewDraft>;
  readDraft(params: ReadDraftParams): Promise<StoredHomebrewDraft>;
  saveDraft(params: SaveDraftParams): Promise<StoredHomebrewDraft>;
  discardDraft(params: DiscardDraftParams): Promise<void>;
  previewPublish(params: PreviewPublishParams): Promise<PublishPreview>;
  commitPublish(params: CommitPublishParams): Promise<PublishResult>;
  usages(params: ContentUsagesParams): Promise<ContentUsageList>;
  previewReplacement(
    params: PreviewReplacementParams,
  ): Promise<ReplacementPlan>;
  commitReplacement(
    params: CommitReplacementParams,
  ): Promise<ReplacementResult>;
}

export function createAuthoringClient(rpc: RpcClient): AuthoringClient {
  return Object.freeze({
    list: () =>
      rpc.call<Record<string, never>, AuthoringLibrary>(
        AUTHORING_RPC.list,
        {},
      ),
    backgroundReferences: () =>
      rpc.call<Record<string, never>, BackgroundAuthoringReferences>(
        AUTHORING_RPC.backgroundReferences,
        {},
      ),
    createDraft: (params: CreateDraftParams) =>
      rpc.call<CreateDraftParams, StoredHomebrewDraft>(
        AUTHORING_RPC.createDraft,
        params,
      ),
    readDraft: (params: ReadDraftParams) =>
      rpc.call<ReadDraftParams, StoredHomebrewDraft>(
        AUTHORING_RPC.readDraft,
        params,
      ),
    saveDraft: (params: SaveDraftParams) =>
      rpc.call<SaveDraftParams, StoredHomebrewDraft>(
        AUTHORING_RPC.saveDraft,
        params,
      ),
    discardDraft: async (params: DiscardDraftParams) => {
      await rpc.call<DiscardDraftParams, null>(
        AUTHORING_RPC.discardDraft,
        params,
      );
    },
    previewPublish: (params: PreviewPublishParams) =>
      rpc.call<PreviewPublishParams, PublishPreview>(
        AUTHORING_RPC.previewPublish,
        params,
      ),
    commitPublish: (params: CommitPublishParams) =>
      rpc.call<CommitPublishParams, PublishResult>(
        AUTHORING_RPC.commitPublish,
        params,
      ),
    usages: (params: ContentUsagesParams) =>
      rpc.call<ContentUsagesParams, ContentUsageList>(
        AUTHORING_RPC.usages,
        params,
      ),
    previewReplacement: (params: PreviewReplacementParams) =>
      rpc.call<PreviewReplacementParams, ReplacementPlan>(
        AUTHORING_RPC.previewReplacement,
        params,
      ),
    commitReplacement: (params: CommitReplacementParams) =>
      rpc.call<CommitReplacementParams, ReplacementResult>(
        AUTHORING_RPC.commitReplacement,
        params,
      ),
  });
}
