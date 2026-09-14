# GATE-INTEGRITY-01: Gate verdict integrity plan

## Round-2 changes

This revision incorporates every finding in
`plan-m1-review-astra-r1.md`:

- **P1-F1 — evidence completion boundary.** The plan no longer claims that
  Vitest's `onTestRunEnd` proves process completion. Installed Vitest 4.1.10
  calls `_testRun.end` at
  `node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13607`, then coverage at
  `:13608`; a later exception reaches the catch that sets exit 1 at
  `:14566-14570`. Global teardown runs still later at `:13937`, after the
  catch from `:14549-14570`, but has no reporter API that can distinguish an
  already-existing assertion exit 1 from a later failure that also sets exit 1.
  Therefore the plan deliberately uses option (b): exit 1 plus attributable
  failed files remains retryable, with that irreducible ambiguity documented
  under Risks. The detectable late-failure case—successful reporter, no failed
  file, then exit 1—is now an explicit RED/GREEN counterexample. The Vitest
  retry also retains the initial non-positional options, including `--config`,
  so both proof phases use the same fixture configuration.
- **P1-F2 — preserve forensic JSON.** The stock Vitest and Playwright JSON
  reporters remain enabled at their current per-phase paths. Small gate-owned
  evidence reporters write separate `.evidence.json` sidecars. Both artifacts
  carry/are joined by the same fresh phase invocation UUID. This preserves
  `assertionResults`, per-file timing, and Playwright per-test duration/error
  evidence used by the supervisor.
- **P1-F3 — executable proof isolation.** Both real-Vitest proof specs use
  non-`.test.ts` names, a dedicated config, and a setup module under
  `tests/fixtures`. The retry retains `--config`. Exact `vitest list
  --filesOnly --json=true` commands prove the root config discovers neither
  fixture and the dedicated config discovers exactly both.
- **P1-F4 — native state mapping.** The plan now maps every relevant Vitest
  module state and Playwright test/full-run state, treats unfinished and
  collection states explicitly, and aggregates duplicate paths
  failure-dominantly across projects. A runner-level failed status caused only
  by attributable file failures does not independently fail the reporter
  domain.
- **P1-F5 — empty-run semantics.** `passWithNoTests` is read from Vitest's
  resolved config and preserved. Dedicated tests cover both allowed and
  disallowed empty runs.
- **P1-F6 — reporter and classifier contracts.** The plan adds direct evidence
  reporter tests driven by the installed runners' real lifecycle callbacks,
  plus pure classifier tests for malformed/unreadable artifacts and failures in
  retry phases. Planned focused coverage is now 3 files / 51 tests. End-to-end
  proof 1 requires readable successful stock and evidence reports, exactly one
  passing fixture outcome, complete discovery, and no reporter/global failure;
  the process domain must be the sole failure.
- **P1-F7 — provenance and crash-before-report.** Every phase receives
  gate-selected, fresh stock/evidence paths and a fresh invocation UUID.
  Missing evidence is never borrowed or inferred: discovery is
  `uncertified`, and a crash before any attributable failure leaves
  `retry:null`.
- **P1-F8 — deterministic spawn error and mutation diagnostics.** The spawn
  error case uses `process.execPath` to start the gate, unsets
  `DND_GATE_FLOCK_MODULE`, and supplies an existing controlled empty directory
  as `PATH`, producing `ENOENT` for `flock` rather than an accidental
  `ENOTDIR`. The three retained cases are made RED by version-2 diagnostic
  assertions, not fixture crashes.
- **P1-F9 — consumers and headings.** The inventory now distinguishes the sole
  executable in-repo reader from supervisor forensic readers, names the three
  replacement headings, and labels the outside-repository script list as
  locally observed but not reviewer-verified.
- **Vitest interruption note.** `TestRun.end` can set exit 1 for an
  interrupted run at `cli-api.BK8pd4xc.js:12601-12607`; 130 is only one
  interruption path. The terminal `reason` is retained and an interrupted
  reason is fatal regardless of numeric exit code.

## Goal & non-goals

Implement M-1/A-F1 by making both gate wrappers fail closed when a phase lacks
sound completion evidence, while retaining the one authorized exact-file
serial retry for ordinary per-file failures.

Every phase has four independent verdict domains:

1. process outcome: raw exit code, signal, and spawn error;
2. reporter/global outcome: stock and gate-evidence readability, runner terminal
   state, unattributed/global errors, and cross-artifact consistency;
3. discovery completeness: the exact execution identities/files the phase was
   asked to run versus those scheduled and given terminal outcomes;
4. per-file test outcomes: passed, skipped, failed, or unfinished evidence,
   retained for both attempts.

The final gate is red if process, reporter/global, or discovery is bad in any
phase. Retry may convert only attributable initial per-file failures. It cannot
erase an initial process failure, global error, reporter failure, discovery gap,
or unfinished state. An initial failure that passes retry is
`passedOnRetry`; no load cause is inferred.

Fixed boundaries and non-goals:

- No lock-path, 7,200-second wait, lock ownership, phase ordering, or report
  directory/final-report naming changes.
- Stock per-phase JSON remains at the existing `reportPath(kind, phase)`
  destination. New evidence is additive at a sibling path.
- No change to which files are retried: only unique files with attributable
  failed outcomes in initial evidence.
- No new phase, runner retry, timeout, worker increase, or D544 timeout change.
- No application/schema/docs/decision edits and no change to frozen
  `src/vtt/intel/contracts.ts`.
- No edits to supervisor-owned `/home/vagrant/dnd-slim-runs` scripts.
- No full gate, full Vitest suite, or full Playwright suite in this unit.

## Current behaviour (with line refs)

- `tools/gate-runner-lib.mjs:34-79` captures start load, duration, exit status,
  signal, spawn error, and stock report read result. At `:65` it destroys the
  distinction between `status:null` and exit 1; nothing later consumes any
  process evidence.
