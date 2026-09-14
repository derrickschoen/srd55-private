# M-1 implementation review r1 (gpt-6-astra, session 01a09d91-88c6-7933-b04c-6cf9a3ca11c0) on 69d8215c, harvested 2026-09-13 21:49

Five blocking defects remain in `69d8215c`.

I reviewed the specified diff and local binding plan. I did not read sibling worktrees or the prohibited directories, run other agents, edit files, or write git state. All six `node --check` commands and diff-check passed. The focused Vitest invocation stopped before collecting tests with an `ENOENT` creating its temporary transform directory; the supervisor’s 59/59 result remains supplied evidence, not an independently reproduced result. Read-only Node classifier and installed-`parseCLI` probes executed successfully.

**Findings**

**I1-F1 — Playwright stock paths use the wrong base directory. P1 blocks; blocks: yes.**

At [gate-verdict.mjs:117](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:117), stock `spec.file` is resolved against the working directory. Playwright serializes that field relative to `reporter.config.rootDir`: installed `node_modules/playwright/lib/runner/index.js:3958` and `:4008`. This repository’s `testDir` makes that root `tests/browser`.

Consequently, stock `example.spec.ts` and sidecar `/…/tests/browser/example.spec.ts` become different files. My classifier probe with that native stock shape produced `stock-evidence-mismatch` and a failed verdict despite complete, passing evidence. The wrapper fixtures hide this by supplying absolute stock paths at `tests/fixtures/fake-gate-command.mjs:100`.

Smallest fix: resolve relative Playwright stock paths against validated `reporter.config.rootDir`, then normalize them to repository paths. Add a positive classifier contract using root-relative stock paths; feed the bounded proof’s artifacts through the classifier as well.

**I1-F2 — Duplicate results and contradictory identity/file mappings can certify discovery. P1 blocks; blocks: yes.**

At [gate-verdict.mjs:341](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:341), execution IDs are deduplicated before completeness checks. No duplicate-result guard exists. Nor does discovery compare reported files against scheduled files or validate that a reported execution ID retains its scheduled file.

Read-only probes returned **passed**, with discovery **complete**, for both:

- Two passing terminal results with the same execution ID.
- A scheduled ID for `example.test.ts` reporting `unlisted.test.ts`, with matching stock evidence for the unlisted file.

An unlisted result with a *new* ID is correctly rejected; reusing a scheduled ID bypasses that protection. Playwright additionally overwrites repeated terminal callbacks in its map at `tools/gate-playwright-evidence-reporter.mjs:86`.

Smallest fix: validate execution-ID uniqueness before deduplication, validate each result’s ID/file association against discovery, and compare scheduled/reported file sets. Preserve repeated-callback evidence in Playwright so the classifier can reject duplicates. Add negative tests for each case.

**I1-F3 — Initial Vitest argument filtering drops file selections and worker limits. P1 blocks; blocks: yes.**

At [gate-vitest.mjs:64](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:64), initial filtering removes parallelism/worker options even though the initial command supplies no replacements. It also treats bare `--fileParallelism` as consuming a value.

Installed-parser probes demonstrated:

- `--fileParallelism tests/unit/a.test.ts` becomes an empty argument list, expanding a selected run to ordinary discovery.
- `--no-file-parallelism --maxWorkers=1 tests/unit/a.test.ts` loses both scheduling constraints, allowing the root configuration’s eight workers.

This changes initial scope and can increase workers, contrary to the fixed boundaries.

Smallest fix: preserve initial scheduling options; replace only gate-owned reporter/output options there. Use boolean-aware consumption so a positional file cannot be swallowed. Add parsed initial-argv assertions for both examples.

**I1-F4 — Retry parsing changes retained boolean options. P1 blocks; blocks: yes.**

At [gate-vitest.mjs:89](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:89), non-option tokens are discarded unless the preceding option appears in `VALUE_OPTIONS`. Installed Vitest accepts separate boolean values, but this parser does not retain them.

My `parseCLI` probes showed:

- `--isolate false` becomes `isolate:true` on retry.
- `--coverage false` becomes `coverage.enabled:true` on retry.

Thus a retry can run under different isolation or coverage settings. The existing parser test covers a bare boolean and `--changed=false`, not these supported forms. Retaining caller `--configLoader` and appending another at `:140` also produces a duplicate-value parse error.

Smallest fix: implement installed-CLI-compatible boolean/value consumption, preserving token semantics; emit `configLoader` once. Extend parsed-value tests to separate boolean values and caller-selected loaders.

**I1-F5 — Vitest cross-checking depends on project-result order. P1 blocks; blocks: yes.**

At [gate-verdict.mjs:291](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:291), `new Map(stock.files.map(...))` keeps the last stock result for each path. Sidecar aggregation correctly gives failures priority.

