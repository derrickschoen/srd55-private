# ELEVATION-02 plan r2 — astra HIGH review (resumed 01a0ab75…): REJECT 5 P1 + 3 P2

The plan is not yet executable without further clarification. I found **5 P1 blockers**.

The supplied SHA did **not** verify. The file changed during review; the final reviewed artifact is **1,903 lines**, SHA-256:

`ecc863dd1c439ad7e4f267a0e26cb8f84bea4324eb9c7e45ab9298ed0d88ab5e`

The findings below refer to that artifact.

1. **P1 — The traversal contract still misses its producer and actual executor.**  
   **Plan:** lines **630–640, 1151–1179**.  
   **Sources:** OFFERS `src/vtt/offers/standard-offer-generator.ts:12–22` constructs envelopes without traversal; `src/vtt/engine-round-session.ts:256–268` executes `mechanics.path` through a cell-only move command. Neither file appears in any manifest. `src/vtt/option-modeling.ts:115–126`, which defines the canonical option shape, is also unowned.

   The proposed binding participates in identity on paper, but the declared batch cannot deliver it through actual execution. A minimal in-memory declaration probe produced **56 app diagnostics across 24 paths; 207 node diagnostics across 73 paths**, including the executor’s invalid `path` command.

   **Fix:** inventory and own the complete producer→canonical option→resolution→executor→reducer chain, including affected command constructors and tests. Split into ≤10-file batches with an explicit atomic red-to-green boundary. Do not retain cell-only compatibility commands.

2. **P1 — Batch 6A cannot supply the vertical endpoints required by its distance policy.**  
   **Plan:** lines **478–507, 1063–1094**.  
   **Sources:** `src/combat/creature-space.ts:100–110,451–468` contains no height, altitude, or vertical interval; `src/combat/combat-rules.ts:77–102` constructs spaces using only size and placement. That producer is first owned by **Batch 7**, after Batch 6A requires both compilers green.

   The consumer inventory is also incomplete. The search finds **27 modules**, including unowned `src/combat/world-object-actions.ts:51` and `src/vtt/regret/legal-actions.ts:173–175`. “Every caller inventoried” does not enumerate their required endpoint migration.

   **Fix:** specify the typed distance endpoint and its state-aware construction, enumerate all callers, and assign them to a complete atomic tranche. Include bare-cell/object endpoint conventions and tests proving these consumers agree with reducer legality.

3. **P1 — The second performance instrument has no comparable base execution.**  
   **Plan:** lines **1232–1235, 1505–1525**.  
   **Sources:** D630, `decisions.md:22733–22734`; current arena configuration at `tests/unit/tools/ai-dm-arena.test.ts:1258,1448–1460`.

   The new test requires raised/flying traversal and the new binding, which the proposed base lacks. Its exact title exists in **none of the three checked trees**. It is authored in Batch 9, yet §11 requires measurement after Batch 6. Thus the stated base/candidate denominator cannot be obtained using this command as specified. `initiative.kind='standard'` also does not identify the existing configuration contract.

   **Fix:** define a shared, base-compatible completed-round harness that executes real reducers on both revisions, available before its first measurement. Keep candidate-only elevation assertions separately. Specify `per_combatant`/the applicable arena profile explicitly and preserve quiet-box A/B comparison.

4. **P1 — Q1’s recommended option can deadlock, and its implementation boundary is incomplete.**  
   **Plan:** lines **1624–1653**, versus the two-case altitude model at **261**.  
   **Sources:** SRD `11725–11727` requires the fall; `src/combat/encounter-movement-world.ts:98–118,139` excludes out-of-bounds, blocked, and occupied destinations.

   A valid flying footprint can have **zero legal uniform-support landings**. Option A blocks turn progression until the DM selects one; option B also assumes a nearest candidate exists. Neither defines the empty-set outcome. Option A additionally requires a selectable pending-state UI, but its stated ownership includes no UI implementation; renderer work is mentioned only for C.

   **Fix:** put the zero-candidate outcome and landing search/displacement limits into the owner question. After selection, explicitly own the state union, persistence/replay, selection command, and required UI. Freeze that answer before affected batches dispatch. Merely choosing A/B/C does not currently make this implementable.

5. **P1 — The revised D569 primer incorrectly depends on player disclosure policy.**  
   **Plan:** lines **680–681, 1387–1389**.  
   **Source:** `decisions.md:13394–13409`, specifically **13396**, requires the **DM board screenshot with its interpretation primer**.

   Batch 14 teaches only elevation words visible on the selected *player* board. Choosing Q3-B or Q3-C would therefore suppress guidance for facts still displayed on the DM screenshot. That changes the model’s interpretation boundary despite §7.2 promising it remains unchanged.

   **Fix:** bind D569 guidance to the DM screenshot and its visible elevation vocabulary. Apply Q3 exclusively to player projections and delivery; retain the prohibition on option-engine information.

The r1 closure audit is:

| r1 | Result and evidence |
|---|---|
| **#1** | **Closed for the four-field overlay.** Plan **809–819,1006–1024** owns all 42 diagnostic paths. Script **18–32,54–68** reproduces the counts below. Final-type compiler green remains a mandatory implementation gate, not something the `unknown` overlay proves. |
| **#2** | Gutter-intent/no-option boundary corrected at **674–685**, matching D569 **13394–13409**. New primer regression is finding 5. |
| **#3** | **Not closed:** finding 1. Identity requirements are now explicit, but execution ownership is incomplete. |
| **#4** | Formula and agreement witnesses are explicit at **478–518**; implementation closure still fails: finding 2. |
| **#5** | **Closed.** Independently recomputed **17/24**, **8/15**, and **9/20**; plan **408–409** is correct. |
| **#6** | Correctly escalated to Q1 under D636.1 **22826**; options still incomplete: finding 4. |
| **#7** | **Closed for the reported defects.** Plan **318–325,570–573** restores general-speed propagation and High Jump’s zero floor; SRD **12114–12121,11794–11804** supports them. |
| **#8** | Real reducer execution is now required, but the A/B instrument remains unverifiable: finding 3. |
| **#9** | **Closed on regeneration language.** Plan **1455–1465,1478** requires independent expectations and negative controls. `rg 'regenerat'` returned no matches. Digest-ledger clarification remains below. |
| **#10** | **Closed at specification level.** Plan **419–456** distinguishes cell/creature targets, binds endpoint-aware cache keys, and names one VIS evaluator/import-boundary test. This addresses VIS’s existing cell-only range input at `visibility-field.ts:135–143`. |
| **#11** | **Closed.** Plan **263–267,298–308** separates authored half-foot values from computed fractions; existing authored constructor is `elevation.ts:60–67`. |
| **#12** | Q2 correctly exposes the missing product decision, per D636.1 **22826**; current `WaterRegion` at `elevation.ts:40–43` contains no depth fact. Owner selection remains required. |
| **#13** | Q3 now explicitly separates player choices from DM semantic delivery, **1686–1720**, as required by D636.1 **22826**. Finding 5 concerns the separate DM primer. |
| **#14** | **Closed.** Plan **93–109** identifies `9a3235da` and distinguishes its snapshot normalization from geometry. Confirmed against branch refs and D635.4 **22831–22832**. |

Verification commands included:

```sh
sha256sum .tmp-plans/2026-09-16-elevation-02-plan.md
wc -l .tmp-plans/2026-09-16-elevation-02-plan.md
git rev-parse HEAD claude/vis-field claude/p-offer-help
git status --short

node .tmp/elevation-r2-overlay.mjs . tsconfig.app.json
node .tmp/elevation-r2-overlay.mjs . tsconfig.node.json
node .tmp/elevation-r2-overlay.mjs .tmp/r2-overlay-vis-5492f782 tsconfig.app.json
node .tmp/elevation-r2-overlay.mjs .tmp/r2-overlay-vis-5492f782 tsconfig.node.json
node .tmp/elevation-r2-overlay.mjs .tmp/r2-overlay-offers-1cacd8f0 tsconfig.app.json
node .tmp/elevation-r2-overlay.mjs .tmp/r2-overlay-offers-1cacd8f0 tsconfig.node.json

rg -n 'minimumSpaceDistance|minimumSpaceLine|minimumSpaceDistanceToCells' src/combat src/vtt | cut -d: -f1 | sort -u
rg -n 'regenerat' .tmp-plans/2026-09-16-elevation-02-plan.md
```

| Overlay | App diagnostics / paths | Node diagnostics / paths |
|---|---:|---:|
| Main `4a99570d` | 47 / 19 | 79 / 41 |
| VIS `5492f782` | 47 / 19 | 80 / 42 |
| OFFERS `1cacd8f0` | 47 / 19 | 79 / 41 |
| VIS with current `9a3235da` snapshot source overlaid | — | 80 / 42 |

The manifest audit found **21 executable batches, 146 unique paths, maximum 10 files per batch**. All **42 overlay paths are assigned; zero fall outside B1–5C**. Unowned app paths after B1/B2/B3/B4/B5 are **17/13/7/1/0**. Current-VIS node paths after B5/5A/5B/5C are **22/12/2/0**. These support the stated intermediate statuses for this overlay.

Nonblocking **P2 corrections**:

- Plan **1876** says overlay runs exit nonzero; the script **54–68** only prints diagnostics. All successful overlay invocations exited **0**. Correct the claim or set an explicit diagnostic exit status.
- Plan **646** says B10 instead of B7A; **517–518** uses B8 mutant names instead of B6A.
- Plan **1474** forbids proposal-digest changes while **633–635,1181–1183** requires traversal to change resolution identity. Split environment-digest invariance from demonstrated mechanics-identity changes.

No files were edited; Git status remained clean. No Vitest pass or performance result is claimed.

REJECT PLAN — Findings: P1 traversal execution closure; P1 distance endpoint/consumer closure; P1 incomparable performance baseline; P1 incomplete forced-landing outcomes/ownership; P1 D569 DM-primer coupling to player disclosure. P2 corrections listed above.

REVIEW DONE