/**
 * The level-up wizard's extract-free seam.
 *
 * These values are pinned before the read model, command extensions and UI
 * depend on them. Keep SRD readers out of this module so node-side RPC and
 * browser test processes can import the contract without a Vite `?raw` edge.
 */
import type { Skill } from '../domain/enums';
import type {
  CharacterId,
  CharacterRevision,
  ClassDefinitionId,
  ClassLevel,
  GrantOrdinal,
  GrantRuleKey,
  SourceInstanceId,
  SpellVersionId,
} from '../domain/ids';
import type { EligibleSpell } from '../domain/read-models';

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

export type PlannedGrantSource =
  | { readonly kind: 'selected_class' }
  | { readonly kind: 'selected_class_subclass' }
  | { readonly kind: 'selected_feat' }
  | {
      readonly kind: 'existing_source';
      readonly source_instance_id: SourceInstanceId;
    };

export interface PlannedGrantLocator {
  readonly source: PlannedGrantSource;
  readonly rule_key: GrantRuleKey;
  readonly ordinal: GrantOrdinal;
}

export type PlannedSpellChoice =
  | {
      readonly kind: 'slot_selection';
      readonly locator: PlannedGrantLocator;
      readonly spell_version_id: SpellVersionId;
      readonly mode: 'new' | 'replace';
    }
  | {
      readonly kind: 'spellbook_acquisition';
      readonly locator: PlannedGrantLocator;
      readonly spell_version_id: SpellVersionId;
    };

export interface PlannedSkillChoice {
  readonly locator: PlannedGrantLocator;
  readonly skill: Skill;
}

export interface PlannedExpertiseChoice {
  readonly locator: PlannedGrantLocator;
  readonly skill: Skill;
}

export interface LevelUpPlannedEligibleSpellsParams {
  readonly character_id: CharacterId;
  readonly expected_revision: CharacterRevision;
  readonly class_definition_id: ClassDefinitionId;
  readonly target_class_level: ClassLevel;
  readonly locator: PlannedGrantLocator;
  readonly query: string;
}

export type LevelUpPlannedEligibleSpellsResult =
  readonly EligibleSpell[];

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
