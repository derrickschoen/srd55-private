
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a0a642-35a1-7082-aba2-eda56ea291c1
--------
user
RULES (binding): You are the REVIEWER (gpt-6-astra, MEDIUM per D627, resumed — the session that reviewed every VIS-FIELD batch). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify — a DETACHED clean checkout at ebfcacaa (= 10cc9f5e (B6 ACCEPTED, the complete frozen plan) + LAND-01; node_modules symlinked). Sandbox read-only; in-memory when /tmp is read-only; do NOT edit files, no git writes, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; never port 4173; no full gate, full vitest, Playwright, npm run build. Do not read sibling worktrees or /home/vagrant/dnd-slim-runs/. MAIN repo /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static's .claude/decisions.md and .claude/consensus/vis-field/** readable: read D635.35–D635.41, impl-landing-investigation-sol.md and impl-land-01-sol.md first. Model calls WILL fail. Report exact commands and numbers; end with the named marker.

TASK: Review `git diff 10cc9f5e ebfcacaa` (6 files, 325+/22−: src/vtt/engine-query-port.ts, src/vtt/room-generator.ts, tests/unit/vtt/{engine-query-port,room-generator-los-cover,arena-basis-brutal-b,tactical-evaluator-r02}.test.ts) = LAND-01, the landing-reconciliation batch for the two VIS-FIELD defects the full-suite landing gate exposed (D635.36): (c1) the query port offered attacks/saves whose corner trace blocks sight (tier-only check) while execution refuses them — an offers-boundary violation; (c2) the generator's open-ray predicate ignored blocksSight; plus the brutal-b helper's missing activation choice, and six tactical-evaluator kill-probability pins that scored shots from origins the reducer would refuse. Supervisor verification (verify-land-01.log): tsc 0/0; OFFERS checks 0/0; my mutants (sight check disabled → both query witnesses red incl. the 214-offer agreement property; generator predicate relaxed → its witness red); 16 suites 299/299 (query port, r02, dm-tactical-intel, challenge-room, the OFFERS set, replay, detection); los-cover 112/112; exactly the 16 expected reds remain (ten brutal-b productivity pins + six D569 manifest — the frozen-family consequence awaiting the owner, D635.36); pair 38 s.

CHECK (each with commands and numbers): (1) c1: the refusal at engine-query-port.ts:~1171 uses the SAME trace inputs as execution (encounter.ts:~7183: actor, target, sourceAnchor = the proposed origin) — could the two still disagree (a different anchor, footprint, exclusion set, or a path where execution traces after a move the query did not model)? Enumerate every production site that decides attack/save targetability and confirm each is now sight-aware or is not an authorization gate (sol left :1234/:1547 tactical-scoring and :1830 cover reporting alone — agree or not). (2) The AGREEMENT PROPERTY ("offered attacks and saves in every frozen landing family pass the reducer LOS rule"): read it — is executing each offer through reduceEncounter at the resolved finalPosition a faithful model of real execution (initiative/active-combatant setup, the () => 0.5 roll, multiattack components, bonus-action slot)? 214 offers checked — recount from the three families; a property that silently skips options is a P1. (3) c2: generatedLineIsOpen = tier 'none' && !blocksSight at both call sites; the witness's geometry (14,6)→(1,6) along row line 6 between (8,5)/(8,6) — verify; sol's in-memory regeneration of 42 seeds byte-equal — reproduce for at least the ten brutal-b seeds (so the frozen families are NOT cured by the fix; relevant to the owner's question). (4) The six R02 pins: recompute at least two allocations independently (no-bless 2702281/6250000 and one Bless variant; Bless enumerated over the d4 faces; the death-save fold in initiative order per tactical-evaluator.ts:786-814) and confirm the two unchanged controls are byte-identical to 10cc9f5e. (5) The brutal-b helper: materializing the first declared legal activation choice keeps the engine-ranked option — confirm it does not mask a resolver defect and that dispel-evil-and-good's choice contract is what the helper reads. (6) No fixture changed; the remaining reds are exactly the frozen-family ones; tsc 0/0; suites you can run; pair (ceiling ≈41 s).

OUTPUT: findings LAND-Fn with severity P1/P2/P3, file:line, evidence, fix; then exactly "VERDICT: ACCEPT" or "VERDICT: REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll read the landing rulings and reports first, then check the targeting agreement, generator behavior, and probability pins against the code and targeted tests.

exec
/bin/bash -lc "rg -n '"'^## D635'"\\.(35|36|37|38|39|40|41)' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md; cat /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-01-sol.md; cat /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-landing-investigation-sol.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
22954:## D635.35 — SUPERVISOR (2026-09-17 02:54): VIS-FIELD LANDING GATE vitest phase RED with DETERMINISTIC reds outside every plan manifest — the frozen arena families lose their productivity guarantee under the seam rule; read-only investigation before any ruling
22957:## D635.36 — SUPERVISOR (2026-09-17 03:22): landing investigation harvested — TWO VIS-FIELD DEFECTS (category c) found, plus a legitimate seam consequence on the frozen brutal families that needs the OWNER's decision
22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
22963:## D635.38 — SUPERVISOR (2026-09-17 04:07): the board-snapshot browser spec's failure REPRODUCES alone on the clean 10cc9f5e checkout — a beforeAll timeout inside the blind board-snapshot service's board-visible wait; LAND-02 diagnoses it as a candidate VIS-FIELD defect
22966:## D635.38.1 — SUPERVISOR (2026-09-17 04:21): control run confirms the board-snapshot browser spec passes on main 9f148666 (2 passed, 3.4 min, port 4480) and fails alone on the VIS-FIELD tree — VIS-FIELD-caused; LAND-02 diagnoses per D635.38.
22968:## D635.39 — SUPERVISOR (2026-09-17 04:37): LAND-01 complete on its five files (both defects fixed with witnesses and mutants; 214 frozen-family offers all execute; generator bytes 42/42 equal); one out-of-manifest hand pin moves as a consequence — manifest +1; r2 dispatched
22971:## D635.40 — SUPERVISOR (2026-09-17 04:51): LAND-01 r2 — the no-bless pin re-derived by hand (spot-checked by me); the same mechanism moves the Bless-variant pins in the same test; allowance widened to every expectation in that test that scores the three moved monsters; r3 dispatched
22974:## D635.41 — SUPERVISOR (2026-09-17 05:22): LAND-01 verified by me and COMMITTED ebfcacaa; astra medium review dispatched; LAND-02 (browser specs) dispatched in parallel
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
# VIS-FIELD landing-gate investigation — sol read-only report (fresh 01a0ae25…, 387 k tokens)

## Conclusion

The failures split into three groups:

- 10 brutal-b productivity rows plus the D569 second-family violations are genuine **D635 two-blocker seam consequences on frozen fixtures**: category **(a)**.
- 19 of the 23 round-execution failures expose a real **VIS-FIELD integration defect**: the query layer offers a seam-obscured attack because it checks only physical `tier === 'total'`, while execution correctly rejects `blocksSight === true`: category **(c)**.
- The remaining four execution failures are a latent scripted monster-policy defect exposed by D635’s changed ranking: the selected spell requires an activation choice that the helper omits. These are category **(a)**, not derived fog.
- No reported failure is caused by derived fog/detection: category **(b) = 0**.

There is a second category-(c) issue in generation: `hasOpenOpposingRay()` calls a ray “open” when `tier === 'none'` without requiring `blocksSight === false`.

### 1. Brutal-b productivity

The contract at [arena-basis-brutal-b.test.ts:358](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/arena-basis-brutal-b.test.ts:358) defines productive as a valid option having either:

- positive movement cost, or
- an `attack`, `saving_throw`, `cast_spell`, or `use_world_object` slot.

Dodge and End Turn do not qualify.

The generator’s M576-E2 mechanics are weaker than that contract:

- [room-generator.ts:1223](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator.ts:1223) calls a ray open solely when `tier === 'none'`.
- It ignores `blocksSight`.
- Wall placement at [room-generator.ts:1329](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator.ts:1329) requires only one such “open” ray.
- The actual per-monster productivity certification lives in [room-generator-los-cover.test.ts:237](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/room-generator-los-cover.test.ts:237) and the frozen-family validators, not in `generateRoom()`.
- [generate-arena-basis.ts:247](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/generate-arena-basis.ts:247) merely serializes `generateRoom()`.

Under D635, a two-blocker edge can produce `tier: none` and `blocksSight: true`; therefore `hasOpenOpposingRay()` is now semantically wrong.

Across all ten brutal-b seeds, **25 monsters** lose every productive option:

| Seed | First reported monster | All nonproductive monsters | D635 flanking cells |
|---|---|---:|---|
| 6206001 | m2 Minotaur Skeleton `(18,0)` | 3 | `(11,1)/(11,2)` |
| 6206002 | m1 Doppelganger `(21,1)` | 2 | `(11,1)/(11,2)` |
| 6206003 | m1 Doppelganger `(21,1)` | 4 | `(11,1)/(11,2)` |
| 6206004 | m2 Grappling Cuttle `(13,0)` | 2 | `(8,1)/(8,2)` |
| 6206005 | m2 Ancient Crag Bear `(20,2)` | 4 | `(12,1)/(12,2)`, `(12,4)/(12,5)` |
| 6206006 | m2 Titan Cuttle `(10,2)` | 2 | `(7,1)/(7,2)`, `(7,4)/(7,5)` |
| 6206007 | m2 Elder Sky Raptor `(13,2)` | 4 | `(8,1)/(8,2)`, `(8,4)/(8,5)` |
| 6206008 | m1 Doppelganger `(19,1)` | 2 | `(10,1)/(10,2)` |
| 6206009 | m5 Astraldendon `(13,5)` | 1 | `(7,4)/(7,5)`, `(7,5)/(7,6)` |
| 6206010 | m3 Kelp Hunter `(17,3)` | 1 | `(9,2)/(9,3)`, `(9,3)/(9,4)` |

Mechanism count: **25 seam, 0 derived-fog/detection, 0 other**.

Three detailed examples:

- **6206001 m2**, Large footprint at `(18,0)`. Candidate PCs are fighter `(1,2)`, cleric `(2,5)`, and wizard `(1,6)`. Cleric/wizard rays were already blocked. The fighter formerly had four clear row-line-2 corner rays:
  `(18,2)→(1,2)`, `(18,2)→(2,2)`, `(20,2)→(1,2)`, `(20,2)→(2,2)`.
  Every one runs along the edge shared by `(11,1)` and `(11,2)`. Main’s tracer touched neither cell interior; D635 blocks all four.

- **6206005 m2**, Huge footprint at `(20,2)`. Four fighter rays on row line 2, from x=20/23 to x=1/2, are closed by `(12,1)/(12,2)`. Four cleric rays on row line 5, from x=20/23 to x=2/3, are closed by `(12,4)/(12,5)`. The remaining wizard rays are independently blocked. Its current options are only Dodge and End Turn.

- **6206009 m5**, at `(13,5)`. The cleric row-line-5 rays, x=13/14 to x=2/3, are closed by `(7,4)/(7,5)`. The wizard row-line-6 rays, x=13/14 to x=1/2, are closed by `(7,5)/(7,6)`. Fighter rays were already blocked.

For 6206007, one wizard ray also changes under observer-derived opacity, but removing that opacity does not restore productivity; the fighter/cleric seam closures alone determine the result. It is therefore still category (a), not (b).

The B2 query consolidation is likewise not causal here. Main’s local detector at `9f148666:engine-query-port.ts:791-829` treated only `seen` as targetable; its lossy `located` path remained non-visible and could fall into undetected/darkness-style downstream handling. Current `detectCombatant()` also requires `kind === 'seen'` in this target-selection path. Disabling the consolidation while retaining D635 leaves the same 25 failures.

### 2. Round execution

The exact split among the 23 rows is:

- **19 LOS/cover refusals — category (c)**
  - hard: 5117001–007, 5117009–013: 12
  - brutal: 6203002, 003, 005, 006, 008, 009: 6
  - brutal-b: 6206004: 1
- **4 missing activation choices — category (a)**
  - brutal 6203004
  - brutal-b 6206001, 6206009, 6206010

The production mismatch is exact:

- [engine-query-port.ts:1163](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/engine-query-port.ts:1163) rejects an attack/save only when `traceCombatantLine(...).tier === 'total'`.
- D635 deliberately made optical blocking independent of physical cover at [cover.ts:384](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts:384).
- [encounter.ts:7183](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/encounter.ts:7183) correctly rejects when `attackLine.blocksSight || tier === 'total'`, producing:  
  `The target has Total Cover or is outside line of sight.`

Thus seam rays with `blocksSight: true, tier: half` pass offer generation and fail execution.

Representative hard case, **5117001**:

- First monster segment selects m6’s Heavy Crossbow against the wizard.
- Monster origin: `(14,5)`; wizard: `(1,6)`.
- Main-clear row-line-6 rays:
  `(14,6)→(1,6)`, `(14,6)→(2,6)`, `(15,6)→(1,6)`, `(15,6)→(2,6)`.
- D635 flanks: `(8,5)/(8,6)`.
- Current trace: `tier=half`, `blocksSight=true`, first blocking cell `(8,5)`.
- Query authorizes it because the tier is not total; encounter execution refuses it.

Representative brutal case, **6203002**:

- The scripted PCs act: cleric attacks m2, fighter moves to `(0,1)`, wizard moves to `(0,5)`.
- The final monster segment selects m1’s Radiant Flame against that wizard after moving  
  `(14,2)→(13,3)→(12,4)` for 20 feet.
- Main-clear row-line-5 rays are from `(12,5)/(13,5)` to `(0,5)/(1,5)`.
- D635 flanks: `(8,4)/(8,5)`.
- Current trace: `tier=half`, `blocksSight=true`, first blocker `(8,4)`.
- Execution refuses the command with the same LOS error.

The scripted **party** did not assume these lanes. The rejected commands are monster-plan commands. The suite name merely identifies the party policy used around them.

For the four other rows, `dryRunMonsterPlan()` at [arena-basis-brutal-b.test.ts:145](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/arena-basis-brutal-b.test.ts:145) selects `spellcasting/dispel-evil-and-good (1/1)` as the ranked default but constructs a proposal without `activationChoice`. The spell requires:

```text
{ kind: "dispel_evil_and_good_mode",
  value: "break_enchantment" | "dismissal" }
```

The resolver rejects it at [intent-resolver.ts:578](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/intent-resolver.ts:578) with `ACTIVATION_CHOICE_INVALID`. D635 changed which option wins the ranking and exposed the helper’s latent omission. The attended-policy assertion at line 517 is collateral: planning fails before any attended pending decision can be created.

### 3. D569

The validator at [d569-second-family-manifest.ts:272](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/d569-second-family-manifest.ts:272) reruns the same current-engine productivity predicate for every monster in each brutal fixture. Validation at [d569-second-family-manifest.ts:396](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/d569-second-family-manifest.ts:396) additionally checks:

- exact cohort/path/seed identity;
- frozen SHA-256;
- generated-room integrity and difficulty membership;
- two canonical regenerations against the frozen bytes.

[d569-blind-experiment.ts:602](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/d569-blind-experiment.ts:602) prefixes those violations with `second_family_`; its dry runner throws the first at line 677.

The seven entries received by the line-409 assertion are seven identical codes:

```text
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
```

They correspond, in manifest order, to seeds:

```text
6207002, 6207004, 6207005, 6207006, 6207007, 6207008, 6207009
```

Those seven rooms contain 18 currently nonproductive monsters. The same no-seam comparison identifies two-blocker seam lanes in every case; no derived-fog-only violation was found.

### 4. Main `9f148666`

Yes, all three suites pass under main semantics.

I could not check out another tree or write a temporary checkout under the stated restrictions, so I checked this in memory:

1. `git diff` showed the two test files, both validators, and every implicated fixture are byte-identical between `9f148666` and `10cc9f5e`.
2. `git show 9f148666:src/combat/cover.ts` supplied the old tracer. It had no shared-edge test and promoted all-sight-blocked corner sets to total cover.
3. Replaying the exact fixture geometry with that old corner-ray rule restored productive lanes to all 25 brutal-b monsters and all seven D569 rooms.
4. The 19 offered-then-refused commands cease to disagree: the old clear seam rays have `blocksSight=false`; where every ray is physically blocked, main reports total cover consistently.
5. The four activation-choice rows return to their old option ranking. Because test/helper/fixture bytes are identical, the changed ranking is attributable to the changed visibility geometry.

No Vitest, build, Playwright, or server was run. An early Vite module-loading attempt failed before startup on unrelated socket 24678; neither 4173 nor 4450 was touched. The worktree remains clean at `10cc9f5eeef874691293747ee08ab484ba603d10`.

Principal read-only commands included:

```bash
git status --short --branch
git rev-parse HEAD
git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static rev-parse main

git diff --stat 9f1486665399571c57fdd82fa3745b1d8fca457a..HEAD -- \
  tests/unit/vtt/arena-basis-brutal-b.test.ts \
  tests/unit/tools/d569-blind-experiment.test.ts \
  tools/d569-second-family-manifest.ts \
  tools/d569-blind-experiment.ts \
  src/vtt/engine-query-port.ts src/combat/cover.ts \
  src/combat/visibility-field.ts src/vtt/monster-planning-state.ts

git diff --name-status 9f1486665399571c57fdd82fa3745b1d8fca457a..HEAD -- \
  tests/fixtures/arena-basis-hard \
  tests/fixtures/arena-basis-brutal \
  tests/fixtures/arena-basis-brutal-b \
  tests/fixtures/arena-basis-hard-2 \
  tests/fixtures/arena-basis-brutal-2 \
  tests/fixtures/d569-second-family-manifest.json \
  tests/fixtures/d569-blind-experiment-manifest.json

git show 9f1486665399571c57fdd82fa3745b1d8fca457a:src/combat/cover.ts |
  nl -ba | sed -n '280,430p'

git show 9f1486665399571c57fdd82fa3745b1d8fca457a:src/vtt/engine-query-port.ts |
  nl -ba | sed -n '775,850p;1000,1105p;1860,1905p'

rg -n "second_family_brutal_productivity|brutal_productivity" tests tools src
```

The geometry, option, execution, and D569 enumerations used read-only `node --import tsx --input-type=module -e ...` probes with a `.txt` import hook; they read the frozen JSON and called the current engine APIs directly.

### 5. Remedy scope

1. **Fix category-(c) production defects before touching fixtures.**
   - Align [engine-query-port.ts:1163](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/engine-query-port.ts:1163) with execution: an attack/save behind `blocksSight` must not be offerable merely because physical cover is half or none.
   - Make [room-generator.ts:1223](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator.ts:1223) require both `tier === 'none'` and `blocksSight === false`.
   - Regeneration with the current generator alone would reproduce the same bytes; it is not yet seam-aware enough to cure the fixtures.

2. **Fix the scripted monster policy.**
   - Amend `dryRunMonsterPlan()` to materialize a deterministic legal activation choice or avoid selecting a choice-requiring option without one.
   - `createScriptedPartyPlan()` itself does not need changing.

3. **Then reselect/regenerate the genuinely invalid productivity families.**
   - `tests/fixtures/arena-basis-brutal-b/seed-6206001..6206010.json`
   - its digest map in `tests/unit/vtt/arena-basis-brutal-b.test.ts`
   - `tests/fixtures/arena-basis-brutal-2/seed-6207001..6207010.json`, or at minimum the seven invalid seeds, with a deliberate new frozen-cohort ruling
   - `tests/fixtures/d569-second-family-manifest.json`
   - the second-family manifest hash in `tests/fixtures/d569-blind-experiment-manifest.json`
   - associated digest pins in generator/manifest tests.

   The primary hard/brutal fixtures should not be regenerated merely to hide the 19 query/executor failures; correcting the query and policy should make those execute legally.

4. **D569 consequence.**
   - The second family is `8 arms × 2 bases × 10 fixtures × 3 reps = 480 cells`.
   - Regenerating all ten brutal second-family fixtures changes 240 cell state hashes; changing only the seven currently invalid seeds changes 168.
   - Either way, changing the nested manifest hash invalidates the registered identity of the entire 480-cell second-family experiment.
   - Historical rows remain immutable records of the old states, but they cannot be relabelled or pooled as observations from the regenerated cohort. A new manifest/version and new rows are required.

5. **Amending the productivity contract is possible but not advisable.**
   - It would touch the brutal-b predicate, `expectProductiveMonsters()`, and D569’s `everyMonsterProductive()`.
   - Allowing Dodge/End Turn would erase the explicit “productive first-turn option” guarantee instead of adapting the frozen data to D635.
   - No fog/detection repins are warranted.

LANDING INVESTIGATION DONE
exec
/bin/bash -lc "sed -n '22954,22980p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md; git diff 10cc9f5e ebfcacaa -- src/vtt/engine-query-port.ts src/vtt/room-generator.ts; nl -ba tests/unit/vtt/tactical-evaluator-r02.test.ts | sed -n '150,380p'; sha256sum src/vtt/engine-query-port.ts src/vtt/room-generator.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
## D635.35 — SUPERVISOR (2026-09-17 02:54): VIS-FIELD LANDING GATE vitest phase RED with DETERMINISTIC reds outside every plan manifest — the frozen arena families lose their productivity guarantee under the seam rule; read-only investigation before any ruling
gate-wt-vis-field.log: tsc -b --force 0; sg 0; vitest RED; Playwright running. Detail runs by me (gate-fail-detail.log, gate-fail-detail2.log, both while Playwright loaded the box): tests/unit/vtt/arena-basis-brutal-b.test.ts 34 failed / 13 passed — ten "pins seed 62060xx only after proving every brutal membership property from state" fail at :413 with "combatant:generated-62060xx-monster-N has no productive first-turn offer" (one named monster per seed: 6206001 m2, 6206002 m1, 6206003 m1, 6206004 m2, 6206005 m2, 6206006 m2, 6206007 m2, 6206008 m1, 6206009 m5, 6206010 m3), twenty-three "executes round 1 … under the unattended scripted-party policy" fail at :421 with 'execution_failed' instead of 'executed' (hard 5117001-007, 009-013; brutal 6203002-006, 008, 009; brutal-b 6206001, 004, 009, 010), and "rejects rather than skips an execution_failed row" at :517 (expected >0); tests/unit/tools/d569-blind-experiment.test.ts 6 failed / 46 passed — five throw "Invalid D569 experiment manifest: second_family_brutal_productivity" and one expects [] at :409 (seven entries received); replay's OWN-BUNDLE-VERSION-OUTSIDE-WINDOW and los-cover's two were 5 s timeouts in the gate (los-cover 111/111 isolated earlier). READING: these are consequences of the owner's seam rule (D635) on the FROZEN arena families — the generator certified "every living monster retains a productive first-turn option" (M576-E2) and the unattended scripted party assumed shooting lanes that ran along two-blocker edges; the D569 experiment manifest re-validates the second family's productivity against the CURRENT engine, so the frozen second family is now an invalid manifest. None of this was in any batch's manifest because the plan's final aggregate named only its own suites; the landing gate is where it had to surface. NOT YET PROVEN: that every failure is the seam (some could be derived-fog / actor-knowledge / query-port consolidation effects). A READ-ONLY investigation lane (fresh sol) traces three representatives (one productivity pin, one scripted round-1 execution_failed, the d569 manifest validity) to their mechanism with rays and cells and classifies every failure as seam-consequence, derived-fog consequence, or VIS-FIELD defect; the owner then decides between regenerating the frozen families under the seam-aware tracer (which invalidates the D569 second-family experiment rows), amending the productivity contract, or revisiting D635. No landing until then.

## D635.36 — SUPERVISOR (2026-09-17 03:22): landing investigation harvested — TWO VIS-FIELD DEFECTS (category c) found, plus a legitimate seam consequence on the frozen brutal families that needs the OWNER's decision
Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.

## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
Playwright (1.0 h, port 4450): tests/browser/ai-dm-board-snapshot.spec.ts:258 "captures the full production DM board deterministically through durable save upload/load" (0 ms — "Target page, context or browser has been closed", four times) and tests/browser/vtt-encounter.spec.ts:173 "M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow" (15.0 s — expect(locator).toHaveCount failed). The second is plausibly a legitimate consequence of B4 on the REFERENCE scene (authored fog (8,1),(8,2) replaced by derived fog [(4,3)]) that no batch's manifest covered because the plan named no browser spec; the first may be a crash chain from the same run. Both are being read from the gate's JSON report before any ruling; browser specs that pin the reference scene's fog need a hand-derived re-pin under the same rule as every other pin. LAND-01 (fresh sol 01a0ae59…, brief impl-vis-field-land-01.md, log impl-land-01.log) fixes the two production defects and the helper now.

## D635.38 — SUPERVISOR (2026-09-17 04:07): the board-snapshot browser spec's failure REPRODUCES alone on the clean 10cc9f5e checkout — a beforeAll timeout inside the blind board-snapshot service's board-visible wait; LAND-02 diagnoses it as a candidate VIS-FIELD defect
pw-snapshot-alone.log (detached checkout, port 4460, single worker): tests/browser/ai-dm-board-snapshot.spec.ts fails in its FIRST beforeAll (:186) with "beforeAll hook timeout of 30000ms exceeded" — the blind warmup's captureSynchronized → #prepareBoard → #waitForBoardVisible (tools/ai-dm-board-snapshot.ts:992-1030) never resolves; the three dependent beforeAlls then throw their "did not complete" guards and the test reports 0 ms with the closed-browser errors. The wait predicate requires the rendered board element to carry data-board-audience = dm/player, data-source-revision, data-source-round, data-source-state-digest === the service's expected stateDigest, and (D525) the requested glyph mode; a pageerror would have rejected immediately, so one of those attribute equalities never holds. HYPOTHESIS (unproven): a state-digest disagreement between the service and the app now that the V1 decoder validates-and-discards the legacy fog key (B2) — one side may digest the raw fixture bytes or the pre-discard state while the other digests the decoded state — or the derived fog changing what the blind capture app renders for the hard fixture. The same spec passed in the OFFERS landing gate on 1cacd8f0 (187/187, D617.50); a control run on main (port 4480) is in progress. Either way it is VIS-FIELD's to resolve before landing: LAND-02's item (2) is now "diagnose the predicate attribute that fails (instrument in the browser context on a copy), name the producing code on both sides, and fix the VIS-FIELD side or STOP with the mechanism" — a production change there needs a manifest ruling from me. vtt-encounter.spec.ts:237 remains the hand re-pin of the reference scene's derived fog at (4,3).

## D635.38.1 — SUPERVISOR (2026-09-17 04:21): control run confirms the board-snapshot browser spec passes on main 9f148666 (2 passed, 3.4 min, port 4480) and fails alone on the VIS-FIELD tree — VIS-FIELD-caused; LAND-02 diagnoses per D635.38.

## D635.39 — SUPERVISOR (2026-09-17 04:37): LAND-01 complete on its five files (both defects fixed with witnesses and mutants; 214 frozen-family offers all execute; generator bytes 42/42 equal); one out-of-manifest hand pin moves as a consequence — manifest +1; r2 dispatched
Sol (impl-land-01-sol.md): engine-query-port.ts:1167 refuses attack/save offers whose trace blocksSight with the new exact code target_outside_line_of_sight, tracing from the proposed origin (execution's sourceAnchor semantics); the targetability audit found no other authorization gate (query-port :1234/:1547 are tactical-scoring cover inputs and :1830 reports physical cover — left alone, and changing them broke valid intel expectations); room-generator.ts:1227 generatedLineIsOpen = tier 'none' && !blocksSight for both opposing-pair and creature-to-cell predicates; the brutal-b helper materializes the first declared legal activation choice (keeps the engine-ranked option). Witnesses: the two-blocker seam fixture (rays (14,6)/(15,6)→(1,6)/(2,6) along row line 6 between (8,5)/(8,6): closed → half/blocksSight true, no attack offered, LOS code; one flank removed → offered); the AGREEMENT PROPERTY over hard 5117001-013, brutal 6203001-010, brutal-b 6206001-010: exactly 214 offered attack/save uses, every one executes through the reducer without the LOS/Total-Cover error; mutant OFFER_IGNORES_BLOCKS_SIGHT → both red (the cardinality would be 451); OPEN_RAY_IGNORES_BLOCKS_SIGHT → red. GENERATOR BYTES: in-memory regeneration of all 42 checked seeds is byte-equal before/after the fix — so the fixed generator does not cure the frozen families; restoring productivity needs a NEW cohort (reselected seeds), which sharpens question 5's option A. Suites: engine-query-port 19/19; los-cover 112/112; brutal-b 37 passed / 10 failed — the ten productivity pins only (the 19 c1 rows and the four helper rows now execute; "rejects rather than skips" is GREEN, contrary to my brief's prediction — the attended pending decision still forms); d569-blind-experiment 46 / 6 retained (frozen-family, owner's decision); OFFERS 11 files 329/329; dm-tactical-intel + challenge-room 23/23; tsc 0/0; OFFERS checks 0/0; pair 38.6 s; 5 files 260+/9−. ONE CONSEQUENCE outside the manifest: tests/unit/vtt/tactical-evaluator-r02.test.ts:262 pins a hand-authored expected-value probability 0.380769180625 that scored three attacks from origins the reducer would have REFUSED (priest m1, scout m3, bandit m4 at {half, blocksSight true}); with the corrected query the offers come from executable origins (priest 30-ft move to (13,4) none/false; scout 5 ft to (18,4) half/false; bandit 5 ft to (17,4) half/false) and the evaluator scores from each option's finalPosition, giving 0.4323649600000002. Legitimate: the old number rated offers that could not execute. RULING: manifest +1 — tests/unit/vtt/tactical-evaluator-r02.test.ts, that ONE expectation, re-derived BY HAND in its comment (each monster's new origin, line tier/sight, hit chance and damage terms, the sum; the old value kept as pre-LAND-01), never copied from the run; r2 on the resumed session; then my verification, astra medium, and LAND-02.

## D635.40 — SUPERVISOR (2026-09-17 04:51): LAND-01 r2 — the no-bless pin re-derived by hand (spot-checked by me); the same mechanism moves the Bless-variant pins in the same test; allowance widened to every expectation in that test that scores the three moved monsters; r3 dispatched
Sol (resumed): :262 re-derived with the full arithmetic in the comment — priest m1 now offered after a 30-ft move to (13,4) (none / sight clear): +5 vs AC 18 → miss 12/20, normal 7/20, critical 1/20, two 2d10 attacks → 2·(7/20·11 + 1/20·22) = 9.9; scout m3 after a 5-ft move to (18,4) (half): AC 20, +4 → 15/20, 4/20, 1/20, two 1d8+2 → 2·(4/20·6.5 + 1/20·11) = 3.7; bandit m4 after 5 ft to (17,4) (half): +3 → 16/20, 3/20, 1/20, 1d8+1 → 1.325; unchanged scout m5 1.75 and bandit m6 1.875; damage sum 18.55; the dying-target death-save fold (tactical-evaluator.ts:786-814, miss/normal/critical → +0/+1/+2 failures capped at three) in initiative order gives 11068542976/25600000000 = 2702281/6250000 = 0.43236496; the evaluator's float order yields 0.4323649600000002; the file's existing 12-place closeness kept; the old 0.380769180625 recorded as pre-LAND-01. SPOT-CHECKED BY ME: the three to-hit splits and the three damage expectations are right (e.g. 2·(3.85+1.1) = 9.9; 2·(1.3+0.55) = 3.7; 0.825+0.5 = 1.325). The stop: the next assertion, bless-scout-scout-priest at :280 (expected 0.5791028347540284, actual 0.6320368904718017), scores the SAME moved priest/scout origins under Bless — the same legitimate mechanism; my one-expectation ruling was too narrow. RULING: the allowance covers EVERY expectation in tests/unit/vtt/tactical-evaluator-r02.test.ts whose allocation includes the moved priest m1 / scout m3 / bandit m4 (the Bless variants included), each re-derived by hand in the same form (Bless adds 1d4 = +2.5 expected to the attack roll → state the new hit/normal/critical splits per monster and the fold), old values kept as pre-LAND-01; any expectation NOT involving those three monsters must stay byte-identical (a change there is a STOP). r3 on the resumed session.

## D635.41 — SUPERVISOR (2026-09-17 05:22): LAND-01 verified by me and COMMITTED ebfcacaa; astra medium review dispatched; LAND-02 (browser specs) dispatched in parallel
VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index cbf840ab..4c084d64 100644
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -196,6 +196,7 @@ export type EngineReachResult =
         | 'action_range_unresolved'
         | 'target_out_of_range'
         | 'target_has_total_cover'
+        | 'target_outside_line_of_sight'
       )[];
     };
 
