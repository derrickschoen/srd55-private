import { beforeAll, describe, expect, it } from 'vitest';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import {
  challengeProvenanceMigrationEvidenceV1,
  classifyDerivedCaps,
  D583_BCA_DERIVED_CAP_MAXIMA_V1,
  D583_BCA_FEASIBILITY_LIMITS_V1,
  D583_D_ONE_POLICY_EVIDENCE,
  deriveVariantHorizon,
  futureStateKeyV1,
  mergeContinuationEquivalentStates,
  probeReducerApplicationLimitSampling,
  probeReducerContinuationV1,
  probeScenarioAccountingV1,
  runChallengeReducerFeasibility,
  type ChallengeProvenanceMigrationEvidenceV1,
  type ChallengeReducerFeasibilityReportV1,
} from '../../../src/vtt/challenge-feasibility';
import { runChallengeFeasibilityCli } from '../../../tools/challenge-feasibility';
import { runCommandBoundaryTransaction } from '../../../src/vtt/engine-round-application';
import { ARENA_REACTION_OFFER_POLICY } from '../../../src/vtt/reaction-offer-host-policy';
import {
  componentTotals,
  exactFraction,
  rollComponentId,
  type ExactTotalDistribution,
  type RollComponentSpec,
} from '../../../src/combat/roll-provenance';
import { combatantId, dieSides } from '../../../src/combat/values';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis-challenge/seed-5831001.json',
    'tests/fixtures/arena-basis-challenge/seed-5831002.json',
    'tests/fixtures/arena-basis-challenge/seed-5831003.json',
    'tests/fixtures/arena-basis-challenge/seed-5831004.json',
  ],
});

function fixture(seed: 5831001 | 5831002 | 5831003): Promise<string> {
  switch (seed) {
    case 5831001: return Promise.resolve(inputs.fixtures.readText(
      'tests/fixtures/arena-basis-challenge/seed-5831001.json',
    ));
    case 5831002: return Promise.resolve(inputs.fixtures.readText(
      'tests/fixtures/arena-basis-challenge/seed-5831002.json',
    ));
    case 5831003: return Promise.resolve(inputs.fixtures.readText(
      'tests/fixtures/arena-basis-challenge/seed-5831003.json',
    ));
  }
}

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

let report: ChallengeReducerFeasibilityReportV1;
let migrationEvidence: ChallengeProvenanceMigrationEvidenceV1;

beforeAll(async () => {
  const roomA = decodeArenaBasisEnvelopeV1(
    JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831003.json')) as unknown,
    { mode: 'challenge' },
  ).encounter.state;
  const roomD = decodeArenaBasisEnvelopeV1(
    JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831004.json')) as unknown,
    { mode: 'challenge' },
  ).encounter.state;
  migrationEvidence = challengeProvenanceMigrationEvidenceV1(roomA, roomD);
  report = await runChallengeReducerFeasibility(fixture);
}, 180_000);

