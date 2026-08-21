# Attack-form substitution and Eldritch Blast mutation ledger

Each control was run against `npx vitest run tests/unit/vtt tests/unit/combat tests/unit/bridge` after the positive gate passed. Every source mutation was restored before the next control.

| Control | Mutation | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `substitution_ignored` | Replaced the spellcasting-versus-original ability modifier delta with zero | `substitution_ignored uses spellcasting ability instead of Strength at 9/10 modifier boundaries` and its 11/12 boundary case | exit 1; 2 failed, 1,585 passed | exit 0; final 1,588-test gate passed |
| `dangling_attack_id_accepted` | Bypassed the declared-attack membership check | `dangling_attack_id_accepted refuses an attack-form substitution whose attackId is undeclared` | exit 1; 1 failed, 1,586 passed | exit 0; final 1,588-test gate passed |
| `beam_count_off_by_level` | Changed beam thresholds from 5/11/17 to 4/10/16 | `beam_count_off_by_level pins Eldritch Blast to 1/2/3/4 beams at levels 1/5/11/17` (plus the independent complete-mechanics pin) | exit 1; 2 failed, 1,585 passed | exit 0; final 1,588-test gate passed |
| `beams_share_one_roll` | Drew one attack-roll value and reused it for every beam | `beams_share_one_roll resolves each Eldritch Blast beam separately and permits different targets` | exit 1; 1 failed, 1,586 passed | exit 0; final 1,588-test gate passed |
