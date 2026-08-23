# D348.1 summoned-entities mutation ledger

Each production mutation below was applied alone against a green focused baseline. Its named test
was run, the observed nonzero result was recorded, and production was restored before the next
mutation. The restored focused file finished with `Tests  8 passed (8)`.

## Summon model and source basis

- A pack spell names a monster record in that same imported pack. A missing record rejects only the
  referring spell and loads the rest of the pack.
- A summon is an ordinary combatant with the pack monster's profile, a controller alias copied from
  its summoner, and one caster-selected legal destination per creature.
- The declared initiative rule is `summoner_count_immediately_after`: the summons share the
  summoner's initiative count and are inserted immediately after the summoner. Giant Insect states
  that manifested creatures share the caster's initiative count, act immediately after the caster,
  and obey commands at `docs/srd/source/spell-descriptions.txt:3714-3716`.
- The lifecycle effect owns the summoned combatants. Death leaves the normal corpse token; lifecycle
  expiry despawns the combatant and removes that token rather than creating or preserving a corpse.
- `on-kill-spawn-not-modelled` is the named record refusal for on-kill spawning. The measured traces
  did not establish that operation's shape, so it is outside this increment.

## Restored mutations

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `summon_import_count_boundary` | Increased the strict imported fixed-count maximum from 100 to 101. | `summon_import_count_boundary: imported fixed summon count accepts exactly 100 and rejects 101` | exit 1; the 101-count spell loaded instead of receiving a record rejection |
| `summon_count_boundary_and_placement_edge` | Changed the placement range comparison from `>` to `>=`. | `summon_count_boundary_and_placement_edge: exact count and 30-foot edge place; one over and an illegal cell refuse atomically` | exit 1; the exactly-30-foot placement was refused |
| `summon_survives_effect_end` | Removed owned-combatant despawning from effect termination. | `summon_survives_effect_end and despawn_leaves_corpse: concentration end removes a living summon and a dead summon corpse token` | exit 1; no despawn event was emitted and the summon remained |
| `despawn_leaves_corpse` | Preserved summon tokens while removing their combatants during despawn. | `summon_survives_effect_end and despawn_leaves_corpse: concentration end removes a living summon and a dead summon corpse token` | exit 1; the dead summon's corpse token remained after despawn |
| `summon_skips_initiative` | Appended summon entries after every existing initiative entry instead of immediately after the summoner. | `summon_skips_initiative: loads the pack statblock and inserts each upcast summon on the summoner count immediately after them` | exit 1; the enemy remained between the summoner and summons |
| `unknown_monster_id_summons` | Inverted the post-monster-load reference filter so the missing reference loaded and the valid reference was rejected. | `unknown_monster_id_summons: rejects only a summon spell whose monster id is absent and loads the rest of the pack` | exit 1; `missing-summon` loaded in place of `prism-pebble` |

All six mutations were restored. No test, assertion, fixture expectation, or import diagnostic was
weakened or regenerated from mutated output.
