import { decodeEncounterArtPackage } from './encounter-package';

export const REFERENCE_ENCOUNTER_ART = decodeEncounterArtPackage({
  schemaVersion: 1,
  id: 'encounter-art:reference-room:v1',
  room: {
    columns: 10,
    rows: 7,
    floor: 'art.map.floor.stone.v1',
    wall: 'art.map.wall.stone.v1',
    door: 'art.map.door.wood.v1',
    doorCell: { column: 4, row: 6 },
  },
  terrain: [
    { cell: { column: 4, row: 1 }, asset: 'art.terrain.crate.v1' },
    { cell: { column: 4, row: 5 }, asset: 'art.terrain.rubble.v1' },
    { cell: { column: 7, row: 2 }, asset: 'art.terrain.pillar.v1' },
    { cell: { column: 7, row: 4 }, asset: 'art.terrain.hazard.v1' },
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
