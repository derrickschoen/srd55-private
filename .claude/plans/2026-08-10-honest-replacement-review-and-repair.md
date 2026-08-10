# Honest replacement review and repair

## Goal

Make CI-7's preview disclose the same invalid selections its commit will
produce, name selected spells without exposing row ids, disclose their catalog
layer, and route the recipient directly to the affected guided spell choice.

## Verified assumptions

- `previewReferenceRetarget()` currently builds one shallow `content_key`
  change, while `retargetCharacter()` and `remapRetargetState()` alone perform
  the replacement and produce invalid-selection notices.
- `DatabaseContext.transaction()` nests through SQLite savepoints. The existing
  content-import and level-up preview seams prove that throwing a private
  sentinel returns computed results while rolling back every write.
- `guidedSpellsStepState()` exposes the target choice kind/id and the guided
  spell step already owns the eligible-spell picker and production assignment
  writer. A query-addressed repair mode can open and focus that picker without
  adding another writer.
- Spell display name and layer are already resolved together in
  `builder/species-choice.ts`; extracting that lookup lets replacement notices
  reuse it rather than copying SQL.
- None of the files in this change is a declared checksum source in
  `catalog-data-migrations.ts`; D226 therefore requires no checksum re-pin.
- Existing relevant copy pins live in
  `tests/integration/authoring/handlers.test.ts` and
  `tests/unit/ui/homebrew-library.test.ts`. The catalog-layer completeness test
  scans all authoring/UI contracts and will police any new display-name field.

## Implementation

1. Extract the spell-version/content-key display-name plus catalog-layer query
   into one catalog disclosure seam, and route the existing species-choice
   consumer and replacement notice construction through it. Return an explicit
   unresolved result rather than substituting a content key or row id.
2. Add plan notices and additive notice disclosure/repair fields. Preserve
   `selected_value` exactly for historical readers. Model resolved spell,
   unresolved spell, and skill disclosures as a closed union so a missing spell
   name cannot masquerade as a sourced value.
3. Wrap the existing real `retargetCharacter()` call in one shared evaluator:
   preview invokes it inside a rollback-only transaction; commit invokes the
   same evaluator persistently. Put the resulting notices on `ReplacementPlan`.
4. Derive level-window consequence copy from the actual regenerated target
   choice and retain the underlying eligibility detail. Construct a precise
   guided spell repair URL when the target choice exists, with a general
   character-builder route for cases where the replacement removed the choice.
5. Render preview invalidations before Apply. After commit, render the same
   sourced/layered copy plus a repair link. Teach the guided build route to open
   and focus the exact requested spell picker, even when another incomplete
   step would otherwise render.

## Proof

- Integration: snapshot every database table before/after preview to prove no
  simulation write escapes; assert the incompatible plan notice equals the
  committed notice and stored slot is invalid; assert the compatible plan and
  commit both have no notices and stored slot remains valid.
- Unit UI: pin pre-commit consequence copy, post-commit sourced/layered copy,
  honest UNKNOWN fallback, repair href/navigation, and hostile-text safety.
- Unit guided UI: pin exact repair-choice picker opening/focus marker without
  disturbing adjacent choices.
- Browser: use real author/publish/revise/replace UI flows, select Magic Missile
  through production spell assignment, see the level-0 consequence before
  Apply, apply, follow Repair selection to the exact picker, select an eligible
  cantrip, and assert the stored choice is valid.
- Run targeted Vitest files, catalog-layer completeness, source greppability,
  typecheck, and only the relevant Playwright specs on port 5050. Measure the
  new browser spec alone, then set its timeout to slowest x1.5 rounded up to the
  next 100 ms and record the evidence in its comment.
- Mutation control: add a script that changes one load-bearing new assertion,
  run it to a named failure log, restore, and run green. The script never
  regenerates an expectation.

## Review posture

D207 forbids this Codex dispatch from invoking a second-agent CLI, overriding
the generic Codex/Claude review instruction. Perform the required assumptions
check and self-critique locally, then inspect the complete uncommitted diff and
rerun the targeted proof after fixes.
