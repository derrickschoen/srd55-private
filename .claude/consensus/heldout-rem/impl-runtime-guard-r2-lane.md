Implemented all RG-F1–RG-F9 fixes. The runtime guard now uses isolated real Vite/Vitest resolution, while the static wall retains Rule N and direct-reference authority.

Key outcomes:

- Configuration-free native Node CLI; no `vite-node` execution before isolation.
- Dynamic `RLIMIT_NPROC`: `max(2048, observed UID threads + 1024)`.
- Exact Node `v24.13.0`, Vite `7.3.6`, and Vitest `4.1.10` enforcement.
- Pure unit tests separated from bubblewrap integration tests.
- Runtime AST handoff covers `require`, aliases, constant concatenation, `require.resolve`, `import.meta.resolve`, and glob handling.
- Every non-boundary result is transformed or fails unresolved.
- Strict worker-report validation, deterministic traversal, canonical errors, close-failure observation, and child reaping.
- Installed dependency plugin covered in both activated and dormant configurations.
- Rule C remains retired; no superseded reference-following machinery remains.

### Verification

- `npm run typecheck:fast` — passed.
- `sg scan` — passed.
- `git diff --check` — passed.
- Untracked-file `git diff --no-index --check` harness — passed.
- `node --check tools/heldout-runtime-guard-worker.mjs` — passed.
- `npx vitest run --configLoader runner tests/unit/tools/heldout-runtime-guard.test.ts` — 18/18 passed without namespaces.
- `npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts` — 239/239 passed.
- `npx vitest run --configLoader runner --config tests/integration-supervisor/vitest.config.ts tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts` — 251/251 passed.
- Ten-spec cumulative command from the plan — 493/493 passed; no serial rerun needed.
- Real Vite and Vitest controls — zero findings, 770 eligible files and 770 AST-inspected files each.
- Injected alias control — exactly 5 protected findings, 771/771 files.
- Injected `resolveId` control — exactly 3 protected findings, 771/771 files.
- Protected fixture manifest — 66/66 verified; digest `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`.
- Frozen contract — `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

The exact real-tree command was run twice:

```sh
npm run heldout:guard -- --protocol heldout-ordinary-v1 --base HEAD --candidate HEAD --slice F --reserve-digest 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef --result-path /home/vagrant/dnd-slim-runs/heldout-a-
```

Both runs:

- exited 0;
- produced 13,916,807 bytes;
- produced zero findings;
- reported runtime completion;
- were byte-identical;
- had SHA-256 `30ae08a43e7696cd4288794964a02f5fa1c257e2c969143a80c96449746d7059`.

Preflight records four attempts: distribution-Node mismatch, unsuitable `RLIMIT_AS`, fixed `RLIMIT_NPROC=512` exhaustion, and the passing load-aware profile. The final cap was 2048. The sandbox verified read-only mounts, scratch-only writes, isolated home, unavailable external networking, capability dropping, a new session, and parent-death behavior.

### RG-F6 removal accounting

All 58 retired declarations and 70 assertions were routed as follows:

| Old line | Runtime/static replacement |
|---:|---|
| 432 | Exact, wildcard, array-query, and object-query glob transform fixtures. |
| 458 | Negative-glob ordering fixture and clean mutant. |
| 471 | Exact `?raw` canonical specifier and resolved-ID assertions. |
| 496 | Literal `base` fixture. |
| 507 | Based leading-globstar fail-closed fixture. |
| 516 | Literal option-spread plus base fixture. |
| 529 | Aliased `import.meta.glob` explicitly unresolved because Vite cannot macro-expand it. |
| 556 | Leading `**` unresolved plus ordinary non-protected mutant. |
| 565 | Extglob transform plus package/alias-glob unresolved controls. |
| 1460 | Exact and patterned package-import fixtures. |
| 1475 | Unmapped package import explicitly unresolved. |
| 1486 | Exact mapping competing with wildcard. |
| 1504 | Overlapping-pattern ordering with corrected ordinary redirect mutant. |
| 1522 | Conditional exact target with competing `#*` wildcard. |
| 1545 | Nested package-condition fixture. |
| 1570 | Candidate-wide runtime traversal plus eligible/inspected counts; no change-only selector remains. |
| 1592 | Every config fixture traverses the unchanged consumer; native CLI inspects the complete candidate graph. |
| 1608 | Shorthand object, identifier array, array spread, relative regex, and nonliteral execution cases. |
| 1647 | Nonliteral alias-source execution failure. |
| 1664 | Scope-shadowed alias spelling fixture. |
| 1686 | Alias-entry spread override fixture. |
| 1710 | Nonliteral alias-entry spread execution failure. |
| 1728 | Whole-variable reassignment and property-assignment fixtures. |
| 1756 | Writes, push, `Object.assign`, reference transfers, and non-mutating spread control. |
| 1797 | Return/receiver write, called closure, class-field mutation, and non-mutating return/class controls. |
| 1834 | Object, array, nested, computed transfers, plus untrackable call-result failure. |
| 1913 | Computed transfer, for-of, for-in, constructor, fill, and shadowed-helper execution. |
| 1962 | Getter, side-effect property, and named-export cases. |
| 1995 | Mutation/helper-argument cases plus property/spread/const-subtree controls. |
| 2047 | `resolve.alias` and `test.alias` address mutations. |
| 2083 | Helper-built Vitest `test` configuration. |
| 2104 | Literal `test.alias` protected and ordinary-target controls. |
| 2128 | `instanceof` mutation, strict equality, and nonsemantic-instance controls. |
| 2155 | Const-alias mutation and `void`/no-op runtime controls. |
| 2175 | Shorthand resolve/test and capable-container spread cases. |
| 2209 | Shorthand resolve discovery with exact ordinary redirect. |
| 2234 | Direct/spread/callback root cases plus nonsemantic build control. |
| 2272 | Direct, const, test, spread, and dual-placement alias-array entries. |
| 2313 | Spread-entry protected and ordinary-target cases. |
| 2338 | Plugin-only placement clean control. |
| 2353 | Direct, const-entry, and two-level indirect placement cases. |
| 2387 | Plugin-only indirection clean control. |
| 2403 | Shorthand, referenced, inline, and helper-mutated project roots. |
| 2434 | Literal project alias with protected and ordinary targets. |
| 2459 | Object spread and actual runtime-index mutation cases. |
| 2486 | Later-property-wins and leading-safe-array controls. |
| 2510 | Terminal resolve, dual-placement, and plugin-array controls. |
| 2541 | Literal project `extends` and plugin-chain cases. |
| 2569 | Helper/variable extends, missing/throwing/outside targets, and cyclic fail-closed evidence. |
| 2597 | `extends: true` clean root reuse. |
| 2608 | Retained static Rule N inspection of an unchanged extended configuration. |
| 2632 | Callback, conditional, and const-spread runtime configurations. |
| 2659 | Direct Vitest `defineConfig` and `mergeConfig`. |
| 2690 | Rule C interpretation intentionally retired; execution fixtures now distinguish effective mutations from harmless runtime behavior. |
| 2717 | Matching regex protected fixture and nonmatching ordinary-import control. |
| 2734 | Both actual configs assert zero findings and exact 770/770 counts. |
| 2741 | Injected alias and resolver controls assert exact findings, identities, and 771/771 counts. |
| 2750 | Declaration-only exclusion asserts 2 eligible, 2 AST-inspected, and no declaration seed. |

The two moved Rule N assertions remain authoritative static tests, including candidate-wide extended-config coverage. The two Rule C audit assertions were the authorized retirements; the loader-only flow audit remains.

Updated plan: [.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md)  
Plan SHA-256: `05cf01f7f6885d9477615bf0561cce4b4dc0b16f9177d3bc28237a7a159725bd`

RUNTIME GUARD R2 DONE
diff --git a/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md b/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
index 9802027b3b0547024ac86a91fb9590c356995688..623912119c5e05ef3d046f90844ced525bd9e8ac
--- a/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
+++ b/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md
@@ -4,7 +4,7 @@
 Decision: D607 / D607.1  
 Planning base requested: `cbdb6429`, with round-21 F67–F69 work initially uncommitted  
 Observed during this read-only planning task: the supervisor completed that work as `3e439b07`; the worktree was clean before this plan was created  
-Status: plan only; no source/test edits, builds, or test runs in this task
+Status: implementation in progress; D607/D607.1 review fix round 1 incorporates RG-F1–RG-F9
 
 ## 1. Scope, precedence, baseline, and stopping point
 
@@ -80,7 +80,9 @@
 | `tools/heldout-leak-check.ts` | Retain static direct-reference logic/CLI; merge validated child runtime evidence into the report. |
 | `tools/heldout-runtime-guard.ts` | Typed host request/report model, protected identity/graph inventory, sandbox launch, timeout/cleanup, deterministic merge. |
 | `tools/heldout-runtime-guard-worker.mjs` | Minimal child that imports installed Vite/Vitest, loads real configs, probes serve/test resolver and transform pipelines, and emits one JSON response. |
-| `tests/unit/tools/heldout-runtime-guard.test.ts` | Normal Vitest spec for generated throwaway repos, isolation, determinism, real configs, F47–F69, and plugin hooks. |
+| `tests/unit/tools/heldout-runtime-guard.test.ts` | Pure AST handoff, process-limit, protocol-validation, exemption, and unchanged-extended-config Rule N contracts; it never requires namespaces. |
+| `tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts` | Real bubblewrap/Vite/Vitest throwaway repositories, isolation, CLI, determinism, real configs, F47–F69, and plugin hooks. |
+| `tests/integration-supervisor/vitest.config.ts` | Extends the repository Vitest configuration for the explicitly selected supervisor-only isolation spec. |
 | `tests/unit/tools/heldout-leak-check.test.ts` | Remove Rule C assertions; retain N1/N2, direct imports/resolvers/loaders, Git enumeration, and merge/CLI assertions. |
 | `package.json` | Add a stable `heldout:guard` script; do not alter dependency ranges or `test:gate`. |
 
@@ -139,7 +141,7 @@
 
 Environment ownership is explicit:
 
-- `src/**` seeds go to the client/browser Vite serve environment and to every Vitest project environment to which the project configuration assigns them;
+- `src/**` seeds go to the client/browser Vite serve environment and to every selected Vitest project's configured execution environment. Ordinary source ownership is conservatively shared: test globs and directory containment never exclude a source. Only a future explicit ownership manifest may narrow this assignment;
 - `tools/**` seeds go only to Node/SSR-style Vite or Vitest environments, never to the browser/client environment;
 - the Vitest root server and every project server are enumerated separately; a seed is never sprayed into an environment merely because that environment exists.
 
@@ -156,7 +158,7 @@
 
 Computed direct edges remain static `unresolved_module_edge` findings; runtime traversal does not make them acceptable.
 
