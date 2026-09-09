import type { EncounterState } from '../combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../combat/events';
import { transactionalRng, type Rng } from '../combat/random';
import {
  isTransactionalRollRng,
  RollProvenance,
  type DrawRecord,
  type TransactionalRollRng,
} from '../combat/roll-provenance';
import type { CombatantId } from '../combat/values';
import {
  unattendedReactionOfferResolution,
  type AutoResolvedReactionOffer,
  type ReactionOfferHostPolicy,
} from './reaction-offer-host-policy';
import {
  guidedPendingReactionResolution,
  type GuidedReactionResolution,
  type ReactionGuidanceDeclaration,
} from './reaction-guidance';
import { reduceSessionEncounter } from './session-encounter-reducer';

export interface EngineCommandBoundaryResolutions {
  readonly fallbackResolutions: readonly AutoResolvedReactionOffer[];
  readonly guidedResolutions: readonly GuidedReactionResolution[];
}

export interface EngineCommandBoundaryResult extends EngineCommandBoundaryResolutions {
  readonly state: EncounterState;
  readonly events: readonly EncounterEvent[];
  readonly revisionDelta: number;
  readonly dieRolls: readonly DrawRecord[];
}

export interface ReducerApplicationAccounting {
  /** Called immediately before every attempted reducer application, including automatic boundary work. */
  attempted(): void;
  /** Called after every reducer application returns or refuses, so resource limits observe the work it performed. */
  completed(): void;
}

interface MutableBoundaryEvidence {
  readonly events: EncounterEvent[];
  readonly fallbackResolutions: AutoResolvedReactionOffer[];
  readonly guidedResolutions: GuidedReactionResolution[];
}

function reduceAndRecord(
  state: EncounterState,
  command: EncounterCommand,
  rng: TransactionalRollRng,
  evidence: MutableBoundaryEvidence,
  accounting: ReducerApplicationAccounting | null,
): EncounterState {
  accounting?.attempted();
  try {
    const reduced = reduceSessionEncounter(state, command, rng);
    evidence.events.push(...reduced.events);
    return reduced.state;
  } finally {
    accounting?.completed();
  }
}

export function resolveEngineCommandBoundary(
  initialState: EncounterState,
  rng: TransactionalRollRng,
  hostPolicy: ReactionOfferHostPolicy,
  guidance: ReactionGuidanceDeclaration | null,
  evidence: MutableBoundaryEvidence,
  accounting: ReducerApplicationAccounting | null = null,
): EncounterState {
  if (hostPolicy.kind === 'dm_attended') return initialState;
  let state = initialState;
  let legendaryBoundaryToResume: { readonly activeCombatant: CombatantId; readonly round: number } | null = null;
  for (;;) {
    let selected:
      | { readonly kind: 'guidance'; readonly resolution: GuidedReactionResolution }
      | { readonly kind: 'fallback'; readonly resolution: AutoResolvedReactionOffer }
      | undefined;
    for (const decision of state.pendingDecisions) {
      if (decision.kind !== 'reaction_offer') continue;
      const guided = guidedPendingReactionResolution(state, decision, 'algorithm', hostPolicy, guidance);
      if (guided !== null) {
        selected = { kind: 'guidance', resolution: guided };
        break;
      }
      const fallback = unattendedReactionOfferResolution(state, decision, 'algorithm', hostPolicy);
      if (fallback !== null) {
        selected = { kind: 'fallback', resolution: fallback };
        break;
      }
    }
    if (selected !== undefined) {
      state = reduceAndRecord(state, {
        type: 'resolve_pending_decision',
        decisionId: selected.resolution.decisionId,
        optionId: selected.resolution.resolution,
      }, rng, evidence, accounting);
      if (selected.kind === 'guidance') evidence.guidedResolutions.push(selected.resolution);
      else evidence.fallbackResolutions.push(selected.resolution);
      continue;
    }
    const legendaryResistance = state.config.initiativeMode === 'per_combatant'
      ? state.pendingDecisions.find((decision) => decision.kind === 'legendary_resistance')
      : undefined;
    if (legendaryResistance !== undefined) {
      state = reduceAndRecord(state, {
        type: 'resolve_pending_decision', decisionId: legendaryResistance.id, optionId: 'suffer',
      }, rng, evidence, accounting);
      continue;
    }
    const legendaryWindow = state.config.initiativeMode === 'per_combatant'
      ? state.pendingDecisions.find((decision) => decision.kind === 'legendary_action_window')
      : undefined;
    if (legendaryWindow !== undefined) {
      legendaryBoundaryToResume ??= { ...legendaryWindow.boundary };
      state = reduceAndRecord(state, {
        type: 'resolve_pending_decision', decisionId: legendaryWindow.id, optionId: 'pass',
      }, rng, evidence, accounting);
      continue;
    }
    const deathSave = state.pendingDecisions.find((decision) => decision.kind === 'death_save');
    if (deathSave !== undefined) {
      state = reduceAndRecord(state, {
        type: 'resolve_pending_decision', decisionId: deathSave.id, optionId: 'roll',
      }, rng, evidence, accounting);
      continue;
    }
    const boundaryToResume = legendaryBoundaryToResume;
    if (
      boundaryToResume !== null && state.phase.kind === 'active' &&
      state.activeCombatant === boundaryToResume.activeCombatant && state.round === boundaryToResume.round &&
      !state.pendingDecisions.some((decision) =>
        decision.boundary.activeCombatant === boundaryToResume.activeCombatant &&
        decision.boundary.round === boundaryToResume.round)
    ) {
      legendaryBoundaryToResume = null;
      state = reduceAndRecord(state, {
        type: 'end_turn', actor: boundaryToResume.activeCombatant,
      }, rng, evidence, accounting);
      continue;
    }
    return state;
  }
}

/**
 * Applies one reducer command and every decision it creates as one rollback-safe boundary.
 * The input state remains untouched and the RNG cursor/observed provenance are restored on refusal.
 */
export function runCommandBoundaryTransaction(
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
  hostPolicy: ReactionOfferHostPolicy,
  guidance: ReactionGuidanceDeclaration | null,
  accounting: ReducerApplicationAccounting | null = null,
): EngineCommandBoundaryResult {
  const transactional = isTransactionalRollRng(rng)
    ? rng
    : RollProvenance.recording(transactionalRng(rng)).asRng();
  const checkpoint = transactional.checkpoint();
  const beforeRevision = state.revision;
  const beforeRollCount = transactional.trace().attempts.length;
  const evidence: MutableBoundaryEvidence = {
    events: [], fallbackResolutions: [], guidedResolutions: [],
  };
  try {
    const ready = resolveEngineCommandBoundary(state, transactional, hostPolicy, guidance, evidence, accounting);
    const reduced = reduceAndRecord(ready, command, transactional, evidence, accounting);
    const resolved = resolveEngineCommandBoundary(
      reduced, transactional, hostPolicy, guidance, evidence, accounting,
    );
    return {
      state: resolved,
      events: evidence.events,
      revisionDelta: resolved.revision - beforeRevision,
      fallbackResolutions: evidence.fallbackResolutions,
      guidedResolutions: evidence.guidedResolutions,
      dieRolls: transactional.trace().attempts.slice(beforeRollCount),
    };
  } catch (error) {
    transactional.restoreCheckpoint(checkpoint);
    throw error;
  }
}
