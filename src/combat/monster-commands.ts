import type { EncounterCommand } from './events';
import type { DamageRequest, RollMode } from './resolution';
import type {
  MonsterAttackAction,
  MonsterOnHitEffect,
  MonsterSavingThrowAction,
} from './statblock';
import { damageType, dieSides, type CombatantId } from './values';

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
    damage: monsterActionDamage(action.damage),
    attackId: action.id,
    monsterOnHit: executableMonsterOnHitEffects(action.onHit),
  };
}

export function monsterSavingThrowCommand(
  action: MonsterSavingThrowAction,
  actor: CombatantId,
  target: CombatantId,
  cost: 'action' | 'none' = 'action',
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
