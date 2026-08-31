import { conditionMechanicalState, type AppliedCondition } from './conditions';
import { gridDistance, type GridCell } from './grid';
import type { RollMode } from './resolution';
import { attackRangeVerdict } from './range';
import { feet, type CombatantId, type Feet } from './values';
import {
  attackRollModifier,
  expandedCriticalMinimumRoll,
  targetArmorClass,
} from '../simulation/contracts';
import { attackRollProbabilities } from '../simulation/probability';

export const TACTICAL_EVALUATOR_POLICY = 'tactical-evaluator-v2' as const;

/** Shared with damage resolution: damage at zero HP marks one failure, or two on a critical. */
export function deathSaveFailuresFromZeroHitPointDamage(critical: false): 1;
export function deathSaveFailuresFromZeroHitPointDamage(critical: true): 2;
export function deathSaveFailuresFromZeroHitPointDamage(critical: boolean): 1 | 2;
export function deathSaveFailuresFromZeroHitPointDamage(critical: boolean): 1 | 2 {
  return critical ? 2 : 1;
}

export type TacticalRangeBand = 'melee' | 'normal' | 'long' | 'out';

export type TacticalAttackRange =
  | { readonly kind: 'melee'; readonly reachFeet: Feet }
  | {
      readonly kind: 'ranged';
      readonly normalRangeFeet: Feet;
      readonly longRangeFeet: Feet | null;
    }
  | {
      readonly kind: 'melee_or_ranged';
      readonly reachFeet: Feet;
      readonly normalRangeFeet: Feet;
      readonly longRangeFeet: Feet;
    };

export type AttackRollModeReason =
  | 'declared_advantage'
  | 'declared_disadvantage'
  | 'long_range_disadvantage'
  | 'unseen_target_disadvantage'
  | 'unseen_attacker_advantage'
  | 'faerie_fire_advantage'
  | 'effect_advantage'
  | 'effect_disadvantage'
  | 'roll_defense_advantage'
  | 'roll_defense_disadvantage'
  | 'target_grappled_by_attacker_advantage'
  | 'target_not_full_hit_points_advantage'
  | 'dodge_disadvantage'
  | 'blinded_attacker_disadvantage'
  | 'blinded_target_advantage'
  | 'frightened_attacker_disadvantage'
  | 'grappled_attacker_disadvantage'
  | 'invisible_attacker_advantage'
  | 'invisible_target_disadvantage'
  | 'paralyzed_target_advantage'
  | 'petrified_target_advantage'
  | 'poisoned_attacker_disadvantage'
  | 'prone_attacker_disadvantage'
  | 'prone_near_advantage'
  | 'prone_ranged_disadvantage'
  | 'restrained_attacker_disadvantage'
  | 'restrained_target_advantage'
  | 'stunned_target_advantage'
  | 'unconscious_advantage';

export interface AttackRollModeSource {
  readonly mode: Exclude<RollMode, 'normal'>;
  readonly reason: AttackRollModeReason;
}

export interface TacticalDamageTerm {
  readonly dice: {
    readonly count: number;
    readonly sides: number;
    readonly modifier: number;
  };
}

/** Finite attack-roll modifiers are enumerated exactly, including multiple dice. */
export interface TacticalAttackRollModifier {
  readonly kind: 'die';
  readonly count: number;
  readonly sides: number;
  readonly sign: 1 | -1;
  readonly reason: 'bless' | 'effect';
}

export type TacticalUnresolvedReason =
  | 'attack_out_of_range'
  | 'long_range_unresolved'
  | 'target_armor_class_unresolved'
  | 'damage_unresolved'
  | 'conditional_damage_rider_unresolved'
  | 'random_attack_modifier_unresolved'
  | 'target_hit_points_unresolved'
  | 'target_has_total_cover';

export interface TacticalUnknownTargetFact {
  readonly kind: 'unknown';
}

export interface TacticalAttackInput {
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attackerPosition: GridCell;
  readonly targetPosition: GridCell;
  readonly range: TacticalAttackRange;
  readonly attackBonus: number;
  readonly targetArmorClass: number | null;
  readonly criticalFloor: 20 | 18 | 19;
  readonly damageTerms: readonly TacticalDamageTerm[] | null;
  readonly attackerConditions: readonly AppliedCondition[];
  readonly targetConditions: readonly AppliedCondition[];
  readonly attackerCanSeeTarget: boolean;
  readonly targetCanSeeAttacker: boolean;
  readonly rollModeSources: readonly AttackRollModeSource[];
  readonly attackRollModifiers?: readonly TacticalAttackRollModifier[];
  readonly target: {
    readonly hitPoints: number | TacticalUnknownTargetFact;
    readonly usesDeathSaves: boolean | TacticalUnknownTargetFact;
  };
  readonly unresolvedReasons?: readonly TacticalUnresolvedReason[];
}

