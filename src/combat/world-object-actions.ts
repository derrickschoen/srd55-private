import type { LegalActionSummary } from './controllers';
import type { EncounterState } from './encounter';
import type { EncounterCommand, EncounterEvent } from './events';
import { gridDistance } from './grid';
import type { CombatantId, WorldObjectId } from './values';
import type { WorldObject, WorldObjectClassAction } from './world-objects';

function combatant(state: EncounterState, actor: CombatantId) {
  return state.combatants.find((candidate) => candidate.profile.id === actor);
}

function position(state: EncounterState, actor: CombatantId) {
  return state.tokens.find((candidate) => candidate.combatantId === actor)?.position;
}

export function worldObjectClassAction(
  object: WorldObject,
  actionId: string,
): WorldObjectClassAction | null {
  return object.classActions?.find((candidate) => candidate.id === actionId) ?? null;
}

export function worldObjectActionWasUsed(
  events: readonly EncounterEvent[],
  objectId: WorldObjectId,
  actionId: string,
): boolean {
  return events.some((event) =>
    event.type === 'world_object_used' &&
    event.objectId === objectId &&
    event.actionId === actionId);
}

export function worldObjectClassActionCommands(
  state: EncounterState,
  actor: CombatantId,
): LegalActionSummary {
  const subject = combatant(state, actor);
  const actorPosition = position(state, actor);
  if (
    subject === undefined ||
    actorPosition === undefined ||
    subject.life !== 'living' ||
    subject.turn.action.kind !== 'available' ||
    state.activeCombatant !== actor
  ) {
    return { actions: [] };
  }
  const actions: EncounterCommand[] = [];
  for (const object of state.worldObjects) {
    for (const action of object.classActions ?? []) {
      if (
        (action.eligibleActor !== 'either' && action.eligibleActor !== subject.profile.kind) ||
        (action.reach === 'adjacent' && gridDistance(actorPosition, object.position) > 5) ||
        (action.uses === 'once' && worldObjectActionWasUsed(state.eventLog, object.id, action.id))
      ) {
        continue;
      }
      actions.push({
        type: 'use_world_object',
        actor,
        objectId: object.id,
        actionId: action.id,
      });
    }
  }
  return { actions };
}

export function dmWorldObjectOverrideCommand(
  state: EncounterState,
  objectId: WorldObjectId,
  actionId: string,
): Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }> | null {
  const object = state.worldObjects.find((candidate) => candidate.id === objectId);
  const action = object === undefined ? null : worldObjectClassAction(object, actionId);
  if (
    action?.dmOverride === undefined ||
    (action.uses === 'once' && worldObjectActionWasUsed(state.eventLog, objectId, actionId))
  ) {
    return null;
  }
  return {
    type: 'dm_use_world_object',
    actor: action.dmOverride.actor,
    objectId,
    actionId,
  };
}
