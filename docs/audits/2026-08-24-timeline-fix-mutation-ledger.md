# Timeline fix mutation ledger

All mutations were applied individually to the working implementation, killed by the named focused test, and restored before the next mutation.

| Mutation | Applied change | Killer test | Observed kill | Restored |
|---|---|---|---|---|
| `preview_source_detached` | Replaced the DM projection's populated `timeline.upcoming` with an empty list. | `preview_source_detached: a live DM projection previews the legendary window and Web burn-away at exact rounds` | Failed because the projected legendary-action window was absent. | Yes |
| `forward_after_rewind_blocked` | Removed the coordinator pump restart after `rewindToRound`. | `forward_after_rewind_blocked: advances a full round and appends the new branch after a round rewind` | Failed because the rewound branch did not expose its next human turn request within one second. | Yes |
| `seed_not_persisted` | Replaced the selected initial seed with the internal default seed. | `seed_not_persisted: chosen start seed survives session state, export, import, and resume` | Failed because durable `rngState.initialSeed` was `3231750` instead of `424242`. | Yes |
