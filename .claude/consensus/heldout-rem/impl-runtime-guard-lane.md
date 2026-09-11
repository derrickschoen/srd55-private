Implemented the runtime held-out guard and verified the final state.

Key changes:

- Added isolated host launcher and typed report contract in [heldout-runtime-guard.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts).
- Added real Vite/Vitest resolver and transform worker in [heldout-runtime-guard-worker.mjs](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs).
- Added 147 runtime tests in [heldout-runtime-guard.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts).
- Retained static direct-reference and Rules N1/N2 checks while retiring Rule C configuration interpretation in [heldout-leak-check.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts).
- Extended `HeldoutLeakReport` with preflight, configuration-load, resolution, and seed-assignment evidence.
- Added `npm run heldout:guard`.
- Updated the plan’s isolation profile; current plan SHA-256 is `87681a69563a89f3100e92ea622388f987058b617d1e44269554db25126f475a`.

Isolation preflight passed with Node `v24.13.0`, bubblewrap `0.6.1`, read-only runtime/work/guard/system mounts, scratch-only writes, isolated HOME, network namespace isolation, and parent-death cleanup.

Recorded attempts:

1. `/usr/bin/node` profile: `runtime_node_mismatch`.
2. `RLIMIT_AS=1073741824` profile: `v8_code_range_reservation_failed`.
3. Final profile: passed:
   `prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300`, Node `--max-old-space-size=1024 --max-semi-space-size=64`, runtime mounted from `/home/vagrant/.nvm/versions/node/v24.13.0` to `/opt/node`.

Runtime coverage includes:

- 54 migrated F47–F69/package/alias/plugin cases, each with a protected-resolution assertion and ordinary-target mutant.
- 11 dedicated clean controls.
- Plugin `config`, `resolveId`, `configResolved`, activated dependency plugin, and project-extends plugin chains.
- Real Vite and Vitest configurations: zero findings.
- Real-tree injected alias: exactly 6 protected findings.
- Real-tree injected `resolveId`: exactly 4 protected findings.
- Two identical runs produce byte-identical canonical reports.
- Project seed ownership and server-only `tools/**` assignment.
- Configuration failures, extends failures, timeouts, cleanup, and lock drift fail closed.
- Leading bare `**` globs fail closed before Vite’s unbounded filesystem scan; bounded globs use the real Vite transform.

Retired static declarations

The following 58 Rule C/configuration-resolution declarations were removed and replaced by real resolver fixtures, ordinary-target mutants, fail-closed controls, or real-tree controls:

1. `applies Rule C to %s`
2. `applies Rule N to an extended configuration loaded from the candidate source pool`
3. `applies a regex alias only to matching specifiers`
4. `applies negative Vite glob patterns before recording edges`
5. `classifies %s by comparison semantics`
6. `classifies %s by positional root capability`
7. `classifies %s with the Rule C addressed-subtree guard`
8. `classifies a permitted const alias with %s`
9. `dereferences %s before alias-capability classification`
10. `discovers a literal alias in a test.projects element`
11. `discovers a literal alias inside a Vitest test container`
12. `discovers a shorthand resolve binding without treating its declaration as an escape`
13. `discovers aliases from a literal project extends file`
14. `discovers aliases through %s`
15. `discovers an unescaped alias-array binding at its semantic placement`
16. `discovers and fails closed for Vite alias configuration using %s`
17. `evaluates literal object spreads in Vite glob options`
18. `fails Rule C for %s`
19. `fails Vite alias discovery for a configuration reference in %s`
20. `fails closed for %s`
21. `fails closed for %s using its semantic placement prefix`
22. `fails closed for a nonliteral Vitest test container`
23. `fails closed instead of silently missing an unsupported %s`
24. `fails closed on Vite alias %s`
25. `fails closed on an ambiguous exact package target without falling back to a wildcard`
26. `fails closed on an unchanged configured-alias consumer after resolution config changes`
27. `fails closed when %s escapes`
28. `fails closed when a leading package #import cannot be resolved`
29. `fails closed when ambiguity occurs inside a nested package condition`
30. `fails exact-node Rule C for %s`
31. `fails the Vite config itself when its alias source is non-literal`
32. `fails the Vite config on a non-literal spread inside an alias entry`
33. `honours a literal Vite glob base relative to the importer`
34. `honours literal spread overrides inside a Vite alias entry`
35. `interprets a symbol-proven defineConfig callback, conditional, and const spread`
36–37. Two `invalidates Vite alias discovery after %s` declarations
38. `keeps a leading ** Vite glob candidate-rooted even when base is present`
39. `keeps an escaped plugin-list entry non-alias-capable`
40. `keeps an indirectly accessed entry clean when it is placed only under plugins`
41. `keeps the runtime-safe spread ordering clean for %s`
42. `orders overlapping package patterns by longest prefix and then suffix`
43. `re-inspects an unchanged #imports consumer after a package-only configuration change`
44. `records a Vite glob query option on the matched held-out edge`
45. `rejects a held-out module matched by %s`
46. `reports zero findings for the actual Vite and Vitest configs plus the actual src tree`
47. `resolves Vite alias identifiers by symbol when another scope shadows the spelling`
48. `resolves a leading package #import through the nearest candidate package map`
49. `selects an exact package import before an earlier wildcard`
50. `skips declaration-only files during configuration-wide inspection`
51. `still reports an injected leak in configuration-reinspection mode`
52. `tracks an exact import.meta.glob alias into a recognized glob call`
53. `treats %s as an alias-capable binding position`
54. `treats a leading ** Vite glob as candidate-rooted`
55. `treats each test.projects element as a nested configuration root: %s`
56. `treats project extends true as reuse of the clean root configuration`
57. `unions embedded placements for %s`
58. `uses JavaScript spread semantics for %s`

Two N1/N2 declarations that were physically relocated remain static, covering five cases.

Verification:

- `npm run typecheck:fast` — passed.
- `sg scan` — passed.
- `git diff --check` — passed, including separate checks for all three untracked new files.
- `node --check tools/heldout-runtime-guard-worker.mjs` — passed.
- `npx vitest run --configLoader runner tests/unit/tools/heldout-runtime-guard.test.ts` — 147/147 passed.
- `npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts` — 239/239 passed.
- Exact ten-spec cumulative command from the plan — 10/10 files, 622/622 tests passed in 121.92 seconds.
- An earlier development cumulative run had one D576 load timeout, 597/598; the corrected serial rerun passed 111/111. The final cumulative run required no retry.
- 66 protected fixture hashes are byte-identical; manifest digest:
  `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`
