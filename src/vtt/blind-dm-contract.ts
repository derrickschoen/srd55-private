import { z } from 'zod';

export const DM_MODES = ['advice', 'blind'] as const;
export const dmModeSchema = z.enum(DM_MODES);
export type DmMode = z.infer<typeof dmModeSchema>;

export const BLIND_REPAIR_ARMS = ['code_only', 'minimal_legal_alternative'] as const;
export const blindRepairArmSchema = z.enum(BLIND_REPAIR_ARMS);
export type BlindRepairArm = z.infer<typeof blindRepairArmSchema>;

export const BLIND_INTENT_VERSION = 'blind-round-intent-v1' as const;
export const BLIND_MAX_ATTEMPTS_DEFAULT = 3 as const;
export const blindAttemptNumberSchema = z.number().int().min(1).max(3);
export type BlindAttemptNumber = z.infer<typeof blindAttemptNumberSchema>;
export const blindMaxAttemptsSchema = blindAttemptNumberSchema.default(BLIND_MAX_ATTEMPTS_DEFAULT);
export type BlindMaxAttempts = z.infer<typeof blindMaxAttemptsSchema>;

export const BLIND_INTENT_REJECTION_CODES = [
  'INVALID_INTENT_SHAPE',
  'STALE_REVISION',
  'INTENT_SET_INCOMPLETE',
  'MISSING_ACTOR',
  'DUPLICATE_ACTOR',
  'UNKNOWN_ACTOR',
  'AMBIGUOUS_ACTOR',
  'ACTION_UNAVAILABLE',
  'TARGET_REQUIRED',
  'TARGET_NOT_ALLOWED',
  'UNKNOWN_TARGET',
  'AMBIGUOUS_TARGET',
  'DESTINATION_REQUIRED',
  'DESTINATION_NOT_ALLOWED',
  'DESTINATION_INVALID',
  'AREA_REQUIRED',
  'AREA_NOT_ALLOWED',
  'AREA_INVALID',
  'AREA_UNDERSPECIFIED',
  'ACTIVATION_CHOICE_REQUIRED',
  'MULTI_TARGET_UNDERSPECIFIED',
  'NO_MATCHING_OPTION',
  'AMBIGUOUS_INTENT',
  'OPTION_RESOLUTION_FAILED',
] as const;
export const blindIntentRejectionCodeSchema = z.enum(BLIND_INTENT_REJECTION_CODES);
export type BlindIntentRejectionCode = z.infer<typeof blindIntentRejectionCodeSchema>;

export const COMPASS_DIRECTIONS = [
  'north',
  'north_east',
  'east',
  'south_east',
  'south',
  'south_west',
  'west',
  'north_west',
] as const;
export const compassDirectionSchema = z.enum(COMPASS_DIRECTIONS);
export type CompassDirection = z.infer<typeof compassDirectionSchema>;

