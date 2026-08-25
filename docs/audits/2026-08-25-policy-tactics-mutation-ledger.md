# Policy tactics mutation ledger — 2026-08-25

Each mutant was applied alone to `src/combat/controllers.ts`, killed by the named
test, and then restored before the next mutant and the final gate.

| Mutant | Applied fault | Killing test | Kill evidence | Restored |
|---|---|---|---|---|
| `focus_fire_inverted` | Negated the known-HP rank so the healthiest known hostile won. | `focus_fire_inverted: prefers the already-damaged enemy over a healthier closer target` | Exit 1; expected `pc-policy-wounded`, received `pc-policy-healthy`; 1 failed, 11 skipped (12). | Yes |
| `heals_enemies` | Inverted the ally-kind check so a healing spell ranked an enemy. | `heals_enemies: heals a dying ally rather than a dying enemy` | Exit 1; expected `pc-policy-dying-ally`, received `pc-policy-heal-enemy`; 1 failed, 12 skipped (13). | Yes |
| `heal_never_chosen` | Returned no healing priority for a dying ally. | `heal_never_chosen: heals a dying ally before damaging an enemy` | Exit 1; expected Healing Word for `pc-policy-rescue-ally`, received an attack; 1 failed, 12 skipped (13). | Yes |
| `ranged_hugs_melee` | Allowed non-retreat movement and minimized separation after a ranged cast. | `ranged_hugs_melee: after shooting at range, moves farther away and stays put rather than provoking when adjacent` | Exit 1; expected retreat to column 3, received advance to column 5; 1 failed, 12 skipped (13). | Yes |

