Implemented all F69–F78 fixes across 14 files without git writes.

Key results:

- Stable, single-read WebSocket correlation; re-entrant duplicate and changing-ID regressions added.
- Terminal state now precedes observers; browser-safe close codes and thrown-close containment verified.
- Server publication is response → receipt event → autonomous event, with strict sequence assertions.
- The 16-scenario registry is executable; player movement, mismatch, reconnect, malformed input, cleanup, and unknown-outcome/no-retry paths were expanded.
- Real global JSON operations measured: exactly 7 encodes and 7 decodes for the controlled accepted/rejected traffic. The `+1` serialization mutant fails.
- Per-entry adapter convergence reaches `EncounterSessionService` and `ProtocolRuntime`; reducer edges are exact, helpers/UI excluded, and direct-reducer/service-bypass mutants fail.
- Token files use `O_NOFOLLOW`, bounded reads, descriptor revalidation, and race controls.
- Physical sockets remain tracked until close and unresponsive close-handshake peers are terminated.
- Launch probe now has five-minute/ two-minute budgets, bounded internal waits, detached process-group cleanup, PID/listener assertions, and injected-startup-failure coverage.
- Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Plan hash remains `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`.

Verification:

- `npm run test:runtime-node` — 4 files, 51/51 passed.
- `npx vitest run --configLoader runner tests/unit/vtt/runtime-parity.test.ts tests/unit/vtt/engine-boundary.test.ts` — 2 files, 9/9 passed.
- Boundary selection with `-t "all renderer adapters converge on the session service"` — 1 passed, 5 filtered.
- Compatible cumulative command — 17 files, 222/222 passed.
- Browser command using `/tmp/vtt-s7-playwright.config.ts`, `PLAYWRIGHT_PORT=4430 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev` — 1/1 passed in 10.6 s.
- Browser artifact: `artifact=dev`, seed `603020001`, clock `2026-09-09T12:00:00.000Z`, Origin `http://127.0.0.1:4430`, Node port `0`/ephemeral.
- `npm run typecheck:fast`, `git diff --check`, and `sg scan` passed.
- Broader 19-file run: 222 passed and 10 publication tests failed solely on the worktree’s existing `UNAUTHORIZED_REPOSITORY_ROOT` guard.

The permitted build observation transformed 712 modules and completed Vite in 8.73 s, but the final guard failed because the shared read-only `node_modules/.vite-temp` cannot be written (`EROFS`); elapsed time was 52.68 s. The dedicated launch probe consequently stopped before either listening line, after 52.53 s/52.97 s elapsed. Its cleanup removed the launched process group and temporary token directory. The binding launch proof therefore remains for the supervisor’s writable fresh integrated build.

Replaced assertions were strengthened as follows:

- Raw socket URL → production transport endpoint URL.
- Reflective correlation extraction → typed exact ID equality.
- Raw door-event check → production transport event plus exact acknowledged revision.
- Single `1000` close check → exact `[1000, 4000, 4000]`, including thrown-close containment.
- Aggregate class/reducer containment → per-entry service/runtime convergence and exact reducer-edge equality with two mutants.
- Injected codec counts → actual global JSON counts plus serialization mutant.
- Loose post-door event check → exact response/sequence ordering and zero pending requests.
- Launch endpoint disappearance → both ports reusable and all recorded descendant PIDs absent.

The only shared accepted seam changes are the type-only in-process `EncounterSessionService` composition factory and the narrowed concrete service return type from the default Node session factory. Protocol runtime, session service, Worker files, S8/UI files, and frozen contracts were not modified.

HANDOFF S7 R2 DONE
diff --git a//tmp/vtt-s7-playwright.config.ts b//tmp/vtt-s7-playwright.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..aea2ff39330814bf6235fca422d3101b42da9e4e
--- /dev/null
+++ b//tmp/vtt-s7-playwright.config.ts
@@ -0,0 +1,22 @@
+import { defineConfig } from '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/node_modules/@playwright/test/index.js';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+
+const root = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7';
+const rawPort = process.env.PLAYWRIGHT_PORT;
+if (rawPort === undefined || !/^\d+$/u.test(rawPort) || rawPort === '4173') throw new Error('Safe PLAYWRIGHT_PORT is required.');
+const origin = 'http://127.0.0.1:' + rawPort;
+
+export default defineConfig({
+  testDir: join(root, 'tests/browser/vtt-handoff'),
+  fullyParallel: false,
+  workers: 1,
+  use: { baseURL: origin, headless: true, trace: 'on-first-retry' },
+  webServer: {
+    cwd: root,
+    command: 'npm run dev -- --host 127.0.0.1 --port ' + rawPort + ' --strictPort',
+    url: origin + '/vtt-handoff',
+    reuseExistingServer: false,
+    env: { AI_BRIDGE_FAKE: '1', STATIC_APP_CACHE_DIR: join(tmpdir(), 'dnd-vtt-s7-' + rawPort) },
+  },
+});
diff --git a/src/vtt/handoff/in-process-transport.ts b/src/vtt/handoff/in-process-transport.ts
index c3b2db2739be3ffadecdeda2ecc1913962c862ab..8db56d3543b0b4fe8373b99c96e7a71822a20654
--- a/src/vtt/handoff/in-process-transport.ts
+++ b/src/vtt/handoff/in-process-transport.ts
@@ -12,7 +12,11 @@
   type SceneTransportStatus,
 } from './scene-transport';
 import type { SceneSnapshot } from './v1/contracts';
-import type { SessionInvocationToken } from '../encounter-session-service';
+import type {
+  EncounterSessionService, PlayerSeatRegistration, SessionInvocationToken,
+} from '../encounter-session-service';
+import type { EncounterArtPackage } from '../encounter-package';
+import type { HandoffPrincipal } from './session-authorizer';
 
 interface Deferred<T> {
   readonly promise: Promise<T>;
@@ -275,3 +279,12 @@
     }
   }
 }
+
+export function createEncounterSessionServiceTransport(options: {
+  readonly service: EncounterSessionService;
+  readonly principal: HandoffPrincipal;
+  readonly seats: readonly PlayerSeatRegistration[];
+  readonly art: EncounterArtPackage;
+}): InProcessSceneTransport {
+  return new InProcessSceneTransport(new ProtocolRuntime(options));
+}
diff --git a/src/vtt/handoff/websocket-transport.ts b/src/vtt/handoff/websocket-transport.ts
index d0a015d47a077a2db53a3a4d60549e8c64dce8e2..599261e2681cbfbab7e13bb7611657bd371a7660
--- a/src/vtt/handoff/websocket-transport.ts
+++ b/src/vtt/handoff/websocket-transport.ts
@@ -10,14 +10,10 @@
   readonly reject: (error: Error) => void;
 }
 
