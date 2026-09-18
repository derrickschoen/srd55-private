# VIS-FIELD B5 r2 — sol BLOCKED (resumed 01a0ac19…): overlay finds six outside-manifest test consumers of the field

The boundary overlay found six outside-manifest test files that will fail when B2 removes runtime/setup fog. Per the binding stop rule, I made no further edits or gate runs.

Overlay results after explicitly preserving `ProjectedCanonicalEncounterState.foggedCells` as a derived projection output:

- `tsconfig.app.json`: 10 diagnostics, all B2-owned.
- `tsconfig.node.json`: 23 diagnostics.
- Expected B2 paths:
  - `src/combat/encounter.ts`: 5
  - `src/combat/visibility.ts`: 1
  - `src/vtt/intel/actor-knowledge.ts`: 2
  - `src/vtt/semantic-board-payload.ts`: 2
  - `tests/unit/vtt/actor-knowledge.test.ts`: 3
- No uniquely B6-owned diagnostic appeared.

Outside B2/B6 manifests:

- `tests/unit/bridge/decision-program.test.ts:58`
  - Supplies `foggedCells` to `createEncounter`.
- `tests/unit/combat/visibility.test.ts:38,349,355,485`
  - Three setup literals and one direct `EncounterState` mutation retain authored fog.
- `tests/unit/tools/ai-dm-screenshot-probe.test.ts:135`
  - `everyClassState()` still supplies authored fog. Round 2 authorized only the named title’s comment/literal.
- `tests/unit/vtt/engine-state-capsule.test.ts:137,364`
  - Constructs `DmView` with raw `EncounterState`; it lacks the retained derived projection field after runtime-field deletion.
- `tests/unit/vtt/turn-exhaustion-coordinator.test.ts:71`
  - Same raw-state-as-`DmView` construction.
- `tests/unit/vtt/vane-warren.test.ts:575`
  - Reads `loaded.encounter.foggedCells` directly.

Completed evidence:

- Fact-class hand oracle agrees with `['2,0', '3,1']`.
- Round-2 fact-class run: `1 passed | 25 skipped`.
- `EXPERIMENT_REINTRODUCES_AUTHORED_FOG`:
  - Base/restored: `db4d17ab…397af`
  - Mutant: `bd2a8d97…f49fd`
  - Failed `expect(reconstruction).not.toContain('foggedCells')`
  - Restored baseline: `1 passed | 52 skipped`
- `BLIND_CHECK_READS_STATE_FOG`:
  - Base/restored: `3aa92604…c4b92`
  - Mutant: `d070e2de…7beb3`
  - Failed expected `dm.fogMarks === board.foggedCells.length`
  - Restored baseline: `1 passed | 16 skipped`
- `git diff --check`: exit 0.
- Status contains exactly the eight currently authorized files.
- Diff: 63 insertions, 24 deletions.
- Plan SHA unchanged: `6e8b3237…8fd2f`
- Package-lock SHA unchanged: `26711444…48e67`

TSC, semantic deferred-red classification, retained suites, and after-timing were not run after the required boundary stop.

BLOCKED: B2 field deletion requires manifest decisions for six outside-manifest test files listed above.
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index 6a38edd06d1afec5829513ac5b8f60c80a92d5fe..391e1ee67b0183f717c8fa835c968a09015e9f48
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -246,7 +246,13 @@
     ).toBe(sheet.combatants.length);
     expect(cells(sheet.difficultTerrainCells)).toEqual(['0,1']);
     expect(cells(sheet.obscuredCells)).toEqual(['3,1']);
-    expect(cells(sheet.foggedCells)).toEqual(['4,3']);
+    // The only eligible DM-party observer is the living, conscious, placed hero at (1,1);
+    // the foe is a dying monster. The hero has normal sight only: every corner ray arriving
+    // at dark target (2,0) fails on its endpoint light, and every ray arriving at (3,1) fails
+    // on the target's heavy smoke. The old authored-fog cell (4,3) is seen along the clear
+    // bottom-left-to-top-left corner ray (1,2)->(4,3), through open cells (2,2) and (3,2).
+    // That ray avoids smoke (3,1), closed door (5,2), and blocked cell (5,3).
+    expect(cells(sheet.foggedCells)).toEqual(['2,0', '3,1']);
     expect(cells(sheet.blockedCells)).toEqual(['5,3']);
     expect(sheet.lightCells).toHaveLength(24);
     expect(sheet.lightCells.filter((entry) => entry.light === 'dim')).toEqual([
diff --git a/tools/ai-dm-blind-board-snapshot-check.ts b/tools/ai-dm-blind-board-snapshot-check.ts
index 47aa28578b207d0f95689ab1dcd85b99652b59cb..99893d35cee0e153d337d113a2972d8ebae0563f
--- a/tools/ai-dm-blind-board-snapshot-check.ts
+++ b/tools/ai-dm-blind-board-snapshot-check.ts
@@ -110,7 +110,7 @@
     ),
     'DM image light cells differ from state.',
   );
-  requireCondition(dm.fogMarks === board.foggedCells.length, 'DM image fog differs from projection.');
+  requireCondition(dm.fogMarks === state.foggedCells.length, 'DM image fog differs from projection.');
   requireCondition(dm.objects >= state.worldObjects.length, 'DM image omitted world-object footprints.');
   requireCondition(dm.doors === state.worldObjects.filter((object) => object.kind === 'door').length,
     'DM image doors differ from state.');
diff --git a/tools/vtt-experiment.ts b/tools/vtt-experiment.ts
index 1a6df11f3d7edb66c11fef3d749da34430154cc8..42f596d3917332027c48231becde317c60587181
--- a/tools/vtt-experiment.ts
+++ b/tools/vtt-experiment.ts
@@ -1336,6 +1336,7 @@
     config: { initiativeMode: 'shared_enemy' },
     bounds: source.bounds,
     blockedCells: source.blockedCells,
+    foggedCells: source.foggedCells,
     dmNotes: source.dmNotes,
     combatants: selected.map((subject) => subject.profile),
     tokens: source.tokens.filter((token) => ids.has(token.combatantId)),
