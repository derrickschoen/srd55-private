Implemented F61.

- Token consumption remains before caller-controlled accessors.
- Live terminal state is rechecked after Zod validation and immediately before open, snapshot capture, mutation reservation/tracking, and service submission.
- Accessor-triggered closure cannot reserve IDs, repopulate tracking, or call the service.
- Added six direct real-host cases covering close/dispose/destroy, ID/params getters, and door/snapshot operations.
- Added four transport cases with an earlier committed mutation held behind a response barrier. The earlier receipt settles exactly once; the attempted later operation is blocked.

Modified:

- [protocol-runtime.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:266)
- [protocol-runtime.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:594)
- [in-process-transport.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:313)

Verification:

- F61 direct runtime:
  `npx vitest run --configLoader runner tests/unit/vtt/protocol-runtime.test.ts -t "lifecycle closure"`
  — exit 0; 6 passed.
- F61 transport:
  `npx vitest run --configLoader runner tests/unit/vtt/in-process-transport.test.ts -t "getter transport closure"`
  — exit 0; 4 passed.
- Runtime preflight — 3 files, 76/76 tests.
- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- `npm run test:engine` — exit 0; 4 files, 41/41 tests.
- `npm run test:protocol` — exit 0; 4 files, 63/63 tests.
- F54 zero-serialization measurement — exit 0; `JSON.parse=0`, `JSON.stringify=0`, `structuredClone=0`.
- Specified 14-file S0–S5b cumulative suite — exit 0; 14 files, 134/134 tests.
- Fresh isolated publish:
  `VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff-s5b-r6 npm run handoff:publish`
  — exit 0; core 8 files, examples 3.
- Isolated check:
  `VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff-s5b-r6 npm run handoff:publish -- --check`
  — exit 0; core 8 verified, examples 3 verified.

