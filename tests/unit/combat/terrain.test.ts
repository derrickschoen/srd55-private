import { describe, expect, it } from 'vitest';
import { createEncounter, templateBlockedCells } from '../../../src/combat/encounter';
import { traceTerrainLine } from '../../../src/combat/cover';
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

  it('M576-E1A-BLOCKED-SIGHT-TRANSPARENT / M576-E1A-BLOCKED-NO-COVER / M576-E1A-TIERS-STACK-INSTEAD-OF-MAX / M576-E1A-ENDPOINT-INCLUDED / M576-E1A-THREE-QUARTERS-AS-HALF pins wall, max-tier, and endpoint semantics', () => {
    const actor = playerProfile('terrain-tracer');
    const state = createEncounter({
      bounds: { columns: 7, rows: 1 }, combatants: [actor], tokens: [placedToken(actor, 0)],
      blockedCells: [{ column: 4, row: 0 }],
      worldObjects: [
        terrainObject('low', 1, 'half_cover'),
        terrainObject('tall', 2, 'three_quarters_cover'),
        terrainObject('endpoint-wall', 6, 'wall'),
      ],
    });
    const partial = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 0 });
    expect(partial).toMatchObject({
      tier: 'three_quarters', blocksSight: false, passability: 'blocked', sourceIds: ['object:object:tall'],
    });
    expect(partial.interveningCells).toEqual([{ column: 1, row: 0 }, { column: 2, row: 0 }]);

    const wall = traceTerrainLine(state, { column: 0, row: 0 }, { column: 5, row: 0 });
    expect(wall).toMatchObject({
      tier: 'total', blocksSight: true, passability: 'blocked',
      sourceIds: ['blocked:4,0'], firstBlockingCell: { column: 4, row: 0 },
    });
    expect(traceTerrainLine(state, { column: 3, row: 0 }, { column: 6, row: 0 }))
      .toMatchObject({ tier: 'total', sourceIds: ['blocked:4,0'] });
    expect(traceTerrainLine(state, { column: 5, row: 0 }, { column: 6, row: 0 }))
      .toMatchObject({ tier: 'none', blocksSight: false, sourceIds: [] });
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

  it('pins diagonal traversal order and reversal symmetry without changing the existing rasterizer', () => {
    const actor = playerProfile('terrain-diagonal');
    const state = createEncounter({ bounds: { columns: 8, rows: 8 }, combatants: [actor], tokens: [placedToken(actor, 7, 7)] });
    const forward = traceTerrainLine(state, { column: 0, row: 1 }, { column: 7, row: 4 }).interveningCells;
    const reverse = traceTerrainLine(state, { column: 7, row: 4 }, { column: 0, row: 1 }).interveningCells;
    expect(forward).toEqual([
      { column: 1, row: 1 }, { column: 2, row: 2 }, { column: 3, row: 2 },
      { column: 4, row: 3 }, { column: 5, row: 3 }, { column: 6, row: 4 },
    ]);
    expect(reverse).toEqual([...forward].reverse());
  });
});
