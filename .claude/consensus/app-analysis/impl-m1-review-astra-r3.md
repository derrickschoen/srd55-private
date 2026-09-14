# M-1 implementation review r3 FINAL (astra 01a09def-537c-71f0-b1cc-bfee52279566) on 229962c3, harvested 2026-09-13 23:34

No P1 remains. One non-blocking P2 residual should accompany the landing note.

**I3-F1 — Cast guard provides incomplete protection. P2; blocks: no.**

At [gate-evidence-reporters.test.ts:435](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:435), the guard checks literal substrings. My in-memory probes confirmed:

| Reintroduced assertion | Guard rejects |
|---|---|
| `as TestCase` | Yes |
| `as VitestSpecification` | Yes |
| `as unknown as TestCase` | Yes |
| `as PlaywrightTestFixture` | No |
| `as any` | No |
| `as` followed by newline and `TestCase` | No |

Minimal change: inspect TypeScript assertion nodes, allowing only the designated JSON-boundary assertion. This is a regression-protection limitation; the current callback fixtures no longer contain the offending assertions.

The only surviving assertion cast is `JSON.parse(...) as T` at [line 160](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:160). The lane correctly identifies its serialization-boundary purpose. It is **not unavoidable**—runtime validation could replace it—but it does not conceal the callback-input shapes being tested. The import alias and guard strings are not assertion casts.

Also, `hasReporterConstructor<T>` at line 149 checks that the default export is a function; it does not prove constructability or arbitrary `T` compatibility. The installed-type projections and exercised lifecycle calls provide the substantive evidence.

**I2 disposition**

| Item | Disposition | Evidence |
|---|---|---|
| I2-F1 | **RESOLVED** | [gate-vitest.mjs:45](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:45), line 96: actual parser declarations preserve the requested supported forms; results below. |
| I2-F2 | **PARTIAL — non-blocking residual** | [gate-evidence-reporters.test.ts:70](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:70): installed-type projections and annotated factories replace shape-hiding callback casts. Guard limitations remain, I3-F1. |
| I2-F3 | **RESOLVED** | [gate-runners.test.ts:158](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:158): default and complex scenarios receive both files; only dedicated parser probes receive one. Lines 204–209 assert initial `[failedFile, unrelatedFile]` and retry `[failedFile]`. |
| I2-F4 | **RESOLVED** | [gate-verdict.test.ts:321](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:321): production passes the swap test; deleting only association rejection kills its initial and independently evaluated retry assertions. Both swaps retain equal file sets and zero duplicates. |
| Playwright retry invariant | **RESOLVED** | [gate-runners.test.ts:368](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:368), [gate-playwright.mjs:46](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-playwright.mjs:46): complex control checks caller-option stripping, zero retries in both phases, one retry worker, retained selectors and exact selected files. |

I evaluated the actual Vitest parser declarations in memory and passed their output through installed `parseCLI`:

| Caller form | Verified retry result |
|---|---|
| `--test-name-pattern abc a` | `testNamePattern:"abc"` |
| `--no-watch false a` | `watch:false`; positional `"false"` removed |
| `--testNamePattern=abc`, `-t abc` | `testNamePattern:"abc"` |
| `--no-isolate`, `--isolate=false` | `isolate:false` |
| `--project unit --project other` | `project:["unit","other"]` |
| `--browser.name chromium` | `browser.name:"chromium"` |
| `--sequence.seed 123` | `sequence.seed:123` |
| `--inspectBrk address`, `--inspect-brk address` | Identical `inspectBrk` value |

Every retry above had only the replacement file filter. The six lane probes also reproduced successfully, including initial scheduling constraints, separate boolean values and one `configLoader`.

Mechanical derivation covers every current `VALUE_OPTIONS` entry. Dots remain dots; `inspectBrk` becomes `inspect-brk`. Replacing dots with hyphens is **not** equivalent: installed `parseCLI` produces distinct `browserName`/`sequenceSeed` keys for `--browser-name`/`--sequence-seed`. The mechanical-membership test does not establish universal installed-CLI alias equivalence.

For Playwright, I evaluated the actual wrapper body with process/artifact boundaries stubbed in memory. Both `--retries=7` and `--retries 7` were removed in both phases; retry retained config/project/grep, forced one worker and selected only the failed file.

**Mutation table**

“Executed” denotes in-memory probes; “static” denotes inspection of the retained assertions, not a suite mutation run.

| Deletion | Counterexample and assessment |
|---|---|
| Nonzero process-exit rejection | **Static kill:** `gate-verdict.test.ts:181,187`, late exit 1 and exit 2 process-failure assertions. |
| Signal rejection | **Static kill:** `gate-verdict.test.ts:191`, signal independently fails the process domain. |
| UUID mismatch rejection | **Static kill:** `gate-verdict.test.ts:412`, exact invocation-mismatch reason. |
| `onProcessTimeout` handling | **Static kill:** `gate-evidence-reporters.test.ts:512`, timeout fields/reason; classifier-policy removal also caught at `gate-runners.test.ts:483`. |
| Initial global failure surviving green retry | **Static kill:** `gate-runners.test.ts:421`, both runners retain initial reporter failure and final red. |
| Duplicate-result rejection | **Executed kill:** `gate-verdict.test.ts:262`; deleting only `duplicateExecutionIds.length > 0` changes discovery from failed to complete. Association mismatches remain empty and file sets equal. |
| Unlisted/identity-mismatch rejection | **Executed association kill:** `gate-verdict.test.ts:321`, initial and retry swaps independently fail. **Static combined-guard kill:** substitution at line 277. File-set rejection alone remains redundant with the other identity checks in these fixtures. |
| Kebab normalization | **Executed kill:** retry `testNamePattern` changes from `"abc"` to `true`; assertion at `gate-runners.test.ts:321` fails. |
| Negated-flag handling | **Executed kill:** retry filters become `["false", replacement]`; assertion at `gate-runners.test.ts:330` fails. |
| Playwright `--retries` stripping | **Executed counterexample:** caller `--retries=7` survives alongside `--retries=0`; exact assertions at `gate-runners.test.ts:368` fail in both phases. |

All original test names remain. Parameterized totals increase **28+22+20 = 70 → 32+23+21 = 76**. No expectation was weakened; the two removed membership assertions were replaced with stronger exact-selection assertions.

Both diffs remain within M-1. No new dependency, application/schema change, existing timeout adjustment, additional phase, or worker increase appeared. No new order or shared-worker dependence was found; the proof sentinel and serial Playwright fixture retain their intentional dependencies.

Six syntax checks and both diff checks passed independently. The **76/76**, TypeScript, structural checks and real-runner proofs remain supervisor-supplied verification; I did not rerun those launches. No files or git state were changed, and HEAD remains `229962c3` with a clean worktree.

**ACCEPT IMPL M1**

M1 IMPL REVIEW R3 DONE