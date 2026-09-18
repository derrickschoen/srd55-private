# VIS-FIELD B5 — sol report (r3, resumed 01a0ac19…, 331 k tokens)

Batch 5 is complete. All authorized implementation and cleanup work is done; only the two expected B6 semantic reds remain.

### Boundary overlay

The in-memory TypeScript overlay removed `foggedCells` from `EncounterState` and `EncounterSetup` while retaining it as a derived projection output.

Remaining diagnostics:

| Path | Diagnostics | Owner |
|---|---:|---|
| `src/combat/encounter.ts:1315,1395,1395,2271,2271` | 5 | B2 |
| `src/combat/visibility.ts:45` | 1 | B2 |
| `src/vtt/intel/actor-knowledge.ts:263,263` | 2 | B2 |
| `src/vtt/semantic-board-payload.ts:358,358` | 2 | B2 state-source cleanup |
| `tests/unit/vtt/actor-knowledge.test.ts:17,205,209` | 3 | B2 |

Results:

```text
tsconfig.app.json: 10 diagnostics
tsconfig.node.json: 13 diagnostics
outside B2/B6: 0
```

### Compilation

```text
npx tsc -p tsconfig.app.json --noEmit   # exit 0
npx tsc -p tsconfig.node.json --noEmit  # exit 0
```

### Tests

The explicit 22-file green run passed `381/381`:

| File | Tests |
|---|---:|
| decision-program | 16 |
| creature-cover | 5 |
| terrain | 13 |
| visibility-field | 37 |
| visibility | 22 |
| accessible-board | 6 |
| actor-knowledge | 8 |
| blind-context-source-binding | 5 |
| challenge-room-fixtures | 17 |
| detection-reactions | 17 |
| encounter-projections | 11 |
| engine-state-capsule | 11 |
| experiment-orchestrator | 53 |
| generated-encounter-fixtures | 21 |
| handoff-examples | 6 |
| mutation-ledger | 60 |
| regret | 6 |
| scene-snapshot | 8 |
| senses | 10 |
| turn-exhaustion-coordinator | 14 |
| two-room-fixture | 4 |
| vane-warren | 31 |

Final fact-class run:

```text
1 passed | 25 skipped
```

The hand oracle is `[(2,0),(3,1)]`: the hero at `(1,1)` is the sole eligible observer; `(2,0)` is ordinary darkness, `(3,1)` is heavy smoke, and old authored cell `(4,3)` is visible along `(1,2)→(4,3)` through `(2,2),(3,2)`.

### Deferred semantic reds

`semantic-board-payload.test.ts`: `6 passed | 2 failed`.

Both remain B6-owned; B5 turns neither green:

- `keeps the engine-safe semantic source equal to the canonical DM board projection`
- `M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION exhaustively partitions cells and matches effective walls`

The engine-safe semantic source still reads legacy state fog while the canonical board derives fog, and B6 owns the semantic source plus its literal partition assertions.

### Mutants

| Mutant | Baseline/restored SHA | Mutant SHA | Exact failure | Restored |
|---|---|---|---|---|
| `EXPERIMENT_REINTRODUCES_AUTHORED_FOG` | `db4d17ab07b33249390f42d91786e82ab042fa1c8b05236530eef6efda2397af` | `bd2a8d97995a74b884f5861bac6099393c5a3fb3d5682da13015f63eb5af49fd` | `expected reconstruction not to contain 'foggedCells'` | `1 passed / 52 skipped` |
| `BLIND_CHECK_READS_STATE_FOG` | `3aa926045a5ba214dcaa7b66f731cd21da6573db23d1335722945d40c49c4b92` | `d070e2debd80d64c26d01e1b8dea36e84c14246bd07913dcec592e03a367beb3` | expected `dm.fogMarks === board.foggedCells.length` | `1 passed / 16 skipped` |

Both were restored with `cp` and reproduced their original SHA.

### Performance

Exact command:

```text
npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts
```

```text
Before: 38.07 wall seconds
After:  38.30 wall seconds
Change: +0.23 seconds / +0.6%
Tests:  36/36
Ceiling: 42 seconds
```

B5 changes no visibility-engine cost path.

### Repository checks

