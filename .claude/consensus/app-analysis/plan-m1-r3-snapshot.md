# GATE-INTEGRITY-01: Gate verdict integrity plan

## Round-3 changes

This final revision incorporates every finding in
`plan-m1-review-astra-r2.md`; no finding is rejected:

- **P2-F1 — late process timeout.** The Vitest sidecar now records
  `onProcessTimeout` and synchronously rewrites/finalizes its evidence with the
  stable fatal reason `vitest-process-timeout`. The callback is declared at
  `node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:1053` and invoked
  at `cli-api.BK8pd4xc.js:13965-13978`. A new case requires failed file +
  process timeout + passing diagnostic retry to remain red. The residual-risk
  section now distinguishes this detectable path from coverage/report-on-
  failure and debug-dump failures for which no universal error callback exists.
- **P2-F2 — retry argv ordering.** Retry construction is now explicitly:
  retained parsed option tokens, gate-controlled reporter/serial options,
  replacement failed-file filters, then a preserved `--` delimiter/tail.
  Tests assert the installed parser result rather than substring presence. The
  executed probe returned the exact failed-file `filter`,
  `fileParallelism:false`, `maxWorkers:1`, and the tail separately.
- **P2-F3 — asymmetric artifacts.** The plan names cross-runner tests and stable
  reasons for stock-present/sidecar-missing and sidecar-present/stock-missing.
  It adds UUID, kind, and phase mismatch classifier tests. The stock JSON is
  never required to contain a UUID; provenance joins the gate-owned phase/path
  record to the UUID-bearing sidecar.
- **P2-F4 — Playwright timeout policy.** An attributable per-test `timedOut`
  result is retryable under D544; only global `FullResult.status:"timedout"`,
  interruption, and global errors are permanent. A Playwright timed-out test
  that passes the exact serial retry is a positive control. Launching a
  diagnostic retry is now explicitly separate from permitting the final gate
  to become green.
- **P2-F5 — Playwright skipped evidence.** The sidecar records discovery,
  `onTestBegin` and `onTestEnd` occurrence, raw status, outcome, and
  `expectedStatus`. Intentional skip, started-but-unfinished, and synthesized
  nonexecution are distinct. Execution-level unfinished/discovery failures are
  retained even when path aggregation also contains a failure.
- **P2-F6 — root empty-run setting.** `passWithNoTests` comes once from the root
  resolved `vitest.config` in reporter `onInit`; the incorrect all-projects
  requirement is removed.
- **P2-F7 — executable discovery proof.** Commands use bare `--json` last and
  parse `{file, projectName?}` objects after path normalization. The root is
  filtered to the two proof files; the dedicated config is unfiltered. The
  commands were executed this round: root exited 0 with `[]`; the not-yet-
  created dedicated config exited 1 with `ERR_LOAD_URL`. Both observed outputs
  and post-implementation expectations are recorded below.
- **P2-F8 — honest lifecycle boundaries.** The test inventory now states which
  tests use fake runners, supplied/captured objects, and actual runner
  lifecycles. One bounded Playwright invocation runs only the touched fixture
  spec, without a browser or app server, through a `/tmp` wrapper config with
  absolute `testDir`, `PLAYWRIGHT_PORT=4470`, and
  `PLAYWRIGHT_WORKERS=1`. It proves the production reporter receives a complete
  `onBegin → onTestEnd → onEnd → onExit` lifecycle.

The reviewer-resolved Round-2 items remain unchanged: fresh invocation
provenance and crash-before-report handling (P1-F7), deterministic `ENOENT`
spawn setup and diagnostic RED controls (P1-F8), executable/forensic consumer
separation and headings (P1-F9), fatal interruption independent of numeric exit,
and proof 1's process-only invariant.

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
UUID and both absolute paths. The classifier rejects sidecar kind, phase, or
UUID disagreement with the gate-owned phase record. **Stock JSON has no UUID
and the classifier does not require or invent one inside it**; its provenance
is the fresh stock path selected by that same phase record. Paths are fresh
gate-selected values, never caller-selected reusable evidence.

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
  (`cli-api.BK8pd4xc.js:13605-13609`). Implement `onProcessTimeout`, declared
  at `reporters.d.DtoKVV2s.d.ts:1053` and invoked at
  `cli-api.BK8pd4xc.js:13965-13978`, to synchronously/atomically rewrite the
  same sidecar with `processTimeoutObserved:true` and fatal reason
  `vitest-process-timeout` before Vitest calls `process.exit()`. This later
  callback is evidence for that specific timeout, including when an assertion
  already set exit 1. Global teardown at `:13937` runs after the outer catch,
  but has no error-bearing reporter callback and sees only the already-collapsed
  numeric exit code. Consequently the authoritative universal process
  completion boundary remains the parent's `spawnSync` result. The narrower
  residual collision is explicit under Risks.

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
  terminalCallbackObserved: boolean
  processTimeoutObserved: boolean
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

Reporter reasons are stable codes. At minimum:

- `stock-report-missing`, `stock-report-unreadable`,
  `stock-report-malformed`;
- `evidence-sidecar-missing`, `evidence-sidecar-unreadable`,
  `evidence-sidecar-malformed`;