- `tools/gate-runner-lib.mjs:82-85` generates fresh per-phase JSON paths.
  `:102-109` prints only `LOAD FLAKES` and `FAILED`.
- `tools/gate-vitest.mjs:58-63` suppresses reporter failure whenever a failed
  file exists; `:68-93` retries that file list but drops all initial options
  at `:74-84`; `:95` and `:106` decide solely from the final failed list.
- `tools/gate-playwright.mjs:139-143` has the same failed-file exception;
  `:148-173` retries; `:174` and `:185` decide solely from the final list.
- Both final reports are version 1
  (`gate-vitest.mjs:98-103`, `gate-playwright.mjs:177-182`) and mix
  synthetic runner strings with file failures.
- `tests/unit/tools/gate-runners.test.ts:28-69` starts the real gate wrappers
  while substituting the runner and flock boundaries.
  `:72-120` contains 3 test instances: two parameterized retained cases plus
  one Vitest-only retry-omission case. It checks clean/fail/retry flow, exact
  retry selection, serial flags, lock argv, load, and duration, but not the
  four verdict domains.
- `vitest.config.ts:34-35` includes `tests/**/*.test.ts` and has no general
  fixture exclusion. Real proof files therefore must not end in `.test.ts`.

The executable counterexamples are recorded in the read-only main-repository
analyses `astra-r1.md` A-F1 and `astra-r2.md` M-1. Current wrappers return 0
for (a) reporter success plus child exit 2 and (b) initial global error plus a
failed file followed by a passing retry. Ordinary fail-then-pass also exits 0
and is the positive control to preserve.

## Verdict model

Add `tools/gate-verdict.mjs` as the shared pure normalizer/classifier/reducer.
Runner-specific evidence reporters serialize native lifecycle evidence; neither
gate entry point owns an alternate verdict algorithm.

### Artifact provenance and evidence boundary

`phaseArtifactPaths(kind, phase)` replaces only the internals of per-phase path
allocation. One fresh `randomUUID()` is selected for each phase:

- stock JSON (same existing destination pattern):
  `<report-dir>/<kind>-<phase>-<pid>-<uuid>.json`;
- gate evidence:
  `<report-dir>/<kind>-<phase>-<pid>-<uuid>.evidence.json`.

The evidence document contains `version:1`, `kind`, `phase`, and
`phaseInvocationId:<uuid>`. The phase record independently retains the same
UUID and both absolute paths. The classifier rejects a kind/phase/UUID mismatch.
Paths are fresh gate-selected values, never caller-selected reusable evidence.

The stock artifact remains the `reporterPath`/`reporter` field used today:

- Vitest receives repeated reporters, supported because reporter CLI option is
  an array at
  `node_modules/vitest/dist/chunks/cac.DdICfEr1.js:702-707`:
  `--reporter=json --reporter=<absolute gate reporter>`, with
  `--outputFile.json=<stock path>`; the evidence path and UUID are supplied
  through gate-owned environment variables.
- Playwright receives
  `--reporter=json,<absolute gate reporter>`, whose comma parsing is at
  `node_modules/playwright/lib/cli/testActions.js:164-167`.
  `PLAYWRIGHT_JSON_OUTPUT_FILE` remains the stock destination; separate
  gate-owned environment variables carry evidence path and UUID.

The evidence completion boundary is:

- For Playwright, write/finalize evidence in `onExit`. Installed runner code
  calls `onEnd` then `onExit` at
  `node_modules/playwright/lib/runner/index.js:5843-5850`; config-load failure
  also reaches this reporting path at `:6465-6473`.
- For Vitest, capture terminal evidence in `onTestRunEnd`, but do **not** call
  it proof of process completion. It runs before coverage
  (`cli-api.BK8pd4xc.js:13605-13609`). Global teardown at `:13937` runs
  after the outer catch, but there is no later reporter callback and teardown
  sees only the already-collapsed numeric exit code. Consequently the
  authoritative process completion boundary for both runners is the parent
  gate's `spawnSync` result. The residual collision between ordinary Vitest
  exit 1 and a later additional exit-1 failure is explicit under Risks.

A crash before either artifact produces `readStatus:"missing"`, reporter
failure, and `discovery.status:"uncertified"`. With no attributable initial
failed file, retry is `null`.

### Version-2 phase and final report

Each non-null phase retains `phase`, `startedAt`, three-value
`loadAverage`, `durationMs`, command/lock argv, and the unchanged stock
`reporterPath`/`reporter`. It adds:

```text
phaseInvocationId
evidencePath
evidence
stockRead:    { status: readable|missing|unreadable|malformed, error }
evidenceRead: { status: readable|missing|unreadable|malformed, error }

process:
  status: passed|ordinary-file-failure|failed
  exitCode: number|null
  signal: string|null
  spawnError: { code: string|null, message: string }|null
  reasons: string[]

reporterOutcome:
  status: passed|failed
  runStatus: string|null
  success: boolean|null
  globalErrors: normalized error[]
  reasons: string[]

discovery:
  status: complete|failed|uncertified
  requestedExecutionIds: string[]
  scheduledExecutionIds: string[]
  reportedExecutionIds: string[]
  requestedFiles: string[]
  reportedFiles: string[]
  missingExecutionIds: string[]
  unexpectedExecutionIds: string[]

fileOutcomes:
  [{ file, status: passed|failed|skipped|unfinished,
     executionIds: string[], reasons: string[] }]
```

All arrays are normalized, deduplicated, and sorted. Execution identities remain
project-aware until aggregation:

- Vitest identity: `project.hash + specification.taskId + normalized moduleId`
  (the installed types expose these at
  `reporters.d.DtoKVV2s.d.ts:80-96,1938-1993`);
