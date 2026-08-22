import { z } from 'zod';
import { decisionProgramSchema } from './dm-bridge/round-plan-contract';
import { ROUND_PLAN_ENVELOPE_NORMALIZATION_RULES } from './dm-bridge/round-plan-envelope-normalization';

export const VTT_EXPERIMENT_SCHEMA_VERSION = 5 as const;
export const VTT_EXPERIMENT_MINIMUM_SCHEMA_VERSION = 1 as const;

const text = z.string().min(1);
const nullableText = text.nullable();
const nonNegative = z.number().finite().nonnegative();
const nullableNonNegative = nonNegative.nullable();
const nonNegativeInteger = z.number().int().nonnegative();
const digest = z.string().regex(/^[a-f0-9]{64}$/u);

export const promptComponentTelemetrySchema = z.strictObject({
  version: nullableText,
  digest: nullableText,
  bytes: nonNegativeInteger,
  estimatedTokens: nonNegativeInteger,
});

const experimentCallRecordV3Schema = z.strictObject({
  logicalCallId: text,
  parentCallId: nullableText,
  transcriptId: text,
  telemetryLink: text,
  requestId: text,
  phase: z.enum(['initial_plan', 'correction', 'reconsult', 'narration', 'pc_plan']),
  requestKind: text,
  attemptIndex: nonNegativeInteger,
  round: nonNegativeInteger,
  actorIds: z.array(text),
  livingMonsterIds: z.array(text),
  startedAt: text,
  finishedAt: text,
  firstTokenMs: nullableNonNegative,
  processStartupMs: nullableNonNegative,
  queueMs: nullableNonNegative,
  exchangeMs: nullableNonNegative,
  modelWaitMs: nullableNonNegative,
  algorithmMs: nullableNonNegative,
  validationMs: nullableNonNegative,
  compileMs: nullableNonNegative,
  executionMs: nullableNonNegative,
  latencyMs: nonNegative,
  estimatedCallCostUsd: nullableNonNegative,
  promptComponents: z.strictObject({
    instructions: promptComponentTelemetrySchema,
    schemaGrammar: promptComponentTelemetrySchema,
    examples: promptComponentTelemetrySchema,
    skills: promptComponentTelemetrySchema,
    library: promptComponentTelemetrySchema,
    projection: promptComponentTelemetrySchema,
    history: promptComponentTelemetrySchema,
  }),
  contractId: text,
  fullStateHash: digest,
  transmittedViewHash: digest,
  snapshotBytes: nonNegativeInteger,
  deltaBytes: nonNegativeInteger,
  bytesSent: nonNegativeInteger,
  reconstructionFailureCount: nonNegativeInteger,
  historySentCount: nonNegativeInteger,
  historyOmittedCount: nonNegativeInteger,
  cacheAgeMs: nullableNonNegative,
  cacheRatio: nullableNonNegative,
  reconstructionMatched: z.boolean(),
  referencedCombatantIds: z.array(text),
  referencedResourceIds: z.array(text),
  outputBytes: nonNegativeInteger,
  inputTokens: nonNegativeInteger,
  cachedInputTokens: nonNegativeInteger,
  outputTokens: nonNegativeInteger,
  reasoningTokens: nonNegativeInteger,
  reasoningTokenShare: nullableNonNegative,
  firstPassValid: z.boolean(),
  validationResult: z.enum(['valid', 'invalid', 'not_run']),
  validatorErrorCategory: nullableText,
  compileErrorCategory: nullableText,
  failedSchemaPath: nullableText,
  correctionAttempt: nonNegativeInteger,
  correctionBudget: nonNegativeInteger,
  correctionOfCallId: nullableText,
  reconsultReason: nullableText,
  invalidationEvent: nullableText,
  abortCategory: nullableText,
  abortReason: nullableText,
  sourceChars: nonNegativeInteger,
  sourceBytes: nonNegativeInteger,
  sourceTokenEstimate: nonNegativeInteger,
  sourceHash: digest,
  astNodeCount: nullableNonNegative,
  astHash: nullableText,
  programDepth: nullableNonNegative,
  branchCount: nullableNonNegative,
  branchCoverage: nullableNonNegative,
  compileValid: z.boolean(),
  sandboxStepCount: nullableNonNegative,
  sandboxTimeMs: nullableNonNegative,
  boundViolation: z.boolean(),
  ambientAuthorityViolation: z.boolean(),
  chosenBranchTrace: z.array(text),
  emittedAction: z.unknown().nullable(),
  emittedActionValid: z.boolean(),
  legalActionSetHash: digest,
  preStateHash: digest,
  postStateHash: digest,
  executionDry: z.boolean(),
  phaseBoundary: nullableText,
  batchSize: nonNegativeInteger,
  callActivationFanout: nonNegativeInteger,
  planAgeRevisions: nonNegativeInteger,
  algorithmRankedActions: z.array(z.unknown()),
  algorithmExpectedValues: z.array(z.number().finite()),
  triggerReason: nullableText,
  stance: nullableText,
  proposedOverride: z.unknown().nullable(),
  overrideEditCount: nonNegativeInteger,
  overrideChars: nonNegativeInteger,
  overrideAccepted: z.boolean(),
  fallbackUsed: z.boolean(),
  activationsWithoutModel: nonNegativeInteger,
  normalizedPatternHash: nullableText,
  clusterFrequency: nullableNonNegative,
  promotionEpoch: nullableNonNegative,
  libraryFunction: nullableText,
  libraryParameters: z.unknown().nullable(),
  libraryHit: z.boolean(),
  expansionHash: nullableText,
  expandedTokenEstimate: nonNegativeInteger,
  expansionEquivalent: z.boolean(),
  parameterError: nullableText,
  sourceProjection: z.unknown(),
  generatedSource: z.unknown(),
  parsedOrCompiled: z.unknown().nullable(),
  expandedLibraryForm: z.unknown().nullable(),
  replayProof: z.unknown().nullable(),
});