- `evidence-invocation-mismatch`, `evidence-kind-mismatch`,
  `evidence-phase-mismatch`;
- `vitest-process-timeout`, `runner-global-error`,
  `runner-interrupted`, and `runner-global-timeout`.

Readable stock plus missing sidecar fails reporter with
`evidence-sidecar-missing`, leaves discovery `uncertified`, has no attributable
file result, and therefore does not retry. Readable sidecar plus missing stock
fails reporter with `stock-report-missing`; sidecar discovery/file evidence is
retained diagnostically, so attributable failures may launch retry, but the
initial missing-stock reason permanently prevents green. The analogous
unreadable/malformed cases use their own codes.

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

Retry launch and final authorization are deliberately separate decisions:

- **Launch the diagnostic retry** whenever trustworthy initial sidecar evidence
  names one or more attributable failed files, even if the initial process,
  reporter, or discovery domain is also red. This preserves both-attempt
  evidence for a file failure accompanied by a global error or process timeout.
- **Permit green after retry** only when the retry proves those exact files
  passed and every non-file domain in **both** phases is green. Retry never
  clears an initial `vitest-process-timeout`, global timeout/error,
  interruption, artifact failure, or discovery failure.

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
- Reporter `onInit(vitest)` is available at
  `reporters.d.DtoKVV2s.d.ts:1041-1043`; `passWithNoTests` is a root
  `NonProjectOptions` member at `:3572` and is omitted from project config at
  `:3597-3602`.
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
- A late close timeout calls reporter `onProcessTimeout` before forced exit at
  `cli-api.BK8pd4xc.js:13965-13978`.

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
`onProcessTimeout`, stock/evidence disagreement, or an invalid terminal reason
do.

`passWithNoTests` is serialized once from the **root resolved**
`vitest.config.passWithNoTests` received through reporter `onInit`; it is not
read from project configs. Zero scheduled/reported files is valid only when
that root value is true, terminal reason is `passed`, stock `success:true`, and
the process exits 0. With root `passWithNoTests:false`, the same empty run is a
reporter/discovery failure and cannot trigger retry.

Process rule:

- exit 0, null signal, null spawn error: process passed;
- exit 1 plus at least one attributable failed file: process
  `ordinary-file-failure`, hence eligible for serial retry;
- exit 1 with no attributable failed file: process failed;
- terminal reason `interrupted` is fatal with exit 1, 130, or any other code;
- observed `onProcessTimeout` is a fatal reporter reason regardless of exit or
  subsequent retry;
- every other nonzero code, signal, spawn error, or null exit status is fatal.

An exit 1 with failed files launches the diagnostic retry even if another
domain is bad; it may produce a green final verdict only when reporter/global
and discovery domains were otherwise good. Bad domains remain red across
retry. There is no claim that exit 130 is guaranteed.

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
- Outcome calculation distinguishes `status:"skipped"` with
  `expectedStatus:"skipped"` from a skipped result that did not run at
  `node_modules/playwright/lib/common/index.js:2525-2548`. A newly appended
  result starts as `status:"skipped"` at `:2822-2837`, and serial-failure
  handling synthesizes remaining skipped results at
  `node_modules/playwright/lib/runner/index.js:5400-5412,5467-5475`.
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
| individual test timeout: raw `timedOut`, FullResult `failed`, no global error | attributable `failed` file evidence; serial retry may convert it under D544 |
| expected failure: raw `failed`, outcome `expected` | `passed` for gate purposes, while raw evidence is retained |
| unexpected pass of an expected-fail test: outcome `unexpected` | `failed` |
| `onTestEnd` seen, raw `skipped`, `expectedStatus:"skipped"` | intentional `skipped`, accepted terminal evidence |
| `onTestEnd` seen, raw `skipped`, expected status is not skipped | runner-synthesized `nonexecution`; `unfinished` reporter failure |
| outcome `flaky` | `passed` after Playwright's own result history; retained explicitly even though gate forces `--retries=0` |
| `onTestBegin` seen but no `onTestEnd`, or raw `interrupted` | started-but-`unfinished`; reporter failure and missing terminal discovery evidence |
| discovered test with neither terminal callback nor terminal result | synthesized/absent nonexecution; discovery failure and `unfinished` |
| same normalized path in multiple projects | aggregate `failed > unfinished > passed > skipped`; retain all project/test IDs **and** independently retain every execution-level unfinished/discovery reason |

`FullResult.status:"failed"` does not independently fail the reporter domain
when solely explained by attributable per-file failures, including individual
test timeouts. Global `FullResult.status:"timedout"`, `interrupted`, any
`onError`, unfinished/nonexecution result, or unexplained stock/evidence
disagreement is fatal. Path aggregation is only a summary; a failed execution
at the same path never suppresses another project's independent unfinished or
discovery phase failure.

Process rule mirrors the documented CLI set:

- exit 0 with no signal/spawn error is passed;
- exit 1 plus attributable ordinary failed files is
  `ordinary-file-failure`;
- exit 1 without attributable failed files is fatal;
- exit 130, any other nonzero code, signal, spawn error, or null status is fatal.

