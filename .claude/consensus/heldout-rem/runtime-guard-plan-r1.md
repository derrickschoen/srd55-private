# Held-out runtime resolution guard implementation plan

Date: 2026-09-10  
Decision: D607  
Planning base requested: `cbdb6429`, with round-21 F67–F69 work initially uncommitted  
Observed during this read-only planning task: the supervisor completed that work as `3e439b07`; the worktree was clean before this plan was created  
Status: plan only; no source/test edits, builds, or test runs in this task

## 1. Scope, precedence, baseline, and stopping point

### Scope

Replace static interpretation of executable Vite/Vitest configuration (Rule C.1–C.6) with a runtime guard that:

1. materializes the candidate revision in an isolated throwaway checkout;
2. executes its real Vite and Vitest configuration through the installed APIs;
3. obtains real resolved configs and per-environment plugin containers;
4. resolves and transforms the complete ordinary candidate module graph in serve, build, and test environments;
5. fails if any resolution reaches `src/vtt/heldout-evaluation.ts`, a bound reserve-result path, or a file whose bytes contain a bound reserve digest;
6. emits deterministic configuration-load and resolution evidence in `HeldoutLeakReport`;
7. retains static AST checks whose truth does not depend on configuration semantics.

This is an executed-configuration isolation gate, not a general malware sandbox, application test run, or proof about code fetched after the gate.

### Precedence

1. This task and D607.
2. Common held-out rules, including the frozen contract and no expectation regeneration.
3. Installed Vite/Vitest behavior pinned by `package-lock.json`.
4. Existing `heldout-ordinary-v1` report/CLI compatibility.
5. Repository typecheck, structural scan, and focused/cumulative test contracts.

If an installed API differs from the plan, fail closed and stop for a plan amendment. Do not recreate a partial static model of configuration semantics.

### Proven baseline

