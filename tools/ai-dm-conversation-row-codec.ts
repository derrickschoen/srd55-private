import { z } from 'zod';
import { engineUiFeedbackSchema } from '../src/vtt/mcp/schemas';

const STANDARD_INITIATIVE_POLICY = 'initiative-intel-v1';

const safeIntegerSchema = z.number().int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

const engineIntelSchema = z.object({
  policy: z.enum(['dm-intel-capture-v1', 'dm-intel-capture-v2-creature-space']),
  policyVersions: z.object({
    initiative: z.literal(STANDARD_INITIATIVE_POLICY),
  }).passthrough(),
  actors: z.array(z.unknown()),
}).passthrough();

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

const currentResolutionSummarySchema = z.object({
  actionSlots: z.array(currentActionSlotSchema),
  movementFeet: z.number().optional(),
}).passthrough();

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
const boardImageSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('off') }).strict(),
  z.object({
    mode: z.literal('png'),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    bytes: safeIntegerSchema.min(24).max(1_000_000),
    width: safeIntegerSchema.min(1),
    height: safeIntegerSchema.min(1),
    captureMs: z.number().finite().nonnegative(),
    relativePath: z.string().regex(/^board-images\/[a-f0-9]{64}\.png$/u),
  }).strict(),
  z.object({
    mode: z.literal('capture_only'),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    bytes: safeIntegerSchema.min(24).max(1_000_000),
    width: safeIntegerSchema.min(1),
    height: safeIntegerSchema.min(1),
    captureMs: z.number().finite().nonnegative(),
    relativePath: z.string().regex(/^board-images\/[a-f0-9]{64}\.png$/u),
  }).strict(),
]);

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
  engineIntel: engineIntelSchema.nullable().optional(),
  plannerLabel: z.string().nullable().optional(),
  planner: primaryPlannerSchema.optional(),
  overrideKinds: z.array(overrideKindSchema).optional(),
  overrideRejections: z.array(overrideRejectionSchema).optional(),
  boardImage: boardImageSchema.optional(),
  uiFeedback: engineUiFeedbackSchema.nullable().optional(),
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

export interface CurrentChosenOptionIndex<ActorId = unknown> {
  readonly actorId: ActorId;
  readonly primaryOptionIndex: number;
  readonly fallbackOptionIndex: number | null;
}

export type CurrentRow<ActorId = unknown> =
  | { readonly decisionTransport: 'mcp_minimal'; readonly chosenOptionIndices?: never }
  | {
      readonly decisionTransport: 'final_indices';
      readonly chosenOptionIndices: readonly CurrentChosenOptionIndex<ActorId>[];
    };

export type CurrentResolutionSummary = z.infer<typeof currentResolutionSummarySchema>;
export type BaselineResolutionSummary = z.infer<typeof baselineResolutionSummarySchema>;
export type DecodedPlanSummary =
  | { readonly kind: 'absent' }
  | { readonly kind: 'current'; readonly summary: CurrentResolutionSummary }
  | { readonly kind: 'baseline'; readonly summary: BaselineResolutionSummary };

export type PreShiftArenaRow = z.infer<typeof preShiftArenaRowSchema>;
export type McpMinimalPostShiftArenaRow = z.infer<typeof mcpMinimalPostShiftArenaRowSchema>;
export type FinalIndicesPostShiftArenaRow = z.infer<typeof finalIndicesPostShiftArenaRowSchema>;
export type KnownArenaRow =
  | {
      readonly rowEra: 'pre_shift';
      readonly row: PreShiftArenaRow;
      readonly planSummaries: readonly DecodedPlanSummary[] | null;
    }
  | {
      readonly rowEra: 'post_shift';
      readonly row: McpMinimalPostShiftArenaRow;
      readonly planSummaries: readonly DecodedPlanSummary[] | null;
    }
  | {
      readonly rowEra: 'post_shift';
      readonly row: FinalIndicesPostShiftArenaRow;
      readonly planSummaries: readonly DecodedPlanSummary[] | null;
    };

export class ArenaRowDecodeError extends TypeError {
  readonly path: readonly (string | number)[];
  readonly sourceSuffix: string;

  constructor(path: readonly (string | number)[], sourceSuffix: string) {
    super(sourceSuffix);
    this.name = 'ArenaRowDecodeError';
    this.path = path;
    this.sourceSuffix = sourceSuffix;
  }
}

