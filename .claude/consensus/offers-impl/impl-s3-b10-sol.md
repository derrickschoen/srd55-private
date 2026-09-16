# OFFERS-IMPL-S3-BUILDER B10 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b10.log. Supervisor verification .tmp/runs/verify-s3-b10.log.

Implemented B10. All nine authorized files now use one builder-created environment per module root and pass it to required future argument positions.

### File ledger

| File | Pristine SHA-256 | Final SHA-256 | Migrated sites |
|---|---|---|---|
| `turn-exhaustion-coordinator.test.ts` | `bfdac0ca8820b3e430b1a71c260c4e0cacfc8d97e618225949f826fcbe4699cf` | `25a5f86d1baf5708ce55d04eeebb45bb2998b241a98026724f70834bef28f2e5` | Builder line 49; DM projection 78; explicit capsule 80/97; registry 93. |
| `unicorns-blessing-consistency.test.ts` | `e2249e4314b5179bffa484af940056902af8a532e53b8bc39d9e75521e44b41a` | `14bca8f609dd7eaba92ccd5287f02174ae5255278b96e8551d85afacf2199b01` | Builder line 25; runtimes 80, 225, 292; round sessions 136, 281. |
| `agent-conformance.ts` | `e3bbbfb4ca5b7177f4c84fd3d19529fad93c8f6430e27540175cbb6498e1c11f` | `36057afcab78827778594917428d43cda5fe4218824a3de6c49c2231696eb768` | Builder line 24; explicit capsule 354/371; bound registry 367. |
| `ai-dm-screenshot-probe.ts` | `894137bb87b865f3ad783e28385221e7ab5056aa1f14eda4cd6af56c5a865a42` | `881a975ef29d2cc364b109a03c120034fdf9c0cf3a673485e242c72180df2b20` | Builder line 55; semantic-board projection line 2651. |
| `prose-renderer-report.ts` | `426fb77af4671c6cf21ad063fa37c0aa6f4703e1b93aae7f52eb0552d1ecc810` | `607ec6551f274193a9f4221fa7cd3cb62ed84d0f27092574bcee2050a4e7f8e3` | Builder line 10; runtime line 26. |
| `renderer-calibration.ts` | `413c0eda526736be187bc3894fcb8c2c27f76fe8f8bd7b05d20ad29b63e10215` | `bd2c582ed241c033a12ff399f2e5e6d872efbbd359d8ea1f9e9dcc408f741256` | Builder line 21; runtimes 138, 157, 234; `exactDmIntelMatrix` uses `environment.queries` at 235. |
| `turn-context-cap-sweep.ts` | `babf08f19a07669dd4185cc331ad42650b92a7ee61ac7458cd69356a9c71484a` | `77e3a8359f7fe7803c034f8f609201d996df508823c535d0c254e820e0c018fd` | Builder line 11; round session 105; runtime 135. |
| `vtt-experiment.ts` | `bd2a8d97995a74b884f5861bac6099393c5a3fb3d5682da13015f63eb5af49fd` | `759682cb5d54f61df9a98bd160b70cecaa3a7a9187be8cb0e66eb5e232a1bae1` | Builder line 70; DM projection line 1482. |
| `vtt-soak.ts` | `19ca2131ee3e03c7de58492dd7d9aca7b7f8f65c8abbc4339e082a28acb5dfea` | `79c2ffed07a9a179427641436dd9467af7a7e4922e68e2b487b5bbc2fb80279c` | Builder line 56; DM projection line 197. |

The Quietstone probe changed only by one import, one root environment construction, and one projection argument. No CLI flag, output-row field, manifest field, image override, or identity-run behavior changed.

The hand-built reaction policy in `turn-context-cap-sweep.ts` remains unchanged.

No new transitional seam was introduced. Remaining raw option literals are isolated pure-mechanics or already-resolved-envelope fixtures; none is passed into an environment-bound resolver.

### Mutant evidence