export const typeCheckUniqueCatchObservationSchema = z.strictObject({
  monsterId: text,
  source: text,
  sourceHash: digest,
  diagnosticCodes: z.array(nonNegativeInteger),
  outcome: z.enum(['caughtByBoth', 'caughtOnlyByTypeCheck']),
  runtimeError: nullableText,
});

export const experimentCallRecordV4Schema = experimentCallRecordV3Schema.extend({
  typeCheckUniqueCatchObservations: z.array(typeCheckUniqueCatchObservationSchema),
});

const typeCheckProgramCountsSchema = z.strictObject({
  checkedProgramCount: nonNegativeInteger,
  passedProgramCount: nonNegativeInteger,
  failedProgramCount: nonNegativeInteger,
}).refine(
  (counts) => counts.checkedProgramCount === counts.passedProgramCount + counts.failedProgramCount,
  { message: 'Checked program count must equal passed plus failed program counts.' },
);

export const experimentCallRecordSchema = experimentCallRecordV4Schema.extend({
  envelopeNormalizationRule: z.enum(ROUND_PLAN_ENVELOPE_NORMALIZATION_RULES).nullable(),
  typeCheckProgramCounts: typeCheckProgramCountsSchema.nullable(),
});

const experimentCallRecordV2Schema = experimentCallRecordV3Schema.omit({
  bytesSent: true,
  reconstructionFailureCount: true,
});

export const rolloutInputCaptureV1Schema = z.strictObject({
  logicalCallId: text,
  stateHash: digest,
  legalActionSetHash: digest,
  selectedAction: z.unknown().nullable(),
  input: z.unknown(),
});

const selectedTurnProgramSchema = z.strictObject({
  monsterId: text,
  program: decisionProgramSchema,
});

const rankedCandidateTurnSchema = z.strictObject({
  rank: z.number().int().positive(),
  score: z.number().finite(),
  stableSortKey: text,
  program: decisionProgramSchema,
});

const candidateTurnSetSchema = z.strictObject({
  monsterId: text,
  candidates: z.array(rankedCandidateTurnSchema),
});

