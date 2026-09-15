# QSFOG-SVG-01 Increment A review r1 — gpt-6-astra (read-only)

Reviewed ec0a2911. Session 01a0a257-02d0-7ba1-9616-d837b6417d9d. Log .tmp/runs/fanout/review-impl-qsfog-a-r1.log.

# REJECT QSFOG A

Blocking findings: **IA1-F1–IA1-F6**. Review completed at `ec0a29116e675fdbd5f00114c4e58884f4cb32ed`. No files changed or agents invoked.

## Findings

### IA1-F1 — P1: Repeatability-only output omits required frozen evidence

**Location:** [qsfog-intervention-report.ts:2461](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:2461), rendering at lines 2125–2166.

The C1/C2 branch returns before calculating error-family spread/headroom, stable and disputed positives, and leave-one-base-out results. Its summary contains only:

```text
scope,key,spread,mean_difference,threshold
```

**Probe/output:** Invoked `renderRepeatabilitySummaryCsv(calculateRepeatability(...))` in memory: **five columns, six data rows, zero LOO rows**. Markdown similarly reports only block identity, interval, coverage, spread and threshold.

This does not deliver the evidence Increment A must freeze before candidate interpretation. The candidate report also omits required pooled C1/C2 error-rate differences and several headroom/accounting details.

**Minimal change:** Calculate a shared, complete control baseline before branching on candidate presence; render its means, fixed-denominator counts/rates/spreads, headroom, stable/disputed positives and five LOO results. Test the actual repeatability output contract.

### IA1-F2 — P1: Valid rational inputs can fail during presentation conversion

**Location:** [qsfog-intervention-report.ts:708](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:708).

`external()` rejects exact rational numerators or denominators exceeding JavaScript’s safe-integer range. Small, valid per-state intersection/union counts can produce such denominators when averaged.

**Probe:** Eight states in base `5763006`, with C1 `1/u`, C2 `2/u`, where:

```text
u = 101,103,107,109,113,127,131,137
exact spread = 272598129945484/31249487656358033
```

**Output:**

```text
Rational result exceeds safe integer presentation.
```

Thus valid authenticated repeats can terminate as `INVALID_INPUT`.

**Minimal change:** Preserve arbitrary-precision fractions through the exported representation and serialization, for example integer strings. Add a valid multi-denominator regression test.

### IA1-F3 — P1: Preflight accepts overlapping C1/C2 outputs

**Location:** [qsfog-intervention-report.ts:479](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:479).

Uniqueness is checked on literal strings, while filesystem operations use resolved paths.

**Probe:** Set C2’s paths to aliases of C1’s:

```text
c1Jsonl: .tmp/qsfog/answers/c1.jsonl
c2Jsonl: .tmp/qsfog/answers/./c1.jsonl
```

Apply the analogous aliases to image roots and summaries; retain seven distinct recorded strings.

**Output:**

```text
recorded paths 7 resolved paths 4
alias preflight ACCEPTED
```

C2 can consequently truncate C1’s JSONL and overwrite its summary. The report does not reject identical resolved arm paths.

**Minimal change:** Require distinct canonical output paths and reject conflicting directory ancestry before identity creation; recheck arm separation in `paired-report`. Cover aliases and overlapping roots.

### IA1-F4 — P1: Completed blocks accept pause/preflight attestations after completion

**Location:** [qsfog-intervention-report.ts:570](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:570).

Timestamp syntax and timezone are checked, but pause/preflight times are not ordered against C1.

**Probe:** Recompute the freeze for an otherwise valid block containing:

```text
C1 start:           2026-09-14T09:01:00-04:00
C2 end:             2026-09-14T09:25:00-04:00
allLanesPaused.at:   2026-09-14T10:00:00-04:00
preflight.checkedAt:2026-09-14T10:01:00-04:00
```

**Output:** `validateCompletedBlock(block, false)` **accepted**.

**Minimal change:** Require both attestations to precede C1’s start. Add independently failing timestamp cases with correctly recomputed freezes.

### IA1-F5 — P1: Missing eligibility evidence becomes “incomparable” instead of invalid

**Location:** [qsfog-intervention-report.ts:1770](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:1770).

`candidateEligibility()` treats missing or malformed state evidence like authenticated `archivedControlEligible:false`.

**Probe/output**, for expected state `s`:

| `manipulationValidation.states` | Result |
|---|---|
| `{}` | `false` |
| `{"s":{}}` | `false` |
| `{"s":{"archivedControlEligible":"true"}}` | `false` |
| `{"s":{"archivedControlEligible":false}}` | `false` |
| `{"s":{"archivedControlEligible":true}}` | `true` |

The first three then follow the same promotion path as genuine ineligibility. Conversely, a lone `true` supplies no proof of the remaining capture-eligibility checks.

**Minimal change:** Validate complete, typed eligibility/provenance evidence before returning a boolean. Missing or corrupt evidence must throw; reserve `INCOMPARABLE_FRESH_RECAPTURE_CONTROLS_REQUIRED` for authenticated unchanged-A1 mismatch.

### IA1-F6 — P1: Required isolated boundaries remain unproved

**Locations:** [test:551](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/qsfog-intervention-report.test.ts:551), lines 600 and 672.

Three concrete gaps:

- The condition-3 fixture produces conditions **`[true,false,false,true,true,true,true]`**: condition 2 fails alongside condition 3.
- The purported **24.999%** fixture actually tests **24.9875%**: `(40000−30005)/40000`.
- The odd/even test checks reference-count presentation, without pinning the resulting rate or promotion boundary.

Two plausible additional mutations survived **all 50 replayed assertions**:

| Mutation | SHA-256 | Result |
|---|---|---|
| Round the reference rate down while preserving the displayed half-integer count | `9cff56d21baeeb0c67642c475250b96bc2dbb0262ed7fc21d80d3f4c9e087565` | 50/50 pass |
| Weaken ≥25% to ≥24.99% | `6c7d1dc73e8f926aa9607839cd5e9db391dc8803cd6024451fd28f0137a7cf88` | 50/50 pass |

The first changes the observed odd-reference rate from **`79/10662`** to **`13/1777`**.

**Minimal change:** Make the LOO boundary fail only condition 3; test the actual named percentage; assert odd/even rates and verdict boundaries. Explicitly assert the other six conditions remain green.

### IA1-F7 — P2: Hand-back and on-disk operational record disagree

**Locations:** [qsfog-intervention-report.ts:518](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:518), lines 1470 and 2253; plan’s operational template around line 650.

Two incompatibilities affect use of the supplied record:

1. The template stores `paths.identityManifest` as `…/unchanged128/manifest.json`; implementation requires the **directory**, then appends `manifest.json`.
2. `computeBlockFreezeSha256()` includes `candidateManifestSha256`; the documented immutable subset excludes it—even when null for a repeat-only block.

**Probes/output:**

```text
plan record identity output equal? false
record template preflight ERROR:
unusedPathPreflight.paths differs from the exact planned output set.
```

For the same synthetic repeat-only block:

```text
documented subset: b6ca731d86b7e7a8c7afa404ddee9c4515b6928b41f5c182a630a2348cf44a94
implementation:    7fd6830e8f3428cedb1ac04c8281de7acf723c65bd61c856df6c70d3c4448ab2
```

**Minimal change:** Supply one reconciled, concrete Increment-A record and freeze definition. This finding concerns hand-back compatibility; it does not reopen Increment B’s rejected measurement.

### IA1-F8 — P2: “Full PNG structure” validation accepts a PNG without image data

**Location:** [qsfog-intervention-report.ts:1238](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:1238).

**Probe:** Keep a valid signature, IHDR and IEND, remove IDAT, and provide the resulting bytes’ matching SHA.

**Output:** `validateIdentityPng()` **accepted the 45-byte file**.

**Minimal change:** Validate required chunk presence/order and relevant chunk integrity. Retain independent SHA and dimension checks.

## Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| **1. Plan fidelity** | **FAIL** | Core formulas, fixed 5,331/348 denominators, accounting and ordinary flag rejection are sound; F1–F5 expose missing output/authentication guarantees. |
| **2. Producer → real consumer** | **PASS, inspected** | Test imports the real exported `runScreenshotProbe` from `tools/ai-dm-screenshot-probe.ts`, invokes the production builder, and checks copied bytes, answerer bytes, row SHA and original SHA. |
| **3. Boundaries** | **FAIL** | F6. Remaining named threshold, 4/5, stable-loss, separate FN, regression, strict-spread, zero-reference and boolean eligibility cases are present and passed replay. |
| **4. Mutants** | **Requested eight replayed** | Eight killed; two additional plausible mutations survive. No claim of independently rerunning all 34. |
| **5. Hand-back** | **FAIL as supplied** | All four commands parse; record compatibility fails under F7, and repeatability output is incomplete under F1. |
| **6. Anything new** | **PASS with noted gaps** | Exactly two added files; no dependency changes, timers, explicit network/model calls, `ts-ignore`, skipped tests or TODOs. Explicit production writes target declared outputs. |

