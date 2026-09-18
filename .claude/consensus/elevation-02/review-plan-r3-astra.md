# ELEVATION-02 plan r3 (FINAL) — astra HIGH review (resumed 01a0ab75…): REJECT 2 P1 (manifest closure)

**Two P1 blockers remain.** The artifact verified exactly: **2,373 lines**, SHA-256 `7c2cc7ceae14284a0185d0b887ccedd2fbbba9a2fb3baf75d8477a8e2852cb14`.

1. **P1 — The traversal union is 90 paths, and one OFFERS test remains unowned.**  
   **Plan:** **1330–1335, 1473–1477, 2346–2358** claim complete ownership and a green B7A9 boundary.  
   **Source:** `claude/p-offer-help:tests/unit/vtt/offer-environment-board-sequence.test.ts:33` reads `resolution.mechanics.path`, which the proposed declaration removes.

   Reproduction gives **89 paths on main/VIS and 89 on OFFERS, but different sets**:
   - Main/VIS alone: `adjustment-exhaustion-coordinator.test.ts`.
   - OFFERS alone: `offer-environment-board-sequence.test.ts`.
   - Combined: **90 paths; 89 assigned; 1 outside**.

   Consequently, OFFERS still has **one unowned node diagnostic path after B7A9**. The producer, canonical option, and executor omissions from r2 are fixed, but the final compile boundary is not.

   **Fix:** add `tests/unit/vtt/offer-environment-board-sequence.test.ts` to B7A9—currently four files—and migrate its movement assertion to the typed binding while retaining its environment-digest controls. Correct the union and closing-audit counts.

2. **P1 — The distance cutover omits three existing test consumers.**  
   **Plan:** **1180–1187, 1201–1202, 1230–1264** removes raw-space signatures and requires B6A3 compiler green.  
   **Sources:**
   - `tests/unit/combat/creature-space.test.ts:182–215`;
   - `tests/unit/vtt/footprint-increment-four.test.ts:390` (**392 on OFFERS**);
   - `tests/unit/vtt/challenge-room-fixtures.test.ts:294` (**308 on OFFERS**).

   All three pass raw `CreatureSpace` arguments. None belongs to B6A0–B6A3; the challenge fixture is owned only later, in B7A4. The other two are absent from the entire manifest.

   A read-only declaration probe requiring the proposed endpoint facts produced **8 TS2345 test diagnostics across these 3 files**—**110 diagnostics overall** before production migration. Thus “27/27 production modules assigned” does not establish compiler closure.

   **Fix:** assign these tests inside the atomic distance tranche, splitting batches to preserve the ten-file limit. Construct explicit endpoints and retain the independent flat-distance, row-order, SVG-coordinate, and empty-target assertions. Recompute the full source-and-test diagnostic union.

The remaining r2 dispositions check out:

| r2 finding | Closure evidence |
|---|---|
| **#1 Traversal chain** | Plan **719–744,1340–1358** now owns `standard-offer-generator.ts`, `option-modeling.ts`, and `engine-round-session.ts`. OFFERS source **12–22**, **115–126**, and **256–268**, respectively, confirms these are the required sites. Plan **1323–1336** explicitly removes cell-only commands and parallel mechanics fields. **Manifest closure still fails as finding 1.** |
| **#2 Distance endpoints** | Plan **534–552,1191–1202** introduces endpoints and their state-aware producers together in B6A0, before consumer migration. This addresses `creature-space.ts:100–110` and `combat-rules.ts:77–102`. Creature, hypothetical Medium cell, closed object, and open-object conventions are specified. Agreement tests appear at **590–602,1243–1255**. **Test closure still fails as finding 2.** |
| **#3 D630 harness** | **Closed at specification/source level.** Plan **1844–1878** uses the existing test at main-worktree `ai-dm-arena.test.ts:1709–1755`, OFFERS **1780–1826**. It selects `per_combatant`, `initiative_segments_v1`, and `derived_v1`. Execution reaches `tools/ai-dm-conversation.ts:6518–6578` and real reducer transactions at `engine-round-session.ts:554–566,612`. Candidate-only elevation assertions are separate. Runtime attempt failed during collection; details below. |
| **#4 Q1** | **Closed as an owner question, not an authorized behavior.** Plan **1977–2000** specifies bounded searches and empty-set outcomes for both options; **2002–2027** owns state, commands, persistence/replay/capsule, projection, controls, and tests, with explicit dispatch prerequisites. SRD **11723–11733** supplies the fall trigger; the proposed landing policies are correctly left to the owner. |
| **#5 D569 primer** | **Closed.** Plan **782–793,1718–1727,1817** binds guidance to DM screenshot vocabulary independently of Q3, matching `decisions.md:13394–13409`, particularly **13396**. Gutter destinations remain permitted; option-engine information remains excluded. |
| **P2 overlay exit status** | **Closed.** Plan **2304–2307,2348–2351** correctly distinguishes diagnostic inventory from process exit and real compiler gates; script **87–94** prints diagnostics without setting a failure status. |
| **P2 batch names** | **Closed.** Distance names are B6A at **1251–1264**; traversal ownership is B7A at **1493–1509**. |
| **P2 digest wording** | **Closed.** Plan **1811–1812** separates invariant environment digests from intentionally changed option/mechanics/resolution identities. |

