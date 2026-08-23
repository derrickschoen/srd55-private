# D364 monster bundle mutation ledger

Baseline after restoration:

`npx vitest run --configLoader runner tests/unit/combat/statblocks.test.ts tests/unit/combat/companion-statblocks.test.ts`

Result: `Tests  63 passed (63)`.

| Mutation | Deliberate change | Killing test | Outcome |
|---|---|---|---|
| `citation_span_drifted` | Pointed Blood Hawk roster metadata at the Boar span. | `citation_span_drifted: verifies each decoded AC, HP, walking speed, name, and CR against its cited lines` | `exit 1`; `Tests  1 failed \| 53 skipped (54)`; Blood Hawk was absent from the cited text. |
| `mapping_defaults` | Defaulted an unmapped spell lookup to the first mapping row. | `mapping_defaults: an unmapped spell returns a typed refusal without selecting any monster` | `exit 1`; `Tests  1 failed \| 8 skipped (9)`; resolved Otherworldly Steed instead of the typed refusal. |
| `scaling_frozen` | Froze Giant Insect HP at its level-4 value. | `scaling_frozen: scales every companion from its base slot through one slot above` | `exit 1`; `Tests  1 failed \| 8 skipped (9)`; level 5 returned 30 HP instead of 40. |
| `caster_stats_ignored` | Replaced Animated Object’s caster-derived attack bonus with fixed +7. | `caster_stats_ignored: two caster profiles produce distinct attack bonuses, save DCs, and ability-scaled damage` | `exit 1`; `Tests  1 failed \| 8 skipped (9)`; the +5 caster produced +7. |
| `cr_ladder_gap` | Removed Camel, leaving only one CR 1/8 beast. | `cr_ladder_gap: keeps every required beast CR step complete with two distinct SRD statblocks` | `exit 1`; `Tests  1 failed \| 52 skipped (53)`; CR 1/8 count was 1 instead of 2. |

All five mutations were restored before the green baseline was recorded.
