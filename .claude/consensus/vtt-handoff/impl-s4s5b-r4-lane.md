Implemented both accepted Round 4 findings.

- F56: receipts now carry opaque invocation tokens scoped to the originating runtime. Transport settlement matches token identity and mutation method, never caller wire IDs. Cross-seat collisions for `"same-id"` and `""` cannot settle reads or duplicate mutations with another seat’s receipt.
- F57: removed the hand-written validator. Dispatch now executes the authoritative Zod schemas directly. `_zod.run` is used because this installed Zod version’s failed `safeParse` constructs a `ZodError` using `JSON.stringify`; schema execution remains authoritative while preserving the zero-serialization contract.
- Added a 30-case schema/protocol corpus and four real-host cross-seat receipt regressions.
- No `it(...)` was removed. One equivalence assertion was replaced by two stronger assertions: independently pinned schema behavior plus protocol parity.
- Changed five files: [encounter-session-service.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-session-service.ts:42), [protocol-runtime.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:243), [in-process-transport.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/in-process-transport.ts:83), [protocol-runtime.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:445), and [in-process-transport.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:319).

Verification:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0, no findings.
- `git diff --check` — exit 0.
- `npm run test:engine` — exit 0; 4 files, 41/41 tests.
- `npm run test:protocol` — exit 0; 4 files, 50/50 tests.
- F56 focused command:
  `npx vitest run --configLoader runner tests/unit/vtt/in-process-transport.test.ts -t "never applies a DM receipt"` — exit 0; 4/4 selected tests.
- F57 focused command:
  `npx vitest run --configLoader runner tests/unit/vtt/protocol-runtime.test.ts -t "validation equivalent"` — exit 0; 1/1 selected test.
- F54 focused command:
  `npx vitest run --configLoader runner tests/unit/vtt/in-process-transport.test.ts -t "uses zero serialization for object transport"` — exit 0; `JSON.parse=0`, `JSON.stringify=0`, `structuredClone=0`.
- Cumulative command used all 14 specified S0–S5b files with `npx vitest run --configLoader runner ...` — exit 0; 14 files, 121/121 tests.
- Fresh isolated publication:
  `VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff-s5b-r4 npm run handoff:publish` — exit 0; core published 8 files, examples published 3.
- Isolated verification:
  `VTT_HANDOFF_ROOT=/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp/vtt-handoff-s5b-r4 npm run handoff:publish -- --check` — exit 0; core verified 8 files, examples verified 3.

