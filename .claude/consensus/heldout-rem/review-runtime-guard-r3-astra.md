**RESIDUALS: RG-F4, RG-F6, RG-F13.**

- **RG-F4 — RESIDUAL, High.** The exact named `createRequire` and require-condition probes are fixed, with effective regressions at [isolation test:811](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:811). Loader kinds now reach Vite’s require-aware resolver.

  Runtime discovery still misses:
  ```js
  import { Module } from 'node:module';
  const load = Module.createRequire(import.meta.url);
  load('#policy');
  ```
  The runtime import seeding recognizes named `createRequire`, but not named `Module`/`default`: [guard:413](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:413). Retained static analysis explicitly recognizes those namespace imports and permits this usage: [leak-check:684](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:684).

  Additionally, reached files outside the initial `src`/`tools` map still use the narrower worker parser, which lacks createRequire/alias propagation: [worker:627](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:627), [fallback parser:142](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:142).

  **Closure:** use equivalent symbol-backed value-edge discovery for every traversed source and all retained namespace import forms. The earlier destructuring concern is **not** a bypass: retained Rule N rejects it.

- **RG-F5 — RESOLVED.** Filesystem identities are realpathed before protected and boundary classification, while loading retains the original ID: [worker:253](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:253), [worker:568](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:568). The symlink regression includes an ordinary-target control: [test:793](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:793). A separate new traversal issue is RG-F13 below.

- **RG-F6 — RESIDUAL, Medium.** The exact root-level extended-config witness is restored, the dependency plugin now supplies the protected edge itself, both opaque-array witnesses exist, and the former cycle assertion has been replaced with an ordinary-consumer test documenting installed Vitest’s behavior. See [dependency fixture:298](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:298) and [cycle/Rule N tests:1270](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1270).

  However, “actually loaded configurations” currently records only each server’s `configFile`: [worker:741](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:741). A root-level `project.config.mjs` importing `base-settings.mjs` leaves the latter outside retained Rule N inspection. Installed Vite’s runner records these imported dependencies at [config.js:35285](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:35285).

  **Closure:** include candidate-local configuration dependencies in the returned inspection set, with a transitive imported-config regression.

- **RG-F10 — RESOLVED.** Roles are now keyed by symbols and accumulated monotonically, eliminating the demonstrated oscillation. Discovery runs in a terminable worker and consumes the aggregate timeout budget: [guard:350](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:350), [guard:509](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:509). The same-spelled, different-scope regression is present at [unit test:86](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:86).

- **RG-F11 — RESOLVED.** Both `deps` and `dynamicDeps` are traversed with source, seed and loader kind preserved: [worker:724](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:724). The tools-only glob and plugin regressions directly require protected SSR metadata edges: [tests:1010](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1010). The increased injected counts are supported by an additional provenance assertion, not merely changed totals.

- **RG-F12 — RESOLVED.** The canonical projection explicitly excludes operational preflight fields while retaining findings and resolution provenance: [guard:165](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:165). The replacement determinism test launches separate processes and verifies meaningful protected evidence: [test:1204](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts:1204). The supervisor’s differing full reports are consistent with this contract.

- **RG-F13 — NEW RESIDUAL, High: canonical seed deduplication can skip a distinct transform.** The new shortcut skips any resolved ID whose realpath matches an existing seed: [worker:601](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:601).

  Concrete source-traced case: `support/link.ts` symlinks to `src/ordinary.ts`; `preserveSymlinks` is enabled; a plugin injects a protected import only when transforming `/support/link.ts`. An ordinary consumer imports that link. Its canonical identity matches the ordinary seed, so the guard skips the link’s transform. Transforming `/src/ordinary.ts` does not exercise that plugin branch.

  **Closure:** deduplicate transform work by actual load ID and environment, not solely by filesystem identity. Keep realpath identity for protection checks. Add a transform-sensitive symlink control.

`node --check` passed. The unit run failed before collecting tests with the same sandbox temporary-directory `ENOENT`; I did not rerun isolation or the full gate. The reviewed diff changes only the five reported files and contains no fixture changes.

**Fit to land after the full gate at D607.1’s explicitly bounded level, with these three residuals recorded.** It is not a complete fail-closed guarantee for the remaining forms above; no further lane round is requested.