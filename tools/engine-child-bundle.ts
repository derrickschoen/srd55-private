import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import * as esbuild from 'esbuild';
import type { ResolvedConfig } from 'vite';
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
 * The build seals exactly what it used. esbuild compiles the bytes the capture
 * plugin read and hashed, never a second read, so an edit that lands during the
 * build leaves the sidecar describing the pre-edit bytes, and the next check
 * reports the edit. The build also records the vite-node profile: what
 * vite-node's CLI would resolve for the same child in this checkout (the Vite
 * config file and every module it imports, by bytes; its envDir and mode; its
 * base; the environment variables the config names; anything in the config the
 * bundle does not reproduce). The profile is resolved twice and must agree,
 * so a config edit during resolution refuses to seal.
 *
 * What the check proves, in order:
 *   - the bundle and its sidecar exist                        (else `missing`)
 *   - the sidecar is well formed, its key recomputes from its
 *     own recipe, inputs, profile and output digest, and the
 *     bundle's bytes hash to that output digest               (else `invalid`)
 *   - the recorded recipe (this file's own bytes, the esbuild
 *     version, the build options and defines) is the recipe
 *     this checkout would build with now; every recorded file
 *     lies in this checkout; the profile holds no divergence;
 *     a vite-node child spawned here now would give
 *     `import.meta.env` exactly the values the defines hold
 *     (DEV and PROD follow the NODE_ENV the child inherits),
 *     load the profile's config file, see the same values for
 *     the variables the config names, and load no `.env` file
 *     from the profile's envDir; and every recorded engine
 *     input and config input still has its recorded bytes     (else `stale`)
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
 * run. The conversation runner lets that throw end the run; it is never a
 * refused round.
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

export interface ViteImportMetaEnv {
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

/**
 * `import.meta.env` exactly as a real vite-node child resolves it, captured
 * from a real child and re-checked against one by
 * `engine child bundle build > defines equal the import.meta.env a real
 * vite-node child resolves`. `spell-source-parse-cache.ts` branches on MODE.
 */
export const VITE_CHILD_ENV = {
  BASE_URL: '/', DEV: true, MODE: 'development', PROD: false, SSR: true,
} as const satisfies ViteImportMetaEnv;

const IMPORT_META_ENV_KEYS = ['BASE_URL', 'DEV', 'MODE', 'PROD', 'SSR'] as const satisfies readonly (keyof ViteImportMetaEnv)[];

/** Vite's `DEFAULT_CONFIG_FILES`, in its lookup order. Vite does not export it; every build checks Vite agrees. */
export const VITE_CONFIG_FILES = [
  'vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.cjs', 'vite.config.mts', 'vite.config.cts',
] as const;

/** `process.env` keys Vite's config resolution may write in the resolving process; the build restores them. */
const VITE_RESOLUTION_WRITES = ['NODE_ENV', 'VITE_USER_NODE_ENV', 'BROWSER', 'BROWSER_ARGS'] as const;

/** Resolved-alias entries Vite adds on its own (`clientAlias`); any other entry is the config's. */
const VITE_BUILT_IN_ALIASES: ReadonlySet<string> = new Set([String(/^\/?@vite\/env/), String(/^\/?@vite\/client/)]);

/** Keys Vite puts into the resolved `esbuild` options on its own; any other key is the config's. */
const VITE_DEFAULT_ESBUILD_OPTIONS: ReadonlySet<string> = new Set(['jsxDev', 'charset', 'legalComments']);

/** Plugin hooks that change what a module is under vite-node. */
const MODULE_HOOKS = ['resolveId', 'load', 'transform'] as const;

const RAW_TEXT_NAMESPACE = 'raw-text';

/** esbuild's own loader for each extension; the capture plugin must name it because it supplies the contents. */
const LOADERS: Readonly<Record<string, esbuild.Loader>> = {
  '.cjs': 'js', '.cts': 'ts', '.js': 'js', '.json': 'json', '.jsx': 'jsx',
  '.mjs': 'js', '.mts': 'ts', '.ts': 'ts', '.tsx': 'tsx',
};

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
  readonly format: 'engine-child-bundle/v2';
  readonly esbuild: string;
  readonly options: typeof BUILD_OPTIONS;
  /** sha256 of `ENGINE_CHILD_RECIPE_SOURCE` in the checkout; null when the checkout has none. */
  readonly source: string | null;
}

