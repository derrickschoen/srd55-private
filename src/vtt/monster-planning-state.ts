import type { EncounterState } from '../combat/encounter';
import { feet, type CombatantId } from '../combat/values';

function resetMonsterTurns(
  state: EncounterState,
  actorIds: ReadonlySet<CombatantId>,
  preserveActiveActor: boolean,
): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) =>
      combatant.profile.kind !== 'monster' || !actorIds.has(combatant.profile.id) ||
        (preserveActiveActor && combatant.profile.id === state.activeCombatant)
        ? combatant
        : ({
          ...combatant,
          turn: {
            ...combatant.turn,
            action: { kind: 'available' },
            bonusActionAvailable: true,
            reactionAvailable: true,
            movement: {
              speed: feet(combatant.profile.rules.speed),
              remaining: feet(combatant.profile.rules.speed),
              spent: feet(0),
            },
          },
        })),
  };
}

/** Requested non-active monsters are viewed at the fresh turn they will receive before execution. */
export function projectFutureMonsterTurns(
  state: EncounterState,
  actorIds: readonly CombatantId[],
): EncounterState {
  return resetMonsterTurns(state, new Set(actorIds), true);
}

/** A direct fixture session starts with every monster at a fresh planning window. */
export function freshMonsterPlanningState(state: EncounterState): EncounterState {
  const actors = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
  return resetMonsterTurns(state, new Set(actors), false);
}
