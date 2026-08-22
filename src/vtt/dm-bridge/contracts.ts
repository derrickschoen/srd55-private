import type { EncounterCommand } from '../../combat/events';
import type { GridCell } from '../../combat/grid';
import type { DmVisibleEncounterState } from '../../combat/visibility';
import {
  combatantId,
  type CodexSessionId,
  type CombatantId,
  type EncounterSessionId,
} from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';
import type { SessionHistoryEntry } from '../session-persistence';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  E02_SHARED_INSTRUCTIONS,
  ROUND_PLAN_JS_REPLY_CONTRACT,
  ROUND_PLAN_REPLY_CONTRACT,
  STEERING_REPLY_JSON_SCHEMA,
  decodeJsRoundPlanSourceStructure,
  decodeRoundPlanStructure,
  decodeSteeringReplyStructure,
  e01RoundPlanReplyContract,
  e02RoundPlanReplyContract,
  e03RoundPlanReplyContract,
  roundPlanReplyContract,
  type DecisionProgram,
  type E01PromptVariant,
  type E01RoundPlanReplyContract,
  type E02CompactRoundPlanReplyContract,
  type E02PromptVariant,
  type E03CompactRoundPlanReplyContract,
  type E03PromptVariant,
  type JsRoundPlanSourceReply,
  type MonsterRoundProgram,
  type PlanAction,
  type RoundPlan,
  type RoundPlanReplyContract,
  type RoundPlanSurface,
  type StatePredicate,
  type SteeringOverride,
  type SteeringReply,
  type SteeringStance,
  type TargetSelector,
} from './round-plan-contract';
import {
  interpretJsTurnProgram,
  type TypeCheckUniqueCatchObservation,
  type JsTurnProgramExecution,
  type JsTurnProgramLimits,
} from './js-turn-program';
import {
  JsTurnProgramTypeError,
  generateTurnProgramDeclarations,
  typeCheckJsTurnProgram,
  type TurnProgramAmbientApiDescription,
  type TurnProgramTypeCheckTelemetry,
} from './turn-program-types';

export {
  DM_BRIDGE_PROTOCOL_VERSION,
  E02_SHARED_INSTRUCTIONS,
  MAX_ROUND_PLAN_CORRECTIONS,
  ROUND_PLAN_CANONICAL_EXAMPLE,
  ROUND_PLAN_JS_REPLY_CONTRACT,
  ROUND_PLAN_REPLY_CONTRACT,
  ROUND_PLAN_REPLY_JSON_SCHEMA,
  STEERING_REPLY_JSON_SCHEMA,
  decodeRoundPlanStructure,
  e01RoundPlanReplyContract,
  e02RoundPlanReplyContract,
  e03RoundPlanReplyContract,
  roundPlanReplyContract,
  type DecisionProgram,
  type E01PromptVariant,
  type E01RoundPlanReplyContract,
  type E02CompactRoundPlanReplyContract,
  type E02PromptVariant,
  type E03CompactRoundPlanReplyContract,
  type E03PromptVariant,
  type JsMonsterProgramSource,
  type JsProgramRoundPlanReplyContract,
  type JsRoundPlanSourceReply,
  type JsonAstRoundPlanReplyContract,
  type MonsterRoundProgram,
  type PlanAction,
  type RoundPlan,
  type RoundPlanReplyContract,
  type RoundPlanSurface,
  type StatePredicate,
  type SteeringOverride,
  type SteeringReply,
  type SteeringStance,
  type TargetSelector,
} from './round-plan-contract';
export const DEFAULT_DM_MODEL = 'gpt-5.6-terra' as const;
export const DEFAULT_DM_REASONING_EFFORT = 'medium' as const;

export interface DmBridgeModelConfig {
  readonly model: string;
  readonly reasoningEffort: 'low' | 'medium' | 'high' | 'xhigh';
}

export const DEFAULT_DM_MODEL_CONFIG: DmBridgeModelConfig = {
  model: DEFAULT_DM_MODEL,
  reasoningEffort: DEFAULT_DM_REASONING_EFFORT,
};

export type NarrationVoice =
  | 'cinematic_visible_rolls'
  | 'terse_tactical'
  | 'rules_explicit'
  | 'terse_rule_citing_validation';

export interface ValidationLine {
  readonly ruleId: string;
  readonly srdLocator: string;
  readonly sentence: string;
}