export const rolloutInputCaptureSchema = z.strictObject({
  logicalCallId: text,
  stateHash: digest,
  legalActionSetHash: digest,
  selectedAction: z.array(selectedTurnProgramSchema),
  input: z.unknown(),
  serializedEncounterState: text,
  candidateTurnK: z.number().int().positive(),
  candidateTurns: z.array(candidateTurnSetSchema),
});

const experimentQualityBlockShape = {
  rolloutOracleVersion: nullableText,
  rolloutHorizon: nullableNonNegative,
  rolloutCount: nullableNonNegative,
  rolloutSeedDigest: nullableText,
  candidateActionProgramHashes: z.array(text),
  candidateUtilities: z.array(z.number().finite()),
  selectedUtility: z.number().finite().nullable(),
  bestUtility: z.number().finite().nullable(),
  normalizedTacticalRegret: z.number().finite().min(0).max(1).nullable(),
  targetOracleVerdict: nullableText,
  targetOracleViolation: z.boolean().nullable(),
  simBaselineVersion: nullableText,
  simExpectedDamage: z.number().finite().nullable(),
  tacticalEfficiencyRatio: z.number().finite().nullable(),
  resourceDisciplineRatio: z.number().finite().nullable(),
  expectedResolutionBand: z.tuple([z.number().finite(), z.number().finite()]).nullable(),
  fightShapeDelta: z.number().finite().nullable(),
  narrationSampleIds: z.array(text),
  blindAssignment: nullableText,
  raterModel: nullableText,
  raterEffort: nullableText,
  raterPromptHash: nullableText,
  dimensionScores: z.array(z.number().finite()),
  disagreementStatus: nullableText,
  adjudicationStatus: nullableText,
  regretStatus: z.enum(['deferred', 'computed']),
} satisfies z.ZodRawShape;

export const experimentQualityBlockV1Schema = z.strictObject({
  ...experimentQualityBlockShape,
  rolloutInputCaptures: z.array(rolloutInputCaptureV1Schema),
});

export const experimentQualityBlockSchema = z.strictObject({
  ...experimentQualityBlockShape,
  rolloutInputCaptures: z.array(rolloutInputCaptureSchema),
});

const experimentTableRecordShape = {
  programVersion: text,
  experimentId: text,
  experimentVersion: text,
  preregistrationDigest: digest,
  armId: text,
  batchId: text,
  pairId: text,
  replicate: z.number().int().positive(),
  tableIndex: nonNegativeInteger,
  seed: nonNegativeInteger,
  randomizedArmOrdinal: nonNegativeInteger,
  fixtureId: text,
  fixtureDigest: digest,
  matchupFamily: text,
  enemyCountStratum: nonNegativeInteger,
  partySource: text,
  partyDigest: digest,
  configurationManifestDigest: digest,
  controllerSide: z.enum(['dm', 'pc']),
  controllerMode: text,
  modelId: text,
  reasoningEffort: text,
  initiativeMode: text,
  initiativeOrder: z.array(text),
  promptVariant: text,
  schemaVariant: text,
  exampleCount: nonNegativeInteger,
  instructionVersion: text,
  skillSetVersion: text,
  planSurface: text,
  projectionMode: text,
  libraryVersion: text,
  correctionBudget: nonNegativeInteger,
  pricingVersion: text,
  buildId: nullableText,
  commit: nullableText,
  loadLevelTag: nullableText,
  status: z.enum(['completed', 'aborted']),
  completedRounds: nonNegativeInteger,
  resolutionRound: nullableNonNegative,
  winner: nullableText,
  dmCalls: nonNegativeInteger,
  pcCalls: nonNegativeInteger,
  callsPerRound: nonNegative,
  completedRoundsPerHour: nonNegative,
  correctionCount: nonNegativeInteger,
  correctionExhausted: z.boolean(),
  reconsultCount: nonNegativeInteger,
  staleReferenceCount: nonNegativeInteger,
  dryProgramCount: nonNegativeInteger,
  damageBySide: z.record(z.string(), z.number().finite()),
  hpCurveBySide: z.record(z.string(), z.array(z.number().finite())),
  firstDownRound: nullableNonNegative,
  firstDeathRound: nullableNonNegative,
  resourceAvailableCount: nonNegativeInteger,
  resourceUseCount: nonNegativeInteger,
  wastedTurnCount: nonNegativeInteger,
  bridgeRestartCount: nonNegativeInteger,
  timeoutCount: nonNegativeInteger,
  gapCount: nonNegativeInteger,
  replayBundleDigest: nullableText,
  replayProofPassed: z.boolean(),
  totalWallMs: nonNegative,
  idleWaitMs: nonNegative,
  estimatedTableCostUsd: nullableNonNegative,
} satisfies z.ZodRawShape;