@@ -1163,9 +1164,14 @@ function reach(state: EncounterState, request: EngineReachRequest): EngineReachR
   const actorSpace = queryCombatantSpaceAt(state, request.actorId, origin);
   const targetSpace = queryCombatantSpace(state, request.targetId);
   const distanceFeet = minimumSpaceDistance(actorSpace, targetSpace);
-  if ((action.kind === 'attack' || action.kind === 'saving_throw') &&
-    traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: origin }).tier === 'total') {
-    return { legal: false, codes: ['target_has_total_cover'] };
+  if (action.kind === 'attack' || action.kind === 'saving_throw') {
+    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
+      sourceAnchor: origin,
+    });
+    if (trace.blocksSight) {
+      return { legal: false, codes: ['target_outside_line_of_sight'] };
+    }
+    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
   }
   if (action.kind === 'attack') {
     const verdict = tacticalRangeVerdictAtDistance(distanceFeet, monsterAttackRange(action));
diff --git a/src/vtt/room-generator.ts b/src/vtt/room-generator.ts
index 8950d846..1b584875 100644
--- a/src/vtt/room-generator.ts
+++ b/src/vtt/room-generator.ts
@@ -9,7 +9,11 @@ import {
 } from '../combat/creature-space';
 import { createEncounter, type EncounterCombatantState, type EncounterState } from '../combat/encounter';
 import { combatantSpace } from '../combat/combat-rules';
-import { traceCombatantLine, traceCombatantLineToCells } from '../combat/cover';
+import {
+  traceCombatantLine,
+  traceCombatantLineToCells,
+  type TerrainLineTrace,
+} from '../combat/cover';
 import type { GridBounds, GridCell } from '../combat/grid';
 import { mulberry32, type Rng } from '../combat/random';
 import type { ChallengeRating } from '../combat/statblock';
@@ -1220,9 +1224,15 @@ function traceHasAuthoredSource(
   });
 }
 
+export function generatedLineIsOpen(
+  trace: Pick<TerrainLineTrace, 'tier' | 'blocksSight'>,
+): boolean {
+  return trace.tier === 'none' && !trace.blocksSight;
+}
+
 function hasOpenOpposingRay(state: EncounterState): boolean {
   if (livingOpposingPairs(state).some(({ source, target }) =>
-    traceCombatantLine(state, source.profile.id, target.profile.id).tier === 'none')) return true;
+    generatedLineIsOpen(traceCombatantLine(state, source.profile.id, target.profile.id)))) return true;
   const occupied = occupiedCombatantCells(state);
   return state.combatants.some((source) => {
     if (source.life !== 'living' || !state.tokens.some((token) =>
@@ -1230,8 +1240,9 @@ function hasOpenOpposingRay(state: EncounterState): boolean {
     for (let row = 0; row < state.bounds.rows; row += 1) {
       for (let column = 0; column < state.bounds.columns; column += 1) {
         const target = { column, row };
-        if (!occupied.has(cellKey(target)) &&
-          traceCombatantLineToCells(state, source.profile.id, [target]).tier === 'none') return true;
+        if (!occupied.has(cellKey(target)) && generatedLineIsOpen(
+          traceCombatantLineToCells(state, source.profile.id, [target]),
+        )) return true;
       }
     }
     return false;
   150	        consequences: evaluation.consequences,
   151	        policy: evaluation.policy,
   152	        expectedProbabilities: geometry.probabilities,
   153	        expectedDamage: geometry.expectedDamage,
   154	      };
   155	    });
   156	
   157	    for (const row of rows) {
   158	      // Fixture positions differ by 18 columns and at most 3 rows: Chebyshev 18 * 5 = 90 ft.
   159	      expect(row.minimumMovementFeet).toBe(0);
   160	      expect(row.range).toEqual({
   161	        status: 'resolved', distanceFeet: 90, band: 'normal', legal: true,
   162	      });
   163	      expect(row.rollMode).toMatchObject({
   164	        mode: 'normal',
   165	        reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
   166	      });
   167	      // +4 attacks the hand-counted Half/Three-Quarters adjusted AC above.
   168	      expect(row.probabilities).toEqual(row.expectedProbabilities);
   169	      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
   170	      expect(row.damage).toEqual({
   171	        status: 'resolved',
   172	        normalHitAverage: 6.5,
   173	        criticalHitAverage: 11,
   174	        expectedDamage: row.expectedDamage,
   175	      });
   176	      expect(row.consequences).toEqual({
   177	        deathFailureOnHit: true,
   178	        failuresOnHit: 1,
   179	        failuresOnCritical: 2,
   180	        automaticCriticalOnHit: false,
   181	        automaticCriticalMaximumDistanceFeet: 5,
   182	      });
   183	      expect(row.policy).toBe('tactical-evaluator-v3');
   184	    }
   185	  });
   186	
   187	  it('compares ordered registry allocations with exact post-grant Bless conditioning', async () => {
   188	    const state = freshMonsterPlanningState(await frozenState());
   189	    const optionFor = (
   190	      actorId: typeof PRIEST,
   191	      predicate: (option: EngineOfferableOption) => boolean,
   192	    ): EngineOfferableOption => {
   193	      const option = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).find(predicate);
   194	      if (option === undefined) throw new Error(`Required option is absent for ${actorId}.`);
   195	      return option;
   196	    };
   197	    const attacks = (actorId: typeof PRIEST, actionId: string, count: number) =>
   198	      optionFor(actorId, (option) => option.actionSlots.some((slot) =>
   199	        slot.slot === 'main' && slot.use.kind === 'multiattack' &&
   200	        slot.use.components.length === count && slot.use.components.every((component) =>
   201	          component.actionId === actionId && component.target.kind === 'combatant' &&
   202	          component.target.combatantId === FIGHTER)) && option.actionSlots.length === 1);
   203	    const singleAttack = (actorId: typeof PRIEST, actionId: string) =>
   204	      optionFor(actorId, (option) => option.actionSlots.length === 1 && option.actionSlots.some((slot) =>
   205	        slot.slot === 'main' && slot.use.kind === 'attack' && slot.use.actionId === actionId &&
   206	        slot.use.target.kind === 'combatant' && slot.use.target.combatantId === FIGHTER));
   207	    const hasBless = (option: EngineOfferableOption) =>
   208	      option.actionSlots.some((slot) => {
   209	        return slot.slot === 'bonus' && slot.use.kind === 'cast_spell' && slot.use.spellId === 'bless';
   210	      });
   211	    const priestAttack = attacks(PRIEST, 'radiant-flame', 2);
   212	    const priestBless = optionFor(PRIEST, (option) =>
   213	      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'multiattack' &&
   214	        slot.use.components.length === 2 && slot.use.components.every((component) =>
   215	          component.actionId === 'radiant-flame' && component.target.kind === 'combatant' &&
   216	          component.target.combatantId === FIGHTER)) && hasBless(option));
   217	    const priestEnds = optionFor(PRIEST, (option) =>
   218	      option.actionSlots.length === 1 && option.actionSlots[0]?.use.kind === 'end_turn');
   219	    const priestBlessOnly = optionFor(PRIEST, (option) =>
   220	      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'end_turn') &&
   221	      hasBless(option));
   222	    const scoutOptions = SCOUTS.map((actorId) => attacks(actorId, 'longbow', 2));
   223	    const banditOptions = BANDITS.map((actorId) => singleAttack(actorId, 'light-crossbow'));
   224	    const initiativeOrder = [PRIEST, ...SCOUTS, ...BANDITS] as const;
   225	    const candidate = (
   226	      allocationId: string,
   227	      priestOption: EngineOfferableOption,
   228	      blessTargetIds?: readonly typeof PRIEST[],
   229	    ): TacticalAllocationCandidate => ({
   230	      allocationId,
   231	      choices: [priestOption, ...scoutOptions, ...banditOptions].map((option) => ({
   232	        actorId: option.actorId,
   233	        optionId: option.optionId,
   234	      })),
   235	      ...(blessTargetIds === undefined ? {} : {
   236	        modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: blessTargetIds }],
   237	      }),
   238	    });
   239	    const scoutScoutPriest = [PRIEST, ...SCOUTS] as const;
   240	    const scoutScoutBandit = [...SCOUTS, BANDITS[0]] as const;
   241	    const comparison = OFFER_ENVIRONMENT.queries.compareAllocations(state, FIGHTER, [
   242	      candidate('no-bless', priestAttack),
   243	      candidate('bless-scout-scout-priest', priestBless, scoutScoutPriest),
   244	      candidate('bless-scout-scout-bandit', priestBless, scoutScoutBandit),
   245	      candidate('no-priest-attacks', priestEnds),
   246	      candidate('bless-only-priest-no-attacks', priestBlessOnly, scoutScoutBandit),
   247	    ], initiativeOrder, OFFER_ENVIRONMENT);
   248	
   249	    expect(comparison.policy).toBe('tactical-evaluator-v3');
   250	    const probability = (allocationId: string) => {
   251	      const result = comparison.allocations.find((allocation) => allocation.allocationId === allocationId);
   252	      if (result?.killProbability === null || result?.killProbability === undefined) {
   253	        throw new Error(`${allocationId} kill probability is unresolved.`);
   254	      }
   255	      expect(result.expectedFailures).not.toBeNull();
   256	      expect(result.expectedDamage).not.toBeNull();
   257	      return result.killProbability;
   258	    };
   259	    // LAND-01 hand derivation; pre-LAND-01 was 0.380769180625 because three blocked origins were scored.
   260	    // Priest m1's (19,1) shot followed row 2 between blockers (10,1)/(10,2), so it is no longer offered
   261	    // there. The query offers it after a 30-foot move to (13,4): tier none, blocksSight false. Against
   262	    // AC 18, +5 gives miss/normal/critical = 12/20, 7/20, 1/20. Its two 2d10 attacks contribute
   263	    // 2 * ((7/20 * 11) + (1/20 * 22)) = 9.9 expected damage.
   264	    // Scout m3's (19,3) shot followed row 3 between blockers (10,2)/(10,3), so it is no longer offered
   265	    // there. The query offers it after a 5-foot move to (18,4): tier half, blocksSight false. Half cover
   266	    // makes AC 20; +4 gives 15/20, 4/20, 1/20. Its two 1d8+2 attacks contribute
   267	    // 2 * ((4/20 * 6.5) + (1/20 * 11)) = 3.7 expected damage.
   268	    // Bandit m4 has the same old row-3 seam. The query offers its attack after a 5-foot move to (17,4):
   269	    // tier half, blocksSight false. AC 20 with +3 gives 16/20, 3/20, 1/20; its 1d8+1 attack contributes
   270	    // (3/20 * 5.5) + (1/20 * 10) = 1.325 expected damage. Unchanged Scout m5 contributes 1.75 and
   271	    // Bandit m6 contributes 1.875, so the evaluator's damage sum is 9.9 + 3.7 + 1.325 + 1.75 + 1.875 = 18.55.
   272	    // tactical-evaluator.ts:604-622 derives the roll weights and :730-750 derives those damage terms.
   273	    // For this dying target, :786-814 instead folds miss/normal/critical as +0/+1/+2 failures, capped at
   274	    // three. In initiative order the weights are P1 x2 (12,7,1), S3 x2 (15,4,1), S5 x2 (18,1,1),
   275	    // B4 (16,3,1), B6 (14,5,1), all over 20. The final capped state counts are
   276	    // [2351462400,5539466880,6640527744,11068542976] / 25600000000, hence kill probability
   277	    // 11068542976/25600000000 = 2702281/6250000 = 0.43236496. The evaluator's floating fold order yields
   278	    // 0.4323649600000002; this file already uses 12-place closeness for independently derived probabilities.
   279	    expect(probability('no-bless')).toBeCloseTo(0.43236496, 12);
   280	
   281	    // Bless is enumerated over d4 faces, as tactical-evaluator.ts:579-622 requires; no +2.5 shortcut is used.
   282	    // At Priest m1's (13,4) none/false origin, d4=1..4 gives miss/normal/critical counts
   283	    // (11,8,1), (10,9,1), (9,10,1), (8,11,1) over d20: totals (38,38,4)/80 = (19,19,2)/40.
   284	    // At Scout m3's (18,4) half/false origin the rows are (14,5,1), (13,6,1), (12,7,1),
   285	    // (11,8,1): totals (50,26,4)/80 = (25,13,2)/40. At Bandit m4's (17,4) half/false origin
   286	    // they are (15,4,1), (14,5,1), (13,6,1), (12,7,1): totals (54,22,4)/80 = (27,11,2)/40.
   287	    // Blessed damage is therefore Priest 2*((19/40*11)+(2/40*22))=12.65, Scout m3
   288	    // 2*((13/40*6.5)+(2/40*11))=5.325, and Bandit m4 (11/40*5.5)+(2/40*10)=2.0125.
   289	
   290	    // bless-scout-scout-priest uses the same resolved origins/traces above. In initiative order its weights
   291	    // are blessed P1 x2 (19,19,2), blessed S3 x2 (25,13,2), blessed S5 x2 (31,7,2), then base
   292	    // B4 (16,3,1) and B6 (14,5,1), over 40 except the base rows over 20. The capped fold is
   293	    // [48568940000,196036663850,358265154801,1035529241349]/1638400000000, so the result is
   294	    // 1035529241349/1638400000000 = 0.6320368904718018; expected damage is
   295	    // 12.65+5.325+3.375+1.325+1.875=24.55. Pre-LAND-01: 0.5791028347540284.
   296	    expect(probability('bless-scout-scout-priest')).toBeCloseTo(deathSaveKillProbability([
   297	      ...repeated(BLESSED_FAILURE_WEIGHTS.priest, 2),
   298	      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
   299	      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
   300	      BASE_FAILURE_WEIGHTS.firstBandit,
   301	      BASE_FAILURE_WEIGHTS.secondBandit,
   302	    ]), 12);
   303	
   304	    // bless-scout-scout-bandit resolves P1 at (13,4) none/false, S3 at (18,4) half/false, and B4 at
   305	    // (17,4) half/false. The ordered weights are base P1 x2 (12,7,1), blessed S3 x2 (25,13,2),
   306	    // blessed S5 x2 (31,7,2), blessed B4 (27,11,2), and base B6 (14,5,1). The capped counts are
   307	    // [32693220000,111903328800,184737988338,489865462862]/819200000000, giving
   308	    // 244932731431/409600000000 = 0.5979803013452148. Damage is
   309	    // 9.9+5.325+3.375+2.0125+1.875=22.4875. Pre-LAND-01: 0.5456702909643554.
   310	    expect(probability('bless-scout-scout-bandit')).toBeCloseTo(deathSaveKillProbability([
   311	      ...repeated(BASE_FAILURE_WEIGHTS.priest, 2),
   312	      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
   313	      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
   314	      BLESSED_FAILURE_WEIGHTS.firstBandit,
   315	      BASE_FAILURE_WEIGHTS.secondBandit,
   316	    ]), 12);
   317	
   318	    // no-priest-attacks still moves S3 to (18,4) half/false and B4 to (17,4) half/false. Their cover,
   319	    // base splits, and damage stay unchanged. S3 x2 (15,4,1), S5 x2 (18,1,1), B4 (16,3,1), and
   320	    // B6 (14,5,1) fold to [16329600,19417320,15183036,13070044]/64000000, hence
   321	    // 3267511/16000000 = 0.2042194375; damage is 3.7+1.75+1.325+1.875=8.65.
   322	    // Pre-LAND-01 was also 0.2042194375.
   323	    expect(probability('no-priest-attacks')).toBeCloseTo(deathSaveKillProbability([
   324	      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
   325	      ...repeated(BASE_FAILURE_WEIGHTS.secondScout, 2),
   326	      BASE_FAILURE_WEIGHTS.firstBandit,
   327	      BASE_FAILURE_WEIGHTS.secondBandit,
   328	    ]), 12);
   329	
   330	    // bless-only-priest-no-attacks uses S3 at (18,4) half/false and B4 at (17,4) half/false with the
   331	    // d4 rows derived above: blessed S3 x2 (25,13,2), blessed S5 x2 (31,7,2), blessed B4
   332	    // (27,11,2), then base B6 (14,5,1). The capped fold is
   333	    // [227036250,512230825,570205302,738527623]/2048000000, so the result is
   334	    // 738527623/2048000000 = 0.36060919091796875; damage is 5.325+3.375+2.0125+1.875=12.5875.
   335	    // Pre-LAND-01 evaluator order was the same 0.3606091909179688.
   336	    expect(probability('bless-only-priest-no-attacks')).toBeCloseTo(deathSaveKillProbability([
   337	      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
   338	      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
   339	      BLESSED_FAILURE_WEIGHTS.firstBandit,
   340	      BASE_FAILURE_WEIGHTS.secondBandit,
   341	    ]), 12);
   342	
   343	    const delayedOrder = [SCOUTS[0], PRIEST, SCOUTS[1], ...BANDITS] as const;
   344	    const delayedBlessOption = priestBless;
   345	    const firstScoutOption = scoutOptions[0];
   346	    const secondScoutOption = scoutOptions[1];
   347	    const firstBanditOption = banditOptions[0];
   348	    const secondBanditOption = banditOptions[1];
   349	    if (
   350	      firstScoutOption === undefined || secondScoutOption === undefined ||
   351	      firstBanditOption === undefined || secondBanditOption === undefined
   352	    ) throw new Error('Frozen R02 attack option cardinality changed.');
   353	    const delayed = OFFER_ENVIRONMENT.queries.compareAllocations(state, FIGHTER, [{
   354	      allocationId: 'bless-after-first-scout',
   355	      choices: [firstScoutOption, delayedBlessOption, secondScoutOption, firstBanditOption, secondBanditOption]
   356	        .map((option) => ({ actorId: option.actorId, optionId: option.optionId })),
   357	      modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: scoutScoutPriest }],
   358	    }], delayedOrder, OFFER_ENVIRONMENT).allocations[0];
   359	    if (delayed?.killProbability === null || delayed?.killProbability === undefined) {
   360	      throw new Error('Delayed-Bless allocation is unresolved.');
   361	    }
   362	    // Delayed Bless uses S3 at (18,4) half/false before the grant, then P1 at (13,4) none/false and
   363	    // S5 after it; B4 resolves at (17,4) half/false without Bless. Ordered weights are base S3 x2
   364	    // (15,4,1), blessed P1 x2 (19,19,2), blessed S5 x2 (31,7,2), base B4 (16,3,1), and base
   365	    // B6 (14,5,1). Counts [17484818400,61714224330,98480910029,231920047241]/409600000000 give
   366	    // 231920047241/409600000000 = 0.56621105283447265625. Damage is
   367	    // 3.7+12.65+3.375+1.325+1.875=22.925. Pre-LAND-01: 0.5126504372290038.
   368	    expect(delayed.killProbability).toBeCloseTo(deathSaveKillProbability([
   369	      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
   370	      ...repeated(BLESSED_FAILURE_WEIGHTS.priest, 2),
   371	      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
   372	      BASE_FAILURE_WEIGHTS.firstBandit,
   373	      BASE_FAILURE_WEIGHTS.secondBandit,
   374	    ]), 12);
   375	  });
   376	});
