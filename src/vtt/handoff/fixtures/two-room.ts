import { combatToken, type CombatantProfile } from '../../../combat/combatant';
import { createEncounter, type EncounterState } from '../../../combat/encounter';
import { projectDmView, projectPlayerView, type PlayerSeatBinding } from '../../../combat/visibility';
import { armorClass, combatantId, statblockId, tokenId, worldObjectId } from '../../../combat/values';
import { decodeEncounterArtPackage, type EncounterArtPackage } from '../../encounter-package';
import { projectDmBoard, projectPlayerBoard } from '../../encounter-projections';
import { referenceEncounterSetup } from '../../reference-encounter';
import {
  canonicalTokenIdentityIndex, sceneSnapshot, type SnapshotAssetFallback,
} from '../scene-snapshot';
import type { SceneSnapshot } from '../v1/contracts';

export const TWO_ROOM_SEED = 603_020_001;
export const TWO_ROOM_CLOCK = '2026-09-09T12:00:00.000Z';
export const TWO_ROOM_SCENE_ID = 'scene:two-room-v1';
export const TWO_ROOM_ADVENTURER_ID = combatantId('combatant:two-room-adventurer');
export const TWO_ROOM_GOBLIN_ID = combatantId('combatant:two-room-goblin');

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function combatants(): readonly [CombatantProfile, CombatantProfile] {
  const reference = referenceEncounterSetup().combatants;
  const player = reference.find((candidate) => candidate.kind === 'player_character');
  const monster = reference.find((candidate) => candidate.kind === 'monster');
  if (player?.kind !== 'player_character' || monster?.kind !== 'monster') throw new Error('REFERENCE_COMBATANTS_MISSING');
  return [
    {
      ...player,
      id: TWO_ROOM_ADVENTURER_ID,
      tokenId: tokenId('token:two-room-adventurer'),
      name: 'Adventurer',
      characterId: 60_301,
    },
    {
      ...monster,
      id: TWO_ROOM_GOBLIN_ID,
      tokenId: tokenId('token:two-room-goblin'),
      name: 'Goblin',
      statblockId: statblockId('statblock:goblin-warrior'),
    },
  ];
}

export function twoRoomArtPackage(): EncounterArtPackage {
  return decodeEncounterArtPackage({
    schemaVersion: 1,
    id: 'encounter-art:two-room:v1',
    room: {
      columns: 12, rows: 8,
      floor: 'art.map.floor.stone.v1',
      wall: 'art.map.wall.stone.v1',
      door: 'art.map.door.wood.v1',
      doorCell: { column: 5, row: 7 },
    },
    terrain: [
      { cell: { column: 2, row: 2 }, asset: 'art.terrain.crate.v1' },
      { cell: { column: 8, row: 2 }, asset: 'art.terrain.rubble.v1' },
      { cell: { column: 9, row: 5 }, asset: 'art.terrain.pillar.v1' },
      { cell: { column: 3, row: 5 }, asset: 'art.terrain.hazard.v1' },
    ],
    fog: {
      hidden: 'art.fog.hidden.v1', unexplored: 'art.fog.unexplored.v1', revealed: 'art.fog.revealed.v1',
    },
    ui: { activePc: 'art.focus.active-pc.v1', adjudicated: 'art.event.adjudicated.v1' },
    combatantTokens: {
      [TWO_ROOM_ADVENTURER_ID]: 'art.token.pc.fighter.v1',
      [TWO_ROOM_GOBLIN_ID]: 'art.token.monster.goblin-warrior.v1',
    },
  });
}

function object(
  id: string,
  name: string,
  kind: EncounterState['worldObjects'][number]['kind'],
  position: { readonly column: number; readonly row: number },
  blocking: EncounterState['worldObjects'][number]['blocking'],
): EncounterState['worldObjects'][number] {
  return {
    id: worldObjectId(id), name, kind, position, footprint: [position],
    durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
    blocking, createdRevision: 0,
  };
}

