export interface Point2 { readonly x: number; readonly y: number }
export interface Point3 extends Point2 { readonly z: number }
export interface Footprint { readonly w: number; readonly h: number }
export interface PlacedAsset extends Point3 { readonly id: string; readonly assetId: string }
export interface SceneToken extends PlacedAsset {
  readonly label: string;
  readonly facing: number;
  readonly footprint: Footprint;
}
export interface SceneWall {
  readonly id: string;
  readonly a: Point2;
  readonly b: Point2;
  readonly baseZ: number;
  readonly height: number;
  readonly blocksMovement: boolean;
  readonly blocksVision: boolean;
  readonly assetId?: string;
}
export interface SceneDoor {
  readonly id: string;
  readonly wallId: string;
  readonly open: boolean;
  readonly assetId?: string;
}
export interface SceneLight extends Point3 {
  readonly id: string;
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
  readonly enabled: boolean;
}
export type VisionCell = readonly [number, number];
export interface SceneSnapshot {
  readonly sceneId: string;
  readonly revision: number;
  readonly grid: { readonly width: number; readonly height: number; readonly feetPerCell: number };
  readonly tiles: readonly PlacedAsset[];
  readonly props: readonly PlacedAsset[];
  readonly tokens: readonly SceneToken[];
  readonly walls: readonly SceneWall[];
  readonly doors: readonly SceneDoor[];
  readonly lights: readonly SceneLight[];
  readonly vision: {
    readonly mode: 'all' | 'cells';
    readonly visible: readonly VisionCell[];
    readonly explored: readonly VisionCell[];
  };
}

export interface HandoffRequest<M extends string = string, P extends object = object> {
  readonly v: 1;
  readonly id: string;
  readonly method: M;
  readonly params: P;
}
export type SessionOpenRequest = HandoffRequest<'session.open', {
  readonly requestedRole: 'dm' | 'player';
  readonly playerId?: string;
}>;
export type SceneSnapshotRequest = HandoffRequest<'scene.snapshot', Record<string, never>>;
export type TokenMoveRequest = HandoffRequest<'token.move', { readonly tokenId: string; readonly to: Point3 }>;
export type DoorSetRequest = HandoffRequest<'door.set', { readonly doorId: string; readonly open: boolean }>;
export type LightSetRequest = HandoffRequest<'light.set', { readonly lightId: string; readonly enabled: boolean }>;
export type KnownHandoffRequest =
  | SessionOpenRequest | SceneSnapshotRequest | TokenMoveRequest | DoorSetRequest | LightSetRequest;
export type HandoffMethod = KnownHandoffRequest['method'];

export interface SessionOpenResult { readonly sessionId: string; readonly capabilities: readonly string[] }
export interface MutationResult { readonly revision: number }
export interface HandoffSuccess<R extends object = object> {
  readonly v: 1;
  readonly id: string;
  readonly ok: true;
  readonly result: R;
}
export interface HandoffFailure {
  readonly v: 1;
  readonly id: string;
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string };
}
export type HandoffResponse<R extends object = object> = HandoffSuccess<R> | HandoffFailure;
export interface SceneSnapshotEvent {
  readonly v: 1;
  readonly event: 'scene.snapshot';
  readonly seq: number;
  readonly data: SceneSnapshot;
}

export type ArtView = 'top-down' | 'isometric';
export type ArtPass = 'albedo' | 'normal' | 'emissive';
export interface ArtRequest {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly assetId: string;
  readonly brief: string;
  readonly views: readonly ArtView[];
  readonly passes: readonly ArtPass[];
  readonly pixelsPerCell: number;
  readonly footprint: Footprint;
}
export interface ArtFrame {
  readonly facing: number;
  readonly frameIndex: number;
  readonly view?: ArtView;
  readonly width: number;
  readonly height: number;
  readonly pivotPx: readonly [number, number];
  readonly albedo: string;
  readonly normal?: string;
  readonly emissive?: string;
}
export interface ArtAsset {
  readonly assetId: string;
  readonly footprint: Footprint;
  readonly heightCells: number;
  readonly pixelsPerCell: number;
  readonly frames: readonly ArtFrame[];
}
export interface ArtProvenance {
  readonly sourceFiles: readonly string[];
  readonly files: readonly { readonly path: string; readonly sha256: string }[];
  readonly frameViews?: readonly { readonly path: string; readonly view: ArtView }[];
  readonly normalMapConvention: 'opengl-positive-y' | 'directx-negative-y' | 'none';
  readonly tool: string;
  readonly notes: string;
}
export interface ArtResult {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly status: 'complete' | 'partial' | 'blocked';
  readonly assets: readonly ArtAsset[];
  readonly provenance: ArtProvenance;
  readonly errors: readonly string[];
}
