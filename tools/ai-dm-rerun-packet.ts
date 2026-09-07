import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { canonicalJson } from '../src/commands/canonical-json';

export const R1_10_SEEDS = [
  5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005,
  5_117_006, 5_117_007, 5_117_008, 5_117_009, 5_117_010,
] as const;

export const BRUTAL_10_SEEDS = [
  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
] as const;

export const R1_10_REPS = 3 as const;
export const BRUTAL_10_REPS = 3 as const;
export const RERUN_PACKET_VERSION = 'ai-dm-rerun-packet-v1' as const;
const STANDARD_INITIATIVE_POLICY = 'initiative-intel-v1';

const jsonRecordSchema = z.record(z.string(), z.unknown());
type JsonRecord = z.infer<typeof jsonRecordSchema>;

const safeIntegerSchema = z.number().int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

const engineIntelSchema = z.object({
  policy: z.literal('dm-intel-capture-v1'),
  policyVersions: z.object({
    initiative: z.literal(STANDARD_INITIATIVE_POLICY),
  }).passthrough(),
  actors: z.array(z.unknown()),
}).passthrough();

// The two era-specific authorized-plan shapes. Baseline-era entries carry
// acceptedIntent (single choice); post-intel entries carry resolutionSummary
// with actionSlots. Both normalize to NeutralPlanEntry below — the packet must
// never expose either raw shape, because the shape itself identifies the era.
const baselineChoiceSchema = z.object({
  kind: z.string(),
  action_id: z.string().optional(),
  spell_id: z.string().optional(),
  target: z.object({ kind: z.string(), combatant_id: z.string().optional() }).passthrough().nullable().optional(),
}).passthrough();

const currentActionSlotSchema = z.object({
  kind: z.string(),
  actionId: z.string().nullable().optional(),
  spellId: z.string().nullable().optional(),
  objectId: z.string().nullable().optional(),
  targetIds: z.array(z.string()).optional(),
}).passthrough();

// Post-intel executed summary: multi-slot.
const currentResolutionSummarySchema = z.object({
  actionSlots: z.array(currentActionSlotSchema),
  movementFeet: z.number().optional(),
}).passthrough();

// Baseline-era executed summary: single action. Real baseline rows carry BOTH
// acceptedIntent and this summary (round-2 review finding, verified against
// harvested R1-10 rows).
const baselineResolutionSummarySchema = z.object({
  actionId: z.string().nullable(),
  targetId: z.string().nullable(),
  movementFeet: z.number().optional(),
}).passthrough();

const authorizedPlanEntrySchema = z.object({
  actorId: z.unknown(),
  reason: z.string().max(240).optional(),
  acceptedIntent: z.object({ choice: baselineChoiceSchema }).passthrough().optional(),
  resolutionSummary: z.union([currentResolutionSummarySchema, baselineResolutionSummarySchema]).optional(),
}).passthrough();

const plannerSchema = z.union([
  z.literal('sim_controller'),
  z.object({ model: z.string(), effort: z.string() }).passthrough(),
  z.null(),
]);
const primaryPlannerSchema = z.enum(['model', 'engine_default', 'sim_controller']);
const overrideKindSchema = z.enum([
  'objective', 'morale', 'roleplay', 'resource_conservation', 'unknown_engine_gap',
  'engine_play', 'missing_metric',
]);
const overrideRejectionSchema = z.object({
  actorId: z.string().nullable(),
  code: z.literal('OVERRIDE_UNJUSTIFIED'),
}).strict();

export interface NeutralAction {
  readonly kind: string;
  readonly actionId: string | null;
  readonly targetIds: readonly string[];
}

/** Era-neutral executed-plan entry: the only plan shape a judge may see. */
export interface NeutralPlanEntry {
  readonly actorId: unknown;
  /** Judge-visible only in an explicitly reason-enabled packet. */
  readonly reason?: string;
  readonly actions: readonly NeutralAction[];
  /** Executed movement, present in both eras' summaries; null when unrecorded. */
  readonly movementFeet: number | null;
}

const commonArenaRowSchema = z.object({
  seed: safeIntegerSchema,
  arm: z.string().min(1),
  room: safeIntegerSchema,
  round: safeIntegerSchema,
  startingRoomDigest: z.string().min(1),
  combatModel: z.literal('initiative_segments_v1'),
  initiativeOrder: z.array(z.unknown()),
  outcome: z.enum([
    'authorized', 'auto_resolved', 'awaiting_dm_adjudication',
    'refused', 'service_null', 'local_error', 'execution_failed', 'partial_execution',
  ]),
  plannedBy: plannerSchema,
  roundNarrative: z.string().nullable(),
  authorizedPlan: z.array(authorizedPlanEntrySchema).nullable(),
  // Optional/nullable: pre-intel-era arms have no engineIntel, and the current
  // producer writes null on failed rows. It must never reach the blinded
  // packet — its mere presence identifies the arm.
  engineIntel: engineIntelSchema.nullable().optional(),
  // Post-intel rows label the planner ('model' | 'engine_default'); pre-intel
  // rows have no such field. Attribution uses it when present.
  plannerLabel: z.string().nullable().optional(),
  planner: primaryPlannerSchema.optional(),
  overrideKinds: z.array(overrideKindSchema).optional(),
  overrideRejections: z.array(overrideRejectionSchema).optional(),
  // Required in cross-era mode, where it is the arm partition key.
  repoCommit: z.string().min(1).optional(),
});

const postShiftOnlyFieldNames = [
  'decisionTransport', 'firstDecisionAccepted', 'decisionAttempts',
  'decisionRejectionCodes', 'normalizationCodes', 'chosenOptionIndices',
  'instructionSource', 'skillName', 'skillHash', 'rationale', 'overridePolicy',
] as const;