No tests or assertions were removed or weakened. Protected paths are unchanged. Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`; examples remain `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`. No git writes were performed.

HANDOFF S4-S5B R6 DONE
diff --git a/src/vtt/handoff/protocol-runtime.ts b/src/vtt/handoff/protocol-runtime.ts
index 7b1448a594f5c855e862e4c4dfec71fe77330a82..3caf632e1345a377d8d80d5385f7d431db1c27e8
--- a/src/vtt/handoff/protocol-runtime.ts
+++ b/src/vtt/handoff/protocol-runtime.ts
@@ -263,7 +263,7 @@
       onResponseEstablished?.(response);
       return Promise.resolve({ kind: 'response', response });
     };
-    const token = this.#disposed || this.#closed || this.#session.destroyed
+    const token = this.#isTerminal()
       ? null
       : this.#consumeInvocationToken(invocationToken);
     const decoded = decodedInput(input);
@@ -280,9 +280,6 @@
       );
       if (result.kind === 'transport_fault') this.#emitFault(result.fault);
       return Promise.resolve(result);
-    }
-    if (token === null) {
-      return respond(failure(id, 'CLOSED', 'The logical transport is closed.'));
     }
     const structural = genericHandoffRequestSchema._zod.run(
       { value: decoded.value, issues: [] },
@@ -304,6 +301,9 @@
     if (known.issues.length > 0) {
       return respond(failure(id, 'INVALID_REQUEST', 'The request parameters are invalid.'));
     }
+    if (token === null || this.#isTerminal()) {
+      return respond(this.#closedResponse(id));
+    }
     const dispatched = this.#dispatchKnown(known.value as HandoffRequest, token, signal);
     if (dispatched instanceof Promise) {
       return dispatched.then((response) => {
@@ -357,33 +357,41 @@
       case 'session.open':
         return this.#open(request.id, request.params.requestedRole, request.params.playerId);
       case 'scene.snapshot': {
+        if (this.#isTerminal()) return this.#closedResponse(request.id);
         const capture = this.#capture();
         return capture === null
           ? failure(request.id, 'SESSION_NOT_OPEN', 'Open the session before requesting a snapshot.')
           : success(request.id, this.#snapshot(capture));
       }
       case 'token.move':
+        if (this.#isTerminal()) return this.#closedResponse(request.id);
         if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
         return this.#trackMutation(
+          request.id,
           invocationToken,
           () => this.#move(request.id, request.params.tokenId, request.params.to, invocationToken, signal),
         );
       case 'door.set':
+        if (this.#isTerminal()) return this.#closedResponse(request.id);
         if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
         return this.#trackMutation(
+          request.id,
           invocationToken,
           () => this.#door(request.id, request.params.doorId, request.params.open, invocationToken),
         );
       case 'light.set':
+        if (this.#isTerminal()) return this.#closedResponse(request.id);
         if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
         return failure(request.id, 'UNSUPPORTED', 'The encounter engine has no light toggle mechanic.');
     }
   }
 
   #trackMutation(
+    requestId: string,
     invocationToken: SessionInvocationToken,
     operation: () => Promise<HandoffResponse>,
-  ): Promise<HandoffResponse> {
+  ): HandoffResponse | Promise<HandoffResponse> {
+    if (this.#isTerminal()) return this.#closedResponse(requestId);
     this.#activeMutationInvocations.add(invocationToken);
     let response: Promise<HandoffResponse>;
     try {
@@ -408,11 +416,20 @@
     this.#mintedInvocationTokens.clear();
   }
 
+  #isTerminal(): boolean {
+    return this.#disposed || this.#closed || this.#session.destroyed;
+  }
+
+  #closedResponse(id: string): HandoffFailureResponse {
+    return failure(id, 'CLOSED', 'The logical transport is closed.');
+  }
+
   #reserve(id: string): boolean {
     return this.#session.ledger.reserve(id).reserved;
   }
 
   #open(id: string, role: 'dm' | 'player', playerId?: string): HandoffResponse {
+    if (this.#isTerminal()) return this.#closedResponse(id);
     if (this.#audience !== null) return failure(id, 'ALREADY_OPEN', 'The logical session is already open.');
     const authorization = this.#authorizer.authorizeOpen(this.#principal, role, playerId);
     if (!authorization.authorized) return failure(id, authorization.code, authorization.message);
@@ -453,6 +470,7 @@
     invocationToken: SessionInvocationToken,
     signal?: AbortSignal,
   ): Promise<HandoffResponse> {
+    if (this.#isTerminal()) return this.#closedResponse(id);
     if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
     const authorization = this.#authorizer.authorizeToken(this.#principal, tokenId);
     if (!authorization.authorized) return failure(id, authorization.code, authorization.message);
@@ -488,6 +506,7 @@
     const optionIndex = matchingIndexes[0];
     const offeredActionId = optionIndex === undefined ? undefined : pending.offeredActionIds[optionIndex];
     if (offeredActionId === undefined) return failure(id, 'ILLEGAL_MOVE', 'The matching offer has no option id.');
+    if (this.#isTerminal()) return this.#closedResponse(id);
     const outcome = await this.#service.submitOfferedAction({
       playerId: this.#principal.playerId,
       tokenId,
@@ -506,8 +525,10 @@
     open: boolean,
     invocationToken: SessionInvocationToken,
   ): Promise<HandoffResponse> {
+    if (this.#isTerminal()) return this.#closedResponse(id);
     if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
     if (this.#principal.role !== 'dm') return failure(id, 'FORBIDDEN', 'Players cannot change door state.');
+    if (this.#isTerminal()) return this.#closedResponse(id);
     const outcome = await this.#service.setDoor({ invocationToken, principal: { kind: 'dm' }, doorId, open });
     switch (outcome.kind) {
       case 'committed': return success(id, { revision: outcome.revision });
diff --git a/tests/unit/vtt/in-process-transport.test.ts b/tests/unit/vtt/in-process-transport.test.ts
index 1e334b4873e32ce88f500dcab7d4a430afd7b691..0fecc7e68327f4041b8e87369815706a1ae07362
--- a/tests/unit/vtt/in-process-transport.test.ts
+++ b/tests/unit/vtt/in-process-transport.test.ts
@@ -331,6 +331,123 @@
   );
 
   it.each([
+    ['id', 'door.set'],
+    ['params', 'door.set'],
+    ['id', 'scene.snapshot'],
+    ['params', 'scene.snapshot'],
+  ] as const)(
+    'blocks real-host %s-getter transport closure before submitting %s',
+    async (accessor, method) => {
+      const state = buildTwoRoomEncounter();
+      const host = new DmEncounterHost(`scene:transport-getter-close:${accessor}:${method}`, new MemoryBrowserSessionStore(), {
+        initialState: state,
+        initialControllers: state.combatants.map((combatant) => ({
+          combatantId: combatant.profile.id,
+          controllerId: `${combatant.profile.id}:transport-getter-close`,
+          kind: 'human' as const,
+          generation: 0,
+        })),
+        playerIds: state.combatants.map((combatant) => combatant.profile.id),
+        turnLegalActions: closingMoveActions,
+      });
+      const seat = closingSeat(host);
+      const service = new EncounterSessionService(host, [seat]);
+      const setDoor = vi.spyOn(service, 'setDoor');
+      const delayed = delayedResponsePort(service);
+      const runtime = new ProtocolRuntime({
+        service: delayed.port,
+        principal: { role: 'dm' },
+        seats: [seat],
+        art: twoRoomArtPackage(),
+      });
+      const transport = new InProcessSceneTransport(runtime);
+      await transport.request({
+        v: 1, id: `open:transport-getter:${accessor}:${method}`,
+        method: 'session.open', params: { requestedRole: 'dm' },
+      });
+      const offerPromise = closingOffer(service, seat.playerId);
+      void service.start();
+      const pendingOffer = await offerPromise;
+      const expectedRevision = pendingOffer.encounterRevision + 1;
+      let blockedOutcome: Promise<
+        | { readonly kind: 'response'; readonly response: HandoffResponse }
+        | { readonly kind: 'error'; readonly error: unknown }
+      > | undefined;
+      transport.subscribe((event) => {
+        if (event.data.revision !== expectedRevision || blockedOutcome !== undefined) return;
+        const request: Record<string, unknown> = { v: 1, method };
+        if (accessor === 'id') {
+          Object.defineProperty(request, 'id', {
+            enumerable: true,
+            get: () => {
+              transport.close();
+              return `blocked:${method}`;
+            },
+          });
+          request.params = method === 'door.set'
+            ? { doorId: 'object:two-room-door', open: false }
+            : {};
+        } else {
+          request.id = `blocked:${method}`;
+          Object.defineProperty(request, 'params', {
+            enumerable: true,
+            get: () => {
+              transport.close();
+              return method === 'door.set'
+                ? { doorId: 'object:two-room-door', open: false }
+                : {};
+            },
+          });
+        }
+        blockedOutcome = transport.request(request).then(
+          (response) => ({ kind: 'response' as const, response }),
+          (error: unknown) => ({ kind: 'error' as const, error }),
+        );
+      });
+
+      let committedSettlements = 0;
+      const committed = transport.request({
+        v: 1, id: `committed-before-getter:${accessor}:${method}`, method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: true },
+      }).then((response) => {
+        committedSettlements += 1;
+        return response;
+      });
+      await expect(committed).resolves.toMatchObject({ ok: true, result: { revision: expectedRevision } });
+      if (blockedOutcome === undefined) throw new Error('Expected the snapshot observer to dispatch the closing request.');
+      const blocked = await blockedOutcome;
+      if (accessor === 'id') {
+        expect(blocked).toEqual({
+          kind: 'response',
+          response: {
+            v: 1,
+            id: `blocked:${method}`,
+            ok: false,
+            error: { code: 'CLOSED', message: 'The logical transport is closed.' },
+          },
+        });
+      } else {
+        expect(blocked.kind).toBe('error');
+        if (blocked.kind === 'error') expect(blocked.error).toBeInstanceOf(SceneTransportClosedError);
+      }
+      expect(setDoor).toHaveBeenCalledTimes(1);
+      expect(host.snapshot().dm.encounter.revision).toBe(expectedRevision);
+      expect(runtime.invocationTrackingCounts()).toEqual({ minted: 0, active: 0 });
+      expect(transport.pendingRequestCount()).toBe(0);
+      expect(delayed.crossed()).toBe(false);
+
+      delayed.release();
+      await delayed.completion;
+      await Promise.resolve();
+      expect(committedSettlements).toBe(1);
+      expect(transport.status()).toBe('closed');
+      expect(runtime.invocationTrackingCounts()).toEqual({ minted: 0, active: 0 });
+      transport.destroySession();
+      host.close();
+    },
+  );
+
+  it.each([
     ['same-id', 'read'],
     ['same-id', 'duplicate'],
     ['', 'read'],
diff --git a/tests/unit/vtt/protocol-runtime.test.ts b/tests/unit/vtt/protocol-runtime.test.ts
index 07bab84514bff12202a4ad4ff7ea0273126fd86f..abf9e6d5c0cd58533cd593ec49bafb715eba201b
--- a/tests/unit/vtt/protocol-runtime.test.ts
+++ b/tests/unit/vtt/protocol-runtime.test.ts
@@ -1,5 +1,5 @@
 import { readFileSync } from '../../helpers/test-filesystem';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { combatantId, type CombatantId } from '../../../src/combat/values';
 import type {
   DmSessionSnapshotEvent,
@@ -583,6 +583,79 @@
     source.closeHost();
   });
 
+  it.each([
+    ['close', 'id', 'door.set'],
+    ['close', 'params', 'door.set'],
+    ['close', 'id', 'scene.snapshot'],
+    ['close', 'params', 'scene.snapshot'],
+    ['dispose', 'id', 'door.set'],
+    ['destroy', 'params', 'door.set'],
+  ] as const)(
+    'does not dispatch %s-triggered lifecycle closure from a %s getter for %s',
+    async (lifecycle, accessor, method) => {
+      const setup = await realOutcomeRuntime(`getter-${lifecycle}-${accessor}-${method}`);
+      setup.runtime.dispose();
+      const runtime = new ProtocolRuntime({
+        service: setup.service,
+        principal: { role: 'dm' },
+        seats: [setup.seat],
+        art: twoRoomArtPackage(),
+      });
+      await runtime.dispatch({
+        v: 1, id: `open:getter-${lifecycle}-${accessor}-${method}`,
+        method: 'session.open', params: { requestedRole: 'dm' },
+      });
+      const setDoor = vi.spyOn(setup.service, 'setDoor');
+      const dmCapture = vi.spyOn(setup.service, 'dmCapture');
+      const beforeRevision = setup.host.snapshot().dm.encounter.revision;
+      const closeRuntime = () => {
+        if (lifecycle === 'close') runtime.close();
+        else if (lifecycle === 'dispose') runtime.dispose();
+        else runtime.destroySession();
+      };
+      const request: Record<string, unknown> = { v: 1, method };
+      if (accessor === 'id') {
+        Object.defineProperty(request, 'id', {
+          enumerable: true,
+          get: () => {
+            closeRuntime();
+            return `getter:${lifecycle}:${method}`;
+          },
+        });
+        request.params = method === 'door.set'
+          ? { doorId: 'object:two-room-door', open: true }
+          : {};
+      } else {
+        request.id = `getter:${lifecycle}:${method}`;
+        Object.defineProperty(request, 'params', {
+          enumerable: true,
+          get: () => {
+            closeRuntime();
+            return method === 'door.set'
+              ? { doorId: 'object:two-room-door', open: true }
+              : {};
+          },
+        });
+      }
+
+      await expect(runtime.dispatch(request)).resolves.toEqual({
+        kind: 'response',
+        response: {
+          v: 1,
+          id: `getter:${lifecycle}:${method}`,
+          ok: false,
+          error: { code: 'CLOSED', message: 'The logical transport is closed.' },
+        },
+      });
+      expect(setDoor).not.toHaveBeenCalled();
+      expect(dmCapture).not.toHaveBeenCalled();
+      expect(setup.host.snapshot().dm.encounter.revision).toBe(beforeRevision);
+      expect(runtime.invocationTrackingCounts()).toEqual({ minted: 0, active: 0 });
+      runtime.destroySession();
+      setup.host.close();
+    },
+  );
+
   it('keeps object-transport validation equivalent to the authoritative v1 Zod contracts', async () => {
     class RequestInstance {
       readonly v = 1;
