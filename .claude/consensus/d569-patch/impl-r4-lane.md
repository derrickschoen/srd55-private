Implemented all R4 findings on top of `8e77ca50`.

### Findings

- F23 — ordinary timeout versus contradiction
  - [turn-context-delivery.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:57) now classifies timeout after catalog/no tool call as `timeout_before_delivery`.
  - Actual infrastructure/catalog contradictions remain `indeterminate`.
  - Unit regression: [turn-context-delivery.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-context-delivery.test.ts:40).
  - Runner regression: [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:564).

- F24 — single finalized delivery measurement
  - [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:2135) now separates base and `semantic_board` bytes when delivery is first classified.
  - Primary cancellation stores that same finalized delivery object in `failingDispatch` at [line 5438](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5438).
  - Final telemetry derives from delivered evidence at [line 6664](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6664) and [line 6986](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6986).
  - Real runner-produced semantic cancellation regression passes production packet decoding and registered validation: [d569-v5.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:435).

- F25 — delivered context does not suppress contradiction STOP
  - Both primary and shared integrity paths persist and stop on `infrastructure_failed` plus inconclusive catalog evidence, including delivered context: [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:3445), [line 5403](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5403).
  - Integrity artifacts now represent delivered or indeterminate evidence and actual spool counts: [d569-integrity.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/d569-integrity.ts:12).
  - Persistence regression asserts delivered context, stdout/stderr, and partial result: [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:629).

- F26 — cleanup joins consume real adapter evidence
  - The production join now branches exclusively on `completed.turn.exit`: [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4470).
  - Failure injection moved into `SimulatedConversationAdapter`: [line 2847](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:2847).
  - Both cleanup joins are covered at [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:2876).
  - Mutant proof:
    - Removed real join handling: exit 1, 2/2 targeted tests failed.
    - Byte-identical restoration: exit 0, 2/2 passed in 1125ms and 838ms.
    - Logs: [mutant](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r4-f26-mutant.vitest.log), [restored](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r4-f26-restored.vitest.log).

### Verification

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Added prohibited-pattern audit — exit 0.
- D569 v5 test file — exit 0; 21/21 passed in 67.56s.
- Full 17-file cumulative — exit 1; 390/394 passed. Four failures were 5-second load timeouts.
- Serial rerun of those four — three passed:
  - validator default rejection: 4565ms
  - replay migration: 4946ms
  - lexical MCP case: 4653ms
  - blind-attempt MCP case remained load-timed-out at 6353ms. The same test had independently passed in 4154ms earlier with identical engine-path code.
- Seven-file focused suite — exit 1; 268/278 passed, ten load timeouts.
- Single serial rerun of the eight newly observed timeouts — exit 0; 8/8 passed in 2.96–3.67s.
- No tests were sandbox-inadmissible.

Final diff: 6 files, 370 insertions, 88 deletions. No pins regenerated.

- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Unchanged runbook SHA-256: `fb228c912ffbaafb3a082eb6a08650abffe36fe23adc929a2071b40da704a328`

D569-PATCH R4 DONE
diff --git a/src/vtt/d569-integrity.ts b/src/vtt/d569-integrity.ts
index cacf3a5a9f97615df49f7f4b813706a072dce300..fca8c469f906b0566823918dd9cb75c0b94f169d
--- a/src/vtt/d569-integrity.ts
+++ b/src/vtt/d569-integrity.ts
@@ -9,8 +9,8 @@
   readonly launcherSha256: string;
   readonly processEvidenceSha256: string;
   readonly catalogEvidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
-  readonly delivery: Extract<TurnContextDelivery, { readonly status: 'indeterminate' }>;
-  readonly contextSpool: { readonly recordCount: 0; readonly sha256: string };
+  readonly delivery: Extract<TurnContextDelivery, { readonly status: 'delivered' | 'indeterminate' }>;
+  readonly contextSpool: { readonly recordCount: number; readonly sha256: string };
   readonly proposalSpool: {
     readonly recordCount: number;
     readonly sha256: string;
diff --git a/src/vtt/turn-context-delivery.ts b/src/vtt/turn-context-delivery.ts
index 728882cbefb86da214c70b6e0f283cb9d417041b..a7f247338d1c553f9f56eeb0ff0f5f4d1f6b1bbe
--- a/src/vtt/turn-context-delivery.ts
+++ b/src/vtt/turn-context-delivery.ts
@@ -51,20 +51,21 @@
   if (input.delivered !== null) {
     return { status: 'delivered', dispatchId, ...input.delivered };
   }
-  if (input.catalogEvidence.status === 'inconclusive') {
-    return {
-      status: 'indeterminate', dispatchId,
-      reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
-      integrityAction: 'stop_after_persist',
-    };
-  }
   switch (input.turn.exit) {
     case 'cancelled':
       return { status: 'not_requested', dispatchId, reason: 'dispatch_cancelled', measurement: null };
     case 'timed_out':
       return { status: 'timeout_before_delivery', dispatchId, measurement: null };
-    case 'infrastructure_failed':
+    case 'infrastructure_failed': {
+      if (input.catalogEvidence.status === 'inconclusive') {
+        return {
+          status: 'indeterminate', dispatchId,
+          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
+          integrityAction: 'stop_after_persist',
+        };
+      }
       return { status: 'infrastructure_absent', dispatchId, measurement: null };
+    }
     case 'completed':
       switch (input.catalogEvidence.status) {
         case 'ready':
@@ -74,6 +75,12 @@
           };
         case 'absent':
           return { status: 'infrastructure_absent', dispatchId, measurement: null };
+        case 'inconclusive':
+          return {
+            status: 'indeterminate', dispatchId,
+            reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
+            integrityAction: 'stop_after_persist',
+          };
       }
   }
 }
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 93fb360a6d1b5ba8eb23982de1b43fc3c023c2d6..0be1489687b28b7648766f0cdad770cc79982971
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -1,6 +1,7 @@
 import { spawn } from 'node:child_process';
 import { once } from 'node:events';
