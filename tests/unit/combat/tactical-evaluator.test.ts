import { describe, expect, it } from 'vitest';
import {
  TACTICAL_EVALUATOR_POLICY,
  combineAttackRollMode,
  evaluateTacticalAttack,
  foldTacticalAttackSequence,
  attackRollDelivery,
  closeCombatVerdict,
  projectMonsterRollModeSources,
  tacticalRangeVerdict,
  type CloseCombatEnemy,
  type MonsterRollModeFeatureInput,
  type TacticalAttackInput,
} from '../../../src/combat/tactical-evaluator';
import {
  combatantId,
  effectStackingIdentity,
  encounterEffectId,
  feet,
  type CombatantId,
} from '../../../src/combat/values';
import { monsterAttackCommand, monsterAttackRollModeSources } from '../../../src/combat/monster-commands';
import type { MonsterAttackAction, MonsterTrait } from '../../../src/combat/statblock';
import { MONSTER_SIDE } from '../../../src/combat/allies';
import {
  canCombatantSee,
  closeCombatEnemies,
  createEncounter,
  evaluateMonsterTacticalAttack,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { feetPoint } from '../../../src/combat/templates';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { GOBLIN_WARRIOR, OGRE, WOLF } from '../../../src/combat/statblocks/monsters';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { BERSERKER } from '../../../src/combat/statblocks/mercenary-company';
import { saveRollMode } from '../../../src/combat/combat-rules';
import { placedToken, playerProfile } from './fixtures';

const PLANNING_QUERIES = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' }).queries;

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
    closeCombatEnemies: [],
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

/*
 * RANGED ATTACKS IN CLOSE COMBAT, docs/srd/full/srd-5.2.1.txt:911-917: "When
 * you make a ranged attack roll with a weapon, a spell, or some other means,
 * you have Disadvantage on the roll if you are within 5 feet of an enemy who
 * can see you and doesn't have the Incapacitated condition."
 *
 * EVALUATOR NUMBERS (baseInput: +4 against AC 15, 1d8 + 2, a ranged 30/60
 * attack at 30 feet). One d20 hits on faces 11-20: hit 10/20, critical 1/20;
 * a hit averages 6.5, a Critical Hit 2 x 4.5 + 2 = 11.
 * - Straight: ED = 9/20 x 6.5 + 1/20 x 11 = 2.925 + 0.55 = 3.475.
 * - Disadvantage: hit (10/20)^2 = 1/4, critical (1/20)^2 = 1/400:
 *   ED = 99/400 x 6.5 + 1/400 x 11 = 643.5/400 + 11/400 = 1.63625.
 *
 * BOARD (5 columns, 3 rows; bright light, every creature sees normally): a
 * Goblin Warrior archer at (0,0) with its Shortbow (+4, 80/320,
 * :18985-19018), the target PC at (3,0), 15 feet away, and a second PC at
 * (0,1), 5 feet from the goblin and off every line between the goblin and the
 * target (so no creature cover). The PCs have AC 14 (tests/unit/combat
 * /fixtures.ts). One d20 hits AC 14 on faces 10-20: hit 11/20, critical 1/20;
 * with Disadvantage hit 121/400 = 0.3025, critical 1/400 = 0.0025. The
 * reducer's d20 source is fixed at 0.5 (face 11), so the event shows two
 * faces under Disadvantage and one otherwise.
 */
function enemy(overrides: Partial<CloseCombatEnemy> = {}): CloseCombatEnemy {
  return {
    id: combatantId('combatant:close-enemy'),
    distanceFeet: 5,
    seesAttacker: true,
    incapacitated: false,
    ...overrides,
  };
}

function condition(key: string, target: CombatantId, name: 'Blinded' | 'Paralyzed'): EncounterState['effects'][number] {
  return {
    id: encounterEffectId(`effect:${key}`),
    source: target,
    targets: [target],
    createdRevision: 0,
    duration: { kind: 'permanent' },
    concentrationOwner: null,
    stackingIdentity: effectStackingIdentity(key),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: { kind: 'condition', condition: name },
  };
}

function goblinArcherBoard(input: {
  readonly key: string;
  readonly neighbour: 'pc' | 'goblin_ally' | 'none';
  readonly neighbourCell?: { readonly column: number; readonly row: number };
  readonly neighbourCondition?: 'Blinded' | 'Paralyzed' | 'dying' | 'stable';
}) {
  const archerBase = monsterCombatantProfile(GOBLIN_WARRIOR, {
    combatantId: `combatant:${input.key}-archer`, tokenId: `token:${input.key}-archer`,
  });
  const archer = { ...archerBase, rules: { ...archerBase.rules, initiativeBonus: 20 } };
  const target = playerProfile(`${input.key}-target`, { initiativeBonus: -20 });
  const neighbour = input.neighbour === 'pc'
    ? playerProfile(`${input.key}-neighbour`, { initiativeBonus: -20 })
    : input.neighbour === 'goblin_ally'
      ? (() => {
          const base = monsterCombatantProfile(GOBLIN_WARRIOR, {
            combatantId: `combatant:${input.key}-ally`, tokenId: `token:${input.key}-ally`,
          });
          return { ...base, rules: { ...base.rules, initiativeBonus: -20 } };
        })()
      : null;
  const cell = input.neighbourCell ?? { column: 0, row: 1 };
  const created = createEncounter({
    bounds: { columns: 5, rows: 3 },
    combatants: [archer, target, ...(neighbour === null ? [] : [neighbour])],
    tokens: [
      placedToken(archer, 0, 0),
      placedToken(target, 3, 0),
      ...(neighbour === null ? [] : [placedToken(neighbour, cell.column, cell.row)]),
    ],
  });
  const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
  const conditionName = input.neighbourCondition;
  const state: EncounterState = neighbour === null || conditionName === undefined
    ? started
    : conditionName === 'dying'
      ? {
          ...started,
          combatants: started.combatants.map((combatant) => combatant.profile.id === neighbour.id
            ? { ...combatant, hitPoints: 0, life: 'dying' as const, deathSaves: { successes: 0, failures: 0 } }
            : combatant),
        }
      : conditionName === 'stable'
        ? {
            ...started,
            combatants: started.combatants.map((combatant) => combatant.profile.id === neighbour.id
              ? { ...combatant, hitPoints: 0, life: 'stable' as const, deathSaves: null }
              : combatant),
          }
        : { ...started, effects: [...started.effects, condition(`${input.key}-condition`, neighbour.id, conditionName)] };
  const actions = GOBLIN_WARRIOR.sourceDetails.actions;
  if (actions.kind !== 'present') throw new Error('Goblin Warrior actions are absent.');
  const shortbow = actions.value.find(
    (action): action is MonsterAttackAction => action.kind === 'attack' && action.id === 'shortbow',
  );
  if (shortbow === undefined) throw new Error('Goblin Warrior Shortbow is absent.');
  expect(state.activeCombatant).toBe(archer.id);
  return { state, archer, target, neighbour, shortbow };
}

function rolledMode(state: EncounterState, command: Parameters<typeof reduceEncounter>[1]) {
  const attack = reduceEncounter(state, command, () => 0.5).events.find((event) => event.type === 'attack_resolved');
  if (attack?.type !== 'attack_resolved') throw new Error('The attack emitted no attack roll.');
  return { mode: attack.attack.roll.mode, faces: attack.attack.roll.faces.length };
}

describe('Ranged Attacks in Close Combat (docs/srd/full/srd-5.2.1.txt:911-917)', () => {
  it('CC-RULE-EVALUATOR: a ranged attack roll within 5 feet of a seeing, alert enemy has Disadvantage (3.475 -> 1.63625); melee, a distant, blind or Incapacitated enemy, or an ally do not', () => {
    const expected = (input: TacticalAttackInput) => {
      const evaluation = evaluateTacticalAttack(input);
      return {
        mode: evaluation.rollMode.mode,
        closeCombat: evaluation.rollMode.reasons.includes('ranged_close_combat_disadvantage'),
        hit: evaluation.probabilities.status === 'resolved' ? evaluation.probabilities.hit : evaluation.probabilities.reason,
        damage: evaluation.damage.status === 'resolved'
          ? Math.round(evaluation.damage.expectedDamage * 1e9) / 1e9
          : evaluation.damage.reason,
      };
    };
    const straight = { mode: 'normal', closeCombat: false, hit: 0.5, damage: 3.475 };
    const disadvantage = { mode: 'disadvantage', closeCombat: true, hit: 0.25, damage: 1.63625 };

    expect(expected(baseInput({ closeCombatEnemies: [] }))).toEqual(straight);
    expect(expected(baseInput({ closeCombatEnemies: [enemy()] }))).toEqual(disadvantage);
    expect(expected(baseInput({ closeCombatEnemies: [enemy({ distanceFeet: 10 })] }))).toEqual(straight);
    expect(expected(baseInput({ closeCombatEnemies: [enemy({ incapacitated: true })] }))).toEqual(straight);
    expect(expected(baseInput({ closeCombatEnemies: [enemy({ seesAttacker: false })] }))).toEqual(straight);
    // A planner that does not know whether the enemy sees the attacker states no number.
    expect(expected(baseInput({ closeCombatEnemies: [enemy({ seesAttacker: { kind: 'unknown' } })] }))).toEqual({
      mode: 'normal', closeCombat: false, hit: 'close_combat_unresolved', damage: 'close_combat_unresolved',
    });
    expect(evaluateTacticalAttack(baseInput({ closeCombatEnemies: [enemy({ seesAttacker: { kind: 'unknown' } })] })).unresolved)
      .toContain('close_combat_unresolved');
    // One enemy known to see the attacker decides it, whatever another's sight.
    expect(expected(baseInput({
      closeCombatEnemies: [enemy({ id: combatantId('combatant:unknown'), seesAttacker: { kind: 'unknown' } }), enemy()],
    }))).toEqual(disadvantage);

    // A melee attack never has it; a melee-or-ranged (thrown) attack has it only beyond its reach.
    const adjacentTarget = { targetPosition: { column: 1, row: 0 } };
    expect(expected(baseInput({ ...adjacentTarget, range: { kind: 'melee', reachFeet: feet(5) }, closeCombatEnemies: [enemy()] })))
      .toEqual(straight);
    const thrown = { kind: 'melee_or_ranged', reachFeet: feet(5), normalRangeFeet: feet(30), longRangeFeet: feet(120) } as const;
    expect(expected(baseInput({ ...adjacentTarget, range: thrown, closeCombatEnemies: [enemy()] }))).toEqual(straight);
    expect(expected(baseInput({ range: thrown, closeCombatEnemies: [enemy()] }))).toEqual(disadvantage);

    expect(closeCombatVerdict(attackRollDelivery({ kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60) }, 30), [
      enemy({ id: combatantId('combatant:blind'), seesAttacker: false }),
      enemy({ id: combatantId('combatant:alert') }),
      enemy({ id: combatantId('combatant:far'), distanceFeet: 10 }),
    ])).toEqual({ kind: 'disadvantage', enemies: [combatantId('combatant:alert')] });
    expect(closeCombatVerdict(attackRollDelivery({ kind: 'melee', reachFeet: feet(5) }, 5), [enemy()])).toEqual({ kind: 'melee_attack' });
  });

  it('CC-REDUCER: the goblin archer rolls two d20s at a PC 15 feet away while a second PC stands next to it, and one when that PC is Paralyzed, Blinded, dying, Stable, 10 feet away, or a goblin ally', () => {
    const rolled = (board: ReturnType<typeof goblinArcherBoard>, target = board.target.id) =>
      rolledMode(board.state, monsterAttackCommand(board.shortbow, board.archer.id, target));
    const alert = goblinArcherBoard({ key: 'cc-alert', neighbour: 'pc' });
    expect(rolled(alert)).toEqual({ mode: 'disadvantage', faces: 2 });
    // The adjacent PC is itself the target: it is also an enemy within 5 feet.
    if (alert.neighbour === null) throw new Error('The board has a neighbour.');
    expect(rolled(alert, alert.neighbour.id)).toEqual({ mode: 'disadvantage', faces: 2 });

    expect(rolled(goblinArcherBoard({ key: 'cc-none', neighbour: 'none' }))).toEqual({ mode: 'normal', faces: 1 });
    expect(rolled(goblinArcherBoard({ key: 'cc-paralyzed', neighbour: 'pc', neighbourCondition: 'Paralyzed' })))
      .toEqual({ mode: 'normal', faces: 1 });
    expect(rolled(goblinArcherBoard({ key: 'cc-blinded', neighbour: 'pc', neighbourCondition: 'Blinded' })))
      .toEqual({ mode: 'normal', faces: 1 });
    expect(rolled(goblinArcherBoard({ key: 'cc-dying', neighbour: 'pc', neighbourCondition: 'dying' })))
      .toEqual({ mode: 'normal', faces: 1 });
    // A Stable creature still has 0 Hit Points and the Unconscious condition (:1115-1117).
    expect(rolled(goblinArcherBoard({ key: 'cc-stable', neighbour: 'pc', neighbourCondition: 'stable' })))
      .toEqual({ mode: 'normal', faces: 1 });
    expect(rolled(goblinArcherBoard({ key: 'cc-far', neighbour: 'pc', neighbourCell: { column: 0, row: 2 } })))
      .toEqual({ mode: 'normal', faces: 1 });
    expect(rolled(goblinArcherBoard({ key: 'cc-ally', neighbour: 'goblin_ally' }))).toEqual({ mode: 'normal', faces: 1 });
  });

  it('CC-MONSTER-PLANNER: both monster planners score the goblin\'s Shortbow with the Disadvantage the reducer rolls (0.3025, not 0.55)', () => {
    const plan = (board: ReturnType<typeof goblinArcherBoard>) => {
      const adapter = evaluateMonsterTacticalAttack(board.state, board.shortbow, board.archer.id, board.target.id);
      const port = PLANNING_QUERIES.tacticalAttack(board.state, board.archer.id, board.target.id, 'shortbow');
      if (port === null) throw new Error('The planning port has no Shortbow verdict.');
      return [adapter, port].map((evaluation) => ({
        mode: evaluation.rollMode.mode,
        closeCombat: evaluation.rollMode.reasons.includes('ranged_close_combat_disadvantage'),
        probabilities: evaluation.probabilities.status === 'resolved'
          ? [Math.round(evaluation.probabilities.hit * 1e9) / 1e9, Math.round(evaluation.probabilities.critical * 1e9) / 1e9]
          : evaluation.probabilities.reason,
      }));
    };
    const alert = goblinArcherBoard({ key: 'cc-plan-alert', neighbour: 'pc' });
    const disadvantage = { mode: 'disadvantage', closeCombat: true, probabilities: [0.3025, 0.0025] };
    expect(plan(alert)).toEqual([disadvantage, disadvantage]);
    expect(rolledMode(alert.state, monsterAttackCommand(alert.shortbow, alert.archer.id, alert.target.id)).mode)
      .toBe('disadvantage');
    const straight = { mode: 'normal', closeCombat: false, probabilities: [0.55, 0.05] };
    expect(plan(goblinArcherBoard({ key: 'cc-plan-paralyzed', neighbour: 'pc', neighbourCondition: 'Paralyzed' })))
      .toEqual([straight, straight]);
    expect(plan(goblinArcherBoard({ key: 'cc-plan-ally', neighbour: 'goblin_ally' }))).toEqual([straight, straight]);
  });

  /*
   * CC-SIGHT-PARITY. The goblin archer board with a Fog Cloud-style heavily
   * obscured area (an active obscured_area effect): a 5-foot sphere on the
   * archer's corner (5,5) feet, which covers (0,0)-(1,1) and not the target at
   * (3,0). Sight is judged at the subject's cell (src/combat/sight.ts), so
   * neither PC sees the archer inside it, while the archer sees the target
   * outside it. The neighbour PC, 5 feet away, therefore imposes no
   * close-combat Disadvantage, and the target cannot see its attacker:
   * Advantage (unseen attacker). With the RNG at 0.5 the reducer rolls two
   * faces. The planning port must state the same facts: before review r2 it
   * read its own detection mirror, which skipped placed obscured areas, and
   * planned this shot with Disadvantage and no Advantage.
   */
  it('CC-SIGHT-PARITY: in a heavily obscured area on the goblin archer, both monster planners and the reducer agree nobody sees it: no close-combat Disadvantage, Advantage from the unseen attacker', () => {
    const board = goblinArcherBoard({ key: 'cc-fog', neighbour: 'pc' });
    if (board.neighbour === null) throw new Error('The board has a neighbour.');
    const fog: EncounterState['effects'][number] = {
      id: encounterEffectId('effect:cc-fog'),
      source: board.target.id,
      targets: [],
      createdRevision: 0,
      duration: { kind: 'permanent' },
      concentrationOwner: null,
      stackingIdentity: effectStackingIdentity('cc-fog'),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: {
        kind: 'obscured_area',
        placement: { shape: 'sphere', template: { origin: feetPoint(5, 5), radius: feet(5) } },
        radiusFeet: 5,
        obscurement: 'heavy',
        dispersedByStrongWind: true,
      },
    };
    const state: EncounterState = { ...board.state, effects: [...board.state.effects, fog] };
    // The reducer's sight: neither PC sees the archer; the archer sees the target.
    expect(canCombatantSee(state, board.neighbour.id, board.archer.id)).toBe(false);
    expect(canCombatantSee(state, board.target.id, board.archer.id)).toBe(false);
    expect(canCombatantSee(state, board.archer.id, board.target.id)).toBe(true);
    expect(rolledMode(state, monsterAttackCommand(board.shortbow, board.archer.id, board.target.id)))
      .toEqual({ mode: 'advantage', faces: 2 });

    const port = PLANNING_QUERIES.tacticalAttack(state, board.archer.id, board.target.id, 'shortbow');
    if (port === null) throw new Error('The planning port has no Shortbow verdict.');
    const adapter = evaluateMonsterTacticalAttack(state, board.shortbow, board.archer.id, board.target.id);
    for (const evaluation of [port, adapter]) {
      expect(evaluation.rollMode.mode).toBe('advantage');
      expect(evaluation.rollMode.reasons).toContain('unseen_attacker_advantage');
      expect(evaluation.rollMode.reasons).not.toContain('ranged_close_combat_disadvantage');
    }
    const expectedEnemies = [{ id: board.neighbour.id, distanceFeet: 5, seesAttacker: false, incapacitated: false }];
    expect(PLANNING_QUERIES.closeCombatEnemies(state, board.archer.id)).toEqual(expectedEnemies);
    expect(closeCombatEnemies(state, board.archer.id)).toEqual(expectedEnemies);
  });

  it('CC-THROWN: the Ogre\'s Javelin thrown at a PC 20 feet away has Disadvantage with another PC next to it; swung at that PC, a melee attack, it does not', () => {
    const ogreBase = monsterCombatantProfile(OGRE, { combatantId: 'combatant:cc-ogre', tokenId: 'token:cc-ogre' });
    const ogre = { ...ogreBase, rules: { ...ogreBase.rules, initiativeBonus: 20 } };
    const far = playerProfile('cc-ogre-far', { initiativeBonus: -20 });
    const near = playerProfile('cc-ogre-near', { initiativeBonus: -20 });
    const created = createEncounter({
      bounds: { columns: 7, rows: 3 },
      combatants: [ogre, far, near],
      tokens: [placedToken(ogre, 0, 0), placedToken(far, 6, 0), placedToken(near, 2, 2)],
    });
    const state = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    expect(state.activeCombatant).toBe(ogre.id);
    const actions = OGRE.sourceDetails.actions;
    if (actions.kind !== 'present') throw new Error('Ogre actions are absent.');
    const javelin = actions.value.find(
      (action): action is MonsterAttackAction => action.kind === 'attack' && action.id === 'javelin',
    );
    if (javelin === undefined) throw new Error('Ogre Javelin is absent.');
    // The Large Ogre fills (0,0)-(1,1): the far PC is 20 feet away, the near PC 5 feet.
    expect(rolledMode(state, monsterAttackCommand(javelin, ogre.id, far.id))).toEqual({ mode: 'disadvantage', faces: 2 });
    expect(rolledMode(state, monsterAttackCommand(javelin, ogre.id, near.id))).toEqual({ mode: 'normal', faces: 1 });
    expect(evaluateMonsterTacticalAttack(state, javelin, ogre.id, far.id).rollMode.reasons)
      .toContain('ranged_close_combat_disadvantage');
    expect(evaluateMonsterTacticalAttack(state, javelin, ogre.id, near.id).rollMode.mode).toBe('normal');
  });
});
