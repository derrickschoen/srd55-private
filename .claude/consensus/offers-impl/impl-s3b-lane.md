Implemented the Slice 3B migration in exactly ten test files. Static gates and focused suites pass, but completion is blocked by cumulative-suite load timeouts outside the authorized retry list.

### Migrated files

1. [dm-encounter-host-live-path.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/integration/vtt/dm-encounter-host-live-path.test.ts)
2. [ai-dm-arena.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts)
3. [ai-dm-board-delivery.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts)
4. [ai-dm-board-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts)
5. [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts)
6. [ai-dm-knowledge-base.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-knowledge-base.test.ts)
7. [engine-mcp-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-boundary.test.ts)
8. [engine-mcp-golden.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts)
9. [engine-mcp-handler.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts)
10. [local-openai-conversation.SIMULATED.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts)

Diff: 10 files, 176 insertions, 20 deletions. No production files changed.

The AST inventory was re-derived with:

```text
npx tsx .tmp/offers-s3a-consumer-inventory.ts > /tmp/offers-s3b-consumers-rederived.txt
```

SHA-256: `3a5dd63fb88078aef855e6e6e13bd8479b0aeab2f6edf74965fc7f275b6053ba`.

It differs from the pre-fix inventory because the accepted encounter-projections change altered the closure, but the first ten entries remain exactly the ten previously reported.

### Verification

Passed:

```text
npm run typecheck:fast
```

Exit 0, 8.24s.

```text
sg scan
```

Exit 0, 0.29s.

```text
git diff --check
```

Exit 0, 0.01s.

```text
npx vitest run --configLoader runner <the ten migrated specs> --maxWorkers=2
```

10/10 files, 322/322 tests passed, 831.50s.

```text
npx vitest run --configLoader runner tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

2/2 files, 4/4 tests passed, 3.80s.

```text
npx vitest run --configLoader runner --maxWorkers=2 <3A focused 14-spec set>
```

14/14 files, 280/280 tests passed, 122.35s.

The cumulative list contains 174 unique specs and has SHA-256 `2585c7028a711c3f9fda5668d680d8820df3ddecfccb8a907ff33eb48ec3f5bd`. Load was `6.42, 11.47, 8.85` on 24 CPUs, so it ran serially:

```text
npx vitest run --configLoader runner --maxWorkers=1 $(tr '\n' ' ' < .tmp/offers-s3b.specs)
```

Result: 169/174 files and 3217/3222 tests passed in 1904.73s. Five 5-second load timeouts failed:

- Authorized: `ai-dm-arena-interleave.test.ts`
- Authorized: `room-generator-los-cover.test.ts`
- Not authorized for retry: `pc-algorithm-policy.test.ts`
- Not authorized for retry: `js-round-plan-integration.test.ts`
- Not authorized for retry: `ai-dm-screenshot-probe.test.ts`

The single permitted named retry was:

```text
npx vitest run --configLoader runner --maxWorkers=1 tests/integration/vtt/ai-dm-arena-interleave.test.ts tests/unit/vtt/room-generator-los-cover.test.ts
```

`ai-dm-arena-interleave` passed. `room-generator-los-cover` remained red with 3 timeout failures; 109/112 tests passed. Vitest exit was 1, although the shell pipeline returned 0 through `tee`.

### Assertion changes

No existing `expect(` was removed, weakened, or replaced. Eleven environment-identity assertions were added:

- Seven runtime-factory assertions comparing capsule binding with the injected environment binding.
- Three explicit revision-bound runtime assertions.
- One explicit transitional-stdio assertion preserving the Slice 3C compatibility boundary.

No pins or D545 registered literals changed. Forbidden-construct scan found no additions. The frozen contract remains unchanged at `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

BLOCKED: the 174-spec cumulative gate has three non-named 5-second load timeouts that the rules prohibit rerunning, and the permitted room-generator retry remained red.
diff --git a/.tmp/offers-s3b.specs b/.tmp/offers-s3b.specs
index b931252dbef01038d2cd833076645aa0223e343f..d0da2b372364f5e32edd5874dca8d9815abea84e
--- a/.tmp/offers-s3b.specs
+++ b/.tmp/offers-s3b.specs
@@ -170,3 +170,5 @@
 tests/unit/vtt/vane-warren.test.ts
 tests/unit/vtt/watabou-adapter.test.ts
 tests/unit/vtt/wild-shape-persistence.test.ts
+tests/unit/vtt/offer-environment-identity.test.ts
+tests/unit/vtt/offer-environment-board-sequence.test.ts
diff --git a/tests/integration/vtt/dm-encounter-host-live-path.test.ts b/tests/integration/vtt/dm-encounter-host-live-path.test.ts
index 326336d3dcba1d86832a601cc14ab9d8fe5e86fb..e40f3363e672d24808abb89ac15c843d60ba6ec0
--- a/tests/integration/vtt/dm-encounter-host-live-path.test.ts
+++ b/tests/integration/vtt/dm-encounter-host-live-path.test.ts
@@ -15,7 +15,9 @@
   replaySessionRevisions,
 } from '../../../src/vtt/session-persistence';
 import { createConversationRoundDeadline } from '../../../src/vtt/agent-session-lifecycle';
