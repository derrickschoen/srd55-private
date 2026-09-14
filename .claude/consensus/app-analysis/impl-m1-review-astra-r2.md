# M-1 implementation review r2 (astra 01a09dc9-21c8-7620-93ea-bf63f0fae008) on 0e9235c8, harvested 2026-09-13 22:49

One blocking retry-parser defect remains. The fix also leaves type-checking and retained-test requirements incomplete.

**I2-F1 — Retry still changes supported CLI selection. P1; blocks: yes.**

At [gate-vitest.mjs:99](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:99), option lookup recognizes camelCase names but not installed-parser kebab-case equivalents.

My read-only probe against the actual function body and installed `parseCLI` produced:

- Initial `--test-name-pattern abc a`: `testNamePattern: "abc"`.
- Retry: `--test-name-pattern --configLoader runner … b`: `testNamePattern: true`.

Installed normalization converts that value to `/true/` at `node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js:359`. Retry therefore selects different tests; file-level completeness cannot establish that the original failing assertions passed.

The newly added generic boolean-value handling also retains a positional filter after negated options: `--no-watch false a` parses with filters `["false","a"]`; retry incorrectly retains `"false"` beside the replacement file.

Minimal fix: normalize option names using installed-parser semantics before determining ownership/arity, preserve supported option values, and distinguish negated flags from value-consuming booleans. Add parsed retry controls for both examples.

**I2-F2 — Lifecycle fixtures still bypass installed type checking. P2; blocks: no independently.**

[gate-evidence-reporters.test.ts:192](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:192) casts partial objects to `VitestContext`; lines 199 and 207 cast specification/module arrays. Playwright uses `as TestCase` at line 251 and `{ } as FullConfig` / `as Suite` at line 254. Reporter imports also retain `as unknown as` assertions.

These assertions do not establish the promised shape compatibility. The explicitly annotated `TestResult`, `FullResult`, and error objects improve matters, but I1-F6 is only partially resolved.

Use checked fixture factories, captured native objects, or explicitly checked projections of consumed installed API fields. Remove assertions that substitute for validating those shapes.

**I2-F3 — The retained wrapper selection counterexample was weakened. P2; blocks: yes under the explicit no-loosening requirement.**

At [gate-runners.test.ts:150](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:150), default runs now supply only `failedFile`; round 1 supplied both `failedFile` and `unrelatedFile`.

The fake still reports both initial files regardless of argv at [fake-gate-command.mjs:26](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/fixtures/fake-gate-command.mjs:26). Consequently, the retained assertion excluding `unrelatedFile` from retry no longer exercises removal of that original positional argument. Playwright has no replacement complex-argv control.

Restore two-file input for existing scenarios; use single-file input only for the newly added parser probes. Assert both initial filters and the exact retry filter.

**I2-F4 — Identity-mismatch rejection lacks an independent mutation control. P2; blocks: no independently.**

At [gate-verdict.test.ts:274](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:274), substitution also changes the file set. Removing only the `mismatchedExecutionIds.length > 0` rejection predicate leaves that test’s assertions satisfied because `fileSetMismatch` still fails discovery.

An in-memory mutation probe confirmed this. A two-ID/two-file swap preserves both sets: production rejects it, but the predicate mutant certifies discovery. Add that counterexample, preferably in both phases, and assert final rejection.

**I1 disposition**

| Item | Disposition | Evidence |
|---|---|---|
| I1-F1 | **RESOLVED** | `tools/gate-verdict.mjs:123–137`: requires a string, absolute root lexically inside cwd; resolves stock files from it. Missing config/rootDir, non-string, relative and outside-root probes all produced reporter reason `stock-report-malformed`. No cwd fallback. |
| I1-F2 | **RESOLVED**, coverage caveat above | `tools/gate-verdict.mjs:362–387`: duplicate detection consumes preserved raw terminal IDs; association checks retain execution records. Deduplicated projections are computed earlier, but do not erase the evidence used by these checks. Both phases rejected duplicates, substitutions and swaps in my probes. |
| I1-F3 | **RESOLVED** | `tools/gate-vitest.mjs:69`: both requested initial scheduling/filter probes passed. |
| I1-F4 | **PARTIAL** | `tools/gate-vitest.mjs:84–113`: separate boolean values and canonical `--configLoader` fixed; other supported token semantics remain broken, I2-F1. |
| I1-F5 | **RESOLVED** | `tools/gate-verdict.mjs:107–118`; `tests/unit/tools/gate-verdict.test.ts:316`: failure dominates both project-result permutations. My probes produced green reporter domains and passing exact-file retries in both orders. |
| I1-F6 | **PARTIAL** | `tests/unit/tools/gate-evidence-reporters.test.ts:289,320`: lifecycle cases now reach `classifyPhase`. Line 417 tests timeout persistence across a passing retry; wrapper global-error persistence remains covered. Synthetic shape validation remains incomplete, I2-F2. |
| Missing-stock partial | **RESOLVED** | `tests/fixtures/fake-gate-command.mjs:168`; `tests/unit/tools/gate-runners.test.ts:351`: initial exit 0 is supplied and asserted. |
| Retry/global partial | **RESOLVED** | `tests/unit/tools/gate-verdict.test.ts:233`: now reduces both phases and asserts final failure plus retry reporter-domain failure. |

