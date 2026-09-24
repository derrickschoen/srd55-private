import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import bundledSrd521 from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { parseConversationArgs, runConversation, startMcpClient } from '../../../tools/ai-dm-conversation';
import {
  assertNoImportMeta,
  buildEngineChildBundle,
  checkEngineChildBundle,
  ENGINE_CHILD_BUNDLE_ENV,
  ENGINE_CHILD_BUNDLE_RETENTION_MS,
  ENGINE_CHILD_ENTRY,
  ENGINE_CHILD_RECIPE_SOURCE,
  engineChildArgs,
  engineChildBundleDirectory,
  EngineChildBundleError,
  engineChildRecipe,
  rawTextModule,
  resolveViteNodeProfile,
  sweepEngineChildBundles,
  VITE_CHILD_ENV,
  writeEngineChildBundle,
  type EngineChildRecipe,
  type ViteNodeProfile,
  type WrittenEngineChildBundle,
} from '../../../tools/engine-child-bundle';

const root = process.cwd();
const offeredByGlobalSetup = process.env[ENGINE_CHILD_BUNDLE_ENV];
const launcher = '/launcher-never-read.json';
const sha256Hex = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const sidecarOf = (bundlePath: string): string => bundlePath.replace(/\.mjs$/, '.json');

const scratch: string[] = [];
function scratchDirectory(label: string): string {
  const directory = mkdtempSync(join(tmpdir(), `dnd-engine-child-bundle-test-${label}-`));
  scratch.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
  if (offeredByGlobalSetup === undefined) delete process.env[ENGINE_CHILD_BUNDLE_ENV];
  else process.env[ENGINE_CHILD_BUNDLE_ENV] = offeredByGlobalSetup;
});

/**
 * A two-input stand-in checkout. Its recipe source is not the real bundling
 * code, but it sits where `engineChildRecipe` reads it, so editing it is
 * editing the recipe.
 */
function fakeCheckout(checkout: string): WrittenEngineChildBundle {
  mkdirSync(join(checkout, 'tools'), { recursive: true });
  mkdirSync(join(checkout, 'src'), { recursive: true });
  writeFileSync(join(checkout, ENGINE_CHILD_RECIPE_SOURCE), '// recipe v1\n');
  writeFileSync(join(checkout, 'src/engine.ts'), 'export const rule = 2;\n');
  writeFileSync(join(checkout, 'src/corpus.txt'), 'Fireball\n');
  return seal(checkout, 'export const engine = 1;\n');
}

/**
 * The profile of a checkout with no Vite config: what vite-node resolves by
 * default, which is what the bundle's defines hold.
 */
function plainProfile(checkout: string, overrides: Partial<ViteNodeProfile> = {}): ViteNodeProfile {
  return {
    configFile: null, configInputs: [], envDir: checkout, mode: 'development', base: '/', environment: {},
    divergences: [], ...overrides,
  };
}

function seal(
  checkout: string,
  contents: string,
  recipe: EngineChildRecipe = engineChildRecipe(checkout),
  vite: ViteNodeProfile = plainProfile(checkout),
) {
  const inputs = ['src/corpus.txt', 'src/engine.ts'].map((path) => ({
    path: join(checkout, path),
    sha256: sha256Hex(readFileSync(join(checkout, path))),
  }));
  return writeEngineChildBundle(engineChildBundleDirectory(checkout), recipe, inputs, vite, contents);
}

const inputOf = (path: string) => ({ path, sha256: sha256Hex(readFileSync(path)) });

const recipeReason = (bundlePath: string): string =>
  `${bundlePath} was built by another recipe (bundling code, esbuild version or build options)`;

/** The argv startMcpClient hands to spawn, observed through an injected fake. */
function spawnedArgs(cwd: string): readonly string[] {
  const fake = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(),
    exitCode: null, signalCode: null, pid: 12_345, kill: vi.fn(() => true),
  });
  const launch = vi.fn((_command: string, _args: readonly string[]) => fake);
  const client = startMcpClient(cwd, launcher, launch as unknown as typeof spawn);
  client.lines.close();
  fake.emit('exit', 0, null);
  expect(launch).toHaveBeenCalledTimes(1);
  return launch.mock.calls[0]?.[1] ?? [];
}

