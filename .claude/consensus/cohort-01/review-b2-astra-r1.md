
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a0b236-798c-7973-b05a-1c1fc7403093
--------
user
RULES (binding, restated): You are the REVIEWER (gpt-6-astra, MEDIUM per D627, RESUMED — you reviewed COHORT-01 Batch 1). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify — DETACHED clean checkout at 8284a91c (= e92ebc93 B1 + Batch 2). Sandbox read-only; in-memory when /tmp is read-only; no edits, no git writes, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; never port 4173; no full vitest, Playwright, build. Readable: the FROZEN plan .tmp-plans/2026-09-17-cohort-01-plan.md (sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69, 403 lines), the MAIN repo's .claude/decisions.md (D653–D655) and .claude/consensus/cohort-01/impl-b2-sol.md. Model calls WILL fail. Report exact commands and numbers; end with the named marker.

TASK: review `git diff e92ebc93 8284a91c` (4 files, 229+/45−: new tests/unit/vtt/arena-basis-brutal-v2.test.ts; tests/unit/vtt/{room-generator,arena-basis-brutal-b}.test.ts; one comment in tests/unit/tools/d569-second-family-manifest.test.ts) against the plan's Batch 2 and PLAN-F6. Supervisor verification: tsc 0/0; V-freeze 0; the v2 suite 30 red, every failure ENOENT on the declared missing fixture (not a syntax/import error); room-generator 56/56; brutal-b 47/47; second-family 50/50. CHECK: (1) Retirement scope: EXACTLY the frozen families' productivity loops removed (6203 in room-generator, 6206 in brutal-b) with the rationale comment; every byte pin, structural/integrity check, SHA and round-execution test retained — diff the removed assertions against the plan's list; anything else removed is a finding. (2) The v2 suite: 30 exact fixture declarations (6209/6210/6211 paths and seeds), membership proven from decoded state BEFORE any hash, the productivity predicate per PLAN-F6 (positive movement OR an attack/save/cast/world-object use; sight/cover checks only on targeted offensive components: resolved-origin trace sight-clear and non-total — is the trace call the query's own, as in engine-query-port.ts?), the Dash-only witness and the three mutant witnesses (forced productive, movement arm deleted, blocksSight treated as open) — reproduce in memory that each mutant is caught. (3) Are the 30 witnesses written so that a fixture that EXISTS but fails membership is red for membership (not swallowed by a try/catch or an early return)? (4) Does the suite read fixtures through declareTestInputs (the D583 dependency index) so Batches 3–5's new files are tracked? (5) tsc 0/0; no fixture bytes; no added line > 120. OUTPUT: findings B2-Fn with severity, file:line, evidence, fix; "VERDICT: ACCEPT" or "VERDICT: REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll verify the checkout and frozen plan, compare the retired assertions against Batch 2’s scope, then run the targeted suites and in-memory mutants.

exec
/bin/bash -lc 'git status --short && git rev-parse HEAD && sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md && wc -l .tmp-plans/2026-09-17-cohort-01-plan.md && git diff --stat e92ebc93 8284a91c && git diff e92ebc93 8284a91c' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
8284a91c9b5cae6faf58a246aff2ce4355ae5bf0
4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69  .tmp-plans/2026-09-17-cohort-01-plan.md
403 .tmp-plans/2026-09-17-cohort-01-plan.md
 .../unit/tools/d569-second-family-manifest.test.ts |   1 +
 tests/unit/vtt/arena-basis-brutal-b.test.ts        |  22 +--
 tests/unit/vtt/arena-basis-brutal-v2.test.ts       | 220 +++++++++++++++++++++
 tests/unit/vtt/room-generator.test.ts              |  31 +--
 4 files changed, 229 insertions(+), 45 deletions(-)
