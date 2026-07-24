import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../backup/character-backup';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
} from '../../backup/database-backup';
import {
  defineRpcHandler,
  isEmptyParams,
  isRecord,
  type RpcHandler,
} from '../handler';

interface ImportDatabaseParams {
  backup: unknown;
}

interface ExportCharacterParams {
  characterId: number;
}

interface ImportCharacterParams {
  document: unknown;
}

function isSingleValueParams(
  params: unknown,
  key: string,
): params is Record<string, unknown> {
  return (
    isRecord(params) &&
    Object.keys(params).length === 1 &&
    Object.hasOwn(params, key)
  );
}

function isImportDatabaseParams(
  params: unknown,
): params is ImportDatabaseParams {
  return isSingleValueParams(params, 'backup');
}

function isExportCharacterParams(
  params: unknown,
): params is ExportCharacterParams {
  return (
    isSingleValueParams(params, 'characterId') &&
    Number.isSafeInteger(params.characterId) &&
    Number(params.characterId) >= 1
  );
}

function isImportCharacterParams(
  params: unknown,
): params is ImportCharacterParams {
  return isSingleValueParams(params, 'document');
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'backup.exportDatabase',
    isEmptyParams,
    (context) => exportDatabaseBackup(context.lifecycle),
  ),
  defineRpcHandler(
    'backup.importDatabase',
    isImportDatabaseParams,
    async (context, params) => {
      await importDatabaseBackup(context.lifecycle, params.backup);
      return { imported: true as const };
    },
  ),
  defineRpcHandler(
    'backup.exportCharacter',
    isExportCharacterParams,
    (context, params) =>
      exportCharacterBackup(context.db, params.characterId),
  ),
  defineRpcHandler(
    'backup.importCharacter',
    isImportCharacterParams,
    (context, params) =>
      importCharacterBackup(context.db, params.document),
  ),
]);
