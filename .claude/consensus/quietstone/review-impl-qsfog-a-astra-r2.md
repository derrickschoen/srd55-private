# QSFOG-SVG-01 Increment A review r2 — gpt-6-astra (read-only)

Reviewed e3aa9bc6. Session 01a0a257-02d0-7ba1-9616-d837b6417d9d. Log .tmp/runs/fanout/review-impl-qsfog-a-r2.log.

# REJECT QSFOG A

**Blocking finding: IA2-F1.** Six r1 findings are resolved; eligibility and PNG validation remain partially resolved.

Reviewed clean HEAD `e3aa9bc6622df6a1de4d64372cb468161428384c`. No files written, agents invoked, or model/browser phases run.

## Findings

### IA2-F1 — P1: Complete but invalid capture evidence still passes eligibility

**Locations:** [qsfog-intervention-report.ts:348](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:348), [validation:2055](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:2055).

Missing fields now throw correctly. However, the validator checks field types and selected hash relationships without enforcing the required nonzero intervention or changed-region consistency.

**Independent probe:** Constructed complete evidence for the **24 actual frozen state IDs**, preserving their source PNG metadata, state digests and canonical truth hashes. Every state has **one true-fog cell**. Set:

```text
resultPngSha256 = sourcePngSha256
bRgbaSha256 = a1RgbaSha256
visualDomAfterSha256 = visualDomBeforeSha256
changedRegion = {
  pixels: 0, outsidePixels: 0, fraction: 0,
  bounds: null, perFogCell: []
}
archivedControlEligible = true
```

**Output:**

```text
states: 24
trueFogCounts: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
zeroChangeEligibility: true
```

A separate complete fixture with **`pixels:0, fraction:1`** also returned `true`.

The report’s surrounding block/source authentication does not reject these changed-region values. Consequently, condition 7 can remain green for an intervention that made no change, or for internally contradictory evidence. This leaves IA1-F5’s requirement—only otherwise valid, authenticated capture evidence reaches a boolean verdict—unfinished.

**Minimal change:** Enforce nonzero changes for the frozen fog-bearing states, consistent A1/B evidence, and meaningful changed-region relationships. Add isolated negative tests using complete evidence. These failures must throw `INVALID_INPUT`, including when archived-control eligibility is false. This requires no Increment-B measurement redesign.

### IA2-F2 — P2: PNG chunk ordering remains incomplete

**Location:** [qsfog-intervention-report.ts:1523](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:1523).

The fix rejects missing IDAT, misplaced/duplicate IHDR and corrupt CRCs. It still accepts a non-consecutive IDAT sequence:

```text
signature → IHDR → IDAT → tEXt → IDAT → IEND
```

**Probe:** Built that sequence in memory with valid chunk CRCs, matching whole-file SHA and valid dimensions.

**Output:** `validateIdentityPng(...)` **accepted**.

**Minimal change:** Track whether the IDAT sequence has ended and reject subsequent IDAT chunks. Add a matching-SHA/valid-CRC ordering regression.

## Re-verification table

| Dimension / r1 finding | Verdict | Independent evidence |
|---|---|---|
| **IA1-F1: control reporting** | **RESOLVED** | 27 columns, 23 data rows; means, rates, spread, headroom, positives and five LOO rows present. Markdown contains five LOO entries. |
| **IA1-F2: rational overflow** | **RESOLVED** | Eight-union fixture serializes the exact numerator/denominator as strings; no throw. |
| **IA1-F3: output aliases/ancestry** | **RESOLVED** | Both preflight and real exported `runPairedReport` reject resolved aliases and nested outputs. |
| **IA1-F4: late attestations** | **RESOLVED** | Independently changed pause/preflight timestamps, recomputed freezes; both rejected. |
| **IA1-F5: eligibility** | **PARTIAL / FAIL** | Missing/malformed/lone-true evidence throws; complete no-op and contradictory evidence still pass—IA2-F1. |
| **IA1-F6: boundaries** | **RESOLVED** | LOO fails only condition 3; exact percentage and odd/even rates verified; both previous survivors now killed. |
| **IA1-F7: freeze/hand-back** | **RESOLVED** | Generator freeze matches production; seven-path preflight passes; completed record passes; all four commands parse. |
| **IA1-F8: PNG validation** | **PARTIAL** | Original no-IDAT defect and CRC checks fixed; non-consecutive IDAT remains—IA2-F2. |
| **Mutation replay** | **PASS, bounded** | 10/10 selected ledger mutations killed, including all eight new entries; every SHA matches the ledger. |
| **New behavior/scope** | **PASS** | Exactly two changed files; no added dependencies, explicit network/model calls, timers, `any` types, suppression directives or skipped/TODO tests. |

## Report and boundary evidence

The repeatability summary’s exact column set is:

```text
scope,key,control_spread,control_mean_difference,threshold,control_c1_mean,control_c2_mean,reference_mean,score_headroom,denominator,control_c1_count,control_c2_count,reference_count,control_c1_rate,control_c2_rate,reference_rate,control_rate_difference,rate_spread,rate_headroom,twice_spread_below_headroom,fog_fn_c1,fog_fn_c2,obscured_fn_c1,obscured_fn_c2,stable_positive_facts,disputed_positive_facts,verdict
```

Rendered through `calculateControlBaseline`, which incorporates `calculateRepeatability`:

- **24 lines including header / 23 data rows**: 1 overall, 5 base, 5 LOO, 2 family, 10 family-base.
- Fixture stable/disputed positives: **20 / 3**.
- Fixed pooled denominators: **5,331 / 348**.
- Markdown: **five** `Remove …` entries.

Exact rational serialization:

```json
{"numerator":"272598129945484","denominator":"31249487656358033"}
```

Isolated promotion results:

| Probe | Result |
|---|---|
| Remove `5763040`, LOO reaches zero | `[true,true,false,true,true,true,true]` |
| Reduction `24999/100000` | Only condition 6 fails |
| Reduction `1/4` | All seven pass |
| Odd reference rate `79/10662` | Only condition 6 fails |
| Even reference rate `40/5331` | All seven pass |

Path and timestamp probes returned:

```text
Planned output overlap: c1Jsonl and c2Jsonl.
Planned output ancestry conflict: c1Jsonl and c1ImagesRoot.
All-lanes-paused attestation occurs after C1 started.
Unused-path preflight occurs after C1 started.
```

PNG controls:

```text
Valid PNG:                  accepted
45-byte no-IDAT PNG:         rejected — IDAT chunk is missing
IDAT before IHDR:            rejected
Duplicate IHDR:              rejected
Corrupt IDAT CRC:            rejected
Non-consecutive IDAT:        accepted
```

## Mutation replay

Baseline: **61/61 replayed tests passed**. As in r1, three scorer/accounting tests and the producer→consumer integration test were excluded from this in-memory harness; the supervisor’s native **65/65** result remains separate evidence.

All mutations below reproduced the report’s **exact applied SHA**:

| Mutation | Applied SHA-256 | Failing tests |
|---|---|---:|
| ODD_REFERENCE_RATE_ROUNDED | `59bddfd1de3e785a834d52b24fbdb55e34a8d88f9fa8f1157b87e97ce7884d41` | 1 |
| WEAK_24_99_PERCENT | `b603e820df0ff22020bce4461a3a002e7bd577cf8f191448204b8868f3646d31` | 1 |
| PATH_ALIAS_ACCEPTED | `84abe37057995b0ef3882111f480858fadd1deaee11354e2f65fea8bb9f9c41d` | 1 |
| ATTESTATION_AFTER_C1 | `f976b5f7dac3549b735c4308e589006f9063ea8598e71c6be4f1dd265c3ace1e` | 1 |
| EVIDENCE_MISSING_AS_FALSE | `9649bce4906f24056b2c71f854cb22a64fa196c1574ecd6954b883b823fb6f51` | 2 |
| NO_IDAT_ACCEPTED | `b335314f2b483a4a54e4bdfc8914343a22cad5f682387294d6165299e26a5fb1` | 1 |
| LOO_ROWS_DROPPED | `a203ec8b29cca230994c27db5e41436f136cabe281c8bc60e5322965e01f0975` | 1 |
| RATIONAL_OVERFLOW | `c29163ff422cd64c3404dbc06eb92c3284a4a8254e8a60bc3330aa59cf05ce10` | 1 |
| CONDITION_3_POSITIVE_LOO | `4d1773b0a3b3874f45f5d114df48515dfebc8ff618fea1226f5e7d98628f1136` | 1 |
| GAP_INTERRUPTION | `7af2d5b23c462ee777482547514a28c24146545c3bb0f46ea8772986aafc4ddd` | 1 |

The first two replay the mistakes represented by r1 survivors `9cff56d2…` and `6c7d1dc7…`; both now fail their intended boundary tests.

## Block generator and hand-back

Executed the report’s **three exact Node script bodies** against a virtual filesystem. Archive PNG/terminal bytes and arm outputs were synthetic; prohibited archive paths were never read. Git/date responses were injected using the independently checked HEAD/clean status and explicit test timestamps. A direct Node child-process attempt encountered sandbox `EPERM`.

Results:

- Generated record passes schema validation and **seven-path preflight**.
- Documented freeze and `computeBlockFreezeSha256` both produced:

```text
7cc7de07583c2a01914cb87b792b4ccfdfcf1c9d82b70839a6f3378895cfcf8c
```

- Changing either mutable manifest hash leaves the freeze unchanged.
- Initial unstarted record correctly fails completed-block validation.
- After the provided completion script: **C1 24/24 answered, C2 24/24 answered**, completed-block validation passes, freeze unchanged.
- Source-image-set and both arm-tree digest framings match production helpers.
- Identity, C1, C2 and paired-report commands all parse with block ID **`20260914-qsfog-a-fix-r1-01`**.
- `paths.identityManifest` now consistently denotes `…/unchanged128/manifest.json`; preflight checks its parent directory.

No remaining hand-back path incompatibility was found.

## Commands and final checks

Executed read-only commands included:

```bash
git status --short --untracked-files=all
git rev-parse HEAD
git show --stat --oneline e3aa9bc6622df6a1de4d64372cb468161428384c
git diff ec0a2911 e3aa9bc -- tools/qsfog-intervention-report.ts
git diff ec0a2911 e3aa9bc -- tests/unit/tools/qsfog-intervention-report.test.ts
git diff ec0a2911 e3aa9bc --check
git diff-tree --no-commit-id --name-only -r e3aa9bc6622df6a1de4d64372cb468161428384c
npx vitest list --configLoader runner --filesOnly --json
```

Node stdin probe bodies and exact mutation expressions are recorded in the tool transcript; they transpile and execute in memory.

Final results:

- Discovery: **600 files**, one QSFOG spec, **zero fixture-directory paths**.
- Diff check: **exit 0**; final status empty.
- Production: **3,245 lines**; tests: **1,232 lines**; maximum length **119**, zero lines over 120.
- Frozen contract SHA unchanged: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Native Vitest remains unavailable from the r1 sandbox result. Tsc/sg and **147 tests across four suites** are supervisor evidence.

**REJECT QSFOG A — blocking list: IA2-F1.**

QSFOG A REVIEW R2 DONE