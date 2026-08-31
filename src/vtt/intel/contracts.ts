import type { PendingDecision, PendingDecisionOption } from '../../combat/encounter';
import type { Brand } from '../../domain/ids';

/**
 * Existing evaluator verdicts remain the source vocabulary for domain-specific
 * unresolved reasons. Intel providers can expose them without translating to
 * an untyped warning string.
 */
export type {
  TacticalDamageVerdict,
  TacticalProbabilityVerdict,
  TacticalRangeVerdict,
  TacticalUnresolvedReason,
} from '../../combat/tactical-evaluator';
export type {
  MovementAttackContextUnresolvedReason,
  MovementEvaluation,
} from '../../combat/movement-evaluator';
export type {
  ConcentrationDamageVerdict,
  ConcentrationStartVerdict,
  ConcentrationStateVerdict,
  ConcentrationZoneEvaluation,
  ZoneCoverageVerdict,
  ZoneMembershipDelta,
} from '../../combat/concentration-evaluator';

type EmptyIntelFields = Readonly<Record<never, never>>;

/** The resolved half of the evaluators' existing `status` discriminant. */
export type ResolvedIntel<Fields extends object = EmptyIntelFields> = Readonly<
  { readonly status: 'resolved' } & Fields
>;

/** The unresolved half of the evaluators' existing `status`/`reason` shape. */
export type UnresolvedIntel<
  Reason extends string,
  Fields extends object = EmptyIntelFields,
> = Readonly<{
  readonly status: 'unresolved';
  readonly reason: Reason;
} & Fields>;

/** Provider-neutral resolved/unresolved result with domain-owned reason codes. */
export type IntelResult<
  ResolvedFields extends object,
  Reason extends string,
  UnresolvedFields extends object = EmptyIntelFields,
> = ResolvedIntel<ResolvedFields> | UnresolvedIntel<Reason, UnresolvedFields>;

/** A policy literal branded so an unversioned string cannot cross the seam. */
export type IntelPolicyVersion<Version extends string = string> = Brand<
  Version,
  'IntelPolicyVersion'
>;

/** Establishes a compile-time `*-vN` policy literal at its declaration site. */
export function intelPolicyVersion<const Version extends `${string}-v${number}`>(
  version: Version,
): IntelPolicyVersion<Version> {
  return version as IntelPolicyVersion<Version>;
}

/** Shared envelope returned by an intel provider. */
export type IntelProviderResult<
  Policy extends IntelPolicyVersion,
  ResolvedFields extends object,
  Reason extends string,
  UnresolvedFields extends object = EmptyIntelFields,
> = Readonly<{ readonly policy: Policy }> & IntelResult<
  ResolvedFields,
  Reason,
  UnresolvedFields
>;

/** JSON-safe exact rational; only the normalizing factory establishes the brand. */
export type ExactRational = Brand<Readonly<{
  readonly numerator: number;
  readonly denominator: number;
}>, 'ExactRational'>;

/** An exact rational additionally constrained to the closed interval [0, 1]. */
export type ExactProbability = Brand<ExactRational, 'ExactProbability'>;

function greatestCommonDivisor(left: number, right: number): number {
  let remainderLeft = Math.abs(left);
  let remainderRight = Math.abs(right);
  while (remainderRight !== 0) {
    const next = remainderLeft % remainderRight;
    remainderLeft = remainderRight;
    remainderRight = next;
  }
  return remainderLeft;
}

/** Creates a normalized rational or refuses values that cannot be exact JSON integers. */
export function exactRational(numerator: number, denominator: number): ExactRational {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new RangeError('Exact rationals require safe-integer terms and a non-zero denominator.');
  }
  if (numerator === 0) {
    return Object.freeze({ numerator: 0, denominator: 1 }) as ExactRational;
  }
  const sign = denominator < 0 ? -1 : 1;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return Object.freeze({
    numerator: sign * numerator / divisor,
    denominator: sign * denominator / divisor,
  }) as ExactRational;
}

/** Creates an exact probability while enforcing its [0, 1] range. */
export function exactProbability(numerator: number, denominator: number): ExactProbability {
  const value = exactRational(numerator, denominator);
  if (value.numerator < 0 || value.numerator > value.denominator) {
    throw new RangeError('Exact probabilities must be between zero and one inclusive.');
  }
  return value as ExactProbability;
}

/** Deliberately lossy scalar for UI sorting and coarse display only. */
export function coarseRationalValue(value: ExactRational): number {
  return value.numerator / value.denominator;
}

