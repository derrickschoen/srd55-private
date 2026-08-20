import { canonicalJson } from '../../commands/canonical-json';
import { AlgorithmController } from '../../combat/controllers';
import { gridDistance, type GridCell } from '../../combat/grid';
import type { DmVisibleCombatant, DmVisibleEncounterState } from '../../combat/visibility';
import type { CombatantId, EncounterSessionId } from '../../combat/values';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  STEERING_REPLY_JSON_SCHEMA,
  decodeRoundPlan,
  decodeSteeringReply,
  type DecisionProgram,
  type DmBridgeExchange,
  type MonsterRoundProgram,
  type PlanAction,
  type RoundPlan,
  type SteeringConsultReason,
  type SteeringOverride,
  type SteeringRoundRequest,
  type SteeringStance,
  type TargetSelector,
} from './contracts';

export type SteeringCoordinatorMode =
  | { readonly kind: 'full_model' }
  | { readonly kind: 'algorithm_with_overrides' }
  | {
      readonly kind: 'algorithm_triggered';
      readonly policy: SteeringTriggerPolicy;
    };

export interface SteeringTriggerPolicy {
  readonly nearTiePercent: number;
  readonly retreatHitPointPercent: number;
}

export const E06_TRIGGER_POLICY: SteeringTriggerPolicy = Object.freeze({
  nearTiePercent: 5,
  retreatHitPointPercent: 25,
});

export interface SteeringTriggerEvents {
  readonly combatantDownOrDied: boolean;
  readonly controlChanged: boolean;
  readonly retreatThresholdCrossed: boolean;
}

export interface SteeringTelemetry {
  readonly proposalSize: number;
  readonly replyKind: 'not_consulted' | 'approve' | 'overrides' | 'replacement';
  readonly overrideCount: number;
  readonly consultReason: SteeringConsultReason | null;
}

export interface AlgorithmRoundPlan {
  readonly plan: RoundPlan;
  readonly topActionGapPercent: number;
}

function targetAction(action: PlanAction, target: TargetSelector): PlanAction {
  switch (action.kind) {
    case 'attack':
    case 'force_save':
    case 'move_toward':
      return { ...action, target };
    case 'retreat_toward':
    case 'use_action':
      return action;
  }
}

function retarget(program: DecisionProgram, target: TargetSelector): DecisionProgram {
  switch (program.kind) {
    case 'action':
      return { kind: 'action', action: targetAction(program.action, target) };
    case 'if':
      return {
        ...program,
        then: retarget(program.then, target),
        else: retarget(program.else, target),
      };
    case 'priority':
      return { kind: 'priority', choices: program.choices.map((choice) => retarget(choice, target)) };
  }
}

function asPriority(program: DecisionProgram): readonly DecisionProgram[] {
  return program.kind === 'priority' ? program.choices : [program];
}

function actionKind(program: DecisionProgram): PlanAction['kind'] | null {
  return program.kind === 'action' ? program.action.kind : null;
}

function farthestCorner(state: DmVisibleEncounterState, actor: DmVisibleCombatant): GridCell {
  const enemies = state.combatants.filter(
    (candidate) => candidate.kind !== actor.kind && candidate.life !== 'dead',
  );
  const corners: GridCell[] = [
    { column: 0, row: 0 },
    { column: state.bounds.columns - 1, row: 0 },
    { column: 0, row: state.bounds.rows - 1 },
    { column: state.bounds.columns - 1, row: state.bounds.rows - 1 },
  ];
  return corners.sort((left, right) => {
    const nearest = (cell: GridCell) => Math.min(
      ...enemies.map((enemy) => gridDistance(cell, enemy.position)),
      Number.POSITIVE_INFINITY,
    );
    return nearest(right) - nearest(left) || left.column - right.column || left.row - right.row;
  })[0] ?? { column: 0, row: 0 };
}

