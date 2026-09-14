# M-2 git-key implementation lane report (sol resume 01a0a0e3…), harvested 2026-09-14 16:35

Implemented the frozen M2 R7 plan at HEAD `40f04e2cad4d5d5e170d6caf0adb033e14252990`.

### Implementation summary

| File | Added | Removed | Change |
|---|---:|---:|---|
| [package.json](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/package.json) | 3 | 1 | Added cached and uncached build scripts |
| [build-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/ai-bridge/build-boundary.test.ts) | 18 | 1 | Rewrote guard-route assertion |
| [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts) | 655 | 21 | Added complete Git-key/cache test matrix |
| [scraper-is-never-in-the-bundle.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts) | 20 | 4 | Rewrote guard-route assertion |
| [dist-build-cache.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs) | 234 | 251 | Replaced cache implementation |

The module now computes the ordered Git/index/overlay/environment key, performs all required bypass verdicts, batches dirty hashing, validates hidden-lock state, scrubs child environments, directly invokes the three build descriptors, validates artifact HEAD and generation digests, and rechecks inputs before storing.

Script strings:

```text
build=tsc -b && node tools/dist-build-cache.mjs
build:dist=vite build --configLoader runner
build:dist:validated=tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs
```

### Mutation proof

Exact test command for every mutant:

```sh
npx vitest run --reporter=verbose --configLoader runner \
  tests/unit/tools/dist-build-cache.test.ts
```

Every run exited 1, followed by:

```sh
cp /tmp/m2-dist-build-cache.pristine.mjs tools/dist-build-cache.mjs
```

Every restore produced pristine SHA `b46de8391e31c1cd1b85ed6d8d3334c8498fa6eab8d3975821885064f2fa5162`.

| Mutant | Mutated SHA-256 | Killing test |
|---|---|---|
| DROP_HEAD | `152b3c8da9efc2f8264afc58d8feab115a4a85381a0d9f36c9db4d7a2b550c02` | `HEAD_ONLY_CHANGE_MISS` |
| DROP_STATUS_OVERLAY | `b479eec0952897bc0842d923409b2eb4aed7623cabddb92151db2efea1dd30e8` | `TRACKED_SRC_CONTENT_MISS` |
| DROP_HASH_OBJECT | `82efe86b5b4bcad9556ff12bc003cabeab5a9c85224530d97b22f147ad4b25e5` | `DIRTY_BYTES_BEAT_MTIME` |
| DROP_ENV_PROBES | `33074a1f11e3e8e203af4e8adc8f5abd7aa5223f51c95ef330584303ae2c0441` | `VITE_ENV_FILE_MISS ignored=true` |
| SPREAD_PARENT_ENV | `80231c4744af38e947a87327db3aed92460bc31209ee2b3150eb82f96f2c5bcb` | `drops undeclared parent variables...` |
| SKIP_POST_BUILD_RECHECK | `ce002007c75d023e5695c4940d54bee92d98372210a4e27ae8b70e3d23c42101` | `INPUT_CHANGED_DURING_BUILD_NOT_STORED` |
| ACCEPT_STALE_INSTALL | `db6ea241645843b8093daa48eda588bb900a7de3f50448adcbd0bcfcb170401e` | `HIDDEN_LOCK_STALE_BYPASS` |
| IGNORE_DELETIONS | `3eeee978f44e656fecb15b8c025d0656e03a15bb511013d330b775f29ba7782e` | `TRACKED_DELETION_MISS` |
| UNSORTED_OVERLAY | `11048ca62fd1a88b90d52ab4456313248d555ee1e5c602340442f37e0040ff4f` | `OVERLAY_ORDER_IS_CANONICAL` |
| DROP_IGNORED_PUBLIC | `f2f027b0b189ab1fed5fe20f0673f19a81473d3abb93df5513fa94798f822169` | `IGNORED_PUBLIC_FILE_MISS` |
| PASS_PARENT_LOCALE | `e7692fc5306b8324699576723e5ca8cfe4bb6c16fc9b30888854edeb998acbe8` | Environment and `FIXED_LOCALE_OUTPUT` controls |
| DROP_HIT_GUARD | `b955a34df0de0598889b2aa27f593eccf088bd772a46015c0759b28ac55f3091` | `FIXED_LOCALE_OUTPUT` |
| DROP_EFFECTIVE_ATTRS | `9c262ebcf9ee3f483d19616e4b6c6037a2e244ade9f2500562b70cc98e723b67` | `EFFECTIVE_ATTRIBUTES_BYPASS` |
| ALLOW_SYMLINK | `d6eb3b6a529ded3db0fb23313700373c6b47a2d926aeddb1cbfba7a6ab46d0fd` | `UNTRACKED_SYMLINK_BYPASS` |
| ALLOW_NORMALIZATION | `073bb188abfae5446e0b61f38c3015527c6c33a6195854a9ac5d093b2dc40128` | `AUTOCRLF_BYPASS` |
| SPAWN_NPM | `92746e9cac825ec93f6d4d080fd0cca782cb2f2f565a34af2db2fbf94716a664` | `DIRECT_DESCRIPTORS_MATCH_SCRIPT_LEAVES` and `HOST_NPM_CONFIG_IS_INERT` |
| DROP_SYMLINK_BYPASS | `05276ea8fb9cfb8dc100a3db417b22bda45364f115276a74101e4c00d323cec9` | `INDEXED_SYMLINK_BYPASS` |
| DROP_ATTR_CHECK | `fdb0924350ff19b236e1b8b4ad24924e05a748054af402c7bf811268286b20ed` | `EFFECTIVE_ATTRIBUTES_BYPASS` |
| DROP_QUOTE_BYPASS | `84d42a247441e8a5b705c0c266f7d7189ad745a1d108932dd7dbc9ed72ae3b1b` | All three quoted-path controls |

`DROP_SYMLINK_BYPASS` initially survived because a staged symlink was also visible in the dirty overlay. The fixture was strengthened by committing the symlink, isolating the index-mode verdict; the rerun then exited 1 as shown above.

### FINAL GREEN

```text
npx tsc -b --force
exit 0

sg scan
exit 0, 0 findings

node --check tools/dist-build-cache.mjs
exit 0

npx vitest run --configLoader runner \
  tests/unit/tools/dist-build-cache.test.ts \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts

Test Files  3 passed (3)
Tests       61 passed (61)
Duration    5.38s
```

Descriptor/script equivalence control:

```text
✓ public script and direct descriptor equivalence >
  DIRECT_DESCRIPTORS_MATCH_SCRIPT_LEAVES
Tests 1 passed | 41 skipped (42)
```

Size and formatting:

```text
module_lines=250
key_verdict_lines=150
tools/dist-build-cache.mjs                         max=119  over120=0
tests/unit/tools/dist-build-cache.test.ts           max=116  over120=0
tests/unit/tools/scraper-is-never-in-the-bundle... max=112  over120=0
tests/unit/ai-bridge/build-boundary.test.ts         max=113  over120=0
package.json                                        max=223  over120=4
```

The four `package.json` exceptions are pre-existing script string literals at lines 29, 47, 48, and 50. All newly changed script lines are within 120 columns.

```text
git diff --check
exit 0
```

Discovery:

```text
npx vitest list --configLoader runner --filesOnly --json \
  > /tmp/m2-impl-after.json

files_only_exit=0
files_only_rows=641
baseline_delta=0
fixture_paths=0
```

The required final Vitest command was:

```text
npx vitest list --configLoader runner --json > /tmp/m2-impl-bare.json

bare_json_exit=0
bare_json_rows=11444
changed_spec_test_rows=61
bare_fixture_paths=0
```

The bare output retained the existing spell-cache informational prefix; parsing the following JSON payload produced the counts above.

Integrity:

```text
plan:
a63d3e903439487b6e2898a37411c7634bb1454b9966f9454d2670b4e560c279
701 lines, 39974 bytes

module/pristine:
b46de8391e31c1cd1b85ed6d8d3334c8498fa6eab8d3975821885064f2fa5162

package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
unchanged

src/vtt/intel/contracts.ts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

tools/dist-build-inputs.mjs:
absent
```

Final `git status --short`:

```text
 M package.json
 M tests/unit/ai-bridge/build-boundary.test.ts
 M tests/unit/tools/dist-build-cache.test.ts
 M tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
 M tools/dist-build-cache.mjs
```

