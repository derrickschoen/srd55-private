import { beforeAll, describe, expect, it } from 'vitest';
import {
  D583_BCA_FEASIBILITY_LIMITS_V1,
  runChallengeReducerFeasibility,
  type ChallengeReducerFeasibilityReportV1,
} from '../../../src/vtt/challenge-feasibility';
import { runChallengeFeasibilityCli } from '../../../tools/challenge-feasibility';
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

let report: ChallengeReducerFeasibilityReportV1;

beforeAll(async () => {
  report = await runChallengeReducerFeasibility(fixture);
}, 180_000);

describe('D583 reducer-backed challenge feasibility production exploration', () => {
  it('reports transactional replay and rollback accounting', () => {
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

  it('uses the immutable cumulative limit profile', () => {
    expect(report.limits).toBe(D583_BCA_FEASIBILITY_LIMITS_V1);
  });

  it('rejects the first variant heap sample without hiding it behind a second reading', async () => {
    const heapValues = [10, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1, 10];
    const nowValues = [0, 0, 0, D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds + 1];
    const measured = await runChallengeReducerFeasibility(fixture, {
      now: (): number => nowValues.shift() ?? 0,
      heapUsed: (): number => heapValues.shift() ?? 10,
    });
    expect(measured.failure).toEqual({
      kind: 'limit_exhausted', counter: 'heap_used_bytes',
      observed: D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1,
      limit: D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes,
    });
    expect(heapValues).toEqual([10]);
    expect(nowValues).toEqual([D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds + 1]);
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

  it('CLI valid-profile execution reports the first enforced exhaustion through injected IO', async () => {
    const written: ChallengeReducerFeasibilityReportV1[] = [];
    const heapValues = [10, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1, 10];
    const nowValues = [0, 0, 0, D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds + 1];
    const result = await runChallengeFeasibilityCli([
      '--basis', 'challenge', '--seed', '5831001', '--rooms', '3', '--room-order', 'B,C,A',
      '--mode', 'reducer', '--limits', 'd583_bca_v1', '--out', '/tmp/d583-cli-exhaustion-control.json',
    ], {
      loadFixtureText: fixture,
      writeReport: async (_output, value): Promise<void> => { written.push(value); },
      runtime: {
        now: (): number => nowValues.shift() ?? 0,
        heapUsed: (): number => heapValues.shift() ?? 10,
      },
    });
    expect(result.report.failure).toEqual({
      kind: 'limit_exhausted', counter: 'heap_used_bytes',
      observed: D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes + 1,
      limit: D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes,
    });
    expect(result.report.verdict).toBe('SHELVE_D583');
    expect(written).toEqual([result.report]);
    expect(heapValues).toEqual([10]);
    expect(nowValues).toEqual([D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds + 1]);
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
  });
});
