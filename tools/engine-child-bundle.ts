import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import * as esbuild from 'esbuild';
import { z } from 'zod';
import { canonicalJson } from '../src/commands/canonical-json';

/**
 * ONE PREBUILT ENGINE CHILD INSTEAD OF A VITE-NODE BOOT PER CHILD.
 *
 * `startMcpClient` spawns `tools/engine-mcp-server.ts` once per MCP round. Under
 * vite-node every child re-transforms the whole engine graph (about 5 s to
 * ready); the same graph bundled once by esbuild boots in about 1.5 s
 * (PERF-02 X3, D882).
 *
 * The Vitest global setup builds the bundle and hands workers its path in
 * `DND_ENGINE_CHILD_BUNDLE`. Nothing trusts that path: `engineChildArgs`
 * re-checks the bundle against the requesting checkout on EVERY spawn. There
 * is deliberately no memo of that answer. A memo is how a bundle goes on
 * serving yesterday's engine after an edit, or another checkout's engine.
 *
 * What the check proves, in order:
 *   - the bundle and its sidecar exist                        (else `missing`)
 *   - the sidecar is well formed, its key recomputes from its
 *     own recipe, inputs and output digest, and the bundle's
 *     bytes hash to that output digest                        (else `invalid`)
 *   - the recorded recipe (this file's own bytes, the esbuild
 *     version, the build options and defines) is the recipe
 *     this checkout would build with now; no `.env` file would
 *     give a vite-node child an environment the bundle lacks;
 *     and every recorded input lies in this checkout and still
 *     has its recorded bytes                                  (else `stale`)
 *
 * `missing` and `stale` are ordinary: a source edit, a new checkout, an
 * esbuild upgrade. They fall back to the vite-node child, today's behaviour
 * (PERF-02 plan r3 4), and say so once on stderr, so a silent
 * 3.5 s-per-child regression cannot hide. `invalid` is not ordinary: the
 * builder writes both files atomically and content-addressed, so a sidecar
 * that contradicts itself or a bundle that does not hash to its recorded
 * digest is corruption or a foreign writer. That throws, as a corrupt
 * spell-parse cache does (`src/simulation/spell-source-parse-cache.ts`):
 * falling back there would make corruption indistinguishable from a healthy
 * run.
 *
 * Only `startMcpClient` uses the bundle. The live-agent engine command, the
 * dry client, agent conformance and the engine MCP server tests keep vite-node.
 */

export const ENGINE_CHILD_BUNDLE_ENV = 'DND_ENGINE_CHILD_BUNDLE';
export const ENGINE_CHILD_ENTRY = 'tools/engine-mcp-server.ts';
/** This file. Its bytes are part of the recipe, so editing the bundling code makes every older bundle stale. */
export const ENGINE_CHILD_RECIPE_SOURCE = 'tools/engine-child-bundle.ts';
/**
 * Other bundles in the directory survive this long after their last write,
 * because another Vitest run in the same checkout may still be spawning one.
 */
export const ENGINE_CHILD_BUNDLE_RETENTION_MS = 60 * 60 * 1000;

/**
 * `import.meta.env` exactly as a real vite-node child resolves it, captured
 * from a real child and re-checked against one by
 * `engine child bundle build > defines equal the import.meta.env a real
 * vite-node child resolves`. `spell-source-parse-cache.ts` branches on MODE.
 */
export const VITE_CHILD_ENV = {
  BASE_URL: '/', DEV: true, MODE: 'development', PROD: false, SSR: true,
} as const;

/**
 * The files vite-node's CLI copies into the child's `process.env`
 * (`loadEnv(mode, envDir, '')`, envDir = the checkout). The bundle child never
 * reads them, so while one exists the two runtimes can differ.
 */
const VITE_NODE_ENV_FILES = [
  '.env', '.env.local', `.env.${VITE_CHILD_ENV.MODE}`, `.env.${VITE_CHILD_ENV.MODE}.local`,
] as const;

const RAW_TEXT_NAMESPACE = 'raw-text';

/** The serialisable half of the esbuild options. The plugin half is this file's bytes. */
const BUILD_OPTIONS = {
  entryPoints: [ENGINE_CHILD_ENTRY],
  bundle: true,
  platform: 'node',
  format: 'esm',
  // Bare package imports (zod) resolve at run time from the checkout's
  // node_modules. That is why the bundle directory lives inside the checkout.
  packages: 'external',
  sourcemap: false,
  define: Object.fromEntries(Object.entries(VITE_CHILD_ENV).map(([key, value]) =>
    [`import.meta.env.${key}`, JSON.stringify(value)])),
} satisfies esbuild.BuildOptions;

export interface EngineChildRecipe {
  readonly format: 'engine-child-bundle/v1';
  readonly esbuild: string;
  readonly options: typeof BUILD_OPTIONS;
  /** sha256 of `ENGINE_CHILD_RECIPE_SOURCE` in the checkout; null when the checkout has none. */
  readonly source: string | null;
}

export interface BundleInput { readonly path: string; readonly sha256: string }

