import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { mkdtempSync, readFileSync, rmSync } from '../../helpers/test-filesystem';
import {
  BRUTAL_10_PROTOCOL,
  buildRerunPacket,
  R1_10_PROTOCOL,
  type RerunProtocol,
} from '../../../tools/ai-dm-rerun-packet';
import { runLuna6EffortStudyCli } from '../../../tools/luna6-effort-study';
import {
  analyzeLuna6Study,
  analyzeLuna6StudyStage,
  luna6Decision,
  luna6DrawExceedsMargin,
  luna6ExactPercentile,
  luna6PairDifferences,
  luna6RejectLimit,
  luna6RejectsH0,
  type Luna6PairDifference,
  type Luna6ScoredCell,
  type Luna6TagDocuments,
} from '../../../tools/luna6-effort-study/analyze';
import {
  ingestLuna6Study,
  luna6GuardLedgerDocument,
  luna6RelabelViolations,
  Luna6StudyRefusal,
  type Luna6CellEvidence,
  type Luna6GuardLedgerKey,
} from '../../../tools/luna6-effort-study/ingest';
import { luna6PairedTimeRatio, luna6SpeedSummary, type Luna6CallTiming } from '../../../tools/luna6-effort-study/latency';
import {
  buildLuna6Packets,
  luna6PacketLeakViolations,
  luna6PacketProtocol,
} from '../../../tools/luna6-effort-study/packets';
import {
  LUNA6_EFFORT_STUDY,
  type Luna6ArmId,
  type Luna6EffortStudyRegistration,
  type Luna6Mode,
  type Luna6StratumId,
  type Luna6Tag,
} from '../../../tools/luna6-effort-study/registration';
import {
  buildLuna6Reruns,
  buildLuna6Schedule,
  luna6GridViolations,
  type Luna6CellIdentity,
  type Luna6Schedule,
  type Luna6ScheduleEntry,
} from '../../../tools/luna6-effort-study/schedule';

// Every expectation below is typed from the preregistration S-PREREG (D898, 2026-09-26; R1-R11 supersede plan r5 §3
// for option (b)) or derived by hand from plan r5 §4.5 as adapted to D898's counts (the arithmetic is in
// .tmp/runs/luna6/b6/derivations.txt). The registered schedule sequence and the packets' blinding order come from an
// independent python oracle written from D898 R2 and R3 (.tmp/runs/luna6/b6/fix1/oracle/oracle.py, no repo code).
// None is read from the module under test.

type Outcome<Value> = { readonly ok: Value } | { readonly error: readonly string[] | string };

