# Simcore review round 9 plan

## Governing invariant

D245 refusal discipline governs every change: a numeric fold is available only
when its success arm, damage ownership, save DC, timing, recurrence, cardinality,
and identity claims are all supported by the bundled source. Missing evidence
must make the fold unavailable and must survive composition.

## Locally verified assumptions

- The eight gate clauses are Arcane Hand, Bestow Curse, Enlarge/Reduce,
  Ensnaring Strike, Geas, Phantasmal Force, Ray of Enfeeblement, and Searing
  Smite. Their damage is not a direct failed-save damage arm. The current gate
  extractor nevertheless gives each `kind: 'none'` and failure occurrences.
- Twenty-six reviewed clauses currently declare `none`. The declaration is a
  caller-side default in `reviewedSaveClause`; no source-derived success proof
  exists.
- Contact Other Plane is the reviewed damage-save clause with a source-fixed
  numeric DC (`DC 15`). The validator currently does not receive the event DC.
- Event frequency is not checked by the save evidence validator. Duration is
  checked only for Vitriolic Sphere through a delayed-damage special case.
- Prismatic Spray is the only reviewed clause whose one save can select two
  damaging alternatives. Its current `1..2` bound is a spell-name/body regex,
  while every other clause receives an unchecked `1..1` default.
- Resource aliases exist only in unit tests at this tip. A caller-chosen
  `logical_key` plus mechanically equal pools currently proves aliasing.
- Split damage aggregation includes the damage-instance index in its grouping
  key. It therefore accepts splits within one instance but refuses equivalent
  same-type/same-die pools split across instances. Type, arm, and clause checks
  are independent of that index.
- Page range 107-175, count 69, and description count 339 are loud pins, but
  their exceptions omit D239's explicit re-pin procedure.

## Implementation

1. Replace save-success defaults with a source-derived result: `half`, `none`,
   sourced success damage, or unavailable with a reason. Treat damage explicitly
   scoped to failure (`or take`, `On a failed save`, `Failure:`) as proof of a
   no-damage success only when the same clause contains no success damage.
   Keep the eight gate clauses in the reviewed inventory but make them
   unavailable; do not reinterpret their conditional/recurring damage as a save
   arm.
2. Derive clause timing/recurrence metadata from the clause/body. Bind event
   duration and frequency to that metadata. If the current event vocabulary
   cannot represent the source schedule without assumptions, mark the clause
   unavailable instead of selecting an instantaneous/default frequency.
3. Derive an optional fixed save DC from the clause text and bind a supplied DC
   when present. Variable spell-save-DC clauses remain accepted as a valid
   control.
4. Derive damage-slot repetition bounds as clause metadata for every clause.
   Prismatic Spray derives `1..2` from its random-ray source; ordinary clauses
   derive exact unit cardinality from their single outcome occurrence. Remove
   the manifest-side repetition declaration/default as an authority.
5. Replace freely declared alias keys with constructor-produced alias evidence
   tied to one canonical pool. The pool-set constructor must reject two ordinary
   pools that merely claim the same key, while accepting an alias derived from
   the canonical pool and continuing to accept independent pools.
6. Aggregate equivalent supplied pools across damage instances, not only within
   one instance. Preserve the existing type partition and the separate
   failure/success/clause validation boundaries. Add inverse controls for type,
   arm, and clause separation.
7. Add the explicit D239 re-pin workflow to every page/count pin exception:
   inspect the legitimate SRD revision, update the reviewed page range/count and
   committed readable extract, and record a justification naming what changed
   and why.

## Proof strategy

- Add a round-9 test file containing each reviewer reproduction first and run it
  red against the clean tip. Each refusal gets a lawful accepted control.
- Add exhaustive assertions over all 26 formerly-`none` clauses and over every
  source-derived timing/recurrence classification; no example-only coverage.
- Mutate one source phrase at a time in isolated body maps to show source
  derivation is load-bearing, then restore and show green.
- Run affected simulation unit files after each increment.
- Run the complete Vitest suite and verify the test count does not drop below
  4,866. Read the exit code directly.
- Run `npx tsc -p tsconfig.app.json --noEmit` and read its exit code directly.
- Submit the uncommitted implementation to independent Claude review, resolve
  legitimate findings, and repeat up to three rounds until consensus.
