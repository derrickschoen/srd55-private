import { describe, expect, it } from 'vitest';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { createEncounter } from '../../../src/combat/encounter';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import type { WorldObject } from '../../../src/combat/world-objects';
import { terrainBlocking, terrainWallCells, type TerrainKind } from '../../../src/combat/terrain';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import {
  SEMANTIC_BOARD_ENCODING_NOTE,
  projectEngineSemanticBoard,
  semanticBoardJson,
  semanticBoardPayload,
  semanticBoardTurnContextBlock,
} from '../../../src/vtt/semantic-board-payload';
import {
  deriveScreenshotFactSheet,
  truthAnswer,
} from '../../../tools/ai-dm-screenshot-probe';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

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
  terrainKind: TerrainKind,
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
    blocking: terrainBlocking(terrainKind),
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
      worldObject('open-door', 'door', 0, 2, 'open'),
      worldObject('closed-door', 'door', 4, 2, 'wall'),
      worldObject('torch', 'light-source', 0, 3, 'open'),
      worldObject('low-barricade', 'cover', 1, 3, 'half_cover'),
      worldObject('arrow-slit', 'cover', 2, 3, 'three_quarters_cover'),
    ],
    environment: {
      difficultTerrainRegions: [{ id: 'mud', cells: [{ column: 0, row: 1 }] }],
      obscurementRegions: [
        { id: 'mist', obscurement: 'light', cells: [{ column: 2, row: 1 }] },
        { id: 'smoke', obscurement: 'heavy', cells: [{ column: 3, row: 1 }] },
      ],
      lightRegions: [
        {
          id: 'dim',
          level: 'dim',
          cells: [
            { column: 1, row: 0 },
            { column: 2, row: 0 },
            { column: 3, row: 0 },
          ],
        },
        { id: 'dark', level: 'darkness', cells: [{ column: 4, row: 0 }] },
      ],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
  });
  const hiddenState = {
    ...state,
    hiddenCombatants: [{ combatant: foe.id, stealthTotal: 18, edition: '2024' as const }],
  };
  return {
    hero,
    foe,
    state: hiddenState,
    projection: projectDmBoard({
      view: projectDmView(hiddenState),
      coordinator: IDLE,
      controllers: [],
      history: [],
      offerEnvironment: OFFER_ENVIRONMENT,
    }),
  };
}

