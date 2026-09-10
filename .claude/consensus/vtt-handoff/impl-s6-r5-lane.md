Implemented S6-F73–F75 with changes limited to four S6 files.

### Changes

- [worker-transport.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-transport.ts:69)
  - Correlation now uses the single-use invocation plus Worker-established IDs.
  - Pre-clone getter values cannot invalidate responses or receipts.
  - Expected peer/session closure closes only that transport; Worker errors remain Worker-wide failures.

- [worker-messages.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-messages.ts:47)
  - Added response-derived authoritative `session.open` recognition.

- [worker-entry.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-entry.ts:211)
  - Session startup derives from the authoritative dispatch response, supporting object, JSON-text, and UTF-8-byte opens.

- [worker-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/worker-boundary.test.ts:292)
  - Changing-ID response and committed-receipt regression.
  - Fresh JSON and byte player opens, including unauthorized controls, initial snapshots, autonomous progress, and successful offered movement.
  - Production shared-host lifecycle covering two K bindings, independent L, K destruction, preserved receipt, L mutation, K recreation, and last-binding termination.

No protocol-runtime, session-service, S8, contract, documentation, or fixture changes.

### Verification

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- `npm run test:engine` — 4 files, 46/46.
- `npm run test:protocol` — 4 files, 68/68.
- `npx vitest run --configLoader runner tests/unit/vtt/worker-boundary.test.ts tests/unit/vtt/engine-boundary.test.ts` — 2 files, 36/36.
- `npx vitest run --configLoader runner tests/unit/vtt/serve-existing-dist.test.ts` — 1 file, 4/4.
- F71 measurement:
  `npx vitest run --configLoader runner tests/unit/vtt/worker-boundary.test.ts -t "zero adapter re-serialization"` — 1 passed, 26 filtered; `{parse:0,stringify:0,clone:0}`.
- Exact 22-spec cumulative suite from R4 — 22 files, 279/279.
- Dev browser proof:

```text
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts
```

Result: 1/1, exit 0.

```text
artifact=dev page=http://127.0.0.1:4410/vtt-handoff worker=http://127.0.0.1:4410/src/vtt/handoff/worker-entry.ts?worker_file&type=module,...
```

- `npm run build` — exit 0; 713 modules, 123 dist files, one Worker `.js`, zero Worker `.ts`.
- Dist browser proof using the same command with `VTT_HANDOFF_ARTIFACT=dist` — 1/1, exit 0.

```text
artifact=dist commit=4fca814a67303b5c8e3e837c17c75160153cf444 worker=http://127.0.0.1:4410/assets/worker-entry-C08mS7eU.js sha256=cc4e1e392cd4a5a50728a31ce797084b200b930716d14619606df0c82bc21a01
```

The on-disk Worker SHA-256 independently matched the stamp.

One parallel targeted run initially reported 35/36 because the existing closure test waited only one event-loop tick. Its exact `['closed']` assertion was retained and changed to deterministic `vi.waitFor`; no timeout was raised. The restored run passed 36/36.

Assertion accounting:

- Worker-boundary `it`: 13→15; parameterized total tests: 23→27.
- Worker-boundary `expect`: 85→109.
- The old wrong-response-ID control was replaced by the stronger uncorrelated-invocation control because response IDs are now authoritative Worker metadata.
- No tests or assertions were deleted or weakened.

Protected hashes remain unchanged:

```text
src/vtt/intel/contracts.ts             0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
binding plan                           25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d
fixtures/protocol/examples.v1.json     9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d
```

No git writes performed.

HANDOFF S6 R5 DONE
diff --git a/src/vtt/handoff/worker-entry.ts b/src/vtt/handoff/worker-entry.ts
index 1d9b30f4956742896abef8f4f01d0d7b4d14f949..db00082a6be21f217de9d24fcbad1b928837bc3d
--- a/src/vtt/handoff/worker-entry.ts
+++ b/src/vtt/handoff/worker-entry.ts
@@ -9,7 +9,8 @@
 } from './fixtures/two-room';
 import { NamedWorkerMemorySessionStore } from './worker-memory-session-store';
 import {
-  decodeWorkerClientMessage, type WorkerConnectMessage, type WorkerServerMessage,
+  decodeWorkerClientMessage, isSuccessfulSessionOpenResponse,
+  type WorkerConnectMessage, type WorkerServerMessage,
 } from './worker-messages';
 import { ProtocolRuntime } from './protocol-runtime';
 import type { HandoffPrincipal } from './session-authorizer';