export type CoarseRenderStyle = 'number' | 'percentage';

/** Rendering metadata; the exact rational remains the authoritative value. */
export interface CoarseRenderHook {
  readonly style: CoarseRenderStyle;
  readonly maximumFractionDigits: number;
}

export interface NormalizedExpectedValue {
  readonly exact: ExactRational;
  readonly coarse: CoarseRenderHook & { readonly style: 'number' };
}

export interface NormalizedProbability {
  readonly exact: ExactProbability;
  readonly coarse: CoarseRenderHook & { readonly style: 'percentage' };
}

/** Named metrics let each provider add semantics without changing this seam. */
export interface NormalizedOptionMetrics<
  ExpectedValueMetric extends string,
  ProbabilityMetric extends string,
> {
  readonly expectedValues: Readonly<
    Record<ExpectedValueMetric, NormalizedExpectedValue>
  >;
  readonly probabilities: Readonly<
    Record<ProbabilityMetric, NormalizedProbability>
  >;
}

export type DominanceObjective = 'maximize' | 'minimize';

export interface DominanceCoordinate {
  readonly exact: ExactRational;
  readonly objective: DominanceObjective;
}

export type DominanceVector<Metric extends string> = Readonly<
  Record<Metric, DominanceCoordinate>
>;

export type DominanceMetricComparison =
  | 'left_better'
  | 'equal'
  | 'right_better';

export type DominanceRelation =
  | 'left_dominates'
  | 'right_dominates'
  | 'equal'
  | 'incomparable';

export interface DominanceComparison<Metric extends string> {
  readonly relation: DominanceRelation;
  readonly perMetric: Readonly<Record<Metric, DominanceMetricComparison>>;
}

type MetricKeys<Vector> = Extract<keyof Vector, string>;

/** Positive type predicate used by callers and compile-time contract tests. */
export type SameDominanceMetricSet<Left, Right> = [
  Exclude<MetricKeys<Left>, MetricKeys<Right>> |
  Exclude<MetricKeys<Right>, MetricKeys<Left>>,
] extends [never]
  ? true
  : false;

/** A mismatched pair has no comparison type and therefore cannot enter M5. */
export type DominanceComparisonFor<Left, Right> =
  SameDominanceMetricSet<Left, Right> extends true
    ? DominanceComparison<MetricKeys<Left>>
    : never;

function compareRationals(left: ExactRational, right: ExactRational): -1 | 0 | 1 {
  const leftProduct = BigInt(left.numerator) * BigInt(right.denominator);
  const rightProduct = BigInt(right.numerator) * BigInt(left.denominator);
  return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
}

/**
 * Compares two vectors only when their metric keys match exactly. Objectives
 * are carried per metric so a no-worse/better result cannot reverse a cost.
 */
export function compareDominanceVectors<
  const Left extends DominanceVector<string>,
  const Right extends DominanceVector<string>,
>(
  left: Left,
  right: Right & (SameDominanceMetricSet<Left, Right> extends true ? unknown : never),
): DominanceComparisonFor<Left, Right>;
export function compareDominanceVectors(
  left: DominanceVector<string>,
  right: DominanceVector<string>,
): DominanceComparison<string> {
  const leftMetrics = Object.keys(left).sort();
  const rightMetrics = Object.keys(right).sort();
  if (leftMetrics.length !== rightMetrics.length ||
    leftMetrics.some((metric, index) => metric !== rightMetrics[index])) {
    throw new TypeError('Dominance vectors must contain the same metric set.');
  }

  const perMetric: Record<string, DominanceMetricComparison> = {};
  let leftBetter = false;
  let rightBetter = false;
  for (const metric of leftMetrics) {
    const leftCoordinate = left[metric];
    const rightCoordinate = right[metric];
    if (leftCoordinate === undefined || rightCoordinate === undefined ||
      leftCoordinate.objective !== rightCoordinate.objective) {
      throw new TypeError(`Dominance objective mismatch for metric ${metric}.`);
    }
    const raw = compareRationals(leftCoordinate.exact, rightCoordinate.exact);
    const oriented = leftCoordinate.objective === 'maximize' ? raw : -raw;
    const comparison = oriented > 0
      ? 'left_better'
      : oriented < 0
        ? 'right_better'
        : 'equal';
    perMetric[metric] = comparison;
    leftBetter ||= comparison === 'left_better';
    rightBetter ||= comparison === 'right_better';
  }
  return {
    relation: leftBetter && rightBetter
      ? 'incomparable'
      : leftBetter
        ? 'left_dominates'
        : rightBetter
          ? 'right_dominates'
          : 'equal',
    perMetric,
  };
}