function schemaError(error: z.ZodError): ArenaRowDecodeError {
  const issue = error.issues[0];
  const path = issue?.path.map((segment) => typeof segment === 'string' || typeof segment === 'number'
    ? segment
    : String(segment)) ?? [];
  const property = path.length === 0 ? '' : `.${path.join('.')}`;
  return new ArenaRowDecodeError(
    path,
    `${property} is invalid: ${issue?.message ?? 'unknown schema failure'}.`,
  );
}

function relationError(path: readonly (string | number)[], sourceSuffix: string): never {
  throw new ArenaRowDecodeError(path, sourceSuffix);
}

type CommonArenaRow = z.infer<typeof commonArenaRowSchema>;
type AuthorizedPlanEntry = NonNullable<CommonArenaRow['authorizedPlan']>[number];

function decodePlanSummary(plan: AuthorizedPlanEntry): DecodedPlanSummary {
  const summary = plan.resolutionSummary;
  if (summary === undefined) return { kind: 'absent' };
  const current = currentResolutionSummarySchema.safeParse(summary);
  if (current.success) return { kind: 'current', summary: current.data };
  const baseline = baselineResolutionSummarySchema.safeParse(summary);
  if (baseline.success) return { kind: 'baseline', summary: baseline.data };
  return relationError(
    ['authorizedPlan', 'resolutionSummary'],
    '.authorizedPlan.resolutionSummary is invalid: did not match a known summary shape.',
  );
}

function decodePlanSummaries(row: CommonArenaRow): readonly DecodedPlanSummary[] | null {
  return row.authorizedPlan === null ? null : row.authorizedPlan.map(decodePlanSummary);
}

function validateCommonRelations(row: CommonArenaRow): void {
  const hasBoardImage = row.boardImage !== undefined;
  const hasUiFeedback = row.uiFeedback !== undefined;
  if (hasBoardImage !== hasUiFeedback) {
    relationError(['boardImage', 'uiFeedback'], ' must carry boardImage and uiFeedback together.');
  }
  if (row.boardImage !== undefined && row.boardImage.mode !== 'png' && row.uiFeedback !== null) {
    relationError(['uiFeedback'], ' cannot carry UI feedback without a PNG board image.');
  }
  if (row.boardImage !== undefined && row.boardImage.mode !== 'off' &&
    row.boardImage.relativePath !== `board-images/${row.boardImage.sha256}.png`) {
    relationError(['boardImage', 'relativePath'], '.boardImage path must match its SHA-256.');
  }
}

function validatePostShiftRelations(
  row: McpMinimalPostShiftArenaRow | FinalIndicesPostShiftArenaRow,
): void {
  if (row.instructionSource === 'skill') {
    if (row.skillName === null || row.skillHash === null) {
      relationError(['skillName', 'skillHash'], ' skill instruction source requires skillName and skillHash.');
    }
  } else if (row.skillName !== null || row.skillHash !== null) {
    relationError(['skillName', 'skillHash'], ' non-skill instruction source requires null skillName and skillHash.');
  }
}

export function decodeArenaRow(value: unknown): KnownArenaRow {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ArenaRowDecodeError([], ' is invalid: expected an object.');
  }
  if (Object.prototype.hasOwnProperty.call(value, 'decisionTransport')) {
    const parsed = postShiftArenaRowSchema.safeParse(value);
    if (!parsed.success) throw schemaError(parsed.error);
    validatePostShiftRelations(parsed.data);
    validateCommonRelations(parsed.data);
    const planSummaries = decodePlanSummaries(parsed.data);
    switch (parsed.data.decisionTransport) {
      case 'mcp_minimal':
        return { rowEra: 'post_shift', row: parsed.data, planSummaries };
      case 'final_indices':
        return { rowEra: 'post_shift', row: parsed.data, planSummaries };
    }
  }
  const parsed = preShiftArenaRowSchema.safeParse(value);
  if (!parsed.success) throw schemaError(parsed.error);
  validateCommonRelations(parsed.data);
  return {
    rowEra: 'pre_shift',
    row: parsed.data,
    planSummaries: decodePlanSummaries(parsed.data),
  };
}

export function encodeConversationRow<Row extends CurrentRow>(row: Row): string {
  return JSON.stringify(row);
}

export interface ConversationRowCodec {
  decodeArenaRow(value: unknown): KnownArenaRow;
  encodeConversationRow<Row extends CurrentRow>(row: Row): string;
}

export const conversationRowCodec: Readonly<ConversationRowCodec> = Object.freeze({
  decodeArenaRow,
  encodeConversationRow,
});
