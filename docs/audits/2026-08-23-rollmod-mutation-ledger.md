# D351 roll/defense modifier mutation ledger

The imported-pack tests exercise the shared roll-resolution sites. Bless and Bane's attack/save riders are stated in `docs/srd/source/spell-descriptions.txt:670-681` and `docs/srd/source/spell-descriptions.txt:824-837`; Shield of Faith's AC bonus is stated in `docs/srd/source/spell-descriptions.txt:6956-6967`. The normalized SRD states that advantage/disadvantage sources do not stack and cancel each other at `docs/srd/full/srd-5.2.1.txt:493-512`, and that same-spell effects do not combine at `docs/srd/full/srd-5.2.1.txt:6462-6474`.

Each production mutation below was applied alone, its named test was run, and the production change was restored before the next mutation.

| Mutation | Temporary production fault | Killing test | Result |
|---|---|---|---|
| `rider_precomputed` | Rolled a die rider while creating the effect and stored a flat value. | `rider_precomputed: two qualifying rolls draw observably different d4 faces instead of reusing a cast-time value` | exit 1 |
| `consumed_effect_lingers` | Refused to consume a first-qualifying-roll die rider. | `guidance_consumed_on_first_use: the first distinguishing check gets d4, the second gets nothing, and the instance ends` | exit 1 |
| `aura_membership_stale` | Reused allegiance without checking the current token distance. | `moving_aura_roll_time_membership: exact 30 feet gets advantage and no half damage; after moving to 35 feet neither applies` | exit 1 |
| `same_spell_stacks` | Changed roll/defense effects from replacement to coexistence. | `bless_without_concentration: concentration ends Bless mid-duration and same-name castings never add 2d4` | exit 1 |
| `penalty_sign_flip` | Applied the absolute value of Bane's die sign. | `bane_save_negates_and_penalty_sign: success creates no modifier; failure subtracts d4 across the attack threshold` | exit 1 |
| `modifier_expires_one_round_late` | Added one to the effect's declared turn-boundary count. | `modifier_duration_first_and_final_round: a two-round AC bonus protects the first and final rounds, then expires` | exit 1 |

All five required controls and the independent duration-boundary mutation were restored.

Restored focused run:

    Test Files  2 passed (2)
         Tests  18 passed (18)
