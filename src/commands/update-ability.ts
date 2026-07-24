import type { DatabaseContext } from '../db/database';
import type {
  CommandImplementation,
  UpdateAbilityCommand as UpdateAbilityPayload,
} from '../domain/command-contracts';
import { abilities, type Ability } from '../domain/enums';

export type CommandClock = () => string;

const systemClock: CommandClock = () => new Date().toISOString();

function isAbility(value: unknown): value is Ability {
  return (
    typeof value === 'string' &&
    (abilities as readonly string[]).includes(value)
  );
}

export class UpdateAbilityCommand implements CommandImplementation {
  readonly actionType = 'update_ability';

  #previousScore: number | undefined;

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

    const previousScore = this.db.scalar(
      `SELECT "${ability}" FROM characters WHERE id = ?`,
      [characterId],
    );
    if (previousScore === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }

    this.#previousScore = Number(previousScore);
    this.db.exec(
      `UPDATE characters
       SET "${ability}" = ?, updated_at = ?
       WHERE id = ?`,
      [score, this.clock(), characterId],
    );
  }

  inverse(): UpdateAbilityPayload {
    if (this.#previousScore === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }

    return {
      type: 'update_ability',
      ability: this.payload.ability,
      score: this.#previousScore,
    };
  }
}
