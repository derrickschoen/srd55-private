import { describe, expect, it } from 'vitest';
import { createEncounter, templateBlockedCells } from '../../../src/combat/encounter';
import { rasterizeCornerLine, traceTerrainLine } from '../../../src/combat/cover';
import { findPath } from '../../../src/combat/movement';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import {
  TERRAIN_KINDS,
  TERRAIN_PROFILES,
  terrainBlocking,
  terrainKindOfBlocking,
  terrainPassabilityAt,
} from '../../../src/combat/terrain';
import { armorClass, feet, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { placedToken, playerProfile } from './fixtures';

function terrainObject(id: string, column: number, kind: Parameters<typeof terrainBlocking>[0]): WorldObject {
  const position = { column, row: 0 };
  return {
    id: worldObjectId(`object:${id}`),
    name: id,
    kind: 'cover',
    position,
    footprint: [position],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(10),
    damageResponses: [],
    blocking: terrainBlocking(kind),
    createdRevision: 0,
  };
}

function terrainObjectCells(
  id: string,
  cells: readonly { readonly column: number; readonly row: number }[],
  kind: Parameters<typeof terrainBlocking>[0],
): WorldObject {
  const position = cells[0];
  if (position === undefined) throw new Error('A terrain test object needs a footprint.');
  return {
    ...terrainObject(id, position.column, kind),
    position,
    footprint: cells,
  };
}

describe('D576 canonical terrain vocabulary and cell trace', () => {
  it('closes all profiles and keeps cover, sight, and passability invariants independent', () => {
    expect(TERRAIN_KINDS).toEqual(['open', 'half_cover', 'three_quarters_cover', 'wall']);
    expect(TERRAIN_KINDS.map((kind) => ({
      kind,
      inverse: terrainKindOfBlocking(terrainBlocking(kind)),
      profile: TERRAIN_PROFILES[kind],
    }))).toEqual([
      { kind: 'open', inverse: 'open', profile: expect.objectContaining({ coverTier: 'none', passability: 'open', blocksSight: false }) },
      { kind: 'half_cover', inverse: 'half_cover', profile: expect.objectContaining({ coverTier: 'half', passability: 'difficult', blocksSight: false }) },
      { kind: 'three_quarters_cover', inverse: 'three_quarters_cover', profile: expect.objectContaining({ coverTier: 'three_quarters', passability: 'blocked', blocksSight: false }) },
      { kind: 'wall', inverse: 'wall', profile: expect.objectContaining({ coverTier: 'total', passability: 'blocked', blocksSight: true }) },
    ]);
    expect(terrainBlocking('half_cover')).toEqual({ movement: false, lineOfSight: false, cover: 'half' });
    expect(Object.keys(terrainBlocking('half_cover')).sort()).toEqual(['cover', 'lineOfSight', 'movement']);
  });

  it('makes low cover difficult, tall partial cover blocked, and movement consume passability only', () => {
    const actor = playerProfile('terrain-mover');
    const half = terrainObject('low-barricade', 1, 'half_cover');
    const state = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [actor],
      tokens: [placedToken(actor, 0)],
      worldObjects: [half],
    });
    expect(terrainPassabilityAt(state, { column: 0, row: 0 })).toBe('open');
    expect(terrainPassabilityAt(state, { column: 1, row: 0 })).toBe('difficult');
    expect(findPath(encounterMovementWorld(state), {
      actorId: actor.id, start: { column: 0, row: 0 }, goal: { column: 2, row: 0 }, maximumCost: feet(30),
    })).toMatchObject({ kind: 'found', cost: 15 });

    const blocked = { ...state, worldObjects: [terrainObject('portcullis', 1, 'three_quarters_cover')] };
    expect(terrainPassabilityAt(blocked, { column: 1, row: 0 })).toBe('blocked');
    expect(findPath(encounterMovementWorld(blocked), {
      actorId: actor.id, start: { column: 0, row: 0 }, goal: { column: 2, row: 0 }, maximumCost: feet(30),
    })).toEqual({ kind: 'unreachable' });
  });

  it('four lines through low cover yields Half Cover (M576-E1A-COUNT-WITHOUT-CLAMP / M576-E1A-TIERS-STACK-INSTEAD-OF-MAX)', () => {
    const actor = playerProfile('terrain-tracer');
    const lowStrip = terrainObjectCells('low-strip', [0, 1, 2, 3, 4, 5]
      .map((row) => ({ column: 1, row })), 'half_cover');
    const state = createEncounter({
      bounds: { columns: 6, rows: 6 }, combatants: [actor], tokens: [placedToken(actor, 5, 5)],
      worldObjects: [lowStrip],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    expect(trace).toMatchObject({
      tier: 'half', blocksSight: false, sourceIds: ['object:object:low-strip'],
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['half', 'half', 'half', 'half']);
  });

  it('M576-E1A-TIERS-STACK-INSTEAD-OF-MAX keeps only the strongest feature on each line', () => {
    const actor = playerProfile('strongest-feature-tracer');
    const rows = [0, 1, 2, 3, 4, 5];
    const state = createEncounter({
      bounds: { columns: 6, rows: 6 }, combatants: [actor], tokens: [placedToken(actor, 5, 5)],
      worldObjects: [
        terrainObjectCells('low-strip', rows.map((row) => ({ column: 1, row })), 'half_cover'),
        terrainObjectCells('tall-strip', rows.map((row) => ({ column: 2, row })), 'three_quarters_cover'),
      ],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    expect(trace.tier).toBe('three_quarters');
    expect(trace.lines.map((line) => line.tier)).toEqual([
      'three_quarters', 'three_quarters', 'three_quarters', 'three_quarters',
    ]);
  });

  it('a wall corner clipping two lines yields Half Cover', () => {
    const actor = playerProfile('wall-clip-tracer');
    const state = createEncounter({
      bounds: { columns: 6, rows: 2 }, combatants: [actor], tokens: [placedToken(actor, 5, 1)],
      blockedCells: [{ column: 2, row: 0 }],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 0 });
    expect(trace).toMatchObject({
      tier: 'half', blocksSight: false, sourceIds: ['blocked:2,0'], firstBlockingCell: null,
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'total', 'total']);
  });

  it('every line crossing a wall yields Total Cover with no sight (M576-E1A-BLOCKED-SIGHT-TRANSPARENT / M576-E1A-BLOCKED-NO-COVER)', () => {
    const actor = playerProfile('wall-strip-tracer');
    const blockedCells = [0, 1, 2, 3, 4, 5].map((row) => ({ column: 1, row }));
    const state = createEncounter({
      bounds: { columns: 6, rows: 6 }, combatants: [actor], tokens: [placedToken(actor, 5, 5)], blockedCells,
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    expect(trace).toMatchObject({
      tier: 'total', blocksSight: true, sourceIds: ['blocked:1,0', 'blocked:1,1'],
      firstBlockingCell: { column: 1, row: 0 },
    });
    expect(trace.lines.map((line) => line.blocksSight)).toEqual([true, true, true, true]);
  });

  it('M576-E1A-THREE-QUARTERS-AS-HALF keeps three obstructed corner lines at Three-Quarters Cover', () => {
    const actor = playerProfile('three-quarter-tracer');
    const state = createEncounter({
      bounds: { columns: 6, rows: 4 }, combatants: [actor], tokens: [placedToken(actor, 5, 3)],
      worldObjects: [terrainObjectCells('arrow-slit', [
        { column: 2, row: 0 }, { column: 1, row: 1 },
      ], 'three_quarters_cover')],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    expect(trace.tier).toBe('three_quarters');
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'three_quarters', 'three_quarters', 'three_quarters']);
  });

  it('M576-E1A-ENDPOINT-INCLUDED excludes both endpoint cells from all four corner lines', () => {
    const actor = playerProfile('endpoint-tracer');
    const state = createEncounter({
      bounds: { columns: 6, rows: 4 }, combatants: [actor], tokens: [placedToken(actor, 5, 3)],
      worldObjects: [
        terrainObjectCells('source-wall', [{ column: 0, row: 0 }], 'wall'),
        terrainObjectCells('target-wall', [{ column: 4, row: 2 }], 'wall'),
      ],
    });
    expect(traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 }))
      .toMatchObject({ tier: 'none', blocksSight: false, sourceIds: [] });
  });

  it('M576-E1A-CORNER-FIXED-SOURCE chooses the least protective source corner with a row-major tie-break', () => {
    const actor = playerProfile('chosen-source-corner');
    const state = createEncounter({
      bounds: { columns: 6, rows: 4 }, combatants: [actor], tokens: [placedToken(actor, 5, 3)],
      blockedCells: [{ column: 1, row: 1 }],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    // The top-left source corner is obstructed; top-right and lower alternatives are clear.
    // Row-major tie-breaking therefore selects top-right, (1,0), without cover.
    expect(trace).toMatchObject({
      sourceCorner: { column: 1, row: 0 }, tier: 'none', blocksSight: false,
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'none', 'none']);
  });

  it('changing feature passability cannot change trace tier or sight', () => {
    const actor = playerProfile('independent-passability');
    const cells = [0, 1, 2, 3].map((row) => ({ column: 1, row }));
    const difficult = terrainObjectCells('independent-low', cells, 'half_cover');
    const blocked: WorldObject = {
      ...difficult,
      blocking: { movement: true, lineOfSight: false, cover: 'half' },
    };
    const makeState = (worldObject: WorldObject) => createEncounter({
      bounds: { columns: 6, rows: 4 }, combatants: [actor], tokens: [placedToken(actor, 5, 3)],
      worldObjects: [worldObject],
    });
    const difficultState = makeState(difficult);
    const blockedState = makeState(blocked);
    expect(terrainPassabilityAt(difficultState, { column: 1, row: 0 })).toBe('difficult');
    expect(terrainPassabilityAt(blockedState, { column: 1, row: 0 })).toBe('blocked');
    const answers = [difficultState, blockedState].map((state) => {
      const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
      return { tier: trace.tier, blocksSight: trace.blocksSight };
    });
    expect(answers).toEqual([
      { tier: 'half', blocksSight: false },
      { tier: 'half', blocksSight: false },
    ]);
  });

  it('M576-E1A-HALF-CLIPS-TEMPLATE keeps only canonical walls opaque to templates', () => {
    const actor = playerProfile('template-terrain');
    const state = createEncounter({
      bounds: { columns: 6, rows: 1 }, combatants: [actor], tokens: [placedToken(actor, 0)],
      blockedCells: [{ column: 1, row: 0 }],
      worldObjects: [
        terrainObject('low', 2, 'half_cover'),
        terrainObject('tall', 3, 'three_quarters_cover'),
        terrainObject('wall', 4, 'wall'),
      ],
    });
    expect(templateBlockedCells(state)).toEqual([
      { column: 1, row: 0 },
      { column: 4, row: 0 },
    ]);
  });

  it('M576-E1A-BOUNDARY-GRAZE-BLOCKS excludes a line that only follows a cell boundary', () => {
    expect(rasterizeCornerLine(
      { column: 0, row: 0 },
      { column: 4, row: 0 },
      [{ column: 1, row: 0 }, { column: 2, row: 0 }],
    )).toEqual([]);
  });
});