export interface WrittenEngineChildBundle {
  readonly bundlePath: string;
  readonly key: string;
  readonly inputs: readonly BundleInput[];
}

export type EngineChildBundleCheck =
  | { readonly status: 'valid'; readonly bundlePath: string; readonly key: string }
  | { readonly status: 'missing' | 'stale' | 'invalid'; readonly reason: string };

export class EngineChildBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineChildBundleError';
  }
}

const sha256Hex = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const SHA256 = z.string().regex(/^[0-9a-f]{64}$/);
const sidecarSchema = z.strictObject({
  key: SHA256,
  recipe: z.json(),
  inputs: z.array(z.strictObject({
    path: z.string().refine((path) => isAbsolute(path), 'input paths are absolute'),
    sha256: SHA256,
  })).min(1),
  outputSha256: SHA256,
});

export function engineChildBundleDirectory(root: string): string {
  return join(resolve(root), '.tmp', 'engine-child-bundle');
}

export function engineChildRecipe(root: string): EngineChildRecipe {
  const source = readIfPresent(resolve(root, ENGINE_CHILD_RECIPE_SOURCE));
  return {
    format: 'engine-child-bundle/v1',
    esbuild: esbuild.version,
    options: BUILD_OPTIONS,
    source: source === null ? null : sha256Hex(source),
  };
}

export function engineChildBundleKey(
  recipe: unknown, inputs: readonly BundleInput[], outputSha256: string,
): string {
  return sha256Hex(canonicalJson({ recipe, inputs, outputSha256 }));
}

function sidecarPath(bundlePath: string): string {
  return `${bundlePath.slice(0, -'.mjs'.length)}.json`;
}

function readIfPresent(path: string): Buffer | null {
  try {
    return readFileSync(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

/** The module Vite's `?raw` import yields: the file decoded as UTF-8, default-exported as one string. */
export function rawTextModule(path: string): string {
  return `export default ${JSON.stringify(readFileSync(path, 'utf8'))};`;
}

const rawTextPlugin: esbuild.Plugin = {
  name: 'vite-raw-text',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({
      path: resolve(args.resolveDir, args.path.slice(0, -'?raw'.length)), namespace: RAW_TEXT_NAMESPACE,
    }));
    build.onLoad({ filter: /.*/, namespace: RAW_TEXT_NAMESPACE }, (args) => ({
      contents: rawTextModule(args.path), loader: 'js',
    }));
  },
};

/** A read esbuild left in place would be undefined in the bundle but a value under vite-node. */
export function assertNoImportMeta(code: string): void {
  const read = /\bimport\.meta\b[\w.]*/.exec(code);
  if (read !== null) {
    throw new EngineChildBundleError(
      `The engine child bundle still contains ${read[0]}. vite-node resolves it; the bundle cannot. ` +
        'Add the value to VITE_CHILD_ENV (checked against a real vite-node child) or remove the read.',
    );
  }
}

function writeAtomically(path: string, bytes: string | Uint8Array): void {
  const temporary = `${path}.${String(process.pid)}.${randomUUID()}.partial`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, path);
}

/**
 * Writes `contents` and its sidecar under their content address. The bundle
 * goes first and the sidecar second, so a reader between the two renames
 * finds no sidecar (`missing`), never a mismatched pair.
 */
export function writeEngineChildBundle(
  directory: string, recipe: EngineChildRecipe, inputs: readonly BundleInput[], contents: string | Uint8Array,
): WrittenEngineChildBundle {
  const outputSha256 = sha256Hex(contents);
  const key = engineChildBundleKey(recipe, inputs, outputSha256);
  mkdirSync(directory, { recursive: true });
  const bundlePath = join(directory, `${key}.mjs`);
  writeAtomically(bundlePath, contents);
  writeAtomically(sidecarPath(bundlePath), `${JSON.stringify({ key, recipe, inputs, outputSha256 })}\n`);
  return { bundlePath, key, inputs };
}

/**
 * Builds the bundle into `directory` (the checkout's own by default). Always a
 * full build and a full write. The name is a content address over the
 * recipe, the inputs AND the output digest, so rewriting a same-named file
 * writes identical bytes, and a same-named file that differs from this build
 * is overwritten rather than trusted.
 */
export async function buildEngineChildBundle(
  root: string, directory: string = engineChildBundleDirectory(root),
): Promise<WrittenEngineChildBundle> {
  const checkout = resolve(root);
  const result = await esbuild.build({
    ...BUILD_OPTIONS, absWorkingDir: checkout, write: false, metafile: true, plugins: [rawTextPlugin],
  });
  const output = result.outputFiles[0];
  if (output === undefined) throw new EngineChildBundleError('esbuild produced no engine child bundle.');
  assertNoImportMeta(output.text);
  const inputs = Object.keys(result.metafile.inputs).map((input) => {
    const path = resolve(checkout, input.startsWith(`${RAW_TEXT_NAMESPACE}:`)
      ? input.slice(`${RAW_TEXT_NAMESPACE}:`.length) : input);
    return { path, sha256: sha256Hex(readFileSync(path)) };
  }).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const written = writeEngineChildBundle(directory, engineChildRecipe(checkout), inputs, output.contents);
  sweepEngineChildBundles(directory, written.key, Date.now());
  return written;
}

