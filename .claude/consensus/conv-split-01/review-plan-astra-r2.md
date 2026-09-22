**VERDICT: REVISE — four P1 findings remain open, plus one P2 normalization gap and one P3 prediction correction.**

Reviewed `7c91e96bc5ab3879410a4b11d3a8fcbe7f79dccc`; plan SHA-256 matches `ff808d5a510fdb739b4050b98cbb5161aea5e4db1ce7b709c7358ffc71322f65`. Only source inspection and read-only static analysis were performed. No tests, builds, type checks, or writes.

1. **P1-1 filename consumer — CLOSED.**

   [Plan:15](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:15): “The A/B boundary is therefore 2795/2796.”

   Both consumers at mutation-ledger lines 111 and 132 retain their required strings: conversation lines 1817 and 2760 remain in A. Line 2795 is blank; 2796 opens `it(`.

   Independently joined the AST blocks to all 110 recorded duration rows:

   | Slice | Blocks | Tests | Seconds |
   |---|---:|---:|---:|
   | A | 48 | 59 | 166.650 |
   | B | 5 | 5 | 165.662 |
   | C | 23 | 26 | 162.982 |
   | D | 19 | 20 | 157.372 |

2. **P1-2 helper extraction — NOT CLOSED: the specified array range truncates a declaration.**

   [Plan:30](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:30): “these exact removals … the two mutable array constants (791–798).”

   [Plan:32](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:32) repeats “verbatim copies … (lines 791–798).”

   Actual complete declarations are:

   - `LEGACY_BLOCK_ARGS`: **791–793**.
   - `ALL_OPTIONS_TEST_RENDERER_ARGS`: **795–809**.

   Line 798 is only `rows: 'off',`. Following the prescribed byte surgery leaves orphaned object properties in the fixtures module and incomplete per-file copies. Correct both references and the preservation transform to use complete AST declarations, or lines **791–809**.

   The substantive design otherwise checks out: retain `expect`; A/B/C need both arrays, D needs only `ALL_OPTIONS_TEST_RENDERER_ARGS`; all current array consumers spread them. Offer environments are frozen through their construction chain. The three adapters hold instance state, with no static state. Per-file copies introduce no identified behavioral problem.

3. **P1-3 recorder — NOT CLOSED: the invariant is right, but the collection procedure breaks its coverage.**

   [Plan:72](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:72): “remove the `kbInputs` declaration … all 110 tests.”

   Removing that declaration leaves unresolved `kbInputs` accesses at [conversation:2966](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/tools/ai-dm-conversation.test.ts:2966), 2967 and 3035. Two tests then fail before completing their original paths. Both arms can produce equal observation unions simply because both omitted the same work.

   Preserve the declaration and reader binding. On both throwaway checkouts, disable **only its attachment to recorder state**, for example by an explicitly specified diagnostic patch to the registration assignment in `declareTestInputs`. Leave path validation and readers intact. Require all 110 tests to execute successfully and require exactly one base record and four candidate records before comparing.

   **Yes:** family-wide observation-union equality, including external observations, plus C’s declared-mode audit list being a subset of the corresponding full baseline audit list, is the appropriate informational invariant. It does not require fixing the pre-existing recorder audit.

   **New P2 — normalization is still unspecified.** “A fixed rule stated in the script” delegates the substantive comparison policy to implementation. Freeze narrow mappings in the plan: checkout-root substitution, identified PID components such as `/proc/<pid>/cgroup`, and explicitly identified infrastructure probes. Preserve operation/kind and remaining path components; fail on unexplained differences. In particular, recorder records include snapshot-path probes, while its audit separately exempts the active file’s snapshot path at [recorder:73](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/helpers/verdict-fs-recorder-setup.mjs:73). Specify how the four renamed snapshot probes compare with the original. Do not broadly collapse temporary paths or remove external observations.

