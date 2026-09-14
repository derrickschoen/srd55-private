# Offers 3B fix round 3 (final) — lane report (gpt-5.6-sol, session 01a09c92-24b1-7e33-b185-4ef8e455ad96), harvested 2026-09-13 21:35

Implemented the final test-only fix on exactly the ten consumer specs. No production files remain changed.

## Finding disposition

- **S3B-R2-F1 — Closed.** Eight in-process consumers now use scoped namespace spies to capture the actual `createEngineMcpRuntime` argument and assert it with `toBe` against the independently controlled environment. The old capsule-binding assertions remain alongside the identity checks. Every spy is restored in `finally`, followed by `vi.isMockFunction(...) === false`.
- **S3B-R2-F2 — Explicit cross-process limitation.** Golden’s child environment cannot cross stdio. Parent namespace spies prove the child invocation does not call the parent constructors at [engine-mcp-golden.test.ts:87](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:87). The strongest available coverage remains transcript-option-ID linkage plus a local identity control. The original local capsule-binding observation was restored at [line 78](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:78).
- **S3B-R2-F3 — Closed test-only.** Both divergence resolutions now use one revision-bound environment at [ai-dm-conversation.test.ts:101](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:101). The production singleton export is intercepted through its Vite namespace getter and restored afterward. A same-method distinct query-port control is rejected at [line 1623](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1623).
- **S3B-R2-F4 — Strengthened under owner exception.** SIMULATED records environment-constructor returns and runtime-constructor arguments from the real `runArena` path, comparing them by identity at [lines 240–254](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:240). All three spies are restored and checked at lines 258–263.

Directly spying on the frozen resolver method failed with:

```text
TypeError: Cannot redefine property: resolve
```

The Vite SSR namespace-getter spy succeeded instead.

## Restored expectations

All eleven removed capsule observations are preserved:

| Path | Restored observation |
|---|---:|
| live path | line 73 |
| arena | line 96 |
| board delivery | line 97 |
| board snapshot | line 173, attached to resumed-state runtime |
| conversation | line 137 |
| knowledge base | line 91 |
| boundary bound and transitional paths | line 63 through the shared wrapper |
| golden local boundary control | line 78 |
| handler | line 96 |
| SIMULATED actual runtimes | line 254 |

The disconnected snapshot and SIMULATED constructor tests remain replaced by assertions on their exercised paths.

## Mutation results

| File/path | Mutant | Result | Restored SHA-256 |
|---|---|---:|---|
| dm live path | Runtime receives reconstructed equal-binding environment | Exit 1, 1 failed | `35ce26fa…e4723` |
| ai-dm-arena | Same counter-mutant | Exit 1, included in six-file 6/6 failure | `3a12cf79…9a557` |
| board-delivery | Same counter-mutant | Exit 1, included in six-file 6/6 failure | `031dd8b7…dd683` |
| board-snapshot | Direct runtime receives reconstructed environment | Exit 1, 1 failed | `2c0229b7…5255` |
| ai-dm-conversation | Runtime counter-mutant | Exit 1, included in six-file failure | `2afccc83…d5efa` |
| ai-dm-conversation F3 | Bound environment replaced by `{ ...canonicalEngineQueryPort }` | Exit 1, 1 failed | `2afccc83…d5efa` |
| knowledge-base | Runtime counter-mutant | Exit 1, included in six-file failure | `0d8f4e48…08fcb` |
| engine-mcp-boundary | Runtime counter-mutant | Exit 1, included in six-file failure | `3614e2cb…64db` |
| engine-mcp-golden | Submitted transcript option ID replaced with absent ID | Exit 1, 1 failed | `2daa6fae…91de` |
| engine-mcp-handler | Runtime counter-mutant | Exit 1, included in six-file failure | `89632140…be0c` |
| SIMULATED | Production runtime receives a second fresh equal-binding reconstruction | Exit 1, 1 failed | `9d4c204a…7f77` |

