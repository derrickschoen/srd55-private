/**
 * The level-up wizard's extract-free seam.
 *
 * These values are pinned before the read model, command extensions and UI
 * depend on them. Keep SRD readers out of this module so node-side RPC and
 * browser test processes can import the contract without a Vite `?raw` edge.
 */
import type {
  Ability,
  CharacterLevel,
  HitDieSize,
  KnownFeatGrouping,
  RulesEdition,
  Skill,
} from '../domain/enums';
import type {
  LevelFeatChoice,
  LevelUpPlannedExpertiseChoice,
  LevelUpPlannedGrantLocator,
  LevelUpPlannedGrantSource,
  LevelUpPlannedSkillChoice,
  LevelUpPlannedSpellChoice,
  LevelFeatSelection,
} from '../domain/command-contracts';
export type {
  LevelFeatChoice,
  LevelFeatSelection,
} from '../domain/command-contracts';
import type {
  CharacterId,
  CharacterLevelFeatChoiceId,
  CharacterRevision,
  ClassDefinitionId,
  ClassLevel,
  ContentKey,
  GrantRuleKey,
  SourceInstanceId,
  SpellVersionId,
  SubclassDefinitionId,
} from '../domain/ids';
import type { EquipmentEffectInput } from '../domain/equipment-effects';
import type { JsonObject } from '../domain/models';
import type { EligibleSpell } from '../domain/read-models';
import type { GrantRuleObject } from '../grants/grant-rule';

export type AbilityIncreaseAbilities = 'any' | readonly Ability[];

export const featPrerequisiteFeatures = [
  'fighting_style',
  'spellcasting',
] as const;
export type FeatPrerequisiteFeature =
  (typeof featPrerequisiteFeatures)[number];

export type FeatPrerequisite =
  | {
      readonly kind: 'ability_score';
      readonly abilities: readonly Ability[];
      readonly minimum: number;
    }
  | {
      readonly kind: 'feature';
      readonly feature: FeatPrerequisiteFeature;
    };

export type FeatFeatureEvidence = Readonly<
  Record<FeatPrerequisiteFeature, 'present' | 'absent' | 'unprovable'>
>;

export interface ActiveFeatInstance {
  readonly feat_content_key: ContentKey;
  readonly config: JsonObject;
}

export interface ProjectedFeatCharacter {
  readonly total_level: CharacterLevel;
  readonly ability_scores: Readonly<Record<Ability, number | null>>;
  readonly feature_evidence: FeatFeatureEvidence;
  readonly active_feats: readonly ActiveFeatInstance[];
}

export type FeatUnmetReason =
  | {
      readonly kind: 'minimum_level';
      readonly minimum: CharacterLevel;
      readonly actual: CharacterLevel;
    }
  | {
      readonly kind: 'ability_score_minimum';
      readonly abilities: readonly Ability[];
      readonly minimum: number;
      readonly actual: readonly (number | null)[];
    }
  | {
      readonly kind: 'feature_missing';
      readonly feature: FeatPrerequisiteFeature;
    }
  | { readonly kind: 'already_taken' }
  | {
      readonly kind: 'repeat_configuration_unavailable';
      readonly field: 'chosen_list';
    }
  | {
      readonly kind: 'repeat_configuration_already_used';
      readonly field: 'chosen_list';
      readonly value: string;
    };

export type FeatUnprovableReason =
  | {
      readonly kind: 'ability_score_unknown';
      readonly abilities: readonly Ability[];
      readonly minimum: number;
    }
  | {
      readonly kind: 'feature_unprovable';
      readonly feature: FeatPrerequisiteFeature;
    }
  | {
      readonly kind: 'repeat_configuration_unprovable';
      readonly field: 'chosen_list';
    };

export type FeatEligibilityReason =
  | FeatUnmetReason
  | FeatUnprovableReason;

export type FeatEligibilityResult =
  | {
      readonly status: 'qualified';
      readonly reasons: readonly [];
    }
  | {
      readonly status: 'unmet';
      /**
       * Definite failures come first, followed by any additional facts the
       * projected character cannot prove. The unmet status wins without
       * discarding useful card-level evidence.
       */
      readonly reasons: readonly FeatEligibilityReason[];
    }
  | {
      readonly status: 'unprovable';
      readonly reasons: readonly FeatUnprovableReason[];
    };

