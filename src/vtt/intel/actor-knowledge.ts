import {
  combatantConditions,
  detectCombatant,
  effectiveCombatRules,
  type EncounterCombatantState,
  type EncounterState,
} from '../../combat/encounter';
import { combatantsAreAllies } from '../../combat/allies';
import type { ConditionName } from '../../combat/conditions';
import type { GridCell } from '../../combat/grid';
import type { CombatantId } from '../../combat/values';
import {
  intelPolicyVersion,
  type IntelPolicyVersion,
  type PerceivedConditionMarker,
  type PerceivedConditionName,
  type ProjectedArmorClassKnowledge,
  type ProjectedHitPointKnowledge,
  type ProjectedReactionKnowledge,
  type ProjectedReciprocalVisibility,
  type ResolvedIntel,
  type UnresolvedIntel,
} from './contracts';

/** Versioned policy for the actor-local target-knowledge projection. */
export const ACTOR_KNOWLEDGE_POLICY = intelPolicyVersion('actor-knowledge-v2');

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
  /** Positive markers only: an omitted condition is not asserted absent. */
  readonly conditions: readonly PerceivedConditionMarker[];
  readonly armorClass: ProjectedArmorClassKnowledge;
  readonly hitPoints: ProjectedHitPointKnowledge;
  readonly reciprocalVisibility: ProjectedReciprocalVisibility;
  readonly reaction: ProjectedReactionKnowledge;
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

function isPerceivedConditionName(name: ConditionName): name is PerceivedConditionName {
  switch (name) {
    case 'Blinded':
    case 'Grappled':
    case 'Paralyzed':
    case 'Petrified':
    case 'Prone':
    case 'Restrained':
    case 'Stunned':
    case 'Unconscious': return true;
    case 'Charmed':
    case 'Deafened':
    case 'Exhaustion':
    case 'Frightened':
    case 'Incapacitated':
    case 'Invisible':
    case 'Poisoned': return false;
  }
}

function perceivedConditions(
  state: EncounterState,
  targetId: CombatantId,
): readonly PerceivedConditionMarker[] {
  return combatantConditions(state, targetId)
    .flatMap((condition): readonly PerceivedConditionMarker[] =>
      isPerceivedConditionName(condition.name)
        ? [{ kind: 'perceived', condition: condition.name }]
        : [])
    .sort((left, right) => left.condition.localeCompare(right.condition));
}

function armorClassKnowledge(
  state: EncounterState,
  targetId: CombatantId,
): ProjectedArmorClassKnowledge {
  const armorClass = effectiveCombatRules(state, targetId).armorClass;
  return {
    kind: 'perceived_band',
    band: armorClass <= 13
      ? 'lightly_defended'
      : armorClass <= 16
        ? 'guarded'
        : 'heavily_defended',
  };
}

function activeHitPoints(target: EncounterCombatantState): number {
  return target.wildShape?.physical.hitPoints ?? target.form?.hitPoints ?? target.hitPoints;
}

function activeHitPointMaximum(
  state: EncounterState,
  target: EncounterCombatantState,
): number {
  const base = target.wildShape?.physical.hitPointMaximum ??
    target.form?.hitPointMaximum ??
    target.profile.rules.hitPointMaximum;
  return state.effects.reduce((maximum, effect) =>
    effect.targets.includes(target.profile.id) && effect.payload.kind === 'hit_point_maximum_modifier'
      ? maximum + effect.payload.amount
      : maximum, base);
}

// ART-SEAM (D516): exported so the DM board's HP bar uses THIS classifier, never a re-derived threshold.
export function hitPointKnowledge(
  state: EncounterState,
  target: EncounterCombatantState,
): ProjectedHitPointKnowledge {
  const maximum = activeHitPointMaximum(state, target);
  if (maximum <= 0) return { kind: 'unknown' };
  const hitPoints = activeHitPoints(target);
  return {
    kind: 'perceived_band',
    band: hitPoints >= maximum
      ? 'uninjured'
      : hitPoints * 4 <= maximum
        ? 'near_death'
        : 'bloodied',
  };
}

function reactionKnowledge(
  state: EncounterState,
  targetId: CombatantId,
): ProjectedReactionKnowledge {
  const latestTurnStart = state.eventLog.reduce((latest, event) =>
    event.type === 'turn_started' && event.combatant === targetId
      ? Math.max(latest, event.sequence)
      : latest, -1);
  return state.eventLog.some((event) =>
    event.sequence > latestTurnStart && event.type === 'resource_spent' &&
    event.combatant === targetId && event.resource === 'reaction')
    ? { kind: 'observed_spent' }
    : { kind: 'unknown' };
}

/**
 * Projects living opponents as one actor can currently locate them. It does
 * not infer a last-seen position or retain search history; D420 owns that.
 */
export function projectActorKnowledge(
  state: EncounterState,
  actorId: CombatantId,
): ActorKnowledgeProjection {
  if (!state.combatants.some((combatant) => combatant.profile.id === actorId)) {
    throw new RangeError(`Actor knowledge requires a combatant in this encounter: ${String(actorId)}.`);
  }
  const tokens = new Map(state.tokens.map((token) => [token.combatantId, token] as const));
  const targets = state.combatants
    .filter((candidate) => candidate.life !== 'dead' &&
      !combatantsAreAllies(state, actorId, candidate.profile.id))
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
        const reciprocal = detectCombatant(state, targetId, actorId);
        const seen = detection.kind === 'seen';
        return {
          kind: 'perceived',
          targetId,
          position: { ...target.position },
          conditions: seen ? perceivedConditions(state, targetId) : [],
          armorClass: seen ? armorClassKnowledge(state, targetId) : { kind: 'unknown' },
          hitPoints: seen ? hitPointKnowledge(state, candidate) : { kind: 'unknown' },
          reciprocalVisibility: reciprocal.kind === 'seen'
            ? { kind: 'perceived', targetCanSeeActor: true }
            : { kind: 'unknown' },
          reaction: reactionKnowledge(state, targetId),
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
export function actorKnowledgePolicyVersion(): IntelPolicyVersion<'actor-knowledge-v2'> {
  return ACTOR_KNOWLEDGE_POLICY;
}