const chosenOptionIndicesSchema = z.array(z.object({
  actorId: z.unknown(),
  primaryOptionIndex: safeIntegerSchema.min(0),
  fallbackOptionIndex: safeIntegerSchema.min(0).nullable(),
}));

const postShiftCommonArenaRowSchema = commonArenaRowSchema.extend({
  overridePolicy: z.enum(['strict', 'typed_reason']).default('typed_reason'),
  firstDecisionAccepted: z.boolean(),
  decisionAttempts: safeIntegerSchema.min(0),
  decisionRejectionCodes: z.array(z.string()),
  normalizationCodes: z.array(z.string()),
  instructionSource: z.enum(['none', 'kb', 'skill']),
  skillName: z.enum(['engine-submission', 'dm-round']).nullable(),
  skillHash: z.string().regex(/^[0-9a-f]{64}$/u).nullable(),
  rationale: z.string().max(600).nullable(),
});

const mcpMinimalPostShiftArenaRowSchema = postShiftCommonArenaRowSchema.extend({
  decisionTransport: z.literal('mcp_minimal'),
}).passthrough();

const finalIndicesPostShiftArenaRowSchema = postShiftCommonArenaRowSchema.extend({
  decisionTransport: z.literal('final_indices'),
  chosenOptionIndices: chosenOptionIndicesSchema,
}).passthrough();

const postShiftArenaRowSchema = z.discriminatedUnion('decisionTransport', [
  mcpMinimalPostShiftArenaRowSchema,
  finalIndicesPostShiftArenaRowSchema,
]).superRefine((row, context) => {
  if (row.decisionTransport === 'mcp_minimal' && Object.prototype.hasOwnProperty.call(row, 'chosenOptionIndices')) {
    context.addIssue({
      code: 'custom',
      path: ['chosenOptionIndices'],
      message: 'must be absent when decisionTransport is mcp_minimal',
    });
  }
});

const preShiftArenaRowSchema = commonArenaRowSchema.passthrough().superRefine((row, context) => {
  for (const field of postShiftOnlyFieldNames) {
    if (Object.prototype.hasOwnProperty.call(row, field)) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: 'must be absent on a pre-shift row',
      });
    }
  }
});

type PreShiftArenaRow = z.infer<typeof preShiftArenaRowSchema>;
type CommonArenaRow = z.infer<typeof commonArenaRowSchema>;
type ChosenOptionIndices = z.infer<typeof chosenOptionIndicesSchema>;
type McpMinimalPostShiftArenaRow = CommonArenaRow & {
  readonly decisionTransport: 'mcp_minimal';
  readonly overridePolicy: 'strict' | 'typed_reason';
  readonly firstDecisionAccepted: boolean;
  readonly decisionAttempts: number;
  readonly decisionRejectionCodes: readonly string[];
  readonly normalizationCodes: readonly string[];
  readonly instructionSource: 'none' | 'kb' | 'skill';
  readonly skillName: 'engine-submission' | 'dm-round' | null;
  readonly skillHash: string | null;
  readonly rationale: string | null;
};
type FinalIndicesPostShiftArenaRow = CommonArenaRow & {
  readonly decisionTransport: 'final_indices';
  readonly overridePolicy: 'strict' | 'typed_reason';
  readonly firstDecisionAccepted: boolean;
  readonly decisionAttempts: number;
  readonly decisionRejectionCodes: readonly string[];
  readonly normalizationCodes: readonly string[];
  readonly chosenOptionIndices: ChosenOptionIndices;
  readonly instructionSource: 'none' | 'kb' | 'skill';
  readonly skillName: 'engine-submission' | 'dm-round' | null;
  readonly skillHash: string | null;
  readonly rationale: string | null;
};
type PostShiftArenaRow = McpMinimalPostShiftArenaRow | FinalIndicesPostShiftArenaRow;

type ParsedArenaRow =
  | { readonly rowEra: 'pre_shift'; readonly row: PreShiftArenaRow }
  | { readonly rowEra: 'post_shift'; readonly row: PostShiftArenaRow };

export interface RerunProtocol {
  readonly name?: RerunProtocolName;
  readonly seeds: readonly number[];
  readonly reps: number;
}

export type RerunProtocolName = 'r1-10' | 'brutal-10';

export interface RerunPacketBuilderOptions {
  /** Decision reasons are excluded unless this is explicitly true. */
  readonly reasonsVisible?: boolean;
  /** Optional arm allowlist for a mixed visibility packet such as D490's V arm. */
  readonly reasonVisibleArms?: readonly string[];
}

export const R1_10_PROTOCOL: RerunProtocol = {
  name: 'r1-10', seeds: R1_10_SEEDS, reps: R1_10_REPS,
};
export const BRUTAL_10_PROTOCOL: RerunProtocol = {
  name: 'brutal-10', seeds: BRUTAL_10_SEEDS, reps: BRUTAL_10_REPS,
};

export interface RerunPacketConfig {
  readonly inputPaths: readonly string[];
  readonly packetPath: string;
  readonly answerKeyPath: string;
  readonly shuffleSeed: number;
  readonly protocol: RerunProtocolName;
  readonly reps: 1 | 3;
  /**
   * Cross-era comparison mode: the two arms ran DIFFERENT code eras against
   * byte-identical frozen room inputs. Arms are partitioned by repoCommit
   * (which every row must carry), because the arena's `arm` label and the
   * canonical-state startingRoomDigest are both era-dependent — the digest
   * hashes the loaded EncounterState, whose shape changes across eras, so
   * cross-arm digest equality is impossible by construction. In this mode the
   * digest check becomes per-arm consistency (same seed must produce the same
   * digest across reps within an arm); room-INPUT identity across eras is an
   * external precondition the runner must verify (byte-compare the frozen
   * seed files) and record.
   */
  readonly crossEra: boolean;
}

