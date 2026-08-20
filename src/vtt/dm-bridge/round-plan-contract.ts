import { z } from 'zod';
import type { GridCell } from '../../combat/grid';
import {
  combatantId,
  encounterSessionId,
  type CombatantId,
  type EncounterSessionId,
} from '../../combat/values';
import {
  JS_TURN_PROGRAM_CANONICAL_EXAMPLE,
  JS_TURN_PROGRAM_GRAMMAR,
} from './js-turn-program';

export const DM_BRIDGE_PROTOCOL_VERSION = 2 as const;
export const ROUND_PLAN_CONTRACT_SCHEMA_VERSION = 1 as const;
export const MAX_ROUND_PLAN_CORRECTIONS = 2 as const;

export type StatePredicate =
  | {
      readonly kind: 'life_is';
      readonly combatantId: CombatantId;
      readonly value: 'living' | 'dying' | 'stable' | 'dead';
    }
  | {
      readonly kind: 'hp_percent_below';
      readonly combatantId: CombatantId;
      readonly percent: number;
    }
  | {
      readonly kind: 'distance_at_most';
      readonly left: CombatantId;
      readonly right: CombatantId;
      readonly feet: number;
    }
  | { readonly kind: 'not'; readonly predicate: StatePredicate }
  | { readonly kind: 'all'; readonly predicates: readonly StatePredicate[] }
  | { readonly kind: 'any'; readonly predicates: readonly StatePredicate[] };

export type TargetSelector =
  | { readonly kind: 'combatant'; readonly combatantId: CombatantId }
  | { readonly kind: 'nearest_enemy' };

export type PlanAction =
  | { readonly kind: 'attack'; readonly target: TargetSelector }
  | { readonly kind: 'force_save'; readonly target: TargetSelector }
  | { readonly kind: 'move_toward'; readonly target: TargetSelector }
  | { readonly kind: 'retreat_toward'; readonly destination: GridCell }
  | {
      readonly kind: 'use_action';
      readonly action: 'dash' | 'disengage' | 'dodge' | 'end_turn';
    };

export type DecisionProgram =
  | { readonly kind: 'action'; readonly action: PlanAction }
  | {
      readonly kind: 'if';
      readonly predicate: StatePredicate;
      readonly then: DecisionProgram;
      readonly else: DecisionProgram;
    }
  | { readonly kind: 'priority'; readonly choices: readonly DecisionProgram[] };

export interface MonsterRoundProgram {
  readonly monsterId: CombatantId;
  readonly program: DecisionProgram;
}

export interface RoundPlan {
  readonly kind: 'round_plan';
  readonly protocolVersion: typeof DM_BRIDGE_PROTOCOL_VERSION;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly monsters: readonly MonsterRoundProgram[];
}

export type RoundPlanSurface = 'json_ast' | 'js_program';

export interface JsMonsterProgramSource {
  readonly monsterId: CombatantId;
  readonly source: string;
}

export interface JsRoundPlanSourceReply {
  readonly kind: 'js_round_plan';
  readonly protocolVersion: typeof DM_BRIDGE_PROTOCOL_VERSION;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly monsters: readonly JsMonsterProgramSource[];
}

const trimmedString = z.string().trim().min(1);
const combatantIdSchema = trimmedString.transform((value) => combatantId(value));
const encounterSessionIdSchema = trimmedString.transform((value) => encounterSessionId(value));
const nonNegativeInteger = z.number().int().nonnegative();
const nonNegativeNumber = z.number().nonnegative();
const gridCellSchema = z.strictObject({
  column: nonNegativeInteger,
  row: nonNegativeInteger,
});

const targetSelectorSchema: z.ZodType<TargetSelector> = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('combatant'), combatantId: combatantIdSchema }),
  z.strictObject({ kind: z.literal('nearest_enemy') }),
]);

