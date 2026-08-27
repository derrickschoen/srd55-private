# D383–D385 wizard/tactics mutation ledger

Each mutation below was applied alone to the production source, killed by the
named focused test, and restored before the next mutation. Every command used
`npx vitest run tests/integration/vtt/survival-policy.test.ts --configLoader runner`
with the named `--testNamePattern`.

| Mutation | Applied fault | Killing test and observed result | Restoration |
|---|---|---|---|
| `thrift_spends_anyway` | Replaced the Hit Point Die average threshold with `missingHitPoints > 0`. | `thrift_spends_anyway`: the six-HP-below-threshold assertion received `true` instead of `false`; `exit 1`. | Restored comparison against `averageHitDieHealing(...)`. |
| `overheal_cast` | Allowed average spell healing for every positive HP deficit. | `overheal_cast`: an 11-HP deficit incorrectly accepted 12 average healing; `exit 1`. | Restored `averageHealing <= missingHitPoints`. |
| `slow_on_two` | Lowered the clustered-enemy gate from three to two. | `slow_on_two`: the two-living-enemy fixture still exposed Slow; `exit 1`. | Restored the minimum cluster size of three. |
| `spirit_guardians_while_blessed` | Treated any prior Bless as the contingency trigger and bypassed the live-concentration exclusion. | `spirit_guardians_while_blessed`: Spirit Guardians was exposed while Bless still held; `exit 1`. | Restored the post-Bless concentration-break ordering and live-concentration guard. |
| `topple_mastery_ignored` | Returned from the Topple branch without resolving its save or applying Prone. | `topple_mastery_ignored`: the expected Brann-sourced Prone effect was absent; `exit 1`. | Restored the Constitution save and failed-save Prone application. |

All five mutations were restored. The focused file passed again before the
full gate.
