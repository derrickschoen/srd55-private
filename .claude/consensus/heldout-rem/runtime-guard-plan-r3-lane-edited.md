# Held-out runtime resolution guard implementation plan

Date: 2026-09-10  
Decision: D607 / D607.1  
Planning base requested: `cbdb6429`, with round-21 F67–F69 work initially uncommitted  
Observed during this read-only planning task: the supervisor completed that work as `3e439b07`; the worktree was clean before this plan was created  
Status: implementation in progress; D607/D607.1 review fix round 1 incorporates RG-F1–RG-F9

## 1. Scope, precedence, baseline, and stopping point

### Scope

Replace static interpretation of executable Vite/Vitest configuration (Rule C.1–C.6) with a runtime guard that:

1. materializes the candidate revision in an isolated throwaway checkout;
2. executes its real Vite and Vitest configuration through the installed APIs;
3. obtains the real Vite serve environments plus the Vitest root and every resolved project/environment;
4. resolves and transforms runtime-value edges in the applicable serve and test environments;
5. fails if any resolution reaches `src/vtt/heldout-evaluation.ts`, a bound reserve-result path, or a file whose bytes contain a bound reserve digest;
6. emits deterministic configuration-load and resolution evidence in `HeldoutLeakReport`;
7. retains static AST checks whose truth does not depend on configuration semantics.

This slice supports the precise claim **“no ordinary serve/test path reaches the reserve.”** It is bounded resolver evidence under configuration-execution isolation, not adversarial attestation, a general malware sandbox, an application test run, or proof about build-only, worker-pipeline, optimizer, dormant-plugin, or post-gate behavior. Section 5 records those residuals.

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
| Build resolution is distinct and the builder is experimental. | `node_modules/vite/dist/node/index.d.ts:2195-2231,2227`; config reload behavior is at `node_modules/vite/dist/node/chunks/config.js:33950-34018`, and the worker pipeline is separate at `:35634`. | Defer build/worker coverage; a serve/test result must not be described as build-equivalent. |
| Vitest can initialize projects without running tests. | `node_modules/vitest/dist/node.d.ts:105-125`; `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14208-14230` creates its server; `_setServer` resolves projects at `:13082-13172`. | Use `createVitest`, inspect projects, close it; do not use `startVitest`, which runs tests at `:14529-14555`. |
| Every project has a Vite server. | `node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:1938-1989`; initialization `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11048-11061,11135-11148`. | Probe each project/server/environment independently. |
| Inline projects, `extends`, and globs are real inputs. | `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11110-11133,11262-11328`. | Let Vitest discover them; missing/throwing projects fail closed. |
| Vitest selects client versus SSR transforms by test environment. | `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:411-419`. | Probe both client and SSR and tag the configured environment. |
| Installed versions support current Node. | Node is `v24.13.0`; lockfile pins Vite `7.3.6` at `package-lock.json:5319-5337` and Vitest `4.1.10` at `:5432-5459`; their engines include Node 24. | Treat lock versions as the API contract. |
| Manifest versions are not exact today. | `package.json:63-65` uses `^7.0.0` and `^4.1.10`; the lockfile and installed metadata identify Vite `7.3.6` and Vitest `4.1.10`. | Do not change manifest pins. Assert both installed versions and candidate lock integrity at startup; drift fails closed. |
| Isolation primitives exist locally. | Supervisor-confirmed `/usr/bin/bwrap` is version `0.6.1`, and unprivileged user/network namespaces work on this machine. | Linux plus working bubblewrap isolation is required for an authoritative pass; absence/failed preflight is `isolation_failed`. |
| Frozen contract is intact. | `sha256sum src/vtt/intel/contracts.ts` returned `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. | Never edit it. |

No model call, listener, build, or test established this baseline. Only read-only `node -e` export/version probes of installed Vite/Vitest were used.

### Stopping point

Implementation is complete only when:

- real installed resolver/config/project pipelines cover every Vite serve environment and the Vitest root plus every resolved project/environment;
- all migrated F47–F69 configuration assertions and new plugin-hook/project/extends fixtures fail for the intended reason, with ordinary-target redirects clean;
- alias-removal controls are reported `unresolved` (fail closed) and are neither protected nor clean;
- real repository Vite/Vitest configs and ordinary graph have zero findings;
- injected real-tree alias and `resolveId` hook controls each produce protected resolution evidence;
- retained static direct-reference coverage remains green after Rule C retirement;
- isolation denial, timeout, load failure, unresolved ID, cleanup, version/lock drift, and canonical-report determinism tests pass;
- focused and cumulative batteries pass (or the one permitted D576 serial rerun proves load-only flakiness);
- all 66 fixture bytes and the frozen contract hash remain unchanged.

Stop as `BLOCKED` rather than weaken the guard if real config requires network/listeners, projects cannot be enumerated, a required serve/test environment lacks a resolver/transform path, isolation cannot deny network/writes, candidate lock integrity differs from the mounted installation, or installed Vite/Vitest versions are not `7.3.6`/`4.1.10`.

## 2. Touched-system anatomy

### Proposed files

| File | Purpose |
|---|---|
| `tools/heldout-leak-check.ts` | Retain static direct-reference logic/CLI; merge validated child runtime evidence into the report. |
| `tools/heldout-runtime-guard.ts` | Typed host request/report model, protected identity/graph inventory, sandbox launch, timeout/cleanup, deterministic merge. |
| `tools/heldout-runtime-guard-worker.mjs` | Minimal child that imports installed Vite/Vitest, loads real configs, probes serve/test resolver and transform pipelines, and emits one JSON response. |
| `tests/unit/tools/heldout-runtime-guard.test.ts` | Pure AST handoff, process-limit, protocol-validation, exemption, and unchanged-extended-config Rule N contracts; it never requires namespaces. |
| `tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts` | Real bubblewrap/Vite/Vitest throwaway repositories, isolation, CLI, determinism, real configs, F47–F69, and plugin hooks. |
| `tests/integration-supervisor/vitest.config.ts` | Extends the repository Vitest configuration for the explicitly selected supervisor-only isolation spec. |
| `tests/unit/tools/heldout-leak-check.test.ts` | Remove Rule C assertions; retain N1/N2, direct imports/resolvers/loaders, Git enumeration, and merge/CLI assertions. |
| `package.json` | Add a stable `heldout:guard` script; do not alter dependency ranges or `test:gate`. |

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
                              Vite serve + Vitest root/projects
                              resolve + transform + activated plugin hooks
```

