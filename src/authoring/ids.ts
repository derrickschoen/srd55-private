import type { Brand } from '../domain/ids';

export type HomebrewDraftUuid = Brand<string, 'HomebrewDraftUuid'>;
export type HomebrewDraftItemUuid = Brand<string, 'HomebrewDraftItemUuid'>;
export type PublishPlanToken = Brand<string, 'PublishPlanToken'>;
export type ReplacementPlanToken = Brand<string, 'ReplacementPlanToken'>;
export type ArchiveSetPlanToken = Brand<string, 'ArchiveSetPlanToken'>;
export type DraftRevision = Brand<number, 'DraftRevision'>;
