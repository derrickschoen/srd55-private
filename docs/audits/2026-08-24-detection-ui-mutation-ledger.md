# D373.2-D373.4 detection UI mutation ledger

Each production mutation was applied alone, killed by the named unit test, and
restored with the exact inverse edit before the next control. No test or fixture
changed while a mutation was active. The browser specification was authored but
not run under the D375 batch gate.

| Control | Injected defect | Killing test | Observed result |
|---|---|---|---|
| `tray_hides_autofire` | Projected the automatic-policy event log from an empty slice, dropping every always/never audit entry from the tray. | `tray_hides_autofire: always-policy auto-fire remains a non-interactive tray audit entry` | `exit 1`; `Tests  1 failed \| 2 skipped (3)`; the tray entry array was empty. |
| `hidden_token_rendered` | Kept a Hidden combatant in the DM/shared board combatant projection while still adding fog. | `hidden_token_rendered: hidden occupants become fog-only cells in DM and shared board data` | `exit 1`; `Tests  1 failed \| 2 skipped (3)`; the fogged cell still carried the monster token. |
| `prefs_reset_per_encounter` | Replaced preloaded party reaction policies with an empty encounter policy list. | `prefs_reset_per_encounter: reaction policies survive closed decode and flow into every composed room` | `exit 1`; `Tests  1 failed \| 9 skipped (10)`; room 1 contained no persisted policy. |

The supervisor-found `passive_five_shift` survivor is pinned by
`passive_five_shift: Advantage adds 5 and Disadvantage subtracts 5 from passive Perception`.
Its distinguishing fixtures prove both directions: passive 12 plus Advantage
detects Stealth 16, while passive 20 plus Disadvantage does not.

All three mutations were restored. The restored focused UI/persistence run
finished with `Test Files  2 passed (2)` and `Tests  15 passed (15)`.
