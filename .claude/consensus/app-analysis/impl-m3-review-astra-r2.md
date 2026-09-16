# M-3 implementation review r2 (astra 01a09fdc-6f60-72b2-b453-d408417117cb) on ea3b3395, harvested 2026-09-14 08:34

Reviewed `d078c888..ea3b3395` and cumulatively `a04a6093..ea3b3395`. **Three findings remain.**

`GI` below means `tools/vtt-handoff/gate-inventory.ts`; test filenames are under `tests/unit/vtt/`.

- **IG2-F1 — P1; blocks: yes — Retry execution accounting can still be empty.**  
  [GI:1597](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1597), :1616. Nonempty accounting and requested/reported/outcome equality are checked only for the initial phase. The retry loop checks uniqueness and associations only for outcomes that exist.

  **In-memory reproduction:** initial A passed/B failed; retry discovery requests and reports B; M-1 verdict says passed with `passedOnRetry:[B]`. The complete control reconciles as `passed-on-retry`. Removing **both retry `fileOutcomes` and `executionOutcomes`**, while retaining its discovery claims, still returns **`passed-on-retry`, reasons `[]`**.

  **Minimal change:** apply completeness and identity reconciliation to each present phase, using the retry’s expected selection. Add an otherwise-valid empty-retry negative control. Preserve M-1’s verdict separately from the reconciliation failure.

- **IG2-F2 — P1; blocks: yes — Valid failed M-1 reports lose their authoritative diagnostics.**  
  [GI:963](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:963), :980, :1326. Execution-evidence extraction can throw before the report envelope and verdict are retained. A missing evidence sidecar, or a Vitest module in native `pending`/`queued` state, is legitimate input to M-1’s failure classifier; it is not necessarily a malformed final M-1 report.

  **In-memory reproduction using unchanged `classifyPhase`/`reduceGateVerdict`:** missing evidence produces a failed verdict containing process, reporter and discovery failures. The inventory runner instead records `m1Report:null`, `m1Verdict:null`, and `M1_REPORT_INVALID: M1_EXECUTION_EVIDENCE_INVALID`; reconciliation exposes `phaseFailures:[]`. A valid pending-module sidecar similarly loses M-1’s `execution-unfinished` diagnostics.

  **Minimal change:** retain the valid report reference and verdict independently of incomplete execution accounting; represent unavailable accounting explicitly and map native unfinished states appropriately. Add native-shaped failed-report controls that assert preserved diagnostics.

- **IG2-F3 — P1; blocks: yes — Assertion preservation and publication coverage are still incomplete.**  
  [handoff-report.test.ts:640](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:640), :510, :1070. The failed non-test case restores PARTIAL and Markdown checks, but replaces the baseline’s **exact reasons array** with `toContain`. The baseline’s separate exact top-level not-run reasons assertion also has no equally strict replacement.

  The mixed-skip fixture checks a freshly built object, then reads only Markdown. It never inspects published JSON or asserts the Markdown numeric skip count; nonempty failed identities and `phaseFailures` also lack publication assertions.

  **Minimal change:** restore exact reason assertions for the isolated failed/not-run scenarios. Read the mixed fixture’s published JSON and assert its identity arrays/counts plus Markdown `2/1/0/1/1`; add published nonempty diagnostic assertions. No production redesign is needed for these test repairs.

| Round-1 finding | Disposition | Evidence |
|---|---|---|
| **IG1-F1** | **PARTIAL** | Primary publication assertions restored at report:398–465; duplicate orderings :564–591; Windows :1179–1194; invalid/art-path cases :1135–1167; dirty identity :489. Exact reason-array strength remains incomplete: IG2-F3. |
| **IG1-F2** | **PARTIAL** | GI:1533 rejects wrong kind, empty selection, duplicates and explicit selection/count mismatches. All requested negative probes rejected. Retry accounting remains incomplete: IG2-F1. |
| **IG1-F3** | **PARTIAL** | GI:1042 and report.ts:284 retain/render mixed skips and diagnostic fields. Serialization probe produced one JSON skip and Markdown `2/1/0/1/1`. Native failed-report diagnostics still disappear: IG2-F2; publication assertions remain incomplete: IG2-F3. |
| **IG1-F4** | **RESOLVED** | GI:451, :564, :623–635; report tests:1391–1440. Both runner substitutions, `$()` in argv/env, root supervisor selector, missing discovery/report and dangling-target resolution reject. |
| **IG1-F5** | **RESOLVED** | GI:1215, :1315; report test:1443. Adapter exists. Independently reproduced zero exit → passed; null status/null signal/no error → failed with `OUTER_EXIT_MISSING`. |
| **IG1-F6** | **RESOLVED** | publish:58–111, :330. Executed the committed helper in memory: normal guard rejects; removed guard admits `/virtual/unlisted-worktree`. Shared Git identity is mocked; no owner-checkout filesystem dependency. |
| **IG1-F7** | **RESOLVED** | report:139–150; publish:114–125; examples:54–65. Every temporary-root allocation is registered, including copied repositories, report roots and controls; teardown recursively removes them. |
| **IG1-F8** | **RESOLVED** | report.ts:218; report test:519–562. Combined fixtures cover absent and stale dependents with missing production-build, preserving `not-run` and appending the prerequisite reason; current dependent evidence becomes failed. |

