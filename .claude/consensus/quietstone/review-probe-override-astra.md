# Probe-override review, astra (2026-09-13, read-only, dnd-wt-quietstone at 0d2f84d7)

Source: .tmp/runs/fanout/review-probe-override.log (verbatim final message)

1. **PO-F1 — High; blocks: yes — Actual PNG dimensions are never validated.**  
   `tools/ai-dm-screenshot-probe.ts:4004` compares manifest dimensions with capture metadata, then reads and hashes bytes at `:4013` without inspecting PNG dimensions. A differently sized PNG with a correct digest and falsely declared dimensions passes; correctly hashed non-PNG bytes also pass. Validate the PNG itself before copying or answering.

   Failure coverage:
   - SHA mismatch: rejects at `:4017`; tested at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2129`.
   - Missing state entry: rejects at `:3999`; tested at `:2087`.
   - Missing PNG file: `readFile` rejects before answers; **no test**.
   - Manifest dimensions differ from board: rejects at `:4004`; **no test**.
   - Actual PNG dimensions differ from manifest/board: **no validation or test**.

2. **PO-F2 — High; blocks: yes — Required provenance is incomplete.**  
   `tools/ai-dm-screenshot-probe.ts:4058` records only `manifestPath`, `kind`, `version`, and `originalPngSha256`. It records no source revision and does not hash the manifest. `row.png.sha256` identifies the replacement bytes, but the original capture digest and format version cannot identify the recomposition’s source revision. The exact-object assertion at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2062` currently enshrines this incomplete provenance.

3. **PO-F3 — Medium; blocks: yes — Override runs still require capture.**  
   `tools/ai-dm-screenshot-probe.ts:3956` starts the snapshot service, and `:3988` captures every selected board before applying overrides. Thus pre-rendered runs—including simulation—still depend on capture succeeding. This contradicts “instead of capturing.” No test supplies a snapshot service that throws if called.

4. **PO-F4 — High; blocks: yes — Acceptance comparison rejects overrides only through the file reader.**  
   `tools/ai-dm-screenshot-probe.ts:3196` correctly rejects `imageOverride` in comparison JSONL. However, `assertComparableRuns` at `:3497` never checks that field, and exported `renderProbeSummary` accepts rows directly. For example, comparing valid override rows against themselves through `renderProbeSummary(..., 'acceptance', ['Q9'])` succeeds.

   Reject override-bearing rows on both sides inside the comparison validator. The test at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2179` covers incompatible CLI flags, **not comparison input rows**. Removing `z.never().optional()` would leave all six QSFOG tests passing.

5. **PO-F5 — Medium; blocks: yes — Question ordering incorrectly determines the strict gate.**  
   `tools/ai-dm-screenshot-probe.ts:2542` preserves requested order, while `:3568` constructs present questions in catalogue order and compares arrays. Consequently, perfect results for `--questions Q9,Q1` fail the gate, whereas `--questions Q1,Q9` pass. Compare sets or canonicalize both orders.

   Otherwise, filtering is disclosed, per-class denominators remain the number of that class’s rows, and the default gate still requires all applicable classes. The Q9 test checks neither denominators nor gate results.

6. **PO-F6 — Medium; blocks: yes — The six tests do not establish all required validation boundaries.**  
   Static mutation assessment; references below are in `tests/unit/tools/ai-dm-screenshot-probe.test.ts`:

   | Test | Production mutant it would catch |
   |---|---|
   | `:2002` override applied preserves truth/payload/digest | Keep the captured PNG instead of selecting/copying the override; change truth or state digest. |
   | `:2087` missing override state | Replace missing-state rejection with fallback to capture. Deleting only the explicit guard is caught by error wording, since dereferencing the absent entry still throws. |
   | `:2129` digest mismatch | Delete the SHA mismatch rejection. |
   | `:2179` non-intervention/semantic/compare restrictions | Delete any of those CLI guards. |
   | `:2211` Q9 restriction | Ignore `config.questions` during task creation, or remove summary disclosure. |
   | `:2233` unknown/empty IDs | Remove the corresponding question-ID rejection. |

   **All six survive deleting the dimension guard or comparison-row prohibition.** The happy-path test survives deleting digest validation; the digest-negative test catches that deletion. Missing-file rejection, actual dimensions, source revision, capture avoidance, and reordered-question gate behavior remain untested.

Static review confirmed the requested branch, HEAD, and exactly two changed files. Non-override row shape is preserved: `runTask` and `rescoreSavedRow` are identical to baseline after removing their conditional override spreads. Reader searches found the comparison/rescore schemas in this probe; both keep the field optional, and rescore preserves it. Capture behavior, scoring, normalisation, prompt/primer versions, and dependencies are unchanged for ordinary runs. Additional restrictions include PNG-only overrides and a strict manifest schema requiring `manipulationValidation`.

Vitest was not run because its fixtures require writes in this read-only sandbox. No edits, git writes, or other agents were used.

**REJECT PROBE-OVERRIDE**

PROBE-OVERRIDE REVIEW DONE