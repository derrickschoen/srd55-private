import type { DamageType } from '../domain/enums';
import {
  damageRollTotal,
  expectedEventDamage,
  positiveDiceCount,
  probability,
  type AttackDamageComponent,
  type AttackDamageInstance,
  type AttackRollEvent,
  type AttackRollModifier,
  type AutomaticDamageEvent,
  type DamageComponent,
  type DamageInstance,
  type DamageResponse,
  type DamageRollTotal,
  type DicePool,
  type ExpectedEventDamage,
  type ExpandedCriticalMinimumRoll,
  type EventFrequency,
  type NonEmptyReadonlyArray,
  type PublicSourceRef,
  type Probability,
  type RollState,
  type SaveSuccessClauseId,
  type SavingThrowDamageEvent,
  type TargetArmorClass,
  type TargetDamageResponse,
  type TargetSaveBonus,
} from './contracts';
import {
  attackDamageSourcesFailureReason,
  attackRollEvidenceFailureReason,
  automaticDamageEvidenceFailureReason,
  criticalHitRuleHasEvidence,
  publicProbabilityCoverageManifest,
  saveSuccessOutcomeEvidenceFailureReason,
} from './coverage';

export type DamageOutcome = {
  readonly total: DamageRollTotal;
  readonly probability: Probability;
};

export type DamageOutcomeDistribution = readonly DamageOutcome[];

export type AttackRollProbabilities = {
  /** Includes critical hits. */
  readonly hit: Probability;
  readonly critical: Probability;
  readonly miss: Probability;
};

export type DamageFoldContribution = {
  readonly source: DamageInstance['source'];
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedEventDamage;
};

const registeredAvailableDamageEventFoldBrand: unique symbol = Symbol(
  'RegisteredAvailableDamageEventFold',
);

type AvailableDamageEventFoldFields = {
  readonly status: 'available';
  readonly expected_damage: ExpectedEventDamage;
  readonly contributions: readonly DamageFoldContribution[];
};

export type AvailableDamageEventFold = AvailableDamageEventFoldFields & {
  readonly [registeredAvailableDamageEventFoldBrand]: true;
};

export type UnavailableDamageEventFold = {
  readonly status: 'unavailable';
  readonly evidence: PublicSourceRef | null;
  readonly reason: string;
};

type SaveRecurrence = {
  readonly clause_id: SaveSuccessClauseId;
  readonly frequency: EventFrequency;
};

export type DamageEventFold =
  | AvailableDamageEventFold
  | UnavailableDamageEventFold;

export type AttackEventFold =
  | (AvailableDamageEventFold & {
      readonly hit_probability: Probability;
      readonly critical_probability: Probability;
    })
  | UnavailableDamageEventFold;

export type SaveEventFold =
  | (AvailableDamageEventFold & {
      readonly status: 'available';
      readonly failed_save_probability: Probability;
      /** The reviewed clause ID is evidence-bound and cannot be caller-relabeled. */
      readonly recurrence: SaveRecurrence;
    })
  | {
      readonly status: UnavailableDamageEventFold['status'];
      readonly failed_save_probability: Probability;
    } & Omit<UnavailableDamageEventFold, 'status'>;

export type RoundDamageFold =
  | DamageEventFold
  | {
      readonly status: 'unavailable';
      readonly failures: NonEmptyReadonlyArray<UnavailableDamageEventFold>;
    };

/** Mints the runtime marker that only evidence-checked event-fold paths use. */
function registeredAvailableDamageEventFold<
  T extends AvailableDamageEventFoldFields,
>(fold: T): T & AvailableDamageEventFold {
  Object.defineProperty(fold, registeredAvailableDamageEventFoldBrand, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return fold as T & AvailableDamageEventFold;
}

function addProbability(
  outcomes: Map<number, number>,
  total: number,
  weight: number,
): void {
  outcomes.set(total, (outcomes.get(total) ?? 0) + weight);
}

function normalizedDistribution(
  outcomes: ReadonlyMap<number, number>,
): DamageOutcomeDistribution {
  const totalWeight = [...outcomes.values()].reduce(
    (sum, weight) => sum + weight,
    0,
  );
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new RangeError('A finite distribution must have positive total weight.');
  }
  return [...outcomes.entries()]
    .sort(([left], [right]) => left - right)
    .map(([total, weight]) => ({
      total: damageRollTotal(total),
      probability: probability(weight / totalWeight),
    }));
}

