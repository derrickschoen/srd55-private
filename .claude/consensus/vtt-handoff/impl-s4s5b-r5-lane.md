Implemented F58–F60.

Changes:

- Invocation tokens now expose no runtime provenance and are accepted only by exact object identity from the originating runtime’s private mint registry.
- Tokens are consumed synchronously on first dispatch. Constructed, reused, or foreign tokens receive fresh internal identities without throwing.
- Runtime close/dispose/destroy clears minted and active invocation tracking in terminal cleanup, including throwing paths.
- Synchronous dispatcher exceptions are converted into rejected transport promises and removed from pending tracking.
- Added the Zod-upgrade recheck comment.
- Expanded the validation corpus from 30 to 33 cases with `v: 2`, `v: "1"`, and missing `v`, while distinguishing synchronous throws from rejected promises.

Modified files:

- [encounter-session-service.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-session-service.ts:42)
- [protocol-runtime.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:212)
- [in-process-transport.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/in-process-transport.ts:93)
- [protocol-runtime.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:494)
- [in-process-transport.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:512)

Verification:

- Focused protocol command:
  `npx vitest run --configLoader runner tests/unit/vtt/protocol-runtime.test.ts -t "privately minted|concurrent dispatches|validation equivalent"`
  — exit 0; 3 passed, 22 skipped.
- Focused transport command:
  `npx vitest run --configLoader runner tests/unit/vtt/in-process-transport.test.ts -t "committed .* observer closes|synchronous dispatcher exceptions"`
  — exit 0; 3 passed, 16 skipped.
- Runtime preflight: 3 files, 66/66 tests.
- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0, no findings.
- `git diff --check` — exit 0.
- `npm run test:engine` — exit 0; 4 files, 41/41 tests.
- `npm run test:protocol` — exit 0; 4 files, 53/53 tests.
- F54:
  `npx vitest run --configLoader runner tests/unit/vtt/in-process-transport.test.ts -t "uses zero serialization for object transport"`
  — exit 0; 1 passed, 18 skipped; `JSON.parse=0`, `JSON.stringify=0`, `structuredClone=0`.
- S0–S5b cumulative suite covered the specified 14 files: package contract, bootstrap, handoff contract, scene snapshot, two-room fixture, publisher, examples, session lifecycle, encounter service, door intent, selectors, protocol runtime, in-process transport, and engine boundary.
  — exit 0; 14 files, 124/124 tests.
- Fresh isolated publication:
  `VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff-s5b-r5 npm run handoff:publish`
  — exit 0; core 8 files, examples 3 files.
- Isolated check:
  `VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff-s5b-r5 npm run handoff:publish -- --check`
  — exit 0; core 8 verified, examples 3 verified.

