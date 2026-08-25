import type { EncounterCommand } from '../combat/events';
import type { NonBoundaryRefusalClass } from '../combat/encounter-rule-error';
import type { CombatantId } from '../combat/values';

export const REFUSAL_CATEGORIES = [
  'rule_gap',
  'unmodeled_interaction',
  'validation',
] as const;
export type RefusalCategory = (typeof REFUSAL_CATEGORIES)[number];

export const REFUSAL_HANDLING_MODES = [
  'tray_fiat_prompt',
  'refuse_with_citation',
  'default_and_log',
] as const;
export type RefusalHandlingMode = (typeof REFUSAL_HANDLING_MODES)[number];

export type RefusalDefaultOutcome = { readonly kind: 'no_effect' };

export type RefusalCategoryDefinition =
  | {
      readonly defaultResolution: {
        readonly documentation: string;
        readonly outcome: RefusalDefaultOutcome;
      };
    }
  | { readonly defaultResolution: null };

export const REFUSAL_CATEGORY_DEFINITIONS = {
  rule_gap: {
    defaultResolution: {
      documentation: 'Assumed the action has no mechanical effect because the required rule is not modeled.',
      outcome: { kind: 'no_effect' },
    },
  },
  unmodeled_interaction: {
    defaultResolution: {
      documentation: 'Assumed the unmodeled interaction produces no additional mechanical effect.',
      outcome: { kind: 'no_effect' },
    },
  },
  validation: { defaultResolution: null },
} as const satisfies Readonly<Record<RefusalCategory, RefusalCategoryDefinition>>;

export const REFUSAL_CLASS_CATEGORIES = {
  validation: 'validation',
  rule_gap: 'rule_gap',
  unmodeled_interaction: 'unmodeled_interaction',
  revivify_validation: 'validation',
  vision_targeting_validation: 'validation',
  target_selection_validation: 'validation',
  equipment_validation: 'validation',
  sustained_activation_validation: 'validation',
  wild_shape_validation: 'validation',
} as const satisfies Readonly<Record<NonBoundaryRefusalClass, RefusalCategory>>;

export type RefusalHandlingSettings = {
  readonly [Category in RefusalCategory]:
    (typeof REFUSAL_CATEGORY_DEFINITIONS)[Category]['defaultResolution'] extends null
      ? Exclude<RefusalHandlingMode, 'default_and_log'>
      : RefusalHandlingMode;
};

export const DEFAULT_REFUSAL_HANDLING_SETTINGS: RefusalHandlingSettings = {
  rule_gap: 'refuse_with_citation',
  unmodeled_interaction: 'refuse_with_citation',
  validation: 'refuse_with_citation',
};

export interface NonBoundaryActionRefusal {
  readonly refusalClass: NonBoundaryRefusalClass;
  readonly category: RefusalCategory;
  readonly reason: string;
  readonly citation: `engine:${NonBoundaryRefusalClass}`;
  readonly command: EncounterCommand;
  readonly combatant: CombatantId;
}

export type RefusalRoute =
  | { readonly kind: 'hard_refusal'; readonly refusal: NonBoundaryActionRefusal }
  | { readonly kind: 'fiat_prompt'; readonly refusal: NonBoundaryActionRefusal }
  | {
      readonly kind: 'documented_default';
      readonly refusal: NonBoundaryActionRefusal;
      readonly documentation: string;
      readonly outcome: RefusalDefaultOutcome;
    };

export function routeActionRefusal(
  settings: RefusalHandlingSettings,
  refusal: NonBoundaryActionRefusal,
): RefusalRoute {
  const mode = settings[refusal.category];
  if (mode === 'refuse_with_citation') return { kind: 'hard_refusal', refusal };
  if (mode === 'tray_fiat_prompt') return { kind: 'fiat_prompt', refusal };
  const declared = REFUSAL_CATEGORY_DEFINITIONS[refusal.category].defaultResolution;
  if (declared === null) throw new Error(`${refusal.category} has no default resolution.`);
  return { kind: 'documented_default', refusal, ...declared };
}

export function handlingModesForCategory(
  category: RefusalCategory,
): readonly RefusalHandlingMode[] {
  return REFUSAL_CATEGORY_DEFINITIONS[category].defaultResolution === null
    ? ['tray_fiat_prompt', 'refuse_with_citation']
    : REFUSAL_HANDLING_MODES;
}