export type DerivedNumberId =
  | 'initiative'
  | 'ranged_weapon_attack_bonus'
  | 'armor_class';

export type FeatTextGap =
  | 'initiative_proficiency_unmodelled'
  | 'initiative_swap_text_only'
  | 'spell_change_unmodelled'
  | 'weapon_reroll_text_only'
  | 'tool_alternative_unmodelled'
  | 'grapple_benefit_text_only'
  | 'ranged_weapon_predicate_unmodelled'
  | 'armor_worn_predicate_unmodelled'
  | 'damage_die_replacement_unmodelled'
  | 'light_weapon_attack_predicate_unmodelled'
  | 'epic_boon_benefit_text_only'
  | 'conditional_resistance_unmodelled'
  | 'senses_unmodelled';

export interface FeatTextBenefit {
  readonly benefit_key: string;
  readonly label: string;
  /** Exact sourced text, never a reconstructed summary. */
  readonly text: string;
  readonly gap: FeatTextGap;
}

export type PlannedCharacterEffect = EquipmentEffectInput;

export interface FeatApplicationPlan {
  readonly feat_content_key: ContentKey;
  readonly eligibility: FeatEligibilityResult;
  readonly config: JsonObject;
  readonly effects: readonly PlannedCharacterEffect[];
  readonly grant_rules: readonly GrantRuleObject[];
  readonly text_benefits: readonly FeatTextBenefit[];
  readonly undetermined_numbers: readonly DerivedNumberId[];
}

export interface FeatSpellReplacementEntitlement {
  readonly feat_content_key: ContentKey;
  readonly trigger: 'character_level';
  readonly rule_keys: readonly GrantRuleKey[];
  readonly replacement_constraint: 'same_list_and_level';
  readonly list_config_key: 'chosen_list';
}

export interface FeatDefinitionForApplication {
  readonly content_key: ContentKey;
  readonly name: string;
  readonly grouping: KnownFeatGrouping;
  readonly min_level: CharacterLevel | null;
  readonly ability_points: 0 | 1 | 2;
  readonly ability_increase_abilities: AbilityIncreaseAbilities | null;
  readonly ability_increase_maximum: number | null;
  readonly repeatable: boolean;
  readonly prerequisites: readonly FeatPrerequisite[];
  readonly grant_rules: readonly GrantRuleObject[];
  readonly notes: string;
}

export type LevelUpStep =
  | 'class'
  | 'gains'
  | 'subclass'
  | 'feat'
  | 'epic_boon'
  | 'skills'
  | 'expertise'
  | 'spells'
  | 'review'
  | 'complete';

export const LEVEL_UP_STEP_ORDER: readonly LevelUpStep[] = Object.freeze([
  'class',
  'gains',
  'subclass',
  'feat',
  'epic_boon',
  'skills',
  'expertise',
  'spells',
  'review',
  'complete',
]);

export type PlannedGrantSource = LevelUpPlannedGrantSource;
export type PlannedGrantLocator = LevelUpPlannedGrantLocator;
export type PlannedSpellChoice = LevelUpPlannedSpellChoice;
export type PlannedSkillChoice = LevelUpPlannedSkillChoice;
export type PlannedExpertiseChoice = LevelUpPlannedExpertiseChoice;

export interface LevelUpPlannedEligibleSpellsParams {
  readonly character_id: CharacterId;
  readonly expected_revision: CharacterRevision;
  readonly class_definition_id: ClassDefinitionId;
  readonly target_class_level: ClassLevel;
  readonly subclass_content_key?: ContentKey;
  readonly feat_choice?: LevelFeatSelection;
  readonly locator: PlannedGrantLocator;
  readonly query: string;
}

export type LevelUpPlannedEligibleSpellsResult =
  readonly EligibleSpell[];

