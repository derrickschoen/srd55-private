/**
 * The registration of `luna6-effort-study-v1`, typed from its preregistration S-PREREG (D898, 2026-09-26) and never
 * from code output. D898 R1-R11 supersede every conflicting literal of plan r5 §3 (option (b): 40 encounters,
 * 480 cells). Nothing here is edited after a cell runs; a change is a new, dated amendment D-entry first.
 *
 * This module imports no runner, so the study operator can be loaded without loading one.
 */
import type { LUNA_HANG_GUARD_MS, LUNA_MODEL } from '../model-routes';

export const LUNA6_MODES = ['blind', 'advice'] as const;
export type Luna6Mode = (typeof LUNA6_MODES)[number];

export const LUNA6_STRATUM_IDS = ['hard', 'brutal', 'hard2', 'brutal2'] as const;
export type Luna6StratumId = (typeof LUNA6_STRATUM_IDS)[number];
/**
 * The arena's `--basis`, in D898 R2's order (hard before brutal). The second family runs on the same two bases from
 * its own fixture directories, so a basis pools two strata: hard is 5117xxx and 5118xxx, brutal 6203xxx and 6207xxx.
 */
export const LUNA6_BASES = ['hard', 'brutal'] as const;
export type Luna6Basis = (typeof LUNA6_BASES)[number];
/** One packet per mode and stratum: `blind-hard` … `advice-brutal2` (D898 R3). */
export type Luna6Tag = `${Luna6Mode}-${Luna6StratumId}`;

export type Luna6ArmId = 'gpt-6-luna-high' | 'gpt-6-luna-xhigh';
export type Luna6StudyEffort = 'high' | 'xhigh';
export interface Luna6Arm {
  readonly id: Luna6ArmId;
  readonly model: typeof LUNA_MODEL;
  readonly effort: Luna6StudyEffort;
}

export type Luna6Seat = 'fable' | 'astra' | 'sol';

export interface Luna6ManifestPin {
  readonly path: string;
  readonly sha256: string;
  readonly version: string;
}

export interface Luna6Stratum {
  readonly id: Luna6StratumId;
  readonly basis: Luna6Basis;
  /** The arena's `--basis-dir`; null runs the arena's own `tests/fixtures/arena-basis-<basis>` fixtures (§3.1). */
  readonly basisDir: string | null;
  readonly fixturesDir: string;
  /** Encounter seeds in ascending order; room n of the arena invocation is `seeds[n - 1]`. */
  readonly seeds: readonly number[];
  readonly reps: number;
  readonly manifest: Luna6ManifestPin;
}

/** A margin as an exact fraction, so the decision needs no floating point (D898 R6). */
export interface Luna6Rational {
  readonly numerator: number;
  readonly denominator: number;
}

export interface Luna6Caps {
  readonly blindBaseBytes: number;
  readonly semanticBytes: number;
  readonly adviceBaseBytes: number;
}

export interface Luna6Amendments {
  readonly sa1: string;
  readonly sa2: string;
  readonly sa2b: string;
}

export interface Luna6EffortStudyRegistration {
  readonly id: 'luna6-effort-study-v1';
  readonly preregistration: 'D898';
  readonly arms: readonly [Luna6Arm, Luna6Arm];
  readonly modes: readonly Luna6Mode[];
  readonly strata: readonly Luna6Stratum[];
  /** Registered counts, restated so every stage can check its grid against them (D898 R1). */
  readonly cells: number;
  readonly pairs: number;
  readonly clusters: number;
  readonly caps: Luna6Caps;
  /** δ = 0.20. A draw exceeds it iff 5·S > 3·m (D898 R6). */
  readonly margin: Luna6Rational;
  readonly qStar: number;
  readonly resamples: number;
  readonly bootstrapSeed: number;
  readonly scheduleSeed: number;
  readonly packetShuffleSeeds: Readonly<Record<Luna6Tag, number>>;
  readonly hangGuardMs: typeof LUNA_HANG_GUARD_MS;
  readonly seats: readonly Luna6Seat[];
  /** STOP (to the owner) when more than this many pairs end excluded (D898 R2). */
  readonly maxExcludedPairs: number;
  readonly codexBin: string;
  readonly kb: string;
  readonly studyRoot: string;
  readonly cellEnv: Readonly<Record<'CODEX_HOME' | 'BOARD_SNAPSHOT_PREVIEW_PORT', string>>;
  /** The preregistered amendment texts, verbatim JSON (D898). */
  readonly amendments: Luna6Amendments;
}

