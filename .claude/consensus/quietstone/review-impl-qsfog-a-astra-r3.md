# QSFOG-SVG-01 Increment A review r3 (final) — gpt-6-astra (read-only)

Reviewed f6e564c9. Session 01a0a257-02d0-7ba1-9616-d837b6417d9d. Log .tmp/runs/fanout/review-impl-qsfog-a-r3.log.

# ACCEPT QSFOG A

**Blocking list: none.** IA2-F1 and IA2-F2 are resolved. No new IA3 findings, blocking or non-blocking, were found within Increment A.

Reviewed clean HEAD `f6e564c9d2de994847c889ac8c06daa781e30d09`. No files written, prohibited archives read, agents invoked, or model/browser phases run.

## Dimension → verdict

| Dimension | Verdict | Independent evidence |
|---|---|---|
| IA2-F1: invalid complete evidence | **RESOLVED** | **288/288** invalid probes rejected across all 24 frozen states and both eligibility paths. |
| Legitimate evidence and geometry | **PASS** | Valid complete sets return `true`/`false` correctly; zero-fog equality accepted. Actual bitmap implementation confirms origin **52**, tile size **128**. |
| IA2-F2: IDAT ordering | **RESOLVED** | Interrupted IDAT sequence rejected; valid consecutive IDAT chunks accepted. |
| Mutation replay | **PASS** | **8/8** selected mutants killed; every applied SHA matches the ledger. |
| Scope of fix | **PASS** | Entire two-file diff inspected; changes address the two findings. |
| Earlier review residuals | **PASS, bounded** | **67/67** in-memory tests pass; previously resolved reporting, rational, path, timing and promotion checks remain green. |
| Supervisor hand-back | **PASS** | Three exact script bodies replayed virtually; seven-path preflight, freeze and completed record pass; all four commands parse. |

## IA2-F1 closure

Locations: [changed-region validation](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:2075), [eligibility validation](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:2158).

For each actual frozen state, I mutated complete evidence independently, with archived-control eligibility both `true` and `false`:

| Mutation | Rejected |
|---|---:|
| No-op B=A1: unchanged PNG/RGBA/DOM, zero changed region | 48/48 |
| Zero pixels with fraction 1 | 48/48 |
| Bounds outside the fog cell | 48/48 |
| Per-fog-cell coordinates disagree with truth | 48/48 |
| Per-cell pixel total disagrees with aggregate | 48/48 |
| Unchanged visual DOM despite claimed pixel change | 48/48 |
| **Total** | **288/288** |

Errors identify nonzero-change, fraction, bounds, coordinate, accounting or A1/B inconsistencies. They propagate to the CLI’s `INVALID_INPUT` handler with exit code 1.

Positive controls:

- Complete valid **24-state** eligible evidence → `true`.
- Complete valid **24-state** archived-control-ineligible evidence → `false`.
- Exact zero-fog A1/B equality → accepted in both eligibility paths.

### Are the rules too strict?

No legitimate-capture rejection was demonstrated for the frozen scope.

The real board implementation supplies a **4-pixel border + 48-pixel coordinate gutter = 52-pixel origin** at tile size 128. I traced this through board metrics, applied CSS, cell layout and the board-element screenshot with device scale factor 1.

The per-cell nonzero requirement is stronger than per-state wording generally, but **all 24 authenticated frozen states contain exactly one fog cell**, making the requirements equivalent here. The fraction uses the allowed fog-tile area, **16,384 pixels per cell**. Exact zero-fog equality matches the plan.

## IA2-F2 closure

Location: [PNG ordering validation](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:1531).

Independently constructed PNGs used valid CRCs and matching whole-file hashes:

| PNG | Result |
|---|---|
| Valid single-IDAT, 67 bytes | Accepted |
| Valid three consecutive IDATs, 91 bytes | Accepted |
| IHDR → IDAT → tEXt → IDAT → IEND | Rejected: `PNG IDAT chunks must be consecutive.` |

## Exact mutation replay

Pristine production SHA:

```text
4a4e76372da97d62afd2429cc5567757a07bb5ef89f1392f2607b1987538affc
```

| Mutant | Exact applied SHA-256 | Failing tests |
|---|---|---:|
| NOOP_CAPTURE_ELIGIBLE | `9d9b8de7775d1b44c4257fd456aef8a6e48b1b33575731a4725063b9757c87df` | 2 |
| CONTRADICTORY_REGION_ELIGIBLE | `04e6a2a7ba88ea23121be32335d0614758b27f220424a0534d26dc84f9f1b5fc` | 1 |
| IDAT_GAP_ACCEPTED | `a0aaced84654bb7bced708323134767196a5c25bbb3ee6774017eb31d52930c9` | 1 |
| ODD_REFERENCE_RATE_ROUNDED | `9b944f73ae029cc1865f8165c04d91b04ff5c3d2b9c6ec45cab9e94677ee76ff` | 1 |
| WEAK_24_99_PERCENT | `e6ba19712c53df729790d81c55b9d28ca106b2f45ed0cbecd8282226b9818147` | 1 |
| PATH_ALIAS_ACCEPTED | `29aa826783a184ea62af35e2780ed770897af90d8a9973a620ad3a2eaf2a0885` | 1 |
| GAP_INTERRUPTION | `eb016af9a374973b1fa0d47da63772af40026487dfa95bf607c5debed434f9b2` | 1 |
| RATIONAL_OVERFLOW | `e754fb1398736399b045439fef65f8ae704075c004d1fea099624d9a6c2367e6` | 1 |

Baseline: **67/67 replayed tests passed**. Three scorer/accounting tests and the producer→consumer integration test remain outside this memory harness. Native Vitest remains unavailable under the previously established sandbox limitation; the supervisor’s **71-test focused suite / 153 tests across four suites** is separate evidence.

## Hand-back and scope

Replayed the report’s three exact Node script bodies against a virtual filesystem, using verified HEAD/status and synthetic archive/arm bytes:

- Block ID: `20260914-qsfog-a-fix-r1-01`.
- Planned paths: **7**; production preflight passes.
- Documented immutable freeze equals `computeBlockFreezeSha256`:

```text
fbbf5244e6c7dd5c9f6d3c746d74917852f2d0195905ea88b4db27866e3c2913
```

- Completion: **C1 24/24**, **C2 24/24**; `validateCompletedBlock` passes; freeze unchanged.
- Identity, C1, C2 and paired-report arguments parse through production parsers.
- Manifest and derived summary paths agree with the record.
- No unsatisfiable path requirement found. Actual archive authentication and C1/C2 execution remain supervisor operations.

The diff is **121 additions/9 deletions** in production and **164 additions/8 deletions** in tests. No added dependencies, network/model calls, timers, `any` types, suppression directives, skipped/TODO tests or additional write destinations were found.

## Commands and final checks

Read-only commands included:

```bash
git status --short --untracked-files=all
git rev-parse HEAD
git show --stat --oneline f6e564c9d2de994847c889ac8c06daa781e30d09
git diff e3aa9bc6 f6e564c9 -- tools/qsfog-intervention-report.ts
git diff e3aa9bc6 f6e564c9 -- tests/unit/tools/qsfog-intervention-report.test.ts
git diff e3aa9bc6622df6a1de4d64372cb468161428384c f6e564c9d2de994847c889ac8c06daa781e30d09 --check
git diff-tree --no-commit-id --name-only -r f6e564c9d2de994847c889ac8c06daa781e30d09
npx vitest list --configLoader runner --filesOnly --json
```

Exact Node stdin probe bodies and mutation expressions are recorded in the tool transcript; execution and mutations stayed in memory.

Final results: **600 discovered files**, zero fixture-directory paths; diff check **0**; clean status; production **3,357 lines**, tests **1,388 lines**, both with **zero lines over 120**. Frozen contract SHA remains:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

**ACCEPT QSFOG A — blocking list: none.**

QSFOG A REVIEW R3 DONE