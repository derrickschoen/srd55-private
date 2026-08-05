import type { CharacterCommandPayload } from '../domain/command-contracts';
import type { StoredCharacterFlavorInverse } from './update-character-flavor';

/** Snapshot bytes are durable implementation state, never a public command. */
export interface StoredCharacterSnapshotInverse {
  readonly type: 'internal_snapshot_restore';
  readonly snapshot: unknown;
}

/** Inert pre-D199 bytes. Kept typed only for direct legacy-row fixtures. */
export interface StoredRestoreSnapshotInverse {
  readonly type: 'restore_snapshot';
  readonly snapshot: unknown;
  readonly integrity: string;
}

export type StoredCommandInverse =
  | CharacterCommandPayload
  | StoredCharacterFlavorInverse
  | StoredCharacterSnapshotInverse;

export interface StoredOperationUndoInverse {
  readonly type: 'internal_operation_undo';
  readonly action: 'undo' | 'redo';
  readonly target_operation_uuid: string;
  readonly command: StoredCommandInverse;
}

export type StoredCharacterInverse =
  | StoredCommandInverse
  | StoredOperationUndoInverse;
