import { detectCombatant, type EncounterState } from '../../combat/encounter';
import type { GridCell } from '../../combat/grid';
import type { CombatantId } from '../../combat/values';
import {
  intelPolicyVersion,
  type IntelPolicyVersion,
  type ResolvedIntel,
  type UnresolvedIntel,
} from './contracts';

/** Versioned policy for the actor-local target-knowledge projection. */
export const ACTOR_KNOWLEDGE_POLICY = intelPolicyVersion('actor-knowledge-v1');

export type ActorKnowledgePolicy = typeof ACTOR_KNOWLEDGE_POLICY;

/**
 * The engine does not yet record observation history. This is deliberately
 * typed rather than treating a current hidden target as if it had no history.
 */
export type LastSeenPositionUnavailable = UnresolvedIntel<
  'last_seen_position_not_modeled'
>;

/** Reserved for when a mechanically recorded observation history is added. */
export type LastSeenPositionKnown = ResolvedIntel<{
  readonly lastSeenPosition: GridCell;
}>;

export interface PerceivedTargetKnowledge {
  readonly kind: 'perceived';
  readonly targetId: CombatantId;
  /** Current position is exposed only when the actor can mechanically locate it. */
  readonly position: GridCell;
}

/** A known last-seen position is not a current position. M7 has no source for one yet. */
export interface SuspectedTargetKnowledge {
  readonly kind: 'suspected';
  readonly targetId: CombatantId;
  readonly lastSeen: LastSeenPositionKnown;
}

export interface UnknownTargetKnowledge {
  readonly kind: 'unknown';
  readonly targetId: CombatantId;
  /** No observation-memory state exists from which a suspicion can be derived. */
  readonly lastSeen: LastSeenPositionUnavailable;
}

/**
 * This shape intentionally contains no hidden/fog fields or reason codes.
 * It is the actor-facing knowledge projection, not a serialization of state.
 */
export type ActorTargetKnowledge =
  | PerceivedTargetKnowledge
  | SuspectedTargetKnowledge
  | UnknownTargetKnowledge;

export interface ActorKnowledgeProjection {
  readonly policy: ActorKnowledgePolicy;
  readonly actorId: CombatantId;
  readonly targets: readonly ActorTargetKnowledge[];
}

function sameCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

function unknownTarget(targetId: CombatantId): UnknownTargetKnowledge {
  return {
    kind: 'unknown',
    targetId,
    lastSeen: {
      status: 'unresolved',
      reason: 'last_seen_position_not_modeled',
    },
  };
}

/**
 * Projects living opponents as one monster can currently locate them. It does
 * not infer a last-seen position or retain search history; D420 owns that.
 */
export function projectActorKnowledge(
  state: EncounterState,
  actorId: CombatantId,
): ActorKnowledgeProjection {
  const actor = state.combatants.find((combatant) => combatant.profile.id === actorId);
  if (actor === undefined) {
    throw new RangeError(`Actor knowledge requires a combatant in this encounter: ${String(actorId)}.`);
  }
  if (actor.profile.kind !== 'monster') {
    throw new RangeError(`Actor knowledge requires a monster actor: ${String(actorId)}.`);
  }

  const tokens = new Map(state.tokens.map((token) => [token.combatantId, token] as const));
  const targets = state.combatants
    .filter((candidate) => candidate.life !== 'dead' && candidate.profile.kind !== actor.profile.kind)
    .map((candidate): ActorTargetKnowledge => {
      const targetId = candidate.profile.id;
      const target = tokens.get(targetId);
      if (target === undefined) {
        throw new Error(`Actor knowledge found no token for target: ${String(targetId)}.`);
      }

      // Fog is a map-level redaction. Do not surface its presence or a location within it.
      if (state.foggedCells.some((cell) => sameCell(cell, target.position))) {
        return unknownTarget(targetId);
      }

      const detection = detectCombatant(state, actorId, targetId);
      if (detection.kind === 'seen' || detection.kind === 'located') {
        return {
          kind: 'perceived',
          targetId,
          position: { ...target.position },
        };
      }
      return unknownTarget(targetId);
    })
    .sort((left, right) => String(left.targetId).localeCompare(String(right.targetId)));

  return {
    policy: ACTOR_KNOWLEDGE_POLICY,
    actorId,
    targets,
  };
}

/** Lets consumers name the versioned policy without accepting arbitrary strings. */
export function actorKnowledgePolicyVersion(): IntelPolicyVersion<'actor-knowledge-v1'> {
  return ACTOR_KNOWLEDGE_POLICY;
}