-External-boundary rule: a Node builtin (`node:*` or a specifier accepted by Node's builtin-module set) is recorded as `external_builtin` and traversal stops. A bare package specifier may stop as `external_dependency` only after the real resolver returns an external result or a canonical file beneath the mounted, lock-verified `/work/node_modules`; record package name, importer, project/environment, and canonical target. Candidate-local packages, workspace links, aliases back into the checkout, virtual modules, URLs, unknown schemes, unresolved bare imports, and anything outside the read-only candidate/node_modules mounts do not qualify and must be traversed or fail closed. Vite's browser replacement behavior for Node APIs (`node_modules/vite/dist/node/chunks/config.js:32671`) is evidence, not permission to feed `tools/**` into the browser.
+External-boundary rule: resolve first and run protected-identity checks after canonicalization, before stopping. A canonical Node builtin identity is recorded as `external_builtin`. A bare package may stop as `external_dependency` only when its canonical resolved file is contained by the mounted `/work/node_modules` and its package provenance is present in the candidate lock that equals the trusted installation baseline. An opaque `external: true` result is unresolved. Candidate-local packages, workspace links, aliases back into the checkout, virtual modules, URLs, unknown schemes, unresolved bare imports, and anything outside the read-only candidate/node_modules mounts do not qualify and must be traversed or fail closed. Trust in the installation baseline is an explicit gate assumption; lock metadata alone does not authenticate installed bytes. Vite's browser replacement behavior for Node APIs (`node_modules/vite/dist/node/chunks/config.js:32671`) is evidence, not permission to feed `tools/**` into the browser.
 
 ### D. Resolver feature handling
 
@@ -164,7 +166,7 @@
 |---|---|
 | `import.meta.glob` | Transform every ordinary importer; traverse Vite-generated imports and returned dependency lists. No custom glob matcher affects verdicts. |
 | `?raw`, `?url`, `?worker`, `?inline`, `?init`, `?import`, `?no-inline`, fragments | Resolve/transform exact suffixed IDs; retain suffix in evidence; remove only for canonical file comparison. Run protected-control probes with supported suffixes. |
-| `optimizeDeps` | Defer optimizer execution and origin tracing. Force `optimizeDeps.noDiscovery: true` and `optimizeDeps.include: []`, then assert those values in every resolved environment; installed Vite selects the explicit optimizer when `noDiscovery` is true (`node_modules/vite/dist/node/chunks/config.js:34890-34893`). Do not accept optimized/prebundle IDs as coverage in this slice. |
+| `optimizeDeps` | Defer optimizer execution and origin tracing. Force `optimizeDeps.noDiscovery: true` and `optimizeDeps.include: []` before optimizer initialization, including project/environment overrides, and assert the effective values. This combination disables optimization in installed Vite (`node_modules/vite/dist/node/chunks/config.js:31891,34890`). Do not accept optimized/prebundle IDs as coverage in this slice. Strip `v`/`t` only when the parameter is positively identified as Vite-owned volatility; otherwise preserve it as meaningful. |
 | `ssr.noExternal` / environment `noExternal` | Probe actual client and server/SSR environments. Record external status; do not model the option. |
 | `resolve.conditions` / SSR conditions | Preserve actual resolved environment conditions and record them as environment metadata. |
 | aliases | Resolve every string alias key from each resolved config with a stable synthetic importer and also resolve graph imports. For regex aliases, use actual regexes against graph specifiers and inspect replacements; if no faithful diagnostic probe exists, record unresolved. |
@@ -272,13 +274,13 @@
 7. omit host project, Git metadata, credentials, home, agent/Docker sockets, and sibling worktrees;
 8. use `env -i` with only PATH, NODE_ENV, CI, locale, HOME/TMP/cache variables, and request/result descriptors; remove proxies/tokens/cloud/model credentials;
 9. mount only PID-namespace-local `/proc`; no host procfs is exposed;
-10. enforce 30 seconds per configuration or project phase and 120 seconds aggregate; launch through `prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300` and invoke Node with `--max-old-space-size=1024 --max-semi-space-size=64`; do not impose `RLIMIT_AS`, because Node 24/V8 reserves virtual address ranges larger than its live heap; kill/reap the new process group on expiry without changing repository test timeouts;
+10. enforce 30 seconds per configuration or project phase and 120 seconds aggregate; count the current UID's threads from `/proc/*/status` and launch through `prlimit --nproc=max(2048,current+1024) --nofile=1024 --fsize=16777216 --cpu=300`, recording both the measured count and selected cap. `RLIMIT_NPROC` is UID-wide and counts threads, so this is bounded headroom rather than task-local containment. Invoke Node with `--max-old-space-size=1024 --max-semi-space-size=64`; do not impose `RLIMIT_AS`, because Node 24/V8 reserves virtual address ranges larger than its live heap; kill and reap the new process group on expiry without changing existing repository test timeouts;
 11. accept exactly one bounded JSON response on a dedicated pipe; extra/malformed/oversized output, signal, abnormal exit, missing close, or timeout fails closed;
 12. delete only the validated exact `mkdtemp` child in parent `finally`.
 
-No guard server listens. API/HMR are forced off, middleware mode is used, and the network namespace prevents candidate config/plugins from reaching host or sandbox TCP/UDP ports, including 4173. Outside writes fail. Config throw/hang/install/network/exit/close failure becomes `configuration_load_failed` (with `failed` or `timed_out` configuration status), and no affected edge/environment can be reported clean; a failed platform/mount/network preflight becomes `isolation_failed`. Neither condition is skipped. `env -i` plus `unshare -Urn` is not a fallback because it does not hide host files. Linux plus bubblewrap is required for an authoritative pass.
+No guard-owned server listens. API/HMR are forced off and middleware mode is used. The network namespace prevents candidate config/plugins from reaching host or external TCP/UDP endpoints, including host port 4173; it does not prohibit candidate code from opening a socket wholly inside its private namespace, because this slice adds no seccomp policy. Outside writes fail. Config throw/hang/install/network/exit/close failure becomes `configuration_load_failed` (with `failed` or `timed_out` configuration status), and no affected edge/environment can be reported clean; a failed platform/mount/network preflight becomes `isolation_failed`. Neither condition is skipped. `env -i` plus `unshare -Urn` is not a fallback because it does not hide host files. Linux plus bubblewrap is required for an authoritative pass.
 
-The final passing profile on the implementation machine is `/usr/bin/prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <user/PID/IPC/UTS/cgroup/network namespaces and read-only mounts above> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 <worker>`. It mounts runtime root `/home/vagrant/.nvm/versions/node/v24.13.0` at `/opt/node` and verifies `v24.13.0`. The preflight report retains the two preceding failed attempts (`/usr/bin/node` runtime mismatch; `RLIMIT_AS=1 GiB` V8 code-range reservation failure) as well as the passing attempt. Parameter or mount-path failures are adjusted within this boundary; the guard blocks only when an isolation semantic cannot be achieved.
+The final passing profile on the implementation machine is `/usr/bin/prlimit --nproc=max(2048,current UID thread count+1024) --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <user/PID/IPC/UTS/cgroup/network namespaces and read-only mounts above> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 <worker>`. It mounts the realpath-derived runtime root `/home/vagrant/.nvm/versions/node/v24.13.0` at `/opt/node` and requires both parent and mounted runtime to be exactly `v24.13.0`. The preflight report records the measured UID thread count, selected cap, three preceding failed attempts (`/usr/bin/node` runtime mismatch; `RLIMIT_AS=1 GiB` V8 code-range reservation failure; fixed `RLIMIT_NPROC=512` below the machine's steady 554-thread UID load), and the passing invocation. Parameter or mount-path failures are adjusted within this boundary; the guard blocks only when an isolation semantic cannot be achieved.
 
 Fixture names and contents remain generic (`@policy`, ordinary/protected modules, anonymous plugins). Apart from the required toolchain package names used to exercise their APIs, do not introduce third-party game, studio, artist, or product names; add a source-text licensing scan to the focused fixture test.
 
@@ -307,7 +309,7 @@
 
 **Gate:** positive scratch write plus negative host-read/outside-write/external-network probes, bounded by the same process-group cleanup. Separately assert API/HMR-off options and spy that guard-owned Vite/Vitest code never calls `listen`; do not bind 4173. Any unexpected success, timeout, malformed canary result, unsupported Linux namespace, or missing/incompatible bubblewrap returns `isolation_failed` before config execution.
 
-**Verification / rollback / assumptions:** run this canary in the normal focused spec and CI platform smoke test without touching 4173. Rollback removes the launcher/preflight together. Linux and bubblewrap are explicit platform requirements, not portable assumptions.
+**Verification / rollback / assumptions:** run this canary only in the supervisor integration spec/CI platform smoke test, never the pure unit spec, and never touch 4173. Rollback removes the launcher/preflight together. Linux and bubblewrap are explicit platform requirements, not portable assumptions.
 
 ### Step 1 — contracts and version assumptions
 
@@ -327,7 +329,7 @@
 
 **Gate:** attempt outbound TCP/DNS, host/sibling/HOME reads, outside writes, scratch write, infinite loop, child storm, malformed/oversized response, `process.exit`. Only scratch write succeeds; every failure is classified and leaves no child/listener.
 
-**Verification / rollback / assumptions:** verify socket-free behavior without 4173. Rollback launcher/worker/script. No `/proc` is an assumption to prove; if PID-local procfs is required, document and test that expansion.
+**Verification / rollback / assumptions:** verify that guard-owned code never listens and that host/external networking is unreachable, without touching 4173. Rollback launcher/worker/script. The sandbox mounts PID-namespace-local `/proc`; the parent reads host `/proc` only for the documented UID thread-count limit calculation.
 
 ### Step 3 — identities and ordinary graph
 
@@ -383,11 +385,23 @@
 
 **Resources:** `package.json:9-18`, `tools/gate-vitest.mjs:39-105`, established nine-spec command at `.tmp-plans/2026-09-08-heldout-basis.md:234-238`.
 
-**Implementation:** normal runtime Vitest spec plus runtime invocation behind existing held-out CLI; add named script; invocation-local cache keyed by candidate/config/lock/environment only.
+**Implementation:** keep pure protocol/AST contracts in the normal unit spec and put namespace/configuration execution in the explicitly selected supervisor integration spec. Invoke the CLI with native Node `--experimental-strip-types`, never `vite-node`, so no candidate configuration can execute before isolation. Stream `git archive` into `tar` rather than buffering the candidate. Add the named script; cache only within an invocation and key by candidate/config/lock/environment.
 
 **Gate:** canonical configuration/resolution/findings output repeats byte-identically; raw volatile diagnostics are compared only after the specified normalization boundary; time/resource failures remain findings. Optimize only by batching fixtures/bounded concurrency, never by reusing resolved configs across candidates.
 
-**Verification / rollback / assumptions:** run Section 8 with logs. Delete runtime host/worker/spec/script and restore Rule C as a single rollback. Enforce the decided 30-second phase and 120-second aggregate budgets without test-timeout changes.
+**Verification / rollback / assumptions:** run Section 8 with logs. Delete runtime host/worker/spec/script and restore Rule C as a single rollback. Enforce the decided 30-second phase and 120-second aggregate budgets; only the new successful-CLI integration assertion receives the matching 120-second outer budget, and no existing test timeout changes.
+
+### Review hardening incorporated in fix round 1 (RG-F1–RG-F9)
+
+- The launcher uses the measured UID thread count plus bounded headroom (minimum 2048), and the pure unit suite does not depend on bubblewrap. Isolation/CLI/resource tests live under `tests/integration-supervisor`.
+- The package entry point is configuration-free native Node, rejects incomplete arguments, runs preflight before candidate extraction or configuration loading, and has subprocess controls for missing arguments, isolation failure, and successful inspection.
+- Both runtime-guard implementation files are explicit evaluation-tool exemptions. Candidate-wide retained static inspection covers `src/**`, `tools/**`, root Vite/Vitest configs, and extended configs in the candidate source pool.
+- The retained TypeScript AST pass hands runtime-value edges to the worker with importer and loader kind: value imports/re-exports, dynamic imports, `require` and exact aliases, `require.resolve`, `import.meta.resolve`, direct/aliased `import.meta.glob`, workers/scripts, constant concatenations, and constant templates. Type-only edges remain static. Aliased glob calls fail closed because installed Vite only macro-expands direct syntax.
+- Every non-boundary resolution is loaded/transformed or unresolved. Boundary classification uses canonical resolved identity after protected checks; opaque externals fail closed. Intentional protected controls have an independent visited set and cannot consume ordinary traversal provenance.
+- Rule N remains candidate-wide, including unchanged extended configuration. Reports carry independently asserted eligible/AST-inspected counts. Every retired Rule C assertion/control is routed to an executable fixture or an explicit clean/unresolved runtime invariant; Rule C itself is not restored.
+- Close hooks are invoked at the environment plugin-container boundary before outer Vite/Vitest cleanup, whose implementations may settle/log failures. A rejected close becomes a configuration-load finding. Timeout cleanup kills and waits for the process group, then proves no fixture child or scratch directory survives.
+- Worker JSON is decoded from `unknown` with exact top-level/row keys, field types, discriminants, request-slice equality, count equality, and completion/preflight evidence. Malformed rows and extra fields reject.
+- Traversal is deterministic and sequential over sorted queues. Shared modules retain deterministic provenance independent of resolver delays; configuration errors are canonical error classes without raw messages, stacks, timing, or scratch paths.
 
 ## 7. Runtime probe matrix
 
@@ -421,7 +435,7 @@
 | Plugin `config()` | Activated hook adds `@policy`; consumer resolves protected. | Same hook redirects ordinary. | Hook absent leaves `@policy` unresolved. |
 | Plugin `resolveId` | Activated hook returns held-out path; exact canonical protected row is emitted. | Hook returns ordinary path. | Hook absent is unresolved. |
 | Plugin `configResolved` | Hook mutates state consumed by that activated plugin's `resolveId`; the subsequent real container resolution records protected. | The same state redirects ordinary. | Hook absent is unresolved. |
-| Activated dependency plugin | A deterministic synthetic package in the fixture's prebuilt, read-only, lock-matched `node_modules` adds/resolves `@policy`; activated hook execution records protected. | The same installed fixture package redirects ordinary. | Package present but dormant leaves `@policy` unresolved, proving activation—not scanning—defines scope. |
+| Activated dependency plugin | The fixture activates installed `automockPlugin()` from `@vitest/mocker/node` while resolving `@policy` through the same real Vite pipeline; configuration-load and protected-resolution evidence must both be present. | The same activated dependency plugin with the alias redirected resolves ordinary. | The installed plugin is imported/constructed but omitted from `plugins`; an ordinary consumer remains clean, proving dormant dependency code is not scanned or executed as a candidate edge. |
 | Project plugin chain | Vitest project `extends` chain activates a plugin; final project/environment resolves protected. | Final plugin redirects ordinary. | Plugin absent is unresolved. |
 
 Mandatory controls:
@@ -444,6 +458,8 @@
 sg scan
 git diff --check
 npx vitest run --configLoader runner tests/unit/tools/heldout-runtime-guard.test.ts
+npx vitest run --configLoader runner --config tests/integration-supervisor/vitest.config.ts \
+  tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
 npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts
 ```
 
@@ -509,15 +525,15 @@
 
 ## 11. Assumptions to prove
 
-1. Node 24.13.0 runs the worker without `/proc`.
+1. Node 24.13.0 runs with a PID-namespace-local `/proc`; the host uses `/proc/*/status` only to select and record the UID-wide `RLIMIT_NPROC` headroom.
 2. Step 0 proves `/usr/bin/bwrap` 0.6.1, user/network namespaces, read-only mounts, scratch-only writes, and no network in supervisor/CI; a failure becomes `isolation_failed`.
 3. `createVitest` 4.1.10 materializes every project before return, while separately creating/retaining a core/root project (`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13150-13172`).
 4. `createVitest` initialization loads VCS state (`:13125`), calls activated `configureVitest` hooks (`:13150-13158`), and initializes reporters/caches (`:13096-13111,13177-13178`); all writes remain in scratch.
 5. Passing `api: false` and checking resolved configs prevents the `server.listen()` branch at `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14222`; `vitest.close()` closes root/projects without global setup/tests.
 6. Vite 7.3.6 transform dependencies expose runtime import-glob output completely when optimizer discovery is disabled.
 7. Real configs load under `env -i`; only proven non-secret defaults may be added.
-8. Candidate lock metadata and installed package metadata are sufficient to prove the mounted dependency tree matches Vite 7.3.6/Vitest 4.1.10; no install is required or permitted.
-9. Ordinary graph exemptions remain exactly evaluation-only tooling plus tests, and project membership can be derived without collecting/running tests.
+8. The supervisor-provided installed dependency tree is a trusted baseline. Candidate lock equality plus installed Vite/Vitest version assertions prove candidate provenance relative to that baseline, not cryptographic authenticity of the installed bytes; no install is required or permitted.
+9. Ordinary graph exemptions remain exactly evaluation-only tooling plus tests. Every `src/**` seed is assigned to every selected project environment unless a future explicit ownership manifest narrows it; test globs and paths are never treated as ownership evidence.
 10. Every required Vite serve and Vitest root/project environment exposes public resolve and transform APIs; a future browser project is expected to fail closed rather than initialize a provider.
 
 ## 12. Rollback
diff --git a/package.json b/package.json
index e1223e76fb6ae22960ef3f09b9982037d5b11a72..d1222fa19ab370f5fbff37385120437fb34f9aa6
--- a/package.json
+++ b/package.json
@@ -17,7 +17,7 @@
     "test:gate": "node tools/gate-vitest.mjs",
     "test:gate:browser": "node tools/gate-playwright.mjs",
     "test:affected": "node scripts/test-affected.mjs",
-    "heldout:guard": "vite-node tools/heldout-leak-check.ts --",
+    "heldout:guard": "node --experimental-strip-types tools/heldout-leak-check.ts",
     "census:modules": "node scripts/module-state-census.mjs",
     "test:shuffled": "vitest run --configLoader runner --sequence.shuffle --sequence.seed=20260825",
     "test:unit": "vitest run --configLoader runner tests/unit",
diff --git a/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts b/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..0398a883f3af815f8ddf1bdf087a56ddf8a3a600
--- /dev/null
+++ b/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts
@@ -0,0 +1,1272 @@
+import { tmpdir } from 'node:os';
+import { dirname, join } from 'node:path';
+import { beforeAll, describe, expect, it } from 'vitest';
+import {
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  readdirSync,
+  rmSync,
+  statSync,
+  writeFileSync,
+} from '../helpers/test-filesystem';
+import {
+  runHeldoutIsolationPreflight,
+  runHeldoutRuntimeGuard,
+  type HeldoutRuntimeGuardReport,
+} from '../../tools/heldout-runtime-guard';
+
+const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
+const bindings = {
+  reserveDigests: [reserveDigest],
+  resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
+} as const;
+const protectedTarget = '/work/src/vtt/heldout-evaluation.ts';
+const protectedPackageTarget = './src/vtt/heldout-evaluation.ts';
+const runtimeSeedExclusions = new Set([
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
+
+function eligibleRuntimeSeedCount(root = '.'): number {
+  let count = 0;
+  const walk = (directory: string, prefix = ''): void => {
+    for (const entry of readdirSync(directory, { withFileTypes: true })) {
+      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
+      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
+      const absolute = join(directory, entry.name);
+      if (entry.isDirectory()) walk(absolute, relative);
+      else if ((relative.startsWith('src/') || relative.startsWith('tools/')) &&
+        /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u.test(relative) &&
+        !/\.d\.(?:ts|mts|cts)$/u.test(relative) && !runtimeSeedExclusions.has(relative)) count += 1;
+    }
+  };
+  walk(root);
+  return count;
+}
+
+const realTreeEligibleSeedCount = eligibleRuntimeSeedCount();
+
+const cliArguments = [
+  '--protocol', 'heldout-ordinary-v1',
+  '--base', 'HEAD',
+  '--candidate', 'HEAD',
+  '--slice', 'F',
+  '--reserve-digest', reserveDigest,
+  '--result-path', '/home/vagrant/dnd-slim-runs/heldout-a-',
+] as const;
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
+let lastFixtureRoot = '';
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
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(rules[0]);export default {resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F65',
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:rules};function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(shared.plugins[0]);export default {...shared,resolve:{alias:rules}};`,
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
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const entry=rules[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F64-test-alias-entry',
+    configFile: 'vitest.config.mjs',
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {test:{alias:rules}};`,
+  },
+  {
+    finding: 'F64-spread-entry-source',
+    config: `const entries=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias:[...entries]}};`,
+  },
+  {
+    finding: 'F64-dual-placement',
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {plugins:rules,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F65-const-indirect-entry',
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:rules};const entry=shared.plugins[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'F65-two-level-indirection',
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:rules};const outer={inner:shared};outer.inner.plugins[0].find='@policy';outer.inner.plugins[0].replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
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
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'},{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins:[...rules,{name:'safe'}]};export default {...shared,resolve:{alias:rules}};`,
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
+    config: `import {automockPlugin} from '@vitest/mocker/node';export default {plugins:[automockPlugin()],resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
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
+      imports: {
+        '#*': './src/ordinary.ts',
+        '#policy': { import: protectedPackageTarget, default: './src/ordinary.ts' },
+      },
+    }),
+  },
+  {
+    finding: 'F21-regex-alias',
+    config: `export default {resolve:{alias:[{find:/^@policy$/,replacement:'${protectedTarget}'}]}};`,
+  },
+  {
+    finding: 'RG-F4-direct-require',
+    config: 'export default {};',
+    consumer: "require('#policy');",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
+      imports: { '#policy': protectedPackageTarget } }),
+  },
+  {
+    finding: 'RG-F4-require-alias',
+    config: 'export default {};',
+    consumer: "const load=require;load('#policy');",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
+      imports: { '#policy': protectedPackageTarget } }),
+  },
+  {
+    finding: 'RG-F4-constant-concatenation',
+    config: 'export default {};',
+    consumer: "import('#'+'policy');",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
+      imports: { '#policy': protectedPackageTarget } }),
+  },
+  {
+    finding: 'RG-F4-import-meta-resolve',
+    config: 'export default {};',
+    consumer: "import.meta.resolve('#policy');",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
+      imports: { '#policy': protectedPackageTarget } }),
+  },
+  {
+    finding: 'package-exact-before-wildcard',
+    config: 'export default {};',
+    consumer: "import value from '#policy';void value;",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
+      '#*': './src/ordinary.ts', '#policy': protectedPackageTarget,
+    } }),
+  },
+  {
+    finding: 'package-overlapping-pattern-order',
+    config: 'export default {};',
+    consumer: "import value from '#policy/heldout-evaluation';void value;",
+    expectedSpecifier: '#policy/heldout-evaluation',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
+      '#policy/*': './src/ordinary.ts', '#policy/heldout-*': './src/vtt/heldout-*.ts',
+    } }),
+  },
+  {
+    finding: 'package-nested-conditions',
+    config: 'export default {};',
+    consumer: "import value from '#policy';void value;",
+    expectedSpecifier: '#policy',
+    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
+      '#policy': { import: { browser: protectedPackageTarget, default: './src/ordinary.ts' },
+        default: './src/ordinary.ts' },
+    } }),
+  },
+  {
+    finding: 'alias-shorthand-object',
+    config: `const alias={'@policy':'${protectedTarget}'};export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-identifier-array',
+    config: `const alias=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-array-spread',
+    config: `const base=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias:[...base]}};`,
+  },
+  {
+    finding: 'alias-relative-regex',
+    config: `export default {resolve:{alias:[{find:/^\\.\\/public-policy$/,replacement:'${protectedTarget}'}]}};`,
+    consumer: "import value from './public-policy';void value;",
+    expectedSpecifier: './public-policy',
+  },
+  {
+    finding: 'alias-shadowed-spelling',
+    config: `const alias={'@policy':'${protectedTarget}'};function shadow(){const alias={};return alias}void shadow;export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-entry-spread-override',
+    config: `const alias=[{find:'@safe',replacement:'/safe.ts',...{find:'@policy',replacement:'${protectedTarget}'}}];export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-whole-variable-reassignment',
+    config: `let alias={};alias={'@policy':'${protectedTarget}'};export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-array-push',
+    config: `const alias=[];alias.push({find:'@policy',replacement:'${protectedTarget}'});export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-called-closure-write',
+    config: `const alias={};const write=()=>{alias['@policy']='${protectedTarget}'};write();export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-call-receiver-write',
+    config: `const alias={};function get(){return alias}get()['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-class-field-write',
+    config: `const alias={};class Box{value=alias}new Box().value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-object-transfer',
+    config: `const alias={};const box={value:alias};box.value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-array-transfer',
+    config: `const alias=[];const box=[alias];box[0].push({find:'@policy',replacement:'${protectedTarget}'});export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-nested-transfer',
+    config: `const alias={};const box={nested:[{value:alias}]};box.nested[0].value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-computed-transfer',
+    config: `const alias={};const box={['value']:alias};box.value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-for-of-head',
+    config: `const alias={};for(alias['@policy'] of ['${protectedTarget}']){}export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-for-in-head',
+    config: `const alias={};for(alias['@policy'] in {'${protectedTarget}':true}){}export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-constructor-argument',
+    config: `const alias={};class Update{constructor(value){value['@policy']='${protectedTarget}'}}new Update(alias);export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'alias-fill-receiver',
+    config: `const alias=[{find:'@safe',replacement:'/work/src/ordinary.ts'}];alias.fill({find:'@policy',replacement:'${protectedTarget}'});export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'F67-runtime-index-mutation',
+    config: `const rules=[{find:'@a',replacement:'/work/src/ordinary.ts'},{find:'@b',replacement:'/work/src/ordinary.ts'}];const shared={plugins:[...rules,{name:'safe'}]};function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(shared.plugins[1]);export default {...shared,resolve:{alias:rules}};`,
+  },
+  {
+    finding: 'callback-conditional-config',
+    config: `import {defineConfig} from 'vite';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(({command})=>command==='serve'?{...base}:base);`,
+  },
+  {
+    finding: 'locally-defined-defineConfig-execution',
+    config: `const alias={};function defineConfig(value){value.ref['@policy']='${protectedTarget}';return {resolve:{alias}}}export default defineConfig({ref:alias});`,
+  },
+  {
+    finding: 'F66-helper-mutated-shorthand-projects',
+    configFile: 'vitest.config.mjs',
+    config: `const projects=[{}];function install(project){project.resolve={alias:{'@policy':'${protectedTarget}'}}}install(projects[0]);export default {test:{projects}};`,
+  },
+  {
+    finding: 'F66-helper-mutated-inline-project',
+    configFile: 'vitest.config.mjs',
+    config: `const project={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(project);export default {test:{projects:[project]}};`,
+  },
+  {
+    finding: 'F66-helper-mutated-referenced-project',
+    configFile: 'vitest.config.mjs',
+    config: `const project={};const projects=[project];function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(project);export default {test:{projects:projects}};`,
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
+  {
+    finding: 'F67-leading-safe-array-entry',
+    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:[{name:'safe'},...rules]};function install(value){value.name='clean'}install(shared.plugins[0]);export default {...shared,resolve:{alias:rules}};`,
+    consumer: "import value from './ordinary';void value;",
+  },
+  {
+    finding: 'regex-nonmatching-relative-import',
+    config: `export default {resolve:{alias:[{find:/^@policy$/,replacement:'${protectedTarget}'}]}};`,
+    consumer: "import value from './ordinary';void value;",
+  },
+  {
+    finding: 'nonsemantic-build-value',
+    config: `const build={};function install(value){value.empty=true}install(build);export default {build};`,
+    consumer: "import value from './ordinary';void value;",
+  },
+  {
+    finding: 'dormant-dependency-plugin',
+    config: "import {automockPlugin} from '@vitest/mocker/node';const dormant=automockPlugin();void dormant;export default {};",
+    consumer: "import value from './ordinary';void value;",
+  },
+  {
+    finding: 'spread-transfer-does-not-mutate-config',
+    config: `const alias={'@policy':'/work/src/ordinary.ts'};const edit={...alias};edit['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
+  },
+  {
+    finding: 'returned-reference-without-mutation',
+    config: "const alias={'@policy':'/work/src/ordinary.ts'};function expose(){return alias}void expose;export default {resolve:{alias}};",
+  },
+  {
+    finding: 'class-field-storage-without-mutation',
+    config: "const alias={'@policy':'/work/src/ordinary.ts'};class Box{value=alias}void Box;export default {resolve:{alias}};",
+  },
+  {
+    finding: 'frozen-readable-configuration',
+    config: "const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};Object.freeze(shared);export default shared;",
+  },
+  {
+    finding: 'let-reference-without-mutation',
+    config: "const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};let p=shared;void p;export default shared;",
+  },
+  {
+    finding: 'no-op-call-reference',
+    config: "const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};const q=shared.resolve;function use(value){void value}use(q);export default shared;",
+  },
+  {
+    finding: 'stray-alias-object-outside-export',
+    config: `const stray={alias:{'@policy':'${protectedTarget}'}};void stray;export default {};`,
+    consumer: "import value from './ordinary';void value;",
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
+  lastFixtureRoot = root;
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
+describe('held-out runtime resolution guard', () => {
+  it('passes the Node 24 bubblewrap isolation preflight', () => {
+    const preflight = runHeldoutIsolationPreflight();
+    expect(preflight).toMatchObject({
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
+    expect(preflight.uidTaskCount).toBeGreaterThan(0);
+    expect(preflight.nprocLimit).toBeGreaterThan(preflight.uidTaskCount);
+    expect(preflight.nprocLimit).toBeGreaterThanOrEqual(2_048);
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
+  it.each([
+    ['virtual module', `export default {plugins:[{name:'virtual-policy',resolveId(id){if(id==='@policy')return '\\0virtual:policy'},load(id){if(id==='\\0virtual:policy')return "export {default} from '${protectedTarget}'"}}]};`, "import value from '@policy';void value;"],
+    ['redirected builtin', `export default {plugins:[{name:'builtin-redirect',enforce:'pre',resolveId(id){if(id==='node:path')return '\\0virtual:path'},load(id){if(id==='\\0virtual:path')return "export {default} from '${protectedTarget}'"}}]};`, "import value from 'node:path';void value;"],
+  ] as const)('transforms a non-boundary %s before classifying it clean', async (_label, config, consumer) => {
+    const report = await inspectFixture({ config, consumer });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
+      status: 'protected',
+    }));
+  });
+
+  it('keeps protected-control traversal separate from an ordinary visit to the same virtual module', async () => {
+    const report = await inspectFixture({
+      config: `export default {plugins:[{name:'shared-control',resolveId(id){if(id==='@policy'||id==='/src/vtt/heldout-evaluation.ts')return '\\0virtual:shared'},load(id){if(id==='\\0virtual:shared')return "export default '${reserveDigest}'"}}]};`,
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
+    expect(report.resolution).toEqual(expect.arrayContaining([
+      expect.objectContaining({ source: 'protected_control', status: 'control' }),
+      expect.objectContaining({ status: 'protected' }),
+    ]));
+  });
+
+  it.each([
+    ['opaque external', "export default {plugins:[{name:'opaque',resolveId(id){if(id==='@policy')return {id:'opaque-policy',external:true}}}]};"],
+    ['unloadable virtual result', "export default {plugins:[{name:'unloadable',resolveId(id){if(id==='@policy')return '\\0virtual:missing'} }]};"],
+  ] as const)('fails closed for an %s resolver result', async (_label, config) => {
+    const report = await inspectFixture({ config });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
+    expect(report.resolution).not.toContainEqual(expect.objectContaining({
+      specifier: '@policy',
+      status: 'clean',
+    }));
+  });
+
+  it('reports a plugin closeBundle failure instead of swallowing it', async () => {
+    const report = await inspectFixture({
+      config: "export default {plugins:[{name:'close-failure',closeBundle(){throw new TypeError('close failed')}}]};",
+      consumer: "import value from './ordinary';void value;",
+    });
+
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
+      environment: '<close>',
+      status: 'failed',
+      errorClass: 'TypeError',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      kind: 'configuration_load_failed',
+      detail: 'vite.config.mjs close failed (TypeError)',
+    }));
+  });
+
+  it('produces deterministic provenance for a delayed diamond graph', async () => {
+    const configuration = (aDelay: number, bDelay: number) => `export default {plugins:[{name:'diamond',async resolveId(id,importer){if(id==='virtual:shared'){await new Promise(resolve=>setTimeout(resolve,importer?.endsWith('/a.ts')?${String(aDelay)}:${String(bDelay)}));return '\\0virtual:shared'}},load(id){if(id==='\\0virtual:shared')return 'export default 1'}}]};`;
+    const fixture = {
+      consumer: "import './a';import './b';",
+      files: {
+        'src/a.ts': "import value from 'virtual:shared';void value;",
+        'src/b.ts': "import value from 'virtual:shared';void value;",
+      },
+    } as const;
+    const first = await inspectFixture({ ...fixture, config: configuration(25, 0) });
+    const second = await inspectFixture({ ...fixture, config: configuration(0, 25) });
+
+    expect(first.resolution).toEqual(second.resolution);
+    expect(first.findings).toEqual(second.findings);
+    expect(first.resolution).toContainEqual(expect.objectContaining({
+      seed: 'src/a.ts',
+      specifier: 'virtual:shared',
+      status: 'clean',
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
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
+      file: runtimeCase.configFile ?? 'vite.config.mjs',
+      status: 'loaded',
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
+          .replaceAll(protectedPackageTarget, './src/ordinary.ts')
+          .replaceAll('./src/vtt/heldout-*.ts', './src/ordinary.ts'),
+      }),
+    });
+
+    expect(report.findings).toEqual([]);
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
+      specifier: runtimeCase.expectedSpecifier ?? '@policy',
+      resolvedId: '<candidate>/src/ordinary.ts',
+      phase: 'resolve',
+      status: 'resolved',
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
+  it('fails closed when a package import is not mapped', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "import value from '#not-mapped';void value;",
+      packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {} }),
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '#not-mapped',
+      status: 'unresolved',
+    }));
+  });
+
+  it.each([
+    ['nonliteral alias source', 'const alias=loadAliases();export default {resolve:{alias}};'],
+    ['nonliteral alias-entry spread', "const extra=loadOverrides();export default {resolve:{alias:[{find:'@safe',replacement:'/work/src/ordinary.ts',...extra}]}};"],
+    ['untrackable call-result transfer', 'const alias={nested:{value:loadAliases()}};export default {resolve:{alias}};'],
+    ['undefined reachable-const consumer', 'const shared={resolve:{alias:{}}};consume(shared);export default shared;'],
+    ['undefined configuration factory', 'const shared=makeConfig();export default shared;'],
+  ] as const)('fails closed when executing a %s', async (_label, config) => {
+    const report = await inspectFixture({ config });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'configuration_load_failed' }));
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
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
+      expect.objectContaining({
+        source: 'transformed',
+        specifier: '/src/vtt/heldout-evaluation.ts?raw',
+        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts?raw',
+        status: 'protected',
+      }),
+      expect.objectContaining({
+        source: 'transformed',
+        specifier: '/src/vtt/heldout-evaluation.ts?url',
+        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts?url',
+        status: 'protected',
+      }),
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
+    [
+      'wildcard eager glob',
+      "export const modules=import.meta.glob('./vtt/heldout-*.ts',{eager:true});",
+      "export const modules=import.meta.glob('./ordinary*.ts',{eager:true});",
+    ],
+    [
+      'array glob with query',
+      "export const modules=import.meta.glob(['./ordinary.ts','./vtt/heldout-*.ts'],{query:'?raw'});",
+      "export const modules=import.meta.glob(['./ordinary.ts'],{query:'?raw'});",
+    ],
+    [
+      'object-query glob',
+      "export const modules=import.meta.glob('./vtt/heldout-*.ts',{query:{raw:'true',worker:false}});",
+      "export const modules=import.meta.glob('./ordinary*.ts',{query:{raw:'true',worker:false}});",
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
+  it('retains the exact query suffix in runtime resolution evidence', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts',{query:'?raw'});",
+    });
+
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '/src/vtt/heldout-evaluation.ts?raw',
+      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts?raw',
+      status: 'protected',
+    }));
+  });
+
+  it('fails closed for an aliased import.meta.glob call that Vite cannot macro-expand', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "const discover=import.meta.glob;discover('./vtt/heldout-evaluation.ts');",
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: './vtt/heldout-evaluation.ts',
+      status: 'unresolved',
+    }));
+  });
+
+  it.each([
+    ['package glob', "import.meta.glob('#policy/*.ts')"],
+    ['alias glob', "import.meta.glob('@policy/*.ts')"],
+  ] as const)('fails closed for an unsupported %s', async (_label, consumer) => {
+    const report = await inspectFixture({ config: 'export default {};', consumer });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
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
+  it('fails closed before a based leading-globstar can scan the filesystem root', async () => {
+    const report = await inspectFixture({
+      config: 'export default {};',
+      consumer: "export const modules=import.meta.glob('**/heldout-evaluation.ts',{base:'./',eager:true});",
+    });
+
+    expect(report.resolution).toContainEqual(expect.objectContaining({
+      specifier: '**/heldout-evaluation.ts',
+      status: 'unresolved',
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
+    expect(report.eligibleFiles).toBe(2);
+    expect(report.astInspectedFiles).toBe(2);
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
+    ['missing project extends file', "export default {test:{projects:[{name:'missing',extends:'./missing.config.mjs'}]}};", {}],
+    ['throwing project extends file', "export default {test:{projects:[{name:'throwing',extends:'./project.config.mjs'}]}};",
+      { 'project.config.mjs': "throw new TypeError('extended-config-failure');" }],
+    ['outside-repository project extends file', "export default {test:{projects:[{name:'outside',extends:'../outside.config.mjs'}]}};", {}],
+    ['cyclic project extends files', "export default {test:{projects:[{name:'cycle',extends:'./project.config.mjs'}]}};",
+      { 'project.config.mjs': "export default {test:{projects:[{extends:'./vitest.config.mjs'}]}};" }],
+  ] as const)('fails closed for a %s', async (_label, config, files) => {
+    const report = await inspectFixture({
+      configFile: 'vitest.config.mjs',
+      config,
+      files,
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining(
+      _label === 'cyclic project extends files'
+        ? { kind: 'unresolved_module_edge' }
+        : { kind: 'configuration_load_failed' },
+    ));
+    if (_label !== 'cyclic project extends files') {
+      expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
+    }
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
+    const survivingCommands = readdirSync('/proc', { withFileTypes: true })
+      .filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name))
+      .flatMap((entry) => {
+        try {
+          return [readFileSync(`/proc/${entry.name}/cmdline`, 'utf8')];
+        } catch {
+          return [];
+        }
+      })
+      .filter((command) => command.includes(lastFixtureRoot));
+
+    expect(after).toEqual([]);
+    expect(survivingCommands).toEqual([]);
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
+  let report: HeldoutRuntimeGuardReport;
+  beforeAll(async () => {
+    report = await inspectRealTree(configFile);
+  }, 120_000);
+
+  it('has zero findings after loading and traversing the real tree', () => {
+    expect(report.findings).toEqual([]);
+    expect(report.eligibleFiles).toBe(realTreeEligibleSeedCount);
+    expect(report.astInspectedFiles).toBe(realTreeEligibleSeedCount);
+    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
+      file: configFile,
+      status: 'loaded',
+    }));
+  });
+});
+
+describe('real-tree failure sensitivity', () => {
+  let injectedAliasRealTreeReport: HeldoutRuntimeGuardReport;
+  let injectedResolverRealTreeReport: HeldoutRuntimeGuardReport;
+  beforeAll(async () => {
+    [injectedAliasRealTreeReport, injectedResolverRealTreeReport] = await Promise.all([
+      inspectRealTree('vite.config.ts', {
+        path: 'vite.config.mjs',
+        source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,resolve:{...value.resolve,alias:{'@policy':'${protectedTarget}'}}}};`,
+      }),
+      inspectRealTree('vite.config.ts', {
+        path: 'vite.config.mjs',
+        source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,plugins:[...(value.plugins??[]),{name:'injected-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]}};`,
+      }),
+    ]);
+  }, 120_000);
+
+  it.each([
+    ['alias', 'alias', 'vite.config.mjs', 5],
+    ['resolveId hook', 'resolver', 'vite.config.mjs', 3],
+  ] as const)('reports the injected %s and keeps its canonical configuration identity',
+    (_label, reportKind, configuration, expectedFindingCount) => {
+      const report = reportKind === 'alias' ? injectedAliasRealTreeReport : injectedResolverRealTreeReport;
+      expect(report.findings).toHaveLength(expectedFindingCount);
+      expect(report.eligibleFiles).toBe(realTreeEligibleSeedCount + 1);
+      expect(report.astInspectedFiles).toBe(realTreeEligibleSeedCount + 1);
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
+  });
+});
+
+describe('configuration-free held-out CLI', () => {
+  it('rejects missing arguments before candidate inspection', () => {
+    const result = spawnSync(process.execPath, [
+      '--experimental-strip-types', 'tools/heldout-leak-check.ts',
+    ], { encoding: 'utf8' });
+
+    expect(result.status).toBe(1);
+    expect(result.stderr).toContain('--protocol must be heldout-ordinary-v1');
+    expect(result.stdout).toBe('');
+  });
+
+  it('reports a failed namespace preflight and never reports runtime completion', () => {
+    const result = spawnSync(process.execPath, [
+      '--experimental-strip-types', 'tools/heldout-leak-check.ts', ...cliArguments,
+    ], {
+      encoding: 'utf8',
+      timeout: 30_000,
+      env: { ...process.env, HELDOUT_RUNTIME_BWRAP_PATH: '/missing/heldout-bwrap' },
+    });
+
+    expect(result.status).toBe(1);
+    const report: unknown = JSON.parse(result.stdout);
+    expect(report).toEqual(expect.objectContaining({
+      runtimeCompleted: false,
+      preflight: expect.objectContaining({ status: 'isolation_failed' }),
+    }));
+  });
+
+  it('runs a successful real-tree inspection without a configuration-aware parent loader', () => {
+    const result = spawnSync(process.execPath, [
+      '--experimental-strip-types', 'tools/heldout-leak-check.ts', ...cliArguments,
+    ], { encoding: 'utf8', timeout: 120_000, maxBuffer: 128 * 1024 * 1024 });
+
+    expect(result.status).toBe(0);
+    const report: unknown = JSON.parse(result.stdout);
+    expect(report).toEqual(expect.objectContaining({
+      runtimeCompleted: true,
+      findings: [],
+      preflight: expect.objectContaining({ status: 'passed' }),
+    }));
+  }, 120_000);
+});
+import { spawnSync } from 'node:child_process';
diff --git a/tests/integration-supervisor/vitest.config.ts b/tests/integration-supervisor/vitest.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..12f81d0f0cf50138a209f4986d9c4f5f402b2277
--- /dev/null
+++ b/tests/integration-supervisor/vitest.config.ts
@@ -0,0 +1,3 @@
+import baseConfiguration from '../../vitest.config';
+
+export default baseConfiguration;
diff --git a/tests/unit/tools/heldout-runtime-guard.test.ts b/tests/unit/tools/heldout-runtime-guard.test.ts
index 4f15281c54689b10a66bfe2ccc19ee11c4b28e47..4acb52e3ae58fdf9f94d4c2ddf2764470dfcf5e9
--- a/tests/unit/tools/heldout-runtime-guard.test.ts
+++ b/tests/unit/tools/heldout-runtime-guard.test.ts
@@ -1,752 +1,140 @@
 import { tmpdir } from 'node:os';