@@ -207,11 +208,8 @@
           post(port, { kind: 'request-fault', invocation: message.invocation, fault: result.fault });
           return;
         }
-        if (options.startAutonomous !== false && result.response.ok && result.response.id !== undefined) {
-          const request = message.request;
-          if (typeof request === 'object' && request !== null && Reflect.get(request, 'method') === 'session.open') {
-            await startWorkerSession(session);
-          }
+        if (options.startAutonomous !== false && isSuccessfulSessionOpenResponse(result.response)) {
+          await startWorkerSession(session);
         }
         post(port, { kind: 'response', invocation: message.invocation, response: result.response });
       }).catch(() => {
diff --git a/src/vtt/handoff/worker-messages.ts b/src/vtt/handoff/worker-messages.ts
index 5d35c09fa2ffbbc2d57423223ec3269465748b33..2bf6443403b4472261069f842416f24854f570d4
--- a/src/vtt/handoff/worker-messages.ts
+++ b/src/vtt/handoff/worker-messages.ts
@@ -44,6 +44,14 @@
   return decoded.issues.length === 0 ? decoded.value as WorkerServerMessage : null;
 }
 
+export function isSuccessfulSessionOpenResponse(response: HandoffResponse): boolean {
+  if (!response.ok) return false;
+  const sessionId = Reflect.get(response.result, 'sessionId');
+  const capabilities = Reflect.get(response.result, 'capabilities');
+  return typeof sessionId === 'string' && Array.isArray(capabilities) &&
+    capabilities.every((capability: unknown) => typeof capability === 'string');
+}
+
 export type WorkerClientMessage =
   | { readonly kind: 'request'; readonly invocation: number; readonly request: unknown }
   | { readonly kind: 'close' }
diff --git a/src/vtt/handoff/worker-transport.ts b/src/vtt/handoff/worker-transport.ts
index 0d155286e5c9559043aa5ad47f48d69e6275f40b..3ef0db013a2ce1ae5eefd70f3063d4d19c3e1956
--- a/src/vtt/handoff/worker-transport.ts
+++ b/src/vtt/handoff/worker-transport.ts
@@ -2,14 +2,14 @@
 import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
 import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus } from './scene-transport';
 import {
-  decodeWorkerServerMessage, type WorkerClientMessage, type WorkerConnectMessage,
+  decodeWorkerServerMessage, isSuccessfulSessionOpenResponse,
+  type WorkerClientMessage, type WorkerConnectMessage,
 } from './worker-messages';
 import type { HandoffPrincipal } from './session-authorizer';
 import { postWorkerMessage } from './worker-message-post';
 
 interface Pending {
   id: string | null;
-  readonly method: string | null;
   readonly resolve: (response: HandoffResponse) => void;
   readonly reject: (error: Error) => void;
   receiptRevision: number | null;
@@ -66,16 +66,17 @@
     }
     this.#invocation += 1;
     const invocation = this.#invocation;
