# E05 type-check instrumentation mutation ledger

Date: 2026-08-22

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `untyped_reports_zero_not_null` | `untyped_reports_zero_not_null: every real E05 untyped call records no checker as null` | Replaced the untyped arm's null counter block with checked/passed/failed values of zero. | exit 1; 1 failed and 41 skipped: the untyped call counter was an object instead of null. | Restored null; exit 0, 1 passed and 41 skipped. |
| `run_count_counts_failures_only` | `run_count_counts_failures_only: a real E05 fake-model pair records positive typed passes and null untyped counts` | Incremented `checkedProgramCount` only for failed type checks while retaining the pass and failure outcome counters. | exit 1; 42 skipped: table decoding rejected all five typed calls because checked no longer equalled passed plus failed. | Restored counting every type check; exit 0, 1 passed and 41 skipped. |

Each production mutation was applied alone, killed by its named test, and restored before the next mutation.