An individual test timeout may use exit 1 with FullResult `failed` and remains
retryable under D544. A **global** timeout uses FullResult `timedout` and is
fatal. Global errors/interruption remain fatal even when the same phase has
retryable failed files; their files may be retried diagnostically, but the gate
cannot become green.

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
| sidecar present, stock reporter missing after child exit 0 | Gate exit 1 with `stock-report-missing`; sidecar evidence retained, reporter red; retry launches only if sidecar names a failed file and can never make gate green | Current output collapses the missing stock file to a synthetic failure and has no sidecar/domain contract. |
| retry requested for two failed files but reports one pass | Gate exit 1; omitted identity/file named by retry discovery; reported pass may appear in `passedOnRetry` | Current code lacks exact requested/scheduled/reported evidence. |
| ordinary failed test exit 1; exact serial retry exit 0 | Gate exit 0; no phase failures; exact file in `passedOnRetry`; both phases complete | Current high-level exit is green, but v2 domains and renamed factual diagnostics do not exist. |

Add an eighth counterexample outside the retained seven-row matrix, for both
runners: readable stock/evidence success, exactly one passing file, complete
discovery, no global error, then child exit 1. Expected: process-only failure,
gate exit 1, and `retry:null`. This is the detectable form of a post-report
failure.

Add these required rows after the retained seven-row matrix:

| Additional fixture/scenario | Expected v2 verdict | Why RED against today's runner |
|---|---|---|
| Vitest failed file + `onProcessTimeout` + passing retry | Retry launches and the file is factually `passedOnRetry`, but final gate is red with initial reporter reason exactly `vitest-process-timeout` | Current gate has no sidecar/callback evidence and turns the passing retry green. |
| Playwright individual `timedOut` result + FullResult `failed` + exact serial pass | Final green with the exact file in `passedOnRetry`; individual timeout remains attributable under D544 | Current high-level result is green, but has no native timeout evidence or v2 proof that only the file domain was converted. |
| Vitest readable stock + missing sidecar | Red with `evidence-sidecar-missing`, discovery `uncertified`, and `retry:null` | Current gate trusts stock success and exits green. |
| Playwright readable stock + missing sidecar | Red with `evidence-sidecar-missing`, discovery `uncertified`, and `retry:null` | Current gate trusts stock success and exits green. |

The existing 3 test instances are retained and updated. Seven rows × 2 runners
adds 14, late failure × 2 adds 2, asymmetric missing-sidecar × 2 adds 2, and the
two runner-specific timeout cases add 2: planned `gate-runners.test.ts` total is
**1 file / 23 tests**.

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

Add `tests/unit/tools/gate-evidence-reporters.test.ts` with **21 tests**:

- Vitest (11): passing module; collection failure; intentional skipped module;
  pending/unfinished; queued/unfinished; global-only error; terminal
  interruption; `onProcessTimeout` sidecar rewrite; duplicate path across two
  projects; root `passWithNoTests:true`; root `passWithNoTests:false`.
- Playwright (10): expected pass; unexpected assertion failure; individual
  timed-out result; intentional skip (`onTestEnd` seen and expected status
  skipped); started-but-no-terminal callback; synthesized skipped nonexecution
  (expected status not skipped); global FullResult timedout; global FullResult
  interrupted; global-only `onError`; duplicate path/project with independent
  unfinished evidence surviving failure-dominant file aggregation.

The boundary is explicit rather than overstated:

- **7 Vitest tests** spawn the installed runner and let the production reporter
  receive natural lifecycle objects: passing, collection error, global error,
  process timeout, duplicate projects, and the two root empty-run settings.
- **4 Vitest tests** exercise terminal skipped/pending/queued/interrupted
  mapping by invoking the production reporter with strongly typed lifecycle
  objects captured at the documented callback boundary. They prove adapter
  mapping, not that every state is naturally delivered at process shutdown.
- **All 10 Playwright unit tests** use strongly typed reporter-API objects and
  callback sequences. They are adapter/classifier contracts, not claims of real
  Playwright launches.
- **The separately counted 1-spec/3-test Playwright proof** below is the real-
  object boundary: one bounded installed-runner invocation delivers the
  production reporter's actual `onBegin → onTestEnd → onEnd → onExit`
  lifecycle, including intentional skip, individual timeout, and serially
  synthesized nonexecution.

Add `tests/unit/tools/gate-verdict.test.ts` with **15 pure classifier tests**:
Vitest ordinary exit 1; Playwright ordinary exit 1; late exit 1 with successful
reports; exit 2; signal; spawn error; malformed JSON; unreadable evidence
(`EISDIR`); retry process failure; retry reporter/global failure; retry
discovery mismatch; sidecar UUID mismatch; sidecar kind mismatch; sidecar phase
mismatch; and a failed-plus-unfinished duplicate path that retains the
independent unfinished reporter/discovery failure. Asymmetric missing artifacts
are exercised for both runners in `gate-runners.test.ts` with the stable reason
codes, not hidden in one generic classifier case.

Planned focused GREEN total: **3 files / 59 tests** (23 + 21 + 15), plus the
separately counted bounded Playwright fixture proof: **1 spec / 3 tests** with
expected command exit 1 because one fixture intentionally times out.

