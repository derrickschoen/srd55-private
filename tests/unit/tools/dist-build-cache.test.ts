import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

interface Descriptor {
  readonly script: string;
  readonly args: readonly string[];
}

interface OverlayRecord {
  readonly status: Buffer;
  readonly current: Buffer;
  readonly old?: Buffer;
}

type CacheVerdict =
  | { readonly cacheable: true; readonly head: string; readonly key: string }
  | { readonly cacheable: false; readonly head?: string; readonly reason: string };

interface CacheModule {
  readonly HIT_GUARD_DESCRIPTOR: Descriptor;
  readonly VALIDATED_BUILD_DESCRIPTORS: readonly Descriptor[];
  readonly distCacheVerdict: (root: string, parent?: NodeJS.ProcessEnv) => CacheVerdict;
  readonly productionBuildEnv: (parent: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  readonly sortOverlayRecords: (records: readonly OverlayRecord[]) => OverlayRecord[];
}

function exposesCacheModule(value: unknown): value is CacheModule {
  return typeof value === 'object' && value !== null &&
    'distCacheVerdict' in value && typeof value.distCacheVerdict === 'function' &&
    'productionBuildEnv' in value && typeof value.productionBuildEnv === 'function' &&
    'sortOverlayRecords' in value && typeof value.sortOverlayRecords === 'function' &&
    'HIT_GUARD_DESCRIPTOR' in value && 'VALIDATED_BUILD_DESCRIPTORS' in value;
}

const importedCacheModule: unknown = await import(
  new URL('../../../tools/dist-build-cache.mjs', import.meta.url).href
);
if (!exposesCacheModule(importedCacheModule)) throw new TypeError('Invalid dist cache module exports.');
const {
  HIT_GUARD_DESCRIPTOR,
  VALIDATED_BUILD_DESCRIPTORS,
  distCacheVerdict,
  productionBuildEnv,
  sortOverlayRecords,
} = importedCacheModule;

const modulePath = join(process.cwd(), 'tools/dist-build-cache.mjs');
const npmCliCandidate = join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
const roots: string[] = [];

interface Fixture {
  readonly root: string;
  readonly temporary: string;
}

interface CacheRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function write(root: string, path: string, contents: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

function executable(root: string, path: string, contents: string): void {
  write(root, path, contents);
  chmodSync(join(root, path), 0o755);
}

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  }).trim();
}