export const experimentTableRecordV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  ...experimentTableRecordShape,
  calls: z.array(experimentCallRecordV2Schema),
  quality: experimentQualityBlockV1Schema,
});

export const experimentTableRecordV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  ...experimentTableRecordShape,
  calls: z.array(experimentCallRecordV2Schema),
  quality: experimentQualityBlockSchema,
});

export const experimentTableRecordV3Schema = z.strictObject({
  schemaVersion: z.literal(3),
  ...experimentTableRecordShape,
  calls: z.array(experimentCallRecordV3Schema),
  quality: experimentQualityBlockSchema,
});

export const experimentTableRecordV4Schema = z.strictObject({
  schemaVersion: z.literal(4),
  ...experimentTableRecordShape,
  calls: z.array(experimentCallRecordV4Schema),
  quality: experimentQualityBlockSchema,
});

export const experimentTableRecordSchema = z.strictObject({
  schemaVersion: z.literal(VTT_EXPERIMENT_SCHEMA_VERSION),
  ...experimentTableRecordShape,
  calls: z.array(experimentCallRecordSchema),
  quality: experimentQualityBlockSchema,
});

export type PromptComponentTelemetry = z.infer<typeof promptComponentTelemetrySchema>;
export type ExperimentCallRecord = z.infer<typeof experimentCallRecordSchema>;
export type RolloutInputCapture = z.infer<typeof rolloutInputCaptureSchema>;
export type ExperimentQualityBlock = z.infer<typeof experimentQualityBlockSchema>;
export type ExperimentTableRecordV1 = z.infer<typeof experimentTableRecordV1Schema>;
export type ExperimentTableRecordV2 = z.infer<typeof experimentTableRecordV2Schema>;
export type ExperimentTableRecordV3 = z.infer<typeof experimentTableRecordV3Schema>;
export type ExperimentTableRecordV4 = z.infer<typeof experimentTableRecordV4Schema>;
export type ExperimentTableRecordV5 = z.infer<typeof experimentTableRecordSchema>;
export type ExperimentTableRecord =
  | ExperimentTableRecordV1
  | ExperimentTableRecordV2
  | ExperimentTableRecordV3
  | ExperimentTableRecordV4
  | ExperimentTableRecordV5;

export function decodeExperimentTableRecord(value: unknown): ExperimentTableRecord {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value)) {
    throw new TypeError('Experiment table has no schema version.');
  }
  const version = value.schemaVersion;
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < VTT_EXPERIMENT_MINIMUM_SCHEMA_VERSION ||
    version > VTT_EXPERIMENT_SCHEMA_VERSION
  ) {
    throw new Error('Experiment table is outside the supported schema-version window.');
  }
  switch (version) {
    case 1:
      return experimentTableRecordV1Schema.parse(value);
    case 2:
      return experimentTableRecordV2Schema.parse(value);
    case 3:
      return experimentTableRecordV3Schema.parse(value);
    case 4:
      return experimentTableRecordV4Schema.parse(value);
    case 5:
      return experimentTableRecordSchema.parse(value);
  }
  throw new Error('Experiment table schema-version dispatch is incomplete.');
}

export interface DistributionSummary {
  readonly median: number | null;
  readonly q1: number | null;
  readonly q3: number | null;
  readonly iqr: number | null;
}