describe('D583 reducer-backed challenge feasibility', () => {
  it('transactional adapter preserves die provenance across checkpoint replay and rollback', () => {
    expect(migrationEvidence.provenanceManifest).toHaveLength(33);
    expect(migrationEvidence.provenanceManifest.every((record) =>
      record.face >= 1 && record.face <= record.sides &&
      String(record.provenance.occurrenceId).length > 0 &&
      String(record.provenance.operationPath).length > 0)).toBe(true);
    if (report.verdict === 'GO') {
      expect(report.totals.maximumDraws).toBeGreaterThan(0);
      expect(report.totals.reducerApplications).toBeGreaterThan(report.totals.completedLeaves);
      expect(report.rooms.every((room) => room.base.continuationEquivalent)).toBe(true);
    } else {
      expect(report.failure).not.toBeNull();
      expect(report.rooms).toEqual([]);
      expect(report.totals.completedLeaves).toBe(0);
    }
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

  it('independent roll provenance class survives every reducer adapter and owns checkpoints', () => {
    if (report.verdict === 'GO') {
      expect(report.failure).toBeNull();
      expect(report.totals.reducerApplications).toBeGreaterThan(0);
      expect(report.totals.maximumCommandCheckpoints).toBe(4);
    } else {
      expect(report.failure?.kind).toMatch(/^(limit_exhausted|derived_cap_overflow)$/);
    }
  });

  it('B C A reducer stages have mass one and report actual applications states heap and wall', () => {
    expect(report.roomOrder).toEqual(['B', 'C', 'A']);
    if (report.verdict === 'GO') {
      expect(report.rooms).toHaveLength(3);
      for (const room of report.rooms) {
        expect(room.base).toMatchObject({ mass: { numerator: '1', denominator: '1' } });
        expect(room.base.reducerApplications).toBeGreaterThan(0);
        expect(room.base.groupedStates).toBeGreaterThan(0);
        expect(room.base.peakHeapUsedBytes).toBeGreaterThan(0);
        expect(room.base.wallMilliseconds).toBeGreaterThan(0);
      }
    } else {
      expect(report.failure).not.toBeNull();
      expect(report.rooms).toEqual([]);
    }
  });

  it('state merging proves equal next commands objective eligibility and provenance requests', () => {
    if (report.verdict === 'GO') {
      expect(report.totals.continuationEquivalent).toBe(true);
      expect(report.rooms.flatMap((room) => [room.base, ...room.variants]).every(
        (variant) => variant.continuationEquivalent,
      )).toBe(true);
    } else {
      expect(report.totals.continuationEquivalent).toBe(false);
      expect(report.derivedWitnessCaps).toBeNull();
    }
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

  it('d583 bca limits are immutable cumulative and checked before and after work', () => {
    expect(Object.isFrozen(D583_BCA_FEASIBILITY_LIMITS_V1)).toBe(true);
    expect(D583_BCA_FEASIBILITY_LIMITS_V1).toEqual({
      profile: 'd583_bca_v1', maxFaceExpansions: 10_000_000, maxReducerApplications: 5_000_000,
      maxLiveNodes: 250_000, maxHeapUsedBytes: 1_073_741_824, maxWallMilliseconds: 180_000,
      maxCommandCheckpointsPerBranch: 64, maxDrawsPerBranch: 128,
    });
    expect(report.limits).toBe(D583_BCA_FEASIBILITY_LIMITS_V1);
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

  it('CLI missing and mismatched limit profiles write SHELVE reports without loading fixtures', async () => {
    const written: ChallengeReducerFeasibilityReportV1[] = [];
    const io = {
      loadFixtureText: async (): Promise<string> => { throw new Error('limits failure must precede fixture loading'); },
      writeReport: async (_output: string, value: ChallengeReducerFeasibilityReportV1): Promise<void> => {
        written.push(value);
      },
    };
    const base = [
      '--basis', 'challenge', '--seed', '5831001', '--rooms', '3', '--room-order', 'B,C,A',
      '--mode', 'reducer', '--out', '/tmp/d583-cli-control.json',
    ];
    const missing = await runChallengeFeasibilityCli(base, io);
    const mismatched = await runChallengeFeasibilityCli([...base, '--limits', 'wrong-profile'], io);
    expect([missing.report.failure, mismatched.report.failure]).toEqual([
      { kind: 'missing_limits', counter: 'limits_profile', observed: '<missing>', limit: 'd583_bca_v1' },
      { kind: 'missing_limits', counter: 'limits_profile', observed: 'wrong-profile', limit: 'd583_bca_v1' },
    ]);
    expect(written).toEqual([missing.report, mismatched.report]);
    expect(written.every((value) => value.verdict === 'SHELVE_D583' && value.rooms.length === 0)).toBe(true);
  });

  it('feasibility fails closed on mass provenance continuation collision or unmeasured variant', () => {
    if (report.verdict === 'GO') {
      expect(report.rooms.flatMap((room) => room.variants)).toHaveLength(54);
      expect(report.totals.mass).toEqual({ numerator: '57', denominator: '1' });
    } else {
      expect(report.rooms).toEqual([]);
      expect(report.totals.mass).toEqual({ numerator: '0', denominator: '1' });
      expect(report.failure).not.toBeNull();
    }
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
