import { canonicalJson } from '../src/commands/canonical-json';
import { sha256 } from '../src/crypto/sha256';
import { BLIND_TURN_CONTEXT_MAX_BYTES } from '../src/vtt/blind-turn-context';
import {
  D569_AI_DM_KB_COMPONENT_PATHS,
  D569_AI_DM_KB_ROOT,
} from '../src/vtt/knowledge-base-contract';
import { SEMANTIC_BOARD_MAX_BYTES, TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
import { DEFAULT_RENDERER_PROFILE } from '../src/vtt/renderer-profile';
import { BLIND_STATE_PRIMER_VERSION } from './ai-dm-board-snapshot';
import { D575_PAIRWISE_COMPARISON_IDENTITIES } from './ai-dm-rerun-packet';
import {
  D569_SECOND_FAMILY_SEEDS,
  validateD569SecondFamilyManifest,
  type D569SecondFamilyManifest,
  type D569SecondFamilyValidationAccess,
} from './d569-second-family-manifest';
import { z } from 'zod';

export const D569_EXPERIMENT_MANIFEST_PATH =
  'tests/fixtures/d569-blind-experiment-manifest.json' as const;
export const D569_SECOND_FAMILY_MANIFEST_PATH =
  'tests/fixtures/d569-second-family-manifest.json' as const;
export const D569_EXPERIMENT_WALL_MS = 240_000 as const;
export const D569_BOOTSTRAP_RESAMPLES = 100_000 as const;
export const D569_NONINFERIORITY_MARGIN = -0.20 as const;
export const D569_REFUSAL_RISK_MARGIN = 0.00 as const;
export const D569_REPS = 3 as const;

export const D569_PLAYER_MODELS = Object.freeze([
  'gpt-5.6-luna',
  'claude-opus-5',
  'gpt-5.6-sol',
] as const);

export const D569_PREREGISTRATION_AMENDMENTS = Object.freeze([
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
] as const);

export const D569_JUDGE_PANEL_IDENTITIES = Object.freeze([
  { id: 'gpt-5.6-sol', model: 'gpt-5.6-sol', effort: 'high' },
  { id: 'claude-opus-5', model: 'claude-opus-5', effort: 'high' },
  { id: 'gpt-6-astra', model: 'gpt-6-astra', effort: 'high' },
] as const);

export const D569_CORE_ARM_IDENTITIES = Object.freeze(D569_PLAYER_MODELS.flatMap((model) =>
  (['blind', 'advice'] as const).map((dmMode) => ({
    id: `${model}-${dmMode}`,
    model,
    effort: 'high' as const,
    dmMode,
    repair: dmMode === 'blind' ? 'code_only' as const : null,
    adviceAssisted: dmMode === 'advice',
  }))));

export const D569_HINT_ARM_IDENTITIES = Object.freeze([
  {
    id: 'gpt-5.6-luna-blind-minhint', model: 'gpt-5.6-luna', effort: 'high',
    dmMode: 'blind', repair: 'minimal_legal_alternative', adviceAssisted: true,
  },
  {
    id: 'gpt-5.6-sol-blind-minhint', model: 'gpt-5.6-sol', effort: 'high',
    dmMode: 'blind', repair: 'minimal_legal_alternative', adviceAssisted: true,
  },
] as const);

const activePlayerModels = new Set<string>(D569_PLAYER_MODELS);
const eligibleJudgeSeats = (playingModels: ReadonlySet<string>): readonly string[] =>
  D569_JUDGE_PANEL_IDENTITIES
    .filter((seat) => !playingModels.has(seat.model))
    .map((seat) => seat.id);

export const D575_ANALYSIS_COMPARISONS = Object.freeze([
  ...D575_PAIRWISE_COMPARISON_IDENTITIES
    .filter((comparison) => activePlayerModels.has(comparison.left.model) &&
      activePlayerModels.has(comparison.right.model))
    .map((comparison) => ({
      id: comparison.name,
      leftArm: `${comparison.left.model}-${comparison.left.dmMode}`,
      rightArm: `${comparison.right.model}-${comparison.right.dmMode}`,
      estimand: comparison.left.model === comparison.right.model
        ? 'blind_minus_own_advice' as const
        : 'luna_minus_judge_within_mode' as const,
      eligibleJudgeSeats: eligibleJudgeSeats(new Set([
        comparison.left.model, comparison.right.model,
      ])),
    })),
  {
    id: 'gpt-5.6-luna-blind-vs-gpt-5.6-sol-advice-ceiling',
    leftArm: 'gpt-5.6-luna-blind',
    rightArm: 'gpt-5.6-sol-advice',
    estimand: 'blind_minus_advice_ceiling' as const,
    eligibleJudgeSeats: eligibleJudgeSeats(new Set(['gpt-5.6-luna', 'gpt-5.6-sol'])),
  },
]);

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const fixtureSchema = z.strictObject({
  seed: z.number().int().nonnegative(),
  path: z.string().min(1),
  sha256: hashSchema,
});
const armSchema = z.strictObject({
  id: z.string().min(1),
  model: z.enum(D569_PLAYER_MODELS),
  effort: z.literal('high'),
  dmMode: z.enum(['blind', 'advice']),
  repair: z.enum(['code_only', 'minimal_legal_alternative']).nullable(),
  adviceAssisted: z.boolean(),
});
const comparisonSchema = z.strictObject({
  id: z.string(),
  leftArm: z.string(),
  rightArm: z.string(),
  estimand: z.enum([
    'blind_minus_own_advice',
    'luna_minus_judge_within_mode',
    'blind_minus_advice_ceiling',
  ]),
  eligibleJudgeSeats: z.array(z.enum(D569_JUDGE_PANEL_IDENTITIES.map((seat) => seat.id))),
});
const repairComparisonSchema = z.strictObject({
  id: z.string(),
  codeOnlyArm: z.string(),
  minimalHintArm: z.string(),
  reportLabel: z.literal('advice-assisted'),
});

export const d569ExperimentManifestSchema = z.strictObject({
  version: z.literal('d569-blind-experiment-v2'),
  preregistrationAmendments: z.tuple([
    z.strictObject({
      id: z.literal('refusal-risk-upper-bound'),
      timing: z.literal('pre-results'),
      reason: z.literal(
        'The prior lower-bound check allowed an increased refusal risk compatible with the data.',
      ),
    }),
    z.strictObject({
      id: z.literal('remove-fable-player-arms'),
      timing: z.literal('pre-results'),
      reason: z.literal('Fable usage exhausted; no replacement in this registration'),
    }),
  ]),
  experimentWallMs: z.literal(D569_EXPERIMENT_WALL_MS),
  reps: z.literal(D569_REPS),
  blindMaxAttempts: z.literal(3),
  execution: z.strictObject({
    freshSessionPerCell: z.literal(true),
    escalation: z.literal(false),
    modelDefaultFallback: z.literal(false),
    transport: z.literal('mcp_minimal'),
    boardImage: z.literal('png'),
  }),
  caps: z.strictObject({
    blindBaseBytes: z.literal(BLIND_TURN_CONTEXT_MAX_BYTES),
    semanticBytes: z.literal(SEMANTIC_BOARD_MAX_BYTES),
    adviceBaseBytes: z.literal(TURN_CONTEXT_MAX_BYTES),
  }),
  bootstrap: z.strictObject({
    resamples: z.literal(D569_BOOTSTRAP_RESAMPLES),
    seed: z.number().int().nonnegative(),
    confidence: z.literal(0.95),
    noninferiorityMargin: z.literal(D569_NONINFERIORITY_MARGIN),
  }),
  sharedKb: z.strictObject({
    rootPath: z.literal(D569_AI_DM_KB_ROOT),
    combinedStartupHash: hashSchema,
    componentHashes: z.record(z.string(), hashSchema),
  }),
  visualPins: z.strictObject({
    blind: z.strictObject({
      informationMode: z.literal('blind_state'),
      primerVersion: z.literal(BLIND_STATE_PRIMER_VERSION),
      imageRole: z.literal('dm_board'),
      glyphMode: z.literal('full'),
      captureTilePx: z.literal(128),
    }),
    advice: z.strictObject({
      informationMode: z.literal('advice'),
      primerVersion: z.literal(BLIND_STATE_PRIMER_VERSION),
      imageRole: z.literal('dm_board'),
      glyphMode: z.literal('full'),
      captureTilePx: z.literal(128),
    }),
  }),
  adviceCeiling: z.strictObject({
    arm: z.literal('gpt-5.6-sol-advice'),
    model: z.literal('gpt-5.6-sol'),
    effort: z.literal('high'),
    intelMode: z.literal('full'),
    rendererProfile: z.unknown(),
    contextCapBytes: z.literal(TURN_CONTEXT_MAX_BYTES),
    timeoutMs: z.literal(D569_EXPERIMENT_WALL_MS),
    escalation: z.literal(false),
    transport: z.literal('mcp_minimal'),
    combatModel: z.literal('initiative_segments_v1'),
    initiativeProfile: z.literal('derived_v1'),
    partyPolicy: z.literal('symmetric_evaluator_v1'),
    overridePolicy: z.literal('typed_reason'),
    reactionAskDefault: z.literal('decline'),
    midRoundAdjustmentsEnabled: z.literal(false),
    captureRlData: z.literal(false),
    commonKbHash: hashSchema,
    visualPin: z.literal('advice'),
    intentionalHistoricalDifference: z.literal('common_d570_kb_tips'),
  }),
  primaryCohorts: z.array(z.strictObject({
    id: z.enum(['evaluation-hard', 'evaluation-brutal']),
    difficulty: z.enum(['hard', 'brutal']),
    fixtures: z.array(fixtureSchema),
  })),
  secondFamily: z.strictObject({
    manifestPath: z.literal(D569_SECOND_FAMILY_MANIFEST_PATH),
    manifestSha256: hashSchema,
  }),
  trainingSeeds: z.array(z.number().int().nonnegative()),
  judgePanel: z.strictObject({
    seats: z.tuple([
      z.strictObject({
        id: z.literal('gpt-5.6-sol'), model: z.literal('gpt-5.6-sol'), effort: z.literal('high'),
      }),
      z.strictObject({
        id: z.literal('claude-opus-5'), model: z.literal('claude-opus-5'), effort: z.literal('high'),
      }),
      z.strictObject({
        id: z.literal('gpt-6-astra'), model: z.literal('gpt-6-astra'), effort: z.literal('high'),
      }),
    ]),
    comparisonSeatPolicy: z.literal('same_eligible_seats_both_sides'),
    minimumConsensusSeats: z.literal(2),
  }),
  coreArms: z.array(armSchema),
  hintArms: z.array(armSchema),
  analysisComparisons: z.array(comparisonSchema),
  repairComparisons: z.array(repairComparisonSchema),
  sealedOverride: z.strictObject({
    version: z.literal('d569-sealed-override-v1'),
    stageOrder: z.tuple([
      z.literal('blind_intent_sealed'),
      z.literal('engine_top_revealed'),
      z.literal('final_policy_choice_sealed'),
    ]),
    blindSealFields: z.array(z.string()),
    answerKeyOnlyFields: z.array(z.string()),
    counterfactualCapsulePolicy: z.literal('identical_capsule'),
    improvementEstimand: z.literal('final_policy_minus_always_top'),
    minimumMeanGain: z.literal(0.20),
  }),
});

export type D569ExperimentManifest = z.infer<typeof d569ExperimentManifestSchema>;
export type D569ExperimentArm = z.infer<typeof armSchema>;
export type D569ExperimentBasis = 'hard' | 'brutal';
export type D569ExperimentFamily = 'primary' | 'second';

export interface D569ExperimentValidationAccess {
  readonly readText: (path: string) => string;
  readonly secondFamilyAccess: D569SecondFamilyValidationAccess;
}

export interface D569ExperimentViolation {
  readonly code: string;
  readonly message: string;
}

function addViolation(
  violations: D569ExperimentViolation[],
  condition: boolean,
  code: string,
  message: string,
): void {
  if (!condition) violations.push({ code, message });
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function expectedPrimarySeeds(difficulty: D569ExperimentBasis): readonly number[] {
  const first = difficulty === 'hard' ? 5_117_001 : 6_203_001;
  return Array.from({ length: 10 }, (_unused, index) => first + index);
}

function expectedPrimaryDirectory(difficulty: D569ExperimentBasis): string {
  return `tests/fixtures/arena-basis-${difficulty}`;
}

const REQUIRED_BLIND_SEAL_FIELDS = Object.freeze([
  'capsuleRevision', 'capsuleDigest', 'roomHash', 'blindIntentText', 'blindIntents',
  'repairTranscript', 'rejectionCodes', 'attempts', 'resolverSemanticDigest', 'sealSha256',
] as const);
const REQUIRED_ANSWER_KEY_FIELDS = Object.freeze([
  'selectedOfferedId', 'catalogDigest', 'engineTopId', 'engineTopRank',
  'engineTopPolicyVersion', 'engineTopResolutionDigest', 'blindDiffersFromEngineTop',
  'differenceClass', 'blindCounterfactualDigest', 'engineTopCounterfactualDigest',
] as const);
const REQUIRED_REPAIR_COMPARISONS = Object.freeze([
  {
    id: 'gpt-5.6-luna-code-only-vs-minhint',
    codeOnlyArm: 'gpt-5.6-luna-blind',
    minimalHintArm: 'gpt-5.6-luna-blind-minhint',
    reportLabel: 'advice-assisted' as const,
  },
  {
    id: 'gpt-5.6-sol-code-only-vs-minhint',
    codeOnlyArm: 'gpt-5.6-sol-blind',
    minimalHintArm: 'gpt-5.6-sol-blind-minhint',
    reportLabel: 'advice-assisted' as const,
  },
] as const);

function kbComponentKey(path: string): string {
  const filename = path.slice(path.lastIndexOf('/') + 1, -3);
  return filename === 'ai-dm-core' ? 'root' : filename;
}

/** Exact, model-free validation of the preregistration and all frozen inputs. */
export function validateD569ExperimentManifest(
  input: unknown,
  access: D569ExperimentValidationAccess,
): readonly D569ExperimentViolation[] {
  const decoded = d569ExperimentManifestSchema.safeParse(input);
  if (!decoded.success) return [{ code: 'manifest_shape', message: decoded.error.message }];
  const manifest = decoded.data;
  const violations: D569ExperimentViolation[] = [];

  addViolation(violations, canonicalEqual(manifest.coreArms, D569_CORE_ARM_IDENTITIES),
    'core_arm_set', 'manifest must contain the exact six active model/mode arms');
  addViolation(violations, canonicalEqual(manifest.hintArms, D569_HINT_ARM_IDENTITIES),
    'hint_arm_set', 'manifest must contain the two preregistered hint diagnostics');
  addViolation(violations, canonicalEqual(manifest.analysisComparisons, D575_ANALYSIS_COMPARISONS),
    'analysis_comparison_set', 'manifest must contain the amended active and advice-ceiling comparisons');
  addViolation(violations, canonicalEqual(manifest.judgePanel.seats, D569_JUDGE_PANEL_IDENTITIES),
    'judge_panel', 'judge panel must contain the exact preregistered Sol, Opus, and Astra seats');
  addViolation(violations, canonicalEqual(manifest.repairComparisons, REQUIRED_REPAIR_COMPARISONS),
    'repair_comparison_set', 'manifest must contain both advice-assisted repair comparisons');
  addViolation(violations,
    canonicalEqual(manifest.adviceCeiling.rendererProfile, DEFAULT_RENDERER_PROFILE),
    'advice_renderer', 'advice ceiling must use the standing default renderer');
  addViolation(violations,
    manifest.adviceCeiling.commonKbHash === manifest.sharedKb.combinedStartupHash,
    'advice_kb', 'advice ceiling must use the common D570 KB/tips bytes');
  addViolation(violations, canonicalEqual(manifest.sealedOverride.blindSealFields, REQUIRED_BLIND_SEAL_FIELDS),
    'override_blind_seal_fields', 'sealed override blind fields changed');
  addViolation(violations,
    canonicalEqual(manifest.sealedOverride.answerKeyOnlyFields, REQUIRED_ANSWER_KEY_FIELDS),
    'override_answer_key_fields', 'sealed override answer-key fields changed');

  const armsById = new Map(
    [...manifest.coreArms, ...manifest.hintArms].map((arm) => [arm.id, arm] as const),
  );
  for (const comparison of manifest.analysisComparisons) {
    const left = armsById.get(comparison.leftArm);
    const right = armsById.get(comparison.rightArm);
    addViolation(violations, left !== undefined && right !== undefined,
      'dangling_comparison_arm', `comparison ${comparison.id} references an inactive arm`);
    if (left === undefined || right === undefined) continue;
    const playingModels = new Set<string>([left.model, right.model]);
    const expectedSeats = eligibleJudgeSeats(playingModels);
    const registeredSeats = manifest.judgePanel.seats.filter((seat) =>
      comparison.eligibleJudgeSeats.includes(seat.id));
    const registeredEligibleSeats = registeredSeats.filter((seat) => !playingModels.has(seat.model));
    addViolation(violations, canonicalEqual(comparison.eligibleJudgeSeats, expectedSeats),
      'judge_eligibility', `comparison ${comparison.id} must use every and only eligible judge seat`);
    addViolation(violations, registeredSeats.every((seat) => !playingModels.has(seat.model)),
      'self_scoring', `comparison ${comparison.id} assigns a playing model to judge itself`);
    addViolation(violations, expectedSeats.length >= manifest.judgePanel.minimumConsensusSeats &&
      registeredEligibleSeats.length >= manifest.judgePanel.minimumConsensusSeats,
      'judge_consensus', `comparison ${comparison.id} has fewer than two eligible judge seats`);
  }

  const componentKeys = D569_AI_DM_KB_COMPONENT_PATHS.map(kbComponentKey);
  addViolation(violations,
    canonicalEqual(Object.keys(manifest.sharedKb.componentHashes).sort(), [...componentKeys].sort()),
    'kb_component_set', 'shared KB component set changed');
  const componentBytes: string[] = [];
  for (const path of D569_AI_DM_KB_COMPONENT_PATHS) {
    const key = kbComponentKey(path);
    try {
      const bytes = access.readText(path);
      componentBytes.push(bytes);
      addViolation(violations, manifest.sharedKb.componentHashes[key] === sha256(bytes),
        'kb_component_hash', `shared KB component ${path} changed`);
    } catch (error) {
      violations.push({
        code: 'kb_component_missing',
        message: `${path}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  addViolation(violations,
    componentBytes.length === D569_AI_DM_KB_COMPONENT_PATHS.length &&
      manifest.sharedKb.combinedStartupHash === sha256(componentBytes.join('\n\n')),
  'kb_startup_hash', 'shared D570 startup bytes changed');

  const primaryIds = manifest.primaryCohorts.map((cohort) => cohort.id);
  addViolation(violations, manifest.primaryCohorts.length === 2 && new Set(primaryIds).size === 2,
    'primary_cohort_set', 'manifest must contain one hard and one brutal primary cohort');
  const allSeeds = new Set<number>();
  for (const difficulty of ['hard', 'brutal'] as const) {
    const cohort = manifest.primaryCohorts.find((candidate) => candidate.difficulty === difficulty);
    if (cohort === undefined) continue;
    const expectedSeeds = expectedPrimarySeeds(difficulty);
    addViolation(violations, canonicalEqual(cohort.fixtures.map((fixture) => fixture.seed), expectedSeeds),
      'primary_seed_range', `${difficulty} primary cohort has the wrong seeds`);
    for (const [index, fixture] of cohort.fixtures.entries()) {
      const expectedSeed = expectedSeeds[index];
      addViolation(violations, fixture.path ===
        `${expectedPrimaryDirectory(difficulty)}/seed-${String(fixture.seed)}.json`,
      'primary_fixture_path', `seed ${String(fixture.seed)} has a noncanonical path`);
      addViolation(violations, !allSeeds.has(fixture.seed), 'duplicate_seed',
        `seed ${String(fixture.seed)} appears more than once`);
      allSeeds.add(fixture.seed);
      if (fixture.seed !== expectedSeed) continue;
      try {
        const bytes = access.readText(fixture.path);
        addViolation(violations, sha256(bytes) === fixture.sha256, 'primary_fixture_hash',
          `seed ${String(fixture.seed)} fixture hash changed`);
        const parsed = JSON.parse(bytes) as { readonly spec?: {
          readonly seed?: unknown; readonly difficultyProfile?: unknown;
        } };
        addViolation(violations, parsed.spec?.seed === fixture.seed &&
          parsed.spec.difficultyProfile === difficulty, 'primary_fixture_identity',
        `seed ${String(fixture.seed)} fixture identity or difficulty changed`);
      } catch (error) {
        violations.push({
          code: 'primary_fixture_missing',
          message: `${fixture.path}: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  try {
    const secondBytes = access.readText(manifest.secondFamily.manifestPath);
    addViolation(violations, sha256(secondBytes) === manifest.secondFamily.manifestSha256,
      'second_family_manifest_hash', 'second-family manifest bytes changed');
    const second = JSON.parse(secondBytes) as D569SecondFamilyManifest;
    for (const violation of validateD569SecondFamilyManifest(second, access.secondFamilyAccess)) {
      violations.push({ code: `second_family_${violation.code}`, message: violation.message });
    }
    const secondSeeds = second.cohorts.flatMap((cohort) => cohort.fixtures.map((fixture) => fixture.seed));
    for (const seed of secondSeeds) {
      addViolation(violations, !allSeeds.has(seed) && !manifest.trainingSeeds.includes(seed),
        'second_family_overlap', `second-family seed ${String(seed)} is trained or overlaps evaluation`);
    }
    addViolation(violations,
      canonicalEqual(second.cohorts.find((cohort) => cohort.difficulty === 'hard')?.fixtures
        .map((fixture) => fixture.seed), D569_SECOND_FAMILY_SEEDS.hard) &&
      canonicalEqual(second.cohorts.find((cohort) => cohort.difficulty === 'brutal')?.fixtures
        .map((fixture) => fixture.seed), D569_SECOND_FAMILY_SEEDS.brutal),
    'second_family_seed_range', 'fluke guard must use the frozen encounter cohort, not a shuffle seed');
  } catch (error) {
    violations.push({
      code: 'second_family_manifest_missing',
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return violations;
}

export interface D569DryRunCell {
  readonly arm: string;
  readonly model: string;
  readonly effort: 'high';
  readonly dmMode: 'blind' | 'advice';
  readonly repair: 'code_only' | 'minimal_legal_alternative' | null;
  readonly adviceAssisted: boolean;
  readonly family: D569ExperimentFamily;
  readonly basis: D569ExperimentBasis;
  readonly seed: number;
  readonly rep: 1 | 2 | 3;
  readonly fixturePath: string;
  readonly stateHash: string;
  readonly sharedKbHash: string;
  readonly visualSourceHash: string;
  readonly visualProfileHash: string;
  readonly sessionPolicy: 'fresh';
  readonly sessionKey: string;
  readonly timeoutMs: 240_000;
  readonly escalation: false;
  readonly modelDefaultFallback: false;
  readonly baseContextCapBytes: number;
  readonly semanticContextCapBytes: number;
  readonly requiredBlocks: readonly ['semantic_board', 'creature_facts', 'initiative', 'legal_movement'];
  readonly truncatedBlocks: readonly [];
}

function secondFamilyCohorts(
  manifest: D569ExperimentManifest,
  access: D569ExperimentValidationAccess,
): D569ExperimentManifest['primaryCohorts'] {
  const parsed = JSON.parse(access.readText(manifest.secondFamily.manifestPath)) as D569SecondFamilyManifest;
  return parsed.cohorts.map((cohort) => ({
    id: cohort.difficulty === 'hard' ? 'evaluation-hard' as const : 'evaluation-brutal' as const,
    difficulty: cohort.difficulty,
    fixtures: cohort.fixtures,
  }));
}

/** Emits future execution cells only. This function has no process, arena, adapter, or model seam. */
export function dryRunD569Experiment(
  input: unknown,
  access: D569ExperimentValidationAccess,
  options: { readonly includeHintArms?: boolean; readonly family?: D569ExperimentFamily } = {},
): readonly D569DryRunCell[] {
  const violations = validateD569ExperimentManifest(input, access);
  if (violations.length > 0) {
    throw new TypeError(`Invalid D569 experiment manifest: ${violations[0]?.code ?? 'unknown'}`);
  }
  const manifest = d569ExperimentManifestSchema.parse(input);
  const family = options.family ?? 'primary';
  const cohorts = family === 'primary' ? manifest.primaryCohorts : secondFamilyCohorts(manifest, access);
  const arms = options.includeHintArms === true
    ? [...manifest.coreArms, ...manifest.hintArms]
    : manifest.coreArms;
  return arms.flatMap((arm) => cohorts.flatMap((cohort) => cohort.fixtures.flatMap((fixture) =>
    ([1, 2, 3] as const).map((rep): D569DryRunCell => {
      const visualPin = manifest.visualPins[arm.dmMode];
      return {
        arm: arm.id,
        model: arm.model,
        effort: arm.effort,
        dmMode: arm.dmMode,
        repair: arm.repair,
        adviceAssisted: arm.adviceAssisted,
        family,
        basis: cohort.difficulty,
        seed: fixture.seed,
        rep,
        fixturePath: fixture.path,
        stateHash: fixture.sha256,
        sharedKbHash: manifest.sharedKb.combinedStartupHash,
        visualSourceHash: sha256(canonicalJson({ stateHash: fixture.sha256, role: visualPin.imageRole })),
        visualProfileHash: sha256(canonicalJson(visualPin)),
        sessionPolicy: 'fresh',
        sessionKey: sha256(canonicalJson({ family, arm: arm.id, seed: fixture.seed, rep })),
        timeoutMs: manifest.experimentWallMs,
        escalation: false,
        modelDefaultFallback: false,
        baseContextCapBytes: arm.dmMode === 'blind'
          ? manifest.caps.blindBaseBytes
          : manifest.caps.adviceBaseBytes,
        semanticContextCapBytes: SEMANTIC_BOARD_MAX_BYTES,
        requiredBlocks: ['semantic_board', 'creature_facts', 'initiative', 'legal_movement'],
        truncatedBlocks: [],
      };
    }))));
}

export interface D569ObservedRow {
  readonly arm: string;
  readonly family: D569ExperimentFamily;
  readonly basis: D569ExperimentBasis;
  readonly seed: number;
  readonly rep: number;
  readonly sessionId: string | null;
  readonly timeoutMs: number;
  readonly escalationModel: string | null;
  readonly modelDefaultFallback: boolean;
  readonly stateHash: string;
  readonly sharedKbHash: string;
  readonly visualSourceHash: string;
  readonly visualProfileHash: string;
  readonly visualArtifactHash: string;
  readonly baseContextCapBytes: number;
  readonly semanticContextCapBytes: number;
  readonly truncatedBlocks: readonly string[];
}

/** Validates exact completeness and launch invariants after supervisor-owned runs. */
export function validateD569ObservedRows(
  cells: readonly D569DryRunCell[],
  rows: readonly D569ObservedRow[],
): readonly D569ExperimentViolation[] {
  const violations: D569ExperimentViolation[] = [];
  const key = (row: Pick<D569ObservedRow, 'family' | 'arm' | 'basis' | 'seed' | 'rep'>): string =>
    `${row.family}:${row.arm}:${row.basis}:${String(row.seed)}:${String(row.rep)}`;
  const expected = new Map(cells.map((cell) => [key(cell), cell]));
  const seen = new Set<string>();
  const sessionIds = new Set<string>();
  const pairedVisualHashes = new Map<string, string>();
  for (const row of rows) {
    const rowKey = key(row);
    const cell = expected.get(rowKey);
    addViolation(violations, cell !== undefined, 'unexpected_row', `unexpected row ${rowKey}`);
    addViolation(violations, !seen.has(rowKey), 'duplicate_rep', `duplicate row ${rowKey}`);
    seen.add(rowKey);
    if (cell === undefined) continue;
    addViolation(violations, row.sessionId !== null && !sessionIds.has(row.sessionId),
      'fresh_session', `row ${rowKey} did not use a unique fresh session`);
    if (row.sessionId !== null) sessionIds.add(row.sessionId);
    addViolation(violations, row.timeoutMs === cell.timeoutMs, 'timeout', `row ${rowKey} changed timeout`);
    addViolation(violations, row.escalationModel === null, 'escalation', `row ${rowKey} escalated`);
    addViolation(violations, !row.modelDefaultFallback, 'model_default_fallback',
      `row ${rowKey} used a default fallback`);
    addViolation(violations, row.stateHash === cell.stateHash &&
      row.sharedKbHash === cell.sharedKbHash && row.visualSourceHash === cell.visualSourceHash,
    'paired_input_hash', `row ${rowKey} changed paired state, KB, or visual source`);
    addViolation(violations, row.visualProfileHash === cell.visualProfileHash,
      'visual_profile_hash', `row ${rowKey} changed its mode-specific visual profile`);
    const visualPairKey = `${row.family}:${row.basis}:${String(row.seed)}:${String(row.rep)}:${cell.dmMode}`;
    const pairedVisualHash = pairedVisualHashes.get(visualPairKey);
    addViolation(violations, pairedVisualHash === undefined || pairedVisualHash === row.visualArtifactHash,
      'paired_visual_hash', `row ${rowKey} changed the paired ${cell.dmMode} visual bytes`);
    pairedVisualHashes.set(visualPairKey, row.visualArtifactHash);
    addViolation(violations, row.baseContextCapBytes === cell.baseContextCapBytes &&
      row.semanticContextCapBytes === cell.semanticContextCapBytes,
    'context_cap', `row ${rowKey} changed context caps`);
    addViolation(violations, row.truncatedBlocks.length === 0, 'required_block_truncated',
      `row ${rowKey} truncated a required block`);
  }
  for (const expectedKey of expected.keys()) {
    addViolation(violations, seen.has(expectedKey), 'missing_row', `missing row ${expectedKey}`);
  }
  return violations;
}

export type D569Effort = 'high' | 'medium' | 'low';
export interface D569TuningState {
  readonly activeEffort: D569Effort;
  readonly efforts: Readonly<Record<D569Effort, {
    readonly status: 'locked' | 'tuning' | 'maxed';
    readonly consecutiveNoGainRounds: 0 | 1 | 2;
    readonly frozenConfigHash: string | null;
  }>>;
}

export function initialD569TuningState(): D569TuningState {
  return {
    activeEffort: 'high',
    efforts: {
      high: { status: 'tuning', consecutiveNoGainRounds: 0, frozenConfigHash: null },
      medium: { status: 'locked', consecutiveNoGainRounds: 0, frozenConfigHash: null },
      low: { status: 'locked', consecutiveNoGainRounds: 0, frozenConfigHash: null },
    },
  };
}

export interface D569TuningRoundResult {
  readonly effort: D569Effort;
  readonly completed: boolean;
  readonly leakAndAuthorityGatesPassed: boolean;
  readonly primaryGainCiLower: number;
  readonly secondFamilyGainCiLower: number;
  readonly incumbentConfigHash: string;
}

export function recordD569TuningRound(
  state: D569TuningState,
  result: D569TuningRoundResult,
): D569TuningState {
  if (result.effort !== state.activeEffort || state.efforts[result.effort].status !== 'tuning') {
    throw new TypeError(`${result.effort} is not the active tuning effort.`);
  }
  if (!result.completed || !result.leakAndAuthorityGatesPassed) return state;
  const gain = result.primaryGainCiLower > 0 && result.secondFamilyGainCiLower > 0;
  const misses = gain ? 0 : Math.min(2,
    state.efforts[result.effort].consecutiveNoGainRounds + 1) as 0 | 1 | 2;
  const maxed = misses === 2;
  const nextEffort = result.effort === 'high' ? 'medium' : result.effort === 'medium' ? 'low' : null;
  const nextEfforts = {
    ...state.efforts,
    [result.effort]: {
      status: maxed ? 'maxed' as const : 'tuning' as const,
      consecutiveNoGainRounds: misses,
      frozenConfigHash: maxed ? result.incumbentConfigHash : null,
    },
  };
  if (!maxed || nextEffort === null) return { ...state, efforts: nextEfforts };
  return {
    activeEffort: nextEffort,
    efforts: {
      ...nextEfforts,
      [nextEffort]: { status: 'tuning', consecutiveNoGainRounds: 0, frozenConfigHash: null },
    },
  };
}

export const D569_PANEL_COMPONENTS = Object.freeze([
  'targetPriority', 'actionEconomy', 'coherence', 'positioning',
] as const);
export type D569PanelComponent = (typeof D569_PANEL_COMPONENTS)[number];
export type D569PanelComponents = Readonly<Record<D569PanelComponent, number>>;
export interface D569PanelSeat {
  readonly judge: string;
  readonly components: D569PanelComponents;
}
export interface D569AnalysisRow {
  readonly arm: string;
  readonly family: D569ExperimentFamily;
  readonly basis: D569ExperimentBasis;
  readonly seed: number;
  readonly rep: number;
  readonly outcome: 'executed' | 'refused' | 'execution_failed' | 'service_failed' | 'infrastructure_failed';
  readonly seats: readonly D569PanelSeat[];
}
export interface D569Interval { readonly lower: number; readonly upper: number }
export interface D569MetricReport {
  readonly mean: number;
  readonly interval: D569Interval;
  readonly count: number;
}
export interface D569SuccessMetricEvidence {
  readonly mean: number;
  readonly interval: D569Interval | null;
}
export interface D569ArmReport {
  readonly zeroInclusive: Readonly<Record<'total' | D569PanelComponent, D569MetricReport>>;
  readonly executedOnly: Readonly<Record<'total' | D569PanelComponent, D569MetricReport>>;
  readonly refusalRate: D569MetricReport;
  readonly counts: {
    readonly executed: number;
    readonly refused: number;
    readonly executionFailed: number;
    readonly serviceFailed: number;
    readonly infrastructureFailed: number;
  };
}
export interface D569PairAnalysis {
  readonly family: D569ExperimentFamily;
  readonly basis: D569ExperimentBasis;
  readonly leftArm: string;
  readonly rightArm: string;
  readonly direction: string;
  readonly left: D569ArmReport;
  readonly right: D569ArmReport;
  readonly pairedZeroInclusive: Readonly<Record<'total' | D569PanelComponent, D569MetricReport>>;
  readonly pairedExecutedOnly: Readonly<Record<'total' | D569PanelComponent, D569MetricReport>>;
  readonly refusalRiskDifference: D569MetricReport;
  readonly successLabel: 'noninferior' | 'not_noninferior';
}

function isFiniteOrderedInterval(interval: D569Interval | null): interval is D569Interval {
  return interval !== null && Number.isFinite(interval.lower) && Number.isFinite(interval.upper) &&
    interval.upper >= interval.lower;
}

/** Applies the two conjunctive preregistered bounds; null represents missing interval evidence. */
export function labelD569PairNoninferiority(
  offenseInterval: D569Interval | null,
  refusalRiskDifference: D569SuccessMetricEvidence | null,
): D569PairAnalysis['successLabel'] {
  const offensePasses = isFiniteOrderedInterval(offenseInterval) &&
    offenseInterval.lower > D569_NONINFERIORITY_MARGIN;
  const refusalPasses = refusalRiskDifference !== null &&
    isFiniteOrderedInterval(refusalRiskDifference.interval) &&
    refusalRiskDifference.interval.upper <= D569_REFUSAL_RISK_MARGIN;
  return offensePasses && refusalPasses ? 'noninferior' : 'not_noninferior';
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
    return ((mixed ^ mixed >>> 14) >>> 0) / 4_294_967_296;
  };
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sorted: readonly number[], quantile: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(quantile * sorted.length)));
  return sorted[index] ?? Number.NaN;
}

function clusterInterval(
  clusters: ReadonlyMap<number, readonly number[]>,
  resamples: number,
  seed: number,
): D569Interval {
  const clusterRows = [...clusters.values()];
  if (clusterRows.length === 0) return { lower: Number.NaN, upper: Number.NaN };
  const random = mulberry32(seed);
  const draws = new Array<number>(resamples);
  for (let draw = 0; draw < resamples; draw += 1) {
    const sampled: number[] = [];
    for (let cluster = 0; cluster < clusterRows.length; cluster += 1) {
      const selected = clusterRows[Math.floor(random() * clusterRows.length)];
      if (selected !== undefined) sampled.push(...selected);
    }
    draws[draw] = mean(sampled);
  }
  draws.sort((left, right) => left - right);
  return { lower: percentile(draws, 0.025), upper: percentile(draws, 0.975) };
}

function panelValues(row: D569AnalysisRow): Readonly<Record<'total' | D569PanelComponent, number>> | null {
  if (row.outcome === 'infrastructure_failed') return null;
  if (row.outcome !== 'executed') {
    return { total: 0, targetPriority: 0, actionEconomy: 0, coherence: 0, positioning: 0 };
  }
  if (row.seats.length === 0) throw new TypeError('Executed rows require at least one valid panel seat.');
  const component = Object.fromEntries(D569_PANEL_COMPONENTS.map((name) => [
    name, mean(row.seats.map((seat) => seat.components[name])),
  ])) as D569PanelComponents;
  return { ...component, total: D569_PANEL_COMPONENTS.reduce((sum, name) => sum + component[name], 0) };
}

function clusterMap(values: readonly { readonly seed: number; readonly value: number }[]): Map<number, number[]> {
  const clusters = new Map<number, number[]>();
  for (const entry of values) clusters.set(entry.seed, [...(clusters.get(entry.seed) ?? []), entry.value]);
  return clusters;
}

function metric(
  values: readonly { readonly seed: number; readonly value: number }[],
  resamples: number,
  seed: number,
): D569MetricReport {
  return {
    mean: mean(values.map((entry) => entry.value)),
    interval: clusterInterval(clusterMap(values), resamples, seed),
    count: values.length,
  };
}

function armReport(
  rows: readonly D569AnalysisRow[],
  resamples: number,
  seed: number,
): D569ArmReport {
  const scored = rows.flatMap((row) => {
    const values = panelValues(row);
    return values === null ? [] : [{ row, values }];
  });
  const metrics = ['total', ...D569_PANEL_COMPONENTS] as const;
  const zeroInclusive = Object.fromEntries(metrics.map((name, index) => [name,
    metric(scored.map(({ row, values }) => ({ seed: row.seed, value: values[name] })),
      resamples, seed + index)])) as D569ArmReport['zeroInclusive'];
  const executed = scored.filter(({ row }) => row.outcome === 'executed');
  const executedOnly = Object.fromEntries(metrics.map((name, index) => [name,
    metric(executed.map(({ row, values }) => ({ seed: row.seed, value: values[name] })),
      resamples, seed + 20 + index)])) as D569ArmReport['executedOnly'];
  const refusalRate = metric(scored.map(({ row }) => ({
    seed: row.seed,
    value: row.outcome === 'refused' || row.outcome === 'execution_failed' ? 1 : 0,
  })), resamples, seed + 40);
  return {
    zeroInclusive,
    executedOnly,
    refusalRate,
    counts: {
      executed: rows.filter((row) => row.outcome === 'executed').length,
      refused: rows.filter((row) => row.outcome === 'refused').length,
      executionFailed: rows.filter((row) => row.outcome === 'execution_failed').length,
      serviceFailed: rows.filter((row) => row.outcome === 'service_failed').length,
      infrastructureFailed: rows.filter((row) => row.outcome === 'infrastructure_failed').length,
    },
  };
}

/** Paired seed-cluster analysis. Primary scores retain refused/execution-failed zeroes. */
export function analyzeD569Pair(
  rows: readonly D569AnalysisRow[],
  input: {
    readonly family: D569ExperimentFamily;
    readonly basis: D569ExperimentBasis;
    readonly leftArm: string;
    readonly rightArm: string;
    readonly resamples?: number;
    readonly bootstrapSeed: number;
  },
): D569PairAnalysis {
  const selected = rows.filter((row) => row.family === input.family && row.basis === input.basis &&
    (row.arm === input.leftArm || row.arm === input.rightArm));
  const leftRows = selected.filter((row) => row.arm === input.leftArm);
  const rightRows = selected.filter((row) => row.arm === input.rightArm);
  const rowKey = (row: D569AnalysisRow): string => `${String(row.seed)}:${String(row.rep)}`;
  const left = new Map(leftRows.map((row) => [rowKey(row), row]));
  const right = new Map(rightRows.map((row) => [rowKey(row), row]));
  if (left.size !== leftRows.length || right.size !== rightRows.length || left.size !== right.size ||
    [...left.keys()].some((key) => !right.has(key))) {
    throw new TypeError('Paired analysis requires one row per arm for every (encounter seed, rep).');
  }
  const resamples = input.resamples ?? D569_BOOTSTRAP_RESAMPLES;
  const paired = [...left.entries()].flatMap(([key, leftRow]) => {
    const rightRow = right.get(key);
    if (rightRow === undefined) throw new Error('Validated pair disappeared.');
    const leftValues = panelValues(leftRow);
    const rightValues = panelValues(rightRow);
    return leftValues === null || rightValues === null ? [] : [{ leftRow, rightRow, leftValues, rightValues }];
  });
  const metrics = ['total', ...D569_PANEL_COMPONENTS] as const;
  const pairedZeroInclusive = Object.fromEntries(metrics.map((name, index) => [name, metric(
    paired.map(({ leftRow, leftValues, rightValues }) => ({
      seed: leftRow.seed, value: leftValues[name] - rightValues[name],
    })), resamples, input.bootstrapSeed + 100 + index,
  )])) as D569PairAnalysis['pairedZeroInclusive'];
  const bothExecuted = paired.filter(({ leftRow, rightRow }) =>
    leftRow.outcome === 'executed' && rightRow.outcome === 'executed');
  const pairedExecutedOnly = Object.fromEntries(metrics.map((name, index) => [name, metric(
    bothExecuted.map(({ leftRow, leftValues, rightValues }) => ({
      seed: leftRow.seed, value: leftValues[name] - rightValues[name],
    })), resamples, input.bootstrapSeed + 200 + index,
  )])) as D569PairAnalysis['pairedExecutedOnly'];
  const refusalRiskDifference = metric(paired.map(({ leftRow, rightRow }) => ({
    seed: leftRow.seed,
    value: Number(leftRow.outcome === 'refused' || leftRow.outcome === 'execution_failed') -
      Number(rightRow.outcome === 'refused' || rightRow.outcome === 'execution_failed'),
  })), resamples, input.bootstrapSeed + 300);
  const primary = pairedZeroInclusive.total;
  return {
    family: input.family,
    basis: input.basis,
    leftArm: input.leftArm,
    rightArm: input.rightArm,
    direction: `${input.leftArm} minus ${input.rightArm}`,
    left: armReport(leftRows, resamples, input.bootstrapSeed + 400),
    right: armReport(rightRows, resamples, input.bootstrapSeed + 500),
    pairedZeroInclusive,
    pairedExecutedOnly,
    refusalRiskDifference,
    successLabel: labelD569PairNoninferiority(primary.interval, refusalRiskDifference),
  };
}

export interface D569SuccessSummary {
  readonly primary: 'passes' | 'fails';
  readonly flukeGuard: 'passes' | 'fails';
  readonly reason: string;
}

/** Labels the claim only from basis-separated, zero-inclusive reports. */
export function labelD569Success(
  reports: readonly D569PairAnalysis[],
  leftArm: string,
  rightArm: string,
): D569SuccessSummary {
  const find = (family: D569ExperimentFamily, basis: D569ExperimentBasis): D569PairAnalysis | undefined =>
    reports.find((report) => report.family === family && report.basis === basis &&
      report.leftArm === leftArm && report.rightArm === rightArm);
  const primary = (['hard', 'brutal'] as const).map((basis) => find('primary', basis));
  const second = (['hard', 'brutal'] as const).map((basis) => find('second', basis));
  const passes = (set: readonly (D569PairAnalysis | undefined)[]): boolean => set.every((report) =>
    report?.successLabel === 'noninferior' && report.pairedZeroInclusive.total.mean >= 0);
  return {
    primary: primary.every((report) => report?.successLabel === 'noninferior') ? 'passes' : 'fails',
    flukeGuard: passes(second) ? 'passes' : 'fails',
    reason: 'Success uses basis-separated refusals-as-zero totals and the frozen second encounter cohort.',
  };
}

export interface D569OverrideEvidence {
  readonly stageOrder: readonly string[];
  readonly blindSeal: {
    readonly capsuleDigest: string;
    readonly intentText: string;
    readonly intentSha256: string;
    readonly sealedAtMs: number;
  };
  readonly topAdvice: {
    readonly capsuleDigest: string;
    readonly engineTopId: string;
    readonly revealedAtMs: number;
    readonly answerKeyOnly: boolean;
  };
  readonly finalChoice: {
    readonly selected: 'blind_intent' | 'engine_top';
    readonly sealedAtMs: number;
  };
  readonly counterfactuals: {
    readonly blindCapsuleDigest: string;
    readonly engineTopCapsuleDigest: string;
    readonly blindPanelTotal: number;
    readonly engineTopPanelTotal: number;
    readonly finalPolicyPanelTotal: number;
  };
}

export function validateD569OverrideEvidence(
  evidence: D569OverrideEvidence,
): readonly D569ExperimentViolation[] {
  const violations: D569ExperimentViolation[] = [];
  addViolation(violations,
    canonicalEqual(evidence.stageOrder,
      ['blind_intent_sealed', 'engine_top_revealed', 'final_policy_choice_sealed']),
  'override_stage_order', 'blind intent must be sealed before engine-top advice is revealed');
  addViolation(violations, evidence.blindSeal.sealedAtMs < evidence.topAdvice.revealedAtMs &&
    evidence.topAdvice.revealedAtMs < evidence.finalChoice.sealedAtMs,
  'override_time_order', 'override timestamps violate sealed stage order');
  addViolation(violations, evidence.topAdvice.answerKeyOnly, 'override_top_visibility',
    'engine-top evidence must remain answer-key-only before reveal');
  addViolation(violations, sha256(evidence.blindSeal.intentText) === evidence.blindSeal.intentSha256,
    'override_blind_seal_hash', 'sealed blind intent bytes do not match their hash');
  addViolation(violations, evidence.blindSeal.capsuleDigest === evidence.topAdvice.capsuleDigest &&
    evidence.blindSeal.capsuleDigest === evidence.counterfactuals.blindCapsuleDigest &&
    evidence.blindSeal.capsuleDigest === evidence.counterfactuals.engineTopCapsuleDigest,
  'override_capsule', 'both counterfactuals must share the sealed blind capsule');
  return violations;
}

export function d569OverrideImprovement(
  evidence: readonly D569OverrideEvidence[],
  bootstrapSeed: number,
  resamples: number = D569_BOOTSTRAP_RESAMPLES,
): D569MetricReport & { readonly improves: boolean } {
  const values = evidence.map((row, index) => ({
    seed: index,
    value: row.counterfactuals.finalPolicyPanelTotal - row.counterfactuals.engineTopPanelTotal,
  }));
  const report = metric(values, resamples, bootstrapSeed);
  return { ...report, improves: report.mean >= 0.20 && report.interval.lower > 0 };
}