No `it(...)` or `expect(...)` was removed or weakened. Protected paths are unchanged. Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`; examples remain unchanged at `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`. No git writes were performed.

HANDOFF S4-S5B R5 DONE
diff --git a/src/vtt/encounter-session-service.ts b/src/vtt/encounter-session-service.ts
index e3d5f47ab9d5f0898b15e087450eb08b2a21b0f3..caea3062cc1ea455f6a066c54f980d64b63f23a1
--- a/src/vtt/encounter-session-service.ts
+++ b/src/vtt/encounter-session-service.ts
@@ -40,7 +40,6 @@
 
 /** Process-local identity for exactly one protocol invocation. */
 export interface SessionInvocationToken {
-  readonly runtime: symbol;
   readonly invocation: symbol;
 }
 
diff --git a/src/vtt/handoff/in-process-transport.ts b/src/vtt/handoff/in-process-transport.ts
index 3f7b5bbbfdac7a8273e2ab84d9973c76e0f535de..c3b2db2739be3ffadecdeda2ecc1913962c862ab
--- a/src/vtt/handoff/in-process-transport.ts
+++ b/src/vtt/handoff/in-process-transport.ts
@@ -93,12 +93,20 @@
       receiptRevision: null,
     };
     this.#pending.add(pending);
-    void this.runtime.dispatch(request, undefined, invocationToken, (response) => {
-      if (
-        this.#pending.has(pending) &&
-        (pending.method === 'token.move' || pending.method === 'door.set' || pending.method === 'light.set')
-      ) pending.establishedResponse = response;
-    }).then((result) => {
+    let dispatched: ReturnType<ProtocolRuntime['dispatch']>;
+    try {
+      dispatched = this.runtime.dispatch(request, undefined, invocationToken, (response) => {
+        if (
+          this.#pending.has(pending) &&
+          (pending.method === 'token.move' || pending.method === 'door.set' || pending.method === 'light.set')
+        ) pending.establishedResponse = response;
+      });
+    } catch (error: unknown) {
+      this.#pending.delete(pending);
+      pending.reject(error instanceof Error ? error : new Error(String(error)));
+      return pending.promise;
+    }
+    void dispatched.then((result) => {
       if (!this.#pending.delete(pending)) return;
       if (result.kind === 'transport_fault') {
         pending.reject(new SceneTransportFaultError(result.fault));
@@ -135,6 +143,10 @@
     return this.#state;
   }
 
+  pendingRequestCount(): number {
+    return this.#pending.size;
+  }
+
   subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void {
     try { listener(this.#state); } catch { /* Observer failure is isolated. */ }
     if (this.#state === 'closed' || this.#state === 'disposed') return () => undefined;
diff --git a/src/vtt/handoff/protocol-runtime.ts b/src/vtt/handoff/protocol-runtime.ts
index a020a1da8a64e9291d62994ea72322fed78ce4ea..7b1448a594f5c855e862e4c4dfec71fe77330a82
--- a/src/vtt/handoff/protocol-runtime.ts
+++ b/src/vtt/handoff/protocol-runtime.ts
@@ -68,6 +68,7 @@
 // Warm Zod's generated validators before object transport is measured. Dispatch invokes
 // those authoritative schemas through `_zod.run` so invalid input does not materialize a
 // ZodError (whose formatter serializes issues) inside the zero-serialization boundary.
+// Recheck this exact-pinned internal boundary whenever Zod is upgraded.
 const validatorWarmups: readonly HandoffRequest[] = [
   { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } },
   { v: 1, id: '', method: 'scene.snapshot', params: {} },
@@ -208,7 +209,7 @@
   readonly #authorizer: SessionAuthorizer;
   readonly #art: EncounterArtPackage;
   readonly #session: LogicalSessionAuthority;
-  readonly #runtimeIdentity = Symbol('protocol-runtime');
+  readonly #mintedInvocationTokens = new Map<SessionInvocationToken, 'minted'>();
   readonly #activeMutationInvocations = new Set<SessionInvocationToken>();
   readonly #eventListeners = new Set<(
     event: SceneSnapshotEvent,
@@ -241,7 +242,15 @@
   }
 
   createInvocationToken(): SessionInvocationToken {
-    return Object.freeze({ runtime: this.#runtimeIdentity, invocation: Symbol('protocol-invocation') });
+    const token = Object.freeze({ invocation: Symbol('protocol-invocation') });
+    if (!this.#closed && !this.#disposed && !this.#session.destroyed) {
+      this.#mintedInvocationTokens.set(token, 'minted');
+    }
+    return token;
+  }
+
+  invocationTrackingCounts(): { readonly minted: number; readonly active: number } {
+    return { minted: this.#mintedInvocationTokens.size, active: this.#activeMutationInvocations.size };
   }
 
   dispatch(
@@ -254,6 +263,9 @@
       onResponseEstablished?.(response);
       return Promise.resolve({ kind: 'response', response });
     };
+    const token = this.#disposed || this.#closed || this.#session.destroyed
+      ? null
+      : this.#consumeInvocationToken(invocationToken);
     const decoded = decodedInput(input);
     if (!('ok' in decoded)) {
       this.#emitFault(decoded.fault);
@@ -269,7 +281,7 @@
       if (result.kind === 'transport_fault') this.#emitFault(result.fault);
       return Promise.resolve(result);
     }
-    if (this.#disposed || this.#closed || this.#session.destroyed) {
+    if (token === null) {
       return respond(failure(id, 'CLOSED', 'The logical transport is closed.'));
     }
     const structural = genericHandoffRequestSchema._zod.run(
@@ -292,9 +304,6 @@
     if (known.issues.length > 0) {
       return respond(failure(id, 'INVALID_REQUEST', 'The request parameters are invalid.'));
     }
-    const token = invocationToken?.runtime === this.#runtimeIdentity
-      ? invocationToken
-      : this.createInvocationToken();
     const dispatched = this.#dispatchKnown(known.value as HandoffRequest, token, signal);
     if (dispatched instanceof Promise) {
       return dispatched.then((response) => {
@@ -313,6 +322,7 @@
     try {
       unsubscribe?.();
     } finally {
+      this.#clearInvocationTracking();
       this.#eventListeners.clear();
       this.#faultListeners.clear();
     }
@@ -320,8 +330,12 @@
 
   dispose(): void {
     if (this.#disposed) return;
-    this.close();
-    this.#disposed = true;
+    try {
+      this.close();
+    } finally {
+      this.#disposed = true;
+      this.#clearInvocationTracking();
+    }
   }
 
   destroySession(): void {
@@ -329,6 +343,7 @@
     const errors: unknown[] = [];
     try { this.close(); } catch (error: unknown) { errors.push(error); }
     try { this.#session.destroy(); } catch (error: unknown) { errors.push(error); }
+    this.#clearInvocationTracking();
     if (errors.length === 1) throw errors[0];
     if (errors.length > 1) throw new AggregateError(errors, 'Runtime and session cleanup both failed.');
   }
@@ -380,6 +395,19 @@
     return response.finally(() => this.#activeMutationInvocations.delete(invocationToken));
   }
 
+  #consumeInvocationToken(supplied?: SessionInvocationToken): SessionInvocationToken {
+    if (supplied !== undefined && this.#mintedInvocationTokens.delete(supplied)) {
+      return supplied;
+    }
+    // Foreign and already-consumed objects receive a fresh, already-consumed internal identity.
+    return Object.freeze({ invocation: Symbol('protocol-invocation') });
+  }
+
+  #clearInvocationTracking(): void {
+    this.#activeMutationInvocations.clear();
+    this.#mintedInvocationTokens.clear();
+  }
+
   #reserve(id: string): boolean {
     return this.#session.ledger.reserve(id).reserved;
   }
diff --git a/tests/unit/vtt/in-process-transport.test.ts b/tests/unit/vtt/in-process-transport.test.ts
index deaff8f749bd39cff7840875e5823a7ab2bff191..1e334b4873e32ce88f500dcab7d4a430afd7b691
--- a/tests/unit/vtt/in-process-transport.test.ts
+++ b/tests/unit/vtt/in-process-transport.test.ts
@@ -268,8 +268,10 @@
           seats: [seat],
           art: twoRoomArtPackage(),
         });
-      const dm = new InProcessSceneTransport(makeRuntime({ role: 'dm' }));
-      const player = new InProcessSceneTransport(makeRuntime({ role: 'player', playerId: seat.playerId }));
+      const dmRuntime = makeRuntime({ role: 'dm' });
+      const playerRuntime = makeRuntime({ role: 'player', playerId: seat.playerId });
+      const dm = new InProcessSceneTransport(dmRuntime);
+      const player = new InProcessSceneTransport(playerRuntime);
       await dm.request({ v: 1, id: 'open:dm', method: 'session.open', params: { requestedRole: 'dm' } });
       await player.request({
         v: 1, id: 'open:player', method: 'session.open',
@@ -280,11 +282,14 @@
       const pending = await offerPromise;
       const expectedRevision = pending.encounterRevision + 1;
       const closingTransport = kind === 'move' ? player : dm;
+      const closingRuntime = kind === 'move' ? playerRuntime : dmRuntime;
+      const statuses: string[] = [];
+      closingTransport.subscribeStatus((status) => statuses.push(status));
       closingTransport.subscribe((event) => {
         if (event.data.revision === expectedRevision) closingTransport.close();
       });
-      const response = kind === 'move'
-        ? await (() => {
+      const responsePromise = kind === 'move'
+        ? (() => {
           const move = pending.legalActions[0];
           const binding = host.rendererTokenBindings().find((candidate) => candidate.combatantId === pending.actorId);
           if (move?.type !== 'move' || binding === undefined) throw new Error('Expected the receipt move offer.');
@@ -295,16 +300,31 @@
             params: { tokenId: binding.tokenId, to: { x: destination.column, y: destination.row, z: 0 } },
           });
         })()
-        : await dm.request({
+        : dm.request({
           v: 1, id: 'mutation:door', method: 'door.set',
           params: { doorId: 'object:two-room-door', open: true },
         });
+      let settlements = 0;
+      const response = await responsePromise.then(
+        (value) => {
+          settlements += 1;
+          return value;
+        },
+        (error: unknown) => {
+          settlements += 1;
+          throw error;
+        },
+      );
       expect(response).toMatchObject({ ok: true, result: { revision: expectedRevision } });
       expect(closingTransport.status()).toBe('closed');
+      expect(closingRuntime.invocationTrackingCounts()).toEqual({ minted: 0, active: 0 });
       expect(delayed.crossed()).toBe(false);
       delayed.release();
       await delayed.completion;
       expect(delayed.crossed()).toBe(true);
+      expect(closingTransport.status()).toBe('closed');
+      expect(statuses).toEqual(['open', 'closed']);
+      expect(settlements).toBe(1);
       dm.destroySession();
       host.close();
     },
@@ -489,6 +509,43 @@
     host.close();
   });
 
+  it('turns synchronous dispatcher exceptions into settled request rejections without orphaning pending work', async () => {
+    const { host, runtime } = fixture();
+    const transport = new InProcessSceneTransport(runtime);
+    const throwingAccessor = { v: 1, id: 'throwing-transport-accessor', method: 'scene.snapshot' };
+    Object.defineProperty(throwingAccessor, 'params', {
+      enumerable: true,
+      get: () => { throw new Error('injected transport request accessor failure'); },
+    });
+    let rejected: Promise<HandoffResponse> | undefined;
+    expect(() => {
+      rejected = transport.request(throwingAccessor);
+    }).not.toThrow();
+    if (rejected === undefined) throw new Error('Expected transport.request to return a promise.');
+    let settlements = 0;
+    const observed = rejected.then(
+      (response) => {
+        settlements += 1;
+        return response;
+      },
+      (error: unknown) => {
+        settlements += 1;
+        throw error;
+      },
+    );
+    await expect(observed).rejects.toThrow('injected transport request accessor failure');
+    expect(transport.pendingRequestCount()).toBe(0);
+
+    await expect(transport.request(OPEN)).resolves.toMatchObject({ id: '', ok: true });
+    expect(transport.pendingRequestCount()).toBe(0);
+    transport.close();
+    await Promise.resolve();
+    expect(settlements).toBe(1);
+    expect(transport.pendingRequestCount()).toBe(0);
+    runtime.destroySession();
+    host.close();
+  });
+
   it('does not treat an unrelated autonomous event as receipt evidence for a pending request', async () => {
     const { host, port, runtime } = fixture();
     const transport = new InProcessSceneTransport(runtime);
diff --git a/tests/unit/vtt/protocol-runtime.test.ts b/tests/unit/vtt/protocol-runtime.test.ts
index b5666521669897cf44dd4e8cfab6d8f103d14b6a..07bab84514bff12202a4ad4ff7ea0273126fd86f
--- a/tests/unit/vtt/protocol-runtime.test.ts
+++ b/tests/unit/vtt/protocol-runtime.test.ts
@@ -6,6 +6,7 @@
   DoorSetOutcome,
   PlayerSessionSnapshotEvent,
   PlayerSubscriptionResult,
+  SessionInvocationToken,
   SessionMutationOutcome,
 } from '../../../src/vtt/encounter-session-service';
 import {
@@ -258,6 +259,9 @@
 }
 
 interface MutableProtocolPort extends ProtocolSessionPort {
+  emitDm(event: Omit<DmSessionSnapshotEvent, 'tokenBindings'> & {
+    readonly tokenBindings?: DmSessionSnapshotEvent['tokenBindings'];
+  }): void;
   emitPlayer(playerId: string, event: Omit<PlayerSessionSnapshotEvent, 'tokenBindings'> & {
     readonly tokenBindings?: PlayerSessionSnapshotEvent['tokenBindings'];
   }): void;
@@ -310,7 +314,7 @@
   readonly playerA: PlayerBoardProjection;
   readonly playerB: PlayerBoardProjection;
   readonly tokenBindings: ReturnType<DmEncounterHost['rendererTokenBindings']>;
-}): MutableProtocolPort {
+}, sessionId = 'scene:protocol-test'): MutableProtocolPort {
   const playerProjections = new Map<string, PlayerBoardProjection>([
     [PLAYER_A, input.playerA],
     [PLAYER_B, input.playerB],
@@ -321,7 +325,7 @@
   let closes = 0;
   let tokenBindings = input.tokenBindings;
   return {
-    sessionId: 'scene:protocol-test',
+    sessionId,
     dmSnapshot: () => input.dm,
     dmCapture: () => ({ projection: input.dm, tokenBindings }),
     playerSnapshot: (playerId) => playerId === undefined ? null : playerProjections.get(playerId) ?? null,
@@ -351,6 +355,11 @@
       return { kind: 'committed', revision: input.dm.encounter.revision, changed: false };
     },
     close: () => { closes += 1; },
+    emitDm: (event) => {
+      for (const listener of dmListeners) {
+        listener({ ...event, tokenBindings: event.tokenBindings ?? tokenBindings });
+      }
+    },
     emitPlayer: (playerId, event) => {
       playerProjections.set(playerId, event.projection);
       for (const listener of playerListeners.get(playerId) ?? []) {
@@ -363,6 +372,46 @@
   };
 }
 
+function receiptPort(
+  input: ReturnType<typeof projections>,
+  sessionId: string,
+  barrierCount = 0,
+): {
+  readonly port: ProtocolSessionPort;
+  readonly release: (index: number) => void;
+} {
+  const base = mutablePort(input, sessionId);
+  const releases: Array<(() => void) | undefined> = [];
+  const barriers = Array.from({ length: barrierCount }, (_, index) => new Promise<void>((resolve) => {
+    releases[index] = resolve;
+  }));
+  let calls = 0;
+  return {
+    port: {
+      ...base,
+      setDoor: async (request): Promise<DoorSetOutcome> => {
+        const call = calls;
+        calls += 1;
+        const barrier = barriers[call];
+        if (barrier !== undefined) await barrier;
+        const revision = input.dm.encounter.revision + call + 1;
+        const event = {
+          kind: 'mutation',
+          seq: calls,
+          projection: input.dm,
+          tokenBindings: input.tokenBindings,
+          ...(request.invocationToken === undefined
+            ? {}
+            : { terminalReceipt: { invocationToken: request.invocationToken, revision } }),
+        } satisfies DmSessionSnapshotEvent;
+        base.emitDm(event);
+        return { kind: 'committed', revision, changed: true, event };
+      },
+    },
+    release: (index) => releases[index]?.(),
+  };
+}
+
 const SEATS = [
   { playerId: PLAYER_A, controlledTokenIds: [TOKEN_A] },
   { playerId: PLAYER_B, controlledTokenIds: [TOKEN_B] },
@@ -442,6 +491,98 @@
     source.closeHost();
   });
 
+  it('accepts only privately minted single-use invocation tokens from the originating runtime', async () => {
+    const source = projections();
+    const firstPort = receiptPort(source, 'scene:private-invocation:first').port;
+    const secondPort = receiptPort(source, 'scene:private-invocation:second').port;
+    const first = runtimeFor(firstPort, { role: 'dm' });
+    const second = runtimeFor(secondPort, { role: 'dm' });
+    const firstReceipts: SessionInvocationToken[] = [];
+    const secondReceipts: SessionInvocationToken[] = [];
+    first.subscribe((_event, receipt) => {
+      if (receipt !== undefined) firstReceipts.push(receipt.invocationToken);
+    });
+    second.subscribe((_event, receipt) => {
+      if (receipt !== undefined) secondReceipts.push(receipt.invocationToken);
+    });
+    await first.dispatch({
+      v: 1, id: 'open:first-private-invocation', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    await second.dispatch({
+      v: 1, id: 'open:second-private-invocation', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+
+    const minted = first.createInvocationToken();
+    const constructed = Object.freeze({ ...minted, invocation: Symbol('constructed-invocation') });
+    await expect(first.dispatch({
+      v: 1, id: 'door:constructed-invocation', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }, undefined, constructed)).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
+    expect(firstReceipts).toHaveLength(1);
+    expect(firstReceipts[0]).not.toBe(constructed);
+    expect(first.invocationTrackingCounts().minted).toBe(1);
+
+    await expect(first.dispatch({
+      v: 1, id: 'door:minted-invocation', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: false },
+    }, undefined, minted)).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
+    expect(firstReceipts).toHaveLength(2);
+    expect(firstReceipts[1]).toBe(minted);
+    expect(first.invocationTrackingCounts().minted).toBe(0);
+
+    const foreign = first.createInvocationToken();
+    await expect(second.dispatch({
+      v: 1, id: 'door:foreign-invocation', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }, undefined, foreign)).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
+    expect(secondReceipts).toHaveLength(1);
+    expect(secondReceipts[0]).not.toBe(foreign);
+    expect(first.invocationTrackingCounts().minted).toBe(1);
+    expect(second.invocationTrackingCounts().minted).toBe(0);
+
+    first.destroySession();
+    second.destroySession();
+    source.closeHost();
+  });
+
+  it('gives concurrent dispatches independent receipt eligibility when a minted token is reused', async () => {
+    const source = projections();
+    const controlled = receiptPort(source, 'scene:reused-invocation', 2);
+    const runtime = runtimeFor(controlled.port, { role: 'dm' });
+    const receipts: SessionInvocationToken[] = [];
+    runtime.subscribe((_event, receipt) => {
+      if (receipt !== undefined) receipts.push(receipt.invocationToken);
+    });
+    await runtime.dispatch({
+      v: 1, id: 'open:reused-invocation', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    const reused = runtime.createInvocationToken();
+    const first = runtime.dispatch({
+      v: 1, id: 'door:reused-invocation:first', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }, undefined, reused);
+    const second = runtime.dispatch({
+      v: 1, id: 'door:reused-invocation:second', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: false },
+    }, undefined, reused);
+    expect(runtime.invocationTrackingCounts()).toEqual({ minted: 0, active: 2 });
+
+    controlled.release(0);
+    await expect(first).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
+    expect(receipts).toEqual([reused]);
+    expect(runtime.invocationTrackingCounts().active).toBe(1);
+
+    controlled.release(1);
+    await expect(second).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
+    expect(receipts).toHaveLength(2);
+    expect(receipts[1]).not.toBe(reused);
+    expect(new Set(receipts).size).toBe(2);
+    expect(runtime.invocationTrackingCounts().active).toBe(0);
+
+    runtime.destroySession();
+    source.closeHost();
+  });
+
   it('keeps object-transport validation equivalent to the authoritative v1 Zod contracts', async () => {
     class RequestInstance {
       readonly v = 1;
@@ -484,6 +625,9 @@
     const corpus: readonly { readonly label: string; readonly value: unknown }[] = [
       { label: 'open-positive', value: { v: 1, id: 'positive-open', method: 'session.open', params: { requestedRole: 'dm' } } },
       { label: 'snapshot-positive', value: { v: 1, id: 'positive-snapshot', method: 'scene.snapshot', params: {} } },
+      { label: 'wrong-v-number', value: { v: 2, id: 'wrong-v-number', method: 'scene.snapshot', params: {} } },
+      { label: 'wrong-v-string', value: { v: '1', id: 'wrong-v-string', method: 'scene.snapshot', params: {} } },
+      { label: 'missing-v', value: { id: 'missing-v', method: 'scene.snapshot', params: {} } },
       { label: 'move-positive', value: { v: 1, id: 'positive-move', method: 'token.move', params: { tokenId: '', to: { x: -1, y: 0.5, z: 0 } } } },
       { label: 'door-positive', value: { v: 1, id: 'positive-door', method: 'door.set', params: { doorId: '', open: false } } },
       { label: 'light-positive', value: { v: 1, id: 'positive-light', method: 'light.set', params: { lightId: '', enabled: true } } },
@@ -515,6 +659,7 @@
     ];
     const expected = new Map<string, 'accepted' | 'rejected' | 'throws'>([
       ['open-positive', 'accepted'], ['snapshot-positive', 'accepted'], ['move-positive', 'accepted'],
+      ['wrong-v-number', 'rejected'], ['wrong-v-string', 'rejected'], ['missing-v', 'rejected'],
       ['door-positive', 'accepted'], ['light-positive', 'accepted'], ['open-negative', 'rejected'],
       ['snapshot-negative', 'rejected'], ['move-negative', 'rejected'], ['door-negative', 'rejected'],
       ['light-negative', 'rejected'], ['generic-extension', 'accepted'], ['date-params', 'rejected'],
@@ -539,14 +684,17 @@
     };
     const source = projections();
     const runtime = runtimeFor(mutablePort(source), { role: 'dm' });
-    const runtimeDisposition = async (value: unknown): Promise<'accepted' | 'rejected' | 'throws'> => {
+    const runtimeDisposition = (value: unknown): Promise<'accepted' | 'rejected' | 'throws' | 'promise-rejected'> => {
+      let dispatched: ReturnType<ProtocolRuntime['dispatch']>;
       try {
-        const result = await runtime.dispatch(value);
+        dispatched = runtime.dispatch(value);
+      } catch {
+        return Promise.resolve('throws');
+      }
+      return dispatched.then((result) => {
         if (result.kind === 'transport_fault') return 'rejected';
         return !result.response.ok && result.response.error.code === 'INVALID_REQUEST' ? 'rejected' : 'accepted';
-      } catch {
-        return 'throws';
-      }
+      }, () => 'promise-rejected');
     };
     for (const entry of corpus) {
       const contractDisposition = schemaDisposition(entry.value);
