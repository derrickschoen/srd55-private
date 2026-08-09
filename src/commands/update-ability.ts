import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import { sqlInteger, sqlNullableString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  UpdateAbilityCommand as UpdateAbilityPayload,
} from '../domain/command-contracts';
import { abilities, type Ability } from '../domain/enums';
import type { StoredCommandInverse } from './stored-inverses';

export type CommandClock = () => string;

const systemClock: CommandClock = () => new Date().toISOString();

function isAbility(value: unknown): value is Ability {
  return (
    typeof value === 'string' &&
    (abilities as readonly string[]).includes(value)
  );
}

export class UpdateAbilityCommand {
  readonly actionType = 'update_ability';
  readonly invertsAfterApply = true;

  #previousScore: number | undefined;
  #beforeUnclaimedEdit: CharacterStateSnapshot | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateAbilityPayload,
    private readonly clock: CommandClock = systemClock,
  ) {}

  apply(characterId: number): void {
    const { ability, score } = this.payload;
    if (!isAbility(ability)) {
      throw new Error('Unknown ability score.');
    }
    if (!Number.isSafeInteger(score) || score < 1 || score > 30) {
      throw new Error('Ability scores must be between 1 and 30.');
    }

    const previous = this.db.one(
      `SELECT "${ability}" AS score, ability_allocation_method
       FROM characters WHERE id = ?`,
      [characterId],
      (row) => ({
        score: sqlInteger(row, 'score'),
        allocationMethod: sqlNullableString(
          row,
          'ability_allocation_method',
        ),
      }),
    );
    if (previous === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }

    this.#previousScore = previous.score;
    if (previous.allocationMethod === null) {
      // The first workspace edit changes both the score and the B1 ownership
      // signal. Keep their exact shared before-state so undo cannot restore
      // the number while leaving default scores falsely blessed as manual.
      this.#beforeUnclaimedEdit = new CharacterState(this.db).capture(
        characterId,
      );
    }
    this.db.exec(
      `UPDATE characters
       SET "${ability}" = ?,
           ability_allocation_method = COALESCE(
             ability_allocation_method,
             'manual'
           ),
           updated_at = ?
       WHERE id = ?`,
      [score, this.clock(), characterId],
    );
  }

  inverse(): StoredCommandInverse {
    if (this.#previousScore === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    if (this.#beforeUnclaimedEdit !== null) {
      return {
        type: 'internal_snapshot_restore',
        snapshot: this.#beforeUnclaimedEdit,
      };
    }

    return {
      type: 'update_ability',
      ability: this.payload.ability,
      score: this.#previousScore,
    };
  }
}
