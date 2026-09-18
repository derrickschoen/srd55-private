# VIS-FIELD REBASE reconciliation r3 — sol report (resumed 01a0ac51…, 477 k tokens)

Implemented the R3 visibility-delta bounds in [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts:182).

Key results:

- Production `traceCombatantLine(...).blocksSight` independently found exactly 27 blocked→clear pairs:
  - Hard 5117009: 5
  - Brutal 6203002: 10
  - Brutal 6203003: 12
- Every fixture separately asserts zero clear→blocked pairs.
- All 27 pairs are hand-listed with representative rays, affected cells/seams, and rational t-ranges.
- Comments now explicitly acknowledge interior-ray openings and the additional row-line-4/6 seams. All “only that seam” claims are gone.

Smaller-edit findings:

- Hard fixture: one blocker move fails because the independent Longbow refusal remains after fixing the Spear seam.
- Seed 6203002: one blocker removal is already the smallest nonzero edit.
- Seed 6203003: tested all seven valid one-cell Goblin relocations on the raw-tip archive. Every candidate produced 3 rows and exactly 3 refusals, so none restores the precondition. Diagnostic duration: 215.93s.

Validation:

- Four titles:

  `npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts -t "uses sim_controller and records a typed block|records typed fallbackReason for 'blocked auto-submit'|does not depend on turn-context rendering|runs a three-room three-round model-free brutal smoke"`

  Result: 1 file passed; 4 passed, 106 skipped; 161.06s.

- Whole file:

  `npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts`

  Result: 1 file passed; 110 passed; 599.54s.

- `npx tsc -p tsconfig.node.json --noEmit`: exit 0.
- `git diff --check`: exit 0.
- Added-line audit: zero lines over 120 columns.
- No assertions weakened.

The supervisor advanced HEAD to `658e2a23` during R3, committing the accepted `dm-tactical-intel` change. Therefore current `git status --short` is:

```text
 M tests/unit/tools/ai-dm-conversation.test.ts
```

The cumulative reconciliation from raw merge tip remains exactly the same two authorized files:

```text
tests/unit/tools/ai-dm-conversation.test.ts
tests/unit/vtt/dm-tactical-intel.test.ts
```

VIS-FIELD REBASE R3 DONE
diff --git a//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts b//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts
index 4c1bd94af2c428c4bdf94867747d92a52c5f6573..4f8a54029b5a331df978ec89f8352674c65cedc8
--- a//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts
+++ b//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts
@@ -2847,6 +2847,41 @@
     expect(exportSavedSession(store, sessionId)).toBe(result.journalExport);
   });
 