### RED/GREEN mutation control

1. Add all three test files and test fixtures first, while leaving production
   gate/classifier/reporter files unchanged. New classifier/reporter contracts
   use per-test dynamic imports during this stage so each `it` executes and is
   RED on the missing production export/module rather than stopping collection.
2. Run the focused gate-runner command. Require 1 file / 23 tests and all 20
   new integrity cases RED for missing v2 diagnostics or the known wrong exit;
   the 3 retained cases are also RED only on their new v2/heading diagnostics,
   while fake processes complete normally.
3. Run the cumulative 3-file command before the fix and require 3 files / 59
   tests observed RED: the 23 wrapper tests for the reasons above and each of
   the 36 reporter/classifier tests at its dynamic production boundary. Record
   exact actual totals/failures if they differ.
4. Implement production; retain the same expectations/import targets.
5. Run the identical 3-file command and require 59/59 GREEN, then run the one bounded
   Playwright fixture proof and require its exact 1-spec/3-test evidence.

This is a mutation control without changing production or generating expected
values from current output.

## Implementation steps in order

1. **Prepare all RED contracts.** Extend the existing fake scenarios/v2
   assertions and add both new unit files before production changes. Ensure fake
   initial evidence contains both requested files and fake stock/evidence share
   the gate-provided invocation UUID. Use in-test dynamic imports for not-yet-
   existing production modules so all tests collect and execute. Capture the
   1-file/23-test wrapper RED and the cumulative 3-file/59-test RED, including
   asymmetric artifacts, Vitest process timeout, Playwright individual timeout,
   every lifecycle mapping, and every provenance mismatch.
2. **Allocate linked artifacts without changing stock paths.** Refactor
   `reportPath` into/alongside `phaseArtifactPaths` so its stock path remains
   byte-for-byte the existing naming form and add the sibling evidence path.
   Preserve raw `spawnSync.status` as nullable. Classify read failures as
   missing (`ENOENT`), malformed (JSON parse), or unreadable (other filesystem
   errors).
3. **Implement `tools/gate-vitest-evidence-reporter.mjs`.** Record invocation
   metadata, root resolved `vitest.config.passWithNoTests` from `onInit`,
   scheduled specifications, native terminal module states/errors, global
   errors, and terminal reason. Implement `onProcessTimeout` as an atomic
   sidecar update with `vitest-process-timeout`; do not replace or truncate
   stock JSON.
4. **Implement `tools/gate-playwright-evidence-reporter.mjs`.** Record the
   fully discovered suite, execution/project identities, all per-test result
   statuses/outcomes, `expectedStatus`, begin/end callback occurrence, global
   `onError` evidence, FullResult status, and an `onExit` completion field. Do
   not replace stock JSON.
5. **Make the direct reporter contracts green.** Use the already-RED 21 tests
   with their explicitly categorized real-runner versus typed-object
   boundaries. Prove collection,
   global error/timeout, process timeout, interruption, intentional skip,
   synthesized nonexecution, unfinished, duplicate-project, and root empty-run
   semantics before wiring the verdict.
6. **Implement `tools/gate-verdict.mjs`.** Validate both artifact schemas and
   provenance, cross-check stock/evidence, apply exhaustive native mappings,
   compute all four domains, and reduce phases without letting retry clear a
   non-file domain.
7. **Make the 15 classifier contracts green.** Cover every read/process/retry and
   sidecar provenance boundary, including malformed versus unreadable and UUID,
   kind, and phase mismatch. Require stable v2 reason codes rather than
   incidental error prose. Stock JSON is validated by shape/cross-evidence and
   its gate-owned path, never by a nonexistent stock UUID.
8. **Wire Vitest while retaining options.** Initial uses stock plus evidence
   reporters. Build retry argv from the initial CLI tokens with a tested
   option-arity parser based on installed Vitest CLI declarations: retain all
   non-positional options and their order (`--config`/`-c`, project, test
   name, environment, pool, coverage, `passWithNoTests`, shard, and changed);
   remove initial positional file filters and gate-controlled reporter/output/
   parallelism/worker flags; then construct argv in this exact order:
   retained parsed-option tokens, gate-controlled stock/evidence reporter and
   serial options, exact replacement failed-file filters, and finally any
   preserved `--` delimiter/tail. Test long, short, `--name=value`, array,
   boolean, and `--` forms by running installed `parseCLI` and asserting exact
   `filter`, `fileParallelism:false`, and `maxWorkers:1`. If a
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
12. **Add one bounded real-Playwright evidence fixture.** Add only
    `tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts`. It uses no
    browser/page fixture or application server and contains exactly 3 cases:
    an intentional fixme/expected skip (without a disabled-test API), a deliberately short
    D544-named individual timeout in a serial suite, and the following test that
    Playwright represents as synthesized nonexecution. A `/tmp` wrapper config
    with absolute `testDir` selects only this file and workers 1. This is
    evidence-fixture behavior, not a timeout change to an existing test.
13. **Run the verification contract.** Inspect artifacts with explicit Node
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
- `tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts` (new,
  selected only by the temporary wrapper);
