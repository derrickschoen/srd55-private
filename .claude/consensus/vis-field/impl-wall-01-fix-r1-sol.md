<!-- trimmed 2026-09-18 (D683): full codex log (1274116 bytes) replaced by the lane's final message; session id 01a0ab3f-96a8-7fc1-994c-72e9caed0044; the full log is in the mirror history of commit 8889b450 -->

Implemented the bounding-box-independent D642 vertex lookup in [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts:360) and added the exact axis witnesses in [visibility-field.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/combat/visibility-field.test.ts:1102).

Key behavior:

- Strict-interior lattice vertices are enumerated by GCD.
- TL/BR and TR/BL are queried directly through `sightBlockingAt`, independent of raster candidates.
- Pair winner is lower row, then lower column.
- Interior, shared-edge, and vertex hits merge by traversal progress.
- Physical cover remains driven exclusively by `interveningCells`.
- `coverTierBetweenObjects` uses the same corrected trace path.
- The exact named corner rays now seal:
  - Horizontal `(13,4)→(1,4)`: first `(7,3)`.
  - Mirrored horizontal: first `(8,3)`.
  - Vertical `(5,0)→(5,6)`: first `(4,2)`.
- Their pre-fix physical tier remains Half. Other outer-face rays remain clear, as required by B3.

Verification:

```text
npx vite-node /tmp/wall01-f1-probe.ts
```

Pre-fix cases a/b/c and split control: `tier=half`, `blocksSight=false`, `firstBlockingCell=null`.

```text
npx vitest run --configLoader runner tests/unit/combat/visibility-field.test.ts
```

Result: 1 file passed, 46/46 tests passed.

Mutants, using the final production SHA `e8e97592b4dad1a755a978706d83d2f9953fe9f2dd66339c816fc29f7abc616b`:

- Vertex disabled, SHA `6bf8b621…`: 5 reds, including all three axis witnesses.
- Either-side blocks, SHA `f43843f0…`: 10 reds, including `DIAGONAL_CRACK_CONTROL_ONE_BLOCKER` and the split control.
- Candidate-bbox restriction restored, SHA `f1314569…`: exactly the three axis witnesses red.
- Vertex allowed to raise cover, SHA `e8b49181…`: `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` red, Half → Total.
- Restored production: 46/46 green.

Frozen-family consequences, old `c8852c97…` → final `e8e97592…`:

| Family | Monsters | Offers before/after | Shotless before/after |
|---|---:|---:|---:|
| hard | 75 | 142 / 142 | 35 / 35 |
| brutal | 44 | 57 / 57 | 34 / 34 |
| brutal-b | 42 | 15 / 15 | 41 / 41 |
| brutal-2 | 44 | 58 / 58 | 36 / 36 |

`generatedLineIsOpen` remains unchanged and consumes `blocksSight`. The 42 generated rows are byte-identical before/after; both aggregate to `7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc`.

Suite audit:

```text
npx vitest run --configLoader runner tests/unit/combat/*.test.ts \
  tests/unit/vtt/room-generator-los-cover.test.ts \
  tests/unit/vtt/engine-query-port.test.ts \
  tests/unit/vtt/room-generator.test.ts \
  tests/unit/vtt/arena-basis-brutal-b.test.ts \
  tests/unit/vtt/composite-turn-proposals.test.ts \
  tests/unit/vtt/engine-opportunity-movement-intel.test.ts \
  tests/unit/vtt/speculative-planning.test.ts \
  tests/unit/tools/d569-blind-experiment.test.ts \
  tests/unit/tools/d569-second-family-manifest.test.ts \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts
```

Result: 54 files, 46 passed / 8 failed; 2,247 tests passed / 39 failed; 113.54 wall seconds.

The unchanged 35 frozen/behavior reds were:

- Six `d569-blind-experiment` titles: “validates the exact v5…”, “dry-runs versioned…”, “adds exactly 180…”, “consumes the frozen second…”, “records exact model…”, and “rejects either decisive…”. Cause: `second_family_brutal_productivity`.
- `d569-second-family-manifest`: ledger pin plus seeds 6207002, 6207004–6207009. Cause: regeneration/productivity invariants.
- `arena-basis-brutal-b`: all seed-pin titles 6206001–6206010. Cause: no productive first-turn offer.
- `room-generator`: brutal seed titles 6203001–6203004, 6203006, and 6203008–6203010. Cause: `brutal_productivity`.
- `composite-turn-proposals`: “projects fresh options…”; Scout has only Dodge/End Turn.
- `engine-opportunity-movement-intel`: “does not repeat…”; three actors select zero-movement Dodge instead of Dash.
- `speculative-planning`: “forms a bounded…”; scenario menu is empty.

New non-frozen performance finding, not repinned: four fixed 5-second timeouts in the combined audit:

- `kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture`
- `kills M576-E2-WALL-SEALS-ROOM for every living footprint size`
- `retains a productive first-turn option for every living monster in the versioned basis`
- `kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side`

Isolated, that file reported 110/112 passed with the middle two timeouts, wall 112.32 seconds.

D630:

```text
npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
```

Result: 2 files, 36/36 passed; wall 39.09 seconds, below the 41-second ceiling.

Final checks:

- `npx tsc -p tsconfig.app.json --noEmit` — exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` — exit 0.
- `git diff --check` — exit 0.
- Lines over 120 characters — 0.
- `git status --short` shows exactly:
  - `M src/combat/cover.ts`
  - `M tests/unit/combat/visibility-field.test.ts`

WALL-01-FIX-R1 DONE
