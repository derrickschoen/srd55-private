import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { artRequestSchema, artResultSchema } from '../../src/vtt/handoff/v1/contracts.ts';
import { artSemanticIssues } from '../../src/vtt/handoff/v1/validation.ts';
import { validateArtResult, validateCompletedArtResults, type ValidatedArtResult } from './art-validator.ts';
import {
  createAnchoredDirectoryExclusive, createAnchoredFileExclusive, ensureAnchoredDirectory,
  promoteAnchoredPartial, readAnchoredFile, safeRelativeComponents, sameFileIdentity,
  type SafeFileHooks,
} from './safe-files.ts';

const ART_STAGE_FILE_LIMIT = 64 * 1024 * 1024;

export interface ArtStageHooks {
  readonly afterInitialValidation?: (validated: ValidatedArtResult) => void;
  readonly afterCopy?: (declaredPath: string) => void;
  readonly beforeFinalValidation?: () => void;
  readonly beforeManifest?: () => void;
  readonly beforePromotion?: (destinationPath: string) => void;
  readonly safeFileHooks?: SafeFileHooks;
}

export interface ArtStageResult {
  readonly requestId: string;
  readonly reviewDirectory: string;
  readonly manifest: string;
  readonly files: number;
}

function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
  return resolve(value);
}

function json(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function createStagedFile(
  root: string,
  relativePath: string,
  bytes: Buffer,
  nonce: string,
  beforePromotion?: (destinationPath: string) => void,
): void {
  const components = safeRelativeComponents(relativePath);
  const filename = components.at(-1);
  if (filename === undefined) throw new Error('STAGE_PATH_INVALID');
  const parent = components.slice(0, -1).join('/');
  if (parent.length > 0) ensureAnchoredDirectory(root, parent);
  const partial = `${relativePath}.partial.${nonce}`;
  const written = createAnchoredFileExclusive(root, partial, bytes);
  const checked = readAnchoredFile(root, partial, bytes.length);
  if (written.sha256 !== checked.identity.sha256 || !checked.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
  promoteAnchoredPartial(root, partial, relativePath, beforePromotion);
  const final = readAnchoredFile(root, relativePath, bytes.length);
  if (final.identity.sha256 !== written.sha256 || !final.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
}

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const reviewManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: z.string(),
  requestSha256: sha256Schema,
  resultSha256: sha256Schema,
  files: z.array(z.strictObject({
    path: z.string(), sha256: sha256Schema,
    size: z.number().int().nonnegative().max(ART_STAGE_FILE_LIMIT),
  })),
  totalBytes: z.number().int().nonnegative(),
});

function requireStagedPayload(
  root: string,
  relativePath: string,
  expected: Buffer,
  code: string,
): void {
  const staged = readAnchoredFile(root, relativePath, Math.max(expected.length, 1024 * 1024));
  if (staged.identity.sha256 !== sha256(expected) || !staged.bytes.equals(expected)) throw new Error(code);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function matchingValidation(before: ValidatedArtResult, after: ValidatedArtResult): boolean {
  if (!sameFileIdentity(before.requestFile.identity, after.requestFile.identity) ||
    !sameFileIdentity(before.resultFile.identity, after.resultFile.identity) ||
    before.files.length !== after.files.length) return false;
  const afterFiles = new Map(after.files.map((entry) => [entry.declaredPath, entry.file.identity]));
  return before.files.every((entry) => {
    const later = afterFiles.get(entry.declaredPath);
    return later !== undefined && sameFileIdentity(entry.file.identity, later);
  });
}

export function stageArtResult(options: {
  readonly handoffRoot?: string;
  readonly resultRelativePath: string;
  readonly nonce?: () => string;
  readonly hooks?: ArtStageHooks;
}): ArtStageResult {
  const root = configuredRoot(options.handoffRoot);
  const validationHooks = options.hooks?.safeFileHooks === undefined
    ? {}
    : { safeFileHooks: options.hooks.safeFileHooks };
  const validated = validateArtResult({
    handoffRoot: root, resultRelativePath: options.resultRelativePath,
    hooks: validationHooks,
  });
  options.hooks?.afterInitialValidation?.(validated);
  ensureAnchoredDirectory(root, 'art/review');
  const reviewDirectory = `art/review/${validated.request.requestId}`;
  createAnchoredDirectoryExclusive(root, reviewDirectory);
  const nonce = (options.nonce ?? (() => randomBytes(8).toString('hex')))();
  createStagedFile(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, nonce, options.hooks?.beforePromotion);
  createStagedFile(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, nonce, options.hooks?.beforePromotion);
  for (const entry of validated.files) {
    createStagedFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, entry.file.bytes, nonce, options.hooks?.beforePromotion);
    options.hooks?.afterCopy?.(entry.declaredPath);
  }
  options.hooks?.beforeFinalValidation?.();
  const revalidated = validateArtResult({
    handoffRoot: root, resultRelativePath: options.resultRelativePath,
    hooks: validationHooks,
  });
  if (!matchingValidation(validated, revalidated)) throw new Error('STAGE_SOURCE_CHANGED');
  options.hooks?.beforeManifest?.();
  requireStagedPayload(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, 'STAGE_REQUEST_COPY_MISMATCH');
  requireStagedPayload(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, 'STAGE_RESULT_COPY_MISMATCH');
  for (const entry of validated.files) {
    const staged = readAnchoredFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, ART_STAGE_FILE_LIMIT);
    if (staged.identity.sha256 !== entry.file.identity.sha256 || !staged.bytes.equals(entry.file.bytes)) {
      throw new Error(`STAGE_POSTCOPY_MISMATCH: ${entry.declaredPath}`);
    }
  }
  const manifest = `${reviewDirectory}/review-manifest.json`;
  createStagedFile(root, manifest, json({
    schemaVersion: 1,
    requestId: validated.request.requestId,
    requestSha256: validated.requestFile.identity.sha256,
    resultSha256: validated.resultFile.identity.sha256,
    files: validated.files.map((entry) => ({ path: entry.declaredPath, sha256: entry.file.identity.sha256, size: entry.file.identity.size })),
    totalBytes: validated.totalBytes,
  }), nonce, options.hooks?.beforePromotion);
  return { requestId: validated.request.requestId, reviewDirectory, manifest, files: validated.files.length };
}

