import type { SheetGap } from '../queries/character-sheet-builder';
import type { SheetWarning } from '../rules/sheet';
import bundledSrd521 from '../../docs/srd/full/srd-5.2.1.txt?raw';
import {
  BUNDLED_SRD_5_2_1_PATH,
  sourceStableKey,
  unmodelledIssueKinds,
  unmodelledIssueId,
  type BundledSrdHeading,
  type PublicSourceRef,
  type SaveSuccessOutcome,
  type SourceRef,
  type SourceStableKey,
  type UnmodelledIssue,
  type UnmodelledIssueKind,
} from './contracts';

export type CoverageClassification =
  | 'blocking'
  | 'contextual'
  | 'display_only';

type SheetWarningCode = SheetWarning['code'];
type SheetGapKind = SheetGap['kind'];

/**
 * Exhaustive by construction: a newly added sheet warning cannot silently
 * acquire a simulation meaning. Contextual warnings need a structured routine
 * check in the later assembler; they are never interpreted from message text.
 */
export const sheetWarningCoverage = {
  no_starting_class: 'blocking',
  several_starting_classes: 'blocking',
  strength_requirement_unmet: 'display_only',
  armor_slot_mismatch: 'display_only',
  assumed_hit_die: 'display_only',
  roll_exceeds_hit_die: 'display_only',
  armor_value_out_of_vocabulary: 'display_only',
  total_level_exceeds_maximum: 'contextual',
  weapon_not_proficient: 'contextual',
  weapon_category_not_stated: 'contextual',
  weapon_proficiency_qualifier_unread: 'contextual',
  armor_not_trained: 'display_only',
  multiclass_primary_ability_unmet: 'display_only',
  multiclass_primary_ability_unprovable: 'display_only',
} as const satisfies Record<SheetWarningCode, CoverageClassification>;

/** See `sheetWarningCoverage`; the same compile-time completeness rule applies. */
export const sheetGapCoverage = {
  no_class_feature_text: 'contextual',
  partial_subclass_catalog: 'display_only',
  expertise_choice_unfilled: 'display_only',
  expertise_proficiency_removed: 'display_only',
  languages_and_tools_not_modelled: 'display_only',
  weapon_reach_not_recorded: 'contextual',
  gear_not_itemised: 'display_only',
  required_source_choice: 'contextual',
} as const satisfies Record<SheetGapKind, CoverageClassification>;

export const unmodelledIssuePriority = {
  routine_selection_required: 10,
  target_save_bonus_required: 20,
  damage_response_required: 30,
  attack_bonus_undetermined: 40,
  weapon_damage_not_recorded: 50,
  damage_type_choice_unresolved: 60,
  unresolved_extra_attack: 70,
  spellcasting_statistic_absent: 80,
  feature_value_unavailable: 90,
  resource_maximum_unavailable: 100,
  resource_recovery_not_modeled: 110,
  routine_requires_unavailable_resource: 120,
  setup_action_not_modeled: 130,
  trigger_frequency_not_quantified: 140,
  summon_stat_block_not_modeled: 150,
  unsupported_damage_relevant_feature: 160,
  unknown_feature_relevance: 170,
  unsupported_multi_target_effect: 180,
  unsupported_reaction_or_enemy_turn_damage: 190,
} as const satisfies Record<UnmodelledIssueKind, number>;

export const compactIssueMessages = {
  routine_selection_required: 'Choose a routine to calculate this character.',
  target_save_bonus_required: 'Enter the target save bonus this routine needs.',
  damage_response_required: 'Choose how the target responds to this damage.',
  attack_bonus_undetermined: 'Resolve the attack bonus for this routine.',
  weapon_damage_not_recorded: 'Record the weapon damage for this routine.',
  damage_type_choice_unresolved: 'Choose the damage type for this routine.',
  unresolved_extra_attack: 'Resolve which weapon receives the extra attack.',
  spellcasting_statistic_absent: 'Resolve the spellcasting statistic.',
  feature_value_unavailable: 'A required feature value is unavailable.',
  resource_maximum_unavailable: 'A required resource maximum is unavailable.',
  resource_recovery_not_modeled: 'This resource recovery is not modelled.',
  routine_requires_unavailable_resource: 'This routine needs an unavailable resource.',
  setup_action_not_modeled: 'This routine has an unmodelled setup action.',
  trigger_frequency_not_quantified: 'This trigger frequency cannot be quantified.',
  summon_stat_block_not_modeled: 'This summoned creature is not modelled.',
  unsupported_damage_relevant_feature: 'A damage-relevant feature is unsupported.',
  unknown_feature_relevance: 'The app cannot determine whether a feature changes damage.',
  unsupported_multi_target_effect: 'Multiple-target damage is unavailable.',
  unsupported_reaction_or_enemy_turn_damage: 'Enemy-turn or reaction damage is unavailable.',
} as const satisfies Record<UnmodelledIssueKind, string>;

