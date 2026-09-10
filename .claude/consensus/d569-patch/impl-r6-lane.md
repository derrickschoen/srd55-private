Implemented F30 and F31 across six files.

### F30 — invalid catalogs remain integrity failures

- Added an exhaustive, no-default reason classifier in [turn-context-delivery.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:67).
  - Missing observations: `no_correlated_catalog`, `missing_live_timestamp`, `timestamp_only`.
  - Integrity failures: `invalid_catalog_response`, `conflicting_success_and_failure`.
- Invalid or contradictory evidence now produces `indeterminate` before timeout/cancellation classification at [turn-context-delivery.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:104).
- Reason provenance remains explicit in [engine-dispatch-evidence.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-dispatch-evidence.ts:106):
  - Contract/malformed/wrong-profile → `invalid_catalog_response` at lines 113–118.
  - Structured success plus startup failure → `conflicting_success_and_failure` at lines 115–116.
  - Missing invocation timestamp → `missing_live_timestamp` at line 137.
  - No correlated record or timestamp-only record → lines 138–140.
- Existing production consumers inherit the corrected shared predicate:
  - Runner guards: `ai-dm-conversation.ts:3446`, `:5403`
  - Packet decoder: `ai-dm-rerun-packet.ts:405`
  - Registered validator: `validate-first-arm.ts:123`
- Added runner persist-before-STOP coverage for timeout/cancellation × malformed/wrong-profile at [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:769).
- Added all-three-consumer rejection coverage at [d569-v5.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:691).
- Added exhaustive reason and delivery classification coverage at [turn-context-delivery.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-context-delivery.test.ts:45).

### F31 — partial integrity evidence is independently decisive

- Added partial-evidence validation in [turn-context-delivery.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:95).
- Observed-row validation now checks either optional field independently at [d569-blind-experiment.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-blind-experiment.ts:785).
- Direct regressions cover:
  - Delivery-only `indeterminate`: rejected.
  - Catalog-only conflicting or invalid evidence: rejected.
  - Neither field on a historical row: accepted.
  
  See [d569-blind-experiment.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-blind-experiment.test.ts:682).
- Registered validation rejects the same missing-companion v3 shapes at [d569-v5.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:712). Registered validation continues into `validateD569ObservedRows` at `validate-first-arm.ts:414`.

### Verification

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Prohibited-pattern audit — exit 0, zero matches.
- Deleted-test audit — exit 0, zero matches.
- Direct consumers:
  - `npx vitest run --configLoader runner tests/unit/vtt/turn-context-delivery.test.ts tests/unit/tools/ai-dm-rerun-packet.test.ts tests/unit/tools/d569-blind-experiment.test.ts`
  - Exit 0: 3 files, 79/79 tests.
- D569-v5:
  - `npx vitest run --configLoader runner tests/unit/tools/d569-v5.test.ts`
  - Exit 0: 1 file, 26/26 tests.
- Exact 17-file cumulative command from the specification:
  - Exit 1: 16 files passed, 1 load-affected file; 407/408 tests passed.
  - Sole failure: `engine-mcp-server.test.ts` absolute-live-deadline test timed out at 6.373s against Vitest’s 5s wall.
  - Required one serial rerun:
    - `npx vitest run --configLoader runner --no-file-parallelism tests/unit/tools/engine-mcp-server.test.ts`
    - Exit 0: 14/14 tests.
- Separate arena confirmation: exit 0, 52/52 tests.
- Full logs are under `.tmp/d569-r6-*.log`.

Integrity pins remain unchanged:

- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Runbook v2: `fb228c912ffbaafb3a082eb6a08650abffe36fe23adc929a2071b40da704a328`
- Independent prepatch bytes: `000b375ccca5cbef3a1e0044e05e305c3e57c2fd315233769dce9869c34f7d97`

No pins or runbook content were regenerated or changed.

D569-PATCH R6 DONE
diff --git a/src/vtt/turn-context-delivery.ts b/src/vtt/turn-context-delivery.ts
index aedbaf7379f9a3935bdb93244075ae06f9823ee6..1f65098d07b714cae87a5e23a6df303e1c0fb57f
--- a/src/vtt/turn-context-delivery.ts
+++ b/src/vtt/turn-context-delivery.ts
@@ -54,13 +54,30 @@
         | 'timestamp_only';
     };
 
