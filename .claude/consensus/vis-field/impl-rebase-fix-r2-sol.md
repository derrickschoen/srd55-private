# VIS-FIELD REBASE reconciliation r2 — sol report (resumed 01a0ac51…, 354 k tokens)

Implemented the Round 2 reconciliation without changing engine behavior or weakening assertions.

Mechanism evidence from raw merge tip `1d58ef72`:

- Typed unresolved-frontier test:
  - Monster 1 correctly produced the unresolved-frontier typed block and Dodge.
  - Monster 2’s `Spear -> fighter`, after moving to `(13,1)`, was refused because D635 closed the row-line-2 seam between `(10,1)/(10,2)`.
  - Opening only that seam exposed Monster 5’s independent `Longbow -> wizard` refusal at the row-line-6 seam `(10,5)/(10,6)`.
  - Moving exactly `(10,1)->(9,1)` and `(10,5)->(9,5)` restored the intended authorized row.

- `blocked auto-submit` fallback test:
  - The same two execution refusals aborted the transaction before `fallbackReason` could become `auto_submit_blocked`, leaving it `null`.
  - The same two minimal blocker moves restored the typed fallback.
  - Both hard tests then passed: 2 passed, 108 skipped.

- Three-room smoke:
  - The raw fixture already produced all 9 rows; no death or early ending reduced the row count.
  - Its failure was exactly six total-cover refusals:
    - Seed 6203002: Radiant Flame against Wizard failed in all 3 rounds at `(8,4)/(8,5)`.
    - Seed 6203003: Shortbow failed once against Wizard at `(6,6)/(6,7)`.
    - Seed 6203003: Shortbow failed twice against Fighter at `(6,2)/(6,3)`.
  - Removed only `(8,4)`, `(6,6)`, and `(6,2)`, one blocker per affected seam.
  - No HP or temporary-HP changes remain.
  - Minimal smoke experiment: 1 passed, 109 skipped; 131.36s.

Also corrected the geometry comment to identify the real Fighter and Cleric seams and explain that Wizard’s `(18,5)->(2,7)` ray crosses the authored row-6 gap.

Validation:

- Raw four-title command: 4 failed, 106 skipped; 132.11s.
- Final four-title command:

  `npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts -t "uses sim_controller and records a typed block|records typed fallbackReason for 'blocked auto-submit'|does not depend on turn-context rendering|runs a three-room three-round model-free brutal smoke"`

  Result: 1 file passed; 4 passed, 106 skipped; 160.44s.

- Whole file:

  `npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts`

  Result: 1 file passed; 110 passed; 599.62s.

- `npx tsc -p tsconfig.node.json --noEmit`: exit 0.
- `git diff --check`: exit 0.
- Added-line audit: zero added lines over 120 columns.
- `git status --short`:

  ```text
   M tests/unit/tools/ai-dm-conversation.test.ts
   M tests/unit/vtt/dm-tactical-intel.test.ts
  ```

The first file was justified by the four raw red tests; the second remains justified by the original TS2345 missing `offerEnvironment` diagnostic.

VIS-FIELD REBASE R2 DONE
diff --git a//tmp/vis-field-r2-raw.hQ8Scp/src/combat/encounter.ts b//tmp/vis-field-r2-raw.hQ8Scp/src/combat/encounter.ts
index b3a9b43ea4d16b3ed01a3d63b319c0131ba5fd27..395c483db07add20a7b43b1d62078ed5b1d2e065
--- a//tmp/vis-field-r2-raw.hQ8Scp/src/combat/encounter.ts
+++ b//tmp/vis-field-r2-raw.hQ8Scp/src/combat/encounter.ts
@@ -7289,6 +7289,13 @@
     opportunityTrigger === null &&
     (attackLine.blocksSight || attackLine.tier === 'total')
   ) {
+    console.error('R2_ATTACK_LINE', JSON.stringify({
+      actor: command.actor,
+      target: command.target,
+      actorToken: context.state.tokens.find((token) => token.combatantId === command.actor),
+      targetToken: context.state.tokens.find((token) => token.combatantId === command.target),
+      attackLine,
+    }));
     throw new EncounterRuleError('validation', 'The target has Total Cover or is outside line of sight.');
   }
   breakCalmIndifferenceOnHostileAct(context, command.actor, command.target);