| Claim | Local evidence | Consequence |
|---|---|---|
| The wall is a standalone CLI and synchronous library. | `tools/heldout-leak-check.ts:1730-1865` defines `inspectHeldoutLeakChanges`; `:3222-3231` emits JSON and exits nonzero on findings. | Preserve CLI arguments/protocol while making CLI orchestration async. |
| No package script invokes the wall. | `package.json:8-41` has Vite/Vitest and gate scripts but no held-out command; only `tests/unit/tools/heldout-leak-check.test.ts` imports the tool. | Preserve direct CLI compatibility and add an explicit script; do not claim `test:gate` already runs it. |
| The normal gate is only a load-tolerant Vitest runner. | `package.json:16-18`; `tools/gate-vitest.mjs:39-56,65-105`. | Do not put candidate/base/binding concerns inside that runner. |
| Vite loads real config and hooks. | `node_modules/vite/dist/node/chunks/config.js:35485-35525` loads config and runs `config`; `:35753-35763` runs `configResolved`; `:35834-35864` throws on load failure. | Use this pipeline once per command/mode; never import config separately first. |
| Middleware mode does not listen. | `node_modules/vite/dist/node/index.d.ts:2477-2495,2607`; implementation `node_modules/vite/dist/node/chunks/config.js:25441-25476`. | Use middleware mode, disable HMR/watch, never call `listen`; never touch 4173. |
| Vite exposes per-environment resolution and transforms. | `node_modules/vite/dist/node/index.d.ts:1540-1574,2275-2289,2511-2533`; implementation `node_modules/vite/dist/node/chunks/config.js:28754-28770`. | Use actual environment plugin containers and transforms. |
| Transforms expose generated dependencies. | `node_modules/vite/dist/node/index.d.ts:943-952`; import-glob transform uses the real resolver at `node_modules/vite/dist/node/chunks/config.js:28062-28087`. | Traverse transformed imports plus `deps`/`dynamicDeps`; this covers `import.meta.glob`. |
| Build resolution is distinct. | `node_modules/vite/dist/node/index.d.ts:2195-2231`; builder implementation `node_modules/vite/dist/node/chunks/config.js:33950-34018`. | Exercise build-only plugins via `createBuilder` and a non-writing audit build. |
| Vitest can initialize projects without running tests. | `node_modules/vitest/dist/node.d.ts:105-125`; `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14208-14230` creates its server; `_setServer` resolves projects at `:13082-13172`. | Use `createVitest`, inspect projects, close it; do not use `startVitest`, which runs tests at `:14529-14555`. |
| Every project has a Vite server. | `node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:1938-1989`; initialization `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11048-11061,11135-11148`. | Probe each project/server/environment independently. |
| Inline projects, `extends`, and globs are real inputs. | `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11110-11133,11262-11328`. | Let Vitest discover them; missing/throwing projects fail closed. |
| Vitest selects client versus SSR transforms by test environment. | `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:411-419`. | Probe both client and SSR and tag the configured environment. |
| Installed versions support current Node. | Node is `v24.13.0`; lockfile pins Vite `7.3.6` at `package-lock.json:5319-5337` and Vitest `4.1.10` at `:5432-5459`; their engines include Node 24. | Treat lock versions as the API contract. |
| Manifest versions are not exact today. | `package.json:63-65` uses `^7.0.0` and `^4.1.10`. | Exact-pin `7.3.6`/`4.1.10` or stop for owner rejection; do not falsely call the manifest pinned. |
| Isolation primitives exist locally. | Read-only probes found `/usr/bin/bwrap` and `/usr/bin/unshare`. | Use bubblewrap; absence/failed isolation is a finding. |
| Frozen contract is intact. | `sha256sum src/vtt/intel/contracts.ts` returned `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. | Never edit it. |

No model call, listener, build, or test established this baseline. Only read-only `node -e` export/version probes of installed Vite/Vitest were used.

### Stopping point

Implementation is complete only when:

- real installed resolver/config/project pipelines cover every required environment;
- all F47–F69 runtime fixtures and new plugin-hook fixtures fail for the intended reason, with alias-removed mutants clean;
- real repository Vite/Vitest configs and ordinary graph have zero findings;
- injected real-tree alias and `resolveId` hook controls each produce protected resolution evidence;
- retained static direct-reference coverage remains green after Rule C retirement;
- isolation denial, timeout, load failure, unresolved ID, cleanup, and determinism tests pass;
- focused and cumulative batteries pass (or the one permitted D576 serial rerun proves load-only flakiness);
- all 66 fixture bytes and the frozen contract hash remain unchanged.

Stop as `BLOCKED` rather than weaken the guard if real config requires network/listeners, projects cannot be enumerated, an environment lacks a resolver/transform path, isolation cannot deny network/writes, or exact dependency pinning is rejected.

## 2. Touched-system anatomy

### Proposed files

| File | Purpose |
|---|---|
| `tools/heldout-leak-check.ts` | Retain static direct-reference logic/CLI; merge validated child runtime evidence into the report. |
| `tools/heldout-runtime-guard.ts` | Typed host request/report model, protected identity/graph inventory, sandbox launch, timeout/cleanup, deterministic merge. |
| `tools/heldout-runtime-guard-worker.mjs` | Minimal child that imports installed Vite/Vitest, loads real configs, probes resolver/transform/build pipelines, and emits one JSON response. |
| `tests/unit/tools/heldout-runtime-guard.test.ts` | Normal Vitest spec for generated throwaway repos, isolation, determinism, real configs, F47–F69, and plugin hooks. |
| `tests/unit/tools/heldout-leak-check.test.ts` | Remove Rule C assertions; retain N1/N2, direct imports/resolvers/loaders, Git enumeration, and merge/CLI assertions. |
| `package.json` | Exact-pin Vite/Vitest and add a stable `heldout:guard` script; do not alter `test:gate`. |
| `package-lock.json` | Reflect exact manifest pins without changing installed versions/integrities. |

F47–F69 fixtures are table-driven file maps written into a per-test temporary repo. Do not commit dozens of repetitive fixture directories. Each temp repo contains config(s), `src/consumer.ts`, `src/ordinary.ts`, `src/vtt/heldout-evaluation.ts`, package metadata, and only case-specific modules.

### Runtime data flow

```text
existing CLI bindings/base/candidate
          |
          +--> static diff/AST wall ------------------+
          |    reserve/direct import/loader findings  |
          |                                            v
          +--> candidate archive --> isolated child --> merge/sort --> canonical JSON
                                      /    |    \
                              Vite serve  build  Vitest projects
                              resolve + transform + real plugin hooks