+export type EngineCatalogInconclusiveReason = Extract<
+  EngineCatalogIntegrityView,
+  { readonly status: 'inconclusive' }
+>['reason'];
+
 export type TurnContextDeliveryIntegrityView =
   | { readonly status: 'delivered' }
   | { readonly status: 'not_requested'; readonly reason: 'catalog_ready_model_did_not_fetch' | 'dispatch_cancelled' }
   | { readonly status: 'timeout_before_delivery' | 'infrastructure_absent' | 'indeterminate' };
 
-export function engineCatalogHasContradiction(evidence: EngineCatalogIntegrityView): boolean {
-  return evidence.status === 'inconclusive' && evidence.reason === 'conflicting_success_and_failure';
+export function engineCatalogReasonIsMissingObservation(reason: EngineCatalogInconclusiveReason): boolean {
+  switch (reason) {
+    case 'no_correlated_catalog':
+    case 'missing_live_timestamp':
+    case 'timestamp_only':
+      return true;
+    case 'invalid_catalog_response':
+    case 'conflicting_success_and_failure':
+      return false;
+  }
+}
+
+export function engineCatalogHasIntegrityFailure(evidence: EngineCatalogIntegrityView): boolean {
+  return evidence.status === 'inconclusive' && !engineCatalogReasonIsMissingObservation(evidence.reason);
 }
 
 /** True when D569 evidence must be persisted and stopped rather than packetized or scored. */
@@ -68,13 +85,22 @@
   catalog: EngineCatalogIntegrityView,
   delivery: TurnContextDeliveryIntegrityView,
 ): boolean {
-  if (delivery.status === 'indeterminate' || engineCatalogHasContradiction(catalog)) return true;
+  if (delivery.status === 'indeterminate' || engineCatalogHasIntegrityFailure(catalog)) return true;
   if (delivery.status === 'delivered') return catalog.status !== 'ready';
   if (catalog.status !== 'inconclusive') return false;
   return delivery.status !== 'timeout_before_delivery' &&
     !(delivery.status === 'not_requested' && delivery.reason === 'dispatch_cancelled');
 }
 
