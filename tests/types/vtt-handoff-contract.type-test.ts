import type {
  ArtRequest as PublishedArtRequest,
  ArtResult as PublishedArtResult,
  DoorSetRequest,
  HandoffFailure,
  HandoffSuccess,
  LightSetRequest,
  MutationResult,
  SceneSnapshot as PublishedSceneSnapshot,
  SceneSnapshotEvent,
  SceneSnapshotRequest,
  SessionOpenRequest,
  SessionOpenResult,
  TokenMoveRequest,
} from '../../contracts/vtt-handoff/v1/contracts';
import type {
  ArtRequest as RuntimeArtRequest,
  ArtResult as RuntimeArtResult,
  SceneSnapshot as RuntimeSceneSnapshot,
} from '../../src/vtt/handoff/v1/contracts';

type DeepMutable<Value> =
  Value extends readonly [infer First, infer Second]
    ? [DeepMutable<First>, DeepMutable<Second>]
    : Value extends readonly (infer Item)[]
      ? DeepMutable<Item>[]
      : Value extends object
        ? { -readonly [Key in keyof Value]: DeepMutable<Value[Key]> }
        : Value;
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;
type Assert<Condition extends true> = Condition;

type SceneDeclarationMatchesRuntime = Assert<
  Equal<DeepMutable<PublishedSceneSnapshot>, RuntimeSceneSnapshot>
>;
type ArtRequestDeclarationMatchesRuntime = Assert<
  Equal<DeepMutable<PublishedArtRequest>, RuntimeArtRequest>
>;
type ArtResultDeclarationMatchesRuntime = Assert<
  Equal<DeepMutable<PublishedArtResult>, RuntimeArtResult>
>;

const snapshot: PublishedSceneSnapshot = {
  sceneId: 'scene:consumer-literal',
  revision: 7,
  grid: { width: 12, height: 8, feetPerCell: 5 },
  tiles: [{ id: 'tile:0:0', assetId: 'tile.stone.floor', x: 0, y: 0, z: 0 }],
  props: [{ id: 'prop:table', assetId: 'prop.table', x: 2, y: 3, z: 0 }],
  tokens: [{
    id: 'token:hero', label: 'Hero', assetId: 'token.adventurer',
    x: 2.5, y: 3.5, z: 0, facing: 90, footprint: { w: 2, h: 2 },
  }],
  walls: [
    {
      id: 'wall:without-asset', a: { x: 0, y: 0 }, b: { x: 1, y: 0 },
      baseZ: 0, height: 1, blocksMovement: true, blocksVision: true,
    },
    {
      id: 'wall:with-asset', a: { x: 1, y: 0 }, b: { x: 2, y: 0 },
      baseZ: 0, height: 1, blocksMovement: false, blocksVision: false, assetId: 'wall.stone',
    },
  ],
  doors: [
    { id: 'door:without-asset', wallId: 'wall:without-asset', open: false },
    { id: 'door:with-asset', wallId: 'wall:with-asset', open: true, assetId: 'door.wood' },
  ],
  lights: [{
    id: 'light:torch', x: 3, y: 4, z: 1, radius: 6,
    color: '#A1B2C3', intensity: 0.5, enabled: true,
  }],
  vision: { mode: 'cells', visible: [[1, 2]], explored: [[1, 2], [2, 2]] },
};

const artRequest: PublishedArtRequest = {
  schemaVersion: 1,
  requestId: '018f47a2-7b3c-7abc-8def-0123456789ab',
  assetId: 'token.adventurer',
  brief: 'Independent consumer literal',
  views: ['top-down', 'isometric'],
  passes: ['albedo', 'normal', 'emissive'],
  pixelsPerCell: 128,
  footprint: { w: 1, h: 1 },
};
const artResultWithOptionals: PublishedArtResult = {
  schemaVersion: 1,
  requestId: artRequest.requestId,
  status: 'complete',
  assets: [{
    assetId: artRequest.assetId,
    footprint: { w: 1, h: 1 },
    heightCells: 1,
    pixelsPerCell: 128,
    frames: [
      {
        facing: 0, frameIndex: 0, width: 128, height: 128,
        pivotPx: [64, 96], albedo: 'bundle/albedo.png',
      },
      {
        facing: 90, frameIndex: 1, view: 'isometric', width: 128, height: 128,
        pivotPx: [64, 96], albedo: 'bundle/albedo-iso.png',
        normal: 'bundle/normal-iso.png', emissive: 'bundle/emissive-iso.png',
      },
    ],
  }],
  provenance: {
    sourceFiles: ['bundle/source.blend'],
    files: [{ path: 'bundle/source.blend', sha256: '0'.repeat(64) }],
    frameViews: [{ path: 'bundle/albedo.png', view: 'top-down' }],
    normalMapConvention: 'opengl-positive-y',
    tool: 'consumer',
    notes: '',
  },
  errors: [],
};
const artResultWithoutOptionals: PublishedArtResult = {
  schemaVersion: 1,
  requestId: artRequest.requestId,
  status: 'partial',
  assets: [{
    assetId: artRequest.assetId,
    footprint: { w: 1, h: 1 },
    heightCells: 1,
    pixelsPerCell: 128,
    frames: [{
      facing: 0, frameIndex: 0, width: 128, height: 128,
      pivotPx: [64, 96], albedo: 'bundle/albedo.png',
    }],
  }],
  provenance: {
    sourceFiles: [],
    files: [],
    normalMapConvention: 'none',
    tool: '',
    notes: '',
  },
  errors: ['pending'],
};

const open: SessionOpenRequest = {
  v: 1, id: '', method: 'session.open', params: { requestedRole: 'player', playerId: '' },
};
const getSnapshot: SceneSnapshotRequest = { v: 1, id: '', method: 'scene.snapshot', params: {} };
const move: TokenMoveRequest = {
  v: 1, id: '', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0 } },
};
const door: DoorSetRequest = { v: 1, id: '', method: 'door.set', params: { doorId: '', open: false } };
const light: LightSetRequest = {
  v: 1, id: '', method: 'light.set', params: { lightId: '', enabled: true },
};
const session: SessionOpenResult = { sessionId: '', capabilities: [] };
const mutation: MutationResult = { revision: 0 };
const success: HandoffSuccess<SessionOpenResult> = { v: 1, id: '', ok: true, result: session };
const snapshotSuccess: HandoffSuccess<PublishedSceneSnapshot> = {
  v: 1, id: '', ok: true, result: snapshot,
};
const mutationSuccess: HandoffSuccess<MutationResult> = {
  v: 1, id: '', ok: true, result: mutation,
};
const failure: HandoffFailure = { v: 1, id: '', ok: false, error: { code: '', message: '' } };
const event: SceneSnapshotEvent = { v: 1, event: 'scene.snapshot', seq: 0, data: snapshot };

void [
  snapshot, artRequest, artResultWithOptionals, artResultWithoutOptionals,
  open, getSnapshot, move, door, light, mutation, success, snapshotSuccess,
  mutationSuccess, failure, event,
];
void (null as SceneDeclarationMatchesRuntime | ArtRequestDeclarationMatchesRuntime |
  ArtResultDeclarationMatchesRuntime | null);