const viteNodeArgs = (cwd: string): readonly string[] => [
  join(cwd, 'node_modules/vite-node/vite-node.mjs'), join(cwd, 'tools/engine-mcp-server.ts'), launcher,
];

function stderrLines(calls: readonly (readonly unknown[])[], containing: string): readonly string[] {
  return calls.map(([chunk]) => String(chunk)).filter((line) => line.includes(containing));
}

describe('engine child bundle validation', () => {
  it('accepts a sealed bundle whose recipe and inputs match the checkout', () => {
    const checkout = scratchDirectory('valid');
    const sealed = fakeCheckout(checkout);
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'valid', bundlePath: sealed.bundlePath, key: sealed.key });
  });

  it('reports stale, naming the file, when a recorded input no longer has its recorded bytes', () => {
    const checkout = scratchDirectory('input');
    const sealed = fakeCheckout(checkout);
    writeFileSync(join(checkout, 'src/engine.ts'), 'export const rule = 3;\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'stale', reason: `src/engine.ts changed since ${sealed.bundlePath} was built` });
    rmSync(join(checkout, 'src/corpus.txt'));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'stale', reason: `src/corpus.txt changed since ${sealed.bundlePath} was built` });
  });

  it('reports stale for a sidecar recorded by another esbuild version or other build options', () => {
    const checkout = scratchDirectory('recipe');
    fakeCheckout(checkout);
    const current = engineChildRecipe(checkout);
    const otherEsbuild = seal(checkout, 'export const a = 1;\n', { ...current, esbuild: '0.0.0-other' });
    const otherDefines = seal(checkout, 'export const b = 1;\n', {
      ...current,
      options: {
        ...current.options,
        define: { ...current.options.define, 'import.meta.env.MODE': JSON.stringify('test') },
      },
    });
    for (const sealed of [otherEsbuild, otherDefines]) {
      expect(checkEngineChildBundle(checkout, sealed.bundlePath))
        .toEqual({ status: 'stale', reason: recipeReason(sealed.bundlePath) });
    }
  });

  it('reports stale after the bundling code itself changes', () => {
    const checkout = scratchDirectory('source');
    const sealed = fakeCheckout(checkout);
    writeFileSync(join(checkout, ENGINE_CHILD_RECIPE_SOURCE), '// recipe v2\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'stale', reason: recipeReason(sealed.bundlePath) });
  });

  it('reports missing, not stale or invalid, when the offered bundle or its sidecar is absent', () => {
    const checkout = scratchDirectory('missing');
    const sealed = fakeCheckout(checkout);
    const absent = join(checkout, 'absent.mjs');
    expect(checkEngineChildBundle(checkout, absent))
      .toEqual({ status: 'missing', reason: `${absent} does not exist` });
    rmSync(sidecarOf(sealed.bundlePath));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'missing', reason: `${sidecarOf(sealed.bundlePath)} does not exist` });
  });

  it('rejects as invalid a bundle whose bytes differ from the output digest recorded beside it', () => {
    const checkout = scratchDirectory('bytes');
    const sealed = fakeCheckout(checkout);
    writeFileSync(sealed.bundlePath, 'export const engine = 1;\n// appended after sealing\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
      status: 'invalid',
      reason: `${sealed.bundlePath} does not hash to the output digest recorded beside it`,
    });
  });

  it('rejects as invalid, not stale, a sidecar whose key does not recompute from its own contents', () => {
    const checkout = scratchDirectory('key');
    const sealed = fakeCheckout(checkout);
    const sidecar = JSON.parse(readFileSync(sidecarOf(sealed.bundlePath), 'utf8')) as {
      inputs: { path: string; sha256: string }[];
    };
    const [first] = sidecar.inputs;
    if (first === undefined) throw new Error('The sealed sidecar records no inputs.');
    first.sha256 = '0'.repeat(64);
    writeFileSync(sidecarOf(sealed.bundlePath), JSON.stringify(sidecar));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
      status: 'invalid',
      reason: `${sidecarOf(sealed.bundlePath)} does not recompute to its own key`,
    });
  });

  it('rejects as invalid a sidecar that is not JSON or not a sidecar, and an offer that is not an .mjs bundle', () => {
    const checkout = scratchDirectory('shape');
    const sealed = fakeCheckout(checkout);
    const sidecar = sidecarOf(sealed.bundlePath);
    writeFileSync(sidecar, '{"key":');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'invalid', reason: `${sidecar} is not JSON` });
    writeFileSync(sidecar, JSON.stringify({ key: sealed.key, inputs: [] }));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath))
      .toEqual({ status: 'invalid', reason: `${sidecar} is not an engine child bundle sidecar` });
    const script = join(checkout, 'engine.js');
    expect(checkEngineChildBundle(checkout, script))
      .toEqual({ status: 'invalid', reason: `${script} is not an engine child bundle (.mjs)` });
  });

  it('re-checks the inputs on every call, so an edit in the same process turns a valid bundle stale and back', () => {
    const checkout = scratchDirectory('memo');
    const sealed = fakeCheckout(checkout);
    const engine = join(checkout, 'src/engine.ts');
    const original = readFileSync(engine);
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
    writeFileSync(engine, 'export const rule = 99;\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('stale');
    writeFileSync(engine, original);
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
  });

  it('reports stale in another checkout whose path prefixes the builder\'s, then valid in the builder', () => {
    const base = scratchDirectory('checkouts');
    const builder = join(base, 'checkout-2');
    const other = join(base, 'checkout-');
    const sealed = fakeCheckout(builder);
    fakeCheckout(other);
    expect(checkEngineChildBundle(other, sealed.bundlePath)).toEqual({
      status: 'stale',
      reason: `${sealed.bundlePath} was built from ${join(builder, 'src/corpus.txt')}, outside ${other}`,
    });
    expect(checkEngineChildBundle(builder, sealed.bundlePath).status).toBe('valid');
  });

  it('reports stale while the checkout has an .env file vite-node would load into the child', () => {
    const checkout = scratchDirectory('env');
    const sealed = fakeCheckout(checkout);
    for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
      writeFileSync(join(checkout, name), 'DND_LANE_INTEL_MODE=off\n');
      expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
        status: 'stale',
        reason: `vite-node would load ${join(checkout, name)} into the child and the bundle would not`,
      });
      rmSync(join(checkout, name));
    }
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
  });

  it('reports stale for an .env file in the envDir vite-node reads, and not for one it does not read', () => {
    const checkout = scratchDirectory('env-dir');
    fakeCheckout(checkout);
    const envDir = join(checkout, 'env');
    mkdirSync(envDir);
    const sealed = seal(checkout, 'export const engine = 2;\n', undefined, plainProfile(checkout, { envDir }));
    writeFileSync(join(checkout, '.env'), 'DND_LANE_INTEL_MODE=off\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
    for (const name of ['.env', '.env.local', '.env.development', '.env.development.local']) {
      writeFileSync(join(envDir, name), 'DND_LANE_INTEL_MODE=off\n');
      expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
        status: 'stale',
        reason: `vite-node would load ${join(envDir, name)} into the child and the bundle would not`,
      });
      rmSync(join(envDir, name));
    }
    mkdirSync(join(envDir, '.env'));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
    const envFilesOff = seal(checkout, 'export const engine = 3;\n', undefined, plainProfile(checkout, { envDir: null }));
    expect(checkEngineChildBundle(checkout, envFilesOff.bundlePath).status).toBe('valid');
  });

  it('reports stale when a vite-node child spawned here would resolve another import.meta.env', () => {
    const checkout = scratchDirectory('import-meta-env');
    fakeCheckout(checkout);
    const staging = seal(checkout, 'export const engine = 2;\n', undefined, plainProfile(checkout, { mode: 'staging' }));
    expect(checkEngineChildBundle(checkout, staging.bundlePath)).toEqual({
      status: 'stale',
      reason: 'vite-node would resolve import.meta.env.MODE to "staging"; the bundle defines "development"',
    });
    const based = seal(checkout, 'export const engine = 3;\n', undefined, plainProfile(checkout, { base: '/app/' }));
    expect(checkEngineChildBundle(checkout, based.bundlePath)).toEqual({
      status: 'stale',
      reason: 'vite-node would resolve import.meta.env.BASE_URL to "/app/"; the bundle defines "/"',
    });
    const plain = seal(checkout, 'export const engine = 4;\n');
    expect(checkEngineChildBundle(checkout, plain.bundlePath, { NODE_ENV: 'production' })).toEqual({
      status: 'stale',
      reason: 'vite-node would resolve import.meta.env.DEV to false; the bundle defines true',
    });
    for (const NODE_ENV of [undefined, '', 'development', 'test']) {
      expect(checkEngineChildBundle(checkout, plain.bundlePath, { NODE_ENV }).status, String(NODE_ENV)).toBe('valid');
    }
  });

  it('reports stale while the recorded vite-node profile holds a divergence', () => {
    const checkout = scratchDirectory('divergence');
    fakeCheckout(checkout);
    const divergence = 'vite-node would apply the define __ENGINE_PROBE__; the bundle does not';
    const sealed = seal(checkout, 'export const engine = 2;\n', undefined, plainProfile(checkout, {
      divergences: [divergence],
    }));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({ status: 'stale', reason: divergence });
  });

  it('reports stale when vite-node would load another config file, or a config input changed or lies outside the checkout', () => {
    const checkout = scratchDirectory('config');
    fakeCheckout(checkout);
    const config = join(checkout, 'vite.config.ts');
    const helper = join(checkout, 'config/helper.ts');
    mkdirSync(join(checkout, 'config'));
    writeFileSync(config, 'export default {};\n');
    writeFileSync(helper, 'export const helper = 1;\n');
    const sealed = seal(checkout, 'export const engine = 2;\n', undefined, plainProfile(checkout, {
      configFile: config, configInputs: [inputOf(helper), inputOf(config)],
    }));
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
    writeFileSync(join(checkout, 'vite.config.js'), 'export default {};\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
      status: 'stale',
      reason: `vite-node would load ${join(checkout, 'vite.config.js')}; the bundle was built against ${config}`,
    });
    rmSync(join(checkout, 'vite.config.js'));
    writeFileSync(helper, 'export const helper = 2;\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
      status: 'stale', reason: `config/helper.ts changed since ${sealed.bundlePath} was built`,
    });
    writeFileSync(helper, 'export const helper = 1;\n');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath).status).toBe('valid');
    rmSync(config);
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
      status: 'stale', reason: `vite-node would load no Vite config; the bundle was built against ${config}`,
    });
    const elsewhere = seal(checkout, 'export const engine = 3;\n', undefined, plainProfile(checkout, {
      configInputs: [{ path: '/elsewhere/vite.config.ts', sha256: '0'.repeat(64) }],
    }));
    expect(checkEngineChildBundle(checkout, elsewhere.bundlePath)).toEqual({
      status: 'stale', reason: `${elsewhere.bundlePath} was built from /elsewhere/vite.config.ts, outside ${checkout}`,
    });
  });

  it('reports stale when a variable the Vite config names differs where the child spawns', () => {
    const checkout = scratchDirectory('environment');
    fakeCheckout(checkout);
    const sealed = seal(checkout, 'export const engine = 2;\n', undefined, plainProfile(checkout, {
      environment: { PROBE_SET: sha256Hex('a'), PROBE_UNSET: null },
    }));
    const reason = (name: string) => `the Vite config reads ${name}, which is not what it was when the bundle was built`;
    expect(checkEngineChildBundle(checkout, sealed.bundlePath, { PROBE_SET: 'a' }).status).toBe('valid');
    expect(checkEngineChildBundle(checkout, sealed.bundlePath, { PROBE_SET: 'b' }))
      .toEqual({ status: 'stale', reason: reason('PROBE_SET') });
    expect(checkEngineChildBundle(checkout, sealed.bundlePath, {}))
      .toEqual({ status: 'stale', reason: reason('PROBE_SET') });
    expect(checkEngineChildBundle(checkout, sealed.bundlePath, { PROBE_SET: 'a', PROBE_UNSET: '' }))
      .toEqual({ status: 'stale', reason: reason('PROBE_UNSET') });
  });
});

