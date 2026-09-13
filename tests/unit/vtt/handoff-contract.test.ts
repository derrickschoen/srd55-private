import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import {
  artRequestSchema, artResultSchema, genericHandoffRequestSchema, handoffEventSchema,
  handoffFailureSchema, handoffRequestSchema, handoffSuccessSchema, mutationResultSchema,
  handoffResponseSchema, sceneSnapshotSchema, sessionOpenResultSchema,
  type ArtRequest, type ArtResult, type SceneSnapshot,
} from '../../../src/vtt/handoff/v1/contracts';
import {
  artSemanticIssues, sceneSnapshotSemanticIssues, validateJsonSchema,
} from '../../../src/vtt/handoff/v1/validation';

interface ProtocolDocument {
  readonly $schema: string;
  readonly $defs: Readonly<Record<string, object>>;
}

const protocolSchema = JSON.parse(
  readFileSync('contracts/vtt-handoff/v1/protocol.schema.json', 'utf8'),
) as ProtocolDocument;
const artSchema = JSON.parse(readFileSync('contracts/vtt-handoff/v1/art.schema.json', 'utf8')) as object;

function protocolDefinition(name: string): object {
  return { $schema: protocolSchema.$schema, $ref: `#/$defs/${name}`, $defs: protocolSchema.$defs };
}

function expectRejected(
  runtime: { safeParse(value: unknown): { readonly success: boolean } },
  schema: object,
  value: unknown,
): void {
  expect(runtime.safeParse(value).success).toBe(false);
  expect(validateJsonSchema(schema, value)).not.toEqual([]);
}

const snapshot: SceneSnapshot = {
  sceneId: '',
  revision: -1,
  grid: { width: -2.5, height: 0, feetPerCell: -5 },
  tiles: [{ id: '', assetId: '', x: -0.5, y: 0, z: 0 }],
  props: [],
  tokens: [{
    id: 'token:a', label: '', assetId: '', x: 0, y: -1.5, z: 0,
    facing: -90.5, footprint: { w: 0, h: -2 },
  }],
  walls: [{
    id: 'wall:a', a: { x: 0, y: 0 }, b: { x: 1.5, y: 0 }, baseZ: -1, height: 0,
    blocksMovement: true, blocksVision: false,
  }],
  doors: [{ id: 'door:a', wallId: 'wall:a', open: false }],
  lights: [{
    id: 'light:a', x: 0, y: 0, z: -1, color: '#aBc123', intensity: -0.5, radius: 0, enabled: false,
  }],
  vision: { mode: 'cells', visible: [[-1.5, 0]], explored: [] },
};

const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';
const request: ArtRequest = {
  schemaVersion: 1,
  requestId,
  assetId: 'asset:a',
  brief: '',
  views: ['top-down'],
  passes: ['albedo'],
  pixelsPerCell: -1.5,
  footprint: { w: 0, h: -2 },
};
const image = `bundle/${requestId}__token.png`;
const source = `bundle/${requestId}__source.blend`;
const result: ArtResult = {
  schemaVersion: 1,
  requestId,
  status: 'complete',
  assets: [{
    assetId: 'asset:a', footprint: { w: 0, h: -1 }, heightCells: -2.5, pixelsPerCell: 0,
    frames: [{
      facing: -45.5, frameIndex: -1, width: 0, height: -2,
      pivotPx: [-1, 0.5], albedo: image,
    }],
  }],
  provenance: {
    sourceFiles: [source],
    files: [{ path: image, sha256: 'a'.repeat(64) }, { path: source, sha256: 'b'.repeat(64) }],
    normalMapConvention: 'none', tool: '', notes: '',
  },
  errors: [''],
};