export interface BundleInput { readonly path: string; readonly sha256: string }

/**
 * What vite-node's CLI resolves for an engine child in the building checkout,
 * besides the engine sources themselves (see the header).
 */
export interface ViteNodeProfile {
  /** The config file vite-node loads from the checkout; null when there is none. */
  readonly configFile: string | null;
  /** That file and every local module it imports (Vite's `configFileDependencies`), by bytes. */
  readonly configInputs: readonly BundleInput[];
  /** Where vite-node loads `.env` files from; null when the config turns them off. */
  readonly envDir: string | null;
  readonly mode: string;
  /** `import.meta.env.BASE_URL` under vite-node. */
  readonly base: string;
  /** Every environment variable the config sources name, as sha256 of the value the build saw; null when unset. */
  readonly environment: Readonly<Record<string, string | null>>;
  /** Everything the resolved config would do to the engine's modules that the bundle does not. */
  readonly divergences: readonly string[];
}

export interface WrittenEngineChildBundle {
  readonly bundlePath: string;
  readonly key: string;
  readonly inputs: readonly BundleInput[];
  readonly vite: ViteNodeProfile;
}

export type EngineChildBundleCheck =
  | { readonly status: 'valid'; readonly bundlePath: string; readonly key: string }
  | { readonly status: 'missing' | 'stale' | 'invalid'; readonly reason: string };

export interface EngineChildBuildHooks {
  /** Called after the capture plugin read and hashed an input, before esbuild compiles those bytes. */
  readonly onInputRead?: (path: string) => void;
}

export class EngineChildBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineChildBundleError';
  }
}

const sha256Hex = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const SHA256 = z.string().regex(/^[0-9a-f]{64}$/);
const ABSOLUTE_PATH = z.string().refine((path) => isAbsolute(path), 'paths are absolute');
const inputSchema = z.strictObject({ path: ABSOLUTE_PATH, sha256: SHA256 });
const sidecarSchema = z.strictObject({
  key: SHA256,
  recipe: z.json(),
  inputs: z.array(inputSchema).min(1),
  vite: z.strictObject({
    configFile: ABSOLUTE_PATH.nullable(),
    configInputs: z.array(inputSchema),
    envDir: ABSOLUTE_PATH.nullable(),
    mode: z.string(),
    base: z.string(),
    environment: z.record(z.string(), SHA256.nullable()),
    divergences: z.array(z.string()),
  }),
  outputSha256: SHA256,
});

export function engineChildBundleDirectory(root: string): string {
  return join(resolve(root), '.tmp', 'engine-child-bundle');
}

export function engineChildRecipe(root: string): EngineChildRecipe {
  const source = readIfPresent(resolve(root, ENGINE_CHILD_RECIPE_SOURCE));
  return {
    format: 'engine-child-bundle/v2',
    esbuild: esbuild.version,
    options: BUILD_OPTIONS,
    source: source === null ? null : sha256Hex(source),
  };
}

