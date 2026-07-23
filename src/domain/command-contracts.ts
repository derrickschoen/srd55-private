import type {
  Ability,
  AddableSourceType,
  SelectionEligibility,
  SlotState,
} from './enums';
import type { CharacterSnapshot, JsonObject } from './models';

interface CommandBase {
  reason?: string;
}

export interface UpdateAbilityCommand extends CommandBase {
  type: 'update_ability';
  ability: Ability;
  score: number;
}

export interface SlotRestoreState {
  current_spell_version_id: number | null;
  selection_eligibility: SelectionEligibility;
  selection_invalid_reason: string | null;
  state: SlotState;
  override_note: string | null;
}

export type SetSlotCommand =
  | (CommandBase & {
      type: 'set_slot';
      slot_id: number;
      mode: 'select';
      spell_version_id: number;
    })
  | (CommandBase & {
      type: 'set_slot';
      slot_id: number;
      mode: 'clear';
    })
  | (CommandBase & {
      type: 'set_slot';
      slot_id: number;
      mode: 'keep_override';
      note: string;
    })
  | (CommandBase & {
      type: 'set_slot';
      slot_id: number;
      mode: 'restore';
      state: SlotRestoreState;
      integrity: string;
    });

export interface UpdateCharacterRulesCommand extends CommandBase {
  type: 'update_character_rules';
  allow_legacy: boolean;
}

export type UpdateSourceConfigCommand =
  | (CommandBase & {
      type: 'update_source_config';
      source_instance_id: number;
      chosen_list: string;
      chosen_option?: never;
    })
  | (CommandBase & {
      type: 'update_source_config';
      source_instance_id: number;
      chosen_option: string;
      chosen_list?: never;
    });

export interface AddSourceCommand extends CommandBase {
  type: 'add_source';
  source_type: AddableSourceType;
  source_definition_id: number;
  config: JsonObject;
}

export interface RemoveSourceCommand extends CommandBase {
  type: 'remove_source';
  source_instance_id: number;
}

export type AcknowledgeWarningCommand =
  | (CommandBase & {
      type: 'acknowledge_warning';
      mode?: 'acknowledge';
      warning_fingerprint: string;
      note: string;
    })
  | (CommandBase & {
      type: 'acknowledge_warning';
      mode: 'delete';
      warning_fingerprint: string;
      integrity: string;
    });

export interface UpdateClassCommand extends CommandBase {
  type: 'update_class';
  class_definition_id: number;
  level: number | null;
  subclass_definition_id?: number | null;
}

export interface RestoreSnapshotCommand extends CommandBase {
  type: 'restore_snapshot';
  snapshot: CharacterSnapshot | JsonObject;
  integrity: string;
}

export type CharacterCommandPayload =
  | UpdateAbilityCommand
  | SetSlotCommand
  | UpdateCharacterRulesCommand
  | UpdateSourceConfigCommand
  | AddSourceCommand
  | RemoveSourceCommand
  | AcknowledgeWarningCommand
  | UpdateClassCommand
  | RestoreSnapshotCommand;

export interface CharacterCommandRequest {
  character_id: number;
  operation_uuid: string;
  expected_revision: number;
  command: CharacterCommandPayload;
}

export interface CommandImplementation {
  readonly actionType: string;
  apply(characterId: number): void;
  inverse(): CharacterCommandPayload;
}
