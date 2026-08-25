export const ENCOUNTER_REFUSAL_CLASSES = [
  'validation',
  'rule_gap',
  'unmodeled_interaction',
  'revivify_validation',
  'vision_targeting_validation',
  'target_selection_validation',
  'equipment_validation',
  'sustained_activation_validation',
  'wild_shape_validation',
  'pending_decision_boundary',
  'pending_decision_validation',
] as const;

export type EncounterRefusalClass = (typeof ENCOUNTER_REFUSAL_CLASSES)[number];

export type NonBoundaryRefusalClass = Exclude<
  EncounterRefusalClass,
  'pending_decision_boundary' | 'pending_decision_validation'
>;

export class EncounterRuleError extends Error {
  override readonly name: string = 'EncounterRuleError';

  constructor(
    readonly refusalClass: EncounterRefusalClass,
    readonly reason: string,
  ) {
    super(reason);
  }
}