```

### Protected identity set

Before config execution, construct an immutable set containing:

- canonical real path of `src/vtt/heldout-evaluation.ts` in the throwaway checkout;
- every bound reserve result path/prefix passed to the CLI;
- every regular candidate file (excluding `.git`, `node_modules`, scratch/cache) whose raw bytes contain a bound reserve digest;
- existing conventional reserve path/seed identities already checked statically.

For identity only, parse file URLs with `fileURLToPath`, percent-decode via URL semantics, strip query/fragment, and resolve symlinks/realpaths inside the sandbox. Preserve original `resolvedId` verbatim in evidence. Load/transform virtual IDs and scan their source recursively. An unsupported scheme/external result that cannot be proven clean is unresolved and fails closed.

## 3. Decisions with alternatives

### A. Use real pipelines; avoid double config execution

Use:

- `createServer({ root, configFile, configLoader: 'runner', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } })` for serve;
- `createBuilder` with `build.write: false`, scratch output, and a trusted audit plugin for build-only behavior;
- `createVitest('test', { root, config, configLoader: 'runner', watch: false, passWithNoTests: true }, overrides)` for root/project discovery, then `close()` in `finally`.

`createServer` already calls `resolveConfig`, which calls `loadConfigFromFile`, runs `config`, resolves environments, and runs `configResolved`. Calling `loadConfigFromFile` first would execute side-effectful candidate code twice. It is not used in production orchestration.

Rejected: direct config import plus reading `resolve.alias`; it misses plugin hooks, project expansion, and command/environment branches. Rejected: `createIdResolver` alone; it cannot prove arbitrary configured hooks ran in real order.

### B. Serve and build are separate executions

For serve, call every `server.environments[name].pluginContainer.resolveId` and `environment.transformRequest`.

For browser build (the Vite `client` build environment), worker build, SSR build, and every custom build environment, inject a trusted audit plugin via inline config. In `buildStart`, call `this.resolve(specifier, importer, { skipSelf: true })` for the sorted probe set; use a virtual entry importing ordinary roots; in `buildEnd`, enumerate module IDs. `build.write: false` prevents distribution output. If any configured build environment cannot expose audit results, fail closed.

Rejected: treating serve with `{ ssr: true }` as build. It omits `apply: 'build'` plugins and build command branches.

### C. Seed every ordinary source

Ordinary seeds are candidate `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` under `src/` or `tools/`, excluding declarations, scratch/cache, existing `EVALUATION_FILES`, and explicit evaluation-only tooling. Tests retain their current exemption. Seeding all ordinary files is stronger and more deterministic than guessing application entries.

For each seed/environment:

1. parse literal source edges with retained AST discovery;
2. resolve exact `(specifier, importer)`;
3. transform the importer through the real environment;
4. traverse `deps`, `dynamicDeps`, and imports parsed from transformed code;
5. load/transform virtual IDs and scan their source;
6. stop at protected IDs and deduplicate cycles by `(environment, importer, specifier, ssr)`.

Computed direct edges remain static `unresolved_module_edge` findings; runtime traversal does not make them acceptable.

### D. Resolver feature handling

| Feature | Treatment |
|---|---|
| `import.meta.glob` | Transform every ordinary importer; traverse Vite-generated imports and returned dependency lists. No custom glob matcher affects verdicts. |
| `?raw`, `?url`, `?worker`, `?inline`, `?init`, `?import`, `?no-inline`, fragments | Resolve/transform exact suffixed IDs; retain suffix in evidence; remove only for canonical file comparison. Run protected-control probes with supported suffixes. |
| `optimizeDeps` | Do not disable. Redirect cache/HOME/temp to scratch; initialize as required; probe configured includes/entries and trace optimized metadata back to canonical source. Untraceable prebundle IDs fail closed; no installation/network. |
| `ssr.noExternal` / environment `noExternal` | Probe actual client and server/SSR environments. Record external status; do not model the option. |
| `resolve.conditions` / SSR conditions | Preserve actual resolved environment conditions and record them as environment metadata. |
| aliases | Resolve every string alias key from each resolved config with a stable synthetic importer and also resolve graph imports. For regex aliases, use actual regexes against graph specifiers and inspect replacements; if no faithful diagnostic probe exists, record unresolved. |
| held-out controls | Resolve held-out relative/absolute/`file:` IDs and query variants in every environment with `source: 'protected_control'`; record mapping but do not count the intentional control as a leak. |
| package `imports`/`exports`, tsconfig paths | Use real resolver/importer paths. Config changes trigger candidate-wide runtime traversal; no static selector is authoritative. |

### E. Vitest projects without tests

`createVitest` returns after `_setServer` resolves configured projects. Inspect `vitest.projects`; for each project probe all `project.vite.environments`, tagged with project name and `project.config.environment`. Probe client and SSR because installed Vitest chooses between them by environment.

Do not call `startVitest`, collect tests, initialize global setup, or launch a browser. For a future browser project, inspect its project client environment. If the actual browser resolver cannot be exposed without provider startup, fail closed and stop for an approved adapter rather than call private `_initBrowserServers`.

### F. Retain config-independent static authority; retire Rule C

Keep:

- `reserveReference` and bound path/digest/seed checks;
- `prepareModuleAnalyses`, `discoverModuleEdges`, and `moduleSpecifiers`;
- static imports, re-exports, import-equals/types, JSDoc, and recursive data modules;
- direct dynamic import/require/worker/script edges;
- `require.resolve` / `import.meta.resolve` findings;
- symbol-based loader tracking and the single generic `loader_reference_escaped` emission;
- Rule N1/N2 tests, syntax diagnostics, Git NUL rename enumeration, candidate source loading, and static report fields.

These retained paths continue to emit the existing config-independent finding kinds exactly: `reserve_reference`, `protocol_import`, `protocol_resolution`, `unresolved_module_edge`, and `loader_reference_escaped`. Runtime resolution adds evidence/findings; it does not rename or downgrade those static contracts.

Retire from the verdict path:

- `importsTarget`, `resolvePackageImport`, `jsonAliases`, `ViteAliasDiscovery`, and `viteAliases`; refactor `normalizeModuleSpecifier` so only config-independent relative/absolute/file/data canonicalization remains;
- `GlobOptions`, `globPatternExpression`, `globRegex`, `repositoryGlobPattern`, `literalObjectProperties`, `literalOptionValue`, `globOptions`, and `expandGlobEdges`; retain AST recognition of `import.meta.glob`, but make the real transform authoritative for its matches/options;
- `packageJsonFiles`, `configuredAliasPrefixes`, `configuredAliasRegexes`, `unresolvedResolutionConfigPaths`, `candidateConfigurationFiles`, and Rule C portions of `HeldoutLeakInspectionContext`;
- static alias-discovery consumer invalidation;
- all nested Rule C helpers for reachable nodes/symbols, alias capability, placement prefixes, config-helper matching, project/extends traversal, literal routes, object/array spread addressing, `ConfigurationAddress`, `addressedValue`, `subtreeContainsAliasKey`, effective placement unions, and `configurationReferenceEscapes`;
- Rule C flow-audit/scope strings and configuration-semantic expectations.

Keep only config filename/change detection needed to trigger runtime evaluation. Do not retain Rule C as a gate or informational precheck: a knowingly incomplete second authority is misleading. Git history is rollback.

F49–F57 tests that independently prove N1/N2 remain static even though they also get runtime fixtures. No direct-loader assertion is deleted/weakened.

#### Exact regression routing (r4–r21)

No test declaration is deleted. Existing cases are either retained verbatim as static contracts or migrated into the runtime table with their original mutant/control preserved:

| Existing finding groups | Disposition |
|---|---|
| F1–F5, F7, F9–F11, F16, F22, F34–F36 | Retain static parsing/canonicalization/AST-coherence tests: multi-argument imports, transparent wrappers, queries/file URLs, worker/script edges, inline data modules, JSDoc, Git rename enumeration, whitespace URL handling, declaration-file exclusion, shared checker/source identity, ambient shadowing, and nested binding propagation. Add runtime query/file/data controls where they exercise resolver identity, but static expectations remain authoritative. |
| F6, F12, F18 | Retain static recognition that `import.meta.glob` is a loader edge and that nonconstant inputs fail closed. Move matching/base/extglob/options/leading-`**`/alias expansion truth to runtime transform fixtures using installed Vite. Remove static assertions that claim exact Vite glob matching. |
| F8, F14–F15, F20, F23–F25, F28–F30, F32, F38, F40–F41, F43, F49–F52, F55–F57 | Retain all Rule N1/N2 and generic loader-escape declarations and assertions, including namespaces, aliases, workers, computed/destructured members, re-exports, await restrictions, and false-positive controls. F49–F57 also get runtime fixtures, but not replacements for their static tests. |
| F13, F19 | Migrate package `imports` exact/wildcard/conditional-resolution expectations to runtime fixtures. Retain only syntax-level recognition of a `#` import edge; remove the static package-map resolver assertions/functions. |
| F17, F21, F26–F27, F31, F33, F37, F39, F42, F44–F48, F53–F54, F58–F69 | Migrate every configuration-shape, configuration-change sweep, alias discovery, project, spread/address/placement, mutation/transfer, and real-tree config assertion into `heldout-runtime-guard.test.ts`. The old declarations are rewritten/moved rather than deleted; each still has the same positive leak and clean mutant/control. |
| F4 query controls and F67–F69 current round-21 cases | Keep exact specifier suffix normalization as a static direct-edge test, and also exercise it in runtime resolution. Migrate F67 object/array spread semantics, F68 project `extends`, and F69 embedded config references to runtime-only configuration verdicts. |

