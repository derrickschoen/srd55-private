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

export const TACTICAL_EVALUATOR_POLICY = 'tactical-evaluator-v1' as const;

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

export type TacticalUnresolvedReason =
  | 'attack_out_of_range'
  | 'long_range_unresolved'
  | 'target_armor_class_unresolved'
  | 'damage_unresolved'
  | 'conditional_damage_rider_unresolved'
  | 'random_attack_modifier_unresolved'
  | 'target_has_total_cover';

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
  readonly target: {
    readonly hitPoints: number;
    readonly usesDeathSaves: boolean;
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

export interface TacticalZeroHitPointConsequences {
  readonly deathFailureOnHit: boolean;
  readonly failuresOnHit: 0 | 1;
  readonly failuresOnCritical: 0 | 2;
  readonly automaticCriticalOnHit: boolean;
  readonly automaticCriticalMaximumDistanceFeet: number | null;
}

export interface TacticalAttackEvaluation {
  readonly policy: typeof TACTICAL_EVALUATOR_POLICY;
  readonly range: TacticalRangeVerdict;
  readonly rollMode: TacticalRollModeVerdict;
  readonly probabilities: TacticalProbabilityVerdict;
  readonly damage: TacticalDamageVerdict;
  readonly consequences: TacticalZeroHitPointConsequences;
  readonly unresolved: readonly TacticalUnresolvedReason[];
}

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
  const zeroHitPoints = input.target.hitPoints === 0 && input.target.usesDeathSaves;
  const consequences: TacticalZeroHitPointConsequences = {
    deathFailureOnHit: zeroHitPoints,
    failuresOnHit: zeroHitPoints ? deathSaveFailuresFromZeroHitPointDamage(false) : 0,
    failuresOnCritical: zeroHitPoints ? deathSaveFailuresFromZeroHitPointDamage(true) : 0,
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
  const chances = attackRollProbabilities(
    attackRollModifier(input.attackBonus),
    targetArmorClass(input.targetArmorClass),
    rollMode.mode,
    input.criticalFloor === 20
      ? 20
      : expandedCriticalMinimumRoll(input.criticalFloor),
  );
  const critical = automaticCriticalOnHit ? chances.hit : chances.critical;
  const probabilities: TacticalProbabilityVerdict = {
    status: 'resolved',
    hit: chances.hit,
    critical,
    miss: chances.miss,
  };
  if (input.damageTerms === null) {
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