interface CommonValidatedArenaRow {
  readonly seed: number;
  readonly arm: string;
  readonly room: number;
  readonly rep: number;
  readonly startingRoomDigest: string;
  readonly outcome: string;
  readonly plannedBy: z.infer<typeof plannerSchema>;
  readonly plannerLabel: string | null | undefined;
  readonly planner: z.infer<typeof primaryPlannerSchema>;
  readonly overrideKinds: readonly z.infer<typeof overrideKindSchema>[];
  readonly overrideRejections: readonly z.infer<typeof overrideRejectionSchema>[];
  readonly roundNarrative: string | null;
  readonly authorizedPlan: readonly z.infer<typeof authorizedPlanEntrySchema>[] | null;
}

interface PreShiftValidatedArenaRow extends CommonValidatedArenaRow {
  readonly rowEra: 'pre_shift';
}

interface CommonPostShiftValidatedArenaRow extends CommonValidatedArenaRow {
  readonly rowEra: 'post_shift';
  readonly overridePolicy: 'strict' | 'typed_reason';
  readonly instructionSource: 'none' | 'kb' | 'skill';
  readonly skillName: 'engine-submission' | 'dm-round' | null;
  readonly skillHash: string | null;
  readonly firstDecisionAccepted: boolean;
  readonly decisionAttempts: number;
  readonly decisionRejectionCodes: readonly string[];
  readonly normalizationCodes: readonly string[];
  readonly rationale: string | null;
}

interface McpMinimalPostShiftValidatedArenaRow extends CommonPostShiftValidatedArenaRow {
  readonly decisionTransport: 'mcp_minimal';
}

interface FinalIndicesPostShiftValidatedArenaRow extends CommonPostShiftValidatedArenaRow {
  readonly decisionTransport: 'final_indices';
  readonly chosenOptionIndices: readonly {
    readonly actorId: unknown;
    readonly primaryOptionIndex: number;
    readonly fallbackOptionIndex: number | null;
  }[];
}

type ValidatedArenaRow =
  | PreShiftValidatedArenaRow
  | McpMinimalPostShiftValidatedArenaRow
  | FinalIndicesPostShiftValidatedArenaRow;

type ArmCardinality = 'exactly_two' | 'two_or_more';

function protocolLabel(protocol: RerunProtocol): string {
  return protocol.name === 'r1-10' ? 'R1-10' : protocol.name ?? 'Rerun protocol';
}

function assertArmCardinality(
  armCount: number,
  cardinality: ArmCardinality,
  protocol: RerunProtocol,
): void {
  const label = protocolLabel(protocol);
  switch (cardinality) {
    case 'exactly_two':
      if (armCount !== 2) {
        throw new TypeError(`${label} requires exactly two paired arms; found ${String(armCount)}.`);
      }
      return;
    case 'two_or_more':
      if (armCount < 2) {
        throw new TypeError(`${label} requires at least two paired arms; found ${String(armCount)}.`);
      }
      return;
  }
}

export interface BlindRubric {
  readonly targetPriority: number | null;
  readonly actionEconomy: number | null;
  readonly positioning: number | null;
  readonly coherence: number | null;
  readonly total: number | null;
}

export interface JudgePacketEntry {
  readonly blindId: string;
  readonly caseId: string;
  readonly outcome: string;
  readonly attribution: 'model_authorized' | 'engine_default' | 'not_model_authorized';
  readonly executedPlan: readonly NeutralPlanEntry[] | null;
  readonly rubric: BlindRubric;
}

export interface JudgePacket {
  readonly version: typeof RERUN_PACKET_VERSION;
  readonly protocol?: RerunProtocolName;
  readonly judgingOrder: 'interleaved_blinded';
  readonly rubric: {
    readonly targetPriority: { readonly maximum: 3 };
    readonly actionEconomy: { readonly maximum: 3 };
    readonly positioning: { readonly maximum: 2 };
    readonly coherence: { readonly maximum: 2 };
    readonly total: { readonly maximum: 10 };
  };
  readonly entries: readonly JudgePacketEntry[];
}

interface CommonAnswerKeyEntry {
  readonly blindId: string;
  readonly arm: string;
  readonly planner: z.infer<typeof primaryPlannerSchema>;
  readonly overrideKinds: readonly z.infer<typeof overrideKindSchema>[];
  readonly overrideRejections: readonly z.infer<typeof overrideRejectionSchema>[];
  readonly decisionReasons: readonly { readonly actorId: unknown; readonly reason: string }[];
}

interface PreShiftAnswerKeyEntry extends CommonAnswerKeyEntry {
  readonly rowEra: 'pre_shift';
}

interface CommonPostShiftAnswerKeyEntry extends CommonAnswerKeyEntry {
  readonly rowEra: 'post_shift';
  readonly overridePolicy: 'strict' | 'typed_reason';
  readonly rationale: string | null;
  readonly firstDecisionAccepted: boolean;
  readonly decisionAttempts: number;
  readonly decisionRejectionCodes: readonly string[];
  readonly normalizationCodes: readonly string[];
  readonly instructionSource: 'none' | 'kb' | 'skill';
  readonly skillName: 'engine-submission' | 'dm-round' | null;
  readonly skillHash: string | null;
}