### Producer-consumer inspection

At [test:850](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/qsfog-intervention-report.test.ts:850), the builder output is read and compared with the original bytes. Lines 853–889 invoke the real probe and assert answerer bytes and both SHA fields.

The production export is at [ai-dm-screenshot-probe.ts:4049](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4049). Its override branch prevents `BoardSnapshotService.start`, ignores injected capture, and leaves `ownedService` null; the finalizer only closes `ownedService`. The injected throwing `capture`/`close` functions therefore remain untouched.

## Eight mutation replays

Read-only Node stdin harness: TypeScript transpiled in memory; filesystem assertions used an in-memory filesystem. Baseline: **50/50 assertions passed**. Three scorer/accounting tests and the producer-consumer integration test were excluded from this replay.

| Mutation | Applied SHA-256 | Failing assertions |
|---|---|---:|
| Cancelling spread | `a434436401d4bf95934a1ddde7feb9489d4de1022c36486231d08e3a53e9b446` | 2 |
| Zero family credited | `01c2cc64e63c19497e783ebbf81417a5948cc549ca3a1128696ed88468ce8783` | 1 |
| Half-integer count floored | `9ed0b1e8398d31d93f3854adb75504e33acfd0b5734600ea4e80e13704bed379` | 1 |
| Check interruptions only within arms | `5a5add9bcadc9b383b62b63650fc4bd8fdd6c352147b249012427e88f92b6a09` | 1 |
| Derive `.md` instead of `-summary.md` | `ac6ba77c791737c5fb79db757941707b323b6a9e6911bc13c2c36e72ea18de35` | 16 |
| Compare height twice, omitting width | `a369f1be689457a3578bf3eb27c2ee1eb29dc189fdb35b86a7e7e8301313b566` | 1 |
| Preflight ignores existing directories | `adea76294b6d99806be13ceb01b608a41a25e989842134d38f43332c4f2f9269` | 17 |
| LOO `>0` → `>=0` | `d739198e3613a2b8aad91f1719bf65e9c4eaa348bf495de22743a933bf1c3119` | 1 |

LOO reproduces the implementer’s exact applied SHA. The other seven are equivalent reproducible mutations; the report supplied hashes without their edit expressions.

## Commands and verification limits

Executed:

```bash
git status --short --untracked-files=all
git rev-parse HEAD
git show --stat --oneline ec0a29116e675fdbd5f00114c4e58884f4cb32ed
git diff-tree --no-commit-id --name-only -r ec0a29116e675fdbd5f00114c4e58884f4cb32ed
git diff ec0a29116e675fdbd5f00114c4e58884f4cb32ed^ ec0a29116e675fdbd5f00114c4e58884f4cb32ed --check
npx vitest run --configLoader runner tests/unit/tools/qsfog-intervention-report.test.ts
npx vitest list --configLoader runner --filesOnly --json
```

Additional probes used `node <<'NODE'` with read-only/in-memory bodies recorded in the tool transcript; inputs, mutations and outputs are reported above.

Results:

- Native test command: **exit 1, zero tests executed**, `ENOENT` creating `/tmp/…/ssr`.
- Discovery: **600 files**, exactly one new QSFOG spec, **zero fixture-directory paths**.
- Source selection: **24/24 rows pass the source schema**; diagnosis: **24 states / 6,988 cells**, fixed denominator checks pass.
- All four hand-back commands parse. C1/C2 derive `answers/c1-summary.md` and `answers/c2-summary.md`.
- Diff check: **exit 0**. Final worktree status: **empty**.
- Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Supervisor’s **136 tests / four suites**, tsc and sg results remain supervisor evidence; I did not rerun those gates.

**REJECT QSFOG A — blockers IA1-F1, IA1-F2, IA1-F3, IA1-F4, IA1-F5, IA1-F6.**

QSFOG A REVIEW R1 DONE