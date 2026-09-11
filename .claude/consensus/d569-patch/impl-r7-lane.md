Implemented the Round 7 reconciliation and both reviewer findings. The only remaining blocker is a non-D544 5-second test-wall failure in the required parallel cumulative; the rules prohibit its serial rerun.

### Conflict resolutions

- [engine-round-session.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-round-session.ts:586)
  - Preserved D569 `strictNoFallback`.
  - Preserved Offers Slice 2 environment-bound option discovery/resolution through `this.offerEnvironment.queries`.

- [entrypoint.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts:440)
  - Preserved D569 board-content exclusivity, blind HTML prohibition, and blind byte cap.
  - Preserved Offers Slice 2 immutable offer-environment construction and binding.

- [ai-dm-board-delivery.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-board-delivery.test.ts:545)
  - Preserved D569’s null/undefined delivered-context guard.
  - Preserved main’s schema-4 `state_ref` binding assertion.

No conflict markers remain. The three files remain `UU` only because `git add` is supervisor-owned.

### F32

- [agent-session.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-session.ts:262) and [agent-session-lifecycle.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-session-lifecycle.ts:117)
  - Late completed cold starts now return typed `expired` evidence without binding.
  - Resume, recovery, escalation, and rollover return observed late results before session/usage mutation.

- [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4729)
  - Primary, adjustment, speculation, and recalculation now classify/persist result evidence before deadline acceptance.
  - Speculative cleanup retains actual infrastructure failures even after deadline expiry.

- Regressions:
  - [Primary persistence](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:942)
  - [Adjustment persistence](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:3983)
  - [Recalculation infrastructure](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:3664)
  - [Both speculative cleanup joins](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:3709)
  - [Late lifecycle completion](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/agent-session-lifecycle.test.ts:197)

### F33

- [turn-exhaustion-coordinator.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:261)
  - Deadline expiry now returns `refused/round_deadline_expired`.
  - `host_authorization_failed` remains exclusive to an actual failed host authorization call.

- [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:552)
  - Added the typed fallback reason.

- [Regression](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:238) proves zero host-authorization calls.

The only replaced existing assertion was:

```ts
expect(outcome).toEqual({ kind: 'auto_resolved', actorIds: [f.actor] });
```

replaced with:

```ts
expect(outcome).toEqual({
  kind: 'refused',
  reason: 'round_deadline_expired',
  attemptConsumed: true,
});
```

All other `expect` changes are additive.

### Offers import-boundary composition

- Added [engine-catalog-evidence.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/engine-catalog-evidence.ts:1).
- [codex.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/codex.ts:14) uses the adapter-local classifier.
- [engine-dispatch-evidence.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-dispatch-evidence.ts:1) re-exports the existing public contract.

This preserves D569 readiness behavior while satisfying main’s capsule import boundary.

### Verification

Static commands:

```text
npm run typecheck:fast
exit 0

sg scan
exit 0

git diff --check
exit 0

grep -rn '^<<<<<<<\|^=======$\|^>>>>>>>' src tools tests
exit 1; zero matches

git diff --no-ext-diff --unified=0 | rg '^\+.*(@ts-ignore|@ts-expect-error|\.skip\(|\.todo\(|\bany\b)'
exit 1; zero matches
```

Focused results:

```text
npx vitest run --configLoader runner --reporter verbose tests/unit/tools/ai-dm-conversation.test.ts
exit 0 — 1 file, 107/107 tests passed

npx vitest run --configLoader runner tests/unit/vtt/agent-session-lifecycle.test.ts tests/unit/vtt/turn-exhaustion-coordinator.test.ts
exit 0 — 2 files, 28/28 tests passed

npx vitest run --configLoader runner tests/unit/vtt/engine-round-session.test.ts tests/unit/combat/creature-space.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/engine-state-capsule.test.ts
exit 0 — 4 files, 50/50 tests passed

npx vitest run --configLoader runner tests/unit/tools/ai-dm-board-delivery.test.ts
exit 0 — 1 file, 17/17 tests passed

npx vitest run --configLoader runner tests/unit/tools/engine-mcp-boundary.test.ts
exit 0 — 1 file, 7/7 tests passed
```

Required 17-file cumulative:

```text
npx vitest run --configLoader runner tests/unit/tools/agent-conformance.SIMULATED.test.ts tests/unit/tools/ai-dm-arena.test.ts tests/unit/tools/ai-dm-board-delivery.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/ai-dm-rerun-packet.test.ts tests/unit/tools/d569-blind-experiment.test.ts tests/unit/tools/d569-v5.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts tests/unit/vtt/agent-adapters.SIMULATED.test.ts tests/unit/vtt/agent-session-lifecycle.test.ts tests/unit/vtt/blind-model-ingress.test.ts tests/unit/vtt/engine-dispatch-evidence.test.ts tests/unit/vtt/turn-context-delivery.test.ts tests/unit/vtt/turn-exhaustion-coordinator.test.ts tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/engine-mcp-boundary.test.ts
```

Result:

```text
Test Files  1 failed | 16 passed (17)
Tests       1 failed | 448 passed (449)
Duration    558.15s
exit 1
```

Sole failure:

```text
engine-mcp-server.test.ts
“bounds one-to-three blind attempts under one absolute live deadline and never stages a fallback”
Test timed out in 5000ms; observed 5099ms
```

It is not D544-named, so no serial rerun was performed. A fixture-hoisting experiment still reached 6,980 ms under parallel load and was stopped and reverted byte-for-byte; it is absent from the final diff.

Hashes:

```text
src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

.tmp-plans/2026-09-09-d569-v5-runbook-v2.md
fb228c912ffbaafb3a082eb6a08650abffe36fe23adc929a2071b40da704a328
```

No pins were regenerated, no tests deleted or weakened, and no timeout was raised.