/**
 * Enumerates a finite dice pool by convolution. Dice and modifiers are defined
 * under the bundled SRD heading `Damage Rolls`; `DieSize` itself is the closed
 * sourced vocabulary already held by the app.
 *
 * @see publicProbabilityCoverageManifest.damage_roll
 */
export function enumerateDicePool(pool: DicePool): DamageOutcomeDistribution {
  // Referencing the manifest entry here keeps the rule implementation beside
  // its bundled-source citation instead of relying on a prose-only inventory.
  const evidence = publicProbabilityCoverageManifest.damage_roll;
  if (evidence.kind !== 'bundled_srd') {
    throw new Error('Damage-roll evidence must be bundled SRD content.');
  }

  let outcomes = new Map<number, number>([[0, 1]]);
  for (let dieIndex = 0; dieIndex < pool.count; dieIndex += 1) {
    const next = new Map<number, number>();
    for (const [subtotal, subtotalProbability] of outcomes) {
      for (let face = 1; face <= pool.die; face += 1) {
        addProbability(
          next,
          subtotal + face,
          subtotalProbability / pool.die,
        );
      }
    }
    outcomes = next;
  }
  return normalizedDistribution(outcomes);
}

function singleOutcome(value: number): DamageOutcomeDistribution {
  return [{ total: damageRollTotal(value), probability: probability(1) }];
}

function combineDistributions(
  left: DamageOutcomeDistribution,
  right: DamageOutcomeDistribution,
): DamageOutcomeDistribution {
  const combined = new Map<number, number>();
  for (const leftOutcome of left) {
    for (const rightOutcome of right) {
      addProbability(
        combined,
        leftOutcome.total + rightOutcome.total,
        leftOutcome.probability * rightOutcome.probability,
      );
    }
  }
  return normalizedDistribution(combined);
}

export function ordinaryDamageDistribution(
  components: readonly DamageComponent[],
): DamageOutcomeDistribution {
  let distribution = singleOutcome(0);
  let flatModifier = 0;
  for (const component of components) {
    switch (component.kind) {
      case 'dice':
        distribution = combineDistributions(
          distribution,
          enumerateDicePool(component.pool),
        );
        break;
      case 'flat':
        flatModifier += component.modifier;
        break;
    }
  }

  // The SRD `Damage Rolls` heading says a damage penalty can reduce damage to
  // 0 but never below it. Clamp only after all dice and modifiers are summed.
  const clamped = new Map<number, number>();
  for (const outcome of distribution) {
    addProbability(
      clamped,
      Math.max(0, outcome.total + flatModifier),
      outcome.probability,
    );
  }
  return normalizedDistribution(clamped);
}

type AttackOutcome = 'miss' | 'hit' | 'critical_hit';

function attackComponentApplies(
  component: AttackDamageComponent,
  outcome: AttackOutcome,
): boolean {
  switch (outcome) {
    case 'miss':
      return component.trigger === 'miss';
    case 'hit':
      return component.trigger === 'hit';
    case 'critical_hit':
      return component.trigger === 'hit' || component.trigger === 'critical_hit';
  }
}

function distributionForAttackInstance(
  instance: AttackDamageInstance,
  outcome: AttackOutcome,
): DamageOutcomeDistribution {
  let distribution = singleOutcome(0);
  let flatModifier = 0;
  for (const component of instance.components) {
    if (!attackComponentApplies(component, outcome)) {
      continue;
    }
    switch (component.kind) {
      case 'flat':
        flatModifier += component.modifier;
        break;
      case 'dice': {
        // Bundled SRD `Critical Hits`: roll the attack's damage dice twice,
        // then add relevant modifiers normally. The component type makes both
        // facts explicit; flat components cannot enter this branch.
        const count =
          outcome === 'critical_hit' && component.trigger === 'hit'
            ? positiveDiceCount(component.pool.count * 2)
            : component.pool.count;
        distribution = combineDistributions(
          distribution,
          enumerateDicePool({ count, die: component.pool.die }),
        );
        break;
      }
    }
  }
  const clamped = new Map<number, number>();
  for (const value of distribution) {
    addProbability(
      clamped,
      Math.max(0, value.total + flatModifier),
      value.probability,
    );
  }
  return normalizedDistribution(clamped);
}

