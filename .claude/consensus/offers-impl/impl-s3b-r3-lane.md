# Offers 3B fix round 2 lane report (sol resumed 01a09c92…, 2026-09-13)

Source: .tmp/runs/fanout/offers-s3b-r3.log (verbatim final message)

The `isolate:false` ordering failure is fixed, and all requested test commands pass. Exact SIMULATED runtime instance attachment remains unprovable through the current public surface; the required equal-binding production mutant survives.

## Finding disposition

S3B-R2-F1:

- Removed the `vi.hoisted` observer and `vi.mock` dependency from [local-openai-conversation.SIMULATED.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:164).
- The authorized arena test now captures the real context and proposals exchanged through the fake server, confirms the advertised IDs were submitted and accepted, then demonstrates same-instance success and equal-binding-instance rejection at [lines 235–280](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:235).
- The refusal path now checks the real initial arena prompt’s run/revision capsule at [line 303](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:303).
- Ordering and leak reproducers are green.

However, `runArena` exposes only serialized bindings, option IDs, requests, and rows. The exact environment reconstructed inside [ai-dm-conversation.ts:2775](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:2775) never crosses the test boundary.

`BLOCKED-PRODUCTION: tools/ai-dm-conversation.ts add an optional ConversationRunOptions engineMcpRuntimeFactory, thread it into inProcessDmToolSession, and use it for createEngineMcpRuntime at line 2775; the test factory must receive the exact offerEnvironment passed to the runtime so an equal-binding replacement at that consumer call becomes observable and mutation-killable.`

## `isolate:false` audit

| File | Persistent state found | Cross-file hazard |
|---|---|---|
| dm-encounter-host-live-path | Module-local environment/boolean; per-call proxy | None; nothing exported or patched |
| ai-dm-arena | Module-local environment/boolean; per-call proxy | None |
| ai-dm-board-delivery | Two module-local booleans; per-call proxy | None |
| ai-dm-board-snapshot | Module-local environment; per-call proxy counter | None |
| ai-dm-conversation | Module-local environment/boolean; per-call proxy | None; unrelated child-stdin spy is restored |
| ai-dm-knowledge-base | Module-local environment/boolean; per-call proxy | None |
| engine-mcp-boundary | Module-local environments/boolean; per-call proxy | None |
| engine-mcp-golden | None; environments are helper-local | None |
| engine-mcp-handler | Module-local environment/boolean; per-call proxy | None |
| local-openai-conversation.SIMULATED | None; captures are test-local | Fixed; no module mocking/resetting |

The other nine assertions were unchanged, so their round-1 mutation rows stand.

## SIMULATED mutation

Mutant at `tools/ai-dm-conversation.ts:2776`:

```ts
offerEnvironment: createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
```

This replaced the capsule-derived environment with a fresh equal-binding instance.

Command:

```text
npx vitest run --configLoader runner tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
```

Result: exit 0, 1 file passed, 4 tests passed, 5.58 s. The mutant survived instead of producing the required red exit 1, directly confirming the missing observation seam.

Production file SHA-256 before and after byte-identical restoration:

```text
d8d23dc506bdb107983adc3667159d31be5b17dfc9a2a70d6a5e0e1559bcddc5
```

## Verification

- `npx vitest run --configLoader runner tests/unit/tools/local-openai-conversation.SIMULATED.test.ts`
  - Exit 0; 1 file, 4 tests passed; 5.22 s.
- Board-delivery ordering reproducer:
  - Exit 0; 2 files, 21 tests passed; 121.75 s.
- SIMULATED/golden/snapshot leak check:
  - Exit 0; 3 files, 21 tests passed; 25.82 s.
- Exact twelve-spec serial command:
  - Exit 0; 12 files, 331 tests passed; 1270.91 s.
  - No file hit a wall.
- `npx tsc -b --force`: exit 0, 0 diagnostics.
- `sg scan`: exit 0, 0 findings.
- `git diff --check`: exit 0.
- Frozen contract SHA-256 remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Final diff: exactly ten test files, 567 insertions and 52 deletions. `git status --short` lists only those ten modified test files; no production, docs, or `.claude` files are dirty.

BLOCKED: SIMULATED arena exact instance attachment requires the reported production runtime-factory seam
diff --git a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
index dd04a52414cacbf8243daa4ea6c743a924eaf850..54adb083b4a5613eced5ba33832bbcc171d0efa3
--- a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
+++ b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
@@ -2,8 +2,8 @@
 import type { AddressInfo } from 'node:net';
 import { join } from 'node:path';
 import { tmpdir } from 'node:os';
