<!-- trimmed 2026-09-18 (D683): full codex log (5464113 bytes) replaced by the lane's final message; session id 01a0b20e-61fa-7e52-897b-3b01b026c2ff; the full log is in the mirror history of commit 8889b450 -->

Implemented endpoint-junction sealing in [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts:409), with witnesses in [visibility-field.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/combat/visibility-field.test.ts:1102).

### Implemented rule

At a sealed diagonal lattice vertex:

- Source rays block only when leaving diagonally into the quadrant opposite the source cell.
- Target rays use the mirrored arrival rule.
- Axis-aligned rays remain governed by the shared-edge rule.
- Zero-length corner rays between opposite free quadrants are blocked.
- Endpoint hits retain progress `0`/`1`; existing progress and lower-row/lower-column ordering remains.
- Physical cover is unchanged.
- The same endpoint metadata/path is used by `coverTierBetweenObjects`.

Corner ownership is explicitly mapped: TL→BR, TR→BL, BL→TR, BR→TL.

### Witness derivations

| Witness | Hand-derived geometry | Result |
|---|---|---|
| `SOURCE_ENDPOINT_JUNCTION_SEALED` | Observer `(2,1)` bottom-left corner is vertex `(2,2)`, with its cell in TR. Ray `(2,2)→(0,4)` leaves into opposite BL through TL `(1,1)` + BR `(2,2)`. | `tier none`, blocked, first `(1,1)` |
| `TARGET_ENDPOINT_JUNCTION_SEALED` | Reverse ray `(0,4)→(2,2)` arrives from BL, opposite the target cell’s TR quadrant, through the same pair. | `tier half`, blocked, first `(1,1)` |
| `SAME_SIDE_ENDPOINT_GRAZE_CLEAR` | `(2,1)→(5,1)` stays on the source side or follows an edge. Mirrored ray `(5,1)→(2,2)` arrives through the target’s own TR quadrant, not opposite BL. | Clear, `firstBlockingCell null` |
| `ADJACENT_CORNER_ZERO_LENGTH` | Source `(2,1)` is TR and target `(1,2)` is BL at vertex `(2,2)`. TL `(1,1)` + BR `(2,2)` separate those opposite free quadrants. | Zero-length and diagonal rays blocked at `(1,1)`; removing BR makes the scene clear |
| Physical-cover pin | `(0,4)→(2,2)` stops optically at the endpoint pinch without crossing an interior. | Line remains `tier none` |
| D569 normalization | Existing `DIAGONAL_CORNER_TOUCH_SEALED_D642` was previously aggregate clear/null because endpoint `(1,1)` was skipped. The source cell lies TL; all four rays from `(1,1)` toward `(2,2)..(3,3)` leave into opposite BR through TR `(1,0)` + BL `(0,1)`. | Normalized only aggregate to blocked, first `(1,0)`; physical tier remains `none` |

### Mutants

- Endpoint rule disabled: exactly `SOURCE_ENDPOINT_JUNCTION_SEALED` and `TARGET_ENDPOINT_JUNCTION_SEALED` red; both changed to clear/null.
- Every sealed endpoint blocked regardless of direction: `SAME_SIDE_ENDPOINT_GRAZE_CLEAR` red; mirrored ray became blocked at `(1,1)`.
- Endpoint optical hit raised physical tier: `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` red; received `total` instead of `none`.
- Production was restored; visibility suite passed 50/50.

### Frozen-family counts

`npx vite-node /tmp/wall01-r4-counts.ts`

| Family | Monsters | `bc6422bf` offers / shotless | Final offers / shotless |
|---|---:|---:|---:|
| hard | 75 | 142 / 35 | 142 / 35 |
| brutal | 44 | 57 / 34 | 57 / 34 |
| brutal-b | 42 | 15 / 41 | 15 / 41 |
| brutal-2 | 44 | 58 / 36 | 58 / 36 |

### Generation-byte check

`npx vite-node /tmp/wall01-r4-generation.ts`

- Rooms: 42
- Before and after aggregate: `7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc`
- Byte-identical: yes
- Changed seeds: none

### Verification

- R3 scene command: 4 files, all five requested tests passed; 121 skipped.
- `npx vitest run tests/unit/combat/visibility-field.test.ts --reporter=dot`: 50/50 passed.
- Frozen ten-suite command: 246 passed, exactly the known 35 frozen reds, wall 34.95 s.
- Red titles remained:

  - Six `d569-blind-experiment` titles: validation, dry-run, 180 hint cells, second-family consumption, model metadata, and decisive-integrity rejection.
  - `d569-second-family-manifest`: ledger title plus seeds `6207002, 6207004–6207009`.
  - `arena-basis-brutal-b`: all ten `pins seed 6206001…6206010` titles.
  - `room-generator`: brutal seeds `6203001–6203004, 6203006, 6203008–6203010`.
  - `projects fresh options for every requested generated-room monster turn`.
  - `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`.
  - `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`.

- LOS/cover full matrix: 109 passed; timeout-only reds were `WALL-SEALS-ROOM`, productive-first-turn, and the marginal `ONE-SIDE-CANNOT-CHANGE-COVER`; no assertion mismatch and no repin.
- Requested isolated 5-second timings:

  - `WALL-SEALS-ROOM`: 5.675 s.
  - Productive-first-turn: 5.643 s.

- Replay+detection: 36/36 passed; Vitest 38.97 s, wall 39.42 s, below 41 s.
- `npx tsc -p tsconfig.app.json --noEmit`: passed.
- `npx tsc -p tsconfig.node.json --noEmit`: passed.
- `git diff --check`: passed.
- Added lines over 120 characters: zero.
- `git status --short`:

```text
 M src/combat/cover.ts
 M tests/unit/combat/visibility-field.test.ts
```

WALL-01-FIX-R4 DONE
