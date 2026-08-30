import type { ConditionName } from '../../combat/conditions';
import { combatantsAreAllies } from '../../combat/allies';
import { gridDistance } from '../../combat/grid';
import {
  evaluateTacticalAttack,
  type TacticalAttackEvaluation,
} from '../../combat/tactical-evaluator';
import type { MonsterLegendaryAction } from '../../combat/statblock';
import type { EncounterState } from '../../combat/encounter';
import type { CombatantId } from '../../combat/values';
import { engineTacticalAttackInput } from '../engine-query-port';
import type { EncounterTimelineProjection } from '../session-timeline';
import {
  intelPolicyVersion,
  type IntelProviderResult,
  type IntelResult,
  type LegendaryActionPendingDecision,
  type LegendaryResistancePendingDecision,
  type ResolvedIntel,
  type UnresolvedIntel,
} from './contracts';

export const LEGENDARY_WINDOWS_POLICY = intelPolicyVersion('legendary-windows-v1');

/** Always ten presentation tokens, so the always-on form remains within M4's 8–16-token budget. */
export type CompactLegendaryWindowSummary = readonly [
  string, string, string, string, string,
  string, string, string, string, string,
];

export interface LegendaryUsePool {
  readonly remaining: number;
  readonly maximum: number;
}

/**
 * Source facts supplied by an effect owner for a failed save. These facts are
 * deliberately not converted into a spend/hold recommendation here.
 */
export interface LegendaryResistanceEffectSeverity {
  readonly damageExpected: number | null;
  readonly imposedConditions: readonly ConditionName[];
  readonly forcedMovementFeet: number | null;
  readonly removesTurn: boolean;
}

export interface LegendaryResistanceSeverityInput {
  readonly decisionId: LegendaryResistancePendingDecision['id'];
  readonly effectSeverity: LegendaryResistanceEffectSeverity;
}

export type LegendaryResistanceSpendInput = IntelResult<{
  readonly decisionId: LegendaryResistancePendingDecision['id'];
  readonly combatant: CombatantId;
  readonly source: CombatantId;
  readonly failedAbility: LegendaryResistancePendingDecision['failedSave']['ability'];
  readonly saveDc: number;
  readonly effectSeverity: LegendaryResistanceEffectSeverity;
}, 'effect_severity_unavailable'>;

export type LegendaryActionOptionAssessment =
  | {
      readonly status: 'resolved';
      readonly option: LegendaryActionPendingDecision['options'][number];
      readonly assessment:
        | {
            readonly kind: 'attack';
            readonly action: Extract<MonsterLegendaryAction, { readonly kind: 'move_and_attack' }>;
            readonly target: CombatantId;
            /** The existing evaluator verdict remains authoritative for attack maths. */
            readonly tactical: TacticalAttackEvaluation;
          }
        | {
            readonly kind: 'temporary_defense';
            readonly action: Extract<MonsterLegendaryAction, { readonly kind: 'temporary_defense' }>;
            readonly temporaryHitPointsAverage: number;
            readonly armorClassBonus: number;
          }
        | { readonly kind: 'pass' };
    }
  | {
      readonly status: 'unresolved';
      readonly option: LegendaryActionPendingDecision['options'][number];
      readonly reason:
        | 'legendary_action_missing_from_statblock'
        | 'attack_target_unavailable'
        | 'attack_evaluation_unavailable';
    };

export interface LegendaryActionWindowDetails {
  readonly decisionId: LegendaryActionPendingDecision['id'];
  readonly afterCombatant: CombatantId;
  readonly round: number;
  readonly options: readonly LegendaryActionOptionAssessment[];
}

export type LegendaryNextWindow = IntelResult<{
  readonly afterCombatant: CombatantId;
  readonly round: number;
  readonly source: 'pending_decision' | 'timeline';
}, 'timeline_unavailable' | 'next_legendary_window_unavailable'>;

export type LegendaryActorIntel =
  | ResolvedIntel<{
      readonly combatant: CombatantId;
      readonly name: string;
      readonly actionUses: LegendaryUsePool;
      readonly resistanceUses: LegendaryUsePool;
      readonly nextWindow: LegendaryNextWindow;
      readonly pendingWindow: LegendaryActionWindowDetails | null;
    }>
  | UnresolvedIntel<'legendary_pool_unavailable' | 'legendary_actions_unavailable', {
      readonly combatant: CombatantId;
      readonly name: string;
    }>;

export interface LegendaryWindowsDetails {
  readonly actors: readonly LegendaryActorIntel[];
  /** Facts for a live Legendary Resistance boundary; never a spend recommendation. */
  readonly resistanceSpendInputs: readonly LegendaryResistanceSpendInput[];
}

