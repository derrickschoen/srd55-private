import type { CombatantProfile } from './combatant';
import type { EncounterState } from './encounter';
import { EncounterRuleError } from './encounter-rule-error';
import type { CombatantId } from './values';

function profileKind(
  state: EncounterState,
  id: CombatantId,
): CombatantProfile['kind'] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new EncounterRuleError(`Unknown combatant ${id}.`);
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
      throw new EncounterRuleError('Summon ownership cannot contain a cycle.');
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
  return combatantSide(state, left) === combatantSide(state, right);
}