1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a  src/vtt/engine-query-port.ts
8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b  src/vtt/room-generator.ts

exec
/bin/bash -lc 'node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc 'node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "nl -ba src/vtt/engine-query-port.ts | sed -n '1135,1185p'; rg -n 'blocksSight|tier === .total.|traceCombatantLine\\(' src/combat/encounter.ts src/vtt/engine-query-port.ts; nl -ba src/combat/encounter.ts | sed -n '7135,7205p'; rg -n 'monsterAttackCommand|actionEconomy' src/combat/monster-commands.ts; sed -n '1,100p' tests/unit/vtt/tactical-evaluator-r02.test.ts; sed -n '775,820p' src/vtt/intel/tactical-evaluator.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 2 in 0ms:
  1135	  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  1136	  const target = state.combatants.find((candidate) => candidate.profile.id === request.targetId);
  1137	  const origin = request.origin ?? state.tokens.find(
  1138	    (token) => token.combatantId === request.actorId,
  1139	  )?.position;
  1140	  const targetPosition = state.tokens.find(
  1141	    (token) => token.combatantId === request.targetId,
  1142	  )?.position;
  1143	  const codes: Exclude<EngineReachResult, { readonly legal: true }>['codes'][number][] = [];
  1144	  if (actor?.profile.kind !== 'monster' || origin === undefined) codes.push('actor_not_placed_monster');
  1145	  if (target === undefined) codes.push('target_absent');
  1146	  else if (actor !== undefined && combatantsAreAllies(state, request.actorId, request.targetId)) {
  1147	    codes.push('target_same_side');
  1148	  }
  1149	  if (targetPosition === undefined) codes.push('target_not_placed');
  1150	  const actions = actor?.profile.kind === 'monster' ? monsterActions(state, request.actorId) : [];
  1151	  const action = actions.find((candidate) => candidate.id === request.actionId);
  1152	  if (action === undefined) codes.push('action_absent');
  1153	  const rangeFeet = action === undefined ? null : engineActionRangeFeet(actions, action);
  1154	  if (action !== undefined && rangeFeet === null) codes.push('action_range_unresolved');
  1155	  if (
  1156	    codes.length > 0 ||
  1157	    action === undefined ||
  1158	    origin === undefined ||
  1159	    targetPosition === undefined ||
  1160	    rangeFeet === null
  1161	  ) {
  1162	    return { legal: false, codes };
  1163	  }
  1164	  const actorSpace = queryCombatantSpaceAt(state, request.actorId, origin);
  1165	  const targetSpace = queryCombatantSpace(state, request.targetId);
  1166	  const distanceFeet = minimumSpaceDistance(actorSpace, targetSpace);
  1167	  if (action.kind === 'attack' || action.kind === 'saving_throw') {
  1168	    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
  1169	      sourceAnchor: origin,
  1170	    });
  1171	    if (trace.blocksSight) {
  1172	      return { legal: false, codes: ['target_outside_line_of_sight'] };
  1173	    }
  1174	    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
  1175	  }
  1176	  if (action.kind === 'attack') {
  1177	    const verdict = tacticalRangeVerdictAtDistance(distanceFeet, monsterAttackRange(action));
  1178	    if (verdict.status === 'unresolved') {
  1179	      return { legal: false, codes: ['action_range_unresolved'] };
  1180	    }
  1181	    if (!verdict.legal || verdict.band === 'out') {
  1182	      return { legal: false, codes: ['target_out_of_range'] };
  1183	    }
  1184	    const projected = projectedAttackRanges(action);
  1185	    return {
src/vtt/engine-query-port.ts:1168:    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
src/vtt/engine-query-port.ts:1171:    if (trace.blocksSight) {
src/vtt/engine-query-port.ts:1174:    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
src/vtt/engine-query-port.ts:1547:    const cover = traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: position }).tier;
src/combat/encounter.ts:2119:  return !traceTerrainLine(state, from, to).blocksSight;
src/combat/encounter.ts:7183:  const attackLine = traceCombatantLine(context.state, command.actor, command.target);
src/combat/encounter.ts:7201:    (attackLine.blocksSight || attackLine.tier === 'total')
src/combat/encounter.ts:7491:    selectedLine.blocksSight || selectedLine.tier === 'total'
src/combat/encounter.ts:8566:  const selectedLine = traceCombatantLine(context.state, command.actor, target);
src/combat/encounter.ts:8568:    selectedLine.blocksSight || selectedLine.tier === 'total'
src/combat/encounter.ts:9054:    selectedLine.blocksSight
src/combat/encounter.ts:10697:          (operation.destination.requireLineOfSight && selectedLine.blocksSight)
  7135	      wasFirstAttack = combatant(context.state, command.actor).turn.action.kind === 'available';
  7136	      beginAttack(context, command);
  7137	      activateRecklessAttack(context, command, wasFirstAttack);
  7138	    }
  7139	  } else {
  7140	    const reactor = combatant(context.state, command.actor);
  7141	    if (
  7142	      reactor.life !== 'living' ||
  7143	      isIncapacitated(combatantConditions(context.state, command.actor))
  7144	    ) {
  7145	      throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot react.`);
  7146	    }
  7147	    if (!canTakeReaction(context.state, command.actor)) {
  7148	      throw new EncounterRuleError('validation', `Combatant ${command.actor} has no Reaction available.`);
  7149	    }
  7150	    if (context.state.effects.some((effect) =>
  7151	      effect.targets.includes(command.actor) && effect.payload.kind === 'opportunity_attacks_disabled')) {
  7152	      throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot make Opportunity Attacks.`);
  7153	    }
  7154	    if (context.state.activeCombatant !== command.target) {
  7155	      throw new EncounterRuleError('validation', 'An Opportunity Attack must target the active mover.');
  7156	    }
  7157	    if (
  7158	      opportunityTrigger === null &&
  7159	      minimumSpaceDistance(
  7160	        combatantSpace(context.state, command.actor),
  7161	        combatantSpace(context.state, command.target),
  7162	      ) > effectiveCombatRules(context.state, reactor.profile.id).reach
  7163	    ) {
  7164	      throw new EncounterRuleError('validation', 'An Opportunity Attack reactor is out of reach.');
  7165	    }
  7166	    context.state = replaceCombatant(context.state, {
  7167	      ...reactor,
  7168	      turn: { ...reactor.turn, reactionAvailable: false },
  7169	    });
  7170	    emit(context, {
  7171	      type: 'resource_spent',
  7172	      combatant: command.actor,
  7173	      resource: 'reaction',
  7174	      purpose: 'Opportunity Attack',
  7175	    });
  7176	  }
  7177	  if (combatant(context.state, command.target).life === 'dead') {
  7178	    throw new EncounterRuleError('validation', 'A dead combatant cannot be attacked.');
  7179	  }
  7180	  if (cannotHarmTarget(context.state, command.actor, command.target)) {
  7181	    throw new EncounterRuleError('validation', 'The Charmed condition prohibits harming this target.');
  7182	  }
  7183	  const attackLine = traceCombatantLine(context.state, command.actor, command.target);
  7184	  if (opportunityTrigger === null && command.tacticalRange !== undefined) {
  7185	    const range = tacticalRangeVerdictAtDistance(
  7186	      minimumSpaceDistance(
  7187	        combatantSpace(context.state, command.actor),
  7188	        combatantSpace(context.state, command.target),
  7189	      ),
  7190	      command.tacticalRange,
  7191	    );
  7192	    if (range.status === 'unresolved') {
  7193	      throw new EncounterRuleError('validation', 'The attack long range is unresolved.');
  7194	    }
  7195	    if (!range.legal) {
  7196	      throw new EncounterRuleError('validation', 'The target is out of attack range.');
  7197	    }
  7198	  }
  7199	  if (
  7200	    opportunityTrigger === null &&
  7201	    (attackLine.blocksSight || attackLine.tier === 'total')
  7202	  ) {
  7203	    throw new EncounterRuleError('validation', 'The target has Total Cover or is outside line of sight.');
  7204	  }
  7205	  breakCalmIndifferenceOnHostileAct(context, command.actor, command.target);
87:export function monsterAttackCommand(
94:export function monsterAttackCommand(
101:export function monsterAttackCommand(
import { describe, expect, it } from 'vitest';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../../../src/combat/encounter';
import { traceCombatantLine } from '../../../src/combat/cover';
import type { MonsterAttackAction } from '../../../src/combat/statblock';
import { combatantId } from '../../../src/combat/values';
import type { TacticalAllocationCandidate } from '../../../src/vtt/engine-query-port';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { declareTestInputs } from '../../helpers/test-inputs';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const inputs = declareTestInputs({
  fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
});

const FIGHTER = combatantId('combatant:fighter');
const SCOUTS = [
  combatantId('combatant:generated-5117009-monster-3'),
  combatantId('combatant:generated-5117009-monster-5'),
] as const;
const PRIEST = combatantId('combatant:generated-5117009-monster-1');
const BANDITS = [
  combatantId('combatant:generated-5117009-monster-4'),
  combatantId('combatant:generated-5117009-monster-6'),
] as const;

interface FailureWeights {
  readonly miss: number;
  readonly normalHit: number;
  readonly criticalHit: number;
  readonly denominator: number;
}

function repeated(weights: FailureWeights, count: number): readonly FailureWeights[] {
  return Array.from({ length: count }, () => weights);
}

/** Independent closed-form convolution over miss/+1/+2 death-save-failure outcomes. */
function deathSaveKillProbability(attacks: readonly FailureWeights[]): number {
  let states: readonly number[] = [1, 0, 0, 0];
  for (const attack of attacks) {
    const next = [0, 0, 0, 0];
    for (let failures = 0; failures <= 3; failures += 1) {
      const stateProbability = states[failures] ?? 0;
      next[failures] = (next[failures] ?? 0) + stateProbability * attack.miss / attack.denominator;
      const normalTotal = Math.min(3, failures + 1);
      next[normalTotal] = (next[normalTotal] ?? 0) + stateProbability * attack.normalHit / attack.denominator;
      const criticalTotal = Math.min(3, failures + 2);
      next[criticalTotal] = (next[criticalTotal] ?? 0) + stateProbability * attack.criticalHit / attack.denominator;
    }
    states = [next[0] ?? 0, next[1] ?? 0, next[2] ?? 0, next[3] ?? 0];
  }
  return states[3] ?? 0;
}

const BASE_FAILURE_WEIGHTS = {
  priest: { miss: 12, normalHit: 7, criticalHit: 1, denominator: 20 },
  firstScout: { miss: 15, normalHit: 4, criticalHit: 1, denominator: 20 },
  secondScout: { miss: 18, normalHit: 1, criticalHit: 1, denominator: 20 },
  firstBandit: { miss: 16, normalHit: 3, criticalHit: 1, denominator: 20 },
  secondBandit: { miss: 14, normalHit: 5, criticalHit: 1, denominator: 20 },
} as const satisfies Readonly<Record<string, FailureWeights>>;

const BLESSED_FAILURE_WEIGHTS = {
  priest: { miss: 19, normalHit: 19, criticalHit: 2, denominator: 40 },
  firstScout: { miss: 25, normalHit: 13, criticalHit: 2, denominator: 40 },
  secondScout: { miss: 31, normalHit: 7, criticalHit: 2, denominator: 40 },
  firstBandit: { miss: 27, normalHit: 11, criticalHit: 2, denominator: 40 },
} as const satisfies Readonly<Record<string, FailureWeights>>;

async function frozenState(): Promise<EncounterState> {
  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
}

function reauthoredClearScoutShot(state: EncounterState): EncounterState {
  return {
    ...state,
    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
      ? { column: 9, row: 2 }
      : cell),
  };
}

describe('R02-like canonical tactical query', () => {
  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
    const state = reauthoredClearScoutShot(await frozenState());
    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
    const handGeometry = [
      {
        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
sed: can't read src/vtt/intel/tactical-evaluator.ts: No such file or directory

 succeeded in 14155ms:
 succeeded in 27944ms:
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/engine-query-port.test.ts\",\"tests/unit/vtt/room-generator-los-cover.test.ts\",\"tests/unit/vtt/tactical-evaluator-r02.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "rg -n \"tier === 'total'|tier "'!== '"'total'|blocksSight\" src/vtt/intent-resolver.ts src/vtt/offers src/combat/monster-commands.ts; sed -n '87,155p' src/combat/monster-commands.ts; rg --files src | rg tactical-evaluator; nl -ba src/vtt/engine-query-port.ts | sed -n '1220,1245p;1535,1560p;1818,1842p'; rg -n 'sourceAnchor|excluded' src/combat/cover.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
src/vtt/intent-resolver.ts:281:        ).blocksSight)) return false;
export function monsterAttackCommand(
  action: MonsterAttackAction,
  actor: CombatantId,
  target: CombatantId,
  rollMode?: RollMode,
  opportunity?: false,
): Extract<EncounterCommand, { readonly type: 'attack' }>;
export function monsterAttackCommand(
  action: MonsterAttackAction,
  actor: CombatantId,
  target: CombatantId,
  rollMode: RollMode,
  opportunity: true,
): Extract<EncounterCommand, { readonly type: 'opportunity_attack' }>;
export function monsterAttackCommand(
  action: MonsterAttackAction,
  actor: CombatantId,
  target: CombatantId,
  rollMode: RollMode = 'normal',
  opportunity = false,
): Extract<EncounterCommand, { readonly type: 'attack' | 'opportunity_attack' }> {
  return {
    type: opportunity ? 'opportunity_attack' : 'attack',
    actor,
    target,
    attackBonus: action.attackBonus,
    criticalFloor: 20,
    rollMode,
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    tacticalRange: monsterAttackRange(action),
    damage: monsterActionDamage(action.damage),
    attackId: action.id,
    monsterOnHit: executableMonsterOnHitEffects(action.onHit),
  };
}

export function monsterSavingThrowCommand(
  action: MonsterSavingThrowAction,
  actor: CombatantId,
  target: CombatantId,
  cost: 'action' | 'bonus_action' | 'none' = 'action',
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return {
    type: 'force_save',
    actor,
    target,
    ability: action.savingThrow.ability,
    dc: action.savingThrow.dc,
    rollMode: 'normal',
    damage: monsterActionDamage(action.failure.damage),
    onSuccess: action.success.kind === 'half_damage' ? 'half' : 'none',
    cost,
    monsterActionId: action.id,
    monsterFailureEffects: executableMonsterOnHitEffects(action.failure.effects),
  };
}
src/combat/tactical-evaluator.ts
  1220	    (candidate): candidate is MonsterAttackAction =>
  1221	      candidate.kind === 'attack' && candidate.id === actionId,
  1222	  );
  1223	  if (
  1224	    actor === null || target === null || actorPosition === undefined ||
  1225	    targetPosition === undefined || action === undefined
  1226	  ) return null;
  1227	  const selectedLine = minimumSpaceLine(queryCombatantSpace(state, actorId), queryCombatantSpace(state, targetId));
  1228	  const detection = detectCombatant(state, actorId, targetId);
  1229	  const reciprocal = detectCombatant(state, targetId, actorId);
  1230	  const visible = {
  1231	    visible: detection.kind === 'seen',
  1232	    reciprocal: reciprocal.kind === 'seen',
  1233	  };
  1234	  const cover = coverBetweenCombatants(state, actorId, targetId).tier;
  1235	  const coverBonus = cover === 'half' ? 2 : cover === 'three_quarters' ? 5 : 0;
  1236	  const madeRollDefense = state.effects.filter((effect): effect is PlanningRollDefenseEffect =>
  1237	    isPlanningRollDefenseEffect(effect) &&
  1238	    effect.payload.scopes.includes('attack_rolls_made') &&
  1239	    planningRollDefenseApplies(state, effect, actorId, targetId));
  1240	  const flatAttackBonus = madeRollDefense.reduce((sum, effect) =>
  1241	    effect.payload.modifier.kind === 'flat'
  1242	      ? sum + effect.payload.modifier.amount
  1243	      : sum, 0);
  1244	  const attackRollModifiers: TacticalAttackRollModifier[] = [
  1245	    ...madeRollDefense.flatMap((effect) => effect.payload.modifier.kind === 'die_rider'
  1535	  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  1536	  const target = projection.targets.find((candidate): candidate is PerceivedTargetKnowledge =>
  1537	    candidate.targetId === request.targetId && candidate.kind === 'perceived');
  1538	  if (actor === null || start === undefined || target === undefined) return null;
  1539	
  1540	  const restrictedState = projectedMovementState(state, projection);
  1541	  const world = encounterMovementWorld(restrictedState);
  1542	  const targetConditions = projectedTargetConditions(target);
  1543	  const attackAt: MovementEvaluationInput['attackAt'] = (position) => {
  1544	    if (target.reciprocalVisibility.kind === 'unknown') {
  1545	      return { status: 'unresolved', reason: 'visibility_unresolved' };
  1546	    }
  1547	    const cover = traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: position }).tier;
  1548	    const selectedLine = minimumSpaceLine(
  1549	      queryCombatantSpaceAt(state, request.actorId, position),
  1550	      decodeProjectedCreatureSpace(target),
  1551	    );
  1552	    return {
  1553	      status: 'resolved',
  1554	      input: {
  1555	        attackerId: request.actorId,
  1556	        targetId: request.targetId,
  1557	        attackerPosition: selectedLine.sourceCell,
  1558	        targetPosition: selectedLine.targetCell,
  1559	        range: request.attack.range,
  1560	        attackBonus: request.attack.attackBonus,
  1818	  tacticalAttack(state, actorId, targetId, actionId) {
  1819	    const input = engineTacticalAttackInput(state, actorId, targetId, actionId);
  1820	    return input === null ? null : evaluateTacticalAttack(input);
  1821	  },
  1822	  movementOptions,
  1823	  projectedMovementOptions,
  1824	  compareAllocations: compareTacticalAllocations,
  1825	  cover(state, actorId, targetId) {
  1826	    const from = state.tokens.find((token) => token.combatantId === actorId)?.position;
  1827	    const to = state.tokens.find((token) => token.combatantId === targetId)?.position;
  1828	    if (from === undefined || to === undefined) return null;
  1829	    return {
  1830	      ...coverBetweenCombatants(state, actorId, targetId),
  1831	    };
  1832	  },
  1833	  visibility(state, actorId, targetId) {
  1834	    if (
  1835	      !state.combatants.some((candidate) => candidate.profile.id === actorId) ||
  1836	      !state.combatants.some((candidate) => candidate.profile.id === targetId) ||
  1837	      !state.tokens.some((token) => token.combatantId === actorId) ||
  1838	      !state.tokens.some((token) => token.combatantId === targetId)
  1839	    ) return null;
  1840	    const detection = detectCombatant(state, actorId, targetId);
  1841	    const reciprocal = detectCombatant(state, targetId, actorId);
  1842	    return {
566:  readonly sourceAnchor?: GridCell;
579:  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
581:    : cellKey(options.sourceAnchor)}#sight:${blockerSignature}`;
584:  const source = options.sourceAnchor === undefined
586:    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
611:  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);
615:  const source = options.sourceAnchor === undefined
617:    : combatantSpaceAt(state, sourceId, options.sourceAnchor);

codex
The query now checks the same sight-blocking result as execution, using the proposed origin. I’m checking whether the 214-offer property covers every resolved attack/save component and whether the generator change leaves the frozen rooms unchanged.

exec
/bin/bash -lc "sed -n '560,605p' src/combat/cover.ts; sed -n '7450,7505p' src/combat/encounter.ts; sed -n '8540,8578p' src/combat/encounter.ts; sed -n '260,285p' src/vtt/intent-resolver.ts; rg -n 'queries.reach|finalPosition|multiattackComponent|monsterAttackCommand' src/vtt/intent-resolver.ts src/vtt/turn-proposal-executor.ts; rg -n 'dispel_evil_and_good_mode' src/vtt/intent-resolver.ts src/vtt/turn-proposal.ts src/vtt/engine-query-port.ts; sed -n '780,818p' src/combat/tactical-evaluator.ts; rg -n 'generateRoom\\(|difficultyProfile|seed' tests/unit/vtt/arena-basis-brutal-b.test.ts | head -25; sed -n '1,32p' tests/fixtures/arena-basis-brutal-b/seed-6206001.json" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
    ? 'current'
    : cellKey(options.sourceAnchor)}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {
    sourceId,
    targetId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
    attack,
    damage: damageResult,
  });
}

function processSuspectedSquareAttack(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'attack_suspected_square' }>,
): void {
  const actor = combatant(context.state, command.actor);
  if (actor.profile.kind !== 'monster') {
    throw new EncounterRuleError('validation', 'Only a monster-side controller can attack a suspected square.');
  }
  const memory = encounterSearchMemories(context.state).find((entry) =>
    entry.observer === command.actor && entry.target === command.suspectedTarget);
  if (memory === undefined) {
    throw new EncounterRuleError('validation', 'A suspected-square attack requires active search memory.');
  }
  if (canCombatantSee(context.state, command.actor, command.suspectedTarget)) {
    throw new EncounterRuleError('validation', 'A visible target must be attacked directly, not through search memory.');
  }
  if (!isCellInside(context.state.bounds, command.square)) {
    throw new EncounterRuleError('validation', 'A suspected square must be inside the encounter grid.');
  }
  if (!memory.suspicion.cells.some((cell) => cellKey(cell) === cellKey(command.square))) {
    throw new EncounterRuleError('validation', 'The selected square is outside the active suspicion region.');
  }
  const selectedLine = traceCombatantLineToCells(context.state, command.actor, [command.square]);
  if (command.tacticalRange !== undefined) {
    const range = tacticalRangeVerdictAtDistance(
      minimumSpaceDistanceToCells(combatantSpace(context.state, command.actor), [command.square]),
      command.tacticalRange,
    );
    if (range.status === 'unresolved') {
      throw new EncounterRuleError('validation', 'The suspected-square attack long range is unresolved.');
    }
    if (!range.legal) {
      throw new EncounterRuleError('validation', 'The suspected square is out of attack range.');
    }
  }
  if (
    selectedLine.blocksSight || selectedLine.tier === 'total'
  ) {
    throw new EncounterRuleError('validation', 'The suspected square has Total Cover or is outside line of sight.');
  }
  const ordinaryAttack: Extract<EncounterCommand, { readonly type: 'attack' }> = {
    type: 'attack',
    actor: command.actor,
    target: command.suspectedTarget,
    attackBonus: command.attackBonus,
    criticalFloor: command.criticalFloor,
    rollMode: 'normal',
    attackerCanSeeTarget: false,
    targetCanSeeAttacker: true,
    ...(command.tacticalRange === undefined ? {} : { tacticalRange: command.tacticalRange }),
    damage: command.damage,
        spacesIntersect(candidateSpace, combatantSpace(context.state, entry.combatantId)))) break;
    const sourceSpace = combatantSpace(context.state, target);
    position = candidate;
    context.state = {
      ...context.state,
      tokens: context.state.tokens.map((entry) =>
        entry.combatantId === target ? { ...entry, position: { ...position } } : entry),
    };
    traversed.push({ ...position });
    processEnteredCells(
      context,
      target,
      newlyEnteredSpaceCells(sourceSpace, combatantSpace(context.state, target)),
    );
    if (combatant(context.state, target).life !== 'living') break;
  }
  const movement = combatant(context.state, target).turn.movement;
  emit(context, { type: 'movement_completed', combatant: target, path: traversed, spent: feet(0), remaining: movement.remaining });
  void source;
}