4. **P1-4 preservation — NOT CLOSED: the count invariant excludes preserved helper code, and relocated bindings lack explicit checks.**

   [Plan:58](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:58): “Counts recorded: `expect(`, `throw `, `mulberry32(`, 64-hex literals, `timeout:` across the four files equal the base.”

   A correct extraction cannot satisfy that statement:

   | Occurrences | Original file | Four test files after extraction |
   |---|---:|---:|
   | `expect(` | 443 | 437 |
   | `throw ` | 83 | 54 |
   | `mulberry32(` | 1 | 0 |
   | 64-hex literals | 1 | 0 |
   | `timeout:` | 48 | 48 |

   Count the fixtures module **once** alongside the four test files, or compare test-block and helper inventories separately.

   Also explicitly require byte equality for every local array copy and C’s complete `kbInputs` declaration. Those declarations are outside the recorded `callText` and excluded from the fixtures byte comparison. Merely recording import specifiers supplies no acceptance predicate for them: require preserved local-name/import-source bindings, with only the specified helper relocation permitted. Type checking alone cannot distinguish the original wrapper from a signature-compatible alternate import.

   The full-call AST comparison, describe-title preservation, local helper comparison, and revised mutants are otherwise sound proposed controls. Fixture-path removal retains the reader binding; declaration deletion has a separate structural check; shared-state mutation is killed by fixture bytes; each new D583 name is exercised separately. No kills have yet been observed.

5. **P1-5 acceptance — NOT CLOSED: test counts and cache chronology contradict the implementation.**

   [Plan:80](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:80): “tests 11 479 in every run” and “thereafter both caches receive the same number of runs.”

   Two corrections are required:

   - **Added-control count:** line 40 adds one D583 test. Baseline remains **11,479**; candidate becomes **11,480**, with the exact title delta being that new control. Conversation-family count remains 110; file counts remain 643/646.
   - **Cache parity:** one prewarm per arm followed by baseline-only A/A leaves A with three prior runs and B with one before pairing. Specify A/A on a separate disposable cache, then fresh equally prewarmed caches for the three measurement pairs. Update the run/time accounting accordingly.

   The two acceptance thresholds, corrected historical spans, file counts, family count, and disqualifying-new-red rule are otherwise satisfactory. The bounded conflict rule also works: permit only one complete repeat and require both trial medians to pass. A repeat must never erase a new red. Use inherited §8’s explicit calculation: median baseline wall minus median candidate wall.

   **New P3 — prediction remains internally contradictory.** [Plan:26](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:26) predicts “410–560 s” while calling the historical **561 s** completion a lower bound. Neither historical completion is a proven bound under the changed schedule. Keep them as scheduling observations and label the range an unvalidated estimate without those bound claims.

6. **P2-6 timing table — CLOSED.**

   [Plan:13](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:13): “110 rows, 652.666 s” and “LPT max 163.2 s.”

   The static join confirms the revised table above. Moving the single 32 ms test back gives the former A **47 blocks / 58 tests / 166.618 s**. Total **652.666 s** is correct, and the unsupported optimality claim is gone.

7. **P2-7 branch transplant — CLOSED.**

   [Plan:87](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:87): “a three-way transplant of each branch’s merge-base delta (imports, helpers, modified blocks)” and “Not applied in this unit.”

   This preserves the identified existing-block edits and gives the correct future comparison target.

8. **P2-8 manifests and clean-Git control — CLOSED, subject to the acceptance-count correction above.**

   [Plan:46–49](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:46): “literal sorted lists,” “exactly the three added names,” and “a cross-check, not the source.”

   [Plan:40](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:40) specifies the successful merge-base and both empty diffs. That correctly fills the gap left by the missing-merge-base control.

   Independently reproduced all four digests from source filename literals. New values remain:

   ```text
   143: 700a277da436a2cd1798b291e13825ffd4ea973a161e6ce4cb5c03390cd2c6d4
   151: ef991c2c66424d643926ddc9205b4ddb0f034cad8ba20e9610a001d0c30474dc
   ```

   No additional defect found in the seam control itself.

9. **P3-9 time estimate — CLOSED for the original omission.**

   [Plan:83](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:83): “2 prewarms + 2 A/A + 6 paired runs,” “plus quiet waits and diagnostics,” and “a conflict repeat doubles it.”

   Prewarms and the possible repeat are now included. Recalculate once the cache-parity sequence is corrected.

The rejected partitioning, naming, mandatory-green recorder prerequisite, and smoke-body changes remain rejected; this review does not reopen them.

CONV-SPLIT-01 PLAN REVIEW R2 DONE