/**
 * Closed probability mass for the selected d20 face. Tests derive the same
 * mass independently by enumerating all 20 or 400 ordered raw rolls.
 *
 * Bundled SRD `Advantage/Disadvantage`: use the higher/lower of two d20s.
 * @see publicProbabilityCoverageManifest.advantage_and_disadvantage
 */
export function selectedD20FaceProbability(
  face: number,
  state: RollState,
): Probability {
  if (!Number.isInteger(face) || face < 1 || face > 20) {
    throw new RangeError('A d20 face must be an integer from 1 to 20.');
  }
  return probability(selectedD20FaceWeight(face, state) / 400);
}

function selectedD20FaceWeight(face: number, state: RollState): number {
  switch (state) {
    case 'normal':
      return 20;
    case 'advantage':
      return 2 * face - 1;
    case 'disadvantage':
      return 41 - 2 * face;
  }
}

/**
 * Bundled SRD `They Don't Stack`: same-side grants still use two dice and any
 * mixture of Advantage and Disadvantage resolves to a normal roll.
 */
export function resolveRollState(
  advantageSources: number,
  disadvantageSources: number,
): RollState {
  if (
    !Number.isInteger(advantageSources) ||
    advantageSources < 0 ||
    !Number.isInteger(disadvantageSources) ||
    disadvantageSources < 0
  ) {
    throw new RangeError('Roll-state source counts must be nonnegative integers.');
  }
  if (advantageSources > 0 && disadvantageSources > 0) {
    return 'normal';
  }
  if (advantageSources > 0) {
    return 'advantage';
  }
  if (disadvantageSources > 0) {
    return 'disadvantage';
  }
  return 'normal';
}

/**
 * Bundled SRD `Attack Rolls` and `Rolling 20 or 1`: compare total to AC, but a
 * natural 1 always misses and a natural 20 always hits and is critical.
 * Automatic outcomes are deliberately confined to this attack-specific fold.
 */
export function attackRollProbabilities(
  attackBonus: AttackRollModifier,
  armorClass: TargetArmorClass,
  state: RollState,
  criticalMinimumRoll: 20 | ExpandedCriticalMinimumRoll = 20,
): AttackRollProbabilities {
  const attackEvidence = publicProbabilityCoverageManifest.attack_roll;
  const naturalEvidence =
    publicProbabilityCoverageManifest.natural_one_and_twenty;
  if (
    attackEvidence.kind !== 'bundled_srd' ||
    naturalEvidence.kind !== 'bundled_srd'
  ) {
    throw new Error('Attack-roll evidence must be bundled SRD content.');
  }

  let hitWeight = 0;
  let criticalWeight = 0;
  for (let face = 1; face <= 20; face += 1) {
    const weight = selectedD20FaceWeight(face, state);
    if (face === 1) {
      continue;
    }
    if (face >= criticalMinimumRoll) {
      hitWeight += weight;
      criticalWeight += weight;
      continue;
    }
    if (face + attackBonus >= armorClass) {
      hitWeight += weight;
    }
  }
  const hit = hitWeight / 400;
  const critical = criticalWeight / 400;
  return {
    hit: probability(hit),
    critical: probability(critical),
    miss: probability((400 - hitWeight) / 400),
  };
}

/**
 * Bundled SRD `Saving Throws` plus the general D20 Test comparison: a save
 * succeeds when total meets or exceeds DC. `Rolling 20 or 1` speaks only about
 * ATTACK ROLLS, so this fold intentionally has no automatic face outcomes.
 */
export function saveSuccessProbability(
  saveDc: SavingThrowDamageEvent['save_dc'],
  saveBonus: TargetSaveBonus,
  state: RollState,
): Probability {
  const evidence = publicProbabilityCoverageManifest.saving_throw;
  if (evidence.kind !== 'bundled_srd') {
    throw new Error('Saving-throw evidence must be bundled SRD content.');
  }
  let successWeight = 0;
  for (let face = 1; face <= 20; face += 1) {
    if (face + saveBonus >= saveDc) {
      successWeight += selectedD20FaceWeight(face, state);
    }
  }
  return probability(successWeight / 400);
}