export type TacticalRangeVerdict =
  | {
      readonly status: 'resolved';
      readonly distanceFeet: number;
      readonly band: TacticalRangeBand;
      readonly legal: boolean;
    }
  | {
      readonly status: 'unresolved';
      readonly distanceFeet: number;
      readonly reason: 'long_range_unresolved';
    };

export interface TacticalRollModeVerdict {
  readonly mode: RollMode;
  readonly reasons: readonly AttackRollModeReason[];
  readonly sources: readonly AttackRollModeSource[];
}

export type TacticalProbabilityVerdict =
  | {
      readonly status: 'resolved';
      /** Includes critical hits. */
      readonly hit: number;
      readonly critical: number;
      readonly miss: number;
    }
  | {
      readonly status: 'unresolved';
      readonly reason: Extract<
        TacticalUnresolvedReason,
        | 'attack_out_of_range'
        | 'long_range_unresolved'
        | 'target_armor_class_unresolved'
        | 'random_attack_modifier_unresolved'
        | 'target_has_total_cover'
      >;
    };

export type TacticalDamageVerdict =
  | {
      readonly status: 'resolved';
      readonly normalHitAverage: number;
      readonly criticalHitAverage: number;
      readonly expectedDamage: number;
    }
  | {
      readonly status: 'unresolved';
      readonly reason: Extract<
        TacticalUnresolvedReason,
        | 'attack_out_of_range'
        | 'long_range_unresolved'
        | 'target_armor_class_unresolved'
        | 'damage_unresolved'
        | 'random_attack_modifier_unresolved'
        | 'target_has_total_cover'
      >;
    };

export interface TacticalResolvedZeroHitPointConsequences {
  readonly deathFailureOnHit: boolean;
  readonly failuresOnHit: 0 | 1;
  readonly failuresOnCritical: 0 | 2;
  readonly automaticCriticalOnHit: boolean;
  readonly automaticCriticalMaximumDistanceFeet: number | null;
}

export interface TacticalUnresolvedZeroHitPointConsequences {
  readonly status: 'unresolved';
  readonly reason: 'target_hit_points_unresolved';
  readonly deathFailureOnHit: null;
  readonly failuresOnHit: null;
  readonly failuresOnCritical: null;
  readonly automaticCriticalOnHit: boolean;
  readonly automaticCriticalMaximumDistanceFeet: number | null;
}

export type TacticalZeroHitPointConsequences =
  | TacticalResolvedZeroHitPointConsequences
  | TacticalUnresolvedZeroHitPointConsequences;

export interface TacticalAttackEvaluation {
  readonly policy: typeof TACTICAL_EVALUATOR_POLICY;
  readonly range: TacticalRangeVerdict;
  readonly rollMode: TacticalRollModeVerdict;
  readonly probabilities: TacticalProbabilityVerdict;
  readonly damage: TacticalDamageVerdict;
  readonly consequences: TacticalZeroHitPointConsequences;
  readonly unresolved: readonly TacticalUnresolvedReason[];
}

export type TacticalSequenceReasonCode =
  | 'death_save_failures_resolved'
  | 'living_damage_resolved'
  | 'massive_damage_instant_death_unresolved'
  | 'target_hit_points_unresolved'
  | 'attack_probability_unresolved'
  | 'attack_damage_unresolved';

export type TacticalSequenceTarget =
  | {
      readonly kind: 'death_saves';
      readonly existingFailures: 0 | 1 | 2;
    }
  | {
      readonly kind: 'living_hit_points';
      readonly hitPoints: number;
    }
  | {
      readonly kind: 'unknown_hit_points';
    };

export interface TacticalAttackSequenceInput {
  readonly target: TacticalSequenceTarget;
  /** Each attack owns its modifier set, so grants can be conditioned by order. */
  readonly attacks: readonly TacticalAttackInput[];
}

