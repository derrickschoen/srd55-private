Implemented and verified all S6 R3 findings F62–F68.

Key changes:

- Worker port invocation numbers are single-use and rejected before dispatch on reuse.
- Terminal Worker faults now close the transport, settle pending requests while preserving established receipts, remove listeners, close ports, and terminate shared hosts.
- Lifecycle state is rechecked after getters and around structured cloning.
- Worker connections carry host-established DM/player principals.
- Multiple bindings share one authoritative in-Worker session; independent session keys remain isolated.
- Player projections hide the synthetic hidden token, enforce ownership, and support offered-ID movement.
- Worker message validation uses the authoritative Zod `_zod.run` path, with pinned-4.4.3 warm-up and upgrade warning.
- The platform boundary gate now resolves aliases through TypeScript symbols and detects destructuring, computed globals, and both prefixed/bare Node builtins.
- Execution-level adapter measurement covers open, valid/invalid requests, snapshots, and mutation events: `JSON.parse=0`, `JSON.stringify=0`, `structuredClone=0`.
- No accepted S4/S5 runtime or service files were changed.

Changed files:

- `src/vtt/handoff/worker-entry.ts`
- `src/vtt/handoff/worker-harness.ts`
- `src/vtt/handoff/worker-messages.ts`
- `src/vtt/handoff/worker-transport.ts`
- `tests/browser/vtt-handoff/worker.spec.ts`
- `tests/unit/vtt/engine-boundary.test.ts`
- `tests/unit/vtt/worker-boundary.test.ts`

Verification:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- `npm run test:engine` — 4 files, 42/42 tests passed.
- `npm run test:protocol` — 4 files, 64/64 tests passed.
- Worker/boundary targeted command — 2 files, 25/25 tests passed.
- `tests/unit/vtt/serve-existing-dist.test.ts` — 4/4 passed.
- Final 22-file cumulative command included the 14 S0–S5b contracts plus Worker, dist-server, projection, persistence, lifecycle, save-manager, bridge, and live-path specs — 22 files, 268/268 tests passed.
- Final focused zero-serialization run — 1 passed, 19 filtered; measured `0/0/0`.

Browser proofs:

- Development: 1/1 passed.
  `artifact=dev page=http://127.0.0.1:4410/vtt-handoff`
- Production build: 712 modules transformed; 123 dist files scanned; no `worker-entry-*.ts`.
- Emitted Worker: `worker-entry-BYRDPTE1.js`
- Stamp/hash:
  `artifact=dist commit=0ab4b5709c2c714f3db6f66ff3f4014d8c47081e worker=http://127.0.0.1:4410/assets/worker-entry-BYRDPTE1.js sha256=36b48a1c181a34351e59cab38fda298dba4afb9e8810405d919c505711b825c7`
- Dist Playwright: 1/1 passed.

Mutation control:

- Pre-mutation `worker-transport.ts` SHA-256: `2a433d7ac3cf8c5fe2a1db7eeaa74970ad55ac7db12d093c906db64c33f8697e`.
- Temporarily inserted aliased `JSON.stringify` in the real request adapter.
- Focused test went red: exit 1, observed `stringify: 4`.
- Restored byte-identically to the same SHA-256.
- Restored test went green with `0/0/0`.

No `it()` blocks were removed. Replaced assertions were strengthened:

- Initial sequence `[1]` became contiguous multi-event sequence verification.
- Clone counts expanded from the open-only path to exact `{client:4, worker:8}` across all measured operations.
- Manual-close correlation failure became automatic terminal typed-fault cleanup plus subsequent-request rejection.
- Direct observer closure became getter-triggered observer closure while preserving the established receipt.
- Scene identity is now pinned to the exact explicit test session key.

Protected state remains unchanged:

- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Examples fixture SHA-256: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`
- No changes under `contracts/`, `fixtures/scenes/`, `docs/`, `.claude/`, S8 surfaces, or frozen contract.
- No git write commands were used.

HANDOFF S6 R3 DONE
diff --git a/src/vtt/handoff/worker-entry.ts b/src/vtt/handoff/worker-entry.ts
index 7b5b9967e8366d161967a76a9c281bb3628b8115..9570300f566b71df57cd4cf1de081584616b445c
--- a/src/vtt/handoff/worker-entry.ts
+++ b/src/vtt/handoff/worker-entry.ts
@@ -9,9 +9,10 @@
 } from './fixtures/two-room';
 import { NamedWorkerMemorySessionStore } from './worker-memory-session-store';
 import {
-  workerClientMessageSchema, type WorkerConnectMessage, type WorkerServerMessage,
+  decodeWorkerClientMessage, type WorkerConnectMessage, type WorkerServerMessage,
 } from './worker-messages';
 import { ProtocolRuntime } from './protocol-runtime';
+import type { HandoffPrincipal } from './session-authorizer';
 
 function post(port: MessagePort, message: WorkerServerMessage): void {
   port.postMessage(message);
@@ -30,13 +31,29 @@
   };
 }
 
-export function attachHandoffWorkerPort(
-  port: MessagePort,
-  options: { readonly startAutonomous?: boolean } = {},
-): () => void {
-  const state = buildTwoRoomEncounter();
-  const store = new NamedWorkerMemorySessionStore('vtt-handoff-worker-memory');
-  const host = new DmEncounterHost('scene:vtt-handoff-worker', store, {
+interface WorkerSession {
+  readonly key: string;
+  readonly service: EncounterSessionService;
+  readonly seats: readonly PlayerSeatRegistration[];
+  bindings: number;
+  startPromise: Promise<void> | null;
+}
+
+const workerSessions = new Map<string, WorkerSession>();
+let anonymousSessionSequence = 0;
+
+function createWorkerSession(key: string): WorkerSession {
+  const baseState = buildTwoRoomEncounter();
+  const state: EncounterState = {
+    ...baseState,
+    hiddenCombatants: [{
+      combatant: TWO_ROOM_ADVENTURER_ID,
+      stealthTotal: 99,
+      edition: baseState.rulesEdition,
+    }],
+  };
+  const store = new NamedWorkerMemorySessionStore(`vtt-handoff-worker-memory:${key}`);
+  const host = new DmEncounterHost(`scene:vtt-handoff-worker:${key}`, store, {
     initialState: state,
     initialSeed: encounterSeed(TWO_ROOM_SEED),
     initialControllers: state.combatants.map((combatant, index) => ({
@@ -58,10 +75,56 @@
       .filter((binding) => binding.combatantId === combatant.profile.id)
       .map((binding) => binding.tokenId),
   }));
-  const service = new EncounterSessionService(host, seats);
-  const runtime = new ProtocolRuntime({ service, principal: { role: 'dm' }, seats, art: twoRoomArtPackage() });
+  return { key, service: new EncounterSessionService(host, seats), seats, bindings: 0, startPromise: null };
+}
+
+function workerSession(key: string): WorkerSession {
+  const existing = workerSessions.get(key);
+  if (existing !== undefined) return existing;
+  const created = createWorkerSession(key);
+  workerSessions.set(key, created);
+  return created;
+}
+
+function startWorkerSession(session: WorkerSession): Promise<void> {
+  session.startPromise ??= new Promise<void>((resolve, reject) => {
+    let unsubscribe = (): void => undefined;
+    unsubscribe = session.service.subscribeDm((event) => {
+      if (event.kind !== 'offer') return;
+      unsubscribe();
+      resolve();
+    });
+    void session.service.start().catch((error: unknown) => {
+      unsubscribe();
+      reject(error);
+    });
+  });
+  return session.startPromise;
+}
+
+export interface AttachHandoffWorkerOptions {
+  readonly startAutonomous?: boolean;
+  readonly sessionKey?: string;
+  readonly principal?: HandoffPrincipal;
+  readonly responseBarrier?: () => Promise<void>;
+}
+
+export function attachHandoffWorkerPort(
+  port: MessagePort,
+  options: AttachHandoffWorkerOptions = {},
+): () => void {
+  const sessionKey = options.sessionKey ?? `anonymous:${String(++anonymousSessionSequence)}`;
+  const session = workerSession(sessionKey);
+  session.bindings += 1;
+  const runtime = new ProtocolRuntime({
+    service: session.service,
+    principal: options.principal ?? { role: 'dm' },
+    seats: session.seats,
+    art: twoRoomArtPackage(),
+  });
   const invocations = new Map<SessionInvocationToken, number>();
-  let started = false;
+  const seenInvocations = new Set<number>();
+  let detached = false;
   const unsubscribeEvent = runtime.subscribe((event, receipt) => {
     const receiptInvocation = receipt === undefined ? undefined : invocations.get(receipt.invocationToken);
     post(port, {
@@ -74,8 +137,8 @@
   });
   const unsubscribeFault = runtime.subscribeFaults((fault) => post(port, { kind: 'fault', fault }));
   const onMessage = (messageEvent: MessageEvent<unknown>): void => {
-    const decoded = workerClientMessageSchema.safeParse(messageEvent.data);
-    if (!decoded.success) {
+    const message = decodeWorkerClientMessage(messageEvent.data);
+    if (message === null) {
       post(port, {
         kind: 'fault',
         fault: {
@@ -85,32 +148,31 @@
       });
       return;
     }
-    const message = decoded.data;
     if (message.kind === 'request') {
+      if (seenInvocations.has(message.invocation)) {
+        post(port, {
+          kind: 'fault',
+          fault: {
+            kind: 'transport_fault', code: 'PROTOCOL_ERROR',
+            message: 'Worker request invocation was already consumed.', websocketCloseCode: 1002,
+          },
+        });
+        return;
+      }
+      seenInvocations.add(message.invocation);
       const token = runtime.createInvocationToken();
       invocations.set(token, message.invocation);
       void runtime.dispatch(message.request, undefined, token).then(async (result) => {
         invocations.delete(token);
+        await options.responseBarrier?.();
         if (result.kind === 'transport_fault') {
           post(port, { kind: 'request-fault', invocation: message.invocation, fault: result.fault });
           return;
         }
-        if (options.startAutonomous !== false && !started && result.response.ok && result.response.id !== undefined) {
+        if (options.startAutonomous !== false && result.response.ok && result.response.id !== undefined) {
           const request = message.request;
           if (typeof request === 'object' && request !== null && Reflect.get(request, 'method') === 'session.open') {
-            started = true;
-            await new Promise<void>((resolve, reject) => {
-              let unsubscribe = (): void => undefined;
-              unsubscribe = service.subscribeDm((event) => {
-                if (event.kind !== 'offer') return;
-                unsubscribe();
-                resolve();
-              });
-              void service.start().catch((error: unknown) => {
-                unsubscribe();
-                reject(error);
-              });
-            });
+            await startWorkerSession(session);
           }
         }
         post(port, { kind: 'response', invocation: message.invocation, response: result.response });
@@ -123,39 +185,48 @@
       });
       return;
     }
+    release(message.kind, true);
+  };
+  const release = (kind: 'close' | 'dispose' | 'destroy', notifyPeer: boolean): void => {
+    if (detached) return;
+    detached = true;
+    let cleanupFailed = false;
     try {
-      if (message.kind === 'close') runtime.close();
-      else if (message.kind === 'dispose') runtime.dispose();
+      if (kind === 'close') runtime.close();
+      else if (kind === 'dispose') runtime.dispose();
       else runtime.destroySession();
     } catch {
-      post(port, {
-        kind: 'fault',
-        fault: {
-          kind: 'transport_fault', code: 'PROTOCOL_ERROR',
-          message: 'Worker session cleanup failed.', websocketCloseCode: 1002,
-        },
-      });
+      cleanupFailed = true;
     } finally {
+      port.removeEventListener('message', onMessage);
       unsubscribeEvent();
       unsubscribeFault();
       invocations.clear();
-      post(port, { kind: 'closed' });
+      seenInvocations.clear();
+      session.bindings -= 1;
+      if (kind === 'destroy') workerSessions.delete(session.key);
+      if (session.bindings === 0 && kind !== 'destroy') {
+        workerSessions.delete(session.key);
+        try { runtime.destroySession(); } catch { cleanupFailed = true; }
+      }
+      if (notifyPeer) {
+        if (cleanupFailed) {
+          post(port, {
+            kind: 'fault',
+            fault: {
+              kind: 'transport_fault', code: 'PROTOCOL_ERROR',
+              message: 'Worker session cleanup failed.', websocketCloseCode: 1002,
+            },
+          });
+        }
+        post(port, { kind: 'closed' });
+      }
       port.close();
     }
   };
   port.addEventListener('message', onMessage);
   port.start();
-  return () => {
-    port.removeEventListener('message', onMessage);
-    unsubscribeEvent();
-    unsubscribeFault();
-    try {
-      runtime.destroySession();
-    } finally {
-      invocations.clear();
-      port.close();
-    }
-  };
+  return () => release('dispose', false);
 }
 
 interface WorkerScope {
@@ -167,6 +238,12 @@
   const data: unknown = event.data;
   if (
     typeof data === 'object' && data !== null &&
-    Reflect.get(data, 'kind') === 'vtt-handoff.connect' && Reflect.get(data, 'port') instanceof MessagePort
-  ) attachHandoffWorkerPort(Reflect.get(data, 'port') as MessagePort);
+    Reflect.get(data, 'kind') === 'vtt-handoff.connect' &&
+    Reflect.get(data, 'port') instanceof MessagePort &&
+    typeof Reflect.get(data, 'sessionKey') === 'string' &&
+    typeof Reflect.get(data, 'principal') === 'object' && Reflect.get(data, 'principal') !== null
+  ) attachHandoffWorkerPort(Reflect.get(data, 'port') as MessagePort, {
+    sessionKey: Reflect.get(data, 'sessionKey') as string,
+    principal: Reflect.get(data, 'principal') as HandoffPrincipal,
+  });
 });
diff --git a/src/vtt/handoff/worker-harness.ts b/src/vtt/handoff/worker-harness.ts
index d2b30a6dc6347521b83446798669af2446d93eeb..0b1b195482dfb5619fe4551740b022c874122a74
--- a/src/vtt/handoff/worker-harness.ts
+++ b/src/vtt/handoff/worker-harness.ts
@@ -1,8 +1,10 @@
 import type { HandoffResponse } from './protocol-runtime';
 import { SceneTransportFaultError } from './scene-transport';
-import { createHandoffWorkerTransport, type WorkerSceneTransport } from './worker-transport';
+import { createHandoffWorkerHost, type HandoffWorkerHost, type WorkerSceneTransport } from './worker-transport';
 import type { SceneSnapshot } from './v1/contracts';
 
+const WORKER_GOBLIN_PLAYER_ID = 'combatant:two-room-goblin';
+
 interface ArtifactMarker {
   readonly artifact: 'dev' | 'dist';
   readonly commit?: string;
@@ -16,6 +18,7 @@
   readonly eventSequences: readonly number[];
   readonly eventRevisions: readonly number[];
   readonly snapshot: SceneSnapshot | null;
+  readonly playerSnapshot: SceneSnapshot | null;
   readonly lastResponse: HandoffResponse | null;
   readonly lastFault: string | null;
 }
@@ -23,8 +26,11 @@
 export interface WorkerHarnessApi {
   state(): WorkerHarnessState;
   request(request: unknown): Promise<HandoffResponse>;
+  playerRequest(request: unknown): Promise<HandoffResponse>;
   malformed(): Promise<string>;
   reconnect(): Promise<WorkerHarnessState>;
+  close(): void;
+  destroySession(): void;
   dispose(): void;
 }
 
@@ -123,7 +129,10 @@
   const marker = await artifactMarker();
   let generation = 0;
   let transport: WorkerSceneTransport | null = null;
+  let playerTransport: WorkerSceneTransport | null = null;
+  let workerHost: HandoffWorkerHost | null = null;
   let snapshot: SceneSnapshot | null = null;
+  let playerSnapshot: SceneSnapshot | null = null;
   let lastResponse: HandoffResponse | null = null;
   let lastFault: string | null = null;
   let eventSequences: number[] = [];
@@ -137,6 +146,7 @@
     eventSequences: [...eventSequences],
     eventRevisions: [...eventRevisions],
     snapshot,
+    playerSnapshot,
     lastResponse,
     lastFault,
   });
@@ -144,12 +154,20 @@
   const connect = async (): Promise<void> => {
     generation += 1;
     snapshot = null;
+    playerSnapshot = null;
     lastResponse = null;
     lastFault = null;
     eventSequences = [];
     eventRevisions = [];
-    const nextTransport = createHandoffWorkerTransport();
+    const sessionKey = `harness:${String(generation)}`;
+    const nextHost = createHandoffWorkerHost();
+    workerHost = nextHost;
+    const nextTransport = nextHost.connect({ sessionKey, principal: { role: 'dm' } });
+    const nextPlayerTransport = nextHost.connect({
+      sessionKey, principal: { role: 'player', playerId: WORKER_GOBLIN_PLAYER_ID },
+    });
     transport = nextTransport;
+    playerTransport = nextPlayerTransport;
     nextTransport.subscribe((event) => {
       snapshot = event.data;
       eventSequences.push(event.seq);
@@ -161,10 +179,18 @@
       lastFault = error.code;
       update();
     });
+    nextPlayerTransport.subscribe((event) => {
+      playerSnapshot = event.data;
+      update();
+    });
     const initialSnapshot = nextTransport.initialSnapshot();
     lastResponse = await nextTransport.request({
       v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
     });
+    await nextPlayerTransport.request({
+      v: 1, id: '', method: 'session.open',
+      params: { requestedRole: 'player', playerId: WORKER_GOBLIN_PLAYER_ID },
+    });
     await initialSnapshot;
     update();
   };
@@ -174,6 +200,10 @@
     if (transport === null) throw new Error('The VTT handoff Worker is not connected.');
     return transport;
   };
+  const activePlayerTransport = (): WorkerSceneTransport => {
+    if (playerTransport === null) throw new Error('The player VTT handoff Worker is not connected.');
+    return playerTransport;
+  };
   api = {
     state,
     async request(request) {
@@ -181,6 +211,11 @@
       update();
       return lastResponse;
     },
+    async playerRequest(request) {
+      const response = await activePlayerTransport().request(request);
+      update();
+      return response;
+    },
     async malformed() {
       try {
         await activeTransport().request('{');
@@ -193,17 +228,33 @@
       }
     },
     async reconnect() {
-      activeTransport().destroySession();
+      activeTransport().dispose();
+      activePlayerTransport().dispose();
+      workerHost?.terminate();
       await connect();
       return state();
     },
+    close() {
+      activeTransport().close();
+      update();
+    },
+    destroySession() {
+      activeTransport().destroySession();
+      update();
+    },
     dispose() {
       activeTransport().dispose();
+      activePlayerTransport().dispose();
+      workerHost?.terminate();
       update();
     },
   };
   window.__VTT_HANDOFF_HARNESS__ = api;
   update();
-  window.addEventListener('pagehide', () => activeTransport().dispose(), { once: true });
+  window.addEventListener('pagehide', () => {
+    activeTransport().dispose();
+    activePlayerTransport().dispose();
+    workerHost?.terminate();
+  }, { once: true });
   return api;
 }
diff --git a/src/vtt/handoff/worker-messages.ts b/src/vtt/handoff/worker-messages.ts
index 6f68dd5a0d5f50d5ce5bb13a0cb894a4f9db30bc..49ccde9a7962de0a88e2a968fb6e5f1371030ed2
--- a/src/vtt/handoff/worker-messages.ts
+++ b/src/vtt/handoff/worker-messages.ts
@@ -2,6 +2,7 @@
 import { handoffEventSchema, handoffResponseSchema } from './v1/contracts';
 import type { ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
 import type { HandoffResponse } from './protocol-runtime';
+import type { HandoffPrincipal } from './session-authorizer';
 
 const invocationSchema = z.number().int().safe().positive();
 const transportFaultSchema = z.strictObject({
@@ -29,6 +30,19 @@
   z.strictObject({ kind: z.literal('closed') }),
 ]);
 
+export function decodeWorkerClientMessage(input: unknown): WorkerClientMessage | null {
+  // Zod is pinned at 4.4.3; recheck this no-error-materialization path on every Zod upgrade.
+  const decoded = workerClientMessageSchema._zod.run({ value: input, issues: [] }, { async: false });
+  if (decoded instanceof Promise) throw new TypeError('Worker client messages must validate synchronously.');
+  return decoded.issues.length === 0 ? decoded.value as WorkerClientMessage : null;
+}
+
+export function decodeWorkerServerMessage(input: unknown): WorkerServerMessage | null {
+  const decoded = workerServerMessageSchema._zod.run({ value: input, issues: [] }, { async: false });
+  if (decoded instanceof Promise) throw new TypeError('Worker server messages must validate synchronously.');
+  return decoded.issues.length === 0 ? decoded.value as WorkerServerMessage : null;
+}
+
 export type WorkerClientMessage =
   | { readonly kind: 'request'; readonly invocation: number; readonly request: unknown }
   | { readonly kind: 'close' }
@@ -45,4 +59,46 @@
 export interface WorkerConnectMessage {
   readonly kind: 'vtt-handoff.connect';
   readonly port: MessagePort;
+  readonly sessionKey: string;
+  readonly principal: HandoffPrincipal;
 }
+
+// Compile every pinned Zod 4.4.3 message branch before adapter measurements begin.
+const warmSnapshot = {
+  sceneId: 'warm', revision: 0,
+  grid: { width: 1, height: 1, feetPerCell: 5 },
+  tiles: [{ id: 'tile', assetId: 'asset', x: 0, y: 0, z: 0 }],
+  props: [{ id: 'prop', assetId: 'asset', x: 0, y: 0, z: 0 }],
+  tokens: [{
+    id: 'token', label: 'Token', assetId: 'asset', x: 0, y: 0, z: 0,
+    facing: 0, footprint: { w: 1, h: 1 },
+  }],
+  walls: [{
+    id: 'wall', a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, baseZ: 0, height: 1,
+    blocksMovement: true, blocksVision: true, assetId: 'asset',
+  }],
+  doors: [{ id: 'door', wallId: 'wall', open: false, assetId: 'asset' }],
+  lights: [{
+    id: 'light', x: 0, y: 0, z: 0, radius: 1,
+    color: '#ffffff', intensity: 1, enabled: true,
+  }],
+  vision: { mode: 'cells' as const, visible: [[0, 0]], explored: [[0, 0]] },
+};
+for (const message of [
+  { kind: 'request', invocation: 1, request: null },
+  { kind: 'close' }, { kind: 'dispose' }, { kind: 'destroy' },
+] as const) decodeWorkerClientMessage(message);
+for (const message of [
+  { kind: 'response', invocation: 1, response: { v: 1, id: 'warm', ok: true, result: {} } },
+  { kind: 'response', invocation: 1, response: { v: 1, id: 'warm', ok: false, error: { code: 'WARM', message: 'warm' } } },
+  {
+    kind: 'request-fault', invocation: 1,
+    fault: { kind: 'transport_fault', code: 'PROTOCOL_ERROR', message: 'warm', websocketCloseCode: 1002 },
+  },
+  {
+    kind: 'fault',
+    fault: { kind: 'transport_fault', code: 'INVALID_JSON', message: 'warm', websocketCloseCode: 1007 },
+  },
+  { kind: 'event', event: { v: 1, event: 'scene.snapshot', seq: 1, data: warmSnapshot } },
+  { kind: 'closed' },
+] as const) decodeWorkerServerMessage(message);
diff --git a/src/vtt/handoff/worker-transport.ts b/src/vtt/handoff/worker-transport.ts
index 3f664e3bb16ff31022d97b109fc8198b95be6041..8c8ac1d2b18350d306bab89a99dc1132f63a33cd
--- a/src/vtt/handoff/worker-transport.ts
+++ b/src/vtt/handoff/worker-transport.ts
@@ -1,9 +1,10 @@
-import { handoffEventSchema, handoffResponseSchema, type SceneSnapshot } from './v1/contracts';
+import type { SceneSnapshot } from './v1/contracts';
 import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
 import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus } from './scene-transport';
 import {
-  workerServerMessageSchema, type WorkerClientMessage, type WorkerConnectMessage,
+  decodeWorkerServerMessage, type WorkerClientMessage, type WorkerConnectMessage,
 } from './worker-messages';
+import type { HandoffPrincipal } from './session-authorizer';
 
 interface Pending {
   readonly id: string | null;
@@ -18,6 +19,11 @@
   try { return Reflect.get(input, key); } catch { return undefined; }
 }
 
+type InstallWorkerFailureHandlers = (
+  onError: () => void,
+  onMessageError: () => void,
+) => () => void;
+
 export class WorkerSceneTransport implements SceneTransport {
   readonly #pending = new Map<number, Pending>();
   readonly #events = new Set<(event: SceneSnapshotEvent) => void>();
@@ -28,23 +34,45 @@
   #initial: Promise<SceneSnapshot>;
   #resolveInitial: ((snapshot: SceneSnapshot) => void) | null = null;
   #rejectInitial: ((error: Error) => void) | null = null;
+  #removeWorkerFailureHandlers: () => void;
+  #finished = false;
 
-  constructor(readonly port: MessagePort, readonly terminate: () => void = () => port.close()) {
+  constructor(
+    readonly port: MessagePort,
+    readonly terminate: (terminalFault: boolean) => void = () => port.close(),
+    installWorkerFailureHandlers?: InstallWorkerFailureHandlers,
+  ) {
     this.#initial = new Promise((resolve, reject) => {
       this.#resolveInitial = resolve;
       this.#rejectInitial = reject;
     });
     void this.#initial.catch(() => undefined);
     port.addEventListener('message', this.#onMessage);
+    port.addEventListener('messageerror', this.#onPortMessageError);
+    this.#removeWorkerFailureHandlers = installWorkerFailureHandlers?.(
+      this.#onWorkerError,
+      this.#onWorkerMessageError,
+    ) ?? (() => undefined);
     port.start();
   }
 
   request(request: unknown): Promise<HandoffResponse> {
-    if (this.#status === 'closed' || this.#status === 'disposed') return Promise.reject(new SceneTransportClosedError());
+    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
+    if (this.#invocation === Number.MAX_SAFE_INTEGER) {
+      const fault = this.#fault('PROTOCOL_ERROR', 'Worker request invocation space was exhausted.');
+      this.#terminalFault(fault);
+      return Promise.reject(new SceneTransportFaultError(fault));
+    }
     this.#invocation += 1;
     const invocation = this.#invocation;
     const idValue = property(request, 'id');
     const methodValue = property(request, 'method');
+    const versionValue = property(request, 'v');
+    const paramsValue = property(request, 'params');
+    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
+    const outbound = typeof request === 'object' && request !== null
+      ? { v: versionValue, id: idValue, method: methodValue, params: paramsValue }
+      : request;
     let rejectRequest: ((error: Error) => void) | undefined;
     const promise = new Promise<HandoffResponse>((resolve, reject) => {
       rejectRequest = reject;
@@ -55,9 +83,14 @@
       });
     });
     try {
-      this.#post({ kind: 'request', invocation, request });
+      if (this.#terminal()) throw new SceneTransportClosedError();
+      this.#post({ kind: 'request', invocation, request: outbound });
     } catch {
       this.#pending.delete(invocation);
+      if (this.#terminal()) {
+        rejectRequest?.(new SceneTransportClosedError());
+        return promise;
+      }
       const fault: ProtocolTransportFault = {
         kind: 'transport_fault', code: 'PROTOCOL_ERROR',
         message: 'Worker request could not cross the message boundary.', websocketCloseCode: 1002,
@@ -69,6 +102,12 @@
     return promise;
   }
 
+  pendingRequestCount(): number { return this.#pending.size; }
+
+  hostTerminated(): void {
+    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker host terminated the shared connection.'));
+  }
+
   initialSnapshot(): Promise<SceneSnapshot> { return this.#initial; }
   subscribe(listener: (event: SceneSnapshotEvent) => void): () => void { this.#events.add(listener); return () => this.#events.delete(listener); }
   status(): SceneTransportStatus { return this.#status; }
@@ -83,46 +122,64 @@
   destroySession(): void { this.#shutdown('disposed', 'destroy'); }
 
   readonly #onMessage = (messageEvent: MessageEvent<unknown>): void => {
-    const decoded = workerServerMessageSchema.safeParse(messageEvent.data);
-    if (!decoded.success) { this.#protocolFault('Worker emitted an invalid message envelope.'); return; }
-    const message = decoded.data;
+    const message = decodeWorkerServerMessage(messageEvent.data);
+    if (message === null) {
+      this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an invalid message envelope.'));
+      return;
+    }
     if (message.kind === 'event') {
-      const parsed = handoffEventSchema.safeParse(message.event);
-      if (!parsed.success) { this.#protocolFault('Worker emitted an invalid event.'); return; }
       if (message.receiptInvocation !== undefined) {
         const pending = this.#pending.get(message.receiptInvocation);
-        if (pending !== undefined && (pending.method === 'token.move' || pending.method === 'door.set')) {
-          pending.receiptRevision = message.receiptRevision ?? null;
+        if (pending === undefined || (pending.method !== 'token.move' && pending.method !== 'door.set')) {
+          this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an uncorrelated mutation receipt.'));
+          return;
         }
+        pending.receiptRevision = message.receiptRevision ?? null;
       }
-      this.#resolveInitial?.(parsed.data.data);
+      this.#resolveInitial?.(message.event.data);
       this.#resolveInitial = null;
       this.#rejectInitial = null;
-      for (const listener of this.#events) { try { listener(parsed.data); } catch { /* Isolated observer. */ } }
+      for (const listener of this.#events) { try { listener(message.event); } catch { /* Isolated observer. */ } }
       return;
     }
     if (message.kind === 'fault') { this.#emitFault(message.fault); return; }
     if (message.kind === 'request-fault') {
       const pending = this.#pending.get(message.invocation);
-      if (pending !== undefined) { this.#pending.delete(message.invocation); pending.reject(new SceneTransportFaultError(message.fault)); }
+      if (pending === undefined) {
+        this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an uncorrelated request fault.'));
+        return;
+      }
+      this.#pending.delete(message.invocation);
+      pending.reject(new SceneTransportFaultError(message.fault));
       return;
     }
     if (message.kind === 'response') {
       const pending = this.#pending.get(message.invocation);
-      if (pending === undefined) return;
-      const parsed = handoffResponseSchema.safeParse(message.response);
-      if (!parsed.success || pending.id !== null && parsed.data.id !== pending.id) { this.#protocolFault('Worker response correlation failed.'); return; }
+      if (pending === undefined || pending.id !== null && message.response.id !== pending.id) {
+        this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker response correlation failed.'));
+        return;
+      }
       this.#pending.delete(message.invocation);
-      if (pending.method === 'session.open' && parsed.data.ok) this.#setStatus('open');
-      pending.resolve(parsed.data);
+      if (pending.method === 'session.open' && message.response.ok) this.#setStatus('open');
+      pending.resolve(message.response);
       return;
     }
-    this.#finishShutdown();
+    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker peer closed the transport.'));
+  };
+
+  readonly #onPortMessageError = (): void => {
+    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker port could not decode a message.'));
+  };
+  readonly #onWorkerError = (): void => {
+    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker execution failed.'));
+  };
+  readonly #onWorkerMessageError = (): void => {
+    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker could not decode a host message.'));
   };
 
   #post(message: WorkerClientMessage): void { this.port.postMessage(message); }
-  #protocolFault(message: string): void {
-    this.#emitFault({ kind: 'transport_fault', code: 'PROTOCOL_ERROR', message, websocketCloseCode: 1002 });
+  #fault(code: ProtocolTransportFault['code'], message: string): ProtocolTransportFault {
+    return { kind: 'transport_fault', code, message, websocketCloseCode: code === 'PROTOCOL_ERROR' ? 1002 : 1007 };
   }
   #emitFault(fault: ProtocolTransportFault): void {
     const error = new SceneTransportFaultError(fault);
@@ -134,13 +191,22 @@
     try {
       this.#post({ kind });
     } catch {
-      this.#protocolFault('Worker cleanup message could not cross the message boundary.');
+      this.#emitFault(this.#fault('PROTOCOL_ERROR', 'Worker cleanup message could not cross the message boundary.'));
     } finally {
-      this.#finishShutdown();
+      this.#finishShutdown(new SceneTransportClosedError(), false);
     }
   }
-  #finishShutdown(): void {
-    const error = new SceneTransportClosedError();
+  #terminal(): boolean { return this.#status === 'closed' || this.#status === 'disposed'; }
+  #terminalFault(fault: ProtocolTransportFault): void {
+    if (this.#terminal()) return;
+    const error = new SceneTransportFaultError(fault);
+    this.#setStatus('closed');
+    this.#emitFault(fault);
+    this.#finishShutdown(error, true);
+  }
+  #finishShutdown(error: Error, terminalFault: boolean): void {
+    if (this.#finished) return;
+    this.#finished = true;
     this.#rejectInitial?.(error);
     this.#resolveInitial = null;
     this.#rejectInitial = null;
@@ -151,10 +217,12 @@
       this.#pending.delete(invocation);
     }
     this.port.removeEventListener('message', this.#onMessage);
+    this.port.removeEventListener('messageerror', this.#onPortMessageError);
+    this.#removeWorkerFailureHandlers();
     this.#events.clear();
     this.#errors.clear();
     this.#statuses.clear();
-    this.terminate();
+    try { this.port.close(); } finally { this.terminate(terminalFault); }
   }
   #setStatus(status: SceneTransportStatus): void {
     if (this.#status === status) return;
@@ -163,13 +231,93 @@
   }
 }
 
-export function createHandoffWorkerTransport(): WorkerSceneTransport {
+export interface HandoffWorkerConnection {
+  readonly sessionKey: string;
+  readonly principal: HandoffPrincipal;
+}
+
+let defaultSessionSequence = 0;
+
+export function createHandoffWorkerTransport(
+  connection: HandoffWorkerConnection = {
+    sessionKey: `transport:${String(++defaultSessionSequence)}`,
+    principal: { role: 'dm' },
+  },
+): WorkerSceneTransport {
   const worker = new Worker(
     new URL('./worker-entry.ts', import.meta.url),
     { type: 'module', name: 'vtt-handoff-worker' },
   );
   const channel = new MessageChannel();
-  const connect: WorkerConnectMessage = { kind: 'vtt-handoff.connect', port: channel.port2 };
+  const connect: WorkerConnectMessage = {
+    kind: 'vtt-handoff.connect', port: channel.port2,
+    sessionKey: connection.sessionKey, principal: connection.principal,
+  };
   worker.postMessage(connect, [channel.port2]);
-  return new WorkerSceneTransport(channel.port1, () => worker.terminate());
+  return new WorkerSceneTransport(
+    channel.port1,
+    () => worker.terminate(),
+    (onError, onMessageError) => {
+      worker.addEventListener('error', onError);
+      worker.addEventListener('messageerror', onMessageError);
+      return () => {
+        worker.removeEventListener('error', onError);
+        worker.removeEventListener('messageerror', onMessageError);
+      };
+    },
+  );
+}
+
+export interface HandoffWorkerHost {
+  connect(connection: HandoffWorkerConnection): WorkerSceneTransport;
+  terminate(): void;
+}
+
+export function createHandoffWorkerHost(): HandoffWorkerHost {
+  const worker = new Worker(
+    new URL('./worker-entry.ts', import.meta.url),
+    { type: 'module', name: 'vtt-handoff-worker' },
+  );
+  const transports = new Set<WorkerSceneTransport>();
+  let terminated = false;
+  const terminate = (notifyConnections: boolean): void => {
+    if (terminated) return;
+    terminated = true;
+    worker.terminate();
+    if (notifyConnections) {
+      for (const transport of [...transports]) transport.hostTerminated();
+      transports.clear();
+    }
+  };
+  return {
+    connect(connection) {
+      if (terminated) throw new SceneTransportClosedError();
+      const channel = new MessageChannel();
+      const connect: WorkerConnectMessage = {
+        kind: 'vtt-handoff.connect', port: channel.port2,
+        sessionKey: connection.sessionKey, principal: connection.principal,
+      };
+      worker.postMessage(connect, [channel.port2]);
+      let transport: WorkerSceneTransport;
+      transport = new WorkerSceneTransport(
+        channel.port1,
+        (terminalFault) => {
+          transports.delete(transport);
+          if (terminalFault) terminate(true);
+          else if (transports.size === 0) terminate(false);
+        },
+        (onError, onMessageError) => {
+          worker.addEventListener('error', onError);
+          worker.addEventListener('messageerror', onMessageError);
+          return () => {
+            worker.removeEventListener('error', onError);
+            worker.removeEventListener('messageerror', onMessageError);
+          };
+        },
+      );
+      transports.add(transport);
+      return transport;
+    },
+    terminate: () => terminate(true),
+  };
 }
diff --git a/tests/browser/vtt-handoff/worker.spec.ts b/tests/browser/vtt-handoff/worker.spec.ts
index 565f50db346843b3a9c9611068b6a7a4ed2064cb..344520f5369f182098714ec2dd77cd0c6264bfa7
--- a/tests/browser/vtt-handoff/worker.spec.ts
+++ b/tests/browser/vtt-handoff/worker.spec.ts
@@ -4,10 +4,15 @@
 
 test('drives the v1 handoff across an actual module Worker', async ({ page }, testInfo) => {
   const workerUrls: string[] = [];
+  const pageErrors: string[] = [];
+  page.on('pageerror', (error) => pageErrors.push(error.message));
   page.on('request', (request) => {
     if (request.resourceType() === 'script' && /worker-entry/u.test(request.url())) workerUrls.push(request.url());
   });
   await page.goto('/vtt-handoff');
+  await page.waitForLoadState('domcontentloaded');
+  await page.waitForFunction(() => window.__VTT_HANDOFF_HARNESS__ !== undefined);
+  expect(pageErrors).toEqual([]);
   const state = page.getByTestId('handoff-state');
   await expect(state).toHaveAttribute('data-status', 'open');
 
@@ -22,8 +27,30 @@
   expect(initial.eventRevisions[0]).toBe(0);
   expect(initial.eventRevisions.at(-1)).toBeGreaterThan(0);
   expect(initial.snapshot?.revision).toBe(initial.eventRevisions.at(-1));
+  expect(initial.playerSnapshot?.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
   expect(workerUrls).toHaveLength(1);
 
+  const playerBoundary = await page.evaluate(async () => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    const forbidden = await api.playerRequest({
+      v: 1, id: 'player-cross-seat', method: 'token.move',
+      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
+    });
+    const moved = await api.playerRequest({
+      v: 1, id: 'player-move', method: 'token.move',
+      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+    });
+    return { forbidden, moved, playerSnapshot: api.state().playerSnapshot };
+  });
+  expect(playerBoundary.forbidden).toMatchObject({
+    id: 'player-cross-seat', ok: false, error: { code: 'FORBIDDEN' },
+  });
+  expect(playerBoundary.moved).toMatchObject({ id: 'player-move', ok: true });
+  expect(playerBoundary.playerSnapshot?.tokens).toEqual([
+    expect.objectContaining({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 }),
+  ]);
+
   const correlated = await page.evaluate(async () => {
     const api = window.__VTT_HANDOFF_HARNESS__;
     if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
@@ -99,6 +126,41 @@
   expect(reconnected.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(false);
   expect(workerUrls).toHaveLength(2);
 
+  for (const lifecycle of ['close', 'dispose', 'destroySession'] as const) {
+    const outcome = await page.evaluate(async (kind) => {
+      const api = window.__VTT_HANDOFF_HARNESS__;
+      if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+      const request = {
+        v: 1,
+        get id(): string {
+          if (kind === 'close') api.close();
+          else if (kind === 'dispose') api.dispose();
+          else api.destroySession();
+          return `getter-${kind}`;
+        },
+        method: 'scene.snapshot', params: {},
+      };
+      try {
+        await api.request(request);
+        return 'unexpected-success';
+      } catch (error: unknown) {
+        return error instanceof Error ? `${error.name}:${Reflect.get(error, 'code') as string}` : 'non-error';
+      }
+    }, lifecycle);
+    expect(outcome).toBe('SceneTransportClosedError:TRANSPORT_CLOSED');
+    const lifecycleState = await page.evaluate(() => {
+      const api = window.__VTT_HANDOFF_HARNESS__;
+      if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+      return api.state();
+    });
+    expect(lifecycleState.lastResponse?.id).not.toBe(`getter-${lifecycle}`);
+    await page.evaluate(async () => {
+      const api = window.__VTT_HANDOFF_HARNESS__;
+      if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+      await api.reconnect();
+    });
+  }
+
   await page.evaluate(() => {
     const api = window.__VTT_HANDOFF_HARNESS__;
     if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index a0b09a33e9ce37b9fec93ea5b0e7122d3a92451f..fa2ff699f09d1e2f4fcdb437b842be4fac2fcc6d
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -1,7 +1,11 @@
 import { dirname, relative, resolve } from 'node:path';
+import { builtinModules } from 'node:module';
+import { tmpdir } from 'node:os';
 import ts from 'typescript';
 import { describe, expect, it } from 'vitest';
-import { existsSync, readFileSync } from '../../helpers/test-filesystem';
+import {
+  existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
+} from '../../helpers/test-filesystem';
 
 const ROOT = process.cwd();
 const REDUCERS = new Set([
@@ -108,36 +112,96 @@
   return graph;
 }
 
+const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
+const FORBIDDEN_GLOBALS = new Set([
+  'document', 'window', 'indexedDB', 'IDBDatabase', 'IDBFactory', 'IDBObjectStore',
+  'HTMLCanvasElement', 'OffscreenCanvas', 'CanvasRenderingContext', 'CanvasRenderingContext2D',
+  'SharedArrayBuffer', 'Atomics', 'importScripts',
+]);
+
 function platformViolations(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
   const violations: string[] = [];
+  const program = ts.createProgram({
+    rootNames: [...graph.keys()],
+    options: {
+      module: ts.ModuleKind.ESNext,
+      moduleResolution: ts.ModuleResolutionKind.Bundler,
+      noLib: true,
+      skipLibCheck: true,
+      target: ts.ScriptTarget.ESNext,
+      types: [],
+    },
+  });
+  const checker = program.getTypeChecker();
+  const provenance = (node: ts.Expression, seen = new Set<ts.Symbol>()): string | null => {
+    if (ts.isPropertyAccessExpression(node)) {
+      const owner = provenance(node.expression, seen);
+      if (owner === 'globalThis' && FORBIDDEN_GLOBALS.has(node.name.text)) return node.name.text;
+      return owner !== null && FORBIDDEN_GLOBALS.has(owner) ? owner : null;
+    }
+    if (ts.isElementAccessExpression(node)) {
+      const owner = provenance(node.expression, seen);
+      const key = node.argumentExpression;
+      if (owner === 'globalThis' && key !== undefined && ts.isStringLiteralLike(key) && FORBIDDEN_GLOBALS.has(key.text)) return key.text;
+      return owner !== null && FORBIDDEN_GLOBALS.has(owner) ? owner : null;
+    }
+    if (!ts.isIdentifier(node)) return null;
+    if (node.text === 'globalThis') return 'globalThis';
+    let symbol = checker.getSymbolAtLocation(node);
+    if (FORBIDDEN_GLOBALS.has(node.text)) {
+      if (symbol === undefined) return node.text;
+      const declarations = symbol.getDeclarations() ?? [];
+      if (
+        declarations.length > 0 &&
+        declarations.every((declaration) => declaration.getSourceFile().isDeclarationFile)
+      ) return node.text;
+    }
+    if (symbol === undefined || seen.has(symbol)) return null;
+    seen.add(symbol);
+    if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = checker.getAliasedSymbol(symbol);
+    for (const declaration of symbol.getDeclarations() ?? []) {
+      if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
+        const source = provenance(declaration.initializer, seen);
+        if (source !== null) return source;
+      }
+      if (ts.isBindingElement(declaration)) {
+        const key = declaration.propertyName ?? declaration.name;
+        const variable = declaration.parent.parent;
+        if (
+          ts.isIdentifier(key) && FORBIDDEN_GLOBALS.has(key.text) &&
+          ts.isVariableDeclaration(variable) && variable.initializer !== undefined &&
+          provenance(variable.initializer, seen) === 'globalThis'
+        ) return key.text;
+      }
+    }
+    return null;
+  };
   for (const module of graph.values()) {
     for (const edge of module.imports) {
-      if (edge.specifier.startsWith('node:')) {
+      if (NODE_BUILTINS.has(edge.specifier)) {
         violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
       }
     }
+    const sourceFile = program.getSourceFile(module.file);
+    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
     const visit = (node: ts.Node): void => {
-      if (ts.isPropertyAccessExpression(node)) {
-        const expression = node.expression.getText(module.sourceFile);
-        if (
-          expression === 'document' ||
-          expression === 'indexedDB' ||
-          expression === 'globalThis.document' ||
-          expression === 'globalThis.window' ||
-          expression === 'globalThis.indexedDB'
-        ) {
-          violations.push(`${repositoryPath(module.file)} uses ${node.getText(module.sourceFile)}`);
-        }
-      }
+      const isPropertyLabel = ts.isIdentifier(node) && (
+        ts.isPropertyAccessExpression(node.parent) && node.parent.name === node ||
+        ts.isPropertyAssignment(node.parent) && node.parent.name === node ||
+        ts.isBindingElement(node.parent) && node.parent.propertyName === node
+      );
       if (
-        ts.isIdentifier(node) &&
-        /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u.test(node.text)
+        (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
+        !insideImport(node) && !isPropertyLabel
       ) {
-        violations.push(`${repositoryPath(module.file)} names ${node.text}`);
+        const forbidden = provenance(node);
+        if (forbidden !== null && forbidden !== 'globalThis') {
+          violations.push(`${repositoryPath(module.file)} resolves ${node.getText(sourceFile)} to ${forbidden}`);
+        }
       }
       ts.forEachChild(node, visit);
     };
-    ts.forEachChild(module.sourceFile, visit);
+    ts.forEachChild(sourceFile, visit);
   }
   return [...new Set(violations)].sort();
 }
@@ -335,6 +399,29 @@
     expect(platformViolations(graph)).toEqual([]);
   });
 
+  it('catches aliased, destructured, computed and bare-builtin Worker platform controls', () => {
+    const directory = mkdtempSync(resolve(tmpdir(), 'vtt-worker-boundary-'));
+    try {
+      const controls = resolve(directory, 'controls.ts');
+      writeFileSync(controls, `
+        const d = document;
+        d.createElement('div');
+        const { document: doc } = globalThis;
+        doc.createElement('span');
+        globalThis['SharedArrayBuffer'];
+        import fs from 'fs';
+        void fs;
+      `);
+      const violations = platformViolations(dependencyGraph([controls]));
+      expect(violations.some((violation) => violation.endsWith('imports fs'))).toBe(true);
+      expect(violations.some((violation) => violation.endsWith('to document'))).toBe(true);
+      expect(violations.some((violation) => violation.endsWith('to SharedArrayBuffer'))).toBe(true);
+      expect(violations.filter((violation) => violation.endsWith('to document')).length).toBeGreaterThanOrEqual(2);
+    } finally {
+      rmSync(directory, { recursive: true, force: true });
+    }
+  });
+
   it('all runtime entries converge on the pinned session reducer edges', () => {
     expect(reducerCallSites(coreDependencyGraph())).toEqual([
       'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
diff --git a/tests/unit/vtt/worker-boundary.test.ts b/tests/unit/vtt/worker-boundary.test.ts
index 51019e99951de771d48bf3e0a53ce69e8b29b341..bf6a2bd4085482290df782289625c8c8bcf9032b
--- a/tests/unit/vtt/worker-boundary.test.ts
+++ b/tests/unit/vtt/worker-boundary.test.ts
@@ -5,6 +5,12 @@
 import { readFileSync } from '../../helpers/test-filesystem';
 import { selectVttHandoffWorkerAsset } from '../../../vite.config';
 
+function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
+  let resolve = (): void => undefined;
+  const promise = new Promise<void>((settle) => { resolve = settle; });
+  return { promise, resolve };
+}
+
 describe('VTT handoff Worker message boundary', () => {
   it('pins Vite inline Worker discovery and selects only one emitted JavaScript Worker', () => {
     const source = readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8');
@@ -21,24 +27,74 @@
     }])).toThrow('Worker asset is ambiguous');
   });
 
-  it('crosses one structured-clone boundary per port post without internal re-serialization', async () => {
+  it('crosses one structured-clone boundary per port post with zero adapter re-serialization', async () => {
     const channel = new MessageChannel();
     const clientPosts = vi.spyOn(channel.port1, 'postMessage');
     const workerPosts = vi.spyOn(channel.port2, 'postMessage');
-    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
+    const detach = attachHandoffWorkerPort(channel.port2, { sessionKey: 'serialization-measurement' });
     const transport = new WorkerSceneTransport(channel.port1, () => undefined);
     const events: number[] = [];
     transport.subscribe((event) => events.push(event.seq));
 
-    const open = await transport.request({
-      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
-    });
-    const snapshot = await transport.initialSnapshot();
-    expect(open).toMatchObject({ v: 1, id: '', ok: true });
-    expect(snapshot).toMatchObject({ sceneId: 'scene:vtt-handoff-worker', revision: 0 });
-    expect(events).toEqual([1]);
+    const serialization = { parse: 0, stringify: 0, clone: 0 };
+    const originalParse = JSON.parse;
+    const originalStringify = JSON.stringify;
+    const originalClone = globalThis.structuredClone;
+    let inspectingStack = false;
+    const isAdapterCall = (): boolean => {
+      if (inspectingStack) return false;
+      inspectingStack = true;
+      const sourceFrame = new Error().stack?.split('\n').find((frame) => frame.includes('/src/'));
+      inspectingStack = false;
+      return sourceFrame === undefined || /\/src\/vtt\/handoff\/worker-(?:entry|transport|messages|memory-session-store)\.ts/u.test(sourceFrame);
+    };
+    JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
+      if (isAdapterCall()) serialization.parse += 1;
+      return originalParse(...args);
+    }) as typeof JSON.parse;
+    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
+      if (isAdapterCall()) {
+        serialization.stringify += 1;
+      }
+      return originalStringify(...args);
+    }) as typeof JSON.stringify;
+    globalThis.structuredClone = ((...args: Parameters<typeof structuredClone>) => {
+      if (isAdapterCall()) serialization.clone += 1;
+      return originalClone(...args);
+    }) as typeof structuredClone;
+    try {
+      const open = await transport.request({
+        v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
+      });
+      const snapshot = await transport.initialSnapshot();
+      expect(open).toMatchObject({ v: 1, id: '', ok: true });
+      expect(snapshot).toMatchObject({
+        sceneId: 'scene:vtt-handoff-worker:serialization-measurement', revision: 0,
+      });
+      expect(events).toEqual(events.map((_sequence, index) => index + 1));
+      expect(events.length).toBeGreaterThanOrEqual(2);
+      await expect(transport.request({
+        v: 1, id: 'valid-snapshot', method: 'scene.snapshot', params: {},
+      })).resolves.toMatchObject({ id: 'valid-snapshot', ok: true });
+      await expect(transport.request({
+        v: 1, id: 'invalid-door', method: 'door.set', params: { doorId: 42, open: true },
+      })).resolves.toMatchObject({ id: 'invalid-door', ok: false, error: { code: 'INVALID_REQUEST' } });
+      await expect(transport.request({
+        v: 1, id: 'door-event', method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: true },
+      })).resolves.toMatchObject({ id: 'door-event', ok: true });
+      expect(serialization).toEqual({ parse: 0, stringify: 0, clone: 0 });
+      const aliasedSerializer = JSON.stringify;
+      aliasedSerializer({ mutationControl: true });
+      expect(serialization.stringify).toBe(1);
+      serialization.stringify = 0;
+    } finally {
+      JSON.parse = originalParse;
+      JSON.stringify = originalStringify;
+      globalThis.structuredClone = originalClone;
+    }
     expect({ requestClones: clientPosts.mock.calls.length, workerClones: workerPosts.mock.calls.length })
-      .toEqual({ requestClones: 1, workerClones: 2 });
+      .toEqual({ requestClones: 4, workerClones: 8 });
     const adapterSources = [
       readFileSync('src/vtt/handoff/worker-entry.ts', 'utf8'),
       readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8'),
@@ -100,17 +156,32 @@
     const faults: string[] = [];
     transport.subscribeErrors((error) => faults.push(error.code));
     const pending = transport.request({ v: 1, id: 'expected', method: 'scene.snapshot', params: {} });
+    const rejected = pending.catch((error: unknown) => error);
     channel.port2.postMessage({
       kind: 'response', invocation: 1,
       response: { v: 1, id: 'wrong', ok: true, result: {} },
     });
-    await new Promise<void>((resolve) => setTimeout(resolve, 0));
+    const error = await rejected;
     expect(faults).toEqual(['PROTOCOL_ERROR']);
-    transport.close();
-    await expect(pending).rejects.toBeInstanceOf(SceneTransportClosedError);
+    expect(error).toBeInstanceOf(SceneTransportFaultError);
+    expect(transport.status()).toBe('closed');
+    await expect(transport.request({ v: 1, id: 'later', method: 'scene.snapshot', params: {} }))
+      .rejects.toBeInstanceOf(SceneTransportClosedError);
     channel.port2.close();
   });
 
+  it('terminally rejects pending work when the Worker response envelope is malformed', async () => {
+    const channel = new MessageChannel();
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    const pending = transport.request({ v: 1, id: 'malformed-response', method: 'scene.snapshot', params: {} });
+    const rejected = pending.catch((error: unknown) => error);
+    channel.port2.postMessage({ kind: 'response', invocation: 1, response: { invented: 'success' } });
+    expect(await rejected).toBeInstanceOf(SceneTransportFaultError);
+    expect(transport.status()).toBe('closed');
+    expect(transport.pendingRequestCount()).toBe(0);
+    channel.port2.close();
+  });
+
   it('turns a malformed client boundary envelope into a typed fault', async () => {
     const channel = new MessageChannel();
     const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
@@ -152,7 +223,13 @@
     });
     transport.subscribe((event) => {
       const door = event.data.doors.find((candidate) => candidate.id === 'object:two-room-door');
-      if (door?.open === true) transport.close();
+      if (door?.open === true) {
+        void transport.request({
+          v: 1,
+          get id(): string { transport.close(); return 'observer-close-getter'; },
+          method: 'scene.snapshot', params: {},
+        }).catch(() => undefined);
+      }
     });
     const committed = await transport.request({
       v: 1, id: 'close-on-door', method: 'door.set',
@@ -167,4 +244,248 @@
     })).rejects.toBeInstanceOf(SceneTransportClosedError);
     detach();
   });
+
+  it.each([
+    ['the same wire id', 'door-delayed'],
+    ['a different wire id', 'door-duplicate-wrapper'],
+  ])('refuses a repeated port invocation with %s without miscorrelating its delayed receipt', async (_label, duplicateId) => {
+    const barrier = deferred();
+    let delayResponses = false;
+    const sessionKey = `duplicate-invocation:${duplicateId}`;
+    const channel = new MessageChannel();
+    const observerChannel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2, {
+      sessionKey,
+      responseBarrier: () => delayResponses ? barrier.promise : Promise.resolve(),
+    });
+    const detachObserver = attachHandoffWorkerPort(observerChannel.port2, { startAutonomous: false, sessionKey });
+    const post = vi.spyOn(channel.port1, 'postMessage');
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    const observer = new WorkerSceneTransport(observerChannel.port1, () => undefined);
+    const faults: string[] = [];
+    transport.subscribeErrors((error) => faults.push(error.code));
+    await transport.request({ v: 1, id: 'open-a', method: 'session.open', params: { requestedRole: 'dm' } });
+    await observer.request({ v: 1, id: 'open-b', method: 'session.open', params: { requestedRole: 'dm' } });
+    delayResponses = true;
+    transport.subscribe((event) => {
+      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) {
+        setTimeout(() => transport.close(), 0);
+      }
+    });
+    const committed = transport.request({
+      v: 1, id: 'door-delayed', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+    const wrapper = post.mock.calls.at(-1)?.[0];
+    if (typeof wrapper !== 'object' || wrapper === null) throw new Error('The mutation wrapper was not posted.');
+    channel.port1.postMessage({
+      kind: 'request', invocation: Reflect.get(wrapper, 'invocation'),
+      request: {
+        v: 1, id: duplicateId, method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: false },
+      },
+    });
+    const receipt = await committed;
+    expect(receipt).toMatchObject({ id: 'door-delayed', ok: true });
+    if (!receipt.ok || typeof receipt.result.revision !== 'number') throw new Error('Expected the original committed receipt.');
+    expect(faults).toEqual(['PROTOCOL_ERROR']);
+    expect(transport.status()).toBe('closed');
+    await expect(observer.request({ v: 1, id: 'state', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'state', ok: true, result: { revision: receipt.result.revision } });
+    barrier.resolve();
+    observer.dispose();
+    detach();
+    detachObserver();
+  });
+
+  it('shares one authoritative session across seat bindings and scopes duplicate ids to that session', async () => {
+    const sessionKey = 'shared-authority';
+    const firstChannel = new MessageChannel();
+    const secondChannel = new MessageChannel();
+    const independentChannel = new MessageChannel();
+    const detachFirst = attachHandoffWorkerPort(firstChannel.port2, { sessionKey });
+    const detachSecond = attachHandoffWorkerPort(secondChannel.port2, { startAutonomous: false, sessionKey });
+    const detachIndependent = attachHandoffWorkerPort(independentChannel.port2, { sessionKey: 'independent-authority' });
+    const first = new WorkerSceneTransport(firstChannel.port1, () => undefined);
+    const second = new WorkerSceneTransport(secondChannel.port1, () => undefined);
+    const independent = new WorkerSceneTransport(independentChannel.port1, () => undefined);
+    for (const [transport, id] of [[first, 'open-first'], [second, 'open-second'], [independent, 'open-independent']] as const) {
+      await expect(transport.request({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } }))
+        .resolves.toMatchObject({ id, ok: true });
+    }
+    const sharedMutation = await first.request({
+      v: 1, id: 'session-scoped-id', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+    expect(sharedMutation).toMatchObject({ id: 'session-scoped-id', ok: true });
+    if (!sharedMutation.ok) throw new Error('The shared-session mutation was not committed.');
+    expect(sharedMutation.result.revision).toBeTypeOf('number');
+    await expect(second.request({
+      v: 1, id: 'session-scoped-id', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: false },
+    })).resolves.toMatchObject({ id: 'session-scoped-id', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
+    first.dispose();
+    await expect(second.request({ v: 1, id: 'after-detach', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'after-detach', ok: true, result: { doors: expect.arrayContaining([
+        expect.objectContaining({ id: 'object:two-room-door', open: true }),
+      ]) } });
+    const independentMutation = await independent.request({
+      v: 1, id: 'session-scoped-id', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+    expect(independentMutation).toMatchObject({ id: 'session-scoped-id', ok: true });
+    if (!independentMutation.ok) throw new Error('The independent-session mutation was not committed.');
+    expect(independentMutation.result.revision).toBeTypeOf('number');
+    second.dispose();
+    independent.dispose();
+    detachFirst(); detachSecond(); detachIndependent();
+  });
+
+  it('binds a player port to its seat, filters its projection and never applies a DM receipt to its read', async () => {
+    const barrier = deferred();
+    let delayPlayer = false;
+    const sessionKey = 'player-seat-binding';
+    const dmChannel = new MessageChannel();
+    const playerChannel = new MessageChannel();
+    const detachDm = attachHandoffWorkerPort(dmChannel.port2, { sessionKey });
+    const detachPlayer = attachHandoffWorkerPort(playerChannel.port2, {
+      sessionKey,
+      principal: { role: 'player', playerId: 'combatant:two-room-goblin' },
+      responseBarrier: () => delayPlayer ? barrier.promise : Promise.resolve(),
+    });
+    const dm = new WorkerSceneTransport(dmChannel.port1, () => undefined);
+    const player = new WorkerSceneTransport(playerChannel.port1, () => undefined);
+    let playerSnapshot = null as Awaited<ReturnType<typeof player.initialSnapshot>> | null;
+    player.subscribe((event) => { playerSnapshot = event.data; });
+    await dm.request({ v: 1, id: 'open-dm', method: 'session.open', params: { requestedRole: 'dm' } });
+    await player.request({
+      v: 1, id: 'open-player', method: 'session.open',
+      params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
+    });
+    expect(playerSnapshot?.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
+    await expect(player.request({
+      v: 1, id: 'cross-seat', method: 'token.move',
+      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
+    })).resolves.toMatchObject({ id: 'cross-seat', ok: false, error: { code: 'FORBIDDEN' } });
+    const move = await player.request({
+      v: 1, id: 'player-move', method: 'token.move',
+      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+    });
+    expect(move).toMatchObject({ id: 'player-move', ok: true });
+    if (!move.ok) throw new Error('The player movement was not committed.');
+    expect(move.result.revision).toBeTypeOf('number');
+    expect(playerSnapshot?.tokens.find((token) => token.id === 'token:two-room-goblin'))
+      .toMatchObject({ x: 7, y: 4, z: 0 });
+
+    delayPlayer = true;
+    player.subscribe((event) => {
+      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) player.close();
+    });
+    const read = player.request({ v: 1, id: 'same-wire-id', method: 'scene.snapshot', params: {} });
+    const readRejection = expect(read).rejects.toBeInstanceOf(SceneTransportClosedError);
+    await expect(dm.request({
+      v: 1, id: 'same-wire-id', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    })).resolves.toMatchObject({ id: 'same-wire-id', ok: true });
+    await readRejection;
+    expect(player.pendingRequestCount()).toBe(0);
+    barrier.resolve();
+    dm.dispose();
+    detachDm(); detachPlayer();
+  });
+
+  it.each(['close', 'dispose', 'destroySession'] as const)(
+    'rechecks lifecycle after an id getter invokes %s and posts no request',
+    async (lifecycle) => {
+      const channel = new MessageChannel();
+      const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
+      const post = vi.spyOn(channel.port1, 'postMessage');
+      const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+      const request = {
+        v: 1,
+        get id(): string { transport[lifecycle](); return `closed-by-${lifecycle}`; },
+        method: 'scene.snapshot', params: {},
+      };
+      await expect(transport.request(request)).rejects.toBeInstanceOf(SceneTransportClosedError);
+      expect(transport.pendingRequestCount()).toBe(0);
+      expect(post.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual([
+        lifecycle === 'destroySession' ? 'destroy' : lifecycle,
+      ]);
+      detach();
+    },
+  );
+
+  it.each(['close', 'dispose', 'destroySession'] as const)(
+    'rechecks lifecycle when structured clone invokes a nested getter that calls %s',
+    async (lifecycle) => {
+      const channel = new MessageChannel();
+      const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
+      const post = vi.spyOn(channel.port1, 'postMessage');
+      const workerPost = vi.spyOn(channel.port2, 'postMessage');
+      const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+      const request = {
+        v: 1, id: `nested-${lifecycle}`, method: 'scene.snapshot',
+        params: {
+          get trigger(): boolean { transport[lifecycle](); return true; },
+        },
+      };
+      await expect(transport.request(request)).rejects.toBeInstanceOf(SceneTransportClosedError);
+      expect(transport.pendingRequestCount()).toBe(0);
+      expect(post.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual([
+        'request',
+        lifecycle === 'destroySession' ? 'destroy' : lifecycle,
+      ]);
+      await new Promise<void>((resolve) => setTimeout(resolve, 0));
+      expect(workerPost.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual(['closed']);
+      detach();
+    },
+  );
+
+  it.each([
+    ['worker error', 'worker'],
+    ['worker messageerror', 'message'],
+  ])('terminally cleans pending work on %s', async (_label, kind) => {
+    const channel = new MessageChannel();
+    let onError = (): void => undefined;
+    let onMessageError = (): void => undefined;
+    let removed = 0;
+    let terminated = 0;
+    const transport = new WorkerSceneTransport(
+      channel.port1,
+      () => { terminated += 1; },
+      (error, messageError) => {
+        onError = error; onMessageError = messageError;
+        return () => { removed += 1; };
+      },
+    );
+    const pending = transport.request({ v: 1, id: 'pending-failure', method: 'scene.snapshot', params: {} });
+    const rejection = expect(pending).rejects.toBeInstanceOf(SceneTransportFaultError);
+    if (kind === 'worker') onError(); else onMessageError();
+    await rejection;
+    expect({ status: transport.status(), pending: transport.pendingRequestCount(), removed, terminated })
+      .toEqual({ status: 'closed', pending: 0, removed: 1, terminated: 1 });
+    channel.port2.close();
+  });
+
+  it('terminally cleans pending work on a port messageerror and peer closure', async () => {
+    const messageErrorChannel = new MessageChannel();
+    const messageErrorTransport = new WorkerSceneTransport(messageErrorChannel.port1, () => undefined);
+    const messageErrorPending = messageErrorTransport.request({ v: 1, id: 'messageerror', method: 'scene.snapshot', params: {} });
+    const messageErrorRejection = expect(messageErrorPending).rejects.toBeInstanceOf(SceneTransportFaultError);
+    messageErrorChannel.port1.dispatchEvent(new MessageEvent('messageerror'));
+    await messageErrorRejection;
+    expect(messageErrorTransport.status()).toBe('closed');
+    messageErrorChannel.port2.close();
+
+    const peerChannel = new MessageChannel();
+    const peerTransport = new WorkerSceneTransport(peerChannel.port1, () => undefined);
+    const peerPending = peerTransport.request({ v: 1, id: 'peer', method: 'scene.snapshot', params: {} });
+    const peerRejection = expect(peerPending).rejects.toBeInstanceOf(SceneTransportFaultError);
+    peerChannel.port2.postMessage({ kind: 'closed' });
+    await peerRejection;
+    expect(peerTransport.status()).toBe('closed');
+    await expect(peerTransport.request({ v: 1, id: 'after-peer', method: 'scene.snapshot', params: {} }))
+      .rejects.toBeInstanceOf(SceneTransportClosedError);
+    peerChannel.port2.close();
+  });
 });
