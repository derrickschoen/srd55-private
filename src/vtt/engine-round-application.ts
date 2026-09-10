import type { EncounterState } from '../combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../combat/events';
import { transactionalRng, type Rng } from '../combat/random';
import {
  isTransactionalRollRng,
  RollProvenance,
  type DrawRecord,
} from '../combat/roll-provenance';
import {
  type AutoResolvedReactionOffer,
  type ReactionOfferHostPolicy,
} from './reaction-offer-host-policy';
import {
  type GuidedReactionResolution,
  type ReactionGuidanceDeclaration,
} from './reaction-guidance';
import {
  SessionCommandTrialCore,
  type SessionReducerApplicationAccounting,
} from './session-command-transaction';
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

export interface ReducerApplicationAccounting extends SessionReducerApplicationAccounting {}

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
  const beforeRollCount = transactional.trace().attempts.length;
  try {
    const core = SessionCommandTrialCore.begin({
      state,
      random: transactional,
      reducer: reduceSessionEncounter,
      boundaryPolicy: hostPolicy,
      guidance,
      boundaryScope: 'initiative_segment',
      accounting,
    });
    core.resolveBoundary();
    const appliedState = core.apply(command);
    const snapshot = core.snapshot();
    return {
      state: appliedState,
      events: snapshot.events,
      revisionDelta: snapshot.revisionDelta,
      fallbackResolutions: snapshot.fallbackResolutions,
      guidedResolutions: snapshot.guidedResolutions,
      dieRolls: transactional.trace().attempts.slice(beforeRollCount),
    };
  } catch (error) {
    transactional.restoreCheckpoint(checkpoint);
    throw error;
  }
}
