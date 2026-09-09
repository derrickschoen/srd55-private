import { describe, expect, it } from 'vitest';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import {
  assertRoomDBoundedTerminalState,
  challengeProvenanceMigrationEvidenceV1,
  classifyDerivedCaps,
  D583_BCA_DERIVED_CAP_MAXIMA_V1,
  D583_BCA_FEASIBILITY_LIMITS_V1,
  D583_D_ONE_POLICY_EVIDENCE,
  D587_ROOM_D_ATTACK_MASS_TABLES_V1,
  D587_ROOM_D_BOUNDED_POLICIES_V1,
  D587_ROOM_D_HAND_CONSTANTS_V1,
  deriveVariantHorizon,
  futureStateKeyV1,
  mergeContinuationEquivalentStates,
  probeReducerApplicationLimitSampling,
  probeReducerContinuationV1,
  probeRetainedSiblingLimitSampling,
  probeScenarioAccountingV1,
  roomDBoundedFighterMenu,
  roomDBoundedGuardPolicyCommand,
  validateRoomDBoundedFighterMenu,
  type RoomDBoundedFractionV1,
} from '../../../src/vtt/challenge-feasibility';
import { runCommandBoundaryTransaction } from '../../../src/vtt/engine-round-application';
import { ARENA_REACTION_OFFER_POLICY } from '../../../src/vtt/reaction-offer-host-policy';
import { regretTurnLegalActions } from '../../../src/vtt/regret/legal-actions';
import {
  componentTotals,
  exactFraction,
  rollComponentId,
  type ExactTotalDistribution,
  type RollComponentSpec,
} from '../../../src/combat/roll-provenance';
import { combatantId, dieSides } from '../../../src/combat/values';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis-challenge/seed-5831001.json',
    'tests/fixtures/arena-basis-challenge/seed-5831002.json',
    'tests/fixtures/arena-basis-challenge/seed-5831003.json',
    'tests/fixtures/arena-basis-challenge/seed-5831004.json',
  ],
});

function distributionMass(distribution: ExactTotalDistribution) {
  return distribution.outcomes.reduce(
    (sum, outcome) => exactFraction(
      sum.numerator * outcome.weight.denominator + outcome.weight.numerator * sum.denominator,
      sum.denominator * outcome.weight.denominator,
    ),
    exactFraction(0n, 1n),
  );
}