For one path failing in project A and passing in project B, my probe produced a fatal `stock-evidence-mismatch` when stock order was failed→passed, but no reporter failure when the same stock results were reversed. A passing retry cannot erase the erroneous initial reporter failure.

Smallest fix: aggregate Vitest stock results by path with failure dominance before comparison. Test both permutations and confirm an exact successful retry can pass.

**I1-F6 — Reporter capture tests do not establish the promised classifier mappings. P2 should fix; blocks: no independently.**

[gate-evidence-reporters.test.ts:199](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:199) tests captured fields but never calls `classifyPhase`. Therefore its global timeout, interruption, intentional skip, pending/queued, and synthesized-nonexecution assertions do not prove their verdict-domain effects.

The synthetic reporter interfaces also accept `unknown` at `:45` and `:54`; they do not verify compatibility against the installed reporter API types. The real launches help validate capture, but do not close these classifier gaps.

Add classifier assertions to the lifecycle cases, including green-retry persistence for fatal states, and type synthetic objects against the relevant installed API boundaries. The focused test count should increase as necessary.

**Plan conformance — files**

References below use these abbreviations: **V** = `tools/gate-verdict.mjs`; **VT** = `tools/gate-vitest.mjs`; **PW** = `tools/gate-playwright.mjs`; **L** = `tools/gate-runner-lib.mjs`; **VR/PR** = the respective evidence reporters; **R/E/C** = `tests/unit/tools/gate-runners.test.ts`, `gate-evidence-reporters.test.ts`, and `gate-verdict.test.ts`.

| Planned file | Implementation evidence | Assessment |
|---|---|---|
| `tools/gate-verdict.mjs` | V:30,143,210,306,427 | Present; defects F1, F2, F5. |
| `tools/gate-vitest-evidence-reporter.mjs` | VR:55,74,79,86,96 | Matches provenance, root config, native capture, atomic timeout rewrite. |
| `tools/gate-playwright-evidence-reporter.mjs` | PR:39,74,86,95,99,104 | Matches normal lifecycle capture; duplicate terminal callbacks overwritten, F2. |
| `tools/gate-runner-lib.mjs` | L:26,48,65,82,94,113 | Matches raw process capture, linked paths, UUID, report v2 printing. |
| `tools/gate-vitest.mjs` | VT:64,79,106,129,155 | Shared verdict and retry ordering match; argument handling defects F3/F4. |
| `tools/gate-playwright.mjs` | PW:46,74,95,116 | Wiring matches; retains existing retry filtering, port environment and serial flags. Affected by F1/F2. |
| `tests/unit/tools/gate-runners.test.ts` | R:161,191,241,332 | All 23 planned instances present; parser coverage incomplete and fake stock paths mask F1. |
| `tests/unit/tools/gate-evidence-reporters.test.ts` | E:78,126,168,199,283 | All 21 instances present; verdict/type-boundary shortcut, F6. |
| `tests/unit/tools/gate-verdict.test.ts` | C:139 | All 15 instances present; missing duplicate/unlisted negative controls and stock-order coverage. |
| `tests/fixtures/fake-gate-command.mjs` | :26,35,41,92,163 | Scenarios/provenance present; absolute Playwright stock paths are a defective approximation, F1. |
| `tests/fixtures/fake-flock.mjs` | :9,14,20 | Matches lock-argv validation and signal propagation. |
| `tests/fixtures/gate-vitest-proof.config.mts` | :3 | Matches exact include, setup and `passWithNoTests:false`. |
| `tests/fixtures/gate-vitest-success.fixture.ts` | :3 | Matches independent passing control. |
| `tests/fixtures/gate-vitest-passes-on-retry.fixture.ts` | :3 | Matches externally selected sentinel behavior. |
| `tests/fixtures/gate-vitest-post-report-global-setup.mjs` | :1 | Matches exit-2 and deferred post-report error modes. |
| `tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts` | :3 | Matches three bounded cases; outside ordinary browser discovery. |
| `…/vitest-reporter.config.mts` | :3 | Matches isolated lifecycle discovery and root empty-run switch. |
| `…/vitest-reporter-duplicate.config.mts` | :5 | Matches same fixture in two named projects. |
| `…/vitest-reporter-d544-timeout.config.mts` | :3 | Matches isolated process-timeout fixture. |
| `…/vitest-reporter-pass.gate-fixture.ts` | :3 | Matches passing lifecycle control. |
| `…/vitest-reporter-fail.gate-fixture.ts` | :3 | Attributable-failure fixture present; not selected by the listed real-lifecycle helper. |
| `…/vitest-reporter-collection.gate-fixture.ts` | :1 | Matches collection failure. |
| `…/vitest-reporter-global.gate-fixture.ts` | :3 | Matches passing assertion followed by unhandled error. |
| `…/vitest-reporter-d544-hanging.gate-fixture.ts` | :4 | Matches deliberately open handle. |
| `…/vitest-reporter-d544-hanging.gate-reporter.mjs` | :3 | Matches deliberately open main-process handle. |

