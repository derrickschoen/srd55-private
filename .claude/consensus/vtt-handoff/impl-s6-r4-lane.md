Implemented all four S6 R4 findings in six files:

- [worker-entry.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-entry.ts:22): exact invocation receipt correlation and instance-keyed shared-session teardown.
- [worker-messages.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-messages.ts:25): correlated `receiptId`.
- [worker-transport.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-transport.ts:60): original request preservation, one-time correlation reads, JSON/byte request support.
- [worker-message-post.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-message-post.ts:1): sole MessagePort posting seam.
- [worker-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/worker-boundary.test.ts:232): F69–F71 regressions.
- [engine-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:410): independent exact-use platform controls.

Key outcomes:

- Original objects, JSON strings, arrays, and UTF-8 bytes reach authoritative validation unchanged.
- JSON-text mutation receipts remain correlated across observer closure.
- Session cleanup compares exact session identity; destruction closes all attached bindings, and stale releases cannot delete replacements.
- Serialization measurement covers every `src/vtt/handoff/` adapter/helper origin, with individually documented engine/persistence exclusions.
- Direct, alias, destructuring, computed-property, and bare-builtin platform controls are independent.

Negative controls:

- Direct serialization mutant: exit 1, `stringify: 4`; restored green.
- Helper-mediated serialization mutant: exit 1, `stringify: 12`; restored green.
- Alias-resolution mutant: exactly 1 failed / 8 passed—the alias control only.
- Destructuring-resolution mutant: exactly 1 failed / 8 passed—the destructuring control only.
- Restored platform suite: 9/9.
- Final zero-serialization measurement: `{parse:0, stringify:0, clone:0}`, 1 passed / 22 filtered.

Logs are under `.tmp/vtt-handoff-s6-r4-*.log`.

Gate results:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- `npm run test:engine` — 4 files, 46/46.
- `npm run test:protocol` — 4 files, 68/68.
- `npx vitest run --configLoader runner tests/unit/vtt/worker-boundary.test.ts tests/unit/vtt/engine-boundary.test.ts` — 2 files, 32/32.
- `npx vitest run --configLoader runner tests/unit/vtt/serve-existing-dist.test.ts` — 1 file, 4/4.
- Exact 22-spec S0–S6 cumulative command — 22 files, 275/275.
- Dev Playwright command:
  `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts`
  — 1/1, exit 0.
- `npm run build` — exit 0; 713 modules, 123 dist files, one Worker `.js`, zero Worker `.ts`.
- Dist Playwright with the same command and `VTT_HANDOFF_ARTIFACT=dist` — 1/1, exit 0.

Recorded artifacts:

```text
artifact=dev page=http://127.0.0.1:4410/vtt-handoff worker=http://127.0.0.1:4410/src/vtt/handoff/worker-entry.ts?worker_file&type=module,...
artifact=dist commit=98b2d0d736e738b443bf7f60abdc40544a8b94bf worker=http://127.0.0.1:4410/assets/worker-entry-C8zyOxUu.js sha256=88888865fa9f113925603b67fcd5f611822501ea893e8615f5b0f09fefa7f15c
```

Assertion accounting:

- No tests were deleted.
- Worker-boundary tests: `it` 10→13, `expect` 72→85.
- Engine-boundary tests: one combined platform test replaced by five independent exact-use tests; `it` 5→9, `expect` 15→16.
- The old in-test alias serialization expectation was replaced by stronger production-source direct and helper-mediated mutate-red/restore-green controls.
- The four broad platform expectations were replaced by exact use-site assertions for direct, alias, destructuring, computed, and builtin mechanisms.

Protected hashes remain unchanged:

```text
src/vtt/intel/contracts.ts                  0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
binding plan                                25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d
fixtures/protocol/examples.v1.json          9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d
```

No S4/S5 runtime/service, S8, contracts, scene fixtures, docs, or `.claude` files changed. No git writes performed.

HANDOFF S6 R4 DONE
diff --git a/src/vtt/handoff/worker-entry.ts b/src/vtt/handoff/worker-entry.ts
index 9570300f566b71df57cd4cf1de081584616b445c..1d9b30f4956742896abef8f4f01d0d7b4d14f949
--- a/src/vtt/handoff/worker-entry.ts
+++ b/src/vtt/handoff/worker-entry.ts
@@ -13,9 +13,16 @@
 } from './worker-messages';
 import { ProtocolRuntime } from './protocol-runtime';
 import type { HandoffPrincipal } from './session-authorizer';
