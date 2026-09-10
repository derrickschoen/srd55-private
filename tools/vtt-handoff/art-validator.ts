import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  artRequestSchema, artResultSchema, type ArtRequest, type ArtResult, type ArtView,
} from '../../src/vtt/handoff/v1/contracts.ts';
import { artSemanticIssues } from '../../src/vtt/handoff/v1/validation.ts';
import {
  readAnchoredFile, safeRelativeComponents, type AnchoredFile, type SafeFileHooks,
} from './safe-files.ts';
import { validatePng, type ValidatedPng } from './png-validator.ts';

export const ART_FILE_LIMIT = 64 * 1024 * 1024;
export const ART_BUNDLE_LIMIT = 256 * 1024 * 1024;
const JSON_LIMIT = 1024 * 1024;
const TRANSPARENT_ASSETS = new Set([
  'prop.barrel', 'prop.table', 'prop.pillar', 'prop.torch', 'token.adventurer', 'token.goblin',
]);
const OPAQUE_ALLOWED_ASSETS = new Set(['tile.stone.floor', 'wall.stone', 'door.wood']);
const FACINGS = [0, 90, 180, 270] as const;
const ALLOWED_FACINGS: ReadonlySet<number> = new Set(FACINGS);

export interface ValidatedArtFile {
  readonly declaredPath: string;
  readonly rootRelativePath: string;
  readonly file: AnchoredFile;
  readonly png: ValidatedPng | null;
}

export interface ValidatedArtResult {
  readonly request: ArtRequest;
  readonly result: ArtResult;
  readonly requestFile: AnchoredFile;
  readonly resultFile: AnchoredFile;
  readonly resultRelativePath: string;
  readonly bundleRelativeDirectory: string;
  readonly files: readonly ValidatedArtFile[];
  readonly totalBytes: number;
}

export interface ArtValidationHooks {
  readonly afterManifestRead?: () => void;
  readonly beforeFileRead?: (declaredPath: string) => void;
  readonly safeFileHooks?: SafeFileHooks;
}

function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
  return resolve(value);
}

function parseJson(bytes: Buffer, label: string): unknown {
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    throw new Error(`ART_JSON_INVALID: ${label}`);
  }
}

function resolveInsideBundle(bundleRelativeDirectory: string, declaredPath: string): string {
  safeRelativeComponents(declaredPath);
  const combined = bundleRelativeDirectory === '.' ? declaredPath : `${bundleRelativeDirectory}/${declaredPath}`;
  safeRelativeComponents(combined);
  return combined;
}

function viewFor(request: ArtRequest, result: ArtResult, frame: ArtResult['assets'][number]['frames'][number]): ArtView {
  if (frame.view !== undefined) return frame.view;
  if (request.views.length === 1 && request.views[0] !== undefined) return request.views[0];
  const matches = result.provenance.frameViews?.filter((entry) => entry.path === frame.albedo) ?? [];
  if (matches.length !== 1 || matches[0] === undefined) throw new Error(`ART_FRAME_VIEW_UNRESOLVED: ${frame.albedo}`);
  return matches[0].view;
}

function requireResultSemantics(request: ArtRequest, result: ArtResult): void {
  const issues = artSemanticIssues(request, result);
  if (issues.length > 0) throw new Error(`ART_SEMANTIC_${issues[0]?.code}: ${issues[0]?.message ?? ''}`);
  if (result.status !== 'complete') throw new Error('ART_RESULT_NOT_COMPLETE');
  if (result.errors.length !== 0) throw new Error('ART_COMPLETE_RESULT_HAS_ERRORS');
  if (!OPAQUE_ALLOWED_ASSETS.has(request.assetId) && !TRANSPARENT_ASSETS.has(request.assetId)) {
    throw new Error(`ART_ASSET_ID_UNSUPPORTED: ${request.assetId}`);
  }
  if (new Set(result.provenance.sourceFiles).size !== result.provenance.sourceFiles.length) {
    throw new Error('ART_DUPLICATE_SOURCE_PATH');
  }
  if (result.provenance.files.length > 4_096) throw new Error('ART_FILE_COUNT_LIMIT');
  const provenancePaths = result.provenance.files.map((entry) => entry.path);
  if (new Set(provenancePaths).size !== provenancePaths.length) throw new Error('ART_DUPLICATE_PROVENANCE_PATH');
  for (const asset of result.assets) {
    if (asset.pixelsPerCell !== request.pixelsPerCell || asset.footprint.w !== request.footprint.w || asset.footprint.h !== request.footprint.h) {
      throw new Error('ART_ASSET_SCALE_MISMATCH');
    }
    const imagePaths = asset.frames.flatMap((frame) => [frame.albedo, frame.normal, frame.emissive])
      .filter((path): path is string => path !== undefined);
    if (new Set(imagePaths).size !== imagePaths.length) throw new Error('ART_DUPLICATE_IMAGE_PATH');
    for (const view of request.views) {
      const frames = asset.frames.filter((frame) => viewFor(request, result, frame) === view);
      const facings = new Set(frames.map((frame) => frame.facing));
      if (FACINGS.some((facing) => !facings.has(facing)) || [...facings].some((facing) => !ALLOWED_FACINGS.has(facing))) {
        throw new Error(`ART_FACING_SET_MISMATCH: ${view}`);
      }
    }
  }
}