const V5_MANIFEST: Luna6ManifestPin = {
  path: 'tests/fixtures/d569-blind-experiment-manifest.json',
  sha256: '8c0bcb3c0afa8358c26129efbef82d0d2882135389d8dd8040fe7e4b6451e13a',
  version: 'd569-blind-experiment-v5',
};
const SECOND_FAMILY_MANIFEST: Luna6ManifestPin = {
  path: 'tests/fixtures/d569-second-family-manifest.json',
  sha256: '83daa7ea3ca89b270e5149368d09fa97074124dfe438cf95b346e996996026c8',
  version: 'd569-second-family-manifest-v1',
};

export const LUNA6_EFFORT_STUDY: Luna6EffortStudyRegistration = {
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
      seeds: [5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005, 5_117_006, 5_117_007, 5_117_008, 5_117_009, 5_117_010],
      reps: 3, manifest: V5_MANIFEST,
    },
    {
      id: 'brutal', basis: 'brutal', basisDir: null, fixturesDir: 'tests/fixtures/arena-basis-brutal',
      seeds: [6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005, 6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010],
      reps: 3, manifest: V5_MANIFEST,
    },
    {
      id: 'hard2', basis: 'hard', basisDir: 'tests/fixtures/arena-basis-hard-2', fixturesDir: 'tests/fixtures/arena-basis-hard-2',
      seeds: [5_118_001, 5_118_002, 5_118_003, 5_118_004, 5_118_005, 5_118_006, 5_118_007, 5_118_008, 5_118_009, 5_118_010],
      reps: 3, manifest: SECOND_FAMILY_MANIFEST,
    },
    {
      id: 'brutal2', basis: 'brutal', basisDir: 'tests/fixtures/arena-basis-brutal-2', fixturesDir: 'tests/fixtures/arena-basis-brutal-2',
      seeds: [6_207_001, 6_207_002, 6_207_003, 6_207_004, 6_207_005, 6_207_006, 6_207_007, 6_207_008, 6_207_009, 6_207_010],
      reps: 3, manifest: SECOND_FAMILY_MANIFEST,
    },
  ],
  cells: 480,
  pairs: 240,
  clusters: 40,
  caps: { blindBaseBytes: 65_536, semanticBytes: 8_192, adviceBaseBytes: 32_768 },
  margin: { numerator: 1, denominator: 5 },
  qStar: 0.025,
  resamples: 100_000,
  bootstrapSeed: 20_260_924,
  scheduleSeed: 1_077_733_051,
  packetShuffleSeeds: {
    'blind-hard': 2_353_643_760,
    'blind-brutal': 3_013_067_085,
    'advice-hard': 3_827_398_149,
    'advice-brutal': 1_901_141_339,
    'blind-hard2': 932_728_174,
    'blind-brutal2': 3_206_187_783,
    'advice-hard2': 1_066_981_191,
    'advice-brutal2': 3_194_685_170,
  },
  hangGuardMs: 1_800_000,
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
};

/** Every tag of a registration, modes outer and strata inner: blind-hard, blind-brutal, … advice-brutal2. */
export function luna6Tags(registration: Pick<Luna6EffortStudyRegistration, 'modes' | 'strata'>): readonly Luna6Tag[] {
  return registration.modes.flatMap((mode) => registration.strata.map((stratum): Luna6Tag => `${mode}-${stratum.id}`));
}

export function luna6Arm(
  registration: Pick<Luna6EffortStudyRegistration, 'arms'>,
  effort: Luna6StudyEffort,
): Luna6Arm {
  const arm = registration.arms.find((candidate) => candidate.effort === effort);
  if (arm === undefined) throw new TypeError(`The registration has no ${effort} arm.`);
  return arm;
}

/** The registered base cap of a mode's turn context (the arena's `--turn-context-max-bytes`). */
export function luna6ModeCap(caps: Luna6Caps, mode: Luna6Mode): number {
  switch (mode) {
    case 'blind': return caps.blindBaseBytes;
    case 'advice': return caps.adviceBaseBytes;
  }
}
