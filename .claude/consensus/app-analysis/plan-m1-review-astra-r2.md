# M-1 plan review, astra round 2 (2026-09-13, read-only, dnd-wt-gate-integrity at d251e716)

Source: .tmp/runs/fanout/review-plan-m1-r2.log (verbatim final message)

Reviewed `d251e716` read-only. No edits, git writes, agents, `claude`, consensus skills, or prohibited-directory reads. Verification used installed sources and in-memory parser/formatter probes; no test suites ran.

References: **Plan** = [revised plan](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/.tmp-plans/2026-09-13-gate-verdict-integrity-plan.md). Installed-source abbreviations:

- **V**: `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js`
- **C**: `node_modules/vitest/dist/chunks/cac.DdICfEr1.js`
- **J**: `node_modules/vitest/dist/chunks/index.UpGiHP7g.js`
- **VT**: `node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts`
- **P**: `node_modules/playwright/lib/runner/index.js`
- **PC**: `node_modules/playwright/lib/common/index.js`
- **PT**: `node_modules/playwright/types/testReporter.d.ts`

1. **P2-F1 — P1 blocks: a detectable post-report timeout remains outside the evidence contract.**

   **Plan:** 177–184, 530–533, 746–753. **Source:** VT:1053; V:13965–13980.

   `onProcessTimeout` is a real reporter callback invoked after reporting when Vitest’s exit timer expires. It distinguishes that additional failure even when an earlier assertion already set exit 1. Currently, the planned reporter ignores it, permitting failed-file + process-timeout + passing retry to become green.

   **Change:** capture this callback in the same sidecar, record a named fatal reporter-domain reason, and test that retry cannot erase it.

   Option (b) remains justified for the **remaining** collision: I found no universal callback exposing the exception caught at V:14566–14570. `onClose` runs during close without an error argument (V:13948–13956); `onFinishedReportCoverage` exists but likewise supplies no failure result and is skipped when coverage reporting throws (V:13921–13924). Therefore “no later reporter callback” is false, while “no universal completion/error callback” is supportable.

   Bound the residual explicitly: default coverage is disabled (`defaults.9aQKnqFk.js:15–22`, root `vitest.config.ts:26–64`). Coverage-related collisions require enabling coverage; assertion-failure reporting also depends on `reportOnFailure` (V:13916–13924). Noncoverage post-report work also exists: debug metadata writes require `server.debug.dump`/`VITEST_DEBUG_DUMP` (`coverage.DM_a_rWm.js:534–536`; V:12608–12617). Distinguish these from the detectable timeout path.

2. **P2-F2 — P2 must fix: retaining the `--` tail before appending retry arguments defeats parsing.**

   **Plan:** 548–559, 758–760. **Source:** C:560–575, 2288–2304.

   The ordinary option-retention policy names the relevant options and explicitly preserves both serial flags. Its `--` ordering is wrong, however. An installed `parseCLI` probe of the prescribed construction returned:

   ```text
   filter: []
   options["--"]: [old file, --no-file-parallelism, --maxWorkers=1, failed file]
   ```

   Thus the flags are present as strings but are not parsed as worker controls, and the failed file is not a filter.

   **Change:** specify retry argv as retained parsed-option tokens, gate-controlled reporter/serial options, replacement failed-file filters, then any preserved `--` delimiter/tail. Explain that Vitest stores that tail separately from filters. Test parsed `fileParallelism:false`, `maxWorkers:1`, and exact `filter`, rather than only argument presence.

3. **P2-F3 — P2 must fix: asymmetric artifact failures lack the required named contracts and tests.**

   **Plan:** 144–169, 186–188, 439, 495–500, 541–547. **Source:** J:3597–3613; P:3893–3929; `tools/gate-runner-lib.mjs:59–78`.

   Separate destinations and ownership are sound: stock reporters write stock paths; gate reporters write sidecars. The UUID joins the sidecar and phase record to the fresh stock **path**. Stock JSON itself has no invocation UUID; the classifier must not require one inside it.

   The matrix names missing reporter/evidence together, while the classifier inventory names only “missing evidence.” Neither explicitly names and tests both:

   - Readable stock JSON, missing sidecar.
   - Readable sidecar, missing stock JSON.

   **Change:** give each a stable reporter-domain reason and a named test for both runners. Specify discovery/retry behavior for each; absent sidecar cannot certify discovery. Explicitly allocate UUID/kind/phase mismatch coverage too—the risk section claims mismatch tests, but the twelve-test inventory does not name one. Update totals if additional test instances are needed.

