# VIS-FIELD REBASE reconciliation — sol report (fresh 01a0ac51…, 222 k tokens)

Implemented and verified the rebase reconciliation. No production files changed.

Changed files and justification:

- [dm-tactical-intel.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts): fixed the reproduced TS2345 by passing the existing `OFFER_ENVIRONMENT` to the SEAM-authored runtime. The `(10,2) → (9,2)` geometry and every assertion remain unchanged.
- [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts): authorized by four aggregate reds caused by OFFERS tests depending on pre-SEAM sightline cracks. Control-flow fixtures were reauthored without weakening assertions; the geometry test now asserts the SEAM-correct ray results.

Parent intents retained: VIS owns the new shared-edge sight behavior; OFFERS retains its runtime construction, fallback/controller, frontier-stability, and zero-refusal coverage.

Verification:

- Plan SHA-256: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`
- `npx tsc -p tsconfig.app.json --noEmit`: exit 0, 14.34 s
- `npx tsc -p tsconfig.node.json --noEmit`: exit 0, 26.87 s
- `node scripts/check-offer-environment-architecture.mjs --self-test`: exit 0, 77 fixtures passed
- `node scripts/check-command-outcomes.mjs`: exit 0, 1/1 check passed; 1,624 TypeScript files scanned
- `git diff --check`: exit 0
- Added lines over 120 columns: 0

The requested aggregate initially produced only three 5-second load timeouts in `room-generator-los-cover`; that file passed 111/111 alone in 95.31 s. Repeating the exact named set with unchanged assertions/timeouts and `--maxWorkers=1` passed:

```text
Test Files  37 passed (37)
Tests       836 passed (836)
Duration    1004.05s
```

Per-file counts:

```text
dm-encounter-host-live-path                 8/8
decision-program                           16/16
creature-cover                              5/5
terrain                                    13/13
visibility-field                           37/37
visibility                                 22/22
ai-dm-board-delivery                       17/17
ai-dm-board-snapshot                       21/21
ai-dm-conversation                        110/110
engine-mcp-golden                           2/2
engine-mcp-handler                        129/129
engine-mcp-server                          15/15
local-openai-conversation.SIMULATED         4/4
accessible-board                            6/6
actor-knowledge                             8/8
blind-context-source-binding                5/5
challenge-room-fixtures                    17/17
detection-reactions                        17/17
dm-tactical-intel                           6/6
encounter-projections                      11/11
engine-query-port                           9/9
engine-state-capsule                       11/11
experiment-orchestrator                    53/53
generated-encounter-fixtures               21/21
handoff-examples                            6/6
mutation-ledger                            60/60
offer-environment-board-sequence            1/1
offer-environment-identity                  3/3
offer-environment                          17/17
regret                                      6/6
room-generator-los-cover                  111/111
scene-snapshot                              8/8
senses                                     10/10
tactical-evaluator-r02                      2/2
turn-exhaustion-coordinator                14/14
two-room-fixture                            4/4
vane-warren                                31/31
```

The named aggregate does not include `semantic-board-payload.test.ts`; its two known B6 reds therefore remain deferred to B6.

D630 timing command:

```bash
npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
```

Result: 2/2 files, 36/36 tests, Vitest duration 38.81 s, measured wall time 39.271 s. That is 19.7% above the 32.8 s landed-main measurement and below the ≈41 s ceiling. No tuning performed.

Final status:

```text
 M tests/unit/tools/ai-dm-conversation.test.ts
 M tests/unit/vtt/dm-tactical-intel.test.ts
