No blocking defect remains for this bounded slice. The following notes can be absorbed during implementation without another plan round.

**F75 — Medium — NOTE: make project ownership an explicit rule.**

“Projects to which configuration assigns” a source file remains underspecified ([plan:142](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:142)). Vitest exposes test-file matching, not exclusive ownership of ordinary source modules. [Installed API:2007](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:2007)

For this slice, treat ordinary sources as potentially shared: check each `src/**` seed in each selected project’s configured execution environment unless an explicit ownership manifest narrows that set. Do not infer exclusion from test globs or directory containment. Keep `tools/**` restricted to Node/SSR. Record the resulting seed/environment assignment so omissions are reviewable.

**F76 — Medium — NOTE: tighten external-boundary and dependency-provenance wording.**

The `external result or canonical file` wording must not make `external: true` alone sufficient ([plan:159](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:159)). Vite can return a bare package ID with `external: true`, losing the canonical filename from that result. [Installed resolver:32798](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:32798)

Resolve first, perform protected-identity checks before stopping, and require documented package provenance and canonical containment for dependency boundaries. Opaque external results remain unresolved.

Also, package versions and lock metadata do not themselves authenticate installed bytes. Use a trusted installation baseline and compare the candidate lock against that baseline; state that trust assumption rather than claiming `package.json` proves integrity ([plan:517](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:517)).

**F77 — Medium — NOTE: finish the executable isolation profile and narrow the socket claim.**

The mount list needs the read-only Node/runtime-library closure and minimal device access, alongside `/work`, `/guard`, dependencies and scratch. Bubblewrap’s installed example illustrates the required runtime mounts; it is not a profile to copy wholesale. [Example:12](/usr/share/doc/bubblewrap/examples/bubblewrap-shell.sh:12)

Use inherited limits through the available `prlimit` launcher, explicit pipe handling, a new session, and namespace-aware cleanup. Resolve worker dependencies from the mounted installation rather than assuming imports from `/guard` search `/work/node_modules`.

Network isolation prevents access to host/external networks; it does **not** prohibit creating private-namespace sockets or listeners. Correct that claim at [plan:279](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:279). Keep “guard-owned servers never listen” and the host-isolation canaries. A blanket syscall prohibition would require additional enforcement such as seccomp; it is unnecessary for the adopted bounded profile.

**F78 — Low — NOTE: correct the optimizer citation and constrain normalization.**

With `noDiscovery:true` and empty includes, installed Vite **disables** optimization; it does not select the explicit optimizer as [plan:167](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:167) says. [Disable predicate:31891](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:31891), [selection:34890](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:34890)

Ensure the effective options are enforced before optimizer initialization, including project/environment overrides. Strip `v`/`t` only when identified as Vite-owned volatile parameters; user/plugin query parameters with those names can be meaningful. Keeping raw diagnostics alone does not establish that normalization is safe.

**Verified claims**

- The supplied r2 SHA-256 matches.
- **F70:** runtime-value/type-only separation and browser-versus-Node ownership are now explicit; F75 supplies the remaining project-assignment detail. [Plan:136](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:136)
- **F71:** optimization is deferred, canonical evidence is separated from volatile diagnostics, and meaningful suffixes remain protected. [Plan:167](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:167), [report contract:252](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:252)
- **F72:** builder/worker auditing is removed from implementation and acceptance. [Plan:130](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:130)
- **F73:** passing controls redirect to ordinary targets; removal produces unresolved evidence; syntax-only cases retain static expectations. [Plan:392](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:392)
- **F74:** same-process interference and unauthenticated child conclusions are explicitly acknowledged. [Plan:283](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:283)
- The coverage ledger includes every requested build, production-condition, worker, optimizer/esbuild and prebundle loss. Acceptance excludes those areas. The supported claim should always be read with the recorded environment and dependency boundaries. [Ledger:285](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:285)
- Every F47–F69 family and all four requested plugin-hook/project-chain rows remain represented; an activated dependency-plugin control was added. The migration requirement is now assertion/control-level, though the actual inventory remains implementation work. [Inventory:209](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:209), [matrix:394](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:394)
- Startup version assertions replace manifest pinning; all eight questions are decided. Fixture/frozen-contract protection, generic naming and independent controls remain intact. [Decisions:494](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp-plans/2026-09-10-heldout-runtime-guard-plan.md:494)

The two additional implementation-ledger risks I would record are **untraversed transitive dependency behavior beyond accepted external boundaries**, and **configuration behavior varying across modes, environment values or time outside the captured run**. Neither warrants expanding this slice.

VERDICT: ACCEPT
review complete