-import { dirname, join } from 'node:path';
+import { join } from 'node:path';
 import { describe, expect, it } from 'vitest';
+import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
 import {
-  mkdirSync,
-  mkdtempSync,
-  readFileSync,
-  readdirSync,
-  rmSync,
-  statSync,
-  writeFileSync,
-} from '../../helpers/test-filesystem';
-import {
-  runHeldoutIsolationPreflight,
-  runHeldoutRuntimeGuard,
-  type HeldoutRuntimeGuardReport,
+  discoverHeldoutRuntimeValueEdges,
+  heldoutRuntimeNprocLimit,
+  parseHeldoutWorkerReport,
 } from '../../../tools/heldout-runtime-guard';
+import { inspectHeldoutCandidateTree, inspectHeldoutLeakChanges } from '../../../tools/heldout-leak-check';
 
-const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
 const bindings = {
-  reserveDigests: [reserveDigest],
+  reserveDigests: ['0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'],
   resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
 } as const;
-const protectedTarget = '/work/src/vtt/heldout-evaluation.ts';
-const protectedPackageTarget = './src/vtt/heldout-evaluation.ts';
-
-interface RuntimeFixture {
-  readonly config: string;
-  readonly configFile?: 'vite.config.mjs' | 'vite.config.ts' | 'vitest.config.mjs';
-  readonly files?: Readonly<Record<string, string>>;
-  readonly consumer?: string;
-  readonly packageJson?: string;
-  readonly expectedSpecifier?: string;
-  readonly aggregateTimeoutMs?: number;
-  readonly lockFile?: string;
-}
-
-interface MigratedRuntimeCase extends RuntimeFixture {
-  readonly finding: string;
-}
 