Within `heldout-leak-check.test.ts`, remove only expectations against `configuredAliasPrefixes`, `configuredAliasRegexes`, `unresolvedResolutionConfigPaths`, `candidateConfigurationFiles`, `HELDOUT_LEAK_FLOW_AUDIT` Rule C rows, and static `viteAliases` outcomes. Keep report validation, `astInspectedFiles`, candidate enumeration, all direct finding kinds, and Rule N scope tests. Add a declaration-count/name inventory test during migration so an accidental `.skip`, `.todo`, deletion, or lost mutant is detectable.

### G. Deterministic report extension

Keep `protocol: 'heldout-ordinary-v1'` and existing fields. Add:

```ts
readonly configurationLoad: readonly {
  readonly file: string;
  readonly kind: 'vite-serve' | 'vite-build' | 'vitest-root' | 'vitest-project';
  readonly environment: string;
  readonly status: 'loaded' | 'failed' | 'timed_out' | 'isolation_failed';
  readonly errorClass: string | null;
}[];

readonly resolution: readonly {
  readonly environment: string;
  readonly specifier: string;
  readonly importer: string | null;
  readonly resolvedId: string | null;
  readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control' | 'optimize_dep';
  readonly status: 'clean' | 'protected' | 'unresolved' | 'control';
}[];
```

