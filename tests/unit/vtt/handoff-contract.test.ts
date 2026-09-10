import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import {
  artRequestSchema, artResultSchema, genericHandoffRequestSchema, handoffRequestSchema,
  sceneSnapshotSchema, type ArtRequest, type ArtResult, type SceneSnapshot,
} from '../../../src/vtt/handoff/v1/contracts';
import {
  artSemanticIssues, sceneSnapshotSemanticIssues, validateJsonSchema,
} from '../../../src/vtt/handoff/v1/validation';

const protocolSchema = JSON.parse(readFileSync('contracts/vtt-handoff/v1/protocol.schema.json', 'utf8')) as object;
const artSchema = JSON.parse(readFileSync('contracts/vtt-handoff/v1/art.schema.json', 'utf8')) as object;

const snapshot: SceneSnapshot = {
  schemaVersion: 1,
  sceneId: '',
  revision: -1,
  grid: { width: -2.5, height: 0, feetPerCell: -5 },
  tiles: [{ id: '', assetId: '', x: -0.5, y: 0, z: 0 }],
  props: [],
  tokens: [{ id: 'token:a', name: '', assetId: '', x: 0, y: -1.5, z: 0, facing: -90.5, footprint: { w: 0, h: -2 } }],
  walls: [{ id: 'wall:a', from: { x: 0, y: 0, z: -1 }, to: { x: 1.5, y: 0, z: -1 }, baseZ: -1, height: 0, blocksMovement: true, blocksVision: false }],
  doors: [{ id: 'door:a', wallId: 'wall:a', assetId: '', open: false }],
  lights: [{ id: 'light:a', x: 0, y: 0, z: -1, color: '', intensity: -0.5, radius: 0, enabled: false }],
  vision: { mode: 'cells', visible: [{ x: -1.5, y: 0 }], explored: [] },
};

const request: ArtRequest = {
  schemaVersion: 1,
  requestId: '',
  assetId: '',
  brief: '',
  views: ['top-down'],
  passes: ['albedo'],
  pixelsPerCell: -1.5,
  footprint: { w: 0, h: -2 },
};
const image = 'bundle/018f47a2-7b3c-7abc-8def-0123456789ab-token.png';
const source = 'bundle/018f47a2-7b3c-7abc-8def-0123456789ab-source.blend';
const result: ArtResult = {
  schemaVersion: 1,
  requestId: '',
  status: 'complete',
  assets: [{ assetId: '', footprint: { w: 0, h: -1 }, heightCells: -2.5, pixelsPerCell: 0, frames: [{ facing: -45.5, frameIndex: -1, width: 0, height: -2, pivotPx: [-1, 0.5], albedo: image }] }],
  provenance: {
    sourceFiles: [source],
    files: [{ path: image, sha256: 'a'.repeat(64) }, { path: source, sha256: 'b'.repeat(64) }],
    normalMapConvention: 'none', tool: '', notes: '',
  },
  errors: [''],
};

describe('VTT handoff v1 contracts', () => {
  it('keeps plain strings, finite numbers, safe revision and strict objects', () => {
    expect(sceneSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(validateJsonSchema(protocolSchema, snapshot)).toEqual([]);
    expect(() => sceneSnapshotSchema.parse({ ...snapshot, revision: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => sceneSnapshotSchema.parse({ ...snapshot, grid: { ...snapshot.grid, width: Number.POSITIVE_INFINITY } })).toThrow();
    expect(() => sceneSnapshotSchema.parse({ ...snapshot, surprise: true })).toThrow();
  });

  it('accepts unknown methods generically but requires exact known parameters', () => {
    const unknown = { schemaVersion: 1, id: '', method: '', params: {} };
    expect(genericHandoffRequestSchema.parse(unknown)).toEqual(unknown);
    expect(handoffRequestSchema.safeParse(unknown).success).toBe(false);
    expect(handoffRequestSchema.parse({ schemaVersion: 1, id: '', method: 'light.set', params: { sceneId: '', revision: -1, mutationId: '', lightId: '', enabled: false } }).method).toBe('light.set');
  });

  it('keeps art image fields as paths and agrees with draft-2020-12 structure', () => {
    expect(artRequestSchema.parse(request)).toEqual(request);
    expect(artResultSchema.parse(result)).toEqual(result);
    expect(validateJsonSchema(artSchema, request)).toEqual([]);
    expect(validateJsonSchema(artSchema, result)).toEqual([]);
    expect(artSemanticIssues(request, result)).toEqual([]);
  });

  it('separates semantic failures from structural parsing', () => {
    const brokenDoor = { ...snapshot, doors: [{ ...snapshot.doors[0]!, wallId: 'missing' }] };
    expect(sceneSnapshotSchema.safeParse(brokenDoor).success).toBe(true);
    expect(sceneSnapshotSemanticIssues(brokenDoor).map((issue) => issue.code)).toContain('UNKNOWN_DOOR_WALL');
    const wrongHash = { ...result, provenance: { ...result.provenance, files: [{ path: image, sha256: 'A'.repeat(64) }, { path: source, sha256: 'b'.repeat(64) }] } };
    expect(artResultSchema.safeParse(wrongHash).success).toBe(true);
    expect(artSemanticIssues(request, wrongHash).map((issue) => issue.code)).toContain('INVALID_SHA256');
  });
});
