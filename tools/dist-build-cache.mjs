// @ts-nocheck
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE_FORMAT = 'dnd-dist-build-cache-v1';
const CACHE_ROOT = join(tmpdir(), CACHE_FORMAT);

/**
 * Production-output inputs that are not discovered through a build graph at
 * cache-lookup time. Paths as well as bytes are hashed, so adding, removing,
 * renaming, or editing a file changes the key without checkout identity.
 */
export const DIST_BUILD_INPUT_CLASSES = Object.freeze([
  Object.freeze({ label: 'application sources', paths: Object.freeze(['src']) }),
  Object.freeze({ label: 'public assets', paths: Object.freeze(['public']) }),
  Object.freeze({ label: 'HTML entry point', paths: Object.freeze(['index.html']) }),
  Object.freeze({ label: 'build-time tools', paths: Object.freeze([
    'tools/ai-bridge',
    'tools/licenses',
    'tools/pwa',
    'tools/assert-dist-clean.mjs',
  ]) }),
  Object.freeze({ label: 'emitted licence texts', paths: Object.freeze([
    'LICENSE',
    'LICENSE-ART',
    'ART-PROVENANCE.md',
    'docs/licenses/CC-BY-4.0.txt',
    'docs/licenses/SRD-5.1-ATTRIBUTION.txt',
    'docs/licenses/A5ESRD-ATTRIBUTION.txt',
  ]) }),
  Object.freeze({ label: 'package manifest', paths: Object.freeze(['package.json']) }),
  Object.freeze({ label: 'npm lockfile', paths: Object.freeze(['package-lock.json']) }),
]);

function rootConfigurationFiles(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) =>
      /^vite\.config\.[cm]?[jt]s$/u.test(name) ||
      /^tsconfig(?:\.[^.]+)?\.json$/u.test(name)
    )
    .sort();
}

function regularFiles(root, inputPath) {
  const absolute = resolve(root, inputPath);
  const stats = statSync(absolute);
  if (stats.isFile()) return [absolute];
  if (!stats.isDirectory()) {
    throw new TypeError(`Build input is not a regular file or directory: ${inputPath}`);
  }
  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(absolute, entry.name);
    if (entry.isDirectory()) {
      files.push(...regularFiles(root, relative(root, child)));
    } else if (entry.isFile()) {
      files.push(child);
    } else {
      throw new TypeError(
        `Build input contains an unsupported filesystem entry: ${relative(root, child)}`,
      );
    }
  }
  return files;
}

function framed(hash, bytes) {
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(bytes.byteLength));
  hash.update(length);
  hash.update(bytes);
}

export function distBuildInputFiles(root) {
  const declared = DIST_BUILD_INPUT_CLASSES.flatMap((inputClass) =>
    inputClass.paths
  );
  const configuration = rootConfigurationFiles(root);
  if (!configuration.some((name) => name.startsWith('vite.config.'))) {
    throw new TypeError('No root Vite configuration was found.');
  }
  if (!configuration.some((name) => name.startsWith('tsconfig'))) {
    throw new TypeError('No root TypeScript configuration was found.');
  }
  return [...new Set([...declared, ...configuration]
    .flatMap((inputPath) => regularFiles(root, inputPath))
    .map((file) => relative(root, file).split(sep).join('/')))]
    .sort();
}

export function distBuildInputDigest(root) {
  const hash = createHash('sha256');
  framed(hash, Buffer.from(CACHE_FORMAT));
  for (const file of distBuildInputFiles(root)) {
    framed(hash, Buffer.from(file));
    framed(hash, readFileSync(resolve(root, file)));
  }
  return hash.digest('hex');
}

function directoryDigest(directory) {
  const hash = createHash('sha256');
  framed(hash, Buffer.from(CACHE_FORMAT));
  for (const file of regularFiles(directory, '.').map((path) =>
    relative(directory, path).split(sep).join('/')
  ).sort()) {
    framed(hash, Buffer.from(file));
    framed(hash, readFileSync(resolve(directory, file)));
  }
  return hash.digest('hex');
}

function nonce() {
  return `${String(process.pid)}.${randomBytes(8).toString('hex')}`;
}