export type TacticalAttackSequenceFold =
  | {
      readonly policy: typeof TACTICAL_EVALUATOR_POLICY;
      readonly status: 'resolved';
      readonly killProbability: number;
      readonly expectedFailures: number | null;
      readonly expectedDamage: number | null;
      readonly reasonCodes: readonly TacticalSequenceReasonCode[];
      readonly attacks: readonly TacticalAttackEvaluation[];
    }
  | {
      readonly policy: typeof TACTICAL_EVALUATOR_POLICY;
      readonly status: 'unresolved';
      readonly killProbability: null;
      readonly expectedFailures: number | null;
      readonly expectedDamage: number | null;
      readonly reasonCodes: readonly TacticalSequenceReasonCode[];
      readonly attacks: readonly TacticalAttackEvaluation[];
    };

function conditionReason(
  condition: AppliedCondition,
  role: 'attacker' | 'target',
  mode: Exclude<RollMode, 'normal'>,
  predicate: string,
): AttackRollModeReason | null {
  const name = condition.name;
  if (role === 'attacker') {
    switch (name) {
      case 'Blinded': return 'blinded_attacker_disadvantage';
      case 'Frightened': return 'frightened_attacker_disadvantage';
      case 'Grappled': return 'grappled_attacker_disadvantage';
      case 'Invisible': return 'invisible_attacker_advantage';
      case 'Poisoned': return 'poisoned_attacker_disadvantage';
      case 'Prone': return 'prone_attacker_disadvantage';
      case 'Restrained': return 'restrained_attacker_disadvantage';
      case 'Charmed':
      case 'Deafened':
      case 'Exhaustion':
      case 'Incapacitated':
      case 'Paralyzed':
      case 'Petrified':
      case 'Stunned':
      case 'Unconscious': return mode === 'advantage'
        ? 'effect_advantage'
        : 'effect_disadvantage';
    }
  }
  switch (name) {
    case 'Blinded': return 'blinded_target_advantage';
    case 'Invisible': return 'invisible_target_disadvantage';
    case 'Paralyzed': return 'paralyzed_target_advantage';
    case 'Petrified': return 'petrified_target_advantage';
    case 'Prone': return predicate === 'attacker_beyond_5_feet'
      ? 'prone_ranged_disadvantage'
      : 'prone_near_advantage';
    case 'Restrained': return 'restrained_target_advantage';
    case 'Stunned': return 'stunned_target_advantage';
    case 'Unconscious': return 'unconscious_advantage';
    case 'Charmed':
    case 'Deafened':
    case 'Exhaustion':
    case 'Frightened':
    case 'Grappled':
    case 'Incapacitated':
    case 'Poisoned': return mode === 'advantage'
      ? 'effect_advantage'
      : 'effect_disadvantage';
  }
}

export function impliedTargetConditions(
  conditions: readonly AppliedCondition[],
): readonly AppliedCondition[] {
  const impliesProne = conditions.some((condition) =>
    conditionMechanicalState([condition]).clauses.some(
      (clause) => clause.kind === 'inert' && clause.prone,
    ));
  return impliesProne && !conditions.some((condition) => condition.name === 'Prone')
    ? [...conditions, { name: 'Prone' }]
    : conditions;
}

export function conditionAttackRollModeSources(input: {
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attackerConditions: readonly AppliedCondition[];
  readonly targetConditions: readonly AppliedCondition[];
  readonly distanceFeet: number;
  readonly attackerCanSeeTarget: boolean;
  readonly targetCanSeeAttacker: boolean;
}): readonly AttackRollModeSource[] {
  const sources: AttackRollModeSource[] = [];
  const rows = [
    ...input.attackerConditions.map((condition) => ({ condition, role: 'attacker' as const })),
    ...impliedTargetConditions(input.targetConditions)
      .map((condition) => ({ condition, role: 'target' as const })),
  ];
  for (const { condition, role } of rows) {
    for (const clause of conditionMechanicalState([condition]).clauses) {
      const expectedRoll = role === 'attacker' ? 'attack_by' : 'attack_against';
      if (clause.kind !== 'roll_mode' || clause.roll !== expectedRoll) continue;
      const applies = clause.predicate === 'always' ||
        (clause.predicate === 'target_not_source' && String(clause.source) !== input.targetId) ||
        (clause.predicate === 'source_visible' && role === 'attacker' &&
          String(clause.source) === input.targetId && input.attackerCanSeeTarget) ||
        (clause.predicate === 'recipient_unseen' &&
          (role === 'attacker' ? !input.targetCanSeeAttacker : !input.attackerCanSeeTarget)) ||
        (clause.predicate === 'attacker_within_5_feet' && input.distanceFeet <= 5) ||
        (clause.predicate === 'attacker_beyond_5_feet' && input.distanceFeet > 5) ||
        (clause.predicate === 'source_visible' && role === 'target' &&
          String(clause.source) === input.attackerId && input.targetCanSeeAttacker);
      if (!applies) continue;
      const reason = conditionReason(condition, role, clause.mode, clause.predicate);
      if (reason !== null) sources.push({ mode: clause.mode, reason });
    }
  }
  return sources;
}