- Playwright identity: project name plus `TestCase.id` plus normalized
  `TestCase.location.file`.

Initial `requestedExecutionIds` comes from the real lifecycle's scheduled set.
On retry, the gate-owned `initialFailedFiles` set is additionally authoritative:
the scheduled/reported file sets must equal it, and every scheduled execution
identity must have a terminal outcome. This detects a retry that reports fewer
files than requested, even if its own schedule and result arrays shrink
together. Unexpected executions also fail discovery.

The version-2 top-level verdict is:

```text
verdict:
  status: passed|failed
  passedOnRetry: string[]
  failedFiles: string[]
  phaseFailures:
    [{ phase: initial|retry,
       domain: process|reporter|discovery,
       reasons: string[] }]
```

`passedOnRetry` is the intersection of attributable initial failed files and
retry-passed files. `failedFiles` is the initial failed set minus files proven
passed on retry. Both remain factual even if another domain makes the gate red.
Final status is passed only when `failedFiles` and `phaseFailures` are empty.

The printed verdict uses exactly these headings:

- `PASSED ON RETRY (cause not inferred)`
- `FAILED FILES`
- `PHASE FAILURES`

Each phase continues to record load average at phase start; no field or heading
asserts load causation. The shape change requires final report `version:2`.

## Native state mappings and per-runner exit-code rules with sources

### Vitest 4.1.10

Installed source establishes:

- `TestRun.end` maps cancelling to `interrupted`, otherwise failed/passed,
  sets exit 1 for every non-passed reason, and then invokes
  `onTestRunEnd`:
  `cli-api.BK8pd4xc.js:12601-12607`.
- Empty-run failure observes resolved `passWithNoTests` at `:12620-12622`;
  an empty run still starts/ends the test run at `:13461-13470`.
- `module.ok()` can return true for absent/unfinished and skipped state at
  `:11554-11560`; therefore it is not a terminal-state classifier.
- Native module state is queued or suite-derived at `:11862-11867`, and maps
  to `skipped | pending | failed | passed` at `:11909-11916`.
- Collection/module errors are separately exposed by `module.errors()` at
  `:11760-11774`.
- The stock JSON computes success as at least one file or
  `passWithNoTests`, with zero failed suites/tests, at
  `index.UpGiHP7g.js:3538-3554`; it retains assertions/timing at
  `:3554-3595` but not the `onTestRunEnd` global errors.
- Keyboard cancellation may set 130 at
  `cli-api.BK8pd4xc.js:14412-14420`, but `TestRun.end` proves interruption
  may instead retain exit 1.

Native-to-file mapping is exhaustive and failure-dominant:

| Native evidence | Normalized file outcome / domain effect |
|---|---|
| module state `passed`, no module/collection errors | `passed` |
| module state `skipped`, no errors | `skipped`, intentional terminal evidence accepted |
| module state `failed` or any failed test/collection/module error attributable to the module | `failed`, retryable file evidence; errors retained |
| module state `queued` or `pending` at terminal callback | `unfinished`; reporter failure, never retry-converted |
| scheduled specification absent from terminal modules | discovery failure/unfinished |
| same normalized path in multiple projects | aggregate `failed > unfinished > passed > skipped`; retain all execution IDs |

`reason:"failed"` and stock `success:false` do not independently fail the
reporter domain when their only cause is these attributable failed files.
Nonempty global errors, `reason:"interrupted"`, unfinished modules,
stock/evidence disagreement, or an invalid terminal reason do.

`passWithNoTests` is serialized from the reporter's resolved project config.
Zero scheduled/reported files is valid only when all participating resolved
configs allow it, terminal reason is `passed`, stock `success:true`, and the
process exits 0. With `passWithNoTests:false`, the same empty run is a
reporter/discovery failure and cannot trigger retry.

Process rule:

- exit 0, null signal, null spawn error: process passed;
- exit 1 plus at least one attributable failed file: process
  `ordinary-file-failure`, hence eligible for serial retry;
- exit 1 with no attributable failed file: process failed;
- terminal reason `interrupted` is fatal with exit 1, 130, or any other code;
- every other nonzero code, signal, spawn error, or null exit status is fatal.

An exit 1 with failed files remains retryable only if reporter/global and
discovery domains are otherwise good. Those domains remain red across retry.
There is no claim that exit 130 is guaranteed.

### Playwright 1.61.1

Installed source establishes:

- `FullResult.status` is
  `passed | failed | timedout | interrupted` at
  `node_modules/playwright/types/testReporter.d.ts:21-32`.
- `onBegin` has the fully discovered suite, `onError` receives global
  errors, and `onEnd` receives FullResult at `:147-175`.
- Each result status is
  `passed | failed | timedOut | skipped | interrupted` at `:657-695`;
  test outcome is `skipped | expected | unexpected | flaky` at `:422-441`.
- CLI exit mapping is passed→0, interrupted→130, otherwise→1 at
  `node_modules/playwright/lib/cli/testActions.js:95-98`.
- Stock JSON retains global errors/stats at
  `node_modules/playwright/lib/runner/index.js:3890-3929` and per-test
  duration/errors at `:4000-4045`, but omits FullResult status.

Native-to-file mapping is exhaustive and failure-dominant:

| Native evidence | Normalized file outcome / domain effect |
|---|---|
| expected pass: raw `passed`, outcome `expected` | `passed` |
| unexpected assertion failure: raw `failed`, outcome `unexpected` | `failed`, attributable and retryable |
| timeout: raw `timedOut` | `failed` file evidence plus reporter failure; never cleared by retry |
| expected failure: raw `failed`, outcome `expected` | `passed` for gate purposes, while raw evidence is retained |
| unexpected pass of an expected-fail test: outcome `unexpected` | `failed` |
| raw `skipped`, outcome `skipped` | `skipped`, accepted terminal evidence |
| outcome `flaky` | `passed` after Playwright's own result history; retained explicitly even though gate forces `--retries=0` |
| raw `interrupted` or test with no terminal result | `unfinished`; reporter failure |
| discovered test absent from terminal evidence | discovery failure/unfinished |
| same normalized path in multiple projects | aggregate `failed > unfinished > passed > skipped`; retain all project/test IDs |

