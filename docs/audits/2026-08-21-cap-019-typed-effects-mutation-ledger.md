# CAP-019 typed-effects mutation ledger

Scope: D318.1 continuation clusters TYP-006, TYP-001, and TYP-002.

Command for every control:

`npx vitest run tests/unit/vtt tests/unit/combat tests/unit/bridge`

| Mutation | Temporary fault | Result | Named killing test |
|---|---|---|---|
| `reckless_one_sided` | Removed the incoming-attacks Advantage effect while retaining the actor's own Advantage effect. | exit 1; 1 failed, 1,637 passed | `reckless_one_sided keeps both Advantage halves through the pinned end/start turn edges` |
| `true_strike_keeps_str` | Used the named weapon's original attack and damage modifiers instead of the spellcasting modifiers. | exit 1; 4 failed, 1,634 passed | `true_strike_keeps_str substitutes spellcasting for attack and damage and adds … d6 at level …` (all three pinned levels), plus the named-weapon integration test |
| `grant_uses_source_ability` | Used the spellcasting source's main DC, attack bonus, and modifier instead of the grant's declared ability. | exit 1; 1 failed, 1,637 passed | `grant_uses_source_ability casts an outside-list prepared grant with its explicit ability and DC` |

All three mutations were restored after their killing run. The final restored gate passed with 1,639 tests; the unchanged simulator gate passed with 176 tests; both TypeScript configurations exited 0.