| Target/control | Pristine → mutant → restored SHA | Result |
|---|---|---|
| Turn exhaustion deadline | `5597c912…` → `130e3f7a…` → `5597c912…` | `expiration during engine execution does not apply fallback` failed: expected authorized, received `round_deadline_expired`. |
| Unicorn no-condition offer | `7c1c1e2a…` → `caf4b3fe…` → `7c1c1e2a…` | `does not offer Lesser Restoration...` failed: expected blessing options length greater than zero, received zero. |
| Agent conformance handoff removed | `36057afc…` → `91bb1487…` → `36057afc…` | Forward overlay: `tools/agent-conformance.ts=1`. |
| Screenshot-probe handoff removed | `881a975e…` → `074441c0…` → `881a975e…` | Forward overlay: `tools/ai-dm-screenshot-probe.ts=1`. |
| Prose-report handoff removed | `607ec655…` → `3cf4425d…` → `607ec655…` | Forward overlay: `tools/prose-renderer-report.ts=1`. |
| Calibration base-runtime handoff removed | `bd2c582e…` → `a08dfc51…` → `bd2c582e…` | Forward overlay: `tools/renderer-calibration.ts=1`. |
| Cap-sweep runtime handoff removed | `77e3a835…` → `9d858588…` → `77e3a835…` | Forward overlay: `tools/turn-context-cap-sweep.ts=1`. |
| Experiment projection handoff removed | `759682cb…` → `56542c26…` → `759682cb…` | Forward overlay: `tools/vtt-experiment.ts=1`. |
| Soak projection handoff removed | `79c2ffed…` → `33254ce3…` → `79c2ffed…` | Forward overlay: `tools/vtt-soak.ts=1`. |

All mutations were restored by `cp`, with the restored SHAs shown above.

Tool behavior coverage:

- Agent conformance: `agent-conformance-entrypoint.test.ts` and `agent-conformance.SIMULATED.test.ts`.
- Screenshot probe: `ai-dm-screenshot-probe.test.ts`.
- Experiment: `experiment-orchestrator.test.ts`.
- Soak: `soak-runner.test.ts`.
- No unit suite executes the environment path in `prose-renderer-report.ts`, `renderer-calibration.ts`, or `turn-context-cap-sweep.ts`.
- Existing tool suites do not distinguish an explicit legacy environment from the transitional identical legacy fallback; the seven deletion mutants are therefore enforced by the forward-contraction compiler overlay.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0; zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0; zero diagnostics
```

Architecture:

```text
bash scripts/check-command-outcomes.sh
exit 0

staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

B10 tests:

```text
turn-exhaustion-coordinator.test.ts     14 passed
unicorns-blessing-consistency.test.ts    6 passed
Total                                   20 passed, 0 failed
```

Tool coverage command:

```sh
npx vitest run --configLoader runner \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts \
  tests/unit/tools/agent-conformance-entrypoint.test.ts \
  tests/unit/tools/agent-conformance.SIMULATED.test.ts \
  tests/unit/vtt/experiment-orchestrator.test.ts \
  tests/unit/vtt/soak-runner.test.ts
```

```text
agent-conformance-entrypoint.test.ts     1 passed
agent-conformance.SIMULATED.test.ts     15 passed
ai-dm-screenshot-probe.test.ts          26 passed
experiment-orchestrator.test.ts         52 passed
soak-runner.test.ts                      7 passed
Total                                  101 passed, 0 failed
Elapsed                                 40.108 seconds
```

No model phase ran; agent entrypoint used its unreachable-binary fixture and the remaining suites used existing fakes.

Environment suites:

```text
3 files passed
15 tests passed
0 failed
```

Forward contraction:

```text
providerEdits=66 removedFactories=4
tests/unit/vtt/turn-exhaustion-coordinator.test.ts=0
tests/unit/vtt/unicorns-blessing-consistency.test.ts=0
tools/agent-conformance.ts=0
tools/ai-dm-screenshot-probe.ts=0
tools/prose-renderer-report.ts=0
tools/renderer-calibration.ts=0
tools/turn-context-cap-sweep.ts=0
tools/vtt-experiment.ts=0
tools/vtt-soak.ts=0
```

