import type { RpcClient } from '../rpc/client';
import type { ContentImportPlanToken } from '../catalog/content-adoption';
import type {
  BundledHomebrewInstallPlan,
  BundledHomebrewInstallResult,
} from './bundled-homebrew-installer';
import type { CharacterId, ContentKey } from '../domain/ids';
import {
  type AuthoredContentKind,
  type ArchivedHomebrewSet,
  type ArchiveSetPlan,
  type ArchiveSetResult,
  type AuthoringLibrary,
  type BackgroundAuthoringReferences,
  type SpellGrantAuthoringReferences,
  type ContentUsageList,
  type DraftRevision,
  type HomebrewDraft,
  type HomebrewDraftUuid,
  type PublishDecision,
  type PublishPlanToken,
  type PublishPreview,
  type PublishResult,
  type PermanentPurgeResult,
  type ReplacementChoiceSelection,
  type ReplacementDecision,
  type ReplacementPlan,
  type ReplacementPlanToken,
  type ReplacementResult,
  type ReplacementSetCommit,
  type ReplacementSetPlan,
  type ReplacementSetResult,
  type StoredHomebrewDraft,
} from './contracts';

export const AUTHORING_RPC = Object.freeze({
  list: 'authoring.list',
  backgroundReferences: 'authoring.backgroundReferences',
  spellGrantReferences: 'authoring.spellGrantReferences',
  createDraft: 'authoring.createDraft',
  readDraft: 'authoring.readDraft',
  saveDraft: 'authoring.saveDraft',
  discardDraft: 'authoring.discardDraft',
  previewPublish: 'authoring.previewPublish',
  commitPublish: 'authoring.commitPublish',
  usages: 'authoring.usages',
  previewReplacement: 'authoring.previewReplacement',
  commitReplacement: 'authoring.commitReplacement',
  previewReplacementSet: 'authoring.previewReplacementSet',
  commitReplacementSet: 'authoring.commitReplacementSet',
  previewArchiveSet: 'authoring.previewArchiveSet',
  commitArchiveSet: 'authoring.commitArchiveSet',
  listArchivedSets: 'authoring.listArchivedSets',
  previewRestoreSet: 'authoring.previewRestoreSet',
  commitRestoreSet: 'authoring.commitRestoreSet',
  purgeArchivedSet: 'authoring.purgeArchivedSet',
  previewBundledHomebrew: 'authoring.previewBundledHomebrew',
  installBundledHomebrew: 'authoring.installBundledHomebrew',
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

export interface InstallBundledHomebrewParams {
  readonly token: ContentImportPlanToken;
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

export interface PreviewReplacementSetParams {
  readonly old_content_key: ContentKey;
  readonly new_content_key: ContentKey;
}

export interface CommitReplacementSetParams extends PreviewReplacementSetParams {
  readonly replacements: readonly ReplacementSetCommit[];
}

export interface ContentLifecycleParams {
  readonly content_key: ContentKey;
}

export interface CommitArchiveSetParams {
  readonly token: ArchiveSetPlan['token'];
}

export interface PermanentPurgeParams {
  readonly content_kind: AuthoredContentKind;
  readonly content_key: ContentKey;
}

export interface AuthoringClient {
  list(): Promise<AuthoringLibrary>;
  backgroundReferences(): Promise<BackgroundAuthoringReferences>;
  spellGrantReferences(): Promise<SpellGrantAuthoringReferences>;
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
  previewReplacementSet(
    params: PreviewReplacementSetParams,
  ): Promise<ReplacementSetPlan>;
  commitReplacementSet(
    params: CommitReplacementSetParams,
  ): Promise<ReplacementSetResult>;
  previewArchiveSet(params: ContentLifecycleParams): Promise<ArchiveSetPlan>;
  commitArchiveSet(params: CommitArchiveSetParams): Promise<ArchiveSetResult>;
  listArchivedSets(): Promise<readonly ArchivedHomebrewSet[]>;
  previewRestoreSet(params: ContentLifecycleParams): Promise<ArchiveSetPlan>;
  commitRestoreSet(params: CommitArchiveSetParams): Promise<ArchiveSetResult>;
  purgeArchivedSet(params: PermanentPurgeParams): Promise<PermanentPurgeResult>;
}

export interface BundledHomebrewClient {
  previewBundledHomebrew(): Promise<BundledHomebrewInstallPlan>;
  installBundledHomebrew(
    params: InstallBundledHomebrewParams,
  ): Promise<BundledHomebrewInstallResult>;
}

export function createAuthoringClient(
  rpc: RpcClient,
): AuthoringClient & BundledHomebrewClient {
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
    spellGrantReferences: () =>
      rpc.call<Record<string, never>, SpellGrantAuthoringReferences>(
        AUTHORING_RPC.spellGrantReferences,
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
    previewBundledHomebrew: () =>
      rpc.call<Record<string, never>, BundledHomebrewInstallPlan>(
        AUTHORING_RPC.previewBundledHomebrew,
        {},
      ),
    installBundledHomebrew: (params: InstallBundledHomebrewParams) =>
      rpc.call<InstallBundledHomebrewParams, BundledHomebrewInstallResult>(
        AUTHORING_RPC.installBundledHomebrew,
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
    previewReplacementSet: (params: PreviewReplacementSetParams) =>
      rpc.call<PreviewReplacementSetParams, ReplacementSetPlan>(
        AUTHORING_RPC.previewReplacementSet,
        params,
      ),
    commitReplacementSet: (params: CommitReplacementSetParams) =>
      rpc.call<CommitReplacementSetParams, ReplacementSetResult>(
        AUTHORING_RPC.commitReplacementSet,
        params,
      ),
    previewArchiveSet: (params: ContentLifecycleParams) =>
      rpc.call<ContentLifecycleParams, ArchiveSetPlan>(
        AUTHORING_RPC.previewArchiveSet,
        params,
      ),
    commitArchiveSet: (params: CommitArchiveSetParams) =>
      rpc.call<CommitArchiveSetParams, ArchiveSetResult>(
        AUTHORING_RPC.commitArchiveSet,
        params,
      ),
    listArchivedSets: () =>
      rpc.call<Record<string, never>, readonly ArchivedHomebrewSet[]>(
        AUTHORING_RPC.listArchivedSets,
        {},
      ),
    previewRestoreSet: (params: ContentLifecycleParams) =>
      rpc.call<ContentLifecycleParams, ArchiveSetPlan>(
        AUTHORING_RPC.previewRestoreSet,
        params,
      ),
    commitRestoreSet: (params: CommitArchiveSetParams) =>
      rpc.call<CommitArchiveSetParams, ArchiveSetResult>(
        AUTHORING_RPC.commitRestoreSet,
        params,
      ),
    purgeArchivedSet: (params: PermanentPurgeParams) =>
      rpc.call<PermanentPurgeParams, PermanentPurgeResult>(
        AUTHORING_RPC.purgeArchivedSet,
        params,
      ),
  });
}
