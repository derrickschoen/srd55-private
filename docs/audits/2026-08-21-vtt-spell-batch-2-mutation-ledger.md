# VTT spell batch 2 mutation ledger

Scope: D318.1 continuation, the seven highest-usage missing SRD spells from the private matrix.

| Mutation | Source mutation | Named killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `hold_monster_save_end_dropped` | Removed Hold Monster's `repeatedSave`, so Paralyzed never ends on a successful target-end save. | `hold_monster_save_end_dropped: DC-1 Paralyzes and blocks actions, then an exact-DC end-turn save ends it` | exit 1; retained `Paralyzed` failed the post-save assertion | Restored `repeatedSave`; final 1,701-test gate passed |
| `mockery_disadvantage_persists` | Removed consumption of `next_attack_by_target` from the ordinary attack path. | `mockery_disadvantage_persists: DC-1 takes scaled Psychic damage and only the next attack has Disadvantage` | exit 1; the second attack remained at Disadvantage | Restored next-attack consumption; final 1,701-test gate passed |
| `faerie_fire_no_advantage` | Removed Faerie Fire's Advantage contribution from attack roll-mode resolution. | `faerie_fire_no_advantage: DC-1 outlines while exact DC saves; outline grants Advantage and suppresses Invisible benefits` | exit 1; the outlined-target attack resolved at normal mode | Restored the Advantage contribution; final 1,701-test gate passed |

All three source mutations were proved present before their killing run and restored before the final gate.