Playwright repeated callbacks are appended at `tools/gate-playwright-evidence-reporter.mjs:94`; my reporter-to-classifier probe rejected them. **A genuine native retry would also be classified as duplicate**, because attempt number is absent from identity. This is outside the gate’s supported execution: `tools/gate-playwright.mjs:47,67` removes caller `--retries` options, and lines 83/105 force `--retries=0` in both phases.

The four requested Vitest probes passed independently. Caller `--configLoader runner` appeared once. Separate `false` remained unchanged for `--passWithNoTests`, `--silent`, and `--watch`; `--silent passed-only` also survived. `--bail` is a numeric option, not boolean: `--bail 0` remained numeric zero, while the parser’s string `"false"` remained unchanged.

Neither entry point is safe to import for a parser-only probe because importing launches the gate. I evaluated their unchanged parser declarations in memory, excluding the executable entry-point body.

**Mutation assessment**

Existing-test kill assessments below are static; the focused suite could not execute. The mismatch-predicate comparison described above was executed entirely in memory.

| Deletion | Test expected to go red |
|---|---|
| Nonzero process-exit check | `gate-verdict.test.ts:187`, **“classifies exit 2 as process failure”**; line 181, **“classifies late exit 1 after successful reports as process failure”**. |
| Signal check | `gate-verdict.test.ts:191`, **“classifies a signal independently of exit status”**. |
| UUID mismatch rejection | `gate-verdict.test.ts:344`, **“rejects sidecar invocation UUID mismatch”**. |
| `onProcessTimeout` handling | `gate-evidence-reporters.test.ts:417`, **“atomically rewrites evidence on process timeout”**. Classifier-side timeout-policy removal is caught by `gate-runners.test.ts:400`. |
| Initial global failure surviving green retry | `gate-runners.test.ts:338`, **“keeps a global reporter failure red while recording a passing diagnostic retry”**, both runners. |
| Duplicate-result rejection | `gate-verdict.test.ts:262`, **“rejects duplicate terminal execution ids before deduplication”**; Playwright callback preservation at `gate-evidence-reporters.test.ts:546` also asserts rejection. |
| Unlisted/mismatch rejection | Removing both association/file-set rejection guards makes **“rejects a scheduled execution id reported for a substituted file”** red (`gate-verdict.test.ts:274`). Removing **only the association predicate: none**—I2-F4. Removing **only the file-set predicate: none**; other identity checks reject its current fixture. Removing diagnostic calculations would fail field assertions, which is weaker evidence than testing rejection. |

All original test names remain: the parameterized totals increase from **23+21+15 = 59** to **28+22+20 = 70**. No test was deleted and no existing expected value was relaxed; the input weakening in I2-F3 prevents an unqualified preservation claim.

Both requested diffs were reviewed. No dependency, application/schema change, existing timeout change, lock-policy change, or additional execution phase appeared. No new order or worker-state dependence was found; reporter accumulators are per instance, and environment stubs have configured cleanup. The proof sentinel and serial Playwright fixture retain their intentional state dependencies.

Six `node --check` commands and both diff checks passed. The targeted Vitest invocation failed before collection with `ENOENT` creating its temporary `ssr` transform directory; **70/70 and the real runner proofs remain supervisor-supplied evidence**, not independently reproduced results. No files or git state were changed; HEAD remained `0e9235c8`, with a clean worktree.

**REJECT IMPL M1**

M1 IMPL REVIEW R2 DONE