import { describe, expect, it } from 'vitest';
import { combatToken } from '../../../src/combat/combatant';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { createEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import {
  armorClass, encounterBranchId, encounterSessionId, worldObjectId,
} from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import {
  REFERENCE_FIGHTER_ID, REFERENCE_MONSTER_ID, referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import {
  canonicalTokenIdentityIndex, groundAnchor, groundCenter, sceneSnapshot,
} from '../../../src/vtt/handoff/scene-snapshot';
import { logicalAssetId } from '../../../src/vtt/handoff/asset-id-map';
import {
  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

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
  const projection = projectDmBoard({
    view: projectDmView(state),
    coordinator: IDLE,
    controllers: [],
    history: [],
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  return sceneSnapshot({
    sceneId: 'scene:sizes', projection, art: REFERENCE_ENCOUNTER_ART,
    tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
  }).snapshot.tokens[0];
}

interface PersistedByteBaseline {
  readonly pendingRequestHash: string;
  readonly coordinatorHash: string;
  readonly revisionChecksum: string;
}

function persistedRevisionChecksum(
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): string {
  const store = new MemoryBrowserSessionStore();
  const sessionId = encounterSessionId('session:handoff-persistence-baseline');
  EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId('branch:handoff-persistence-baseline'),
    encounterState: state,
    coordinatorState,
    controllers: [],
    rng: mulberry32(16_603),
    store,
    mirror: new MemoryMirrorSink(),
  });
  const revision = store.revisions(sessionId)[0];
  if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
  return revision.checksum;
}

function persistedByteBaseline(
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): PersistedByteBaseline {
  if (coordinatorState.pendingRequest === null) throw new Error('PERSISTENCE_BASELINE_REQUEST_MISSING');
  return {
    pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
    coordinatorHash: sha256(canonicalJson(coordinatorState)),
    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
  };
}

function assertPersistedHandoffBytesUnchanged(
  expected: PersistedByteBaseline,
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): void {
  const actual = persistedByteBaseline(state, coordinatorState);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error('PERSISTED_HANDOFF_BYTES_CHANGED');
  }
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

  it('preserves full persisted request/coordinator bytes and the actual revision checksum', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const coordinator: PersistedCoordinatorState = {
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
    const before = persistedByteBaseline(state, coordinator);
    const projection = projectPlayerBoard(view, coordinator);
    sceneSnapshot({
      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    const after = persistedByteBaseline(state, coordinator);
    expect(before).toEqual({
      pendingRequestHash: 'a0e19e534b070ffc1a82b2f303588573578852bc75720abd780af7e749e0d44a',
      coordinatorHash: '336fc59733a7f90a51b0cb1dbe95ce690a411ef0dab428fc5ef3c9f1e5344f22',
      revisionChecksum: '519a01b4fdcc4f02bf8f8c925c8ec70acd09443924944bac454dcb293a751d3d',
    });
    expect(coordinator.pendingRequest).toMatchObject({
      kind: 'turn',
      requestId: 'request:handoff-baseline',
      encounterRevision: 0,
      actorId: 'combatant:fighter',
      legalActions: { actions: [{ type: 'end_turn', actor: 'combatant:fighter' }] },
    });
    expect(coordinator.pendingRequest?.visibleState).toBe(view);
    expect(coordinator.pendingRequest?.visibleState !== undefined &&
      'tokenIdentityByCombatant' in coordinator.pendingRequest.visibleState).toBe(false);
    expect(after).toEqual(before);
    assertPersistedHandoffBytesUnchanged(before, state, coordinator);

    if (coordinator.pendingRequest === null) throw new Error('PERSISTENCE_CONTROL_REQUEST_MISSING');
    const enrichedRequest = {
      ...coordinator.pendingRequest,
      visibleState: {
        ...coordinator.pendingRequest.visibleState,
        tokenIdentityByCombatant: { [String(REFERENCE_FIGHTER_ID)]: 'token:fighter' },
      },
    };
    const enrichedCoordinator: PersistedCoordinatorState = {
      ...coordinator,
      pendingRequest: enrichedRequest,
    };
    expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
      .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
  });

  it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
    const state = fixtureState();
    const projection = projectDmBoard({
      view: projectDmView(state),
      coordinator: IDLE,
      controllers: [],
      history: [],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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

  it('uses the object-position north edge for adjacent and multicell doors, open and closed', () => {
    const snapshotFor = (state: ReturnType<typeof fixtureState>) => sceneSnapshot({
      sceneId: 'scene:doors',
      projection: projectDmBoard({
        view: projectDmView(state),
        coordinator: IDLE,
        controllers: [],
        history: [],
        offerEnvironment: OFFER_ENVIRONMENT,
      }),
      art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    }).snapshot;
    const base = fixtureState();
    const door = base.worldObjects.find((object) => object.kind === 'door');
    if (door === undefined) throw new Error('Missing door fixture.');

    for (const open of [false, true]) {
      const northAdjacent = {
        ...base,
        blockedCells: [{ column: door.position.column, row: door.position.row - 1 }],
        worldObjects: base.worldObjects
          .filter((object) => object.kind !== 'barrier')
          .map((object) => object.kind === 'door'
            ? {
                ...object,
                blocking: open
                  ? { movement: false, lineOfSight: false, cover: 'none' as const }
                  : { movement: true, lineOfSight: true, cover: 'total' as const },
              }
            : object),
      };
      const snapshot = snapshotFor(northAdjacent);
      const projectedDoor = snapshot.doors[0];
      const companion = snapshot.walls.find((wall) => wall.id === projectedDoor?.wallId);
      expect(projectedDoor).toMatchObject({ open });
      expect(companion).toMatchObject({
        a: { x: 5.5, y: 2.5 }, b: { x: 6.5, y: 2.5 },
        blocksMovement: !open, blocksVision: !open,
      });
      expect(snapshot.walls.filter((wall) =>
        wall.id !== companion?.id &&
        wall.a.x === 5.5 && wall.a.y === 2.5 && wall.b.x === 6.5 && wall.b.y === 2.5)).toEqual([]);
    }

    const secondCell = { column: door.position.column + 1, row: door.position.row };
    const multicell = {
      ...base,
      blockedCells: [
        { column: door.position.column, row: door.position.row - 1 },
        { column: secondCell.column, row: secondCell.row - 1 },
      ],
      worldObjects: base.worldObjects.map((object) => object.kind === 'door'
        ? { ...object, footprint: [object.position, secondCell] }
        : object),
    };
    const multicellSnapshot = snapshotFor(multicell);
    const multicellWall = multicellSnapshot.walls.find(
      (wall) => wall.id === multicellSnapshot.doors[0]?.wallId,
    );
    expect(multicellWall).toMatchObject({
      a: { x: 5.5, y: 2.5 }, b: { x: 6.5, y: 2.5 },
    });
    expect(multicellSnapshot.walls.filter((wall) =>
      wall.id !== multicellWall?.id &&
      wall.a.x === 5.5 && wall.a.y === 2.5 && wall.b.x === 6.5 && wall.b.y === 2.5)).toEqual([]);

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
