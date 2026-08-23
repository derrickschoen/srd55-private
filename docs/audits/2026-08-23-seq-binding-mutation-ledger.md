# D348.1 sequenced-effect binding mutation ledger

Each production mutation below was applied alone after the four-command gate was green. Its named
test was run, the observed nonzero exit was recorded, and the production code was restored before the
next mutation. The restored focused file finished with `Tests  5 passed (5)`.

## Reused scheduler and SRD basis

- The D343 `sustained_effect` payload, retained imported spell definition, action spending, bound-target
  validation, duration clock, concentration ownership, and `processBoundary` scheduler are reused.
- Automatic source-turn work is grounded by Faithful Hound at
  `docs/srd/source/spell-descriptions.txt:2924-2927`.
- Owned-area entry/end hooks are grounded by Moonbeam at
  `docs/srd/source/spell-descriptions.txt:5608-5611`; entry/start hooks are grounded by the elemental
  spirit at `docs/srd/source/spell-descriptions.txt:1472-1474`.
- The judgment-free delayed-one-shot timer is the public subset of later one-shot vocabulary exemplified
  by Delayed Blast Fireball's end-trigger at `docs/srd/source/spell-descriptions.txt:2014-2021`.
- Multi-instance group ownership and activation are grounded by Dancing Lights at
  `docs/srd/source/spell-descriptions.txt:1916-1925`.

## Restored mutations

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `auto_tick_needs_activation` | The boundary scheduler incorrectly required the source's Magic action to be available before resolving an automatic tick. | `auto_tick_needs_activation: automatic first/final ticks require no Magic action while activation-gated damage does` | exit 1; first automatic tick left the target at 40 HP instead of 39 |
| `event_trigger_fires_on_any_event` | The owned-area trigger stopped comparing the observed hook with the declared hook. | `event_trigger_fires_on_any_event: entry fires exactly on the area boundary, not one cell off or on an undeclared end-turn event` | exit 1; undeclared next-turn start dealt a second point of damage |
| `delayed_oneshot_repeats` | The timer reset after firing and the effect was not consumed. | `delayed_oneshot_repeats: a timer differs from an event, fires at its exact future boundary, and is consumed` | exit 1; the second timer cycle dealt a second point of damage |
| `instance_group_splits` | Group validation admitted any owned subset instead of requiring the complete identity set. | `instance_group_splits: a declared group rejects a partial move while a single-instance activation accepts its complete singleton` | exit 1; the three-of-four activation no longer threw |

All four mutations were restored. No test, assertion, fixture expectation, or import diagnostic was
weakened or regenerated from mutated output.
