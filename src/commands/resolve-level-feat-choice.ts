import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type {
  ResolveLevelFeatChoiceCommand as ResolveLevelFeatChoicePayload,
} from '../domain/command-contracts';
import type { DatabaseContext } from '../db/database';
import { sqlInteger, sqlNullableInteger, sqlString } from '../db/codecs';
import { characterLevel } from '../rules/character-level';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { CharacterCommandIntegrity } from './integrity';
import { applyLevelFeatSelection } from './level-feat-choice';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';

/** Resolve one durable D70 Epic Boon defer state without moving class level. */
export class ResolveLevelFeatChoiceCommand {
  readonly actionType = 'resolve_level_feat_choice';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | null = null;
  #before: CharacterStateSnapshot | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: ResolveLevelFeatChoicePayload,
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    const choice = this.db.one(
      `SELECT clfc.id, clfc.choice_kind, clfc.feat_source_instance_id
       FROM character_level_feat_choices clfc
       WHERE clfc.id = ? AND clfc.character_id = ?`,
      [this.payload.character_level_feat_choice_id, characterId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        choice_kind: sqlString(row, 'choice_kind'),
        feat_source_instance_id: sqlNullableInteger(
          row,
          'feat_source_instance_id',
        ),
      }),
    );
    if (choice === null) {
      throw new TypeError('The level feat choice does not exist.');
    }
    if (choice.choice_kind !== 'epic_boon') {
      throw new TypeError('Only an Epic Boon occurrence can be resolved later.');
    }
    if (choice.feat_source_instance_id !== null) {
      throw new TypeError('This Epic Boon occurrence is already resolved.');
    }
    const totalLevel = characterLevel(this.db, characterId);
    if (totalLevel === null) {
      throw new TypeError('A feat choice requires a held class.');
    }

    this.db.transaction(() => {
      const before = this.#state.capture(characterId);
      const sourceId = applyLevelFeatSelection(this.db, this.#generator, {
        characterId,
        selection: this.payload.feat_choice,
        projectedTotalLevel: totalLevel,
        advancedClassDefinitionId: null,
        targetClassLevel: null,
        targetSubclassContentKey: null,
        requiredGrouping: 'epic_boon',
      });
      this.db.exec(
        `UPDATE character_level_feat_choices
         SET feat_source_instance_id = ?, updated_at = ?
         WHERE id = ? AND character_id = ?`,
        [sourceId, new Date().toISOString(), choice.id, characterId],
      );
      this.#before = before;
      this.#characterId = characterId;
    });
  }

  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'internal_snapshot_restore',
      snapshot: this.#before,
    };
  }
}
