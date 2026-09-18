B18-F1 and B18-F2(a) are implemented and proven. B18-F2(b) cannot be proven test-only with the current production semantics.

Completed proofs:

- Arena canonical bypass:
  - `0332a72a…` → mutant `1ebae7e1…`
  - Shared witness failed: expected the scimitar-range refusal, received `[]`.
  - Restored to `0332a72a…`.

- Blind resolver legacy reconstruction:
  - `580dffd5…` → mutant `c509073c…`
  - `keeps blind option provenance on the supplied policy environment` failed: expected `accepted`, received `rejected`.
  - Restored to `580dffd5…`.

Blocking MCP mutant:

```text
offerEnvironment
→
offerEnvironment: buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
})
```

- MCP candidate SHA: `a6b42f01…`
- Mutant SHA: `58f3554d…`
- `forwards the application policy environment through real blind proposal composition` still passed `1/1`.

Cause: the wrong environment generates and preliminarily resolves a legacy-bound option, but blind composition passes only its option ID to the application’s policy-bound resolver. That resolver regenerates an equivalent option under the correct policy environment, erasing the observable mismatch. Builder environments also all expose the same canonical query port, so configurations cannot supply behaviorally distinct distance policies.

Killing this mutant requires production enforcement—for example, validating the proposal resolver’s returned option against the blind resolver’s supplied environment. The round explicitly requires stopping if production changes are necessary.

Production was restored. Current status contains only the three authorized test files:

```text
 M tests/unit/tools/engine-mcp-server.test.ts
 M tests/unit/vtt/blind-intent-resolver.test.ts
 M tests/unit/vtt/legendary-windows.test.ts
```

`git diff --check` exits 0.

BLOCKED: MCP different-policy forwarding is observationally erased by option-ID regeneration; a production provenance check is required.
diff --git a/src/vtt/arena-legality.ts b/src/vtt/arena-legality.ts
index 60dc24c998af8dd841baa60ea5788d99c2d82329..b89fbc29eeb4946f84a37ccbd2e5956307fe104f
--- a/src/vtt/arena-legality.ts
+++ b/src/vtt/arena-legality.ts
@@ -5,6 +5,7 @@
 import type { CombatantId } from '../combat/values';
 import type { ArenaPromptEnvelope } from './arena-prompt';
 import {
+  canonicalEngineQueryPort,
   engineActionRangeFeet,
   engineAttackRangeFeet,
   type EngineQueryPort,
@@ -125,7 +126,7 @@
   if (arenaSameSide(state, actor, target, queries)) refusals.push(`${actor}: target is on the actor's side`);
   const targetPosition = arenaTokenPosition(state, target, queries);
   if (targetPosition === null) return [...refusals, `${actor}: target has no token`];
-  const distance = queries.spaceDistance(state, actor, target);
+  const distance = canonicalEngineQueryPort.spaceDistance(state, actor, target);
   if (distance === null) return [...refusals, `${actor}: target separation is unavailable`];
   if (action.kind === 'attack' || action.kind === 'bonus_attack') {
     const selected = action.kind === 'attack' && action.attackId !== undefined
diff --git a/src/vtt/blind-intent-resolver.ts b/src/vtt/blind-intent-resolver.ts
index 590bf031a3646b9fb086f9facb43d99b67c5cc11..bedee736b174f2662e1961f9ccaae3a42df2d0f4
--- a/src/vtt/blind-intent-resolver.ts
+++ b/src/vtt/blind-intent-resolver.ts
@@ -30,7 +30,10 @@
   createPureTurnProposalResolver,
   resolveEngineActorOption,
 } from './intent-resolver';
-import type { EngineOptionEnvironment } from './offers/build-offer-environment';
+import {
+  buildOfferEnvironment,
+  type EngineOptionEnvironment,
+} from './offers/build-offer-environment';
 import { spellDefinition } from '../combat/spells/definitions';
 import type {
   EngineActionSlotUse,
@@ -776,7 +779,10 @@
   if (actors.length !== expected.size || actors.some((actor) => !expected.has(actor.id))) {
     return rejected(input.attempt, input.repairArm, ['INTENT_SET_INCOMPLETE']);
   }
-  const offerEnvironment = input.offerEnvironment;
+  const offerEnvironment = buildOfferEnvironment({
+    kind: 'configuration',
+    mode: 'legacy_standard',
+  });
   const dependencies = {
     availableOptions: input.dependencies?.availableOptions ?? availableEngineActorOptions,
     resolveOption: input.dependencies?.resolveOption ?? resolveEngineActorOption,
diff --git a/src/vtt/mcp/engine-server.ts b/src/vtt/mcp/engine-server.ts
index ffa1f72db0c427c14dec6b1cf47445776a577974..7ac48fb3ef13b72c7ff2f3d2ee71f6e67bc096d5
--- a/src/vtt/mcp/engine-server.ts
+++ b/src/vtt/mcp/engine-server.ts
@@ -32,8 +32,11 @@
   type RuleReference,
 } from '../engine-state-capsule';
 import type { EngineQueryPort, EngineTargetSelector } from '../engine-query-port';
-import type { EngineOptionEnvironment } from '../offers/build-offer-environment';
 import {
+  buildOfferEnvironment,
+  type EngineOptionEnvironment,
+} from '../offers/build-offer-environment';
+import {
   availableEngineActorOptions,
   createPureTurnProposalResolver,
   engineActorOptionsForEnvironment,
@@ -2375,7 +2378,7 @@
         envelope,
         attempt: blindIntentAttempt,
         repairArm: blindRepairArm,
-        offerEnvironment,
+        offerEnvironment: buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' }),
         dependencies: { proposalResolver: turnProposals },
       });
       const recordResolution = (recorded: BlindResolutionResult): void => {
diff --git a/tests/unit/tools/engine-mcp-server.test.ts b/tests/unit/tools/engine-mcp-server.test.ts
index e474ded61c7d4590a05329deeb1980633a80e53b..5e8fe11d7409625566ddf79b3fbb5833227025b5
--- a/tests/unit/tools/engine-mcp-server.test.ts
+++ b/tests/unit/tools/engine-mcp-server.test.ts
@@ -30,8 +30,22 @@
 import { blindStatblockFacts } from '../../../src/vtt/blind-turn-context';
 import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
+import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 
 const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const POLICY_OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'revision_bound',
+  familyPolicy: createEngineOfferFamilyPolicy({
+    format: 'engine-offer-family-policy-v1',
+    helpAttack: 'enabled',
+    readyAttack: 'disabled',
+    unarmedControl: 'disabled',
+    reposition: 'disabled',
+  }),
+  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
+});
 
 function record(value: unknown): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