function rollSpellAttack(
  context: ReductionContext,
  command: SpellCastCommand,
  target: CombatantId,
): ReturnType<typeof resolveAttackRoll> {
  const selectedLine = traceCombatantLine(context.state, command.actor, target);
  if (
    selectedLine.blocksSight || selectedLine.tier === 'total'
  ) throw new EncounterRuleError('validation', 'The spell target has Total Cover or is outside line of sight.');
  const rollModeEffects = context.state.effects.filter((effect) => {
    if (effect.payload.kind === 'faerie_fire') return effect.targets.includes(target);
    if (effect.payload.kind === 'attacks_against_target_roll_mode') {
      return effect.targets.includes(target) &&
        !canCombatantPierceVisualIllusion(context.state, command.actor, target);
    }
    if (effect.payload.kind !== 'attack_roll_mode_modifier') return false;
    const appliesTo = effect.payload.appliesTo;
    return ((appliesTo.kind === 'next_attack_against_target' ||
  return constraints;
}

function positionFits(
  state: EncounterState,
  actorId: CombatantId,
  position: GridCell,
  constraints: readonly {
    readonly targetId: CombatantId;
    readonly rangeFeet: number;
    readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
  }[],
  movement: EngineMovementObjective,
  queries: EngineQueryPort,
): boolean {
  for (const constraint of constraints) {
    if (constraint.source.kind === 'spell') {
      const distance = queries.spaceDistance(state, actorId, constraint.targetId, position);
      if (distance === null || distance > constraint.rangeFeet ||
        (constraint.source.requiresSight && traceCombatantLine(
          state, actorId, constraint.targetId, { sourceAnchor: position },
        ).blocksSight)) return false;
      continue;
    }
    const reach = queries.reach(state, {
      actorId,
rg: src/vtt/turn-proposal-executor.ts: No such file or directory (os error 2)
src/vtt/intent-resolver.ts:284:    const reach = queries.reach(state, {
src/vtt/intent-resolver.ts:305:  readonly finalPosition: GridCell;
src/vtt/intent-resolver.ts:323:    return { costFeet: 0, path: [], finalPosition: origin };
src/vtt/intent-resolver.ts:345:      finalPosition: approach.cells.at(-1) ?? origin,
src/vtt/intent-resolver.ts:348:  const candidateCells: { readonly lowerBoundFeet: number; readonly finalPosition: GridCell }[] = [];
src/vtt/intent-resolver.ts:351:      const finalPosition = { column, row };
src/vtt/intent-resolver.ts:352:      if (!positionFits(state, actorId, finalPosition, constraints, movement, queries)) continue;
src/vtt/intent-resolver.ts:353:      const lowerBoundFeet = gridDistance(origin, finalPosition);
src/vtt/intent-resolver.ts:354:      if (lowerBoundFeet <= maximumFeet) candidateCells.push({ lowerBoundFeet, finalPosition });
src/vtt/intent-resolver.ts:358:    left.finalPosition.row - right.finalPosition.row || left.finalPosition.column - right.finalPosition.column);
src/vtt/intent-resolver.ts:359:  let best: { readonly costFeet: number; readonly path: readonly GridCell[]; readonly finalPosition: GridCell } | null = null;
src/vtt/intent-resolver.ts:364:      destination: candidate.finalPosition,
src/vtt/intent-resolver.ts:369:    const resolved = { costFeet: result.costFeet, path: result.cells, finalPosition: candidate.finalPosition };
src/vtt/intent-resolver.ts:371:      resolved.costFeet === best.costFeet && (resolved.finalPosition.row < best.finalPosition.row ||
src/vtt/intent-resolver.ts:372:        resolved.finalPosition.row === best.finalPosition.row && resolved.finalPosition.column < best.finalPosition.column)) {
src/vtt/intent-resolver.ts:494:            multiattackComponent: true,
src/vtt/intent-resolver.ts:571:      finalPosition: movement.finalPosition,
src/vtt/intent-resolver.ts:590:    case 'dispel_evil_and_good_mode':
src/vtt/intent-resolver.ts:591:      return choice.kind === 'dispel_evil_and_good_mode' && slot.values.some((value) => value === choice.value);
src/vtt/intent-resolver.ts:613:      : choice.kind === 'dispel_evil_and_good_mode'
src/vtt/turn-proposal.ts:93:  | { readonly kind: 'dispel_evil_and_good_mode'; readonly values: typeof DISPEL_EVIL_AND_GOOD_MODES }
src/vtt/turn-proposal.ts:103:  | { readonly kind: 'dispel_evil_and_good_mode'; readonly value: DispelEvilAndGoodMode }
    }
    distribution = next;
  }
  return distribution;
}

function foldDeathSaveFailures(
  existingFailures: 0 | 1 | 2,
  attacks: readonly TacticalAttackEvaluation[],
): { readonly killProbability: number; readonly expectedFailures: number } {
  let states = new Map<number, number>([[existingFailures, 1]]);
  for (const attack of attacks) {
    if (attack.probabilities.status !== 'resolved') continue;
    const probabilities = attack.probabilities;
    const next = new Map<number, number>();
    for (const [failures, stateProbability] of states) {
      const outcomes = [
        { added: 0, probability: probabilities.miss },
        { added: 1, probability: probabilities.hit - probabilities.critical },
        { added: 2, probability: probabilities.critical },
      ] as const;
      for (const outcome of outcomes) {
        const total = Math.min(3, failures + outcome.added);
        next.set(total, (next.get(total) ?? 0) + stateProbability * outcome.probability);
      }
    }
    states = next;
  }
  return {
    killProbability: states.get(3) ?? 0,
    expectedFailures: [...states].reduce(
      (sum, [failures, probability]) => sum + failures * probability,
      0,
    ),
  };
}

function foldLivingDamage(
  hitPoints: number,
45:  'tests/fixtures/arena-basis-brutal-b/seed-6206001.json',
46:  'tests/fixtures/arena-basis-brutal-b/seed-6206002.json',
47:  'tests/fixtures/arena-basis-brutal-b/seed-6206003.json',
48:  'tests/fixtures/arena-basis-brutal-b/seed-6206004.json',
49:  'tests/fixtures/arena-basis-brutal-b/seed-6206005.json',
50:  'tests/fixtures/arena-basis-brutal-b/seed-6206006.json',
51:  'tests/fixtures/arena-basis-brutal-b/seed-6206007.json',
52:  'tests/fixtures/arena-basis-brutal-b/seed-6206008.json',
53:  'tests/fixtures/arena-basis-brutal-b/seed-6206009.json',
54:  'tests/fixtures/arena-basis-brutal-b/seed-6206010.json',
58:  'tests/fixtures/arena-basis-hard/seed-5117001.json',
59:  'tests/fixtures/arena-basis-hard/seed-5117002.json',
60:  'tests/fixtures/arena-basis-hard/seed-5117003.json',
61:  'tests/fixtures/arena-basis-hard/seed-5117004.json',
62:  'tests/fixtures/arena-basis-hard/seed-5117005.json',
63:  'tests/fixtures/arena-basis-hard/seed-5117006.json',
64:  'tests/fixtures/arena-basis-hard/seed-5117007.json',
65:  'tests/fixtures/arena-basis-hard/seed-5117008.json',
66:  'tests/fixtures/arena-basis-hard/seed-5117009.json',
67:  'tests/fixtures/arena-basis-hard/seed-5117010.json',
68:  'tests/fixtures/arena-basis-hard/seed-5117011.json',
69:  'tests/fixtures/arena-basis-hard/seed-5117012.json',
70:  'tests/fixtures/arena-basis-hard/seed-5117013.json',
74:  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
75:  'tests/fixtures/arena-basis-brutal/seed-6203002.json',
{"encounter":{"provenance":{"licenseTag":"MIT","seed":6206001,"source":"generated"},"schemaVersion":1,"state":{"activeCombatant":null,"activeInitiativeIndex":null,"adjudicationPending":[],"blockedCells":[{"column":11,"row":0},{"column":11,"row":1},{"column":11,"row":2},{"column":11,"row":3},{"column":11,"row":4},{"column":11,"row":5},{"column":11,"row":6},{"column":11,"row":7},{"column":11,"row":8},{"column":11,"row":9},{"column":11,"row":10},{"column":11,"row":11},{"column":11,"row":12},{"column":11,"row":13},{"column":11,"row":15},{"column":11,"row":16},{"column":11,"row":17},{"column":11,"row":18},{"column":11,"row":19},{"column":11,"row":20},{"column":11,"row":21}],"bounds":{"columns":22,"rows":22},"combatants":[{"deathAt":null,"deathSaves":null,"hitPoints":67,"life":"living","profile":{"characterId":1,"id":"combatant:fighter","kind":"player_character","name":"Reference Fighter","rules":{"armorClass":18,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":67,"initiativeBonus":100,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"sizeCategory":"Medium","speed":30,"spellSlots":[],"usesDeathSaves":true},"tokenId":"token:fighter","wildShape":null},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":39,"life":"living","profile":{"characterId":2,"id":"combatant:cleric","kind":"player_character","name":"Reference Cleric","rules":{"armorClass":18,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":52,"initiativeBonus":70,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"sizeCategory":"Medium","speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:cleric","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":0},{"level":2,"maximum":3,"remaining":1},{"level":3,"maximum":3,"remaining":3},{"level":4,"maximum":1,"remaining":1}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":38,"life":"living","profile":{"characterId":3,"id":"combatant:wizard","kind":"player_character","name":"Reference Wizard","rules":{"armorClass":15,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":40,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"sizeCategory":"Medium","speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:wizard","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":3},{"level":2,"maximum":3,"remaining":3},{"level":3,"maximum":3,"remaining":1},{"level":4,"maximum":1,"remaining":1}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":97,"legendary":{"actionUsesMaximum":3,"actionUsesRemaining":3,"resistanceUsesMaximum":3,"resistanceUsesRemaining":3},"life":"living","limitedResources":[{"id":"monster-spell:spellcasting:calm-emotions","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:dispel-evil-and-good","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:entangle","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:pass-without-trace","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:word-of-recall","maximum":1,"recharge":"long_rest","remaining":1}],"profile":{"id":"combatant:generated-6206001-monster-1","kind":"monster","name":"Unicorn","rules":{"abilityScores":{"charisma":16,"constitution":15,"dexterity":14,"intelligence":11,"strength":18,"wisdom":17},"armorClass":12,"attacksPerAction":2,"conditionImmunities":["Charmed","Paralyzed","Poisoned"],"contactMedium":"surface","creatureType":"Celestial","damageResponses":[{"response":"immune","type":"Poison"}],"detectionTraits":[],"hitPointMaximum":97,"initiativeBonus":8,"legendary":{"actionUsesMaximum":3,"actions":[{"attackId":"radiant-horn","avoidsOpportunityAttacks":true,"cost":1,"id":"charging-horn","kind":"move_and_attack","movement":"half_speed","name":"Charging Horn"},{"armorClassBonus":2,"cost":1,"expiresAt":"end_of_monster_next_turn","id":"shimmering-shield","kind":"temporary_defense","name":"Shimmering Shield","rangeFeet":60,"target":"self_or_visible_creature","temporaryHitPoints":{"count":3,"modifier":0,"sides":6},"temporaryHitPointsAverage":10}],"resistanceUsesMaximum":3},"limitedResources":[{"id":"monster-spell:spellcasting:calm-emotions","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:dispel-evil-and-good","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:entangle","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:pass-without-trace","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:word-of-recall","maximum":1,"recharge":"long_rest"}],"magicResistance":true,"passivePerception":13,"proficiencyBonus":3,"reach":5,"savingThrowBonuses":{"charisma":3,"constitution":2,"dexterity":2,"intelligence":0,"strength":4,"wisdom":3},"senses":[{"kind":"normal_sight"},{"kind":"darkvision","rangeFeet":60}],"sizeCategory":"Large","speed":50,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:unicorn","tokenId":"token:generated-6206001-monster-1"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":45,"life":"living","profile":{"id":"combatant:generated-6206001-monster-2","kind":"monster","name":"Minotaur Skeleton","rules":{"abilityScores":{"charisma":5,"constitution":15,"dexterity":11,"intelligence":6,"strength":18,"wisdom":8},"armorClass":12,"attacksPerAction":1,"conditionImmunities":["Exhaustion","Poisoned"],"contactMedium":"surface","creatureType":"Undead","damageResponses":[{"response":"vulnerable","type":"Bludgeoning"},{"response":"immune","type":"Poison"}],"detectionTraits":[],"hitPointMaximum":45,"initiativeBonus":0,"passivePerception":9,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":-3,"constitution":2,"dexterity":0,"intelligence":-2,"strength":4,"wisdom":-1},"senses":[{"kind":"normal_sight"},{"kind":"darkvision","rangeFeet":60}],"sizeCategory":"Large","speed":40,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:minotaur-skeleton","tokenId":"token:generated-6206001-monster-2"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":38,"life":"living","profile":{"id":"combatant:generated-6206001-monster-3","kind":"monster","name":"Ironweb Weaver","rules":{"abilityScores":{"charisma":6,"constitution":15,"dexterity":15,"intelligence":3,"strength":18,"wisdom":12},"armorClass":14,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Beast","damageResponses":[],"detectionTraits":["web_sense"],"hitPointMaximum":38,"initiativeBonus":2,"passivePerception":11,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":-2,"constitution":2,"dexterity":2,"intelligence":-4,"strength":4,"wisdom":1},"senses":[{"kind":"normal_sight"}],"sizeCategory":"Large","speed":36,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:homebrew-beast/ironweb-weaver","tokenId":"token:generated-6206001-monster-3"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":19,"life":"living","profile":{"id":"combatant:generated-6206001-monster-4","kind":"monster","name":"Crested Charger","rules":{"abilityScores":{"charisma":6,"constitution":13,"dexterity":13,"intelligence":3,"strength":14,"wisdom":12},"armorClass":12,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Beast","damageResponses":[],"detectionTraits":[],"hitPointMaximum":19,"initiativeBonus":1,"passivePerception":11,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":-2,"constitution":1,"dexterity":1,"intelligence":-4,"strength":2,"wisdom":1},"senses":[{"kind":"normal_sight"}],"sizeCategory":"Medium","speed":32,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:homebrew-beast/crested-charger","tokenId":"token:generated-6206001-monster-4"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null}],"config":{"initiativeMode":"shared_enemy"},"dmNotes":["Deterministic generated room seed 6206001."],"effects":[],"environment":{"difficultTerrainRegions":[{"cells":[{"column":9,"row":13},{"column":9,"row":14},{"column":9,"row":15},{"column":10,"row":13},{"column":10,"row":14},{"column":10,"row":15},{"column":12,"row":13},{"column":12,"row":14},{"column":12,"row":15},{"column":13,"row":13},{"column":13,"row":14},{"column":13,"row":15}],"id":"difficult:generated-6206001-approach"},{"cells":[{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":4,"row":7},{"column":5,"row":7},{"column":6,"row":7},{"column":7,"row":7}],"id":"difficult:generated-6206001-brutal-1"},{"cells":[{"column":12,"row":9},{"column":13,"row":9},{"column":14,"row":9},{"column":15,"row":9},{"column":12,"row":10},{"column":13,"row":10},{"column":14,"row":10},{"column":15,"row":10},{"column":12,"row":11},{"column":13,"row":11},{"column":14,"row":11},{"column":15,"row":11},{"column":12,"row":12},{"column":13,"row":12},{"column":14,"row":12},{"column":15,"row":12}],"id":"difficult:generated-6206001-brutal-2"},{"cells":[{"column":4,"row":17},{"column":5,"row":17},{"column":6,"row":17},{"column":7,"row":17},{"column":4,"row":18},{"column":5,"row":18},{"column":6,"row":18},{"column":7,"row":18},{"column":4,"row":19},{"column":5,"row":19},{"column":6,"row":19},{"column":7,"row":19},{"column":4,"row":20},{"column":5,"row":20},{"column":6,"row":20},{"column":7,"row":20}],"id":"difficult:generated-6206001-brutal-3"}],"lightRegions":[{"cells":[{"column":15,"row":16},{"column":17,"row":16},{"column":18,"row":16},{"column":15,"row":17},{"column":16,"row":17},{"column":17,"row":17},{"column":18,"row":17},{"column":15,"row":18},{"column":16,"row":18},{"column":17,"row":18},{"column":18,"row":18},{"column":15,"row":19},{"column":16,"row":19},{"column":17,"row":19},{"column":18,"row":19}],"id":"light:world-object:generated-6206001-5","level":"dim"},{"cells":[{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":4,"row":7},{"column":5,"row":7},{"column":6,"row":7},{"column":7,"row":7}],"id":"light:world-object:generated-6206001-6","level":"dim"},{"cells":[{"column":14,"row":14},{"column":15,"row":14},{"column":14,"row":15},{"column":15,"row":15}],"id":"light:world-object:generated-6206001-7","level":"bright"}],"movementRegions":[],"narrowOpeningRegions":[],"obscurementRegions":[{"cells":[{"column":3,"row":18},{"column":4,"row":18},{"column":3,"row":19},{"column":4,"row":19},{"column":3,"row":20},{"column":4,"row":20}],"id":"obscurement:generated-6206001-1","obscurement":"light"},{"cells":[{"column":15,"row":17},{"column":16,"row":17},{"column":15,"row":18},{"column":16,"row":18},{"column":15,"row":19},{"column":16,"row":19},{"column":15,"row":20},{"column":16,"row":20}],"id":"obscurement:generated-6206001-2","obscurement":"light"},{"cells":[{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":6,"row":2},{"column":7,"row":2},{"column":8,"row":2},{"column":9,"row":2},{"column":6,"row":3},{"column":7,"row":3},{"column":8,"row":3},{"column":9,"row":3}],"id":"obscurement:generated-6206001-3","obscurement":"heavy"}]},"eventLog":[],"foggedCells":[],"hiddenCombatants":[],"hiddenRolls":[],"initiative":[],"nextDecisionSequence":1,"nextEffectSequence":1,"nextEventSequence":1,"nextPersistentAreaSequence":1,"nextWorldObjectSequence":1,"observationHistory":[],"pendingDecisions":[],"persistentAreas":[],"phase":{"kind":"active"},"reactionPolicies":[],"revision":0,"round":0,"rulesEdition":"2024","sharedSpaceRelations":[],"tokens":[{"combatantId":"combatant:fighter","id":"token:fighter","placementMode":{"actual":"Medium","kind":"normal"},"position":{"column":1,"row":2}},{"combatantId":"combatant:cleric","id":"token:cleric","placementMode":{"actual":"Medium","kind":"normal"},"position":{"column":2,"row":4}},{"combatantId":"combatant:wizard","id":"token:wizard","placementMode":{"actual":"Medium","kind":"normal"},"position":{"column":1,"row":6}},{"combatantId":"combatant:generated-6206001-monster-1","id":"token:generated-6206001-monster-1","placementMode":{"actual":"Large","kind":"normal"},"position":{"column":20,"row":1}},{"combatantId":"combatant:generated-6206001-monster-2","id":"token:generated-6206001-monster-2","placementMode":{"actual":"Large","kind":"normal"},"position":{"column":18,"row":0}},{"combatantId":"combatant:generated-6206001-monster-3","id":"token:generated-6206001-monster-3","placementMode":{"actual":"Large","kind":"normal"},"position":{"column":20,"row":3}},{"combatantId":"combatant:generated-6206001-monster-4","id":"token:generated-6206001-monster-4","placementMode":{"actual":"Medium","kind":"normal"},"position":{"column":19,"row":3}}],"worldObjects":[{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":5,"row":12}],"id":"world-object:generated-6206001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":5,"row":12}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":14,"row":10}],"id":"world-object:generated-6206001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":14,"row":10}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":16,"row":16}],"id":"world-object:generated-6206001-3","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":16,"row":16}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":6,"row":8}],"id":"world-object:generated-6206001-4","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":6,"row":8}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":2,"row":19}],"id":"world-object:generated-6206001-5","kind":"light-source","name":"Runed Brazier","position":{"column":2,"row":19}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":17,"row":1}],"id":"world-object:generated-6206001-6","kind":"light-source","name":"Runed Brazier","position":{"column":17,"row":1}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":1,"row":4}],"id":"world-object:generated-6206001-7","kind":"light-source","name":"Runed Brazier","position":{"column":1,"row":4}}]}},"spec":{"blockedCells":[{"column":11,"row":0},{"column":11,"row":1},{"column":11,"row":2},{"column":11,"row":3},{"column":11,"row":4},{"column":11,"row":5},{"column":11,"row":6},{"column":11,"row":7},{"column":11,"row":8},{"column":11,"row":9},{"column":11,"row":10},{"column":11,"row":11},{"column":11,"row":12},{"column":11,"row":13},{"column":11,"row":15},{"column":11,"row":16},{"column":11,"row":17},{"column":11,"row":18},{"column":11,"row":19},{"column":11,"row":20},{"column":11,"row":21}],"challengeBudgetEighths":76,"challengeSpentEighths":76,"difficultyProfile":"brutal","dimensions":{"columns":22,"rows":22},"hardFeatures":{"chokepointCells":[{"column":11,"row":14}],"likelyApproachTerrainRegionIds":["difficult:generated-6206001-approach"],"shape":"single-gate"},"monsterRoster":[{"challengeEighths":40,"challengeRating":5,"combatantId":"combatant:generated-6206001-monster-1","statblockId":"statblock:unicorn","tokenId":"token:generated-6206001-monster-1"},{"challengeEighths":16,"challengeRating":2,"combatantId":"combatant:generated-6206001-monster-2","statblockId":"statblock:minotaur-skeleton","tokenId":"token:generated-6206001-monster-2"},{"challengeEighths":16,"challengeRating":2,"combatantId":"combatant:generated-6206001-monster-3","statblockId":"statblock:homebrew-beast/ironweb-weaver","tokenId":"token:generated-6206001-monster-3"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-6206001-monster-4","statblockId":"statblock:homebrew-beast/crested-charger","tokenId":"token:generated-6206001-monster-4"}],"partyState":[{"combatantId":"combatant:fighter","concentrating":false,"deathSaves":null,"hitPointFraction":1,"hitPoints":67,"life":"living","spellSlots":[]},{"combatantId":"combatant:cleric","concentrating":false,"deathSaves":null,"hitPointFraction":0.75,"hitPoints":39,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":0,"spent":4},{"level":2,"maximum":3,"remaining":1,"spent":2},{"level":3,"maximum":3,"remaining":3,"spent":0},{"level":4,"maximum":1,"remaining":1,"spent":0}]},{"combatantId":"combatant:wizard","concentrating":false,"deathSaves":null,"hitPointFraction":1,"hitPoints":38,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":3,"spent":1},{"level":2,"maximum":3,"remaining":3,"spent":0},{"level":3,"maximum":3,"remaining":1,"spent":2},{"level":4,"maximum":1,"remaining":1,"spent":0}]}],"seed":6206001,"terrain":[{"cells":[{"column":9,"row":13},{"column":9,"row":14},{"column":9,"row":15},{"column":10,"row":13},{"column":10,"row":14},{"column":10,"row":15},{"column":12,"row":13},{"column":12,"row":14},{"column":12,"row":15},{"column":13,"row":13},{"column":13,"row":14},{"column":13,"row":15}],"id":"difficult:generated-6206001-approach","kind":"difficult-terrain-patch"},{"cells":[{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":4,"row":7},{"column":5,"row":7},{"column":6,"row":7},{"column":7,"row":7}],"id":"difficult:generated-6206001-brutal-1","kind":"difficult-terrain-patch"},{"cells":[{"column":12,"row":9},{"column":13,"row":9},{"column":14,"row":9},{"column":15,"row":9},{"column":12,"row":10},{"column":13,"row":10},{"column":14,"row":10},{"column":15,"row":10},{"column":12,"row":11},{"column":13,"row":11},{"column":14,"row":11},{"column":15,"row":11},{"column":12,"row":12},{"column":13,"row":12},{"column":14,"row":12},{"column":15,"row":12}],"id":"difficult:generated-6206001-brutal-2","kind":"difficult-terrain-patch"},{"cells":[{"column":4,"row":17},{"column":5,"row":17},{"column":6,"row":17},{"column":7,"row":17},{"column":4,"row":18},{"column":5,"row":18},{"column":6,"row":18},{"column":7,"row":18},{"column":4,"row":19},{"column":5,"row":19},{"column":6,"row":19},{"column":7,"row":19},{"column":4,"row":20},{"column":5,"row":20},{"column":6,"row":20},{"column":7,"row":20}],"id":"difficult:generated-6206001-brutal-3","kind":"difficult-terrain-patch"},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":5,"row":12}],"id":"world-object:generated-6206001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":5,"row":12}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":14,"row":10}],"id":"world-object:generated-6206001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":14,"row":10}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":16,"row":16}],"id":"world-object:generated-6206001-3","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":16,"row":16}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":6,"row":8}],"id":"world-object:generated-6206001-4","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":6,"row":8}}},{"cells":[{"column":15,"row":16},{"column":17,"row":16},{"column":18,"row":16},{"column":15,"row":17},{"column":16,"row":17},{"column":17,"row":17},{"column":18,"row":17},{"column":15,"row":18},{"column":16,"row":18},{"column":17,"row":18},{"column":18,"row":18},{"column":15,"row":19},{"column":16,"row":19},{"column":17,"row":19},{"column":18,"row":19}],"kind":"light-source","level":"dim","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":2,"row":19}],"id":"world-object:generated-6206001-5","kind":"light-source","name":"Runed Brazier","position":{"column":2,"row":19}}},{"cells":[{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":4,"row":7},{"column":5,"row":7},{"column":6,"row":7},{"column":7,"row":7}],"kind":"light-source","level":"dim","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":17,"row":1}],"id":"world-object:generated-6206001-6","kind":"light-source","name":"Runed Brazier","position":{"column":17,"row":1}}},{"cells":[{"column":14,"row":14},{"column":15,"row":14},{"column":14,"row":15},{"column":15,"row":15}],"kind":"light-source","level":"bright","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":1,"row":4}],"id":"world-object:generated-6206001-7","kind":"light-source","name":"Runed Brazier","position":{"column":1,"row":4}}},{"cells":[{"column":3,"row":18},{"column":4,"row":18},{"column":3,"row":19},{"column":4,"row":19},{"column":3,"row":20},{"column":4,"row":20}],"id":"obscurement:generated-6206001-1","kind":"obscurement-patch","obscurement":"light"},{"cells":[{"column":15,"row":17},{"column":16,"row":17},{"column":15,"row":18},{"column":16,"row":18},{"column":15,"row":19},{"column":16,"row":19},{"column":15,"row":20},{"column":16,"row":20}],"id":"obscurement:generated-6206001-2","kind":"obscurement-patch","obscurement":"light"},{"cells":[{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":6,"row":2},{"column":7,"row":2},{"column":8,"row":2},{"column":9,"row":2},{"column":6,"row":3},{"column":7,"row":3},{"column":8,"row":3},{"column":9,"row":3}],"id":"obscurement:generated-6206001-3","kind":"obscurement-patch","obscurement":"heavy"}]}}