```

Diff: `50 insertions, 9 deletions`; exactly the two diagnostically/test-authorized files.

VIS-FIELD REBASE DONE
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 28af38ca6674b654aa08032d258df9b1970a1438..eba87413d0f81956b43d1b34d299ccd73de60f57
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -45,7 +45,7 @@
 import { armorClass, combatantId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
 import type { EncounterCommand } from '../../../src/combat/events';
 import { mulberry32 } from '../../../src/combat/random';
-import { generateRoom } from '../../../src/vtt/room-generator';
+import { applyRoomInitiativeProfile, generateRoom } from '../../../src/vtt/room-generator';
 import {
   availableEngineActorOptions,
   createPureTurnProposalResolver,
@@ -177,6 +177,30 @@
   };
 }
 
+function reauthoredClearControlFlowSight(state: EncounterState): EncounterState {
+  if (state.blockedCells.length > state.bounds.columns * 2 || state.bounds.rows < 2) {
+    throw new Error('The reauthored boundary cannot retain every blocked cell.');
+  }
+  return {
+    ...state,
+    blockedCells: state.blockedCells.map((_cell, index) => ({
+      column: index % state.bounds.columns,
+      row: state.bounds.rows - 1 - Math.floor(index / state.bounds.columns),
+    })),
+  };
+}
+
+function reauthoredDurableControlFlowRoster(state: EncounterState): EncounterState {
+  return {
+    ...state,
+    combatants: state.combatants.map((combatant) => ({
+      ...combatant,
+      hitPoints: combatant.profile.rules.hitPointMaximum,
+      temporaryHitPoints: 1_000,
+    })),
+  };
+}
+
 class RecordingConversationAdapter implements AgentSessionAdapter {
   readonly kind = 'codex' as const;
   readonly startInvocations: AgentInvocation[] = [];
@@ -2571,7 +2595,9 @@
 
   it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
-    const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+    const state = reauthoredClearControlFlowSight(
+      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
+    );
     const config = parseConversationArgs([
       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
       '--capture-rl-data', '--dry-run',
@@ -2667,7 +2693,9 @@
       ...LEGACY_BLOCK_ARGS,
     ]);
     const state = hard
-      ? await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json')
+      ? reauthoredClearControlFlowSight(
+          await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
+        )
       : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
 
     const result = await runConversation(config, { roomStates: [state], ...options });
@@ -2728,14 +2756,14 @@
     });
     const playerIds = state.combatants.flatMap((combatant) =>
       combatant.profile.kind === 'player_character' ? [combatant.profile.id] : []);
-    // Hand tracing the Large 2x2 source against the column-9 wall: its row-6
-    // gap leaves two rays open to Fighter/Cleric and one ray open to Wizard.
+    // The SEAM rule closes rays that run along the column-9 wall's shared edges,
+    // including the one-sided row-6 edge beside the authored gap.
     expect(playerIds.map((targetId) => {
       const trace = traceCombatantLine(state, fourthActorId, targetId);
       return { sourceCorner: trace.sourceCorner, blocked: trace.lines.map((line) => line.blocksSight) };
     })).toEqual([
-      { sourceCorner: { column: 16, row: 3 }, blocked: [true, true, false, false] },
-      { sourceCorner: { column: 16, row: 5 }, blocked: [true, true, false, false] },
+      { sourceCorner: { column: 16, row: 3 }, blocked: [true, true, true, true] },
+      { sourceCorner: { column: 16, row: 5 }, blocked: [true, true, true, true] },
       { sourceCorner: { column: 18, row: 5 }, blocked: [true, true, true, false] },
     ]);
     const runtime = createEngineMcpRuntime(state, { toolProfile: 'dm', requestedActorIds: actorIds });
@@ -2831,7 +2859,17 @@
       ...ALL_OPTIONS_TEST_RENDERER_ARGS,
     ]);
 
-    const result = await runConversation(config);
+    const result = await runConversation(config, { roomStates: [
+      applyRoomInitiativeProfile(reauthoredDurableControlFlowRoster(reauthoredClearControlFlowSight(
+        await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
+      )), 'derived_v1'),
+      applyRoomInitiativeProfile(reauthoredDurableControlFlowRoster(reauthoredClearControlFlowSight(
+        await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203002.json'),
+      )), 'derived_v1'),
+      applyRoomInitiativeProfile(reauthoredDurableControlFlowRoster(reauthoredClearControlFlowSight(
+        await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203003.json'),
+      )), 'derived_v1'),
+    ] });
 
     expect(new Set(result.rows.map((row) => row.room))).toEqual(new Set([1, 2, 3]));
     expect(result.rows).toHaveLength(9);
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index e9d4bdde3ce00c674f0c3a1524d034a4313d6333..1f8809d1e9133bdf447481457701f4306b3dadd5
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -71,7 +71,10 @@
       await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
     );
     const state = freshMonsterPlanningState(loaded);
-    const runtime = createEngineMcpRuntime(state, { toolProfile: 'dm' });
+    const runtime = createEngineMcpRuntime(state, {
+      toolProfile: 'dm',
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