-    const idValue = property(request, 'id');
-    const methodValue = property(request, 'method');
+    // Snapshot caller-controlled envelope getters only to preserve the lifecycle
+    // recheck. Correlation relies exclusively on the single-use invocation and
+    // metadata established by the Worker after structured cloning.
+    property(request, 'id');
+    property(request, 'method');
     if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
     let rejectRequest: ((error: Error) => void) | undefined;
     const promise = new Promise<HandoffResponse>((resolve, reject) => {
       rejectRequest = reject;
       this.#pending.set(invocation, {
-        id: typeof idValue === 'string' ? idValue : null,
-        method: typeof methodValue === 'string' ? methodValue : null,
-        resolve, reject, receiptRevision: null,
+        id: null, resolve, reject, receiptRevision: null,
       });
     });
     try {
@@ -127,8 +128,7 @@
       if (message.receiptInvocation !== undefined) {
         const pending = this.#pending.get(message.receiptInvocation);
         if (
-          pending === undefined || message.receiptRevision === undefined || message.receiptId === undefined ||
-          pending.id !== null && pending.id !== message.receiptId
+          pending === undefined || message.receiptRevision === undefined || message.receiptId === undefined
         ) {
           this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an uncorrelated mutation receipt.'));
           return;
@@ -155,16 +155,17 @@
     }
     if (message.kind === 'response') {
       const pending = this.#pending.get(message.invocation);
-      if (pending === undefined || pending.id !== null && message.response.id !== pending.id) {
+      if (pending === undefined || pending.id !== null && pending.id !== message.response.id) {
         this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker response correlation failed.'));
         return;
       }
       this.#pending.delete(message.invocation);
-      if (pending.method === 'session.open' && message.response.ok) this.#setStatus('open');
+      pending.id = message.response.id;
+      if (isSuccessfulSessionOpenResponse(message.response)) this.#setStatus('open');
       pending.resolve(message.response);
       return;
     }
-    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker peer closed the transport.'));
+    this.#peerClosed();
   };
 
   readonly #onPortMessageError = (): void => {
@@ -204,6 +205,14 @@
     this.#emitFault(fault);
     this.#finishShutdown(error, true);
   }
+  #peerClosed(): void {
+    if (this.#terminal()) return;
+    const fault = this.#fault('PROTOCOL_ERROR', 'Worker peer closed the transport.');
+    const error = new SceneTransportFaultError(fault);
+    this.#setStatus('closed');
+    this.#emitFault(fault);
+    this.#finishShutdown(error, false);
+  }
   #finishShutdown(error: Error, terminalFault: boolean): void {
     if (this.#finished) return;
     this.#finished = true;
diff --git a/tests/unit/vtt/worker-boundary.test.ts b/tests/unit/vtt/worker-boundary.test.ts
index b0baca931641d2b7e04f384354246b6dcb7f358f..ec1d9c6db357db1c99a920009604d24ce0092dc1
--- a/tests/unit/vtt/worker-boundary.test.ts
+++ b/tests/unit/vtt/worker-boundary.test.ts
@@ -1,7 +1,10 @@
 import { describe, expect, it, vi } from 'vitest';
 import { attachHandoffWorkerPort } from '../../../src/vtt/handoff/worker-entry';
-import { WorkerSceneTransport } from '../../../src/vtt/handoff/worker-transport';
+import {
+  createHandoffWorkerHost, WorkerSceneTransport,
+} from '../../../src/vtt/handoff/worker-transport';
 import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
+import type { HandoffPrincipal } from '../../../src/vtt/handoff/session-authorizer';
 import { readFileSync } from '../../helpers/test-filesystem';
 import { selectVttHandoffWorkerAsset } from '../../../vite.config';
 
@@ -165,7 +168,7 @@
     detachLive();
   });
 