Protected paths are unchanged. Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`; examples remain unchanged at `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`. No git writes were performed.

HANDOFF S4-S5B R4 DONE
diff --git a/src/vtt/encounter-session-service.ts b/src/vtt/encounter-session-service.ts
index 83fb560a0aff64d9b290bd71b03060af274af1ed..e3d5f47ab9d5f0898b15e087450eb08b2a21b0f3
--- a/src/vtt/encounter-session-service.ts
+++ b/src/vtt/encounter-session-service.ts
@@ -29,17 +29,23 @@
   | {
       readonly kind: 'offered_action';
       readonly requestId: string;
-      readonly clientRequestId?: string;
+      readonly invocationToken?: SessionInvocationToken;
       established: boolean;
     }
   | {
       readonly kind: 'door';
-      readonly clientRequestId?: string;
+      readonly invocationToken?: SessionInvocationToken;
       established: boolean;
     };
 
+/** Process-local identity for exactly one protocol invocation. */
+export interface SessionInvocationToken {
+  readonly runtime: symbol;
+  readonly invocation: symbol;
+}
+
 export interface SessionTerminalReceipt {
-  readonly requestId: string;
+  readonly invocationToken: SessionInvocationToken;
   readonly revision: number;
 }
 
@@ -87,7 +93,7 @@
   | { readonly kind: 'refused'; readonly code: 'UNAUTHORIZED' };
 
 export interface OfferedActionMutation {
-  readonly clientRequestId?: string;
+  readonly invocationToken?: SessionInvocationToken;
   readonly playerId?: string;
   readonly tokenId: string;
   readonly requestId: string;
@@ -322,14 +328,14 @@
       {
         kind: 'offered_action',
         requestId: input.requestId,
-        ...(input.clientRequestId === undefined ? {} : { clientRequestId: input.clientRequestId }),
+        ...(input.invocationToken === undefined ? {} : { invocationToken: input.invocationToken }),
         established: false,
       },
     );
   }
 
   setDoor(input: {
-    readonly clientRequestId?: string;
+    readonly invocationToken?: SessionInvocationToken;
     readonly principal?: SessionPrincipal;
     readonly doorId: string;
     readonly open: boolean;
@@ -353,7 +359,7 @@
       }
       const receipt: ActiveTerminalReceipt = {
         kind: 'door',
-        ...(input.clientRequestId === undefined ? {} : { clientRequestId: input.clientRequestId }),
+        ...(input.invocationToken === undefined ? {} : { invocationToken: input.invocationToken }),
         established: false,
       };
       this.#activeTerminalReceipt = receipt;
@@ -578,13 +584,13 @@
       receipt.requestId === activeReceipt.requestId
     ) {
       activeReceipt.established = true;
-      if (activeReceipt.clientRequestId !== undefined) {
-        terminalReceipt = { requestId: activeReceipt.clientRequestId, revision: receipt.revision };
+      if (activeReceipt.invocationToken !== undefined) {
+        terminalReceipt = { invocationToken: activeReceipt.invocationToken, revision: receipt.revision };
       }
     } else if (receipt?.kind === 'door' && activeReceipt?.kind === 'door') {
       activeReceipt.established = true;
-      if (activeReceipt.clientRequestId !== undefined) {
-        terminalReceipt = { requestId: activeReceipt.clientRequestId, revision: receipt.revision };
+      if (activeReceipt.invocationToken !== undefined) {
+        terminalReceipt = { invocationToken: activeReceipt.invocationToken, revision: receipt.revision };
       }
     }
     const dmEvent = {
diff --git a/src/vtt/handoff/in-process-transport.ts b/src/vtt/handoff/in-process-transport.ts
index fe51f9627c245d0d7f0eaaa3ba090fa47d465505..3f7b5bbbfdac7a8273e2ab84d9973c76e0f535de
--- a/src/vtt/handoff/in-process-transport.ts
+++ b/src/vtt/handoff/in-process-transport.ts
@@ -1,5 +1,6 @@
 import {
   type HandoffResponse,
+  type ProtocolEstablishedReceipt,
   ProtocolRuntime,
   type ProtocolTransportFault,
   type SceneSnapshotEvent,
@@ -11,6 +12,7 @@
   type SceneTransportStatus,
 } from './scene-transport';
 import type { SceneSnapshot } from './v1/contracts';
+import type { SessionInvocationToken } from '../encounter-session-service';
 
 interface Deferred<T> {
   readonly promise: Promise<T>;
@@ -20,6 +22,9 @@
 
 interface PendingRequest extends Deferred<HandoffResponse> {
   readonly requestId: string | null;
+  readonly method: string | null;
+  readonly invocationToken: SessionInvocationToken;
+  establishedResponse: HandoffResponse | null;
   receiptRevision: number | null;
 }
 
@@ -33,6 +38,16 @@
   }
 }
 
+function requestMethodOf(request: unknown): string | null {
+  if (typeof request !== 'object' || request === null || Array.isArray(request)) return null;
+  try {
+    const method = Reflect.get(request, 'method');
+    return typeof method === 'string' ? method : null;
+  } catch {
+    return null;
+  }
+}
+
 function deferred<T>(): Deferred<T> {
   let resolvePromise: ((value: T) => void) | undefined;
   let rejectPromise: ((error: Error) => void) | undefined;
@@ -68,13 +83,22 @@
     if (this.#state === 'closed' || this.#state === 'disposed') {
       return Promise.reject(new SceneTransportClosedError());
     }
-    const pending = {
+    const invocationToken = this.runtime.createInvocationToken();
+    const pending: PendingRequest = {
       ...deferred<HandoffResponse>(),
       requestId: requestIdOf(request),
+      method: requestMethodOf(request),
+      invocationToken,
+      establishedResponse: null,
       receiptRevision: null,
-    } satisfies PendingRequest;
+    };
     this.#pending.add(pending);
-    void this.runtime.dispatch(request).then((result) => {
+    void this.runtime.dispatch(request, undefined, invocationToken, (response) => {
+      if (
+        this.#pending.has(pending) &&
+        (pending.method === 'token.move' || pending.method === 'door.set' || pending.method === 'light.set')
+      ) pending.establishedResponse = response;
+    }).then((result) => {
       if (!this.#pending.delete(pending)) return;
       if (result.kind === 'transport_fault') {
         pending.reject(new SceneTransportFaultError(result.fault));
@@ -180,10 +204,12 @@
     if (destroyError !== undefined) throw destroyError;
   }
 
-  #receiveEvent(event: SceneSnapshotEvent, receipt?: { readonly requestId: string; readonly revision: number }): void {
+  #receiveEvent(event: SceneSnapshotEvent, receipt?: ProtocolEstablishedReceipt): void {
     if (receipt !== undefined) {
       const pending = [...this.#pending].find((candidate) =>
-        candidate.requestId === receipt.requestId && candidate.receiptRevision === null);
+        candidate.invocationToken === receipt.invocationToken &&
+        (candidate.method === 'token.move' || candidate.method === 'door.set') &&
+        candidate.receiptRevision === null);
       if (pending !== undefined) pending.receiptRevision = receipt.revision;
     }
     if (!this.#initialSettled) {
@@ -209,7 +235,13 @@
       this.#initial.reject(error);
     }
     for (const pending of this.#pending) {
-      if (pending.requestId !== null && pending.receiptRevision !== null) {
+      if (pending.establishedResponse !== null) {
+        pending.resolve(pending.establishedResponse);
+      } else if (
+        pending.requestId !== null &&
+        (pending.method === 'token.move' || pending.method === 'door.set') &&
+        pending.receiptRevision !== null
+      ) {
         pending.resolve({
           v: 1,
           id: pending.requestId,
diff --git a/src/vtt/handoff/protocol-runtime.ts b/src/vtt/handoff/protocol-runtime.ts
index dc18e98aaa5d4d5507f56efcd6fe9a67bbf6acda..a020a1da8a64e9291d62994ea72322fed78ce4ea
--- a/src/vtt/handoff/protocol-runtime.ts
+++ b/src/vtt/handoff/protocol-runtime.ts
@@ -4,6 +4,7 @@
   PlayerSessionSnapshotEvent,
   PlayerSubscriptionResult,
   DoorSetOutcome,
+  SessionInvocationToken,
   SessionMutationOutcome,
 } from '../encounter-session-service';
 import type { DmBoardProjection, PlayerBoardProjection, RendererTokenBinding } from '../encounter-projections';
@@ -12,6 +13,9 @@
 import { LogicalSessionAuthority } from './mutation-ledger';
 import { SessionAuthorizer, type HandoffPrincipal } from './session-authorizer';
 import {
+  genericHandoffRequestSchema,
+  HANDOFF_METHODS,
+  handoffRequestSchema,
   type HandoffRequest,
   type SceneSnapshot,
 } from './v1/contracts';
@@ -54,10 +58,28 @@
 }
 
 export interface ProtocolEstablishedReceipt {
-  readonly requestId: string;
+  readonly invocationToken: SessionInvocationToken;
   readonly revision: number;
 }
 
+export type ProtocolResponseEstablished = (response: HandoffResponse) => void;
+
+const knownMethods = new Set<string>(HANDOFF_METHODS);
+// Warm Zod's generated validators before object transport is measured. Dispatch invokes
+// those authoritative schemas through `_zod.run` so invalid input does not materialize a
+// ZodError (whose formatter serializes issues) inside the zero-serialization boundary.
+const validatorWarmups: readonly HandoffRequest[] = [
+  { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } },
+  { v: 1, id: '', method: 'scene.snapshot', params: {} },
+  { v: 1, id: '', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0 } } },
+  { v: 1, id: '', method: 'door.set', params: { doorId: '', open: false } },
+  { v: 1, id: '', method: 'light.set', params: { lightId: '', enabled: false } },
+];
+for (const request of validatorWarmups) {
+  genericHandoffRequestSchema.safeParse(request);
+  handoffRequestSchema.safeParse(request);
+}
+
 export type ProtocolDispatchResult =
   | { readonly kind: 'response'; readonly response: HandoffResponse }
   | { readonly kind: 'transport_fault'; readonly fault: ProtocolTransportFault };
@@ -85,13 +107,13 @@
     readonly playerId?: string;
     readonly tokenId: string;
     readonly requestId: string;
-    readonly clientRequestId?: string;
+    readonly invocationToken?: SessionInvocationToken;
     readonly encounterRevision: number;
     readonly offeredActionId: string;
     readonly signal?: AbortSignal;
   }): Promise<SessionMutationOutcome>;
   setDoor(input: {
-    readonly clientRequestId?: string;
+    readonly invocationToken?: SessionInvocationToken;
     readonly principal?: { readonly kind: 'dm' } | { readonly kind: 'player'; readonly playerId: string };
     readonly doorId: string;
     readonly open: boolean;
@@ -149,101 +171,10 @@
     const id = Reflect.get(value, 'id');
     return typeof id === 'string' ? id : null;
   } catch {
-    return null;
-  }
-}
-
-interface GenericWireRequest {
-  readonly v: 1;
-  readonly id: string;
-  readonly method: string;
-  readonly params: Readonly<Record<string, unknown>>;
-}
-
-function requestObject(value: unknown): value is Readonly<Record<string, unknown>> {
-  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
-  for (const key in value) {
-    if (!Object.hasOwn(value, key)) return false;
-  }
-  return true;
-}
-
-function record(value: unknown): value is Readonly<Record<string, unknown>> {
-  if (!requestObject(value)) return false;
-  const prototype = Object.getPrototypeOf(value) as unknown;
-  return prototype === Object.prototype || prototype === null;
-}
-
-function exactKeys(
-  value: Readonly<Record<string, unknown>>,
-  required: readonly string[],
-  optional: readonly string[] = [],
-): boolean {
-  const keys = Reflect.ownKeys(value);
-  return required.every((key) => Object.hasOwn(value, key)) &&
-    keys.every((key) => typeof key === 'string' && (required.includes(key) || optional.includes(key)));
-}
-
-function genericRequest(value: unknown): GenericWireRequest | null {
-  if (
-    !requestObject(value) ||
-    !['v', 'id', 'method', 'params'].every((key) => Object.hasOwn(value, key)) ||
-    !Object.keys(value).every((key) => ['v', 'id', 'method', 'params'].includes(key))
-  ) return null;
-  if (value.v !== 1 || typeof value.id !== 'string' || typeof value.method !== 'string' || !record(value.params)) {
     return null;
   }
-  return { v: 1, id: value.id, method: value.method, params: value.params };
-}
-
-function finitePoint3(value: unknown): { readonly x: number; readonly y: number; readonly z: number } | null {
-  if (!record(value) || !exactKeys(value, ['x', 'y', 'z'])) return null;
-  if (
-    typeof value.x !== 'number' || !Number.isFinite(value.x) ||
-    typeof value.y !== 'number' || !Number.isFinite(value.y) ||
-    typeof value.z !== 'number' || !Number.isFinite(value.z)
-  ) return null;
-  return { x: value.x, y: value.y, z: value.z };
 }
 
-function knownRequest(request: GenericWireRequest): HandoffRequest | null {
-  const { id, params } = request;
-  switch (request.method) {
-    case 'session.open': {
-      if (!exactKeys(params, ['requestedRole'], ['playerId'])) return null;
-      const requestedRole = params.requestedRole;
-      const playerId = params.playerId;
-      if (
-        (requestedRole !== 'dm' && requestedRole !== 'player') ||
-        (playerId !== undefined && typeof playerId !== 'string')
-      ) return null;
-      return {
-        v: 1, id, method: 'session.open',
-        params: { requestedRole, ...(playerId === undefined ? {} : { playerId }) },
-      };
-    }
-    case 'scene.snapshot':
-      return exactKeys(params, []) ? { v: 1, id, method: 'scene.snapshot', params: {} } : null;
-    case 'token.move': {
-      if (!exactKeys(params, ['tokenId', 'to']) || typeof params.tokenId !== 'string') return null;
-      const to = finitePoint3(params.to);
-      return to === null ? null : { v: 1, id, method: 'token.move', params: { tokenId: params.tokenId, to } };
-    }
-    case 'door.set':
-      return exactKeys(params, ['doorId', 'open']) &&
-        typeof params.doorId === 'string' && typeof params.open === 'boolean'
-        ? { v: 1, id, method: 'door.set', params: { doorId: params.doorId, open: params.open } }
-        : null;
-    case 'light.set':
-      return exactKeys(params, ['lightId', 'enabled']) &&
-        typeof params.lightId === 'string' && typeof params.enabled === 'boolean'
-        ? { v: 1, id, method: 'light.set', params: { lightId: params.lightId, enabled: params.enabled } }
-        : null;
-    default:
-      return null;
-  }
-}
-
 function identityIndex(bindings: readonly RendererTokenBinding[]): CanonicalTokenIdentityIndex {
   const byCombatantId = new Map<string, string>();
   for (const binding of bindings) {
@@ -277,6 +208,8 @@
   readonly #authorizer: SessionAuthorizer;
   readonly #art: EncounterArtPackage;
   readonly #session: LogicalSessionAuthority;
+  readonly #runtimeIdentity = Symbol('protocol-runtime');
+  readonly #activeMutationInvocations = new Set<SessionInvocationToken>();
   readonly #eventListeners = new Set<(
     event: SceneSnapshotEvent,
     receipt?: ProtocolEstablishedReceipt,
@@ -307,11 +240,24 @@
     return () => this.#faultListeners.delete(listener);
   }
 
-  async dispatch(input: unknown, signal?: AbortSignal): Promise<ProtocolDispatchResult> {
+  createInvocationToken(): SessionInvocationToken {
+    return Object.freeze({ runtime: this.#runtimeIdentity, invocation: Symbol('protocol-invocation') });
+  }
+
+  dispatch(
+    input: unknown,
+    signal?: AbortSignal,
+    invocationToken?: SessionInvocationToken,
+    onResponseEstablished?: ProtocolResponseEstablished,
+  ): Promise<ProtocolDispatchResult> {
+    const respond = (response: HandoffResponse): Promise<ProtocolDispatchResult> => {
+      onResponseEstablished?.(response);
+      return Promise.resolve({ kind: 'response', response });
+    };
     const decoded = decodedInput(input);
     if (!('ok' in decoded)) {
       this.#emitFault(decoded.fault);
-      return decoded;
+      return Promise.resolve(decoded);
     }
     const id = usableId(decoded.value);
     if (id === null) {
@@ -321,24 +267,42 @@
         HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError,
       );
       if (result.kind === 'transport_fault') this.#emitFault(result.fault);
-      return result;
+      return Promise.resolve(result);
     }
     if (this.#disposed || this.#closed || this.#session.destroyed) {
-      return { kind: 'response', response: failure(id, 'CLOSED', 'The logical transport is closed.') };
+      return respond(failure(id, 'CLOSED', 'The logical transport is closed.'));
     }
-    const structural = genericRequest(decoded.value);
-    if (structural === null) {
-      return { kind: 'response', response: failure(id, 'INVALID_REQUEST', 'The request structure is invalid.') };
+    const structural = genericHandoffRequestSchema._zod.run(
+      { value: decoded.value, issues: [] },
+      { async: false },
+    );
+    if (structural instanceof Promise) throw new TypeError('The v1 request schema must validate synchronously.');
+    if (structural.issues.length > 0) {
+      return respond(failure(id, 'INVALID_REQUEST', 'The request structure is invalid.'));
     }
-    const known = knownRequest(structural);
-    if (known === null) {
-      if (!['session.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set'].includes(structural.method)) {
-        return { kind: 'response', response: failure(id, 'UNSUPPORTED', `Unsupported method ${structural.method}.`) };
-      }
-      return { kind: 'response', response: failure(id, 'INVALID_REQUEST', 'The request parameters are invalid.') };
+    const structuralValue = structural.value as typeof genericHandoffRequestSchema['_output'];
+    if (!knownMethods.has(structuralValue.method)) {
+      return respond(failure(id, 'UNSUPPORTED', `Unsupported method ${structuralValue.method}.`));
     }
-    const response = await this.#dispatchKnown(known, signal);
-    return { kind: 'response', response };
+    const known = handoffRequestSchema._zod.run(
+      { value: decoded.value, issues: [] },
+      { async: false },
+    );
+    if (known instanceof Promise) throw new TypeError('The v1 method schema must validate synchronously.');
+    if (known.issues.length > 0) {
+      return respond(failure(id, 'INVALID_REQUEST', 'The request parameters are invalid.'));
+    }
+    const token = invocationToken?.runtime === this.#runtimeIdentity
+      ? invocationToken
+      : this.createInvocationToken();
+    const dispatched = this.#dispatchKnown(known.value as HandoffRequest, token, signal);
+    if (dispatched instanceof Promise) {
+      return dispatched.then((response) => {
+        onResponseEstablished?.(response);
+        return { kind: 'response', response };
+      });
+    }
+    return respond(dispatched);
   }
 
   close(): void {
@@ -369,7 +333,11 @@
     if (errors.length > 1) throw new AggregateError(errors, 'Runtime and session cleanup both failed.');
   }
 
-  async #dispatchKnown(request: HandoffRequest, signal?: AbortSignal): Promise<HandoffResponse> {
+  #dispatchKnown(
+    request: HandoffRequest,
+    invocationToken: SessionInvocationToken,
+    signal?: AbortSignal,
+  ): HandoffResponse | Promise<HandoffResponse> {
     switch (request.method) {
       case 'session.open':
         return this.#open(request.id, request.params.requestedRole, request.params.playerId);
@@ -381,16 +349,37 @@
       }
       case 'token.move':
         if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
-        return this.#move(request.id, request.params.tokenId, request.params.to, signal);
+        return this.#trackMutation(
+          invocationToken,
+          () => this.#move(request.id, request.params.tokenId, request.params.to, invocationToken, signal),
+        );
       case 'door.set':
         if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
-        return this.#door(request.id, request.params.doorId, request.params.open);
+        return this.#trackMutation(
+          invocationToken,
+          () => this.#door(request.id, request.params.doorId, request.params.open, invocationToken),
+        );
       case 'light.set':
         if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
         return failure(request.id, 'UNSUPPORTED', 'The encounter engine has no light toggle mechanic.');
     }
   }
 
+  #trackMutation(
+    invocationToken: SessionInvocationToken,
+    operation: () => Promise<HandoffResponse>,
+  ): Promise<HandoffResponse> {
+    this.#activeMutationInvocations.add(invocationToken);
+    let response: Promise<HandoffResponse>;
+    try {
+      response = operation();
+    } catch (error: unknown) {
+      this.#activeMutationInvocations.delete(invocationToken);
+      throw error;
+    }
+    return response.finally(() => this.#activeMutationInvocations.delete(invocationToken));
+  }
+
   #reserve(id: string): boolean {
     return this.#session.ledger.reserve(id).reserved;
   }
@@ -433,6 +422,7 @@
     id: string,
     tokenId: string,
     to: { readonly x: number; readonly y: number; readonly z: number },
+    invocationToken: SessionInvocationToken,
     signal?: AbortSignal,
   ): Promise<HandoffResponse> {
     if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
@@ -474,7 +464,7 @@
       playerId: this.#principal.playerId,
       tokenId,
       requestId: pending.requestId,
-      clientRequestId: id,
+      invocationToken,
       encounterRevision: pending.encounterRevision,
       offeredActionId,
       ...(signal === undefined ? {} : { signal }),
@@ -482,10 +472,15 @@
     return terminalResponse(id, outcome);
   }
 
-  async #door(id: string, doorId: string, open: boolean): Promise<HandoffResponse> {
+  async #door(
+    id: string,
+    doorId: string,
+    open: boolean,
+    invocationToken: SessionInvocationToken,
+  ): Promise<HandoffResponse> {
     if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
     if (this.#principal.role !== 'dm') return failure(id, 'FORBIDDEN', 'Players cannot change door state.');
-    const outcome = await this.#service.setDoor({ clientRequestId: id, principal: { kind: 'dm' }, doorId, open });
+    const outcome = await this.#service.setDoor({ invocationToken, principal: { kind: 'dm' }, doorId, open });
     switch (outcome.kind) {
       case 'committed': return success(id, { revision: outcome.revision });
       case 'refused': return failure(id, outcome.code, outcome.reason);
@@ -524,12 +519,18 @@
   #publish(event: DmSessionSnapshotEvent | PlayerSessionSnapshotEvent): void {
     switch (event.kind) {
       case 'mutation':
-      case 'autonomous':
+      case 'autonomous': {
+        const receipt = event.terminalReceipt;
+        const establishedReceipt = receipt !== undefined &&
+          this.#activeMutationInvocations.has(receipt.invocationToken)
+          ? receipt
+          : undefined;
         this.#emitSnapshot(
           { projection: event.projection, tokenBindings: event.tokenBindings },
-          event.terminalReceipt,
+          establishedReceipt,
         );
         return;
+      }
       case 'offer':
       case 'status':
       case 'recovery':
diff --git a/tests/unit/vtt/in-process-transport.test.ts b/tests/unit/vtt/in-process-transport.test.ts
index cf3699cfa18f1a5bd95681d530206f7e892b6cf2..deaff8f749bd39cff7840875e5823a7ab2bff191
--- a/tests/unit/vtt/in-process-transport.test.ts
+++ b/tests/unit/vtt/in-process-transport.test.ts
@@ -25,8 +25,12 @@
   twoRoomArtPackage,
 } from '../../../src/vtt/handoff/fixtures/two-room';
 import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
-import { ProtocolRuntime, type ProtocolSessionPort } from '../../../src/vtt/handoff/protocol-runtime';
 import {
+  type HandoffResponse,
+  ProtocolRuntime,
+  type ProtocolSessionPort,
+} from '../../../src/vtt/handoff/protocol-runtime';
+import {
   BrowserSessionWriteError,
   IndexedDbBrowserSessionStore,
 } from '../../../src/vtt/local-session-store';
@@ -85,9 +89,9 @@
         seq: doorCalls,
         projection: dm,
         tokenBindings,
-        ...(input.clientRequestId === undefined
+        ...(input.invocationToken === undefined
           ? {}
-          : { terminalReceipt: { requestId: input.clientRequestId, revision: dm.encounter.revision } }),
+          : { terminalReceipt: { invocationToken: input.invocationToken, revision: dm.encounter.revision } }),
       } satisfies DmSessionSnapshotEvent;
       for (const listener of dmListeners) listener(event);
       return { kind: 'committed', revision: dm.encounter.revision, changed: true, event };
@@ -306,6 +310,96 @@
     },
   );
 
+  it.each([
+    ['same-id', 'read'],
+    ['same-id', 'duplicate'],
+    ['', 'read'],
+    ['', 'duplicate'],
+  ] as const)(
+    'never applies a DM receipt to a player request with wire id %s and kind %s when closed by its observer',
+    async (wireId, requestKind) => {
+      const state = buildTwoRoomEncounter();
+      const host = new DmEncounterHost(`scene:cross-runtime-receipt:${requestKind}:${wireId || 'empty'}`, new MemoryBrowserSessionStore(), {
+        initialState: state,
+        initialControllers: state.combatants.map((combatant) => ({
+          combatantId: combatant.profile.id,
+          controllerId: `${combatant.profile.id}:cross-runtime-receipt`,
+          kind: 'human' as const,
+          generation: 0,
+        })),
+        playerIds: state.combatants.map((combatant) => combatant.profile.id),
+        turnLegalActions: closingMoveActions,
+      });
+      const seat = closingSeat(host);
+      const service = new EncounterSessionService(host, [seat]);
+      const dm = new InProcessSceneTransport(new ProtocolRuntime({
+        service, principal: { role: 'dm' }, seats: [seat], art: twoRoomArtPackage(),
+      }));
+      const player = new InProcessSceneTransport(new ProtocolRuntime({
+        service,
+        principal: { role: 'player', playerId: seat.playerId },
+        seats: [seat],
+        art: twoRoomArtPackage(),
+      }));
+      await dm.request({
+        v: 1, id: `open:dm:${requestKind}`, method: 'session.open', params: { requestedRole: 'dm' },
+      });
+      await player.request({
+        v: 1, id: `open:player:${requestKind}`, method: 'session.open',
+        params: { requestedRole: 'player', playerId: seat.playerId },
+      });
+      const offerPromise = closingOffer(service, seat.playerId);
+      void service.start();
+      await offerPromise;
+      const expectedRevision = host.snapshot().dm.encounter.revision + 1;
+      let launchPlayerRequest: ((request: Promise<HandoffResponse>) => void) | undefined;
+      const playerResponse = new Promise<HandoffResponse>((resolve) => { launchPlayerRequest = resolve; });
+      let launched = false;
+      dm.subscribe((event) => {
+        if (event.data.revision !== expectedRevision || launched) return;
+        launched = true;
+        launchPlayerRequest?.(player.request(requestKind === 'read'
+          ? { v: 1, id: wireId, method: 'scene.snapshot', params: {} }
+          : { v: 1, id: wireId, method: 'light.set', params: { lightId: 'torch', enabled: false } }));
+      });
+      const closedRevisions: number[] = [];
+      player.subscribe((event) => {
+        if (event.data.revision !== expectedRevision) return;
+        closedRevisions.push(event.data.revision);
+        player.close();
+      });
+      const playerOutcome = playerResponse.then(
+        (response) => ({ kind: 'response' as const, response }),
+        (error: unknown) => ({ kind: 'error' as const, error }),
+      );
+      const dmResponse = await dm.request({
+        v: 1, id: wireId, method: 'door.set',
+        params: { doorId: 'object:two-room-door', open: true },
+      });
+      expect(dmResponse).toMatchObject({ id: wireId, ok: true, result: { revision: expectedRevision } });
+      expect(launched).toBe(true);
+      expect(closedRevisions).toEqual([expectedRevision]);
+      expect(player.status()).toBe('closed');
+      const outcome = await playerOutcome;
+      if (requestKind === 'duplicate') {
+        expect(outcome).toEqual({
+          kind: 'response',
+          response: {
+            v: 1,
+            id: wireId,
+            ok: false,
+            error: { code: 'DUPLICATE_MUTATION', message: 'The mutation id was already used.' },
+          },
+        });
+      } else {
+        expect(outcome.kind).toBe('error');
+        if (outcome.kind === 'error') expect(outcome.error).toBeInstanceOf(SceneTransportClosedError);
+      }
+      dm.destroySession();
+      host.close();
+    },
+  );
+
   it('delivers the initial snapshot once and only future events to late subscribers', async () => {
     const { host, port, runtime } = fixture();
     const transport = new InProcessSceneTransport(runtime);
diff --git a/tests/unit/vtt/protocol-runtime.test.ts b/tests/unit/vtt/protocol-runtime.test.ts
index 9df91cfdb661cbf0a059cb77421c4cb7bcfa86ca..b5666521669897cf44dd4e8cfab6d8f103d14b6a
--- a/tests/unit/vtt/protocol-runtime.test.ts
+++ b/tests/unit/vtt/protocol-runtime.test.ts
@@ -450,6 +450,11 @@
       readonly params = {};
     }
     class ParamsInstance {}
+    class PointInstance {
+      readonly x = 0;
+      readonly y = 0;
+      readonly z = 0;
+    }
     const symbolRequest = {
       v: 1, id: 'symbol-root', method: 'scene.snapshot', params: {},
       [Symbol('ignored-root')]: true,
@@ -470,6 +475,12 @@
     const customPrototypeRoot: unknown = Object.assign(Object.create({ inherited: true }), {
       v: 1, id: 'custom-root', method: 'scene.snapshot', params: {},
     });
+    const symbolPoint = { x: 0, y: 0, z: 0, [Symbol('ignored-point')]: true };
+    const protoPoint = { x: 0, y: 0, z: 0 };
+    Object.defineProperty(protoPoint, '__proto__', {
+      enumerable: true,
+      value: { polluted: true },
+    });
     const corpus: readonly { readonly label: string; readonly value: unknown }[] = [
       { label: 'open-positive', value: { v: 1, id: 'positive-open', method: 'session.open', params: { requestedRole: 'dm' } } },
       { label: 'snapshot-positive', value: { v: 1, id: 'positive-snapshot', method: 'scene.snapshot', params: {} } },
@@ -493,7 +504,28 @@
       { label: 'symbol-params', value: symbolParams },
       { label: 'accessor', value: accessorParams },
       { label: 'throwing-accessor', value: throwingAccessor },
+      { label: 'array-as-record', value: { v: 1, id: 'array-record', method: 'scene.snapshot', params: [] } },
+      { label: 'class-point', value: { v: 1, id: 'class-point', method: 'token.move', params: { tokenId: '', to: new PointInstance() } } },
+      { label: 'symbol-point', value: { v: 1, id: 'symbol-point', method: 'token.move', params: { tokenId: '', to: symbolPoint } } },
+      { label: 'nan-point', value: { v: 1, id: 'nan-point', method: 'token.move', params: { tokenId: '', to: { x: Number.NaN, y: 0, z: 0 } } } },
+      { label: 'infinity-point', value: { v: 1, id: 'infinity-point', method: 'token.move', params: { tokenId: '', to: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 } } } },
+      { label: 'negative-zero-point', value: { v: 1, id: 'negative-zero-point', method: 'token.move', params: { tokenId: '', to: { x: -0, y: -0, z: -0 } } } },
+      { label: 'nested-extra-key', value: { v: 1, id: 'nested-extra', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0, extra: true } } } },
+      { label: 'own-proto-key', value: { v: 1, id: 'own-proto', method: 'token.move', params: { tokenId: '', to: protoPoint } } },
     ];
+    const expected = new Map<string, 'accepted' | 'rejected' | 'throws'>([
+      ['open-positive', 'accepted'], ['snapshot-positive', 'accepted'], ['move-positive', 'accepted'],
+      ['door-positive', 'accepted'], ['light-positive', 'accepted'], ['open-negative', 'rejected'],
+      ['snapshot-negative', 'rejected'], ['move-negative', 'rejected'], ['door-negative', 'rejected'],
+      ['light-negative', 'rejected'], ['generic-extension', 'accepted'], ['date-params', 'rejected'],
+      ['map-params', 'rejected'], ['class-root', 'accepted'], ['class-params', 'rejected'],
+      ['custom-root-prototype', 'rejected'], ['custom-params-prototype', 'rejected'],
+      ['null-params-prototype', 'accepted'], ['symbol-root', 'accepted'], ['symbol-params', 'rejected'],
+      ['accessor', 'accepted'], ['throwing-accessor', 'throws'], ['array-as-record', 'rejected'],
+      ['class-point', 'accepted'], ['symbol-point', 'accepted'], ['nan-point', 'rejected'],
+      ['infinity-point', 'rejected'], ['negative-zero-point', 'accepted'], ['nested-extra-key', 'rejected'],
+      ['own-proto-key', 'accepted'],
+    ]);
     const knownMethods = new Set<string>(HANDOFF_METHODS);
     const schemaDisposition = (value: unknown): 'accepted' | 'rejected' | 'throws' => {
       try {
@@ -517,7 +549,9 @@
       }
     };
     for (const entry of corpus) {
-      expect(await runtimeDisposition(entry.value), entry.label).toBe(schemaDisposition(entry.value));
+      const contractDisposition = schemaDisposition(entry.value);
+      expect(contractDisposition, `${entry.label}:schema`).toBe(expected.get(entry.label));
+      expect(await runtimeDisposition(entry.value), `${entry.label}:protocol`).toBe(contractDisposition);
     }
     expect(schemaDisposition(corpus.find((entry) => entry.label === 'date-params')?.value)).toBe('rejected');
     runtime.destroySession();