The abbreviated fixture paths in the last nine rows share `tests/fixtures/gate-evidence/`.

**Plan conformance — wrapper matrix**

“Both” means the test is parameterized for Vitest and Playwright.

| Plan scenario | Test evidence | Assessment |
|---|---|---|
| Passing reporter, child exit 2 — both | R:242; V:373 | Matches; process-only failure asserted. |
| Signal after readable report — both | R:253; C:158; V:371 | Matches; exact signal retained. |
| Spawn failure — both | R:262; C:163; L:78 | Matches deterministic `ENOENT` and uncertified discovery. |
| Global failure plus failed file, green retry — both | R:272; V:434 | Matches; initial reporter failure survives. |
| Sidecar present, stock missing — both | R:281; fake command:45,95 | Partial: missing-stock rejection matches, but the initial fake exits 1, whereas the matrix specified exit 0. Shortcut in the control. |
| Two retry files requested, one reported — both | R:290; V:355 | Matches requested-file mismatch. |
| Ordinary failure, exact serial pass — both | R:299; VT:145; PW:105 | Matches fake positive control; real Playwright affected by F1, mixed-project Vitest by F5. |
| Passing evidence followed by exit 1 — both | R:312; C:148 | Matches detectable late failure. |
| Vitest process timeout, green retry | R:333; VR:96; V:192 | Matches fatal `vitest-process-timeout`. |
| Playwright individual timeout, green retry | R:341; V:241 | Mapping matches D544; native stock-path integration remains defective. |
| Vitest stock present, sidecar missing | R:322 | Matches missing-sidecar reason, uncertified discovery, no retry. |
| Playwright stock present, sidecar missing | R:322 | Matches same boundary. |
| Three retained test instances | R:162,192 | Present; clean/fail/retry, lock, order and omission checks retained. |

**Plan conformance — reporter cases**

These tests match **capture** unless qualified below. They do not themselves test classifier outcomes.

| Planned case | Test | Assessment |
|---|---|---|
| Vitest pass | E:200 | Matches synthetic capture plus real lifecycle. |
| Collection failure | E:211 | Matches synthetic and real error capture. |
| Intentional skip | E:219 | Capture matches; classifier acceptance untested here. |
| Pending | E:223 | Capture matches; unfinished verdict untested here. |
| Queued | E:227 | Capture matches; unfinished verdict untested here. |
| Global-only error | E:231 | Synthetic/real capture matches; wrapper separately tests fatal global evidence. |
| Interruption | E:240 | Capture matches; classifier persistence untested here. |
| Process timeout | E:244 | Synthetic/real capture matches; R:333 covers fatal verdict. |
| Duplicate path, two projects | E:253 | Identity capture matches; mixed outcomes/order missing, F5. |
| Root empty-run allowed | E:262 | Synthetic/real root value matches; classifier authorization untested here. |
| Root empty-run disallowed | E:272 | Synthetic/real root value matches; classifier rejection untested here. |
| Playwright expected pass | E:284 | Capture matches; native stock integration missing, F1. |
| Unexpected assertion failure | E:288 | Capture matches. |
| Individual timeout | E:293 | Capture matches; R:341 covers retry policy. |
| Intentional skip | E:298 | Callback/expected-status capture matches. |
| Started without terminal callback | E:303 | Capture matches; classifier effect untested here. |
| Synthesized skipped nonexecution | E:308 | Capture matches; classifier effect untested here. |
| Global timedout | E:313 | Capture matches; fatal classifier effect untested here. |
| Global interrupted | E:317 | Capture matches; fatal classifier effect untested here. |
| Global-only `onError` | E:321 | Capture matches; wrapper separately covers fatal global evidence. |
| Duplicate project with unfinished execution | E:326 | Capture matches; C:242 separately covers missing terminal evidence beside failure. |

The promised seven real Vitest modes are present at E:78. The bounded real Playwright proof is supported by the supervisor’s supplied results; its assertions establish reporter capture, not successful stock/sidecar classification.

**Plan conformance — classifier cases**

