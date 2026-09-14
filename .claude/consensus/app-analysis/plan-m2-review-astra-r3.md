# M-2 plan review r3 FINAL (astra 01a09e93-115b-77b3-996a-b5dc1b357876), harvested 2026-09-14 02:34

**PB3-F1 — P1: PostCSS detection does not cover Vite’s actual search boundary.**  
[Plan lines 228–236](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-completeness-plan.md:228), fixtures at 481.

The root filename list is correct, but checking only that directory is insufficient. Read-only, in-memory probes against installed Vite 7.3.6 source confirmed:

```text
parent workspace marker=false → PostCSS stopDir=/virtual/project
parent workspace marker=true  → PostCSS stopDir=/virtual
css.postcss string           → searchPath=/virtual/project/config
```

Vite selects that configured search path at `config.js:30344–30345`; its workspace search recognizes ancestor workspace markers at `25356–25390`. An unchanged configuration can therefore load PostCSS files outside the scanned root. Subsequent edits there would evade the proposed key. The observation that workspace root equals repository root **at HEAD** is not a lookup-time constraint.

**Smallest resolving change:** require, before every pointer lookup:

- BYPASS when Vite’s workspace root differs from the repository root.
- Explicit detection and BYPASS for a Vite `root` override or `css.postcss` configuration; unsupported/computed forms also bypass.
- Independent repeated-call fixtures for ancestor discovery and redirected configuration, asserting validated builds and zero pointer/generation reads or writes.

This extends the existing conservative detector list without supporting additional configuration or adding a dependency. The supervisor can adopt this bounded amendment without another plan round.

| PB2 finding | Disposition | Plan lines and independent verification |
|---|---|---|
| **PB2-F1** | **RESOLVED** | **238–276, 483–485:** any env-file `$` and unmodelled config/plugin environment access require BYPASS; repeated-call fixtures require builds and zero cache access. Independently reproduced `BUILD_LABEL=alpha/beta → VITE_LABEL=alpha/beta` with no ambient `VITE_*` names. Confirmed the two existing reads: `core.cacheDir` selects disposable cache storage; `AI_BRIDGE_FAKE` is inside `configureServer` on the serve-only plugin. Exact-context allowlisting and mutation fixtures are specified. |
| **PB2-F2** | **PARTIAL** | **198–236, 477–481:** inline modules, style elements, style attributes, image-set, unsupported stylesheet languages, and root PostCSS forms each have explicit detection and independent repeated-bypass fixtures. Installed-source inspection corroborates these entry points; current unsupported forms are absent. PostCSS search outside the root remains uncovered: **PB3-F1**. |
| **PB2-F3** | **RESOLVED** | **404–455, 469, 492–509:** fresh MISS/BYPASS must complete tsc → Vite → guard/digest before successful return or publication. Public validation remains unconditional. Confirmed all four consumers propagate failure, and the guard runs digest verification before printing success. Independent failure fixtures cover tsc, Vite, guard, and digest; **`STORE_BEFORE_GUARD` / `RETURN_REJECTED_DIST`** explicitly test rejected-artifact nonpublication and retry rebuilding. |

**PB1 carry-forward:** Nothing resolved in round 2 regressed. F2–F6 remain resolved; F1’s recursive closure remains intact, with its remaining configuration gap identified above. Independently reproduced **97 omissions = 67 drizzle + 30 docs**, census **640**, and both retained public-script assertions passing against the proposed string. The supervisor proof retains `set -euo pipefail`, restoration trap, immediate per-build stamp checks, first-build `NODE_ENV=test`, and MISS/MISS/HIT durations. A synthetic pipeline failure exited **17**, ran restoration, and reached neither stamp nor final assertions.

The six-file scope remains suitable for one Sol increment after the amendment: no M-3 work, dependency addition, Node pin, or library swap. D589/D594/D612/D612.1 are respected by the revised validation and normalization contracts. Landing note: detector tests, independent mutant kills, actual discovery, and build timings remain implementation/supervisor evidence—not completed verification.

Plan SHA-256 matches `1bd750b2…`; HEAD and clean tree confirmed. No edits, git writes, other agents, or prohibited runs occurred.

**REJECT PLAN M2**

M2 PLAN REVIEW R3 DONE