-import { join, resolve } from 'node:path';
+import { createHash } from 'node:crypto';
+import { dirname, join, resolve } from 'node:path';
 import { tmpdir } from 'node:os';
 import { describe, expect, it, vi } from 'vitest';
 import {
@@ -27,9 +28,10 @@
   stopMcpClient,
   profiledTurnContextArguments,
   persistD569IntegrityStop,
+  type ConversationBoardSnapshotService,
 } from '../../../tools/ai-dm-conversation';
 import { buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
-import { mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
+import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
 import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
 import { armorClass, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
 import type { EncounterCommand } from '../../../src/combat/events';
@@ -559,15 +561,89 @@
     expect(readFileSync(proposalSpoolPath, 'utf8')).toBe('{"staged":"unconsumed"}\n');
   });
 
-  it('persists a runner forensic row before propagating conflicting startup evidence', async () => {
+  it('classifies a timeout after catalog observation but before a tool call without an integrity STOP', async () => {
+    const directory = mkdtempSync(join(tmpdir(), 'd569-runner-catalog-timeout-'));
+    const outPath = join(directory, 'rows.jsonl');
+    const boardSnapshotService: ConversationBoardSnapshotService = {
+      outputDirectory: directory,
+      capture: async (input) => {
+        const png = Buffer.alloc(24);
+        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
+        png.writeUInt32BE(1, 16);
+        png.writeUInt32BE(1, 20);
+        const digest = createHash('sha256').update(png).digest('hex');
+        const relativePath = `board-images/${digest}.png` as const;
+        mkdirSync(join(directory, 'board-images'), { recursive: true });
+        writeFileSync(join(directory, relativePath), png);
+        const html = Buffer.from('<!doctype html><main>timeout evidence</main>\n');
+        const htmlDigest = createHash('sha256').update(html).digest('hex');
+        const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
+        mkdirSync(join(directory, 'board-html', htmlDigest), { recursive: true });
+        writeFileSync(join(directory, htmlRelativePath), html);
+        return {
+          version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
+          relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
+          capturedAtUnixMs: 1, captureMs: 0, source: { ...input.source },
+          chromiumVersion: 'SIMULATED Chromium',
+          html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
+        };
+      },
+      close: async () => undefined,
+    };
+    const adapter: AgentSessionAdapter = {
+      kind: 'codex',
+      probe: async () => ({ present: true, version: 'SIMULATED' }),
+      start: async (invocation) => {
+        if (invocation.engineDispatchId === undefined) throw new Error('Timeout fixture lacks dispatch identity.');
+        return {
+          exit: 'timed_out', resumeSessionId: null, sessionId: 'partial-timeout-session',
+          finalText: 'catalog observed before timeout', usage: null, timeoutMs: 180_000,
+          processEvidence: {
+            startedAtUnixMs: 10, endedAtUnixMs: 20, exitCode: null, signal: 'SIGTERM',
+            stdout: 'catalog observed before timeout', stderr: '', decodedEvents: [],
+          },
+          partialResultEvidence: {
+            status: 'partial', decodedEventCount: 1, finalTextFragment: 'catalog observed before timeout',
+            observedUsage: null, stagedInvocationIds: [],
+          },
+          engineCatalogEvidence: {
+            status: 'inconclusive', dispatchId: invocation.engineDispatchId,
+            reason: 'no_correlated_catalog',
+          },
+        };
+      },
+      resume: async () => { throw new Error('Timeout fixture unexpectedly resumed.'); },
+      classifyFailure: () => 'unknown',
+    };
+    const result = await runConversation(parseConversationArgs([
+      '--rooms', '1', '--rounds', '1', '--out', outPath,
+      '--dm-mode', 'advice', '--dry-run',
+    ]), { adapter, boardSnapshotService });
+    expect(result.rows[0]).toMatchObject({
+      outcome: 'refused', fallbackReason: 'timeout',
+      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
+      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+    });
+  });
+
+  it('persists delivered context and process evidence before propagating conflicting startup evidence', async () => {
     const directory = mkdtempSync(join(tmpdir(), 'd569-runner-startup-integrity-'));
     const outPath = join(directory, 'rows.jsonl');
+    let launcherToken: string | null = null;
     const adapter: AgentSessionAdapter = {
       kind: 'codex',
       probe: async () => ({ present: true, version: 'SIMULATED' }),
       start: async (invocation) => {
+        launcherToken = invocation.launcherToken;
         const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
         if (manifest.dispatchId === undefined) throw new Error('Integrity fixture launcher lacks dispatch identity.');
+        if (manifest.turnContextSpoolPath === undefined || manifest.dispatchPhase === undefined) {
+          throw new Error('Integrity fixture launcher lacks a context spool.');
+        }
+        writeFileSync(manifest.turnContextSpoolPath, `${JSON.stringify({
+          granularity: 'full', semantic_board: { provenance: { format: 'test-semantic-board-v1' } },
+          dispatchId: manifest.dispatchId, dispatchProfile: 'dm', dispatchPhase: manifest.dispatchPhase,
+        })}\n`, 'utf8');
         return {
           exit: 'infrastructure_failed', resumeSessionId: null, sessionId: 'partial-session',
           finalText: 'partial startup output', usage: null,
@@ -596,7 +672,14 @@
     expect(JSON.parse(readFileSync(outPath, 'utf8'))).toMatchObject({
       rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
-      turnContextDelivery: { status: 'indeterminate' },
+      turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
+    });
+    if (launcherToken === null) throw new Error('Integrity fixture did not observe its launcher.');
+    const artifactPath = join(dirname(launcherToken), 'room-1-round-1-dispatch-integrity.json');
+    expect(JSON.parse(readFileSync(artifactPath, 'utf8'))).toMatchObject({
+      delivery: { status: 'delivered' }, contextSpool: { recordCount: 1 },
+      processEvidence: { stdout: 'partial startup output', stderr: 'required engine startup failed' },
+      partialResultEvidence: { status: 'partial', finalTextFragment: 'partial startup output' },
     });
   });
 
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 1595b4303899bdbe0baa92f748484d131d1d9f43..7a7f5ebe2bdab03dd5bd8aa4704cc07e281f7e93
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -1,9 +1,25 @@
+import { createHash } from 'node:crypto';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
 import { describe, expect, it } from 'vitest';
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import { sha256 } from '../../../src/crypto/sha256';
+import type { EncounterState } from '../../../src/combat/encounter';
 import { applyRoomInitiativeProfile } from '../../../src/vtt/room-generator';
-import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
 import {
+  createEngineMcpRuntime,
+  decodeArenaFixtureText,
+  type EngineMcpLauncherManifest,
+} from '../../../src/vtt/mcp/entrypoint';
+import { BlindModelIngressRecorder, type BlindIngressRecord } from '../../../src/vtt/blind-model-ingress';
+import {
+  agentSessionIdFromCli,
+  type AgentInvocation,
+  type AgentSessionAdapter,
+  type AgentSessionBinding,
+  type AgentTurnResult,
+} from '../../../src/vtt/agent-session';
+import {
   analyzeRegisteredPrimaryPair,
   D569_PRIMARY_JUDGES,
   type D569PairedAnalysisDocuments,
@@ -27,7 +43,10 @@
 } from '../../../tools/d569-blind-experiment';
 import { canonicalD569SecondFamilyRegeneration } from '../../../tools/d569-second-family-manifest';
 import { BRUTAL_10_PROTOCOL, buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
-import { readFileSync } from '../../helpers/test-filesystem';
+import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
+import type { ConversationBoardSnapshotService } from '../../../tools/ai-dm-conversation';
+import type { BoardImageArtifact, BoardSnapshotCapture } from '../../../tools/ai-dm-board-snapshot';
+import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
 
 const PATCHED_COMMIT = 'd60a0571a4588879c65992a17ab95023911d17c1';
 const MANIFEST = JSON.parse(readFileSync(D569_EXPERIMENT_MANIFEST_PATH, 'utf8')) as D569ExperimentManifest;
@@ -40,6 +59,10 @@
 };
 const CELLS = dryRunD569Experiment(MANIFEST, access).filter((cell) =>
   cell.arm === 'gpt-5.6-luna-blind');
+const FIRST_BRUTAL_STATE = applyRoomInitiativeProfile(
+  decodeArenaFixtureText(readFileSync('tests/fixtures/arena-basis-brutal/seed-6203001.json', 'utf8')),
+  'derived_v1',
+);
 
 function historical(room: number, rep: number, sessionId: string | null) {
   return { room, round: rep, outcome: 'authorized', sessionId };
@@ -174,8 +197,9 @@
   };
 }
 
-function pairedDocuments(rows: readonly ReturnType<typeof current>[]): D569PairedAnalysisDocuments {
-  const rawRows = rows.flatMap((row) => ['gpt-5.6-luna-blind', 'gpt-5.6-luna-advice'].map((arm) => ({ ...row, arm })));
+function pairedDocuments(rows: readonly object[]): D569PairedAnalysisDocuments {
+  const rawRows: Readonly<Record<string, unknown>>[] = rows.flatMap((row) =>
+    ['gpt-5.6-luna-blind', 'gpt-5.6-luna-advice'].map((arm) => ({ ...row, arm })));
   const constructed = buildRerunPacket(rawRows, 569_575, BRUTAL_10_PROTOCOL);
   const packet = constructed.packet.entries.map((entry) => ({ ...entry }));
   const answerKey = constructed.answerKey.entries.map((entry) => ({ ...entry }));
@@ -201,6 +225,135 @@
   });
 }
 
+class D569CancellationSnapshotService implements ConversationBoardSnapshotService {
+  readonly outputDirectory = mkdtempSync(join(tmpdir(), 'd569-cancelled-delivery-board-'));
+
+  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
+    const png = Buffer.alloc(96);
+    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
+    png.writeUInt32BE(1, 16);
+    png.writeUInt32BE(1, 20);
+    Buffer.from(input.source.stateDigest, 'utf8').copy(png, 24, 0, 64);
+    const digest = createHash('sha256').update(png).digest('hex');
+    const relativePath = `board-images/${digest}.png` as const;
+    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
+    writeFileSync(join(this.outputDirectory, relativePath), png);
+    const html = Buffer.from('<!doctype html><main>D569 cancellation evidence</main>\n');
+    const htmlDigest = createHash('sha256').update(html).digest('hex');
+    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
+    mkdirSync(join(this.outputDirectory, 'board-html', htmlDigest), { recursive: true });
+    writeFileSync(join(this.outputDirectory, htmlRelativePath), html);
+    return {
+      version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
+      relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
+      capturedAtUnixMs: Date.now(), captureMs: 1, source: { ...input.source },
+      chromiumVersion: 'SIMULATED Chromium',
+      html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
+      blindState: {
+        informationMode: 'blind_state', role: 'dm_board', ordinal: 1,
+        primerVersion: MANIFEST.visualPins.blind.primerVersion,
+        glyphMode: MANIFEST.visualPins.blind.glyphMode,
+        captureTilePx: MANIFEST.visualPins.blind.captureTilePx,
+        domEvidence: {
+          optionSurfaceAbsent: true, nextEventPreviewAbsent: true,
+          coordinateLabels: 1, creatureBadges: 1, rosterEntries: 1, hpBars: 1,
+          legendEntries: 1, wallCells: 0, halfCoverCells: 0, threeQuartersCoverCells: 0,
+          difficultCells: 0, obscuredCells: 0, illuminatedCells: 0, fogMarks: 0,
+          doors: 0, objects: 0, hiddenMarks: 0, multiCellFootprints: 0,
+        },
+      },
+    };
+  }
+
+  async close(): Promise<void> { return undefined; }
+}
+
+class D569CancellationAfterDeliveryAdapter implements AgentSessionAdapter {
+  readonly kind = 'codex' as const;
+
+  constructor(private readonly state: EncounterState) {}
+
+  async probe() { return { present: true, version: 'D569-CANCELLATION-AFTER-DELIVERY' }; }
+
+  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
+    if (invocation.engineDispatchId === undefined) throw new Error('Cancellation fixture omitted dispatch identity.');
+    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
+    if (manifest.turnContextSpoolPath === undefined || manifest.blindIngressSpoolPath === undefined ||
+      manifest.dispatchPhase === undefined) {
+      throw new Error('Cancellation fixture launcher omitted blind evidence spools.');
+    }
+    const runtime = createEngineMcpRuntime(this.state, {
+      runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
+      requestId: manifest.requestId, phase: manifest.phase, correctionNumber: manifest.correctionNumber,
+      room: manifest.room, historyKind: manifest.historyKind, toolProfile: 'blind', dmMode: 'blind',
+    });
+    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
+      run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round', granularity: 'full',
+    }));
+    const deliveredContext = {
+      ...context,
+      semantic_board: {
+        provenance: { format: 'd569-cancellation-semantic-board-v1' },
+        cells: [{ badge: 1, relation: 'occupied' }],
+      },
+    };
+    writeFileSync(manifest.turnContextSpoolPath, `${JSON.stringify({
+      ...deliveredContext, dispatchId: invocation.engineDispatchId,
+      dispatchProfile: 'blind', dispatchPhase: manifest.dispatchPhase,
+    })}\n`, 'utf8');
+    const existing = readFileSync(manifest.blindIngressSpoolPath, 'utf8').split('\n')
+      .filter((line) => line.trim().length > 0)
+      .map((line) => JSON.parse(line) as BlindIngressRecord);
+    const ingress = new BlindModelIngressRecorder(existing);
+    ingress.record('turn_context', canonicalJson(deliveredContext));
+    writeFileSync(manifest.blindIngressSpoolPath,
+      `${ingress.records().map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
+    return {
+      exit: 'cancelled', resumeSessionId: agentSessionIdFromCli('d569-cancelled-delivery-session'),
+      sessionId: 'd569-cancelled-delivery-session', finalText: 'cancelled after context retrieval', usage: null,
+      cancellationReason: 'operator_cancelled_after_delivery',
+      processEvidence: {
+        startedAtUnixMs: 1, endedAtUnixMs: 2, exitCode: null, signal: 'SIGTERM',
+        stdout: 'context delivered', stderr: '', decodedEvents: [],
+      },
+      partialResultEvidence: {
+        status: 'partial', decodedEventCount: 1, finalTextFragment: 'cancelled after context retrieval',
+        observedUsage: null, stagedInvocationIds: [],
+      },
+      engineCatalogEvidence: {
+        status: 'ready', basis: 'advertised_tool_invoked', dispatchId: invocation.engineDispatchId,
+        advertisedInvocationCount: 1, resourceOperationCount: 0,
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
+async function produceCancellationAfterDeliveryRow(): Promise<Readonly<Record<string, unknown>>> {
+  const directory = mkdtempSync(join(tmpdir(), 'd569-runner-cancelled-delivery-'));
+  const service = new D569CancellationSnapshotService();
+  const state = structuredClone(FIRST_BRUTAL_STATE);
+  const rows = await runArena(parseArenaArgs([
+    '--rooms', '1', '--reps', '1', '--seed', '6203001', '--basis', 'brutal',
+    '--out', join(directory, 'rows.jsonl'), '--dm-mode', 'blind', '--cli', 'codex',
+    '--model', 'gpt-5.6-luna', '--effort', 'high',
+  ]), {
+    adapter: new D569CancellationAfterDeliveryAdapter(state), repoCommit: PATCHED_COMMIT,
+    heartbeat: () => undefined, boardSnapshotServiceFactory: async () => service,
+    fixtureStates: [state],
+  });
+  const produced = rows[0];
+  if (produced === undefined) throw new Error('Cancellation arena produced no row.');
+  return JSON.parse(JSON.stringify(produced)) as Readonly<Record<string, unknown>>;
+}
+
+const RUNNER_CANCELLATION_AFTER_DELIVERY_ROW = await produceCancellationAfterDeliveryRow();
+
 describe('D569 v5 replacement validation and paired analysis tools', () => {
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
     const originalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) => historical(
@@ -279,6 +432,31 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
+  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+    const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
+    expect(produced).toMatchObject({
+      outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
+      turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
+      failingDispatch: {
+        phase: 'primary', exit: 'cancelled',
+        turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
+      },
+    });
+    expect(produced['semanticBoardBytes']).toEqual(expect.any(Number));
+    expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
+    const failure = record(produced['failingDispatch']);
+    expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
+      .map((cell) => current(cell, 'authorized'));
+    packetRows[0] = produced;
+    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+
+    const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
+      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
+    registeredRows[0] = produced;
+    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+  });
+
   it('rejects incomplete v3 evidence objects', () => {
     expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
       const catalog = record(row['engineCatalogEvidence']);
diff --git a/tests/unit/vtt/turn-context-delivery.test.ts b/tests/unit/vtt/turn-context-delivery.test.ts
index cf61ac36f87f6c5a6842f06c252ed38414f0d20a..b49082c87e33e22545c327c15983068bc14df33a
--- a/tests/unit/vtt/turn-context-delivery.test.ts
+++ b/tests/unit/vtt/turn-context-delivery.test.ts
@@ -37,6 +37,7 @@
     expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: ready, delivered: { contextSha256: 'a'.repeat(64), measurement: { baseBytes: 10, semanticBytes: 2 } } })).toEqual({ status: 'delivered', dispatchId, contextSha256: 'a'.repeat(64), measurement: { baseBytes: 10, semanticBytes: 2 } });
     expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'not_requested', dispatchId, reason: 'catalog_ready_model_did_not_fetch', measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
+    expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('infrastructure_failed'), catalogEvidence: absent, delivered: null })).toEqual({ status: 'infrastructure_absent', dispatchId, measurement: null });
     expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'indeterminate', dispatchId, reason: 'catalog_inconclusive_empty_context_spool', measurement: null, integrityAction: 'stop_after_persist' });
   });
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index 373e02f0b516dde45c717c0e225b6af04a394edf..258e4c0e4b885e1d5070bad1611ab3c49b067705
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -31,6 +31,7 @@
   type HostContextDiagnostic,
   type TurnContextConfiguredCaps,
   type TurnContextDelivery,
+  type TurnContextMeasurement,
 } from '../src/vtt/turn-context-delivery';
 import { AgentSessionLifecycle } from '../src/vtt/agent-session-lifecycle';
 import { AGENT_ADAPTER_VERSION, resolveAgentAdapter } from '../src/vtt/agent-adapters';
@@ -899,7 +900,7 @@
   readonly stagedSpeculationTimeout?: boolean;
   /** SIMULATED-only recalculation dispatch that stages evidence before engine startup failure. */
   readonly failSpeculationRecalculation?: boolean;
-  /** SIMULATED-only speculative dispatch classified as required-engine infrastructure failure. */
+  /** SIMULATED-adapter injection of a returned required-engine infrastructure failure. */
   readonly failSpeculationInfrastructure?: boolean;
   /** Test-only join controls for end-of-round and exception-cleanup transition coverage. */
   readonly endRoundAfterSpeculationStartForTest?: boolean;
@@ -2131,6 +2132,28 @@
   return { raw: modelVisibleRaw, granularity, value };
 }
 
+function deliveredTurnContextMeasurement(context: CapturedTurnContext): TurnContextMeasurement {
+  const proseDocument =
+    (context.value['format'] === 'caveman_prose' || context.value['format'] === 'regular_prose') &&
+    typeof context.value['document'] === 'string';
+  if (proseDocument) {
+    return {
+      baseBytes: new TextEncoder().encode(context.raw).byteLength,
+      semanticBytes: 0,
+    };
+  }
+  const base = structuredClone(context.value) as Record<string, unknown>;
+  const semantic = base['semantic_board'];
+  delete base['semantic_board'];
+  delete base['semantic_board_truncated'];
+  return {
+    baseBytes: new TextEncoder().encode(JSON.stringify(base)).byteLength,
+    semanticBytes: semantic === undefined
+      ? 0
+      : new TextEncoder().encode(JSON.stringify(semantic)).byteLength,
+  };
+}
+
 function blindRendererEvidence(
   state: EncounterState,
   capsule: EngineStateCapsule,
@@ -2309,14 +2332,19 @@
   readonly proposalSpoolPath: string;
   readonly contextSpoolPath: string;
   readonly catalogEvidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
-  readonly delivery: Extract<TurnContextDelivery, { readonly status: 'indeterminate' }>;
+  readonly delivery: Extract<TurnContextDelivery, { readonly status: 'delivered' | 'indeterminate' }>;
   readonly turn: AgentTurnResult;
 }): never {
   if (input.turn.processEvidence === null) {
     throw new Error('Indeterminate integrity STOP requires complete process evidence.');
   }
   const contextSpool = spoolEvidence(input.contextSpoolPath);
-  if (contextSpool.recordCount !== 0) throw new Error('Indeterminate integrity STOP requires an empty correlated context spool.');
+  if (input.delivery.status === 'indeterminate' && contextSpool.recordCount !== 0) {
+    throw new Error('Indeterminate delivery requires an empty correlated context spool.');
+  }
+  if (input.delivery.status === 'delivered' && contextSpool.recordCount === 0) {
+    throw new Error('Delivered contradictory evidence requires a correlated context spool record.');
+  }
   const proposalSpool = spoolEvidence(input.proposalSpoolPath);
   const artifact: D569DispatchIntegrityArtifact & Pick<AgentTurnResult, 'processEvidence' | 'partialResultEvidence'> = {
     version: 1,
@@ -2329,7 +2357,7 @@
     partialResultEvidence: input.turn.partialResultEvidence,
     catalogEvidence: input.catalogEvidence,
     delivery: input.delivery,
-    contextSpool: { recordCount: 0, sha256: contextSpool.sha256 },
+    contextSpool,
     proposalSpool: { ...proposalSpool, stagedUnconsumed: true },
     recordedAtUnixMs: Date.now(),
   };
@@ -2735,6 +2763,7 @@
   readonly #stagedAdjustmentCorrectionTimeout: ReadonlySet<string>;
   readonly #stagedSpeculationTimeout: boolean;
   readonly #failSpeculationRecalculation: boolean;
+  readonly #failSpeculationInfrastructure: boolean;
   readonly #failCorrection: ReadonlySet<string>;
   readonly #remainingPrimaryFlaps: Map<string, number>;
   readonly #reactionGuidanceByRequest: Readonly<Record<string, ReactionGuidanceDeclaration>>;
@@ -2755,6 +2784,7 @@
     stagedAdjustmentCorrectionTimeout: readonly string[],
     stagedSpeculationTimeout: boolean,
     failSpeculationRecalculation: boolean,
+    failSpeculationInfrastructure: boolean,
     fail: readonly string[],
     primaryFlaps: Readonly<Record<string, number>>,
     reactionGuidanceByRequest: Readonly<Record<string, ReactionGuidanceDeclaration>>,
@@ -2771,6 +2801,7 @@
     this.#stagedAdjustmentCorrectionTimeout = new Set(stagedAdjustmentCorrectionTimeout);
     this.#stagedSpeculationTimeout = stagedSpeculationTimeout;
     this.#failSpeculationRecalculation = failSpeculationRecalculation;
+    this.#failSpeculationInfrastructure = failSpeculationInfrastructure;
     this.#failCorrection = new Set(fail);
     this.#remainingPrimaryFlaps = new Map(Object.entries(primaryFlaps));
     this.#reactionGuidanceByRequest = reactionGuidanceByRequest;
@@ -2813,6 +2844,23 @@
   ): Promise<AgentTurnResult> {
     const manifest = JSON.parse(await readFile(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
     const key = manifest.requestId.replace(/^request:/u, '');
+    if (invocation.callPhase === 'speculation' && this.#failSpeculationInfrastructure) {
+      await Promise.resolve();
+      if (manifest.dispatchId === undefined) throw new Error('Speculation launcher omitted dispatch id.');
+      return {
+        resumeSessionId: null, sessionId: null, finalText: '', usage: null,
+        exit: 'infrastructure_failed', failureReason: 'SIMULATED speculative engine startup failure',
+        component: 'engine_mcp_startup', processEvidence: null,
+        engineCatalogEvidence: {
+          status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: manifest.dispatchId,
+          corroboration: ['SIMULATED speculative engine startup failure'],
+        },
+        partialResultEvidence: {
+          status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null,
+          stagedInvocationIds: [],
+        },
+      };
+    }
     if (invocation.callPhase === 'speculation_recalculation' && this.#failSpeculationRecalculation) {
       await driveScriptedMcp(
         this.cwd, invocation.launcherToken, this.intelMode, true, false, null,
@@ -3391,13 +3439,14 @@
     catalogEvidence,
     delivered: correlatedContext === null ? null : {
       contextSha256: sha256(correlatedContext.raw),
-      measurement: {
-        baseBytes: new TextEncoder().encode(correlatedContext.raw).byteLength,
-        semanticBytes: 0,
-      },
+      measurement: deliveredTurnContextMeasurement(correlatedContext),
     },
   });
-  if (delivery.status !== 'indeterminate') return;
+  const contradictoryStartup = input.turn.exit === 'infrastructure_failed';
+  if (delivery.status !== 'indeterminate' && !contradictoryStartup) return;
+  if (delivery.status !== 'indeterminate' && delivery.status !== 'delivered') {
+    throw new Error('Contradictory startup evidence produced an unsupported delivery state.');
+  }
   persistD569IntegrityStop({
     artifactPath: input.artifactPath,
     rowPath: input.rowPath,
@@ -3428,10 +3477,7 @@
     catalogEvidence: catalog,
     delivered: context === null ? null : {
       contextSha256: sha256(context.raw),
-      measurement: {
-        baseBytes: new TextEncoder().encode(context.raw).byteLength,
-        semanticBytes: 0,
-      },
+      measurement: deliveredTurnContextMeasurement(context),
     },
   });
   return {
@@ -4056,6 +4102,7 @@
     options.stagedAdjustmentCorrectionTimeout ?? [],
     options.stagedSpeculationTimeout ?? false,
     options.failSpeculationRecalculation ?? false,
+    options.failSpeculationInfrastructure ?? false,
     options.failCorrection ?? [],
     options.flapPrimaryByRequest ?? {},
     options.reactionGuidanceByRequest ?? {},
@@ -4422,23 +4469,7 @@
       const inFlightSpeculation: { current: InFlightSpeculation | null } = { current: null };
       const applyJoinedSpeculativeInfrastructure = (
         completed: SpeculativeDispatchCompletion,
-        dispatchId: import('../src/vtt/agent-session').EngineDispatchId,
       ): boolean => {
-        if (options.failSpeculationInfrastructure === true && completed.turn?.exit !== 'infrastructure_failed') {
-          outcome = 'infrastructure_failed';
-          serviceNull = true;
-          refusals.push('SIMULATED speculative engine startup failure');
-          failingDispatch = {
-            phase: 'speculative', exit: 'infrastructure_failed', dispatchId,
-            engineCatalogEvidence: {
-              status: 'absent', basis: 'required_engine_initialization_failed', dispatchId,
-              corroboration: ['SIMULATED speculative engine startup failure'],
-            },
-            turnContextDelivery: { status: 'infrastructure_absent', dispatchId, measurement: null },
-            failureReason: 'SIMULATED speculative engine startup failure',
-          };
-          return true;
-        }
         if (completed.turn?.exit !== 'infrastructure_failed') return false;
         outcome = 'infrastructure_failed';
         serviceNull = true;
@@ -4579,23 +4610,7 @@
               { engineDispatchId: launcher.dispatchId, recoveryEngineDispatchId: launcher.recoveryDispatchId },
             );
             options.onAgentInvocation?.(speculativeInvocation);
-            const observedTurn = await adapter.start(speculativeInvocation, controller.signal);
-            const turn: AgentTurnResult = options.failSpeculationInfrastructure === true ? {
-              resumeSessionId: observedTurn.resumeSessionId, sessionId: observedTurn.sessionId,
-              finalText: observedTurn.finalText, usage: observedTurn.usage,
-              exit: 'infrastructure_failed', failureReason: 'SIMULATED speculative engine startup failure',
-              component: 'engine_mcp_startup', processEvidence: observedTurn.processEvidence,
-              engineCatalogEvidence: {
-                status: 'absent', basis: 'required_engine_initialization_failed',
-                dispatchId: launcher.dispatchId,
-                corroboration: ['SIMULATED speculative engine startup failure'],
-              },
-              partialResultEvidence: {
-                status: 'partial', decodedEventCount: observedTurn.partialResultEvidence.decodedEventCount,
-                finalTextFragment: observedTurn.finalText, observedUsage: observedTurn.usage,
-                stagedInvocationIds: [],
-              },
-            } : observedTurn;
+            const turn = await adapter.start(speculativeInvocation, controller.signal);
             const planningWallMs = clock() - dispatchStarted;
             const spools = dispatchSpools(launcher, turn);
             enforceCompletedDispatchIntegrity({
@@ -5382,14 +5397,14 @@
                 catalogEvidence: primaryCatalogEvidence,
                 delivered: correlatedContext === null ? null : {
                   contextSha256: sha256(correlatedContext.raw),
-                  measurement: {
-                    baseBytes: new TextEncoder().encode(correlatedContext.raw).byteLength,
-                    semanticBytes: 0,
-                  },
+                  measurement: deliveredTurnContextMeasurement(correlatedContext),
                 },
               });
               if (primaryCatalogEvidence.status === 'inconclusive' &&
-                primaryDelivery.status === 'indeterminate') {
+                (primaryDelivery.status === 'indeterminate' || turn.exit === 'infrastructure_failed')) {
+                if (primaryDelivery.status !== 'indeterminate' && primaryDelivery.status !== 'delivered') {
+                  throw new Error('Contradictory primary startup evidence produced an unsupported delivery state.');
+                }
                 persistD569IntegrityStop({
                   artifactPath: join(artifacts, `${key}-dispatch-integrity.json`),
                   rowPath: config.outPath,
@@ -6257,7 +6272,7 @@
               const boundaryStarted = clock();
               const completed = await pending.completion;
               if (completed.turn !== null) captureCallUsage(completed.turn, 'speculation');
-              if (applyJoinedSpeculativeInfrastructure(completed, pending.dispatchId)) {
+              if (applyJoinedSpeculativeInfrastructure(completed)) {
                 inFlightSpeculation.current = null;
                 throw new CellInfrastructureAbort('Speculative engine MCP infrastructure failed.');
               }
@@ -6538,7 +6553,7 @@
             const pending = inFlightSpeculation.current;
             pending.controller.abort();
             const completed = await pending.completion;
-            const joinedInfrastructureFailure = applyJoinedSpeculativeInfrastructure(completed, pending.dispatchId);
+            const joinedInfrastructureFailure = applyJoinedSpeculativeInfrastructure(completed);
             speculation = {
               status: 'discarded', proposed: true, adopted: false, discarded: true,
               discardReason: 'target_disappeared',
@@ -6571,7 +6586,7 @@
           const pending = inFlightSpeculation.current;
           pending.controller.abort();
           const completed = await pending.completion;
-          const joinedInfrastructureFailure = applyJoinedSpeculativeInfrastructure(completed, pending.dispatchId);
+          const joinedInfrastructureFailure = applyJoinedSpeculativeInfrastructure(completed);
           speculation = {
             status: 'discarded', proposed: true, adopted: false, discarded: true,
             discardReason: 'target_disappeared',
@@ -6700,15 +6715,6 @@
             config.turnContextMaximumBytes,
           ).rendering;
       if (rendererEvidence === undefined) throw new Error('Turn-context renderer emitted no attribution evidence.');
-      if (primaryDelivery?.status === 'delivered') {
-        primaryDelivery = {
-          ...primaryDelivery,
-          measurement: {
-            baseBytes: rendererEvidence.baseContextBytes,
-            semanticBytes: rendererEvidence.semanticBoardBytes,
-          },
-        };
-      }
       options.rendererEvidenceCache?.set(rendererEvidenceCacheKey, rendererEvidence);
       const optionsOmittedForSize = rendererEvidence.optionsOmittedForSizeByActor
         .reduce((total, actor) => total + actor.count, 0);
@@ -6752,7 +6758,7 @@
             root: knowledgeBase.componentSha256.root,
             tactics: knowledgeBase.componentSha256.tactics,
             ...Object.fromEntries(Object.entries(knowledgeBase.componentSha256.subjects)
-              .map(([subject, hash]) => [`subject:${subject}`, hash])),
+              .map(([subject, hash]) => [subject, hash])),
           }
         : {};
       const d569AdviceFields = config.dmModeExplicit && config.dmMode === 'advice'
@@ -6835,6 +6841,9 @@
         });
         const contextRecord = rowTurnContext.value;
         const deliveredContext = primaryDelivery.status === 'delivered';
+        const deliveredMeasurement = primaryDelivery.status === 'delivered'
+          ? primaryDelivery.measurement
+          : null;
         const creatureFacts = !deliveredContext ? null
           : requiredRecord(contextRecord['creature_facts'], 'blind creature_facts');
         const legalMovement = !deliveredContext ? null
@@ -6924,13 +6933,13 @@
               };
             }) : [],
           } }),
-          ...(deliveredContext ? { turnContextBudget: {
+          ...(deliveredMeasurement === null ? {} : { turnContextBudget: {
             configuredBaseBytes: BLIND_TURN_CONTEXT_MAX_BYTES,
             configuredSemanticBytes: BLIND_SEMANTIC_BOARD_MAX_BYTES,
-            actualBaseBytes: rendererEvidence.baseContextBytes,
-            actualSemanticBytes: rendererEvidence.semanticBoardBytes,
+            actualBaseBytes: deliveredMeasurement.baseBytes,
+            actualSemanticBytes: deliveredMeasurement.semanticBytes,
             truncatedBlocks: [],
-          } } : {}),
+          } }),
           blindPrivateAnswerKey: {
             selectedOfferedIds,
             semanticDigests: finalSubmission?.resolution.status === 'accepted'
@@ -6974,8 +6983,12 @@
           policyVersion: RENDERER_POLICY_VERSION,
           profile: config.rendererProfile,
         },
-        semanticBoardBytes: deliveredPrimaryContext ? rendererEvidence.semanticBoardBytes : null,
-        baseContextBytes: deliveredPrimaryContext ? rendererEvidence.baseContextBytes : null,
+        semanticBoardBytes: primaryDelivery?.status === 'delivered'
+          ? primaryDelivery.measurement.semanticBytes
+          : deliveredPrimaryContext ? rendererEvidence.semanticBoardBytes : null,
+        baseContextBytes: primaryDelivery?.status === 'delivered'
+          ? primaryDelivery.measurement.baseBytes
+          : deliveredPrimaryContext ? rendererEvidence.baseContextBytes : null,
         semanticBoardTruncated: deliveredPrimaryContext ? rendererEvidence.semanticBoardTruncated : [],
         circumstanceFeatures: deliveredPrimaryContext ? rendererEvidence.features : {
           ...rendererEvidence.features,