export function compactIssueMessage(kind: UnmodelledIssueKind): string {
  return compactIssueMessages[kind];
}

const sourceKindRank = {
  character_source: 1,
  catalog_content: 2,
  character_weapon: 3,
} as const satisfies Record<SourceRef['kind'], number>;

function sourceStableValue(source: SourceRef | null): string {
  return source?.stable_key ?? '<no-source>';
}

function compareStableText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createUnmodelledIssue(input: {
  readonly kind: UnmodelledIssueKind;
  readonly source: SourceRef | null;
  readonly discriminator: string;
  readonly detail: string;
  readonly why_it_changes_damage: string;
  readonly remedy: string | null;
}): UnmodelledIssue {
  const stableId = [
    input.kind,
    sourceStableValue(input.source),
    input.discriminator,
  ]
    .map(encodeURIComponent)
    .join(':');
  return {
    id: unmodelledIssueId(stableId),
    kind: input.kind,
    source: input.source,
    detail: input.detail,
    why_it_changes_damage: input.why_it_changes_damage,
    remedy: input.remedy,
  };
}

export function orderUnmodelledIssues(
  issues: readonly UnmodelledIssue[],
): UnmodelledIssue[] {
  return [...issues].sort((left, right) => {
    const priority =
      unmodelledIssuePriority[left.kind] -
      unmodelledIssuePriority[right.kind];
    if (priority !== 0) {
      return priority;
    }
    const leftSourceRank = left.source === null ? 0 : sourceKindRank[left.source.kind];
    const rightSourceRank =
      right.source === null ? 0 : sourceKindRank[right.source.kind];
    if (leftSourceRank !== rightSourceRank) {
      return leftSourceRank - rightSourceRank;
    }
    const stableKey = compareStableText(
      sourceStableValue(left.source),
      sourceStableValue(right.source),
    );
    return stableKey !== 0 ? stableKey : compareStableText(left.id, right.id);
  });
}

export const publicProbabilityMechanicKinds = [
  'attack_roll',
  'natural_one_and_twenty',
  'advantage_and_disadvantage',
  'saving_throw',
  'damage_roll',
  'critical_hit',
  'save_half_damage',
  'resistance',
  'vulnerability',
  'damage_order',
  'immunity',
] as const;
export type PublicProbabilityMechanicKind =
  (typeof publicProbabilityMechanicKinds)[number];

const reviewedBundledSrdHeadings = [
  'Acid Splash',
  'Advantage/Disadvantage',
  'Attack Rolls',
  'Critical Hits',
  'Damage Rolls',
  'Fireball',
  'Half Damage',
  'Immunity',
  'Order of Application',
  'Resistance and Vulnerability',
  'Rolling 20 or 1',
  'Saving Throws',
] as const;

type ReviewedBundledSrdHeading =
  (typeof reviewedBundledSrdHeadings)[number];

const bundledSrdLineSegments = new Set(
  bundledSrd521
    .split(/\r?\n/u)
    .flatMap((line) => line.split(/\s{2,}/u))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0),
);

/**
 * The sole constructor for bundled proof references. A heading must be in the
 * reviewed citation vocabulary and must occur as a complete column segment in
 * the bundled two-column SRD text. The brand prevents unchecked object literals
 * from satisfying any proof-bearing `PublicSourceRef` field.
 */
export function bundledSrdSourceRef(heading: unknown): PublicSourceRef {
  if (
    typeof heading !== 'string' ||
    !reviewedBundledSrdHeadings.some((candidate) => candidate === heading) ||
    !bundledSrdLineSegments.has(heading)
  ) {
    throw new TypeError(
      `Bundled SRD heading is not a reviewed literal heading: ${String(heading)}.`,
    );
  }
  return {
    kind: 'bundled_srd',
    path: BUNDLED_SRD_5_2_1_PATH,
    heading: heading as BundledSrdHeading,
  };
}

