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

export const DM_BRIDGE_PROTOCOL_VERSION = 1 as const;
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

export type DmBridgeReply = RoundPlan | Narration | AdjudicationProposal;

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
}

export type DmBridgeRequest = RoundPlanRequest | MonsterReconsultRequest;

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

function statePredicate(value: unknown, depth = 0): StatePredicate {
  if (depth > 20) throw new TypeError('Decision predicate nesting exceeds 20 levels.');
  const input = record(value, 'predicate');
  const kind = string(input.kind, 'predicate.kind');
  switch (kind) {
    case 'life_is': {
      exactKeys(input, ['kind', 'combatantId', 'value'], 'life_is predicate');
      const life = string(input.value, 'life_is.value');
      if (life !== 'living' && life !== 'dying' && life !== 'stable' && life !== 'dead') {
        throw new TypeError('life_is.value is outside the visible life vocabulary.');
      }
      return { kind, combatantId: combatantId(string(input.combatantId, 'life_is.combatantId')), value: life };
    }
    case 'hp_percent_below': {
      exactKeys(input, ['kind', 'combatantId', 'percent'], 'hp_percent_below predicate');
      const percent = finiteNumber(input.percent, 'hp_percent_below.percent');
      if (percent <= 0 || percent > 100) throw new RangeError('HP percent threshold must be in (0, 100].');
      return { kind, combatantId: combatantId(string(input.combatantId, 'hp_percent_below.combatantId')), percent };
    }
    case 'distance_at_most': {
      exactKeys(input, ['kind', 'left', 'right', 'feet'], 'distance_at_most predicate');
      const distance = finiteNumber(input.feet, 'distance_at_most.feet');
      if (distance < 0) throw new RangeError('Distance predicate feet must be non-negative.');
      return {
        kind,
        left: combatantId(string(input.left, 'distance_at_most.left')),
        right: combatantId(string(input.right, 'distance_at_most.right')),
        feet: distance,
      };
    }
    case 'not':
      exactKeys(input, ['kind', 'predicate'], 'not predicate');
      return { kind, predicate: statePredicate(input.predicate, depth + 1) };
    case 'all':
    case 'any': {
      exactKeys(input, ['kind', 'predicates'], `${kind} predicate`);
      if (!Array.isArray(input.predicates) || input.predicates.length === 0 || input.predicates.length > 20) {
        throw new TypeError(`${kind}.predicates must contain 1 to 20 entries.`);
      }
      return { kind, predicates: input.predicates.map((predicate) => statePredicate(predicate, depth + 1)) };
    }
    default:
      throw new TypeError(`Unknown state predicate ${kind}.`);
  }
}

function targetSelector(value: unknown): TargetSelector {
  const input = record(value, 'target selector');
  const kind = string(input.kind, 'target.kind');
  switch (kind) {
    case 'combatant':
      exactKeys(input, ['kind', 'combatantId'], 'combatant target');
      return { kind, combatantId: combatantId(string(input.combatantId, 'target.combatantId')) };
    case 'nearest_enemy':
      exactKeys(input, ['kind'], 'nearest_enemy target');
      return { kind };
    default:
      throw new TypeError(`Unknown target selector ${kind}.`);
  }
}

function planAction(value: unknown): PlanAction {
  const input = record(value, 'plan action');
  const kind = string(input.kind, 'plan action.kind');
  switch (kind) {
    case 'attack':
    case 'force_save':
    case 'move_toward':
      exactKeys(input, ['kind', 'target'], `${kind} action`);
      return { kind, target: targetSelector(input.target) };
    case 'retreat_toward':
      exactKeys(input, ['kind', 'destination'], 'retreat_toward action');
      return { kind, destination: gridCell(input.destination, 'retreat_toward.destination') };
    case 'use_action': {
      exactKeys(input, ['kind', 'action'], 'use_action');
      const action = string(input.action, 'use_action.action');
      if (action !== 'dash' && action !== 'disengage' && action !== 'dodge' && action !== 'end_turn') {
        throw new TypeError('use_action.action is outside the plan action vocabulary.');
      }
      return { kind, action };
    }
    default:
      throw new TypeError(`Unknown plan action ${kind}.`);
  }
}

function decisionProgram(value: unknown, depth = 0): DecisionProgram {
  if (depth > 20) throw new TypeError('Decision program nesting exceeds 20 levels.');
  const input = record(value, 'decision program');
  const kind = string(input.kind, 'decision program.kind');
  switch (kind) {
    case 'action':
      exactKeys(input, ['kind', 'action'], 'action node');
      return { kind, action: planAction(input.action) };
    case 'if':
      exactKeys(input, ['kind', 'predicate', 'then', 'else'], 'if node');
      return {
        kind,
        predicate: statePredicate(input.predicate),
        then: decisionProgram(input.then, depth + 1),
        else: decisionProgram(input.else, depth + 1),
      };
    case 'priority':
      exactKeys(input, ['kind', 'choices'], 'priority node');
      if (!Array.isArray(input.choices) || input.choices.length === 0 || input.choices.length > 20) {
        throw new TypeError('priority.choices must contain 1 to 20 entries.');
      }
      return { kind, choices: input.choices.map((choice) => decisionProgram(choice, depth + 1)) };
    default:
      throw new TypeError(`Unknown decision program node ${kind}.`);
  }
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
    case 'action':
      return 'target' in program.action && program.action.target.kind === 'combatant'
        ? [program.action.target.combatantId]
        : [];
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
  request: RoundPlanRequest | MonsterReconsultRequest,
): RoundPlan {
  const input = record(value, 'round plan');
  exactKeys(input, ['kind', 'protocolVersion', 'encounterId', 'requestId', 'expectedRevision', 'round', 'monsters'], 'round plan');
  if (
    input.kind !== 'round_plan' ||
    input.protocolVersion !== DM_BRIDGE_PROTOCOL_VERSION ||
    input.encounterId !== request.encounterId ||
    input.requestId !== request.requestId ||
    integer(input.expectedRevision, 'round plan.expectedRevision') !== request.expectedRevision ||
    integer(input.round, 'round plan.round') !== request.round ||
    !Array.isArray(input.monsters)
  ) {
    throw new TypeError('Round plan envelope is stale or malformed.');
  }
  const monsters = input.monsters.map((value, index): MonsterRoundProgram => {
    const entry = record(value, `round plan.monsters[${index}]`);
    exactKeys(entry, ['monsterId', 'program'], `round plan.monsters[${index}]`);
    const program = decisionProgram(entry.program);
    validateProgramVocabulary(program, request.projection.encounter);
    return {
      monsterId: combatantId(string(entry.monsterId, `round plan.monsters[${index}].monsterId`)),
      program,
    };
  });
  const expected = request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : [request.monsterId];
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