+export function d569PartialEvidenceHasIntegritySignal(
+  catalog: EngineCatalogIntegrityView | undefined,
+  delivery: TurnContextDeliveryIntegrityView | undefined,
+): boolean {
+  if (delivery?.status === 'indeterminate') return true;
+  if (catalog !== undefined && engineCatalogHasIntegrityFailure(catalog)) return true;
+  return catalog !== undefined && delivery !== undefined && d569DeliveryHasIntegritySignal(catalog, delivery);
+}
+
 export function classifyTurnContextDelivery(input: {
   readonly turn: AgentTurnResult;
   readonly catalogEvidence: EngineCatalogEvidence;
@@ -84,7 +110,7 @@
   if (input.delivered !== null) {
     return { status: 'delivered', dispatchId, ...input.delivered };
   }
-  if (engineCatalogHasContradiction(input.catalogEvidence)) {
+  if (engineCatalogHasIntegrityFailure(input.catalogEvidence)) {
     return {
       status: 'indeterminate', dispatchId,
       reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8df4cfebcf3a3562c565ce500bbfe89e78e9d6bd..e6ebca0b8cfed9ece8a57a7f2029215148cdda16
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -15,6 +15,8 @@
   type AgentSessionAdapter,
   type AgentSessionBinding,
   type AgentTurnResult,
+  type EngineCatalogEvidence,
+  type EngineDispatchId,
 } from '../../../src/vtt/agent-session';
 import { AgentSessionLifecycle } from '../../../src/vtt/agent-session-lifecycle';
 import {
@@ -79,6 +81,10 @@
 import { sha256 } from '../../../src/crypto/sha256';
 import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
 import { traceCombatantLine } from '../../../src/combat/cover';
+import {
+  classifyEngineCatalogEvidence,
+  type EngineReadinessRecord,
+} from '../../../src/vtt/engine-dispatch-evidence';
 
 const kbInputs = declareTestInputs({ fixtures: [
   'tests/fixtures/ai-dm-kb/ai-dm-core.md',
@@ -131,10 +137,14 @@
 }
 
 type IncompleteCatalogExit = 'timed_out' | 'cancelled' | 'infrastructure_failed';
+type IncompleteCatalogEvidenceFactory = (
+  dispatchId: EngineDispatchId,
+) => Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
 
 function incompleteCatalogAdapter(
   exit: IncompleteCatalogExit,
-  reason: Extract<NonNullable<AgentTurnResult['engineCatalogEvidence']>, { status: 'inconclusive' }>['reason'],
+  evidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>['reason'] |
+    IncompleteCatalogEvidenceFactory,
   observeLauncher?: (path: string) => void,
 ): AgentSessionAdapter {
   const dispatch = async (invocation: AgentInvocation): Promise<AgentTurnResult> => {
@@ -153,7 +163,9 @@
         status: 'partial' as const, decodedEventCount: 0, finalTextFragment: `partial ${exit} output`,
         observedUsage: null, stagedInvocationIds: [],
       },
-      engineCatalogEvidence: { status: 'inconclusive' as const, dispatchId: invocation.engineDispatchId, reason },
+      engineCatalogEvidence: typeof evidence === 'function'
+        ? evidence(invocation.engineDispatchId)
+        : { status: 'inconclusive' as const, dispatchId: invocation.engineDispatchId, reason: evidence },
     };
     switch (exit) {
       case 'timed_out': return { ...common, exit, timeoutMs: 180_000 };
@@ -172,9 +184,33 @@
   };
 }
 
+function classifiedInvalidCatalog(
+  dispatchId: EngineDispatchId,
+  source: 'malformed' | 'wrong_profile',
+): Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }> {
+  const readiness: readonly EngineReadinessRecord[] = source === 'wrong_profile' ? [{
+    version: 1, dispatchId, phase: 'primary', profile: 'blind', requestId: 'request:wrong-profile',
+    event: 'tools_list_stream_write_completed', generatedAtUnixMs: 1, writeCompletedAtUnixMs: 2,
+    responseId: 'wrong-profile-response', responseSha256: 'a'.repeat(64),
+    expectedToolNames: ['engine.get_turn_context'], returnedToolNames: ['engine.get_turn_context'],
+    descriptorSha256: 'b'.repeat(64), validation: { status: 'valid' },
+  }] : [];
+  const classified = classifyEngineCatalogEvidence({
+    dispatchId, expectedProfile: 'dm', expectedPhase: 'primary', expectedRequestId: 'request:wrong-profile',
+    expectedToolNames: ['engine.get_turn_context'], events: [], readiness,
+    completed: false, requiredStartupFailed: false,
+    ...(source === 'malformed' ? { malformedReadiness: true } : {}),
+  });
+  if (classified.status !== 'inconclusive' || classified.reason !== 'invalid_catalog_response') {
+    throw new Error(`${source} readiness did not classify as invalid_catalog_response.`);
+  }
+  return classified;
+}
+
 async function runIncompleteCatalogIntegrityStop(
   exit: IncompleteCatalogExit,
-  reason: Extract<NonNullable<AgentTurnResult['engineCatalogEvidence']>, { status: 'inconclusive' }>['reason'],
+  evidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>['reason'] |
+    IncompleteCatalogEvidenceFactory,
 ): Promise<{
   readonly row: Readonly<Record<string, unknown>>;
   readonly artifact: Readonly<Record<string, unknown>>;
@@ -189,7 +225,7 @@
       '--rooms', '1', '--rounds', '1', '--out', outPath,
       '--dm-mode', 'advice', '--board-image', 'off', '--dry-run',
     ]), {
-      adapter: incompleteCatalogAdapter(exit, reason, (path) => { launcherPath = path; }),
+      adapter: incompleteCatalogAdapter(exit, evidence, (path) => { launcherPath = path; }),
     });
   } catch (error) {
     stopped = error;
@@ -730,6 +766,40 @@
     },
   );
 
+  it.each([
+    ['timed_out', 'malformed'],
+    ['timed_out', 'wrong_profile'],
+    ['cancelled', 'malformed'],
+    ['cancelled', 'wrong_profile'],
+  ] as const)(
+    'persists forensic evidence and STOPs on a %s dispatch with an invalid %s catalog',
+    async (exit, source) => {
+      const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
+        exit,
+        (dispatchId) => classifiedInvalidCatalog(dispatchId, source),
+      );
+      expect(row).toMatchObject({
+        rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
+        engineCatalogEvidence: { status: 'inconclusive', reason: 'invalid_catalog_response' },
+        turnContextDelivery: {
+          status: 'indeterminate', measurement: null, integrityAction: 'stop_after_persist',
+        },
+        authorizedPlan: null, execution: null,
+      });
+      expect(row).not.toHaveProperty('failingDispatch');
+      expect(row).not.toHaveProperty('planner');
+      expect(artifact).toMatchObject({
+        kind: 'dispatch_integrity_indeterminate',
+        catalogEvidence: { status: 'inconclusive', reason: 'invalid_catalog_response' },
+        delivery: { status: 'indeterminate' }, contextSpool: { recordCount: 0 },
+        processEvidence: { stdout: `partial ${exit} output` },
+        partialResultEvidence: { status: 'partial', finalTextFragment: `partial ${exit} output` },
+      });
+      if (launcher.proposalSpoolPath === undefined) throw new Error('Integrity launcher omitted proposal spool.');
+      expect(readFileSync(launcher.proposalSpoolPath, 'utf8')).toBe('');
+    },
+  );
+
   it('persists a runner forensic row before propagating conflicting startup evidence', async () => {
     const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
       'infrastructure_failed',
diff --git a/tests/unit/tools/d569-blind-experiment.test.ts b/tests/unit/tools/d569-blind-experiment.test.ts
index 26a2f191ff717e596e8e509b201621df1dbc3eb2..6225df71769bfaa05528564a95715ca143810e30
--- a/tests/unit/tools/d569-blind-experiment.test.ts
+++ b/tests/unit/tools/d569-blind-experiment.test.ts
@@ -679,6 +679,33 @@
     }
   });
 
