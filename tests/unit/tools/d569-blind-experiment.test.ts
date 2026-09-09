import { describe, expect, it } from 'vitest';
import { sha256 } from '../../../src/crypto/sha256';
import {
  D569_BOOTSTRAP_RESAMPLES,
  D569_ANALYSIS_COMPARISONS,
  D569_CORE_ARM_IDENTITIES,
  D569_EXPERIMENT_MANIFEST_PATH,
  D569_HINT_ARM_IDENTITIES,
  D569_JUDGE_PANEL_IDENTITIES,
  D569_PREREGISTRATION_AMENDMENTS,
  D569_REFUSAL_RISK_MARGIN,
  REQUIRED_REPAIR_COMPARISONS,
  D569_SECOND_FAMILY_MANIFEST_PATH,
  analyzeD569DiagnosticPair,
  analyzeD569Pair,
  d569OverrideImprovement,
  dryRunD569Experiment,
  initialD569TuningState,
  labelD569PairNoninferiority,
  labelD569Success,
  recordD569TuningRound,
  validateD569ExperimentManifest,
  validateD569ObservedRows,
  validateD569OverrideEvidence,
  type D569AnalysisRow,
  type D569DiagnosticPairAnalysis,
  type D569ExperimentManifest,
  type D569ExperimentValidationAccess,
  type D569ObservedRow,
  type D569OverrideEvidence,
  type D569PairAnalysis,
  type D569PanelComponents,
} from '../../../tools/d569-blind-experiment';
import { D569_SECOND_FAMILY_SEEDS } from '../../../tools/d569-second-family-manifest';
import { declareTestInputs } from '../../helpers/test-inputs';

const PRIMARY_HARD_PATHS = [
  'tests/fixtures/arena-basis-hard/seed-5117001.json',
  'tests/fixtures/arena-basis-hard/seed-5117002.json',
  'tests/fixtures/arena-basis-hard/seed-5117003.json',
  'tests/fixtures/arena-basis-hard/seed-5117004.json',
  'tests/fixtures/arena-basis-hard/seed-5117005.json',
  'tests/fixtures/arena-basis-hard/seed-5117006.json',
  'tests/fixtures/arena-basis-hard/seed-5117007.json',
  'tests/fixtures/arena-basis-hard/seed-5117008.json',
  'tests/fixtures/arena-basis-hard/seed-5117009.json',
  'tests/fixtures/arena-basis-hard/seed-5117010.json',
] as const;
const PRIMARY_BRUTAL_PATHS = [
  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json',
  'tests/fixtures/arena-basis-brutal/seed-6203004.json',
  'tests/fixtures/arena-basis-brutal/seed-6203005.json',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json',
  'tests/fixtures/arena-basis-brutal/seed-6203007.json',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json',
] as const;
const SECOND_HARD_PATHS = [
  'tests/fixtures/arena-basis-hard-2/seed-5118001.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118002.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118003.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118004.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118005.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118006.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118007.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118008.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118009.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118010.json',
] as const;
const SECOND_BRUTAL_PATHS = [
  'tests/fixtures/arena-basis-brutal-2/seed-6207001.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207002.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207003.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207004.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207005.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207006.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207007.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207008.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207009.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207010.json',
] as const;
const KB_PATHS = [
  'tests/fixtures/ai-dm-kb/d569/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/d569/tactics.md',
  'tests/fixtures/ai-dm-kb/d569/actions.md',
  'tests/fixtures/ai-dm-kb/d569/movement.md',
  'tests/fixtures/ai-dm-kb/d569/targeting.md',
  'tests/fixtures/ai-dm-kb/d569/spells.md',
  'tests/fixtures/ai-dm-kb/d569/conditions.md',
  'tests/fixtures/ai-dm-kb/d569/reactions.md',
  'tests/fixtures/ai-dm-kb/d569/protocol.md',
] as const;
const ALL_INPUT_PATHS = [
  D569_EXPERIMENT_MANIFEST_PATH,
  D569_SECOND_FAMILY_MANIFEST_PATH,
  ...PRIMARY_HARD_PATHS,
  ...PRIMARY_BRUTAL_PATHS,
  ...SECOND_HARD_PATHS,
  ...SECOND_BRUTAL_PATHS,
  ...KB_PATHS,
] as const;
const inputs = declareTestInputs({ fixtures: ALL_INPUT_PATHS });
const fixtureBytes = new Map<string, string>(ALL_INPUT_PATHS.map((path) => [
  path,
  inputs.fixtures.readText(path),
]));

const EXPECTED_V4_AMENDMENTS = [
  {
    id: 'refusal-risk-upper-bound',
    timing: 'pre-results',
    reason: 'The prior lower-bound check allowed an increased refusal risk compatible with the data.',
  },
  {
    id: 'remove-fable-player-arms',
    timing: 'pre-results',
    reason: 'Fable usage exhausted; no replacement in this registration',
  },
  {
    id: 'fresh-context-judge-eligibility',
    timing: 'pre-results',
    reason: 'Owner ruling D578.3: "It is ok for the same model to judge if it starts from a fresh context".',
  },
  {
    id: 'add-astra-high-player-arms',
    timing: 'pre-astra-run-and-analysis',
    date: '2026-09-08',
    reason: 'Owner ruling D586.24 requires Astra at high effort for a fair comparison with Sol high; this amendment was recorded before any Astra player arm was run or scored.',
  },
] as const;

