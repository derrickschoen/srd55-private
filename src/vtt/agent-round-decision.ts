import type { CombatantId } from '../combat/values';
import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { ReactionGuidanceDeclaration } from './reaction-guidance';
import {
  ENGINE_OPTION_METRICS,
  ENGINE_OVERRIDE_JUSTIFICATION_KINDS,
  SIMPLE_OVERRIDE_JUSTIFICATION_KINDS,
  enginePlayToken,
  type EngineOptionId,
  type EngineOptionMetric,
  type EngineOverrideJustification,
  type EngineOverrideJustificationKind,
  type EngineTurnProposal,
} from './turn-proposal';

const decisionActorIndexBrand = Symbol('DecisionActorIndex');
const decisionOptionIndexBrand = Symbol('DecisionOptionIndex');
const normalizedRoundDecisionBrand = Symbol('NormalizedRoundDecision');
const boundRoundDecisionBrand = Symbol('BoundRoundDecision');

/** The decision transports considered by the A1/A3 ingress. */
export type DecisionTransport = 'mcp_minimal' | 'final_ids' | 'final_indices';

/**
 * The literal parameter is intentionally retained: an option index for actor
 * zero is not assignable to an option index for actor one.
 */
export type DecisionActorIndex<N extends number = number> = number & {
  readonly [decisionActorIndexBrand]: N;
};

export type OptionIndex<A extends DecisionActorIndex = DecisionActorIndex> = number & {
  readonly [decisionOptionIndexBrand]: A;
};

/** Compatibility name for consumers which do not retain a particular actor. */
export type DecisionOptionIndex = OptionIndex<DecisionActorIndex>;

export interface OutOfRange {
  readonly kind: 'out_of_range';
  readonly value: number;
  readonly upperExclusive: number;
}

export type DecisionPhase = 'initial' | 'correction';

export interface RawIdDecision {
  readonly catalogDigest: string;
  readonly proposals: readonly {
    readonly actorId: CombatantId;
    readonly primaryOptionId: EngineOptionId;
    readonly fallbackOptionId: EngineOptionId | null;
    readonly override: DecisionOverride | null;
  }[];
}

/** Model-shaped data. It deliberately lacks every field of EngineTurnProposal. */
export interface RawIndexDecision {
  readonly catalogDigest: string;
  readonly reaction_guidance: { readonly inherit: true };
  readonly rationale: string | null;
  readonly proposals: Readonly<Record<string, {
    readonly primaryOptionIndex: number;
    readonly fallbackOptionIndex: number | null;
    readonly override: DecisionOverride | null;
    readonly reason: string;
  }>>;
}

export type DecisionOverride = EngineOverrideJustification;

export interface DecisionCatalogActor {
  readonly actorId: CombatantId;
  readonly options: readonly DecisionCatalogOption[];
}

export interface DecisionCatalogOption {
  readonly optionId: EngineOptionId;
  readonly label: string;
}

export interface DecisionCatalog {
  readonly digest: string;
  readonly requestId: string;
  readonly phase: DecisionPhase;
  readonly expectedRevision: number;
  readonly stateDigest: string;
  readonly actors: readonly DecisionCatalogActor[];
}

export interface DecisionCatalogInput {
  readonly requestId: string;
  readonly phase: DecisionPhase;
  readonly expectedRevision: number;
  readonly stateDigest: string;
  readonly actors: readonly DecisionCatalogActor[];
}

export type DecisionNormalizationRejectionCode =
  | 'invalid_shape'
  | 'dialect_mismatch'
  | 'duplicate_actor'
  | 'missing_actor'
  | 'unknown_option'
  | 'stale_catalog'
  | 'identical_fallback'
  | 'non_null_correction_fallback'
  | 'REASON_REQUIRED';

export type DecisionNormalizationResult =
  | {
      readonly kind: 'accepted';
      readonly decision: NormalizedRoundDecision;
      readonly codes: readonly [];
    }
  | {
      readonly kind: 'rejected';
      readonly code: DecisionNormalizationRejectionCode;
      readonly codes: readonly [DecisionNormalizationRejectionCode];
    };

