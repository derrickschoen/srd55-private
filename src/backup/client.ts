import type { RpcClient } from '../rpc/client';
import type {
  CharacterBackupDocument,
  CharacterImportCommitResult,
} from './character-backup';
import type { DatabaseBackup } from './database-backup';
import type {
  ContentImportChoices,
  ContentImportPlanToken,
} from '../catalog/content-adoption';
import type { PortableImportPlan } from './portable-content';

export interface BackupClient {
  exportDatabase(): Promise<DatabaseBackup>;
  importDatabase(backup: DatabaseBackup): Promise<{ imported: true }>;
  exportCharacter(characterId: number): Promise<CharacterBackupDocument>;
  planCharacterImport(
    document: CharacterBackupDocument,
    choices: ContentImportChoices,
  ): Promise<PortableImportPlan>;
  commitCharacterImport(
    document: CharacterBackupDocument,
    token: ContentImportPlanToken,
    choices: ContentImportChoices,
  ): Promise<CharacterImportCommitResult>;
}

export function createBackupClient(rpc: RpcClient): BackupClient {
  return Object.freeze({
    exportDatabase: () =>
      rpc.call<Record<string, never>, DatabaseBackup>(
        'backup.exportDatabase',
        {},
      ),
    importDatabase: (backup: DatabaseBackup) =>
      rpc.call<{ backup: DatabaseBackup }, { imported: true }>(
        'backup.importDatabase',
        { backup },
      ),
    exportCharacter: (characterId: number) =>
      rpc.call<{ characterId: number }, CharacterBackupDocument>(
        'backup.exportCharacter',
        { characterId },
      ),
    planCharacterImport: (
      document: CharacterBackupDocument,
      choices: ContentImportChoices,
    ) => rpc.call<
      { document: CharacterBackupDocument; choices: ContentImportChoices },
      PortableImportPlan
    >('backup.planCharacterImport', { document, choices }),
    commitCharacterImport: (
      document: CharacterBackupDocument,
      token: ContentImportPlanToken,
      choices: ContentImportChoices,
    ) => rpc.call<
      {
        document: CharacterBackupDocument;
        token: ContentImportPlanToken;
        choices: ContentImportChoices;
      },
      CharacterImportCommitResult
    >('backup.commitCharacterImport', { document, token, choices }),
  });
}
