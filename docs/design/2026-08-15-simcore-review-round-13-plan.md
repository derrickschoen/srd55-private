# Simcore Review Round 13 Plan

## Scope

Fix the round-13 High, Medium, and Low findings without changing the current
79/79 fixed-save-DC availability, four-sentence numeric-DC census, 42-sentence
check census, or six reviewed damage-roll groupings.

## Verified assumptions

- `sourceFixedSaveDc` currently recognizes fixed forms first, then searches
  only the same narrow numeric grammar for unsupported forms. The three
  supplied lawful wordings therefore return `available/null`.
- `sourceSentences` treats `vs.` as non-terminal only when a narrow DC marker
  immediately follows. A general lowercase continuation rule is absent.
- Parenthetical ability-check ownership is already recognized, but is
  rejected when its ownership tail contains `save`; this misclassifies the
  exact `against your spell save DC (DC 15)` reproduction.
- Non-overlapping damage expressions always receive different `roll_index`
  values. No bundled spell contains `as one damage roll`, `one damage roll`,
  or `one roll`, so adding explicit-source precedence cannot reclassify the
  corpus by accident.
- Exactly six reviewed clauses have multiple damage signature slots. Their
  runtime grouping declarations exist, but no separate hand-transcribed
  grouping oracle checks those declarations independently of the parser.

## Implementation

1. Add round-13 regression tests for all supplied DC wordings, the
   parenthetical check-owned DC, and the composed one-roll source sentence.
   Run them before production changes and retain the failing output.
2. Make sentence splitting retain abbreviation/lowercase continuations.
   Identify save-bearing sentence context, consume supported fixed-DC forms,
   and refuse any remaining DC-vocabulary numeric candidate in that context.
   Return `available/null` only when no such candidate remains.
3. Preserve check ownership, including a parenthetical ownership tail that
   says `spell save DC`, before classifying leftovers as save-owned.
4. Let an explicit `as one damage roll` / `one roll` phrase merge the damage
   components in its failure-damage sentence even when source ranges do not
   overlap.
5. Add a separate, exhaustive hand-transcribed oracle for all six multi-slot
   grouping declarations and compare runtime declarations with it at module
   initialization. Keep the parser comparison as an additional source check.

## Proof

- Re-run the round-13 test file to make every reproduction green.
- Run round 10-12 simulation tests and the simulation unit directory.
- Paste controls for 79/79 available derived fixed-save-DC results; numeric-DC census of
  four with Contact Other Plane = 15 and Earthquake = null; 42 check
  sentences; and the unchanged six-grouping enumeration.
- Run the full serial Vitest command without a pipe and report its real file,
  test, and benign error counts without normalizing the exit status.
- Run `npx tsc -p tsconfig.app.json --noEmit` directly and report its exit.
- Inspect the final diff, forbidden-directive census, and test-count delta;
  do not commit.

## Residual risk

The inverted scanner can still fail open when a numeric fixed save DC is
expressed with no DC vocabulary at all. That limitation is explicit; this
change does not claim to recognize unrestricted English.