function commit(root: string, message = 'fixture'): string {
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

function createFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'dnd-dist-cache-test-'));
  const temporary = join(root, '.tmp');
  roots.push(root);
  git(root, ['init', '-q']);
  git(root, ['config', 'user.name', 'Cache Test']);
  git(root, ['config', 'user.email', 'cache@example.invalid']);
  write(root, '.gitignore', ['dist/', 'node_modules/', '.tmp/', 'public/ignored*/'].join('\n') + '\n');
  write(root, 'package.json', JSON.stringify({
    type: 'module',
    scripts: {
      build: 'tsc -b && node tools/dist-build-cache.mjs',
      'build:dist': 'vite build --configLoader runner',
      'build:dist:validated': 'tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs',
    },
  }) + '\n');
  write(root, 'package-lock.json', JSON.stringify({
    lockfileVersion: 3,
    packages: {
      '': { name: 'fixture', version: '1.0.0' },
      'node_modules/demo': {
        version: '1.2.3',
        resolved: 'https://example.invalid/demo.tgz',
        integrity: 'sha512-demo',
      },
    },
  }) + '\n');
  write(root, 'src/app.ts', 'export const value = 1;\n');
  write(root, 'src/worker/handlers/base.ts', 'export const base = true;\n');
  write(root, 'drizzle/0001.sql', 'select 1;\n');
  write(root, 'docs/guide.md', 'guide\n');
  write(root, 'tests/example.test.ts', 'export const testValue = 1;\n');
  write(root, 'public/base.txt', 'base\n');
  write(root, 'vite.config.mjs', [
    'export const undeclared = process.env.CACHE_TEST_SECRET;',
    'export default { undeclared };',
  ].join('\n'));
  // The tracked copy makes the fixture key cover the exact implementation under test.
  write(root, 'tools/dist-build-cache.mjs', readFileSync(modulePath, 'utf8'));
  commit(root);
  mkdirSync(temporary, { recursive: true });
  write(root, 'node_modules/.package-lock.json', JSON.stringify({
    lockfileVersion: 3,
    packages: {
      'node_modules/demo': {
        version: '1.2.3',
        resolved: 'https://example.invalid/demo.tgz',
        integrity: 'sha512-demo',
      },
    },
  }) + '\n');
  executable(root, 'node_modules/typescript/bin/tsc', [
    '#!/usr/bin/env node',
    "import { appendFileSync } from 'node:fs';",
    "appendFileSync('node_modules/steps.log', `tsc ${process.argv.slice(2).join(' ')}\\n`);",
  ].join('\n'));
  executable(root, 'node_modules/vite/bin/vite.js', [
    '#!/usr/bin/env node',
    "import { execFileSync } from 'node:child_process';",
    "import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';",
    "const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();",
    "const countFile = 'node_modules/build-count';",
    "const count = existsSync(countFile) ? Number(readFileSync(countFile, 'utf8')) + 1 : 1;",
    "writeFileSync(countFile, String(count));",
    "appendFileSync('node_modules/steps.log', `vite ${process.argv.slice(2).join(' ')}\\n`);",
    "if (existsSync('node_modules/mutate-input')) appendFileSync('src/app.ts', '// changed during build\\n');",
    "const commit = existsSync('node_modules/wrong-head') ? '0'.repeat(40) : head;",
    "const assets = ['assets/index-az.js', 'assets/index-aaa.js'].sort((a, b) => a.localeCompare(b));",
    "const config = (await import(new URL('../../../vite.config.mjs', import.meta.url).href)).default;",
    "rmSync('dist', { recursive: true, force: true });",
    "mkdirSync('dist', { recursive: true });",
    "writeFileSync('dist/vtt-handoff-artifact.json', JSON.stringify({ commit }));",
    "writeFileSync('dist/observed.json', JSON.stringify({",
    "  secret: config.undeclared,",
    "  sentinel: process.env.NPM_SENTINEL,",
    "  nodeOptions: process.env.NODE_OPTIONS,",
    "  lang: process.env.LANG,",
    "  lcAll: process.env.LC_ALL,",
    "  assets,",
    "}));",
  ].join('\n'));
  mkdirSync(join(root, 'node_modules/.bin'), { recursive: true });
  symlinkSync('../typescript/bin/tsc', join(root, 'node_modules/.bin/tsc'));
  symlinkSync('../vite/bin/vite.js', join(root, 'node_modules/.bin/vite'));
  write(root, 'node_modules/npm/bin/npm-cli.js', [
    "import { spawnSync } from 'node:child_process';",
    `const result = spawnSync(process.execPath, [${JSON.stringify(npmCliCandidate)}, ...process.argv.slice(2)], {`,
    "  env: process.env, stdio: 'inherit',",
    '});',
    'process.exitCode = result.status ?? 1;',
  ].join('\n'));
  write(root, 'tools/assert-dist-clean.mjs', [
    "import { appendFileSync, readFileSync } from 'node:fs';",
    "JSON.parse(readFileSync('dist/vtt-handoff-artifact.json', 'utf8'));",
    "appendFileSync('node_modules/guard.log', `${process.env.LANG}|${process.env.LC_ALL}\\n`);",
    "process.stdout.write('dist clean: 2 files scanned\\n');",
  ].join('\n'));
  return { root, temporary };
}

function verdict(fixture: Fixture, parent: NodeJS.ProcessEnv = process.env) {
  return distCacheVerdict(fixture.root, parent);
}

function key(fixture: Fixture, parent: NodeJS.ProcessEnv = process.env): string {
  const result = verdict(fixture, parent);
  expect(result.cacheable).toBe(true);
  if (!result.cacheable) throw new Error(`unexpected bypass: ${result.reason}`);
  return result.key;
}