export interface ExperimentArmAggregate {
  readonly armId: string;
  readonly tableCount: number;
  readonly completedCount: number;
  readonly abortedCount: number;
  readonly completionRate: number;
  readonly totalWallMs: DistributionSummary;
  readonly completedRoundsPerHour: DistributionSummary;
  readonly latencyMs: DistributionSummary;
  readonly correctionRate: number;
  readonly firstPassValidity: number;
  readonly meanCorrectionRoundsPerDecision: number;
  readonly wallClockMsPerCompletedRound: number | null;
  readonly bytesSent: number;
  readonly reconstructionFailures: number;
  readonly tokenTotals: {
    readonly input: number;
    readonly cachedInput: number;
    readonly output: number;
    readonly reasoning: number;
  };
  readonly typeCheckProgramCounts: {
    readonly checkedProgramCount: number;
    readonly passedProgramCount: number;
    readonly failedProgramCount: number;
  } | null;
  readonly typeCheckUniqueCatch: {
    readonly rejectedProgramCount: number;
    readonly caughtByBothCount: number;
    readonly caughtOnlyByTypeCheckCount: number;
    readonly rate: number | null;
    readonly topUniqueDiagnosticCodes: readonly {
      readonly code: number;
      readonly count: number;
      readonly exampleProgram: string;
    }[];
  };
}

export interface DecisionCorrectionMetrics {
  readonly decisionPointCount: number;
  readonly correctedDecisionPointCount: number;
  readonly correctionRoundCount: number;
  readonly correctionRate: number;
  readonly firstPassValidity: number;
  readonly meanCorrectionRoundsPerDecision: number;
}

export function decisionCorrectionMetrics(
  calls: readonly Pick<ExperimentCallRecord, 'logicalCallId' | 'parentCallId' | 'phase'>[],
): DecisionCorrectionMetrics {
  const decisionPoints = calls.filter((call) => call.phase === 'initial_plan' || call.phase === 'reconsult');
  const correctedRoots = new Set(calls
    .filter((call) => call.phase === 'correction' && call.parentCallId !== null)
    .map((call) => call.parentCallId));
  const correctedDecisionPointCount = decisionPoints.filter((call) => correctedRoots.has(call.logicalCallId)).length;
  const correctionRoundCount = calls.filter((call) => call.phase === 'correction').length;
  const decisionPointCount = decisionPoints.length;
  return {
    decisionPointCount,
    correctedDecisionPointCount,
    correctionRoundCount,
    correctionRate: decisionPointCount === 0 ? 0 : correctedDecisionPointCount / decisionPointCount,
    firstPassValidity: decisionPointCount === 0 ? 0 : (decisionPointCount - correctedDecisionPointCount) / decisionPointCount,
    meanCorrectionRoundsPerDecision: decisionPointCount === 0 ? 0 : correctionRoundCount / decisionPointCount,
  };
}

function quantile(sorted: readonly number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const left = sorted[lower];
  const right = sorted[upper];
  if (left === undefined || right === undefined) throw new Error('Quantile index escaped its input.');
  return left + (right - left) * (position - lower);
}

export function distribution(values: readonly number[]): DistributionSummary {
  const sorted = [...values].sort((left, right) => left - right);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  return {
    median: quantile(sorted, 0.5),
    q1,
    q3,
    iqr: q1 === null || q3 === null ? null : q3 - q1,
  };
}

