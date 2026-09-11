**REJECT.** RG-F1–RG-F3, RG-F7 and RG-F8 are resolved. RG-F4–RG-F6 remain incomplete; two additional bounded defects need the remaining fix round.

1. **RG-F1 — RESOLVED.** The process limit now uses `max(2048, observed UID threads + 1024)`, and the namespace-independent contract tests are separated. This addresses the reproduced 512-limit failure without weakening isolation. See [limit calculation](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:185) and [unit regression](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:58).

2. **RG-F2 — RESOLVED.** The CLI uses native Node, validates arguments before inspection, and performs preflight before candidate configuration execution. The subprocess controls cover missing arguments and failed isolation. See [CLI entry](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1766) and [controls](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1231).

3. **RG-F3 — RESOLVED.** Both guard implementation files are exempted consistently. The combined static inspection reads their actual contents and asserts two inspected files and zero findings. See [regression](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:106).

4. **RG-F4 — PARTIAL; High, blocking.** Two runtime-value problems remain.

   - `createRequire` aliases are omitted from the new discovery pass. For:
     ```js
     import { createRequire } from 'node:module';
     const load = createRequire(import.meta.url);
     load('#policy');
     ```
     my bounded probe returned only the `node:module` import; retained static inspection returned no findings. The textual role recognizer does not recognize `createRequire` results. See [recognizer](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:250).
   - The worker discards the supplied loader kind when queueing an edge, then resolves everything with the same two-argument `resolveId` call. A package import mapping with `require` pointing to the protected module and `import` pointing to an ordinary module therefore follows the wrong condition for `require('#policy')`. See [kind discarded](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:596) and [resolution call](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:532). Installed Vite reads `custom["node-resolve"].isRequire` at [config.js:32560](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:32560) and selects the corresponding condition at [config.js:32905](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:32905).

   **Fix:** hand off the retained symbol-backed value-edge analysis, preserve loader kind through traversal, and apply the appropriate resolution conditions. Add both regressions with ordinary-target controls.

5. **RG-F5 — PARTIAL; High, blocking.** Virtual-module traversal and protected-control separation are repaired, but candidate-local symlink identity remains uncanonicalized.

   `externalBoundary` computes `realpath`, then discards it whenever the result is outside `node_modules`; protected checking subsequently receives the original resolver ID. See [discarded canonical path](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:321), [identity selection](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:542), and [protected identity check](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:275).

   With `resolve.preserveSymlinks: true`, an alias through a candidate-local symlink can therefore identify the protected file under an ordinary-looking path. Protection by module identity must not depend on its contents matching a reserve digest.

   **Fix:** canonicalize every filesystem identity independently of external-boundary classification; retain the original ID separately for loading and query semantics. Add a candidate-local symlink regression.

6. **RG-F6 — PARTIAL; Medium, blocking.** Most missing witnesses are restored. The following reconciliation covers the previously Lost/Partial families:

   | Retired coverage family | Current counterpart / disposition |
   |---|---|
   | Glob forms, negative patterns, base/options/query handling, unsupported globs | [Runtime glob matrix](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:904); SSR gap remains under RG-F11 |
   | Aliased glob, unmapped package import | [Aliased-glob rejection](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:999), [unmapped import](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:877) |
   | Exact/pattern precedence and nested package conditions | [Ordering and condition fixtures](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:384) |
   | Alias shorthand, identifier/array/spread forms, relative regex, shadowed names | [Fixtures](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:412) |
   | Entry spread overrides, reassignment, push, closure/receiver/class-field mutation | [Mutation fixtures](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:434) |
   | Object/array/nested/computed transfers, loops, constructors and mutating receivers | [Transfer fixtures](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:458) |
   | Runtime array indexes, project-object mutation, callback/conditional roots | [Fixtures](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:490) |
   | Safe spread copies, uncalled returns, storage without mutation, frozen objects, harmless references and unreachable alias objects | [Clean controls](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:593); appropriately stop treating retired Rule C conservatism as a runtime leak |
   | Nonmatching regex and nonsemantic build values | [Clean controls](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:578) |
   | Real configs, config-only consumers, eligible/inspected counts and injected controls | [Real-tree assertions](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1181), [extended-tree counts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1208) |
   | Declaration-file exclusion | [Regression](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1065) |
   | Extended-configuration Rule N | Exact former `tools/…` witness restored, but coverage remains incomplete as described below |

   Four exceptions prevent accepting the “all routed” claim:

   - **Extended configurations outside `src`/`tools`:** the static collector includes those directories and root Vite/Vitest config names only. An unchanged root `project.config.mjs` loaded through `extends` is omitted. Moving the new unit fixture from `tools/project.config.mjs` to `project.config.mjs` exposes this gap. See [collector filter](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1584) and [restricted witness](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:118). Inspect actually loaded candidate configuration files with retained Rule N.
   - **Dependency-plugin activation:** the purported positive fixture supplies `@policy` through an independent `resolve.alias`; removing `automockPlugin()` leaves that evidence intact. Its dormant control also changes the consumer to an ordinary import. See [positive](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:296) and [control](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:588). Use a dependency plugin whose hook supplies the edge, with activation/deactivation retaining the same consumer.
   - **Opaque-array addressed-reference group:** the retired declaration included a helper receiving `shared` inside `plugins` and a clean `const p = shared.plugins; plugins: [...p]` case. The replacement covers direct assignment and direct reads/spreads, but not those two witnesses. See [positive](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:116) and [clean siblings](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:520). Add a mutating helper and the clean const-alias case.
   - **“Cyclic extends” assertion:** it accepts any unresolved module finding while leaving `@policy` unmapped, so it does not prove cycle handling. See [test](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1121). Supply an ordinary resolvable consumer and either demonstrate the claimed failure or document why installed Vitest does not consume this shape recursively.

   Thus the declaration/assertion accounting is substantially improved, but not yet assertion-complete.

