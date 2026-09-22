**VERDICT: REVISE — P1 findings must be fixed before implementation.** Reviewed `7c91e96b` and verified both plan hashes. No tests, builds, type checks, or writes were performed.

1. **P1 — The proposed boundary breaks a filename consumer.**  
   [Plan:53](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:53) incorrectly says no other executable consumer exists. [mutation-ledger.test.ts:132](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/vtt/mutation-ledger.test.ts:132) reads the retained filename and requires `hidden_options_logged_once:` at line 135. That entire test starts at conversation line 2760 and moves to B.

   Keep this whole test in A. Moving the A/B boundary to line 2796 preserves contiguity and adds only **32 ms** to A: A becomes **48 blocks / 59 tests / 166.650 s**; B becomes **5 / 5 / 165.662 s**. No consumer or test-body edit is needed. The competing plan correctly identified this constraint.

2. **P1 — The helper extraction removes a required import and exports mutable arrays.**  
   [Plan:28](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:28) removes the Vitest import, but retained helpers call `expect` at [conversation.test.ts:132](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/tools/ai-dm-conversation.test.ts:132), 516, 523, 829, 837 and 842. Retain `import { expect } from 'vitest'`.

   `LEGACY_BLOCK_ARGS` and `ALL_OPTIONS_TEST_RENDERER_ARGS` at [lines 791 and 795](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/tools/ai-dm-conversation.test.ts:791) are runtime-mutable arrays; `as const` supplies compile-time restrictions. Current consumers spread them, so I found no current mutation, but exporting them violates the inherited immutable-helper requirement. Adopt the competing plan’s per-file verbatim declarations, or explicitly specify and verify runtime freezing.

   The offer environments are safe: [build-offer-environment.ts:37](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/offers/build-offer-environment.ts:37) freezes the instance; [offer-environment.ts:116](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/offers/offer-environment.ts:116) deeply freezes its binding; `canonicalEngineQueryPort` is frozen at `engine-query-port.ts:1895`. The three adapter classes have mutable **instance** fields, no static state, and are instantiated within tests. Sharing their constructors is acceptable.

   A byte diff proves preservation, not immutability. A textual “no `let`” check also fails here: legitimate function-local `let`s already exist, while mutable `const` arrays escape it.

3. **P1 — The recorder refutation is valid, but the replacement invariant is insufficient.**  
   I **accept the refutation of the competing plan’s blanket BLOCKED verdict**. The unchanged unsplit source already fails its audit. However, [Plan:71](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:71) overstates what its evidence covers.

   The supplied [run.log:119](/tmp/claude-1000/-home-vagrant-PhpstormProjects-dnd-multiclass-spells-static/c68ffdd0-2e80-4e32-84af-ce3901665155/scratchpad/rec-AfOu/run.log:119) contains **two executed tests, 108 skipped**, and lists:

   - 2 directory inputs;
   - 3 Git files;
   - **7**, not 4, KB files;
   - 6 arena fixture files;
   - 12 `path:` observations;
   - 4 external inputs.

   The decisive [recorder semantics at lines 322–344](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/helpers/verdict-fs-recorder-setup.mjs:322) are:

   ```js
   const declaredInputs = fileState.declaredInputs;
   if (declaredInputs !== undefined) {
     // ...
     if (undeclared.length > 0 || external.length > 0) {
       // ...
       throw new Error(/* audit details */);
     }
   }
   const record = {
   ```

   Thus an undeclared file bypasses enforcement, while a failing audited file throws **before writing its JSON record**.

   [test-inputs.ts:198](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/helpers/test-inputs.ts:198) declares fixture entries as:

   ```ts
   const observation = `file:${path}`;
   ```

   Its directory category accepts only `content/` paths, and [line 223](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/helpers/test-inputs.ts:223) attaches the declaration:

   ```ts
   recorder.current.declaredInputs = declared;
   ```

   These semantics establish a pre-existing failure; they do not establish “no new reads” from **C’s undeclared set alone**. A/B/D could acquire arbitrary reads without violating that invariant, and external inputs are omitted entirely.

   Specify comparable baseline/candidate coverage of all 110 tests, collect successful records **and audit diagnostics**, and compare observations across the **entire family**, including external inputs. Preserve C’s declaration explicitly. Define narrow normalization for checkout/PID-dependent infrastructure paths before comparison. The two-test log establishes pre-existence, not a complete baseline inventory.

4. **P1 — The preservation checker and mutant outcomes need executable definitions.**  
   [Plan:57–65](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:57) is sufficient **in principle** if “block bytes” includes each complete call, parameter table, modifiers, timeout/options and callback, with unchanged describe ancestry and verified imports/helper bindings. A body-only comparison plus sorted titles does not establish all of that.

   Specify an AST checker that fails closed on unfamiliar test forms, records all 95 blocks and 110 expanded cases, and checks helper assertions plus `primaryCodexArgvBytes`. Adopt those details from the competing plan; neither plan currently supplies a completed checker.

   The five mutants have these dispositions:

   | Mutant | Review |
   |---|---|
   | Dropped test | Valid structural kill; select an ordinary one-case `it` to make 109 the expected count. |
   | Edited body | Valid byte-inventory kill. |
   | Undeclared input | **Incorrect as written.** Removing `kbInputs` produces an unresolved identifier/`ReferenceError`, not `Undeclared fixtures test input`; removing the declaration also disables recorder enforcement. |
   | Missing D583 inheritance | Valid count/digest kill; exercise **each** new name, as inherited §1 requires. |
   | Shared state | Exact helper-byte comparison can kill this mutation. Shuffling and an informal review are not the promised deterministic kill. |

   For the input-reader mutant, remove one declared fixture path while retaining the binding; separately verify that deleting C’s declaration fails the declaration-presence check. These are proposed controls, not observed kills—I ran none.

