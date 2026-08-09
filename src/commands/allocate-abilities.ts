import type { DatabaseContext } from '../db/database';
import type {
  AllocateAbilitiesCommand as AllocateAbilitiesPayload,
  CharacterCommandPayload,
  CommandImplementation,
} from '../domain/command-contracts';
import { abilities } from '../domain/enums';

type CommandClock = () => string;

const systemClock: CommandClock = () => new Date().toISOString();

/**
 * THE GUIDED ABILITIES STEP'S ONE WRITE (plan §3.1, D64).
 *
 * All six base scores AND `ability_allocation_method` land in a single UPDATE:
 * the step is one decision, and no interleaving can observe three allocated
 * scores and three defaulted ones. The method doubles as the allocation
 * signal — NULL means never allocated — so writing them together is what
 * makes the signal truthful.
 *
 * WHAT THIS COMMAND DOES NOT DO: it never runs on an `update_ability` edit.
 * A later hand edit preserves an existing method; only the first deliberate
 * workspace edit of an unallocated character claims the scores as `manual`.
 *
 * ITS INVERSE IS A SNAPSHOT INVERSE — see `prepareInverse` in
 * `character-command-executor.ts`. Root columns are restored only through a
 * snapshot whose projection includes the column, and
 * `ability_allocation_method` joined `CHARACTER_STATE_COLUMNS` at `a7-v8`
 * precisely so undo restores the signal WITH the scores.
 *
 * The payload validator has already proven the method a member and every
 * score a 1–30 integer; the checks here are the same last-line defence
 * `UpdateAbilityCommand` keeps.
 */
export class AllocateAbilitiesCommand implements CommandImplementation {
  readonly actionType = 'allocate_abilities';

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: AllocateAbilitiesPayload,
    private readonly clock: CommandClock = systemClock,
  ) {}

  apply(characterId: number): void {
    const { method, scores } = this.payload;
    for (const ability of abilities) {
      const score = scores[ability];
      if (!Number.isSafeInteger(score) || score < 1 || score > 30) {
        throw new Error('Ability scores must be between 1 and 30.');
      }
    }

    const existing = this.db.scalar(
      'SELECT id FROM characters WHERE id = ?',
      [characterId],
    );
    if (existing === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }

    this.db.exec(
      `UPDATE characters
       SET ${abilities.map((ability) => `"${ability}" = ?`).join(', ')},
           ability_allocation_method = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        ...abilities.map((ability) => scores[ability]),
        method,
        this.clock(),
        characterId,
      ],
    );
  }

  /**
   * Never called by the executor: `prepareInverse` stores a snapshot inverse
   * for this command, and `resolvesInverseAfterApply` is false here. Present
   * because `CommandImplementation` requires it; throwing keeps a future
   * caller from mistaking it for a real inverse.
   */
  inverse(): CharacterCommandPayload {
    throw new Error(
      'allocate_abilities uses a snapshot inverse prepared by the executor.',
    );
  }
}