- isolated real-lifecycle reporter fixture/config files under
  `tests/fixtures/gate-evidence/`, each with a non-default discovery suffix.

No lock script, phase, stock/final report path, retry selection, existing-test
timeout, schema, docs, or application source is changed. The new D544-named
evidence fixture alone uses a deliberately short local timeout to produce the
required native `timedOut` state; it does not raise or alter any retained test's
timeout.

## Verification contract

Run from
`/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity`. Never add an outer
`flock`.

### Fixture isolation before RED/GREEN

```bash
M1_LIST_TMP="$(mktemp -d /tmp/dnd-gate-m1-list.XXXXXX)"
set +e
M1_ROOT_LIST="$(TMPDIR="$M1_LIST_TMP" npx vitest list --configLoader runner tests/fixtures/gate-vitest-success.fixture.ts tests/fixtures/gate-vitest-passes-on-retry.fixture.ts --filesOnly --json)"
M1_ROOT_STATUS=$?
M1_PROOF_LIST="$(TMPDIR="$M1_LIST_TMP" npx vitest list --configLoader runner --config tests/fixtures/gate-vitest-proof.config.mts --filesOnly --json)"
M1_PROOF_STATUS=$?
set -e
test "$M1_ROOT_STATUS" -eq 0
test "$M1_PROOF_STATUS" -eq 0
node -e 'const path=require("node:path");const a=JSON.parse(process.argv[1]);if(!Array.isArray(a)||a.length!==0)process.exit(1)' "$M1_ROOT_LIST"
node -e 'const path=require("node:path");const a=JSON.parse(process.argv[1]);const got=a.map(x=>({file:path.relative(process.cwd(),x.file).replaceAll(path.sep,"/"),projectName:x.projectName})).sort((l,r)=>l.file.localeCompare(r.file));const wanted=["tests/fixtures/gate-vitest-passes-on-retry.fixture.ts","tests/fixtures/gate-vitest-success.fixture.ts"];if(JSON.stringify(got.map(x=>x.file))!==JSON.stringify(wanted))process.exit(1)' "$M1_PROOF_LIST"
```

Required numbers: root config lists 0 proof files; dedicated config lists
exactly 2 when run **without filters**. The output is an array of
`{file:absolutePath, projectName?:string}` objects, so assertions normalize
`file`; they do not compare the objects to relative strings. Bare `--json` is
last in both commands. Installed `vitest list --filesOnly` obtains relevant
specifications without running tests at
`cac.DdICfEr1.js:2359-2381`, and JSON file output is implemented at
`cli-api.BK8pd4xc.js:14608-14631`.

These commands were executed against the current pre-fixture tree in this plan
round. Exact observed result:

```text
ROOT_STATUS=0
ROOT_OUTPUT_BEGIN
[]
ROOT_OUTPUT_END
DEDICATED_STATUS=1
DEDICATED_OUTPUT_BEGIN
failed to load config from /home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/fixtures/gate-vitest-proof.config.mts

⎯⎯⎯⎯⎯⎯ Collect Error ⎯⎯⎯⎯⎯⎯
Error: Failed to load url /home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/fixtures/gate-vitest-proof.config.mts (resolved id: /home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/fixtures/gate-vitest-proof.config.mts). Does the file exist?
    at loadAndTransform (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/chunks/config.js:22739:33) {
  code: 'ERR_LOAD_URL',
  runnerError: Error: RunnerError
      at reviveInvokeError (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/module-runner.js:476:64)
      at Object.invoke (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/module-runner.js:549:11)
      at async ModuleRunner.getModuleInformation (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/module-runner.js:1086:7)
      at async ModuleRunner.import (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/module-runner.js:1013:23)
      at async runnerImport (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/chunks/config.js:35282:20)
      at async runnerImportConfigFile (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/chunks/config.js:35874:45)
      at async loadConfigFromFile (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/chunks/config.js:35851:42)
      at async resolveConfig (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/chunks/config.js:35500:22)
      at async _createServer (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vite/dist/node/chunks/config.js:25441:67)
      at async createViteServer (file:///home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:8835:17)
}
DEDICATED_OUTPUT_END
```

That is the expected pre-implementation state: root exclusion is already
proved, while positive dedicated discovery cannot pass until its config and two
fixtures exist.

Because those two outputs are necessarily empty/error before implementation, a
third no-test control was executed to observe the installed formatter's
non-empty shape:

```bash
npx vitest list --configLoader runner tests/unit/tools/gate-runners.test.ts --filesOnly --json
```

Exact output (exit 0):

```json
[
  {
    "file": "/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts"
  }
]
```

### Retry parser proof

Run the parser against the exact required ordering:

```bash
node --input-type=module -e 'import { parseCLI } from "vitest/node"; const parsed=parseCLI(["vitest","run","--config","tests/fixtures/gate-vitest-proof.config.mts","--project","unit","--no-file-parallelism","--maxWorkers=1","tests/fixtures/gate-vitest-passes-on-retry.fixture.ts","--","--node-tail","tail-value"]); console.log(JSON.stringify({filter:parsed.filter,config:parsed.options.config,project:parsed.options.project,fileParallelism:parsed.options.fileParallelism,maxWorkers:parsed.options.maxWorkers,tail:parsed.options["--"]},null,2));'
```