exec
/bin/bash -lc "rg -n 'generateRoom\\(' tests/unit/vtt/arena-basis-brutal-b.test.ts; rg -n 'finalPosition|monsterAttackCommand|multiattackComponent' src/vtt/turn-proposal-executor.ts | head -25; sed -n '780,816p' src/combat/tactical-evaluator.ts; rg -n 'dispel_evil_and_good_mode' src/vtt/intent-resolver.ts src/vtt/turn-proposal.ts; sed -n '280,292p' src/vtt/intent-resolver.ts; rg -n 'tier.*total|blocksSight' src/combat/encounter.ts | tail -10" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
298:  const hard = generateRoom(seed, { difficulty: 'hard' });
rg: src/vtt/turn-proposal-executor.ts: IO error for operation on src/vtt/turn-proposal-executor.ts: No such file or directory (os error 2)
    }
    distribution = next;
  }
  return distribution;
}

function foldDeathSaveFailures(
  existingFailures: 0 | 1 | 2,
  attacks: readonly TacticalAttackEvaluation[],
): { readonly killProbability: number; readonly expectedFailures: number } {
  let states = new Map<number, number>([[existingFailures, 1]]);
  for (const attack of attacks) {
    if (attack.probabilities.status !== 'resolved') continue;
    const probabilities = attack.probabilities;
    const next = new Map<number, number>();
    for (const [failures, stateProbability] of states) {
      const outcomes = [
        { added: 0, probability: probabilities.miss },
        { added: 1, probability: probabilities.hit - probabilities.critical },
        { added: 2, probability: probabilities.critical },
      ] as const;
      for (const outcome of outcomes) {
        const total = Math.min(3, failures + outcome.added);
        next.set(total, (next.get(total) ?? 0) + stateProbability * outcome.probability);
      }
    }
    states = next;
  }
  return {
    killProbability: states.get(3) ?? 0,
    expectedFailures: [...states].reduce(
      (sum, [failures, probability]) => sum + failures * probability,
      0,
    ),
  };
}

src/vtt/turn-proposal.ts:93:  | { readonly kind: 'dispel_evil_and_good_mode'; readonly values: typeof DISPEL_EVIL_AND_GOOD_MODES }
src/vtt/turn-proposal.ts:103:  | { readonly kind: 'dispel_evil_and_good_mode'; readonly value: DispelEvilAndGoodMode }
src/vtt/intent-resolver.ts:590:    case 'dispel_evil_and_good_mode':
src/vtt/intent-resolver.ts:591:      return choice.kind === 'dispel_evil_and_good_mode' && slot.values.some((value) => value === choice.value);
src/vtt/intent-resolver.ts:613:      : choice.kind === 'dispel_evil_and_good_mode'
          state, actorId, constraint.targetId, { sourceAnchor: position },
        ).blocksSight)) return false;
      continue;
    }
    const reach = queries.reach(state, {
      actorId,
      targetId: constraint.targetId,
      actionId: constraint.source.actionId,
      origin: position,
    });
    if (!reach.legal || reach.distanceFeet > constraint.rangeFeet) return false;
  }
  const anchor = movement.engagement.anchor;
2119:  return !traceTerrainLine(state, from, to).blocksSight;
7201:    (attackLine.blocksSight || attackLine.tier === 'total')
7491:    selectedLine.blocksSight || selectedLine.tier === 'total'
8568:    selectedLine.blocksSight || selectedLine.tier === 'total'
9054:    selectedLine.blocksSight
10697:          (operation.destination.requireLineOfSight && selectedLine.blocksSight)

exec
/bin/bash -lc "rg -n 'function processForceSave|processForceSave|force_save' src/combat/encounter.ts | tail -8; rg -n 'monsterAttackCommand|multiattackComponent' src/vtt --glob '*.ts' | head -35; sed -n '570,595p' src/vtt/intent-resolver.ts; sed -n '9030,9060p' src/combat/encounter.ts; rg -n 'difficulty|terrainProfile' tests/fixtures/arena-basis-brutal-b/seed-6206001.json --max-columns 180 --max-columns-preview" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
12451:    case 'force_save': {
src/vtt/turn-proposal.ts:220:  readonly multiattackComponent?: true;
src/vtt/engine-round-session.ts:4:import { monsterAttackCommand, monsterSavingThrowCommand } from '../combat/monster-commands';
src/vtt/engine-round-session.ts:289:      state = reduce(state, monsterAttackCommand(action, mechanics.actorId, targetId, evaluation.rollMode.mode));
src/vtt/engine-round-session.ts:329:          use.multiattackComponent === true ? 'none' : use.slot === 'bonus' ? 'bonus_action' : 'action',
src/vtt/regret/legal-actions.ts:10:  monsterAttackCommand,
src/vtt/regret/legal-actions.ts:114:        ? monsterAttackCommand(action, actor, target, rollMode, true)
src/vtt/regret/legal-actions.ts:115:        : monsterAttackCommand(action, actor, target, rollMode)];
src/vtt/challenge-feasibility.ts:4:import { monsterAttackCommand } from '../combat/monster-commands';
src/vtt/challenge-feasibility.ts:459:      command = monsterAttackCommand(action, D_GUARD, WIZARD, evaluation.rollMode.mode);
src/vtt/challenge-feasibility.ts:900:  return monsterAttackCommand(action, actor, target, evaluation.rollMode.mode);
src/vtt/intent-resolver.ts:494:            multiattackComponent: true,
      path: movement.path,
      finalPosition: movement.finalPosition,
      actionSlots,
      omittedRiders: option.omittedRiders,
    },
  };
}

