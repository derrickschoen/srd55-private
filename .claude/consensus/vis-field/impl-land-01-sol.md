# VIS-FIELD LAND-01 — sol report (fresh 01a0ae59…, 389 k tokens; BLOCKED only on one out-of-manifest hand pin)

utal-b.test.ts b/tests/unit/vtt/arena-basis-brutal-b.test.ts
index d76fdc233b9b4def2bc1d4a141cc81f083564e5f..3613a2eb3c8585746b048672e2aea6e388c0d940
--- a/tests/unit/vtt/arena-basis-brutal-b.test.ts
+++ b/tests/unit/vtt/arena-basis-brutal-b.test.ts
@@ -15,6 +15,10 @@
   resolveEngineActorOption,
   type EngineTurnProposal,
 } from '../../../src/vtt/intent-resolver';
+import type {
+  EngineActivationChoice,
+  EngineOfferableOption,
+} from '../../../src/vtt/turn-proposal';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
 import { decodeArenaFixture } from '../../../src/vtt/mcp/entrypoint';
@@ -142,6 +146,20 @@
   return actors;
 }
 
+function deterministicActivationChoice(option: EngineOfferableOption): EngineActivationChoice | undefined {
+  const slot = option.activationChoice;
+  if (slot === undefined || slot === null) return undefined;
+  switch (slot.kind) {
+    case 'command_word': return { kind: slot.kind, value: slot.values[0] };
+    case 'unicorns_blessing_spell': return { kind: slot.kind, value: slot.values[0] };
+    case 'dispel_evil_and_good_mode': return { kind: slot.kind, value: slot.values[0] };
+    case 'calm_emotions_per_target': return {
+      kind: slot.kind,
+      selections: slot.targetIds.map((targetId) => ({ targetId, mode: slot.values[0] })),
+    };
+  }
+}
+
 function dryRunMonsterPlan(state: EncounterState): ReadonlyMap<CombatantId, AuthorizedEngineTurnProposal> {
   const actorIds = [...livingMonsterIds(state)].sort((left, right) => left.localeCompare(right));
   const planningState = projectFutureMonsterTurns(state, actorIds);
@@ -160,12 +178,14 @@
       state.revision,
     ).find((option) => option.optionId !== primary.optionId);
     if (fallback === undefined) throw new Error(`Dry-run plan has no independent fallback for ${actorId}.`);
+    const activationChoice = deterministicActivationChoice(primary);
     const proposal: EngineTurnProposal = {
       actorId,
       expectedRevision: state.revision,
       primaryOptionId: primary.optionId,
       fallbackOptionId: fallback.optionId,
       reason: 'Use the engine-ranked option to maximize immediate tactical value.',
+      ...(activationChoice === undefined ? {} : { activationChoice }),
       overrideJustification: null,
     };
     const resolution = TURN_PROPOSAL_RESOLVER.resolve(planningState, proposal);
diff --git a/tests/unit/vtt/engine-query-port.test.ts b/tests/unit/vtt/engine-query-port.test.ts
index 66fe8cfa5e7742935be2fd8a47e42d07a131f38b..62acd4131b7a3469070f9f41ce9c246e4904c1e2
--- a/tests/unit/vtt/engine-query-port.test.ts
+++ b/tests/unit/vtt/engine-query-port.test.ts
@@ -9,24 +9,35 @@
 } from '../../../src/combat/encounter';
 import { traceCombatantLine } from '../../../src/combat/cover';
 import { monsterCombatantProfile } from '../../../src/combat/combatant';
-import { monsterAttackCommand } from '../../../src/combat/monster-commands';
+import { monsterAttackCommand, monsterSavingThrowCommand } from '../../../src/combat/monster-commands';
 import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
+import type { MonsterAttackAction, MonsterSavingThrowAction } from '../../../src/combat/statblock';
 import type { GridCell } from '../../../src/combat/grid';
 import { terrainBlocking, terrainKindOfWireBlocking } from '../../../src/combat/terrain';
-import { armorClass, combatantId, statblockId, worldObjectId, type CombatantId } from '../../../src/combat/values';
+import {
+  armorClass,
+  combatantId,
+  feet,
+  statblockId,
+  worldObjectId,
+  type CombatantId,
+} from '../../../src/combat/values';
 import { projectDmView } from '../../../src/combat/visibility';
 import { ENCOUNTER_VIEW_CLASSIFICATION } from '../../../src/combat/visibility';
 import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
 import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';
