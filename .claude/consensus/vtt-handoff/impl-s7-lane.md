Implemented S7a–S7d WebSocket runtime.

Key results:

- Secure loopback-only WebSocket factory with pre-upgrade token, Host, Origin, version, key, path, and subprotocol validation.
- Mode-0600 nonsymlink bounded token claims.
- Server-minted invocation identities, duplicate wire-ID rejection, receipt-before-event delivery, five-second open deadline, and centralized cleanup.
- Browser-safe `WebSocketSceneTransport` with pending-request settlement, late snapshot replay, typed faults, and no automatic retry.
- Worker/in-process/WebSocket fixed-scene parity using seed `603020001` and clock `2026-09-09T12:00:00.000Z`.
- Supervisor-only launch probe added but not executed.
- No changes to accepted protocol, session service, in-process transport, Worker files, UI, docs, or frozen contracts.

Verification:

- `npm run test:runtime-node` — 4 files, 44 tests passed.
- `npx vitest run --configLoader runner tests/unit/vtt/runtime-parity.test.ts tests/unit/vtt/engine-boundary.test.ts` — 2 files, 6 tests passed.
- Boundary selection — 1 passed, 4 skipped.
- `PLAYWRIGHT_PORT=4430 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts` — 1 passed; artifact `dev`; Node port `0`.
- Cumulative non-publication slice — 16 files, 142 tests passed.
- `npm run typecheck:fast`, `sg scan`, `git diff --check`, and `node --check tools/serve.mjs` passed.
- Ordinary discovery excludes the supervisor probe; its dedicated config lists exactly one test.
- Frozen contract hash remains `0f0e1d8f…`; plan hash remains `25816309…`.

The 16-scenario matrix covers correlation, validation, authorization, snapshots, player movement, door change/no-op, `UNSUPPORTED`, terminal outcomes, fresh-session reconnect, late subscription, hidden removal, duplicate execution, malformed/empty IDs, cleanup, and unknown-outcome no-retry. The symbol-resolved graph confirms all three adapters converge through `EncounterSessionService` and `ProtocolRuntime` to the permitted reducer chain, without `encounter-app.ts`.

Shared seams changed: package alias, exact Playwright Origin derivation, `serve -- --vtt-runtime`, test filesystem capability export, symbol-resolved boundary test, and supervisor-test discovery exclusion. The exclusion was necessary because `.launch-test.ts` does match the repository’s `**/*.test.ts` glob.

The two publication suites remain unexecutable in this isolated lane because their accepted security policy authorizes only `/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`, not `...-s7`; I did not broaden that publication boundary.

HANDOFF S7 DONE
diff --git a//tmp/vtt-empty-vite.config.mjs b//tmp/vtt-empty-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/vtt-empty-vite.config.mjs
@@ -0,0 +1 @@
+export default {};
diff --git a/package.json b/package.json
index b4d0403233826a96a33bb176c63082be9e70b53f..0d7bdb9b2f997b6cc60c4c69dd9464cd2b63f250
--- a/package.json
+++ b/package.json
@@ -44,6 +44,7 @@
     "test:engine": "vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "test:protocol": "vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "test:worker": "playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts",
