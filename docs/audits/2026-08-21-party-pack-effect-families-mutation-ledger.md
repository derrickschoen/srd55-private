# Party-pack effect-family mutation ledger

Each control was run against the permitted VTT/combat/bridge suite after the positive gate passed. The source mutation was then restored and the same suite returned green.

| Control | Mutation | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `rider_fires_twice_per_turn` | Dropped the per-turn used-effect check | `rider_fires_twice_per_turn fires an eligible once-per-turn rider only on the first of two hits` | exit 1; named test failed; 1 failed, 1,571 passed | exit 0; 1,572 passed |
| `smite_dice_not_doubled_on_crit` | Set the confirmed-critical damage request to noncritical | `smite_dice_not_doubled_on_crit spends a level-2 slot only on a confirmed hit and doubles exactly 3d8 on a crit` | exit 1; named test failed; 2 failed, 1,570 passed | exit 0; 1,572 passed |
| `bonus_attack_always_legal` | Offered Bonus Action attacks without checking grant usability | `bonus_attack_always_legal offers a granted Bonus Action attack exactly while usable and consumes its pool` | exit 1; named test failed; 1 failed, 1,571 passed | exit 0; 1,572 passed |
| `rider_condition_ignored` | Bypassed the closed qualifying-gate evaluation | `rider_condition_ignored requires advantage or an adjacent ally before sneak-shape dice apply` | exit 1; named test failed; 1 failed, 1,571 passed | exit 0; 1,572 passed |
| `schema_missing_variant` | Removed `once_per_turn_damage_rider` from the JSON Schema effect-kind enum | `schema_missing_variant refuses malformed JSON and pins the complete Zod union in the public schema` | exit 1; named test failed; 1 failed, 27 skipped | exit 0; named test passed; 27 skipped |