export function combineAttackRollMode(
  sources: readonly AttackRollModeSource[],
): TacticalRollModeVerdict {
  const advantage = sources.some((source) => source.mode === 'advantage');
  const disadvantage = sources.some((source) => source.mode === 'disadvantage');
  const mode: RollMode = advantage === disadvantage
    ? 'normal'
    : advantage
      ? 'advantage'
      : 'disadvantage';
  return {
    mode,
    reasons: [...new Set(sources.map((source) => source.reason))],
    sources: [...sources],
  };
}

export function combineRollModes(modes: readonly RollMode[]): RollMode {
  const advantage = modes.includes('advantage');
  const disadvantage = modes.includes('disadvantage');
  if (advantage === disadvantage) return 'normal';
  return advantage ? 'advantage' : 'disadvantage';
}

export function tacticalRangeVerdict(
  attacker: GridCell,
  target: GridCell,
  range: TacticalAttackRange,
): TacticalRangeVerdict {
  const distanceFeet = gridDistance(attacker, target);
  switch (range.kind) {
    case 'melee': {
      const verdict = attackRangeVerdict(attacker, target, {
        kind: 'melee', reach: feet(range.reachFeet),
      });
      return {
        status: 'resolved',
        distanceFeet,
        band: verdict.kind === 'legal' ? 'melee' : 'out',
        legal: verdict.kind === 'legal',
      };
    }
    case 'ranged': {
      if (distanceFeet <= range.normalRangeFeet) {
        return { status: 'resolved', distanceFeet, band: 'normal', legal: true };
      }
      if (range.longRangeFeet === null) {
        return { status: 'unresolved', distanceFeet, reason: 'long_range_unresolved' };
      }
      const verdict = attackRangeVerdict(attacker, target, {
        kind: 'ranged',
        normal: feet(range.normalRangeFeet),
        long: feet(range.longRangeFeet),
      });
      return {
        status: 'resolved',
        distanceFeet,
        band: verdict.kind === 'illegal' ? 'out' : 'long',
        legal: verdict.kind === 'legal',
      };
    }
    case 'melee_or_ranged': {
      if (distanceFeet <= range.reachFeet) {
        return { status: 'resolved', distanceFeet, band: 'melee', legal: true };
      }
      const verdict = attackRangeVerdict(attacker, target, {
        kind: 'ranged',
        normal: feet(range.normalRangeFeet),
        long: feet(range.longRangeFeet),
      });
      return {
        status: 'resolved',
        distanceFeet,
        band: verdict.kind === 'illegal'
          ? 'out'
          : verdict.rollMode === 'disadvantage'
            ? 'long'
            : 'normal',
        legal: verdict.kind === 'legal',
      };
    }
  }
}

function firstBlockingReason(
  range: TacticalRangeVerdict,
  targetAc: number | null,
): Extract<
  TacticalUnresolvedReason,
  'attack_out_of_range' | 'long_range_unresolved' | 'target_armor_class_unresolved'
> | null {
  if (range.status === 'unresolved') return range.reason;
  if (!range.legal) return 'attack_out_of_range';
  if (
    targetAc === null ||
    !Number.isSafeInteger(targetAc) ||
    targetAc < 0 ||
    targetAc > 50
  ) return 'target_armor_class_unresolved';
  return null;
}

