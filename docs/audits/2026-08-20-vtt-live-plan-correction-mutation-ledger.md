# VTT live round-plan correction mutation ledger

| Control | Mutation applied | Killing test | Result | Restoration |
|---|---|---|---|---|
| `malformed_plan_accepted` | Replaced the round-plan envelope's `z.strictObject` with `z.object`, allowing the live `commands` field to be stripped and accepted. | `malformed_plan_accepted keeps the strict decoder closed against command-array envelopes` in `tests/unit/bridge/decision-program.test.ts` | Killed: the promise resolved with the malformed plan instead of rejecting. | Restored `z.strictObject`; named test and authorized suites green. |

