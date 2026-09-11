Implemented F27–F29 on top of `e8663ab5`.

### F27 — downstream ordinary-timeout acceptance

- Added one shared integrity predicate in [turn-context-delivery.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:62).
- Ordinary inconclusive evidence now validates when paired with:
  - `timeout_before_delivery`
  - pre-delivery `dispatch_cancelled`
- Updated all production consumers:
  - Packet decoder: [ai-dm-rerun-packet.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-rerun-packet.ts:405)
  - Registered validator: [validate-first-arm.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-v5/validate-first-arm.ts:123)
  - Observed-row validator: [d569-blind-experiment.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-blind-experiment.ts:787)
- Added a real runner-produced blind timeout row and passed it through packet construction, registered validation, and observed-row validation: [d569-v5.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:585).
- The same row with `conflicting_success_and_failure` is rejected by all three consumers.

### F28 — evidence-driven contradiction handling

- `conflicting_success_and_failure` is classified as `indeterminate` before branching on timeout/cancellation: [turn-context-delivery.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:87).
- Both runner integrity guards now use evidence rather than `turn.exit`:
  - Shared phase guard: [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:3446)
  - Primary guard: [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5403)
- Integrity artifacts can preserve the complete contradictory catalog variant: [d569-integrity.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/d569-integrity.ts:11).
- Runner regressions:
  - Ordinary timeout remains non-STOP: [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:639)
  - Timed-out contradiction STOP: [line 705](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:705)
  - Cancelled contradiction STOP: same parameterized regression.
  - Delivered contradiction remains persisted and stopped: [line 757](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:757)

### F29 — restored empty-spool invariant

- Restored the original named runner regression alongside the delivered-context case: [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:733).
- It asserts:
  - `integrity_indeterminate`
  - empty context spool
  - `indeterminate` delivery
  - persisted process/partial evidence
  - no failing-dispatch attribution
  - null authorization/execution

Mutation proof:

- Deleted the infrastructure-plus-inconclusive branch.
- Targeted test: exit 1, 1/1 failed.
- Restored byte-identically.
- Targeted test: exit 0, 1/1 passed in 223ms.
- Pre/post SHA-256: `98053bcde1cf3625dc55785c54419a1f0adeff045b319c236d702fe06417ac3e`.
- Logs: [mutant](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r5-f29-final-mutant.vitest.log), [restored](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r5-f29-final-restored.vitest.log).

### Verification

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Added prohibited-pattern audit — exit 0.
- `npx vitest run --configLoader runner tests/unit/tools/d569-v5.test.ts --reporter=verbose`
  - Exit 0; 22/22 passed in 73.53s.
- Direct consumer contracts:
  - Exit 0; 77/77 passed in 36.61s.
- Full 17-file cumulative:
  - Exit 1; 397/398 passed across 17 files in 557.64s.
  - Sole failure: known load-sensitive MCP test timed out at 5981ms.
- Required serial whole-file rerun:
  - `npx vitest run --configLoader runner tests/unit/tools/engine-mcp-server.test.ts --no-file-parallelism --reporter=verbose`
  - Exit 0; 14/14 passed.
  - Previously timed-out test passed in 3905ms.
- No sandbox-inadmissible tests.

Final diff: 9 files, 341 insertions, 16 deletions. No tests deleted or weakened; no timeout changes.

- Frozen contract SHA-256 unchanged: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Runbook SHA-256 unchanged: `fb228c912ffbaafb3a082eb6a08650abffe36fe23adc929a2071b40da704a328`
- No pins regenerated.

D569-PATCH R5 DONE
diff --git a/src/vtt/d569-integrity.ts b/src/vtt/d569-integrity.ts
index fca8c469f906b0566823918dd9cb75c0b94f169d..d0fc8fccb5db02c187fc41043d7efe40a1b9b916
--- a/src/vtt/d569-integrity.ts
+++ b/src/vtt/d569-integrity.ts
@@ -8,7 +8,7 @@
   readonly dispatchId: EngineDispatchId;
   readonly launcherSha256: string;
   readonly processEvidenceSha256: string;