function modifierDistribution(
  modifiers: readonly TacticalAttackRollModifier[],
): ReadonlyMap<number, number> {
  let distribution = new Map<number, number>([[0, 1]]);
  for (const modifier of modifiers) {
    if (!Number.isSafeInteger(modifier.count) || modifier.count < 1) {
      throw new RangeError('Attack-roll modifier count must be a positive integer.');
    }
    if (!Number.isSafeInteger(modifier.sides) || modifier.sides < 2) {
      throw new RangeError('Attack-roll modifier sides must be an integer of at least 2.');
    }
    for (let die = 0; die < modifier.count; die += 1) {
      const next = new Map<number, number>();
      for (const [subtotal, subtotalProbability] of distribution) {
        for (let face = 1; face <= modifier.sides; face += 1) {
          const total = subtotal + modifier.sign * face;
          next.set(total, (next.get(total) ?? 0) + subtotalProbability / modifier.sides);
        }
      }
      distribution = next;
    }
  }
  return distribution;
}

function modifiedAttackRollProbabilities(input: TacticalAttackInput, mode: RollMode) {
  const distribution = modifierDistribution(input.attackRollModifiers ?? []);
  let hit = 0;
  let critical = 0;
  let miss = 0;
  for (const [modifier, weight] of distribution) {
    const chances = attackRollProbabilities(
      attackRollModifier(input.attackBonus + modifier),
      targetArmorClass(input.targetArmorClass),
      mode,
      input.criticalFloor === 20
        ? 20
        : expandedCriticalMinimumRoll(input.criticalFloor),
    );
    hit += chances.hit * weight;
    critical += chances.critical * weight;
    miss += chances.miss * weight;
  }
  return { hit, critical, miss };
}

export function evaluateTacticalAttack(
  input: TacticalAttackInput,
): TacticalAttackEvaluation {
  const range = tacticalRangeVerdict(
    input.attackerPosition,
    input.targetPosition,
    input.range,
  );
  const distanceFeet = range.distanceFeet;
  const rangeSources: AttackRollModeSource[] =
    range.status === 'resolved' && range.band === 'long'
      ? [{ mode: 'disadvantage', reason: 'long_range_disadvantage' }]
      : [];
  const conditionSources = conditionAttackRollModeSources({
    attackerId: input.attackerId,
    targetId: input.targetId,
    attackerConditions: input.attackerConditions,
    targetConditions: input.targetConditions,
    distanceFeet,
    attackerCanSeeTarget: input.attackerCanSeeTarget,
    targetCanSeeAttacker: input.targetCanSeeAttacker,
  });
  const rollMode = combineAttackRollMode([
    ...rangeSources,
    ...input.rollModeSources,
    ...conditionSources,
  ]);
  const criticalDistances = impliedTargetConditions(input.targetConditions)
    .flatMap((condition) => conditionMechanicalState([condition]).clauses)
    .flatMap((clause) => clause.kind === 'critical_if_hit_within' ? [Number(clause.feet)] : []);
  const automaticCriticalMaximumDistanceFeet = criticalDistances.length === 0
    ? null
    : Math.max(...criticalDistances);
  const automaticCriticalOnHit = automaticCriticalMaximumDistanceFeet !== null &&
    distanceFeet <= automaticCriticalMaximumDistanceFeet;
  const targetHitPointsKnown = typeof input.target.hitPoints === 'number' &&
    typeof input.target.usesDeathSaves === 'boolean';
  const zeroHitPoints = targetHitPointsKnown &&
    input.target.hitPoints === 0 && input.target.usesDeathSaves;
  const consequences: TacticalZeroHitPointConsequences = targetHitPointsKnown
    ? {
        deathFailureOnHit: zeroHitPoints,
        failuresOnHit: zeroHitPoints ? deathSaveFailuresFromZeroHitPointDamage(false) : 0,
        failuresOnCritical: zeroHitPoints ? deathSaveFailuresFromZeroHitPointDamage(true) : 0,
        automaticCriticalOnHit,
        automaticCriticalMaximumDistanceFeet,
      }
    : {
        status: 'unresolved',
        reason: 'target_hit_points_unresolved',
        deathFailureOnHit: null,
        failuresOnHit: null,
        failuresOnCritical: null,
        automaticCriticalOnHit,
        automaticCriticalMaximumDistanceFeet,
      };
  const blockingReason = firstBlockingReason(range, input.targetArmorClass);
  const probabilityBlockingReason = blockingReason ??
    (input.unresolvedReasons?.includes('random_attack_modifier_unresolved') === true
      ? 'random_attack_modifier_unresolved'
      : input.unresolvedReasons?.includes('target_has_total_cover') === true
        ? 'target_has_total_cover'
      : null);
  const unresolved = [...new Set([
    ...(input.unresolvedReasons ?? []),
    ...(blockingReason === null ? [] : [blockingReason]),
    ...(targetHitPointsKnown ? [] : ['target_hit_points_unresolved' as const]),
    ...(input.damageTerms === null ? ['damage_unresolved' as const] : []),
  ])];
  if (probabilityBlockingReason !== null) {
    return {
      policy: TACTICAL_EVALUATOR_POLICY,
      range,
      rollMode,
      probabilities: { status: 'unresolved', reason: probabilityBlockingReason },
      damage: { status: 'unresolved', reason: probabilityBlockingReason },
      consequences,
      unresolved,
    };
  }
  const chances = modifiedAttackRollProbabilities(input, rollMode.mode);
  const critical = automaticCriticalOnHit ? chances.hit : chances.critical;
  const probabilities: TacticalProbabilityVerdict = {
    status: 'resolved',
    hit: chances.hit,
    critical,
    miss: chances.miss,
  };
  if (
    input.damageTerms === null ||
    input.unresolvedReasons?.includes('conditional_damage_rider_unresolved') === true
  ) {
    return {
      policy: TACTICAL_EVALUATOR_POLICY,
      range,
      rollMode,
      probabilities,
      damage: { status: 'unresolved', reason: 'damage_unresolved' },
      consequences,
      unresolved,
    };
  }
  const normalHitAverage = input.damageTerms.reduce(
    (sum, term) => sum + term.dice.count * (term.dice.sides + 1) / 2 + term.dice.modifier,
    0,
  );
  const extraCriticalDiceAverage = input.damageTerms.reduce(
    (sum, term) => sum + term.dice.count * (term.dice.sides + 1) / 2,
    0,
  );
  const criticalHitAverage = normalHitAverage + extraCriticalDiceAverage;
  return {
    policy: TACTICAL_EVALUATOR_POLICY,
    range,
    rollMode,
    probabilities,
    damage: {
      status: 'resolved',
      normalHitAverage,
      criticalHitAverage,
      expectedDamage:
        (chances.hit - critical) * normalHitAverage + critical * criticalHitAverage,
    },
    consequences,
    unresolved,
  };
}