4. **P2-F4 — P2 must fix: individual Playwright timeouts are incorrectly promoted to permanent global failure.**

   **Plan:** 360, 369–383, 484–487. **Source:** PT:24–32, 695; PC:2537–2548; P:5820–5823. **Ruling:** `.claude/decisions.md:11065–11071`.

   A test’s `timedOut` result is distinct from `FullResult.status:"timedout"`, which means the **global** deadline. An attributable test timeout can produce ordinary `FullResult.status:"failed"` without a global error. D544 expressly permits serial retry of timed-out files, including a named Playwright case.

   **Change:** keep attributable individual timeouts retryable; retain fatal handling for global timeout, interruption, and global errors. Add a test-timeout → exact serial pass positive control.

   Also reconcile Plan:332–333 with :438: one says retry requires clean reporter/discovery domains; the other requires executing retry despite an initial global error. Separate **launching the diagnostic retry** from **allowing it to produce a green gate**.

5. **P2-F5 — P2 must fix: Playwright’s skipped mapping does not establish intentional completion.**

   **Plan:** 363, 365–367, 535–536. **Source:** PC:2531–2544, 2822–2837; P:5400–5412, 5473.

   `raw:"skipped", outcome:"skipped"` also describes tests that did not run. Playwright initializes result objects with `status:"skipped"` and can synthesize skipped terminal results after another serial test fails. Therefore the planned pair alone cannot distinguish intentional skips from unfinished or blocked execution.

   **Change:** record terminal callback occurrence and `expectedStatus`/skip evidence. Map intentional skips separately from started-but-unfinished and runner-synthesized nonexecution. Add corresponding real-object tests. Preserve failure-dominant aggregation without letting it suppress an independent unfinished/discovery failure.

6. **P2-F6 — P2 must fix: allowed-empty-run semantics use the wrong configuration scope.**

   **Plan:** 317–321, 480–483. **Source:** V:12620–12622; J:3552; VT:3572, 3597–3602.

   Both terminal-state calculation and stock JSON read **`vitest.config.passWithNoTests`**, the root resolved setting. The plan instead requires every participating project to allow emptiness. `passWithNoTests` is explicitly a `NonProjectOptions` member and omitted from `ResolvedProjectConfig`.

   **Change:** serialize the root resolved value obtained through reporter `onInit`; remove the all-project requirement. Test allowed/disallowed emptiness against that same root setting.

7. **P2-F7 — P2 must fix: both discovery commands are incorrect, and the positive assertion expects the wrong JSON shape.**

   **Plan:** 610–622. **Source:** C:1311–1315, 2267, 2359–2381; V:14612–14625.

   The flags exist, but installed `parseCLI` returns **`json:"true"`** for `--json=true`. The formatter treats strings as output filenames: it writes to a file named `true`, rather than stdout. I confirmed this using the installed formatter with filesystem writes replaced by in-memory recorders.

   With boolean `--json`, file-list output is:

   ```json
   [{"file":"/absolute/path/to/file","projectName":"optional"}]
   ```

   It is not an array of relative-path strings.

   **Change:** use bare `--json` at the end of each command. Normalize each object’s `file` before comparison. Keep the root command filtered to the two proof files; run the dedicated-config command **without file filters**, so it proves its entire discovery set is exactly those two. Assert command exits as well as parsed results.

   The non-`.test.ts` filenames correctly address isolation; the proposed executable proofs currently establish neither direction.

