import { describe, expect, it } from 'vitest';
import {
  TACTICAL_EVALUATOR_POLICY,
  combineAttackRollMode,
  evaluateTacticalAttack,
  foldTacticalAttackSequence,
  projectMonsterRollModeSources,
  tacticalRangeVerdict,
  type MonsterRollModeFeatureInput,
  type TacticalAttackInput,
} from '../../../src/combat/tactical-evaluator';
import { combatantId, feet } from '../../../src/combat/values';
import { monsterAttackCommand, monsterAttackRollModeSources } from '../../../src/combat/monster-commands';
import type { MonsterAttackAction, MonsterTrait } from '../../../src/combat/statblock';
import { MONSTER_SIDE } from '../../../src/combat/allies';
import {
  createEncounter,
  evaluateMonsterTacticalAttack,
  reduceEncounter,
} from '../../../src/combat/encounter';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { WOLF } from '../../../src/combat/statblocks/monsters';
import { BERSERKER } from '../../../src/combat/statblocks/mercenary-company';
import { saveRollMode } from '../../../src/combat/combat-rules';
import { placedToken, playerProfile } from './fixtures';

function baseInput(overrides: Partial<TacticalAttackInput> = {}): TacticalAttackInput {
  return {
    attackerId: combatantId('combatant:attacker'),
    targetId: combatantId('combatant:target'),
    attackerPosition: { column: 0, row: 0 },
    targetPosition: { column: 6, row: 0 },
    range: { kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60) },
    attackBonus: 4,
    targetArmorClass: 15,
    criticalFloor: 20,
    damageTerms: [{ dice: { count: 1, sides: 8, modifier: 2 } }],
    attackerConditions: [],
    targetConditions: [],
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    rollModeSources: [],
    featureRollModeInput: null,
    target: { hitPoints: 10, usesDeathSaves: true },
    ...overrides,
  };
}

const PACK_TACTICS: Extract<MonsterTrait, { readonly kind: 'pack_tactics' }> = {
  kind: 'pack_tactics', allyDistanceFeet: 5,
  blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls',
};

function featureInput(overrides: Partial<MonsterRollModeFeatureInput> = {}): MonsterRollModeFeatureInput {
  return {
    kind: 'attack_roll',
    traits: [PACK_TACTICS],
    actor: {
      id: combatantId('combatant:pack-actor'), faction: MONSTER_SIDE,
      hitPoints: 10, hitPointMaximum: 10,
    },
    targetPosition: { column: 1, row: 0 },
    combatants: [{
      id: combatantId('combatant:pack-ally'), faction: MONSTER_SIDE,
      position: { column: 2, row: 0 }, life: 'living', incapacitated: false,
    }],
    ...overrides,
  };
}

