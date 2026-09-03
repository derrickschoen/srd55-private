import type { CombatantId } from '../combat/values';
import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { ReactionGuidanceDeclaration } from './reaction-guidance';
import type { EngineOptionId, EngineTurnProposal } from './turn-proposal';

const decisionActorIndexBrand = Symbol('DecisionActorIndex');
const decisionOptionIndexBrand = Symbol('DecisionOptionIndex');
const normalizedRoundDecisionBrand = Symbol('NormalizedRoundDecision');
const boundRoundDecisionBrand = Symbol('BoundRoundDecision');

/** The decision transports considered by the A1/A3 ingress. */
export type DecisionTransport = 'mcp_minimal' | 'final_ids' | 'final_indices';

export type DecisionActorIndex = number & { readonly [decisionActorIndexBrand]: true };
export type DecisionOptionIndex = number & { readonly [decisionOptionIndexBrand]: true };

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
  readonly proposals: readonly {
    readonly actorIndex: DecisionActorIndex;
    readonly primaryOptionIndex: DecisionOptionIndex;
    readonly fallbackOptionIndex: DecisionOptionIndex | null;
    readonly override: DecisionOverride | null;
  }[];
}

export interface DecisionOverride {
  readonly reason: 'morale' | 'objective' | 'roleplay' | 'resource_conservation' | 'unknown_engine_gap';
  readonly note: string | null;
}

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
  | 'non_null_correction_fallback';

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

interface NormalizedRoundDecision {
  readonly [normalizedRoundDecisionBrand]: true;
  readonly catalogDigest: string;
  readonly proposals: RawIndexDecision['proposals'];
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
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

function optionalClosedRecord(
  value: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && Object.keys(value).every((key) => allowed.has(key));
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

function parseOverride(value: unknown): DecisionOverride | null | undefined {
  if (value === null) return null;
  const input = record(value);
  if (input === null || !closedRecord(input, ['reason', 'note']) ||
    (input['reason'] !== 'morale' && input['reason'] !== 'objective' && input['reason'] !== 'roleplay' &&
      input['reason'] !== 'resource_conservation' && input['reason'] !== 'unknown_engine_gap') ||
    (typeof input['note'] !== 'string' && input['note'] !== null)) return undefined;
  if (input['reason'] === 'unknown_engine_gap' && typeof input['note'] !== 'string') return undefined;
  return { reason: input['reason'], note: input['note'] };
}

type RawDialect = 'camel' | 'snake';

function rawDialect(input: Readonly<Record<string, unknown>>): RawDialect | null {
  const hasCamel = 'catalogDigest' in input;
  const hasSnake = 'catalog_digest' in input;
  if (hasCamel === hasSnake) return null;
  if (hasCamel && optionalClosedRecord(input, ['catalogDigest', 'proposals'], [])) return 'camel';
  if (hasSnake && optionalClosedRecord(input, ['catalog_digest', 'proposals'], [])) return 'snake';
  return null;
}

function numberIndex(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function indexWithinActor(value: number, length: number): DecisionOptionIndex | null {
  return value < length ? value as DecisionOptionIndex : null;
}

function indexWithinCatalog(value: number, length: number): DecisionActorIndex | null {
  return value < length ? value as DecisionActorIndex : null;
}

/**
 * Decode only one naming dialect and prove every index lies inside the frozen
 * pre-dispatch catalog. The output is still not engine-ready until binding.
 */
export function normalizeIndexDecision(
  value: unknown,
  catalog: DecisionCatalog,
  inheritedReactionGuidance: ReactionGuidanceDeclaration | null,
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
  if (!Array.isArray(rawProposals)) return failure('invalid_shape');
  const proposals: Array<RawIndexDecision['proposals'][number]> = [];
  const selectedActors = new Set<number>();
  for (const rawProposal of rawProposals) {
    const proposal = record(rawProposal);
    if (proposal === null) return failure('invalid_shape');
    const actorIndexKey = dialect === 'camel' ? 'actorIndex' : 'actor_index';
    const primaryKey = dialect === 'camel' ? 'primaryOptionIndex' : 'primary_option_index';
    const fallbackKey = dialect === 'camel' ? 'fallbackOptionIndex' : 'fallback_option_index';
    const expectedKeys = [actorIndexKey, primaryKey, fallbackKey, 'override'];
    if (!closedRecord(proposal, expectedKeys)) {
      const conflictingDialect = dialect === 'camel'
        ? 'actor_index' in proposal || 'primary_option_index' in proposal || 'fallback_option_index' in proposal
        : 'actorIndex' in proposal || 'primaryOptionIndex' in proposal || 'fallbackOptionIndex' in proposal;
      return failure(conflictingDialect ? 'dialect_mismatch' : 'invalid_shape');
    }
    const actorNumber = numberIndex(proposal[actorIndexKey]);
    if (actorNumber === null) return failure('invalid_shape');
    if (selectedActors.has(actorNumber)) return failure('duplicate_actor');
    const actorIndex = indexWithinCatalog(actorNumber, catalog.actors.length);
    if (actorIndex === null) return failure('unknown_option');
    const actor = catalog.actors[actorIndex];
    if (actor === undefined) return failure('unknown_option');
    const primaryNumber = numberIndex(proposal[primaryKey]);
    if (primaryNumber === null) return failure('invalid_shape');
    const primaryOptionIndex = indexWithinActor(primaryNumber, actor.options.length);
    if (primaryOptionIndex === null) return failure('unknown_option');
    const fallbackValue = proposal[fallbackKey];
    const fallbackOptionIndex = fallbackValue === null
      ? null
      : (() => {
          const fallbackNumber = numberIndex(fallbackValue);
          return fallbackNumber === null ? null : indexWithinActor(fallbackNumber, actor.options.length);
        })();
    if (fallbackValue !== null && fallbackOptionIndex === null) return failure('unknown_option');
    if (catalog.phase === 'correction' && fallbackOptionIndex !== null) {
      return failure('non_null_correction_fallback');
    }
    if (catalog.phase === 'initial' && fallbackOptionIndex === null) return failure('unknown_option');
    if (fallbackOptionIndex !== null && fallbackOptionIndex === primaryOptionIndex) {
      return failure('identical_fallback');
    }
    const override = parseOverride(proposal['override']);
    if (override === undefined) return failure('invalid_shape');
    selectedActors.add(actorNumber);
    proposals.push({ actorIndex, primaryOptionIndex, fallbackOptionIndex, override });
  }
  if (selectedActors.size !== catalog.actors.length) return failure('missing_actor');
  return {
    kind: 'accepted',
    decision: {
      [normalizedRoundDecisionBrand]: true,
      catalogDigest: catalog.digest,
      proposals,
      reactionGuidance: inheritedReactionGuidance,
    },
    codes: [],
  };
}

/** Map checked indices back to the exact ids carried by the frozen catalog. */
export function bindDecision(
  catalog: DecisionCatalog,
  normalized: NormalizedRoundDecision,
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
    const overrideJustification: EngineTurnProposal['overrideJustification'] = raw.override === null
      ? null
      : (() => {
          if (raw.override.reason === 'unknown_engine_gap') {
            if (raw.override.note === null) {
              throw new RangeError('unknown_engine_gap decisions require a note.');
            }
            return { reason: raw.override.reason, note: raw.override.note };
          }
          return {
            reason: raw.override.reason,
            ...(raw.override.note === null ? {} : { note: raw.override.note }),
          };
        })();
    return {
      actorId: actor.actorId,
      expectedRevision: catalog.expectedRevision,
      primaryOptionId: primary.optionId,
      fallbackOptionId: fallback?.optionId ?? null,
      overrideJustification,
    };
  });
  return frozen({
    [boundRoundDecisionBrand]: true,
    catalog,
    proposals,
    inheritedReactionGuidance: normalized.reactionGuidance,
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
      override_justification: proposal.overrideJustification,
    })),
  };
}