BLOCKED: required cumulative has one non-D544 5-second-wall timeout, and the authorized serial-rerun exception does not apply.
diff --git a/src/vtt/agent-adapters/codex.ts b/src/vtt/agent-adapters/codex.ts
index 8b2ad5ab96597571ecda76179f48c0ba35e6e918..4334fdc386d78cb5fc1593001baf2e8ad2c5bff5
--- a/src/vtt/agent-adapters/codex.ts
+++ b/src/vtt/agent-adapters/codex.ts
@@ -15,7 +15,7 @@
   decodeEngineReadinessRecord,
   type EngineObservedEvent,
   type EngineReadinessRecord,
-} from '../engine-dispatch-evidence';
+} from './engine-catalog-evidence';
 import {
   AgentAdapterError,
   agentProcessEvidence,
diff --git a/src/vtt/agent-adapters/engine-catalog-evidence.ts b/src/vtt/agent-adapters/engine-catalog-evidence.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ae0cb1df568079c18334cc676828915af9c624b3
--- /dev/null
+++ b/src/vtt/agent-adapters/engine-catalog-evidence.ts
@@ -0,0 +1,136 @@
+import {
+  engineDispatchId,
+  type EngineCatalogEvidence,
+  type EngineDispatchId,
+  type EngineDispatchPhase,
+} from '../agent-session';
+
+export interface EngineReadinessRecord {
+  readonly version: 1;
+  readonly dispatchId: EngineDispatchId;
+  readonly phase: EngineDispatchPhase;
+  readonly profile: 'dm' | 'blind';
+  readonly requestId: string;
+  readonly event: 'tools_list_response_generated' | 'tools_list_stream_write_completed';
+  readonly generatedAtUnixMs: number;
+  readonly writeCompletedAtUnixMs: number | null;
+  readonly responseId: string;
+  readonly responseSha256: string;
+  readonly expectedToolNames: readonly string[];
+  readonly returnedToolNames: readonly string[];
+  readonly descriptorSha256: string | null;
+  readonly validation:
+    | { readonly status: 'valid' }
+    | { readonly status: 'invalid'; readonly violations: readonly string[] };
+}
+
+export interface EngineObservedEvent {
+  readonly invocationId: string | null;
+  readonly kind: string;
+  readonly server: string | null;
+  readonly toolName: string | null;
+  readonly observedAtUnixMs: number | null;
+}
+
+const RESOURCE_OPERATIONS = new Set([
+  'read_mcp_resource',
+  'list_mcp_resources',
+  'list_mcp_resource_templates',
+]);
+
+export function decodeEngineReadinessRecord(value: unknown): EngineReadinessRecord {
+  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
+    throw new TypeError('Engine readiness record must be an object.');
+  }
+  const record = value as Readonly<Record<string, unknown>>;
+  const phase = record['phase'];
+  const profile = record['profile'];
+  const event = record['event'];
+  const validation = record['validation'];
+  if (record['version'] !== 1 || typeof record['dispatchId'] !== 'string' ||
+    (phase !== 'primary' && phase !== 'correction' && phase !== 'adjustment' && phase !== 'speculative') ||
+    (profile !== 'dm' && profile !== 'blind') || typeof record['requestId'] !== 'string' ||
+    (event !== 'tools_list_response_generated' && event !== 'tools_list_stream_write_completed') ||
+    typeof record['generatedAtUnixMs'] !== 'number' ||
+    !(record['writeCompletedAtUnixMs'] === null || typeof record['writeCompletedAtUnixMs'] === 'number') ||
+    typeof record['responseId'] !== 'string' || typeof record['responseSha256'] !== 'string' ||
+    !Array.isArray(record['expectedToolNames']) || !record['expectedToolNames'].every((name) => typeof name === 'string') ||
+    !Array.isArray(record['returnedToolNames']) || !record['returnedToolNames'].every((name) => typeof name === 'string') ||
+    !(record['descriptorSha256'] === null || typeof record['descriptorSha256'] === 'string') ||
+    typeof validation !== 'object' || validation === null || Array.isArray(validation)) {
+    throw new TypeError('Engine readiness record is malformed.');
+  }
+  const validationRecord = validation as Readonly<Record<string, unknown>>;
+  if (!(validationRecord['status'] === 'valid' || validationRecord['status'] === 'invalid' &&
+    Array.isArray(validationRecord['violations']) &&
+    validationRecord['violations'].every((violation) => typeof violation === 'string'))) {
+    throw new TypeError('Engine readiness validation is malformed.');
+  }
+  return { ...record, dispatchId: engineDispatchId(record['dispatchId']) } as EngineReadinessRecord;
+}
+
+export function classifyEngineCatalogEvidence(input: {
+  readonly dispatchId: EngineDispatchId;
+  readonly expectedProfile?: EngineReadinessRecord['profile'];
+  readonly expectedPhase?: EngineDispatchPhase;
+  readonly expectedRequestId?: string;
+  readonly expectedToolNames: readonly string[];
+  readonly events: readonly EngineObservedEvent[];
+  readonly readiness: readonly EngineReadinessRecord[];
+  readonly completed: boolean;
+  readonly requiredStartupFailed: boolean;
+  readonly malformedReadiness?: boolean;
+  readonly corroboration?: readonly string[];
+}): EngineCatalogEvidence {
+  const expected = new Set(input.expectedToolNames);
+  const invocationIds = new Set<string>();
+  const resourceInvocationIds = new Set<string>();
+  let missingTimestamp = false;
+  let advertisedObserved = false;
+  for (const event of input.events) {
+    if (event.server === 'engine' && event.toolName !== null && expected.has(event.toolName)) {
+      advertisedObserved = true;
+      if (event.observedAtUnixMs === null) missingTimestamp = true;
+      if (event.invocationId !== null) invocationIds.add(event.invocationId);
+    }
+    if (event.toolName !== null && RESOURCE_OPERATIONS.has(event.toolName) && event.invocationId !== null) {
+      resourceInvocationIds.add(event.invocationId);
+    }
+  }
+  const correlated = input.readiness.filter((record) => record.dispatchId === input.dispatchId);
+  const matchesDispatchContract = (record: EngineReadinessRecord): boolean =>
+    (input.expectedProfile === undefined || record.profile === input.expectedProfile) &&
+    (input.expectedPhase === undefined || record.phase === input.expectedPhase) &&
+    (input.expectedRequestId === undefined || record.requestId === input.expectedRequestId);
+  const valid = correlated.some((record) => record.event === 'tools_list_stream_write_completed' &&
+    record.validation.status === 'valid' && matchesDispatchContract(record));
+  const invalid = input.malformedReadiness === true || correlated.some((record) =>
+    record.validation.status === 'invalid' || !matchesDispatchContract(record));
+  if ((valid || advertisedObserved) && input.requiredStartupFailed) {
+    return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'conflicting_success_and_failure' };
+  }
+  if (invalid) return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'invalid_catalog_response' };
+  if (invocationIds.size > 0) {
+    return {
+      status: 'ready', basis: 'advertised_tool_invoked', dispatchId: input.dispatchId,
+      advertisedInvocationCount: invocationIds.size, resourceOperationCount: resourceInvocationIds.size,
+    };
+  }
+  if (input.completed && valid) {
+    return {
+      status: 'ready', basis: 'required_cli_completed_with_valid_catalog', dispatchId: input.dispatchId,
+      advertisedInvocationCount: 0, resourceOperationCount: resourceInvocationIds.size,
+    };
+  }
+  if (input.requiredStartupFailed && !valid) {
+    return {
+      status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: input.dispatchId,
+      corroboration: input.corroboration ?? [],
+    };
+  }
+  if (missingTimestamp) return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'missing_live_timestamp' };
+  return {
+    status: 'inconclusive', dispatchId: input.dispatchId,
+    reason: correlated.length === 0 ? 'no_correlated_catalog' : 'timestamp_only',
+  };
+}
diff --git a/src/vtt/agent-session-lifecycle.ts b/src/vtt/agent-session-lifecycle.ts
index f3db9fb0189271380ab07747ba88244671faf624..4f5d78e42c1eab95025e03c4d126f33624407b86
--- a/src/vtt/agent-session-lifecycle.ts
+++ b/src/vtt/agent-session-lifecycle.ts
@@ -102,10 +102,6 @@
   return budget;
 }
 
