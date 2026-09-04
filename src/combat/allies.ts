import type { CombatantProfile } from './combatant';
import type { EncounterState } from './encounter';
import { EncounterRuleError } from './encounter-rule-error';
import type { CombatantId } from './values';

/** Stable faction identity for rules that refer to a monster's allies. */
export const MONSTER_SIDE = 'monster_side' as const;
export type CombatantFaction = typeof MONSTER_SIDE | 'player_character_side';

function profileKind(
  state: EncounterState,
  id: CombatantId,
): CombatantProfile['kind'] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new EncounterRuleError('validation', `Unknown combatant ${id}.`);
  return subject.profile.kind;
}

/** Summons inherit the summoner's side while retaining their monster statblock profile. */
export function combatantSide(
  state: EncounterState,
  id: CombatantId,
): CombatantProfile['kind'] {
  let current = id;
  const visited = new Set<CombatantId>();
  for (;;) {
    if (visited.has(current)) {
      throw new EncounterRuleError('validation', 'Summon ownership cannot contain a cycle.');
    }
    visited.add(current);
    const owner = state.effects.find(
      (effect) => effect.ownedCombatants?.includes(current) === true,
    )?.source;
    if (owner === undefined) return profileKind(state, current);
    current = owner;
  }
}

export function combatantsAreAllies(
  state: EncounterState,
  left: CombatantId,
  right: CombatantId,
): boolean {
  return combatantFaction(state, left) === combatantFaction(state, right);
}

export function combatantFaction(state: EncounterState, id: CombatantId): CombatantFaction {
  return combatantSide(state, id) === 'monster' ? MONSTER_SIDE : 'player_character_side';
}