### Protected identity set

Before config execution, construct an immutable set containing:

- canonical real path of `src/vtt/heldout-evaluation.ts` in the throwaway checkout;
- every bound reserve result path/prefix passed to the CLI;
- every regular candidate file (excluding `.git`, `node_modules`, scratch/cache) whose raw bytes contain a bound reserve digest;
- every resolved file, including an otherwise external `node_modules` target, whose bytes contain a bound reserve digest (scan before applying an external traversal stop);
- existing conventional reserve path/seed identities already checked statically.

For identity only, parse file URLs with `fileURLToPath`, percent-decode via URL semantics, separate meaningful query/fragment suffixes, and resolve symlinks/realpaths inside the sandbox. Canonical rows rewrite absolute checkout paths to `<candidate>/…`; raw IDs live only in non-canonical diagnostics. Load/transform virtual IDs and scan their source recursively. An unsupported scheme or external result outside the audited boundaries below is unresolved and fails closed.

## 3. Decisions with alternatives

### A. Use real pipelines; avoid double config execution

Use:

- `createServer({ root, configFile, configLoader: 'runner', appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null } })` for serve;
- `createVitest('test', { root, config, configLoader: 'runner', watch: false, passWithNoTests: true, api: false }, overrides)` for root/project discovery, then `close()` in `finally`.

`createServer` already calls `resolveConfig`, which calls `loadConfigFromFile`, runs `config`, resolves environments, and runs `configResolved`. Calling `loadConfigFromFile` first would execute side-effectful candidate code twice. It is not used in production orchestration.

Discover each repository-root `vite*.config.{ts,mts,cts,js,mjs,cjs}` and `vitest*.config.{ts,mts,cts,js,mjs,cjs}` with the existing config filename selector. Create a separate bounded phase for each Vite serve config. Create Vitest once per selected root Vitest config, then let that instance discover inline projects, project globs, and `extends` chains through its installed implementation. A duplicate physical config reached by two declared entry points retains both configuration identities in evidence.

Rejected: direct config import plus reading `resolve.alias`; it misses plugin hooks, project expansion, and command/environment branches. Rejected: `createIdResolver` alone; it cannot prove arbitrary configured hooks ran in real order.

### B. This slice exercises serve and test, not build

For serve, call every `server.environments[name].pluginContainer.resolveId` and `environment.transformRequest`.

Do not call `createBuilder`, do not inject a build audit plugin, and do not use `build.write: false`. Vite declares the builder experimental at `node_modules/vite/dist/node/index.d.ts:2227`; it may reload configuration (`node_modules/vite/dist/node/chunks/config.js:33995`), worker plugins have a separate pipeline (`:35634`), and this repository has meaningful output-phase behavior at `vite.config.ts:127`. Treating serve as build would omit `apply: 'build'` plugins and production branches. Build and worker-pipeline auditing are a later slice in the coverage ledger, not a stopping condition here.

### C. Traverse runtime-value edges with environment ownership

Ordinary seeds are candidate `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` under `src/` or `tools/`, excluding declarations, scratch/cache, existing `EVALUATION_FILES`, and explicit evaluation-only tooling. Tests retain their current exemption.

Environment ownership is explicit:

- `src/**` seeds go to the client/browser Vite serve environment and to every selected Vitest project's configured execution environment. Ordinary source ownership is conservatively shared: test globs and directory containment never exclude a source. Only a future explicit ownership manifest may narrow this assignment;
- `tools/**` seeds go only to Node/SSR-style Vite or Vitest environments, never to the browser/client environment;
- the Vitest root server and every project server are enumerated separately; a seed is never sprayed into an environment merely because that environment exists.

Runtime traversal follows **value edges only**: static imports that survive erasure, dynamic imports, value re-exports, recognized worker/URL loading edges, and imports emitted by real `import.meta.glob` transformation. Direct worker/URL specifiers are resolved in the owning serve/test environment in this slice; the separate worker build/plugin pipeline remains deferred. `import type`, `export type`, type-only specifiers, JSDoc type imports, and all other erased edges remain authoritative static checks and never become runtime leaks. This distinction is required by the permitted type-only edge at `src/vtt/room-generator.ts:37`, reached from `src/vtt/watabou-adapter.ts:18`.

For each seed/environment:

1. parse only literal runtime-value source edges with the retained AST discovery, while sending erased edges only to the static wall;
2. resolve exact `(specifier, importer)`;
3. transform the importer through the real environment;
4. traverse `deps`, `dynamicDeps`, and imports parsed from transformed code;
5. load/transform virtual IDs and scan their source;
6. stop at protected IDs and deduplicate cycles by `(configuration, project, environment, phase, importer, specifier)`.

Computed direct edges remain static `unresolved_module_edge` findings; runtime traversal does not make them acceptable.

External-boundary rule: resolve first and run protected-identity checks after canonicalization, before stopping. A canonical Node builtin identity is recorded as `external_builtin`. A bare package may stop as `external_dependency` only when its canonical resolved file is contained by the mounted `/work/node_modules` and its package provenance is present in the candidate lock that equals the trusted installation baseline. An opaque `external: true` result is unresolved. Candidate-local packages, workspace links, aliases back into the checkout, virtual modules, URLs, unknown schemes, unresolved bare imports, and anything outside the read-only candidate/node_modules mounts do not qualify and must be traversed or fail closed. Trust in the installation baseline is an explicit gate assumption; lock metadata alone does not authenticate installed bytes. Vite's browser replacement behavior for Node APIs (`node_modules/vite/dist/node/chunks/config.js:32671`) is evidence, not permission to feed `tools/**` into the browser.

### D. Resolver feature handling

