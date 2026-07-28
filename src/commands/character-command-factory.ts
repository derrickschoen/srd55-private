import type { DatabaseContext } from '../db/database';
import type {
  CharacterCommandPayload,
} from '../domain/command-contracts';
import { AcknowledgeWarningCommand } from './acknowledge-warning';
import { AddSourceCommand } from './add-source';
import type { CharacterCommandIntegrity } from './integrity';
import {
  CharacterCommandPayloadValidator,
} from './payload-validator';
import { RemoveSourceCommand } from './remove-source';
import { RestoreSnapshotCommand } from './restore-snapshot';
import { ClearSlotCommand } from './set-slot/clear';
import { KeepOverrideSlotCommand } from './set-slot/keep-override';
import { RestoreSlotCommand } from './set-slot/restore';
import { SelectSlotCommand } from './set-slot/select';
import { UpdateAbilityCommand } from './update-ability';
import { UpdateCharacterRulesCommand } from './update-character-rules';
import { ChooseMulticlassSkillCommand } from './choose-multiclass-skill';
import { UpdateClassCommand } from './update-class';
import { UpdateSourceConfigCommand } from './update-source-config';
import {
  SetArmorClassAdjustmentCommand,
  SetArmorCommand,
  SetHitPointRollCommand,
  SetSkillProficiencyCommand,
} from './sheet-inputs';
import {
  AddWeaponCommand,
  RemoveWeaponCommand,
  SetWeaponMasteryCommand,
  UpdateWeaponCommand,
} from './weapons';

export interface ConstructedCharacterCommand {
  readonly actionType: string;
  apply(characterId: number): void | Promise<void>;
  inverse(): CharacterCommandPayload | Promise<CharacterCommandPayload>;
  /**
   * Opt-in marker: this command's inverse is only knowable AFTER `apply()`, so
   * the executor stores `inverse()` rather than what `prepareInverse` built.
   *
   * Optional and absent on every pre-existing command, whose `inverse()` is
   * async and unused. See `ResolvesInverseAfterApply` in `./weapons.ts`.
   */
  readonly invertsAfterApply?: true;
}

function requiresIntegrity(payload: CharacterCommandPayload): boolean {
  return (
    (payload.type === 'set_slot' && payload.mode === 'restore') ||
    (payload.type === 'acknowledge_warning' &&
      payload.mode === 'delete') ||
    payload.type === 'restore_snapshot'
  );
}

export class CharacterCommandFactory {
  constructor(
    private readonly db: DatabaseContext,
    private readonly integrity: CharacterCommandIntegrity,
    private readonly validator = new CharacterCommandPayloadValidator(),
  ) {}

  async make(
    characterId: number,
    input: unknown,
  ): Promise<ConstructedCharacterCommand> {
    const payload = this.validator.validate(input);
    if (requiresIntegrity(payload)) {
      await this.integrity.assertValid(characterId, payload);
    }

    switch (payload.type) {
      case 'update_ability':
        return new UpdateAbilityCommand(this.db, payload);
      case 'set_slot':
        switch (payload.mode) {
          case 'select':
            return new SelectSlotCommand(
              this.db,
              payload,
              this.integrity,
            );
          case 'clear':
            return new ClearSlotCommand(
              this.db,
              payload,
              this.integrity,
            );
          case 'keep_override':
            return new KeepOverrideSlotCommand(
              this.db,
              payload,
              this.integrity,
            );
          case 'restore':
            return new RestoreSlotCommand(
              this.db,
              payload,
              this.integrity,
            );
        }
      case 'update_character_rules':
        return new UpdateCharacterRulesCommand(this.db, payload);
      case 'update_source_config':
        return new UpdateSourceConfigCommand(
          this.db,
          payload,
          this.integrity,
        );
      case 'add_source':
        return new AddSourceCommand(this.db, payload, this.integrity);
      case 'remove_source':
        return new RemoveSourceCommand(
          this.db,
          payload,
          this.integrity,
        );
      case 'acknowledge_warning':
        return new AcknowledgeWarningCommand(
          this.db,
          payload,
          this.integrity,
        );
      case 'update_class':
        return new UpdateClassCommand(this.db, payload, this.integrity);
      case 'add_weapon':
        return new AddWeaponCommand(this.db, payload);
      case 'update_weapon':
        return new UpdateWeaponCommand(this.db, payload);
      case 'remove_weapon':
        return new RemoveWeaponCommand(this.db, payload);
      case 'set_weapon_mastery':
        return new SetWeaponMasteryCommand(this.db, payload);
      case 'set_armor':
        return new SetArmorCommand(this.db, payload);
      case 'set_hit_point_roll':
        return new SetHitPointRollCommand(this.db, payload);
      case 'set_skill_proficiency':
        return new SetSkillProficiencyCommand(this.db, payload);
      case 'choose_multiclass_skill':
        return new ChooseMulticlassSkillCommand(this.db, payload);
      case 'set_armor_class_adjustment':
        return new SetArmorClassAdjustmentCommand(this.db, payload);
      case 'restore_snapshot':
        return new RestoreSnapshotCommand(
          this.db,
          payload,
          this.integrity,
        );
    }
  }
}