const COORDINATE_TOKEN = /(?:^|[^\p{L}\p{N}_])\d+\s*,\s*\d+(?:$|[^\p{L}\p{N}_])/u;
const PATH_OR_COMMAND_TOKEN = /(?:->|=>|\b(?:option_(?:id|ref)|primary_option|fallback_option|reducer|execute\s*\(|dispatch\s*\(|apply\s*\()\b)/iu;
const ENGINE_MECHANICS_TOKEN = /\b(?:damage|dice|modifier|dc\s*\d+)\b/iu;

function isModelSafeProse(value: string): boolean {
  return !COORDINATE_TOKEN.test(value) &&
    !PATH_OR_COMMAND_TOKEN.test(value) &&
    !ENGINE_MECHANICS_TOKEN.test(value);
}

function boundedModelString(maximum: number, label: string): z.ZodString {
  return z.string()
    .trim()
    .min(1)
    .max(maximum)
    .refine(isModelSafeProse, `${label} must not contain coordinates, paths, engine ids, mechanics, or commands.`);
}

export const blindBoundedNameSchema = boundedModelString(120, 'Name');
export const blindBoundedReasonSchema = boundedModelString(500, 'Reason');
export const blindPositiveBadgeSchema = z.number().int().positive().max(1_000_000);

export const columnRowLabelSchema = z.string().regex(/^(?:0|[1-9]\d*),(?:0|[1-9]\d*)$/u);
export type ColumnRowLabel = z.infer<typeof columnRowLabelSchema>;

export const blindActorReferenceSchema = z.strictObject({
  name: blindBoundedNameSchema,
  badge: blindPositiveBadgeSchema,
});
export type BlindActorReference = z.infer<typeof blindActorReferenceSchema>;

export const namedBoardEntitySchema = z.strictObject({
  name: blindBoundedNameSchema,
  badge: blindPositiveBadgeSchema.optional(),
});
export type NamedBoardEntity = z.infer<typeof namedBoardEntitySchema>;

export const blindActionKinds = [
  'attack',
  'cast',
  'interact',
  'dash',
  'dodge',
  'disengage',
  'hide',
  'help',
  'ready',
  'end',
] as const;
export const blindActionKindSchema = z.enum(blindActionKinds);
export type BlindActionKind = z.infer<typeof blindActionKindSchema>;

const namedBlindActionSchema = z.union([
  z.strictObject({ kind: z.literal('attack'), name: blindBoundedNameSchema.optional() }),
  z.strictObject({ kind: z.literal('cast'), name: blindBoundedNameSchema }),
  z.strictObject({ kind: z.literal('interact'), name: blindBoundedNameSchema.optional() }),
]);
const simpleBlindActionSchema = z.strictObject({
  kind: z.enum(['dash', 'dodge', 'disengage', 'hide', 'help', 'ready', 'end']),
});
export const blindActionSchema = z.union([namedBlindActionSchema, simpleBlindActionSchema]);
export type BlindAction = z.infer<typeof blindActionSchema>;

export const blindTargetSchema = z.strictObject({
  kind: z.enum(['creature', 'object']),
  name: blindBoundedNameSchema,
  badge: blindPositiveBadgeSchema.optional(),
});
export type BlindTarget = z.infer<typeof blindTargetSchema>;

export const blindDestinationSchema = z.union([
  z.strictObject({ kind: z.literal('cell_label'), label: columnRowLabelSchema }),
  z.strictObject({ kind: z.literal('relative'), relation: z.literal('hold') }),
  z.strictObject({
    kind: z.literal('relative'),
    relation: z.enum(['adjacent_to', 'toward', 'away_from', 'near']),
    anchor: namedBoardEntitySchema,
  }),
  z.strictObject({
    kind: z.literal('relative'),
    relation: z.literal('behind'),
    anchor: namedBoardEntitySchema,
    from: namedBoardEntitySchema,
  }),
]);
export type BlindDestination = z.infer<typeof blindDestinationSchema>;

export const blindAreaSchema = z.union([
  z.strictObject({
    kind: z.literal('cell_label'),
    label: columnRowLabelSchema,
    direction: compassDirectionSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal('centered_on'),
    target: namedBoardEntitySchema,
    direction: compassDirectionSchema.optional(),
  }),
]);
export type BlindArea = z.infer<typeof blindAreaSchema>;

export const blindIntentSchema = z.strictObject({
  actor: blindActorReferenceSchema,
  action: blindActionSchema,
  target: blindTargetSchema.optional(),
  destination: blindDestinationSchema.optional(),
  area: blindAreaSchema.optional(),
  reason: blindBoundedReasonSchema,
});
export type BlindIntent = z.infer<typeof blindIntentSchema>;

export const blindRoundIntentEnvelopeSchema = z.strictObject({
  intent_version: z.literal(BLIND_INTENT_VERSION),
  intents: z.array(blindIntentSchema).min(1).max(64),
});
export type BlindRoundIntentEnvelope = z.infer<typeof blindRoundIntentEnvelopeSchema>;

const rejectionCodesSchema = z.array(blindIntentRejectionCodeSchema)
  .min(1)
  .max(BLIND_INTENT_REJECTION_CODES.length)
  .refine((codes) => new Set(codes).size === codes.length, 'Rejection codes must be unique.');

export const blindCodeOnlyRejectionSchema = z.strictObject({
  status: z.literal('rejected'),
  attempt: blindAttemptNumberSchema,
  actor: blindActorReferenceSchema.optional(),
  codes: rejectionCodesSchema,
});
export type BlindCodeOnlyRejection = z.infer<typeof blindCodeOnlyRejectionSchema>;

export const blindLegalAlternativeSchema = z.strictObject({
  action_kind: blindActionKindSchema,
  target: namedBoardEntitySchema.optional(),
});
export type BlindLegalAlternative = z.infer<typeof blindLegalAlternativeSchema>;

export const blindMinimalLegalAlternativeRejectionSchema = z.strictObject({
  status: z.literal('rejected'),
  attempt: blindAttemptNumberSchema,
  actor: blindActorReferenceSchema.optional(),
  codes: rejectionCodesSchema,
  legal_alternative: blindLegalAlternativeSchema.optional(),
});
export type BlindMinimalLegalAlternativeRejection = z.infer<typeof blindMinimalLegalAlternativeRejectionSchema>;
