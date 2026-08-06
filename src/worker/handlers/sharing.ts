import {
  commitCharacterShareImport,
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../sharing/character-share';
import { isContentImportChoices } from '../../catalog/catalog-schema';
import { decodeShareFragment } from '../../sharing/codec';
import type { JsonValue } from '../../domain/models';
import { ShareImportCompatibilityError } from '../../sharing/import-issues';
import { RpcError } from '../../rpc/protocol';
import {
  defineRpcHandler,
  isRecord,
  type RpcHandler,
} from '../handler';

/**
 * Preserve compatibility issues across the RPC boundary.
 *
 * Anything else is passed through untouched so the registry's generic handling
 * still applies — this must not become a catch-all that hides real errors.
 */
function toCompatibilityRpcError(error: unknown): unknown {
  return error instanceof ShareImportCompatibilityError
    ? new RpcError(
        'handler_error',
        error.message,
        error.toData() as unknown as JsonValue,
      )
    : error;
}

interface ExportParams {
  readonly characterId: number;
  readonly acknowledgements: boolean;
  readonly loadouts: boolean;
  readonly writtenText: boolean;
}

interface FragmentParams {
  readonly fragment: string;
  readonly choices?: import('../../catalog/content-adoption').ContentImportChoices;
  readonly token?: import('../../catalog/content-adoption').ContentImportPlanToken;
}

function isExportParams(params: unknown): params is ExportParams {
  return (
    isRecord(params) &&
    Object.keys(params).length === 4 &&
    Number.isSafeInteger(params.characterId) &&
    Number(params.characterId) >= 1 &&
    typeof params.acknowledgements === 'boolean' &&
    typeof params.loadouts === 'boolean' &&
    typeof params.writtenText === 'boolean'
  );
}

function isFragmentParams(params: unknown): params is FragmentParams {
  return (
    isRecord(params) &&
    Object.keys(params).every((key) =>
      ['fragment', 'choices', 'token'].includes(key)) &&
    typeof params.fragment === 'string' &&
    (params.choices === undefined || isContentImportChoices(params.choices)) &&
    (params.token === undefined ||
      typeof params.token === 'string' && /^[0-9a-f]{64}$/u.test(params.token))
  );
}

function isPreviewParams(params: unknown): params is FragmentParams {
  return isFragmentParams(params) && params.token === undefined;
}

function isImportParams(params: unknown): params is FragmentParams {
  return isFragmentParams(params) && (
    params.token === undefined
      ? params.choices === undefined
      : params.choices !== undefined
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
        writtenText: params.writtenText,
      }),
  ),
  defineRpcHandler(
    'share.preview',
    isPreviewParams,
    async (context, params) => {
      const document = await decodeShareFragment(params.fragment);
      try {
        return previewCharacterShare(
          context.db,
          document,
          params.choices ?? Object.freeze({}),
        );
      } catch (error) {
        // Preview runs the real import inside a rollback, so it raises the same
        // compatibility failures. This is the surface that matters most: the
        // user should see every problem BEFORE choosing to add the character.
        throw toCompatibilityRpcError(error);
      }
    },
  ),
  defineRpcHandler(
    'share.importCharacter',
    isImportParams,
    async (context, params) => {
      const document = await decodeShareFragment(params.fragment);
      try {
        return params.token === undefined
          ? importCharacterShare(context.db, document)
          : commitCharacterShareImport(
              context.db,
              document,
              params.token,
              params.choices ?? Object.freeze({}),
            );
      } catch (error) {
        // The generic registry catch keeps only `error.message`, so structured
        // issues would be flattened to one string before reaching the UI.
        // Re-throw as an RpcError whose `data` survives the boundary.
        throw toCompatibilityRpcError(error);
      }
    },
  ),
]);
