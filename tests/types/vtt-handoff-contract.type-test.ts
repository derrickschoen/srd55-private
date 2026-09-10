import type {
  ArtRequest, ArtResult, DoorSetRequest, HandoffFailure, HandoffSuccess, LightSetRequest,
  MutationResult, SceneSnapshot, SceneSnapshotEvent, SceneSnapshotRequest, SessionOpenRequest,
  SessionOpenResult, TokenMoveRequest,
} from '../../contracts/vtt-handoff/v1/contracts';

declare const snapshot: SceneSnapshot;
const open: SessionOpenRequest = { v: 1, id: '', method: 'session.open', params: { requestedRole: 'player', playerId: '' } };
const getSnapshot: SceneSnapshotRequest = { v: 1, id: '', method: 'scene.snapshot', params: {} };
const move: TokenMoveRequest = { v: 1, id: '', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0 } } };
const door: DoorSetRequest = { v: 1, id: '', method: 'door.set', params: { doorId: '', open: false } };
const light: LightSetRequest = { v: 1, id: '', method: 'light.set', params: { lightId: '', enabled: true } };
const session: SessionOpenResult = { sessionId: '', capabilities: [] };
const mutation: MutationResult = { revision: 0 };
const success: HandoffSuccess<SessionOpenResult> = { v: 1, id: '', ok: true, result: session };
const snapshotSuccess: HandoffSuccess<SceneSnapshot> = { v: 1, id: '', ok: true, result: snapshot };
const mutationSuccess: HandoffSuccess<MutationResult> = { v: 1, id: '', ok: true, result: mutation };
const failure: HandoffFailure = { v: 1, id: '', ok: false, error: { code: '', message: '' } };
const event: SceneSnapshotEvent = { v: 1, event: 'scene.snapshot', seq: 0, data: snapshot };
declare const artRequest: ArtRequest;
declare const artResult: ArtResult;

void [
  open, getSnapshot, move, door, light, mutation, success, snapshotSuccess,
  mutationSuccess, failure, event, artRequest, artResult,
];
