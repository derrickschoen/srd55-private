# M-1 plan review, astra round 3 (2026-09-13, read-only, dnd-wt-gate-integrity at d251e716)

Source: .tmp/runs/fanout/review-plan-m1-r3.log (verbatim final message)

**P3-F1 — P3, nonblocking: residual coverage ambiguity is slightly understated.**  
**Plan:** [1022–1024](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/.tmp-plans/2026-09-13-gate-verdict-integrity-plan.md:1022). **Installed source:** `vitest/dist/chunks/cli-api.BK8pd4xc.js:13917–13919`; `coverage.DM_a_rWm.js:772–776,790–791`.

Coverage cleanup can fail **with `reportOnFailure:false`**: `onTestFailure()` runs before that setting’s early return and invokes filesystem cleanup. The remaining ambiguity therefore requires enabled coverage, but not necessarily enabled failure reporting.

**Minimal change:** describe “coverage reporting or cleanup after `onTestRunEnd`, including cleanup with `reportOnFailure:false`.” This corrects the accepted residual’s wording; it does not require expanding M-1 or reopening the settled timeout ruling.

**P3-F2 — P3, nonblocking: the bounded Playwright assertion omits its promised stock-artifact check.**  
**Plan:** [885–894](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/.tmp-plans/2026-09-13-gate-verdict-integrity-plan.md:885). **Installed source:** `playwright/lib/runner/index.js:3893–3929`.

The executable assertion reads only `evidence.json`, although the required result explicitly includes readable stock JSON.

**Minimal change:** also parse `stock.json` and assert its corresponding one-file/three-test inventory. The existing prose already requires this; make the command enforce it.

No P1 or P2 blocker remains.

For the disposition table, **Plan** references the revised plan; installed-source abbreviations are:

- **V/C/J/VT:** `node_modules/vitest/dist/chunks/` → `cli-api.BK8pd4xc.js`, `cac.DdICfEr1.js`, `index.UpGiHP7g.js`, `reporters.d.DtoKVV2s.d.ts`.
- **P/PC/PT:** `node_modules/playwright/` → `lib/runner/index.js`, `lib/common/index.js`, `types/testReporter.d.ts`.

| Round-2 finding | Disposition | Plan and installed-source evidence |
|---|---|---|
| **P2-F1** | **RESOLVED** | Plan:172–184, 289–296, 509, 624–625 captures `onProcessTimeout`, synchronously rewrites evidence, and requires `vitest-process-timeout` to survive passing retry. VT:1053 and V:13965–13978 establish the callback before forced exit. The universal-completion limitation remains explicit; apply P3-F1’s narrower wording correction. |
| **P2-F2** | **RESOLVED** | Plan:647–660, 803–830 puts replacement filters and serial flags before the preserved tail. **I reran the exact line-806 probe:** the sole filter was `tests/fixtures/gate-vitest-passes-on-retry.fixture.ts`; `fileParallelism:false`; `maxWorkers:1`; tail exactly `["--node-tail","tail-value"]`. C:560–575, 2288–2304 supports that interpretation. |
| **P2-F3** | **RESOLVED** | Plan:234–251, 495, 511–512, 570–578 names both asymmetric cases for both runners and all three provenance mismatches. Reasons are `stock-report-missing`, `evidence-sidecar-missing`, `evidence-invocation-mismatch`, `evidence-kind-mismatch`, and `evidence-phase-mismatch`. That is **seven test instances: four asymmetric plus three mismatch**, rather than six. J:3597–3613 and P:3897–3929 confirm stock JSON has no invocation UUID. |
| **P2-F4** | **RESOLVED** | Plan:287–296 separates diagnostic launch from authorization to turn green; 409, 419–439 distinguishes individual `timedOut` from global `timedout`; 510 supplies the retry-positive control. PT:24–32,695; PC:2537–2548; P:5820–5823 support the mapping. D544:11065–11071 supports serial retry of attributable test failures/timeouts. |
| **P2-F5** | **RESOLVED** | Plan:412–425, 545–550, 627–630 records `expectedStatus` and callback occurrence; intentional skip, unfinished execution, and synthesized nonexecution remain distinct. Independent unfinished failures survive path aggregation. PC:2531–2544,2822–2837 and P:5400–5412,5467–5475 establish why these distinctions are necessary. |
| **P2-F6** | **RESOLVED** | Plan:356–361, 541–544, 621–625 obtains root resolved `vitest.config.passWithNoTests` through `onInit`. V:12620–12622, J:3552, VT:1042,3572,3602 confirm the configuration scope. |
| **P2-F7** | **RESOLVED** | Plan:725–746 uses bare terminal `--json`, normalizes object `.file` values, checks exits, filters root discovery, and leaves dedicated discovery unfiltered. I independently parsed both argv constructions: `json:true`, `filesOnly:true`, correct root filters, empty dedicated filters. C:2359–2381 and V:14612–14625 support the commands and output shape. The positive discovery proof remains implementation-time work, explicitly acknowledged at Plan:779–781. |
| **P2-F8** | **RESOLVED** | Plan:552–568 distinguishes actual lifecycles from supplied-object contracts; 873–898 authorizes exactly one real Playwright invocation. I evaluated the wrapper generator in memory with installed `defineConfig`: absolute fixture `testDir`, exact `testMatch`, workers 1, retries 0. P:2163–2175 supports bounded discovery; P:5400–5412,5473 supports synthesized terminal callbacks; P:5843–5850 supplies `onEnd → onExit`. Root `playwright.config.ts:42` confines ordinary discovery to `tests/browser`, excluding this fixture. Apply P3-F2’s assertion hardening. |

The bounded Playwright design is executable in principle with `PLAYWRIGHT_PORT=4470`, one worker, no browser fixture, and no configured server. Its production reporter lifecycle remains **planned**, not executed: the reporter and fixture do not yet exist. Likewise, **59 Vitest tests plus three Playwright fixture tests are planned totals**.

I found no additional M-1 scope expansion, D544/D583 conflict, or joint-report do-not-do violation. D622’s text remains absent at this pin; authorization rests on the supplied brief. Review remained read-only, with no agents, `claude`, git writes, or prohibited-directory reads.

**ACCEPT PLAN M1**

M1 PLAN REVIEW R3 DONE