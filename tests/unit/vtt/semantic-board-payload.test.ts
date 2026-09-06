import { describe, expect, it } from 'vitest';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { createEncounter } from '../../../src/combat/encounter';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import { projectDmView } from '../../../src/combat/visibility';
import type { WorldObject } from '../../../src/combat/world-objects';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import {
  semanticBoardJson,
  semanticBoardPayload,
} from '../../../src/vtt/semantic-board-payload';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

function worldObject(
  id: string,
  kind: WorldObject['kind'],
  column: number,
  row: number,
  blocksMovement: boolean,
): WorldObject {
  const cell = { column, row };
  return {
    id: worldObjectId(`world-object:${id}`),
    name: id,
    kind,
    position: cell,
    footprint: [cell],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: {
      movement: blocksMovement,
      lineOfSight: blocksMovement,
      cover: blocksMovement ? 'total' : 'none',
    },
    createdRevision: 0,
  };
}

function fixtureProjection() {
  const hero = playerProfile('semantic-hero', { hitPoints: 12 });
  const foe = monsterProfile('semantic-foe', { hitPoints: 12 });
  const state = createEncounter({
    bounds: { columns: 5, rows: 4 },
    combatants: [hero, foe],
    tokens: [placedToken(hero, 1, 1), placedToken(foe, 2, 2)],
    blockedCells: [{ column: 4, row: 3 }],
    foggedCells: [{ column: 3, row: 3 }],
    worldObjects: [
      worldObject('open-door', 'door', 0, 2, false),
      worldObject('closed-door', 'door', 4, 2, true),
      worldObject('torch', 'light-source', 0, 3, false),
    ],
    environment: {
      difficultTerrainRegions: [{ id: 'mud', cells: [{ column: 0, row: 1 }] }],
      obscurementRegions: [
        { id: 'mist', obscurement: 'light', cells: [{ column: 2, row: 1 }] },
        { id: 'smoke', obscurement: 'heavy', cells: [{ column: 3, row: 1 }] },
      ],
      lightRegions: [
        { id: 'dim', level: 'dim', cells: [{ column: 1, row: 0 }] },
        { id: 'dark', level: 'darkness', cells: [{ column: 2, row: 0 }] },
      ],
      movementRegions: [],
    },
  });
  const hiddenState = {
    ...state,
    hiddenCombatants: [{ combatant: foe.id, stealthTotal: 18, edition: '2024' as const }],
  };
  return {
    hero,
    foe,
    projection: projectDmBoard({
      view: projectDmView(hiddenState),
      coordinator: IDLE,
      controllers: [],
      history: [],
    }),
  };
}

describe('semantic board payload', () => {
  it('lists exact engine terrain facts and keeps absent arrays explicit', () => {
    const payload = semanticBoardPayload(fixtureProjection().projection);

    expect(payload.cells.blocked).toEqual({
      provenance: 'engine_fact',
      items: [[4, 3]],
    });
    expect(payload.cells.difficult_terrain.items).toEqual([[0, 1]]);
    expect(payload.cells.obscurement.light.items).toEqual([[2, 1]]);
    expect(payload.cells.obscurement.heavy.items).toEqual([[3, 1]]);
    expect(payload.cells.fog.items).toEqual([[3, 3]]);
    expect(payload.doors.open.items).toEqual([{
      id: 'world-object:open-door',
      name: 'open-door',
      cells: [[0, 2]],
    }]);
    expect(payload.doors.closed.items).toEqual([{
      id: 'world-object:closed-door',
      name: 'closed-door',
      cells: [[4, 2]],
    }]);
    expect(payload.objects.items).toEqual([{
      id: 'world-object:torch',
      name: 'torch',
      kind: 'light-source',
      cells: [[0, 3]],
    }]);
    expect(payload.light_sources.items).toEqual(payload.objects.items);

    const emptyHero = playerProfile('empty-facts-hero');
    const empty = semanticBoardPayload(projectDmBoard({
      view: projectDmView(createEncounter({
        bounds: { columns: 2, rows: 2 },
        combatants: [emptyHero],
        tokens: [placedToken(emptyHero, 0, 0)],
      })),
      coordinator: IDLE,
      controllers: [],
      history: [],
    }));
    expect(empty.creatures.items).toHaveLength(1);
    expect(empty.cells.blocked.items).toEqual([]);
    expect(empty.cells.difficult_terrain.items).toEqual([]);
    expect(empty.cells.obscurement.light.items).toEqual([]);
    expect(empty.cells.obscurement.heavy.items).toEqual([]);
    expect(empty.cells.light.bright.items).toEqual([[0, 0, 1], [0, 1, 1]]);
    expect(empty.cells.light.dim.items).toEqual([]);
    expect(empty.cells.light.dark.items).toEqual([]);
    expect(empty.cells.fog.items).toEqual([]);
    expect(empty.doors.open.items).toEqual([]);
    expect(empty.doors.closed.items).toEqual([]);
    expect(empty.objects.items).toEqual([]);
    expect(empty.light_sources.items).toEqual([]);
    expect(empty.adjacency_pairs.items).toEqual([]);
    expect(empty.reach_range_summaries.items).toHaveLength(1);
  });

  it('redacts a hidden current cell for players and exposes it to the DM', () => {
    const { projection, foe } = fixtureProjection();
    const dm = semanticBoardPayload(projection);
    const player = semanticBoardPayload(projection, {
      audience: 'player',
      lastSeenByCreature: new Map([[foe.id, { column: 1, row: 2 }]]),
    });
    const dmFoe = dm.creatures.items.find((creature) => creature.id === foe.id);
    const playerFoe = player.creatures.items.find((creature) => creature.id === foe.id);

    expect(dmFoe).toMatchObject({
      hidden: true,
      cell: [2, 2],
      last_seen: null,
    });
    expect(playerFoe).toMatchObject({
      hidden: true,
      cell: null,
      footprint: [],
      hp_band: 'unknown',
      last_seen: [1, 2],
    });
    expect(player.adjacency_pairs.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ second_id: foe.id })]),
    );
    expect(player.reach_range_summaries.items.some((summary) => summary.id === foe.id)).toBe(false);
  });

  it('is byte-stable for the same projection', () => {
    const projection = fixtureProjection().projection;
    expect(semanticBoardJson(projection)).toBe(semanticBoardJson(projection));
    expect(semanticBoardJson(projection)).toBe(
      JSON.stringify(JSON.parse(semanticBoardJson(projection)) as unknown),
    );
  });
});