diff --git a/tests/unit/tools/d569-second-family-manifest.test.ts b/tests/unit/tools/d569-second-family-manifest.test.ts
index 93df1172..8c92f313 100644
--- a/tests/unit/tools/d569-second-family-manifest.test.ts
+++ b/tests/unit/tools/d569-second-family-manifest.test.ts
@@ -144,6 +144,7 @@ describe('D569 independent second-family manifest', () => {
     (path) => {
       const frozen = room(path);
       expect(generatedRoomIntegrityViolations(frozen, inputs.fixtures.readText(path))).toEqual([]);
+      // D635/D642/D643: 6207 keeps historical integrity/static checks; 6211 v2 owns live productivity.
       expect(brutalRoomMembershipViolations(frozen)
         .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
     },
diff --git a/tests/unit/vtt/arena-basis-brutal-b.test.ts b/tests/unit/vtt/arena-basis-brutal-b.test.ts
index 3613a2eb..98504498 100644
--- a/tests/unit/vtt/arena-basis-brutal-b.test.ts
+++ b/tests/unit/vtt/arena-basis-brutal-b.test.ts
@@ -190,7 +190,9 @@ function dryRunMonsterPlan(state: EncounterState): ReadonlyMap<CombatantId, Auth
     };
     const resolution = TURN_PROPOSAL_RESOLVER.resolve(planningState, proposal);
     if (!resolution.valid) {
-      throw new Error(`Dry-run plan was refused for ${actorId}: ${resolution.refusals.map((entry) => entry.code).join(', ')}.`);
+      throw new Error(
+        `Dry-run plan was refused for ${actorId}: ${resolution.refusals.map((entry) => entry.code).join(', ')}.`,
+      );
     }
     return [actorId, {
       proposal,
@@ -375,22 +377,8 @@ function assertBrutalMembership(
   expect(reduced.state.revision, `seed ${String(seed)} reducer load`).toBe(state.revision + 1);
   expect(reduced.state.initiative, `seed ${String(seed)} initiative load`).toHaveLength(state.combatants.length);
 
-  const planningState = freshMonsterPlanningState(state);
-  for (const monster of planningState.combatants.filter((combatant) =>
-    combatant.profile.kind === 'monster')) {
-    const productive = availableEngineActorOptions(
-      planningState,
-      monster.profile.id,
-      OFFER_ENVIRONMENT,
-    ).some((option) => {
-      const resolution = resolveEngineActorOption(planningState, option, OFFER_ENVIRONMENT);
-      return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
-        resolution.mechanics.actionSlots.some((slot) =>
-          slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
-          slot.kind === 'use_world_object'));
-    });
-    expect(productive, `${monster.profile.id} has no productive first-turn offer`).toBe(true);
-  }
+  // D635/D642/D643: 6206 keeps structural, reducer, SHA, and round-execution history;
+  // 6209/6210/6211 own the live productivity contract under the sealed-wall geometry.
 
   // The byte pin lives with, and cannot pass instead of, the state-derived membership checks above.
   expect(sha256(fixtureBytes), `seed ${String(seed)} fixture bytes`).toBe(expectedDigest);
diff --git a/tests/unit/vtt/arena-basis-brutal-v2.test.ts b/tests/unit/vtt/arena-basis-brutal-v2.test.ts
new file mode 100644
index 00000000..eb57122d
--- /dev/null
+++ b/tests/unit/vtt/arena-basis-brutal-v2.test.ts
@@ -0,0 +1,220 @@
+import { describe, expect, it } from 'vitest';
+import { monsterCombatantProfile } from '../../../src/combat/combatant';
+import { traceCombatantLine } from '../../../src/combat/cover';
+import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
+import { GIANT_SPIDER } from '../../../src/combat/statblocks/wild-beasts';
+import { feet, type CombatantId } from '../../../src/combat/values';
+import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '../../../src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '../../../src/vtt/room-generator';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '../../../tools/d569-second-family-manifest';
+import { declareTestInputs } from '../../helpers/test-inputs';
+import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
+
+const ACTIVE_FIXTURES = [
+  { family: 'brutal-v2', seed: 6_209_001, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' },
+  { family: 'brutal-v2', seed: 6_209_002, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' },
+  { family: 'brutal-v2', seed: 6_209_003, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' },
+  { family: 'brutal-v2', seed: 6_209_004, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' },
+  { family: 'brutal-v2', seed: 6_209_005, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' },
+  { family: 'brutal-v2', seed: 6_209_006, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' },
+  { family: 'brutal-v2', seed: 6_209_007, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' },
+  { family: 'brutal-v2', seed: 6_209_008, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' },
+  { family: 'brutal-v2', seed: 6_209_009, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' },
+  { family: 'brutal-v2', seed: 6_209_010, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' },
+  { family: 'brutal-b-v2', seed: 6_210_001, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json' },
+  { family: 'brutal-b-v2', seed: 6_210_002, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json' },
+  { family: 'brutal-b-v2', seed: 6_210_003, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json' },
+  { family: 'brutal-b-v2', seed: 6_210_004, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json' },
+  { family: 'brutal-b-v2', seed: 6_210_005, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json' },
+  { family: 'brutal-b-v2', seed: 6_210_006, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json' },
+  { family: 'brutal-b-v2', seed: 6_210_007, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json' },
+  { family: 'brutal-b-v2', seed: 6_210_008, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json' },
+  { family: 'brutal-b-v2', seed: 6_210_009, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json' },
+  { family: 'brutal-b-v2', seed: 6_210_010, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json' },
+  { family: 'brutal-2-v2', seed: 6_211_001, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json' },
+  { family: 'brutal-2-v2', seed: 6_211_002, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json' },
+  { family: 'brutal-2-v2', seed: 6_211_003, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json' },
+  { family: 'brutal-2-v2', seed: 6_211_004, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json' },
+  { family: 'brutal-2-v2', seed: 6_211_005, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json' },
+  { family: 'brutal-2-v2', seed: 6_211_006, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json' },
+  { family: 'brutal-2-v2', seed: 6_211_007, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json' },
+  { family: 'brutal-2-v2', seed: 6_211_008, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json' },
+  { family: 'brutal-2-v2', seed: 6_211_009, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json' },
+  { family: 'brutal-2-v2', seed: 6_211_010, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json' },
+] as const;
+
+const inputs = declareTestInputs({ fixtures: ACTIVE_FIXTURES.map(({ path }) => path) });
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+
+  // D635/D642/D643: live cohorts additionally require every targeted offensive component
+  // to remain sight-clear and non-total at its resolved origin. room-generator.ts:1227's
+  // generated-room predicate is intentionally stricter: it requires no cover at all.
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function monsterHasProductiveOption(state: EncounterState, actorId: CombatantId): boolean {
+  return availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).some((option) => {
+    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
+    return resolution.valid && resolvedMechanicsIsProductive(state, resolution.mechanics);
+  });
+}
+
+function everyLivingMonsterIsProductive(state: EncounterState): boolean {
+  const planningState = freshMonsterPlanningState(state);
+  return planningState.combatants
+    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life === 'living')
+    .every((monster) => monsterHasProductiveOption(planningState, monster.profile.id));
+}
+
+function decodedClone(state: EncounterState): EncounterState {
+  return decodeEncounterStateV1(JSON.parse(JSON.stringify(state)) as unknown, 'session');
+}
+
+function actionlessMonsterState(speed: 0 | 30): {
+  readonly state: EncounterState;
+  readonly actorId: CombatantId;
+} {
+  const base = monsterProfile(`active-productivity-${String(speed)}`);
+  const actor = { ...base, rules: { ...base.rules, speed: feet(speed) } };
+  const target = playerProfile(`active-productivity-target-${String(speed)}`);
+  return {
+    state: freshMonsterPlanningState(decodedClone(createEncounter({
+      bounds: { columns: 20, rows: 3 },
+      combatants: [actor, target],
+      tokens: [placedToken(actor, 0, 1), placedToken(target, 15, 1)],
+    }))),
+    actorId: actor.id,
+  };
+}
+
+function openWebState(): {
+  readonly state: EncounterState;
+  readonly actorId: CombatantId;
+  readonly targetId: CombatantId;
+} {
+  const base = monsterCombatantProfile(GIANT_SPIDER, {
+    combatantId: 'combatant:active-productivity-spider',
+    tokenId: 'token:active-productivity-spider',
+  });
+  const actor = { ...base, rules: { ...base.rules, speed: feet(0) } };
+  const target = playerProfile('active-productivity-web-target');
+  return {
+    state: freshMonsterPlanningState(decodedClone(createEncounter({
+      bounds: { columns: 6, rows: 3 },
+      combatants: [actor, target],
+      tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],
+    }))),
+    actorId: actor.id,
+    targetId: target.id,
+  };
+}
+
+describe('active brutal v2 arena membership', () => {
+  it('reserves exactly three contiguous ten-seed fixture families', () => {
+    expect(ACTIVE_FIXTURES).toHaveLength(30);
+    expect(ACTIVE_FIXTURES.map(({ seed }) => seed)).toEqual([
+      ...Array.from({ length: 10 }, (_unused, index) => 6_209_001 + index),
+      ...Array.from({ length: 10 }, (_unused, index) => 6_210_001 + index),
+      ...Array.from({ length: 10 }, (_unused, index) => 6_211_001 + index),
+    ]);
+    expect(new Set(ACTIVE_FIXTURES.map(({ path }) => path))).toHaveLength(30);
+  });
+
+  it.each(ACTIVE_FIXTURES)(
+    '$family seed $seed satisfies active state-derived membership at $path',
+    ({ path, seed }) => {
+      const fixtureBytes = inputs.fixtures.readText(path);
+      const room = JSON.parse(fixtureBytes) as GeneratedRoom;
+      const decoded = decodeArenaFixtureText(fixtureBytes);
+
+      expect(room.spec.seed).toBe(seed);
+      expect(generatedRoomIntegrityViolations(room, fixtureBytes)).toEqual([]);
+      expect(brutalRoomMembershipViolations(room)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
+      expect(everyLivingMonsterIsProductive(decoded)).toBe(true);
+    },
+  );
+
+  it('rejects a living monster whose only valid options are nonproductive', () => {
+    const fixture = actionlessMonsterState(0);
+    expect(fixture.state.combatants.find((entry) => entry.profile.id === fixture.actorId)?.life)
+      .toBe('living');
+    expect(availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
+      .map(({ label }) => label)).toEqual(['Dodge', 'End Turn']);
+    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(false);
+  });
+
+  it('keeps a positive-movement-only Dash monster productive', () => {
+    const fixture = actionlessMonsterState(30);
+    const resolved = availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
+      .map((option) => ({ option, resolution: resolveEngineActorOption(
+        fixture.state,
+        option,
+        OFFER_ENVIRONMENT,
+      ) }));
+    const dash = resolved.find(({ option }) => option.label === 'Dash');
+    if (dash === undefined || !dash.resolution.valid) throw new Error('Dash witness did not resolve.');
+
+    expect(dash.resolution.mechanics.movementCostFeet).toBeGreaterThan(0);
+    expect(dash.resolution.mechanics.actionSlots.map(({ kind }) => kind)).toEqual(['dash']);
+    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(true);
+  });
+
+  it('rejects targeted offense whose resolved origin has an optically blocked trace', () => {
+    const fixture = openWebState();
+    const web = availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
+      .find((option) => option.actionSlots.some((slot) =>
+        slot.use.kind === 'saving_throw' && slot.use.actionId === 'web'));
+    if (web === undefined) throw new Error('Blocked-target witness omitted Web.');
+    const resolution = resolveEngineActorOption(fixture.state, web, OFFER_ENVIRONMENT);
+    if (!resolution.valid) throw new Error('Blocked-target witness could not resolve Web.');
+
+    const blocked = decodedClone({
+      ...fixture.state,
+      blockedCells: Array.from({ length: 3 }, (_unused, row) => ({ column: 3, row })),
+    });
+    expect(traceCombatantLine(blocked, fixture.actorId, fixture.targetId, {
+      sourceAnchor: resolution.mechanics.finalPosition,
+    })).toMatchObject({ tier: 'half', blocksSight: true });
+    expect(resolvedMechanicsIsProductive(fixture.state, resolution.mechanics)).toBe(true);
+    expect(resolvedMechanicsIsProductive(blocked, resolution.mechanics)).toBe(false);
+  });
+});
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index b6eae9ad..267bbde7 100644
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -18,18 +18,10 @@ import {
   ROOM_GRID_DIMENSIONS,
   type GeneratedRoom,
 } from '../../../src/vtt/room-generator';
-import {
-  brutalRoomMembershipViolations,
-  hardRoomMembershipViolations,
-} from '../../../tools/d569-second-family-manifest';
+import { hardRoomMembershipViolations } from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
-import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
-import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
-import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
-const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
-
 const BASIS_SEEDS = [
   3_943_001,
   3_943_002,
@@ -75,11 +67,6 @@ const BRUTAL_BASIS_FIXTURE_DIGESTS = {
   6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
   6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
 } as const;
-const BRUTAL_PRODUCTIVITY_SEEDS = [
-  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
-  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
-] as const;
-
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -585,20 +572,8 @@ describe('seeded room generator', () => {
     }
   });
 
-  it.each(BRUTAL_PRODUCTIVITY_SEEDS)(
-    'generates brutal seed %s with executable casters, dense terrain, scaled pressure, and productive monsters',
-    (seed) => {
-      const brutal = generateRoom(seed, { difficulty: 'brutal' });
-      expect(brutalRoomMembershipViolations(brutal)).toEqual([]);
-      const state = freshMonsterPlanningState(brutal.encounter.state);
-      const monsters = state.combatants.filter((candidate) => candidate.profile.kind === 'monster');
-      for (const monster of monsters) {
-        const productive = availableEngineActorOptions(state, monster.profile.id, OFFER_ENVIRONMENT)
-          .some((option) => resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid);
-        expect(productive, monster.profile.id).toBe(true);
-      }
-    },
-  );
+  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
+  // own the live productivity contract under the sealed-wall geometry.
 
   it.each([
     [3, 900],

exec
/bin/bash -lc "sed -n '/"'^## D653 /,/''^## D656 /p'"' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md; tail -100 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/cohort-01/impl-b2-sol.md; sed -n '104,140p' .tmp-plans/2026-09-17-cohort-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
## D653 — SUPERVISOR (2026-09-17 22:08): COHORT-01 B1 ACCEPTED by astra r1 (medium; 1 P3; saved review-b1-astra-r1.md); WALL-01 r3 VERIFIED BY ME and committed bc6422bf; astra review of the whole WALL-01 candidate dispatched; COHORT-01 B2 dispatched
ASTRA B1: real generator in memory — 20/20 fixtures × both generations differ only at \$.encounter.state.foggedCells, 20/20 raw hashes match, v1 validation 0 violations; projection deletes exactly the committed own key, generated bytes untouched; rebound `round` and root changes still fail both regenerations; missing historical keys and v2 legacy keys reject; only frozen brutal productivity retired (integrity/reducer loading, static budget/caster/terrain, hashes, ledger, namespaces, both regenerations enforced); the strict v1/v2 union sound; N2 is a real enforcement witness (runArena rows with synthetic adapters rejected at 32,768 vs v5's 8,192; guard mutant → 2 red); v6 seam correctly deferred; tsc 0/0; freeze 0; 191 added lines, 0 over 120; its runs: second-family 50/50, v5 27/27 (in-memory I/O), ignore-second-generation mutant 49/1. B1-F1 (P3): the brutal_productivity filter at second-family-manifest.test.ts:147 lacks the D635/D642/D643 rationale comment — folded into Batch 2. NOTE for Batch 6 (astra): substituting canonical regeneration in the blind-experiment helper clears the six reds but exposes a whitespace-only expectation at d569-blind-experiment.test.ts:727.
WALL-01 r3 VERIFIED BY ME (verify-wall-01-r3.log; seam-ab at 6887755f + patch): tsc 0/0; 0 production files in the diff; vertex-rule-null mutant → exactly 1 re-pinned scene red (scene-snapshot; the other four scenes were re-authored to NOT depend on sealing, by design); 176/176 across the five scene suites + visibility-field + two-room-fixture; los-cover 110/112 (the two 5 s budget tests at 5.14/5.40 s — perf, D635.53); pair 36/36 in 39 s. Committed bc6422bf on claude/vis-field (6887755f candidate + r3). Astra (resume 01a0a642…, medium; brief review-impl-wall-01-astra.md; log review-wall-01-astra-r1.log) reviews the whole candidate on seam-ab at bc6422bf, including the geometry enumeration (endpoint vertices, three/four-blocker vertices, direction of travel), the gcd/progress ordering, physical-cover invariance, the added per-ray cost, and the r3 derivations.
B2 (RED v2 membership witnesses + frozen-contract retirement; predicate preserved per PLAN-F6) dispatched fresh sol on claude/cohort-01 at e92ebc93 (brief impl-cohort-01-b2.md; log impl-b2.log). Generation (Batches 3–5) remains gated on WALL-01's acceptance.

## D654 — SUPERVISOR (2026-09-17 22:23): WALL-01 REJECTED by astra r1 (medium; 1 P1: WALL-F3; saved review-impl-wall-01-astra-r1.md) — CONFIRMED BY ME; the defect is MY SPEC: the WALL-01 brief dictated "endpoint vertices are NOT vertex-checked"; fix r4 dispatched
ASTRA (2.49 M tokens): geometry otherwise sound (single-blocker touch and outer-face graze clear; shared edges block; interior diagonal pairs block including TL+BR with a TR→BL ray; three/four-blocker vertices covered; Fraction enumeration matched the gcd enumeration for 600 ordered integer endpoint pairs; ordering/tie-break explicit; physical tier independent — its "total whenever firstBlockingCell" mutant killed); r3 derivations reproduced (fog (4,3) → (4,3),(8,3),(9,3); fighter +(8,2),(9,2),(8,3),(9,3); all three hash transitions reproduced by substituting baseline vs candidate cover.ts in memory; only visibleState.cells/concealedCells changed; fingerprint dd802783…; the three replacement blockers have zero diagonal neighbours; five opened pairs / Half + Three-Quarters / both 90-ft shots asserted); six files 387+/49−; tsc 0/0; 66/66 across the suites it could run; perf: the productive-option los-cover test 4,935 ms baseline → 5,740 ms candidate (gcd + up to four lookups per interior vertex) — deferred perf work, not blocking. WALL-F3 (P1): a COMPLETE stepped wall (6×6; blockers col 1 rows 0–1, col 2 rows 2–5; junction (2,2) between (1,1) and (2,2)) leaks: of the 16 corner rays from observer (2,1) to target (0,3), 10 hit interiors, 2 hit the sealed vertex strictly inside, and 4 START at the sealed junction (the observer's bottom-left corner) and pass through the pinch — the endpoint exclusion lets them through; production says visible/seen. VERIFIED BY ME on seam-ab at bc6422bf: (2,1)→(0,3) tier none / blocksSight FALSE; reversed half / FALSE; same-side (2,1)→(5,1) clear (correct). ROOT CAUSE = my WALL-01 brief: "Endpoint vertices (t = 0 or 1) are NOT vertex-checked — the cell-interior rule governs there"; sol implemented what I specified. Finding against my own work, at full length: I specified a geometric rule from intuition without enumerating the endpoint case; astra's rational enumeration did. RULE (D654): at an endpoint vertex with a sealed pair, the ray blocks iff it passes through the pinch — leaves the source corner into the open quadrant diagonally opposite the source cell's quadrant (or, mirrored, arrives at the target corner from the opposite quadrant); edge-aligned departures fall to the shared-edge rule; same-side departures stay clear; zero-length corner contact across a sealed junction = blocked. Fix r4 dispatched (resume 01a0b20e-61fa…; brief impl-vis-field-wall-01-fix-r4.md): witnesses for source/target endpoint, same-side control, adjacent-corner zero-length, three mutants; re-run of every scene suite with D569 handling if pins move; counts and generation bytes redone — if generation bytes change, STOP (it would alter the cohort plan's premise).

## D655 — SUPERVISOR (2026-09-17 22:51): COHORT-01 B2 VERIFIED BY ME and committed 8284a91c on claude/cohort-01; astra medium review dispatched (resumed B1 reviewer)
VERIFIED (verify-b2.log, clean checkout at e92ebc93 + patch): tsc 0/0; diff-check 0; 0 long lines; V-freeze 0 and no fixture files touched; the new v2 suite 30 red, every failure ENOENT on the declared missing fixture; room-generator 56/56; brutal-b 47/47; second-family 50/50. Read by me: the removed code in both frozen suites is exactly the per-monster productivity loop, replaced by the D635/D642/D643 rationale. Generation (Batches 3–5) still gated on WALL-01 (fix r4 in flight).
-  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,
-  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,
-] as const;
-
 const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {
   6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',
   6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',
@@ -585,20 +572,8 @@
     }
   });
 
-  it.each(BRUTAL_PRODUCTIVITY_SEEDS)(
-    'generates brutal seed %s with executable casters, dense terrain, scaled pressure, and productive monsters',
-    (seed) => {
-      const brutal = generateRoom(seed, { difficulty: 'brutal' });
-      expect(brutalRoomMembershipViolations(brutal)).toEqual([]);
-      const state = freshMonsterPlanningState(brutal.encounter.state);
-      const monsters = state.combatants.filter((candidate) => candidate.profile.kind === 'monster');
-      for (const monster of monsters) {
-        const productive = availableEngineActorOptions(state, monster.profile.id, OFFER_ENVIRONMENT)
-          .some((option) => resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid);
-        expect(productive, monster.profile.id).toBe(true);
-      }
-    },
-  );
+  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
+  // own the live productivity contract under the sealed-wall geometry.
 
   it.each([
     [3, 900],

tokens used
210,503
Implemented Batch 2 only.

Changed:

- Added [arena-basis-brutal-v2.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/arena-basis-brutal-v2.test.ts) with 30 exact v2 fixture witnesses and three productivity mutant witnesses.
- Retired only frozen 6203 productivity assertions in [room-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts).
- Retired only frozen 6206 productivity assertions in [arena-basis-brutal-b.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/arena-basis-brutal-b.test.ts).
- Added the requested 6207/6211 D635/D642/D643 rationale comment in [d569-second-family-manifest.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-second-family-manifest.test.ts).
- Generated no fixtures and did not begin Batch 3 or Batch 6.

Verification:

- Frozen plan: SHA-256 `4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69`, 403 lines.
- Namespace audits matched exactly, statuses `0/1/0`.
- RED-first command:
  `npx vitest run tests/unit/vtt/arena-basis-brutal-v2.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner`
  → `30 failed / 4 passed`; all 30 failures were `ENOENT` for the declared missing v2 fixtures.
- Frozen suites:
  - second-family: `50/50` passed.
  - room-generator: `56/56` passed.
  - brutal-b: `47/47` passed.
  - No frozen productivity RED remains.
- Mutants:
  - Force productivity true: nonproductive witness failed `1/1`.
  - Delete movement arm: Dash-only witness failed `1/1`.
  - Treat `blocksSight:true` as open: blocked-target witness failed `1/1`.
- Deferred RED inventory command covered 91 tests: `82 passed / 9 failed`.
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` → exit 0.
- `git diff --check` → exit 0.
- Lines over 120 characters → 0.
- V-freeze before and after → exit 0; all 32 SHA-256 values identical.
- Final status contains exactly:
  - `tests/unit/tools/d569-second-family-manifest.test.ts`
  - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
  - `tests/unit/vtt/room-generator.test.ts`
  - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`

Remaining RED titles:

- Active v2 title template: `'<family>' seed <seed> satisfies active state-derived membership at '<path>'`.
  - `brutal-v2`: 6209001–6209010.
  - `brutal-b-v2`: 6210001–6210010.
  - `brutal-2-v2`: 6211001–6211010.
  - Cause for each: declared cohort fixture is missing, as required before Batches 3–5.

- `validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment`
  - Cause: historical helper produces 40 second-family regeneration mismatches.
- `dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows`
  - Cause: `second_family_first_regeneration`.
- `adds exactly 180 separately labeled advice-assisted hint cells, 660 total`
  - Cause: `second_family_first_regeneration`.
- `consumes the frozen second encounter family for all 480 core cells`
  - Cause: `second_family_first_regeneration`.
- `records exact model effort cli and cliVersion for every observed row`
  - Cause: `second_family_first_regeneration`.
- `rejects either decisive integrity field alone while preserving rows with neither field`
  - Cause: `second_family_first_regeneration`.

- `projects fresh options for every requested generated-room monster turn`
  - Cause: D642 now yields `Dodge, End Turn` instead of the stale Longbow expectation; deferred to Batch 9.
- `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`
  - Cause: the frozen Room-8 plan differs under sealed-wall geometry; deferred to Batch 9.
- `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`
  - Cause: the frozen speculative scene now produces zero candidates; deferred to Batch 9.

COHORT-01 B2 DONE
**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
zero v1 violations, all negative witnesses green.

### Batch 2 — RED active membership and frozen-productivity retirement

**Allowed files (3):**

- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
- `tests/unit/vtt/room-generator.test.ts`
- `tests/unit/vtt/arena-basis-brutal-b.test.ts`

**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
resolved origin has a blocked or total trace and MUST fail.

**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
then preserve the existing productivity predicate exactly: each living monster has some valid
option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
therefore remains productive. If the qualifying option has targeted attack/save/cast components,
each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
movement-only/world-object qualification does not invent a LOS target. Cite the contract and
`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.

Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.

**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
suite is RED only for 30 missing files; frozen suites have no productivity red.

### Batch 3 — generate primary brutal-v2 6209001-6209010

exec
/bin/bash -lc "sed -n '475,585p' tests/unit/vtt/room-generator.test.ts; sed -n '1100,1185p' src/vtt/engine-query-port.ts; rg -n 'traceCombatantLine|sourceAnchor' src/vtt/engine-query-port.ts; sed -n '292,385p' tests/unit/vtt/arena-basis-brutal-b.test.ts; sed -n '250,293p' tools/d569-second-family-manifest.ts; sed -n '1,70p' tests/unit/combat/fixtures.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:

  it.each(HARD_BASIS_SEEDS)('pins frozen hard arena basis seed %s byte-for-byte', (seed) => {
    // Every hard basis seed has Priest monster-1: Spirit Guardians is 1/day and each Divine Aid spell is 3/day.
    const path = `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-hard/seed-${typeof seed}.json`;
    const fixtureBytes = inputs.fixtures.readText(path);
    expect(`${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`).toBe(
      expectedCreatureSpaceFixture(fixtureBytes),
    );
  });

  it.each(HARD_BASIS_SEEDS)('derives every required hard feature from frozen seed %s', (seed) => {
    const path = `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-hard/seed-${typeof seed}.json`;
    const room = JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
    expect(hardRoomMembershipViolations(room)).toEqual([]);
  });

  it.each(BRUTAL_BASIS_SEEDS)('pins frozen brutal arena basis seed %s byte-for-byte', (seed) => {
    const path = `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json` as
      `tests/fixtures/arena-basis-brutal/seed-${typeof seed}.json`;
    const generatedBytes = `${canonicalJson(generateRoom(seed, { difficulty: 'brutal' }))}\n`;
    const fixtureBytes = inputs.fixtures.readText(path);
    const legacyGeneratedBytes = `${legacyCreatureSpaceProjection(
      generateRoom(seed, { difficulty: 'brutal' }),
    )}\n`;
    if (seed === 6_203_001) {
      const legacyFixture = JSON.parse(fixtureBytes) as GeneratedRoom;
      // D635.48: the raw brutal fixture carries the same obsolete V1 fog key.
      delete (legacyFixture.encounter.state as { foggedCells?: unknown }).foggedCells;
      expect(legacyGeneratedBytes).toBe(`${canonicalJson(legacyFixture)}\n`);
    }
    expect(sha256(legacyGeneratedBytes),
      `seed ${String(seed)} pre-replacement generation changed`).toBe(
      BRUTAL_BASIS_GENERATED_DIGESTS[seed],
    );
    expect(sha256(fixtureBytes), `seed ${String(seed)} typed fixture changed`).toBe(
      BRUTAL_BASIS_FIXTURE_DIGESTS[seed],
    );
    if (seed === 6_203_001) expect(generatedBytes).toBe(expectedCreatureSpaceFixture(fixtureBytes));
  });

  it('applies only the three 6204 post-sampling replacements without changing RNG-derived room data', () => {
    expect(D466_GENERATED_ROOM_OVERRIDES.map((override) => override.seed)).toEqual([
      6_204_004, 6_204_006, 6_204_009,
    ]);
    for (let seed = 6_204_001; seed <= 6_204_010; seed += 1) {
      const typedSeed = seed as keyof typeof D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS;
      const room = generateRoom(seed, { difficulty: 'brutal' });
      expect(
        sha256(canonicalJson(d466NonRosterProjection(room))),
        `seed ${String(seed)} changed terrain, party, ids, placement, or RNG-derived state`,
      ).toBe(D466_6204_NON_ROSTER_DIGESTS[typedSeed]);
      expect(room.spec.challengeBudgetEighths, `seed ${String(seed)} changed CR budget`).toBe(
        D466_6204_CR_SPEND[typedSeed],
      );
      expect(room.spec.challengeSpentEighths, `seed ${String(seed)} changed CR spend`).toBe(
        D466_6204_CR_SPEND[typedSeed],
      );

      const override = D466_GENERATED_ROOM_OVERRIDES.find((candidate) => candidate.seed === seed);
      if (override === undefined) {
        expect(
          sha256(canonicalJson(room.spec.monsterRoster)),
          `seed ${String(seed)} roster changed; making the override also fire for 6204005 must fail`,
        ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
        continue;
      }

      const replacement = d466CreatureReplacement(override.original);
      const replacementEntries = room.spec.monsterRoster.filter(
        (entry) => entry.statblockId === replacement.replacement,
      );
      expect(replacementEntries.length, `seed ${String(seed)} did not receive its replacement`).toBeGreaterThan(0);
      expect(room.spec.monsterRoster.some((entry) => entry.statblockId === replacement.original)).toBe(false);
      for (const entry of replacementEntries) {
        expect(entry).toMatchObject({
          challengeRating: replacement.challengeRating,
          challengeEighths: replacement.crEighths,
        });
        const combatant = room.encounter.state.combatants.find(
          (candidate) => candidate.profile.id === entry.combatantId,
        );
        expect(combatant?.profile).toEqual(monsterCombatantProfile(
          d466ReplacementStatblock(replacement),
          { combatantId: entry.combatantId, tokenId: entry.tokenId },
        ));
      }
      const restoredRoster = room.spec.monsterRoster.map((entry) =>
        entry.statblockId !== replacement.replacement ? entry : {
          ...entry,
          statblockId: replacement.original,
        });
      expect(
        sha256(canonicalJson(restoredRoster)),
        `seed ${String(seed)} changed sampled roster data beyond the typed id replacement`,
      ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
    }
  });

  // D635/D642/D643: 6203 keeps its historical byte/digest pins above; 6209/6210/6211
  // own the live productivity contract under the sealed-wall geometry.

  it.each([
    [3, 900],
    [4, 1_500],
    [5, 3_000],
    [6, 4_000],
  ] as const)('builds four full level-matched PCs at level %s', (level, targetXp) => {
    const party = heldoutParty(level);
    const room = generateRoom(7_850_001 + level, {

function approach(state: EncounterState, request: EngineApproachRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const originDistance = minimumSpaceDistanceToCells(
    queryCombatantSpaceAt(state, request.actorId, start),
    [request.target],
  );
  const result = findPathToBest(encounterMovementWorld(state), {
    actorId: request.actorId,
    start,
    maximumCost: feet(Math.min(availableBudget, maximumPathCost(state))),
    rank: (cell) => {
      const distance = minimumSpaceDistanceToCells(
        queryCombatantSpaceAt(state, request.actorId, cell),
        [request.target],
      );
      return distance < originDistance ? [distance] : null;
    },
  });
  return result.kind === 'found'
    ? { legal: true, cells: result.cells, costFeet: result.cost, budgetFeet: availableBudget }
    : { legal: false, code: 'destination_unreachable' };
}

function reach(state: EncounterState, request: EngineReachRequest): EngineReachResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const target = state.combatants.find((candidate) => candidate.profile.id === request.targetId);
  const origin = request.origin ?? state.tokens.find(
    (token) => token.combatantId === request.actorId,
  )?.position;
  const targetPosition = state.tokens.find(
    (token) => token.combatantId === request.targetId,
  )?.position;
  const codes: Exclude<EngineReachResult, { readonly legal: true }>['codes'][number][] = [];
  if (actor?.profile.kind !== 'monster' || origin === undefined) codes.push('actor_not_placed_monster');
  if (target === undefined) codes.push('target_absent');
  else if (actor !== undefined && combatantsAreAllies(state, request.actorId, request.targetId)) {
    codes.push('target_same_side');
  }
  if (targetPosition === undefined) codes.push('target_not_placed');
  const actions = actor?.profile.kind === 'monster' ? monsterActions(state, request.actorId) : [];
  const action = actions.find((candidate) => candidate.id === request.actionId);
  if (action === undefined) codes.push('action_absent');
  const rangeFeet = action === undefined ? null : engineActionRangeFeet(actions, action);
  if (action !== undefined && rangeFeet === null) codes.push('action_range_unresolved');
  if (
    codes.length > 0 ||
    action === undefined ||
    origin === undefined ||
    targetPosition === undefined ||
    rangeFeet === null
  ) {
    return { legal: false, codes };
  }
  const actorSpace = queryCombatantSpaceAt(state, request.actorId, origin);
  const targetSpace = queryCombatantSpace(state, request.targetId);
  const distanceFeet = minimumSpaceDistance(actorSpace, targetSpace);
  if (action.kind === 'attack' || action.kind === 'saving_throw') {
    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
      sourceAnchor: origin,
    });
    if (trace.blocksSight) {
      return { legal: false, codes: ['target_outside_line_of_sight'] };
    }
    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
  }
  if (action.kind === 'attack') {
    const verdict = tacticalRangeVerdictAtDistance(distanceFeet, monsterAttackRange(action));
    if (verdict.status === 'unresolved') {
      return { legal: false, codes: ['action_range_unresolved'] };
    }
    if (!verdict.legal || verdict.band === 'out') {
      return { legal: false, codes: ['target_out_of_range'] };
    }
    const projected = projectedAttackRanges(action);
    return {
6:import { coverBetweenCombatants, traceCombatantLine } from '../combat/cover';
1168:    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
1169:      sourceAnchor: origin,
1547:    const cover = traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: position }).tier;
}

function assertBrutalMembership(
  room: GeneratedRoom,
  fixtureBytes: string,
  expectedDigest: string,
): void {
  const seed = room.spec.seed;
  const hard = generateRoom(seed, { difficulty: 'hard' });
  expect(room.spec.difficultyProfile, `seed ${String(seed)} difficulty`).toBe('brutal');
  expect(room.spec.challengeBudgetEighths, `seed ${String(seed)} scaled budget`).toBe(
    hard.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_BUDGET_SCALE,
  );
  expect(room.spec.challengeSpentEighths, `seed ${String(seed)} minimum spend`).toBeGreaterThanOrEqual(
    room.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_SPEND_FRACTION_BAND.minimum,
  );
  expect(room.spec.challengeSpentEighths, `seed ${String(seed)} maximum spend`).toBeLessThanOrEqual(
    room.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_SPEND_FRACTION_BAND.maximum,
  );

  const roster = room.spec.monsterRoster.map((entry) => {
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    if (row === undefined) throw new Error(`Seed ${String(seed)} references unknown ${entry.statblockId}.`);
    return row;
  });
  expect(roster.some((row) => {
    const actions = row.statblock.sourceDetails.actions;
    return actions.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => spell.manifestStatus === 'implemented'));
  }), `seed ${String(seed)} executable caster`).toBe(true);

  const terrainCounts = {
    difficult: room.spec.terrain.filter((feature) => feature.kind === 'difficult-terrain-patch').length,
    hazards: room.spec.terrain.filter((feature) => feature.kind === 'hazard-object').length,
    lights: room.spec.terrain.filter((feature) => feature.kind === 'light-source').length,
    obscurement: room.spec.terrain.filter((feature) => feature.kind === 'obscurement-patch').length,
  };
  expect(terrainCounts.difficult, `seed ${String(seed)} difficult terrain`).toBeGreaterThanOrEqual(3);
  expect(terrainCounts.hazards, `seed ${String(seed)} hazards`).toBeGreaterThanOrEqual(3);
  expect(terrainCounts.lights, `seed ${String(seed)} lights`).toBeGreaterThanOrEqual(2);
  expect(terrainCounts.obscurement, `seed ${String(seed)} obscurement`).toBeGreaterThanOrEqual(2);
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain exceeds hard`).toBeGreaterThan(
    hard.spec.terrain.length,
  );
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain minimum`).toBeGreaterThanOrEqual(
    BRUTAL_TERRAIN_FEATURE_COUNT_BAND.minimum,
  );
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain maximum`).toBeLessThanOrEqual(
    BRUTAL_TERRAIN_FEATURE_COUNT_BAND.maximum,
  );

  const state = decodeArenaFixture(room);
  const regions = [
    ...state.environment.difficultTerrainRegions,
    ...state.environment.lightRegions,
    ...state.environment.obscurementRegions,
    ...(state.environment.movementRegions ?? []),
  ];
  for (const region of regions) {
    expect(region.id.trim(), `seed ${String(seed)} region id`).not.toBe('');
    expect(region.cells.length, `seed ${String(seed)} region cells`).toBeGreaterThan(0);
    expect(region.cells.every((cell) => cellIsInBounds(cell, state.bounds)),
      `seed ${String(seed)} region bounds`).toBe(true);
  }
  expect(state.worldObjects.every((object) =>
    object.footprint.length > 0 && object.footprint.every((cell) => cellIsInBounds(cell, state.bounds))),
  `seed ${String(seed)} world-object positions`).toBe(true);

  const spaces = state.combatants.map((combatant) => ({
    id: combatant.profile.id,
    space: combatantSpace(state, combatant.profile.id),
  }));
  for (const entry of spaces) {
    expect(spaceFitsBounds(entry.space, state.bounds), `${entry.id} position bounds`).toBe(true);
    expect(spaceTouchesCellSet(entry.space, state.blockedCells), `${entry.id} blocked overlap`).toBe(false);
  }
  for (let left = 0; left < spaces.length; left += 1) {
    for (let right = left + 1; right < spaces.length; right += 1) {
      expect(spacesIntersect(spaces[left]!.space, spaces[right]!.space),
        `${spaces[left]!.id}/${spaces[right]!.id} overlap`).toBe(false);
    }
  }

  const reduced = reduceEncounter(state, { type: 'roll_initiative' }, mulberry32(seed));
  expect(reduced.state.revision, `seed ${String(seed)} reducer load`).toBe(state.revision + 1);
  expect(reduced.state.initiative, `seed ${String(seed)} initiative load`).toHaveLength(state.combatants.length);

  // D635/D642/D643: 6206 keeps structural, reducer, SHA, and round-execution history;
  // 6209/6210/6211 own the live productivity contract under the sealed-wall geometry.

  // The byte pin lives with, and cannot pass instead of, the state-derived membership checks above.
  expect(sha256(fixtureBytes), `seed ${String(seed)} fixture bytes`).toBe(expectedDigest);
}
    'hard roster must contain an executable control caster plus Guard and Scout',
  );

  const difficultRegions = room.spec.terrain.filter((feature) =>
    feature.kind === 'difficult-terrain-patch');
  const hardFeatures = room.spec.hardFeatures;
  const [gate] = hardFeatures?.chokepointCells ?? [];
  const barrier = gate === undefined ? [] : room.spec.blockedCells.filter((cell) => cell.column === gate.column);
  addViolation(
    violations,
    hardFeatures?.shape === 'single-gate' && hardFeatures.chokepointCells.length === 1 &&
      gate !== undefined && barrier.length === room.spec.dimensions.rows - 1 &&
      !barrier.some((cell) => cell.row === gate.row) && difficultRegions.length >= 1 &&
      hardFeatures.likelyApproachTerrainRegionIds.length > 0 &&
      hardFeatures.likelyApproachTerrainRegionIds.every((id) =>
        difficultRegions.some((region) => region.id === id && region.cells.length > 0)),
    'hard_chokepoint_structure',
    'hard room must retain its single-gate barrier, chokepoint, and approach difficult terrain',
  );
  return violations;
}

function executableCaster(room: GeneratedRoom): boolean {
  return room.spec.monsterRoster.some((entry) => {
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    const actions = row?.statblock.sourceDetails.actions;
    return actions?.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => spell.manifestStatus === 'implemented'));
  });
}

function everyMonsterProductive(room: GeneratedRoom): boolean {
  const planningState = freshMonsterPlanningState(room.encounter.state);
  return planningState.combatants
    .filter((combatant) => combatant.profile.kind === 'monster')
    .every((monster) => availableEngineActorOptions(planningState, monster.profile.id, OFFER_ENVIRONMENT)
      .some((option) => {
        const resolution = resolveEngineActorOption(planningState, option, OFFER_ENVIRONMENT);
        return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
          resolution.mechanics.actionSlots.some((slot) =>
            slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
            slot.kind === 'use_world_object'));
      }));
import { abilities } from '../../../src/domain/enums';
import {
  characterCombatantProfile,
  combatToken,
  monsterCombatantProfile,
  type CharacterCombatSheet,
  type CombatantProfile,
  type CombatToken,
  type SpellSlotCapacity,
} from '../../../src/combat/combatant';
import { monsterStatblock } from '../../../src/combat/statblock';

export function monsterProfile(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
    readonly usesDeathSaves?: boolean;
    readonly conditionImmunities?: readonly string[];
    readonly constitutionSaveBonus?: number;
  } = {},
): CombatantProfile {
  const statblock = monsterStatblock({
    id: `statblock:${key}`,
    name: key,
    armorClass: 12,
    hitPointMaximum: options.hitPoints ?? 10,
    speedFeet: 30,
    initiativeBonus: options.initiativeBonus ?? 0,
    savingThrowBonuses: {
      strength: 0,
      dexterity: 0,
      constitution: options.constitutionSaveBonus ?? 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    ...(options.attacksPerAction === undefined
      ? {}
      : { attacksPerAction: options.attacksPerAction }),
    ...(options.conditionImmunities === undefined
      ? {}
      : { conditionImmunities: options.conditionImmunities }),
    ...(options.usesDeathSaves === undefined
      ? {}
      : { usesDeathSaves: options.usesDeathSaves }),
  });
  const profile = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
  return { ...profile, rules: { ...profile.rules, sizeCategory: 'Medium' } };
}

export function characterSheet(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
  } = {},
): CharacterCombatSheet {
  const initiativeBonus = options.initiativeBonus ?? 5;
  return {
    character_id: 1,
    name: key,
    creature_classification: { type: 'Humanoid', size: 'Medium' },
    hit_point_maximum: {
      id: 'hit_point_maximum',

exec
/bin/bash -lc 'npx tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc 'npx tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
for(const file of ['tests/unit/vtt/arena-basis-brutal-v2.test.ts','tests/unit/vtt/room-generator.test.ts','tests/unit/vtt/arena-basis-brutal-b.test.ts','tests/unit/tools/d569-second-family-manifest.test.ts']){
 const ctx=await startVitest('test',[file],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,fileParallelism:false,reporters:['default']});await ctx.close();
}
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 15003ms:
 succeeded in 29758ms:
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const file='tests/unit/vtt/arena-basis-brutal-v2.test.ts';
const cases=[
 ['force-productive','rejects a living monster','if ("'!hasProductiveComponent) return false;'"','if ("'!hasProductiveComponent) return true;'"'],
 ['delete-movement','positive-movement-only Dash','mechanics.movementCostFeet > 0 ||','false ||'],
 ['ignore-blocksSight','optically blocked trace',\"return "'!trace.blocksSight && trace.tier !== '"'total';\",\"return trace.tier "'!== '"'total';\"],
];
for(const [name,pattern,from,to] of cases){
 console.log('MUTANT',name);
 const plugin={name,enforce:'pre',transform(code,id){if("'!id.endsWith('"'/'+file))return;if("'!code.includes(from))throw Error('"'missing anchor');return code.replace(from,to);}};
 const ctx=await startVitest('test',[file],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,testNamePattern:pattern,reporters:['default']},{plugins:[plugin]});
 await ctx.close();
}
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "git diff --check e92ebc93 8284a91c && git diff --exit-code e92ebc93 8284a91c -- tests/fixtures; python3 - <<'PY'
import subprocess,re
s=subprocess.check_output(['git','diff','--unified=0','e92ebc93','8284a91c'],text=True)
a=[x[1:] for x in s.splitlines() if x.startswith('+') and not x.startswith('+++')]
print('added lines',len(a),'over120',sum(len(x)>120 for x in a))
s=open('tests/unit/vtt/arena-basis-brutal-v2.test.ts').read()
rows=re.findall(r\"family: '(["'^'"']+)', seed: ([\\d_]+), path: '(["'^'"']+)'\",s)
expected=[(fam,str(seed),f'tests/fixtures/arena-basis-{fam}/seed-{seed}.json') for fam,start in [('brutal-v2',6209001),('brutal-b-v2',6210001),('brutal-2-v2',6211001)] for seed in range(start,start+10)]
assert [(f,n.replace('_',''),p) for f,n,p in rows]==expected
print('exact fixture declarations',len(rows))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
added lines 229 over120 0
exact fixture declarations 30

 exited 1 in 9406ms:
MUTANT force-productive

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts (34 tests | 1 failed | 33 skipped) 18ms
     ↓ reserves exactly three contiguous ten-seed fixture families
     ↓ 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     × rejects a living monster whose only valid options are nonproductive 17ms
     ↓ keeps a positive-movement-only Dash monster productive
     ↓ rejects targeted offense whose resolved origin has an optically blocked trace

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > rejects a living monster whose only valid options are nonproductive
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:182:72
    180|     expect(availableEngineActorOptions(fixture.state, fixture.actorId,…
    181|       .map(({ label }) => label)).toEqual(['Dodge', 'End Turn']);
    182|     expect(monsterHasProductiveOption(fixture.state, fixture.actorId))…
       |                                                                        ^
    183|   });
    184|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 33 skipped (34)
   Start at  22:52:58
   Duration  3.14s (transform 1.33s, setup 0ms, import 3.03s, tests 18ms, environment 0ms)

MUTANT delete-movement

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts (34 tests | 1 failed | 33 skipped) 15ms
     ↓ reserves exactly three contiguous ten-seed fixture families
     ↓ 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ rejects a living monster whose only valid options are nonproductive
     × keeps a positive-movement-only Dash monster productive 14ms
     ↓ rejects targeted offense whose resolved origin has an optically blocked trace

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > keeps a positive-movement-only Dash monster productive
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:198:72
    196|     expect(dash.resolution.mechanics.movementCostFeet).toBeGreaterThan…
    197|     expect(dash.resolution.mechanics.actionSlots.map(({ kind }) => kin…
    198|     expect(monsterHasProductiveOption(fixture.state, fixture.actorId))…
       |                                                                        ^
    199|   });
    200|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 33 skipped (34)
   Start at  22:53:01
   Duration  2.95s (transform 1.22s, setup 0ms, import 2.86s, tests 15ms, environment 0ms)

MUTANT ignore-blocksSight

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts (34 tests | 1 failed | 33 skipped) 16ms
     ↓ reserves exactly three contiguous ten-seed fixture families
     ↓ 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ rejects a living monster whose only valid options are nonproductive
     ↓ keeps a positive-movement-only Dash monster productive
     × rejects targeted offense whose resolved origin has an optically blocked trace 15ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > rejects targeted offense whose resolved origin has an optically blocked trace
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:218:74
    216|     })).toMatchObject({ tier: 'half', blocksSight: true });
    217|     expect(resolvedMechanicsIsProductive(fixture.state, resolution.mec…
    218|     expect(resolvedMechanicsIsProductive(blocked, resolution.mechanics…
       |                                                                          ^
    219|   });
    220| });

 Test Files  1 failed (1)
      Tests  1 failed | 33 skipped (34)
   Start at  22:53:04

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

   Duration  2.98s (transform 1.18s, setup 0ms, import 2.90s, tests 16ms, environment 0ms)


 exited 1 in 41426ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts (34 tests | 30 failed) 31ms
     ✓ reserves exactly three contiguous ten-seed fixture families 2ms
     × 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 3ms
     × 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
     × 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
     × 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     × 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
     ✓ rejects a living monster whose only valid options are nonproductive 13ms
     ✓ keeps a positive-movement-only Dash monster productive 3ms
     ✓ rejects targeted offense whose resolved origin has an optically blocked trace 5ms

⎯⎯⎯⎯⎯⎯ Failed Tests 30 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-v2/seed-6209010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/30]⎯


 Test Files  1 failed (1)
      Tests  30 failed | 4 passed (34)
   Start at  22:52:26
   Duration  3.28s (transform 1.37s, setup 0ms, import 3.14s, tests 31ms, environment 0ms)


 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ✓ tests/unit/vtt/room-generator.test.ts (56 tests) 1007ms
     ✓ all 16 family/budget cells have exact maximizing vectors  365ms

 Test Files  1 passed (1)
      Tests  56 passed (56)
   Start at  22:52:29
   Duration  3.93s (transform 1.18s, setup 0ms, import 2.86s, tests 1.01s, environment 0ms)


 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ✓ tests/unit/vtt/arena-basis-brutal-b.test.ts (47 tests) 24158ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117001.json under the unattended scripted-party policy  934ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117002.json under the unattended scripted-party policy  907ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117003.json under the unattended scripted-party policy  1382ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117004.json under the unattended scripted-party policy  724ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117005.json under the unattended scripted-party policy  855ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117006.json under the unattended scripted-party policy  426ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117007.json under the unattended scripted-party policy  1093ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117008.json under the unattended scripted-party policy  509ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117009.json under the unattended scripted-party policy  586ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117010.json under the unattended scripted-party policy  789ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117011.json under the unattended scripted-party policy  859ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117012.json under the unattended scripted-party policy  528ms
       ✓ executes round 1 for tests/fixtures/arena-basis-hard/seed-5117013.json under the unattended scripted-party policy  349ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203001.json under the unattended scripted-party policy  488ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203003.json under the unattended scripted-party policy  2792ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203004.json under the unattended scripted-party policy  438ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203005.json under the unattended scripted-party policy  754ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203006.json under the unattended scripted-party policy  445ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203008.json under the unattended scripted-party policy  761ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203009.json under the unattended scripted-party policy  691ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal/seed-6203010.json under the unattended scripted-party policy  796ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206001.json under the unattended scripted-party policy  612ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206003.json under the unattended scripted-party policy  374ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206005.json under the unattended scripted-party policy  699ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206006.json under the unattended scripted-party policy  1017ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206007.json under the unattended scripted-party policy  446ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206009.json under the unattended scripted-party policy  747ms
       ✓ executes round 1 for tests/fixtures/arena-basis-brutal-b/seed-6206010.json under the unattended scripted-party policy  1070ms
     ✓ rejects rather than skips an execution_failed row from a seeded fixture  678ms

 Test Files  1 passed (1)
      Tests  47 passed (47)
   Start at  22:52:33
   Duration  27.14s (transform 1.27s, setup 0ms, import 2.91s, tests 24.16s, environment 0ms)


 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ✓ tests/unit/tools/d569-second-family-manifest.test.ts (50 tests) 3821ms
     ✓ new_v2_legacy_fogged_cells: rejects a rebound-hash v2 brutal fixture with the legacy key  1289ms

 Test Files  1 passed (1)
      Tests  50 passed (50)
   Start at  22:53:00
   Duration  6.69s (transform 1.18s, setup 0ms, import 2.80s, tests 3.82s, environment 0ms)


codex
The active suite has exactly 30 ENOENT failures and four passing witnesses. Room-generator passes 56/56; brutal-b passes 47/47. The 6206 retirement preserves its static checks, but the deleted 6203 test also called `brutalRoomMembershipViolations`, which checks budget, caster, and terrain—not just productivity. I’m checking that broader removal against the requested retirement scope.

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const file='tests/unit/vtt/arena-basis-brutal-v2.test.ts';
const plugin={name:'review-existing-invalid-fixture',enforce:'pre',transform(code,id){if("'!id.endsWith('"'/'+file))return;return \"import {readFileSync as reviewRead} from 'node:fs';\\n\"+code.replace('const fixtureBytes = inputs.fixtures.readText(path);',"'`const fixtureBytes = (() => {
const copy=JSON.parse(reviewRead('"'tests/fixtures/arena-basis-brutal-2/seed-6207001.json','utf8'));
copy.spec.seed=seed;
copy.spec.challengeBudgetEighths+=1;
return JSON.stringify(copy);
})();"'`);}};
const ctx=await startVitest('"'test',[file],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,testNamePattern:'seed 6209001 ',reporters:['default']},{plugins:[plugin]});await ctx.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "git show e92ebc93:tests/unit/vtt/room-generator.test.ts | nl -ba | sed -n '585,605p'; rg -n 'BRUTAL_BASIS_SEEDS|brutalRoomMembershipViolations|assertBrutalMembership' tests/unit/vtt/room-generator.test.ts tests/unit/vtt/arena-basis-brutal-b.test.ts; sed -n '388,430p' tests/unit/vtt/arena-basis-brutal-b.test.ts; rg -n 'declareTestInputs|\\.map|CallExpression' tools/*test* tools/*verdict* scripts/*test* 2>/dev/null | head -25" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
   585	    }
   586	  });
   587	
   588	  it.each(BRUTAL_PRODUCTIVITY_SEEDS)(
   589	    'generates brutal seed %s with executable casters, dense terrain, scaled pressure, and productive monsters',
   590	    (seed) => {
   591	      const brutal = generateRoom(seed, { difficulty: 'brutal' });
   592	      expect(brutalRoomMembershipViolations(brutal)).toEqual([]);
   593	      const state = freshMonsterPlanningState(brutal.encounter.state);
   594	      const monsters = state.combatants.filter((candidate) => candidate.profile.kind === 'monster');
   595	      for (const monster of monsters) {
   596	        const productive = availableEngineActorOptions(state, monster.profile.id, OFFER_ENVIRONMENT)
   597	          .some((option) => resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid);
   598	        expect(productive, monster.profile.id).toBe(true);
   599	      }
   600	    },
   601	  );
   602	
   603	  it.each([
   604	    [3, 900],
   605	    [4, 1_500],
tests/unit/vtt/arena-basis-brutal-b.test.ts:294:function assertBrutalMembership(
tests/unit/vtt/arena-basis-brutal-b.test.ts:421:      assertBrutalMembership(fixture.room, fixture.bytes, FIXTURE_DIGESTS[seed]);
tests/unit/vtt/arena-basis-brutal-b.test.ts:535:    expect(() => assertBrutalMembership(
tests/unit/vtt/room-generator.test.ts:55:const BRUTAL_BASIS_SEEDS = [6_203_001, 6_203_002, 6_203_003] as const;
tests/unit/vtt/room-generator.test.ts:493:  it.each(BRUTAL_BASIS_SEEDS)('pins frozen brutal arena basis seed %s byte-for-byte', (seed) => {
  const path = FIXTURE_PATHS[index];
  if (path === undefined) throw new RangeError(`No brutal-b fixture at index ${String(index)}.`);
  const bytes = inputs.fixtures.readText(path);
  return { room: JSON.parse(bytes) as GeneratedRoom, bytes };
}

function executionFixtureAt(path: (typeof EXECUTION_FIXTURE_PATHS)[number]): GeneratedRoom {
  return JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
}

describe('second brutal arena basis family', () => {
  it('uses one clean contiguous range disjoint from every existing seeded fixture family', () => {
    const existingSeeds = new Set([
      ...Array.from({ length: 12 }, (_unused, index) => 3_943_001 + index),
      ...R1_10_SEEDS,
      5_117_011, 5_117_012, 5_117_013,
      ...BRUTAL_10_SEEDS,
    ]);
    expect(BRUTAL_10_B_SEEDS.every((seed) => !existingSeeds.has(seed))).toBe(true);
    expect(BRUTAL_10_B_SEEDS).toEqual(Array.from({ length: 10 }, (_unused, index) => 6_206_001 + index));
    expect(BRUTAL_10_B_SEEDS.every((seed) =>
      !D466_GENERATED_ROOM_OVERRIDES.some((override) => Number(override.seed) === seed))).toBe(true);
    expect(D466_GENERATED_ROOM_OVERRIDES.map((override) => override.seed)).toEqual([
      6_204_004, 6_204_006, 6_204_009,
    ]);
  });

  it.each(BRUTAL_10_B_SEEDS)(
    'pins seed %s only after proving every brutal membership property from state',
    (seed) => {
      const index = seed - BRUTAL_10_B_SEEDS[0];
      const fixture = fixtureAt(index);
      expect(fixture.room.spec.seed).toBe(seed);
      assertBrutalMembership(fixture.room, fixture.bytes, FIXTURE_DIGESTS[seed]);
    },
  );

  describe.each(EXECUTION_FIXTURE_FAMILIES)('%s frozen-room execution membership', (_basis, paths) => {
    it.each(paths)('executes round 1 for %s under the unattended scripted-party policy', (path) => {
      const result = executeFrozenRound(executionFixtureAt(path));

      expect(result.outcome).toBe('executed');
      assertRoundsExecuted([result]);
tools/gate-verdict.mjs:99:    .map((outcome) => ({
tools/gate-verdict.mjs:117:  const files = [...byFile].map(([file, status]) => ({ file, status }))
tools/gate-verdict.mjs:151:    files: [...byFile].map(([file, status]) => ({ file, status })).sort((left, right) => left.file.localeCompare(right.file)),
tools/gate-verdict.mjs:152:    errors: reporter.errors.map(normalizedError),
tools/gate-verdict.mjs:178:    const errors = item.errors.map(normalizedError);
tools/gate-verdict.mjs:202:  const globalErrors = evidence.globalErrors.map(normalizedError);
tools/gate-verdict.mjs:279:  const globalErrors = evidence.globalErrors.map(normalizedError);
tools/gate-verdict.mjs:312:  const stockByFile = new Map(stock.files.map((file) => [file.file, file.status]));
tools/gate-verdict.mjs:313:  const evidenceFiles = outcomes.map((outcome) => outcome.file);
tools/gate-verdict.mjs:314:  if (JSON.stringify(unique(stock.files.map((file) => file.file))) !== JSON.stringify(unique(evidenceFiles))) {
tools/gate-verdict.mjs:362:  const rawScheduledExecutionIds = native?.scheduled.map((item) => item.executionId) ?? [];
tools/gate-verdict.mjs:366:  const scheduledFiles = unique(native?.scheduled.map((item) => item.file) ?? []);
tools/gate-verdict.mjs:370:    : unique(input.requestedFiles.map(normalizeFile));
tools/gate-verdict.mjs:373:    .map((item) => item.file));
tools/gate-verdict.mjs:378:  const scheduledById = new Map((native?.scheduled ?? []).map((item) => [item.executionId, item.file]));
tools/gate-verdict.mjs:382:    .map((item) => item.executionId));
tools/gate-verdict.mjs:391:  const existingIds = new Set(executions.map((item) => item.executionId));
tools/gate-verdict.mjs:399:  const attributableFailures = fileOutcomes.filter((outcome) => outcome.status === 'failed').map((outcome) => outcome.file);
tools/gate-verdict.mjs:463:  const initialFailed = initial.fileOutcomes.filter((outcome) => outcome.status === 'failed').map((outcome) => outcome.file);
tools/gate-verdict.mjs:466:    : retry.fileOutcomes.filter((outcome) => outcome.status === 'passed').map((outcome) => outcome.file);
tools/gate-vitest.mjs:152:  .map((outcome) => outcome.file);
tools/gate-vitest-evidence-reporter.mjs:45:    errors: Array.isArray(errors) ? errors.map(normalizeError) : [],
tools/gate-vitest-evidence-reporter.mjs:82:      ? specifications.map(execution).sort((left, right) => left.executionId.localeCompare(right.executionId))
tools/gate-vitest-evidence-reporter.mjs:89:      ? modules.map(moduleEvidence).sort((left, right) => left.executionId.localeCompare(right.executionId))
tools/gate-vitest-evidence-reporter.mjs:91:    this.document.globalErrors = Array.isArray(globalErrors) ? globalErrors.map(normalizeError) : [];

 exited 1 in 3252ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts (34 tests | 1 failed | 33 skipped) 8ms
     ↓ reserves exactly three contiguous ten-seed fixture families
     × 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 7ms
     ↓ 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
     ↓ 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
     ↓ 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
     ↓ rejects a living monster whose only valid options are nonproductive
     ↓ keeps a positive-movement-only Dash monster productive
     ↓ rejects targeted offense whose resolved origin has an optically blocked trace

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
TypeError: Arena basis spec seed and encounter provenance seed do not agree.
 ❯ validateSpecAgreement src/vtt/arena-fixture.ts:196:54
    194|   assertCanonicalEqual(spec.dimensions, state.bounds, 'Arena basis spe…
    195|   assertCanonicalEqual(spec.blockedCells, state.blockedCells, 'Arena b…
    196|   if (encounter.provenance.seed !== spec.seed) throw new TypeError('Ar…
       |                                                      ^
    197|   const stateMonsters = state.combatants.filter((entry) => entry.profi…
    198|   if (stateMonsters.length !== spec.monsterRoster.length || spec.monst…
 ❯ decodeArenaBasisEnvelopeV1 src/vtt/arena-fixture.ts:277:3
 ❯ decodeEngineFixtureV1 src/vtt/arena-fixture.ts:294:12
 ❯ decodeArenaFixture src/vtt/mcp/entrypoint.ts:674:10
 ❯ decodeArenaFixtureText src/vtt/mcp/entrypoint.ts:678:10
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:172:23

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 33 skipped (34)
   Start at  22:53:28
   Duration  3.09s (transform 1.30s, setup 0ms, import 3.00s, tests 8ms, environment 0ms)


exec
/bin/bash -lc "rg -n 'export function generateRoom|return \\{' src/vtt/room-generator.ts | tail -12; sed -n '1640,1725p' src/vtt/room-generator.ts; sed -n '145,205p' tests/helpers/test-inputs.ts; nl -ba tests/unit/vtt/arena-basis-brutal-v2.test.ts | sed -n '58,110p;155,175p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
784:  return {
833:  return {
886:    return {
894:  if (concentratingIndex === null) return { state: { ...state, combatants }, samples };
910:  return {
1141:  return {
1187:  return {
1311:  return { ...state, worldObjects: [...state.worldObjects, object] };
1334:      return { state: candidate, object };
1357:    ) return { state: candidate, cells: footprint };
1412:  return {
1426:export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {
  Path extends string,
>(category: Category, allowed: ReadonlySet<string>): DeclaredInputReader<Category, Path> {
  const assertAllowed = (path: string): void => {
    if (!allowed.has(path)) {
      throw new TypeError(`Undeclared ${category} test input: ${path}`);
    }
  };
  return {
    readText<Selected extends Path>(path: Selected): TestInputText<Category, Selected> {
      assertAllowed(path);
      return readFileSync(absoluteInputPath(path), 'utf8') as TestInputText<Category, Selected>;
    },
    readBytes<Selected extends Path>(path: Selected): TestInputBytes<Category, Selected> {
      assertAllowed(path);
      return new Uint8Array(readFileSync(absoluteInputPath(path))) as TestInputBytes<Category, Selected>;
    },
  };
}

function contentDirectoryReader<Path extends string>(
  allowed: ReadonlySet<string>,
): DeclaredContentDirectoryReader<Path> {
  return {
    list<Selected extends Path>(path: Selected): TestInputDirectoryEntries<Selected> {
      if (!allowed.has(path)) {
        throw new TypeError(`Undeclared content test input directory: ${path}`);
      }
      return readdirSync(absoluteInputPath(path), { encoding: 'utf8' }) as unknown as
        TestInputDirectoryEntries<Selected>;
    },
  };
}

/**
 * Declares every stable repository input a test file may read. The returned
 * readers accept only paths enumerated in this spec, and recording runs attach
 * the declaration to the recorder state for the current test file.
 */
export function declareTestInputs<const Spec extends TestInputSpec>(
  spec: Spec,
): DeclaredTestInputs<Spec> {
  const byCategory = {
    fixtures: new Set<string>(spec.fixtures ?? []),
    schemaSql: new Set<string>(spec.schemaSql ?? []),
    srdText: new Set<string>(spec.srdText ?? []),
    guides: new Set<string>(spec.guides ?? []),
    publicData: new Set<string>(spec.publicData ?? []),
    content: new Set<string>(spec.content ?? []),
  } satisfies Record<TestInputCategory, Set<string>>;
  const contentDirectories = new Set<string>(spec.contentDirectories ?? []);

  const declared = new Set<string>();
  for (const category of Object.keys(byCategory) as TestInputCategory[]) {
    for (const path of byCategory[category]) {
      validatePath(category, path);
      const observation = `file:${path}`;
      if (declared.has(observation)) {
        throw new TypeError(`Test input is declared more than once: ${path}`);
      }
      declared.add(observation);
    }
    58	const inputs = declareTestInputs({ fixtures: ACTIVE_FIXTURES.map(({ path }) => path) });
    59	const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
    60	
    61	function targetedOffenseHasOpenTrace(
    62	  state: EncounterState,
    63	  mechanics: ResolvedTurnMechanics,
    64	  slot: ResolvedActionSlotUse,
    65	): boolean {
    66	  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
    67	    return true;
    68	  }
    69	  return slot.targetIds.every((targetId) => {
    70	    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
    71	      sourceAnchor: mechanics.finalPosition,
    72	    });
    73	    return !trace.blocksSight && trace.tier !== 'total';
    74	  });
    75	}
    76	
    77	function resolvedMechanicsIsProductive(
    78	  state: EncounterState,
    79	  mechanics: ResolvedTurnMechanics,
    80	): boolean {
    81	  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
    82	    mechanics.actionSlots.some((slot) =>
    83	      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
    84	      slot.kind === 'use_world_object');
    85	  if (!hasProductiveComponent) return false;
    86	
    87	  // D635/D642/D643: live cohorts additionally require every targeted offensive component
    88	  // to remain sight-clear and non-total at its resolved origin. room-generator.ts:1227's
    89	  // generated-room predicate is intentionally stricter: it requires no cover at all.
    90	  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
    91	}
    92	
    93	function monsterHasProductiveOption(state: EncounterState, actorId: CombatantId): boolean {
    94	  return availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).some((option) => {
    95	    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
    96	    return resolution.valid && resolvedMechanicsIsProductive(state, resolution.mechanics);
    97	  });
    98	}
    99	
   100	function everyLivingMonsterIsProductive(state: EncounterState): boolean {
   101	  const planningState = freshMonsterPlanningState(state);
   102	  return planningState.combatants
   103	    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life === 'living')
   104	    .every((monster) => monsterHasProductiveOption(planningState, monster.profile.id));
   105	}
   106	
   107	function decodedClone(state: EncounterState): EncounterState {
   108	  return decodeEncounterStateV1(JSON.parse(JSON.stringify(state)) as unknown, 'session');
   109	}
   110	
   155	      ...Array.from({ length: 10 }, (_unused, index) => 6_210_001 + index),
   156	      ...Array.from({ length: 10 }, (_unused, index) => 6_211_001 + index),
   157	    ]);
   158	    expect(new Set(ACTIVE_FIXTURES.map(({ path }) => path))).toHaveLength(30);
   159	  });
   160	
   161	  it.each(ACTIVE_FIXTURES)(
   162	    '$family seed $seed satisfies active state-derived membership at $path',
   163	    ({ path, seed }) => {
   164	      const fixtureBytes = inputs.fixtures.readText(path);
   165	      const room = JSON.parse(fixtureBytes) as GeneratedRoom;
   166	      const decoded = decodeArenaFixtureText(fixtureBytes);
   167	
   168	      expect(room.spec.seed).toBe(seed);
   169	      expect(generatedRoomIntegrityViolations(room, fixtureBytes)).toEqual([]);
   170	      expect(brutalRoomMembershipViolations(room)
   171	        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
   172	      expect(everyLivingMonsterIsProductive(decoded)).toBe(true);
   173	    },
   174	  );
   175	

exec
/bin/bash -lc "sed -n '1390,1465p' src/vtt/room-generator.ts; sed -n '180,215p' src/vtt/arena-fixture.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
      new Set([halfSourceId]),
    ),
  );
  threeQuarters.object.footprint.forEach((cell) => authored.add(cellKey(cell)));
  const threeQuartersSourceId = `object:${String(threeQuarters.object.id)}`;
  const wall = findWallPlacement(
    threeQuarters.state,
    seed,
    occupied,
    authored,
    halfSourceId,
    threeQuartersSourceId,
  );
  const wallId = `wall:generated-${String(seed)}-los-cover-v1`;
  const terrain: RoomTerrainFeature[] = [
    ...room.spec.terrain.filter((feature) =>
      feature.kind !== 'cover-object' && feature.kind !== 'wall'),
    { kind: 'cover-object', object: threeQuarters.object },
    { kind: 'cover-object', object: half.object },
    { kind: 'wall', id: wallId, terrainKind: 'wall', cells: wall.cells },
  ];
  const { hardFeatures: _legacyHardFeatures, ...legacySpec } = room.spec;
  return {
    spec: {
      ...legacySpec,
      terrainProfile: 'los_cover_v1',
      terrain,
      blockedCells: wall.cells,
    },
    encounter: {
      ...room.encounter,
      state: wall.state,
    },
  };
}

export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {
  const legacy = generateLegacyRoom(seed, options);
  return options.terrainProfile === 'los_cover_v1'
    ? applyLosCoverTerrainProfile(legacy)
    : legacy;
}
    challengeBudgetEighths: budget,
    challengeSpentEighths: spent,
    partyState: array(spec['partyState'], 'arena basis partyState').map((entry) => decodePartySeat(entry, challenge)),
    ...(Object.hasOwn(spec, 'hardFeatures') ? { hardFeatures: structuredClone(spec['hardFeatures']) as NonNullable<RoomSpec['hardFeatures']> } : {}),
  };
}

function assertCanonicalEqual(left: unknown, right: unknown, label: string): void {
  if (canonicalJson(left) !== canonicalJson(right)) throw new TypeError(`${label} do not agree.`);
}

function validateSpecAgreement(room: GeneratedRoom, challenge: boolean): void {
  const { spec, encounter } = room;
  const state = encounter.state;
  assertCanonicalEqual(spec.dimensions, state.bounds, 'Arena basis spec dimensions and state bounds');
  assertCanonicalEqual(spec.blockedCells, state.blockedCells, 'Arena basis spec and state blocked cells');
  if (encounter.provenance.seed !== spec.seed) throw new TypeError('Arena basis spec seed and encounter provenance seed do not agree.');
  const stateMonsters = state.combatants.filter((entry) => entry.profile.kind === 'monster');
  if (stateMonsters.length !== spec.monsterRoster.length || spec.monsterRoster.some((entry) => {
    const stateEntry = stateMonsters.find((candidate) => candidate.profile.id === entry.combatantId);
    return stateEntry === undefined || stateEntry.profile.kind !== 'monster' ||
      stateEntry.profile.tokenId !== entry.tokenId || stateEntry.profile.statblockId !== entry.statblockId;
  })) throw new TypeError('Arena basis monster roster and state do not agree.');
  const party = state.combatants.filter((entry) => entry.profile.kind === 'player_character');
  if (party.length !== spec.partyState.length || spec.partyState.some((seat) => {
    const stateSeat = party.find((candidate) => candidate.profile.id === seat.combatantId);
    if (stateSeat === undefined || stateSeat.hitPoints !== seat.hitPoints || stateSeat.life !== seat.life ||
      canonicalJson(stateSeat.deathSaves) !== canonicalJson(seat.deathSaves)) return true;
    const slots = stateSeat.spellSlots.map((slot) => ({
      level: slot.level, maximum: slot.maximum, remaining: slot.remaining, spent: slot.maximum - slot.remaining,
    }));
    const concentrating = state.effects.some((effect) => effect.concentrationOwner === stateSeat.profile.id);
    return canonicalJson(slots) !== canonicalJson(seat.spellSlots) || concentrating !== seat.concentrating;
  })) throw new TypeError('Arena basis party state and RoomSpec do not agree.');
  for (const feature of spec.terrain) {
    if (feature.kind === 'wall') {

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const file='tests/unit/vtt/arena-basis-brutal-v2.test.ts';
const plugin={name:'review-existing-invalid-fixture',enforce:'pre',transform(code,id){if("'!id.endsWith('"'/'+file))return;return \"import {readFileSync as reviewRead} from 'node:fs';\\n\"+code.replace('const fixtureBytes = inputs.fixtures.readText(path);',"'`const fixtureBytes = (() => {
const copy=JSON.parse(reviewRead('"'tests/fixtures/arena-basis-brutal-2/seed-6207001.json','utf8'));
copy.spec.seed=seed;
copy.encounter.provenance.seed=seed;
copy.spec.challengeBudgetEighths+=1;
return JSON.stringify(copy);
})();"'`);}};
const ctx=await startVitest('"'test',[file],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,testNamePattern:'seed 6209001 ',reporters:['dot']},{plugins:[plugin]});await ctx.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 3233ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

-x--------------------------------

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
AssertionError: expected [ { code: 'brutal_budget', …(1) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "code": "brutal_budget",
+     "message": "brutal budget must be scaled from hard and spend 90-100 percent",
+   },
+ ]

 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:178:75
    176|   it('rejects a living monster whose only valid options are nonproduct…
    177|     const fixture = actionlessMonsterState(0);
    178|     expect(fixture.state.combatants.find((entry) => entry.profile.id =…
       |                                                                           ^
    179|       .toBe('living');
    180|     expect(availableEngineActorOptions(fixture.state, fixture.actorId,…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 33 skipped (34)
   Start at  22:53:57
   Duration  3.09s (transform 1.19s, setup 0ms, import 2.81s, tests 193ms, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const plugin={name:'review-frozen-budget-regression',enforce:'pre',transform(code,id){if("'!id.endsWith('"'/src/vtt/room-generator.ts'))return;const anchor='const legacy = generateLegacyRoom(seed, options);';if("'!code.includes(anchor))throw Error('"'anchor absent');return code.replace(anchor,anchor+"'`'"\\n if(seed===6_203_010 && options.difficulty==='brutal') return {...legacy,spec:{...legacy.spec,challengeBudgetEighths:legacy.spec.challengeBudgetEighths+1}};"'`);}};
const ctx=await startVitest('"'test',['tests/unit/vtt/room-generator.test.ts'],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,reporters:['dot']},{plugins:[plugin]});await ctx.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 4299ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

························································

 Test Files  1 passed (1)
      Tests  56 passed (56)
   Start at  22:54:12
   Duration  4.15s (transform 1.35s, setup 0ms, import 3.05s, tests 1.01s, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
import {execFileSync} from 'node:child_process';
const old=execFileSync('git',['show','e92ebc93:tests/unit/vtt/room-generator.test.ts'],{encoding:'utf8'});
const plugin={name:'review-retained-static-witness',enforce:'pre',transform(code,id){
if(id.endsWith('/tests/unit/vtt/room-generator.test.ts'))return old.replace('expect(brutalRoomMembershipViolations(brutal)).toEqual([]);',\"expect(brutalRoomMembershipViolations(brutal).filter(v=>v.code"'!=='"'brutal_productivity')).toEqual([]);\");
if(id.endsWith('/src/vtt/room-generator.ts'))return code.replace('const legacy = generateLegacyRoom(seed, options);',"'`const legacy = generateLegacyRoom(seed, options);'"\\n if(seed===6_203_010 && options.difficulty==='brutal') return {...legacy,spec:{...legacy.spec,challengeBudgetEighths:legacy.spec.challengeBudgetEighths+1}};"'`);
}};
const ctx=await startVitest('"'test',['tests/unit/vtt/room-generator.test.ts'],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,testNamePattern:'generates brutal seed 6203010 ',reporters:['dot']},{plugins:[plugin]});await ctx.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 11ms:
node:internal/child_process:1120
    result.error = new ErrnoException(result.error, 'spawnSync ' + options.file);
                   ^

<ref *1> Error: spawnSync git EPERM
    at Object.spawnSync (node:internal/child_process:1120:20)
    at spawnSync (node:child_process:911:24)
    at execFileSync (node:child_process:954:15)
    at file:///home/vagrant/PhpstormProjects/dnd-wt-seam-verify/[eval1]:3:11
    at ModuleJob.run (node:internal/modules/esm/module_job:413:25)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:268:26)
    at async ModuleLoader.executeModuleJob (node:internal/modules/esm/loader:265:20)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  errno: -1,
  code: 'EPERM',
  syscall: 'spawnSync git',
  path: 'git',
  spawnargs: [ 'show', 'e92ebc93:tests/unit/vtt/room-generator.test.ts' ],
  error: [Circular *1],
  status: 0,
  signal: null,
  output: [
    null,
    "import { describe, expect, it } from 'vitest';\n" +
      "import { canonicalJson } from '../../../src/commands/canonical-json';\n" +
      "import { monsterCombatantProfile } from '../../../src/combat/combatant';\n" +
      "import { reduceEncounter } from '../../../src/combat/encounter';\n" +
      "import { mulberry32 } from '../../../src/combat/random';\n" +
      "import { BUNDLED_MONSTER_ROSTER, STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';\n" +
      "import { sha256 } from '../../../src/crypto/sha256';\n" +
      "import { creatureSizes, type KnownCreatureSize } from '../../../src/domain/enums';\n" +
      'import {\n' +
      '  D466_GENERATED_ROOM_OVERRIDES,\n' +
      '  d466CreatureReplacement,\n' +
      '  d466ReplacementStatblock,\n' +
      "} from '../../../src/vtt/d466-room-overrides';\n" +
      'import {\n' +
      '  generateRoom,\n' +
      '  heldoutMaximizingMonsterRosters,\n' +
      '  HELDOUT_STARTER_MONSTER_FAMILIES,\n' +
      '  ROOM_GRID_DIMENSIONS,\n' +
      '  type GeneratedRoom,\n' +
      "} from '../../../src/vtt/room-generator';\n" +
      'import {\n' +
      '  brutalRoomMembershipViolations,\n' +
      '  hardRoomMembershipViolations,\n' +
      "} from '../../../tools/d569-second-family-manifest';\n" +
      "import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';\n" +
      "import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';\n" +
      "import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';\n" +
      "import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';\n" +
      "import { declareTestInputs } from '../../helpers/test-inputs';\n" +
      '\n' +
      "const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
      '\n' +
      'const BASIS_SEEDS = [\n' +
      '  3_943_001,\n' +
      '  3_943_002,\n' +
      '  3_943_003,\n' +
      '  3_943_004,\n' +
      '  3_943_005,\n' +
      '  3_943_006,\n' +
      '  3_943_007,\n' +
      '  3_943_008,\n' +
      '  3_943_009,\n' +
      '  3_943_010,\n' +
      '  3_943_011,\n' +
      '  3_943_012,\n' +
      '] as const;\n' +
      '\n' +
      'const HARD_BASIS_SEEDS = [\n' +
      '  5_117_001,\n' +
      '  5_117_002,\n' +
      '  5_117_003,\n' +
      '  5_117_004,\n' +
      '  5_117_005,\n' +
      '  5_117_006,\n' +
      '  5_117_007,\n' +
      '  5_117_008,\n' +
      '  5_117_009,\n' +
      '  5_117_010,\n' +
      '  5_117_011,\n' +
      '  5_117_012,\n' +
      '] as const;\n' +
      '\n' +
      'const BRUTAL_BASIS_SEEDS = [6_203_001, 6_203_002, 6_203_003] as const;\n' +
      'const BRUTAL_BASIS_GENERATED_DIGESTS = {\n' +
      '  // D635.48: each old projection differs only by the removed state.foggedCells: [] key.\n' +
      '  // 6203001 old 3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b\n' +
      "  6_203_001: 'dee4cc931af96a3276308cdd37a7c169b3cb250d5fa24896b97356b868f4f0c2',\n" +
      '  // 6203002 old cdb567192800c4dbea964fbabf03d88013d7d6402da8b391cf2f60e19e69a0c9\n' +
      "  6_203_002: 'b190349ee0bfa1b40ef9f6d76fa46f15e985e9442a70295f4b23b604ecd99fd3',\n" +
      '  // 6203003 old 6c470c04fd6373f7fa999d5f0c66539c54eb71e6094e2b83a2ca972ab91720f8\n' +
      "  6_203_003: 'f5db8767bbbef7376423bc0b1eeb307e39fc41d54fda879292fde90bcf0cf3db',\n" +
      '} as const;\n' +
      'const BRUTAL_BASIS_FIXTURE_DIGESTS = {\n' +
      "  6_203_001: '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',\n" +
      "  6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',\n" +
      "  6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',\n" +
      '} as const;\n' +
      'const BRUTAL_PRODUCTIVITY_SEEDS = [\n' +
      '  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,\n' +
      '  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,\n' +
      '] as const;\n' +
      '\n' +
      'const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {\n' +
      "  6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',\n" +
      "  6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',\n" +
      "  6_204_003: '105b5a7ff69ff572606a494fc336b29badb16f5c08438ec83fe0f1b7cf264e6f',\n" +
      "  6_204_004: 'e3b822d18589cfabdd6acc579daec22325540661869850ba55c583970725fd75',\n" +
      "  6_204_005: '3af3cf9a27216bc25dad9586696d47f587bec1e7ed8879569c6052e892693e72',\n" +
      "  6_204_006: 'be0fcd2d2cbf0415fc6b07189132ba665e30973b86a3847e43b427c11a238b4f',\n" +
      "  6_204_007: '56665e115694a30c5ff7da200e10394ae55093e5b85e03252bc2f36717cc5ba4',\n" +
      "  6_204_008: 'ae387c2541e566bdf565334837d2729eb9c1a65303fe0f412eed3288fd86d306',\n" +
      "  6_204_009: '04fbc7fd4cd029c63d0d936539ab53aca3d50c80206764aede55fbc0ba72a88e',\n" +
      "  6_204_010: '2768168a0da1fa28d35e86febb92a6035f892fbe5a1f703c89c13fe6ace3339b',\n" +
      '} as const;\n' +
      '\n' +
      'const D466_6204_NON_ROSTER_DIGESTS = {\n' +
      '  // D635.48: every old projection differs only by the removed state.foggedCells: [] key.\n' +
      '  // 6204001 old a510aaa8e785c641bcf3455df6f7ce8fbf71b0f2ec978e3b5e6f2ac62f289a3f\n' +
      "  6_204_001: 'b0c7344d10a0059c9b703b474c4b3a4e65c9d328d8c4f6edf8e55e62623fd5df',\n" +
      '  // 6204002 old c26ea2b4bca6ed4f7afbf044a9853b410287e80dc9a4a4fc6f322083ea6eb501\n' +
      "  6_204_002: 'b92cdc924d3a7b72da1cefb57a4bbb1821174b96f18b409bd88d2dda87905428',\n" +
      '  // 6204003 old 16bb7c43f6a2a1751928de993d50e5bd27e69b64c9ac8a4db9efbb72d94e2f66\n' +
      "  6_204_003: '1fa38b1c2f731d9b800013ccf71a065869d9156af876a07b1c2c5407012dac7a',\n" +
      '  // 6204004 old 9fb5c7812054c026eb9f8d070691fbf8af5925d5e6ce8123a33a3085af961990\n' +
      "  6_204_004: 'c1ccfbc1ba22774cb77f22e1a1aa0b303314670120d8326f7f33e0048e14bd46',\n" +
      '  // 6204005 old 0ad33edb24bda5de199144bf9c6d6f1412e61d2915486a1364817cd47438259d\n' +
      "  6_204_005: '4648396c6dbcc96611120ad186f6079534485cd6af2f4fd26f475c8b1db7a9e6',\n" +
      '  // 6204006 old d0138274a6f2b4cdf7996578b6408803ad723d808fb4b6d5487cc4b767dee880\n' +
      "  6_204_006: '407ee43e5d286f6649a1b6002daa8c2301df08fac106d2e58ff52b2343f3e9fc',\n" +
      '  // 6204007 old bcd1545c7a397c86a37c7a672aab72c99689a94a9df812e5a39db830cbb7c326\n' +
      "  6_204_007: '343ef8a190c7f3559f5fa98d18228c60733c3385a6d3b70ccf64f22d9ba1515e',\n" +
      '  // 6204008 old 1bf591adce1bceac8ea3a8e44f9fcfed5b252266ceccfcc96991cb20670bc8b1\n' +
      "  6_204_008: '1b9c525fd3d36bc0ede5353c9626208b664e5604254eb3bcfc0ec47ba6e1ebed',\n" +
      '  // 6204009 old a323c1eb80becabbae04661c815887440ddc89e02aa56a757cb776d5348d8255\n' +
      "  6_204_009: 'b88590db462f9e1a238658a6b3ee17c75e58c6c5aefb97cc695926c18ed83304',\n" +
      '  // 6204010 old 2439eb3aa80907618d35f188429eb9ca07c56e3b0c35b1218e7732917e6b7ee9\n' +
      "  6_204_010: '5e7fbe28033ec0ad69ae49c5bdf576c26c2299c7658e5487c2e0324129ec076e',\n" +
      '} as const;\n' +
      '\n' +
      'const D466_6204_CR_SPEND = {\n' +
      '  6_204_001: 60, 6_204_002: 50, 6_204_003: 64, 6_204_004: 54, 6_204_005: 58,\n' +
      '  6_204_006: 74, 6_204_007: 66, 6_204_008: 52, 6_204_009: 58, 6_204_010: 46,\n' +
      '} as const;\n' +
      '\n' +
      'const inputs = declareTestInputs({\n' +
      '  fixtures: [\n' +
      "    'tests/fixtures/arena-basis/seed-3943001.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943002.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943003.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943004.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943005.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943006.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943007.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943008.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943009.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943010.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943011.json',\n" +
      "    'tests/fixtures/arena-basis/seed-3943012.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117001.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117002.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117003.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117004.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117005.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117006.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117007.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117008.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117009.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117010.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117011.json',\n" +
      "    'tests/fixtures/arena-basis-hard/seed-5117012.json',\n" +
      "    'tests/fixtures/arena-basis-brutal/seed-6203001.json',\n" +
      "    'tests/fixtures/arena-basis-brutal/seed-6203002.json',\n" +
      "    'tests/fixtures/arena-basis-brutal/seed-6203003.json',\n" +
      "    'tests/fixtures/heldout-party/level-3.json',\n" +
      "    'tests/fixtures/heldout-party/level-4.json',\n" +
      "    'tests/fixtures/heldout-party/level-5.json',\n" +
      "    'tests/fixtures/heldout-party/level-6.json',\n" +
      '  ],\n' +
      '});\n' +
      '\n' +
      'function heldoutParty(level: 3 | 4 | 5 | 6) {\n' +
      '  const paths = {\n' +
      "    3: 'tests/fixtures/heldout-party/level-3.json',\n" +
      "    4: 'tests/fixtures/heldout-party/level-4.json',\n" +
      "    5: 'tests/fixtures/heldout-party/level-5.json',\n" +
      "    6: 'tests/fixtures/heldout-party/level-6.json',\n" +
      '  } as const;\n' +
      '  const loaded = loadExternalPartyPackBytes(inputs.fixtures.readText(paths[level]));\n' +
      "  if (loaded.status !== 'loaded') throw new Error(`Held-out party ${String(level)} did not load.`);\n" +
      '  return loaded.party;\n' +
      '}\n' +
      '\n' +
      'function independentMulberry32(seed: number): () => number {\n' +
      '  let state = seed >>> 0;\n' +
      '  return () => {\n' +
      '    state = (state + 0x6d2b79f5) >>> 0;\n' +
      '    let mixed = state;\n' +
      '    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);\n' +
      '    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);\n' +
      '    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;\n' +
      '  };\n' +
      '}\n' +
      '\n' +
      'function omitUndefined(value: unknown): unknown {\n' +
      '  return JSON.parse(JSON.stringify(value)) as unknown;\n' +
      '}\n' +
      '\n' +
      'function expectValidEnvironmentRegions(room: GeneratedRoom): void {\n' +
      '  const environment = room.encounter.state.environment;\n' +
      '  const regions = [\n' +
      '    ...environment.difficultTerrainRegions,\n' +
      '    ...environment.lightRegions,\n' +
      '    ...environment.obscurementRegions,\n' +
      '    ...(environment.movementRegions ?? []),\n' +
      '  ];\n' +
      '  for (const region of regions) {\n' +
      "    expect(region.id.trim()).not.toBe('');\n" +
      '    expect(region.cells.length).toBeGreaterThan(0);\n' +
      '  }\n' +
      '}\n' +
      '\n' +
      'function d466NonRosterProjection(room: GeneratedRoom): unknown {\n' +
      '  const monsterTokenIndexes = new Map(room.spec.monsterRoster.map((entry, index) => [\n' +
      '    String(entry.tokenId),\n' +
      '    index,\n' +
      '  ]));\n' +
      '  return omitUndefined({\n' +
      '    spec: { ...room.spec, monsterRoster: [] },\n' +
      '    encounter: {\n' +
      '      ...room.encounter,\n' +
      '      state: {\n' +
      '        ...room.encounter.state,\n' +
      '        combatants: room.encounter.state.combatants.filter(\n' +
      "          (combatant) => combatant.profile.kind !== 'monster',\n" +
      '        ).map((combatant) => ({\n' +
      '          ...combatant,\n' +
      '          profile: {\n' +
      '            ...combatant.profile,\n' +
      '            rules: { ...combatant.profile.rules, sizeCategory: legacyFixtureSize(combatant.profile) },\n' +
      '          },\n' +
      '        })),\n' +
      '        tokens: room.encounter.state.tokens.map((token) => {\n' +
      '          const monsterIndex = monsterTokenIndexes.get(String(token.id));\n' +
      '          return {\n' +
      '            ...token,\n' +
      '            placementMode: undefined,\n' +
      ' '... 23004 more characters,
    ''
  ],
  pid: 10,
  stdout: "import { describe, expect, it } from 'vitest';\n" +
    "import { canonicalJson } from '../../../src/commands/canonical-json';\n" +
    "import { monsterCombatantProfile } from '../../../src/combat/combatant';\n" +
    "import { reduceEncounter } from '../../../src/combat/encounter';\n" +
    "import { mulberry32 } from '../../../src/combat/random';\n" +
    "import { BUNDLED_MONSTER_ROSTER, STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';\n" +
    "import { sha256 } from '../../../src/crypto/sha256';\n" +
    "import { creatureSizes, type KnownCreatureSize } from '../../../src/domain/enums';\n" +
    'import {\n' +
    '  D466_GENERATED_ROOM_OVERRIDES,\n' +
    '  d466CreatureReplacement,\n' +
    '  d466ReplacementStatblock,\n' +
    "} from '../../../src/vtt/d466-room-overrides';\n" +
    'import {\n' +
    '  generateRoom,\n' +
    '  heldoutMaximizingMonsterRosters,\n' +
    '  HELDOUT_STARTER_MONSTER_FAMILIES,\n' +
    '  ROOM_GRID_DIMENSIONS,\n' +
    '  type GeneratedRoom,\n' +
    "} from '../../../src/vtt/room-generator';\n" +
    'import {\n' +
    '  brutalRoomMembershipViolations,\n' +
    '  hardRoomMembershipViolations,\n' +
    "} from '../../../tools/d569-second-family-manifest';\n" +
    "import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';\n" +
    "import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';\n" +
    "import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';\n" +
    "import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';\n" +
    "import { declareTestInputs } from '../../helpers/test-inputs';\n" +
    '\n' +
    "const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
    '\n' +
    'const BASIS_SEEDS = [\n' +
    '  3_943_001,\n' +
    '  3_943_002,\n' +
    '  3_943_003,\n' +
    '  3_943_004,\n' +
    '  3_943_005,\n' +
    '  3_943_006,\n' +
    '  3_943_007,\n' +
    '  3_943_008,\n' +
    '  3_943_009,\n' +
    '  3_943_010,\n' +
    '  3_943_011,\n' +
    '  3_943_012,\n' +
    '] as const;\n' +
    '\n' +
    'const HARD_BASIS_SEEDS = [\n' +
    '  5_117_001,\n' +
    '  5_117_002,\n' +
    '  5_117_003,\n' +
    '  5_117_004,\n' +
    '  5_117_005,\n' +
    '  5_117_006,\n' +
    '  5_117_007,\n' +
    '  5_117_008,\n' +
    '  5_117_009,\n' +
    '  5_117_010,\n' +
    '  5_117_011,\n' +
    '  5_117_012,\n' +
    '] as const;\n' +
    '\n' +
    'const BRUTAL_BASIS_SEEDS = [6_203_001, 6_203_002, 6_203_003] as const;\n' +
    'const BRUTAL_BASIS_GENERATED_DIGESTS = {\n' +
    '  // D635.48: each old projection differs only by the removed state.foggedCells: [] key.\n' +
    '  // 6203001 old 3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b\n' +
    "  6_203_001: 'dee4cc931af96a3276308cdd37a7c169b3cb250d5fa24896b97356b868f4f0c2',\n" +
    '  // 6203002 old cdb567192800c4dbea964fbabf03d88013d7d6402da8b391cf2f60e19e69a0c9\n' +
    "  6_203_002: 'b190349ee0bfa1b40ef9f6d76fa46f15e985e9442a70295f4b23b604ecd99fd3',\n" +
    '  // 6203003 old 6c470c04fd6373f7fa999d5f0c66539c54eb71e6094e2b83a2ca972ab91720f8\n' +
    "  6_203_003: 'f5db8767bbbef7376423bc0b1eeb307e39fc41d54fda879292fde90bcf0cf3db',\n" +
    '} as const;\n' +
    'const BRUTAL_BASIS_FIXTURE_DIGESTS = {\n' +
    "  6_203_001: '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',\n" +
    "  6_203_002: '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',\n" +
    "  6_203_003: 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',\n" +
    '} as const;\n' +
    'const BRUTAL_PRODUCTIVITY_SEEDS = [\n' +
    '  6_203_001, 6_203_002, 6_203_003, 6_203_004, 6_203_005,\n' +
    '  6_203_006, 6_203_007, 6_203_008, 6_203_009, 6_203_010,\n' +
    '] as const;\n' +
    '\n' +
    'const D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS = {\n' +
    "  6_204_001: 'df493054bdfcbc09c63a9930b9299f41d0c9558be828f2b76bee03ac95d9073c',\n" +
    "  6_204_002: '0b83417d94a2741bf28865ac9b4b09de44e3d82eee718109e09f2fd4cb4c5b14',\n" +
    "  6_204_003: '105b5a7ff69ff572606a494fc336b29badb16f5c08438ec83fe0f1b7cf264e6f',\n" +
    "  6_204_004: 'e3b822d18589cfabdd6acc579daec22325540661869850ba55c583970725fd75',\n" +
    "  6_204_005: '3af3cf9a27216bc25dad9586696d47f587bec1e7ed8879569c6052e892693e72',\n" +
    "  6_204_006: 'be0fcd2d2cbf0415fc6b07189132ba665e30973b86a3847e43b427c11a238b4f',\n" +
    "  6_204_007: '56665e115694a30c5ff7da200e10394ae55093e5b85e03252bc2f36717cc5ba4',\n" +
    "  6_204_008: 'ae387c2541e566bdf565334837d2729eb9c1a65303fe0f412eed3288fd86d306',\n" +
    "  6_204_009: '04fbc7fd4cd029c63d0d936539ab53aca3d50c80206764aede55fbc0ba72a88e',\n" +
    "  6_204_010: '2768168a0da1fa28d35e86febb92a6035f892fbe5a1f703c89c13fe6ace3339b',\n" +
    '} as const;\n' +
    '\n' +
    'const D466_6204_NON_ROSTER_DIGESTS = {\n' +
    '  // D635.48: every old projection differs only by the removed state.foggedCells: [] key.\n' +
    '  // 6204001 old a510aaa8e785c641bcf3455df6f7ce8fbf71b0f2ec978e3b5e6f2ac62f289a3f\n' +
    "  6_204_001: 'b0c7344d10a0059c9b703b474c4b3a4e65c9d328d8c4f6edf8e55e62623fd5df',\n" +
    '  // 6204002 old c26ea2b4bca6ed4f7afbf044a9853b410287e80dc9a4a4fc6f322083ea6eb501\n' +
    "  6_204_002: 'b92cdc924d3a7b72da1cefb57a4bbb1821174b96f18b409bd88d2dda87905428',\n" +
    '  // 6204003 old 16bb7c43f6a2a1751928de993d50e5bd27e69b64c9ac8a4db9efbb72d94e2f66\n' +
    "  6_204_003: '1fa38b1c2f731d9b800013ccf71a065869d9156af876a07b1c2c5407012dac7a',\n" +
    '  // 6204004 old 9fb5c7812054c026eb9f8d070691fbf8af5925d5e6ce8123a33a3085af961990\n' +
    "  6_204_004: 'c1ccfbc1ba22774cb77f22e1a1aa0b303314670120d8326f7f33e0048e14bd46',\n" +
    '  // 6204005 old 0ad33edb24bda5de199144bf9c6d6f1412e61d2915486a1364817cd47438259d\n' +
    "  6_204_005: '4648396c6dbcc96611120ad186f6079534485cd6af2f4fd26f475c8b1db7a9e6',\n" +
    '  // 6204006 old d0138274a6f2b4cdf7996578b6408803ad723d808fb4b6d5487cc4b767dee880\n' +
    "  6_204_006: '407ee43e5d286f6649a1b6002daa8c2301df08fac106d2e58ff52b2343f3e9fc',\n" +
    '  // 6204007 old bcd1545c7a397c86a37c7a672aab72c99689a94a9df812e5a39db830cbb7c326\n' +
    "  6_204_007: '343ef8a190c7f3559f5fa98d18228c60733c3385a6d3b70ccf64f22d9ba1515e',\n" +
    '  // 6204008 old 1bf591adce1bceac8ea3a8e44f9fcfed5b252266ceccfcc96991cb20670bc8b1\n' +
    "  6_204_008: '1b9c525fd3d36bc0ede5353c9626208b664e5604254eb3bcfc0ec47ba6e1ebed',\n" +
    '  // 6204009 old a323c1eb80becabbae04661c815887440ddc89e02aa56a757cb776d5348d8255\n' +
    "  6_204_009: 'b88590db462f9e1a238658a6b3ee17c75e58c6c5aefb97cc695926c18ed83304',\n" +
    '  // 6204010 old 2439eb3aa80907618d35f188429eb9ca07c56e3b0c35b1218e7732917e6b7ee9\n' +
    "  6_204_010: '5e7fbe28033ec0ad69ae49c5bdf576c26c2299c7658e5487c2e0324129ec076e',\n" +
    '} as const;\n' +
    '\n' +
    'const D466_6204_CR_SPEND = {\n' +
    '  6_204_001: 60, 6_204_002: 50, 6_204_003: 64, 6_204_004: 54, 6_204_005: 58,\n' +
    '  6_204_006: 74, 6_204_007: 66, 6_204_008: 52, 6_204_009: 58, 6_204_010: 46,\n' +
    '} as const;\n' +
    '\n' +
    'const inputs = declareTestInputs({\n' +
    '  fixtures: [\n' +
    "    'tests/fixtures/arena-basis/seed-3943001.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943002.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943003.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943004.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943005.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943006.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943007.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943008.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943009.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943010.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943011.json',\n" +
    "    'tests/fixtures/arena-basis/seed-3943012.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117001.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117002.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117003.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117004.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117005.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117006.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117007.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117008.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117009.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117010.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117011.json',\n" +
    "    'tests/fixtures/arena-basis-hard/seed-5117012.json',\n" +
    "    'tests/fixtures/arena-basis-brutal/seed-6203001.json',\n" +
    "    'tests/fixtures/arena-basis-brutal/seed-6203002.json',\n" +
    "    'tests/fixtures/arena-basis-brutal/seed-6203003.json',\n" +
    "    'tests/fixtures/heldout-party/level-3.json',\n" +
    "    'tests/fixtures/heldout-party/level-4.json',\n" +
    "    'tests/fixtures/heldout-party/level-5.json',\n" +
    "    'tests/fixtures/heldout-party/level-6.json',\n" +
    '  ],\n' +
    '});\n' +
    '\n' +
    'function heldoutParty(level: 3 | 4 | 5 | 6) {\n' +
    '  const paths = {\n' +
    "    3: 'tests/fixtures/heldout-party/level-3.json',\n" +
    "    4: 'tests/fixtures/heldout-party/level-4.json',\n" +
    "    5: 'tests/fixtures/heldout-party/level-5.json',\n" +
    "    6: 'tests/fixtures/heldout-party/level-6.json',\n" +
    '  } as const;\n' +
    '  const loaded = loadExternalPartyPackBytes(inputs.fixtures.readText(paths[level]));\n' +
    "  if (loaded.status !== 'loaded') throw new Error(`Held-out party ${String(level)} did not load.`);\n" +
    '  return loaded.party;\n' +
    '}\n' +
    '\n' +
    'function independentMulberry32(seed: number): () => number {\n' +
    '  let state = seed >>> 0;\n' +
    '  return () => {\n' +
    '    state = (state + 0x6d2b79f5) >>> 0;\n' +
    '    let mixed = state;\n' +
    '    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);\n' +
    '    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);\n' +
    '    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;\n' +
    '  };\n' +
    '}\n' +
    '\n' +
    'function omitUndefined(value: unknown): unknown {\n' +
    '  return JSON.parse(JSON.stringify(value)) as unknown;\n' +
    '}\n' +
    '\n' +
    'function expectValidEnvironmentRegions(room: GeneratedRoom): void {\n' +
    '  const environment = room.encounter.state.environment;\n' +
    '  const regions = [\n' +
    '    ...environment.difficultTerrainRegions,\n' +
    '    ...environment.lightRegions,\n' +
    '    ...environment.obscurementRegions,\n' +
    '    ...(environment.movementRegions ?? []),\n' +
    '  ];\n' +
    '  for (const region of regions) {\n' +
    "    expect(region.id.trim()).not.toBe('');\n" +
    '    expect(region.cells.length).toBeGreaterThan(0);\n' +
    '  }\n' +
    '}\n' +
    '\n' +
    'function d466NonRosterProjection(room: GeneratedRoom): unknown {\n' +
    '  const monsterTokenIndexes = new Map(room.spec.monsterRoster.map((entry, index) => [\n' +
    '    String(entry.tokenId),\n' +
    '    index,\n' +
    '  ]));\n' +
    '  return omitUndefined({\n' +
    '    spec: { ...room.spec, monsterRoster: [] },\n' +
    '    encounter: {\n' +
    '      ...room.encounter,\n' +
    '      state: {\n' +
    '        ...room.encounter.state,\n' +
    '        combatants: room.encounter.state.combatants.filter(\n' +
    "          (combatant) => combatant.profile.kind !== 'monster',\n" +
    '        ).map((combatant) => ({\n' +
    '          ...combatant,\n' +
    '          profile: {\n' +
    '            ...combatant.profile,\n' +
    '            rules: { ...combatant.profile.rules, sizeCategory: legacyFixtureSize(combatant.profile) },\n' +
    '          },\n' +
    '        })),\n' +
    '        tokens: room.encounter.state.tokens.map((token) => {\n' +
    '          const monsterIndex = monsterTokenIndexes.get(String(token.id));\n' +
    '          return {\n' +
    '            ...token,\n' +
    '            placementMode: undefined,\n' +
    ' '... 23004 more characters,
  stderr: ''
}

Node.js v24.13.0

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
for(const mutate of [false,true]){
console.log('RESTORED STATIC ASSERTION; budget mutant =',mutate);
const plugin={name:'review-retained-static-witness',enforce:'pre',transform(code,id){
if(id.endsWith('/tests/unit/vtt/room-generator.test.ts'))return \"import {brutalRoomMembershipViolations as reviewMembership} from '../../../tools/d569-second-family-manifest';\\n\"+code+"'`'"\\nit('review former 6203010 static assertion',()=>{expect(reviewMembership(generateRoom(6203010,{difficulty:'brutal'})).filter(v=>v.code"'!=='"'brutal_productivity')).toEqual([]);});"'`;
if(mutate&&id.endsWith('"'/src/vtt/room-generator.ts'))return code.replace('const legacy = generateLegacyRoom(seed, options);',"'`const legacy = generateLegacyRoom(seed, options);'"\\n if(seed===6_203_010 && options.difficulty==='brutal') return {...legacy,spec:{...legacy.spec,challengeBudgetEighths:legacy.spec.challengeBudgetEighths+1}};"'`);
}};
const ctx=await startVitest('"'test',['tests/unit/vtt/room-generator.test.ts'],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,testNamePattern:'review former',reporters:['dot']},{plugins:[plugin]});await ctx.close();
}
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 6200ms:
RESTORED STATIC ASSERTION; budget mutant = false

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

--------------------------------------------------------·

 Test Files  1 passed (1)
      Tests  1 passed | 56 skipped (57)
   Start at  22:54:45
   Duration  3.10s (transform 1.27s, setup 0ms, import 2.87s, tests 144ms, environment 0ms)

RESTORED STATIC ASSERTION; budget mutant = true

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

--------------------------------------------------------x

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator.test.ts > review former 6203010 static assertion
AssertionError: expected [ { code: 'brutal_budget', …(1) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "code": "brutal_budget",
+     "message": "brutal budget must be scaled from hard and spend 90-100 percent",
+   },
+ ]

 ❯ tests/unit/vtt/room-generator.test.ts:724:162
    719|     );
    720|   });
    721| });
       |    ^
    722|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 56 skipped (57)
   Start at  22:54:48
   Duration  2.88s (transform 1.07s, setup 0ms, import 2.66s, tests 142ms, environment 0ms)


exec
/bin/bash -lc 'git status --short && git diff --check e92ebc93 8284a91c && git diff --exit-code e92ebc93 8284a91c -- tests/fixtures' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
codex
**B2-F1 — P2 — The 6203 retirement also removes static membership checks.** [room-generator.test.ts:575](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/room-generator.test.ts:575)

The deleted assertion at baseline line 592 called `brutalRoomMembershipViolations(brutal)`, enforcing difficulty, scaled budget/90–100% spend, implemented caster, and terrain requirements alongside productivity for **6203001–6203010**. Removing the entire test exceeds the requested productivity-only retirement. The retained byte/digest tests cover only **6203001–6203003**.

**Evidence:** an in-memory generator mutant adding **1** to seed **6203010**’s brutal budget leaves the current room-generator suite **56/56 green**. Restoring the former static assertion, filtering only `brutal_productivity`, passes unmutated and fails with `brutal_budget` under that mutant.

**Fix:** retain the ten-seed static membership assertions, filtering only `brutal_productivity`; remove the per-monster productivity loop and retain the rationale comment.

Other checks passed:

- **6206:** only its productivity loop was removed; structural, reducer, SHA, and round-execution assertions remain. The other change is formatting.
- **B1-F1:** the required rationale comment is now present.
- **V2 declarations:** exactly **30** correct paths/seeds across 6209/6210/6211, registered through `declareTestInputs` and read through its fixture reader.
- **PLAN-F6:** positive movement OR attack/save/cast/world-object use is preserved. Only targeted offensive components receive trace checks. These call the same `traceCombatantLine` used by `engine-query-port.ts:1168`, with `sourceAnchor: mechanics.finalPosition`, requiring sight-clear and non-total.
- Membership runs after decoding, without hash shortcuts, catch-and-ignore logic, or early success. Supplying an in-memory fixture with matching seed/provenance and an invalid budget produces a **`brutal_budget` assertion failure**, not ENOENT.

Verification commands and results:

| Command/check | Result |
|---|---|
| `sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md` | Exact supplied hash |
| `wc -l .tmp-plans/2026-09-17-cohort-01-plan.md` | **403** |
| `npx tsc -p tsconfig.app.json --noEmit` | **0** |
| `npx tsc -p tsconfig.node.json --noEmit` | **0** |
| `git diff --check e92ebc93 8284a91c` | **0** |
| `git diff --exit-code e92ebc93 8284a91c -- tests/fixtures` | **0**, no fixture changes |
| `git status --short` | Empty |
| Python scan of `git diff --unified=0 e92ebc93 8284a91c` | **229 added lines; 0 over 120** |

Targeted suites ran serially using this command:

```js
node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
for(const file of ['tests/unit/vtt/arena-basis-brutal-v2.test.ts','tests/unit/vtt/room-generator.test.ts','tests/unit/vtt/arena-basis-brutal-b.test.ts','tests/unit/tools/d569-second-family-manifest.test.ts']){
 const ctx=await startVitest('test',[file],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,fileParallelism:false,reporters:['default']});await ctx.close();
}
JS
```

Results: v2 **4 passed / 30 ENOENT failures**; room-generator **56/56**; brutal-b **47/47**; second-family **50/50**.

In-memory mutants each killed their selected witness (**1 failed; 33 unselected**): force productivity true, delete the movement arm, and ignore `blocksSight`. No files were edited.

VERDICT: REJECT (0 P1, 1 P2)

REVIEW DONE
tokens used
143,761
**B2-F1 — P2 — The 6203 retirement also removes static membership checks.** [room-generator.test.ts:575](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/room-generator.test.ts:575)

The deleted assertion at baseline line 592 called `brutalRoomMembershipViolations(brutal)`, enforcing difficulty, scaled budget/90–100% spend, implemented caster, and terrain requirements alongside productivity for **6203001–6203010**. Removing the entire test exceeds the requested productivity-only retirement. The retained byte/digest tests cover only **6203001–6203003**.

**Evidence:** an in-memory generator mutant adding **1** to seed **6203010**’s brutal budget leaves the current room-generator suite **56/56 green**. Restoring the former static assertion, filtering only `brutal_productivity`, passes unmutated and fails with `brutal_budget` under that mutant.

**Fix:** retain the ten-seed static membership assertions, filtering only `brutal_productivity`; remove the per-monster productivity loop and retain the rationale comment.

Other checks passed:

- **6206:** only its productivity loop was removed; structural, reducer, SHA, and round-execution assertions remain. The other change is formatting.
- **B1-F1:** the required rationale comment is now present.
- **V2 declarations:** exactly **30** correct paths/seeds across 6209/6210/6211, registered through `declareTestInputs` and read through its fixture reader.
- **PLAN-F6:** positive movement OR attack/save/cast/world-object use is preserved. Only targeted offensive components receive trace checks. These call the same `traceCombatantLine` used by `engine-query-port.ts:1168`, with `sourceAnchor: mechanics.finalPosition`, requiring sight-clear and non-total.
- Membership runs after decoding, without hash shortcuts, catch-and-ignore logic, or early success. Supplying an in-memory fixture with matching seed/provenance and an invalid budget produces a **`brutal_budget` assertion failure**, not ENOENT.

Verification commands and results:

| Command/check | Result |
|---|---|
| `sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md` | Exact supplied hash |
| `wc -l .tmp-plans/2026-09-17-cohort-01-plan.md` | **403** |
| `npx tsc -p tsconfig.app.json --noEmit` | **0** |
| `npx tsc -p tsconfig.node.json --noEmit` | **0** |
| `git diff --check e92ebc93 8284a91c` | **0** |
| `git diff --exit-code e92ebc93 8284a91c -- tests/fixtures` | **0**, no fixture changes |
| `git status --short` | Empty |
| Python scan of `git diff --unified=0 e92ebc93 8284a91c` | **229 added lines; 0 over 120** |

Targeted suites ran serially using this command:

```js
node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
for(const file of ['tests/unit/vtt/arena-basis-brutal-v2.test.ts','tests/unit/vtt/room-generator.test.ts','tests/unit/vtt/arena-basis-brutal-b.test.ts','tests/unit/tools/d569-second-family-manifest.test.ts']){
 const ctx=await startVitest('test',[file],{config:false,watch:false,cache:false,pool:'threads',maxWorkers:1,fileParallelism:false,reporters:['default']});await ctx.close();
}
JS
```

Results: v2 **4 passed / 30 ENOENT failures**; room-generator **56/56**; brutal-b **47/47**; second-family **50/50**.

In-memory mutants each killed their selected witness (**1 failed; 33 unselected**): force productivity true, delete the movement arm, and ignore `blocksSight`. No files were edited.

VERDICT: REJECT (0 P1, 1 P2)

REVIEW DONE