diff --git a//tmp/vis-field-r2-raw.hQ8Scp/src/vtt/engine-round-session.ts b//tmp/vis-field-r2-raw.hQ8Scp/src/vtt/engine-round-session.ts
index 7524c21b81f9f38b7695e392ad65ed9c0ab62353..b1cdbc89f067634ea4aa0571a1dc83607cfa2b5e
--- a//tmp/vis-field-r2-raw.hQ8Scp/src/vtt/engine-round-session.ts
+++ b//tmp/vis-field-r2-raw.hQ8Scp/src/vtt/engine-round-session.ts
@@ -564,6 +564,13 @@
       for (const entry of entries) {
         state = advanceToActor(state, entry.proposal.actorId, reduce);
         const primary = resolveEngineActorOption(state, entry.primaryOption, this.offerEnvironment);
+        console.error('R2_ENTRY', JSON.stringify({
+          actorId: entry.proposal.actorId,
+          label: entry.primaryOption.label,
+          primaryValid: primary.valid,
+          primaryCode: primary.valid ? null : primary.code,
+          mechanics: primary.valid ? primary.mechanics : null,
+        }));
         const fallback = primary.valid || entry.fallbackOption === null
           ? null
           : resolveEngineActorOption(state, entry.fallbackOption, this.offerEnvironment);
diff --git a//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts b//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts
index 28af38ca6674b654aa08032d258df9b1970a1438..4c1bd94af2c428c4bdf94867747d92a52c5f6573
--- a//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts
+++ b//tmp/vis-field-r2-raw.hQ8Scp/tests/unit/tools/ai-dm-conversation.test.ts
@@ -45,7 +45,7 @@
 import { armorClass, combatantId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
 import type { EncounterCommand } from '../../../src/combat/events';
 import { mulberry32 } from '../../../src/combat/random';
-import { generateRoom } from '../../../src/vtt/room-generator';
+import { applyRoomInitiativeProfile, generateRoom } from '../../../src/vtt/room-generator';
 import {
   availableEngineActorOptions,
   createPureTurnProposalResolver,
@@ -177,6 +177,17 @@
   };
 }
 
+function withoutBlockedCells(
+  state: EncounterState,
+  cells: readonly { readonly column: number; readonly row: number }[],
+): EncounterState {
+  return {
+    ...state,
+    blockedCells: state.blockedCells.filter((blocked) =>
+      !cells.some((cell) => cell.column === blocked.column && cell.row === blocked.row)),
+  };
+}
+
 class RecordingConversationAdapter implements AgentSessionAdapter {
   readonly kind = 'codex' as const;
   readonly startInvocations: AgentInvocation[] = [];
@@ -2571,7 +2582,13 @@
 
   it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
-    const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+    const loadedState = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+    const state = {
+      ...loadedState,
+      blockedCells: loadedState.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+        ? { column: 9, row: cell.row }
+        : cell),
+    };
     const config = parseConversationArgs([
       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
       '--capture-rl-data', '--dry-run',
@@ -2666,9 +2683,18 @@
       '--dry-run',
       ...LEGACY_BLOCK_ARGS,
     ]);
+    const loadedState = await loadArenaFixture(hard
+      ? 'tests/fixtures/arena-basis-hard/seed-5117009.json'
+      : 'tests/fixtures/arena-basis/seed-3943001.json');
     const state = hard
-      ? await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json')
-      : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
+      ? {
+          ...loadedState,
+          blockedCells: loadedState.blockedCells.map((cell) =>
+            cell.column === 10 && (cell.row === 1 || cell.row === 5)
+            ? { column: 9, row: cell.row }
+            : cell),
+        }
+      : loadedState;
 
     const result = await runConversation(config, { roomStates: [state], ...options });
 
@@ -2831,7 +2857,20 @@
       ...ALL_OPTIONS_TEST_RENDERER_ARGS,
     ]);
 
-    const result = await runConversation(config);
+    const result = await runConversation(config, { roomStates: [
+      applyRoomInitiativeProfile(
+        await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
+        'derived_v1',
+      ),
+      applyRoomInitiativeProfile(withoutBlockedCells(
+        await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203002.json'),
+        [{ column: 8, row: 4 }],
+      ), 'derived_v1'),
+      applyRoomInitiativeProfile(withoutBlockedCells(
+        await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203003.json'),
+        [{ column: 6, row: 2 }, { column: 6, row: 6 }],
+      ), 'derived_v1'),
+    ] });
 
     expect(new Set(result.rows.map((row) => row.room))).toEqual(new Set([1, 2, 3]));
     expect(result.rows).toHaveLength(9);
diff --git a//tmp/vis-field-r2-raw.hQ8Scp/tools/ai-dm-conversation.ts b//tmp/vis-field-r2-raw.hQ8Scp/tools/ai-dm-conversation.ts
index f7dea88f0dd7bcf8aed8456f77067d77f6d4a18f..5d34fee797ee51989a80b0f346fb59405d0826ca
--- a//tmp/vis-field-r2-raw.hQ8Scp/tools/ai-dm-conversation.ts
+++ b//tmp/vis-field-r2-raw.hQ8Scp/tools/ai-dm-conversation.ts
@@ -7071,6 +7071,7 @@
           initiativeExecutionPending = false;
         }
       } catch (error) {
+        console.error('R2_ERROR', error);
         if (error instanceof D569IntegrityStop) throw error;
         classifyPolicy();
         if (inFlightSpeculation.current !== null) {
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index eba87413d0f81956b43d1b34d299ccd73de60f57..b43d7ea33f5d92b1fe3b7f95b8f54039bf356f8e
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -177,27 +177,36 @@
   };
 }
 
