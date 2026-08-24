import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  combatantConditions,
  createEncounter,
  effectiveCombatRules,
  reduceEncounter,
  type EncounterState,
  type PendingDecision,
} from '../../../src/combat/encounter';
import { monsterAttackCommand } from '../../../src/combat/monster-commands';
import { damageType, dieSides, effectStackingIdentity, statblockId, type StatblockId } from '../../../src/combat/values';
import {
  WildShapeRuleError,
  createWildShapeCharacterSheet,
  recoverWildShapeUses,
  wildShapeDurationRounds,
  wildShapeForm,
  wildShapeKnownFormMaximum,
  wildShapeUseMaximum,
} from '../../../src/combat/wild-shape';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const WOLF = statblockId('statblock:wolf');
const BOAR = statblockId('statblock:boar');
const BLACK_BEAR = statblockId('statblock:black-bear');
const CROCODILE = statblockId('statblock:crocodile');
const DIRE_WOLF = statblockId('statblock:dire-wolf');
const BLOOD_HAWK = statblockId('statblock:blood-hawk');
const BRUSH_BEAR = statblockId('statblock:homebrew-beast/brush-bear');
const THREADLING = statblockId('statblock:homebrew-beast/threadling-weaver');
const RIDGE_RUNNER = statblockId('statblock:homebrew-beast/ridge-runner');
const REEF_PROWLER = statblockId('statblock:homebrew-beast/reef-prowler');

const LEVEL_TWO_FORMS = [WOLF, BOAR, BRUSH_BEAR, THREADLING] as const;
const LEVEL_FOUR_FORMS = [WOLF, BOAR, BLACK_BEAR, CROCODILE, DIRE_WOLF, BRUSH_BEAR] as const;
const LEVEL_EIGHT_FORMS = [
  WOLF, BOAR, BLACK_BEAR, CROCODILE, DIRE_WOLF, BLOOD_HAWK, BRUSH_BEAR, RIDGE_RUNNER,
] as const;

function druidProfile(
  key: string,
  level: 2 | 4 | 7 | 8,
  knownForms: readonly StatblockId[],
  hitPoints = 20,
): Extract<CombatantProfile, { readonly kind: 'player_character' }> {
  const profile = playerProfile(key, { hitPoints, initiativeBonus: 20 });
  if (profile.kind !== 'player_character') throw new Error('Druid fixture is not a player character.');
  return {
    ...profile,
    wildShape: createWildShapeCharacterSheet(level, knownForms),
  };
}

function started(
  level: 2 | 4 | 7 | 8 = 2,
  knownForms: readonly StatblockId[] = LEVEL_TWO_FORMS,
  hitPoints = 20,
) {
  const druid = druidProfile('wild-druid', level, knownForms, hitPoints);
  const enemyBase = monsterProfile('wild-enemy', { hitPoints: 40, initiativeBonus: -20 });
  const enemy = { ...enemyBase, rules: { ...enemyBase.rules, sizeCategory: 'Medium' as const } };
  const state = reduceEncounter(createEncounter({
    bounds: { columns: 8, rows: 2 },
    combatants: [druid, enemy],
    tokens: [placedToken(druid, 0), placedToken(enemy, 1)],
  }), { type: 'roll_initiative' }, () => 0).state;
  return { druid, enemy, state };
}

function subject(state: EncounterState, profile: CombatantProfile) {
  const found = state.combatants.find((candidate) => candidate.profile.id === profile.id);
  if (found === undefined) throw new Error(`Missing combatant ${profile.id}.`);
  return found;
}

function shape(
  state: EncounterState,
  druid: Extract<CombatantProfile, { readonly kind: 'player_character' }>,
  formId: StatblockId,
  equipmentDisposition: 'dropped_at_origin' | 'merged_into_form' | 'worn_if_practical' = 'merged_into_form',
) {
  return reduceEncounter(state, {
    type: 'assume_wild_shape', actor: druid.id, formId, equipmentDisposition,
  }, () => 0);
}