-function requireAcceptedCompletion(deadline: AgentDispatchDeadline): void {
-  if (!deadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
-}
-
 export class AgentSessionLifecycle {
   constructor(
     private readonly journal: EncounterSessionJournal,
@@ -121,7 +117,7 @@
   async coldStart(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentColdStartOutcome> {
     const result = await this.#coldStart(invocation, deadline);
     if (result.exit !== 'completed') return { kind: 'unbound', turn: result };
-    requireAcceptedCompletion(deadline);
+    if (!deadline.acceptsCompletion()) return { kind: 'expired', turn: result };
     const binding = this.journal.startAgentSession({
       cli: this.adapter.kind,
       sessionId: result.resumeSessionId,
@@ -135,7 +131,7 @@
   async coldStartRound(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentColdStartOutcome> {
     const result = await this.#coldStart(invocation, deadline);
     if (result.exit !== 'completed') return { kind: 'unbound', turn: result };
-    requireAcceptedCompletion(deadline);
+    if (!deadline.acceptsCompletion()) return { kind: 'expired', turn: result };
     const binding = this.journal.startAgentSession({
       cli: this.adapter.kind,
       sessionId: result.resumeSessionId,
@@ -163,7 +159,6 @@
       bootstrap: invocation.bootstrap ?? { kind: 'cold_start' },
     });
     const result = await this.adapter.start(dispatch.invocation, deadline.signal);
-    if (result.exit === 'completed') requireAcceptedCompletion(deadline);
     return result;
   }
 
@@ -208,7 +203,7 @@
         'Agent resume',
       );
       if (result.exit !== 'completed') return result;
-      requireAcceptedCompletion(deadline);
+      if (!deadline.acceptsCompletion()) return result;
       this.#recordUsage(result, dispatch.invocation);
       return result;
     } catch (error) {
@@ -245,7 +240,7 @@
         });
         return bootstrapResult;
       }
-      requireAcceptedCompletion(deadline);
+      if (!deadline.acceptsCompletion()) return bootstrapResult;
       if (bootstrapResult.resumeSessionId === dispatched.sessionId) {
         throw new Error('Agent recovery cold start did not create a successor session.');
       }
@@ -284,7 +279,6 @@
       launcherToken: requireFullContextLauncher(invocation, 'escalation'),
     });
     const result = await this.adapter.start(dispatch.invocation, deadline.signal);
-    if (result.exit === 'completed') requireAcceptedCompletion(deadline);
     return result;
   }
 
@@ -313,7 +307,7 @@
     });
     const result = await this.adapter.start(dispatch.invocation, deadline.signal);
     if (result.exit !== 'completed') return result;
-    requireAcceptedCompletion(deadline);
+    if (!deadline.acceptsCompletion()) return result;
     if (result.resumeSessionId === persisted.sessionId) {
       throw new Error('Agent context rollover did not create a successor session.');
     }
diff --git a/src/vtt/agent-session.ts b/src/vtt/agent-session.ts
index d0398dcf2bd8cee571b653bd5e60914c439bff9a..393bd83b9c83932a0056381dfa5293304587dade
--- a/src/vtt/agent-session.ts
+++ b/src/vtt/agent-session.ts
@@ -259,6 +259,7 @@
 
 export type AgentColdStartOutcome =
   | { readonly kind: 'bound'; readonly binding: AgentSessionBinding; readonly turn: AgentTurnCompletedResult }