Add finding kinds `runtime_protocol_resolution` and `configuration_load_failed`. Validate child JSON from `unknown` with exhaustive predicates; never use `any`.

Sort configuration rows by `(file, kind, environment, status, errorClass)` and resolutions by `(environment, importer, specifier, source, resolvedId, status)`. Rewrite scratch paths to `<candidate>/...` or `<scratch>/...`; normalize separators/error classes; omit timings, PIDs, random paths, and stacks from canonical JSON. Identical requests must byte-match.

### H. Exact dependency pin

Change manifest ranges to exact `vite: 7.3.6` and `vitest: 4.1.10`. The runtime guard depends on concrete programmatic/environment APIs, including the experimental builder. Lock artifacts/integrities already match. Add startup version assertions; mismatch fails closed.

Rejected: semver-range drift. It could silently alter project discovery, hook ordering, or environments.

## 4. Security and side effects

Loading config executes candidate config files/local imports and activated plugin `config`, `configResolved`, `buildStart`, `resolveId`, `load`, and `transform` hooks. This is intentional: they determine resolution, and the normal gate already executes candidate test/config code. The runtime guard gives that execution less authority.

The trusted parent must:

1. create a `mkdtemp` scratch root;
2. extract `git archive <candidate>` (or a synthetic fixture map) into a checkout with no `.git`;
3. verify candidate lock data matches mounted installed Vite/Vitest versions/integrities;
4. launch a new process group under `/usr/bin/bwrap`, unsharing user/PID/IPC/UTS/cgroup/network namespaces, dropping capabilities, applying a tested seccomp policy that denies internet-socket creation/connect/bind/listen/accept, and using parent-death cleanup;
5. mount candidate at `/work` read-only, guard code at `/guard` read-only, dependencies at `/work/node_modules` read-only, and only `/scratch` writable; bind `/scratch/tmp` as `/tmp` and `/scratch/home` as HOME;
6. omit host project, Git metadata, credentials, home, agent/Docker sockets, and sibling worktrees;
7. use `env -i` with only PATH, NODE_ENV, CI, locale, HOME/TMP/cache variables, and request/result descriptors; remove proxies/tokens/cloud/model credentials;
8. omit `/proc` unless a compatibility probe proves it required; if needed, mount PID-namespace-local procfs and document the expansion;
9. set CPU/address-space/file-size/open-file/process limits plus per-phase and aggregate deadlines; kill/reap the process group on expiry;
10. accept exactly one bounded JSON response on a dedicated pipe; extra/malformed/oversized output, signal, abnormal exit, missing close, or timeout fails closed;
11. delete only the validated exact `mkdtemp` child in parent `finally`.

No guard server listens. The seccomp/network namespace combination also prevents candidate config/plugins from touching host or sandbox TCP/UDP ports, including 4173. Build/optimizer writes stay in scratch. Outside writes fail. Config throw/hang/install/network/exit/close failure becomes `configuration_load_failed`, never a skipped environment.

Fixture names and contents remain generic (`@policy`, ordinary/protected modules, anonymous plugins). Apart from the required toolchain package names used to exercise their APIs, do not introduce third-party game, studio, artist, or product names; add a source-text licensing scan to the focused fixture test.

This is not a perfect hostile-native-code sandbox claim. If the owner requires that threat model, move the same JSON protocol into a dedicated CI VM/container before enabling the gate.

## 5. Dependent implementation steps

### Step 1 — contracts and version assumptions

**Resources:** manifest/lock lines and report/CLI lines cited above.

**Implementation:** exact-pin packages; define typed request/response/environment rows; extend report additively; impose size/version checks.

**Gate:** typecheck exhaustive discriminants; test malformed output, version mismatch, unknown fields/status, duplicate rows, and canonical sort.