export function validateArtResult(options: {
  readonly handoffRoot?: string;
  readonly resultRelativePath: string;
  readonly hooks?: ArtValidationHooks;
}): ValidatedArtResult {
  const root = configuredRoot(options.handoffRoot);
  safeRelativeComponents(options.resultRelativePath);
  const location = options.resultRelativePath.match(/^art\/inbox\/([0-9a-f-]+)\.result\.json$/u);
  if (location?.[1] === undefined) throw new Error('ART_RESULT_LOCATION_INVALID');
  const resultFile = readAnchoredFile(root, options.resultRelativePath, JSON_LIMIT, options.hooks?.safeFileHooks);
  const result = artResultSchema.parse(parseJson(resultFile.bytes, options.resultRelativePath));
  const resultName = options.resultRelativePath.split('/').at(-1);
  if (resultName !== `${result.requestId}.result.json`) throw new Error('ART_RESULT_FILENAME_MISMATCH');
  if (location[1] !== result.requestId) throw new Error('ART_RESULT_DIRECTORY_ID_MISMATCH');
  const requestRelativePath = `art/outbox/${result.requestId}.request.json`;
  const requestFile = readAnchoredFile(root, requestRelativePath, JSON_LIMIT, options.hooks?.safeFileHooks);
  const request = artRequestSchema.parse(parseJson(requestFile.bytes, requestRelativePath));
  requireResultSemantics(request, result);
  options.hooks?.afterManifestRead?.();

  // Owner-agreed S9 layout: manifest at art/inbox/<uuid>.result.json and payloads below art/inbox/<uuid>/.
  const bundleRelativeDirectory = `art/inbox/${result.requestId}`;
  const records = new Map<string, ValidatedArtFile>();
  let totalBytes = 0;
  for (const provenance of result.provenance.files) {
    options.hooks?.beforeFileRead?.(provenance.path);
    const rootRelativePath = resolveInsideBundle(bundleRelativeDirectory, provenance.path);
    const file = readAnchoredFile(root, rootRelativePath, ART_FILE_LIMIT, options.hooks?.safeFileHooks);
    totalBytes += file.identity.size;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > ART_BUNDLE_LIMIT) throw new Error('ART_BUNDLE_SIZE_LIMIT');
    if (file.identity.sha256 !== provenance.sha256) throw new Error(`ART_PROVENANCE_HASH_MISMATCH: ${provenance.path}`);
    records.set(provenance.path, { declaredPath: provenance.path, rootRelativePath, file, png: null });
  }
  for (const asset of result.assets) {
    for (const frame of asset.frames) {
      const albedoRecord = records.get(frame.albedo);
      if (albedoRecord === undefined) throw new Error(`ART_IMAGE_UNRECORDED: ${frame.albedo}`);
      const albedo = validatePng(albedoRecord.file.bytes);
      records.set(frame.albedo, { ...albedoRecord, png: albedo });
      if (albedo.width !== frame.width || albedo.height !== frame.height) throw new Error('ART_FRAME_DIMENSION_MISMATCH');
      if (frame.pivotPx[0] !== frame.width / 2 || frame.pivotPx[1] !== frame.height) throw new Error('ART_GROUND_CENTRE_PIVOT_REQUIRED');
      if (TRANSPARENT_ASSETS.has(asset.assetId) && !albedo.hasTransparency) throw new Error(`ART_TRANSPARENCY_REQUIRED: ${asset.assetId}`);
      for (const path of [frame.normal, frame.emissive]) {
        if (path === undefined) continue;
        const record = records.get(path);
        if (record === undefined) throw new Error(`ART_IMAGE_UNRECORDED: ${path}`);
        const png = validatePng(record.file.bytes);
        records.set(path, { ...record, png });
        if (png.width !== albedo.width || png.height !== albedo.height) throw new Error(`ART_PASS_DIMENSION_MISMATCH: ${path}`);
      }
    }
  }
  return {
    request, result, requestFile, resultFile, resultRelativePath: options.resultRelativePath,
    bundleRelativeDirectory, files: [...records.values()], totalBytes,
  };
}