interface NormalizedIndexProposal<A extends DecisionActorIndex = DecisionActorIndex> {
  readonly actorIndex: A;
  readonly primaryOptionIndex: OptionIndex<A>;
  readonly fallbackOptionIndex: OptionIndex<A> | null;
  readonly override: DecisionOverride | null;
  readonly reason: string;
}

interface NormalizedRoundDecision {
  readonly [normalizedRoundDecisionBrand]: true;
  readonly catalogDigest: string;
  readonly proposals: readonly NormalizedIndexProposal[];
  readonly rationale: string | null;
}

/**
 * Integration seam for the G2.1 decision-reason detector. It deliberately
 * names the only structured-final hook without reimplementing that detector.
 */
export interface StructuredFinalDecisionReasonGate {
  validate(actorId: CombatantId, reason: string):
    | { readonly kind: 'accepted' }
    | { readonly kind: 'rejected'; readonly code: 'REASON_REQUIRED' };
}

/**
 * Engine-ready decisions may only be obtained from bindDecision. The brand
 * prevents raw external JSON from being accidentally submitted as a proposal.
 */
export interface BoundRoundDecision {
  readonly [boundRoundDecisionBrand]: true;
  readonly catalog: DecisionCatalog;
  readonly proposals: readonly EngineTurnProposal[];
  readonly inheritedReactionGuidance: ReactionGuidanceDeclaration | null;
  readonly rationale: string | null;
  readonly selections: readonly {
    readonly actorId: CombatantId;
    readonly primaryOptionIndex: number;
    readonly fallbackOptionIndex: number | null;
    readonly reason: string;
  }[];
}

export interface RenderedDecisionCatalog {
  readonly catalogDigest: string;
  readonly recommendation: 'index 0 = engine recommendation';
  readonly actors: readonly {
    readonly actorIndex: number;
    readonly actorId: CombatantId;
    readonly options: readonly {
      readonly optionIndex: number;
      readonly label: string;
    }[];
  }[];
}

type JsonSchema = Readonly<Record<string, unknown>>;

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function closedRecord(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function frozen<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) frozen(nested);
    Object.freeze(value);
  }
  return value;
}

function catalogPayload(input: DecisionCatalogInput): Readonly<Record<string, unknown>> {
  return {
    requestId: input.requestId,
    phase: input.phase,
    expectedRevision: input.expectedRevision,
    stateDigest: input.stateDigest,
    actors: input.actors.map((actor) => ({
      actorId: actor.actorId,
      options: actor.options.map((option) => ({ optionId: option.optionId, label: option.label })),
    })),
  };
}

/** Freeze both the order and the revision-bound option ids before dispatch. */
export function createDecisionCatalog(input: DecisionCatalogInput): DecisionCatalog {
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) {
    throw new RangeError('Decision catalog expectedRevision must be a positive safe integer.');
  }
  if (input.requestId.length === 0 || input.stateDigest.length === 0 || input.actors.length === 0) {
    throw new TypeError('Decision catalog requires request, state, and at least one actor.');
  }
  const actorIds = new Set(input.actors.map((actor) => actor.actorId));
  if (actorIds.size !== input.actors.length || input.actors.some((actor) => actor.options.length === 0)) {
    throw new TypeError('Decision catalog actors must be unique and offer at least one option.');
  }
  for (const actor of input.actors) {
    const optionIds = new Set(actor.options.map((option) => option.optionId));
    if (optionIds.size !== actor.options.length) {
      throw new TypeError(`Decision catalog options must be unique for ${actor.actorId}.`);
    }
  }
  const payload = catalogPayload(input);
  return frozen({
    digest: sha256(canonicalJson(payload)),
    requestId: input.requestId,
    phase: input.phase,
    expectedRevision: input.expectedRevision,
    stateDigest: input.stateDigest,
    actors: input.actors.map((actor) => ({
      actorId: actor.actorId,
      options: actor.options.map((option) => ({ optionId: option.optionId, label: option.label })),
    })),
  });
}

export function renderDecisionCatalog(catalog: DecisionCatalog): RenderedDecisionCatalog {
  return frozen({
    catalogDigest: catalog.digest,
    recommendation: 'index 0 = engine recommendation',
    actors: catalog.actors.map((actor, actorIndex) => ({
      actorIndex,
      actorId: actor.actorId,
      options: actor.options.map((option, optionIndex) => ({ optionIndex, label: option.label })),
    })),
  });
}