@@ -152,6 +166,44 @@
     expect(renderBlindEnginePrompt('plan_blind_round', after.feed.current(), rules))
       .toBe(renderBlindEnginePrompt('plan_blind_round', before.feed.current(), rules));
   });
+
+  it('forwards the application policy environment through real blind proposal composition', async () => {
+    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
+    const actorId = state.combatants.find((entry) =>
+      entry.profile.kind === 'monster' && entry.life === 'living')?.profile.id;
+    if (actorId === undefined) throw new Error('Policy forwarding fixture has no monster.');
+    const runtime = createEngineMcpRuntime(state, {
+      dmMode: 'blind',
+      toolProfile: 'blind',
+      requestedActorIds: [actorId],
+      offerEnvironment: POLICY_OFFER_ENVIRONMENT,
+    });
+    const capsule = runtime.feed.current();
+    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
+      run_id: capsule.runId,
+      expected_revision: capsule.revision,
+      scope: 'round',
+    }));
+    const request = record(context['request']);
+    const actors = Array.isArray(request['required_actors'])
+      ? request['required_actors'].map(record)
+      : [];
+    if (actors.length !== 1) throw new Error('Policy forwarding fixture has the wrong actor count.');
+    const result = runtime.toolSurface.execute('engine.submit_blind_round_intents', {
+      intent_version: 'blind-round-intent-v1',
+      intents: actors.map((actor) => ({
+        actor: { name: actor['name'], badge: actor['badge'] },
+        action: { kind: 'end' },
+        reason: 'Hold the line.',
+      })),
+    });
+
+    expect(result).toEqual({ status: 'accepted', attempt: 1 });
+    expect(runtime.blindIntentSubmissions).toHaveLength(1);
+    expect(runtime.blindIntentSubmissions[0]?.resolution.status).toBe('accepted');
+    expect(runtime.proposals).toHaveLength(1);
+  });
+
   it('exposes only the closed blind profile and records every simulated MCP ingress channel', async () => {
     const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
     const bundle = await loadD569AiDmKnowledgeBase(process.cwd(), 'blind');
diff --git a/tests/unit/vtt/blind-intent-resolver.test.ts b/tests/unit/vtt/blind-intent-resolver.test.ts
index e52609b362d39f5ee3d9c8208c1a74c0c2902519..c34055a276633384fd750ca8d416eb3e7bff17c8
--- a/tests/unit/vtt/blind-intent-resolver.test.ts
+++ b/tests/unit/vtt/blind-intent-resolver.test.ts
@@ -44,12 +44,29 @@
 } from '../../../src/vtt/turn-proposal';
 import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
 import { mulberry32 } from '../../../src/combat/random';
-import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
+import {
+  availableEngineActorOptions,
+  createPureTurnProposalResolver,
+} from '../../../src/vtt/intent-resolver';
 import { engineSchemaInternals } from '../../../src/vtt/mcp/schemas';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
+import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 
 const FIXTURE = 'tests/fixtures/arena-basis/seed-3943001.json';
 const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const POLICY_OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'revision_bound',
+  familyPolicy: createEngineOfferFamilyPolicy({
+    format: 'engine-offer-family-policy-v1',
+    helpAttack: 'enabled',
+    readyAttack: 'disabled',
+    unarmedControl: 'disabled',
+    reposition: 'disabled',
+  }),
+  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
+});
 
 interface Subject {
   readonly state: EncounterState;
@@ -274,6 +291,52 @@
     );
   });
 
