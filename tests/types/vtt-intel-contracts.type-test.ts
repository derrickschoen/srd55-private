import type {
  ConcentrationDamageVerdict,
  DominanceComparisonFor,
  DominanceVector,
  ExactProbability,
  ExactRational,
  IntelPolicyVersion,
  IntelProviderResult,
  IntelResult,
  LegendaryActionPendingDecisionOption,
  LegendaryResistancePendingDecisionOption,
  MovementEvaluation,
  NormalizedOptionMetrics,
  ReactionBoundaryIntel,
  ReactionPendingDecisionOption,
  SameDominanceMetricSet,
  TacticalProbabilityVerdict,
  UnresolvedIntel,
} from '../../src/vtt/intel/contracts';

type Assert<Condition extends true> = Condition;
type Exact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
        ? true
        : false
    : false;

type AttackProbabilityShape = IntelResult<{
  readonly hit: number;
  readonly critical: number;
  readonly miss: number;
},
  | 'attack_out_of_range'
  | 'long_range_unresolved'
  | 'target_armor_class_unresolved'
  | 'random_attack_modifier_unresolved'
  | 'target_has_total_cover'>;

type _TacticalVerdictUsesSharedDiscriminant = Assert<
  Exact<TacticalProbabilityVerdict, AttackProbabilityShape>
>;

type MovementUnresolved = Extract<
  MovementEvaluation['earliestAttackTurn'],
  { readonly status: 'unresolved' }
>;
type _MovementVerdictUsesSharedUnresolvedShape = Assert<
  MovementUnresolved extends UnresolvedIntel<
    | 'attack_context_unresolved'
    | 'attack_range_unresolved'
    | 'effective_speed_unresolved'
  >
    ? true
    : false
>;

type ConcentrationUnresolved = Extract<
  ConcentrationDamageVerdict,
  { readonly status: 'unresolved' }
>;
type _ConcentrationReasonsStayTyped = Assert<
  Exact<
    ConcentrationUnresolved['reason'],
    'damage_not_mechanically_represented' | 'constitution_save_bonus_unknown'
  >
>;

type TestMetrics = NormalizedOptionMetrics<
  'expected_damage' | 'expected_healing',
  'hit' | 'survival'
>;
type _ExpectedValuesAreExactRationals = Assert<
  Exact<TestMetrics['expectedValues']['expected_damage']['exact'], ExactRational>
>;
type _ProbabilitiesAreBrandedExactRationals = Assert<
  Exact<TestMetrics['probabilities']['hit']['exact'], ExactProbability>
>;
type _ProbabilityRenderingIsPercentage = Assert<
  Exact<TestMetrics['probabilities']['survival']['coarse']['style'], 'percentage'>
>;

type TestPolicy = IntelPolicyVersion<'test-intel-v1'>;
type _RawPolicyStringIsRejected = Assert<
  'test-intel-v1' extends TestPolicy ? false : true
>;
type _PolicyVersionsAreNotInterchangeable = Assert<
  IntelPolicyVersion<'test-intel-v2'> extends TestPolicy ? false : true
>;
type TestProviderResult = IntelProviderResult<
  TestPolicy,
  { readonly metrics: TestMetrics },
  'target_unresolved'
>;
type _ProviderEnvelopeComposes = Assert<
  Exact<TestProviderResult['policy'], TestPolicy>
>;

type DamageAndCost = DominanceVector<'expected_damage' | 'resource_cost'>;
type DamageAndRisk = DominanceVector<'expected_damage' | 'failure_risk'>;
type _MatchingDominanceSetsCompare = Assert<
  SameDominanceMetricSet<DamageAndCost, DamageAndCost>
>;
type _MismatchedDominanceSetsAreRejected = Assert<
  SameDominanceMetricSet<DamageAndCost, DamageAndRisk> extends false ? true : false
>;
type _MismatchedDominanceComparisonCannotExist = Assert<
  Exact<DominanceComparisonFor<DamageAndCost, DamageAndRisk>, never>
>;

type _ReactionOptionIdsStayClosed = Assert<
  Exact<ReactionPendingDecisionOption['id'], 'accept' | 'decline'>
>;
type _LegendaryActionOptionIdsStayClosed = Assert<
  Exact<
    LegendaryActionPendingDecisionOption['id'],
    `legendary_action:${string}` | 'pass'
  >
>;
type _LegendaryResistanceOptionIdsStayClosed = Assert<
  Exact<LegendaryResistancePendingDecisionOption['id'], 'spend' | 'suffer'>
>;

type TestReactionBoundary = ReactionBoundaryIntel<
  TestPolicy,
  TestMetrics,
  'reaction_outcome_unresolved'
>;
type _ReactionBoundaryRetainsEngineTuple = Assert<
  Exact<TestReactionBoundary['options']['length'], 2>
>;
type _ReactionBoundaryOptionCarriesMetrics = Assert<
  Extract<
    TestReactionBoundary['options'][0]['evaluation'],
    { readonly status: 'resolved' }
  > extends { readonly metrics: TestMetrics }
    ? true
    : false
>;

export type VttIntelContractProof = [
  _TacticalVerdictUsesSharedDiscriminant,
  _MovementVerdictUsesSharedUnresolvedShape,
  _ConcentrationReasonsStayTyped,
  _ExpectedValuesAreExactRationals,
  _ProbabilitiesAreBrandedExactRationals,
  _ProbabilityRenderingIsPercentage,
  _RawPolicyStringIsRejected,
  _PolicyVersionsAreNotInterchangeable,
  _ProviderEnvelopeComposes,
  _MatchingDominanceSetsCompare,
  _MismatchedDominanceSetsAreRejected,
  _MismatchedDominanceComparisonCannotExist,
  _ReactionOptionIdsStayClosed,
  _LegendaryActionOptionIdsStayClosed,
  _LegendaryResistanceOptionIdsStayClosed,
  _ReactionBoundaryRetainsEngineTuple,
  _ReactionBoundaryOptionCarriesMetrics,
];
