import { z } from 'zod';

export const VTT_EXPERIMENT_SCHEMA_VERSION = 1 as const;

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

export const experimentCallRecordSchema = z.strictObject({
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

export const rolloutInputCaptureSchema = z.strictObject({
  logicalCallId: text,
  stateHash: digest,
  legalActionSetHash: digest,
  selectedAction: z.unknown().nullable(),
  input: z.unknown(),
});

export const experimentQualityBlockSchema = z.strictObject({
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
  rolloutInputCaptures: z.array(rolloutInputCaptureSchema),
  regretStatus: z.enum(['deferred', 'computed']),
});

export const experimentTableRecordSchema = z.strictObject({
  schemaVersion: z.literal(VTT_EXPERIMENT_SCHEMA_VERSION),
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
  calls: z.array(experimentCallRecordSchema),
  quality: experimentQualityBlockSchema,
});

export type PromptComponentTelemetry = z.infer<typeof promptComponentTelemetrySchema>;
export type ExperimentCallRecord = z.infer<typeof experimentCallRecordSchema>;
export type RolloutInputCapture = z.infer<typeof rolloutInputCaptureSchema>;
export type ExperimentQualityBlock = z.infer<typeof experimentQualityBlockSchema>;
export type ExperimentTableRecord = z.infer<typeof experimentTableRecordSchema>;

export function decodeExperimentTableRecord(value: unknown): ExperimentTableRecord {
  return experimentTableRecordSchema.parse(value);
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
  readonly tokenTotals: {
    readonly input: number;
    readonly cachedInput: number;
    readonly output: number;
    readonly reasoning: number;
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
    const dmCalls = tables.reduce((sum, record) => sum + record.dmCalls, 0);
    return {
      armId,
      tableCount: tables.length,
      completedCount,
      abortedCount: tables.length - completedCount,
      completionRate: tables.length === 0 ? 0 : completedCount / tables.length,
      totalWallMs: distribution(tables.map((record) => record.totalWallMs)),
      completedRoundsPerHour: distribution(tables.map((record) => record.completedRoundsPerHour)),
      latencyMs: distribution(calls.map((call) => call.latencyMs)),
      correctionRate: dmCalls === 0
        ? 0
        : tables.reduce((sum, record) => sum + record.correctionCount, 0) / dmCalls,
      tokenTotals: {
        input: calls.reduce((sum, call) => sum + call.inputTokens, 0),
        cachedInput: calls.reduce((sum, call) => sum + call.cachedInputTokens, 0),
        output: calls.reduce((sum, call) => sum + call.outputTokens, 0),
        reasoning: calls.reduce((sum, call) => sum + call.reasoningTokens, 0),
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
