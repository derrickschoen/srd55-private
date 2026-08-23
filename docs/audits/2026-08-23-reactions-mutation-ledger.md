# D348.1 reaction and event-interception mutation ledger

Each production mutation below was applied alone. Its named imported-pack test was run, the observed
nonzero exit was recorded, and production code was restored before the next mutation. The restored
focused file finished with `Tests  7 passed (7)`.

SRD basis: a Reaction is an instant response, Opportunity Attack is the common example, one Reaction
prevents another until the reactor's next turn starts, and specific text can override the default
post-trigger timing at `docs/srd/full/srd-5.2.1.txt:600-617`. Counterspell's trigger and failed-save
interruption are at `docs/srd/source/spell-descriptions.txt:1767-1780`; Hellish Rebuke's post-damage
response is at `docs/srd/source/spell-descriptions.txt:4212-4225`; Shield's bonus explicitly includes
the triggering attack at `docs/srd/source/spell-descriptions.txt:6937-6954`.

## Boundary control

The triggering-attack Shield comparison was changed from strict (`boosted AC > attack total`) to
inclusive. The named
`shield_not_retroactive and shield_boundary_exact_tie_hits_one_above_misses: retroactive AC includes the triggering attack`
test produced exit 1 because an attack exactly tying the boosted AC became a miss. The strict
comparison was restored.

## Restored negative controls

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `second_reaction_same_round` | The availability and spell-cost first refusals allowed a second reaction while the pool was spent. | `second_reaction_same_round: the unified pool refuses the second response and restores at turn start` | exit 1; the second Shield resolved and spent another slot instead of emitting `reaction_spent` |
| `shield_not_retroactive` | The triggering attack was no longer reclassified after Shield applied its AC bonus. | `shield_not_retroactive and shield_boundary_exact_tie_hits_one_above_misses: retroactive AC includes the triggering attack` | exit 1; the attack one below boosted AC still dealt damage |
| `trigger_kind_ignored` | The declared Fire damage-type predicate was ignored. | `trigger_kind_ignored and trigger_kind_discrimination: a Fire damage declaration does not fire on Cold` | exit 1; the Fire-only reaction was offered for Cold damage |
| `opportunity_attack_separate_pool` | Opportunity Attack left the unified reaction pool available. | `opportunity_attack_separate_pool and opportunity_attack_shared_pool: an OA blocks a later pack reaction in the same round` | exit 1; Hellish-Rebuke-shaped damage resolved after the OA |

All four mutations and the independent boundary mutation were restored. No assertion, fixture
expectation, or import diagnostic was weakened or regenerated from mutated output.