+import { postWorkerMessage } from './worker-message-post';
 
 function post(port: MessagePort, message: WorkerServerMessage): void {
-  port.postMessage(message);
+  postWorkerMessage(port, message);
+}
+
+interface HeldWorkerEvent {
+  readonly event: Parameters<Parameters<ProtocolRuntime['subscribe']>[0]>[0];
+  readonly receiptInvocation?: number;
+  readonly receiptRevision?: number;
 }
 
 function workerLegalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
@@ -35,10 +42,14 @@
   readonly key: string;
   readonly service: EncounterSessionService;
   readonly seats: readonly PlayerSeatRegistration[];
-  bindings: number;
+  readonly bindings: Set<WorkerBinding>;
   startPromise: Promise<void> | null;
 }
 
+interface WorkerBinding {
+  destroyFromSession(): void;
+}
+
 const workerSessions = new Map<string, WorkerSession>();
 let anonymousSessionSequence = 0;
 
@@ -75,7 +86,10 @@
       .filter((binding) => binding.combatantId === combatant.profile.id)
       .map((binding) => binding.tokenId),
   }));
-  return { key, service: new EncounterSessionService(host, seats), seats, bindings: 0, startPromise: null };
+  return {
+    key, service: new EncounterSessionService(host, seats), seats,
+    bindings: new Set(), startPromise: null,
+  };
 }
 
 function workerSession(key: string): WorkerSession {
@@ -115,7 +129,6 @@
 ): () => void {
   const sessionKey = options.sessionKey ?? `anonymous:${String(++anonymousSessionSequence)}`;
   const session = workerSession(sessionKey);
-  session.bindings += 1;
   const runtime = new ProtocolRuntime({
     service: session.service,
     principal: options.principal ?? { role: 'dm' },
@@ -124,16 +137,25 @@
   });
   const invocations = new Map<SessionInvocationToken, number>();
   const seenInvocations = new Set<number>();
+  let heldEvents: { readonly token: SessionInvocationToken; readonly events: HeldWorkerEvent[] } | null = null;
   let detached = false;
   const unsubscribeEvent = runtime.subscribe((event, receipt) => {
     const receiptInvocation = receipt === undefined ? undefined : invocations.get(receipt.invocationToken);
-    post(port, {
-      kind: 'event',
+    const held: HeldWorkerEvent = {
       event,
       ...(receiptInvocation === undefined || receipt === undefined
         ? {}
         : { receiptInvocation, receiptRevision: receipt.revision }),
-    });
+    };
+    if (heldEvents !== null) {
+      heldEvents.events.push(held);
+      return;
+    }
+    if (receipt !== undefined && receiptInvocation !== undefined) {
+      heldEvents = { token: receipt.invocationToken, events: [held] };
+      return;
+    }
+    post(port, { kind: 'event', event });
   });
   const unsubscribeFault = runtime.subscribeFaults((fault) => post(port, { kind: 'fault', fault }));
   const onMessage = (messageEvent: MessageEvent<unknown>): void => {
@@ -164,6 +186,22 @@
       invocations.set(token, message.invocation);
       void runtime.dispatch(message.request, undefined, token).then(async (result) => {
         invocations.delete(token);
+        if (heldEvents?.token === token) {
+          const events = heldEvents.events;
+          heldEvents = null;
+          for (const held of events) {
+            post(port, {
+              kind: 'event', event: held.event,
+              ...(held.receiptInvocation === undefined || held.receiptRevision === undefined || result.kind !== 'response'
+                ? {}
+                : {
+                    receiptInvocation: held.receiptInvocation,
+                    receiptRevision: held.receiptRevision,
+                    receiptId: result.response.id,
+                  }),
+            });
+          }
+        }
         await options.responseBarrier?.();
         if (result.kind === 'transport_fault') {
           post(port, { kind: 'request-fault', invocation: message.invocation, fault: result.fault });
@@ -187,13 +225,16 @@
     }
     release(message.kind, true);
   };
-  const release = (kind: 'close' | 'dispose' | 'destroy', notifyPeer: boolean): void => {
+  const release = (
+    kind: 'close' | 'dispose' | 'destroy' | 'session-destroyed',
+    notifyPeer: boolean,
+  ): void => {
     if (detached) return;
     detached = true;
     let cleanupFailed = false;
     try {
       if (kind === 'close') runtime.close();
-      else if (kind === 'dispose') runtime.dispose();
+      else if (kind === 'dispose' || kind === 'session-destroyed') runtime.dispose();
       else runtime.destroySession();
     } catch {
       cleanupFailed = true;
@@ -203,10 +244,13 @@
       unsubscribeFault();
       invocations.clear();
       seenInvocations.clear();
-      session.bindings -= 1;
-      if (kind === 'destroy') workerSessions.delete(session.key);
-      if (session.bindings === 0 && kind !== 'destroy') {
-        workerSessions.delete(session.key);
+      heldEvents = null;
+      session.bindings.delete(binding);
+      if (kind === 'destroy') {
+        if (workerSessions.get(session.key) === session) workerSessions.delete(session.key);
+        for (const attached of [...session.bindings]) attached.destroyFromSession();
+      } else if (session.bindings.size === 0 && kind !== 'session-destroyed') {
+        if (workerSessions.get(session.key) === session) workerSessions.delete(session.key);
         try { runtime.destroySession(); } catch { cleanupFailed = true; }
       }
       if (notifyPeer) {
@@ -224,6 +268,10 @@
       port.close();
     }
   };
+  const binding: WorkerBinding = {
+    destroyFromSession: () => release('session-destroyed', true),
+  };
+  session.bindings.add(binding);
   port.addEventListener('message', onMessage);
   port.start();
   return () => release('dispose', false);
diff --git a/src/vtt/handoff/worker-message-post.ts b/src/vtt/handoff/worker-message-post.ts
new file mode 100644
index 0000000000000000000000000000000000000000..46ffc68b3fc05205c0a86520974564939a787064
--- /dev/null
+++ b/src/vtt/handoff/worker-message-post.ts
@@ -0,0 +1,4 @@
+/** The sole Worker adapter post seam; MessagePort performs the structured-clone boundary. */
+export function postWorkerMessage(port: MessagePort, message: unknown): void {
+  port.postMessage(message);
+}
diff --git a/src/vtt/handoff/worker-messages.ts b/src/vtt/handoff/worker-messages.ts
index 49ccde9a7962de0a88e2a968fb6e5f1371030ed2..5d35c09fa2ffbbc2d57423223ec3269465748b33
--- a/src/vtt/handoff/worker-messages.ts
+++ b/src/vtt/handoff/worker-messages.ts
@@ -25,6 +25,7 @@
   z.strictObject({
     kind: z.literal('event'), event: handoffEventSchema,
     receiptInvocation: invocationSchema.optional(), receiptRevision: z.number().int().safe().optional(),
+    receiptId: z.string().optional(),
   }),
   z.strictObject({ kind: z.literal('fault'), fault: transportFaultSchema }),
   z.strictObject({ kind: z.literal('closed') }),
@@ -52,7 +53,13 @@
 export type WorkerServerMessage =
   | { readonly kind: 'response'; readonly invocation: number; readonly response: HandoffResponse }
   | { readonly kind: 'request-fault'; readonly invocation: number; readonly fault: ProtocolTransportFault }
-  | { readonly kind: 'event'; readonly event: SceneSnapshotEvent; readonly receiptInvocation?: number; readonly receiptRevision?: number }
+  | {
+      readonly kind: 'event';
+      readonly event: SceneSnapshotEvent;
+      readonly receiptInvocation?: number;
+      readonly receiptRevision?: number;
+      readonly receiptId?: string;
+    }
   | { readonly kind: 'fault'; readonly fault: ProtocolTransportFault }
   | { readonly kind: 'closed' };
 
diff --git a/src/vtt/handoff/worker-transport.ts b/src/vtt/handoff/worker-transport.ts
index 8c8ac1d2b18350d306bab89a99dc1132f63a33cd..0d155286e5c9559043aa5ad47f48d69e6275f40b
--- a/src/vtt/handoff/worker-transport.ts
+++ b/src/vtt/handoff/worker-transport.ts
@@ -5,9 +5,10 @@
   decodeWorkerServerMessage, type WorkerClientMessage, type WorkerConnectMessage,
 } from './worker-messages';
 import type { HandoffPrincipal } from './session-authorizer';
+import { postWorkerMessage } from './worker-message-post';
 
 interface Pending {
-  readonly id: string | null;
+  id: string | null;
   readonly method: string | null;
   readonly resolve: (response: HandoffResponse) => void;
   readonly reject: (error: Error) => void;
@@ -67,12 +68,7 @@
     const invocation = this.#invocation;
     const idValue = property(request, 'id');
     const methodValue = property(request, 'method');
-    const versionValue = property(request, 'v');
-    const paramsValue = property(request, 'params');
     if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
-    const outbound = typeof request === 'object' && request !== null
-      ? { v: versionValue, id: idValue, method: methodValue, params: paramsValue }
-      : request;
     let rejectRequest: ((error: Error) => void) | undefined;
     const promise = new Promise<HandoffResponse>((resolve, reject) => {
       rejectRequest = reject;
@@ -84,7 +80,7 @@
     });
     try {
       if (this.#terminal()) throw new SceneTransportClosedError();
-      this.#post({ kind: 'request', invocation, request: outbound });
+      this.#post({ kind: 'request', invocation, request });
     } catch {
       this.#pending.delete(invocation);
       if (this.#terminal()) {
@@ -130,11 +126,15 @@
     if (message.kind === 'event') {
       if (message.receiptInvocation !== undefined) {
         const pending = this.#pending.get(message.receiptInvocation);
-        if (pending === undefined || (pending.method !== 'token.move' && pending.method !== 'door.set')) {
+        if (
+          pending === undefined || message.receiptRevision === undefined || message.receiptId === undefined ||
+          pending.id !== null && pending.id !== message.receiptId
+        ) {
           this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an uncorrelated mutation receipt.'));
           return;
         }
-        pending.receiptRevision = message.receiptRevision ?? null;
+        pending.id = message.receiptId;
+        pending.receiptRevision = message.receiptRevision;
       }
       this.#resolveInitial?.(message.event.data);
       this.#resolveInitial = null;
@@ -177,7 +177,7 @@
     this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker could not decode a host message.'));
   };
 
-  #post(message: WorkerClientMessage): void { this.port.postMessage(message); }
+  #post(message: WorkerClientMessage): void { postWorkerMessage(this.port, message); }
   #fault(code: ProtocolTransportFault['code'], message: string): ProtocolTransportFault {
     return { kind: 'transport_fault', code, message, websocketCloseCode: code === 'PROTOCOL_ERROR' ? 1002 : 1007 };
   }
@@ -211,7 +211,7 @@
     this.#resolveInitial = null;
     this.#rejectInitial = null;
     for (const [invocation, pending] of this.#pending) {
-      if (pending.receiptRevision !== null && pending.id !== null && (pending.method === 'token.move' || pending.method === 'door.set')) {
+      if (pending.receiptRevision !== null && pending.id !== null) {
         pending.resolve({ v: 1, id: pending.id, ok: true, result: { revision: pending.receiptRevision } });
       } else pending.reject(error);
       this.#pending.delete(invocation);
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index fa2ff699f09d1e2f4fcdb437b842be4fac2fcc6d..5098fcf48b0b16cb7f79f655d710bacd0e7cfa08
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -369,6 +369,17 @@
   return cachedCoreGraph;
 }
 
+function platformControlViolations(name: string, source: string): readonly string[] {
+  const directory = mkdtempSync(resolve(tmpdir(), `vtt-worker-${name}-`));
+  try {
+    const control = resolve(directory, `${name}.ts`);
+    writeFileSync(control, source);
+    return platformViolations(dependencyGraph([control]));
+  } finally {
+    rmSync(directory, { recursive: true, force: true });
+  }
+}
+
 describe('renderer-neutral engine boundary graph', () => {
   it('recognizes static, re-export, side-effect, import-equals, dynamic, and require value edges', () => {
     const sample = ts.createSourceFile('forms.ts', `
@@ -399,27 +410,39 @@
     expect(platformViolations(graph)).toEqual([]);
   });
 
-  it('catches aliased, destructured, computed and bare-builtin Worker platform controls', () => {
-    const directory = mkdtempSync(resolve(tmpdir(), 'vtt-worker-boundary-'));
-    try {
-      const controls = resolve(directory, 'controls.ts');
-      writeFileSync(controls, `
-        const d = document;
-        d.createElement('div');
-        const { document: doc } = globalThis;
-        doc.createElement('span');
-        globalThis['SharedArrayBuffer'];
-        import fs from 'fs';
-        void fs;
-      `);
-      const violations = platformViolations(dependencyGraph([controls]));
-      expect(violations.some((violation) => violation.endsWith('imports fs'))).toBe(true);
-      expect(violations.some((violation) => violation.endsWith('to document'))).toBe(true);
-      expect(violations.some((violation) => violation.endsWith('to SharedArrayBuffer'))).toBe(true);
-      expect(violations.filter((violation) => violation.endsWith('to document')).length).toBeGreaterThanOrEqual(2);
-    } finally {
-      rmSync(directory, { recursive: true, force: true });
-    }
+  it('catches the direct platform control at its exact use site', () => {
+    const violations = platformControlViolations('direct', `document.createElement('div');`);
+    expect(violations.some((violation) => /\/direct\.ts resolves document\.createElement to document$/u.test(violation)))
+      .toBe(true);
+  });
+
+  it('catches the alias platform control at its exact resolved use site', () => {
+    const violations = platformControlViolations('alias', `
+      const d = document;
+      d.createElement('div');
+    `);
+    expect(violations.some((violation) => /\/vtt-worker-alias-[^/]+\/alias\.ts resolves d\.createElement to document$/u.test(violation)))
+      .toBe(true);
+  });
+
+  it('catches the destructuring platform control at its exact resolved use site', () => {
+    const violations = platformControlViolations('destructuring', `
+      const { document: doc } = globalThis;
+      doc.createElement('span');
+    `);
+    expect(violations.some((violation) => /\/vtt-worker-destructuring-[^/]+\/destructuring\.ts resolves doc\.createElement to document$/u.test(violation)))
+      .toBe(true);
+  });
+
+  it('catches the computed-property platform control at its exact use site', () => {
+    const violations = platformControlViolations('computed', `globalThis['SharedArrayBuffer'];`);
+    expect(violations.some((violation) => /\/computed\.ts resolves globalThis\['SharedArrayBuffer'\] to SharedArrayBuffer$/u.test(violation)))
+      .toBe(true);
+  });
+
+  it('catches the bare-builtin platform control at its exact import site', () => {
+    const violations = platformControlViolations('builtin', `import fs from 'fs'; void fs;`);
+    expect(violations.some((violation) => /\/builtin\.ts imports fs$/u.test(violation))).toBe(true);
   });
 
   it('all runtime entries converge on the pinned session reducer edges', () => {
diff --git a/tests/unit/vtt/worker-boundary.test.ts b/tests/unit/vtt/worker-boundary.test.ts
index bf6a2bd4085482290df782289625c8c8bcf9032b..b0baca931641d2b7e04f384354246b6dcb7f358f
--- a/tests/unit/vtt/worker-boundary.test.ts
+++ b/tests/unit/vtt/worker-boundary.test.ts
@@ -44,9 +44,27 @@
     const isAdapterCall = (): boolean => {
       if (inspectingStack) return false;
       inspectingStack = true;
-      const sourceFrame = new Error().stack?.split('\n').find((frame) => frame.includes('/src/'));
-      inspectingStack = false;
-      return sourceFrame === undefined || /\/src\/vtt\/handoff\/worker-(?:entry|transport|messages|memory-session-store)\.ts/u.test(sourceFrame);
+      try {
+        const frames = new Error().stack?.split('\n') ?? [];
+        if (!frames.some((frame) => frame.includes('/src/vtt/handoff/'))) return false;
+        const establishedEngineWork = [
+          /\/src\/vtt\/dm-encounter-host\.ts/u, // Authoritative detached host capture.
+          /\/src\/vtt\/session-persistence\.ts/u, // Authoritative journal-state copying.
+          /\/src\/combat\//u, // Reducer and visibility-domain projection work.
+          /\/src\/commands\/canonical-json\.ts/u, // Canonical engine-state hashing.
+          /\/src\/vtt\/encounter-board\.ts/u, // Board presentation projection.
+          /\/src\/vtt\/session-timeline\.ts/u, // Timeline projection copying.
+          /\/src\/vtt\/encounter-projections\.ts/u, // Detached immutable capture copying.
+        ];
+        const serializationOrigin = frames.find((frame) => frame.includes('/src/'));
+        if (
+          serializationOrigin !== undefined &&
+          establishedEngineWork.some((pattern) => pattern.test(serializationOrigin))
+        ) return false;
+        return true;
+      } finally {
+        inspectingStack = false;
+      }
     };
     JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
       if (isAdapterCall()) serialization.parse += 1;
@@ -84,10 +102,6 @@
         params: { doorId: 'object:two-room-door', open: true },
       })).resolves.toMatchObject({ id: 'door-event', ok: true });
       expect(serialization).toEqual({ parse: 0, stringify: 0, clone: 0 });
-      const aliasedSerializer = JSON.stringify;
-      aliasedSerializer({ mutationControl: true });
-      expect(serialization.stringify).toBe(1);
-      serialization.stringify = 0;
     } finally {
       JSON.parse = originalParse;
       JSON.stringify = originalStringify;
@@ -99,6 +113,7 @@
       readFileSync('src/vtt/handoff/worker-entry.ts', 'utf8'),
       readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8'),
       readFileSync('src/vtt/handoff/worker-messages.ts', 'utf8'),
+      readFileSync('src/vtt/handoff/worker-message-post.ts', 'utf8'),
       readFileSync('src/vtt/handoff/worker-memory-session-store.ts', 'utf8'),
     ].join('\n');
     expect(adapterSources).not.toMatch(/JSON\.(?:parse|stringify)|structuredClone/u);
@@ -214,6 +229,63 @@
     detach();
   });
 
+  it('passes original object, array and UTF-8 byte inputs to authoritative protocol validation', async () => {
+    const channel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2, { sessionKey: 'original-input-shapes' });
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    await transport.request({ v: 1, id: 'open-inputs', method: 'session.open', params: { requestedRole: 'dm' } });
+
+    await expect(transport.request({
+      v: 1, id: 'unreserved-extra-key', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true }, extra: 'forbidden',
+    })).resolves.toMatchObject({
+      id: 'unreserved-extra-key', ok: false, error: { code: 'INVALID_REQUEST' },
+    });
+    await expect(transport.request({
+      v: 1, id: 'unreserved-extra-key', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    })).resolves.toMatchObject({ id: 'unreserved-extra-key', ok: true });
+
+    await expect(transport.request([
+      { v: 1, id: 'array-id', method: 'scene.snapshot', params: {} },
+    ])).rejects.toMatchObject({ code: 'PROTOCOL_ERROR', websocketCloseCode: 1002 });
+    const encodedSnapshot = new TextEncoder().encode(JSON.stringify({
+      v: 1, id: 'utf8-snapshot', method: 'scene.snapshot', params: {},
+    }));
+    await expect(transport.request(encodedSnapshot))
+      .resolves.toMatchObject({ id: 'utf8-snapshot', ok: true });
+    await expect(transport.request(Uint8Array.from([0xc3, 0x28])))
+      .rejects.toMatchObject({ code: 'INVALID_UTF8', websocketCloseCode: 1007 });
+    transport.dispose();
+    detach();
+  });
+
+  it('correlates a JSON-text mutation receipt and preserves it across observer closure', async () => {
+    const barrier = deferred();
+    let delayResponse = false;
+    const channel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2, {
+      sessionKey: 'json-text-receipt',
+      responseBarrier: () => delayResponse ? barrier.promise : Promise.resolve(),
+    });
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    await transport.request({ v: 1, id: 'open-json', method: 'session.open', params: { requestedRole: 'dm' } });
+    delayResponse = true;
+    transport.subscribe((event) => {
+      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) transport.close();
+    });
+    const committed = await transport.request(JSON.stringify({
+      v: 1, id: 'json-door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }));
+    expect(committed).toMatchObject({ id: 'json-door', ok: true });
+    if (!committed.ok) throw new Error('The JSON-text mutation receipt was not preserved.');
+    expect(committed.result.revision).toBeTypeOf('number');
+    expect(transport.status()).toBe('closed');
+    barrier.resolve();
+    detach();
+  });
+
   it('preserves an established mutation receipt when its snapshot observer closes the transport', async () => {
     const channel = new MessageChannel();
     const detach = attachHandoffWorkerPort(channel.port2);
@@ -341,6 +413,76 @@
     detachFirst(); detachSecond(); detachIndependent();
   });
 
+  it('keeps replacement session identity stable across destroy, stale release and last detach', async () => {
+    const sessionKey = 'replacement-session';
+    const barrierB = deferred();
+    let delayB = false;
+    const channelA = new MessageChannel();
+    const channelB = new MessageChannel();
+    const detachA = attachHandoffWorkerPort(channelA.port2, { sessionKey });
+    const detachB = attachHandoffWorkerPort(channelB.port2, {
+      startAutonomous: false, sessionKey,
+      responseBarrier: () => delayB ? barrierB.promise : Promise.resolve(),
+    });
+    const transportA = new WorkerSceneTransport(channelA.port1, () => undefined);
+    const transportB = new WorkerSceneTransport(channelB.port1, () => undefined);
+    await transportA.request({ v: 1, id: 'open-a', method: 'session.open', params: { requestedRole: 'dm' } });
+    await transportB.request({ v: 1, id: 'open-b', method: 'session.open', params: { requestedRole: 'dm' } });
+    delayB = true;
+    const pendingB = transportB.request({ v: 1, id: 'pending-b', method: 'scene.snapshot', params: {} });
+    const rejectedB = pendingB.catch((error: unknown) => error);
+    transportA.destroySession();
+    expect(await rejectedB).toBeInstanceOf(SceneTransportFaultError);
+    expect(transportB.status()).toBe('closed');
+    barrierB.resolve();
+
+    const channelC = new MessageChannel();
+    const detachC = attachHandoffWorkerPort(channelC.port2, { sessionKey });
+    const transportC = new WorkerSceneTransport(channelC.port1, () => undefined);
+    await transportC.request({ v: 1, id: 'open-c', method: 'session.open', params: { requestedRole: 'dm' } });
+    detachB();
+    const channelD = new MessageChannel();
+    const detachD = attachHandoffWorkerPort(channelD.port2, { startAutonomous: false, sessionKey });
+    const transportD = new WorkerSceneTransport(channelD.port1, () => undefined);
+    await transportD.request({ v: 1, id: 'open-d', method: 'session.open', params: { requestedRole: 'dm' } });
+    const mutationC = await transportC.request({
+      v: 1, id: 'replacement-door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+    expect(mutationC).toMatchObject({ id: 'replacement-door', ok: true });
+    if (!mutationC.ok) throw new Error('Replacement session mutation did not commit.');
+    await expect(transportD.request({ v: 1, id: 'snapshot-d', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({
+        id: 'snapshot-d', ok: true,
+        result: {
+          revision: mutationC.result.revision,
+          doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: true })]),
+        },
+      });
+
+    transportC.dispose();
+    transportD.dispose();
+    detachC(); detachD();
+    const channelE = new MessageChannel();
+    const detachE = attachHandoffWorkerPort(channelE.port2, { startAutonomous: false, sessionKey });
+    const transportE = new WorkerSceneTransport(channelE.port1, () => undefined);
+    const initialE = transportE.initialSnapshot();
+    await transportE.request({ v: 1, id: 'open-e', method: 'session.open', params: { requestedRole: 'dm' } });
+    await expect(initialE).resolves.toMatchObject({ revision: 0 });
+
+    const isolatedChannel = new MessageChannel();
+    const detachIsolated = attachHandoffWorkerPort(isolatedChannel.port2, {
+      startAutonomous: false, sessionKey: 'replacement-session-independent',
+    });
+    const isolated = new WorkerSceneTransport(isolatedChannel.port1, () => undefined);
+    await isolated.request({ v: 1, id: 'open-isolated', method: 'session.open', params: { requestedRole: 'dm' } });
+    await expect(isolated.request({ v: 1, id: 'isolated-snapshot', method: 'scene.snapshot', params: {} }))
+      .resolves.toMatchObject({ id: 'isolated-snapshot', ok: true, result: { revision: 0 } });
+    transportE.dispose();
+    isolated.dispose();
+    detachA(); detachE(); detachIsolated();
+  });
+
   it('binds a player port to its seat, filters its projection and never applies a DM receipt to its read', async () => {
     const barrier = deferred();
     let delayPlayer = false;