function failure(code: DecisionNormalizationRejectionCode): DecisionNormalizationResult {
  return { kind: 'rejected', code, codes: [code] };
}

function isOverrideKind(value: unknown): value is EngineOverrideJustificationKind {
  return typeof value === 'string' &&
    (ENGINE_OVERRIDE_JUSTIFICATION_KINDS as readonly string[]).includes(value);
}

function isSimpleOverrideKind(
  value: EngineOverrideJustificationKind,
): value is (typeof SIMPLE_OVERRIDE_JUSTIFICATION_KINDS)[number] {
  return (SIMPLE_OVERRIDE_JUSTIFICATION_KINDS as readonly string[]).includes(value);
}

function parseOverride(value: unknown): DecisionOverride | null | undefined {
  if (value === null) return null;
  const input = record(value);
  if (input === null || !isOverrideKind(input['kind'])) return undefined;
  const kind = input['kind'];
  if (isSimpleOverrideKind(kind)) {
    return closedRecord(input, ['kind']) ? { kind } : undefined;
  }
  switch (kind) {
    case 'engine_play': {
      if (!closedRecord(input, ['kind', 'token'])) return undefined;
      const token = input['token'];
      if (token === null) return { kind, token: null };
      return typeof token === 'string' && token.length > 0 && token.length <= 200
        ? { kind, token: enginePlayToken(token) }
        : undefined;
    }
    case 'missing_metric': {
      if (!closedRecord(input, ['kind', 'id'])) return undefined;
      const id = input['id'];
      return id === null || (typeof id === 'string' &&
        (ENGINE_OPTION_METRICS as readonly string[]).includes(id))
        ? { kind, id: id as EngineOptionMetric | null }
        : undefined;
    }
  }
  kind satisfies never;
  throw new Error('Unreachable override justification kind.');
}

type RawDialect = 'camel' | 'snake';

function rawDialect(input: Readonly<Record<string, unknown>>): RawDialect | null {
  const hasCamel = 'catalogDigest' in input;
  const hasSnake = 'catalog_digest' in input;
  if (hasCamel === hasSnake) return null;
  if (hasCamel && closedRecord(input, ['catalogDigest', 'proposals', 'reaction_guidance', 'rationale'])) {
    return 'camel';
  }
  if (hasSnake && closedRecord(input, ['catalog_digest', 'proposals', 'reaction_guidance', 'rationale'])) {
    return 'snake';
  }
  return null;
}