function applyStance(
  program: DecisionProgram,
  stance: SteeringStance,
  state: DmVisibleEncounterState,
  actor: DmVisibleCombatant,
): DecisionProgram {
  const choices = [...asPriority(program)];
  switch (stance) {
    case 'aggressive': {
      const rank = (choice: DecisionProgram) => {
        const kind = actionKind(choice);
        return kind === 'attack' || kind === 'force_save' ? 0 : kind === 'move_toward' ? 1 : 2;
      };
      return {
        kind: 'priority',
        choices: choices.map((choice, index) => ({ choice, index }))
          .sort((left, right) => rank(left.choice) - rank(right.choice) || left.index - right.index)
          .map((entry) => entry.choice),
      };
    }
    case 'defensive':
      return {
        kind: 'priority',
        choices: [
          { kind: 'action', action: { kind: 'use_action', action: 'dodge' } },
          ...choices,
        ],
      };
    case 'retreat':
      return {
        kind: 'priority',
        choices: [
          {
            kind: 'action',
            action: { kind: 'retreat_toward', destination: farthestCorner(state, actor) },
          },
          ...choices,
        ],
      };
  }
}

function reorder(program: DecisionProgram, order: readonly number[]): DecisionProgram {
  if (program.kind !== 'priority') {
    throw new TypeError('A priority reorder requires a priority DecisionProgram.');
  }
  if (
    order.length !== program.choices.length ||
    new Set(order).size !== order.length ||
    order.some((index) => index < 0 || index >= program.choices.length)
  ) {
    throw new TypeError('A priority reorder must be an exact permutation of proposal indexes.');
  }
  return { kind: 'priority', choices: order.map((index) => program.choices[index]!) };
}

function special(program: DecisionProgram, target: TargetSelector): DecisionProgram {
  return {
    kind: 'priority',
    choices: [
      { kind: 'action', action: { kind: 'force_save', target } },
      ...asPriority(program),
    ],
  };
}

const OVERRIDE_ORDER: Readonly<Record<SteeringOverride['kind'], number>> = {
  retarget: 0,
  priority_reorder: 1,
  stance_change: 2,
  special_ability_invocation: 3,
};

export function applySteeringOverrides(
  proposal: RoundPlan,
  overrides: readonly SteeringOverride[],
  request: SteeringRoundRequest,
): RoundPlan {
  const knownMonsters = new Set(proposal.monsters.map((entry) => entry.monsterId));
  const seen = new Set<string>();
  for (const override of overrides) {
    if (!knownMonsters.has(override.monsterId)) {
      throw new TypeError(`Steering override references monster ${override.monsterId} outside the proposal.`);
    }
    const key = `${override.monsterId}:${override.kind}`;
    if (seen.has(key)) throw new TypeError('Steering overrides are a set; duplicate override kinds are not allowed per monster.');
    seen.add(key);
  }
  const sorted = overrides.map((override, index) => ({ override, index })).sort((left, right) =>
    left.override.monsterId.localeCompare(right.override.monsterId) ||
    OVERRIDE_ORDER[left.override.kind] - OVERRIDE_ORDER[right.override.kind] ||
    left.index - right.index,
  );
  const state = request.projection.encounter;
  const monsters = proposal.monsters.map((entry): MonsterRoundProgram => {
    const actor = state.combatants.find((candidate) => candidate.id === entry.monsterId);
    if (actor === undefined) throw new TypeError('Steering proposal monster is absent from the DM projection.');
    let program = entry.program;
    for (const { override } of sorted) {
      if (override.monsterId !== entry.monsterId) continue;
      switch (override.kind) {
        case 'retarget':
          program = retarget(program, override.target);
          break;
        case 'stance_change':
          program = applyStance(program, override.stance, state, actor);
          break;
        case 'priority_reorder':
          program = reorder(program, override.order);
          break;
        case 'special_ability_invocation':
          program = special(program, override.target);
          break;
      }
    }
    return { monsterId: entry.monsterId, program };
  });
  return decodeRoundPlan({ ...proposal, monsters }, request);
}

