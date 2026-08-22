# D334 wave 0 mutation ledger — 2026-08-22

The required full gate was green before mutation work: TypeScript exited 0,
Vitest reported 424 files and 7,910 tests passed, and the command-outcome guard
exited 0. Every mutation below was applied alone, proved present by an exact
source search, killed by the named test, restored, proved absent by the restored
source line, and followed by the same named test passing.

| Mutant | Temporary production change | Named killing test and command | Mutant result | Restored result |
|---|---|---|---|---|
| `guard_assumes_again` | Excluded the synthetic `unaccounted.ts` module from the import-graph result. | `guard_assumes_again: names a scraper module with no provenance path`; `npx vitest run --configLoader runner tests/unit/ai-bridge/assert-dist-clean.test.ts -t 'guard_assumes_again'` | Killed, exit 1: scanner exit was 0 instead of 1. | Exit 0: 1 passed, 28 skipped. |
| `digest_ignores_code` | Hashed only the first analysis source module, omitting `src/vtt/experiment-telemetry.ts`. | `digest_ignores_code: an edit to an analysis source module changes its digest`; `npx vitest run --configLoader runner tests/unit/vtt/experiment-orchestrator.test.ts -t 'digest_ignores_code'` | Killed, exit 1: the source reader never reached the edited telemetry module. | Exit 0: 1 passed, 43 skipped. |
| `partial_emission_silent` | Made the unfinished-queue filter reject every item, restoring silent omission. | `partial_emission_silent: refuses pending work and reports it when partial emission is explicit`; `npx vitest run --configLoader runner tests/unit/tools/scrape-content-pack.test.ts -t 'partial_emission_silent'` | Killed, exit 1: partial emission did not throw. | Exit 0: 1 passed, 37 skipped. |

All three production mutations were restored before this ledger was written.