function numberIndex(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function outOfRange(value: number, upperExclusive: number): OutOfRange {
  return frozen({ kind: 'out_of_range', value, upperExclusive });
}

export function decisionActorIndex<const N extends number>(
  value: N,
  catalog: Pick<DecisionCatalog, 'actors'>,
): DecisionActorIndex<N> | OutOfRange {
  if (!Number.isSafeInteger(value) || value < 0 || value >= catalog.actors.length) {
    return outOfRange(value, catalog.actors.length);
  }
  return value as unknown as DecisionActorIndex<N>;
}

export function decisionOptionIndex<A extends DecisionActorIndex, const N extends number>(
  actor: A,
  value: N,
  optionCount: number,
): OptionIndex<A> | OutOfRange {
  if (!Number.isSafeInteger(value) || value < 0 || value >= optionCount) {
    return outOfRange(value, optionCount);
  }
  return value as unknown as OptionIndex<A>;
}

function isOutOfRange(value: DecisionActorIndex | DecisionOptionIndex | OutOfRange): value is OutOfRange {
  return typeof value === 'object' && value !== null && value.kind === 'out_of_range';
}

/**
 * Decode only one naming dialect and prove every index lies inside the frozen
 * pre-dispatch catalog. The output is still not engine-ready until binding.
 */
export function normalizeIndexDecision(
  value: unknown,
  catalog: DecisionCatalog,
  inheritedReactionGuidance: ReactionGuidanceDeclaration | null,
  reasonGate?: StructuredFinalDecisionReasonGate,
): DecisionNormalizationResult {
  const input = record(value);
  if (input === null) return failure('invalid_shape');
  const dialect = rawDialect(input);
  if (dialect === null) {
    if ('catalogDigest' in input || 'catalog_digest' in input) return failure('dialect_mismatch');
    return failure('invalid_shape');
  }
  const catalogDigest = dialect === 'camel' ? input['catalogDigest'] : input['catalog_digest'];
  if (catalogDigest !== catalog.digest) return failure('stale_catalog');
  const rawProposals = input['proposals'];
  if (record(rawProposals) === null) return failure('invalid_shape');
  const proposalRecord = record(rawProposals);
  if (proposalRecord === null) return failure('invalid_shape');
  const reactionGuidance = input['reaction_guidance'];
  const reactionGuidanceRecord = record(reactionGuidance);
  if (reactionGuidanceRecord === null || !closedRecord(reactionGuidanceRecord, ['inherit']) ||
    reactionGuidanceRecord['inherit'] !== true) return failure('invalid_shape');
  const rationale = input['rationale'];
  if (rationale !== undefined && rationale !== null &&
    (typeof rationale !== 'string' || rationale.trim().length === 0 || rationale.length > 600)) {
    return failure('invalid_shape');
  }
  const expectedActorIds = catalog.actors.map((actor) => actor.actorId);
  if (!expectedActorIds.every((actorId) => actorId in proposalRecord)) return failure('missing_actor');
  if (!Object.keys(proposalRecord).every((actorId) => expectedActorIds.includes(actorId as CombatantId))) {
    return failure('unknown_option');
  }
  const proposals: NormalizedIndexProposal[] = [];
  for (const [actorNumber, actor] of catalog.actors.entries()) {
    const rawProposal = proposalRecord[actor.actorId];
    const proposal = rawProposal === undefined ? null : record(rawProposal);
    if (proposal === null) return failure('invalid_shape');
    const primaryKey = dialect === 'camel' ? 'primaryOptionIndex' : 'primary_option_index';
    const fallbackKey = dialect === 'camel' ? 'fallbackOptionIndex' : 'fallback_option_index';
    const expectedKeys = [primaryKey, fallbackKey, 'override', 'reason'];
    if (!closedRecord(proposal, expectedKeys)) {
      const conflictingDialect = dialect === 'camel'
        ? 'primary_option_index' in proposal || 'fallback_option_index' in proposal
        : 'primaryOptionIndex' in proposal || 'fallbackOptionIndex' in proposal;
      return failure(conflictingDialect ? 'dialect_mismatch' : 'invalid_shape');
    }
    const actorIndex = decisionActorIndex(actorNumber, catalog);
    if (isOutOfRange(actorIndex)) return failure('unknown_option');
    const primaryNumber = numberIndex(proposal[primaryKey]);
    if (primaryNumber === null) return failure('invalid_shape');
    const primaryOptionIndex = decisionOptionIndex(actorIndex, primaryNumber, actor.options.length);
    if (isOutOfRange(primaryOptionIndex)) return failure('unknown_option');
    const fallbackValue = proposal[fallbackKey];
    let fallbackOptionIndex: OptionIndex<typeof actorIndex> | null = null;
    if (fallbackValue !== null) {
      const fallbackNumber = numberIndex(fallbackValue);
      if (fallbackNumber === null) return failure('unknown_option');
      const checkedFallback = decisionOptionIndex(actorIndex, fallbackNumber, actor.options.length);
      if (isOutOfRange(checkedFallback)) return failure('unknown_option');
      fallbackOptionIndex = checkedFallback;
    }
    if (catalog.phase === 'correction' && fallbackOptionIndex !== null) {
      return failure('non_null_correction_fallback');
    }
    if (catalog.phase === 'initial' && fallbackOptionIndex === null) return failure('unknown_option');
    if (fallbackOptionIndex !== null && fallbackOptionIndex === primaryOptionIndex) {
      return failure('identical_fallback');
    }
    const override = parseOverride(proposal['override']);
    if (override === undefined) return failure('invalid_shape');
    const reason = proposal['reason'];
    if (typeof reason !== 'string' || reason.trim().length === 0) return failure('REASON_REQUIRED');
    if (reason.length > 240) return failure('invalid_shape');
    if (reasonGate?.validate(actor.actorId, reason).kind === 'rejected') return failure('REASON_REQUIRED');
    proposals.push({ actorIndex, primaryOptionIndex, fallbackOptionIndex, override, reason });
  }
  return {
    kind: 'accepted',
    decision: {
      [normalizedRoundDecisionBrand]: true,
      catalogDigest: catalog.digest,
      proposals,
      rationale: rationale ?? null,
    },
    codes: [],
  };
}

/** Map checked indices back to the exact ids carried by the frozen catalog. */
export function bindDecision(
  catalog: DecisionCatalog,
  normalized: NormalizedRoundDecision,
  inheritedReactionGuidance: ReactionGuidanceDeclaration | null,
): BoundRoundDecision {
  if (normalized.catalogDigest !== catalog.digest) {
    throw new RangeError('Cannot bind a decision to a different catalog digest.');
  }
  const proposals = normalized.proposals.map((raw): EngineTurnProposal => {
    const actor = catalog.actors[raw.actorIndex];
    if (actor === undefined) throw new RangeError('Normalized actor index escaped its catalog.');
    const primary = actor.options[raw.primaryOptionIndex];
    const fallback = raw.fallbackOptionIndex === null ? null : actor.options[raw.fallbackOptionIndex];
    if (primary === undefined || (raw.fallbackOptionIndex !== null && fallback === undefined)) {
      throw new RangeError('Normalized option index escaped its catalog.');
    }
    const overrideJustification: EngineTurnProposal['overrideJustification'] = raw.override;
    return {
      actorId: actor.actorId,
      expectedRevision: catalog.expectedRevision,
      primaryOptionId: primary.optionId,
      fallbackOptionId: fallback?.optionId ?? null,
      reason: raw.reason,
      overrideJustification,
    };
  });
  return frozen({
    [boundRoundDecisionBrand]: true,
    catalog,
    proposals,
    inheritedReactionGuidance,
    rationale: normalized.rationale,
    selections: normalized.proposals.map((raw) => {
      const actor = catalog.actors[raw.actorIndex];
      if (actor === undefined) throw new RangeError('Normalized actor index escaped its catalog.');
      return {
        actorId: actor.actorId,
        primaryOptionIndex: raw.primaryOptionIndex,
        fallbackOptionIndex: raw.fallbackOptionIndex,
        reason: raw.reason,
      };
    }),
  });
}

/** The exact minimal G1 engine-tool payload, generated only after binding. */
export function minimalRoundSubmission(decision: BoundRoundDecision): Readonly<Record<string, unknown>> {
  return {
    proposals: decision.proposals.map((proposal) => ({
      actor_id: proposal.actorId,
      expected_revision: proposal.expectedRevision,
      primary_option_id: proposal.primaryOptionId,
      fallback_option_id: proposal.fallbackOptionId,
      reason: proposal.reason,
      override_justification: proposal.overrideJustification,
    })),
    ...(decision.rationale === null ? {} : { rationale: decision.rationale }),
  };
}

function overrideKindSchema(kind: EngineOverrideJustificationKind): JsonSchema {
  const kindProperty = { type: 'string', enum: [kind] };
  if (isSimpleOverrideKind(kind)) {
    return {
      type: 'object',
      additionalProperties: false,
      properties: { kind: kindProperty },
      required: ['kind'],
    };
  }
  switch (kind) {
    case 'engine_play':
      return {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: kindProperty,
          token: { anyOf: [{ type: 'null' }, { type: 'string' }] },
        },
        required: ['kind', 'token'],
      };
    case 'missing_metric':
      return {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: kindProperty,
          id: { anyOf: [{ type: 'null' }, { type: 'string', enum: ENGINE_OPTION_METRICS }] },
        },
        required: ['kind', 'id'],
      };
  }
  kind satisfies never;
  throw new Error('Unreachable override justification schema kind.');
}

