Implemented all remaining runtime-guard findings RG-F4–RG-F12.

Key changes:

- Symbol-backed, monotonic loader-role propagation, including `createRequire` results and scoped aliases: [heldout-runtime-guard.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:347)
- Edge discovery now runs inside the aggregate timeout: [heldout-runtime-guard.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:509)
- Loader kinds reach Vite, with require-aware resolution conditions: [worker.mjs](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:562)
- Filesystem IDs are realpathed before protected/boundary classification, without changing load IDs: [worker.mjs](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:253)
- `deps` and `dynamicDeps` are traversed with full provenance: [worker.mjs](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:725)
- Actually loaded extended configurations are returned and included in retained Rule N inspection: [heldout-leak-check.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1572)
- Explicit canonical projection excludes only environmental preflight fields while retaining all findings and provenance: [heldout-runtime-guard.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:165)
- Added regressions for symlinks, require conditions, tools-only SSR metadata, activated dependency hooks, opaque-array references, extended-config Rule N, cycle behavior, and separate-process determinism: [integration spec](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:793), [unit spec](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:74)

The injected-control finding counts changed from 5/3 to 6/4 because SSR transform metadata now supplies an additional genuine edge. The same assertion now independently requires `source: transformed`, `loaderKind: static_import`, and the injected seed.

RG-F6 removal accounting:

```text
432  -> runtime glob matrix, including object-query mutant
458  -> negative-pattern runtime cases
471  -> exact query-suffix evidence
496  -> literal base runtime case
507  -> based leading-globstar fail-closed case
516  -> literal option-spread runtime case
529  -> aliased-glob fail-closed routing
556  -> leading-globstar fail-closed routing
565  -> extglob plus package/alias-glob rejection
1460 -> package #imports runtime fixture
1475 -> unmapped package-import fail-closed fixture
1486 -> exact-before-wildcard fixture
1504 -> overlapping-pattern ordering fixture
1522 -> conditional exact/wildcard fixture
1545 -> nested package-condition fixture
1570 -> candidate-wide package/config execution and inspected counts
1592 -> candidate-wide configuration consumer inspection
1608 -> shorthand/object/array/spread/regex runtime fixtures
1647 -> nonliteral configuration execution failure
1664 -> shadowed alias-name runtime fixture
1686 -> alias-entry spread override fixture
1710 -> nonliteral entry-spread failure
1728 -> whole-variable and property reassignment fixtures
1756 -> push/assign/reference-transfer fixtures
1797 -> return/closure/receiver/class-field fixtures
1834 -> object/array/nested/computed transfer fixtures
1913 -> loop/constructor/fill/shadowed-helper fixtures
1962 -> F47 getter, side effect, and F48 export fixtures
1995 -> F54 mutation plus clean reference controls
2047 -> resolve/test alias-address fixtures
2083 -> helper-built Vitest test-container fixture
2104 -> literal test.alias discovery and redirect
2128 -> F60 comparison fixtures
2155 -> F61 const-alias use and void control
2175 -> F62 shorthand/container-spread fixtures
2209 -> shorthand discovery redirect control
2234 -> F63 root forms and nonsemantic-build control
2272 -> F64 semantic placement fixtures
2313 -> alias-array discovery and redirect
2338 -> plugin-only placement control
2353 -> F65 direct/const/two-level indirection
2387 -> plugin-only indirection control
2403 -> F66 project mutation/composition forms
2434 -> literal project alias and redirect
2459 -> F67 runtime-index mutation
2486 -> both safe spread-order controls
2510 -> F69 terminal binding fixtures
2541 -> F68 literal project extends
2569 -> helper/variable/missing/outside extends; cycle behavior explicitly documented
2597 -> extends:true root-reuse control
2608 -> runtime-reported loaded config plus retained Rule N inspection
2632 -> callback/conditional/const-spread fixtures and real config
2659 -> Vitest defineConfig/mergeConfig fixtures
2690 -> Rule C intentionally retired; executable outcomes and inert clean controls routed to runtime
2717 -> nonmatching regex control
2734 -> real configs, exact eligible/AST-inspected counts
2741 -> injected alias/resolveId controls and exact counts
2750 -> declaration-file exclusion and counts
```

The two moved Rule N assertions remain static. The two Rule C audit assertions remain intentionally retired; the loader-only audit remains.

Verification:

- `npm run typecheck:fast` — exit 0
- `sg scan` — exit 0
- `git diff --check` — exit 0
- `node --check tools/heldout-runtime-guard-worker.mjs` — exit 0
- Unit runtime guard — 21/21
- Isolation supervisor spec — 263/263, 357.70s
- Leak-check spec — 239/239
- Ten-spec cumulative — 496/496
- Exact real-tree CLI, twice — both completed, zero findings, 782/782 files inspected, 56,794 resolutions, 15 load rows
- Full report SHA-256, both runs: `2e92658fe0500f40d32c54cf868be545bb922e8f109c127d3aee46368c1cd964`
- Canonical report SHA-256, both runs: `11293a72d7c79478257b86de199d6a2781d69c8741d546ccadfdc942f905a6ef`
- Preflight: passed; bubblewrap 0.6.1, Node v24.13.0, 21 UID tasks, `nproc=2048`, all nine isolation canaries passed
- 66 fixture hashes unchanged; manifest digest `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Updated [plan](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md) SHA-256: `3adcf9809ff167d4c6a42bd8a30f64b8c714839e24184a90d3c1b0d3ad48eb62`

No fixture, frozen-contract, package, documentation, or source-domain files changed. Five authorized tracked files changed: 614 additions, 120 deletions.

RUNTIME GUARD R3 DONE
diff --git a/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md b/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
index 623912119c5e05ef3d046f90844ced525bd9e8ac..d73a06c7c43ba8c550aee11c6fdf4800f6a9522e
--- a/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
+++ b/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
@@ -147,6 +147,8 @@
 
 Runtime traversal follows **value edges only**: static imports that survive erasure, dynamic imports, value re-exports, recognized worker/URL loading edges, and imports emitted by real `import.meta.glob` transformation. Direct worker/URL specifiers are resolved in the owning serve/test environment in this slice; the separate worker build/plugin pipeline remains deferred. `import type`, `export type`, type-only specifiers, JSDoc type imports, and all other erased edges remain authoritative static checks and never become runtime leaks. This distinction is required by the permitted type-only edge at `src/vtt/room-generator.ts:37`, reached from `src/vtt/watabou-adapter.ts:18`.
 
+The retained handoff is symbol-backed and monotonic: loader roles are keyed by TypeScript symbol identity, so same-spelled bindings in different scopes cannot overwrite one another. It includes `createRequire` imports and call results. Each queued edge retains its loader kind; `require`, `require.resolve`, import-equals, and `createRequire` results call Vite resolution with `custom['node-resolve'].isRequire: true` (installed Vite `config.js:32560,32905`). Discovery runs in a terminable worker within the 120-second aggregate budget, before configuration execution.
+
 For each seed/environment:
 
 1. parse only literal runtime-value source edges with the retained AST discovery, while sending erased edges only to the static wall;
@@ -160,6 +162,8 @@
 
 External-boundary rule: resolve first and run protected-identity checks after canonicalization, before stopping. A canonical Node builtin identity is recorded as `external_builtin`. A bare package may stop as `external_dependency` only when its canonical resolved file is contained by the mounted `/work/node_modules` and its package provenance is present in the candidate lock that equals the trusted installation baseline. An opaque `external: true` result is unresolved. Candidate-local packages, workspace links, aliases back into the checkout, virtual modules, URLs, unknown schemes, unresolved bare imports, and anything outside the read-only candidate/node_modules mounts do not qualify and must be traversed or fail closed. Trust in the installation baseline is an explicit gate assumption; lock metadata alone does not authenticate installed bytes. Vite's browser replacement behavior for Node APIs (`node_modules/vite/dist/node/chunks/config.js:32671`) is evidence, not permission to feed `tools/**` into the browser.
 
+Filesystem identity and loading identity are distinct. Every filesystem result is realpathed for protected/boundary classification (including candidate-local symlinks with `preserveSymlinks`), while the resolver's original ID and meaningful query remain the load/transform input. Protected checks run on the canonical identity. After transform, traverse both installed Vite metadata arrays, `deps` and `dynamicDeps` (`config.js:15581,15594`), preserving importer, environment, seed, provenance, and static/dynamic loader kind. Since every eligible `src/**`/server-owned `tools/**` file is already an explicit seed, a resolved query-free eligible seed is transformed under its own deterministic seed rather than recursively repeated under every upstream seed; virtual IDs, query IDs, and non-seed candidate modules still traverse.
+
 ### D. Resolver feature handling
 
 | Feature | Treatment |
@@ -206,6 +210,8 @@
 
 F49–F57 tests that independently prove N1/N2 remain static. Syntax and loader-escape cases are not forced into a runtime “protected” assertion when their contract is fail-closed syntax recognition. No direct-loader assertion is deleted or weakened.
 
+Rule N also applies to every candidate configuration file that the runtime reports as actually loaded, not only root Vite/Vitest names or `src/**`/`tools/**`. The validated worker protocol returns candidate-relative loaded configuration paths (including root-level project `extends` files); the static candidate pass adds those exact files. Installed Vitest does not recursively consume a `test.projects` list found inside an already extended project config, so the cycle control proves one project is instantiated and terminates rather than manufacturing an unresolved import.
+
 #### Exact regression routing (r4–r21)
 
 Migration is audited by **assertion and control**, not declaration count: inventory each positive assertion, exact finding/status assertion, clean control, unresolved control, and false-positive guard before rewriting a declaration. Existing cases are either retained as static contracts or re-expressed in the runtime table without losing those assertions:
@@ -244,14 +250,17 @@
   readonly specifier: string;
   readonly importer: string | null;
   readonly resolvedId: string | null;
+  readonly loaderKind: HeldoutRuntimeValueEdgeKind | null;
   readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control';
   readonly status: 'clean' | 'protected' | 'unresolved' | 'control' | 'external_builtin' | 'external_dependency';
 }[];
+
+readonly loadedConfigurationFiles: readonly string[];
 ```
 
 Add finding kinds `runtime_protocol_resolution` and `configuration_load_failed`. Validate child JSON from `unknown` with exhaustive predicates; never use `any`.
 
-Sort configuration rows by `(file, kind, project, environment, status, errorClass)` and resolutions by `(configuration, project, environment, phase, importer, specifier, source, resolvedId, status)`. Deduplicate identical resolution facts while retaining distinct configuration/project/environment/phase identity. Canonical `resolvedId` and importer fields rewrite the checkout prefix to `<candidate>/…`, preserve meaningful query suffixes, and strip volatile `?v=`/`?t=` parameters only when the exact unmodified ID is retained in a bounded sidecar diagnostics log outside `HeldoutLeakReport`, the verdict, and the canonical hash. Each raw diagnostic is keyed by configuration/project/environment/phase and the canonical row key. Vite hashes discovered dependencies with a session timestamp (`node_modules/vite/dist/node/chunks/config.js:34108,34344-34345`), which is why optimizer execution is deferred. Normalize separators/error classes and omit timings, PIDs, random paths, and stacks from the canonical section. The byte-identical-report contract applies to the canonical configuration/resolution/findings section only; diagnostics are explicitly outside that contract.
+Sort configuration rows by `(file, kind, project, environment, status, errorClass)` and resolutions by `(configuration, project, environment, phase, importer, specifier, loaderKind, source, resolvedId, status)`. Deduplicate identical resolution facts while retaining distinct configuration/project/environment/phase identity. Canonical `resolvedId` and importer fields rewrite the checkout prefix to `<candidate>/…`, preserve meaningful query suffixes, and strip volatile `?v=`/`?t=` parameters only when the exact unmodified ID is retained in a bounded sidecar diagnostics log outside `HeldoutLeakReport`, the verdict, and the canonical hash. Each raw diagnostic is keyed by configuration/project/environment/phase and the canonical row key. Vite hashes discovered dependencies with a session timestamp (`node_modules/vite/dist/node/chunks/config.js:34108,34344-34345`), which is why optimizer execution is deferred. Normalize separators/error classes and omit timings, PIDs, random paths, and stacks from the canonical section. The explicit canonical projection removes only host runtime path, `uidTaskCount`, derived `nprocLimit`, and `attempts[].profile`; it retains every finding and resolution/provenance field. Determinism compares two separate processes, never cached preflight state. The byte-identical-report contract applies to that canonical projection only; full operational reports may differ in the excluded preflight fields.
 
 ### H. Assert installed dependency provenance without manifest churn
 
diff --git a/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts b/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
index 0398a883f3af815f8ddf1bdf087a56ddf8a3a600..18e91fdc8942ea80be39638f1f2206e383a85abe
--- a/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
+++ b/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
@@ -1,5 +1,7 @@
+import { spawnSync } from 'node:child_process';
 import { tmpdir } from 'node:os';
 import { dirname, join } from 'node:path';
+import { pathToFileURL } from 'node:url';
 import { beforeAll, describe, expect, it } from 'vitest';
 import {
   mkdirSync,
@@ -15,6 +17,7 @@
   runHeldoutRuntimeGuard,
   type HeldoutRuntimeGuardReport,
 } from '../../tools/heldout-runtime-guard';
+import { inspectHeldoutCandidateTree } from '../../tools/heldout-leak-check';
 
 const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
 const bindings = {
@@ -74,6 +77,7 @@
   readonly expectedSpecifier?: string;
   readonly aggregateTimeoutMs?: number;
   readonly lockFile?: string;
+  readonly symlinks?: Readonly<Record<string, string>>;
 }
 
 interface MigratedRuntimeCase extends RuntimeFixture {
@@ -294,7 +298,9 @@
   },
   {
     finding: 'activated-dependency-plugin',
-    config: `import {automockPlugin} from '@vitest/mocker/node';export default {plugins:[automockPlugin()],resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
+    config: `import {dynamicImportPlugin} from '@vitest/mocker/node';export default {plugins:[dynamicImportPlugin({globalThisAccessor:"(await import('/src/vtt/heldout-evaluation.ts'))"})]};`,
+    consumer: "void import('./ordinary');",
+    expectedSpecifier: '/src/vtt/heldout-evaluation.ts',
   },
   {
     finding: 'plugin-configResolved',
@@ -381,6 +387,22 @@
       imports: { '#policy': protectedPackageTarget } }),
   },
   {
+    finding: 'RG-F4-createRequire-result',
+    config: 'export default {};',
+    consumer: "import {createRequire} from 'node:module';const load=createRequire(import.meta.url);load('#policy');",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
+      imports: { '#policy': { require: protectedPackageTarget, import: './src/ordinary.ts' } } }),
+  },
+  {
+    finding: 'RG-F4-require-condition',
+    config: 'export default {};',
+    consumer: "require('#policy');",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
+      imports: { '#policy': { require: protectedPackageTarget, import: './src/ordinary.ts' } } }),
+  },
+  {
     finding: 'package-exact-before-wildcard',
     config: 'export default {};',
     consumer: "import value from '#policy';void value;",
@@ -513,6 +535,10 @@
     configFile: 'vitest.config.mjs',
     config: `const project={};const projects=[project];function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(project);export default {test:{projects:projects}};`,
   },
+  {
+    finding: 'opaque-array-helper-receives-shared',
+    config: `const shared={resolve:{alias:{}}};function helper(value){value.resolve.alias['@policy']='${protectedTarget}';return false}export default {...shared,plugins:[helper(shared)]};`,
+  },
 ] as const;
 
 const cleanRuntimeControls: readonly MigratedRuntimeCase[] = [
@@ -532,6 +558,11 @@
     consumer: "import value from './ordinary'; void value;",
   },
   {
+    finding: 'opaque-array-const-subtree-alias',
+    config: `const shared={plugins:[]};const p=shared.plugins;export default {...shared,plugins:[...p]};`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
     finding: 'F60-strict-equality',
     config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};void(shared===shared);export default shared;`,
   },
@@ -586,8 +617,8 @@
   },
   {
     finding: 'dormant-dependency-plugin',
-    config: "import {automockPlugin} from '@vitest/mocker/node';const dormant=automockPlugin();void dormant;export default {};",
-    consumer: "import value from './ordinary';void value;",
+    config: "import {dynamicImportPlugin} from '@vitest/mocker/node';const dormant=dynamicImportPlugin({globalThisAccessor:\"(await import('/src/vtt/heldout-evaluation.ts'))\"});void dormant;export default {};",
+    consumer: "void import('./ordinary');",
   },
   {
     finding: 'spread-transfer-does-not-mutate-config',
@@ -638,22 +669,30 @@
   writeFileSync(target, readFileSync(source));
 }
 
-async function inspectFixture(fixture: RuntimeFixture): Promise<HeldoutRuntimeGuardReport> {
+function prepareFixtureRoot(fixture: RuntimeFixture): string {
   const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-fixture-'));
   lastFixtureRoot = root;
+  writeFixtureFile(root, 'package.json', fixture.packageJson ??
+    JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module' }));
+  if (fixture.lockFile === undefined) copyRepositoryPath('package-lock.json', join(root, 'package-lock.json'));
+  else writeFixtureFile(root, 'package-lock.json', fixture.lockFile);
+  mkdirSync(join(root, 'node_modules'));
+  writeFixtureFile(root, fixture.configFile ?? 'vite.config.mjs', fixture.config);
+  writeFixtureFile(root, 'src/consumer.ts', fixture.consumer ?? "import value from '@policy'; export { value };");
+  writeFixtureFile(root, 'src/ordinary.ts', 'export default 1;');
+  writeFixtureFile(root, 'src/vtt/heldout-evaluation.ts', 'export default 2;');
+  for (const [path, source] of Object.entries(fixture.files ?? {})) writeFixtureFile(root, path, source);
+  for (const [path, target] of Object.entries(fixture.symlinks ?? {})) {
+    mkdirSync(dirname(join(root, path)), { recursive: true });
+    const linked = spawnSync('/bin/ln', ['-s', target, join(root, path)], { encoding: 'utf8' });
+    if (linked.status !== 0) throw new TypeError(`Unable to create fixture symlink: ${linked.stderr}`);
+  }
+  return root;
+}
+
+async function inspectFixture(fixture: RuntimeFixture): Promise<HeldoutRuntimeGuardReport> {
+  const root = prepareFixtureRoot(fixture);
   try {
-    writeFixtureFile(root, 'package.json', fixture.packageJson ??
-      JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module' }));
-    if (fixture.lockFile === undefined) copyRepositoryPath('package-lock.json', join(root, 'package-lock.json'));
-    else writeFixtureFile(root, 'package-lock.json', fixture.lockFile);
-    mkdirSync(join(root, 'node_modules'));
-    writeFixtureFile(root, fixture.configFile ?? 'vite.config.mjs', fixture.config);
-    writeFixtureFile(root, 'src/consumer.ts', fixture.consumer ?? "import value from '@policy'; export { value };");
-    writeFixtureFile(root, 'src/ordinary.ts', 'export default 1;');
-    writeFixtureFile(root, 'src/vtt/heldout-evaluation.ts', 'export default 2;');
-    for (const [path, source] of Object.entries(fixture.files ?? {})) {
-      writeFixtureFile(root, path, source);
-    }
     return await runHeldoutRuntimeGuard({
       root,
       slice: 'F',
@@ -751,6 +790,42 @@
     ]));
   });
 
+  it('canonicalizes a candidate-local symlink before protected identity classification', async () => {
+    const leak = await inspectFixture({
+      config: "export default {resolve:{preserveSymlinks:true,alias:{'@policy':'/work/src/policy-link.ts'}}};",
+      symlinks: { 'src/policy-link.ts': 'vtt/heldout-evaluation.ts' },
+    });
+    const clean = await inspectFixture({
+      config: "export default {resolve:{preserveSymlinks:true,alias:{'@policy':'/work/src/policy-link.ts'}}};",
+      symlinks: { 'src/policy-link.ts': 'ordinary.ts' },
+    });
+
+    expect(leak.resolution).toContainEqual(expect.objectContaining({
+      specifier: '@policy',
+      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
+      status: 'protected',
+    }));
+    expect(leak.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
+    expect(clean.findings).toEqual([]);
+  });
+
+  it('preserves require provenance and selects the require package condition', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "import {createRequire} from 'node:module';const load=createRequire(import.meta.url);load('#policy');",
+      packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
+        '#policy': { require: protectedPackageTarget, import: './src/ordinary.ts' },
+      } }),
+    });
+
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '#policy',
+      loaderKind: 'require',
+      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
+      status: 'protected',
+    }));
+  });
+
   it.each([
     ['opaque external', "export default {plugins:[{name:'opaque',resolveId(id){if(id==='@policy')return {id:'opaque-policy',external:true}}}]};"],
     ['unloadable virtual result', "export default {plugins:[{name:'unloadable',resolveId(id){if(id==='@policy')return '\\0virtual:missing'} }]};"],
@@ -827,7 +902,8 @@
     ]));
     const report = await inspectFixture({
       ...runtimeCase,
-      config: runtimeCase.config.replaceAll(protectedTarget, '/work/src/ordinary.ts'),
+      config: runtimeCase.config.replaceAll(protectedTarget, '/work/src/ordinary.ts')
+        .replaceAll('/src/vtt/heldout-evaluation.ts', '/src/ordinary.ts'),
       files: redirectedFiles,
       ...(runtimeCase.packageJson === undefined ? {} : {
         packageJson: runtimeCase.packageJson
@@ -840,7 +916,8 @@
     expect(report.findings).toEqual([]);
     expect(report.resolution).toContainEqual(expect.objectContaining({
       configuration: runtimeCase.configFile ?? 'vite.config.mjs',
-      specifier: runtimeCase.expectedSpecifier ?? '@policy',
+      specifier: (runtimeCase.expectedSpecifier ?? '@policy')
+        .replaceAll('/src/vtt/heldout-evaluation.ts', '/src/ordinary.ts'),
       resolvedId: '<candidate>/src/ordinary.ts',
       phase: 'resolve',
       status: 'resolved',
@@ -930,6 +1007,38 @@
     expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
   });
 
+  it('traverses tools-only SSR dynamicDeps generated by import.meta.glob', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "import value from './ordinary';void value;",
+      files: {
+        'tools/runtime-glob.ts': "export const modules=import.meta.glob('../src/vtt/heldout-*.ts');",
+      },
+    });
+
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      seed: 'tools/runtime-glob.ts',
+      source: 'transformed',
+      loaderKind: 'dynamic_import',
+      status: 'protected',
+    }));
+  });
+
+  it('traverses tools-only SSR dynamicDeps generated by an activated plugin', async () => {
+    const report = await inspectFixture({
+      config: `export default {plugins:[{name:'runtime-generated-import',transform(code,id){return id.endsWith('/tools/runtime-plugin.ts')?code+"\\nvoid import('/src/vtt/heldout-evaluation.ts')":null}}]};`,
+      consumer: "import value from './ordinary';void value;",
+      files: { 'tools/runtime-plugin.ts': 'export const value=1;' },
+    });
+
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      seed: 'tools/runtime-plugin.ts',
+      source: 'transformed',
+      loaderKind: 'dynamic_import',
+      status: 'protected',
+    }));
+  });
+
   const runtimeGlobCases = [
     [
       'exact glob',
@@ -1092,12 +1201,40 @@
     expect(toolAssignments.every((row) => row.environment !== 'client')).toBe(true);
   });
 
-  it('emits byte-identical canonical reports for identical inputs', async () => {
-    const fixture = { config: `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` };
-    const first = await inspectFixture(fixture);
-    const second = await inspectFixture(fixture);
+  it('emits byte-identical canonical reports from separate processes', () => {
+    const root = prepareFixtureRoot({
+      config: `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
+    });
+    try {
+      const moduleUrl = pathToFileURL(join(process.cwd(), 'tools/heldout-runtime-guard.ts')).href;
+      const script = [
+        `import {canonicalHeldoutRuntimeReport,runHeldoutRuntimeGuard} from ${JSON.stringify(moduleUrl)};`,
+        `const report=await runHeldoutRuntimeGuard({root:process.argv[1],slice:'F',bindings:${JSON.stringify(bindings)}});`,
+        'process.stdout.write(JSON.stringify(canonicalHeldoutRuntimeReport(report)));',
+      ].join('');
+      const run = () => spawnSync(process.execPath, [
+        '--no-warnings', '--experimental-strip-types', '--input-type=module', '-e', script, root,
+      ], { encoding: 'utf8', timeout: 120_000 });
+      const first = run();
+      const second = run();
 
-    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
+      expect(first.status).toBe(0);
+      expect(second.status).toBe(0);
+      expect(first.stderr).toBe('');
+      expect(second.stderr).toBe('');
+      expect(first.stdout).toBe(second.stdout);
+      const canonical: unknown = JSON.parse(first.stdout);
+      expect(canonical).toEqual(expect.objectContaining({
+        resolution: expect.arrayContaining([expect.objectContaining({
+          specifier: '@policy',
+          loaderKind: 'static_import',
+          status: 'protected',
+        })]),
+        findings: expect.arrayContaining([expect.objectContaining({ kind: 'runtime_protocol_resolution' })]),
+      }));
+    } finally {
+      rmSync(root, { recursive: true, force: true });
+    }
   });
 
   it('fails closed when configuration execution throws', async () => {
@@ -1118,8 +1255,6 @@
     ['throwing project extends file', "export default {test:{projects:[{name:'throwing',extends:'./project.config.mjs'}]}};",
       { 'project.config.mjs': "throw new TypeError('extended-config-failure');" }],
     ['outside-repository project extends file', "export default {test:{projects:[{name:'outside',extends:'../outside.config.mjs'}]}};", {}],
-    ['cyclic project extends files', "export default {test:{projects:[{name:'cycle',extends:'./project.config.mjs'}]}};",
-      { 'project.config.mjs': "export default {test:{projects:[{extends:'./vitest.config.mjs'}]}};" }],
   ] as const)('fails closed for a %s', async (_label, config, files) => {
     const report = await inspectFixture({
       configFile: 'vitest.config.mjs',
@@ -1127,13 +1262,51 @@
       files,
     });
 
-    expect(report.findings).toContainEqual(expect.objectContaining(
-      _label === 'cyclic project extends files'
-        ? { kind: 'unresolved_module_edge' }
-        : { kind: 'configuration_load_failed' },
-    ));
-    if (_label !== 'cyclic project extends files') {
-      expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'configuration_load_failed' }));
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
+  });
+
+  it('documents that installed Vitest does not recursively consume project lists from an extended project config', async () => {
+    const report = await inspectFixture({
+      configFile: 'vitest.config.mjs',
+      config: "export default {test:{projects:[{name:'cycle',extends:'./project.config.mjs'}]}};",
+      files: {
+        'project.config.mjs': "export default {test:{projects:[{name:'back',extends:'./vitest.config.mjs'}]}};",
+      },
+      consumer: "import value from './ordinary';void value;",
+    });
+
+    expect(report.findings).toEqual([]);
+    expect(new Set(report.configurationLoad.filter((row) => row.kind === 'vitest-project')
+      .map((row) => row.project))).toEqual(new Set(['0']));
+    expect(report.loadedConfigurationFiles).toContain('project.config.mjs');
+  });
+
+  it('routes every actually loaded root-level extended configuration through retained Rule N', async () => {
+    const fixture: RuntimeFixture = {
+      configFile: 'vitest.config.mjs',
+      config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
+      files: {
+        'project.config.mjs': [
+          "import {createRequire} from 'node:module';",
+          'const box={load:createRequire(import.meta.url)};',
+          'export default {};',
+        ].join('\n'),
+      },
+      consumer: "import value from './ordinary';void value;",
+    };
+    const root = prepareFixtureRoot(fixture);
+    try {
+      const runtime = await runHeldoutRuntimeGuard({ root, slice: 'F', bindings });
+      const staticReport = inspectHeldoutCandidateTree(root, 'F', bindings, runtime.loadedConfigurationFiles);
+
+      expect(runtime.loadedConfigurationFiles).toContain('project.config.mjs');
+      expect(staticReport.findings).toContainEqual(expect.objectContaining({
+        path: 'project.config.mjs',
+        kind: 'loader_reference_escaped',
+      }));
+    } finally {
+      rmSync(root, { recursive: true, force: true });
     }
   });
 
@@ -1206,8 +1379,8 @@
   }, 120_000);
 
   it.each([
-    ['alias', 'alias', 'vite.config.mjs', 5],
-    ['resolveId hook', 'resolver', 'vite.config.mjs', 3],
+    ['alias', 'alias', 'vite.config.mjs', 6],
+    ['resolveId hook', 'resolver', 'vite.config.mjs', 4],
   ] as const)('reports the injected %s and keeps its canonical configuration identity',
     (_label, reportKind, configuration, expectedFindingCount) => {
       const report = reportKind === 'alias' ? injectedAliasRealTreeReport : injectedResolverRealTreeReport;
@@ -1224,6 +1397,12 @@
         resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
         status: 'protected',
       }));
+      expect(report.resolution).toContainEqual(expect.objectContaining({
+        seed: 'src/injected-runtime-consumer.ts',
+        source: 'transformed',
+        loaderKind: 'static_import',
+        status: 'protected',
+      }));
   });
 });
 
@@ -1269,4 +1448,3 @@
     }));
   }, 120_000);
 });
-import { spawnSync } from 'node:child_process';
diff --git a/tests/unit/tools/heldout-runtime-guard.test.ts b/tests/unit/tools/heldout-runtime-guard.test.ts
index 4acb52e3ae58fdf9f94d4c2ddf2764470dfcf5e9..cd51039fc15ed512bfe4570cb0f8567163873d8b
--- a/tests/unit/tools/heldout-runtime-guard.test.ts
+++ b/tests/unit/tools/heldout-runtime-guard.test.ts
@@ -3,6 +3,7 @@
 import { describe, expect, it } from 'vitest';
 import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
 import {
+  canonicalHeldoutRuntimeReport,
   discoverHeldoutRuntimeValueEdges,
   heldoutRuntimeNprocLimit,
   parseHeldoutWorkerReport,
@@ -41,6 +42,7 @@
       specifier: './ordinary',
       importer: '<candidate>/src/main.ts',
       resolvedId: '<candidate>/src/ordinary.ts',
+      loaderKind: 'static_import',
       source: 'graph',
       status: 'clean',
     }],
@@ -50,6 +52,7 @@
       project: null,
       environment: 'client',
     }],
+    loadedConfigurationFiles: ['vite.config.mjs'],
     findings: [],
   };
 }
@@ -68,6 +71,7 @@
     ['constant concatenation', "import('#'+'policy')", 'dynamic_import', '#policy'],
     ['import-meta resolver', "import.meta.resolve('#policy')", 'import_meta_resolve', '#policy'],
     ['resolver alias', "const locate=import.meta.resolve;locate('#policy')", 'import_meta_resolve', '#policy'],
+    ['createRequire result', "import {createRequire} from 'node:module';const load=createRequire(import.meta.url);load('#policy')", 'require', '#policy'],
   ] as const)('retains the %s runtime value edge', (_label, source, kind, specifier) => {
     expect(discoverHeldoutRuntimeValueEdges('src/consumer.ts', source)).toContainEqual({ kind, specifier });
   });
@@ -79,6 +83,42 @@
     )).toContainEqual({ kind: 'aliased_import_meta_glob', specifier: './ordinary.ts' });
   });
 
+  it('tracks same-spelled aliases by symbol and terminates monotonically', () => {
+    expect(discoverHeldoutRuntimeValueEdges('src/consumer.ts', [
+      'const load=require;',
+      "function inner(){const load=import.meta.resolve;load('#ordinary')}",
+      "load('#policy');void inner;",
+    ].join('\n'))).toEqual(expect.arrayContaining([
+      { kind: 'import_meta_resolve', specifier: '#ordinary' },
+      { kind: 'require', specifier: '#policy' },
+    ]));
+  });
+
+  it('canonicalizes only operational preflight fields while retaining provenance', () => {
+    const parsed = parseHeldoutWorkerReport(validWorkerReport(), 'F');
+    const report = {
+      ...parsed,
+      preflight: {
+        status: 'passed' as const,
+        bubblewrapVersion: 'bubblewrap 0.6.1',
+        runtimeRoot: '/host/runtime',
+        runtimeVersion: 'v24.13.0',
+        uidTaskCount: 777,
+        nprocLimit: 2048,
+        attempts: [{ profile: '--nproc=2048', status: 'passed' as const, errorClass: null }],
+        checks: ['network'],
+      },
+    };
+    const canonical = canonicalHeldoutRuntimeReport(report);
+
+    expect(canonical.preflight).not.toHaveProperty('runtimeRoot');
+    expect(canonical.preflight).not.toHaveProperty('uidTaskCount');
+    expect(canonical.preflight).not.toHaveProperty('nprocLimit');
+    expect(canonical.preflight.attempts[0]).not.toHaveProperty('profile');
+    expect(canonical.resolution).toEqual(report.resolution);
+    expect(canonical.findings).toEqual(report.findings);
+  });
+
   it('keeps erased type-only edges out of runtime traversal', () => {
     expect(discoverHeldoutRuntimeValueEdges(
       'src/consumer.ts',
@@ -120,17 +160,17 @@
     try {
       mkdirSync(join(root, 'tools'));
       writeFileSync(join(root, 'vitest.config.mjs'),
-        "export default {test:{projects:[{extends:'./tools/project.config.mjs'}]}};");
-      writeFileSync(join(root, 'tools/project.config.mjs'), [
+        "export default {test:{projects:[{extends:'./project.config.mjs'}]}};");
+      writeFileSync(join(root, 'project.config.mjs'), [
         "import {createRequire} from 'node:module';",
         'const box={load:createRequire(import.meta.url)};',
         'export default {};',
       ].join('\n'));
-      const report = inspectHeldoutCandidateTree(root, 'F', bindings);
+      const report = inspectHeldoutCandidateTree(root, 'F', bindings, ['project.config.mjs']);
 
       expect(report.astInspectedFiles).toBe(2);
       expect(report.findings).toContainEqual(expect.objectContaining({
-        path: 'tools/project.config.mjs',
+        path: 'project.config.mjs',
         kind: 'loader_reference_escaped',
       }));
     } finally {
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index 4b130919e992079d2f4065f1cf539ce36ed4164e..35f765dc6a7a8b27057714a12f497b005a97437a
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -48,6 +48,7 @@
   readonly configurationLoad?: readonly HeldoutConfigurationLoad[];
   readonly resolution?: readonly HeldoutRuntimeResolution[];
   readonly seedAssignments?: readonly HeldoutSeedAssignment[];
+  readonly loadedConfigurationFiles?: readonly string[];
   readonly findings: readonly HeldoutLeakFinding[];
 }
 
@@ -1572,8 +1573,10 @@
   root: string,
   slice: HeldoutSlice,
   bindings: HeldoutLeakBindings,
+  loadedConfigurationFiles: readonly string[] = [],
 ): HeldoutLeakReport {
   const candidateSources: HeldoutChangedText[] = [];
+  const collectedPaths = new Set<string>();
   const collect = (directory: string, prefix = ''): void => {
     for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
       left.name.localeCompare(right.name))) {
@@ -1587,10 +1590,19 @@
       )) {
         const sourceText = readFileSync(absolute, 'utf8');
         candidateSources.push({ path: relative, addedText: sourceText, sourceText });
+        collectedPaths.add(relative);
       }
     }
   };
   collect(root);
+  for (const relative of [...loadedConfigurationFiles].sort()) {
+    if (collectedPaths.has(relative) || relative.startsWith('/') || relative.split('/').includes('..') ||
+      !isTypeScriptOrJavaScript(relative)) continue;
+    const absolute = posix.join(root, relative);
+    const sourceText = readFileSync(absolute, 'utf8');
+    candidateSources.push({ path: relative, addedText: sourceText, sourceText });
+    collectedPaths.add(relative);
+  }
   return inspectHeldoutLeakChanges(candidateSources, slice, bindings);
 }
 
@@ -1788,6 +1800,7 @@
       }],
       resolution: [],
       seedAssignments: [],
+      loadedConfigurationFiles: [],
       findings: [{
         path: '<preflight>',
         kind: 'configuration_load_failed',
@@ -1809,7 +1822,17 @@
   mkdirSync(posix.join(candidateRoot, 'node_modules'));
   try {
     await extractCandidateArchive(config.candidate, candidateRoot);
-    const candidateStaticReport = inspectHeldoutCandidateTree(candidateRoot, config.slice, config.bindings);
+    const runtimeReport = await runHeldoutRuntimeGuard({
+      root: candidateRoot,
+      slice: config.slice,
+      bindings: config.bindings,
+    });
+    const candidateStaticReport = inspectHeldoutCandidateTree(
+      candidateRoot,
+      config.slice,
+      config.bindings,
+      runtimeReport.loadedConfigurationFiles,
+    );
     const staticFindingKeys = new Set<string>();
     const staticFindings = [...changedStaticReport.findings, ...candidateStaticReport.findings].filter((finding) => {
       const key = JSON.stringify(finding);
@@ -1817,11 +1840,6 @@
       staticFindingKeys.add(key);
       return true;
     });
-    const runtimeReport = await runHeldoutRuntimeGuard({
-      root: candidateRoot,
-      slice: config.slice,
-      bindings: config.bindings,
-    });
     const report: HeldoutLeakReport = {
       ...candidateStaticReport,
       findings: [...staticFindings, ...runtimeReport.findings],
@@ -1830,6 +1848,7 @@
       configurationLoad: runtimeReport.configurationLoad,
       resolution: runtimeReport.resolution,
       seedAssignments: runtimeReport.seedAssignments,
+      loadedConfigurationFiles: runtimeReport.loadedConfigurationFiles,
     };
     process.stdout.write(`${JSON.stringify(report)}\n`);
     if (report.findings.length > 0) process.exitCode = 1;
diff --git a/tools/heldout-runtime-guard-worker.mjs b/tools/heldout-runtime-guard-worker.mjs
index 78c1201c8b5611ab28c50f9b2eed5346d8b52c50..7696c54c928f73149cab9af13ec465e3538a4911
--- a/tools/heldout-runtime-guard-worker.mjs
+++ b/tools/heldout-runtime-guard-worker.mjs
@@ -250,6 +250,25 @@
   return value.replaceAll('/work/', '<candidate>/').replace(/^\/work$/u, '<candidate>');
 }
 
+function canonicalFilesystemIdentity(id) {
+  const bare = withoutQuery(id);
+  const suffix = id.slice(bare.length);
+  let path = bare;
+  if (path.startsWith('file:')) {
+    try {
+      path = fileURLToPath(path);
+    } catch {
+      return id;
+    }
+  }
+  if (!path.startsWith('/')) return id;
+  try {
+    return `${realpathSync(path)}${suffix}`;
+  } catch {
+    return id;
+  }
+}
+
 function decodedViteInternalId(id) {
   if (id.startsWith('/@id/__x00__')) return `\0${id.slice('/@id/__x00__'.length)}`;
   if (id.startsWith('/@id/')) return id.slice('/@id/'.length);
@@ -311,7 +330,8 @@
     specifier.startsWith(browserExternalPrefix) && BUILTINS.has(specifier.slice(browserExternalPrefix.length));
 }
 
-function externalBoundary(specifier, id, external) {
+function externalBoundary(specifier, canonicalIdentity, external) {
+  const id = canonicalIdentity;
   if (builtinSpecifier(id) || (id === specifier && builtinSpecifier(specifier))) {
     return { status: 'external_builtin', canonical: id };
   }
@@ -412,6 +432,7 @@
   const configurationLoad = [];
   const resolution = [];
   const seedAssignments = [];
+  const loadedConfigurationFiles = new Set();
   const findings = [];
   const closedContainers = new WeakSet();
   const seeds = sourceSeeds();
@@ -433,18 +454,19 @@
   recordLoad('<preflight>', 'preflight', null, 'isolation', 'loaded', null);
 
   const addResolution = (row) => {
-    resolution.push(row);
-    if (row.status === 'protected' && row.source !== 'protected_control') {
+    const completeRow = { loaderKind: null, ...row };
+    resolution.push(completeRow);
+    if (completeRow.status === 'protected' && completeRow.source !== 'protected_control') {
       findings.push({
-        path: row.importer ?? row.configuration,
+        path: completeRow.importer ?? completeRow.configuration,
         kind: 'runtime_protocol_resolution',
-        detail: `${row.specifier} resolved to ${row.resolvedId ?? '<unresolved>'} in ${row.environment}`,
+        detail: `${completeRow.specifier} resolved to ${completeRow.resolvedId ?? '<unresolved>'} in ${completeRow.environment}`,
       });
-    } else if (row.status === 'unresolved' && row.source !== 'protected_control') {
+    } else if (completeRow.status === 'unresolved' && completeRow.source !== 'protected_control') {
       findings.push({
-        path: row.importer ?? row.configuration,
+        path: completeRow.importer ?? completeRow.configuration,
         kind: 'unresolved_module_edge',
-        detail: `${row.specifier} was unresolved in ${row.environment}`,
+        detail: `${completeRow.specifier} was unresolved in ${completeRow.environment}`,
       });
     }
   };
@@ -486,6 +508,7 @@
     const assigned = includeSeeds
       ? seeds.filter((seed) => seed.startsWith('src/') || serverStyle)
       : [];
+    const assignedIdentities = new Set(assigned.map((seed) => `/work/${seed}`));
     const conditions = conditionsFor(environment);
     for (const seed of assigned) {
       seedAssignments.push({ seed, configuration, project, environment: name });
@@ -495,17 +518,20 @@
       id: `/work/${seed}`,
       seed,
       source: 'graph',
+      loaderKind: null,
     }));
     const importerForAliases = assigned[0] === undefined ? '/work/src/main.ts' : `/work/${assigned[0]}`;
     for (const alias of aliasEntries) {
       if (typeof alias.find !== 'string') continue;
-      queue.push({ id: importerForAliases, seed: '<alias-key>', source: 'alias_key', specifier: alias.find });
+      queue.push({ id: importerForAliases, seed: '<alias-key>', source: 'alias_key', specifier: alias.find,
+        loaderKind: 'static_import' });
     }
     queue.push({
       id: importerForAliases,
       seed: '<protected-control>',
       source: 'protected_control',
       specifier: '/src/vtt/heldout-evaluation.ts',
+      loaderKind: 'static_import',
     });
     const addUnresolvedEdge = (current, specifier, source = current.source) => {
       addResolution({
@@ -519,6 +545,7 @@
         importer: canonicalId(current.id),
         resolvedId: null,
         source,
+        loaderKind: current.loaderKind,
         status: 'unresolved',
       });
     };
@@ -529,17 +556,22 @@
       if (current.specifier !== undefined) {
         let resolvedResult;
         try {
-          resolvedResult = await environment.pluginContainer.resolveId(current.specifier, current.id);
+          const isRequire = current.loaderKind === 'require' || current.loaderKind === 'require_resolve' ||
+            current.loaderKind === 'import_equals';
+          resolvedResult = await environment.pluginContainer.resolveId(current.specifier, current.id, isRequire
+            ? { custom: { 'node-resolve': { isRequire: true } } }
+            : undefined);
         } catch {
           resolvedResult = null;
         }
         const resolvedId = resolvedResult?.id ?? null;
-        const boundary = resolvedId === null ? null : externalBoundary(
+        const canonicalIdentity = resolvedId === null ? null : canonicalFilesystemIdentity(resolvedId);
+        const boundary = canonicalIdentity === null ? null : externalBoundary(
           current.specifier,
-          resolvedId,
+          canonicalIdentity,
           resolvedResult?.external === true,
         );
-        const identity = boundary?.canonical ?? resolvedId;
+        const identity = boundary?.canonical ?? canonicalIdentity;
         let status;
         if (identity !== null && protectedIdentity(identity, request.bindings)) {
           status = current.source === 'protected_control' ? 'control' : 'protected';
@@ -561,14 +593,22 @@
           importer: canonicalId(current.id),
           resolvedId: canonicalId(identity),
           source: current.source,
+          loaderKind: current.loaderKind,
           status,
         });
         if (status === 'unresolved' || status === 'protected' || status === 'control' ||
           status === 'external_builtin' || status === 'external_dependency' || resolvedId === null) continue;
+        if (withoutQuery(resolvedId) === resolvedId && assignedIdentities.has(withoutQuery(canonicalIdentity ?? resolvedId))) {
+          // Every eligible candidate source is an explicit environment seed. Its
+          // own deterministic seed visit supplies transform evidence without
+          // recursively multiplying provenance through the whole source graph.
+          continue;
+        }
         queue.push({
           id: resolvedId,
           seed: current.seed,
           source: current.source,
+          loaderKind: current.loaderKind,
           requested: { specifier: current.specifier, importer: current.id },
         });
         continue;
@@ -593,10 +633,11 @@
           } else {
             const internalId = decodedViteInternalId(edge.specifier);
             if (internalId === null) {
-              queue.push({ id: current.id, seed: current.seed, source: current.source, specifier: edge.specifier });
+              queue.push({ id: current.id, seed: current.seed, source: current.source, specifier: edge.specifier,
+                loaderKind: edge.kind });
             } else {
               queue.push({ id: internalId, seed: current.seed, source: current.source,
-                requested: { specifier: edge.specifier, importer: current.id } });
+                loaderKind: edge.kind, requested: { specifier: edge.specifier, importer: current.id } });
             }
           }
         }
@@ -614,6 +655,7 @@
               importer: canonicalId(current.id),
               resolvedId: null,
               source: 'transformed',
+              loaderKind: 'import_meta_glob',
               status: 'unresolved',
             });
           }
@@ -653,6 +695,7 @@
           importer: canonicalId(current.requested?.importer ?? current.id),
           resolvedId: null,
           source: current.source === 'graph' ? 'transformed' : current.source,
+          loaderKind: current.loaderKind,
           status: 'unresolved',
         });
         continue;
@@ -668,13 +711,25 @@
         importer: canonicalId(current.requested?.importer ?? current.id),
         resolvedId: canonicalId(current.id),
         source: current.source === 'graph' ? 'transformed' : current.source,
+        loaderKind: current.loaderKind,
         status: protectedIdentity(current.id, request.bindings) ||
           textContainsReserveDigest(transformed.code, request.bindings.reserveDigests)
           ? current.source === 'protected_control' ? 'control' : 'protected'
           : 'clean',
       });
       for (const edge of runtimeEdges(ts, current.id, transformed.code)) {
-        queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: edge.specifier });
+        queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: edge.specifier,
+          loaderKind: edge.kind });
+      }
+      for (const [kind, dependencies] of [
+        ['static_import', transformed.deps],
+        ['dynamic_import', transformed.dynamicDeps],
+      ]) {
+        if (!Array.isArray(dependencies)) continue;
+        for (const dependency of [...dependencies].filter((value) => typeof value === 'string').sort()) {
+          queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: dependency,
+            loaderKind: kind });
+        }
       }
     }
   };
@@ -683,6 +738,8 @@
     if (server.httpServer !== null) throw new TypeError('guard_server_listening');
     if (!optimizerIsDisabled(server)) throw new TypeError('optimizer_not_disabled');
     const aliases = Array.isArray(server.config.resolve.alias) ? server.config.resolve.alias : [];
+    const loadedConfig = typeof server.config.configFile === 'string' ? realpathSync(server.config.configFile) : null;
+    if (loadedConfig?.startsWith('/work/') === true) loadedConfigurationFiles.add(loadedConfig.slice('/work/'.length));
     for (const [name, environment] of Object.entries(server.environments).sort(([left], [right]) => left.localeCompare(right))) {
       await inspectEnvironment(configuration, project, name, environment, aliases, includeSeeds);
       recordLoad(configuration, kind, project, name, 'loaded', null);
@@ -789,6 +846,7 @@
     configurationLoad: configurationLoad.sort((left, right) => rowKey(left).localeCompare(rowKey(right))),
     resolution: sortedResolution,
     seedAssignments: sortedAssignments,
+    loadedConfigurationFiles: [...loadedConfigurationFiles].sort(),
     findings: [...new Map(findings.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
       .map((row) => [rowKey(row), row])).values()],
   };
diff --git a/tools/heldout-runtime-guard.ts b/tools/heldout-runtime-guard.ts
index 364041fee8180d856c28509404ce17401f4dece6..d7754144332ea77dba1c16db8042eeca2566c220
--- a/tools/heldout-runtime-guard.ts
+++ b/tools/heldout-runtime-guard.ts
@@ -10,7 +10,8 @@
 } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { dirname, extname, join, resolve } from 'node:path';
-import { fileURLToPath } from 'node:url';
+import { fileURLToPath, pathToFileURL } from 'node:url';
+import { Worker } from 'node:worker_threads';
 import ts from 'typescript';
 
 export const HELDOUT_RUNTIME_PROTOCOL = 'heldout-runtime-v1' as const;
@@ -91,6 +92,7 @@
   readonly specifier: string;
   readonly importer: string | null;
   readonly resolvedId: string | null;
+  readonly loaderKind: HeldoutRuntimeValueEdgeKind | null;
   readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control';
   readonly status:
     | 'clean'
@@ -128,9 +130,59 @@
   readonly configurationLoad: readonly HeldoutConfigurationLoad[];
   readonly resolution: readonly HeldoutRuntimeResolution[];
   readonly seedAssignments: readonly HeldoutSeedAssignment[];
+  /** Candidate-relative configuration files proven to have been loaded by Vite/Vitest. */
+  readonly loadedConfigurationFiles: readonly string[];
+  readonly findings: readonly HeldoutRuntimeFinding[];
+}
+
+export interface HeldoutRuntimeCanonicalReport {
+  readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
+  readonly slice: HeldoutRuntimeGuardRequest['slice'];
+  readonly completed: boolean;
+  readonly eligibleFiles: number;
+  readonly astInspectedFiles: number;
+  readonly preflight: {
+    readonly status: HeldoutRuntimePreflight['status'];
+    readonly bubblewrapVersion: string;
+    readonly runtimeVersion: string;
+    readonly attempts: readonly Omit<HeldoutPreflightAttempt, 'profile'>[];
+    readonly checks: readonly string[];
+    readonly detail?: string;
+  };
+  readonly configurationLoad: readonly HeldoutConfigurationLoad[];
+  readonly resolution: readonly HeldoutRuntimeResolution[];
+  readonly seedAssignments: readonly HeldoutSeedAssignment[];
+  readonly loadedConfigurationFiles: readonly string[];
   readonly findings: readonly HeldoutRuntimeFinding[];
 }
 
