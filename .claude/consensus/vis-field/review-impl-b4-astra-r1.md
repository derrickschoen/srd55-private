# VIS-FIELD B4 — astra review r1 (medium, resumed 01a0a642…, 1.05 M tokens): REJECT (1 P1: eight exchange-response paths outside the literal allowance)

## Finding

**B4-F1 — P1: seven protocol-fixture paths changed outside the explicit allowance.**

Evidence: `fixtures/protocol/examples.v1.json:1956` (`player-a.snapshot`) and `:3391` (`player-b.snapshot`). Comparing parsed JSON from `75c2f44a` against `2e360685` found these additional changes:

```text
$.exchanges[4].response.result.props
$.exchanges[4].response.result.vision.explored
$.exchanges[4].response.result.vision.visible
$.exchanges[5].response.result.lights
$.exchanges[5].response.result.props
$.exchanges[5].response.result.tokens
$.exchanges[5].response.result.vision.explored
$.exchanges[5].response.result.vision.visible
```

That is **eight**, rather than seven, additional paths when enumerated explicitly: three for player A and five for player B. The stated allowance covers protocol **events**, not these exchange responses.

These changes are mechanically justified: each response equals its seat’s initial streamed snapshot exactly. I found no unrelated payload change. Nevertheless, the task explicitly classifies any additional path as P1.

**Fix:** obtain a narrowly scoped ruling permitting these eight snapshot-response paths, preserving all other exchange content. Do not restore stale visibility values merely to satisfy the existing allowance.

## Verification

### Scope and remaining references

Exactly **17 files, 267 insertions / 4,868 deletions**. Frozen-plan SHA matches. No engine-cost implementation changed.

Removed inputs, with **pre-B4 line numbers**:

| File | Removed input |
|---|---|
| `src/vtt/reference-encounter.ts:124` | `(8,1),(8,2)`; declaration at `:86` |
| `src/vtt/stored-character-encounter.ts:129` | `(8,1),(8,2)` |
| `src/vtt/vane-warren.ts:560` | Six cells across columns 11–13, rows 1 and 8 |
| `src/vtt/d365-sample-dungeon.ts:321` | Empty authored list |
| `src/vtt/handoff/fixtures/two-room.ts:112` | `(8,4)` |
| `src/vtt/generated-encounter-fixtures.ts:832` | Copy from `layout.fog.cells` |
| `src/vtt/test-approved-first-skirmish.ts:64` | Six authored package cells |
| `tools/vtt-soak.ts:174` | Copy from reference setup |

`rg -n 'foggedCells' src tools` found **42 references in 12 files**:

| File and every remaining line | Disposition |
|---|---|
| `combat/encounter.ts:766,836,1317,1318,1319,1397,2273` | Delayed B2: declarations, initialization and remaining veto |
| `combat/visibility.ts:45,314,523,733` | B2 classification/state cleanup; derived projection remains |
| `vtt/encounter-state-codec.ts:27,403,406,408` | B2 migration work |
| `vtt/intel/actor-knowledge.ts:263` | B2 fog veto removal |
| `vtt/semantic-board-payload.ts:38,358,452,551,552` | B2 state-source cleanup; B6 semantic projection |
| `tools/vtt-experiment.ts:1339` | B5 |
| `tools/ai-dm-blind-board-snapshot-check.ts:116` | B5 |
| `tools/ai-dm-screenshot-probe.ts:240,311,573,966,1051,1188,1471,1855,1956,2414,2529` | B5 removes synthetic state mutation at `:2414`; other references describe probe/projection data |
| `vtt/encounter-board.ts:113,263,716,872` | Retained projection inputs/output; `:716` derives fog |
| `vtt/encounter-app.ts:2199,2202` | Retained projection consistency check |
| `vtt/accessible-board.ts:182` | Retained projection consumer |
| `tools/assets/generate-starter-art.ts:115` | Audit-only board-preview literal |

Paths abbreviated relative to `src/` unless beginning with `tools/`. The V1 decoder **does not yet discard fog**: it returns the validated state at `encounter-state-codec.ts:448`. That is correctly deferred to B2, not completed B4 work.

### Hand oracles

**Reference:** setup positions are `(2,3),(1,4),(1,2)`; the sole physical blocker is `(7,2)` and sole dark target is `(4,3)` (`reference-encounter.ts:112–127`). Rays to cells above the blocker can pass above it; row-2 targets have a clear bottom-edge ray along `y=3`; lower targets pass below it. Target-cell exclusion handles the blocker cell itself. Thus **70 cells − 1 dark target = 69 visible**.

**Vane:** positions are at `vane-warren.ts:502–510`; blockers `(4,1),(4,8)` at `:557`. Objects explicitly do not block sight (`:319`). The four dim and four lightly obscured cells remain visible (`:354–370`).

A constructive proof uses just the PC at `(1,4)`:

- Targets in columns 0–4: rays end before crossing column 4.
- For target `(c,r)`, `c≥5,r≤3`: use `(2,5)→(c+1,r+1)`, passing below the upper blocker.
- For `c≥5,r≥4`: use `(2,4)→(c+1,r)`, passing above the lower blocker.

Independent rational-coordinate checking found **zero failed witnesses across 140 cells**. Fog is therefore `[]`, without deriving the expectation from engine output.

The same independent geometry calculation reproduced:

```text
Reference:       69 visible / 1 concealed
Vane:           140 visible / 0 concealed
Scene fixture:   69 visible / 1 concealed
Two-room A:      48 visible / 48 concealed
Two-room B:      56 visible / 40 concealed
```

**Two-room:** the closed-door enumeration is correct: four top seam rays, four bottom seam rays, and eight cross rays entering the door. Reverse rays are symmetric. Column 5 remains visible as target cells, giving A columns 0–5 and B columns 5–11.

Opening the doorway clears `(4,4)→(8,4)` because only the upper flank blocks. Both seat streams contain revisions **`[0,1,2,3,4]`**, with opening at 3 and closing at 4. The current assertions cover every event, including exactly one event at the open revision.

### Historical fixture reproduction

Ran an in-memory archive/bundle of the actual producers:

```bash
git archive 75c2f44a | node --input-type=module -e '<in-memory archive producer harness>'
```

All three generated byte strings matched their historical blobs:

| Fixture | Historical SHA prefix | Equality |
|---|---|---|
| `two-room.v1.json` | `6c481b2b…` | Exact |
| `two-room.snapshots.v1.json` | `3c2b7623…` | Exact |
| `examples.v1.json` | `9fc9a587…` | Exact |

Repeating against `2e360685` reproduced all three current fixtures exactly. The actual `generateTwoRoomFixtureFiles({check:true})` also passed in memory.

Parsed differences were:

- Source fixture: **1 path**, `$.state.foggedCells`.
- Snapshot fixture: **8 paths**, exactly the permitted set.
- Protocol fixture: **45 paths**—37 event paths plus the **8 response paths in B4-F1**.

### Scene-snapshot normalization

Old/new in-memory probes each passed **2 tests / 7 skipped**.

Only these revision-body fields changed:

```text
encounterState.foggedCells
branchRngStateFingerprint
```

The key remains present as `[]`. Independent Node SHA-256 calculation over `canonicalJson(mechanicalBranchState(state))` reproduced:

```text
Old: 8651c9282c685fb9fd5650c5df5e5e456e6c2f2a521c30c5c56a945fbaef7dc7
New: 163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b
```

Request/coordinator hashes remained unchanged. Old/new revision checksums matched the literals at `scene-snapshot.test.ts:248–253`. The unrelated-content negative control remains at `:268–282`.

`regret.test.ts` only removes the obsolete setup copy; no behavior assertion changed. The Vane test was renamed, not deleted.

### Controls and mutants

All three runtime mutants were killed:

| Mutation | Result |
|---|---|
| Reference darkness → bright | **1 failed / 20 skipped** |
| Vane dim → darkness | **1 failed / 30 skipped** |
| Own: schema and package regain `layout.fog.cells` | **1 failed / 20 skipped** |

The in-memory TypeScript compile control produced exactly one diagnostic:

```text
src/vtt/generated-encounter-fixtures.ts:819 TS2339:
Property 'cells' does not exist on type
'{ hiddenAssetId: string & $brand<"AssetId">;
   unexploredAssetId: string & $brand<"AssetId">;
   revealedAssetId: string & $brand<"AssetId">; }'.
```

Production hashes were printed before/after and remained unchanged.

## Commands and test results — my runs

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
git diff --check 9a3235da 2e360685
npx vite-node tools/vtt-handoff/generate-fixtures.ts --check
```

- Both TypeScript checks: **exit 0**.
- Diff check: **exit 0**.
- Maximum added-line width: **111**.
- CLI generator: blocked by read-only `.vite-temp`; its in-memory `check:true` invocation passed.
- Working tree remained clean.

The report’s exact **20-suite selection** ran through `vitest/node.startVitest`, with thread pool, four workers, cache disabled and in-memory configuration:

- **393 passed / 7 failed**, 400 tests.
- Five failures: `/tmp` publication-test writes prohibited by the sandbox.
- Two failures: unchanged 5-second room-generator timeouts.
- Both timeout tests passed on isolated rerun: **2 passed / 109 skipped**, 9.73 seconds of test execution.

Timing pair, using the same runner with one worker:

```text
tests/unit/vtt/replay.test.ts
tests/unit/vtt/detection-reactions.test.ts
```

**36/36 passed; 40.09 seconds**, below D630’s 42-second ceiling. B4 changes no engine cost path.

VERDICT: REJECT (1 P1, 0 P2)

REVIEW DONE