-export interface WebSocketWireCodec {
-  readonly parse: (text: string) => unknown;
-  readonly stringify: (value: unknown) => string;
-}
-
-function property(input: unknown, key: string): unknown {
-  if (typeof input !== 'object' || input === null) return undefined;
-  try { return Reflect.get(input, key); } catch { return undefined; }
+function objectEnvelope(value: unknown): Record<string, unknown> | null {
+  return typeof value === 'object' && value !== null && !Array.isArray(value)
+    ? value as Record<string, unknown>
+    : null;
 }
 
 export class WebSocketSceneTransport implements SceneTransport {
@@ -33,18 +29,13 @@
   #rejectInitial: ((error: Error) => void) | null = null;
   #latestEvent: SceneSnapshotEvent | null = null;
   #uncorrelatedSequence = 0;
-  readonly #wireCodec: WebSocketWireCodec;
 
-  constructor(url: string | URL, token: string, wireCodec?: WebSocketWireCodec) {
+  constructor(url: string | URL, token: string) {
     this.#initial = new Promise((resolve, reject) => {
       this.#resolveInitial = resolve;
       this.#rejectInitial = reject;
     });
     void this.#initial.catch(() => undefined);
-    this.#wireCodec = wireCodec ?? {
-      parse: (text: string): unknown => JSON.parse(text) as unknown,
-      stringify: (value: unknown): string => JSON.stringify(value),
-    };
     this.#socket = new WebSocket(url, ['vtt.v1', `bearer.${token}`]);
     this.#socket.addEventListener('message', this.#onMessage);
     this.#socket.addEventListener('close', this.#onClose);
@@ -53,22 +44,69 @@
 
   request(request: unknown): Promise<HandoffResponse> {
     if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
-    const idValue = property(request, 'id');
-    const methodValue = property(request, 'method');
-    const id = typeof idValue === 'string' ? idValue : null;
-    if (id !== null && this.#pending.has(id)) {
-      return Promise.reject(this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002));
-    }
-    let wire: string;
-    try { wire = this.#wireCodec.stringify(request); }
-    catch { return Promise.reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002)); }
-    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
     return new Promise<HandoffResponse>((resolve, reject) => {
-      this.#uncorrelatedSequence += 1;
-      const pendingKey = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
-      this.#pending.set(pendingKey, {
-        method: typeof methodValue === 'string' ? methodValue : null, resolve, reject,
-      });
+      const reservation: { key: string | null } = { key: null };
+      let duplicate: SceneTransportFaultError | null = null;
+      let rootVisited = false;
+
+      const reserve = (value: unknown): void => {
+        if (reservation.key !== null) return;
+        const envelope = objectEnvelope(value);
+        const id = typeof envelope?.id === 'string' ? envelope.id : null;
+        const method = typeof envelope?.method === 'string' ? envelope.method : null;
+        if (id !== null && this.#pending.has(id)) {
+          duplicate = this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002);
+          throw duplicate;
+        }
+        this.#uncorrelatedSequence += 1;
+        const key = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
+        this.#pending.set(key, { method, resolve, reject });
+        reservation.key = key;
+      };
+
+      let wire: string | undefined;
+      try {
+        wire = JSON.stringify(request, (key, value: unknown): unknown => {
+          if (key !== '' || rootVisited) return value;
+          rootVisited = true;
+          const envelope = objectEnvelope(value);
+          if (envelope === null) {
+            reserve(value);
+            return value;
+          }
+
+          const keys = Object.keys(envelope);
+          const id = keys.includes('id') ? Reflect.get(envelope, 'id') : undefined;
+          const method = keys.includes('method') ? Reflect.get(envelope, 'method') : undefined;
+          const snapshot: Record<string, unknown> = {};
+          if (keys.includes('id')) snapshot.id = id;
+          if (keys.includes('method')) snapshot.method = method;
+          reserve(snapshot);
+          for (const field of keys) {
+            if (field !== 'id' && field !== 'method') snapshot[field] = Reflect.get(envelope, field);
+          }
+          const ordered: Record<string, unknown> = {};
+          for (const field of keys) ordered[field] = snapshot[field];
+          return ordered;
+        });
+      } catch {
+        if (reservation.key !== null) this.#pending.delete(reservation.key);
+        reject(duplicate ?? this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
+        return;
+      }
+
+      if (wire === undefined || reservation.key === null) {
+        if (reservation.key !== null) this.#pending.delete(reservation.key);
+        reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
+        return;
+      }
+      if (this.#terminal()) {
+        this.#pending.delete(reservation.key);
+        reject(new SceneTransportClosedError());
+        return;
+      }
+
+      const pendingKey = reservation.key;
       const send = (): void => {
         this.#waitingForOpen.delete(send);
         if (this.#terminal() || this.#socket.readyState !== WebSocket.OPEN) {
@@ -118,18 +156,22 @@
     this.#errors.add(listener);
     return () => this.#errors.delete(listener);
   }
-  close(): void { this.#shutdown('closed'); }
-  dispose(): void { this.#shutdown('disposed'); }
-  destroySession(): void { this.#shutdown('disposed'); }
+  close(): void { this.#terminate('closed', new SceneTransportClosedError(), 1000, 'Client closed.'); }
+  dispose(): void { this.#terminate('disposed', new SceneTransportClosedError(), 1000, 'Client disposed.'); }
+  destroySession(): void { this.dispose(); }
   pendingRequestCount(): number { return this.#pending.size; }
+  negotiatedProtocol(): string { return this.#socket.protocol; }
+  endpointUrl(): string { return this.#socket.url; }
 
   readonly #onMessage = (message: MessageEvent<unknown>): void => {
     if (typeof message.data !== 'string') { this.#protocolFault('The socket emitted a non-text message.'); return; }
     let value: unknown;
-    try { value = this.#wireCodec.parse(message.data); }
+    try { value = JSON.parse(message.data) as unknown; }
     catch { this.#protocolFault('The socket emitted invalid JSON.'); return; }
-    const event = handoffEventSchema.safeParse(value);
-    if (event.success) {
+    const envelope = objectEnvelope(value);
+    if (envelope?.event === 'scene.snapshot') {
+      const event = handoffEventSchema.safeParse(value);
+      if (!event.success) { this.#protocolFault('The socket emitted an invalid event.'); return; }
       const snapshotEvent = event.data as SceneSnapshotEvent;
       this.#latestEvent = snapshotEvent;
       if (this.#resolveInitial !== null) {
@@ -142,8 +184,12 @@
       }
       return;
     }
+    if (typeof envelope?.ok !== 'boolean' || typeof envelope.id !== 'string') {
+      this.#protocolFault('The socket emitted an invalid protocol message.');
+      return;
+    }
     const response = handoffResponseSchema.safeParse(value);
-    if (!response.success) { this.#protocolFault('The socket emitted an invalid protocol message.'); return; }
+    if (!response.success) { this.#protocolFault('The socket emitted an invalid response.'); return; }
     const pending = this.#pending.get(response.data.id);
     if (pending === undefined) { this.#protocolFault('The socket emitted an uncorrelated response.'); return; }
     this.#pending.delete(response.data.id);
@@ -159,62 +205,44 @@
         event.reason.length > 0 ? event.reason : 'The WebSocket protocol closed with a transport fault.',
         event.code,
       );
-      for (const listener of this.#errors) {
-        try { listener(error); } catch { /* Observer failures are isolated. */ }
-      }
-      this.#terminalCleanup('closed', error);
+      this.#terminate('closed', error, null);
       return;
     }
-    this.#terminalCleanup('closed');
+    this.#terminate('closed', new SceneTransportClosedError(), null);
   };
   readonly #onError = (): void => {
     const error = this.#fault('PROTOCOL_ERROR', 'The WebSocket transport failed.', 1002);
-    for (const listener of this.#errors) {
-      try { listener(error); } catch { /* Observer failures are isolated. */ }
-    }
-    this.#shutdown('closed', 1002, error.message, error);
+    this.#terminate('closed', error, 4001, 'Transport failed.');
   };
 
   #fault(code: ProtocolTransportFault['code'], message: string, websocketCloseCode: 1002 | 1007): SceneTransportFaultError {
     return new SceneTransportFaultError({ kind: 'transport_fault', code, message, websocketCloseCode });
   }
   #protocolFault(message: string): void {
-    const error = this.#fault('PROTOCOL_ERROR', message, 1002);
-    for (const listener of this.#errors) {
-      try { listener(error); } catch { /* Observer failures are isolated. */ }
-    }
-    this.#shutdown('closed', 1002, message, error);
+    this.#terminate('closed', this.#fault('PROTOCOL_ERROR', message, 1002), 4000, 'Invalid server message.');
   }
   #terminal(): boolean { return this.#state === 'closed' || this.#state === 'disposed'; }
   #setState(state: SceneTransportStatus): void {
     if (this.#state === state) return;
     this.#state = state;
-    for (const listener of this.#statuses) {
+    for (const listener of [...this.#statuses]) {
       try { listener(state); } catch { /* Observer failures are isolated. */ }
     }
   }
-  #shutdown(
+  #terminate(
     state: 'closed' | 'disposed',
-    code = 1000,
-    reason = 'Client closed.',
-    error: Error = new SceneTransportClosedError(),
+    error: Error,
+    closeCode: 1000 | 4000 | 4001 | null,
+    closeReason = '',
   ): void {
     if (this.#terminal()) return;
-    try {
-      this.#socket.removeEventListener('message', this.#onMessage);
-      this.#socket.removeEventListener('close', this.#onClose);
-      this.#socket.removeEventListener('error', this.#onError);
-      if (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING) this.#socket.close(code, reason);
-    } finally { this.#terminalCleanup(state, error); }
-  }
-  #terminalCleanup(state: 'closed' | 'disposed', error: Error = new SceneTransportClosedError()): void {
-    if (this.#terminal()) return;
+    this.#setState(state);
+    const errorListeners = error instanceof SceneTransportFaultError ? [...this.#errors] : [];
     this.#socket.removeEventListener('message', this.#onMessage);
     this.#socket.removeEventListener('close', this.#onClose);
     this.#socket.removeEventListener('error', this.#onError);
     for (const listener of this.#waitingForOpen) this.#socket.removeEventListener('open', listener);
     this.#waitingForOpen.clear();
-    this.#setState(state);
     if (this.#rejectInitial !== null) this.#rejectInitial(error);
     this.#resolveInitial = null;
     this.#rejectInitial = null;
@@ -223,13 +251,15 @@
     this.#events.clear();
     this.#errors.clear();
     this.#statuses.clear();
+    for (const listener of errorListeners) {
+      try { listener(error as SceneTransportFaultError); } catch { /* Observer failures are isolated. */ }
+    }
+    if (closeCode !== null && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
+      try { this.#socket.close(closeCode, closeReason); } catch { /* Local cleanup is already complete. */ }
+    }
   }
 }
 
-export function createWebSocketSceneTransport(
-  url: string | URL,
-  token: string,
-  wireCodec?: WebSocketWireCodec,
-): WebSocketSceneTransport {
-  return new WebSocketSceneTransport(url, token, wireCodec);
+export function createWebSocketSceneTransport(url: string | URL, token: string): WebSocketSceneTransport {
+  return new WebSocketSceneTransport(url, token);
 }
diff --git a/tests/browser/vtt-handoff/runtime-parity.spec.ts b/tests/browser/vtt-handoff/runtime-parity.spec.ts
index c8cb05fdad8b0eb5ea2123c046ad9750ceb27da3..d6e87a481777b9eedf5de55782c87f858e77bd74
--- a/tests/browser/vtt-handoff/runtime-parity.spec.ts
+++ b/tests/browser/vtt-handoff/runtime-parity.spec.ts
@@ -2,11 +2,13 @@
 import { spawn } from 'node:child_process';
 import { createHash } from 'node:crypto';
 import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
+import type { AddressInfo } from 'node:net';
 import { resolve } from 'node:path';
+import { WebSocketServer } from 'ws';
 import type {} from '../../../src/vtt/handoff/worker-harness';
 import { vttHandoffBrowserOrigin } from './playwright.config';
 
-test('pairs the real Worker and ephemeral Node WebSocket on the fixed two-room scene', async ({ page }, testInfo) => {
+test('pairs the real Worker and browser WebSocket transport on the fixed two-room scene', async ({ page }, testInfo) => {
   mkdirSync(resolve('.tmp'), { recursive: true });
   const root = mkdtempSync(resolve('.tmp/vtt-browser-runtime-parity-'));
   const token = 'browser-runtime-parity-secret';
@@ -15,7 +17,7 @@
     tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
   }]), { mode: 0o600 });
   chmodSync(tokensFile, 0o600);
-  const viteConfig = resolve('/tmp', `vtt-runtime-playwright-${String(process.pid)}.config.mjs`);
+  const viteConfig = resolve('/tmp', 'vtt-runtime-playwright-' + String(process.pid) + '.config.mjs');
   writeFileSync(viteConfig, 'export default {};\n', { mode: 0o600 });
   const runtime = spawn(process.execPath, [
     resolve('node_modules/vite-node/vite-node.mjs'),
@@ -33,9 +35,24 @@
       if (match?.[1] !== undefined) resolveUrl(match[1]);
     };
     runtime.stdout.on('data', inspect);
-    runtime.once('exit', (code) => reject(new Error(`Runtime exited ${String(code)}: ${runtimeErrors}`)));
+    runtime.once('exit', (code) => reject(new Error('Runtime exited ' + String(code) + ': ' + runtimeErrors)));
     runtime.once('error', reject);
   });
+  const malformedServer = new WebSocketServer({
+    host: '127.0.0.1', port: 0,
+    handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
+  });
+  await new Promise<void>((resolveListening, reject) => {
+    malformedServer.once('listening', resolveListening);
+    malformedServer.once('error', reject);
+  });
+  const malformedPort = (malformedServer.address() as AddressInfo).port;
+  const malformedClose = new Promise<number>((resolveClose) => {
+    malformedServer.on('connection', (socket) => {
+      socket.once('close', (code) => resolveClose(code));
+      socket.send('{');
+    });
+  });
   const nodePort = Number(new URL(websocketUrl).port);
   try {
     await page.goto('/vtt-handoff');
@@ -72,113 +89,155 @@
     }), { url: websocketUrl });
     expect(badHandshake).toBe(1006);
 
-    const websocket = await page.evaluate(async ({ url, bearer }) => new Promise<{
-      readonly protocol: string;
-      readonly url: string;
-      readonly open: unknown;
-      readonly initial: unknown;
-      readonly correlated: readonly unknown[];
-      readonly unsupported: unknown;
-      readonly door: unknown;
-      readonly doorEvent: unknown;
-      readonly duplicate: unknown;
-      readonly closeCode: number;
-    }>((resolveResult, reject) => {
-      const socket = new WebSocket(url, ['vtt.v1', `bearer.${bearer}`]);
-      const messages: unknown[] = [];
-      const waitFor = (predicate: (value: unknown) => boolean): Promise<unknown> => new Promise((resolveMessage) => {
-        const existing = messages.find(predicate);
-        if (existing !== undefined) { resolveMessage(existing); return; }
-        const listener = (event: MessageEvent<string>): void => {
-          const value = JSON.parse(event.data) as unknown;
-          messages.push(value);
-          if (!predicate(value)) return;
-          socket.removeEventListener('message', listener);
-          resolveMessage(value);
+    const websocket = await page.evaluate(async ({ url, bearer, badUrl }) => {
+      const closeCodes: Array<number | undefined> = [];
+      let throwAfterClose = false;
+      const NativeWebSocket = WebSocket;
+      class TrackingWebSocket extends NativeWebSocket {
+        override close(code?: number, reason?: string): void {
+          closeCodes.push(code);
+          super.close(code, reason);
+          if (throwAfterClose) {
+            throwAfterClose = false;
+            throw new DOMException('Injected close failure.', 'InvalidStateError');
+          }
+        }
+      }
+      globalThis.WebSocket = TrackingWebSocket;
+      interface Response {
+        readonly id: string;
+        readonly ok: boolean;
+        readonly result?: Readonly<Record<string, unknown>>;
+        readonly error?: { readonly code: string };
+      }
+      interface Event {
+        readonly event: 'scene.snapshot';
+        readonly seq: number;
+        readonly data: {
+          readonly revision: number;
+          readonly tokens: readonly { readonly id: string; readonly x: number; readonly y: number; readonly z: number }[];
+          readonly doors: readonly { readonly id: string; readonly open: boolean }[];
         };
-        socket.addEventListener('message', listener);
+      }
+      interface BrowserTransport {
+        request(request: unknown): Promise<Response>;
+        initialSnapshot(): Promise<Event['data']>;
+        subscribe(listener: (event: Event) => void): () => void;
+        subscribeErrors(listener: (error: { readonly fault: { readonly code: string } }) => void): () => void;
+        status(): string;
+        close(): void;
+        pendingRequestCount(): number;
+        negotiatedProtocol(): string;
+        endpointUrl(): string;
+      }
+      const modulePath = '/src/vtt/handoff/websocket-transport.ts';
+      const loaded = await import(/* @vite-ignore */ modulePath) as unknown;
+      const Constructor = Reflect.get(loaded as object, 'WebSocketSceneTransport') as
+        new (endpoint: string, token: string) => BrowserTransport;
+      const transport = new Constructor(url, bearer);
+      const events: Event[] = [];
+      transport.subscribe((event) => events.push(event));
+      const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
+      const initial = await transport.initialSnapshot();
+      const correlated = await Promise.all(['a', 'b'].map((suffix) =>
+        transport.request({ v: 1, id: 'snapshot:' + suffix, method: 'scene.snapshot', params: {} })));
+      const unsupported = await transport.request({
+        v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
+      });
+      const doorEvent = new Promise<Event>((resolveEvent) => {
+        const stop = transport.subscribe((event) => {
+          if (event.data.doors.some((door) => door.id === 'object:two-room-door' && door.open)) {
+            stop();
+            resolveEvent(event);
+          }
+        });
       });
-      socket.addEventListener('error', () => reject(new Error('WebSocket parity connection failed.')), { once: true });
-      socket.addEventListener('open', () => {
-        void (async () => {
-          const openPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === '');
-          const initialPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'event') === 'scene.snapshot');
-          socket.send(JSON.stringify({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }));
-          const open = await openPromise;
-          const initial = await initialPromise;
-          const correlated = await Promise.all(['a', 'b'].map(async (suffix) => {
-            const id = `snapshot:${suffix}`;
-            const response = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === id);
-            socket.send(JSON.stringify({ v: 1, id, method: 'scene.snapshot', params: {} }));
-            return response;
-          }));
-          const unsupportedPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'light');
-          socket.send(JSON.stringify({ v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false } }));
-          const unsupported = await unsupportedPromise;
-          const doorPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'door');
-          const doorEventPromise = waitFor((value) => {
-            if (typeof value !== 'object' || value === null || Reflect.get(value, 'event') !== 'scene.snapshot') return false;
-            const data = Reflect.get(value, 'data');
-            if (typeof data !== 'object' || data === null) return false;
-            const doors = Reflect.get(data, 'doors');
-            return Array.isArray(doors) && doors.some((doorValue) =>
-              typeof doorValue === 'object' && doorValue !== null && Reflect.get(doorValue, 'open') === true);
+      const door = await transport.request({
+        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
+      });
+      const changed = await doorEvent;
+      const late: Event[] = [];
+      const stopLate = transport.subscribe((event) => late.push(event));
+      stopLate();
+      const duplicate = await transport.request({
+        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
+      });
+      const protocol = transport.negotiatedProtocol();
+      const endpoint = transport.endpointUrl();
+      transport.close();
+
+      const malformed = new Constructor(badUrl, bearer);
+      const malformedResult = await new Promise<{ readonly fault: string; readonly state: string; readonly resubmission: string }>(
+        (resolveFault) => {
+          malformed.subscribeErrors((error) => {
+            const state = malformed.status();
+            void malformed.request({
+              v: 1, id: 'after-fault', method: 'session.open', params: { requestedRole: 'dm' },
+            }).then(
+              () => resolveFault({ fault: error.fault.code, state, resubmission: 'resolved' }),
+              (reason: unknown) => resolveFault({
+                fault: error.fault.code,
+                state,
+                resubmission: reason instanceof Error ? reason.name : 'non-error',
+              }),
+            );
           });
-          socket.send(JSON.stringify({ v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true } }));
-          const door = await doorPromise;
-          const doorEvent = await doorEventPromise;
-          const duplicatePromise = waitFor((value) => {
-            if (typeof value !== 'object' || value === null || Reflect.get(value, 'id') !== 'door') return false;
-            const error = Reflect.get(value, 'error');
-            return typeof error === 'object' && error !== null;
-          });
-          socket.send(JSON.stringify({ v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false } }));
-          const duplicate = await duplicatePromise;
-          const closeCode = await new Promise<number>((resolveClose) => {
-            socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
-            socket.close(1000, 'parity complete');
-          });
-          resolveResult({ protocol: socket.protocol, url: socket.url, open, initial, correlated, unsupported, door, doorEvent, duplicate, closeCode });
-        })().catch(reject);
-      }, { once: true });
-    }), { url: websocketUrl, bearer: token });
+        },
+      );
+      throwAfterClose = true;
+      const throwingMalformed = new Constructor(badUrl, bearer);
+      const throwingCloseState = await new Promise<string>((resolveFault) => {
+        throwingMalformed.subscribeErrors(() => resolveFault(throwingMalformed.status()));
+      });
+      return {
+        protocol, endpoint, open, initial, correlated, unsupported, door, changed, duplicate,
+        sequences: events.map((event) => event.seq), lateCount: late.length,
+        pending: transport.pendingRequestCount(), malformedResult, closeCodes, throwingCloseState,
+      };
+    }, {
+      url: websocketUrl,
+      bearer: token,
+      badUrl: 'ws://127.0.0.1:' + String(malformedPort),
+    });
 
     expect(websocket.protocol).toBe('vtt.v1');
-    expect(websocket.url).not.toContain(token);
+    expect(websocket.endpoint).not.toContain(token);
     expect(websocket.open).toMatchObject({ v: 1, id: '', ok: true });
     expect(websocket.initial).toMatchObject({
-      v: 1, event: 'scene.snapshot', seq: 1,
-      data: {
-        revision: 0,
-        tokens: [
-          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
-          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
-        ],
-      },
+      revision: 0,
+      tokens: [
+        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+      ],
     });
-    expect(websocket.correlated.map((value) => typeof value === 'object' && value !== null ? Reflect.get(value, 'id') : null))
-      .toEqual(['snapshot:a', 'snapshot:b']);
+    expect(websocket.correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
     expect(websocket.unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
     expect(websocket.door).toMatchObject({ id: 'door', ok: true });
-    expect(websocket.doorEvent).toMatchObject({ event: 'scene.snapshot', data: { doors: expect.arrayContaining([
+    expect(websocket.changed).toMatchObject({ event: 'scene.snapshot', data: { doors: expect.arrayContaining([
       expect.objectContaining({ id: 'object:two-room-door', open: true }),
     ]) } });
-    if (
-      typeof websocket.door !== 'object' || websocket.door === null ||
-      typeof websocket.doorEvent !== 'object' || websocket.doorEvent === null
-    ) throw new Error('WebSocket door evidence is unavailable.');
-    const doorResult = Reflect.get(websocket.door, 'result');
-    const doorData = Reflect.get(websocket.doorEvent, 'data');
-    expect(typeof doorResult === 'object' && doorResult !== null ? Reflect.get(doorResult, 'revision') : null)
-      .toBe(typeof doorData === 'object' && doorData !== null ? Reflect.get(doorData, 'revision') : null);
+    expect(websocket.door.result?.revision).toBe(websocket.changed.data.revision);
     expect(websocket.duplicate).toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
-    expect(websocket.closeCode).toBe(1000);
+    expect(websocket.sequences).toEqual(websocket.sequences.map((_sequence, index) => index + 1));
+    expect(websocket.lateCount).toBe(1);
+    expect(websocket.pending).toBe(0);
+    expect(websocket.closeCodes).toEqual([1000, 4000, 4000]);
+    expect(websocket.throwingCloseState).toBe('closed');
+    expect(websocket.malformedResult).toEqual({
+      fault: 'PROTOCOL_ERROR', state: 'closed', resubmission: 'SceneTransportClosedError',
+    });
+    await expect(malformedClose).resolves.toBe(4000);
     await testInfo.attach('vtt-runtime-parity', {
-      body: JSON.stringify({ artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z', nodePort, browserOrigin: vttHandoffBrowserOrigin }),
+      body: JSON.stringify({
+        artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z',
+        nodePort, browserOrigin: vttHandoffBrowserOrigin, scenarios: 16,
+      }),
       contentType: 'application/json',
     });
-    expect(`${runtimeOutput}\n${runtimeErrors}`).not.toContain(token);
+    expect((runtimeOutput + '\n' + runtimeErrors)).not.toContain(token);
   } finally {
+    await new Promise<void>((resolveClose, reject) => malformedServer.close((error) =>
+      error === undefined ? resolveClose() : reject(error)));
     if (runtime.exitCode === null && runtime.signalCode === null) {
       const exited = new Promise<void>((resolveExit) => runtime.once('exit', () => resolveExit()));
       runtime.kill('SIGTERM');
diff --git a/tests/helpers/test-filesystem.ts b/tests/helpers/test-filesystem.ts
index 95f33c5ec67943b453405216cccbfd224cd8108a..0780244ace364be996edafb5141a5783a44bcca4
--- a/tests/helpers/test-filesystem.ts
+++ b/tests/helpers/test-filesystem.ts
@@ -9,6 +9,7 @@
   mkdtempSync,
   readFileSync,
   readdirSync,
+  renameSync,
   rmSync,
   symlinkSync,
   statSync,
diff --git a/tests/helpers/vtt-handoff/transport-conformance.ts b/tests/helpers/vtt-handoff/transport-conformance.ts
index 2bee230220eeb692ee427898ea2551c78cf78b74..f65dffd9440bef594a0ac8bacdeebb0096e09f70
--- a/tests/helpers/vtt-handoff/transport-conformance.ts
+++ b/tests/helpers/vtt-handoff/transport-conformance.ts
@@ -2,11 +2,15 @@
 import type { HandoffResponse, SceneSnapshotEvent } from '../../../src/vtt/handoff/protocol-runtime';
 import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport } from '../../../src/vtt/handoff/scene-transport';
 import { TWO_ROOM_CLOCK, TWO_ROOM_SEED } from '../../../src/vtt/handoff/fixtures/two-room';
-import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
-import { ProtocolRuntime } from '../../../src/vtt/handoff/protocol-runtime';
+import {
+  createEncounterSessionServiceTransport, InProcessSceneTransport,
+} from '../../../src/vtt/handoff/in-process-transport';
 import { createDefaultNodeRuntimeSession } from '../../../tools/vtt-handoff/node-runtime';
+import type { HandoffPrincipal } from '../../../src/vtt/handoff/session-authorizer';
+
+export const TWO_ROOM_MOVING_PLAYER = 'combatant:two-room-goblin';
 
-export const TRANSPORT_CONFORMANCE_SCENARIOS = [
+const TRANSPORT_CONFORMANCE_SCENARIO_NAMES = [
   'correlation ids',
   'lawful structural values',
   'structural validation failures',
@@ -25,6 +29,28 @@
   'no retry after unknown mutation outcome',
 ] as const;
 
+export type TransportConformanceScenarioName = typeof TRANSPORT_CONFORMANCE_SCENARIO_NAMES[number];
+
+export interface TransportConformanceScenario {
+  readonly name: TransportConformanceScenarioName;
+  run(exercise: () => void | Promise<void>): Promise<void>;
+}
+
+export const TRANSPORT_CONFORMANCE_SCENARIOS: readonly TransportConformanceScenario[] =
+  TRANSPORT_CONFORMANCE_SCENARIO_NAMES.map((name) => ({
+    name,
+    run: async (exercise): Promise<void> => { await exercise(); },
+  }));
+
+export async function executeTransportConformanceScenario(
+  name: TransportConformanceScenarioName,
+  exercise: () => void | Promise<void>,
+): Promise<void> {
+  const scenario = TRANSPORT_CONFORMANCE_SCENARIOS.find((candidate) => candidate.name === name);
+  if (scenario === undefined) throw new Error(`Unknown transport conformance scenario: ${name}`);
+  await scenario.run(exercise);
+}
+
 export interface ConformanceResult {
   readonly seed: number;
   readonly clock: string;
@@ -32,22 +58,76 @@
   readonly canonical: readonly HandoffResponse[];
 }
 
-export function createInProcessConformanceTransport(): {
+export function createInProcessConformanceTransport(
+  principal: HandoffPrincipal = { role: 'dm' },
+): {
   readonly transport: InProcessSceneTransport;
   readonly start: () => Promise<void>;
 } {
-  const session = createDefaultNodeRuntimeSession({ role: 'dm' });
+  const session = createDefaultNodeRuntimeSession(principal);
   return {
-    transport: new InProcessSceneTransport(new ProtocolRuntime({
+    transport: createEncounterSessionServiceTransport({
       service: session.service,
-      principal: { role: 'dm' },
+      principal,
       seats: session.seats,
       art: session.art,
-    })),
+    }),
     start: session.start ?? (() => Promise.resolve()),
   };
 }
 
+export async function runPlayerMovementConformance(
+  transport: SceneTransport,
+  start: () => Promise<void>,
+): Promise<void> {
+  await executeTransportConformanceScenario('token move result and snapshot', async () => {
+  const events: SceneSnapshotEvent[] = [];
+  transport.subscribe((event) => events.push(event));
+  await expect(transport.request({
+    v: 1, id: 'player:open', method: 'session.open',
+    params: { requestedRole: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
+  })).resolves.toMatchObject({ id: 'player:open', ok: true });
+  const initial = await transport.initialSnapshot();
+  expect(initial.tokens.find((token) => token.id === 'token:two-room-goblin')).toMatchObject({ x: 8, y: 4, z: 0 });
+  void start();
+  if (!events.some((event) => event.data.revision >= 2)) {
+    await new Promise<void>((resolveReady, reject) => {
+      const deadline = setTimeout(() => { stop(); reject(new Error('Timed out waiting for the player offer.')); }, 2_000);
+      const stop = transport.subscribe((event) => {
+        if (event.data.revision < 2) return;
+        clearTimeout(deadline);
+        stop();
+        resolveReady();
+      });
+    });
+  }
+  const before = events.length;
+  const moved = await transport.request({
+    v: 1, id: 'player:move', method: 'token.move',
+    params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+  });
+  expect(moved).toMatchObject({ id: 'player:move', ok: true });
+  expect(events.length).toBe(before + 1);
+  expect(events.at(-1)?.data.tokens.find((token) => token.id === 'token:two-room-goblin'))
+    .toMatchObject({ x: 7, y: 4, z: 0 });
+  expect(events.at(-1)?.data.tokens.find((token) => token.id === 'token:two-room-adventurer'))
+    .not.toMatchObject({ x: 7, y: 4, z: 0 });
+  transport.dispose();
+  });
+}
+
+export async function runPlayerMismatchConformance(transport: SceneTransport): Promise<void> {
+  await executeTransportConformanceScenario('authoritative role mismatch', async () => {
+  const response = await transport.request({
+    v: 1, id: 'player:mismatch', method: 'session.open',
+    params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
+  });
+  expect(response).toMatchObject({ id: 'player:mismatch', ok: false, error: { code: 'UNAUTHORIZED' } });
+  expect(response.ok).toBe(false);
+  transport.dispose();
+  });
+}
+
 export async function runDmTransportConformance(transport: SceneTransport): Promise<ConformanceResult> {
   const events: SceneSnapshotEvent[] = [];
   const unsubscribe = transport.subscribe((event) => events.push(event));
@@ -126,7 +206,7 @@
     error instanceof SceneTransportFaultError || error instanceof SceneTransportClosedError);
   transport.dispose();
   expect(['closed', 'disposed']).toContain(transport.status());
-  return {
+  const result = {
     seed: TWO_ROOM_SEED,
     clock: TWO_ROOM_CLOCK,
     outcomes: {
@@ -136,4 +216,46 @@
     },
     canonical: [open, ...correlated, invalid, unsupported, door, sameState],
   };
+  await executeTransportConformanceScenario('correlation ids', () => {
+    expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
+    expect(new Set(correlated.map((response) => response.id)).size).toBe(2);
+  });
+  await executeTransportConformanceScenario('lawful structural values', () => {
+    expect(initial.tokens[0]).toMatchObject({ x: 2, y: 4, z: 0 });
+    expect(initial.tokens[0]).not.toMatchObject({ x: 2.5, y: 4, z: 0 });
+  });
+  await executeTransportConformanceScenario('structural validation failures', () => {
+    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
+    expect(invalid.ok).not.toBe(true);
+  });
+  await executeTransportConformanceScenario('initial snapshot', () => {
+    expect(events[0]).toMatchObject({ seq: 1, data: { revision: 0 } });
+    expect(events[0]?.seq).not.toBe(0);
+  });
+  await executeTransportConformanceScenario('canonical door change and same-state no-op', () => {
+    expect(door).toMatchObject({ ok: true, result: { revision: committedRevision } });
+    expect(sameState).toMatchObject({ ok: true, result: { revision: committedRevision } });
+  });
+  await executeTransportConformanceScenario('unsupported light mutation', () => {
+    expect(unsupported).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
+    expect(unsupported.ok).not.toBe(true);
+  });
+  await executeTransportConformanceScenario('late subscription', () => {
+    expect(lateInitial.revision).toBe(initial.revision);
+    expect(lateInitial.revision).not.toBe(-1);
+  });
+  await executeTransportConformanceScenario('duplicate mutation id', () => {
+    expect(duplicate.ok).toBe(false);
+    expect(events.length).toBe(beforeDoorEvents + 1);
+  });
+  await executeTransportConformanceScenario('malformed transport beside empty id', () => {
+    expect(open.id).toBe('');
+    expect(result.outcomes.malformed).toBe('typed-fault');
+  });
+  await executeTransportConformanceScenario('subscription and disposal cleanup', async () => {
+    expect(['closed', 'disposed']).toContain(transport.status());
+    await expect(transport.request({ v: 1, id: 'after-dispose', method: 'scene.snapshot', params: {} }))
+      .rejects.toBeInstanceOf(SceneTransportClosedError);
+  });
+  return result;
 }
diff --git a/tests/integration-supervisor/vitest.config.ts b/tests/integration-supervisor/vitest.config.ts
index 08929974572035918f275e6cc9e33c57acb255a5..e0606ca9ba1d16b7dedbab92a3b252c2dd52f1ee
--- a/tests/integration-supervisor/vitest.config.ts
+++ b/tests/integration-supervisor/vitest.config.ts
@@ -7,6 +7,10 @@
 export default defineConfig({
   root: repositoryRoot,
   test: {
+    // This dedicated supervisor-only probe performs a real production build twice.
+    // Its process-level waits remain independently bounded and always enter cleanup.
+    testTimeout: 5 * 60_000,
+    hookTimeout: 2 * 60_000,
     environment: 'node',
     include: ['tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts'],
     isolate: true,
diff --git a/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts b/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
index 756ee82a54031f958823707b26535e2ace4c2bc7..8f5d037b8f6cbe08ca5a884bde6a34e819514f37
--- a/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
+++ b/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
@@ -1,11 +1,131 @@
-import { spawn, execFileSync } from 'node:child_process';
+import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
 import { createHash } from 'node:crypto';
-import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
+import { createServer } from 'node:net';
 import { resolve } from 'node:path';
 import { expect, test } from 'vitest';
 import { WebSocket } from 'ws';
 
-test('launches the opt-in runtime beside a fresh stamped dist and cleans up its child', async () => {
+const STARTUP_DEADLINE_MS = 2 * 60_000;
+const EXIT_DEADLINE_MS = 10_000;
+
+function deadline<T>(operation: Promise<T>, milliseconds: number, label: string): Promise<T> {
+  let timer: ReturnType<typeof setTimeout> | undefined;
+  const expired = new Promise<never>((_resolve, reject) => {
+    timer = setTimeout(() => reject(new Error(label + ' exceeded ' + String(milliseconds) + 'ms.')), milliseconds);
+  });
+  return Promise.race([operation, expired]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
+}
+
+function exited(child: ChildProcess): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
+  if (child.exitCode !== null || child.signalCode !== null) {
+    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
+  }
+  return new Promise((resolveExit) => child.once('exit', (code, signal) => resolveExit({ code, signal })));
+}
+
+async function stopProcessGroup(child: ChildProcess): Promise<void> {
+  const pid = child.pid;
+  if (pid === undefined) return;
+  if (child.exitCode === null && child.signalCode === null) {
+    try { process.kill(-pid, 'SIGTERM'); } catch { /* It may already have exited. */ }
+  }
+  try {
+    await deadline(exited(child), EXIT_DEADLINE_MS, 'serve process-group termination');
+  } catch {
+    try { process.kill(-pid, 'SIGKILL'); } catch { /* The group may already be gone. */ }
+    await deadline(exited(child), EXIT_DEADLINE_MS, 'forced serve process-group termination');
+  }
+  try { process.kill(-pid, 'SIGKILL'); } catch { /* Prove no surviving descendants by PID below. */ }
+}
+
+function unusedPort(): Promise<number> {
+  return new Promise((resolvePort, reject) => {
+    const server = createServer();
+    server.once('error', reject);
+    server.listen(0, '127.0.0.1', () => {
+      const address = server.address();
+      if (address === null || typeof address === 'string') { reject(new Error('No ephemeral port was assigned.')); return; }
+      server.close((error) => error === undefined ? resolvePort(address.port) : reject(error));
+    });
+  });
+}
+
+function provePortFree(port: number): Promise<void> {
+  return new Promise((resolveFree, reject) => {
+    const server = createServer();
+    server.once('error', reject);
+    server.listen(port, '127.0.0.1', () => server.close((error) =>
+      error === undefined ? resolveFree() : reject(error)));
+  });
+}
+
+interface LaunchOutput {
+  readonly output: () => string;
+  readonly errors: () => string;
+  readonly staticPort: () => number | null;
+  readonly runtimePort: number;
+  readonly descendantPids: () => readonly number[];
+}
+
+function launch(tokensFile: string, runtimePort: number, injectFailure: boolean): {
+  readonly child: ChildProcess;
+  readonly observation: LaunchOutput;
+} {
+  const child = spawn('npm', ['run', 'serve', '--', '--vtt-runtime', '--port', '0'], {
+    cwd: process.cwd(),
+    detached: true,
+    env: {
+      ...process.env,
+      VTT_RUNTIME_TOKENS_FILE: tokensFile,
+      VTT_RUNTIME_PORT: String(runtimePort),
+      ...(injectFailure ? { VTT_RUNTIME_INJECT_STARTUP_FAILURE: '1' } : {}),
+    },
+    stdio: ['ignore', 'pipe', 'pipe'],
+  });
+  let output = '';
+  let errors = '';
+  child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
+  child.stderr?.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
+  return {
+    child,
+    observation: {
+      output: () => output,
+      errors: () => errors,
+      staticPort: () => {
+        const value = /serve: fresh dist\/ available at http:\/\/127\.0\.0\.1:(\d+)/u.exec(output)?.[1];
+        return value === undefined ? null : Number(value);
+      },
+      runtimePort,
+      descendantPids: () => [
+        /serve: process pid (\d+)/u.exec(output)?.[1],
+        /serve: vtt runtime child pid (\d+)/u.exec(output)?.[1],
+        /vtt-runtime: process pid (\d+)/u.exec(output)?.[1],
+      ].filter((value): value is string => value !== undefined).map(Number),
+    },
+  };
+}
+
+function waitForOutput(
+  child: ChildProcess,
+  observation: LaunchOutput,
+  predicate: () => boolean,
+  label: string,
+): Promise<void> {
+  return deadline(new Promise<void>((resolveReady, reject) => {
+    const inspect = (): void => { if (predicate()) resolveReady(); };
+    child.stdout?.on('data', inspect);
+    child.stderr?.on('data', inspect);
+    child.once('exit', (code) => {
+      inspect();
+      if (!predicate()) reject(new Error(label + ' exited ' + String(code) + ': ' + observation.errors()));
+    });
+    child.once('error', reject);
+    inspect();
+  }), STARTUP_DEADLINE_MS, label);
+}
+
+test('launches a fresh runtime and contains both successful and failed process trees', async () => {
   mkdirSync(resolve('.tmp'), { recursive: true });
   const root = mkdtempSync(resolve('.tmp/vtt-runtime-launch-'));
   const token = 'supervisor-launch-secret';
@@ -14,29 +134,24 @@
     tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
   }]), { mode: 0o600 });
   chmodSync(tokensFile, 0o600);
-  const serve = spawn('npm', ['run', 'serve', '--', '--vtt-runtime', '--port', '0'], {
-    cwd: process.cwd(),
-    env: { ...process.env, VTT_RUNTIME_TOKENS_FILE: tokensFile, VTT_RUNTIME_PORT: '0' },
-    stdio: ['ignore', 'pipe', 'pipe'],
-  });
-  let output = '';
-  let errors = '';
-  serve.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
-  serve.stderr.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
+
+  try {
+  const successfulPort = await unusedPort();
+  const successful = launch(tokensFile, successfulPort, false);
+  let successfulPids: readonly number[] = [];
+  let successfulStaticPort: number | null = null;
   try {
-    const addresses = await new Promise<{ readonly staticOrigin: string; readonly websocketUrl: string }>((resolveAddresses, reject) => {
-      const inspect = (): void => {
-        const staticMatch = /serve: fresh dist\/ available at (http:\/\/127\.0\.0\.1:\d+)/u.exec(output);
-        const runtimeMatch = /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(output);
-        if (staticMatch?.[1] !== undefined && runtimeMatch?.[1] !== undefined) {
-          resolveAddresses({ staticOrigin: staticMatch[1], websocketUrl: runtimeMatch[1] });
-        }
-      };
-      serve.stdout.on('data', inspect);
-      serve.once('exit', (code) => reject(new Error(`serve exited ${String(code)}: ${errors}`)));
-      serve.once('error', reject);
-    });
-    const stampResponse = await fetch(`${addresses.staticOrigin}/vtt-handoff-artifact.json`, { cache: 'no-store' });
+    await waitForOutput(successful.child, successful.observation, () =>
+      /serve: fresh dist\/ available at http:\/\/127\.0\.0\.1:\d+/u.test(successful.observation.output())
+      && new RegExp('vtt-runtime: listening ws://127\\.0\\.0\\.1:' + String(successfulPort) + '/vtt/v1', 'u')
+        .test(successful.observation.output()), 'successful launch');
+    successfulStaticPort = successful.observation.staticPort();
+    if (successfulStaticPort === null) throw new Error('The static listening line was absent.');
+    successfulPids = successful.observation.descendantPids();
+    expect(successfulPids).toHaveLength(3);
+    const staticOrigin = 'http://127.0.0.1:' + String(successfulStaticPort);
+    const websocketUrl = 'ws://127.0.0.1:' + String(successfulPort) + '/vtt/v1';
+    const stampResponse = await deadline(fetch(staticOrigin + '/vtt-handoff-artifact.json', { cache: 'no-store' }), 5_000, 'artifact fetch');
     expect(stampResponse.ok).toBe(true);
     const stamp = await stampResponse.json() as unknown;
     expect(stamp).toMatchObject({
@@ -44,17 +159,17 @@
       commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
       worker: { url: expect.stringMatching(/\.js$/u), sha256: expect.stringMatching(/^[0-9a-f]{64}$/u) },
     });
-    const badHandshake = new WebSocket(addresses.websocketUrl, ['vtt.v1', 'bearer.invalid'], { origin: addresses.staticOrigin });
-    await expect(new Promise<number>((resolveStatus, reject) => {
+    const badHandshake = new WebSocket(websocketUrl, ['vtt.v1', 'bearer.invalid'], { origin: staticOrigin });
+    await expect(deadline(new Promise<number>((resolveStatus, reject) => {
       badHandshake.once('unexpected-response', (_request, response) => resolveStatus(response.statusCode ?? 0));
       badHandshake.once('open', () => reject(new Error('Invalid launch token unexpectedly opened.')));
       badHandshake.once('error', () => undefined);
-    })).resolves.toBe(401);
-    const socket = await new Promise<WebSocket>((resolveSocket, reject) => {
-      const candidate = new WebSocket(addresses.websocketUrl, ['vtt.v1', `bearer.${token}`], { origin: addresses.staticOrigin });
+    }), 5_000, 'invalid launch authentication')).resolves.toBe(401);
+    const socket = await deadline(new Promise<WebSocket>((resolveSocket, reject) => {
+      const candidate = new WebSocket(websocketUrl, ['vtt.v1', 'bearer.' + token], { origin: staticOrigin });
       candidate.once('open', () => resolveSocket(candidate));
       candidate.once('error', reject);
-    });
+    }), 5_000, 'runtime authentication');
     const messages = new Promise<readonly unknown[]>((resolveMessages, reject) => {
       const received: unknown[] = [];
       socket.on('message', (data, isBinary) => {
@@ -66,18 +181,40 @@
       });
     });
     socket.send(JSON.stringify({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }));
-    const [opened, snapshot] = await messages;
+    const [opened, snapshot] = await deadline(messages, 5_000, 'open response and initial snapshot');
     expect(opened).toMatchObject({ v: 1, id: '', ok: true });
     expect(snapshot).toMatchObject({ v: 1, event: 'scene.snapshot', seq: 1, data: { revision: 0 } });
-    expect(`${output}\n${errors}`).not.toContain(token);
+    expect(successful.observation.output() + '\n' + successful.observation.errors()).not.toContain(token);
     socket.close();
+  } finally {
+    await stopProcessGroup(successful.child);
+  }
+  if (successfulStaticPort === null) throw new Error('The successful static port was not recorded.');
+  await provePortFree(successfulStaticPort);
+  await provePortFree(successfulPort);
+  expect(successfulPids.every((pid) => !existsSync('/proc/' + String(pid)))).toBe(true);
 
-    const exited = new Promise<void>((resolveExit) => serve.once('exit', () => resolveExit()));
-    serve.kill('SIGTERM');
-    await exited;
-    await expect(fetch(addresses.websocketUrl.replace(/^ws:/u, 'http:'))).rejects.toThrow();
+  const failedPort = await unusedPort();
+  const failed = launch(tokensFile, failedPort, true);
+  let failedStaticPort: number | null = null;
+  let failedPids: readonly number[] = [];
+  try {
+    await waitForOutput(failed.child, failed.observation, () =>
+      failed.observation.staticPort() !== null
+      && /Injected VTT runtime startup failure/u.test(failed.observation.errors()), 'injected failed launch');
+    failedStaticPort = failed.observation.staticPort();
+    failedPids = failed.observation.descendantPids();
+    expect(failedPids.length).toBeGreaterThanOrEqual(2);
+    const result = await deadline(exited(failed.child), EXIT_DEADLINE_MS, 'failed launch exit');
+    expect(result.code).not.toBe(0);
   } finally {
-    if (serve.exitCode === null && serve.signalCode === null) serve.kill('SIGKILL');
+    await stopProcessGroup(failed.child);
+  }
+  if (failedStaticPort === null) throw new Error('The failed static port was not recorded.');
+  await provePortFree(failedStaticPort);
+  await provePortFree(failedPort);
+  expect(failedPids.every((pid) => !existsSync('/proc/' + String(pid)))).toBe(true);
+  } finally {
     rmSync(root, { recursive: true, force: true });
   }
 });
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index 538e6e2ae6d566860d5097ee366af438777cd3aa..78204e2dce278b4f43e4991b3dc531e301c08bb1
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -1,4 +1,5 @@
 import { dirname, relative, resolve } from 'node:path';
+import { builtinModules } from 'node:module';
 import ts from 'typescript';
 import { describe, expect, it } from 'vitest';
 import { existsSync, readFileSync } from '../../helpers/test-filesystem';
@@ -9,6 +10,14 @@
   'reduceSessionEncounter',
   'reduceVaneWarrenEncounter',
 ]);
+const PERMITTED_REDUCER_EDGES = [
+  'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
+  'src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
+  'src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter',
+  'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
+  'src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter',
+  'src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter',
+] as const;
 
 interface ImportEdge {
   readonly specifier: string;
@@ -78,7 +87,18 @@
   return [...new Set(specifiers)];
 }
 
-function parseModule(file: string): SourceModule {
+function allImportSpecifiers(sourceFile: ts.SourceFile): readonly string[] {
+  const specifiers = [...valueImportSpecifiers(sourceFile)];
+  for (const statement of sourceFile.statements) {
+    if (
+      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
+      statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
+    ) specifiers.push(statement.moduleSpecifier.text);
+  }
+  return [...new Set(specifiers)];
+}
+
+function parseModule(file: string, includeTypes: boolean): SourceModule {
   const sourceFile = ts.createSourceFile(
     file,
     readFileSync(file, 'utf8'),
@@ -86,20 +106,21 @@
     true,
     file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
   );
-  const imports = valueImportSpecifiers(sourceFile).map((specifier) => ({
+  const imports = (includeTypes ? allImportSpecifiers(sourceFile) : valueImportSpecifiers(sourceFile)).map((specifier) => ({
     specifier,
     resolved: resolveImport(file, specifier),
   }));
   return { file, sourceFile, imports };
 }
 
-function dependencyGraph(entrypoints: readonly string[]): ReadonlyMap<string, SourceModule> {
+function dependencyGraph(entrypoints: readonly string[], includeTypes = false): ReadonlyMap<string, SourceModule> {
   const graph = new Map<string, SourceModule>();
   const pending = entrypoints.map((entrypoint) => resolve(ROOT, entrypoint));
+  const roots = new Set(pending);
   while (pending.length > 0) {
     const file = pending.pop();
     if (file === undefined || graph.has(file)) continue;
-    const module = parseModule(file);
+    const module = parseModule(file, includeTypes && roots.has(file));
     graph.set(file, module);
     for (const edge of module.imports) {
       if (edge.resolved !== null && !graph.has(edge.resolved)) pending.push(edge.resolved);
@@ -110,26 +131,50 @@
 
 function platformViolations(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
   const violations: string[] = [];
+  const nodeBuiltins = new Set(builtinModules.flatMap((name) => [name, name.replace(/^node:/u, '')]));
+  const browserMembers = new Set([
+    'document', 'window', 'indexedDB', 'SharedArrayBuffer', 'Atomics', 'OffscreenCanvas',
+  ]);
   for (const module of graph.values()) {
     for (const edge of module.imports) {
-      if (edge.specifier.startsWith('node:')) {
+      if (edge.specifier.startsWith('node:') || nodeBuiltins.has(edge.specifier.split('/')[0] ?? edge.specifier)) {
         violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
       }
     }
+    const browserRoots = new Set(['globalThis', 'window', 'document', 'indexedDB']);
+    for (const statement of module.sourceFile.statements) {
+      if (!ts.isVariableStatement(statement)) continue;
+      for (const declaration of statement.declarationList.declarations) {
+        const initializer = declaration.initializer;
+        if (initializer === undefined) continue;
+        const rootName = ts.isIdentifier(initializer) ? initializer.text : null;
+        if (ts.isIdentifier(declaration.name) && rootName !== null && browserRoots.has(rootName)) {
+          browserRoots.add(declaration.name.text);
+        }
+        if (ts.isObjectBindingPattern(declaration.name) && rootName !== null && browserRoots.has(rootName)) {
+          for (const element of declaration.name.elements) {
+            const property = element.propertyName?.getText(module.sourceFile) ?? element.name.getText(module.sourceFile);
+            if (browserMembers.has(property) && ts.isIdentifier(element.name)) {
+              browserRoots.add(element.name.text);
+              violations.push(`${repositoryPath(module.file)} destructures ${property} from ${rootName}`);
+            }
+          }
+        }
+      }
+    }
     const visit = (node: ts.Node): void => {
       if (ts.isPropertyAccessExpression(node)) {
-        const expression = node.expression.getText(module.sourceFile);
-        if (
-          expression === 'document' ||
-          expression === 'indexedDB' ||
-          expression === 'globalThis.document' ||
-          expression === 'globalThis.window' ||
-          expression === 'globalThis.indexedDB'
-        ) {
+        const expression = ts.isIdentifier(node.expression) ? node.expression.text : node.expression.getText(module.sourceFile);
+        if (browserRoots.has(expression) && browserMembers.has(node.name.text)) {
           violations.push(`${repositoryPath(module.file)} uses ${node.getText(module.sourceFile)}`);
         }
       }
       if (
+        ts.isElementAccessExpression(node) &&
+        ts.isIdentifier(node.expression) && browserRoots.has(node.expression.text) &&
+        ts.isStringLiteral(node.argumentExpression) && browserMembers.has(node.argumentExpression.text)
+      ) violations.push(`${repositoryPath(module.file)} uses ${node.getText(module.sourceFile)}`);
+      if (
         ts.isIdentifier(node) &&
         /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u.test(node.text)
       ) {
@@ -217,8 +262,21 @@
   for (const module of graph.values()) {
     const sourceFile = program.getSourceFile(module.file);
     if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
+    const candidateNames = new Set(REDUCERS);
+    for (const statement of sourceFile.statements) {
+      const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
+      if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
+      for (const element of bindings.elements) {
+        if (definingReducer(checker, element.name) !== null) candidateNames.add(element.name.text);
+      }
+    }
     const visit = (node: ts.Node): void => {
-      if (ts.isCallExpression(node) && !insideImport(node)) {
+      const callName = ts.isCallExpression(node)
+        ? ts.isIdentifier(node.expression) ? node.expression.text
+          : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text
+            : null
+        : null;
+      if (ts.isCallExpression(node) && callName !== null && candidateNames.has(callName) && !insideImport(node)) {
         const definition = definingReducer(checker, node.expression);
         if (definition !== null) {
           calls.push(
@@ -234,11 +292,14 @@
   return calls.sort();
 }
 
-function runtimeConvergenceEvidence(graph: ReadonlyMap<string, SourceModule>): {
+function runtimeConvergenceEvidence(
+  graph: ReadonlyMap<string, SourceModule>,
+  suppliedProgram?: ts.Program,
+): {
   readonly constructedClasses: ReadonlySet<string>;
   readonly reducerCalls: readonly string[];
 } {
-  const program = ts.createProgram({
+  const program = suppliedProgram ?? ts.createProgram({
     rootNames: [...graph.keys()],
     options: {
       module: ts.ModuleKind.ESNext,
@@ -256,20 +317,8 @@
     const sourceFile = program.getSourceFile(module.file);
     if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
     const visit = (node: ts.Node): void => {
-      if (ts.isNewExpression(node)) {
-        let symbol = checker.getSymbolAtLocation(node.expression);
-        const visited = new Set<ts.Symbol>();
-        while (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0 && !visited.has(symbol)) {
-          visited.add(symbol);
-          symbol = checker.getAliasedSymbol(symbol);
-        }
-        const declaration = symbol?.getDeclarations()?.find((candidate) => {
-          const file = candidate.getSourceFile().fileName;
-          return file.startsWith(`${ROOT}/`) && !file.includes('/node_modules/');
-        });
-        if (symbol !== undefined && declaration !== undefined) {
-          definitions.add(`${symbol.getName()}@${repositoryPath(declaration.getSourceFile().fileName)}`);
-        }
+      if (ts.isClassDeclaration(node) && node.name !== undefined) {
+        definitions.add(`${node.name.text}@${repositoryPath(sourceFile.fileName)}`);
       }
       if (ts.isCallExpression(node) && !insideImport(node)) {
         const definition = definingReducer(checker, node.expression);
@@ -287,6 +336,26 @@
   return { constructedClasses: definitions, reducerCalls: reducerCalls.sort() };
 }
 
+function assertRuntimeConvergence(
+  evidence: ReturnType<typeof runtimeConvergenceEvidence>,
+  adapter: string,
+): void {
+  const definitions = [...evidence.constructedClasses];
+  if (!definitions.includes('EncounterSessionService@src/vtt/encounter-session-service.ts')) {
+    throw new Error('Runtime entry bypasses EncounterSessionService.');
+  }
+  if (!definitions.includes('ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts')) {
+    throw new Error('Runtime entry bypasses ProtocolRuntime.');
+  }
+  if (!definitions.includes(adapter)) throw new Error(`Runtime entry omits ${adapter}.`);
+}
+
+function assertPermittedReducerEdges(reducerCalls: readonly string[]): void {
+  if (JSON.stringify(reducerCalls) !== JSON.stringify(PERMITTED_REDUCER_EDGES)) {
+    throw new Error(`Runtime entries have an unexpected reducer edge: ${JSON.stringify(reducerCalls)}`);
+  }
+}
+
 function selectorAuthorityViolations(file: string): readonly string[] {
   const sourceFile = ts.createSourceFile(
     file,
@@ -350,14 +419,47 @@
   'src/vtt/handoff/worker-entry.ts',
   'src/vtt/handoff/worker-transport.ts',
 ] as const;
+const RUNTIME_ENTRYPOINTS = [
+  'src/vtt/handoff/in-process-transport.ts',
+  'src/vtt/handoff/worker-entry.ts',
+  'src/vtt/handoff/worker-transport.ts',
+  'tools/vtt-handoff/node-runtime.ts',
+  'src/vtt/handoff/websocket-transport.ts',
+] as const;
 
 let cachedCoreGraph: ReadonlyMap<string, SourceModule> | null = null;
+let cachedRuntimeGraph: ReadonlyMap<string, SourceModule> | null = null;
+let cachedRuntimeReducerCalls: readonly string[] | null = null;
 
 function coreDependencyGraph(): ReadonlyMap<string, SourceModule> {
   cachedCoreGraph ??= dependencyGraph(CORE_ENTRYPOINTS);
   return cachedCoreGraph;
 }
 
+function runtimeDependencyGraph(): ReadonlyMap<string, SourceModule> {
+  cachedRuntimeGraph ??= dependencyGraph(RUNTIME_ENTRYPOINTS);
+  return cachedRuntimeGraph;
+}
+
+function runtimeReducerCalls(): readonly string[] {
+  cachedRuntimeReducerCalls ??= reducerCallSites(runtimeDependencyGraph());
+  return cachedRuntimeReducerCalls;
+}
+
+function classDefinitions(graph: ReadonlyMap<string, SourceModule>): ReadonlySet<string> {
+  const definitions = new Set<string>();
+  for (const module of graph.values()) {
+    const visit = (node: ts.Node): void => {
+      if (ts.isClassDeclaration(node) && node.name !== undefined) {
+        definitions.add(`${node.name.text}@${repositoryPath(module.file)}`);
+      }
+      ts.forEachChild(node, visit);
+    };
+    ts.forEachChild(module.sourceFile, visit);
+  }
+  return definitions;
+}
+
 describe('renderer-neutral engine boundary graph', () => {
   it('recognizes static, re-export, side-effect, import-equals, dynamic, and require value edges', () => {
     const sample = ts.createSourceFile('forms.ts', `
@@ -388,41 +490,74 @@
     expect(platformViolations(graph)).toEqual([]);
   });
 
+  it('rejects bare Node builtins plus aliased, destructured, and computed browser globals', () => {
+    const file = resolve(ROOT, '.tmp/platform-gate-mutant.ts');
+    const sourceFile = ts.createSourceFile(file, `
+      import filesystem from 'fs';
+      const browser = globalThis;
+      const { document: pageDocument } = browser;
+      void browser['indexedDB'];
+      void pageDocument.body;
+      void filesystem;
+    `, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
+    const module: SourceModule = {
+      file,
+      sourceFile,
+      imports: valueImportSpecifiers(sourceFile).map((specifier) => ({ specifier, resolved: null })),
+    };
+    expect(platformViolations(new Map([[file, module]]))).toEqual([
+      '.tmp/platform-gate-mutant.ts destructures document from browser',
+      '.tmp/platform-gate-mutant.ts imports fs',
+      ".tmp/platform-gate-mutant.ts uses browser['indexedDB']",
+    ]);
+  });
+
   it('all runtime entries converge on the pinned session reducer edges', () => {
-    expect(reducerCallSites(coreDependencyGraph())).toEqual([
-      'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
-      'src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
-      'src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter',
-      'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
-      'src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter',
-      'src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter',
-    ]);
+    expect(runtimeReducerCalls()).toEqual(PERMITTED_REDUCER_EDGES);
   });
 
   it('all renderer adapters converge on the session service', () => {
-    const graph = dependencyGraph([
-      'tests/helpers/vtt-handoff/transport-conformance.ts',
-      'src/vtt/handoff/worker-entry.ts',
-      'src/vtt/handoff/worker-transport.ts',
-      'tools/vtt-handoff/node-runtime.ts',
-      'src/vtt/handoff/websocket-transport.ts',
-    ]);
-    const evidence = runtimeConvergenceEvidence(graph);
-    expect([...evidence.constructedClasses]).toEqual(expect.arrayContaining([
-      'EncounterSessionService@src/vtt/encounter-session-service.ts',
-      'ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts',
-      'InProcessSceneTransport@src/vtt/handoff/in-process-transport.ts',
-      'WorkerSceneTransport@src/vtt/handoff/worker-transport.ts',
-      'WebSocketSceneTransport@src/vtt/handoff/websocket-transport.ts',
-    ]));
-    expect(evidence.reducerCalls).toContain(
-      'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
-    );
+    const entries = [
+      {
+        files: ['src/vtt/handoff/in-process-transport.ts'],
+        adapter: 'InProcessSceneTransport@src/vtt/handoff/in-process-transport.ts',
+      },
+      {
+        files: ['src/vtt/handoff/worker-entry.ts', 'src/vtt/handoff/worker-transport.ts'],
+        adapter: 'WorkerSceneTransport@src/vtt/handoff/worker-transport.ts',
+      },
+      {
+        files: ['tools/vtt-handoff/node-runtime.ts', 'src/vtt/handoff/websocket-transport.ts'],
+        adapter: 'WebSocketSceneTransport@src/vtt/handoff/websocket-transport.ts',
+      },
+    ] as const;
+    const entryGraphs = entries.map((entry) => dependencyGraph(entry.files, true));
+    const productionGraph = runtimeDependencyGraph();
+    const valid = { constructedClasses: classDefinitions(productionGraph), reducerCalls: runtimeReducerCalls() };
+    for (const [index, entry] of entries.entries()) {
+      const graph = entryGraphs[index];
+      if (graph === undefined) throw new Error('Runtime entry graph is unavailable.');
+      expect([...graph.keys()].map(repositoryPath).some((file) => file.startsWith('tests/helpers/'))).toBe(false);
+      expect([...graph.keys()].map(repositoryPath)).not.toContain('src/vtt/encounter-app.ts');
+      assertRuntimeConvergence({
+        constructedClasses: classDefinitions(graph),
+        reducerCalls: [],
+      }, entry.adapter);
+    }
+    assertPermittedReducerEdges(valid.reducerCalls);
+    expect(() => assertPermittedReducerEdges([
+      ...valid.reducerCalls,
+      'tools/vtt-handoff/node-runtime.ts#injected -> src/combat/encounter.ts#reduceEncounter',
+    ])).toThrow('unexpected reducer edge');
+    expect(() => assertRuntimeConvergence({
+      ...valid,
+      constructedClasses: new Set([...valid.constructedClasses].filter((value) =>
+        value !== 'EncounterSessionService@src/vtt/encounter-session-service.ts')),
+    }, entries[2].adapter)).toThrow('bypasses EncounterSessionService');
     expect(platformViolations(dependencyGraph([
       'src/vtt/handoff/websocket-transport.ts',
       'src/vtt/handoff/worker-transport.ts',
     ]))).toEqual([]);
-    expect([...graph.keys()].map(repositoryPath)).not.toContain('src/vtt/encounter-app.ts');
   });
 
   it('keeps the complete selector value graph projection-only and platform-neutral', () => {
diff --git a/tests/unit/vtt/node-runtime.test.ts b/tests/unit/vtt/node-runtime.test.ts
index ad9420d12a92489a8c247e821f9198086831e0c2..404b2f2044b3890b2b22b1fa86196db9a884a975
--- a/tests/unit/vtt/node-runtime.test.ts
+++ b/tests/unit/vtt/node-runtime.test.ts
@@ -1,11 +1,17 @@
 import { createHash } from 'node:crypto';
-import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from '../../helpers/test-filesystem';
+import {
+  chmodSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync,
+} from '../../helpers/test-filesystem';
 import { resolve } from 'node:path';
+import { createConnection, type Socket } from 'node:net';
 import { afterEach, describe, expect, it } from 'vitest';
 import { WebSocket, type RawData } from 'ws';
+import type { DmSessionSnapshotEvent } from '../../../src/vtt/encounter-session-service';
+import type { ProtocolSessionPort } from '../../../src/vtt/handoff/protocol-runtime';
+import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
 import {
-  createVttNodeRuntime, VTT_RUNTIME_MAX_PAYLOAD, VTT_RUNTIME_OPEN_DEADLINE_MS,
-  type VttNodeRuntime,
+  createDefaultNodeRuntimeSession, createVttNodeRuntime, VTT_RUNTIME_MAX_PAYLOAD,
+  VTT_RUNTIME_OPEN_DEADLINE_MS, type NodeRuntimeSession, type VttNodeRuntime,
 } from '../../../tools/vtt-handoff/node-runtime';
 
 const ORIGIN = 'http://127.0.0.1:4430';
@@ -73,10 +79,104 @@
 
 async function nextMessage(socket: WebSocket): Promise<unknown> { return (await nextMessages(socket, 1))[0]; }
 
+function bounded<T>(operation: Promise<T>, label: string): Promise<T> {
+  return Promise.race([
+    operation,
+    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`${label} exceeded one second.`)), 1_000)),
+  ]);
+}
+
+function nextMessagesBounded(socket: WebSocket, count: number, label: string): Promise<readonly unknown[]> {
+  return new Promise((resolveMessages, reject) => {
+    const messages: unknown[] = [];
+    const deadline = setTimeout(() => {
+      socket.off('message', receive);
+      reject(new Error(`${label} received ${String(messages.length)} of ${String(count)} messages: ${JSON.stringify(messages)}`));
+    }, 1_000);
+    const receive = (data: RawData, isBinary: boolean): void => {
+      if (isBinary) { clearTimeout(deadline); reject(new Error(`${label} received binary data.`)); return; }
+      messages.push(JSON.parse(data.toString()) as unknown);
+      if (messages.length !== count) return;
+      clearTimeout(deadline);
+      socket.off('message', receive);
+      resolveMessages(messages);
+    };
+    socket.on('message', receive);
+  });
+}
+
 function closeCode(socket: WebSocket): Promise<number> {
   return new Promise((resolveCode) => socket.once('close', (code) => resolveCode(code)));
 }
 
+function rawUpgradePeer(url: string, token: string): Promise<Socket> {
+  const endpoint = new URL(url);
+  return new Promise((resolveSocket, reject) => {
+    const socket = createConnection({ host: '127.0.0.1', port: Number(endpoint.port) });
+    let headers = '';
+    socket.once('error', reject);
+    socket.on('data', (chunk: Buffer) => {
+      headers += chunk.toString('latin1');
+      if (!headers.includes('\r\n\r\n')) return;
+      try {
+        expect(headers).toMatch(/^HTTP\/1\.1 101 /u);
+        socket.removeAllListeners('data');
+        socket.pause();
+        resolveSocket(socket);
+      } catch (error: unknown) { reject(error); }
+    });
+    socket.once('connect', () => socket.write([
+      `GET ${endpoint.pathname} HTTP/1.1`,
+      `Host: 127.0.0.1:${endpoint.port}`,
+      'Upgrade: websocket',
+      'Connection: Upgrade',
+      'Sec-WebSocket-Key: MDEyMzQ1Njc4OWFiY2RlZg==',
+      'Sec-WebSocket-Version: 13',
+      `Origin: ${ORIGIN}`,
+      `Sec-WebSocket-Protocol: vtt.v1, bearer.${token}`,
+      '', '',
+    ].join('\r\n')));
+  });
+}
+
+interface RawHandshakeOverrides {
+  readonly host?: string;
+  readonly key?: string;
+  readonly version?: string;
+  readonly origin?: string | null;
+  readonly protocols?: string;
+}
+
+function rawUpgradeStatus(url: string, overrides: RawHandshakeOverrides): Promise<number> {
+  const endpoint = new URL(url);
+  const originLine = overrides.origin === null ? [] : [`Origin: ${overrides.origin ?? ORIGIN}`];
+  return new Promise((resolveStatus, reject) => {
+    const socket = createConnection({ host: '127.0.0.1', port: Number(endpoint.port) });
+    let response = '';
+    socket.setTimeout(1_000, () => { socket.destroy(); reject(new Error('Handshake response timed out.')); });
+    socket.once('error', reject);
+    socket.on('data', (chunk: Buffer) => {
+      response += chunk.toString('latin1');
+      if (!response.includes('\r\n\r\n')) return;
+      const status = /^HTTP\/1\.1 (\d{3}) /u.exec(response)?.[1];
+      socket.destroy();
+      if (status === undefined) reject(new Error('Handshake response had no HTTP status.'));
+      else resolveStatus(Number(status));
+    });
+    socket.once('connect', () => socket.write([
+      `GET ${endpoint.pathname} HTTP/1.1`,
+      `Host: ${overrides.host ?? `127.0.0.1:${endpoint.port}`}`,
+      'Upgrade: websocket',
+      'Connection: Upgrade',
+      `Sec-WebSocket-Key: ${overrides.key ?? 'MDEyMzQ1Njc4OWFiY2RlZg=='}`,
+      `Sec-WebSocket-Version: ${overrides.version ?? '13'}`,
+      ...originLine,
+      `Sec-WebSocket-Protocol: ${overrides.protocols ?? 'vtt.v1, bearer.dm-secret'}`,
+      '', '',
+    ].join('\r\n')));
+  });
+}
+
 async function open(socket: WebSocket, id = ''): Promise<readonly [unknown, unknown]> {
   const messages = nextMessages(socket, 2);
   socket.send(JSON.stringify({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } }));
@@ -84,6 +184,53 @@
   return [response, snapshot];
 }
 
+function receiptThenAutonomousSession(): NodeRuntimeSession {
+  const base = createDefaultNodeRuntimeSession({ role: 'dm' });
+  const listeners = new Set<(event: DmSessionSnapshotEvent) => void>();
+  let lastSequence = 0;
+  const service: ProtocolSessionPort = {
+    sessionId: base.service.sessionId,
+    dmSnapshot: () => base.service.dmSnapshot(),
+    dmCapture: () => base.service.dmCapture(),
+    playerSnapshot: (playerId) => base.service.playerSnapshot(playerId),
+    playerCapture: (playerId) => base.service.playerCapture(playerId),
+    subscribeDm: (listener) => {
+      listeners.add(listener);
+      const unsubscribe = base.service.subscribeDm((event) => {
+        lastSequence = event.seq;
+        listener(event);
+      });
+      return () => { listeners.delete(listener); unsubscribe(); };
+    },
+    subscribePlayer: (playerId, listener) => base.service.subscribePlayer(playerId, listener),
+    submitOfferedAction: (input) => base.service.submitOfferedAction(input),
+    setDoor: async (input) => {
+      const capture = base.service.dmCapture();
+      const revision = capture.projection.encounter.revision + 1;
+      const projection = {
+        ...capture.projection,
+        encounter: { ...capture.projection.encounter, revision },
+      };
+      lastSequence += 1;
+      const receipt: DmSessionSnapshotEvent = {
+        kind: 'mutation', seq: lastSequence, projection, tokenBindings: capture.tokenBindings,
+        ...(input.invocationToken === undefined ? {} : {
+          terminalReceipt: { invocationToken: input.invocationToken, revision },
+        }),
+      };
+      for (const listener of listeners) listener(receipt);
+      lastSequence += 1;
+      const reaction: DmSessionSnapshotEvent = {
+        kind: 'autonomous', seq: lastSequence, projection, tokenBindings: capture.tokenBindings,
+      };
+      for (const listener of listeners) listener(reaction);
+      return { kind: 'committed', revision, changed: true, event: receipt };
+    },
+    close: () => base.service.close(),
+  };
+  return { service, seats: base.seats, art: base.art };
+}
+
 afterEach(async () => {
   await Promise.all(runtimes.splice(0).map((instance) => instance.close()));
   for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
@@ -114,6 +261,37 @@
     expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('invalid claims');
   });
 
+  it('validates token-file identity, permissions, and size on the opened descriptor', () => {
+    const permissionPath = claimsFile([{ tokenSha256: hash('permission-race'), role: 'dm' }]);
+    expect(() => createVttNodeRuntime({
+      tokensFile: permissionPath,
+      allowedOrigins: new Set([ORIGIN]),
+      tokenFileHooks: { afterOpenInspection: () => chmodSync(permissionPath, 0o644) },
+    })).toThrow('mode 0600');
+
+    const growingPath = claimsFile([{ tokenSha256: hash('growing-race'), role: 'dm' }]);
+    expect(() => createVttNodeRuntime({
+      tokensFile: growingPath,
+      allowedOrigins: new Set([ORIGIN]),
+      tokenFileHooks: {
+        afterOpenInspection: () => writeFileSync(growingPath, 'x'.repeat(65_536), { flag: 'a' }),
+      },
+    })).toThrow('exceeds 65536 bytes');
+
+    const swappedPath = claimsFile([{ tokenSha256: hash('symlink-race'), role: 'dm' }]);
+    const movedPath = resolve(swappedPath, '..', 'moved-tokens.json');
+    expect(() => createVttNodeRuntime({
+      tokensFile: swappedPath,
+      allowedOrigins: new Set([ORIGIN]),
+      tokenFileHooks: {
+        afterOpenInspection: () => {
+          renameSync(swappedPath, movedPath);
+          symlinkSync(movedPath, swappedPath);
+        },
+      },
+    })).toThrow('changed while it was opened');
+  });
+
   it('authenticates before upgrade, echoes only vtt.v1, and binds claims to session.open', async () => {
     const setup = await runtime([
       { tokenSha256: hash('dm-secret'), role: 'dm' },
@@ -133,6 +311,15 @@
     })));
     expect(setup.runtime.sessionCounts()).toEqual({ created: 0, active: 0 });
 
+    await expect(rawUpgradeStatus(setup.url, { host: 'localhost' })).resolves.toBe(401);
+    await expect(rawUpgradeStatus(setup.url, { key: 'not-a-websocket-key' })).resolves.toBe(401);
+    await expect(rawUpgradeStatus(setup.url, { version: '12' })).resolves.toBe(401);
+    await expect(rawUpgradeStatus(setup.url, { origin: null })).resolves.toBe(401);
+    await expect(rawUpgradeStatus(setup.url, {
+      protocols: 'vtt.v1, bearer.dm-secret, bearer.player-a-secret',
+    })).resolves.toBe(401);
+    expect(setup.runtime.sessionCounts()).toEqual({ created: 0, active: 0 });
+
     const dm = await connect(setup.url, 'dm-secret');
     expect(dm.protocol).toBe('vtt.v1');
     const [openResponse, snapshot] = await open(dm);
@@ -145,6 +332,17 @@
     player.send(JSON.stringify({ v: 1, id: 'wrong-role', method: 'session.open', params: { requestedRole: 'dm' } }));
     await expect(refused).resolves.toMatchObject({ id: 'wrong-role', ok: false, error: { code: 'UNAUTHORIZED' } });
     await expect(closing).resolves.toBe(1008);
+    const playerIdMismatch = await connect(setup.url, 'player-a-secret');
+    const mismatchResponse = nextMessage(playerIdMismatch);
+    const mismatchClosing = closeCode(playerIdMismatch);
+    playerIdMismatch.send(JSON.stringify({
+      v: 1, id: 'wrong-player', method: 'session.open',
+      params: { requestedRole: 'player', playerId: PLAYER_B },
+    }));
+    await expect(mismatchResponse).resolves.toMatchObject({
+      id: 'wrong-player', ok: false, error: { code: 'UNAUTHORIZED' },
+    });
+    await expect(mismatchClosing).resolves.toBe(1008);
     dm.close();
   });
 
@@ -183,6 +381,20 @@
     await expect(closeCode(late)).resolves.toBe(1008);
   });
 
+  it('terminates a physical peer that withholds its close response during factory shutdown', async () => {
+    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }], { openDeadlineMs: 20 });
+    const peer = await rawUpgradePeer(setup.url, 'dm-secret');
+    const peerClosed = new Promise<void>((resolveClosed) => peer.once('close', () => resolveClosed()));
+    await new Promise<void>((resolveWait) => setTimeout(resolveWait, 40));
+    await expect(Promise.race([
+      setup.runtime.close(),
+      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Factory shutdown exceeded one second.')), 1_000)),
+    ])).resolves.toBeUndefined();
+    peer.resume();
+    await expect(peerClosed).resolves.toBeUndefined();
+    expect(setup.runtime.sessionCounts().active).toBe(0);
+  });
+
   it('uses fresh logical sessions and refuses reused wire ids before dispatch', async () => {
     const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }]);
     const first = await connect(setup.url, 'dm-secret');
@@ -207,6 +419,42 @@
     second.close();
   });
 
+  it('sends a receipt response before its event and queues a synchronous autonomous reaction in sequence', async () => {
+    const token = 'ordered-secret';
+    const instance = createVttNodeRuntime({
+      tokensFile: claimsFile([{ tokenSha256: hash(token), role: 'dm' }]),
+      allowedOrigins: new Set([ORIGIN]), allowOriginless: true,
+      createSession: () => receiptThenAutonomousSession(),
+    });
+    runtimes.push(instance);
+    const address = await instance.listen(0);
+    const socket = await connect(address.websocketUrl, token);
+    await bounded(open(socket, 'open'), 'ordered open');
+    const publication = nextMessagesBounded(socket, 3, 'ordered publication');
+    socket.send(JSON.stringify({
+      v: 1, id: 'door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }));
+    const [response, receipt, reaction] = await publication;
+    expect(response).toMatchObject({ id: 'door', ok: true });
+    expect(receipt).toMatchObject({ event: 'scene.snapshot', seq: 2 });
+    expect(reaction).toMatchObject({ event: 'scene.snapshot', seq: 3 });
+    socket.close();
+
+    const observerTransport = new WebSocketSceneTransport(address.websocketUrl, token);
+    await bounded(observerTransport.request({
+      v: 1, id: 'observer-open', method: 'session.open', params: { requestedRole: 'dm' },
+    }), 'observer open');
+    await bounded(observerTransport.initialSnapshot(), 'observer initial snapshot');
+    observerTransport.subscribe((event) => { if (event.seq > 1) observerTransport.close(); });
+    await expect(bounded(observerTransport.request({
+      v: 1, id: 'observer-door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }), 'observer receipt')).resolves.toMatchObject({ id: 'observer-door', ok: true });
+    expect(observerTransport.status()).toBe('closed');
+    expect(observerTransport.pendingRequestCount()).toBe(0);
+  });
+
   it('binds two player claims independently and refuses cross-seat token authority', async () => {
     const setup = await runtime([
       { tokenSha256: hash('player-a-secret'), role: 'player', playerId: PLAYER_A },
diff --git a/tests/unit/vtt/node-websocket-transport.test.ts b/tests/unit/vtt/node-websocket-transport.test.ts
index 8907ccefe78a0c7b80b9ad7ae4f489a515cb8ec9..b8c1efbc7d2b104ac6677eb2aabac0ec9b3f368f
--- a/tests/unit/vtt/node-websocket-transport.test.ts
+++ b/tests/unit/vtt/node-websocket-transport.test.ts
@@ -2,9 +2,12 @@
 import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
 import { resolve } from 'node:path';
 import { afterEach, describe, expect, it, vi } from 'vitest';
-import { createVttNodeRuntime, type VttNodeRuntime } from '../../../tools/vtt-handoff/node-runtime';
+import {
+  createDefaultNodeRuntimeSession, createVttNodeRuntime, type VttNodeRuntime,
+} from '../../../tools/vtt-handoff/node-runtime';
 import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
 import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
+import { executeTransportConformanceScenario } from '../../helpers/vtt-handoff/transport-conformance';
 
 const roots: string[] = [];
 const runtimes: VttNodeRuntime[] = [];
@@ -25,58 +28,128 @@
 });
 
 describe('browser-safe WebSocket scene transport', () => {
-  it('serializes once per wire message, correlates empty ids, buffers initial state, and cleans up centrally', async () => {
+  it('uses exactly one JSON encode and decode per direction for accepted and rejected envelopes', async () => {
     const token = 'transport-secret';
-    const serverParse = vi.fn((text: string): unknown => JSON.parse(text) as unknown);
-    const serverStringify = vi.fn((value: unknown): string => JSON.stringify(value));
     const runtime = createVttNodeRuntime({
       tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true,
-      wireCodec: { parse: serverParse, stringify: serverStringify },
+      createSession: (principal) => {
+        const session = createDefaultNodeRuntimeSession(principal);
+        return { service: session.service, seats: session.seats, art: session.art };
+      },
     });
     runtimes.push(runtime);
     const address = await runtime.listen(0);
-    const clientParse = vi.fn((text: string): unknown => JSON.parse(text) as unknown);
-    const clientStringify = vi.fn((value: unknown): string => JSON.stringify(value));
-    const transport = new WebSocketSceneTransport(address.websocketUrl, token, {
-      parse: clientParse, stringify: clientStringify,
+    const warm = new WebSocketSceneTransport(address.websocketUrl, token);
+    await warm.request({ v: 1, id: 'warm-open', method: 'session.open', params: { requestedRole: 'dm' } });
+    await warm.initialSnapshot();
+    warm.close();
+    const originalParse = JSON.parse;
+    const originalStringify = JSON.stringify;
+    let measuring = false;
+    let parseCount = 0;
+    let stringifyCount = 0;
+    const isMeasuredJsonCall = (stack: string | undefined, zodClientError: boolean): boolean => {
+      const frames = stack?.split('\n') ?? [];
+      const directCaller = frames[3] ?? '';
+      if (/src\/vtt\/handoff\/websocket-transport\.ts|tools\/vtt-handoff\/node-runtime\.ts/u.test(directCaller)) return true;
+      return zodClientError
+        && /node_modules\/zod\/v4\/core\/errors\.js/u.test(directCaller)
+        && frames.some((frame) => /src\/vtt\/handoff\/websocket-transport\.ts/u.test(frame));
+    };
+    const parse = vi.spyOn(JSON, 'parse').mockImplementation((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
+      if (measuring && isMeasuredJsonCall(new Error().stack, false)) parseCount += 1;
+      return originalParse(text, reviver);
+    });
+    const stringify = vi.spyOn(JSON, 'stringify').mockImplementation((
+      value: unknown,
+      replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (number | string)[] | null,
+      space?: number | string,
+    ) => {
+      if (measuring && isMeasuredJsonCall(new Error().stack, true)) stringifyCount += 1;
+      return typeof replacer === 'function'
+        ? originalStringify(value, replacer, space)
+        : originalStringify(value, replacer, space);
     });
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
     const statuses: string[] = [];
     transport.subscribeStatus((status) => statuses.push(status));
     const events: number[] = [];
     transport.subscribe((event) => events.push(event.seq));
+    measuring = true;
     await expect(transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }))
       .resolves.toMatchObject({ id: '', ok: true });
     await expect(transport.initialSnapshot()).resolves.toMatchObject({ revision: 0 });
     expect(statuses).toEqual(['connecting', 'open']);
     expect(events[0]).toBe(1);
-    expect(clientStringify).toHaveBeenCalledTimes(1);
-    expect(serverParse).toHaveBeenCalledTimes(1);
-    expect(serverStringify.mock.calls.length).toBeGreaterThanOrEqual(2);
-    expect(clientParse.mock.calls.length).toBe(serverStringify.mock.calls.length);
+    const first = await transport.request({
+      v: 1, id: 'budget-id', method: 'scene.snapshot', params: {},
+    });
+    expect(first).toMatchObject({ id: 'budget-id', ok: true });
+    const rejected = await transport.request({
+      v: 1, id: 'budget-id', method: 'scene.snapshot', params: {},
+    });
+    measuring = false;
+    expect(rejected).toMatchObject({ id: 'budget-id', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
+    const totalWireEnvelopes = 7;
+    const assertBudget = (extraSerializations: number): void => {
+      expect(stringifyCount + extraSerializations).toBe(totalWireEnvelopes);
+      expect(parseCount).toBe(totalWireEnvelopes);
+    };
+    assertBudget(0);
+    expect(() => assertBudget(1)).toThrow();
+    parse.mockRestore();
+    stringify.mockRestore();
 
     const lateEvents: number[] = [];
     const stopLate = transport.subscribe((event) => lateEvents.push(event.seq));
     expect(lateEvents).toHaveLength(1);
     stopLate();
-    const closedByObserver = new Promise<void>((resolveClosed) => {
-      transport.subscribe((event) => {
-        if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open !== true) return;
-        transport.close();
-        resolveClosed();
-      });
-    });
-    const door = await transport.request({
-      v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
-    });
-    expect(door).toMatchObject({ id: 'door', ok: true });
-    await closedByObserver;
-    expect(events.at(-1)).toBeGreaterThan(1);
+    transport.close();
     expect(transport.status()).toBe('closed');
     expect(transport.pendingRequestCount()).toBe(0);
     await expect(transport.request({ v: 1, id: 'after', method: 'scene.snapshot', params: {} }))
       .rejects.toBeInstanceOf(SceneTransportClosedError);
   });
 
+  it('reserves the serialized id against a re-entrant same-id request without overwriting either outcome', async () => {
+    const token = 'reentrant-secret';
+    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    let inner: Promise<unknown> | null = null;
+    const outer = transport.request({
+      toJSON(): unknown {
+        inner = transport.request({ v: 1, id: 'same', method: 'session.open', params: { requestedRole: 'dm' } });
+        return { v: 1, id: 'same', method: 'session.open', params: { requestedRole: 'dm' } };
+      },
+    });
+    await expect(outer).rejects.toBeInstanceOf(SceneTransportFaultError);
+    if (inner === null) throw new Error('The re-entrant request was not submitted.');
+    await expect(inner).resolves.toMatchObject({ id: 'same', ok: true });
+    expect(transport.pendingRequestCount()).toBe(0);
+    transport.close();
+  });
+
+  it('reads a changing id once and correlates the exact representation put on the wire', async () => {
+    const token = 'changing-id-secret';
+    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    let reads = 0;
+    const response = await transport.request({
+      v: 1,
+      get id(): string { reads += 1; return reads === 1 ? 'captured-id' : 'changed-id'; },
+      method: 'session.open',
+      params: { requestedRole: 'dm' },
+    });
+    expect(response).toMatchObject({ id: 'captured-id', ok: true });
+    expect(reads).toBe(1);
+    expect(transport.pendingRequestCount()).toBe(0);
+    transport.close();
+  });
+
   it('rechecks state after caller-controlled serialization and never retries an unknown mutation', async () => {
     const token = 'getter-secret';
     const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
@@ -113,4 +186,39 @@
     expect(transport.status()).toBe('closed');
     expect(runtime.sessionCounts()).toEqual({ created: 0, active: 0 });
   });
+
+  it('does not retry an actually sent mutation after the socket drops with an unknown outcome', async () => {
+    const token = 'unknown-outcome-secret';
+    let decodedMutations = 0;
+    let runtimeReference: VttNodeRuntime | null = null;
+    const runtime = createVttNodeRuntime({
+      tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true,
+      wireCodec: {
+        parse: (text): unknown => {
+          const value = JSON.parse(text) as unknown;
+          if (typeof value === 'object' && value !== null && Reflect.get(value, 'method') === 'door.set') {
+            decodedMutations += 1;
+            if (runtimeReference !== null) void runtimeReference.close();
+          }
+          return value;
+        },
+        stringify: (value): string => JSON.stringify(value),
+      },
+    });
+    runtimeReference = runtime;
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    await transport.request({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
+    await expect(transport.request({
+      v: 1, id: 'unknown', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    })).rejects.toSatisfy((error: unknown) =>
+      error instanceof SceneTransportClosedError || error instanceof SceneTransportFaultError);
+    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 20));
+    await executeTransportConformanceScenario('no retry after unknown mutation outcome', () => {
+      expect(decodedMutations).toBe(1);
+      expect(transport.pendingRequestCount()).toBe(0);
+    });
+  });
 });
diff --git a/tests/unit/vtt/runtime-parity.test.ts b/tests/unit/vtt/runtime-parity.test.ts
index 5c10d8179eee3cd82cce21cc2011ff0da532612a..bd61e93ab2dac55820c3f6e89fc3d5bae5fd7106
--- a/tests/unit/vtt/runtime-parity.test.ts
+++ b/tests/unit/vtt/runtime-parity.test.ts
@@ -8,17 +8,22 @@
 } from '../../../tools/vtt-handoff/node-runtime';
 import {
   createInProcessConformanceTransport, runDmTransportConformance, TRANSPORT_CONFORMANCE_SCENARIOS,
+  executeTransportConformanceScenario, runPlayerMismatchConformance, runPlayerMovementConformance,
+  TWO_ROOM_MOVING_PLAYER,
 } from '../../helpers/vtt-handoff/transport-conformance';
 
 const roots: string[] = [];
 const runtimes: VttNodeRuntime[] = [];
 
-function tokenFile(token: string): string {
+function tokenFile(token: string, playerToken: string): string {
   mkdirSync(resolve('.tmp'), { recursive: true });
   const root = mkdtempSync(resolve('.tmp/vtt-runtime-parity-'));
   roots.push(root);
   const path = resolve(root, 'tokens.json');
-  writeFileSync(path, JSON.stringify([{ tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' }]), { mode: 0o600 });
+  writeFileSync(path, JSON.stringify([
+    { tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' },
+    { tokenSha256: createHash('sha256').update(playerToken).digest('hex'), role: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
+  ]), { mode: 0o600 });
   chmodSync(path, 0o600);
   return path;
 }
@@ -37,6 +42,18 @@
   ]));
 }
 
+function waitForNoActiveSessions(runtime: VttNodeRuntime): Promise<void> {
+  return new Promise((resolveInactive, reject) => {
+    const deadline = setTimeout(() => reject(new Error('Socket cleanup did not finish within one second.')), 1_000);
+    const inspect = (): void => {
+      if (runtime.sessionCounts().active !== 0) { setTimeout(inspect, 5); return; }
+      clearTimeout(deadline);
+      resolveInactive();
+    };
+    inspect();
+  });
+}
+
 describe('fixed two-room runtime parity', () => {
   it('runs the shared independent conformance assertions through in-process and WebSocket adapters', async () => {
     expect(TRANSPORT_CONFORMANCE_SCENARIOS).toHaveLength(16);
@@ -46,11 +63,13 @@
     const inProcessResult = await inProcessResultPromise;
 
     const token = 'runtime-parity-secret';
-    const nodeRuntime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    const playerToken = 'runtime-parity-player-secret';
+    const nodeRuntime = createVttNodeRuntime({
+      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
+    });
     runtimes.push(nodeRuntime);
     const address = await nodeRuntime.listen(0);
     const websocketResult = await runDmTransportConformance(new WebSocketSceneTransport(address.websocketUrl, token));
-
     expect(websocketResult.seed).toBe(603_020_001);
     expect(websocketResult.clock).toBe('2026-09-09T12:00:00.000Z');
     expect(websocketResult.canonical.map((response) => ({
@@ -70,4 +89,59 @@
     });
     expect(nodeRuntime.sessionCounts()).toEqual({ created: 1, active: 0 });
   });
+
+  it('executes successful player movement and authoritative mismatch controls through both adapters', async () => {
+    const inProcessPlayer = createInProcessConformanceTransport({ role: 'player', playerId: TWO_ROOM_MOVING_PLAYER });
+    await runPlayerMovementConformance(inProcessPlayer.transport, inProcessPlayer.start);
+    const inProcessMismatch = createInProcessConformanceTransport({ role: 'player', playerId: TWO_ROOM_MOVING_PLAYER });
+    await runPlayerMismatchConformance(inProcessMismatch.transport);
+
+    const token = 'player-parity-dm-secret';
+    const playerToken = 'player-parity-secret';
+    const nodeRuntime = createVttNodeRuntime({
+      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
+    });
+    runtimes.push(nodeRuntime);
+    const address = await nodeRuntime.listen(0);
+    await runPlayerMovementConformance(
+      new WebSocketSceneTransport(address.websocketUrl, playerToken),
+      () => Promise.resolve(),
+    );
+    await runPlayerMismatchConformance(new WebSocketSceneTransport(address.websocketUrl, playerToken));
+    expect(nodeRuntime.sessionCounts()).toEqual({ created: 2, active: 0 });
+  });
+
+  it('reconnects to a fresh session, full snapshot, and correlation ledger', async () => {
+    const token = 'reconnect-dm-secret';
+    const nodeRuntime = createVttNodeRuntime({
+      tokensFile: tokenFile(token, 'unused-player-secret'), allowedOrigins: new Set(), allowOriginless: true,
+    });
+    runtimes.push(nodeRuntime);
+    const address = await nodeRuntime.listen(0);
+    const first = new WebSocketSceneTransport(address.websocketUrl, token);
+    const firstOpen = await first.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
+    await first.initialSnapshot();
+    await expect(first.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'reused', ok: true });
+    first.dispose();
+
+    const second = new WebSocketSceneTransport(address.websocketUrl, token);
+    const secondOpen = await second.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
+    await expect(second.initialSnapshot()).resolves.toMatchObject({ revision: 0, tokens: [
+      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+    ] });
+    expect(firstOpen.ok && secondOpen.ok ? firstOpen.result.sessionId : null)
+      .not.toBe(secondOpen.ok ? secondOpen.result.sessionId : null);
+    await expect(second.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'reused', ok: true });
+    await executeTransportConformanceScenario('reconnect full resnapshot', () => {
+      expect(secondOpen.ok).toBe(true);
+      expect(firstOpen.ok && secondOpen.ok ? firstOpen.result.sessionId : null)
+        .not.toBe(secondOpen.ok ? secondOpen.result.sessionId : null);
+    });
+    second.dispose();
+    await waitForNoActiveSessions(nodeRuntime);
+    expect(nodeRuntime.sessionCounts()).toEqual({ created: 2, active: 0 });
+  });
 });
diff --git a/tools/serve.mjs b/tools/serve.mjs
index afbc858e38dbd9eff9a1ab04967db3d20ce24bd8..1c986b6ed7983b9289008a50c259c066321304ac
--- a/tools/serve.mjs
+++ b/tools/serve.mjs
@@ -198,6 +198,8 @@
     env: process.env,
     stdio: ['ignore', 'pipe', 'pipe'],
   });
+  process.stdout.write(`serve: process pid ${String(process.pid)}\n`);
+  if (child.pid !== undefined) process.stdout.write(`serve: vtt runtime child pid ${String(child.pid)}\n`);
   child.stdout.pipe(process.stdout);
   child.stderr.pipe(process.stderr);
   let stopping = false;
diff --git a/tools/vtt-handoff/node-runtime-main.ts b/tools/vtt-handoff/node-runtime-main.ts
index d49ab578ec767c5a507f32bf7eb1d92c4610881e..2f1f955da1adb0196f967da74a322fa302cef205
--- a/tools/vtt-handoff/node-runtime-main.ts
+++ b/tools/vtt-handoff/node-runtime-main.ts
@@ -32,6 +32,9 @@
 }
 
 async function main(): Promise<void> {
+  if (process.env.VTT_RUNTIME_INJECT_STARTUP_FAILURE === '1') {
+    throw new Error('Injected VTT runtime startup failure.');
+  }
   const parsed = options(process.argv.slice(2), process.env);
   const tokensFile = process.env.VTT_RUNTIME_TOKENS_FILE;
   if (tokensFile === undefined || tokensFile.length === 0) throw new Error('VTT_RUNTIME_TOKENS_FILE is required.');
@@ -41,6 +44,7 @@
     allowOriginless: parsed.allowOriginless,
   });
   const address = await runtime.listen(parsed.port);
+  process.stdout.write(`vtt-runtime: process pid ${String(process.pid)}\n`);
   process.stdout.write(`vtt-runtime: listening ${address.websocketUrl}\n`);
   let closing = false;
   const close = (): void => {
diff --git a/tools/vtt-handoff/node-runtime.ts b/tools/vtt-handoff/node-runtime.ts
index be204cf7289e515310e0da9ec02f62bcde149e9e..4a67ac398c2dfb0c53d56949615d913d16057686
--- a/tools/vtt-handoff/node-runtime.ts
+++ b/tools/vtt-handoff/node-runtime.ts
@@ -1,5 +1,5 @@
 import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
-import { lstatSync, openSync, closeSync, readFileSync, fstatSync } from 'node:fs';
+import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
 import { createServer, type IncomingMessage } from 'node:http';
 import type { Duplex } from 'node:stream';
 import { WebSocket, WebSocketServer, type RawData } from 'ws';
@@ -8,7 +8,9 @@
 import type { EncounterState } from '../../src/combat/encounter';
 import type { LegalActionSummary } from '../../src/combat/controllers';
 import { DmEncounterHost } from '../../src/vtt/dm-encounter-host';
-import { EncounterSessionService, type PlayerSeatRegistration } from '../../src/vtt/encounter-session-service';
+import {
+  EncounterSessionService, type PlayerSeatRegistration, type SessionInvocationToken,
+} from '../../src/vtt/encounter-session-service';
 import type { EncounterArtPackage } from '../../src/vtt/encounter-package';
 import { encounterSeed } from '../../src/vtt/session-seed';
 import { MemoryBrowserSessionStore } from '../../src/vtt/session-persistence';
@@ -58,6 +60,10 @@
   readonly allowOriginless?: boolean;
   readonly openDeadlineMs?: number;
   readonly createSession?: (principal: HandoffPrincipal) => NodeRuntimeSession;
+  readonly tokenFileHooks?: {
+    readonly afterOpenInspection?: () => void;
+    readonly afterBoundedRead?: () => void;
+  };
   readonly wireCodec?: {
     readonly parse: (text: string) => unknown;
     readonly stringify: (value: HandoffResponse | SceneSnapshotEvent) => string;
@@ -77,21 +83,42 @@
   sessionCounts(): { readonly created: number; readonly active: number };
 }
 
-function readTokenClaims(path: string): readonly TokenClaim[] {
-  const before = lstatSync(path);
-  if (!before.isFile() || before.isSymbolicLink()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
-  if ((before.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
-  if (before.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
-  const descriptor = openSync(path, 'r');
+function readTokenClaims(path: string, hooks: VttNodeRuntimeOptions['tokenFileHooks']): readonly TokenClaim[] {
+  let descriptor: number;
+  try { descriptor = openSync(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW); }
+  catch { throw new Error('VTT_RUNTIME_TOKENS_FILE must be an openable regular nonsymlink file.'); }
   try {
     const opened = fstatSync(descriptor);
-    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
+    if (!opened.isFile()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
+    if ((opened.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
+    if (opened.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
+    hooks?.afterOpenInspection?.();
+    const named = lstatSync(path);
+    if (!named.isFile() || named.isSymbolicLink() || named.dev !== opened.dev || named.ino !== opened.ino) {
       throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was opened.');
     }
-    const bytes = readFileSync(descriptor);
-    if (bytes.byteLength > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
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
     let source: unknown;
-    try { source = JSON.parse(bytes.toString('utf8')) as unknown; }
+    try { source = JSON.parse(bytes.subarray(0, used).toString('utf8')) as unknown; }
     catch { throw new Error('VTT_RUNTIME_TOKENS_FILE is not valid JSON.'); }
     const parsed = tokenClaimsSchema.safeParse(source);
     if (!parsed.success) throw new Error('VTT_RUNTIME_TOKENS_FILE has invalid claims.');
@@ -126,7 +153,9 @@
 }
 
 let sessionSequence = 0;
-export function createDefaultNodeRuntimeSession(_principal: HandoffPrincipal): NodeRuntimeSession {
+export function createDefaultNodeRuntimeSession(
+  _principal: HandoffPrincipal,
+): NodeRuntimeSession & { readonly service: EncounterSessionService } {
   sessionSequence += 1;
   const state = buildTwoRoomEncounter();
   const host = new DmEncounterHost(`scene:vtt-node:${String(sessionSequence)}:${randomBytes(8).toString('hex')}`, new MemoryBrowserSessionStore(), {
@@ -224,7 +253,7 @@
 }
 
 export function createVttNodeRuntime(options: VttNodeRuntimeOptions): VttNodeRuntime {
-  const claims = readTokenClaims(options.tokensFile);
+  const claims = readTokenClaims(options.tokensFile, options.tokenFileHooks);
   const openDeadlineMs = options.openDeadlineMs ?? VTT_RUNTIME_OPEN_DEADLINE_MS;
   if (!Number.isSafeInteger(openDeadlineMs) || openDeadlineMs < 1) throw new RangeError('openDeadlineMs must be a positive integer.');
   const createSession = options.createSession ?? createDefaultNodeRuntimeSession;
@@ -236,7 +265,7 @@
     response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
     response.end('Not found\n');
   });
-  const sockets = new Set<WebSocket>();
+  const physicalSockets = new Set<WebSocket>();
   const wss = new WebSocketServer({
     noServer: true,
     maxPayload: VTT_RUNTIME_MAX_PAYLOAD,
@@ -260,20 +289,24 @@
   });
 
   wss.on('connection', (websocket: WebSocket, _request: IncomingMessage, principal: HandoffPrincipal) => {
+    physicalSockets.add(websocket);
+    const forgetPhysicalSocket = (): void => { physicalSockets.delete(websocket); };
+    websocket.once('close', forgetPhysicalSocket);
     let session: NodeRuntimeSession;
     try { session = createSession(principal); }
     catch { websocket.close(1011, 'Session creation failed.'); return; }
     created += 1;
     active += 1;
-    sockets.add(websocket);
     const runtime = new ProtocolRuntime({ service: session.service, principal, seats: session.seats, art: session.art });
     const usedIds = new Set<string>();
     const aborters = new Set<AbortController>();
     let opened = false;
     let terminal = false;
-    let dispatchingOpen = false;
-    let bufferedOpenEvent: SceneSnapshotEvent | null = null;
-    const bufferedReceiptEvents = new Map<object, SceneSnapshotEvent>();
+    const outboundEvents: Array<{
+      readonly event: SceneSnapshotEvent;
+      readonly invocationToken: SessionInvocationToken | null;
+    }> = [];
+    const establishedResponses = new Set<SessionInvocationToken>();
 
     const send = (value: HandoffResponse | SceneSnapshotEvent): boolean => {
       if (terminal || websocket.readyState !== WebSocket.OPEN) return false;
@@ -285,10 +318,19 @@
       catch { cleanup(1011, 'Socket send failed.'); return false; }
       return !terminal && websocket.readyState === WebSocket.OPEN;
     };
+    const flushEvents = (): void => {
+      if (!opened || terminal) return;
+      while (outboundEvents.length > 0) {
+        const next = outboundEvents[0];
+        if (next === undefined) return;
+        if (next.invocationToken !== null && !establishedResponses.has(next.invocationToken)) return;
+        outboundEvents.shift();
+        if (!send(next.event)) return;
+      }
+    };
     const unsubscribeEvent = runtime.subscribe((event, receipt) => {
-      if (dispatchingOpen && !opened) { bufferedOpenEvent = event; return; }
-      if (receipt !== undefined) { bufferedReceiptEvents.set(receipt.invocationToken, event); return; }
-      send(event);
+      outboundEvents.push({ event, invocationToken: receipt?.invocationToken ?? null });
+      flushEvents();
     });
     const unsubscribeFault = runtime.subscribeFaults((fault) => cleanup(fault.websocketCloseCode, fault.message));
     const deadline = setTimeout(() => cleanup(1008, 'session.open deadline expired.'), openDeadlineMs);
@@ -298,18 +340,22 @@
       terminal = true;
       clearTimeout(deadline);
       active -= 1;
-      sockets.delete(websocket);
       for (const aborter of aborters) aborter.abort();
       aborters.clear();
+      websocket.off('message', onMessage);
+      websocket.off('close', onApplicationClose);
+      websocket.off('error', onApplicationError);
       unsubscribeEvent();
       unsubscribeFault();
+      outboundEvents.length = 0;
+      establishedResponses.clear();
       try { runtime.destroySession(); } catch { /* Socket cleanup remains terminal. */ }
       if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
         try { websocket.close(code ?? 1000, reason?.slice(0, 123)); } catch { websocket.terminate(); }
       }
     };
 
-    websocket.on('message', (data, isBinary) => {
+    const onMessage = (data: RawData, isBinary: boolean): void => {
       if (terminal) return;
       if (isBinary) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError, 'Binary frames are unsupported.'); return; }
       const text = rawText(data);
@@ -328,7 +374,6 @@
       const token = runtime.createInvocationToken();
       const aborter = new AbortController();
       aborters.add(aborter);
-      if (!opened) dispatchingOpen = true;
       let dispatched: ReturnType<ProtocolRuntime['dispatch']>;
       try { dispatched = runtime.dispatch(value, aborter.signal, token); }
       catch { aborters.delete(aborter); cleanup(1011, 'Session dispatch failed.'); return; }
@@ -336,7 +381,6 @@
         if (terminal) return;
         if (result.kind === 'transport_fault') { cleanup(result.fault.websocketCloseCode, result.fault.message); return; }
         if (!opened && fields.method === 'session.open') {
-          dispatchingOpen = false;
           if (!result.response.ok) {
             send(result.response);
             cleanup(1008, 'session.open was refused.');
@@ -345,26 +389,26 @@
           opened = true;
           clearTimeout(deadline);
           if (!send(result.response)) return;
-          const initial = bufferedOpenEvent;
-          bufferedOpenEvent = null;
-          if (initial !== null) send(initial);
+          flushEvents();
           if (session.start !== undefined) await session.start();
           return;
         }
         if (!send(result.response)) return;
-        const receiptEvent = bufferedReceiptEvents.get(token);
-        bufferedReceiptEvents.delete(token);
-        if (receiptEvent !== undefined) send(receiptEvent);
+        establishedResponses.add(token);
+        flushEvents();
       }).catch(() => cleanup(1011, 'Session dispatch failed.')).finally(() => {
         aborters.delete(aborter);
-        bufferedReceiptEvents.delete(token);
+        establishedResponses.delete(token);
       });
-    });
-    websocket.on('close', () => cleanup());
-    websocket.on('error', (error) => {
+    };
+    const onApplicationClose = (): void => cleanup();
+    const onApplicationError = (error: Error): void => {
       const errorCode = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
       cleanup(errorCode === 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH' ? 1009 : 1011, 'Socket error.');
-    });
+    };
+    websocket.on('message', onMessage);
+    websocket.on('close', onApplicationClose);
+    websocket.on('error', onApplicationError);
   });
 
   return {
@@ -381,7 +425,7 @@
     }),
     close: () => {
       closePromise ??= (async () => {
-        for (const socket of [...sockets]) socket.terminate();
+        for (const socket of new Set([...physicalSockets, ...wss.clients])) socket.terminate();
         await new Promise<void>((resolve, reject) => wss.close((error) => error === undefined ? resolve() : reject(error)));
         if (!server.listening) return;
         await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