M2 IMPL DONE
diff --git a/package.json b/package.json
index aebcc04efff1b12bb64d8ae9dad77296372d0f8a..083b09dcc0877ea20b2d043aea798a3c2bf98555
--- a/package.json
+++ b/package.json
@@ -7,7 +7,9 @@
   "type": "module",
   "scripts": {
     "dev": "vite --configLoader runner",
-    "build": "tsc -b && vite build --configLoader runner && node tools/assert-dist-clean.mjs",
+    "build": "tsc -b && node tools/dist-build-cache.mjs",
+    "build:dist": "vite build --configLoader runner",
+    "build:dist:validated": "tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs",
     "serve": "node tools/serve.mjs",
     "serve:check": "playwright test --config=tests/serving/playwright.config.ts",
     "typecheck": "scripts/check-command-outcomes.sh && tsc -b",
diff --git a/tests/unit/ai-bridge/build-boundary.test.ts b/tests/unit/ai-bridge/build-boundary.test.ts
index 5ae9fd7a7a89f3bcc6fa208f9b7f0b7af0148b4f..986ce0ef4796e641c8910d3fb867f4e3511e8fcc
--- a/tests/unit/ai-bridge/build-boundary.test.ts
+++ b/tests/unit/ai-bridge/build-boundary.test.ts
@@ -17,6 +17,20 @@
 
 const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
 
+interface CacheDescriptors {
+  readonly HIT_GUARD_DESCRIPTOR: { readonly script: string };
+  readonly VALIDATED_BUILD_DESCRIPTORS: readonly { readonly script: string }[];
+}
+
+function exposesCacheDescriptors(value: unknown): value is CacheDescriptors {
+  return typeof value === 'object' && value !== null &&
+    'HIT_GUARD_DESCRIPTOR' in value && 'VALIDATED_BUILD_DESCRIPTORS' in value;
+}
+
+const cacheModule: unknown = await import(new URL('../../../tools/dist-build-cache.mjs', import.meta.url).href);
+if (!exposesCacheDescriptors(cacheModule)) throw new TypeError('Invalid dist cache descriptors.');
+const { HIT_GUARD_DESCRIPTOR, VALIDATED_BUILD_DESCRIPTORS } = cacheModule;
+
 function read(relative: string): Promise<string> {
   return readFile(join(repoRoot, relative), 'utf8');
 }
@@ -106,7 +120,10 @@
     const pkg = JSON.parse(await read('package.json')) as {
       scripts: Record<string, string>;
     };
-    expect(pkg.scripts['build']).toContain('node tools/assert-dist-clean.mjs');
+    expect(pkg.scripts['build']).toContain('node tools/dist-build-cache.mjs');
+    expect(HIT_GUARD_DESCRIPTOR.script).toBe('tools/assert-dist-clean.mjs');
+    expect(VALIDATED_BUILD_DESCRIPTORS.at(-1)?.script).toBe('tools/assert-dist-clean.mjs');
+    expect(pkg.scripts['build:dist:validated']).toContain('node tools/assert-dist-clean.mjs');
   });
 
   it('BROWSER-PROBE-SEAM-DEV-ONLY: looks for literals that really occur behind their source gates', async () => {
diff --git a/tests/unit/tools/dist-build-cache.test.ts b/tests/unit/tools/dist-build-cache.test.ts
index a54a09b68ac464847fca2f8b88555b4ed68194c1..ce92f14d19c20eb7181a371a20ddb7ae9f52a33e
--- a/tests/unit/tools/dist-build-cache.test.ts
+++ b/tests/unit/tools/dist-build-cache.test.ts
@@ -1,51 +1,685 @@
-import { describe, expect, it } from 'vitest';
+import { execFileSync, spawnSync } from 'node:child_process';
+import { createHash } from 'node:crypto';
+import {
+  existsSync,
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  readdirSync,
+  rmSync,
+  statSync,
+  symlinkSync,
+  writeFileSync,
+} from '../../helpers/test-filesystem';
+import { tmpdir } from 'node:os';
+import { dirname, join, relative, sep } from 'node:path';
+import { afterEach, describe, expect, it } from 'vitest';
 
-type ProductionBuildEnv = (
-  parentEnv: Readonly<Record<string, string | undefined>>,
-) => Record<string, string | undefined>;
+interface Descriptor {
+  readonly script: string;
+  readonly args: readonly string[];
+}
 
-function exposesProductionBuildEnv(
-  value: unknown,
-): value is { productionBuildEnv: ProductionBuildEnv } {
+interface OverlayRecord {
+  readonly status: Buffer;
+  readonly current: Buffer;
+  readonly old?: Buffer;
+}
+
+type CacheVerdict =
+  | { readonly cacheable: true; readonly head: string; readonly key: string }
+  | { readonly cacheable: false; readonly head?: string; readonly reason: string };
+
+interface CacheModule {
+  readonly HIT_GUARD_DESCRIPTOR: Descriptor;
+  readonly VALIDATED_BUILD_DESCRIPTORS: readonly Descriptor[];
+  readonly distCacheVerdict: (root: string, parent?: NodeJS.ProcessEnv) => CacheVerdict;
+  readonly productionBuildEnv: (parent: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
+  readonly sortOverlayRecords: (records: readonly OverlayRecord[]) => OverlayRecord[];
+}
+
+function exposesCacheModule(value: unknown): value is CacheModule {
   return typeof value === 'object' && value !== null &&
-    'productionBuildEnv' in value &&
-    typeof value.productionBuildEnv === 'function';
+    'distCacheVerdict' in value && typeof value.distCacheVerdict === 'function' &&
+    'productionBuildEnv' in value && typeof value.productionBuildEnv === 'function' &&
+    'sortOverlayRecords' in value && typeof value.sortOverlayRecords === 'function' &&
+    'HIT_GUARD_DESCRIPTOR' in value && 'VALIDATED_BUILD_DESCRIPTORS' in value;
 }
 
-const buildCacheModule: unknown = await import(
+const importedCacheModule: unknown = await import(
   new URL('../../../tools/dist-build-cache.mjs', import.meta.url).href
 );
-if (!exposesProductionBuildEnv(buildCacheModule)) {
-  throw new TypeError('dist-build-cache.mjs does not export productionBuildEnv.');
+if (!exposesCacheModule(importedCacheModule)) throw new TypeError('Invalid dist cache module exports.');
+const {
+  HIT_GUARD_DESCRIPTOR,
+  VALIDATED_BUILD_DESCRIPTORS,
+  distCacheVerdict,
+  productionBuildEnv,
+  sortOverlayRecords,
+} = importedCacheModule;
+
+const modulePath = join(process.cwd(), 'tools/dist-build-cache.mjs');
+const roots: string[] = [];
+
+interface Fixture {
+  readonly root: string;
+  readonly temporary: string;
+}
+
+interface CacheRun {
+  readonly status: number | null;
+  readonly stdout: string;
+  readonly stderr: string;
+}
+
+function write(root: string, path: string, contents: string): void {
+  const target = join(root, path);
+  mkdirSync(dirname(target), { recursive: true });
+  writeFileSync(target, contents, 'utf8');
+}
+
+function git(root: string, args: readonly string[]): string {
+  return execFileSync('git', args, {
+    cwd: root,
+    encoding: 'utf8',
+    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
+  }).trim();
+}
+
+function commit(root: string, message = 'fixture'): string {
+  git(root, ['add', '-A']);
+  git(root, ['commit', '-q', '-m', message]);
+  return git(root, ['rev-parse', 'HEAD']);
+}
+
+function createFixture(): Fixture {
+  const root = mkdtempSync(join(tmpdir(), 'dnd-dist-cache-test-'));
+  const temporary = join(root, '.tmp');
+  roots.push(root);
+  git(root, ['init', '-q']);
+  git(root, ['config', 'user.name', 'Cache Test']);
+  git(root, ['config', 'user.email', 'cache@example.invalid']);
+  write(root, '.gitignore', ['dist/', 'node_modules/', '.tmp/', 'public/ignored*/'].join('\n') + '\n');
+  write(root, 'package.json', '{"type":"module"}\n');
+  write(root, 'package-lock.json', JSON.stringify({
+    lockfileVersion: 3,
+    packages: {
+      '': { name: 'fixture', version: '1.0.0' },
+      'node_modules/demo': {
+        version: '1.2.3',
+        resolved: 'https://example.invalid/demo.tgz',
+        integrity: 'sha512-demo',
+      },
+    },
+  }) + '\n');
+  write(root, 'src/app.ts', 'export const value = 1;\n');
+  write(root, 'src/worker/handlers/base.ts', 'export const base = true;\n');
+  write(root, 'drizzle/0001.sql', 'select 1;\n');
+  write(root, 'docs/guide.md', 'guide\n');
+  write(root, 'tests/example.test.ts', 'export const testValue = 1;\n');
+  write(root, 'public/base.txt', 'base\n');
+  commit(root);
+  mkdirSync(temporary, { recursive: true });
+  write(root, 'node_modules/.package-lock.json', JSON.stringify({
+    lockfileVersion: 3,
+    packages: {
+      'node_modules/demo': {
+        version: '1.2.3',
+        resolved: 'https://example.invalid/demo.tgz',
+        integrity: 'sha512-demo',
+      },
+    },
+  }) + '\n');
+  write(root, 'node_modules/typescript/bin/tsc', [
+    "import { appendFileSync } from 'node:fs';",
+    "appendFileSync('node_modules/steps.log', `tsc ${process.argv.slice(2).join(' ')}\\n`);",
+  ].join('\n'));
+  write(root, 'node_modules/vite/bin/vite.js', [
+    "import { execFileSync } from 'node:child_process';",
+    "import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';",
+    "const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();",
+    "const countFile = 'node_modules/build-count';",
+    "const count = existsSync(countFile) ? Number(readFileSync(countFile, 'utf8')) + 1 : 1;",
+    "writeFileSync(countFile, String(count));",
+    "appendFileSync('node_modules/steps.log', `vite ${process.argv.slice(2).join(' ')}\\n`);",
+    "if (existsSync('node_modules/mutate-input')) appendFileSync('src/app.ts', '// changed during build\\n');",
+    "const commit = existsSync('node_modules/wrong-head') ? '0'.repeat(40) : head;",
+    "const assets = ['assets/index-az.js', 'assets/index-aaa.js'].sort((a, b) => a.localeCompare(b));",
+    "rmSync('dist', { recursive: true, force: true });",
+    "mkdirSync('dist', { recursive: true });",
+    "writeFileSync('dist/vtt-handoff-artifact.json', JSON.stringify({ commit }));",
+    "writeFileSync('dist/observed.json', JSON.stringify({",
+    "  secret: process.env.CACHE_TEST_SECRET,",
+    "  sentinel: process.env.NPM_SENTINEL,",
+    "  nodeOptions: process.env.NODE_OPTIONS,",
+    "  lang: process.env.LANG,",
+    "  lcAll: process.env.LC_ALL,",
+    "  assets,",
+    "}));",
+  ].join('\n'));
+  write(root, 'tools/assert-dist-clean.mjs', [
+    "import { appendFileSync, readFileSync } from 'node:fs';",
+    "JSON.parse(readFileSync('dist/vtt-handoff-artifact.json', 'utf8'));",
+    "appendFileSync('node_modules/guard.log', `${process.env.LANG}|${process.env.LC_ALL}\\n`);",
+    "process.stdout.write('dist clean: 2 files scanned\\n');",
+  ].join('\n'));
+  return { root, temporary };
+}
+
+function verdict(fixture: Fixture, parent: NodeJS.ProcessEnv = process.env) {
+  return distCacheVerdict(fixture.root, parent);
+}
+
+function key(fixture: Fixture, parent: NodeJS.ProcessEnv = process.env): string {
+  const result = verdict(fixture, parent);
+  expect(result.cacheable).toBe(true);
+  if (!result.cacheable) throw new Error(`unexpected bypass: ${result.reason}`);
+  return result.key;
 }
-const { productionBuildEnv } = buildCacheModule;
 
+function runCache(fixture: Fixture, extra: NodeJS.ProcessEnv = {}): CacheRun {
+  const home = join(fixture.root, 'node_modules/home');
+  mkdirSync(home, { recursive: true });
+  const result = spawnSync(process.execPath, [modulePath], {
+    cwd: fixture.root,
+    encoding: 'utf8',
+    env: {
+      ...process.env,
+      GIT_CONFIG_GLOBAL: join(fixture.root, 'node_modules/empty-gitconfig'),
+      GIT_CONFIG_NOSYSTEM: '1',
+      HOME: home,
+      TMPDIR: fixture.temporary,
+      ...extra,
+    },
+  });
+  return {
+    status: result.status,
+    stdout: result.stdout,
+    stderr: result.stderr,
+  };
+}
+
+function hiddenLock(root: string): Record<string, unknown> {
+  return JSON.parse(readFileSync(join(root, 'node_modules/.package-lock.json'), 'utf8')) as Record<string, unknown>;
+}
+
+function cacheRoot(fixture: Fixture): string {
+  return join(fixture.temporary, 'dnd-dist-build-cache-v2');
+}
+
+function digestDirectory(directory: string): string {
+  const hash = createHash('sha256');
+  const frame = (value: string | Buffer): void => {
+    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
+    const length = Buffer.allocUnsafe(8);
+    length.writeBigUInt64BE(BigInt(bytes.length));
+    hash.update(length).update(bytes);
+  };
+  const visit = (root: string): string[] => readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
+    const path = join(root, entry.name);
+    return entry.isDirectory() ? visit(path) : [path];
+  });
+  frame('dnd-dist-build-cache-v2');
+  for (const path of visit(directory).sort()) {
+    frame(relative(directory, path).split(sep).join('/'));
+    frame(readFileSync(path));
+  }
+  return hash.digest('hex');
+}
+
+function setHiddenPackageField(fixture: Fixture, field: string, value: string): void {
+  const lock = hiddenLock(fixture.root);
+  const packages = lock.packages as Record<string, Record<string, unknown>>;
+  packages['node_modules/demo']![field] = value;
+  write(fixture.root, 'node_modules/.package-lock.json', JSON.stringify(lock) + '\n');
+}
+
+afterEach(() => {
+  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
+});
+
 describe('productionBuildEnv', () => {
   it('overrides an inherited NODE_ENV with production', () => {
     expect(productionBuildEnv({ NODE_ENV: 'test' })).toEqual({
+      LANG: 'C.UTF-8',
+      LC_ALL: 'C.UTF-8',
       NODE_ENV: 'production',
     });
   });
 
   it('sets NODE_ENV to production when the parent leaves it unset', () => {
-    expect(productionBuildEnv({})).toEqual({ NODE_ENV: 'production' });
+    expect(productionBuildEnv({})).toEqual({
+      LANG: 'C.UTF-8',
+      LC_ALL: 'C.UTF-8',
+      NODE_ENV: 'production',
+    });
   });
 
-  it('preserves every other parent variable', () => {
+  it('drops undeclared parent variables and keeps only execution allowlist values', () => {
     const parentEnv = {
       NODE_ENV: 'development',
-      PATH: '/example/bin',
-      CUSTOM_BUILD_SETTING: 'kept',
+      PATH: '/bin',
+      HOME: '/home/example',
+      TMPDIR: '/tmp/example',
+      TZ: 'UTC',
+      STATIC_APP_CACHE_DIR: '/cache',
+      LANG: 'da_DK.UTF-8',
+      LC_ALL: 'da_DK.UTF-8',
+      CUSTOM_BUILD_SETTING: 'drop',
+      VITE_SECRET: 'drop',
+      NODE_OPTIONS: '--inspect',
+      npm_config_userconfig: '/host/.npmrc',
     };
-
     const childEnv = productionBuildEnv(parentEnv);
-
     expect(childEnv).not.toBe(parentEnv);
     expect(parentEnv.NODE_ENV).toBe('development');
     expect(childEnv).toEqual({
+      PATH: '/bin',
+      HOME: '/home/example',
+      TMPDIR: '/tmp/example',
+      TZ: 'UTC',
       NODE_ENV: 'production',
-      PATH: '/example/bin',
-      CUSTOM_BUILD_SETTING: 'kept',
+      LANG: 'C.UTF-8',
+      LC_ALL: 'C.UTF-8',
+      STATIC_APP_CACHE_DIR: '/cache',
+    }); // SPREAD_PARENT_ENV and PASS_PARENT_LOCALE
+  });
+});
+
+describe('public script and direct descriptor equivalence', () => {
+  it('DIRECT_DESCRIPTORS_MATCH_SCRIPT_LEAVES', () => {
+    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
+    expect(manifest.scripts.build).toBe('tsc -b && node tools/dist-build-cache.mjs');
+    expect(manifest.scripts['build:dist']).toBe('vite build --configLoader runner');
+    expect(manifest.scripts['build:dist:validated']).toBe(
+      'tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs',
+    );
+    expect(HIT_GUARD_DESCRIPTOR).toEqual({ script: 'tools/assert-dist-clean.mjs', args: [] });
+    expect(VALIDATED_BUILD_DESCRIPTORS).toEqual([
+      { script: 'node_modules/typescript/bin/tsc', args: ['-b'] },
+      { script: 'node_modules/vite/bin/vite.js', args: ['build', '--configLoader', 'runner'] },
+      { script: 'tools/assert-dist-clean.mjs', args: [] },
+    ]); // SPAWN_NPM and DROP_HIT_GUARD descriptor contract
+  });
+});
+
+describe('Git-key behavior', () => {
+  it('TRACKED_SRC_CONTENT_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    const source = join(fixture.root, 'src/app.ts');
+    const timestamp = statSync(source).mtime;
+    write(fixture.root, 'src/app.ts', 'export const value = 2;\n');
+    execFileSync('touch', ['-d', timestamp.toISOString(), source]);
+    expect(key(fixture)).not.toBe(before); // DROP_STATUS_OVERLAY
+  });
+
+  it('DIRTY_BYTES_BEAT_MTIME', () => {
+    const fixture = createFixture();
+    const source = join(fixture.root, 'src/app.ts');
+    const timestamp = statSync(source).mtime;
+    write(fixture.root, 'src/app.ts', 'export const value = 2;\n');
+    execFileSync('touch', ['-d', timestamp.toISOString(), source]);
+    const first = key(fixture);
+    write(fixture.root, 'src/app.ts', 'export const value = 3;\n');
+    execFileSync('touch', ['-d', timestamp.toISOString(), source]);
+    expect(key(fixture)).not.toBe(first); // DROP_HASH_OBJECT
+  });
+
+  it('UNTRACKED_GLOB_FILE_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'src/worker/handlers/new-handler.ts', 'export const added = true;\n');
+    expect(key(fixture)).not.toBe(before);
+  });
+
+  it('DRIZZLE_RAW_CONTENT_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'drizzle/0001.sql', 'select 2;\n');
+    expect(key(fixture)).not.toBe(before);
+  });
+
+  it('DOCS_RAW_CONTENT_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'docs/guide.md', 'changed guide\n');
+    expect(key(fixture)).not.toBe(before);
+  });
+
+  it('TEST_FILE_CONTENT_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'tests/example.test.ts', 'export const testValue = 2;\n');
+    expect(key(fixture)).not.toBe(before);
+  });
+
+  it('IGNORED_PUBLIC_FILE_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'public/ignored-z/z.txt', 'zed\n');
+    write(fixture.root, 'public/ignored-a/a.txt', 'aye\n');
+    const records = execFileSync('git', [
+      'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'public',
+    ], { cwd: fixture.root }).subarray(0, -1).toString().split('\0');
+    expect(records).toEqual([...records].sort()); // DROP_IGNORED_PUBLIC ordering control
+    expect(records).toHaveLength(2);
+    expect(records.map((path) => git(fixture.root, ['hash-object', '--no-filters', path]))).toEqual([
+      '35b57f48bdd9bd09800c5433eff6d3d758830c27',
+      '6c24c44cfa29bde0a5cd71bfb4a28278f32a162c',
+    ]);
+    expect(key(fixture)).not.toBe(before); // DROP_IGNORED_PUBLIC
+  });
+
+  it('DECLARED_STATIC_CACHE_DIR_MISS', () => {
+    const fixture = createFixture();
+    expect(key(fixture, { STATIC_APP_CACHE_DIR: '/a' })).not.toBe(
+      key(fixture, { STATIC_APP_CACHE_DIR: '/b' }),
+    );
+  });
+
+  it('UNDECLARED_ENV_IS_HERMETIC', () => {
+    const fixture = createFixture();
+    const before = key(fixture, {});
+    const after = key(fixture, { CACHE_TEST_SECRET: 'not-declared' });
+    expect(after).toBe(before);
+    const run = runCache(fixture, { CACHE_TEST_SECRET: 'not-declared' });
+    expect(run.status).toBe(0);
+    const observed = JSON.parse(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8'));
+    expect(observed.secret).toBeUndefined();
+  });
+
+  it.each([false, true])('VITE_ENV_FILE_MISS ignored=%s', (ignored) => {
+    const fixture = createFixture();
+    if (ignored) {
+      const ignore = readFileSync(join(fixture.root, '.gitignore'), 'utf8');
+      write(fixture.root, '.gitignore', ignore + '.env.production\n');
+      commit(fixture.root, 'ignore env');
+    }
+    const before = key(fixture);
+    write(fixture.root, '.env.production', 'VITE_VALUE=changed\n');
+    expect(key(fixture)).not.toBe(before); // DROP_ENV_PROBES
+  });
+
+  it('HEAD_ONLY_CHANGE_MISS', () => {
+    const fixture = createFixture();
+    const keyBefore = key(fixture);
+    git(fixture.root, ['commit', '--allow-empty', '-q', '-m', 'new head']);
+    const keyAfter = key(fixture);
+    expect(keyAfter).not.toBe(keyBefore); // DROP_HEAD
+    const miss = runCache(fixture);
+    expect(miss.stdout).toContain(`dist cache miss: ${keyAfter}`);
+    rmSync(join(fixture.root, 'dist'), { recursive: true, force: true });
+    const hit = runCache(fixture);
+    expect(hit.stdout).toContain(`dist cache hit: ${keyAfter}`);
+    const artifact = JSON.parse(readFileSync(join(fixture.root, 'dist/vtt-handoff-artifact.json'), 'utf8'));
+    expect(artifact.commit).toBe(git(fixture.root, ['rev-parse', 'HEAD']));
+  });
+
+  it('HIDDEN_LOCK_STALE_BYPASS', () => {
+    const fixture = createFixture();
+    const lock = hiddenLock(fixture.root);
+    const packages = lock.packages as Record<string, unknown>;
+    delete packages['node_modules/demo'];
+    write(fixture.root, 'node_modules/.package-lock.json', JSON.stringify(lock) + '\n');
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'stale-install' });
+    const run = runCache(fixture);
+    const cacheLines = run.stdout.split('\n').filter((line) => line.startsWith('dist cache'));
+    expect(cacheLines).toEqual(['dist cache bypass: stale-install']); // ACCEPT_STALE_INSTALL
+    expect(existsSync(cacheRoot(fixture))).toBe(false);
+  });
+
+  it('HIDDEN_LOCK_METADATA_STALE_BYPASS', () => {
+    for (const field of ['resolved', 'integrity']) {
+      const fixture = createFixture();
+      setHiddenPackageField(fixture, field, 'changed');
+      expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'stale-install' });
+    }
+  });
+
+  it('ASSUME_UNCHANGED_BYPASS', () => {
+    for (const option of ['--assume-unchanged', '--skip-worktree']) {
+      const fixture = createFixture();
+      git(fixture.root, ['update-index', option, 'src/app.ts']);
+      expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'special-index' });
+    }
+  });
+
+  it('SUBMODULE_BYPASS', () => {
+    const fixture = createFixture();
+    const head = git(fixture.root, ['rev-parse', 'HEAD']);
+    git(fixture.root, ['update-index', '--add', '--cacheinfo', `160000,${head},vendor/submodule`]);
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'submodule' });
+  });
+
+  it('INDEXED_SYMLINK_BYPASS', () => {
+    const fixture = createFixture();
+    symlinkSync('src/app.ts', join(fixture.root, 'linked'));
+    commit(fixture.root, 'tracked symlink');
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'symlink' }); // DROP_SYMLINK_BYPASS
+  });
+
+  it('UNTRACKED_SYMLINK_BYPASS', () => {
+    const fixture = createFixture();
+    symlinkSync('src/app.ts', join(fixture.root, 'untracked-link'));
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'symlink' }); // ALLOW_SYMLINK
+  });
+
+  it('AUTOCRLF_BYPASS', () => {
+    const fixture = createFixture();
+    git(fixture.root, ['config', 'core.autocrlf', 'true']);
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'normalization' }); // ALLOW_NORMALIZATION
+  });
+
+  it('TRACKED_ATTRIBUTES_BYPASS', () => {
+    const fixture = createFixture();
+    write(fixture.root, '.gitattributes', '* -text\n');
+    git(fixture.root, ['add', '.gitattributes']);
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'normalization' });
+  });
+
+  it('EFFECTIVE_ATTRIBUTES_BYPASS', () => {
+    const fixtures: Array<() => Fixture> = [
+      () => {
+        const fixture = createFixture();
+        write(fixture.root, '.gitattributes', '*.ts -text\n');
+        return fixture;
+      },
+      () => {
+        const fixture = createFixture();
+        write(fixture.root, '.git/info/attributes', '*.ts -text\n');
+        return fixture;
+      },
+      () => {
+        const fixture = createFixture();
+        const attributes = join(fixture.root, 'node_modules/configured-attributes');
+        writeFileSync(attributes, '*.ts -text\n');
+        git(fixture.root, ['config', 'core.attributesFile', attributes]);
+        return fixture;
+      },
+    ];
+    for (const make of fixtures) {
+      expect(verdict(make())).toMatchObject({ cacheable: false, reason: 'normalization' });
+    }
+    const userFixture = createFixture();
+    const xdg = join(userFixture.root, 'node_modules/xdg');
+    write(userFixture.root, 'node_modules/xdg/git/attributes', '*.ts -text\n');
+    const oldXdg = process.env.XDG_CONFIG_HOME;
+    process.env.XDG_CONFIG_HOME = xdg;
+    expect(verdict(userFixture)).toMatchObject({ cacheable: false, reason: 'normalization' });
+    if (oldXdg === undefined) delete process.env.XDG_CONFIG_HOME;
+    else process.env.XDG_CONFIG_HOME = oldXdg;
+    const systemFixture = createFixture();
+    const systemAttributes = join(systemFixture.root, 'node_modules/system-attributes');
+    const systemConfig = join(systemFixture.root, 'node_modules/system-config');
+    writeFileSync(systemAttributes, '*.ts -text\n');
+    writeFileSync(systemConfig, `[core]\n\tattributesFile = ${systemAttributes}\n`);
+    const oldSystem = process.env.GIT_CONFIG_SYSTEM;
+    process.env.GIT_CONFIG_SYSTEM = systemConfig;
+    expect(verdict(systemFixture)).toMatchObject({ cacheable: false, reason: 'normalization' });
+    // DROP_EFFECTIVE_ATTRS and DROP_ATTR_CHECK
+    if (oldSystem === undefined) delete process.env.GIT_CONFIG_SYSTEM;
+    else process.env.GIT_CONFIG_SYSTEM = oldSystem;
+  });
+
+  it('GIT_FAILURE_BYPASS', () => {
+    const root = mkdtempSync(join(tmpdir(), 'dnd-dist-cache-not-git-'));
+    roots.push(root);
+    expect(distCacheVerdict(root)).toMatchObject({ cacheable: false, reason: 'git-failure' });
+  });
+
+  it('INVALID_HEAD_BYPASS', () => {
+    const root = mkdtempSync(join(tmpdir(), 'dnd-dist-cache-sha256-'));
+    roots.push(root);
+    git(root, ['init', '-q', '--object-format=sha256']);
+    git(root, ['config', 'user.name', 'Cache Test']);
+    git(root, ['config', 'user.email', 'cache@example.invalid']);
+    write(root, 'file.txt', 'content\n');
+    commit(root);
+    expect(distCacheVerdict(root)).toMatchObject({ cacheable: false, reason: 'invalid-head' });
+  });
+
+  it('INPUT_CHANGED_DURING_BUILD_NOT_STORED', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'node_modules/mutate-input', 'yes\n');
+    const run = runCache(fixture);
+    expect(run.status).toBe(0);
+    expect(run.stdout).toContain('dist cache unstable-inputs'); // SKIP_POST_BUILD_RECHECK
+    expect(existsSync(join(cacheRoot(fixture), `${before}.json`))).toBe(false);
+    const entries = existsSync(cacheRoot(fixture)) ? readdirSync(cacheRoot(fixture), { recursive: true }) : [];
+    expect(entries).not.toContain(`${before}.json`);
+  });
+
+  it('CORRUPTED_GENERATION_REBUILDS', () => {
+    const fixture = createFixture();
+    const first = runCache(fixture);
+    expect(first.status).toBe(0);
+    const cache = cacheRoot(fixture);
+    const pointerName = readdirSync(cache).find((name) => name.endsWith('.json'));
+    expect(pointerName).toBeDefined();
+    const pointer = JSON.parse(readFileSync(join(cache, pointerName!), 'utf8'));
+    write(join(cache, 'generations', pointer.generation), 'dist/observed.json', '{"corrupt":true}\n');
+    const second = runCache(fixture);
+    expect(second.stdout).toContain('dist cache miss:');
+    expect(readFileSync(join(fixture.root, 'node_modules/build-count'), 'utf8')).toBe('2');
+  });
+
+  it('DIST_OUTPUT_IS_IGNORED', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'dist/arbitrary.txt', 'ignored output\n');
+    expect(key(fixture)).toBe(before);
+  });
+
+  it('TRACKED_DELETION_MISS', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    rmSync(join(fixture.root, 'src/app.ts'));
+    expect(key(fixture)).not.toBe(before); // IGNORE_DELETIONS
+  });
+
+  it('OVERLAY_ORDER_IS_CANONICAL', () => {
+    const records = [
+      { status: Buffer.from('??'), current: Buffer.from('z') },
+      { status: Buffer.from(' M'), current: Buffer.from('a') },
+    ];
+    const digest = (input: typeof records): string => createHash('sha256').update(Buffer.concat(
+      sortOverlayRecords(input).flatMap((record) => [record.status, record.current]),
+    )).digest('hex');
+    expect(digest([...records].reverse())).toBe(digest(records)); // UNSORTED_OVERLAY
+  });
+
+  it('PATH_BYTES_ARE_NUL_PARSED', () => {
+    const fixture = createFixture();
+    const before = key(fixture);
+    write(fixture.root, 'src/a file\twith-tab.ts', 'content\n');
+    expect(key(fixture)).not.toBe(before);
+  });
+
+  it.each([
+    ['line-feed', 'src/line\nfeed.ts', 'src/line'],
+    ['carriage-return', 'src/line\r', 'src/line'],
+    ['quoted-root', '\"package.json\"', 'package.json'],
+    ['quoted-basename', 'src/\"package.json\"', 'src/package.json'],
+    ['quoted-whole-path', '\"tools/x.mjs\"', 'tools/x.mjs'],
+  ])('UNSUPPORTED_BATCH_PATH_BYPASS %s', (_label, unsafe, ordinary) => {
+    const fixture = createFixture();
+    write(fixture.root, ordinary, 'ordinary\n');
+    write(fixture.root, unsafe, 'literal unsafe path\n');
+    expect(verdict(fixture)).toMatchObject({ cacheable: false, reason: 'unsupported-path' });
+    // DROP_QUOTE_BYPASS and the newline/CR batch-parser controls.
+  });
+
+  it('WRONG_ARTIFACT_HEAD_NEVER_HITS', () => {
+    const fixture = createFixture();
+    expect(runCache(fixture).status).toBe(0);
+    const cache = cacheRoot(fixture);
+    const pointerName = readdirSync(cache).find((name) => name.endsWith('.json'))!;
+    const pointerPath = join(cache, pointerName);
+    const pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
+    const generation = join(cache, 'generations', pointer.generation, 'dist');
+    write(generation, 'vtt-handoff-artifact.json', JSON.stringify({ commit: '0'.repeat(40) }));
+    pointer.distDigest = digestDirectory(generation);
+    writeFileSync(pointerPath, JSON.stringify(pointer) + '\n');
+    const second = runCache(fixture);
+    expect(second.stdout).not.toContain('dist cache hit:');
+    expect(second.stdout).toContain('dist cache miss:');
+    expect(readFileSync(join(fixture.root, 'node_modules/build-count'), 'utf8')).toBe('2');
+  });
+
+  it('MISS_WRONG_ARTIFACT_HEAD_FAILS', () => {
+    const fixture = createFixture();
+    write(fixture.root, 'node_modules/wrong-head', 'yes\n');
+    const run = runCache(fixture);
+    expect(run.status).toBe(1);
+    expect(run.stderr).toContain('artifact commit');
+    expect(run.stdout).not.toContain('dist cache stored:');
+  });
+});
+
+describe('scrubbed build execution', () => {
+  it('FIXED_LOCALE_OUTPUT', () => {
+    const fixture = createFixture();
+    const miss = runCache(fixture, { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' });
+    expect(miss.status).toBe(0);
+    expect(miss.stdout).toContain('dist cache miss:');
+    expect(miss.stdout).toContain('dist cache stored:');
+    expect(miss.stdout).toContain('dist clean: 2 files scanned');
+    const first = readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8');
+    rmSync(join(fixture.root, 'dist'), { recursive: true, force: true });
+    const hit = runCache(fixture, { LANG: 'da_DK.UTF-8', LC_ALL: 'da_DK.UTF-8' });
+    expect(hit.status).toBe(0);
+    expect(hit.stdout).toContain('dist cache hit:');
+    expect(hit.stdout).toContain('dist clean: 2 files scanned'); // DROP_HIT_GUARD
+    expect(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8')).toBe(first);
+    expect(readFileSync(join(fixture.root, 'node_modules/guard.log'), 'utf8')).toBe(
+      'C.UTF-8|C.UTF-8\nC.UTF-8|C.UTF-8\n',
+    );
+    expect(readFileSync(join(fixture.root, 'node_modules/build-count'), 'utf8')).toBe('1');
+  });
+
+  it('HOST_NPM_CONFIG_IS_INERT', () => {
+    const fixture = createFixture();
+    const preload = join(fixture.root, 'node_modules/preload.mjs');
+    writeFileSync(preload, [
+      "import { appendFileSync } from 'node:fs';",
+      "appendFileSync('node_modules/preload-pids', `${process.pid}\\n`);",
+      "process.env.NPM_SENTINEL = 'injected';",
+    ].join('\n'));
+    const home = join(fixture.root, 'node_modules/npm-home');
+    mkdirSync(home, { recursive: true });
+    writeFileSync(join(home, '.npmrc'), `node-options=--import=${preload}\n`);
+    const run = runCache(fixture, {
+      HOME: home,
+      NODE_OPTIONS: `--import=${preload}`,
+      npm_config_userconfig: join(home, '.npmrc'),
     });
+    expect(run.status).toBe(0);
+    const observed = JSON.parse(readFileSync(join(fixture.root, 'dist/observed.json'), 'utf8'));
+    expect(observed.sentinel).toBeUndefined(); // SPAWN_NPM
+    expect(observed.nodeOptions).toBeUndefined();
+    const pids = readFileSync(join(fixture.root, 'node_modules/preload-pids'), 'utf8').trim().split('\n');
+    expect(pids).toHaveLength(1);
   });
 });
diff --git a/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts b/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
index bff71ad1c59ab64a0a188bd0e677052e95a8f4db..ce3872cf69632a593c2754d2d2abcd7092ba2edf
--- a/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
+++ b/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
@@ -6,6 +6,20 @@
 
 const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
 
+interface CacheDescriptors {
+  readonly HIT_GUARD_DESCRIPTOR: { readonly script: string };
+  readonly VALIDATED_BUILD_DESCRIPTORS: readonly { readonly script: string }[];
+}
+
+function exposesCacheDescriptors(value: unknown): value is CacheDescriptors {
+  return typeof value === 'object' && value !== null &&
+    'HIT_GUARD_DESCRIPTOR' in value && 'VALIDATED_BUILD_DESCRIPTORS' in value;
+}
+
+const cacheModule: unknown = await import(new URL('../../../tools/dist-build-cache.mjs', import.meta.url).href);
+if (!exposesCacheDescriptors(cacheModule)) throw new TypeError('Invalid dist cache descriptors.');
+const { HIT_GUARD_DESCRIPTOR, VALIDATED_BUILD_DESCRIPTORS } = cacheModule;
+
 async function typeScriptFilesUnder(directory: string): Promise<string[]> {
   const entries = await readdir(directory, { withFileTypes: true });
   const files: string[] = [];
@@ -74,10 +88,12 @@
       `these npm scripts invoke the scraper:\n${offenders.join('\n')}`,
     ).toEqual([]);
 
-    // The positive half: `build` still chains the byte scan that would catch a
-    // leak. Asserting only the absence would pass just as happily if the guard
-    // had been removed from the build.
-    expect(manifest.scripts.build).toContain('tools/assert-dist-clean.mjs');
+    // The positive half follows the cache route and proves both cache paths
+    // still reach the byte scan that would catch a scraper leak.
+    expect(manifest.scripts.build).toContain('node tools/dist-build-cache.mjs');
+    expect(HIT_GUARD_DESCRIPTOR.script).toBe('tools/assert-dist-clean.mjs');
+    expect(VALIDATED_BUILD_DESCRIPTORS.at(-1)?.script).toBe('tools/assert-dist-clean.mjs');
+    expect(manifest.scripts['build:dist:validated']).toContain('node tools/assert-dist-clean.mjs');
   });
 
   it('has its sentinel in the dist byte scan, with the two copies in step', async () => {
diff --git a/tools/dist-build-cache.mjs b/tools/dist-build-cache.mjs
index c3624cab56ee234826ffce44cd6ba837c4e473a8..61aa39281c78eecb779ff1599f7bfd51529ccdd0
--- a/tools/dist-build-cache.mjs
+++ b/tools/dist-build-cache.mjs
@@ -1,267 +1,250 @@
-// @ts-nocheck
 import { spawnSync } from 'node:child_process';
 import { createHash, randomBytes } from 'node:crypto';
-import {
-  cpSync,
-  mkdirSync,
-  readFileSync,
-  readdirSync,
-  renameSync,
-  rmSync,
-  statSync,
-  writeFileSync,
-} from 'node:fs';
+import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
+import { renameSync, rmSync, writeFileSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join, relative, resolve, sep } from 'node:path';
 import { fileURLToPath } from 'node:url';
-
-const CACHE_FORMAT = 'dnd-dist-build-cache-v1';
-const CACHE_ROOT = join(tmpdir(), CACHE_FORMAT);
-
-/**
- * Production-output inputs that are not discovered through a build graph at
- * cache-lookup time. Paths as well as bytes are hashed, so adding, removing,
- * renaming, or editing a file changes the key without checkout identity.
- */
-export const DIST_BUILD_INPUT_CLASSES = Object.freeze([
-  Object.freeze({ label: 'application sources', paths: Object.freeze(['src']) }),
-  Object.freeze({ label: 'public assets', paths: Object.freeze(['public']) }),
-  Object.freeze({ label: 'HTML entry point', paths: Object.freeze(['index.html']) }),
-  Object.freeze({ label: 'build-time tools', paths: Object.freeze([
-    'tools/ai-bridge',
-    'tools/licenses',
-    'tools/pwa',
-    'tools/assert-dist-clean.mjs',
-  ]) }),
-  Object.freeze({ label: 'emitted licence texts', paths: Object.freeze([
-    'LICENSE',
-    'LICENSE-ART',
-    'ART-PROVENANCE.md',
-    'docs/licenses/CC-BY-4.0.txt',
-    'docs/licenses/SRD-5.1-ATTRIBUTION.txt',
-    'docs/licenses/A5ESRD-ATTRIBUTION.txt',
-  ]) }),
-  Object.freeze({ label: 'package manifest', paths: Object.freeze(['package.json']) }),
-  Object.freeze({ label: 'npm lockfile', paths: Object.freeze(['package-lock.json']) }),
-]);
-
-function rootConfigurationFiles(root) {
-  return readdirSync(root, { withFileTypes: true })
-    .filter((entry) => entry.isFile())
-    .map((entry) => entry.name)
-    .filter((name) =>
-      /^vite\.config\.[cm]?[jt]s$/u.test(name) ||
-      /^tsconfig(?:\.[^.]+)?\.json$/u.test(name)
-    )
-    .sort();
-}
-
-function regularFiles(root, inputPath) {
-  const absolute = resolve(root, inputPath);
-  const stats = statSync(absolute);
-  if (stats.isFile()) return [absolute];
-  if (!stats.isDirectory()) {
-    throw new TypeError(`Build input is not a regular file or directory: ${inputPath}`);
-  }
-  const files = [];
-  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
-    const child = join(absolute, entry.name);
-    if (entry.isDirectory()) {
-      files.push(...regularFiles(root, relative(root, child)));
-    } else if (entry.isFile()) {
-      files.push(child);
-    } else {
-      throw new TypeError(
-        `Build input contains an unsupported filesystem entry: ${relative(root, child)}`,
-      );
-    }
-  }
-  return files;
-}
-
-function framed(hash, bytes) {
+const FORMAT = 'dnd-dist-build-cache-v2';
+const ATTRS = ['text', 'eol', 'filter', 'ident', 'working-tree-encoding'];
+const UNSPECIFIED = Buffer.from('unspecified');
+export const HIT_GUARD_DESCRIPTOR = Object.freeze({ script: 'tools/assert-dist-clean.mjs', args: [] });
+export const VALIDATED_BUILD_DESCRIPTORS = Object.freeze([
+  Object.freeze({ script: 'node_modules/typescript/bin/tsc', args: ['-b'] }),
+  Object.freeze({ script: 'node_modules/vite/bin/vite.js', args: ['build', '--configLoader', 'runner'] }),
+  HIT_GUARD_DESCRIPTOR]);
+export function productionBuildEnv(parent) {
+  const child = {};
+  for (const name of ['PATH', 'HOME', 'TMPDIR', 'TZ']) {
+    if (parent[name] !== undefined) child[name] = parent[name]; }
+  Object.assign(child, { NODE_ENV: 'production', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' });
+  if (parent.STATIC_APP_CACHE_DIR !== undefined) child.STATIC_APP_CACHE_DIR = parent.STATIC_APP_CACHE_DIR;
+  return child; } // KEY_VERDICT_START
+function bypass(reason) { throw Object.assign(new Error(reason), { cacheBypass: reason }); }
+function frame(hash, value) {
+  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
   const length = Buffer.allocUnsafe(8);
-  length.writeBigUInt64BE(BigInt(bytes.byteLength));
-  hash.update(length);
-  hash.update(bytes);
-}
-
-export function distBuildInputFiles(root) {
-  const declared = DIST_BUILD_INPUT_CLASSES.flatMap((inputClass) =>
-    inputClass.paths
-  );
-  const configuration = rootConfigurationFiles(root);
-  if (!configuration.some((name) => name.startsWith('vite.config.'))) {
-    throw new TypeError('No root Vite configuration was found.');
-  }
-  if (!configuration.some((name) => name.startsWith('tsconfig'))) {
-    throw new TypeError('No root TypeScript configuration was found.');
-  }
-  return [...new Set([...declared, ...configuration]
-    .flatMap((inputPath) => regularFiles(root, inputPath))
-    .map((file) => relative(root, file).split(sep).join('/')))]
-    .sort();
-}
-
-export function distBuildInputDigest(root) {
-  const hash = createHash('sha256');
-  framed(hash, Buffer.from(CACHE_FORMAT));
-  for (const file of distBuildInputFiles(root)) {
-    framed(hash, Buffer.from(file));
-    framed(hash, readFileSync(resolve(root, file)));
-  }
-  return hash.digest('hex');
-}
-
-function directoryDigest(directory) {
-  const hash = createHash('sha256');
-  framed(hash, Buffer.from(CACHE_FORMAT));
-  for (const file of regularFiles(directory, '.').map((path) =>
-    relative(directory, path).split(sep).join('/')
-  ).sort()) {
-    framed(hash, Buffer.from(file));
-    framed(hash, readFileSync(resolve(directory, file)));
-  }
-  return hash.digest('hex');
-}
-
-function nonce() {
-  return `${String(process.pid)}.${randomBytes(8).toString('hex')}`;
-}
-
-export function productionBuildEnv(parentEnv) {
-  return {
-    ...parentEnv,
-    NODE_ENV: 'production',
-  };
-}
-
-function cachePointer(inputDigest) {
-  return join(CACHE_ROOT, `${inputDigest}.json`);
-}
-
-function cacheGeneration(inputDigest, generation) {
-  if (!generation.startsWith(`${inputDigest}.`) || !/^[a-f0-9.]+$/u.test(generation)) {
-    throw new TypeError('Dist cache generation name is malformed.');
-  }
-  const generations = resolve(CACHE_ROOT, 'generations');
-  const candidate = resolve(generations, generation);
-  if (!candidate.startsWith(`${generations}${sep}`)) {
-    throw new TypeError('Dist cache generation escaped its cache root.');
-  }
-  return candidate;
-}
-
-function readStamp(inputDigest) {
-  const decoded = JSON.parse(readFileSync(cachePointer(inputDigest), 'utf8'));
-  if (
-    decoded === null || typeof decoded !== 'object' ||
-    decoded.format !== CACHE_FORMAT || decoded.inputDigest !== inputDigest ||
-    typeof decoded.distDigest !== 'string' ||
-    !/^[a-f0-9]{64}$/u.test(decoded.distDigest) ||
-    typeof decoded.generation !== 'string'
-  ) {
-    throw new TypeError('Dist cache stamp is malformed.');
-  }
-  return decoded;
-}
-
-function restoreCachedDist(root, inputDigest) {
-  const temporary = resolve(root, `.dist-cache-restore.${nonce()}.partial`);
+  length.writeBigUInt64BE(BigInt(bytes.length));
+  hash.update(length).update(bytes); }
+function git(root, args, input, allowOne = false) {
+  const result = spawnSync('git', args, {
+    cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, input,
+    maxBuffer: 64 * 1024 * 1024,
+  });
+  if (result.error !== undefined || (result.status !== 0 && !(allowOne && result.status === 1))) {
+    bypass('git-failure'); }
+  return result; }
+function nul(bytes) {
+  if (bytes.length === 0) return [];
+  if (bytes.at(-1) !== 0) bypass('git-failure');
+  const output = [];
+  let start = 0;
+  while (start < bytes.length) {
+    const end = bytes.indexOf(0, start);
+    output.push(bytes.subarray(start, end));
+    start = end + 1; }
+  return output; }
+function overlayCompare(a, b) {
+  return Buffer.compare(a.current, b.current) || Buffer.compare(a.old ?? Buffer.alloc(0), b.old ?? Buffer.alloc(0)) ||
+    Buffer.compare(a.status, b.status); }
+export function sortOverlayRecords(records) { return [...records].sort(overlayCompare); }
+function parseStatus(bytes) {
+  const [fields, output] = [nul(bytes), []];
+  for (let index = 0; index < fields.length; index += 1) {
+    const field = fields[index];
+    if (field.length < 4 || field[2] !== 32) bypass('git-failure');
+    const status = field.subarray(0, 2);
+    const moved = status.includes(67) || status.includes(82);
+    const old = moved ? fields[++index] : undefined;
+    if (moved && old === undefined) bypass('git-failure');
+    output.push({ status, old, current: field.subarray(3) }); }
+  return sortOverlayRecords(output); }
+function validatePath(path) {
+  if (path.includes(10) || path.includes(13)) {
+    bypass('unsupported-path'); } }
+function statesFor(root, paths) {
+  const [states, extant] = [new Map(), []];
+  for (const path of paths) {
+    validatePath(path);
+    const key = path.toString('hex');
+    if (states.has(key)) continue;
+    try {
+      const stat = lstatSync(Buffer.concat([Buffer.from(`${root}${sep}`), path]));
+      if (stat.isSymbolicLink()) bypass('symlink');
+      if (!stat.isFile()) bypass('git-failure');
+      states.set(key, { mode: stat.mode & 0o111 ? '100755' : '100644' });
+      extant.push(path); } catch (error) {
+      if (error?.cacheBypass !== undefined) throw error;
+      if (error?.code !== 'ENOENT') bypass('git-failure');
+      states.set(key, undefined); } }
+  extant.sort(Buffer.compare);
+  const input = Buffer.concat(extant.map((path) => Buffer.concat([path, Buffer.of(10)])));
+  const raw = extant.length === 0 ? Buffer.alloc(0) :
+    git(root, ['hash-object', '--no-filters', '--stdin-paths'], input).stdout;
+  const ids = raw.length === 0 ? [] : raw.toString('ascii').trimEnd().split('\n');
+  if (ids.length !== extant.length || ids.some((id) => !/^[0-9a-f]{40}$/u.test(id))) bypass('git-failure');
+  extant.forEach((path, index) => states.get(path.toString('hex')).objectId = ids[index]);
+  return states; }
+function allowed(values, actual) {
+  return values === undefined || (!values.includes(`!${actual}`) &&
+    (!values.some((value) => !value.startsWith('!')) || values.includes(actual))); }
+function installation(root, objectId) {
   try {
-    const stamp = readStamp(inputDigest);
-    const cachedDist = join(
-      cacheGeneration(inputDigest, stamp.generation),
-      'dist',
-    );
-    if (directoryDigest(cachedDist) !== stamp.distDigest) return false;
-    cpSync(cachedDist, temporary, { recursive: true, errorOnExist: true });
+    const bytes = readFileSync(resolve(root, 'node_modules/.package-lock.json'));
+    const wanted = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
+    const actual = JSON.parse(bytes.toString('utf8'));
+    const expected = Object.entries(wanted.packages).filter(([path, pkg]) => path !== '' &&
+      allowed(pkg.os, process.platform) && allowed(pkg.cpu, process.arch));
+    const installed = new Map(Object.entries(actual.packages).filter(([path]) => path !== ''));
+    if (expected.some(([, pkg]) => pkg.libc !== undefined) ||
+      wanted.lockfileVersion !== actual.lockfileVersion || expected.length !== installed.size) bypass('stale-install');
+    for (const [path, pkg] of expected) {
+      const found = installed.get(path);
+      if (found === undefined || found.version !== pkg.version) bypass('stale-install');
+      if (pkg.resolved !== undefined && found.resolved !== undefined && pkg.resolved !== found.resolved) {
+        bypass('stale-install'); }
+      if (pkg.integrity !== undefined && found.integrity !== undefined && pkg.integrity !== found.integrity) {
+        bypass('stale-install'); } }
+    return [objectId, createHash('sha256').update(bytes).digest('hex')]; } catch (error) {
+    if (error?.cacheBypass !== undefined) throw error;
+    bypass('stale-install'); } }
+function slot(hash, label, path, states) {
+  frame(hash, label);
+  if (path === undefined) return frame(hash, 'none');
+  frame(hash, path);
+  const state = states.get(path.toString('hex'));
+  if (state === undefined) return frame(hash, 'deleted');
+  frame(hash, 'present');
+  frame(hash, state.mode);
+  frame(hash, state.objectId); }
+export function distCacheVerdict(root, parent = process.env) {
+  let head;
+  try {
+    head = git(root, ['rev-parse', 'HEAD']).stdout.toString('ascii').trim();
+    if (!/^[0-9a-f]{40}$/u.test(head)) bypass('invalid-head');
+    const records = nul(git(root, ['ls-files', '-s', '-z']).stdout);
+    const index = records.map((raw) => {
+      const tab = raw.indexOf(9);
+      const fields = raw.subarray(0, tab).toString('ascii').split(' ');
+      if (tab < 0 || fields.length !== 3 || !/^[0-9a-f]{40}$/u.test(fields[1])) bypass('git-failure');
+      return { raw, mode: fields[0], objectId: fields[1], stage: fields[2], path: raw.subarray(tab + 1) }; });
+    if (index.some(({ mode }) => mode === '160000')) bypass('submodule');
+    if (index.some(({ mode }) => mode === '120000')) bypass('symlink');
+    if (nul(git(root, ['ls-files', '-v', '-z']).stdout).some((item) =>
+      item[0] === 83 || (item[0] >= 97 && item[0] <= 122))) bypass('special-index');
+    const autocrlf = git(root, ['config', '--get', 'core.autocrlf'], undefined, true);
+    if (autocrlf.status === 0 && autocrlf.stdout.toString().trim().toLowerCase() !== 'false') bypass('normalization');
+    if (git(root, ['ls-files', '--', '.gitattributes', '**/.gitattributes']).stdout.length) bypass('normalization');
+    const paths = Buffer.concat(index.map(({ path }) => Buffer.concat([path, Buffer.of(0)])));
+    const attrs = nul(git(root, ['check-attr', '-z', '--stdin', ...ATTRS], paths).stdout);
+    if (attrs.length !== index.length * ATTRS.length * 3) bypass('git-failure');
+    if (attrs.some((value, offset) => offset % 3 === 2 && !value.equals(UNSPECIFIED))) bypass('normalization');
+    const lock = index.find(({ path, stage }) => stage === '0' && path.equals(Buffer.from('package-lock.json')));
+    if (lock === undefined) bypass('stale-install');
+    const install = installation(root, lock.objectId);
+    const overlay = parseStatus(git(root, ['status', '--porcelain=v1', '-z',
+      '--untracked-files=all', '--ignore-submodules=none']).stdout);
+    const publicPaths = nul(git(root, ['ls-files', '-z', '--others', '--ignored',
+      '--exclude-standard', '--', 'public']).stdout).sort(Buffer.compare);
+    const dirtyPaths = overlay.flatMap(({ old, current }) => old === undefined ? [current] : [old, current]);
+    const states = statesFor(root, [...dirtyPaths, ...publicPaths]);
+    const env = productionBuildEnv(parent);
+    const names = ['LANG', 'LC_ALL', 'NODE_ENV', 'STATIC_APP_CACHE_DIR']
+      .filter((name) => env[name] !== undefined).sort();
+    const hash = createHash('sha256');
+    [FORMAT, head, process.version, process.platform, process.arch, ...install].forEach((value) => frame(hash, value));
+    names.forEach((name) => frame(hash, `${name}=${env[name]}`));
+    records.forEach((raw) => frame(hash, Buffer.concat([raw, Buffer.of(0)])));
+    overlay.forEach((item) => {
+      frame(hash, item.status);
+      slot(hash, 'old', item.old, states);
+      slot(hash, 'new', item.current, states); });
+    publicPaths.forEach((path) => {
+      frame(hash, path);
+      frame(hash, states.get(path.toString('hex')).objectId); });
+    for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
+      frame(hash, name);
+      frame(hash, existsSync(resolve(root, name)) ? 'present' : 'absent');
+      if (existsSync(resolve(root, name))) {
+        frame(hash, createHash('sha256').update(readFileSync(resolve(root, name))).digest('hex')); } }
+    return { cacheable: true, head, key: hash.digest('hex') }; } catch (error) {
+    if (error?.cacheBypass !== undefined) return { cacheable: false, head, reason: error.cacheBypass };
+    throw error; } }
+// KEY_VERDICT_END
+function filesBelow(directory) { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
+    const path = join(directory, entry.name);
+    if (entry.isDirectory()) return filesBelow(path);
+    if (entry.isFile()) return [path];
+    throw new Error('dist contains a non-regular entry'); }); }
+function directoryDigest(directory) { const hash = createHash('sha256');
+  frame(hash, FORMAT);
+  for (const path of filesBelow(directory).sort()) {
+    frame(hash, relative(directory, path).split(sep).join('/'));
+    frame(hash, readFileSync(path)); }
+  return hash.digest('hex'); }
+const nonce = () => `${process.pid}.${randomBytes(8).toString('hex')}`;
+function artifactMatches(directory, head) { const value = JSON.parse(
+  readFileSync(join(directory, 'vtt-handoff-artifact.json'), 'utf8'));
+  if (value.commit !== head) throw new Error(`artifact commit ${String(value.commit)} != ${head}`); }
+function run(root, descriptors, env) { for (const descriptor of descriptors) {
+    const result = spawnSync(process.execPath, [resolve(root, descriptor.script), ...descriptor.args], {
+      cwd: root, env, stdio: 'inherit',
+    });
+    if (result.error !== undefined || result.status !== 0) {
+      throw result.error ?? new Error(`${descriptor.script} failed with ${String(result.status)}`); } } }
+function restore(root, cacheRoot, verdict, env) { const temporary = resolve(
+  root, `.dist-cache-restore.${nonce()}.partial`);
+  try { const stamp = JSON.parse(readFileSync(join(cacheRoot, `${verdict.key}.json`), 'utf8'));
+    if (stamp.format !== FORMAT || stamp.key !== verdict.key || stamp.head !== verdict.head) return false;
+    if (!stamp.generation.startsWith(`${verdict.key}.`) || !/^[a-f0-9.]+$/u.test(stamp.generation)) return false;
+    const cached = resolve(cacheRoot, 'generations', stamp.generation, 'dist');
+    if (directoryDigest(cached) !== stamp.distDigest) return false;
+    cpSync(cached, temporary, { recursive: true, errorOnExist: true });
     if (directoryDigest(temporary) !== stamp.distDigest) return false;
+    artifactMatches(temporary, verdict.head);
     rmSync(resolve(root, 'dist'), { recursive: true, force: true });
     renameSync(temporary, resolve(root, 'dist'));
-    process.stdout.write(`dist cache hit: ${inputDigest}\n`);
-    return true;
-  } catch {
-    return false;
-  } finally {
-    rmSync(temporary, { recursive: true, force: true });
-  }
-}
-
-function runRealBuild(root) {
-  process.stdout.write('dist cache miss: running npm run build\n');
-  const result = spawnSync('npm', ['run', 'build'], {
-    cwd: root,
-    env: productionBuildEnv(process.env),
-    stdio: 'inherit',
-  });
-  if (result.error !== undefined) throw result.error;
-  if (result.status !== 0) {
-    throw new Error(`npm run build failed with exit code ${String(result.status)}.`);
-  }
-}
-
-function storeCachedDist(root, inputDigest) {
-  const generations = join(CACHE_ROOT, 'generations');
-  mkdirSync(generations, { recursive: true });
-  const generation = `${inputDigest}.${nonce()}`;
-  const partial = join(generations, `.${generation}.partial`);
-  const complete = cacheGeneration(inputDigest, generation);
-  const pointerTemporary = `${cachePointer(inputDigest)}.${nonce()}.partial`;
+    run(root, [HIT_GUARD_DESCRIPTOR], env);
+    process.stdout.write(`dist cache hit: ${verdict.key}\n`);
+    return true; } catch {
+    return false; } finally {
+    rmSync(temporary, { recursive: true, force: true }); } }
+function store(root, cacheRoot, verdict) { const name = `${verdict.key}.${nonce()}`;
+  const partial = join(cacheRoot, 'generations', `.${name}.partial`);
+  const complete = join(cacheRoot, 'generations', name);
+  const pointer = join(cacheRoot, `${verdict.key}.json`);
+  const pointerTemporary = `${pointer}.${nonce()}.partial`;
   try {
-    mkdirSync(partial);
-    cpSync(resolve(root, 'dist'), join(partial, 'dist'), {
-      recursive: true,
-      errorOnExist: true,
-    });
+    mkdirSync(partial, { recursive: true });
+    cpSync(resolve(root, 'dist'), join(partial, 'dist'), { recursive: true, errorOnExist: true });
     const distDigest = directoryDigest(join(partial, 'dist'));
     renameSync(partial, complete);
     writeFileSync(pointerTemporary, `${JSON.stringify({
-      format: CACHE_FORMAT,
-      inputDigest,
-      distDigest,
-      generation,
-    })}\n`, 'utf8');
-    // The generation is complete before this atomic pointer replacement makes
-    // it visible. Concurrent worktrees may both build; readers see one whole,
-    // SHA-256-verified generation or fail open to a real build.
-    renameSync(pointerTemporary, cachePointer(inputDigest));
-    process.stdout.write(`dist cache stored: ${inputDigest}\n`);
-  } finally {
+      format: FORMAT, key: verdict.key, head: verdict.head, distDigest, generation: name,
+    })}\n`);
+    renameSync(pointerTemporary, pointer);
+    process.stdout.write(`dist cache stored: ${verdict.key}\n`); } finally {
     rmSync(partial, { recursive: true, force: true });
-    rmSync(pointerTemporary, { force: true });
-  }
-}
-
-export function buildOrRestoreDist(root) {
-  let inputDigest;
-  try {
-    inputDigest = distBuildInputDigest(root);
-    if (restoreCachedDist(root, inputDigest)) return;
-  } catch (error) {
-    process.stderr.write(
-      `dist cache unavailable; falling back to a real build: ${String(error)}\n`,
-    );
-  }
-  runRealBuild(root);
-  if (inputDigest === undefined) return;
-  try {
-    storeCachedDist(root, inputDigest);
-  } catch (error) {
-    process.stderr.write(
-      `dist cache store failed; keeping the real build: ${String(error)}\n`,
-    );
-  }
-}
-
-const invokedPath = process.argv[1] === undefined
-  ? undefined
-  : resolve(process.argv[1]);
-if (invokedPath === fileURLToPath(import.meta.url)) {
-  try {
-    buildOrRestoreDist(process.cwd());
-  } catch (error) {
+    rmSync(pointerTemporary, { force: true }); } }
+export function buildOrRestoreDist(root, options = {}) { const parent = options.parentEnv ?? process.env;
+  const [env, cacheRoot] = [productionBuildEnv(parent), options.cacheRoot ?? join(tmpdir(), FORMAT)];
+  const first = distCacheVerdict(root, parent);
+  if (!first.cacheable) {
+    process.stdout.write(`dist cache bypass: ${first.reason}\n`);
+    run(root, VALIDATED_BUILD_DESCRIPTORS, env);
+    artifactMatches(resolve(root, 'dist'), first.head);
+    return; }
+  if (restore(root, cacheRoot, first, env)) return;
+  process.stdout.write(`dist cache miss: ${first.key}\n`);
+  run(root, VALIDATED_BUILD_DESCRIPTORS, env);
+  artifactMatches(resolve(root, 'dist'), first.head);
+  const second = distCacheVerdict(root, parent);
+  if (!second.cacheable || second.key !== first.key || second.head !== first.head) {
+    process.stdout.write('dist cache unstable-inputs\n');
+    return; }
+  try { store(root, cacheRoot, first); } catch (error) {
+    process.stderr.write(`dist cache store failed; keeping dist: ${String(error)}\n`); } }
+if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) { try {
+    buildOrRestoreDist(process.cwd()); } catch (error) {
     process.stderr.write(`dist build failed: ${String(error)}\n`);
-    process.exitCode = 1;
-  }
-}
+    process.exitCode = 1; } }

tokens used
995,128
Implemented the frozen M2 R7 plan at HEAD `40f04e2cad4d5d5e170d6caf0adb033e14252990`.

### Implementation summary

| File | Added | Removed | Change |
|---|---:|---:|---|
| [package.json](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/package.json) | 3 | 1 | Added cached and uncached build scripts |
| [build-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/ai-bridge/build-boundary.test.ts) | 18 | 1 | Rewrote guard-route assertion |
| [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts) | 655 | 21 | Added complete Git-key/cache test matrix |
| [scraper-is-never-in-the-bundle.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts) | 20 | 4 | Rewrote guard-route assertion |
| [dist-build-cache.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs) | 234 | 251 | Replaced cache implementation |

The module now computes the ordered Git/index/overlay/environment key, performs all required bypass verdicts, batches dirty hashing, validates hidden-lock state, scrubs child environments, directly invokes the three build descriptors, validates artifact HEAD and generation digests, and rechecks inputs before storing.

Script strings:

```text
build=tsc -b && node tools/dist-build-cache.mjs
build:dist=vite build --configLoader runner
build:dist:validated=tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs
```

### Mutation proof

Exact test command for every mutant:

```sh
npx vitest run --reporter=verbose --configLoader runner \
  tests/unit/tools/dist-build-cache.test.ts
