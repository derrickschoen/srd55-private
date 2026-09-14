# APP-ANALYSIS-01 — supervisor independent pass, round 1

Recorded 2026-09-13 17:03:55.

Written BEFORE reading astra's round-1 output (astra was still running). Main 45f0bc33. All numbers below were measured by the supervisor on 2026-09-13; anything marked *estimate* came from a regex and is not a measurement.

## Sizing (ts/tsx/mts/mjs/js; node_modules, dist, .tmp excluded)

| area | files | lines |
|---|---:|---:|
| src | 709 | 291,603 |
| tools | 132 | 54,363 |
| tests | 802 | 333,007 |
| scripts | 25 | 6,677 |
| docs (md) | 8 | 900 |

Test-to-source ratio 1.14 by lines. src by subarea: vtt 78,114 (177 files) · combat 35,367 (63) · ui 32,011 (71) · rules 22,840 (59) · catalog 19,068 (44) · domain 12,915 · sharing 11,232 · authoring 10,188 · commands 10,093 · queries 9,772 · simulation 7,782 · backup 7,030 · builder 6,781.

Largest source files: src/combat/encounter.ts 12,967 · tools/ai-dm-conversation.ts 7,594 · src/vtt/party-pack.ts 4,409 · src/backup/character-backup.ts 4,274 · tools/ai-dm-screenshot-probe.ts 3,738 · src/vtt/mcp/engine-server.ts 3,691 · src/vtt/session-persistence.ts 3,527 · src/sharing/character-share.ts 3,466 · src/vtt/encounter-app.ts 3,350 · src/sharing/schema.ts 3,016.

## Import graph (relative imports in src, resolved to files; python Tarjan SCC)

709 files, 3,972 edges, **13 cyclic components, 198 files inside cycles**. Two dominate: a 77-file cycle spanning access/backup/builder/… (spell-access-builder, portable-content, guided-creation, level-up-wizard, equipment-step…) and a 75-file cycle spanning combat (allies, combat-rules, controllers, coordinator, cover, encounter, encounter-movement-world, events…). A 23-file cycle in sharing (schema ↔ wire-schemas/v1…v14 ↔ index). Top fan-in: domain/enums.ts 195, db/database.ts 139, combat/values.ts 135, domain/ids.ts 115, db/codecs.ts 90, combat/encounter.ts 82.

## Test cost (vitest gate initial run, /tmp/dnd-gate-reports/vitest-initial-6555…json, 638 files, 11,288 tests, sum of per-file durations 2,780 s)

| s | tests | file |
|---:|---:|---|
| 691.1 | 107 | tests/unit/tools/ai-dm-conversation.test.ts |
| 317.5 | 57 | tests/unit/tools/ai-dm-arena.test.ts |
| 149.0 | 29 | tests/integration/vtt/survival-policy.test.ts |
| 119.8 | 17 | tests/unit/tools/ai-dm-board-delivery.test.ts |
| 96.4 | 111 | tests/unit/vtt/room-generator-los-cover.test.ts |
| 92.7 | 112 | tests/unit/vtt/renderer-profile.test.ts |
| 80.4 | 26 | tests/unit/tools/d569-v5.test.ts |

tests/unit/tools alone is 1,471 s = 53% of the sum; the top 30 files are 80.6%. The browser suite is a separate 54–57 min. Load-marginal specs seen today: d583-contract-inventory (5,294 ms against a 5,000 ms wall), homebrew-consumer-cutover / homebrew-subclass-authoring (browser, first-attempt failures at load 2), plus the D613 family.

## Construct counts in src (grep; the `as X` figure is an *estimate* that includes `as const`)

`as unknown` 170 · `as any` 3 · `: any` 10 · `@ts-ignore`/`@ts-expect-error` 0 · non-null `!.` 33 · `as <Type>` ~1,545 (top: session-persistence.ts 63, backup/portable-content.ts 52, simulation/contracts.ts 48, combat/encounter.ts 35, character-backup.ts 34, stored-authored-content-projector-v1.ts 33) · `JSON.parse(` 103 · `structuredClone(` 280 · `Object.freeze(` 1,650 · `throw new Error(` 778 vs `class …Error extends` 373.

Retracted signal: "duplicated exported function names" (squeezedPlacementFor ×6, parseSourceCatalogRecord ×5, …) are TypeScript overload signatures on consecutive lines in one file each, not duplication. Not a finding.

## Findings

**S-F1 (architecture, L, high value)** — Two import cycles of 77 and 75 files. Evidence: SCC output above; encounter.ts (12,967 lines, fan-in 82) sits inside the combat cycle, so any combat module transitively imports everything. Why it matters: no module in those groups can be tested, bundled or reasoned about alone; the encounter-app bundle-graph test this week had to walk the whole graph to prove tsc is not in the bundle. Proposal: declare a dependency direction per area (leaf: domain/enums, domain/ids, combat/values, combat/grid; then rules; then reducers; then projections/hosts), and break edges by moving the type-only imports to `import type` and the shared helpers down. Verification: a unit test that computes SCCs from the real import graph and pins `max SCC size <= N`, ratcheted down per landing (same shape as the bundle-graph test). Touches: no ruling found; D586-era "engine authority" boundaries are unaffected.