export const LEVEL_UP_STATE_KINDS = Object.freeze({
  notFound: 'not_found',
  noHeldClass: 'no_held_class',
  noGuideableClass: 'no_guideable_class',
  maximumLevel: 'maximum_level',
  ready: 'ready',
} as const);

export type LevelUpStateKind =
  (typeof LEVEL_UP_STATE_KINDS)[keyof typeof LEVEL_UP_STATE_KINDS];

export interface LevelUpStateParams {
  readonly character_id: CharacterId;
}

/** One durable D70 warning, repeated here without re-deriving its prose. */
export interface LevelUpPermanentWarning {
  readonly kind: string;
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
}

export interface LevelUpCharacterSummary {
  readonly character_id: CharacterId;
  readonly name: string;
  readonly revision: CharacterRevision;
  /** May exceed 20 in an imported tolerated image; maximum state preserves it. */
  readonly total_level: number | null;
  readonly warnings: readonly LevelUpPermanentWarning[];
}

export interface LevelUpSubclassOption {
  readonly subclass_definition_id: SubclassDefinitionId;
  readonly content_key: ContentKey;
  readonly name: string;
  readonly rules_edition: RulesEdition;
}

export interface LevelUpHeldClass {
  readonly class_definition_id: ClassDefinitionId;
  readonly content_key: ContentKey;
  readonly name: string;
  readonly rules_edition: RulesEdition;
  readonly current_level: ClassLevel;
  readonly hit_die: HitDieSize | null;
  readonly current_subclass: LevelUpSubclassOption | null;
}

export type LevelUpTargetFeatures =
  | {
      readonly kind: 'sourced';
      readonly feature_names: readonly string[];
    }
  | { readonly kind: 'unavailable' };

export interface LevelUpLevelScaledHitPointGain {
  readonly label: string;
  readonly current_contribution: number;
  readonly projected_contribution: number;
  readonly change: number;
}

export type LevelUpProjectedHitPoints =
  | {
      readonly kind: 'known';
      readonly hit_die: HitDieSize;
      readonly fixed_class_base: number;
      readonly constitution_modifier: number;
      readonly class_hit_point_change: number;
      readonly level_scaled_effects:
        readonly LevelUpLevelScaledHitPointGain[];
      readonly current_maximum: number;
      readonly projected_maximum:
        | { readonly kind: 'known'; readonly value: number }
        | {
            readonly kind: 'pending_choice';
            readonly choices: readonly ('subclass' | 'level_feat')[];
          };
    }
  | {
      readonly kind: 'unknown';
      readonly reason:
        | 'missing_hit_die'
        | 'undetermined_level_scaled_effect';
      readonly missing_hit_dice: readonly {
        readonly class_definition_id: ClassDefinitionId;
        readonly class_name: string;
      }[];
    };

export interface LevelUpProjectedGains {
  readonly current_class_level: ClassLevel;
  readonly target_class_level: ClassLevel;
  readonly current_total_level: CharacterLevel;
  readonly target_total_level: CharacterLevel;
  readonly hit_points: LevelUpProjectedHitPoints;
  readonly proficiency_bonus_change: {
    readonly current: number;
    readonly projected: number;
  } | null;
  readonly target_features: LevelUpTargetFeatures;
}

/** One exact unified LU-1 selection and the LU-0 plan produced from it. */
export interface LevelUpFeatApplication {
  readonly selection: LevelFeatSelection;
  readonly plan: FeatApplicationPlan;
}

export interface LevelUpFeatCandidate {
  readonly definition: FeatDefinitionForApplication;
  readonly eligibility: FeatEligibilityResult;
  readonly is_class_default: boolean;
  readonly applications: readonly LevelUpFeatApplication[];
}

export interface LevelUpFeatOccurrence {
  readonly kind: 'asi_level_feat' | 'epic_boon';
  readonly candidates: readonly LevelUpFeatCandidate[];
}

export interface LevelUpSubclassChoice {
  readonly options: readonly LevelUpSubclassOption[];
}