-const migratedRuntimeCases: readonly MigratedRuntimeCase[] = [
-  {
-    finding: 'F47',
-    config: `const shared={resolve:{alias:{}}}; export default {get resolve(){shared.resolve.alias['@policy']='${protectedTarget}';return shared.resolve;}};`,
-  },
-  {
-    finding: 'F48',
-    config: `const shared={resolve:{alias:{'@policy':'${protectedTarget}'}}}; export {shared}; export default shared;`,
-  },
-  {
-    finding: 'F49',
-    config: "import bridge from './bridge.mjs'; export {bridge}; export default bridge;",
-    files: { 'bridge.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
-  },
-  {
-    finding: 'F50',
-    config: `const key='alias';const resolve={};resolve[key]={'@policy':'${protectedTarget}'};export default {resolve};`,
-  },
-  {
-    finding: 'F51',
-    config: `const source={alias:{'@policy':'${protectedTarget}'}};const {'alias':alias,...rest}=source;void rest;export default {resolve:{alias}};`,
-  },
-  {
-    finding: 'F52',
-    config: `const shared=await Promise.resolve({resolve:{alias:{'@policy':'${protectedTarget}'}}});export default shared;`,
-  },
-  {
-    finding: 'F53',
-    config: `import {defineConfig,mergeConfig} from 'vite';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(mergeConfig(base,{}));`,
-  },
-  {
-    finding: 'F54',
-    config: `const shared={resolve:{alias:{}}};export default {...shared,plugins:[(shared.resolve.alias['@policy']='${protectedTarget}',false)]};`,
-  },
-  {
-    finding: 'F55',
-    config: `const box={value:{alias:{'@policy':'${protectedTarget}'}}};const {'alias':alias,...rest}=box.value;void rest;export default {resolve:{alias}};`,
-  },
-  {
-    finding: 'F56',
-    configFile: 'vite.config.ts',
-    config: `const key:'alias'='alias';const root:Record<string,unknown>={};root[key]={'@policy':'${protectedTarget}'};export default {resolve:root};`,
-  },
-  {
-    finding: 'F57',
-    config: `const moduleApi=await import('node:module');const load=moduleApi.createRequire(import.meta.url);void load;export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
-  },
-  {
-    finding: 'F58',
-    config: `const shared={resolve:{alias:{}}};const p=shared.resolve.alias;Object.assign(p,{'@policy':'${protectedTarget}'});export default shared;`,
-  },
-  {
-    finding: 'F59',
-    configFile: 'vitest.config.mjs',
-    config: `function makeTestConfig(){return {alias:{'@policy':'${protectedTarget}'}}}export default {test:makeTestConfig()};`,
-  },
-  {
-    finding: 'F60',
-    config: `const shared={resolve:{alias:{}}};const receiver={[Symbol.hasInstance](value){value.resolve.alias['@policy']='${protectedTarget}';return true}};void(shared instanceof receiver);export default shared;`,
-  },
-  {
-    finding: 'F61',
-    config: `const shared={resolve:{alias:{}}};const p=shared;p.resolve.alias['@policy']='${protectedTarget}';export default shared;`,
-  },
-  {
-    finding: 'F62',
-    config: `const resolve={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(resolve);export default {resolve};`,
-  },
-  {
-    finding: 'F63',
-    config: `const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default {...shared};`,
-  },
-  {
-    finding: 'F64',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(rules[0]);export default {resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F65',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const shared={plugins:rules};function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(shared.plugins[0]);export default {...shared,resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F66',
-    configFile: 'vitest.config.mjs',
-    config: `const project={name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}};export default {test:{projects:[project]}};`,
-  },
-  {
-    finding: 'F67',
-    config: `const rules=[{find:'@policy',replacement:'${protectedTarget}'}];const overlay={resolve:{alias:rules}};export default {resolve:{alias:[{find:'@policy',replacement:'/work/src/ordinary.ts'}]},...overlay};`,
-  },
-  {
-    finding: 'F68',
-    configFile: 'vitest.config.mjs',
-    config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
-    files: { 'project.config.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
-  },
-  {
-    finding: 'F69',
-    config: `const shared={resolve:{alias:{}}};function install(value){value.alias['@policy']='${protectedTarget}'}install(shared.resolve);export default shared;`,
-  },
-  {
-    finding: 'F47-side-effect-property',
-    config: `const shared={resolve:{alias:{}}};export default {...shared,sideEffect:(shared.resolve.alias['@policy']='${protectedTarget}')};`,
-  },
-  {
-    finding: 'F53-direct-vitest-alias',
-    configFile: 'vitest.config.mjs',
-    config: `import {defineConfig} from 'vitest/config';export default defineConfig({resolve:{alias:{'@policy':'${protectedTarget}'}}});`,
-  },
-  {
-    finding: 'F53-vitest-mergeConfig',
-    configFile: 'vitest.config.mjs',
-    config: `import {defineConfig,mergeConfig} from 'vitest/config';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(mergeConfig(base,{test:{globals:true}}));`,
-  },
-  {
-    finding: 'F58-test-alias-address',
-    configFile: 'vitest.config.mjs',
-    config: `const shared={test:{alias:{}}};Object.assign(shared.test.alias,{'@policy':'${protectedTarget}'});export default shared;`,
-  },
-  {
-    finding: 'F59-literal-test-alias',
-    configFile: 'vitest.config.mjs',
-    config: `export default {test:{alias:{'@policy':'${protectedTarget}'}}};`,
-  },
-  {
-    finding: 'F62-shorthand-test',
-    configFile: 'vitest.config.mjs',
-    config: `const test={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(test);export default {test};`,
-  },
-  {
-    finding: 'F62-resolve-container-spread',
-    config: `const parts={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(parts);export default {resolve:{...parts}};`,
-  },
-  {
-    finding: 'F62-test-container-spread',
-    configFile: 'vitest.config.mjs',
-    config: `const parts={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(parts);export default {test:{...parts}};`,
-  },
-  {
-    finding: 'F63-direct-root',
-    config: `const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default shared;`,
-  },
-  {
-    finding: 'F63-defineConfig-callback-root',
-    config: `import {defineConfig} from 'vite';const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default defineConfig(()=>({...shared}));`,
-  },
-  {
-    finding: 'F64-const-entry-alias',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const entry=rules[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F64-test-alias-entry',
-    configFile: 'vitest.config.mjs',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {test:{alias:rules}};`,
-  },
-  {
-    finding: 'F64-spread-entry-source',
-    config: `const entries=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias:[...entries]}};`,
-  },
-  {
-    finding: 'F64-dual-placement',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {plugins:rules,resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F65-const-indirect-entry',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const shared={plugins:rules};const entry=shared.plugins[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F65-two-level-indirection',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'}];const shared={plugins:rules};const outer={inner:shared};outer.inner.plugins[0].find='@policy';outer.inner.plugins[0].replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F66-shorthand-projects',
-    configFile: 'vitest.config.mjs',
-    config: `const projects=[{name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}}];export default {test:{projects}};`,
-  },
-  {
-    finding: 'F66-referenced-project-entry',
-    configFile: 'vitest.config.mjs',
-    config: `const project={name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}};const projects=[project];export default {test:{projects:projects}};`,
-  },
-  {
-    finding: 'F67-array-spread-index',
-    config: `const rules=[{find:'@ordinary',replacement:'/ordinary'},{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins:[...rules,{name:'safe'}]};export default {...shared,resolve:{alias:rules}};`,
-  },
-  {
-    finding: 'F69-terminal-dual-placement',
-    config: `const plugins=[{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins};export default {...shared,resolve:{alias:plugins}};`,
-  },
-  {
-    finding: 'F68-helper-built-extended-config',
-    configFile: 'vitest.config.mjs',
-    config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
-    files: {
-      'project.config.mjs': `const make=()=>({resolve:{alias:{'@policy':'${protectedTarget}'}}});export default make();`,
-    },
-  },
-  {
-    finding: 'F68-variable-extends',
-    configFile: 'vitest.config.mjs',
-    config: "const target='./project.config.mjs';export default {test:{projects:[{name:'extended',extends:target}]}};",
-    files: { 'project.config.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
-  },
-  {
-    finding: 'plugin-config',
-    config: `export default {plugins:[{name:'fixture-config',config(){return {resolve:{alias:{'@policy':'${protectedTarget}'}}}}}]};`,
-  },
-  {
-    finding: 'plugin-resolveId',
-    config: `export default {plugins:[{name:'fixture-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]};`,
-  },
-  {
-    finding: 'activated-dependency-plugin',
-    config: `import {normalizePath} from 'vite';const resolveId=normalizePath.bind(null,'${protectedTarget}');export default {plugins:[{name:'activated-dependency-function',resolveId}]};`,
-  },
-  {
-    finding: 'plugin-configResolved',
-    config: `let ready=false;export default {plugins:[{name:'fixture-state',configResolved(){ready=true},resolveId(id){if(ready&&id==='@policy')return '${protectedTarget}'}}]};`,
-  },
-  {
-    finding: 'plugin-project-chain',
-    configFile: 'vitest.config.mjs',
-    config: "export default {test:{projects:[{name:'chained',extends:'./project.config.mjs'}]}};",
-    files: {
-      'project.config.mjs': `export default {plugins:[{name:'project-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]};`,
-    },
-  },
-  {
-    finding: 'F13-package-import-exact',
-    config: 'export default {};',
-    consumer: "import value from '#policy';export {value};",
-    expectedSpecifier: '#policy',
-    packageJson: JSON.stringify({
-      name: 'heldout-runtime-fixture',
-      type: 'module',
-      imports: { '#policy': protectedPackageTarget },
-    }),
-  },
-  {
-    finding: 'F13-package-import-pattern',
-    config: 'export default {};',
-    consumer: "import value from '#policy/value';export {value};",
-    expectedSpecifier: '#policy/value',
-    packageJson: JSON.stringify({
-      name: 'heldout-runtime-fixture',
-      type: 'module',
-      imports: { '#policy/*': protectedPackageTarget },
-    }),
-  },
-  {
-    finding: 'F19-package-import-conditions',
-    config: 'export default {};',
-    consumer: "import value from '#policy';export {value};",
-    expectedSpecifier: '#policy',
-    packageJson: JSON.stringify({
-      name: 'heldout-runtime-fixture',
-      type: 'module',
-      imports: { '#policy': { import: protectedPackageTarget, default: './src/ordinary.ts' } },
-    }),
-  },
-  {
-    finding: 'F21-regex-alias',
-    config: `export default {resolve:{alias:[{find:/^@policy$/,replacement:'${protectedTarget}'}]}};`,
-  },
-] as const;
-
-const cleanRuntimeControls: readonly MigratedRuntimeCase[] = [
-  {
-    finding: 'F54-plain-plugin-calls',
-    config: `const helper=()=>({name:'ordinary'});export default {plugins:[helper(),helper({x:1})]};`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F54-property-read',
-    config: `const shared={plugins:[]};export default {...shared,plugins:[shared.plugins.length&&false]};`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F54-array-spread-read',
-    config: `const shared={plugins:[]};export default {...shared,plugins:[...shared.plugins]};`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F60-strict-equality',
-    config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};void(shared===shared);export default shared;`,
-  },
-  {
-    finding: 'F60-nonsemantic-instanceof',
-    config: `const shared={plugins:[]};void(shared.plugins instanceof Array);export default shared;`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F61-const-alias-void',
-    config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};const p=shared;void p;export default shared;`,
-  },
-  {
-    finding: 'F64-plugin-only-placement',
-    config: `const rules=[{name:'ordinary'}];function install(value){value.name='updated'}install(rules[0]);export default {plugins:rules};`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F65-plugin-only-indirection',
-    config: `const rules=[{name:'ordinary'}];const shared={plugins:rules};function install(value){value.name='updated'}install(shared.plugins[0]);export default shared;`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F67-later-explicit-property-wins',
-    config: `const overlay={plugins:[{name:'mutated'}]};const shared={...overlay,plugins:[{name:'safe'}]};shared.plugins[0].name='still-safe';export default shared;`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F69-terminal-plugin-array',
-    config: `const plugins=[];const shared={plugins};function install(value){void value.length}install(shared.plugins);export default shared;`,
-    consumer: "import value from './ordinary'; void value;",
-  },
-  {
-    finding: 'F68-extends-true-root-reuse',
-    configFile: 'vitest.config.mjs',
-    config: `export default {resolve:{alias:{'@policy':'/work/src/ordinary.ts'}},test:{projects:[{name:'reuse',extends:true}]}};`,
-  },
-] as const;
-
-function writeFixtureFile(root: string, path: string, source: string | Uint8Array): void {
-  const absolute = join(root, path);
-  mkdirSync(dirname(absolute), { recursive: true });
-  writeFileSync(absolute, source);
-}
-
-function copyRepositoryPath(source: string, target: string): void {
-  if (statSync(source).isDirectory()) {
-    mkdirSync(target, { recursive: true });
-    for (const entry of readdirSync(source)) {
-      copyRepositoryPath(join(source, entry), join(target, entry));
-    }
-    return;
-  }
-  mkdirSync(dirname(target), { recursive: true });
-  writeFileSync(target, readFileSync(source));
-}
-
-async function inspectFixture(fixture: RuntimeFixture): Promise<HeldoutRuntimeGuardReport> {
-  const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-fixture-'));
-  try {
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
-    return await runHeldoutRuntimeGuard({
-      root,
-      slice: 'F',
-      bindings,
-      ...(fixture.aggregateTimeoutMs === undefined
-        ? {}
-        : { aggregateTimeoutMs: fixture.aggregateTimeoutMs }),
-    });
-  } finally {
-    rmSync(root, { recursive: true, force: true });
-  }
-}
-
-async function inspectRealTree(
-  configFile: 'vite.config.ts' | 'vitest.config.ts',
-  extraConfig?: { readonly path: string; readonly source: string },
-): Promise<HeldoutRuntimeGuardReport> {
-  const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-real-tree-'));
-  try {
-    for (const directory of ['src', 'tools', 'docs', 'drizzle', 'tests', 'public']) {
-      copyRepositoryPath(directory, join(root, directory));
-    }
-    for (const file of ['package.json', 'package-lock.json', 'index.html']) {
-      copyRepositoryPath(file, join(root, file));
-    }
-    copyRepositoryPath(configFile, join(root, extraConfig === undefined ? configFile : 'base-config.ts'));
-    if (extraConfig !== undefined) {
-      writeFixtureFile(root, extraConfig.path, extraConfig.source);
-      writeFixtureFile(root, 'src/injected-runtime-consumer.ts', "import policy from '@policy'; void policy;");
-    }
-    mkdirSync(join(root, 'node_modules'));
-    return await runHeldoutRuntimeGuard({ root, slice: 'F', bindings });
-  } finally {
-    rmSync(root, { recursive: true, force: true });
-  }
-}
-
-const actualConfigurationReports = new Map<'vite.config.ts' | 'vitest.config.ts', HeldoutRuntimeGuardReport>();
-for (const configFile of ['vite.config.ts', 'vitest.config.ts'] as const) {
-  actualConfigurationReports.set(configFile, await inspectRealTree(configFile));
-}
-const injectedAliasRealTreeReport = await inspectRealTree('vite.config.ts', {
-  path: 'vite.config.mjs',
-  source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,resolve:{...value.resolve,alias:{'@policy':'${protectedTarget}'}}}};`,
-});
-const injectedResolverRealTreeReport = await inspectRealTree('vite.config.ts', {
-  path: 'vite.config.mjs',
-  source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,plugins:[...(value.plugins??[]),{name:'injected-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]}};`,
-});
-describe('held-out runtime resolution guard', () => {
-  it('passes the Node 24 bubblewrap isolation preflight', () => {
-    expect(runHeldoutIsolationPreflight()).toMatchObject({
-      status: 'passed',
-      bubblewrapVersion: 'bubblewrap 0.6.1',
+function validWorkerReport(): unknown {
+  return {
+    protocol: 'heldout-runtime-v1',
+    slice: 'F',
+    completed: true,
+    eligibleFiles: 1,
+    astInspectedFiles: 1,
+    configurationLoad: [{
+      file: '<preflight>',
+      kind: 'preflight',
+      project: null,
+      environment: 'isolation',
+      status: 'loaded',
+      errorClass: null,
+      runtimeRoot: '/opt/node',
       runtimeVersion: 'v24.13.0',
-      checks: expect.arrayContaining([
-        'scratch_write_allowed',
-        'work_read_only',
-        'guard_read_only',
-        'external_network_unreachable',
-        'new_session_and_die_with_parent_enabled',
-      ]),
-    });
-  });
-
-  it('reports a real Vite alias resolution to the protected module', async () => {
-    const report = await inspectFixture({
-      config: "export default { resolve: { alias: { '@policy': '/work/src/vtt/heldout-evaluation.ts' } } };",
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'runtime_protocol_resolution',
-    }));
-    expect(report.resolution).toContainEqual(expect.objectContaining({
-      specifier: '@policy',
-      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
-      status: 'protected',
-    }));
-  });
-
-  it.each(migratedRuntimeCases)('executes $finding through the installed resolver', async (runtimeCase) => {
-    const report = await inspectFixture(runtimeCase);
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'runtime_protocol_resolution',
-    }));
-    expect(report.resolution).toContainEqual(expect.objectContaining({
-      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
-      specifier: runtimeCase.expectedSpecifier ?? '@policy',
-      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
-      status: 'protected',
-    }));
-  });
-
-  it.each(migratedRuntimeCases)('keeps the $finding ordinary-target mutant clean', async (runtimeCase) => {
-    const redirectedFiles = Object.fromEntries(Object.entries(runtimeCase.files ?? {}).map(([path, source]) => [
-      path,
-      source.replaceAll(protectedTarget, '/work/src/ordinary.ts'),
-    ]));
-    const report = await inspectFixture({
-      ...runtimeCase,
-      config: runtimeCase.config.replaceAll(protectedTarget, '/work/src/ordinary.ts'),
-      files: redirectedFiles,
-      ...(runtimeCase.packageJson === undefined ? {} : {
-        packageJson: runtimeCase.packageJson
-          .replaceAll(protectedTarget, '/work/src/ordinary.ts')
-          .replaceAll(protectedPackageTarget, './src/ordinary.ts'),
-      }),
-    });
-
-    expect(report.findings).toEqual([]);
-    expect(report.resolution).toContainEqual(expect.objectContaining({
-      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
-      specifier: runtimeCase.expectedSpecifier ?? '@policy',
+    }],
+    resolution: [{
+      configuration: 'vite.config.mjs',
+      project: null,
+      environment: 'client',
+      phase: 'resolve',
+      conditions: ['browser'],
+      seed: 'src/main.ts',
+      specifier: './ordinary',
+      importer: '<candidate>/src/main.ts',
       resolvedId: '<candidate>/src/ordinary.ts',
-      status: 'clean',
-    }));
-  });
-
-  it.each(cleanRuntimeControls)('keeps the $finding negative control clean', async (runtimeCase) => {
-    const report = await inspectFixture(runtimeCase);
-
-    expect(report.findings).toEqual([]);
-    expect(report.resolution).not.toContainEqual(expect.objectContaining({ status: 'protected' }));
-  });
-
-  it('fails closed when the alias is removed while the consumer remains', async () => {
-    const report = await inspectFixture({ config: 'export default {};' });
-
-    expect(report.findings.length).toBeGreaterThan(0);
-    expect(report.findings.every((finding) => finding.kind === 'unresolved_module_edge')).toBe(true);
-    expect(report.resolution).toContainEqual(expect.objectContaining({
-      specifier: '@policy',
-      resolvedId: null,
-      status: 'unresolved',
-    }));
-    expect(report.resolution).not.toContainEqual(expect.objectContaining({
-      specifier: '@policy',
-      status: 'protected',
-    }));
-    expect(report.resolution).not.toContainEqual(expect.objectContaining({
-      specifier: '@policy',
+      source: 'graph',
       status: 'clean',
-    }));
-  });
-
-  it('uses the real transform result for import.meta.glob and raw module edges', async () => {
-    const report = await inspectFixture({
-      config: 'export default {};',
-      consumer: [
-        "export const modules = import.meta.glob('./vtt/heldout-*.ts');",
-        "import source from './vtt/heldout-evaluation.ts?raw';",
-        "export const asset = new URL('./vtt/heldout-evaluation.ts?url', import.meta.url);",
-        'export { source };',
-      ].join('\n'),
-    });
-
-    expect(report.resolution).toEqual(expect.arrayContaining([
-      expect.objectContaining({ source: 'transformed', status: 'protected' }),
-      expect.objectContaining({ specifier: './vtt/heldout-evaluation.ts?raw', status: 'protected' }),
-      expect.objectContaining({ specifier: './vtt/heldout-evaluation.ts?url', status: 'protected' }),
-    ]));
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
-  });
-
-  const runtimeGlobCases = [
-    [
-      'exact glob',
-      "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts');",
-      "export const modules=import.meta.glob('./ordinary.ts');",
-    ],
-    [
-      'negative glob ordering',
-      "export const modules=import.meta.glob(['./vtt/*.ts','!./vtt/ordinary.ts']);",
-      "export const modules=import.meta.glob(['./vtt/*.ts','!./vtt/heldout-evaluation.ts']);",
-    ],
-    [
-      'extglob',
-      "export const modules=import.meta.glob('./vtt/@(heldout-evaluation).ts');",
-      "export const modules=import.meta.glob('./@(ordinary).ts');",
-    ],
-    [
-      'literal option spread and base',
-      "export const modules=import.meta.glob('./heldout-evaluation.ts',{...{base:'./vtt'},eager:true});",
-      "export const modules=import.meta.glob('./ordinary.ts',{...{base:'./'},eager:true});",
-    ],
-    [
-      'query option',
-      "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts',{query:'?raw',import:'default'});",
-      "export const modules=import.meta.glob('./ordinary.ts',{query:'?raw',import:'default'});",
-    ],
-  ] as const;
-
-  it.each(runtimeGlobCases)('delegates %s matching to the installed Vite transform', async (_label, leakConsumer) => {
-    const leak = await inspectFixture({ config: 'export default {};', consumer: leakConsumer });
-
-    expect(leak.resolution).toContainEqual(expect.objectContaining({
-      status: 'protected',
-      source: 'transformed',
-    }));
-    expect(leak.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
-  });
-
-  it.each(runtimeGlobCases)('keeps the %s transform mutant clean', async (_label, _leakConsumer, cleanConsumer) => {
-    const clean = await inspectFixture({ config: 'export default {};', consumer: cleanConsumer });
+    }],
+    seedAssignments: [{
+      seed: 'src/main.ts',
+      configuration: 'vite.config.mjs',
+      project: null,
+      environment: 'client',
+    }],
+    findings: [],
+  };
+}
 
-    expect(clean.findings).toEqual([]);
+describe('held-out runtime guard pure contracts', () => {
+  it.each([
+    [554, 2_048],
+    [2_000, 3_024],
+  ] as const)('derives a load-aware UID task ceiling from %i tasks', (tasks, expected) => {
+    expect(heldoutRuntimeNprocLimit(tasks)).toBe(expected);
   });
 
-  it('fails closed before Vite performs an unbounded leading-globstar filesystem scan', async () => {
-    const report = await inspectFixture({
-      config: 'export default {};',
-      consumer: "export const modules=import.meta.glob('**/heldout-evaluation.ts');",
-    });
-
-    expect(report.resolution).toContainEqual(expect.objectContaining({
-      specifier: '**/heldout-evaluation.ts',
-      status: 'unresolved',
-      source: 'transformed',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
-  });
-
-  it('does not misreport an ordinary leading-globstar mutant as protected', async () => {
-    const report = await inspectFixture({
-      config: 'export default {};',
-      consumer: "export const modules=import.meta.glob('**/ordinary-runtime-control.ts');",
-      files: { 'src/ordinary-runtime-control.ts': 'export default 3;' },
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
-    expect(report.resolution).not.toContainEqual(expect.objectContaining({ status: 'protected' }));
-  });
-
-  it('excludes declaration-only files from runtime seed and transform inspection', async () => {
-    const report = await inspectFixture({
-      config: "export default {resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};",
-      files: { 'src/runtime-only.d.ts': "import type Value from './vtt/heldout-evaluation';export type Alias=Value;" },
-    });
-
-    expect(report.findings).toEqual([]);
-    expect(report.seedAssignments).not.toContainEqual(expect.objectContaining({ seed: 'src/runtime-only.d.ts' }));
+  it.each([
+    ['direct require', "require('#policy')", 'require', '#policy'],
+    ['require alias', "const load=require;load('#policy')", 'require', '#policy'],
+    ['constant concatenation', "import('#'+'policy')", 'dynamic_import', '#policy'],
+    ['import-meta resolver', "import.meta.resolve('#policy')", 'import_meta_resolve', '#policy'],
+    ['resolver alias', "const locate=import.meta.resolve;locate('#policy')", 'import_meta_resolve', '#policy'],
+  ] as const)('retains the %s runtime value edge', (_label, source, kind, specifier) => {
+    expect(discoverHeldoutRuntimeValueEdges('src/consumer.ts', source)).toContainEqual({ kind, specifier });
   });
 
-  it('records conservative source ownership for every Vitest project and keeps tools server-only', async () => {
-    const report = await inspectFixture({
-      configFile: 'vitest.config.mjs',
-      config: "export default {test:{projects:[{test:{name:'first'}},{test:{name:'second'}}]}};",
-      consumer: "import value from './ordinary'; void value;",
-      files: { 'tools/tool.ts': "import {join} from 'node:path'; export const value=join('a','b');" },
-    });
-    const sourceProjects = new Set(report.seedAssignments
-      .filter((row) => row.seed === 'src/consumer.ts')
-      .map((row) => row.project));
-    const toolAssignments = report.seedAssignments.filter((row) => row.seed === 'tools/tool.ts');
-
-    expect(sourceProjects.has('first')).toBe(true);
-    expect(sourceProjects.has('second')).toBe(true);
-    expect(toolAssignments.length).toBeGreaterThan(0);
-    expect(toolAssignments.every((row) => row.environment !== 'client')).toBe(true);
+  it('marks an aliased import.meta.glob call for fail-closed runtime handling', () => {
+    expect(discoverHeldoutRuntimeValueEdges(
+      'src/consumer.ts',
+      "const glob=import.meta.glob;glob('./ordinary.ts')",
+    )).toContainEqual({ kind: 'aliased_import_meta_glob', specifier: './ordinary.ts' });
   });
-
-  it('emits byte-identical canonical reports for identical inputs', async () => {
-    const fixture = { config: `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` };
-    const first = await inspectFixture(fixture);
-    const second = await inspectFixture(fixture);
 
-    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
+  it('keeps erased type-only edges out of runtime traversal', () => {
+    expect(discoverHeldoutRuntimeValueEdges(
+      'src/consumer.ts',
+      "import type {Value} from './types';export type {Other} from './other-types';",
+    )).toEqual([]);
   });
 
-  it('fails closed when configuration execution throws', async () => {
-    const report = await inspectFixture({ config: "throw new TypeError('fixture-load-failure');" });
-
-    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
-      file: 'vite.config.mjs',
-      status: 'failed',
-      errorClass: 'TypeError',
-    }));
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'configuration_load_failed',
-    }));
+  it('accepts a complete, slice-matched worker report', () => {
+    expect(parseHeldoutWorkerReport(validWorkerReport(), 'F')).toMatchObject({ completed: true, slice: 'F' });
   });
 
   it.each([
-    ['missing project extends file', "export default {test:{projects:[{name:'missing',extends:'./missing.config.mjs'}]}};"],
-    ['throwing project extends file', "export default {test:{projects:[{name:'throwing',extends:'./project.config.mjs'}]}};"],
-  ] as const)('fails closed for a %s', async (label, config) => {
-    const report = await inspectFixture({
-      configFile: 'vitest.config.mjs',
-      config,
-      files: label.startsWith('throwing')
-        ? { 'project.config.mjs': "throw new TypeError('extended-config-failure');" }
-        : {},
-    });
-
-    expect(report.findings).toContainEqual(expect.objectContaining({
-      kind: 'configuration_load_failed',
-    }));
-    expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
+    ['wrong slice', { slice: 'B' }],
+    ['missing completion', { completed: false }],
+    ['malformed load row', { configurationLoad: [42] }],
+    ['malformed resolution discriminant', { resolution: [{ status: 'made-up' }] }],
+    ['malformed assignment row', { seedAssignments: [null] }],
+    ['unknown top-level field', { extra: 'not-validated' }],
+  ] as const)('rejects a %s response', (_label, replacement) => {
+    const report = validWorkerReport();
+    if (report === null || typeof report !== 'object') throw new TypeError('Invalid test report.');
+    expect(() => parseHeldoutWorkerReport({ ...report, ...replacement }, 'F')).toThrow();
   });
 
-  it('kills a timed-out configuration process group and removes its scratch directory', async () => {
-    const before = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith('heldout-runtime-')));
-    await expect(inspectFixture({
-      config: 'while (true) {}',
-      aggregateTimeoutMs: 250,
-    })).rejects.toThrow('aggregate timeout');
-    const after = readdirSync(tmpdir()).filter((name) =>
-      name.startsWith('heldout-runtime-') && !before.has(name));
-
-    expect(after).toEqual([]);
-  });
-
-  it('rejects a candidate lock that differs from the trusted installation baseline', async () => {
-    await expect(inspectFixture({
-      config: 'export default {};',
-      lockFile: '{}',
-    })).rejects.toThrow('candidate lock does not match');
-  });
-
-});
+  it('exempts both runtime guard implementation files in combined static candidate inspection', () => {
+    const paths = ['tools/heldout-runtime-guard.ts', 'tools/heldout-runtime-guard-worker.mjs'];
+    const report = inspectHeldoutLeakChanges(paths.map((path) => ({
+      path,
+      addedText: readFileSync(path, 'utf8'),
+      sourceText: readFileSync(path, 'utf8'),
+    })), 'F', bindings);
 
-describe.each([
-  ['Vite', 'vite.config.ts'],
-  ['Vitest', 'vitest.config.ts'],
-] as const)('actual %s configuration runtime control', (_label, configFile) => {
-  it('has zero findings after loading and traversing the real tree', () => {
-    const report = actualConfigurationReports.get(configFile);
-    expect(report).toBeDefined();
-    if (report === undefined) throw new TypeError(`Missing runtime report for ${configFile}.`);
+    expect(report.astInspectedFiles).toBe(2);
     expect(report.findings).toEqual([]);
-    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
-      file: configFile,
-      status: 'loaded',
-    }));
   });
-});
 
-describe('real-tree failure sensitivity', () => {
-  it.each([
-    ['alias', injectedAliasRealTreeReport, 'vite.config.mjs', 6],
-    ['resolveId hook', injectedResolverRealTreeReport, 'vite.config.mjs', 4],
-  ] as const)('reports the injected %s and keeps its canonical configuration identity',
-    (_label, report, configuration, expectedFindingCount) => {
-      expect(report.findings).toHaveLength(expectedFindingCount);
-      expect(report.findings.every((finding) => finding.kind === 'runtime_protocol_resolution')).toBe(true);
+  it('applies retained Rule N inspection to an unchanged extended configuration', () => {
+    const root = mkdtempSync(join(tmpdir(), 'heldout-static-candidate-'));
+    try {
+      mkdirSync(join(root, 'tools'));
+      writeFileSync(join(root, 'vitest.config.mjs'),
+        "export default {test:{projects:[{extends:'./tools/project.config.mjs'}]}};");
+      writeFileSync(join(root, 'tools/project.config.mjs'), [
+        "import {createRequire} from 'node:module';",
+        'const box={load:createRequire(import.meta.url)};',
+        'export default {};',
+      ].join('\n'));
+      const report = inspectHeldoutCandidateTree(root, 'F', bindings);
+
+      expect(report.astInspectedFiles).toBe(2);
       expect(report.findings).toContainEqual(expect.objectContaining({
-        kind: 'runtime_protocol_resolution',
-      }));
-      expect(report.resolution).toContainEqual(expect.objectContaining({
-        configuration,
-        specifier: '@policy',
-        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
-        status: 'protected',
+        path: 'tools/project.config.mjs',
+        kind: 'loader_reference_escaped',
       }));
-    });
+    } finally {
+      rmSync(root, { recursive: true, force: true });
+    }
+  });
 });
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index c680a76af2866865f42e04dbd567556b940b6b2a..4b130919e992079d2f4065f1cf539ce36ed4164e
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -1,18 +1,19 @@
-import { execFileSync, spawnSync } from 'node:child_process';
-import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
+import { execFileSync, spawn, spawnSync } from 'node:child_process';
+import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { posix } from 'node:path';
-import { fileURLToPath } from 'node:url';
-import { canonicalJson } from '../src/commands/canonical-json';
-import type { HeldoutSlice } from '../src/vtt/heldout-evaluation';
+import { fileURLToPath, pathToFileURL } from 'node:url';
 import ts from 'typescript';
 import {
   runHeldoutRuntimeGuard,
+  runHeldoutIsolationPreflight,
   type HeldoutConfigurationLoad,
   type HeldoutRuntimePreflight,
   type HeldoutRuntimeResolution,
   type HeldoutSeedAssignment,
-} from './heldout-runtime-guard';
+} from './heldout-runtime-guard.ts';
+
+export type HeldoutSlice = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
 
 export interface HeldoutChangedText {
   readonly path: string;
@@ -42,6 +43,7 @@
   readonly checkedFiles: number;
   /** Files which completed the full TypeScript AST and symbol inspection pass. */
   readonly astInspectedFiles: number;
+  readonly runtimeCompleted?: boolean;
   readonly preflight?: HeldoutRuntimePreflight;
   readonly configurationLoad?: readonly HeldoutConfigurationLoad[];
   readonly resolution?: readonly HeldoutRuntimeResolution[];
@@ -63,6 +65,8 @@
   'tools/ai-dm-heldout-report.ts',
   'tools/ai-dm-heldout-judge-prompt.ts',
   'tools/heldout-leak-check.ts',
+  'tools/heldout-runtime-guard.ts',
+  'tools/heldout-runtime-guard-worker.mjs',
   'tools/ai-dm-rerun-packet.ts',
 ]);
 
@@ -187,8 +191,8 @@
   { position: 'declaration initializer', loaderValues: 'Rule N1 permits only a plain const namespace alias; Rule N2 permits inert browser-global transfer' },
   { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use' },
   { position: 'assignment', loaderValues: 'Rule N1 failed_closed; Rule N2 browser globals remain inert until loader-member use' },
-  { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source' },
-  { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source' },
+  { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for every loader key extracted from an unknown source' },
+  { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for every loader key extracted from an unknown source' },
   { position: 'parameter default', loaderValues: 'Rule N1 failed_closed; Rule N2 permits browser-global transfer but not loader use through the parameter' },
   { position: 'return', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
   { position: 'yield', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
@@ -1564,6 +1568,32 @@
   };
 }
 
+export function inspectHeldoutCandidateTree(
+  root: string,
+  slice: HeldoutSlice,
+  bindings: HeldoutLeakBindings,
+): HeldoutLeakReport {
+  const candidateSources: HeldoutChangedText[] = [];
+  const collect = (directory: string, prefix = ''): void => {
+    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
+      left.name.localeCompare(right.name))) {
+      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
+      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
+      const absolute = posix.join(directory, entry.name);
+      if (entry.isDirectory()) {
+        if (prefix.length > 0 || relative === 'src' || relative === 'tools') collect(absolute, relative);
+      } else if (isTypeScriptOrJavaScript(relative) && (
+        relative.startsWith('src/') || relative.startsWith('tools/') || isRootViteOrVitestConfig(relative)
+      )) {
+        const sourceText = readFileSync(absolute, 'utf8');
+        candidateSources.push({ path: relative, addedText: sourceText, sourceText });
+      }
+    }
+  };
+  collect(root);
+  return inspectHeldoutLeakChanges(candidateSources, slice, bindings);
+}
+
 export interface GitCandidatePath {
   readonly status: string;
   readonly path: string;
@@ -1658,7 +1688,7 @@
     /^(?:vite|vitest)(?:\.[^.]+)*\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(path);
 }
 
-function parseArgs(argv: readonly string[]): {
+export function parseHeldoutLeakArgs(argv: readonly string[]): {
   readonly base: string;
   readonly candidate: string;
   readonly slice: HeldoutSlice;
@@ -1702,9 +1732,73 @@
   };
 }
 
-async function main(argv: readonly string[]): Promise<void> {
-  const config = parseArgs(argv);
-  const staticReport = inspectHeldoutLeakChanges(
+function childExit(child: ReturnType<typeof spawn>): Promise<number | null> {
+  return new Promise((resolveExit, rejectExit) => {
+    child.once('error', rejectExit);
+    child.once('exit', (code) => resolveExit(code));
+  });
+}
+
+async function extractCandidateArchive(revision: string, destination: string): Promise<void> {
+  const archive = spawn('git', ['archive', '--format=tar', revision], {
+    stdio: ['ignore', 'pipe', 'pipe'],
+  });
+  const extraction = spawn('tar', ['-xf', '-', '-C', destination], {
+    stdio: ['pipe', 'ignore', 'pipe'],
+  });
+  if (archive.stdout === null || archive.stderr === null || extraction.stdin === null ||
+    extraction.stderr === null) throw new TypeError('Candidate archive pipes were not created.');
+  let archiveError = '';
+  let extractionError = '';
+  archive.stderr.setEncoding('utf8');
+  extraction.stderr.setEncoding('utf8');
+  archive.stderr.on('data', (chunk: string) => { archiveError += chunk; });
+  extraction.stderr.on('data', (chunk: string) => { extractionError += chunk; });
+  extraction.stdin.on('error', () => undefined);
+  archive.stdout.pipe(extraction.stdin);
+  const [archiveCode, extractionCode] = await Promise.all([childExit(archive), childExit(extraction)]);
+  if (archiveCode !== 0 || extractionCode !== 0) {
+    throw new TypeError(`Candidate archive extraction failed: ${archiveError || extractionError ||
+      `git=${String(archiveCode)} tar=${String(extractionCode)}`}`);
+  }
+}
+
+export async function runHeldoutLeakCli(argv: readonly string[]): Promise<void> {
+  const config = parseHeldoutLeakArgs(argv);
+  const preflight = runHeldoutIsolationPreflight();
+  if (preflight.status === 'isolation_failed') {
+    const report: HeldoutLeakReport = {
+      protocol: 'heldout-ordinary-v1',
+      slice: config.slice,
+      reserveDigests: [...config.bindings.reserveDigests],
+      resultPaths: [...config.bindings.resultPaths],
+      checkedFiles: 0,
+      astInspectedFiles: 0,
+      runtimeCompleted: false,
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
+      findings: [{
+        path: '<preflight>',
+        kind: 'configuration_load_failed',
+        detail: preflight.detail ?? 'Isolation preflight failed.',
+      }],
+    };
+    process.stdout.write(`${JSON.stringify(report)}\n`);
+    process.exitCode = 1;
+    return;
+  }
+  const changedStaticReport = inspectHeldoutLeakChanges(
     addedChanges(config.base, config.candidate),
     config.slice,
     config.bindings,
@@ -1714,46 +1808,39 @@
   mkdirSync(candidateRoot);
   mkdirSync(posix.join(candidateRoot, 'node_modules'));
   try {
-    const archive = execFileSync('git', ['archive', '--format=tar', config.candidate], {
-      maxBuffer: 256 * 1024 * 1024,
-    });
-    const extraction = spawnSync('tar', ['-xf', '-', '-C', candidateRoot], {
-      input: archive,
-      encoding: 'utf8',
-      maxBuffer: 64 * 1024 * 1024,
+    await extractCandidateArchive(config.candidate, candidateRoot);
+    const candidateStaticReport = inspectHeldoutCandidateTree(candidateRoot, config.slice, config.bindings);
+    const staticFindingKeys = new Set<string>();
+    const staticFindings = [...changedStaticReport.findings, ...candidateStaticReport.findings].filter((finding) => {
+      const key = JSON.stringify(finding);
+      if (staticFindingKeys.has(key)) return false;
+      staticFindingKeys.add(key);
+      return true;
     });
-    if (extraction.status !== 0) {
-      throw new TypeError(`Candidate archive extraction failed: ${extraction.stderr}`);
-    }
     const runtimeReport = await runHeldoutRuntimeGuard({
       root: candidateRoot,
       slice: config.slice,
       bindings: config.bindings,
     });
     const report: HeldoutLeakReport = {
-      ...staticReport,
+      ...candidateStaticReport,
+      findings: [...staticFindings, ...runtimeReport.findings],
+      runtimeCompleted: runtimeReport.completed,
       preflight: runtimeReport.preflight,
       configurationLoad: runtimeReport.configurationLoad,
       resolution: runtimeReport.resolution,
       seedAssignments: runtimeReport.seedAssignments,
-      findings: [...staticReport.findings, ...runtimeReport.findings],
     };
-    process.stdout.write(`${canonicalJson(report)}\n`);
+    process.stdout.write(`${JSON.stringify(report)}\n`);
     if (report.findings.length > 0) process.exitCode = 1;
   } finally {
     rmSync(scratchRoot, { recursive: true, force: true });
   }
 }
 
-const scriptIndex = process.argv.findIndex((argument) =>
-  argument.endsWith('/heldout-leak-check.ts') || argument.endsWith('\\heldout-leak-check.ts'));
-const mainArguments = scriptIndex >= 0
-  ? process.argv.slice(scriptIndex + 1)
-  : process.argv.includes('--base') && process.argv.includes('--candidate')
-    ? process.argv.slice(2)
-    : null;
-if (mainArguments !== null) {
-  void main(mainArguments).catch((error: unknown) => {
+const invokedPath = process.argv[1];
+if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
+  void runHeldoutLeakCli(process.argv.slice(2)).catch((error: unknown) => {
     process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
     process.exitCode = 1;
   });
diff --git a/tools/heldout-runtime-guard-worker.mjs b/tools/heldout-runtime-guard-worker.mjs
index bc51040e5e3d03a1278d3b196a6084a639fb5321..78c1201c8b5611ab28c50f9b2eed5346d8b52c50
--- a/tools/heldout-runtime-guard-worker.mjs
+++ b/tools/heldout-runtime-guard-worker.mjs
@@ -55,16 +55,22 @@
     ? Reflect.get(value, 'phaseTimeoutMs')
     : null;
   const bindings = value !== null && typeof value === 'object' ? Reflect.get(value, 'bindings') : null;
+  const valueEdges = value !== null && typeof value === 'object' ? Reflect.get(value, 'valueEdges') : null;
   const trustedLockDigest = stringProperty(value, 'trustedLockDigest');
   const reserveDigests = stringArray(bindings, 'reserveDigests');
   const resultPaths = stringArray(bindings, 'resultPaths');
   if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(slice) ||
     typeof phaseTimeoutMs !== 'number' || !Number.isSafeInteger(phaseTimeoutMs) ||
     phaseTimeoutMs < 1 || phaseTimeoutMs > 30_000 || reserveDigests === null || resultPaths === null ||
-    trustedLockDigest === null || !/^[a-f0-9]{64}$/u.test(trustedLockDigest)) {
+    trustedLockDigest === null || !/^[a-f0-9]{64}$/u.test(trustedLockDigest) ||
+    valueEdges === null || typeof valueEdges !== 'object' || Array.isArray(valueEdges) ||
+    !Object.entries(valueEdges).every(([path, edges]) => typeof path === 'string' && Array.isArray(edges) &&
+      edges.every((edge) => edge !== null && typeof edge === 'object' &&
+        typeof Reflect.get(edge, 'kind') === 'string' &&
+        (typeof Reflect.get(edge, 'specifier') === 'string' || Reflect.get(edge, 'specifier') === null)))) {
     throw new TypeError('invalid_request');
   }
-  return { slice, phaseTimeoutMs, trustedLockDigest, bindings: { reserveDigests, resultPaths } };
+  return { slice, phaseTimeoutMs, trustedLockDigest, valueEdges, bindings: { reserveDigests, resultPaths } };
 }
 
 function withTimeout(promise, milliseconds, label) {
@@ -78,7 +84,8 @@
 
 function walk(directory, prefix = '') {
   const files = [];
-  for (const entry of readdirSync(directory, { withFileTypes: true })) {
+  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
+    left.name.localeCompare(right.name))) {
     if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
     const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
     const absolute = resolve(directory, entry.name);
@@ -112,15 +119,30 @@
 function constantString(ts, expression) {
   if (expression === undefined) return null;
   if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
+  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
+    ts.isSatisfiesExpression(expression) || ts.isNonNullExpression(expression) ||
+    ts.isTypeAssertionExpression(expression)) return constantString(ts, expression.expression);
+  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
+    const left = constantString(ts, expression.left);
+    const right = constantString(ts, expression.right);
+    return left === null || right === null ? null : left + right;
+  }
+  if (ts.isTemplateExpression(expression)) {
+    let value = expression.head.text;
+    for (const span of expression.templateSpans) {
+      const substitution = constantString(ts, span.expression);
+      if (substitution === null) return null;
+      value += substitution + span.literal.text;
+    }
+    return value;
+  }
   return null;
 }
 
 function runtimeEdges(ts, path, source) {
   const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(ts, path));
   const edges = [];
-  const add = (specifier, sourceKind = 'graph') => {
-    if (specifier !== null) edges.push({ specifier, source: sourceKind });
-  };
+  const add = (specifier, kind = 'static_import') => edges.push({ specifier, kind });
   const addRuntimeUrl = (specifier) => {
     if (specifier === null) return;
     const target = resolve(dirname(withoutQuery(path)), withoutQuery(specifier));
@@ -129,7 +151,7 @@
     } catch {
       // Missing URL-backed files must reach resolution and fail closed.
     }
-    add(specifier);
+    add(specifier, 'static_import');
   };
   const visit = (node) => {
     if (ts.isImportDeclaration(node)) {
@@ -139,18 +161,29 @@
         ts.isNamespaceImport(clause.namedBindings) ||
         clause.namedBindings.elements.some((element) => !element.isTypeOnly)
       ));
-      if (valueBinding) add(constantString(ts, node.moduleSpecifier));
+      if (valueBinding) add(constantString(ts, node.moduleSpecifier), 'static_import');
     } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly) {
       const valueExport = node.exportClause === undefined || ts.isNamespaceExport(node.exportClause) ||
         node.exportClause.elements.some((element) => !element.isTypeOnly);
-      if (valueExport) add(constantString(ts, node.moduleSpecifier));
+      if (valueExport) add(constantString(ts, node.moduleSpecifier), 're_export');
     } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
       ts.isExternalModuleReference(node.moduleReference)) {
-      add(constantString(ts, node.moduleReference.expression));
+      add(constantString(ts, node.moduleReference.expression), 'import_equals');
     } else if (ts.isCallExpression(node)) {
-      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(constantString(ts, node.arguments[0]));
+      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(constantString(ts, node.arguments[0]), 'dynamic_import');
+      else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
+        add(constantString(ts, node.arguments[0]), 'require');
+      } else if (ts.isPropertyAccessExpression(node.expression) &&
+        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'require' &&
+        node.expression.name.text === 'resolve') {
+        add(constantString(ts, node.arguments[0]), 'require_resolve');
+      } else if (ts.isPropertyAccessExpression(node.expression) &&
+        ts.isMetaProperty(node.expression.expression) && node.expression.expression.name.text === 'meta' &&
+        node.expression.name.text === 'resolve') {
+        add(constantString(ts, node.arguments[0]), 'import_meta_resolve');
+      }
       else if (ts.isIdentifier(node.expression) && node.expression.text === 'importScripts') {
-        for (const argument of node.arguments) add(constantString(ts, argument));
+        for (const argument of node.arguments) add(constantString(ts, argument), 'import_scripts');
       }
     } else if (ts.isNewExpression(node) &&
       ts.isIdentifier(node.expression) && node.expression.text === 'URL' &&
@@ -163,8 +196,9 @@
       ts.isIdentifier(node.expression) && ['Worker', 'SharedWorker'].includes(node.expression.text)) {
       const first = node.arguments?.[0];
       if (first !== undefined && ts.isNewExpression(first) && ts.isIdentifier(first.expression) &&
-        first.expression.text === 'URL') add(constantString(ts, first.arguments?.[0]));
-      else add(constantString(ts, first));
+        first.expression.text === 'URL') add(constantString(ts, first.arguments?.[0]),
+          node.expression.text === 'Worker' ? 'worker' : 'shared_worker');
+      else add(constantString(ts, first), node.expression.text === 'Worker' ? 'worker' : 'shared_worker');
     }
     ts.forEachChild(node, visit);
   };
@@ -216,6 +250,12 @@
   return value.replaceAll('/work/', '<candidate>/').replace(/^\/work$/u, '<candidate>');
 }
 
+function decodedViteInternalId(id) {
+  if (id.startsWith('/@id/__x00__')) return `\0${id.slice('/@id/__x00__'.length)}`;
+  if (id.startsWith('/@id/')) return id.slice('/@id/'.length);
+  return null;
+}
+
 function digestMatches(path, reserveDigests) {
   if (!existsSync(path)) return false;
   try {
@@ -271,8 +311,10 @@
     specifier.startsWith(browserExternalPrefix) && BUILTINS.has(specifier.slice(browserExternalPrefix.length));
 }
 
-function externalDependency(specifier, id, external) {
-  if (builtinSpecifier(specifier) || builtinSpecifier(id)) return 'external_builtin';
+function externalBoundary(specifier, id, external) {
+  if (builtinSpecifier(id) || (id === specifier && builtinSpecifier(specifier))) {
+    return { status: 'external_builtin', canonical: id };
+  }
   let resolved = id;
   try {
     if (external === true && !resolved.startsWith('/')) resolved = workRequire.resolve(specifier);
@@ -284,7 +326,9 @@
   if (!resolved.startsWith(`${nodeModulesRoot}${sep}`)) return null;
   const resolvedDirectory = existsSync(resolved) && !extname(resolved) ? resolved : resolve(resolved, '..');
   if (!hasPackageProvenance(resolvedDirectory, nodeModulesRoot)) return null;
-  if (specifier.startsWith('/') || specifier.startsWith('file:')) return 'external_dependency';
+  if (specifier.startsWith('/') || specifier.startsWith('file:')) {
+    return { status: 'external_dependency', canonical: resolved };
+  }
   if (specifier.startsWith('.') || specifier.startsWith('#') ||
     /^[a-z][a-z0-9+.-]*:/iu.test(specifier)) return null;
   const packageName = barePackageName(specifier);
@@ -297,7 +341,7 @@
       : resolve(nodeModulesRoot, packageName);
     if (!existsSync(resolve(packageRoot, 'package.json'))) return null;
   }
-  return 'external_dependency';
+  return { status: 'external_dependency', canonical: resolved };
 }
 
 function conditionsFor(environment) {
@@ -342,6 +386,10 @@
   return 'UnknownError';
 }
 
+function canonicalFailureDetail(configuration, phase, error) {
+  return `${configuration} ${phase} failed (${errorClass(error)})`;
+}
+
 function reportPath(path) {
   return canonicalId(path) ?? path;
 }
@@ -365,6 +413,7 @@
   const resolution = [];
   const seedAssignments = [];
   const findings = [];
+  const closedContainers = new WeakSet();
   const seeds = sourceSeeds();
   const configs = rootConfigs();
 
@@ -400,6 +449,37 @@
     }
   };
 
+  const recordConfigurationFailure = (configuration, kind, project, environment, phase, error) => {
+    const timedOut = error instanceof Error && error.message.startsWith('phase_timeout:');
+    recordLoad(configuration, kind, project, environment, timedOut ? 'timed_out' : 'failed', errorClass(error));
+    findings.push({
+      path: configuration,
+      kind: 'configuration_load_failed',
+      detail: canonicalFailureDetail(configuration, phase, error),
+    });
+  };
+
+  const closeServerStrict = async (server) => {
+    let firstFailure = null;
+    for (const [name, environment] of Object.entries(server.environments).sort(([left], [right]) =>
+      left.localeCompare(right))) {
+      const container = environment.pluginContainer;
+      if (closedContainers.has(container)) continue;
+      closedContainers.add(container);
+      try {
+        await container.close();
+      } catch (error) {
+        firstFailure ??= error;
+      }
+    }
+    try {
+      await server.close();
+    } catch (error) {
+      firstFailure ??= error;
+    }
+    if (firstFailure !== null) throw firstFailure;
+  };
+
   const inspectEnvironment = async (configuration, project, name, environment, aliasEntries, includeSeeds) => {
     const serverStyle = environmentIsServer(name, environment);
     const environmentRoot = typeof environment.config.root === 'string' ? environment.config.root : '/work';
@@ -427,9 +507,25 @@
       source: 'protected_control',
       specifier: '/src/vtt/heldout-evaluation.ts',
     });
+    const addUnresolvedEdge = (current, specifier, source = current.source) => {
+      addResolution({
+        configuration,
+        project,
+        environment: name,
+        phase: 'resolve',
+        conditions,
+        seed: current.seed,
+        specifier: specifier ?? '<non-constant>',
+        importer: canonicalId(current.id),
+        resolvedId: null,
+        source,
+        status: 'unresolved',
+      });
+    };
     while (queue.length > 0) {
-      const batch = queue.splice(0, queue.length);
-      await Promise.all(batch.map(async (current) => {
+      queue.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
+      const current = queue.shift();
+      if (current === undefined) break;
       if (current.specifier !== undefined) {
         let resolvedResult;
         try {
@@ -438,15 +534,21 @@
           resolvedResult = null;
         }
         const resolvedId = resolvedResult?.id ?? null;
+        const boundary = resolvedId === null ? null : externalBoundary(
+          current.specifier,
+          resolvedId,
+          resolvedResult?.external === true,
+        );
+        const identity = boundary?.canonical ?? resolvedId;
         let status;
-        if (resolvedId !== null && protectedIdentity(resolvedId, request.bindings)) {
+        if (identity !== null && protectedIdentity(identity, request.bindings)) {
           status = current.source === 'protected_control' ? 'control' : 'protected';
         } else if (resolvedId === null) {
           status = builtinSpecifier(current.specifier) ? 'external_builtin' : 'unresolved';
+        } else if (boundary !== null) {
+          status = boundary.status;
         } else {
-          const boundary = externalDependency(current.specifier, resolvedId, resolvedResult?.external === true);
-          status = boundary ?? 'clean';
-          if (resolvedResult?.external === true && boundary === null) status = 'unresolved';
+          status = resolvedResult?.external === true ? 'unresolved' : 'resolved';
         }
         addResolution({
           configuration,
@@ -457,20 +559,23 @@
           seed: current.seed,
           specifier: current.specifier,
           importer: canonicalId(current.id),
-          resolvedId: canonicalId(resolvedId),
+          resolvedId: canonicalId(identity),
           source: current.source,
           status,
         });
         if (status === 'unresolved' || status === 'protected' || status === 'control' ||
-          status === 'external_builtin' || status === 'external_dependency' || resolvedId === null) return;
-        const local = withoutQuery(resolvedId);
-        if (local.startsWith('/work/') || resolvedId.startsWith('\0')) {
-          queue.push({ id: resolvedId, seed: current.seed, source: current.source });
-        }
-        return;
+          status === 'external_builtin' || status === 'external_dependency' || resolvedId === null) continue;
+        queue.push({
+          id: resolvedId,
+          seed: current.seed,
+          source: current.source,
+          requested: { specifier: current.specifier, importer: current.id },
+        });
+        continue;
       }
-      const visitKey = `${name}\0${current.id}`;
-      if (visited.has(visitKey)) return;
+      const provenance = current.source === 'protected_control' ? 'control' : 'ordinary';
+      const visitKey = `${name}\0${provenance}\0${current.id}`;
+      if (visited.has(visitKey)) continue;
       visited.add(visitKey);
       const localPath = withoutQuery(current.id);
       let sourceText = null;
@@ -478,8 +583,22 @@
         sourceText = readFileSync(localPath, 'utf8');
       }
       if (sourceText !== null) {
-        for (const edge of runtimeEdges(ts, localPath, sourceText)) {
-          queue.push({ id: current.id, seed: current.seed, source: edge.source, specifier: edge.specifier });
+        const relative = localPath.startsWith('/work/') ? localPath.slice('/work/'.length) : null;
+        const suppliedEdges = relative === null ? null : request.valueEdges[relative] ?? null;
+        const edges = suppliedEdges ?? runtimeEdges(ts, localPath, sourceText);
+        for (const edge of edges) {
+          if (edge.kind === 'import_meta_glob') continue;
+          if (edge.specifier === null || edge.kind === 'aliased_import_meta_glob') {
+            addUnresolvedEdge(current, edge.specifier, current.source);
+          } else {
+            const internalId = decodedViteInternalId(edge.specifier);
+            if (internalId === null) {
+              queue.push({ id: current.id, seed: current.seed, source: current.source, specifier: edge.specifier });
+            } else {
+              queue.push({ id: internalId, seed: current.seed, source: current.source,
+                requested: { specifier: edge.specifier, importer: current.id } });
+            }
+          }
         }
         const unboundedGlobs = unboundedRootGlobPatterns(ts, localPath, sourceText);
         if (unboundedGlobs.length > 0) {
@@ -498,18 +617,27 @@
               status: 'unresolved',
             });
           }
-          return;
+          continue;
         }
       }
       let transformed = null;
       try {
-        const suffix = current.id.slice(localPath.length);
-        const url = localPath.startsWith(`${environmentRoot}/`)
-          ? `/${posix.relative(environmentRoot, localPath)}${suffix}`
-          : localPath.startsWith('/work/')
-            ? `/@fs/${localPath}${suffix}`
-            : current.id;
-        transformed = await environment.transformRequest(url);
+        if (current.id.startsWith('\0') || !current.id.startsWith('/')) {
+          const loaded = await environment.pluginContainer.load(current.id);
+          if (loaded !== null) {
+            const code = typeof loaded === 'string' ? loaded : loaded.code;
+            const result = await environment.pluginContainer.transform(code, current.id);
+            transformed = result ?? { code };
+          }
+        } else {
+          const suffix = current.id.slice(localPath.length);
+          const url = localPath.startsWith(`${environmentRoot}/`)
+            ? `/${posix.relative(environmentRoot, localPath)}${suffix}`
+            : localPath.startsWith('/work/')
+              ? `/@fs/${localPath}${suffix}`
+              : current.id;
+          transformed = await environment.transformRequest(url);
+        }
       } catch {
         transformed = null;
       }
@@ -521,13 +649,13 @@
           phase: 'transform',
           conditions,
           seed: current.seed,
-          specifier: canonicalId(current.id) ?? current.id,
-          importer: canonicalId(current.id),
+          specifier: current.requested?.specifier ?? canonicalId(current.id) ?? current.id,
+          importer: canonicalId(current.requested?.importer ?? current.id),
           resolvedId: null,
           source: current.source === 'graph' ? 'transformed' : current.source,
           status: 'unresolved',
         });
-        return;
+        continue;
       }
       addResolution({
         configuration,
@@ -536,24 +664,18 @@
         phase: 'transform',
         conditions,
         seed: current.seed,
-        specifier: canonicalId(current.id) ?? current.id,
-        importer: canonicalId(current.id),
+        specifier: current.requested?.specifier ?? canonicalId(current.id) ?? current.id,
+        importer: canonicalId(current.requested?.importer ?? current.id),
         resolvedId: canonicalId(current.id),
         source: current.source === 'graph' ? 'transformed' : current.source,
         status: protectedIdentity(current.id, request.bindings) ||
           textContainsReserveDigest(transformed.code, request.bindings.reserveDigests)
-          ? 'protected'
+          ? current.source === 'protected_control' ? 'control' : 'protected'
           : 'clean',
       });
       for (const edge of runtimeEdges(ts, current.id, transformed.code)) {
         queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: edge.specifier });
-      }
-      for (const dependency of [...(transformed.deps ?? []), ...(transformed.dynamicDeps ?? [])]) {
-        if (typeof dependency === 'string') {
-          queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: dependency });
-        }
       }