-import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
+import { createEngineMcpRuntime as createDefaultEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import { MAX_PROPOSAL_CORRECTIONS } from '../../../src/vtt/turn-exhaustion-coordinator';
 import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
 import {
@@ -25,6 +27,18 @@
 } from '../../../src/vtt/vane-warren';
 import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';
 
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
+
 function position(state: EncounterState, id: CombatantId): GridCell {
   const token = state.tokens.find((candidate) => candidate.combatantId === id);
   if (token === undefined) throw new Error(`Missing token for ${id}.`);
diff --git a/tests/unit/tools/ai-dm-arena.test.ts b/tests/unit/tools/ai-dm-arena.test.ts
index 669d8639886c484c1b57cb67b048c7ab2bb29da1..5844e48434f91d655ea77974e0aa942915e261a0
--- a/tests/unit/tools/ai-dm-arena.test.ts
+++ b/tests/unit/tools/ai-dm-arena.test.ts
@@ -18,11 +18,13 @@
 import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import {
-  createEngineMcpRuntime,
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
   type EngineMcpLauncherManifest,
 } from '../../../src/vtt/mcp/entrypoint';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import { validateArenaPlan } from '../../../src/vtt/arena-legality';
 import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';
 import { engineActionId, engineSpellId } from '../../../src/vtt/turn-proposal';
@@ -52,7 +54,18 @@
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 
 const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
+
 function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
     throw new TypeError(`${label} must be an object.`);
@@ -1293,12 +1306,12 @@
       const options = availableEngineActorOptions(
         planningState,
         entry.actorId,
-        undefined,
+        BOUND_OFFER_ENVIRONMENT,
         expectedRevision,
       );
       const option = options.find((candidate) => candidate.optionId === entry.resolutionSummary.optionId);
       if (option === undefined) throw new Error(`Frozen room-two option is absent for ${entry.actorId}.`);
-      const resolution = resolveEngineActorOption(planningState, option);
+      const resolution = resolveEngineActorOption(planningState, option, BOUND_OFFER_ENVIRONMENT);
       if (!resolution.valid) throw new Error(`Frozen room-two option is illegal for ${entry.actorId}.`);
       return {
         actorId: entry.actorId,
diff --git a/tests/unit/tools/ai-dm-board-delivery.test.ts b/tests/unit/tools/ai-dm-board-delivery.test.ts
index ee754aa732e3dfedbdb54dc433d11915f100da5a..29a2b4400feb7c70efb8f2c082ae2f8183c45ea9
--- a/tests/unit/tools/ai-dm-board-delivery.test.ts
+++ b/tests/unit/tools/ai-dm-board-delivery.test.ts
@@ -13,10 +13,15 @@
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import { sha256 } from '../../../src/crypto/sha256';
 import { mcpRequestMeta, createMcpHandler } from '../../../src/vtt/mcp/handler';
-import { createLegacyEngineOptionEnvironmentBinding } from '../../../src/vtt/offers/offer-environment';
 import {
+  createRevisionBoundEngineOptionEnvironment,
+  createLegacyEngineOptionEnvironmentBinding,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import {
   decodeEngineMcpLauncherManifest,
-  createEngineMcpRuntime,
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   loadArenaFixture,
   validatedLauncherBoardHtmlReference,
   validatedLauncherBoardImage,
@@ -50,6 +55,22 @@
 } from '../../helpers/test-filesystem';
 
 const META = mcpRequestMeta({ name: 'board-delivery-test', version: '1.0.0' });
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
+
+function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
+  if (manifest.offerEnvironment === undefined) throw new TypeError('Launcher offer environment is absent.');
+  return engineOptionEnvironmentFromBinding(canonicalEngineQueryPort, manifest.offerEnvironment);
+}
 // Pin = the intel-leak lane context (04fd8420: shown-option boundary, size-omission
 // declarations) BEFORE the last-seen (D545) merge; the last-seen policy string and
 // state handle are normalised back below so the pin stays independent of that merge.
@@ -136,6 +157,7 @@
     const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
     const state = await loadArenaFixture(manifest.fixturePath);
     const runtime = createEngineMcpRuntime(state, {
+      offerEnvironment: launcherOfferEnvironment(manifest),
       runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
       requestId: manifest.requestId, phase: manifest.phase,
       correctionNumber: manifest.correctionNumber, room: manifest.room,
@@ -564,6 +586,7 @@
       const state = await loadArenaFixture(manifest.fixturePath);
       const boardImageContent = await validatedLauncherBoardImage(manifest, state);
       const runtime = createEngineMcpRuntime(state, {
+        offerEnvironment: launcherOfferEnvironment(manifest),
         runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
         requestId: manifest.requestId, phase: manifest.phase,
         correctionNumber: manifest.correctionNumber, room: manifest.room,
diff --git a/tests/unit/tools/ai-dm-board-snapshot.test.ts b/tests/unit/tools/ai-dm-board-snapshot.test.ts
index 414f1ff3b63f7fef5d06a4c640be34c82440467e..0537cd07b5675de4f1105b803d7b641a7d1d6082
--- a/tests/unit/tools/ai-dm-board-snapshot.test.ts
+++ b/tests/unit/tools/ai-dm-board-snapshot.test.ts
@@ -11,7 +11,9 @@
   importSavedSession,
   EncounterSessionJournal,
 } from '../../../src/vtt/session-persistence';
-import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import {
   assertBoardImageFresh,
   boardSnapshotCaptureGeometry,
@@ -26,6 +28,7 @@
   { length: 10 },
   (_unused, index) => `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`,
 );
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
 function sourceFor(state: EncounterState, room = 1): BoardImageSource {
   return {
@@ -54,6 +57,13 @@
 }
 
 describe('AI DM board snapshot contracts', () => {
+  it('binds the snapshot fixture runtime to its explicit offer environment', async () => {
+    const state = await loadArenaFixture(CONTROL_FIXTURES[0]!);
+    const runtime = createEngineMcpRuntime(state, { offerEnvironment: BOUND_OFFER_ENVIRONMENT });
+
+    expect(runtime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
+  });
+
   it('isolates its preview port from the Playwright worker pool', () => {
     expect(configuredPreviewPort({ PLAYWRIGHT_PORT: '4650' })).toBe(0);
     expect(configuredPreviewPort({
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index cff66518854d28299a1c21911adc0f150e9cdcfc..3c455440dfa08bdbbaf27cef5cecd9e3db4bb307
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -36,9 +36,13 @@
 import type { EncounterCommand } from '../../../src/combat/events';
 import { mulberry32 } from '../../../src/combat/random';
 import { generateRoom } from '../../../src/vtt/room-generator';
-import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
 import {
-  createEngineMcpRuntime,
+  availableEngineActorOptions,
+  createPureTurnProposalResolver,
+  engineActorOptionsForEnvironment,
+} from '../../../src/vtt/intent-resolver';
+import {
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
   loadArenaFixture,
   parseEngineMcpJsonLine,
@@ -63,8 +67,11 @@
 import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
 import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import {
+  createRevisionBoundEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
 import { engineStateHandle } from '../../../src/vtt/engine-state-capsule';
-import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
 import {
@@ -87,7 +94,24 @@
   'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
 ] });
 const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+const boundTurnProposalResolver = createPureTurnProposalResolver(BOUND_OFFER_ENVIRONMENT);
 
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
+
+function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
+  if (manifest.offerEnvironment === undefined) throw new TypeError('Launcher offer environment is absent.');
+  return engineOptionEnvironmentFromBinding(canonicalEngineQueryPort, manifest.offerEnvironment);
+}
+
 async function runConversationWithPartyPolicy(
   decisionPolicy: ScriptedPartyDecisionPolicy,
   config: Parameters<typeof runConversation>[0],
@@ -325,6 +349,7 @@
       this.sessionSnapshotValidations += 1;
     }
     const runtime = createEngineMcpRuntime(state, {
+      offerEnvironment: launcherOfferEnvironment(manifest),
       runId: manifest.runId,
       branchId: manifest.branchId,
       revision: manifest.revision,
@@ -1540,14 +1565,14 @@
     const actor = state.combatants.find((combatant) =>
       combatant.profile.kind === 'monster' && combatant.life !== 'dead');
     if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
-    const option = availableEngineActorOptions(state, actor.profile.id)
+    const option = availableEngineActorOptions(state, actor.profile.id, BOUND_OFFER_ENVIRONMENT)
       .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
     if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
     const proposal = {
       actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
       fallbackOptionId: null, reason: 'Exercise the fixture proposal path.', overrideJustification: null,
     };
-    const proposalTime = pureTurnProposalResolver.resolve(state, proposal);
+    const proposalTime = boundTurnProposalResolver.resolve(state, proposal);
     if (!proposalTime.valid) throw new Error('Room 3943006 Dodge proposal did not resolve.');
 
     expect(proposalResolutionDivergence(state, {
@@ -1960,11 +1985,15 @@
     const actorIds = state.combatants.flatMap((combatant) =>
       combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
     const resolutions = () => actorIds.map((actorId) =>
-      actorOpportunityReport(state, actorId, canonicalEngineQueryPort, state.revision).frontierResolution);
+      actorOpportunityReport(state, actorId, BOUND_OFFER_ENVIRONMENT, state.revision).frontierResolution);
     const beforeRender = resolutions();
     const firstActorId = actorIds[0];
     if (firstActorId === undefined) throw new Error('Brutal fixture has no first monster actor.');
-    const firstActorOptions = engineActorOptions(state, firstActorId);
+    const firstActorOptions = engineActorOptionsForEnvironment(
+      state,
+      firstActorId,
+      BOUND_OFFER_ENVIRONMENT,
+    );
     expect(firstActorOptions.humanOnly).toContainEqual(expect.objectContaining({
       label: 'spellcasting/detect-evil-and-good',
       declaredOption: {
diff --git a/tests/unit/tools/ai-dm-knowledge-base.test.ts b/tests/unit/tools/ai-dm-knowledge-base.test.ts
index 8e06b514dad92d204733196c2cbe76eef9dae38a..d637ea47bb363718ee55eae43cb57f0213c0fa3d
--- a/tests/unit/tools/ai-dm-knowledge-base.test.ts
+++ b/tests/unit/tools/ai-dm-knowledge-base.test.ts
@@ -18,10 +18,12 @@
 import { declareTestInputs } from '../../helpers/test-inputs';
 import { tmpdir } from 'node:os';
 import {
-  createEngineMcpRuntime,
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   createLauncherKbReadBudget,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import {
   kbSubjectSources,
   KbReadBudget,
@@ -45,6 +47,17 @@
 ] as const;
 
 const arenaFixture = 'tests/fixtures/arena-basis/seed-3943001.json' as const;
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
 const inputs = declareTestInputs({ fixtures: [...fixturePaths, arenaFixture] });
 const fixtureText = (path: (typeof fixturePaths)[number]): string => inputs.fixtures.readText(path);
 const rootText = fixtureText(DEFAULT_AI_DM_KB_ROOT);
diff --git a/tests/unit/tools/engine-mcp-boundary.test.ts b/tests/unit/tools/engine-mcp-boundary.test.ts
index fd26564494d5acd90cc5deebe14a0f7efb3b0261..c24ce395f57ade784761fcf778bb953bdebb70cc
--- a/tests/unit/tools/engine-mcp-boundary.test.ts
+++ b/tests/unit/tools/engine-mcp-boundary.test.ts
@@ -4,7 +4,7 @@
 import { EngineMcpStdioClient } from '../../../tools/engine-mcp-dry-client';
 import { collectEngineMcpRuntimeGraph, engineMcpImportBoundaryFailures, scanEngineMcpArtifacts } from '../../../tools/engine-mcp-proof';
 import {
-  createEngineMcpRuntime,
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   decodeArenaFixture,
   decodeEngineMcpEntrypointDocument,
   decodeEngineMcpLauncherManifest,
@@ -12,10 +12,27 @@
   freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
-import { createLegacyEngineOptionEnvironmentBinding } from '../../../src/vtt/offers/offer-environment';
+import {
+  createLegacyEngineOptionEnvironment,
+  createRevisionBoundEngineOptionEnvironment,
+  createLegacyEngineOptionEnvironmentBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 
 const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
 const META = mcpRequestMeta({ name: 'SUBSTITUTED_LOCAL', version: '1.0.0' });
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+const TRANSITIONAL_STDIO_OFFER_ENVIRONMENT = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
@@ -231,7 +248,10 @@
 
   it('proves transport-neutral request parity through the test-only adapter', { timeout: 20_000 }, async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const runtime = createEngineMcpRuntime(state);
+    const runtime = createDefaultEngineMcpRuntime(state, {
+      offerEnvironment: TRANSITIONAL_STDIO_OFFER_ENVIRONMENT,
+    });
+    expect(runtime.feed.current().offerEnvironment).toEqual(TRANSITIONAL_STDIO_OFFER_ENVIRONMENT.binding);
     const adapter = new SUBSTITUTED_LOCALAdapter(runtime.handler);
     expect(adapter.request('server/discover', {})).toHaveProperty('result');
     expect(adapter.request('tools/list', {})).toHaveProperty('result');
diff --git a/tests/unit/tools/engine-mcp-golden.test.ts b/tests/unit/tools/engine-mcp-golden.test.ts
index 45fc118e4480632291a0464456e139fcc310bfe3..e546591af74c3fcdd250a3cf1d0f6aede8670d0a
--- a/tests/unit/tools/engine-mcp-golden.test.ts
+++ b/tests/unit/tools/engine-mcp-golden.test.ts
@@ -1,9 +1,12 @@
 import { describe, expect, it } from 'vitest';
 import { runEngineMcpDryClient } from '../../../tools/engine-mcp-dry-client';
 import type { DryTranscriptEntry } from '../../../tools/engine-mcp-dry-client';
-import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 
 const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
@@ -58,6 +61,8 @@
     expect(actorId).toBe('combatant:generated-3943006-monster-1');
     expect(record(queryArguments['objective'], 'query objective')['action_id']).toBe('web');
     const state = await loadArenaFixture(FIXTURE);
+    const boundRuntime = createEngineMcpRuntime(state, { offerEnvironment: BOUND_OFFER_ENVIRONMENT });
+    expect(boundRuntime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
     const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
     const actorToken = state.tokens.find((token) => token.combatantId === actorId);
     const targets = state.combatants.filter((candidate) => candidate.profile.kind === 'player_character');
diff --git a/tests/unit/tools/engine-mcp-handler.test.ts b/tests/unit/tools/engine-mcp-handler.test.ts
index 7a3f722e9fca54d12753a9efa79f818130de6873..05fa1589aaf2dcddf892a936f7eb3c16c2bc79e6
--- a/tests/unit/tools/engine-mcp-handler.test.ts
+++ b/tests/unit/tools/engine-mcp-handler.test.ts
@@ -23,7 +23,13 @@
   ENGINE_DM_TOOL_NAMES,
   ENGINE_SPECULATIVE_DM_TOOL_NAMES,
 } from '../../../src/vtt/mcp/engine-server';
-import { createEngineMcpRuntime, loadArenaFixture, type EngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
+import {
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
+  loadArenaFixture,
+  type EngineMcpRuntime,
+} from '../../../src/vtt/mcp/entrypoint';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import {
   applyRevisionDelta,
@@ -46,6 +52,17 @@
 } from '../../../src/vtt/mcp/schemas';
 
 const CLIENT_INFO = Object.freeze({ name: 'vitest', version: '1.0.0' });
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+
+function createEngineMcpRuntime(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
+  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  return runtime;
+}
 const TOOL_NAMES = [
   'engine.get_turn_context',
   'engine.query_tactical_intel',
diff --git a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
index 8912c57a62f82c233cb53a530b52bfc8e45eb3a0..06011d1526d23462e7be2a5e15bda87d37d48841
--- a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
+++ b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
@@ -13,6 +13,10 @@
 import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
 import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
 import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
+import { generateRoom } from '../../../src/vtt/room-generator';
+import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 
 interface FakeRequest {
   readonly path: string;
@@ -45,6 +49,7 @@
   misc: 'merged',
   optionDetail: 'top2_stubs',
 } as const;
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
 async function fakeServer(
   respond: (request: FakeRequest, index: number) => { readonly status?: number; readonly body: unknown },
@@ -104,6 +109,13 @@
 }
 
 describe('SIMULATED local OpenAI conversation adapter', () => {
+  it('binds the SIMULATED arena runtime to its explicit offer environment', () => {
+    const state = generateRoom(3_943_001).encounter.state;
+    const runtime = createEngineMcpRuntime(state, { offerEnvironment: BOUND_OFFER_ENVIRONMENT });
+
+    expect(runtime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
+  });
+
   it('terminates the tool loop immediately after an accepted plan adjustment', async () => {
     const endpoint = await fakeServer(() => ({
       body: assistantToolCall('call-adjustment', 'engine__submit_plan_adjustment', {