interface McpMinimalPostShiftAnswerKeyEntry extends CommonPostShiftAnswerKeyEntry {
  readonly decisionTransport: 'mcp_minimal';
  readonly indexZeroSelectionRate: 'not_applicable';
}

interface FinalIndicesPostShiftAnswerKeyEntry extends CommonPostShiftAnswerKeyEntry {
  readonly decisionTransport: 'final_indices';
  readonly chosenOptionIndices: readonly {
    readonly actorId: unknown;
    readonly primaryOptionIndex: number;
    readonly fallbackOptionIndex: number | null;
  }[];
  readonly indexZeroSelectionRate: number | null;
}

export interface RerunAnswerKey {
  readonly version: typeof RERUN_PACKET_VERSION;
  readonly protocol?: RerunProtocolName;
  readonly entries: readonly (
    | PreShiftAnswerKeyEntry
    | McpMinimalPostShiftAnswerKeyEntry
    | FinalIndicesPostShiftAnswerKeyEntry
  )[];
}

const MODEL_IDENTITY_FIELDS = new Set([
  'arm', 'model', 'cli', 'thinkMode', 'sessionId', 'escalationSessionId',
  'escalationModel', 'kbHash', 'repoCommit', 'rawTurnContext', 'rlData', 'plannedBy',
  'instructionSource', 'skillName', 'skillHash',
  // Era-identifying: only post-intel arms produce engineIntel, so its presence
  // (not just its contents) unblinds the arm.
  'engineIntel',
  // Era-specific plan-shape keys: one of these surviving into the packet means
  // the executed-plan normalization failed and the entry identifies its era.
  'acceptedIntent', 'acceptedProposal', 'resolutionSummary', 'actionSlots',
  'selectedBranch', 'optionId', 'plannerLabel', 'planner', 'overrideKinds', 'overrideRejections',
  'rowEra',
  'decisionTransport', 'firstDecisionAccepted', 'decisionAttempts',
  'overridePolicy',
  'decisionRejectionCodes', 'normalizationCodes',
  'chosenOptionIndices',
  // The round narrative is a deterministic era-specific renderer template
  // ("expands X + X -> Y into N ordered use(s)" vs "moves N feet and uses x"),
  // verified trivially arm-separable on real R1-10 rows. It adds nothing
  // beyond the neutral plan + movementFeet, so it is banned from the packet.
  'roundNarrative',
  'reason', 'rationale',
]);

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function parseSafeInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new TypeError(`${option} must be a safe integer.`);
  return parsed;
}

export function parseRerunPacketArgs(argv: readonly string[]): RerunPacketConfig {
  const argumentsValue = argv[0] === '--' ? argv.slice(1) : argv;
  const inputPaths: string[] = [];
  const values = new Map<string, string>();
  let crossEra = false;
  for (let index = 0; index < argumentsValue.length; index += 1) {
    const option = argumentsValue[index];
    if (option === '--cross-era') { crossEra = true; continue; }
    if (!['--input', '--packet', '--answer-key', '--shuffle-seed', '--protocol', '--reps'].includes(option ?? '')) {
      throw new TypeError(`Unknown rerun-packet option ${option ?? '<missing>'}.`);
    }
    const value = requiredValue(argumentsValue, index, option ?? '<missing>');
    if (option === '--input') inputPaths.push(resolve(value));
    else values.set(option ?? '', value);
    index += 1;
  }
  if (inputPaths.length === 0) throw new TypeError('At least one --input arena JSONL path is required.');
  const packet = values.get('--packet');
  const answerKey = values.get('--answer-key');
  if (packet === undefined) throw new TypeError('--packet is required.');
  if (answerKey === undefined) throw new TypeError('--answer-key is required.');
  const packetPath = resolve(packet);
  const answerKeyPath = resolve(answerKey);
  if (packetPath === answerKeyPath) throw new TypeError('--packet and --answer-key must be different files.');
  const protocolValue = values.get('--protocol') ?? 'r1-10';
  if (protocolValue !== 'r1-10' && protocolValue !== 'brutal-10') {
    throw new TypeError('--protocol must be r1-10 or brutal-10.');
  }
  const repsValue = values.get('--reps');
  if (repsValue !== undefined && protocolValue !== 'brutal-10') {
    throw new TypeError('--reps is available only with --protocol brutal-10.');
  }
  const reps = repsValue === undefined ? 3 : parseSafeInteger(repsValue, '--reps');
  if (reps !== 1 && reps !== 3) throw new TypeError('--reps must be 1 or 3.');
  return {
    inputPaths,
    packetPath,
    answerKeyPath,
    shuffleSeed: parseSafeInteger(values.get('--shuffle-seed') ?? '', '--shuffle-seed'),
    protocol: protocolValue,
    reps,
    crossEra,
  };
}

function record(value: unknown, label: string): JsonRecord {
  const parsed = jsonRecordSchema.safeParse(value);
  if (!parsed.success) throw new TypeError(`${label} must be an object.`);
  return parsed.data;
}

function parseJsonl(text: string, source: string): readonly JsonRecord[] {
  return text.split(/\r?\n/u).flatMap((line, index): readonly JsonRecord[] => {
    if (line.trim() === '') return [];
    try {
      const decoded: unknown = JSON.parse(line);
      return [record(decoded, `${source}:${String(index + 1)}`)];
    } catch (error) {
      if (error instanceof SyntaxError) throw new TypeError(`${source}:${String(index + 1)} is not valid JSON.`);
      throw error;
    }
  });
}

function isMcpMinimalPostShiftArenaRow(value: unknown): value is McpMinimalPostShiftArenaRow {
  return mcpMinimalPostShiftArenaRowSchema.safeParse(value).success;
}

