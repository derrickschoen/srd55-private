# D344.2 synchronized shared-outcome mutation ledger

Each production mutation below was applied alone after the three-command gate was green. Its named
test was run, the observed nonzero exit was recorded, and the production code was restored before the
next mutation. The restored focused file finished with `Tests  8 passed (8)`.

## Source and arithmetic basis

- Shocking Grasp couples one melee spell attack to Lightning damage and the Opportunity Attack control
  on a hit: `docs/srd/source/spell-descriptions.txt:7015-7024`.
- Guiding Bolt couples one ranged spell attack to Radiant damage and the next-attack Advantage grant on
  a hit: `docs/srd/source/spell-descriptions.txt:4018-4025`.
- Thunderwave gives each creature one Constitution save; failure couples damage and a 10-foot push,
  while success takes only half the same damage: `docs/srd/source/spell-descriptions.txt:7876-7888`.
- Vicious Mockery couples a failed Wisdom save to Psychic damage and next-attack Disadvantage:
  `docs/srd/source/spell-descriptions.txt:8187-8195`.
- Ray of Sickness couples a ranged spell hit to Poison damage and Poisoned through the source's next-turn
  boundary: `docs/srd/source/spell-descriptions.txt:6463-6467`.
- Existing save-damage halving rounds down with `Math.floor(total / 2)` at
  `src/combat/encounter.ts:5747-5750`; the shared failure-roll reference applies that same rule at
  `src/combat/encounter.ts:4862`.

## Restored mutations

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `branches_roll_separately` | The successful-save reference rolled its failure damage packet a second time before halving. | `branches_roll_separately: successful half damage uses one referenced odd roll and consumes no replacement roll` | exit 1; unexpected RNG draw 4 |
| `branch_leaks` | The successful-save arm selected `onFailure`, leaking Thunderwave's full damage and push. | `branch_leaks: two area targets take divergent branches and successful Thunderwave neither pushes nor takes full damage` | exit 1; successful target had 15 HP instead of 18 |
| `one_roll_per_cast_violated` | A second save was resolved before executing the second failure-branch consequence. | `one_roll_per_cast_violated: damage and push share one save while branch dice follow it in declaration order` | exit 1; unexpected RNG draw 4 |
| `nested_shared_outcome_accepted` | The attack hit branch schema admitted either a branch operation or another `shared_outcome`. | `nested_shared_outcome_accepted: import rejects shared_outcome anywhere inside a branch and retains a healthy record` | exit 1; malformed-record diagnostic disappeared |
| `exact_dc_treated_as_failure` | Shared save branch selection required a total greater than the DC instead of accepting equality. | `shared_outcome_boundaries: DC-1 fails, exact DC succeeds, and odd/even totals halve down` | exit 1; exact-DC branch reported failure |
| `half_damage_rounds_up_odd` | Shared half damage used `Math.ceil`; the paired even input remained unchanged. | `shared_outcome_boundaries: DC-1 fails, exact DC succeeds, and odd/even totals halve down` | exit 1; odd total dealt 3 instead of 2 |

All six mutations were restored. No test, assertion, fixture expectation, or import diagnostic was weakened
or regenerated from mutated output.