+  | { readonly kind: 'expired'; readonly turn: AgentTurnCompletedResult }
   | {
       readonly kind: 'unbound';
       readonly turn: AgentTurnCancelledResult | AgentTurnTimedOutResult | AgentTurnInfrastructureFailedResult;
diff --git a/src/vtt/engine-dispatch-evidence.ts b/src/vtt/engine-dispatch-evidence.ts
index 47213684b3112de0656283b6bc3dd974167c8a54..79b323483c3af0f510a26242f73fbf424374487c
--- a/src/vtt/engine-dispatch-evidence.ts
+++ b/src/vtt/engine-dispatch-evidence.ts
@@ -1,142 +1,14 @@
 import { canonicalJson } from '../commands/canonical-json';
 import { sha256 } from '../crypto/sha256';
-import {
-  engineDispatchId,
-  type EngineCatalogEvidence,
-  type EngineDispatchId,
-  type EngineDispatchPhase,
-} from './agent-session';
-
-export interface EngineReadinessRecord {
-  readonly version: 1;
-  readonly dispatchId: EngineDispatchId;
-  readonly phase: EngineDispatchPhase;
-  readonly profile: 'dm' | 'blind';
-  readonly requestId: string;
-  readonly event: 'tools_list_response_generated' | 'tools_list_stream_write_completed';
-  readonly generatedAtUnixMs: number;
-  readonly writeCompletedAtUnixMs: number | null;
-  readonly responseId: string;
-  readonly responseSha256: string;
-  readonly expectedToolNames: readonly string[];
-  readonly returnedToolNames: readonly string[];
-  readonly descriptorSha256: string | null;
-  readonly validation:
-    | { readonly status: 'valid' }
-    | { readonly status: 'invalid'; readonly violations: readonly string[] };
-}
-
-export interface EngineObservedEvent {
-  readonly invocationId: string | null;
-  readonly kind: string;
-  readonly server: string | null;
-  readonly toolName: string | null;
-  readonly observedAtUnixMs: number | null;
-}
-
-const RESOURCE_OPERATIONS = new Set([
-  'read_mcp_resource',
-  'list_mcp_resources',
-  'list_mcp_resource_templates',
-]);
+export {
+  classifyEngineCatalogEvidence,
+  decodeEngineReadinessRecord,
+} from './agent-adapters/engine-catalog-evidence';
+export type {
+  EngineObservedEvent,
+  EngineReadinessRecord,
+} from './agent-adapters/engine-catalog-evidence';
 
 export function descriptorSha256(descriptors: readonly unknown[]): string {
   return sha256(canonicalJson(descriptors));
-}
-
-export function decodeEngineReadinessRecord(value: unknown): EngineReadinessRecord {
-  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
-    throw new TypeError('Engine readiness record must be an object.');
-  }
-  const record = value as Readonly<Record<string, unknown>>;
-  const phase = record['phase'];
-  const profile = record['profile'];
-  const event = record['event'];
-  const validation = record['validation'];
-  if (record['version'] !== 1 || typeof record['dispatchId'] !== 'string' ||
-    (phase !== 'primary' && phase !== 'correction' && phase !== 'adjustment' && phase !== 'speculative') ||
-    (profile !== 'dm' && profile !== 'blind') || typeof record['requestId'] !== 'string' ||
-    (event !== 'tools_list_response_generated' && event !== 'tools_list_stream_write_completed') ||
-    typeof record['generatedAtUnixMs'] !== 'number' ||
-    !(record['writeCompletedAtUnixMs'] === null || typeof record['writeCompletedAtUnixMs'] === 'number') ||
-    typeof record['responseId'] !== 'string' || typeof record['responseSha256'] !== 'string' ||
-    !Array.isArray(record['expectedToolNames']) || !record['expectedToolNames'].every((name) => typeof name === 'string') ||
-    !Array.isArray(record['returnedToolNames']) || !record['returnedToolNames'].every((name) => typeof name === 'string') ||
-    !(record['descriptorSha256'] === null || typeof record['descriptorSha256'] === 'string') ||
-    typeof validation !== 'object' || validation === null || Array.isArray(validation)) {
-    throw new TypeError('Engine readiness record is malformed.');
-  }
-  const validationRecord = validation as Readonly<Record<string, unknown>>;
-  if (!(validationRecord['status'] === 'valid' || validationRecord['status'] === 'invalid' &&
-    Array.isArray(validationRecord['violations']) &&
-    validationRecord['violations'].every((violation) => typeof violation === 'string'))) {
-    throw new TypeError('Engine readiness validation is malformed.');
-  }
-  return { ...record, dispatchId: engineDispatchId(record['dispatchId']) } as EngineReadinessRecord;
-}
-
-export function classifyEngineCatalogEvidence(input: {
-  readonly dispatchId: EngineDispatchId;
-  readonly expectedProfile?: EngineReadinessRecord['profile'];
-  readonly expectedPhase?: EngineDispatchPhase;
-  readonly expectedRequestId?: string;
-  readonly expectedToolNames: readonly string[];
-  readonly events: readonly EngineObservedEvent[];
-  readonly readiness: readonly EngineReadinessRecord[];
-  readonly completed: boolean;
-  readonly requiredStartupFailed: boolean;
-  readonly malformedReadiness?: boolean;
-  readonly corroboration?: readonly string[];
-}): EngineCatalogEvidence {
-  const expected = new Set(input.expectedToolNames);
-  const invocationIds = new Set<string>();
-  const resourceInvocationIds = new Set<string>();
-  let missingTimestamp = false;
-  let advertisedObserved = false;
-  for (const event of input.events) {
-    if (event.server === 'engine' && event.toolName !== null && expected.has(event.toolName)) {
-      advertisedObserved = true;
-      if (event.observedAtUnixMs === null) missingTimestamp = true;
-      if (event.invocationId !== null) invocationIds.add(event.invocationId);
-    }
-    if (event.toolName !== null && RESOURCE_OPERATIONS.has(event.toolName) && event.invocationId !== null) {
-      resourceInvocationIds.add(event.invocationId);
-    }
-  }
-  const correlated = input.readiness.filter((record) => record.dispatchId === input.dispatchId);
-  const matchesDispatchContract = (record: EngineReadinessRecord): boolean =>
-    (input.expectedProfile === undefined || record.profile === input.expectedProfile) &&
-    (input.expectedPhase === undefined || record.phase === input.expectedPhase) &&
-    (input.expectedRequestId === undefined || record.requestId === input.expectedRequestId);
-  const valid = correlated.some((record) => record.event === 'tools_list_stream_write_completed' &&
-    record.validation.status === 'valid' && matchesDispatchContract(record));
-  const invalid = input.malformedReadiness === true || correlated.some((record) =>
-    record.validation.status === 'invalid' || !matchesDispatchContract(record));
-  if ((valid || advertisedObserved) && input.requiredStartupFailed) {
-    return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'conflicting_success_and_failure' };
-  }
-  if (invalid) return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'invalid_catalog_response' };
-  if (invocationIds.size > 0) {
-    return {
-      status: 'ready', basis: 'advertised_tool_invoked', dispatchId: input.dispatchId,
-      advertisedInvocationCount: invocationIds.size, resourceOperationCount: resourceInvocationIds.size,
-    };
-  }
-  if (input.completed && valid) {
-    return {
-      status: 'ready', basis: 'required_cli_completed_with_valid_catalog', dispatchId: input.dispatchId,
-      advertisedInvocationCount: 0, resourceOperationCount: resourceInvocationIds.size,
-    };
-  }
-  if (input.requiredStartupFailed && !valid) {
-    return {
-      status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: input.dispatchId,
-      corroboration: input.corroboration ?? [],
-    };
-  }
-  if (missingTimestamp) return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'missing_live_timestamp' };
-  return {
-    status: 'inconclusive', dispatchId: input.dispatchId,
-    reason: correlated.length === 0 ? 'no_correlated_catalog' : 'timestamp_only',
-  };
 }