export interface LevelUpGuideableClassOption extends LevelUpHeldClass {
  readonly guideability: 'guideable';
  readonly hit_die: HitDieSize;
  readonly target_level: ClassLevel;
  readonly gains: LevelUpProjectedGains;
  readonly applicable_steps: readonly LevelUpStep[];
  readonly subclass_choice: LevelUpSubclassChoice | null;
  readonly feat_occurrence: LevelUpFeatOccurrence | null;
}

export interface LevelUpDisabledClassOption extends LevelUpHeldClass {
  readonly guideability: 'disabled';
  readonly hit_die: null;
  readonly reason: 'missing_hit_die';
  readonly explanation: string;
}

export type LevelUpClassOption =
  | LevelUpGuideableClassOption
  | LevelUpDisabledClassOption;

export interface LevelUpPendingEpicResolution {
  readonly deferred_choice: {
    readonly character_level_feat_choice_id:
      CharacterLevelFeatChoiceId;
    readonly class_definition_id: ClassDefinitionId;
    readonly class_name: string;
    readonly class_level: ClassLevel;
  };
  readonly additional_deferred_count: number;
  readonly warning: LevelUpWarningPresentation;
  readonly candidates: readonly LevelUpFeatCandidate[];
  readonly applicable_steps: readonly ['epic_boon', 'review', 'complete'];
}

export type LevelUpStateResult =
  | {
      readonly kind: 'not_found';
      readonly character_id: CharacterId;
    }
  | {
      readonly kind: 'no_held_class';
      readonly character: LevelUpCharacterSummary;
    }
  | {
      readonly kind: 'no_guideable_class';
      readonly character: LevelUpCharacterSummary & {
        readonly total_level: CharacterLevel;
      };
      readonly explanation: string;
      readonly class_options: readonly LevelUpDisabledClassOption[];
      readonly pending_epic_resolution: LevelUpPendingEpicResolution | null;
    }
  | {
      readonly kind: 'maximum_level';
      readonly character: LevelUpCharacterSummary;
      readonly held_classes: readonly LevelUpHeldClass[];
      readonly pending_epic_resolution: LevelUpPendingEpicResolution | null;
    }
  | {
      readonly kind: 'ready';
      readonly character: LevelUpCharacterSummary & {
        readonly total_level: CharacterLevel;
      };
      readonly class_options: readonly LevelUpClassOption[];
      readonly pending_epic_resolution: LevelUpPendingEpicResolution | null;
    };

export const LEVEL_UP_RPC = Object.freeze({
  state: 'queries.characters.levelUpState',
  plannedEligibleSpells:
    'queries.characters.levelUpPlannedEligibleSpells',
  preview: 'queries.characters.previewLevelUp',
} as const);

export const LEVEL_UP_PANEL_ATTRIBUTE = 'data-level-up-panel';

export const LEVEL_UP_PANEL = Object.freeze({
  notFound: 'not-found',
  maximumLevel: 'maximum-level',
  class: 'class',
  gains: 'gains',
  subclass: 'subclass',
  feat: 'feat',
  epicBoon: 'epic-boon',
  skills: 'skills',
  expertise: 'expertise',
  spells: 'spells',
  review: 'review',
  complete: 'complete',
} as const);

export const LEVEL_UP_ATTR = Object.freeze({
  step: 'data-level-up-step',
  classOption: 'data-level-up-class-option',
  featOption: 'data-level-up-feat-option',
  skillChoice: 'data-level-up-skill-choice',
  expertiseChoice: 'data-level-up-expertise-choice',
  spellChoice: 'data-level-up-spell-choice',
  warning: 'data-level-up-warning',
  back: 'data-level-up-back',
  next: 'data-level-up-next',
  cancel: 'data-level-up-cancel',
  confirm: 'data-level-up-confirm',
} as const);

const LEVEL_UP_CHARACTER_ID_PATTERN = /^[1-9]\d*$/;

export function levelUpPath(characterId: CharacterId | number): string {
  return `/characters/${String(characterId)}/level-up`;
}

export function matchesLevelUpRoute(pathname: string): CharacterId | null {
  const segments = pathname.split('/');
  if (
    segments.length !== 4 ||
    segments[0] !== '' ||
    segments[1] !== 'characters' ||
    segments[3] !== 'level-up'
  ) {
    return null;
  }
  const raw = segments[2];
  if (raw === undefined || !LEVEL_UP_CHARACTER_ID_PATTERN.test(raw)) {
    return null;
  }
  return Number(raw) as CharacterId;
}