describe('engine child bundle vite-node profile', () => {
  it('resolves the config file vite-node would load, its imports by bytes, its envDir, mode and base, and the variables it names', async () => {
    const checkout = scratchDirectory('profile');
    mkdirSync(join(checkout, 'config'));
    writeFileSync(join(checkout, 'config/env-dir.mjs'), "export const envDir = 'env';\n");
    writeFileSync(join(checkout, 'vite.config.mjs'), [
      "import { envDir } from './config/env-dir.mjs';",
      'export default {',
      '  envDir,',
      "  mode: process.env.ENGINE_CHILD_PROFILE_PROBE_MODE ?? 'staging',",
      "  base: process.env['ENGINE_CHILD_PROFILE_PROBE_BASE'] ?? '/',",
      '};',
      '',
    ].join('\n'));
    // Later in Vite's lookup order than vite.config.mjs, so vite-node never loads it.
    writeFileSync(join(checkout, 'vite.config.ts'), "export default { mode: 'decoy' };\n");
    vi.stubEnv('ENGINE_CHILD_PROFILE_PROBE_MODE', undefined);
    vi.stubEnv('ENGINE_CHILD_PROFILE_PROBE_BASE', '/probe/');
    expect(await resolveViteNodeProfile(checkout)).toEqual({
      configFile: join(checkout, 'vite.config.mjs'),
      configInputs: [inputOf(join(checkout, 'config/env-dir.mjs')), inputOf(join(checkout, 'vite.config.mjs'))],
      envDir: join(checkout, 'env'),
      mode: 'staging',
      base: '/probe/',
      environment: { ENGINE_CHILD_PROFILE_PROBE_BASE: sha256Hex('/probe/'), ENGINE_CHILD_PROFILE_PROBE_MODE: null },
      divergences: [],
    });
  });

  it('records as divergences a define, a module plugin hook, an alias, an esbuild option and an environment read it cannot bind', async () => {
    const checkout = scratchDirectory('divergent-profile');
    writeFileSync(join(checkout, 'vite.config.mjs'), [
      'const everything = process.env;',
      'export default {',
      "  define: { __ENGINE_PROBE__: JSON.stringify(Object.keys(everything).length > 0) },",
      "  resolve: { alias: { '@probe': '/probe' } },",
      '  esbuild: { keepNames: true },',
      '  plugins: [',
      "    { name: 'module-probe', transform() { return null; } },",
      "    { name: 'html-only', transformIndexHtml() { return undefined; } },",
      '  ],',
      '};',
      '',
    ].join('\n'));
    expect((await resolveViteNodeProfile(checkout)).divergences).toEqual([
      'vite.config.mjs reaches the environment in a way the bundle check cannot bind',
      'vite-node would apply the define __ENGINE_PROBE__; the bundle does not',
      'vite-node would run the transform hook of the Vite plugin module-probe; the bundle does not',
      'vite-node would resolve imports through the alias @probe; the bundle does not',
      'vite-node would transform with the esbuild option keepNames; the bundle does not',
    ]);
  });

  it('refuses to seal a profile when the config changes between its two resolutions', async () => {
    const checkout = scratchDirectory('moving-profile');
    mkdirSync(join(checkout, 'config'));
    const moving = join(checkout, 'config/mode.mjs');
    writeFileSync(moving, "export const mode = 'development';\n");
    // Every evaluation of the config edits a module it imports, as an editor
    // saving mid-resolution would.
    writeFileSync(join(checkout, 'vite.config.mjs'), [
      "import { appendFileSync } from 'node:fs';",
      "import { mode } from './config/mode.mjs';",
      `appendFileSync(${JSON.stringify(moving)}, '// saved\\n');`,
      'export default { mode };',
      '',
    ].join('\n'));
    await expect(resolveViteNodeProfile(checkout)).rejects.toThrow(
      `The Vite config in ${checkout} changed while the engine child bundle was resolving it. Nothing was sealed; re-run.`,
    );
  });
});