+/**
+ * Deterministic evidence projection. UID-wide task counts, the derived process
+ * cap, host runtime path, and attempt profile strings are operational evidence,
+ * not canonical results. Every finding and every resolution/provenance field is
+ * retained verbatim.
+ */
+export function canonicalHeldoutRuntimeReport(report: HeldoutRuntimeGuardReport): HeldoutRuntimeCanonicalReport {
+  const { uidTaskCount: _uidTaskCount, nprocLimit: _nprocLimit, runtimeRoot: _runtimeRoot,
+    attempts, ...stablePreflight } = report.preflight;
+  return {
+    protocol: report.protocol,
+    slice: report.slice,
+    completed: report.completed,
+    eligibleFiles: report.eligibleFiles,
+    astInspectedFiles: report.astInspectedFiles,
+    preflight: {
+      ...stablePreflight,
+      attempts: attempts.map(({ profile: _profile, ...attempt }) => attempt),
+    },
+    configurationLoad: report.configurationLoad,
+    resolution: report.resolution,
+    seedAssignments: report.seedAssignments,
+    loadedConfigurationFiles: report.loadedConfigurationFiles,
+    findings: report.findings,
+  };
+}
+
 interface WorkerRequest {
   readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
   readonly slice: HeldoutRuntimeGuardRequest['slice'];
@@ -245,25 +297,50 @@
 }
 
 type RuntimeLoaderRole = 'require' | 'require_resolve' | 'import_meta_resolve' |