function convolveDamageTerms(
  terms: readonly TacticalDamageTerm[],
  critical: boolean,
): ReadonlyMap<number, number> {
  let distribution = new Map<number, number>([[0, 1]]);
  for (const term of terms) {
    let termDistribution = new Map<number, number>([[0, 1]]);
    const diceCount = term.dice.count * (critical ? 2 : 1);
    for (let die = 0; die < diceCount; die += 1) {
      const next = new Map<number, number>();
      for (const [subtotal, subtotalProbability] of termDistribution) {
        for (let face = 1; face <= term.dice.sides; face += 1) {
          const total = subtotal + face;
          next.set(total, (next.get(total) ?? 0) + subtotalProbability / term.dice.sides);
        }
      }
      termDistribution = next;
    }
    const next = new Map<number, number>();
    for (const [prior, priorProbability] of distribution) {
      for (const [termTotal, termProbability] of termDistribution) {
        const total = prior + Math.max(0, termTotal + term.dice.modifier);
        next.set(total, (next.get(total) ?? 0) + priorProbability * termProbability);
      }
    }
    distribution = next;
  }
  return distribution;
}

function foldDeathSaveFailures(
  existingFailures: 0 | 1 | 2,
  attacks: readonly TacticalAttackEvaluation[],
): { readonly killProbability: number; readonly expectedFailures: number } {
  let states = new Map<number, number>([[existingFailures, 1]]);
  for (const attack of attacks) {
    if (attack.probabilities.status !== 'resolved') continue;
    const probabilities = attack.probabilities;
    const next = new Map<number, number>();
    for (const [failures, stateProbability] of states) {
      const outcomes = [
        { added: 0, probability: probabilities.miss },
        { added: 1, probability: probabilities.hit - probabilities.critical },
        { added: 2, probability: probabilities.critical },
      ] as const;
      for (const outcome of outcomes) {
        const total = Math.min(3, failures + outcome.added);
        next.set(total, (next.get(total) ?? 0) + stateProbability * outcome.probability);
      }
    }
    states = next;
  }
  return {
    killProbability: states.get(3) ?? 0,
    expectedFailures: [...states].reduce(
      (sum, [failures, probability]) => sum + failures * probability,
      0,
    ),
  };
}