The round-1 removed-title table, checked row by row:

| Original expectation group | Current location and disposition | Assertion boundary |
|---|---|---|
| Complete authoritative contracts; READY strictly last | publish:181–219 — preserved | Published files and publication result |
| Atomic READY evidence and independent hashes | report:398–465 — restored: exactly six digests, independent hashes/lengths, repository identity, methods, sample asset, exact requests, F94/F95, no Windows directory, contract-level distinction and art Markdown | **Published JSON and Markdown**. The committed zero-digest guard independently throws `PUBLISHED_DIGEST_COUNT_INVALID`. |
| Every omitted gate makes PARTIAL | report:501–516; exact inventory pin :1223 onward — top-level propagation restored | Built report; not published bytes |
| Conflicting duplicates, both orderings | report:564–591 — both restored with distinct receipt paths and conflicting underlying outcomes; PARTIAL/null evidence/not-READY asserted | Built report |
| Failed or not-run required gate | report:627–646, :501–516 — PARTIAL Markdown, absent READY heading and failed overall readiness restored; exact reasons weakened | Publication result/Markdown for failure; built report for omission |
| Windows UNAVAILABLE despite passed gates | report:1179–1194 — all-gates-passed and exact Windows status/command/reason restored | Built report |
| Absent/invalid evidence and no-repair check | report:1135–1176 — null evidence, empty requests, malformed input, art-path rejection and no repair restored | Built reports and filesystem assertions |
| Drift without overwriting bytes | report:1197–1218 — preserved | Published Markdown bytes |
| Complete dirty repository identity | report:468–498 — restored | Built report |

Thus, **not every scenario asserts published bytes**. The previously weakened primary publication test now does; several other scenarios retain their original builder-level boundary.

For assertion removal accounting:

- **Versus `d078c888`: no semantic assertion deletion found.** Raw removed assertion starts are publish **:295, :297**, and report **:381, :382, :383, :384, :389, :422, :748**. They respectively move to the stronger guard control/policy assertion, published-report helper, complete dirty identity, and expanded absent-input assertion.
- **Versus `a04a6093`: the remaining unauthorized weakening is exact top-level failure/not-run reason arrays**, formerly report:212–214 and :221–223. Caller gate claims and `preExistingFailures` are the authorized retirements. Other renamed, reformatted or fixture-routed expectations survive as mapped above.

Independent probes confirmed rejection of empty wrong-kind discovery, correct-kind empty discovery, duplicate identities, a self-consistent **33/34 explicit cumulative subset**, and expected browser counts off by ±1. A self-consistent `from-config` subset remains accepted under the approved §5.3 receipt-snapshot design; that is distinct from explicit expected-selection enforcement.

The validator accepts all 11 real inventory entries using installed paths/package scripts. Diagnostic rendering includes phase IDs, prerequisites, failed/skipped identities and exact `phaseFailures`. No test-order or worker-state dependency was found by inspection. The supervisor’s **56/56 and discovery-equivalence results remain supplied verification**; I did not rerun those suites or discovery commands, nor independently replay the lane’s filesystem mutation ledger.

The `node --experimental-strip-types` script is **acceptable here**, unchanged from my round-1 assessment. Native loading succeeded on installed **Node v24.13.0**. There is no `.nvmrc` or `package.json.engines` pin to verify. Existing bootstrap, doctor, publish, art and heldout tools already use this flag; other TS tools use existing `vite-node`. No dependency was added.

Scope remains the six authorized cumulative files and five round-2 files. No tier-based selection, affected-test substitution, M-2, docs or M-1 runner/verdict-file changes. Production identity policy and lockfile match both baseline and HEAD. Both diff checks pass; zero added lines exceed 120 columns. D584.4’s cumulative inventory remains intact; D589/D603/D620 scope is preserved, subject to the reporting defects above.

**REJECT IMPL M3**

M3 IMPL REVIEW R2 DONE