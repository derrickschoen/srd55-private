# PC algorithm policy mutation ledger

## Policy under test

Algorithm-controlled player characters consume the same reducer-valid legal
commands as every other controller. They rank hostile damaging cantrips first,
then hostile weapon/save attacks, then movement toward the nearest visible
enemy, Dash, other actions, and End Turn. Equal ranks use canonical JSON, so
legal-action input order cannot change the decision.

The v1 resource policy is intentionally at-will-only: the party action surface
enumerates damaging cantrips and weapon attacks, but does not offer leveled
spell casts to the algorithm. Wild Shape is not selected. Reactions continue
through the existing ask/always/never machinery.

Dash is the existing reducer action and adds movement for the current turn
equal to Speed, as sourced at
`docs/srd/full/srd-5.2.1.txt:11589-11596`. The representative Warlock's
at-will ranged option is sourced at
`docs/srd/full/srd-5.2.1.txt:7920-7938` (Eldritch Blast: action, 120-foot
range, beam attack, level-5 beam count).

The bundled room-1 seed `20260824` reaches victory in round 3; the retained
test permits four rounds to avoid claiming an exact-round contract.

## Applied mutations

Each mutation was applied alone, its presence was proven from the edited
source, the named test was run without a pipe, the exact edit was reversed,
restoration was proven from source, and the same test was rerun green.

| Mutation | Applied change and proof | Named killing test | Mutated result | Restoration proof |
|---|---|---|---|---|
| `pc_always_ends_turn` | Returned a single End Turn candidate at the start of the player-character enumeration branch; `rg -n -A7` showed the inserted return at `src/combat/controllers.ts:245-250`. | `pc_always_ends_turn + attacks_allies: a bow PC attacks a hostile at range instead of dashing or attacking an ally` | Exit 1; `Tests 1 failed \| 5 skipped (6)`; expected the hostile bow attack program and received End Turn. | Removed the inserted return, proved its distinctive `stableSortKey: canonicalJson(...)` line absent, then exit 0; `Tests 1 passed \| 5 skipped (6)`. |
| `attacks_allies` | Inverted `visibleHostile` from `target.kind !== actorKind` to `target.kind === actorKind`; `rg` showed the inverted predicate at `src/combat/controllers.ts:119`. | `pc_always_ends_turn + attacks_allies: a bow PC attacks a hostile at range instead of dashing or attacking an ally` | Exit 1; `Tests 1 failed \| 5 skipped (6)`; selected `combatant:pc-policy-ally` instead of `combatant:pc-policy-enemy`. | Restored `target.kind !== actorKind`, proved it at line 119, then exit 0; `Tests 1 passed \| 5 skipped (6)`. |
| `never_closes_distance` | Ranked legal Move commands after End Turn (`[10, nearest, ...]`), operationally dropping movement from the selectable PC policy; `rg` proved the mutated rank at `src/combat/controllers.ts:165`. | `never_closes_distance: an out-of-reach melee PC dashes, closes, and attacks on its next turn` | Exit 1; `Tests 1 failed \| 5 skipped (6)`; no attack was reached after Dash because the PC ended rather than moving. | Restored the Move rank `[3, nearest, ...]`, proved it at line 165, then exit 0; `Tests 1 passed \| 5 skipped (6)`. |
| `nondeterministic_pick` | Removed `leftRank[2].localeCompare(rightRank[2])` from command sorting, leaving tied actions in input order; the edited comparator was inspected before execution. | `nondeterministic_pick: canonical tie-breaking is independent of legal-action input order` | Exit 1; `Tests 1 failed \| 5 skipped (6)`; reversing equal-distance attacks changed the target from `pc-policy-alpha` to `pc-policy-omega`. | Restored and proved `leftRank[2].localeCompare(rightRank[2])` at `src/combat/controllers.ts:428`, then exit 0; `Tests 1 passed \| 5 skipped (6)`. |

## Deviations

None. All four specified mutations were applied, killed, and restored. No
assertion was weakened, no test was skipped or deleted, and no expectation was
generated from production output.