```

Every run exited 1, followed by:

```sh
cp /tmp/m2-dist-build-cache.pristine.mjs tools/dist-build-cache.mjs
```

Every restore produced pristine SHA `b46de8391e31c1cd1b85ed6d8d3334c8498fa6eab8d3975821885064f2fa5162`.

| Mutant | Mutated SHA-256 | Killing test |
|---|---|---|
| DROP_HEAD | `152b3c8da9efc2f8264afc58d8feab115a4a85381a0d9f36c9db4d7a2b550c02` | `HEAD_ONLY_CHANGE_MISS` |
| DROP_STATUS_OVERLAY | `b479eec0952897bc0842d923409b2eb4aed7623cabddb92151db2efea1dd30e8` | `TRACKED_SRC_CONTENT_MISS` |
| DROP_HASH_OBJECT | `82efe86b5b4bcad9556ff12bc003cabeab5a9c85224530d97b22f147ad4b25e5` | `DIRTY_BYTES_BEAT_MTIME` |
| DROP_ENV_PROBES | `33074a1f11e3e8e203af4e8adc8f5abd7aa5223f51c95ef330584303ae2c0441` | `VITE_ENV_FILE_MISS ignored=true` |
| SPREAD_PARENT_ENV | `80231c4744af38e947a87327db3aed92460bc31209ee2b3150eb82f96f2c5bcb` | `drops undeclared parent variables...` |
| SKIP_POST_BUILD_RECHECK | `ce002007c75d023e5695c4940d54bee92d98372210a4e27ae8b70e3d23c42101` | `INPUT_CHANGED_DURING_BUILD_NOT_STORED` |
| ACCEPT_STALE_INSTALL | `db6ea241645843b8093daa48eda588bb900a7de3f50448adcbd0bcfcb170401e` | `HIDDEN_LOCK_STALE_BYPASS` |
| IGNORE_DELETIONS | `3eeee978f44e656fecb15b8c025d0656e03a15bb511013d330b775f29ba7782e` | `TRACKED_DELETION_MISS` |
| UNSORTED_OVERLAY | `11048ca62fd1a88b90d52ab4456313248d555ee1e5c602340442f37e0040ff4f` | `OVERLAY_ORDER_IS_CANONICAL` |
| DROP_IGNORED_PUBLIC | `f2f027b0b189ab1fed5fe20f0673f19a81473d3abb93df5513fa94798f822169` | `IGNORED_PUBLIC_FILE_MISS` |
| PASS_PARENT_LOCALE | `e7692fc5306b8324699576723e5ca8cfe4bb6c16fc9b30888854edeb998acbe8` | Environment and `FIXED_LOCALE_OUTPUT` controls |
| DROP_HIT_GUARD | `b955a34df0de0598889b2aa27f593eccf088bd772a46015c0759b28ac55f3091` | `FIXED_LOCALE_OUTPUT` |
| DROP_EFFECTIVE_ATTRS | `9c262ebcf9ee3f483d19616e4b6c6037a2e244ade9f2500562b70cc98e723b67` | `EFFECTIVE_ATTRIBUTES_BYPASS` |
| ALLOW_SYMLINK | `d6eb3b6a529ded3db0fb23313700373c6b47a2d926aeddb1cbfba7a6ab46d0fd` | `UNTRACKED_SYMLINK_BYPASS` |
| ALLOW_NORMALIZATION | `073bb188abfae5446e0b61f38c3015527c6c33a6195854a9ac5d093b2dc40128` | `AUTOCRLF_BYPASS` |
| SPAWN_NPM | `92746e9cac825ec93f6d4d080fd0cca782cb2f2f565a34af2db2fbf94716a664` | `DIRECT_DESCRIPTORS_MATCH_SCRIPT_LEAVES` and `HOST_NPM_CONFIG_IS_INERT` |
| DROP_SYMLINK_BYPASS | `05276ea8fb9cfb8dc100a3db417b22bda45364f115276a74101e4c00d323cec9` | `INDEXED_SYMLINK_BYPASS` |
| DROP_ATTR_CHECK | `fdb0924350ff19b236e1b8b4ad24924e05a748054af402c7bf811268286b20ed` | `EFFECTIVE_ATTRIBUTES_BYPASS` |
| DROP_QUOTE_BYPASS | `84d42a247441e8a5b705c0c266f7d7189ad745a1d108932dd7dbc9ed72ae3b1b` | All three quoted-path controls |

`DROP_SYMLINK_BYPASS` initially survived because a staged symlink was also visible in the dirty overlay. The fixture was strengthened by committing the symlink, isolating the index-mode verdict; the rerun then exited 1 as shown above.

### FINAL GREEN

```text
npx tsc -b --force
exit 0