function isFinalIndicesPostShiftArenaRow(value: unknown): value is FinalIndicesPostShiftArenaRow {
  return finalIndicesPostShiftArenaRowSchema.safeParse(value).success;
}

function parseArenaRow(source: JsonRecord, sourceLabel: string): ParsedArenaRow {
  const isPostShift = Object.prototype.hasOwnProperty.call(source, 'decisionTransport');
  if (isPostShift) {
    const parsed = postShiftArenaRowSchema.safeParse(source);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const property = issue === undefined || issue.path.length === 0 ? '' : `.${issue.path.join('.')}`;
      throw new TypeError(`${sourceLabel}${property} is invalid: ${issue?.message ?? 'unknown schema failure'}.`);
    }
    if (isMcpMinimalPostShiftArenaRow(parsed.data) || isFinalIndicesPostShiftArenaRow(parsed.data)) {
      return { rowEra: 'post_shift', row: parsed.data };
    }
    throw new TypeError(`${sourceLabel} did not match a post-shift decision transport shape.`);
  }
  const parsed = preShiftArenaRowSchema.safeParse(source);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const property = issue === undefined || issue.path.length === 0 ? '' : `.${issue.path.join('.')}`;
    throw new TypeError(`${sourceLabel}${property} is invalid: ${issue?.message ?? 'unknown schema failure'}.`);
  }
  return { rowEra: 'pre_shift', row: parsed.data };
}

function validateRow(
  source: JsonRecord,
  sourceLabel: string,
  protocol: RerunProtocol,
  crossEra: boolean,
  partitionCrossEraByRowEra: boolean,
): ValidatedArenaRow {
  if ('rlData' in source) {
    throw new TypeError(`${sourceLabel} contains rlData; ${protocolLabel(protocol)} is a permanent holdout and cannot contain training data.`);
  }
  const parsedRow = parseArenaRow(source, sourceLabel);
  if (parsedRow.rowEra === 'post_shift') {
    const postShiftRow = parsedRow.row;
    if (postShiftRow.instructionSource === 'skill') {
      if (postShiftRow.skillName === null || postShiftRow.skillHash === null) {
        throw new TypeError(`${sourceLabel} skill instruction source requires skillName and skillHash.`);
      }
    } else if (postShiftRow.skillName !== null || postShiftRow.skillHash !== null) {
      throw new TypeError(`${sourceLabel} non-skill instruction source requires null skillName and skillHash.`);
    }
  }
  const sourceRow = parsedRow.row;
  if (crossEra && !partitionCrossEraByRowEra && sourceRow.repoCommit === undefined) {
    throw new TypeError(`${sourceLabel}.repoCommit is required in cross-era mode (it is the arm partition key).`);
  }
  const { seed, room } = sourceRow;
  const arm = partitionCrossEraByRowEra
    ? parsedRow.rowEra
    : crossEra
      ? `era:${sourceRow.repoCommit ?? ''}`
      : sourceRow.arm;
  const rep = sourceRow.round;
  const expectedRoom = protocol.seeds.indexOf(seed) + 1;
  if (expectedRoom === 0) {
    const article = protocol.name === 'r1-10' ? 'an' : 'a';
    throw new TypeError(`${sourceLabel}.seed=${String(seed)} is not ${article} ${protocolLabel(protocol)} holdout seed.`);
  }
  if (room !== expectedRoom) throw new TypeError(`${sourceLabel}.room must be ${String(expectedRoom)} for seed ${String(seed)}.`);
  if (rep < 1 || rep > protocol.reps) throw new TypeError(`${sourceLabel}.round must be in 1..${String(protocol.reps)}.`);
  const planner = sourceRow.planner ?? (sourceRow.plannerLabel === 'sim_controller'
    ? 'sim_controller'
    : sourceRow.plannerLabel === 'engine_default' || sourceRow.outcome === 'auto_resolved' || sourceRow.plannedBy === 'sim_controller'
      ? 'engine_default'
      : 'model');
  const common: CommonValidatedArenaRow = {
    seed, arm, room, rep,
    startingRoomDigest: sourceRow.startingRoomDigest,
    outcome: sourceRow.outcome,
    plannedBy: sourceRow.plannedBy,
    plannerLabel: sourceRow.plannerLabel,
    planner,
    overrideKinds: sourceRow.overrideKinds ?? [],
    overrideRejections: sourceRow.overrideRejections ?? [],
    roundNarrative: sourceRow.roundNarrative,
    authorizedPlan: sourceRow.authorizedPlan,
  };
  if (parsedRow.rowEra === 'pre_shift') return { ...common, rowEra: 'pre_shift' };
  const postShiftRow = parsedRow.row;
  const postShiftCommon: CommonPostShiftValidatedArenaRow = {
    ...common,
    rowEra: 'post_shift',
    overridePolicy: postShiftRow.overridePolicy,
    instructionSource: postShiftRow.instructionSource,
    skillName: postShiftRow.skillName,
    skillHash: postShiftRow.skillHash,
    firstDecisionAccepted: postShiftRow.firstDecisionAccepted,
    decisionAttempts: postShiftRow.decisionAttempts,
    decisionRejectionCodes: postShiftRow.decisionRejectionCodes,
    normalizationCodes: postShiftRow.normalizationCodes,
    rationale: postShiftRow.rationale,
  };
  if (postShiftRow.decisionTransport === 'mcp_minimal') {
    return { ...postShiftCommon, decisionTransport: 'mcp_minimal' };
  }
  return {
    ...postShiftCommon,
    decisionTransport: 'final_indices',
    chosenOptionIndices: postShiftRow.chosenOptionIndices,
  };
}

