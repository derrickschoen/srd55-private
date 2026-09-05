import { isIncapacitated } from '../../combat/conditions';
import { combatantConditions, combatantSpace, type EncounterState } from '../../combat/encounter';
import { minimumSpaceDistance } from '../../combat/creature-space';
import { spellDefinition } from '../../combat/spells/definitions';
import type { SpellManifestId } from '../../combat/spells/manifest';
import type { CombatantId } from '../../combat/values';
import type { LoadedPartyMember } from '../party-pack';
import type { EncounterTimelineProjection, TimelineBoundary } from '../session-timeline';
import {
  intelPolicyVersion,
  type IntelProviderResult,
} from './contracts';

/** Versioned policy for engine-proved party rescue capability. */
export const RECOVERY_CAPABILITY_POLICY = intelPolicyVersion('recovery-capability-v2');

export type RecoveryKind = 'healing' | 'revival';
export type RecoveryKnowledgeCode = 'dm_omniscient_party_resources';
export type RecoverySourceCode = 'encounter_state_and_loaded_party';
export type RecoveryReach = 'in_range' | 'movement_qualified';

export type RecoveryCapabilityUnresolvedReason =
  | 'party_data_unavailable'
  | 'target_not_dying_or_dead'
  | 'target_missing_from_encounter'
  | 'target_missing_token'
  | 'timeline_not_current'
  | 'boundary_not_in_timeline';

export interface RecoveryOption {
  readonly rescuer: CombatantId;
  readonly spellId: SpellManifestId;
  readonly kind: RecoveryKind;
  readonly slotLevel: number;
  readonly castingTime: 'action' | 'bonus_action';
  readonly turnRound: number;
  readonly reach: RecoveryReach;
  /** Feet the rescuer must spend before the spell is in range. */
  readonly movementFeet: number;
  readonly knowledge: RecoveryKnowledgeCode;
  readonly source: RecoverySourceCode;
}

export interface KnownRecoveryBeforeBoundary {
  readonly target: CombatantId;
  readonly boundary: TimelineBoundary;
  readonly knowledge: RecoveryKnowledgeCode;
  readonly source: RecoverySourceCode;
  /** Each entry proves a particular spell, slot, turn, and range path. */
  readonly options: readonly RecoveryOption[];
}

export type RecoveryCapabilityResult = IntelProviderResult<
  typeof RECOVERY_CAPABILITY_POLICY,
  { readonly known_recovery_before_boundary: KnownRecoveryBeforeBoundary },
  RecoveryCapabilityUnresolvedReason
>;

const KNOWLEDGE: RecoveryKnowledgeCode = 'dm_omniscient_party_resources';
const SOURCE: RecoverySourceCode = 'encounter_state_and_loaded_party';

function unresolved(reason: RecoveryCapabilityUnresolvedReason): RecoveryCapabilityResult {
  return { policy: RECOVERY_CAPABILITY_POLICY, status: 'unresolved', reason };
}

function spellSource(member: LoadedPartyMember, spellId: SpellManifestId) {
  return member.spellcasting.find((source) =>
    source.preparedSpells.some((spell) => spell.id === spellId) ||
    source.knownSpells.some((spell) => spell.id === spellId) ||
    source.grants.some((grant) => grant.spell.id === spellId));
}

function recoveryKind(spellId: SpellManifestId, targetLife: 'dying' | 'dead'): RecoveryKind | null {
  const definition = spellDefinition(spellId);
  if (definition === null || definition.level === 0) return null;
  if (targetLife === 'dead') {
    return definition.operation.kind === 'revive' ? 'revival' : null;
  }
  return definition.operation.kind === 'healing' || definition.operation.kind === 'fixed_healing'
    ? 'healing'
    : null;
}

function spellRange(spellId: SpellManifestId, casterLevel: number): number | null {
  const definition = spellDefinition(spellId);
  if (
    definition === null ||
    (definition.targeting.kind !== 'single' && definition.targeting.kind !== 'multiple')
  ) return null;
  if (definition.targeting.kind === 'multiple' || definition.targeting.rangeByCasterLevel === undefined) {
    return definition.targeting.rangeFeet;
  }
  return [...definition.targeting.rangeByCasterLevel]
    .filter((tier) => tier.minimumLevel <= casterLevel)
    .sort((left, right) => right.minimumLevel - left.minimumLevel)[0]?.rangeFeet ??
    definition.targeting.rangeFeet;
}

function castingTime(spellId: SpellManifestId): 'action' | 'bonus_action' | null {
  const definition = spellDefinition(spellId);
  if (definition === null) return null;
  return definition.castingTime === 'action' || definition.castingTime === 'bonus_action'
    ? definition.castingTime
    : null;
}

function firstAffordableSlot(
  state: EncounterState,
  rescuer: CombatantId,
  spellId: SpellManifestId,
): number | null {
  const definition = spellDefinition(spellId);
  const combatant = state.combatants.find((candidate) => candidate.profile.id === rescuer);
  if (definition === null || combatant === undefined) return null;
  const slot = combatant.spellSlots
    .filter((candidate) => candidate.remaining > 0 && candidate.level >= definition.level)
    .sort((left, right) => left.level - right.level)[0];
  return slot === undefined ? null : slot.level;
}

