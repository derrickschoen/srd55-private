import type { WeaponFields } from './command-contracts';
import type { EquipmentEffectInput } from './equipment-effects';
import type { AttunementSlot } from './attunement';
import type {
  ContentKey,
  SpellIdentityId,
  SpellVersionId,
} from './ids';
import type { MulticlassPrimaryAbilityWarning } from './primary-ability';
import type {
  CatalogLayerDisclosure,
  CharacterCatalogDisclosure,
} from '../catalog/catalog-disclosure';
import type { AttackProfileResult } from '../rules/attack-profiles';
import type { StartingClassWarning } from '../rules/sheet';
import type { CharacterMasteryAllowance } from '../rules/weapon-mastery-lookup';
import type { MulticlassPrerequisiteHouseRule } from '../rules/multiclass-prerequisite-house-rule';
import type {
  Ability,
  CastingMode,
  DomainSourceType,
  DuplicateCategory,
  ProgressionType,
  RulesEdition,
  SelectionEligibility,
  SpellSchool,
  SlotBucket,
  SlotState,
  SrdWeaponGroup,
  StandaloneSourceType,
  WeaponProficiencyCategory,
} from './enums';

/**
 * THE FILLABLE BODY OF A WEAPON, SHARED BY THE CATALOG AND THE CHARACTER.
 *
 * `WeaponProfile` is what a template can fill and `WeaponFields` is what a
 * character's weapon holds. Deriving one from the other rather than writing two
 * field lists is how the "pre-fill is a column-wise copy" invariant stays true:
 * a field added to one and forgotten in the other stops compiling at the
 * pre-fill site instead of silently arriving blank.
 *
 * THREE EXCLUSIONS, AND THEY ARE EXCLUDED FOR DIFFERENT REASONS.
 *
 *  - `notes` is the USER'S, and no catalog row has one.
 *  - `proficiency_category` (D27) is not a COPY at all — it is DERIVED, folding
 *    `weapon_templates.srd_group`'s four source headings down to the two
 *    categories a class grants proficiency in. There is no such column on the
 *    template to select, so leaving it in this type would break `templates()`,
 *    and the fold has to happen somewhere a switch can be exhaustive.
 *  - `attack_kind` (D46) is derived from that same source heading, preserving
 *    its melee/ranged half on the character copy without storing a live
 *    template reference.
 *
 * The fold lives in `weaponFromTemplate`, which is the one place a template
 * becomes a character's weapon.
 */
export type WeaponProfile = Omit<
  WeaponFields,
  'notes' | 'proficiency_category' | 'attack_kind' | 'effects'
>;

export interface WeaponTemplate extends WeaponProfile {
  id: number;
  content_key: string;
  srd_group: SrdWeaponGroup;
  catalog_layer: CatalogLayerDisclosure;
}

export interface CharacterWeapon extends WeaponFields {
  id: number;
  /** The per-character choice. Never a property of the weapon itself. */
  mastery_selected: boolean;
}

/**
 * Everything the weapons panel needs, in one object.
 *
 * `allowance` is a STATE and not a number — see `CharacterMasteryAllowance`.
 * `selected_count` is what the user has actually ticked; comparing the two is
 * only meaningful when the allowance is `known`, which is why the comparison
 * lives in the renderer and not here.
 *
 * `attacks` is COMPUTED and never stored (D11). Its rows are keyed on
 * `weapon_id`, which is `null` for the one row this application derives rather
 * than reads — the Shillelagh row, which exists whether or not the character
 * owns a Club or a Quarterstaff and which writes nothing to `character_weapons`
 * to say so.
 */
export interface WeaponsPanel {
  weapons: CharacterWeapon[];
  templates: WeaponTemplate[];
  allowance: CharacterMasteryAllowance;
  selected_count: number;
  attacks: AttackProfileResult;
}

export interface CharacterItem {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly quantity: number;
  readonly requires_attunement: boolean;
  readonly source_instance_id: number | null;
  readonly attunement_slot: AttunementSlot | null;
  readonly effects: readonly EquipmentEffectInput[];
}

export interface ItemDefinition {
  readonly content_key: ContentKey;
  readonly name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly description: string;
  readonly requires_attunement: boolean;
  readonly effects: readonly EquipmentEffectInput[];
}