```text
git diff --check                                      # exit 0
added lines over 120 columns                         # 0
git status --short --untracked-files=all             # 13 unique authorized paths
diff                                                  # 86 insertions, 41 deletions
```

The ruled “14-file” manifest contains 13 unique paths because `tests/unit/tools/ai-dm-screenshot-probe.test.ts` appears in both amendments.

Hashes:

```text
6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f  .tmp-plans/2026-09-15-visibility-field-plan.md
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
```

VIS-FIELD B5 DONE
diff --git a/tests/unit/bridge/decision-program.test.ts b/tests/unit/bridge/decision-program.test.ts
index 59d7f98e7ebbf0b0972c3e4b57b623207d1b6544..ff4be3b44ba21af734687221ca305c3901a2058a
--- a/tests/unit/bridge/decision-program.test.ts
+++ b/tests/unit/bridge/decision-program.test.ts
@@ -55,7 +55,6 @@
       placedToken(playerA, 3),
       placedToken(playerB, 7),
     ],
-    foggedCells: [{ column: 1, row: 0 }],
     dmNotes: ['hidden bridge tactic sentinel'],
   });
   const state: EncounterState = {
diff --git a/tests/unit/combat/visibility.test.ts b/tests/unit/combat/visibility.test.ts
index 29fac5231ff9818fd4b51cb317bd46bea20e2c69..86248b15c278fab5b5cacba28901a51a81f7f9ea
--- a/tests/unit/combat/visibility.test.ts
+++ b/tests/unit/combat/visibility.test.ts
@@ -35,7 +35,6 @@
     hideDeathSaveRolls: true,
     bounds: { columns: 5, rows: 2 },
     blockedCells: [{ column: 4, row: 0 }],
-    foggedCells: [{ column: 3, row: 0 }, { column: 4, row: 0 }],
     dmNotes: ['The east square contains a hidden mechanism.'],
     combatants: [pc, monster],
     tokens: [placedToken(pc, 0), placedToken(monster, 3)],
@@ -346,22 +345,29 @@
     const observer = playerProfile('authored-fog-observer');
     const clear = createEncounter({
       bounds: { columns: 2, rows: 1 },
-      foggedCells: [],
       combatants: [observer],
       tokens: [placedToken(observer, 0)],
     });
-    const authored: EncounterState = {
-      ...clear,
-      foggedCells: [{ column: 1, row: 0 }],
-    };
+    const dark = createEncounter({
+      bounds: { columns: 2, rows: 1 },
+      combatants: [observer],
+      tokens: [placedToken(observer, 0)],
+      environment: {
+        lightRegions: [{ id: 'derived-fog-darkness', cells: [{ column: 1, row: 0 }], level: 'darkness' }],
+        difficultTerrainRegions: [],
+        movementRegions: [],
+        obscurementRegions: [],
+        narrowOpeningRegions: [],
+      },
+    });
 
-    // Hand field: normal sight sees both bright cells, regardless of either authored legacy list.
+    // Hand field: normal sight sees both bright cells, but not ordinary-darkness target (1,0).
     expect(cellKeys(projectDmView(clear).state.foggedCells)).toEqual([]);
-    expect(cellKeys(projectDmView(authored).state.foggedCells)).toEqual([]);
-    expect(cellKeys(projectPlayerView(authored, {
+    expect(cellKeys(projectDmView(dark).state.foggedCells)).toEqual(['1,0']);
+    expect(cellKeys(projectPlayerView(dark, {
       seatId: 'seat:authored-fog',
       combatantId: observer.id,
-    }).concealedCells)).toEqual([]);
+    }).concealedCells)).toEqual(['1,0']);
   });
 
   it('DM_BOARD_FOG_EQUALS_DM_VIEW_FOG', () => {
@@ -482,7 +488,6 @@
     const target = { ...baseTarget, rules: { ...baseTarget.rules, sizeCategory: 'Large' as const } };
     const created = createEncounter({
       bounds: { columns: 6, rows: 4 },
-      foggedCells: [{ column: 3, row: 1 }, { column: 2, row: 2 }, { column: 3, row: 2 }],
       combatants: [viewer, target],
       tokens: [placedToken(viewer, 0, 0), placedToken(target, 2, 1)],
     });
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index 391e1ee67b0183f717c8fa835c968a09015e9f48..7eb971aacb3ad8149d04fc87496c84260d918856
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -132,7 +132,6 @@
     combatants: [hero, foe],
     tokens: [placedToken(hero, 1, 1), placedToken(foe, 2, 2)],
     blockedCells: [{ column: 5, row: 3 }],
-    foggedCells: [{ column: 4, row: 3 }],
     worldObjects: [
       object('open-door', 'Open Oak Door', 'door', 0, 2, false),
       object('closed-door', 'Closed Iron Door', 'door', 5, 2, true),
diff --git a/tests/unit/vtt/engine-state-capsule.test.ts b/tests/unit/vtt/engine-state-capsule.test.ts
index 9abf2424e93727a9319abbf14a8b799eee0ae386..00499fc20a419b071efa8053b51f5057ca9f725a
--- a/tests/unit/vtt/engine-state-capsule.test.ts
+++ b/tests/unit/vtt/engine-state-capsule.test.ts
@@ -3,6 +3,7 @@
 import { fileURLToPath } from 'node:url';
 import ts from 'typescript';
 import { describe, expect, it } from 'vitest';
+import { projectDmView } from '../../../src/combat/visibility';
 import { combatantId, encounterBranchId, encounterSessionId } from '../../../src/combat/values';
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import { sha256 } from '../../../src/crypto/sha256';
@@ -134,7 +135,7 @@
   const target = state.combatants.find((candidate) => candidate.profile.kind === 'player_character');
   if (actor === undefined || target === undefined) throw new Error('Capsule fixture actors are absent.');
   const board = projectDmBoard({
-    view: { audience: 'dm', state },
+    view: projectDmView(state),
     coordinator: {
       requestSequence: 0,
       pendingRequest: null,
@@ -361,7 +362,7 @@
       }],
     };
     const pendingBoard = projectDmBoard({
-      view: { audience: 'dm', state: pendingState },
+      view: projectDmView(pendingState),
       coordinator: {
         requestSequence: 0,
         pendingRequest: null,
diff --git a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
index 808cd9147e4e76916c953bcf63347743a5a93584..3667c22607184722cd326aace1e3b5f86210213a
--- a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+++ b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
@@ -1,6 +1,7 @@
 import { describe, expect, it } from 'vitest';
 import { createEncounter } from '../../../src/combat/encounter';
 import { mulberry32 } from '../../../src/combat/random';
+import { projectDmView } from '../../../src/combat/visibility';
 import { sha256 } from '../../../src/crypto/sha256';
 import {
   agentSessionId,
@@ -68,7 +69,7 @@
     adapterVersion: 4,
   });
   const projection = projectDmBoard({
-    view: { audience: 'dm', state },
+    view: projectDmView(state),
     coordinator: INITIAL_COORDINATOR_STATE,
     controllers: [],
     history: journal.history(),
diff --git a/tests/unit/vtt/vane-warren.test.ts b/tests/unit/vtt/vane-warren.test.ts
index 9b0b30151e95d0e99a60236fad28425e20468e6d..2681d8e5f4a3bf00feba2fe9d7240fa740cd15b8
--- a/tests/unit/vtt/vane-warren.test.ts
+++ b/tests/unit/vtt/vane-warren.test.ts
@@ -572,7 +572,8 @@
       const loaded = fight(manifest.id);
       expect(loaded.encounter.combatants).toHaveLength(5 + manifest.standing.length);
       expect(loaded.encounter.tokens).toHaveLength(loaded.encounter.combatants.length);
-      expect(loaded.encounter.foggedCells).toEqual([]);
+      // Same hand oracle as VANE_DERIVED_FOG_HAND_ORACLE: five PCs see all 140 cells.
+      expect(projectDmView(loaded.encounter).state.foggedCells).toEqual([]);
       expect(loaded.encounter.environment.lightRegions.length).toBeGreaterThan(0);
       expect(loaded.encounter.environment.obscurementRegions.length).toBeGreaterThan(0);
       expect(loaded.encounter.environment.difficultTerrainRegions.length).toBeGreaterThan(0);