function outcome<Value>(run: () => Value): Outcome<Value> {
  try {
    return { ok: run() };
  } catch (error) {
    if (error instanceof Luna6StudyRefusal) return { error: error.violations };
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

const HIGH: Luna6ArmId = 'gpt-6-luna-high';
const XHIGH: Luna6ArmId = 'gpt-6-luna-xhigh';

function seedRun(first: number): readonly number[] {
  return Array.from({ length: 10 }, (_unused, index) => first + index);
}

/** D898 R1: the four strata, typed from the registration text, not from the module. */
const STRATA: readonly { readonly id: Luna6StratumId; readonly seeds: readonly number[] }[] = [
  { id: 'hard', seeds: seedRun(5_117_001) },
  { id: 'brutal', seeds: seedRun(6_203_001) },
  { id: 'hard2', seeds: seedRun(5_118_001) },
  { id: 'brutal2', seeds: seedRun(6_207_001) },
];
const MODES: readonly Luna6Mode[] = ['blind', 'advice'];
const ARMS: readonly Luna6ArmId[] = [HIGH, XHIGH];

function registeredGrid(): readonly Luna6CellIdentity[] {
  return STRATA.flatMap((stratum) => MODES.flatMap((mode) => stratum.seeds.flatMap((seed) =>
    [1, 2, 3].flatMap((rep) => ARMS.map((arm) => ({ mode, stratum: stratum.id, seed, rep, arm }))))));
}

function cellKey(cell: Luna6CellIdentity): string {
  return `${cell.arm}|${cell.mode}|${cell.stratum}|${String(cell.seed)}|${String(cell.rep)}`;
}

function pairKey(cell: Omit<Luna6CellIdentity, 'arm'>): string {
  return `${cell.mode}|${cell.stratum}|${String(cell.seed)}|${String(cell.rep)}`;
}

/** Plan §4.5 items 2-4 hold for any resample count that keeps the percentile index well inside the draws. */
const UNIT_RULE: Luna6EffortStudyRegistration = { ...LUNA6_EFFORT_STUDY, resamples: 2_000 };

/** D898 R1's 40 encounter seeds × 2 modes × 3 reps = 240 pairs, each difference `t(seedIndex, pairIndex)`. */
function registeredPairs(t: (seedIndex: number, pairIndex: number) => number): readonly Luna6PairDifference[] {
  const seeds = STRATA.flatMap((stratum) => stratum.seeds.map((seed) => ({ seed, stratum: stratum.id })));
  return seeds.flatMap(({ seed, stratum }, seedIndex) => MODES.flatMap((mode, modeIndex) =>
    [1, 2, 3].map((rep) => ({ mode, stratum, seed, rep, t: t(seedIndex, modeIndex * 3 + rep - 1) }))));
}

const components = (targetPriority: number, actionEconomy: number, coherence: number, positioning: number) =>
  ({ targetPriority, actionEconomy, coherence, positioning });
const allSeats = (scores: ReturnType<typeof components>): Luna6ScoredCell['seats'] =>
  (['fable', 'astra', 'sol'] as const).map((seat) => ({ seat, components: scores }));

/** Plan §4.5 item 7's mini registration: basis hard, seeds 5117001 and 5117002, one rep, both modes. */
const MINI: Luna6EffortStudyRegistration = {
  ...LUNA6_EFFORT_STUDY,
  strata: [{ ...LUNA6_EFFORT_STUDY.strata[0]!, seeds: [5_117_001, 5_117_002], reps: 1 }],
  cells: 8,
  pairs: 4,
  clusters: 2,
  resamples: 1_000,
  bootstrapSeed: 1,
};

type Entry = Readonly<Record<string, unknown>>;

function miniDocuments(
  highScore: Entry = { targetPriority: 2, actionEconomy: 2, coherence: 1, positioning: 1, total: 6 },
): Record<'blind-hard' | 'advice-hard', { packet: Entry[]; answerKey: Entry[]; seats: Record<string, Entry[] | undefined> }> {
  const xhighScore = { targetPriority: 3, actionEconomy: 3, coherence: 1, positioning: 1, total: 8 };
  const arms: Record<string, Luna6ArmId> = { 'blind-001': XHIGH, 'blind-002': HIGH, 'blind-003': HIGH, 'blind-004': XHIGH };
  const cases: Record<string, string> = {
    'blind-001': 'case-01-1', 'blind-002': 'case-02-1', 'blind-003': 'case-01-1', 'blind-004': 'case-02-1',
  };
  const tag = () => {
    const ids = Object.keys(arms);
    const seat = () => ids.map((blindId) => ({ blindId, ...(arms[blindId] === XHIGH ? xhighScore : highScore) }));
    return {
      packet: ids.map((blindId) => ({ blindId, caseId: cases[blindId], outcome: 'authorized' })),
      answerKey: ids.map((blindId) => ({ blindId, arm: arms[blindId] })),
      seats: { fable: seat(), astra: seat(), sol: seat() } as Record<string, Entry[] | undefined>,
    };
  };
  return { 'blind-hard': tag(), 'advice-hard': tag() };
}

function asDocuments(documents: ReturnType<typeof miniDocuments>): Record<'blind-hard' | 'advice-hard', Luna6TagDocuments> {
  return documents;
}

function projectDecision(ledger: readonly Luna6GuardLedgerKey[], documents = miniDocuments()) {
  const result = analyzeLuna6Study({ registration: MINI, documents: asDocuments(documents), ledger });
  return {
    decision: result.decision,
    delta: { mean: result.delta.mean, lower: result.delta.lowerQstar, upper: result.delta.upper975 },
    pairs: result.pairs,
    clusters: result.clusters,
    sa1Overrides: result.sa1Overrides,
  };
}

/** A minimal arena row and call log for one scheduled cell of the mini registration (plan §4.5 item 10). */
function cellEvidence(
  entry: Luna6ScheduleEntry,
  overrides: { readonly row?: Entry; readonly calls?: readonly Entry[]; readonly exitCode?: number } = {},
): Luna6CellEvidence {
  const effort = entry.arm === XHIGH ? 'xhigh' : 'high';
  const cap = entry.mode === 'blind' ? 65_536 : 32_768;
  const row = {
    rowContractVersion: 'arena-row-v3', seed: entry.seed, room: entry.room, round: entry.rep,
    scheduledCellKey: entry.cellKey, dmMode: entry.mode, basis: 'hard', model: 'gpt-6-luna', effort, arm: 'single',
    roundWallBudgetMs: null, turnContextMaximumBytes: cap,
    turnContextConfiguredCaps: { baseBytes: cap, semanticBytes: 8_192 }, outcome: 'authorized', callsPerRound: 1,
    ...overrides.row,
  };
  const calls = overrides.calls ?? [{}];
  const lines = calls.flatMap((call, index) => {
    const dispatch = {
      schema: 'luna-call-log-v2', event: 'dispatch', runId: 'luna-run:test', cellKey: entry.cellKey,
      ordinal: index + 1, surface: 'agent_adapter', dispatch: 'start', callPhase: 'initial', bootstrapKind: 'cold_start',
      model: 'gpt-6-luna', reasoningEffort: effort, timeoutMs: 1_800_000, boundKind: 'hang_guard',
      startedAtUnixMs: 1_000, ...call['dispatch'] as Entry | undefined,
    };
    const complete = {
      schema: 'luna-call-log-v2', event: 'complete', runId: 'luna-run:test', cellKey: dispatch.cellKey,
      ordinal: index + 1, endedAtUnixMs: 2_000, elapsedMs: 1_000, exit: 'completed', hangGuardFired: false,
      error: null, providerRequestId: null, ...call['complete'] as Entry | undefined,
    };
    return [JSON.stringify(dispatch), JSON.stringify(complete)];
  });
  return { exitCode: overrides.exitCode ?? 0, rowsText: `${JSON.stringify(row)}\n`, callLogText: `${lines.join('\n')}\n` };
}

function miniEvidence(
  schedule: Luna6Schedule,
  changed: Readonly<Record<string, Parameters<typeof cellEvidence>[1]>> = {},
): Map<number, Luna6CellEvidence> {
  return new Map(schedule.entries.map((entry) => [entry.ordinal, cellEvidence(entry, changed[cellKey(entry)])]));
}

/** Ordinals and pair numbers come from the seeded schedule, so they are normalised out of messages and ledgers. */
function normalise(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)
    .replace(/cell \d{3} \(/gu, 'cell <n> (')
    .replace(/pair \d+ \(/gu, 'pair <p> (')
    .replace(/cell \d+ (exit|infrastructure_failed|no row)/gu, 'cell <n> $1')
    .replace(/"ordinal":\d+,"calls"/gu, '"ordinal":"<n>","calls"')) as unknown;
}

/** D898 R1's hard stratum alone: 10 seeds × 2 modes × 3 reps = 60 pairs, with the registered STOP threshold of 24. */
const HARD60: Luna6EffortStudyRegistration = {
  ...LUNA6_EFFORT_STUDY,
  strata: [LUNA6_EFFORT_STUDY.strata[0]!],
  cells: 120,
  pairs: 60,
  clusters: 10,
};

/**
 * One tag's normalized rows (relabelled, as ingest writes them) for every registered seed and rep, in the minimal
 * post-shift row shape the FROZEN packet builder accepts (its own test's `registeredRows`, with the study's arms).
 */
function packetRows(): Record<Luna6Tag, Entry[]> {
  const rows: Partial<Record<Luna6Tag, Entry[]>> = {};
  for (const mode of MODES) {
    for (const stratum of STRATA) {
      rows[`${mode}-${stratum.id}`] = stratum.seeds.flatMap((seed, index) => [1, 2, 3].flatMap((round) => ARMS.map((arm) => {
        const effort = arm === XHIGH ? 'xhigh' : 'high';
        return {
          seed, room: index + 1, round, arm, instructionSource: 'kb', skillName: null, skillHash: null,
          model: 'gpt-6-luna', effort, cli: 'codex', startingRoomDigest: `frozen-room-${String(seed)}`,
          combatModel: 'initiative_segments_v1', initiativeOrder: ['monster', 'fighter'], outcome: 'authorized',
          plannedBy: { model: 'gpt-6-luna', effort }, decisionTransport: 'mcp_minimal', firstDecisionAccepted: true,
          decisionAttempts: 1, decisionRejectionCodes: [], normalizationCodes: [], rationale: null,
          roundNarrative: null, authorizedPlan: null, roundWallBudgetMs: null,
        };
      })));
    }
  }
  return rows as Record<Luna6Tag, Entry[]>;
}

/** Every registered tag's packet, answer key and three identical seat files; `score` gives each cell's components. */
function gridDocuments(
  score: (cell: Luna6CellIdentity) => ReturnType<typeof components>,
): Partial<Record<Luna6Tag, Luna6TagDocuments>> {
  return Object.fromEntries(MODES.flatMap((mode) => STRATA.map((stratum) => {
    const cells = stratum.seeds.flatMap((seed, index) => [1, 2, 3].flatMap((rep) => ARMS.map((arm) => ({
      cell: { mode, stratum: stratum.id, seed, rep, arm },
      caseId: `case-${String(index + 1).padStart(2, '0')}-${String(rep)}`,
    }))));
    const blindId = (index: number) => `blind-${String(index + 1).padStart(3, '0')}`;
    const seat = cells.map(({ cell }, index) => {
      const scores = score(cell);
      const total = scores.targetPriority + scores.actionEconomy + scores.coherence + scores.positioning;
      return { blindId: blindId(index), ...scores, total };
    });
    return [`${mode}-${stratum.id}`, {
      packet: cells.map(({ caseId }, index) => ({ blindId: blindId(index), caseId, outcome: 'authorized' })),
      answerKey: cells.map(({ cell }, index) => ({ blindId: blindId(index), arm: cell.arm })),
      seats: { fable: seat, astra: seat, sol: seat },
    }];
  })));
}

/** A schedule entry as the oracle prints it: ordinal, pair, mode, stratum, seed, rep, arm. */
function scheduleRow(entry: Luna6ScheduleEntry): readonly unknown[] {
  return [entry.ordinal, entry.pair, entry.mode, entry.stratum, entry.seed, entry.rep, entry.arm];
}

describe('LUNA6 effort study', () => {
  it('registers the preregistered study constants verbatim from S-PREREG', () => {
    const v5 = {
      path: 'tests/fixtures/d569-blind-experiment-manifest.json',
      sha256: '8c0bcb3c0afa8358c26129efbef82d0d2882135389d8dd8040fe7e4b6451e13a',
      version: 'd569-blind-experiment-v5',
    };
    const secondFamily = {
      path: 'tests/fixtures/d569-second-family-manifest.json',
      sha256: '83daa7ea3ca89b270e5149368d09fa97074124dfe438cf95b346e996996026c8',
      version: 'd569-second-family-manifest-v1',
    };
    expect(LUNA6_EFFORT_STUDY).toEqual({
      id: 'luna6-effort-study-v1',
      preregistration: 'D898',
      arms: [
        { id: 'gpt-6-luna-high', model: 'gpt-6-luna', effort: 'high' },
        { id: 'gpt-6-luna-xhigh', model: 'gpt-6-luna', effort: 'xhigh' },
      ],
      modes: ['blind', 'advice'],
      strata: [
        {
          id: 'hard', basis: 'hard', basisDir: null, fixturesDir: 'tests/fixtures/arena-basis-hard',
          seeds: [5117001, 5117002, 5117003, 5117004, 5117005, 5117006, 5117007, 5117008, 5117009, 5117010],
          reps: 3, manifest: v5,
        },
        {
          id: 'brutal', basis: 'brutal', basisDir: null, fixturesDir: 'tests/fixtures/arena-basis-brutal',
          seeds: [6203001, 6203002, 6203003, 6203004, 6203005, 6203006, 6203007, 6203008, 6203009, 6203010],
          reps: 3, manifest: v5,
        },
        {
          id: 'hard2', basis: 'hard', basisDir: 'tests/fixtures/arena-basis-hard-2',
          fixturesDir: 'tests/fixtures/arena-basis-hard-2',
          seeds: [5118001, 5118002, 5118003, 5118004, 5118005, 5118006, 5118007, 5118008, 5118009, 5118010],
          reps: 3, manifest: secondFamily,
        },
        {
          id: 'brutal2', basis: 'brutal', basisDir: 'tests/fixtures/arena-basis-brutal-2',
          fixturesDir: 'tests/fixtures/arena-basis-brutal-2',
          seeds: [6207001, 6207002, 6207003, 6207004, 6207005, 6207006, 6207007, 6207008, 6207009, 6207010],
          reps: 3, manifest: secondFamily,
        },
      ],
      cells: 480,
      pairs: 240,
      clusters: 40,
      caps: { blindBaseBytes: 65536, semanticBytes: 8192, adviceBaseBytes: 32768 },
      margin: { numerator: 1, denominator: 5 },
      qStar: 0.025,
      resamples: 100000,
      bootstrapSeed: 20260924,
      scheduleSeed: 1077733051,
      packetShuffleSeeds: {
        'blind-hard': 2353643760,
        'blind-brutal': 3013067085,
        'advice-hard': 3827398149,
        'advice-brutal': 1901141339,
        'blind-hard2': 932728174,
        'blind-brutal2': 3206187783,
        'advice-hard2': 1066981191,
        'advice-brutal2': 3194685170,
      },
      hangGuardMs: 1800000,
      seats: ['fable', 'astra', 'sol'],
      maxExcludedPairs: 24,
      codexBin: '/home/vagrant/.nvm/versions/node/v24.13.0/bin/codex',
      kb: 'tests/fixtures/ai-dm-kb/d569/ai-dm-core.md',
      studyRoot: '/home/vagrant/dnd-slim-runs/luna6-effort',
      cellEnv: { CODEX_HOME: '/home/vagrant/.codex-aidm', BOARD_SNAPSHOT_PREVIEW_PORT: '4530' },
      amendments: {
        sa1: `{"id":"luna6-sa1-hang-guard-expiry-scores-zero","timing":"pre-run","date":"2026-09-26","reason":"Owner ruling D890 (a): gpt-6-luna calls have a 30 min per-call hang guard, logged whenever it fires. A study cell with at least one call-log record hangGuardFired=true is scored 0 in every component, is never excluded, and counts as a failure in the reported failure-risk secondary, whatever outcome the runner recorded. D569 scoring would exclude such a cell if the runner classified it infrastructure_failed. The runner already classifies a timed-out primary as refused/timeout (tools/ai-dm-conversation.ts:5711-5714) and a timed-out correction as refused/correction_timeout (src/vtt/turn-exhaustion-coordinator.ts:398-399), so SA-1 changes only cells the runner classified otherwise."}`,
        sa2: `{"id":"luna6-sa2-v5-cohorts-and-caps","timing":"pre-run","date":"2026-09-26","reason":"Owner answer 2026-09-24 19:01 ('Study on v5, v7 waits for v6'): luna6-effort-study-v1 runs on the D569 v5 primary cohorts (evaluation-hard 5117001-5117010, evaluation-brutal 6203001-6203010) and v5 caps (65536/8192/32768 bytes). For this study only, this supersedes Part A :568 'Current cap/cohort amendments replace historical 65536-byte / hard 5117xxx / brutal 6203xxx settings' and :560 'active cohorts/caps obey COHORT v6'; COHORT v6 exists only on the shelved claude/cohort-01 branch (D847). Limitation: Part A :486 records that 'COHORT v6 supersedes active brutal selection' (brutal_productivity filtering, :515-520); the brutal 6203 cohort is the unfiltered v5 selection. The route E this study picks applies to other states by D890 (c), not by measurement."}`,
        sa2b: `{"id":"luna6-sa2b-v5-second-family","timing":"pre-run","date":"2026-09-26","reason":"Owner answer 2026-09-25 (Q-POWER): '(b) 40 encounters, 480 cells'. luna6-effort-study-v1 also runs the D569 v5 second family registered in d569-second-family-manifest.json (sha256 83daa7ea3ca89b270e5149368d09fa97074124dfe438cf95b346e996996026c8): hard-2 5118001-5118010 and brutal-2 6207001-6207010, the same v5 caps (65536/8192/32768 bytes) and the §3.1 execution settings as the primary cohorts. v5 registered this family and never launched it (runbook-84326354.md:51-58); this study consumes it, so it is no longer an unused held-out family for any later D569 version."}`,
      },
    });
    // D898 R6: with n = 100,000 and q* = 0.025 the rejection limit is 2,500 draws; δ = 1/5 makes 5·S > 3·m exact.
    expect({
      rejectLimit: Math.floor(LUNA6_EFFORT_STUDY.qStar * LUNA6_EFFORT_STUDY.resamples),
      amendments: Object.values(LUNA6_EFFORT_STUDY.amendments).map((text) => {
        const parsed = JSON.parse(text) as Readonly<Record<string, unknown>>;
        return [parsed['id'], parsed['timing'], parsed['date']];
      }),
    }).toEqual({
      rejectLimit: 2500,
      amendments: [
        ['luna6-sa1-hang-guard-expiry-scores-zero', 'pre-run', '2026-09-26'],
        ['luna6-sa2-v5-cohorts-and-caps', 'pre-run', '2026-09-26'],
        ['luna6-sa2b-v5-second-family', 'pre-run', '2026-09-26'],
      ],
    });
  });

  it('picks xhigh only when the calibrated lower bound exceeds the margin', () => {
    // (a) every pair +2/3; (b) one pair per cluster +1/3, five 0, so every draw is 1/18; (c) 20 clusters at +1 and
    // 20 at −1/3, mean 1/3, a draw exceeds 0.20 iff at least 17 of its 40 picks are +1 clusters: P(X ≤ 16) = 0.1341.
    const a = luna6Decision(registeredPairs(() => 2), UNIT_RULE);
    const b = luna6Decision(registeredPairs((_seed, pair) => pair === 0 ? 1 : 0), UNIT_RULE);
    const c = luna6Decision(registeredPairs((seed) => seed % 2 === 0 ? 3 : -1), UNIT_RULE);
    expect([a.decision, b.decision, c.decision]).toEqual(['xhigh', 'high', 'high']);
    expect({ a, b: { ...b }, c: { mean: c.delta.mean, rejectLimit: c.rejectLimit } }).toEqual({
      a: {
        decision: 'xhigh', delta: { mean: 2 / 3, lowerQstar: 2 / 3, upper975: 2 / 3 },
        pairs: 240, clusters: 40, drawsAtOrBelowMargin: 0, rejectLimit: 50,
      },
      b: {
        decision: 'high', delta: { mean: 1 / 18, lowerQstar: 1 / 18, upper975: 1 / 18 },
        pairs: 240, clusters: 40, drawsAtOrBelowMargin: 2000, rejectLimit: 50,
      },
      c: { mean: 1 / 3, rejectLimit: 50 },
    });
  });

  it('charges a refused or hang-guard cell as zero in the paired difference', () => {
    // Every cluster: five pairs at +1 (21 − 18) and one pair whose xhigh cell scores 0 against an executed high cell
    // at 6 (t = −18): each cluster's mean is (5 − 6)/6 = −1/6, so every draw is −1/6 → high. Excluding the pair
    // instead would leave +1 everywhere → xhigh.
    const special = (cell: { mode: Luna6Mode; rep: number }) => cell.mode === 'advice' && cell.rep === 3;
    const cells = (variant: 'refused' | 'hang_guard'): readonly Luna6ScoredCell[] =>
      registeredGrid().map((cell): Luna6ScoredCell => {
        const basis = cell.stratum === 'hard' || cell.stratum === 'hard2' ? 'hard' : 'brutal';
        if (cell.arm === HIGH) return { ...cell, basis, outcome: 'executed', seats: allSeats(components(2, 2, 1, 1)) };
        if (special(cell) && variant === 'refused') return { ...cell, basis, outcome: 'refused', seats: [] };
        return { ...cell, basis, outcome: 'executed', seats: allSeats(components(3, 2, 1, 1)) };
      });
    const ledger: readonly Luna6GuardLedgerKey[] = registeredGrid()
      .filter((cell) => cell.arm === XHIGH && special(cell))
      .map((cell) => ({
        mode: cell.mode, basis: cell.stratum === 'hard' || cell.stratum === 'hard2' ? 'hard' : 'brutal',
        seed: cell.seed, rep: cell.rep, arm: cell.arm,
      }));
    const run = (variant: 'refused' | 'hang_guard') => {
      const pairing = luna6PairDifferences(LUNA6_EFFORT_STUDY, cells(variant), variant === 'refused' ? [] : ledger);
      const decision = luna6Decision(pairing.pairs, UNIT_RULE);
      return {
        decision: decision.decision, mean: decision.delta.mean, lower: decision.delta.lowerQstar,
        pairs: decision.pairs, excludedPairs: pairing.excludedPairs, sa1Overrides: pairing.sa1Overrides,
      };
    };
    expect({ refused: run('refused'), hangGuard: run('hang_guard') }).toEqual({
      refused: { decision: 'high', mean: -1 / 6, lower: -1 / 6, pairs: 240, excludedPairs: 0, sa1Overrides: 0 },
      hangGuard: { decision: 'high', mean: -1 / 6, lower: -1 / 6, pairs: 240, excludedPairs: 0, sa1Overrides: 40 },
    });
  });

  it('runs the analysis from packet, answer key and three seat files to the decision, with the call-log override', () => {
    // Case A: four pairs at (24 − 18)/3 = +2. Case B: the guard fired on blind 5117001 rep 1 xhigh, so that cell is 0
    // and its difference −6: clusters {−6, +2} and {+2, +2}; a draw's mean is −2, 0 or +2 with probability ¼, ½, ¼.
    expect({
      caseA: projectDecision([]),
      caseB: projectDecision([{ mode: 'blind', basis: 'hard', seed: 5_117_001, rep: 1, arm: XHIGH }]),
    }).toEqual({
      caseA: { decision: 'xhigh', delta: { mean: 2, lower: 2, upper: 2 }, pairs: 4, clusters: 2, sa1Overrides: 0 },
      caseB: { decision: 'high', delta: { mean: 0, lower: -2, upper: 2 }, pairs: 4, clusters: 2, sa1Overrides: 1 },
    });
  });

  it('clusters the bootstrap by encounter seed across modes and bases', () => {
    // Seed 5117001 (hard): six differences of +1 over both modes and three reps; seed 6203001 (brutal): six of 0.
    // By seed, a draw is 0, 1/2 or 1 with probability ¼, ½, ¼, so the interval is {0, 1}. Resampling the 12 cells
    // instead gives P(mean ≤ 1/12) = 13/4096 < 0.025, so its lower bound would be at least 2/12.
    const pairs: Luna6PairDifference[] = [
      ...MODES.flatMap((mode) => [1, 2, 3].map((rep) => ({ mode, stratum: 'hard' as const, seed: 5_117_001, rep, t: 3 }))),
      ...MODES.flatMap((mode) => [1, 2, 3].map((rep) => ({ mode, stratum: 'brutal' as const, seed: 6_203_001, rep, t: 0 }))),
    ];
    const result = luna6Decision(pairs, UNIT_RULE);
    expect({
      decision: result.decision, mean: result.delta.mean, lower: result.delta.lowerQstar,
      upper: result.delta.upper975, pairs: result.pairs, clusters: result.clusters,
    }).toEqual({ decision: 'high', mean: 0.5, lower: 0, upper: 1, pairs: 12, clusters: 2 });
  });

  it('summarises per-call response time with the hang guard as right-censoring', () => {
    // 19 completed calls at 10, 20, …, 190 ms and one censored call: nearest ranks ceil(q·20) = 10, 18, 19 and 20.
    const completed: Luna6CallTiming[] = Array.from({ length: 19 }, (_unused, index) =>
      ({ elapsedMs: 190 - index * 10, exit: 'completed', hangGuardFired: false }));
    const calls: Luna6CallTiming[] = [
      { elapsedMs: 1_800_000, exit: 'timed_out', hangGuardFired: true },
      ...completed,
    ];
    const done = (elapsedMs: number): Luna6CallTiming => ({ elapsedMs, exit: 'completed', hangGuardFired: false });
    expect({
      summary: luna6SpeedSummary(calls),
      ratio: luna6PairedTimeRatio([
        { high: [done(100)], xhigh: [done(150)] },
        { high: [done(100), done(100)], xhigh: [done(600)] },
        { high: [done(100)], xhigh: [{ elapsedMs: 1_800_000, exit: 'timed_out', hangGuardFired: true }] },
      ]),
    }).toEqual({
      summary: {
        calls: 20, completed: 19, censored: 1,
        otherFailures: { cancelled: 0, infrastructure_failed: 0, timed_out: 0, failed: 0, thrown: 0 },
        completionRate: 0.95, p50: 100, p90: 180, p95: 190, max: '>=1800000 (censored)', callsOver180s: 1,
      },
      ratio: { median: 2.25, pairs: 2, leftOut: 1 },
    });
  });

  it('refuses rows, packets or call logs that do not match the registered 480-cell grid', () => {
    const grid = registeredGrid();
    const dropped: Luna6CellIdentity = { mode: 'advice', stratum: 'brutal2', seed: 6_207_010, rep: 3, arm: XHIGH };
    const without = grid.filter((cell) => cellKey(cell) !== cellKey(dropped));
    expect({
      registered: luna6GridViolations(grid, LUNA6_EFFORT_STUDY),
      schedule: luna6GridViolations(buildLuna6Schedule(LUNA6_EFFORT_STUDY, 1).entries, LUNA6_EFFORT_STUDY),
      missingOne: without.length === 479 ? luna6GridViolations(without, LUNA6_EFFORT_STUDY) : 'not 479 cells',
      repeated: luna6GridViolations([...grid, grid[0]!], LUNA6_EFFORT_STUDY),
      unregistered: luna6GridViolations([...without, { ...dropped, seed: 6_207_011 }], LUNA6_EFFORT_STUDY),
    }).toEqual({
      registered: [],
      schedule: [],
      missingOne: ['the grid lacks cell advice brutal2 6207010 rep 3 gpt-6-luna-xhigh'],
      repeated: ['cell blind hard 5117001 rep 1 gpt-6-luna-high appears 2 times'],
      unregistered: [
        'unregistered cell advice brutal2 6207011 rep 3 gpt-6-luna-xhigh',
        'the grid lacks cell advice brutal2 6207010 rep 3 gpt-6-luna-xhigh',
      ],
    });
  });

  it('refuses packets, keys and seat files whose blind ids, seats, arms or pairs do not join', () => {
    const variant = (change: (documents: ReturnType<typeof miniDocuments>) => void) => {
      const documents = miniDocuments();
      change(documents);
      return outcome(() => analyzeLuna6Study({ registration: MINI, documents: asDocuments(documents), ledger: [] }).decision);
    };
    expect([
      variant((documents) => {
        documents['advice-hard'].seats['sol'] = documents['advice-hard'].seats['sol']!.map((entry) =>
          entry['blindId'] === 'blind-003' ? { ...entry, blindId: 'blind-099' } : entry);
      }),
      variant((documents) => { documents['advice-hard'].seats['sol'] = undefined; }),
      variant((documents) => { documents['blind-hard'].answerKey.push({ blindId: 'blind-002', arm: HIGH }); }),
      variant((documents) => {
        documents['blind-hard'].answerKey = documents['blind-hard'].answerKey.map((entry) =>
          entry['blindId'] === 'blind-002' ? { ...entry, arm: 'gpt-5.6-luna-high' } : entry);
      }),
      variant((documents) => {
        documents['blind-hard'].answerKey = documents['blind-hard'].answerKey.map((entry) =>
          entry['blindId'] === 'blind-002' ? { ...entry, arm: XHIGH } : entry);
      }),
      variant(() => undefined),
    ]).toEqual([
      { error: ['seat sol for advice-hard lacks blind-003 and has unregistered blind-099'] },
      { error: ['seat sol for advice-hard is missing'] },
      { error: ['answer key for blind-hard has duplicate blind-002'] },
      { error: ['answer key for blind-hard names unregistered arm gpt-5.6-luna-high'] },
      { error: ['blind-hard case-02-1 lacks arm gpt-6-luna-high'] },
      { ok: 'xhigh' },
    ]);
  });

  it('refuses a packet that names a model, an effort or an arm', () => {
    const packet = (reason: string, extra: Entry = {}) => ({
      version: 'ai-dm-rerun-packet-v1',
      judgingOrder: 'interleaved_blinded',
      entries: [{
        blindId: 'blind-001', caseId: 'case-01-1', outcome: 'authorized', attribution: 'model_authorized',
        executedPlan: [{
          actorId: 'monster:ogre', reason,
          actions: [{ kind: 'attack', actionId: 'greatclub', targetIds: ['pc:wizard'] }], movementFeet: 30,
        }],
        rubric: { targetPriority: null, actionEconomy: null, positioning: null, coherence: null, total: null },
        ...extra,
      }],
    });
    expect({
      clean: luna6PacketLeakViolations('blind-hard', packet('The ogre closes on the wizard.')),
      effortWord: luna6PacketLeakViolations('blind-hard', packet('The ogre was planned at xhigh.')),
      model: luna6PacketLeakViolations('advice-brutal2', packet('Planned by gpt-6-luna.')),
      arm: luna6PacketLeakViolations('blind-hard', packet('Arm gpt-6-luna-high.')),
      effortField: luna6PacketLeakViolations('blind-hard', packet('The ogre closes on the wizard.', { effort: 'high' })),
    }).toEqual({
      clean: [],
      effortWord: ['packet blind-hard contains forbidden token xhigh'],
      model: ['packet advice-brutal2 contains forbidden token gpt-6-luna'],
      arm: [
        'packet blind-hard contains forbidden token gpt-6-luna',
        'packet blind-hard contains forbidden token gpt-6-luna-high',
      ],
      effortField: ['packet blind-hard contains forbidden token "effort"'],
    });
  });

  it('ingests only registered cohort seeds, caps and routes and ties every call record to its cell', () => {
    const schedule = buildLuna6Schedule(MINI, MINI.scheduleSeed);
    const sha = 'f'.repeat(64);
    const high1 = `${HIGH}|blind|hard|5117001|1`;
    const firing = `${XHIGH}|advice|hard|5117002|1`;
    const ingest = (changed: Parameters<typeof miniEvidence>[1], reruns: 'none' | 'rerun-infrastructure' = 'none') =>
      normalise(outcome(() => {
        const cells = miniEvidence(schedule, changed);
        const pair = schedule.entries.find((entry) => cellKey(entry) === high1)!.pair;
        const rerunSection = reruns === 'none' ? null : buildLuna6Reruns(MINI, schedule, sha, [pair]);
        for (const entry of rerunSection?.entries ?? []) {
          cells.set(entry.ordinal, cellEvidence(entry, entry.arm === HIGH
            ? { row: { outcome: 'infrastructure_failed', callsPerRound: 0 }, calls: [] }
            : {}));
        }
        const result = ingestLuna6Study({ registration: MINI, schedule, scheduleSha256: sha, reruns: rerunSection, cells });
        return {
          pairs: result.report.pairs, excludedPairs: result.report.excludedPairs.length, sa1: result.report.sa1,
          calls: result.report.calls, ledger: result.ledger, rows: Object.values(result.normalized).map((rows) => rows.length),
        };
      }));
    const where = 'cell <n> (blind hard 5117001 rep 1 gpt-6-luna-high)';
    expect([
      ingest({}),
      ingest({ [high1]: { row: { seed: 5_117_011 } } }),
      ingest({ [high1]: { row: { turnContextMaximumBytes: 32_768 } } }),
      ingest({ [high1]: { row: { model: 'gpt-5.6-luna' } } }),
      ingest({ [high1]: { calls: [{ dispatch: { cellKey: '2:1' } }] } }),
      ingest({ [high1]: { calls: [{}, {}] } }),
      ingest({
        [firing]: {
          row: { outcome: 'refused' },
          calls: [{ complete: { exit: 'timed_out', hangGuardFired: true, elapsedMs: 1_800_000 } }],
        },
      }),
      ingest({ [high1]: { exitCode: 1 } }),
      ingest({ [high1]: { exitCode: 1 } }, 'rerun-infrastructure'),
      luna6RelabelViolations(
        { arm: 'single', model: 'gpt-6-luna' }, { arm: HIGH, model: 'gpt-6-luna-high' }, HIGH),
    ]).toEqual([
      { ok: { pairs: 4, excludedPairs: 0, sa1: 0, calls: 8, ledger: [], rows: [4, 4] } },
      { error: [
        `${where}: row seed 5117011 is not a registered cohort seed`,
        `${where}: row seed 5117011 is not the scheduled 5117001`,
      ] },
      { error: [`${where}: row turnContextMaximumBytes 32768 is not the registered blind cap 65536`] },
      { error: [`${where}: row model "gpt-5.6-luna" is not gpt-6-luna`] },
      { error: [`${where}: call 1 is logged in cell 2:1, not 1:1`] },
      { error: [`${where}: the call log completes 2 calls; the row has callsPerRound 1`] },
      { ok: {
        pairs: 4, excludedPairs: 0, sa1: 1, calls: 8, rows: [4, 4],
        ledger: [{
          mode: 'advice', basis: 'hard', seed: 5117002, rep: 1, arm: 'gpt-6-luna-xhigh', stratum: 'hard',
          ordinal: '<n>', calls: [{ ordinal: 1, callPhase: 'initial', elapsedMs: 1800000 }],
        }],
      } },
      { error: [
        'pair <p> (blind hard 5117001 rep 1): needs its rerun (cell <n> exit 1); run schedule --reruns after the scheduled cells',
      ] },
      { ok: { pairs: 3, excludedPairs: 1, sa1: 0, calls: 7, ledger: [], rows: [4, 4] } },
      ['the relabel changes model as well as arm'],
    ]);
  });

  it("schedules each pair's two arms adjacently in a seeded random order", () => {
    const first = buildLuna6Schedule(LUNA6_EFFORT_STUDY, 1);
    const again = buildLuna6Schedule(LUNA6_EFFORT_STUDY, 1);
    const entries = first.entries;
    const couples = Array.from({ length: entries.length / 2 }, (_unused, index) => [entries[2 * index]!, entries[2 * index + 1]!] as const);
    const expectedCells = new Set(registeredGrid().map(cellKey));
    // D898 R2's canonical order: basis (hard = 5117xxx then 5118xxx, before brutal = 6203xxx then 6207xxx), then
    // mode (blind before advice), then seed ascending, then rep ascending.
    const canonicalPairs = [['hard', 'hard2'], ['brutal', 'brutal2']].flatMap((basis) => MODES.flatMap((mode) =>
      STRATA.filter((stratum) => basis.includes(stratum.id))
        .flatMap((stratum) => stratum.seeds.map((seed) => ({ seed, stratum: stratum.id })))
        .sort((left, right) => left.seed - right.seed)
        .flatMap(({ seed, stratum }) => [1, 2, 3].map((rep) => pairKey({ mode, stratum, seed, rep })))));
    expect({
      entries: entries.length,
      pairs: new Set(entries.map(pairKey)).size,
      pairsAdjacent: couples.every(([one, two]) =>
        pairKey(one) === pairKey(two) && one.pair === two.pair && one.arm !== two.arm),
      bothOrders: couples.some(([one]) => one.arm === XHIGH) && couples.some(([one]) => one.arm === HIGH),
      eachCellOnce: entries.length === expectedCells.size && new Set(entries.map(cellKey)).size === expectedCells.size &&
        entries.every((entry) => expectedCells.has(cellKey(entry))),
      deterministic: canonicalJson(first) === canonicalJson(again),
      ordinalsInOrder: entries.every((entry, index) => entry.ordinal === index + 1),
      seedMatters: canonicalJson(buildLuna6Schedule(LUNA6_EFFORT_STUDY, 2).entries) !== canonicalJson(entries),
      pairOrderShuffled: canonicalPairs.length === 240 && couples.map(([one]) => pairKey(one)).join() !== canonicalPairs.join(),
    }).toEqual({
      entries: 480, pairs: 240, pairsAdjacent: true, bothOrders: true, eachCellOnce: true, deterministic: true,
      ordinalsInOrder: true, seedMatters: true, pairOrderShuffled: true,
    });
  });

  it('builds the exact arena argv for a scheduled cell', () => {
    const schedule = buildLuna6Schedule(LUNA6_EFFORT_STUDY, LUNA6_EFFORT_STUDY.scheduleSeed);
    const find = (key: string) => {
      const entry = schedule.entries.find((candidate) => cellKey(candidate) === key)!;
      const out = `/home/vagrant/dnd-slim-runs/luna6-effort/cells/${String(entry.ordinal).padStart(3, '0')}.jsonl`;
      return entry.argv.map((argument) => argument === out ? '/home/vagrant/dnd-slim-runs/luna6-effort/cells/<n>.jsonl' : argument);
    };
    const tail = [
      '--cli', 'codex', '--cli-bin', '/home/vagrant/.nvm/versions/node/v24.13.0/bin/codex',
    ];
    const shared = [
      '--instruction-source', 'kb', '--kb', 'tests/fixtures/ai-dm-kb/d569/ai-dm-core.md',
      '--transport', 'mcp_minimal', '--board-image', 'png',
    ];
    const policy = [
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'derived_v1',
      '--party-policy', 'symmetric_evaluator_v1', '--override-policy', 'typed_reason',
      '--reaction-ask-default', 'decline', '--intel-mode', 'full',
    ];
    expect({
      env: schedule.env,
      advice: find(`${XHIGH}|advice|brutal|6203004|2`),
      blindSecondFamily: find(`${HIGH}|blind|brutal2|6207010|3`),
    }).toEqual({
      env: { CODEX_HOME: '/home/vagrant/.codex-aidm', BOARD_SNAPSHOT_PREVIEW_PORT: '4530' },
      advice: [
        'node', 'node_modules/vite-node/vite-node.mjs', 'tools/ai-dm-arena.ts', '--',
        '--rooms', '10', '--reps', '3', '--seed', '6203001', '--basis', 'brutal', '--cells', '4:2',
        '--out', '/home/vagrant/dnd-slim-runs/luna6-effort/cells/<n>.jsonl',
        '--dm-mode', 'advice',
        ...tail, '--model', 'gpt-6-luna', '--effort', 'xhigh', ...shared, '--turn-context-max-bytes', '32768', ...policy,
      ],
      blindSecondFamily: [
        'node', 'node_modules/vite-node/vite-node.mjs', 'tools/ai-dm-arena.ts', '--',
        '--rooms', '10', '--reps', '3', '--seed', '6207001', '--basis', 'brutal',
        '--basis-dir', 'tests/fixtures/arena-basis-brutal-2', '--cells', '10:3',
        '--out', '/home/vagrant/dnd-slim-runs/luna6-effort/cells/<n>.jsonl',
        '--dm-mode', 'blind', '--blind-repair-arm', 'code_only', '--blind-max-attempts', '3', '--blind-facts', 'off',
        ...tail, '--model', 'gpt-6-luna', '--effort', 'high', ...shared, '--turn-context-max-bytes', '65536', ...policy,
      ],
    });
  });

  it('writes each operator output once and keeps the PASS and FAIL line contract', () => {
    const root = mkdtempSync(join(tmpdir(), 'luna6-effort-study-'));
    try {
      const lines: string[] = [];
      const run = (argv: readonly string[]) => {
        const code = runLuna6EffortStudyCli(argv, { line: (text) => { lines.push(text); } });
        return { code, lines: lines.splice(0).map((line) => line.replace(root, '<root>').replace(/sha256=[0-9a-f]{64}/u, 'sha256=<sha>')) };
      };
      const schedule = ['schedule', '--root', root, '--codex-bin', '/home/vagrant/.nvm/versions/node/v24.13.0/bin/codex'];
      const first = run([...schedule, '--seed', '1077733051']);
      const written = JSON.parse(readFileSync(join(root, 'schedule.json'), 'utf8')) as Luna6Schedule;
      expect({
        wrongSeed: run([...schedule, '--seed', '1']),
        first,
        again: run([...schedule, '--seed', '1077733051']),
        entries: written.entries.length,
        ingestWithoutCells: run(['ingest', '--root', root]).lines.slice(0, 1),
        unknown: run(['report', '--root', root]),
      }).toEqual({
        wrongSeed: { code: 1, lines: ['LUNA6 SCHEDULE FAIL arguments: --seed 1 is not the registered schedule seed 1077733051'] },
        first: { code: 0, lines: ['LUNA6 SCHEDULE PASS entries=480 pairs=240 seed=1077733051 sha256=<sha>'] },
        again: { code: 1, lines: ['LUNA6 SCHEDULE FAIL output: <root>/schedule.json exists; a stage never overwrites evidence'] },
        entries: 480,
        ingestWithoutCells: [expect.stringMatching(/^LUNA6 INGEST FAIL cell \d{3} \(.+\): has no exit file; the cell has not run$/u)],
        unknown: { code: 1, lines: ['LUNA6 USAGE FAIL usage: tools/luna6-effort-study.ts <schedule|ingest|packets|analyze> --root <dir>; got report'] },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('decides at the exact margin and at the exact rejection limit', () => {
    // D898 R6. A draw exceeds δ = 1/5 iff 5·S > 3·m: S = 3, m = 5 is exactly 1/5 and does not exceed it. H0 is rejected
    // iff at most floor(q*·n) draws do not exceed δ: 2,500 of 100,000 rejects, 2,501 does not.
    // atMargin: every cluster keeps five pairs (advice rep 3 is excluded) with t = 1, 1, 1, 0, 0, so every draw has
    //   S = 120, m = 200 and 5·120 = 3·200: all 2,000 draws count against xhigh -> high.
    // atLimit: n = 39 gives floor(0.025·39) = 0; every pair t = +2 exceeds, so 0 draws are at or below; 0 ≤ 0 -> xhigh.
    // onePastLimit: n = 1 and the single draw sits at the margin: 1 draw at or below against a limit of 0 -> high.
    const atMarginPairs = registeredPairs((_seed, pair) => pair < 3 ? 1 : 0)
      .filter((pair) => !(pair.mode === 'advice' && pair.rep === 3));
    const decide = (pairs: readonly Luna6PairDifference[], resamples: number) => {
      const result = luna6Decision(pairs, { ...LUNA6_EFFORT_STUDY, resamples });
      return {
        decision: result.decision, mean: result.delta.mean, lower: result.delta.lowerQstar, pairs: result.pairs,
        drawsAtOrBelowMargin: result.drawsAtOrBelowMargin, rejectLimit: result.rejectLimit,
      };
    };
    expect({
      exceeds: {
        below: luna6DrawExceedsMargin({ sum: 2, count: 5 }, LUNA6_EFFORT_STUDY),
        at: luna6DrawExceedsMargin({ sum: 3, count: 5 }, LUNA6_EFFORT_STUDY),
        above: luna6DrawExceedsMargin({ sum: 4, count: 5 }, LUNA6_EFFORT_STUDY),
      },
      limit: {
        registered: luna6RejectLimit(LUNA6_EFFORT_STUDY),
        atLimit: luna6RejectsH0(2_500, LUNA6_EFFORT_STUDY),
        onePast: luna6RejectsH0(2_501, LUNA6_EFFORT_STUDY),
      },
      atMargin: decide(atMarginPairs, 2_000),
      atLimit: decide(registeredPairs(() => 2), 39),
      onePastLimit: decide(atMarginPairs, 1),
    }).toEqual({
      exceeds: { below: false, at: false, above: true },
      limit: { registered: 2500, atLimit: true, onePast: false },
      atMargin: { decision: 'high', mean: 0.2, lower: 0.2, pairs: 200, drawsAtOrBelowMargin: 2000, rejectLimit: 50 },
      atLimit: { decision: 'xhigh', mean: 2 / 3, lower: 2 / 3, pairs: 240, drawsAtOrBelowMargin: 0, rejectLimit: 0 },
      onePastLimit: { decision: 'high', mean: 0.2, lower: 0.2, pairs: 200, drawsAtOrBelowMargin: 1, rejectLimit: 0 },
    });
  });

  it("builds every tag's packet with the frozen builder at its registered shuffle seed and protocol", () => {
    // D898 R3, typed from the registration text: each tag's shuffle seed, and the protocols hard R1_10_PROTOCOL,
    // brutal { ...BRUTAL_10_PROTOCOL, reps: 3 }, hard2 and brutal2 by their seed lists with reps 3. The heads (first six
    // entries as caseId and arm) come from the independent oracle's re-implementation of the frozen builder's order.
    const seeds: Readonly<Record<Luna6Tag, number>> = {
      'blind-hard': 2353643760, 'blind-brutal': 3013067085, 'advice-hard': 3827398149, 'advice-brutal': 1901141339,
      'blind-hard2': 932728174, 'blind-brutal2': 3206187783, 'advice-hard2': 1066981191, 'advice-brutal2': 3194685170,
    };
    const protocols: Readonly<Record<Luna6StratumId, RerunProtocol>> = {
      hard: R1_10_PROTOCOL,
      brutal: { ...BRUTAL_10_PROTOCOL, reps: 3 },
      hard2: { seeds: seedRun(5_118_001), reps: 3 },
      brutal2: { seeds: seedRun(6_207_001), reps: 3 },
    };
    const rows = packetRows();
    const built = buildLuna6Packets(LUNA6_EFFORT_STUDY, rows, LUNA6_EFFORT_STUDY.packetShuffleSeeds);
    const project = (tag: Luna6Tag) => {
      const packet = built.packets[tag];
      if (packet === undefined) return 'missing';
      const armOf = new Map(packet.answerKey.entries.map((entry) => [entry.blindId, entry.arm]));
      const direct = buildRerunPacket(rows[tag], seeds[tag], protocols[tag.slice(tag.indexOf('-') + 1) as Luna6StratumId]);
      return {
        entries: packet.packet.entries.length,
        arms: ARMS.map((arm) => packet.answerKey.entries.filter((entry) => entry.arm === arm).length),
        head: packet.packet.entries.slice(0, 6).map((entry) => [entry.caseId, armOf.get(entry.blindId)]),
        frozenBuilder: canonicalJson(packet) === canonicalJson(direct),
      };
    };
    const packetOf = (head: readonly (readonly [string, Luna6ArmId])[]) =>
      ({ entries: 60, arms: [30, 30], head, frozenBuilder: true });
    const H = HIGH;
    const X = XHIGH;
    expect({
      protocols: Object.fromEntries(LUNA6_EFFORT_STUDY.strata.map((stratum) =>
        [stratum.id, outcome(() => luna6PacketProtocol(stratum))])),
      violations: built.violations,
      tags: Object.fromEntries((Object.keys(seeds) as Luna6Tag[]).map((name) => [name, project(name)])),
    }).toEqual({
      protocols: {
        hard: { ok: { name: 'r1-10', seeds: seedRun(5_117_001), reps: 3 } },
        brutal: { ok: { name: 'brutal-10', seeds: seedRun(6_203_001), reps: 3 } },
        hard2: { ok: { seeds: seedRun(5_118_001), reps: 3 } },
        brutal2: { ok: { seeds: seedRun(6_207_001), reps: 3 } },
      },
      violations: [],
      tags: {
        'blind-hard': packetOf([['case-06-1', H], ['case-08-1', H], ['case-06-1', X], ['case-06-2', H], ['case-10-2', H], ['case-02-2', H]]),
        'blind-brutal': packetOf([['case-09-1', H], ['case-06-3', X], ['case-02-2', H], ['case-10-2', H], ['case-01-1', X], ['case-09-1', X]]),
        'advice-hard': packetOf([['case-09-2', X], ['case-06-3', H], ['case-03-2', H], ['case-04-2', X], ['case-09-2', H], ['case-10-2', X]]),
        'advice-brutal': packetOf([['case-08-3', X], ['case-10-2', X], ['case-05-3', X], ['case-06-2', H], ['case-02-2', H], ['case-08-1', X]]),
        'blind-hard2': packetOf([['case-04-3', X], ['case-09-2', H], ['case-01-2', X], ['case-09-3', X], ['case-05-2', X], ['case-04-3', H]]),
        'blind-brutal2': packetOf([['case-05-3', X], ['case-06-1', H], ['case-06-3', X], ['case-09-3', H], ['case-10-3', H], ['case-05-1', H]]),
        'advice-hard2': packetOf([['case-05-2', H], ['case-08-2', X], ['case-04-3', X], ['case-07-1', H], ['case-09-3', X], ['case-04-2', H]]),
        'advice-brutal2': packetOf([['case-01-1', X], ['case-03-2', H], ['case-05-3', X], ['case-02-1', X], ['case-07-1', H], ['case-08-3', X]]),
      },
    });
  });

  it('follows the registered schedule sequence and numbers reruns from 481 in their original arm order', () => {
    // The first 12 ordinals at the registered seed P, and the rerun section for pairs 6 and 1 (asked for out of order),
    // from the independent oracle (.tmp/runs/luna6/b6/fix1/oracle/oracle.out). Pair 6 runs xhigh first. Rerun rows add
    // the replaced ordinal and the cell's --out path.
    const schedule = buildLuna6Schedule(LUNA6_EFFORT_STUDY, LUNA6_EFFORT_STUDY.scheduleSeed);
    const reruns = buildLuna6Reruns(LUNA6_EFFORT_STUDY, schedule, 'f'.repeat(64), [6, 1]);
    const cells = '/home/vagrant/dnd-slim-runs/luna6-effort/cells';
    expect({
      head: schedule.entries.slice(0, 12).map(scheduleRow),
      reruns: reruns.entries.map((entry) =>
        [...scheduleRow(entry), entry.rerunOf, entry.argv[entry.argv.indexOf('--out') + 1]]),
    }).toEqual({
      head: [
        [1, 1, 'blind', 'brutal', 6203010, 2, HIGH],
        [2, 1, 'blind', 'brutal', 6203010, 2, XHIGH],
        [3, 2, 'advice', 'hard', 5117008, 2, HIGH],
        [4, 2, 'advice', 'hard', 5117008, 2, XHIGH],
        [5, 3, 'blind', 'hard', 5117010, 3, HIGH],
        [6, 3, 'blind', 'hard', 5117010, 3, XHIGH],
        [7, 4, 'blind', 'hard', 5117008, 1, HIGH],
        [8, 4, 'blind', 'hard', 5117008, 1, XHIGH],
        [9, 5, 'advice', 'brutal2', 6207010, 1, HIGH],
        [10, 5, 'advice', 'brutal2', 6207010, 1, XHIGH],
        [11, 6, 'advice', 'hard2', 5118010, 1, XHIGH],
        [12, 6, 'advice', 'hard2', 5118010, 1, HIGH],
      ],
      reruns: [
        [481, 1, 'blind', 'brutal', 6203010, 2, HIGH, 1, `${cells}/481.jsonl`],
        [482, 1, 'blind', 'brutal', 6203010, 2, XHIGH, 2, `${cells}/482.jsonl`],
        [483, 6, 'advice', 'hard2', 5118010, 1, XHIGH, 11, `${cells}/483.jsonl`],
        [484, 6, 'advice', 'hard2', 5118010, 1, HIGH, 12, `${cells}/484.jsonl`],
      ],
    });
  });

  it('stops only when more than 24 pairs end excluded and never reruns a hang-guard cell', () => {
    // D898 R2: STOP when MORE than 24 pairs end excluded. On D898's hard stratum alone (60 pairs), pairs 1-24 failing
    // on infrastructure in both attempts pass with 36 pairs; pairs 1-25 are a STOP. SA-1: a cell whose call log fired
    // the hang guard is never infrastructure, even when the runner recorded infrastructure_failed, so its pair is
    // neither rerun nor excluded.
    const sha = 'f'.repeat(64);
    const infrastructure = { row: { outcome: 'infrastructure_failed', callsPerRound: 0 }, calls: [] };
    const excluded = (count: number) => normalise(outcome(() => {
      const schedule = buildLuna6Schedule(HARD60, HARD60.scheduleSeed);
      const failing = Array.from({ length: count }, (_unused, index) => index + 1);
      const fails = (entry: Luna6ScheduleEntry) => failing.includes(entry.pair) && entry.arm === HIGH;
      const cells = new Map(schedule.entries.map((entry) =>
        [entry.ordinal, cellEvidence(entry, fails(entry) ? infrastructure : {})]));
      const reruns = buildLuna6Reruns(HARD60, schedule, sha, failing);
      for (const entry of reruns.entries) cells.set(entry.ordinal, cellEvidence(entry, fails(entry) ? infrastructure : {}));
      const result = ingestLuna6Study({ registration: HARD60, schedule, scheduleSha256: sha, reruns, cells });
      return { pairs: result.report.pairs, excludedPairs: result.report.excludedPairs.length };
    }));
    const guardedInfrastructure = normalise(outcome(() => {
      const schedule = buildLuna6Schedule(MINI, MINI.scheduleSeed);
      const cells = miniEvidence(schedule, {
        [`${XHIGH}|blind|hard|5117001|1`]: {
          row: { outcome: 'infrastructure_failed' },
          calls: [{ complete: { exit: 'timed_out', hangGuardFired: true, elapsedMs: 1_800_000 } }],
        },
      });
      const result = ingestLuna6Study({ registration: MINI, schedule, scheduleSha256: sha, reruns: null, cells });
      return {
        pairs: result.report.pairs, excludedPairs: result.report.excludedPairs.length, sa1: result.report.sa1,
        fired: result.report.attempts.filter((attempt) => attempt.firings > 0).map((attempt) => [attempt.status, attempt.detail]),
      };
    }));
    expect({ twentyFour: excluded(24), twentyFive: excluded(25), guardedInfrastructure }).toEqual({
      twentyFour: { ok: { pairs: 36, excludedPairs: 24 } },
      twentyFive: { error: ['infrastructure: STOP: 25 pairs end excluded, more than the registered 24; go to the owner'] },
      guardedInfrastructure: { ok: { pairs: 4, excludedPairs: 0, sa1: 1, fired: [['row', 'infrastructure_failed']] } },
    });
  });

  it('counts an SA-1 override as a failure and never excludes it, whatever outcome the runner recorded', () => {
    // Mini registration; the ledger names blind 5117001 rep 1 xhigh (blind-001). Failure indicators (§3.4): that cell 1,
    // every other cell 0, so the pair differences are 1, 0, 0, 0 with divisor 1: mean 1/4. Clusters {1, 0} and {0, 0}:
    // a draw is 1/2, 1/4 or 0 with probability 1/4, 1/2, 1/4, so the 95 % interval is {0, 1/2}. The same holds when
    // the packet records that cell as infrastructure_failed. Without the ledger, that infrastructure cell excludes its
    // pair, and the three remaining pairs are all +2 -> xhigh.
    const ledger: readonly Luna6GuardLedgerKey[] = [{ mode: 'blind', basis: 'hard', seed: 5_117_001, rep: 1, arm: XHIGH }];
    const infrastructure = () => {
      const documents = miniDocuments();
      documents['blind-hard'].packet = documents['blind-hard'].packet.map((entry) =>
        entry['blindId'] === 'blind-001' ? { ...entry, outcome: 'infrastructure_failed' } : entry);
      return documents;
    };
    const run = (documents: ReturnType<typeof miniDocuments>, withLedger: boolean) => {
      const result = analyzeLuna6Study({ registration: MINI, documents: asDocuments(documents), ledger: withLedger ? ledger : [] });
      return {
        decision: result.decision, pairs: result.pairs, excludedPairs: result.excludedPairs,
        sa1Overrides: result.sa1Overrides, failureRisk: result.secondary.failureRisk,
      };
    };
    const risk = { pairs: 4, clusters: 2, mean: 0.25, lower: 0, upper: 0.5 };
    expect({
      executedOverride: run(miniDocuments(), true),
      infrastructureOverride: run(infrastructure(), true),
      infrastructureAlone: run(infrastructure(), false),
    }).toEqual({
      executedOverride: { decision: 'high', pairs: 4, excludedPairs: 0, sa1Overrides: 1, failureRisk: risk },
      infrastructureOverride: { decision: 'high', pairs: 4, excludedPairs: 0, sa1Overrides: 1, failureRisk: risk },
      infrastructureAlone: {
        decision: 'xhigh', pairs: 3, excludedPairs: 1, sa1Overrides: 0,
        failureRisk: { pairs: 3, clusters: 2, mean: 0, lower: 0, upper: 0 },
      },
    });
  });

  it('keeps the inclusive bounds: the percentile index, the old wall at exactly 180000 ms and a zero component score', () => {
    // Percentile (D898 R6, D569's rule): index floor(q·n) over 50 ascending draws 0..49 gives floor(1.25) = 1 and
    // floor(48.75) = 48 (ceil would give 2 and 49); q = 1 clamps to n − 1 = 49. The old wall accepts a completion only
    // while at least 1 ms remains (agent-session-lifecycle.ts:81), so 179,999 ms is under it and 180,000 and 180,001 ms
    // are over it. Component ranges include 0: high entries {2, 2, 1, 0} (total 5, N = 15) against xhigh {3, 3, 1, 1}
    // (N = 24) make every pair t = 9, value 3 -> xhigh with mean, lower and upper 3.
    const draws = Array.from({ length: 50 }, (_unused, sum) => ({ sum, count: 1 }));
    const done = (elapsedMs: number): Luna6CallTiming => ({ elapsedMs, exit: 'completed', hangGuardFired: false });
    expect({
      percentile: {
        lower: luna6ExactPercentile(draws, 0.025, 1),
        upper: luna6ExactPercentile(draws, 0.975, 1),
        top: luna6ExactPercentile(draws, 1, 1),
      },
      callsOver180s: luna6SpeedSummary([done(179_999), done(180_000), done(180_001)]).callsOver180s,
      zeroComponent: outcome(() => projectDecision([], miniDocuments(
        { targetPriority: 2, actionEconomy: 2, coherence: 1, positioning: 0, total: 5 }))),
    }).toEqual({
      percentile: { lower: 1, upper: 48, top: 49 },
      callsOver180s: 2,
      zeroComponent: {
        ok: { decision: 'xhigh', delta: { mean: 3, lower: 3, upper: 3 }, pairs: 4, clusters: 2, sa1Overrides: 0 },
      },
    });
  });

  it('reports the difference per mode and per basis with intervals, and per stratum only as a supplement', () => {
    // S-PREREG §3.4: "Δ per mode and per basis with intervals"; D898 R2: basis hard pools 5117xxx and 5118xxx, basis
    // brutal pools 6203xxx and 6207xxx. High cells score {2,2,1,1} (N = 18) everywhere.
    // byBasis: xhigh {3,2,1,1} (N = 21, t = +3, value +1) on basis hard, else N = 18 (t = 0). Basis hard is 20 clusters
    //   of six +1 pairs, so every draw is 1: {120 pairs, 20 clusters, 1, 1, 1}; brutal {120, 20, 0, 0, 0}. Each mode
    //   holds 20 clusters of three +1 pairs and 20 of three 0 pairs: 120 pairs, 40 clusters, mean 1/2 (its interval
    //   depends on the draws and is not asserted).
    // byMode: t = +3 on blind cells only. Blind {120, 40, 1, 1, 1}, advice {120, 40, 0, 0, 0}; every basis cluster holds
    //   three +1 and three 0 pairs, so every draw is 1/2: {120, 20, 1/2, 1/2, 1/2} for both bases.
    const rule: Luna6EffortStudyRegistration = { ...LUNA6_EFFORT_STUDY, resamples: 200 };
    const run = (gains: (cell: Luna6CellIdentity) => boolean) => analyzeLuna6Study({
      registration: rule,
      ledger: [],
      documents: gridDocuments((cell) =>
        cell.arm === XHIGH && gains(cell) ? components(3, 2, 1, 1) : components(2, 2, 1, 1)),
    });
    const byBasis = run((cell) => cell.stratum === 'hard' || cell.stratum === 'hard2');
    const byMode = run((cell) => cell.mode === 'blind');
    const flat = (pairs: number, clusters: number, value: number) =>
      ({ pairs, clusters, mean: value, lower: value, upper: value });
    expect({
      byBasis: {
        perBasis: byBasis.secondary.perBasis,
        perMode: Object.fromEntries(Object.entries(byBasis.secondary.perMode).map(([mode, interval]) =>
          [mode, { pairs: interval.pairs, clusters: interval.clusters, mean: interval.mean }])),
      },
      byMode: { perMode: byMode.secondary.perMode, perBasis: byMode.secondary.perBasis },
      supplementary: { strata: Object.keys(byMode.supplementary.perStratum), status: byMode.supplementary.status },
    }).toEqual({
      byBasis: {
        perBasis: { hard: flat(120, 20, 1), brutal: flat(120, 20, 0) },
        perMode: { blind: { pairs: 120, clusters: 40, mean: 0.5 }, advice: { pairs: 120, clusters: 40, mean: 0.5 } },
      },
      byMode: {
        perMode: { blind: flat(120, 40, 1), advice: flat(120, 40, 0) },
        perBasis: { hard: flat(120, 20, 0.5), brutal: flat(120, 20, 0.5) },
      },
      supplementary: {
        strata: ['hard', 'brutal', 'hard2', 'brutal2'],
        status: 'supplementary, not preregistered: S-PREREG §3.4 reports the difference per mode and per basis',
      },
    });
  });

  it('refuses a guard ledger or ingest report that does not match the registration or each other', () => {
    // The valid documents are what ingest writes for the mini registration with the hang guard fired on blind 5117001
    // rep 1 xhigh; the analysis is then item 7's case B (high, 4 pairs, 1 SA-1 override). Each variant changes one
    // thing, and the analysis stage refuses it by name.
    const schedule = buildLuna6Schedule(MINI, MINI.scheduleSeed);
    const ingest = ingestLuna6Study({
      registration: MINI, schedule, scheduleSha256: 'f'.repeat(64), reruns: null,
      cells: miniEvidence(schedule, {
        [`${XHIGH}|blind|hard|5117001|1`]: {
          calls: [{ complete: { exit: 'timed_out', hangGuardFired: true, elapsedMs: 1_800_000 } }],
        },
      }),
    });
    type Json = Record<string, unknown>;
    const ledger = (): Json => JSON.parse(canonicalJson(luna6GuardLedgerDocument(MINI, ingest.ledger))) as Json;
    const report = (): Json => JSON.parse(canonicalJson(ingest.report)) as Json;
    const stage = (ledgerDocument: Json, reportDocument: Json) => outcome(() => {
      const result = analyzeLuna6StudyStage({
        registration: MINI, documents: asDocuments(miniDocuments()), ledgerDocument, reportDocument,
      });
      return {
        decision: result.decision, pairs: result.pairs, excludedPairs: result.excludedPairs,
        sa1Overrides: result.sa1Overrides,
      };
    });
    const moved = ledger();
    moved['entries'] = (moved['entries'] as Json[]).map((entry) => ({ ...entry, mode: 'advice', seed: 5_117_002 }));
    const lessSpeed = report();
    lessSpeed['speed'] = (lessSpeed['speed'] as Json[]).filter((cell) =>
      !(cell['mode'] === 'advice' && cell['seed'] === 5_117_002 && cell['arm'] === HIGH));
    const fired = 'blind hard 5117001 rep 1 gpt-6-luna-xhigh';
    expect([
      stage(ledger(), report()),
      stage({ ...ledger(), registration: 'luna6-effort-study-v0' }, report()),
      stage({ ...ledger(), entries: [] }, report()),
      stage(moved, report()),
      stage(ledger(), lessSpeed),
      stage(ledger(), { ...report(), registration: 'luna6-effort-study-v0' }),
      stage(ledger(), {
        ...report(), pairs: 3,
        excludedPairs: [{ pair: 2, name: 'advice hard 5117002 rep 1', reason: 'cell 3 infrastructure_failed' }],
      }),
    ]).toEqual([
      { ok: { decision: 'high', pairs: 4, excludedPairs: 0, sa1Overrides: 1 } },
      { error: ['guard ledger: registration "luna6-effort-study-v0" is not luna6-effort-study-v1'] },
      { error: [
        'guard ledger: holds 0 entries; the ingest report counts sa1 1',
        `guard ledger: lacks ${fired}, whose call log fired the hang guard`,
      ] },
      { error: [
        `guard ledger: lacks ${fired}, whose call log fired the hang guard`,
        'guard ledger: names advice hard 5117002 rep 1 gpt-6-luna-xhigh, whose call log never fired the hang guard',
      ] },
      { error: [
        'ingest report: speed: the grid lacks cell advice hard 5117002 rep 1 gpt-6-luna-high',
        'ingest report: calls 8 is not the 7 calls of its speed cells',
      ] },
      { error: ['ingest report: registration "luna6-effort-study-v0" is not luna6-effort-study-v1'] },
      { error: ['ingest report: excludes 1 of its pairs; the packets exclude 0'] },
    ]);
  });
});