export interface LegendaryWindowsRequest {
  readonly state: EncounterState;
  /** Null records that the caller did not have the session timeline projection. */
  readonly timeline: EncounterTimelineProjection | null;
  readonly detail: 'compact' | 'full';
  readonly resistanceSeverityInputs?: readonly LegendaryResistanceSeverityInput[];
}

interface LegendaryWindowsFields {
  readonly compact: CompactLegendaryWindowSummary;
  readonly details: LegendaryWindowsDetails | null;
}

export type LegendaryWindowsIntel = IntelProviderResult<
  typeof LEGENDARY_WINDOWS_POLICY,
  LegendaryWindowsFields,
  'no_legendary_actor',
  LegendaryWindowsFields
>;

function compactToken(value: string): string {
  return value.trim().replaceAll(/\s+/gu, '-') || 'unnamed';
}

function usePool(remaining: number, maximum: number): LegendaryUsePool {
  return { remaining, maximum };
}

function pendingLegendaryWindow(
  state: EncounterState,
  combatant: CombatantId,
): LegendaryActionPendingDecision | null {
  return state.pendingDecisions.find((decision): decision is LegendaryActionPendingDecision =>
    decision.kind === 'legendary_action_window' && decision.combatant === combatant,
  ) ?? null;
}

function nextLegendaryWindow(
  timeline: EncounterTimelineProjection | null,
  pending: LegendaryActionPendingDecision | null,
  combatant: CombatantId,
): LegendaryNextWindow {
  if (pending !== null) {
    return {
      status: 'resolved',
      afterCombatant: pending.boundary.activeCombatant,
      round: pending.boundary.round,
      source: 'pending_decision',
    };
  }
  if (timeline === null) return { status: 'unresolved', reason: 'timeline_unavailable' };
  const event = timeline.upcoming.find((candidate) =>
    candidate.kind === 'legendary_action_window' && candidate.legendaryCombatant === combatant,
  );
  return event === undefined
    ? { status: 'unresolved', reason: 'next_legendary_window_unavailable' }
    : {
        status: 'resolved',
        afterCombatant: event.boundary.combatant,
        round: event.boundary.round,
        source: 'timeline',
      };
}

function nearestLivingEnemy(state: EncounterState, actor: CombatantId): CombatantId | null {
  const origin = state.tokens.find((token) => token.combatantId === actor)?.position;
  if (origin === undefined) return null;
  return state.combatants
    .filter((candidate) =>
      candidate.profile.id !== actor && candidate.life === 'living' &&
      !combatantsAreAllies(state, actor, candidate.profile.id) &&
      state.tokens.some((token) => token.combatantId === candidate.profile.id),
    )
    .sort((left, right) => {
      const leftPosition = state.tokens.find((token) => token.combatantId === left.profile.id)?.position;
      const rightPosition = state.tokens.find((token) => token.combatantId === right.profile.id)?.position;
      if (leftPosition === undefined || rightPosition === undefined) return 0;
      return gridDistance(origin, leftPosition) - gridDistance(origin, rightPosition) ||
        String(left.profile.id).localeCompare(String(right.profile.id));
    })[0]?.profile.id ?? null;
}

function actionForOption(
  option: LegendaryActionPendingDecision['options'][number],
  actions: readonly MonsterLegendaryAction[],
): MonsterLegendaryAction | null {
  if (option.id === 'pass') return null;
  const actionId = option.id.slice('legendary_action:'.length);
  return actions.find((action) => action.id === actionId) ?? null;
}

function assessLegendaryOption(
  state: EncounterState,
  actor: CombatantId,
  option: LegendaryActionPendingDecision['options'][number],
  actions: readonly MonsterLegendaryAction[],
): LegendaryActionOptionAssessment {
  if (option.id === 'pass') {
    return { status: 'resolved', option, assessment: { kind: 'pass' } };
  }
  const action = actionForOption(option, actions);
  if (action === null) {
    return { status: 'unresolved', option, reason: 'legendary_action_missing_from_statblock' };
  }
  if (action.kind === 'temporary_defense') {
    return {
      status: 'resolved', option,
      assessment: {
        kind: 'temporary_defense', action,
        temporaryHitPointsAverage: action.temporaryHitPointsAverage,
        armorClassBonus: action.armorClassBonus,
      },
    };
  }
  const target = nearestLivingEnemy(state, actor);
  if (target === null) return { status: 'unresolved', option, reason: 'attack_target_unavailable' };
  const input = engineTacticalAttackInput(state, actor, target, action.attackId);
  if (input === null) return { status: 'unresolved', option, reason: 'attack_evaluation_unavailable' };
  return {
    status: 'resolved', option,
    assessment: { kind: 'attack', action, target, tactical: evaluateTacticalAttack(input) },
  };
}

