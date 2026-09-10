import { describe, expect, it } from 'vitest';
import { createEncounter } from '../../../src/combat/encounter';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import { REFERENCE_FIGHTER_ID, referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
import { groundAnchor, groundCenter, rendererTokenId, sceneSnapshot } from '../../../src/vtt/handoff/scene-snapshot';
import { logicalAssetId } from '../../../src/vtt/handoff/asset-id-map';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixtureState() {
  const setup = referenceEncounterSetup();
  return createEncounter({
    ...setup,
    worldObjects: [
      {
        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door',
        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' }, createdRevision: 0,
      },
      {
        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier',
        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' }, createdRevision: 0,
      },
      {
        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source',
        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' }, createdRevision: 0,
      },
    ],
  });
}

describe('renderer-neutral scene snapshot', () => {
  it('pins ground centres and inverse anchors for every controlled span', () => {
    const anchor = { column: 2, row: 3 };
    expect([1, 2, 3, 4].map((span) => groundCenter(anchor, { w: span, h: span }))).toEqual([
      { x: 2, y: 3, z: 0 }, { x: 2.5, y: 3.5, z: 0 },
      { x: 3, y: 4, z: 0 }, { x: 3.5, y: 4.5, z: 0 },
    ]);
    expect(groundCenter(anchor, { w: 1, h: 1 })).toEqual({ x: 2, y: 3, z: 0 });
    expect(groundAnchor({ x: 2.5, y: 3.5, z: 0 }, { w: 2, h: 2 })).toEqual(anchor);
    expect(groundAnchor({ x: 2.25, y: 3.5, z: 0 }, { w: 2, h: 2 })).toBeNull();
    expect(groundAnchor({ x: 2.5, y: 3.5, z: 1 }, { w: 2, h: 2 })).toBeNull();
  });

  it('enriches filtered player combatants with renderer-only ids and omits environment lights', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const projection = projectPlayerBoard(view, IDLE);
    const result = sceneSnapshot({ sceneId: 'scene:two-room', projection, art: REFERENCE_ENCOUNTER_ART });
    expect(projection.combatants.every((combatant) => !('tokenId' in combatant))).toBe(true);
    expect(result.snapshot.tokens.map((token) => token.id)).toContain(rendererTokenId(String(REFERENCE_FIGHTER_ID)));
    expect(result.snapshot.tokens.some((token) => token.id === String(REFERENCE_FIGHTER_ID))).toBe(false);
    expect(result.snapshot.vision.visible).toEqual(projection.visibleCells.map((cell) => ({ x: cell.column, y: cell.row })));
    expect(result.snapshot.lights.map((light) => light.id)).toEqual(['light:object:object:torch']);
  });

  it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
    const state = fixtureState();
    const projection = projectDmBoard({ view: projectDmView(state), coordinator: IDLE, controllers: [], history: [] });
    const { snapshot } = sceneSnapshot({ sceneId: 'scene:two-room', projection, art: REFERENCE_ENCOUNTER_ART });
    const door = snapshot.doors[0];
    expect(door).toMatchObject({ id: 'object:door', wallId: 'wall:door:object:door', open: false });
    expect(snapshot.walls.filter((wall) => wall.id === door?.wallId)).toHaveLength(1);
    expect(snapshot.walls.some((wall) => wall.id.includes('6.5,2.5:6.5,3.5'))).toBe(false);
    expect(snapshot.lights.map((light) => light.id)).toContain('light:environment:reference-hiding-shadow');
    expect(snapshot.vision.mode).toBe('all');
  });

  it('reports deterministic role-aware fallbacks', () => {
    expect(logicalAssetId('unknown', 'prop')).toEqual({
      assetId: 'prop.pillar', fallbackUsed: true, sourceAssetId: 'unknown',
    });
    expect(logicalAssetId('art.map.floor.stone-n.v1', 'floor')).toEqual({
      assetId: 'tile.stone.floor', fallbackUsed: false, sourceAssetId: 'art.map.floor.stone-n.v1',
    });
  });
});