const EXPECTED_CORE_ARMS = [
  { id: 'gpt-5.6-luna-blind', model: 'gpt-5.6-luna', effort: 'high', dmMode: 'blind', repair: 'code_only', adviceAssisted: false },
  { id: 'gpt-5.6-luna-advice', model: 'gpt-5.6-luna', effort: 'high', dmMode: 'advice', repair: null, adviceAssisted: true },
  { id: 'claude-opus-5-blind', model: 'claude-opus-5', effort: 'high', dmMode: 'blind', repair: 'code_only', adviceAssisted: false },
  { id: 'claude-opus-5-advice', model: 'claude-opus-5', effort: 'high', dmMode: 'advice', repair: null, adviceAssisted: true },
  { id: 'gpt-5.6-sol-blind', model: 'gpt-5.6-sol', effort: 'high', dmMode: 'blind', repair: 'code_only', adviceAssisted: false },
  { id: 'gpt-5.6-sol-advice', model: 'gpt-5.6-sol', effort: 'high', dmMode: 'advice', repair: null, adviceAssisted: true },
  { id: 'gpt-6-astra-blind', model: 'gpt-6-astra', effort: 'high', dmMode: 'blind', repair: 'code_only', adviceAssisted: false },
  { id: 'gpt-6-astra-advice', model: 'gpt-6-astra', effort: 'high', dmMode: 'advice', repair: null, adviceAssisted: true },
] as const;

const EXPECTED_HINT_ARMS = [
  { id: 'gpt-5.6-luna-blind-minhint', model: 'gpt-5.6-luna', effort: 'high', dmMode: 'blind', repair: 'minimal_legal_alternative', adviceAssisted: true },
  { id: 'gpt-5.6-sol-blind-minhint', model: 'gpt-5.6-sol', effort: 'high', dmMode: 'blind', repair: 'minimal_legal_alternative', adviceAssisted: true },
  { id: 'gpt-6-astra-blind-minhint', model: 'gpt-6-astra', effort: 'high', dmMode: 'blind', repair: 'minimal_legal_alternative', adviceAssisted: true },
] as const;

