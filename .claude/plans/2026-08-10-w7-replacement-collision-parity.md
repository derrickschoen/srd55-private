# W7 replacement collision parity

## Final reachability and classification design (round 1 correction)

The original mechanical verdict was reproducible but its architectural label
was wrong. `key-collision` was reachable on the dominant production replacement
path only because replacement and cross-user sharing used the same
`localContentReferenceImportNode()` construction. That factory recomputed the
already-installed target's complete aggregate and digest, then marked the node
as reference-only; `incomingDecisionFingerprint()` consequently discarded the
digest under the sharing rule and `exactResolution()` classified every exact,
asserted, non-bundled target as an unevidenced collision.

The final design separates the two constructions structurally:

- Cross-user sharing keeps the existing foreign-reference node. It carries no
  aggregate evidence and therefore keeps the existing `key-collision` distrust
  policy, null default, and explicit-decision refusal.
- Reference retarget uses a dedicated installed-target node. Its certificate is
  opaque to callers and is minted only after the aggregate-derived fingerprint
  agrees with the named current registry fingerprint. The projection is a
  discriminated union, so installed-target certification and foreign evidence
  cannot coexist on one node.
- Registry resolution checks that the exact resolved key is the certificate's
  local key and that its current digest still agrees. Agreement produces the
  distinct `installed-target` review class; disagreement remains
  `key-collision`.
- `installed-target` retains a visible Match/Clone choice and clone name, but
  defaults to Match. Apply is enabled immediately, so ordinary replacement is
  one click; selecting Clone remains an explicit opt-in fork.

Nested rules remain part of the installed root aggregate rather than separate
review rows. W7's unresolved collision behavior remains reachable through a
genuinely fingerprint-distinct/unevidenced foreign node and stays pinned at the
unit/integration boundary.

## Verified assumptions

- `localContentReferenceImportNode()` exposes the adoption planner's generated
  clone name and supports `clone` by reprojecting the complete locally stored
  aggregate under the chosen name.
- `character-share.ts` is the only production caller that must retain
  `localContentReferenceImportNode()`; `reference-retarget.ts` can move alone to
  the installed-target factory.
- The locally projected identity digest is already computed before
  `referenceOnly` is attached, and the registry stores a current fingerprint by
  kind, key, and scheme. The new certificate can therefore validate rather than
  trust a caller assertion.
- The installed-target constructor can verify that the incoming reference
  currently resolves to the certified local key; alias retargets therefore
  cannot apply a certificate belonging to a different aggregate.
- `content-registry.ts` is a declared transitive source of the checksum-frozen
  `reconcile_species_lineage_content_v2` migration. D226 therefore requires its
  checksum and independent registry pin to be updated with this change.
- `evaluateRetargetCharacter()` is the sole W4 plan/commit evaluator; this
  change does not need to modify it.
- W4's affected pins are in `tests/integration/authoring/handlers.test.ts`,
  `tests/unit/ui/homebrew-library.test.ts`, and
  `tests/browser/replacement-repair.spec.ts`.
- D207 forbids a second-agent CLI in this supervised dispatch. The required
  review is local self-critique plus complete diff inspection.

## Implementation

1. Split `ContentImportProjection.referenceOnly` into mutually exclusive
   `cross-boundary` and `installed-target` variants. The latter requires an
   opaque registry certificate and cannot carry the former's foreign shape.
2. Keep `localContentReferenceImportNode()` as the cross-user construction.
   Add a dedicated installed-target constructor for reference-retarget only;
   project the complete stored aggregate, derive its identity, verify the
   incoming reference resolves to that local key, then certify its current
   digest and canonical bytes.
3. Resolve installed-target references through a dedicated registry entry
   point. Exact key + current certificate agreement returns the distinct
   `installed-target` review class; key/digest/canonical disagreement returns
   `key-collision`. Cross-boundary `resolveContentReference()` is unchanged.
4. Extend replacement review typing so `installed-target` carries both
   `default_decision: 'match'` and `clone_name`. Omitted installed-target
   decisions use Match; Clone remains explicit. Missing genuine-collision and
   ordinary review decisions retain `replacement_review_required`.
5. In Review character fixes, render Match/Clone/name controls for both review
   classes. `installed-target` starts on Match with Apply enabled; genuine
   `key-collision` starts unresolved with Apply disabled until selected.
   Ordinary/empty plans retain one-click Apply. Show the candidate name with its
   catalog-layer disclosure.
6. Repin the D226 transitive migration checksum because registry source bytes
   changed. Do not change migration scope or behavior.

## Proof

- Integration: production publish + exact replacement yields
  `installed-target` with default Match; one-click/default Match retargets to the
  installed target; explicit Clone installs the complete renamed species and
  retargets a second character to it. Alias/default Match remains pinned.
- Genuine collision: construct a foreign or stale-certified same-key node with
  divergent fingerprint evidence; pin null default and typed refusal when no
  decision is supplied.
- RPC structural: Match accepts exactly two keys; Clone accepts exactly three
  including `clone_name`; half-migrated/extra-key forms are invalid params.
- Unit UI: installed-target controls start on Match and Apply is enabled while
  the genuine-collision controls remain unresolved/disabled; Clone consequence
  copy and payload stay pinned.
- Browser: the three real replacement journeys prove Match is already selected,
  Apply is initially enabled, and one click continues through their existing
  replacement/repair behavior.
- Run typecheck, handlers, homebrew-library unit, catalog-layer completeness,
  the directly affected migration-registry unit, and the three named browser
  journeys with `PLAYWRIGHT_PORT=5090`. Do not run full suites.
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
