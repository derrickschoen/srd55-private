# D352.1 stored-character PC bridge mutation ledger

Each production mutation below was applied alone, killed by its named test, and restored before the next mutation. No expectation was regenerated from production output. The restored focused suite reported `Test Files  2 passed (2)` and `Tests  5 passed (5)`.

| Mutation | Production change | Named killing test | Observed kill | Restoration |
|---|---|---|---|---|
| `exporter_drops_passive_ac` | Replaced the sheet AC-bonus sum with zero, folding the passive bonus into exported base AC and omitting the passive. | `exporter_drops_passive_ac: keeps passive AC separate while the loaded profiles differ exactly at resolved AC` | exit 1; the bonus character exported base AC 13 instead of 12. | Restored the sum of `sheet.armor_class.bonuses`; the importer applies it once through `passives.armorClassBonus`. |
| `multiclass_level_miscount` | Exported only class index zero, making the represented total equal the first class level. | `multiclass_level_miscount: exports multiclass totals across adjacent caster-slot boundaries from sheet resources` | exit 1; the Cleric 1 / Wizard 1 character exported only Cleric 1. | Restored every sheet class row; adjacent caster-level slot boundaries remain sourced from sheet resources. |
| `refusal_defaulted` | Replaced an unknown walking speed with a silent 30-foot value and recursively exported it. | `refusal_defaulted: refuses a named missing required field instead of supplying speed` | exit 1; the incomplete character exported with `walkingSpeedFeet: 30` instead of the typed `walkingSpeedFeet` refusal. | Restored the typed refusal carrying the sheet's unknown-speed detail. |
| `controller_not_dm` | Assigned every composed combatant an `algorithm` controller and algorithm controller id. | `controller_not_dm: authors through RPC, exports, moves and attacks, then spends an imported spell slot` | exit 1; the RPC-authored Wizard arrived with `kind: algorithm` instead of `kind: human`. | Restored HUMAN controller identities owned by the DM-side host; the controller registry remains replaceable. |

## Coverage pinned by the controls

- Multiclass caster totals cross the level-2/level-3 shared-slot-table edge.
- Base and passive-bonus characters establish the AC edge and prove initiative remains identical on both sides.
- The two AC fixtures differ in exactly one contributing effect, and their loaded combat profiles differ exactly at resolved AC.
- The refusal control proves an absent required number cannot become an indistinguishable default.
- The RPC round trip proves default DM/HUMAN control before exercising movement, a weapon attack, imported Magic Missile, and slot decrement.

All four mutations were restored.