function overrideSchema(): JsonSchema {
  return {
    anyOf: [
      { type: 'null' },
      ...ENGINE_OVERRIDE_JUSTIFICATION_KINDS.map((kind) => overrideKindSchema(kind)),
    ],
  };
}

/**
 * The engine override contract is the sole source for Codex's strict final
 * schema. Bounds and digest equality remain normalizer responsibilities
 * because the structured-output JSON Schema subset does not support them.
 */
export function finalIndicesDecisionSchema(catalog: DecisionCatalog): JsonSchema {
  const fallback = catalog.phase === 'correction'
    ? { type: 'null' }
    : { type: 'integer' };
  const proposalProperties: Record<string, JsonSchema> = {};
  for (const actor of catalog.actors) {
    proposalProperties[actor.actorId] = {
      type: 'object',
      additionalProperties: false,
      properties: {
        primaryOptionIndex: { type: 'integer' },
        fallbackOptionIndex: fallback,
        override: overrideSchema(),
        reason: { type: 'string' },
      },
      required: ['primaryOptionIndex', 'fallbackOptionIndex', 'override', 'reason'],
    };
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      catalogDigest: { type: 'string', enum: [catalog.digest] },
      proposals: {
        type: 'object',
        additionalProperties: false,
        properties: proposalProperties,
        required: catalog.actors.map((actor) => actor.actorId),
      },
      reaction_guidance: {
        type: 'object',
        additionalProperties: false,
        properties: { inherit: { type: 'boolean', enum: [true] } },
        required: ['inherit'],
      },
      rationale: { anyOf: [{ type: 'null' }, { type: 'string' }] },
    },
    required: ['catalogDigest', 'proposals', 'reaction_guidance', 'rationale'],
  };
}