- Frozen contract digest:
  `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- No prohibited suppressions, skipped tests, `any`, retired Rule C helpers, fixture changes, or port 4173 use.

The supported conclusion is deliberately bounded: no ordinary Vite serve or Vitest root/project path reaches the reserve. Build-only conditions, worker pipelines, optimizer/esbuild rewrites, and prebundle provenance remain in the deferred coverage ledger.

HELDOUT-RUNTIME-GUARD IMPL DONE
diff --git a/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md b/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
index 716aee71531b86e6f720b7270d06d6afce96f75c..9802027b3b0547024ac86a91fb9590c356995688
--- a/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
+++ b/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
@@ -268,16 +268,18 @@
 3. extract `git archive <candidate>` (or a synthetic fixture map) into a checkout with no `.git`;
 4. verify candidate lock data matches mounted installed Vite/Vitest versions/integrities;
 5. launch a new process group under `/usr/bin/bwrap`, unsharing user/PID/IPC/UTS/cgroup/network namespaces, dropping capabilities, applying rlimits, and using parent-death cleanup; no custom seccomp policy is part of this slice;
-6. mount candidate at `/work` read-only, guard code at `/guard` read-only, dependencies at `/work/node_modules` read-only, and only `/scratch` writable; bind `/scratch/tmp` as `/tmp`, `/scratch/home` as HOME, and set the child working directory to `/work`;
+6. resolve the runtime root from the real path of `process.execPath` (`dirname(dirname(execPath))`), require `<runtime-root>/bin/node --version` to equal `process.version`, mount it read-only at `/opt/node`, and invoke `/opt/node/bin/node`; mount candidate at `/work` read-only, guard code at `/guard` read-only, dependencies at `/work/node_modules` read-only, `/usr`, `/lib`, and `/lib64` read-only for the C runtime, PID-namespace-local `/proc`, minimal `/dev`, and only `/scratch` writable; bind `/scratch/tmp` as `/tmp`, `/scratch/home` as HOME, set `PATH=/opt/node/bin:/usr/bin:/bin`, and set the child working directory to `/work`;
 7. omit host project, Git metadata, credentials, home, agent/Docker sockets, and sibling worktrees;
 8. use `env -i` with only PATH, NODE_ENV, CI, locale, HOME/TMP/cache variables, and request/result descriptors; remove proxies/tokens/cloud/model credentials;
-9. omit `/proc` unless a compatibility probe proves it required; if needed, mount PID-namespace-local procfs and document the expansion;
-10. enforce 30 seconds per configuration or project phase and 120 seconds aggregate, plus CPU/address-space/file-size/open-file/process limits; kill/reap the process group on expiry without changing repository test timeouts;
+9. mount only PID-namespace-local `/proc`; no host procfs is exposed;
+10. enforce 30 seconds per configuration or project phase and 120 seconds aggregate; launch through `prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300` and invoke Node with `--max-old-space-size=1024 --max-semi-space-size=64`; do not impose `RLIMIT_AS`, because Node 24/V8 reserves virtual address ranges larger than its live heap; kill/reap the new process group on expiry without changing repository test timeouts;
 11. accept exactly one bounded JSON response on a dedicated pipe; extra/malformed/oversized output, signal, abnormal exit, missing close, or timeout fails closed;
 12. delete only the validated exact `mkdtemp` child in parent `finally`.
 
 No guard server listens. API/HMR are forced off, middleware mode is used, and the network namespace prevents candidate config/plugins from reaching host or sandbox TCP/UDP ports, including 4173. Outside writes fail. Config throw/hang/install/network/exit/close failure becomes `configuration_load_failed` (with `failed` or `timed_out` configuration status), and no affected edge/environment can be reported clean; a failed platform/mount/network preflight becomes `isolation_failed`. Neither condition is skipped. `env -i` plus `unshare -Urn` is not a fallback because it does not hide host files. Linux plus bubblewrap is required for an authoritative pass.
 
+The final passing profile on the implementation machine is `/usr/bin/prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <user/PID/IPC/UTS/cgroup/network namespaces and read-only mounts above> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 <worker>`. It mounts runtime root `/home/vagrant/.nvm/versions/node/v24.13.0` at `/opt/node` and verifies `v24.13.0`. The preflight report retains the two preceding failed attempts (`/usr/bin/node` runtime mismatch; `RLIMIT_AS=1 GiB` V8 code-range reservation failure) as well as the passing attempt. Parameter or mount-path failures are adjusted within this boundary; the guard blocks only when an isolation semantic cannot be achieved.
+
 Fixture names and contents remain generic (`@policy`, ordinary/protected modules, anonymous plugins). Apart from the required toolchain package names used to exercise their APIs, do not introduce third-party game, studio, artist, or product names; add a source-text licensing scan to the focused fixture test.
 
 The trust statement is deliberately narrow: **bounded resolver evidence under configuration-execution isolation, not adversarial attestation**. Candidate code shares the worker process with resolver logic and could interfere with same-process APIs or the response channel; mount/user/network isolation limits side effects but does not authenticate the child's conclusions. Hostile-config attestation requires a later independent observer or dedicated CI VM boundary.
diff --git a//tmp/heldout-glob-probe/consumer.ts b//tmp/heldout-glob-probe/consumer.ts
new file mode 100644
index 0000000000000000000000000000000000000000..933c6b4a0678dadbe2f0b291c08b2d65d8e7bc48
--- /dev/null
+++ b//tmp/heldout-glob-probe/consumer.ts
@@ -0,0 +1 @@
+export const modules = import.meta.glob('**/heldout-evaluation.ts');
diff --git a//tmp/heldout-glob-probe/vtt/heldout-evaluation.ts b//tmp/heldout-glob-probe/vtt/heldout-evaluation.ts
new file mode 100644
index 0000000000000000000000000000000000000000..aef22247d75263ebcd619ae575d94355aedb3b48
--- /dev/null
+++ b//tmp/heldout-glob-probe/vtt/heldout-evaluation.ts
@@ -0,0 +1 @@
+export default 1;
diff --git a/package.json b/package.json
index 2ebd7d34ef5fec64c9d44ddb2cfd4e2104981816..e1223e76fb6ae22960ef3f09b9982037d5b11a72
--- a/package.json
+++ b/package.json
@@ -17,6 +17,7 @@
     "test:gate": "node tools/gate-vitest.mjs",
     "test:gate:browser": "node tools/gate-playwright.mjs",
     "test:affected": "node scripts/test-affected.mjs",
+    "heldout:guard": "vite-node tools/heldout-leak-check.ts --",
     "census:modules": "node scripts/module-state-census.mjs",
     "test:shuffled": "vitest run --configLoader runner --sequence.shuffle --sequence.seed=20260825",
     "test:unit": "vitest run --configLoader runner tests/unit",
diff --git a/tests/unit/tools/heldout-leak-check.test.ts b/tests/unit/tools/heldout-leak-check.test.ts
index 600d1bb575f5b03834ae033f3fdec974e0819026..35e8347e9533829936086ae826210e71ebc15a70
--- a/tests/unit/tools/heldout-leak-check.test.ts
+++ b/tests/unit/tools/heldout-leak-check.test.ts
@@ -1,6 +1,4 @@
-import { posix } from 'node:path';
 import { describe, expect, it } from 'vitest';
-import { readdirSync, readFileSync } from '../../helpers/test-filesystem';
 import {
   HELDOUT_LEAK_AST_OUT_OF_SCOPE,
   HELDOUT_LEAK_FLOW_AUDIT,
@@ -34,58 +32,12 @@
     factory(suffix),
   ] as const));
 
-function repositorySourcesUnder(directory: string): Readonly<Record<string, string>> {
-  const sources: Record<string, string> = {};
-  const visit = (current: string): void => {
-    for (const entry of readdirSync(current, { withFileTypes: true })) {
-      const path = posix.join(current, entry.name);
-      if (entry.isDirectory()) visit(path);
-      else if (/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u.test(path) &&
-        !/\.d\.(?:ts|mts|cts)$/u.test(path)) sources[path] = readFileSync(path, 'utf8');
-    }
-  };
-  visit(directory);
-  return sources;
-}
-
 const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
 const bindings = {
   reserveDigests: [reserveDigest],
   resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
 } as const;
 
-const actualSourceFiles = repositorySourcesUnder('src');
-const emptyImportsPackageSource = '{"imports":{}}';
-const actualViteConfigSource = readFileSync('vite.config.ts', 'utf8');
-const actualVitestConfigSource = readFileSync('vitest.config.ts', 'utf8');
-const actualTreeConfigChange = [{
-  path: 'package.json',
-  addedText: emptyImportsPackageSource,
-  sourceText: emptyImportsPackageSource,
-}, {
-  path: 'vite.config.ts',
-  addedText: actualViteConfigSource,
-  sourceText: actualViteConfigSource,
-}, {
-  path: 'vitest.config.ts',
-  addedText: actualVitestConfigSource,
-  sourceText: actualVitestConfigSource,
-}] as const;
-const actualTreeReport = inspectHeldoutLeakChanges(actualTreeConfigChange, 'F', bindings, {
-  packageJsonFiles: { 'package.json': emptyImportsPackageSource },
-  candidateFiles: Object.keys(actualSourceFiles),
-  candidateSourceFiles: actualSourceFiles,
-});
-const injectedActualSourceFiles = {
-  ...actualSourceFiles,
-  'src/ui/injected-heldout-leak.ts': "export * from '../vtt/heldout-evaluation';",
-};
-const injectedActualTreeReport = inspectHeldoutLeakChanges(actualTreeConfigChange, 'F', bindings, {
-  packageJsonFiles: { 'package.json': emptyImportsPackageSource },
-  candidateFiles: Object.keys(injectedActualSourceFiles),
-  candidateSourceFiles: injectedActualSourceFiles,
-});
-
 describe('held-out reserve leak wall', () => {
 
   it.each([
@@ -297,8 +249,7 @@
         'a trailing index, index.js, or index.ts resolves to its containing module path',
         'a trailing .js or .ts extension resolves to the extensionless module identity',
         'file URLs use fileURLToPath semantics, including percent-decoding, before identity comparison',
-        'package #imports use exact-first Node pattern ordering in the nearest candidate package.json',
-        'literal filesystem Vite globs support base, leading **, *, **, ?, arrays, exclusions, and query options',
+        'package #imports and Vite glob matching are delegated to the installed runtime resolver and transform',
       ],
       meaningChangingQueries: [
         'raw', 'url', 'inline', 'worker', 'sharedworker', 'init', 'import', 'no-inline',
@@ -307,7 +258,7 @@
         'a normalized held-out import is a protocol_import',
         'a normalized held-out resolver call is a protocol_resolution',
         'a recognized non-constant module edge is an unresolved_module_edge',
-        'an undecodable or unknown-scheme edge and an unresolved package #import fail closed',
+        'an undecodable or unknown-scheme direct edge fails closed',
         'a known loader reference escaping recognized call syntax is loader_reference_escaped',
       ],
       interpreted: [
@@ -315,33 +266,20 @@
         'Rule N1 permits import.meta and module/worker namespaces only as direct member receivers or exact plain-const aliases',
         'Rule N2 permits browser globals to transfer inertly and validates Worker, SharedWorker, and importScripts members at use by symbol-proven global provenance',
         'a loader-valued expression is allowed only as a direct callee with a constant specifier, a receiver leading to a recognized member call, or the whole initializer of a non-exported plain-identifier const alias',
-        'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
-        'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
-        'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
-        'Rule C records every configuration placement prefix and unions outer paths with every embedded binding dereferenced, composing each placement with remaining descendant and const-alias paths; any semantic placement makes the reference alias-capable',
-        'Rule C visits ordinary shorthand and literal-array composition; installed Vitest 4 test.projects array elements are nested configuration roots, while removed test.workspace is not interpreted',
-        'Rule C resolves tracked literal object and array spreads with JavaScript last-write and runtime-index semantics, including terminal embedded identifiers',
-        'Rule C recursively inspects literal test.projects extends files from the candidate tree; true reuses the root configuration and missing, external, cyclic, or nonliteral targets fail closed',
-        'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
-        'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
-        'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
-        'reachable object spreads require tracked const literals; computed keys, accessors, methods, and nonliteral resolve, test, or alias values fail closed, while unrelated nonliteral values are opaque',
-        'root vite*.config.* and vitest*.config.* entry points are inspected, including symbol-proven defineConfig and mergeConfig imports from Vite or Vitest',
-        'resolution configuration changes re-inspect consumers; unresolved configuration makes every encountered consumer edge unresolved',
+        'runtime Vite serve and Vitest root/project resolver and transform evidence governs configuration semantics, aliases, plugin hooks, projects, and extends',
+        'runtime graph traversal follows value edges; erased type-only edges remain static findings',
         'every eligible candidate file receives the full AST and symbol inspection pass without a textual pre-gate',
       ],
       failsClosed: [
         'every other position of a loader-valued expression is loader_reference_escaped from one generic check',
         'every disallowed Rule N1 namespace position and every non-symbol-proven Rule N2 loader-member use is loader_reference_escaped from the same generic check',
-        'a nonliteral Vite or Vitest alias, unreachable alias/resolve/test property, or invalid reachable-const reference is unresolved configuration under Rule C',
-        'tracked configuration references with nonconstant addresses or mutation targets fail closed; alias-bearing subtrees also fail closed when returned, stored outside the visited graph, passed, exported, templated, awaited, yielded, or otherwise escaped',
-        'unresolved targets, options, package conditions, globs, aliases, URL schemes, and data modules are findings',
+        'runtime configuration load, resolver, transform, project, or ordinary-edge failures are findings in the isolated runtime guard',
+        'unresolved direct targets, URL schemes, and data modules are static findings',
       ],
       outOfScope: [
         'eval executable strings',
         'new Function executable strings',
         'custom loader implementations',
-        'Vite plugin config hooks',
         'runtime-generated code',
       ],
     });
@@ -375,8 +313,7 @@
     ]);
     for (const entry of HELDOUT_LEAK_FLOW_AUDIT) {
       expect(entry.loaderValues).toContain('Rule N');
-      expect(entry.configurationReferences).toContain('Rule C');
-      expect(`${entry.loaderValues} ${entry.configurationReferences}`).not.toContain('unhandled');
+      expect(entry.loaderValues).not.toContain('unhandled');
     }
   });
 
@@ -425,118 +362,33 @@
       path: 'src/ui/repair-ranking.ts',
       addedText: "void import('file:///repo/src/vtt/%68eldout-evaluation.ts');",
     }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
-
-  it.each([
-    ['exact lazy glob', "const modules = import.meta.glob('../vtt/heldout-evaluation.ts');"],
-    ['wildcard eager glob',
-      "const modules = import.meta.glob('../vtt/heldout-*.ts', { eager: true });"],
-    ['array glob with query', [
-      "const modules = import.meta.glob(['../vtt/public.ts', '../vtt/heldout-*.ts'], {",
-      "  query: '?raw',",
-      '});',
-    ].join('\n')],
-    ['glob with object query options', [
-      "const modules = import.meta.glob('../vtt/heldout-*.ts', {",
-      "  query: { raw: 'true', worker: false },",
-      '  eager: false,',
-      '});',
-    ].join('\n')],
-  ] as const)('rejects a held-out module matched by %s', (_label, addedText) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText,
-    }], 'F', bindings, {
-      candidateFiles: ['src/vtt/public.ts', 'src/vtt/heldout-evaluation.ts'],
-    });
 
     expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
   });
 
-  it('applies negative Vite glob patterns before recording edges', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: [
-        "const modules = import.meta.glob(['../vtt/*.ts', '!../vtt/heldout-*.ts']);",
-      ].join('\n'),
-    }], 'F', bindings, {
-      candidateFiles: ['src/vtt/public.ts', 'src/vtt/heldout-evaluation.ts'],
-    });
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it('records a Vite glob query option on the matched held-out edge', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: [
-        "const modules = import.meta.glob('../vtt/heldout-*.ts', { query: '?raw' });",
-      ].join('\n'),
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'protocol_import',
-      detail: expect.stringContaining('?raw'),
-    }));
-  });
-
   it('fails closed on a non-constant Vite glob pattern', () => {
     const report = inspectHeldoutLeakChanges([{
       path: 'src/ui/repair-ranking.ts',
       addedText: "const modules = import.meta.glob(patterns, { eager: false });",
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
+    }], 'F', bindings);
 
     expect(report.findings).toContainEqual(expect.objectContaining({
       kind: 'unresolved_module_edge',
     }));
-  });
-
-  it('honours a literal Vite glob base relative to the importer', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: [
-        "import.meta.glob('./heldout-evaluation.ts', { base: '../vtt', eager: true });",
-      ].join('\n'),
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
   });
 
-  it('keeps a leading ** Vite glob candidate-rooted even when base is present', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "import.meta.glob('**/heldout-evaluation.ts', { base: './', eager: true });",
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
-
-  it('evaluates literal object spreads in Vite glob options', () => {
+  it('tracks an exact import.meta.glob alias without statically interpreting Vite matching', () => {
     const report = inspectHeldoutLeakChanges([{
       path: 'src/ui/repair-ranking.ts',
       addedText: [
-        "import.meta.glob('./heldout-evaluation.ts', {",
-        "  ...{ base: '../vtt' }, eager: true,",
-        '});',
+        'const loadModules = import.meta.glob;',
+        "loadModules('../vtt/heldout-evaluation.ts');",
       ].join('\n'),
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
+    }], 'F', bindings);
 
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
+    expect(report.findings).toEqual([]);
   });
-
-  it('tracks an exact import.meta.glob alias into a recognized glob call', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: [
-        'const discover = import.meta.glob;',
-        "discover('../vtt/heldout-*.ts', { eager: true });",
-      ].join('\n'),
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
 
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
 
   it.each([
     ['identifier spread', "const options = { base: '../vtt' }; import.meta.glob('./x.ts', { ...options });"],
@@ -546,31 +398,7 @@
     const report = inspectHeldoutLeakChanges([{
       path: 'src/ui/repair-ranking.ts',
       addedText,
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('treats a leading ** Vite glob as candidate-rooted', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "import.meta.glob('**/heldout-evaluation.ts');",
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
-
-  it.each([
-    ['extglob', "import.meta.glob('../vtt/@(heldout-evaluation).ts');"],
-    ['package-import glob', "import.meta.glob('#policy/*.ts');"],
-    ['alias glob', "import.meta.glob('@policy/*.ts');"],
-  ] as const)('fails closed instead of silently missing an unsupported %s', (_label, addedText) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText,
-    }], 'F', bindings, { candidateFiles: ['src/vtt/heldout-evaluation.ts'] });
+    }], 'F', bindings);
 
     expect(report.findings).toContainEqual(expect.objectContaining({
       kind: 'unresolved_module_edge',
@@ -1172,6 +1000,49 @@
   });
 
   it.each([
+    ['boxed import.meta namespace', [
+      'const box = { meta: import.meta };',
+      "box.meta.resolve('../src/vtt/heldout-evaluation.ts');",
+    ].join('\n')],
+    ['smuggled browser-global loader member', [
+      'const box = { w: window };',
+      "new box.w.Worker('../src/vtt/heldout-evaluation.ts');",
+    ].join('\n')],
+  ] as const)('applies Rule N to %s', (_label, addedText) => {
+    const report = inspectHeldoutLeakChanges([{
+      path: 'tools/probe.mts',
+      addedText,
+    }], 'F', bindings);
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      kind: 'loader_reference_escaped',
+    }));
+  });
+
+  it.each([
+    ['constructor injection', [
+      'class UsesWindow { constructor(readonly root = window) {} }',
+      'const use = new UsesWindow(window);',
+      'use.root.addEventListener;',
+    ].join('\n')],
+    ['parameter default', [
+      'function locationOf(root = window) { return root.location.href; }',
+      'locationOf();',
+    ].join('\n')],
+    ['conditional storage', [
+      'const root = Math.random() > 0.5 ? window : self;',
+      'root.addEventListener;',
+    ].join('\n')],
+  ] as const)('keeps Rule N2 %s inert for non-loader members', (_label, addedText) => {
+    const report = inspectHeldoutLeakChanges([{
+      path: 'src/ui/global-injection-control.ts',
+      addedText,
+    }], 'F', bindings);
+
+    expect(report.findings).toEqual([]);
+  });
+
+  it.each([
     ['awaited namespace alias', [
       'const meta = await import.meta;',
       "meta.resolve('../src/vtt/heldout-evaluation.ts');",
@@ -1457,1311 +1328,11 @@
     expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
   });
 
-  it('resolves a leading package #import through the nearest candidate package map', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "void import('#heldout');",
-    }], 'F', bindings, {
-      packageJsonFiles: {
-        'package.json': JSON.stringify({
-          imports: { '#heldout': './src/vtt/heldout-evaluation.ts' },
-        }),
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
-
-  it('fails closed when a leading package #import cannot be resolved', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "void import('#not-mapped');",
-    }], 'F', bindings, { packageJsonFiles: { 'package.json': '{"imports":{}}' } });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('selects an exact package import before an earlier wildcard', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "void import('#heldout');",
-    }], 'F', bindings, {
-      packageJsonFiles: {
-        'package.json': JSON.stringify({
-          imports: {
-            '#*': './src/vtt/party-pack.ts',
-            '#heldout': './src/vtt/heldout-evaluation.ts',
-          },
-        }),
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
-
-  it('orders overlapping package patterns by longest prefix and then suffix', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "void import('#policy/heldout-evaluation');",
-    }], 'F', bindings, {
-      packageJsonFiles: {
-        'package.json': JSON.stringify({
-          imports: {
-            '#policy/*': './src/vtt/party-pack.ts',
-            '#policy/heldout-*': './src/vtt/heldout-*.ts',
-          },
-        }),
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'protocol_import' }));
-  });
-
-  it('fails closed on an ambiguous exact package target without falling back to a wildcard', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "void import('#policy');",
-    }], 'F', bindings, {
-      packageJsonFiles: {
-        'package.json': JSON.stringify({
-          imports: {
-            '#*': './src/vtt/party-pack.ts',
-            '#policy': {
-              import: './src/vtt/heldout-evaluation.ts',
-              default: './src/vtt/party-pack.ts',
-            },
-          },
-        }),
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('fails closed when ambiguity occurs inside a nested package condition', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/repair-ranking.ts',
-      addedText: "void import('#policy');",
-    }], 'F', bindings, {
-      packageJsonFiles: {
-        'package.json': JSON.stringify({
-          imports: {
-            '#policy': {
-              import: {
-                browser: './src/vtt/heldout-evaluation.ts',
-                default: './src/vtt/party-pack.ts',
-              },
-              default: './src/vtt/party-pack.ts',
-            },
-          },
-        }),
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('re-inspects an unchanged #imports consumer after a package-only configuration change', () => {
-    const packageSource = JSON.stringify({
-      imports: { '#policy': './src/vtt/heldout-evaluation.ts' },
-    });
-    const report = inspectHeldoutLeakChanges([{
-      path: 'package.json',
-      addedText: packageSource,
-      sourceText: packageSource,
-    }], 'F', bindings, {
-      packageJsonFiles: { 'package.json': packageSource },
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '#policy';",
-      },
-    });
-
-    expect(report).toMatchObject({ checkedFiles: 2 });
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'protocol_import',
-    }));
-  });
-
-  it('fails closed on an unchanged configured-alias consumer after resolution config changes', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: "export default { resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['shorthand literal object', [
-      "const alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
-      'export default { resolve: { alias } };',
-    ].join('\n'), "import policy from '@policy';", 'src/ui/unchanged-policy-consumer.ts'],
-    ['identifier array with find/replacement', [
-      "const alias = [{ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' }];",
-      'export default { resolve: { alias } };',
-    ].join('\n'), "import policy from '@policy';", 'src/ui/unchanged-policy-consumer.ts'],
-    ['spread literal alias array', [
-      "const baseAliases = [{ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' }];",
-      'export default { resolve: { alias: [...baseAliases] } };',
-    ].join('\n'), "import policy from '@policy';", 'src/ui/unchanged-policy-consumer.ts'],
-    ['non-literal alias source', [
-      'const alias = loadAliases();',
-      'export default { resolve: { alias } };',
-    ].join('\n'), "import policy from './public-policy';", 'vite.config.ts'],
-    ['regex alias applied to a relative specifier', [
-      "const alias = [{ find: /^\\.\\/public-policy$/, replacement: './src/vtt/heldout-evaluation.ts' }];",
-      'export default { resolve: { alias } };',
-    ].join('\n'), "import policy from './public-policy';", 'src/ui/unchanged-policy-consumer.ts'],
-  ] as const)('discovers and fails closed for Vite alias configuration using %s',
-  (_label, configSource, consumerSource, expectedPath) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': consumerSource,
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: expectedPath,
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('fails the Vite config itself when its alias source is non-literal', () => {
-    const configSource = [
-      'const alias = loadAliases();',
-      'export default { resolve: { alias } };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('resolves Vite alias identifiers by symbol when another scope shadows the spelling', () => {
-    const configSource = [
-      "const alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
-      'function shadow() { const alias = {}; return alias; }',
-      'export default { resolve: { alias } };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('honours literal spread overrides inside a Vite alias entry', () => {
-    const configSource = [
-      'const alias = [{',
-      "  find: '@safe', replacement: '/safe.ts',",
-      "  ...{ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' },",
-      '}];',
-      'export default { resolve: { alias } };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('fails the Vite config on a non-literal spread inside an alias entry', () => {
-    const configSource = [
-      'const overrides = loadOverrides();',
-      "const alias = [{ find: '@safe', replacement: '/safe.ts', ...overrides }];",
-      'export default { resolve: { alias } };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['whole-variable reassignment', [
-      'let alias = {};',
-      "alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['property assignment', [
-      'const alias = {};',
-      "alias['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-  ] as const)('fails closed on Vite alias %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['write through an exact reference', [
-      'const alias = {};',
-      'const edit = alias;',
-      "edit['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['array push', [
-      'const alias = [];',
-      "alias.push({ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' });",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['Object.assign', [
-      'const alias = {};',
-      "Object.assign(alias, { '@policy': './src/vtt/heldout-evaluation.ts' });",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['call-argument escape', [
-      'const alias = {};',
-      'mutateAliases(alias);',
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['mutation after object-spread transfer', [
-      'const alias = {};',
-      'const edit = { ...alias };',
-      "edit['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-  ] as const)('invalidates Vite alias discovery after %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['returned reference', [
-      'const alias = {};',
-      'function exposeAlias() { return alias; }',
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['called closure write', [
-      'const alias = {};',
-      "const writeAlias = () => { alias['@policy'] = './src/vtt/heldout-evaluation.ts'; };",
-      'writeAlias();',
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['class-field storage', [
-      'const alias = {};',
-      'class AliasBox { value = alias; }',
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['call-expression receiver write', [
-      'const alias = {};',
-      'function getAlias() { return alias; }',
-      "getAlias()['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-  ] as const)('fails Vite alias discovery for a configuration reference in %s',
-  (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['object-property transfer', [
-      'const alias = {};',
-      'const box = { value: alias };',
-      "box.value['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['array-element transfer', [
-      'const alias = [];',
-      'const box = [alias];',
-      "box[0].push({ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' });",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['nested literal transfer', [
-      'const alias = {};',
-      'const box = { nested: [{ value: alias }] };',
-      "box.nested[0].value['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['untrackable call-result transfer', [
-      'const alias = { nested: { value: loadAliases() } };',
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-  ] as const)('invalidates Vite alias discovery after %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['boxed import.meta namespace', [
-      'const box = { meta: import.meta };',
-      "box.meta.resolve('../src/vtt/heldout-evaluation.ts');",
-    ].join('\n')],
-    ['smuggled browser-global loader member', [
-      'const box = { w: window };',
-      "new box.w.Worker('../src/vtt/heldout-evaluation.ts');",
-    ].join('\n')],
-  ] as const)('applies Rule N to %s', (_label, addedText) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'tools/probe.mts',
-      addedText,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'loader_reference_escaped',
-    }));
-  });
-
-  it.each([
-    ['constructor injection', [
-      'class UsesWindow { constructor(readonly root = window) {} }',
-      'const use = new UsesWindow(window);',
-      'use.root.addEventListener;',
-    ].join('\n')],
-    ['parameter default', [
-      'function locationOf(root = window) { return root.location.href; }',
-      'locationOf();',
-    ].join('\n')],
-    ['conditional storage', [
-      'const root = Math.random() > 0.5 ? window : self;',
-      'root.addEventListener;',
-    ].join('\n')],
-  ] as const)('keeps Rule N2 %s inert for non-loader members', (_label, addedText) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'src/ui/global-injection-control.ts',
-      addedText,
-    }], 'F', bindings);
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it.each([
-    ['computed-property transfer', [
-      'const alias: Record<string, string> = {};',
-      "const box = { ['value']: alias };",
-      "box.value['@policy'] = './src/vtt/heldout-evaluation.ts';",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['for-of assignment head', [
-      'const alias: Record<string, string> = {};',
-      "for (alias['@policy'] of ['./src/vtt/heldout-evaluation.ts']) {}",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['for-in assignment head', [
-      'const alias: Record<string, string> = {};',
-      "for (alias['@policy'] in { './src/vtt/heldout-evaluation.ts': true }) {}",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['constructor argument', [
-      'const alias = {};',
-      'new Update(alias);',
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['fill-style receiver mutation', [
-      "const alias = [{ find: '@safe', replacement: './safe.ts' }];",
-      "alias.fill({ find: '@policy', replacement: './src/vtt/heldout-evaluation.ts' });",
-      'export default { resolve: { alias } };',
-    ].join('\n')],
-    ['locally shadowed defineConfig', [
-      "const alias = { '@safe': './safe.ts' };",
-      "function defineConfig(value) { value.resolve.alias['@policy'] = './src/vtt/heldout-evaluation.ts'; return value; }",
-      'export default defineConfig({ resolve: { alias } });',
-    ].join('\n')],
-  ] as const)('applies Rule C to %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['reachable getter', [
-      'export default {',
-      '  get resolve() {',
-      "    return { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } };",
-      '  },',
-      '};',
-    ].join('\n')],
-    ['opaque side-effect reference', [
-      'const shared = { resolve: { alias: {} } };',
-      'export default {',
-      '  ...shared,',
-      "  sideEffect: shared.resolve.alias['@policy'] = './src/vtt/heldout-evaluation.ts',",
-      '};',
-    ].join('\n')],
-    ['named export outside the reachable set', [
-      'const shared = { resolve: { alias: {} } };',
-      'export { shared };',
-      'export default shared;',
-    ].join('\n')],
-  ] as const)('fails exact-node Rule C for %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['assignment inside an opaque plugin array', [
-      'const shared = { resolve: { alias: {} } };',
-      'export default {',
-      '  ...shared,',
-      "  plugins: [(shared.resolve.alias['@policy'] = './src/vtt/heldout-evaluation.ts', false)],",
-      '};',
-    ].join('\n'), true],
-    ['tracked const passed to a helper inside an opaque plugin array', [
-      'const shared = { resolve: { alias: {} } };',
-      'export default { ...shared, plugins: [helper(shared)] };',
-    ].join('\n'), true],
-    ['property read inside an opaque plugin array', [
-      'const shared = { resolve: { alias: {} }, plugins: [] };',
-      'export default { ...shared, plugins: [shared.plugins.length] };',
-    ].join('\n'), false],
-    ['array spread read inside an opaque plugin array', [
-      'const shared = { resolve: { alias: {} }, plugins: [] };',
-      'export default { ...shared, plugins: [...shared.plugins] };',
-    ].join('\n'), false],
-    ['plain calls inside an opaque plugin array', [
-      'export default { plugins: [foo(), bar({ x: 1 })] };',
-    ].join('\n'), false],
-    ['plain-const alias of a non-alias-bearing subtree', [
-      'const shared = { resolve: { alias: {} }, plugins: [] };',
-      'const p = shared.plugins;',
-      'export default { ...shared, plugins: [...p] };',
-    ].join('\n'), false],
-    ['let alias of an alias-bearing subtree', [
-      'const shared = { resolve: { alias: {} }, plugins: [] };',
-      'let p = shared;',
-      'export default shared;',
-      'void p;',
-    ].join('\n'), true],
-    ['plain-const alias escaped through a call', [
-      'const shared = { resolve: { alias: {} }, plugins: [] };',
-      'const q = shared.resolve;',
-      'use(q);',
-      'export default shared;',
-    ].join('\n'), true],
-  ] as const)('classifies %s with the Rule C addressed-subtree guard',
-  (_label, configSource, unresolved) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
-      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
-  });
-
-  it.each([
-    ['resolve.alias address', 'vite.config.ts', [
-      'const shared = { resolve: { alias: {} } };',
-      'const p = shared.resolve.alias;',
-      "Object.assign(p, { '@policy': './src/vtt/heldout-evaluation.ts' });",
-      'export default shared;',
-    ].join('\n')],
-    ['test.alias address', 'vitest.config.ts', [
-      'const shared = { test: { alias: {} } };',
-      'const p = shared.test.alias;',
-      "Object.assign(p, { '@policy': './src/vtt/heldout-evaluation.ts' });",
-      'export default shared;',
-    ].join('\n')],
-    ['identifier bound at resolve', 'vite.config.ts', [
-      'const r = {};',
-      'export default { resolve: r };',
-      'use(r);',
-    ].join('\n')],
-    ['identifier bound at test', 'vitest.config.ts', [
-      'const t = {};',
-      'export default { test: t };',
-      'use(t);',
-    ].join('\n')],
-  ] as const)('fails closed when %s escapes', (_label, path, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path,
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path,
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('fails closed for a nonliteral Vitest test container', () => {
-    const configSource = [
-      'function makeTestConfig() {',
-      '  const t = Object.create(null);',
-      "  t.alias = { '@policy': './src/vtt/heldout-evaluation.ts' };",
-      '  return t;',
-      '}',
-      'export default { test: makeTestConfig() };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vitest.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('discovers a literal alias inside a Vitest test container', () => {
-    const configSource = [
-      "export default { test: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vitest.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['instanceof on an alias-bearing root', [
-      'const shared = { resolve: { alias: {} } };',
-      'shared instanceof receiver;',
-      'export default shared;',
-    ].join('\n'), true],
-    ['strict equality on an alias-bearing root', [
-      'const shared = { resolve: { alias: {} } };',
-      'shared === other;',
-      'export default shared;',
-    ].join('\n'), false],
-    ['instanceof on a non-alias-bearing subtree', [
-      'const shared = { resolve: { alias: {} }, plugins: [] };',
-      'shared.plugins instanceof Array;',
-      'export default shared;',
-    ].join('\n'), false],
-  ] as const)('classifies %s by comparison semantics', (_label, configSource, unresolved) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
-      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
-  });
-
-  it.each([
-    ['void-only use', 'void p;', false],
-    ['call-argument use', 'use(p);', true],
-  ] as const)('classifies a permitted const alias with %s', (_label, use, unresolved) => {
-    const configSource = [
-      'const shared = { resolve: { alias: {} } };',
-      'const p = shared;',
-      use,
-      'export default shared;',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
-      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
-  });
-
-  it.each([
-    ['shorthand resolve', 'vite.config.mjs', [
-      'const resolve = {};',
-      'install(resolve);',
-      'export default { resolve };',
-    ].join('\n')],
-    ['shorthand test', 'vitest.config.mjs', [
-      'const test = {};',
-      'install(test);',
-      'export default { test };',
-    ].join('\n')],
-    ['spread inside test', 'vitest.config.mjs', [
-      'const parts = {};',
-      'install(parts);',
-      'export default { test: { ...parts } };',
-    ].join('\n')],
-    ['spread inside resolve', 'vite.config.mjs', [
-      'const parts = {};',
-      'install(parts);',
-      'export default { resolve: { ...parts } };',
-    ].join('\n')],
-  ] as const)('treats %s as an alias-capable binding position', (_label, path, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path,
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path,
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('discovers a shorthand resolve binding without treating its declaration as an escape', () => {
-    const configSource = [
-      "const resolve = { alias: { '@x': '/lit' } };",
-      'export default { resolve };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/alias-capability-control.ts': "import value from '@x';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vite.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/alias-capability-control.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['direct root', [
-      'const shared = {};',
-      'install(shared);',
-      'export default shared;',
-    ].join('\n'), true],
-    ['root spread', [
-      'const shared = {};',
-      'install(shared);',
-      'export default { ...shared };',
-    ].join('\n'), true],
-    ['defineConfig callback root spread', [
-      "import { defineConfig } from 'vite';",
-      'const shared = {};',
-      'install(shared);',
-      'export default defineConfig(() => ({ ...shared }));',
-    ].join('\n'), true],
-    ['plugins value', [
-      'const plugins = [];',
-      'install(plugins);',
-      'export default { plugins };',
-    ].join('\n'), false],
-    ['build value', [
-      'const build = {};',
-      'install(build);',
-      'export default { build };',
-    ].join('\n'), false],
-  ] as const)('classifies %s by positional root capability', (_label, configSource, unresolved) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
-      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
-  });
-
-  it.each([
-    ['resolve alias-array entry', 'vite.config.mjs', [
-      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
-      "install(rules['0']);",
-      'export default { resolve: { alias: rules } };',
-    ].join('\n')],
-    ['const alias of a resolve alias-array entry', 'vite.config.mjs', [
-      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
-      "const entry = rules['0'];",
-      'install(entry);',
-      'export default { resolve: { alias: rules } };',
-    ].join('\n')],
-    ['test alias-array entry', 'vitest.config.mjs', [
-      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
-      'install(rules[0]);',
-      'export default { test: { alias: rules } };',
-    ].join('\n')],
-    ['spread alias-array entry source', 'vite.config.mjs', [
-      "const entries = [{ find: '@a', replacement: '/lit' }];",
-      'export default { resolve: { alias: [...entries] } };',
-      'install(entries[0]);',
-    ].join('\n')],
-    ['entry from a multiply placed alias array', 'vite.config.mjs', [
-      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
-      'install(rules[0]);',
-      'export default { plugins: rules, resolve: { alias: rules } };',
-    ].join('\n')],
-  ] as const)('fails closed for %s using its semantic placement prefix',
-  (_label, path, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path,
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path,
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('discovers an unescaped alias-array binding at its semantic placement', () => {
-    const configSource = [
-      "const rules = [{ find: '@x', replacement: '/lit' }];",
-      'export default { resolve: { alias: rules } };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/placement-prefix-control.ts': "import value from '@x';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vite.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/placement-prefix-control.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('keeps an escaped plugin-list entry non-alias-capable', () => {
-    const configSource = [
-      "const list = [{ name: 'p' }];",
-      'install(list[0]);',
-      'export default { plugins: list };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it.each([
-    ['indirect multiply placed entry', [
-      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
-      'const shared = { plugins: rules };',
-      'install(shared.plugins[0]);',
-      'export default { ...shared, resolve: { alias: rules } };',
-    ].join('\n')],
-    ['const alias of an indirect multiply placed entry', [
-      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
-      'const shared = { plugins: rules };',
-      'const entry = shared.plugins[0];',
-      'install(entry);',
-      'export default { ...shared, resolve: { alias: rules } };',
-    ].join('\n')],
-    ['two-level indirect multiply placed entry', [
-      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
-      'const shared = { plugins: rules };',
-      'const outer = { inner: shared };',
-      'install(outer.inner.plugins[0]);',
-      'export default { ...outer, resolve: { alias: rules } };',
-    ].join('\n')],
-  ] as const)('unions embedded placements for %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('keeps an indirectly accessed entry clean when it is placed only under plugins', () => {
-    const configSource = [
-      "const rules = [{ name: 'p' }];",
-      'const shared = { plugins: rules };',
-      'install(shared.plugins[0]);',
-      'export default { ...shared };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it.each([
-    ['shorthand projects array', [
-      'const projects = [{}];',
-      'install(projects[0]);',
-      'export default { test: { projects } };',
-    ].join('\n')],
-    ['inline projects array', [
-      'const project = {};',
-      'install(project);',
-      'export default { test: { projects: [project] } };',
-    ].join('\n')],
-    ['referenced projects array contents', [
-      'const project = {};',
-      'const projects = [project];',
-      'install(project);',
-      'export default { test: { projects: projects } };',
-    ].join('\n')],
-  ] as const)('treats each test.projects element as a nested configuration root: %s',
-  (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vitest.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('discovers a literal alias in a test.projects element', () => {
-    const configSource = [
-      "const project = { resolve: { alias: { '@project': './src/vtt/heldout-evaluation.ts' } } };",
-      'export default { test: { projects: [project] } };',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/project-alias-consumer.ts': "import policy from '@project';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vitest.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/project-alias-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['object spread override', [
-      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
-      'const overlay = { plugins: rules };',
-      "const shared = { plugins: [{ name: 'safe' }], ...overlay };",
-      'install(shared.plugins[0]);',
-      'export default { ...shared, resolve: { alias: rules } };',
-    ].join('\n')],
-    ['array spread runtime index', [
-      "const rules = [{ find: '@a', replacement: '/a' }, { find: '@b', replacement: '/b' }];",
-      "const shared = { plugins: [...rules, { name: 'safe' }] };",
-      'install(shared.plugins[1]);',
-      'export default { ...shared, resolve: { alias: rules } };',
-    ].join('\n')],
-  ] as const)('uses JavaScript spread semantics for %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['later explicit object property', [
-      "const rules = [{ find: '@a', replacement: '/a' }];",
-      'const overlay = { plugins: rules };',
-      "const shared = { ...overlay, plugins: [{ name: 'safe' }] };",
-      'install(shared.plugins[0]);',
-      'export default { ...shared, resolve: { alias: rules } };',
-    ].join('\n')],
-    ['entry before array spread', [
-      "const rules = [{ find: '@a', replacement: '/a' }];",
-      "const shared = { plugins: [{ name: 'safe' }, ...rules] };",
-      'install(shared.plugins[0]);',
-      'export default { ...shared, resolve: { alias: rules } };',
-    ].join('\n')],
-  ] as const)('keeps the runtime-safe spread ordering clean for %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it.each([
-    ['terminal plugin array', [
-      'const plugins = [];',
-      'const shared = { plugins };',
-      'install(shared.plugins);',
-      'export default { ...shared };',
-    ].join('\n'), false],
-    ['terminal resolve object', [
-      'const resolve = {};',
-      'const shared = { resolve };',
-      'install(shared.resolve);',
-      'export default { ...shared };',
-    ].join('\n'), true],
-    ['terminal dual-placement plugin array', [
-      "const plugins = [{ find: '@x', replacement: '/lit' }];",
-      'const shared = { plugins };',
-      'export default { ...shared, resolve: { alias: plugins } };',
-      'install(shared.plugins);',
-    ].join('\n'), true],
-  ] as const)('dereferences %s before alias-capability classification',
-  (_label, configSource, unresolved) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings.some((finding) => finding.path === 'vite.config.mjs' &&
-      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
-  });
-
-  it('discovers aliases from a literal project extends file', () => {
-    const rootSource = "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };";
-    const projectSource =
-      "export default { resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };";
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.mjs',
-      addedText: rootSource,
-      sourceText: rootSource,
-    }, {
-      path: 'tools/project-config.mjs',
-      addedText: projectSource,
-      sourceText: projectSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/project-extends-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vitest.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/project-extends-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['helper-built extended alias', "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };", {
-      'tools/project-config.mjs': "export default makeConfig();",
-    }],
-    ['nonliteral extends', 'const target = \'./tools/project-config.mjs\'; export default { test: { projects: [{ extends: target }] } };', {}],
-    ['missing extends file', "export default { test: { projects: [{ extends: './tools/missing.mjs' }] } };", {}],
-    ['outside-repository extends file', "export default { test: { projects: [{ extends: '../outside.mjs' }] } };", {}],
-    ['cyclic extends files', "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };", {
-      'tools/project-config.mjs': "export default { test: { projects: [{ extends: '../vitest.config.mjs' }] } };",
-    }],
-  ] as const)('fails closed for %s', (_label, rootSource, extraSources) => {
-    const changes = [{
-      path: 'vitest.config.mjs',
-      addedText: rootSource,
-      sourceText: rootSource,
-    }, ...Object.entries(extraSources).map(([path, sourceText]) => ({
-      path,
-      addedText: sourceText,
-      sourceText,
-    }))];
-    const report = inspectHeldoutLeakChanges(changes, 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vitest.config.mjs',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('treats project extends true as reuse of the clean root configuration', () => {
-    const configSource = 'export default { test: { projects: [{ extends: true }] } };';
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.mjs',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it('applies Rule N to an extended configuration loaded from the candidate source pool', () => {
-    const rootSource =
-      "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };";
-    const projectSource = [
-      "import { createRequire } from 'node:module';",
-      'const box = { load: createRequire(import.meta.url) };',
-      'export default {};',
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.mjs',
-      addedText: rootSource,
-      sourceText: rootSource,
-    }], 'F', bindings, {
-      candidateConfigurationFiles: {
-        'tools/project-config.mjs': projectSource,
-      },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'tools/project-config.mjs',
-      kind: 'loader_reference_escaped',
-    }));
-  });
-
-  it('interprets a symbol-proven defineConfig callback, conditional, and const spread', () => {
-    const configSource = [
-      "import { defineConfig } from 'vite';",
-      "const core = { base: '/' };",
-      "const shared = { ...core, resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
-      "export default defineConfig(({ command }) => command === 'serve' ? { ...shared } : shared);",
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it.each([
-    ['direct Vitest defineConfig', [
-      "import { defineConfig } from 'vitest/config';",
-      "export default defineConfig({ resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } });",
-    ].join('\n')],
-    ['Vitest mergeConfig union', [
-      "import { defineConfig, mergeConfig } from 'vitest/config';",
-      "const base = { resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };",
-      'export default defineConfig(mergeConfig(base, { test: { globals: true } }));',
-    ].join('\n')],
-  ] as const)('discovers aliases through %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vitest.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/unchanged-policy-consumer.ts': "import policy from '@policy';",
-      },
-    });
-
-    expect(report.findings).not.toContainEqual(expect.objectContaining({
-      path: 'vitest.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'src/ui/unchanged-policy-consumer.ts',
-      kind: 'unresolved_module_edge',
-    }));
+  it('delegates executable Vite and Vitest configuration semantics to the runtime guard', () => {
+    expect(HELDOUT_MODULE_SPECIFIER_POLICY.interpreted).toContain(
+      'runtime Vite serve and Vitest root/project resolver and transform evidence governs configuration semantics, aliases, plugin hooks, projects, and extends',
+    );
   });
-
-  it.each([
-    ['reachable const referenced elsewhere', [
-      'const shared = { resolve: { alias: {} } };',
-      'consume(shared);',
-      'export default shared;',
-    ].join('\n')],
-    ['reachable identifier initialized by a call', [
-      'const shared = makeConfig();',
-      'export default shared;',
-    ].join('\n')],
-    ['alias property outside the reachable set', [
-      'const stray = { alias: {} };',
-      'export default {};',
-    ].join('\n')],
-  ] as const)('fails Rule C for %s', (_label, configSource) => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      path: 'vite.config.ts',
-      kind: 'unresolved_module_edge',
-    }));
-  });
-
-  it('applies a regex alias only to matching specifiers', () => {
-    const configSource = [
-      "export default { resolve: { alias: [{ find: /^@policy$/, replacement: './src/vtt/heldout-evaluation.ts' }] } };",
-    ].join('\n');
-    const report = inspectHeldoutLeakChanges([{
-      path: 'vite.config.ts',
-      addedText: configSource,
-      sourceText: configSource,
-    }], 'F', bindings, {
-      candidateSourceFiles: {
-        'src/ui/ordinary-consumer.ts': "import ordinary from './ordinary-module';",
-      },
-    });
-
-    expect(report.findings).toEqual([]);
-  });
-
-  it('reports zero findings for the actual Vite and Vitest configs plus the actual src tree', () => {
-    expect(Object.keys(actualSourceFiles)).toHaveLength(674);
-    expect(actualTreeReport.checkedFiles).toBe(Object.keys(actualSourceFiles).length + 3);
-    expect(actualTreeReport.astInspectedFiles).toBe(Object.keys(actualSourceFiles).length + 2);
-    expect(actualTreeReport.findings).toEqual([]);
-  });
-
-  it('still reports an injected leak in configuration-reinspection mode', () => {
-    expect(injectedActualTreeReport.astInspectedFiles)
-      .toBe(Object.keys(injectedActualSourceFiles).length + 2);
-    expect(injectedActualTreeReport.findings).toEqual([expect.objectContaining({
-      path: 'src/ui/injected-heldout-leak.ts',
-      kind: 'protocol_import',
-    })]);
-  });
-
-  it('skips declaration-only files during configuration-wide inspection', () => {
-    const report = inspectHeldoutLeakChanges([{
-      path: 'package.json',
-      addedText: '{"imports":{}}',
-    }], 'F', bindings, {
-      packageJsonFiles: { 'package.json': '{"imports":{}}' },
-      candidateSourceFiles: {
-        'src/vite-env.d.ts': 'declare module "*.svg" { const source: string; export default source; }',
-        'src/ui/clean.ts': 'export const clean = true;',
-      },
-    });
-
-    expect(report).toMatchObject({ checkedFiles: 3, findings: [] });
-  });
-
   it('uses NUL-delimited Git records so rename-only and quoted paths are inspected', () => {
     const nameStatus = [
       'R100', 'tests/fixture.ts', 'src/quoted "fixture".ts',
@@ -2795,7 +1366,6 @@
       'eval executable strings',
       'new Function executable strings',
       'custom loader implementations',
-      'Vite plugin config hooks',
       'runtime-generated code',
     ]);
     expect(moduleSpecifiers('tools/tuning/repair-ranking.ts', [
diff --git a/tests/unit/tools/heldout-runtime-guard.test.ts b/tests/unit/tools/heldout-runtime-guard.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..4f15281c54689b10a66bfe2ccc19ee11c4b28e47
--- /dev/null
+++ b/tests/unit/tools/heldout-runtime-guard.test.ts
@@ -0,0 +1,752 @@
+import { tmpdir } from 'node:os';
+import { dirname, join } from 'node:path';
+import { describe, expect, it } from 'vitest';
+import {
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  readdirSync,
+  rmSync,
+  statSync,
+  writeFileSync,
+} from '../../helpers/test-filesystem';
+import {
+  runHeldoutIsolationPreflight,
+  runHeldoutRuntimeGuard,
+  type HeldoutRuntimeGuardReport,
+} from '../../../tools/heldout-runtime-guard';
+
+const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
+const bindings = {
+  reserveDigests: [reserveDigest],
+  resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
+} as const;
+const protectedTarget = '/work/src/vtt/heldout-evaluation.ts';
+const protectedPackageTarget = './src/vtt/heldout-evaluation.ts';
+
+interface RuntimeFixture {
+  readonly config: string;
+  readonly configFile?: 'vite.config.mjs' | 'vite.config.ts' | 'vitest.config.mjs';
+  readonly files?: Readonly<Record<string, string>>;
+  readonly consumer?: string;
+  readonly packageJson?: string;
+  readonly expectedSpecifier?: string;
+  readonly aggregateTimeoutMs?: number;
+  readonly lockFile?: string;
+}
+
+interface MigratedRuntimeCase extends RuntimeFixture {
+  readonly finding: string;
+}
+
+const migratedRuntimeCases: readonly MigratedRuntimeCase[] = [
+  {
+    finding: 'F47',
+    config: `const shared={resolve:{alias:{}}}; export default {get resolve(){shared.resolve.alias['@policy']='${protectedTarget}';return shared.resolve;}};`,
+  },
+  {
+    finding: 'F48',
+    config: `const shared={resolve:{alias:{'@policy':'${protectedTarget}'}}}; export {shared}; export default shared;`,
+  },
+  {
+    finding: 'F49',
+    config: "import bridge from './bridge.mjs'; export {bridge}; export default bridge;",
+    files: { 'bridge.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
+  },
+  {
+    finding: 'F50',
+    config: `const key='alias';const resolve={};resolve[key]={'@policy':'${protectedTarget}'};export default {resolve};`,
+  },
+  {
+    finding: 'F51',
+    config: `const source={alias:{'@policy':'${protectedTarget}'}};const {'alias':alias,...rest}=source;void rest;export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'F52',
+    config: `const shared=await Promise.resolve({resolve:{alias:{'@policy':'${protectedTarget}'}}});export default shared;`,
+  },
+  {
+    finding: 'F53',
+    config: `import {defineConfig,mergeConfig} from 'vite';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(mergeConfig(base,{}));`,
+  },
+  {
+    finding: 'F54',
+    config: `const shared={resolve:{alias:{}}};export default {...shared,plugins:[(shared.resolve.alias['@policy']='${protectedTarget}',false)]};`,
+  },
+  {
+    finding: 'F55',
+    config: `const box={value:{alias:{'@policy':'${protectedTarget}'}}};const {'alias':alias,...rest}=box.value;void rest;export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'F56',
+    configFile: 'vite.config.ts',
+    config: `const key:'alias'='alias';const root:Record<string,unknown>={};root[key]={'@policy':'${protectedTarget}'};export default {resolve:root};`,
+  },
+  {
+    finding: 'F57',
+    config: `const moduleApi=await import('node:module');const load=moduleApi.createRequire(import.meta.url);void load;export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
+  },
+  {
+    finding: 'F58',
+    config: `const shared={resolve:{alias:{}}};const p=shared.resolve.alias;Object.assign(p,{'@policy':'${protectedTarget}'});export default shared;`,
+  },
+  {
+    finding: 'F59',
+    configFile: 'vitest.config.mjs',
+    config: `function makeTestConfig(){return {alias:{'@policy':'${protectedTarget}'}}}export default {test:makeTestConfig()};`,
+  },
+  {
+    finding: 'F60',
+    config: `const shared={resolve:{alias:{}}};const receiver={[Symbol.hasInstance](value){value.resolve.alias['@policy']='${protectedTarget}';return true}};void(shared instanceof receiver);export default shared;`,
+  },
+  {
+    finding: 'F61',
+    config: `const shared={resolve:{alias:{}}};const p=shared;p.resolve.alias['@policy']='${protectedTarget}';export default shared;`,
+  },
+  {
+    finding: 'F62',
+    config: `const resolve={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(resolve);export default {resolve};`,
+  },
+  {
+    finding: 'F63',
+    config: `const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default {...shared};`,
+  },
+  {
+    finding: 'F64',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(rules[0]);export default {resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F65',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const shared={plugins:rules};function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(shared.plugins[0]);export default {...shared,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F66',
+    configFile: 'vitest.config.mjs',
+    config: `const project={name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}};export default {test:{projects:[project]}};`,
+  },
+  {
+    finding: 'F67',
+    config: `const rules=[{find:'@policy',replacement:'${protectedTarget}'}];const overlay={resolve:{alias:rules}};export default {resolve:{alias:[{find:'@policy',replacement:'/work/src/ordinary.ts'}]},...overlay};`,
+  },
+  {
+    finding: 'F68',
+    configFile: 'vitest.config.mjs',
+    config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
+    files: { 'project.config.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
+  },
+  {
+    finding: 'F69',
+    config: `const shared={resolve:{alias:{}}};function install(value){value.alias['@policy']='${protectedTarget}'}install(shared.resolve);export default shared;`,
+  },
+  {
+    finding: 'F47-side-effect-property',
+    config: `const shared={resolve:{alias:{}}};export default {...shared,sideEffect:(shared.resolve.alias['@policy']='${protectedTarget}')};`,
+  },
+  {
+    finding: 'F53-direct-vitest-alias',
+    configFile: 'vitest.config.mjs',
+    config: `import {defineConfig} from 'vitest/config';export default defineConfig({resolve:{alias:{'@policy':'${protectedTarget}'}}});`,
+  },
+  {
+    finding: 'F53-vitest-mergeConfig',
+    configFile: 'vitest.config.mjs',
+    config: `import {defineConfig,mergeConfig} from 'vitest/config';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(mergeConfig(base,{test:{globals:true}}));`,
+  },
+  {
+    finding: 'F58-test-alias-address',
+    configFile: 'vitest.config.mjs',
+    config: `const shared={test:{alias:{}}};Object.assign(shared.test.alias,{'@policy':'${protectedTarget}'});export default shared;`,
+  },
+  {
+    finding: 'F59-literal-test-alias',
+    configFile: 'vitest.config.mjs',
+    config: `export default {test:{alias:{'@policy':'${protectedTarget}'}}};`,
+  },
+  {
+    finding: 'F62-shorthand-test',
+    configFile: 'vitest.config.mjs',
+    config: `const test={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(test);export default {test};`,
+  },
+  {
+    finding: 'F62-resolve-container-spread',
+    config: `const parts={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(parts);export default {resolve:{...parts}};`,
+  },
+  {
+    finding: 'F62-test-container-spread',
+    configFile: 'vitest.config.mjs',
+    config: `const parts={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(parts);export default {test:{...parts}};`,
+  },
+  {
+    finding: 'F63-direct-root',
+    config: `const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default shared;`,
+  },
+  {
+    finding: 'F63-defineConfig-callback-root',
+    config: `import {defineConfig} from 'vite';const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default defineConfig(()=>({...shared}));`,
+  },
+  {
+    finding: 'F64-const-entry-alias',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const entry=rules[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F64-test-alias-entry',
+    configFile: 'vitest.config.mjs',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {test:{alias:rules}};`,
+  },
+  {
+    finding: 'F64-spread-entry-source',
+    config: `const entries=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias:[...entries]}};`,
+  },
+  {
+    finding: 'F64-dual-placement',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {plugins:rules,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F65-const-indirect-entry',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const shared={plugins:rules};const entry=shared.plugins[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F65-two-level-indirection',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const shared={plugins:rules};const outer={inner:shared};outer.inner.plugins[0].find='@policy';outer.inner.plugins[0].replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F66-shorthand-projects',
+    configFile: 'vitest.config.mjs',
+    config: `const projects=[{name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}}];export default {test:{projects}};`,
+  },
+  {
+    finding: 'F66-referenced-project-entry',
+    configFile: 'vitest.config.mjs',
+    config: `const project={name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}};const projects=[project];export default {test:{projects:projects}};`,
+  },
+  {
+    finding: 'F67-array-spread-index',
+    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'},{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins:[...rules,{name:'safe'}]};export default {...shared,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F69-terminal-dual-placement',
+    config: `const plugins=[{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins};export default {...shared,resolve:{alias:plugins}};`,
+  },
+  {
+    finding: 'F68-helper-built-extended-config',
+    configFile: 'vitest.config.mjs',
+    config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
+    files: {
+      'project.config.mjs': `const make=()=>({resolve:{alias:{'@policy':'${protectedTarget}'}}});export default make();`,
+    },
+  },
+  {
+    finding: 'F68-variable-extends',
+    configFile: 'vitest.config.mjs',
+    config: "const target='./project.config.mjs';export default {test:{projects:[{name:'extended',extends:target}]}};",
+    files: { 'project.config.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
+  },
+  {
+    finding: 'plugin-config',
+    config: `export default {plugins:[{name:'fixture-config',config(){return {resolve:{alias:{'@policy':'${protectedTarget}'}}}}}]};`,
+  },
+  {
+    finding: 'plugin-resolveId',
+    config: `export default {plugins:[{name:'fixture-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]};`,
+  },
+  {
+    finding: 'activated-dependency-plugin',
+    config: `import {normalizePath} from 'vite';const resolveId=normalizePath.bind(null,'${protectedTarget}');export default {plugins:[{name:'activated-dependency-function',resolveId}]};`,
+  },
+  {
+    finding: 'plugin-configResolved',
+    config: `let ready=false;export default {plugins:[{name:'fixture-state',configResolved(){ready=true},resolveId(id){if(ready&&id==='@policy')return '${protectedTarget}'}}]};`,
+  },
+  {
+    finding: 'plugin-project-chain',
+    configFile: 'vitest.config.mjs',
+    config: "export default {test:{projects:[{name:'chained',extends:'./project.config.mjs'}]}};",
+    files: {
+      'project.config.mjs': `export default {plugins:[{name:'project-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]};`,
+    },
+  },
+  {
+    finding: 'F13-package-import-exact',
+    config: 'export default {};',
+    consumer: "import value from '#policy';export {value};",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({
+      name: 'heldout-runtime-fixture',
+      type: 'module',
+      imports: { '#policy': protectedPackageTarget },
+    }),
+  },
+  {
+    finding: 'F13-package-import-pattern',
+    config: 'export default {};',
+    consumer: "import value from '#policy/value';export {value};",
+    expectedSpecifier: '#policy/value',
+    packageJson: JSON.stringify({
+      name: 'heldout-runtime-fixture',
+      type: 'module',
+      imports: { '#policy/*': protectedPackageTarget },
+    }),
+  },
+  {
+    finding: 'F19-package-import-conditions',
+    config: 'export default {};',
+    consumer: "import value from '#policy';export {value};",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({
+      name: 'heldout-runtime-fixture',
+      type: 'module',
+      imports: { '#policy': { import: protectedPackageTarget, default: './src/ordinary.ts' } },
+    }),
+  },
+  {
+    finding: 'F21-regex-alias',
+    config: `export default {resolve:{alias:[{find:/^@policy$/,replacement:'${protectedTarget}'}]}};`,
+  },
+] as const;
+
+const cleanRuntimeControls: readonly MigratedRuntimeCase[] = [
+  {
+    finding: 'F54-plain-plugin-calls',
+    config: `const helper=()=>({name:'ordinary'});export default {plugins:[helper(),helper({x:1})]};`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F54-property-read',
+    config: `const shared={plugins:[]};export default {...shared,plugins:[shared.plugins.length&&false]};`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F54-array-spread-read',
+    config: `const shared={plugins:[]};export default {...shared,plugins:[...shared.plugins]};`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F60-strict-equality',
+    config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};void(shared===shared);export default shared;`,
+  },
+  {
+    finding: 'F60-nonsemantic-instanceof',
+    config: `const shared={plugins:[]};void(shared.plugins instanceof Array);export default shared;`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F61-const-alias-void',
+    config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};const p=shared;void p;export default shared;`,
+  },
+  {
+    finding: 'F64-plugin-only-placement',
+    config: `const rules=[{name:'ordinary'}];function install(value){value.name='updated'}install(rules[0]);export default {plugins:rules};`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F65-plugin-only-indirection',
+    config: `const rules=[{name:'ordinary'}];const shared={plugins:rules};function install(value){value.name='updated'}install(shared.plugins[0]);export default shared;`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F67-later-explicit-property-wins',
+    config: `const overlay={plugins:[{name:'mutated'}]};const shared={...overlay,plugins:[{name:'safe'}]};shared.plugins[0].name='still-safe';export default shared;`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F69-terminal-plugin-array',
+    config: `const plugins=[];const shared={plugins};function install(value){void value.length}install(shared.plugins);export default shared;`,
+    consumer: "import value from './ordinary'; void value;",
+  },
+  {
+    finding: 'F68-extends-true-root-reuse',
+    configFile: 'vitest.config.mjs',
+    config: `export default {resolve:{alias:{'@policy':'/work/src/ordinary.ts'}},test:{projects:[{name:'reuse',extends:true}]}};`,
+  },
+] as const;
+
+function writeFixtureFile(root: string, path: string, source: string | Uint8Array): void {
+  const absolute = join(root, path);
+  mkdirSync(dirname(absolute), { recursive: true });
+  writeFileSync(absolute, source);
+}
+
+function copyRepositoryPath(source: string, target: string): void {
+  if (statSync(source).isDirectory()) {
+    mkdirSync(target, { recursive: true });
+    for (const entry of readdirSync(source)) {
+      copyRepositoryPath(join(source, entry), join(target, entry));
+    }
+    return;
+  }
+  mkdirSync(dirname(target), { recursive: true });
+  writeFileSync(target, readFileSync(source));
+}
+
+async function inspectFixture(fixture: RuntimeFixture): Promise<HeldoutRuntimeGuardReport> {
+  const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-fixture-'));
+  try {
+    writeFixtureFile(root, 'package.json', fixture.packageJson ??
+      JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module' }));
+    if (fixture.lockFile === undefined) copyRepositoryPath('package-lock.json', join(root, 'package-lock.json'));
+    else writeFixtureFile(root, 'package-lock.json', fixture.lockFile);
+    mkdirSync(join(root, 'node_modules'));
+    writeFixtureFile(root, fixture.configFile ?? 'vite.config.mjs', fixture.config);
+    writeFixtureFile(root, 'src/consumer.ts', fixture.consumer ?? "import value from '@policy'; export { value };");
+    writeFixtureFile(root, 'src/ordinary.ts', 'export default 1;');
+    writeFixtureFile(root, 'src/vtt/heldout-evaluation.ts', 'export default 2;');
+    for (const [path, source] of Object.entries(fixture.files ?? {})) {
+      writeFixtureFile(root, path, source);
+    }
+    return await runHeldoutRuntimeGuard({
+      root,
+      slice: 'F',
+      bindings,
+      ...(fixture.aggregateTimeoutMs === undefined
+        ? {}
+        : { aggregateTimeoutMs: fixture.aggregateTimeoutMs }),
+    });
+  } finally {
+    rmSync(root, { recursive: true, force: true });
+  }
+}
+
+async function inspectRealTree(
+  configFile: 'vite.config.ts' | 'vitest.config.ts',
+  extraConfig?: { readonly path: string; readonly source: string },
+): Promise<HeldoutRuntimeGuardReport> {
+  const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-real-tree-'));
+  try {
+    for (const directory of ['src', 'tools', 'docs', 'drizzle', 'tests', 'public']) {
+      copyRepositoryPath(directory, join(root, directory));
+    }
+    for (const file of ['package.json', 'package-lock.json', 'index.html']) {
+      copyRepositoryPath(file, join(root, file));
+    }
+    copyRepositoryPath(configFile, join(root, extraConfig === undefined ? configFile : 'base-config.ts'));
+    if (extraConfig !== undefined) {
+      writeFixtureFile(root, extraConfig.path, extraConfig.source);
+      writeFixtureFile(root, 'src/injected-runtime-consumer.ts', "import policy from '@policy'; void policy;");
+    }
+    mkdirSync(join(root, 'node_modules'));
+    return await runHeldoutRuntimeGuard({ root, slice: 'F', bindings });
+  } finally {
+    rmSync(root, { recursive: true, force: true });
+  }
+}
+
+const actualConfigurationReports = new Map<'vite.config.ts' | 'vitest.config.ts', HeldoutRuntimeGuardReport>();
+for (const configFile of ['vite.config.ts', 'vitest.config.ts'] as const) {
+  actualConfigurationReports.set(configFile, await inspectRealTree(configFile));
+}
+const injectedAliasRealTreeReport = await inspectRealTree('vite.config.ts', {
+  path: 'vite.config.mjs',
+  source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,resolve:{...value.resolve,alias:{'@policy':'${protectedTarget}'}}}};`,
+});
+const injectedResolverRealTreeReport = await inspectRealTree('vite.config.ts', {
+  path: 'vite.config.mjs',
+  source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,plugins:[...(value.plugins??[]),{name:'injected-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]}};`,
+});
+describe('held-out runtime resolution guard', () => {
+  it('passes the Node 24 bubblewrap isolation preflight', () => {
+    expect(runHeldoutIsolationPreflight()).toMatchObject({
+      status: 'passed',
+      bubblewrapVersion: 'bubblewrap 0.6.1',
+      runtimeVersion: 'v24.13.0',
+      checks: expect.arrayContaining([
+        'scratch_write_allowed',
+        'work_read_only',
+        'guard_read_only',
+        'external_network_unreachable',
+        'new_session_and_die_with_parent_enabled',
+      ]),
+    });
+  });
+
+  it('reports a real Vite alias resolution to the protected module', async () => {
+    const report = await inspectFixture({
+      config: "export default { resolve: { alias: { '@policy': '/work/src/vtt/heldout-evaluation.ts' } } };",
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      kind: 'runtime_protocol_resolution',
+    }));
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '@policy',
+      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
+      status: 'protected',
+    }));
+  });
+
+  it.each(migratedRuntimeCases)('executes $finding through the installed resolver', async (runtimeCase) => {
+    const report = await inspectFixture(runtimeCase);
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      kind: 'runtime_protocol_resolution',
+    }));
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
+      specifier: runtimeCase.expectedSpecifier ?? '@policy',
+      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
+      status: 'protected',
+    }));
+  });
+
+  it.each(migratedRuntimeCases)('keeps the $finding ordinary-target mutant clean', async (runtimeCase) => {
+    const redirectedFiles = Object.fromEntries(Object.entries(runtimeCase.files ?? {}).map(([path, source]) => [
+      path,
+      source.replaceAll(protectedTarget, '/work/src/ordinary.ts'),
+    ]));
+    const report = await inspectFixture({
+      ...runtimeCase,
+      config: runtimeCase.config.replaceAll(protectedTarget, '/work/src/ordinary.ts'),
+      files: redirectedFiles,
+      ...(runtimeCase.packageJson === undefined ? {} : {
+        packageJson: runtimeCase.packageJson
+          .replaceAll(protectedTarget, '/work/src/ordinary.ts')
+          .replaceAll(protectedPackageTarget, './src/ordinary.ts'),
+      }),
+    });
+
+    expect(report.findings).toEqual([]);
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
+      specifier: runtimeCase.expectedSpecifier ?? '@policy',
+      resolvedId: '<candidate>/src/ordinary.ts',
+      status: 'clean',
+    }));
+  });
+
+  it.each(cleanRuntimeControls)('keeps the $finding negative control clean', async (runtimeCase) => {
+    const report = await inspectFixture(runtimeCase);
+
+    expect(report.findings).toEqual([]);
+    expect(report.resolution).not.toContainEqual(expect.objectContaining({ status: 'protected' }));
+  });
+
+  it('fails closed when the alias is removed while the consumer remains', async () => {
+    const report = await inspectFixture({ config: 'export default {};' });
+
+    expect(report.findings.length).toBeGreaterThan(0);
+    expect(report.findings.every((finding) => finding.kind === 'unresolved_module_edge')).toBe(true);
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '@policy',
+      resolvedId: null,
+      status: 'unresolved',
+    }));
+    expect(report.resolution).not.toContainEqual(expect.objectContaining({
+      specifier: '@policy',
+      status: 'protected',
+    }));
+    expect(report.resolution).not.toContainEqual(expect.objectContaining({
+      specifier: '@policy',
+      status: 'clean',
+    }));
+  });
+
+  it('uses the real transform result for import.meta.glob and raw module edges', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: [
+        "export const modules = import.meta.glob('./vtt/heldout-*.ts');",
+        "import source from './vtt/heldout-evaluation.ts?raw';",
+        "export const asset = new URL('./vtt/heldout-evaluation.ts?url', import.meta.url);",
+        'export { source };',
+      ].join('\n'),
+    });
+
+    expect(report.resolution).toEqual(expect.arrayContaining([
+      expect.objectContaining({ source: 'transformed', status: 'protected' }),
+      expect.objectContaining({ specifier: './vtt/heldout-evaluation.ts?raw', status: 'protected' }),
+      expect.objectContaining({ specifier: './vtt/heldout-evaluation.ts?url', status: 'protected' }),
+    ]));
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
+  });
+
+  const runtimeGlobCases = [
+    [
+      'exact glob',
+      "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts');",
+      "export const modules=import.meta.glob('./ordinary.ts');",
+    ],
+    [
+      'negative glob ordering',
+      "export const modules=import.meta.glob(['./vtt/*.ts','!./vtt/ordinary.ts']);",
+      "export const modules=import.meta.glob(['./vtt/*.ts','!./vtt/heldout-evaluation.ts']);",
+    ],
+    [
+      'extglob',
+      "export const modules=import.meta.glob('./vtt/@(heldout-evaluation).ts');",
+      "export const modules=import.meta.glob('./@(ordinary).ts');",
+    ],
+    [
+      'literal option spread and base',
+      "export const modules=import.meta.glob('./heldout-evaluation.ts',{...{base:'./vtt'},eager:true});",
+      "export const modules=import.meta.glob('./ordinary.ts',{...{base:'./'},eager:true});",
+    ],
+    [
+      'query option',
+      "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts',{query:'?raw',import:'default'});",
+      "export const modules=import.meta.glob('./ordinary.ts',{query:'?raw',import:'default'});",
+    ],
+  ] as const;
+
+  it.each(runtimeGlobCases)('delegates %s matching to the installed Vite transform', async (_label, leakConsumer) => {
+    const leak = await inspectFixture({ config: 'export default {};', consumer: leakConsumer });
+
+    expect(leak.resolution).toContainEqual(expect.objectContaining({
+      status: 'protected',
+      source: 'transformed',
+    }));
+    expect(leak.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
+  });
+
+  it.each(runtimeGlobCases)('keeps the %s transform mutant clean', async (_label, _leakConsumer, cleanConsumer) => {
+    const clean = await inspectFixture({ config: 'export default {};', consumer: cleanConsumer });
+
+    expect(clean.findings).toEqual([]);
+  });
+
+  it('fails closed before Vite performs an unbounded leading-globstar filesystem scan', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "export const modules=import.meta.glob('**/heldout-evaluation.ts');",
+    });
+
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '**/heldout-evaluation.ts',
+      status: 'unresolved',
+      source: 'transformed',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
+  });
+
+  it('does not misreport an ordinary leading-globstar mutant as protected', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "export const modules=import.meta.glob('**/ordinary-runtime-control.ts');",
+      files: { 'src/ordinary-runtime-control.ts': 'export default 3;' },
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
+    expect(report.resolution).not.toContainEqual(expect.objectContaining({ status: 'protected' }));
+  });
+
+  it('excludes declaration-only files from runtime seed and transform inspection', async () => {
+    const report = await inspectFixture({
+      config: "export default {resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};",
+      files: { 'src/runtime-only.d.ts': "import type Value from './vtt/heldout-evaluation';export type Alias=Value;" },
+    });
+
+    expect(report.findings).toEqual([]);
+    expect(report.seedAssignments).not.toContainEqual(expect.objectContaining({ seed: 'src/runtime-only.d.ts' }));
+  });
+
+  it('records conservative source ownership for every Vitest project and keeps tools server-only', async () => {
+    const report = await inspectFixture({
+      configFile: 'vitest.config.mjs',
+      config: "export default {test:{projects:[{test:{name:'first'}},{test:{name:'second'}}]}};",
+      consumer: "import value from './ordinary'; void value;",
+      files: { 'tools/tool.ts': "import {join} from 'node:path'; export const value=join('a','b');" },
+    });
+    const sourceProjects = new Set(report.seedAssignments
+      .filter((row) => row.seed === 'src/consumer.ts')
+      .map((row) => row.project));
+    const toolAssignments = report.seedAssignments.filter((row) => row.seed === 'tools/tool.ts');
+
+    expect(sourceProjects.has('first')).toBe(true);
+    expect(sourceProjects.has('second')).toBe(true);
+    expect(toolAssignments.length).toBeGreaterThan(0);
+    expect(toolAssignments.every((row) => row.environment !== 'client')).toBe(true);
+  });
+
+  it('emits byte-identical canonical reports for identical inputs', async () => {
+    const fixture = { config: `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` };
+    const first = await inspectFixture(fixture);
+    const second = await inspectFixture(fixture);
+
+    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
+  });
+
+  it('fails closed when configuration execution throws', async () => {
+    const report = await inspectFixture({ config: "throw new TypeError('fixture-load-failure');" });
+
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
+      file: 'vite.config.mjs',
+      status: 'failed',
+      errorClass: 'TypeError',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      kind: 'configuration_load_failed',
+    }));
+  });
+
+  it.each([
+    ['missing project extends file', "export default {test:{projects:[{name:'missing',extends:'./missing.config.mjs'}]}};"],
+    ['throwing project extends file', "export default {test:{projects:[{name:'throwing',extends:'./project.config.mjs'}]}};"],
+  ] as const)('fails closed for a %s', async (label, config) => {
+    const report = await inspectFixture({
+      configFile: 'vitest.config.mjs',
+      config,
+      files: label.startsWith('throwing')
+        ? { 'project.config.mjs': "throw new TypeError('extended-config-failure');" }
+        : {},
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      kind: 'configuration_load_failed',
+    }));
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
+  });
+
+  it('kills a timed-out configuration process group and removes its scratch directory', async () => {
+    const before = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith('heldout-runtime-')));
+    await expect(inspectFixture({
+      config: 'while (true) {}',
+      aggregateTimeoutMs: 250,
+    })).rejects.toThrow('aggregate timeout');
+    const after = readdirSync(tmpdir()).filter((name) =>
+      name.startsWith('heldout-runtime-') && !before.has(name));
+
+    expect(after).toEqual([]);
+  });
+
+  it('rejects a candidate lock that differs from the trusted installation baseline', async () => {
+    await expect(inspectFixture({
+      config: 'export default {};',
+      lockFile: '{}',
+    })).rejects.toThrow('candidate lock does not match');
+  });
+
+});
+
+describe.each([
+  ['Vite', 'vite.config.ts'],
+  ['Vitest', 'vitest.config.ts'],
+] as const)('actual %s configuration runtime control', (_label, configFile) => {
+  it('has zero findings after loading and traversing the real tree', () => {
+    const report = actualConfigurationReports.get(configFile);
+    expect(report).toBeDefined();
+    if (report === undefined) throw new TypeError(`Missing runtime report for ${configFile}.`);
+    expect(report.findings).toEqual([]);
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
+      file: configFile,
+      status: 'loaded',
+    }));
+  });
+});
+
+describe('real-tree failure sensitivity', () => {
+  it.each([
+    ['alias', injectedAliasRealTreeReport, 'vite.config.mjs', 6],
+    ['resolveId hook', injectedResolverRealTreeReport, 'vite.config.mjs', 4],
+  ] as const)('reports the injected %s and keeps its canonical configuration identity',
+    (_label, report, configuration, expectedFindingCount) => {
+      expect(report.findings).toHaveLength(expectedFindingCount);
+      expect(report.findings.every((finding) => finding.kind === 'runtime_protocol_resolution')).toBe(true);
+      expect(report.findings).toContainEqual(expect.objectContaining({
+        kind: 'runtime_protocol_resolution',
+      }));
+      expect(report.resolution).toContainEqual(expect.objectContaining({
+        configuration,
+        specifier: '@policy',
+        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
+        status: 'protected',
+      }));
+    });
+});
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index bfcc5c05fecc04c684ddb9eafc2a6899760ddaf2..c680a76af2866865f42e04dbd567556b940b6b2a
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -1,9 +1,18 @@
-import { execFileSync } from 'node:child_process';
+import { execFileSync, spawnSync } from 'node:child_process';
+import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
+import { tmpdir } from 'node:os';
 import { posix } from 'node:path';
 import { fileURLToPath } from 'node:url';
 import { canonicalJson } from '../src/commands/canonical-json';
 import type { HeldoutSlice } from '../src/vtt/heldout-evaluation';
 import ts from 'typescript';
