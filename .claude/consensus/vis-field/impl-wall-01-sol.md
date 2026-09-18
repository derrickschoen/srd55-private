<!-- trimmed 2026-09-18 (D683): full codex log (3587208 bytes) replaced by the lane's final message; session id 01a0ab3f-96a8-7fc1-994c-72e9caed0044; the full log is in the mirror history of commit 8889b450 -->

Implemented D642 solid-wall vertex sealing in [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts:304) with hand-authored witnesses in [visibility-field.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/combat/visibility-field.test.ts:1054).

### Implementation

- Enumerates strict-interior lattice vertices exactly using `gcd(|dc|, |dr|)` and integer steps.
- Precomputes sealed vertices from TL+BR and TR+BL sight-blocker pairs.
- Excludes endpoint vertices explicitly.
- Orders cell-interior, shared-edge, and sealed-vertex events by segment progress.
- Simultaneous events and pair choices use lower row, then lower column.
- Physical cover remains derived exclusively from `interveningCells`; vertex hits affect only `blocksSight` and `firstBlockingCell`.
- World-object and blocked-cell sight blockers share the same topology.

Final hashes:

```text
aa1c7272dc050ee575dd6d0f958e8bf94795a2fc8fca18808af124d9190a4d64  src/combat/cover.ts
85649f626ea5cef205af2e5463023f7ebcf08244a538355b64b7bf5fed635f53  tests/unit/combat/visibility-field.test.ts
```

### Witnesses and physical cover

Pre-change physical run, with `cover.ts` SHA `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`:

```bash
npx vitest run --configLoader runner tests/unit/combat/visibility-field.test.ts \
  -t 'PHYSICAL_COVER_UNCHANGED_BY_(VERTEX|SEAM)'
```

Result: 2 passed, 41 skipped; tests 9 ms, duration 2.76 s. The canonical crack tier was `half`.

Final command:

```bash
npx vitest run --configLoader runner tests/unit/combat/visibility-field.test.ts
```

Result: 43/43 passed; tests 57 ms, duration 2.79 s.

This includes:

- `DIAGONAL_CRACK_SEALED`
- `DIAGONAL_CRACK_CONTROL_ONE_BLOCKER`
- `STAIRCASE_WALL_SEALED`
- `OUTER_FACE_GRAZE_STILL_CLEAR`
- `SOLID_2x2_BLOCK`
- `DIAGONAL_CORNER_TOUCH_SEALED_D642`
- `PHYSICAL_COVER_UNCHANGED_BY_VERTEX`
- Existing `PHYSICAL_COVER_UNCHANGED_BY_SEAM`

### Mutants

Starting/restored production SHA: `aa1c7272…a4d64`.

- Vertex rule disabled, SHA `cb3abe24…d0087`: exactly 3 reds:
  - `DIAGONAL_CRACK_SEALED`
  - `STAIRCASE_WALL_SEALED`
  - `DIAGONAL_CORNER_TOUCH_SEALED_D642`

- Single diagonal blocker seals a vertex, SHA `484c0147…f1de4`: `DIAGONAL_CRACK_CONTROL_ONE_BLOCKER` red; the `(0,1)->(4,3)` ray changed from clear/null to blocked at `(2,1)`.

- Vertex raises physical tier, SHA `cce80b92…0b99d`: `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` red, received `total` instead of hand-pinned `half`.

Production was restored and 43/43 passed.

### Frozen-family consequences

Command:

```bash
npx vite-node /tmp/wall01-counts.ts
```

Counts are unchanged before (`c8852c97…`) versus after (`aa1c7272…`):

| Family | Monsters | Before offers / shotless | After offers / shotless |
|---|---:|---:|---:|
| hard | 75 | 142 / 35 | 142 / 35 |
| brutal | 44 | 57 / 34 | 57 / 34 |
| brutal-b | 42 | 15 / 41 | 15 / 41 |
| brutal-2 | 44 | 58 / 36 | 58 / 36 |

Thus D642 introduces no additional frozen-family productivity loss beyond D635.

### Generator bytes

`generatedLineIsOpen` needs no change: it already requires both `tier === 'none'` and `!trace.blocksSight`.

The 42-room before/after comparison reported:

```text
beforeCount=42
afterCount=42
beforeAggregate=7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc
afterAggregate=7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc
byteIdentical=true
changedSeeds=[]
```

### Required suite audit

Command:

```bash
npx vitest run --configLoader runner \
  tests/unit/combat/*.test.ts \
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

Baseline: 35 failed, 2242 passed; wall 96.58 s.

Final: 37 failed, 2246 passed; 8 failed / 46 passed files; wall 104.77 s. All 35 semantic reds are identical to the 807d2e3c baseline. Zero existing expectations changed beyond the authorized witness file.

Exact red groups:

- Six `d569-blind-experiment` titles:
  - `validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment`
  - `dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows`
  - `adds exactly 180 separately labeled advice-assisted hint cells, 660 total`
  - `consumes the frozen second encounter family for all 480 core cells`
  - `records exact model effort cli and cliVersion for every observed row`
  - `rejects either decisive integrity field alone while preserving rows with neither field`
  - Cause: seven pre-existing `second_family_brutal_productivity` violations.

- Eight `d569-second-family-manifest` titles:
  - `pins the amended exact contiguous ranges and verbatim independent ledger evidence`
  - Seven `seed-620700{2,4,5,6,7,8,9}.json satisfies budget, caster, terrain, and productive-offer invariants before its pin`
  - Cause: the existing 47 ledger markers and seven brutal-2 productivity violations.

- Ten `arena-basis-brutal-b` titles:
  - `pins seed 6206001…6206010 only after proving every brutal membership property from state`
  - Cause: each frozen seed has a monster without a productive first-turn offer.

- Eight `room-generator` titles:
  - `generates brutal seed 620300{1,2,3,4,6,8,9,10} with executable casters, dense terrain, scaled pressure, and productive monsters`
  - Cause: existing `brutal_productivity` violations.

- `projects fresh options for every requested generated-room monster turn`
  - Cause: Scout has only Dodge/End Turn; the frozen Longbow options remain blocked by D635 geometry.

- `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`
  - Cause: expected Dash movement remains Dodge at zero movement under the sealed D635 sightlines.

- `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`
  - Cause: scenario menu remains empty under the frozen sightline geometry.

Two additional non-frozen findings, not repinned:

- `kills M576-E2-WALL-SEALS-ROOM for every living footprint size`: 5,054 ms against 5,000 ms.
- `retains a productive first-turn option for every living monster in the versioned basis`: 5,384 ms against 5,000 ms.

These are timeout-only; no assertion changed.

D630 command:

```bash
npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts
```

Result: 2 files, 36/36 passed; Vitest duration 38.57 s; wall 39.00 s, below the 41-second ceiling.

### Final verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
git diff --check
```

Results: app exit 0, node exit 0, diff-check exit 0, forbidden additions 0, lines over 120 characters 0.

Final status:

```text
 M src/combat/cover.ts
 M tests/unit/combat/visibility-field.test.ts
```

WALL-01 DONE
