<!-- trimmed 2026-09-18 (D683): full codex log (457088 bytes) replaced by the lane's final message; session id 01a0b492-a268-71e1-a5b4-462354754f60; the full log is in the mirror history of commit 8889b450 -->

**PLAN-F4 — P1 — The new approach rule still misclassifies corridors and misses genuine openings.**  
Location: [plan lines 105–119](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/.tmp-plans/2026-09-18-blind-01-plan.md:105).

The stated controls pass with thin walls and sufficiently separated gaps. The general claim does not.

Two counterexamples, evaluated literally using real terrain, tracer, and path queries:

1. **One-wide corridor with two-cell-thick walls:** a 5×7 board whose only passable cells are `(2,1)` through `(2,5)`.

   ```text
   #####
   ##.##
   ##.##
   ##.##
   ##.##
   ##.##
   #####
   ```

   Required approaches: `{}`. Actual: **`{(2,2),(2,3),(2,4)}`**.

   Each interior cell qualifies as a horizontal gap: its crossing neighbors are passable, and both caps and continuations are walls. The extra continuation check therefore does not distinguish corridor interiors from openings.

2. **Closely spaced openings:** enclosed 9×9 board, dividing wall at column 4, gaps at rows **3 and 5**.

   Required: `{(4,3),(4,5)}`. Actual: **`{}`**.

   Each gap’s continuation encounters the other gap. The same failure occurs with gaps at rows **2 and 4**. “Multiple gaps are classified independently” is false.

**Fix:** escalate the approach definition to the owner under the final-round rule. Require both counterexamples as RED controls, alongside the existing controls. Decide the intended treatment of wall thickness and closely spaced openings before implementation; changing expected sets to match this heuristic would not prove D664’s intended behavior.

The complete requested control results were:

| Control | Literal r3 approach set | Hand oracle |
|---|---|---|
| Sealed 9×5 | `{(0,2)}` | Matches |
| Enclosed 5×5 | `{}` | Matches |
| Single gap, enclosed 9×9 | `{(4,4)}` | Matches |
| Two-cell-wide gap | `{(4,3),(4,4)}` | Matches |
| Two gaps at rows 2 and 6 | `{(4,2),(4,6)}` | Matches |
| Open 4×3 | `{(0,0),(1,0),(2,0),(3,0),(0,1),(3,1),(0,2),(1,2),(2,2),(3,2)}` | Matches: 10 |
| Open authored door | `{(3,2)}` | Matches |
| Closed authored door | `{}` | Matches |
| Thin-walled one-wide corridor | `{}` | Matches |
| Thick-walled one-wide corridor above | `{(2,2),(2,3),(2,4)}` | **Fails** |
| Enclosed L-wall | `{}` | Matches |
| Two gaps at rows 3 and 5 | `{}` | **Fails** |

For reproducibility: gap controls used perimeter walls plus column 4; door controls used a 7×5 perimeter and column-3 divider; the L-wall occupied `(4,2..6) ∪ (4..6,6)` inside a 9×9 perimeter. The thin corridor’s passable cells were `(1,1..5)` on a 3×7 board.

For **6209001**, both party-side and monster-side origins produce the same **81 approaches**:

- `(x,0)` and `(x,20)` for `x ∈ {0..10,12..21}`;
- `(0,y)` and `(21,y)` for `y ∈ {1..19}`;
- gap `(11,11)`.

That is **80 boundary cells plus one opening**. The passable gap connects both sides; the definition does not restrict approaches to the actor’s side.

The other r2 findings are closed:

- **F2 — lines 285–330:** B3/B4 each have **10 paths**; B4 owns its RED witnesses; B3 verifies **three files total**. In-memory type expansion reproduced **15 app / 17 node diagnostics**. B2-owned repairs leave exactly **6 / 8**; B3-owned repairs reach **0 / 0**, retained at the B4 boundary. This verifies the expansion’s consumer coverage, not the future implementation’s behavior.
- **F3 — lines 29–36, 361–372:** B7 wiring explicitly precedes COHORT B3. Focused checks cannot complete B7; the **30-fixture** full-file gate remains outstanding. The prerequisite contains **0/30** fixtures.
- **F8 — lines 168–184:** The replacement relocation fixture works. Both states have **26 reachable candidates**, **17 maximal profiles**, and exactly **two cheapest maxima**, `(2,1)` and `(2,5)`, each costing **10 ft**. Canonical selection remains `(2,1)`; the named hidden-row mutant selects `(2,1)` then `(2,5)`. **Mutant killed.**
- **F10 — lines 225–240:** The amendment preserves `targetedOffenseHasOpenTrace`. Extracting the actual prerequisite predicate reproduced: valid Web resolution **true**, open-scene productivity **true**, blocked-scene productivity **false**, structural component **true**, blocked trace **half / blocksSight=true**.
- **F11 — lines 47–61, 269–271:** The equivalent fallback-only mutant is retired; the `hiddenNow` bypass mutant and successful-Hide/prior-loss-cause coverage remain.

These changes preserve the requested amendment requirements; their prose is reorganized rather than copied word-for-word. **No P2 remains requiring another supervisor amendment.**

Footprint-aware scoring confirms every pinned actor:

| Actor | Approaches | Reachable candidates | Maximal profiles | Destination / cost |
|---|---:|---:|---:|---|
| 6209001 Bear | 81 | 60 | 15 | `(16,2)` / **10 ft** |
| 6209001 Eagle | 81 | 8 | 1 | `(20,4)` / **5 ft** |
| 6209001 Ghast | 81 | 81 | 21 | `(18,2)` / **5 ft** |
| 6209003 Goblin Boss | 55 | 31 | 11 | Origin `(11,2)` / **0 ft** |

The sealed 9×5 witness has **16 reachable candidates**, **three maximal profiles**, and winner `(3,2)`, costing **10 ft**, with exact path `[(2,1),(3,2)]`. Remaining budgets of **5 ft** and **0 ft** both retain origin at cost **0** and reject that destination.

The remaining verification results:

- Manifest sizes: **2, 4, 10, 10, 10, 10, 10, 2**; **55 unique paths**.
- **53/55** exist at `b94dd732`; the other two are correctly identified as the new posture test and the COHORT-supplied v2 test.
- D583: **148 baseline → 213 turn-proposal alone → 215 core → 216 final**. All **68 additions** match; **zero missing or extra**.
- Baseline generation replay: **43/43** fresh pairs equal, **43/43** tracked hashes stable, **0/43** fresh outputs equal historical fixtures, **zero** prohibited offer-module evaluations. Actual pre/post-implementation equality remains an implementation gate.
- The comparison controls distinguish weakest-first scoring from summation and footprint minimum from anchor-only scoring. Offer identity versus resolution identity and ELEVATION/D584 ownership sequencing remain correctly stated.

Verification commands included:

```bash
git branch --show-current
git rev-parse HEAD
sha256sum .tmp-plans/2026-09-18-blind-01-plan.md
wc -l .tmp-plans/2026-09-18-blind-01-plan.md
git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts
git ls-tree -r --name-only bea24cbe tests/unit/tools/d569-v6.test.ts
git ls-tree -r --name-only bea24cbe \
  tests/fixtures/arena-basis-brutal-v2 \
  tests/fixtures/arena-basis-brutal-b-v2 \
  tests/fixtures/arena-basis-brutal-2-v2
git status --porcelain=v1
```

The logged `node <<'NODE'` probes used `generateRoom`, literal approach enumeration, canonical `queries.path` without `maximumFeet`, `combatantSpaceAt`, and footprint-cell `traceTerrainLine`. Type probes ran through `node --max-old-space-size=6144` with an in-memory compiler host and writes forbidden.

Verified branch **`claude/blind-01`**, HEAD **`b94dd73221697e3d03da8991746726563777fa74`**, **460 lines**, SHA-256 **`0c0140eee4a61dfd677a817bd39ccbcc8d55f136d25b5470080562b2fa2356ef`**. Worktree remains clean. No prohibited commands, agents, model calls, or servers ran.

VERDICT: REJECT (1 P1, 0 P2)

REVIEW DONE