describe('engine child bundle selection', () => {
  it('runs vite-node resolved against the caller cwd when no bundle is offered', () => {
    const cwd = scratchDirectory('cwd');
    expect(engineChildArgs(cwd, launcher, undefined)).toEqual(viteNodeArgs(cwd));
  });

  it('spawns node on the bundle the global setup offered, through startMcpClient', () => {
    if (offeredByGlobalSetup === undefined) throw new Error('The global setup offered no engine child bundle.');
    expect(relative(engineChildBundleDirectory(root), offeredByGlobalSetup)).toMatch(/^[0-9a-f]{64}\.mjs$/);
    expect(checkEngineChildBundle(root, offeredByGlobalSetup).status).toBe('valid');
    expect(spawnedArgs(root)).toEqual([offeredByGlobalSetup, launcher]);
  });

  it('falls back to vite-node through startMcpClient while the environment the child inherits sets NODE_ENV=production', () => {
    if (offeredByGlobalSetup === undefined) throw new Error('The global setup offered no engine child bundle.');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(spawnedArgs(root)).toEqual(viteNodeArgs(root));
  });

  it('falls back to vite-node through startMcpClient for a stale offer and says so once on stderr', () => {
    const checkout = scratchDirectory('stale-offer');
    const sealed = fakeCheckout(checkout);
    writeFileSync(join(checkout, 'src/engine.ts'), 'export const rule = 3;\n');
    const writes = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.env[ENGINE_CHILD_BUNDLE_ENV] = sealed.bundlePath;
    expect(spawnedArgs(checkout)).toEqual(viteNodeArgs(checkout));
    expect(spawnedArgs(checkout)).toEqual(viteNodeArgs(checkout));
    expect(stderrLines(writes.mock.calls, sealed.bundlePath)).toEqual([
      `[engine-child-bundle] stale: src/engine.ts changed since ${sealed.bundlePath} was built. ` +
        'Engine children run under vite-node.\n',
    ]);
  });

  it('falls back to vite-node through startMcpClient for an offer that does not exist and says it is missing', () => {
    const checkout = scratchDirectory('missing-offer');
    const absent = join(checkout, 'gone.mjs');
    const writes = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.env[ENGINE_CHILD_BUNDLE_ENV] = absent;
    expect(spawnedArgs(checkout)).toEqual(viteNodeArgs(checkout));
    expect(stderrLines(writes.mock.calls, absent)).toEqual([
      `[engine-child-bundle] missing: ${absent} does not exist. Engine children run under vite-node.\n`,
    ]);
  });

  it('throws through startMcpClient and spawns nothing for an invalid offer', () => {
    const checkout = scratchDirectory('invalid-offer');
    const sealed = fakeCheckout(checkout);
    writeFileSync(sealed.bundlePath, 'throw new Error("not the sealed bundle");\n');
    process.env[ENGINE_CHILD_BUNDLE_ENV] = sealed.bundlePath;
    const launch = vi.fn();
    expect(() => startMcpClient(checkout, launcher, launch as unknown as typeof spawn))
      .toThrow(EngineChildBundleError);
    expect(launch).not.toHaveBeenCalled();
  });

  it('ends a conversation run with the bundle error, writing no row, for an invalid offer', async () => {
    const checkout = scratchDirectory('invalid-run');
    const sealed = fakeCheckout(checkout);
    writeFileSync(sealed.bundlePath, 'throw new Error("not the sealed bundle");\n');
    process.env[ENGINE_CHILD_BUNDLE_ENV] = sealed.bundlePath;
    const outPath = join(checkout, 'rows.jsonl');
    await expect(runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dm-mode', 'advice', '--board-image', 'off', '--dry-run',
    ]))).rejects.toThrow(new EngineChildBundleError(
      `${ENGINE_CHILD_BUNDLE_ENV}=${sealed.bundlePath} is not usable: ${sealed.bundlePath} does not hash to the ` +
        `output digest recorded beside it. It has NOT been used. Delete it, or unset ${ENGINE_CHILD_BUNDLE_ENV}, and re-run.`,
    ));
    expect(existsSync(outPath) ? readFileSync(outPath, 'utf8') : '').toBe('');
  });
});