| Feature | Treatment |
|---|---|
| `import.meta.glob` | Transform every ordinary importer; traverse Vite-generated imports and returned dependency lists. No custom glob matcher affects verdicts. |
| `?raw`, `?url`, `?worker`, `?inline`, `?init`, `?import`, `?no-inline`, fragments | Resolve/transform exact suffixed IDs; retain suffix in evidence; remove only for canonical file comparison. Run protected-control probes with supported suffixes. |
| `optimizeDeps` | Defer optimizer execution and origin tracing. Force `optimizeDeps.noDiscovery: true` and `optimizeDeps.include: []` before optimizer initialization, including project/environment overrides, and assert the effective values. This combination disables optimization in installed Vite (`node_modules/vite/dist/node/chunks/config.js:31891,34890`). Do not accept optimized/prebundle IDs as coverage in this slice. Strip `v`/`t` only when the parameter is positively identified as Vite-owned volatility; otherwise preserve it as meaningful. |
| `ssr.noExternal` / environment `noExternal` | Probe actual client and server/SSR environments. Record external status; do not model the option. |
| `resolve.conditions` / SSR conditions | Preserve actual resolved environment conditions and record them as environment metadata. |
| aliases | Resolve every string alias key from each resolved config with a stable synthetic importer and also resolve graph imports. For regex aliases, use actual regexes against graph specifiers and inspect replacements; if no faithful diagnostic probe exists, record unresolved. |
| held-out controls | Resolve held-out relative/absolute/`file:` IDs and query variants in every applicable serve/test environment with `source: 'protected_control'`; record mapping but do not count the intentional control as a leak. |
| package `imports`/`exports`, tsconfig paths | Use real resolver/importer paths. Config changes trigger candidate-wide runtime traversal; no static selector is authoritative. |

### E. Vitest projects without tests

`createVitest` returns after `_setServer` resolves configured projects. Inspect the root Vite server separately from `vitest.projects`; for each project probe all `project.vite.environments`, tagged with project name and `project.config.environment`. Probe the configured client or SSR path because installed Vitest chooses between them by environment.

Initialization is not side-effect-free: it loads VCS state (`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13125`), resolves projects and runs activated `configureVitest` hooks (`:13150-13158`), creates the core/root project separately (`:13172`), and initializes reporters/caches (`:13096-13111,13177-13178`). It calls `listen()` if an API port survives resolution (`:14222`), so pass API-off overrides and verify the resolved root and every project has API disabled before continuing. Do not call `startVitest`, collect tests, initialize global setup, or launch a browser. Any future browser project fails closed; provider startup requires a separately approved slice.

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

F49–F57 tests that independently prove N1/N2 remain static. Syntax and loader-escape cases are not forced into a runtime “protected” assertion when their contract is fail-closed syntax recognition. No direct-loader assertion is deleted or weakened.

#### Exact regression routing (r4–r21)

Migration is audited by **assertion and control**, not declaration count: inventory each positive assertion, exact finding/status assertion, clean control, unresolved control, and false-positive guard before rewriting a declaration. Existing cases are either retained as static contracts or re-expressed in the runtime table without losing those assertions:

| Existing finding groups | Disposition |
|---|---|
| F1–F5, F7, F9–F11, F16, F22, F34–F36 | Retain static parsing/canonicalization/AST-coherence tests: multi-argument imports, transparent wrappers, queries/file URLs, worker/script edges, inline data modules, JSDoc, Git rename enumeration, whitespace URL handling, declaration-file exclusion, shared checker/source identity, ambient shadowing, and nested binding propagation. Add runtime query/file/data controls where they exercise resolver identity, but static expectations remain authoritative. |
| F6, F12, F18 | Retain static recognition that `import.meta.glob` is a loader edge and that nonconstant inputs fail closed. Move matching/base/extglob/options/leading-`**`/alias expansion truth to runtime transform fixtures using installed Vite. Remove static assertions that claim exact Vite glob matching. |
| F8, F14–F15, F20, F23–F25, F28–F30, F32, F38, F40–F41, F43, F49–F52, F55–F57 | Retain all Rule N1/N2 and generic loader-escape assertions, including namespaces, aliases, workers, computed/destructured members, re-exports, await restrictions, and false-positive controls. Add a runtime case only when the case also supplies executable configuration or an actual value edge; the static expectation remains sufficient for syntax-only cases. |
| F13, F19 | Migrate package `imports` exact/wildcard/conditional-resolution expectations to runtime fixtures. Retain only syntax-level recognition of a `#` import edge; remove the static package-map resolver assertions/functions. |
| F17, F21, F26–F27, F31, F33, F37, F39, F42, F44–F48, F53–F54, F58–F69 | Migrate every configuration-shape, configuration-change sweep, alias discovery, project, spread/address/placement, mutation/transfer, and real-tree config assertion into `heldout-runtime-guard.test.ts`. The old declarations are rewritten/moved rather than deleted; each still has the same positive leak and clean mutant/control. |
| F4 query controls and F67–F69 current round-21 cases | Keep exact specifier suffix normalization as a static direct-edge test, and also exercise it in runtime resolution. Migrate F67 object/array spread semantics, F68 project `extends`, and F69 embedded config references to runtime-only configuration verdicts. |

Within `heldout-leak-check.test.ts`, remove only expectations against `configuredAliasPrefixes`, `configuredAliasRegexes`, `unresolvedResolutionConfigPaths`, `candidateConfigurationFiles`, `HELDOUT_LEAK_FLOW_AUDIT` Rule C rows, and static `viteAliases` outcomes. Keep report validation, `astInspectedFiles`, candidate enumeration, all direct finding kinds, and Rule N scope tests. Add an assertion/control manifest during migration so an accidental `.skip`, `.todo`, deletion, weakened exact status, or lost mutant is detectable.

### G. Deterministic report extension

Keep `protocol: 'heldout-ordinary-v1'` and existing fields. Add:

```ts
readonly configurationLoad: readonly {
  readonly file: string;
  readonly kind: 'vite-serve' | 'vitest-root' | 'vitest-project';
  readonly project: string | null;
  readonly environment: string;
  readonly status: 'loaded' | 'failed' | 'timed_out' | 'isolation_failed';
  readonly errorClass: string | null;
}[];

readonly resolution: readonly {
  readonly configuration: string;
  readonly environment: string;
  readonly project: string | null;
  readonly phase: 'resolve' | 'transform';
  readonly conditions: readonly string[];
  readonly specifier: string;
  readonly importer: string | null;
  readonly resolvedId: string | null;
  readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control';
  readonly status: 'clean' | 'protected' | 'unresolved' | 'control' | 'external_builtin' | 'external_dependency';
}[];
```