function completedResultPaths(root: string): readonly string[] {
  const inbox = join(root, 'art', 'inbox');
  if (!existsSync(inbox)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(inbox, { withFileTypes: true })) {
    const absolute = join(inbox, entry.name);
    if (entry.isSymbolicLink() && entry.name.endsWith('.result.json')) {
      throw new Error(`ART_RESULT_SYMLINK_REFUSED: ${entry.name}`);
    }
    if (entry.isFile() && entry.name.endsWith('.result.json') && !entry.name.includes('.partial')) {
      if (!lstatSync(absolute).isFile()) throw new Error(`ART_RESULT_REGULAR_FILE_REQUIRED: ${entry.name}`);
      found.push(relative(root, absolute).split('\\').join('/'));
    }
  }
  return found.sort();
}

export interface ArtResultListing {
  readonly resultPath: string;
  readonly requestId: string | null;
  readonly assetId: string | null;
  readonly status: 'complete' | 'partial' | 'blocked' | 'invalid';
  readonly validation: 'VALID' | 'INVALID';
  readonly completedAsset: boolean;
  readonly reason: string | null;
}

export function listArtResults(options: { readonly handoffRoot?: string } = {}): readonly ArtResultListing[] {
  const root = configuredRoot(options.handoffRoot);
  return completedResultPaths(root).map((resultPath): ArtResultListing => {
    let requestId: string | null = null;
    let assetId: string | null = null;
    let status: ArtResultListing['status'] = 'invalid';
    try {
      const resultFile = readAnchoredFile(root, resultPath, JSON_LIMIT);
      const result = artResultSchema.parse(parseJson(resultFile.bytes, resultPath));
      requestId = result.requestId;
      status = result.status;
      if (resultPath !== `art/inbox/${result.requestId}.result.json`) throw new Error('ART_RESULT_FILENAME_MISMATCH');
      const requestPath = `art/outbox/${result.requestId}.request.json`;
      const request = artRequestSchema.parse(parseJson(readAnchoredFile(root, requestPath, JSON_LIMIT).bytes, requestPath));
      assetId = request.assetId;
      if (request.requestId !== result.requestId) throw new Error('ART_REQUEST_ID_MISMATCH');
      if (result.status === 'complete') validateArtResult({ handoffRoot: root, resultRelativePath: resultPath });
      else {
        const issues = artSemanticIssues(request, result);
        if (issues.length > 0) throw new Error(`ART_SEMANTIC_${issues[0]?.code ?? 'INVALID'}`);
      }
      return {
        resultPath, requestId, assetId, status,
        validation: 'VALID', completedAsset: result.status === 'complete', reason: null,
      };
    } catch (error) {
      return {
        resultPath, requestId, assetId, status, validation: 'INVALID',
        completedAsset: false, reason: error instanceof Error ? error.message : 'ART_RESULT_INVALID',
      };
    }
  });
}

export function validateCompletedArtResults(options: { readonly handoffRoot?: string } = {}): readonly ValidatedArtResult[] {
  const root = configuredRoot(options.handoffRoot);
  const listings = listArtResults({ handoffRoot: root });
  const invalid = listings.find((entry) => entry.validation === 'INVALID');
  if (invalid !== undefined) throw new Error(`ART_RESULT_LIST_INVALID: ${invalid.resultPath}: ${invalid.reason ?? ''}`);
  return listings.filter((entry) => entry.status === 'complete').map((entry) =>
    validateArtResult({ handoffRoot: root, resultRelativePath: entry.resultPath }));
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  if (process.argv.includes('--list')) {
    process.stdout.write(`${JSON.stringify({ results: listArtResults() }, null, 2)}\n`);
  } else {
    const results = validateCompletedArtResults();
    process.stdout.write(`${JSON.stringify({ status: 'validated', completedResults: results.length }, null, 2)}\n`);
  }
}
