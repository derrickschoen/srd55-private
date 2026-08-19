# Simcore Review Round 15 Plan

## Scope

Fix the five round-15 High findings without changing any of the 79 existing
reviewed oracle values. Add source-span SHA-256 digests mechanically from the
current reviewed spans, make availability total, and require every automatic
damage fold to identify registered evidence.

## Verified assumptions

- The current 79 clauses are selected at module load from the committed spell
  extract, but their `source_span` values are copied from that same live parse;
  no independent text identity currently exists.
- Availability is represented by an 11-key negative list, so 68 available
  clauses have no explicit row.
- `AutomaticDamageEvent` has only a `SourceRef`; all eight event literals are
  test-owned and no production assembler currently constructs this event kind.
- One-roll markers currently scope only backward. The reviewer’s five exact
  boundary probes confirm that a marker must be classified as prefix when no
  damage expression precedes it in its marker segment, and suffix otherwise.
- The six empty grouping rows are gate clauses whose parser hard-codes empty
  occurrences. A gate-specific failed-save scan can remain empty for current
  text while detecting the supplied Geas mutation.

## Implementation

1. Add round-15 regressions and run them red for the registration bypass,
   partial availability, both Fireball drift mutations, five marker boundaries,
   and the Geas gate mutation.
2. Add a total 79-row `available | unavailable` oracle and compare every live
   clause with an explicit row; absence must throw.
3. Add a mechanically generated 79-row normalized-span SHA-256 oracle. Put the
   digest on every reviewed clause and check it first during module load so any
   registered span change throws with the clause ID. Normalization is exactly
   `span.trim().replace(/\s+/gu, ' ')` and receives its own invariance test.
4. Require automatic-damage events to carry a registered clause ID and public
   evidence. Validate source identity, evidence identity, duration, frequency,
   and damage shape before arithmetic; unknown or mismatched clauses refuse.
5. Generalize roll-threshold detection and narrow check ownership so a later
   ability check cannot consume a preceding save DC.
6. Classify one-roll markers as prefix or suffix scopes and scan gate-owned
   spans for explicit failed-save damage occurrences instead of constructing
   empty arrays.

## Proof

- Retain red and green output for each finding’s exact reproduction.
- Prove Geas twice: digest enabled reports the span mismatch; digest disabled
  still reports the damage-roll grouping mismatch from the gate scan.
- Preserve 79/79 fold-or-refuse outcomes, Contact Other Plane 15, Earthquake
  null, all six multi-slot groups, and a registered automatic-damage fold.
- Run the simulation suite, then the full Vitest suite and report real counts.
- Run `npx tsc -p tsconfig.app.json --noEmit` directly.
- Run the forbidden-directive census and inspect the final diff.
- Submit the uncommitted implementation to Claude for review, address valid
  findings, and repeat no more than three times.

## Residual risk

The English parser remains bounded first-decode assistance. The independent
span digest is the safety boundary: future text changes cannot inherit old
semantics merely because the parser still produces the same values.

## Plan-review decisions

- Accepted: specify and directly test the whitespace normalizer.
- Rejected: re-review the initial digest values manually. The task explicitly
  sanctions mechanical generation from the current spans after fifteen review
  rounds; the digests protect future drift rather than re-decoding this corpus.
- Accepted as a bounded integration risk: no production automatic-damage
  constructor exists yet. The exported event type and fold still form a public
  numeric boundary, so registration is enforced there now and the future
  assembler must satisfy the strengthened type.