Add finding kinds `runtime_protocol_resolution` and `configuration_load_failed`. Validate child JSON from `unknown` with exhaustive predicates; never use `any`.

Sort configuration rows by `(file, kind, project, environment, status, errorClass)` and resolutions by `(configuration, project, environment, phase, importer, specifier, source, resolvedId, status)`. Deduplicate identical resolution facts while retaining distinct configuration/project/environment/phase identity. Canonical `resolvedId` and importer fields rewrite the checkout prefix to `<candidate>/…`, preserve meaningful query suffixes, and strip volatile `?v=`/`?t=` parameters only when the exact unmodified ID is retained in a bounded sidecar diagnostics log outside `HeldoutLeakReport`, the verdict, and the canonical hash. Each raw diagnostic is keyed by configuration/project/environment/phase and the canonical row key. Vite hashes discovered dependencies with a session timestamp (`node_modules/vite/dist/node/chunks/config.js:34108,34344-34345`), which is why optimizer execution is deferred. Normalize separators/error classes and omit timings, PIDs, random paths, and stacks from the canonical section. The byte-identical-report contract applies to the canonical configuration/resolution/findings section only; diagnostics are explicitly outside that contract.

### H. Assert installed dependency provenance without manifest churn

Do not change dependency ranges or regenerate the lockfile. At startup, compare `package-lock.json` package records and mounted `node_modules/vite/package.json` / `node_modules/vitest/package.json`; require exactly Vite `7.3.6` and Vitest `4.1.10`, and require candidate lock integrity to match the installed read-only tree. Any mismatch, missing integrity, or attempted install/fetch is a configuration-load failure.

Rejected: trusting semver ranges or installing to reconcile drift. Either could silently alter project discovery, hook ordering, environments, or executable dependency code.

## 4. Security and side effects

Loading config executes candidate config files and their imports plus activated plugin `config`, `configResolved`, `configureServer`, `configureVitest`, `resolveId`, `load`, and `transform` hooks. Activated plugins from the lock-verified `node_modules` tree are in scope; dormant dependency plugins are not executed or scanned. This is intentional because those hooks determine serve/test resolution, and the normal gate already executes candidate test/config code. The runtime guard gives that execution less authority.

The trusted parent must:

1. run the Step 0 isolation preflight and refuse to start unless `/usr/bin/bwrap` is version `0.6.1` (or a separately approved compatible version), unprivileged user/network namespaces work, read-only mounts reject writes, only scratch is writable, and the network namespace has no route to the host or external network;
2. create a `mkdtemp` scratch root;
3. extract `git archive <candidate>` (or a synthetic fixture map) into a checkout with no `.git`;
4. verify candidate lock data matches mounted installed Vite/Vitest versions/integrities;
5. launch a new process group under `/usr/bin/bwrap`, unsharing user/PID/IPC/UTS/cgroup/network namespaces, dropping capabilities, applying rlimits, and using parent-death cleanup; no custom seccomp policy is part of this slice;
6. resolve the runtime root from the real path of `process.execPath` (`dirname(dirname(execPath))`), require `<runtime-root>/bin/node --version` to equal `process.version`, mount it read-only at `/opt/node`, and invoke `/opt/node/bin/node`; mount candidate at `/work` read-only, guard code at `/guard` read-only, dependencies at `/work/node_modules` read-only, `/usr`, `/lib`, and `/lib64` read-only for the C runtime, PID-namespace-local `/proc`, minimal `/dev`, and only `/scratch` writable; bind `/scratch/tmp` as `/tmp`, `/scratch/home` as HOME, set `PATH=/opt/node/bin:/usr/bin:/bin`, and set the child working directory to `/work`;
7. omit host project, Git metadata, credentials, home, agent/Docker sockets, and sibling worktrees;
8. use `env -i` with only PATH, NODE_ENV, CI, locale, HOME/TMP/cache variables, and request/result descriptors; remove proxies/tokens/cloud/model credentials;
9. mount only PID-namespace-local `/proc`; no host procfs is exposed;
10. enforce 30 seconds per configuration or project phase and 120 seconds aggregate; count the current UID's threads from `/proc/*/status` and launch through `prlimit --nproc=max(2048,current+1024) --nofile=1024 --fsize=16777216 --cpu=300`, recording both the measured count and selected cap. `RLIMIT_NPROC` is UID-wide and counts threads, so this is bounded headroom rather than task-local containment. Invoke Node with `--max-old-space-size=1024 --max-semi-space-size=64`; do not impose `RLIMIT_AS`, because Node 24/V8 reserves virtual address ranges larger than its live heap; kill and reap the new process group on expiry without changing existing repository test timeouts;
11. accept exactly one bounded JSON response on a dedicated pipe; extra/malformed/oversized output, signal, abnormal exit, missing close, or timeout fails closed;
12. delete only the validated exact `mkdtemp` child in parent `finally`.

No guard-owned server listens. API/HMR are forced off and middleware mode is used. The network namespace prevents candidate config/plugins from reaching host or external TCP/UDP endpoints, including host port 4173; it does not prohibit candidate code from opening a socket wholly inside its private namespace, because this slice adds no seccomp policy. Outside writes fail. Config throw/hang/install/network/exit/close failure becomes `configuration_load_failed` (with `failed` or `timed_out` configuration status), and no affected edge/environment can be reported clean; a failed platform/mount/network preflight becomes `isolation_failed`. Neither condition is skipped. `env -i` plus `unshare -Urn` is not a fallback because it does not hide host files. Linux plus bubblewrap is required for an authoritative pass.