**Verification / rollback / assumptions:** verify lock artifact/integrity unchanged. Rollback manifest pins/report fields together. Node must satisfy package engines, proven at startup.

### Step 2 — isolated launcher

**Resources:** `/usr/bin/bwrap`, `/usr/bin/unshare`, safe subprocess patterns in `tools/gate-runner-lib.mjs`, Git candidate enumeration in `tools/heldout-leak-check.ts:1875-1948,3113-3176`.

**Implementation:** archive materialization, validated scratch, bubblewrap args, clean env, JSON pipe, limits, timeout/group kill, cleanup.

**Gate:** attempt outbound TCP/DNS, host/sibling/HOME reads, outside writes, scratch write, infinite loop, child storm, malformed/oversized response, `process.exit`. Only scratch write succeeds; every failure is classified and leaves no child/listener.

**Verification / rollback / assumptions:** verify socket-free behavior without 4173. Rollback launcher/worker/script. Linux user namespaces and no `/proc` are assumptions to prove; otherwise stop.

### Step 3 — identities and ordinary graph

**Resources:** retained AST discovery `tools/heldout-leak-check.ts:100-1699`; Vite transform contract.

**Implementation:** protected sets; all ordinary seeds; URL/query/symlink/virtual/external canonicalization; cycle-safe graph and byte scanning.

**Gate:** file URL/encoded segment/query/fragment/symlink/virtual re-export/unknown scheme/result path/digest file/clean module cases.

**Verification / rollback / assumptions:** prove control rows do not count while identical graph rows do. Rollback runtime inventory only. Missing local resolver inputs fail closed.

### Step 4 — Vite adapters

**Resources:** Vite APIs/hook order/import-glob citations above.

**Implementation:** serve server per config/mode; all environment resolve/transform probes; generated dependency closure; non-writing builder with audit plugin; always close resources.

**Gate:** command-dependent aliases, serve/build-only plugins, `config`, `configResolved`, `resolveId`, virtual load, glob, raw/url, worker pipeline, SSR noExternal, conditions, optimizer origin.

**Verification / rollback / assumptions:** compare direct and transformed/build evidence. Rollback adapter. Builder must expose all configured environments or fail closed.

### Step 5 — Vitest adapter

**Resources:** Vitest project APIs/discovery citations above.

**Implementation:** `createVitest` once; enumerate projects/configs; probe all project Vite environments; include inline/glob/extends; close once.

**Gate:** inline project aliases, glob config, extends chain, missing/throwing extends, project conditions, and project plugin ending in protected resolution. Real config loads without tests/global setup.

**Verification / rollback / assumptions:** assert expected project names/count/config paths. Rollback adapter/fixtures. Exact version protects initialize-before-return behavior.

### Step 6 — retire Rule C and merge evidence

**Resources:** config discovery `tools/heldout-leak-check.ts:1747-1804,1951-3110`; N1/N2 tests.

**Implementation:** remove Decision F items; keep config detection as runtime trigger; make CLI async; validate/merge static+runtime output; add `heldout:guard` script without changing full gate.

**Gate:** static kinds remain green; config-only change redirecting unchanged consumer is caught at runtime; neither clean half masks the other.

**Verification / rollback / assumptions:** `rg` shows no Rule C/reachability/address/placement machinery. Revert as one unit if needed. Existing supervisor CLI args remain the integration contract.

### Step 7 — migrate probes

**Resources:** F47–F69 `it.each` cases and temporary filesystem helpers.

**Implementation:** generate each throwaway repo; retain independent N1/N2 assertions; pair every leak with alias/hook-removed clean mutant; add plugin cases.

**Gate:** assert exact environment/specifier/importer/resolvedId/finding, not merely non-empty findings; mutants assert no protected rows.

**Verification / rollback / assumptions:** prove each test fails if target comparison is removed. Rollback new table/spec. Dependencies come only from read-only mount.

### Step 8 — integration and performance

**Resources:** `package.json:9-18`, `tools/gate-vitest.mjs:39-105`, established nine-spec command at `.tmp-plans/2026-09-08-heldout-basis.md:234-238`.

**Implementation:** normal runtime Vitest spec plus runtime invocation behind existing held-out CLI; add named script; invocation-local cache keyed by candidate/config/lock/environment only.

**Gate:** canonical output repeats byte-identically; time/resource failures remain findings. Optimize only by batching fixtures/bounded concurrency, never by reusing resolved configs across candidates.

**Verification / rollback / assumptions:** run Section 7 with logs. Delete runtime host/worker/spec/script and restore Rule C as a single rollback. Owner chooses final budget after measurements.

## 6. Runtime probe matrix