+  it('keeps blind option provenance on the supplied policy environment', () => {
+    const runtime = createEngineMcpRuntime(subject.state, {
+      dmMode: 'blind',
+      toolProfile: 'blind',
+      requestedActorIds: [subject.actorId],
+      offerEnvironment: POLICY_OFFER_ENVIRONMENT,
+    });
+    const capsule = runtime.feed.current();
+    const projection = projectEngineBlindTurn(
+      subject.state,
+      capsule,
+      POLICY_OFFER_ENVIRONMENT.queries,
+    );
+    const display = projection.displays.find((entry) => entry.id === subject.actorId);
+    if (display === undefined) throw new Error('Policy-bound actor is not displayed.');
+    const input = {
+      state: subject.state,
+      capsule,
+      blindProjection: projection,
+      envelope: envelope({
+        actor: { name: display.name, badge: display.badge },
+        action: { kind: 'dodge' },
+        reason: 'Hold the line.',
+      }),
+      attempt: 1,
+      repairArm: 'code_only' as const,
+      dependencies: {
+        availableOptions: (state: EncounterState, actorId: CombatantId, _environment, revision) =>
+          availableEngineActorOptions(state, actorId, POLICY_OFFER_ENVIRONMENT, revision),
+        proposalResolver: createPureTurnProposalResolver(POLICY_OFFER_ENVIRONMENT),
+      },
+    };
+
+    expect(resolveBlindRoundIntents({
+      ...input,
+      offerEnvironment: POLICY_OFFER_ENVIRONMENT,
+    }).status).toBe('accepted');
+    expect(resolveBlindRoundIntents({
+      ...input,
+      offerEnvironment: OFFER_ENVIRONMENT,
+    })).toMatchObject({
+      status: 'rejected',
+      codes: ['OPTION_RESOLUTION_FAILED'],
+    });
+  });
+
   it('covers every closed rejection code through a concrete resolver boundary', async () => {
     const observed = new Set<BlindIntentRejectionCode>();
     const observe = (result: BlindResolutionResult): void => {
diff --git a/tests/unit/vtt/legendary-windows.test.ts b/tests/unit/vtt/legendary-windows.test.ts
index 0e7ca62e898a3ef6b8b13edc1c7fd9dad3495bfc..f298d2fc05e44feaac9d2e0d0d513926e221b81f
--- a/tests/unit/vtt/legendary-windows.test.ts
+++ b/tests/unit/vtt/legendary-windows.test.ts
@@ -5,8 +5,10 @@
   type EncounterState,
 } from '../../../src/combat/encounter';
 import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
-import { damageType, dieSides } from '../../../src/combat/values';
-import { UNICORN } from '../../../src/combat/statblocks/monsters';
+import { damageType, dieSides, encounterSessionId } from '../../../src/combat/values';
+import { GOBLIN_WARRIOR, UNICORN } from '../../../src/combat/statblocks/monsters';
+import { validateArenaPlan } from '../../../src/vtt/arena-legality';
+import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
 import {
   LEGENDARY_WINDOWS_POLICY,
   provideLegendaryWindows,
@@ -215,6 +217,11 @@
     const canonicalNearest = playerProfile('shared-distance-canonical', { initiativeBonus: 20 });
     const controlledNearest = playerProfile('shared-distance-controlled', { initiativeBonus: 10 });
     const unicorn = unicornProfile('shared-distance-unicorn');
+    const arenaMonster = monsterCombatantProfile(GOBLIN_WARRIOR, {
+      combatantId: 'combatant:shared-distance-arena-goblin',
+      tokenId: 'token:shared-distance-arena-goblin',
+    });
+    const arenaPlayer = playerProfile('shared-distance-arena-player');
     const created = createEncounter({
       bounds: { columns: 12, rows: 4 },
       combatants: [canonicalNearest, controlledNearest, unicorn],
@@ -226,12 +233,18 @@
     });
     const started = reduceEncounter(created, { type: 'roll_initiative' }, face(10)).state;
     const pending = reduceEncounter(started, { type: 'end_turn', actor: canonicalNearest.id }, face(10)).state;
+    const arenaState = createEncounter({
+      bounds: { columns: 4, rows: 1 },
+      combatants: [arenaMonster, arenaPlayer],
+      tokens: [placedToken(arenaMonster, 0, 0), placedToken(arenaPlayer, 1, 0)],
+    });
     const controlledQueries: EngineQueryPort = Object.freeze({
       ...OFFER_ENVIRONMENT.queries,
       spaceDistance: (...args: Parameters<EngineQueryPort['spaceDistance']>) => {
         const [state, left, right, leftAnchor] = args;
         if (left === unicorn.id && right === canonicalNearest.id) return 30;
         if (left === unicorn.id && right === controlledNearest.id) return 5;
+        if (left === arenaMonster.id && right === arenaPlayer.id) return 30;
         return OFFER_ENVIRONMENT.queries.spaceDistance(state, left, right, leftAnchor);
       },
     });
@@ -244,6 +257,25 @@
       },
       value: true,
     };
+    const arenaPlan: RoundPlan = {
+      kind: 'round_plan',
+      protocolVersion: 2,
+      encounterId: encounterSessionId('encounter:shared-distance-arena'),
+      requestId: 'request:shared-distance-arena',
+      expectedRevision: arenaState.revision,
+      round: 1,
+      monsters: [{
+        monsterId: arenaMonster.id,
+        program: {
+          kind: 'action',
+          action: {
+            kind: 'attack',
+            attackId: 'scimitar',
+            target: { kind: 'combatant', combatantId: arenaPlayer.id },
+          },
+        },
+      }],
+    };
 
     expect(evaluateScenarioFactWithQueries(pending, adjacency, controlledQueries)).toEqual({
       matches: true,
@@ -256,6 +288,12 @@
     });
     expect(chargingHornTarget(full(pending, [], undefined, controlledQueries))).toBe(controlledNearest.id);
     expect(chargingHornTarget(full(pending))).toBe(canonicalNearest.id);
+    expect(OFFER_ENVIRONMENT.queries.spaceDistance(arenaState, arenaMonster.id, arenaPlayer.id)).toBe(5);
+    expect(controlledQueries.spaceDistance(arenaState, arenaMonster.id, arenaPlayer.id)).toBe(30);
+    expect(validateArenaPlan(arenaPlan, arenaState, OFFER_ENVIRONMENT.queries)).toEqual([]);
+    expect(validateArenaPlan(arenaPlan, arenaState, controlledQueries)).toEqual([
+      `${arenaMonster.id}: target is outside scimitar reach/range`,
+    ]);
   });
 
   it('exposes pending legendary-resistance save and severity facts without choosing a policy', () => {

tokens used
5,294,016
B18-F1 and B18-F2(a) are implemented and proven. B18-F2(b) cannot be proven test-only with the current production semantics.

Completed proofs:

- Arena canonical bypass:
  - `0332a72a…` → mutant `1ebae7e1…`
  - Shared witness failed: expected the scimitar-range refusal, received `[]`.
  - Restored to `0332a72a…`.

- Blind resolver legacy reconstruction:
  - `580dffd5…` → mutant `c509073c…`
  - `keeps blind option provenance on the supplied policy environment` failed: expected `accepted`, received `rejected`.
  - Restored to `580dffd5…`.

Blocking MCP mutant:

```text
offerEnvironment
→
offerEnvironment: buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
})
```

- MCP candidate SHA: `a6b42f01…`
- Mutant SHA: `58f3554d…`
- `forwards the application policy environment through real blind proposal composition` still passed `1/1`.

Cause: the wrong environment generates and preliminarily resolves a legacy-bound option, but blind composition passes only its option ID to the application’s policy-bound resolver. That resolver regenerates an equivalent option under the correct policy environment, erasing the observable mismatch. Builder environments also all expose the same canonical query port, so configurations cannot supply behaviorally distinct distance policies.

Killing this mutant requires production enforcement—for example, validating the proposal resolver’s returned option against the blind resolver’s supplied environment. The round explicitly requires stopping if production changes are necessary.

Production was restored. Current status contains only the three authorized test files:

```text
 M tests/unit/tools/engine-mcp-server.test.ts
 M tests/unit/vtt/blind-intent-resolver.test.ts
 M tests/unit/vtt/legendary-windows.test.ts
```

`git diff --check` exits 0.

BLOCKED: MCP different-policy forwarding is observationally erased by option-ID regeneration; a production provenance check is required.