const planActionSchema: z.ZodType<PlanAction> = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('attack'), target: targetSelectorSchema }),
  z.strictObject({ kind: z.literal('force_save'), target: targetSelectorSchema }),
  z.strictObject({ kind: z.literal('move_toward'), target: targetSelectorSchema }),
  z.strictObject({ kind: z.literal('retreat_toward'), destination: gridCellSchema }),
  z.strictObject({
    kind: z.literal('use_action'),
    action: z.enum(['dash', 'disengage', 'dodge', 'end_turn']),
  }),
]);

const predicateSchemas: Array<z.ZodType<StatePredicate> | undefined> = [];
function predicateSchema(depth: number): z.ZodType<StatePredicate> {
  const cached = predicateSchemas[depth];
  if (cached !== undefined) return cached;
  const nested: z.ZodType<StatePredicate> = depth === 20
    ? z.never()
    : z.lazy(() => predicateSchema(depth + 1));
  const schema: z.ZodType<StatePredicate> = z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('life_is'),
      combatantId: combatantIdSchema,
      value: z.enum(['living', 'dying', 'stable', 'dead']),
    }),
    z.strictObject({
      kind: z.literal('hp_percent_below'),
      combatantId: combatantIdSchema,
      percent: z.number().positive().max(100),
    }),
    z.strictObject({
      kind: z.literal('distance_at_most'),
      left: combatantIdSchema,
      right: combatantIdSchema,
      feet: nonNegativeNumber,
    }),
    z.strictObject({ kind: z.literal('not'), predicate: nested }),
    z.strictObject({ kind: z.literal('all'), predicates: z.array(nested).min(1).max(20) }),
    z.strictObject({ kind: z.literal('any'), predicates: z.array(nested).min(1).max(20) }),
  ]);
  predicateSchemas[depth] = schema;
  return schema;
}

const programSchemas: Array<z.ZodType<DecisionProgram> | undefined> = [];
function programSchema(depth: number): z.ZodType<DecisionProgram> {
  const cached = programSchemas[depth];
  if (cached !== undefined) return cached;
  const nested: z.ZodType<DecisionProgram> = depth === 20
    ? z.never()
    : z.lazy(() => programSchema(depth + 1));
  const schema: z.ZodType<DecisionProgram> = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('action'), action: planActionSchema }),
    z.strictObject({
      kind: z.literal('if'),
      predicate: predicateSchema(0),
      then: nested,
      else: nested,
    }),
    z.strictObject({ kind: z.literal('priority'), choices: z.array(nested).min(1).max(20) }),
  ]);
  programSchemas[depth] = schema;
  return schema;
}

const roundPlanSchema: z.ZodType<RoundPlan> = z.strictObject({
  kind: z.literal('round_plan'),
  protocolVersion: z.literal(DM_BRIDGE_PROTOCOL_VERSION),
  encounterId: encounterSessionIdSchema,
  requestId: trimmedString,
  expectedRevision: nonNegativeInteger,
  round: nonNegativeInteger,
  monsters: z.array(z.strictObject({
    monsterId: combatantIdSchema,
    program: programSchema(0),
  })),
});

const jsRoundPlanSourceSchema: z.ZodType<JsRoundPlanSourceReply> = z.strictObject({
  kind: z.literal('js_round_plan'),
  protocolVersion: z.literal(DM_BRIDGE_PROTOCOL_VERSION),
  encounterId: encounterSessionIdSchema,
  requestId: trimmedString,
  expectedRevision: nonNegativeInteger,
  round: nonNegativeInteger,
  monsters: z.array(z.strictObject({
    monsterId: combatantIdSchema,
    source: z.string().min(1).max(100_000),
  })),
});

function issuePath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, segment) =>
    typeof segment === 'number' ? `${result}[${String(segment)}]` : `${result}.${String(segment)}`,
  'round plan');
}