-import { describe, expect, it, vi } from 'vitest';
-import { encounterSessionId } from '../../../src/combat/values';
+import { describe, expect, it } from 'vitest';
+import { combatantId, encounterSessionId } from '../../../src/combat/values';
 import { ENGINE_DM_TOOL_NAMES } from '../../../src/vtt/mcp/engine-server';
 import { ENGINE_TOOL_SPECS } from '../../../src/vtt/mcp/schemas';
 import {
@@ -13,63 +13,13 @@
 import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
 import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
 import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
-
-const RUNTIME_IDENTITY_OBSERVATIONS = vi.hoisted(() => ({ checks: 0, runtimeCalls: 0 }));
-
-vi.mock('../../../src/vtt/mcp/entrypoint', async (importOriginal) => {
-  type EntrypointModule = typeof import('../../../src/vtt/mcp/entrypoint');
-  const actual = await importOriginal<EntrypointModule>();
-  const offerEnvironments = await import('../../../src/vtt/offers/offer-environment');
-  const resolvers = await import('../../../src/vtt/intent-resolver');
-  return {
-    ...actual,
-    createEngineMcpRuntime(
-      state: Parameters<EntrypointModule['createEngineMcpRuntime']>[0],
-      options: NonNullable<Parameters<EntrypointModule['createEngineMcpRuntime']>[1]> = {},
-    ): ReturnType<EntrypointModule['createEngineMcpRuntime']> {
-      const offerEnvironment = options.offerEnvironment;
-      if (offerEnvironment === undefined) {
-        throw new Error('SIMULATED arena created an MCP runtime without its offer environment.');
-      }
-      let bindingReads = 0;
-      const observedOfferEnvironment = new Proxy(offerEnvironment, {
-        get(target, property, receiver) {
-          if (property === 'binding') bindingReads += 1;
-          return Reflect.get(target, property, receiver) as unknown;
-        },
-      });
-      RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls += 1;
-      if (RUNTIME_IDENTITY_OBSERVATIONS.checks === 0) {
-        const planningState = actual.freshMonsterPlanningState(state);
-        const actorId = planningState.combatants.find(
-          (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
-        )?.profile.id;
-        if (actorId === undefined) throw new Error('SIMULATED arena identity probe has no living monster.');
-        const option = resolvers.availableEngineActorOptions(planningState, actorId, observedOfferEnvironment)[0];
-        if (option === undefined) throw new Error(`SIMULATED arena identity probe has no option for ${actorId}.`);
-        expect(resolvers.resolveEngineActorOption(planningState, option, observedOfferEnvironment).valid).toBe(true);
-        const equalBindingEnvironment = offerEnvironments.engineOptionEnvironmentFromBinding(
-          observedOfferEnvironment.queries,
-          observedOfferEnvironment.binding,
-        );
-        expect(equalBindingEnvironment).not.toBe(observedOfferEnvironment);
-        expect(equalBindingEnvironment.binding).toEqual(observedOfferEnvironment.binding);
-        expect(resolvers.resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
-          valid: false,
-          code: 'OFFER_ENVIRONMENT_MISMATCH',
-        });
-        RUNTIME_IDENTITY_OBSERVATIONS.checks += 1;
-      }
-      bindingReads = 0;
-      const runtime = actual.createEngineMcpRuntime(state, {
-        ...options,
-        offerEnvironment: observedOfferEnvironment,
-      });
-      expect(bindingReads).toBeGreaterThan(0);
-      return runtime;
-    },
-  } satisfies EntrypointModule;
-});
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import {
+  createLegacyEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import { loadArenaFixture, projectFutureMonsterTurns } from '../../../src/vtt/mcp/entrypoint';
 
 interface FakeRequest {
   readonly path: string;
@@ -89,6 +39,11 @@
   return value.map((entry) => record(entry, 'message'));
 }
 
+function records(value: unknown, label: string): readonly Readonly<Record<string, unknown>>[] {
+  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
+  return value.map((entry) => record(entry, label));
+}
+
 const ALL_OPTIONS_TEST_RENDERER_PROFILE = {
   ...DEFAULT_RENDERER_PROFILE,
   rows: 'off',
@@ -207,8 +162,8 @@
   });
 
   it('drives a full authorized round through context, frontier expansion, and submission', { timeout: 30_000 }, async () => {
-    const runtimeCallsBeforeRun = RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls;
     let contextForSubmission: Readonly<Record<string, unknown>> | null = null;
+    let submittedProposals: readonly Readonly<Record<string, unknown>>[] | null = null;
     const endpoint = await fakeServer((request, index) => {
       const requestMessages = messages(request.body['messages']);
       if (index === 0) {
@@ -243,13 +198,15 @@
       }
       const expansion = record(JSON.parse(toolMessage['content']) as unknown, 'frontier expansion');
       if (contextForSubmission === null) throw new Error('Frontier expansion arrived without its turn context.');
+      if (!Array.isArray(expansion['proposals'])) throw new Error('Frontier expansion omitted proposals.');
+      submittedProposals = expansion['proposals'].map((proposal) => record(proposal, 'frontier proposal'));
       const requestValue = record(contextForSubmission['request'], 'turn request');
       return { body: assistantToolCall('call-submit', 'engine__submit_round_proposals', {
         state_ref: contextForSubmission['state_ref'],
         request_id: requestValue['request_id'],
         phase: requestValue['phase'],
         idempotency_key: 'SIMULATED-local-openai-round-submit',
-        proposals: expansion['proposals'],
+        proposals: submittedProposals,
       }, {
         prompt_tokens: 7, completion_tokens: 2,
       }) };
@@ -268,7 +225,6 @@
       ]);
       const rows = await runArena(config);
 
-      expect(RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls).toBeGreaterThan(runtimeCallsBeforeRun);
       expect(rows).toEqual([expect.objectContaining({
         cli: 'local-openai', model: 'quantized-SIMULATED', thinkMode: 'on', outcome: 'authorized',
         toolCalls: 3, callsPerRound: 1, flapRetries: 0, serviceNull: false,
@@ -276,6 +232,52 @@
         refusals: [],
         tokens: { input: 35, cachedInput: 3, output: 7, reasoning: 1 },
       })]);
+      const exposedContext = record(contextForSubmission, 'exposed turn context');
+      const exposedProposals = records(submittedProposals, 'submitted proposals');
+      const contextActors = records(exposedContext['actors'], 'turn-context actors');
+      const advertisedOptionIds = new Set(contextActors.flatMap((actor) => {
+        const options = record(actor, 'turn-context actor')['options'];
+        if (!Array.isArray(options)) throw new Error('Turn-context actor omitted options.');
+        return options.map((option) => record(option, 'turn-context option')['option_id'])
+          .filter((optionId): optionId is string => typeof optionId === 'string');
+      }));
+      const fixtureState = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
+      const submittedActorIds = exposedProposals.map((proposal) => {
+        const actorId = proposal['actor_id'];
+        if (typeof actorId !== 'string') throw new Error('Submitted proposal omitted its actor.');
+        return combatantId(actorId);
+      });
+      const planningState = projectFutureMonsterTurns(fixtureState, submittedActorIds);
+      const testEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+      const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+        canonicalEngineQueryPort,
+        testEnvironment.binding,
+      );
+      expect(equalBindingEnvironment).not.toBe(testEnvironment);
+      expect(equalBindingEnvironment.binding).toEqual(testEnvironment.binding);
+      for (const proposal of exposedProposals) {
+        const actorId = proposal['actor_id'];
+        const optionId = proposal['primary_option_id'];
+        const revision = proposal['expected_revision'];
+        if (typeof actorId !== 'string' || typeof optionId !== 'string' || typeof revision !== 'number') {
+          throw new Error('Submitted proposal omitted its actor, option, or revision.');
+        }
+        expect(advertisedOptionIds).toContain(optionId);
+        const option = availableEngineActorOptions(
+          planningState,
+          combatantId(actorId),
+          testEnvironment,
+          revision,
+        ).find((candidate) => candidate.optionId === optionId);
+        expect(option).toBeDefined();
+        if (option === undefined) throw new Error(`Submitted option ${optionId} was not minted by the test environment.`);
+        expect(resolveEngineActorOption(planningState, option, testEnvironment).valid).toBe(true);
+        expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+          valid: false,
+          code: 'OFFER_ENVIRONMENT_MISMATCH',
+        });
+      }
+      expect(rows[0]?.authorizedPlan?.map((entry) => entry.acceptedProposal)).toEqual(exposedProposals);
       expect(endpoint.requests).toHaveLength(3);
       expect(endpoint.requests.map((request) => request.path)).toEqual([
         '/v1/chat/completions', '/v1/chat/completions', '/v1/chat/completions',
@@ -299,7 +301,6 @@
   });
 
   it('classifies a refusing local server as local_error without service-null retries', { timeout: 30_000 }, async () => {
-    const runtimeCallsBeforeRun = RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls;
     const endpoint = await fakeServer(() => ({ status: 503, body: { error: 'model unavailable' } }));
     const directory = mkdtempSync(join(tmpdir(), 'dnd-local-openai-error-'));
     try {
@@ -310,9 +311,15 @@
         '--local-model', 'quantized-SIMULATED', '--timeout-ms', '1000',
       ]));
 
-      expect(RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls).toBeGreaterThan(runtimeCallsBeforeRun);
       expect(endpoint.requests).toHaveLength(1);
       expect(endpoint.requests[0]?.body['reasoning_effort']).toBe('none');
+      const initialMessages = messages(endpoint.requests[0]?.body['messages']);
+      const initialUser = initialMessages.findLast((message) => message['role'] === 'user');
+      if (typeof initialUser?.['content'] !== 'string') throw new Error('Initial error-path request omitted its user prompt.');
+      expect(enginePromptData(initialUser['content'])).toMatchObject({
+        run_id: 'encounter:ai-dm-conversation',
+        revision: expect.any(Number),
+      });
       expect(rows).toEqual([expect.objectContaining({
         model: 'quantized-SIMULATED', thinkMode: 'off', outcome: 'local_error',
         callsPerRound: 1, agentDispatched: true,
