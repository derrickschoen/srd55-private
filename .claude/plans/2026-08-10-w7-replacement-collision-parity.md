# W7 replacement collision parity

## Reachability verdict

`key-collision` is reachable in a production replacement preview. The existing
public worker integration fixture publishes a species through
`CatalogAuthoringService`, attaches the old species through `applyGuidedOrigin`,
and previews the exact published successor key. The resulting
`ReplacementPlan.review` contains a `key-collision` row.

This does not require a nested incoming aggregate. Replacement deliberately
constructs one reference-only adoption node from the already-installed target.
That node withholds incoming fingerprint evidence, so an exact asserted target
key is classified as a key collision. Nested rules are part of the installed
root aggregate; they do not become separate replacement review rows. The row is
nevertheless public and currently defaults to the lossy decision, so the
reachable branch of W7 applies.

## Verified assumptions

- `planShape()` currently maps every content-import review to
  `default_decision: 'match'`, including `key-collision`.
- `ReplacementDecision` and the authoring RPC validator accept only `match`.
- `matchChoices()` requires one explicit decision per review but rejects every
  decision except `match`; it already returns the shared content-import choice
  consumed by both plan and commit.
- `localContentReferenceImportNode()` exposes the adoption planner's generated
  clone name and supports `clone` by reprojecting the complete locally stored
  aggregate under the chosen name.
- `evaluateRetargetCharacter()` is the sole W4 plan/commit evaluator; this
  change does not need to modify it.
- W4's affected pins are in `tests/integration/authoring/handlers.test.ts`,
  `tests/unit/ui/homebrew-library.test.ts`, and
  `tests/browser/replacement-repair.spec.ts`.
- D207 forbids a second-agent CLI in this supervised dispatch. The required
  review is local self-critique plus complete diff inspection.

## Implementation

1. Make `ReplacementReviewItem` a discriminated union: ordinary review reasons
   retain a default Match, while `key-collision` has no default and carries the
   planner-provided private-copy name. Make `ReplacementDecision` a closed
   Match/Clone union with `clone_name` required only for Clone.
2. Preserve one import/evaluation path. Translate the validated replacement
   decision into the existing `ContentImportChoices`; permit Clone only for a
   collision row and keep typed `replacement_review_required` refusal for a
   missing, duplicate, foreign, or incompatible decision.
3. Add a shared content-decision consequence-copy seam. Keep W3 adoption copy
   unchanged and add honest reference-replacement wording: Match moves the
   attached character to the installed local entry; Clone makes a renamed
   private copy of that local entry and moves the character to it.
4. In Review character fixes, render Match/Clone/name controls only for
   collision rows, with no initial radio choice and the Apply button disabled
   until every collision is resolved. Ordinary/empty plans retain one-click
   Apply. Show the candidate name with its catalog-layer disclosure.
5. Update every consumer and RPC exact-key validator in the same change.

## Proof

- Integration: production publish + exact replacement yields a collision with
  `default_decision: null`; omission is typed-refused; explicit Match retargets
  to the installed target; explicit Clone installs the complete renamed species
  and retargets a second character to it. Alias/default Match remains pinned.
- RPC structural: Match accepts exactly two keys; Clone accepts exactly three
  including `clone_name`; half-migrated/extra-key forms are invalid params.
- Unit UI: collision controls start unresolved, consequence copy names the
  attached-character effects, Apply stays disabled, and the selected Clone is
  sent exactly; a clean plan keeps today's one-click payload.
- Browser: the real replacement repair flow sees the collision controls, proves
  neither choice is selected, chooses Match, applies, and continues through the
  W4 notice/repair path.
- Run typecheck plus only affected Vitest files and the one Playwright file on
  `PLAYWRIGHT_PORT=5090`. Measure the browser file and record x1.5 rounded up to
  100 ms in its evidence comment.
- Execute a mutation script that restores the forbidden collision default; the
  named integration test must fail, then restore byte-exact and rerun green.

## Self-critique gates

- Prove Clone receives the planner's resulting content key before character
  retarget; never assume it equals the requested successor key.
- Prove exact-key pins cover both decision variants and reject `clone_name` on
  Match, rather than widening the RPC boundary accidentally.
- Inspect every `ReplacementDecision` constructor and reader after the type
  change; no `as` cast may conceal an unmigrated consumer.
- Confirm the W4 preview rollback and shared evaluator diff is untouched.