`FullResult.status:"failed"` does not independently fail the reporter domain
when solely explained by attributable per-file failures. `timedout`,
`interrupted`, any `onError`, unfinished result, or unexplained stock/evidence
disagreement is fatal.

Process rule mirrors the documented CLI set:

- exit 0 with no signal/spawn error is passed;
- exit 1 plus attributable ordinary failed files is
  `ordinary-file-failure`;
- exit 1 without attributable failed files is fatal;
- exit 130, any other nonzero code, signal, spawn error, or null status is fatal.

A timeout may use exit 1 but remains fatal through FullResult status. Global
errors remain fatal even when the same phase has retryable failed files.

## Consumers of the renamed field

Executable in-repository readers:

- `tests/unit/tools/gate-runners.test.ts:10-18,67,76-117` is the sole code that
  parses/asserts the final gate report; update its type and assertions to v2.
- The two gate entry points and `printVerdict` are producers/printers, not
  downstream report readers.

Active in-repository producer/printer matches to rename:

- `tools/gate-vitest.mjs:4,9,66,89,102,105`;
- `tools/gate-playwright.mjs:4,146,168,181,184`;
- `tools/gate-runner-lib.mjs:102-105`;
- `tests/unit/tools/gate-runners.test.ts:16,72-84,99,113-116`.

Forensic readers: the supervisor reads the retained stock JSON
`assertionResults`, per-file starts/ends, and Playwright per-test
durations/errors after every gate. This is why stock JSON and its existing path
remain intact and v2 links stock plus gate-owned evidence.

Read-only local inspection found these live outside-repository scripts:

- `/home/vagrant/dnd-slim-runs/browser-main-queued.sh:6`;
- `/home/vagrant/dnd-slim-runs/gate-wt4.sh:8`.

They grep `LOAD FLAKES` and are supervisor-owned. The outside list is locally
observed but **not verified by the reviewer** and may be incomplete; the
supervisor must grep all of `~/dnd-slim-runs` and update active scripts to the
three new headings `PASSED ON RETRY (cause not inferred)`, `FAILED FILES`,
and `PHASE FAILURES`. Historical brief/artifact matches are evidence, not
executables, and remain untouched.

Implementation-round repo checks:

```bash
rg -n --glob '!node_modules/**' 'loadFlakes|LOAD FLAKES' tools tests scripts package.json
rg -ni --glob '!node_modules/**' 'load.?flake|load-tolerant|load tolerant' tools/gate-*.mjs tests/unit/tools/gate-runners.test.ts
```

Both must return zero active matches.

## Test matrix

First extend only the test harness/fake fixtures and run the focused tests
against unchanged production. Then implement. The seven required rows remain
the core matrix and run for both `vitest` and `playwright`:

| Fixture/scenario | Expected v2 verdict | Why RED against today's runner |
|---|---|---|
| reporter success + child exit 2 | Gate exit 1; initial process failure names exit 2; reporter/discovery green; `retry:null` | Current verdict ignores exit code and exits 0. |
| signal-killed child after readable report | Gate exit 1; raw null exit and exact signal; process failure; no retry | Current verdict ignores signal and exits 0. |
| spawn error before report | Gate exit 1; structured `ENOENT` spawn failure, missing artifacts, discovery uncertified, `retry:null` | Current report has no process domain or structured spawn diagnostic. |
| initial global error + failed file; passing retry | Gate exit 1; initial reporter failure survives; file is factually `passedOnRetry`; both loads/evidence retained | Current failed-file branch drops the global error and exits 0 after retry. |
| missing reporter/evidence after child exit 0 | Gate exit 1; missing read statuses, reporter failure, discovery uncertified, no retry | Current output collapses this to a synthetic string and cannot prove discovery. |
| retry requested for two failed files but reports one pass | Gate exit 1; omitted identity/file named by retry discovery; reported pass may appear in `passedOnRetry` | Current code lacks exact requested/scheduled/reported evidence. |
| ordinary failed test exit 1; exact serial retry exit 0 | Gate exit 0; no phase failures; exact file in `passedOnRetry`; both phases complete | Current high-level exit is green, but v2 domains and renamed factual diagnostics do not exist. |

Add an eighth counterexample outside the retained seven-row matrix, for both
runners: readable stock/evidence success, exactly one passing file, complete
discovery, no global error, then child exit 1. Expected: process-only failure,
gate exit 1, and `retry:null`. This is the detectable form of a post-report
failure.

The existing 3 test instances are retained and updated. Seven rows × 2 runners
adds 14, and the late-failure counterexample × 2 adds 2: planned
`gate-runners.test.ts` total is **1 file / 19 tests**.

Harness details:

- Fake evidence includes both requested initial files, project-aware execution
  IDs, terminal outcomes, UUID/kind/phase, and matching stock data.
- Signal propagation is implemented in `fake-flock.mjs` without changing
  normal lock argv behavior.
- Spawn error setup starts the gate with `process.execPath`, deletes only
  `DND_GATE_FLOCK_MODULE` from a copied environment, creates an existing empty
  directory, and sets `PATH` to that directory. Since `flock` is a bare
  executable and the search directory exists but contains no `flock`,
  `spawnSync` yields `ENOENT`. An invalid PATH component could instead yield
  `ENOTDIR`, so the test asserts `ENOENT`.
- The three retained cases fail in the RED run because their assertions require
  v2 phase diagnostics/renamed headings. Their fake commands must still
  complete normally; a fixture crash is a test failure.
