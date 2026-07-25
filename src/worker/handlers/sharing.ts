import {
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../sharing/character-share';
import { decodeShareFragment } from '../../sharing/codec';
import {
  defineRpcHandler,
  isRecord,
  type RpcHandler,
} from '../handler';

interface ExportParams {
  readonly characterId: number;
  readonly acknowledgements: boolean;
  readonly loadouts: boolean;
}

interface FragmentParams {
  readonly fragment: string;
}

function isExportParams(params: unknown): params is ExportParams {
  return (
    isRecord(params) &&
    Object.keys(params).length === 3 &&
    Number.isSafeInteger(params.characterId) &&
    Number(params.characterId) >= 1 &&
    typeof params.acknowledgements === 'boolean' &&
    typeof params.loadouts === 'boolean'
  );
}

function isFragmentParams(params: unknown): params is FragmentParams {
  return (
    isRecord(params) &&
    Object.keys(params).length === 1 &&
    typeof params.fragment === 'string'
  );
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'share.exportCharacter',
    isExportParams,
    (context, params) =>
      exportCharacterShare(context.db, params.characterId, {
        acknowledgements: params.acknowledgements,
        loadouts: params.loadouts,
      }),
  ),
  defineRpcHandler(
    'share.preview',
    isFragmentParams,
    async (context, params) =>
      previewCharacterShare(
        context.db,
        await decodeShareFragment(params.fragment),
      ),
  ),
  defineRpcHandler(
    'share.importCharacter',
    isFragmentParams,
    async (context, params) =>
      importCharacterShare(
        context.db,
        await decodeShareFragment(params.fragment),
      ),
  ),
]);