function currentTurnCanCast(
  state: EncounterState,
  rescuer: CombatantId,
  time: 'action' | 'bonus_action',
): boolean {
  const combatant = state.combatants.find((candidate) => candidate.profile.id === rescuer);
  if (combatant === undefined) return false;
  if (time === 'bonus_action') return combatant.turn.bonusActionAvailable;
  return combatant.turn.action.kind === 'available' ||
    combatant.turn.additionalLeveledSpellActionsRemaining === 1;
}

function eventOrder(round: number, index: number, point: 'start' | 'after_start' | 'end', length: number): number {
  const offset = point === 'start' ? 0 : point === 'after_start' ? 1 : 2;
  return round * length * 3 + index * 3 + offset;
}

function nextRescuerTurn(
  state: EncounterState,
  timeline: EncounterTimelineProjection,
  rescuer: CombatantId,
): { readonly index: number; readonly round: number; readonly isCurrent: boolean } | null {
  const index = timeline.initiative.findIndex((entry) => entry.combatant === rescuer);
  const current = timeline.initiative.findIndex((entry) => entry.combatant === state.activeCombatant);
  if (index < 0 || current < 0) return null;
  return {
    index,
    round: index < current ? state.round + 1 : state.round,
    isCurrent: index === current,
  };
}

/**
 * Proves the loaded party's possible healing of a dying target or revival of
 * a dead target before one initiative boundary. This is deliberately a pure
 * provider: it neither queues a command nor assumes unavailable party data is
 * an empty capability set.
 */
export function recoveryCapabilityBeforeBoundary(
  state: EncounterState,
  timeline: EncounterTimelineProjection,
  party: readonly LoadedPartyMember[] | null,
  target: CombatantId,
  boundary: TimelineBoundary,
): RecoveryCapabilityResult {
  if (party === null) return unresolved('party_data_unavailable');
  const targetCombatant = state.combatants.find((candidate) => candidate.profile.id === target);
  if (targetCombatant === undefined) return unresolved('target_missing_from_encounter');
  if (targetCombatant.life !== 'dying' && targetCombatant.life !== 'dead') {
    return unresolved('target_not_dying_or_dead');
  }
  const targetToken = state.tokens.find((token) => token.combatantId === target);
  if (targetToken === undefined) return unresolved('target_missing_token');
  if (
    timeline.currentCombatant !== state.activeCombatant ||
    timeline.round !== state.round ||
    timeline.initiative.length !== state.initiative.length ||
    state.activeCombatant === null
  ) return unresolved('timeline_not_current');
  const boundaryIndex = timeline.initiative.findIndex((entry) => entry.combatant === boundary.combatant);
  if (boundaryIndex < 0) return unresolved('boundary_not_in_timeline');

  const boundaryOrder = eventOrder(
    boundary.round,
    boundaryIndex,
    boundary.boundary,
    timeline.initiative.length,
  );
  const targetLife = targetCombatant.life;
  const options: RecoveryOption[] = [];
  for (const member of party) {
    const rescuer = state.combatants.find((candidate) => candidate.profile.id === member.profile.id);
    const rescuerToken = state.tokens.find((token) => token.combatantId === member.profile.id);
    if (
      rescuer === undefined || rescuerToken === undefined || rescuer.life !== 'living' ||
      isIncapacitated(combatantConditions(state, member.profile.id))
    ) continue;
    const turn = nextRescuerTurn(state, timeline, member.profile.id);
    if (turn === null || eventOrder(turn.round, turn.index, 'after_start', timeline.initiative.length) >= boundaryOrder) {
      continue;
    }
    for (const spell of member.spells) {
      const kind = recoveryKind(spell.id, targetLife);
      const time = castingTime(spell.id);
      const source = spellSource(member, spell.id);
      const slotLevel = firstAffordableSlot(state, member.profile.id, spell.id);
      if (kind === null || time === null || source === undefined || slotLevel === null) continue;
      if (turn.isCurrent && !currentTurnCanCast(state, member.profile.id, time)) continue;
      const range = spellRange(spell.id, source.casterLevel);
      if (range === null) continue;
      const distance = minimumSpaceDistance(
        combatantSpace(state, member.profile.id),
        combatantSpace(state, target),
      );
      const movementFeet = Math.max(0, distance - range);
      const availableMovement = turn.isCurrent
        ? rescuer.turn.movement.remaining
        : rescuer.profile.rules.speed;
      if (movementFeet > availableMovement) continue;
      options.push({
        rescuer: member.profile.id,
        spellId: spell.id,
        kind,
        slotLevel,
        castingTime: time,
        turnRound: turn.round,
        reach: movementFeet === 0 ? 'in_range' : 'movement_qualified',
        movementFeet,
        knowledge: KNOWLEDGE,
        source: SOURCE,
      });
    }
  }
  return {
    policy: RECOVERY_CAPABILITY_POLICY,
    status: 'resolved',
    known_recovery_before_boundary: {
      target,
      boundary,
      knowledge: KNOWLEDGE,
      source: SOURCE,
      options,
    },
  };
}