+import { monsterActions, monsterBonusActions } from '../../../src/vtt/engine-query-port';
 import {
   availableEngineActorOptions,
   createPureTurnProposalResolver,
   engineActorOptionsForEnvironment,
+  resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
 import { engineOptionId } from '../../../src/vtt/turn-proposal';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 import { readFileSync } from '../../helpers/test-filesystem';
 
@@ -36,6 +47,21 @@
 const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
+const AGREEMENT_FIXTURE_PATHS = [
+  ...Array.from(
+    { length: 13 },
+    (_unused, index) => `tests/fixtures/arena-basis-hard/seed-${String(5_117_001 + index)}.json`,
+  ),
+  ...Array.from(
+    { length: 10 },
+    (_unused, index) => `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`,
+  ),
+  ...Array.from(
+    { length: 10 },
+    (_unused, index) => `tests/fixtures/arena-basis-brutal-b/seed-${String(6_206_001 + index)}.json`,
+  ),
+] as const;
+
 function legacyDocument(
   state: EncounterState,
   foggedCells: unknown,
@@ -82,6 +108,49 @@
   });
 }
 
+function twoBlockerSeamState(openLowerFlank: boolean): {
+  readonly state: EncounterState;
+  readonly actorId: CombatantId;
+  readonly targetId: CombatantId;
+} {
+  const actorBase = monsterCombatantProfile(GOBLIN_WARRIOR, {
+    combatantId: 'combatant:query-seam-shooter',
+    tokenId: 'token:query-seam-shooter',
+  });
+  const actor = {
+    ...actorBase,
+    rules: { ...actorBase.rules, speed: feet(0) },
+  };
+  const target = playerProfile('query-seam-target');
+  return {
+    state: freshMonsterPlanningState(createEncounter({
+      bounds: { columns: 16, rows: 8 },
+      combatants: [actor, target],
+      tokens: [placedToken(actor, 14, 5), placedToken(target, 1, 6)],
+      blockedCells: openLowerFlank
+        ? [{ column: 8, row: 5 }]
+        : [{ column: 8, row: 5 }, { column: 8, row: 6 }],
+    })),
+    actorId: actor.id,
+    targetId: target.id,
+  };
+}
+
+function stateAtResolvedOrigin(
+  state: EncounterState,
+  actorId: CombatantId,
+  position: GridCell,
+): EncounterState {
+  return {
+    ...state,
+    activeCombatant: actorId,
+    activeInitiativeIndex: 0,
+    tokens: state.tokens.map((token) => token.combatantId === actorId
+      ? { ...token, position }
+      : token),
+  };
+}
+
 describe('canonical engine query port', () => {
   it('ENGINE_QUERY_VISIBILITY_EQUALS_CANONICAL_DETECTOR including located outcomes', () => {
     const observerBase = monsterProfile('query-visibility-observer');
@@ -423,6 +492,110 @@
     expect(projectEncounterBoard(projectDmView(walled)).blockedCells).toEqual(walledCells);
   });
 
+  it('OFFER_IGNORES_BLOCKS_SIGHT refuses a half-cover two-blocker seam and opens one flank', () => {
+    const closed = twoBlockerSeamState(false);
+    const opened = twoBlockerSeamState(true);
+    // The four formerly clear rays are (14,6)/(15,6) -> (1,6)/(2,6). Each follows row line 6
+    // between wall cells (8,5)/(8,6); the other twelve corner rays enter one of those cells.
+    expect(traceCombatantLine(closed.state, closed.actorId, closed.targetId)).toMatchObject({
+      tier: 'half',
+      blocksSight: true,
+      firstBlockingCell: { column: 8, row: 5 },
+    });
+    expect(OFFER_ENVIRONMENT.queries.reach(closed.state, {
+      actorId: closed.actorId,
+      targetId: closed.targetId,
+      actionId: 'shortbow',
+    })).toEqual({ legal: false, codes: ['target_outside_line_of_sight'] });
+    expect(availableEngineActorOptions(closed.state, closed.actorId, OFFER_ENVIRONMENT).some((option) =>
+      option.actionSlots.some((slot) => slot.use.kind === 'attack' &&
+        slot.use.target.kind === 'combatant' && slot.use.target.combatantId === closed.targetId))).toBe(false);
+
+    // Removing (8,6) leaves the row-line-6 rays with a blocker on only one flank.
+    expect(traceCombatantLine(opened.state, opened.actorId, opened.targetId)).toMatchObject({
+      tier: 'none',
+      blocksSight: false,
+    });
+    expect(OFFER_ENVIRONMENT.queries.reach(opened.state, {
+      actorId: opened.actorId,
+      targetId: opened.targetId,
+      actionId: 'shortbow',
+    })).toMatchObject({ legal: true });
+    expect(availableEngineActorOptions(opened.state, opened.actorId, OFFER_ENVIRONMENT).some((option) =>
+      option.actionSlots.some((slot) => slot.use.kind === 'attack' &&
+        slot.use.target.kind === 'combatant' && slot.use.target.combatantId === opened.targetId))).toBe(true);
+  });
+
+  it('offered attacks and saves in every frozen landing family pass the reducer LOS rule', () => {
+    const losFailures: string[] = [];
+    let checkedOffers = 0;
+    for (const path of AGREEMENT_FIXTURE_PATHS) {
+      const state = freshMonsterPlanningState(decodeArenaFixtureText(readFileSync(path, 'utf8')));
+      const monsters = state.combatants.filter((combatant) =>
+        combatant.profile.kind === 'monster' && combatant.life === 'living');
+      for (const monster of monsters) {
+        for (const option of availableEngineActorOptions(
+          state,
+          monster.profile.id,
+          OFFER_ENVIRONMENT,
+        )) {
+          const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
+          if (!resolution.valid) throw new Error(`${path}: offered option ${option.optionId} did not resolve.`);
+          const uses = resolution.mechanics.actionSlots.filter((use) =>
+            use.kind === 'attack' || use.kind === 'saving_throw');
+          if (uses.length === 0) continue;
+          checkedOffers += 1;
+          for (const use of uses) {
+            const targetId = use.targetIds[0];
+            if (targetId === undefined) throw new Error(`${path}: ${use.actionId} omitted its target.`);
+            const executionState = stateAtResolvedOrigin(
+              state,
+              monster.profile.id,
+              resolution.mechanics.finalPosition,
+            );
+            const sources = [
+              ...monsterActions(executionState, monster.profile.id),
+              ...monsterBonusActions(executionState, monster.profile.id),
+            ];
+            const action = sources.find(
+              (candidate): candidate is MonsterAttackAction | MonsterSavingThrowAction =>
+                (candidate.kind === 'attack' || candidate.kind === 'saving_throw') &&
+                candidate.id === use.actionId && candidate.kind === use.kind,
+            );
+            if (action === undefined) throw new Error(`${path}: resolved action ${use.actionId} is absent.`);
+            try {
+              if (action.kind === 'attack') {
+                reduceEncounter(
+                  executionState,
+                  monsterAttackCommand(action, monster.profile.id, targetId),
+                  () => 0.5,
+                );
+              } else {
+                reduceEncounter(
+                  executionState,
+                  monsterSavingThrowCommand(
+                    action,
+                    monster.profile.id,
+                    targetId,
+                    use.multiattackComponent === true ? 'none' : use.slot === 'bonus' ? 'bonus_action' : 'action',
+                  ),
+                  () => 0.5,
+                );
+              }
+            } catch (error) {
+              const message = error instanceof Error ? error.message : String(error);
+              if (!message.includes('Total Cover or is outside line of sight')) throw error;
+              losFailures.push(`${path}:${monster.profile.id}:${option.optionId}:${use.actionId}`);
+            }
+          }
+        }
+      }
+    }
+
+    expect(checkedOffers).toBe(214);
+    expect(losFailures).toEqual([]);
+  }, 30_000);
+
   it('returns independently hand-computed melee reach and thrown normal range', () => {
     const calls = [
       { case: 'melee_reach', actionId: 'grab', actor: { column: 0, row: 0 }, target: { column: 2, row: 0 } },
diff --git a/tests/unit/vtt/room-generator-los-cover.test.ts b/tests/unit/vtt/room-generator-los-cover.test.ts
index 0085d66c4ab9025fe4b7b708eca90a136c58cd5b..8b18303ab0fdfa529dd614d7909754aa2135fa94
--- a/tests/unit/vtt/room-generator-los-cover.test.ts
+++ b/tests/unit/vtt/room-generator-los-cover.test.ts
@@ -1,5 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import { combatantSpace, combatantSpaceAt } from '../../../src/combat/combat-rules';
+import { createEncounter } from '../../../src/combat/encounter';
 import {
   traceCombatantLine,
   traceCombatantLineToCells,
@@ -18,11 +19,13 @@
 import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
+  generatedLineIsOpen,
   generateRoom,
   type GeneratedRoom,
   type RoomDifficultyProfile,
 } from '../../../src/vtt/room-generator';
 import { declareTestInputs } from '../../helpers/test-inputs';
+import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 
 const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
@@ -251,6 +254,44 @@
 }
 
 describe('D576 los_cover_v1 generator membership', () => {
+  it('OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam', () => {
+    const source = monsterProfile('generator-seam-source');
+    const target = playerProfile('generator-seam-target');
+    const state = createEncounter({
+      bounds: { columns: 16, rows: 8 },
+      combatants: [source, target],
+      tokens: [placedToken(source, 14, 5), placedToken(target, 1, 6)],
+      blockedCells: [{ column: 8, row: 5 }, { column: 8, row: 6 }],
+    });
+    const opened = {
+      ...state,
+      blockedCells: [{ column: 8, row: 5 }],
+    };
+
+    // This is the state's only living opposing pair. The (14,6) -> (1,6) ray follows
+    // row line 6 between blocker flanks (8,5)/(8,6), without entering either cell.
+    const closedTrace = traceCombatantLine(state, source.id, target.id);
+    expect(closedTrace).toMatchObject({
+      tier: 'half',
+      blocksSight: true,
+      firstBlockingCell: { column: 8, row: 5 },
+    });
+    const closedRay = closedTrace.lines.find((line) =>
+      line.targetCorner.column === 1 && line.targetCorner.row === 6);
+    if (closedRay === undefined) throw new Error('Two-blocker fixture omitted the (14,6) -> (1,6) ray.');
+    expect(closedRay).toMatchObject({ tier: 'none', blocksSight: true });
+    expect(generatedLineIsOpen(closedRay)).toBe(false);
+
+    // Removing (8,6) opens the same row-line-6 rays because only (8,5) remains.
+    const openedTrace = traceCombatantLine(opened, source.id, target.id);
+    expect(openedTrace).toMatchObject({ tier: 'none', blocksSight: false });
+    const openedRay = openedTrace.lines.find((line) =>
+      line.targetCorner.column === 1 && line.targetCorner.row === 6);
+    if (openedRay === undefined) throw new Error('One-flank fixture omitted the (14,6) -> (1,6) ray.');
+    expect(openedRay).toMatchObject({ tier: 'none', blocksSight: false });
+    expect(generatedLineIsOpen(openedRay)).toBe(true);
+  });
+
   it('generated and authored arena fixtures share one strict decoder', () => {
     const generated = generateRoom(5_762_001, { terrainProfile: 'los_cover_v1' });
     expect(canonicalJson(decodeArenaBasisEnvelopeV1(generated, { mode: 'legacy_basis' }).encounter.state))


---

# LAND-01 r3 — final report (resumed 01a0ae59…, 473 k tokens)

6496`; old `0.380769180625`.
- Bless Priest/Scouts: `1035529241349/1638400000000 = 0.6320368904718018`; old `0.5791028347540284`.
- Bless Scouts/Bandit: `244932731431/409600000000 = 0.5979803013452148`; old `0.5456702909643554`.
- No Priest attacks: `3267511/16000000 = 0.2042194375`, unchanged.
- Bless only/no Priest attacks: `738527623/2048000000 = 0.36060919091796875`, unchanged.
- Delayed Bless: `231920047241/409600000000 = 0.56621105283447265625`; old `0.5126504372290038`.

Bless was enumerated over all four d4 outcomes:

- Priest: `(19,19,2)/40`
- Scout m3: `(25,13,2)/40`
- Bandit m4: `(27,11,2)/40`

The comments document every resolved origin/trace, damage term, initiative-order fold, old value, and resulting fraction. The two numerically unchanged controls retain byte-identical assertion expressions.

Verification:

```text
tactical-evaluator-r02.test.ts
2/2 passed

engine-query-port.test.ts
19/19 passed

arena-basis-brutal-b.test.ts
37 passed / exactly 10 expected productivity failures
```

The retained productivity failures are seeds `6206001–6206010`, respectively monsters:

```text
monster-2, monster-1, monster-1, monster-2, monster-2,
monster-2, monster-2, monster-1, monster-2, monster-2
```

Additional checks:

- `tsconfig.app.json`: exit 0
- `tsconfig.node.json`: exit 0
- `git diff --check`: pass
- Status: exactly six authorized files
- Diff: 325 insertions, 22 deletions
- Maximum added-line width: 114
- No fixture changes
- Frozen plan SHA unchanged: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`

VIS-FIELD LAND-01 DONE
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index bd57762f528729164debdf71052d737b7823ed4e..131cfac1bde57fdb049e69258f495da43f96f360
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -58,7 +58,7 @@
 }
 
 const BASE_FAILURE_WEIGHTS = {
-  priest: { miss: 14, normalHit: 5, criticalHit: 1, denominator: 20 },
+  priest: { miss: 12, normalHit: 7, criticalHit: 1, denominator: 20 },
   firstScout: { miss: 15, normalHit: 4, criticalHit: 1, denominator: 20 },
   secondScout: { miss: 18, normalHit: 1, criticalHit: 1, denominator: 20 },
   firstBandit: { miss: 16, normalHit: 3, criticalHit: 1, denominator: 20 },
@@ -66,7 +66,7 @@
 } as const satisfies Readonly<Record<string, FailureWeights>>;
 
 const BLESSED_FAILURE_WEIGHTS = {
-  priest: { miss: 23, normalHit: 15, criticalHit: 2, denominator: 40 },
+  priest: { miss: 19, normalHit: 19, criticalHit: 2, denominator: 40 },
   firstScout: { miss: 25, normalHit: 13, criticalHit: 2, denominator: 40 },
   secondScout: { miss: 31, normalHit: 7, criticalHit: 2, denominator: 40 },
   firstBandit: { miss: 27, normalHit: 11, criticalHit: 2, denominator: 40 },
@@ -277,6 +277,22 @@
     // 11068542976/25600000000 = 2702281/6250000 = 0.43236496. The evaluator's floating fold order yields
     // 0.4323649600000002; this file already uses 12-place closeness for independently derived probabilities.
     expect(probability('no-bless')).toBeCloseTo(0.43236496, 12);
+
+    // Bless is enumerated over d4 faces, as tactical-evaluator.ts:579-622 requires; no +2.5 shortcut is used.
+    // At Priest m1's (13,4) none/false origin, d4=1..4 gives miss/normal/critical counts
+    // (11,8,1), (10,9,1), (9,10,1), (8,11,1) over d20: totals (38,38,4)/80 = (19,19,2)/40.
+    // At Scout m3's (18,4) half/false origin the rows are (14,5,1), (13,6,1), (12,7,1),
+    // (11,8,1): totals (50,26,4)/80 = (25,13,2)/40. At Bandit m4's (17,4) half/false origin
+    // they are (15,4,1), (14,5,1), (13,6,1), (12,7,1): totals (54,22,4)/80 = (27,11,2)/40.
+    // Blessed damage is therefore Priest 2*((19/40*11)+(2/40*22))=12.65, Scout m3
+    // 2*((13/40*6.5)+(2/40*11))=5.325, and Bandit m4 (11/40*5.5)+(2/40*10)=2.0125.
+
+    // bless-scout-scout-priest uses the same resolved origins/traces above. In initiative order its weights
+    // are blessed P1 x2 (19,19,2), blessed S3 x2 (25,13,2), blessed S5 x2 (31,7,2), then base
+    // B4 (16,3,1) and B6 (14,5,1), over 40 except the base rows over 20. The capped fold is
+    // [48568940000,196036663850,358265154801,1035529241349]/1638400000000, so the result is
+    // 1035529241349/1638400000000 = 0.6320368904718018; expected damage is
+    // 12.65+5.325+3.375+1.325+1.875=24.55. Pre-LAND-01: 0.5791028347540284.
     expect(probability('bless-scout-scout-priest')).toBeCloseTo(deathSaveKillProbability([
       ...repeated(BLESSED_FAILURE_WEIGHTS.priest, 2),
       ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
@@ -284,6 +300,13 @@
       BASE_FAILURE_WEIGHTS.firstBandit,
       BASE_FAILURE_WEIGHTS.secondBandit,
     ]), 12);
+
+    // bless-scout-scout-bandit resolves P1 at (13,4) none/false, S3 at (18,4) half/false, and B4 at
+    // (17,4) half/false. The ordered weights are base P1 x2 (12,7,1), blessed S3 x2 (25,13,2),
+    // blessed S5 x2 (31,7,2), blessed B4 (27,11,2), and base B6 (14,5,1). The capped counts are
+    // [32693220000,111903328800,184737988338,489865462862]/819200000000, giving
+    // 244932731431/409600000000 = 0.5979803013452148. Damage is
+    // 9.9+5.325+3.375+2.0125+1.875=22.4875. Pre-LAND-01: 0.5456702909643554.
     expect(probability('bless-scout-scout-bandit')).toBeCloseTo(deathSaveKillProbability([
       ...repeated(BASE_FAILURE_WEIGHTS.priest, 2),
       ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
@@ -291,12 +314,25 @@
       BLESSED_FAILURE_WEIGHTS.firstBandit,
       BASE_FAILURE_WEIGHTS.secondBandit,
     ]), 12);
+
+    // no-priest-attacks still moves S3 to (18,4) half/false and B4 to (17,4) half/false. Their cover,
+    // base splits, and damage stay unchanged. S3 x2 (15,4,1), S5 x2 (18,1,1), B4 (16,3,1), and
+    // B6 (14,5,1) fold to [16329600,19417320,15183036,13070044]/64000000, hence
+    // 3267511/16000000 = 0.2042194375; damage is 3.7+1.75+1.325+1.875=8.65.
+    // Pre-LAND-01 was also 0.2042194375.
     expect(probability('no-priest-attacks')).toBeCloseTo(deathSaveKillProbability([
       ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
       ...repeated(BASE_FAILURE_WEIGHTS.secondScout, 2),
       BASE_FAILURE_WEIGHTS.firstBandit,
       BASE_FAILURE_WEIGHTS.secondBandit,
     ]), 12);
+
+    // bless-only-priest-no-attacks uses S3 at (18,4) half/false and B4 at (17,4) half/false with the
+    // d4 rows derived above: blessed S3 x2 (25,13,2), blessed S5 x2 (31,7,2), blessed B4
+    // (27,11,2), then base B6 (14,5,1). The capped fold is
+    // [227036250,512230825,570205302,738527623]/2048000000, so the result is
+    // 738527623/2048000000 = 0.36060919091796875; damage is 5.325+3.375+2.0125+1.875=12.5875.
+    // Pre-LAND-01 evaluator order was the same 0.3606091909179688.
     expect(probability('bless-only-priest-no-attacks')).toBeCloseTo(deathSaveKillProbability([
       ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
       ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
@@ -323,7 +359,12 @@
     if (delayed?.killProbability === null || delayed?.killProbability === undefined) {
       throw new Error('Delayed-Bless allocation is unresolved.');
     }
-    // The first Scout acts before Bless; Priest and Scout 2 then use their blessed rows.
+    // Delayed Bless uses S3 at (18,4) half/false before the grant, then P1 at (13,4) none/false and
+    // S5 after it; B4 resolves at (17,4) half/false without Bless. Ordered weights are base S3 x2
+    // (15,4,1), blessed P1 x2 (19,19,2), blessed S5 x2 (31,7,2), base B4 (16,3,1), and base
+    // B6 (14,5,1). Counts [17484818400,61714224330,98480910029,231920047241]/409600000000 give
+    // 231920047241/409600000000 = 0.56621105283447265625. Damage is
+    // 3.7+12.65+3.375+1.325+1.875=22.925. Pre-LAND-01: 0.5126504372290038.
     expect(delayed.killProbability).toBeCloseTo(deathSaveKillProbability([
       ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
       ...repeated(BLESSED_FAILURE_WEIGHTS.priest, 2),
