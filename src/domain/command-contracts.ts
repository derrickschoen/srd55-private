import type {
  Ability,
  AddableSourceType,
  SelectionEligibility,
  SlotState,
  WeaponMasteryProperty,
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

/**
 * The editable body of one weapon — the fields a template pre-fills and a user
 * may then change, all of them.
 *
 * DELIBERATELY NOT PRESENT: any reference to the template it was filled from.
 * By D1b a character's weapon stores VALUES; the link is severed at the moment
 * of the copy, which is what makes "edit a weapon" incapable of mutating the
 * catalog and "delete a template" incapable of damaging a character.
 *
 * `mastery_selected` is also absent, and that is not an oversight: selecting
 * mastery is a different user intent with a different warning attached, so it
 * travels as `set_weapon_mastery` and the change log reads accordingly.
 */
export interface WeaponFields {
  name: string;
  damage_dice: string | null;
  damage_type: string | null;
  versatile_damage_dice: string | null;
  finesse: boolean;
  heavy: boolean;
  light: boolean;
  loading: boolean;
  reach: boolean;
  thrown: boolean;
  two_handed: boolean;
  ammunition: boolean;
  ammunition_kind: string | null;
  range_normal_feet: number | null;
  range_long_feet: number | null;
  mastery_property: WeaponMasteryProperty | null;
  other_properties: string | null;
  notes: string | null;
}

export interface AddWeaponCommand extends CommandBase {
  type: 'add_weapon';
  weapon: WeaponFields;
  /**
   * Present ONLY on the inverse of a `remove_weapon`, where it restores the row
   * at the id it had. Undo that renumbered a weapon would leave any earlier
   * inverse in the same undo stack pointing at nothing.
   */
  weapon_id?: number;
  /** Likewise: carries a removed weapon's mastery selection back. */
  mastery_selected?: boolean;
}

export interface UpdateWeaponCommand extends CommandBase {
  type: 'update_weapon';
  weapon_id: number;
  weapon: WeaponFields;
}

export interface RemoveWeaponCommand extends CommandBase {
  type: 'remove_weapon';
  weapon_id: number;
}

export interface SetWeaponMasteryCommand extends CommandBase {
  type: 'set_weapon_mastery';
  weapon_id: number;
  selected: boolean;
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
  | AddWeaponCommand
  | UpdateWeaponCommand
  | RemoveWeaponCommand
  | SetWeaponMasteryCommand
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