describe('VTT handoff v1 contracts', () => {
  it('accepts the owner examples for every request, result, response, and event in Zod and Ajv', () => {
    const requests = [
      { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } },
      { v: 1, id: '', method: 'scene.snapshot', params: {} },
      { v: 1, id: '', method: 'token.move', params: { tokenId: '', to: { x: -1, y: 0.5, z: 0 } } },
      { v: 1, id: '', method: 'door.set', params: { doorId: '', open: false } },
      { v: 1, id: '', method: 'light.set', params: { lightId: '', enabled: true } },
    ] as const;
    const definitions = [
      'sessionOpenRequest', 'sceneSnapshotRequest', 'tokenMoveRequest', 'doorSetRequest', 'lightSetRequest',
    ] as const;
    for (const [index, value] of requests.entries()) {
      expect(genericHandoffRequestSchema.safeParse(value).success).toBe(true);
      expect(handoffRequestSchema.safeParse(value).success).toBe(true);
      expect(validateJsonSchema(protocolSchema, value)).toEqual([]);
      expect(validateJsonSchema(protocolDefinition(definitions[index] ?? ''), value)).toEqual([]);
    }
    const sessionResult = { sessionId: '', capabilities: ['', 'scene.snapshot'] };
    const mutationResult = { revision: -1 };
    const success = { v: 1, id: '', ok: true, result: sessionResult };
    const failure = { v: 1, id: '', ok: false, error: { code: '', message: '' } };
    const event = { v: 1, event: 'scene.snapshot', seq: -1, data: snapshot };
    expect(sessionOpenResultSchema.safeParse(sessionResult).success).toBe(true);
    expect(mutationResultSchema.safeParse(mutationResult).success).toBe(true);
    expect(handoffSuccessSchema.safeParse(success).success).toBe(true);
    expect(handoffFailureSchema.safeParse(failure).success).toBe(true);
    expect(handoffEventSchema.safeParse(event).success).toBe(true);
    for (const value of [snapshot, success, failure, event]) {
      expect(validateJsonSchema(protocolSchema, value)).toEqual([]);
    }
    expect(validateJsonSchema(protocolDefinition('sessionOpenResult'), sessionResult)).toEqual([]);
    expect(validateJsonSchema(protocolDefinition('mutationResult'), mutationResult)).toEqual([]);
  });

  it('has matching strictness, boundaries, colors, optional assets, and generic unknown-method behavior', () => {
    const generic = { v: 1, id: '', method: 'extension.future', params: { future: true } };
    expect(genericHandoffRequestSchema.safeParse(generic).success).toBe(true);
    expect(handoffRequestSchema.safeParse(generic).success).toBe(false);
    expect(validateJsonSchema(protocolSchema, generic)).toEqual([]);

    for (const invalid of [
      { ...snapshot, revision: Number.MAX_SAFE_INTEGER + 1 },
      { ...snapshot, grid: { ...snapshot.grid, width: Number.POSITIVE_INFINITY } },
      { ...snapshot, surprise: true },
      { ...snapshot, lights: [{ ...snapshot.lights[0], color: '' }] },
      { ...snapshot, vision: { ...snapshot.vision, visible: [{ x: 1, y: 2 }] } },
      { ...snapshot, schemaVersion: 1 },
    ]) expectRejected(sceneSnapshotSchema, protocolDefinition('sceneSnapshot'), invalid);

    expectRejected(genericHandoffRequestSchema, protocolDefinition('request'), {
      schemaVersion: 1, id: '', method: 'scene.snapshot', params: {},
    });
    const invalidKnown = [
      ['sessionOpenRequest', { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm', extra: true } }],
      ['sceneSnapshotRequest', { v: 1, id: '', method: 'scene.snapshot', params: { sceneId: '' } }],
      ['tokenMoveRequest', { v: 1, id: '', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0 }, revision: 0 } }],
      ['doorSetRequest', { v: 1, id: '', method: 'door.set', params: { doorId: '' } }],
      ['lightSetRequest', { v: 1, id: '', method: 'light.set', params: { lightId: '', enabled: true, sceneId: '' } }],
    ] as const;
    for (const [definition, invalid] of invalidKnown) {
      expectRejected(handoffRequestSchema, protocolDefinition(definition), invalid);
    }
    expectRejected(handoffResponseSchema, protocolDefinition('success'), { v: 1, id: '', ok: true, result: 1 });
    expectRejected(handoffResponseSchema, protocolDefinition('failure'), {
      v: 1, id: '', ok: false, error: { code: '', message: '', details: {} },
    });
    expectRejected(handoffEventSchema, protocolDefinition('event'), {
      v: 1, event: 'scene.snapshot', seq: 0, snapshot,
    });
    expectRejected(sessionOpenResultSchema, protocolDefinition('sessionOpenResult'), {
      sessionId: '', capabilities: [], extra: true,
    });
    expectRejected(mutationResultSchema, protocolDefinition('mutationResult'), {
      revision: Number.MAX_SAFE_INTEGER + 1,
    });
    for (const optionalAssets of [
      { ...snapshot, walls: [{ ...snapshot.walls[0], assetId: '' }] },
      { ...snapshot, doors: [{ ...snapshot.doors[0], assetId: '' }] },
    ]) {
      expect(sceneSnapshotSchema.safeParse(optionalAssets).success).toBe(true);
      expect(validateJsonSchema(protocolDefinition('sceneSnapshot'), optionalAssets)).toEqual([]);
    }
  });

  it('keeps art structure separate from complete request-bound delivery semantics', () => {
    expect(artRequestSchema.parse(request)).toEqual(request);
    expect(artResultSchema.parse(result)).toEqual(result);
    expect(validateJsonSchema(artSchema, request)).toEqual([]);
    expect(validateJsonSchema(artSchema, result)).toEqual([]);
    expect(artSemanticIssues(request, result)).toEqual([]);

    const semanticCases: readonly [string, ArtRequest, ArtResult][] = [
      ['REQUEST_ID_UUIDV7_REQUIRED', { ...request, requestId: requestId.replace('-7abc-', '-6abc-') }, result],
      ['REQUEST_ID_MISMATCH', request, { ...result, requestId: requestId.replace(/.$/u, 'c') }],
      ['ASSET_ID_MISMATCH', request, { ...result, assets: [{ ...result.assets[0]!, assetId: 'asset:b' }] }],
      ['UNREQUESTED_VIEW', request, { ...result, assets: [{ ...result.assets[0]!, frames: [{ ...result.assets[0]!.frames[0]!, view: 'isometric' }] }] }],
      ['UNREQUESTED_PASS', request, { ...result, assets: [{ ...result.assets[0]!, frames: [{ ...result.assets[0]!.frames[0]!, normal: `bundle/${requestId}__normal.png` }] }], provenance: { ...result.provenance, files: [...result.provenance.files, { path: `bundle/${requestId}__normal.png`, sha256: 'c'.repeat(64) }] } }],
      ['MISSING_REQUESTED_PASS', { ...request, passes: ['albedo', 'normal'] }, result],
      ['MISSING_REQUESTED_VIEW', { ...request, views: ['top-down', 'isometric'] }, result],
      ['UNKNOWN_FRAME_VIEW_PATH', request, { ...result, provenance: { ...result.provenance, frameViews: [{ path: `bundle/${requestId}__missing.png`, view: 'top-down' }] } }],
      ['REQUEST_BOUND_UUIDV7_FILENAME_REQUIRED', request, { ...result, assets: [{ ...result.assets[0]!, frames: [{ ...result.assets[0]!.frames[0]!, albedo: `bundle/${requestId}-token.png` }] }], provenance: { ...result.provenance, files: [{ path: `bundle/${requestId}-token.png`, sha256: 'a'.repeat(64) }, result.provenance.files[1]!] } }],
      ['REQUEST_BOUND_UUIDV7_FILENAME_REQUIRED', request, { ...result, assets: [{ ...result.assets[0]!, frames: [{ ...result.assets[0]!.frames[0]!, albedo: `bundle/018f47a2-7b3c-7abc-8def-0123456789ac__token.png` }] }], provenance: { ...result.provenance, files: [{ path: `bundle/018f47a2-7b3c-7abc-8def-0123456789ac__token.png`, sha256: 'a'.repeat(64) }, result.provenance.files[1]!] } }],
    ];
    for (const [code, artRequest, artResult] of semanticCases) {
      expect(artRequestSchema.safeParse(artRequest).success).toBe(true);
      expect(artResultSchema.safeParse(artResult).success).toBe(true);
      expect(artSemanticIssues(artRequest, artResult).map((issue) => issue.code)).toContain(code);
    }
  });

  it('requires complete art deliveries to cover the asset, every view, and every pass per frame', () => {
    const emptyComplete: ArtResult = {
      ...result, assets: [], provenance: { ...result.provenance, sourceFiles: [], files: [] },
    };
    expect(artResultSchema.safeParse(emptyComplete).success).toBe(true);
    expect(artSemanticIssues(request, emptyComplete).map((issue) => issue.code))
      .toContain('MISSING_REQUESTED_ASSET');

    const secondAlbedo = `bundle/${requestId}__token-2.png`;
    const firstNormal = `bundle/${requestId}__token-1-normal.png`;
    const mixedRequest: ArtRequest = { ...request, passes: ['albedo', 'normal'] };
    const mixed: ArtResult = {
      ...result,
      assets: [{
        ...result.assets[0]!,
        frames: [
          { ...result.assets[0]!.frames[0]!, frameIndex: 0, albedo: image, normal: firstNormal },
          { ...result.assets[0]!.frames[0]!, facing: 90, frameIndex: 1, albedo: secondAlbedo },
        ],
      }],
      provenance: {
        ...result.provenance,
        files: [
          { path: image, sha256: 'a'.repeat(64) },
          { path: firstNormal, sha256: 'b'.repeat(64) },
          { path: secondAlbedo, sha256: 'c'.repeat(64) },
          { path: source, sha256: 'd'.repeat(64) },
        ],
      },
    };
    expect(artResultSchema.safeParse(mixed).success).toBe(true);
    expect(artSemanticIssues(mixedRequest, mixed)).toContainEqual({
      code: 'MISSING_REQUESTED_PASS',
      path: '$.assets[0].frames[1].normal',
      message: 'normal',
    });

    for (const status of ['partial', 'blocked'] as const) {
      const incomplete: ArtResult = {
        ...emptyComplete, status,
      };
      expect(artResultSchema.safeParse(incomplete).success).toBe(true);
      expect(artSemanticIssues(request, incomplete)).toEqual([]);
    }
  });

  it('rejects semantic-only broken references while preserving structural acceptance', () => {
    const brokenDoor = { ...snapshot, doors: [{ ...snapshot.doors[0]!, wallId: 'missing' }] };
    expect(sceneSnapshotSchema.safeParse(brokenDoor).success).toBe(true);
    expect(validateJsonSchema(protocolSchema, brokenDoor)).toEqual([]);
    expect(sceneSnapshotSemanticIssues(brokenDoor).map((issue) => issue.code)).toContain('UNKNOWN_DOOR_WALL');
  });
});