function runCache(fixture: Fixture, extra: NodeJS.ProcessEnv = {}): CacheRun {
  const home = join(fixture.root, 'node_modules/home');
  mkdirSync(home, { recursive: true });
  const result = spawnSync(process.execPath, [join(fixture.root, 'tools/dist-build-cache.mjs')], {
    cwd: fixture.root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: join(fixture.root, 'node_modules/empty-gitconfig'),
      GIT_CONFIG_NOSYSTEM: '1',
      HOME: home,
      TMPDIR: fixture.temporary,
      ...extra,
    },
  });
  if (result.error !== undefined) throw new Error(result.error.message);
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runPublicBuild(fixture: Fixture, extra: NodeJS.ProcessEnv = {}): CacheRun {
  const home = extra.HOME ?? join(fixture.root, 'node_modules/home');
  mkdirSync(home, { recursive: true });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: join(fixture.root, 'node_modules/empty-gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    HOME: home,
    TMPDIR: fixture.temporary,
    ...extra,
  };
  delete env.NODE_OPTIONS;
  const command = existsSync(npmCliCandidate) ? process.execPath : 'npm';
  const args = existsSync(npmCliCandidate) ? [npmCliCandidate, 'run', 'build'] : ['run', 'build'];
  const result = spawnSync(command, args, { cwd: fixture.root, encoding: 'utf8', env });
  if (result.error !== undefined) throw new Error(result.error.message);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function withGitMutation(fixture: Fixture, mutation: string): CacheVerdict {
  const bin = join(fixture.root, 'node_modules/fake-git');
  executable(fixture.root, 'node_modules/fake-git/git', [
    '#!/usr/bin/env node',
    "import { readFileSync } from 'node:fs';",
    "import { spawnSync } from 'node:child_process';",
    'const args = process.argv.slice(2);',
    "const input = readFileSync(0);",
    `const result = spawnSync(${JSON.stringify(realGit)}, args, { input, cwd: process.cwd() });`,
    'if (result.error !== undefined) {',
    '  process.stderr.write(`${result.error.message}\\n`);',
    '  process.exit(1);',
    '}',
    'let output = Buffer.from(result.stdout);',
    "const selected = process.env.M2_FAKE_GIT;",
    "if (selected === 'index-mode' && args[0] === 'ls-files' && args.includes('-s')) {",
    "  output = Buffer.concat([Buffer.from('10x644'), output.subarray(6)]);",
    '}',
    "if (selected === 'index-stage' && args[0] === 'ls-files' && args.includes('-s')) {",
    "  const marker = output.indexOf(Buffer.from(' 0\\t'));",
    '  output[marker + 1] = 57;',
    '}',
    "if (selected === 'verbose-shape' && args[0] === 'ls-files' && args.includes('-v')) output[1] = 88;",
    "const replaceField = (bytes, field, value) => {",
    '  let start = 0;',
    '  for (let index = 0; index < field; index += 1) start = bytes.indexOf(0, start) + 1;',
    '  const end = bytes.indexOf(0, start);',
    '  return Buffer.concat([bytes.subarray(0, start), Buffer.from(value), bytes.subarray(end)]);',
    '};',
    "if (selected === 'attr-path' && args[0] === 'check-attr') output = replaceField(output, 0, 'wrong-path');",
    "if (selected === 'attr-name' && args[0] === 'check-attr') output = replaceField(output, 1, 'wrong-name');",
    "if (selected === 'reverse-public' && args[0] === 'ls-files' && args.includes('public')) {",
    '  const records = output.subarray(0, -1).toString().split("\\0").reverse();',
    '  output = Buffer.from(`${records.join("\\0")}\\0`);',
    '}',
    'process.stdout.write(output);',
    'process.stderr.write(result.stderr);',
    'process.exitCode = result.status ?? 1;',
  ].join('\n'));
  const [oldPath, oldMutation] = [process.env.PATH, process.env.M2_FAKE_GIT];
  process.env.PATH = `${bin}:${oldPath ?? ''}`;
  process.env.M2_FAKE_GIT = mutation;
  try {
    return verdict(fixture);
  } finally {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    if (oldMutation === undefined) delete process.env.M2_FAKE_GIT;
    else process.env.M2_FAKE_GIT = oldMutation;
  }
}

function hiddenLock(root: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, 'node_modules/.package-lock.json'), 'utf8')) as Record<string, unknown>;
}

function cacheRoot(fixture: Fixture): string {
  return join(fixture.temporary, 'dnd-dist-build-cache-v2');
}

function digestDirectory(directory: string): string {
  const hash = createHash('sha256');
  const frame = (value: string | Buffer): void => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const length = Buffer.allocUnsafe(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(length).update(bytes);
  };
  const visit = (root: string): string[] => readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? visit(path) : [path];
  });
  frame('dnd-dist-build-cache-v2');
  for (const path of visit(directory).sort()) {
    frame(relative(directory, path).split(sep).join('/'));
    frame(readFileSync(path));
  }
  return hash.digest('hex');
}