export interface ItemsPanel {
  readonly items: readonly CharacterItem[];
  readonly definitions: readonly ItemDefinition[];
}

export interface FreeCast {
  uses: number;
  recovery: 'long_rest' | 'short_rest' | 'dawn' | 'at_will';
  pool_scope: 'per_spell' | 'shared';
}

export interface SpellRoute {
  spell_identity_id: SpellIdentityId;
  spell_version_id: SpellVersionId;
  spell_name: string;
  spell_catalog_layer: CatalogLayerDisclosure;
  spell_level: number;
  source_name: string;
  source_catalog_layer: CatalogLayerDisclosure;
  slot_id: number | null;
  slot_key: string | null;
  casting_mode: CastingMode;
  spellcasting_ability: Ability | null;
  attack_bonus: number | null;
  save_dc: number | null;
}

export interface DuplicateAssessment {
  spell_identity_id: SpellIdentityId;
  spell_name: string;
  category: DuplicateCategory;
  sources: string[];
  slots: string[];
  explanation: string;
  warning_fingerprint: string | null;
  versions: Array<{
    spell_version_id: SpellVersionId;
    content_key: string;
    edition: RulesEdition;
    label: string;
  }>;
  acknowledgement: {
    id: number;
    note: string;
    created_at: string;
  } | null;
}

export interface WorkspaceSlot {
  id: number;
  slot_key: string;
  source: string;
  source_type: DomainSourceType;
  label: string;
  bucket: SlotBucket;
  level_min: number;
  level_max: number;
  spell_id: number | null;
  spell_name: string | null;
  spell_catalog_layer: CatalogLayerDisclosure | null;
  placeholder?: boolean;
  spell_level: number | null;
  spell_edition: RulesEdition | null;
  ability: Ability | null;
  attack_bonus: number | null;
  save_dc: number | null;
  ritual: boolean;
  concentration: boolean;
  duplicate_status: DuplicateCategory;
  state: SlotState;
  eligibility: SelectionEligibility;
  invalid_reason: string | null;
  orphan_reason: string | null;
  override_note: string | null;
  locked: boolean;
}

export interface ClassOption {
  id: number;
  name: string;
  catalog_layer: CatalogLayerDisclosure;
}

export interface ClassEntryOption extends ClassOption {
  readonly multiclass_entry:
    | { readonly status: 'not_applicable' | 'eligible'; readonly refusal: null }
    | {
        readonly status: 'waived';
        readonly refusal: null;
        readonly explanation: 'House rule: prerequisites waived.';
      }
    | { readonly status: 'blocked'; readonly refusal: string };
}

export interface CharacterClass {
  id: number;
  class_definition_id: number;
  subclass_definition_id: number | null;
  level: number;
  is_starting_class: boolean;
  name: string;
  catalog_layer: CatalogLayerDisclosure;
  subclass_name: string | null;
  subclass_catalog_layer: CatalogLayerDisclosure | null;
  subclasses: ClassOption[];
  readonly multiclass_prerequisite_warning:
    MulticlassPrimaryAbilityWarning | null;
}

export interface SavePoint {
  id: number;
  label: string;
  created_at: string;
}

export interface SourceDefinition {
  id: number;
  content_key: string;
  name: string;
  catalog_layer: CatalogLayerDisclosure;
  repeatable: boolean;
  configuration_kind:
    | 'magic_initiate'
    | 'origin_feat_magic_initiate'
    | 'none';
}

export interface RemovableSource {
  id: number;
  parent_source_instance_id: number | null;
  source_type: StandaloneSourceType;
  source_definition_id: number | null;
  display_name: string;
  catalog_layer: CatalogLayerDisclosure;
}

interface OrderSourceBase {
  id: number;
  display_name: string;
}

export type OrderSource = OrderSourceBase &
  (
    | {
        class_name: 'Cleric';
        order_name: 'Divine Order';
        chosen_option: 'Protector' | 'Thaumaturge' | null;
        options: Array<'Protector' | 'Thaumaturge'>;
        bonus_option: 'Thaumaturge';
      }
    | {
        class_name: 'Druid';
        order_name: 'Primal Order';
        chosen_option: 'Warden' | 'Magician' | null;
        options: Array<'Warden' | 'Magician'>;
        bonus_option: 'Magician';
      }
  );

