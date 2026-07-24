# PHP Unit parity sensitivity evidence

All 57 mapped oracle cases inherit the isolated production-mutation evidence
from their owning implementation shard. T80 also reran the two mutations that
exercise its new cross-slice assertions in a temporary copy of this worktree.
No production file in the T80 worktree was edited.

## T80 transitions

### Persisted assignment hydration

- Green:
  `npm test -- --run tests/parity/php-unit-parity.test.ts`
  — 2/2 passed.
- Reversion, isolated copy only:
  `SpellSlotAssignmentFactory` returned `UnassignedSpellSlot` for a non-null
  selected reference.
- Red:
  `npm test -- --run tests/parity/php-unit-parity.test.ts -t "hydrates each assignment"`
  — failed at the intended `UserSpellSelection` instance assertion; the
  SQLite row still contained the selected spell ID.
- Restored:
  the selected-reference branch again constructed `UserSpellSelection`.
- Restored green:
  the filtered case passed, 1 passed / 1 skipped.

This is the same branch previously owner-proven by A30 sensitivity transition
1, now observed at T80's persisted-row boundary.

### Stored six-class slot derivation

- Reversion, isolated copy only:
  `half_up` shared caster contribution used `Math.floor` instead of
  `Math.ceil`.
- Red:
  `npm test -- --run tests/parity/php-unit-parity.test.ts -t "six-class oracle seed"`
  — failed at the intended exact caster assertion: caster level 5 instead of
  6 and third-level slots 2 instead of 3. The six persisted class rows remained
  exact.
- Restored:
  `half_up` again used `Math.ceil`.
- Restored green:
  the filtered case passed, 1 passed / 1 skipped.

This repeats R10 sensitivity transition 2 at the synchronous report/SQLite
boundary and covers PHP cases 32 and 48–51.

## Owner evidence inherited by the 57-case map

| Cases | Owner evidence | Proven red behavior |
|---|---|---|
| 1–7 | `progress/V10.md` transitions 1–5; `progress/X50.md`; command shard progress | Closed command type, unknown fields, enum/mode guards, restore validation, exact length boundary, and pre-write rejection |
| 8–9, 31–57 | `progress/R10.md` transitions 1–7; `progress/R40.md` transitions 3 and 5 | Value bounds, every rounding/slot/Pact/proficiency/preparation branch, generated properties, stored progression rows, and persisted report decoding |
| 10–11 | `progress/A30.md` transitions 1–2 and 5–11 | Assignment hydration/exclusivity, capability non-selection behavior, buckets, usable override state, and persisted access routes |
| 12–14 | `progress/D10.md` transitions 1–4; `progress/R40.md` transitions 1–2 | Duplicate thresholds, identity grouping, compact sources, version sorting/fingerprints, and persisted report acknowledgements |
| 15–30 | `progress/G10.md` transitions 1–4; `progress/G20.md` | Six-kind/default/free-cast/query validation and stored JSON, plus persisted activation/non-slot generation |

Each cited owner transition records green → intentional failure → restoration
→ green. T80's map therefore has sensitivity evidence for every oracle case,
while its two added tests have their own directly observed red/green
transitions.