Every row gets a real throwaway repo, ordinary `src/consumer.ts`, exact expected protected evidence, and a mutant redirecting/removing the alias/hook that is clean.

| Finding | Runtime shape and proof |
|---|---|
| F47 | Getter/computed/side-effect config construction; execution exposes effective protected alias. |
| F48 | Shared config also named-exported; default export consumed and protected alias resolves. |
| F49 | Local namespace/loader bridge used by config; retain N1 assertion and prove resulting runtime alias. Inert re-export clean. |
| F50 | Computed resolver/worker member; retain static fail-close and prove executed path. |
| F51 | Quoted/nested/rest loader destructuring; retain N2 and prove runtime alias. |
| F52 | Awaited `import.meta`/namespace path; static N1 remains; runtime throws fail closed or resolves protected. |
| F53 | Vitest config, `defineConfig`, `mergeConfig`; actual root/project resolver reaches protected. |
| F54 | Opaque plugins-array mutation resolves protected; ordinary-call array clean. |
| F55 | Loader-key destructuring from boxed/untyped source; static N2 plus runtime protected edge. |
| F56 | Typed-global computed loader constructor; static N2 plus protected worker resolution. |
| F57 | Awaited loader escapes remain static findings; allowed awaited built-in import has no spurious finding. |
| F58 | `resolve.alias`/`test.alias` addressed and mutated; actual resolver observes mutation. |
| F59 | Helper-built `test` config and literal `test.alias`; actual Vitest semantics resolve protected. |
| F60 | `Symbol.hasInstance` mutates alias; protected resolution. Strict equality mutant clean. |
| F61 | Const alias/void clean; escaped mutation variant resolves protected. |
| F62 | Shorthand resolve/test and capable spreads; actual merged config resolves protected. No-install control discovers only ordinary alias. |
| F63 | Empty root mutated before direct export/spread/callback; effective root resolves protected. No mutation clean. |
| F64 | Alias-array entry, const entry, test alias, dual placement; rewritten find/replacement resolves protected. Plugin-only control clean. |
| F65 | Indirect and two-level access with dual placement; runtime identity/mutation resolves protected. Plugin-only clean. |
| F66 | Inline/shorthand/referenced projects and literal project alias; enumerate every actual project server. |
| F67 | Object spread last-write and array runtime indexes; protected cases fail; later explicit/leading-safe controls clean. |
| F68 | Project extends path/chain; nested alias or plugin resolves protected; helper/missing/nonliteral fail closed; `true` root-clean control clean. |
| F69 | Terminal plugin reference clean; resolve/dual-placement mutation protected. |
| Plugin `config()` | Hook adds alias; resolved config and consumer show protected target. |
| Plugin `resolveId` | Hook returns held-out path; resolution row records exact protected ID without declarative alias. |
| Plugin `configResolved` | Post-resolution mutation is observed by actual resolver, or installed Vite rejects it and load fails closed. |
| Project plugin chain | Vitest project extends chain ends in plugin; final project's server reports protected target. |

Mandatory controls:

- actual `vite.config.ts` in serve/build and actual `vitest.config.ts` root/projects: zero findings;
- actual ordinary graph: zero findings;
- `@policy -> src/ordinary.ts`: clean resolution row;
- no alias/hook: unresolved `@policy` is not misreported protected (unresolved policy remains explicit);
- held-out self-probes appear only as `control`;
- real-tree copies with injected alias and injected resolver hook each produce exactly the deduplicated expected protected findings.

## 7. Gate battery and negative controls

Store full logs under `.tmp/heldout-runtime-guard-01/`; report exact commands, exits, file count, and test count.

### Focused

```sh
npm run typecheck:fast
sg scan
git diff --check
npx vitest run --configLoader runner tests/unit/tools/heldout-runtime-guard.test.ts
npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts
```

### Cumulative contract

Preserve all nine established specs and add the runtime spec as a tenth:

```sh
npx vitest run --configLoader runner \
  tests/unit/vtt/heldout-evaluation.test.ts \
  tests/unit/vtt/room-generator.test.ts \
  tests/unit/vtt/room-generator-los-cover.test.ts \
  tests/unit/vtt/reference-party-size.test.ts \
  tests/unit/vtt/scripted-party-round.test.ts \
  tests/integration/tools/generate-heldout-party-basis.test.ts \
  tests/unit/tools/generate-arena-basis.test.ts \
  tests/unit/tools/heldout-leak-check.test.ts \
  tests/integration/vtt/stored-character-party-member.test.ts \
  tests/unit/tools/heldout-runtime-guard.test.ts
```

If the D576 room-generator file times out under load, rerun only that file serially with timeout unchanged and report both. Do not run the full suite/gate/build/browser suite without new authorization.