+  it('rejects either decisive integrity field alone while preserving rows with neither field', () => {
+    const cell = dryRunD569Experiment(manifest(), access())[0];
+    if (cell === undefined) throw new Error('D569 registry produced no cells.');
+    const row = observedRows([cell])[0];
+    if (row === undefined) throw new Error('D569 observed fixture produced no row.');
+
+    expect(row).not.toHaveProperty('engineCatalogEvidence');
+    expect(row).not.toHaveProperty('turnContextDelivery');
+    expect(validateD569ObservedRows([cell], [row])).toEqual([]);
+
+    const indeterminateDeliveryOnly: D569ObservedRow = {
+      ...row,
+      turnContextDelivery: { status: 'indeterminate' },
+    };
+    expect(validateD569ObservedRows([cell], [indeterminateDeliveryOnly]).map((violation) => violation.code))
+      .toContain('integrity_indeterminate');
+
+    for (const reason of ['conflicting_success_and_failure', 'invalid_catalog_response'] as const) {
+      const invalidCatalogOnly: D569ObservedRow = {
+        ...row,
+        engineCatalogEvidence: { status: 'inconclusive', reason },
+      };
+      expect(validateD569ObservedRows([cell], [invalidCatalogOnly]).map((violation) => violation.code))
+        .toContain('integrity_indeterminate');
+    }
+  });
+
   it('rejects changed advice baseline settings, primer, and model-default policy', () => {
     const advice = structuredClone(manifest());
     advice.adviceCeiling.rendererProfile = { changed: true };
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index a48c284a09bdf434fc8b09d5833225075ac752bc..4fd5016c33047014ec012c2334c6dfe5e2456853
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -14,12 +14,17 @@
 import { BlindModelIngressRecorder, type BlindIngressRecord } from '../../../src/vtt/blind-model-ingress';
 import {
   agentSessionIdFromCli,
+  engineDispatchId,
   type AgentInvocation,
   type AgentSessionAdapter,
   type AgentSessionBinding,
   type AgentTurnResult,
 } from '../../../src/vtt/agent-session';
 import {
+  classifyEngineCatalogEvidence,
+  type EngineReadinessRecord,
+} from '../../../src/vtt/engine-dispatch-evidence';
+import {
   analyzeRegisteredPrimaryPair,
   D569_PRIMARY_JUDGES,
   type D569PairedAnalysisDocuments,
@@ -415,6 +420,32 @@
   throw new Error('Expected consumer validation to reject contradictory evidence.');
 }
 
+type InvalidCatalogSource = 'malformed' | 'wrong_profile';
+
+function classifiedInvalidCatalogForConsumer(
+  dispatchIdValue: string,
+  source: InvalidCatalogSource,
+) {
+  const dispatchId = engineDispatchId(dispatchIdValue);
+  const readiness: readonly EngineReadinessRecord[] = source === 'wrong_profile' ? [{
+    version: 1, dispatchId, phase: 'primary', profile: 'dm', requestId: 'request:d569-invalid-catalog',
+    event: 'tools_list_stream_write_completed', generatedAtUnixMs: 1, writeCompletedAtUnixMs: 2,
+    responseId: 'wrong-profile-response', responseSha256: 'a'.repeat(64),
+    expectedToolNames: ['engine.get_turn_context'], returnedToolNames: ['engine.get_turn_context'],
+    descriptorSha256: 'b'.repeat(64), validation: { status: 'valid' },
+  }] : [];
+  const evidence = classifyEngineCatalogEvidence({
+    dispatchId, expectedProfile: 'blind', expectedPhase: 'primary',
+    expectedRequestId: 'request:d569-invalid-catalog', expectedToolNames: ['engine.get_turn_context'],
+    events: [], readiness, completed: false, requiredStartupFailed: false,
+    ...(source === 'malformed' ? { malformedReadiness: true } : {}),
+  });
+  if (evidence.status !== 'inconclusive' || evidence.reason !== 'invalid_catalog_response') {
+    throw new Error(`${source} consumer fixture did not classify as invalid catalog evidence.`);
+  }
+  return evidence;
+}
+
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
   readonly registeredRows: number;
@@ -422,6 +453,13 @@
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
   readonly contradictoryObservedViolations: readonly string[];
+  readonly invalidCatalogResults: readonly {
+    readonly exit: 'timed_out' | 'cancelled';
+    readonly source: InvalidCatalogSource;
+    readonly packetError: string;
+    readonly registeredError: string;
+    readonly observedViolations: readonly string[];
+  }[];
 } {
   const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
   const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
@@ -464,6 +502,58 @@
   contradictoryPacketRows[0] = contradictory;
   const contradictoryRegisteredRows = [...registeredRows];
   contradictoryRegisteredRows[0] = contradictory;
+  const invalidCatalogResults = (['timed_out', 'cancelled'] as const).flatMap((exit) =>
+    (['malformed', 'wrong_profile'] as const).map((source) => {
+      const invalidCatalog = classifiedInvalidCatalogForConsumer(dispatchId, source);
+      const delivery = exit === 'timed_out'
+        ? produced['turnContextDelivery']
+        : {
+            status: 'not_requested' as const, dispatchId,
+            reason: 'dispatch_cancelled' as const, measurement: null,
+          };
+      const ingress = record(produced['blindIngressAudit']);
+      const invalidRow = {
+        ...produced,
+        ...(exit === 'cancelled'
+          ? {
+              outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
+              turnContextDelivery: delivery,
+              blindIngressAudit: { ...ingress, delivery },
+              failingDispatch: {
+                phase: 'primary', exit, dispatchId, engineCatalogEvidence: invalidCatalog,
+                turnContextDelivery: delivery, failureReason: 'operator cancelled before delivery',
+              },
+            }
+          : {}),
+        engineCatalogEvidence: invalidCatalog,
+      };
+      const invalidPacketRows = [...packetRows];
+      invalidPacketRows[0] = invalidRow;
+      const invalidRegisteredRows = [...registeredRows];
+      invalidRegisteredRows[0] = invalidRow;
+      const observedDelivery: D569ObservedRow['turnContextDelivery'] = exit === 'timed_out'
+        ? { status: 'timeout_before_delivery' }
+        : { status: 'not_requested', reason: 'dispatch_cancelled' };
+      const invalidObserved: D569ObservedRow = {
+        ...observed,
+        outcome: exit === 'timed_out' ? 'refused' : 'infrastructure_failed',
+        engineCatalogEvidence: { status: 'inconclusive', reason: invalidCatalog.reason },
+        turnContextDelivery: observedDelivery,
+        ...(exit === 'cancelled' ? {
+          failingDispatch: {
+            dispatchId, exit, engineCatalogEvidence: { status: 'inconclusive' },
+            turnContextDelivery: { status: 'not_requested' },
+          },
+        } : {}),
+      };
+      return {
+        exit, source,
+        packetError: capturedFailure(() => { pairedDocuments(invalidPacketRows); }),
+        registeredError: capturedFailure(() => { validateBrutal(raw(invalidRegisteredRows)); }),
+        observedViolations: validateD569ObservedRows([cell], [invalidObserved])
+          .map((violation) => violation.code),
+      };
+    }));
   return {
     packetRows: packetCount,
     registeredRows: registeredCount,
@@ -474,6 +564,7 @@
       ...observed,
       engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
     }]).map((violation) => violation.code),
