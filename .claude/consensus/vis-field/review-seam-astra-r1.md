# VIS-FIELD SEAM — astra review r1 (medium, resumed 01a0a642…): ACCEPT, two P3 record corrections

## Findings

**SEAM-F1 — P3: D635.2 overstates the Large-footprint geometry.**  
Main `.claude/decisions.md:22820` says `(2,0)→(5,3)` is the **only** clear ray. There are **two**:

- `(2,0)→(5,3)`
- `(0,2)→(4,4)`, which touches fog corner `(2,3)` without entering either fog cell.

An independent rational-coordinate calculation found **0/16 clear rays** from the `(0,0)` footprint and **2/16** from the full footprint. An in-memory production-tracer probe confirmed the second ray. The test comment at `tests/unit/combat/visibility-field.test.ts:573–577` does not claim uniqueness and remains correct.

**Fix:** correct D635.2’s explanation; no fixture or expectation change is needed. `BEST_FOOTPRINT_CORNER_IGNORED` still fails.

**SEAM-F2 — P3: the normalization description omits the complementary visible-cell array.**  
Main `.claude/decisions.md:22823` says only `concealedCells` and its carriers differ. My complete payload comparison found **both `cells` and `concealedCells`**, plus their containing payloads’ hashes. This matches the implementer’s report and the D626.9 procedure incorporated by reference.

**Fix:** describe the permitted difference as “`cells` and `concealedCells`, and their containing payloads’ hashes.” No unrelated payload content changed.

**No P1/P2 implementation findings.**

## Rule and implementation verification

### Seam geometry

`src/combat/cover.ts:304–335` checks horizontal/vertical rays on integer grid lines and requires both flanks to block sight.

For integer endpoints, the loops visit exactly the unit edges between the endpoints:

- They include an edge traversed immediately after leaving the source.
- They exclude an edge merely touching the target endpoint.
- Reverse traversal behaves equivalently.
- Zero-length rays, diagonal rays and isolated corner touches add no seam obstruction.

My in-memory endpoint/axis probe passed **16 assertions**, covering both directions, endpoint-only contacts, vertical seams, zero-length and diagonal cases.

Fractional endpoints along an integer row are **not handled generally**: the loop would query fractional cell coordinates. These are not supported grid positions: `combatToken` rejects them at `combatant.ts:352–357`, and `gridDistance` rejects them at `grid.ts:72–79`. All production calls to this private helper obtain corners through `outerCorners`. I found no supported fractional-position path.

### Optical-only behavior

Physical aggregation reads `line.tier` at `cover.ts:390–401`; physical corner selection remains separate at `:534–548`. The seam modifies `firstBlockingCell`, not the physical tier.

My mutation assigning `tier = 'total'` whenever `firstBlockingCell` exists was killed by `PHYSICAL_COVER_UNCHANGED_BY_SEAM`: **expected `half`, received `total`**.

### Endpoint exclusions are not a new grade change

The concern in check (3) does not reproduce. Before this change, source/target cells were already removed from `candidates` before either the optical-set check or total-cover check. Compare pre-seam `cover.ts:474–477` with current `:507–518`.

I ran the same seven-assertion probe against both implementations:

- Optical blockers at source, target, or both: unchanged.
- Physical blockers at queried endpoints: unchanged.
- Heavy-obscurement target: still `unseen`.

Both probes passed. Target obscurement remains separately evaluated at `visibility-field.ts:296–309`.

## Tests, fixtures and pins

- The five seam tests have sound hand-derived expectations. The one-open-side control preserves grazing behavior.
- Loading **pre-seam `cover.ts`** reproduced the unchanged diagonal and physical-cover pins: **2 passed / 35 skipped**.
- Both R02 edits change only the loaded fixture’s blocked cell `(10,2)→(9,2)` and add assertions documenting that change. All original expected values remain unchanged in the diff against `78ee31b0`.
- The fixture JSON is byte-identical; SHA-256:
  `b679f1135883166b7a151e95ac969cc4b7d474d10cd180cac85a9a416eb6898a`.

### Independent D569 demonstration

I loaded the old/new cover modules in memory and captured the actual coordinator and persisted revision payloads. Each run passed **2 tests / 7 skipped**, including the corresponding historical/current pin test.

All six hashes reproduced exactly:

| Payload | Pre-seam | Seam |
|---|---|---|
| Request | `fdaf8775…902fa6e` | `78f31379…e874049` |
| Coordinator | `c31c0264…328b0d` | `f8fa0780…de9c66` |
| Revision | `15ba352a…9e41dc` | `cd99e1c8…284767` |

These match the full literals at `scene-snapshot.test.ts:243–249`.

The payload comparison found only the two visibility arrays and resulting hashes. Restoring those arrays and hash fields produced complete equality.

Independent geometry confirmed:

- **0/16 clear rays** to each of `(7,4)`, `(8,4)`, `(9,4)`.
- Row-4 horizontal rays encounter the shared door/wall edge.
- Other rays enter the door or wall.
- `(7,3)` and `(8,3)` retain their clear row-3 rays: the door’s opposite flank `(6,2)` is open.

The unrelated-content negative control remains at `scene-snapshot.test.ts:263–278`.

### Mutations run

| Mutation | Result |
|---|---|
| `SEAM_RULE_IGNORED` | **2 failed / 35 skipped** |
| `SEAM_ONE_SIDED_BLOCKS` | **1 failed / 36 skipped** |
| `BEST_FOOTPRINT_CORNER_IGNORED` | **1 failed / 36 skipped** |
| Own: seam raises physical tier | **1 failed / 36 skipped** |

**All four killed; no survivors.**

## Commands and validation

Ran:

```bash
git diff --stat 78ee31b0 9a3235da
git diff --check 78ee31b0 9a3235da
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
sha256sum src/combat/cover.ts .tmp-plans/2026-09-15-visibility-field-plan.md
git status --short
```

Results: exactly **5 files, 226 insertions / 25 deletions**; both typechecks and whitespace check **exit 0**; **0 deleted test titles**; maximum added-line width **104**; clean checkout. Frozen-plan SHA matches.

The readable reports mention 19 suites but do **not** contain their complete command. I therefore ran this explicitly selected 19-suite set, rather than claiming to reproduce the supervisor’s 312-test selection:

```bash
npx vitest run --configLoader runner \
  tests/unit/combat/{visibility-field,visibility,terrain,creature-cover,tactical-evaluator,tactical-evaluator-actor-knowledge}.test.ts \
  tests/unit/vtt/{senses,encounter-projections,scene-snapshot,regret,accessible-board,actor-knowledge,detection-reactions,mutation-ledger,tactical-evaluator-r02,dm-tactical-intel,room-generator-los-cover}.test.ts \
  tests/unit/tools/los-cover-call-sites.test.ts \
  tests/unit/bridge/decision-program.test.ts
```

The CLI failed collection with sandbox temporary-directory `ENOENT`: **19 failed suites, 0 tests executed**.

Using `node --input-type=module` and `vitest/node.startVitest` with in-memory configuration, thread pool, cache disabled and four workers, the same selection produced **359 passed / 1 timeout, 19 files**, in **100.66 seconds**. The timeout at `room-generator-los-cover.test.ts:298` subsequently passed alone in **4.98 seconds** against its unchanged 5-second budget. The old-cover comparison passed in **4.76 seconds**. This is a narrow timing margin, not a clean aggregate gate result.

The full visibility-field suite separately passed **37/37**.

Production `cover.ts` SHA was printed before and after every mutation/probe and remained:

```text
c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662
```

VERDICT: ACCEPT

REVIEW DONE