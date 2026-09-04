import type { EncounterState } from '../combat/encounter';
import { monsterSpellMaximumUses, monsterSpellResourcePoolId } from '../combat/statblock';
import { feet, type CombatantId } from '../combat/values';
import { declaredMonsterBonusActions } from './engine-query-port';

function withChoicePools(state: EncounterState): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) => {
      if (combatant.profile.kind !== 'monster') return combatant;
      const existing = combatant.limitedResources ?? [];
      const additions = declaredMonsterBonusActions(state, combatant.profile.id).flatMap((action) => {
        if (action.kind !== 'spell_choice') return [];
        return action.spells.flatMap((spell) => {
          const id = monsterSpellResourcePoolId(action.id, spell);
          const maximum = monsterSpellMaximumUses(spell);
          return id === null || maximum === null || existing.some((pool) => pool.id === id)
            ? []
            : [{ id, maximum, remaining: maximum, recharge: 'long_rest' as const }];
        });
      });
      const uniqueAdditions = [...new Map(additions.map((pool) => [pool.id, pool] as const)).values()];
      return uniqueAdditions.length === 0
        ? combatant
        : { ...combatant, limitedResources: [...existing, ...uniqueAdditions] };
    }),
  };
}

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
  return withChoicePools(resetMonsterTurns(state, new Set(actorIds), true));
}

/** A direct fixture session starts with every monster at a fresh planning window. */
export function freshMonsterPlanningState(state: EncounterState): EncounterState {
  const actors = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
  return withChoicePools(resetMonsterTurns(state, new Set(actors), false));
}