function setHiddenPackageField(fixture: Fixture, field: string, value: string): void {
  const lock = hiddenLock(fixture.root);
  const packages = lock.packages as Record<string, Record<string, unknown>>;
  packages['node_modules/demo']![field] = value;
  write(fixture.root, 'node_modules/.package-lock.json', JSON.stringify(lock) + '\n');
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('productionBuildEnv', () => {
  it('overrides an inherited NODE_ENV with production', () => {
    expect(productionBuildEnv({ NODE_ENV: 'test' })).toEqual({
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      NODE_ENV: 'production',
    });
  });

  it('sets NODE_ENV to production when the parent leaves it unset', () => {
    expect(productionBuildEnv({})).toEqual({
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      NODE_ENV: 'production',
    });
  });

  it('drops undeclared parent variables and keeps only execution allowlist values', () => {
    const parentEnv = {
      NODE_ENV: 'development',
      PATH: '/bin',
      HOME: '/home/example',
      TMPDIR: '/tmp/example',
      TZ: 'UTC',
      STATIC_APP_CACHE_DIR: '/cache',
      LANG: 'da_DK.UTF-8',
      LC_ALL: 'da_DK.UTF-8',
      CUSTOM_BUILD_SETTING: 'drop',
      VITE_SECRET: 'drop',
      NODE_OPTIONS: '--inspect',
      npm_config_userconfig: '/host/.npmrc',
    };
    const childEnv = productionBuildEnv(parentEnv);
    expect(childEnv).not.toBe(parentEnv);
    expect(parentEnv.NODE_ENV).toBe('development');
    expect(childEnv).toEqual({
      PATH: '/bin',
      HOME: '/home/example',
      TMPDIR: '/tmp/example',
      TZ: 'UTC',
      NODE_ENV: 'production',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      STATIC_APP_CACHE_DIR: '/cache',
    }); // SPREAD_PARENT_ENV and PASS_PARENT_LOCALE
  });
});

describe('public script and direct descriptor equivalence', () => {
  it('DIRECT_DESCRIPTORS_MATCH_SCRIPT_LEAVES', () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    expect(manifest.scripts.build).toBe('tsc -b && node tools/dist-build-cache.mjs');
    expect(manifest.scripts['build:dist']).toBe('vite build --configLoader runner');
    expect(manifest.scripts['build:dist:validated']).toBe(
      'tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs',
    );
    expect(HIT_GUARD_DESCRIPTOR).toEqual({ script: 'tools/assert-dist-clean.mjs', args: [] });
    expect(VALIDATED_BUILD_DESCRIPTORS).toEqual([
      { script: 'node_modules/typescript/bin/tsc', args: ['-b'] },
      { script: 'node_modules/vite/bin/vite.js', args: ['build', '--configLoader', 'runner'] },
      { script: 'tools/assert-dist-clean.mjs', args: [] },
    ]); // SPAWN_NPM and DROP_HIT_GUARD descriptor contract
  });
});

