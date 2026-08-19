# Simcore review round 10 plan

## Governing invariant

A numeric fold is available only when the bundled source proves the damage
arm, roll boundary, save DC, timing, recurrence, cardinality, and identity
used by the arithmetic. A recognized unsupported mechanic refuses with no
numeric arm; an unrecognized source phrase also refuses instead of receiving a
permissive default.

## Locally verified assumptions

- Befuddlement's initial successful-save sentence follows an intervening repeat
  save and an ending-effect sentence. The current next-save boundary clips it.
- `DamageInstance` is the arithmetic roll and resistance-rounding boundary.
  Pool components may be combined only inside one instance.
- `SaveEventFold` currently drops both `event_id` and `frequency`, so the round
  composer cannot enforce a source-derived once-per-turn/round limit.
- Vitriolic Sphere is the only reviewed save clause with delayed damage. The
  fold/composer has no turn scheduler, so it cannot honestly place the 5d4.
- Prismatic Spray rolls 1d8: five results deal 12d6 with half on the Dexterity
  save, results 6 and 7 deal no immediate numeric damage, and result 8 rolls
  twice while rerolling 8. The reviewed expected multiplier is therefore
  `5/8 + (1/8 * 2 * 5/7) = 45/56`; the current event vocabulary carries none
  of that selection probability.
- Resource aliases exist only in tests. `simResourcePoolAlias` receives an
  arbitrary ID and cannot prove that the named pool is the same mechanic. A
  repository-wide symbol search confirms there is no production caller to
  migrate when the constructor and evidence shape are removed.
- The reviewed corpus has 79 clauses. Its current per-clause kind has no oracle
  independent of the source extractor.
- A recurrence cap is keyed by its evidence-bound `SaveSuccessClauseId`, not a
  caller-chosen event label. Distinct reviewed clauses remain independently
  composable; relabeling the same clause cannot bypass its cap.

## Implementation

1. Add round-10 regression tests first and record the red run. Each refusal
   reproduction gets a lawful accepted control.
2. Rework save-clause segmentation generically: first identify which save
   occurrences own damage, then use those ownership boundaries rather than any
   lexical `repeats the save` occurrence. A non-damaging repeat-save sentence
   therefore cannot truncate the initial arm in any spell. Re-derive all 79
   clauses and record every changed kind.
3. Add a complete, human-reviewed per-clause success-kind oracle transcribed
   from the raw bundled SRD and the supervisor/reviewer clause enumerations,
   never from extractor output, and require every constructed reviewed clause
   to match it. Record that provenance beside the literal. Include an explicit
   redundant-no-damage success form so Disintegrate remains `none` under the
   semantics-preserving mutation.
4. Replace permissive metadata defaults with explicit derived availability.
   Recognize supported timing, recurrence, fixed-DC, and repetition forms;
   refuse suspicious but unrecognized alternatives. Extend recurrence reading
   to the owning spell body so Symbol's once-per-turn cap is visible, and
   recognize Wall of Ice's first-time-on-a-turn wording.
5. Keep damage-pool reconciliation within each `DamageInstance`. Accept lawful
   component splits within an instance and refuse cross-instance splits.
6. Carry the evidence-bound clause ID and validated frequency through available
   save folds. Refuse composing one capped clause more than once in one round
   while continuing to accept distinct lawful capped clauses. A caller-chosen
   event label is deliberately not an identity proof.
7. Refuse Vitriolic Sphere numeric folding until delayed scheduling exists.
   Refuse Prismatic Spray until random heterogeneous selection is represented
   or weighted. Preserve ordinary instantaneous and deterministic-cardinality
   controls.
8. Delete alias construction/evidence. Require every resource pool logical key
   to be unique; retain independent pools and prove their independent recovery.

## Proof strategy

- Run the new round-10 file against the clean implementation and retain the
  assertion failures and wrong values as the before evidence.
- Run focused simulation tests after each implementation increment.
- Mutation controls: Befuddlement sentence relocation; alternate delayed
  wording; unsupported recurrence wording; alternate fixed-DC syntax; explicit
  repeated damage; redundant successful-save no-damage; and a per-clause kind
  mismatch against the independent oracle.
- Every unavailable assertion checks the specific refusal reason and absence of
  numeric fields, then pairs it with a control that reaches the intended
  accepted branch. This applies equally to parser-level unknown-wording states
  and fold-level unsupported-mechanic states, preventing an unrelated refusal
  from making a test green.
- Run the assumptions-and-critique loop with capability-contained Claude on
  this plan, then on the uncommitted implementation, resolving legitimate
  findings for up to three rounds.
- Run the complete Vitest suite without piping and verify at least 297 files
  and 4,874 tests. Run `npx tsc -p tsconfig.app.json --noEmit` directly and
  record its exit code.

## Reviewed rejection

The round total does not copy child recurrence metadata into its result. Its
observable recurrence contract is enforcement: duplicate capped clauses
refuse, while distinct reviewed capped clauses compose. Adding cadence
fields to the numeric total would create a new, undefined aggregation contract
(there is no single cadence for a heterogeneous round) and would not strengthen
the cap proof.