The six-wrapper mutation command produced 6 failed files, 6 failed tests, 293 filtered tests, exit 1, 4.35 seconds. Live-path produced 1 failed/6 filtered in 4.14 seconds; snapshot 1 failed/14 filtered in 4.63 seconds; SIMULATED 1 failed/3 filtered in 4.85 seconds; divergence 1 failed/85 filtered in 4.12 seconds; golden 1 failed/1 filtered in 22.30 seconds.

Temporary production mutation restoration:

```text
tools/ai-dm-conversation.ts
before: d8d23dc506bdb107983adc3667159d31be5b17dfc9a2a70d6a5e0e1559bcddc5
after:  d8d23dc506bdb107983adc3667159d31be5b17dfc9a2a70d6a5e0e1559bcddc5
```

## Verification

- SIMULATED alone:
  - `npx vitest run --configLoader runner tests/unit/tools/local-openai-conversation.SIMULATED.test.ts`
  - Exit 0; 1 file, 4 tests passed; 5.32 seconds.
- Board-delivery → SIMULATED ordering:
  - Exit 0; 2 files, 21 tests passed; 120.69 seconds.
- SIMULATED → golden → snapshot leak check:
  - Exit 0; 3 files, 21 tests passed; 24.84 seconds.
- Exact twelve-spec serial command:
  - Pre-run load: `1.57 6.19 5.42`.
  - Exit 0; 12 files, 331 tests passed; 1257.86 seconds.
  - No test hit a wall.
- `npx tsc -b --force`: exit 0, zero diagnostics.
- `sg scan`: exit 0, zero findings.
- `git diff --check`: exit 0.
- Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Two earlier attempts hit existing walls under transient load, without timeout changes:

- Ordering attempt: board-delivery timed out at 60.397 seconds; load immediately afterward `22.88 8.93 4.12`.
- Leak attempt: golden timed out at 30.013 seconds; load immediately afterward `25.42 12.02 5.47`.
- Both exact commands passed after load subsided.

Final `git status --short` contains exactly the ten requested modified test files. Diff is 240 insertions and 222 deletions. No `src`, `tools`, `docs`, or `.claude` changes remain.

S3B-R4 DONE
diff --git a/tests/integration/vtt/dm-encounter-host-live-path.test.ts b/tests/integration/vtt/dm-encounter-host-live-path.test.ts
index e9cd125f5db2cc6a3fa789139589dd248a22b049..a2a31d2ec7bb7cdc8a2fcd518e347e01494ae286
--- a/tests/integration/vtt/dm-encounter-host-live-path.test.ts
+++ b/tests/integration/vtt/dm-encounter-host-live-path.test.ts
@@ -1,4 +1,4 @@
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import type { ControllerIdentity, LegalActionSummary } from '../../../src/combat/controllers';
 import { monsterCombatantProfile } from '../../../src/combat/combatant';
 import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
