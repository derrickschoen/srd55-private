# Bundle fix mutation ledger — 2026-08-23

| Mutation | Temporary change | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `static_import_restored` | Added a static `checkTurnProgramTypes` import from `turn-program-types.ts` to browser-reachable `contracts.ts`. | `the TypeScript compiler is never in the encounter-app bundle > does not occur in the encounter-app static import graph` | **Killed**, exit 1. Reported `encounter-app.ts -> dm-encounter-host.ts -> dm-bridge/client.ts -> dm-bridge/contracts.ts -> turn-program-types.ts -> typescript`. | Import removed; combined boundary-guard run exit 0, 31/31 tests passed. |
| `guard_scope_narrowed` | Temporarily skipped `assets/encounter-app-*` inside the forbidden-literal scan in `tools/assert-dist-clean.mjs`. | `the dist guard FAILS on every way the bridge could leak > guard_scope_narrowed rejects child_process in the encounter-app chunk` | **Killed**, exit 1: expected the synthetic scan exit code to be 1, received 0. | Skip removed; combined boundary-guard run exit 0, 31/31 tests passed. |

Restoration verification command:

    npx vitest run --configLoader runner tests/unit/tools/typescript-compiler-is-never-in-encounter-bundle.test.ts tests/unit/ai-bridge/assert-dist-clean.test.ts

Result: 2 test files passed; 31 tests passed; exit 0.