function validateRows(
  rows: readonly JsonRecord[],
  protocol: RerunProtocol,
  crossEra: boolean,
  armCardinality: ArmCardinality,
  partitionCrossEraByRowEra = false,
): readonly ValidatedArenaRow[] {
  const validated = rows.map((row, index) =>
    validateRow(row, `row ${String(index + 1)}`, protocol, crossEra, partitionCrossEraByRowEra));
  const arms = [...new Set(validated.map((row) => row.arm))].sort((left, right) => left.localeCompare(right));
  assertArmCardinality(arms.length, armCardinality, protocol);
  const label = protocolLabel(protocol);
  const byCase = new Map<string, ValidatedArenaRow[]>();
  for (const row of validated) {
    const caseKey = `${String(row.seed)}:${String(row.rep)}`;
    const caseRows = byCase.get(caseKey) ?? [];
    caseRows.push(row);
    byCase.set(caseKey, caseRows);
  }
  for (const seed of protocol.seeds) {
    for (let rep = 1; rep <= protocol.reps; rep += 1) {
      const caseKey = `${String(seed)}:${String(rep)}`;
      const caseRows = byCase.get(caseKey) ?? [];
      if (caseRows.length !== arms.length) {
        throw new TypeError(`${label} requires one row from each arm for seed ${String(seed)} rep ${String(rep)}.`);
      }
      const seenArms = new Set(caseRows.map((row) => row.arm));
      if (seenArms.size !== arms.length || arms.some((arm) => !seenArms.has(arm))) {
        throw new TypeError(`${label} requires paired arms for seed ${String(seed)} rep ${String(rep)}.`);
      }
      if (!crossEra) {
        const digests = new Set(caseRows.map((row) => row.startingRoomDigest));
        if (digests.size !== 1) {
          throw new TypeError(`Paired arms for seed ${String(seed)} rep ${String(rep)} must use the same frozen room artifact.`);
        }
      }
    }
  }
  if (crossEra) {
    // Cross-era arms cannot share canonical-state digests (state shape differs
    // by era), so the digest invariant becomes: within an arm, every rep of a
    // seed must load the identical room. Cross-era room-INPUT identity is an
    // external precondition, verified by byte-comparing the frozen seed files.
    const perArmSeed = new Map<string, Set<string>>();
    for (const row of validated) {
      const key = `${row.arm}|${String(row.seed)}`;
      const digests = perArmSeed.get(key) ?? new Set<string>();
      digests.add(row.startingRoomDigest);
      perArmSeed.set(key, digests);
    }
    for (const [key, digests] of perArmSeed) {
      if (digests.size !== 1) {
        throw new TypeError(`Cross-era arm/seed ${key} loaded ${String(digests.size)} distinct room states across reps; the frozen room must be identical within an arm.`);
      }
    }
  }
  if (validated.length !== protocol.seeds.length * protocol.reps * arms.length) {
    throw new TypeError(`${label} rows contain duplicate or unregistered seed/rep/arm entries.`);
  }
  return validated;
}

function hasMixedRowEras(rows: readonly JsonRecord[]): boolean {
  const eras = new Set(rows.map((row) =>
    Object.prototype.hasOwnProperty.call(row, 'decisionTransport') ? 'post_shift' : 'pre_shift'));
  return eras.size > 1;
}

/** Validates the frozen two-arm R1-10 experiment shape before anything can be judged. */
export function validateRerunRows(
  rows: readonly JsonRecord[],
  protocol: RerunProtocol = R1_10_PROTOCOL,
  crossEra = false,
): readonly ValidatedArenaRow[] {
  const inferredCrossEra = !crossEra && hasMixedRowEras(rows);
  return validateRows(rows, protocol, crossEra || inferredCrossEra, 'exactly_two', inferredCrossEra);
}

function engineAttribution(row: ValidatedArenaRow): JudgePacketEntry['attribution'] {
  if (row.planner !== 'model') return 'engine_default';
  if (row.outcome === 'authorized' && row.plannedBy !== null && typeof row.plannedBy === 'object') {
    return 'model_authorized';
  }
  return 'not_model_authorized';
}

function neutralPlanEntry(
  plan: z.infer<typeof authorizedPlanEntrySchema>,
  reasonsVisible: boolean,
): NeutralPlanEntry {
  const visibleReason = reasonsVisible && plan.reason !== undefined
    ? { reason: plan.reason }
    : {};
  // Id preference (actionId over spellId over objectId) is deterministic but
  // only data-verified for the action kinds present in R1-10 rows (attack,
  // dodge, direct combatant targets). A rerun whose rows include spell or
  // world-object actions must re-verify id equivalence across eras first
  // (round-2 review finding 5, accepted as a known limitation).
  const summary = plan.resolutionSummary;
  if (summary !== undefined) {
    const current = currentResolutionSummarySchema.safeParse(summary);
    if (current.success) {
      return {
        actorId: plan.actorId,
        ...visibleReason,
        actions: current.data.actionSlots.map((slot) => ({
          kind: slot.kind,
          actionId: slot.actionId ?? slot.spellId ?? slot.objectId ?? null,
          targetIds: slot.targetIds ?? [],
        })),
        movementFeet: current.data.movementFeet ?? null,
      };
    }
    const baseline = baselineResolutionSummarySchema.safeParse(summary);
    if (baseline.success) {
      // Baseline-era executed summary; the action kind lives on the intent.
      // Never fabricate a kind — a summary without its intent is malformed.
      if (plan.acceptedIntent === undefined) {
        throw new TypeError('baseline resolutionSummary without acceptedIntent; refusing to fabricate an action kind.');
      }
      return {
        actorId: plan.actorId,
        ...visibleReason,
        actions: [{
          kind: plan.acceptedIntent.choice.kind,
          actionId: baseline.data.actionId,
          targetIds: baseline.data.targetId === null ? [] : [baseline.data.targetId],
        }],
        movementFeet: baseline.data.movementFeet ?? null,
      };
    }
  }
  if (plan.acceptedIntent !== undefined) {
    const choice = plan.acceptedIntent.choice;
    const target = choice.target;
    return {
      actorId: plan.actorId,
      ...visibleReason,
      actions: [{
        kind: choice.kind,
        actionId: choice.action_id ?? choice.spell_id ?? null,
        targetIds: target?.combatant_id === undefined ? [] : [target.combatant_id],
      }],
      movementFeet: null,
    };
  }
  // Fail loud: an unrecognized plan shape must never silently become an empty
  // (and thereby era-identifying) entry.
  throw new TypeError('authorizedPlan entry matches neither known era shape.');
}