+    invalidCatalogResults,
   };
 }
 
@@ -597,6 +688,20 @@
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryObservedViolations).toContain('integrity_indeterminate');
   });
 
+  it('rejects malformed and wrong-profile catalog evidence after timeout or cancellation in every consumer', () => {
+    expect(RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults).toHaveLength(4);
+    expect(RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults.map(({ exit, source }) => `${exit}:${source}`))
+      .toEqual([
+        'timed_out:malformed', 'timed_out:wrong_profile',
+        'cancelled:malformed', 'cancelled:wrong_profile',
+      ]);
+    for (const result of RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults) {
+      expect(result.packetError).toContain('integrity evidence');
+      expect(result.registeredError).toContain('integrity-indeterminate');
+      expect(result.observedViolations).toContain('integrity_indeterminate');
+    }
+  });
+
   it('rejects incomplete v3 evidence objects', () => {
     expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
       const catalog = record(row['engineCatalogEvidence']);
@@ -604,6 +709,33 @@
     }))).toThrow();
   });
 
+  it('rejects an indeterminate delivery when the companion v3 catalog field is absent', () => {
+    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
+      const { engineCatalogEvidence: _omitted, ...withoutCatalog } = row;
+      return {
+        ...withoutCatalog,
+        turnContextDelivery: {
+          status: 'indeterminate', dispatchId: row['dispatchId'],
+          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
+          integrityAction: 'stop_after_persist',
+        },
+      };
+    }))).toThrow();
+  });
+
+  it.each(['conflicting_success_and_failure', 'invalid_catalog_response'] as const)(
+    'rejects a %s catalog when the companion v3 delivery field is absent',
+    (reason) => {
+      expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
+        const { turnContextDelivery: _omitted, ...withoutDelivery } = row;
+        return {
+          ...withoutDelivery,
+          engineCatalogEvidence: { status: 'inconclusive', dispatchId: row['dispatchId'], reason },
+        };
+      }))).toThrow();
+    },
+  );
+
   it('rejects incomplete v3 evidence nested in a failing dispatch', () => {
     const rows = BRUTAL_SOURCE.trimEnd().split('\n').map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     const index = rows.findIndex((row) => row['outcome'] === 'infrastructure_failed');
diff --git a/tests/unit/vtt/turn-context-delivery.test.ts b/tests/unit/vtt/turn-context-delivery.test.ts
index 58fdfcbfc31e01a3fce468a3f541e3d79999d4e5..86d281971dba13e52e792e37c1d1ccf7ec63a450
--- a/tests/unit/vtt/turn-context-delivery.test.ts
+++ b/tests/unit/vtt/turn-context-delivery.test.ts
@@ -1,7 +1,10 @@
 import { describe, expect, it } from 'vitest';
 import { agentSessionId } from '../../../src/combat/values';
 import { engineDispatchId, type AgentTurnResult, type EngineCatalogEvidence } from '../../../src/vtt/agent-session';
-import { classifyTurnContextDelivery } from '../../../src/vtt/turn-context-delivery';
+import {
+  classifyTurnContextDelivery,
+  engineCatalogReasonIsMissingObservation,
+} from '../../../src/vtt/turn-context-delivery';
 
 const dispatchId = engineDispatchId('engine-dispatch:delivery-test-0001');
 const base = {
@@ -25,6 +28,9 @@
 const conflicting: EngineCatalogEvidence = {
   status: 'inconclusive', dispatchId, reason: 'conflicting_success_and_failure',
 };
+const invalid: EngineCatalogEvidence = {
+  status: 'inconclusive', dispatchId, reason: 'invalid_catalog_response',
+};
 
 function turn(exit: AgentTurnResult['exit']): AgentTurnResult {
   switch (exit) {
@@ -42,17 +48,27 @@
     expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
     for (const exit of ['timed_out', 'cancelled'] as const) {
-      expect(classifyTurnContextDelivery({ turn: turn(exit), catalogEvidence: conflicting, delivered: null }))
-        .toEqual({
-          status: 'indeterminate', dispatchId,
-          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
-          integrityAction: 'stop_after_persist',
-        });
+      for (const catalogEvidence of [conflicting, invalid]) {
+        expect(classifyTurnContextDelivery({ turn: turn(exit), catalogEvidence, delivered: null }))
+          .toEqual({
+            status: 'indeterminate', dispatchId,
+            reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
+            integrityAction: 'stop_after_persist',
+          });
+      }
     }
     expect(classifyTurnContextDelivery({ turn: turn('infrastructure_failed'), catalogEvidence: absent, delivered: null })).toEqual({ status: 'infrastructure_absent', dispatchId, measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'indeterminate', dispatchId, reason: 'catalog_inconclusive_empty_context_spool', measurement: null, integrityAction: 'stop_after_persist' });
   });
 
+  it('exhaustively distinguishes missing observations from invalid or contradictory evidence', () => {
+    expect(engineCatalogReasonIsMissingObservation('no_correlated_catalog')).toBe(true);
+    expect(engineCatalogReasonIsMissingObservation('missing_live_timestamp')).toBe(true);
+    expect(engineCatalogReasonIsMissingObservation('timestamp_only')).toBe(true);
+    expect(engineCatalogReasonIsMissingObservation('invalid_catalog_response')).toBe(false);
+    expect(engineCatalogReasonIsMissingObservation('conflicting_success_and_failure')).toBe(false);
+  });
+
   it('preserves delivered status when timeout follows retrieval', () => {
     expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: ready, delivered: { contextSha256: 'b'.repeat(64), measurement: { baseBytes: 8, semanticBytes: 0 } } }).status).toBe('delivered');
   });