export interface BuildReport {
  character: {
    id: number;
    name: string;
    character_level: number | null;
    proficiency_bonus: number | null;
    /**
     * THE RESOLVED TOTALS — base plus `ability_increase` contributions (D63),
     * through the one resolver in `src/rules/ability-contributions.ts`. This
     * is what every surface that COMPUTES or PRINTS a score reads: casting
     * attack/DC badges, workspace slot math, dice, print, the machine block.
     */
    abilities: Record<Ability, number>;
    /**
     * BASE, as stored — what the player allocated, before any contribution.
     *
     * EXISTS BECAUSE THE EDITOR IS A WRITER FED BY A READER (plan §3.5/§3.6):
     * `update_ability` writes whatever was typed straight into the base
     * column, so the planner's ability inputs — value, dirty-check and
     * modifier caption — and the guided abilities step's prefill MUST read
     * this field. An editor fed `abilities` would bake a contribution into
     * base the first time a person nudged a number.
     */
    abilities_base: Record<Ability, number>;
  };
  caster: {
    caster_level: number;
    slots: Array<{ level: number; count: number }>;
    pact_magic: { level: number; count: number } | null;
  };
  classes: Array<{
    name: string;
    subclass: string | null;
    class_level: number;
    spellcasting_ability: Ability | null;
    progression_type: ProgressionType;
    prepared_count: number;
    max_preparable_level: number;
    class_catalog_layer: CatalogLayerDisclosure;
    subclass_catalog_layer: CatalogLayerDisclosure | null;
  }>;
  catalog_sources: readonly CharacterCatalogDisclosure[];
  preparation_callout: string;
  access_routes: SpellRoute[];
  duplicate_assessments: DuplicateAssessment[];
  wizard: {
    spellbook: Array<{
      spellbook_entry_id: number;
      spell_name: string;
      spell_catalog_layer: CatalogLayerDisclosure;
      active: boolean;
    }>;
    prepared: Array<{
      spell_version_id: number;
      spell_name: string;
      spell_catalog_layer: CatalogLayerDisclosure;
    }>;
    ritual_only: Array<{
      spellbook_entry_id: number;
      spell_name: string;
      spell_catalog_layer: CatalogLayerDisclosure;
    }>;
    explanation: string;
  };
}

export interface WorkspaceBuildReport extends BuildReport {
  invalid_selections: WorkspaceSlot[];
  summary: {
    unique_spells: number;
    access_routes: number;
    warning_count: number;
  };
}

export interface Workspace {
  revision: number;
  report: WorkspaceBuildReport;
  classes: CharacterClass[];
  starting_class_resolution: {
    readonly class_level_id: number | null;
    readonly warnings: readonly StartingClassWarning[];
  };
  available_classes: ClassEntryOption[];
  allow_legacy: boolean;
  multiclass_prerequisite_house_rule: MulticlassPrerequisiteHouseRule;
  flavor: {
    readonly alignment: string | null;
    readonly appearance: string | null;
    readonly backstory: string | null;
    readonly notes: string | null;
  };
  configurable_sources: Array<{
    id: number;
    display_name: string;
    catalog_layer: CatalogLayerDisclosure;
    chosen_list: string;
    spellcasting_ability: Ability;
  }>;
  order_sources: OrderSource[];
  source_catalog: Record<StandaloneSourceType, SourceDefinition[]>;
  removable_sources: RemovableSource[];
  spell_lists: string[];
  slots: WorkspaceSlot[];
  placeholder_spells?: Array<{
    spellKey: string;
    name: string;
  }>;
  save_points: SavePoint[];
  weapons: WeaponsPanel;
  items: ItemsPanel;
}

export interface EligibleSpell {
  id: number;
  name: string;
  level: number;
  school: SpellSchool;
  ritual: boolean;
  concentration: boolean;
  edition: RulesEdition;
  catalog_layer: CatalogLayerDisclosure;
}

export interface CharacterSummary {
  id: number;
  name: string;
  /** Every guided level-1 step is durably complete. */
  level_one_complete: boolean;
  level: number | null;
  classes: readonly {
    readonly name: string;
    readonly level: number;
    readonly catalog_layer: CatalogLayerDisclosure;
  }[];
  warning_count: number;
}
