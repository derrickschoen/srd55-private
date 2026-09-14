# M-1 plan review, astra round 1 (2026-09-13, gpt-6-astra high, read-only, worktree dnd-wt-gate-integrity at d251e716)

Source: .tmp/runs/fanout/review-plan-m1.log (verbatim final message)

Reviewed pinned HEAD `d251e716`; working tree remains clean. “Plan” below refers to [the reviewed plan](.tmp-plans/2026-09-13-gate-verdict-integrity-plan.md).

1. **P1-F1 — P1 blocks: evidence written at `onTestRunEnd` is not necessarily terminal process evidence.**

   Plan:179–186, 225–242 accepts exit 1 whenever a failed file exists, provided the recorded global evidence is clean. A later non-file failure can therefore disappear after retry.

   Installed Vitest calls `_testRun.end()` **before** `reportCoverage()` (`node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13607–13608`). Coverage thresholds subsequently set exit 1 (`coverage.DM_a_rWm.js:855–879`); a thrown post-report error reaches the catch at `cli-api.BK8pd4xc.js:14566–14570`, which sets exit 1 and logs it without updating the already-written report.

   Thus, with coverage reporting on failure enabled: initial failed file + later coverage failure → recorded exit 1, no recorded global error → passing retry can still produce green. The current retry also drops the initial Vitest options (`tools/gate-vitest.mjs:74–84`).

   **Change:** define the evidence completion boundary explicitly. Add this late-global-failure counterexample and collect completion evidence after runner-level post-report work. Do not claim that `onTestRunEnd` plus attributable exit 1 proves every global failure was captured. Both originally supplied counterexamples are addressed by the proposed rules; this additional state is not.

2. **P1-F2 — P2 must fix before implementation: replacing stock reports loses unspecified but actively used forensic evidence.**

   Plan:179–195 specifies scheduled files, file outcomes, global errors and terminal status, but does not preserve:
   
   - Vitest `assertionResults`, assertion durations/failure stacks, and file `startTime/endTime`, serialized at `index.UpGiHP7g.js:3554–3595`.
   - Playwright test results, durations, errors, stdout/stderr, steps and attachments, serialized at `runner/index.js:4000–4045`.

   The stock omissions are correctly identified: Vitest’s JSON callback accepts only modules and omits unhandled errors (`:3538`, `:3597–3613`); Playwright omits `FullResult.status` (`:3896–3929`). These omissions justify **additional evidence**, not necessarily replacement of the forensic report.

   **Change:** retain stock JSON at its existing path and add a small evidence reporter/artifact, explicitly linked in v2. Vitest accepts repeated reporter flags (`cac.DdICfEr1.js:702–707`); Playwright accepts a comma-separated reporter list (`testActions.js:164–167`). Specify separate destinations to prevent competing writes. Merely adding file durations to the replacement would still lose assertions and stacks.

   I recommend this smaller change. Reading process fields alone, even with an unhandled-error probe, remains insufficient for the requested discovery and Playwright terminal-status domains.

3. **P1-F3 — P2 must fix before implementation: the real retry fixture is not isolated from ordinary discovery.**

   Plan:395–401 promises fixture isolation, but its proof at :481 runs `tests/fixtures/gate-passes-on-retry.test.ts` with the root configuration.

   `vitest.config.ts:34–35` includes `tests/**/*.test.ts` and does not exclude fixtures. Both proposed `.test.ts` files therefore enter ordinary discovery. A fixture-local config does not exclude files from the root configuration. Moreover, adding `--config` only to proof 2 would not solve retry discovery: current Vitest retries do not retain that option.

   **Change:** specify an executable isolation design and its complete file manifest. One bounded option is non-default fixture filenames plus a fixture-only launcher through the existing `DND_GATE_VITEST_MODULE` seam that supplies the dedicated config to **real Vitest in both phases**, without fabricating results. Verify ordinary and fixture discovery separately. Avoid an unspecified future root-config exclusion.

4. **P1-F4 — P2 must fix before implementation: terminal file states and duplicate-file aggregation need explicit rules.**

   Plan:121–135 reduces everything to deduplicated filenames and binary outcomes without specifying the conversion.

   Vitest `module.ok()` returns true for unfinished tasks (`cli-api.BK8pd4xc.js:11554–11560`). Its actual states include queued, pending and skipped (`:11865–11867`, `:11909–11916`). Therefore presence in `testModules`, or `ok() === true`, is insufficient evidence of completed execution. Collection errors are attributable through module/suite `errors()` and failed state (`:11770–11774`).

   Multiple projects can also report the same path with different outcomes. Deduplication must not let a passing record erase a failing record or conceal an omitted project execution.

   **Change:** define exhaustive native-state mappings, explicit treatment of intentional skips versus unfinished work, and failure-dominant aggregation. Preserve execution identities internally where required before projecting to file paths. Explicitly state that ordinary `runStatus:"failed"`/`success:false` caused solely by file failures does **not** fail the reporter domain; otherwise legitimate retries could be rejected.

5. **P1-F5 — P2 must fix before implementation: the proposed Vitest `success` definition rejects a supported successful empty run.**

   Plan:183–185 requires at least one scheduled file while claiming to retain stock semantics. Stock JSON explicitly allows `passWithNoTests` (`index.UpGiHP7g.js:3552`). Vitest emits start/end callbacks with empty arrays in this case (`cli-api.BK8pd4xc.js:13461–13470`), and its terminal-state calculation respects that option (`:12620–12622`).

   **Change:** preserve explicit `passWithNoTests` success using resolved configuration evidence and test both allowed and disallowed empty runs.

   The exit-1/no-failed-file rule itself is sound here: an allowed empty run normally exits **0**. The defect is the planned reporter success definition.