function fixedDamage(
  state: EncounterState,
  source: CombatantProfile,
  target: CombatantProfile,
  amount: number,
) {
  return reduceEncounter(state, {
    type: 'force_save', actor: source.id, target: target.id,
    ability: 'dexterity', dc: 99, rollMode: 'normal',
    damage: {
      terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(4), modifier: amount } }],
      critical: false, responses: [],
    },
    onSuccess: 'none', cost: 'none',
  }, () => 0);
}

function firstAttack(formId: StatblockId) {
  const form = wildShapeForm(formId);
  if (form === null || form.sourceDetails.actions.kind !== 'present') {
    throw new Error(`Wild Shape attack fixture ${formId} is missing.`);
  }
  const attack = form.sourceDetails.actions.value.find((action) => action.kind === 'attack');
  if (attack === undefined || attack.kind !== 'attack') throw new Error(`Wild Shape form ${formId} has no attack.`);
  return attack;
}

describe('2024 Wild Shape overlay', () => {
  it('derives known-form counts, use counts, rest recovery, and rounded duration from the Druid level tables', () => {
    // Uses and known forms: docs/srd/full/srd-5.2.1.txt:2533-2552,2580-2611.
    // Duration and general rounding: docs/srd/full/srd-5.2.1.txt:2571-2579,320-325.
    expect(([2, 4, 8] as const).map((level) => wildShapeKnownFormMaximum(level))).toEqual([4, 6, 8]);
    expect(([2, 6, 17] as const).map((level) => wildShapeUseMaximum(level))).toEqual([2, 3, 4]);
    expect(wildShapeDurationRounds(5)).toBe(1_200);
    expect(recoverWildShapeUses({ kind: 'wild_shape_uses', maximum: 3, remaining: 0 }, 'short_rest'))
      .toEqual({ kind: 'wild_shape_uses', maximum: 3, remaining: 1 });
    expect(recoverWildShapeUses({ kind: 'wild_shape_uses', maximum: 3, remaining: 1 }, 'long_rest'))
      .toEqual({ kind: 'wild_shape_uses', maximum: 3, remaining: 3 });
  });

  it('cr_cap_exact_and_one_step_beyond: accepts CR 1/2 at level 4 and gives the one-step-higher CR 1 refusal a named gate', () => {
    // Beast Shapes thresholds: docs/srd/full/srd-5.2.1.txt:2587-2611.
    const exact = started(4, LEVEL_FOUR_FORMS);
    expect(subject(shape(exact.state, exact.druid, BLACK_BEAR).state, exact.druid).wildShape?.formId)
      .toBe(BLACK_BEAR);

    const beyond = started(4, LEVEL_FOUR_FORMS);
    expect(() => shape(beyond.state, beyond.druid, DIRE_WOLF)).toThrow(WildShapeRuleError);
    try {
      shape(beyond.state, beyond.druid, DIRE_WOLF);
      expect.fail('A CR 1 form unexpectedly crossed the level-4 gate.');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'challenge_rating_gate',
        gate: { kind: 'challenge_rating', maximum: '1/2', actual: 1 },
      });
    }
  });

  it('movement_gates_named: refuses a Fly Speed form one level below the level-8 gate', () => {
    // Fly gate: docs/srd/full/srd-5.2.1.txt:2598-2599,2604-2611.
    const flying = started(7, [WOLF, BOAR, BLACK_BEAR, BLOOD_HAWK, DIRE_WOLF, BRUSH_BEAR]);
    expect(() => shape(flying.state, flying.druid, BLOOD_HAWK)).toThrowError(expect.objectContaining({
      code: 'fly_speed_gate', gate: { kind: 'fly_speed', minimumDruidLevel: 8 },
    }));
  });

  it('allows a CR-eligible Fly Speed form starting at level 8', () => {
    // Fly permission boundary: docs/srd/full/srd-5.2.1.txt:2598-2599,2604-2611.
    const flying = started(8, LEVEL_EIGHT_FORMS);
    const result = shape(flying.state, flying.druid, BLOOD_HAWK);
    expect(subject(result.state, flying.druid).wildShape?.formId).toBe(BLOOD_HAWK);
  });

  it('allows a CR-eligible swim-speed form at level 2', () => {
    // The Beast Shapes table gates only Fly Speed: docs/srd/full/srd-5.2.1.txt:2604-2611.
    const swimming = started(2, [WOLF, BOAR, REEF_PROWLER, THREADLING]);
    const result = shape(swimming.state, swimming.druid, REEF_PROWLER);
    expect(subject(result.state, swimming.druid).wildShape?.formId).toBe(REEF_PROWLER);
  });

  it('unknown_form_allowed: refuses a bundled Beast that is not on the character sheet', () => {
    // The form must be learned: docs/srd/full/srd-5.2.1.txt:2571-2576,2587-2594.
    const fixture = started();
    expect(() => shape(fixture.state, fixture.druid, RIDGE_RUNNER)).toThrowError(expect.objectContaining({
      code: 'form_not_known', gate: null,
    }));
  });

  it('mental_stats_replaced: two physical lenses differ and change attack outcomes while true-form mental scores and spell save DC stay fixed', () => {
    // Retained mental scores and replaced game statistics: docs/srd/full/srd-5.2.1.txt:2619-2634.
    const wolfFixture = started();
    const boarFixture = started();
    const wolfState = shape(wolfFixture.state, wolfFixture.druid, WOLF).state;
    const boarState = shape(boarFixture.state, boarFixture.druid, BOAR).state;
    const trueRules = wolfFixture.druid.rules;
    const wolfRules = effectiveCombatRules(wolfState, wolfFixture.druid.id);
    const boarRules = effectiveCombatRules(boarState, boarFixture.druid.id);
    expect(wolfRules.abilityScores).toMatchObject({ intelligence: 10, wisdom: 18, charisma: 10 });
    expect(boarRules.abilityScores).toMatchObject({ intelligence: 10, wisdom: 18, charisma: 10 });
    expect(wolfRules.abilityScores?.strength).not.toBe(boarRules.abilityScores?.strength);
    const spellSaveDc = (rules: typeof trueRules) => 8 + (rules.proficiencyBonus ?? 0) +
      Math.floor(((rules.abilityScores?.wisdom ?? 10) - 10) / 2);
    expect([spellSaveDc(trueRules), spellSaveDc(wolfRules), spellSaveDc(boarRules)]).toEqual([14, 14, 14]);

    const wolfAttack = reduceEncounter(
      wolfState,
      monsterAttackCommand(firstAttack(WOLF), wolfFixture.druid.id, wolfFixture.enemy.id),
      () => 0.35,
    );
    const boarAttack = reduceEncounter(
      boarState,
      monsterAttackCommand(firstAttack(BOAR), boarFixture.druid.id, boarFixture.enemy.id),
      () => 0.35,
    );
    expect(wolfAttack.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved', attack: expect.objectContaining({ outcome: 'hit' }),
    }));
    expect(boarAttack.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved', attack: expect.objectContaining({ outcome: 'miss' }),
    }));
  });

  it('excess_damage_dropped: exact form-pool depletion reverts with zero excess and one point beyond damages the true form by exactly one', () => {
    const exactFixture = started();
    const exactShaped = shape(exactFixture.state, exactFixture.druid, WOLF).state;
    const exactPool = (subject(exactShaped, exactFixture.druid).wildShape?.physical.hitPoints ?? 0) +
      subject(exactShaped, exactFixture.druid).temporaryHitPoints;
    const exact = fixedDamage(exactShaped, exactFixture.druid, exactFixture.druid, exactPool);
    expect(subject(exact.state, exactFixture.druid).hitPoints).toBe(20);
    expect(subject(exact.state, exactFixture.druid).wildShape).toBeUndefined();
    expect(exact.events).toContainEqual(expect.objectContaining({
      type: 'wild_shape_reverted', reason: 'form_hit_points_depleted', excessDamage: 0,
    }));

    const overFixture = started();
    const overShaped = shape(overFixture.state, overFixture.druid, WOLF).state;
    const overPool = (subject(overShaped, overFixture.druid).wildShape?.physical.hitPoints ?? 0) +
      subject(overShaped, overFixture.druid).temporaryHitPoints;
    const over = fixedDamage(overShaped, overFixture.druid, overFixture.druid, overPool + 1);
    expect(subject(over.state, overFixture.druid).hitPoints).toBe(19);
    expect(subject(over.state, overFixture.druid).wildShape).toBeUndefined();
    expect(over.events).toContainEqual(expect.objectContaining({
      type: 'wild_shape_reverted', reason: 'form_hit_points_depleted', excessDamage: 1,
    }));
  });

  it('duration_exact_expiry: remains shaped immediately before its expiry round and reverts at the exact boundary', () => {
    // Duration and early Bonus Action exit: docs/srd/full/srd-5.2.1.txt:2571-2579.
    const fixture = started();
    const shaped = shape(fixture.state, fixture.druid, WOLF).state;
    const expiry = subject(shaped, fixture.druid).wildShape?.expiresAtRound;
    if (expiry === undefined) throw new Error('Wild Shape expiry was not recorded.');
    expect(expiry).toBe(601);
    const enemyTurn = reduceEncounter(
      { ...shaped, pendingDecisions: [] },
      { type: 'end_turn', actor: fixture.druid.id },
      () => 0,
    ).state;
    const immediatelyBefore = { ...enemyTurn, round: expiry - 1 };
    expect(subject(immediatelyBefore, fixture.druid).wildShape).toBeDefined();
    const expired = reduceEncounter(immediatelyBefore, { type: 'end_turn', actor: fixture.enemy.id }, () => 0);
    expect(subject(expired.state, fixture.druid).wildShape).toBeUndefined();
    expect(expired.events).toContainEqual(expect.objectContaining({
      type: 'wild_shape_reverted', reason: 'duration_expired', excessDamage: 0,
    }));
  });

  it('concentration_dropped_on_shift: concentration, conditions, pending decisions, and policies survive shape and duration reversion', () => {
    // Shape-shifting preserves ongoing conditions/spells: docs/srd/full/srd-5.2.1.txt:12026-12033.
    // Wild Shape does not break concentration: docs/srd/full/srd-5.2.1.txt:2635-2637.
    const fixture = started();
    const concentrated = reduceEncounter(fixture.state, {
      type: 'apply_effect', actor: fixture.druid.id, cost: 'none',
      effect: {
        targets: [fixture.druid.id], duration: { kind: 'permanent' }, concentration: true,
        stackingIdentity: effectStackingIdentity('wild-shape-concentration-control'),
        stacking: 'coexist', repeatedSave: null,
        payload: { kind: 'skill_modifier', skill: 'stealth', amount: 1 },
      },
    }, () => 0).state;
    const conditioned = reduceEncounter(concentrated, {
      type: 'apply_effect', actor: fixture.druid.id, cost: 'none',
      effect: {
        targets: [fixture.druid.id], duration: { kind: 'permanent' }, concentration: false,
        stackingIdentity: effectStackingIdentity('wild-shape-condition-control'),
        stacking: 'coexist', repeatedSave: null,
        payload: { kind: 'condition', condition: 'Poisoned' },
      },
    }, () => 0).state;
    const pending: PendingDecision = {
      id: 'decision:wild-shape-control', kind: 'death_save', combatant: fixture.enemy.id,
      boundary: { activeCombatant: fixture.druid.id, round: conditioned.round },
      options: [{ id: 'roll', label: 'Roll' }],
    };
    const before = { ...conditioned, pendingDecisions: [pending] };
    const shaped = shape(before, fixture.druid, WOLF).state;
    expect(shaped.effects).toEqual(before.effects);
    expect(shaped.pendingDecisions).toEqual([pending]);
    expect(shaped.reactionPolicies).toEqual(before.reactionPolicies);
    expect(combatantConditions(shaped, fixture.druid.id)).toContainEqual({ name: 'Poisoned' });
    expect(shaped.effects.some((effect) => effect.concentrationOwner === fixture.druid.id)).toBe(true);

    const enemyTurn = reduceEncounter(
      { ...shaped, pendingDecisions: [] },
      { type: 'end_turn', actor: fixture.druid.id },
      () => 0,
    ).state;
    const expiry = subject(shaped, fixture.druid).wildShape?.expiresAtRound;
    if (expiry === undefined) throw new Error('Wild Shape expiry was not recorded.');
    const expired = reduceEncounter(
      { ...enemyTurn, round: expiry - 1, pendingDecisions: [] },
      { type: 'end_turn', actor: fixture.enemy.id },
      () => 0,
    ).state;
    expect(subject(expired, fixture.druid).wildShape).toBeUndefined();
    expect(expired.effects.some((effect) => effect.concentrationOwner === fixture.druid.id)).toBe(true);
    expect(combatantConditions(expired, fixture.druid.id)).toContainEqual({ name: 'Poisoned' });
  });

  it('voluntary reversion is a Bonus Action and all three SRD equipment choices remain explicit', () => {
    // Equipment choices: docs/srd/full/srd-5.2.1.txt:2638-2650.
    for (const disposition of ['dropped_at_origin', 'merged_into_form', 'worn_if_practical'] as const) {
      const fixture = started();
      const shaped = shape(fixture.state, fixture.druid, WOLF, disposition).state;
      expect(subject(shaped, fixture.druid).wildShape?.equipmentDisposition).toBe(disposition);
    }
    const fixture = started();
    const shaped = shape(fixture.state, fixture.druid, WOLF).state;
    const enemyTurn = reduceEncounter(shaped, { type: 'end_turn', actor: fixture.druid.id }, () => 0).state;
    const nextDruidTurn = reduceEncounter(enemyTurn, { type: 'end_turn', actor: fixture.enemy.id }, () => 0).state;
    const reverted = reduceEncounter(nextDruidTurn, { type: 'revert_wild_shape', actor: fixture.druid.id }, () => 0);
    expect(subject(reverted.state, fixture.druid).wildShape).toBeUndefined();
    expect(reverted.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'resource_spent', resource: 'bonus_action' }),
      expect.objectContaining({ type: 'wild_shape_reverted', reason: 'voluntary_bonus_action' }),
    ]));
  });

  it('death_saves_use_true_form: lethal excess reverts first, then starts the PC true form dying', () => {
    const fixture = started(2, LEVEL_TWO_FORMS, 1);
    const shaped = shape(fixture.state, fixture.druid, WOLF).state;
    const pool = (subject(shaped, fixture.druid).wildShape?.physical.hitPoints ?? 0) +
      subject(shaped, fixture.druid).temporaryHitPoints;
    const dropped = fixedDamage(shaped, fixture.druid, fixture.druid, pool + 1).state;
    expect(subject(dropped, fixture.druid)).toMatchObject({
      hitPoints: 0,
      life: 'dying',
      deathSaves: { successes: 0, failures: 0 },
      profile: { rules: { usesDeathSaves: true, hitPointMaximum: 1 } },
    });
    expect(subject(dropped, fixture.druid).wildShape).toBeUndefined();
  });

  it('known-form construction includes homebrew families but requires the exact sheet count and unique bundled Beasts', () => {
    expect(createWildShapeCharacterSheet(2, [WOLF, BOAR, BRUSH_BEAR, RIDGE_RUNNER]).knownForms)
      .toContain(RIDGE_RUNNER);
    expect(() => createWildShapeCharacterSheet(2, [WOLF, BOAR, BRUSH_BEAR]))
      .toThrow('exactly 4');
    expect(() => createWildShapeCharacterSheet(2, [WOLF, BOAR, BRUSH_BEAR, WOLF]))
      .toThrow('must be unique');
  });
});