/**
 * Applies the one selected target response to an INTEGER outcome. Bundled SRD
 * headings: `Resistance and Vulnerability`, `Order of Application`, and
 * `Immunity`. Resistance rounds down here, before outcome weighting.
 */
export function applyDamageResponse(
  total: DamageRollTotal,
  response: DamageResponse,
): DamageRollTotal {
  switch (response) {
    case 'normal':
      return total;
    case 'resistant':
      return damageRollTotal(Math.floor(total / 2));
    case 'vulnerable':
      return damageRollTotal(total * 2);
    case 'resistant_and_vulnerable':
      return damageRollTotal(Math.floor(total / 2) * 2);
    case 'immune':
      return damageRollTotal(0);
  }
}

function targetResponse(
  damageType: DamageType,
  responses: readonly TargetDamageResponse[],
): DamageResponse | null {
  const matches = responses.filter(
    (candidate) => candidate.damage_type === damageType,
  );
  if (matches.length > 1) {
    throw new Error(
      `Expected exactly one target response for damage type ${damageType}.`,
    );
  }
  return matches[0]?.response ?? null;
}

function missingDamageResponse(
  instances: readonly (DamageInstance | AttackDamageInstance)[],
  responses: readonly TargetDamageResponse[],
): DamageType | null {
  for (const instance of instances) {
    if (targetResponse(instance.damage_type, responses) === null) {
      return instance.damage_type;
    }
  }
  return null;
}

function unavailableDamageResponse(
  damageType: DamageType,
): UnavailableDamageEventFold {
  return {
    status: 'unavailable',
    evidence: null,
    reason: `The target response for damage type ${damageType} is unavailable.`,
  };
}

function expectedDistributionDamage(
  distribution: DamageOutcomeDistribution,
  response: DamageResponse,
  adjustment: (total: DamageRollTotal) => DamageRollTotal = (total) => total,
): ExpectedEventDamage {
  let expected = 0;
  for (const outcome of distribution) {
    expected +=
      applyDamageResponse(adjustment(outcome.total), response) *
      outcome.probability;
  }
  return expectedEventDamage(expected);
}

function sumExpected(values: readonly ExpectedEventDamage[]): ExpectedEventDamage {
  return expectedEventDamage(values.reduce((sum, value) => sum + value, 0));
}

function foldOrdinaryInstances(
  instances: readonly DamageInstance[],
  responses: readonly TargetDamageResponse[],
  adjustment?: (total: DamageRollTotal) => DamageRollTotal,
): AvailableDamageEventFold {
  const contributions = instances.map((instance) => ({
    source: instance.source,
    damage_type: instance.damage_type,
    expected_damage: expectedDistributionDamage(
      ordinaryDamageDistribution(instance.components),
      targetResponse(instance.damage_type, responses) ?? (() => {
        throw new Error('Missing damage response was not preflighted.');
      })(),
      adjustment,
    ),
  }));
  return registeredAvailableDamageEventFold({
    status: 'available',
    expected_damage: sumExpected(
      contributions.map((contribution) => contribution.expected_damage),
    ),
    contributions,
  });
}

function expectedAttackInstance(
  instance: AttackDamageInstance,
  responses: readonly TargetDamageResponse[],
  chances: AttackRollProbabilities,
): ExpectedEventDamage {
  const response = targetResponse(instance.damage_type, responses);
  if (response === null) {
    throw new Error('Missing damage response was not preflighted.');
  }
  const ordinaryHitProbability = chances.hit - chances.critical;
  const missDamage = expectedDistributionDamage(
    distributionForAttackInstance(instance, 'miss'),
    response,
  );
  const hitDamage = expectedDistributionDamage(
    distributionForAttackInstance(instance, 'hit'),
    response,
  );
  const criticalDamage = expectedDistributionDamage(
    distributionForAttackInstance(instance, 'critical_hit'),
    response,
  );
  return expectedEventDamage(
    chances.miss * missDamage +
      ordinaryHitProbability * hitDamage +
      chances.critical * criticalDamage,
  );
}