The final passing profile on the implementation machine is `/usr/bin/prlimit --nproc=max(2048,current UID thread count+1024) --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <user/PID/IPC/UTS/cgroup/network namespaces and read-only mounts above> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 <worker>`. It mounts the realpath-derived runtime root `/home/vagrant/.nvm/versions/node/v24.13.0` at `/opt/node` and requires both parent and mounted runtime to be exactly `v24.13.0`. The preflight report records the measured UID thread count, selected cap, three preceding failed attempts (`/usr/bin/node` runtime mismatch; `RLIMIT_AS=1 GiB` V8 code-range reservation failure; fixed `RLIMIT_NPROC=512` below the machine's steady 554-thread UID load), and the passing invocation. Parameter or mount-path failures are adjusted within this boundary; the guard blocks only when an isolation semantic cannot be achieved.

Fixture names and contents remain generic (`@policy`, ordinary/protected modules, anonymous plugins). Apart from the required toolchain package names used to exercise their APIs, do not introduce third-party game, studio, artist, or product names; add a source-text licensing scan to the focused fixture test.

The trust statement is deliberately narrow: **bounded resolver evidence under configuration-execution isolation, not adversarial attestation**. Candidate code shares the worker process with resolver logic and could interfere with same-process APIs or the response channel; mount/user/network isolation limits side effects but does not authenticate the child's conclusions. Hostile-config attestation requires a later independent observer or dedicated CI VM boundary.

## 5. Coverage ledger

| Deferred or residual area | What this slice does not prove | Consequence / later slice |
|---|---|---|
| Build-only configuration and plugins | `apply: 'build'`, production-command branches, build-only aliases, output hooks, and production resolution conditions are not executed. | Add a separately designed `createBuilder` audit adapter; do not infer build safety from serve results. |
| Worker pipelines | Vite creates worker plugins/configuration through a separate pipeline; build and worker transforms may resolve differently. | Audit main and worker pipelines explicitly with independent environment evidence. |
| Optimizer/esbuild rewrites | Dependency discovery is disabled, so optimizer-specific substitutions and esbuild rewrites are not observed. | Add an optimizer-completion/origin protocol before enabling it. |
| Prebundle provenance | No claim connects optimized `?v=<hash>` IDs or prebundled output back to their source graph. | A later slice must retain raw optimizer metadata and prove canonical provenance. |
| Same-process interference and report authenticity | Executed candidate/plugin code shares the child process and may tamper with resolver APIs or emitted JSON. | Current output is bounded evidence, not hostile attestation; use an independent observer/VM for that stronger claim. |
| Dormant dependency plugins and fetched/runtime-generated code | Only plugins activated by the candidate's resolved configuration execute; no network fetch or arbitrary generated-code proof is attempted. | Dormant packages remain outside the claim; unexpected fetch/generation fails closed where encountered. |

Accordingly, acceptance supports only **“no ordinary serve/test path reaches the reserve.”** It does not support a universal “no ordinary code path” claim.

## 6. Dependent implementation steps

### Step 0 — prove the authoritative execution platform

**Resources:** `/usr/bin/bwrap` 0.6.1, the supervisor-confirmed unprivileged user/network namespace support, and the isolation contract in Section 4.

**Implementation:** before reading candidate configuration, launch a disposable canary under the exact planned bubblewrap mount/user/network namespace, `env -i`, capability-drop, and rlimit profile. It must prove candidate/dependency/guard mounts are read-only, a unique scratch path is writable, representative host/home/sibling paths are absent, and host/external DNS/TCP are unreachable. Do not create a listener for the preflight, do not add custom seccomp, and do not fall back to bare `unshare`.

**Gate:** positive scratch write plus negative host-read/outside-write/external-network probes, bounded by the same process-group cleanup. Separately assert API/HMR-off options and spy that guard-owned Vite/Vitest code never calls `listen`; do not bind 4173. Any unexpected success, timeout, malformed canary result, unsupported Linux namespace, or missing/incompatible bubblewrap returns `isolation_failed` before config execution.

**Verification / rollback / assumptions:** run this canary only in the supervisor integration spec/CI platform smoke test, never the pure unit spec, and never touch 4173. Rollback removes the launcher/preflight together. Linux and bubblewrap are explicit platform requirements, not portable assumptions.

### Step 1 — contracts and version assumptions

**Resources:** manifest/lock lines and report/CLI lines cited above.

**Implementation:** define typed request/response/environment/diagnostic rows; extend report additively; impose size/version checks; assert installed Vite `7.3.6`, Vitest `4.1.10`, and candidate lock/integrity equivalence without changing package manifests.

**Gate:** typecheck exhaustive discriminants; test malformed output, version mismatch, unknown fields/status, duplicate rows, and canonical sort.

**Verification / rollback / assumptions:** verify manifest and lock artifact are unchanged. Rollback report fields/script together. Node must satisfy package engines, proven at startup; dependency drift is a fail-closed status, never an install request.

### Step 2 — isolated launcher

**Resources:** `/usr/bin/bwrap`, `/usr/bin/unshare`, safe subprocess patterns in `tools/gate-runner-lib.mjs`, Git candidate enumeration in `tools/heldout-leak-check.ts:1875-1948,3113-3176`.

**Implementation:** archive materialization, validated scratch, the Step 0-proven bubblewrap profile, clean env, JSON pipe, 30-second phase/120-second aggregate limits, timeout/group kill, cleanup.

**Gate:** attempt outbound TCP/DNS, host/sibling/HOME reads, outside writes, scratch write, infinite loop, child storm, malformed/oversized response, `process.exit`. Only scratch write succeeds; every failure is classified and leaves no child/listener.

**Verification / rollback / assumptions:** verify that guard-owned code never listens and that host/external networking is unreachable, without touching 4173. Rollback launcher/worker/script. The sandbox mounts PID-namespace-local `/proc`; the parent reads host `/proc` only for the documented UID thread-count limit calculation.

### Step 3 — identities and ordinary graph

**Resources:** retained AST discovery `tools/heldout-leak-check.ts:100-1699`; Vite transform contract.

**Implementation:** protected sets; environment-owned `src/**` and `tools/**` seeds; separation of runtime-value from erased/type-only edges; URL/query/symlink/virtual/external canonicalization; exact builtin/node_modules stopping rules; cycle-safe graph and byte scanning.

**Gate:** file URL/encoded segment/query/fragment/symlink/virtual value re-export/unknown scheme/result path/digest file/clean module cases; prove type-only edges stay static, `tools/**` never enters client traversal, builtins stop cleanly, and aliased/workspace dependencies do not escape as externals.

**Verification / rollback / assumptions:** prove control rows do not count while identical graph rows do. Rollback runtime inventory only. Missing local resolver inputs fail closed.

### Step 4 — Vite adapters

**Resources:** Vite APIs/hook order/import-glob citations above.

**Implementation:** serve server per config/mode; disable dependency discovery with `noDiscovery: true` and empty includes; enumerate every `server.environments[*]`; run resolve/transform probes and generated runtime dependency closure; always close resources.

**Gate:** serve-command aliases; activated `config`, `configResolved`, `configureServer`, `resolveId`, `load`, and `transform` hooks; glob output; raw/url suffixes; SSR/noExternal; environment conditions; optimizer-disabled assertion. Build-only and worker-pipeline cases are absent by design and listed in Section 5.

**Verification / rollback / assumptions:** compare direct and transformed serve evidence across all exposed environments. Rollback the serve adapter. Missing required serve environments fail closed; no build equivalence is asserted.

### Step 5 — Vitest adapter

**Resources:** Vitest project APIs/discovery citations above.

**Implementation:** `createVitest` once per selected root Vitest config with API/watch disabled and optimizer discovery disabled; enumerate its root server separately from every project/config/server; probe all project Vite environments; include inline/glob/extends; close each instance once.

**Gate:** inline project aliases, glob config, extends chain, missing/throwing extends, project conditions, and project plugin ending in protected resolution. Assert VCS/configureVitest/reporter/cache initialization is bounded in scratch; resolved API port is off; real config loads without tests/global setup/listen. Future browser projects fail closed.

**Verification / rollback / assumptions:** assert expected root plus project names/count/config paths independently. Rollback adapter/fixtures. Startup version assertions protect the cited initialization behavior.

### Step 6 — retire Rule C and merge evidence

**Resources:** config discovery `tools/heldout-leak-check.ts:1747-1804,1951-3110`; N1/N2 tests.

**Implementation:** remove Decision F items; keep config detection as runtime trigger; make CLI async; validate/merge static+runtime output; add `heldout:guard` script without changing full gate.

**Gate:** static kinds remain green; config-only change redirecting unchanged consumer is caught at runtime; neither clean half masks the other.

**Verification / rollback / assumptions:** `rg` shows no Rule C/reachability/address/placement machinery. Revert as one unit if needed. Existing supervisor CLI args remain the integration contract.

### Step 7 — migrate probes

**Resources:** F47–F69 `it.each` cases and temporary filesystem helpers.

**Implementation:** generate each throwaway repo; retain independent syntax/N1/N2 assertions; pair migrated runtime leaks with an ordinary-target redirect control; add a separate alias/hook-removal unresolved control; add plugin cases.

**Gate:** assert exact configuration/project/environment/phase/specifier/importer/canonical resolvedId/finding, not merely non-empty findings. Redirect controls assert clean rows; removals assert `unresolved` and no protected row; syntax-only cases assert their original static kind.

**Verification / rollback / assumptions:** prove each positive and each control would fail if its relevant status/target comparison were removed. Rollback new table/spec. Dependencies come only from the lock-verified read-only mount.

### Step 8 — integration and performance

**Resources:** `package.json:9-18`, `tools/gate-vitest.mjs:39-105`, established nine-spec command at `.tmp-plans/2026-09-08-heldout-basis.md:234-238`.

**Implementation:** keep pure protocol/AST contracts in the normal unit spec and put namespace/configuration execution in the explicitly selected supervisor integration spec. Invoke the CLI with native Node `--experimental-strip-types`, never `vite-node`, so no candidate configuration can execute before isolation. Stream `git archive` into `tar` rather than buffering the candidate. Add the named script; cache only within an invocation and key by candidate/config/lock/environment.

**Gate:** canonical configuration/resolution/findings output repeats byte-identically; raw volatile diagnostics are compared only after the specified normalization boundary; time/resource failures remain findings. Optimize only by batching fixtures/bounded concurrency, never by reusing resolved configs across candidates.

**Verification / rollback / assumptions:** run Section 8 with logs. Delete runtime host/worker/spec/script and restore Rule C as a single rollback. Enforce the decided 30-second phase and 120-second aggregate budgets; only the new successful-CLI integration assertion receives the matching 120-second outer budget, and no existing test timeout changes.

### Review hardening incorporated in fix round 1 (RG-F1–RG-F9)

- The launcher uses the measured UID thread count plus bounded headroom (minimum 2048), and the pure unit suite does not depend on bubblewrap. Isolation/CLI/resource tests live under `tests/integration-supervisor`.
- The package entry point is configuration-free native Node, rejects incomplete arguments, runs preflight before candidate extraction or configuration loading, and has subprocess controls for missing arguments, isolation failure, and successful inspection.
- Both runtime-guard implementation files are explicit evaluation-tool exemptions. Candidate-wide retained static inspection covers `src/**`, `tools/**`, root Vite/Vitest configs, and extended configs in the candidate source pool.
- The retained TypeScript AST pass hands runtime-value edges to the worker with importer and loader kind: value imports/re-exports, dynamic imports, `require` and exact aliases, `require.resolve`, `import.meta.resolve`, direct/aliased `import.meta.glob`, workers/scripts, constant concatenations, and constant templates. Type-only edges remain static. Aliased glob calls fail closed because installed Vite only macro-expands direct syntax.
- Every non-boundary resolution is loaded/transformed or unresolved. Boundary classification uses canonical resolved identity after protected checks; opaque externals fail closed. Intentional protected controls have an independent visited set and cannot consume ordinary traversal provenance.
- Rule N remains candidate-wide, including unchanged extended configuration. Reports carry independently asserted eligible/AST-inspected counts. Every retired Rule C assertion/control is routed to an executable fixture or an explicit clean/unresolved runtime invariant; Rule C itself is not restored.
- Close hooks are invoked at the environment plugin-container boundary before outer Vite/Vitest cleanup, whose implementations may settle/log failures. A rejected close becomes a configuration-load finding. Timeout cleanup kills and waits for the process group, then proves no fixture child or scratch directory survives.
- Worker JSON is decoded from `unknown` with exact top-level/row keys, field types, discriminants, request-slice equality, count equality, and completion/preflight evidence. Malformed rows and extra fields reject.
- Traversal is deterministic and sequential over sorted queues. Shared modules retain deterministic provenance independent of resolver delays; configuration errors are canonical error classes without raw messages, stacks, timing, or scratch paths.

## 7. Runtime probe matrix

Each migrated configuration case uses a throwaway repo with `src/consumer.ts`, `src/ordinary.ts`, and the protected module. Inventory the assertions and controls below individually; parameterized declaration counts are not evidence of coverage. “Redirect” means the same alias/hook maps `@policy` to `src/ordinary.ts` and must produce a clean canonical row. “Remove” means the consumer remains but the alias/hook is removed and must produce `unresolved`, not clean. Pure syntax/loader cases retain their static finding and control and are not manufactured into runtime protected resolutions.

| Finding | Positive assertion(s) | Passing control(s) | Removal / retained-static control |
|---|---|---|---|
| F47 | Getter, computed property, and side-effect config shapes execute; `@policy` resolves protected. | Redirect each effective alias to ordinary. | Removing the effective alias is unresolved. |
| F48 | Named-exported shared config still yields protected resolution through its default export. | Redirect shared alias. | Named-export static/config-reference expectations retire with Rule C; removal is unresolved. |
| F49 | Configuration using a local namespace/loader bridge resolves protected when executed. | Inert local re-export remains clean. | Namespace/loader bridge and re-export escape assertions remain static; no runtime protected assertion is required for syntax-only variants. |
| F50 | Any configuration mutation variant that uses the computed form and produces an alias resolves protected. | Redirect resulting alias. | Computed resolver/worker access remains static `loader_reference_escaped`; clean non-loader member stays static. |
| F51 | Executed config variants that derive an alias through quoted/nested/rest destructuring resolve protected. | Redirect resulting alias. | N2 quoted/nested/rest guards and clean `addEventListener` extraction remain static. |
| F52 | Executable config variant, if present, resolves protected through the real resolver. | Redirect executable alias. | Awaited `import.meta` forms remain static N1 escapes; do not require runtime execution of invalid syntax. |
| F53 | Direct Vitest alias and `mergeConfig` alias resolve protected in root/project evidence. | Redirect both aliases. | Removing each alias is unresolved; real Vitest config is clean. |
| F54 | Opaque plugin-array side-effect config resolves protected. | Plain calls with no alias mutation and ordinary redirect are clean. | Removal is unresolved. |
| F55 | Executed config mutation variant resolves protected if it has a value edge. | Redirect its resulting alias. | Boxed/untyped loader-key destructuring remains static N2; inert destructuring stays clean. |
| F56 | A real configured worker/value edge, if present, records its real serve/test result. | Ordinary worker target, where supported. | Typed-global computed loader use remains static fail-closed; worker-pipeline/build coverage is ledgered, not implied. |
| F57 | Allowed awaited builtin import produces no spurious static escape and can support executable config. | Inert builtin use is clean. | `await createRequire(...)` and `await require` remain static escapes only. |
| F58 | Mutations through `resolve.alias` and `test.alias` addresses are observed as protected aliases. | Redirect both maps. | Removing each mapping is unresolved. |
| F59 | Helper-built `test` config and literal `test.alias` resolve protected through Vitest. | Redirect helper/literal targets. | Missing alias is unresolved; actual Vitest config is clean. |
| F60 | `Symbol.hasInstance` mutation changes the effective alias and resolves protected. | Strict equality version with ordinary/no mutation is clean. | Removal is unresolved. |
| F61 | Escaping mutation variant resolves protected. | `const` alias plus `void` produces no finding. | Alias removal with consumer is unresolved. |
| F62 | Shorthand `resolve`/`test` and capable-spread mutations resolve protected. | Same shapes without install/mutation discover the ordinary redirected alias. | Removed alias is unresolved. |
| F63 | Empty root mutated before direct export, root spread, and callback return resolves protected. | Same roots without mutation and with ordinary redirect are clean. | Alias absent with consumer is unresolved. |
| F64 | Direct alias-array entry, const-entry alias, `test.alias`, spread entry, and dual-placement rewrites resolve protected. | Alias entry points to ordinary; plugin-only placement stays clean. | Alias absent is unresolved. |
| F65 | Direct, const-entry, and two-level indirect dual-placement accesses resolve protected after mutation. | Rules placed only under plugins remain clean. | Removing alias placement makes consumer unresolved. |
| F66 | Shorthand/referenced/inline project objects and literal project aliases appear under the exact project server/environment and resolve protected. | Equivalent project alias redirects ordinary; plugin list stays clean. | Missing project alias is unresolved. |
| F67 | Object-spread last-write and array runtime-index cases resolve the effective protected alias. | Later explicit property and leading-safe element controls resolve ordinary/clean. | Alias removal is unresolved. |
| F68 | Project `extends` file/chain and a chain ending in an activated plugin resolve protected in the final project. | `extends: true` with clean root and ordinary redirected target are clean. | Nonliteral, missing, throwing, or removed target is `configuration_load_failed`/`unresolved` exactly as applicable. |
| F69 | Mutation through terminal `resolve`/dual placement resolves protected. | Terminal known plugin array remains clean. | Removed alias is unresolved. |
| Plugin `config()` | Activated hook adds `@policy`; consumer resolves protected. | Same hook redirects ordinary. | Hook absent leaves `@policy` unresolved. |
| Plugin `resolveId` | Activated hook returns held-out path; exact canonical protected row is emitted. | Hook returns ordinary path. | Hook absent is unresolved. |
| Plugin `configResolved` | Hook mutates state consumed by that activated plugin's `resolveId`; the subsequent real container resolution records protected. | The same state redirects ordinary. | Hook absent is unresolved. |
| Activated dependency plugin | The fixture activates installed `automockPlugin()` from `@vitest/mocker/node` while resolving `@policy` through the same real Vite pipeline; configuration-load and protected-resolution evidence must both be present. | The same activated dependency plugin with the alias redirected resolves ordinary. | The installed plugin is imported/constructed but omitted from `plugins`; an ordinary consumer remains clean, proving dormant dependency code is not scanned or executed as a candidate edge. |
| Project plugin chain | Vitest project `extends` chain activates a plugin; final project/environment resolves protected. | Final plugin redirects ordinary. | Plugin absent is unresolved. |

Mandatory controls:

- actual `vite.config.ts` in every serve environment and actual `vitest.config.ts` root/projects: zero findings;
- actual ordinary graph: zero findings;
- `@policy -> src/ordinary.ts`: clean resolution row;
- no alias/hook: unresolved `@policy` produces exact `unresolved` evidence and is not misreported protected or clean;
- held-out self-probes appear only as `control`;
- real-tree copies with injected alias and injected resolver hook each produce exactly the deduplicated expected protected findings.

## 8. Gate battery and negative controls

Store full logs under `.tmp/heldout-runtime-guard-01/`; report exact commands, exits, file count, and test count.

### Focused

```sh
npm run typecheck:fast
sg scan
git diff --check
npx vitest run --configLoader runner tests/unit/tools/heldout-runtime-guard.test.ts
npx vitest run --configLoader runner --config tests/integration-supervisor/vitest.config.ts \
  tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
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

## 9. Determinism and operational rules

- Inputs are candidate tree/config/lock hashes, slice, reserve bindings, and modes. Cache only within one invocation.
- Fresh child/module cache per candidate/fixture.
- Sort config/environment/graph queues; do not reorder real plugin hooks.
- Canonical report uses `<candidate>/…` identities and stable errors, retains meaningful queries, strips volatile `?v=`/`?t=` only with raw diagnostics, and excludes timings/PIDs/temp names/stacks. Byte identity applies to this canonical section only.
- Resolver `null` for an ordinary edge is unresolved, not silently clean. Only recorded Node builtins and lock-verified `node_modules` externals are clean traversal boundaries; remote content is never fetched.
- Config load/close errors are findings even if partial resolutions exist.
- Alias diagnostics supplement rather than replace graph traversal.
- Begin serially; raise only bounded resolver concurrency after repeatability proof.
- Activated dependency plugin hooks run and are in scope; dormant dependency code is out of scope.
- Start with dependency discovery disabled (`noDiscovery: true`, `include: []`); optimizer/prebundle evidence is not generated or accepted in this slice.

## 10. Decisions taken (D607.1)

1. Activated `node_modules` plugins are in scope; dormant plugins are out.
2. Dependency manifests and the lockfile do not change. Startup requires installed Vite `7.3.6`, Vitest `4.1.10`, and candidate-lock integrity equality; drift fails closed.
3. Limits are 30 seconds per configuration/project phase and 120 seconds aggregate, with no repository test-budget changes.
4. Future browser projects fail closed; provider startup is not authorized.
5. Unresolved imports fail closed except the explicitly audited, recorded Node-builtin and lock-verified external boundaries in Decision C.
6. The guard never installs or fetches dependencies; candidate lock integrity must match the mounted installed tree.
7. Linux plus working bubblewrap isolation is required for an authoritative pass. There is no bare-`unshare` fallback and no custom seccomp policy in this slice.
8. Identical rows are deduplicated only within the same configuration/project/environment/phase identity; those dimensions are always retained.
9. This slice ships serve/test resolution and transforms only. Build, worker-pipeline, optimizer-origin, and hostile-report-attestation coverage remain in Section 5.

No owner questions remain open for this slice. Implementation stops for amendment if a cited installed API cannot satisfy one of these decisions without broadening scope.

## 11. Assumptions to prove

1. Node 24.13.0 runs with a PID-namespace-local `/proc`; the host uses `/proc/*/status` only to select and record the UID-wide `RLIMIT_NPROC` headroom.
2. Step 0 proves `/usr/bin/bwrap` 0.6.1, user/network namespaces, read-only mounts, scratch-only writes, and no network in supervisor/CI; a failure becomes `isolation_failed`.
3. `createVitest` 4.1.10 materializes every project before return, while separately creating/retaining a core/root project (`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13150-13172`).
4. `createVitest` initialization loads VCS state (`:13125`), calls activated `configureVitest` hooks (`:13150-13158`), and initializes reporters/caches (`:13096-13111,13177-13178`); all writes remain in scratch.
5. Passing `api: false` and checking resolved configs prevents the `server.listen()` branch at `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14222`; `vitest.close()` closes root/projects without global setup/tests.
6. Vite 7.3.6 transform dependencies expose runtime import-glob output completely when optimizer discovery is disabled.
7. Real configs load under `env -i`; only proven non-secret defaults may be added.
8. The supervisor-provided installed dependency tree is a trusted baseline. Candidate lock equality plus installed Vite/Vitest version assertions prove candidate provenance relative to that baseline, not cryptographic authenticity of the installed bytes; no install is required or permitted.
9. Ordinary graph exemptions remain exactly evaluation-only tooling plus tests. Every `src/**` seed is assigned to every selected project environment unless a future explicit ownership manifest narrows it; test globs and paths are never treated as ownership evidence.
10. Every required Vite serve and Vitest root/project environment exposes public resolve and transform APIs; a future browser project is expected to fail closed rather than initialize a provider.

## 12. Rollback

Rollback is code-only, not a data migration:

- remove runtime host/worker/spec/package script;
- restore pre-D607 Rule C and tests from Git as one unit;
- remove additive runtime report fields/kinds;
- keep retained N1/N2/direct-reference checks;
- delete only validated runtime scratch paths.

No fixture, frozen contract, schema, docs, expectation pin, application data, or external service changes in implementation or rollback.

## 13. Final acceptance

Pass only after installed Vite/Vitest have executed every candidate configuration/project/activated-plugin path needed for the real **serve/test** resolvers, every runtime-value edge was resolved/transformed in its applicable Vite serve or Vitest root/project environment, erased/type-only edges retained their static verdicts, all diagnostic controls completed, and no non-control resolution reaches a protected identity. Missing required serve/test environments, opaque results, unresolved ordinary imports outside audited boundaries, load errors, timeouts, isolation/version/lock/cleanup failures all fail closed.

This replaces an expanding static model of executable configuration with bounded evidence from the actual serve/test resolvers while retaining static checks that are genuinely syntax facts. It establishes “no ordinary serve/test path reaches the reserve”; Section 5 prevents that result from being overstated as build, worker, optimizer, or adversarial-attestation coverage.
