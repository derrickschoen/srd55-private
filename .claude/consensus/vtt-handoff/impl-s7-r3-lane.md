Implemented the final S7 fix round across 14 changed/new files without git writes or prohibited-path edits.

Key results:

- F79: correlation uses the exact serialized scalar ID; `toJSON` IDs and enumerable `__proto__` are covered.
- F80: physical sockets retain an error sink until actual close.
- F81: added concrete terminal-outcome, visibility-removal, reducer-execution, reconnect, movement, mismatch, late-subscription, Worker, and WebSocket parity coverage.
- F82: measured real global JSON operations across all handoff stack frames:
  - baseline: 3 stringify / 4 parse
  - real mutant: 2 stringify / 2 parse instead of expected 1/2
  - restored: 1 stringify / 2 parse, with byte-identical wire
- F83: symbol-resolved per-entry convergence and platform gates, with source-mutated reducer/service bypass controls.
- F84–F85: runtime port comes from the listening line; stdout and stderr are drained and included in failures.
- F86: token files use `O_NONBLOCK`; FIFO control exits with the exact regular-file diagnostic, while the no-`O_NONBLOCK` mutant times out with `SIGTERM`/`ETIMEDOUT`.

Verification:

- `npm run typecheck:fast` — passed.
- `npm run test:runtime-node` — 4 files, 56 tests passed.
- S7c Vitest command — 2 files, 13 tests passed.
- Compatible cumulative contract battery — 16 files, 156 tests passed.
- Playwright on `127.0.0.1:4430`, one worker, artifact `dev` — 1 test passed in 11.8s.
- `sg scan` and `git diff --check` — passed.
- Frozen contract SHA-256 remains `0f0e1d8f...edef18e1`.
- Plan SHA-256 remains `25816309...e5383a3d`.

The full 18-file targeted battery reported 157 passed and 10 publication-test failures, all caused by the pre-existing `UNAUTHORIZED_REPOSITORY_ROOT` restriction for this new S7 worktree. The launch probe ran for 54.284s and correctly surfaced complete build diagnostics; successful/warm timing was unavailable because the upstream S6 build contains forbidden literal `__SRD55_BROWSER_CAPABILITY_PROBE_FAILURE__`. An earlier direct build also encountered the documented `node_modules/.vite-temp` EROFS condition.

Artifact metadata exercised: seed `603020001`, clock `2026-09-09T12:00:00.000Z`, browser origin `http://127.0.0.1:4430`, Node port ephemeral, artifact `dev`, scenarios derived from the 16-entry shared manifest. Terminal outcomes were exactly `{committed, refused, cancelled, closed, failed}`.

Strengthened replaced expectations included:

- late subscriber `[2]` → exact buffered/future sequence `[1, 2]`;
- fixture-coordinate checks → literal ground anchors plus non-center rejection;
- duplicate event count → unchanged reducer-execution count;
- initial-snapshot reuse → latest buffered event sequence/revision;
- textual platform mutant → five symbol-resolved mechanism controls;
- synthetic serialization counter → real JSON-operation mutant and restored-wire equality;
- browser close codes `[1000,4000,4000]` → exact `[1000,1000,1000,4000,4000]`;
- declarative convergence mutations → source-mutated extraction failures.

Adapter-only graph: in-process, Worker, and WebSocket entries independently reach `ProtocolRuntime` and `EncounterSessionService`; reducer edges equal the permitted set; `encounter-app.ts` and test helpers are excluded.

Shared accepted seams changed only where required: five in-process lines for latest-event buffering and three protocol-runtime lines rejecting own `__proto__`.

HANDOFF S7 R3 DONE
diff --git a//tmp/vtt-handoff-s7-playwright.config.ts b//tmp/vtt-handoff-s7-playwright.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ebb3707fd9b9364aed72fb69202789bc0f081422
--- /dev/null
+++ b//tmp/vtt-handoff-s7-playwright.config.ts
@@ -0,0 +1,28 @@
+import { defineConfig } from '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/node_modules/@playwright/test/index';
+
+const repositoryRoot = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7';
+const rawPort = process.env.PLAYWRIGHT_PORT;
+if (rawPort === undefined || !/^\d+$/u.test(rawPort) || rawPort === '4173') {
+  throw new Error('PLAYWRIGHT_PORT must be a configured non-4173 port.');
+}
+
+export default defineConfig({
+  testDir: repositoryRoot + '/tests/browser/vtt-handoff',
+  fullyParallel: false,
+  workers: 1,
+  use: {
+    baseURL: 'http://127.0.0.1:' + rawPort,
+    headless: true,
+    trace: 'on-first-retry',
+  },
+  webServer: {
+    cwd: repositoryRoot,
+    command: 'npm run dev -- --host 127.0.0.1 --port ' + rawPort + ' --strictPort',
+    url: 'http://127.0.0.1:' + rawPort + '/vtt-handoff',
+    reuseExistingServer: false,
+    env: {
+      AI_BRIDGE_FAKE: '1',
+      STATIC_APP_CACHE_DIR: '/tmp/dnd-vtt-handoff-playwright-' + rawPort,
+    },
+  },
+});
diff --git a/src/vtt/handoff/in-process-transport.ts b/src/vtt/handoff/in-process-transport.ts
index 8db56d3543b0b4fe8373b99c96e7a71822a20654..5265ed4a1205f511dacb554ecf89518e791aa5c1
--- a/src/vtt/handoff/in-process-transport.ts
+++ b/src/vtt/handoff/in-process-transport.ts
@@ -76,6 +76,7 @@
   readonly #unsubscribeRuntimeFault: () => void;
   #state: SceneTransportStatus = 'connecting';
   #initialSettled = false;
