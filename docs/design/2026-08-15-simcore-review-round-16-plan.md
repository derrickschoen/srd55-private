# Simcore Review Round 16 Plan

## Scope

Fix the three High and two Medium round-16 findings without changing any of
the 79 reviewed semantic oracle values. Replace parsed-span digests with raw
whole-spell-body digests, require attack folds to carry a registered clause,
repair comma-delimited prefix one-roll scope, and restore the closed-form
multi-pool distribution regression.

## Verified assumptions

- The current digest is computed from `SourceDerivedSaveClause.span` after the
  spell reader has removed line-break hyphens and after the parser has selected
  a clause boundary. A context-only Fireball edit and a raw hyphenation-only
  edit can therefore leave the checked value unchanged.
- The column-safe reader already establishes exact per-heading boundaries in
  both the full SRD layout and the committed readable extract. It can emit a
  second body form before de-hyphenation while retaining the current parsed
  body for first-decode scanning.
- The 79 clauses cover fewer than 79 spell headings because Conjure Elemental,
  Phantasmal Killer, Storm of Vengeance, Tsunami, Wall of Ice, Wall of Thorns,
  and Weird each register two clauses. Their paired clauses must deliberately
  share a body digest. Collision freedom is therefore checked across distinct
  spell headings; every one of the 79 clause rows still pins a digest.
- Every current `AttackRollEvent` literal is test-owned. All legitimate attack
  test sources are character weapons; the independent refusal probe has two
  catalog-content helpers standing in for weapons. No app-layer assembler yet
  constructs attack events.
- The one-roll scanner currently treats any earlier damage occurrence in the
  sentence as suffix ownership. In `plus, as one damage roll, ...`, the comma
  terminates that earlier segment and makes the marker a prefix for following
  damage occurrences.

## Implementation

1. Add round-16 reproductions for raw hyphenation drift, Fireball context drift,
   an unregistered homebrew attack, the comma-delimited prefix marker, and the
   `1d4 + 1d6 + 2 - 4` closed-form distribution. Capture the first four red;
   prove the fifth is mutation-sensitive by temporarily ignoring the second
   pool and observing `4.0 -> 0.75`, then restore production code.
2. Make each column-safe spell reader expose raw digest bodies alongside parsed
   bodies. Raw bodies preserve hyphens and only flatten per-heading line-break
   whitespace. Keep parsing against the existing de-hyphenated form.
3. Replace the 79-row span-digest oracle with a mechanically generated 79-row
   body-digest oracle. Check the raw body before selecting a parsed clause, put
   the body digest on every registered clause, and preserve the existing
   remediation wording.
4. Add an explicit character-weapon attack registration route returning a
   clause/evidence identity. Require those fields on `AttackRollEvent`, validate
   exact registered source and evidence before arithmetic, and refuse unknown
   identities. Convert the two synthetic catalog weapon probes to the weapon
   route rather than weakening registration.
5. Classify a one-roll marker preceded by a comma-delimited marker segment as a
   prefix, so it scopes the following damage groups through the next marker.
6. Keep the restored distribution regression at the unit distribution layer;
   do not route it around a fold registration gate.

## Proof

- Retain red and green output for each exact reproduction.
- Prove 79/79 registered clauses retain their fold/refuse classifications; all
  clause pins exist; each multi-clause spell shares one digest; and digests are
  collision-free across distinct registered spell bodies.
- Preserve Contact Other Plane 15, Earthquake null, and the six multi-slot
  grouping values. Enumerate pre-existing attack fold call sites and show all
  their tests green after registration, including available and refusal cases.
- Run focused simulation tests, the full Vitest suite without accepting a count
  below 303 tests / 4933 assertions, and direct
  `npx tsc -p tsconfig.app.json --noEmit`.
- Run the forbidden-directive census, inspect the diff, then submit the
  uncommitted implementation to Claude and address valid findings for at most
  three rounds.

## Residual risk

The English parser remains bounded first-decode assistance. The registration
gate now freezes the upstream raw spell body, so parser-invisible context,
hyphenation, and clause-boundary changes cannot inherit reviewed semantics.