function pendingWindowDetails(
  state: EncounterState,
  actor: CombatantId,
  actions: readonly MonsterLegendaryAction[],
  pending: LegendaryActionPendingDecision | null,
): LegendaryActionWindowDetails | null {
  if (pending === null) return null;
  return {
    decisionId: pending.id,
    afterCombatant: pending.boundary.activeCombatant,
    round: pending.boundary.round,
    options: pending.options.map((option) => assessLegendaryOption(state, actor, option, actions)),
  };
}

function resistanceSpendInputs(
  state: EncounterState,
  severityInputs: readonly LegendaryResistanceSeverityInput[],
): readonly LegendaryResistanceSpendInput[] {
  return state.pendingDecisions.flatMap((decision): readonly LegendaryResistanceSpendInput[] => {
    if (decision.kind !== 'legendary_resistance') return [];
    const severity = severityInputs.find((input) => input.decisionId === decision.id);
    const facts = {
      decisionId: decision.id,
      combatant: decision.combatant,
      source: decision.failedSave.source,
      failedAbility: decision.failedSave.ability,
      saveDc: decision.failedSave.dc,
    };
    return severity === undefined
      ? [{ status: 'unresolved', reason: 'effect_severity_unavailable', ...facts }]
      : [{ status: 'resolved', ...facts, effectSeverity: severity.effectSeverity }];
  });
}

function compactSummary(
  actor: LegendaryActorIntel | undefined,
): CompactLegendaryWindowSummary {
  if (actor === undefined || actor.status === 'unresolved') {
    return ['legendary', 'unresolved', 'actions', '0/0', 'resistance', '0/0', 'next', 'unresolved', 'pending', 'none'];
  }
  const next = actor.nextWindow.status === 'resolved'
    ? compactToken(String(actor.nextWindow.afterCombatant))
    : 'unresolved';
  return [
    'legendary', compactToken(actor.name),
    'actions', `${String(actor.actionUses.remaining)}/${String(actor.actionUses.maximum)}`,
    'resistance', `${String(actor.resistanceUses.remaining)}/${String(actor.resistanceUses.maximum)}`,
    'next', next,
    'pending', actor.pendingWindow === null ? 'none' : 'action',
  ];
}

/**
 * Computes legendary-resource/window facts from reducer state and the shared
 * session timeline. The compact form is always available; action alternatives
 * and resistance facts are only materialized for an explicit full request.
 */
export function provideLegendaryWindows(
  request: LegendaryWindowsRequest,
): LegendaryWindowsIntel {
  const candidates = request.state.combatants.filter((subject) =>
    subject.legendary !== undefined || subject.profile.rules.legendary !== undefined,
  );
  if (candidates.length === 0) {
    return {
      policy: LEGENDARY_WINDOWS_POLICY,
      status: 'unresolved',
      reason: 'no_legendary_actor',
      compact: compactSummary(undefined),
      details: null,
    };
  }
  const actors: LegendaryActorIntel[] = candidates.map((subject) => {
    const pool = subject.legendary;
    const actions = subject.profile.rules.legendary?.actions;
    const base = { combatant: subject.profile.id, name: subject.profile.name };
    if (pool === undefined) return { status: 'unresolved', reason: 'legendary_pool_unavailable', ...base };
    if (actions === undefined) return { status: 'unresolved', reason: 'legendary_actions_unavailable', ...base };
    const pending = pendingLegendaryWindow(request.state, subject.profile.id);
    return {
      status: 'resolved',
      ...base,
      actionUses: usePool(pool.actionUsesRemaining, pool.actionUsesMaximum),
      resistanceUses: usePool(pool.resistanceUsesRemaining, pool.resistanceUsesMaximum),
      nextWindow: nextLegendaryWindow(request.timeline, pending, subject.profile.id),
      pendingWindow: request.detail === 'full'
        ? pendingWindowDetails(request.state, subject.profile.id, actions, pending)
        : null,
    };
  });
  const compactActor = actors.find((actor) => actor.status === 'resolved');
  return {
    policy: LEGENDARY_WINDOWS_POLICY,
    status: 'resolved',
    compact: compactSummary(compactActor),
    details: request.detail === 'full'
      ? {
          actors,
          resistanceSpendInputs: resistanceSpendInputs(
            request.state,
            request.resistanceSeverityInputs ?? [],
          ),
        }
      : null,
  };
}
