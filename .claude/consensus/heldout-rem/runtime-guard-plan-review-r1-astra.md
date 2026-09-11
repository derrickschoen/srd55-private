**F70 — High: define runtime edges and environment ownership before graph traversal.**  
Fix in one round? **Yes.**

The plan feeds retained AST edges into every environment ([plan:138](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:138)). That includes erased type imports: ordinary code imports `room-generator`, whose permitted type-only import references the protected module. Runtime traversal must not turn that into a leak. [Ordinary importer:18](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/watabou-adapter.ts:18), [type import:37](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/room-generator.ts:37)

Likewise, importing every `tools/**` seed into a browser build is not a valid clean-repository control. Ordinary tools import Node APIs; Vite’s production browser replacement exports only an empty default object. [Tool:1](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/vtt-soak.ts:1), [Vite:32671](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:32671)

Keep type-only checks static. Define runtime-value edges, browser/server seed ownership, and external dependency boundaries explicitly.

**F71 — High: raw optimizer evidence contradicts deterministic reporting.**  
Fix in one round? **Yes.**

The plan preserves verbatim resolved IDs while requiring byte-identical reports ([plan:112](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:112), [plan:237](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:237)). Installed Vite constructs optimized IDs with `?v=browserHash`, and discovery hashes incorporate a session timestamp. Sorting and scratch-path replacement cannot remove that variation. [Vite:34108](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:34108), [Vite:34344](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:34344)

Either defer optimizer execution or specify an optimizer-completion barrier and canonical source identities. Keep volatile raw IDs in diagnostic logs, outside canonical evidence. Do not erase meaningful query parameters generally.

**F72 — Medium: the build adapter promises more than the cited APIs establish.**  
Fix in one round? **Yes—by narrowing this slice.**

`createBuilder` is explicitly experimental. Its default configuration can reload configuration per environment, contradicting the plan’s single-execution premise. Worker plugins also have a separate creation/config-hook pipeline; a main builder audit plugin does not automatically establish worker coverage. [Builder API:2227](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/index.d.ts:2227), [config reload:33995](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:33995), [worker pipeline:35634](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:35634)

Also, `write:false` cannot establish equivalence to the repository’s real build: its PWA plugin has meaningful `writeBundle` behavior. [Repository plugin:127](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/vite.config.ts:127)

Defer comprehensive build/worker coverage rather than making it an implementation stop condition.

**F73 — Medium: “alias-removed means clean” conflicts with unresolved-import policy.**  
Fix in one round? **Yes.**

Removing an alias while retaining `import '@policy'` leaves an unresolved edge. The plan both demands clean alias-removed mutants and requires unresolved edges to fail. [Mutant requirement:353](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:353), [unresolved policy:447](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:447)

Redirect the alias to an ordinary module for passing controls. Keep alias removal as a separate unresolved-but-not-protected control. Likewise, syntax/loader-escape cases should retain their static expectations, not be forced into a universal runtime “protected resolution” assertion.

**F74 — Medium, scope note: sandboxing execution does not authenticate the child’s conclusions.**  
Fix in one round? **Yes to document; hostile-config attestation is deferred.**

Candidate configuration shares the worker’s process and can interfere with its APIs or response channel. Read-only mounts and JSON validation protect neither same-process computation nor report authenticity. The plan should promise bounded resolver evidence for the stated configuration-execution trust model, not adversarial attestation. [Execution boundary:247](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:247), [response pipe:260](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:260)

This belongs in the residual ledger and is **not** a rejection reason under D607.1.

**Verified claims**

- The plan’s SHA-256 matches the supplied digest. Its file scope excludes fixtures and the frozen contract; fixture names are generic, and it explicitly prohibits expectation regeneration and unrelated third-party names. [Plan:265](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:265), [integrity contract:437](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:437)
- Middleware mode avoids creating Vite’s HTTP server; `watch:null` selects a no-op watcher. [Installed implementation:25456](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:25456)
- `createVitest` initializes projects without invoking `startVitest`, but initialization includes VCS loading, `configureVitest` hooks, reporters and caches. It can also call `listen()` when an API port is configured. Add these to preflight assumptions. Enumerate the root server separately: `projects` and the core project are distinct. [Initialization:13125](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13125), [projects/hooks:13150](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13150), [root/reporters:13172](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13172), [listen:14222](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14222)
- Retiring Rule C is coherent. The routing table retains syntax-level parsing, N1/N2, direct references and Git enumeration. Keeping glob recognition/nonconstant rejection static while assigning matching to Vite’s transform is also coherent. Migration should inventory assertions and controls, not merely declaration counts. [Routing:203](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:203)
- The normal gate really executes candidate Vitest/config code with inherited environment and working directory. That supports the factual comparison, not an isolation guarantee. [Gate:39](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/gate-vitest.mjs:39), [launcher:54](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/gate-runner-lib.mjs:54)

`bwrap` and `unshare` are present; I did not test namespace operation. Make isolation preflight step zero. **`env -i` plus `unshare -Urn` and rlimits is insufficient**: it does not hide host files or prevent outside writes. An acceptable fallback needs equivalent mount isolation and capability dropping; otherwise return isolation failure. Custom comprehensive seccomp work is poor use of this budget. Prefer the namespace/mount boundary, with a narrowly tested socket policy only if zero sandbox listeners remains mandatory.

For the eight questions: I would answer **Q1 yes**, **Q4 fail closed**, **Q5 unresolved except explicitly audited clean boundaries**, **Q6 no installation and verified dependency provenance**, and **Q8 deduplicate while retaining project/phase/environment identity**. For **Q2**, leave manifest ranges alone and assert installed versions at startup; exact pins are unnecessary for drift rejection. **Q3’s operational budget and Q7’s supported deployment platform** need supervisor/owner confirmation after preflight. Add one explicit owner decision: the bounded environment/coverage ledger.

**What I would cut for the budget:** ship real Vite serve and Vitest root/project resolution and transforms, static syntax checks, isolation, and the alias/hook/project regression families. Defer build/worker auditing and optimizer-origin tracing. Losing build coverage means missing build-only aliases/plugins, production conditions and worker-specific pipelines; losing optimization coverage means missing optimizer/esbuild-specific rewrites and prebundle provenance. Record those losses explicitly—serve/project evidence cannot support the universal “no ordinary code path” claim.

F70–F73 can be resolved in one plan amendment. No third review round is needed.

VERDICT: REJECT
review complete