export function buildTwoRoomEncounter(): EncounterState {
  const [adventurer, goblin] = combatants();
  return createEncounter({
    bounds: { columns: 12, rows: 8 },
    blockedCells: Array.from({ length: 8 }, (_unused, row) => row === 4 ? null : { column: 5, row })
      .filter((cell): cell is { readonly column: number; readonly row: number } => cell !== null),
    worldObjects: [
      object('object:two-room-door', 'Oak Door', 'door', { column: 5, row: 4 }, { movement: true, lineOfSight: true, cover: 'total' }),
      object('object:two-room-barrel', 'Barrel', 'cover', { column: 2, row: 2 }, { movement: false, lineOfSight: false, cover: 'half' }),
      object('object:two-room-table', 'Table', 'cover', { column: 8, row: 2 }, { movement: false, lineOfSight: false, cover: 'half' }),
      object('object:two-room-pillar', 'Pillar', 'cover', { column: 9, row: 5 }, { movement: false, lineOfSight: false, cover: 'three_quarters' }),
      object('object:two-room-torch', 'Torch', 'light-source', { column: 3, row: 5 }, { movement: false, lineOfSight: false, cover: 'none' }),
    ],
    environment: {
      lightRegions: [{
        id: 'region:two-room-torch-bright', level: 'bright',
        cells: [{ column: 2, row: 4 }, { column: 3, row: 4 }, { column: 4, row: 4 }, { column: 2, row: 5 }, { column: 3, row: 5 }, { column: 4, row: 5 }],
      }],
      difficultTerrainRegions: [], obscurementRegions: [], narrowOpeningRegions: [], movementRegions: [],
    },
    foggedCells: [{ column: 8, row: 4 }],
    dmNotes: [],
    combatants: [adventurer, goblin],
    tokens: [combatToken(adventurer, { column: 2, row: 4 }), combatToken(goblin, { column: 8, row: 4 })],
  });
}

export const TWO_ROOM_PLAYER_BINDINGS: readonly [PlayerSeatBinding, PlayerSeatBinding] = [
  { seatId: 'player:adventurer', combatantId: TWO_ROOM_ADVENTURER_ID },
  { seatId: 'player:goblin', combatantId: TWO_ROOM_GOBLIN_ID },
];

export interface TwoRoomFixtureSource {
  readonly schemaVersion: 1;
  readonly seed: number;
  readonly clock: string;
  readonly sceneId: string;
  readonly art: EncounterArtPackage;
  readonly playerBindings: readonly PlayerSeatBinding[];
  readonly state: EncounterState;
}

export interface TwoRoomSnapshotFixture {
  readonly schemaVersion: 1;
  readonly seed: number;
  readonly sourceRevision: number;
  readonly dm: SceneSnapshot;
  readonly dmAssetFallbacks: readonly SnapshotAssetFallback[];
  readonly players: readonly {
    readonly playerId: string;
    readonly snapshot: SceneSnapshot;
    readonly assetFallbacks: readonly SnapshotAssetFallback[];
  }[];
}

export function buildTwoRoomFixtures(): {
  readonly source: TwoRoomFixtureSource;
  readonly snapshots: TwoRoomSnapshotFixture;
} {
  const state = buildTwoRoomEncounter();
  const art = twoRoomArtPackage();
  const tokenIdentities = canonicalTokenIdentityIndex(state.tokens);
  const dmProjection = projectDmBoard({ view: projectDmView(state), coordinator: IDLE, controllers: [], history: [] });
  const dmResult = sceneSnapshot({ sceneId: TWO_ROOM_SCENE_ID, projection: dmProjection, art, tokenIdentities });
  const players = TWO_ROOM_PLAYER_BINDINGS.map((binding) => {
    const result = sceneSnapshot({
      sceneId: TWO_ROOM_SCENE_ID,
      projection: projectPlayerBoard(projectPlayerView(state, binding), IDLE),
      art, tokenIdentities,
    });
    return { playerId: binding.seatId, snapshot: result.snapshot, assetFallbacks: result.assetFallbacks };
  });
  return {
    source: {
      schemaVersion: 1, seed: TWO_ROOM_SEED, clock: TWO_ROOM_CLOCK,
      sceneId: TWO_ROOM_SCENE_ID, art, playerBindings: TWO_ROOM_PLAYER_BINDINGS, state,
    },
    snapshots: {
      schemaVersion: 1, seed: TWO_ROOM_SEED, sourceRevision: state.revision,
      dm: dmResult.snapshot, dmAssetFallbacks: dmResult.assetFallbacks, players,
    },
  };
}
