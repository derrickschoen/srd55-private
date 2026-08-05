import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { CharacterCommandIntegrity } from './integrity';
import { rowId } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  RemoveSourceCommand as RemoveSourcePayload,
} from '../domain/command-contracts';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';

export class RemoveSourceCommand {
  readonly actionType = 'remove_source';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | undefined;
  #before: CharacterStateSnapshot | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: RemoveSourcePayload,
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const sourceId = this.db.one(
        `SELECT id
         FROM character_source_instances
         WHERE character_id = ? AND id = ?
           AND source_type IN ('feat', 'species', 'background')
           AND state = 'active'`,
        [characterId, this.payload.source_instance_id],
        rowId,
      );
      if (sourceId === null) {
        throw new TypeError(
          'Removable source does not belong to this character.',
        );
      }

      this.#characterId = characterId;
      this.#before = this.#state.capture(characterId);
      this.db.exec(
        `UPDATE character_source_instances
         SET state = 'tombstoned', updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), sourceId],
      );
      this.#generator.generateForSource(sourceId);
    });
  }

  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (this.#characterId === undefined || this.#before === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'internal_snapshot_restore',
      snapshot: this.#before,
    };
  }
}
