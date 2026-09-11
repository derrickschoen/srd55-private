**RG-F1 — High — The fixed process limit makes the guard fail under normal machine load.**  
Both preflight and worker launches use `--nproc=512`: [heldout-runtime-guard.ts:241](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:241), `:257`, `:435`. This corroborates the supervisor’s reproduced thread-count failure. The spec also performs four isolation-dependent real-tree runs during collection, before its tests begin: [heldout-runtime-guard.test.ts:433](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:433).

Use a delegated task-specific PID limit if available; otherwise derive the UID-wide limit from the current task count plus bounded headroom and document its limitations. Separate pure unit tests from isolation-dependent integration tests, but moving tests alone does not fix the launcher. Adjusting this resource parameter is explicitly permitted by the amended plan’s isolation boundary at `:281`.

**RG-F2 — High — The npm entry point executes configuration before isolation and can exit successfully without inspecting anything.**  
[package.json:20](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/package.json:20) invokes `vite-node`. Its installed CLI creates a Vite server using discovered configuration and loads environment variables before executing the script: [cli.mjs:65](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite-node/dist/cli.mjs:65), `:80`, `:102`. Candidate configuration therefore executes outside bubblewrap.

Additionally, vite-node removes the script filename from `process.argv` at `:49`. With no arguments, or without both `--base` and `--candidate`, [heldout-leak-check.ts:1750](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1750) selects `null` and never calls `main`. This explains how the no-argument npm command can succeed despite failing isolation.

Use an explicit, configuration-free CLI entry point that always validates arguments. Add subprocess controls for missing arguments, failed preflight and successful inspection.

**RG-F3 — High — The implementation rejects its own worker when inspected as a candidate change.**  
The worker exempts both runtime-guard files from runtime seeds, but the static exemption list does not: [heldout-leak-check.ts:57](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:57), [worker.mjs:18](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:18).

An in-memory invocation of the actual static inspector on the two new files returned:

```text
tools/heldout-runtime-guard-worker.mjs
unresolved_module_edge: unresolved require_resolve edge outside evaluation tooling
```

Align the explicit evaluation-tool exemptions and test the combined candidate-inspection path.

**RG-F4 — High — Runtime traversal discards supported edges that the static wall now delegates.**  
The worker introduces a second, narrower parser at [worker.mjs:118](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:118). It omits `require`, require aliases and resolver calls; its string evaluator also omits constant concatenations.

Actual-function probes produced both **zero static findings and zero runtime edges** for:

```js
require('#policy');
const load = require; load('#policy');
import('#' + 'policy');
import.meta.resolve('#policy');
```

For `require`, the real SSR transform does not repair the omission: installed Vite collects import/export declarations and literal dynamic imports, not CommonJS calls. See [config.js:15468](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:15468) and `:15581`.

Pass retained AST value-edge discoveries into runtime resolution, preserving loader kind and importer. Unsupported runtime interpretations must remain unresolved. The new clean expectation for aliased `import.meta.glob` at static-spec `:383` also needs explicit treatment: installed Vite’s macro matcher only recognizes direct `import.meta.glob(...)` syntax, [config.js:28105](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:28105).

**RG-F5 — High — Traversal can mark uninspected modules clean, and control probes can suppress ordinary findings.**  
Controlled resolver probes against the actual `inspectEnvironment` function reproduced three zero-finding results:

- A resolver returning `virtual:policy` is marked clean and never transformed. Only `/work/…` and NUL-prefixed IDs are queued: [worker.mjs:467](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:467).
- A plugin redirecting `node:path` to a virtual module is still classified as `external_builtin`, because classification trusts the original specifier: [worker.mjs:275](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:275).
- When an ordinary import and the protected-control probe resolve to the same virtual module containing a reserve digest, the control visit claims the shared visited entry. Its protected finding is suppressed, and the ordinary visit is skipped: [worker.mjs:388](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:388), `:472`.

External canonicalization also occurs after the protected check, without checking the resulting canonical file again (`:442`, `:278`).

Every non-boundary result must be transformed or unresolved. Classify boundaries using resolved identity, perform protected checks after canonicalization, and isolate control traversal from ordinary traversal.

**RG-F6 — High — The assertion migration is incomplete, including a retained Rule N guarantee.**  
The audit below accounts for all removals. Several former cases have only broadly related replacements, and some have none. Most importantly:

- The extended-configuration Rule N assertion was removed. Static inspection now prepares only changed sources at [heldout-leak-check.ts:1501](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1501); runtime configuration loading does not perform Rule N inspection. An unchanged extended configuration can therefore lose its previous loader-escape check.
- Real-tree tests assert findings and load status, but no independent eligible/inspected-file count: [runtime spec:722](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:722).
- The “activated dependency plugin” fixture imports `normalizePath` and constructs a local plugin. It does not activate a plugin exported by a dependency or test its dormant counterpart: [runtime spec:253](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts:253).
- The F67 array fixture already contains the protected replacement; it never mutates through the spread-derived runtime index: runtime-spec `:223`.