describe('engine child bundle build', () => {
  let directory = '';
  let built: WrittenEngineChildBundle | undefined;
  let output = '';

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'dnd-engine-child-bundle-test-build-'));
    built = await buildEngineChildBundle(root, directory);
    output = readFileSync(built.bundlePath, 'utf8');
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function requireBuilt(): WrittenEngineChildBundle {
    if (built === undefined) throw new Error('The engine child bundle was not built.');
    return built;
  }

  it('records both ?raw corpus files as keyed inputs with their current digests', () => {
    for (const path of ['docs/srd/full/srd-5.2.1.txt', 'docs/srd/source/spell-descriptions.txt']) {
      expect(requireBuilt().inputs).toContainEqual({
        path: resolve(root, path),
        sha256: sha256Hex(readFileSync(resolve(root, path))),
      });
    }
  });

  it('records every module the bundle output contains', () => {
    const modules = new Set(output.split('\n').filter((line) => line.startsWith('// '))
      .map((line) => resolve(root, line.slice('// '.length).replace(/^raw-text:/, ''))));
    const recorded = new Set(requireBuilt().inputs.map((input) => input.path));
    expect(modules.size).toBeGreaterThan(90);
    expect([...modules].filter((module) => !recorded.has(module))).toEqual([]);
  });

  it('decodes ?raw text exactly as Vite\'s ?raw import does', () => {
    for (const [path, viaVite] of [
      ['docs/srd/full/srd-5.2.1.txt', bundledSrd521],
      ['docs/srd/source/spell-descriptions.txt', bundledSpellDescriptions],
    ] as const) {
      const module = rawTextModule(resolve(root, path));
      const decoded = JSON.parse(module.slice('export default '.length, -';'.length)) as unknown;
      expect(decoded === viaVite, path).toBe(true);
    }
  });

  it('overwrites a same-named bundle with the fresh build instead of trusting it', async () => {
    const own = scratchDirectory('overwrite');
    const first = await buildEngineChildBundle(root, own);
    writeFileSync(first.bundlePath, 'throw new Error("poisoned");\n');
    const second = await buildEngineChildBundle(root, own);
    expect(second.bundlePath).toBe(first.bundlePath);
    expect(checkEngineChildBundle(root, second.bundlePath).status).toBe('valid');
  });

  it('leaves no import.meta read in the output and refuses output that has one', () => {
    expect(output).not.toMatch(/\bimport\.meta\b/);
    expect(() => assertNoImportMeta('const mode = import.meta.env.MODE;'))
      .toThrow('The engine child bundle still contains import.meta.env.MODE.');
  });

  it('defines equal the import.meta.env a real vite-node child resolves', async () => {
    const child = spawn(process.execPath, [
      resolve(root, 'node_modules/vite-node/vite-node.mjs'),
      resolve(root, 'tests/fixtures/engine-child-bundle/import-meta-env-probe.ts'),
    ], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    const code = await new Promise<number | null>((resolveExit, reject) => {
      child.once('error', reject);
      child.once('close', resolveExit);
    });
    expect(code, Buffer.concat(stderr).toString('utf8')).toBe(0);
    const resolved = Object.fromEntries(Object.entries(
      JSON.parse(Buffer.concat(stdout).toString('utf8')) as Record<string, unknown>,
    ).filter(([key]) => !key.startsWith('VITE_')));
    expect(resolved).toEqual(VITE_CHILD_ENV);
    expect(engineChildRecipe(root).options.define).toEqual(Object.fromEntries(
      Object.entries(resolved).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
    ));
  });

  it('seals the bytes esbuild compiled, so an input edited during the build leaves the bundle stale', async () => {
    const checkout = scratchDirectory('build-interval');
    fakeCheckout(checkout);
    writeFileSync(join(checkout, ENGINE_CHILD_ENTRY), [
      "import { rule } from '../src/engine';",
      "import corpus from '../src/corpus.txt?raw';",
      'process.stdout.write(`${String(rule)} ${corpus}`);',
      '',
    ].join('\n'));
    const engine = join(checkout, 'src/engine.ts');
    const compiled = readFileSync(engine);
    const sealed = await buildEngineChildBundle(checkout, join(checkout, 'bundles'), {
      onInputRead: (path) => {
        if (path === engine) writeFileSync(engine, 'export const rule = 3;\n');
      },
    });
    const output = readFileSync(sealed.bundlePath, 'utf8');
    expect(output).toContain('rule = 2');
    expect(output).not.toContain('rule = 3');
    expect(sealed.inputs).toContainEqual({ path: engine, sha256: sha256Hex(compiled) });
    expect(checkEngineChildBundle(checkout, sealed.bundlePath)).toEqual({
      status: 'stale', reason: `src/engine.ts changed since ${sealed.bundlePath} was built`,
    });
  });

  it('binds the real checkout\'s vite-node profile: vite.config.ts and its imports, no divergence, the defines\' mode and base', () => {
    const { vite } = requireBuilt();
    expect(vite.configFile).toBe(resolve(root, 'vite.config.ts'));
    expect(vite.configInputs).toContainEqual(inputOf(resolve(root, 'vite.config.ts')));
    expect(vite.configInputs).toContainEqual(inputOf(resolve(root, 'tools/ai-bridge/plugin.ts')));
    expect(vite.divergences).toEqual([]);
    expect({ envDir: vite.envDir, mode: vite.mode, base: vite.base })
      .toEqual({ envDir: root, mode: VITE_CHILD_ENV.MODE, base: VITE_CHILD_ENV.BASE_URL });
    expect(Object.keys(vite.environment)).toEqual(['AI_BRIDGE_FAKE', 'STATIC_APP_CACHE_DIR']);
  });

  it('writes bundles inside the checkout, where bare package imports resolve without a link', () => {
    expect(relative(root, engineChildBundleDirectory(root))).toBe(join('.tmp', 'engine-child-bundle'));
  });

  it('sweeps other bundles and partial writes past the retention window, keeping the current key, recent files and foreign files', () => {
    const own = scratchDirectory('sweep');
    const now = Date.now();
    const current = 'a'.repeat(64);
    const old = 'b'.repeat(64);
    const recent = 'c'.repeat(64);
    const aged = now - 2 * ENGINE_CHILD_BUNDLE_RETENTION_MS;
    const fresh = now - ENGINE_CHILD_BUNDLE_RETENTION_MS / 2;
    const files: Readonly<Record<string, number>> = {
      [`${current}.mjs`]: aged,
      [`${current}.json`]: aged,
      [`${old}.mjs`]: aged,
      [`${old}.json`]: aged,
      [`${old}.mjs.4242.dead.partial`]: aged,
      [`${recent}.mjs`]: fresh,
      [`${recent}.json`]: fresh,
      [`${recent}.json.4343.live.partial`]: fresh,
      'notes.txt': aged,
    };
    for (const [name, modified] of Object.entries(files)) {
      writeFileSync(join(own, name), name);
      utimesSync(join(own, name), modified / 1000, modified / 1000);
    }
    expect(sweepEngineChildBundles(own, current, now)).toEqual([
      `${old}.json`, `${old}.mjs`, `${old}.mjs.4242.dead.partial`,
    ]);
    expect([...readdirSync(own)].sort()).toEqual([
      `${current}.json`, `${current}.mjs`,
      `${recent}.json`, `${recent}.json.4343.live.partial`, `${recent}.mjs`,
      'notes.txt',
    ]);
  });
});