6. **P1-F6 — P2 must fix before implementation: the verification contract bypasses important new production code and overstates coverage.**

   All 14 matrix cases substitute `fake-gate-command.mjs` for the runner (`gate-runners.test.ts:45–61`), so they never execute either new reporter. The two real proofs exercise only Vitest. Consequently, a broken Playwright reporter can coexist with 17/17 green tests.

   Plan:526–544 also claims global-only, unreadable/malformed-report and timeout/interruption coverage that the seven rows do not contain.

   **Change:** add direct reporter tests exercising the actual adapters and relevant runner objects/lifecycle contracts, including collection failure, global-only errors, timeout/interruption, unfinished results and duplicate paths. Add classifier tests for malformed/unreadable evidence and failures specifically in retry phases. Update totals and claimed coverage accordingly; retain the required seven-row RED/GREEN matrix.

   Separately, strengthen proof 1’s assertion at Plan:467: it currently accepts exit 2 even if the reporter is missing or malformed. Require a readable successful report, exactly one passing fixture outcome, complete discovery and no reporter/global failure. The sole failure should be the process domain.

7. **P1-F7 — P3 note: freshness and absent-phase semantics should be stated, without inventing a current stale-path bug.**

   The four domains can represent stale/unavailable evidence, but Plan:106–119 does not explain freshness or an unavailable schedule.

   Current phase paths already contain a newly generated UUID (`tools/gate-runner-lib.mjs:82–85`). Reusing `DND_GATE_REPORT_DIR` therefore does **not** normally reuse a previous phase’s reporter path.

   **Change:** document that fresh, gate-selected paths are the provenance boundary; any additional evidence artifact must belong to that same invocation/phase. Specify that a crash before reporting leaves discovery **uncertified**, even if both displayed arrays are empty. With no attributable failed files, `retry:null` is correct and the initial phase failure keeps the gate red.

8. **P1-F8 — P3 note: the matrix baseline and signal premise check out; make the harness conditions explicit.**

   I executed both current gate bodies in memory with supplied phase boundaries. For both runners, the seven rows produced the claimed baseline exits:

   | Row | Current exit |
   |---|---:|
   | Successful report, exit 2 | 0 |
   | Successful report, signal | 0 |
   | Spawn error | 1 |
   | Global error plus failed file, passing retry | 0 |
   | Missing report | 1 |
   | Two failed files, retry reports one passing | 1 |
   | Ordinary failure, passing retry | 0 |

   With `stdio:"inherit"` matching the runner, direct self-SIGTERM and forwarding through another Node process both produced `status:null`, `signal:"SIGTERM"` and no spawn error.

   **Change:** make spawn-error setup deterministic: launch Node by `process.execPath`, remove `DND_GATE_FLOCK_MODULE`, and set PATH to a controlled empty directory. A nonexistent PATH directory produced `spawnSync flock ENOENT` locally; `/dev/null` produced **ENOTDIR**, demonstrating why “exact error” needs a precise setup.

   The retained three cases can correctly be RED solely from v2/heading expectations. Require their failure diagnostics to demonstrate that, rather than counting fixture crashes as useful RED evidence.

9. **P1-F9 — P3 note: qualify the consumer inventory and give a concrete supervisor handoff.**

   The broader repository searches found no additional executable gate-JSON reader. They did find forensic use documented in `.claude/consensus/app-analysis/supervisor-pass-r1.md:25` and retained analysis records. Thus “no other reader” should distinguish executable consumers from forensic consumers.

   I did not inspect the prohibited external directory and cannot independently certify the two-script list as exhaustive.

   **Change:** state that limitation and hand the supervisor the exact headings already defined at Plan:160–162:

   - `PASSED ON RETRY (cause not inferred)`
   - `FAILED FILES`
   - `PHASE FAILURES`

   Include a supervisor-owned search for other consumers, the v2 field mapping, and preserved forensic artifact locations. Historical evidence should remain unchanged.

The installed versions are **Vitest 4.1.10** and **Playwright 1.61.1**. Playwright’s cited 0/1/130 mapping is accurate. Vitest’s cited keyboard handler sets 130, but interruption is not universally guaranteed to retain that code—`TestRun.end` also sets 1 for interrupted state—so retaining terminal reason is necessary.

The exit-2 teardown proof is supported statically: reporting precedes teardown, `startVitest` closes in its `finally`, and subsequent exit calls do not supply an overriding code (`cli-api.BK8pd4xc.js:14573–14577`, `:13976–13980`; `cac.DdICfEr1.js:2340–2341`). Report-directory override and initial `--config` pass-through both exist.

The focused Vitest run was **blocked by EROFS** in global setup at `tests/helpers/spell-source-parse-cache-global-setup.ts:84`; no test baseline was established. No edits, git writes, other agents or prohibited-directory reads were performed. Apart from the issues above, the plan preserves D544’s bounded retry and the joint report’s prohibitions. D622 authorization comes from this brief; its text is absent at the pinned revision.

**REJECT PLAN M1**

M1 PLAN REVIEW R1 DONE