| Planned case | Test | Assessment |
|---|---|---|
| Vitest ordinary exit 1 | C:140 | Matches. |
| Playwright ordinary exit 1 | C:144 | Matches synthetic stock shape. |
| Late exit 1 after passing reports | C:148 | Matches. |
| Exit 2 | C:154 | Matches exact reason. |
| Signal | C:158 | Matches explicit signal reason. |
| Spawn error | C:163 | Matches. |
| Malformed JSON | C:177 | Matches artifact-reader boundary. |
| Unreadable evidence | C:185 | Matches `EISDIR` reader boundary. |
| Retry process failure | C:193 | Matches reducer assertion. |
| Retry reporter/global failure | C:200 | Partial: checks reporter reasons but never reduces the phases or asserts final failure. |
| Retry discovery omission | C:214 | Matches. |
| UUID mismatch | C:223 | Matches. |
| Kind mismatch | C:228 | Matches. |
| Phase mismatch | C:235 | Matches. |
| Failed plus independently unfinished duplicate path | C:242 | Matches failure-dominant file outcome plus independent reporter/discovery failure. |

The historical RED-before-production sequence cannot be established from this final snapshot or the supplied GREEN results. No RED-history claim is made here.

**Requested model, provenance, scope and report checks**

- **Process/retry model:** V:369 and V:414 preserve fatal process domains across retries. My read-only probes confirmed exit 2, signal and spawn error remain fatal after a green retry. Exit 1 attributable to ordinary file failures is intentionally retryable; not every nonzero exit is independently fatal. The plan’s accepted post-report exit-1 collision limitation remains.
- **Global failures:** Vitest errors/interruption/process timeout are fatal at V:181; Playwright global errors/timedout/interrupted are fatal at V:258. V:434 retains failures from both phases.
- **Discovery:** Missing results and unexpected IDs fail; duplicate results and ID/file contradictions do not—F2.
- **Retry result:** V:428 retains an initial failed file unless retry proves it passed. My failed-retry probe retained `failedFiles`.
- **Empty runs:** VR:74 reads root resolved `passWithNoTests`. V:196 plus discovery checks allow empty success only with empty evidence and successful remaining domains. Read-only true/false controls behaved correctly. Minor diagnostic divergence: disallowed empty discovery itself remains `complete`, while reporter/process domains fail.
- **Sidecars:** L:85 generates the per-phase UUID; L:48 passes it to the child; both reporters serialize it; V:324 rejects UUID/kind/phase mismatches. Stock JSON is retained at a fresh gate-owned path and cross-checked rather than replaced.
- **Retry argv:** Required option→serial-controls→failed-files→tail ordering is present at VT:139. The specified config/project/tail form parses correctly. Universal option retention cannot be confirmed because of F4. Gate-controlled reporter/output flags are intentionally replaced with the stock/evidence pair.
- **Playwright mappings:** V:227 correctly separates intentional skips from synthesized/unfinished executions; individual timeout is retryable, expected failure is accepted, unexpected outcome fails, and global timeout/interruption remains fatal. These mappings cannot overcome F1’s incorrect stock paths.
- **Fixture isolation:** Root Vitest includes `.test.ts` at `vitest.config.ts:34`; proof fixtures use other suffixes. Ordinary Playwright uses `tests/browser` at `playwright.config.ts:42`, excluding the bounded proof under `tests/fixtures`.
- **Report v2:** L:113 prints each required heading once. V:435 produces `passedOnRetry`, `failedFiles` and `phaseFailures` once under the sole final `verdict`; each runner calls the printer once. Tests assert heading presence, not occurrence counts.
- **Scope:** All changed files fit the planned inventory. No dependency, existing timeout, browser journey, frozen expectation, application source, schema or lock policy changed. F3 violates the no-worker-increase/scope-preservation boundary; F5 introduces order dependence. The sentinel’s cross-process state is intentional and confined to its proof fixture.
- **Decisions:** No additional conflict found with the local D544/D583 text or joint report’s do-not-do list. D622’s text is absent from this pinned checkout; its authorization is supplied by the task and acknowledged by the plan.

**Mutation assessment**

No scratch-copy mutations were executed under the read-only restriction. These are static kill assessments, distinct from the executed unmodified-code probes.

| Requested deletion | Test expected to go red | Assessment |
|---|---|---|
| Remove nonzero process-exit check, V:373 | C:154, C:148; R:242 and R:312 for both runners | Covered. |
| Remove signal check, V:371 | C:158 | Covered by exact reason assertion. Wrapper signal tests alone could survive because null exit still fails. |
| Accept mismatched sidecar UUID | C:223 | Covered by required `evidence-invocation-mismatch`. |
| Drop `onProcessTimeout` handling | E:244 for reporter capture; R:333 for classifier policy | Covered at both boundaries. |
| Let green retry clear initial global failure | R:272 for both runners | Covered by final exit and retained initial reporter reason. |
| Drop duplicate-result check | **None** | There is no such guard to delete; duplicate-result acceptance already reproduces, F2. |
| Drop unlisted-file check | **None directly** | No unexpected-result negative test exists. C:214/R:290 test omissions, not additions. ID/file substitution already bypasses discovery, F2. |

**REJECT IMPL M1**

M1 IMPL REVIEW R1 DONE