-function reauthoredClearControlFlowSight(state: EncounterState): EncounterState {
-  if (state.blockedCells.length > state.bounds.columns * 2 || state.bounds.rows < 2) {
-    throw new Error('The reauthored boundary cannot retain every blocked cell.');
+function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
+  const seamRows = new Set([1, 5]);
+  const matchingBlockers = state.blockedCells.filter((cell) =>
+    cell.column === 10 && seamRows.has(cell.row));
+  if (matchingBlockers.length !== seamRows.size) {
+    throw new Error('The hard exhaustion fixture no longer has both expected seam blockers.');
   }
   return {
     ...state,
-    blockedCells: state.blockedCells.map((_cell, index) => ({
-      column: index % state.bounds.columns,
-      row: state.bounds.rows - 1 - Math.floor(index / state.bounds.columns),
-    })),
+    blockedCells: state.blockedCells.map((cell) =>
+      cell.column === 10 && seamRows.has(cell.row)
+        ? { column: 9, row: cell.row }
+        : cell),
   };
 }
 
-function reauthoredDurableControlFlowRoster(state: EncounterState): EncounterState {
+function withoutFixtureBlockers(
+  state: EncounterState,
+  removed: readonly { readonly column: number; readonly row: number }[],
+): EncounterState {
+  const removedKeys = new Set(removed.map((cell) => `${cell.column},${cell.row}`));
+  const matchingBlockers = state.blockedCells.filter((cell) =>
+    removedKeys.has(`${cell.column},${cell.row}`));
+  if (matchingBlockers.length !== removedKeys.size) {
+    throw new Error('The brutal smoke fixture no longer has every expected seam blocker.');
+  }
   return {
     ...state,
-    combatants: state.combatants.map((combatant) => ({
-      ...combatant,
-      hitPoints: combatant.profile.rules.hitPointMaximum,
-      temporaryHitPoints: 1_000,
-    })),
+    blockedCells: state.blockedCells.filter((cell) =>
+      !removedKeys.has(`${cell.column},${cell.row}`)),
   };
 }
 
@@ -2595,7 +2604,10 @@
 
   it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
-    const state = reauthoredClearControlFlowSight(
+    // D635's row-line-2 seam at (10,1)/(10,2) blocks monster-2's Spear after its
+    // move to (13,1); opening only that seam then exposes monster-5's Longbow at
+    // the independent row-line-6 seam (10,5)/(10,6), so both blockers move left.
+    const state = reauthoredHardExhaustionSightlines(
       await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
     );
     const config = parseConversationArgs([
@@ -2693,7 +2705,9 @@
       ...LEGACY_BLOCK_ARGS,
     ]);
     const state = hard
-      ? reauthoredClearControlFlowSight(
+      // The typed fallback is reached only after monster-2's Spear and monster-5's
+      // Longbow clear the respective (10,1)/(10,2) and (10,5)/(10,6) seams.
+      ? reauthoredHardExhaustionSightlines(
           await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
         )
       : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
@@ -2756,8 +2770,9 @@
     });
     const playerIds = state.combatants.flatMap((combatant) =>
       combatant.profile.kind === 'player_character' ? [combatant.profile.id] : []);
-    // The SEAM rule closes rays that run along the column-9 wall's shared edges,
-    // including the one-sided row-6 edge beside the authored gap.
+    // D635 closes Fighter's row-line-3 seam at (9,2)/(9,3) and Cleric's
+    // row-line-5 seam at (9,4)/(9,5). Wizard's (18,5)->(2,7) ray crosses the
+    // authored row-6 gap instead of either two-blocker shared edge, so it stays clear.
     expect(playerIds.map((targetId) => {
       const trace = traceCombatantLine(state, fourthActorId, targetId);
       return { sourceCorner: trace.sourceCorner, blocked: trace.lines.map((line) => line.blocksSight) };
@@ -2860,15 +2875,22 @@
     ]);
 
     const result = await runConversation(config, { roomStates: [
-      applyRoomInitiativeProfile(reauthoredDurableControlFlowRoster(reauthoredClearControlFlowSight(
+      applyRoomInitiativeProfile(
         await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
-      )), 'derived_v1'),
-      applyRoomInitiativeProfile(reauthoredDurableControlFlowRoster(reauthoredClearControlFlowSight(
+        'derived_v1',
+      ),
+      // Radiant Flame otherwise refuses in all three rounds at the new
+      // row-line-5 seam (8,4)/(8,5); removing one blocker opens only that seam.
+      applyRoomInitiativeProfile(withoutFixtureBlockers(
         await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203002.json'),
-      )), 'derived_v1'),
-      applyRoomInitiativeProfile(reauthoredDurableControlFlowRoster(reauthoredClearControlFlowSight(
+        [{ column: 8, row: 4 }],
+      ), 'derived_v1'),
+      // Shortbow otherwise refuses once against Wizard at (6,6)/(6,7) and twice
+      // against Fighter at (6,2)/(6,3); one blocker opens each affected seam.
+      applyRoomInitiativeProfile(withoutFixtureBlockers(
         await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203003.json'),
-      )), 'derived_v1'),
+        [{ column: 6, row: 2 }, { column: 6, row: 6 }],
+      ), 'derived_v1'),
     ] });
 
     expect(new Set(result.rows.map((row) => row.room))).toEqual(new Set([1, 2, 3]));