describe('canonical tactical evaluator', () => {
  it('pack_tactics_five_not_ten: qualifies a living monster-side ally at 5 feet, not 10 feet', () => {
    expect(projectMonsterRollModeSources(featureInput())).toEqual([
      { mode: 'advantage', reason: 'pack_tactics_advantage' },
    ]);
    expect(projectMonsterRollModeSources(featureInput({
      combatants: [{
        id: combatantId('combatant:pack-ally'), faction: MONSTER_SIDE,
        position: { column: 3, row: 0 }, life: 'living', incapacitated: false,
      }],
    }))).toEqual([]);
  });

  it('pack_tactics_incapacitated_and_faction: rejects Incapacitated and player-side allies', () => {
    expect(projectMonsterRollModeSources(featureInput({
      combatants: [{
        id: combatantId('combatant:pack-ally'), faction: MONSTER_SIDE,
        position: { column: 2, row: 0 }, life: 'living', incapacitated: true,
      }],
    }))).toEqual([]);
    expect(projectMonsterRollModeSources(featureInput({
      combatants: [{
        id: combatantId('combatant:player-ally'), faction: 'player_character_side',
        position: { column: 2, row: 0 }, life: 'living', incapacitated: false,
      }],
    }))).toEqual([]);
  });

  it('bloodied_inclusive_half: triggers both attack traits at half but not one HP above', () => {
    const traits: readonly MonsterTrait[] = [
      { kind: 'bloodied_frenzy', grantsAdvantageOn: ['attack_rolls', 'saving_throws'] },
      { kind: 'bloodied_fury', grantsAdvantageOn: ['attack_rolls'] },
    ];
    expect(projectMonsterRollModeSources(featureInput({
      traits, actor: {
        id: combatantId('combatant:bloodied'), faction: MONSTER_SIDE,
        hitPoints: 5, hitPointMaximum: 10,
      },
    })).map((source) => source.reason)).toEqual([
      'bloodied_frenzy_advantage', 'bloodied_fury_advantage',
    ]);
    expect(projectMonsterRollModeSources(featureInput({
      traits, actor: {
        id: combatantId('combatant:bloodied'), faction: MONSTER_SIDE,
        hitPoints: 6, hitPointMaximum: 10,
      },
    }))).toEqual([]);
    expect(projectMonsterRollModeSources({
      kind: 'saving_throw', traits,
      actor: {
        id: combatantId('combatant:bloodied'), faction: MONSTER_SIDE,
        hitPoints: 5, hitPointMaximum: 10,
      },
    })).toEqual([{ mode: 'advantage', reason: 'bloodied_frenzy_advantage' }]);

    const toughBase = monsterCombatantProfile(BERSERKER, {
      combatantId: 'combatant:bloodied-berserker', tokenId: 'token:bloodied-berserker',
    });
    const tough = { ...toughBase, rules: { ...toughBase.rules, sizeCategory: 'Medium' as const } };
    const opponent = playerProfile('bloodied-opponent');
    const initial = createEncounter({
      bounds: { columns: 2, rows: 1 }, combatants: [tough, opponent],
      tokens: [placedToken(tough, 0), placedToken(opponent, 1)],
    });
    const atHalf = {
      ...initial,
      combatants: initial.combatants.map((candidate) => candidate.profile.id === tough.id
        ? { ...candidate, hitPoints: Math.floor(tough.rules.hitPointMaximum / 2) }
        : candidate),
    };
    const aboveHalf = {
      ...atHalf,
      combatants: atHalf.combatants.map((candidate) => candidate.profile.id === tough.id
        ? { ...candidate, hitPoints: Math.floor(tough.rules.hitPointMaximum / 2) + 1 }
        : candidate),
    };
    expect(saveRollMode(atHalf, tough.id, 'dexterity', 'normal', 'other')).toBe('advantage');
    expect(saveRollMode(aboveHalf, tough.id, 'dexterity', 'normal', 'other')).toBe('normal');
  });

  it('pack_tactics_evaluator_reducer_agreement: scores and rolls the same applicable fixture with advantage', () => {
    const actorBase = monsterCombatantProfile(WOLF, {
      combatantId: 'combatant:pack-wolf', tokenId: 'token:pack-wolf',
    });
    const actor = { ...actorBase, rules: { ...actorBase.rules, initiativeBonus: 20 } };
    const allyBase = monsterCombatantProfile(WOLF, {
      combatantId: 'combatant:pack-ally', tokenId: 'token:pack-ally',
    });
    const ally = { ...allyBase, rules: { ...allyBase.rules, initiativeBonus: -10 } };
    const targetBase = playerProfile('pack-target', { initiativeBonus: -20 });
    const target = { ...targetBase, rules: { ...targetBase.rules, sizeCategory: 'Medium' as const } };
    const initial = createEncounter({
      config: { initiativeMode: 'per_combatant' },
      bounds: { columns: 4, rows: 1 },
      combatants: [actor, ally, target],
      tokens: [placedToken(actor, 0), placedToken(target, 1), placedToken(ally, 2)],
    });
    const started = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
    const actions = WOLF.sourceDetails.actions;
    if (actions.kind !== 'present') throw new Error('Wolf actions are absent.');
    const bite = actions.value.find(
      (action): action is MonsterAttackAction => action.kind === 'attack' && action.id === 'bite',
    );
    if (bite === undefined) throw new Error('Wolf Bite is absent.');

    const evaluation = evaluateMonsterTacticalAttack(started, bite, actor.id, target.id);
    const reduced = reduceEncounter(
      started,
      monsterAttackCommand(bite, actor.id, target.id),
      () => 0.5,
    );
    const attack = reduced.events.find((event) => event.type === 'attack_resolved');
    if (attack?.type !== 'attack_resolved') throw new Error('Wolf Bite emitted no attack roll.');

    expect(evaluation.rollMode.mode).toBe('advantage');
    expect(evaluation.rollMode.reasons).toContain('pack_tactics_advantage');
    expect(attack.attack.roll.mode).toBe(evaluation.rollMode.mode);
    expect(attack.attack.roll.faces).toHaveLength(2);
  });

  it('pins melee, normal, long, and out boundaries from Chebyshev distance', () => {
    const attacker = { column: 0, row: 0 };
    expect(tacticalRangeVerdict(attacker, { column: 1, row: 1 }, {
      kind: 'melee', reachFeet: feet(5),
    })).toEqual({ status: 'resolved', distanceFeet: 5, band: 'melee', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 6, row: 6 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 30, band: 'normal', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 7, row: 0 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 35, band: 'long', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 12, row: 0 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 60, band: 'long', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 13, row: 0 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 65, band: 'out', legal: false });
  });

  it('cancels any advantage plus any disadvantage to a straight roll', () => {
    expect(combineAttackRollMode([
      { mode: 'advantage', reason: 'effect_advantage' },
      { mode: 'disadvantage', reason: 'effect_disadvantage' },
    ])).toEqual({
      mode: 'normal',
      reasons: ['effect_advantage', 'effect_disadvantage'],
      sources: [
        { mode: 'advantage', reason: 'effect_advantage' },
        { mode: 'disadvantage', reason: 'effect_disadvantage' },
      ],
    });
  });

  it('includes typed intrinsic statblock advantage sources', () => {
    const actor = combatantId('combatant:attacker');
    const action: MonsterAttackAction = {
      kind: 'attack',
      id: 'clamp',
      name: 'Clamp',
      attackBonus: 4,
      delivery: { kind: 'melee', reachFeet: 5 },
      damage: [],
      attackRollAdvantage: { kind: 'target_grappled_by_attacker' },
      onHit: [],
    };
    expect(monsterAttackRollModeSources(
      action,
      actor,
      [{ name: 'Grappled', source: actor }],
      10,
      10,
    )).toEqual([{
      mode: 'advantage',
      reason: 'target_grappled_by_attacker_advantage',
    }]);
    expect(monsterAttackRollModeSources(
      { ...action, attackRollAdvantage: { kind: 'target_not_full_hit_points' } },
      actor,
      [],
      9,
      10,
    )).toEqual([{
      mode: 'advantage',
      reason: 'target_not_full_hit_points_advantage',
    }]);
  });

  it('derives straight unconscious-plus-prone attacks beyond 5 feet with typed reasons', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      targetConditions: [{ name: 'Unconscious' }],
    }));
    expect(evaluation.policy).toBe(TACTICAL_EVALUATOR_POLICY);
    expect(evaluation.rollMode).toMatchObject({
      mode: 'normal',
      reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
    });
  });

  it('forces critical hits only within the condition gate', () => {
    const near = evaluateTacticalAttack(baseInput({
      targetPosition: { column: 1, row: 0 },
      targetConditions: [{ name: 'Unconscious' }],
    }));
    const far = evaluateTacticalAttack(baseInput({
      targetConditions: [{ name: 'Unconscious' }],
    }));
    expect(near.consequences).toMatchObject({
      automaticCriticalOnHit: true,
      automaticCriticalMaximumDistanceFeet: 5,
    });
    expect(far.consequences).toMatchObject({
      automaticCriticalOnHit: false,
      automaticCriticalMaximumDistanceFeet: 5,
    });
    expect(near.probabilities.status).toBe('resolved');
    if (near.probabilities.status !== 'resolved') throw new Error('Near probability unresolved.');
    expect(near.probabilities.critical).toBe(near.probabilities.hit);
    expect(far.probabilities).toMatchObject({ status: 'resolved', critical: 0.05 });
  });

  it('marks one death failure on a hit and two on a critical at zero HP', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      target: { hitPoints: 0, usesDeathSaves: true },
    }));
    expect(evaluation.consequences).toMatchObject({
      deathFailureOnHit: true,
      failuresOnHit: 1,
      failuresOnCritical: 2,
    });
  });

  it('separates hit and critical probability in exact base damage expectation', () => {
    const evaluation = evaluateTacticalAttack(baseInput());
    // +4 vs AC 15 hits on 11..20: P(hit)=10/20, P(crit)=1/20.
    // 1d8+2 averages 6.5; a critical 2d8+2 averages 11.
    expect(evaluation.probabilities).toEqual({
      status: 'resolved', hit: 0.5, critical: 0.05, miss: 0.5,
    });
    expect(evaluation.damage).toMatchObject({
      status: 'resolved', normalHitAverage: 6.5, criticalHitAverage: 11,
    });
    if (evaluation.damage.status !== 'resolved') throw new Error('Damage unresolved.');
    expect(evaluation.damage.expectedDamage).toBeCloseTo(3.475, 12);
  });

  it('returns typed unresolved results instead of guessing an absent long range', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      targetPosition: { column: 7, row: 0 },
      range: { kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: null },
    }));
    expect(evaluation.range).toEqual({
      status: 'unresolved', distanceFeet: 35, reason: 'long_range_unresolved',
    });
    expect(evaluation.probabilities).toEqual({
      status: 'unresolved', reason: 'long_range_unresolved',
    });
    expect(evaluation.damage).toEqual({
      status: 'unresolved', reason: 'long_range_unresolved',
    });
  });

  it('refuses probability and damage numbers when an analytic modifier is unresolved', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      unresolvedReasons: ['random_attack_modifier_unresolved'],
    }));
    expect(evaluation.probabilities).toEqual({
      status: 'unresolved', reason: 'random_attack_modifier_unresolved',
    });
    expect(evaluation.damage).toEqual({
      status: 'unresolved', reason: 'random_attack_modifier_unresolved',
    });
  });

  it('folds death failures for single and two-attack sequences with criticals worth two', () => {
    const attack = baseInput({ attackBonus: 9, targetArmorClass: 20 });
    const single = foldTacticalAttackSequence({
      target: { kind: 'death_saves', existingFailures: 0 }, attacks: [attack],
    });
    const criticalCanFinish = foldTacticalAttackSequence({
      target: { kind: 'death_saves', existingFailures: 1 }, attacks: [attack],
    });
    const two = foldTacticalAttackSequence({
      target: { kind: 'death_saves', existingFailures: 0 }, attacks: [attack, attack],
    });
    // +9 vs AC 20: miss=10/20, ordinary hit=9/20, critical=1/20.
    // From 0, one attack cannot reach 3. From 1, only the critical reaches 3.
    // From 0 with two attacks: hit+crit in either order, or two crits.
    expect(single.killProbability).toBe(0);
    expect(criticalCanFinish.killProbability).toBe(1 / 20);
    expect(two.killProbability).toBe(2 * (9 / 20) * (1 / 20) + (1 / 20) ** 2);
  });

  it('accounts for existing failures and caps accumulated failures at three', () => {
    const attack = baseInput({ attackBonus: 9, targetArmorClass: 20 });
    const fromOne = foldTacticalAttackSequence({
      target: { kind: 'death_saves', existingFailures: 1 }, attacks: [attack, attack],
    });
    const fromTwo = foldTacticalAttackSequence({
      target: { kind: 'death_saves', existingFailures: 2 }, attacks: [attack],
    });
    // From 1, two added failures arise from any critical (39/400) or two
    // ordinary hits (81/400): 120/400. From 2, miss leaves 2 and any hit caps at 3.
    expect(fromOne.killProbability).toBeCloseTo(120 / 400, 15);
    expect(fromTwo.killProbability).toBe(10 / 20);
    expect(fromTwo.expectedFailures).toBe(2.5);
  });

  it('averages a bless-style +1d4 exactly while leaving the natural-20 critical mass unchanged', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      attackBonus: 4,
      targetArmorClass: 18,
      attackRollModifiers: [{ kind: 'die', count: 1, sides: 4, sign: 1, reason: 'bless' }],
    }));
    // The four faces shift P(hit) to 8/20, 9/20, 10/20, and 11/20.
    // Their exact average is 19/40; natural 20 remains the sole critical face.
    expect(evaluation.probabilities.status).toBe('resolved');
    if (evaluation.probabilities.status !== 'resolved') throw new Error('Bless probability unresolved.');
    expect(evaluation.probabilities.hit).toBeCloseTo(19 / 40, 15);
    expect(evaluation.probabilities.critical).toBeCloseTo(1 / 20, 15);
    expect(evaluation.probabilities.miss).toBeCloseTo(21 / 40, 15);
  });

  it('conditions a mid-sequence modifier on only later attacks', () => {
    const unmodified = baseInput({ attackBonus: 4, targetArmorClass: 18 });
    const blessed = baseInput({
      attackBonus: 4,
      targetArmorClass: 18,
      attackRollModifiers: [{ kind: 'die', count: 1, sides: 4, sign: 1, reason: 'bless' }],
    });
    const fold = foldTacticalAttackSequence({
      target: { kind: 'death_saves', existingFailures: 0 },
      attacks: [unmodified, blessed, blessed],
    });
    // Hand convolution of {13/20 miss, 6/20 hit, 1/20 crit} followed by two
    // {21/40 miss, 17/40 hit, 2/40 crit} attacks puts 953/6400 at 3 failures.
    expect(fold.killProbability).toBeCloseTo(953 / 6400, 15);
  });

  it('folds typed damage exactly for a living target and refuses an untyped damage sequence', () => {
    const typed = foldTacticalAttackSequence({
      target: { kind: 'living_hit_points', hitPoints: 1 },
      attacks: [baseInput({ attackBonus: 4, targetArmorClass: 15 })],
    });
    // Every 1d8+2 hit deals at least 1, so P(reduce to 0) is the literal 10/20 hit chance.
    expect(typed).toMatchObject({ status: 'resolved', killProbability: 10 / 20 });
    const unresolved = foldTacticalAttackSequence({
      target: { kind: 'living_hit_points', hitPoints: 1 },
      attacks: [baseInput({ damageTerms: null })],
    });
    expect(unresolved).toMatchObject({
      status: 'unresolved', killProbability: null,
      reasonCodes: ['attack_damage_unresolved'],
    });
  });
});