export type Narration =
  | {
      readonly kind: 'narration';
      readonly voice: 'cinematic_visible_rolls';
      readonly sentence: string;
      readonly visibleRolls: readonly {
        readonly label: string;
        readonly faces: readonly number[];
        readonly total: number;
      }[];
    }
  | {
      readonly kind: 'narration';
      readonly voice: 'terse_tactical';
      readonly sentence: string;
    }
  | {
      readonly kind: 'narration';
      readonly voice: 'rules_explicit';
      readonly sentence: string;
      readonly rules: readonly ValidationLine[];
    }
  | {
      readonly kind: 'narration';
      readonly voice: 'terse_rule_citing_validation';
      readonly lines: readonly ValidationLine[];
    };

export interface AdjudicationProposal {
  readonly kind: 'adjudication_proposal';
  readonly target: CombatantId;
  readonly subject: string;
  readonly reasoning: string;
  readonly consequence:
    | { readonly kind: 'hit_point_delta'; readonly amount: number }
    | { readonly kind: 'relocate'; readonly to: GridCell };
}

export type DmBridgeReply = RoundPlan | JsRoundPlanSourceReply | Narration | AdjudicationProposal;

export interface RoundPlanRequest {
  readonly kind: 'round_plan_request';
  readonly protocolVersion: typeof DM_BRIDGE_PROTOCOL_VERSION;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly codexSessionId: CodexSessionId;
  readonly model: DmBridgeModelConfig;
  readonly projection: DmBoardProjection;
  readonly history: readonly SessionHistoryEntry[];
  readonly livingMonsterIds: readonly CombatantId[];
  readonly surface: RoundPlanSurface;
  readonly replyContract: RoundPlanReplyContract;
  readonly correctionAttempt: 0;
  readonly ambientApiDescriptions?: readonly TurnProgramAmbientApiDescription[];
}

export interface MonsterReconsultRequest {
  readonly kind: 'monster_reconsult_request';
  readonly protocolVersion: typeof DM_BRIDGE_PROTOCOL_VERSION;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly codexSessionId: CodexSessionId;
  readonly model: DmBridgeModelConfig;
  readonly projection: DmBoardProjection;
  readonly history: readonly SessionHistoryEntry[];
  readonly monsterId: CombatantId;
  readonly invalidation: string;
  readonly scope: 'monster_remaining_round';
  readonly surface: RoundPlanSurface;
  readonly replyContract: RoundPlanReplyContract;
  readonly correctionAttempt: 0;
  readonly ambientApiDescriptions?: readonly TurnProgramAmbientApiDescription[];
}

export interface RoundPlanCorrectionRequest {
  readonly kind: 'round_plan_correction_request';
  readonly protocolVersion: typeof DM_BRIDGE_PROTOCOL_VERSION;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly originalRequestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly codexSessionId: CodexSessionId;
  readonly model: DmBridgeModelConfig;
  readonly projection: DmBoardProjection;
  readonly history: readonly SessionHistoryEntry[];
  readonly requestedMonsterIds: readonly CombatantId[];
  readonly validatorError: string;
  readonly surface: RoundPlanSurface;
  readonly replyContract: RoundPlanReplyContract;
  readonly correctionAttempt: 1 | 2;
  readonly ambientApiDescriptions?: readonly TurnProgramAmbientApiDescription[];
}

export type SteeringConsultReason =
  | 'every_round'
  | 'round_one'
  | 'near_tie_top_actions'
  | 'combatant_down_or_dead'
  | 'control_change'
  | 'retreat_threshold';

export interface SteeringRoundRequest {
  readonly kind: 'steering_round_request';
  readonly protocolVersion: typeof DM_BRIDGE_PROTOCOL_VERSION;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly codexSessionId: CodexSessionId;
  readonly model: DmBridgeModelConfig;
  readonly projection: DmBoardProjection;
  readonly history: readonly SessionHistoryEntry[];
  readonly proposal: RoundPlan;
  readonly consultReason: SteeringConsultReason;
  readonly replyContract: {
    readonly schemaVersion: 1;
    readonly jsonSchema: typeof STEERING_REPLY_JSON_SCHEMA;
  };
  readonly correctionAttempt: 0;
}

export type DmBridgeRequest =
  | RoundPlanRequest
  | MonsterReconsultRequest
  | RoundPlanCorrectionRequest
  | SteeringRoundRequest;