function validatorMessage(error: z.ZodError): string {
  const issue = error.issues.find((candidate) => candidate.code === 'unrecognized_keys')
    ?? error.issues[0];
  if (issue === undefined) return 'Round plan failed structural validation.';
  if (issue.code === 'unrecognized_keys') {
    return `${issuePath(issue.path)} contains unexpected field ${issue.keys[0] ?? 'unknown'}.`;
  }
  return `${issuePath(issue.path)} ${issue.message}`;
}

export function decodeRoundPlanStructure(value: unknown): RoundPlan {
  const result = roundPlanSchema.safeParse(value);
  if (!result.success) throw new TypeError(validatorMessage(result.error));
  return result.data;
}

export function decodeJsRoundPlanSourceStructure(value: unknown): JsRoundPlanSourceReply {
  const result = jsRoundPlanSourceSchema.safeParse(value);
  if (!result.success) throw new TypeError(validatorMessage(result.error));
  return result.data;
}

export const ROUND_PLAN_REPLY_JSON_SCHEMA = Object.freeze(z.toJSONSchema(roundPlanSchema, {
  io: 'input',
  reused: 'ref',
}));

export const ROUND_PLAN_CANONICAL_EXAMPLE: RoundPlan = decodeRoundPlanStructure({
  kind: 'round_plan',
  protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
  encounterId: 'encounter:canonical-example',
  requestId: 'request:canonical-example',
  expectedRevision: 7,
  round: 2,
  monsters: [{
    monsterId: 'combatant:canonical-monster',
    program: {
      kind: 'priority',
      choices: [
        { kind: 'action', action: { kind: 'attack', target: { kind: 'nearest_enemy' } } },
        { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
      ],
    },
  }],
});

interface RoundPlanReplyContractBase {
  readonly schemaVersion: typeof ROUND_PLAN_CONTRACT_SCHEMA_VERSION;
  readonly maximumCorrectionAttempts: typeof MAX_ROUND_PLAN_CORRECTIONS;
}

export interface JsonAstRoundPlanReplyContract extends RoundPlanReplyContractBase {
  readonly surface: 'json_ast';
  readonly jsonSchema: typeof ROUND_PLAN_REPLY_JSON_SCHEMA;
  readonly canonicalExample: RoundPlan;
}

export interface JsProgramRoundPlanReplyContract extends RoundPlanReplyContractBase {
  readonly surface: 'js_program';
  readonly grammar: typeof JS_TURN_PROGRAM_GRAMMAR;
  readonly canonicalExample: typeof JS_TURN_PROGRAM_CANONICAL_EXAMPLE;
}

export type RoundPlanReplyContract = JsonAstRoundPlanReplyContract | JsProgramRoundPlanReplyContract;

export const ROUND_PLAN_REPLY_CONTRACT: JsonAstRoundPlanReplyContract = Object.freeze({
  surface: 'json_ast',
  schemaVersion: ROUND_PLAN_CONTRACT_SCHEMA_VERSION,
  jsonSchema: ROUND_PLAN_REPLY_JSON_SCHEMA,
  canonicalExample: ROUND_PLAN_CANONICAL_EXAMPLE,
  maximumCorrectionAttempts: MAX_ROUND_PLAN_CORRECTIONS,
});

export const ROUND_PLAN_JS_REPLY_CONTRACT: JsProgramRoundPlanReplyContract = Object.freeze({
  surface: 'js_program',
  schemaVersion: ROUND_PLAN_CONTRACT_SCHEMA_VERSION,
  grammar: JS_TURN_PROGRAM_GRAMMAR,
  canonicalExample: JS_TURN_PROGRAM_CANONICAL_EXAMPLE,
  maximumCorrectionAttempts: MAX_ROUND_PLAN_CORRECTIONS,
});

export function roundPlanReplyContract(surface: RoundPlanSurface): RoundPlanReplyContract {
  return surface === 'json_ast' ? ROUND_PLAN_REPLY_CONTRACT : ROUND_PLAN_JS_REPLY_CONTRACT;
}