5. **P1 — Acceptance must distinguish measured savings, scheduling predictions and cache parity.**  
   [Plan:7,24,73](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:73) contains several material problems:

   - `fullgate.json` confirms conversation **5.153→753.200 s**, arena **42.955→406.111 s**, and `blind-turn-context` **560.152→561.069 s**. “Every other file finished by 406 s” is false. Arena is the next long-running test span, not the final other-file completion.
   - The **748/657 ≈ 1.14** multiplier describes one historical schedule. Four simultaneous conversation files change contention, imports and queueing. It does not establish a 410–450 s gate.
   - **≤600 s** is a reasonable experimental acceptance ceiling, but does not independently establish **≥150 s saving** against a newly measured baseline. Require both candidate median ≤600 s and paired-arm median saving ≥150 s.
   - State **643 baseline files / 646 candidate files**, not 646 “in every run”; require 11,479 tests and 110 conversation-family tests.
   - Specify fresh, equally prewarmed A/B caches after A/A, or another explicit procedure preserving equal cache histories.
   - Preserve inherited §8’s bounded repeat rule: if paired evidence conflicts, both complete-trial medians must pass or reject. Do not repeat indefinitely until favorable.
   - A new red remains disqualifying under the subset rule even if it passes alone. A solo rerun diagnoses contention; it does not erase a scheduling regression.

   The competing plan handles these distinctions substantially better. Contiguous versus packed partitioning costs only a few seconds of predicted file span; that difference does not justify abandoning contiguity.

6. **P2 — Correct the timing table and the “optimal” claim.**  
   AST counts joined to all 110 duration rows produce:

   | Proposed slice | Blocks | Expanded tests | Exact duration |
   |---|---:|---:|---:|
   | A: 849–2759 | 47 | **58** | **166.618 s** |
   | B: 2760–2911 | 6 | 6 | 165.694 s |
   | C: 2912–3720 | 23 | 26 | 162.982 s |
   | D: 3721–4314 | 19 | 20 | 157.372 s |
   | Total | 95 | 110 | **652.666 s** |

   [Plan:13–22](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:13) omits **732 ms** from A’s six forensic parameter rows. The stated cuts are also not optimal: a contiguous minimax calculation yields **166.431 s**, starting B at 2679. That alternative still fails the filename-consumer constraint.

   The competing plan’s four-way LPT maximum **163.226 s** checks out. “163.0 s best packing” cannot be correct: even the total/4 lower bound is **163.1665 s**.

7. **P2 — The branch-conflict recipe would discard existing changes.**  
   [Plan:80](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:80) describes added tests, but the three shelved worktrees retain **95 blocks, with no new test titles and five modified existing blocks**. Their diffs are +200/−8, +200/−8 and +202/−10.

   For example, [vis-field’s line 2744](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts:2744) changes fixture preparation inside an existing test; its smoke also changes existing setup. Taking main and reinserting “added tests” loses those edits while a title comparison still passes.

   Replace the recipe with a three-way transplant of the branch’s merge-base delta, including imports, helpers and modified existing tests. Compare relocated bodies/helpers against the intended merged result, not titles alone. Do not apply those branch changes in this unit.

8. **P2 — Pin normalization is independent in principle; make the manifest delta and clean-Git control explicit.**  
   [Plan:46–49](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:46) correctly avoids deriving expectations from inventory-tool output. I independently reproduced both old digests from literal source filenames. For the plan-of-record names, the independently calculated new values are:

   ```text
   143 paths: 700a277da436a2cd1798b291e13825ffd4ea973a161e6ce4cb5c03390cd2c6d4
   151 paths: ef991c2c66424d643926ddc9205b4ddb0f034cad8ba20e9610a001d0c30474dc
   ```

   Freeze the old explicit manifests and require the new manifests to differ by **exactly the three named additions**. Merely reproducing the old digest does not prove the new list has the intended delta.

   Adopt the competing plan’s explicit all-success empty-Git seam. The existing [test:89](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/tools/d583-contract-inventory.test.ts:89) uses a **missing merge-base**; it is not the fully successful clean-Git case. The pinned empty-union digest supplies independent protection despite `EMPTY_INVENTORY` itself being constructed from production lists.

9. **P3 — The 85-minute estimate excludes warm-ups.**  
   [Plan:76](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:76) counts only two baseline measurements and six paired measurements. Add discarded prewarms, quiet-start waits, diagnostics and any complete-trial repeat.

Other requested anchors check out: 4,315 lines; 85 ordinary calls plus ten parameterized calls expanding to 110 tests; blank lines 2759/2911/3720 and test starts 2760/2912/3721; 27 prelude declarations; `kbInputs` declaration 107–111 and readers only at 2966/2967/3035; `primaryCodexArgvBytes` at 1368–1378, called twice on line 1782. No hooks, `vi.mock`, `vi.resetModules`, `process.chdir` or adapter static state were found. The D583 pin/count anchors, Vitest discovery glob and `tsconfig.node.json` inclusion are correct. The filename-consumer claim and absolute absence-of-mutable-state claim are not.

The competing plan contributes useful consumer analysis, immutable-array handling, AST requirements and acceptance controls. Its mandatory-green recorder prerequisite is unnecessary given the demonstrated pre-existing failure; its non-contiguous packing and generic filenames are not necessary to obtain the expected benefit.

CONV-SPLIT-01 PLAN REVIEW R1 DONE