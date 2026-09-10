import Ajv2020, { type AnySchema, type ErrorObject } from 'ajv/dist/2020.js';
import {
  artRequestSchema, artResultSchema, genericHandoffRequestSchema, handoffRequestSchema,
  sceneSnapshotSchema, type ArtRequest, type ArtResult, type SceneSnapshot,
} from './contracts';

export interface SemanticIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export function validateJsonSchema(schema: AnySchema, value: unknown): readonly ErrorObject[] {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  return validate(value) ? [] : [...(validate.errors ?? [])];
}

export function parseGenericRequest(value: unknown) {
  return genericHandoffRequestSchema.parse(value);
}

export function parseKnownRequest(value: unknown) {
  return handoffRequestSchema.parse(value);
}

function duplicateIssues(values: readonly string[], path: string, code: string): SemanticIssue[] {
  const seen = new Set<string>();
  const issues: SemanticIssue[] = [];
  for (const value of values) {
    if (seen.has(value)) issues.push({ code, path, message: `Duplicate ${value}` });
    seen.add(value);
  }
  return issues;
}

export function sceneSnapshotSemanticIssues(value: SceneSnapshot): readonly SemanticIssue[] {
  const ids = [...value.tiles, ...value.props, ...value.tokens, ...value.walls, ...value.doors, ...value.lights]
    .map((entity) => entity.id);
  const issues = duplicateIssues(ids, '$', 'DUPLICATE_ENTITY_ID');
  const wallIds = new Set(value.walls.map((wall) => wall.id));
  for (const [index, door] of value.doors.entries()) {
    if (!wallIds.has(door.wallId)) issues.push({
      code: 'UNKNOWN_DOOR_WALL', path: `$.doors[${String(index)}].wallId`, message: door.wallId,
    });
  }
  return issues;
}

function portableRelative(path: string): boolean {
  return path.length > 0 && !path.startsWith('/') && !path.startsWith('\\') &&
    !/^[A-Za-z]:/u.test(path) && !path.split(/[\\/]/u).includes('..');
}

function resolvedView(request: ArtRequest, result: ArtResult, frame: ArtResult['assets'][number]['frames'][number]): string | null {
  if (frame.view !== undefined) return frame.view;
  if (request.views.length === 1) return request.views[0] ?? null;
  const matches = result.provenance.frameViews?.filter((entry) => entry.path === frame.albedo) ?? [];
  return matches.length === 1 ? matches[0]?.view ?? null : null;
}

export function artSemanticIssues(requestValue: unknown, resultValue: unknown): readonly SemanticIssue[] {
  const request = artRequestSchema.parse(requestValue);
  const result = artResultSchema.parse(resultValue);
  const issues: SemanticIssue[] = [];
  if (request.requestId !== result.requestId) issues.push({ code: 'REQUEST_ID_MISMATCH', path: '$.requestId', message: result.requestId });
  issues.push(...duplicateIssues(request.views, '$.views', 'DUPLICATE_VIEW'));
  issues.push(...duplicateIssues(request.passes, '$.passes', 'DUPLICATE_PASS'));
  issues.push(...duplicateIssues(result.assets.map((asset) => asset.assetId), '$.assets', 'DUPLICATE_ASSET_ID'));
  const imagePaths: string[] = [];
  const frameKeys: string[] = [];
  for (const [assetIndex, asset] of result.assets.entries()) {
    for (const [frameIndex, frame] of asset.frames.entries()) {
      const view = resolvedView(request, result, frame);
      if (view === null) issues.push({ code: 'UNRESOLVED_FRAME_VIEW', path: `$.assets[${String(assetIndex)}].frames[${String(frameIndex)}]`, message: frame.albedo });
      else frameKeys.push(`${asset.assetId}\0${view}\0${String(frame.facing)}\0${String(frame.frameIndex)}`);
      imagePaths.push(frame.albedo);
      if (frame.normal !== undefined) imagePaths.push(frame.normal);
      if (frame.emissive !== undefined) imagePaths.push(frame.emissive);
      if (!request.passes.includes('normal') && frame.normal !== undefined) issues.push({ code: 'UNREQUESTED_PASS', path: '$.assets', message: 'normal' });
      if (!request.passes.includes('emissive') && frame.emissive !== undefined) issues.push({ code: 'UNREQUESTED_PASS', path: '$.assets', message: 'emissive' });
    }
  }
  issues.push(...duplicateIssues(frameKeys, '$.assets', 'DUPLICATE_FRAME'));
  const expectedPaths = [...new Set([...imagePaths, ...result.provenance.sourceFiles])].sort();
  const recordedPaths = result.provenance.files.map((entry) => entry.path).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(recordedPaths)) issues.push({ code: 'PROVENANCE_PATH_SET_MISMATCH', path: '$.provenance.files', message: 'Hash paths must exactly match images and sources.' });
  for (const [index, entry] of result.provenance.files.entries()) {
    if (!/^[a-f0-9]{64}$/u.test(entry.sha256)) issues.push({ code: 'INVALID_SHA256', path: `$.provenance.files[${String(index)}].sha256`, message: entry.sha256 });
    if (!portableRelative(entry.path)) issues.push({ code: 'NON_RELATIVE_PATH', path: `$.provenance.files[${String(index)}].path`, message: entry.path });
  }
  for (const [index, path] of [...imagePaths, ...result.provenance.sourceFiles].entries()) {
    if (!portableRelative(path)) issues.push({ code: 'NON_RELATIVE_PATH', path: `$.paths[${String(index)}]`, message: path });
    const name = path.split(/[\\/]/u).at(-1) ?? '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-/u.test(name)) {
      issues.push({ code: 'UUID_FILENAME_REQUIRED', path: `$.paths[${String(index)}]`, message: path });
    }
  }
  return issues;
}

export function parseSceneSnapshot(value: unknown): SceneSnapshot {
  const snapshot = sceneSnapshotSchema.parse(value);
  const issues = sceneSnapshotSemanticIssues(snapshot);
  if (issues.length > 0) throw new Error(`${issues[0]?.code}: ${issues[0]?.message}`);
  return snapshot;
}