- Assert structured JSON, exact reasons/arrays, lock and runner argv, phase
  order, and status. Console substring checks are supplementary only.

### Evidence reporter and classifier coverage

Add `tests/unit/tools/gate-evidence-reporters.test.ts` with **20 tests**. It
launches the installed runners against purpose-built non-default fixture
configs/reporters so the reporter receives real Vitest `TestModule` and
Playwright `Suite/TestCase/TestResult/FullResult` lifecycle objects; it then
reads the sidecar directly. No hand-authored object is accepted as the sole
proof for lifecycle mappings.

- Vitest (10): passing module; collection failure; skipped; pending/unfinished;
  queued/unfinished interruption capture; global-only error; terminal
  interruption reason; duplicate normalized path in two projects with
  failure-dominant aggregation; allowed empty run; disallowed empty run.
- Playwright (10): expected pass; unexpected assertion failure; timed out;
  skipped; interrupted; discovered test with no result; full-run timedout;
  full-run interrupted; global-only `onError`; duplicate path in two projects
  with failure-dominant aggregation.

Where an installed runner cannot naturally emit a queued/pending/no-result state
without terminating the process, a tiny lifecycle capture reporter serializes
the actual object immediately before controlled interruption; the gate reporter
is still invoked with that actual object, and the subprocess exit is asserted.
The direct sidecar assertion—not the subprocess's exit alone—is the contract.

Add `tests/unit/tools/gate-verdict.test.ts` with **12 pure classifier tests**:
Vitest ordinary exit 1; Playwright ordinary exit 1; late exit 1 with successful
reports; exit 2; signal; spawn error; missing evidence; malformed JSON;
unreadable evidence (an existing directory, producing `EISDIR`); retry process
failure; retry reporter/global failure; retry discovery mismatch. These tests
also prove failures in any retry domain cannot be erased.

Planned focused GREEN total: **3 files / 51 tests** (19 + 20 + 12).

### RED/GREEN mutation control

1. Change only `gate-runners.test.ts`, `fake-gate-command.mjs`, and
   `fake-flock.mjs`; do not add or edit production classifier/reporters.
2. Run the focused command. Require collection of 1 file / 19 tests and all 16
   newly added cross-runner integrity assertions RED for missing v2 diagnostics
   or the known wrong exit, while fixtures themselves complete as designed.
   Record actual totals if they differ.
3. Implement production and add direct reporter/classifier tests.
4. Run the 3-file command and require 51/51 GREEN.

This is a mutation control without changing production or generating expected
values from current output.

## Implementation steps in order

1. **Prepare RED harness.** Extend only the existing fake scenarios and v2
   assertions. Ensure fake initial evidence contains both requested files and
   fake stock/evidence share the gate-provided invocation UUID. Capture the
   required 1-file/19-test RED run.
2. **Allocate linked artifacts without changing stock paths.** Refactor
   `reportPath` into/alongside `phaseArtifactPaths` so its stock path remains
   byte-for-byte the existing naming form and add the sibling evidence path.
   Preserve raw `spawnSync.status` as nullable. Classify read failures as
   missing (`ENOENT`), malformed (JSON parse), or unreadable (other filesystem
   errors).
3. **Implement `tools/gate-vitest-evidence-reporter.mjs`.** Record invocation
   metadata, resolved `passWithNoTests`, scheduled specifications, native
   terminal module states/errors, global errors, and terminal reason. Do not
   replace or truncate stock JSON.
4. **Implement `tools/gate-playwright-evidence-reporter.mjs`.** Record the
   fully discovered suite, execution/project identities, all per-test result
   statuses/outcomes, global `onError` evidence, FullResult status, and an
   `onExit` completion field. Do not replace stock JSON.
5. **Add direct reporter contracts.** Add the 20 real-lifecycle tests and their
   isolated fixtures/configs. Prove collection/global/interruption/unfinished/
   duplicate-project and empty-run semantics before wiring the verdict.
6. **Implement `tools/gate-verdict.mjs`.** Validate both artifact schemas and
   provenance, cross-check stock/evidence, apply exhaustive native mappings,
   compute all four domains, and reduce phases without letting retry clear a
   non-file domain.
7. **Add the 12 classifier contracts.** Cover every read/process/retry
   boundary, including malformed versus unreadable, and require stable v2
   reason codes rather than incidental error prose.
8. **Wire Vitest while retaining options.** Initial uses stock plus evidence
   reporters. Build retry argv from the initial CLI tokens with a tested
   option-arity parser based on installed Vitest CLI declarations: retain all
   non-positional options and their order (`--config`/`-c`, project, test
   name, environment, pool, coverage, `passWithNoTests`, shard, changed, and
   the `--` tail); remove initial positional file filters and gate-controlled
   reporter/output/parallelism/worker flags; append
   `--no-file-parallelism --maxWorkers=1` and exactly the failed files.
   Test long, short, `--name=value`, array, boolean, and `--` forms. If a
   retained selector such as shard causes an omitted retry execution, discovery
   fails closed. Retention is required because config/environment/project
   options define how the selected file is collected and interpreted.
9. **Wire Playwright.** Preserve its current retry option filtering,
   `--retries=0`, `--workers=1`, port behavior, and exact failed-file set.
   Add the stock/evidence reporter pair and shared verdict only.
10. **Emit/report v2.** Update the sole executable reader, factual headings,
    report version, and phase diagnostics. Keep both attempts and both load
    averages. Search active consumers and hand external paths to the supervisor.