export function foldAttackEvent(
  event: AttackRollEvent,
  target: {
    readonly armor_class: TargetArmorClass;
    readonly roll_state: RollState;
    readonly damage_responses: readonly TargetDamageResponse[];
  },
): AttackEventFold {
  const attackEvidenceFailure = attackRollEvidenceFailureReason(
    event.source,
    event.attack_roll_clause_id,
    event.attack_roll_evidence,
  );
  if (attackEvidenceFailure !== null) {
    return {
      status: 'unavailable',
      evidence: event.attack_roll_evidence ?? null,
      reason: attackEvidenceFailure,
    };
  }
  const damageSourceFailure = attackDamageSourcesFailureReason(
    event.source,
    event.damage,
  );
  if (damageSourceFailure !== null) {
    return {
      status: 'unavailable',
      evidence: null,
      reason: damageSourceFailure,
    };
  }
  if (!criticalHitRuleHasEvidence(event.critical)) {
    return {
      status: 'unavailable',
      evidence: event.critical.evidence,
      reason: 'The cited evidence does not establish this critical-hit range.',
    };
  }
  const missingResponse = missingDamageResponse(
    event.damage,
    target.damage_responses,
  );
  if (missingResponse !== null) {
    return unavailableDamageResponse(missingResponse);
  }
  const chances = attackRollProbabilities(
    event.attack_bonus,
    target.armor_class,
    target.roll_state,
    event.critical.kind === 'natural_20'
      ? 20
      : event.critical.minimum_roll,
  );
  const contributions = event.damage.map((instance) => ({
    source: instance.source,
    damage_type: instance.damage_type,
    expected_damage: expectedAttackInstance(
      instance,
      target.damage_responses,
      chances,
    ),
  }));
  return registeredAvailableDamageEventFold({
    status: 'available',
    hit_probability: chances.hit,
    critical_probability: chances.critical,
    expected_damage: sumExpected(
      contributions.map((contribution) => contribution.expected_damage),
    ),
    contributions,
  });
}

export function foldSavingThrowEvent(
  event: SavingThrowDamageEvent,
  target: {
    readonly save_bonus: TargetSaveBonus;
    readonly damage_responses: readonly TargetDamageResponse[];
  },
): SaveEventFold {
  // Validate the effect-bound clause before doing any probability arithmetic.
  // The unavailable arm intentionally retains the independently useful save
  // probability, but it is computed only after the citation has been checked.
  const evidenceFailureReason = saveSuccessOutcomeEvidenceFailureReason(
    event.source,
    event.save_success_clause_id,
    event.on_success,
    event.ability,
    event.damage_on_failed_save,
    event.duration,
    event.save_dc,
    event.frequency,
  );
  const successProbability = saveSuccessProbability(
    event.save_dc,
    target.save_bonus,
    event.roll_state,
  );
  const failedProbability = probability(1 - successProbability);

  if (evidenceFailureReason !== null) {
    return {
      status: 'unavailable',
      failed_save_probability: failedProbability,
      evidence: event.on_success.evidence,
      reason: evidenceFailureReason,
    };
  }

  const successDamage = event.on_success.kind === 'sourced_damage'
    ? event.on_success.damage
    : [];
  const missingResponse = missingDamageResponse(
    [...event.damage_on_failed_save, ...successDamage],
    target.damage_responses,
  );
  if (missingResponse !== null) {
    return {
      ...unavailableDamageResponse(missingResponse),
      failed_save_probability: failedProbability,
    };
  }

  const failure = foldOrdinaryInstances(
    event.damage_on_failed_save,
    target.damage_responses,
  );

  let success: AvailableDamageEventFold;
  switch (event.on_success.kind) {
    case 'none':
      success = registeredAvailableDamageEventFold({
        status: 'available',
        expected_damage: expectedEventDamage(0),
        contributions: [],
      });
      break;
    case 'half': {
      success = foldOrdinaryInstances(
        event.damage_on_failed_save,
        target.damage_responses,
        (total) => damageRollTotal(Math.floor(total / 2)),
      );
      break;
    }
    case 'sourced_damage':
      success = foldOrdinaryInstances(
        event.on_success.damage,
        target.damage_responses,
        event.on_success.roll_transform === 'floor_half'
          ? (total) => damageRollTotal(Math.floor(total / 2))
          : undefined,
      );
      break;
  }

  const contributionKeys = new Map<string, DamageFoldContribution>();
  const addWeighted = (
    contribution: DamageFoldContribution,
    weight: Probability,
  ): void => {
    const key = `${contribution.source.kind}\u0000${contribution.source.stable_key}\u0000${contribution.damage_type}`;
    const existing = contributionKeys.get(key);
    contributionKeys.set(key, {
      source: contribution.source,
      damage_type: contribution.damage_type,
      expected_damage: expectedEventDamage(
        (existing?.expected_damage ?? 0) + contribution.expected_damage * weight,
      ),
    });
  };
  failure.contributions.forEach((value) => addWeighted(value, failedProbability));
  success.contributions.forEach((value) => addWeighted(value, successProbability));

  return registeredAvailableDamageEventFold({
    status: 'available',
    failed_save_probability: failedProbability,
    recurrence: {
      clause_id: event.save_success_clause_id,
      frequency: event.frequency,
    },
    expected_damage: expectedEventDamage(
      failure.expected_damage * failedProbability +
        success.expected_damage * successProbability,
    ),
    contributions: [...contributionKeys.values()],
  });
}

