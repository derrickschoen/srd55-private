import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { CharacterCommandIntegrity } from './integrity';
import { sqlInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  RemoveSourceCommand as RemoveSourcePayload,
} from '../domain/command-contracts';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import { deleteSourceTreeEffects } from '../rules/source-effect-retcon';

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
      const source = this.db.one(
        `SELECT id, source_type
         FROM character_source_instances
         WHERE character_id = ? AND id = ?
           AND source_type IN ('feat', 'species', 'background')
           AND state = 'active'`,
        [characterId, this.payload.source_instance_id],
        (row) => ({
          id: sqlInteger(row, 'id'),
          type: sqlString(row, 'source_type'),
        }),
      );
      if (source === null) {
        throw new TypeError(
          'Removable source does not belong to this character.',
        );
      }
      const sourceId = source.id;

      this.#characterId = characterId;
      this.#before = this.#state.capture(characterId);
      this.db.exec(
        `UPDATE character_source_instances
         SET state = 'tombstoned', updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), sourceId],
      );
      this.#generator.generateForSource(sourceId);
      // Removed feat effects remain archival share data, but the active-source
      // eligibility guard makes them mechanically inert. Species and
      // backgrounds are origin retcons: their entire effect trees must cease
      // to exist in the same transaction as the tombstone.
      if (source.type !== 'feat') {
        deleteSourceTreeEffects(this.db, sourceId);
      }
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