11. **Add isolated real-Vitest proof fixtures.** Exact files:
    - `tests/fixtures/gate-vitest-proof.config.mts`;
    - `tests/fixtures/gate-vitest-success.fixture.ts`;
    - `tests/fixtures/gate-vitest-passes-on-retry.fixture.ts`;
    - `tests/fixtures/gate-vitest-post-report-global-setup.mjs`.

    The dedicated config includes only
    `tests/fixtures/gate-vitest-*.fixture.ts`, sets
    `passWithNoTests:false`, and uses the dedicated setup. The setup teardown
    uses a gate-proof-only environment mode: set exit 2, or schedule a
    post-report uncaught error that results in exit 1. The retry fixture uses a
    unique sentinel path: initial fails and creates it; retry passes. No proof
    file has a default `.test.ts` suffix.
12. **Run the verification contract.** Inspect artifacts with explicit Node
    assertions; do not accept console text or exit code alone.

Expected production/test files for implementation are:

- `tools/gate-verdict.mjs` (new);
- `tools/gate-vitest-evidence-reporter.mjs` (new);
- `tools/gate-playwright-evidence-reporter.mjs` (new);
- `tools/gate-runner-lib.mjs`;
- `tools/gate-vitest.mjs`;
- `tools/gate-playwright.mjs`;
- `tests/unit/tools/gate-runners.test.ts`;
- `tests/unit/tools/gate-evidence-reporters.test.ts` (new);
- `tests/unit/tools/gate-verdict.test.ts` (new);
- `tests/fixtures/fake-gate-command.mjs`;
- `tests/fixtures/fake-flock.mjs`;
- the four exact proof fixtures listed above;
- isolated real-lifecycle reporter fixture/config files under
  `tests/fixtures/gate-evidence/`, each with a non-default discovery suffix.

No lock script, phase, stock/final report path, retry selection, timeout,
schema, docs, or application source is changed.

## Verification contract

Run from
`/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity`. Never add an outer
`flock`.

### Fixture isolation before RED/GREEN

```bash
M1_LIST_TMP="$(mktemp -d /tmp/dnd-gate-m1-list.XXXXXX)"
M1_ROOT_LIST="$(TMPDIR="$M1_LIST_TMP" npx vitest list --configLoader runner --filesOnly --json=true tests/fixtures/gate-vitest-success.fixture.ts tests/fixtures/gate-vitest-passes-on-retry.fixture.ts)"
test "$M1_ROOT_LIST" = '[]'
M1_PROOF_LIST="$(TMPDIR="$M1_LIST_TMP" npx vitest list --configLoader runner --config tests/fixtures/gate-vitest-proof.config.mts --filesOnly --json=true tests/fixtures/gate-vitest-success.fixture.ts tests/fixtures/gate-vitest-passes-on-retry.fixture.ts)"
node -e 'const a=JSON.parse(process.argv[1]); const wanted=["tests/fixtures/gate-vitest-passes-on-retry.fixture.ts","tests/fixtures/gate-vitest-success.fixture.ts"]; if (JSON.stringify(a.sort())!==JSON.stringify(wanted)) process.exit(1)' "$M1_PROOF_LIST"
```

Required numbers: root config lists 0 proof files; dedicated config lists
exactly 2. Installed `vitest list --filesOnly` obtains relevant
specifications without running tests at
`cac.DdICfEr1.js:2359-2381`, and JSON file output is implemented at
`cli-api.BK8pd4xc.js:14608-14631`.

### Focused RED before production

```bash
npx vitest run --configLoader runner tests/unit/tools/gate-runners.test.ts
```

Required planned result: exit 1, 1 file / 19 tests collected, with all 16 new
integrity assertions RED for the intended v2 diagnostic/verdict mismatch.
Record exact actual numbers.

### Static and focused GREEN

```bash
npx tsc -b --force
sg scan
node --check tools/gate-runner-lib.mjs
node --check tools/gate-verdict.mjs
node --check tools/gate-vitest-evidence-reporter.mjs
node --check tools/gate-playwright-evidence-reporter.mjs
node --check tools/gate-vitest.mjs
node --check tools/gate-playwright.mjs
npx vitest run --configLoader runner tests/unit/tools/gate-runners.test.ts tests/unit/tools/gate-evidence-reporters.test.ts tests/unit/tools/gate-verdict.test.ts
```

`npx tsc -b --force` is mandatory because TypeScript tests are touched.
Required planned result: every command exits 0; focused Vitest reports 3 files /
51 tests passed. Run the two consumer greps from the prior section and require
zero active causal-label matches.

### Real proof 1: successful evidence, sole process failure exit 2

```bash
M1_EXIT2_DIR="$(mktemp -d /tmp/dnd-gate-m1-exit2.XXXXXX)"
DND_GATE_REPORT_DIR="$M1_EXIT2_DIR/reports" DND_GATE_PROOF_MODE=exit2 node tools/gate-vitest.mjs --config tests/fixtures/gate-vitest-proof.config.mts tests/fixtures/gate-vitest-success.fixture.ts
M1_EXIT2_STATUS=$?
test "$M1_EXIT2_STATUS" -eq 1
M1_EXIT2_REPORT="$(find "$M1_EXIT2_DIR/reports" -maxdepth 1 -name 'vitest-gate-*.json' -print -quit)"
node -e 'const fs=require("node:fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=r.phases.initial;if(r.version!==2||r.verdict.status!=="failed"||p.process.exitCode!==2||p.process.status!=="failed"||p.reporterOutcome.status!=="passed"||p.discovery.status!=="complete"||p.stockRead.status!=="readable"||p.evidenceRead.status!=="readable"||p.reporter.success!==true||p.fileOutcomes.length!==1||p.fileOutcomes[0].status!=="passed"||r.verdict.phaseFailures.length!==1||r.verdict.phaseFailures[0].domain!=="process"||r.phases.retry!==null)process.exit(1)' "$M1_EXIT2_REPORT"
```

Required exact result: the real runner reports exactly 1 passing fixture,
stock and evidence are readable and successful, discovery is complete, there is
no global/reporter failure, raw child exit is 2, the **only** phase failure is
process, retry is null, and the gate exits 1.