export function foldAutomaticDamageEvent(
  event: AutomaticDamageEvent,
  responses: readonly TargetDamageResponse[],
): DamageEventFold {
  const evidenceFailureReason = automaticDamageEvidenceFailureReason(
    event.source,
    event.damage_clause_id,
    event.evidence,
    event.damage,
    event.duration,
    event.frequency,
  );
  if (evidenceFailureReason !== null) {
    return {
      status: 'unavailable',
      evidence: event.evidence,
      reason: evidenceFailureReason,
    };
  }
  const missingResponse = missingDamageResponse(event.damage, responses);
  if (missingResponse !== null) {
    return unavailableDamageResponse(missingResponse);
  }
  return foldOrdinaryInstances(event.damage, responses);
}

/**
 * Composes event folds without an identity value. If even one child is
 * unavailable, the round has no numeric arm, so a parent cannot accidentally
 * swallow the gap through a zero initializer or sum.
 */
export function composeRoundDamageFolds(
  folds: NonEmptyReadonlyArray<
    DamageEventFold | AttackEventFold | SaveEventFold
  >,
): RoundDamageFold {
  for (const fold of folds) {
    if (
      fold.status === 'available' &&
      fold[registeredAvailableDamageEventFoldBrand] !== true
    ) {
      throw new TypeError(
        'Available round-damage folds must be minted by a registered event-fold path.',
      );
    }
  }
  const failures = folds.flatMap((fold) =>
    fold.status === 'unavailable'
      ? [{
          status: fold.status,
          evidence: fold.evidence,
          reason: fold.reason,
        } satisfies UnavailableDamageEventFold]
      : [],
  );
  const [firstFailure, ...remainingFailures] = failures;
  if (firstFailure !== undefined) {
    return {
      status: 'unavailable',
      failures: [firstFailure, ...remainingFailures],
    };
  }
  const available = folds as readonly AvailableDamageEventFold[];
  const cappedByClause = new Map<SaveSuccessClauseId, EventFrequency>();
  for (const fold of available) {
    if (!('recurrence' in fold)) {
      continue;
    }
    const recurrence = fold.recurrence as SaveRecurrence;
    if (recurrence.frequency.kind === 'each_declared_event') {
      continue;
    }
    if (cappedByClause.has(recurrence.clause_id)) {
      const cadence = recurrence.frequency.kind === 'once_per_round'
        ? 'once per round'
        : 'once per turn';
      return {
        status: 'unavailable',
        failures: [{
          status: 'unavailable',
          evidence: recurrence.frequency.evidence,
          reason: `Source clause ${recurrence.clause_id} is limited to ${cadence} and cannot be composed twice in one round.`,
        }],
      };
    }
    cappedByClause.set(recurrence.clause_id, recurrence.frequency);
  }
  return registeredAvailableDamageEventFold({
    status: 'available',
    expected_damage: sumExpected(
      available.map((fold) => fold.expected_damage),
    ),
    contributions: available.flatMap((fold) => fold.contributions),
  });
}