export interface DmBridgeExchange {
  exchange(request: DmBridgeRequest, signal: AbortSignal): Promise<unknown>;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  label: string,
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key));
  if (unexpected !== undefined) throw new TypeError(`${label} contains unexpected field ${unexpected}.`);
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  const decoded = finiteNumber(value, label);
  if (!Number.isSafeInteger(decoded) || decoded < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return decoded;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty trimmed string.`);
  }
  return value;
}

function gridCell(value: unknown, label: string): GridCell {
  const input = record(value, label);
  exactKeys(input, ['column', 'row'], label);
  return { column: integer(input.column, `${label}.column`), row: integer(input.row, `${label}.row`) };
}

function combatantIds(predicate: StatePredicate): readonly CombatantId[] {
  switch (predicate.kind) {
    case 'life_is':
    case 'hp_percent_below':
      return [predicate.combatantId];
    case 'distance_at_most':
      return [predicate.left, predicate.right];
    case 'not':
      return combatantIds(predicate.predicate);
    case 'all':
    case 'any':
      return predicate.predicates.flatMap(combatantIds);
  }
}

function programCombatantIds(program: DecisionProgram): readonly CombatantId[] {
  switch (program.kind) {
    case 'action': {
      const actionTarget = 'target' in program.action ? program.action.target : null;
      const actionIds = actionTarget?.kind === 'combatant'
        ? [actionTarget.combatantId]
        : [];
      const riderIds = (program.riders ?? []).flatMap((rider) => {
        const target = 'target' in rider.followUpAction ? rider.followUpAction.target : null;
        return target?.kind === 'combatant' ? [target.combatantId] : [];
      });
      return [...actionIds, ...riderIds];
    }
    case 'if':
      return [
        ...combatantIds(program.predicate),
        ...programCombatantIds(program.then),
        ...programCombatantIds(program.else),
      ];
    case 'priority':
      return program.choices.flatMap(programCombatantIds);
  }
}

function validateProgramVocabulary(program: DecisionProgram, projection: DmVisibleEncounterState): void {
  const visibleIds = new Set(projection.combatants.map((subject) => subject.id));
  const missing = programCombatantIds(program).find((id) => !visibleIds.has(id));
  if (missing !== undefined) {
    throw new TypeError(`Decision program references combatant ${missing} outside the DM projection.`);
  }
}

export function decodeRoundPlan(
  value: unknown,
  request: RoundPlanRequest | MonsterReconsultRequest | RoundPlanCorrectionRequest | SteeringRoundRequest,
): RoundPlan {
  const input = decodeRoundPlanStructure(value);
  if (
    input.kind !== 'round_plan' ||
    input.protocolVersion !== DM_BRIDGE_PROTOCOL_VERSION ||
    input.encounterId !== request.encounterId ||
    input.requestId !== request.requestId ||
    input.expectedRevision !== request.expectedRevision ||
    input.round !== request.round
  ) {
    throw new TypeError('Round plan envelope is stale or malformed.');
  }
  const monsters = input.monsters;
  for (const entry of monsters) validateProgramVocabulary(entry.program, request.projection.encounter);
  const expected = request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : request.kind === 'monster_reconsult_request'
      ? [request.monsterId]
      : request.kind === 'round_plan_correction_request'
        ? request.requestedMonsterIds
        : request.proposal.monsters.map((entry) => entry.monsterId);
  if (
    monsters.length !== expected.length ||
    new Set(monsters.map((entry) => entry.monsterId)).size !== monsters.length ||
    expected.some((id) => !monsters.some((entry) => entry.monsterId === id))
  ) {
    throw new TypeError('Round plan must contain exactly one program for each requested monster.');
  }
  return {
    kind: 'round_plan',
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: request.encounterId,
    requestId: request.requestId,
    expectedRevision: request.expectedRevision,
    round: request.round,
    monsters,
  };
}

export function decodeSteeringReply(
  value: unknown,
  request: SteeringRoundRequest,
): SteeringReply {
  const reply = decodeSteeringReplyStructure(value);
  if (
    reply.protocolVersion !== request.protocolVersion ||
    reply.encounterId !== request.encounterId ||
    reply.requestId !== request.requestId ||
    reply.expectedRevision !== request.expectedRevision ||
    reply.round !== request.round
  ) {
    throw new TypeError('Steering reply envelope is stale or malformed.');
  }
  if (reply.kind === 'steering_replacement') {
    decodeRoundPlan(reply.replacement, request);
  }
  return reply;
}

export interface JsProgramArtifact extends JsTurnProgramExecution {
  readonly monsterId: CombatantId;
  readonly ambientDeclarations: string | null;
  readonly typeCheck: TurnProgramTypeCheckTelemetry | null;
}

export interface DecodedRoundPlanReply {
  readonly plan: RoundPlan;
  readonly jsPrograms: readonly JsProgramArtifact[];
}

type ShadowInterpreter = typeof interpretJsTurnProgram;

/**
 * Classifies a typed refusal on a disposable clone. The function has no
 * reducer, exchange, or transcript capability, so the observation cannot
 * become encounter authority.
 */
export function observeTypeCheckUniqueCatch(
  source: string,
  state: DmVisibleEncounterState,
  monsterId: CombatantId,
  diagnosticCodes: readonly number[],
  limits: JsTurnProgramLimits = {},
  shadowInterpreter: ShadowInterpreter = interpretJsTurnProgram,
): TypeCheckUniqueCatchObservation {
  const shadowState = structuredClone(state);
  try {
    shadowInterpreter(source, shadowState, monsterId, limits);
    return {
      monsterId,
      source,
      diagnosticCodes: [...diagnosticCodes],
      outcome: 'caughtOnlyByTypeCheck',
      runtimeError: null,
    };
  } catch (error: unknown) {
    return {
      monsterId,
      source,
      diagnosticCodes: [...diagnosticCodes],
      outcome: 'caughtByBoth',
      runtimeError: error instanceof Error ? error.message : String(error),
    };
  }
}

function expectedMonsterIds(
  request: RoundPlanRequest | MonsterReconsultRequest | RoundPlanCorrectionRequest,
): readonly CombatantId[] {
  return request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : request.kind === 'monster_reconsult_request'
      ? [request.monsterId]
      : request.requestedMonsterIds;
}

function validateJsEnvelope(
  input: JsRoundPlanSourceReply,
  request: RoundPlanRequest | MonsterReconsultRequest | RoundPlanCorrectionRequest,
): void {
  if (
    input.protocolVersion !== DM_BRIDGE_PROTOCOL_VERSION ||
    input.encounterId !== request.encounterId ||
    input.requestId !== request.requestId ||
    input.expectedRevision !== request.expectedRevision ||
    input.round !== request.round
  ) {
    throw new TypeError('JS round plan envelope is stale or malformed.');
  }
  const expected = expectedMonsterIds(request);
  if (
    input.monsters.length !== expected.length ||
    new Set(input.monsters.map((entry) => entry.monsterId)).size !== input.monsters.length ||
    expected.some((id) => !input.monsters.some((entry) => entry.monsterId === id))
  ) {
    throw new TypeError('JS round plan must contain exactly one source program for each requested monster.');
  }
}

export function decodeRoundPlanReply(
  value: unknown,
  request: RoundPlanRequest | MonsterReconsultRequest | RoundPlanCorrectionRequest,
  limits: JsTurnProgramLimits = {},
): DecodedRoundPlanReply {
  if (request.replyContract.surface !== request.surface) {
    throw new TypeError('Round plan surface and reply contract disagree.');
  }
  if (request.surface === 'json_ast') return { plan: decodeRoundPlan(value, request), jsPrograms: [] };
  const input = decodeJsRoundPlanSourceStructure(value);
  validateJsEnvelope(input, request);
  const jsPrograms = input.monsters.map((entry): JsProgramArtifact => {
    const typed = limits.typeCheckMode !== 'untyped';
    const declarations = typed
      ? generateTurnProgramDeclarations(request.projection, entry.monsterId)
      : null;
    const typeCheck = declarations === null
      ? null
      : typeCheckJsTurnProgram(entry.source, declarations.source, limits.now);
    if (typeCheck !== null) limits.onTypeCheckTelemetry?.(typeCheck);
    if (typeCheck !== null && !typeCheck.passed) {
      limits.onTypeCheckUniqueCatch?.(observeTypeCheckUniqueCatch(
        entry.source,
        request.projection.encounter,
        entry.monsterId,
        typeCheck.diagnosticCodes,
        limits,
      ));
      throw new JsTurnProgramTypeError(typeCheck.diagnostics);
    }
    return {
      monsterId: entry.monsterId,
      ambientDeclarations: declarations?.source ?? null,
      typeCheck,
      ...interpretJsTurnProgram(entry.source, request.projection.encounter, entry.monsterId, limits),
    };
  });
  const plan = decodeRoundPlan({
    kind: 'round_plan',
    protocolVersion: input.protocolVersion,
    encounterId: input.encounterId,
    requestId: input.requestId,
    expectedRevision: input.expectedRevision,
    round: input.round,
    monsters: jsPrograms.map((artifact) => ({
      monsterId: artifact.monsterId,
      program: artifact.emittedDecisionProgram,
    })),
  }, request);
  return { plan, jsPrograms };
}

export function adjudicationCommand(
  proposal: AdjudicationProposal,
  projection: DmVisibleEncounterState,
): Extract<EncounterCommand, { readonly type: 'adjudicate' }> {
  if (!projection.combatants.some((subject) => subject.id === proposal.target)) {
    throw new TypeError('Adjudication target is outside the full DM projection.');
  }
  return {
    type: 'adjudicate',
    target: proposal.target,
    subject: proposal.subject,
    reasoning: proposal.reasoning,
    consequence: proposal.consequence,
  };
}

export const dmBridgeContractInternals = { record, exactKeys, finiteNumber, integer, string, gridCell };