diff --git a/src/vtt/engine-round-session.ts b/src/vtt/engine-round-session.ts
index c854b28c01e4cdcf1b053e5cfd270331fa0089da..9beb732e494535612e96df586b86e77fa060d410
--- a/src/vtt/engine-round-session.ts
+++ b/src/vtt/engine-round-session.ts
@@ -583,20 +583,16 @@
           appliedBranch = 'fallback';
           refusalCodes = [primary.code];
         } else {
-<<<<<<< HEAD
           if (entry.strictNoFallback === true) {
             throw new Error(
               `Blind proposal became unavailable for ${entry.proposal.actorId}: ${primary.code}.`,
             );
           }
-          const dodgeOption = availableEngineActorOptions(state, entry.proposal.actorId).find((option) =>
-=======
           const dodgeOption = availableEngineActorOptions(
             state,
             entry.proposal.actorId,
             this.offerEnvironment.queries,
           ).find((option) =>
->>>>>>> main
             option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
           if (dodgeOption === null) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
           const dodge = resolveEngineActorOption(state, dodgeOption, this.offerEnvironment.queries);
diff --git a/src/vtt/mcp/entrypoint.ts b/src/vtt/mcp/entrypoint.ts
index a533e90ac1622895ad0977f3973e407668d8b8db..2d7dc17267b23809f21c1770f05c0c2c2dfde25b
--- a/src/vtt/mcp/entrypoint.ts
+++ b/src/vtt/mcp/entrypoint.ts
@@ -437,7 +437,6 @@
     readonly offerEnvironment?: EngineOptionEnvironment;
   } = {},
 ): EngineMcpRuntime {
-<<<<<<< HEAD
   if (options.boardImageContent !== undefined && options.boardImageContents !== undefined) {
     throw new TypeError('Use either boardImageContent or boardImageContents, not both.');
   }
@@ -451,9 +450,7 @@
     options.turnContextMaximumBytes !== BLIND_TURN_CONTEXT_MAX_BYTES) {
     throw new RangeError(`Blind context base cap must be ${String(BLIND_TURN_CONTEXT_MAX_BYTES)} bytes.`);
   }
-=======
   const offerEnvironment = options.offerEnvironment ?? createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
->>>>>>> main
   const candidates = state.combatants
     .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
     .map((candidate) => candidate.profile.id)
diff --git a/src/vtt/turn-exhaustion-coordinator.ts b/src/vtt/turn-exhaustion-coordinator.ts
index 2f64ca86e7e6929082ea6e03228a494f720eeae6..a041eba5b071eb52ce95247cc84e5dc599a6c6ac
--- a/src/vtt/turn-exhaustion-coordinator.ts
+++ b/src/vtt/turn-exhaustion-coordinator.ts
@@ -158,7 +158,7 @@
   | { readonly kind: 'awaiting_dm_adjudication'; readonly actorId: CombatantId }
   | {
       readonly kind: 'refused';
-      readonly reason: 'host_authorization_failed' | 'no_proposal' | 'resolver_rejected' | 'correction_cancelled' | 'correction_timeout';
+      readonly reason: 'host_authorization_failed' | 'round_deadline_expired' | 'no_proposal' | 'resolver_rejected' | 'correction_cancelled' | 'correction_timeout';
       readonly attemptConsumed: true;
     }
   | { readonly kind: 'infrastructure_failed'; readonly component: 'engine_mcp_startup' };
@@ -257,9 +257,10 @@
       if (!exactProposalActors(proposal, actors, 'initial')) {
         throw new RangeError('Initial round proposal actors are malformed.');
       }
-      const authorization = input.deadline?.acceptsCompletion() !== false
-        ? await input.host.authorize(proposal)
-        : 'invalidated';
+      if (input.deadline?.acceptsCompletion() === false) {
+        return { kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true };
+      }
+      const authorization = await input.host.authorize(proposal);
       if (authorization === 'authorized') {
         for (const resolution of proposal.resolutions) {
           if (resolution.selectedBranch !== 'fallback') continue;
diff --git a/tests/unit/tools/ai-dm-board-delivery.test.ts b/tests/unit/tools/ai-dm-board-delivery.test.ts
index 82e1ed127b0c80524eb75dd1389bf794168cf1f2..5149e4809524a14db56eac9d1ab80ae360b52680
--- a/tests/unit/tools/ai-dm-board-delivery.test.ts
+++ b/tests/unit/tools/ai-dm-board-delivery.test.ts
@@ -543,10 +543,7 @@
     }
 
     const raw = offResult[0]?.rawTurnContext;
-<<<<<<< HEAD
     if (raw === undefined || raw === null) throw new TypeError('Semantic-board-off row omitted rawTurnContext.');
-=======
-    if (raw === undefined) throw new TypeError('Semantic-board-off row omitted rawTurnContext.');
     const row = offResult[0];
     if (row === undefined) throw new TypeError('Semantic-board-off run omitted its row.');
     const rawContext = record(JSON.parse(raw) as unknown, 'semantic-board-off raw context');
@@ -555,7 +552,6 @@
       state_handle: `engine-state:${row.stateBinding.capsule.digest}`,
       expected_revision: row.stateBinding.capsule.revision,
     });