-  it('rejects a wrong-shaped Worker response instead of inventing success', async () => {
+  it('rejects an uncorrelated Worker response invocation instead of inventing success', async () => {
     const channel = new MessageChannel();
     const transport = new WorkerSceneTransport(channel.port1, () => undefined);
     const faults: string[] = [];
@@ -173,8 +176,8 @@
     const pending = transport.request({ v: 1, id: 'expected', method: 'scene.snapshot', params: {} });
     const rejected = pending.catch((error: unknown) => error);
     channel.port2.postMessage({
-      kind: 'response', invocation: 1,
-      response: { v: 1, id: 'wrong', ok: true, result: {} },
+      kind: 'response', invocation: 2,
+      response: { v: 1, id: 'expected', ok: true, result: {} },
     });
     const error = await rejected;
     expect(faults).toEqual(['PROTOCOL_ERROR']);
@@ -286,6 +289,89 @@
     detach();
   });
 
+  it('correlates changing id getters only from Worker-established response and receipt metadata', async () => {
+    const barrier = deferred();
+    let delayResponse = false;
+    const channel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2, {
+      sessionKey: 'changing-id-getter',
+      responseBarrier: () => delayResponse ? barrier.promise : Promise.resolve(),
+    });
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    await transport.request({ v: 1, id: 'open-changing-id', method: 'session.open', params: { requestedRole: 'dm' } });
+
+    let readIdAccesses = 0;
+    const read = await transport.request({
+      v: 1,
+      get id(): string { readIdAccesses += 1; return readIdAccesses === 1 ? 'caller-read' : 'worker-read'; },
+      method: 'scene.snapshot', params: {},
+    });
+    expect({ readIdAccesses, responseId: read.id, ok: read.ok })
+      .toEqual({ readIdAccesses: 2, responseId: 'worker-read', ok: true });
+
+    delayResponse = true;
+    transport.subscribe((event) => {
+      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) transport.close();
+    });
+    let mutationIdAccesses = 0;
+    const committed = await transport.request({
+      v: 1,
+      get id(): string {
+        mutationIdAccesses += 1;
+        return mutationIdAccesses === 1 ? 'caller-mutation' : 'worker-mutation';
+      },
+      method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
+    });
+    expect({ mutationIdAccesses, responseId: committed.id, ok: committed.ok })
+      .toEqual({ mutationIdAccesses: 2, responseId: 'worker-mutation', ok: true });
+    if (!committed.ok) throw new Error('The changing-id mutation receipt was not preserved.');
+    expect(committed.result.revision).toBeTypeOf('number');
+    expect(transport.status()).toBe('closed');
+    barrier.resolve();
+    detach();
+  });
+
+  it.each(['json', 'bytes'] as const)(
+    'opens a fresh player session from %s with initial, autonomous and offered-move progress',
+    async (encoding) => {
+      const sessionKey = `encoded-open:${encoding}`;
+      const channel = new MessageChannel();
+      const detach = attachHandoffWorkerPort(channel.port2, {
+        sessionKey,
+        principal: { role: 'player', playerId: 'combatant:two-room-goblin' },
+      });
+      const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+      const encode = (request: Readonly<Record<string, unknown>>): string | Uint8Array => {
+        const text = JSON.stringify(request);
+        return encoding === 'json' ? text : new TextEncoder().encode(text);
+      };
+      const revisions: number[] = [];
+      transport.subscribe((event) => revisions.push(event.data.revision));
+      const initial = transport.initialSnapshot();
+
+      await expect(transport.request(encode({
+        v: 1, id: `unauthorized-${encoding}`, method: 'session.open', params: { requestedRole: 'dm' },
+      }))).resolves.toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
+      expect(transport.status()).toBe('connecting');
+      await expect(transport.request(encode({
+        v: 1, id: `open-${encoding}`, method: 'session.open',
+        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
+      }))).resolves.toMatchObject({ id: `open-${encoding}`, ok: true });
+      expect(transport.status()).toBe('open');
+      await expect(initial).resolves.toMatchObject({
+        sceneId: `scene:vtt-handoff-worker:${sessionKey}`, revision: 0,
+      });
+      expect(revisions[0]).toBe(0);
+      expect(revisions.some((revision) => revision > 0)).toBe(true);
+      await expect(transport.request({
+        v: 1, id: `move-${encoding}`, method: 'token.move',
+        params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
+      })).resolves.toMatchObject({ id: `move-${encoding}`, ok: true });
+      transport.dispose();
+      detach();
+    },
+  );
+
   it('preserves an established mutation receipt when its snapshot observer closes the transport', async () => {
     const channel = new MessageChannel();
     const detach = attachHandoffWorkerPort(channel.port2);
@@ -483,6 +569,87 @@
     detachA(); detachE(); detachIsolated();
   });
 