function foldLivingDamage(
  hitPoints: number,
  inputs: readonly TacticalAttackInput[],
  attacks: readonly TacticalAttackEvaluation[],
): number {
  let accumulated = new Map<number, number>([[0, 1]]);
  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const evaluation = attacks[index];
    if (
      input === undefined ||
      evaluation?.probabilities.status !== 'resolved' ||
      input.damageTerms === null
    ) continue;
    const normal = convolveDamageTerms(input.damageTerms, false);
    const critical = convolveDamageTerms(input.damageTerms, true);
    const attackOutcomes = new Map<number, number>([[0, evaluation.probabilities.miss]]);
    for (const [damage, probability] of normal) {
      attackOutcomes.set(
        damage,
        (attackOutcomes.get(damage) ?? 0) +
          probability * (evaluation.probabilities.hit - evaluation.probabilities.critical),
      );
    }
    for (const [damage, probability] of critical) {
      attackOutcomes.set(
        damage,
        (attackOutcomes.get(damage) ?? 0) + probability * evaluation.probabilities.critical,
      );
    }
    const next = new Map<number, number>();
    for (const [priorDamage, priorProbability] of accumulated) {
      for (const [attackDamage, attackProbability] of attackOutcomes) {
        const total = Math.min(hitPoints, priorDamage + attackDamage);
        next.set(total, (next.get(total) ?? 0) + priorProbability * attackProbability);
      }
    }
    accumulated = next;
  }
  return accumulated.get(hitPoints) ?? 0;
}

export function foldTacticalAttackSequence(
  input: TacticalAttackSequenceInput,
): TacticalAttackSequenceFold {
  const attacks = input.attacks.map(evaluateTacticalAttack);
  const probabilityUnresolved = attacks.some((attack) => attack.probabilities.status === 'unresolved');
  const damageUnresolved = attacks.some((attack) => attack.damage.status === 'unresolved');
  const expectedDamage = damageUnresolved
    ? null
    : attacks.reduce((sum, attack) =>
      sum + (attack.damage.status === 'resolved' ? attack.damage.expectedDamage : 0), 0);

  if (input.target.kind === 'unknown_hit_points') {
    return {
      policy: TACTICAL_EVALUATOR_POLICY,
      status: 'unresolved',
      killProbability: null,
      expectedFailures: null,
      expectedDamage,
      reasonCodes: [
        'target_hit_points_unresolved',
        ...(damageUnresolved ? ['attack_damage_unresolved' as const] : []),
        ...(probabilityUnresolved ? ['attack_probability_unresolved' as const] : []),
      ],
      attacks,
    };
  }

  if (input.target.kind === 'death_saves') {
    const failureFold = foldDeathSaveFailures(input.target.existingFailures, attacks);
    const reasonCodes: TacticalSequenceReasonCode[] = [
      'death_save_failures_resolved',
      'massive_damage_instant_death_unresolved',
      ...(damageUnresolved ? ['attack_damage_unresolved' as const] : []),
      ...(probabilityUnresolved ? ['attack_probability_unresolved' as const] : []),
    ];
    if (probabilityUnresolved) {
      return {
        policy: TACTICAL_EVALUATOR_POLICY,
        status: 'unresolved',
        killProbability: null,
        expectedFailures: null,
        expectedDamage,
        reasonCodes,
        attacks,
      };
    }
    return {
      policy: TACTICAL_EVALUATOR_POLICY,
      status: 'resolved',
      killProbability: failureFold.killProbability,
      expectedFailures: failureFold.expectedFailures,
      expectedDamage,
      reasonCodes,
      attacks,
    };
  }

  const reasonCodes: TacticalSequenceReasonCode[] = [
    ...(probabilityUnresolved ? ['attack_probability_unresolved' as const] : []),
    ...(damageUnresolved ? ['attack_damage_unresolved' as const] : []),
  ];
  if (probabilityUnresolved || damageUnresolved) {
    return {
      policy: TACTICAL_EVALUATOR_POLICY,
      status: 'unresolved',
      killProbability: null,
      expectedFailures: null,
      expectedDamage,
      reasonCodes,
      attacks,
    };
  }
  return {
    policy: TACTICAL_EVALUATOR_POLICY,
    status: 'resolved',
    killProbability: foldLivingDamage(input.target.hitPoints, input.attacks, attacks),
    expectedFailures: null,
    expectedDamage,
    reasonCodes: ['living_damage_resolved'],
    attacks,
  };
}
