import type { RpcClient } from '../rpc/client';
import type {
  ShareImportCommitResult,
  ShareExportOptions,
  ShareImportResult,
  SharePreview,
} from './character-share';
import type {
  ContentImportChoices,
  ContentImportPlanToken,
} from '../catalog/content-adoption';
import {
  encodeShareFragment,
  tryEncodeShareFragment,
  type ShareEncodeResult,
} from './codec';
import type { CharacterShareDocument } from './schema';

export interface ShareClient {
  exportDebug(
    characterId: number,
    options?: ShareExportOptions,
  ): Promise<CharacterShareDocument>;
  createFragment(
    characterId: number,
    options?: ShareExportOptions,
  ): Promise<string>;
  createFragmentResult(
    characterId: number,
    options?: ShareExportOptions,
  ): Promise<ShareEncodeResult>;
  preview(
    fragment: string,
    choices?: ContentImportChoices,
  ): Promise<SharePreview>;
  importCharacter(fragment: string): Promise<ShareImportResult>;
  commitCharacter(
    fragment: string,
    token: ContentImportPlanToken,
    choices: ContentImportChoices,
  ): Promise<ShareImportCommitResult>;
}

export function createShareClient(rpc: RpcClient): ShareClient {
  const exportDebug = (
    characterId: number,
    options: ShareExportOptions = {},
  ) =>
    rpc.call<
      {
        characterId: number;
        acknowledgements: boolean;
        loadouts: boolean;
        writtenText: boolean;
      },
      CharacterShareDocument
    >('share.exportCharacter', {
      characterId,
      acknowledgements: options.acknowledgements === true,
      loadouts: options.loadouts === true,
      writtenText: options.writtenText === true,
    });
  return Object.freeze({
    exportDebug,
    createFragment: async (
      characterId: number,
      options: ShareExportOptions = {},
    ) => encodeShareFragment(await exportDebug(characterId, options)),
    createFragmentResult: async (
      characterId: number,
      options: ShareExportOptions = {},
    ) => tryEncodeShareFragment(await exportDebug(characterId, options)),
    preview: (fragment: string, choices = Object.freeze({})) =>
      rpc.call<
        { fragment: string; choices: ContentImportChoices },
        SharePreview
      >('share.preview', { fragment, choices }),
    importCharacter: (fragment: string) =>
      rpc.call<{ fragment: string }, ShareImportResult>(
        'share.importCharacter',
        { fragment },
      ),
    commitCharacter: (
      fragment: string,
      token: ContentImportPlanToken,
      choices: ContentImportChoices,
    ) => rpc.call<
      {
        fragment: string;
        token: ContentImportPlanToken;
        choices: ContentImportChoices;
      },
      ShareImportCommitResult
    >('share.importCharacter', { fragment, token, choices }),
  });
}
