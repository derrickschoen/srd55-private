import type {
  Ability,
  AddableSourceType,
  ArmorCategory,
  ArmorDexBonus,
  ArmorSlot,
  DamageType,
  KnownAbilityAllocationMethod,
  SelectionEligibility,
  Skill,
  SlotState,
  WeaponAttackKind,
  WeaponMasteryProperty,
  WeaponProficiencyCategory,
} from './enums';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from './weapon-damage';
import type { WeaponRange } from './weapon-range';
import type { EquipmentEffectInput } from './equipment-effects';
import type { CharacterSnapshot, JsonObject } from './models';
import type { AttunementSlot } from './attunement';

interface CommandBase {
  reason?: string;
}

export interface UpdateAbilityCommand extends CommandBase {
  type: 'update_ability';
  ability: Ability;
  score: number;
}

/**
 * The guided abilities step's ONE atomic write (plan §3.1): all six base
 * scores AND the allocation method together. Not six `update_ability` calls —
 * the step is one decision, and partial allocation is not a state the wizard
 * should be able to produce. Its inverse is a SNAPSHOT inverse, so undo
 * restores the signal with the scores.
 */
export interface AllocateAbilitiesCommand extends CommandBase {
  type: 'allocate_abilities';
  method: KnownAbilityAllocationMethod;
  scores: Readonly<Record<Ability, number>>;
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

/**
 * ENTRY AND SUBCLASS ONLY — `level` IS DELIBERATELY GONE (level-up plan §3).
 *
 * The payload used to carry `level: number | null`, and the planner's number
 * input could move a class to any level 1..20 without a hit-point row ever
 * being written — the live bug the level-up unit closes (§1). Levelling now
 * belongs to ONE path, `level_up_class` below, whose command-layer guards
 * (adjacency, subclass at 3, ASI, class held) would never fire for a second
 * writer. What survives here:
 *
 *  - ENTRY: a class the character does not have is created at level 1 —
 *    multiclass entry is untouched (D56 defers multiclass LEVEL-UP only).
 *  - SUBCLASS: `subclass_definition_id` still sets or clears the subclass of
 *    a class the character has; the stored level never moves.
 *  - REMOVAL: the `remove: true` variant, replacing the old `level: null`.
 */
export type UpdateClassCommand =
  | (CommandBase & {
      type: 'update_class';
      class_definition_id: number;
      subclass_definition_id?: number | null;
      remove?: never;
    })
  | (CommandBase & {
      type: 'update_class';
      class_definition_id: number;
      remove: true;
      subclass_definition_id?: never;
    });

/** SRD 2024 ASI: +2 to one ability, or +1 to each of two (seam §8b). */
export interface LevelUpAbilityIncrease {
  ability: Ability;
  amount: number;
}

/**
 * THE ONE LEVELLING PATH (level-up plan §8b): one command, one payload, one
 * transaction, one snapshot inverse, one refusal set.
 *
 * `target_level` must be exactly the class's current level plus one
 * (L-ADJACENT). There is NO hit-point field, and that is D77 rather than an
 * omission: hit points at every level past the first are the class's fixed
 * value (`die / 2 + 1`) plus the Constitution modifier, computed live by the
 * sheet — nothing per level is recorded, so there is nothing to carry.
 * `subclass_content_key` is required exactly when the new level is 3 (all
 * twelve seeded 2024 classes subclass at 3); `ability_increases` is required
 * exactly when the new level is an ASI level READ FROM THE SEEDED TABLE
 * (`src/rules/class-level-features-srd.ts` — never a hardcoded list, which is
 * the D15 mistake §5 names; D78 records that even the plan's own enumeration
 * of those levels was wrong). The increases field is a LIST of one or two
 * entries because a singular field cannot express the +1/+1 arm.
 */
export interface LevelUpClassCommand extends CommandBase {
  type: 'level_up_class';
  class_definition_id: number;
  target_level: number;
  subclass_content_key?: string;
  ability_increases?: readonly LevelUpAbilityIncrease[];
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
   * Which printed attack formula applies, or null when it was not recorded.
   *
   * A template copy derives this from `srd_group`; a custom weapon begins null.
   * No range or property field is a fallback for the absent state.
   */
  attack_kind: WeaponAttackKind | null;
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
  /**
   * Effects this weapon grants. Absent means an ordinary weapon edit leaves
   * existing owned effects untouched; a present list replaces them.
   */
  effects?: readonly EquipmentEffectInput[];
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

export interface ItemFields {
  name: string;
  description: string | null;
  quantity: number;
  requires_attunement: boolean;
  source_instance_id: number | null;
  /**
   * Effects this item grants. Absent has the same preserve-on-update meaning
   * as `WeaponFields.effects`; an empty list explicitly clears them.
   */
  effects?: readonly EquipmentEffectInput[];
}

export interface AddItemCommand extends CommandBase {
  type: 'add_item';
  item: ItemFields;
  /** Present only on the inverse of `remove_item`. */
  item_id?: number;
  /** Present only on an inverse restoring a removed attuned item. */
  attunement_slot?: AttunementSlot;
}

export interface UpdateItemCommand extends CommandBase {
  type: 'update_item';
  item_id: number;
  item: ItemFields;
}

export interface RemoveItemCommand extends CommandBase {
  type: 'remove_item';
  item_id: number;
}

export interface AttuneItemCommand extends CommandBase {
  type: 'attune_item';
  item_id: number;
}

export interface UnattuneItemCommand extends CommandBase {
  type: 'unattune_item';
  item_id: number;
}

export interface ReplaceAttunedItemCommand extends CommandBase {
  type: 'replace_attuned_item';
  item_id: number;
  replaced_item_id: number;
}

/** Exact inverse of unattuning; ordinary UI callers never need this command. */
export interface RestoreAttunementSlotCommand extends CommandBase {
  type: 'restore_attunement_slot';
  slot: AttunementSlot;
  item_id: number;
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

/*
 * `set_skill_proficiency` and `choose_multiclass_skill` are RETIRED
 * (skills-with-provenance §3.5), not renamed: a manual tick has no source and
 * a choice that cannot name its grant survives D44 only cosmetically. The RPC
 * surface refuses both as unknown commands; `fill_skill_grant` below is the
 * one skill writer, and it addresses the grant it fills.
 */

/**
 * Fill — or, with `skill: null`, CLEAR — one ADDRESSED skill grant
 * (skills-with-provenance §3.3/§3.6). The locator is the grant's own stable
 * id, never "whichever grant is unfilled": with two entered classes whose
 * pools overlap, the addressed grant is what makes the provenance right, not
 * merely the totals. Its inverse is the same command with the displaced
 * selection, so undo of a fill is a clear and undo of a clear is the fill.
 */
export interface FillSkillGrantCommand extends CommandBase {
  type: 'fill_skill_grant';
  grant_id: number;
  skill: Skill | null;
}

export interface RestoreSnapshotCommand extends CommandBase {
  type: 'restore_snapshot';
  snapshot: CharacterSnapshot | JsonObject;
  integrity: string;
}

export type CharacterCommandPayload =
  | UpdateAbilityCommand
  | AllocateAbilitiesCommand
  | SetSlotCommand
  | UpdateCharacterRulesCommand
  | UpdateSourceConfigCommand
  | AddSourceCommand
  | RemoveSourceCommand
  | AcknowledgeWarningCommand
  | UpdateClassCommand
  | LevelUpClassCommand
  | AddWeaponCommand
  | UpdateWeaponCommand
  | RemoveWeaponCommand
  | SetWeaponMasteryCommand
  | AddItemCommand
  | UpdateItemCommand
  | RemoveItemCommand
  | AttuneItemCommand
  | UnattuneItemCommand
  | ReplaceAttunedItemCommand
  | RestoreAttunementSlotCommand
  | SetArmorCommand
  | SetHitPointRollCommand
  | FillSkillGrantCommand
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