->>>>>>> main
     expect(Buffer.byteLength(raw)).toBe(31_995);
     expect(createHash('sha256').update(raw).digest('hex')).toBe(E1C_RAW_CONTEXT_SHA256);
   });
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index f2f0c8f00baf0a43d8fff529c7f645fa7f5da977..267d9aa4105eaa17141165a278391f0e4044ba56
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -175,6 +175,35 @@
   return value as Readonly<Record<string, unknown>>;
 }
 
+function d569BoardSnapshotService(directory: string): ConversationBoardSnapshotService {
+  return {
+    outputDirectory: directory,
+    capture: async (input) => {
+      const png = Buffer.alloc(24);
+      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
+      png.writeUInt32BE(1, 16);
+      png.writeUInt32BE(1, 20);
+      const digest = createHash('sha256').update(png).digest('hex');
+      const relativePath = `board-images/${digest}.png` as const;
+      mkdirSync(join(directory, 'board-images'), { recursive: true });
+      writeFileSync(join(directory, relativePath), png);
+      const html = Buffer.from('<!doctype html><main>D569 evidence</main>\n');
+      const htmlDigest = createHash('sha256').update(html).digest('hex');
+      const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
+      mkdirSync(join(directory, 'board-html', htmlDigest), { recursive: true });
+      writeFileSync(join(directory, htmlRelativePath), html);
+      return {
+        version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
+        relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
+        capturedAtUnixMs: 1, captureMs: 0, source: { ...input.source },
+        chromiumVersion: 'SIMULATED Chromium',
+        html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
+      };
+    },
+    close: async () => undefined,
+  };
+}
+
 type IncompleteCatalogExit = 'timed_out' | 'cancelled' | 'infrastructure_failed';
 type IncompleteCatalogEvidenceFactory = (
   dispatchId: EngineDispatchId,
@@ -250,6 +279,7 @@
   exit: IncompleteCatalogExit,
   evidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>['reason'] |
     IncompleteCatalogEvidenceFactory,
+  expireRoundDeadline = false,
 ): Promise<{
   readonly row: Readonly<Record<string, unknown>>;
   readonly artifact: Readonly<Record<string, unknown>>;
@@ -258,6 +288,7 @@
   const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-integrity-`));
   const outPath = join(directory, 'rows.jsonl');
   let launcherPath: string | null = null;
+  let policyMs = 0;
   let stopped: unknown;
   try {
     await runConversation(parseConversationArgs([
@@ -265,6 +296,10 @@
       '--dm-mode', 'advice', '--board-image', 'off', '--dry-run',
     ]), {
       adapter: incompleteCatalogAdapter(exit, evidence, (path) => { launcherPath = path; }),
+      policyNow: () => policyMs,
+      onPrimaryResultObservedForTest: () => {
+        if (expireRoundDeadline) policyMs = 180_000;
+      },
     });
   } catch (error) {
     stopped = error;
@@ -904,12 +939,47 @@
     });
   });
 
+  it('persists primary D569 timeout evidence before applying the expired round deadline', async () => {
+    const directory = mkdtempSync(join(tmpdir(), 'd569-primary-expired-evidence-'));
+    const outPath = join(directory, 'rows.jsonl');
+    let policyMs = 0;
+    let observedExit: AgentTurnResult['exit'] | null = null;
+    const result = await runConversation(parseConversationArgs([
+      '--rooms', '1', '--rounds', '1', '--out', outPath,
+      '--dm-mode', 'advice', '--dry-run',
+    ]), {
+      adapter: incompleteCatalogAdapter('timed_out', 'no_correlated_catalog'),
+      boardSnapshotService: d569BoardSnapshotService(directory),
+      policyNow: () => policyMs,
+      onPrimaryResultObservedForTest: (turn) => {
+        observedExit = turn.exit;
+        policyMs = 180_000;
+      },
+    });
+
+    expect(observedExit).toBe('timed_out');
+    expect(result.rows[0]).toMatchObject({
+      rowContractVersion: 'arena-row-v3',
+      outcome: 'refused', fallbackReason: 'timeout', roundWallTimedOut: true,
+      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
+      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      authorizedPlan: null,
+    });
+    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toMatchObject({
+      rowContractVersion: 'arena-row-v3',
+      outcome: 'refused', fallbackReason: 'timeout',
+      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
+      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+    });
+  });
+
   it.each(['timed_out', 'cancelled'] as const)(
     'persists forensic evidence and STOPs on a %s dispatch with a contradictory catalog',
     async (exit) => {
       const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
         exit,
         'conflicting_success_and_failure',
+        true,
       );
       expect(row).toMatchObject({
         rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
@@ -944,6 +1014,7 @@
       const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
         exit,
         (dispatchId) => classifiedInvalidCatalog(dispatchId, source),
+        true,
       );
       expect(row).toMatchObject({
         rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
@@ -3593,6 +3664,8 @@
   it('aborts the cell when speculation recalculation infrastructure fails after staging output', async () => {
     const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-recalc-infrastructure-'));
     let mutated = false;
+    let policyMs = 0;
+    let observedRecalculationExit: AgentTurnResult['exit'] | null = null;
     const result = await runConversation(parseConversationArgs([
       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
       '--combat-model', 'initiative_segments_v1', '--dry-run',
@@ -3612,7 +3685,13 @@
       failSpeculationRecalculation: true,
       simulatedInProcessDispatchDelayMs: 10,
       forceSpeculationRecalculationForTest: true,
+      policyNow: () => policyMs,
+      onSpeculationRecalculationResultObservedForTest: (turn) => {
+        observedRecalculationExit = turn.exit;
+        policyMs = 180_000;
+      },
     });
+    expect(observedRecalculationExit).toBe('infrastructure_failed');
     expect(result.rows[0]).toMatchObject({
       outcome: 'infrastructure_failed',
       failingDispatch: {
@@ -3629,6 +3708,8 @@
     ['exception-cleanup', { failAfterSpeculationStartForTest: true }],
   ] as const)('retains diagnosed speculative infrastructure at the %s join', async (_join, seam) => {
     const directory = mkdtempSync(join(tmpdir(), `d569-speculation-${_join}-join-`));
+    let policyMs = 0;
+    let observedSpeculationExit: AgentTurnResult['exit'] | null = null;
     const result = await runConversation(parseConversationArgs([
       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
       '--combat-model', 'initiative_segments_v1', '--dry-run',
@@ -3636,8 +3717,14 @@
       roomStates: [await alternatingInitiativeRoom()],
       failSpeculationInfrastructure: true,
       simulatedInProcessDispatchDelayMs: 1,
+      policyNow: () => policyMs,
+      onSpeculationResultObservedForTest: (turn) => {
+        observedSpeculationExit = turn.exit;
+        policyMs = 180_000;
+      },
       ...seam,
     });
+    expect(observedSpeculationExit).toBe('infrastructure_failed');
     expect(result.rows[0]).toMatchObject({
       outcome: 'infrastructure_failed',
       failingDispatch: {
@@ -3893,6 +3980,40 @@
     expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
   });
 
+  it('records adjustment timeout evidence before applying the expired round deadline', async () => {
+    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-expired-evidence-'));
+    let policyMs = 0;
+    let observedAdjustmentExit: AgentTurnResult['exit'] | null = null;
+    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
+      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
+      '--combat-model', 'initiative_segments_v1', '--dry-run',
+      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
+    ]), {
+      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
+      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
+      stagedAdjustmentTimeout: ['room-1-round-1-pc-turn-1'],
+      simulatedInProcessDispatchDelayMs: 1,
+      speculationDispatchDelayMs: 1,
+      policyNow: () => policyMs,
+      onAdjustmentResultObservedForTest: (turn) => {
+        observedAdjustmentExit = turn.exit;
+        policyMs = 180_000;
+      },
+    });
+    const adjustment = result.rows[0]?.adjustments?.[0];
+    if (adjustment === undefined || adjustment.skipped !== null) {
+      throw new Error('Expired adjustment timeout was not recorded.');
+    }
+    expect(observedAdjustmentExit).toBe('timed_out');
+    expect(adjustment).toMatchObject({
+      outcome: 'service_null', proposalId: null, changedActors: [], flapRetries: 0,
+    });
+    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
+    expect(result.rows[0]).toMatchObject({
+      outcome: 'refused', roundWallTimedOut: true, monsterSegments: [],
+    });
+  });
+
   it('ignores an adjustment correction proposal staged before timeout and retains the authorized baseline', async () => {
     const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-correction-staged-timeout-'));
     const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
diff --git a/tests/unit/vtt/agent-session-lifecycle.test.ts b/tests/unit/vtt/agent-session-lifecycle.test.ts
index bff6c2a8e79d25a48c7134c0fd2282f3c2fbda71..fea49597f047604e84398543c37480f7ba93ec7a
--- a/tests/unit/vtt/agent-session-lifecycle.test.ts
+++ b/tests/unit/vtt/agent-session-lifecycle.test.ts
@@ -193,6 +193,43 @@
     },
   );
 
+  it.each(['coldStart', 'coldStartRound'] as const)(
+    'returns late completed evidence from %s without binding it',
+    async (method) => {
+      let acceptsCompletion = true;
+      const result: AgentTurnResult = {
+        resumeSessionId: agentSessionId('agent-session:late-completed-evidence'),
+        sessionId: 'rollout:late-completed-evidence',
+        finalText: 'late completed evidence',
+        usage: null,
+        exit: 'completed',
+        ...COMPLETED_EVIDENCE,
+      };
+      const adapter: AgentSessionAdapter = {
+        kind: 'codex',
+        probe: async () => ({ present: true, version: 'SIMULATED' }),
+        start: async () => {
+          acceptsCompletion = false;
+          return result;
+        },
+        resume: async () => { throw new Error('Late cold-start fixture unexpectedly resumed.'); },
+        classifyFailure: () => 'unknown',
+      };
+      const { lifecycle, journal, sessionId, store } = setup(adapter);
+      const deadline: AgentDispatchDeadline = {
+        signal: new AbortController().signal,
+        dispatch: (candidate) => ({ kind: 'open', timeoutMs: 100, invocation: candidate }),
+        acceptsCompletion: () => acceptsCompletion,
+      };
+
+      await expect(lifecycle[method](invocation(sessionId, 'late completion'), deadline))
+        .resolves.toEqual({ kind: 'expired', turn: result });
+      expect(journal.agentSession()).toBeNull();
+      expect(store.revisions(sessionId).map((revision) => revision.transition.kind))
+        .toEqual(['session_started']);
+    },
+  );
+
   it('fractional remainder floors and below one does not spawn', async () => {
     const prove = async (factory: DeadlineFactory): Promise<void> => {
       let now = 98.2;
diff --git a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
index 61746bd13ed270c0f9920938e4de92a105345713..03a203b9d1a97d6bfe1858d6273e31f9324a18d5
--- a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+++ b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
@@ -235,7 +235,7 @@
     expect(fallbackApplications).toBe(0);
   });
 
-  it('late completion cannot reach acceptance', async () => {
+  it('attributes deadline expiry without invoking host authorization', async () => {
     let acceptsCompletion = false;
     const originalHash = sha256(JSON.stringify({ acceptsCompletion }));
     const prove = async (): Promise<void> => {
@@ -253,6 +253,7 @@
         correction: runtime(f, new SIMULATEDAgentSessionAdapter({ startIds: [] }), [], { value: 0 }),
         escalation: null,
         deadline: lateDeadline,
+        authorizationFailurePolicy: { kind: 'refuse_blind' },
         host: {
           ...host(),
           authorize: async () => {
@@ -262,7 +263,9 @@
         },
       });
       expect(authorizations).toBe(0);
-      expect(outcome).toEqual({ kind: 'auto_resolved', actorIds: [f.actor] });
+      expect(outcome).toEqual({
+        kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true,
+      });
     };
 
     try {
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index ea6b4c64bbe282f407534fd489c98c510aa84e79..ea793d3d5843cf98914b74f69811c6ee31a4b38c
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -549,6 +549,7 @@
   | 'auto_submit_blocked'
   | 'timeout'
   | 'host_authorization_failed'
+  | 'round_deadline_expired'
   | 'resolver_rejected'
   | 'correction_cancelled'
   | 'correction_timeout'
@@ -957,6 +958,14 @@
   ) => ConversationPlannerAttribution;
   /** Test-only boundary immediately after speculative branch validation. */
   readonly onSpeculationAdoptionValidated?: () => void;
+  /** Test-only boundary after the primary adapter result is observed. */
+  readonly onPrimaryResultObservedForTest?: (turn: AgentTurnResult) => void;
+  /** Test-only boundary after the adjustment adapter result is observed. */
+  readonly onAdjustmentResultObservedForTest?: (turn: AgentTurnResult) => void;
+  /** Test-only boundary after the speculative adapter result is observed. */
+  readonly onSpeculationResultObservedForTest?: (turn: AgentTurnResult) => void;
+  /** Test-only boundary after the recalculation adapter result is observed. */
+  readonly onSpeculationRecalculationResultObservedForTest?: (turn: AgentTurnResult) => void;
   /** Test-only boundary after speculative recalculation mechanics and actor-set validation. */
   readonly onSpeculationRecalculationValidated?: (
     entries: readonly SegmentMonsterPlanEntry[],
@@ -4720,6 +4729,7 @@
               dispatch.invocation,
               AbortSignal.any([roundDeadline.signal, controller.signal]),
             );
+            options.onSpeculationResultObservedForTest?.(turn);
             const planningWallMs = clock() - dispatchStarted;
             const spools = dispatchSpools(launcher, turn);
             enforceCompletedDispatchIntegrity({
@@ -4736,11 +4746,11 @@
               plan: acceptedInTime && turn.exit === 'completed'
                 ? localPlan ?? takeSpeculativePlan(spools.proposal)
                 : null,
-              turn: acceptedInTime ? turn : null,
+              turn,
               planningWallMs,
               timedOut: !acceptedInTime || turn.exit === 'timed_out' || controller.signal.aborted || planningWallMs > budgetMs,
-              error: acceptedInTime && turn.exit === 'infrastructure_failed' ? turn.failureReason : null,
-              failingDispatch: acceptedInTime && turn.exit === 'infrastructure_failed'
+              error: turn.exit === 'infrastructure_failed' ? turn.failureReason : null,
+              failingDispatch: turn.exit === 'infrastructure_failed'
                 ? classifyFailedDispatch({
                     phase: 'speculative', turn, contextSpoolPath: spools.context,
                     maximumBytes: config.turnContextMaximumBytes,
@@ -4979,7 +4989,7 @@
             adjustmentInvocation,
             roundDeadline,
           );
-          if (!roundDeadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
+          options.onAdjustmentResultObservedForTest?.(turn);
           adjustmentSessionId = turn.sessionId;
           captureCallUsage(turn, 'adjustment');
           decisionAttempts += 1;
@@ -5009,6 +5019,7 @@
             }
             break;
           }
+          if (!roundDeadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
           adjustmentTurnContext = takeTurnContext(
             adjustmentSpools.context,
             config.turnContextMaximumBytes,
@@ -5508,7 +5519,7 @@
               } else {
                 turn = await lifecycle.resumeRound(primaryInvocation, roundDeadline);
               }
-              if (!roundDeadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
+              options.onPrimaryResultObservedForTest?.(turn);
             } catch (error) {
               if (!agentDispatchWasCancelled(error)) throw error;
               primaryDispatchTimedOut = true;
@@ -5603,6 +5614,7 @@
               }
               break;
             }
+            if (!roundDeadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
             if (initialDecisionCatalog === null) {
               rowTurnContext = correlatedContext ?? rowTurnContext;
               proposed = localInitialProposal ?? takeRoundProposal(activeInitialSpools.proposal);
@@ -6793,9 +6805,7 @@
                         recalculationDispatch.invocation,
                         roundDeadline.signal,
                       );
-                      if (!roundDeadline.acceptsCompletion()) {
-                        throw new AgentDispatchDeadlineExceededError();
-                      }
+                      options.onSpeculationRecalculationResultObservedForTest?.(recalculationTurn);
                       captureCallUsage(recalculationTurn, 'speculation_recalculation');
                       const recalculationSpools = dispatchSpools(recalculationLauncher, recalculationTurn);
                       enforceCompletedDispatchIntegrity({
@@ -6818,6 +6828,9 @@
                         });
                         throw new CellInfrastructureAbort('Speculation recalculation engine MCP infrastructure failed.');
                       }
+                      if (!roundDeadline.acceptsCompletion()) {
+                        throw new AgentDispatchDeadlineExceededError();
+                      }
                       const proposal = recalculationTurn.exit === 'completed'
                         ? localRecalculationProposal ?? takeRoundProposal(recalculationSpools.proposal)
                         : null;