export function engineChildBundleKey(
  recipe: unknown, inputs: readonly BundleInput[], vite: ViteNodeProfile, outputSha256: string,
): string {
  return sha256Hex(canonicalJson({ recipe, inputs, vite, outputSha256 }));
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

const byPath = (a: BundleInput, b: BundleInput): number => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

/** The config file Vite's lookup finds in `checkout` (`loadConfigFromFile` with no `--config`). */
export function viteConfigFile(checkout: string): string | null {
  for (const name of VITE_CONFIG_FILES) {
    const path = join(checkout, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/** The files vite-node's CLI loads into the child's `process.env` (`loadEnv(mode, envDir, '')`). */
export function viteNodeEnvFiles(vite: Pick<ViteNodeProfile, 'envDir' | 'mode'>): readonly string[] {
  const { envDir } = vite;
  if (envDir === null) return [];
  return ['.env', '.env.local', `.env.${vite.mode}`, `.env.${vite.mode}.local`].map((name) => join(envDir, name));
}

const NAMED_ENVIRONMENT_READ = /\bprocess\.env\b(?:\.([A-Za-z_$][\w$]*)|\[\s*(['"])([^'"\\\n]+)\2\s*\])?/g;
const ALIASED_ENVIRONMENT = /\bfrom\s*['"](?:node:)?process['"]|\brequire\(\s*['"](?:node:)?process['"]\s*\)|\}\s*=\s*process\b|\bprocess\s*\[/;

/**
 * The environment variables a config source names (`process.env.NAME`,
 * `process.env['NAME']`), and whether it reaches the environment any other
 * way, which the check cannot bind.
 */
export function environmentReads(source: string): { readonly named: readonly string[]; readonly dynamic: boolean } {
  const named = new Set<string>();
  let dynamic = ALIASED_ENVIRONMENT.test(source);
  for (const match of source.matchAll(NAMED_ENVIRONMENT_READ)) {
    const name = match[1] ?? match[3];
    if (name === undefined) dynamic = true;
    else named.add(name);
  }
  return { named: [...named].sort(), dynamic };
}

/** What the resolved config would do to the engine's modules that the esbuild bundle does not. */
export function configDivergences(config: Pick<ResolvedConfig, 'define' | 'plugins' | 'resolve' | 'esbuild'>): string[] {
  const found: string[] = [];
  for (const key of Object.keys(config.define ?? {}).sort()) {
    found.push(`vite-node would apply the define ${key}; the bundle does not`);
  }
  for (const plugin of config.plugins) {
    if (plugin.name.startsWith('vite:') || plugin.name === 'alias') continue;
    for (const hook of MODULE_HOOKS) {
      if (plugin[hook] !== undefined) {
        found.push(`vite-node would run the ${hook} hook of the Vite plugin ${plugin.name}; the bundle does not`);
      }
    }
  }
  for (const alias of config.resolve.alias) {
    if (!VITE_BUILT_IN_ALIASES.has(String(alias.find))) {
      found.push(`vite-node would resolve imports through the alias ${String(alias.find)}; the bundle does not`);
    }
  }
  if (config.esbuild === false) {
    found.push('vite-node would not transform modules with esbuild (esbuild: false); the bundle does');
  } else {
    for (const key of Object.keys(config.esbuild).sort()) {
      if (!VITE_DEFAULT_ESBUILD_OPTIONS.has(key)) {
        found.push(`vite-node would transform with the esbuild option ${key}; the bundle does not`);
      }
    }
  }
  return found;
}

async function resolveViteNodeProfileOnce(checkout: string): Promise<ViteNodeProfile> {
  const { resolveConfig } = await import('vite');
  const saved = VITE_RESOLUTION_WRITES.map((name) => [name, process.env[name]] as const);
  let config: ResolvedConfig;
  try {
    // The inline config vite-node's CLI passes to `createServer`
    // (node_modules/vite-node/dist/cli.mjs), with `root` spelled out because
    // the child's cwd is the checkout.
    config = await resolveConfig({
      logLevel: 'error', root: checkout, server: { hmr: false, watch: null }, plugins: [],
    }, 'serve');
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  const configFile = config.configFile === undefined ? null : resolve(config.configFile);
  const lookedUp = viteConfigFile(checkout);
  if (configFile !== lookedUp) {
    throw new EngineChildBundleError(
      `Vite loaded ${configFile ?? 'no config file'} from ${checkout}, but VITE_CONFIG_FILES finds ` +
        `${lookedUp ?? 'none'}. Make VITE_CONFIG_FILES match Vite's lookup order.`,
    );
  }
  const environment: Record<string, string | null> = {};
  const divergences: string[] = [];
  const configInputs = [...new Set(config.configFileDependencies.map((path) => resolve(path)))].sort().map((path) => {
    const bytes = readFileSync(path);
    const reads = environmentReads(bytes.toString('utf8'));
    for (const name of reads.named) {
      const value = process.env[name];
      environment[name] = value === undefined ? null : sha256Hex(value);
    }
    if (reads.dynamic) {
      divergences.push(`${relative(checkout, path)} reaches the environment in a way the bundle check cannot bind`);
    }
    return { path, sha256: sha256Hex(bytes) };
  });
  divergences.push(...configDivergences(config));
  return {
    configFile,
    configInputs,
    envDir: config.envDir === false ? null : resolve(config.envDir),
    mode: config.mode,
    base: String(config.env['BASE_URL']),
    environment: Object.fromEntries(Object.entries(environment).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    divergences,
  };
}

/**
 * Resolves the vite-node profile of `root` the way vite-node's CLI resolves
 * its config. Resolved twice: an edit to the config or its imports between
 * Vite's read and the hash would otherwise record new bytes beside a profile
 * resolved from the old ones.
 */
export async function resolveViteNodeProfile(root: string): Promise<ViteNodeProfile> {
  const checkout = resolve(root);
  const first = await resolveViteNodeProfileOnce(checkout);
  const second = await resolveViteNodeProfileOnce(checkout);
  if (canonicalJson(first) !== canonicalJson(second)) {
    throw new EngineChildBundleError(
      `The Vite config in ${checkout} changed while the engine child bundle was resolving it. Nothing was sealed; re-run.`,
    );
  }
  return first;
}

/** The module Vite's `?raw` import yields: the bytes decoded as UTF-8, default-exported as one string. */
export function rawTextSource(bytes: Uint8Array): string {
  return `export default ${JSON.stringify(Buffer.from(bytes).toString('utf8'))};`;
}

/** `rawTextSource` of the file at `path`. */
export function rawTextModule(path: string): string {
  return rawTextSource(readFileSync(path));
}

/**
 * Supplies esbuild every module's contents from one read, and records the
 * sha256 of exactly those bytes. esbuild never reads a source itself, so the
 * seal cannot describe bytes other than the ones compiled.
 */
function capturePlugin(read: Map<string, string>, hooks: EngineChildBuildHooks): esbuild.Plugin {
  const capture = (path: string): Buffer => {
    const bytes = readFileSync(path);
    read.set(path, sha256Hex(bytes));
    hooks.onInputRead?.(path);
    return bytes;
  };
  return {
    name: 'engine-child-capture',
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, (args) => ({
        path: resolve(args.resolveDir, args.path.slice(0, -'?raw'.length)), namespace: RAW_TEXT_NAMESPACE,
      }));
      build.onLoad({ filter: /.*/, namespace: RAW_TEXT_NAMESPACE }, (args) => ({
        contents: rawTextSource(capture(args.path)), loader: 'js',
      }));
      build.onLoad({ filter: /.*/, namespace: 'file' }, (args) => {
        const loader = LOADERS[extname(args.path)];
        if (loader === undefined) {
          throw new EngineChildBundleError(`The engine child bundle has no loader for ${args.path}.`);
        }
        return { contents: capture(args.path), loader };
      });
    },
  };
}

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
  directory: string,
  recipe: EngineChildRecipe,
  inputs: readonly BundleInput[],
  vite: ViteNodeProfile,
  contents: string | Uint8Array,
): WrittenEngineChildBundle {
  const outputSha256 = sha256Hex(contents);
  const key = engineChildBundleKey(recipe, inputs, vite, outputSha256);
  mkdirSync(directory, { recursive: true });
  const bundlePath = join(directory, `${key}.mjs`);
  writeAtomically(bundlePath, contents);
  writeAtomically(sidecarPath(bundlePath), `${JSON.stringify({ key, recipe, inputs, vite, outputSha256 })}\n`);
  return { bundlePath, key, inputs, vite };
}

/**
 * Builds the bundle into `directory` (the checkout's own by default). Always a
 * full build and a full write. The name is a content address over the
 * recipe, the inputs, the vite-node profile AND the output digest, so
 * rewriting a same-named file writes identical bytes, and a same-named file
 * that differs from this build is overwritten rather than trusted.
 */
export async function buildEngineChildBundle(
  root: string, directory: string = engineChildBundleDirectory(root), hooks: EngineChildBuildHooks = {},
): Promise<WrittenEngineChildBundle> {
  const checkout = resolve(root);
  const vite = await resolveViteNodeProfile(checkout);
  const read = new Map<string, string>();
  const result = await esbuild.build({
    ...BUILD_OPTIONS, absWorkingDir: checkout, write: false, metafile: true, plugins: [capturePlugin(read, hooks)],
  });
  const output = result.outputFiles[0];
  if (output === undefined) throw new EngineChildBundleError('esbuild produced no engine child bundle.');
  assertNoImportMeta(output.text);
  const inputs = Object.keys(result.metafile.inputs).map((input) => {
    const path = resolve(checkout, input.startsWith(`${RAW_TEXT_NAMESPACE}:`)
      ? input.slice(`${RAW_TEXT_NAMESPACE}:`.length) : input);
    const sha256 = read.get(path);
    if (sha256 === undefined) {
      throw new EngineChildBundleError(`esbuild compiled ${path} without the capture plugin reading it; nothing was sealed.`);
    }
    return { path, sha256 };
  }).sort(byPath);
  const written = writeEngineChildBundle(directory, engineChildRecipe(checkout), inputs, vite, output.contents);
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

export type EngineChildEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Why a vite-node child spawned in `checkout` with `environment` would not run
 * what the bundle runs, or null when it would. Reads no recorded input.
 */
function viteNodeDifference(checkout: string, vite: ViteNodeProfile, environment: EngineChildEnvironment): string | null {
  const [divergence] = vite.divergences;
  if (divergence !== undefined) return divergence;
  // Vite: isProduction = NODE_ENV === 'production', an unset NODE_ENV counting as 'development'.
  const production = environment['NODE_ENV'] === 'production';
  const resolved: ViteImportMetaEnv = {
    BASE_URL: vite.base, DEV: !production, MODE: vite.mode, PROD: production, SSR: true,
  };
  for (const name of IMPORT_META_ENV_KEYS) {
    if (resolved[name] !== VITE_CHILD_ENV[name]) {
      return `vite-node would resolve import.meta.env.${name} to ${JSON.stringify(resolved[name])}; ` +
        `the bundle defines ${JSON.stringify(VITE_CHILD_ENV[name])}`;
    }
  }
  const configFile = viteConfigFile(checkout);
  if (configFile !== vite.configFile) {
    return `vite-node would load ${configFile ?? 'no Vite config'}; ` +
      `the bundle was built against ${vite.configFile ?? 'no Vite config'}`;
  }
  for (const [name, recorded] of Object.entries(vite.environment)) {
    const value = environment[name];
    if ((value === undefined ? null : sha256Hex(value)) !== recorded) {
      return `the Vite config reads ${name}, which is not what it was when the bundle was built`;
    }
  }
  const envFile = viteNodeEnvFiles(vite).find((path) => statSync(path, { throwIfNoEntry: false })?.isFile() === true);
  if (envFile !== undefined) return `vite-node would load ${envFile} into the child and the bundle would not`;
  return null;
}

/**
 * Checks `offeredPath` against the checkout at `root` and the environment a
 * child spawned from here inherits, reading every recorded file on every call
 * (see the header).
 */
export function checkEngineChildBundle(
  root: string, offeredPath: string, environment: EngineChildEnvironment = process.env,
): EngineChildBundleCheck {
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
  const { key, recipe, inputs, vite, outputSha256 } = sidecar.data;
  if (engineChildBundleKey(recipe, inputs, vite, outputSha256) !== key) {
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
  const recorded = [...inputs, ...vite.configInputs];
  for (const input of recorded) {
    const path = resolve(input.path);
    if (!path.startsWith(`${checkout}${sep}`)) {
      return { status: 'stale', reason: `${bundlePath} was built from ${path}, outside ${checkout}` };
    }
  }
  const difference = viteNodeDifference(checkout, vite, environment);
  if (difference !== null) return { status: 'stale', reason: difference };
  for (const input of recorded) {
    const path = resolve(input.path);
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
 * always was. An offer is used only when it checks `valid` for `cwd` and the
 * environment the child inherits.
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