export function buildAlgorithmRoundPlan(input: {
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly state: DmVisibleEncounterState;
  readonly livingMonsterIds: readonly CombatantId[];
}): AlgorithmRoundPlan {
  const algorithm = new AlgorithmController();
  const proposals = input.livingMonsterIds.map((monsterId) => ({
    monsterId,
    ...algorithm.proposeRoundProgram(input.state, monsterId),
  }));
  return {
    plan: {
      kind: 'round_plan',
      protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
      encounterId: input.encounterId,
      requestId: input.requestId,
      expectedRevision: input.state.revision,
      round: input.state.round,
      monsters: proposals.map(({ monsterId, program }) => ({ monsterId, program })),
    },
    topActionGapPercent: Math.min(...proposals.map((proposal) => proposal.topActionGapPercent)),
  };
}

export function steeringTriggerEvents(
  previous: DmVisibleEncounterState | null,
  current: DmVisibleEncounterState,
  retreatHitPointPercent: number,
): SteeringTriggerEvents {
  if (previous === null) {
    return { combatantDownOrDied: false, controlChanged: false, retreatThresholdCrossed: false };
  }
  const prior = new Map(previous.combatants.map((combatant) => [combatant.id, combatant] as const));
  const combatantDownOrDied = current.combatants.some((combatant) => {
    const before = prior.get(combatant.id);
    return before?.life === 'living' && combatant.life !== 'living';
  });
  const retreatThresholdCrossed = current.combatants.some((combatant) => {
    const before = prior.get(combatant.id);
    if (before === undefined || combatant.kind !== 'monster') return false;
    const threshold = combatant.rules.hitPointMaximum * retreatHitPointPercent / 100;
    return before.hitPoints > threshold && combatant.hitPoints <= threshold;
  });
  const previousEffectEvents = previous.recentEvents.filter((event) =>
    event.type === 'effect_applied' || event.type === 'effect_target_removed' || event.type === 'effect_ended',
  ).length;
  const currentEffectEvents = current.recentEvents.filter((event) =>
    event.type === 'effect_applied' || event.type === 'effect_target_removed' || event.type === 'effect_ended',
  ).length;
  return {
    combatantDownOrDied,
    controlChanged: currentEffectEvents !== previousEffectEvents,
    retreatThresholdCrossed,
  };
}

export function steeringConsultReason(input: {
  readonly mode: SteeringCoordinatorMode;
  readonly round: number;
  readonly topActionGapPercent: number;
  readonly events: SteeringTriggerEvents;
}): SteeringConsultReason | null {
  if (input.mode.kind === 'full_model') return null;
  if (input.mode.kind === 'algorithm_with_overrides') return 'every_round';
  if (input.round === 1) return 'round_one';
  if (input.topActionGapPercent < input.mode.policy.nearTiePercent) return 'near_tie_top_actions';
  if (input.events.combatantDownOrDied) return 'combatant_down_or_dead';
  if (input.events.controlChanged) return 'control_change';
  if (input.events.retreatThresholdCrossed) return 'retreat_threshold';
  return null;
}

export async function resolveSteeringPlan(input: {
  readonly request: SteeringRoundRequest;
  readonly exchange: DmBridgeExchange;
  readonly signal: AbortSignal;
}): Promise<{ readonly plan: RoundPlan; readonly telemetry: SteeringTelemetry }> {
  const proposalSize = new TextEncoder().encode(canonicalJson(input.request.proposal)).length;
  const reply = decodeSteeringReply(await input.exchange.exchange(input.request, input.signal), input.request);
  switch (reply.kind) {
    case 'steering_approve':
      return {
        plan: decodeRoundPlan(input.request.proposal, input.request),
        telemetry: { proposalSize, replyKind: 'approve', overrideCount: 0, consultReason: input.request.consultReason },
      };
    case 'steering_overrides':
      return {
        plan: applySteeringOverrides(input.request.proposal, reply.overrides, input.request),
        telemetry: {
          proposalSize,
          replyKind: 'overrides',
          overrideCount: reply.overrides.length,
          consultReason: input.request.consultReason,
        },
      };
    case 'steering_replacement':
      return {
        plan: decodeRoundPlan(reply.replacement, input.request),
        telemetry: { proposalSize, replyKind: 'replacement', overrideCount: 0, consultReason: input.request.consultReason },
      };
  }
}

export function steeringRequestContract(): SteeringRoundRequest['replyContract'] {
  return { schemaVersion: 1, jsonSchema: STEERING_REPLY_JSON_SCHEMA };
}
