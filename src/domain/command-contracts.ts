import type {
  Ability,
  AddableSourceType,
  ArmorCategory,
  ArmorDexBonus,
  ArmorSlot,
  DamageType,
  SelectionEligibility,
  Skill,
  SlotState,
  WeaponMasteryProperty,
  WeaponProficiencyCategory,
} from './enums';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from './weapon-damage';
import type { WeaponRange } from './weapon-range';
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
  /**
   * D27's `simple | martial`, or `null` for NOT STATED.
   *
   * CHARACTER-ONLY, ALONGSIDE `notes`, WHICH IS WHY `WeaponProfile` EXCLUDES
   * BOTH. `weapon_templates` has no such column: its `srd_group` is the source's
   * four table headings and the two categories are DERIVED from it by
   * `weaponFromTemplate`, in one exhaustive fold. Putting it in the shared
   * profile would make `templates()` select a column that does not exist.
   */
  proficiency_category: WeaponProficiencyCategory | null;
  damage: WeaponDamage;
  damage_type: DamageType | null;
  versatile_damage: VersatileWeaponDamage;
  finesse: boolean;
  heavy: boolean;
  light: boolean;
  loading: boolean;
  reach: boolean;
  thrown: boolean;
  two_handed: boolean;
  ammunition: boolean;
  ammunition_kind: string | null;
  range: WeaponRange;
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

/**
 * The editable body of one piece of armour — everything a template pre-fills and
 * a user may then change.
 *
 * DELIBERATELY NOT PRESENT: any reference to the `armor_templates` row it was
 * filled from (D1b), and `slot`. The slot is WHERE the row goes and travels on
 * the command rather than in the body, so that "move my shield to the worn
 * slot" cannot be spelled two different ways.
 */
export interface ArmorFields {
  name: string;
  category: ArmorCategory;
  armor_class: number;
  dex_bonus: ArmorDexBonus;
  dex_bonus_max: number | null;
  strength_requirement: number | null;
  stealth_disadvantage: boolean;
  notes: string | null;
}

/**
 * Set (or clear) what the character has in one armour slot.
 *
 * `armor: null` CLEARS THE SLOT, and that is why there is no `remove_armor`:
 * the slot is the identity, so setting it to nothing is the same intent as
 * setting it to something and the two share an inverse.
 */
export interface SetArmorCommand extends CommandBase {
  type: 'set_armor';
  slot: ArmorSlot;
  armor: ArmorFields | null;
}

/** Record (or clear) the die a player rolled for one level of one class. */
export interface SetHitPointRollCommand extends CommandBase {
  type: 'set_hit_point_roll';
  class_name: string;
  class_level: number;
  /** `null` clears the roll, restoring the printed fixed value for that level. */
  rolled_value: number | null;
}

export interface SetSkillProficiencyCommand extends CommandBase {
  type: 'set_skill_proficiency';
  skill: Skill;
  proficient: boolean;
}

/**
 * Complete one multiclass-entry skill choice. Bard's accompanying instrument
 * choice is made at the table and is deliberately not tracked.
 */
export interface ChooseMulticlassSkillCommand extends CommandBase {
  type: 'choose_multiclass_skill';
  skill: Skill;
}

/** D12's escape hatch: a signed adjustment and the reason for it. */
export interface SetArmorClassAdjustmentCommand extends CommandBase {
  type: 'set_armor_class_adjustment';
  value: number;
  note: string | null;
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
  | SetArmorCommand
  | SetHitPointRollCommand
  | SetSkillProficiencyCommand
  | ChooseMulticlassSkillCommand
  | SetArmorClassAdjustmentCommand
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