sg scan
exit 0, 0 findings

node --check tools/dist-build-cache.mjs
exit 0

npx vitest run --configLoader runner \
  tests/unit/tools/dist-build-cache.test.ts \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts

Test Files  3 passed (3)
Tests       61 passed (61)
Duration    5.38s
```

Descriptor/script equivalence control:

```text
✓ public script and direct descriptor equivalence >
  DIRECT_DESCRIPTORS_MATCH_SCRIPT_LEAVES
Tests 1 passed | 41 skipped (42)
```

Size and formatting:

```text
module_lines=250
key_verdict_lines=150
tools/dist-build-cache.mjs                         max=119  over120=0
tests/unit/tools/dist-build-cache.test.ts           max=116  over120=0
tests/unit/tools/scraper-is-never-in-the-bundle... max=112  over120=0
tests/unit/ai-bridge/build-boundary.test.ts         max=113  over120=0
package.json                                        max=223  over120=4
```

The four `package.json` exceptions are pre-existing script string literals at lines 29, 47, 48, and 50. All newly changed script lines are within 120 columns.

```text
git diff --check
exit 0
```

Discovery:

```text
npx vitest list --configLoader runner --filesOnly --json \
  > /tmp/m2-impl-after.json

files_only_exit=0
files_only_rows=641
baseline_delta=0
fixture_paths=0
```

The required final Vitest command was:

```text
npx vitest list --configLoader runner --json > /tmp/m2-impl-bare.json

bare_json_exit=0
bare_json_rows=11444
changed_spec_test_rows=61
bare_fixture_paths=0
```

The bare output retained the existing spell-cache informational prefix; parsing the following JSON payload produced the counts above.

Integrity:

```text
plan:
a63d3e903439487b6e2898a37411c7634bb1454b9966f9454d2670b4e560c279
701 lines, 39974 bytes

module/pristine:
b46de8391e31c1cd1b85ed6d8d3334c8498fa6eab8d3975821885064f2fa5162

package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
unchanged

src/vtt/intel/contracts.ts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

tools/dist-build-inputs.mjs:
absent
```

Final `git status --short`:

```text
 M package.json
 M tests/unit/ai-bridge/build-boundary.test.ts
 M tests/unit/tools/dist-build-cache.test.ts
 M tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
 M tools/dist-build-cache.mjs
```

M2 IMPL DONE