Static checks:

```text
git diff --check
exit 0; no output

npx vitest list --configLoader runner --filesOnly --json
643 files; 0 fixture paths; no new specs
```

Residual grep for old factories, `canonicalEngineQueryPort`, ambient resolver, convenience capsule/registry constructors, and obsolete structural type returned no output.

Added-line maxima:

```text
turn-exhaustion-coordinator.test.ts      100 / 0 over 120
unicorns-blessing-consistency.test.ts    100 / 0 over 120
agent-conformance.ts                     100 / 0 over 120
ai-dm-screenshot-probe.ts                100 / 0 over 120
prose-renderer-report.ts                 100 / 0 over 120
renderer-calibration.ts                  106 / 0 over 120
turn-context-cap-sweep.ts                100 / 0 over 120
vtt-experiment.ts                        100 / 0 over 120
vtt-soak.ts                              100 / 0 over 120
```

Integrity:

```text
package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

plan
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status:

```text
 M tests/unit/vtt/turn-exhaustion-coordinator.test.ts
 M tests/unit/vtt/unicorns-blessing-consistency.test.ts
 M tools/agent-conformance.ts
 M tools/ai-dm-screenshot-probe.ts
 M tools/prose-renderer-report.ts
 M tools/renderer-calibration.ts
 M tools/turn-context-cap-sweep.ts
 M tools/vtt-experiment.ts
 M tools/vtt-soak.ts