export type ReactionPendingDecision = Extract<
  PendingDecision,
  { readonly kind: 'reaction_offer' }
>;
export type LegendaryActionPendingDecision = Extract<
  PendingDecision,
  { readonly kind: 'legendary_action_window' }
>;
export type LegendaryResistancePendingDecision = Extract<
  PendingDecision,
  { readonly kind: 'legendary_resistance' }
>;
export type IntelBoundaryPendingDecision =
  | ReactionPendingDecision
  | LegendaryActionPendingDecision
  | LegendaryResistancePendingDecision;

export type ReactionPendingDecisionOption = ReactionPendingDecision['options'][number];
export type LegendaryActionPendingDecisionOption =
  LegendaryActionPendingDecision['options'][number];
export type LegendaryResistancePendingDecisionOption =
  LegendaryResistancePendingDecision['options'][number];

/** One engine-owned pending option plus provider-owned metrics or a typed gap. */
export type BoundaryIntelOption<
  Option extends PendingDecisionOption,
  Metrics extends NormalizedOptionMetrics<string, string>,
  Reason extends string,
> = Readonly<Option & {
  readonly evaluation: IntelResult<{ readonly metrics: Metrics }, Reason>;
}>;

type BoundaryIntelOptions<
  Options extends readonly PendingDecisionOption[],
  Metrics extends NormalizedOptionMetrics<string, string>,
  Reason extends string,
> = {
  readonly [Index in keyof Options]: Options[Index] extends PendingDecisionOption
    ? BoundaryIntelOption<Options[Index], Metrics, Reason>
    : Options[Index];
};

/** Boundary report whose option tuple is derived from the engine decision. */
export type BoundaryIntel<
  Decision extends IntelBoundaryPendingDecision,
  Policy extends IntelPolicyVersion,
  Metrics extends NormalizedOptionMetrics<string, string>,
  Reason extends string,
> = Readonly<{
  readonly policy: Policy;
  readonly decisionId: Decision['id'];
  readonly kind: Decision['kind'];
  readonly combatant: Decision['combatant'];
  readonly boundary: Decision['boundary'];
  readonly options: BoundaryIntelOptions<Decision['options'], Metrics, Reason>;
}>;

export type ReactionBoundaryIntel<
  Policy extends IntelPolicyVersion,
  Metrics extends NormalizedOptionMetrics<string, string>,
  Reason extends string,
> = BoundaryIntel<ReactionPendingDecision, Policy, Metrics, Reason>;

export type LegendaryActionBoundaryIntel<
  Policy extends IntelPolicyVersion,
  Metrics extends NormalizedOptionMetrics<string, string>,
  Reason extends string,
> = BoundaryIntel<LegendaryActionPendingDecision, Policy, Metrics, Reason>;

export type LegendaryResistanceBoundaryIntel<
  Policy extends IntelPolicyVersion,
  Metrics extends NormalizedOptionMetrics<string, string>,
  Reason extends string,
> = BoundaryIntel<LegendaryResistancePendingDecision, Policy, Metrics, Reason>;

/** Conditions whose physical manifestation can be projected without exposing a hidden cause. */
export type PerceivedConditionName =
  | 'Blinded'
  | 'Grappled'
  | 'Paralyzed'
  | 'Petrified'
  | 'Prone'
  | 'Restrained'
  | 'Stunned'
  | 'Unconscious';

/** One positively observed condition; absence from the list does not prove absence. */
export interface PerceivedConditionMarker {
  readonly kind: 'perceived';
  readonly condition: PerceivedConditionName;
}

export type ProjectedArmorClassKnowledge =
  | { readonly kind: 'unknown' }
  | {
      readonly kind: 'perceived_band';
      readonly band: 'lightly_defended' | 'guarded' | 'heavily_defended';
    };

export type ProjectedHitPointKnowledge =
  | { readonly kind: 'unknown' }
  | {
      readonly kind: 'perceived_band';
      readonly band: 'uninjured' | 'bloodied' | 'near_death';
    };

/** A positive sight observation is public; lack of one does not prove blindness. */
export type ProjectedReciprocalVisibility =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'perceived'; readonly targetCanSeeActor: true };

/** Only a public spend is knowable; an apparently unspent reaction remains unknown. */
export type ProjectedReactionKnowledge =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'observed_spent' };