const EXPECTED_ANALYSIS_COMPARISONS = [
  { id: 'gpt-5.6-luna-blind-vs-advice', leftArm: 'gpt-5.6-luna-blind', rightArm: 'gpt-5.6-luna-advice', estimand: 'blind_minus_own_advice', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'claude-opus-5-blind-vs-advice', leftArm: 'claude-opus-5-blind', rightArm: 'claude-opus-5-advice', estimand: 'blind_minus_own_advice', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-sol-blind-vs-advice', leftArm: 'gpt-5.6-sol-blind', rightArm: 'gpt-5.6-sol-advice', estimand: 'blind_minus_own_advice', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-vs-claude-opus-5-blind', leftArm: 'gpt-5.6-luna-blind', rightArm: 'claude-opus-5-blind', estimand: 'luna_minus_judge_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-vs-gpt-5.6-sol-blind', leftArm: 'gpt-5.6-luna-blind', rightArm: 'gpt-5.6-sol-blind', estimand: 'luna_minus_judge_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-vs-claude-opus-5-advice', leftArm: 'gpt-5.6-luna-advice', rightArm: 'claude-opus-5-advice', estimand: 'luna_minus_judge_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-vs-gpt-5.6-sol-advice', leftArm: 'gpt-5.6-luna-advice', rightArm: 'gpt-5.6-sol-advice', estimand: 'luna_minus_judge_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-blind-vs-gpt-5.6-sol-advice-ceiling', leftArm: 'gpt-5.6-luna-blind', rightArm: 'gpt-5.6-sol-advice', estimand: 'blind_minus_advice_ceiling', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-6-astra-blind-vs-advice', leftArm: 'gpt-6-astra-blind', rightArm: 'gpt-6-astra-advice', estimand: 'blind_minus_own_advice', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-vs-gpt-6-astra-blind', leftArm: 'gpt-5.6-luna-blind', rightArm: 'gpt-6-astra-blind', estimand: 'luna_minus_judge_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-5.6-luna-vs-gpt-6-astra-advice', leftArm: 'gpt-5.6-luna-advice', rightArm: 'gpt-6-astra-advice', estimand: 'luna_minus_judge_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-6-astra-vs-gpt-5.6-sol-blind', leftArm: 'gpt-6-astra-blind', rightArm: 'gpt-5.6-sol-blind', estimand: 'astra_minus_sol_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
  { id: 'gpt-6-astra-vs-gpt-5.6-sol-advice', leftArm: 'gpt-6-astra-advice', rightArm: 'gpt-5.6-sol-advice', estimand: 'astra_minus_sol_within_mode', eligibleJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra'] },
] as const;

const EXPECTED_REPAIR_COMPARISONS = [
  { id: 'gpt-5.6-luna-code-only-vs-minhint', codeOnlyArm: 'gpt-5.6-luna-blind', minimalHintArm: 'gpt-5.6-luna-blind-minhint', reportLabel: 'advice-assisted' },
  { id: 'gpt-5.6-sol-code-only-vs-minhint', codeOnlyArm: 'gpt-5.6-sol-blind', minimalHintArm: 'gpt-5.6-sol-blind-minhint', reportLabel: 'advice-assisted' },
  { id: 'gpt-6-astra-code-only-vs-minhint', codeOnlyArm: 'gpt-6-astra-blind', minimalHintArm: 'gpt-6-astra-blind-minhint', reportLabel: 'advice-assisted' },
] as const;

function readText(path: string): string {
  const bytes = fixtureBytes.get(path);
  if (bytes === undefined) throw new Error(`undeclared fixture ${path}`);
  return bytes;
}

function manifest(): D569ExperimentManifest {
  return JSON.parse(readText(D569_EXPERIMENT_MANIFEST_PATH)) as D569ExperimentManifest;
}

function access(readOverride?: (path: string) => string | undefined): D569ExperimentValidationAccess {
  return {
    readText: (path) => readOverride?.(path) ?? readText(path),
    secondFamilyAccess: {
      readFixture: (path) => readOverride?.(path) ?? readText(path),
      regenerate: (seed, difficulty) => readText(
        `tests/fixtures/arena-basis-${difficulty}-2/seed-${String(seed)}.json`,
      ),
    },
  };
}

function codes(candidate: unknown, validationAccess = access()): readonly string[] {
  return validateD569ExperimentManifest(candidate, validationAccess).map((violation) => violation.code);
}

function observedRows(cells: ReturnType<typeof dryRunD569Experiment>): readonly D569ObservedRow[] {
  return cells.map((cell, index) => ({
    arm: cell.arm,
    cli: '/usr/local/bin/codex',
    cliVersion: 'codex-cli 0.148.0',
    model: cell.model,
    effort: cell.effort,
    family: cell.family,
    basis: cell.basis,
    seed: cell.seed,
    rep: cell.rep,
    sessionId: `fresh-session-${String(index)}`,
    timeoutMs: cell.timeoutMs,
    escalationModel: null,
    modelDefaultFallback: false,
    stateHash: cell.stateHash,
    sharedKbHash: cell.sharedKbHash,
    visualSourceHash: cell.visualSourceHash,
    visualProfileHash: cell.visualProfileHash,
    visualArtifactHash: sha256(`${cell.visualSourceHash}:${cell.visualProfileHash}`),
    baseContextCapBytes: cell.baseContextCapBytes,
    semanticContextCapBytes: cell.semanticContextCapBytes,
    truncatedBlocks: [],
  }));
}

const components = (value: number): D569PanelComponents => ({
  targetPriority: value,
  actionEconomy: value,
  coherence: value,
  positioning: value,
});

type SyntheticScore = number | 'refused' | 'execution_failed';

function analysisRows(
  family: 'primary' | 'second',
  basis: 'hard' | 'brutal',
  leftScores: readonly SyntheticScore[],
  rightScores: readonly SyntheticScore[],
): readonly D569AnalysisRow[] {
  if (leftScores.length !== rightScores.length) throw new Error('synthetic pair mismatch');
  return leftScores.flatMap((left, index) => {
    const right = rightScores[index];
    if (right === undefined) throw new Error('synthetic right row disappeared');
    const seed = (basis === 'hard' ? 1_000 : 2_000) + index;
    const row = (arm: string, value: SyntheticScore): D569AnalysisRow => ({
      arm,
      family,
      basis,
      seed,
      rep: 1,
      outcome: typeof value === 'number' ? 'executed' : value,
      seats: typeof value !== 'number' ? [] : [
        { judge: 'gpt-5.6-sol', components: components(value - 1) },
        { judge: 'claude-opus-5', components: components(value) },
        { judge: 'gpt-6-astra', components: components(value + 1) },
      ],
    });
    return [row('gpt-5.6-luna-blind', left), row('gpt-5.6-luna-advice', right)];
  });
}

function registeredInput(
  family: 'primary' | 'second',
  basis: 'hard' | 'brutal',
  bootstrapSeed: number,
  resamples?: number,
) {
  return {
    manifest: manifest(),
    comparisonId: 'gpt-5.6-luna-blind-vs-advice',
    family,
    basis,
    bootstrapSeed,
    ...(resamples === undefined ? {} : { resamples }),
  } as const;
}

function overrideEvidence(): D569OverrideEvidence {
  const intentText = '{"intent":"hold"}';
  return {
    stageOrder: ['blind_intent_sealed', 'engine_top_revealed', 'final_policy_choice_sealed'],
    blindSeal: {
      capsuleDigest: 'capsule-a', intentText, intentSha256: sha256(intentText), sealedAtMs: 10,
    },
    topAdvice: {
      capsuleDigest: 'capsule-a', engineTopId: 'answer-key-only', revealedAtMs: 20,
      answerKeyOnly: true,
    },
    finalChoice: { selected: 'blind_intent', sealedAtMs: 30 },
    counterfactuals: {
      blindCapsuleDigest: 'capsule-a',
      engineTopCapsuleDigest: 'capsule-a',
      blindPanelTotal: 8,
      engineTopPanelTotal: 7,
      finalPolicyPanelTotal: 8,
    },
  };
}

describe('D569 preregistered experiment manifest and dry runner', () => {
  it('validates the exact v4 Astra arm, comparison, repair, and amendment registration', () => {
    const frozen = manifest();
    expect(codes(frozen)).toEqual([]);
    expect(frozen.version).toBe('d569-blind-experiment-v4');
    expect(frozen.preregistrationAmendments).toEqual(EXPECTED_V4_AMENDMENTS);
    expect(D569_PREREGISTRATION_AMENDMENTS).toEqual(EXPECTED_V4_AMENDMENTS);
    expect(frozen.coreArms).toEqual(EXPECTED_CORE_ARMS);
    expect(D569_CORE_ARM_IDENTITIES).toEqual(EXPECTED_CORE_ARMS);
    expect(frozen.hintArms).toEqual(EXPECTED_HINT_ARMS);
    expect(D569_HINT_ARM_IDENTITIES).toEqual(EXPECTED_HINT_ARMS);
    expect(frozen.analysisComparisons).toEqual(EXPECTED_ANALYSIS_COMPARISONS);
    expect(D569_ANALYSIS_COMPARISONS).toEqual(EXPECTED_ANALYSIS_COMPARISONS);
    expect(frozen.repairComparisons).toEqual(EXPECTED_REPAIR_COMPARISONS);
    expect(REQUIRED_REPAIR_COMPARISONS).toEqual(EXPECTED_REPAIR_COMPARISONS);
    expect(frozen.preregistrationAmendments).toHaveLength(4);
    expect(frozen.coreArms).toHaveLength(8);
    expect(frozen.hintArms).toHaveLength(3);
    expect(frozen.analysisComparisons).toHaveLength(13);
    expect(frozen.repairComparisons).toHaveLength(3);
    const activeReferences = JSON.stringify({
      core: frozen.coreArms,
      hints: frozen.hintArms,
      comparisons: frozen.analysisComparisons,
      repairs: frozen.repairComparisons,
      judges: frozen.judgePanel.seats,
    });
    expect(activeReferences).not.toContain('claude-fable-5');
    expect(frozen.preregistrationAmendments[1]).toEqual({
      id: 'remove-fable-player-arms',
      timing: 'pre-results',
      reason: 'Fable usage exhausted; no replacement in this registration',
    });
    expect(frozen.judgePanel.seats).toEqual(D569_JUDGE_PANEL_IDENTITIES);
    expect(frozen.judgePanel).toMatchObject({
      seatEligibilityPolicy: 'all_registered_seats_every_comparison',
      comparisonSeatPolicy: 'same_seat_set_both_sides',
      sessionPolicy: 'fresh_session_per_packet',
      packetExcludes: [
        'decision_conversation', 'arm_identities', 'answer_key', 'other_seat_scores',
      ],
      selfPlayScoringPolicy: 'allowed_only_from_fresh_context',
      aggregationPolicy: 'equal_weight_all_registered_seats',
      perSeatReportingPolicy: 'diagnostic_only',
      minimumConsensusSeats: 3,
    });
    expect(frozen.coreArms.filter((arm) => arm.model === 'gpt-6-astra')).toEqual([
      EXPECTED_CORE_ARMS[6], EXPECTED_CORE_ARMS[7],
    ]);
    expect(frozen.hintArms.filter((arm) => arm.model === 'gpt-6-astra'))
      .toEqual([EXPECTED_HINT_ARMS[2]]);
  });

  it('dry-runs 30 hard and 30 brutal cells per each of eight core arms, 480 total', () => {
    const cells = dryRunD569Experiment(manifest(), access());
    expect(cells).toHaveLength(480);
    for (const arm of EXPECTED_CORE_ARMS) {
      const armCells = cells.filter((cell) => cell.arm === arm.id);
      expect(armCells.filter((cell) => cell.basis === 'hard')).toHaveLength(30);
      expect(armCells.filter((cell) => cell.basis === 'brutal')).toHaveLength(30);
    }
    expect(new Set(cells.map((cell) => cell.sessionKey))).toHaveLength(480);
    expect(cells.every((cell) => cell.sessionPolicy === 'fresh' && cell.timeoutMs === 240_000 &&
      !cell.escalation && !cell.modelDefaultFallback && cell.semanticContextCapBytes === 8_192 &&
      cell.truncatedBlocks.length === 0)).toBe(true);
    expect(cells.filter((cell) => cell.dmMode === 'blind').every((cell) =>
      cell.baseContextCapBytes === 65_536)).toBe(true);
    const pairedSources = new Map<string, Set<string>>();
    for (const cell of cells) {
      const key = `${cell.basis}:${String(cell.seed)}:${String(cell.rep)}`;
      pairedSources.set(key, (pairedSources.get(key) ?? new Set()).add(
        `${cell.stateHash}:${cell.sharedKbHash}:${cell.visualSourceHash}`,
      ));
    }
    expect([...pairedSources.values()].every((hashes) => hashes.size === 1)).toBe(true);
  });

  it('adds exactly 180 separately labeled advice-assisted hint cells, 660 total', () => {
    const cells = dryRunD569Experiment(manifest(), access(), { includeHintArms: true });
    const hint = cells.filter((cell) => cell.repair === 'minimal_legal_alternative');
    expect(cells).toHaveLength(660);
    expect(hint).toHaveLength(180);
    expect(hint.filter((cell) => cell.arm === 'gpt-6-astra-blind-minhint')).toHaveLength(60);
    expect(hint.every((cell) => cell.adviceAssisted)).toBe(true);
  });

  it('consumes the frozen second encounter family for all 480 core cells', () => {
    const cells = dryRunD569Experiment(manifest(), access(), { family: 'second' });
    expect(cells).toHaveLength(480);
    expect([...new Set(cells.filter((cell) => cell.basis === 'hard').map((cell) => cell.seed))])
      .toEqual(D569_SECOND_FAMILY_SEEDS.hard);
    expect([...new Set(cells.filter((cell) => cell.basis === 'brutal').map((cell) => cell.seed))])
      .toEqual(D569_SECOND_FAMILY_SEEDS.brutal);
  });

  it('records exact model effort cli and cliVersion for every observed row', () => {
    const cells = dryRunD569Experiment(manifest(), access());
    const rows = observedRows(cells);
    expect(validateD569ObservedRows(cells, rows)).toEqual([]);
    const missing = rows.slice(1);
    expect(validateD569ObservedRows(cells, missing).map((violation) => violation.code)).toContain('missing_row');
    const duplicate = [...rows, rows[0]!];
    expect(validateD569ObservedRows(cells, duplicate).map((violation) => violation.code)).toContain('duplicate_rep');
    const changed: D569ObservedRow = {
      ...rows[0]!, timeoutMs: 1, escalationModel: 'fallback', modelDefaultFallback: true,
      sharedKbHash: 'changed', visualArtifactHash: 'changed', truncatedBlocks: ['creature_facts'],
    };
    const changedRows = [changed, ...rows.slice(1)];
    expect(validateD569ObservedRows(cells, changedRows).map((violation) => violation.code))
      .toEqual(expect.arrayContaining([
        'timeout', 'escalation', 'model_default_fallback', 'paired_input_hash',
        'paired_visual_hash', 'required_block_truncated',
      ]));
    const identityMutants: ReadonlyArray<readonly [D569ObservedRow, string]> = [
      [{ ...rows[0]!, model: 'gpt-6-astra' }, 'model_identity'],
      [{ ...rows[0]!, effort: 'medium' as 'high' }, 'effort_identity'],
      [{ ...rows[0]!, cli: '   ' }, 'cli_identity'],
      [{ ...rows[0]!, cliVersion: '\t' }, 'cli_version'],
    ];
    for (const [mutant, expectedCode] of identityMutants) {
      expect(validateD569ObservedRows(cells, [mutant, ...rows.slice(1)])
        .map((violation) => violation.code)).toContain(expectedCode);
    }
  });

  it('rejects changed advice baseline settings, primer, and model-default policy', () => {
    const advice = structuredClone(manifest());
    advice.adviceCeiling.rendererProfile = { changed: true };
    expect(codes(advice)).toContain('advice_renderer');
    const primer = structuredClone(manifest()) as unknown as { visualPins: { blind: { primerVersion: string } } };
    primer.visualPins.blind.primerVersion = 'changed';
    expect(codes(primer)).toContain('manifest_shape');
    const fallback = structuredClone(manifest()) as unknown as { execution: { modelDefaultFallback: boolean } };
    fallback.execution.modelDefaultFallback = true;
    expect(codes(fallback)).toContain('manifest_shape');
  });

  it('rejects changed KB and fixture bytes', () => {
    const kb = structuredClone(manifest());
    kb.sharedKb.componentHashes['actions'] = '0'.repeat(64);
    expect(codes(kb)).toContain('kb_component_hash');
    const changedSecond = `${readText(SECOND_HARD_PATHS[0])} `;
    expect(codes(manifest(), access((path) => path === SECOND_HARD_PATHS[0] ? changedSecond : undefined)))
      .toEqual(expect.arrayContaining(['second_family_fixture_hash', 'second_family_independent_regeneration']));
  });

  it('requires every Astra arm and its code-only versus minhint repair contrast', () => {
    const frozen = manifest();
    expect(D569_CORE_ARM_IDENTITIES.filter((arm) => arm.model === 'gpt-6-astra')).toEqual([
      EXPECTED_CORE_ARMS[6], EXPECTED_CORE_ARMS[7],
    ]);
    expect(frozen.hintArms).toContainEqual(EXPECTED_HINT_ARMS[2]);
    expect(frozen.repairComparisons).toContainEqual(EXPECTED_REPAIR_COMPARISONS[2]);
    for (const armId of ['gpt-6-astra-blind', 'gpt-6-astra-advice'] as const) {
      const missing = structuredClone(frozen);
      missing.coreArms = missing.coreArms.filter((arm) => arm.id !== armId);
      expect(codes(missing)).toContain('core_arm_set');
    }
  });

  it('rejects an Astra hint arm missing its registered repair mode', () => {
    const frozen = manifest();
    const missingHint = structuredClone(frozen);
    missingHint.hintArms = missingHint.hintArms.filter((arm) => arm.id !== 'gpt-6-astra-blind-minhint');
    expect(codes(missingHint)).toContain('hint_arm_set');
  });

  it('rejects Astra blind when code-only repair is replaced by a minimal hint', () => {
    const frozen = manifest();
    const changedRepair = structuredClone(frozen);
    const astraBlind = changedRepair.coreArms.find((arm) => arm.id === 'gpt-6-astra-blind');
    if (astraBlind === undefined) throw new Error('Astra blind arm is absent');
    astraBlind.repair = 'minimal_legal_alternative';
    expect(codes(changedRepair)).toContain('core_arm_set');
  });

  it('rejects removal of the Astra code-only versus minhint repair comparison', () => {
    const frozen = manifest();
    const missingComparison = structuredClone(frozen);
    missingComparison.repairComparisons = missingComparison.repairComparisons.filter((comparison) =>
      comparison.id !== 'gpt-6-astra-code-only-vs-minhint');
    expect(codes(missingComparison)).toContain('repair_comparison_set');
  });

  it('registers direct high-effort Astra versus Sol contrasts in both modes', () => {
    const frozen = manifest();
    expect(D569_ANALYSIS_COMPARISONS.filter((comparison) =>
      comparison.estimand === 'astra_minus_sol_within_mode')).toEqual([
      EXPECTED_ANALYSIS_COMPARISONS[11], EXPECTED_ANALYSIS_COMPARISONS[12],
    ]);
    expect(frozen.analysisComparisons.filter((comparison) =>
      comparison.estimand === 'astra_minus_sol_within_mode')).toEqual([
      EXPECTED_ANALYSIS_COMPARISONS[11], EXPECTED_ANALYSIS_COMPARISONS[12],
    ]);
    for (const id of [
      'gpt-6-astra-vs-gpt-5.6-sol-blind',
      'gpt-6-astra-vs-gpt-5.6-sol-advice',
    ] as const) {
      const missing = structuredClone(frozen);
      missing.analysisComparisons = missing.analysisComparisons.filter((comparison) => comparison.id !== id);
      expect(codes(missing)).toContain('analysis_comparison_set');
    }
  });

  it('lets every fresh-context seat score Astra play and keeps per-seat tables diagnostic', () => {
    const frozen = manifest();
    expect(D569_ANALYSIS_COMPARISONS.find((comparison) =>
      comparison.id === 'gpt-6-astra-blind-vs-advice')?.eligibleJudgeSeats)
      .toEqual(['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra']);
    for (const comparison of frozen.analysisComparisons) {
      expect(comparison.eligibleJudgeSeats).toEqual(['gpt-5.6-sol', 'claude-opus-5', 'gpt-6-astra']);
    }
    expect(frozen.judgePanel).toMatchObject({
      packetExcludes: ['decision_conversation', 'arm_identities', 'answer_key', 'other_seat_scores'],
      minimumConsensusSeats: 3,
      selfPlayScoringPolicy: 'allowed_only_from_fresh_context',
      aggregationPolicy: 'equal_weight_all_registered_seats',
      perSeatReportingPolicy: 'diagnostic_only',
    });

    const recused = structuredClone(frozen);
    const astraComparison = recused.analysisComparisons.find((comparison) =>
      comparison.id === 'gpt-6-astra-blind-vs-advice');
    if (astraComparison === undefined) throw new Error('Astra self comparison is absent');
    astraComparison.eligibleJudgeSeats = ['gpt-5.6-sol', 'claude-opus-5'];
    expect(codes(recused)).toEqual(expect.arrayContaining(['judge_eligibility', 'judge_consensus']));

    const dangling = structuredClone(frozen);
    dangling.analysisComparisons[0]!.rightArm = 'claude-fable-5-advice';
    expect(codes(dangling)).toContain('dangling_comparison_arm');

    const implicit = structuredClone(frozen) as unknown as {
      coreArms: Array<{ model?: string }>;
    };
    delete implicit.coreArms[0]!.model;
    expect(codes(implicit)).toContain('manifest_shape');

  });

  it('rejects a mutated historical amendment record', () => {
    const changed = structuredClone(manifest()) as unknown as {
      preregistrationAmendments: Array<{ reason: string }>;
    };
    changed.preregistrationAmendments[1]!.reason = 'rewritten history';
    expect(codes(changed)).toContain('manifest_shape');
  });

  it('fluke_guard_uses_shuffle_seed: rejects a trained or replaced second encounter cohort', () => {
    const trained = structuredClone(manifest());
    trained.trainingSeeds.push(5_118_001);
    expect(codes(trained)).toContain('second_family_overlap');
    const second = JSON.parse(readText(D569_SECOND_FAMILY_MANIFEST_PATH)) as {
      cohorts: { difficulty: string; fixtures: { seed: number }[] }[];
    };
    second.cohorts.find((cohort) => cohort.difficulty === 'hard')!.fixtures[0]!.seed =
      manifest().bootstrap.seed;
    const bytes = `${JSON.stringify(second)}\n`;
    const changed = structuredClone(manifest());
    changed.secondFamily.manifestSha256 = sha256(bytes);
    expect(codes(changed, access((path) => path === D569_SECOND_FAMILY_MANIFEST_PATH
      ? bytes
      : undefined))).toEqual(expect.arrayContaining([
        'second_family_cohort_seed_range', 'second_family_seed_range',
      ]));
  });
});

describe('D569 maxed effort state machine', () => {
  const miss = (effort: 'high' | 'medium' | 'low', hash: string) => ({
    effort, completed: true, leakAndAuthorityGatesPassed: true,
    primaryGainCiLower: -0.1, secondFamilyGainCiLower: -0.1, incumbentConfigHash: hash,
  });

  it('maxed_after_one_no_gain: refuses medium before two consecutive high misses and low before two medium misses', () => {
    const initial = initialD569TuningState();
    expect(() => recordD569TuningRound(initial, miss('medium', 'medium-early'))).toThrow('not the active');
    const oneHighMiss = recordD569TuningRound(initial, miss('high', 'high-1'));
    expect(oneHighMiss.activeEffort).toBe('high');
    expect(oneHighMiss.efforts.high.consecutiveNoGainRounds).toBe(1);
    expect(() => recordD569TuningRound(oneHighMiss, miss('medium', 'medium-early'))).toThrow('not the active');
    const highMaxed = recordD569TuningRound(oneHighMiss, miss('high', 'high-2'));
    expect(highMaxed.activeEffort).toBe('medium');
    expect(highMaxed.efforts.high).toEqual({
      status: 'maxed', consecutiveNoGainRounds: 2, frozenConfigHash: 'high-2',
    });
    const oneMediumMiss = recordD569TuningRound(highMaxed, miss('medium', 'medium-1'));
    expect(() => recordD569TuningRound(oneMediumMiss, miss('low', 'low-early'))).toThrow('not the active');
    const mediumMaxed = recordD569TuningRound(oneMediumMiss, miss('medium', 'medium-2'));
    expect(mediumMaxed.activeEffort).toBe('low');
  });

  it('invalid gates do not count and a repeated positive gain resets no-gain progress', () => {
    const initial = initialD569TuningState();
    const invalid = recordD569TuningRound(initial, {
      ...miss('high', 'invalid'), leakAndAuthorityGatesPassed: false,
    });
    expect(invalid).toBe(initial);
    const oneMiss = recordD569TuningRound(initial, miss('high', 'miss'));
    const gain = recordD569TuningRound(oneMiss, {
      ...miss('high', 'winner'), primaryGainCiLower: 0.01, secondFamilyGainCiLower: 0.02,
    });
    expect(gain.efforts.high.consecutiveNoGainRounds).toBe(0);
  });
});

describe('D569 paired cluster analysis and success labels', () => {
  const passingOffense = { lower: 0, upper: 0 } as const;
  const refusalEvidence = (lower: number, upper: number, mean = (lower + upper) / 2) => ({
    mean, interval: { lower, upper },
  });

  it.each([
    { interval: [-0.10, -0.01] as const, expected: 'noninferior' },
    { interval: [-0.10, 0.00] as const, expected: 'noninferior' },
    { interval: [0.00, 0.00] as const, expected: 'noninferior' },
    { interval: [-0.10, 0.01] as const, expected: 'not_noninferior' },
    { interval: [0.00, 0.01] as const, expected: 'not_noninferior' },
    { interval: [0.01, 0.10] as const, expected: 'not_noninferior' },
  ])('refusal interval boundary matrix classifies $interval as $expected', ({ interval, expected }) => {
    expect(labelD569PairNoninferiority(
      passingOffense, refusalEvidence(interval[0], interval[1]),
    )).toBe(expected);
  });

  it('refusal_upper_bound_not_lower: fails when only the refusal lower bound clears the margin', () => {
    expect(labelD569PairNoninferiority(passingOffense, refusalEvidence(-0.10, 0.01)))
      .toBe('not_noninferior');
  });

  it('refusal_direction_is_blind_minus_advice: accepts a nonpositive interval and rejects a positive interval', () => {
    expect(labelD569PairNoninferiority(passingOffense, refusalEvidence(-0.10, -0.01)))
      .toBe('noninferior');
    expect(labelD569PairNoninferiority(passingOffense, refusalEvidence(0.01, 0.10)))
      .toBe('not_noninferior');
  });

  it('refusal_margin_is_at_most: accepts an upper bound exactly equal to the named zero margin', () => {
    expect(D569_REFUSAL_RISK_MARGIN).toBe(0);
    expect(labelD569PairNoninferiority(passingOffense, refusalEvidence(-0.10, 0.00)))
      .toBe('noninferior');
  });

  it('refusal_interval_not_mean: a negative mean with a positive upper bound fails', () => {
    expect(labelD569PairNoninferiority(passingOffense, refusalEvidence(-0.20, 0.01, -0.095)))
      .toBe('not_noninferior');
  });

  it('offense_is_strict_and_conjunctive: exact margin fails and just above passes only with refusal passing', () => {
    const refusalPasses = refusalEvidence(-0.10, 0.00);
    const refusalFails = refusalEvidence(-0.10, 0.01);
    expect(labelD569PairNoninferiority({ lower: -0.20, upper: 0 }, refusalPasses))
      .toBe('not_noninferior');
    expect(labelD569PairNoninferiority({ lower: -0.199_999, upper: 0 }, refusalPasses))
      .toBe('noninferior');
    expect(labelD569PairNoninferiority({ lower: -0.199_999, upper: 0 }, refusalFails))
      .toBe('not_noninferior');
  });

  it('invalid_interval_guard: missing, non-finite, or reversed interval evidence never qualifies', () => {
    expect(labelD569PairNoninferiority(null, refusalEvidence(-0.10, 0))).toBe('not_noninferior');
    expect(labelD569PairNoninferiority(passingOffense, null)).toBe('not_noninferior');
    expect(labelD569PairNoninferiority(passingOffense, { mean: -0.05, interval: null }))
      .toBe('not_noninferior');
    expect(labelD569PairNoninferiority({ lower: Number.NaN, upper: 0 }, refusalEvidence(-0.10, 0)))
      .toBe('not_noninferior');
    expect(labelD569PairNoninferiority({ lower: 0, upper: Number.POSITIVE_INFINITY }, refusalEvidence(-0.10, 0)))
      .toBe('not_noninferior');
    expect(labelD569PairNoninferiority({ lower: 0.1, upper: 0 }, refusalEvidence(-0.10, 0)))
      .toBe('not_noninferior');
    expect(labelD569PairNoninferiority(passingOffense, refusalEvidence(0.1, -0.1)))
      .toBe('not_noninferior');
  });

  it('proves pairing direction, panel-seat averaging, components, and 100000-resample reproducibility', () => {
    const rows = analysisRows('primary', 'hard', [3, 3], [2, 2]);
    const first = analyzeD569Pair(rows, registeredInput('primary', 'hard', 77));
    const second = analyzeD569Pair(rows, registeredInput('primary', 'hard', 77));
    expect(D569_BOOTSTRAP_RESAMPLES).toBe(100_000);
    expect(first).toEqual(second);
    expect(first.reportKind).toBe('registered_panel');
    expect(first.direction).toBe('gpt-5.6-luna-blind minus gpt-5.6-luna-advice');
    expect(first.left.zeroInclusive.targetPriority.mean).toBe(3);
    expect(first.left.zeroInclusive.total.mean).toBe(12);
    expect(first.pairedZeroInclusive.total).toMatchObject({
      mean: 4, interval: { lower: 4, upper: 4 }, count: 2,
    });
  });

  it('registered analysis rejects both executed sides when Astra is absent', () => {
    const twoSeatRows = analysisRows('primary', 'hard', [3], [2]).map((row) => ({
      ...row,
      seats: row.seats.filter((seat) => seat.judge !== 'gpt-6-astra'),
    }));
    expect(() => analyzeD569Pair(twoSeatRows, registeredInput('primary', 'hard', 79, 100)))
      .toThrow('registered panel requires exactly its declared judge seat set');
  });

  it('registered analysis rejects an unknown third seat substituted for Astra', () => {
    const substituted = analysisRows('primary', 'hard', [3], [2]).map((row) => ({
      ...row,
      seats: row.seats.map((seat) => seat.judge === 'gpt-6-astra'
        ? { ...seat, judge: 'unknown-seat' }
        : seat),
    }));
    expect(() => analyzeD569Pair(substituted, registeredInput('primary', 'hard', 80, 100)))
      .toThrow('registered panel requires exactly its declared judge seat set');
  });

  it('registered analysis still requires Astra when the opposite side failed execution', () => {
    const rows = analysisRows('primary', 'hard', [3], ['execution_failed']).map((row) =>
      row.outcome === 'executed'
        ? { ...row, seats: row.seats.filter((seat) => seat.judge !== 'gpt-6-astra') }
        : row);
    expect(() => analyzeD569Pair(rows, registeredInput('primary', 'hard', 81, 100)))
      .toThrow('registered panel requires exactly its declared judge seat set');
  });

  it('subset and per-seat analysis is diagnostic and cannot qualify success', () => {
    const twoSeatRows = analysisRows('primary', 'hard', [3], [2]).map((row) => ({
      ...row,
      seats: row.seats.filter((seat) => seat.judge !== 'gpt-6-astra'),
    }));
    const report = analyzeD569DiagnosticPair(twoSeatRows, {
      family: 'primary', basis: 'hard',
      leftArm: 'gpt-5.6-luna-blind', rightArm: 'gpt-5.6-luna-advice',
      diagnosticJudgeSeats: ['gpt-5.6-sol', 'claude-opus-5'],
      bootstrapSeed: 82, resamples: 100,
    });
    type CannotQualify = D569DiagnosticPairAnalysis extends D569PairAnalysis ? false : true;
    const cannotQualify: CannotQualify = true;
    expect(cannotQualify).toBe(true);
    expect(report.reportKind).toBe('diagnostic_subset');
    expect('successLabel' in report).toBe(false);
  });

  it('success_uses_executed_only: refused rows remain zero in primary while executed-only is selection-conditioned', () => {
    const rows = analysisRows('primary', 'hard', [3, 'refused'], [2, 2]);
    const report = analyzeD569Pair(rows, registeredInput('primary', 'hard', 88, 2_000));
    expect(report.pairedExecutedOnly.total.mean).toBe(4);
    expect(report.pairedExecutedOnly.total.count).toBe(1);
    expect(report.pairedZeroInclusive.total.mean).toBe(-2);
    expect(report.successLabel).toBe('not_noninferior');
    expect(report.left.refusalRate.mean).toBe(0.5);
    expect(report.refusalRiskDifference.interval.upper).toBeGreaterThan(0);
  });

  it('refusal_cluster_distribution_end_to_end: zero-and-one clusters fail, while swapped arms pass', () => {
    const exactTwoClusterDistribution = [0, 1].flatMap((first) =>
      [0, 1].map((second) => (first + second) / 2)).sort();
    expect(exactTwoClusterDistribution).toEqual([0, 0.5, 0.5, 1]);

    const rows = analysisRows(
      'primary', 'hard', ['execution_failed', 'refused'], ['refused', 0],
    );
    const blindMinusAdvice = analyzeD569Pair(rows, registeredInput('primary', 'hard', 569, 10_000));
    expect(blindMinusAdvice.pairedZeroInclusive.total).toMatchObject({
      mean: 0, interval: { lower: 0, upper: 0 }, count: 2,
    });
    expect(blindMinusAdvice.refusalRiskDifference).toMatchObject({
      mean: 0.5, interval: { lower: 0, upper: 1 }, count: 2,
    });
    expect(blindMinusAdvice.left.counts).toMatchObject({ refused: 1, executionFailed: 1 });
    expect(blindMinusAdvice.right.counts.refused).toBe(1);
    expect(blindMinusAdvice.successLabel).toBe('not_noninferior');

    const swappedRows = analysisRows(
      'primary', 'hard', ['refused', 0], ['execution_failed', 'refused'],
    );
    const adviceMinusBlind = analyzeD569Pair(
      swappedRows, registeredInput('primary', 'hard', 570, 10_000),
    );
    expect(adviceMinusBlind.pairedZeroInclusive.total.interval).toEqual({ lower: 0, upper: 0 });
    expect(adviceMinusBlind.refusalRiskDifference.interval).toEqual({ lower: -1, upper: 0 });
    expect(adviceMinusBlind.successLabel).toBe('noninferior');
  });

  it('noninferiority_pools_bases: never lets hard success conceal brutal failure', () => {
    const hard = analyzeD569Pair(
      analysisRows('primary', 'hard', [3, 3], [2, 2]),
      registeredInput('primary', 'hard', 1, 1_000),
    );
    const brutal = analyzeD569Pair(
      analysisRows('primary', 'brutal', [1, 1], [2, 2]),
      registeredInput('primary', 'brutal', 2, 1_000),
    );
    expect(hard.successLabel).toBe('noninferior');
    expect(brutal.successLabel).toBe('not_noninferior');
    expect(labelD569Success(
      [hard, brutal], 'gpt-5.6-luna-blind', 'gpt-5.6-luna-advice',
    ).primary).toBe('fails');
  });

  it('requires the second encounter cohort to point the same way and independently pass', () => {
    const reports = (['primary', 'second'] as const).flatMap((family) =>
      (['hard', 'brutal'] as const).map((basis, index) => analyzeD569Pair(
        analysisRows(family, basis, [3, 3], family === 'second' && index === 1 ? [4, 4] : [2, 2]),
        registeredInput(family, basis, 10 + index, 1_000),
      )));
    const summary = labelD569Success(
      reports, 'gpt-5.6-luna-blind', 'gpt-5.6-luna-advice',
    );
    expect(summary.primary).toBe('passes');
    expect(summary.flukeGuard).toBe('fails');
  });

  it('refusal_only_failure_propagates: either primary basis or second family prevents overall success', () => {
    const report = (
      family: 'primary' | 'second', basis: 'hard' | 'brutal', refusalFails: boolean,
    ) => analyzeD569Pair(refusalFails
      ? analysisRows(family, basis, ['execution_failed', 'refused'], ['refused', 0])
      : analysisRows(family, basis, [0, 0], [0, 0]),
    registeredInput(family, basis, 700, 5_000));
    for (const failedBasis of ['hard', 'brutal'] as const) {
      const primaryRefusalFailure = [
        report('primary', 'hard', failedBasis === 'hard'),
        report('primary', 'brutal', failedBasis === 'brutal'),
        report('second', 'hard', false), report('second', 'brutal', false),
      ];
      expect(primaryRefusalFailure.find((candidate) => candidate.basis === failedBasis &&
        candidate.family === 'primary')?.pairedZeroInclusive.total.interval)
        .toEqual({ lower: 0, upper: 0 });
      expect(labelD569Success(
        primaryRefusalFailure, 'gpt-5.6-luna-blind', 'gpt-5.6-luna-advice',
      ).primary).toBe('fails');
    }

    for (const failedBasis of ['hard', 'brutal'] as const) {
      const secondFamilyRefusalFailure = [
        report('primary', 'hard', false), report('primary', 'brutal', false),
        report('second', 'hard', failedBasis === 'hard'),
        report('second', 'brutal', failedBasis === 'brutal'),
      ];
      const summary = labelD569Success(
        secondFamilyRefusalFailure, 'gpt-5.6-luna-blind', 'gpt-5.6-luna-advice',
      );
      expect(summary.primary).toBe('passes');
      expect(summary.flukeGuard).toBe('fails');
    }
  });
});

describe('D569 override-ready sealed evidence', () => {
  it('override_exposes_top_before_blind_seal: requires sealing before top reveal and answer-key-only top evidence', () => {
    const valid = overrideEvidence();
    expect(validateD569OverrideEvidence(valid)).toEqual([]);
    expect(validateD569OverrideEvidence({
      ...valid,
      stageOrder: ['engine_top_revealed', 'blind_intent_sealed', 'final_policy_choice_sealed'],
      topAdvice: { ...valid.topAdvice, answerKeyOnly: false, revealedAtMs: 5 },
    }).map((violation) => violation.code)).toEqual(expect.arrayContaining([
      'override_stage_order', 'override_time_order', 'override_top_visibility',
    ]));
  });

  it('requires identical capsules and validates the sealed blind-intent hash', () => {
    const valid = overrideEvidence();
    const changed = {
      ...valid,
      blindSeal: { ...valid.blindSeal, intentText: 'changed' },
      counterfactuals: { ...valid.counterfactuals, engineTopCapsuleDigest: 'other' },
    };
    expect(validateD569OverrideEvidence(changed).map((violation) => violation.code))
      .toEqual(expect.arrayContaining(['override_blind_seal_hash', 'override_capsule']));
  });

  it('defines improvement as final policy minus always-engine-top, not blind-intent subset gain', () => {
    const first = overrideEvidence();
    const evidence = [{
      ...first,
      counterfactuals: {
        ...first.counterfactuals,
        blindPanelTotal: 10,
        engineTopPanelTotal: 8,
        finalPolicyPanelTotal: 8.5,
      },
    }];
    const report = d569OverrideImprovement(evidence, 44, 1_000);
    expect(report.mean).toBe(0.5);
    expect(report.interval).toEqual({ lower: 0.5, upper: 0.5 });
    expect(report.improves).toBe(true);
  });
});
