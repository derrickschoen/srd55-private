import type { EncounterState } from './encounter';
import type { MonsterStatblock, MonsterTrait } from './statblock';
import { lookupBundledMonster } from './statblocks/companions';
import { statblockId, type CombatantId, type StatblockId } from './values';

function statblockTraits(statblock: MonsterStatblock): readonly MonsterTrait[] {
  const traits = statblock.sourceDetails.traits;
  return traits.kind === 'present' ? traits.value : [];
}

function importedStatblock(
  state: EncounterState,
  statblockId: StatblockId,
): MonsterStatblock | null {
  return state.contentPacks?.flatMap((pack) => pack.monsters)
    .find((monster) => monster.statblock.id === statblockId)?.statblock ?? null;
}

function resolvedStatblock(
  state: EncounterState,
  statblockId: StatblockId,
): MonsterStatblock | null {
  const imported = importedStatblock(state, statblockId);
  if (imported !== null) return imported;
  const bundled = lookupBundledMonster(String(statblockId));
  return bundled.status === 'resolved' && bundled.entry.kind === 'static'
    ? bundled.entry.statblock
    : null;
}

/** Authoritative traits for the combatant's current physical statblock. */
export function declaredMonsterTraits(
  state: EncounterState,
  actorId: CombatantId,
): readonly MonsterTrait[] {
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (actor === undefined) return [];
  if (actor.wildShape !== undefined) {
    const statblock = resolvedStatblock(state, actor.wildShape.formId);
    return statblock === null ? [] : statblockTraits(statblock);
  }
  if (actor.form !== undefined) {
    const statblock = resolvedStatblock(state, statblockId(actor.form.formId));
    return statblock === null ? [] : statblockTraits(statblock);
  }
  if (actor.profile.kind !== 'monster') return [];
  const statblock = resolvedStatblock(state, actor.profile.statblockId);
  return statblock === null ? [] : statblockTraits(statblock);
}