-  'import_meta_glob' | 'worker' | 'shared_worker' | 'import_scripts';
+  'import_meta_glob' | 'worker' | 'shared_worker' | 'import_scripts' |
+  'module_namespace' | 'create_require_factory';
+
+function preparedRuntimeSource(
+  path: string,
+  source: string,
+): { readonly sourceFile: ts.SourceFile; readonly checker: ts.TypeChecker } {
+  const virtualPath = resolve('/', path);
+  const options: ts.CompilerOptions = {
+    allowJs: true,
+    checkJs: false,
+    module: ts.ModuleKind.ESNext,
+    moduleResolution: ts.ModuleResolutionKind.Bundler,
+    noLib: true,
+    target: ts.ScriptTarget.Latest,
+  };
+  const host = ts.createCompilerHost(options, true);
+  host.fileExists = (candidate) => candidate === virtualPath;
+  host.readFile = (candidate) => candidate === virtualPath ? source : undefined;
+  host.getSourceFile = (candidate, languageVersion) => candidate === virtualPath
+    ? ts.createSourceFile(candidate, source, languageVersion, true, runtimeScriptKind(path))
+    : undefined;
+  host.writeFile = () => undefined;
+  const program = ts.createProgram([virtualPath], options, host);
+  const sourceFile = program.getSourceFile(virtualPath);
+  if (sourceFile === undefined) throw new TypeError(`Unable to prepare runtime source ${path}.`);
+  return { sourceFile, checker: program.getTypeChecker() };
+}
 
