# D377.12 preview and hidden-roll mutation ledger

Each production mutation was applied alone, run only against its named killing
test in `tests/unit/vtt/preview-hidden-rolls.test.ts`, and restored by the exact
inverse edit before the next mutation. No test or fixture changed while a
mutation was active.

| Mutation | Temporary defect | Named killing test | Observed kill |
|---|---|---|---|
| `oa_marker_ignores_disengage` | Removed the mover's Disengage state from the engine movement cause used by OA eligibility and preview. | `oa_marker_ignores_disengage: marks only the departure that truly provokes, then removes it after Disengage` | `exit 1`; expected no OA-danger cells after Disengage, received `{ column: 1, row: 1 }`. `Tests 1 failed \| 6 skipped (7)`. |
| `danger_leaks_to_player` | Added a `movementPreviews`/`annotations` property to the player board projection and serializer. | `danger_leaks_to_player: carries typed danger previews only on the DM projection and no serialized player keys` | `exit 1`; the runtime projection unexpectedly owned `movementPreviews`. `Tests 1 failed \| 6 skipped (7)`. |
| `hidden_number_leaks` | Projected the raw monster `attack_resolved` event, including roll and damage totals, under `rollVisibility: dm_only`. | `hidden_number_leaks: player sees a monster attack outcome only while the DM surface retains its roll number` | `exit 1`; the player event contained `attack.roll.faces: [11]`, `chosen: 11`, and `total: 111`. `Tests 1 failed \| 6 skipped (7)`. |
| `legacy_toggle_dropped` | Migrated every v5 `hideDeathSaveRolls` value to an empty `hiddenRolls` list. | `legacy_toggle_dropped: migrates a hideDeathSaveRolls-only v5 save to the equivalent category` | `exit 1`; expected `['death_saves']`, received `[]`. `Tests 1 failed \| 6 skipped (7)`. |

All four mutations were restored. The OA rule used by the first control is
pinned at `docs/srd/full/srd-5.2.1.txt:933-956` (trigger, sight gate, timing,
Disengage, teleport, and movement exemptions).