-  readonly catalogEvidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
+  readonly catalogEvidence: EngineCatalogEvidence;
   readonly delivery: Extract<TurnContextDelivery, { readonly status: 'delivered' | 'indeterminate' }>;
   readonly contextSpool: { readonly recordCount: number; readonly sha256: string };
   readonly proposalSpool: {
diff --git a/src/vtt/turn-context-delivery.ts b/src/vtt/turn-context-delivery.ts
index a7f247338d1c553f9f56eeb0ff0f5f4d1f6b1bbe..aedbaf7379f9a3935bdb93244075ae06f9823ee6
--- a/src/vtt/turn-context-delivery.ts
+++ b/src/vtt/turn-context-delivery.ts
@@ -42,6 +42,39 @@
   | { readonly status: 'unavailable'; readonly errorClass: string }
   | null;
 
+export type EngineCatalogIntegrityView =
+  | { readonly status: 'ready' | 'absent' }
+  | {
+      readonly status: 'inconclusive';
+      readonly reason:
+        | 'no_correlated_catalog'
+        | 'invalid_catalog_response'
+        | 'missing_live_timestamp'
+        | 'conflicting_success_and_failure'
+        | 'timestamp_only';
+    };
+
+export type TurnContextDeliveryIntegrityView =
+  | { readonly status: 'delivered' }
+  | { readonly status: 'not_requested'; readonly reason: 'catalog_ready_model_did_not_fetch' | 'dispatch_cancelled' }
+  | { readonly status: 'timeout_before_delivery' | 'infrastructure_absent' | 'indeterminate' };
+
+export function engineCatalogHasContradiction(evidence: EngineCatalogIntegrityView): boolean {
+  return evidence.status === 'inconclusive' && evidence.reason === 'conflicting_success_and_failure';
+}
+
+/** True when D569 evidence must be persisted and stopped rather than packetized or scored. */
+export function d569DeliveryHasIntegritySignal(
+  catalog: EngineCatalogIntegrityView,
+  delivery: TurnContextDeliveryIntegrityView,
+): boolean {
+  if (delivery.status === 'indeterminate' || engineCatalogHasContradiction(catalog)) return true;
+  if (delivery.status === 'delivered') return catalog.status !== 'ready';
+  if (catalog.status !== 'inconclusive') return false;
+  return delivery.status !== 'timeout_before_delivery' &&
+    !(delivery.status === 'not_requested' && delivery.reason === 'dispatch_cancelled');
+}
+
 export function classifyTurnContextDelivery(input: {
   readonly turn: AgentTurnResult;
   readonly catalogEvidence: EngineCatalogEvidence;
@@ -51,6 +84,13 @@
   if (input.delivered !== null) {
     return { status: 'delivered', dispatchId, ...input.delivered };
   }
+  if (engineCatalogHasContradiction(input.catalogEvidence)) {
+    return {
+      status: 'indeterminate', dispatchId,
+      reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
+      integrityAction: 'stop_after_persist',
+    };
+  }
   switch (input.turn.exit) {
     case 'cancelled':
       return { status: 'not_requested', dispatchId, reason: 'dispatch_cancelled', measurement: null };
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 0be1489687b28b7648766f0cdad770cc79982971..8df4cfebcf3a3562c565ce500bbfe89e78e9d6bd
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -130,6 +130,81 @@
   return value as Readonly<Record<string, unknown>>;
 }
 
+type IncompleteCatalogExit = 'timed_out' | 'cancelled' | 'infrastructure_failed';
+
+function incompleteCatalogAdapter(
+  exit: IncompleteCatalogExit,
+  reason: Extract<NonNullable<AgentTurnResult['engineCatalogEvidence']>, { status: 'inconclusive' }>['reason'],
+  observeLauncher?: (path: string) => void,
+): AgentSessionAdapter {
+  const dispatch = async (invocation: AgentInvocation): Promise<AgentTurnResult> => {
+    if (invocation.engineDispatchId === undefined) throw new Error('Incomplete fixture lacks dispatch identity.');
+    observeLauncher?.(invocation.launcherToken);
+    const common = {
+      resumeSessionId: null, sessionId: `partial-${exit}-session`,
+      finalText: `partial ${exit} output`, usage: null,
+      processEvidence: {
+        startedAtUnixMs: 10, endedAtUnixMs: 20, exitCode: exit === 'infrastructure_failed' ? 1 : null,
+        signal: exit === 'infrastructure_failed' ? null : 'SIGTERM',
+        stdout: `partial ${exit} output`, stderr: exit === 'infrastructure_failed' ? 'startup failed' : '',
+        decodedEvents: [],
+      },
+      partialResultEvidence: {
+        status: 'partial' as const, decodedEventCount: 0, finalTextFragment: `partial ${exit} output`,
+        observedUsage: null, stagedInvocationIds: [],
+      },
+      engineCatalogEvidence: { status: 'inconclusive' as const, dispatchId: invocation.engineDispatchId, reason },
+    };
+    switch (exit) {
+      case 'timed_out': return { ...common, exit, timeoutMs: 180_000 };
+      case 'cancelled': return { ...common, exit, cancellationReason: 'operator_cancelled' };
+      case 'infrastructure_failed': return {
+        ...common, exit, component: 'engine_mcp_startup', failureReason: 'required engine startup failed',
+      };
+    }
+  };
+  return {
+    kind: 'codex',
+    probe: async () => ({ present: true, version: 'SIMULATED' }),
+    start: dispatch,
+    resume: async () => { throw new Error('Incomplete fixture unexpectedly resumed.'); },
+    classifyFailure: () => 'unknown',
+  };
+}
+
+async function runIncompleteCatalogIntegrityStop(
+  exit: IncompleteCatalogExit,
+  reason: Extract<NonNullable<AgentTurnResult['engineCatalogEvidence']>, { status: 'inconclusive' }>['reason'],
+): Promise<{
+  readonly row: Readonly<Record<string, unknown>>;
+  readonly artifact: Readonly<Record<string, unknown>>;
+  readonly launcher: EngineMcpLauncherManifest;
+}> {
+  const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-integrity-`));
+  const outPath = join(directory, 'rows.jsonl');
+  let launcherPath: string | null = null;
+  let stopped: unknown;
+  try {
+    await runConversation(parseConversationArgs([
+      '--rooms', '1', '--rounds', '1', '--out', outPath,
+      '--dm-mode', 'advice', '--board-image', 'off', '--dry-run',
+    ]), {
+      adapter: incompleteCatalogAdapter(exit, reason, (path) => { launcherPath = path; }),
+    });
+  } catch (error) {
+    stopped = error;
+  }
+  if (!(stopped instanceof D569IntegrityStop)) {
+    throw new Error(`Expected ${exit} catalog evidence to raise D569IntegrityStop.`, { cause: stopped });
+  }
+  if (launcherPath === null) throw new Error('Integrity fixture did not observe its launcher.');
+  const launcher = JSON.parse(readFileSync(launcherPath, 'utf8')) as EngineMcpLauncherManifest;
+  const row = JSON.parse(readFileSync(outPath, 'utf8')) as Readonly<Record<string, unknown>>;
+  const artifactPath = join(dirname(launcherPath), 'room-1-round-1-dispatch-integrity.json');
+  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as Readonly<Record<string, unknown>>;
+  return { row, artifact, launcher };
+}
+
 class BoilerplateThenValidStructuredFinalAdapter implements AgentSessionAdapter {
   readonly kind = 'codex' as const;
   decisionAttempts = 0;
@@ -626,6 +701,59 @@
     });
   });
 
+  it.each(['timed_out', 'cancelled'] as const)(
+    'persists forensic evidence and STOPs on a %s dispatch with a contradictory catalog',
+    async (exit) => {
+      const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
+        exit,
+        'conflicting_success_and_failure',
+      );
+      expect(row).toMatchObject({
+        rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
+        engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
+        turnContextDelivery: {
+          status: 'indeterminate', measurement: null, integrityAction: 'stop_after_persist',
+        },
+        authorizedPlan: null, execution: null,
+      });
+      expect(row).not.toHaveProperty('failingDispatch');
+      expect(row).not.toHaveProperty('planner');
+      expect(artifact).toMatchObject({
+        kind: 'dispatch_integrity_indeterminate',
+        catalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
+        delivery: { status: 'indeterminate' }, contextSpool: { recordCount: 0 },
+        processEvidence: { stdout: `partial ${exit} output` },
+        partialResultEvidence: { status: 'partial', finalTextFragment: `partial ${exit} output` },
+      });
+      if (launcher.proposalSpoolPath === undefined) throw new Error('Integrity launcher omitted proposal spool.');
+      expect(readFileSync(launcher.proposalSpoolPath, 'utf8')).toBe('');
+    },
+  );
+
+  it('persists a runner forensic row before propagating conflicting startup evidence', async () => {
+    const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
+      'infrastructure_failed',
+      'no_correlated_catalog',
+    );
+    expect(row).toMatchObject({
+      rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
+      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
+      turnContextDelivery: {
+        status: 'indeterminate', measurement: null, integrityAction: 'stop_after_persist',
+      },
+      authorizedPlan: null, execution: null,
+    });
+    expect(row).not.toHaveProperty('failingDispatch');
+    expect(artifact).toMatchObject({
+      kind: 'dispatch_integrity_indeterminate',
+      delivery: { status: 'indeterminate' }, contextSpool: { recordCount: 0 },
+      processEvidence: { stdout: 'partial infrastructure_failed output', stderr: 'startup failed' },
+      partialResultEvidence: { status: 'partial', finalTextFragment: 'partial infrastructure_failed output' },
+    });
+    if (launcher.turnContextSpoolPath === undefined) throw new Error('Integrity launcher omitted context spool.');
+    expect(readFileSync(launcher.turnContextSpoolPath, 'utf8')).toBe('');
+  });
+
   it('persists delivered context and process evidence before propagating conflicting startup evidence', async () => {
     const directory = mkdtempSync(join(tmpdir(), 'd569-runner-startup-integrity-'));
     const outPath = join(directory, 'rows.jsonl');
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 7a7f5ebe2bdab03dd5bd8aa4704cc07e281f7e93..a48c284a09bdf434fc8b09d5833225075ac752bc
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -38,8 +38,10 @@
 import {
   D569_EXPERIMENT_MANIFEST_PATH,
   dryRunD569Experiment,
+  validateD569ObservedRows,
   type D569DryRunCell,
   type D569ExperimentManifest,
+  type D569ObservedRow,
 } from '../../../tools/d569-blind-experiment';
 import { canonicalD569SecondFamilyRegeneration } from '../../../tools/d569-second-family-manifest';
 import { BRUTAL_10_PROTOCOL, buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
@@ -334,6 +336,37 @@
   classifyFailure(): 'unknown' { return 'unknown'; }
 }
 
+class D569TimeoutBeforeDeliveryAdapter implements AgentSessionAdapter {
+  readonly kind = 'codex' as const;
+
+  async probe() { return { present: true, version: 'D569-TIMEOUT-BEFORE-DELIVERY' }; }
+
+  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
+    if (invocation.engineDispatchId === undefined) throw new Error('Timeout fixture omitted dispatch identity.');
+    return {
+      exit: 'timed_out', resumeSessionId: null, sessionId: 'd569-timeout-before-delivery-session',
+      finalText: 'catalog observed before timeout', usage: null, timeoutMs: 240_000,
+      processEvidence: {
+        startedAtUnixMs: 1, endedAtUnixMs: 2, exitCode: null, signal: 'SIGTERM',
+        stdout: 'catalog observed before timeout', stderr: '', decodedEvents: [],
+      },
+      partialResultEvidence: {
+        status: 'partial', decodedEventCount: 1, finalTextFragment: 'catalog observed before timeout',
+        observedUsage: null, stagedInvocationIds: [],
+      },
+      engineCatalogEvidence: {
+        status: 'inconclusive', dispatchId: invocation.engineDispatchId, reason: 'no_correlated_catalog',
+      },
+    };
+  }
+
+  async resume(_binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
+    return this.start(invocation);
+  }
+
+  classifyFailure(): 'unknown' { return 'unknown'; }
+}
+
 async function produceCancellationAfterDeliveryRow(): Promise<Readonly<Record<string, unknown>>> {
   const directory = mkdtempSync(join(tmpdir(), 'd569-runner-cancelled-delivery-'));
   const service = new D569CancellationSnapshotService();
@@ -352,7 +385,99 @@
   return JSON.parse(JSON.stringify(produced)) as Readonly<Record<string, unknown>>;
 }
 
+async function produceTimeoutBeforeDeliveryRow(): Promise<Readonly<Record<string, unknown>>> {
+  const directory = mkdtempSync(join(tmpdir(), 'd569-runner-timeout-before-delivery-'));
+  const service = new D569CancellationSnapshotService();
+  const state = structuredClone(FIRST_BRUTAL_STATE);
+  const rows = await runArena(parseArenaArgs([
+    '--rooms', '1', '--reps', '1', '--seed', '6203001', '--basis', 'brutal',
+    '--out', join(directory, 'rows.jsonl'), '--dm-mode', 'blind', '--cli', 'codex',
+    '--model', 'gpt-5.6-luna', '--effort', 'high',
+  ]), {
+    adapter: new D569TimeoutBeforeDeliveryAdapter(), repoCommit: PATCHED_COMMIT,
+    heartbeat: () => undefined, boardSnapshotServiceFactory: async () => service,
+    fixtureStates: [state],
+  });
+  const produced = rows[0];
+  if (produced === undefined) throw new Error('Timeout arena produced no row.');
+  return JSON.parse(JSON.stringify(produced)) as Readonly<Record<string, unknown>>;
+}
+
 const RUNNER_CANCELLATION_AFTER_DELIVERY_ROW = await produceCancellationAfterDeliveryRow();
+const RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW = await produceTimeoutBeforeDeliveryRow();
+
+function capturedFailure(action: () => void): string {
+  try {
+    action();
+  } catch (error) {
+    return error instanceof Error ? error.message : String(error);
+  }
+  throw new Error('Expected consumer validation to reject contradictory evidence.');
+}
+
+function evaluateRunnerTimeoutConsumers(): {
+  readonly packetRows: number;
+  readonly registeredRows: number;
+  readonly observedViolations: readonly string[];
+  readonly contradictoryPacketError: string;
+  readonly contradictoryRegisteredError: string;
+  readonly contradictoryObservedViolations: readonly string[];
+} {
+  const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
+  const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
+    .map((cell) => current(cell, 'authorized'));
+  packetRows[0] = produced;
+  const packetCount = pairedDocuments(packetRows).packet.length;
+  const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
+    .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
+  registeredRows[0] = produced;
+  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
+  if (cell === undefined) throw new Error('Registered timeout cell is absent.');
+  const boardImage = record(produced['boardImage']);
+  const observedSessionId = produced['sessionId'];
+  const scheduledCellKey = produced['scheduledCellKey'];
+  const dispatchId = produced['dispatchId'];
+  if (typeof observedSessionId !== 'string' || observedSessionId.length === 0 ||
+    typeof scheduledCellKey !== 'string' || typeof dispatchId !== 'string') {
+    throw new Error('Runner timeout row omitted its observed session or dispatch identity.');
+  }
+  const observed: D569ObservedRow = {
+    arm: cell.arm, cli: 'codex', cliVersion: 'codex-cli 0.153.4', model: cell.model, effort: cell.effort,
+    family: cell.family, basis: cell.basis, seed: cell.seed, rep: cell.rep,
+    sessionId: observedSessionId, outcome: 'refused', scheduledCellKey, dispatchId,
+    engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
+    turnContextDelivery: { status: 'timeout_before_delivery' },
+    timeoutMs: cell.timeoutMs, escalationModel: null, modelDefaultFallback: false,
+    stateHash: cell.stateHash, sharedKbHash: cell.sharedKbHash,
+    visualSourceHash: cell.visualSourceHash, visualProfileHash: cell.visualProfileHash,
+    visualArtifactHash: String(boardImage['sha256']), baseContextCapBytes: cell.baseContextCapBytes,
+    semanticContextCapBytes: cell.semanticContextCapBytes, truncatedBlocks: [],
+  };
+  const observedViolations = validateD569ObservedRows([cell], [observed]).map((violation) => violation.code);
+  const catalog = record(produced['engineCatalogEvidence']);
+  const contradictory = {
+    ...produced,
+    engineCatalogEvidence: { ...catalog, reason: 'conflicting_success_and_failure' },
+  };
+  const contradictoryPacketRows = [...packetRows];
+  contradictoryPacketRows[0] = contradictory;
+  const contradictoryRegisteredRows = [...registeredRows];
+  contradictoryRegisteredRows[0] = contradictory;
+  return {
+    packetRows: packetCount,
+    registeredRows: registeredCount,
+    observedViolations,
+    contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
+    contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
+    contradictoryObservedViolations: validateD569ObservedRows([cell], [{
+      ...observed,
+      engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
+    }]).map((violation) => violation.code),
+  };
+}
+
+const RUNNER_TIMEOUT_CONSUMERS = evaluateRunnerTimeoutConsumers();
 
 describe('D569 v5 replacement validation and paired analysis tools', () => {
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -457,6 +582,21 @@
     expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
   });
 
+  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+    const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
+    expect(produced).toMatchObject({
+      outcome: 'refused', fallbackReason: 'timeout',
+      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
+      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+    });
+    expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
+    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
+    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
+    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');
+    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryObservedViolations).toContain('integrity_indeterminate');
+  });
+
   it('rejects incomplete v3 evidence objects', () => {
     expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
       const catalog = record(row['engineCatalogEvidence']);
diff --git a/tests/unit/vtt/turn-context-delivery.test.ts b/tests/unit/vtt/turn-context-delivery.test.ts
index b49082c87e33e22545c327c15983068bc14df33a..58fdfcbfc31e01a3fce468a3f541e3d79999d4e5
--- a/tests/unit/vtt/turn-context-delivery.test.ts
+++ b/tests/unit/vtt/turn-context-delivery.test.ts
@@ -22,6 +22,9 @@
 const inconclusive: EngineCatalogEvidence = {
   status: 'inconclusive', dispatchId, reason: 'no_correlated_catalog',
 };
+const conflicting: EngineCatalogEvidence = {
+  status: 'inconclusive', dispatchId, reason: 'conflicting_success_and_failure',
+};
 
 function turn(exit: AgentTurnResult['exit']): AgentTurnResult {
   switch (exit) {
@@ -38,6 +41,14 @@
     expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'not_requested', dispatchId, reason: 'catalog_ready_model_did_not_fetch', measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
+    for (const exit of ['timed_out', 'cancelled'] as const) {
+      expect(classifyTurnContextDelivery({ turn: turn(exit), catalogEvidence: conflicting, delivered: null }))
+        .toEqual({
+          status: 'indeterminate', dispatchId,
+          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
+          integrityAction: 'stop_after_persist',
+        });
+    }
     expect(classifyTurnContextDelivery({ turn: turn('infrastructure_failed'), catalogEvidence: absent, delivered: null })).toEqual({ status: 'infrastructure_absent', dispatchId, measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'indeterminate', dispatchId, reason: 'catalog_inconclusive_empty_context_spool', measurement: null, integrityAction: 'stop_after_persist' });
   });
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index 258e4c0e4b885e1d5070bad1611ab3c49b067705..bb35243232a0e416f0287abac575a0d094b0ce69
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -28,6 +28,7 @@
 import { D569IntegrityStop, type D569DispatchIntegrityArtifact } from '../src/vtt/d569-integrity';
 import {
   classifyTurnContextDelivery,
+  d569DeliveryHasIntegritySignal,
   type HostContextDiagnostic,
   type TurnContextConfiguredCaps,
   type TurnContextDelivery,
@@ -2331,7 +2332,7 @@
   readonly launcherPath: string;
   readonly proposalSpoolPath: string;
   readonly contextSpoolPath: string;
-  readonly catalogEvidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
+  readonly catalogEvidence: EngineCatalogEvidence;
   readonly delivery: Extract<TurnContextDelivery, { readonly status: 'delivered' | 'indeterminate' }>;
   readonly turn: AgentTurnResult;
 }): never {
@@ -3428,7 +3429,7 @@
   readonly scheduledCellKey: string;
 }): void {
   const catalogEvidence = input.turn.engineCatalogEvidence;
-  if (catalogEvidence?.status !== 'inconclusive') return;
+  if (catalogEvidence === null) return;
   const correlatedContext = takeCorrelatedTurnContext(
     input.spools.context,
     input.maximumBytes,
@@ -3442,8 +3443,7 @@
       measurement: deliveredTurnContextMeasurement(correlatedContext),
     },
   });
-  const contradictoryStartup = input.turn.exit === 'infrastructure_failed';
-  if (delivery.status !== 'indeterminate' && !contradictoryStartup) return;
+  if (!d569DeliveryHasIntegritySignal(catalogEvidence, delivery)) return;
   if (delivery.status !== 'indeterminate' && delivery.status !== 'delivered') {
     throw new Error('Contradictory startup evidence produced an unsupported delivery state.');
   }
@@ -5400,8 +5400,7 @@
                   measurement: deliveredTurnContextMeasurement(correlatedContext),
                 },
               });
-              if (primaryCatalogEvidence.status === 'inconclusive' &&
-                (primaryDelivery.status === 'indeterminate' || turn.exit === 'infrastructure_failed')) {
+              if (d569DeliveryHasIntegritySignal(primaryCatalogEvidence, primaryDelivery)) {
                 if (primaryDelivery.status !== 'indeterminate' && primaryDelivery.status !== 'delivered') {
                   throw new Error('Contradictory primary startup evidence produced an unsupported delivery state.');
                 }
diff --git a/tools/ai-dm-rerun-packet.ts b/tools/ai-dm-rerun-packet.ts
index 79441a9cd8bd5b8db592a16e275d9675cc0045c1..7b6ce03f69b91447d00ec41d4e199d7ccd2f83a4
--- a/tools/ai-dm-rerun-packet.ts
+++ b/tools/ai-dm-rerun-packet.ts
@@ -4,6 +4,7 @@
 import { D569IntegrityStop } from '../src/vtt/d569-integrity';
 import { canonicalJson } from '../src/commands/canonical-json';
 import { engineUiFeedbackSchema } from '../src/vtt/mcp/schemas';
+import { d569DeliveryHasIntegritySignal } from '../src/vtt/turn-context-delivery';
 
 export const R1_10_SEEDS = [
   5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005,
@@ -400,8 +401,8 @@
       row.blindIngressAudit.delivery.dispatchId !== row.turnContextDelivery.dispatchId)) {
     context.addIssue({ code: 'custom', path: ['blindIngressAudit', 'delivery'], message: 'must match row delivery' });
   }
-  if (row.outcome === 'integrity_indeterminate' || row.engineCatalogEvidence.status === 'inconclusive' ||
-    row.turnContextDelivery.status === 'indeterminate') {
+  if (row.outcome === 'integrity_indeterminate' ||
+    d569DeliveryHasIntegritySignal(row.engineCatalogEvidence, row.turnContextDelivery)) {
     context.addIssue({
       code: 'custom', path: ['outcome'],
       message: 'inconclusive or indeterminate integrity evidence cannot become a rerun packet',
diff --git a/tools/d569-blind-experiment.ts b/tools/d569-blind-experiment.ts
index 89f14068d3691d83ff5a084eb228c62bb6daafd1..b0039f3292793f02302a8d91e97e9c93c3d8eb6d
--- a/tools/d569-blind-experiment.ts
+++ b/tools/d569-blind-experiment.ts
@@ -7,6 +7,11 @@
 } from '../src/vtt/knowledge-base-contract';
 import { SEMANTIC_BOARD_MAX_BYTES, TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
 import { DEFAULT_RENDERER_PROFILE } from '../src/vtt/renderer-profile';
+import {
+  d569DeliveryHasIntegritySignal,
+  type EngineCatalogIntegrityView,
+  type TurnContextDeliveryIntegrityView,
+} from '../src/vtt/turn-context-delivery';
 import { BLIND_STATE_PRIMER_VERSION } from './ai-dm-board-snapshot';
 import {
   D569_SECOND_FAMILY_SEEDS,
@@ -726,9 +731,8 @@
     'partial_execution' | 'infrastructure_failed' | 'integrity_indeterminate';
   readonly scheduledCellKey?: string;
   readonly dispatchId?: string;
-  readonly engineCatalogEvidence?: { readonly status: 'ready' | 'absent' | 'inconclusive' };
-  readonly turnContextDelivery?: { readonly status: 'delivered' | 'not_requested' |
-    'timeout_before_delivery' | 'infrastructure_absent' | 'indeterminate' };
+  readonly engineCatalogEvidence?: EngineCatalogIntegrityView;
+  readonly turnContextDelivery?: TurnContextDeliveryIntegrityView;
   readonly failingDispatch?: {
     readonly dispatchId: string;
     readonly exit: 'cancelled' | 'infrastructure_failed';
@@ -779,7 +783,8 @@
       'cli_version', `row ${rowKey} omitted the executing CLI version`);
     const diagnosedInfrastructure = row.outcome === 'infrastructure_failed';
     const integrityIndeterminate = row.outcome === 'integrity_indeterminate' ||
-      row.engineCatalogEvidence?.status === 'inconclusive' || row.turnContextDelivery?.status === 'indeterminate';
+      row.engineCatalogEvidence !== undefined && row.turnContextDelivery !== undefined &&
+        d569DeliveryHasIntegritySignal(row.engineCatalogEvidence, row.turnContextDelivery);
     addViolation(violations, !integrityIndeterminate,
       'integrity_indeterminate', `row ${rowKey} has indeterminate integrity evidence`);
     addViolation(violations, diagnosedInfrastructure
diff --git a/tools/d569-v5/validate-first-arm.ts b/tools/d569-v5/validate-first-arm.ts
index 53e385c433fde0544a0c740196a622bce9148f54..c3b63526b746276c13a30adf22ecb7cac523306e
--- a/tools/d569-v5/validate-first-arm.ts
+++ b/tools/d569-v5/validate-first-arm.ts
@@ -4,6 +4,7 @@
 import { canonicalJson } from '../../src/commands/canonical-json';
 import { applyRoomInitiativeProfile } from '../../src/vtt/room-generator';
 import { decodeArenaFixtureText } from '../../src/vtt/mcp/entrypoint';
+import { d569DeliveryHasIntegritySignal } from '../../src/vtt/turn-context-delivery';
 import { canonicalD569SecondFamilyRegeneration } from '../d569-second-family-manifest';
 import {
   D569_EXPERIMENT_MANIFEST_PATH,
@@ -119,7 +120,7 @@
   if (scheduledCellKey !== historicalCellKey(row)) {
     throw new TypeError(`D569 v3 scheduled key does not match room/round for ${scheduledCellKey}.`);
   }
-  if (row['outcome'] === 'integrity_indeterminate' || catalog.status === 'inconclusive' || delivery.status === 'indeterminate') {
+  if (row['outcome'] === 'integrity_indeterminate' || d569DeliveryHasIntegritySignal(catalog, delivery)) {
     throw new TypeError(`D569 integrity-indeterminate observation ${scheduledCellKey} cannot enter validation.`);
   }
   if ((catalog.status === 'absent') !== (delivery.status === 'infrastructure_absent')) {
@@ -383,8 +384,8 @@
       scheduledCellKey: observation.scheduledCellKey,
       ...(typeof row['dispatchId'] === 'string' ? { dispatchId: row['dispatchId'] } : {}),
       ...(current ? {
-        engineCatalogEvidence: { status: catalogSchema.parse(row['engineCatalogEvidence']).status },
-        turnContextDelivery: { status: deliverySchema.parse(row['turnContextDelivery']).status },
+        engineCatalogEvidence: catalogSchema.parse(row['engineCatalogEvidence']),
+        turnContextDelivery: deliverySchema.parse(row['turnContextDelivery']),
       } : {}),
       ...(current && row['failingDispatch'] !== undefined ? {
         failingDispatch: (() => {
