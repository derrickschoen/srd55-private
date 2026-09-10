import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArtResult, validateCompletedArtResults, type ValidatedArtResult } from './art-validator.ts';
import {
  createAnchoredDirectoryExclusive, createAnchoredFileExclusive, ensureAnchoredDirectory,
  promoteAnchoredPartial, readAnchoredFile, safeRelativeComponents, sameFileIdentity,
} from './safe-files.ts';

export interface ArtStageHooks {
  readonly afterInitialValidation?: (validated: ValidatedArtResult) => void;
  readonly afterCopy?: (declaredPath: string) => void;
  readonly beforeFinalValidation?: () => void;
  readonly beforeManifest?: () => void;
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

function createStagedFile(root: string, relativePath: string, bytes: Buffer, nonce: string): void {
  const components = safeRelativeComponents(relativePath);
  const filename = components.at(-1);
  if (filename === undefined) throw new Error('STAGE_PATH_INVALID');
  const parent = components.slice(0, -1).join('/');
  if (parent.length > 0) ensureAnchoredDirectory(root, parent);
  const partial = `${relativePath}.partial.${nonce}`;
  const written = createAnchoredFileExclusive(root, partial, bytes);
  const checked = readAnchoredFile(root, partial, bytes.length);
  if (written.sha256 !== checked.identity.sha256 || !checked.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
  promoteAnchoredPartial(root, partial, relativePath);
  const final = readAnchoredFile(root, relativePath, bytes.length);
  if (final.identity.sha256 !== written.sha256 || !final.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
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
  const validated = validateArtResult({ handoffRoot: root, resultRelativePath: options.resultRelativePath });
  options.hooks?.afterInitialValidation?.(validated);
  ensureAnchoredDirectory(root, 'art/review');
  const reviewDirectory = `art/review/${validated.request.requestId}`;
  createAnchoredDirectoryExclusive(root, reviewDirectory);
  const nonce = (options.nonce ?? (() => randomBytes(8).toString('hex')))();
  createStagedFile(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, nonce);
  createStagedFile(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, nonce);
  for (const entry of validated.files) {
    createStagedFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, entry.file.bytes, nonce);
    options.hooks?.afterCopy?.(entry.declaredPath);
  }
  options.hooks?.beforeFinalValidation?.();
  const revalidated = validateArtResult({ handoffRoot: root, resultRelativePath: options.resultRelativePath });
  if (!matchingValidation(validated, revalidated)) throw new Error('STAGE_SOURCE_CHANGED');
  for (const entry of validated.files) {
    const staged = readAnchoredFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, ART_STAGE_FILE_LIMIT);
    if (staged.identity.sha256 !== entry.file.identity.sha256 || !staged.bytes.equals(entry.file.bytes)) {
      throw new Error(`STAGE_POSTCOPY_MISMATCH: ${entry.declaredPath}`);
    }
  }
  options.hooks?.beforeManifest?.();
  const manifest = `${reviewDirectory}/review-manifest.json`;
  createStagedFile(root, manifest, json({
    schemaVersion: 1,
    requestId: validated.request.requestId,
    requestSha256: validated.requestFile.identity.sha256,
    resultSha256: validated.resultFile.identity.sha256,
    files: validated.files.map((entry) => ({ path: entry.declaredPath, sha256: entry.file.identity.sha256, size: entry.file.identity.size })),
    totalBytes: validated.totalBytes,
  }), nonce);
  return { requestId: validated.request.requestId, reviewDirectory, manifest, files: validated.files.length };
}

const ART_STAGE_FILE_LIMIT = 64 * 1024 * 1024;

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
      const path = `art/review/${entry.name}/review-manifest.json`;
      try {
        JSON.parse(readAnchoredFile(root, path, 1024 * 1024).bytes.toString('utf8')) as unknown;
        completedReviews += 1;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
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