function cachePointer(inputDigest) {
  return join(CACHE_ROOT, `${inputDigest}.json`);
}

function cacheGeneration(inputDigest, generation) {
  if (!generation.startsWith(`${inputDigest}.`) || !/^[a-f0-9.]+$/u.test(generation)) {
    throw new TypeError('Dist cache generation name is malformed.');
  }
  const generations = resolve(CACHE_ROOT, 'generations');
  const candidate = resolve(generations, generation);
  if (!candidate.startsWith(`${generations}${sep}`)) {
    throw new TypeError('Dist cache generation escaped its cache root.');
  }
  return candidate;
}

function readStamp(inputDigest) {
  const decoded = JSON.parse(readFileSync(cachePointer(inputDigest), 'utf8'));
  if (
    decoded === null || typeof decoded !== 'object' ||
    decoded.format !== CACHE_FORMAT || decoded.inputDigest !== inputDigest ||
    typeof decoded.distDigest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(decoded.distDigest) ||
    typeof decoded.generation !== 'string'
  ) {
    throw new TypeError('Dist cache stamp is malformed.');
  }
  return decoded;
}

function restoreCachedDist(root, inputDigest) {
  const temporary = resolve(root, `.dist-cache-restore.${nonce()}.partial`);
  try {
    const stamp = readStamp(inputDigest);
    const cachedDist = join(
      cacheGeneration(inputDigest, stamp.generation),
      'dist',
    );
    if (directoryDigest(cachedDist) !== stamp.distDigest) return false;
    cpSync(cachedDist, temporary, { recursive: true, errorOnExist: true });
    if (directoryDigest(temporary) !== stamp.distDigest) return false;
    rmSync(resolve(root, 'dist'), { recursive: true, force: true });
    renameSync(temporary, resolve(root, 'dist'));
    process.stdout.write(`dist cache hit: ${inputDigest}\n`);
    return true;
  } catch {
    return false;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function runRealBuild(root) {
  process.stdout.write('dist cache miss: running npm run build\n');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm run build failed with exit code ${String(result.status)}.`);
  }
}

function storeCachedDist(root, inputDigest) {
  const generations = join(CACHE_ROOT, 'generations');
  mkdirSync(generations, { recursive: true });
  const generation = `${inputDigest}.${nonce()}`;
  const partial = join(generations, `.${generation}.partial`);
  const complete = cacheGeneration(inputDigest, generation);
  const pointerTemporary = `${cachePointer(inputDigest)}.${nonce()}.partial`;
  try {
    mkdirSync(partial);
    cpSync(resolve(root, 'dist'), join(partial, 'dist'), {
      recursive: true,
      errorOnExist: true,
    });
    const distDigest = directoryDigest(join(partial, 'dist'));
    renameSync(partial, complete);
    writeFileSync(pointerTemporary, `${JSON.stringify({
      format: CACHE_FORMAT,
      inputDigest,
      distDigest,
      generation,
    })}\n`, 'utf8');
    // The generation is complete before this atomic pointer replacement makes
    // it visible. Concurrent worktrees may both build; readers see one whole,
    // SHA-256-verified generation or fail open to a real build.
    renameSync(pointerTemporary, cachePointer(inputDigest));
    process.stdout.write(`dist cache stored: ${inputDigest}\n`);
  } finally {
    rmSync(partial, { recursive: true, force: true });
    rmSync(pointerTemporary, { force: true });
  }
}

export function buildOrRestoreDist(root) {
  let inputDigest;
  try {
    inputDigest = distBuildInputDigest(root);
    if (restoreCachedDist(root, inputDigest)) return;
  } catch (error) {
    process.stderr.write(
      `dist cache unavailable; falling back to a real build: ${String(error)}\n`,
    );
  }
  runRealBuild(root);
  if (inputDigest === undefined) return;
  try {
    storeCachedDist(root, inputDigest);
  } catch (error) {
    process.stderr.write(
      `dist cache store failed; keeping the real build: ${String(error)}\n`,
    );
  }
}

const invokedPath = process.argv[1] === undefined
  ? undefined
  : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    buildOrRestoreDist(process.cwd());
  } catch (error) {
    process.stderr.write(`dist build failed: ${String(error)}\n`);
    process.exitCode = 1;
  }
}
