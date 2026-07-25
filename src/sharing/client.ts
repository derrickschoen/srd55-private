import type { RpcClient } from '../rpc/client';
import type {
  ShareExportOptions,
  ShareImportResult,
  SharePreview,
} from './character-share';
import { encodeShareFragment } from './codec';
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
  preview(fragment: string): Promise<SharePreview>;
  importCharacter(fragment: string): Promise<ShareImportResult>;
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
      },
      CharacterShareDocument
    >('share.exportCharacter', {
      characterId,
      acknowledgements: options.acknowledgements === true,
      loadouts: options.loadouts === true,
    });
  return Object.freeze({
    exportDebug,
    createFragment: async (
      characterId: number,
      options: ShareExportOptions = {},
    ) => encodeShareFragment(await exportDebug(characterId, options)),
    preview: (fragment: string) =>
      rpc.call<{ fragment: string }, SharePreview>('share.preview', {
        fragment,
      }),
    importCharacter: (fragment: string) =>
      rpc.call<{ fragment: string }, ShareImportResult>(
        'share.importCharacter',
        { fragment },
      ),
  });
}

