1. **F1 — RESOLVED.** The ID-keyed rerun confirms both silhouette failures, and production-ID checks replace the faulty recipe lookup. Correct the evidence paths in §1: the cited `.claude/consensus/quietstone/…` files are absent here; the supplied rerun is under `.tmp/runs/quietstone/`.

2. **F2 — RESOLVED.** The seven palette pairs and repository step numbering are correct. Per-asset offending-pair sets are now recorded.

3. **F3 — REMAINS: fix the provisional ledger before implementation.** D610 authorizes branch evaluation; the former authorization objection is resolved. However, the specified ledger contains errors that affect its assertions:
   
   - **29**, not 32, delivered tokens exceed 20 colours. Zombie has **28** colours, contradicting the repeated 31–49 range.
   - Rounded measurements cannot serve as exact lower bounds. Cleric/beast is approximately **0.011835007**, below the proposed **0.01184** pin. Floor stone-2 is **0.002197265625**, below **0.0022**. Unchanged art would fail.
   - “Three props with no highlight pixels” is incorrect. Using the existing centroid classifier, rubble has **207 highlight pixels and zero shadow pixels**; crate has neither; pillar has both, with centroids 126/126. Hazard must not enter the authored ledger.
   
   **Fix:** freeze corrected measurements at full precision or as rational components, rounding only reports. Give ledger variants explicit comparison semantics: colour-count **upper bounds**, detail/silhouette **lower bounds**, exact permitted pair sets, and typed missing-highlight/missing-shadow outcomes. Key silhouette exceptions by the actual pair. Replace the blanket “at least its pinned value” rule.

4. **F4 — RESOLVED.** Production-ID invariant coverage, broken-bitmap controls, and contact sheets resolving shipped inputs address the original coverage problem.

5. **F5 — RESOLVED.** The frozen mapping, eight equality groups, board-model digest checks, and explicit generic fallbacks address identity selection without changing runtime policy.

6. **F6 — RESOLVED.** Edge-treatment orientation replaces the false whole-wall rotation assumption. Corner/seam checks and state-sensitive door/glyph assertions provide appropriate coverage.

7. **F7 — REMAINS: finish the executable comparison details.** The same-base comparison, ablation mode, fixed models/states, and owner-controlled evaluation are appropriate under D610. Specify:
   
   - A literal glyph mode: the repository default is **`none`**, not a CLI value `<default>`.
   - `BOARD_SNAPSHOT_PREVIEW_PORT=4591`.
   - Copying and checksum-verifying baseline JSONL into the candidate worktree: `--compare` rejects paths outside its repository.
   - Applying the predeclared decision separately to **each model/effort × question class**, with the existing strict ≥0.9 result reported separately. The −0.05 rule is an evaluation tolerance, not proof of zero regression.

8. **F8 — REMAINS: the importer grammar contradicts the actual package.** Every candidate SVG includes the `<svg>` wrapper plus `<title>` and `<desc>`. “Any other element … is a hard error” would reject the delivery. Overlaps are simultaneously described as last-wins and listed as malformed-input controls.
   
   **Fix:** explicitly allow the validated wrapper and inert metadata, while restricting drawing elements to rectangles. Reject overlaps and test that rejection—the selected delivery has **no overlapping rectangles**, which I checked. State that exact 58-ID coverage applies **after** excluding hazard and the low-wall alternate. The CI-fixture and mandatory supervisor-check split otherwise resolves the finding.

9. **F9 — REMAINS: finish the independent output checks.** The framed aggregate digest and its mutation controls resolve the digest-design issue. S3 still checks the external oracle only **before PNG encoding**.
   
   **Fix:** independently decode each authored rendered/committed PNG and compare its RGBA digest with the frozen external oracle. Also verify preview image-ID → decoded-image identity before moving the preview pin. Add these checks explicitly; generator self-equality and regenerated hashes do not substitute for them.

10. **F10 — RESOLVED.** Retaining the procedural family metadata and narrowing before material-response lookup addresses the type-design issue. Perform index-key consistency validation when constructing the completed registry, avoiding a constructor dependency back into the index being initialized.

11. **F11 — REMAINS: normalize the provenance path comparison.** The scoped provenance statement, corrected preview metadata, and unresolved portrait-prompt record address the original provenance concerns. However, S3 requires `request.redoOf === row.output.path`; requests use **`public/assets/art/…`**, whereas manifest output paths use **`assets/art/…`**.
    
    **Fix:** compare `redoOf` with `` `public/${row.output.path}` ``. Preserve the existing manifest row-ID/input-ID equality check across both source variants.

**REVISE — remaining implementation blockers: F3, F7, F8, F9, F11.**