8. **P2-F8 — P2 must fix: the real Playwright lifecycle requirement contradicts the verification prohibition.**

   **Plan:** 473–493, 596–597, 645, 699–700. **Source:** PT:160–182; P:5843–5850; existing fake boundary at `tests/unit/tools/gate-runners.test.ts:45–61`.

   The arithmetic is correct, but these are **planned**, unexecuted tests:

   | Group | Count | Boundary exercised |
   |---|---:|---|
   | Gate-wrapper matrix | 19 | Real wrappers; fake runners/flock |
   | Evidence reporters | 20 | Intended real runner objects: 10 Vitest, 10 Playwright |
   | Classifier contracts | 12 | Supplied artifacts/process evidence |

   The exceptional queued/pending/no-result fallback manually invokes the gate reporter with captured real objects; that tests adapter behavior but does not establish a naturally delivered terminal lifecycle.

   The plan promises real Playwright launches, then prohibits **any Playwright suite**. It neither resolves that conflict nor honestly declares the resulting coverage gap.

   **Change:** explicitly permit isolated Playwright reporter fixtures using no browser or application server, while retaining the prohibition on application/browser suites. Require at least one complete real `onBegin → onTestEnd → onEnd → onExit` execution of the production reporter. Label captured-object fallback tests separately.

| Round-1 item | Disposition | Deciding plan/source evidence |
|---|---|---|
| **P1-F1** | **PARTIAL** | Option (b) and residual collision are acknowledged at Plan:177–184, 746–753; V:14566–14576 supports the collision. Detectable `onProcessTimeout` and retry argv remain wrong: P2-F1/F2. |
| **P1-F2** | **PARTIAL** | Stock preservation and separate paths resolved at Plan:144–169; J:3554–3613 and P:4000–4045 preserve forensic data. Asymmetric failure contracts/tests remain incomplete: P2-F3. |
| **P1-F3** | **PARTIAL** | Fixture names/config resolved at Plan:566–578 against `vitest.config.ts:34–35`; discovery commands fail installed C/V semantics: P2-F7. |
| **P1-F4** | **PARTIAL** | Plan:301–315 and 354–372 enumerate native states, explicitly preserve failure-dominant aggregation, and exempt attributable run-level failures. V:11865–11916 and PT:32/441/695 support the sets. Playwright timeout/skip interpretations remain wrong: P2-F4/F5. |
| **P1-F5** | **PARTIAL** | Empty-run tests are named at Plan:480–483, but :317–321 uses project settings instead of the root setting used by V:12621 and J:3552: P2-F6. |
| **P1-F6** | **PARTIAL** | Coverage expands at Plan:473–502, but P2-F3/F8 remain. **Proof 1 is resolved:** Plan:661–667 requires readable stock/evidence, one passed file, complete discovery, no reporter failure, and exactly one process-domain failure; reporting/teardown order is supported by V:13607, 13937, 14573–14576. |
| **P1-F7** | **RESOLVED** | Plan:144–155, 186–188 explicitly defines fresh invocation provenance, uncertified absent evidence, and `retry:null` without attributable failures. Existing freshness is established by `tools/gate-runner-lib.mjs:82–85`; no runner-specific source is needed. |
| **P1-F8** | **RESOLVED** | Plan:459–467 specifies `process.execPath`, removed flock override, existing empty PATH, exact `ENOENT`, and diagnostic RED failures. Relevant boundary: `tools/gate-runner-lib.mjs:45–58`, existing harness :48–61. Actual ENOENT verification remains correctly marked pending at Plan:723. |
| **P1-F9** | **RESOLVED** | Plan:266–270, 385–425 qualifies executable versus forensic consumers and external-inventory uncertainty, and supplies the exact headings. Producer sources: `tools/gate-runner-lib.mjs:102–109`, `tools/gate-vitest.mjs:98–105`. External completeness was not independently verified. |
| **Interruption note** | **RESOLVED** | Plan:64–67, 329–334 retains fatal terminal interruption regardless of numeric exit; V:12605–12607 explicitly sets exit 1 for interrupted state. |

Apart from the retry-policy changes identified above, I found no additional D583 or joint-report do-not-do violation. D622’s text is absent at this pin; authorization remains supplied by the review brief, as Plan:707 acknowledges.

**REJECT PLAN M1**

M1 PLAN REVIEW R2 DONE