function overrideSchema(): JsonSchema {
  return {
    anyOf: [
      { type: 'null' },
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          reason: {
            type: 'string',
            enum: ['morale', 'objective', 'roleplay', 'resource_conservation', 'unknown_engine_gap'],
          },
          note: { type: ['string', 'null'] },
        },
        required: ['reason', 'note'],
      },
    ],
  };
}

/**
 * The runtime contract is the sole source for Codex's strict final schema.
 * Catalog digest is a const so a stale rendered decision cannot decode as a
 * decision for the latest state.
 */
export function finalIndicesDecisionSchema(catalog: DecisionCatalog): JsonSchema {
  const fallback = catalog.phase === 'correction'
    ? { type: 'null' }
    : { type: 'integer', minimum: 0 };
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      catalogDigest: { type: 'string', const: catalog.digest },
      proposals: {
        type: 'array',
        minItems: catalog.actors.length,
        maxItems: catalog.actors.length,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            actorIndex: { type: 'integer', minimum: 0 },
            primaryOptionIndex: { type: 'integer', minimum: 0 },
            fallbackOptionIndex: fallback,
            override: overrideSchema(),
          },
          required: ['actorIndex', 'primaryOptionIndex', 'fallbackOptionIndex', 'override'],
        },
      },
    },
    required: ['catalogDigest', 'proposals'],
  };
}

/** Testable recursion guard for Codex's strict nested object requirement. */
export function assertClosedObjectSchema(schema: unknown, path = 'schema'): void {
  if (Array.isArray(schema)) {
    schema.forEach((nested, index) => assertClosedObjectSchema(nested, `${path}[${String(index)}]`));
    return;
  }
  const input = record(schema);
  if (input === null) return;
  if (input['type'] === 'object') {
    if (input['additionalProperties'] !== false) {
      throw new TypeError(`${path} object schema must set additionalProperties to false.`);
    }
  }
  for (const [key, nested] of Object.entries(input)) {
    assertClosedObjectSchema(nested, `${path}.${key}`);
  }
}