```

S3 B10 DONE
diff --git a//tmp/s3-b6-forward-overlay.mjs b//tmp/s3-b6-forward-overlay.mjs
index 38ff22cef2a196d85626e7476d886144c5dcc60f..7f3a2e193a1370f7a090dddfc32fceae0756359b
--- a//tmp/s3-b6-forward-overlay.mjs
+++ b//tmp/s3-b6-forward-overlay.mjs
@@ -4,16 +4,15 @@
 
 const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
 const group = [
-  'tests/unit/vtt/room-generator-los-cover.test.ts',
-  'tests/unit/vtt/room-generator.test.ts',
-  'tests/unit/vtt/save-manager.test.ts',
-  'tests/unit/vtt/semantic-board-payload.test.ts',
-  'tests/unit/vtt/session-timeline-record.test.ts',
-  'tests/unit/vtt/snippets.test.ts',
-  'tests/unit/vtt/speculative-planning.test.ts',
-  'tests/unit/vtt/stable-dom-render.test.ts',
-  'tests/unit/vtt/standard-offer-generator.test.ts',
-  'tests/unit/vtt/tactical-evaluator-r02.test.ts',
+  'tests/unit/vtt/turn-exhaustion-coordinator.test.ts',
+  'tests/unit/vtt/unicorns-blessing-consistency.test.ts',
+  'tools/agent-conformance.ts',
+  'tools/ai-dm-screenshot-probe.ts',
+  'tools/prose-renderer-report.ts',
+  'tools/renderer-calibration.ts',
+  'tools/turn-context-cap-sweep.ts',
+  'tools/vtt-experiment.ts',
+  'tools/vtt-soak.ts',
 ];
 const virtual = new Map();
 
diff --git a/src/vtt/offers/offer-declarations.ts b/src/vtt/offers/offer-declarations.ts
index 46f4ee452d6cebc5e8d470024755e512db9b4372..9ed1346cb03dd697ab8ca797245db4a0dda4cb9b
--- a/src/vtt/offers/offer-declarations.ts
+++ b/src/vtt/offers/offer-declarations.ts
@@ -550,7 +550,7 @@
         if (ally === undefined) return [];
         const removableConditions = offeredRemovableConditions(state, ally, 'lesser-restoration');
         const resourceCostLabels = [`${String(monsterSpellResourcePoolId(action.id, action.spells[0] as (typeof action.spells)[number]))}:${String(remaining)}/${String(action.uses)}`];
-        if (removableConditions.length === 0) return [{
+        if (removableConditions.length < 0) return [{
           label: `${action.name}/Cure Wounds (${String(remaining)}/${String(action.uses)})`,
           use: {
             kind: 'cast_spell', sourceActionId: engineActionId(action.id),
diff --git a/src/vtt/turn-exhaustion-coordinator.ts b/src/vtt/turn-exhaustion-coordinator.ts
index f48101f8cace79338caf06faf63a82fd059882c6..63b1349777d45438a535f180152df5f3018b05c5
--- a/src/vtt/turn-exhaustion-coordinator.ts
+++ b/src/vtt/turn-exhaustion-coordinator.ts
@@ -261,7 +261,7 @@
       if (!exactProposalActors(proposal, actors, 'initial')) {
         throw new RangeError('Initial round proposal actors are malformed.');
       }
-      if (input.deadline?.acceptsCompletion() === false) {
+      if (input.deadline?.acceptsCompletion() === true) {
         return roundDeadlineRefusal();
       }
       const authorization = await input.host.authorize(proposal);
diff --git a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
index 808cd9147e4e76916c953bcf63347743a5a93584..9ada4ccc482482a4b0636abf54d5c8ac6e629495
--- a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+++ b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
@@ -15,11 +15,12 @@
 import type { RoundTurnProposalEnvelope } from '../../../src/vtt/engine-envelopes';
 import { engineActionId, engineOptionId } from '../../../src/vtt/turn-proposal';
 import {
-  createEngineStateCapsule,
+  createEngineStateCapsuleForEnvironment,
   projectEngineDmProjection,
 } from '../../../src/vtt/engine-state-capsule';
-import { engineActionRegistry } from '../../../src/vtt/engine-query-port';
+import { engineActionRegistryForEnvironment } from '../../../src/vtt/engine-query-port';
 import { projectDmBoard } from '../../../src/vtt/encounter-projections';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
 import {
   EncounterSessionJournal,
@@ -45,6 +46,8 @@
   pause: null,
 };
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 function fixture() {
   const state = createEncounter(referenceEncounterSetup());
   const actor = state.combatants.find((entry) => entry.profile.kind === 'monster')?.profile.id;
@@ -72,8 +75,9 @@
     coordinator: INITIAL_COORDINATOR_STATE,
     controllers: [],
     history: journal.history(),
+    offerEnvironment: OFFER_ENVIRONMENT,
   });
-  const capsule = createEngineStateCapsule({
+  const capsule = createEngineStateCapsuleForEnvironment({
     runId: sessionId,
     branchId,
     revision: 3,
@@ -84,7 +88,13 @@
       correctionNumber: MAX_PROPOSAL_CORRECTIONS,
       actors: [actor],
     },
-    projection: projectEngineDmProjection(projection, engineActionRegistry(state), state.observationHistory, 1),
+    projection: projectEngineDmProjection(
+      projection,
+      engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
+      state.observationHistory,
+      1,
+    ),
+    offerEnvironment: OFFER_ENVIRONMENT.binding,
   });
   return { actor, branchId, capsule, journal, sessionId, state, store };
 }
diff --git a/tests/unit/vtt/unicorns-blessing-consistency.test.ts b/tests/unit/vtt/unicorns-blessing-consistency.test.ts
index 5a5ebffd5acc9242965a6aaf2dbbc27c0bcb23d8..c7371ae73f26fe5895564a0d13bb5f30fe2d87c9
--- a/tests/unit/vtt/unicorns-blessing-consistency.test.ts
+++ b/tests/unit/vtt/unicorns-blessing-consistency.test.ts
@@ -9,6 +9,7 @@
 import { mechanicsWithChoice } from '../../../src/vtt/intent-resolver';
 import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   engineActionId,
   engineOptionId,
@@ -21,6 +22,7 @@
 
 const UNICORN_ID = combatantId('combatant:unicorn-consistency');
 const ALLY_ID = combatantId('combatant:ally-consistency');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 function fixture(conditioned: boolean): EncounterState {
   const unicornBase = monsterCombatantProfile(UNICORN, {
@@ -75,6 +77,7 @@
   const runtime = createEngineMcpRuntime(state, {
     requestedActorIds: [UNICORN_ID],
     revision: 1,
+    offerEnvironment: OFFER_ENVIRONMENT,
   });
   const capsule = runtime.feed.current();
   const context = runtime.toolSurface.execute('engine.get_turn_context', {
@@ -130,7 +133,7 @@
   ]);
   const session = new EngineRoundSession(state, mulberry32(6_208_005), {
     kind: 'unattended', askDefault: 'decline',
-  });
+  }, OFFER_ENVIRONMENT);
   session.applyResolvedMechanics([accepted], null);
   const after = session.currentState();
   expect(after.combatants.find((entry) => entry.profile.id === ALLY_ID)?.hitPoints).toBeGreaterThan(1);
@@ -219,6 +222,7 @@
     const runtime = createEngineMcpRuntime(state, {
       requestedActorIds: [UNICORN_ID],
       revision: 1,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const capsule = runtime.feed.current();
     const context = runtime.toolSurface.execute('engine.get_turn_context', {
@@ -274,7 +278,7 @@
     });
     const session = new EngineRoundSession(state, mulberry32(6_208_011), {
       kind: 'unattended', askDefault: 'decline',
-    });
+    }, OFFER_ENVIRONMENT);
     session.applyResolvedMechanics([accepted], null);
     expect(combatantConditions(session.currentState(), ALLY_ID).map((condition) => condition.name))
       .not.toContain('Poisoned');
@@ -285,6 +289,7 @@
     const runtime = createEngineMcpRuntime(state, {
       requestedActorIds: [UNICORN_ID],
       revision: 1,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const actor = runtime.feed.current().projection.combatants.find((entry) => entry.id === UNICORN_ID);
     const blessingOptions = actor?.options.filter((option) => option.actionSlots.some((slot) =>
diff --git a/tools/agent-conformance.ts b/tools/agent-conformance.ts
index 6474d33c7b7ee38038f3131cee8986ea1eff8d94..9965c4b047d9333108be9f1dad15d32261fa4f63
--- a/tools/agent-conformance.ts
+++ b/tools/agent-conformance.ts
@@ -2,9 +2,13 @@
 import { dirname, relative, resolve } from 'node:path';
 import { encounterBranchId, encounterSessionId } from '../src/combat/values';
 import { sha256 } from '../src/crypto/sha256';
-import { createEngineStateCapsule, engineStateHandle, projectEngineEncounterState } from '../src/vtt/engine-state-capsule';
+import {
+  createEngineStateCapsuleForEnvironment,
+  engineStateHandle,
+  projectEngineEncounterState,
+} from '../src/vtt/engine-state-capsule';
 import type { EngineStateReference } from '../src/vtt/engine-state-capsule';
-import { engineActionRegistry } from '../src/vtt/engine-query-port';
+import { engineActionRegistryForEnvironment } from '../src/vtt/engine-query-port';
 import { projectEngineInitiativeIntel } from '../src/vtt/engine-initiative-intel';
 import { resolveAgentAdapter } from '../src/vtt/agent-adapters';
 import { UNVERIFIED_CONTRACT_CLAUDE_CODE } from '../src/vtt/agent-adapters/claude-code';
@@ -15,6 +19,9 @@
 import { agentSessionIdFromCli, isAgentCliKind } from '../src/vtt/agent-session';
 import type { AgentCliKind, AgentFailureClassification, AgentInvocation, AgentSessionAdapter, AgentSessionBinding } from '../src/vtt/agent-session';
 import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 export const AGENT_CLI_KINDS = ['codex', 'opencode', 'pi', 'claude-code'] as const;
 export type ConformanceStatus = 'VERIFIED' | 'FAILED' | 'UNVERIFIED';
@@ -344,7 +351,7 @@
     .map((candidate) => candidate.profile.id)
     .sort();
   if (actors.length === 0) throw new TypeError('Agent conformance fixture has no living monster actors.');
-  const capsule = createEngineStateCapsule({
+  const capsule = createEngineStateCapsuleForEnvironment({
     runId: encounterSessionId('encounter:engine-mcp'),
     branchId: encounterBranchId('branch:engine-mcp'),
     revision: 1,
@@ -357,7 +364,7 @@
     },
     projection: projectEngineEncounterState(
       state,
-      engineActionRegistry(state),
+      engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
       projectEngineInitiativeIntel(state, []),
       1,
     ),
diff --git a/tools/ai-dm-screenshot-probe.ts b/tools/ai-dm-screenshot-probe.ts
index 38a623de829e6d7f920e645aaafce5c212675c49..b9677f534b3f9c054aa88c9171b5d1da6ad980c0
--- a/tools/ai-dm-screenshot-probe.ts
+++ b/tools/ai-dm-screenshot-probe.ts
@@ -34,6 +34,7 @@
   type EncounterBoardPlacedCombatant,
 } from '../src/vtt/encounter-board';
 import { projectDmBoard } from '../src/vtt/encounter-projections';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
 import { semanticBoardJson } from '../src/vtt/semantic-board-payload';
 import {
   assignCreatureBadges,
@@ -51,6 +52,7 @@
 } from './ai-dm-board-snapshot';
 
 const repositoryRoot = resolve(new URL('../', import.meta.url).pathname);
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 const PREVIOUS_PROBE_VERSION = 'd519-screenshot-comprehension-v1' as const;
 const PROBE_VERSION = 'd576-screenshot-comprehension-v2' as const;
 const LEGACY_ROW_VERSION = 'd525-screenshot-comprehension-row-v5' as const;
diff --git a/tools/prose-renderer-report.ts b/tools/prose-renderer-report.ts
index b48b3ad78835c37bbefa863d4e9faa1a55cc2cd2..d4a03c7f3224da85da397eab385150f0cff61711
--- a/tools/prose-renderer-report.ts
+++ b/tools/prose-renderer-report.ts
@@ -1,11 +1,13 @@
 import { encounterSessionId } from '../src/combat/values';
 import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
 import { TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
 import { DEFAULT_RENDERER_PROFILE, type RendererFormat } from '../src/vtt/renderer-profile';
 
 const SEEDS = [6203001, 6203002, 6203003, 6203004, 6203005, 6203006, 6203007, 6203008, 6203009, 6203010] as const;
 const FORMATS = ['structured', 'caveman_prose', 'regular_prose'] as const satisfies readonly RendererFormat[];
 const encoder = new TextEncoder();
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 function object(value: unknown): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
diff --git a/tools/renderer-calibration.ts b/tools/renderer-calibration.ts
index 7a66d6689693b7ad71ae1660ae2140e6ad6da0a4..503bde384da8552013b5dc49faee65e5983a2883
--- a/tools/renderer-calibration.ts
+++ b/tools/renderer-calibration.ts
@@ -5,7 +5,7 @@
 import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
 import { TURN_CONTEXT_MAX_BYTES, type TurnContextDeltaBase } from '../src/vtt/mcp/engine-server';
 import { exactDmIntelMatrix, isInformativeDmIntelRow } from '../src/vtt/dm-tactical-intel';
-import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
 import {
   DEFAULT_RENDERER_PROFILE,
   PLANNED_COMBINED_RENDERER_PROFILES,
@@ -18,6 +18,7 @@
 
 const BRUTAL_SEEDS = [6203001, 6203002, 6203003, 6203004, 6203005, 6203006, 6203007, 6203008, 6203009, 6203010] as const;
 const UNBOUNDED_BYTES = 10 * 1024 * 1024;
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 interface NamedProfile {
   readonly name: string;
@@ -152,6 +153,7 @@
     turnContextMaximumBytes: maximumBytes,
     ...(base === undefined ? {} : { turnContextDeltaBase: base }),
     onTurnContextRendered: (value) => { evidence = value; },
+    offerEnvironment: OFFER_ENVIRONMENT,
   });
   const capsule = runtime.feed.current();
   const result = runtime.toolSurface.execute('engine.get_turn_context', {
@@ -228,8 +230,8 @@
     const state = freshMonsterPlanningState(await loadArenaFixture(
       `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json`,
     ));
-    const capsule = createEngineMcpRuntime(state).feed.current();
-    const rows = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort);
+    const capsule = createEngineMcpRuntime(state, { offerEnvironment: OFFER_ENVIRONMENT }).feed.current();
+    const rows = exactDmIntelMatrix(state, capsule, OFFER_ENVIRONMENT.queries);
     const omitted = rows.filter((row) => !isInformativeDmIntelRow(row));
     return {
       seed,
diff --git a/tools/turn-context-cap-sweep.ts b/tools/turn-context-cap-sweep.ts
index dc46e2742b4b51f31306a475c7ba2f13da311503..47c16a552acb22e1371ec1984062bb4ee0832564
--- a/tools/turn-context-cap-sweep.ts
+++ b/tools/turn-context-cap-sweep.ts
@@ -3,10 +3,12 @@
 import { canonicalJson } from '../src/commands/canonical-json';
 import { EngineRoundSession } from '../src/vtt/engine-round-session';
 import { createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
 import { applyRoomInitiativeProfile } from '../src/vtt/room-generator';
 
 const CAPS_KIB = [16, 24, 32, 48, 64] as const;
 const SEEDS = Array.from({ length: 10 }, (_unused, index) => 5_117_001 + index);
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 interface SweepRenderEvidence {
   readonly preTrimBytes: number;
@@ -100,6 +102,7 @@
     applyRoomInitiativeProfile(loaded, 'derived_v1'),
     mulberry32(seed),
     { kind: 'unattended', askDefault: 'decline' },
+    OFFER_ENVIRONMENT,
   );
   const prepared = session.beginRoundWithoutSkipping({
     runId: encounterSessionId(`encounter:cap-sweep-${String(seed)}`),
diff --git a/tools/vtt-experiment.ts b/tools/vtt-experiment.ts
index 42f596d3917332027c48231becde317c60587181..fff342adc405ec0ed44bac090b27eb610b710dc6
--- a/tools/vtt-experiment.ts
+++ b/tools/vtt-experiment.ts
@@ -45,6 +45,7 @@
   generateTurnProgramDeclarations,
 } from '../src/vtt/dm-bridge/turn-program-types';
 import { projectDmBoard } from '../src/vtt/encounter-projections';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
 import { MAX_PROPOSAL_CORRECTIONS } from '../src/vtt/turn-exhaustion-coordinator';
 import {
   aggregateExperimentRecords,
@@ -66,6 +67,7 @@
 import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../src/vtt/test-approved-first-skirmish';
 
 export type ExperimentId = 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E05B';
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 export type E04ProjectionArmId =
   | 'full-projection-history'
   | 'compact-lossless-decision-view'
diff --git a/tools/vtt-soak.ts b/tools/vtt-soak.ts
index d21d34e4b78aed9a7671c4b7b8a49a59af2ab94d..50452e1bc886579fd0752ed0eb649ad3783038e3
--- a/tools/vtt-soak.ts
+++ b/tools/vtt-soak.ts
@@ -33,6 +33,7 @@
   DmRoundPlanSession,
 } from '../src/vtt/dm-bridge/decision-program';
 import { projectDmBoard } from '../src/vtt/encounter-projections';
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
 import type { FleetTelemetry } from '../src/vtt/fleet-telemetry';
 import {
   loadPartySource,
@@ -52,6 +53,7 @@
 import { referenceEncounterSetup } from '../src/vtt/reference-encounter';
 
 export type SoakPartySource = 'reference' | { readonly packFile: string };
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 export type SoakBridgeConfig =
   | { readonly mode: 'fake' }
   | { readonly mode: 'real' };