### Integrity and structural checks

```sh
find tests/fixtures -type f -print0 | sort -z | xargs -0 sha256sum > .tmp/heldout-runtime-guard-01/fixture-hashes.after.txt
sha256sum .tmp/heldout-runtime-guard-01/fixture-hashes.after.txt
sha256sum src/vtt/intel/contracts.ts
rg -n "Rule C|reachableNodes|reachableSymbols|aliasCapableSymbols|placementPrefixes|ConfigurationAddress|addressedValue|subtreeContainsAliasKey|configurationReferenceEscapes|configuredAliasPrefixes|configuredAliasRegexes|unresolvedResolutionConfigPaths" tools/heldout-leak-check.ts tests/unit/tools/heldout-leak-check.test.ts
```

Compare all 66 protected fixture hashes byte-for-byte to the prior manifest. The `rg` result must contain no retired Rule C/reference-following machinery; any survivor needs a config-independent justification.

Every negative mutant removes only resolution-changing behavior. Assert exact config status, environment, importer, specifier, canonical target, and finding count. Real-tree injected controls prove failure sensitivity; clean real-tree controls prove usability.

## 8. Determinism and operational rules

- Inputs are candidate tree/config/lock hashes, slice, reserve bindings, and modes. Cache only within one invocation.
- Fresh child/module cache per candidate/fixture.
- Sort config/environment/graph queues; do not reorder real plugin hooks.
- Canonical report uses repository-relative paths/stable errors and excludes timings/PIDs/temp names/stacks.
- Resolver `null` for an ordinary edge is unresolved, not silently clean. Narrow audited Node built-ins may be clean; remote content is never fetched.
- Config load/close errors are findings even if partial resolutions exist.
- Alias diagnostics supplement rather than replace graph traversal.
- Begin serially; raise only bounded resolver concurrency after repeatability proof.
- Activated dependency plugin hooks run; dormant dependency code is not scanned as ordinary candidate code.

## 9. Assumptions to prove

1. Node 24.13.0 runs the worker without `/proc`.
2. Bubblewrap namespaces work in supervisor/CI.
3. `createVitest` 4.1.10 materializes every project before return.
4. `vitest.close()` closes root/projects without global setup/tests.
5. Vite 7.3.6 builder audit plugin observes every build environment and writes nothing with `write: false`.
6. Transform dependencies expose installed import-glob output completely.
7. Optimized IDs trace to source; otherwise fail closed.
8. Real configs load under clean env; only proven non-secret defaults may be added.
9. Exact manifest pins are acceptable; otherwise owner-approved compatibility matrix/feature tests are required.
10. Ordinary graph exemptions remain exactly evaluation-only tooling plus tests.

## 10. Open questions for the owner

1. Activated `node_modules` plugins: recommended in scope when candidate config activates them; dormant plugins out of scope. Confirm.
2. Approve exact Vite 7.3.6/Vitest 4.1.10 manifest pins and an explicit upgrade battery.
3. Runtime budget: recommend 30 seconds per config/project phase, 120 seconds aggregate, no test timeout changes. Confirm infrastructure limits.
4. Future browser projects: recommended fail closed if actual browser resolver requires provider startup; authorize provider startup only separately.
5. Unresolved imports: recommend fail closed except audited Node built-ins and reported non-fetched remote externals. Confirm.
6. Candidate dependency changes: recommend fail closed unless installed tree matches candidate lock integrity; never install/fetch. Confirm.
7. Platform: recommend Linux+bubblewrap required for authoritative pass; other platforms cannot issue a passing verdict. Confirm.
8. Report cardinality: recommend deduplicate identical rows while retaining distinct environments/projects. Confirm supervisor summary expectations.

## 11. Rollback

Rollback is code-only, not a data migration:

- remove runtime host/worker/spec/package script;
- restore manifest ranges only if explicitly desired;
- restore pre-D607 Rule C and tests from Git as one unit;
- remove additive runtime report fields/kinds;
- keep retained N1/N2/direct-reference checks;
- delete only validated runtime scratch paths.

No fixture, frozen contract, schema, docs, expectation pin, application data, or external service changes in implementation or rollback.

## 12. Final acceptance

Pass only after installed Vite/Vitest have executed every candidate config/project/plugin path needed for real resolvers, every ordinary source edge was resolved/transformed in every applicable environment, all diagnostic controls completed, and no non-control resolution reaches a protected identity. Missing environments, opaque results, load errors, timeouts, isolation/version/cleanup failures all fail closed.

This replaces an expanding static model of executable configuration with evidence from the actual resolver while retaining static checks that are genuinely syntax facts.
