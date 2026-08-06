import {
  exportCharacterBackup,
  commitCharacterBackupImport,
  planCharacterBackupImport,
} from '../../backup/character-backup';
import { isContentImportChoices } from '../../catalog/catalog-schema';
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

function isPlanCharacterParams(params: unknown): params is {
  readonly document: unknown;
  readonly choices: import('../../catalog/content-adoption').ContentImportChoices;
} {
  return isRecord(params) && Object.keys(params).every((key) =>
    ['document', 'choices'].includes(key)) && Object.hasOwn(params, 'document') &&
    isContentImportChoices(params.choices);
}

function isCommitCharacterParams(params: unknown): params is {
  readonly document: unknown;
  readonly token: import('../../catalog/content-adoption').ContentImportPlanToken;
  readonly choices: import('../../catalog/content-adoption').ContentImportChoices;
} {
  return isRecord(params) && Object.keys(params).every((key) =>
    ['document', 'token', 'choices'].includes(key)) &&
    Object.hasOwn(params, 'document') && Object.hasOwn(params, 'token') &&
    isContentImportChoices(params.choices) &&
    typeof params.token === 'string' && /^[0-9a-f]{64}$/u.test(params.token);
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
    'backup.planCharacterImport',
    isPlanCharacterParams,
    (context, params) =>
      planCharacterBackupImport(context.db, params.document, params.choices),
  ),
  defineRpcHandler(
    'backup.commitCharacterImport',
    isCommitCharacterParams,
    (context, params) => commitCharacterBackupImport(
      context.db,
      params.document,
      params.token,
      params.choices,
    ),
  ),
]);