function executedPlan(
  value: ValidatedArenaRow['authorizedPlan'],
  reasonsVisible: boolean,
): readonly NeutralPlanEntry[] | null {
  if (value === null) return null;
  return value.map((entry) => neutralPlanEntry(entry, reasonsVisible));
}

function packetOutcome(outcome: string): 'authorized' | 'refused' | 'service_null' | 'execution_failed' {
  if (outcome === 'authorized') return 'authorized';
  if (outcome === 'service_null') return 'service_null';
  if (outcome === 'execution_failed' || outcome === 'partial_execution') return 'execution_failed';
  return 'refused';
}

function rubric(outcome: ReturnType<typeof packetOutcome>): BlindRubric {
  return outcome === 'refused' || outcome === 'execution_failed'
    ? { targetPriority: 0, actionEconomy: 0, positioning: 0, coherence: 0, total: 0 }
    : { targetPriority: null, actionEconomy: null, positioning: null, coherence: null, total: null };
}

function shuffled<T>(values: readonly T[], seed: number): readonly T[] {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

/** Rejects a packet that accidentally carries source-arm or model identity fields. */
export function assertBlindedPacket(
  value: unknown,
  path = 'packet',
  options: RerunPacketBuilderOptions = {},
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertBlindedPacket(entry, `${path}[${String(index)}]`, options));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    const allowedVisibleReason = key === 'reason' && options.reasonsVisible === true &&
      /\.executedPlan\[\d+\]$/u.test(path);
    if (MODEL_IDENTITY_FIELDS.has(key) && !allowedVisibleReason) {
      throw new TypeError(`${path}.${key} leaks a model-identifying field into the blinded packet.`);
    }
    assertBlindedPacket(nested, `${path}.${key}`, options);
  }
}

function indexZeroSelectionRate(
  chosenOptionIndices: readonly { readonly primaryOptionIndex: number }[],
): number | null {
  if (chosenOptionIndices.length === 0) return null;
  return chosenOptionIndices.filter(({ primaryOptionIndex }) => primaryOptionIndex === 0).length
    / chosenOptionIndices.length;
}

function buildPacket(
  rows: readonly JsonRecord[],
  shuffleSeed: number,
  protocol: RerunProtocol,
  crossEra: boolean,
  armCardinality: ArmCardinality,
  options: RerunPacketBuilderOptions,
  protocolName?: RerunProtocolName,
): { readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey } {
  if (!Number.isSafeInteger(shuffleSeed)) throw new TypeError('shuffleSeed must be a safe integer.');
  const inferredCrossEra = !crossEra && hasMixedRowEras(rows);
  const effectiveCrossEra = crossEra || inferredCrossEra;
  if (options.reasonsVisible !== true && options.reasonVisibleArms !== undefined) {
    throw new TypeError('reasonVisibleArms requires reasonsVisible: true.');
  }
  const reasonVisibleArms = options.reasonVisibleArms === undefined
    ? null
    : new Set(options.reasonVisibleArms);
  const validated = [...validateRows(rows, protocol, effectiveCrossEra, armCardinality, inferredCrossEra)]
    .sort((left, right) => left.seed - right.seed || left.rep - right.rep || left.arm.localeCompare(right.arm));
  const blinded = shuffled(validated, shuffleSeed).map((row, index) => ({
    blindId: `blind-${String(index + 1).padStart(3, '0')}`,
    row,
  }));
  const packet: JudgePacket = {
    version: RERUN_PACKET_VERSION,
    ...(protocolName === undefined ? {} : { protocol: protocolName }),
    judgingOrder: 'interleaved_blinded',
    rubric: {
      targetPriority: { maximum: 3 }, actionEconomy: { maximum: 3 },
      positioning: { maximum: 2 }, coherence: { maximum: 2 }, total: { maximum: 10 },
    },
    entries: blinded.map(({ blindId, row }) => {
      const outcome = packetOutcome(row.outcome);
      return {
        blindId,
        caseId: `case-${String(row.room).padStart(2, '0')}-${String(row.rep)}`,
        outcome,
        attribution: engineAttribution(row),
        executedPlan: outcome === 'authorized'
          ? executedPlan(
              row.authorizedPlan,
              options.reasonsVisible === true &&
                (reasonVisibleArms === null || reasonVisibleArms.has(row.arm)),
            )
          : null,
        rubric: rubric(outcome),
      };
    }),
  };
  const answerKey: RerunAnswerKey = {
    version: RERUN_PACKET_VERSION,
    ...(protocolName === undefined ? {} : { protocol: protocolName }),
    entries: blinded.map(({ blindId, row }) => {
      const common: CommonAnswerKeyEntry = {
        blindId,
        arm: row.arm,
        planner: row.planner,
        overrideKinds: row.overrideKinds,
        overrideRejections: row.overrideRejections,
        decisionReasons: (row.authorizedPlan ?? []).flatMap((entry) => entry.reason === undefined
        ? [] : [{ actorId: entry.actorId, reason: entry.reason }]),
      };
      if (row.rowEra === 'pre_shift') return { ...common, rowEra: 'pre_shift' };
      const postShiftCommon: CommonPostShiftAnswerKeyEntry = {
        ...common,
        rowEra: 'post_shift',
        overridePolicy: row.overridePolicy,
        rationale: row.rationale,
        firstDecisionAccepted: row.firstDecisionAccepted,
        decisionAttempts: row.decisionAttempts,
        decisionRejectionCodes: row.decisionRejectionCodes,
        normalizationCodes: row.normalizationCodes,
        instructionSource: row.instructionSource,
        skillName: row.skillName,
        skillHash: row.skillHash,
      };
      if (row.decisionTransport === 'mcp_minimal') {
        return {
          ...postShiftCommon,
          decisionTransport: 'mcp_minimal',
          indexZeroSelectionRate: 'not_applicable',
        };
      }
      return {
        ...postShiftCommon,
        decisionTransport: 'final_indices',
        chosenOptionIndices: row.chosenOptionIndices,
        indexZeroSelectionRate: indexZeroSelectionRate(row.chosenOptionIndices),
      };
    }),
  };
  assertBlindedPacket(packet, 'packet', options);
  return { packet, answerKey };
}

