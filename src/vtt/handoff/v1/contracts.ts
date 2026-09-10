import { z } from 'zod';

const finite = z.number().finite();
const sequence = finite.refine(Number.isSafeInteger, 'Expected a safe integer');
const vector3Schema = z.strictObject({ x: finite, y: finite, z: finite });
const footprintSchema = z.strictObject({ w: finite, h: finite });

export const sceneTileSchema = z.strictObject({
  id: z.string(), assetId: z.string(), x: finite, y: finite, z: finite,
});
export const scenePropSchema = z.strictObject({
  id: z.string(), assetId: z.string(), x: finite, y: finite, z: finite,
});
export const sceneTokenSchema = z.strictObject({
  id: z.string(), name: z.string(), assetId: z.string(),
  x: finite, y: finite, z: finite, facing: finite, footprint: footprintSchema,
});
export const sceneWallSchema = z.strictObject({
  id: z.string(), from: vector3Schema, to: vector3Schema,
  baseZ: finite, height: finite, blocksMovement: z.boolean(), blocksVision: z.boolean(),
});
export const sceneDoorSchema = z.strictObject({
  id: z.string(), wallId: z.string(), assetId: z.string(), open: z.boolean(),
});
export const sceneLightSchema = z.strictObject({
  id: z.string(), x: finite, y: finite, z: finite,
  color: z.string(), intensity: finite, radius: finite, enabled: z.boolean(),
});
export const sceneVisionSchema = z.strictObject({
  mode: z.enum(['all', 'cells']),
  visible: z.array(z.strictObject({ x: finite, y: finite })),
  explored: z.array(z.strictObject({ x: finite, y: finite })),
});

export const sceneSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sceneId: z.string(),
  revision: sequence,
  grid: z.strictObject({ width: finite, height: finite, feetPerCell: finite }),
  tiles: z.array(sceneTileSchema),
  props: z.array(scenePropSchema),
  tokens: z.array(sceneTokenSchema),
  walls: z.array(sceneWallSchema),
  doors: z.array(sceneDoorSchema),
  lights: z.array(sceneLightSchema),
  vision: sceneVisionSchema,
});

export type SceneSnapshot = z.infer<typeof sceneSnapshotSchema>;
export type SceneToken = z.infer<typeof sceneTokenSchema>;
export type SceneWall = z.infer<typeof sceneWallSchema>;

export const HANDOFF_METHODS = [
  'scene.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set',
] as const;
export type HandoffMethod = (typeof HANDOFF_METHODS)[number];

const sceneOpenParamsSchema = z.strictObject({
  requestedRole: z.enum(['dm', 'player']),
  playerId: z.string().optional(),
});
const sceneSnapshotParamsSchema = z.strictObject({ sceneId: z.string() });
const mutationBase = {
  sceneId: z.string(), revision: sequence, mutationId: z.string(),
} as const;
const tokenMoveParamsSchema = z.strictObject({
  ...mutationBase, tokenId: z.string(), to: vector3Schema,
});
const doorSetParamsSchema = z.strictObject({
  ...mutationBase, doorId: z.string(), open: z.boolean(),
});
const lightSetParamsSchema = z.strictObject({
  ...mutationBase, lightId: z.string(), enabled: z.boolean(),
});

export const genericHandoffRequestSchema = z.strictObject({
  schemaVersion: z.literal(1), id: z.string(), method: z.string(), params: z.record(z.string(), z.unknown()),
});
export const handoffRequestSchema = z.discriminatedUnion('method', [
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), method: z.literal('scene.open'), params: sceneOpenParamsSchema }),
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), method: z.literal('scene.snapshot'), params: sceneSnapshotParamsSchema }),
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), method: z.literal('token.move'), params: tokenMoveParamsSchema }),
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), method: z.literal('door.set'), params: doorSetParamsSchema }),
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), method: z.literal('light.set'), params: lightSetParamsSchema }),
]);
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;

export const handoffErrorSchema = z.strictObject({
  code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional(),
});
export const handoffResponseSchema = z.union([
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), ok: z.literal(true), result: z.unknown() }),
  z.strictObject({ schemaVersion: z.literal(1), id: z.string(), ok: z.literal(false), error: handoffErrorSchema }),
]);
export const handoffEventSchema = z.strictObject({
  schemaVersion: z.literal(1), seq: sequence, event: z.literal('scene.snapshot'), snapshot: sceneSnapshotSchema,
});

export const artViewSchema = z.enum(['top-down', 'isometric']);
export const artPassSchema = z.enum(['albedo', 'normal', 'emissive']);
const artFootprintSchema = z.strictObject({ w: finite, h: finite });
export const artRequestSchema = z.strictObject({
  schemaVersion: z.literal(1), requestId: z.string(), assetId: z.string(), brief: z.string(),
  views: z.array(artViewSchema), passes: z.array(artPassSchema), pixelsPerCell: finite,
  footprint: artFootprintSchema,
});
export const artFrameSchema = z.strictObject({
  facing: finite, frameIndex: finite, view: artViewSchema.optional(), width: finite, height: finite,
  pivotPx: z.tuple([finite, finite]), albedo: z.string(), normal: z.string().optional(), emissive: z.string().optional(),
});
export const artAssetSchema = z.strictObject({
  assetId: z.string(), footprint: artFootprintSchema, heightCells: finite,
  pixelsPerCell: finite, frames: z.array(artFrameSchema),
});
export const artProvenanceSchema = z.strictObject({
  sourceFiles: z.array(z.string()),
  files: z.array(z.strictObject({ path: z.string(), sha256: z.string() })),
  frameViews: z.array(z.strictObject({ path: z.string(), view: artViewSchema })).optional(),
  normalMapConvention: z.enum(['opengl-positive-y', 'directx-negative-y', 'none']),
  tool: z.string(), notes: z.string(),
});
export const artResultSchema = z.strictObject({
  schemaVersion: z.literal(1), requestId: z.string(),
  status: z.enum(['complete', 'partial', 'blocked']), assets: z.array(artAssetSchema),
  provenance: artProvenanceSchema, errors: z.array(z.string()),
});

export type ArtRequest = z.infer<typeof artRequestSchema>;
export type ArtResult = z.infer<typeof artResultSchema>;
export type ArtView = z.infer<typeof artViewSchema>;