Executed output (exit 0):

```json
{
  "filter": [
    "tests/fixtures/gate-vitest-passes-on-retry.fixture.ts"
  ],
  "config": "tests/fixtures/gate-vitest-proof.config.mts",
  "project": [
    "unit"
  ],
  "fileParallelism": false,
  "maxWorkers": 1,
  "tail": [
    "--node-tail",
    "tail-value"
  ]
}
```

Unit tests must make these parsed-value assertions for every supported token
form. String-presence assertions alone are insufficient.

### Focused RED before production

```bash
npx vitest run --configLoader runner tests/unit/tools/gate-runners.test.ts
```

Required planned result: exit 1, 1 file / 23 tests collected, with all 20 new
integrity assertions RED for the intended v2 diagnostic/verdict mismatch.
The 3 retained cases must also fail only on required v2/renamed diagnostics,
not fixture crashes. Then run all newly added contracts, still before production
changes:

```bash
npx vitest run --configLoader runner tests/unit/tools/gate-runners.test.ts tests/unit/tools/gate-evidence-reporters.test.ts tests/unit/tools/gate-verdict.test.ts
```

Required planned result: exit 1, 3 files / 59 tests collected, all 59 RED. The
36 reporter/classifier tests must execute their individual dynamic-import
boundary rather than fail test-file collection. Record exact actual numbers and
reason categories; if a test is unexpectedly green, strengthen it before the
fix.

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
59 tests passed. Run the two consumer greps from the prior section and require
zero active causal-label matches.

### One bounded real Playwright reporter proof

After the production reporter and the single fixture spec exist, create only a
temporary wrapper config. Its `testDir` is absolute; no `webServer` is defined
because this evidence fixture uses neither the application nor a browser:

```bash
M1_PW_ROOT="/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity"
M1_PW_CONFIG="$(mktemp /tmp/dnd-gate-m1-playwright.XXXXXX.mjs)"
M1_PW_ARTIFACT_DIR="$(mktemp -d /tmp/dnd-gate-m1-playwright-artifacts.XXXXXX)"
node --input-type=module -e 'import { writeFileSync } from "node:fs"; const root=process.argv[1]; const target=process.argv[2]; writeFileSync(target, `import { defineConfig } from ${JSON.stringify(`${root}/node_modules/@playwright/test/index.mjs`)};\nexport default defineConfig({ testDir: ${JSON.stringify(`${root}/tests/fixtures/gate-evidence`)}, testMatch: "d544-playwright-evidence.spec.ts", workers: 1, retries: 0 });\n`);' "$M1_PW_ROOT" "$M1_PW_CONFIG"
set +e
PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 PLAYWRIGHT_JSON_OUTPUT_FILE="$M1_PW_ARTIFACT_DIR/stock.json" DND_GATE_EVIDENCE_PATH="$M1_PW_ARTIFACT_DIR/evidence.json" DND_GATE_KIND=playwright DND_GATE_PHASE=initial DND_GATE_PHASE_INVOCATION_ID=m1-real-playwright npx playwright test d544-playwright-evidence.spec.ts --config="$M1_PW_CONFIG" --workers=1 --retries=0 --reporter="json,$M1_PW_ROOT/tools/gate-playwright-evidence-reporter.mjs"
M1_PW_STATUS=$?
set -e
test "$M1_PW_STATUS" -eq 1
node -e 'const fs=require("node:fs");const e=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(e.phaseInvocationId!=="m1-real-playwright"||!e.lifecycle.onBegin||!e.lifecycle.onEnd||!e.lifecycle.onExit||e.tests.length!==3||!e.tests.every(t=>t.onTestEndObserved)||!e.tests.some(t=>t.expectedStatus==="skipped"&&t.status==="skipped")||!e.tests.some(t=>t.status==="timedOut")||!e.tests.some(t=>t.status==="skipped"&&t.expectedStatus!=="skipped"))process.exit(1)' "$M1_PW_ARTIFACT_DIR/evidence.json"
```

Required exact result: one touched spec / 3 fixture tests, workers 1, command
exit 1 due the deliberate individual timeout, stock and sidecar readable, and
the production reporter records real `onBegin`, all three `onTestEnd` events,
`onEnd`, and `onExit`. The expected skip and synthesized nonexecution are
distinguished by `expectedStatus`. This is not the full Playwright suite, starts
no app/web server or browser, and never touches port 4173; the mandated port
environment is 4470.

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