+  it('keeps unrelated sessions alive when production host lifecycle destroys one shared session', async () => {
+    const responseBarrier = deferred();
+    let delayDestroyedSession = false;
+    let workerTerminations = 0;
+    const serverDetachers = new Set<() => void>();
+    class PortBackedWorker {
+      postMessage(message: unknown): void {
+        if (typeof message !== 'object' || message === null) throw new TypeError('Expected a Worker connect message.');
+        const port = Reflect.get(message, 'port');
+        const sessionKey = Reflect.get(message, 'sessionKey');
+        const principal = Reflect.get(message, 'principal');
+        if (!(port instanceof MessagePort) || typeof sessionKey !== 'string' || typeof principal !== 'object' || principal === null) {
+          throw new TypeError('Expected a complete Worker connection.');
+        }
+        serverDetachers.add(attachHandoffWorkerPort(port, {
+          sessionKey,
+          principal: principal as HandoffPrincipal,
+          responseBarrier: () => sessionKey === 'production-session-k' && delayDestroyedSession
+            ? responseBarrier.promise
+            : Promise.resolve(),
+        }));
+      }
+      addEventListener(_type: string, _listener: () => void): void {}
+      removeEventListener(_type: string, _listener: () => void): void {}
+      terminate(): void {
+        workerTerminations += 1;
+        for (const detach of serverDetachers) detach();
+        serverDetachers.clear();
+      }
+    }
+    vi.stubGlobal('Worker', PortBackedWorker);
+    try {
+      const host = createHandoffWorkerHost();
+      const firstK = host.connect({ sessionKey: 'production-session-k', principal: { role: 'dm' } });
+      const secondK = host.connect({ sessionKey: 'production-session-k', principal: { role: 'dm' } });
+      const independentL = host.connect({ sessionKey: 'production-session-l', principal: { role: 'dm' } });
+      for (const [transport, id] of [[firstK, 'open-k1'], [secondK, 'open-k2'], [independentL, 'open-l']] as const) {
+        await transport.request({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } });
+      }
+
+      const secondFaults: SceneTransportFaultError[] = [];
+      secondK.subscribeErrors((error) => secondFaults.push(error));
+      delayDestroyedSession = true;
+      secondK.subscribe((event) => {
+        if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) firstK.destroySession();
+      });
+      const preserved = await secondK.request({
+        v: 1, id: 'preserved-k', method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: true },
+      });
+      expect(preserved).toMatchObject({ id: 'preserved-k', ok: true });
+      if (!preserved.ok) throw new Error('Destroyed session lost its established receipt.');
+      expect(preserved.result.revision).toBeTypeOf('number');
+      expect(secondFaults).toHaveLength(1);
+      expect(secondFaults[0]).toMatchObject({ code: 'PROTOCOL_ERROR', websocketCloseCode: 1002 });
+      expect(secondK.status()).toBe('closed');
+      expect(workerTerminations).toBe(0);
+      responseBarrier.resolve();
+
+      await expect(independentL.request({
+        v: 1, id: 'independent-l-door', method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: true },
+      })).resolves.toMatchObject({ id: 'independent-l-door', ok: true });
+      const replacementK = host.connect({ sessionKey: 'production-session-k', principal: { role: 'dm' } });
+      const replacementInitial = replacementK.initialSnapshot();
+      await expect(replacementK.request({
+        v: 1, id: 'open-replacement-k', method: 'session.open', params: { requestedRole: 'dm' },
+      })).resolves.toMatchObject({ id: 'open-replacement-k', ok: true });
+      await expect(replacementInitial).resolves.toMatchObject({ revision: 0 });
+      expect(workerTerminations).toBe(0);
+
+      independentL.dispose();
+      expect(workerTerminations).toBe(0);
+      replacementK.dispose();
+      expect(workerTerminations).toBe(1);
+    } finally {
+      vi.unstubAllGlobals();
+      for (const detach of serverDetachers) detach();
+    }
+  });
+
   it('binds a player port to its seat, filters its projection and never applies a DM receipt to its read', async () => {
     const barrier = deferred();
     let delayPlayer = false;
@@ -577,8 +744,9 @@
         'request',
         lifecycle === 'destroySession' ? 'destroy' : lifecycle,
       ]);
-      await new Promise<void>((resolve) => setTimeout(resolve, 0));
-      expect(workerPost.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual(['closed']);
+      await vi.waitFor(() => {
+        expect(workerPost.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual(['closed']);
+      });
       detach();
     },
   );