const bundledHeading = (
  heading: ReviewedBundledSrdHeading,
): PublicSourceRef => bundledSrdSourceRef(heading);

/**
 * The complete Stage 2B rules inventory. Each entry points to the bundled,
 * redistributable SRD text that authorizes and defines the mechanic. Functions
 * in `probability.ts` cite these entries beside the fold they implement.
 */
export const publicProbabilityCoverageManifest = {
  attack_roll: bundledHeading('Attack Rolls'),
  natural_one_and_twenty: bundledHeading('Rolling 20 or 1'),
  advantage_and_disadvantage: bundledHeading('Advantage/Disadvantage'),
  saving_throw: bundledHeading('Saving Throws'),
  damage_roll: bundledHeading('Damage Rolls'),
  critical_hit: bundledHeading('Critical Hits'),
  // `Half Damage` is the literal right-column heading beneath the parent
  // `Saving Throws and Damage` section in the bundled text.
  save_half_damage: bundledHeading('Half Damage'),
  resistance: bundledHeading('Resistance and Vulnerability'),
  vulnerability: bundledHeading('Resistance and Vulnerability'),
  damage_order: bundledHeading('Order of Application'),
  immunity: bundledHeading('Immunity'),
} as const satisfies Record<PublicProbabilityMechanicKind, PublicSourceRef>;

export const reviewedSaveEffectStableKeys = {
  acid_splash: sourceStableKey('srd-5.2.1:spell:acid-splash'),
  fireball: sourceStableKey('srd-5.2.1:spell:fireball'),
} as const;

type ReviewedSaveSuccessClause = {
  readonly kind: SaveSuccessOutcome['kind'];
  readonly evidence: PublicSourceRef;
};

export const reviewedSaveSuccessClauses = {
  acid_splash: {
    kind: 'none',
    evidence: bundledHeading('Acid Splash'),
  },
  fireball: {
    kind: 'half',
    evidence: bundledHeading('Fireball'),
  },
} as const satisfies Record<string, ReviewedSaveSuccessClause>;

/**
 * Reviewed success clauses keyed by the effect's own stable identity. Acid
 * Splash itself states that a successful save deals no damage. Fireball itself
 * states that a successful save deals half damage. The general SRD `Half
 * Damage` rule remains the fold's math citation above, but cannot authorize a
 * particular effect.
 */
export const saveSuccessOutcomeEvidenceManifest: ReadonlyMap<
  SourceStableKey,
  ReviewedSaveSuccessClause
> = new Map<SourceStableKey, ReviewedSaveSuccessClause>([
  [reviewedSaveEffectStableKeys.acid_splash, reviewedSaveSuccessClauses.acid_splash],
  [reviewedSaveEffectStableKeys.fireball, reviewedSaveSuccessClauses.fireball],
]);

function samePublicSource(left: PublicSourceRef, right: PublicSourceRef): boolean {
  if (left.kind !== right.kind || left.path !== right.path) {
    return false;
  }
  return left.kind === 'project_owned' ||
    (right.kind === 'bundled_srd' && left.heading === right.heading);
}

/**
 * A general saving-throw rule does not establish an individual effect's
 * success clause. Only reviewed, code-owned entries may authorize a numeric
 * success arm; an empty arm remains explicitly unsupported.
 */
export function saveSuccessOutcomeHasEvidence(
  effect: SourceRef,
  outcome: SaveSuccessOutcome,
): boolean {
  const expected = saveSuccessOutcomeEvidenceManifest.get(
    effect.stable_key,
  );
  return expected !== undefined &&
    expected.kind === outcome.kind &&
    samePublicSource(outcome.evidence, expected.evidence);
}

export function criticalHitHasEvidence(evidence: PublicSourceRef): boolean {
  return samePublicSource(
    evidence,
    publicProbabilityCoverageManifest.critical_hit,
  );
}

// A set-equality assertion at runtime complements the `satisfies` compile gate.
export function probabilityManifestIsComplete(): boolean {
  return (
    Object.keys(publicProbabilityCoverageManifest).length ===
      publicProbabilityMechanicKinds.length &&
    unmodelledIssueKinds.length === Object.keys(unmodelledIssuePriority).length
  );
}