-function directRuntimeRole(expression: ts.Expression): RuntimeLoaderRole | null {
-  const current = unwrapRuntimeExpression(expression);
-  if (ts.isIdentifier(current)) {
-    if (current.text === 'require') return 'require';
-    if (current.text === 'Worker') return 'worker';
-    if (current.text === 'SharedWorker') return 'shared_worker';
-    if (current.text === 'importScripts') return 'import_scripts';
-  }
-  if (!ts.isPropertyAccessExpression(current)) return null;
-  if (ts.isIdentifier(current.expression) && current.expression.text === 'require' &&
-    current.name.text === 'resolve') return 'require_resolve';
-  if (ts.isMetaProperty(current.expression) && current.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
-    current.expression.name.text === 'meta') {
-    if (current.name.text === 'resolve') return 'import_meta_resolve';
-    if (current.name.text === 'glob') return 'import_meta_glob';
-  }
-  return null;
+function ambientRuntimeIdentifier(identifier: ts.Identifier, checker: ts.TypeChecker): RuntimeLoaderRole | null {
+  const direct = new Map<string, RuntimeLoaderRole>([
+    ['require', 'require'],
+    ['Worker', 'worker'],
+    ['SharedWorker', 'shared_worker'],
+    ['importScripts', 'import_scripts'],
+  ]).get(identifier.text) ?? null;
+  if (direct === null) return null;
+  const symbol = checker.getSymbolAtLocation(identifier);
+  if (symbol === undefined) return direct;
+  const declarations = symbol.declarations ?? [];
+  return declarations.length === 0 || declarations.every((declaration) =>
+    ts.isSourceFile(declaration) ||
+    (ts.canHaveModifiers(declaration) && ts.getModifiers(declaration)?.some((modifier) =>
+      modifier.kind === ts.SyntaxKind.DeclareKeyword) === true)) ? direct : null;
 }
 
 /** Runtime-value edges handed to the isolated real resolver. Type-only syntax is deliberately absent. */
@@ -271,32 +348,89 @@
   path: string,
   source: string,
 ): readonly HeldoutRuntimeValueEdge[] {
-  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, runtimeScriptKind(path));
-  const roles = new Map<string, RuntimeLoaderRole>();
-  const runtimeDeclarations = new Set<string>();
-  const visitDeclarations = (node: ts.Node): void => {
-    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) ||
-      ts.isClassDeclaration(node)) && node.name !== undefined && ts.isIdentifier(node.name) &&
-      !(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) =>
-        modifier.kind === ts.SyntaxKind.DeclareKeyword))) runtimeDeclarations.add(node.name.text);
-    ts.forEachChild(node, visitDeclarations);
+  const { sourceFile, checker } = preparedRuntimeSource(path, source);
+  const roles = new Map<ts.Symbol, Set<RuntimeLoaderRole>>();
+  const addRole = (symbol: ts.Symbol | undefined, role: RuntimeLoaderRole): boolean => {
+    if (symbol === undefined) return false;
+    const current = roles.get(symbol) ?? new Set<RuntimeLoaderRole>();
+    if (current.has(role)) return false;
+    current.add(role);
+    roles.set(symbol, current);
+    return true;
   };