export const LEVEL_UP_WARNING_KEYS = Object.freeze({
  spellChoiceUnfilled: 'spell_choice_unfilled',
  sourceOptionUnselected: 'source_option_unselected',
  skillGrantUnfilled: 'skill_grant_unfilled',
  expertiseGrantUnfilled: 'expertise_grant_unfilled',
  expertiseGrantOrphaned: 'expertise_grant_orphaned',
  subclassUnselected: 'subclass_unselected',
  epicBoonDeferred: 'epic_boon_deferred',
  multiclassPrimaryAbilityUnmet: 'multiclass_primary_ability_unmet',
  multiclassPrimaryAbilityUnprovable:
    'multiclass_primary_ability_unprovable',
  featBenefitUnmodelled: 'feat_benefit_unmodelled',
  unmodelledToolAlternative: 'unmodelled_tool_alternative',
  derivedNumberUndetermined: 'derived_number_undetermined',
  reconstructionUnprovable: 'reconstruction_unprovable',
} as const);

export type LevelUpWarningKey =
  (typeof LEVEL_UP_WARNING_KEYS)[keyof typeof LEVEL_UP_WARNING_KEYS];

export interface LevelUpWarningPresentation {
  readonly key: LevelUpWarningKey;
  readonly category:
    | 'outstanding_choice'
    | 'rules_condition'
    | 'reconstruction_gap';
  readonly title: string;
}

const WARNING_PRESENTATIONS: Readonly<
  Record<LevelUpWarningKey, LevelUpWarningPresentation>
> = Object.freeze({
  spell_choice_unfilled: {
    key: 'spell_choice_unfilled',
    category: 'outstanding_choice',
    title: 'Spell choice still needed',
  },
  source_option_unselected: {
    key: 'source_option_unselected',
    category: 'outstanding_choice',
    title: 'Feature option still needed',
  },
  skill_grant_unfilled: {
    key: 'skill_grant_unfilled',
    category: 'outstanding_choice',
    title: 'Skill choice still needed',
  },
  expertise_grant_unfilled: {
    key: 'expertise_grant_unfilled',
    category: 'outstanding_choice',
    title: 'Expertise choice still needed',
  },
  expertise_grant_orphaned: {
    key: 'expertise_grant_orphaned',
    category: 'rules_condition',
    title: 'Expertise no longer has an underlying proficiency',
  },
  subclass_unselected: {
    key: 'subclass_unselected',
    category: 'outstanding_choice',
    title: 'Subclass choice still needed',
  },
  epic_boon_deferred: {
    key: 'epic_boon_deferred',
    category: 'outstanding_choice',
    title: 'Epic Boon choice still needed',
  },
  multiclass_primary_ability_unmet: {
    key: 'multiclass_primary_ability_unmet',
    category: 'rules_condition',
    title: 'Multiclass ability minimum not met',
  },
  multiclass_primary_ability_unprovable: {
    key: 'multiclass_primary_ability_unprovable',
    category: 'rules_condition',
    title: 'Multiclass ability minimum cannot be verified',
  },
  feat_benefit_unmodelled: {
    key: 'feat_benefit_unmodelled',
    category: 'rules_condition',
    title: 'Feat benefit requires table adjudication',
  },
  unmodelled_tool_alternative: {
    key: 'unmodelled_tool_alternative',
    category: 'rules_condition',
    title: 'Tool choice is not modelled',
  },
  derived_number_undetermined: {
    key: 'derived_number_undetermined',
    category: 'rules_condition',
    title: 'A derived number cannot be determined exactly',
  },
  reconstruction_unprovable: {
    key: 'reconstruction_unprovable',
    category: 'reconstruction_gap',
    title: 'Reconstruction could not prove this fact',
  },
});

export function levelUpWarningPresentation(
  key: LevelUpWarningKey,
): LevelUpWarningPresentation {
  return WARNING_PRESENTATIONS[key];
}
