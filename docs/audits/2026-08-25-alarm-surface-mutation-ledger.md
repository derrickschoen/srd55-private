# Alarm surface mutation ledger

Date: 2026-08-25

Each mutation was applied to the production implementation, killed by the named focused test, and restored before the final gates.

| Control | Applied mutation | Killing test | Evidence |
|---|---|---|---|
| `drum_from_anywhere` | Removed the adjacency predicate from world-object class-action enumeration, exposing the drum across the board. | `drum_from_anywhere: exposes the typed alarm action only to adjacent enemies and gives the designated drummer highest algorithm priority` | `exit 1`; the distant drummer still received `sound_war_drum`. `Tests  1 failed \| 11 skipped (12)` |
| `drum_double_trigger` | Removed the once-use event guard, allowing a fresh turn to sound the same drum again and append a second alarm-use event. | `drum_double_trigger: taking the adjacent class action sounds the alarm once and cannot queue it again` | `exit 1`; the second reduction no longer threw. `Tests  1 failed \| 11 skipped (12)` |
| `dm_trigger_unlogged` | Removed the DM override's `adjudicated` ruling-card emission while retaining the alarm interaction. | `dm_trigger_unlogged: exposes the object fallback and records its ruling card while sounding the same alarm once` | `exit 1`; the expected ruling-card event list was empty. `Tests  1 failed \| 11 skipped (12)` |

All three mutations were restored. Final focused result: `Tests  13 passed (13)`.