### Real proof 2: detectable post-report exit 1

```bash
M1_LATE_DIR="$(mktemp -d /tmp/dnd-gate-m1-late.XXXXXX)"
DND_GATE_REPORT_DIR="$M1_LATE_DIR/reports" DND_GATE_PROOF_MODE=late-exit1 node tools/gate-vitest.mjs --config tests/fixtures/gate-vitest-proof.config.mts tests/fixtures/gate-vitest-success.fixture.ts
M1_LATE_STATUS=$?
test "$M1_LATE_STATUS" -eq 1
M1_LATE_REPORT="$(find "$M1_LATE_DIR/reports" -maxdepth 1 -name 'vitest-gate-*.json' -print -quit)"
node -e 'const fs=require("node:fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=r.phases.initial;if(r.verdict.status!=="failed"||p.process.exitCode!==1||p.reporterOutcome.status!=="passed"||p.discovery.status!=="complete"||p.fileOutcomes.length!==1||p.fileOutcomes[0].status!=="passed"||r.verdict.phaseFailures.some(x=>x.domain!=="process")||r.phases.retry!==null)process.exit(1)' "$M1_LATE_REPORT"
```

Required exact result: readable successful reporter evidence and one passed file
cannot authorize retry or green when the child subsequently exits 1.

### Real proof 3: ordinary failure passes exact retry

```bash
M1_RETRY_DIR="$(mktemp -d /tmp/dnd-gate-m1-retry.XXXXXX)"
DND_GATE_REPORT_DIR="$M1_RETRY_DIR/reports" DND_GATE_RETRY_SENTINEL="$M1_RETRY_DIR/passed-on-retry.sentinel" node tools/gate-vitest.mjs --config tests/fixtures/gate-vitest-proof.config.mts tests/fixtures/gate-vitest-passes-on-retry.fixture.ts
M1_RETRY_STATUS=$?
test "$M1_RETRY_STATUS" -eq 0
M1_RETRY_REPORT="$(find "$M1_RETRY_DIR/reports" -maxdepth 1 -name 'vitest-gate-*.json' -print -quit)"
node -e 'const fs=require("node:fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const f="tests/fixtures/gate-vitest-passes-on-retry.fixture.ts";const i=r.phases.initial,q=r.phases.retry;if(r.version!==2||r.verdict.status!=="passed"||JSON.stringify(r.verdict.passedOnRetry)!==JSON.stringify([f])||r.verdict.failedFiles.length||r.verdict.phaseFailures.length||i.process.exitCode!==1||i.process.status!=="ordinary-file-failure"||q.process.exitCode!==0||i.discovery.status!=="complete"||q.discovery.status!=="complete"||i.loadAverage.length!==3||q.loadAverage.length!==3||!q.command.arguments.includes("--config")||!q.command.arguments.includes("tests/fixtures/gate-vitest-proof.config.mts"))process.exit(1)' "$M1_RETRY_REPORT"
```

Required exact result: initial ordinary file failure exits 1, retry uses the
same config and exact file serially, retry exits 0, both discoveries are
complete, both load arrays have 3 values, gate exits 0, and
`passedOnRetry` contains exactly the fixture.

Do not run `npm run test:gate`, the full Vitest suite, or any Playwright suite
in this lane.

## Assumptions & local verification status

| Assumption | Status/evidence |
|---|---|
| Worktree/branch/pin are the owner-specified `dnd-wt-gate-integrity`, `claude/gate-integrity`, `d251e716...`. | Verified locally in round 1 with `pwd`, `git branch --show-current`, and `git rev-parse HEAD`. |
| D622 authorizes this unit as wave 1. | Explicit in the owner task. The pinned worktree decisions ended before D622 when checked in round 1, so the decision text itself remains locally unverifiable. |
| Frozen intel contract is unchanged. | Verified in round 1 with `sha256sum src/vtt/intel/contracts.ts`: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. Recheck at implementation handoff. |
| Reviewer file was read in full before revision. | Verified this round with `sed -n '1,260p'` and `sed -n '261,520p'` on the read-only main-repo review. |
| Current gate stores process state but ignores it. | Verified at `gate-runner-lib.mjs:65-78` and final reducers cited above. |
| Existing unit isolation and count are 3 instances. | Verified by reading `gate-runners.test.ts:1-120`; no test count is inferred from a run this round. |
| Root Vitest discovery would include `.test.ts` fixtures. | Verified at `vitest.config.ts:34-35`; hence proof suffix `.fixture.ts`. |
| Vitest stock `success` includes the nonempty-or-`passWithNoTests` condition. | Verified at installed `index.UpGiHP7g.js:3552`; stock assertions/timing at `:3554-3595`. |
| Vitest reporter order cannot certify all post-report work. | Verified: `_testRun.end` precedes `reportCoverage` at `cli-api.BK8pd4xc.js:13605-13609`; the catch sets exit 1 at `:14566-14570`. No `onExit` appears in reporter type `reporters.d.DtoKVV2s.d.ts:1041-1068`. |
| Vitest global teardown is not a sufficient completion marker. | Verified ordering at `cli-api.BK8pd4xc.js:13931-13959,14549-14577`. It runs late but has no trustworthy channel to distinguish assertion exit 1 from an additional later exit-1 failure. |
| Vitest terminal interruption can be exit 1, not only 130. | Verified at `cli-api.BK8pd4xc.js:12601-12607`; keyboard 130 path is only `:14412-14420`. |
| Vitest native unfinished/error states need explicit handling. | Verified at `cli-api.BK8pd4xc.js:11554-11560,11760-11774,11862-11867,11909-11916`. |
| Repeated Vitest reporters and comma-separated Playwright reporters are supported. | Verified at installed `cac.DdICfEr1.js:702-707` and `playwright/lib/cli/testActions.js:164-167`. |
| Vitest retry options can be parsed without guessing option arity. | Verified with installed `parseCLI` in a read-only `node --input-type=module -e` probe: positional filters and `options.config` are distinct. Exact parser edge cases remain to be proven by implementation tests. |
| Playwright exposes all required native/global states and calls `onExit` after `onEnd`. | Verified at `testReporter.d.ts:21-32,147-175,422-441,657-695` and runner `index.js:5843-5850`. |
| No executable in-repo consumer besides `gate-runners.test.ts` reads final JSON. | Verified by focused `rg` in round 1. Supervisor forensic consumption is explicit in the task/review. |
| The two named external scripts are the active outside consumers. | Locally observed read-only in round 1; reviewer did not verify this inventory, and only the supervisor can establish completeness. |
| Controlled empty PATH gives `ENOENT` for missing `flock`. | Consistent with Node spawn semantics; implementation test must verify exact `spawnError.code === "ENOENT"`. Marked unverified until RED run. |
| Actual runner fixtures can deterministically expose every planned lifecycle edge. | Basic hooks/states are source-verified; controlled interruption/no-result mechanics are not yet executed. If a state cannot be emitted deterministically, stop and revise the fixture design—do not replace the real-lifecycle requirement with a weaker mock. |
| Planned totals are 19 + 20 + 12 = 51. | Arithmetic verified; actual collection totals must be recorded in RED/GREEN runs. |