+  #latestEvent: SceneSnapshotEvent | null = null;
 
   constructor(private readonly runtime: ProtocolRuntime) {
     void this.#initial.promise.catch(() => undefined);
@@ -140,6 +141,9 @@
   subscribe(listener: (event: SceneSnapshotEvent) => void): () => void {
     if (this.#state === 'closed' || this.#state === 'disposed') return () => undefined;
     this.#eventListeners.add(listener);
+    if (this.#latestEvent !== null) {
+      try { listener(this.#latestEvent); } catch { /* Observer failure is isolated. */ }
+    }
     return () => this.#eventListeners.delete(listener);
   }
 
@@ -221,6 +225,7 @@
   }
 
   #receiveEvent(event: SceneSnapshotEvent, receipt?: ProtocolEstablishedReceipt): void {
+    this.#latestEvent = event;
     if (receipt !== undefined) {
       const pending = [...this.#pending].find((candidate) =>
         candidate.invocationToken === receipt.invocationToken &&
diff --git a/src/vtt/handoff/protocol-runtime.ts b/src/vtt/handoff/protocol-runtime.ts
index 3caf632e1345a377d8d80d5385f7d431db1c27e8..a124be5fb1b7015d5e4fae8de1b3903f930881a4
--- a/src/vtt/handoff/protocol-runtime.ts
+++ b/src/vtt/handoff/protocol-runtime.ts
@@ -281,6 +281,9 @@
       if (result.kind === 'transport_fault') this.#emitFault(result.fault);
       return Promise.resolve(result);
     }
+    if (Object.prototype.hasOwnProperty.call(decoded.value, '__proto__')) {
+      return respond(failure(id, 'INVALID_REQUEST', 'The request structure is invalid.'));
+    }
     const structural = genericHandoffRequestSchema._zod.run(
       { value: decoded.value, issues: [] },
       { async: false },
diff --git a/src/vtt/handoff/websocket-transport.ts b/src/vtt/handoff/websocket-transport.ts
index 599261e2681cbfbab7e13bb7611657bd371a7660..a1c56afba19d0296d2bf16d3aea0a1b66d08796f
--- a/src/vtt/handoff/websocket-transport.ts
+++ b/src/vtt/handoff/websocket-transport.ts
@@ -45,68 +45,41 @@
   request(request: unknown): Promise<HandoffResponse> {
     if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
     return new Promise<HandoffResponse>((resolve, reject) => {
-      const reservation: { key: string | null } = { key: null };
-      let duplicate: SceneTransportFaultError | null = null;
-      let rootVisited = false;
-
-      const reserve = (value: unknown): void => {
-        if (reservation.key !== null) return;
-        const envelope = objectEnvelope(value);
-        const id = typeof envelope?.id === 'string' ? envelope.id : null;
-        const method = typeof envelope?.method === 'string' ? envelope.method : null;
-        if (id !== null && this.#pending.has(id)) {
-          duplicate = this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002);
-          throw duplicate;
-        }
-        this.#uncorrelatedSequence += 1;
-        const key = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
-        this.#pending.set(key, { method, resolve, reject });
-        reservation.key = key;
-      };
-
       let wire: string | undefined;
+      let rootSerializedValue: unknown;
+      let id: string | null = null;
+      let method: string | null = null;
       try {
-        wire = JSON.stringify(request, (key, value: unknown): unknown => {
-          if (key !== '' || rootVisited) return value;
-          rootVisited = true;
-          const envelope = objectEnvelope(value);
-          if (envelope === null) {
-            reserve(value);
-            return value;
-          }
-
-          const keys = Object.keys(envelope);
-          const id = keys.includes('id') ? Reflect.get(envelope, 'id') : undefined;
-          const method = keys.includes('method') ? Reflect.get(envelope, 'method') : undefined;
-          const snapshot: Record<string, unknown> = {};
-          if (keys.includes('id')) snapshot.id = id;
-          if (keys.includes('method')) snapshot.method = method;
-          reserve(snapshot);
-          for (const field of keys) {
-            if (field !== 'id' && field !== 'method') snapshot[field] = Reflect.get(envelope, field);
-          }
-          const ordered: Record<string, unknown> = {};
-          for (const field of keys) ordered[field] = snapshot[field];
-          return ordered;
+        wire = JSON.stringify(request, function captureWireIdentity(
+          this: unknown, key: string, value: unknown,
+        ): unknown {
+          if (key === '') rootSerializedValue = value;
+          else if (this === rootSerializedValue && key === 'id') id = typeof value === 'string' ? value : null;
+          else if (this === rootSerializedValue && key === 'method') method = typeof value === 'string' ? value : null;
+          return value;
         });
       } catch {
-        if (reservation.key !== null) this.#pending.delete(reservation.key);
-        reject(duplicate ?? this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
+        reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
         return;
       }
 
-      if (wire === undefined || reservation.key === null) {
-        if (reservation.key !== null) this.#pending.delete(reservation.key);
+      if (wire === undefined) {
         reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
         return;
       }
+      if (id !== null && this.#pending.has(id)) {
+        reject(this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002));
+        return;
+      }
+      this.#uncorrelatedSequence += 1;
+      const pendingKey = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
+      this.#pending.set(pendingKey, { method, resolve, reject });
       if (this.#terminal()) {
-        this.#pending.delete(reservation.key);
+        this.#pending.delete(pendingKey);
         reject(new SceneTransportClosedError());
         return;
       }
 
-      const pendingKey = reservation.key;
       const send = (): void => {
         this.#waitingForOpen.delete(send);
         if (this.#terminal() || this.#socket.readyState !== WebSocket.OPEN) {
@@ -170,9 +143,12 @@
     catch { this.#protocolFault('The socket emitted invalid JSON.'); return; }
     const envelope = objectEnvelope(value);
     if (envelope?.event === 'scene.snapshot') {
-      const event = handoffEventSchema.safeParse(value);
-      if (!event.success) { this.#protocolFault('The socket emitted an invalid event.'); return; }
-      const snapshotEvent = event.data as SceneSnapshotEvent;
+      const event = handoffEventSchema._zod.run({ value, issues: [] }, { async: false, jitless: true });
+      if (event instanceof Promise || event.issues.length > 0) {
+        this.#protocolFault('The socket emitted an invalid event.');
+        return;
+      }
+      const snapshotEvent = event.value as SceneSnapshotEvent;
       this.#latestEvent = snapshotEvent;
       if (this.#resolveInitial !== null) {
         this.#resolveInitial(snapshotEvent.data);
@@ -188,13 +164,17 @@
       this.#protocolFault('The socket emitted an invalid protocol message.');
       return;
     }
-    const response = handoffResponseSchema.safeParse(value);
-    if (!response.success) { this.#protocolFault('The socket emitted an invalid response.'); return; }
-    const pending = this.#pending.get(response.data.id);
+    const response = handoffResponseSchema._zod.run({ value, issues: [] }, { async: false, jitless: true });
+    if (response instanceof Promise || response.issues.length > 0) {
+      this.#protocolFault('The socket emitted an invalid response.');
+      return;
+    }
+    const parsedResponse = response.value as HandoffResponse;
+    const pending = this.#pending.get(parsedResponse.id);
     if (pending === undefined) { this.#protocolFault('The socket emitted an uncorrelated response.'); return; }
-    this.#pending.delete(response.data.id);
-    if (pending.method === 'session.open' && response.data.ok) this.#setState('open');
-    pending.resolve(response.data as HandoffResponse);
+    this.#pending.delete(parsedResponse.id);
+    if (pending.method === 'session.open' && parsedResponse.ok) this.#setState('open');
+    pending.resolve(parsedResponse);
   };
 
   readonly #onClose = (event: CloseEvent): void => {
diff --git a/tests/browser/vtt-handoff/runtime-parity.spec.ts b/tests/browser/vtt-handoff/runtime-parity.spec.ts
index d6e87a481777b9eedf5de55782c87f858e77bd74..53d2fb95bb507d9f2296142ad573924b149c0ec4
--- a/tests/browser/vtt-handoff/runtime-parity.spec.ts
+++ b/tests/browser/vtt-handoff/runtime-parity.spec.ts
@@ -6,16 +6,22 @@
 import { resolve } from 'node:path';
 import { WebSocketServer } from 'ws';
 import type {} from '../../../src/vtt/handoff/worker-harness';
+import { TRANSPORT_CONFORMANCE_SCENARIO_NAMES } from '../../helpers/vtt-handoff/transport-conformance-manifest';
 import { vttHandoffBrowserOrigin } from './playwright.config';
 
 test('pairs the real Worker and browser WebSocket transport on the fixed two-room scene', async ({ page }, testInfo) => {
   mkdirSync(resolve('.tmp'), { recursive: true });
   const root = mkdtempSync(resolve('.tmp/vtt-browser-runtime-parity-'));
   const token = 'browser-runtime-parity-secret';
+  const playerToken = 'browser-runtime-parity-player-secret';
   const tokensFile = resolve(root, 'tokens.json');
-  writeFileSync(tokensFile, JSON.stringify([{
-    tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
-  }]), { mode: 0o600 });
+  writeFileSync(tokensFile, JSON.stringify([
+    { tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' },
+    {
+      tokenSha256: createHash('sha256').update(playerToken).digest('hex'),
+      role: 'player', playerId: 'combatant:two-room-goblin',
+    },
+  ]), { mode: 0o600 });
   chmodSync(tokensFile, 0o600);
   const viteConfig = resolve('/tmp', 'vtt-runtime-playwright-' + String(process.pid) + '.config.mjs');
   writeFileSync(viteConfig, 'export default {};\n', { mode: 0o600 });
@@ -81,6 +87,62 @@
     expect(workerDoor.state.eventSequences).toEqual(
       workerDoor.state.eventSequences.map((_sequence, index) => index + 1),
     );
+    const workerControls = await page.evaluate(async () => {
+      const api = window.__VTT_HANDOFF_HARNESS__;
+      if (api === undefined) throw new Error('The Worker harness is unavailable.');
+      const correlated = await Promise.all(['a', 'b'].map((suffix) => api.request({
+        v: 1, id: 'worker:snapshot:' + suffix, method: 'scene.snapshot', params: {},
+      })));
+      const invalid = await api.request({
+        v: 1, id: 'worker:invalid', method: 'door.set', params: { doorId: 42, open: true },
+      });
+      const unsupported = await api.request({
+        v: 1, id: 'worker:light', method: 'light.set',
+        params: { lightId: 'object:two-room-torch', enabled: false },
+      });
+      interface DirectWorkerTransport {
+        request(request: unknown): Promise<unknown>;
+        dispose(): void;
+      }
+      const workerModulePath = '/src/vtt/handoff/worker-transport.ts';
+      const loaded = await import(/* @vite-ignore */ workerModulePath) as unknown;
+      const createTransport = Reflect.get(loaded as object, 'createHandoffWorkerTransport') as () => DirectWorkerTransport;
+      const mismatchTransport = createTransport();
+      const mismatch = await mismatchTransport.request({
+        v: 1, id: 'worker:mismatch', method: 'session.open',
+        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
+      });
+      mismatchTransport.dispose();
+      const duplicate = await api.request({
+        v: 1, id: 'parity:worker-door', method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: false },
+      });
+      const malformed = await api.malformed();
+      const reconnected = await api.reconnect();
+      return { correlated, invalid, unsupported, mismatch, duplicate, malformed, reconnected };
+    });
+    expect(workerControls.correlated.map((response) => response.id)).toEqual([
+      'worker:snapshot:a', 'worker:snapshot:b',
+    ]);
+    expect(workerControls.invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
+    expect(workerControls.unsupported).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
+    expect(workerControls.mismatch).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
+    expect(workerControls.duplicate).toMatchObject({ ok: false, error: { code: 'DUPLICATE_MUTATION' } });
+    expect(workerControls.malformed).toBe('INVALID_JSON');
+    expect(workerControls.reconnected).toMatchObject({
+      generation: 2,
+      snapshot: {
+        tokens: [
+          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+        ],
+        doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: false })]),
+      },
+    });
+    expect(workerControls.reconnected.eventSequences[0]).toBe(1);
+    expect(workerControls.reconnected.eventSequences).toEqual(
+      workerControls.reconnected.eventSequences.map((_sequence, index) => index + 1),
+    );
 
     const badHandshake = await page.evaluate(async ({ url }) => new Promise<number>((resolveClose) => {
       const socket = new WebSocket(url, ['vtt.v1', 'bearer.invalid']);
@@ -89,7 +151,7 @@
     }), { url: websocketUrl });
     expect(badHandshake).toBe(1006);
 
-    const websocket = await page.evaluate(async ({ url, bearer, badUrl }) => {
+    const websocket = await page.evaluate(async ({ url, bearer, playerBearer, badUrl }) => {
       const closeCodes: Array<number | undefined> = [];
       let throwAfterClose = false;
       const NativeWebSocket = WebSocket;
@@ -166,6 +228,55 @@
       const endpoint = transport.endpointUrl();
       transport.close();
 
+      const player = new Constructor(url, playerBearer);
+      const playerEvents: Event[] = [];
+      player.subscribe((event) => playerEvents.push(event));
+      const playerOpen = await player.request({
+        v: 1, id: 'player:open', method: 'session.open',
+        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
+      });
+      const playerInitial = await player.initialSnapshot();
+      if (!playerEvents.some((event) => event.data.revision >= 2)) {
+        await new Promise<void>((resolveReady, reject) => {
+          const deadline = setTimeout(() => { stop(); reject(new Error('Browser player offer timed out.')); }, 2_000);
+          const stop = player.subscribe((event) => {
+            if (event.data.revision < 2) return;
+            clearTimeout(deadline);
+            stop();
+            resolveReady();
+          });
+        });
+      }
+      const playerMovementEvent = new Promise<Event>((resolveMove) => {
+        const stop = player.subscribe((event) => {
+          if (!event.data.tokens.some((candidate) => candidate.id === 'token:two-room-goblin' && candidate.x === 7)) return;
+          stop();
+          resolveMove(event);
+        });
+      });
+      const playerMove = await player.request({
+        v: 1, id: 'player:move', method: 'token.move',
+        params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+      });
+      const playerMoved = (await playerMovementEvent).data.tokens.find((candidate) => candidate.id === 'token:two-room-goblin');
+      player.close();
+
+      const mismatch = new Constructor(url, playerBearer);
+      const playerMismatch = await mismatch.request({
+        v: 1, id: 'player:mismatch', method: 'session.open',
+        params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
+      });
+
+      const reconnect = new Constructor(url, bearer);
+      const reconnectOpen = await reconnect.request({
+        v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
+      });
+      const reconnectSnapshot = await reconnect.initialSnapshot();
+      const freshLedger = await reconnect.request({
+        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
+      });
+      reconnect.close();
+
       const malformed = new Constructor(badUrl, bearer);
       const malformedResult = await new Promise<{ readonly fault: string; readonly state: string; readonly resubmission: string }>(
         (resolveFault) => {
@@ -193,10 +304,13 @@
         protocol, endpoint, open, initial, correlated, unsupported, door, changed, duplicate,
         sequences: events.map((event) => event.seq), lateCount: late.length,
         pending: transport.pendingRequestCount(), malformedResult, closeCodes, throwingCloseState,
+        playerOpen, playerInitial, playerMove, playerMoved, playerMismatch,
+        reconnectOpen, reconnectSnapshot, freshLedger,
       };
     }, {
       url: websocketUrl,
       bearer: token,
+      playerBearer: playerToken,
       badUrl: 'ws://127.0.0.1:' + String(malformedPort),
     });
 
@@ -218,10 +332,20 @@
     ]) } });
     expect(websocket.door.result?.revision).toBe(websocket.changed.data.revision);
     expect(websocket.duplicate).toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
+    expect(websocket.playerOpen).toMatchObject({ id: 'player:open', ok: true });
+    expect(websocket.playerInitial.tokens).toEqual(expect.arrayContaining([
+      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4, z: 0 }),
+    ]));
+    expect(websocket.playerMove).toMatchObject({ id: 'player:move', ok: true });
+    expect(websocket.playerMoved).toMatchObject({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 });
+    expect(websocket.playerMismatch).toMatchObject({ id: 'player:mismatch', ok: false, error: { code: 'UNAUTHORIZED' } });
+    expect(websocket.reconnectOpen).toMatchObject({ id: '', ok: true });
+    expect(websocket.reconnectSnapshot).toMatchObject({ revision: 0 });
+    expect(websocket.freshLedger).toMatchObject({ id: 'door', ok: true });
     expect(websocket.sequences).toEqual(websocket.sequences.map((_sequence, index) => index + 1));
     expect(websocket.lateCount).toBe(1);
     expect(websocket.pending).toBe(0);
-    expect(websocket.closeCodes).toEqual([1000, 4000, 4000]);
+    expect(websocket.closeCodes).toEqual([1000, 1000, 1000, 4000, 4000]);
     expect(websocket.throwingCloseState).toBe('closed');
     expect(websocket.malformedResult).toEqual({
       fault: 'PROTOCOL_ERROR', state: 'closed', resubmission: 'SceneTransportClosedError',
@@ -230,7 +354,8 @@
     await testInfo.attach('vtt-runtime-parity', {
       body: JSON.stringify({
         artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z',
-        nodePort, browserOrigin: vttHandoffBrowserOrigin, scenarios: 16,
+        nodePort, browserOrigin: vttHandoffBrowserOrigin,
+        scenarios: TRANSPORT_CONFORMANCE_SCENARIO_NAMES.length,
       }),
       contentType: 'application/json',
     });
diff --git a/tests/helpers/vtt-handoff/transport-conformance-manifest.ts b/tests/helpers/vtt-handoff/transport-conformance-manifest.ts
new file mode 100644
index 0000000000000000000000000000000000000000..83f33726a6abe8224d9c7380cadb75d81209dc81
--- /dev/null
+++ b/tests/helpers/vtt-handoff/transport-conformance-manifest.ts
@@ -0,0 +1,20 @@
+export const TRANSPORT_CONFORMANCE_SCENARIO_NAMES = [
+  'correlation ids',
+  'lawful structural values',
+  'structural validation failures',
+  'authoritative role mismatch',
+  'initial snapshot',
+  'token move result and snapshot',
+  'canonical door change and same-state no-op',
+  'unsupported light mutation',
+  'five terminal intent outcomes',
+  'reconnect full resnapshot',
+  'late subscription',
+  'visible-to-hidden entity removal',
+  'duplicate mutation id',
+  'malformed transport beside empty id',
+  'subscription and disposal cleanup',
+  'no retry after unknown mutation outcome',
+] as const;
+
+export type TransportConformanceScenarioName = typeof TRANSPORT_CONFORMANCE_SCENARIO_NAMES[number];
diff --git a/tests/helpers/vtt-handoff/transport-conformance.ts b/tests/helpers/vtt-handoff/transport-conformance.ts
index f65dffd9440bef594a0ac8bacdeebb0096e09f70..7a14915a8a2ef798ec4d6ba96ba46f6f06a5a30b
--- a/tests/helpers/vtt-handoff/transport-conformance.ts
+++ b/tests/helpers/vtt-handoff/transport-conformance.ts
@@ -1,35 +1,19 @@
 import { expect } from 'vitest';
-import type { HandoffResponse, SceneSnapshotEvent } from '../../../src/vtt/handoff/protocol-runtime';
+import { ProtocolRuntime, type HandoffResponse, type ProtocolSessionPort, type SceneSnapshotEvent } from '../../../src/vtt/handoff/protocol-runtime';
 import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport } from '../../../src/vtt/handoff/scene-transport';
 import { TWO_ROOM_CLOCK, TWO_ROOM_SEED } from '../../../src/vtt/handoff/fixtures/two-room';
+import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
+import { createDefaultNodeRuntimeSession, type NodeRuntimeSession } from '../../../tools/vtt-handoff/node-runtime';
+import type { HandoffPrincipal } from '../../../src/vtt/handoff/session-authorizer';
+import type { PlayerSessionSnapshotEvent, SessionMutationOutcome } from '../../../src/vtt/encounter-session-service';
 import {
-  createEncounterSessionServiceTransport, InProcessSceneTransport,
-} from '../../../src/vtt/handoff/in-process-transport';
-import { createDefaultNodeRuntimeSession } from '../../../tools/vtt-handoff/node-runtime';
-import type { HandoffPrincipal } from '../../../src/vtt/handoff/session-authorizer';
+  TRANSPORT_CONFORMANCE_SCENARIO_NAMES, type TransportConformanceScenarioName,
+} from './transport-conformance-manifest';
 
-export const TWO_ROOM_MOVING_PLAYER = 'combatant:two-room-goblin';
-
-const TRANSPORT_CONFORMANCE_SCENARIO_NAMES = [
-  'correlation ids',
-  'lawful structural values',
-  'structural validation failures',
-  'authoritative role mismatch',
-  'initial snapshot',
-  'token move result and snapshot',
-  'canonical door change and same-state no-op',
-  'unsupported light mutation',
-  'five terminal intent outcomes',
-  'reconnect full resnapshot',
-  'late subscription',
-  'visible-to-hidden entity removal',
-  'duplicate mutation id',
-  'malformed transport beside empty id',
-  'subscription and disposal cleanup',
-  'no retry after unknown mutation outcome',
-] as const;
+export { TRANSPORT_CONFORMANCE_SCENARIO_NAMES } from './transport-conformance-manifest';
+export type { TransportConformanceScenarioName } from './transport-conformance-manifest';
 
-export type TransportConformanceScenarioName = typeof TRANSPORT_CONFORMANCE_SCENARIO_NAMES[number];
+export const TWO_ROOM_MOVING_PLAYER = 'combatant:two-room-goblin';
 
 export interface TransportConformanceScenario {
   readonly name: TransportConformanceScenarioName;
@@ -60,22 +44,187 @@
 
 export function createInProcessConformanceTransport(
   principal: HandoffPrincipal = { role: 'dm' },
+  forcedPlayerOutcome?: Exclude<SessionMutationOutcome, { readonly kind: 'committed' }>,
 ): {
   readonly transport: InProcessSceneTransport;
   readonly start: () => Promise<void>;
+  readonly reducerExecutions: () => number;
 } {
-  const session = createDefaultNodeRuntimeSession(principal);
+  const counted = createCountedConformanceSession(principal, forcedPlayerOutcome);
+  const session = counted.session;
   return {
-    transport: createEncounterSessionServiceTransport({
+    transport: new InProcessSceneTransport(new ProtocolRuntime({
       service: session.service,
       principal,
       seats: session.seats,
       art: session.art,
-    }),
+    })),
     start: session.start ?? (() => Promise.resolve()),
+    reducerExecutions: counted.reducerExecutions,
   };
 }
 
+export async function runTerminalOutcomeConformance(
+  transport: SceneTransport,
+  start: () => Promise<void>,
+): Promise<'committed' | 'refused' | 'cancelled' | 'closed' | 'failed'> {
+  const events: SceneSnapshotEvent[] = [];
+  transport.subscribe((event) => events.push(event));
+  await expect(transport.request({
+    v: 1, id: 'terminal:open', method: 'session.open',
+    params: { requestedRole: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
+  })).resolves.toMatchObject({ id: 'terminal:open', ok: true });
+  await transport.initialSnapshot();
+  void start();
+  if (!events.some((event) => event.data.revision >= 2)) {
+    await new Promise<void>((resolveReady, reject) => {
+      const deadline = setTimeout(() => { stop(); reject(new Error('Timed out waiting for terminal-outcome offer.')); }, 2_000);
+      const stop = transport.subscribe((event) => {
+        if (event.data.revision < 2) return;
+        clearTimeout(deadline);
+        stop();
+        resolveReady();
+      });
+    });
+  }
+  const response = await transport.request({
+    v: 1, id: 'terminal:move', method: 'token.move',
+    params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+  });
+  transport.dispose();
+  if (response.ok) return 'committed';
+  switch (response.error.code) {
+    case 'ENGINE_REFUSED': return 'refused';
+    case 'CANCELLED': return 'cancelled';
+    case 'CLOSED': return 'closed';
+    case 'FAILED': return 'failed';
+    default: throw new Error(`Unexpected terminal response code ${response.error.code}.`);
+  }
+}
+
+export function createVisibilityConformanceSession(principal: HandoffPrincipal): {
+  readonly session: NodeRuntimeSession;
+  readonly hideVisibleEntities: () => void;
+} {
+  const base = createDefaultNodeRuntimeSession(principal);
+  let playerListener: ((event: PlayerSessionSnapshotEvent) => void) | null = null;
+  const service: ProtocolSessionPort = {
+    sessionId: base.service.sessionId,
+    dmSnapshot: () => base.service.dmSnapshot(),
+    dmCapture: () => base.service.dmCapture(),
+    playerSnapshot: (playerId) => base.service.playerSnapshot(playerId),
+    playerCapture: (playerId) => base.service.playerCapture(playerId),
+    subscribeDm: (listener) => base.service.subscribeDm(listener),
+    subscribePlayer: (playerId, listener) => {
+      playerListener = listener;
+      return base.service.subscribePlayer(playerId, listener);
+    },
+    submitOfferedAction: (input) => base.service.submitOfferedAction(input),
+    setDoor: (input) => base.service.setDoor(input),
+    close: () => base.service.close(),
+  };
+  return {
+    session: { service, seats: base.seats, art: base.art },
+    hideVisibleEntities: () => {
+      const capture = base.service.playerCapture(
+        principal.role === 'player' ? principal.playerId : undefined,
+      );
+      if (capture === null || playerListener === null) throw new Error('Player visibility subscription is unavailable.');
+      playerListener({
+        kind: 'autonomous', seq: Number.MAX_SAFE_INTEGER,
+        projection: {
+          ...capture.projection,
+          revision: capture.projection.revision + 1,
+          combatants: [],
+          lastSeen: [],
+        },
+        tokenBindings: capture.tokenBindings,
+      });
+    },
+  };
+}
+
+export function createVisibilityInProcessTransport(principal: HandoffPrincipal): {
+  readonly transport: InProcessSceneTransport;
+  readonly hideVisibleEntities: () => void;
+} {
+  const controlled = createVisibilityConformanceSession(principal);
+  return {
+    transport: new InProcessSceneTransport(new ProtocolRuntime({
+      service: controlled.session.service,
+      principal,
+      seats: controlled.session.seats,
+      art: controlled.session.art,
+    })),
+    hideVisibleEntities: controlled.hideVisibleEntities,
+  };
+}
+
+export async function runVisibilityRemovalConformance(
+  transport: SceneTransport,
+  hideVisibleEntities: () => void,
+): Promise<void> {
+  const events: SceneSnapshotEvent[] = [];
+  transport.subscribe((event) => events.push(event));
+  await transport.request({
+    v: 1, id: 'visibility:open', method: 'session.open',
+    params: { requestedRole: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
+  });
+  const initial = await transport.initialSnapshot();
+  const initiallyVisible = initial.tokens.map((token) => token.id);
+  expect(initiallyVisible.length).toBeGreaterThan(0);
+  const removal = new Promise<SceneSnapshotEvent>((resolveRemoval, reject) => {
+    const deadline = setTimeout(() => { stop(); reject(new Error('Timed out waiting for hidden-entity removal.')); }, 1_000);
+    const stop = transport.subscribe((event) => {
+      if (event.data.tokens.length >= initiallyVisible.length) return;
+      clearTimeout(deadline);
+      stop();
+      resolveRemoval(event);
+    });
+  });
+  hideVisibleEntities();
+  const hidden = await removal;
+  expect(hidden.data.tokens).toEqual([]);
+  expect(hidden.data.tokens.map((token) => token.id)).not.toEqual(initiallyVisible);
+  expect(events.at(-1)?.seq).toBe(hidden.seq);
+  transport.dispose();
+}
+
+export function createCountedConformanceSession(
+  principal: HandoffPrincipal,
+  forcedPlayerOutcome?: Exclude<SessionMutationOutcome, { readonly kind: 'committed' }>,
+): {
+  readonly session: NodeRuntimeSession;
+  readonly reducerExecutions: () => number;
+} {
+  const base = createDefaultNodeRuntimeSession(principal);
+  let reducerExecutions = 0;
+  const service: ProtocolSessionPort = {
+    sessionId: base.service.sessionId,
+    dmSnapshot: () => base.service.dmSnapshot(),
+    dmCapture: () => base.service.dmCapture(),
+    playerSnapshot: (playerId) => base.service.playerSnapshot(playerId),
+    playerCapture: (playerId) => base.service.playerCapture(playerId),
+    subscribeDm: (listener) => base.service.subscribeDm(listener),
+    subscribePlayer: (playerId, listener) => base.service.subscribePlayer(playerId, listener),
+    submitOfferedAction: (input) => forcedPlayerOutcome === undefined
+      ? base.service.submitOfferedAction(input)
+      : Promise.resolve(forcedPlayerOutcome),
+    setDoor: (input) => {
+      reducerExecutions += 1;
+      return base.service.setDoor(input);
+    },
+    close: () => base.service.close(),
+  };
+  return {
+    session: {
+      service, seats: base.seats, art: base.art,
+      ...(base.start === undefined ? {} : { start: base.start }),
+    },
+    reducerExecutions: () => reducerExecutions,
+  };
+}
+
 export async function runPlayerMovementConformance(
   transport: SceneTransport,
   start: () => Promise<void>,
@@ -128,7 +277,10 @@
   });
 }
 
-export async function runDmTransportConformance(transport: SceneTransport): Promise<ConformanceResult> {
+export async function runDmTransportConformance(
+  transport: SceneTransport,
+  reducerExecutions: () => number,
+): Promise<ConformanceResult> {
   const events: SceneSnapshotEvent[] = [];
   const unsubscribe = transport.subscribe((event) => events.push(event));
   const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
@@ -174,24 +326,31 @@
   expect(unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
 
   const beforeDoorEvents = events.length;
+  const beforeDoorExecutions = reducerExecutions();
   const door = await transport.request({
     v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
   });
   expect(door).toMatchObject({ id: 'door', ok: true });
   if (!door.ok || typeof door.result.revision !== 'number') throw new Error('Expected an acknowledged door revision.');
   const committedRevision = door.result.revision;
+  expect(reducerExecutions()).toBe(beforeDoorExecutions + 1);
   expect(events.some((event) => event.data.revision === committedRevision)).toBe(true);
   expect(events.map((event) => event.seq)).toEqual(events.map((_event, index) => index + 1));
   expect(events.at(-1)?.data.doors.find((candidate) => candidate.id === 'object:two-room-door')?.open).toBe(true);
 
-  const lateInitial = await transport.initialSnapshot();
-  expect(lateInitial.tokens.map((token) => token.id)).toEqual(initial.tokens.map((token) => token.id));
+  const lateEvents: SceneSnapshotEvent[] = [];
+  const stopLate = transport.subscribe((event) => lateEvents.push(event));
+  stopLate();
+  expect(lateEvents).toHaveLength(1);
+  expect(lateEvents[0]?.seq).toBe(events.at(-1)?.seq);
+  expect(lateEvents[0]?.data.revision).toBe(committedRevision);
   const sameState = await transport.request({
     v: 1, id: 'door:no-op', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
   });
   expect(sameState).toMatchObject({ id: 'door:no-op', ok: true, result: { revision: committedRevision } });
   expect(events.length).toBe(beforeDoorEvents + 1);
 
+  const beforeDuplicateExecutions = reducerExecutions();
   const duplicate = await transport.request({
     v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
   });
@@ -199,6 +358,7 @@
   if (duplicate.ok) throw new Error('A duplicate wire mutation id was accepted.');
   expect(['DUPLICATE_MUTATION', 'DUPLICATE_REQUEST_ID']).toContain(duplicate.error.code);
   expect(events.length).toBe(beforeDoorEvents + 1);
+  expect(reducerExecutions()).toBe(beforeDuplicateExecutions);
 
   unsubscribe();
   const malformed = transport.request('{');
@@ -221,8 +381,17 @@
     expect(new Set(correlated.map((response) => response.id)).size).toBe(2);
   });
   await executeTransportConformanceScenario('lawful structural values', () => {
-    expect(initial.tokens[0]).toMatchObject({ x: 2, y: 4, z: 0 });
-    expect(initial.tokens[0]).not.toMatchObject({ x: 2.5, y: 4, z: 0 });
+    const anchors = initial.tokens.map((token) => ({
+      column: token.x - (token.footprint.w - 1) / 2,
+      row: token.y - (token.footprint.h - 1) / 2,
+      z: token.z,
+    }));
+    expect(anchors).toEqual([
+      { column: 2, row: 4, z: 0 },
+      { column: 8, row: 4, z: 0 },
+    ]);
+    expect(Number.isInteger(initial.tokens[0]?.x ?? 0)).toBe(true);
+    expect(Number.isInteger((initial.tokens[0]?.x ?? 0) + 0.25)).toBe(false);
   });
   await executeTransportConformanceScenario('structural validation failures', () => {
     expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
@@ -241,12 +410,12 @@
     expect(unsupported.ok).not.toBe(true);
   });
   await executeTransportConformanceScenario('late subscription', () => {
-    expect(lateInitial.revision).toBe(initial.revision);
-    expect(lateInitial.revision).not.toBe(-1);
+    expect(lateEvents[0]?.seq).toBe(events.at(-1)?.seq);
+    expect(lateEvents[0]?.data.revision).toBe(committedRevision);
   });
   await executeTransportConformanceScenario('duplicate mutation id', () => {
     expect(duplicate.ok).toBe(false);
-    expect(events.length).toBe(beforeDoorEvents + 1);
+    expect(reducerExecutions()).toBe(beforeDuplicateExecutions);
   });
   await executeTransportConformanceScenario('malformed transport beside empty id', () => {
     expect(open.id).toBe('');
diff --git a/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts b/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
index 8f5d037b8f6cbe08ca5a884bde6a34e819514f37..075b91679eb432aa962d8c2115cd8f335f8a1d9e
--- a/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
+++ b/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
@@ -24,31 +24,46 @@
   return new Promise((resolveExit) => child.once('exit', (code, signal) => resolveExit({ code, signal })));
 }
 
-async function stopProcessGroup(child: ChildProcess): Promise<void> {
+interface LaunchOutput {
+  readonly output: () => string;
+  readonly errors: () => string;
+  readonly drained: Promise<void>;
+  readonly staticPort: () => number | null;
+  readonly websocketUrl: () => string | null;
+  readonly descendantPids: () => readonly number[];
+}
+
+function diagnostics(label: string, observation: LaunchOutput): string {
+  return [label, '--- stdout ---', observation.output(), '--- stderr ---', observation.errors()].join('\n');
+}
+
+async function stopProcessGroup(child: ChildProcess, observation: LaunchOutput): Promise<void> {
   const pid = child.pid;
-  if (pid === undefined) return;
-  if (child.exitCode === null && child.signalCode === null) {
-    try { process.kill(-pid, 'SIGTERM'); } catch { /* It may already have exited. */ }
-  }
   try {
-    await deadline(exited(child), EXIT_DEADLINE_MS, 'serve process-group termination');
-  } catch {
-    try { process.kill(-pid, 'SIGKILL'); } catch { /* The group may already be gone. */ }
-    await deadline(exited(child), EXIT_DEADLINE_MS, 'forced serve process-group termination');
+    if (pid !== undefined && child.exitCode === null && child.signalCode === null) {
+      try { process.kill(-pid, 'SIGTERM'); } catch { /* It may already have exited. */ }
+    }
+    try {
+      await deadline(exited(child), EXIT_DEADLINE_MS, 'serve process-group termination');
+    } catch {
+      if (pid !== undefined) {
+        try { process.kill(-pid, 'SIGKILL'); } catch { /* The group may already be gone. */ }
+      }
+      await deadline(exited(child), EXIT_DEADLINE_MS, 'forced serve process-group termination');
+    }
+    if (pid !== undefined) {
+      try { process.kill(-pid, 'SIGKILL'); } catch { /* Prove no surviving descendants by PID below. */ }
+    }
+    await deadline(observation.drained, EXIT_DEADLINE_MS, 'serve output drainage');
+  } catch (error: unknown) {
+    await Promise.race([
+      observation.drained,
+      new Promise<void>((resolveDrain) => setTimeout(resolveDrain, EXIT_DEADLINE_MS)),
+    ]);
+    throw new Error(diagnostics(
+      'Process cleanup failed: ' + (error instanceof Error ? error.message : String(error)), observation,
+    ));
   }
-  try { process.kill(-pid, 'SIGKILL'); } catch { /* Prove no surviving descendants by PID below. */ }
-}
-
-function unusedPort(): Promise<number> {
-  return new Promise((resolvePort, reject) => {
-    const server = createServer();
-    server.once('error', reject);
-    server.listen(0, '127.0.0.1', () => {
-      const address = server.address();
-      if (address === null || typeof address === 'string') { reject(new Error('No ephemeral port was assigned.')); return; }
-      server.close((error) => error === undefined ? resolvePort(address.port) : reject(error));
-    });
-  });
 }
 
 function provePortFree(port: number): Promise<void> {
@@ -60,15 +75,7 @@
   });
 }
 
-interface LaunchOutput {
-  readonly output: () => string;
-  readonly errors: () => string;
-  readonly staticPort: () => number | null;
-  readonly runtimePort: number;
-  readonly descendantPids: () => readonly number[];
-}
-
-function launch(tokensFile: string, runtimePort: number, injectFailure: boolean): {
+function launch(tokensFile: string, injectFailure: boolean): {
   readonly child: ChildProcess;
   readonly observation: LaunchOutput;
 } {
@@ -78,13 +85,17 @@
     env: {
       ...process.env,
       VTT_RUNTIME_TOKENS_FILE: tokensFile,
-      VTT_RUNTIME_PORT: String(runtimePort),
+      VTT_RUNTIME_PORT: '0',
       ...(injectFailure ? { VTT_RUNTIME_INJECT_STARTUP_FAILURE: '1' } : {}),
     },
     stdio: ['ignore', 'pipe', 'pipe'],
   });
   let output = '';
   let errors = '';
+  const drained = Promise.all([
+    child.stdout === null ? Promise.resolve() : new Promise<void>((resolveDrain) => child.stdout?.once('close', resolveDrain)),
+    child.stderr === null ? Promise.resolve() : new Promise<void>((resolveDrain) => child.stderr?.once('close', resolveDrain)),
+  ]).then(() => undefined);
   child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
   child.stderr?.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
   return {
@@ -92,11 +103,12 @@
     observation: {
       output: () => output,
       errors: () => errors,
+      drained,
       staticPort: () => {
         const value = /serve: fresh dist\/ available at http:\/\/127\.0\.0\.1:(\d+)/u.exec(output)?.[1];
         return value === undefined ? null : Number(value);
       },
-      runtimePort,
+      websocketUrl: () => /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(output)?.[1] ?? null,
       descendantPids: () => [
         /serve: process pid (\d+)/u.exec(output)?.[1],
         /serve: vtt runtime child pid (\d+)/u.exec(output)?.[1],
@@ -112,17 +124,33 @@
   predicate: () => boolean,
   label: string,
 ): Promise<void> {
-  return deadline(new Promise<void>((resolveReady, reject) => {
+  const ready = new Promise<void>((resolveReady, reject) => {
     const inspect = (): void => { if (predicate()) resolveReady(); };
     child.stdout?.on('data', inspect);
     child.stderr?.on('data', inspect);
-    child.once('exit', (code) => {
-      inspect();
-      if (!predicate()) reject(new Error(label + ' exited ' + String(code) + ': ' + observation.errors()));
+    child.once('exit', (code, signal) => {
+      void observation.drained.then(() => {
+        inspect();
+        if (!predicate()) reject(new Error(diagnostics(
+          label + ' exited ' + String(code) + ' (' + String(signal) + ') before readiness.', observation,
+        )));
+      });
+    });
+    child.once('error', (error) => {
+      void observation.drained.then(() => reject(new Error(diagnostics(
+        label + ' failed to spawn: ' + error.message, observation,
+      ))));
     });
-    child.once('error', reject);
     inspect();
-  }), STARTUP_DEADLINE_MS, label);
+  });
+  return deadline(ready, STARTUP_DEADLINE_MS, label).catch(async (error: unknown) => {
+    await stopProcessGroup(child, observation);
+    await observation.drained;
+    if (error instanceof Error && error.message.includes('--- stdout ---')) throw error;
+    throw new Error(diagnostics(
+      error instanceof Error ? error.message : String(error), observation,
+    ));
+  });
 }
 
 test('launches a fresh runtime and contains both successful and failed process trees', async () => {
@@ -136,21 +164,22 @@
   chmodSync(tokensFile, 0o600);
 
   try {
-  const successfulPort = await unusedPort();
-  const successful = launch(tokensFile, successfulPort, false);
+  const successful = launch(tokensFile, false);
   let successfulPids: readonly number[] = [];
   let successfulStaticPort: number | null = null;
+  let successfulRuntimePort: number | null = null;
   try {
     await waitForOutput(successful.child, successful.observation, () =>
       /serve: fresh dist\/ available at http:\/\/127\.0\.0\.1:\d+/u.test(successful.observation.output())
-      && new RegExp('vtt-runtime: listening ws://127\\.0\\.0\\.1:' + String(successfulPort) + '/vtt/v1', 'u')
-        .test(successful.observation.output()), 'successful launch');
+      && successful.observation.websocketUrl() !== null, 'successful launch');
     successfulStaticPort = successful.observation.staticPort();
     if (successfulStaticPort === null) throw new Error('The static listening line was absent.');
     successfulPids = successful.observation.descendantPids();
     expect(successfulPids).toHaveLength(3);
     const staticOrigin = 'http://127.0.0.1:' + String(successfulStaticPort);
-    const websocketUrl = 'ws://127.0.0.1:' + String(successfulPort) + '/vtt/v1';
+    const websocketUrl = successful.observation.websocketUrl();
+    if (websocketUrl === null) throw new Error('The runtime listening line was absent.');
+    successfulRuntimePort = Number(new URL(websocketUrl).port);
     const stampResponse = await deadline(fetch(staticOrigin + '/vtt-handoff-artifact.json', { cache: 'no-store' }), 5_000, 'artifact fetch');
     expect(stampResponse.ok).toBe(true);
     const stamp = await stampResponse.json() as unknown;
@@ -187,15 +216,15 @@
     expect(successful.observation.output() + '\n' + successful.observation.errors()).not.toContain(token);
     socket.close();
   } finally {
-    await stopProcessGroup(successful.child);
+    await stopProcessGroup(successful.child, successful.observation);
   }
   if (successfulStaticPort === null) throw new Error('The successful static port was not recorded.');
+  if (successfulRuntimePort === null) throw new Error('The successful runtime port was not recorded.');
   await provePortFree(successfulStaticPort);
-  await provePortFree(successfulPort);
+  await provePortFree(successfulRuntimePort);
   expect(successfulPids.every((pid) => !existsSync('/proc/' + String(pid)))).toBe(true);
 
-  const failedPort = await unusedPort();
-  const failed = launch(tokensFile, failedPort, true);
+  const failed = launch(tokensFile, true);
   let failedStaticPort: number | null = null;
   let failedPids: readonly number[] = [];
   try {
@@ -208,11 +237,10 @@
     const result = await deadline(exited(failed.child), EXIT_DEADLINE_MS, 'failed launch exit');
     expect(result.code).not.toBe(0);
   } finally {
-    await stopProcessGroup(failed.child);
+    await stopProcessGroup(failed.child, failed.observation);
   }
   if (failedStaticPort === null) throw new Error('The failed static port was not recorded.');
   await provePortFree(failedStaticPort);
-  await provePortFree(failedPort);
   expect(failedPids.every((pid) => !existsSync('/proc/' + String(pid)))).toBe(true);
   } finally {
     rmSync(root, { recursive: true, force: true });
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index 78204e2dce278b4f43e4991b3dc531e301c08bb1..e569685fb3908f9076aeab860f40d721c27ed678
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -129,60 +129,102 @@
   return graph;
 }
 
+function reachableSubgraph(
+  graph: ReadonlyMap<string, SourceModule>, entrypoints: readonly string[],
+): ReadonlyMap<string, SourceModule> {
+  const reachable = new Map<string, SourceModule>();
+  const pending = entrypoints.map((entrypoint) => resolve(ROOT, entrypoint));
+  while (pending.length > 0) {
+    const file = pending.pop();
+    if (file === undefined || reachable.has(file)) continue;
+    const module = graph.get(file);
+    if (module === undefined) throw new Error(`Production graph omitted ${repositoryPath(file)}`);
+    reachable.set(file, module);
+    for (const edge of module.imports) if (edge.resolved !== null) pending.push(edge.resolved);
+  }
+  return reachable;
+}
+
+function graphProgram(
+  graph: ReadonlyMap<string, SourceModule>,
+  overrides: ReadonlyMap<string, string> = new Map(),
+  includeLibraries = false,
+): ts.Program {
+  const options: ts.CompilerOptions = {
+    module: ts.ModuleKind.ESNext,
+    moduleResolution: ts.ModuleResolutionKind.Bundler,
+    noLib: !includeLibraries,
+    noResolve: includeLibraries,
+    skipLibCheck: true,
+    target: ts.ScriptTarget.ESNext,
+    types: [],
+  };
+  const host = ts.createCompilerHost(options);
+  const defaultSourceFile = host.getSourceFile.bind(host);
+  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
+    const absolute = resolve(fileName);
+    const override = overrides.get(absolute);
+    const module = graph.get(absolute);
+    if (override !== undefined || module !== undefined) {
+      const source = override ?? module?.sourceFile.text;
+      if (source === undefined) throw new Error(`Graph source is unavailable for ${absolute}`);
+      return ts.createSourceFile(
+        absolute, source, languageVersion, true,
+        absolute.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
+      );
+    }
+    return defaultSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
+  };
+  return ts.createProgram({ rootNames: [...graph.keys()], options, host });
+}
+
+function resolvedSymbol(checker: ts.TypeChecker, node: ts.Node): ts.Symbol | null {
+  let symbol = checker.getSymbolAtLocation(node);
+  if (symbol === undefined) return null;
+  const visited = new Set<ts.Symbol>();
+  while ((symbol.flags & ts.SymbolFlags.Alias) !== 0 && !visited.has(symbol)) {
+    visited.add(symbol);
+    symbol = checker.getAliasedSymbol(symbol);
+  }
+  return symbol;
+}
+
 function platformViolations(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
   const violations: string[] = [];
   const nodeBuiltins = new Set(builtinModules.flatMap((name) => [name, name.replace(/^node:/u, '')]));
-  const browserMembers = new Set([
-    'document', 'window', 'indexedDB', 'SharedArrayBuffer', 'Atomics', 'OffscreenCanvas',
-  ]);
+  const forbiddenNames = /^(?:document|window|indexedDB|IDB(?:Database|Factory|ObjectStore)|Document|HTMLElement|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u;
+  const program = graphProgram(graph, new Map(), true);
+  const checker = program.getTypeChecker();
+  const isPlatformSymbol = (symbol: ts.Symbol | null): boolean => {
+    if (symbol === null || !forbiddenNames.test(symbol.getName())) return false;
+    return symbol.getDeclarations()?.some((declaration) => {
+      const file = declaration.getSourceFile().fileName.replaceAll('\\', '/');
+      return /\/typescript\/lib\/lib\.(?:dom|webworker|es\d+\.sharedmemory)\.d\.ts$/u.test(file);
+    }) === true;
+  };
   for (const module of graph.values()) {
     for (const edge of module.imports) {
       if (edge.specifier.startsWith('node:') || nodeBuiltins.has(edge.specifier.split('/')[0] ?? edge.specifier)) {
         violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
       }
     }
-    const browserRoots = new Set(['globalThis', 'window', 'document', 'indexedDB']);
-    for (const statement of module.sourceFile.statements) {
-      if (!ts.isVariableStatement(statement)) continue;
-      for (const declaration of statement.declarationList.declarations) {
-        const initializer = declaration.initializer;
-        if (initializer === undefined) continue;
-        const rootName = ts.isIdentifier(initializer) ? initializer.text : null;
-        if (ts.isIdentifier(declaration.name) && rootName !== null && browserRoots.has(rootName)) {
-          browserRoots.add(declaration.name.text);
-        }
-        if (ts.isObjectBindingPattern(declaration.name) && rootName !== null && browserRoots.has(rootName)) {
-          for (const element of declaration.name.elements) {
-            const property = element.propertyName?.getText(module.sourceFile) ?? element.name.getText(module.sourceFile);
-            if (browserMembers.has(property) && ts.isIdentifier(element.name)) {
-              browserRoots.add(element.name.text);
-              violations.push(`${repositoryPath(module.file)} destructures ${property} from ${rootName}`);
-            }
-          }
-        }
-      }
-    }
+    const sourceFile = program.getSourceFile(module.file);
+    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
     const visit = (node: ts.Node): void => {
-      if (ts.isPropertyAccessExpression(node)) {
-        const expression = ts.isIdentifier(node.expression) ? node.expression.text : node.expression.getText(module.sourceFile);
-        if (browserRoots.has(expression) && browserMembers.has(node.name.text)) {
-          violations.push(`${repositoryPath(module.file)} uses ${node.getText(module.sourceFile)}`);
-        }
+      if (ts.isIdentifier(node) && isPlatformSymbol(resolvedSymbol(checker, node))) {
+        violations.push(`${repositoryPath(module.file)} resolves ${node.getText(sourceFile)} to ${resolvedSymbol(checker, node)?.getName() ?? '<unknown>'}`);
       }
       if (
-        ts.isElementAccessExpression(node) &&
-        ts.isIdentifier(node.expression) && browserRoots.has(node.expression.text) &&
-        ts.isStringLiteral(node.argumentExpression) && browserMembers.has(node.argumentExpression.text)
-      ) violations.push(`${repositoryPath(module.file)} uses ${node.getText(module.sourceFile)}`);
-      if (
-        ts.isIdentifier(node) &&
-        /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u.test(node.text)
+        ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)
       ) {
-        violations.push(`${repositoryPath(module.file)} names ${node.text}`);
+        const property = checker.getTypeAtLocation(node.expression).getProperty(node.argumentExpression.text);
+        if (isPlatformSymbol(property ?? null)) {
+          violations.push(`${repositoryPath(module.file)} resolves ${node.getText(sourceFile)} to ${property?.getName() ?? '<unknown>'}`);
+        }
       }
       ts.forEachChild(node, visit);
     };
-    ts.forEachChild(module.sourceFile, visit);
+    ts.forEachChild(sourceFile, visit);
   }
   return [...new Set(violations)].sort();
 }
@@ -245,18 +287,11 @@
   return '<module>';
 }
 
-function reducerCallSites(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
-  const program = ts.createProgram({
-    rootNames: [...graph.keys()],
-    options: {
-      module: ts.ModuleKind.ESNext,
-      moduleResolution: ts.ModuleResolutionKind.Bundler,
-      noLib: true,
-      skipLibCheck: true,
-      target: ts.ScriptTarget.ESNext,
-      types: [],
-    },
-  });
+function reducerCallSites(
+  graph: ReadonlyMap<string, SourceModule>,
+  suppliedProgram?: ts.Program,
+): readonly string[] {
+  const program = suppliedProgram ?? graphProgram(graph);
   const checker = program.getTypeChecker();
   const calls: string[] = [];
   for (const module of graph.values()) {
@@ -297,28 +332,70 @@
   suppliedProgram?: ts.Program,
 ): {
   readonly constructedClasses: ReadonlySet<string>;
+  readonly serviceValues: ReadonlySet<string>;
   readonly reducerCalls: readonly string[];
 } {
-  const program = suppliedProgram ?? ts.createProgram({
-    rootNames: [...graph.keys()],
-    options: {
-      module: ts.ModuleKind.ESNext,
-      moduleResolution: ts.ModuleResolutionKind.Bundler,
-      noLib: true,
-      skipLibCheck: true,
-      target: ts.ScriptTarget.ESNext,
-      types: [],
-    },
-  });
+  const program = suppliedProgram ?? graphProgram(graph);
   const checker = program.getTypeChecker();
-  const definitions = new Set<string>();
+  const constructions = new Set<string>();
+  const serviceValues = new Set<string>();
   const reducerCalls: string[] = [];
+  const definitionIdentity = (node: ts.Node): string | null => {
+    const symbol = resolvedSymbol(checker, node);
+    const declaration = symbol?.getDeclarations()?.find((candidate) => {
+      const file = candidate.getSourceFile().fileName;
+      return file.startsWith(`${ROOT}/`) && !file.includes('/node_modules/');
+    });
+    return symbol === null || declaration === undefined
+      ? null
+      : `${symbol.getName()}@${repositoryPath(declaration.getSourceFile().fileName)}`;
+  };
+  const typeIdentity = (node: ts.Node): string | null => {
+    const type = checker.getTypeAtLocation(node);
+    const symbol = type.aliasSymbol ?? type.getSymbol();
+    const declaration = symbol?.getDeclarations()?.find((candidate) =>
+      candidate.getSourceFile().fileName.startsWith(`${ROOT}/`));
+    return symbol === undefined || declaration === undefined
+      ? null
+      : `${symbol.getName()}@${repositoryPath(declaration.getSourceFile().fileName)}`;
+  };
   for (const module of graph.values()) {
     const sourceFile = program.getSourceFile(module.file);
     if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
     const visit = (node: ts.Node): void => {
-      if (ts.isClassDeclaration(node) && node.name !== undefined) {
-        definitions.add(`${node.name.text}@${repositoryPath(sourceFile.fileName)}`);
+      if (ts.isNewExpression(node)) {
+        const identity = definitionIdentity(node.expression);
+        if (identity !== null) constructions.add(identity);
+        if (identity === 'ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts') {
+          const argument = node.arguments?.[0];
+          if (argument !== undefined) {
+            if (ts.isObjectLiteralExpression(argument)) {
+              for (const property of argument.properties) {
+                if (ts.isShorthandPropertyAssignment(property) && property.name.text === 'service') {
+                  const serviceIdentity = typeIdentity(property.name);
+                  if (serviceIdentity !== null) serviceValues.add(serviceIdentity);
+                } else if (
+                  ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === 'service'
+                ) {
+                  const serviceIdentity = typeIdentity(property.initializer);
+                  if (serviceIdentity !== null) serviceValues.add(serviceIdentity);
+                }
+              }
+            } else {
+              const serviceProperty = checker.getTypeAtLocation(argument).getProperty('service');
+              const declaration = serviceProperty?.valueDeclaration ?? serviceProperty?.declarations?.[0];
+              if (serviceProperty !== undefined && declaration !== undefined) {
+                const serviceType = checker.getTypeOfSymbolAtLocation(serviceProperty, declaration);
+                const serviceSymbol = serviceType.aliasSymbol ?? serviceType.getSymbol();
+                const serviceDeclaration = serviceSymbol?.getDeclarations()?.find((candidate) =>
+                  candidate.getSourceFile().fileName.startsWith(`${ROOT}/`));
+                if (serviceSymbol !== undefined && serviceDeclaration !== undefined) {
+                  serviceValues.add(`${serviceSymbol.getName()}@${repositoryPath(serviceDeclaration.getSourceFile().fileName)}`);
+                }
+              }
+            }
+          }
+        }
       }
       if (ts.isCallExpression(node) && !insideImport(node)) {
         const definition = definingReducer(checker, node.expression);
@@ -333,7 +410,7 @@
     };
     ts.forEachChild(sourceFile, visit);
   }
-  return { constructedClasses: definitions, reducerCalls: reducerCalls.sort() };
+  return { constructedClasses: constructions, serviceValues, reducerCalls: reducerCalls.sort() };
 }
 
 function assertRuntimeConvergence(
@@ -341,7 +418,8 @@
   adapter: string,
 ): void {
   const definitions = [...evidence.constructedClasses];
-  if (!definitions.includes('EncounterSessionService@src/vtt/encounter-session-service.ts')) {
+  if (!definitions.includes('EncounterSessionService@src/vtt/encounter-session-service.ts')
+    && !evidence.serviceValues.has('EncounterSessionService@src/vtt/encounter-session-service.ts')) {
     throw new Error('Runtime entry bypasses EncounterSessionService.');
   }
   if (!definitions.includes('ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts')) {
@@ -426,10 +504,25 @@
   'tools/vtt-handoff/node-runtime.ts',
   'src/vtt/handoff/websocket-transport.ts',
 ] as const;
+const RUNTIME_ADAPTER_ENTRIES = [
+  {
+    files: ['src/vtt/handoff/in-process-transport.ts'],
+    adapter: 'InProcessSceneTransport@src/vtt/handoff/in-process-transport.ts',
+  },
+  {
+    files: ['src/vtt/handoff/worker-entry.ts', 'src/vtt/handoff/worker-transport.ts'],
+    adapter: 'WorkerSceneTransport@src/vtt/handoff/worker-transport.ts',
+  },
+  {
+    files: ['tools/vtt-handoff/node-runtime.ts', 'src/vtt/handoff/websocket-transport.ts'],
+    adapter: 'WebSocketSceneTransport@src/vtt/handoff/websocket-transport.ts',
+  },
+] as const;
 
 let cachedCoreGraph: ReadonlyMap<string, SourceModule> | null = null;
 let cachedRuntimeGraph: ReadonlyMap<string, SourceModule> | null = null;
 let cachedRuntimeReducerCalls: readonly string[] | null = null;
+let cachedRuntimeProgram: ts.Program | null = null;
 
 function coreDependencyGraph(): ReadonlyMap<string, SourceModule> {
   cachedCoreGraph ??= dependencyGraph(CORE_ENTRYPOINTS);
@@ -437,27 +530,18 @@
 }
 
 function runtimeDependencyGraph(): ReadonlyMap<string, SourceModule> {
-  cachedRuntimeGraph ??= dependencyGraph(RUNTIME_ENTRYPOINTS);
+  cachedRuntimeGraph ??= dependencyGraph(RUNTIME_ENTRYPOINTS, true);
   return cachedRuntimeGraph;
 }
 
+function runtimeProgram(): ts.Program {
+  cachedRuntimeProgram ??= graphProgram(runtimeDependencyGraph());
+  return cachedRuntimeProgram;
+}
+
 function runtimeReducerCalls(): readonly string[] {
-  cachedRuntimeReducerCalls ??= reducerCallSites(runtimeDependencyGraph());
+  cachedRuntimeReducerCalls ??= reducerCallSites(runtimeDependencyGraph(), runtimeProgram());
   return cachedRuntimeReducerCalls;
-}
-
-function classDefinitions(graph: ReadonlyMap<string, SourceModule>): ReadonlySet<string> {
-  const definitions = new Set<string>();
-  for (const module of graph.values()) {
-    const visit = (node: ts.Node): void => {
-      if (ts.isClassDeclaration(node) && node.name !== undefined) {
-        definitions.add(`${node.name.text}@${repositoryPath(module.file)}`);
-      }
-      ts.forEachChild(node, visit);
-    };
-    ts.forEachChild(module.sourceFile, visit);
-  }
-  return definitions;
 }
 
 describe('renderer-neutral engine boundary graph', () => {
@@ -492,24 +576,31 @@
 
   it('rejects bare Node builtins plus aliased, destructured, and computed browser globals', () => {
     const file = resolve(ROOT, '.tmp/platform-gate-mutant.ts');
-    const sourceFile = ts.createSourceFile(file, `
-      import filesystem from 'fs';
-      const browser = globalThis;
-      const { document: pageDocument } = browser;
-      void browser['indexedDB'];
-      void pageDocument.body;
-      void filesystem;
-    `, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
-    const module: SourceModule = {
-      file,
-      sourceFile,
-      imports: valueImportSpecifiers(sourceFile).map((specifier) => ({ specifier, resolved: null })),
+    const violations = (source: string): readonly string[] => {
+      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
+      const module: SourceModule = {
+        file,
+        sourceFile,
+        imports: valueImportSpecifiers(sourceFile).map((specifier) => ({ specifier, resolved: null })),
+      };
+      return platformViolations(new Map([[file, module]]));
     };
-    expect(platformViolations(new Map([[file, module]]))).toEqual([
-      '.tmp/platform-gate-mutant.ts destructures document from browser',
+    expect(violations("import filesystem from 'fs'; void filesystem;")).toEqual([
       '.tmp/platform-gate-mutant.ts imports fs',
-      ".tmp/platform-gate-mutant.ts uses browser['indexedDB']",
     ]);
+    expect(violations(`function render(): void {
+      const browser = globalThis;
+      browser.document.createElement('div');
+    }`)).toEqual([
+      '.tmp/platform-gate-mutant.ts resolves document to document',
+    ]);
+    expect(violations('const { document: pageDocument } = globalThis; void pageDocument.body;')).toEqual([
+      '.tmp/platform-gate-mutant.ts resolves document to document',
+    ]);
+    expect(violations("const browser = globalThis; void browser['indexedDB'];")).toEqual([
+      ".tmp/platform-gate-mutant.ts resolves browser['indexedDB'] to indexedDB",
+    ]);
+    expect(violations("export {}; const document = { createElement: () => 'local' }; document.createElement();")).toEqual([]);
   });
 
   it('all runtime entries converge on the pinned session reducer edges', () => {
@@ -517,49 +608,50 @@
   });
 
   it('all renderer adapters converge on the session service', () => {
-    const entries = [
-      {
-        files: ['src/vtt/handoff/in-process-transport.ts'],
-        adapter: 'InProcessSceneTransport@src/vtt/handoff/in-process-transport.ts',
-      },
-      {
-        files: ['src/vtt/handoff/worker-entry.ts', 'src/vtt/handoff/worker-transport.ts'],
-        adapter: 'WorkerSceneTransport@src/vtt/handoff/worker-transport.ts',
-      },
-      {
-        files: ['tools/vtt-handoff/node-runtime.ts', 'src/vtt/handoff/websocket-transport.ts'],
-        adapter: 'WebSocketSceneTransport@src/vtt/handoff/websocket-transport.ts',
-      },
-    ] as const;
-    const entryGraphs = entries.map((entry) => dependencyGraph(entry.files, true));
     const productionGraph = runtimeDependencyGraph();
-    const valid = { constructedClasses: classDefinitions(productionGraph), reducerCalls: runtimeReducerCalls() };
-    for (const [index, entry] of entries.entries()) {
+    const entryGraphs = RUNTIME_ADAPTER_ENTRIES.map((entry) => reachableSubgraph(productionGraph, entry.files));
+    const valid = runtimeConvergenceEvidence(productionGraph, runtimeProgram());
+    for (const [index, entry] of RUNTIME_ADAPTER_ENTRIES.entries()) {
       const graph = entryGraphs[index];
       if (graph === undefined) throw new Error('Runtime entry graph is unavailable.');
       expect([...graph.keys()].map(repositoryPath).some((file) => file.startsWith('tests/helpers/'))).toBe(false);
       expect([...graph.keys()].map(repositoryPath)).not.toContain('src/vtt/encounter-app.ts');
-      assertRuntimeConvergence({
-        constructedClasses: classDefinitions(graph),
-        reducerCalls: [],
-      }, entry.adapter);
+      assertRuntimeConvergence(runtimeConvergenceEvidence(graph, runtimeProgram()), entry.adapter);
     }
     assertPermittedReducerEdges(valid.reducerCalls);
-    expect(() => assertPermittedReducerEdges([
-      ...valid.reducerCalls,
-      'tools/vtt-handoff/node-runtime.ts#injected -> src/combat/encounter.ts#reduceEncounter',
-    ])).toThrow('unexpected reducer edge');
-    expect(() => assertRuntimeConvergence({
-      ...valid,
-      constructedClasses: new Set([...valid.constructedClasses].filter((value) =>
-        value !== 'EncounterSessionService@src/vtt/encounter-session-service.ts')),
-    }, entries[2].adapter)).toThrow('bypasses EncounterSessionService');
-    expect(platformViolations(dependencyGraph([
-      'src/vtt/handoff/websocket-transport.ts',
-      'src/vtt/handoff/worker-transport.ts',
-    ]))).toEqual([]);
   });
 
+  it('rejects source-mutated reducer and service bypasses', () => {
+    const productionGraph = runtimeDependencyGraph();
+    const inProcessGraph = reachableSubgraph(productionGraph, RUNTIME_ADAPTER_ENTRIES[0].files);
+    const nodeFile = resolve(ROOT, 'tools/vtt-handoff/node-runtime.ts');
+    const inProcessFile = resolve(ROOT, 'src/vtt/handoff/in-process-transport.ts');
+    const bypassSource = readFileSync(inProcessFile, 'utf8')
+      .replace('type ProtocolTransportFault,', 'type ProtocolSessionPort, type ProtocolTransportFault,')
+      .replace('readonly service: EncounterSessionService;', 'readonly service: ProtocolSessionPort;');
+    const sourceMutants = new Map([
+      [nodeFile, [
+      "import { reduceEncounter } from '../../src/combat/encounter';",
+      readFileSync(nodeFile, 'utf8'),
+      'reduceEncounter({} as never, {} as never);',
+      ].join('\n')],
+      [inProcessFile, bypassSource],
+    ]);
+    const mutantProgram = graphProgram(productionGraph, sourceMutants);
+    const reducerMutantEvidence = runtimeConvergenceEvidence(
+      productionGraph, mutantProgram,
+    );
+    expect(() => assertPermittedReducerEdges(reducerMutantEvidence.reducerCalls))
+      .toThrow('unexpected reducer edge');
+
+    const bypassEvidence = runtimeConvergenceEvidence(
+      inProcessGraph,
+      mutantProgram,
+    );
+    expect(() => assertRuntimeConvergence(bypassEvidence, RUNTIME_ADAPTER_ENTRIES[0].adapter))
+      .toThrow('bypasses EncounterSessionService');
+  });
+
   it('keeps the complete selector value graph projection-only and platform-neutral', () => {
     const graph = dependencyGraph(['src/vtt/encounter-selectors.ts']);
     const files = [...graph.keys()].map(repositoryPath);
diff --git a/tests/unit/vtt/in-process-transport.test.ts b/tests/unit/vtt/in-process-transport.test.ts
index 0fecc7e68327f4041b8e87369815706a1ae07362..69534826e6b3da67f50914385c3add2f37b14b7c
--- a/tests/unit/vtt/in-process-transport.test.ts
+++ b/tests/unit/vtt/in-process-transport.test.ts
@@ -537,7 +537,7 @@
     },
   );
 
-  it('delivers the initial snapshot once and only future events to late subscribers', async () => {
+  it('delivers the buffered latest snapshot and then future events to late subscribers', async () => {
     const { host, port, runtime } = fixture();
     const transport = new InProcessSceneTransport(runtime);
     const early: number[] = [];
@@ -553,7 +553,7 @@
     transport.subscribe((event) => late.push(event.seq));
     port.emitDm({ kind: 'autonomous', seq: 90, projection: port.dmSnapshot() });
     expect(early).toEqual([1, 2]);
-    expect(late).toEqual([2]);
+    expect(late).toEqual([1, 2]);
     transport.destroySession();
     host.close();
   });
diff --git a/tests/unit/vtt/node-runtime.test.ts b/tests/unit/vtt/node-runtime.test.ts
index 404b2f2044b3890b2b22b1fa86196db9a884a975..f68671661a9ac83d19a0f937ccc2f8d4691c03c9
--- a/tests/unit/vtt/node-runtime.test.ts
+++ b/tests/unit/vtt/node-runtime.test.ts
@@ -1,3 +1,4 @@
+import { execFileSync, spawnSync } from 'node:child_process';
 import { createHash } from 'node:crypto';
 import {
   chmodSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync,
@@ -109,7 +110,7 @@
   return new Promise((resolveCode) => socket.once('close', (code) => resolveCode(code)));
 }
 
-function rawUpgradePeer(url: string, token: string): Promise<Socket> {
+function rawUpgradePeer(url: string, token: string, pauseAfterUpgrade = true): Promise<Socket> {
   const endpoint = new URL(url);
   return new Promise((resolveSocket, reject) => {
     const socket = createConnection({ host: '127.0.0.1', port: Number(endpoint.port) });
@@ -121,7 +122,7 @@
       try {
         expect(headers).toMatch(/^HTTP\/1\.1 101 /u);
         socket.removeAllListeners('data');
-        socket.pause();
+        if (pauseAfterUpgrade) socket.pause();
         resolveSocket(socket);
       } catch (error: unknown) { reject(error); }
     });
@@ -139,6 +140,23 @@
   });
 }
 
+function maskedTextFrame(text: string): Buffer {
+  const payload = Buffer.from(text);
+  if (payload.byteLength >= 126) throw new Error('The raw test frame must use the short length form.');
+  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
+  const frame = Buffer.alloc(2 + mask.byteLength + payload.byteLength);
+  frame[0] = 0x81;
+  frame[1] = 0x80 | payload.byteLength;
+  mask.copy(frame, 2);
+  for (let index = 0; index < payload.byteLength; index += 1) {
+    const maskByte = mask[index % mask.byteLength];
+    const payloadByte = payload[index];
+    if (maskByte === undefined || payloadByte === undefined) throw new Error('Raw frame indexing failed.');
+    frame[6 + index] = payloadByte ^ maskByte;
+  }
+  return frame;
+}
+
 interface RawHandshakeOverrides {
   readonly host?: string;
   readonly key?: string;
@@ -292,6 +310,41 @@
     })).toThrow('changed while it was opened');
   });
 
+  it('refuses a FIFO without blocking and proves removing O_NONBLOCK exceeds the bounded deadline', () => {
+    const root = temporaryRoot();
+    const fifo = resolve(root, 'tokens.fifo');
+    execFileSync('mkfifo', [fifo]);
+    const childSource = resolve(root, 'fifo-runtime-child.ts');
+    const runtimeSource = resolve('tools/vtt-handoff/token-claims.ts');
+    writeFileSync(childSource, [
+      `import { readTokenClaims } from ${JSON.stringify(runtimeSource)};`,
+      'try {',
+      `  readTokenClaims(${JSON.stringify(fifo)});`,
+      "  process.stderr.write('runtime unexpectedly accepted FIFO\\n');",
+      '  process.exitCode = 2;',
+      '} catch (error: unknown) {',
+      "  process.stdout.write(error instanceof Error ? error.message + '\\n' : 'non-error rejection\\n');",
+      '}',
+      '',
+    ].join('\n'), { mode: 0o600 });
+    const tsx = resolve('node_modules/.bin/tsx');
+    const actual = spawnSync(tsx, [childSource], {
+      cwd: process.cwd(), encoding: 'utf8', timeout: 2_000,
+    });
+    expect({ status: actual.status, signal: actual.signal, stderr: actual.stderr }).toEqual({
+      status: 0, signal: null, stderr: '',
+    });
+    expect(actual.stdout).toBe('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.\n');
+
+    const mutant = spawnSync(process.execPath, ['-e', [
+      "const { constants, openSync } = require('node:fs');",
+      `openSync(${JSON.stringify(fifo)}, constants.O_RDONLY | constants.O_NOFOLLOW);`,
+    ].join('\n')], { encoding: 'utf8', timeout: 250 });
+    expect(mutant.status).toBeNull();
+    expect(mutant.signal).toBe('SIGTERM');
+    expect(mutant.error === undefined ? undefined : Reflect.get(mutant.error, 'code')).toBe('ETIMEDOUT');
+  });
+
   it('authenticates before upgrade, echoes only vtt.v1, and binds claims to session.open', async () => {
     const setup = await runtime([
       { tokenSha256: hash('dm-secret'), role: 'dm' },
@@ -395,6 +448,22 @@
     expect(setup.runtime.sessionCounts().active).toBe(0);
   });
 
+  it('contains a malformed frame received while a policy-closing peer is still physical', async () => {
+    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }]);
+    const peer = await rawUpgradePeer(setup.url, 'dm-secret', false);
+    const peerClosed = new Promise<void>((resolveClosed) => peer.once('close', () => resolveClosed()));
+    peer.write(maskedTextFrame(JSON.stringify({
+      v: 1, id: 'before-open', method: 'scene.snapshot', params: {},
+    })));
+    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 20));
+    peer.write(Buffer.from([0x83, 0x00]));
+    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 20));
+    await expect(bounded(setup.runtime.close(), 'closing-frame factory shutdown')).resolves.toBeUndefined();
+    await expect(bounded(peerClosed, 'closing-frame physical close')).resolves.toBeUndefined();
+    expect(peer.destroyed).toBe(true);
+    expect(setup.runtime.sessionCounts()).toEqual({ created: 1, active: 0 });
+  });
+
   it('uses fresh logical sessions and refuses reused wire ids before dispatch', async () => {
     const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }]);
     const first = await connect(setup.url, 'dm-secret');
diff --git a/tests/unit/vtt/node-websocket-transport.test.ts b/tests/unit/vtt/node-websocket-transport.test.ts
index b8c1efbc7d2b104ac6677eb2aabac0ec9b3f368f..36df4150243c5bf74d05184eadc58a1ef208f4d8
--- a/tests/unit/vtt/node-websocket-transport.test.ts
+++ b/tests/unit/vtt/node-websocket-transport.test.ts
@@ -2,6 +2,7 @@
 import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
 import { resolve } from 'node:path';
 import { afterEach, describe, expect, it, vi } from 'vitest';
+import { WebSocketServer } from 'ws';
 import {
   createDefaultNodeRuntimeSession, createVttNodeRuntime, type VttNodeRuntime,
 } from '../../../tools/vtt-handoff/node-runtime';
@@ -11,6 +12,7 @@
 
 const roots: string[] = [];
 const runtimes: VttNodeRuntime[] = [];
+const scriptedServers: WebSocketServer[] = [];
 
 function tokenFile(token: string): string {
   mkdirSync(resolve('.tmp'), { recursive: true });
@@ -23,6 +25,10 @@
 }
 
 afterEach(async () => {
+  await Promise.all(scriptedServers.splice(0).map(async (server) => {
+    for (const socket of server.clients) socket.terminate();
+    await new Promise<void>((resolveClosed) => server.close(() => resolveClosed()));
+  }));
   await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
   for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
 });
@@ -41,23 +47,59 @@
     const address = await runtime.listen(0);
     const warm = new WebSocketSceneTransport(address.websocketUrl, token);
     await warm.request({ v: 1, id: 'warm-open', method: 'session.open', params: { requestedRole: 'dm' } });
-    await warm.initialSnapshot();
+    const cannedSnapshot = await warm.initialSnapshot();
     warm.close();
+    await runtime.close();
+    runtimes.splice(runtimes.indexOf(runtime), 1);
     const originalParse = JSON.parse;
     const originalStringify = JSON.stringify;
+    const eventWire = originalStringify({ v: 1, event: 'scene.snapshot', seq: 1, data: cannedSnapshot });
+    const receivedProbeWires: string[] = [];
+    const scriptedServer = new WebSocketServer({
+      host: '127.0.0.1', port: 0, perMessageDeflate: false,
+      handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
+    });
+    scriptedServers.push(scriptedServer);
+    await new Promise<void>((resolveListening, reject) => {
+      scriptedServer.once('listening', resolveListening);
+      scriptedServer.once('error', reject);
+    });
+    const scriptedAddress = scriptedServer.address();
+    if (scriptedAddress === null || typeof scriptedAddress === 'string') throw new Error('Scripted server has no address.');
+    const scriptedUrl = `ws://127.0.0.1:${String(scriptedAddress.port)}`;
+    scriptedServer.on('connection', (socket) => socket.on('message', (data) => {
+      const wire = data.toString();
+      const request = originalParse(wire) as unknown;
+      const envelope = typeof request === 'object' && request !== null ? request : {};
+      const id = Reflect.get(envelope, 'id');
+      if (id === 'invalid-schema') {
+        socket.send(originalStringify({
+          v: 1, id, ok: false, error: { code: 'INVALID_REQUEST', message: 'The request parameters are invalid.' },
+        }));
+        return;
+      }
+      if (id === 'malformed-event') {
+        socket.send('{"v":1,"event":"scene.snapshot","seq":2,"data":{}}');
+        return;
+      }
+      if (id === 'probe-open') receivedProbeWires.push(wire);
+      socket.send(originalStringify({
+        v: 1, id, ok: true,
+        result: { sessionId: `session:${String(id)}`, capabilities: ['scene.snapshot', 'token.move', 'door.set'] },
+      }));
+      socket.send(eventWire);
+    }));
     let measuring = false;
+    let injectMutantSerialization = false;
+    let injectingMutantSerialization = false;
     let parseCount = 0;
     let stringifyCount = 0;
-    const isMeasuredJsonCall = (stack: string | undefined, zodClientError: boolean): boolean => {
+    const isMeasuredJsonCall = (stack: string | undefined): boolean => {
       const frames = stack?.split('\n') ?? [];
-      const directCaller = frames[3] ?? '';
-      if (/src\/vtt\/handoff\/websocket-transport\.ts|tools\/vtt-handoff\/node-runtime\.ts/u.test(directCaller)) return true;
-      return zodClientError
-        && /node_modules\/zod\/v4\/core\/errors\.js/u.test(directCaller)
-        && frames.some((frame) => /src\/vtt\/handoff\/websocket-transport\.ts/u.test(frame));
+      return frames.some((frame) => /src\/vtt\/handoff\//u.test(frame));
     };
     const parse = vi.spyOn(JSON, 'parse').mockImplementation((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
-      if (measuring && isMeasuredJsonCall(new Error().stack, false)) parseCount += 1;
+      if (measuring && isMeasuredJsonCall(new Error().stack)) parseCount += 1;
       return originalParse(text, reviver);
     });
     const stringify = vi.spyOn(JSON, 'stringify').mockImplementation((
@@ -65,12 +107,20 @@
       replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (number | string)[] | null,
       space?: number | string,
     ) => {
-      if (measuring && isMeasuredJsonCall(new Error().stack, true)) stringifyCount += 1;
+      const measured = measuring && isMeasuredJsonCall(new Error().stack);
+      if (measured) {
+        stringifyCount += 1;
+      }
+      if (measured && injectMutantSerialization && !injectingMutantSerialization) {
+        injectingMutantSerialization = true;
+        JSON.stringify({ mutant: 'extra-adapter-serialization' });
+        injectingMutantSerialization = false;
+      }
       return typeof replacer === 'function'
         ? originalStringify(value, replacer, space)
         : originalStringify(value, replacer, space);
     });
-    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    const transport = new WebSocketSceneTransport(scriptedUrl, token);
     const statuses: string[] = [];
     transport.subscribeStatus((status) => statuses.push(status));
     const events: number[] = [];
@@ -81,22 +131,51 @@
     await expect(transport.initialSnapshot()).resolves.toMatchObject({ revision: 0 });
     expect(statuses).toEqual(['connecting', 'open']);
     expect(events[0]).toBe(1);
-    const first = await transport.request({
-      v: 1, id: 'budget-id', method: 'scene.snapshot', params: {},
+    const invalid = new WebSocketSceneTransport(scriptedUrl, token);
+    const rejected = await invalid.request({
+      v: 1, id: 'invalid-schema', method: 'scene.snapshot', params: { unexpected: true },
     });
-    expect(first).toMatchObject({ id: 'budget-id', ok: true });
-    const rejected = await transport.request({
-      v: 1, id: 'budget-id', method: 'scene.snapshot', params: {},
+    invalid.close();
+    const malformed = new WebSocketSceneTransport(scriptedUrl, token);
+    const malformedFault = malformed.request({
+      v: 1, id: 'malformed-event', method: 'session.open', params: { requestedRole: 'dm' },
     });
+    await expect(malformedFault).rejects.toBeInstanceOf(SceneTransportFaultError);
     measuring = false;
-    expect(rejected).toMatchObject({ id: 'budget-id', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
-    const totalWireEnvelopes = 7;
-    const assertBudget = (extraSerializations: number): void => {
-      expect(stringifyCount + extraSerializations).toBe(totalWireEnvelopes);
-      expect(parseCount).toBe(totalWireEnvelopes);
+    expect(rejected).toMatchObject({ id: 'invalid-schema', ok: false, error: { code: 'INVALID_REQUEST' } });
+    const assertBudget = (expectedStringify: number, expectedParse: number): void => {
+      expect({ stringifyCount, parseCount }).toEqual({ stringifyCount: expectedStringify, parseCount: expectedParse });
     };
-    assertBudget(0);
-    expect(() => assertBudget(1)).toThrow();
+    assertBudget(3, 4);
+
+    parseCount = 0;
+    stringifyCount = 0;
+    injectMutantSerialization = true;
+    measuring = true;
+    const mutant = new WebSocketSceneTransport(scriptedUrl, token);
+    await mutant.request({ v: 1, id: 'probe-open', method: 'session.open', params: { requestedRole: 'dm' } });
+    await mutant.initialSnapshot();
+    mutant.close();
+    measuring = false;
+    expect(() => assertBudget(1, 2)).toThrow();
+    const mutantCounts = { stringifyCount, parseCount };
+    expect(mutantCounts).toEqual({ stringifyCount: 2, parseCount: 2 });
+
+    parseCount = 0;
+    stringifyCount = 0;
+    injectMutantSerialization = false;
+    measuring = true;
+    const restored = new WebSocketSceneTransport(scriptedUrl, token);
+    await restored.request({ v: 1, id: 'probe-open', method: 'session.open', params: { requestedRole: 'dm' } });
+    await restored.initialSnapshot();
+    restored.close();
+    measuring = false;
+    assertBudget(1, 2);
+    expect(receivedProbeWires).toHaveLength(2);
+    expect(receivedProbeWires[0]).toBe(receivedProbeWires[1]);
+    console.info(
+      `vtt-json-budget baseline=3/4 mutant=${String(mutantCounts.stringifyCount)}/${String(mutantCounts.parseCount)} restored=1/2`,
+    );
     parse.mockRestore();
     stringify.mockRestore();
 
@@ -150,6 +229,43 @@
     transport.close();
   });
 
+  it('correlates an id by its serialized scalar value', async () => {
+    const token = 'serialized-id-secret';
+    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    const response = await transport.request({
+      v: 1,
+      id: { toJSON: (): string => 'wire-id' },
+      method: 'session.open',
+      params: { requestedRole: 'dm' },
+    });
+    expect(response).toMatchObject({ id: 'wire-id', ok: true });
+    expect(transport.pendingRequestCount()).toBe(0);
+    transport.close();
+  });
+
+  it('preserves an enumerable own __proto__ field so the server refuses the invalid request', async () => {
+    const token = 'own-proto-secret';
+    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    await transport.request({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
+    const request: Record<string, unknown> = {
+      v: 1, id: 'own-proto', method: 'scene.snapshot', params: {},
+    };
+    Object.defineProperty(request, '__proto__', {
+      configurable: true, enumerable: true, value: { polluted: true }, writable: true,
+    });
+    await expect(transport.request(request)).resolves.toMatchObject({
+      id: 'own-proto', ok: false, error: { code: 'INVALID_REQUEST' },
+    });
+    expect(Object.getPrototypeOf(request)).toBe(Object.prototype);
+    transport.close();
+  });
+
   it('rechecks state after caller-controlled serialization and never retries an unknown mutation', async () => {
     const token = 'getter-secret';
     const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
diff --git a/tests/unit/vtt/runtime-parity.test.ts b/tests/unit/vtt/runtime-parity.test.ts
index bd61e93ab2dac55820c3f6e89fc3d5bae5fd7106..3a18537f802fa11a161743fcd839002708cae254
--- a/tests/unit/vtt/runtime-parity.test.ts
+++ b/tests/unit/vtt/runtime-parity.test.ts
@@ -7,13 +7,22 @@
   createVttNodeRuntime, type VttNodeRuntime,
 } from '../../../tools/vtt-handoff/node-runtime';
 import {
-  createInProcessConformanceTransport, runDmTransportConformance, TRANSPORT_CONFORMANCE_SCENARIOS,
+  createCountedConformanceSession, createInProcessConformanceTransport, createVisibilityConformanceSession,
+  createVisibilityInProcessTransport,
+  runDmTransportConformance, TRANSPORT_CONFORMANCE_SCENARIOS,
   executeTransportConformanceScenario, runPlayerMismatchConformance, runPlayerMovementConformance,
-  TWO_ROOM_MOVING_PLAYER,
+  runTerminalOutcomeConformance, runVisibilityRemovalConformance, TWO_ROOM_MOVING_PLAYER,
 } from '../../helpers/vtt-handoff/transport-conformance';
 
 const roots: string[] = [];
 const runtimes: VttNodeRuntime[] = [];
+const TERMINAL_CASES = [
+  { expected: 'committed' as const, forced: undefined },
+  { expected: 'refused' as const, forced: { kind: 'refused' as const, code: 'ENGINE_REFUSED' as const, reason: 'controlled refusal' } },
+  { expected: 'cancelled' as const, forced: { kind: 'cancelled' as const, reason: 'controlled cancellation' } },
+  { expected: 'closed' as const, forced: { kind: 'closed' as const } },
+  { expected: 'failed' as const, forced: { kind: 'failed' as const, phase: 'pre_apply' as const, error: new Error('controlled failure') } },
+] as const;
 
 function tokenFile(token: string, playerToken: string): string {
   mkdirSync(resolve('.tmp'), { recursive: true });
@@ -58,18 +67,27 @@
   it('runs the shared independent conformance assertions through in-process and WebSocket adapters', async () => {
     expect(TRANSPORT_CONFORMANCE_SCENARIOS).toHaveLength(16);
     const inProcess = createInProcessConformanceTransport();
-    const inProcessResultPromise = runDmTransportConformance(inProcess.transport);
+    const inProcessResultPromise = runDmTransportConformance(inProcess.transport, inProcess.reducerExecutions);
     await inProcess.start();
     const inProcessResult = await inProcessResultPromise;
 
     const token = 'runtime-parity-secret';
     const playerToken = 'runtime-parity-player-secret';
+    const nodeCounters: Array<() => number> = [];
     const nodeRuntime = createVttNodeRuntime({
       tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
+      createSession: (principal) => {
+        const counted = createCountedConformanceSession(principal);
+        nodeCounters.push(counted.reducerExecutions);
+        return counted.session;
+      },
     });
     runtimes.push(nodeRuntime);
     const address = await nodeRuntime.listen(0);
-    const websocketResult = await runDmTransportConformance(new WebSocketSceneTransport(address.websocketUrl, token));
+    const websocketResult = await runDmTransportConformance(
+      new WebSocketSceneTransport(address.websocketUrl, token),
+      () => nodeCounters.reduce((total, count) => total + count(), 0),
+    );
     expect(websocketResult.seed).toBe(603_020_001);
     expect(websocketResult.clock).toBe('2026-09-09T12:00:00.000Z');
     expect(websocketResult.canonical.map((response) => ({
@@ -111,7 +129,110 @@
     expect(nodeRuntime.sessionCounts()).toEqual({ created: 2, active: 0 });
   });
 
+  it('maps all five terminal intent outcomes through the in-process adapter', async () => {
+    const inProcessOutcomes: string[] = [];
+    for (const entry of TERMINAL_CASES) {
+      const adapter = createInProcessConformanceTransport(
+        { role: 'player', playerId: TWO_ROOM_MOVING_PLAYER }, entry.forced,
+      );
+      inProcessOutcomes.push(await runTerminalOutcomeConformance(adapter.transport, adapter.start));
+    }
+    const expected = TERMINAL_CASES.map((entry) => entry.expected);
+    await executeTransportConformanceScenario('five terminal intent outcomes', () => {
+      expect(inProcessOutcomes).toEqual(expected);
+      expect(new Set(inProcessOutcomes)).toEqual(new Set(['committed', 'refused', 'cancelled', 'closed', 'failed']));
+      expect(new Set(inProcessOutcomes.slice(1))).not.toEqual(new Set(expected));
+    });
+  });
+
+  it('maps all five terminal intent outcomes through the WebSocket adapter', async () => {
+    const token = 'terminal-dm-secret';
+    const playerToken = 'terminal-player-secret';
+    const pendingCases = [...TERMINAL_CASES];
+    const nodeRuntime = createVttNodeRuntime({
+      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
+      createSession: (principal) => {
+        const entry = pendingCases.shift();
+        if (entry === undefined) throw new Error('Terminal-outcome session queue was exhausted.');
+        return createCountedConformanceSession(principal, entry.forced).session;
+      },
+    });
+    runtimes.push(nodeRuntime);
+    const address = await nodeRuntime.listen(0);
+    const websocketOutcomes: string[] = [];
+    for (const _entry of TERMINAL_CASES) {
+      websocketOutcomes.push(await runTerminalOutcomeConformance(
+        new WebSocketSceneTransport(address.websocketUrl, playerToken), () => Promise.resolve(),
+      ));
+    }
+    const expected = TERMINAL_CASES.map((entry) => entry.expected);
+    await executeTransportConformanceScenario('five terminal intent outcomes', () => {
+      expect(websocketOutcomes).toEqual(expected);
+      expect(new Set(websocketOutcomes)).toEqual(new Set(['committed', 'refused', 'cancelled', 'closed', 'failed']));
+      expect(new Set(websocketOutcomes.slice(1))).not.toEqual(new Set(expected));
+    });
+  });
+
+  it('removes newly hidden entities through in-process and WebSocket snapshots', async () => {
+    const principal = { role: 'player' as const, playerId: TWO_ROOM_MOVING_PLAYER };
+    const inProcessSession = createVisibilityInProcessTransport(principal);
+    await runVisibilityRemovalConformance(
+      inProcessSession.transport,
+      inProcessSession.hideVisibleEntities,
+    );
+
+    const controls: Array<() => void> = [];
+    const token = 'visibility-dm-secret';
+    const playerToken = 'visibility-player-secret';
+    const nodeRuntime = createVttNodeRuntime({
+      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
+      createSession: (authenticatedPrincipal) => {
+        const controlled = createVisibilityConformanceSession(authenticatedPrincipal);
+        controls.push(controlled.hideVisibleEntities);
+        return controlled.session;
+      },
+    });
+    runtimes.push(nodeRuntime);
+    const address = await nodeRuntime.listen(0);
+    const websocket = new WebSocketSceneTransport(address.websocketUrl, playerToken);
+    const websocketExercise = runVisibilityRemovalConformance(websocket, () => {
+      const hide = controls[0];
+      if (hide === undefined) throw new Error('WebSocket visibility control is unavailable.');
+      hide();
+    });
+    await websocketExercise;
+    await executeTransportConformanceScenario('visible-to-hidden entity removal', () => {
+      expect(controls).toHaveLength(1);
+      expect(websocket.pendingRequestCount()).toBe(0);
+    });
+  });
+
   it('reconnects to a fresh session, full snapshot, and correlation ledger', async () => {
+    const firstInProcess = createInProcessConformanceTransport();
+    const firstInProcessOpen = await firstInProcess.transport.request({
+      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    await firstInProcess.transport.initialSnapshot();
+    await expect(firstInProcess.transport.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'reused', ok: true });
+    firstInProcess.transport.dispose();
+    const secondInProcess = createInProcessConformanceTransport();
+    const secondInProcessOpen = await secondInProcess.transport.request({
+      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    await expect(secondInProcess.transport.initialSnapshot()).resolves.toMatchObject({
+      revision: 0,
+      tokens: [
+        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+      ],
+    });
+    await expect(secondInProcess.transport.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'reused', ok: true });
+    expect(firstInProcessOpen.ok && secondInProcessOpen.ok ? firstInProcessOpen.result.sessionId : null)
+      .not.toBe(secondInProcessOpen.ok ? secondInProcessOpen.result.sessionId : null);
+    secondInProcess.transport.dispose();
+
     const token = 'reconnect-dm-secret';
     const nodeRuntime = createVttNodeRuntime({
       tokensFile: tokenFile(token, 'unused-player-secret'), allowedOrigins: new Set(), allowOriginless: true,
diff --git a/tools/vtt-handoff/node-runtime.ts b/tools/vtt-handoff/node-runtime.ts
index 4a67ac398c2dfb0c53d56949615d913d16057686..39cb938b34d24616242aabb3c8c2841dc8e7eebb
--- a/tools/vtt-handoff/node-runtime.ts
+++ b/tools/vtt-handoff/node-runtime.ts
@@ -1,9 +1,7 @@
 import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
-import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
 import { createServer, type IncomingMessage } from 'node:http';
 import type { Duplex } from 'node:stream';
 import { WebSocket, WebSocketServer, type RawData } from 'ws';
-import { z } from 'zod';
 import type { CombatantId } from '../../src/combat/values';
 import type { EncounterState } from '../../src/combat/encounter';
 import type { LegalActionSummary } from '../../src/combat/controllers';
@@ -22,31 +20,11 @@
   type ProtocolSessionPort, type SceneSnapshotEvent,
 } from '../../src/vtt/handoff/protocol-runtime';
 import type { HandoffPrincipal } from '../../src/vtt/handoff/session-authorizer';
+import { readTokenClaims, type TokenClaim, type TokenFileHooks } from './token-claims';
 
 export const VTT_RUNTIME_PATH = '/vtt/v1';
 export const VTT_RUNTIME_MAX_PAYLOAD = 1_048_576;
 export const VTT_RUNTIME_OPEN_DEADLINE_MS = 5_000;
-const MAX_TOKEN_FILE_BYTES = 65_536;
-
-const tokenClaimSchema = z.strictObject({
-  tokenSha256: z.string().regex(/^[0-9a-f]{64}$/u),
-  role: z.enum(['dm', 'player']),
-  playerId: z.string().min(1).optional(),
-}).superRefine((claim, context) => {
-  if (claim.role === 'player' && claim.playerId === undefined) {
-    context.addIssue({ code: 'custom', message: 'A player token requires playerId.' });
-  }
-  if (claim.role === 'dm' && claim.playerId !== undefined) {
-    context.addIssue({ code: 'custom', message: 'A DM token must omit playerId.' });
-  }
-});
-const tokenClaimsSchema = z.array(tokenClaimSchema).min(1).max(1_024);
-
-interface TokenClaim {
-  readonly tokenSha256: string;
-  readonly principal: HandoffPrincipal;
-}
-
 export interface NodeRuntimeSession {
   readonly service: ProtocolSessionPort;
   readonly seats: readonly PlayerSeatRegistration[];
@@ -60,10 +38,7 @@
   readonly allowOriginless?: boolean;
   readonly openDeadlineMs?: number;
   readonly createSession?: (principal: HandoffPrincipal) => NodeRuntimeSession;
-  readonly tokenFileHooks?: {
-    readonly afterOpenInspection?: () => void;
-    readonly afterBoundedRead?: () => void;
-  };
+  readonly tokenFileHooks?: TokenFileHooks;
   readonly wireCodec?: {
     readonly parse: (text: string) => unknown;
     readonly stringify: (value: HandoffResponse | SceneSnapshotEvent) => string;
@@ -81,64 +56,6 @@
   listen(port?: number): Promise<VttNodeRuntimeAddress>;
   close(): Promise<void>;
   sessionCounts(): { readonly created: number; readonly active: number };
-}
-
-function readTokenClaims(path: string, hooks: VttNodeRuntimeOptions['tokenFileHooks']): readonly TokenClaim[] {
-  let descriptor: number;
-  try { descriptor = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW); }
-  catch { throw new Error('VTT_RUNTIME_TOKENS_FILE must be an openable regular nonsymlink file.'); }
-  try {
-    const opened = fstatSync(descriptor);
-    if (!opened.isFile()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
-    if ((opened.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
-    if (opened.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
-    hooks?.afterOpenInspection?.();
-    const named = lstatSync(path);
-    if (!named.isFile() || named.isSymbolicLink() || named.dev !== opened.dev || named.ino !== opened.ino) {
-      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was opened.');
-    }
-
-    const bytes = Buffer.alloc(MAX_TOKEN_FILE_BYTES + 1);
-    let used = 0;
-    while (used < bytes.byteLength) {
-      const count = readSync(descriptor, bytes, used, bytes.byteLength - used, null);
-      if (count === 0) break;
-      used += count;
-    }
-    hooks?.afterBoundedRead?.();
-    const after = fstatSync(descriptor);
-    const namedAfter = lstatSync(path);
-    if (!after.isFile() || after.dev !== opened.dev || after.ino !== opened.ino
-      || !namedAfter.isFile() || namedAfter.isSymbolicLink()
-      || namedAfter.dev !== opened.dev || namedAfter.ino !== opened.ino) {
-      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was read.');
-    }
-    if ((after.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
-    if (used > MAX_TOKEN_FILE_BYTES || after.size > MAX_TOKEN_FILE_BYTES) {
-      throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
-    }
-    let source: unknown;
-    try { source = JSON.parse(bytes.subarray(0, used).toString('utf8')) as unknown; }
-    catch { throw new Error('VTT_RUNTIME_TOKENS_FILE is not valid JSON.'); }
-    const parsed = tokenClaimsSchema.safeParse(source);
-    if (!parsed.success) throw new Error('VTT_RUNTIME_TOKENS_FILE has invalid claims.');
-    const seen = new Set<string>();
-    return parsed.data.map((claim): TokenClaim => {
-      if (seen.has(claim.tokenSha256)) throw new Error('VTT_RUNTIME_TOKENS_FILE contains a duplicate token hash.');
-      seen.add(claim.tokenSha256);
-      return {
-        tokenSha256: claim.tokenSha256,
-        principal: claim.role === 'dm'
-          ? { role: 'dm' }
-          : (() => {
-              if (claim.playerId === undefined) throw new Error('A validated player token is missing playerId.');
-              return { role: 'player' as const, playerId: claim.playerId };
-            })(),
-      };
-    });
-  } finally {
-    closeSync(descriptor);
-  }
 }
 
 function legalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
@@ -290,7 +207,12 @@
 
   wss.on('connection', (websocket: WebSocket, _request: IncomingMessage, principal: HandoffPrincipal) => {
     physicalSockets.add(websocket);
-    const forgetPhysicalSocket = (): void => { physicalSockets.delete(websocket); };
+    const onPhysicalError = (): void => { /* A transport error remains contained until physical closure. */ };
+    const forgetPhysicalSocket = (): void => {
+      websocket.off('error', onPhysicalError);
+      physicalSockets.delete(websocket);
+    };
+    websocket.on('error', onPhysicalError);
     websocket.once('close', forgetPhysicalSocket);
     let session: NodeRuntimeSession;
     try { session = createSession(principal); }
diff --git a/tools/vtt-handoff/token-claims.ts b/tools/vtt-handoff/token-claims.ts
new file mode 100644
index 0000000000000000000000000000000000000000..00f40bb2faad6d84e0193533762a77c0d0c8aacb
--- /dev/null
+++ b/tools/vtt-handoff/token-claims.ts
@@ -0,0 +1,93 @@
+import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
+import { z } from 'zod';
+import type { HandoffPrincipal } from '../../src/vtt/handoff/session-authorizer';
+
+const MAX_TOKEN_FILE_BYTES = 65_536;
+
+const tokenClaimSchema = z.strictObject({
+  tokenSha256: z.string().regex(/^[0-9a-f]{64}$/u),
+  role: z.enum(['dm', 'player']),
+  playerId: z.string().min(1).optional(),
+}).superRefine((claim, context) => {
+  if (claim.role === 'player' && claim.playerId === undefined) {
+    context.addIssue({ code: 'custom', message: 'A player token requires playerId.' });
+  }
+  if (claim.role === 'dm' && claim.playerId !== undefined) {
+    context.addIssue({ code: 'custom', message: 'A DM token must omit playerId.' });
+  }
+});
+const tokenClaimsSchema = z.array(tokenClaimSchema).min(1).max(1_024);
+
+export interface TokenClaim {
+  readonly tokenSha256: string;
+  readonly principal: HandoffPrincipal;
+}
+
+export interface TokenFileHooks {
+  readonly afterOpenInspection?: () => void;
+  readonly afterBoundedRead?: () => void;
+}
+
+export function readTokenClaims(path: string, hooks?: TokenFileHooks): readonly TokenClaim[] {
+  let descriptor: number;
+  try {
+    descriptor = openSync(
+      path,
+      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
+    );
+  } catch {
+    throw new Error('VTT_RUNTIME_TOKENS_FILE must be an openable regular nonsymlink file.');
+  }
+  try {
+    const opened = fstatSync(descriptor);
+    if (!opened.isFile()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
+    if ((opened.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
+    if (opened.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
+    hooks?.afterOpenInspection?.();
+    const named = lstatSync(path);
+    if (!named.isFile() || named.isSymbolicLink() || named.dev !== opened.dev || named.ino !== opened.ino) {
+      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was opened.');
+    }
+
+    const bytes = Buffer.alloc(MAX_TOKEN_FILE_BYTES + 1);
+    let used = 0;
+    while (used < bytes.byteLength) {
+      const count = readSync(descriptor, bytes, used, bytes.byteLength - used, null);
+      if (count === 0) break;
+      used += count;
+    }
+    hooks?.afterBoundedRead?.();
+    const after = fstatSync(descriptor);
+    const namedAfter = lstatSync(path);
+    if (!after.isFile() || after.dev !== opened.dev || after.ino !== opened.ino
+      || !namedAfter.isFile() || namedAfter.isSymbolicLink()
+      || namedAfter.dev !== opened.dev || namedAfter.ino !== opened.ino) {
+      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was read.');
+    }
+    if ((after.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
+    if (used > MAX_TOKEN_FILE_BYTES || after.size > MAX_TOKEN_FILE_BYTES) {
+      throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
+    }
+    let source: unknown;
+    try { source = JSON.parse(bytes.subarray(0, used).toString('utf8')) as unknown; }
+    catch { throw new Error('VTT_RUNTIME_TOKENS_FILE is not valid JSON.'); }
+    const parsed = tokenClaimsSchema.safeParse(source);
+    if (!parsed.success) throw new Error('VTT_RUNTIME_TOKENS_FILE has invalid claims.');
+    const seen = new Set<string>();
+    return parsed.data.map((claim): TokenClaim => {
+      if (seen.has(claim.tokenSha256)) throw new Error('VTT_RUNTIME_TOKENS_FILE contains a duplicate token hash.');
+      seen.add(claim.tokenSha256);
+      return {
+        tokenSha256: claim.tokenSha256,
+        principal: claim.role === 'dm'
+          ? { role: 'dm' }
+          : (() => {
+              if (claim.playerId === undefined) throw new Error('A validated player token is missing playerId.');
+              return { role: 'player' as const, playerId: claim.playerId };
+            })(),
+      };
+    });
+  } finally {
+    closeSync(descriptor);
+  }
+}