const BUNDLE_FILE = /^([0-9a-f]{64})\.(?:mjs|json)$/;

/**
 * Removes other bundles, sidecars and abandoned partial writes whose last
 * write is older than the retention window. It never removes the current
 * key, and never a file this module does not name.
 */
export function sweepEngineChildBundles(directory: string, currentKey: string, now: number): readonly string[] {
  const removed: string[] = [];
  for (const name of readdirSync(directory)) {
    const key = BUNDLE_FILE.exec(name)?.[1];
    if (key === currentKey) continue;
    if (key === undefined && !name.endsWith('.partial')) continue;
    const path = join(directory, name);
    const modified = statSync(path, { throwIfNoEntry: false })?.mtimeMs;
    if (modified === undefined || now - modified < ENGINE_CHILD_BUNDLE_RETENTION_MS) continue;
    rmSync(path, { force: true });
    removed.push(name);
  }
  return removed.sort();
}

/** Checks `offeredPath` against the checkout at `root`, reading every input on every call (see the header). */
export function checkEngineChildBundle(root: string, offeredPath: string): EngineChildBundleCheck {
  const checkout = resolve(root);
  const bundlePath = resolve(offeredPath);
  if (!bundlePath.endsWith('.mjs')) {
    return { status: 'invalid', reason: `${bundlePath} is not an engine child bundle (.mjs)` };
  }
  const sidecarFile = sidecarPath(bundlePath);
  const bytes = readIfPresent(bundlePath);
  if (bytes === null) return { status: 'missing', reason: `${bundlePath} does not exist` };
  const sidecarBytes = readIfPresent(sidecarFile);
  if (sidecarBytes === null) return { status: 'missing', reason: `${sidecarFile} does not exist` };
  let parsed: unknown;
  try {
    parsed = JSON.parse(sidecarBytes.toString('utf8'));
  } catch {
    return { status: 'invalid', reason: `${sidecarFile} is not JSON` };
  }
  const sidecar = sidecarSchema.safeParse(parsed);
  if (!sidecar.success) return { status: 'invalid', reason: `${sidecarFile} is not an engine child bundle sidecar` };
  const { key, recipe, inputs, outputSha256 } = sidecar.data;
  if (engineChildBundleKey(recipe, inputs, outputSha256) !== key) {
    return { status: 'invalid', reason: `${sidecarFile} does not recompute to its own key` };
  }
  if (sha256Hex(bytes) !== outputSha256) {
    return { status: 'invalid', reason: `${bundlePath} does not hash to the output digest recorded beside it` };
  }
  if (canonicalJson(recipe) !== canonicalJson(engineChildRecipe(checkout))) {
    return {
      status: 'stale',
      reason: `${bundlePath} was built by another recipe (bundling code, esbuild version or build options)`,
    };
  }
  const envFile = VITE_NODE_ENV_FILES.find((name) => existsSync(join(checkout, name)));
  if (envFile !== undefined) {
    return { status: 'stale', reason: `vite-node would load ${join(checkout, envFile)} into the child and the bundle would not` };
  }
  for (const input of inputs) {
    const path = resolve(input.path);
    if (!path.startsWith(`${checkout}${sep}`)) {
      return { status: 'stale', reason: `${bundlePath} was built from ${path}, outside ${checkout}` };
    }
    const current = readIfPresent(path);
    if (current === null || sha256Hex(current) !== input.sha256) {
      return { status: 'stale', reason: `${relative(checkout, path)} changed since ${bundlePath} was built` };
    }
  }
  return { status: 'valid', bundlePath, key };
}

/** Lines already written. It only suppresses repeats; the check above still runs on every spawn. */
const reportedFallbacks = new Set<string>();

function reportFallback(message: string): void {
  if (reportedFallbacks.has(message)) return;
  reportedFallbacks.add(message);
  process.stderr.write(`${message}\n`);
}

/**
 * The argv after `node` for one engine child. No offer means vite-node, as it
 * always was. An offer is used only when it checks `valid` for `cwd`.
 */
export function engineChildArgs(cwd: string, launcherPath: string, offered: string | undefined): readonly string[] {
  const viteNode = [
    resolve(cwd, 'node_modules/vite-node/vite-node.mjs'), resolve(cwd, ENGINE_CHILD_ENTRY), launcherPath,
  ];
  if (offered === undefined) return viteNode;
  const check = checkEngineChildBundle(cwd, offered);
  switch (check.status) {
    case 'valid':
      return [check.bundlePath, launcherPath];
    case 'missing':
    case 'stale':
      reportFallback(`[engine-child-bundle] ${check.status}: ${check.reason}. Engine children run under vite-node.`);
      return viteNode;
    case 'invalid':
      throw new EngineChildBundleError(
        `${ENGINE_CHILD_BUNDLE_ENV}=${offered} is not usable: ${check.reason}. It has NOT been used. ` +
          `Delete it, or unset ${ENGINE_CHILD_BUNDLE_ENV}, and re-run.`,
      );
  }
}
