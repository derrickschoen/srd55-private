import { decodeEncounterArtPackage } from './encounter-package';
import type { EncounterArtPackage } from './encounter-package';
import type { AssetId } from '../assets/ids';

/** The flagship uses the starter tiles on its authored 14-by-10 stronghold board. */
export const VANE_WARREN_ART = decodeEncounterArtPackage({
  schemaVersion: 1,
  id: 'encounter-art:vane-warren:v1',
  room: {
    columns: 14,
    rows: 10,
    floor: 'art.map.floor.stone.v1',
    wall: 'art.map.wall.stone.v1',
    door: 'art.map.door.wood.v1',
    doorCell: { column: 13, row: 5 },
  },
  terrain: [
    { cell: { column: 4, row: 1 }, asset: 'art.terrain.crate.v1' },
    { cell: { column: 4, row: 8 }, asset: 'art.terrain.rubble.v1' },
    { cell: { column: 7, row: 4 }, asset: 'art.terrain.pillar.v1' },
    { cell: { column: 7, row: 7 }, asset: 'art.terrain.hazard.v1' },
  ],
  fog: {
    hidden: 'art.fog.hidden.v1',
    unexplored: 'art.fog.unexplored.v1',
    revealed: 'art.fog.revealed.v1',
  },
  ui: {
    activePc: 'art.focus.active-pc.v1',
    adjudicated: 'art.event.adjudicated.v1',
  },
  combatantTokens: {
    'combatant:fighter': 'art.token.pc.fighter.v1',
    'combatant:cleric': 'art.token.pc.cleric.v1',
    'combatant:wizard': 'art.token.pc.wizard.v1',
    'combatant:training-brute': 'art.token.monster.ogre.v1',
  },
});

export function vaneWarrenArtForCombatants(
  combatants: readonly {
    readonly id: string;
    readonly kind: 'player_character' | 'monster';
  }[],
): EncounterArtPackage {
  const player = VANE_WARREN_ART.combatantTokens['combatant:fighter'];
  const monster = VANE_WARREN_ART.combatantTokens['combatant:training-brute'];
  if (player === undefined || monster === undefined) {
    throw new Error('Vane Warren fallback token art is incomplete.');
  }
  const combatantTokens: Record<string, AssetId> = {
    ...VANE_WARREN_ART.combatantTokens,
  };
  for (const combatant of combatants) {
    combatantTokens[combatant.id] = combatantTokens[combatant.id] ??
      (combatant.kind === 'player_character' ? player : monster);
  }
  return { ...VANE_WARREN_ART, combatantTokens };
}