Restore these guarantees through the accepted runtime/static routing, without restoring Rule C.

**RG-F7 — Medium — Close failures do not fail closed.**  
Both cleanup paths explicitly discard rejected closes: [worker.mjs:594](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:594), `:635`. Merely removing those catches is insufficient: installed Vite itself uses `Promise.allSettled` during server/environment closure, [config.js:25485](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:25485), `:34934`; Vitest logs rejected close operations instead of rejecting its close promise, [cli-api.BK8pd4xc.js:13949](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13949).

Observe close failures at the appropriate underlying boundary and add a throwing-close regression. The current timeout test checks scratch removal, not successful child reaping.

**RG-F8 — Medium — Worker JSON is not validated as the declared report type.**  
[heldout-runtime-guard.ts:345](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard.ts:345) checks the protocol, a slice value and four array containers, then casts the entire object.

An actual-function probe accepted:

```json
{
  "protocol": "heldout-runtime-v1",
  "slice": "B",
  "configurationLoad": [42],
  "resolution": [{"status": "made-up"}],
  "seedAssignments": [null],
  "findings": [],
  "extra": "not validated"
}
```

Validate row fields, discriminants, request-slice agreement and required completion evidence. Add malformed-response controls. This is ordinary protocol validation, not a request to expand the hostile-config attestation scope.

**RG-F9 — Medium — Canonical reports depend on resolver completion order.**  
Parallel processing appends to the shared queue in completion order, while the first visit selects a module’s reported seed: [worker.mjs:432](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-runtime-guard-worker.mjs:432), `:472`.

With identical graph values and only resolver delays reversed, an actual-function probe reported the shared module under `src/b.ts` in one run and `src/a.ts` in the other. Sorting completed rows at `:644` cannot correct that difference. The existing determinism test uses a simple protected alias and does not exercise shared dependencies.

Use deterministic traversal/provenance selection and add a diamond-graph timing control. Failure details also currently retain raw `String(error)` rather than the planned canonical error representation (`:592`, `:633`).

The removal accounting is **70 assertions across 58 retired declarations, plus two moved Rule N assertions and two Rule C audit assertions = 74 removed `expect(` lines**. The two moved assertions remain at static-spec `:1017` and `:1042`; the Rule C audit removals are authorized, with the loader-only audit retained at `:314`.

In the table, old lines refer to the **HEAD version** of `tests/unit/tools/heldout-leak-check.test.ts`. **R** means the new [runtime spec](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-runtime-guard.test.ts). Named F-cases use its paired positive/mutant tests at `:476`/`:490`; clean cases use `:515`. “Partial” means the listed replacement does not account for every former case, assertion or control.

