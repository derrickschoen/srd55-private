import type { RpcClient } from '../rpc/client';
import type {
  CharacterBackupDocument,
  CharacterImportResult,
} from './character-backup';
import type { DatabaseBackup } from './database-backup';

export interface BackupClient {
  exportDatabase(): Promise<DatabaseBackup>;
  importDatabase(backup: DatabaseBackup): Promise<{ imported: true }>;
  exportCharacter(characterId: number): Promise<CharacterBackupDocument>;
  importCharacter(
    document: CharacterBackupDocument,
  ): Promise<CharacterImportResult>;
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
    importCharacter: (document: CharacterBackupDocument) =>
      rpc.call<{ document: CharacterBackupDocument }, CharacterImportResult>(
        'backup.importCharacter',
        { document },
      ),
  });
}
