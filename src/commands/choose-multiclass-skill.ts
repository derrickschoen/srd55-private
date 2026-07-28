import type { DatabaseContext } from '../db/database';
import type {
  CharacterCommandPayload,
  ChooseMulticlassSkillCommand as ChooseMulticlassSkillPayload,
} from '../domain/command-contracts';
import { SetSkillProficiencyCommand } from './sheet-inputs';

/**
 * Records one multiclass-entry skill choice.
 *
 * Bard also grants a musical instrument of the player's choice. Per D42 §4,
 * that table-level choice is stated in the UI and deliberately not tracked.
 */
export class ChooseMulticlassSkillCommand {
  readonly actionType = 'choose_multiclass_skill';

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: ChooseMulticlassSkillPayload,
  ) {}

  apply(characterId: number): void {
    new SetSkillProficiencyCommand(this.db, {
      type: 'set_skill_proficiency',
      skill: this.payload.skill,
      proficient: true,
    }).apply(characterId);
  }

  /**
   * The executor prepares a whole-character snapshot inverse before apply, as
   * it does for class/source edits. This value is therefore never stored.
   */
  inverse(): CharacterCommandPayload {
    return this.payload;
  }
}