Read-only commands used for Round-2 source verification included:

```bash
sed -n '1,520p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/plan-m1-review-astra-r1.md
nl -ba node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js | sed -n '11545,11925p;12590,12630p;13450,13620p;13920,13970p;14400,14585p'
nl -ba node_modules/vitest/dist/chunks/index.UpGiHP7g.js | sed -n '3538,3615p'
nl -ba node_modules/vitest/dist/chunks/cac.DdICfEr1.js | sed -n '690,715p;2350,2390p'
nl -ba node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts | sed -n '80,100p;295,355p;1040,1070p;1930,2000p'
nl -ba node_modules/playwright/types/testReporter.d.ts | sed -n '20,35p;145,180p;420,445p;650,700p'
nl -ba node_modules/playwright/lib/cli/testActions.js | sed -n '90,102p;155,172p'
nl -ba node_modules/playwright/lib/runner/index.js | sed -n '3890,4050p;5835,5860p;6455,6480p'
node --input-type=module -e 'import { parseCLI } from "vitest/node"; console.log(parseCLI(["vitest","run","--config","tests/fixtures/example.config.mts","tests/fixtures/example.fixture.ts"]))'
```

No npm, Vitest, gate, Playwright, or model command was run while revising this
plan.

## Risks and how each is tested

- **Residual Vitest exit-1 ambiguity after reporter completion.** A failed test
  sets exit 1, and an additional post-report failure may also set exit 1; no
  installed post-process reporter hook distinguishes them. This is explicitly
  accepted under review option (b), limited to phases with attributable failed
  files and otherwise perfect evidence. The late-success/no-failed-file proof
  tests the detectable case. Coverage is not enabled in current gate/config;
  if future post-report work needs complete attribution, it must add an
  independent process-completion protocol rather than silently widening exit 1.
- **Rejecting a valid ordinary retry.** Both runner matrix positive controls
  and the real sentinel proof require exit 1 + attributable file failure to
  retry and finish green.
- **Retry uses different configuration and falsely omits/passes files.** Retry
  option parsing tests cover short/long/equal/value/array/boolean/`--` forms;
  real proof 3 asserts the same `--config` and complete discovery in both
  phases.
- **Global error is erased by a passing retry.** The cross-runner global-plus-
  file row requires the file in `passedOnRetry` while final reporter failure
  remains red.
- **Partial retry is accepted.** The two-files/one-result row requires exact
  retry mismatch diagnostics for both runners.
- **Valid empty run is rejected, or invalid empty run accepted.** Real reporter
  lifecycle tests cover resolved `passWithNoTests:true` and `false`.
- **Unfinished work appears passed because `module.ok()` is true.** Direct
  queued/pending/no-result tests assert `unfinished` and fatal reporter/
  discovery outcomes.
- **Multiple projects mask one failure.** Duplicate-path real lifecycle tests
  require failure-dominant aggregation while retaining each execution ID.
- **Stock forensic data is lost.** Both end-to-end proofs require readable stock
  and evidence artifacts; the stock path/fields remain, and focused tests check
  assertion/timing fields are not replaced.
- **Stale or mismatched evidence is consumed.** Fresh UUID paths and
  kind/phase/UUID validation fail closed; missing/malformed/mismatch classifier
  tests cover it.
- **Crash before report accidentally retries.** Missing evidence yields
  uncertified discovery and no attributable failures, so matrix asserts
  `retry:null`.
- **Spawn-error test is a harness accident.** Existing empty PATH plus exact
  `ENOENT` assertion distinguishes intended missing executable from
  `ENOTDIR`; the gate itself still starts with `process.execPath`.
- **Timeout/interruption is collapsed into an ordinary failure.** Direct
  lifecycle tests retain terminal reason/FullResult and require fatal
  reporter-domain status regardless of exit 1 versus 130.
- **Causal language survives in a consumer.** Two exact greps require zero
  active matches; handoff names the unmodified outside scripts and three new
  headings.
- **Locking, phase order, retry scope, paths, or timeout changes accidentally.**
  Retained tests assert lock argv, phase log order, exact selected files,
  serial flags, stock path shape, and load capture; no timeout edits are in the
  file list.
- **A proof fixture enters normal discovery.** Root list must return 0 and the
  dedicated list exactly 2 before any proof run.

PLAN M1 R2 DONE
