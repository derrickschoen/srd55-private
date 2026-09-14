# M-14 implementation review r1 (astra 01a09e94-39b9-7393-b806-1944aee5aad7) on b9cd6a9e, harvested 2026-09-14 02:34

**No P1 findings. Accept with nonblocking coverage gaps.**

Reviewed `229962c3..b9cd6a9e`, the accepted plan, both prior reviews, lane report, and main’s controlling decisions. No edits, git writes, other agents, or full-suite runs.

1. **ID1-F1 — Superseded restriction survives outside the verification section. P2; blocks: no.**  
   [operational-guidance-facts.test.ts:106](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/tests/unit/docs/operational-guidance-facts.test.ts:106), assertion at line 127.  
   **Yes: reject this restriction anywhere in `supervision.md`.** Inserting it before the first H2 introduces operative guidance, not historical evidence. The implementation nevertheless follows the accepted section-scoped PD1-F4 wording, and the current document contains no such contradiction; this is a coverage gap, not P1.  
   **Smallest change:** retain the complete supervision text and apply the existing negative assertion to it. Keep affirmative-policy checks section-scoped. Add the supervisor’s insertion location to the mutation proof. Continue excluding decisions/history files.

2. **ID1-F2 — Some explicitly planned facts lack assertions. P2; blocks: no.**  
   [operational-guidance-facts.test.ts:121](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/tests/unit/docs/operational-guidance-facts.test.ts:121), also lines 137–144 and 161–167.  
   Three independent changes survive all three cases:
   - Delete the clause requiring full Vitest, Playwright, and production-build serialization.
   - Delete BUILD-PLAN’s sentences identifying current operational, executable, and evidence sources.
   - Replace the comment’s `` `SheetSpellLevel` unknown arm `` with “an untyped value.”

   The plan requires these facts; the implementation currently states them correctly. **Smallest change:** add whitespace-tolerant assertions for those specific clauses/source pointers within the existing cases, without snapshotting the documents.

3. **ID1-F3 — RULES citation coverage is unguarded. P3; blocks: no.**  
   [operational-guidance-facts.test.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/tests/unit/docs/operational-guidance-facts.test.ts:118), through line 130.  
   Replacing both `RULES.md:47-50` references with `:47-48` stays green. The first reference still supports its stated serialization boundary. The controlling index, however, claims support for **serialization and locked retry**, and retry is on line 50. **That index regression should fail.** A bounded assertion requiring its existing reference suffices; no symbol resolver is needed.

| Conformance check | Assessment |
|---|---|
| Supervision proposed text, plan 123–156 | **Pass.** Matches after whitespace normalization and PD2-F1 substitution. Browser unique-port/4173 wording is explicitly planned at line 140; M-3 pointer at 153–155. Neither is scope expansion. |
| Compile facts and attribution | **Pass.** Root references app/node; their includes establish application, test, and tooling coverage. Ordinary root project mode checks no source. D263 supports build mode; the September 3 finding supports `--force`. RULES:44 records the forced command and finding, correctly described after PD2-F1. |
| Concurrency facts | **Pass.** RULES:47–48 preserves serialization/no-Vitest-during-Playwright; :50 supplies locked retry. Main’s D587.3 supplies under-load operation; D544/D606/D613 support explicitly named timeout exceptions. |
| BUILD-PLAN proposed text, plan 211–269 | **Pass.** Header and replacement paragraph match. All 25 evidence-path lists match the plan exactly: 57 citations, 54 unique paths, none missing. All statuses are `done`. |
| Historical integrity | **Pass.** Original increment numbering, titles, exit criteria, and global verification contract are unchanged. PARITY-AUDIT:3–10 supports completion on 2026-07-23; BUILD-PROGRESS:459 says `PORT COMPLETE`. Audit immutability statement remains untouched. Row 22 acknowledges later retirement. |
| SpellLevel proposed text, plan 280–288 | **Pass.** Matches after comment-prefix normalization. Builder:98–103 defines the union; :225–233 handles sentinel, validated integers, and rejection; :343 invokes that boundary. No broader narrowing claim is introduced. |
| Three named test cases | **Partial.** Names and four specified negative controls conform. Missing planned assertions are ID1-F2; historical exclusion is appropriate except for the supervision boundary in ID1-F1. |
| Whitespace correction | **Pass.** `\s+` preserves the required words and ordering across wrapping; it does not explain or cause the identified omissions. |
| Scope/dependencies/order | **Pass.** Exactly four authorized files changed; no dependency/configuration changes, test deletions, or forbidden tokens. Uses `tests/helpers/test-filesystem`; no raw `node:fs` import. No new order dependence found. |

Mutation outcomes below were independently reproduced using the actual spec’s transpiled assertions with an **in-memory `node:assert` harness**, not Vitest or filesystem mutations.

| Mutation | Result | Killing assertion / gap |
|---|---|---|
| M-COMPILE | Case 1 fails | Line 107 requires affirmative forced build command. Lines 108–110 independently reject the stale affirmative command, although execution stops at the first failure. |
| M-CONCURRENCY, inside bullets | Case 1 fails | Line 127 rejects the absolute restriction. |
| M-STATUS, increment 2 | Case 2 fails | Line 150 requires every status to equal `done`. |
| M-SPELLLEVEL-COMMENT | Case 3 fails | Lines 161–164 require the new boundary wording; line 167 also rejects the restored stale statement. |
| Restriction before first H2 | **Survives** | Outside extracted section; ID1-F1. |
| Delete controlling-decisions index | Case 1 fails | Line 114 requires “D263 requires build mode”; further provenance/index assertions also become unsatisfied. |
| Change both RULES references to `:47-48` | **Survives** | No citation assertion; distinction explained in ID1-F3. |

Static discovery independently confirms **640 → 641**, exactly the new spec added and none removed. Diff-check passes, the tree is clean, and the frozen-contract digest matches. The reported historical RED/GREEN runs and digest-restoration chronology remain lane/supervisor evidence; I did not independently rerun Vitest because its configured global setup creates filesystem caches.

**ACCEPT IMPL M14**

M14 IMPL REVIEW R1 DONE