-  visitDeclarations(sourceFile);
-  for (const [name, role] of [
-    ['require', 'require'], ['Worker', 'worker'], ['SharedWorker', 'shared_worker'],
-    ['importScripts', 'import_scripts'],
-  ] as const) if (!runtimeDeclarations.has(name)) roles.set(name, role);
+  const symbolRoles = (identifier: ts.Identifier): ReadonlySet<RuntimeLoaderRole> => {
+    const symbol = checker.getSymbolAtLocation(identifier);
+    const tracked = symbol === undefined ? undefined : roles.get(symbol);
+    if (tracked !== undefined) return tracked;
+    const ambient = ambientRuntimeIdentifier(identifier, checker);
+    return ambient === null ? new Set<RuntimeLoaderRole>() : new Set([ambient]);
+  };
+  const expressionRoles = (expression: ts.Expression): ReadonlySet<RuntimeLoaderRole> => {
+    const current = unwrapRuntimeExpression(expression);
+    if (ts.isIdentifier(current)) return symbolRoles(current);
+    if (ts.isMetaProperty(current) && current.keywordToken === ts.SyntaxKind.ImportKeyword &&
+      current.name.text === 'meta') return new Set<RuntimeLoaderRole>();
+    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
+      const member = ts.isPropertyAccessExpression(current)
+        ? current.name.text
+        : runtimeConstantString(current.argumentExpression);
+      const receiverRoles = expressionRoles(current.expression);
+      const found = new Set<RuntimeLoaderRole>();
+      if (receiverRoles.has('require') && member === 'resolve') found.add('require_resolve');
+      if (receiverRoles.has('module_namespace')) {
+        if (member === 'createRequire') found.add('create_require_factory');
+        if (member === 'default' || member === 'Module') found.add('module_namespace');
+      }
+      if (ts.isMetaProperty(current.expression) && current.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
+        current.expression.name.text === 'meta') {
+        if (member === 'resolve') found.add('import_meta_resolve');
+        if (member === 'glob') found.add('import_meta_glob');
+      }
+      return found;
+    }
+    if (ts.isCallExpression(current)) {
+      const calleeRoles = expressionRoles(current.expression);
+      if (calleeRoles.has('create_require_factory')) return new Set<RuntimeLoaderRole>(['require']);
+      if (current.expression.kind === ts.SyntaxKind.ImportKeyword &&
+        ['node:module', 'module'].includes(runtimeConstantString(current.arguments[0]) ?? '')) {
+        return new Set<RuntimeLoaderRole>(['module_namespace']);
+      }
+    }
+    if (ts.isAwaitExpression(current)) return expressionRoles(current.expression);
+    return new Set<RuntimeLoaderRole>();
+  };
+  const seedImports = (node: ts.Node): void => {
+    if (ts.isImportDeclaration(node) && ['node:module', 'module'].includes(
+      runtimeConstantString(node.moduleSpecifier) ?? '') && node.importClause !== undefined &&
+      !node.importClause.isTypeOnly) {
+      if (node.importClause.name !== undefined) {
+        addRole(checker.getSymbolAtLocation(node.importClause.name), 'module_namespace');
+      }
+      const bindings = node.importClause.namedBindings;
+      if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
+        addRole(checker.getSymbolAtLocation(bindings.name), 'module_namespace');
+      } else if (bindings !== undefined) {
+        for (const element of bindings.elements) {
+          if (!element.isTypeOnly && (element.propertyName ?? element.name).text === 'createRequire') {
+            addRole(checker.getSymbolAtLocation(element.name), 'create_require_factory');
+          }
+        }
+      }
+    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
+      ts.isExternalModuleReference(node.moduleReference) &&
+      ['node:module', 'module'].includes(runtimeConstantString(node.moduleReference.expression) ?? '')) {
+      addRole(checker.getSymbolAtLocation(node.name), 'module_namespace');
+    }
+    ts.forEachChild(node, seedImports);
+  };
+  seedImports(sourceFile);
   let changed = true;
   while (changed) {
     changed = false;
     const visitAliases = (node: ts.Node): void => {
       if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
-        const initializer = unwrapRuntimeExpression(node.initializer);
-        const role = ts.isIdentifier(initializer) ? roles.get(initializer.text) ?? null : directRuntimeRole(initializer);
-        if (role !== null && roles.get(node.name.text) !== role) {
-          roles.set(node.name.text, role);
-          changed = true;
-        }
+        const symbol = checker.getSymbolAtLocation(node.name);
+        for (const role of expressionRoles(node.initializer)) changed = addRole(symbol, role) || changed;
       }
       ts.forEachChild(node, visitAliases);
     };