Do not run `npm run test:gate`, the full Vitest suite, or any application/full
Playwright suite in this lane. The single explicitly bounded evidence fixture
above is the only authorized Playwright invocation.

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
| Vitest process timeout is separately detectable. | Verified: `onProcessTimeout` is declared at `reporters.d.DtoKVV2s.d.ts:1053` and called before forced exit at `cli-api.BK8pd4xc.js:13965-13978`. |
| Coverage and debug dump are off unless configured. | Verified: `defaults.9aQKnqFk.js:15-22` sets coverage `enabled:false` and `reportOnFailure:false`; root `vitest.config.ts:26-64` does not enable coverage/debug dump; `coverage.DM_a_rWm.js:534-536` enables dump only for `server.debug.dump` or `VITEST_DEBUG_DUMP`. |
| Root, not project, config owns `passWithNoTests`. | Verified at `cli-api.BK8pd4xc.js:12620-12622`, stock JSON `index.UpGiHP7g.js:3552`, reporter `onInit` type `reporters.d.DtoKVV2s.d.ts:1041-1043`, and `NonProjectOptions`/project omission at `:3572,3597-3602`. |
| Vitest terminal interruption can be exit 1, not only 130. | Verified at `cli-api.BK8pd4xc.js:12601-12607`; keyboard 130 path is only `:14412-14420`. |
| Vitest native unfinished/error states need explicit handling. | Verified at `cli-api.BK8pd4xc.js:11554-11560,11760-11774,11862-11867,11909-11916`. |
| Repeated Vitest reporters and comma-separated Playwright reporters are supported. | Verified at installed `cac.DdICfEr1.js:702-707` and `playwright/lib/cli/testActions.js:164-167`. |
| Correct retry ordering is parsed as serial controls + exact failed-file filter + separate tail. | Verified this round with installed `parseCLI`: `filter` was the one failed fixture, `fileParallelism:false`, `maxWorkers:1`, and `options["--"]` retained only the two tail tokens. Exact output is pasted in Verification. |
| Playwright exposes all required native/global states and calls `onExit` after `onEnd`. | Verified at `testReporter.d.ts:21-32,147-175,422-441,657-695` and runner `index.js:5843-5850`. |
| Individual Playwright timeout is distinct from global timeout and may be retried. | Settled by D544 at `.claude/decisions.md:11065-11071`; installed `testReporter.d.ts:21-32,657-695` separates TestResult `timedOut` from FullResult `timedout`, and `runner/index.js:5820-5823` maps failed tests to run status `failed`. |
| A skipped Playwright result alone does not prove intentional skip. | Verified at `playwright/lib/common/index.js:2525-2548,2822-2837` and `runner/index.js:5400-5412,5467-5475`; expected status and callback occurrence are required. |
| No executable in-repo consumer besides `gate-runners.test.ts` reads final JSON. | Verified by focused `rg` in round 1. Supervisor forensic consumption is explicit in the task/review. |
| The two named external scripts are the active outside consumers. | Locally observed read-only in round 1; reviewer did not verify this inventory, and only the supervisor can establish completeness. |
| Controlled empty PATH gives `ENOENT` for missing `flock`. | Consistent with Node spawn semantics; implementation test must verify exact `spawnError.code === "ENOENT"`. Marked unverified until RED run. |
| Discovery output shape and current fixture state are known. | Executed this round with bare `--json`: filtered root command exited 0 with `[]`; unfiltered dedicated-config command exited 1 with `ERR_LOAD_URL` because the config does not yet exist. Installed formatter source at `cli-api.BK8pd4xc.js:14612-14625` defines `{file, projectName?}` output. |
| Actual runner fixtures can deterministically expose every planned lifecycle edge. | Seven Vitest lifecycle cases and one bounded Playwright proof are designed as actual launches; the remaining 14 reporter unit cases are honestly typed callback-object contracts. Controlled real lifecycle fixtures remain unexecuted because they do not exist. If the bounded proof cannot produce its promised callbacks, stop and report the gap rather than relabeling a typed-object test as real. |
| Planned focused totals are 23 + 21 + 15 = 59, plus one Playwright spec / 3 fixture tests. | Arithmetic verified; actual collection and Playwright totals must be recorded in RED/GREEN runs. |

Read-only commands used for Round-3 source verification included:

```bash
wc -l /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/plan-m1-review-astra-r2.md
sed -n '1,560p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/plan-m1-review-astra-r2.md
nl -ba node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js | sed -n '11545,11925p;12590,12630p;13450,13620p;13920,13970p;14400,14585p'
nl -ba node_modules/vitest/dist/chunks/index.UpGiHP7g.js | sed -n '3538,3615p'
nl -ba node_modules/vitest/dist/chunks/cac.DdICfEr1.js | sed -n '690,715p;2350,2390p'
nl -ba node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts | sed -n '1038,1065p;3560,3610p'
nl -ba node_modules/vitest/dist/chunks/defaults.9aQKnqFk.js | sed -n '1,35p'
nl -ba node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js | sed -n '525,542p'
nl -ba node_modules/playwright/types/testReporter.d.ts | sed -n '20,35p;145,180p;420,445p;650,700p'
nl -ba node_modules/playwright/lib/cli/testActions.js | sed -n '90,102p;155,172p'
nl -ba node_modules/playwright/lib/common/index.js | sed -n '2525,2555p;2810,2850p'
nl -ba node_modules/playwright/lib/runner/index.js | sed -n '5390,5420p;5460,5485p;5810,5830p'
npx vitest list --configLoader runner tests/fixtures/gate-vitest-success.fixture.ts tests/fixtures/gate-vitest-passes-on-retry.fixture.ts --filesOnly --json
npx vitest list --configLoader runner --config tests/fixtures/gate-vitest-proof.config.mts --filesOnly --json
npx vitest list --configLoader runner tests/unit/tools/gate-runners.test.ts --filesOnly --json
node --input-type=module -e 'import { parseCLI } from "vitest/node"; /* exact probe printed in Verification */'
```