function expression(count: number, sides: number): RollComponentSpec {
  return { kind: 'dice_expression', expression: { count, sides: dieSides(sides), modifier: 0 } };
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function testFraction(numerator: bigint, denominator: bigint): RoomDBoundedFractionV1 {
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { numerator: String(numerator / divisor), denominator: String(denominator / divisor) };
}

function fractionDifference(
  left: RoomDBoundedFractionV1,
  right: RoomDBoundedFractionV1,
): RoomDBoundedFractionV1 {
  return testFraction(
    BigInt(left.numerator) * BigInt(right.denominator) - BigInt(right.numerator) * BigInt(left.denominator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function fractionProduct(
  left: RoomDBoundedFractionV1,
  right: RoomDBoundedFractionV1,
): RoomDBoundedFractionV1 {
  return testFraction(
    BigInt(left.numerator) * BigInt(right.numerator),
    BigInt(left.denominator) * BigInt(right.denominator),
  );
}

function fractionSum(...values: readonly RoomDBoundedFractionV1[]): RoomDBoundedFractionV1 {
  return values.reduce<RoomDBoundedFractionV1>((sum, value) => testFraction(
    BigInt(sum.numerator) * BigInt(value.denominator) + BigInt(value.numerator) * BigInt(sum.denominator),
    BigInt(sum.denominator) * BigInt(value.denominator),
  ), { numerator: '0', denominator: '1' });
}

function expectSameFraction(actual: RoomDBoundedFractionV1, expected: RoomDBoundedFractionV1): void {
  expect(BigInt(actual.numerator) * BigInt(expected.denominator))
    .toBe(BigInt(expected.numerator) * BigInt(actual.denominator));
}

function rawAttackOutcome(
  faces: readonly number[],
  armorClass: number,
  attackBonus: number,
): 'miss' | 'normal_damage' | 'critical_damage' {
  const chosen = Math.min(...faces);
  if (chosen === 1) return 'miss';
  if (chosen === 20) return 'critical_damage';
  return chosen + attackBonus >= armorClass ? 'normal_damage' : 'miss';
}

function rawAttackMasses(
  mode: 'normal' | 'disadvantage',
  armorClass: number,
  attackBonus: number,
): Readonly<Record<'miss' | 'normal_damage' | 'critical_damage', RoomDBoundedFractionV1>> {
  const counts = { miss: 0n, normal_damage: 0n, critical_damage: 0n };
  let total = 0n;
  for (let first = 1; first <= 20; first += 1) {
    const seconds = mode === 'normal' ? [first] : Array.from({ length: 20 }, (_unused, index) => index + 1);
    for (const second of seconds) {
      counts[rawAttackOutcome(mode === 'normal' ? [first] : [first, second], armorClass, attackBonus)] += 1n;
      total += 1n;
    }
  }
  return {
    miss: testFraction(counts.miss, total),
    normal_damage: testFraction(counts.normal_damage, total),
    critical_damage: testFraction(counts.critical_damage, total),
  };
}

function rawDamageTotals(
  count: 1 | 2,
  sides: 6 | 8,
  modifier: number,
): readonly { readonly total: number; readonly numerator: number; readonly denominator: number }[] {
  const totals = new Map<number, number>();
  if (count === 1) {
    for (let first = 1; first <= sides; first += 1) totals.set(first + modifier, 1);
  } else {
    for (let first = 1; first <= sides; first += 1) {
      for (let second = 1; second <= sides; second += 1) {
        const total = first + second + modifier;
        totals.set(total, (totals.get(total) ?? 0) + 1);
      }
    }
  }
  const denominator = sides ** count;
  return [...totals].map(([total, numerator]) => ({ total, numerator, denominator }));
}

function rawTwoAttackRetention(mode: 'normal' | 'disadvantage'): RoomDBoundedFractionV1 {
  const attacks = mode === 'normal'
    ? Array.from({ length: 20 }, (_unused, index) => [index + 1] as const)
    : Array.from({ length: 20 }, (_unused, first) => Array.from(
      { length: 20 }, (_other, second) => [first + 1, second + 1] as const,
    )).flat();
  let survivors = 0n;
  for (const first of attacks) {
    if (rawAttackOutcome(first, 16, 7) !== 'miss') continue;
    for (const second of attacks) {
      if (rawAttackOutcome(second, 16, 7) === 'miss') survivors += 1n;
    }
  }
  const totalLineMass = BigInt(attacks.length) * BigInt(attacks.length);
  return testFraction(survivors, totalLineMass);
}

function eventAttack(events: readonly EncounterEvent[]) {
  const event = events.find((candidate) => candidate.type === 'attack_resolved');
  if (event?.type !== 'attack_resolved') throw new Error('Expected one resolved attack event.');
  return event;
}

const roomA = decodeArenaBasisEnvelopeV1(
  JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831003.json')) as unknown,
  { mode: 'challenge' },
).encounter.state;
const roomD = decodeArenaBasisEnvelopeV1(
  JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831004.json')) as unknown,
  { mode: 'challenge' },
).encounter.state;
const migrationEvidence = challengeProvenanceMigrationEvidenceV1(roomA, roomD);

describe('D583 reducer-backed challenge feasibility', () => {
  it('transactional adapter preserves die provenance across checkpoint replay and rollback', () => {
    expect(migrationEvidence.provenanceManifest).toHaveLength(33);
    expect(migrationEvidence.provenanceManifest.every((record) =>
      record.face >= 1 && record.face <= record.sides &&
      String(record.provenance.occurrenceId).length > 0 &&
      String(record.provenance.operationPath).length > 0)).toBe(true);
  });

  it('successful save damage and capped healing expose explicit draw provenance', () => {
    expect(migrationEvidence.semanticDrawCounts).toEqual({
      total: 33, healing: 4, savingThrow: 1, attackDamage: 22, reaction: 0,
    });
    const healing = migrationEvidence.provenanceManifest.filter((record) =>
      String(record.provenance.operationPath).split('/').includes('healing'));
    const saves = migrationEvidence.provenanceManifest.filter((record) =>
      String(record.provenance.operationPath).split('/').includes('saving_throw'));
    const damage = migrationEvidence.provenanceManifest.filter((record) =>
      String(record.provenance.operationPath).split('/').includes('attack_damage'));
    expect(healing).toHaveLength(4);
    expect(saves).toHaveLength(1);
    expect(damage).toHaveLength(22);
    expect(migrationEvidence.healing).toMatchObject({
      uncappedDraws: 2, uncappedBefore: 6, uncappedAfter: 17,
      cappedDraws: 2, cappedBefore: 51, cappedAfter: 52, hitPointMaximum: 52,
    });
    expect(migrationEvidence.healing.cappedAfter).toBe(migrationEvidence.healing.hitPointMaximum);
    expect(migrationEvidence.healing.cappedBefore).toBe(migrationEvidence.healing.hitPointMaximum - 1);
    expect(migrationEvidence.potion).toEqual({ draws: 2, before: 6, after: 16 });
  });

  it('preserves the arena always never and ask reaction-policy draw behavior', () => {
    expect(migrationEvidence.reactionPolicies).toEqual([
      { configured: 'always', resolution: 'accept', reactionDraws: 1 },
      { configured: 'never', resolution: 'decline', reactionDraws: 0 },
      { configured: 'ask', resolution: 'decline', reactionDraws: 0 },
    ]);
  });

  it('total-only grouping rejects the 59 2 versus 31 30 Longbow counterexample', () => {
    expect(() => mergeContinuationEquivalentStates([
      { total: 61, hp: [59, 2] as const },
      { total: 61, hp: [31, 30] as const },
    ], (node) => `total:${String(node.total)}`, (node) => JSON.stringify(node.hp))).toThrow(
      'invariant_failure:continuation_collision',
    );
  });

  it('state keys and post-command continuations retain every combatant resource field', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831003.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const priestId = combatantId('combatant:generated-challenge-a-02-priest');
    const priest = state.combatants.find((entry) => entry.profile.id === priestId);
    const pool = priest?.limitedResources?.[0];
    if (priest === undefined || pool === undefined || pool.remaining < 1) {
      throw new Error('Room A Priest requires a nonempty limited-resource pool.');
    }
    const depleted = {
      ...state,
      combatants: state.combatants.map((entry) => entry.profile.id === priestId ? {
        ...entry,
        limitedResources: (entry.limitedResources ?? []).map((resource) =>
          resource.id === pool.id ? { ...resource, remaining: resource.remaining - 1 } : resource),
      } : entry),
    };
    expect(futureStateKeyV1(state, [])).not.toEqual(futureStateKeyV1(depleted, []));
    const active = state.activeCombatant;
    if (active === null) throw new Error('Room A requires an active combatant.');
    const command = { type: 'end_turn' as const, actor: active };
    const originalNext = runCommandBoundaryTransaction(
      state, command, () => 0.5, ARENA_REACTION_OFFER_POLICY, null,
    ).state;
    const depletedNext = runCommandBoundaryTransaction(
      depleted, command, () => 0.5, ARENA_REACTION_OFFER_POLICY, null,
    ).state;
    expect(futureStateKeyV1(originalNext, [])).not.toEqual(futureStateKeyV1(depletedNext, []));
  });

  it('continuation replay completes every d20 child instead of stopping at the first unresolved draw', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const actor = state.activeCombatant;
    if (actor === null) throw new Error('Room B requires an active combatant.');
    const continuation = probeReducerContinuationV1(state, {
      type: 'roll_ability_check', actor, ability: 'strength', skill: null,
      bonus: 0, dc: 10, rollMode: 'normal', cost: 'action',
    }, {
      now: (): number => 0,
      heapUsed: (): number => 10,
    });
    expect(continuation.completedOutcomes).toBe(20);
    expect(continuation.reducerApplications).toBe(21);
    expect(continuation.provenanceRequests).toHaveLength(20);
    expect(continuation.resultingKeys).toHaveLength(20);
  });

  it('scenario branches accumulate draws checkpoints and every merged provenance member', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const actor = state.activeCombatant;
    if (actor === null) throw new Error('Room B requires an active combatant.');
    const check = {
      type: 'roll_ability_check' as const, actor, ability: 'strength' as const, skill: null,
      bonus: 0, dc: 10, rollMode: 'normal' as const, cost: 'none' as const,
    };
    expect(probeScenarioAccountingV1(state, [check, check], {
      now: (): number => 0,
      heapUsed: (): number => 10,
    })).toMatchObject({
      finalStates: 1,
      retainedBranchProvenance: 400,
      maximumCommandCheckpoints: 2,
      maximumDraws: 2,
    });
  });

  it('independent raw loops derive the bounded Room D answer and threshold margin', () => {
    const spear = rawTwoAttackRetention('normal');
    const dodge = rawTwoAttackRetention('disadvantage');
    const delta = fractionDifference(dodge, spear);
    const margin = fractionDifference(delta, { numerator: '3', denominator: '20' });
    expect(spear).toEqual({ numerator: '4', denominator: '25' });
    expect(dodge).toEqual({ numerator: '256', denominator: '625' });
    expect(delta).toEqual({ numerator: '156', denominator: '625' });
    expect(margin).toEqual({ numerator: '249', denominator: '2500' });
    expect(D587_ROOM_D_HAND_CONSTANTS_V1).toMatchObject({
      guard: { armorClass: 16, hitPoints: 5 },
      fighterAttack: {
        attackBonus: 7, dodgeRollMode: 'disadvantage', normalDamage: '1d8+4', criticalDamage: '2d8+4',
      },
      spearRetention: spear,
      dodgeRetention: dodge,
      delta,
      materialityThreshold: { numerator: '3', denominator: '20' },
      thresholdMargin: margin,
      terminalHistories: { spear: 136_040, dodge: 375_992, total: 512_032 },
      work: {
        faceExpansions: 574_462,
        reducerApplications: 1_087_704,
        completedOutcomesAndEndTurns: 1_025_272,
        incompleteReplayAttempts: 62_432,
      },
      coverProbeCosts: { livingGuard: 124, deadGuard: 140, scout2EitherState: 124 },
      storage: { nodeEquivalents: 3_348, withHeadroom: 4_185 },
    });
  });

  it('preregistered request masses and complete damage specifications match raw face loops', () => {
    const spearMasses = rawAttackMasses('normal', 15, 3);
    const fighterMasses = rawAttackMasses('normal', 16, 7);
    const dodgeMasses = rawAttackMasses('disadvantage', 16, 7);
    for (const [table, masses] of [
      [D587_ROOM_D_ATTACK_MASS_TABLES_V1.guardSpear, spearMasses],
      [D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal, fighterMasses],
      [D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterDodge, dodgeMasses],
    ] as const) {
      expectSameFraction(table.noDamageMass, masses.miss);
      expectSameFraction(table.normalDamage.firstInvocationRequestMass, masses.normal_damage);
      expectSameFraction(table.criticalDamage.firstInvocationRequestMass, masses.critical_damage);
      expect(table.uniquenessScope).toBe('concrete_replay_execution');
      for (const component of [table.normalDamage, table.criticalDamage]) {
        const conditional = component.conditionalTotals.reduce(
          (sum, outcome) => ({
            numerator: String(
              BigInt(sum.numerator) * BigInt(outcome.weight.denominator) +
              BigInt(outcome.weight.numerator) * BigInt(sum.denominator),
            ),
            denominator: String(BigInt(sum.denominator) * BigInt(outcome.weight.denominator)),
          }),
          { numerator: '0', denominator: '1' },
        );
        expectSameFraction(conditional, { numerator: '1', denominator: '1' });
        expect(component.conditionalComponentMass).toEqual({ numerator: '1', denominator: '1' });
      }
    }
    expect(D587_ROOM_D_ATTACK_MASS_TABLES_V1.guardSpear.normalDamage.conditionalTotals.map((entry) => ({
      total: entry.total, numerator: Number(entry.weight.numerator), denominator: Number(entry.weight.denominator),
    }))).toEqual(rawDamageTotals(1, 6, 1));
    expect(D587_ROOM_D_ATTACK_MASS_TABLES_V1.guardSpear.criticalDamage.conditionalTotals.map((entry) => ({
      total: entry.total, numerator: Number(entry.weight.numerator), denominator: Number(entry.weight.denominator),
    }))).toEqual(rawDamageTotals(2, 6, 1));
    for (const table of [
      D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal,
      D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterDodge,
    ]) {
      expect(table.normalDamage.conditionalTotals.map((entry) => ({
        total: entry.total, numerator: Number(entry.weight.numerator), denominator: Number(entry.weight.denominator),
      }))).toEqual(rawDamageTotals(1, 8, 4));
      expect(table.criticalDamage.conditionalTotals.map((entry) => ({
        total: entry.total, numerator: Number(entry.weight.numerator), denominator: Number(entry.weight.denominator),
      }))).toEqual(rawDamageTotals(2, 8, 4));
    }
    expect(D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal.normalDamage.secondInvocationLineMass)
      .toEqual({ numerator: '11', denominator: '50' });
    expect(D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal.criticalDamage.secondInvocationLineMass)
      .toEqual({ numerator: '1', denominator: '50' });
    expect(D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterDodge.normalDamage.secondInvocationLineMass)
      .toEqual({ numerator: '143', denominator: '625' });
    expect(D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterDodge.criticalDamage.secondInvocationLineMass)
      .toEqual({ numerator: '1', denominator: '625' });
    for (const [table, masses] of [
      [D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal, fighterMasses],
      [D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterDodge, dodgeMasses],
    ] as const) {
      const secondIncoming = table.secondInvocationIncomingMass;
      const secondNoDamage = table.secondInvocationNoDamageLineMass;
      const secondNormal = table.normalDamage.secondInvocationLineMass;
      const secondCritical = table.criticalDamage.secondInvocationLineMass;
      if (secondIncoming === null || secondNoDamage === null || secondNormal === null || secondCritical === null) {
        throw new Error('Fighter second-invocation mass table is incomplete.');
      }
      expectSameFraction(secondIncoming, masses.miss);
      expectSameFraction(secondNoDamage, fractionProduct(masses.miss, masses.miss));
      expectSameFraction(secondNormal, fractionProduct(masses.miss, masses.normal_damage));
      expectSameFraction(secondCritical, fractionProduct(masses.miss, masses.critical_damage));
      expectSameFraction(
        fractionSum(secondNoDamage, secondNormal, secondCritical),
        secondIncoming,
      );
      expect(secondIncoming).not.toEqual({ numerator: '1', denominator: '1' });
    }
    const normalKey = D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal.normalDamage.specificationKey;
    const criticalKey = D587_ROOM_D_ATTACK_MASS_TABLES_V1.fighterNormal.criticalDamage.specificationKey;
    expect(normalKey).toEqual([
      'dice_expression', ['count', 1], ['sides', 8], ['modifier', 4],
      ['minimumTotal', 'absent'], ['maximumTotal', 'absent'], ['rerollBelow', 'absent'], ['explosion', 'absent'],
    ]);
    expect(criticalKey).toEqual([
      'dice_expression', ['count', 2], ['sides', 8], ['modifier', 4],
      ['minimumTotal', 'absent'], ['maximumTotal', 'absent'], ['rerollBelow', 'absent'], ['explosion', 'absent'],
    ]);
    expect(criticalKey).not.toEqual(normalKey);
  });

  it('uses unique revision-bound Guard offers and the exact Fighter legal-menu sequence', () => {
    expect(D587_ROOM_D_BOUNDED_POLICIES_V1).toEqual(['guard_spear_hold', 'guard_dodge_hold']);
    const spear = roomDBoundedGuardPolicyCommand(roomD, 'guard_spear_hold');
    const dodge = roomDBoundedGuardPolicyCommand(roomD, 'guard_dodge_hold');
    expect(spear).toMatchObject({ policy: 'guard_spear_hold', offeredRevision: 0 });
    expect(dodge).toMatchObject({ policy: 'guard_dodge_hold', offeredRevision: 0 });
    expect(spear.offeredOptionId).not.toBe(dodge.offeredOptionId);
    expect(spear.command).toMatchObject({
      type: 'attack', actor: 'combatant:generated-challenge-d-01-guard', target: 'combatant:wizard',
      attackBonus: 3, criticalFloor: 20, rollMode: 'normal',
      damage: { terms: [{ dice: { count: 1, sides: 6, modifier: 1 } }] },
    });
    expect(dodge.command).toEqual({
      type: 'dodge', actor: combatantId('combatant:generated-challenge-d-01-guard'), cost: 'action',
    });

    const dodged = runCommandBoundaryTransaction(
      roomD, dodge.command, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    const guardEnd = regretTurnLegalActions(
      dodged.state, combatantId('combatant:generated-challenge-d-01-guard'),
    ).actions.filter((command): command is Extract<EncounterCommand, { readonly type: 'end_turn' }> =>
      command.type === 'end_turn');
    expect(guardEnd).toEqual([{
      type: 'end_turn', actor: combatantId('combatant:generated-challenge-d-01-guard'),
    }]);
    const fighterTurn = runCommandBoundaryTransaction(
      dodged.state, guardEnd[0]!, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    const firstMenu = roomDBoundedFighterMenu(fighterTurn.state, 'guard_attack_required');
    expect(firstMenu.attack).toMatchObject({
      actor: 'combatant:fighter', target: 'combatant:generated-challenge-d-01-guard',
      attackBonus: 7, criticalFloor: 20, rollMode: 'normal',
      damage: { terms: [{ dice: { count: 1, sides: 8, modifier: 4 } }] },
    });
    const firstMiss = runCommandBoundaryTransaction(
      fighterTurn.state, firstMenu.attack!, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    expect(eventAttack(firstMiss.events).attack.roll).toEqual({
      mode: 'disadvantage', faces: [1, 1], chosen: 1,
    });
    expect(eventAttack(firstMiss.events).attack.roll.mode)
      .toBe(D587_ROOM_D_HAND_CONSTANTS_V1.fighterAttack.dodgeRollMode);
    const secondMenu = roomDBoundedFighterMenu(firstMiss.state, 'guard_attack_required');
    const secondMiss = runCommandBoundaryTransaction(
      firstMiss.state, secondMenu.attack!, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    const terminalMenu = roomDBoundedFighterMenu(secondMiss.state, 'terminal_end_turn');
    const terminal = runCommandBoundaryTransaction(
      secondMiss.state, terminalMenu.endTurn, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    expect(terminal).toMatchObject({ revisionDelta: 1, fallbackResolutions: [], guidedResolutions: [] });
    expect(terminal.state.revision - roomD.revision).toBe(5);
    expect(assertRoomDBoundedTerminalState(terminal.state)).toEqual({
      guardLiving: true,
      activeCombatant: combatantId('combatant:generated-challenge-d-02-scout-1'),
    });

    const killScalars = [0.6, 0.5, 0];
    const killed = runCommandBoundaryTransaction(
      fighterTurn.state, firstMenu.attack!, () => killScalars.shift() ?? 0,
      ARENA_REACTION_OFFER_POLICY, null,
    );
    expect(eventAttack(killed.events).attack.outcome).toBe('hit');
    const afterKill = roomDBoundedFighterMenu(killed.state, 'terminal_end_turn');
    const deadTerminal = runCommandBoundaryTransaction(
      killed.state, afterKill.endTurn, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    expect(deadTerminal.state.revision - roomD.revision).toBe(4);
    expect(assertRoomDBoundedTerminalState(deadTerminal.state)).toEqual({
      guardLiving: false,
      activeCombatant: combatantId('combatant:generated-challenge-d-02-scout-1'),
    });
  });

  it('separates mutually exclusive normal and critical Fighter damage specifications', () => {
    const dodge = roomDBoundedGuardPolicyCommand(roomD, 'guard_dodge_hold');
    const dodged = runCommandBoundaryTransaction(roomD, dodge.command, () => 0, ARENA_REACTION_OFFER_POLICY, null);
    const guardEnd = regretTurnLegalActions(
      dodged.state, combatantId('combatant:generated-challenge-d-01-guard'),
    ).actions.find((command) => command.type === 'end_turn');
    if (guardEnd?.type !== 'end_turn') throw new Error('Room D Guard end-turn was not offered.');
    const fighterTurn = runCommandBoundaryTransaction(
      dodged.state, guardEnd, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    ).state;
    const command = roomDBoundedFighterMenu(fighterTurn, 'guard_attack_required').attack;
    if (command === null) throw new Error('Room D Fighter attack was not offered.');
    const normalScalars = [0.6, 0.5, 0];
    const criticalScalars = [0.999, 0.999, 0, 0];
    const normal = runCommandBoundaryTransaction(
      fighterTurn, command, () => normalScalars.shift() ?? 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    const critical = runCommandBoundaryTransaction(
      fighterTurn, command, () => criticalScalars.shift() ?? 0, ARENA_REACTION_OFFER_POLICY, null,
    );
    expect(eventAttack(normal.events).attack.outcome).toBe('hit');
    expect(eventAttack(critical.events).attack.outcome).toBe('critical');
    expect(eventAttack(normal.events).damage?.terms[0]?.roll.expression).toMatchObject({ count: 1, sides: 8, modifier: 4 });
    expect(eventAttack(critical.events).damage?.terms[0]?.roll.expression).toMatchObject({ count: 2, sides: 8, modifier: 4 });
    const normalDamage = normal.dieRolls.find((draw) => draw.provenance.spec.kind === 'dice_expression');
    const criticalDamage = critical.dieRolls.find((draw) => draw.provenance.spec.kind === 'dice_expression');
    if (normalDamage === undefined || criticalDamage === undefined) throw new Error('Fighter damage provenance was absent.');
    for (const replay of [normal, critical]) {
      const specificationsByHandle = new Map<string, RollComponentSpec>();
      for (const draw of replay.dieRolls) {
        const handle = `${String(draw.provenance.componentId)}/${String(draw.provenance.execution)}`;
        const existing = specificationsByHandle.get(handle);
        if (existing === undefined) specificationsByHandle.set(handle, draw.provenance.spec);
        else expect(draw.provenance.spec).toEqual(existing);
      }
      expect(specificationsByHandle).toHaveLength(2);
    }
    expect({
      occurrenceId: normalDamage.provenance.occurrenceId,
      componentId: normalDamage.provenance.componentId,
      execution: normalDamage.provenance.execution,
      kind: normalDamage.provenance.spec.kind,
    }).toEqual({
      occurrenceId: criticalDamage.provenance.occurrenceId,
      componentId: criticalDamage.provenance.componentId,
      execution: criticalDamage.provenance.execution,
      kind: criticalDamage.provenance.spec.kind,
    });
    expect(normalDamage.provenance.spec).not.toEqual(criticalDamage.provenance.spec);
  });

  it('fails closed on illegal Room D reply commands and a missing terminal end-turn', () => {
    const dodge = roomDBoundedGuardPolicyCommand(roomD, 'guard_dodge_hold');
    const dodged = runCommandBoundaryTransaction(roomD, dodge.command, () => 0, ARENA_REACTION_OFFER_POLICY, null);
    const guardEnd = regretTurnLegalActions(
      dodged.state, combatantId('combatant:generated-challenge-d-01-guard'),
    ).actions.find((command) => command.type === 'end_turn');
    if (guardEnd?.type !== 'end_turn') throw new Error('Room D Guard end-turn was not offered.');
    const fighterTurn = runCommandBoundaryTransaction(
      dodged.state, guardEnd, () => 0, ARENA_REACTION_OFFER_POLICY, null,
    ).state;
    const offered = regretTurnLegalActions(fighterTurn, combatantId('combatant:fighter')).actions;
    const realAttack = offered.find((command) => command.type === 'attack');
    if (realAttack?.type !== 'attack') throw new Error('Room D Fighter attack was not offered.');
    const illegalScoutAttack: EncounterCommand = {
      ...realAttack,
      target: combatantId('combatant:generated-challenge-d-02-scout-1'),
    };
    const illegalGateMove: EncounterCommand = {
      type: 'move', actor: combatantId('combatant:fighter'), path: [{ column: 7, row: 5 }], cause: 'voluntary',
    };
    expect(() => validateRoomDBoundedFighterMenu(
      [...offered, illegalScoutAttack], 'guard_attack_required',
    )).toThrow('rejects attacks against any target other than the living Guard');
    expect(() => validateRoomDBoundedFighterMenu(
      [...offered, illegalGateMove], 'guard_attack_required',
    )).toThrow('rejects an invented move into the gate');
    expect(() => validateRoomDBoundedFighterMenu(
      offered.filter((command) => command.type !== 'attack'), 'guard_attack_required',
    )).toThrow('requires exactly one offered Fighter attack');
    expect(() => validateRoomDBoundedFighterMenu(offered, 'terminal_end_turn'))
      .toThrow('forbids another Fighter attack');
    expect(() => validateRoomDBoundedFighterMenu(
      offered.filter((command) => command.type !== 'end_turn'), 'guard_attack_required',
    )).toThrow('requires one offered Fighter end-turn');
  });

  it('D report labels 540 of 1280 as one policy and makes no optimized-surface claim', () => {
    expect(D583_D_ONE_POLICY_EVIDENCE).toEqual({
      classification: 'single_policy_counterexample_not_optimized_search',
      genericSaveKills: '540/1280',
      expectedScoutPrimaryTurns: '101/64',
      optimizedSurfaceClaim: false,
    });
  });

  it('variant horizons derive endpoints from and complete required actor sets', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831003.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const required = [combatantId('combatant:fighter'), combatantId('combatant:generated-challenge-a-01-knight')];
    const horizon = deriveVariantHorizon(state, required);
    expect(horizon.scheduledOrder).toEqual(required);
    expect(horizon.endpointActorId).toBe(combatantId('combatant:generated-challenge-a-01-knight'));
  });

  it('publishes the immutable cumulative d583 bca limit profile', () => {
    expect(Object.isFrozen(D583_BCA_FEASIBILITY_LIMITS_V1)).toBe(true);
    expect(D583_BCA_FEASIBILITY_LIMITS_V1).toEqual({
      profile: 'd583_bca_v1', maxFaceExpansions: 10_000_000, maxReducerApplications: 5_000_000,
      maxLiveNodes: 250_000, maxHeapUsedBytes: 1_073_741_824, maxWallMilliseconds: 180_000,
      maxCommandCheckpointsPerBranch: 64, maxDrawsPerBranch: 128,
    });
  });

  it('counts retained sibling nodes in the checked exploration peak', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const active = state.activeCombatant;
    if (active === null) throw new Error('Room B requires an active combatant.');
    expect(probeRetainedSiblingLimitSampling(state, {
      type: 'dodge', actor: active, cost: 'action',
    }, {
      now: (): number => 0,
      heapUsed: (): number => 10,
    })).toEqual({
      kind: 'limit_exhausted', counter: 'live_nodes',
      observed: D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes + 1,
      limit: D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes,
    });
  });

  it('samples fixed heap limits after a real reducer application', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const active = state.activeCombatant;
    if (active === null) throw new Error('Room B requires an active combatant.');
    let heapSample = 0;
    expect(probeReducerApplicationLimitSampling(state, {
      type: 'dodge', actor: active, cost: 'action',
    }, {
      now: (): number => 0,
      heapUsed: (): number => {
        heapSample += 1;
        return heapSample === 1 ? 10 : D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1;
      },
    })).toEqual({
      kind: 'limit_exhausted', counter: 'heap_used_bytes',
      observed: D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1,
      limit: D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes,
    });
    expect(heapSample).toBe(2);
  });

  it('feasibility fails closed on mass provenance continuation collision or unmeasured variant', () => {
    const state = decodeArenaBasisEnvelopeV1(
      JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json')) as unknown,
      { mode: 'challenge' },
    ).encounter.state;
    const first = { ...state, combatants: state.combatants.map((entry, index) => index === 0 ? { ...entry, hitPoints: 59 } : entry) };
    const second = { ...state, combatants: state.combatants.map((entry, index) => index === 0 ? { ...entry, hitPoints: 31 } : entry) };
    expect(futureStateKeyV1(first, [])).not.toEqual(futureStateKeyV1(second, []));
  });

  it('names derived-cap overflow and never clamps a completed exploration into GO', () => {
    expect(D583_BCA_DERIVED_CAP_MAXIMA_V1).toEqual({
      maxNodes: 200_000, maxHeapUsedBytes: 858_993_459, maxWallMilliseconds: 90_000,
    });
    expect(classifyDerivedCaps({
      peakLiveNodes: 200_000, peakHeapUsedBytes: 858_993_459, wallMilliseconds: 90_000,
    }).failure).toBeNull();
    for (const measured of [
      { peakLiveNodes: 200_001, peakHeapUsedBytes: 1, wallMilliseconds: 1 },
      { peakLiveNodes: 1, peakHeapUsedBytes: 858_993_460, wallMilliseconds: 1 },
      { peakLiveNodes: 1, peakHeapUsedBytes: 1, wallMilliseconds: 90_001 },
    ]) {
      const derived = classifyDerivedCaps(measured);
      expect(derived.caps).toBeNull();
      expect(derived.failure?.kind).toBe('derived_cap_overflow');
    }
  });

  it('retains the spike arithmetic only as nine exact mass checks', () => {
    const specs = [
      expression(2, 4), expression(2, 4), expression(6, 6), expression(12, 6),
      expression(2, 8), expression(4, 8), expression(6, 8), expression(8, 8), expression(2, 8),
    ];
    expect(specs.map((spec, index) => distributionMass(
      componentTotals(rollComponentId(`arithmetic-${String(index)}`), spec),
    ))).toEqual(specs.map(() => exactFraction(1n, 1n)));
  });
});