7. **RG-F7 — RESOLVED at the bounded scope.** Plugin-container close failures are explicitly observed before server close, and timeout rejection waits for the child’s exit event. Both have regressions. See [strict close](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:462), [throwing-close test](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:767), and [reaping](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:821).

8. **RG-F8 — RESOLVED.** Validation now checks exact report keys, completion, slice, counts, row shapes and completion evidence, with malformed-response controls. See [validator](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:664) and [tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:93).

9. **RG-F9 — provenance fix RESOLVED; report-contract note remains.** Sequential sorted traversal removes the demonstrated diamond race, and the timing-reversal regression compares both resolution and findings. See [queue ordering](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:525) and [regression](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:784). See RG-F12 for environmental metadata.

10. **RG-F10 — High, blocking: alias discovery can hang the parent indefinitely.**

    ```js
    const load = require;
    function f() {
      const load = import.meta.resolve;
    }
    ```

    Roles are keyed by spelling, so each pass alternately overwrites `load` with two roles and leaves `changed = true`. My bounded in-memory execution timed out. See [fixed-point loop](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:289). Discovery runs before worker launch and the aggregate timer, so that timer cannot terminate it: [request construction](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:779).

    **Fix:** use symbol identities and monotonic propagation; add a same-spelled, different-scope regression. This is a bounded implementation defect.

11. **RG-F11 — High, blocking: SSR transform dependency metadata is ignored.**

    The worker reparses transformed JavaScript but does not traverse `transformed.deps` or `transformed.dynamicDeps`: [traversal](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:676). Installed Vite rewrites dynamic imports to SSR helper calls and returns their edges separately: [rewrite](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:15581), [dependency arrays](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:15594).

    A controlled execution of the actual traversal with a tools-only glob and a protected `dynamicDeps` entry returned **zero findings**. Existing glob fixtures use a `src` consumer, allowing client-environment detection to mask this omission.

    **Fix:** traverse both metadata arrays with importer/environment/provenance preserved. Add tools-only SSR regressions for glob-generated and plugin-generated imports. This is within the accepted serve/SSR scope.

12. **RG-F12 — Medium, nonblocking note: define the canonical projection explicitly.**

    `uidTaskCount`, `nprocLimit`, and the limit embedded in `attempts[].profile` are environmental evidence: [preflight fields](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:529). They may legitimately differ. The current whole-report equality test reuses cached preflight data, so it cannot establish cross-process byte identity: [cache](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:438), [test](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1095).

    Keep this operational evidence, but exclude it explicitly from canonical comparison. Preserve every finding and provenance field in that comparison.

The ordinary-target mutants preserve the import and redirect its target; they are meaningful wrong-value controls. Exact runtime-version enforcement and fail-closed isolation remain present. The reviewed diff contains no fixture changes.

`node --check` passed. My permitted unit-spec attempt failed before collecting tests on a temporary-directory `ENOENT`; I did not run the full suite or bwrap integration. The findings above rely on source inspection and bounded in-memory probes, not a claimed integration rerun.

**REJECT — blocking: RG-F4, RG-F5, RG-F6, RG-F10 and RG-F11.**