No npm script, Vitest test run, gate, Playwright, model, reviewer, or agent
command was run while revising this plan. Exactly three `vitest list` discovery
commands and one installed `parseCLI` Node probe were executed; their exit codes
and outputs are recorded above.

## Open

No source disagreement remains. The naturally delivered queued/pending/
started-without-end lifecycle edges are implementation-time feasibility checks,
not silently claimed proof. If the named fixtures cannot expose them
deterministically, implementation must report that evidence gap to the
supervisor rather than weaken the contract.

## Risks and how each is tested

- **Residual Vitest exit-1 ambiguity after reporter completion.** A failed test
  sets exit 1, and an additional post-report failure may also set exit 1; no
  **universal error-bearing** post-process reporter hook distinguishes every
  collision. `onProcessTimeout` is not residual: its dedicated matrix case
  requires `vitest-process-timeout` to survive a passing retry. Remaining
  undetectable collisions can be reached by (a) enabling coverage and, for an
  already-failed test run, also enabling `coverage.reportOnFailure`, then
  failing coverage work after `onTestRunEnd`, or (b) enabling
  `server.debug.dump`/`VITEST_DEBUG_DUMP` and failing the metadata write at
  `cli-api.BK8pd4xc.js:12608-12617`. Coverage defaults to disabled and
  `reportOnFailure:false` at `defaults.9aQKnqFk.js:15-22`; root
  `vitest.config.ts:26-64` and `tools/gate-vitest.mjs` enable neither coverage
  nor debug dump. The gate will preserve caller-provided config/options but
  does not itself turn these configurations on. This bounded ambiguity is
  explicitly accepted under review option (b). The success/no-failed-file late
  exit-1 proof covers the detectable case. A future need for complete
  attribution under those opt-in configurations requires an independent
  process-completion protocol.
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
- **Diagnostic retry is incorrectly suppressed or incorrectly authorizes
  green.** Global-error and process-timeout rows require the retry to launch and
  retain its pass evidence while final status stays red; ordinary and
  individual-Playwright-timeout controls require the same mechanism to finish
  green when no non-file domain failed.
- **Partial retry is accepted.** The two-files/one-result row requires exact
  retry mismatch diagnostics for both runners.
- **Valid empty run is rejected, or invalid empty run accepted.** Real reporter
  lifecycle tests cover the root resolved `passWithNoTests:true` and `false`
  obtained at `onInit`, never an all-project inference.
- **Unfinished work appears passed because `module.ok()` is true.** Direct
  queued/pending/no-result tests assert `unfinished` and fatal reporter/
  discovery outcomes.
- **Multiple projects mask one failure or unfinished execution.** Duplicate-
  path tests require failure-dominant file aggregation while retaining every
  execution ID and an independent unfinished/discovery phase failure.
- **Playwright synthetic skipped work is accepted as intentional.** The bounded
  real fixture and typed callback tests require callback occurrence plus
  `expectedStatus`; intentional skip is accepted, while started-without-end and
  skipped-with-nonskipped-expectation are unfinished/nonexecution failures.
- **Stock forensic data is lost.** Both end-to-end proofs require readable stock
  and evidence artifacts; the stock path/fields remain, and focused tests check
  assertion/timing fields are not replaced.
- **Stale, asymmetric, or mismatched evidence is consumed.** Both runners test
  stock-present/sidecar-missing and sidecar-present/stock-missing with distinct
  stable reasons. Classifier tests separately cover sidecar UUID, kind, and
  phase mismatch. Stock is not required to contain a UUID.
- **Crash before report accidentally retries.** Missing evidence yields
  uncertified discovery and no attributable failures, so matrix asserts
  `retry:null`.
- **Spawn-error test is a harness accident.** Existing empty PATH plus exact
  `ENOENT` assertion distinguishes intended missing executable from
  `ENOTDIR`; the gate itself still starts with `process.execPath`.
- **Timeout/interruption is classified at the wrong level.** Vitest process
  timeout and runner interruption are fatal; Playwright FullResult global
  timeout/interruption is fatal; an attributable Playwright per-test timeout is
  retryable under D544. Separate positive/negative controls enforce all four.
- **Causal language survives in a consumer.** Two exact greps require zero
  active matches; handoff names the unmodified outside scripts and three new
  headings.
- **Locking, phase order, retry scope, paths, or timeout changes accidentally.**
  Retained tests assert lock argv, phase log order, exact selected files,
  serial flags, stock path shape, and load capture; no existing timeout is
  edited. The only timeout declaration is local to the new D544-named evidence
  fixture and intentionally produces, rather than masks, a timeout.
- **A proof fixture enters normal discovery.** Root list must return 0 and the
  dedicated list exactly 2 before any proof run.

PLAN M1 R3 DONE
