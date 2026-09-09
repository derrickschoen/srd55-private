import { beforeAll, describe, expect, it } from 'vitest';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import {
  classifyDerivedCaps,
  classifyFixedLimitMeasurement,
  D583_BCA_DERIVED_CAP_MAXIMA_V1,
  D583_BCA_FEASIBILITY_LIMITS_V1,
  D583_D_ONE_POLICY_EVIDENCE,
  deriveVariantHorizon,
  futureStateKeyV1,
  mergeContinuationEquivalentStates,
  runChallengeReducerFeasibility,
  type ChallengeReducerFeasibilityReportV1,
} from '../../../src/vtt/challenge-feasibility';
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

beforeAll(async () => {
  report = await runChallengeReducerFeasibility(fixture);
}, 180_000);

describe('D583 reducer-backed challenge feasibility', () => {
  it('transactional adapter preserves die provenance across checkpoint replay and rollback', () => {
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
    const d4 = componentTotals(rollComponentId('healing-word'), expression(1, 4));
    const bounded = componentTotals(rollComponentId('capped-healing'), {
      kind: 'dice_expression', expression: { count: 2, sides: dieSides(4), modifier: 3, maximumTotal: 4 },
    });
    expect(distributionMass(d4)).toEqual(exactFraction(1n, 1n));
    expect(bounded.outcomes).toEqual([{ total: 4, weight: exactFraction(1n, 1n) }]);
    if (report.verdict === 'GO') {
      expect(report.rooms.find((room) => room.roomId === 'A')?.base.maximumDraws).toBeGreaterThanOrEqual(1);
    } else {
      expect(report.derivedWitnessCaps).toBeNull();
    }
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

  it('missing limits and each face application node heap wall checkpoint or draw exhaustion shelf without partial GO', () => {
    const base = {
      faceExpansions: 0, reducerApplications: 0, liveNodes: 0, heapUsedBytes: 0,
      wallMilliseconds: 0, commandCheckpoints: 0, draws: 0,
    };
    const cases = [
      ['faceExpansions', D583_BCA_FEASIBILITY_LIMITS_V1.maxFaceExpansions + 1, 'face_expansions'],
      ['reducerApplications', D583_BCA_FEASIBILITY_LIMITS_V1.maxReducerApplications + 1, 'reducer_applications'],
      ['liveNodes', D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes + 1, 'live_nodes'],
      ['heapUsedBytes', D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1, 'heap_used_bytes'],
      ['wallMilliseconds', D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds + 1, 'wall_milliseconds'],
      ['commandCheckpoints', D583_BCA_FEASIBILITY_LIMITS_V1.maxCommandCheckpointsPerBranch + 1, 'command_checkpoints_per_branch'],
      ['draws', D583_BCA_FEASIBILITY_LIMITS_V1.maxDrawsPerBranch + 1, 'draws_per_branch'],
    ] as const;
    for (const [field, value, counter] of cases) {
      expect(classifyFixedLimitMeasurement({ ...base, [field]: value })).toMatchObject({
        kind: 'limit_exhausted', counter,
      });
    }
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
