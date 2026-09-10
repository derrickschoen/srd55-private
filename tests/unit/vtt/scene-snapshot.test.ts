import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { combatToken } from '../../../src/combat/combatant';
import { createEncounter } from '../../../src/combat/encounter';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import {
  REFERENCE_FIGHTER_ID, REFERENCE_MONSTER_ID, referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import {
  canonicalTokenIdentityIndex, groundAnchor, groundCenter, sceneSnapshot,
} from '../../../src/vtt/handoff/scene-snapshot';
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

function sizedSnapshot(size: 'Large' | 'Huge' | 'Gargantuan', squeezed = false) {
  const setup = referenceEncounterSetup();
  const base = setup.combatants.find((profile) => profile.id === REFERENCE_FIGHTER_ID);
  if (base?.kind !== 'player_character') throw new Error('Missing reference fighter.');
  const profile = { ...base, rules: { ...base.rules, sizeCategory: size } };
  const created = createEncounter({
    bounds: setup.bounds, combatants: [profile],
    tokens: [combatToken(profile, { column: 1, row: 1 })],
  });
  if (squeezed && size !== 'Large') throw new Error('Squeezed fixture supports Large only.');
  const state = squeezed
    ? {
        ...created,
        tokens: created.tokens.map((token) => ({
          ...token, placementMode: { kind: 'squeezed' as const, actual: 'Large' as const, sizedFor: 'Medium' as const },
        })),
      }
    : created;
  const projection = projectDmBoard({ view: projectDmView(state), coordinator: IDLE, controllers: [], history: [] });
  return sceneSnapshot({
    sceneId: 'scene:sizes', projection, art: REFERENCE_ENCOUNTER_ART,
    tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
  }).snapshot.tokens[0];
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
    const result = sceneSnapshot({
      sceneId: 'scene:two-room', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    expect(projection.combatants.every((combatant) => !('tokenId' in combatant))).toBe(true);
    const canonicalId = String(state.tokens.find((token) => token.combatantId === REFERENCE_FIGHTER_ID)?.id);
    expect(result.snapshot.tokens.map((token) => token.id)).toContain(canonicalId);
    expect(result.snapshot.tokens.some((token) => token.id === String(REFERENCE_FIGHTER_ID))).toBe(false);
    const hiddenCanonicalIds = state.tokens
      .filter((token) => !projection.combatants.some((combatant) => combatant.id === token.combatantId))
      .map((token) => String(token.id));
    expect(result.snapshot.tokens.every((token) => !hiddenCanonicalIds.includes(token.id))).toBe(true);
    expect(result.snapshot.vision.visible).toEqual(projection.visibleCells.map((cell) => [cell.column, cell.row]));
    expect(result.snapshot.lights.map((light) => light.id)).toEqual(['light:object:object:torch']);
  });

  it('derives real Large, Huge, Gargantuan, and squeezed footprints and ground centres through the adapter', () => {
    const cases = [
      { token: sizedSnapshot('Large'), expected: { footprint: { w: 2, h: 2 }, x: 1.5, y: 1.5, z: 0 } },
      { token: sizedSnapshot('Huge'), expected: { footprint: { w: 3, h: 3 }, x: 2, y: 2, z: 0 } },
      { token: sizedSnapshot('Gargantuan'), expected: { footprint: { w: 4, h: 4 }, x: 2.5, y: 2.5, z: 0 } },
      { token: sizedSnapshot('Large', true), expected: { footprint: { w: 1, h: 1 }, x: 1, y: 1, z: 0 } },
    ];
    for (const { token, expected } of cases) {
      expect(token).toMatchObject(expected);
      if (token === undefined) throw new Error('Missing sized token.');
      expect(groundAnchor({ x: token.x, y: token.y, z: token.z }, token.footprint))
        .toEqual({ column: 1, row: 1 });
    }
  });

  it('removes canonical token identity on a visible-to-hidden player transition', () => {
    const state = fixtureState();
    const binding = { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID };
    const identities = canonicalTokenIdentityIndex(state.tokens);
    const before = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(state, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    const monsterTokenId = String(state.tokens.find((token) => token.combatantId === REFERENCE_MONSTER_ID)?.id);
    expect(before.tokens.map((token) => token.id)).toContain(monsterTokenId);
    const hidden = {
      ...state,
      hiddenCombatants: [{
        combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: '2024' as const,
      }],
    };
    const after = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(hidden, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    expect(after.tokens.map((token) => token.id)).not.toContain(monsterTokenId);
  });

  it('pins projected pending-request JSON and checksum without altering it in the snapshot adapter', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const coordinator = {
      ...IDLE,
      pendingRequest: {
        kind: 'turn' as const,
        requestId: 'request:handoff-baseline',
        encounterRevision: state.revision,
        actorId: REFERENCE_FIGHTER_ID,
        visibleState: view,
        legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
      },
    };
    const projection = projectPlayerBoard(view, coordinator);
    const baseline = '{"actorId":"combatant:fighter","encounterRevision":0,"kind":"turn","legalActions":[{"actor":"combatant:fighter","type":"end_turn"}],"requestId":"request:handoff-baseline"}';
    const canonicalize = (value: unknown) => JSON.stringify(value, (_key, nested: unknown) => {
      if (typeof nested !== 'object' || nested === null || Array.isArray(nested)) return nested;
      return Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right)));
    });
    const before = canonicalize(projection.pendingRequest);
    sceneSnapshot({
      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    const after = canonicalize(projection.pendingRequest);
    expect(before).toBe(baseline);
    expect(after).toBe(before);
    expect(createHash('sha256').update(after).digest('hex'))
      .toBe('9af09dd07be8fae6494e127248114a5067c2aa80483cd2f35d6ef2358d46ae0f');
  });

  it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
    const state = fixtureState();
    const projection = projectDmBoard({ view: projectDmView(state), coordinator: IDLE, controllers: [], history: [] });
    const { snapshot } = sceneSnapshot({
      sceneId: 'scene:two-room', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    const door = snapshot.doors[0];
    expect(door).toMatchObject({ id: 'object:door', wallId: 'wall:door:object:door', open: false });
    expect(snapshot.walls.filter((wall) => wall.id === door?.wallId)).toHaveLength(1);
    expect(snapshot.walls.some((wall) => wall.id.includes('6.5,2.5:6.5,3.5'))).toBe(false);
    expect(snapshot.lights.map((light) => light.id)).toContain('light:environment:reference-hiding-shadow');
    expect(snapshot.vision.mode).toBe('all');
  });

  it('handles isolated, adjacent, multicell, open/closed, and ambiguous door geometry', () => {
    const snapshotFor = (state: ReturnType<typeof fixtureState>) => sceneSnapshot({
      sceneId: 'scene:doors',
      projection: projectDmBoard({ view: projectDmView(state), coordinator: IDLE, controllers: [], history: [] }),
      art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    }).snapshot;
    const base = fixtureState();
    const door = base.worldObjects.find((object) => object.kind === 'door');
    if (door === undefined) throw new Error('Missing door fixture.');

    const isolated = {
      ...base,
      blockedCells: [door.position],
      worldObjects: base.worldObjects.filter((object) => object.kind !== 'barrier'),
    };
    const isolatedSnapshot = snapshotFor(isolated);
    expect(isolatedSnapshot.doors[0]).toMatchObject({ open: false });
    expect(isolatedSnapshot.walls.filter((wall) =>
      wall.id !== isolatedSnapshot.doors[0]?.wallId &&
      (wall.id.includes('5.5,2.5') || wall.id.includes('6.5,3.5')))).toEqual([]);

    const open = {
      ...base,
      worldObjects: base.worldObjects.map((object) => object.kind === 'door'
        ? { ...object, blocking: { movement: false, lineOfSight: false, cover: 'none' as const } }
        : object),
    };
    const openSnapshot = snapshotFor(open);
    expect(openSnapshot.doors[0]).toMatchObject({ open: true });
    expect(openSnapshot.walls.find((wall) => wall.id === openSnapshot.doors[0]?.wallId))
      .toMatchObject({ blocksMovement: false, blocksVision: false });

    const secondCell = { column: door.position.column + 1, row: door.position.row };
    const multicell = {
      ...base,
      worldObjects: base.worldObjects.map((object) => object.kind === 'door'
        ? { ...object, footprint: [object.position, secondCell] }
        : object),
    };
    const multicellSnapshot = snapshotFor(multicell);
    const multicellWall = multicellSnapshot.walls.find(
      (wall) => wall.id === multicellSnapshot.doors[0]?.wallId,
    );
    expect(multicellWall).toMatchObject({
      a: { x: 5.5, y: 2.5 }, b: { x: 7.5, y: 2.5 },
    });

    const ambiguous = {
      ...base,
      worldObjects: [
        ...base.worldObjects,
        { ...door, id: worldObjectId('object:door-duplicate') },
      ],
    };
    expect(() => snapshotFor(ambiguous)).toThrow('AMBIGUOUS_DOOR_GEOMETRY');
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