My verification results:

| Traversal overlay | App diagnostics / paths | Node diagnostics / paths |
|---|---:|---:|
| Main `4a99570d` | **85 / 30** | **260 / 89** |
| VIS `9a3235da` | **85 / 30** | **260 / 89** |
| OFFERS `1cacd8f0` | **85 / 30** | **257 / 89** |

The independently parsed manifests contain **33 batches, 217 unique allowed paths, maximum 10 files, zero over-limit batches**. All **27 inventoried production distance modules** are assigned. No additional mistaken existing-file path was found; absent paths are planned additions or VIS inputs.

Traversal boundary ownership matches the stated app progression: **24,14,6,6,6,6,6,6,0,0** remaining app paths after B7A0 through B7A9. Node ownership ends **14→4→0** on VIS but **15→5→1** on OFFERS after B7A7→B7A8→B7A9.

Commands included:

```sh
sha256sum .tmp-plans/2026-09-16-elevation-02-plan.md
wc -l .tmp-plans/2026-09-16-elevation-02-plan.md

node .tmp/elevation-r3-traversal-overlay.mjs . tsconfig.app.json
node .tmp/elevation-r3-traversal-overlay.mjs . tsconfig.node.json
node .tmp/elevation-r3-traversal-overlay.mjs .tmp/r2-overlay-offers-1cacd8f0 tsconfig.app.json
node .tmp/elevation-r3-traversal-overlay.mjs .tmp/r2-overlay-offers-1cacd8f0 tsconfig.node.json

rg -n 'minimumSpaceDistance|minimumSpaceLine' tests
npx tsc -p tsconfig.app.json --noEmit --pretty false
npx tsc -p tsconfig.node.json --noEmit --pretty false
git status --short
```

For VIS, I ran the same overlay for both configurations against `.tmp/r2-overlay-vis-5492f782`, replacing `scene-snapshot.test.ts` **in memory** with:

```sh
git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static show claude/vis-field:tests/unit/vtt/scene-snapshot.test.ts
```

Branch-source comparison checked **98 files per branch**: OFFERS **98 identical**; VIS **97 identical**, with that snapshot file the sole difference. Untouched-tree TSCs both exited **0 with zero diagnostics**.

The exact arena attempt was:

```sh
/usr/bin/time -f 'WALL_SECONDS=%e EXIT=%x' npx vitest run --configLoader runner --maxWorkers=1 --fileParallelism=false tests/unit/tools/ai-dm-arena.test.ts -t 'reloads the fixture and full context for each of three SIMULATED reps'
```

Result: **exit 1; zero tests collected; Vitest 1.52 s; wall 1.96 s**, failing on `ENOENT` while creating `/tmp/…/ssr`. This is not a test pass or performance measurement.

The unchanged arithmetic witnesses independently recomputed to **17/24**, **8/15**, and **9/20**. The final hash remained unchanged and Git status remained clean.

A lane **cannot execute B0→B5C from this text alone**: B1 explicitly waits for Q1 at **2002–2003**; Q2 affects B1’s model, and Q3 affects B4’s projection assertions. B0 is independently specified, subject to the landed-base prerequisite. Owner recommendations are not owner answers.

REJECT PLAN — Findings: P1 unowned OFFERS traversal test invalidates B7A9 green; P1 three unowned distance tests invalidate B6A3 green.

REVIEW DONE