export function aggregateExperimentRecords(
  records: readonly ExperimentTableRecord[],
): readonly ExperimentArmAggregate[] {
  const armIds = [...new Set(records.map((record) => record.armId))].sort();
  return armIds.map((armId) => {
    const tables = records.filter((record) => record.armId === armId);
    const calls = tables.flatMap((record) => record.calls);
    const completedCount = tables.filter((record) => record.status === 'completed').length;
    const corrections = decisionCorrectionMetrics(calls);
    const completedRounds = tables.reduce((sum, record) => sum + record.completedRounds, 0);
    const uniqueCatchObservations = calls.flatMap((call) =>
      'typeCheckUniqueCatchObservations' in call
        ? typeCheckUniqueCatchObservationSchema.array().parse(call.typeCheckUniqueCatchObservations)
        : []);
    const typeCheckProgramCounts = calls.flatMap((call) =>
      'typeCheckProgramCounts' in call && call.typeCheckProgramCounts !== null
        ? [typeCheckProgramCountsSchema.parse(call.typeCheckProgramCounts)]
        : []);
    const caughtOnly = uniqueCatchObservations.filter((observation) => observation.outcome === 'caughtOnlyByTypeCheck');
    const diagnosticCounts = new Map<number, { count: number; exampleProgram: string }>();
    for (const observation of caughtOnly) {
      for (const code of new Set(observation.diagnosticCodes)) {
        const current = diagnosticCounts.get(code);
        diagnosticCounts.set(code, {
          count: (current?.count ?? 0) + 1,
          exampleProgram: current?.exampleProgram ?? observation.source,
        });
      }
    }
    return {
      armId,
      tableCount: tables.length,
      completedCount,
      abortedCount: tables.length - completedCount,
      completionRate: tables.length === 0 ? 0 : completedCount / tables.length,
      totalWallMs: distribution(tables.map((record) => record.totalWallMs)),
      completedRoundsPerHour: distribution(tables.map((record) => record.completedRoundsPerHour)),
      latencyMs: distribution(calls.map((call) => call.latencyMs)),
      correctionRate: corrections.correctionRate,
      firstPassValidity: corrections.firstPassValidity,
      meanCorrectionRoundsPerDecision: corrections.meanCorrectionRoundsPerDecision,
      wallClockMsPerCompletedRound: completedRounds === 0
        ? null
        : tables.reduce((sum, record) => sum + record.totalWallMs, 0) / completedRounds,
      bytesSent: calls.reduce(
        (sum, call) => {
          const value: unknown = 'bytesSent' in call ? call.bytesSent : 0;
          return sum + (typeof value === 'number' ? value : 0);
        },
        0,
      ),
      reconstructionFailures: calls.reduce(
        (sum, call) => {
          const value: unknown = 'reconstructionFailureCount' in call
            ? call.reconstructionFailureCount
            : 0;
          return sum + (typeof value === 'number' ? value : 0);
        },
        0,
      ),
      tokenTotals: {
        input: calls.reduce((sum, call) => sum + call.inputTokens, 0),
        cachedInput: calls.reduce((sum, call) => sum + call.cachedInputTokens, 0),
        output: calls.reduce((sum, call) => sum + call.outputTokens, 0),
        reasoning: calls.reduce((sum, call) => sum + call.reasoningTokens, 0),
      },
      typeCheckProgramCounts: typeCheckProgramCounts.length === 0
        ? null
        : {
            checkedProgramCount: typeCheckProgramCounts.reduce(
              (sum, counts) => sum + counts.checkedProgramCount,
              0,
            ),
            passedProgramCount: typeCheckProgramCounts.reduce(
              (sum, counts) => sum + counts.passedProgramCount,
              0,
            ),
            failedProgramCount: typeCheckProgramCounts.reduce(
              (sum, counts) => sum + counts.failedProgramCount,
              0,
            ),
          },
      typeCheckUniqueCatch: {
        rejectedProgramCount: uniqueCatchObservations.length,
        caughtByBothCount: uniqueCatchObservations.length - caughtOnly.length,
        caughtOnlyByTypeCheckCount: caughtOnly.length,
        rate: uniqueCatchObservations.length === 0 ? null : caughtOnly.length / uniqueCatchObservations.length,
        topUniqueDiagnosticCodes: [...diagnosticCounts]
          .map(([code, value]) => ({ code, ...value }))
          .sort((left, right) => right.count - left.count || left.code - right.code)
          .slice(0, 5),
      },
    };
  });
}

export function computeTacticalRegretFromCaptures(
  _captures: readonly RolloutInputCapture[],
): never {
  throw new Error(
    'E01 tactical-regret rollouts are not implemented. Re-run with --skip-regret and analyze the captured rollout inputs later.',
  );
}