+import {
+  runHeldoutRuntimeGuard,
+  type HeldoutConfigurationLoad,
+  type HeldoutRuntimePreflight,
+  type HeldoutRuntimeResolution,
+  type HeldoutSeedAssignment,
+} from './heldout-runtime-guard';
 
 export interface HeldoutChangedText {
   readonly path: string;
@@ -19,7 +28,9 @@
     | 'protocol_import'
     | 'protocol_resolution'
     | 'unresolved_module_edge'
-    | 'loader_reference_escaped';
+    | 'loader_reference_escaped'
+    | 'runtime_protocol_resolution'
+    | 'configuration_load_failed';
   readonly detail: string;
 }
 
@@ -31,30 +42,16 @@
   readonly checkedFiles: number;
   /** Files which completed the full TypeScript AST and symbol inspection pass. */
   readonly astInspectedFiles: number;
+  readonly preflight?: HeldoutRuntimePreflight;
+  readonly configurationLoad?: readonly HeldoutConfigurationLoad[];
+  readonly resolution?: readonly HeldoutRuntimeResolution[];
+  readonly seedAssignments?: readonly HeldoutSeedAssignment[];
   readonly findings: readonly HeldoutLeakFinding[];
 }
 
 export interface HeldoutLeakBindings {
   readonly reserveDigests: readonly string[];
   readonly resultPaths: readonly string[];
-}
-
-export interface HeldoutLeakInspectionContext {
-  /** Candidate-revision paths, used to expand Vite import.meta.glob calls. */
-  readonly candidateFiles?: readonly string[];
-  /** Candidate-revision package.json contents keyed by repository-relative path. */
-  readonly packageJsonFiles?: Readonly<Record<string, string>>;
-  /** Complete candidate sources used when resolution configuration invalidates unchanged consumers. */
-  readonly candidateSourceFiles?: Readonly<Record<string, string>>;
-  /** Candidate source pool from which project `extends` configuration dependencies are loaded. */
-  readonly candidateConfigurationFiles?: Readonly<Record<string, string>>;
-  readonly resolutionConfigChanged?: boolean;
-  readonly configuredAliasPrefixes?: readonly string[];
-  readonly configuredAliasRegexes?: readonly {
-    readonly source: string;
-    readonly flags: string;
-  }[];
-  readonly unresolvedResolutionConfigPaths?: readonly string[];
 }
 
 const EVALUATION_FILES = new Set([
@@ -182,35 +179,34 @@
   'eval executable strings',
   'new Function executable strings',
   'custom loader implementations',
-  'Vite plugin config hooks',
   'runtime-generated code',
 ] as const;
 
-/** Rule N/Rule C audit: every expression-flow position is interpreted or fails closed. */
+/** Rule N audit; executable configuration references are delegated to the isolated runtime guard. */
 export const HELDOUT_LEAK_FLOW_AUDIT = [
-  { position: 'declaration initializer', loaderValues: 'Rule N1 permits only a plain const namespace alias; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C permits exact non-exported const aliases of statically addressed subtrees and fails closed for alias-bearing let, var, destructuring, or exported initializers' },
-  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use', configurationReferences: 'Rule C unions outer and embedded-binding placement prefixes through constant property and element reads; any effective path crossing resolve, test, or alias is alias-bearing and nonconstant addresses fail closed' },
-  { position: 'assignment', loaderValues: 'Rule N1 failed_closed; Rule N2 browser globals remain inert until loader-member use', configurationReferences: 'Rule C always fails closed on mutation targets and fails closed on alias-bearing assignment values' },
-  { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source', configurationReferences: 'Rule C fails closed when an alias-bearing subtree enters a binding pattern' },
-  { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source', configurationReferences: 'Rule C fails closed on assignment-pattern targets and alias-bearing assignment values' },
-  { position: 'parameter default', loaderValues: 'Rule N1 failed_closed; Rule N2 permits browser-global transfer but not loader use through the parameter', configurationReferences: 'Rule C fails closed for alias-bearing defaults' },
-  { position: 'return', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C interprets exported configuration-factory returns and otherwise fails closed for alias-bearing subtrees' },
-  { position: 'yield', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing yielded values' },
-  { position: 'throw', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing thrown values' },
-  { position: 'await or promise resolution', loaderValues: 'Rule N1 permits only await import of a constant built-in namespace and otherwise failed_closed; Rule N2 validates loader use', configurationReferences: 'Rule C fails closed for alias-bearing awaited or promise-resolved values' },
-  { position: 'template substitution', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing template substitutions' },
-  { position: 'spread', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C resolves tracked object spreads in source-order last-write order and tracked array spreads by runtime index; untracked spreads fail closed when addressed' },
-  { position: 'property value', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C visits exact literal nodes; alias-bearing values stored in untracked objects fail closed' },
-  { position: 'array element', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C records literal array placements; test.projects elements are nested configuration roots, while non-alias-bearing elements under unrelated keys remain usable' },
-  { position: 'call argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C interprets symbol-proven defineConfig and mergeConfig graph entries and otherwise fails closed for alias-bearing arguments' },
-  { position: 'constructor argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing constructor arguments' },
-  { position: 'call receiver', loaderValues: 'Rule N1 permits only direct namespace member derivation; Rule N2 validates loader members by symbol', configurationReferences: 'Rule C always fails closed when a tracked chain is the receiver of a method call' },
-  { position: 'conditional, logical, or comma expression', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C permits condition tests and strict equality, unions exported configuration branches, and otherwise fails closed for alias-bearing result values' },
-  { position: 'class field or heritage', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C fails closed for alias-bearing class storage or heritage values' },
-  { position: 'export', loaderValues: 'Rule N1 failed_closed except its exact alias initializer; Rule N2 permits inert global transfer', configurationReferences: 'Rule C starts at the single export-default graph and fails closed for other alias-bearing exports' },
-  { position: 'for-of head', loaderValues: 'Rule N1 failed_closed; Rule N2 validates later loader use', configurationReferences: 'Rule C always fails closed on tracked loop assignment heads' },
-  { position: 'for-in head', loaderValues: 'Rule N1 failed_closed; Rule N2 validates later loader use', configurationReferences: 'Rule C always fails closed on tracked loop assignment heads' },
-  { position: 'tagged template', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing tagged-template use' },
+  { position: 'declaration initializer', loaderValues: 'Rule N1 permits only a plain const namespace alias; Rule N2 permits inert browser-global transfer' },
+  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use' },
+  { position: 'assignment', loaderValues: 'Rule N1 failed_closed; Rule N2 browser globals remain inert until loader-member use' },
+  { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source' },
+  { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source' },
+  { position: 'parameter default', loaderValues: 'Rule N1 failed_closed; Rule N2 permits browser-global transfer but not loader use through the parameter' },
+  { position: 'return', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'yield', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'throw', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'await or promise resolution', loaderValues: 'Rule N1 permits only await import of a constant built-in namespace and otherwise failed_closed; Rule N2 validates loader use' },
+  { position: 'template substitution', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'spread', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'property value', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage' },
+  { position: 'array element', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage' },
+  { position: 'call argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'constructor argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'call receiver', loaderValues: 'Rule N1 permits only direct namespace member derivation; Rule N2 validates loader members by symbol' },
+  { position: 'conditional, logical, or comma expression', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
+  { position: 'class field or heritage', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage' },
+  { position: 'export', loaderValues: 'Rule N1 failed_closed except its exact alias initializer; Rule N2 permits inert global transfer' },
+  { position: 'for-of head', loaderValues: 'Rule N1 failed_closed; Rule N2 validates later loader use' },
+  { position: 'for-in head', loaderValues: 'Rule N1 failed_closed; Rule N2 validates later loader use' },
+  { position: 'tagged template', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
 ] as const;
 
 export const HELDOUT_MODULE_SPECIFIER_POLICY = {
@@ -221,8 +217,7 @@
     'a trailing index, index.js, or index.ts resolves to its containing module path',
     'a trailing .js or .ts extension resolves to the extensionless module identity',
     'file URLs use fileURLToPath semantics, including percent-decoding, before identity comparison',
-    'package #imports use exact-first Node pattern ordering in the nearest candidate package.json',
-    'literal filesystem Vite globs support base, leading **, *, **, ?, arrays, exclusions, and query options',
+    'package #imports and Vite glob matching are delegated to the installed runtime resolver and transform',
   ],
   meaningChangingQueries: [
     'raw', 'url', 'inline', 'worker', 'sharedworker', 'init', 'import', 'no-inline',
@@ -231,7 +226,7 @@
     'a normalized held-out import is a protocol_import',
     'a normalized held-out resolver call is a protocol_resolution',
     'a recognized non-constant module edge is an unresolved_module_edge',
-    'an undecodable or unknown-scheme edge and an unresolved package #import fail closed',
+    'an undecodable or unknown-scheme direct edge fails closed',
     'a known loader reference escaping recognized call syntax is loader_reference_escaped',
   ],
   interpreted: [
@@ -239,27 +234,15 @@
     'Rule N1 permits import.meta and module/worker namespaces only as direct member receivers or exact plain-const aliases',
     'Rule N2 permits browser globals to transfer inertly and validates Worker, SharedWorker, and importScripts members at use by symbol-proven global provenance',
     'a loader-valued expression is allowed only as a direct callee with a constant specifier, a receiver leading to a recognized member call, or the whole initializer of a non-exported plain-identifier const alias',
-    'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
-    'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
-    'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
-    'Rule C records every configuration placement prefix and unions outer paths with every embedded binding dereferenced, composing each placement with remaining descendant and const-alias paths; any semantic placement makes the reference alias-capable',
-    'Rule C visits ordinary shorthand and literal-array composition; installed Vitest 4 test.projects array elements are nested configuration roots, while removed test.workspace is not interpreted',
-    'Rule C resolves tracked literal object and array spreads with JavaScript last-write and runtime-index semantics, including terminal embedded identifiers',
-    'Rule C recursively inspects literal test.projects extends files from the candidate tree; true reuses the root configuration and missing, external, cyclic, or nonliteral targets fail closed',
-    'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
-    'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
-    'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
-    'reachable object spreads require tracked const literals; computed keys, accessors, methods, and nonliteral resolve, test, or alias values fail closed, while unrelated nonliteral values are opaque',
-    'root vite*.config.* and vitest*.config.* entry points are inspected, including symbol-proven defineConfig and mergeConfig imports from Vite or Vitest',
-    'resolution configuration changes re-inspect consumers; unresolved configuration makes every encountered consumer edge unresolved',
+    'runtime Vite serve and Vitest root/project resolver and transform evidence governs configuration semantics, aliases, plugin hooks, projects, and extends',
+    'runtime graph traversal follows value edges; erased type-only edges remain static findings',
     'every eligible candidate file receives the full AST and symbol inspection pass without a textual pre-gate',
   ],
   failsClosed: [
     'every other position of a loader-valued expression is loader_reference_escaped from one generic check',
     'every disallowed Rule N1 namespace position and every non-symbol-proven Rule N2 loader-member use is loader_reference_escaped from the same generic check',
-    'a nonliteral Vite or Vitest alias, unreachable alias/resolve/test property, or invalid reachable-const reference is unresolved configuration under Rule C',
-    'tracked configuration references with nonconstant addresses or mutation targets fail closed; alias-bearing subtrees also fail closed when returned, stored outside the visited graph, passed, exported, templated, awaited, yielded, or otherwise escaped',
-    'unresolved targets, options, package conditions, globs, aliases, URL schemes, and data modules are findings',
+    'runtime configuration load, resolver, transform, project, or ordinary-edge failures are findings in the isolated runtime guard',
+    'unresolved direct targets, URL schemes, and data modules are static findings',
   ],
   outOfScope: HELDOUT_LEAK_AST_OUT_OF_SCOPE,
 } as const;
@@ -355,161 +338,31 @@
   }
   const pattern = constantString(unwrapped);
   return pattern === null ? null : [pattern];
-}
-
-function globRegex(pattern: string): RegExp | null {
-  if (/[{}[\]\\]/u.test(pattern) || /(?:@|\+|\?|\*|!)\(/u.test(pattern)) return null;
-  let source = '^';
-  for (let index = 0; index < pattern.length; index += 1) {
-    const character = pattern[index];
-    if (character === '*') {
-      if (pattern[index + 1] === '*') {
-        if (pattern[index + 2] === '/') {
-          source += '(?:.*/)?';
-          index += 2;
-        } else {
-          source += '.*';
-          index += 1;
-        }
-      } else {
-        source += '[^/]*';
-      }
-    } else if (character === '?') {
-      source += '[^/]';
-    } else {
-      source += character?.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&') ?? '';
-    }
-  }
-  return new RegExp(`${source}$`, 'u');
-}
-
-function repositoryGlobPattern(
-  importer: string,
-  pattern: string,
-  base: string | null,
-): string | null {
-  const bareOrAlias = !pattern.startsWith('./') && !pattern.startsWith('../') &&
-    !pattern.startsWith('/') && !pattern.startsWith('**');
-  if (pattern.startsWith('#') || bareOrAlias) return null;
-  if (base !== null && (base.startsWith('#') || (
-    !base.startsWith('./') && !base.startsWith('../') && !base.startsWith('/')
-  ))) return null;
-  const baseDirectory = base === null
-    ? posix.dirname(importer)
-    : base.startsWith('/')
-      ? base.slice(1)
-      : posix.join(posix.dirname(importer), base);
-  const absolute = pattern.startsWith('/')
-    ? pattern.slice(1)
-    : pattern.startsWith('**')
-      ? pattern
-      : posix.join(baseDirectory, pattern);
-  return posix.normalize(absolute).replace(/^\.\//u, '');
 }
 
-interface GlobOptions {
-  readonly query: string;
-  readonly base: string | null;
-}
-
-function literalObjectProperties(
-  expression: ts.Expression,
-): ReadonlyMap<string, ts.Expression> | null {
-  const unwrapped = unwrapTransparentExpression(expression);
-  if (!ts.isObjectLiteralExpression(unwrapped)) return null;
-  const properties = new Map<string, ts.Expression>();
-  for (const property of unwrapped.properties) {
-    if (ts.isSpreadAssignment(property)) {
-      const spread = literalObjectProperties(property.expression);
-      if (spread === null) return null;
-      for (const [key, value] of spread) properties.set(key, value);
-      continue;
-    }
-    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) return null;
-    const key = propertyNameText(property.name);
-    if (key === null) return null;
-    properties.set(key, property.initializer);
-  }
-  return properties;
-}
-
-function literalOptionValue(expression: ts.Expression): boolean {
+function isLiteralGlobOption(expression: ts.Expression): boolean {
   const unwrapped = unwrapTransparentExpression(expression);
   if (constantString(unwrapped) !== null || ts.isNumericLiteral(unwrapped) ||
     unwrapped.kind === ts.SyntaxKind.TrueKeyword || unwrapped.kind === ts.SyntaxKind.FalseKeyword ||
     unwrapped.kind === ts.SyntaxKind.NullKeyword) return true;
   if (ts.isArrayLiteralExpression(unwrapped)) {
     return unwrapped.elements.every((element) =>
-      !ts.isSpreadElement(element) && literalOptionValue(element));
+      !ts.isSpreadElement(element) && isLiteralGlobOption(element));
   }
-  const properties = literalObjectProperties(unwrapped);
-  return properties !== null && [...properties.values()].every((value) => literalOptionValue(value));
-}
-
-function globOptions(expression: ts.Expression | undefined): GlobOptions | null {
-  if (expression === undefined) return { query: '', base: null };
-  const properties = literalObjectProperties(expression);
-  if (properties === null || [...properties.values()].some((value) => !literalOptionValue(value))) return null;
-  const queryInitializer = properties.get('query');
-  let query = '';
-  if (queryInitializer !== undefined) {
-    const initializer = unwrapTransparentExpression(queryInitializer);
-    const value = constantString(initializer);
-    if (value !== null) {
-      query = value.length === 0 || value.startsWith('?') ? value : `?${value}`;
-    } else {
-      if (!ts.isObjectLiteralExpression(initializer)) return null;
-      const parameters: string[] = [];
-      for (const property of initializer.properties) {
-        if (!ts.isPropertyAssignment(property)) return null;
-        const key = propertyNameText(property.name);
-        if (key === null) return null;
-        const queryValue = constantString(property.initializer) ??
-          (ts.isNumericLiteral(property.initializer) ? property.initializer.text : null) ??
-          (property.initializer.kind === ts.SyntaxKind.TrueKeyword ? 'true' : null) ??
-          (property.initializer.kind === ts.SyntaxKind.FalseKeyword ? 'false' : null);
-        if (queryValue === null) return null;
-        parameters.push(`${encodeURIComponent(key)}=${encodeURIComponent(queryValue)}`);
-      }
-      query = parameters.length === 0 ? '' : `?${parameters.join('&')}`;
+  if (!ts.isObjectLiteralExpression(unwrapped)) return false;
+  return unwrapped.properties.every((property) => {
+    if (ts.isSpreadAssignment(property)) {
+      return ts.isObjectLiteralExpression(unwrapTransparentExpression(property.expression)) &&
+        isLiteralGlobOption(property.expression);
     }
-  }
-  const baseInitializer = properties.get('base');
-  const base = baseInitializer === undefined
-    ? null
-    : constantString(baseInitializer);
-  if (baseInitializer !== undefined && base === null) return null;
-  return { query, base };
+    return ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) &&
+      propertyNameText(property.name) !== null && isLiteralGlobOption(property.initializer);
+  });
 }
 
-function expandGlobEdges(
-  importer: string,
-  patterns: readonly string[],
-  options: GlobOptions,
-  candidateFiles: readonly string[] | undefined,
-): readonly string[] | null {
-  const positive = patterns.filter((pattern) => !pattern.startsWith('!'));
-  const negative = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
-  if (positive.length === 0) return null;
-  const normalizedPositive = positive.map((pattern) =>
-    repositoryGlobPattern(importer, pattern, options.base));
-  const normalizedNegative = negative.map((pattern) =>
-    repositoryGlobPattern(importer, pattern, options.base));
-  if ([...normalizedPositive, ...normalizedNegative].some((pattern) => pattern === null)) return null;
-  const positiveRegexes = normalizedPositive.map((pattern) =>
-    pattern === null ? null : globRegex(pattern));
-  const negativeRegexes = normalizedNegative.map((pattern) =>
-    pattern === null ? null : globRegex(pattern));
-  if ([...positiveRegexes, ...negativeRegexes].some((regex) => regex === null)) return null;
-  if (candidateFiles === undefined) {
-    return positive.every((pattern) => !/[*?{}[\]]/u.test(pattern))
-      ? normalizedPositive.map((pattern) => `${pattern ?? ''}${options.query}`)
-      : null;
-  }
-  return candidateFiles.filter((candidatePath) =>
-    positiveRegexes.some((regex) => regex?.test(candidatePath) === true) &&
-    !negativeRegexes.some((regex) => regex?.test(candidatePath) === true))
-    .map((candidatePath) => `${candidatePath}${options.query}`);
+function hasLiteralLoaderOptions(expression: ts.Expression | undefined): boolean {
+  return expression === undefined ||
+    (ts.isObjectLiteralExpression(unwrapTransparentExpression(expression)) && isLiteralGlobOption(expression));
 }
 
 /**
@@ -519,7 +372,6 @@
 function discoverModuleEdges(
   path: string,
   source: string,
-  context: HeldoutLeakInspectionContext = {},
   dataDepth = 0,
   prepared?: PreparedModuleAnalysis,
 ): readonly ModuleEdge[] {
@@ -1235,7 +1087,7 @@
         if (kinds.has('factory')) return true;
         if (kinds.has('glob')) {
           return globPatternExpression(parent.arguments[0]) !== null &&
-            globOptions(parent.arguments[1]) !== null;
+            hasLiteralLoaderOptions(parent.arguments[1]);
         }
         if (kinds.has('script_loader')) {
           return parent.arguments.length > 0 &&
@@ -1411,14 +1263,7 @@
         add('dynamic_import', firstArgument);
       } else if (expressionKinds(callee).has('glob')) {
         const patterns = globPatternExpression(firstArgument);
-        const options = globOptions(node.arguments[1]);
-        const matches = patterns === null || options === null
-          ? null
-          : expandGlobEdges(path, patterns, options, context.candidateFiles);
-        if (matches === null) addUnresolved('import_meta_glob');
-        else for (const match of matches) {
-          result.push({ kind: 'import', syntax: 'import_meta_glob', specifier: match });
-        }
+        if (patterns === null || !hasLiteralLoaderOptions(node.arguments[1])) addUnresolved('import_meta_glob');
       } else if (scriptLoaderReference(callee)) {
         if (node.arguments.length === 0) addUnresolved('import_scripts');
         for (const argument of node.arguments) add('import_scripts', argument);
@@ -1477,7 +1322,7 @@
       if (decoded === null) {
         nested.push({ kind: 'unresolved', syntax: edge.syntax, specifier: null });
       } else {
-        nested.push(...discoverModuleEdges(`${path}.data-${String(dataDepth)}.ts`, decoded, context, dataDepth + 1));
+        nested.push(...discoverModuleEdges(`${path}.data-${String(dataDepth)}.ts`, decoded, dataDepth + 1));
       }
     }
     result.push(...nested);
@@ -1514,72 +1359,6 @@
   readonly path: string;
   readonly suffix: string;
   readonly meaningChangingQuery: boolean;
-}
-
-function importsTarget(value: unknown): string | null {
-  if (typeof value === 'string') return value;
-  if (value === null || typeof value !== 'object') return null;
-  const candidates = (Array.isArray(value) ? value : Object.values(value))
-    .map((candidate) => importsTarget(candidate));
-  if (candidates.length === 0 || candidates.some((candidate) => candidate === null)) return null;
-  const distinct = [...new Set(candidates)];
-  return distinct.length === 1 ? distinct[0] ?? null : null;
-}
-
-function resolvePackageImport(
-  importer: string,
-  specifier: string,
-  packageJsonFiles: Readonly<Record<string, string>> | undefined,
-): string | null {
-  if (packageJsonFiles === undefined) return null;
-  let directory = posix.dirname(importer);
-  while (true) {
-    const packagePath = directory === '.' ? 'package.json' : `${directory}/package.json`;
-    const source = packageJsonFiles[packagePath];
-    if (source !== undefined) {
-      try {
-        const parsed: unknown = JSON.parse(source);
-        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
-        const imports = Reflect.get(parsed, 'imports');
-        if (imports === null || typeof imports !== 'object' || Array.isArray(imports)) return null;
-        const entries = Object.entries(imports);
-        const exact = entries.find(([key]) => key === specifier);
-        if (exact !== undefined) {
-          const target = importsTarget(exact[1]);
-          if (target === null) return null;
-          return target.startsWith('./') ? posix.join(directory, target) : target;
-        }
-        const patterns = entries.flatMap(([key, value]) => {
-          const star = key.indexOf('*');
-          if (star < 0 || star !== key.lastIndexOf('*')) return [];
-          const prefix = key.slice(0, star);
-          const suffix = key.slice(star + 1);
-          return specifier.startsWith(prefix) && specifier.endsWith(suffix)
-            ? [{ key, value, prefix, suffix }]
-            : [];
-        }).sort((left, right) =>
-          right.prefix.length - left.prefix.length ||
-          right.suffix.length - left.suffix.length ||
-          right.key.length - left.key.length);
-        const selected = patterns[0];
-        if (selected === undefined) return null;
-        let target = importsTarget(selected.value);
-        if (target === null) return null;
-        const substitution = specifier.slice(
-          selected.prefix.length,
-          specifier.length - selected.suffix.length,
-        );
-        target = target.replaceAll('*', substitution);
-        return target.startsWith('./') ? posix.join(directory, target) : target;
-      } catch {
-        return null;
-      }
-      return null;
-    }
-    if (directory === '.') break;
-    directory = posix.dirname(directory);
-  }
-  return null;
 }
 
 function stripKnownModuleSuffix(path: string): string {
@@ -1595,29 +1374,11 @@
 function normalizeModuleSpecifier(
   originalSpecifier: string,
   importer: string,
-  context: HeldoutLeakInspectionContext,
 ): NormalizedModuleSpecifier | null {
   const schemeCandidate = originalSpecifier.trimStart();
   let specifier = /^[a-z][a-z0-9+.-]*:/iu.test(schemeCandidate)
     ? schemeCandidate
     : originalSpecifier;
-  if (specifier.startsWith('#')) {
-    const resolved = resolvePackageImport(importer, specifier, context.packageJsonFiles);
-    if (resolved === null) return null;
-    specifier = resolved;
-  }
-  if (context.configuredAliasPrefixes?.some((alias) =>
-    alias === '*' || specifier === alias ||
-    specifier.startsWith(alias.endsWith('/') ? alias : `${alias}/`)) === true) {
-    return null;
-  }
-  if (context.configuredAliasRegexes?.some(({ source, flags }) => {
-    try {
-      return new RegExp(source, flags).test(specifier);
-    } catch {
-      return true;
-    }
-  }) === true) return null;
   if (specifier.startsWith('file:')) {
     try {
       const url = new URL(specifier);
@@ -1652,9 +1413,8 @@
 function heldoutProtocolSpecifier(
   specifier: string,
   importer: string,
-  context: HeldoutLeakInspectionContext,
 ): NormalizedModuleSpecifier | null {
-  const normalized = normalizeModuleSpecifier(specifier, importer, context);
+  const normalized = normalizeModuleSpecifier(specifier, importer);
   if (normalized === null) return null;
   return normalized.path === 'heldout-evaluation' ||
     normalized.path.endsWith('/heldout-evaluation')
@@ -1666,11 +1426,10 @@
   edges: readonly ModuleEdge[],
   kind: Extract<ModuleEdge['kind'], 'import' | 'resolution'>,
   importer: string,
-  context: HeldoutLeakInspectionContext,
 ): NormalizedModuleSpecifier | null {
   for (const edge of edges) {
     if (edge.kind !== kind || edge.specifier === null) continue;
-    const normalized = heldoutProtocolSpecifier(edge.specifier, importer, context);
+    const normalized = heldoutProtocolSpecifier(edge.specifier, importer);
     if (normalized !== null) return normalized;
   }
   return null;
@@ -1679,13 +1438,9 @@
 function firstInvalidSpecifier(
   edges: readonly ModuleEdge[],
   importer: string,
-  context: HeldoutLeakInspectionContext,
 ): ModuleEdge | undefined {
-  if ((context.unresolvedResolutionConfigPaths?.length ?? 0) > 0) {
-    return edges.find((edge) => edge.kind === 'import' || edge.kind === 'resolution');
-  }
   return edges.find((edge) => edge.specifier !== null &&
-    normalizeModuleSpecifier(edge.specifier, importer, context) === null);
+    normalizeModuleSpecifier(edge.specifier, importer) === null);
 }
 
 function specifierSuffixDetail(specifier: NormalizedModuleSpecifier): string {
@@ -1731,7 +1486,6 @@
   changes: readonly HeldoutChangedText[],
   slice: HeldoutSlice,
   bindings: HeldoutLeakBindings,
-  context: HeldoutLeakInspectionContext = {},
 ): HeldoutLeakReport {
   if (bindings.reserveDigests.length === 0 || bindings.resultPaths.length === 0) {
     throw new TypeError('Held-out leak inspection requires reserve digest and result path bindings.');
@@ -1744,65 +1498,11 @@
     throw new TypeError('Held-out reserve result paths must use the registered result root.');
   }
   const findings: HeldoutLeakFinding[] = [];
-  const configurationSources = {
-    ...(context.candidateConfigurationFiles ?? {}),
-    ...(context.candidateSourceFiles ?? {}),
-    ...Object.fromEntries(changes.map((change) => [
-      change.path,
-      change.sourceText ?? change.addedText,
-    ])),
-  };
-  const aliasDiscoveries = changes.flatMap((change) => {
-    if (!isRootViteOrVitestConfig(change.path)) return [];
-    return [{ path: change.path, discovery: viteAliases(
-      change.sourceText ?? change.addedText,
-      change.path,
-      configurationSources,
-    ) }];
-  });
-  const discoveredAliases = aliasDiscoveries.flatMap(({ discovery }) => discovery.aliases);
-  const discoveredAliasRegexes = aliasDiscoveries.flatMap(({ discovery }) => discovery.regexes);
-  const unresolvedResolutionConfigPaths = [...new Set([
-    ...(context.unresolvedResolutionConfigPaths ?? []),
-    ...aliasDiscoveries.filter(({ discovery }) => discovery.unresolved).map(({ path }) => path),
-  ])];
-  const inspectionContext: HeldoutLeakInspectionContext = {
-    ...context,
-    configuredAliasPrefixes: [...new Set([
-      ...(context.configuredAliasPrefixes ?? []),
-      ...discoveredAliases,
-    ])],
-    configuredAliasRegexes: [
-      ...(context.configuredAliasRegexes ?? []),
-      ...discoveredAliasRegexes,
-    ],
-    unresolvedResolutionConfigPaths,
-  };
   const effectiveChanges = new Map(changes.map((change) => [change.path, change]));
-  for (const nestedPath of aliasDiscoveries.flatMap(({ discovery }) => discovery.nestedPaths)) {
-    const sourceText = configurationSources[nestedPath];
-    if (sourceText !== undefined && !effectiveChanges.has(nestedPath)) {
-      effectiveChanges.set(nestedPath, { path: nestedPath, addedText: '', sourceText });
-    }
-  }
-  const resolutionConfigChanged = inspectionContext.resolutionConfigChanged === true ||
-    changes.some((change) => isResolutionConfigPath(change.path));
-  if (resolutionConfigChanged) {
-    for (const [path, sourceText] of Object.entries(inspectionContext.candidateSourceFiles ?? {})) {
-      if (!effectiveChanges.has(path)) effectiveChanges.set(path, { path, addedText: '', sourceText });
-    }
-  }
   const astSources = new Map([...effectiveChanges.values()]
     .filter((change) => isTypeScriptOrJavaScript(change.path))
     .map((change) => [change.path, change.sourceText ?? change.addedText]));
   const preparedAnalyses = prepareModuleAnalyses(astSources);
-  for (const configPath of unresolvedResolutionConfigPaths) {
-    findings.push({
-      path: configPath,
-      kind: 'unresolved_module_edge',
-      detail: 'Vite alias configuration is not statically resolvable',
-    });
-  }
   let astInspectedFiles = 0;
   for (const change of effectiveChanges.values()) {
     const reference = reserveReference(change.addedText, bindings);
@@ -1817,14 +1517,13 @@
       ? discoverModuleEdges(
         change.path,
         change.sourceText ?? change.addedText,
-        inspectionContext,
         0,
         preparedAnalyses.get(change.path),
       )
       : [];
     if (eligibleForAstInspection) astInspectedFiles += 1;
     const restrictedPath = !EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path);
-    const heldoutImport = firstHeldoutEdge(edges, 'import', change.path, inspectionContext);
+    const heldoutImport = firstHeldoutEdge(edges, 'import', change.path);
     if (restrictedPath && heldoutImport !== null) {
       findings.push({
         path: change.path,
@@ -1832,7 +1531,7 @@
         detail: `held-out protocol imported outside evaluation tooling${specifierSuffixDetail(heldoutImport)}`,
       });
     }
-    const heldoutResolution = firstHeldoutEdge(edges, 'resolution', change.path, inspectionContext);
+    const heldoutResolution = firstHeldoutEdge(edges, 'resolution', change.path);
     if (restrictedPath && heldoutResolution !== null) {
       findings.push({
         path: change.path,
@@ -1841,7 +1540,7 @@
       });
     }
     const unresolved = edges.find((edge) => edge.kind === 'unresolved') ??
-      firstInvalidSpecifier(edges, change.path, inspectionContext);
+      firstInvalidSpecifier(edges, change.path);
     if (restrictedPath && unresolved !== undefined) {
       findings.push({
         path: change.path,
@@ -1957,1224 +1656,8 @@
 function isRootViteOrVitestConfig(path: string): boolean {
   return !path.includes('/') &&
     /^(?:vite|vitest)(?:\.[^.]+)*\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(path);
-}
-
-function jsonAliases(source: string, path: string): readonly string[] {
-  try {
-    const parsed = ts.parseConfigFileTextToJson(path, source);
-    if (parsed.error !== undefined || parsed.config === undefined) return [];
-    const config: unknown = parsed.config;
-    if (config === null || typeof config !== 'object' || Array.isArray(config)) return [];
-    const compilerOptions = Reflect.get(config, 'compilerOptions');
-    const paths = compilerOptions !== null && typeof compilerOptions === 'object'
-      ? Reflect.get(compilerOptions, 'paths')
-      : undefined;
-    const aliases = paths !== null && typeof paths === 'object' && !Array.isArray(paths)
-      ? Object.keys(paths).map((key) => key === '*'
-        ? '*'
-        : key.slice(0, key.indexOf('*') < 0 ? key.length : key.indexOf('*')))
-      : [];
-    const exportsValue = Reflect.get(config, 'exports');
-    const packageName = typeof Reflect.get(config, 'name') === 'string'
-      ? Reflect.get(config, 'name')
-      : null;
-    return exportsValue === undefined || typeof packageName !== 'string'
-      ? aliases
-      : [...aliases, packageName];
-  } catch {
-    return [];
-  }
 }
 
-interface ViteAliasDiscovery {
-  readonly aliases: readonly string[];
-  readonly regexes: readonly {
-    readonly source: string;
-    readonly flags: string;
-  }[];
-  readonly unresolved: boolean;
-  readonly nestedPaths: readonly string[];
-}
-
-function viteAliases(
-  source: string,
-  path: string,
-  configurationSources: Readonly<Record<string, string>> = {},
-  configurationStack: ReadonlySet<string> = new Set(),
-): ViteAliasDiscovery {
-  if (configurationStack.has(path)) {
-    return { aliases: [], regexes: [], unresolved: true, nestedPaths: [path] };
-  }
-  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
-  const aliases = new Set<string>();
-  const regexes = new Map<string, { readonly source: string; readonly flags: string }>();
-  const nestedPaths = new Set<string>();
-  let unresolved = false;
-  const inspectExtendedConfiguration = (specifier: string): void => {
-    if (specifier.length === 0 || posix.isAbsolute(specifier)) {
-      unresolved = true;
-      return;
-    }
-    const target = posix.normalize(posix.join(posix.dirname(path), specifier));
-    if (target === '..' || target.startsWith('../')) {
-      unresolved = true;
-      return;
-    }
-    const nestedSource = configurationSources[target];
-    if (nestedSource === undefined) {
-      unresolved = true;
-      return;
-    }
-    nestedPaths.add(target);
-    const nested = viteAliases(nestedSource, target, configurationSources,
-      new Set([...configurationStack, path]));
-    for (const alias of nested.aliases) aliases.add(alias);
-    for (const regex of nested.regexes) regexes.set(`${regex.source}/${regex.flags}`, regex);
-    for (const nestedPath of nested.nestedPaths) nestedPaths.add(nestedPath);
-    if (nested.unresolved) unresolved = true;
-  };
-  const compilerOptions: ts.CompilerOptions = {
-    allowJs: true,
-    checkJs: false,
-    noLib: true,
-    noResolve: true,
-    target: ts.ScriptTarget.Latest,
-  };
-  const compilerHost: ts.CompilerHost = {
-    fileExists: (fileName) => fileName === path,
-    getCanonicalFileName: (fileName) => fileName,
-    getCurrentDirectory: () => '',
-    getDefaultLibFileName: () => '',
-    getDirectories: () => [],
-    getNewLine: () => '\n',
-    getSourceFile: (fileName) => fileName === path ? sourceFile : undefined,
-    readFile: (fileName) => fileName === path ? source : undefined,
-    useCaseSensitiveFileNames: () => true,
-    writeFile: () => undefined,
-  };
-  const checker = ts.createProgram([path], compilerOptions, compilerHost).getTypeChecker();
-  const symbolAt = (identifier: ts.Identifier): ts.Symbol | undefined => {
-    if (ts.isExportSpecifier(identifier.parent)) {
-      return checker.getExportSpecifierLocalTargetSymbol(identifier.parent) ??
-        checker.getSymbolAtLocation(identifier);
-    }
-    if (ts.isShorthandPropertyAssignment(identifier.parent)) {
-      return checker.getShorthandAssignmentValueSymbol(identifier.parent) ??
-        checker.getSymbolAtLocation(identifier);
-    }
-    return checker.getSymbolAtLocation(identifier);
-  };
-  const reachableNodes = new Set<ts.Node>();
-  const reachableSymbols = new Map<ts.Symbol, ts.VariableDeclaration>();
-  const aliasCapableSymbols = new Set<ts.Symbol>();
-  const rootConfigurationSymbols = new Set<ts.Symbol>();
-  const placementPrefixes = new Map<ts.Symbol, string[][]>();
-  const visitingSymbols = new Set<ts.Symbol>();
-  const semanticConfigurationKey = (key: string): boolean =>
-    key === 'resolve' || key === 'test' || key === 'alias';
-  const recordPlacement = (symbol: ts.Symbol, path: readonly string[]): boolean => {
-    const placements = placementPrefixes.get(symbol) ?? [];
-    if (placements.some((candidate) => candidate.length === path.length &&
-      candidate.every((key, index) => key === path[index]))) return false;
-    placements.push([...path]);
-    placementPrefixes.set(symbol, placements);
-    return true;
-  };
-  const regexAlias = (
-    expression: ts.Expression,
-  ): { readonly source: string; readonly flags: string } | null => {
-    const unwrapped = unwrapTransparentExpression(expression);
-    if (!ts.isRegularExpressionLiteral(unwrapped)) return null;
-    const text = unwrapped.getText(sourceFile);
-    const closingSlash = text.lastIndexOf('/');
-    if (!text.startsWith('/') || closingSlash <= 0) return null;
-    const pattern = { source: text.slice(1, closingSlash), flags: text.slice(closingSlash + 1) };
-    try {
-      new RegExp(pattern.source, pattern.flags);
-      return pattern;
-    } catch {
-      return null;
-    }
-  };
-  const collectAliasEntry = (expression: ts.Expression): void => {
-    const entry = unwrapTransparentExpression(expression);
-    if (!ts.isObjectLiteralExpression(entry)) {
-      unresolved = true;
-      return;
-    }
-    const properties = new Map<string, ts.Expression>();
-    for (const property of entry.properties) {
-      if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
-        unresolved = true;
-        return;
-      }
-      const key = propertyNameText(property.name);
-      if (key === null) {
-        unresolved = true;
-        return;
-      }
-      properties.set(key, property.initializer);
-    }
-    const find = properties.get('find');
-    const replacement = properties.get('replacement');
-    if (find === undefined || replacement === undefined || !ts.isStringLiteral(replacement)) {
-      unresolved = true;
-      return;
-    }
-    if (ts.isStringLiteral(find)) {
-      aliases.add(find.text);
-      return;
-    }
-    const regex = regexAlias(find);
-    if (regex === null) {
-      unresolved = true;
-      return;
-    }
-    regexes.set(`${regex.source}/${regex.flags}`, regex);
-  };
-  const collectAliasInitializer = (initializer: ts.Expression): void => {
-    const literal = unwrapTransparentExpression(initializer);
-    if (ts.isObjectLiteralExpression(literal)) {
-      for (const property of literal.properties) {
-        if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name) ||
-          !ts.isStringLiteral(property.initializer)) {
-          unresolved = true;
-          return;
-        }
-        const key = propertyNameText(property.name);
-        if (key === null) {
-          unresolved = true;
-          return;
-        }
-        aliases.add(key);
-      }
-    } else if (ts.isArrayLiteralExpression(literal)) {
-      for (const element of literal.elements) {
-        if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) unresolved = true;
-        else collectAliasEntry(element);
-      }
-    } else {
-      unresolved = true;
-    }
-  };
-  const declarationForReachableIdentifier = (
-    identifier: ts.Identifier,
-  ): { readonly symbol: ts.Symbol; readonly declaration: ts.VariableDeclaration } | null => {
-    const symbol = symbolAt(identifier);
-    if (symbol === undefined) return null;
-    const declarations = symbol.declarations?.filter((declaration): declaration is ts.VariableDeclaration =>
-      ts.isVariableDeclaration(declaration) && declaration.getSourceFile() === sourceFile &&
-      ts.isIdentifier(declaration.name) && declaration.initializer !== undefined &&
-      ts.isVariableDeclarationList(declaration.parent) &&
-      (declaration.parent.flags & ts.NodeFlags.Const) !== 0) ?? [];
-    if (declarations.length !== 1) return null;
-    const declaration = declarations[0];
-    const initializer = declaration?.initializer === undefined
-      ? undefined
-      : unwrapTransparentExpression(declaration.initializer);
-    return declaration === undefined || initializer === undefined ||
-      (!ts.isObjectLiteralExpression(initializer) && !ts.isArrayLiteralExpression(initializer))
-      ? null
-      : { symbol, declaration };
-  };
-  const configurationHelper = (expression: ts.Expression): 'defineConfig' | 'mergeConfig' | null => {
-    const callee = unwrapTransparentExpression(expression);
-    if (!ts.isIdentifier(callee)) return null;
-    const symbol = symbolAt(callee);
-    for (const declaration of symbol?.declarations ?? []) {
-      if (!ts.isImportSpecifier(declaration)) continue;
-      const importedName = declaration.propertyName?.text ?? declaration.name.text;
-      const importClause = declaration.parent.parent;
-      const importDeclaration = importClause.parent;
-      if (!ts.isImportDeclaration(importDeclaration)) continue;
-      const moduleSpecifier = constantString(importDeclaration.moduleSpecifier);
-      if (!['vite', 'vitest', 'vitest/config'].includes(moduleSpecifier ?? '')) continue;
-      if (importedName === 'defineConfig' || importedName === 'mergeConfig') return importedName;
-    }
-    return null;
-  };
-  const returnedExpressions = (body: ts.ConciseBody): readonly ts.Expression[] => {
-    if (!ts.isBlock(body)) return [body];
-    const returned: ts.Expression[] = [];
-    const visitReturn = (node: ts.Node): void => {
-      if (node !== body && ts.isFunctionLike(node)) return;
-      if (ts.isReturnStatement(node) && node.expression !== undefined) {
-        returned.push(node.expression);
-        return;
-      }
-      ts.forEachChild(node, visitReturn);
-    };
-    visitReturn(body);
-    return returned;
-  };
-  const visitAliasValue = (expression: ts.Expression, path: readonly string[]): void => {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isIdentifier(value)) {
-      const symbol = visitReachableIdentifier(value, (initializer) =>
-        visitAliasValue(initializer, path));
-      if (symbol !== null) {
-        aliasCapableSymbols.add(symbol);
-        recordPlacement(symbol, path);
-      }
-      return;
-    }
-    reachableNodes.add(value);
-    collectAliasInitializer(value);
-  };
-  const visitOrdinaryPropertyValue = (
-    expression: ts.Expression,
-    path: readonly string[],
-  ): void => {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isObjectLiteralExpression(value)) visitReachableObject(value, path);
-    else if (ts.isArrayLiteralExpression(value)) visitOrdinaryArray(value, path);
-    else if (ts.isIdentifier(value)) {
-      const resolved = declarationForReachableIdentifier(value);
-      if (resolved !== null) {
-        reachableNodes.add(value);
-        reachableSymbols.set(resolved.symbol, resolved.declaration);
-        recordPlacement(resolved.symbol, path);
-        if (visitingSymbols.has(resolved.symbol)) {
-          unresolved = true;
-          return;
-        }
-        visitingSymbols.add(resolved.symbol);
-        visitOrdinaryPropertyValue(resolved.declaration.initializer as ts.Expression, path);
-        visitingSymbols.delete(resolved.symbol);
-      }
-    }
-  };
-  const visitProjectConfigurations = (
-    expression: ts.Expression,
-    path: readonly string[],
-  ): void => {
-    // Vitest 4 consumes test.projects at cli-api.BK8pd4xc.js:13298, forwards each
-    // object into initializeProject at :11117, and creates its Vite server at
-    // :11048. The former test.workspace option is rejected at :13299.
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isIdentifier(value)) {
-      const symbol = visitReachableIdentifier(value, (initializer) =>
-        visitProjectConfigurations(initializer, path));
-      if (symbol !== null) {
-        aliasCapableSymbols.add(symbol);
-        recordPlacement(symbol, path);
-      }
-      return;
-    }
-    if (!ts.isArrayLiteralExpression(value)) {
-      unresolved = true;
-      return;
-    }
-    reachableNodes.add(value);
-    for (const [index, element] of value.elements.entries()) {
-      if (ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
-        unresolved = true;
-        continue;
-      }
-      reachableNodes.add(element);
-      const project = unwrapTransparentExpression(element);
-      const projectPath = [...path, String(index)];
-      if (ts.isObjectLiteralExpression(project)) {
-        visitReachableObject(project, projectPath);
-      } else if (ts.isIdentifier(project)) {
-        const symbol = visitReachableIdentifier(project, (initializer) => {
-          const literal = unwrapTransparentExpression(initializer);
-          if (ts.isObjectLiteralExpression(literal)) visitReachableObject(literal, projectPath);
-          else unresolved = true;
-        });
-        if (symbol !== null) {
-          aliasCapableSymbols.add(symbol);
-          recordPlacement(symbol, projectPath);
-        }
-      } else unresolved = true;
-    }
-  };
-  const visitProjectExtends = (expression: ts.Expression): void => {
-    // cli-api.BK8pd4xc.js:11113 maps a string to that config file and true to
-    // the root Vite config before initializeProject creates the server at :11048.
-    const value = unwrapTransparentExpression(expression);
-    reachableNodes.add(value);
-    if (value.kind === ts.SyntaxKind.TrueKeyword) return;
-    if (ts.isStringLiteral(value)) {
-      inspectExtendedConfiguration(value.text);
-      return;
-    }
-    unresolved = true;
-  };
-  const visitResolveObject = (expression: ts.Expression, path: readonly string[]): void => {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isIdentifier(value)) {
-      const symbol = visitReachableIdentifier(value, (initializer) =>
-        visitResolveObject(initializer, path));
-      if (symbol !== null) {
-        aliasCapableSymbols.add(symbol);
-        recordPlacement(symbol, path);
-      }
-      return;
-    }
-    if (!ts.isObjectLiteralExpression(value)) {
-      unresolved = true;
-      return;
-    }
-    reachableNodes.add(value);
-    for (const property of value.properties) {
-      if (ts.isSpreadAssignment(property)) {
-        reachableNodes.add(property);
-        const spread = unwrapTransparentExpression(property.expression);
-        if (ts.isIdentifier(spread)) {
-          const symbol = visitReachableIdentifier(spread, (initializer) =>
-            visitResolveObject(initializer, path));
-          if (symbol !== null) {
-            aliasCapableSymbols.add(symbol);
-            recordPlacement(symbol, path);
-          }
-        }
-        else unresolved = true;
-        continue;
-      }
-      if (ts.isShorthandPropertyAssignment(property)) {
-        reachableNodes.add(property);
-        if (property.name.text === 'alias') {
-          visitAliasValue(property.name, [...path, 'alias']);
-        } else if (property.name.text === 'resolve' || property.name.text === 'test') {
-          visitResolveObject(property.name, [...path, property.name.text]);
-        } else if (property.name.text === 'projects' && path.at(-1) === 'test') {
-          visitProjectConfigurations(property.name, [...path, 'projects']);
-        } else if (property.name.text === 'extends' && path.at(-2) === 'projects') {
-          unresolved = true;
-        } else visitOrdinaryPropertyValue(property.name, [...path, property.name.text]);
-        continue;
-      }
-      if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
-        unresolved = true;
-        continue;
-      }
-      reachableNodes.add(property);
-      const key = propertyNameText(property.name);
-      if (key === 'alias') visitAliasValue(property.initializer, [...path, key]);
-      else if (key === 'resolve' || key === 'test') {
-        visitResolveObject(property.initializer, [...path, key]);
-      } else if (key === 'projects' && path.at(-1) === 'test') {
-        visitProjectConfigurations(property.initializer, [...path, key]);
-      } else if (key === 'extends' && path.at(-2) === 'projects') {
-        visitProjectExtends(property.initializer);
-      } else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
-    }
-  };
-  const visitReachableObject = (
-    object: ts.ObjectLiteralExpression,
-    path: readonly string[],
-  ): void => {
-    reachableNodes.add(object);
-    for (const property of object.properties) {
-      if (ts.isSpreadAssignment(property)) {
-        reachableNodes.add(property);
-        const spread = unwrapTransparentExpression(property.expression);
-        if (ts.isIdentifier(spread)) {
-          const symbol = visitReachableIdentifier(spread, (initializer) =>
-            visitReachableExpression(initializer, path));
-          if (symbol !== null) {
-            recordPlacement(symbol, path);
-            if (path.length === 0 || path.some(semanticConfigurationKey)) {
-              aliasCapableSymbols.add(symbol);
-            }
-          }
-        }
-        else unresolved = true;
-        continue;
-      }
-      if (ts.isShorthandPropertyAssignment(property)) {
-        reachableNodes.add(property);
-        if (property.name.text === 'resolve' || property.name.text === 'test') {
-          visitResolveObject(property.name, [...path, property.name.text]);
-        } else if (property.name.text === 'alias') {
-          visitAliasValue(property.name, [...path, 'alias']);
-        } else if (property.name.text === 'extends' && path.at(-2) === 'projects') {
-          unresolved = true;
-        } else {
-          visitOrdinaryPropertyValue(property.name, [...path, property.name.text]);
-        }
-        continue;
-      }
-      if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
-        unresolved = true;
-        continue;
-      }
-      reachableNodes.add(property);
-      const key = propertyNameText(property.name);
-      if (key === 'resolve' || key === 'test') {
-        visitResolveObject(property.initializer, [...path, key]);
-      } else if (key === 'alias') visitAliasValue(property.initializer, [...path, key]);
-      else if (key === 'extends' && path.at(-2) === 'projects') {
-        visitProjectExtends(property.initializer);
-      }
-      else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
-    }
-  };
-  const reachableArrayLength = (
-    expression: ts.Expression,
-    seen: Set<ts.Symbol> = new Set(),
-  ): number | null => {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isIdentifier(value)) {
-      const resolved = declarationForReachableIdentifier(value);
-      if (resolved === null || seen.has(resolved.symbol)) return null;
-      return reachableArrayLength(resolved.declaration.initializer as ts.Expression,
-        new Set([...seen, resolved.symbol]));
-    }
-    if (!ts.isArrayLiteralExpression(value)) return null;
-    let length = 0;
-    for (const element of value.elements) {
-      if (!ts.isSpreadElement(element)) {
-        length += 1;
-        continue;
-      }
-      const spreadLength = reachableArrayLength(element.expression, seen);
-      if (spreadLength === null) return null;
-      length += spreadLength;
-    }
-    return length;
-  };
-  const visitReachableArray = (
-    array: ts.ArrayLiteralExpression,
-    path: readonly string[],
-  ): void => {
-    reachableNodes.add(array);
-    let runtimeIndex: number | null = 0;
-    for (const element of array.elements) {
-      if (ts.isOmittedExpression(element)) {
-        if (runtimeIndex !== null) runtimeIndex += 1;
-        continue;
-      }
-      reachableNodes.add(element);
-      if (ts.isSpreadElement(element)) {
-        const spread = unwrapTransparentExpression(element.expression);
-        if (ts.isIdentifier(spread)) {
-          const symbol = visitReachableIdentifier(spread, (initializer) =>
-            visitReachableExpression(initializer, path));
-          if (symbol !== null) recordPlacement(symbol, path);
-        }
-        else unresolved = true;
-        const spreadLength = reachableArrayLength(element.expression);
-        runtimeIndex = runtimeIndex === null || spreadLength === null
-          ? null
-          : runtimeIndex + spreadLength;
-        continue;
-      }
-      const unwrapped = unwrapTransparentExpression(element);
-      const elementPath = runtimeIndex === null ? null : [...path, String(runtimeIndex)];
-      if (ts.isIdentifier(unwrapped)) {
-        const symbol = visitReachableIdentifier(unwrapped, (initializer) =>
-          elementPath === null ? undefined : visitReachableExpression(initializer, elementPath));
-        if (symbol !== null && elementPath !== null) recordPlacement(symbol, elementPath);
-      }
-      else if (elementPath !== null &&
-        (ts.isObjectLiteralExpression(unwrapped) || ts.isArrayLiteralExpression(unwrapped))) {
-        visitReachableExpression(unwrapped, elementPath);
-      } else unresolved = true;
-      if (runtimeIndex !== null) runtimeIndex += 1;
-    }
-  };
-  function visitOrdinaryArray(
-    array: ts.ArrayLiteralExpression,
-    path: readonly string[],
-  ): void {
-    reachableNodes.add(array);
-    let runtimeIndex: number | null = 0;
-    for (const element of array.elements) {
-      if (ts.isOmittedExpression(element)) {
-        if (runtimeIndex !== null) runtimeIndex += 1;
-        continue;
-      }
-      reachableNodes.add(element);
-      if (ts.isSpreadElement(element)) {
-        const spread = unwrapTransparentExpression(element.expression);
-        if (ts.isIdentifier(spread)) visitOrdinaryPropertyValue(spread, path);
-        const spreadLength = reachableArrayLength(element.expression);
-        runtimeIndex = runtimeIndex === null || spreadLength === null
-          ? null
-          : runtimeIndex + spreadLength;
-        continue;
-      }
-      const value = unwrapTransparentExpression(element);
-      if (runtimeIndex !== null && (ts.isIdentifier(value) ||
-        ts.isObjectLiteralExpression(value) || ts.isArrayLiteralExpression(value))) {
-        visitOrdinaryPropertyValue(value, [...path, String(runtimeIndex)]);
-      }
-      if (runtimeIndex !== null) runtimeIndex += 1;
-    }
-  }
-  const visitReachableFunction = (fn: ts.ArrowFunction | ts.FunctionExpression): void => {
-    for (const expression of returnedExpressions(fn.body)) visitReachableExpression(expression, []);
-  };
-  function visitReachableIdentifier(
-    identifier: ts.Identifier,
-    visitor: (expression: ts.Expression) => void,
-  ): ts.Symbol | null {
-    reachableNodes.add(identifier);
-    const resolved = declarationForReachableIdentifier(identifier);
-    if (resolved === null) {
-      unresolved = true;
-      return null;
-    }
-    reachableSymbols.set(resolved.symbol, resolved.declaration);
-    if (visitingSymbols.has(resolved.symbol)) {
-      unresolved = true;
-      return null;
-    }
-    visitingSymbols.add(resolved.symbol);
-    visitor(resolved.declaration.initializer as ts.Expression);
-    visitingSymbols.delete(resolved.symbol);
-    return resolved.symbol;
-  }
-  function visitReachableExpression(
-    expression: ts.Expression,
-    path: readonly string[],
-  ): void {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isObjectLiteralExpression(value)) {
-      visitReachableObject(value, path);
-    } else if (ts.isArrayLiteralExpression(value)) {
-      visitReachableArray(value, path);
-    } else if (ts.isIdentifier(value)) {
-      const symbol = visitReachableIdentifier(value, (initializer) =>
-        visitReachableExpression(initializer, path));
-      if (symbol !== null) {
-        recordPlacement(symbol, path);
-        if (path.length === 0) rootConfigurationSymbols.add(symbol);
-      }
-    } else if (ts.isConditionalExpression(value)) {
-      visitReachableExpression(value.whenTrue, path);
-      visitReachableExpression(value.whenFalse, path);
-    } else if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
-      visitReachableFunction(value);
-    } else if (ts.isCallExpression(value)) {
-      const helper = configurationHelper(value.expression);
-      if (helper === 'defineConfig' && value.arguments.length === 1) {
-        const argument = value.arguments[0];
-        if (argument === undefined || ts.isSpreadElement(argument)) unresolved = true;
-        else visitReachableExpression(argument, []);
-      } else if (helper === 'mergeConfig' && value.arguments.length === 2) {
-        for (const argument of value.arguments) {
-          if (ts.isSpreadElement(argument)) unresolved = true;
-          else visitReachableExpression(argument, []);
-        }
-      } else unresolved = true;
-    } else {
-      unresolved = true;
-    }
-  }
-  const exportAssignments = sourceFile.statements.filter((statement): statement is ts.ExportAssignment =>
-    ts.isExportAssignment(statement) && !statement.isExportEquals);
-  const exported = exportAssignments[0];
-  if (exportAssignments.length !== 1 || exported === undefined) unresolved = true;
-  else visitReachableExpression(exported.expression, []);
-  const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
-    kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
-  const isUpdateOperator = (kind: ts.SyntaxKind): boolean =>
-    kind === ts.SyntaxKind.PlusPlusToken || kind === ts.SyntaxKind.MinusMinusToken;
-  interface ConfigurationAddress {
-    readonly root: ts.Symbol;
-    readonly path: readonly string[];
-  }
-  interface ConfigurationReferenceAddress extends ConfigurationAddress {
-    readonly binding: ts.Symbol;
-    readonly relativePath: readonly string[];
-    readonly effectivePaths: readonly (readonly string[])[];
-  }
-  const referenceChain = (
-    identifier: ts.Identifier,
-  ): {
-    readonly expression: ts.Expression;
-    readonly constantElements: boolean;
-    readonly path: readonly string[];
-  } => {
-    let expression: ts.Expression = identifier;
-    let constantElements = true;
-    const path: string[] = [];
-    while (true) {
-      const parent = expression.parent;
-      if ((ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) ||
-        ts.isSatisfiesExpression(parent) || ts.isNonNullExpression(parent) ||
-        ts.isTypeAssertionExpression(parent)) && parent.expression === expression) {
-        expression = parent;
-        continue;
-      }
-      if (ts.isPropertyAccessExpression(parent) && parent.expression === expression) {
-        path.push(parent.name.text);
-        expression = parent;
-        continue;
-      }
-      if (ts.isElementAccessExpression(parent) && parent.expression === expression) {
-        const key = propertyKey(parent);
-        if (key === null) constantElements = false;
-        else path.push(key);
-        expression = parent;
-        continue;
-      }
-      return { expression, constantElements, path };
-    }
-  };
-  const isAssignmentPatternContainer = (node: ts.Node): boolean =>
-    ts.isParenthesizedExpression(node) || ts.isObjectLiteralExpression(node) ||
-    ts.isArrayLiteralExpression(node) || ts.isPropertyAssignment(node) ||
-    ts.isShorthandPropertyAssignment(node) || ts.isSpreadAssignment(node) ||
-    ts.isSpreadElement(node);
-  const isMutationTarget = (expression: ts.Expression): boolean => {
-    let current: ts.Node = expression;
-    while (true) {
-      const parent = current.parent;
-      if (ts.isBinaryExpression(parent) && isAssignmentOperator(parent.operatorToken.kind)) {
-        return parent.left === current;
-      }
-      if ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
-        isUpdateOperator(parent.operator) && parent.operand === current) return true;
-      if (ts.isDeleteExpression(parent) && parent.expression === current) return true;
-      if ((ts.isForInStatement(parent) || ts.isForOfStatement(parent)) &&
-        parent.initializer === current) return true;
-      if (!isAssignmentPatternContainer(parent)) return false;
-      current = parent;
-    }
-  };
-  const isNonExportedPlainConst = (declaration: ts.VariableDeclaration): boolean => {
-    if (!ts.isIdentifier(declaration.name) || !ts.isVariableDeclarationList(declaration.parent) ||
-      (declaration.parent.flags & ts.NodeFlags.Const) === 0) return false;
-    const statement = declaration.parent.parent;
-    return !ts.isVariableStatement(statement) || ts.getModifiers(statement)?.some((modifier) =>
-      modifier.kind === ts.SyntaxKind.ExportKeyword) !== true;
-  };
-  const configurationAddresses = new Map<ts.Symbol, ConfigurationAddress>();
-  for (const symbol of reachableSymbols.keys()) {
-    configurationAddresses.set(symbol, { root: symbol, path: [] });
-  }
-  const addressForExpression = (expression: ts.Expression): ConfigurationAddress | null => {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isIdentifier(value)) {
-      const symbol = symbolAt(value);
-      return symbol === undefined ? null : configurationAddresses.get(symbol) ?? null;
-    }
-    if (!ts.isPropertyAccessExpression(value) && !ts.isElementAccessExpression(value)) return null;
-    const receiver = addressForExpression(value.expression);
-    const key = propertyKey(value);
-    return receiver === null || key === null
-      ? null
-      : { root: receiver.root, path: [...receiver.path, key] };
-  };
-  const baseSymbolForExpression = (expression: ts.Expression): ts.Symbol | null => {
-    const value = unwrapTransparentExpression(expression);
-    if (ts.isIdentifier(value)) return symbolAt(value) ?? null;
-    return ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)
-      ? baseSymbolForExpression(value.expression)
-      : null;
-  };
-  let aliasesChanged = true;
-  while (aliasesChanged) {
-    aliasesChanged = false;
-    const collectConstAliases = (node: ts.Node): void => {
-      if (ts.isVariableDeclaration(node) && node.initializer !== undefined &&
-        isNonExportedPlainConst(node)) {
-        const address = addressForExpression(node.initializer);
-        const symbol = ts.isIdentifier(node.name) ? symbolAt(node.name) : undefined;
-        if (address !== null && symbol !== undefined && !configurationAddresses.has(symbol)) {
-          configurationAddresses.set(symbol, address);
-          aliasesChanged = true;
-        }
-      }
-      ts.forEachChild(node, collectConstAliases);
-    };
-    collectConstAliases(sourceFile);
-  }
-  let placementsChanged = true;
-  while (placementsChanged) {
-    placementsChanged = false;
-    const propagateConstPlacements = (node: ts.Node): void => {
-      if (ts.isVariableDeclaration(node) && node.initializer !== undefined &&
-        isNonExportedPlainConst(node) && ts.isIdentifier(node.name)) {
-        const targetSymbol = symbolAt(node.name);
-        const targetAddress = targetSymbol === undefined
-          ? undefined
-          : configurationAddresses.get(targetSymbol);
-        const sourceSymbol = baseSymbolForExpression(node.initializer);
-        const sourceAddress = sourceSymbol === null
-          ? undefined
-          : configurationAddresses.get(sourceSymbol);
-        if (targetSymbol !== undefined && targetAddress !== undefined &&
-          sourceSymbol !== null && sourceAddress !== undefined &&
-          targetAddress.root === sourceAddress.root &&
-          targetAddress.path.length >= sourceAddress.path.length &&
-          sourceAddress.path.every((key, index) => key === targetAddress.path[index])) {
-          const relativePath = targetAddress.path.slice(sourceAddress.path.length);
-          for (const placement of placementPrefixes.get(sourceSymbol) ?? []) {
-            placementsChanged = recordPlacement(
-              targetSymbol,
-              [...placement, ...relativePath],
-            ) || placementsChanged;
-          }
-        }
-      }
-      ts.forEachChild(node, propagateConstPlacements);
-    };
-    propagateConstPlacements(sourceFile);
-  }
-  const semanticAddressKey = (key: string): boolean =>
-    key === 'resolve' || key === 'test' || key === 'alias';
-  let capabilitiesChanged = true;
-  while (capabilitiesChanged) {
-    capabilitiesChanged = false;
-    const propagateConstCapabilities = (node: ts.Node): void => {
-      if (ts.isVariableDeclaration(node) && node.initializer !== undefined &&
-        isNonExportedPlainConst(node) && ts.isIdentifier(node.name)) {
-        const targetSymbol = symbolAt(node.name);
-        const targetAddress = targetSymbol === undefined
-          ? undefined
-          : configurationAddresses.get(targetSymbol);
-        const sourceSymbol = baseSymbolForExpression(node.initializer);
-        const sourceAddress = sourceSymbol === null
-          ? undefined
-          : configurationAddresses.get(sourceSymbol);
-        const sameAddress = targetAddress !== undefined && sourceAddress !== undefined &&
-          targetAddress.root === sourceAddress.root &&
-          targetAddress.path.length === sourceAddress.path.length &&
-          targetAddress.path.every((key, index) => key === sourceAddress.path[index]);
-        const capable = targetAddress !== undefined && (
-          targetAddress.path.some(semanticAddressKey) ||
-          (rootConfigurationSymbols.has(targetAddress.root) && targetAddress.path.length === 0) ||
-          (sameAddress && sourceSymbol !== null && aliasCapableSymbols.has(sourceSymbol))
-        );
-        if (capable && targetSymbol !== undefined && !aliasCapableSymbols.has(targetSymbol)) {
-          aliasCapableSymbols.add(targetSymbol);
-          capabilitiesChanged = true;
-        }
-      }
-      ts.forEachChild(node, propagateConstCapabilities);
-    };
-    propagateConstCapabilities(sourceFile);
-  }
-  const rootDeclaration = (address: ConfigurationAddress): ts.VariableDeclaration | null =>
-    reachableSymbols.get(address.root) ?? null;
-  type AddressedValue = ts.Expression | 'known_scalar';
-  interface LiteralRoute {
-    readonly expression: ts.Expression;
-    readonly path: readonly string[];
-  }
-  type LiteralRouteResolution =
-    | { readonly kind: 'found'; readonly route: LiteralRoute }
-    | { readonly kind: 'absent' }
-    | { readonly kind: 'unresolved' };
-  function objectPropertyRoute(
-    object: ts.ObjectLiteralExpression,
-    key: string,
-    seen: Set<string>,
-  ): LiteralRouteResolution {
-    let selected: LiteralRouteResolution = { kind: 'absent' };
-    for (const property of object.properties) {
-      if (ts.isSpreadAssignment(property)) {
-        const spreadAddress = addressForExpression(property.expression);
-        const spreadValue = spreadAddress === null ? null : addressedValue(spreadAddress, seen);
-        if (spreadValue === null || spreadValue === 'known_scalar' ||
-          !ts.isObjectLiteralExpression(unwrapTransparentExpression(spreadValue))) {
-          selected = { kind: 'unresolved' };
-          continue;
-        }
-        const contribution = objectPropertyRoute(
-          unwrapTransparentExpression(spreadValue) as ts.ObjectLiteralExpression,
-          key,
-          seen,
-        );
-        if (contribution.kind === 'found') {
-          selected = { kind: 'found', route: { expression: property.expression, path: [key] } };
-        } else if (contribution.kind === 'unresolved') selected = contribution;
-        continue;
-      }
-      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
-        selected = { kind: 'unresolved' };
-        continue;
-      }
-      const propertyName = propertyNameText(property.name);
-      if (propertyName === null) {
-        selected = { kind: 'unresolved' };
-        continue;
-      }
-      if (propertyName !== key) continue;
-      selected = {
-        kind: 'found',
-        route: {
-          expression: ts.isPropertyAssignment(property) ? property.initializer : property.name,
-          path: [],
-        },
-      };
-    }
-    return selected;
-  }
-  function resolvedArrayLength(
-    array: ts.ArrayLiteralExpression,
-    seen: Set<string>,
-  ): number | null {
-    let length = 0;
-    for (const element of array.elements) {
-      if (ts.isOmittedExpression(element)) {
-        length += 1;
-        continue;
-      }
-      if (!ts.isSpreadElement(element)) {
-        length += 1;
-        continue;
-      }
-      const spreadAddress = addressForExpression(element.expression);
-      const spreadValue = spreadAddress === null ? null : addressedValue(spreadAddress, seen);
-      if (spreadValue === null || spreadValue === 'known_scalar') return null;
-      const literal = unwrapTransparentExpression(spreadValue);
-      if (!ts.isArrayLiteralExpression(literal)) return null;
-      const spreadLength = resolvedArrayLength(literal, seen);
-      if (spreadLength === null) return null;
-      length += spreadLength;
-    }
-    return length;
-  }
-  function arrayElementRoute(
-    array: ts.ArrayLiteralExpression,
-    requestedIndex: number,
-    seen: Set<string>,
-  ): LiteralRouteResolution {
-    let runtimeIndex = 0;
-    for (const element of array.elements) {
-      if (ts.isSpreadElement(element)) {
-        const spreadAddress = addressForExpression(element.expression);
-        const spreadValue = spreadAddress === null ? null : addressedValue(spreadAddress, seen);
-        if (spreadValue === null || spreadValue === 'known_scalar') return { kind: 'unresolved' };
-        const literal = unwrapTransparentExpression(spreadValue);
-        if (!ts.isArrayLiteralExpression(literal)) return { kind: 'unresolved' };
-        const spreadLength = resolvedArrayLength(literal, seen);
-        if (spreadLength === null) return { kind: 'unresolved' };
-        if (requestedIndex < runtimeIndex + spreadLength) {
-          return {
-            kind: 'found',
-            route: {
-              expression: element.expression,
-              path: [String(requestedIndex - runtimeIndex)],
-            },
-          };
-        }
-        runtimeIndex += spreadLength;
-        continue;
-      }
-      if (runtimeIndex === requestedIndex) {
-        return ts.isOmittedExpression(element)
-          ? { kind: 'unresolved' }
-          : { kind: 'found', route: { expression: element, path: [] } };
-      }
-      runtimeIndex += 1;
-    }
-    return { kind: 'absent' };
-  }
-  function resolveExpressionPath(
-    expression: ts.Expression,
-    path: readonly string[],
-    seen: Set<string>,
-  ): AddressedValue | null {
-    const current = unwrapTransparentExpression(expression);
-    const nestedAddress = addressForExpression(current);
-    if (nestedAddress !== null) {
-      return addressedValue({
-        root: nestedAddress.root,
-        path: [...nestedAddress.path, ...path],
-      }, seen);
-    }
-    if (path.length === 0) return current;
-    const [key, ...remaining] = path;
-    if (key === undefined) return null;
-    if (ts.isObjectLiteralExpression(current)) {
-      const resolution = objectPropertyRoute(current, key, seen);
-      return resolution.kind === 'found'
-        ? resolveExpressionPath(resolution.route.expression,
-          [...resolution.route.path, ...remaining], seen)
-        : null;
-    }
-    if (ts.isArrayLiteralExpression(current)) {
-      if (key === 'length' && remaining.length === 0) return 'known_scalar';
-      const index = Number(key);
-      if (!Number.isSafeInteger(index) || index < 0) return null;
-      const resolution = arrayElementRoute(current, index, seen);
-      return resolution.kind === 'found'
-        ? resolveExpressionPath(resolution.route.expression,
-          [...resolution.route.path, ...remaining], seen)
-        : null;
-    }
-    return null;
-  }
-  function addressedValue(
-    address: ConfigurationAddress,
-    seen: Set<string> = new Set(),
-  ): AddressedValue | null {
-    const declaration = rootDeclaration(address);
-    if (declaration?.initializer === undefined) return null;
-    const visitKey = `${declaration.pos}:${address.path.join('\u0000')}`;
-    if (seen.has(visitKey)) return null;
-    const nextSeen = new Set(seen);
-    nextSeen.add(visitKey);
-    return resolveExpressionPath(declaration.initializer, address.path, nextSeen);
-  }
-  const isPrimitiveLiteral = (expression: ts.Expression): boolean =>
-    ts.isLiteralExpression(expression) || expression.kind === ts.SyntaxKind.TrueKeyword ||
-    expression.kind === ts.SyntaxKind.FalseKeyword || expression.kind === ts.SyntaxKind.NullKeyword;
-  const subtreeContainsAliasKey = (
-    expression: ts.Expression,
-    seen: Set<ts.Node> = new Set(),
-  ): boolean => {
-    const value = unwrapTransparentExpression(expression);
-    if (seen.has(value)) return true;
-    seen.add(value);
-    if (ts.isObjectLiteralExpression(value)) {
-      for (const property of value.properties) {
-        if (ts.isSpreadAssignment(property)) {
-          const address = addressForExpression(property.expression);
-          const spreadValue = address === null ? null : addressedValue(address);
-          if (spreadValue === null || spreadValue === 'known_scalar' ||
-            subtreeContainsAliasKey(spreadValue, seen)) return true;
-          continue;
-        }
-        if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
-          return true;
-        }
-        const key = propertyNameText(property.name);
-        if (key === null || key === 'resolve' || key === 'test' || key === 'alias') return true;
-        const child = ts.isPropertyAssignment(property) ? property.initializer : property.name;
-        const unwrappedChild = unwrapTransparentExpression(child);
-        if ((ts.isObjectLiteralExpression(unwrappedChild) ||
-          ts.isArrayLiteralExpression(unwrappedChild)) && subtreeContainsAliasKey(child, seen)) {
-          return true;
-        }
-      }
-      return false;
-    }
-    if (ts.isArrayLiteralExpression(value)) {
-      return value.elements.some((element) => !ts.isOmittedExpression(element) &&
-        !ts.isSpreadElement(element) &&
-        (ts.isObjectLiteralExpression(unwrapTransparentExpression(element)) ||
-          ts.isArrayLiteralExpression(unwrapTransparentExpression(element))) &&
-        subtreeContainsAliasKey(element, seen));
-    }
-    return !isPrimitiveLiteral(value);
-  };
-  const samePath = (left: readonly string[], right: readonly string[]): boolean =>
-    left.length === right.length && left.every((key, index) => key === right[index]);
-  const uniquePaths = (paths: readonly (readonly string[])[]): readonly (readonly string[])[] => {
-    const unique: string[][] = [];
-    for (const path of paths) {
-      if (!unique.some((candidate) => samePath(candidate, path))) unique.push([...path]);
-    }
-    return unique;
-  };
-  const effectivePathsForExpression = (
-    expression: ts.Expression,
-    suffix: readonly string[],
-  ): readonly (readonly string[])[] => {
-    const symbol = baseSymbolForExpression(expression);
-    if (symbol === null) return [];
-    const base = configurationAddresses.get(symbol);
-    const expressionAddress = addressForExpression(expression);
-    if (base === undefined || expressionAddress === null || base.root !== expressionAddress.root ||
-      expressionAddress.path.length < base.path.length ||
-      !base.path.every((key, index) => key === expressionAddress.path[index])) return [];
-    const relativePath = expressionAddress.path.slice(base.path.length);
-    const placements = placementPrefixes.get(symbol) ?? [base.path];
-    return placements.map((placement) => [...placement, ...relativePath, ...suffix]);
-  };
-  const embeddedEffectivePaths = (
-    address: ConfigurationAddress,
-    seen: Set<string> = new Set(),
-  ): readonly (readonly string[])[] => {
-    const declaration = rootDeclaration(address);
-    if (declaration?.initializer === undefined) return [];
-    const visitKey = `${declaration.pos}:${address.path.join('\u0000')}`;
-    if (seen.has(visitKey)) return [];
-    const nextSeen = new Set(seen);
-    nextSeen.add(visitKey);
-    const collect = (
-      expression: ts.Expression,
-      remaining: readonly string[],
-    ): readonly (readonly string[])[] => {
-      const current = unwrapTransparentExpression(expression);
-      const nestedAddress = addressForExpression(current);
-      if (nestedAddress !== null) {
-        const direct = effectivePathsForExpression(current, remaining);
-        const nested = embeddedEffectivePaths({
-          root: nestedAddress.root,
-          path: [...nestedAddress.path, ...remaining],
-        }, nextSeen);
-        return uniquePaths([...direct, ...nested]);
-      }
-      if (remaining.length === 0) return [];
-      const [key, ...rest] = remaining;
-      if (key === undefined) return [];
-      if (ts.isObjectLiteralExpression(current)) {
-        const resolution = objectPropertyRoute(current, key, new Set());
-        return resolution.kind === 'found'
-          ? collect(resolution.route.expression, [...resolution.route.path, ...rest])
-          : [];
-      }
-      if (ts.isArrayLiteralExpression(current)) {
-        const index = Number(key);
-        if (!Number.isSafeInteger(index) || index < 0) return [];
-        const resolution = arrayElementRoute(current, index, new Set());
-        return resolution.kind === 'found'
-          ? collect(resolution.route.expression, [...resolution.route.path, ...rest])
-          : [];
-      }
-      return [];
-    };
-    return collect(declaration.initializer, address.path);
-  };
-  const addressForReference = (
-    identifier: ts.Identifier,
-    chain: ReturnType<typeof referenceChain>,
-  ): ConfigurationReferenceAddress | null => {
-    const symbol = symbolAt(identifier);
-    if (symbol === undefined || !chain.constantElements) return null;
-    const base = configurationAddresses.get(symbol);
-    if (base === undefined) return null;
-    const placements = placementPrefixes.get(symbol);
-    const localAddress = { root: base.root, path: [...base.path, ...chain.path] };
-    return {
-      ...localAddress,
-      binding: symbol,
-      relativePath: chain.path,
-      effectivePaths: uniquePaths([...(placements === undefined || placements.length === 0
-        ? [base.path]
-        : placements).map((placement) => [...placement, ...chain.path]),
-      ...embeddedEffectivePaths(localAddress)]),
-    };
-  };
-  const isAliasBearing = (address: ConfigurationReferenceAddress): boolean => {
-    if ((address.relativePath.length === 0 && aliasCapableSymbols.has(address.binding)) ||
-      (rootConfigurationSymbols.has(address.root) && address.path.length === 0) ||
-      address.path.some(semanticAddressKey) || address.effectivePaths.some((path) =>
-        path.length === 0 || path.some(semanticAddressKey))) return true;
-    const value = addressedValue(address);
-    return value === null || value !== 'known_scalar' && subtreeContainsAliasKey(value);
-  };
-  const isExactConstAliasInitializer = (expression: ts.Expression): boolean => {
-    const parent = expression.parent;
-    return ts.isVariableDeclaration(parent) && parent.initializer === expression &&
-      isNonExportedPlainConst(parent);
-  };
-  const isStrictEqualityOperator = (kind: ts.SyntaxKind): boolean => [
-    ts.SyntaxKind.EqualsEqualsEqualsToken,
-    ts.SyntaxKind.ExclamationEqualsEqualsToken,
-  ].includes(kind);
-  const configurationReferenceEscapes = (identifier: ts.Identifier): boolean => {
-    const chain = referenceChain(identifier);
-    const address = addressForReference(identifier, chain);
-    if (address === null || addressedValue(address) === null ||
-      isMutationTarget(chain.expression)) return true;
-    const parent = chain.expression.parent;
-    if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
-      parent.expression === chain.expression) return true;
-    if (reachableNodes.has(identifier) || isExactConstAliasInitializer(chain.expression)) return false;
-    if ((ts.isTypeOfExpression(parent) || ts.isVoidExpression(parent)) &&
-      parent.expression === chain.expression) return false;
-    if (ts.isPrefixUnaryExpression(parent) &&
-      parent.operator === ts.SyntaxKind.ExclamationToken && parent.operand === chain.expression) return false;
-    if (ts.isBinaryExpression(parent) && isStrictEqualityOperator(parent.operatorToken.kind)) return false;
-    if ((ts.isIfStatement(parent) || ts.isWhileStatement(parent) || ts.isDoStatement(parent)) &&
-      parent.expression === chain.expression) return false;
-    if (ts.isConditionalExpression(parent) && parent.condition === chain.expression) return false;
-    return isAliasBearing(address);
-  };
-  const verifyReachability = (node: ts.Node): void => {
-    if (ts.isIdentifier(node)) {
-      const symbol = symbolAt(node);
-      const address = symbol === undefined ? undefined : configurationAddresses.get(symbol);
-      const declaration = address === undefined ? undefined : rootDeclaration(address);
-      const trackedDeclarationName = symbol?.declarations?.some((candidate) =>
-        ts.isVariableDeclaration(candidate) && candidate.name === node &&
-        isNonExportedPlainConst(candidate)) === true;
-      if (declaration !== null && declaration !== undefined && !trackedDeclarationName &&
-        configurationReferenceEscapes(node)) {
-        unresolved = true;
-      }
-    }
-    if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node) ||
-      ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) ||
-      ts.isSetAccessorDeclaration(node)) && ts.isObjectLiteralExpression(node.parent) &&
-      ['alias', 'resolve', 'test'].includes(propertyNameText(node.name) ?? '') &&
-      !reachableNodes.has(node)) unresolved = true;
-    ts.forEachChild(node, verifyReachability);
-  };
-  verifyReachability(sourceFile);
-  return {
-    aliases: [...aliases],
-    regexes: [...regexes.values()],
-    unresolved,
-    nestedPaths: [...nestedPaths],
-  };
-}
-
-function candidateInspectionContext(base: string, candidate: string): HeldoutLeakInspectionContext {
-  const tree = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', candidate], {
-    encoding: 'utf8',
-    maxBuffer: 64 * 1024 * 1024,
-  }).split('\0').filter((path) => path.length > 0);
-  const packageJsonFiles: Record<string, string> = {};
-  const configSources: Record<string, string> = {};
-  for (const path of tree.filter((candidatePath) =>
-    isResolutionConfigPath(candidatePath))) {
-    const source = execFileSync('git', ['show', `${candidate}:${path}`], {
-      encoding: 'utf8',
-      maxBuffer: 64 * 1024 * 1024,
-    });
-    configSources[path] = source;
-    if (posix.basename(path) === 'package.json') packageJsonFiles[path] = source;
-  }
-  const changedPaths = parseGitNameStatusZ(execFileSync(
-    'git', ['diff', '--name-status', '-z', base, candidate],
-    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
-  ));
-  const resolutionConfigChanged = changedPaths.some((change) =>
-    isResolutionConfigPath(change.path) ||
-    (change.previousPath !== undefined && isResolutionConfigPath(change.previousPath)));
-  const candidateSourceFiles: Record<string, string> = {};
-  const candidateConfigurationFiles: Record<string, string> = {};
-  if (resolutionConfigChanged) {
-    for (const path of tree.filter(isTypeScriptOrJavaScript)) {
-      const source = execFileSync('git', ['show', `${candidate}:${path}`], {
-        encoding: 'utf8',
-        maxBuffer: 64 * 1024 * 1024,
-      });
-      candidateConfigurationFiles[path] = source;
-      if (path.startsWith('src/') || path.startsWith('tools/') || path.startsWith('tests/')) {
-        candidateSourceFiles[path] = source;
-      }
-    }
-  }
-  const viteDiscoveries = Object.entries(configSources).flatMap(([path, source]) =>
-    isRootViteOrVitestConfig(path)
-      ? [{ path, discovery: viteAliases(source, path, {
-        ...candidateConfigurationFiles,
-        ...candidateSourceFiles,
-        ...configSources,
-      }) }]
-      : []);
-  const configuredAliasPrefixes = [...new Set([
-    ...Object.entries(configSources).flatMap(([path, source]) =>
-      isRootViteOrVitestConfig(path) ? [] : jsonAliases(source, path)),
-    ...viteDiscoveries.flatMap(({ discovery }) => discovery.aliases),
-  ])].filter((alias) => alias.length > 0);
-  const configuredAliasRegexes = viteDiscoveries.flatMap(({ discovery }) => discovery.regexes);
-  return {
-    candidateFiles: tree,
-    packageJsonFiles,
-    candidateSourceFiles,
-    candidateConfigurationFiles,
-    resolutionConfigChanged,
-    configuredAliasPrefixes,
-    configuredAliasRegexes,
-    unresolvedResolutionConfigPaths: viteDiscoveries
-      .filter(({ discovery }) => discovery.unresolved)
-      .map(({ path }) => path),
-  };
-}
-
 function parseArgs(argv: readonly string[]): {
   readonly base: string;
   readonly candidate: string;
@@ -3219,19 +1702,59 @@
   };
 }
 
-function main(argv: readonly string[]): void {
+async function main(argv: readonly string[]): Promise<void> {
   const config = parseArgs(argv);
-  const report = inspectHeldoutLeakChanges(
+  const staticReport = inspectHeldoutLeakChanges(
     addedChanges(config.base, config.candidate),
     config.slice,
     config.bindings,
-    candidateInspectionContext(config.base, config.candidate),
   );
-  process.stdout.write(`${canonicalJson(report)}\n`);
-  if (report.findings.length > 0) process.exitCode = 1;
+  const scratchRoot = mkdtempSync(`${tmpdir()}/heldout-runtime-candidate-`);
+  const candidateRoot = posix.join(scratchRoot, 'candidate');
+  mkdirSync(candidateRoot);
+  mkdirSync(posix.join(candidateRoot, 'node_modules'));
+  try {
+    const archive = execFileSync('git', ['archive', '--format=tar', config.candidate], {
+      maxBuffer: 256 * 1024 * 1024,
+    });
+    const extraction = spawnSync('tar', ['-xf', '-', '-C', candidateRoot], {
+      input: archive,
+      encoding: 'utf8',
+      maxBuffer: 64 * 1024 * 1024,
+    });
+    if (extraction.status !== 0) {
+      throw new TypeError(`Candidate archive extraction failed: ${extraction.stderr}`);
+    }
+    const runtimeReport = await runHeldoutRuntimeGuard({
+      root: candidateRoot,
+      slice: config.slice,
+      bindings: config.bindings,
+    });
+    const report: HeldoutLeakReport = {
+      ...staticReport,
+      preflight: runtimeReport.preflight,
+      configurationLoad: runtimeReport.configurationLoad,
+      resolution: runtimeReport.resolution,
+      seedAssignments: runtimeReport.seedAssignments,
+      findings: [...staticReport.findings, ...runtimeReport.findings],
+    };
+    process.stdout.write(`${canonicalJson(report)}\n`);
+    if (report.findings.length > 0) process.exitCode = 1;
+  } finally {
+    rmSync(scratchRoot, { recursive: true, force: true });
+  }
 }
 
 const scriptIndex = process.argv.findIndex((argument) =>
   argument.endsWith('/heldout-leak-check.ts') || argument.endsWith('\\heldout-leak-check.ts'));
-if (scriptIndex >= 0) main(process.argv.slice(scriptIndex + 1));
-else if (process.argv.includes('--base') && process.argv.includes('--candidate')) main(process.argv.slice(2));
+const mainArguments = scriptIndex >= 0
+  ? process.argv.slice(scriptIndex + 1)
+  : process.argv.includes('--base') && process.argv.includes('--candidate')
+    ? process.argv.slice(2)
+    : null;
+if (mainArguments !== null) {
+  void main(mainArguments).catch((error: unknown) => {
+    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
+    process.exitCode = 1;
+  });
+}
diff --git a/tools/heldout-runtime-guard-worker.mjs b/tools/heldout-runtime-guard-worker.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..bc51040e5e3d03a1278d3b196a6084a639fb5321
--- /dev/null
+++ b/tools/heldout-runtime-guard-worker.mjs
@@ -0,0 +1,664 @@
+import { builtinModules, createRequire } from 'node:module';
+import { createHash } from 'node:crypto';
+import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeSync } from 'node:fs';
+import { dirname, extname, posix, resolve, sep } from 'node:path';
+import { pathToFileURL, fileURLToPath } from 'node:url';
+
+const PROTOCOL = 'heldout-runtime-v1';
+const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
+const EVALUATION_FILES = new Set([
+  'src/vtt/heldout-evaluation.ts',
+  'src/vtt/room-generator.ts',
+  'tools/generate-heldout-party-basis.ts',
+  'tools/generate-arena-basis.ts',
+  'tools/ai-dm-arena.ts',
+  'tools/ai-dm-heldout-report.ts',
+  'tools/ai-dm-heldout-judge-prompt.ts',
+  'tools/heldout-leak-check.ts',
+  'tools/heldout-runtime-guard.ts',
+  'tools/heldout-runtime-guard-worker.mjs',
+  'tools/ai-dm-rerun-packet.ts',
+]);
+const BUILTINS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
+const workRequire = createRequire('/work/package.json');
+
+function readInput(limit) {
+  return new Promise((resolveInput, rejectInput) => {
+    let text = '';
+    process.stdin.setEncoding('utf8');
+    process.stdin.on('data', (chunk) => {
+      text += chunk;
+      if (text.length > limit) rejectInput(new TypeError('request_too_large'));
+    });
+    process.stdin.on('end', () => resolveInput(text));
+    process.stdin.on('error', rejectInput);
+  });
+}
+
+function stringProperty(value, key) {
+  if (value === null || typeof value !== 'object') return null;
+  const member = Reflect.get(value, key);
+  return typeof member === 'string' ? member : null;
+}
+
+function stringArray(value, key) {
+  if (value === null || typeof value !== 'object') return null;
+  const member = Reflect.get(value, key);
+  return Array.isArray(member) && member.every((item) => typeof item === 'string') ? member : null;
+}
+
+function parseRequest(text) {
+  const value = JSON.parse(text);
+  if (stringProperty(value, 'protocol') !== PROTOCOL) throw new TypeError('invalid_protocol');
+  const slice = stringProperty(value, 'slice');
+  const phaseTimeoutMs = value !== null && typeof value === 'object'
+    ? Reflect.get(value, 'phaseTimeoutMs')
+    : null;
+  const bindings = value !== null && typeof value === 'object' ? Reflect.get(value, 'bindings') : null;
+  const trustedLockDigest = stringProperty(value, 'trustedLockDigest');
+  const reserveDigests = stringArray(bindings, 'reserveDigests');
+  const resultPaths = stringArray(bindings, 'resultPaths');
+  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(slice) ||
+    typeof phaseTimeoutMs !== 'number' || !Number.isSafeInteger(phaseTimeoutMs) ||
+    phaseTimeoutMs < 1 || phaseTimeoutMs > 30_000 || reserveDigests === null || resultPaths === null ||
+    trustedLockDigest === null || !/^[a-f0-9]{64}$/u.test(trustedLockDigest)) {
+    throw new TypeError('invalid_request');
+  }
+  return { slice, phaseTimeoutMs, trustedLockDigest, bindings: { reserveDigests, resultPaths } };
+}
+
+function withTimeout(promise, milliseconds, label) {
+  let timer;
+  const timeout = new Promise((_, rejectTimeout) => {
+    timer = setTimeout(() => rejectTimeout(new TypeError(`phase_timeout:${label}`)), milliseconds);
+    timer.unref();
+  });
+  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
+}
+
+function walk(directory, prefix = '') {
+  const files = [];
+  for (const entry of readdirSync(directory, { withFileTypes: true })) {
+    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
+    const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
+    const absolute = resolve(directory, entry.name);
+    if (entry.isDirectory()) files.push(...walk(absolute, relative));
+    else files.push(relative);
+  }
+  return files;
+}
+
+function sourceSeeds() {
+  return walk('/work').filter((path) =>
+    (path.startsWith('src/') || path.startsWith('tools/')) &&
+    SOURCE_EXTENSIONS.has(extname(path)) && !/\.d\.(?:ts|mts|cts)$/u.test(path) &&
+    !EVALUATION_FILES.has(path)).sort();
+}
+
+function rootConfigs() {
+  return readdirSync('/work', { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name)
+    .filter((name) => /^(?:vite|vitest)(?:\.[^.]+)*\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(name))
+    .sort();
+}
+
+function scriptKind(ts, path) {
+  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
+  if (path.endsWith('.jsx') || path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
+    return ts.ScriptKind.JS;
+  }
+  return ts.ScriptKind.TS;
+}
+
+function constantString(ts, expression) {
+  if (expression === undefined) return null;
+  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
+  return null;
+}
+
+function runtimeEdges(ts, path, source) {
+  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(ts, path));
+  const edges = [];
+  const add = (specifier, sourceKind = 'graph') => {
+    if (specifier !== null) edges.push({ specifier, source: sourceKind });
+  };
+  const addRuntimeUrl = (specifier) => {
+    if (specifier === null) return;
+    const target = resolve(dirname(withoutQuery(path)), withoutQuery(specifier));
+    try {
+      if (statSync(target).isDirectory()) return;
+    } catch {
+      // Missing URL-backed files must reach resolution and fail closed.
+    }
+    add(specifier);
+  };
+  const visit = (node) => {
+    if (ts.isImportDeclaration(node)) {
+      const clause = node.importClause;
+      const valueBinding = clause === undefined || (!clause.isTypeOnly && (
+        clause.name !== undefined || clause.namedBindings === undefined ||
+        ts.isNamespaceImport(clause.namedBindings) ||
+        clause.namedBindings.elements.some((element) => !element.isTypeOnly)
+      ));
+      if (valueBinding) add(constantString(ts, node.moduleSpecifier));
+    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly) {
+      const valueExport = node.exportClause === undefined || ts.isNamespaceExport(node.exportClause) ||
+        node.exportClause.elements.some((element) => !element.isTypeOnly);
+      if (valueExport) add(constantString(ts, node.moduleSpecifier));
+    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
+      ts.isExternalModuleReference(node.moduleReference)) {
+      add(constantString(ts, node.moduleReference.expression));
+    } else if (ts.isCallExpression(node)) {
+      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(constantString(ts, node.arguments[0]));
+      else if (ts.isIdentifier(node.expression) && node.expression.text === 'importScripts') {
+        for (const argument of node.arguments) add(constantString(ts, argument));
+      }
+    } else if (ts.isNewExpression(node) &&
+      ts.isIdentifier(node.expression) && node.expression.text === 'URL' &&
+      node.arguments?.[1] !== undefined && ts.isPropertyAccessExpression(node.arguments[1]) &&
+      ts.isMetaProperty(node.arguments[1].expression) &&
+      node.arguments[1].expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
+      node.arguments[1].expression.name.text === 'meta' && node.arguments[1].name.text === 'url') {
+      addRuntimeUrl(constantString(ts, node.arguments[0]));
+    } else if (ts.isNewExpression(node) &&
+      ts.isIdentifier(node.expression) && ['Worker', 'SharedWorker'].includes(node.expression.text)) {
+      const first = node.arguments?.[0];
+      if (first !== undefined && ts.isNewExpression(first) && ts.isIdentifier(first.expression) &&
+        first.expression.text === 'URL') add(constantString(ts, first.arguments?.[0]));
+      else add(constantString(ts, first));
+    }
+    ts.forEachChild(node, visit);
+  };
+  visit(sourceFile);
+  return edges;
+}
+
+function unboundedRootGlobPatterns(ts, path, source) {
+  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(ts, path));
+  const patterns = [];
+  const visit = (node) => {
+    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
+      node.expression.name.text === 'glob' && ts.isMetaProperty(node.expression.expression) &&
+      node.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
+      node.expression.expression.name.text === 'meta') {
+      const argument = node.arguments[0];
+      const values = argument !== undefined && ts.isArrayLiteralExpression(argument)
+        ? argument.elements.map((element) => constantString(ts, element))
+        : [constantString(ts, argument)];
+      for (const value of values) {
+        const positive = value?.startsWith('!') === true ? value.slice(1) : value;
+        if (positive?.startsWith('**') === true) patterns.push(value ?? positive);
+      }
+    }
+    ts.forEachChild(node, visit);
+  };
+  visit(sourceFile);
+  return patterns;
+}
+
+function withoutQuery(id) {
+  const query = id.indexOf('?');
+  const fragment = id.indexOf('#');
+  const indexes = [query, fragment].filter((index) => index >= 0);
+  return indexes.length === 0 ? id : id.slice(0, Math.min(...indexes));
+}
+
+function canonicalId(id) {
+  if (id === null) return null;
+  let value = id;
+  if (value.startsWith('file:')) {
+    try {
+      const url = new URL(value);
+      value = `${fileURLToPath(url)}${url.search}${url.hash}`;
+    } catch {
+      return value;
+    }
+  }
+  return value.replaceAll('/work/', '<candidate>/').replace(/^\/work$/u, '<candidate>');
+}
+
+function digestMatches(path, reserveDigests) {
+  if (!existsSync(path)) return false;
+  try {
+    const bytes = readFileSync(path);
+    const hash = createHash('sha256').update(bytes).digest('hex');
+    return reserveDigests.includes(hash) || reserveDigests.some((digest) => bytes.includes(Buffer.from(digest)));
+  } catch {
+    return false;
+  }
+}
+
+function textContainsReserveDigest(text, reserveDigests) {
+  const normalized = text.toLowerCase();
+  return reserveDigests.some((digest) => normalized.includes(digest.toLowerCase()));
+}
+
+function protectedIdentity(id, bindings) {
+  const canonical = withoutQuery(id);
+  let path = canonical;
+  if (path.startsWith('file:')) {
+    try {
+      path = fileURLToPath(path);
+    } catch {
+      return true;
+    }
+  }
+  const normalized = path.split(sep).join('/');
+  if (normalized === '/work/src/vtt/heldout-evaluation.ts' ||
+    normalized.endsWith('/src/vtt/heldout-evaluation.ts') ||
+    bindings.resultPaths.some((resultPath) => normalized.startsWith(resultPath))) return true;
+  return normalized.startsWith('/work/') && digestMatches(normalized, bindings.reserveDigests);
+}
+
+function barePackageName(specifier) {
+  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
+  return specifier.split('/', 1)[0] ?? '';
+}
+
+function hasPackageProvenance(path, nodeModulesRoot) {
+  let current = path;
+  while (current.startsWith(`${nodeModulesRoot}${sep}`)) {
+    if (existsSync(resolve(current, 'package.json'))) return true;
+    const parent = resolve(current, '..');
+    if (parent === current) break;
+    current = parent;
+  }
+  return false;
+}
+
+function builtinSpecifier(specifier) {
+  const browserExternalPrefix = '/@id/__vite-browser-external:';
+  return BUILTINS.has(specifier) ||
+    specifier.startsWith(browserExternalPrefix) && BUILTINS.has(specifier.slice(browserExternalPrefix.length));
+}
+
+function externalDependency(specifier, id, external) {
+  if (builtinSpecifier(specifier) || builtinSpecifier(id)) return 'external_builtin';
+  let resolved = id;
+  try {
+    if (external === true && !resolved.startsWith('/')) resolved = workRequire.resolve(specifier);
+    resolved = realpathSync(withoutQuery(resolved));
+  } catch {
+    return null;
+  }
+  const nodeModulesRoot = realpathSync('/work/node_modules');
+  if (!resolved.startsWith(`${nodeModulesRoot}${sep}`)) return null;
+  const resolvedDirectory = existsSync(resolved) && !extname(resolved) ? resolved : resolve(resolved, '..');
+  if (!hasPackageProvenance(resolvedDirectory, nodeModulesRoot)) return null;
+  if (specifier.startsWith('/') || specifier.startsWith('file:')) return 'external_dependency';
+  if (specifier.startsWith('.') || specifier.startsWith('#') ||
+    /^[a-z][a-z0-9+.-]*:/iu.test(specifier)) return null;
+  const packageName = barePackageName(specifier);
+  if (packageName.length === 0) return null;
+  try {
+    workRequire.resolve(`${packageName}/package.json`);
+  } catch {
+    const packageRoot = packageName.startsWith('@')
+      ? resolve(nodeModulesRoot, ...packageName.split('/'))
+      : resolve(nodeModulesRoot, packageName);
+    if (!existsSync(resolve(packageRoot, 'package.json'))) return null;
+  }
+  return 'external_dependency';
+}
+
+function conditionsFor(environment) {
+  const conditions = environment?.config?.resolve?.conditions;
+  return Array.isArray(conditions) ? conditions.filter((value) => typeof value === 'string').sort() : [];
+}
+
+function environmentIsServer(name, environment) {
+  return name === 'ssr' || name === '__vitest__' || environment?.config?.consumer === 'server';
+}
+
+function optimizerIsDisabled(server) {
+  const root = server.config.optimizeDeps;
+  if (root?.noDiscovery !== true || !Array.isArray(root.include) || root.include.length !== 0) return false;
+  return Object.values(server.config.environments ?? {}).every((options) => {
+    const optimizeDeps = options?.optimizeDeps;
+    return optimizeDeps === undefined ||
+      (optimizeDeps.noDiscovery === true && Array.isArray(optimizeDeps.include) && optimizeDeps.include.length === 0);
+  });
+}
+
+function optimizerGuardPlugin() {
+  return {
+    name: 'heldout-runtime-disable-optimizer',
+    enforce: 'post',
+    configResolved(config) {
+      // Vite 7.3.6 config.js:31891 and :34890 disable optimization only when
+      // discovery is off and the explicit include list is empty.
+      config.optimizeDeps.noDiscovery = true;
+      config.optimizeDeps.include = [];
+      for (const environment of Object.values(config.environments ?? {})) {
+        environment.optimizeDeps ??= {};
+        environment.optimizeDeps.noDiscovery = true;
+        environment.optimizeDeps.include = [];
+      }
+    },
+  };
+}
+
+function errorClass(error) {
+  if (error instanceof Error) return error.name;
+  return 'UnknownError';
+}
+
+function reportPath(path) {
+  return canonicalId(path) ?? path;
+}
+
+async function main() {
+  const request = parseRequest(await readInput(1024 * 1024));
+  const candidateLockDigest = createHash('sha256').update(readFileSync('/work/package-lock.json')).digest('hex');
+  if (candidateLockDigest !== request.trustedLockDigest) throw new TypeError('candidate_lock_changed_in_sandbox');
+  const viteEntry = workRequire.resolve('vite');
+  const vitestEntry = workRequire.resolve('vitest/node');
+  const typescriptEntry = workRequire.resolve('typescript');
+  const [{ createServer }, { createVitest }, tsModule] = await Promise.all([
+    import(pathToFileURL(viteEntry).href),
+    import(pathToFileURL(vitestEntry).href),
+    import(pathToFileURL(typescriptEntry).href),
+  ]);
+  const ts = tsModule.default;
+  const runtimeRoot = '/opt/node';
+  const runtimeVersion = process.version;
+  const configurationLoad = [];
+  const resolution = [];
+  const seedAssignments = [];
+  const findings = [];
+  const seeds = sourceSeeds();
+  const configs = rootConfigs();
+
+  const recordLoad = (file, kind, project, environment, status, error) => {
+    configurationLoad.push({
+      file,
+      kind,
+      project,
+      environment,
+      status,
+      errorClass: error,
+      runtimeRoot,
+      runtimeVersion,
+    });
+  };
+
+  recordLoad('<preflight>', 'preflight', null, 'isolation', 'loaded', null);
+
+  const addResolution = (row) => {
+    resolution.push(row);
+    if (row.status === 'protected' && row.source !== 'protected_control') {
+      findings.push({
+        path: row.importer ?? row.configuration,
+        kind: 'runtime_protocol_resolution',
+        detail: `${row.specifier} resolved to ${row.resolvedId ?? '<unresolved>'} in ${row.environment}`,
+      });
+    } else if (row.status === 'unresolved' && row.source !== 'protected_control') {
+      findings.push({
+        path: row.importer ?? row.configuration,
+        kind: 'unresolved_module_edge',
+        detail: `${row.specifier} was unresolved in ${row.environment}`,
+      });
+    }
+  };
+
+  const inspectEnvironment = async (configuration, project, name, environment, aliasEntries, includeSeeds) => {
+    const serverStyle = environmentIsServer(name, environment);
+    const environmentRoot = typeof environment.config.root === 'string' ? environment.config.root : '/work';
+    const assigned = includeSeeds
+      ? seeds.filter((seed) => seed.startsWith('src/') || serverStyle)
+      : [];
+    const conditions = conditionsFor(environment);
+    for (const seed of assigned) {
+      seedAssignments.push({ seed, configuration, project, environment: name });
+    }
+    const visited = new Set();
+    const queue = assigned.map((seed) => ({
+      id: `/work/${seed}`,
+      seed,
+      source: 'graph',
+    }));
+    const importerForAliases = assigned[0] === undefined ? '/work/src/main.ts' : `/work/${assigned[0]}`;
+    for (const alias of aliasEntries) {
+      if (typeof alias.find !== 'string') continue;
+      queue.push({ id: importerForAliases, seed: '<alias-key>', source: 'alias_key', specifier: alias.find });
+    }
+    queue.push({
+      id: importerForAliases,
+      seed: '<protected-control>',
+      source: 'protected_control',
+      specifier: '/src/vtt/heldout-evaluation.ts',
+    });
+    while (queue.length > 0) {
+      const batch = queue.splice(0, queue.length);
+      await Promise.all(batch.map(async (current) => {
+      if (current.specifier !== undefined) {
+        let resolvedResult;
+        try {
+          resolvedResult = await environment.pluginContainer.resolveId(current.specifier, current.id);
+        } catch {
+          resolvedResult = null;
+        }
+        const resolvedId = resolvedResult?.id ?? null;
+        let status;
+        if (resolvedId !== null && protectedIdentity(resolvedId, request.bindings)) {
+          status = current.source === 'protected_control' ? 'control' : 'protected';
+        } else if (resolvedId === null) {
+          status = builtinSpecifier(current.specifier) ? 'external_builtin' : 'unresolved';
+        } else {
+          const boundary = externalDependency(current.specifier, resolvedId, resolvedResult?.external === true);
+          status = boundary ?? 'clean';
+          if (resolvedResult?.external === true && boundary === null) status = 'unresolved';
+        }
+        addResolution({
+          configuration,
+          project,
+          environment: name,
+          phase: 'resolve',
+          conditions,
+          seed: current.seed,
+          specifier: current.specifier,
+          importer: canonicalId(current.id),
+          resolvedId: canonicalId(resolvedId),
+          source: current.source,
+          status,
+        });
+        if (status === 'unresolved' || status === 'protected' || status === 'control' ||
+          status === 'external_builtin' || status === 'external_dependency' || resolvedId === null) return;
+        const local = withoutQuery(resolvedId);
+        if (local.startsWith('/work/') || resolvedId.startsWith('\0')) {
+          queue.push({ id: resolvedId, seed: current.seed, source: current.source });
+        }
+        return;
+      }
+      const visitKey = `${name}\0${current.id}`;
+      if (visited.has(visitKey)) return;
+      visited.add(visitKey);
+      const localPath = withoutQuery(current.id);
+      let sourceText = null;
+      if (localPath.startsWith('/work/') && existsSync(localPath)) {
+        sourceText = readFileSync(localPath, 'utf8');
+      }
+      if (sourceText !== null) {
+        for (const edge of runtimeEdges(ts, localPath, sourceText)) {
+          queue.push({ id: current.id, seed: current.seed, source: edge.source, specifier: edge.specifier });
+        }
+        const unboundedGlobs = unboundedRootGlobPatterns(ts, localPath, sourceText);
+        if (unboundedGlobs.length > 0) {
+          for (const pattern of unboundedGlobs) {
+            addResolution({
+              configuration,
+              project,
+              environment: name,
+              phase: 'transform',
+              conditions,
+              seed: current.seed,
+              specifier: pattern,
+              importer: canonicalId(current.id),
+              resolvedId: null,
+              source: 'transformed',
+              status: 'unresolved',
+            });
+          }
+          return;
+        }
+      }
+      let transformed = null;
+      try {
+        const suffix = current.id.slice(localPath.length);
+        const url = localPath.startsWith(`${environmentRoot}/`)
+          ? `/${posix.relative(environmentRoot, localPath)}${suffix}`
+          : localPath.startsWith('/work/')
+            ? `/@fs/${localPath}${suffix}`
+            : current.id;
+        transformed = await environment.transformRequest(url);
+      } catch {
+        transformed = null;
+      }
+      if (transformed === null) {
+        addResolution({
+          configuration,
+          project,
+          environment: name,
+          phase: 'transform',
+          conditions,
+          seed: current.seed,
+          specifier: canonicalId(current.id) ?? current.id,
+          importer: canonicalId(current.id),
+          resolvedId: null,
+          source: current.source === 'graph' ? 'transformed' : current.source,
+          status: 'unresolved',
+        });
+        return;
+      }
+      addResolution({
+        configuration,
+        project,
+        environment: name,
+        phase: 'transform',
+        conditions,
+        seed: current.seed,
+        specifier: canonicalId(current.id) ?? current.id,
+        importer: canonicalId(current.id),
+        resolvedId: canonicalId(current.id),
+        source: current.source === 'graph' ? 'transformed' : current.source,
+        status: protectedIdentity(current.id, request.bindings) ||
+          textContainsReserveDigest(transformed.code, request.bindings.reserveDigests)
+          ? 'protected'
+          : 'clean',
+      });
+      for (const edge of runtimeEdges(ts, current.id, transformed.code)) {
+        queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: edge.specifier });
+      }
+      for (const dependency of [...(transformed.deps ?? []), ...(transformed.dynamicDeps ?? [])]) {
+        if (typeof dependency === 'string') {
+          queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: dependency });
+        }
+      }
+      }));
+    }
+  };
+
+  const inspectServer = async (configuration, kind, project, server, includeSeeds = true) => {
+    if (server.httpServer !== null) throw new TypeError('guard_server_listening');
+    if (!optimizerIsDisabled(server)) throw new TypeError('optimizer_not_disabled');
+    const aliases = Array.isArray(server.config.resolve.alias) ? server.config.resolve.alias : [];
+    for (const [name, environment] of Object.entries(server.environments).sort(([left], [right]) => left.localeCompare(right))) {
+      await inspectEnvironment(configuration, project, name, environment, aliases, includeSeeds);
+      recordLoad(configuration, kind, project, name, 'loaded', null);
+    }
+  };
+
+  for (const config of configs.filter((path) => path.startsWith('vite') && !path.startsWith('vitest'))) {
+    let server;
+    try {
+      server = await withTimeout(createServer({
+        configFile: `/work/${config}`,
+        configLoader: 'runner',
+        appType: 'custom',
+        plugins: [optimizerGuardPlugin()],
+        optimizeDeps: { noDiscovery: true, include: [] },
+        server: { middlewareMode: true, hmr: false, watch: null },
+      }), request.phaseTimeoutMs, `vite:${config}:load`);
+      try {
+        await withTimeout(inspectServer(config, 'vite-serve', null, server),
+          request.phaseTimeoutMs, `vite:${config}:inspect`);
+      } catch (error) {
+        throw new TypeError(`vite_inspect_failed:${error instanceof Error ? error.message : String(error)}`, {
+          cause: error,
+        });
+      }
+    } catch (error) {
+      const timedOut = error instanceof Error && error.message.startsWith('phase_timeout:');
+      recordLoad(config, 'vite-serve', null, '<load>', timedOut ? 'timed_out' : 'failed', errorClass(error));
+      findings.push({ path: config, kind: 'configuration_load_failed', detail: String(error) });
+    } finally {
+      if (server !== undefined) await server.close().catch(() => undefined);
+    }
+  }
+
+  for (const config of configs.filter((path) => path.startsWith('vitest'))) {
+    let vitest;
+    try {
+      // Vitest 4.1.10 cli-api:13125, :13150, :13172, and :14222 initializes
+      // VCS/hooks/reporters/caches and may listen unless API is forced off.
+      vitest = await withTimeout(createVitest('test', {
+        root: '/work',
+        config: `/work/${config}`,
+        configLoader: 'runner',
+        watch: false,
+        run: false,
+        passWithNoTests: true,
+        api: false,
+      }, {
+        plugins: [optimizerGuardPlugin()],
+        server: { watch: null, hmr: false },
+        optimizeDeps: { noDiscovery: true, include: [] },
+      }), request.phaseTimeoutMs, `vitest:${config}:load`);
+      if (vitest.config.api?.port) throw new TypeError('vitest_api_listener_enabled');
+      try {
+        await withTimeout(inspectServer(config, 'vitest-root', null, vitest.vite, false),
+          request.phaseTimeoutMs, `vitest:${config}:root`);
+      } catch (error) {
+        throw new TypeError(`vitest_root_inspect_failed:${error instanceof Error ? error.message : String(error)}`, {
+          cause: error,
+        });
+      }
+      for (const project of [...vitest.projects].sort((left, right) => left.name.localeCompare(right.name))) {
+        if (project.config.browser.enabled) throw new TypeError(`browser_project_unsupported:${project.name}`);
+        await withTimeout(inspectServer(config, 'vitest-project', project.name, project.vite),
+          request.phaseTimeoutMs, `vitest:${config}:${project.name || '<root>'}`);
+      }
+    } catch (error) {
+      const timedOut = error instanceof Error && error.message.startsWith('phase_timeout:');
+      recordLoad(config, 'vitest-root', null, '<load>', timedOut ? 'timed_out' : 'failed', errorClass(error));
+      findings.push({ path: config, kind: 'configuration_load_failed', detail: String(error) });
+    } finally {
+      if (vitest !== undefined) await vitest.close().catch(() => undefined);
+    }
+  }
+
+  if (configs.length === 0) {
+    findings.push({ path: '<configuration>', kind: 'configuration_load_failed', detail: 'No Vite or Vitest config found.' });
+    recordLoad('<configuration>', 'vite-serve', null, '<load>', 'failed', 'ConfigurationNotFound');
+  }
+
+  const rowKey = (row) => JSON.stringify(row);
+  const sortedResolution = [...new Map(resolution.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
+    .map((row) => [rowKey(row), row])).values()];
+  const sortedAssignments = [...new Map(seedAssignments.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
+    .map((row) => [rowKey(row), row])).values()];
+  const report = {
+    protocol: PROTOCOL,
+    slice: request.slice,
+    configurationLoad: configurationLoad.sort((left, right) => rowKey(left).localeCompare(rowKey(right))),
+    resolution: sortedResolution,
+    seedAssignments: sortedAssignments,
+    findings: [...new Map(findings.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
+      .map((row) => [rowKey(row), row])).values()],
+  };
+  writeSync(3, JSON.stringify(report));
+}
+
+main().catch((error) => {
+  writeSync(2, `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
+  process.exitCode = 1;
+});
diff --git a/tools/heldout-runtime-guard.ts b/tools/heldout-runtime-guard.ts
new file mode 100644
index 0000000000000000000000000000000000000000..3d1c52d2d7c263b2d2e5663bcc58675e12c29d35
--- /dev/null
+++ b/tools/heldout-runtime-guard.ts
@@ -0,0 +1,506 @@
+import { spawn, spawnSync } from 'node:child_process';
+import { createHash } from 'node:crypto';
+import {
+  existsSync,
+  mkdirSync,
+  readFileSync,
+  realpathSync,
+  rmSync,
+} from 'node:fs';
+import { tmpdir } from 'node:os';
+import { dirname, join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+export const HELDOUT_RUNTIME_PROTOCOL = 'heldout-runtime-v1' as const;
+export const HELDOUT_RUNTIME_PHASE_TIMEOUT_MS = 30_000;
+export const HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS = 120_000;
+
+export interface HeldoutRuntimeBindings {
+  readonly reserveDigests: readonly string[];
+  readonly resultPaths: readonly string[];
+}
+
+export interface HeldoutRuntimeGuardRequest {
+  readonly root: string;
+  readonly slice: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
+  readonly bindings: HeldoutRuntimeBindings;
+  /** Trusted installation whose package-lock and node_modules authenticate execution dependencies. */
+  readonly trustedRoot?: string;
+  readonly phaseTimeoutMs?: number;
+  readonly aggregateTimeoutMs?: number;
+}
+
+export interface HeldoutPreflightAttempt {
+  readonly profile: string;
+  readonly status: 'failed' | 'passed';
+  readonly errorClass: string | null;
+}
+
+export interface HeldoutRuntimePreflight {
+  readonly status: 'passed' | 'isolation_failed';
+  readonly bubblewrapVersion: string;
+  readonly runtimeRoot: string;
+  readonly runtimeVersion: string;
+  readonly attempts: readonly HeldoutPreflightAttempt[];
+  readonly checks: readonly string[];
+  readonly detail?: string;
+}
+
+export interface HeldoutConfigurationLoad {
+  readonly file: string;
+  readonly kind: 'vite-serve' | 'vitest-root' | 'vitest-project' | 'preflight';
+  readonly project: string | null;
+  readonly environment: string;
+  readonly status: 'loaded' | 'failed' | 'timed_out' | 'isolation_failed';
+  readonly errorClass: string | null;
+  readonly runtimeRoot: string;
+  readonly runtimeVersion: string;
+}
+
+export interface HeldoutRuntimeResolution {
+  readonly configuration: string;
+  readonly project: string | null;
+  readonly environment: string;
+  readonly phase: 'resolve' | 'transform';
+  readonly conditions: readonly string[];
+  readonly seed: string;
+  readonly specifier: string;
+  readonly importer: string | null;
+  readonly resolvedId: string | null;
+  readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control';
+  readonly status:
+    | 'clean'
+    | 'protected'
+    | 'unresolved'
+    | 'control'
+    | 'external_builtin'
+    | 'external_dependency';
+}
+
+export interface HeldoutSeedAssignment {
+  readonly seed: string;
+  readonly configuration: string;
+  readonly project: string | null;
+  readonly environment: string;
+}
+
+export interface HeldoutRuntimeFinding {
+  readonly path: string;
+  readonly kind:
+    | 'runtime_protocol_resolution'
+    | 'configuration_load_failed'
+    | 'unresolved_module_edge';
+  readonly detail: string;
+}
+
+export interface HeldoutRuntimeGuardReport {
+  readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
+  readonly slice: HeldoutRuntimeGuardRequest['slice'];
+  readonly preflight: HeldoutRuntimePreflight;
+  readonly configurationLoad: readonly HeldoutConfigurationLoad[];
+  readonly resolution: readonly HeldoutRuntimeResolution[];
+  readonly seedAssignments: readonly HeldoutSeedAssignment[];
+  readonly findings: readonly HeldoutRuntimeFinding[];
+}
+
+interface WorkerRequest {
+  readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
+  readonly slice: HeldoutRuntimeGuardRequest['slice'];
+  readonly bindings: HeldoutRuntimeBindings;
+  readonly phaseTimeoutMs: number;
+  readonly trustedLockDigest: string;
+}
+
+const HISTORICAL_PREFLIGHT_ATTEMPTS: readonly HeldoutPreflightAttempt[] = [{
+  profile: '/usr/bin/prlimit --nproc=64 --nofile=256 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /usr/bin/node -e <canary>',
+  status: 'failed',
+  errorClass: 'runtime_node_mismatch',
+}, {
+  profile: '/usr/bin/prlimit --as=1073741824 --nproc=64 --nofile=256 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node -e <canary>',
+  status: 'failed',
+  errorClass: 'v8_code_range_reservation_failed',
+}];
+
+let successfulPreflight: HeldoutRuntimePreflight | undefined;
+
+function stringProperty(value: unknown, property: string): string | null {
+  if (value === null || typeof value !== 'object') return null;
+  const member = Reflect.get(value, property);
+  return typeof member === 'string' ? member : null;
+}
+
+function sha256(bytes: string | Buffer): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+function runtimeIdentity(): { readonly root: string; readonly version: string } {
+  const executable = realpathSync(process.execPath);
+  const root = dirname(dirname(executable));
+  const node = join(root, 'bin', 'node');
+  const probe = spawnSync(node, ['--version'], { encoding: 'utf8' });
+  const version = probe.stdout.trim();
+  if (probe.status !== 0 || version !== process.version) {
+    throw new TypeError(`Node runtime mismatch: running ${process.version}, mounted ${version || '<none>'}.`);
+  }
+  return { root, version };
+}
+
+function sharedBwrapArguments(
+  runtimeRoot: string,
+  workRoot: string,
+  guardRoot: string,
+  scratchRoot: string,
+  nodeModulesRoot: string,
+): string[] {
+  return [
+    '--die-with-parent',
+    '--new-session',
+    '--unshare-user',
+    '--unshare-pid',
+    '--unshare-ipc',
+    '--unshare-uts',
+    '--unshare-cgroup',
+    '--unshare-net',
+    '--ro-bind', '/usr', '/usr',
+    '--ro-bind', '/lib', '/lib',
+    '--ro-bind', '/lib64', '/lib64',
+    '--ro-bind', runtimeRoot, '/opt/node',
+    '--dev', '/dev',
+    '--proc', '/proc',
+    '--tmpfs', '/etc',
+    '--ro-bind', '/etc/hosts', '/etc/hosts',
+    '--ro-bind', '/etc/nsswitch.conf', '/etc/nsswitch.conf',
+    '--ro-bind', workRoot, '/work',
+    '--ro-bind', guardRoot, '/guard',
+    '--ro-bind', nodeModulesRoot, '/work/node_modules',
+    '--bind', scratchRoot, '/scratch',
+    '--bind', join(scratchRoot, 'tmp'), '/tmp',
+    '--bind', join(scratchRoot, 'home'), '/home/guard',
+    '--chdir', '/work',
+  ];
+}
+
+function cleanEnvironment(): readonly string[] {
+  return [
+    'PATH=/opt/node/bin:/usr/bin:/bin',
+    'HOME=/home/guard',
+    'TMPDIR=/tmp',
+    'XDG_CACHE_HOME=/scratch/cache',
+    'STATIC_APP_CACHE_DIR=/scratch/cache/vite',
+    'NODE_ENV=test',
+    'CI=1',
+    'GOMAXPROCS=8',
+    'LANG=C.UTF-8',
+    'LC_ALL=C.UTF-8',
+  ];
+}
+
+function shellQuote(value: string): string {
+  return `'${value.replaceAll("'", `'"'"'`)}'`;
+}
+
+function prepareScratch(root: string): void {
+  mkdirSync(root, { recursive: true });
+  mkdirSync(join(root, 'tmp'), { recursive: true });
+  mkdirSync(join(root, 'home'), { recursive: true });
+  mkdirSync(join(root, 'cache'), { recursive: true });
+}
+
+function performHeldoutIsolationPreflight(
+  trustedRoot = process.cwd(),
+): HeldoutRuntimePreflight {
+  if (successfulPreflight !== undefined) return successfulPreflight;
+  const runtime = runtimeIdentity();
+  const bubblewrap = spawnSync('/usr/bin/bwrap', ['--version'], { encoding: 'utf8' });
+  if (bubblewrap.status !== 0 || bubblewrap.stdout.trim() !== 'bubblewrap 0.6.1') {
+    throw new TypeError(`isolation_failed: ${bubblewrap.stderr.trim() || 'bubblewrap 0.6.1 unavailable'}`);
+  }
+  const scratchRoot = join(tmpdir(), `heldout-runtime-preflight-${String(process.pid)}`);
+  const workRoot = join(scratchRoot, 'candidate');
+  const guardRoot = join(scratchRoot, 'guard');
+  rmSync(scratchRoot, { recursive: true, force: true });
+  prepareScratch(scratchRoot);
+  mkdirSync(workRoot, { recursive: true });
+  mkdirSync(guardRoot, { recursive: true });
+  mkdirSync(join(workRoot, 'node_modules'), { recursive: true });
+  const nodeModulesRoot = join(trustedRoot, 'node_modules');
+  const script = [
+    "const fs=require('node:fs')",
+    "const net=require('node:net')",
+    `if(process.version!==${JSON.stringify(runtime.version)})throw new Error('runtime version mismatch')`,
+    "if(process.env.HOME!=='/home/guard')throw new Error('HOME mismatch')",
+    "fs.writeFileSync('/scratch/write-ok','ok')",
+    "for(const p of ['/work/nope','/guard/nope','/opt/node/nope','/usr/nope']){let denied=false;try{fs.writeFileSync(p,'x')}catch{denied=true}if(!denied)throw new Error(p+' writable')}",
+    "if(fs.existsSync('/home/vagrant'))throw new Error('host home visible')",
+    "const socket=net.connect({host:'198.51.100.1',port:9})",
+    "const timer=setTimeout(()=>{socket.destroy();process.exit(2)},1000)",
+    "socket.on('connect',()=>{clearTimeout(timer);socket.destroy();process.exit(3)})",
+    "socket.on('error',()=>{clearTimeout(timer);process.stdout.write('passed')})",
+  ].join(';');
+  const args = [
+    '--nproc=512',
+    '--nofile=1024',
+    '--fsize=16777216',
+    '--cpu=300',
+    '--',
+    '/usr/bin/bwrap',
+    ...sharedBwrapArguments(runtime.root, workRoot, guardRoot, scratchRoot, nodeModulesRoot),
+    '/usr/bin/env', '-i', ...cleanEnvironment(),
+    '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64', '-e', script,
+  ];
+  const probe = spawnSync('/usr/bin/prlimit', args, { encoding: 'utf8', timeout: 5_000 });
+  if (probe.status !== 0 || probe.stdout !== 'passed') {
+    rmSync(scratchRoot, { recursive: true, force: true });
+    throw new TypeError(`isolation_failed: ${probe.error?.message ?? (probe.stderr.trim() || `exit ${String(probe.status)}`)}`);
+  }
+  const parentDeathArgs = [
+    '--nproc=512', '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
+    '/usr/bin/bwrap',
+    ...sharedBwrapArguments(runtime.root, workRoot, guardRoot, scratchRoot, nodeModulesRoot),
+    '/usr/bin/env', '-i', ...cleanEnvironment(),
+    '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64',
+    '-e', "setInterval(() => undefined, 1000)",
+  ];
+  const isolatedPidFile = join(scratchRoot, 'isolated.pid');
+  const parentDeathScript = [
+    'set -eu',
+    '(',
+    `  /usr/bin/prlimit ${parentDeathArgs.map(shellQuote).join(' ')} &`,
+    '  isolated=$!',
+    `  echo "$isolated" > ${shellQuote(isolatedPidFile)}`,
+    '  wait "$isolated"',
+    ') &',
+    'supervisor=$!',
+    `while [ ! -s ${shellQuote(isolatedPidFile)} ]; do sleep 0.01; done`,
+    `isolated=$(cat ${shellQuote(isolatedPidFile)})`,
+    'kill -KILL "$supervisor"',
+    'wait "$supervisor" 2>/dev/null || true',
+    'attempt=0',
+    'while kill -0 "$isolated" 2>/dev/null; do',
+    '  attempt=$((attempt + 1))',
+    '  if [ "$attempt" -ge 200 ]; then exit 1; fi',
+    '  sleep 0.01',
+    'done',
+  ].join('\n');
+  const parentDeath = spawnSync('/bin/sh', ['-c', parentDeathScript], {
+    encoding: 'utf8',
+    timeout: 5_000,
+  });
+  if (parentDeath.status !== 0) {
+    rmSync(scratchRoot, { recursive: true, force: true });
+    throw new TypeError(`isolation_failed: parent-death canary ${parentDeath.error?.message ??
+      (parentDeath.stderr.trim() || `exit ${String(parentDeath.status)}`)}`);
+  }
+  successfulPreflight = {
+    status: 'passed',
+    bubblewrapVersion: bubblewrap.stdout.trim(),
+    runtimeRoot: runtime.root,
+    runtimeVersion: runtime.version,
+    attempts: [...HISTORICAL_PREFLIGHT_ATTEMPTS, {
+      profile: '/usr/bin/prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 -e <canary>',
+      status: 'passed',
+      errorClass: null,
+    }],
+    checks: [
+      'node_runtime_matches_parent',
+      'scratch_write_allowed',
+      'work_read_only',
+      'guard_read_only',
+      'runtime_read_only',
+      'system_runtime_read_only',
+      'home_isolated',
+      'external_network_unreachable',
+      'new_session_and_die_with_parent_enabled',
+    ],
+  };
+  rmSync(scratchRoot, { recursive: true, force: true });
+  return successfulPreflight;
+}
+
+export function runHeldoutIsolationPreflight(
+  trustedRoot = process.cwd(),
+): HeldoutRuntimePreflight {
+  try {
+    return performHeldoutIsolationPreflight(trustedRoot);
+  } catch (error: unknown) {
+    const runtimeRoot = dirname(dirname(realpathSync(process.execPath)));
+    const bubblewrap = spawnSync('/usr/bin/bwrap', ['--version'], { encoding: 'utf8' });
+    const detail = error instanceof Error ? error.message : String(error);
+    return {
+      status: 'isolation_failed',
+      bubblewrapVersion: bubblewrap.status === 0 ? bubblewrap.stdout.trim() : '<unavailable>',
+      runtimeRoot,
+      runtimeVersion: process.version,
+      attempts: [...HISTORICAL_PREFLIGHT_ATTEMPTS, {
+        profile: 'final Node-runtime bubblewrap profile',
+        status: 'failed',
+        errorClass: error instanceof Error ? error.name : 'UnknownError',
+      }],
+      checks: [],
+      detail,
+    };
+  }
+}
+
+function parseWorkerReport(value: unknown): Omit<HeldoutRuntimeGuardReport, 'preflight'> {
+  if (value === null || typeof value !== 'object' ||
+    stringProperty(value, 'protocol') !== HELDOUT_RUNTIME_PROTOCOL) {
+    throw new TypeError('Runtime guard emitted an invalid protocol response.');
+  }
+  const slice = stringProperty(value, 'slice');
+  const configurationLoad = Reflect.get(value, 'configurationLoad');
+  const resolutionRows = Reflect.get(value, 'resolution');
+  const seedAssignments = Reflect.get(value, 'seedAssignments');
+  const findings = Reflect.get(value, 'findings');
+  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(slice ?? '') ||
+    !Array.isArray(configurationLoad) || !Array.isArray(resolutionRows) ||
+    !Array.isArray(seedAssignments) || !Array.isArray(findings)) {
+    throw new TypeError('Runtime guard emitted malformed report fields.');
+  }
+  return value as Omit<HeldoutRuntimeGuardReport, 'preflight'>;
+}
+
+function collectPipe(stream: NodeJS.ReadableStream, limit: number): Promise<string> {
+  return new Promise((resolvePipe, rejectPipe) => {
+    let text = '';
+    stream.setEncoding('utf8');
+    stream.on('data', (chunk: string) => {
+      text += chunk;
+      if (text.length > limit) rejectPipe(new TypeError('Runtime guard pipe exceeded its byte limit.'));
+    });
+    stream.on('end', () => resolvePipe(text));
+    stream.on('error', rejectPipe);
+  });
+}
+
+function isReadableStream(value: unknown): value is NodeJS.ReadableStream {
+  return value !== null && typeof value === 'object' &&
+    typeof Reflect.get(value, 'setEncoding') === 'function' &&
+    typeof Reflect.get(value, 'on') === 'function';
+}
+
+export async function runHeldoutRuntimeGuard(
+  request: HeldoutRuntimeGuardRequest,
+): Promise<HeldoutRuntimeGuardReport> {
+  const trustedRoot = resolve(request.trustedRoot ?? process.cwd());
+  const preflight = runHeldoutIsolationPreflight(trustedRoot);
+  if (preflight.status === 'isolation_failed') {
+    const detail = preflight.detail ?? 'Isolation preflight failed.';
+    return {
+      protocol: HELDOUT_RUNTIME_PROTOCOL,
+      slice: request.slice,
+      preflight,
+      configurationLoad: [{
+        file: '<preflight>',
+        kind: 'preflight',
+        project: null,
+        environment: 'isolation',
+        status: 'isolation_failed',
+        errorClass: 'IsolationError',
+        runtimeRoot: preflight.runtimeRoot,
+        runtimeVersion: preflight.runtimeVersion,
+      }],
+      resolution: [],
+      seedAssignments: [],
+      findings: [{ path: '<preflight>', kind: 'configuration_load_failed', detail }],
+    };
+  }
+  const root = realpathSync(request.root);
+  const runtime = { root: preflight.runtimeRoot, version: preflight.runtimeVersion };
+  const trustedLock = readFileSync(join(trustedRoot, 'package-lock.json'));
+  const candidateLockPath = join(root, 'package-lock.json');
+  if (!existsSync(candidateLockPath) || sha256(readFileSync(candidateLockPath)) !== sha256(trustedLock)) {
+    throw new TypeError('configuration_load_failed: candidate lock does not match the trusted installation baseline.');
+  }
+  for (const [name, expected] of [['vite', '7.3.6'], ['vitest', '4.1.10']] as const) {
+    const metadata: unknown = JSON.parse(readFileSync(join(trustedRoot, 'node_modules', name, 'package.json'), 'utf8'));
+    if (stringProperty(metadata, 'version') !== expected) {
+      throw new TypeError(`configuration_load_failed: installed ${name} must be ${expected}.`);
+    }
+  }
+  const scratchRoot = join(tmpdir(), `heldout-runtime-${String(process.pid)}-${String(Date.now())}`);
+  prepareScratch(scratchRoot);
+  if (!existsSync(join(root, 'node_modules'))) {
+    rmSync(scratchRoot, { recursive: true, force: true });
+    throw new TypeError('configuration_load_failed: candidate node_modules mount point is missing.');
+  }
+  const workerRequest: WorkerRequest = {
+    protocol: HELDOUT_RUNTIME_PROTOCOL,
+    slice: request.slice,
+    bindings: request.bindings,
+    phaseTimeoutMs: request.phaseTimeoutMs ?? HELDOUT_RUNTIME_PHASE_TIMEOUT_MS,
+    trustedLockDigest: sha256(trustedLock),
+  };
+  const args = [
+    '--nproc=512', '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
+    '/usr/bin/bwrap',
+    ...sharedBwrapArguments(runtime.root, root, dirname(fileURLToPath(import.meta.url)), scratchRoot,
+      join(trustedRoot, 'node_modules')),
+    '/usr/bin/env', '-i', ...cleanEnvironment(),
+    '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64',
+    '/guard/heldout-runtime-guard-worker.mjs',
+  ];
+  let child: ReturnType<typeof spawn> | undefined;
+  try {
+    child = spawn('/usr/bin/prlimit', args, {
+      detached: true,
+      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
+    });
+    const runningChild = child;
+    const reportStream = runningChild.stdio[3];
+    if (!isReadableStream(reportStream) || runningChild.stdout === null ||
+      runningChild.stderr === null || runningChild.stdin === null) {
+      throw new TypeError('Runtime guard pipes were not created.');
+    }
+    const reportTextPromise = collectPipe(reportStream, 128 * 1024 * 1024);
+    const diagnosticsPromise = collectPipe(runningChild.stdout, 4 * 1024 * 1024);
+    const errorsPromise = collectPipe(runningChild.stderr, 4 * 1024 * 1024);
+    runningChild.stdin.end(JSON.stringify(workerRequest));
+    const aggregateTimeout = request.aggregateTimeoutMs ?? HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS;
+    const exitPromise = new Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>((resolveExit, rejectExit) => {
+      const timer = setTimeout(() => {
+        try {
+          process.kill(-runningChild.pid!, 'SIGKILL');
+        } catch {
+          runningChild.kill('SIGKILL');
+        }
+        rejectExit(new TypeError(`configuration_load_failed: aggregate timeout after ${String(aggregateTimeout)}ms.`));
+      }, aggregateTimeout);
+      runningChild.once('error', (error) => {
+        clearTimeout(timer);
+        rejectExit(error);
+      });
+      runningChild.once('exit', (code, signal) => {
+        clearTimeout(timer);
+        resolveExit({ code, signal });
+      });
+    });
+    const [exit, reportText, diagnostics, errors] = await Promise.all([
+      exitPromise,
+      reportTextPromise,
+      diagnosticsPromise,
+      errorsPromise,
+    ]);
+    if (exit.code !== 0 || exit.signal !== null) {
+      throw new TypeError(`configuration_load_failed: worker exit ${String(exit.code)}/${exit.signal ?? 'none'}: ${errors || diagnostics}`);
+    }
+    if (reportText.length === 0) throw new TypeError('configuration_load_failed: worker emitted no report.');
+    let decoded: unknown;
+    try {
+      decoded = JSON.parse(reportText);
+    } catch {
+      throw new TypeError('configuration_load_failed: worker emitted malformed JSON.');
+    }
+    const parsed = parseWorkerReport(decoded);
+    return { ...parsed, preflight };
+  } finally {
+    if (child !== undefined && child.exitCode === null && child.signalCode === null) {
+      try {
+        process.kill(-child.pid!, 'SIGKILL');
+      } catch {
+        child.kill('SIGKILL');
+      }
+    }
+    rmSync(scratchRoot, { recursive: true, force: true });
+  }
+}