describe('Git-key behavior', () => {
  it('TRACKED_SRC_CONTENT_MISS', () => {
    const fixture = createFixture();
    const before = key(fixture);
    const source = join(fixture.root, 'src/app.ts');
    const timestamp = statSync(source).mtime;
    write(fixture.root, 'src/app.ts', 'export const value = 2;\n');
    execFileSync('touch', ['-d', timestamp.toISOString(), source]);
    expect(key(fixture)).not.toBe(before); // DROP_STATUS_OVERLAY
  });

  it('DIRTY_BYTES_BEAT_MTIME', () => {
    const fixture = createFixture();
    const source = join(fixture.root, 'src/app.ts');
    const timestamp = statSync(source).mtime;
    write(fixture.root, 'src/app.ts', 'export const value = 2;\n');
    execFileSync('touch', ['-d', timestamp.toISOString(), source]);
    const first = key(fixture);
    write(fixture.root, 'src/app.ts', 'export const value = 3;\n');
    execFileSync('touch', ['-d', timestamp.toISOString(), source]);
    expect(key(fixture)).not.toBe(first); // DROP_HASH_OBJECT
  });

  it('UNTRACKED_GLOB_FILE_MISS', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'src/worker/handlers/new-handler.ts', 'export const added = true;\n');
    expect(key(fixture)).not.toBe(before);
  });

  it('DRIZZLE_RAW_CONTENT_MISS', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'drizzle/0001.sql', 'select 2;\n');
    expect(key(fixture)).not.toBe(before);
  });

  it('DOCS_RAW_CONTENT_MISS', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'docs/guide.md', 'changed guide\n');
    expect(key(fixture)).not.toBe(before);
  });

  it('TEST_FILE_CONTENT_MISS', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'tests/example.test.ts', 'export const testValue = 2;\n');
    expect(key(fixture)).not.toBe(before);
  });

  it('IGNORED_PUBLIC_FILE_MISS', () => {
    const fixture = createFixture();
    const withoutPublic = key(fixture);
    write(fixture.root, 'public/ignored-z/z.txt', 'zed\n');
    write(fixture.root, 'public/ignored-a/a.txt', 'aye\n');
    const records = execFileSync('git', [
      'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'public',
    ], { cwd: fixture.root }).subarray(0, -1).toString().split('\0');
    expect(records).toEqual([...records].sort()); // DROP_IGNORED_PUBLIC ordering control
    expect(records).toHaveLength(2);
    expect(records.map((path) => git(fixture.root, ['hash-object', '--no-filters', path]))).toEqual([
      '35b57f48bdd9bd09800c5433eff6d3d758830c27',
      '6c24c44cfa29bde0a5cd71bfb4a28278f32a162c',
    ]);
    const baseline = key(fixture);
    expect(baseline).not.toBe(withoutPublic); // DROP_IGNORED_PUBLIC
    const reversed = withGitMutation(fixture, 'reverse-public');
    expect(reversed).toMatchObject({ cacheable: true, key: baseline }); // DROP_PUBLIC_SORT
    write(fixture.root, 'public/ignored-a/a.txt', 'aye changed\n');
    const changedA = key(fixture);
    write(fixture.root, 'public/ignored-a/a.txt', 'aye\n');
    write(fixture.root, 'public/ignored-z/z.txt', 'zed changed\n');
    const changedZ = key(fixture);
    expect(changedA).not.toBe(baseline); // DROP_PUBLIC_CONTENT_IDS
    expect(changedZ).not.toBe(baseline); // DROP_PUBLIC_CONTENT_IDS
    expect(changedZ).not.toBe(changedA); // DROP_PUBLIC_CONTENT_IDS
  });

  it('DECLARED_STATIC_CACHE_DIR_MISS', () => {
    const fixture = createFixture();
    expect(key(fixture, { STATIC_APP_CACHE_DIR: '/a' })).not.toBe(
      key(fixture, { STATIC_APP_CACHE_DIR: '/b' }),
    );
  });

  it('UNDECLARED_ENV_IS_HERMETIC', () => {
    const fixture = createFixture();
    const before = key(fixture, {});
    const after = key(fixture, { CACHE_TEST_SECRET: 'not-declared' });
    expect(after).toBe(before);
    const run = runCache(fixture, { CACHE_TEST_SECRET: 'not-declared' });
    expect(run.status).toBe(0);
    const observed = JSON.parse(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8'));
    expect(observed.secret).toBeUndefined();
  });

  it.each([false, true])('VITE_ENV_FILE_MISS ignored=%s', (ignored) => {
    const fixture = createFixture();
    if (ignored) {
      const ignore = readFileSync(join(fixture.root, '.gitignore'), 'utf8');
      write(fixture.root, '.gitignore', ignore + '.env.production\n');
      commit(fixture.root, 'ignore env');
    }
    const before = key(fixture);
    write(fixture.root, '.env.production', 'VITE_VALUE=changed\n');
    expect(key(fixture)).not.toBe(before); // DROP_ENV_PROBES
  });

  it('HEAD_ONLY_CHANGE_MISS', () => {
    const fixture = createFixture();
    const keyBefore = key(fixture);
    git(fixture.root, ['commit', '--allow-empty', '-q', '-m', 'new head']);
    const keyAfter = key(fixture);
    expect(keyAfter).not.toBe(keyBefore); // DROP_HEAD
    const miss = runCache(fixture);
    expect(miss.stdout).toContain(`dist cache miss: ${keyAfter}`);
    rmSync(join(fixture.root, 'dist'), { recursive: true, force: true });
    const hit = runCache(fixture);
    expect(hit.stdout).toContain(`dist cache hit: ${keyAfter}`);
    const artifact = JSON.parse(readFileSync(join(fixture.root, 'dist/vtt-handoff-artifact.json'), 'utf8'));
    expect(artifact.commit).toBe(git(fixture.root, ['rev-parse', 'HEAD']));
  });

  it('HIDDEN_LOCK_STALE_BYPASS', () => {
    const fixture = createFixture();
    const lock = hiddenLock(fixture.root);
    const packages = lock.packages as Record<string, unknown>;
    delete packages['node_modules/demo'];
    write(fixture.root, 'node_modules/.package-lock.json', JSON.stringify(lock) + '\n');
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'stale-install' });
    const run = runCache(fixture);
    const cacheLines = run.stdout.split('\n').filter((line) => line.startsWith('dist cache'));
    expect(cacheLines).toEqual(['dist cache bypass: stale-install']); // ACCEPT_STALE_INSTALL
    expect(existsSync(cacheRoot(fixture))).toBe(false);
  });

  it('HIDDEN_LOCK_METADATA_STALE_BYPASS', () => {
    for (const field of ['resolved', 'integrity']) {
      const fixture = createFixture();
      setHiddenPackageField(fixture, field, 'changed');
      expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'stale-install' });
    }
  });

  it('ASSUME_UNCHANGED_BYPASS', () => {
    for (const option of ['--assume-unchanged', '--skip-worktree']) {
      const fixture = createFixture();
      git(fixture.root, ['update-index', option, 'src/app.ts']);
      expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'special-index' });
    }
  });

  it('SUBMODULE_BYPASS', () => {
    const fixture = createFixture();
    const head = git(fixture.root, ['rev-parse', 'HEAD']);
    git(fixture.root, ['update-index', '--add', '--cacheinfo', `160000,${head},vendor/submodule`]);
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'submodule' });
  });

  it('INDEXED_SYMLINK_BYPASS', () => {
    const fixture = createFixture();
    symlinkSync('src/app.ts', join(fixture.root, 'linked'));
    commit(fixture.root, 'tracked symlink');
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'symlink' }); // DROP_SYMLINK_BYPASS
  });

  it('UNTRACKED_SYMLINK_BYPASS', () => {
    const fixture = createFixture();
    symlinkSync('src/app.ts', join(fixture.root, 'untracked-link'));
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'symlink' }); // ALLOW_SYMLINK
  });

  it('AUTOCRLF_BYPASS', () => {
    const fixture = createFixture();
    git(fixture.root, ['config', 'core.autocrlf', 'true']);
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'normalization' }); // ALLOW_NORMALIZATION
  });

  it('TRACKED_ATTRIBUTES_BYPASS', () => {
    const fixture = createFixture();
    write(fixture.root, '.gitattributes', '* -text\n');
    git(fixture.root, ['add', '.gitattributes']);
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'normalization' });
  });

  it('EFFECTIVE_ATTRIBUTES_BYPASS', () => {
    const fixtures: Array<() => Fixture> = [
      () => {
        const fixture = createFixture();
        write(fixture.root, '.gitattributes', '*.ts -text\n');
        return fixture;
      },
      () => {
        const fixture = createFixture();
        write(fixture.root, '.git/info/attributes', '*.ts -text\n');
        return fixture;
      },
      () => {
        const fixture = createFixture();
        const attributes = join(fixture.root, 'node_modules/configured-attributes');
        writeFileSync(attributes, '*.ts -text\n');
        git(fixture.root, ['config', 'core.attributesFile', attributes]);
        return fixture;
      },
    ];
    for (const make of fixtures) {
      expect(verdict(make())).toMatchObject({ cacheable: false, reason: 'normalization' });
    }
    const userFixture = createFixture();
    const xdg = join(userFixture.root, 'node_modules/xdg');
    write(userFixture.root, 'node_modules/xdg/git/attributes', '*.ts -text\n');
    const oldXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = xdg;
    expect(verdict(userFixture)).toMatchObject({ cacheable: false, reason: 'normalization' });
    if (oldXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = oldXdg;
    const systemFixture = createFixture();
    const systemAttributes = join(systemFixture.root, 'node_modules/system-attributes');
    const systemConfig = join(systemFixture.root, 'node_modules/system-config');
    writeFileSync(systemAttributes, '*.ts -text\n');
    writeFileSync(systemConfig, `[core]\n\tattributesFile = ${systemAttributes}\n`);
    const oldSystem = process.env.GIT_CONFIG_SYSTEM;
    process.env.GIT_CONFIG_SYSTEM = systemConfig;
    expect(verdict(systemFixture)).toMatchObject({ cacheable: false, reason: 'normalization' });
    // DROP_EFFECTIVE_ATTRS and DROP_ATTR_CHECK
    if (oldSystem === undefined) delete process.env.GIT_CONFIG_SYSTEM;
    else process.env.GIT_CONFIG_SYSTEM = oldSystem;
  });

  it('GIT_FAILURE_BYPASS', () => {
    const root = mkdtempSync(join(tmpdir(), 'dnd-dist-cache-not-git-'));
    roots.push(root);
    expect(distCacheVerdict(root)).toMatchObject({ cacheable: false, reason: 'git-failure' });
  });

  it('MALFORMED_INDEX_MODE_GIT_FAILURE', () => {
    const fixture = createFixture();
    expect(withGitMutation(fixture, 'index-mode')).toMatchObject({
      cacheable: false,
      reason: 'git-failure',
    });
  });

  it('MALFORMED_INDEX_STAGE_GIT_FAILURE', () => {
    const fixture = createFixture();
    expect(withGitMutation(fixture, 'index-stage')).toMatchObject({
      cacheable: false,
      reason: 'git-failure',
    });
  });

  it('MALFORMED_VERBOSE_RECORD_GIT_FAILURE', () => {
    const fixture = createFixture();
    expect(withGitMutation(fixture, 'verbose-shape')).toMatchObject({
      cacheable: false,
      reason: 'git-failure',
    });
  });

  it('MALFORMED_ATTR_PATH_GIT_FAILURE', () => {
    const fixture = createFixture();
    expect(withGitMutation(fixture, 'attr-path')).toMatchObject({
      cacheable: false,
      reason: 'git-failure',
    }); // DROP_ATTR_PATH_CHECK
  });

  it('MALFORMED_ATTR_NAME_GIT_FAILURE', () => {
    const fixture = createFixture();
    expect(withGitMutation(fixture, 'attr-name')).toMatchObject({
      cacheable: false,
      reason: 'git-failure',
    }); // DROP_ATTR_PATH_CHECK
  });

  it('INVALID_HEAD_BYPASS', () => {
    const root = mkdtempSync(join(tmpdir(), 'dnd-dist-cache-sha256-'));
    roots.push(root);
    git(root, ['init', '-q', '--object-format=sha256']);
    git(root, ['config', 'user.name', 'Cache Test']);
    git(root, ['config', 'user.email', 'cache@example.invalid']);
    write(root, 'file.txt', 'content\n');
    commit(root);
    expect(distCacheVerdict(root)).toMatchObject({ cacheable: false, reason: 'invalid-head' });
  });

  it('INPUT_CHANGED_DURING_BUILD_NOT_STORED', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'node_modules/mutate-input', 'yes\n');
    const run = runCache(fixture);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('dist cache unstable-inputs'); // SKIP_POST_BUILD_RECHECK
    expect(existsSync(join(cacheRoot(fixture), `${before}.json`))).toBe(false);
    const entries = existsSync(cacheRoot(fixture)) ? readdirSync(cacheRoot(fixture), { recursive: true }) : [];
    expect(entries).not.toContain(`${before}.json`);
  });

  it('CORRUPTED_GENERATION_REBUILDS', () => {
    const fixture = createFixture();
    const first = runCache(fixture);
    expect(first.status).toBe(0);
    const cache = cacheRoot(fixture);
    const pointerName = readdirSync(cache).find((name) => name.endsWith('.json'));
    expect(pointerName).toBeDefined();
    const pointer = JSON.parse(readFileSync(join(cache, pointerName!), 'utf8'));
    write(join(cache, 'generations', pointer.generation), 'dist/observed.json', '{"corrupt":true}\n');
    const second = runCache(fixture);
    expect(second.stdout).toContain('dist cache miss:');
    expect(readFileSync(join(fixture.root, 'node_modules/build-count'), 'utf8')).toBe('2');
  });

  it('DIST_OUTPUT_IS_IGNORED', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'dist/arbitrary.txt', 'ignored output\n');
    expect(key(fixture)).toBe(before);
  });

  it('TRACKED_DELETION_MISS', () => {
    const fixture = createFixture();
    const before = key(fixture);
    rmSync(join(fixture.root, 'src/app.ts'));
    expect(key(fixture)).not.toBe(before); // IGNORE_DELETIONS
  });

  it('OVERLAY_ORDER_IS_CANONICAL', () => {
    const records = [
      { status: Buffer.from('??'), current: Buffer.from('z') },
      { status: Buffer.from(' M'), current: Buffer.from('a') },
    ];
    const digest = (input: typeof records): string => createHash('sha256').update(Buffer.concat(
      sortOverlayRecords(input).flatMap((record) => [record.status, record.current]),
    )).digest('hex');
    expect(digest([...records].reverse())).toBe(digest(records)); // UNSORTED_OVERLAY
  });

  it('PATH_BYTES_ARE_NUL_PARSED', () => {
    const fixture = createFixture();
    const before = key(fixture);
    write(fixture.root, 'src/a file\twith-tab.ts', 'content\n');
    expect(key(fixture)).not.toBe(before);
  });

  it.each([
    ['line-feed', 'src/line\nfeed.ts', 'src/line'],
    ['carriage-return', 'src/line\r', 'src/line'],
    ['quoted-root', '\"package.json\"', 'package.json'],
    ['quoted-basename', 'src/\"package.json\"', 'src/package.json'],
    ['quoted-whole-path', '\"tools/x.mjs\"', 'tools/x.mjs'],
  ])('UNSUPPORTED_BATCH_PATH_BYPASS %s', (_label, unsafe, ordinary) => {
    const fixture = createFixture();
    write(fixture.root, ordinary, 'ordinary\n');
    write(fixture.root, unsafe, 'literal unsafe path\n');
    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'unsupported-path' });
    // DROP_QUOTE_BYPASS and the newline/CR batch-parser controls.
  });

  it('WRONG_ARTIFACT_HEAD_NEVER_HITS', () => {
    const fixture = createFixture();
    expect(runCache(fixture).status).toBe(0);
    const cache = cacheRoot(fixture);
    const pointerName = readdirSync(cache).find((name) => name.endsWith('.json'))!;
    const pointerPath = join(cache, pointerName);
    const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
    const generation = join(cache, 'generations', pointer.generation, 'dist');
    write(generation, 'vtt-handoff-artifact.json', JSON.stringify({ commit: '0'.repeat(40) }));
    pointer.distDigest = digestDirectory(generation);
    writeFileSync(pointerPath, JSON.stringify(pointer) + '\n');
    const second = runCache(fixture);
    expect(second.stdout).not.toContain('dist cache hit:');
    expect(second.stdout).toContain('dist cache miss:');
    expect(readFileSync(join(fixture.root, 'node_modules/build-count'), 'utf8')).toBe('2');
  });

  it('MISS_WRONG_ARTIFACT_HEAD_FAILS', () => {
    const fixture = createFixture();
    write(fixture.root, 'node_modules/wrong-head', 'yes\n');
    const run = runCache(fixture);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('artifact commit');
    expect(run.stdout).not.toContain('dist cache stored:');
  });
});

