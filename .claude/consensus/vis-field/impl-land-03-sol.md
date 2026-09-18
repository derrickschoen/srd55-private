<!-- trimmed 2026-09-18 (D683): full codex log (1498700 bytes) replaced by the lane's final message; session id 01a0ae59-86c2-7cb1-8b2e-bbf96f72fd73; the full log is in the mirror history of commit 8889b450 -->

Implemented LAND-01-FIX-R1 and LAND-03.

Files changed:

- [engine-query-port.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/engine-query-port.test.ts)
- [ai-dm-board-snapshot.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts)
- [ai-dm-board-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-board-snapshot.test.ts)
- [ai-dm-board-delivery.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-board-delivery.test.ts)
- [entrypoint.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/mcp/entrypoint.ts) — both launcher validators independently recomputed the obsolete raw digest; aligned them after the delivery witness exposed the mismatch.

Witnesses:

- `SAVE_OFFER_IGNORES_BLOCKS_SIGHT refuses Web behind a full column and opens when removed`
  - Giant Spider `(0,1)`, target `(5,1)`, blocking column `(3,0..2)`.
  - Blocked trace: `tier: half`, `blocksSight: true`; Web refused with `target_outside_line_of_sight`.
  - Column removed: `tier: none`, `blocksSight: false`; Web offered.
- `offered attacks and saves have query-clear traces; attacks also pass reducer LOS enforcement`
  - Directly checks the query’s `traceCombatantLine` semantics cited at `engine-query-port.ts:1168-1170`.
  - Checked 214 offers, 316 attack/save components, including four save components.
  - Reducer remains an additional check: attacks enforce LOS; saves currently do not.
- `binds to the DM projection digest when a non-empty derived fog field separates it from raw state`
  - Five-cell row, observer at `0`, wall at `2`, darkness at `3–4`.
  - Hand-pinned derived fog: cells `3–4`.
  - Projected digest equals `boardStateDigest`; raw-state digest differs.

Mutants:

- Task A full-column save mutant:
  - Command: `npx vitest run --configLoader runner tests/unit/vtt/engine-query-port.test.ts --maxWorkers=1 -t 'offered attacks and saves have query-clear traces'`
  - Mutant: 1 failed, 19 skipped; `seed-6203010.json` Web reported `blocksSight: true`.
  - Restored: 1 passed, 19 skipped.
- Task B reverse mutant restoring raw `canonicalJson(state)`:
  - New witness: 1 failed, 21 skipped.
  - Restored projected definition: 1 passed, 21 skipped.
  - Final production file hash restored to `e9398ff7d97d62804920ce6a3ac017917ad932949574bc47415e0eaa4a48e55c`.

Verification:

- `npx vitest run --configLoader runner tests/unit/vtt/engine-query-port.test.ts --maxWorkers=1`
  - 20/20 passed.
- Board snapshot + screenshot probe:
  - 48/48 passed.
- Board delivery isolated:
  - 17/17 passed.
- `tests/unit/tools/ai-dm-conversation.test.ts`
  - 110/110 passed.
- `PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/ai-dm-board-snapshot.spec.ts --project=chromium`
  - 2/2 passed in 2.0 minutes.
- `npx tsc -p tsconfig.app.json --noEmit`
  - Exit 0.
- `npx tsc -p tsconfig.node.json --noEmit`
  - Exit 0.
- `git diff --check`
  - Clean.
- Added-line width check:
  - No added line over 120 columns.
- No fixture, `.claude`, or `docs` changes.

Expected red set remains unchanged:

- Brutal-b: 37 passed, exactly ten productivity failures—`pins seed 6206001...` through `pins seed 6206010...`.
- The canonical six D569 failures retain the same titles:
  - `validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment`
  - `dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows`
  - `adds exactly 180 separately labeled advice-assisted hint cells, 660 total`
  - `consumes the frozen second encounter family for all 480 core cells`
  - `records exact model effort cli and cliVersion for every observed row`
  - `rejects either decisive integrity field alone while preserving rows with neither field`

The additionally requested `d569-second-family-manifest` and `d569-v5` files expose the same already-ruled frozen-family invalidity earlier: the ledger pin plus seeds `6207002`, `6207004–6207009`, and `d569-v5` manifest bootstrap validation. No failure involves a `stateDigest`, embedded digest, or LAND-03 regression.

During execution the supervisor committed LAND-02, advancing HEAD from `ebfcacaa` to `61dd454e`. I did not touch that file; its hash remains `cb89f2ddc5a8b7af2f564b496a88f2d568b456518ccda4623083162f9d079227`. Final status contains exactly the five files listed above.

LAND-01-FIX-R1+LAND-03 DONE
