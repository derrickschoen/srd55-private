import type { EncounterState } from '../../../src/combat/encounter';
import { statblockId } from '../../../src/combat/values';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';

const INITIATIVE_BONUSES: Readonly<Record<string, number>> = {
  'combatant:fighter': 3,
  'combatant:cleric': 1,
  'combatant:wizard': 2,
  'combatant:generated-3943001-monster-1': 4,
  'combatant:generated-3943001-monster-2': 2,
  'combatant:generated-3943001-monster-3': 2,
};

const POSITIONS: Readonly<Record<string, { readonly column: number; readonly row: number }>> = {
  'combatant:fighter': { column: 5, row: 5 },
  'combatant:cleric': { column: 5, row: 7 },
  'combatant:wizard': { column: 5, row: 9 },
  'combatant:generated-3943001-monster-1': { column: 6, row: 5 },
  'combatant:generated-3943001-monster-2': { column: 6, row: 7 },
  'combatant:generated-3943001-monster-3': { column: 6, row: 9 },
};

/** A fresh Phase-2 fixture with ordinary bonuses and adjacent PC/monster turns. */
export async function alternatingInitiativeRoom(options: {
  readonly layout?: 'adjacent' | 'generated';
  readonly monsterHitPoints?: number;
  readonly fragileMonsterCount?: number;
} = {}): Promise<EncounterState> {
  const source = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
  const monsterHitPoints = options.monsterHitPoints ?? 60;
  const fragileMonsterIds = new Set(source.combatants
    .filter((combatant) => combatant.profile.kind === 'monster')
    .slice(0, options.fragileMonsterCount ?? 0)
    .map((combatant) => combatant.profile.id));
  return {
    ...source,
    config: { ...source.config, initiativeMode: 'per_combatant' },
    combatants: source.combatants.map((combatant) => ({
      ...combatant,
      hitPoints: combatant.profile.kind === 'monster'
        ? fragileMonsterIds.has(combatant.profile.id) ? 1 : monsterHitPoints
        : combatant.hitPoints,
      profile: {
        ...combatant.profile,
        ...(combatant.profile.kind === 'monster' &&
          combatant.profile.id === 'combatant:generated-3943001-monster-2'
          ? { statblockId: statblockId('statblock:hobgoblin-warrior') }
          : {}),
        rules: {
          ...combatant.profile.rules,
          hitPointMaximum: combatant.profile.kind === 'monster'
            ? fragileMonsterIds.has(combatant.profile.id) ? 1 : monsterHitPoints
            : combatant.profile.rules.hitPointMaximum,
          initiativeBonus: INITIATIVE_BONUSES[combatant.profile.id] ?? 0,
        },
      },
    })),
    tokens: source.tokens.map((token) => ({
      ...token,
      position: options.layout === 'generated'
        ? token.position
        : POSITIONS[token.combatantId] ?? token.position,
    })),
  };
}