describe('scrubbed build execution', () => {
  it('FIXED_LOCALE_OUTPUT', () => {
    const outputs: string[] = [];
    for (const locale of ['en_US.UTF-8', 'da_DK.UTF-8']) {
      const fixture = createFixture();
      const miss = runPublicBuild(fixture, { LANG: locale, LC_ALL: locale });
      expect(miss.status).toBe(0);
      expect(miss.stdout).toContain('dist cache miss:');
      expect(miss.stdout).toContain('dist cache stored:');
      expect(miss.stdout).toContain('dist clean: 2 files scanned');
      outputs.push(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8'));
      rmSync(join(fixture.root, 'dist'), { recursive: true, force: true });
      const hit = runPublicBuild(fixture, { LANG: locale, LC_ALL: locale });
      expect(hit.status).toBe(0);
      expect(hit.stdout).toContain('dist cache hit:');
      expect(hit.stdout).toContain('dist clean: 2 files scanned'); // DROP_HIT_GUARD
      outputs.push(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8'));
      expect(readFileSync(join(fixture.root, 'node_modules/guard.log'), 'utf8')).toBe(
        'C.UTF-8|C.UTF-8\nC.UTF-8|C.UTF-8\n',
      );
      expect(readFileSync(join(fixture.root, 'node_modules/build-count'), 'utf8')).toBe('1');
    }
    expect(new Set(outputs).size).toBe(1); // PASS_PARENT_LOCALE
  });

  it('HOST_NPM_CONFIG_IS_INERT', () => {
    const fixture = createFixture();
    const preload = join(fixture.root, 'node_modules/preload.mjs');
    writeFileSync(preload, [
      "import { appendFileSync } from 'node:fs';",
      "appendFileSync('node_modules/preload-pids', `${process.pid}|${process.argv[1]}\\n`);",
      "process.env.NPM_SENTINEL = 'injected';",
    ].join('\n'));
    const home = join(fixture.root, 'node_modules/npm-home');
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, '.npmrc'), `node-options=--import=${preload}\n`);
    const run = runPublicBuild(fixture, {
      HOME: home,
      npm_config_userconfig: join(home, '.npmrc'),
    });
    expect(run.status).toBe(0);
    const observed = JSON.parse(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8'));
    expect(observed.sentinel).toBeUndefined(); // SPAWN_NPM
    expect(observed.nodeOptions).toBeUndefined();
    const pids = readFileSync(join(fixture.root, 'node_modules/preload-pids'), 'utf8').trim().split('\n');
    const cachePids = pids.filter((record) => record.includes('tools/dist-build-cache.mjs'));
    expect(cachePids).toHaveLength(1);
    expect(pids.some((record) => record.includes('node_modules/vite/bin/vite.js'))).toBe(false); // SPAWN_NPM
  });
});