diff --git a/tools/d569-blind-experiment.ts b/tools/d569-blind-experiment.ts
index b0039f3292793f02302a8d91e97e9c93c3d8eb6d..68d5a00ca9adbf70c9a781f03495f0e435500174
--- a/tools/d569-blind-experiment.ts
+++ b/tools/d569-blind-experiment.ts
@@ -8,7 +8,7 @@
 import { SEMANTIC_BOARD_MAX_BYTES, TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
 import { DEFAULT_RENDERER_PROFILE } from '../src/vtt/renderer-profile';
 import {
-  d569DeliveryHasIntegritySignal,
+  d569PartialEvidenceHasIntegritySignal,
   type EngineCatalogIntegrityView,
   type TurnContextDeliveryIntegrityView,
 } from '../src/vtt/turn-context-delivery';
@@ -783,8 +783,7 @@
       'cli_version', `row ${rowKey} omitted the executing CLI version`);
     const diagnosedInfrastructure = row.outcome === 'infrastructure_failed';
     const integrityIndeterminate = row.outcome === 'integrity_indeterminate' ||
-      row.engineCatalogEvidence !== undefined && row.turnContextDelivery !== undefined &&
-        d569DeliveryHasIntegritySignal(row.engineCatalogEvidence, row.turnContextDelivery);
+      d569PartialEvidenceHasIntegritySignal(row.engineCatalogEvidence, row.turnContextDelivery);
     addViolation(violations, !integrityIndeterminate,
       'integrity_indeterminate', `row ${rowKey} has indeterminate integrity evidence`);
     addViolation(violations, diagnosedInfrastructure
