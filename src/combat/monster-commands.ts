import type { EncounterCommand } from './events';
import type { AppliedCondition } from './conditions';
import type { DamageRequest, RollMode } from './resolution';
import type {
  MonsterAttackAction,
  MonsterOnHitEffect,
  MonsterSavingThrowAction,
} from './statblock';
import type { AttackRollModeSource, TacticalAttackRange } from './tactical-evaluator';
import { damageType, dieSides, feet, type CombatantId } from './values';

export function monsterActionDamage(
  terms: MonsterAttackAction['damage'] | MonsterSavingThrowAction['failure']['damage'],
): DamageRequest {
  return {
    terms: terms.filter((term) => term.trigger.kind === 'always').map((term) => ({
      type: damageType(term.type),
      dice: {
        count: term.dice.count,
        sides: dieSides(term.dice.sides),
        modifier: term.dice.modifier,
      },
    })),
    critical: false,
    responses: [],
  };
}

export function monsterAttackRange(action: MonsterAttackAction): TacticalAttackRange {
  switch (action.delivery.kind) {
    case 'melee': return { kind: 'melee', reachFeet: feet(action.delivery.reachFeet) };
    case 'ranged': return {
      kind: 'ranged',
      normalRangeFeet: feet(action.delivery.rangeFeet),
      longRangeFeet: action.delivery.longRangeFeet.kind === 'present'
        ? feet(action.delivery.longRangeFeet.value)
        : null,
    };
    case 'melee_or_ranged': return {
      kind: 'melee_or_ranged',
      reachFeet: feet(action.delivery.reachFeet),
      normalRangeFeet: feet(action.delivery.rangeFeet),
      longRangeFeet: feet(action.delivery.longRangeFeet),
    };
  }
}

/** Intrinsic statblock roll-mode clauses, evaluated against current target state. */
export function monsterAttackRollModeSources(
  action: MonsterAttackAction,
  actor: CombatantId,
  targetConditions: readonly AppliedCondition[],
  targetHitPoints: number,
  targetHitPointMaximum: number,
): readonly AttackRollModeSource[] {
  const clause = action.attackRollAdvantage;
  if (clause === null) return [];
  switch (clause.kind) {
    case 'target_grappled_by_attacker':
      return targetConditions.some((condition) =>
        condition.name === 'Grappled' && condition.source === actor)
        ? [{ mode: 'advantage', reason: 'target_grappled_by_attacker_advantage' }]
        : [];
    case 'target_not_full_hit_points':
      return targetHitPoints < targetHitPointMaximum
        ? [{ mode: 'advantage', reason: 'target_not_full_hit_points_advantage' }]
        : [];
  }
}

/**
 * Charge riders require reducer-owned proof of the preceding straight-line
 * movement. Until that turn state lands, the declared base attack remains
 * executable but the conditional rider is outside the legal command domain.
 * The SRD Boar states this as movement immediately before the hit:
 * docs/srd/full/srd-5.2.1.txt:22805-22809.
 */
export function executableMonsterOnHitEffects(
  effects: readonly MonsterOnHitEffect[],
): readonly MonsterOnHitEffect[] {
  return effects.filter((effect) =>
    effect.kind !== 'condition' || effect.trigger.kind !== 'charge');
}

export function monsterAttackCommand(
  action: MonsterAttackAction,
  actor: CombatantId,
  target: CombatantId,
  rollMode?: RollMode,
  opportunity?: false,
): Extract<EncounterCommand, { readonly type: 'attack' }>;
export function monsterAttackCommand(
  action: MonsterAttackAction,
  actor: CombatantId,
  target: CombatantId,
  rollMode: RollMode,
  opportunity: true,
): Extract<EncounterCommand, { readonly type: 'opportunity_attack' }>;
export function monsterAttackCommand(
  action: MonsterAttackAction,
  actor: CombatantId,
  target: CombatantId,
  rollMode: RollMode = 'normal',
  opportunity = false,
): Extract<EncounterCommand, { readonly type: 'attack' | 'opportunity_attack' }> {
  return {
    type: opportunity ? 'opportunity_attack' : 'attack',
    actor,
    target,
    attackBonus: action.attackBonus,
    criticalFloor: 20,
    rollMode,
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    tacticalRange: monsterAttackRange(action),
    damage: monsterActionDamage(action.damage),
    attackId: action.id,
    monsterOnHit: executableMonsterOnHitEffects(action.onHit),
  };
}

export function monsterSavingThrowCommand(
  action: MonsterSavingThrowAction,
  actor: CombatantId,
  target: CombatantId,
  cost: 'action' | 'bonus_action' | 'none' = 'action',
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return {
    type: 'force_save',
    actor,
    target,
    ability: action.savingThrow.ability,
    dc: action.savingThrow.dc,
    rollMode: 'normal',
    damage: monsterActionDamage(action.failure.damage),
    onSuccess: action.success.kind === 'half_damage' ? 'half' : 'none',
    cost,
    monsterActionId: action.id,
    monsterFailureEffects: action.failure.effects,
  };
}