function verifyReview(root: string, reviewId: string): void {
  const directory = `art/review/${reviewId}`;
  let manifestInput: unknown;
  try {
    manifestInput = JSON.parse(
      readAnchoredFile(root, `${directory}/review-manifest.json`, 1024 * 1024).bytes.toString('utf8'),
    ) as unknown;
  } catch {
    throw new Error('REVIEW_MANIFEST_INVALID');
  }
  const parsedManifest = reviewManifestSchema.safeParse(manifestInput);
  if (!parsedManifest.success) throw new Error('REVIEW_MANIFEST_INVALID');
  const manifest = parsedManifest.data;
  if (manifest.requestId !== reviewId) throw new Error('REVIEW_MANIFEST_ID_MISMATCH');
  const requestFile = readAnchoredFile(root, `${directory}/request.json`, 1024 * 1024);
  const resultFile = readAnchoredFile(root, `${directory}/result.json`, 1024 * 1024);
  if (requestFile.identity.sha256 !== manifest.requestSha256) throw new Error('REVIEW_REQUEST_HASH_MISMATCH');
  if (resultFile.identity.sha256 !== manifest.resultSha256) throw new Error('REVIEW_RESULT_HASH_MISMATCH');
  const request = artRequestSchema.parse(JSON.parse(requestFile.bytes.toString('utf8')) as unknown);
  const result = artResultSchema.parse(JSON.parse(resultFile.bytes.toString('utf8')) as unknown);
  if (request.requestId !== reviewId || result.requestId !== reviewId || result.status !== 'complete') {
    throw new Error('REVIEW_IDENTITY_MISMATCH');
  }
  const issues = artSemanticIssues(request, result);
  if (issues.length > 0) throw new Error(`REVIEW_SEMANTIC_${issues[0]?.code ?? 'INVALID'}`);
  const expectedPaths = [...result.provenance.files.map((entry) => entry.path)].sort();
  const manifestPaths = [...manifest.files.map((entry) => entry.path)].sort();
  if (new Set(manifestPaths).size !== manifestPaths.length || JSON.stringify(expectedPaths) !== JSON.stringify(manifestPaths)) {
    throw new Error('REVIEW_FILE_SET_MISMATCH');
  }
  let totalBytes = 0;
  for (const entry of manifest.files) {
    safeRelativeComponents(entry.path);
    const staged = readAnchoredFile(root, `${directory}/files/${entry.path}`, ART_STAGE_FILE_LIMIT);
    if (staged.identity.sha256 !== entry.sha256 || staged.identity.size !== entry.size) {
      throw new Error(`REVIEW_FILE_IDENTITY_MISMATCH: ${entry.path}`);
    }
    totalBytes += entry.size;
  }
  if (totalBytes !== manifest.totalBytes) throw new Error('REVIEW_TOTAL_SIZE_MISMATCH');
}

export function checkArtStage(options: { readonly handoffRoot?: string } = {}): {
  readonly status: 'verified';
  readonly completedResults: number;
  readonly completedReviews: number;
} {
  const root = configuredRoot(options.handoffRoot);
  const results = validateCompletedArtResults({ handoffRoot: root });
  const review = resolve(root, 'art', 'review');
  let completedReviews = 0;
  if (existsSync(review)) {
    for (const entry of readdirSync(review, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const names = readdirSync(resolve(review, entry.name));
      if (!names.includes('review-manifest.json')) continue;
      verifyReview(root, entry.name);
      completedReviews += 1;
    }
  }
  return { status: 'verified', completedResults: results.length, completedReviews };
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  if (process.argv.includes('--check')) {
    process.stdout.write(`${JSON.stringify(checkArtStage(), null, 2)}\n`);
  } else {
    const resultPath = process.argv.find((argument) => argument.endsWith('.result.json'));
    if (resultPath === undefined) throw new Error('ART_RESULT_PATH_REQUIRED');
    process.stdout.write(`${JSON.stringify(stageArtResult({ resultRelativePath: resultPath }), null, 2)}\n`);
  }
}