/** Builds the original two-arm packet. */
export function buildRerunPacket(
  rows: readonly JsonRecord[],
  shuffleSeed: number,
  protocol: RerunProtocol = R1_10_PROTOCOL,
  crossEraOrOptions: boolean | RerunPacketBuilderOptions = false,
  options: RerunPacketBuilderOptions = {},
): { readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey } {
  const crossEra = typeof crossEraOrOptions === 'boolean' ? crossEraOrOptions : false;
  const selectedOptions = typeof crossEraOrOptions === 'boolean' ? options : crossEraOrOptions;
  return buildPacket(rows, shuffleSeed, protocol, crossEra, 'exactly_two', selectedOptions);
}

/** Builds one blinded packet from two or more arms sharing a case protocol. */
export function buildMultiArmRerunPacket(
  rows: readonly JsonRecord[],
  shuffleSeed: number,
  protocol: RerunProtocol = R1_10_PROTOCOL,
  crossEraOrOptions: boolean | RerunPacketBuilderOptions = false,
  options: RerunPacketBuilderOptions = {},
): { readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey } {
  const crossEra = typeof crossEraOrOptions === 'boolean' ? crossEraOrOptions : false;
  const selectedOptions = typeof crossEraOrOptions === 'boolean' ? options : crossEraOrOptions;
  return buildPacket(rows, shuffleSeed, protocol, crossEra, 'two_or_more', selectedOptions);
}

/**
 * Builds D490's visibility-isolation packet from one arm. Every source row is
 * represented twice: once with its actor reasons and once from the same row
 * with reason rendering disabled.
 */
export function buildReasonVisibilityIsolationPacket(
  rows: readonly JsonRecord[],
  shuffleSeed: number,
  protocol: RerunProtocol = R1_10_PROTOCOL,
): { readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey } {
  const sourceArms = new Set(rows.map((row) => row['arm']));
  if (sourceArms.size !== 1 || [...sourceArms][0] === undefined ||
    typeof [...sourceArms][0] !== 'string') {
    throw new TypeError('Reason-visibility isolation requires rows from exactly one source arm.');
  }
  const visibleArm = 'reason_visible';
  const hiddenArm = 'reason_hidden';
  const duplicated = rows.flatMap((row): readonly JsonRecord[] => [
    { ...row, arm: visibleArm },
    { ...row, arm: hiddenArm },
  ]);
  return buildPacket(duplicated, shuffleSeed, protocol, false, 'exactly_two', {
    reasonsVisible: true,
    reasonVisibleArms: [visibleArm],
  });
}

export async function createRerunPacket(config: RerunPacketConfig): Promise<{ readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey }> {
  const sources = await Promise.all(config.inputPaths.map(async (path) => ({ path, text: await readFile(path, 'utf8') })));
  const rows = sources.flatMap(({ path, text }) => parseJsonl(text, path));
  const protocol: RerunProtocol = config.protocol === 'r1-10'
    ? R1_10_PROTOCOL
    : { ...BRUTAL_10_PROTOCOL, reps: config.reps };
  const result = buildPacket(
    rows, config.shuffleSeed, protocol, config.crossEra, 'exactly_two', {}, config.protocol,
  );
  await Promise.all([
    writeFile(config.packetPath, `${canonicalJson(result.packet)}\n`, 'utf8'),
    writeFile(config.answerKeyPath, `${canonicalJson(result.answerKey)}\n`, 'utf8'),
  ]);
  return result;
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/ai-dm-rerun-packet.ts') || argument.endsWith('\\ai-dm-rerun-packet.ts'));
  await createRerunPacket(parseRerunPacketArgs(scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1)));
}

const invokedPath = process.argv[1];
const PACKET_FLAGS = [
  '--input', '--packet', '--answer-key', '--shuffle-seed', '--cross-era', '--protocol', '--reps',
];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-rerun-packet.ts') || invokedPath.endsWith('\\ai-dm-rerun-packet.ts') ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    // Any recognized flag routes into main(), so an incomplete command fails
    // loudly in the parser instead of silently exiting 0.
    PACKET_FLAGS.some((flag) => process.argv.includes(flag)))
)) await main();
