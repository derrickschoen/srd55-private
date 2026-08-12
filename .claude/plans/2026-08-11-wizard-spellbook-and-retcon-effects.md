# Wizard spellbook preparation and retcon effect cleanup

## Verified causes and assumptions

- Wizard class progressions already generate six level-1 `wizard_spellbook_entries`; the generic class editor leaves them empty because only guided spell choices expose acquisition controls.
- Wizard prepared grants currently carry only the Wizard list constraint. The shared candidate search and assignment evaluator both consume the stored grant constraint, so a `wizard_spellbook` collection belongs there rather than in UI-only filtering.
- Fixed `always_prepared` grants are separate fixed-spell rules and must not receive the Wizard collection constraint.
- Existing Wizard prepared slots are identifiable by their durable bundled-class identity plus `wizard-prepared` rule key. Applying the effective constraint at every read/write seam preserves their selected spell without a data rewrite; completeness exposes any out-of-book discrepancy.
- `remove_source` tombstones species/background/feat sources and recursively deactivates child grants, but the recursive generator does not remove sourced `character_effects`. Class removal and subclass replacement traverse the same generator path.
- Snapshot inverses capture `character_effects`, so deletion inside the production transaction remains exactly undoable and redoable.

## Implementation

1. Plan acquisitions before preparations and derive the Wizard spellbook collection from the bundled Wizard plus `wizard-prepared` durable address. Implement collection filtering/evaluation in unfrozen shared eligibility seams and refresh dependent preparation status after a spellbook write.
2. Leave existing selections and stored rows untouched. Enforce the effective collection in candidate search, production assignment, and spell-access projection; do not repin the checksum-frozen historical catalog migration inputs.
3. Add completeness items and guided repair links for empty spellbook acquisitions and out-of-book Wizard preparations. Correct the report explanation and order guided choices so initial spellbook entries can be selected before preparation.
4. Delete every effect owned by a recursively deactivated source and require active source state in the one mechanical effect reader. Verify species, background, class, and subclass paths; report any genuinely unreachable origin separately.
5. Add targeted integration and browser pins: both-ways spell candidates/assignments, six level-1 acquisitions, preserved legacy selection with repair control, and Dwarf Monk 3 HP `24 -> 21 -> 21 after reload` through production writers.
6. Run only targeted tests after the required process grep, run the affected Playwright specs on port 5030 with measured timeout budgets, execute one saved-copy apply/fail/restore/clean mutation control, typecheck/build, and leave the worktree dirty. The supervisor owns full suites and implementation review.

## Deliberate boundaries

- Do not auto-replace, clear, or add a spell for an existing character.
- Do not constrain cantrips or fixed always-prepared grants to the spellbook.
- Do not run full Vitest or Playwright suites; the supervisor owns them.

## Second-agent critique disposition

- Superseded after local proof: a semantic migration would require changing
  checksum-frozen historical source inputs. Effective constraint resolution
  enforces old and new slots without rewriting a player's data.
- Accepted: keep collection membership in one shared resolver used by both the
  evaluator and candidate search, so “active” and exact-version semantics cannot
  drift.
- Already locally verified: every mechanical effect consumer enters through
  `readEligibleCharacterEffects`; transport/snapshot readers intentionally keep
  separate raw access. Keep a source-state reader test as defense in depth.