describe('semantic board payload', () => {
  it('keeps the engine-safe semantic source equal to the canonical DM board projection', () => {
    const fixture = fixtureProjection();
    const engineProjection = projectEngineSemanticBoard(fixture.state, fixture.projection.encounter.revision);

    expect(semanticBoardPayload(engineProjection)).toEqual(semanticBoardPayload(fixture.projection));
  });

  it('M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION exhaustively partitions cells and matches effective walls', () => {
    const payload = semanticBoardPayload(fixtureProjection().projection);

    expect(payload.cells.blocked).toEqual({
      provenance: 'engine_fact',
      encoding: '[column,row]',
      items: [[4, 3]],
    });
    expect(payload.cells.terrain.partition).toBe(
      'open, half_cover, three_quarters_cover, and wall together contain every board cell exactly once',
    );
    expect(payload.cells.terrain.half_cover.items).toEqual([[1, 3]]);
    expect(payload.cells.terrain.three_quarters_cover.items).toEqual([[2, 3]]);
    expect(payload.cells.terrain.wall.items).toEqual([[4, 2], [4, 3]]);
    const terrainMembership = Object.values(payload.cells.terrain)
      .filter((entry): entry is typeof payload.cells.terrain.open => typeof entry === 'object')
      .flatMap((entry) => entry.items)
      .flatMap((item) => item.length === 2
        ? [`${String(item[0])},${String(item[1])}`]
        : Array.from({ length: item[2] - item[0] + 1 }, (_unused, offset) => `${String(item[0] + offset)},${String(item[1])}`));
    expect(terrainMembership).toHaveLength(20);
    expect(new Set(terrainMembership).size).toBe(20);
    expect(payload.cells.terrain.wall.items).toEqual(
      terrainWallCells(fixtureProjection().state).map((cell) => [cell.column, cell.row]).sort(
        (left, right) => (left[1] ?? 0) - (right[1] ?? 0) || (left[0] ?? 0) - (right[0] ?? 0),
      ),
    );
    expect(payload.cells.light.dim).toEqual({
      provenance: 'engine_fact',
      encoding: '[column,row]',
      items: [[1, 0], [2, 0], [3, 0]],
    });
    expect(payload.cells.light.default_light).toBe('bright');
    expect(payload.cells.difficult_terrain.items).toEqual([[0, 1]]);
    expect(payload.cells.obscurement.light.items).toEqual([[2, 1]]);
    expect(payload.cells.obscurement.heavy.items).toEqual([[3, 1]]);
    expect(payload.cells.obscured.items).toEqual([[2, 1], [3, 1]]);
    expect(payload.cells.fogged.items).toEqual([[3, 3]]);
    expect(payload.cells.obscured_or_fogged.items).toEqual([
      [2, 1],
      [3, 1],
      [3, 3],
    ]);
    expect(payload.doors.open.items).toEqual([{
      id: 'world-object:open-door',
      name: 'open-door',
      cells: [[0, 2]],
      terrain_kind: 'open',
    }]);
    expect(payload.doors.closed.items).toEqual([{
      id: 'world-object:closed-door',
      name: 'closed-door',
      cells: [[4, 2]],
      terrain_kind: 'wall',
    }]);
    expect(payload.objects.items).toEqual([
      { id: 'world-object:torch', name: 'torch', kind: 'light-source', cells: [[0, 3]], terrain_kind: 'open' },
      { id: 'world-object:low-barricade', name: 'low-barricade', kind: 'cover', cells: [[1, 3]], terrain_kind: 'half_cover' },
      { id: 'world-object:arrow-slit', name: 'arrow-slit', kind: 'cover', cells: [[2, 3]], terrain_kind: 'three_quarters_cover' },
    ]);
    expect(payload.light_sources.items).toEqual([payload.objects.items[0]]);
    const forbiddenPairAnswerKeys = new Set([
      'line_of_sight', 'cover_between', 'pair_answer', 'hypothetical_origin', 'ranking', 'score', 'recommendation', 'suggested_cell',
    ]);
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }
      if (typeof value !== 'object' || value === null) return;
      for (const [key, child] of Object.entries(value)) {
        expect(forbiddenPairAnswerKeys.has(key), `forbidden semantic-board field ${key}`).toBe(false);
        visit(child);
      }
    };
    visit(payload);

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
      offerEnvironment: OFFER_ENVIRONMENT,
    }));
    expect(empty.creatures.items).toHaveLength(1);
    expect(empty.cells.blocked.items).toEqual([]);
    expect(empty.cells.terrain.open.items).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
    expect(empty.cells.terrain.half_cover.items).toEqual([]);
    expect(empty.cells.terrain.three_quarters_cover.items).toEqual([]);
    expect(empty.cells.terrain.wall.items).toEqual([]);
    expect(empty.cells.difficult_terrain.items).toEqual([]);
    expect(empty.cells.obscurement.light.items).toEqual([]);
    expect(empty.cells.obscurement.heavy.items).toEqual([]);
    expect(empty.cells.light.bright.items).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    expect(empty.cells.light.bright.encoding).toBe('[column,row]');
    expect(empty.cells.light.dim.items).toEqual([]);
    expect(empty.cells.light.dark.items).toEqual([]);
    expect(empty.cells.obscured.items).toEqual([]);
    expect(empty.cells.fogged.items).toEqual([]);
    expect(empty.cells.obscured_or_fogged.items).toEqual([]);
    expect(empty.doors.open.items).toEqual([]);
    expect(empty.doors.closed.items).toEqual([]);
    expect(empty.objects.items).toEqual([]);
    expect(empty.light_sources.items).toEqual([]);
    expect(empty.adjacency_pairs.items).toEqual([]);
    expect(empty.reach_range_summaries.items).toHaveLength(1);
  });

  it('M576-E3-SEMANTIC-BOARD-EMITS-PAIR-ANSWER excludes line, cover-pair, hypothetical, rank, and advice fields', () => {
    const payload = semanticBoardPayload(fixtureProjection().projection);
    const serialized = JSON.stringify(payload);
    for (const forbidden of [
      'line_of_sight', 'cover_between', 'pair_answer', 'hypothetical_origin',
      'ranking', 'suggested_cell', 'recommendation',
    ]) expect(serialized, forbidden).not.toContain(`"${forbidden}"`);
    expect(payload.objects.items.every((object) =>
      ['open', 'half_cover', 'three_quarters_cover', 'wall'].includes(object.terrain_kind))).toBe(true);
  });

  it('uses documented inclusive runs only when a fact class exceeds 200 cells', () => {
    const hero = playerProfile('large-light-board-hero');
    const payload = semanticBoardPayload(projectDmBoard({
      view: projectDmView(createEncounter({
        bounds: { columns: 21, rows: 10 },
        combatants: [hero],
        tokens: [placedToken(hero, 0, 0)],
      })),
      coordinator: IDLE,
      controllers: [],
      history: [],
      offerEnvironment: OFFER_ENVIRONMENT,
    }));

    expect(payload.cells.light.bright.encoding).toBe(
      '[start_column,row,end_column_inclusive]; endpoint is inclusive',
    );
    expect(payload.cells.light.bright.items).toHaveLength(10);
    expect(payload.cells.light.bright.items[0]).toEqual([0, 0, 20]);
    expect(payload.cells.light.bright.items[9]).toEqual([0, 9, 20]);
  });

  it('makes the Q9 union exactly the union of its truth-semantic components', () => {
    const fixture = fixtureProjection();
    const payload = semanticBoardPayload(fixture.projection);
    const truth = truthAnswer(deriveScreenshotFactSheet(fixture.state), 'Q9');
    if (truth.question !== 'Q9') throw new Error('Q9 truth answer changed question.');
    const truthUnion = new Set(
      [...truth.obscuredCells, ...truth.foggedCells].map(
        (cell) => `${String(cell.column)},${String(cell.row)}`,
      ),
    );
    const payloadUnion = new Set<string>();
    for (const cell of payload.cells.obscured_or_fogged.items) {
      if (cell.length === 2) {
        payloadUnion.add(`${String(cell[0])},${String(cell[1])}`);
        continue;
      }
      for (let column = cell[0]; column <= cell[2]; column += 1) {
        payloadUnion.add(`${String(column)},${String(cell[1])}`);
      }
    }

    expect(payloadUnion).toEqual(truthUnion);
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

  it('builds a provenance-stamped DM block and refuses a player projection at the delivery seam', () => {
    const { state, hero, projection } = fixtureProjection();
    const player = projectPlayerBoard(projectPlayerView(state, {
      seatId: 'seat:semantic-hero',
      combatantId: hero.id,
    }), IDLE);

    expect(semanticBoardTurnContextBlock(projection)).toMatchObject({
      provenance: 'engine_fact',
      encoding_note: SEMANTIC_BOARD_ENCODING_NOTE,
      audience: 'dm',
      revision: projection.encounter.revision,
    });
    expect(semanticBoardTurnContextBlock(player)).toBeNull();
  });
});