@@ -16,9 +16,9 @@
 } from '../../../src/vtt/session-persistence';
 import { createConversationRoundDeadline } from '../../../src/vtt/agent-session-lifecycle';
 import {
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
   createRevisionBoundEngineOptionEnvironment,
@@ -37,21 +37,8 @@
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 let offerEnvironmentIdentityChecked = false;
 
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
-
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -75,18 +62,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 
 function position(state: EncounterState, id: CombatantId): GridCell {
diff --git a/tests/unit/tools/ai-dm-arena.test.ts b/tests/unit/tools/ai-dm-arena.test.ts
index dda928a68ee87dfcc849adee72342c6e60da8bcd..8bd5bc34ed06fe60563d9d54ca0431332bc3dea6
--- a/tests/unit/tools/ai-dm-arena.test.ts
+++ b/tests/unit/tools/ai-dm-arena.test.ts
@@ -1,7 +1,7 @@
 import { join } from 'node:path';
 import { tmpdir } from 'node:os';
 import { spawnSync } from 'node:child_process';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { encounterSessionId } from '../../../src/combat/values';
 import { createEncounter } from '../../../src/combat/encounter';
 import {
@@ -18,10 +18,10 @@
 import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import {
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
   type EngineMcpLauncherManifest,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
@@ -60,21 +60,8 @@
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 let offerEnvironmentIdentityChecked = false;
 
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
-
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -98,18 +85,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 
 function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
diff --git a/tests/unit/tools/ai-dm-board-delivery.test.ts b/tests/unit/tools/ai-dm-board-delivery.test.ts
index 00d66ff2e927cb412cf291816ebd2a0d160acf0f..4156124e980511d5f8018314877f50bdb5d40d04
--- a/tests/unit/tools/ai-dm-board-delivery.test.ts
+++ b/tests/unit/tools/ai-dm-board-delivery.test.ts
@@ -1,7 +1,7 @@
 import { createHash } from 'node:crypto';
 import { join } from 'node:path';
 import { tmpdir } from 'node:os';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import {
   agentSessionIdFromCli,
   type AgentInvocation,
@@ -22,13 +22,13 @@
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import {
   decodeEngineMcpLauncherManifest,
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
   loadArenaFixture,
   validatedLauncherBoardHtmlReference,
   validatedLauncherBoardImage,
   type EngineMcpLauncherManifest,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
 import {
@@ -61,21 +61,8 @@
 let offerEnvironmentIdentityChecked = false;
 let launcherOfferEnvironmentIdentityChecked = false;
 
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
-
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -99,18 +86,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 
 function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
diff --git a/tests/unit/tools/ai-dm-board-snapshot.test.ts b/tests/unit/tools/ai-dm-board-snapshot.test.ts
index 819d36526b94e99e3ad6a3b277b9a72919582bbb..a42ec347457203576cf5ac283283175944e0448d
--- a/tests/unit/tools/ai-dm-board-snapshot.test.ts
+++ b/tests/unit/tools/ai-dm-board-snapshot.test.ts
@@ -1,4 +1,4 @@
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { readFile } from '../../helpers/test-filesystem-promises';
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import type { EncounterState } from '../../../src/combat/encounter';
@@ -12,10 +12,10 @@
   EncounterSessionJournal,
 } from '../../../src/vtt/session-persistence';
 import {
-  createEngineMcpRuntime,
   freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
   createRevisionBoundEngineOptionEnvironment,
@@ -37,19 +37,6 @@
   (_unused, index) => `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`,
 );
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
-
-function observeOfferEnvironment() {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(BOUND_OFFER_ENVIRONMENT, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
 
 function expectOfferEnvironmentIdentity(
   state: EncounterState,
@@ -176,12 +163,19 @@
 
     expect(importSavedSession(store, bundle.bytes)).toBe(bundle.sessionId);
     const resumed = EncounterSessionJournal.resume(bundle.sessionId, store, new MemoryMirrorSink());
-    const observed = observeOfferEnvironment();
-    const runtime = createEngineMcpRuntime(resumed.encounterState, {
-      offerEnvironment: observed.environment,
-    });
-    expect(observed.bindingReads()).toBeGreaterThan(0);
-    expectOfferEnvironmentIdentity(resumed.encounterState, observed.environment);
+    const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+    let runtime: ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime>;
+    try {
+      runtime = engineMcpEntrypoint.createEngineMcpRuntime(resumed.encounterState, {
+        offerEnvironment: BOUND_OFFER_ENVIRONMENT,
+      });
+      expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(BOUND_OFFER_ENVIRONMENT);
+      expect(runtime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
+      expectOfferEnvironmentIdentity(resumed.encounterState, BOUND_OFFER_ENVIRONMENT);
+    } finally {
+      runtimeConstructor.mockRestore();
+      expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
+    }
     expect(canonicalJson(resumed.encounterState)).toBe(stateBytes);
     expect(runtime.feed.current().projection.combatants.map((combatant) => combatant.id).sort()).toEqual(
       resumed.encounterState.combatants
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index edea5693621b6d02209c2b0e1bf4ca5fa9a84da5..af35da0d322bf638ecd496cd1f24293a0507cb08
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -43,13 +43,14 @@
   pureTurnProposalResolver,
   resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
+import * as intentResolverModule from '../../../src/vtt/intent-resolver';
 import {
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
   loadArenaFixture,
   parseEngineMcpJsonLine,
   type EngineMcpLauncherManifest,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { mcpRequestMeta, type McpHandler } from '../../../src/vtt/mcp/handler';
 import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
 import {
@@ -97,24 +98,11 @@
 ] });
 const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
-const DIVERGENCE_OFFER_ENVIRONMENT = canonicalEngineQueryPort;
+const DIVERGENCE_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 let offerEnvironmentIdentityChecked = false;
-
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
 
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -138,18 +126,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 
 function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
@@ -1622,22 +1616,36 @@
       actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
       fallbackOptionId: null, reason: 'Exercise the fixture proposal path.', overrideJustification: null,
     };
-    const proposalTime = createPureTurnProposalResolver(DIVERGENCE_OFFER_ENVIRONMENT).resolve(state, proposal);
+    const divergenceResolver = createPureTurnProposalResolver(DIVERGENCE_OFFER_ENVIRONMENT);
+    const proposalTime = divergenceResolver.resolve(state, proposal);
     if (!proposalTime.valid) throw new Error('Room 3943006 Dodge proposal did not resolve.');
-    expect(proposalTime).toEqual(pureTurnProposalResolver.resolve(state, proposal));
+    expect(proposalTime).toEqual(divergenceResolver.resolve(state, proposal));
+    const equalQueryPort = { ...canonicalEngineQueryPort };
+    expect(equalQueryPort).not.toBe(canonicalEngineQueryPort);
+    expect(resolveEngineActorOption(state, option, equalQueryPort)).toMatchObject({
+      valid: false,
+      code: 'OFFER_ENVIRONMENT_MISMATCH',
+    });
 
-    expect(proposalResolutionDivergence(state, {
-      proposal,
-      option: proposalTime.option,
-      primaryOption: proposalTime.primaryOption,
-      fallbackOption: proposalTime.fallbackOption,
-      mechanics: proposalTime.mechanics,
-      selectedBranch: proposalTime.selectedBranch,
-      resolutionDigest: '0'.repeat(64),
-      summary: proposalTime.summary,
-    })).toEqual([
-      `${actor.profile.id}: path or final-position geometry diverged while action sequence, targets, and movement cost remained ${proposalTime.summary}.`,
-    ]);
+    const defaultResolver = vi.spyOn(intentResolverModule, 'pureTurnProposalResolver', 'get')
+      .mockReturnValue(divergenceResolver);
+    try {
+      expect(proposalResolutionDivergence(state, {
+        proposal,
+        option: proposalTime.option,
+        primaryOption: proposalTime.primaryOption,
+        fallbackOption: proposalTime.fallbackOption,
+        mechanics: proposalTime.mechanics,
+        selectedBranch: proposalTime.selectedBranch,
+        resolutionDigest: '0'.repeat(64),
+        summary: proposalTime.summary,
+      })).toEqual([
+        `${actor.profile.id}: path or final-position geometry diverged while action sequence, targets, and movement cost remained ${proposalTime.summary}.`,
+      ]);
+    } finally {
+      defaultResolver.mockRestore();
+      expect(vi.isMockFunction(intentResolverModule.pureTurnProposalResolver)).toBe(false);
+    }
   });
 
   it.each([3_943_004, 3_943_007])(
diff --git a/tests/unit/tools/ai-dm-knowledge-base.test.ts b/tests/unit/tools/ai-dm-knowledge-base.test.ts
index 3517af2c5c24f58c4dfcd13e0544cd81a025cdf5..35ba2b64822289167ba7fcfc91509dfbd7fa78f5
--- a/tests/unit/tools/ai-dm-knowledge-base.test.ts
+++ b/tests/unit/tools/ai-dm-knowledge-base.test.ts
@@ -1,6 +1,6 @@
 import { createHash } from 'node:crypto';
 import { isAbsolute, join, resolve } from 'node:path';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import {
   AI_DM_KB_FIXTURE_DIRECTORY,
   DEFAULT_AI_DM_KB_ROOT,
@@ -18,11 +18,11 @@
 import { declareTestInputs } from '../../helpers/test-inputs';
 import { tmpdir } from 'node:os';
 import {
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   createLauncherKbReadBudget,
   freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
   createRevisionBoundEngineOptionEnvironment,
@@ -55,21 +55,8 @@
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 let offerEnvironmentIdentityChecked = false;
 
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
-
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -93,18 +80,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 const inputs = declareTestInputs({ fixtures: [...fixturePaths, arenaFixture] });
 const fixtureText = (path: (typeof fixturePaths)[number]): string => inputs.fixtures.readText(path);
diff --git a/tests/unit/tools/engine-mcp-boundary.test.ts b/tests/unit/tools/engine-mcp-boundary.test.ts
index 0442d7ad04d6a559ee64cfdfdf1d64c5960c210f..56eec2648942c2a3da425bcd077bf2463429bb21
--- a/tests/unit/tools/engine-mcp-boundary.test.ts
+++ b/tests/unit/tools/engine-mcp-boundary.test.ts
@@ -1,10 +1,9 @@
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { mcpRequestMeta } from '../../../src/vtt/mcp/handler';
 import type { McpHandler } from '../../../src/vtt/mcp/handler';
 import { EngineMcpStdioClient } from '../../../tools/engine-mcp-dry-client';
 import { collectEngineMcpRuntimeGraph, engineMcpImportBoundaryFailures, scanEngineMcpArtifacts } from '../../../tools/engine-mcp-proof';
 import {
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   decodeArenaFixture,
   decodeEngineMcpEntrypointDocument,
   decodeEngineMcpLauncherManifest,
@@ -12,6 +11,7 @@
   freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import {
   createLegacyEngineOptionEnvironment,
   createRevisionBoundEngineOptionEnvironment,
@@ -27,21 +27,8 @@
 const TRANSITIONAL_STDIO_OFFER_ENVIRONMENT = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
 let offerEnvironmentIdentityChecked = false;
 
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
-
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -65,18 +52,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
diff --git a/tests/unit/tools/engine-mcp-golden.test.ts b/tests/unit/tools/engine-mcp-golden.test.ts
index 107d57bde3b9cf1851bef770c340105b1e2b076c..356f2a38654d7b6788181fca681aa553a81e4df5
--- a/tests/unit/tools/engine-mcp-golden.test.ts
+++ b/tests/unit/tools/engine-mcp-golden.test.ts
@@ -1,15 +1,19 @@
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { runEngineMcpDryClient } from '../../../tools/engine-mcp-dry-client';
 import type { DryTranscriptEntry } from '../../../tools/engine-mcp-dry-client';
 import { freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
   createLegacyEngineOptionEnvironment,
+  createRevisionBoundEngineOptionEnvironment,
   engineOptionEnvironmentFromBinding,
 } from '../../../src/vtt/offers/offer-environment';
+import * as offerEnvironmentModule from '../../../src/vtt/offers/offer-environment';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 
 const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
+const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
@@ -68,6 +72,10 @@
 describe('real-stdio engine MCP golden dungeon run', () => {
   it('rejects an equal-binding replacement for a stdio-shaped option', async () => {
     const planningState = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
+    const boundRuntime = engineMcpEntrypoint.createEngineMcpRuntime(planningState, {
+      offerEnvironment: BOUND_OFFER_ENVIRONMENT,
+    });
+    expect(boundRuntime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
     const actorId = planningState.combatants.find(
       (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
     )?.profile.id;
@@ -76,7 +84,19 @@
   });
 
   it('covers discovery, proposal correction, adjudication, narration, and restart shapes', { timeout: 30_000 }, async () => {
-    const report = await runEngineMcpDryClient(FIXTURE);
+    const environmentConstructor = vi.spyOn(offerEnvironmentModule, 'createLegacyEngineOptionEnvironment');
+    const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+    let report: Awaited<ReturnType<typeof runEngineMcpDryClient>>;
+    try {
+      report = await runEngineMcpDryClient(FIXTURE);
+      expect(environmentConstructor).not.toHaveBeenCalled();
+      expect(runtimeConstructor).not.toHaveBeenCalled();
+    } finally {
+      runtimeConstructor.mockRestore();
+      environmentConstructor.mockRestore();
+      expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
+      expect(vi.isMockFunction(offerEnvironmentModule.createLegacyEngineOptionEnvironment)).toBe(false);
+    }
     expect(report).toMatchObject({ status: 'VERIFIED', protocolConformance: 'SUBSTITUTED_LOCAL' });
     const methods = report.initial.map((entry) => decoded(entry.request)['method']);
     expect(methods).toEqual(expect.arrayContaining(['server/discover', 'tools/list', 'resources/list', 'prompts/list']));
diff --git a/tests/unit/tools/engine-mcp-handler.test.ts b/tests/unit/tools/engine-mcp-handler.test.ts
index 2b667f7526b9a0ab59b5e1712cb3e77e273b64ea..16ef90fd50aa6a6376b3f8e8074b024f97999df2
--- a/tests/unit/tools/engine-mcp-handler.test.ts
+++ b/tests/unit/tools/engine-mcp-handler.test.ts
@@ -1,4 +1,4 @@
-import { beforeAll, describe, expect, it } from 'vitest';
+import { beforeAll, describe, expect, it, vi } from 'vitest';
 import { z } from 'zod';
 import { readFileSync } from '../../helpers/test-filesystem';
 import type { EncounterState } from '../../../src/combat/encounter';
@@ -24,11 +24,11 @@
   ENGINE_SPECULATIVE_DM_TOOL_NAMES,
 } from '../../../src/vtt/mcp/engine-server';
 import {
-  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   freshMonsterPlanningState,
   loadArenaFixture,
   type EngineMcpRuntime,
 } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
   createRevisionBoundEngineOptionEnvironment,
@@ -60,21 +60,8 @@
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 let offerEnvironmentIdentityChecked = false;
 
-function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
-  let bindingReads = 0;
-  return {
-    environment: new Proxy(offerEnvironment, {
-      get(target, property, receiver) {
-        if (property === 'binding') bindingReads += 1;
-        return Reflect.get(target, property, receiver) as unknown;
-      },
-    }),
-    bindingReads: () => bindingReads,
-  };
-}
-
 function expectOfferEnvironmentIdentity(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
   offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
 ): void {
   const planningState = freshMonsterPlanningState(state);
@@ -98,18 +85,24 @@
 }
 
 function createEngineMcpRuntime(
-  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
-  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
-): ReturnType<typeof createDefaultEngineMcpRuntime> {
+  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
+  options: NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]> = {},
+): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const observed = observeOfferEnvironment(offerEnvironment);
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
-  expect(observed.bindingReads()).toBeGreaterThan(0);
-  if (!offerEnvironmentIdentityChecked) {
-    expectOfferEnvironmentIdentity(state, observed.environment);
-    offerEnvironmentIdentityChecked = true;
+  const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+  try {
+    const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
+    expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(offerEnvironment);
+    expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+    if (!offerEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      offerEnvironmentIdentityChecked = true;
+    }
+    return runtime;
+  } finally {
+    runtimeConstructor.mockRestore();
+    expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
   }
-  return runtime;
 }
 const TOOL_NAMES = [
   'engine.get_turn_context',
diff --git a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
index 54adb083b4a5613eced5ba33832bbcc171d0efa3..7361fd8c648cbdcc4afd2263c5c84763cc218811
--- a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
+++ b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
@@ -2,7 +2,7 @@
 import type { AddressInfo } from 'node:net';
 import { join } from 'node:path';
 import { tmpdir } from 'node:os';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { combatantId, encounterSessionId } from '../../../src/combat/values';
 import { ENGINE_DM_TOOL_NAMES } from '../../../src/vtt/mcp/engine-server';
 import { ENGINE_TOOL_SPECS } from '../../../src/vtt/mcp/schemas';
@@ -18,8 +18,10 @@
   createLegacyEngineOptionEnvironment,
   engineOptionEnvironmentFromBinding,
 } from '../../../src/vtt/offers/offer-environment';
+import * as offerEnvironmentModule from '../../../src/vtt/offers/offer-environment';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { loadArenaFixture, projectFutureMonsterTurns } from '../../../src/vtt/mcp/entrypoint';
+import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
 
 interface FakeRequest {
   readonly path: string;
@@ -223,7 +225,43 @@
         '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
         '--renderer-profile', JSON.stringify(ALL_OPTIONS_TEST_RENDERER_PROFILE),
       ]);
-      const rows = await runArena(config);
+      const legacyEnvironmentConstructor = vi.spyOn(
+        offerEnvironmentModule,
+        'createLegacyEngineOptionEnvironment',
+      );
+      const reconstructedEnvironmentConstructor = vi.spyOn(
+        offerEnvironmentModule,
+        'engineOptionEnvironmentFromBinding',
+      );
+      const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
+      let rows: Awaited<ReturnType<typeof runArena>>;
+      try {
+        rows = await runArena(config);
+        const constructedEnvironments = [
+          ...legacyEnvironmentConstructor.mock.results,
+          ...reconstructedEnvironmentConstructor.mock.results,
+        ].flatMap((result) => result.type === 'return' ? [result.value] : []);
+        const consumedEnvironments = runtimeConstructor.mock.calls.flatMap((call) =>
+          call[1]?.offerEnvironment === undefined ? [] : [call[1].offerEnvironment]);
+        expect(constructedEnvironments.length).toBeGreaterThan(0);
+        expect(consumedEnvironments.length).toBeGreaterThan(0);
+        expect(constructedEnvironments.every((environment) => consumedEnvironments.includes(environment))).toBe(true);
+        expect(consumedEnvironments.every((environment) => constructedEnvironments.includes(environment))).toBe(true);
+        for (const [index, call] of runtimeConstructor.mock.calls.entries()) {
+          const environment = call[1]?.offerEnvironment;
+          const result = runtimeConstructor.mock.results[index];
+          if (environment !== undefined && result?.type === 'return') {
+            expect(result.value.feed.current().offerEnvironment).toEqual(environment.binding);
+          }
+        }
+      } finally {
+        runtimeConstructor.mockRestore();
+        reconstructedEnvironmentConstructor.mockRestore();
+        legacyEnvironmentConstructor.mockRestore();
+        expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
+        expect(vi.isMockFunction(offerEnvironmentModule.engineOptionEnvironmentFromBinding)).toBe(false);
+        expect(vi.isMockFunction(offerEnvironmentModule.createLegacyEngineOptionEnvironment)).toBe(false);
+      }
 
       expect(rows).toEqual([expect.objectContaining({
         cli: 'local-openai', model: 'quantized-SIMULATED', thinkMode: 'on', outcome: 'authorized',

tokens used
1,254,102
Implemented the final test-only fix on exactly the ten consumer specs. No production files remain changed.

## Finding disposition

- **S3B-R2-F1 — Closed.** Eight in-process consumers now use scoped namespace spies to capture the actual `createEngineMcpRuntime` argument and assert it with `toBe` against the independently controlled environment. The old capsule-binding assertions remain alongside the identity checks. Every spy is restored in `finally`, followed by `vi.isMockFunction(...) === false`.
- **S3B-R2-F2 — Explicit cross-process limitation.** Golden’s child environment cannot cross stdio. Parent namespace spies prove the child invocation does not call the parent constructors at [engine-mcp-golden.test.ts:87](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:87). The strongest available coverage remains transcript-option-ID linkage plus a local identity control. The original local capsule-binding observation was restored at [line 78](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:78).
- **S3B-R2-F3 — Closed test-only.** Both divergence resolutions now use one revision-bound environment at [ai-dm-conversation.test.ts:101](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:101). The production singleton export is intercepted through its Vite namespace getter and restored afterward. A same-method distinct query-port control is rejected at [line 1623](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1623).
- **S3B-R2-F4 — Strengthened under owner exception.** SIMULATED records environment-constructor returns and runtime-constructor arguments from the real `runArena` path, comparing them by identity at [lines 240–254](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:240). All three spies are restored and checked at lines 258–263.

Directly spying on the frozen resolver method failed with:

```text
TypeError: Cannot redefine property: resolve
```

The Vite SSR namespace-getter spy succeeded instead.

## Restored expectations

All eleven removed capsule observations are preserved:

| Path | Restored observation |
|---|---:|
| live path | line 73 |
| arena | line 96 |
| board delivery | line 97 |
| board snapshot | line 173, attached to resumed-state runtime |
| conversation | line 137 |
| knowledge base | line 91 |
| boundary bound and transitional paths | line 63 through the shared wrapper |
| golden local boundary control | line 78 |
| handler | line 96 |
| SIMULATED actual runtimes | line 254 |

The disconnected snapshot and SIMULATED constructor tests remain replaced by assertions on their exercised paths.

## Mutation results

| File/path | Mutant | Result | Restored SHA-256 |
|---|---|---:|---|
| dm live path | Runtime receives reconstructed equal-binding environment | Exit 1, 1 failed | `35ce26fa…e4723` |
| ai-dm-arena | Same counter-mutant | Exit 1, included in six-file 6/6 failure | `3a12cf79…9a557` |
| board-delivery | Same counter-mutant | Exit 1, included in six-file 6/6 failure | `031dd8b7…dd683` |
| board-snapshot | Direct runtime receives reconstructed environment | Exit 1, 1 failed | `2c0229b7…5255` |
| ai-dm-conversation | Runtime counter-mutant | Exit 1, included in six-file failure | `2afccc83…d5efa` |
| ai-dm-conversation F3 | Bound environment replaced by `{ ...canonicalEngineQueryPort }` | Exit 1, 1 failed | `2afccc83…d5efa` |
| knowledge-base | Runtime counter-mutant | Exit 1, included in six-file failure | `0d8f4e48…08fcb` |
| engine-mcp-boundary | Runtime counter-mutant | Exit 1, included in six-file failure | `3614e2cb…64db` |
| engine-mcp-golden | Submitted transcript option ID replaced with absent ID | Exit 1, 1 failed | `2daa6fae…91de` |
| engine-mcp-handler | Runtime counter-mutant | Exit 1, included in six-file failure | `89632140…be0c` |
| SIMULATED | Production runtime receives a second fresh equal-binding reconstruction | Exit 1, 1 failed | `9d4c204a…7f77` |

The six-wrapper mutation command produced 6 failed files, 6 failed tests, 293 filtered tests, exit 1, 4.35 seconds. Live-path produced 1 failed/6 filtered in 4.14 seconds; snapshot 1 failed/14 filtered in 4.63 seconds; SIMULATED 1 failed/3 filtered in 4.85 seconds; divergence 1 failed/85 filtered in 4.12 seconds; golden 1 failed/1 filtered in 22.30 seconds.

Temporary production mutation restoration:

```text
tools/ai-dm-conversation.ts
before: d8d23dc506bdb107983adc3667159d31be5b17dfc9a2a70d6a5e0e1559bcddc5
after:  d8d23dc506bdb107983adc3667159d31be5b17dfc9a2a70d6a5e0e1559bcddc5
```

## Verification

- SIMULATED alone:
  - `npx vitest run --configLoader runner tests/unit/tools/local-openai-conversation.SIMULATED.test.ts`
  - Exit 0; 1 file, 4 tests passed; 5.32 seconds.
- Board-delivery → SIMULATED ordering:
  - Exit 0; 2 files, 21 tests passed; 120.69 seconds.
- SIMULATED → golden → snapshot leak check:
  - Exit 0; 3 files, 21 tests passed; 24.84 seconds.
- Exact twelve-spec serial command:
  - Pre-run load: `1.57 6.19 5.42`.
  - Exit 0; 12 files, 331 tests passed; 1257.86 seconds.
  - No test hit a wall.
- `npx tsc -b --force`: exit 0, zero diagnostics.
- `sg scan`: exit 0, zero findings.
- `git diff --check`: exit 0.
- Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Two earlier attempts hit existing walls under transient load, without timeout changes:

- Ordering attempt: board-delivery timed out at 60.397 seconds; load immediately afterward `22.88 8.93 4.12`.
- Leak attempt: golden timed out at 30.013 seconds; load immediately afterward `25.42 12.02 5.47`.
- Both exact commands passed after load subsided.

Final `git status --short` contains exactly the ten requested modified test files. Diff is 240 insertions and 222 deletions. No `src`, `tools`, `docs`, or `.claude` changes remain.

S3B-R4 DONE