export const STRICT_STRUCTURED_OUTPUT_FORBIDDEN_KEYWORDS = [
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'const',
] as const;

export type StrictStructuredOutputForbiddenKeyword =
  (typeof STRICT_STRUCTURED_OUTPUT_FORBIDDEN_KEYWORDS)[number];

export type StrictStructuredOutputSchemaViolation =
  | { readonly kind: 'additional_properties'; readonly path: string }
  | {
      readonly kind: 'required_properties_mismatch';
      readonly path: string;
      readonly propertyKeys: readonly string[];
      readonly requiredKeys: readonly string[];
    }
  | {
      readonly kind: 'forbidden_keyword';
      readonly path: string;
      readonly keyword: StrictStructuredOutputForbiddenKeyword;
    };

/** Walk the emitted schema and return only violations of the strict-output subset. */
export function strictStructuredOutputSchemaViolations(
  schema: unknown,
  path = 'schema',
): readonly StrictStructuredOutputSchemaViolation[] {
  const violations: StrictStructuredOutputSchemaViolation[] = [];
  if (Array.isArray(schema)) {
    schema.forEach((nested, index) => {
      violations.push(...strictStructuredOutputSchemaViolations(nested, `${path}[${String(index)}]`));
    });
    return violations;
  }
  const input = record(schema);
  if (input === null) return violations;
  for (const keyword of STRICT_STRUCTURED_OUTPUT_FORBIDDEN_KEYWORDS) {
    if (keyword in input) violations.push({ kind: 'forbidden_keyword', path, keyword });
  }
  if (input['type'] === 'object') {
    if (input['additionalProperties'] !== false) {
      violations.push({ kind: 'additional_properties', path });
    }
    const properties = record(input['properties']);
    const required = input['required'];
    const propertyKeys = properties === null ? [] : Object.keys(properties).sort();
    const requiredKeys = Array.isArray(required) && required.every((key) => typeof key === 'string')
      ? [...required].sort()
      : [];
    if (properties === null || !Array.isArray(required) || requiredKeys.length !== required.length ||
      propertyKeys.length !== requiredKeys.length ||
      propertyKeys.some((key, index) => key !== requiredKeys[index])) {
      violations.push({ kind: 'required_properties_mismatch', path, propertyKeys, requiredKeys });
    }
  }
  for (const [key, nested] of Object.entries(input)) {
    if (key === 'properties') {
      const properties = record(nested);
      if (properties !== null) {
        for (const [propertyKey, propertySchema] of Object.entries(properties)) {
          violations.push(...strictStructuredOutputSchemaViolations(
            propertySchema,
            `${path}.properties[${JSON.stringify(propertyKey)}]`,
          ));
        }
      }
      continue;
    }
    violations.push(...strictStructuredOutputSchemaViolations(nested, `${path}.${key}`));
  }
  return violations;
}

/** Assert that every object and keyword obeys Codex's strict-output subset. */
export function assertStrictStructuredOutputSchema(schema: unknown): void {
  const violations = strictStructuredOutputSchemaViolations(schema);
  if (violations.length > 0) {
    throw new TypeError(`Strict structured-output schema invariant failed: ${JSON.stringify(violations)}`);
  }
}