@@ -323,21 +457,23 @@
     } else if (ts.isCallExpression(node)) {
       if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add('dynamic_import', node.arguments[0]);
       else {
-        const direct = directRuntimeRole(node.expression);
-        const role = direct ?? (ts.isIdentifier(node.expression) ? roles.get(node.expression.text) ?? null : null);
-        if (role === 'require') add('require', node.arguments[0]);
-        else if (role === 'require_resolve') add('require_resolve', node.arguments[0]);
-        else if (role === 'import_meta_resolve') add('import_meta_resolve', node.arguments[0]);
-        else if (role === 'import_meta_glob') {
-          add(direct === null ? 'aliased_import_meta_glob' : 'import_meta_glob', node.arguments[0]);
-        } else if (role === 'import_scripts') {
+        const callRoles = expressionRoles(node.expression);
+        if (callRoles.has('require')) add('require', node.arguments[0]);
+        else if (callRoles.has('require_resolve')) add('require_resolve', node.arguments[0]);
+        else if (callRoles.has('import_meta_resolve')) add('import_meta_resolve', node.arguments[0]);
+        else if (callRoles.has('import_meta_glob')) {
+          const callee = unwrapRuntimeExpression(node.expression);
+          const direct = ts.isPropertyAccessExpression(callee) && ts.isMetaProperty(callee.expression);
+          add(direct ? 'import_meta_glob' : 'aliased_import_meta_glob', node.arguments[0]);
+        } else if (callRoles.has('import_scripts')) {
           for (const argument of node.arguments) add('import_scripts', argument);
         }
       }
     } else if (ts.isNewExpression(node)) {
-      const direct = directRuntimeRole(node.expression);
-      const role = direct ?? (ts.isIdentifier(node.expression) ? roles.get(node.expression.text) ?? null : null);
-      if (role === 'worker' || role === 'shared_worker') {
+      const constructorRoles = expressionRoles(node.expression);
+      const role = constructorRoles.has('worker') ? 'worker' :
+        constructorRoles.has('shared_worker') ? 'shared_worker' : null;
+      if (role !== null) {
         const first = node.arguments?.[0];
         if (first !== undefined && ts.isNewExpression(first) && ts.isIdentifier(first.expression) &&
           first.expression.text === 'URL') add(role, first.arguments?.[0]);
@@ -350,7 +486,7 @@
   return edges;
 }
 
-function candidateValueEdges(root: string): Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>> {
+export function candidateValueEdges(root: string): Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>> {
   const result: Record<string, readonly HeldoutRuntimeValueEdge[]> = {};
   const walk = (directory: string, prefix = ''): void => {
     for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
@@ -370,6 +506,46 @@
   return result;
 }
 
+async function candidateValueEdgesWithin(
+  root: string,
+  timeoutMs: number,
+): Promise<Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>>> {
+  const moduleUrl = pathToFileURL(fileURLToPath(import.meta.url)).href;
+  const source = [
+    "import { parentPort, workerData } from 'node:worker_threads';",
+    'try {',
+    '  const implementation = await import(workerData.moduleUrl);',
+    '  parentPort.postMessage({ ok: true, value: implementation.candidateValueEdges(workerData.root) });',
+    '} catch (error) {',
+    "  parentPort.postMessage({ ok: false, errorClass: error instanceof Error ? error.name : 'UnknownError' });",
+    '}',
+  ].join('\n');
+  const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(source)}`), {
+    execArgv: ['--experimental-strip-types'],
+    workerData: { moduleUrl, root },
+  });
+  return await new Promise((resolveEdges, rejectEdges) => {
+    const timer = setTimeout(() => {
+      void worker.terminate();
+      rejectEdges(new TypeError(`configuration_load_failed: aggregate timeout during runtime edge discovery after ${String(timeoutMs)}ms.`));
+    }, timeoutMs);
+    worker.once('error', (error) => {
+      clearTimeout(timer);
+      rejectEdges(error);
+    });
+    worker.once('message', (message: unknown) => {
+      clearTimeout(timer);
+      void worker.terminate();
+      const record = recordValue(message);
+      if (record === null || record.ok !== true || recordValue(record.value) === null) {
+        rejectEdges(new TypeError(`configuration_load_failed: runtime edge discovery failed (${String(record?.errorClass ?? 'MalformedResponse')}).`));
+        return;
+      }
+      resolveEdges(record.value as Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>>);
+    });
+  });
+}
+
 function sharedBwrapArguments(
   runtimeRoot: string,
   workRoot: string,
@@ -618,13 +794,16 @@
 
 function parseResolution(value: unknown): HeldoutRuntimeResolution {
   const row = recordValue(value);
-  const keys = ['conditions', 'configuration', 'environment', 'importer', 'phase', 'project', 'resolvedId',
-    'seed', 'source', 'specifier', 'status'];
+  const keys = ['conditions', 'configuration', 'environment', 'importer', 'loaderKind', 'phase', 'project',
+    'resolvedId', 'seed', 'source', 'specifier', 'status'];
   if (row === null || !exactKeys(row, keys) || typeof row.configuration !== 'string' ||
     !nullableString(row.project) || typeof row.environment !== 'string' ||
     !oneOf(row.phase, ['resolve', 'transform']) || !Array.isArray(row.conditions) ||
     !row.conditions.every((item) => typeof item === 'string') || typeof row.seed !== 'string' ||
     typeof row.specifier !== 'string' || !nullableString(row.importer) || !nullableString(row.resolvedId) ||
+    !(row.loaderKind === null || oneOf(row.loaderKind, ['static_import', 're_export', 'import_equals',
+      'dynamic_import', 'require', 'require_resolve', 'import_meta_resolve', 'import_meta_glob',
+      'aliased_import_meta_glob', 'worker', 'shared_worker', 'import_scripts'])) ||
     !oneOf(row.source, ['graph', 'transformed', 'alias_key', 'protected_control']) ||
     !oneOf(row.status, ['clean', 'resolved', 'protected', 'unresolved', 'control', 'external_builtin',
       'external_dependency'])) throw new TypeError('Malformed resolution row.');
@@ -638,6 +817,7 @@
     specifier: row.specifier,
     importer: row.importer,
     resolvedId: row.resolvedId,
+    loaderKind: row.loaderKind,
     source: row.source,
     status: row.status,
   };
@@ -673,16 +853,20 @@
   const configurationLoad = Reflect.get(value, 'configurationLoad');
   const resolutionRows = Reflect.get(value, 'resolution');
   const seedAssignments = Reflect.get(value, 'seedAssignments');
+  const loadedConfigurationFiles = Reflect.get(value, 'loadedConfigurationFiles');
   const findings = Reflect.get(value, 'findings');
   const record = recordValue(value);
   if (record === null || !exactKeys(record,
-    ['astInspectedFiles', 'completed', 'configurationLoad', 'eligibleFiles', 'findings', 'protocol', 'resolution',
-      'seedAssignments', 'slice']) ||
+    ['astInspectedFiles', 'completed', 'configurationLoad', 'eligibleFiles', 'findings',
+      'loadedConfigurationFiles', 'protocol', 'resolution', 'seedAssignments', 'slice']) ||
     slice !== expectedSlice || record.completed !== true ||
     typeof record.eligibleFiles !== 'number' || !Number.isSafeInteger(record.eligibleFiles) ||
     typeof record.astInspectedFiles !== 'number' || !Number.isSafeInteger(record.astInspectedFiles) ||
     record.eligibleFiles < 0 || record.astInspectedFiles !== record.eligibleFiles ||
     !Array.isArray(configurationLoad) || !Array.isArray(resolutionRows) ||
+    !Array.isArray(loadedConfigurationFiles) ||
+    !loadedConfigurationFiles.every((path) => typeof path === 'string' && !path.startsWith('/') &&
+      !path.split('/').includes('..')) ||
     !Array.isArray(seedAssignments) || !Array.isArray(findings)) {
     throw new TypeError('Runtime guard emitted malformed report fields.');
   }
@@ -699,6 +883,7 @@
     configurationLoad: parsedLoads,
     resolution: resolutionRows.map(parseResolution),
     seedAssignments: seedAssignments.map(parseSeedAssignment),
+    loadedConfigurationFiles: [...loadedConfigurationFiles],
     findings: findings.map(parseFinding),
   };
 }
@@ -748,6 +933,7 @@
       }],
       resolution: [],
       seedAssignments: [],
+      loadedConfigurationFiles: [],
       findings: [{ path: '<preflight>', kind: 'configuration_load_failed', detail }],
     };
   }
@@ -770,13 +956,27 @@
     rmSync(scratchRoot, { recursive: true, force: true });
     throw new TypeError('configuration_load_failed: candidate node_modules mount point is missing.');
   }
+  const aggregateTimeout = request.aggregateTimeoutMs ?? HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS;
+  const aggregateStartedAt = Date.now();
+  let valueEdges: Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>>;
+  try {
+    valueEdges = await candidateValueEdgesWithin(root, aggregateTimeout);
+  } catch (error: unknown) {
+    rmSync(scratchRoot, { recursive: true, force: true });
+    throw error;
+  }
+  const remainingTimeout = aggregateTimeout - (Date.now() - aggregateStartedAt);
+  if (remainingTimeout < 1) {
+    rmSync(scratchRoot, { recursive: true, force: true });
+    throw new TypeError(`configuration_load_failed: aggregate timeout after ${String(aggregateTimeout)}ms during runtime edge discovery.`);
+  }
   const workerRequest: WorkerRequest = {
     protocol: HELDOUT_RUNTIME_PROTOCOL,
     slice: request.slice,
     bindings: request.bindings,
     phaseTimeoutMs: request.phaseTimeoutMs ?? HELDOUT_RUNTIME_PHASE_TIMEOUT_MS,
     trustedLockDigest: sha256(trustedLock),
-    valueEdges: candidateValueEdges(root),
+    valueEdges,
   };
   const args = [
     `--nproc=${String(preflight.nprocLimit)}`, '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
@@ -803,7 +1003,6 @@
     const diagnosticsPromise = collectPipe(runningChild.stdout, 4 * 1024 * 1024);
     const errorsPromise = collectPipe(runningChild.stderr, 4 * 1024 * 1024);
     runningChild.stdin.end(JSON.stringify(workerRequest));
-    const aggregateTimeout = request.aggregateTimeoutMs ?? HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS;
     const exitPromise = new Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>((resolveExit, rejectExit) => {
       let timedOut = false;
       const timer = setTimeout(() => {
@@ -813,7 +1012,7 @@
         } catch {
           runningChild.kill('SIGKILL');
         }
-      }, aggregateTimeout);
+      }, remainingTimeout);
       runningChild.once('error', (error) => {
         clearTimeout(timer);
         rejectExit(error);
