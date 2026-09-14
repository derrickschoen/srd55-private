# M-14 fix round 1 lane report (sol), harvested 2026-09-14 02:49

Implemented the test-only M-14 hardening. Only `tests/unit/docs/operational-guidance-facts.test.ts` is modified.

The strengthened spec now checks:

- The superseded lane restriction is absent from the complete supervision document.
- Full Vitest, Playwright, and production-build serialization through `/tmp/dnd-gate.lock`.
- The controlling index cites `.claude/RULES.md:47-50`.
- BUILD-PLAN identifies its operational, executable, and evidence sources.
- The IDs comment explicitly names the `SheetSpellLevel` unknown arm.

### Mutants before strengthening

Every row ran:

`npx vitest run --configLoader runner tests/unit/docs/operational-guidance-facts.test.ts`

| Mutant | Applied SHA | Current-spec result | Restored SHA |
|---|---|---|---|
| Insert `One suite-running lane at a time.` immediately before the first H2, committed line 17 `## Model policy` | `f1e1a27a701bec00afcf4fca21914bda3886ce80095653dd14b9874554d49f44` | Exit 0; 1 file, 3 tests passed | `38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706` |
| Delete the full-suite serialization clause while preserving existing asserted phrases | `b6a1f20e6db49bc8bc451737310a1931394d264d15e913914d74ca400d0e491a` | Exit 0; 1 file, 3 tests passed | `38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706` |
| Delete BUILD-PLAN operational/executable/evidence source sentences | `df9471709f9eae69d38dcf7c19855f157c74e816d2d68e70f8f8dcf8444afec9` | Exit 0; 1 file, 3 tests passed | `4fe2c143bdd1b6a98ed83eb80a10c63bfbeae465d8196deed47c44eda5714781` |
| Replace `SheetSpellLevel unknown arm` with `an untyped value` | `44d6846091c0f58a55ea5bc95794f269ea6f105c1d359432e85a57b12baf1e27` | Exit 0; 1 file, 3 tests passed | `f6486a103733febd453b763d157bf3f98e073a472386f53dd891899661e597e0` |
| Change both RULES references from `:47-50` to `:47-48` | `95db9587ccc32fcf59798647db0fb4781ea63db6169b55174f5de88a954b5097` | Exit 0; 1 file, 3 tests passed | `38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706` |

A preliminary serialization mutation wrapped text already covered by the existing assertions and therefore failed for the wrong reason. I corrected it to preserve those phrases; the valid mutant recorded above survived as expected.

### Mutants after strengthening

| Mutant | Applied SHA | Strengthened-spec result | Restored SHA |
|---|---|---|---|
| H2-preamble reinsertion | `f1e1a27a701bec00afcf4fca21914bda3886ce80095653dd14b9874554d49f44` | Exit 1; `compile and concurrency guidance agrees with executable configuration`; 1 failed, 2 passed | `38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706` |
| Delete serialization clause | `b6a1f20e6db49bc8bc451737310a1931394d264d15e913914d74ca400d0e491a` | Exit 1; `compile and concurrency guidance agrees with executable configuration`; 1 failed, 2 passed | `38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706` |
| Delete BUILD-PLAN source sentences | `df9471709f9eae69d38dcf7c19855f157c74e816d2d68e70f8f8dcf8444afec9` | Exit 1; `the completed historical plan has evidence for every increment`; 1 failed, 2 passed | `4fe2c143bdd1b6a98ed83eb80a10c63bfbeae465d8196deed47c44eda5714781` |
| Replace `SheetSpellLevel` wording | `44d6846091c0f58a55ea5bc95794f269ea6f105c1d359432e85a57b12baf1e27` | Exit 1; `the SpellLevel comment and narrowing implementation agree`; 1 failed, 2 passed | `f6486a103733febd453b763d157bf3f98e073a472386f53dd891899661e597e0` |
| Change RULES references to `:47-48` | `95db9587ccc32fcf59798647db0fb4781ea63db6169b55174f5de88a954b5097` | Exit 1; `compile and concurrency guidance agrees with executable configuration`; 1 failed, 2 passed | `38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706` |

### Green verification

- `npx vitest run --configLoader runner tests/unit/docs/operational-guidance-facts.test.ts tests/unit/docs/ai-reference-anchors-resolve.test.ts`
  - Exit 0
  - 2 test files passed
  - 10 tests passed
- `npx tsc -b --force`
  - Exit 0
  - No diagnostics
- `sg scan`
  - Exit 0
  - No findings
- `git diff --check`
  - Exit 0
- Forbidden-pattern scan found no `any`, suppression directives, `.skip`, or `.todo`.
- Final spec: 195 lines, 9,309 bytes
- Final spec SHA: `d57bf54d97f56b8375ac6ca9b81c501088be5800741a5dbbf9a197ba94b6dec8`
- Diff size: 19 insertions, 2 deletions

### Frozen-file verification

```text
38a8bec9228227738abceaf54672c86fe6519ce50dfa4c48352b8bed00d22706  .claude/supervision.md
4fe2c143bdd1b6a98ed83eb80a10c63bfbeae465d8196deed47c44eda5714781  BUILD-PLAN.md
f6486a103733febd453b763d157bf3f98e073a472386f53dd891899661e597e0  src/domain/ids.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

Final `git status --short --untracked-files=all`:

```text
 M tests/unit/docs/operational-guidance-facts.test.ts
```

M14 FIX R1 DONE