+    "test:runtime-node": "vitest run --configLoader runner tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts --"
   },
   "dependencies": {
diff --git a/src/vtt/handoff/websocket-transport.ts b/src/vtt/handoff/websocket-transport.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d0a015d47a077a2db53a3a4d60549e8c64dce8e2
--- /dev/null
+++ b/src/vtt/handoff/websocket-transport.ts
@@ -0,0 +1,235 @@
+import { handoffEventSchema, handoffResponseSchema, type SceneSnapshot } from './v1/contracts';
+import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
+import {
+  SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus,
+} from './scene-transport';
+
+interface PendingRequest {
+  readonly method: string | null;
+  readonly resolve: (response: HandoffResponse) => void;
+  readonly reject: (error: Error) => void;
+}
+
+export interface WebSocketWireCodec {
+  readonly parse: (text: string) => unknown;
+  readonly stringify: (value: unknown) => string;
+}
+
+function property(input: unknown, key: string): unknown {
+  if (typeof input !== 'object' || input === null) return undefined;
+  try { return Reflect.get(input, key); } catch { return undefined; }
+}
+
+export class WebSocketSceneTransport implements SceneTransport {
+  readonly #socket: WebSocket;
+  readonly #pending = new Map<string, PendingRequest>();
+  readonly #events = new Set<(event: SceneSnapshotEvent) => void>();
+  readonly #statuses = new Set<(status: SceneTransportStatus) => void>();
+  readonly #errors = new Set<(error: SceneTransportFaultError) => void>();
+  readonly #waitingForOpen = new Set<() => void>();
+  #state: SceneTransportStatus = 'connecting';
+  #initial: Promise<SceneSnapshot>;
+  #resolveInitial: ((snapshot: SceneSnapshot) => void) | null = null;
+  #rejectInitial: ((error: Error) => void) | null = null;
+  #latestEvent: SceneSnapshotEvent | null = null;
+  #uncorrelatedSequence = 0;
+  readonly #wireCodec: WebSocketWireCodec;
+
+  constructor(url: string | URL, token: string, wireCodec?: WebSocketWireCodec) {
+    this.#initial = new Promise((resolve, reject) => {
+      this.#resolveInitial = resolve;
+      this.#rejectInitial = reject;
+    });
+    void this.#initial.catch(() => undefined);
+    this.#wireCodec = wireCodec ?? {
+      parse: (text: string): unknown => JSON.parse(text) as unknown,
+      stringify: (value: unknown): string => JSON.stringify(value),
+    };
+    this.#socket = new WebSocket(url, ['vtt.v1', `bearer.${token}`]);
+    this.#socket.addEventListener('message', this.#onMessage);
+    this.#socket.addEventListener('close', this.#onClose);
+    this.#socket.addEventListener('error', this.#onError);
+  }
+
+  request(request: unknown): Promise<HandoffResponse> {
+    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
+    const idValue = property(request, 'id');
+    const methodValue = property(request, 'method');
+    const id = typeof idValue === 'string' ? idValue : null;
+    if (id !== null && this.#pending.has(id)) {
+      return Promise.reject(this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002));
+    }
+    let wire: string;
+    try { wire = this.#wireCodec.stringify(request); }
+    catch { return Promise.reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002)); }
+    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
+    return new Promise<HandoffResponse>((resolve, reject) => {
+      this.#uncorrelatedSequence += 1;
+      const pendingKey = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
+      this.#pending.set(pendingKey, {
+        method: typeof methodValue === 'string' ? methodValue : null, resolve, reject,
+      });
+      const send = (): void => {
+        this.#waitingForOpen.delete(send);
+        if (this.#terminal() || this.#socket.readyState !== WebSocket.OPEN) {
+          this.#pending.delete(pendingKey);
+          reject(new SceneTransportClosedError());
+          return;
+        }
+        try {
+          if (this.#terminal() || this.#socket.readyState !== WebSocket.OPEN) throw new SceneTransportClosedError();
+          this.#socket.send(wire);
+        } catch (error: unknown) {
+          this.#pending.delete(pendingKey);
+          reject(error instanceof Error ? error : new SceneTransportClosedError());
+        }
+      };
+      if (this.#socket.readyState === WebSocket.OPEN) send();
+      else if (this.#socket.readyState === WebSocket.CONNECTING) {
+        this.#waitingForOpen.add(send);
+        this.#socket.addEventListener('open', send, { once: true });
+      } else {
+        this.#pending.delete(pendingKey);
+        reject(new SceneTransportClosedError());
+      }
+    });
+  }
+
+  initialSnapshot(): Promise<SceneSnapshot> {
+    return this.#terminal() ? Promise.reject(new SceneTransportClosedError()) : this.#initial;
+  }
+  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void {
+    if (this.#terminal()) return () => undefined;
+    this.#events.add(listener);
+    if (this.#latestEvent !== null) {
+      try { listener(this.#latestEvent); } catch { /* Observer failures are isolated. */ }
+    }
+    return () => this.#events.delete(listener);
+  }
+  status(): SceneTransportStatus { return this.#state; }
+  subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void {
+    try { listener(this.#state); } catch { /* Observer failures are isolated. */ }
+    if (this.#terminal()) return () => undefined;
+    this.#statuses.add(listener);
+    return () => this.#statuses.delete(listener);
+  }
+  subscribeErrors(listener: (error: SceneTransportFaultError) => void): () => void {
+    if (this.#terminal()) return () => undefined;
+    this.#errors.add(listener);
+    return () => this.#errors.delete(listener);
+  }
+  close(): void { this.#shutdown('closed'); }
+  dispose(): void { this.#shutdown('disposed'); }
+  destroySession(): void { this.#shutdown('disposed'); }
+  pendingRequestCount(): number { return this.#pending.size; }
+
+  readonly #onMessage = (message: MessageEvent<unknown>): void => {
+    if (typeof message.data !== 'string') { this.#protocolFault('The socket emitted a non-text message.'); return; }
+    let value: unknown;
+    try { value = this.#wireCodec.parse(message.data); }
+    catch { this.#protocolFault('The socket emitted invalid JSON.'); return; }
+    const event = handoffEventSchema.safeParse(value);
+    if (event.success) {
+      const snapshotEvent = event.data as SceneSnapshotEvent;
+      this.#latestEvent = snapshotEvent;
+      if (this.#resolveInitial !== null) {
+        this.#resolveInitial(snapshotEvent.data);
+        this.#resolveInitial = null;
+        this.#rejectInitial = null;
+      }
+      for (const listener of this.#events) {
+        try { listener(snapshotEvent); } catch { /* Observer failures are isolated. */ }
+      }
+      return;
+    }
+    const response = handoffResponseSchema.safeParse(value);
+    if (!response.success) { this.#protocolFault('The socket emitted an invalid protocol message.'); return; }
+    const pending = this.#pending.get(response.data.id);
+    if (pending === undefined) { this.#protocolFault('The socket emitted an uncorrelated response.'); return; }
+    this.#pending.delete(response.data.id);
+    if (pending.method === 'session.open' && response.data.ok) this.#setState('open');
+    pending.resolve(response.data as HandoffResponse);
+  };
+
+  readonly #onClose = (event: CloseEvent): void => {
+    if (event.code === 1007 || event.code === 1002) {
+      const error = this.#fault(
+        event.code === 1007 && /UTF-8/u.test(event.reason) ? 'INVALID_UTF8'
+          : event.code === 1007 ? 'INVALID_JSON' : 'PROTOCOL_ERROR',
+        event.reason.length > 0 ? event.reason : 'The WebSocket protocol closed with a transport fault.',
+        event.code,
+      );
+      for (const listener of this.#errors) {
+        try { listener(error); } catch { /* Observer failures are isolated. */ }
+      }
+      this.#terminalCleanup('closed', error);
+      return;
+    }
+    this.#terminalCleanup('closed');
+  };
+  readonly #onError = (): void => {
+    const error = this.#fault('PROTOCOL_ERROR', 'The WebSocket transport failed.', 1002);
+    for (const listener of this.#errors) {
+      try { listener(error); } catch { /* Observer failures are isolated. */ }
+    }
+    this.#shutdown('closed', 1002, error.message, error);
+  };
+
+  #fault(code: ProtocolTransportFault['code'], message: string, websocketCloseCode: 1002 | 1007): SceneTransportFaultError {
+    return new SceneTransportFaultError({ kind: 'transport_fault', code, message, websocketCloseCode });
+  }
+  #protocolFault(message: string): void {
+    const error = this.#fault('PROTOCOL_ERROR', message, 1002);
+    for (const listener of this.#errors) {
+      try { listener(error); } catch { /* Observer failures are isolated. */ }
+    }
+    this.#shutdown('closed', 1002, message, error);
+  }
+  #terminal(): boolean { return this.#state === 'closed' || this.#state === 'disposed'; }
+  #setState(state: SceneTransportStatus): void {
+    if (this.#state === state) return;
+    this.#state = state;
+    for (const listener of this.#statuses) {
+      try { listener(state); } catch { /* Observer failures are isolated. */ }
+    }
+  }
+  #shutdown(
+    state: 'closed' | 'disposed',
+    code = 1000,
+    reason = 'Client closed.',
+    error: Error = new SceneTransportClosedError(),
+  ): void {
+    if (this.#terminal()) return;
+    try {
+      this.#socket.removeEventListener('message', this.#onMessage);
+      this.#socket.removeEventListener('close', this.#onClose);
+      this.#socket.removeEventListener('error', this.#onError);
+      if (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING) this.#socket.close(code, reason);
+    } finally { this.#terminalCleanup(state, error); }
+  }
+  #terminalCleanup(state: 'closed' | 'disposed', error: Error = new SceneTransportClosedError()): void {
+    if (this.#terminal()) return;
+    this.#socket.removeEventListener('message', this.#onMessage);
+    this.#socket.removeEventListener('close', this.#onClose);
+    this.#socket.removeEventListener('error', this.#onError);
+    for (const listener of this.#waitingForOpen) this.#socket.removeEventListener('open', listener);
+    this.#waitingForOpen.clear();
+    this.#setState(state);
+    if (this.#rejectInitial !== null) this.#rejectInitial(error);
+    this.#resolveInitial = null;
+    this.#rejectInitial = null;
+    for (const pending of this.#pending.values()) pending.reject(error);
+    this.#pending.clear();
+    this.#events.clear();
+    this.#errors.clear();
+    this.#statuses.clear();
+  }
+}
+
+export function createWebSocketSceneTransport(
+  url: string | URL,
+  token: string,
+  wireCodec?: WebSocketWireCodec,
+): WebSocketSceneTransport {
+  return new WebSocketSceneTransport(url, token, wireCodec);
+}
diff --git a/tests/browser/vtt-handoff/playwright.config.ts b/tests/browser/vtt-handoff/playwright.config.ts
index fc8a03e8a04fc655d4dcfa1cc23fbe77556ad2e0..607f967214feefb8a2c8a05769b356f52d3a7070
--- a/tests/browser/vtt-handoff/playwright.config.ts
+++ b/tests/browser/vtt-handoff/playwright.config.ts
@@ -11,6 +11,7 @@
 if (!Number.isSafeInteger(port) || port < 1 || port > 65_535 || port === 4_173) {
   throw new Error(`PLAYWRIGHT_PORT must be a valid non-4173 port; received "${rawPort}".`);
 }
+export const vttHandoffBrowserOrigin = `http://127.0.0.1:${String(port)}`;
 if (process.env.PLAYWRIGHT_WORKERS !== undefined && process.env.PLAYWRIGHT_WORKERS !== '1') {
   throw new Error('The VTT handoff Worker spec requires PLAYWRIGHT_WORKERS=1.');
 }
@@ -26,7 +27,7 @@
   fullyParallel: false,
   workers: 1,
   use: {
-    baseURL: `http://127.0.0.1:${rawPort}`,
+    baseURL: vttHandoffBrowserOrigin,
     headless: true,
     trace: 'on-first-retry',
   },
diff --git a/tests/browser/vtt-handoff/runtime-parity.spec.ts b/tests/browser/vtt-handoff/runtime-parity.spec.ts
new file mode 100644
index 0000000000000000000000000000000000000000..c8cb05fdad8b0eb5ea2123c046ad9750ceb27da3
--- /dev/null
+++ b/tests/browser/vtt-handoff/runtime-parity.spec.ts
@@ -0,0 +1,190 @@
+import { expect, test } from '@playwright/test';
+import { spawn } from 'node:child_process';
+import { createHash } from 'node:crypto';
+import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+import type {} from '../../../src/vtt/handoff/worker-harness';
+import { vttHandoffBrowserOrigin } from './playwright.config';
+
+test('pairs the real Worker and ephemeral Node WebSocket on the fixed two-room scene', async ({ page }, testInfo) => {
+  mkdirSync(resolve('.tmp'), { recursive: true });
+  const root = mkdtempSync(resolve('.tmp/vtt-browser-runtime-parity-'));
+  const token = 'browser-runtime-parity-secret';
+  const tokensFile = resolve(root, 'tokens.json');
+  writeFileSync(tokensFile, JSON.stringify([{
+    tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
+  }]), { mode: 0o600 });
+  chmodSync(tokensFile, 0o600);
+  const viteConfig = resolve('/tmp', `vtt-runtime-playwright-${String(process.pid)}.config.mjs`);
+  writeFileSync(viteConfig, 'export default {};\n', { mode: 0o600 });
+  const runtime = spawn(process.execPath, [
+    resolve('node_modules/vite-node/vite-node.mjs'),
+    '--config', viteConfig, 'tools/vtt-handoff/node-runtime-main.ts', '--port', '0', '--origin', vttHandoffBrowserOrigin,
+  ], {
+    cwd: process.cwd(), env: { ...process.env, VTT_RUNTIME_TOKENS_FILE: tokensFile }, stdio: ['ignore', 'pipe', 'pipe'],
+  });
+  let runtimeOutput = '';
+  let runtimeErrors = '';
+  runtime.stdout.on('data', (chunk: Buffer) => { runtimeOutput += chunk.toString(); });
+  runtime.stderr.on('data', (chunk: Buffer) => { runtimeErrors += chunk.toString(); });
+  const websocketUrl = await new Promise<string>((resolveUrl, reject) => {
+    const inspect = (): void => {
+      const match = /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(runtimeOutput);
+      if (match?.[1] !== undefined) resolveUrl(match[1]);
+    };
+    runtime.stdout.on('data', inspect);
+    runtime.once('exit', (code) => reject(new Error(`Runtime exited ${String(code)}: ${runtimeErrors}`)));
+    runtime.once('error', reject);
+  });
+  const nodePort = Number(new URL(websocketUrl).port);
+  try {
+    await page.goto('/vtt-handoff');
+    await expect(page.getByTestId('handoff-state')).toHaveAttribute('data-status', 'open');
+    const worker = await page.evaluate(() => {
+      const api = window.__VTT_HANDOFF_HARNESS__;
+      if (api === undefined) throw new Error('The Worker harness is unavailable.');
+      return api.state();
+    });
+    expect(worker.artifact).toEqual({ artifact: 'dev' });
+    expect(worker.snapshot?.tokens.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual([
+      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+    ]);
+    const workerDoor = await page.evaluate(async () => {
+      const api = window.__VTT_HANDOFF_HARNESS__;
+      if (api === undefined) throw new Error('The Worker harness is unavailable.');
+      const response = await api.request({
+        v: 1, id: 'parity:worker-door', method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: true },
+      });
+      return { response, state: api.state() };
+    });
+    expect(workerDoor.response).toMatchObject({ id: 'parity:worker-door', ok: true });
+    expect(workerDoor.state.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
+    expect(workerDoor.state.eventSequences).toEqual(
+      workerDoor.state.eventSequences.map((_sequence, index) => index + 1),
+    );
+
+    const badHandshake = await page.evaluate(async ({ url }) => new Promise<number>((resolveClose) => {
+      const socket = new WebSocket(url, ['vtt.v1', 'bearer.invalid']);
+      socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
+      socket.addEventListener('error', () => undefined, { once: true });
+    }), { url: websocketUrl });
+    expect(badHandshake).toBe(1006);
+
+    const websocket = await page.evaluate(async ({ url, bearer }) => new Promise<{
+      readonly protocol: string;
+      readonly url: string;
+      readonly open: unknown;
+      readonly initial: unknown;
+      readonly correlated: readonly unknown[];
+      readonly unsupported: unknown;
+      readonly door: unknown;
+      readonly doorEvent: unknown;
+      readonly duplicate: unknown;
+      readonly closeCode: number;
+    }>((resolveResult, reject) => {
+      const socket = new WebSocket(url, ['vtt.v1', `bearer.${bearer}`]);
+      const messages: unknown[] = [];
+      const waitFor = (predicate: (value: unknown) => boolean): Promise<unknown> => new Promise((resolveMessage) => {
+        const existing = messages.find(predicate);
+        if (existing !== undefined) { resolveMessage(existing); return; }
+        const listener = (event: MessageEvent<string>): void => {
+          const value = JSON.parse(event.data) as unknown;
+          messages.push(value);
+          if (!predicate(value)) return;
+          socket.removeEventListener('message', listener);
+          resolveMessage(value);
+        };
+        socket.addEventListener('message', listener);
+      });
+      socket.addEventListener('error', () => reject(new Error('WebSocket parity connection failed.')), { once: true });
+      socket.addEventListener('open', () => {
+        void (async () => {
+          const openPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === '');
+          const initialPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'event') === 'scene.snapshot');
+          socket.send(JSON.stringify({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }));
+          const open = await openPromise;
+          const initial = await initialPromise;
+          const correlated = await Promise.all(['a', 'b'].map(async (suffix) => {
+            const id = `snapshot:${suffix}`;
+            const response = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === id);
+            socket.send(JSON.stringify({ v: 1, id, method: 'scene.snapshot', params: {} }));
+            return response;
+          }));
+          const unsupportedPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'light');
+          socket.send(JSON.stringify({ v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false } }));
+          const unsupported = await unsupportedPromise;
+          const doorPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'door');
+          const doorEventPromise = waitFor((value) => {
+            if (typeof value !== 'object' || value === null || Reflect.get(value, 'event') !== 'scene.snapshot') return false;
+            const data = Reflect.get(value, 'data');
+            if (typeof data !== 'object' || data === null) return false;
+            const doors = Reflect.get(data, 'doors');
+            return Array.isArray(doors) && doors.some((doorValue) =>
+              typeof doorValue === 'object' && doorValue !== null && Reflect.get(doorValue, 'open') === true);
+          });
+          socket.send(JSON.stringify({ v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true } }));
+          const door = await doorPromise;
+          const doorEvent = await doorEventPromise;
+          const duplicatePromise = waitFor((value) => {
+            if (typeof value !== 'object' || value === null || Reflect.get(value, 'id') !== 'door') return false;
+            const error = Reflect.get(value, 'error');
+            return typeof error === 'object' && error !== null;
+          });
+          socket.send(JSON.stringify({ v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false } }));
+          const duplicate = await duplicatePromise;
+          const closeCode = await new Promise<number>((resolveClose) => {
+            socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
+            socket.close(1000, 'parity complete');
+          });
+          resolveResult({ protocol: socket.protocol, url: socket.url, open, initial, correlated, unsupported, door, doorEvent, duplicate, closeCode });
+        })().catch(reject);
+      }, { once: true });
+    }), { url: websocketUrl, bearer: token });
+
+    expect(websocket.protocol).toBe('vtt.v1');
+    expect(websocket.url).not.toContain(token);
+    expect(websocket.open).toMatchObject({ v: 1, id: '', ok: true });
+    expect(websocket.initial).toMatchObject({
+      v: 1, event: 'scene.snapshot', seq: 1,
+      data: {
+        revision: 0,
+        tokens: [
+          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+        ],
+      },
+    });
+    expect(websocket.correlated.map((value) => typeof value === 'object' && value !== null ? Reflect.get(value, 'id') : null))
+      .toEqual(['snapshot:a', 'snapshot:b']);
+    expect(websocket.unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
+    expect(websocket.door).toMatchObject({ id: 'door', ok: true });
+    expect(websocket.doorEvent).toMatchObject({ event: 'scene.snapshot', data: { doors: expect.arrayContaining([
+      expect.objectContaining({ id: 'object:two-room-door', open: true }),
+    ]) } });
+    if (
+      typeof websocket.door !== 'object' || websocket.door === null ||
+      typeof websocket.doorEvent !== 'object' || websocket.doorEvent === null
+    ) throw new Error('WebSocket door evidence is unavailable.');
+    const doorResult = Reflect.get(websocket.door, 'result');
+    const doorData = Reflect.get(websocket.doorEvent, 'data');
+    expect(typeof doorResult === 'object' && doorResult !== null ? Reflect.get(doorResult, 'revision') : null)
+      .toBe(typeof doorData === 'object' && doorData !== null ? Reflect.get(doorData, 'revision') : null);
+    expect(websocket.duplicate).toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
+    expect(websocket.closeCode).toBe(1000);
+    await testInfo.attach('vtt-runtime-parity', {
+      body: JSON.stringify({ artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z', nodePort, browserOrigin: vttHandoffBrowserOrigin }),
+      contentType: 'application/json',
+    });
+    expect(`${runtimeOutput}\n${runtimeErrors}`).not.toContain(token);
+  } finally {
+    if (runtime.exitCode === null && runtime.signalCode === null) {
+      const exited = new Promise<void>((resolveExit) => runtime.once('exit', () => resolveExit()));
+      runtime.kill('SIGTERM');
+      await exited;
+    }
+    rmSync(viteConfig, { force: true });
+    rmSync(root, { recursive: true, force: true });
+  }
+});
diff --git a/tests/helpers/test-filesystem.ts b/tests/helpers/test-filesystem.ts
index a1287a05cd77bcaf13132a41b80d085dde0822cb..95f33c5ec67943b453405216cccbfd224cd8108a
--- a/tests/helpers/test-filesystem.ts
+++ b/tests/helpers/test-filesystem.ts
@@ -3,6 +3,7 @@
  * ephemeral outputs. Stable repository inputs belong in test-inputs.ts.
  */
 export {
+  chmodSync,
   existsSync,
   mkdirSync,
   mkdtempSync,
diff --git a/tests/helpers/vtt-handoff/transport-conformance.ts b/tests/helpers/vtt-handoff/transport-conformance.ts
new file mode 100644
index 0000000000000000000000000000000000000000..2bee230220eeb692ee427898ea2551c78cf78b74
--- /dev/null
+++ b/tests/helpers/vtt-handoff/transport-conformance.ts
@@ -0,0 +1,139 @@
+import { expect } from 'vitest';
+import type { HandoffResponse, SceneSnapshotEvent } from '../../../src/vtt/handoff/protocol-runtime';
+import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport } from '../../../src/vtt/handoff/scene-transport';
+import { TWO_ROOM_CLOCK, TWO_ROOM_SEED } from '../../../src/vtt/handoff/fixtures/two-room';
+import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
+import { ProtocolRuntime } from '../../../src/vtt/handoff/protocol-runtime';
+import { createDefaultNodeRuntimeSession } from '../../../tools/vtt-handoff/node-runtime';
+
+export const TRANSPORT_CONFORMANCE_SCENARIOS = [
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
+export interface ConformanceResult {
+  readonly seed: number;
+  readonly clock: string;
+  readonly outcomes: Readonly<Record<string, string>>;
+  readonly canonical: readonly HandoffResponse[];
+}
+
+export function createInProcessConformanceTransport(): {
+  readonly transport: InProcessSceneTransport;
+  readonly start: () => Promise<void>;
+} {
+  const session = createDefaultNodeRuntimeSession({ role: 'dm' });
+  return {
+    transport: new InProcessSceneTransport(new ProtocolRuntime({
+      service: session.service,
+      principal: { role: 'dm' },
+      seats: session.seats,
+      art: session.art,
+    })),
+    start: session.start ?? (() => Promise.resolve()),
+  };
+}
+
+export async function runDmTransportConformance(transport: SceneTransport): Promise<ConformanceResult> {
+  const events: SceneSnapshotEvent[] = [];
+  const unsubscribe = transport.subscribe((event) => events.push(event));
+  const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
+  expect(open).toMatchObject({ v: 1, id: '', ok: true });
+  const initial = await transport.initialSnapshot();
+  expect(initial.revision).toBe(0);
+  expect(initial.tokens.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual([
+    { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
+    { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
+  ]);
+  expect(events[0]).toMatchObject({ seq: 1, data: { revision: 0 } });
+  if (!events.some((event) => event.data.revision > 0)) {
+    await new Promise<void>((resolve, reject) => {
+      const timeout = setTimeout(() => { stop(); reject(new Error('Timed out waiting for the fixed autonomous offer.')); }, 2_000);
+      const stop = transport.subscribe((event) => {
+        if (event.data.revision === 0) return;
+        clearTimeout(timeout);
+        stop();
+        resolve();
+      });
+    });
+  }
+  let readyRevision = -1;
+  for (let attempt = 0; attempt < 10 && readyRevision < 2; attempt += 1) {
+    const ready = await transport.request({
+      v: 1, id: `readiness:${String(attempt)}`, method: 'scene.snapshot', params: {},
+    });
+    readyRevision = ready.ok && typeof ready.result.revision === 'number' ? ready.result.revision : -1;
+  }
+  expect(readyRevision).toBe(2);
+
+  const correlated = await Promise.all([
+    transport.request({ v: 1, id: 'snapshot:a', method: 'scene.snapshot', params: {} }),
+    transport.request({ v: 1, id: 'snapshot:b', method: 'scene.snapshot', params: {} }),
+  ]);
+  expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
+  expect(correlated.every((response) => response.ok)).toBe(true);
+  const invalid = await transport.request({ v: 1, id: 'invalid', method: 'door.set', params: { doorId: 42, open: true } });
+  expect(invalid).toMatchObject({ id: 'invalid', ok: false, error: { code: 'INVALID_REQUEST' } });
+  const unsupported = await transport.request({
+    v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
+  });
+  expect(unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
+
+  const beforeDoorEvents = events.length;
+  const door = await transport.request({
+    v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
+  });
+  expect(door).toMatchObject({ id: 'door', ok: true });
+  if (!door.ok || typeof door.result.revision !== 'number') throw new Error('Expected an acknowledged door revision.');
+  const committedRevision = door.result.revision;
+  expect(events.some((event) => event.data.revision === committedRevision)).toBe(true);
+  expect(events.map((event) => event.seq)).toEqual(events.map((_event, index) => index + 1));
+  expect(events.at(-1)?.data.doors.find((candidate) => candidate.id === 'object:two-room-door')?.open).toBe(true);
+
+  const lateInitial = await transport.initialSnapshot();
+  expect(lateInitial.tokens.map((token) => token.id)).toEqual(initial.tokens.map((token) => token.id));
+  const sameState = await transport.request({
+    v: 1, id: 'door:no-op', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
+  });
+  expect(sameState).toMatchObject({ id: 'door:no-op', ok: true, result: { revision: committedRevision } });
+  expect(events.length).toBe(beforeDoorEvents + 1);
+
+  const duplicate = await transport.request({
+    v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
+  });
+  expect(duplicate).toMatchObject({ id: 'door', ok: false });
+  if (duplicate.ok) throw new Error('A duplicate wire mutation id was accepted.');
+  expect(['DUPLICATE_MUTATION', 'DUPLICATE_REQUEST_ID']).toContain(duplicate.error.code);
+  expect(events.length).toBe(beforeDoorEvents + 1);
+
+  unsubscribe();
+  const malformed = transport.request('{');
+  await expect(malformed).rejects.toSatisfy((error: unknown) =>
+    error instanceof SceneTransportFaultError || error instanceof SceneTransportClosedError);
+  transport.dispose();
+  expect(['closed', 'disposed']).toContain(transport.status());
+  return {
+    seed: TWO_ROOM_SEED,
+    clock: TWO_ROOM_CLOCK,
+    outcomes: {
+      open: 'ok', correlation: 'ok', structuralValidation: 'INVALID_REQUEST',
+      doorChange: 'committed', doorNoOp: 'committed', light: 'UNSUPPORTED',
+      duplicate: duplicate.error.code, malformed: 'typed-fault', cleanup: 'terminal',
+    },
+    canonical: [open, ...correlated, invalid, unsupported, door, sameState],
+  };
+}
diff --git a/tests/integration-supervisor/vitest.config.ts b/tests/integration-supervisor/vitest.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..08929974572035918f275e6cc9e33c57acb255a5
--- /dev/null
+++ b/tests/integration-supervisor/vitest.config.ts
@@ -0,0 +1,15 @@
+import { defineConfig } from 'vitest/config';
+import { dirname, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
+
+export default defineConfig({
+  root: repositoryRoot,
+  test: {
+    environment: 'node',
+    include: ['tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts'],
+    isolate: true,
+    maxWorkers: 1,
+  },
+});
diff --git a/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts b/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..756ee82a54031f958823707b26535e2ace4c2bc7
--- /dev/null
+++ b/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts
@@ -0,0 +1,83 @@
+import { spawn, execFileSync } from 'node:child_process';
+import { createHash } from 'node:crypto';
+import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+import { expect, test } from 'vitest';
+import { WebSocket } from 'ws';
+
+test('launches the opt-in runtime beside a fresh stamped dist and cleans up its child', async () => {
+  mkdirSync(resolve('.tmp'), { recursive: true });
+  const root = mkdtempSync(resolve('.tmp/vtt-runtime-launch-'));
+  const token = 'supervisor-launch-secret';
+  const tokensFile = resolve(root, 'tokens.json');
+  writeFileSync(tokensFile, JSON.stringify([{
+    tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
+  }]), { mode: 0o600 });
+  chmodSync(tokensFile, 0o600);
+  const serve = spawn('npm', ['run', 'serve', '--', '--vtt-runtime', '--port', '0'], {
+    cwd: process.cwd(),
+    env: { ...process.env, VTT_RUNTIME_TOKENS_FILE: tokensFile, VTT_RUNTIME_PORT: '0' },
+    stdio: ['ignore', 'pipe', 'pipe'],
+  });
+  let output = '';
+  let errors = '';
+  serve.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
+  serve.stderr.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
+  try {
+    const addresses = await new Promise<{ readonly staticOrigin: string; readonly websocketUrl: string }>((resolveAddresses, reject) => {
+      const inspect = (): void => {
+        const staticMatch = /serve: fresh dist\/ available at (http:\/\/127\.0\.0\.1:\d+)/u.exec(output);
+        const runtimeMatch = /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(output);
+        if (staticMatch?.[1] !== undefined && runtimeMatch?.[1] !== undefined) {
+          resolveAddresses({ staticOrigin: staticMatch[1], websocketUrl: runtimeMatch[1] });
+        }
+      };
+      serve.stdout.on('data', inspect);
+      serve.once('exit', (code) => reject(new Error(`serve exited ${String(code)}: ${errors}`)));
+      serve.once('error', reject);
+    });
+    const stampResponse = await fetch(`${addresses.staticOrigin}/vtt-handoff-artifact.json`, { cache: 'no-store' });
+    expect(stampResponse.ok).toBe(true);
+    const stamp = await stampResponse.json() as unknown;
+    expect(stamp).toMatchObject({
+      artifact: 'dist',
+      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
+      worker: { url: expect.stringMatching(/\.js$/u), sha256: expect.stringMatching(/^[0-9a-f]{64}$/u) },
+    });
+    const badHandshake = new WebSocket(addresses.websocketUrl, ['vtt.v1', 'bearer.invalid'], { origin: addresses.staticOrigin });
+    await expect(new Promise<number>((resolveStatus, reject) => {
+      badHandshake.once('unexpected-response', (_request, response) => resolveStatus(response.statusCode ?? 0));
+      badHandshake.once('open', () => reject(new Error('Invalid launch token unexpectedly opened.')));
+      badHandshake.once('error', () => undefined);
+    })).resolves.toBe(401);
+    const socket = await new Promise<WebSocket>((resolveSocket, reject) => {
+      const candidate = new WebSocket(addresses.websocketUrl, ['vtt.v1', `bearer.${token}`], { origin: addresses.staticOrigin });
+      candidate.once('open', () => resolveSocket(candidate));
+      candidate.once('error', reject);
+    });
+    const messages = new Promise<readonly unknown[]>((resolveMessages, reject) => {
+      const received: unknown[] = [];
+      socket.on('message', (data, isBinary) => {
+        try {
+          if (isBinary) throw new Error('Launch probe received binary data.');
+          received.push(JSON.parse(data.toString()) as unknown);
+          if (received.length === 2) resolveMessages(received);
+        } catch (error: unknown) { reject(error); }
+      });
+    });
+    socket.send(JSON.stringify({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }));
+    const [opened, snapshot] = await messages;
+    expect(opened).toMatchObject({ v: 1, id: '', ok: true });
+    expect(snapshot).toMatchObject({ v: 1, event: 'scene.snapshot', seq: 1, data: { revision: 0 } });
+    expect(`${output}\n${errors}`).not.toContain(token);
+    socket.close();
+
+    const exited = new Promise<void>((resolveExit) => serve.once('exit', () => resolveExit()));
+    serve.kill('SIGTERM');
+    await exited;
+    await expect(fetch(addresses.websocketUrl.replace(/^ws:/u, 'http:'))).rejects.toThrow();
+  } finally {
+    if (serve.exitCode === null && serve.signalCode === null) serve.kill('SIGKILL');
+    rmSync(root, { recursive: true, force: true });
+  }
+});
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index a0b09a33e9ce37b9fec93ea5b0e7122d3a92451f..538e6e2ae6d566860d5097ee366af438777cd3aa
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -234,6 +234,59 @@
   return calls.sort();
 }
 
+function runtimeConvergenceEvidence(graph: ReadonlyMap<string, SourceModule>): {
+  readonly constructedClasses: ReadonlySet<string>;
+  readonly reducerCalls: readonly string[];
+} {
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
+  const definitions = new Set<string>();
+  const reducerCalls: string[] = [];
+  for (const module of graph.values()) {
+    const sourceFile = program.getSourceFile(module.file);
+    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
+    const visit = (node: ts.Node): void => {
+      if (ts.isNewExpression(node)) {
+        let symbol = checker.getSymbolAtLocation(node.expression);
+        const visited = new Set<ts.Symbol>();
+        while (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0 && !visited.has(symbol)) {
+          visited.add(symbol);
+          symbol = checker.getAliasedSymbol(symbol);
+        }
+        const declaration = symbol?.getDeclarations()?.find((candidate) => {
+          const file = candidate.getSourceFile().fileName;
+          return file.startsWith(`${ROOT}/`) && !file.includes('/node_modules/');
+        });
+        if (symbol !== undefined && declaration !== undefined) {
+          definitions.add(`${symbol.getName()}@${repositoryPath(declaration.getSourceFile().fileName)}`);
+        }
+      }
+      if (ts.isCallExpression(node) && !insideImport(node)) {
+        const definition = definingReducer(checker, node.expression);
+        if (definition !== null) {
+          reducerCalls.push(
+            `${repositoryPath(module.file)}#${enclosingOperation(node, sourceFile)} -> ` +
+            `${repositoryPath(definition.file)}#${definition.symbol}`,
+          );
+        }
+      }
+      ts.forEachChild(node, visit);
+    };
+    ts.forEachChild(sourceFile, visit);
+  }
+  return { constructedClasses: definitions, reducerCalls: reducerCalls.sort() };
+}
+
 function selectorAuthorityViolations(file: string): readonly string[] {
   const sourceFile = ts.createSourceFile(
     file,
@@ -346,6 +399,32 @@
     ]);
   });
 
+  it('all renderer adapters converge on the session service', () => {
+    const graph = dependencyGraph([
+      'tests/helpers/vtt-handoff/transport-conformance.ts',
+      'src/vtt/handoff/worker-entry.ts',
+      'src/vtt/handoff/worker-transport.ts',
+      'tools/vtt-handoff/node-runtime.ts',
+      'src/vtt/handoff/websocket-transport.ts',
+    ]);
+    const evidence = runtimeConvergenceEvidence(graph);
+    expect([...evidence.constructedClasses]).toEqual(expect.arrayContaining([
+      'EncounterSessionService@src/vtt/encounter-session-service.ts',
+      'ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts',
+      'InProcessSceneTransport@src/vtt/handoff/in-process-transport.ts',
+      'WorkerSceneTransport@src/vtt/handoff/worker-transport.ts',
+      'WebSocketSceneTransport@src/vtt/handoff/websocket-transport.ts',
+    ]));
+    expect(evidence.reducerCalls).toContain(
+      'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
+    );
+    expect(platformViolations(dependencyGraph([
+      'src/vtt/handoff/websocket-transport.ts',
+      'src/vtt/handoff/worker-transport.ts',
+    ]))).toEqual([]);
+    expect([...graph.keys()].map(repositoryPath)).not.toContain('src/vtt/encounter-app.ts');
+  });
+
   it('keeps the complete selector value graph projection-only and platform-neutral', () => {
     const graph = dependencyGraph(['src/vtt/encounter-selectors.ts']);
     const files = [...graph.keys()].map(repositoryPath);
diff --git a/tests/unit/vtt/node-runtime.test.ts b/tests/unit/vtt/node-runtime.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ad9420d12a92489a8c247e821f9198086831e0c2
--- /dev/null
+++ b/tests/unit/vtt/node-runtime.test.ts
@@ -0,0 +1,254 @@
+import { createHash } from 'node:crypto';
+import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from '../../helpers/test-filesystem';
+import { resolve } from 'node:path';
+import { afterEach, describe, expect, it } from 'vitest';
+import { WebSocket, type RawData } from 'ws';
+import {
+  createVttNodeRuntime, VTT_RUNTIME_MAX_PAYLOAD, VTT_RUNTIME_OPEN_DEADLINE_MS,
+  type VttNodeRuntime,
+} from '../../../tools/vtt-handoff/node-runtime';
+
+const ORIGIN = 'http://127.0.0.1:4430';
+const PLAYER_A = 'combatant:two-room-adventurer';
+const PLAYER_B = 'combatant:two-room-goblin';
+const roots: string[] = [];
+const runtimes: VttNodeRuntime[] = [];
+
+function temporaryRoot(): string {
+  mkdirSync(resolve('.tmp'), { recursive: true });
+  const root = mkdtempSync(resolve('.tmp/vtt-runtime-test-'));
+  roots.push(root);
+  return root;
+}
+
+function hash(token: string): string {
+  return createHash('sha256').update(token).digest('hex');
+}
+
+function claimsFile(claims: readonly Readonly<Record<string, unknown>>[]): string {
+  const path = resolve(temporaryRoot(), 'tokens.json');
+  writeFileSync(path, `${JSON.stringify(claims)}\n`, { mode: 0o600 });
+  chmodSync(path, 0o600);
+  return path;
+}
+
+async function runtime(claims: readonly Readonly<Record<string, unknown>>[], options: {
+  readonly allowOriginless?: boolean;
+  readonly openDeadlineMs?: number;
+} = {}): Promise<{ readonly runtime: VttNodeRuntime; readonly url: string }> {
+  const instance = createVttNodeRuntime({
+    tokensFile: claimsFile(claims),
+    allowedOrigins: new Set([ORIGIN]),
+    ...options,
+  });
+  runtimes.push(instance);
+  const address = await instance.listen(0);
+  return { runtime: instance, url: address.websocketUrl };
+}
+
+function connect(url: string, token: string, origin: string | undefined = ORIGIN): Promise<WebSocket> {
+  return new Promise((resolveSocket, reject) => {
+    const socket = new WebSocket(url, ['vtt.v1', `bearer.${token}`], origin === undefined ? {} : { origin });
+    socket.once('open', () => resolveSocket(socket));
+    socket.once('error', reject);
+  });
+}
+
+function nextMessages(socket: WebSocket, count: number): Promise<readonly unknown[]> {
+  return new Promise((resolveMessage, reject) => {
+    const messages: unknown[] = [];
+    const receive = (data: RawData, isBinary: boolean): void => {
+      try {
+        if (isBinary) throw new Error('Expected text.');
+        messages.push(JSON.parse(data.toString()) as unknown);
+        if (messages.length === count) {
+          socket.off('message', receive);
+          resolveMessage(messages);
+        }
+      } catch (error: unknown) { socket.off('message', receive); reject(error); }
+    };
+    socket.on('message', receive);
+  });
+}
+
+async function nextMessage(socket: WebSocket): Promise<unknown> { return (await nextMessages(socket, 1))[0]; }
+
+function closeCode(socket: WebSocket): Promise<number> {
+  return new Promise((resolveCode) => socket.once('close', (code) => resolveCode(code)));
+}
+
+async function open(socket: WebSocket, id = ''): Promise<readonly [unknown, unknown]> {
+  const messages = nextMessages(socket, 2);
+  socket.send(JSON.stringify({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } }));
+  const [response, snapshot] = await messages;
+  return [response, snapshot];
+}
+
+afterEach(async () => {
+  await Promise.all(runtimes.splice(0).map((instance) => instance.close()));
+  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
+});
+
+describe('VTT Node WebSocket runtime', () => {
+  it('validates bounded nonsymlink mode-0600 claims before listening', () => {
+    const root = temporaryRoot();
+    const valid = resolve(root, 'valid.json');
+    writeFileSync(valid, `${JSON.stringify([{ tokenSha256: hash('dm-secret'), role: 'dm' }])}\n`, { mode: 0o600 });
+    chmodSync(valid, 0o600);
+    const created = createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) });
+    runtimes.push(created);
+    expect(created.listening()).toBe(false);
+
+    chmodSync(valid, 0o644);
+    expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('mode 0600');
+    chmodSync(valid, 0o600);
+    const link = resolve(root, 'link.json');
+    symlinkSync(valid, link);
+    expect(() => createVttNodeRuntime({ tokensFile: link, allowedOrigins: new Set([ORIGIN]) })).toThrow('nonsymlink');
+    writeFileSync(valid, `${JSON.stringify([
+      { tokenSha256: hash('duplicate'), role: 'dm' },
+      { tokenSha256: hash('duplicate'), role: 'dm' },
+    ])}\n`, { mode: 0o600 });
+    expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('duplicate');
+    writeFileSync(valid, `${JSON.stringify([{ tokenSha256: hash('player'), role: 'player' }])}\n`, { mode: 0o600 });
+    expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('invalid claims');
+  });
+
+  it('authenticates before upgrade, echoes only vtt.v1, and binds claims to session.open', async () => {
+    const setup = await runtime([
+      { tokenSha256: hash('dm-secret'), role: 'dm' },
+      { tokenSha256: hash('player-a-secret'), role: 'player', playerId: PLAYER_A },
+    ]);
+    const failures = [
+      new WebSocket(setup.url, ['vtt.v1', 'bearer.wrong'], { origin: ORIGIN }),
+      new WebSocket(setup.url, ['vtt.v1', 'bearer.dm-secret'], { origin: 'http://127.0.0.1:4431' }),
+      new WebSocket(setup.url.replace('/vtt/v1', '/wrong'), ['vtt.v1', 'bearer.dm-secret'], { origin: ORIGIN }),
+    ];
+    await Promise.all(failures.map((socket) => new Promise<void>((resolveFailure, reject) => {
+      socket.once('unexpected-response', (_request, response) => {
+        try { expect(response.statusCode).toBe(401); resolveFailure(); } catch (error: unknown) { reject(error); }
+      });
+      socket.once('open', () => reject(new Error('Bad handshake unexpectedly opened.')));
+      socket.once('error', () => undefined);
+    })));
+    expect(setup.runtime.sessionCounts()).toEqual({ created: 0, active: 0 });
+
+    const dm = await connect(setup.url, 'dm-secret');
+    expect(dm.protocol).toBe('vtt.v1');
+    const [openResponse, snapshot] = await open(dm);
+    expect(openResponse).toMatchObject({ v: 1, id: '', ok: true, result: { capabilities: ['scene.snapshot', 'token.move', 'door.set'] } });
+    expect(snapshot).toMatchObject({ v: 1, event: 'scene.snapshot', seq: 1, data: { revision: 0 } });
+
+    const player = await connect(setup.url, 'player-a-secret');
+    const refused = nextMessage(player);
+    const closing = closeCode(player);
+    player.send(JSON.stringify({ v: 1, id: 'wrong-role', method: 'session.open', params: { requestedRole: 'dm' } }));
+    await expect(refused).resolves.toMatchObject({ id: 'wrong-role', ok: false, error: { code: 'UNAUTHORIZED' } });
+    await expect(closing).resolves.toBe(1008);
+    dm.close();
+  });
+
+  it('handles fragmentation and ping/pong while rejecting binary, malformed, oversized, and late-open clients', async () => {
+    expect(VTT_RUNTIME_OPEN_DEADLINE_MS).toBe(5_000);
+    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }], { openDeadlineMs: 40 });
+    const fragmented = await connect(setup.url, 'dm-secret');
+    const messages = nextMessages(fragmented, 2);
+    const wire = JSON.stringify({ v: 1, id: 'fragmented', method: 'session.open', params: { requestedRole: 'dm' } });
+    fragmented.send(wire.slice(0, 10), { fin: false });
+    fragmented.send(wire.slice(10), { fin: true });
+    const [response, snapshot] = await messages;
+    expect(response).toMatchObject({ id: 'fragmented', ok: true });
+    expect(snapshot).toMatchObject({ event: 'scene.snapshot', seq: 1 });
+    const pong = new Promise<Buffer>((resolvePong) => fragmented.once('pong', resolvePong));
+    fragmented.ping('alive');
+    await expect(pong).resolves.toEqual(Buffer.from('alive'));
+    fragmented.close();
+
+    const binary = await connect(setup.url, 'dm-secret');
+    const binaryClosed = closeCode(binary);
+    binary.send(Buffer.from([1, 2, 3]), { binary: true });
+    await expect(binaryClosed).resolves.toBe(1002);
+
+    const malformed = await connect(setup.url, 'dm-secret');
+    const malformedClosed = closeCode(malformed);
+    malformed.send('{');
+    await expect(malformedClosed).resolves.toBe(1007);
+
+    const oversized = await connect(setup.url, 'dm-secret');
+    const oversizedClosed = closeCode(oversized);
+    oversized.send('x'.repeat(VTT_RUNTIME_MAX_PAYLOAD + 1));
+    await expect(oversizedClosed).resolves.toBe(1009);
+
+    const late = await connect(setup.url, 'dm-secret');
+    await expect(closeCode(late)).resolves.toBe(1008);
+  });
+
+  it('uses fresh logical sessions and refuses reused wire ids before dispatch', async () => {
+    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }]);
+    const first = await connect(setup.url, 'dm-secret');
+    const second = await connect(setup.url, 'dm-secret');
+    const [firstOpen] = await open(first, 'open');
+    const [secondOpen] = await open(second, 'open');
+    const firstId = typeof firstOpen === 'object' && firstOpen !== null ? Reflect.get(Reflect.get(firstOpen, 'result'), 'sessionId') : null;
+    const secondId = typeof secondOpen === 'object' && secondOpen !== null ? Reflect.get(Reflect.get(secondOpen, 'result'), 'sessionId') : null;
+    expect(typeof firstId).toBe('string');
+    expect(typeof secondId).toBe('string');
+    expect(firstId).not.toBe(secondId);
+    const doorMessages = nextMessages(first, 2);
+    first.send(JSON.stringify({ v: 1, id: 'door-once', method: 'door.set', params: { doorId: 'object:two-room-door', open: true } }));
+    const [door, doorEvent] = await doorMessages;
+    expect(door).toMatchObject({ id: 'door-once', ok: true });
+    expect(doorEvent).toMatchObject({ event: 'scene.snapshot' });
+    const duplicate = nextMessage(first);
+    first.send(JSON.stringify({ v: 1, id: 'door-once', method: 'door.set', params: { doorId: 'object:two-room-door', open: false } }));
+    await expect(duplicate).resolves.toMatchObject({ id: 'door-once', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
+    expect(setup.runtime.sessionCounts()).toEqual({ created: 2, active: 2 });
+    first.close();
+    second.close();
+  });
+
+  it('binds two player claims independently and refuses cross-seat token authority', async () => {
+    const setup = await runtime([
+      { tokenSha256: hash('player-a-secret'), role: 'player', playerId: PLAYER_A },
+      { tokenSha256: hash('player-b-secret'), role: 'player', playerId: PLAYER_B },
+    ]);
+    const playerA = await connect(setup.url, 'player-a-secret');
+    const playerB = await connect(setup.url, 'player-b-secret');
+    const playerAOpening = nextMessages(playerA, 2);
+    playerA.send(JSON.stringify({
+      v: 1, id: 'open:a', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
+    }));
+    const [playerAResponse] = await playerAOpening;
+    expect(playerAResponse).toMatchObject({ id: 'open:a', ok: true });
+    const playerBOpening = nextMessages(playerB, 3);
+    playerB.send(JSON.stringify({
+      v: 1, id: 'open:b', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_B },
+    }));
+    const [playerBResponse, playerBSnapshot, autonomousSnapshot] = await playerBOpening;
+    expect(playerBResponse).toMatchObject({ id: 'open:b', ok: true });
+    expect(playerBSnapshot).toMatchObject({ event: 'scene.snapshot', data: { tokens: expect.arrayContaining([
+      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4 }),
+    ]) } });
+    expect(autonomousSnapshot).toMatchObject({ event: 'scene.snapshot', data: { revision: 1 } });
+
+    const crossSeat = nextMessage(playerB);
+    playerB.send(JSON.stringify({
+      v: 1, id: 'cross-seat', method: 'token.move',
+      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
+    }));
+    await expect(crossSeat).resolves.toMatchObject({ id: 'cross-seat', ok: false, error: { code: 'FORBIDDEN' } });
+    const ownMove = nextMessages(playerB, 2);
+    playerB.send(JSON.stringify({
+      v: 1, id: 'own-move', method: 'token.move',
+      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+    }));
+    const [moveResponse, moveEvent] = await ownMove;
+    expect(moveResponse).toMatchObject({ id: 'own-move', ok: true, result: { revision: 3 } });
+    expect(moveEvent).toMatchObject({ event: 'scene.snapshot', data: { revision: 3, tokens: expect.arrayContaining([
+      expect.objectContaining({ id: 'token:two-room-goblin', x: 7, y: 4 }),
+    ]) } });
+    expect(setup.runtime.sessionCounts()).toEqual({ created: 2, active: 2 });
+    playerA.close();
+    playerB.close();
+  });
+});
diff --git a/tests/unit/vtt/node-websocket-transport.test.ts b/tests/unit/vtt/node-websocket-transport.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8907ccefe78a0c7b80b9ad7ae4f489a515cb8ec9
--- /dev/null
+++ b/tests/unit/vtt/node-websocket-transport.test.ts
@@ -0,0 +1,116 @@
+import { createHash } from 'node:crypto';
+import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
+import { resolve } from 'node:path';
+import { afterEach, describe, expect, it, vi } from 'vitest';
+import { createVttNodeRuntime, type VttNodeRuntime } from '../../../tools/vtt-handoff/node-runtime';
+import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
+import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
+
+const roots: string[] = [];
+const runtimes: VttNodeRuntime[] = [];
+
+function tokenFile(token: string): string {
+  mkdirSync(resolve('.tmp'), { recursive: true });
+  const root = mkdtempSync(resolve('.tmp/vtt-websocket-transport-'));
+  roots.push(root);
+  const path = resolve(root, 'tokens.json');
+  writeFileSync(path, JSON.stringify([{ tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' }]), { mode: 0o600 });
+  chmodSync(path, 0o600);
+  return path;
+}
+
+afterEach(async () => {
+  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
+  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
+});
+
+describe('browser-safe WebSocket scene transport', () => {
+  it('serializes once per wire message, correlates empty ids, buffers initial state, and cleans up centrally', async () => {
+    const token = 'transport-secret';
+    const serverParse = vi.fn((text: string): unknown => JSON.parse(text) as unknown);
+    const serverStringify = vi.fn((value: unknown): string => JSON.stringify(value));
+    const runtime = createVttNodeRuntime({
+      tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true,
+      wireCodec: { parse: serverParse, stringify: serverStringify },
+    });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const clientParse = vi.fn((text: string): unknown => JSON.parse(text) as unknown);
+    const clientStringify = vi.fn((value: unknown): string => JSON.stringify(value));
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token, {
+      parse: clientParse, stringify: clientStringify,
+    });
+    const statuses: string[] = [];
+    transport.subscribeStatus((status) => statuses.push(status));
+    const events: number[] = [];
+    transport.subscribe((event) => events.push(event.seq));
+    await expect(transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }))
+      .resolves.toMatchObject({ id: '', ok: true });
+    await expect(transport.initialSnapshot()).resolves.toMatchObject({ revision: 0 });
+    expect(statuses).toEqual(['connecting', 'open']);
+    expect(events[0]).toBe(1);
+    expect(clientStringify).toHaveBeenCalledTimes(1);
+    expect(serverParse).toHaveBeenCalledTimes(1);
+    expect(serverStringify.mock.calls.length).toBeGreaterThanOrEqual(2);
+    expect(clientParse.mock.calls.length).toBe(serverStringify.mock.calls.length);
+
+    const lateEvents: number[] = [];
+    const stopLate = transport.subscribe((event) => lateEvents.push(event.seq));
+    expect(lateEvents).toHaveLength(1);
+    stopLate();
+    const closedByObserver = new Promise<void>((resolveClosed) => {
+      transport.subscribe((event) => {
+        if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open !== true) return;
+        transport.close();
+        resolveClosed();
+      });
+    });
+    const door = await transport.request({
+      v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
+    });
+    expect(door).toMatchObject({ id: 'door', ok: true });
+    await closedByObserver;
+    expect(events.at(-1)).toBeGreaterThan(1);
+    expect(transport.status()).toBe('closed');
+    expect(transport.pendingRequestCount()).toBe(0);
+    await expect(transport.request({ v: 1, id: 'after', method: 'scene.snapshot', params: {} }))
+      .rejects.toBeInstanceOf(SceneTransportClosedError);
+  });
+
+  it('rechecks state after caller-controlled serialization and never retries an unknown mutation', async () => {
+    const token = 'getter-secret';
+    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
+    await transport.request({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
+    let reads = 0;
+    const request = {
+      v: 1,
+      id: 'getter-close',
+      method: 'door.set',
+      params: {
+        doorId: 'object:two-room-door',
+        get open(): boolean { reads += 1; transport.close(); return true; },
+      },
+    };
+    await expect(transport.request(request)).rejects.toBeInstanceOf(SceneTransportClosedError);
+    expect(reads).toBe(1);
+    expect(transport.pendingRequestCount()).toBe(0);
+    expect(runtime.sessionCounts().created).toBe(1);
+  });
+
+  it('settles a request queued during connecting when authentication closes the peer', async () => {
+    const token = 'real-secret';
+    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(runtime);
+    const address = await runtime.listen(0);
+    const transport = new WebSocketSceneTransport(address.websocketUrl, 'wrong-secret');
+    await expect(transport.request({
+      v: 1, id: 'never-opened', method: 'session.open', params: { requestedRole: 'dm' },
+    })).rejects.toBeInstanceOf(SceneTransportFaultError);
+    expect(transport.pendingRequestCount()).toBe(0);
+    expect(transport.status()).toBe('closed');
+    expect(runtime.sessionCounts()).toEqual({ created: 0, active: 0 });
+  });
+});
diff --git a/tests/unit/vtt/runtime-parity.test.ts b/tests/unit/vtt/runtime-parity.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5c10d8179eee3cd82cce21cc2011ff0da532612a
--- /dev/null
+++ b/tests/unit/vtt/runtime-parity.test.ts
@@ -0,0 +1,73 @@
+import { createHash } from 'node:crypto';
+import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
+import { resolve } from 'node:path';
+import { afterEach, describe, expect, it } from 'vitest';
+import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
+import {
+  createVttNodeRuntime, type VttNodeRuntime,
+} from '../../../tools/vtt-handoff/node-runtime';
+import {
+  createInProcessConformanceTransport, runDmTransportConformance, TRANSPORT_CONFORMANCE_SCENARIOS,
+} from '../../helpers/vtt-handoff/transport-conformance';
+
+const roots: string[] = [];
+const runtimes: VttNodeRuntime[] = [];
+
+function tokenFile(token: string): string {
+  mkdirSync(resolve('.tmp'), { recursive: true });
+  const root = mkdtempSync(resolve('.tmp/vtt-runtime-parity-'));
+  roots.push(root);
+  const path = resolve(root, 'tokens.json');
+  writeFileSync(path, JSON.stringify([{ tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' }]), { mode: 0o600 });
+  chmodSync(path, 0o600);
+  return path;
+}
+
+afterEach(async () => {
+  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
+  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
+});
+
+function canonicalWithoutSessionIdentity(value: unknown): unknown {
+  if (Array.isArray(value)) return value.map(canonicalWithoutSessionIdentity);
+  if (typeof value !== 'object' || value === null) return value;
+  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
+    key,
+    key === 'sessionId' || key === 'sceneId' ? '<logical-session>' : canonicalWithoutSessionIdentity(child),
+  ]));
+}
+
+describe('fixed two-room runtime parity', () => {
+  it('runs the shared independent conformance assertions through in-process and WebSocket adapters', async () => {
+    expect(TRANSPORT_CONFORMANCE_SCENARIOS).toHaveLength(16);
+    const inProcess = createInProcessConformanceTransport();
+    const inProcessResultPromise = runDmTransportConformance(inProcess.transport);
+    await inProcess.start();
+    const inProcessResult = await inProcessResultPromise;
+
+    const token = 'runtime-parity-secret';
+    const nodeRuntime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
+    runtimes.push(nodeRuntime);
+    const address = await nodeRuntime.listen(0);
+    const websocketResult = await runDmTransportConformance(new WebSocketSceneTransport(address.websocketUrl, token));
+
+    expect(websocketResult.seed).toBe(603_020_001);
+    expect(websocketResult.clock).toBe('2026-09-09T12:00:00.000Z');
+    expect(websocketResult.canonical.map((response) => ({
+      id: response.id,
+      ok: response.ok,
+      code: response.ok ? null : response.error.code,
+    }))).toEqual(inProcessResult.canonical.map((response) => ({
+      id: response.id,
+      ok: response.ok,
+      code: response.ok ? null : response.error.code,
+    })));
+    expect(canonicalWithoutSessionIdentity(websocketResult.canonical))
+      .toEqual(canonicalWithoutSessionIdentity(inProcessResult.canonical));
+    expect(websocketResult.outcomes).toMatchObject({
+      open: 'ok', correlation: 'ok', structuralValidation: 'INVALID_REQUEST',
+      doorChange: 'committed', doorNoOp: 'committed', light: 'UNSUPPORTED', malformed: 'typed-fault',
+    });
+    expect(nodeRuntime.sessionCounts()).toEqual({ created: 1, active: 0 });
+  });
+});
diff --git a/tools/serve.mjs b/tools/serve.mjs
index a1d19c4304098294b32d501469aa61355ea41f2f..afbc858e38dbd9eff9a1ab04967db3d20ce24bd8
--- a/tools/serve.mjs
+++ b/tools/serve.mjs
@@ -1,7 +1,8 @@
-import { spawnSync } from 'node:child_process';
-import { createReadStream, realpathSync, statSync } from 'node:fs';
+import { spawn, spawnSync } from 'node:child_process';
+import { createReadStream, mkdtempSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
 import { createServer } from 'node:http';
-import { extname, resolve, sep } from 'node:path';
+import { tmpdir } from 'node:os';
+import { extname, join, resolve, sep } from 'node:path';
 
 const HOST = '127.0.0.1';
 const DEFAULT_PORT = 4173;
@@ -25,8 +26,9 @@
   process.exit(1);
 }
 
-function readPort(argv, environment) {
+function readOptions(argv, environment) {
   let rawPort = environment.SERVE_PORT;
+  let vttRuntime = false;
   for (let index = 0; index < argv.length; index += 1) {
     const argument = argv[index];
     if (argument === '--port') {
@@ -41,13 +43,17 @@
       rawPort = argument.slice('--port='.length);
       continue;
     }
+    if (argument === '--vtt-runtime') {
+      vttRuntime = true;
+      continue;
+    }
     fail(`unknown argument ${JSON.stringify(argument)}.`);
   }
   const port = rawPort === undefined ? DEFAULT_PORT : Number(rawPort);
   if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
     fail(`port must be an integer from 0 to 65535; received ${JSON.stringify(rawPort)}.`);
   }
-  return port;
+  return { port, vttRuntime };
 }
 
 function build() {
@@ -132,7 +138,7 @@
   }
 }
 
-function serve(port) {
+function serve(port, vttRuntime) {
   const root = realpathSync(resolve('dist'));
   const server = createServer((request, response) => {
     if (request.method !== 'GET' && request.method !== 'HEAD') {
@@ -173,9 +179,44 @@
     process.stdout.write(
       `serve: fresh dist/ available at http://${HOST}:${String(address.port)}\n`,
     );
+    if (vttRuntime) launchVttRuntime(address.port, server);
   });
 }
 
-const port = readPort(process.argv.slice(2), process.env);
+function launchVttRuntime(originPort, server) {
+  const configRoot = mkdtempSync(join(tmpdir(), 'vtt-runtime-vite-'));
+  const configPath = join(configRoot, 'vite.config.mjs');
+  writeFileSync(configPath, 'export default {};\n', { mode: 0o600 });
+  const child = spawn(process.execPath, [
+    resolve('node_modules/vite-node/vite-node.mjs'),
+    '--config', configPath,
+    'tools/vtt-handoff/node-runtime-main.ts',
+    '--port', process.env.VTT_RUNTIME_PORT ?? '0',
+    '--origin', `http://${HOST}:${String(originPort)}`,
+  ], {
+    cwd: process.cwd(),
+    env: process.env,
+    stdio: ['ignore', 'pipe', 'pipe'],
+  });
+  child.stdout.pipe(process.stdout);
+  child.stderr.pipe(process.stderr);
+  let stopping = false;
+  child.once('error', (error) => fail(`could not launch VTT runtime: ${error.message}`));
+  child.once('exit', (code, signal) => {
+    rmSync(configRoot, { recursive: true, force: true });
+    if (!stopping) fail(`VTT runtime exited unexpectedly (${signal ?? `code ${String(code)}`}).`);
+  });
+  const stop = () => {
+    if (stopping) return;
+    stopping = true;
+    child.kill('SIGTERM');
+    server.close();
+  };
+  process.once('SIGINT', stop);
+  process.once('SIGTERM', stop);
+  process.once('exit', () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM'); });
+}
+
+const { port, vttRuntime } = readOptions(process.argv.slice(2), process.env);
 build();
-serve(port);
+serve(port, vttRuntime);
diff --git a/tools/vtt-handoff/node-runtime-main.ts b/tools/vtt-handoff/node-runtime-main.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d49ab578ec767c5a507f32bf7eb1d92c4610881e
--- /dev/null
+++ b/tools/vtt-handoff/node-runtime-main.ts
@@ -0,0 +1,58 @@
+import { createVttNodeRuntime } from './node-runtime';
+
+interface MainOptions {
+  readonly port: number;
+  readonly origins: ReadonlySet<string>;
+  readonly allowOriginless: boolean;
+}
+
+function options(argv: readonly string[], environment: NodeJS.ProcessEnv): MainOptions {
+  let rawPort = environment.VTT_RUNTIME_PORT ?? '0';
+  const origins = new Set<string>();
+  let allowOriginless = environment.VTT_RUNTIME_ALLOW_ORIGINLESS === '1';
+  for (let index = 0; index < argv.length; index += 1) {
+    const argument = argv[index];
+    if (argument === '--port' || argument === '--origin') {
+      const value = argv[index + 1];
+      if (value === undefined) throw new Error(`${argument} requires a value.`);
+      index += 1;
+      if (argument === '--port') rawPort = value;
+      else origins.add(value);
+      continue;
+    }
+    if (argument === '--allow-originless') { allowOriginless = true; continue; }
+    throw new Error(`Unknown node-runtime argument ${JSON.stringify(argument)}.`);
+  }
+  const port = Number(rawPort);
+  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535 || port === 4_173) {
+    throw new Error(`The runtime port must be an integer from 0 to 65535 other than 4173; received ${JSON.stringify(rawPort)}.`);
+  }
+  if (origins.size === 0 && !allowOriginless) throw new Error('At least one exact runtime Origin is required.');
+  return { port, origins, allowOriginless };
+}
+
+async function main(): Promise<void> {
+  const parsed = options(process.argv.slice(2), process.env);
+  const tokensFile = process.env.VTT_RUNTIME_TOKENS_FILE;
+  if (tokensFile === undefined || tokensFile.length === 0) throw new Error('VTT_RUNTIME_TOKENS_FILE is required.');
+  const runtime = createVttNodeRuntime({
+    tokensFile,
+    allowedOrigins: parsed.origins,
+    allowOriginless: parsed.allowOriginless,
+  });
+  const address = await runtime.listen(parsed.port);
+  process.stdout.write(`vtt-runtime: listening ${address.websocketUrl}\n`);
+  let closing = false;
+  const close = (): void => {
+    if (closing) return;
+    closing = true;
+    void runtime.close().then(() => process.exit(0), () => process.exit(1));
+  };
+  process.once('SIGINT', close);
+  process.once('SIGTERM', close);
+}
+
+void main().catch((error: unknown) => {
+  process.stderr.write(`vtt-runtime: ${error instanceof Error ? error.message : String(error)}\n`);
+  process.exitCode = 1;
+});
diff --git a/tools/vtt-handoff/node-runtime.ts b/tools/vtt-handoff/node-runtime.ts
new file mode 100644
index 0000000000000000000000000000000000000000..be204cf7289e515310e0da9ec02f62bcde149e9e
--- /dev/null
+++ b/tools/vtt-handoff/node-runtime.ts
@@ -0,0 +1,393 @@
+import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
+import { lstatSync, openSync, closeSync, readFileSync, fstatSync } from 'node:fs';
+import { createServer, type IncomingMessage } from 'node:http';
+import type { Duplex } from 'node:stream';
+import { WebSocket, WebSocketServer, type RawData } from 'ws';
+import { z } from 'zod';
+import type { CombatantId } from '../../src/combat/values';
+import type { EncounterState } from '../../src/combat/encounter';
+import type { LegalActionSummary } from '../../src/combat/controllers';
+import { DmEncounterHost } from '../../src/vtt/dm-encounter-host';
+import { EncounterSessionService, type PlayerSeatRegistration } from '../../src/vtt/encounter-session-service';
+import type { EncounterArtPackage } from '../../src/vtt/encounter-package';
+import { encounterSeed } from '../../src/vtt/session-seed';
+import { MemoryBrowserSessionStore } from '../../src/vtt/session-persistence';
+import {
+  buildTwoRoomEncounter, TWO_ROOM_ADVENTURER_ID, TWO_ROOM_SEED, twoRoomArtPackage,
+} from '../../src/vtt/handoff/fixtures/two-room';
+import {
+  HANDOFF_WEBSOCKET_CLOSE_CODES, ProtocolRuntime, type HandoffResponse,
+  type ProtocolSessionPort, type SceneSnapshotEvent,
+} from '../../src/vtt/handoff/protocol-runtime';
+import type { HandoffPrincipal } from '../../src/vtt/handoff/session-authorizer';
+
+export const VTT_RUNTIME_PATH = '/vtt/v1';
+export const VTT_RUNTIME_MAX_PAYLOAD = 1_048_576;
+export const VTT_RUNTIME_OPEN_DEADLINE_MS = 5_000;
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
+interface TokenClaim {
+  readonly tokenSha256: string;
+  readonly principal: HandoffPrincipal;
+}
+
+export interface NodeRuntimeSession {
+  readonly service: ProtocolSessionPort;
+  readonly seats: readonly PlayerSeatRegistration[];
+  readonly art: EncounterArtPackage;
+  readonly start?: () => Promise<void>;
+}
+
+export interface VttNodeRuntimeOptions {
+  readonly tokensFile: string;
+  readonly allowedOrigins: ReadonlySet<string>;
+  readonly allowOriginless?: boolean;
+  readonly openDeadlineMs?: number;
+  readonly createSession?: (principal: HandoffPrincipal) => NodeRuntimeSession;
+  readonly wireCodec?: {
+    readonly parse: (text: string) => unknown;
+    readonly stringify: (value: HandoffResponse | SceneSnapshotEvent) => string;
+  };
+}
+
+export interface VttNodeRuntimeAddress {
+  readonly host: '127.0.0.1';
+  readonly port: number;
+  readonly websocketUrl: string;
+}
+
+export interface VttNodeRuntime {
+  listening(): boolean;
+  listen(port?: number): Promise<VttNodeRuntimeAddress>;
+  close(): Promise<void>;
+  sessionCounts(): { readonly created: number; readonly active: number };
+}
+
+function readTokenClaims(path: string): readonly TokenClaim[] {
+  const before = lstatSync(path);
+  if (!before.isFile() || before.isSymbolicLink()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
+  if ((before.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
+  if (before.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
+  const descriptor = openSync(path, 'r');
+  try {
+    const opened = fstatSync(descriptor);
+    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
+      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was opened.');
+    }
+    const bytes = readFileSync(descriptor);
+    if (bytes.byteLength > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
+    let source: unknown;
+    try { source = JSON.parse(bytes.toString('utf8')) as unknown; }
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
+
+function legalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
+  if (actor === TWO_ROOM_ADVENTURER_ID) return { actions: [{ type: 'end_turn', actor }] };
+  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
+  if (token === undefined) return { actions: [{ type: 'end_turn', actor }] };
+  const direction = token.position.column < 5 ? 1 : -1;
+  return { actions: [
+    { type: 'move', actor, path: [{ column: token.position.column + direction, row: token.position.row }], cause: 'voluntary' },
+    { type: 'end_turn', actor },
+  ] };
+}
+
+let sessionSequence = 0;
+export function createDefaultNodeRuntimeSession(_principal: HandoffPrincipal): NodeRuntimeSession {
+  sessionSequence += 1;
+  const state = buildTwoRoomEncounter();
+  const host = new DmEncounterHost(`scene:vtt-node:${String(sessionSequence)}:${randomBytes(8).toString('hex')}`, new MemoryBrowserSessionStore(), {
+    initialState: state,
+    initialSeed: encounterSeed(TWO_ROOM_SEED),
+    initialControllers: state.combatants.map((combatant, index) => ({
+      combatantId: combatant.profile.id,
+      controllerId: `${combatant.profile.id}:websocket`,
+      kind: index === 0 ? 'algorithm' as const : 'human' as const,
+      generation: 0,
+    })),
+    playerIds: state.combatants.map((combatant) => combatant.profile.id),
+    turnLegalActions: legalActions,
+  });
+  const bindings = host.rendererTokenBindings();
+  const seats: PlayerSeatRegistration[] = state.combatants.map((combatant) => ({
+    playerId: String(combatant.profile.id),
+    seatId: `seat:${String(combatant.profile.id)}`,
+    observerCombatantId: combatant.profile.id,
+    ownedCombatantIds: [combatant.profile.id],
+    controlledTokenIds: bindings.filter((binding) => binding.combatantId === combatant.profile.id).map((binding) => binding.tokenId),
+  }));
+  const service = new EncounterSessionService(host, seats);
+  return { service, seats, art: twoRoomArtPackage(), start: () => service.start() };
+}
+
+function rejectUpgrade(socket: Duplex): void {
+  if (socket.destroyed) return;
+  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n', () => socket.destroy());
+}
+
+function singleHeader(value: string | string[] | undefined): string | null {
+  return typeof value === 'string' ? value : null;
+}
+
+function offeredProtocols(header: string): readonly string[] | null {
+  const values = header.split(',').map((value) => value.trim());
+  if (values.some((value) => value.length === 0) || new Set(values).size !== values.length) return null;
+  return values;
+}
+
+function authenticate(request: IncomingMessage, claims: readonly TokenClaim[], options: VttNodeRuntimeOptions): HandoffPrincipal | null {
+  let url: URL;
+  try { url = new URL(request.url ?? '', 'http://127.0.0.1'); } catch { return null; }
+  if (url.pathname !== VTT_RUNTIME_PATH || url.search !== '') return null;
+  const host = singleHeader(request.headers.host);
+  if (host === null || !/^127\.0\.0\.1(?::\d{1,5})?$/u.test(host)) return null;
+  const hostPort = host.includes(':') ? Number(host.slice(host.lastIndexOf(':') + 1)) : null;
+  if (hostPort !== null && (!Number.isSafeInteger(hostPort) || hostPort < 1 || hostPort > 65_535)) return null;
+  if (singleHeader(request.headers.upgrade)?.toLowerCase() !== 'websocket') return null;
+  const connection = singleHeader(request.headers.connection);
+  if (connection === null || !connection.split(',').some((value) => value.trim().toLowerCase() === 'upgrade')) return null;
+  const origin = singleHeader(request.headers.origin);
+  if (origin === null ? options.allowOriginless !== true : !options.allowedOrigins.has(origin)) return null;
+  if (singleHeader(request.headers['sec-websocket-version']) !== '13') return null;
+  const key = singleHeader(request.headers['sec-websocket-key']);
+  if (key === null) return null;
+  let decodedKey: Buffer;
+  try { decodedKey = Buffer.from(key, 'base64'); } catch { return null; }
+  if (decodedKey.byteLength !== 16 || decodedKey.toString('base64') !== key) return null;
+  const protocolsHeader = singleHeader(request.headers['sec-websocket-protocol']);
+  if (protocolsHeader === null) return null;
+  const protocols = offeredProtocols(protocolsHeader);
+  if (protocols === null || protocols.length !== 2 || protocols.filter((value) => value === 'vtt.v1').length !== 1) return null;
+  const bearer = protocols.find((value) => value.startsWith('bearer.'));
+  if (bearer === undefined || !/^bearer\.[A-Za-z0-9_-]+$/u.test(bearer)) return null;
+  const token = bearer.slice('bearer.'.length);
+  const digest = createHash('sha256').update(token).digest();
+  let match: TokenClaim | null = null;
+  for (const claim of claims) {
+    const expected = Buffer.from(claim.tokenSha256, 'hex');
+    if (timingSafeEqual(digest, expected)) match = claim;
+  }
+  return match?.principal ?? null;
+}
+
+function failure(id: string, code: string, message: string): HandoffResponse {
+  return { v: 1, id, ok: false, error: { code, message } };
+}
+
+function rawText(data: RawData): string | null {
+  const bytes = Array.isArray(data)
+    ? Buffer.concat(data)
+    : data instanceof ArrayBuffer
+      ? Buffer.from(data)
+      : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
+  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
+}
+
+function requestFields(value: unknown): { readonly id: string | null; readonly method: string | null } {
+  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { id: null, method: null };
+  const id = Reflect.get(value, 'id');
+  const method = Reflect.get(value, 'method');
+  return { id: typeof id === 'string' ? id : null, method: typeof method === 'string' ? method : null };
+}
+
+export function createVttNodeRuntime(options: VttNodeRuntimeOptions): VttNodeRuntime {
+  const claims = readTokenClaims(options.tokensFile);
+  const openDeadlineMs = options.openDeadlineMs ?? VTT_RUNTIME_OPEN_DEADLINE_MS;
+  if (!Number.isSafeInteger(openDeadlineMs) || openDeadlineMs < 1) throw new RangeError('openDeadlineMs must be a positive integer.');
+  const createSession = options.createSession ?? createDefaultNodeRuntimeSession;
+  const wireCodec = options.wireCodec ?? {
+    parse: (text: string): unknown => JSON.parse(text) as unknown,
+    stringify: (value: HandoffResponse | SceneSnapshotEvent): string => JSON.stringify(value),
+  };
+  const server = createServer((_request, response) => {
+    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
+    response.end('Not found\n');
+  });
+  const sockets = new Set<WebSocket>();
+  const wss = new WebSocketServer({
+    noServer: true,
+    maxPayload: VTT_RUNTIME_MAX_PAYLOAD,
+    perMessageDeflate: false,
+    handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
+  });
+  let created = 0;
+  let active = 0;
+  let closePromise: Promise<void> | null = null;
+
+  server.on('upgrade', (request, socket, head) => {
+    const principal = authenticate(request, claims, options);
+    if (principal === null) { rejectUpgrade(socket); return; }
+    try {
+      wss.handleUpgrade(request, socket, head, (websocket) => {
+        wss.emit('connection', websocket, request, principal);
+      });
+    } catch {
+      rejectUpgrade(socket);
+    }
+  });
+
+  wss.on('connection', (websocket: WebSocket, _request: IncomingMessage, principal: HandoffPrincipal) => {
+    let session: NodeRuntimeSession;
+    try { session = createSession(principal); }
+    catch { websocket.close(1011, 'Session creation failed.'); return; }
+    created += 1;
+    active += 1;
+    sockets.add(websocket);
+    const runtime = new ProtocolRuntime({ service: session.service, principal, seats: session.seats, art: session.art });
+    const usedIds = new Set<string>();
+    const aborters = new Set<AbortController>();
+    let opened = false;
+    let terminal = false;
+    let dispatchingOpen = false;
+    let bufferedOpenEvent: SceneSnapshotEvent | null = null;
+    const bufferedReceiptEvents = new Map<object, SceneSnapshotEvent>();
+
+    const send = (value: HandoffResponse | SceneSnapshotEvent): boolean => {
+      if (terminal || websocket.readyState !== WebSocket.OPEN) return false;
+      let wire: string;
+      try { wire = wireCodec.stringify(value); }
+      catch { cleanup(1011, 'Protocol serialization failed.'); return false; }
+      if (terminal || websocket.readyState !== WebSocket.OPEN) return false;
+      try { websocket.send(wire, (error) => { if (error instanceof Error) cleanup(1011, 'Socket send failed.'); }); }
+      catch { cleanup(1011, 'Socket send failed.'); return false; }
+      return !terminal && websocket.readyState === WebSocket.OPEN;
+    };
+    const unsubscribeEvent = runtime.subscribe((event, receipt) => {
+      if (dispatchingOpen && !opened) { bufferedOpenEvent = event; return; }
+      if (receipt !== undefined) { bufferedReceiptEvents.set(receipt.invocationToken, event); return; }
+      send(event);
+    });
+    const unsubscribeFault = runtime.subscribeFaults((fault) => cleanup(fault.websocketCloseCode, fault.message));
+    const deadline = setTimeout(() => cleanup(1008, 'session.open deadline expired.'), openDeadlineMs);
+
+    const cleanup = (code?: number, reason?: string): void => {
+      if (terminal) return;
+      terminal = true;
+      clearTimeout(deadline);
+      active -= 1;
+      sockets.delete(websocket);
+      for (const aborter of aborters) aborter.abort();
+      aborters.clear();
+      unsubscribeEvent();
+      unsubscribeFault();
+      try { runtime.destroySession(); } catch { /* Socket cleanup remains terminal. */ }
+      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
+        try { websocket.close(code ?? 1000, reason?.slice(0, 123)); } catch { websocket.terminate(); }
+      }
+    };
+
+    websocket.on('message', (data, isBinary) => {
+      if (terminal) return;
+      if (isBinary) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError, 'Binary frames are unsupported.'); return; }
+      const text = rawText(data);
+      if (text === null) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText, 'The request is not valid UTF-8.'); return; }
+      let value: unknown;
+      try { value = wireCodec.parse(text); }
+      catch { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText, 'The request is not valid JSON.'); return; }
+      const fields = requestFields(value);
+      if (fields.id === null) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError, 'The request has no usable string id.'); return; }
+      if (!opened && fields.method !== 'session.open') { cleanup(1008, 'The first request must be session.open.'); return; }
+      if (usedIds.has(fields.id)) {
+        send(failure(fields.id, 'DUPLICATE_REQUEST_ID', 'The wire request id was already used.'));
+        return;
+      }
+      usedIds.add(fields.id);
+      const token = runtime.createInvocationToken();
+      const aborter = new AbortController();
+      aborters.add(aborter);
+      if (!opened) dispatchingOpen = true;
+      let dispatched: ReturnType<ProtocolRuntime['dispatch']>;
+      try { dispatched = runtime.dispatch(value, aborter.signal, token); }
+      catch { aborters.delete(aborter); cleanup(1011, 'Session dispatch failed.'); return; }
+      void dispatched.then(async (result) => {
+        if (terminal) return;
+        if (result.kind === 'transport_fault') { cleanup(result.fault.websocketCloseCode, result.fault.message); return; }
+        if (!opened && fields.method === 'session.open') {
+          dispatchingOpen = false;
+          if (!result.response.ok) {
+            send(result.response);
+            cleanup(1008, 'session.open was refused.');
+            return;
+          }
+          opened = true;
+          clearTimeout(deadline);
+          if (!send(result.response)) return;
+          const initial = bufferedOpenEvent;
+          bufferedOpenEvent = null;
+          if (initial !== null) send(initial);
+          if (session.start !== undefined) await session.start();
+          return;
+        }
+        if (!send(result.response)) return;
+        const receiptEvent = bufferedReceiptEvents.get(token);
+        bufferedReceiptEvents.delete(token);
+        if (receiptEvent !== undefined) send(receiptEvent);
+      }).catch(() => cleanup(1011, 'Session dispatch failed.')).finally(() => {
+        aborters.delete(aborter);
+        bufferedReceiptEvents.delete(token);
+      });
+    });
+    websocket.on('close', () => cleanup());
+    websocket.on('error', (error) => {
+      const errorCode = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
+      cleanup(errorCode === 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH' ? 1009 : 1011, 'Socket error.');
+    });
+  });
+
+  return {
+    listening: () => server.listening,
+    listen: (port = 0) => new Promise((resolve, reject) => {
+      const onError = (error: Error): void => reject(error);
+      server.once('error', onError);
+      server.listen(port, '127.0.0.1', () => {
+        server.off('error', onError);
+        const address = server.address();
+        if (address === null || typeof address === 'string') { reject(new Error('Runtime address is unavailable.')); return; }
+        resolve({ host: '127.0.0.1', port: address.port, websocketUrl: `ws://127.0.0.1:${String(address.port)}${VTT_RUNTIME_PATH}` });
+      });
+    }),
+    close: () => {
+      closePromise ??= (async () => {
+        for (const socket of [...sockets]) socket.terminate();
+        await new Promise<void>((resolve, reject) => wss.close((error) => error === undefined ? resolve() : reject(error)));
+        if (!server.listening) return;
+        await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
+      })();
+      return closePromise;
+    },
+    sessionCounts: () => ({ created, active }),
+  };
+}
diff --git a/vitest.config.ts b/vitest.config.ts
index 2a9bca156b447ad9704e7d23b488c8b7d827c808..8bd7e5ce21b10051e89d8b5411a3d3b1c4ea56d0
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -1,4 +1,4 @@
-import { defineConfig } from 'vitest/config';
+import { configDefaults, defineConfig } from 'vitest/config';
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
 
@@ -32,6 +32,7 @@
     // Run BOTH unit and integration .test.ts under vitest. Browser tests are
     // .spec.ts under tests/browser and belong to Playwright (npm run test:browser).
     include: ['tests/**/*.test.ts', ...liveInclusions],
+    exclude: [...configDefaults.exclude, 'tests/integration-supervisor/**'],
     setupFiles: verdictRecorderSetup,
     /**
      * Derives the SRD spell-source parse ONCE, before any worker is forked,
