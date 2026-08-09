import type { DatabaseContext } from '../db/database';
import type {
  CharacterCommandPayload,
} from '../domain/command-contracts';
import { AcknowledgeWarningCommand } from './acknowledge-warning';
import { AddSourceCommand } from './add-source';
import { AllocateAbilitiesCommand } from './allocate-abilities';
import type { CharacterCommandIntegrity } from './integrity';
import {
  CharacterCommandPayloadValidator,
} from './payload-validator';
import { RemoveSourceCommand } from './remove-source';
import { ClearSlotCommand } from './set-slot/clear';
import { KeepOverrideSlotCommand } from './set-slot/keep-override';
import { RestoreSlotCommand } from './set-slot/restore';
import { SelectSlotCommand } from './set-slot/select';
import { FillSkillGrantCommand } from './fill-skill-grant';
import { LevelUpClassCommand } from './level-up-class';
import { ResolveLevelFeatChoiceCommand } from './resolve-level-feat-choice';
import { UpdateAbilityCommand } from './update-ability';
import { UpdateCharacterRulesCommand } from './update-character-rules';
import { UpdateCharacterFlavorCommand } from './update-character-flavor';
import { UpdateClassCommand } from './update-class';
import { UpdateSourceConfigCommand } from './update-source-config';
import { ChooseSpeciesLineageCommand } from './choose-species-lineage';
import {
  SetArmorCommand,
  SetHitPointRollCommand,
} from './sheet-inputs';
import {
  AddWeaponCommand,
  RemoveWeaponCommand,
  SetWeaponMasteryCommand,
  UpdateWeaponCommand,
} from './weapons';
import {
  AddItemCommand,
  AttuneItemCommand,
  RemoveItemCommand,
  ReplaceAttunedItemCommand,
  RestoreAttunementSlotCommand,
  UnattuneItemCommand,
  UpdateItemCommand,
} from './items';
import type { StoredCommandInverse } from './stored-inverses';

export interface ConstructedCharacterCommand {
  readonly actionType: string;
  apply(characterId: number): void | Promise<void>;
  inverse(): StoredCommandInverse | Promise<StoredCommandInverse>;
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
      payload.mode === 'delete')
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
      case 'allocate_abilities':
        return new AllocateAbilitiesCommand(this.db, payload);
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
      case 'update_character_flavor':
        return new UpdateCharacterFlavorCommand(this.db, payload);
      case 'update_source_config':
        return new UpdateSourceConfigCommand(
          this.db,
          payload,
          this.integrity,
        );
      case 'choose_species_lineage':
        return new ChooseSpeciesLineageCommand(
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
      case 'level_up_class':
        return new LevelUpClassCommand(this.db, payload, this.integrity);
      case 'resolve_level_feat_choice':
        return new ResolveLevelFeatChoiceCommand(
          this.db,
          payload,
          this.integrity,
        );
      case 'add_weapon':
        return new AddWeaponCommand(this.db, payload);
      case 'update_weapon':
        return new UpdateWeaponCommand(this.db, payload);
      case 'remove_weapon':
        return new RemoveWeaponCommand(this.db, payload);
      case 'set_weapon_mastery':
        return new SetWeaponMasteryCommand(this.db, payload);
      case 'add_item':
        return new AddItemCommand(this.db, payload);
      case 'update_item':
        return new UpdateItemCommand(this.db, payload);
      case 'remove_item':
        return new RemoveItemCommand(this.db, payload);
      case 'attune_item':
        return new AttuneItemCommand(this.db, payload);
      case 'unattune_item':
        return new UnattuneItemCommand(this.db, payload);
      case 'replace_attuned_item':
        return new ReplaceAttunedItemCommand(this.db, payload);
      case 'restore_attunement_slot':
        return new RestoreAttunementSlotCommand(this.db, payload);
      case 'set_armor':
        return new SetArmorCommand(this.db, payload);
      case 'set_hit_point_roll':
        return new SetHitPointRollCommand(this.db, payload);
      case 'fill_skill_grant':
        return new FillSkillGrantCommand(this.db, payload);
    }
  }
}
