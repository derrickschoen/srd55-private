# D359 view-seam mutation ledger

All controls were applied one at a time after the projection-focused baseline was green, observed failing, and restored before the next control.

| Control | Temporary mutation | Killing test / compile gate | Observed result |
|---|---|---|---|
| `fogged_cell_leaks` | Removed the fog-cell exclusion before projecting non-owned combatants. | `omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell` | `exit 1`; expected `[viewer, fogged]` not to contain `fogged`; Tests `1 failed, 2 skipped`. |
| `new_field_defaults_visible` | Added `mutationProbe?: string` to `EncounterState` without a classification. | `npx tsc -b`, at `ENCOUNTER_VIEW_CLASSIFICATION satisfies Record<keyof EncounterState, ...>` | `exit 1`; TS1360: `Property 'mutationProbe' is missing`. |
| `seat_confusion` | Used a different combatant as a seat's default owned binding. | `gates owned details per seat and produces distinguishing views over the same state` | `exit 1`; the projection rejected `seat:west` because it did not own its visibility combatant; Tests `1 failed, 2 skipped`. |
| `playerview_serialized` | Added a `PlayerView` to every session revision body. | `PLAYERVIEW-NEVER-SERIALIZED persists canonical state without a player projection` | `exit 1`; exported bytes contained `"audience":"player"`; Tests `1 failed, 12 skipped`. |

Restoration proof:

- `npx tsc -b` — `exit 0`.
- `npx vitest run --configLoader runner tests/unit/combat/visibility.test.ts tests/unit/vtt/projection-types.test.ts tests/unit/vtt/session-persistence.test.ts` — `exit 0`; Test Files `3 passed (3)`; Tests `17 passed (17)`.

All four mutations were restored.
