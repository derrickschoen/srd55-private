# Save-manager mutation ledger — 2026-08-24

Scope: `src/vtt/save-manager.ts`, killed by
`tests/unit/vtt/save-manager.test.ts`. Each mutation was applied alone, its
named test was run, and the production source was restored before the next
mutation.

| Mutation | Temporary defect | Named killing test | Observed result |
|---|---|---|---|
| `delete_without_confirm` | `request_delete` dispatched `operations.delete(save)` before recording confirmation state. | `delete_without_confirm: requesting or mistyping confirmation never dispatches delete` | `exit 1`; expected delete spy not to have been called, received 1 call. Tests: 1 failed, 4 skipped (5). |
| `newest_last` | Timestamp comparator was inverted to oldest-first. | `newest_last: unifies two autosaves and two folder saves newest-first with decoded summaries` | `exit 1`; received Browser old first instead of Folder newest. Tests: 1 failed, 4 skipped (5). |
| `foreign_source_badge` | Every unified row received the `browser` badge. | `foreign_source_badge: keeps folder and browser provenance visible on unified rows` | `exit 1`; Folder copy received browser instead of folder. Tests: 1 failed, 4 skipped (5). |

All three mutations were restored. Final focused result: `Tests  5 passed (5)`.