function choiceFitsOption(
  option: EngineOfferableOption,
  choice: EngineActivationChoice | null | undefined,
): boolean {
  const slot = option.activationChoice;
  if (slot === undefined || slot === null) return choice === null || choice === undefined;
  if (choice === null || choice === undefined || choice.kind !== slot.kind) return false;
  switch (slot.kind) {
    case 'command_word':
      return choice.kind === 'command_word' && slot.values.some((value) => value === choice.value);
    case 'unicorns_blessing_spell':
      return choice.kind === 'unicorns_blessing_spell' && slot.values.some((value) => value === choice.value);
    case 'dispel_evil_and_good_mode':
      return choice.kind === 'dispel_evil_and_good_mode' && slot.values.some((value) => value === choice.value);
    case 'calm_emotions_per_target': {
      if (choice.kind !== 'calm_emotions_per_target') return false;
      const expected = [...slot.targetIds].sort();
      const actual = choice.selections.map((entry) => entry.targetId).sort();
    case 'area_selected':
    case 'all_in_range':
    case 'remote':
      throw new EncounterRuleError('validation', `${definition.name} has incompatible item targeting.`);
  }
}

function executeHeatMetal(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  operation: Extract<BranchSpellOperation, { readonly kind: 'heat_metal' }>,
): SpellOperationOutcome {
  const selected = command.objectTargets ?? [];
  if (selected.length !== 1) throw new EncounterRuleError('validation', `${definition.name} requires exactly one item target.`);
  const id = selected[0] as ItemId;
  const item = encounterItem(context.state, id);
  if (!item.materials.some((material) => material.kind === 'known' && material.name === operation.requiredMaterial)) {
    throw new EquipmentRuleError('material_mismatch', `${definition.name} requires a metal item.`);
  }
  const targetCells = itemCells(context.state, id);
  const selectedLine = traceCombatantLineToCells(context.state, command.actor, targetCells);
  if (
    minimumSpaceDistanceToCells(combatantSpace(context.state, command.actor), targetCells) > heatMetalRange(definition) ||
    selectedLine.blocksSight
  ) throw new EncounterRuleError('validation', `${definition.name} item target is out of range or not visible.`);

  const contacts = itemContacts(context.state, id);
  const rolled = resolveDamage({
    terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
    critical: false,
1:{"encounter":{"provenance":{"licenseTag":"MIT","seed":6206001,"source":"generated"},"schemaVersion":1,"state":{"activeCombatant":null,"activeInitiativeIndex":null,"adjudicationPend [... omitted end of long line]

exec
/bin/bash -lc "python3 - <<'PY'
from fractions import Fraction as F
from itertools import product
import subprocess,re

def weights(ac,bonus,bless=False):
 w=[0,0,0]
 for die,grant in product(range(1,21),range(1,5) if bless else [0]):
  k=2 if die==20 else 1 if die"'!=1 and die+bonus+grant>=ac else 0
  w[k]+=1
 n=sum(w);return [F(x,n) for x in w]
p=[(18,5),(20,4),(23,4),(20,3),(18,3)]
base=[weights(*a) for a in p];blessed=[weights(*a,True) for a in p]
for label,rows in [('"'no-bless',base),('bless-scout-scout-priest',blessed[:3]+base[3:])]:
 dist=[F(1),F(0),F(0),F(0)]
 for w,n in zip(rows,[2,2,2,1,1]):
  for _ in range(n):
   nex=[F(0)]*4
   for a,b in product(range(4),range(3)):nex[min(3,a+b)]+=dist[a]*w[b]
   dist=nex
 print(label,'weights',rows,'kill',dist[3],float(dist[3]))
f='tests/unit/vtt/tactical-evaluator-r02.test.ts';old=subprocess.check_output(['git','show','10cc9f5e:'+f],text=True);new=open(f).read()
for title in ['no-priest-attacks','bless-only-priest-no-attacks']:
 pat=r\"expect\\(probability\\('\"+title+r\"'\\)\\).*?\\]\\), 12\\);\"
 print(title,'assertion byte equal',re.search(pat,old,re.S)[0]==re.search(pat,new,re.S)[0])
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
no-bless weights [[Fraction(3, 5), Fraction(7, 20), Fraction(1, 20)], [Fraction(3, 4), Fraction(1, 5), Fraction(1, 20)], [Fraction(9, 10), Fraction(1, 20), Fraction(1, 20)], [Fraction(4, 5), Fraction(3, 20), Fraction(1, 20)], [Fraction(7, 10), Fraction(1, 4), Fraction(1, 20)]] kill 2702281/6250000 0.43236496
bless-scout-scout-priest weights [[Fraction(19, 40), Fraction(19, 40), Fraction(1, 20)], [Fraction(5, 8), Fraction(13, 40), Fraction(1, 20)], [Fraction(31, 40), Fraction(7, 40), Fraction(1, 20)], [Fraction(4, 5), Fraction(3, 20), Fraction(1, 20)], [Fraction(7, 10), Fraction(1, 4), Fraction(1, 20)]] kill 1035529241349/1638400000000 0.6320368904718018
no-priest-attacks assertion byte equal True
bless-only-priest-no-attacks assertion byte equal True

exec
/bin/bash -lc "sed -n '12445,12515p' src/combat/encounter.ts; sed -n '230,335p' src/vtt/engine-round-session.ts; sed -n '470,510p' src/vtt/intent-resolver.ts; python3 - <<'PY'
import json
x=json.load(open('tests/fixtures/arena-basis-brutal-b/seed-6206001.json'));print(x.keys());print({k:v for k,v in x['metadata'].items() if k in ['difficulty','difficultyProfile','terrainProfile','seed']})
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 0ms:
        type: 'reaction_declined',
        combatant: command.actor,
        mover: command.mover,
      });
      return;
    }
    case 'force_save': {
      if (command.monsterFailureEffects !== undefined) {
        if (command.monsterActionId === undefined) {
          throw new EncounterRuleError('validation', 'Declared monster failure effects require their action id.');
        }
        const declared = declaredMonsterAction(context.state, command.actor, command.monsterActionId);
        if (
          declared.kind !== 'saving_throw' ||
          command.ability !== declared.savingThrow.ability ||
          command.dc !== declared.savingThrow.dc ||
          command.onSuccess !== (declared.success.kind === 'half_damage' ? 'half' : 'none') ||
          canonicalJson(command.damage) !== canonicalJson(declaredMonsterDamage(declared.failure.damage)) ||
          canonicalJson(command.monsterFailureEffects) !== canonicalJson(
            executableMonsterOnHitEffects(declared.failure.effects),
          )
        ) {
          throw new EncounterRuleError('validation', `Combatant ${command.actor}'s monster save declaration was altered.`);
        }
      }
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Force saving throw');
      const save = resolveTargetSave(
        context,
        command.actor,
        command.target,
        command.ability,
        command.dc,
        command.rollMode,
        null,
        'other',
        command.rollModifierEffectIds,
      );
      const damage = resolveTargetDamage(context, command.actor, command.target, command.damage);
      const amount =
        save.outcome === 'failure'
          ? damage.total
          : command.onSuccess === 'half'
            ? Math.floor(damage.total / 2)
            : 0;
      applyDamage(context, command.actor, command.target, amount);
      concentrationCheck(context, command.target, amount);
      if (save.outcome === 'failure' && command.monsterFailureEffects !== undefined) {
        applyMonsterOnHitEffects(
          context,
          command.actor,
          command.target,
          `save:${command.ability}:${String(command.dc)}`,
          command.monsterFailureEffects,
          null,
          amount,
        );
      }
      return;
    }
    case 'roll_ability_check': {
      assertActiveActor(context, command.actor);
      let escapeEffect: EncounterEffect | null = null;
      if (command.escapeEffectId !== undefined) {
        const candidate = context.state.effects.find((effect) => effect.id === command.escapeEffectId);
        if (
          candidate === undefined ||
          !candidate.targets.includes(command.actor) ||
          candidate.escapeCheck === undefined
        ) {
          throw new EncounterRuleError('validation', `Effect ${command.escapeEffectId} is not escapable by ${command.actor}.`);
    targets: usesPlacedArea ? [] : use.targetIds,
    area: usesPlacedArea ? placedArea : null,
    weaponAttack: null,
    selectedOption: use.activationChoice?.kind === 'command_word' ||
      use.activationChoice?.kind === 'dispel_evil_and_good_mode'
      ? use.activationChoice.value
      : use.activationChoice?.kind === 'unicorns_blessing_spell' &&
          use.activationChoice.value === 'lesser-restoration'
        ? use.selectedCondition ?? null
        : null,
    ...(use.activationChoice?.kind === 'calm_emotions_per_target'
      ? { calmEmotionsModes: use.activationChoice.selections.map((entry) => ({ target: entry.targetId, mode: entry.mode })) }
      : {}),
    ...(resourcePoolId === null ? {} : { resourcePoolId }),
    monsterActionId: source.id,
  };
}

function applyOneResolvedProposal(
  initialState: EncounterState,
  mechanics: ResolvedTurnMechanics,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
  queries: EngineQueryPort,
): { readonly state: EncounterState; readonly remainingAttackTargetDead: boolean } {
  let state = initialState;
  let remainingAttackTargetDead = false;
  const dashesBeforeMovement = mechanics.path.length === 0
    ? []
    : mechanics.actionSlots.filter((use) => use.kind === 'dash');
  for (const dash of dashesBeforeMovement) {
    state = reduce(state, {
      type: 'dash',
      actor: mechanics.actorId,
      cost: dash.slot === 'bonus' ? 'bonus_action' : 'action',
    });
  }
  if (mechanics.path.length > 0) {
    state = reduce(state, {
      type: 'move', actor: mechanics.actorId, path: mechanics.path, cause: 'voluntary',
    });
  }
  if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') {
    return { state, remainingAttackTargetDead };
  }
  for (const use of mechanics.actionSlots) {
    if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') break;
    switch (use.kind) {
    case 'attack': {
      const targetId = use.targetIds[0];
      if (targetId === undefined) throw new Error('Resolved attack omitted its target.');
      if (state.combatants.find((entry) => entry.profile.id === targetId)?.life === 'dead') {
        remainingAttackTargetDead = true;
        break;
      }
      const action = queries.actions(state, mechanics.actorId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === use.actionId);
      if (action === undefined) throw new Error(`Resolved attack ${use.actionId} is absent.`);
      const evaluation = evaluateMonsterTacticalAttack(state, action, mechanics.actorId, targetId);
      state = reduce(state, monsterAttackCommand(action, mechanics.actorId, targetId, evaluation.rollMode.mode));
      break;
    }
    case 'dodge': state = reduce(state, { type: 'dodge', actor: mechanics.actorId, cost: 'action' }); break;
    case 'disengage': state = reduce(state, {
      type: 'disengage',
      actor: mechanics.actorId,
      cost: use.slot === 'bonus' ? 'bonus_action' : 'action',
    }); break;
    case 'dash': {
      if (!dashesBeforeMovement.includes(use)) {
        state = reduce(state, {
          type: 'dash',
          actor: mechanics.actorId,
          cost: use.slot === 'bonus' ? 'bonus_action' : 'action',
        });
      }
      break;
    }
    case 'hide': state = reduce(state, { type: 'hide', actor: mechanics.actorId, cost: 'bonus_action' }); break;
    case 'end_turn': return {
      state: reduce(state, { type: 'end_turn', actor: mechanics.actorId }),
      remainingAttackTargetDead,
    };
    case 'saving_throw': {
        const targetId = use.targetIds[0];
        if (targetId === undefined) throw new Error(`Resolved save action ${use.actionId} omitted its target.`);
        const sources = use.slot === 'main' ? monsterActions(state, mechanics.actorId) : monsterBonusActions(state, mechanics.actorId);
        const action = queries.actions(state, mechanics.actorId)
          .find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === use.actionId) ??
          sources.find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === use.actionId);
        if (action === undefined) {
          throw new Error(`Saving-throw action ${use.actionId} is absent.`);
        }
        state = reduce(state, monsterSavingThrowCommand(
          action,
          mechanics.actorId,
          targetId,
          use.multiattackComponent === true ? 'none' : use.slot === 'bonus' ? 'bonus_action' : 'action',
        ));
        break;
    }
    case 'cast_spell': state = reduce(state, monsterSpellCommand(state, use, queries)); break;
    case 'use_world_object': {
      if (use.objectId === null) throw new Error(`Resolved world-object action ${use.actionId} omitted its object.`);
  state: EncounterState,
  actorId: CombatantId,
  slots: readonly EngineActionSlotUse[],
  queries: EngineQueryPort,
  omittedRiders: readonly EngineOmittedRider[],
): readonly ResolvedActionSlotUse[] | null {
  const resolved: ResolvedActionSlotUse[] = [];
  for (const slot of slots) {
    const use = slot.use;
    const targets = useTargets(state, actorId, use, queries);
    if (targets === null) return null;
    switch (use.kind) {
      case 'multiattack':
        for (const component of use.components) {
          const targetId = resolveSelector(state, actorId, component.target, queries);
          if (targetId === null) return null;
          resolved.push({
            slot: slot.slot,
            kind: component.kind,
            actionId: component.actionId,
            spellId: null,
            targetIds: [targetId],
            objectId: null,
            omittedRiders: component.omittedRiders,
            multiattackComponent: true,
          });
        }
        break;
      case 'cast_spell': resolved.push({
        slot: slot.slot,
        kind: use.kind,
        actionId: use.sourceActionId,
        spellId: use.spellId,
        targetIds: targets,
        objectId: null,
        omittedRiders: omittedRiders.filter((rider) => rider.sourceActionId === use.sourceActionId),
        ...(!('selectedCondition' in use) || use.selectedCondition === undefined
          ? {}
          : { selectedCondition: use.selectedCondition }),
        ...(use.area === null ? {} : { area: use.area }),
      }); break;
dict_keys(['encounter', 'spec'])
Traceback (most recent call last):
  File "<stdin>", line 2, in <module>
KeyError: 'metadata'

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/engine-query-port.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},testNamePattern:\"offered attacks and saves\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/engine-query-port.test.ts'))return code.replace('let checkedOffers = 0;', 'let checkedOffers = 0; const reviewCounts = {};').replace('checkedOffers += 1;', \"checkedOffers += 1; const family=path.split('/')[2]; reviewCounts[family]=(reviewCounts[family]??0)+1;\").replace('for (const use of uses) {', \"for (const use of uses) { const k=use.kind+':'+use.slot+':'+Boolean(use.multiattackComponent);reviewCounts[k]=(reviewCounts[k]??0)+1; if(use.targetIds.length"'!==1) throw Error('"'MULTITARGET');\").replace('expect(checkedOffers).toBe(214);', \"console.log('REVIEW_COUNTS',JSON.stringify(reviewCounts));expect(checkedOffers).toBe(214);\");}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "python3 - <<'PY'
import json
x=json.load(open('tests/fixtures/arena-basis-brutal-b/seed-6206001.json'))['spec'];print({k:v for k,v in x.items() if k in ['difficulty','difficultyProfile','terrainProfile','seed','generatorVersion']});print(x.keys())
PY
rg -n 'processForceSave|resolveTargetSave|function resolveTargetSave' src/combat/encounter.ts | head -12; rg -n \"tier === 'total'|tier "'!== '"'total'|target_outside_line_of_sight\" src --glob '*.ts'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
{'difficultyProfile': 'brutal', 'seed': 6206001}
dict_keys(['blockedCells', 'challengeBudgetEighths', 'challengeSpentEighths', 'difficultyProfile', 'dimensions', 'hardFeatures', 'monsterRoster', 'partyState', 'seed', 'terrain'])
3577:function resolveTargetSave(
3729:  const result = resolveTargetSave(
4458:    saveSucceeded = resolveTargetSave(
5621:      const save = resolveTargetSave(
6449:      const save = resolveTargetSave(
6482:      const save = resolveTargetSave(
6631:      const save = resolveTargetSave(
6665:    const save = resolveTargetSave(
6838:          const save = resolveTargetSave(
8831:  const saveSucceeded = delivery.kind === 'save' && resolveTargetSave(
9077:    const save = resolveTargetSave(
9169:      resolveTargetSave(
src/combat/encounter.ts:7201:    (attackLine.blocksSight || attackLine.tier === 'total')
src/combat/encounter.ts:7491:    selectedLine.blocksSight || selectedLine.tier === 'total'
src/combat/encounter.ts:8568:    selectedLine.blocksSight || selectedLine.tier === 'total'
src/combat/cover.ts:391:  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');
src/combat/cover.ts:517:      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)
src/combat/cover.ts:650:    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
src/vtt/mcp/engine-server.ts:3175:          return { query_id: queryId, status: cover === null ? 'unknown' : cover.tier === 'total' ? 'no' : 'yes', facts: { tier: cover?.tier ?? 'unknown', source_ids: cover?.sourceIds ?? [] }, refusals: cover === null ? [{ code: 'TOKEN_ABSENT', summary: 'Cover cannot be resolved without both tokens.' }] : [] };
src/vtt/engine-query-port.ts:199:        | 'target_outside_line_of_sight'
src/vtt/engine-query-port.ts:1172:      return { legal: false, codes: ['target_outside_line_of_sight'] };
src/vtt/engine-query-port.ts:1174:    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };

 succeeded in 11681ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify


 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  05:24:14
   Duration  11.56s (transform 1.46s, setup 0ms, import 3.36s, tests 8.12s, environment 0ms)


exec
/bin/bash -lc "sed -n '3577,3618p' src/combat/encounter.ts; sed -n '1230,1250p' src/vtt/room-generator.ts; rg -n 'generateRoom\\(|terrainProfile' tools/generate-arena-basis.ts | tail -12; sed -n '240,265p' tools/generate-arena-basis.ts; git diff --check 10cc9f5e ebfcacaa; git diff --stat 10cc9f5e ebfcacaa; git diff --stat 10cc9f5e ebfcacaa -- tests/fixtures" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
function resolveTargetSave(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  ability: Ability,
  dc: number,
  mode: RollMode,
  effectId: EncounterEffectId | null,
  cause: RollCause = 'spell_or_magical_effect',
  selectedEffectIds: readonly EncounterEffectId[] = [],
): ReturnType<typeof resolveSavingThrow> {
  const subject = combatant(context.state, target);
  const modifierModes = rollDefenseModes(
    context.state, 'saving_throws', target, source, cause, selectedEffectIds,
  );
  const save = automaticSaveFailure(context.state, target, ability)
    ? {
        outcome: 'failure' as const,
        roll: { mode: 'normal' as const, faces: [], chosen: 0 },
        total: 0,
      }
    : resolveSavingThrow(
        {
          bonus:
            effectiveCombatRules(context.state, target).savingThrowBonuses[ability] +
            coverSavingThrowBonus(context.state, source, target, ability) +
            exhaustionPenalty(combatantConditions(context.state, target)) +
            (ability === 'dexterity'
              ? -slowEffects(context.state, target).reduce(
                  (largest, effect) => Math.max(largest, effect.dexteritySavePenalty),
                  0,
                )
              : 0) +
            effectDiceModifier(context.state, target, 'saving_throw', context.rng) +
            rollDefenseTotalModifier(
              context, 'saving_throws', target, source, cause, selectedEffectIds,
            ),
          dc: difficultyClass(dc),
          rollMode: combineRollModes([
            saveRollMode(context.state, target, ability, mode, cause), ...modifierModes.modes,
          ]),
      },
  return trace.tier === 'none' && !trace.blocksSight;
}

function hasOpenOpposingRay(state: EncounterState): boolean {
  if (livingOpposingPairs(state).some(({ source, target }) =>
    generatedLineIsOpen(traceCombatantLine(state, source.profile.id, target.profile.id)))) return true;
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (!occupied.has(cellKey(target)) && generatedLineIsOpen(
          traceCombatantLineToCells(state, source.profile.id, [target]),
        )) return true;
      }
    }
    return false;
  });
}
209:    terrainProfile as RoomTerrainProfile,
218:    ...(terrainProfile === undefined ? {} : { terrainProfile: terrainProfile as RoomTerrainProfile }),
237:    terrainProfile: Math.floor(localOrdinal / 4) % 2 === 0
251:    const generated = generateRoom(seed, {
253:      ...(config.terrainProfile === undefined ? {} : { terrainProfile: config.terrainProfile }),
345:  const room = generateRoom(seed, {
347:    ...(schedule.terrainProfile === null ? {} : { terrainProfile: schedule.terrainProfile }),
366:    terrainProfile: schedule.terrainProfile,
535:    terrainProfile: decodeTerrainProfile(record.terrainProfile, `${label}.terrainProfile`),
627:      row.targetXp !== schedule.targetXp || row.terrainProfile !== schedule.terrainProfile ||
712:      (row.terrainProfile === null ? Object.hasOwn(spec, 'terrainProfile') :
713:        spec.terrainProfile !== row.terrainProfile)) {
  };
}

export function basisRepositoryRevision(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function generateLegacyBasis(config: LegacyBasisGenerationConfig): Promise<null> {
  await mkdir(config.outPath, { recursive: true });
  await Promise.all(Array.from({ length: config.rooms }, async (_unused, index) => {
    const seed = config.seed + index;
    const generated = generateRoom(seed, {
      difficulty: config.difficulty,
      ...(config.terrainProfile === undefined ? {} : { terrainProfile: config.terrainProfile }),
    });
    const room = decodeArenaBasisEnvelopeV1(generated, { mode: 'legacy_basis' });
    await writeFile(
      resolve(config.outPath, `seed-${String(seed)}.json`),
      `${canonicalJson(room)}\n`,
      'utf8',
    );
  }));
  return null;
}

export type LoadedParty = Extract<
 src/vtt/engine-query-port.ts                    |  12 +-
 src/vtt/room-generator.ts                       |  19 ++-
 tests/unit/vtt/arena-basis-brutal-b.test.ts     |  20 +++
 tests/unit/vtt/engine-query-port.test.ts        | 177 +++++++++++++++++++++++-
 tests/unit/vtt/room-generator-los-cover.test.ts |  41 ++++++
 tests/unit/vtt/tactical-evaluator-r02.test.ts   |  78 +++++++++--
 6 files changed, 325 insertions(+), 22 deletions(-)

 succeeded in 105836ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify


 Test Files  3 passed (3)
      Tests  133 passed (133)
   Start at  05:22:49
   Duration  105.69s (transform 1.40s, setup 0ms, import 3.28s, tests 102.32s, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_TEN_BRUTAL_GENERATOR_BYTES\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.includes('/src/vtt/room-generator.ts?landBefore'))return code.replace(\"return trace.tier === 'none' && "'!trace.blocksSight;","return trace.tier === '"'none';\");if(id.endsWith('/tests/unit/vtt/room-generator-los-cover.test.ts'))return code+\"\\nit('REVIEW_TEN_BRUTAL_GENERATOR_BYTES',{timeout:30000},async()=>{\\n const old=await import('../../../src/vtt/room-generator?landBefore');\\n const hash=await import('node:crypto');\\n for(let seed=6206001;seed<=6206010;seed++){\\n  const a=canonicalJson(decodeArenaBasisEnvelopeV1(generateRoom(seed,{difficulty:'brutal'}),{mode:'legacy_basis'}));\\n  const b=canonicalJson(decodeArenaBasisEnvelopeV1(old.generateRoom(seed,{difficulty:'brutal'}),{mode:'legacy_basis'}));\\n  expect(a).toBe(b);console.log('GENERATOR_EQUAL',seed,hash.createHash('sha256').update(a).digest('hex'));\\n }\\n});\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/engine-query-port.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"offered attacks and saves\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/engine-query-port.test.ts'))return code.replace('let checkedOffers = 0;', 'let checkedOffers = 0; const reviewCounts = {};').replace('checkedOffers += 1;', \"checkedOffers += 1; const family=path.split('/')[2]; reviewCounts[family]=(reviewCounts[family]??0)+1;\").replace('for (const use of uses) {', \"for (const use of uses) { const k=use.kind+':'+use.slot+':'+Boolean(use.multiattackComponent);reviewCounts[k]=(reviewCounts[k]??0)+1; if(use.targetIds.length"'!==1) throw Error('"'MULTITARGET');\").replace('expect(checkedOffers).toBe(214);', \"console.log('REVIEW_COUNTS',JSON.stringify(reviewCounts));expect(checkedOffers).toBe(214);\");}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 3268ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

stdout | tests/unit/vtt/room-generator-los-cover.test.ts > REVIEW_TEN_BRUTAL_GENERATOR_BYTES
GENERATOR_EQUAL 6206001 2b1ba496b9f49321cc897eb991cb751e95081192d8578ea6de8a5bc1f436f30e
GENERATOR_EQUAL 6206002 72b57b6d8c11818b0b77fdf06c7eff4d006842bc7ae4e14f45ef55a5fb1695eb
GENERATOR_EQUAL 6206003 8806308423bbf441e10e2293ead1d0a51083f6829e72d803ece96516f5e7911e
GENERATOR_EQUAL 6206004 f9f1d1e6068967ad7c9f6a0f376a1add20af727c58f796ade696c1778c705621
GENERATOR_EQUAL 6206005 6a9c4c485e5692387a8426af60ce2d28488b301072a23744751092fa9e5a4bcc
GENERATOR_EQUAL 6206006 f6c69e7d6666505efa6f6c176bdd644cae59e32b49c3e226891a8e2da4f4c2d1
GENERATOR_EQUAL 6206007 d27e166615e9d48f685f071129d9fe9a452d17667130b54713f090d55a0a00bf
GENERATOR_EQUAL 6206008 c6b0d00dfa09917eb002249d11d1640a20087c6e8d5960e3af382514f9291f5e
GENERATOR_EQUAL 6206009 9a3d6d0578cc70d6d1a78993627f345c2cc888afcc433d51c5d438bf0b8e4804
GENERATOR_EQUAL 6206010 47595ab0e3e385d9e53b6fdf4120f1c2f6a29fd3b40ecf98ac8d13b14fd0edda

GENERATOR_EQUAL 6206001 2b1ba496b9f49321cc897eb991cb751e95081192d8578ea6de8a5bc1f436f30e
GENERATOR_EQUAL 6206002 72b57b6d8c11818b0b77fdf06c7eff4d006842bc7ae4e14f45ef55a5fb1695eb
GENERATOR_EQUAL 6206003 8806308423bbf441e10e2293ead1d0a51083f6829e72d803ece96516f5e7911e
GENERATOR_EQUAL 6206004 f9f1d1e6068967ad7c9f6a0f376a1add20af727c58f796ade696c1778c705621
GENERATOR_EQUAL 6206005 6a9c4c485e5692387a8426af60ce2d28488b301072a23744751092fa9e5a4bcc
GENERATOR_EQUAL 6206006 f6c69e7d6666505efa6f6c176bdd644cae59e32b49c3e226891a8e2da4f4c2d1
GENERATOR_EQUAL 6206007 d27e166615e9d48f685f071129d9fe9a452d17667130b54713f090d55a0a00bf
GENERATOR_EQUAL 6206008 c6b0d00dfa09917eb002249d11d1640a20087c6e8d5960e3af382514f9291f5e
GENERATOR_EQUAL 6206009 9a3d6d0578cc70d6d1a78993627f345c2cc888afcc433d51c5d438bf0b8e4804
GENERATOR_EQUAL 6206010 47595ab0e3e385d9e53b6fdf4120f1c2f6a29fd3b40ecf98ac8d13b14fd0edda

 ✓ tests/unit/vtt/room-generator-los-cover.test.ts (113 tests | 112 skipped) 83ms

 Test Files  1 passed (1)
      Tests  1 passed | 112 skipped (113)
   Start at  05:25:01
   Duration  3.17s (transform 1.35s, setup 0ms, import 3.01s, tests 83ms, environment 0ms)


 succeeded in 11589ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

stdout | tests/unit/vtt/engine-query-port.test.ts > canonical engine query port > offered attacks and saves in every frozen landing family pass the reducer LOS rule
REVIEW_COUNTS {"arena-basis-hard":142,"attack:main:true":204,"attack:main:false":108,"arena-basis-brutal":57,"saving_throw:main:false":4,"arena-basis-brutal-b":15}

REVIEW_COUNTS {"arena-basis-hard":142,"attack:main:true":204,"attack:main:false":108,"arena-basis-brutal":57,"saving_throw:main:false":4,"arena-basis-brutal-b":15}

 ✓ tests/unit/vtt/engine-query-port.test.ts (19 tests | 18 skipped) 8017ms
     ✓ offered attacks and saves in every frozen landing family pass the reducer LOS rule  8016ms

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  05:25:02
   Duration  11.47s (transform 1.46s, setup 0ms, import 3.36s, tests 8.02s, environment 0ms)


codex
The independent probability calculation matches both `2702281/6250000` and the Priest/Scouts Bless result `1035529241349/1638400000000`; the two unchanged control assertions are byte-identical. I also found a coverage limit to investigate: the reducer’s `force_save` branch has no LOS check, so merely executing a save cannot prove that its offered sightline is clear.

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/engine-query-port.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"OFFER_IGNORES_BLOCKS_SIGHT|offered attacks and saves\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/vtt/engine-query-port.ts'))return code.replace('if (trace.blocksSight) {','if (false && trace.blocksSight) {');}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"OPEN_RAY_IGNORES_BLOCKS_SIGHT\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/vtt/room-generator.ts'))return code.replace(\"return trace.tier === 'none' && "'!trace.blocksSight;","return trace.tier === '"'none';\");}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc 'node scripts/check-offer-environment-architecture.mjs --self-test; node scripts/check-command-outcomes.mjs' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 3192ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/room-generator-los-cover.test.ts (112 tests | 1 failed | 111 skipped) 13ms
     × OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam 12ms
     ↓ generated and authored arena fixtures share one strict decoder
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
     ↓ kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
     ↓ kills M576-E2-WALL-SEALS-ROOM for every living footprint size
     ↓ retains a productive first-turn option for every living monster in the versioned basis
     ↓ kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
     ↓ kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:283:44
    281|     if (closedRay === undefined) throw new Error('Two-blocker fixture …
    282|     expect(closedRay).toMatchObject({ tier: 'none', blocksSight: true …
    283|     expect(generatedLineIsOpen(closedRay)).toBe(false);
       |                                            ^
    284|
    285|     // Removing (8,6) opens the same row-line-6 rays because only (8,5…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 111 skipped (112)
   Start at  05:25:23
   Duration  3.08s (transform 1.29s, setup 0ms, import 2.98s, tests 13ms, environment 0ms)


 exited 1 in 9300ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/engine-query-port.test.ts (19 tests | 2 failed | 17 skipped) 5748ms
     ↓ ENGINE_QUERY_VISIBILITY_EQUALS_CANONICAL_DETECTOR including located outcomes
     ↓ ENGINE_QUERY_IMPORTS_ONLY_CANONICAL_DETECTOR through the encounter visibility field
     ↓ runtime state, setup, and classification omit authored fog
     ↓ DISTINCT_LEGACY_FOG_DECODES_IDENTICALLY and discards the migration key
     ↓ MALFORMED_LEGACY_FOG_REJECTED: non-cell entry
     ↓ MALFORMED_LEGACY_FOG_REJECTED: out-of-bounds cell
     ↓ MALFORMED_LEGACY_FOG_REJECTED: duplicate cells
     ↓ fresh encode and decode round trips omit the legacy fog key
     ↓ offers a modeled base attack despite an unresolved rider and partitions idle Disengage
     ↓ returns independently hand-computed path legality and movement costs
     ↓ withholds Dash when an enclosed actor has no endpoint closer to its target
     ↓ M576-E1A-QUERY-PORT-LEGACY-LOS keeps reducer, query, options, and board terrain on one trace
     × OFFER_IGNORES_BLOCKS_SIGHT refuses a half-cover two-blocker seam and opens one flank 16ms
     × offered attacks and saves in every frozen landing family pass the reducer LOS rule 5731ms
     ↓ returns independently hand-computed melee reach and thrown normal range
     ↓ keeps normal and long range distinct in the authoritative reach query
     ↓ derives fallback behavior independently from fixed geometry
     ↓ moves into melee before attacking when the declared stance and willingness permit it
     ↓ refuses a declared dead target with a distinct code

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/engine-query-port.test.ts > canonical engine query port > OFFER_IGNORES_BLOCKS_SIGHT refuses a half-cover two-blocker seam and opens one flank
AssertionError: expected { legal: true, distanceFeet: 65, …(4) } to deeply equal { legal: false, …(1) }

- Expected
+ Received

  {
-   "codes": [
-     "target_outside_line_of_sight",
-   ],
-   "legal": false,
+   "distanceFeet": 65,
+   "legal": true,
+   "longRangeFeet": 320,
+   "normalRangeFeet": 80,
+   "rangeBand": "normal",
+   "rangeFeet": 80,
  }

 ❯ tests/unit/vtt/engine-query-port.test.ts:509:9
    507|       targetId: closed.targetId,
    508|       actionId: 'shortbow',
    509|     })).toEqual({ legal: false, codes: ['target_outside_line_of_sight'…
       |         ^
    510|     expect(availableEngineActorOptions(closed.state, closed.actorId, O…
    511|       option.actionSlots.some((slot) => slot.use.kind === 'attack' &&

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/unit/vtt/engine-query-port.test.ts > canonical engine query port > offered attacks and saves in every frozen landing family pass the reducer LOS rule
AssertionError: expected 451 to be 214 // Object.is equality

- Expected
+ Received

- 214
+ 451

 ❯ tests/unit/vtt/engine-query-port.test.ts:595:27
    593|     }
    594|
    595|     expect(checkedOffers).toBe(214);
       |                           ^
    596|     expect(losFailures).toEqual([]);
    597|   }, 30_000);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 17 skipped (19)
   Start at  05:25:22
   Duration  9.17s (transform 1.45s, setup 0ms, import 3.34s, tests 5.75s, environment 0ms)


exec
/bin/bash -lc "rg -n 'requiresSight|target.*visib|blocksSight' src/vtt/offers src/vtt/intent-resolver.ts src/combat/spell-targeting.ts --glob '*.ts' | head -45; sed -n '170,190p' tests/unit/vtt/arena-basis-brutal-b.test.ts; sed -n '2085,2125p' src/combat/encounter.ts; rg -n 'function beginAttack|assertActiveActor' src/combat/encounter.ts | head -10" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
rg: src/combat/spell-targeting.ts: No such file or directory (os error 2)
src/vtt/intent-resolver.ts:176:  readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
src/vtt/intent-resolver.ts:182:    readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
src/vtt/intent-resolver.ts:245:          const requiresSight = targeting.kind !== 'self' && targeting.kind !== 'area' &&
src/vtt/intent-resolver.ts:247:            targeting.kind !== 'remote' && targeting.kind !== 'utility' && targeting.requiresSight === true;
src/vtt/intent-resolver.ts:248:          constraints.push({ targetId, source: { kind: 'spell', requiresSight }, rangeFeet });
src/vtt/intent-resolver.ts:270:    readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
src/vtt/intent-resolver.ts:279:        (constraint.source.requiresSight && traceCombatantLine(
src/vtt/intent-resolver.ts:281:        ).blocksSight)) return false;
      OFFER_ENVIRONMENT,
      state.revision,
    );
    const primary = report.defaultOption;
    const fallback = availableEngineActorOptions(
      planningState,
      actorId,
      OFFER_ENVIRONMENT,
      state.revision,
    ).find((option) => option.optionId !== primary.optionId);
    if (fallback === undefined) throw new Error(`Dry-run plan has no independent fallback for ${actorId}.`);
    const activationChoice = deterministicActivationChoice(primary);
    const proposal: EngineTurnProposal = {
      actorId,
      expectedRevision: state.revision,
      primaryOptionId: primary.optionId,
      fallbackOptionId: fallback.optionId,
      reason: 'Use the engine-ranked option to maximize immediate tactical value.',
      ...(activationChoice === undefined ? {} : { activationChoice }),
      overrideJustification: null,
    };
    ) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count, sides: dieSides(payload.sides), modifier: 0,
      }, { kind: 'effect_modifier', source: `ability-check-modifier:${skill ?? 'unskilled'}`, actor: id }).total;
    }
    if (
      (test === 'attack_roll' && payload.kind === 'attack_roll_modifier') ||
      (test === 'saving_throw' && payload.kind === 'saving_throw_modifier')
    ) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count,
        sides: dieSides(payload.sides),
        modifier: 0,
      }, { kind: 'effect_modifier', source: `${test}-modifier`, actor: id }).total;
    }
    return total;
  }, 0);
}

function movementBlocked(state: EncounterState, cell: GridCell): boolean {
  return terrainPassabilityAt(state, cell) === 'blocked' ||
    (state.environment.movementRegions ?? []).some((region) =>
      region.entry === 'blocked' && region.cells.some((candidate) => cellKey(candidate) === cellKey(cell)));
}

export function templateBlockedCells(state: EncounterState): readonly GridCell[] {
  return terrainWallCells(state);
}

export function hasLineOfSight(
  state: EncounterState,
  from: GridCell,
  to: GridCell,
): boolean {
  return !traceTerrainLine(state, from, to).blocksSight;
}

export function coverTierBetween(
  state: EncounterState,
  from: GridCell,
  to: GridCell,
3198:  const subject = assertActiveActor(context, command.actor);
3742:function assertActiveActor(context: ReductionContext, actor: CombatantId): EncounterCombatantState {
3846:  assertActiveActor(context, actor);
4022:function beginAttack(
4750:  assertActiveActor(context, actor);
4822:  assertActiveActor(context, command.actor);
5196:  const subject = assertActiveActor(context, command.actor);
7134:      assertActiveActor(context, command.actor);
7529:  assertActiveActor(context, command.actor);
7667:    assertActiveActor(context, actor);

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/engine-query-port.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"offered attacks and saves\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/engine-query-port.test.ts'))return code.replace(\"const executionState = stateAtResolvedOrigin(\", \"let executionState = stateAtResolvedOrigin(\").replace(\"const sources = [\", \"if(use.kind==='saving_throw'){ const s=executionState.tokens.find(t=>t.combatantId===monster.profile.id).position; const t=executionState.tokens.find(t=>t.combatantId===targetId).position; const x=Math.floor((s.column+t.column)/2);executionState={...executionState,blockedCells:[...executionState.blockedCells,...Array.from({length:executionState.bounds.rows},(_,row)=>({column:x,row}))]};expect(traceCombatantLine(executionState,monster.profile.id,targetId).blocksSight).toBe(true);console.log('BLOCKED_SAVE_STILL_EXECUTES',path,use.actionId); } const sources = [\");}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/arena-basis-brutal-b.test.ts\",\"tests/unit/tools/d569-blind-experiment.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 11890ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

stdout | tests/unit/vtt/engine-query-port.test.ts > canonical engine query port > offered attacks and saves in every frozen landing family pass the reducer LOS rule
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal/seed-6203010.json web
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal-b/seed-6206007.json web
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal-b/seed-6206007.json web
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal-b/seed-6206007.json web

BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal/seed-6203010.json web
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal-b/seed-6206007.json web
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal-b/seed-6206007.json web
BLOCKED_SAVE_STILL_EXECUTES tests/fixtures/arena-basis-brutal-b/seed-6206007.json web

 ✓ tests/unit/vtt/engine-query-port.test.ts (19 tests | 18 skipped) 8319ms
     ✓ offered attacks and saves in every frozen landing family pass the reducer LOS rule  8318ms

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  05:26:09
   Duration  11.77s (transform 1.50s, setup 0ms, import 3.37s, tests 8.32s, environment 0ms)


exec
/bin/bash -lc "rg -n 'blocksSight|hasLineOfSight|target.*line.of.sight' src/combat/spells src/vtt/intent-resolver.ts src/vtt/engine-query-port.ts --glob '*.ts' | head -65; nl -ba tests/unit/vtt/engine-query-port.test.ts | sed -n '533,601p'; rg -n 'dispel_evil_and_good_mode|DISPEL_EVIL_AND_GOOD_MODES' src --glob '*.ts' | head -15; git status --short; git rev-parse --short HEAD" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
src/vtt/engine-query-port.ts:199:        | 'target_outside_line_of_sight'
src/vtt/engine-query-port.ts:1171:    if (trace.blocksSight) {
src/vtt/engine-query-port.ts:1172:      return { legal: false, codes: ['target_outside_line_of_sight'] };
src/vtt/intent-resolver.ts:281:        ).blocksSight)) return false;
   533	      const state = freshMonsterPlanningState(decodeArenaFixtureText(readFileSync(path, 'utf8')));
   534	      const monsters = state.combatants.filter((combatant) =>
   535	        combatant.profile.kind === 'monster' && combatant.life === 'living');
   536	      for (const monster of monsters) {
   537	        for (const option of availableEngineActorOptions(
   538	          state,
   539	          monster.profile.id,
   540	          OFFER_ENVIRONMENT,
   541	        )) {
   542	          const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
   543	          if (!resolution.valid) throw new Error(`${path}: offered option ${option.optionId} did not resolve.`);
   544	          const uses = resolution.mechanics.actionSlots.filter((use) =>
   545	            use.kind === 'attack' || use.kind === 'saving_throw');
   546	          if (uses.length === 0) continue;
   547	          checkedOffers += 1;
   548	          for (const use of uses) {
   549	            const targetId = use.targetIds[0];
   550	            if (targetId === undefined) throw new Error(`${path}: ${use.actionId} omitted its target.`);
   551	            const executionState = stateAtResolvedOrigin(
   552	              state,
   553	              monster.profile.id,
   554	              resolution.mechanics.finalPosition,
   555	            );
   556	            const sources = [
   557	              ...monsterActions(executionState, monster.profile.id),
   558	              ...monsterBonusActions(executionState, monster.profile.id),
   559	            ];
   560	            const action = sources.find(
   561	              (candidate): candidate is MonsterAttackAction | MonsterSavingThrowAction =>
   562	                (candidate.kind === 'attack' || candidate.kind === 'saving_throw') &&
   563	                candidate.id === use.actionId && candidate.kind === use.kind,
   564	            );
   565	            if (action === undefined) throw new Error(`${path}: resolved action ${use.actionId} is absent.`);
   566	            try {
   567	              if (action.kind === 'attack') {
   568	                reduceEncounter(
   569	                  executionState,
   570	                  monsterAttackCommand(action, monster.profile.id, targetId),
   571	                  () => 0.5,
   572	                );
   573	              } else {
   574	                reduceEncounter(
   575	                  executionState,
   576	                  monsterSavingThrowCommand(
   577	                    action,
   578	                    monster.profile.id,
   579	                    targetId,
   580	                    use.multiattackComponent === true ? 'none' : use.slot === 'bonus' ? 'bonus_action' : 'action',
   581	                  ),
   582	                  () => 0.5,
   583	                );
   584	              }
   585	            } catch (error) {
   586	              const message = error instanceof Error ? error.message : String(error);
   587	              if (!message.includes('Total Cover or is outside line of sight')) throw error;
   588	              losFailures.push(`${path}:${monster.profile.id}:${option.optionId}:${use.actionId}`);
   589	            }
   590	          }
   591	        }
   592	      }
   593	    }
   594	
   595	    expect(checkedOffers).toBe(214);
   596	    expect(losFailures).toEqual([]);
   597	  }, 30_000);
   598	
   599	  it('returns independently hand-computed melee reach and thrown normal range', () => {
   600	    const calls = [
   601	      { case: 'melee_reach', actionId: 'grab', actor: { column: 0, row: 0 }, target: { column: 2, row: 0 } },
src/vtt/turn-proposal.ts:85:export const DISPEL_EVIL_AND_GOOD_MODES = ['break_enchantment', 'dismissal'] as const;
src/vtt/turn-proposal.ts:86:export type DispelEvilAndGoodMode = (typeof DISPEL_EVIL_AND_GOOD_MODES)[number];
src/vtt/turn-proposal.ts:93:  | { readonly kind: 'dispel_evil_and_good_mode'; readonly values: typeof DISPEL_EVIL_AND_GOOD_MODES }
src/vtt/turn-proposal.ts:103:  | { readonly kind: 'dispel_evil_and_good_mode'; readonly value: DispelEvilAndGoodMode }
src/vtt/engine-round-session.ts:234:      use.activationChoice?.kind === 'dispel_evil_and_good_mode'
src/vtt/intent-resolver.ts:590:    case 'dispel_evil_and_good_mode':
src/vtt/intent-resolver.ts:591:      return choice.kind === 'dispel_evil_and_good_mode' && slot.values.some((value) => value === choice.value);
src/vtt/intent-resolver.ts:613:      : choice.kind === 'dispel_evil_and_good_mode'
src/vtt/offers/offer-declarations.ts:403:          ? { kind: 'dispel_evil_and_good_mode', values: ['break_enchantment', 'dismissal'] }
src/vtt/mcp/schemas.ts:127:  z.object({ kind: z.literal('dispel_evil_and_good_mode'), value: z.enum(['break_enchantment', 'dismissal']) }).strict(),
src/vtt/mcp/schemas.ts:143:  z.object({ kind: z.literal('dispel_evil_and_good_mode'), values: z.tuple([
src/vtt/challenge-room-fixture.ts:126:    'command_word', 'unicorns_blessing_spell', 'dispel_evil_and_good_mode',
src/vtt/challenge-room-fixture.ts:136:    case 'dispel_evil_and_good_mode':
src/vtt/mcp/engine-server.ts:634:          case 'dispel_evil_and_good_mode':
ebfcacaa

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_TEN_BRUTAL_GENERATOR_BYTES\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.includes('/src/vtt/room-generator.ts?landBefore'))return code.replace(\"return trace.tier === 'none' && "'!trace.blocksSight;","return trace.tier === '"'none';\");if(id.endsWith('/tests/unit/vtt/room-generator-los-cover.test.ts'))return code+\"\\nit('REVIEW_TEN_BRUTAL_GENERATOR_BYTES',{timeout:30000},async()=>{\\n const old=await import('../../../src/vtt/room-generator?landBefore');\\n expect(old.generatedLineIsOpen({tier:'none',blocksSight:true})).toBe(true);expect(generatedLineIsOpen({tier:'none',blocksSight:true})).toBe(false);const hash=await import('node:crypto');\\n for(let seed=6206001;seed<=6206010;seed++){\\n  const a=canonicalJson(decodeArenaBasisEnvelopeV1(generateRoom(seed,{difficulty:'brutal'}),{mode:'legacy_basis'}));\\n  const b=canonicalJson(decodeArenaBasisEnvelopeV1(old.generateRoom(seed,{difficulty:'brutal'}),{mode:'legacy_basis'}));\\n  expect(a).toBe(b);console.log('GENERATOR_EQUAL',seed,hash.createHash('sha256').update(a).digest('hex'));\\n }\\n});\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "python3 - <<'PY'
import subprocess
s=subprocess.check_output(['git','diff','--unified=0','10cc9f5e','ebfcacaa'],text=True)
print('added lines >120:',sum(len(l[1:])>120 for l in s.splitlines() if l.startswith('+') and not l.startswith('+++')))
PY
sha256sum src/vtt/engine-query-port.ts src/vtt/room-generator.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
added lines >120: 0
1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a  src/vtt/engine-query-port.ts
8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b  src/vtt/room-generator.ts

 succeeded in 3269ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

stdout | tests/unit/vtt/room-generator-los-cover.test.ts > REVIEW_TEN_BRUTAL_GENERATOR_BYTES
GENERATOR_EQUAL 6206001 2b1ba496b9f49321cc897eb991cb751e95081192d8578ea6de8a5bc1f436f30e
GENERATOR_EQUAL 6206002 72b57b6d8c11818b0b77fdf06c7eff4d006842bc7ae4e14f45ef55a5fb1695eb
GENERATOR_EQUAL 6206003 8806308423bbf441e10e2293ead1d0a51083f6829e72d803ece96516f5e7911e
GENERATOR_EQUAL 6206004 f9f1d1e6068967ad7c9f6a0f376a1add20af727c58f796ade696c1778c705621
GENERATOR_EQUAL 6206005 6a9c4c485e5692387a8426af60ce2d28488b301072a23744751092fa9e5a4bcc
GENERATOR_EQUAL 6206006 f6c69e7d6666505efa6f6c176bdd644cae59e32b49c3e226891a8e2da4f4c2d1
GENERATOR_EQUAL 6206007 d27e166615e9d48f685f071129d9fe9a452d17667130b54713f090d55a0a00bf
GENERATOR_EQUAL 6206008 c6b0d00dfa09917eb002249d11d1640a20087c6e8d5960e3af382514f9291f5e
GENERATOR_EQUAL 6206009 9a3d6d0578cc70d6d1a78993627f345c2cc888afcc433d51c5d438bf0b8e4804
GENERATOR_EQUAL 6206010 47595ab0e3e385d9e53b6fdf4120f1c2f6a29fd3b40ecf98ac8d13b14fd0edda

GENERATOR_EQUAL 6206001 2b1ba496b9f49321cc897eb991cb751e95081192d8578ea6de8a5bc1f436f30e
GENERATOR_EQUAL 6206002 72b57b6d8c11818b0b77fdf06c7eff4d006842bc7ae4e14f45ef55a5fb1695eb
GENERATOR_EQUAL 6206003 8806308423bbf441e10e2293ead1d0a51083f6829e72d803ece96516f5e7911e
GENERATOR_EQUAL 6206004 f9f1d1e6068967ad7c9f6a0f376a1add20af727c58f796ade696c1778c705621
GENERATOR_EQUAL 6206005 6a9c4c485e5692387a8426af60ce2d28488b301072a23744751092fa9e5a4bcc
GENERATOR_EQUAL 6206006 f6c69e7d6666505efa6f6c176bdd644cae59e32b49c3e226891a8e2da4f4c2d1
GENERATOR_EQUAL 6206007 d27e166615e9d48f685f071129d9fe9a452d17667130b54713f090d55a0a00bf
GENERATOR_EQUAL 6206008 c6b0d00dfa09917eb002249d11d1640a20087c6e8d5960e3af382514f9291f5e
GENERATOR_EQUAL 6206009 9a3d6d0578cc70d6d1a78993627f345c2cc888afcc433d51c5d438bf0b8e4804
GENERATOR_EQUAL 6206010 47595ab0e3e385d9e53b6fdf4120f1c2f6a29fd3b40ecf98ac8d13b14fd0edda

 ✓ tests/unit/vtt/room-generator-los-cover.test.ts (113 tests | 112 skipped) 75ms

 Test Files  1 passed (1)
      Tests  1 passed | 112 skipped (113)
   Start at  05:26:59
   Duration  3.16s (transform 1.36s, setup 0ms, import 3.00s, tests 75ms, environment 0ms)


 exited 1 in 56991ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/tools/d569-blind-experiment.test.ts (52 tests | 6 failed) 28365ms
     × validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment 1316ms
     ✓ keeps historical amendments exact while excluding Opus 5 from every active registry 1ms
     × dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows 1177ms
     ✓ rejects the Opus notes source counted in the scoring panel or eligibility 4ms
     ✓ rejects a panel of only two scoring seats in manifest and registered analysis 1ms
     ✓ rejects Opus 5 in any active arm or panel position  2275ms
     ✓ accepts only notes or empty exposure and rejects a deciding Opus policy 1ms
     ✓ rejects reversed notes and scoring stages and altered panel aggregation 1ms
     ✓ preserves all 32 committed input hash pins across Amendment 2  2249ms
     × adds exactly 180 separately labeled advice-assisted hint cells, 660 total 1121ms
     × consumes the frozen second encounter family for all 480 core cells 1129ms
     × records exact model effort cli and cliVersion for every observed row 1133ms
     × rejects either decisive integrity field alone while preserving rows with neither field 1143ms
     ✓ rejects changed advice baseline settings, primer, and model-default policy  1142ms
     ✓ rejects changed KB and fixture bytes  2278ms
     ✓ requires every Astra arm and its code-only versus minhint repair contrast  2282ms
     ✓ rejects an Astra hint arm missing its registered repair mode  1168ms
     ✓ rejects Astra blind when code-only repair is replaced by a minimal hint  1126ms
     ✓ rejects removal of the Astra code-only versus minhint repair comparison  1174ms
     ✓ registers direct high-effort Astra versus Sol contrasts in both modes  2287ms
     ✓ scores Astra by Astra and Sol by Sol while Fable has no player arm  2309ms
     ✓ rejects a mutated historical amendment record 1ms
     ✓ fluke_guard_uses_shuffle_seed: rejects a trained or replaced second encounter cohort  2311ms
     ✓ maxed_after_one_no_gain: refuses medium before two consecutive high misses and low before two medium misses 1ms
     ✓ invalid gates do not count and a repeated positive gain resets no-gain progress 0ms
     ✓ refusal interval boundary matrix classifies [ -0.1, -0.01 ] as 'noninferior' 0ms
     ✓ refusal interval boundary matrix classifies [ -0.1, +0 ] as 'noninferior' 0ms
     ✓ refusal interval boundary matrix classifies [ +0, +0 ] as 'noninferior' 0ms
     ✓ refusal interval boundary matrix classifies [ -0.1, 0.01 ] as 'not_noninferior' 0ms
     ✓ refusal interval boundary matrix classifies [ +0, 0.01 ] as 'not_noninferior' 0ms
     ✓ refusal interval boundary matrix classifies [ 0.01, 0.1 ] as 'not_noninferior' 0ms
     ✓ refusal_upper_bound_not_lower: fails when only the refusal lower bound clears the margin 0ms
     ✓ refusal_direction_is_blind_minus_advice: accepts a nonpositive interval and rejects a positive interval 0ms
     ✓ refusal_margin_is_at_most: accepts an upper bound exactly equal to the named zero margin 0ms
     ✓ refusal_interval_not_mean: a negative mean with a positive upper bound fails 0ms
     ✓ offense_is_strict_and_conjunctive: exact margin fails and just above passes only with refusal passing 0ms
     ✓ invalid_interval_guard: missing, non-finite, or reversed interval evidence never qualifies 0ms
     ✓ proves pairing direction, panel-seat averaging, components, and 100000-resample reproducibility  449ms
     ✓ registered analysis rejects both executed sides when Astra is absent 1ms
     ✓ registered analysis rejects an unknown third seat substituted for Astra 0ms
     ✓ requires Fable Astra and Sol when the opposite side failed execution 1ms
     ✓ registered analysis exposes no Opus input output or deciding path 1ms
     ✓ rejects Opus-only and mixed Opus scoring diagnostic subsets 0ms
     ✓ keeps registered scoring-seat subsets diagnostic and unable to qualify 1ms
     ✓ success_uses_executed_only: refused rows remain zero in primary while executed-only is selection-conditioned 7ms
     ✓ refusal_cluster_distribution_end_to_end: zero-and-one clusters fail, while swapped arms pass 41ms
     ✓ noninferiority_pools_bases: never lets hard success conceal brutal failure 6ms
     ✓ requires the second encounter cohort to point the same way and independently pass 12ms
     ✓ refusal_only_failure_propagates: either primary basis or second family prevents overall success 212ms
     ✓ override_exposes_top_before_blind_seal: requires sealing before top reveal and answer-key-only top evidence 0ms
     ✓ requires identical capsules and validates the sealed blind-intent hash 0ms
     ✓ defines improvement as final policy minus always-engine-top, not blind-intent subset gain 0ms
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts (47 tests | 10 failed) 24460ms
     ✓ uses one clean contiguous range disjoint from every existing seeded fixture family 0ms
     × pins seed 6206001 only after proving every brutal membership property from state 101ms
     × pins seed 6206002 only after proving every brutal membership property from state 25ms
     × pins seed 6206003 only after proving every brutal membership property from state 38ms
     × pins seed 6206004 only after proving every brutal membership property from state 61ms
     × pins seed 6206005 only after proving every brutal membership property from state 110ms
     × pins seed 6206006 only after proving every brutal membership property from state 143ms
     × pins seed 6206007 only after proving every brutal membership property from state 72ms
     × pins seed 6206008 only after proving every brutal membership property from state 37ms
     × pins seed 6206009 only after proving every brutal membership property from state 134ms
     × pins seed 6206010 only after proving every brutal membership property from state 380ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117001.json under the unattended scripted-party policy  941ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117002.json under the unattended scripted-party policy  871ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117003.json under the unattended scripted-party policy  1328ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117004.json under the unattended scripted-party policy  728ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117005.json under the unattended scripted-party policy  833ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117006.json under the unattended scripted-party policy  433ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117007.json under the unattended scripted-party policy  1108ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117008.json under the unattended scripted-party policy  491ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117009.json under the unattended scripted-party policy  581ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117010.json under the unattended scripted-party policy  796ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117011.json under the unattended scripted-party policy  898ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117012.json under the unattended scripted-party policy  528ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117013.json under the unattended scripted-party policy  360ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203001.json under the unattended scripted-party policy  448ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203002.json under the unattended scripted-party policy 238ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203003.json under the unattended scripted-party policy  2728ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203004.json under the unattended scripted-party policy  432ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203005.json under the unattended scripted-party policy  741ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203006.json under the unattended scripted-party policy  427ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203007.json under the unattended scripted-party policy 195ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203008.json under the unattended scripted-party policy  745ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203009.json under the unattended scripted-party policy  662ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203010.json under the unattended scripted-party policy  770ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206001.json under the unattended scripted-party policy  572ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206002.json under the unattended scripted-party policy 223ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206003.json under the unattended scripted-party policy  341ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206004.json under the unattended scripted-party policy 288ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206005.json under the unattended scripted-party policy  606ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206006.json under the unattended scripted-party policy  973ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206007.json under the unattended scripted-party policy  385ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206008.json under the unattended scripted-party policy 216ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206009.json under the unattended scripted-party policy  727ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206010.json under the unattended scripted-party policy  1054ms
     ✓ replays end_turn after draining the final unattended legendary-action window 9ms
     ✓ rejects rather than skips an execution_failed row from a seeded fixture  676ms
     ✓ fails structurally when a brutal-named fixture does not satisfy the membership predicates 2ms

⎯⎯⎯⎯⎯⎯ Failed Tests 16 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment
AssertionError: expected [ …(7) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "second_family_brutal_productivity",
+   "second_family_brutal_productivity",
+   "second_family_brutal_productivity",
+   "second_family_brutal_productivity",
+   "second_family_brutal_productivity",
+   "second_family_brutal_productivity",
+   "second_family_brutal_productivity",
+ ]

 ❯ tests/unit/tools/d569-blind-experiment.test.ts:409:27
    407|   it('validates the exact v5 Opus 4.8 arms and notes-only Fable Astra …
    408|     const frozen = manifest();
    409|     expect(codes(frozen)).toEqual([]);
       |                           ^
    410|     expect(frozen.version).toBe('d569-blind-experiment-v5');
    411|     expect(frozen.preregistrationAmendments).toEqual(EXPECTED_V5_AMEND…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/16]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows
TypeError: Invalid D569 experiment manifest: second_family_brutal_productivity
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:473:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/16]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > adds exactly 180 separately labeled advice-assisted hint cells, 660 total
TypeError: Invalid D569 experiment manifest: second_family_brutal_productivity
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:635:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/16]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > consumes the frozen second encounter family for all 480 core cells
TypeError: Invalid D569 experiment manifest: second_family_brutal_productivity
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:644:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/16]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > records exact model effort cli and cliVersion for every observed row
TypeError: Invalid D569 experiment manifest: second_family_brutal_productivity
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:653:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/16]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects either decisive integrity field alone while preserving rows with neither field
TypeError: Invalid D569 experiment manifest: second_family_brutal_productivity
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:683:18

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206001 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206001-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206002 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206002-monster-1 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206003 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206003-monster-1 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206004 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206004-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206005 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206005-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206006 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206006-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206007 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206007-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206008 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206008-monster-1 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206009 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206009-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/16]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-b.test.ts > second brutal arena basis family > pins seed 6206010 only after proving every brutal membership property from state
AssertionError: combatant:generated-6206010-monster-2 has no productive first-turn offer: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ assertBrutalMembership tests/unit/vtt/arena-basis-brutal-b.test.ts:392:84
    390|           slot.kind === 'use_world_object'));
    391|     });
    392|     expect(productive, `${monster.profile.id} has no productive first-…
       |                                                                                    ^
    393|   }
    394|
 ❯ tests/unit/vtt/arena-basis-brutal-b.test.ts:433:7

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/16]⎯


 Test Files  2 failed (2)
      Tests  16 failed | 83 passed (99)
   Start at  05:26:15
   Duration  56.78s (transform 1.79s, setup 0ms, import 3.86s, tests 52.83s, environment 0ms)


 succeeded in 120559ms:
offer-environment architecture self-test: 77 active fixtures passed
IB1-F1 probes: allowed-helper=0, indirect-canonical=1, type-of-value=1
IB2-F1 probes: namespace-export=1, imported-namespace-export=1, unrelated-namespace-export=0
active CommonJS/ESM origin fixtures: canonical-require-direct.cts, canonical-require-destructured.cts, canonical-create-require-computed.mts, canonical-require-computed.cts, canonical-import-equals.cts, canonical-commonjs-reexport.cts, canonical-commonjs-named-reexport.cts, canonical-dynamic-import.mts, canonical-star-export.mts
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offers format probes: offers-format-env-retyped.ts=1, offers-format-policy-retyped.ts=1, offers-format-catalog-retyped.ts=1, offers-format-imported.ts=0
query-port construction probes: literal-and-clones=8, spread=1, test-double=0
Running 1 tests

----------- Case Details -----------
[1;42;37mPASS[0m no-alternative-offer-environment-construction  ................

test result: [32mok[0m. 1 passed; 0 failed;
offer-environment architecture self-test: 77 active fixtures passed
IB1-F1 probes: allowed-helper=0, indirect-canonical=1, type-of-value=1
IB2-F1 probes: namespace-export=1, imported-namespace-export=1, unrelated-namespace-export=0
active CommonJS/ESM origin fixtures: canonical-require-direct.cts, canonical-require-destructured.cts, canonical-create-require-computed.mts, canonical-require-computed.cts, canonical-import-equals.cts, canonical-commonjs-reexport.cts, canonical-commonjs-named-reexport.cts, canonical-dynamic-import.mts, canonical-star-export.mts
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offers format probes: offers-format-env-retyped.ts=1, offers-format-policy-retyped.ts=1, offers-format-catalog-retyped.ts=1, offers-format-imported.ts=0
query-port construction probes: literal-and-clones=8, spread=1, test-double=0
offer-environment architecture: 1624 TypeScript files checked
runtime export allowlist: buildOfferEnvironment only

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/tactical-evaluator-r02.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"compares ordered registry\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/tactical-evaluator-r02.test.ts'))return code.replace('const initiativeOrder = [PRIEST, ...SCOUTS, ...BANDITS] as const;', \"const {resolveEngineActorOption}=await import('../../../src/vtt/intent-resolver');for(const option of [priestAttack,...scoutOptions,...banditOptions]){const resolved=resolveEngineActorOption(state,option,OFFER_ENVIRONMENT);if("'!resolved.valid)throw Error('"'invalid');const trace=traceCombatantLine(state,option.actorId,FIGHTER,{sourceAnchor:resolved.mechanics.finalPosition});console.log('R02_ORIGIN',String(option.actorId),JSON.stringify(resolved.mechanics.finalPosition),trace.tier,trace.blocksSight);} const initiativeOrder = [PRIEST, ...SCOUTS, ...BANDITS] as const;\");}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "nl -ba src/vtt/offers/offer-declarations.ts | sed -n '390,408p'; sed -n '3742,3763p' src/combat/encounter.ts; rg -n 'requiresSight|hasLineOfSight' src/combat/encounter.ts | tail -20; sed -n '555,580p' src/combat/cover.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
   390	      use: {
   391	        kind: 'cast_spell',
   392	        sourceActionId: engineActionId(action.id),
   393	        spellId: engineSpellId(spell.id),
   394	        targets: selection.targets,
   395	        area: selection.area,
   396	      },
   397	      movement: HOLD,
   398	      resourceCostLabels: poolId === null ? [] : [`${String(poolId)}:${String(remaining)}/${String(maximum)}`],
   399	      omittedRiders: [],
   400	      activationChoice: spell.id === 'command'
   401	        ? { kind: 'command_word', values: ['approach', 'flee', 'grovel', 'halt', 'drop'] }
   402	        : spell.id === 'dispel-evil-and-good'
   403	          ? { kind: 'dispel_evil_and_good_mode', values: ['break_enchantment', 'dismissal'] }
   404	          : spell.id === 'calm-emotions'
   405	            ? {
   406	                kind: 'calm_emotions_per_target',
   407	                targetIds: selection.targets.map((entry) => entry.combatantId),
   408	                values: ['suppress_charmed_frightened', 'indifferent_toward_monster_side'],
function assertActiveActor(context: ReductionContext, actor: CombatantId): EncounterCombatantState {
  if (context.state.activeCombatant !== actor) {
    throw new EncounterRuleError('validation', `Combatant ${actor} is not the active combatant.`);
  }
  const subject = combatant(context.state, actor);
  if (subject.life !== 'living') {
    throw new EncounterRuleError('validation', `Combatant ${actor} cannot act while ${subject.life}.`);
  }
  if (!isCombatantOnBoard(context.state, actor)) {
    throw new EncounterRuleError('validation', `Combatant ${actor} is absent from the board.`);
  }
  if (!isEncounterParticipant(context.state.alerting, actor)) {
    throw new EncounterRuleError('validation', `Combatant ${actor} has not joined the encounter.`);
  }
  return subject;
}

function assertCanUseActions(context: ReductionContext, actor: CombatantId): void {
  if (isIncapacitated(combatantConditions(context.state, actor))) {
    throw new EncounterRuleError('validation', `Combatant ${actor} is Incapacitated.`);
  }
}
2114:export function hasLineOfSight(
4876:    requiresSight: true,
7120:    opportunityTrigger === null && command.requiresSight === true &&
9306:        (!declaration.requiresSight || canCombatantSee(state, reactor, event.source));
9315:        (!declaration.requiresSight || canCombatantSee(state, reactor, event.caster));
9484:    definition.targeting.requiresSight === true
/** The canonical 2014 corner-to-corner trace for two bare grid cells. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
    ? 'current'

 succeeded in 3463ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

stdout | tests/unit/vtt/tactical-evaluator-r02.test.ts > R02-like canonical tactical query > compares ordered registry allocations with exact post-grant Bless conditioning
R02_ORIGIN combatant:generated-5117009-monster-1 {"column":13,"row":4} none false
R02_ORIGIN combatant:generated-5117009-monster-3 {"column":18,"row":4} half false
R02_ORIGIN combatant:generated-5117009-monster-5 {"column":19,"row":5} three_quarters false
R02_ORIGIN combatant:generated-5117009-monster-4 {"column":17,"row":4} half false
R02_ORIGIN combatant:generated-5117009-monster-6 {"column":18,"row":5} none false

R02_ORIGIN combatant:generated-5117009-monster-1 {"column":13,"row":4} none false
R02_ORIGIN combatant:generated-5117009-monster-3 {"column":18,"row":4} half false
R02_ORIGIN combatant:generated-5117009-monster-5 {"column":19,"row":5} three_quarters false
R02_ORIGIN combatant:generated-5117009-monster-4 {"column":17,"row":4} half false
R02_ORIGIN combatant:generated-5117009-monster-6 {"column":18,"row":5} none false

 ✓ tests/unit/vtt/tactical-evaluator-r02.test.ts (2 tests | 1 skipped) 394ms
     ✓ compares ordered registry allocations with exact post-grant Bless conditioning  393ms

 Test Files  1 passed (1)
      Tests  1 passed | 1 skipped (2)
   Start at  05:27:33
   Duration  3.37s (transform 1.28s, setup 0ms, import 2.90s, tests 394ms, environment 0ms)


codex
I recounted 214 options: 142 hard, 57 brutal, and 15 brutal-b. They contain 312 attack components and four saves; none has multiple targets. The save coverage gap is reproducible: I inserted blocking walls into all four save execution states, confirmed `blocksSight === true`, and the agreement test still passed. The generator’s old/new outputs were byte-identical for all ten brutal-b seeds.

exec
/bin/bash -lc "sed -n '9465,9500p' src/combat/encounter.ts; sed -n '7100,7138p' src/combat/encounter.ts; nl -ba src/vtt/room-generator.ts | sed -n '1225,1252p'; git diff 10cc9f5e ebfcacaa -- src/vtt/engine-query-port.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
      }
      const roundDelta = context.state.round - subject.deathAt.round;
      const withinWindow = roundDelta >= 0 && (
        roundDelta < definition.operation.maximumDeathAgeRounds ||
        (roundDelta === definition.operation.maximumDeathAgeRounds &&
          (context.state.activeInitiativeIndex ?? 0) <= subject.deathAt.initiativeIndex)
      );
      if (!withinWindow) {
        throw new RevivifyRuleError('target_dead_too_long', REVIVIFY_CITATIONS.deathWindowAndHitPoints);
      }
    }
  }
  if (
    definition.targeting.kind !== 'self' &&
    definition.targeting.kind !== 'area' &&
    definition.targeting.kind !== 'area_selected' &&
    definition.targeting.kind !== 'all_in_range' &&
    definition.targeting.kind !== 'remote' &&
    definition.targeting.kind !== 'utility' &&
    definition.targeting.requiresSight === true
  ) {
    const unseen = targets.find((target) => !canCombatantSee(context.state, command.actor, target));
    if (unseen !== undefined) {
      throw new VisionTargetingRuleError('target_not_seen', command.actor, unseen);
    }
  }
  if (definition.components.verbal) endHidden(context, command.actor, 'verbal_spell');
  spendSpellCastingCost(context, definition, command);
  const interception = offerReaction(context, {
    kind: 'creature_casts_spell', caster: command.actor, spellId: definition.id,
    hasComponents: definition.components.verbal || definition.components.somatic || definition.components.material !== null,
  });
  if (interception?.cancelledTrigger === true) {
    emit(context, {
      type: 'spell_cast_intercepted', caster: command.actor, spellId: definition.id,
      reactor: interception.reactor, reactionSpellId: interception.spellId,
    }
    if (
      command.attackBonus !== declared.attackBonus ||
      command.criticalFloor !== 20 ||
      canonicalJson(command.damage) !== canonicalJson(declaredMonsterDamage(declared.damage)) ||
      canonicalJson(command.monsterOnHit ?? []) !== canonicalJson(
        executableMonsterOnHitEffects(declared.onHit),
      )
    ) {
      throw new EncounterRuleError('validation', `Combatant ${command.actor}'s monster attack declaration was altered.`);
    }
  }
  if (!isCombatantOnBoard(context.state, command.actor)) {
    throw new EncounterRuleError('validation', `Combatant ${command.actor} is absent from the board.`);
  }
  if (!isCombatantOnBoard(context.state, command.target)) {
    throw new EncounterRuleError('validation', `Combatant ${command.target} is absent from the board.`);
  }
  callForHelpWhenNpcAttacked(context, command.actor, command.target);
  if (
    opportunityTrigger === null && command.requiresSight === true &&
    !canCombatantSee(context.state, command.actor, command.target)
  ) {
    throw new VisionTargetingRuleError('target_not_seen', command.actor, command.target);
  }
  let wasFirstAttack = false;
  const typeChoice = command.type === 'attack'
    ? attackDamageTypeSelection(context.state, command)
    : null;
  const maneuver = command.type === 'attack'
    ? selectedManeuver(context.state, command)
    : null;
  if (command.type === 'attack') {
    if (execution === 'ordinary') {
      assertActiveActor(context, command.actor);
      wasFirstAttack = combatant(context.state, command.actor).turn.action.kind === 'available';
      beginAttack(context, command);
      activateRecklessAttack(context, command, wasFirstAttack);
    }
  1225	}
  1226	
  1227	export function generatedLineIsOpen(
  1228	  trace: Pick<TerrainLineTrace, 'tier' | 'blocksSight'>,
  1229	): boolean {
  1230	  return trace.tier === 'none' && !trace.blocksSight;
  1231	}
  1232	
  1233	function hasOpenOpposingRay(state: EncounterState): boolean {
  1234	  if (livingOpposingPairs(state).some(({ source, target }) =>
  1235	    generatedLineIsOpen(traceCombatantLine(state, source.profile.id, target.profile.id)))) return true;
  1236	  const occupied = occupiedCombatantCells(state);
  1237	  return state.combatants.some((source) => {
  1238	    if (source.life !== 'living' || !state.tokens.some((token) =>
  1239	      token.combatantId === source.profile.id)) return false;
  1240	    for (let row = 0; row < state.bounds.rows; row += 1) {
  1241	      for (let column = 0; column < state.bounds.columns; column += 1) {
  1242	        const target = { column, row };
  1243	        if (!occupied.has(cellKey(target)) && generatedLineIsOpen(
  1244	          traceCombatantLineToCells(state, source.profile.id, [target]),
  1245	        )) return true;
  1246	      }
  1247	    }
  1248	    return false;
  1249	  });
  1250	}
  1251	
  1252	function traceToCellHasAuthoredSource(
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index cbf840ab..4c084d64 100644
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -196,6 +196,7 @@ export type EngineReachResult =
         | 'action_range_unresolved'
         | 'target_out_of_range'
         | 'target_has_total_cover'
+        | 'target_outside_line_of_sight'
       )[];
     };
 
@@ -1163,9 +1164,14 @@ function reach(state: EncounterState, request: EngineReachRequest): EngineReachR
   const actorSpace = queryCombatantSpaceAt(state, request.actorId, origin);
   const targetSpace = queryCombatantSpace(state, request.targetId);
   const distanceFeet = minimumSpaceDistance(actorSpace, targetSpace);
-  if ((action.kind === 'attack' || action.kind === 'saving_throw') &&
-    traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: origin }).tier === 'total') {
-    return { legal: false, codes: ['target_has_total_cover'] };
+  if (action.kind === 'attack' || action.kind === 'saving_throw') {
+    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
+      sourceAnchor: origin,
+    });
+    if (trace.blocksSight) {
+      return { legal: false, codes: ['target_outside_line_of_sight'] };
+    }
+    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
   }
   if (action.kind === 'attack') {
     const verdict = tacticalRangeVerdictAtDistance(distanceFeet, monsterAttackRange(action));

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/replay.test.ts\",\"tests/unit/vtt/detection-reactions.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "python3 - <<'PY'
from fractions import Fraction as F
from itertools import product
corners=lambda x,y:[(x+a,y+b) for a,b in product(range(2),repeat=2)]
def enters(a,b,c):
 lo,hi=F(0),F(1)
 for i in range(2):
  d=b[i]-a[i]
  if d==0:
   if not c[i]<a[i]<c[i]+1:return False
  else:
   p,q=sorted([F(c[i]-a[i],d),F(c[i]+1-a[i],d)]);lo=max(lo,p);hi=min(hi,q)
 return lo<hi
seams=[];interior=[]
for a,b in product(corners(14,5),corners(1,6)):
 (interior if any(enters(a,b,c) for c in [(8,5),(8,6)]) else seams).append((a,b))
print('16 rays:',len(interior),'enter interiors;',len(seams),'seams',seams)
print('(14,6)->(1,6) shared edge t=',F(5,13),F(6,13))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
16 rays: 12 enter interiors; 4 seams [((14, 6), (1, 6)), ((14, 6), (2, 6)), ((15, 6), (1, 6)), ((15, 6), (2, 6))]
(14,6)->(1,6) shared edge t= 5/13 6/13

codex
The three LAND-01 suites passed 133/133. The retained suites have exactly the expected 16 reds: ten brutal-b productivity pins and six D569 manifest checks; their other 83 tests passed. Both production mutants were killed. The remaining review finding is the save-LOS coverage gap in the agreement property; the two production changes themselves look correct.

 succeeded in 39582ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ✓ tests/unit/vtt/detection-reactions.test.ts (17 tests) 51ms
 ✓ tests/unit/vtt/replay.test.ts (19 tests) 36507ms
     ✓ PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte  3753ms
     ✓ M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state  1853ms
     ✓ mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant  1819ms
     ✓ gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped  1844ms
     ✓ M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request  1816ms
     ✓ M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing  2571ms
     ✓ M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability  2379ms
     ✓ M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active  2000ms
     ✓ M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash  1845ms
     ✓ CORRUPTION-EVENT identifies the first bad event record and field  1858ms
     ✓ CORRUPTION-TRANSCRIPT identifies the first bad transcript content record  1797ms
     ✓ OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and view hashes  2444ms
     ✓ CORRECTION-ATTEMPTS are schema-validated telemetry and remain non-authoritative  2388ms
     ✓ OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact  4324ms
     ✓ REPLAY-COMMAND reads only the recorded bundle and approved fixture  3596ms

 Test Files  2 passed (2)
      Tests  36 passed (36)
   Start at  05:28:04
   Duration  39.41s (transform 1.20s, setup 0ms, import 2.77s, tests 36.56s, environment 0ms)


exec
/bin/bash -lc "sha256sum src/vtt/engine-query-port.ts src/vtt/room-generator.ts; git status --short; git diff --numstat 10cc9f5e ebfcacaa -- tests/fixtures; nl -ba tests/unit/vtt/arena-basis-brutal-b.test.ts | sed -n '146,167p'; nl -ba src/combat/encounter.ts | sed -n '12467,12486p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a  src/vtt/engine-query-port.ts
8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b  src/vtt/room-generator.ts
   146	  return actors;
   147	}
   148	
   149	function deterministicActivationChoice(option: EngineOfferableOption): EngineActivationChoice | undefined {
   150	  const slot = option.activationChoice;
   151	  if (slot === undefined || slot === null) return undefined;
   152	  switch (slot.kind) {
   153	    case 'command_word': return { kind: slot.kind, value: slot.values[0] };
   154	    case 'unicorns_blessing_spell': return { kind: slot.kind, value: slot.values[0] };
   155	    case 'dispel_evil_and_good_mode': return { kind: slot.kind, value: slot.values[0] };
   156	    case 'calm_emotions_per_target': return {
   157	      kind: slot.kind,
   158	      selections: slot.targetIds.map((targetId) => ({ targetId, mode: slot.values[0] })),
   159	    };
   160	  }
   161	}
   162	
   163	function dryRunMonsterPlan(state: EncounterState): ReadonlyMap<CombatantId, AuthorizedEngineTurnProposal> {
   164	  const actorIds = [...livingMonsterIds(state)].sort((left, right) => left.localeCompare(right));
   165	  const planningState = projectFutureMonsterTurns(state, actorIds);
   166	  return new Map(actorIds.map((actorId) => {
   167	    const report = actorOpportunityReport(
 12467	          throw new EncounterRuleError('validation', `Combatant ${command.actor}'s monster save declaration was altered.`);
 12468	        }
 12469	      }
 12470	      assertActiveActor(context, command.actor);
 12471	      spendCost(context, command.actor, command.cost, 'Force saving throw');
 12472	      const save = resolveTargetSave(
 12473	        context,
 12474	        command.actor,
 12475	        command.target,
 12476	        command.ability,
 12477	        command.dc,
 12478	        command.rollMode,
 12479	        null,
 12480	        'other',
 12481	        command.rollModifierEffectIds,
 12482	      );
 12483	      const damage = resolveTargetDamage(context, command.actor, command.target, command.damage);
 12484	      const amount =
 12485	        save.outcome === 'failure'
 12486	          ? damage.total

codex
## LAND-F1 — P2: the agreement property does not establish save LOS

At [engine-query-port.test.ts:574](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/engine-query-port.test.ts:574), saving throws are checked only by executing `force_save`. That reducer branch validates the declaration, spends the action, and resolves the save **without checking LOS** ([encounter.ts:12451](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:12451)).

**Reproduced:** in memory, I inserted a full blocking column into each of the four save execution states and asserted `traceCombatantLine(...).blocksSight === true`. The existing agreement property still passed **1/1**:

- `6203010`: one Web save.
- `6206007`: three Web saves.

Thus the property’s save portion cannot demonstrate the claimed sightline agreement. This is an existing reducer limitation exposed by the new witness, not a regression introduced by the production change.

**Fix:** explicitly assert the resolved-origin trace is sight-clear and non-total for every attack/save component; add a blocked-save query witness and save-specific mutant. Describe reducer execution as an additional check, without claiming that `force_save` itself enforces LOS.

## Other checks

### Query/execution alignment

The production fix is correct for the stated trace predicate:

- Query: `engine-query-port.ts:1167–1174`, with `sourceAnchor: origin`.
- Attack execution: `encounter.ts:7183–7203`, using the actor’s current position.
- Real proposal execution moves first: `engine-round-session.ts:264–289`.
- Both routes use the same footprint calculation, source/target IDs, creature exclusions, and default optical-blocker inputs through `cover.ts:584–594`.

At the same resulting state, these inputs agree. Movement-triggered state changes can invalidate an earlier proposal; teleporting directly to `finalPosition` does not test those interactions.

Relevant gate audit:

- Resolver action-position constraints delegate to `queries.reach`: `intent-resolver.ts:284`.
- Spell-position sight constraints check `blocksSight`: `:279–281`.
- Ordinary attacks, suspected-square attacks, and spell attacks check sight: `encounter.ts:7201`, `:7491`, `:8568`.
- Sight-required spell targets use canonical detection: `:9484–9488`.
- `force_save` is the exception described above.
- Query-port `:1234/:1547` calculate tactical cover; `:1830` reports cover. They are not authorization gates and correctly remain unchanged.

### Agreement-property recount

| Family | Options checked |
|---|---:|
| Hard | 142 |
| Brutal | 57 |
| Brutal-b | 15 |
| **Total** | **214** |

These contain **316 resolved components**: 204 multiattack attack components, 108 ordinary attacks, and four saves. All target lists contained exactly one target. No attack/save option was silently skipped.

The property resets state between components, so it tests individual LOS compatibility rather than complete sequential execution. Its fixed roll occurs after attack LOS validation. All sampled components were main-action uses; the bonus-save cost branch matches production but is not exercised by these fixtures.

### Generator and geometry

`generatedLineIsOpen` requires both conditions at `room-generator.ts:1230`; both callers use it at `:1235/:1243`.

Independent rational-arithmetic enumeration found:

- **12/16** corner rays enter a blocker interior.
- **4/16** run along row 6 between `(8,5)/(8,6)`.
- For `(14,6)→(1,6)`, the shared edge occupies `t ∈ [5/13,6/13]`.

Removing the lower flank opens those four seam rays.

In-memory pre/post predicate comparison regenerated **10/10 brutal-b seeds byte-identically**. The probe also verified that the two loaded predicates disagree on `{tier:'none', blocksSight:true}`, preventing an accidental same-module comparison. The fix does not repair the frozen cohort’s productivity.

### Probability pins and activation choice

Independent Python `Fraction` enumeration over d20 rolls and all four Bless faces reproduced:

- No Bless: **2702281/6250000 = 0.43236496**.
- Bless Priest/Scouts: **1035529241349/1638400000000 = 0.6320368904718018**.

The fold matches `tactical-evaluator.ts:786–814`. Runtime origin probes confirmed Priest `(13,4)` none/clear, Scout `(18,4)` half/clear, and Bandit `(17,4)` half/clear. Both unchanged control assertion expressions are byte-identical to `10cc9f5e`.

The brutal-b helper preserves `report.defaultOption` and supplies its declared first choice (`arena-basis-brutal-b.test.ts:149–159,178–189`). Dispel Evil and Good declares `['break_enchantment','dismissal']` at `offer-declarations.ts:403`; resolver validation remains active at `intent-resolver.ts:590–591`. No resolver failure is swallowed.

## Commands and results — my runs

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
git diff --check 10cc9f5e ebfcacaa
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-command-outcomes.mjs
```

Type checks and diff check exited **0**; architecture checks completed successfully, including **77 active self-test fixtures** and **1,624 TypeScript files**.

Vitest ran through `node --input-type=module` with programmatic `startVitest`, configuration bundling disabled, one thread worker, `cache:false`, and in-memory transforms:

| Suites | Result |
|---|---|
| Query port + generator LOS + R02 | **133/133 passed** |
| Brutal-b | **37 passed / 10 expected productivity failures** |
| D569 blind experiment | **46 passed / 6 expected manifest failures** |
| Replay + detection | **36/36 passed, 39.41 seconds** |

Exactly the expected **16 retained reds** remain. Timing is below approximately 41 seconds.

Own production mutants:

- Disable query sight refusal: **both witnesses failed**; offered-option count became **451**.
- Relax generator predicate to tier-only: **witness failed**.
- Save execution-state blocker probe: **survived**, supporting LAND-F1.

Scope is exactly **six files, 325+/22−**; no fixture changes, no added line over 120 columns, clean checkout at `ebfcacaa`.

Production hashes printed before and after were unchanged:

```text
engine-query-port.ts 1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a
room-generator.ts   8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b
```

VERDICT: REJECT (0 P1, 1 P2)
REVIEW DONE.
tokens used
1,862,608
## LAND-F1 — P2: the agreement property does not establish save LOS

At [engine-query-port.test.ts:574](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/engine-query-port.test.ts:574), saving throws are checked only by executing `force_save`. That reducer branch validates the declaration, spends the action, and resolves the save **without checking LOS** ([encounter.ts:12451](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:12451)).

**Reproduced:** in memory, I inserted a full blocking column into each of the four save execution states and asserted `traceCombatantLine(...).blocksSight === true`. The existing agreement property still passed **1/1**:

- `6203010`: one Web save.
- `6206007`: three Web saves.

Thus the property’s save portion cannot demonstrate the claimed sightline agreement. This is an existing reducer limitation exposed by the new witness, not a regression introduced by the production change.

**Fix:** explicitly assert the resolved-origin trace is sight-clear and non-total for every attack/save component; add a blocked-save query witness and save-specific mutant. Describe reducer execution as an additional check, without claiming that `force_save` itself enforces LOS.

## Other checks

### Query/execution alignment

The production fix is correct for the stated trace predicate:

- Query: `engine-query-port.ts:1167–1174`, with `sourceAnchor: origin`.
- Attack execution: `encounter.ts:7183–7203`, using the actor’s current position.
- Real proposal execution moves first: `engine-round-session.ts:264–289`.
- Both routes use the same footprint calculation, source/target IDs, creature exclusions, and default optical-blocker inputs through `cover.ts:584–594`.

At the same resulting state, these inputs agree. Movement-triggered state changes can invalidate an earlier proposal; teleporting directly to `finalPosition` does not test those interactions.

Relevant gate audit:

- Resolver action-position constraints delegate to `queries.reach`: `intent-resolver.ts:284`.
- Spell-position sight constraints check `blocksSight`: `:279–281`.
- Ordinary attacks, suspected-square attacks, and spell attacks check sight: `encounter.ts:7201`, `:7491`, `:8568`.
- Sight-required spell targets use canonical detection: `:9484–9488`.
- `force_save` is the exception described above.
- Query-port `:1234/:1547` calculate tactical cover; `:1830` reports cover. They are not authorization gates and correctly remain unchanged.

### Agreement-property recount

| Family | Options checked |
|---|---:|
| Hard | 142 |
| Brutal | 57 |
| Brutal-b | 15 |
| **Total** | **214** |

These contain **316 resolved components**: 204 multiattack attack components, 108 ordinary attacks, and four saves. All target lists contained exactly one target. No attack/save option was silently skipped.

The property resets state between components, so it tests individual LOS compatibility rather than complete sequential execution. Its fixed roll occurs after attack LOS validation. All sampled components were main-action uses; the bonus-save cost branch matches production but is not exercised by these fixtures.

### Generator and geometry

`generatedLineIsOpen` requires both conditions at `room-generator.ts:1230`; both callers use it at `:1235/:1243`.

Independent rational-arithmetic enumeration found:

- **12/16** corner rays enter a blocker interior.
- **4/16** run along row 6 between `(8,5)/(8,6)`.
- For `(14,6)→(1,6)`, the shared edge occupies `t ∈ [5/13,6/13]`.

Removing the lower flank opens those four seam rays.

In-memory pre/post predicate comparison regenerated **10/10 brutal-b seeds byte-identically**. The probe also verified that the two loaded predicates disagree on `{tier:'none', blocksSight:true}`, preventing an accidental same-module comparison. The fix does not repair the frozen cohort’s productivity.

### Probability pins and activation choice

Independent Python `Fraction` enumeration over d20 rolls and all four Bless faces reproduced:

- No Bless: **2702281/6250000 = 0.43236496**.
- Bless Priest/Scouts: **1035529241349/1638400000000 = 0.6320368904718018**.

The fold matches `tactical-evaluator.ts:786–814`. Runtime origin probes confirmed Priest `(13,4)` none/clear, Scout `(18,4)` half/clear, and Bandit `(17,4)` half/clear. Both unchanged control assertion expressions are byte-identical to `10cc9f5e`.

The brutal-b helper preserves `report.defaultOption` and supplies its declared first choice (`arena-basis-brutal-b.test.ts:149–159,178–189`). Dispel Evil and Good declares `['break_enchantment','dismissal']` at `offer-declarations.ts:403`; resolver validation remains active at `intent-resolver.ts:590–591`. No resolver failure is swallowed.

## Commands and results — my runs

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
git diff --check 10cc9f5e ebfcacaa
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-command-outcomes.mjs
```

Type checks and diff check exited **0**; architecture checks completed successfully, including **77 active self-test fixtures** and **1,624 TypeScript files**.

Vitest ran through `node --input-type=module` with programmatic `startVitest`, configuration bundling disabled, one thread worker, `cache:false`, and in-memory transforms:

| Suites | Result |
|---|---|
| Query port + generator LOS + R02 | **133/133 passed** |
| Brutal-b | **37 passed / 10 expected productivity failures** |
| D569 blind experiment | **46 passed / 6 expected manifest failures** |
| Replay + detection | **36/36 passed, 39.41 seconds** |

Exactly the expected **16 retained reds** remain. Timing is below approximately 41 seconds.

Own production mutants:

- Disable query sight refusal: **both witnesses failed**; offered-option count became **451**.
- Relax generator predicate to tier-only: **witness failed**.
- Save execution-state blocker probe: **survived**, supporting LAND-F1.

Scope is exactly **six files, 325+/22−**; no fixture changes, no added line over 120 columns, clean checkout at `ebfcacaa`.

Production hashes printed before and after were unchanged:

```text
engine-query-port.ts 1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a
room-generator.ts   8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b
```

VERDICT: REJECT (0 P1, 1 P2)
REVIEW DONE.