-      }));
     }
   };
 
@@ -587,11 +709,15 @@
         });
       }
     } catch (error) {
-      const timedOut = error instanceof Error && error.message.startsWith('phase_timeout:');
-      recordLoad(config, 'vite-serve', null, '<load>', timedOut ? 'timed_out' : 'failed', errorClass(error));
-      findings.push({ path: config, kind: 'configuration_load_failed', detail: String(error) });
+      recordConfigurationFailure(config, 'vite-serve', null, '<load>', 'load-or-inspect', error);
     } finally {
-      if (server !== undefined) await server.close().catch(() => undefined);
+      if (server !== undefined) {
+        try {
+          await closeServerStrict(server);
+        } catch (error) {
+          recordConfigurationFailure(config, 'vite-serve', null, '<close>', 'close', error);
+        }
+      }
     }
   }
 
@@ -628,11 +754,19 @@
           request.phaseTimeoutMs, `vitest:${config}:${project.name || '<root>'}`);
       }
     } catch (error) {
-      const timedOut = error instanceof Error && error.message.startsWith('phase_timeout:');
-      recordLoad(config, 'vitest-root', null, '<load>', timedOut ? 'timed_out' : 'failed', errorClass(error));
-      findings.push({ path: config, kind: 'configuration_load_failed', detail: String(error) });
+      recordConfigurationFailure(config, 'vitest-root', null, '<load>', 'load-or-inspect', error);
     } finally {
-      if (vitest !== undefined) await vitest.close().catch(() => undefined);
+      if (vitest !== undefined) {
+        try {
+          for (const project of [...vitest.projects].sort((left, right) => left.name.localeCompare(right.name))) {
+            await closeServerStrict(project.vite);
+          }
+          await closeServerStrict(vitest.vite);
+          await vitest.close();
+        } catch (error) {
+          recordConfigurationFailure(config, 'vitest-root', null, '<close>', 'close', error);
+        }
+      }
     }
   }
 