+  it('reports R3 one-cell shooter alternatives', { timeout: 600_000 }, async () => {
+    const candidates = [
+      { column: 9, row: 7 },
+      { column: 9, row: 8 },
+      { column: 10, row: 6 },
+      { column: 10, row: 8 },
+      { column: 11, row: 6 },
+      { column: 11, row: 7 },
+      { column: 11, row: 8 },
+    ];
+    const results = [];
+    for (const candidate of candidates) {
+      const directory = mkdtempSync(join(tmpdir(), 'dnd-r3-shooter-candidate-'));
+      const loaded = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203003.json');
+      const moved = {
+        ...loaded,
+        tokens: loaded.tokens.map((token) =>
+          token.combatantId === 'combatant:generated-6203003-monster-7'
+            ? { ...token, position: candidate }
+            : token),
+      };
+      const config = parseConversationArgs([
+        '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
+        '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'derived_v1',
+        '--dry-run',
+        ...ALL_OPTIONS_TEST_RENDERER_ARGS,
+      ]);
+      const result = await runConversation(config, {
+        roomStates: [applyRoomInitiativeProfile(moved, 'derived_v1')],
+      });
+      results.push({ candidate, rows: result.rows.length, refusals: result.rows.flatMap((row) => row.refusals) });
+    }
+    throw new Error(`R3_SHOOTER ${JSON.stringify(results)}`);
+  });
+
   it('runs a three-room three-round model-free brutal smoke with the stub adapter', { timeout: 300_000 }, async () => {
     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-3round-smoke-'));
     const config = parseConversationArgs([
diff --git a//tmp/vis-field-r3-probe.ts b//tmp/vis-field-r3-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ac01e33688fc760339aceae3c6e5005456827ad8
--- /dev/null
+++ b//tmp/vis-field-r3-probe.ts
@@ -0,0 +1,76 @@
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/encounter.ts';
+import { decodeSessionSnapshotV1 } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/arena-fixture.ts';
+import { readFileSync } from 'node:fs';
+
+type Cell = Readonly<{ column: number; row: number }>;
+
+function loadArenaFixture(path: string): EncounterState {
+  return decodeSessionSnapshotV1(JSON.parse(readFileSync(path, 'utf8')));
+}
+
+function visible(state: EncounterState, actorId: EncounterState['combatants'][number]['profile']['id'],
+  targetId: EncounterState['combatants'][number]['profile']['id']) {
+  return traceCombatantLine(state, actorId, targetId).lines.some((line) => !line.blocksSight);
+}
+
+function withHardAnchor(state: EncounterState): EncounterState {
+  return {
+    ...state,
+    tokens: state.tokens.map((token) => token.combatantId === 'combatant:generated-5117009-monster-2'
+      ? { ...token, position: { column: 13, row: 1 } }
+      : token),
+  };
+}
+
+function editHard(state: EncounterState): EncounterState {
+  return {
+    ...state,
+    blockedCells: state.blockedCells.map((cell) =>
+      cell.column === 10 && (cell.row === 1 || cell.row === 5)
+        ? { column: 9, row: cell.row }
+        : cell),
+  };
+}
+
+function removeCells(state: EncounterState, removed: readonly Cell[]): EncounterState {
+  return {
+    ...state,
+    blockedCells: state.blockedCells.filter((cell) => !removed.some((candidate) =>
+      candidate.column === cell.column && candidate.row === cell.row)),
+  };
+}
+
+function probe(name: string, before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((combatant) => combatant.profile.kind === 'monster');
+  const players = before.combatants.filter((combatant) => combatant.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const wasVisible = visible(before, monster.profile.id, player.profile.id);
+      const isVisible = visible(after, monster.profile.id, player.profile.id);
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (!wasVisible && isVisible) opened.push(pair);
+      if (wasVisible && !isVisible) closed.push(pair);
+    }
+  }
+  console.log(JSON.stringify({ name, pairCount: monsters.length * players.length, opened, closed }, null, 2));
+}
+
+async function main(): Promise<void> {
+  const hardBefore = withHardAnchor(
+    loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
+  );
+  const brutal2Before = loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203002.json');
+  const brutal3Before = loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203003.json');
+
+  probe('hard', hardBefore, editHard(hardBefore));
+  probe('brutal2', brutal2Before, removeCells(brutal2Before, [{ column: 8, row: 4 }]));
+  probe('brutal3', brutal3Before, removeCells(brutal3Before, [
+    { column: 6, row: 2 },
+    { column: 6, row: 6 },
+  ]));
+}
+
+void main();
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index b43d7ea33f5d92b1fe3b7f95b8f54039bf356f8e..a448374077d1024ec9665bea7296f5ca6234d46d
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -177,6 +177,46 @@
   };
 }
 
+type VisibilityAnchor = Readonly<{ column: number; row: number }>;
+
+function monsterPlayerVisibilityDelta(
+  before: EncounterState,
+  after: EncounterState,
+  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
+): { readonly opened: readonly string[]; readonly closed: readonly string[] } {
+  const monsters = before.combatants.filter((combatant) => combatant.profile.kind === 'monster');
+  const players = before.combatants.filter((combatant) => combatant.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const sourceAnchor = sourceAnchors.get(monster.profile.id);
+      const options = sourceAnchor === undefined ? {} : { sourceAnchor };
+      const beforeBlocked = traceCombatantLine(
+        before, monster.profile.id, player.profile.id, options,
+      ).blocksSight;
+      const afterBlocked = traceCombatantLine(
+        after, monster.profile.id, player.profile.id, options,
+      ).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+
+function pinMonsterPlayerVisibilityDelta(
+  before: EncounterState,
+  after: EncounterState,
+  expectedOpened: readonly string[],
+  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
+): void {
+  const delta = monsterPlayerVisibilityDelta(before, after, sourceAnchors);
+  expect(delta.opened).toEqual(expectedOpened);
+  expect(delta.closed).toEqual([]);
+}
+
 function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
   const seamRows = new Set([1, 5]);
   const matchingBlockers = state.blockedCells.filter((cell) =>
@@ -184,13 +224,30 @@
   if (matchingBlockers.length !== seamRows.size) {
     throw new Error('The hard exhaustion fixture no longer has both expected seam blockers.');
   }
-  return {
+  const reauthored = {
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
         ? { column: 9, row: cell.row }
         : cell),
   };
+  // Each move opens its targeted seam and every ray through the old cell interior.
+  // Representative changed rays, with t from source to target:
+  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
+  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
+  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
+  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
+  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  pinMonsterPlayerVisibilityDelta(state, reauthored, [
+    'combatant:generated-5117009-monster-1->combatant:fighter',
+    'combatant:generated-5117009-monster-2->combatant:fighter',
+    'combatant:generated-5117009-monster-2->combatant:cleric',
+    'combatant:generated-5117009-monster-5->combatant:wizard',
+    'combatant:generated-5117009-monster-6->combatant:wizard',
+  ], new Map([
+    [combatantId('combatant:generated-5117009-monster-2'), { column: 13, row: 1 }],
+  ]));
+  return reauthored;
 }
 
 function withoutFixtureBlockers(
@@ -210,6 +267,71 @@
   };
 }
 
+function reauthoredBrutal2SmokeSightlines(state: EncounterState): EncounterState {
+  const reauthored = withoutFixtureBlockers(state, [{ column: 8, row: 4 }]);
+  // Removing (8,4) opens the targeted row-line-5 seam, the adjacent row-line-4
+  // seam, and every ray through that cell interior. Representative changed rays:
+  // m1->Wizard (16,1)->(2,7): (8,4) interior, 1/2<t<4/7.
+  // m2->Cleric (16,3)->(2,5): (8,4) interior, 1/2<t<4/7.
+  // m2->Wizard (14,3)->(1,6): (8,4) interior, 5/13<t<6/13.
+  // m3->Fighter (15,6)->(1,2): (8,4) interior, 3/7<t<1/2.
+  // m3->Cleric (15,5)->(2,4): (8,4) interior, 6/13<t<7/13.
+  // m3->Wizard (15,3)->(1,6): (8,4) interior, 3/7<t<1/2.
+  // m4->Cleric (14,4)->(2,4): (8,3)/(8,4) seam, 5/12<t<1/2.
+  // m4->Wizard (14,3)->(1,6): (8,4) interior, 5/13<t<6/13.
+  // m5->Fighter (15,6)->(1,2): (8,4) interior, 3/7<t<1/2.
+  // m5->Cleric (15,5)->(2,4): (8,4) interior, 6/13<t<7/13.
+  pinMonsterPlayerVisibilityDelta(state, reauthored, [
+    'combatant:generated-6203002-monster-1->combatant:wizard',
+    'combatant:generated-6203002-monster-2->combatant:cleric',
+    'combatant:generated-6203002-monster-2->combatant:wizard',
+    'combatant:generated-6203002-monster-3->combatant:fighter',
+    'combatant:generated-6203002-monster-3->combatant:cleric',
+    'combatant:generated-6203002-monster-3->combatant:wizard',
+    'combatant:generated-6203002-monster-4->combatant:cleric',
+    'combatant:generated-6203002-monster-4->combatant:wizard',
+    'combatant:generated-6203002-monster-5->combatant:fighter',
+    'combatant:generated-6203002-monster-5->combatant:cleric',
+  ]);
+  return reauthored;
+}
+
+function reauthoredBrutal3SmokeSightlines(state: EncounterState): EncounterState {
+  const reauthored = withoutFixtureBlockers(state, [
+    { column: 6, row: 2 },
+    { column: 6, row: 6 },
+  ]);
+  // Removing one blocker opens each targeted row-line-3/7 seam and every ray
+  // through either cell interior. Representative changed rays:
+  // m1->Fighter (10,3)->(1,2): (6,2) interior, 1/3<t<4/9.
+  // m1->Cleric (10,1)->(2,4): (6,2) interior, 3/8<t<1/2.
+  // m2->Fighter (9,3)->(1,2): (6,2) interior, 1/4<t<3/8.
+  // m2->Cleric (9,1)->(3,4): (6,2) interior, 1/3<t<1/2.
+  // m2->Wizard (9,1)->(1,6): (6,2) interior, 1/4<t<3/8.
+  // m3->Fighter (10,3)->(1,2): (6,2) interior, 1/3<t<4/9.
+  // m4->Fighter (9,3)->(1,2): (6,2) interior, 1/4<t<3/8.
+  // m5->Wizard (10,6)->(1,6): (6,5)/(6,6) seam, 1/3<t<4/9.
+  // m6->Cleric (9,8)->(2,4): (6,6) interior, 2/7<t<3/7.
+  // m6->Wizard (9,7)->(1,6): (6,6) interior, 1/4<t<3/8.
+  // m7->Cleric (10,8)->(2,4): (6,6) interior, 3/8<t<1/2.
+  // m7->Wizard (10,7)->(1,6): (6,6) interior, 1/3<t<4/9.
+  pinMonsterPlayerVisibilityDelta(state, reauthored, [
+    'combatant:generated-6203003-monster-1->combatant:fighter',
+    'combatant:generated-6203003-monster-1->combatant:cleric',
+    'combatant:generated-6203003-monster-2->combatant:fighter',
+    'combatant:generated-6203003-monster-2->combatant:cleric',
+    'combatant:generated-6203003-monster-2->combatant:wizard',
+    'combatant:generated-6203003-monster-3->combatant:fighter',
+    'combatant:generated-6203003-monster-4->combatant:fighter',
+    'combatant:generated-6203003-monster-5->combatant:wizard',
+    'combatant:generated-6203003-monster-6->combatant:cleric',
+    'combatant:generated-6203003-monster-6->combatant:wizard',
+    'combatant:generated-6203003-monster-7->combatant:cleric',
+    'combatant:generated-6203003-monster-7->combatant:wizard',
+  ]);
+  return reauthored;
+}
+
 class RecordingConversationAdapter implements AgentSessionAdapter {
   readonly kind = 'codex' as const;
   readonly startInvocations: AgentInvocation[] = [];
@@ -2605,8 +2727,9 @@
   it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
     // D635's row-line-2 seam at (10,1)/(10,2) blocks monster-2's Spear after its
-    // move to (13,1); opening only that seam then exposes monster-5's Longbow at
+    // move to (13,1); changing that blocker then exposes monster-5's Longbow at
     // the independent row-line-6 seam (10,5)/(10,6), so both blockers move left.
+    // Each move also opens every ray through the old cell interior, pinned above.
     const state = reauthoredHardExhaustionSightlines(
       await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
     );
@@ -2705,8 +2828,8 @@
       ...LEGACY_BLOCK_ARGS,
     ]);
     const state = hard
-      // The typed fallback is reached only after monster-2's Spear and monster-5's
-      // Longbow clear the respective (10,1)/(10,2) and (10,5)/(10,6) seams.
+      // The typed fallback is reached after monster-2's Spear and monster-5's
+      // Longbow clear their seams; the moves also open the pinned interior rays.
       ? reauthoredHardExhaustionSightlines(
           await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
         )
@@ -2879,17 +3002,15 @@
         await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
         'derived_v1',
       ),
-      // Radiant Flame otherwise refuses in all three rounds at the new
-      // row-line-5 seam (8,4)/(8,5); removing one blocker opens only that seam.
-      applyRoomInitiativeProfile(withoutFixtureBlockers(
+      // Radiant Flame otherwise refuses in all three rounds at the row-line-5
+      // seam; removing (8,4) also opens its interior rays and row-line-4 seam.
+      applyRoomInitiativeProfile(reauthoredBrutal2SmokeSightlines(
         await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203002.json'),
-        [{ column: 8, row: 4 }],
       ), 'derived_v1'),
       // Shortbow otherwise refuses once against Wizard at (6,6)/(6,7) and twice
-      // against Fighter at (6,2)/(6,3); one blocker opens each affected seam.
-      applyRoomInitiativeProfile(withoutFixtureBlockers(
+      // against Fighter at (6,2)/(6,3); both removals also open interior rays.
+      applyRoomInitiativeProfile(reauthoredBrutal3SmokeSightlines(
         await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203003.json'),
-        [{ column: 6, row: 2 }, { column: 6, row: 6 }],
       ), 'derived_v1'),
     ] });
 