**S-F2 (architecture, L)** — src/combat/encounter.ts: 12,967 lines, 298 functions, 99 exports, 45 `switch` with 580 `case`s. Proposal: split by reducer domain along the existing event/command types (movement, attacks/damage, conditions, spells, turn/initiative) with encounter.ts re-exporting during the move; keep the test names byte-identical (the mutation ledger and the D583 inventory both key on test names). Verification: the mutation ledger test, the D583 inventory unchanged except paths, tsc. Depends on S-F1 for the cycle break, otherwise the split just moves the cycle.

**S-F3 (test-strategy, M, highest value/risk)** — Cost concentration: two tool specs (ai-dm-conversation 691 s, ai-dm-arena 317 s) are 36% of unit-gate CPU; tests/unit/tools is 53%. Proposal: move model-adjacent transcript/arena tests to a tagged `slow` vitest project that the gate runs once per landing and lanes never run; keep the default `test:gate` under a stated wall (measure: 2,780 s sum today). Verification: gate wall time before/after; the slow project still runs in gate-wt4. Touches D613 (cost-cutting lane authorized after handoff/D569 landed) — this is that lane's first item.

**S-F4 (test-strategy, S)** — Load-marginal walls: d583-contract-inventory at 5.29 s vs 5 s; room-generator-los-cover 96 s for 111 tests; the two homebrew browser specs. Proposal: per D613, size each marginal test's budget from its measured serial time ×3 rather than raising global walls, and move the d583 inventory computation to a cached fixture so the 30 s import graph walk is not rebuilt per test. Verification: the gate's LOAD FLAKES list empties on a quiet run.

**S-F5 (tooling-dx, S, concrete defect)** — tools/vtt-handoff/report.ts REQUIRED_HANDOFF_GATES carries command strings that are unrunnable as written: runtime-parity-playwright and top-down-smoke-playwright omit VTT_HANDOFF_ARTIFACT, which tests/browser/vtt-handoff/playwright.config.ts:21 throws without. Found today when the battery ran the inventory literally. Proposal: represent each gate as `{env, argv}` and add a test that dry-parses every command (or a `--list` mode) so prose cannot drift from the config. Verification: the new test fails on the current strings.

**S-F6 (duplication, M)** — Three hand-rolled module resolvers in a week, two with the same bug class: the encounter-app bundle walker accepted directories (EISDIR), the D583 inventory lacked `.d.ts`/`index.d.ts`, the held-out runtime guard has its own (createRequire, SSR deps). Proposal: one `tools/module-graph/resolve.ts` with a fixture suite (dirs, .d.ts, index files, symlinks, createRequire) and the three consumers deleted down to calls. Verification: fixture tests; the three existing tests keep passing.

**S-F7 (type-safety, M)** — 778 `throw new Error('STRING_CODE')` in src against 373 typed error classes; tests match the strings (e.g. `VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED`, `ART_REQUEST_OUTBOX_MISSING`). A misspelled code is a plausible wrong program that compiles. Proposal: per boundary (handoff tooling, persistence, MCP), a closed union of error codes (`src/refusals` already does this for engine refusals) and an ast-grep rule forbidding bare `throw new Error(` under those paths. Verification: the sg rule; a type test that every emitted code is in the union.

**S-F8 (type-safety, M, estimate-backed)** — Casts concentrate at persistence/codec boundaries: session-persistence.ts 63, portable-content.ts 52, character-backup.ts 34, the catalog projector 33; `as unknown` 170. zod is already a dependency (report.ts). Proposal: parse-don't-cast at those four boundaries with schemas that produce the domain types; keep a ratchet test on the per-file cast count. Verification: the ratchet; round-trip tests already exist (stored-character-round-trip, backup).

**S-F9 (state-and-performance, M)** — Immutability is enforced at publication: 1,650 `Object.freeze`, 280 `structuredClone`, and `detachedImmutable()` over whole snapshots. This is how the O(n²) history projection shipped (dfe62475; 839 snapshots × 1,224 entries = 23.5 s) and was fixed only by caching a frozen prefix. Proposal: freeze at construction (values are already immutable by convention) and make snapshot() structural-sharing by default, with a budgeted benchmark test (the 839×1224 case under 1 s) so the next regression fails a test instead of a session. Verification: the benchmark; session-timeline-record tests.

**S-F10 (docs, S)** — `.ai/DEEP_REF_DATA_LAYER.md` line anchors drifted three times this week; the anchors-resolve test catches it after the fact. Proposal: anchor to symbols (`file#exportName`) instead of line numbers where the test can resolve them. Low value; note only.

## Do not do
- Split files by size alone (party-pack.ts, character-backup.ts): without the cycle break (S-F1) it moves the problem.
- Replace `Object.freeze` wholesale with a library: the convention is load-bearing for the engine-authority boundary; change where it is applied (S-F9), not what it is.
- Delete or skip the slow tool tests to shorten the gate: forbidden by AGENTS.md; relocate them (S-F3).
- Re-pin timeouts upward globally: D544/D613 forbid it; budget per test from measurement.

## Not assessed
UI (src/ui) and PWA behaviour beyond the browser suite; the Godot/Windows side (out of scope by D589); model-facing prompt quality (arena results are the owner's D565+ program).
