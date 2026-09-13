import { z } from 'zod';

const finite = z.number().finite();
const safeInteger = finite.refine(Number.isSafeInteger, 'Expected a safe integer');
const objectValue = z.record(z.string(), z.unknown());
const point2Schema = z.strictObject({ x: finite, y: finite });
const point3Schema = z.strictObject({ x: finite, y: finite, z: finite });
const footprintSchema = z.strictObject({ w: finite, h: finite });
const cellSchema = z.tuple([finite, finite]);

export const sceneTileSchema = z.strictObject({
  id: z.string(), assetId: z.string(), x: finite, y: finite, z: finite,
});
export const scenePropSchema = sceneTileSchema;
export const sceneTokenSchema = z.strictObject({
  id: z.string(), label: z.string(), assetId: z.string(),
  x: finite, y: finite, z: finite, facing: finite, footprint: footprintSchema,
});
export const sceneWallSchema = z.strictObject({
  id: z.string(), a: point2Schema, b: point2Schema, baseZ: finite, height: finite,
  blocksMovement: z.boolean(), blocksVision: z.boolean(), assetId: z.string().optional(),
});
export const sceneDoorSchema = z.strictObject({
  id: z.string(), wallId: z.string(), open: z.boolean(), assetId: z.string().optional(),
});
export const sceneLightSchema = z.strictObject({
  id: z.string(), x: finite, y: finite, z: finite, radius: finite,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/u), intensity: finite, enabled: z.boolean(),
});
export const sceneVisionSchema = z.strictObject({
  mode: z.enum(['all', 'cells']), visible: z.array(cellSchema), explored: z.array(cellSchema),
});

export const sceneSnapshotSchema = z.strictObject({
  sceneId: z.string(), revision: safeInteger,
  grid: z.strictObject({ width: finite, height: finite, feetPerCell: finite }),
  tiles: z.array(sceneTileSchema), props: z.array(scenePropSchema), tokens: z.array(sceneTokenSchema),
  walls: z.array(sceneWallSchema), doors: z.array(sceneDoorSchema), lights: z.array(sceneLightSchema),
  vision: sceneVisionSchema,
});

export type SceneSnapshot = z.infer<typeof sceneSnapshotSchema>;
export type SceneToken = z.infer<typeof sceneTokenSchema>;
export type SceneWall = z.infer<typeof sceneWallSchema>;

export const HANDOFF_METHODS = [
  'session.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set',
] as const;
export type HandoffMethod = (typeof HANDOFF_METHODS)[number];

export const sessionOpenParamsSchema = z.strictObject({
  requestedRole: z.enum(['dm', 'player']), playerId: z.string().optional(),
});
export const sceneSnapshotParamsSchema = z.strictObject({});
export const tokenMoveParamsSchema = z.strictObject({ tokenId: z.string(), to: point3Schema });
export const doorSetParamsSchema = z.strictObject({ doorId: z.string(), open: z.boolean() });
export const lightSetParamsSchema = z.strictObject({ lightId: z.string(), enabled: z.boolean() });

const requestBase = { v: z.literal(1), id: z.string() } as const;
export const genericHandoffRequestSchema = z.strictObject({
  ...requestBase, method: z.string(), params: objectValue,
});
export const handoffRequestSchema = z.discriminatedUnion('method', [
  z.strictObject({ ...requestBase, method: z.literal('session.open'), params: sessionOpenParamsSchema }),
  z.strictObject({ ...requestBase, method: z.literal('scene.snapshot'), params: sceneSnapshotParamsSchema }),
  z.strictObject({ ...requestBase, method: z.literal('token.move'), params: tokenMoveParamsSchema }),
  z.strictObject({ ...requestBase, method: z.literal('door.set'), params: doorSetParamsSchema }),
  z.strictObject({ ...requestBase, method: z.literal('light.set'), params: lightSetParamsSchema }),
]);
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;

export const sessionOpenResultSchema = z.strictObject({
  sessionId: z.string(), capabilities: z.array(z.string()),
});
export const mutationResultSchema = z.strictObject({ revision: safeInteger });
export const sceneSnapshotResultSchema = sceneSnapshotSchema;

export const handoffErrorSchema = z.strictObject({ code: z.string(), message: z.string() });
export const handoffSuccessSchema = z.strictObject({
  v: z.literal(1), id: z.string(), ok: z.literal(true), result: objectValue,
});
export const handoffFailureSchema = z.strictObject({
  v: z.literal(1), id: z.string(), ok: z.literal(false), error: handoffErrorSchema,
});
export const handoffResponseSchema = z.union([handoffSuccessSchema, handoffFailureSchema]);
export const handoffEventSchema = z.strictObject({
  v: z.literal(1), event: z.literal('scene.snapshot'), seq: safeInteger, data: sceneSnapshotSchema,
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