@@ -649,6 +783,9 @@
   const report = {
     protocol: PROTOCOL,
     slice: request.slice,
+    completed: true,
+    eligibleFiles: seeds.length,
+    astInspectedFiles: seeds.filter((seed) => request.valueEdges[seed] !== undefined).length,
     configurationLoad: configurationLoad.sort((left, right) => rowKey(left).localeCompare(rowKey(right))),
     resolution: sortedResolution,
     seedAssignments: sortedAssignments,
diff --git a/tools/heldout-runtime-guard.ts b/tools/heldout-runtime-guard.ts
index 3d1c52d2d7c263b2d2e5663bcc58675e12c29d35..364041fee8180d856c28509404ce17401f4dece6
--- a/tools/heldout-runtime-guard.ts
+++ b/tools/heldout-runtime-guard.ts
@@ -3,17 +3,20 @@
 import {
   existsSync,
   mkdirSync,
+  readdirSync,
   readFileSync,
   realpathSync,
   rmSync,
 } from 'node:fs';
 import { tmpdir } from 'node:os';
-import { dirname, join, resolve } from 'node:path';
+import { dirname, extname, join, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';
+import ts from 'typescript';
 
 export const HELDOUT_RUNTIME_PROTOCOL = 'heldout-runtime-v1' as const;
 export const HELDOUT_RUNTIME_PHASE_TIMEOUT_MS = 30_000;
 export const HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS = 120_000;
+export const HELDOUT_RUNTIME_NODE_VERSION = 'v24.13.0';
 
 export interface HeldoutRuntimeBindings {
   readonly reserveDigests: readonly string[];
@@ -41,11 +44,32 @@
   readonly bubblewrapVersion: string;
   readonly runtimeRoot: string;
   readonly runtimeVersion: string;
+  readonly uidTaskCount: number;
+  readonly nprocLimit: number;
   readonly attempts: readonly HeldoutPreflightAttempt[];
   readonly checks: readonly string[];
   readonly detail?: string;
 }
 
+export type HeldoutRuntimeValueEdgeKind =
+  | 'static_import'
+  | 're_export'
+  | 'import_equals'
+  | 'dynamic_import'
+  | 'require'
+  | 'require_resolve'
+  | 'import_meta_resolve'
+  | 'import_meta_glob'
+  | 'aliased_import_meta_glob'
+  | 'worker'
+  | 'shared_worker'
+  | 'import_scripts';
+
+export interface HeldoutRuntimeValueEdge {
+  readonly specifier: string | null;
+  readonly kind: HeldoutRuntimeValueEdgeKind;
+}
+
 export interface HeldoutConfigurationLoad {
   readonly file: string;
   readonly kind: 'vite-serve' | 'vitest-root' | 'vitest-project' | 'preflight';
@@ -70,6 +94,7 @@
   readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control';
   readonly status:
     | 'clean'
+    | 'resolved'
     | 'protected'
     | 'unresolved'
     | 'control'
@@ -96,6 +121,9 @@
 export interface HeldoutRuntimeGuardReport {
   readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
   readonly slice: HeldoutRuntimeGuardRequest['slice'];
+  readonly completed: boolean;
+  readonly eligibleFiles: number;
+  readonly astInspectedFiles: number;
   readonly preflight: HeldoutRuntimePreflight;
   readonly configurationLoad: readonly HeldoutConfigurationLoad[];
   readonly resolution: readonly HeldoutRuntimeResolution[];
@@ -109,6 +137,7 @@
   readonly bindings: HeldoutRuntimeBindings;
   readonly phaseTimeoutMs: number;
   readonly trustedLockDigest: string;
+  readonly valueEdges: Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>>;
 }
 
 const HISTORICAL_PREFLIGHT_ATTEMPTS: readonly HeldoutPreflightAttempt[] = [{
@@ -119,10 +148,18 @@
   profile: '/usr/bin/prlimit --as=1073741824 --nproc=64 --nofile=256 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node -e <canary>',
   status: 'failed',
   errorClass: 'v8_code_range_reservation_failed',
+}, {
+  profile: '/usr/bin/prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node -e <canary>',
+  status: 'failed',
+  errorClass: 'uid_thread_limit_exhausted',
 }];
 
 let successfulPreflight: HeldoutRuntimePreflight | undefined;
 
+function bubblewrapExecutable(): string {
+  return process.env.HELDOUT_RUNTIME_BWRAP_PATH ?? '/usr/bin/bwrap';
+}
+
 function stringProperty(value: unknown, property: string): string | null {
   if (value === null || typeof value !== 'object') return null;
   const member = Reflect.get(value, property);
@@ -139,12 +176,200 @@
   const node = join(root, 'bin', 'node');
   const probe = spawnSync(node, ['--version'], { encoding: 'utf8' });
   const version = probe.stdout.trim();
-  if (probe.status !== 0 || version !== process.version) {
+  if (probe.status !== 0 || version !== process.version || version !== HELDOUT_RUNTIME_NODE_VERSION) {
     throw new TypeError(`Node runtime mismatch: running ${process.version}, mounted ${version || '<none>'}.`);
   }
   return { root, version };
 }
 
+export function heldoutRuntimeNprocLimit(uidTaskCount: number): number {
+  if (!Number.isSafeInteger(uidTaskCount) || uidTaskCount < 1) {
+    throw new TypeError('UID task count must be a positive safe integer.');
+  }
+  return Math.max(2_048, uidTaskCount + 1_024);
+}
+
+function currentUidTaskCount(): number {
+  const uid = process.getuid?.();
+  if (uid === undefined) throw new TypeError('isolation_failed: UID task accounting is unavailable.');
+  let count = 0;
+  for (const entry of readdirSync('/proc', { withFileTypes: true })) {
+    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
+    try {
+      const status = readFileSync(`/proc/${entry.name}/status`, 'utf8');
+      const owner = /^Uid:\s+(\d+)/mu.exec(status)?.[1];
+      const threads = /^Threads:\s+(\d+)/mu.exec(status)?.[1];
+      if (owner !== String(uid) || threads === undefined) continue;
+      count += Number(threads);
+    } catch {
+      // Processes can exit between directory enumeration and status inspection.
+    }
+  }
+  if (count < 1) throw new TypeError('isolation_failed: UID task accounting returned no tasks.');
+  return count;
+}
+
+function runtimeScriptKind(path: string): ts.ScriptKind {
+  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
+  if (['.js', '.jsx', '.mjs', '.cjs'].includes(extname(path))) return ts.ScriptKind.JS;
+  return ts.ScriptKind.TS;
+}
+
+function unwrapRuntimeExpression(expression: ts.Expression): ts.Expression {
+  let current = expression;
+  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
+    ts.isSatisfiesExpression(current) || ts.isNonNullExpression(current) ||
+    ts.isTypeAssertionExpression(current)) current = current.expression;
+  return current;
+}
+
+function runtimeConstantString(expression: ts.Expression | undefined): string | null {
+  if (expression === undefined) return null;
+  const current = unwrapRuntimeExpression(expression);
+  if (ts.isStringLiteralLike(current)) return current.text;
+  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
+    const left = runtimeConstantString(current.left);
+    const right = runtimeConstantString(current.right);
+    return left === null || right === null ? null : left + right;
+  }
+  if (ts.isTemplateExpression(current)) {
+    let value = current.head.text;
+    for (const span of current.templateSpans) {
+      const substitution = runtimeConstantString(span.expression);
+      if (substitution === null) return null;
+      value += substitution + span.literal.text;
+    }
+    return value;
+  }
+  return null;
+}
+
+type RuntimeLoaderRole = 'require' | 'require_resolve' | 'import_meta_resolve' |
+  'import_meta_glob' | 'worker' | 'shared_worker' | 'import_scripts';
+
+function directRuntimeRole(expression: ts.Expression): RuntimeLoaderRole | null {
+  const current = unwrapRuntimeExpression(expression);
+  if (ts.isIdentifier(current)) {
+    if (current.text === 'require') return 'require';
+    if (current.text === 'Worker') return 'worker';
+    if (current.text === 'SharedWorker') return 'shared_worker';
+    if (current.text === 'importScripts') return 'import_scripts';
+  }
+  if (!ts.isPropertyAccessExpression(current)) return null;
+  if (ts.isIdentifier(current.expression) && current.expression.text === 'require' &&
+    current.name.text === 'resolve') return 'require_resolve';
+  if (ts.isMetaProperty(current.expression) && current.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
+    current.expression.name.text === 'meta') {
+    if (current.name.text === 'resolve') return 'import_meta_resolve';
+    if (current.name.text === 'glob') return 'import_meta_glob';
+  }
+  return null;
+}
+
+/** Runtime-value edges handed to the isolated real resolver. Type-only syntax is deliberately absent. */
+export function discoverHeldoutRuntimeValueEdges(
+  path: string,
+  source: string,
+): readonly HeldoutRuntimeValueEdge[] {
+  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, runtimeScriptKind(path));
+  const roles = new Map<string, RuntimeLoaderRole>();
+  const runtimeDeclarations = new Set<string>();
+  const visitDeclarations = (node: ts.Node): void => {
+    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) ||
+      ts.isClassDeclaration(node)) && node.name !== undefined && ts.isIdentifier(node.name) &&
+      !(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) =>
+        modifier.kind === ts.SyntaxKind.DeclareKeyword))) runtimeDeclarations.add(node.name.text);
+    ts.forEachChild(node, visitDeclarations);
+  };
+  visitDeclarations(sourceFile);
+  for (const [name, role] of [
+    ['require', 'require'], ['Worker', 'worker'], ['SharedWorker', 'shared_worker'],
+    ['importScripts', 'import_scripts'],
+  ] as const) if (!runtimeDeclarations.has(name)) roles.set(name, role);
+  let changed = true;
+  while (changed) {
+    changed = false;
+    const visitAliases = (node: ts.Node): void => {
+      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
+        const initializer = unwrapRuntimeExpression(node.initializer);
+        const role = ts.isIdentifier(initializer) ? roles.get(initializer.text) ?? null : directRuntimeRole(initializer);
+        if (role !== null && roles.get(node.name.text) !== role) {
+          roles.set(node.name.text, role);
+          changed = true;
+        }
+      }
+      ts.forEachChild(node, visitAliases);
+    };
+    visitAliases(sourceFile);
+  }
+  const edges: HeldoutRuntimeValueEdge[] = [];
+  const add = (kind: HeldoutRuntimeValueEdgeKind, expression: ts.Expression | undefined): void => {
+    edges.push({ kind, specifier: runtimeConstantString(expression) });
+  };
+  const visit = (node: ts.Node): void => {
+    if (ts.isImportDeclaration(node)) {
+      const clause = node.importClause;
+      const isValue = clause === undefined || (!clause.isTypeOnly && (clause.name !== undefined ||
+        clause.namedBindings === undefined || ts.isNamespaceImport(clause.namedBindings) ||
+        clause.namedBindings.elements.some((element) => !element.isTypeOnly)));
+      if (isValue) add('static_import', node.moduleSpecifier);
+    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly) {
+      const isValue = node.exportClause === undefined || ts.isNamespaceExport(node.exportClause) ||
+        node.exportClause.elements.some((element) => !element.isTypeOnly);
+      if (isValue) add('re_export', node.moduleSpecifier);
+    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
+      ts.isExternalModuleReference(node.moduleReference)) {
+      add('import_equals', node.moduleReference.expression);
+    } else if (ts.isCallExpression(node)) {
+      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add('dynamic_import', node.arguments[0]);
+      else {
+        const direct = directRuntimeRole(node.expression);
+        const role = direct ?? (ts.isIdentifier(node.expression) ? roles.get(node.expression.text) ?? null : null);
+        if (role === 'require') add('require', node.arguments[0]);
+        else if (role === 'require_resolve') add('require_resolve', node.arguments[0]);
+        else if (role === 'import_meta_resolve') add('import_meta_resolve', node.arguments[0]);
+        else if (role === 'import_meta_glob') {
+          add(direct === null ? 'aliased_import_meta_glob' : 'import_meta_glob', node.arguments[0]);
+        } else if (role === 'import_scripts') {
+          for (const argument of node.arguments) add('import_scripts', argument);
+        }
+      }
+    } else if (ts.isNewExpression(node)) {
+      const direct = directRuntimeRole(node.expression);
+      const role = direct ?? (ts.isIdentifier(node.expression) ? roles.get(node.expression.text) ?? null : null);
+      if (role === 'worker' || role === 'shared_worker') {
+        const first = node.arguments?.[0];
+        if (first !== undefined && ts.isNewExpression(first) && ts.isIdentifier(first.expression) &&
+          first.expression.text === 'URL') add(role, first.arguments?.[0]);
+        else add(role, first);
+      }
+    }
+    ts.forEachChild(node, visit);
+  };
+  visit(sourceFile);
+  return edges;
+}
+
+function candidateValueEdges(root: string): Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>> {
+  const result: Record<string, readonly HeldoutRuntimeValueEdge[]> = {};
+  const walk = (directory: string, prefix = ''): void => {
+    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
+      left.name.localeCompare(right.name))) {
+      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
+      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
+      const absolute = join(directory, entry.name);
+      if (entry.isDirectory()) walk(absolute, relative);
+      else if ((relative.startsWith('src/') || relative.startsWith('tools/')) &&
+        ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(relative)) &&
+        !/\.d\.(?:ts|mts|cts)$/u.test(relative)) {
+        result[relative] = discoverHeldoutRuntimeValueEdges(relative, readFileSync(absolute, 'utf8'));
+      }
+    }
+  };
+  walk(root);
+  return result;
+}
+
 function sharedBwrapArguments(
   runtimeRoot: string,
   workRoot: string,
@@ -161,6 +386,7 @@
     '--unshare-uts',
     '--unshare-cgroup',
     '--unshare-net',
+    '--cap-drop', 'ALL',
     '--ro-bind', '/usr', '/usr',
     '--ro-bind', '/lib', '/lib',
     '--ro-bind', '/lib64', '/lib64',
@@ -211,9 +437,13 @@
 ): HeldoutRuntimePreflight {
   if (successfulPreflight !== undefined) return successfulPreflight;
   const runtime = runtimeIdentity();
-  const bubblewrap = spawnSync('/usr/bin/bwrap', ['--version'], { encoding: 'utf8' });
+  const uidTaskCount = currentUidTaskCount();
+  const nprocLimit = heldoutRuntimeNprocLimit(uidTaskCount);
+  const bubblewrapPath = bubblewrapExecutable();
+  const bubblewrap = spawnSync(bubblewrapPath, ['--version'], { encoding: 'utf8' });
   if (bubblewrap.status !== 0 || bubblewrap.stdout.trim() !== 'bubblewrap 0.6.1') {
-    throw new TypeError(`isolation_failed: ${bubblewrap.stderr.trim() || 'bubblewrap 0.6.1 unavailable'}`);
+    throw new TypeError(`isolation_failed: ${bubblewrap.error?.message ??
+      (bubblewrap.stderr?.trim() || 'bubblewrap 0.6.1 unavailable')}`);
   }
   const scratchRoot = join(tmpdir(), `heldout-runtime-preflight-${String(process.pid)}`);
   const workRoot = join(scratchRoot, 'candidate');
@@ -238,12 +468,12 @@
     "socket.on('error',()=>{clearTimeout(timer);process.stdout.write('passed')})",
   ].join(';');
   const args = [
-    '--nproc=512',
+    `--nproc=${String(nprocLimit)}`,
     '--nofile=1024',
     '--fsize=16777216',
     '--cpu=300',
     '--',
-    '/usr/bin/bwrap',
+    bubblewrapPath,
     ...sharedBwrapArguments(runtime.root, workRoot, guardRoot, scratchRoot, nodeModulesRoot),
     '/usr/bin/env', '-i', ...cleanEnvironment(),
     '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64', '-e', script,
@@ -254,8 +484,8 @@
     throw new TypeError(`isolation_failed: ${probe.error?.message ?? (probe.stderr.trim() || `exit ${String(probe.status)}`)}`);
   }
   const parentDeathArgs = [
-    '--nproc=512', '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
-    '/usr/bin/bwrap',
+    `--nproc=${String(nprocLimit)}`, '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
+    bubblewrapPath,
     ...sharedBwrapArguments(runtime.root, workRoot, guardRoot, scratchRoot, nodeModulesRoot),
     '/usr/bin/env', '-i', ...cleanEnvironment(),
     '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64',
@@ -296,8 +526,10 @@
     bubblewrapVersion: bubblewrap.stdout.trim(),
     runtimeRoot: runtime.root,
     runtimeVersion: runtime.version,
+    uidTaskCount,
+    nprocLimit,
     attempts: [...HISTORICAL_PREFLIGHT_ATTEMPTS, {
-      profile: '/usr/bin/prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 -e <canary>',
+      profile: `/usr/bin/prlimit --nproc=${String(nprocLimit)} --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 -e <canary>`,
       status: 'passed',
       errorClass: null,
     }],
@@ -324,13 +556,15 @@
     return performHeldoutIsolationPreflight(trustedRoot);
   } catch (error: unknown) {
     const runtimeRoot = dirname(dirname(realpathSync(process.execPath)));
-    const bubblewrap = spawnSync('/usr/bin/bwrap', ['--version'], { encoding: 'utf8' });
+    const bubblewrap = spawnSync(bubblewrapExecutable(), ['--version'], { encoding: 'utf8' });
     const detail = error instanceof Error ? error.message : String(error);
     return {
       status: 'isolation_failed',
       bubblewrapVersion: bubblewrap.status === 0 ? bubblewrap.stdout.trim() : '<unavailable>',
       runtimeRoot,
       runtimeVersion: process.version,
+      uidTaskCount: 0,
+      nprocLimit: 0,
       attempts: [...HISTORICAL_PREFLIGHT_ATTEMPTS, {
         profile: 'final Node-runtime bubblewrap profile',
         status: 'failed',
@@ -342,7 +576,95 @@
   }
 }
 
-function parseWorkerReport(value: unknown): Omit<HeldoutRuntimeGuardReport, 'preflight'> {
+function recordValue(value: unknown): Readonly<Record<string, unknown>> | null {
+  return value !== null && typeof value === 'object' && !Array.isArray(value)
+    ? value as Readonly<Record<string, unknown>>
+    : null;
+}
+
+function exactKeys(value: Readonly<Record<string, unknown>>, allowed: readonly string[]): boolean {
+  const keys = Object.keys(value).sort();
+  return keys.length === allowed.length && keys.every((key, index) => key === [...allowed].sort()[index]);
+}
+
+function nullableString(value: unknown): value is string | null {
+  return value === null || typeof value === 'string';
+}
+
+function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
+  return typeof value === 'string' && allowed.includes(value as T);
+}
+
+function parseConfigurationLoad(value: unknown): HeldoutConfigurationLoad {
+  const row = recordValue(value);
+  const keys = ['environment', 'errorClass', 'file', 'kind', 'project', 'runtimeRoot', 'runtimeVersion', 'status'];
+  if (row === null || !exactKeys(row, keys) || typeof row.file !== 'string' ||
+    !oneOf(row.kind, ['vite-serve', 'vitest-root', 'vitest-project', 'preflight']) ||
+    !nullableString(row.project) || typeof row.environment !== 'string' ||
+    !oneOf(row.status, ['loaded', 'failed', 'timed_out', 'isolation_failed']) ||
+    !nullableString(row.errorClass) || typeof row.runtimeRoot !== 'string' ||
+    typeof row.runtimeVersion !== 'string') throw new TypeError('Malformed configurationLoad row.');
+  return {
+    file: row.file,
+    kind: row.kind,
+    project: row.project,
+    environment: row.environment,
+    status: row.status,
+    errorClass: row.errorClass,
+    runtimeRoot: row.runtimeRoot,
+    runtimeVersion: row.runtimeVersion,
+  };
+}
+
+function parseResolution(value: unknown): HeldoutRuntimeResolution {
+  const row = recordValue(value);
+  const keys = ['conditions', 'configuration', 'environment', 'importer', 'phase', 'project', 'resolvedId',
+    'seed', 'source', 'specifier', 'status'];
+  if (row === null || !exactKeys(row, keys) || typeof row.configuration !== 'string' ||
+    !nullableString(row.project) || typeof row.environment !== 'string' ||
+    !oneOf(row.phase, ['resolve', 'transform']) || !Array.isArray(row.conditions) ||
+    !row.conditions.every((item) => typeof item === 'string') || typeof row.seed !== 'string' ||
+    typeof row.specifier !== 'string' || !nullableString(row.importer) || !nullableString(row.resolvedId) ||
+    !oneOf(row.source, ['graph', 'transformed', 'alias_key', 'protected_control']) ||
+    !oneOf(row.status, ['clean', 'resolved', 'protected', 'unresolved', 'control', 'external_builtin',
+      'external_dependency'])) throw new TypeError('Malformed resolution row.');
+  return {
+    configuration: row.configuration,
+    project: row.project,
+    environment: row.environment,
+    phase: row.phase,
+    conditions: [...row.conditions],
+    seed: row.seed,
+    specifier: row.specifier,
+    importer: row.importer,
+    resolvedId: row.resolvedId,
+    source: row.source,
+    status: row.status,
+  };
+}
+
+function parseSeedAssignment(value: unknown): HeldoutSeedAssignment {
+  const row = recordValue(value);
+  const keys = ['configuration', 'environment', 'project', 'seed'];
+  if (row === null || !exactKeys(row, keys) || typeof row.seed !== 'string' ||
+    typeof row.configuration !== 'string' || !nullableString(row.project) ||
+    typeof row.environment !== 'string') throw new TypeError('Malformed seedAssignments row.');
+  return { seed: row.seed, configuration: row.configuration, project: row.project, environment: row.environment };
+}
+
+function parseFinding(value: unknown): HeldoutRuntimeFinding {
+  const row = recordValue(value);
+  const keys = ['detail', 'kind', 'path'];
+  if (row === null || !exactKeys(row, keys) || typeof row.path !== 'string' ||
+    !oneOf(row.kind, ['runtime_protocol_resolution', 'configuration_load_failed', 'unresolved_module_edge']) ||
+    typeof row.detail !== 'string') throw new TypeError('Malformed findings row.');
+  return { path: row.path, kind: row.kind, detail: row.detail };
+}
+
+export function parseHeldoutWorkerReport(
+  value: unknown,
+  expectedSlice: HeldoutRuntimeGuardRequest['slice'],
+): Omit<HeldoutRuntimeGuardReport, 'preflight'> {
   if (value === null || typeof value !== 'object' ||
     stringProperty(value, 'protocol') !== HELDOUT_RUNTIME_PROTOCOL) {
     throw new TypeError('Runtime guard emitted an invalid protocol response.');
@@ -352,12 +674,33 @@
   const resolutionRows = Reflect.get(value, 'resolution');
   const seedAssignments = Reflect.get(value, 'seedAssignments');
   const findings = Reflect.get(value, 'findings');
-  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(slice ?? '') ||
+  const record = recordValue(value);
+  if (record === null || !exactKeys(record,
+    ['astInspectedFiles', 'completed', 'configurationLoad', 'eligibleFiles', 'findings', 'protocol', 'resolution',
+      'seedAssignments', 'slice']) ||
+    slice !== expectedSlice || record.completed !== true ||
+    typeof record.eligibleFiles !== 'number' || !Number.isSafeInteger(record.eligibleFiles) ||
+    typeof record.astInspectedFiles !== 'number' || !Number.isSafeInteger(record.astInspectedFiles) ||
+    record.eligibleFiles < 0 || record.astInspectedFiles !== record.eligibleFiles ||
     !Array.isArray(configurationLoad) || !Array.isArray(resolutionRows) ||
     !Array.isArray(seedAssignments) || !Array.isArray(findings)) {
     throw new TypeError('Runtime guard emitted malformed report fields.');
   }
-  return value as Omit<HeldoutRuntimeGuardReport, 'preflight'>;
+  const parsedLoads = configurationLoad.map(parseConfigurationLoad);
+  if (!parsedLoads.some((row) => row.kind === 'preflight' && row.status === 'loaded')) {
+    throw new TypeError('Runtime guard report lacks completion preflight evidence.');
+  }
+  return {
+    protocol: HELDOUT_RUNTIME_PROTOCOL,
+    slice: expectedSlice,
+    completed: true,
+    eligibleFiles: record.eligibleFiles,
+    astInspectedFiles: record.astInspectedFiles,
+    configurationLoad: parsedLoads,
+    resolution: resolutionRows.map(parseResolution),
+    seedAssignments: seedAssignments.map(parseSeedAssignment),
+    findings: findings.map(parseFinding),
+  };
 }
 
 function collectPipe(stream: NodeJS.ReadableStream, limit: number): Promise<string> {
@@ -389,6 +732,9 @@
     return {
       protocol: HELDOUT_RUNTIME_PROTOCOL,
       slice: request.slice,
+      completed: false,
+      eligibleFiles: 0,
+      astInspectedFiles: 0,
       preflight,
       configurationLoad: [{
         file: '<preflight>',
@@ -430,10 +776,11 @@
     bindings: request.bindings,
     phaseTimeoutMs: request.phaseTimeoutMs ?? HELDOUT_RUNTIME_PHASE_TIMEOUT_MS,
     trustedLockDigest: sha256(trustedLock),
+    valueEdges: candidateValueEdges(root),
   };
   const args = [
-    '--nproc=512', '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
-    '/usr/bin/bwrap',
+    `--nproc=${String(preflight.nprocLimit)}`, '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
+    bubblewrapExecutable(),
     ...sharedBwrapArguments(runtime.root, root, dirname(fileURLToPath(import.meta.url)), scratchRoot,
       join(trustedRoot, 'node_modules')),
     '/usr/bin/env', '-i', ...cleanEnvironment(),
@@ -458,13 +805,14 @@
     runningChild.stdin.end(JSON.stringify(workerRequest));
     const aggregateTimeout = request.aggregateTimeoutMs ?? HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS;
     const exitPromise = new Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>((resolveExit, rejectExit) => {
+      let timedOut = false;
       const timer = setTimeout(() => {
+        timedOut = true;
         try {
           process.kill(-runningChild.pid!, 'SIGKILL');
         } catch {
           runningChild.kill('SIGKILL');
         }
-        rejectExit(new TypeError(`configuration_load_failed: aggregate timeout after ${String(aggregateTimeout)}ms.`));
       }, aggregateTimeout);
       runningChild.once('error', (error) => {
         clearTimeout(timer);
@@ -472,7 +820,11 @@
       });
       runningChild.once('exit', (code, signal) => {
         clearTimeout(timer);
-        resolveExit({ code, signal });
+        if (timedOut) {
+          rejectExit(new TypeError(`configuration_load_failed: aggregate timeout after ${String(aggregateTimeout)}ms; child reaped.`));
+        } else {
+          resolveExit({ code, signal });
+        }
       });
     });
     const [exit, reportText, diagnostics, errors] = await Promise.all([
@@ -491,7 +843,7 @@
     } catch {
       throw new TypeError('configuration_load_failed: worker emitted malformed JSON.');
     }
-    const parsed = parseWorkerReport(decoded);
+    const parsed = parseHeldoutWorkerReport(decoded, request.slice);
     return { ...parsed, preflight };
   } finally {
     if (child !== undefined && child.exitCode === null && child.signalCode === null) {