| Old line — declaration subject | Removed assertions | Runtime counterpart / disposition |
|---|---:|---|
| 432 — held-out glob variants | 1 | **Partial:** R:542, :561; object-query variant absent |
| 458 — negative glob patterns | 1 | R:568, :599 |
| 471 — glob query recorded in finding | 1 | **Partial:** R:583; exact suffix-evidence assertion lost |
| 496 — literal glob base | 1 | R:578 |
| 507 — leading `**` with base | 1 | **Partial:** R:605 fails closed; base variant absent |
| 516 — literal option spreads | 1 | R:578 |
| 529 — exact glob alias | 1 | **Lost:** replaced with static clean expectation |
| 556 — leading `**` | 1 | R:605/:619, now explicitly unresolved |
| 565 — unsupported extglob/package/alias globs | 1 | **Partial:** extglob R:573; package/alias-glob cases absent |
| 1460 — package `#imports` | 1 | R:269 |
| 1475 — unmapped package import | 1 | **Lost:** R:522 tests an alias, not `#imports` |
| 1486 — exact before wildcard | 1 | **Lost:** R:269 contains no competing wildcard |
| 1504 — overlapping pattern ordering | 1 | **Lost:** R:280 contains one pattern |
| 1522 — conditional exact target versus wildcard | 1 | **Partial:** R:291; competing wildcard absent |
| 1545 — nested package conditions | 1 | **Lost:** only flat conditions remain |
| 1570 — package-only change reinspects consumer | 2 | **Partial:** R:269; CLI/change-mode and count assertions absent |
| 1592 — config change reinspects alias consumer | 1 | **Partial:** alias fixtures; unchanged-consumer CLI control absent |
| 1608 — alias configuration forms | 1 | **Partial:** shorthand/array/spread cases remain; relative-regex and nonliteral-source cases absent |
| 1647 — nonliteral alias source failure | 1 | **Partial:** generic configuration-throw control R:666 |
| 1664 — shadowed alias spelling | 1 | **Lost:** no scope-shadowing fixture |
| 1686 — spread overrides within alias entry | 1 | **Lost:** top-level F67 spread is a different position |
| 1710 — nonliteral alias-entry spread | 1 | **Lost:** no corresponding spread fixture |
| 1728 — reassignment/property assignment | 1 | **Partial:** F50/F61; whole-variable reassignment absent |
| 1756 — alias writes/push/assign/transfer | 1 | **Partial:** F58/F61/F62; push and spread-transfer cases absent |
| 1797 — return/closure/class/receiver references | 1 | **Lost:** corresponding execution fixtures absent |
| 1834 — object/array/nested/opaque transfers | 1 | **Partial:** F65 indirection; several original transfer forms absent |
| 1913 — computed transfer/loops/constructor/fill/shadowed helper | 1 | **Lost:** no equivalent parameter group |
| 1962 — getter/side-effect/named export | 1 | F47, F47-side-effect-property, F48 |
| 1995 — addressed-subtree guard and controls | 1 | **Partial:** F54 and clean controls; const-subtree alias and several transfer controls absent |
| 2047 — resolve/test alias-address escape | 1 | F58 and F58-test-alias-address |
| 2083 — helper-built Vitest test container | 1 | F59 |
| 2104 — literal `test.alias` discovery | 2 | F59-literal-test-alias and ordinary mutant |
| 2128 — comparison semantics | 1 | F60 plus both F60 clean controls |
| 2155 — const-alias use | 1 | F61 plus F61-const-alias-void |
| 2175 — shorthand/container-spread capability | 1 | F62 and its three additional forms |
| 2209 — shorthand resolve discovery control | 2 | F62 ordinary-target counterpart |
| 2234 — root capability and nonsemantic controls | 1 | **Partial:** F63 root forms; exact build-value control absent |
| 2272 — semantic placement prefixes | 1 | F64 and its four additional forms |
| 2313 — unescaped alias-array discovery | 2 | F64-spread-entry-source and ordinary mutant |
| 2338 — plugin-only entry | 1 | F64-plugin-only-placement |
| 2353 — embedded placement union | 1 | F65 direct, const-entry and two-level forms |
| 2387 — plugin-only indirection | 1 | F65-plugin-only-indirection |
| 2403 — project elements as roots | 1 | **Partial:** F66 composition forms; original helper-mutation variants absent |
| 2434 — project literal alias discovery | 2 | F66 and ordinary mutant |
| 2459 — object/array spread semantics | 1 | **Partial:** F67; spread-index mutation sensitivity lost |
| 2486 — safe spread ordering controls | 1 | **Partial:** later-property control remains; leading-safe array-element control absent |
| 2510 — terminal embedded bindings | 1 | F69, terminal-dual-placement and terminal-plugin-array |
| 2541 — literal project extends | 2 | F68 |
| 2569 — helper/nonliteral/missing/outside/cyclic extends | 1 | **Partial:** helper, variable and missing cases remain; outside/cycle cases absent |
| 2597 — `extends: true` | 1 | F68-extends-true-root-reuse |
| 2608 — Rule N in extended configuration | 1 | **Lost:** retained static guarantee, no replacement |
| 2632 — callback/conditional/const spread | 2 | **Partial:** F63 callback and real config; isolated conditional fixture absent |
| 2659 — Vitest defineConfig/mergeConfig | 2 | F53-direct-vitest-alias and F53-vitest-mergeConfig |
| 2690 — unreachable/nonliteral Rule C references | 1 | Rule C rejection intentionally retired; no complete execution/control mapping supplied |
| 2717 — regex must not match ordinary import | 1 | **Lost:** regex ordinary-target mutant still matches the regex |
| 2734 — actual config/tree clean and counts | 4 | **Partial:** R:722 retains clean/load assertions; three count assertions lost |
| 2741 — injected configuration-sweep leak and count | 2 | **Partial:** R:734 runtime injections; static inspected-count assertion lost |
| 2750 — declaration-file exclusion and count | 1 | **Partial:** R:630 retains runtime exclusion; former count assertion absent |

The ordinary-target mutants themselves are sound: R:490 changes target values while retaining configuration logic and asserts both a clean report and the ordinary canonical target. Real-tree fixtures genuinely copy repository files through the test filesystem helper at R:409.

I independently verified all **66 fixture hashes**, the listing digest `e14bea57…`, and frozen contract hash `0f0e1d8f…`. No files were edited; verification was limited to read-only inspection, hashing and in-memory function probes.

The launcher specifies read-only candidate/dependency/runtime mounts, a private network namespace, clean child environment and parent-death handling. Those properties do not remedy RG-F2 or prove cleanup. Bubblewrap is explicitly pinned to `0.6.1`; Node is **not** explicitly pinned to `24.13.0`: it must match the parent executable’s version. A different matching host Node can pass preflight while failing the test’s hardcoded version assertion. Vite/Vitest versions are explicitly checked.

**REJECT — blocking findings: RG-F1–RG-F9.**