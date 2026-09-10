Implemented S6a–S6c on `claude/vtt-handoff` at `7acc764487db9e95a132babfb2c530934add3583`.

### Delivered

- Real module Worker using the existing `ProtocolRuntime` and encounter session service.
- Named, page-lifetime memory store with explicit no-op durability flush.
- MessageChannel transport with invocation correlation, authoritative Zod validation, typed faults, receipt-preserving shutdown, and observer isolation.
- `/vtt-handoff` synthetic scene harness with controls, autonomous events, reconnect, and cleanup.
- Checked-in single-spec Playwright configuration requiring a non-4173 port.
- Dist artifact stamping with commit, Worker URL, and SHA-256.
- Loopback-only stamped-dist server rejecting missing, unstamped, tampered, traversal, and escaping-symlink inputs.
- `test:worker` package alias.
- Engine graph gate expanded to include both Worker entrypoints and reject all `node:` imports, SharedArrayBuffer, Atomics, and authoritative browser APIs.

Added:

- [worker-entry.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-entry.ts)
- [worker-transport.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-transport.ts)
- [worker-messages.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-messages.ts)
- [worker-memory-session-store.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-memory-session-store.ts)
- [worker-harness.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-harness.ts)
- [worker-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/worker-boundary.test.ts)
- [playwright.config.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/browser/vtt-handoff/playwright.config.ts)
- [worker.spec.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/browser/vtt-handoff/worker.spec.ts)
- [serve-existing-dist.mjs](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/serve-existing-dist.mjs)
- [serve-existing-dist.d.mts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/serve-existing-dist.d.mts)
- [serve-existing-dist.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/serve-existing-dist.test.ts)

Modified only the authorized shared seams: `package.json`, `src/main.ts`, `vite.config.ts`, and `tests/unit/vtt/engine-boundary.test.ts`. No accepted S4/S5 runtime or service source was changed. No existing test or assertion was removed or weakened.

### Verification

All commands exited 0:

- `npm run typecheck:fast`
- `sg scan`
- `git diff --check`
- `npm run test:engine` — 4 files, 41 tests passed.
- `npm run test:protocol` — 4 files, 63 tests passed.
- Worker boundary:
  `npx vitest run --configLoader runner tests/unit/vtt/worker-boundary.test.ts tests/unit/vtt/engine-boundary.test.ts`
  — 2 files, 9 tests passed.
- S6c server:
  `npx vitest run --configLoader runner tests/unit/vtt/serve-existing-dist.test.ts`
  — 1 file, 4 tests passed.
- S0–S5b cumulative plus S6:
  `npx vitest run --configLoader runner` followed by the 14 existing handoff specs plus `worker-boundary.test.ts` and `serve-existing-dist.test.ts`
  — 16 files, 214 tests passed.
- Browser:
  `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts`
  — 1/1 passed in 7.6s.

Recorded browser artifact:

```text
artifact=dev page=http://127.0.0.1:4410/vtt-handoff worker=http://127.0.0.1:4410/src/vtt/handoff/worker-entry.ts,http://127.0.0.1:4410/src/vtt/handoff/worker-entry.ts
```

The measured initial request path performs three MessagePort structured-clone crossings: one request, one snapshot event, and one response. Worker adapters contain zero explicit `JSON.parse`, `JSON.stringify`, or `structuredClone` calls.

Negative controls cover malformed envelopes, wrong correlation, uncloneable requests, validation refusal, duplicate mutation, unknown post-close work, traversal, symlink escape, missing/unstamped dist, and Worker hash tampering.

Protected hashes remain:

- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Examples fixture: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`

No build, dist browser proof, publication, git write, model phase, or port 4173 operation was run. The fresh-dist browser proof remains for the supervisor after its fresh build.

HANDOFF S6 DONE
diff --git a/package.json b/package.json
index af9b3b37cc2c69400299d0cfe3b798f0a3b48fa1..b4d0403233826a96a33bb176c63082be9e70b53f
--- a/package.json
+++ b/package.json
@@ -43,6 +43,7 @@
     "doctor": "node --experimental-strip-types tools/vtt-handoff/doctor.ts --",
     "test:engine": "vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "test:protocol": "vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts",
+    "test:worker": "playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts",
     "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts --"
   },
   "dependencies": {
diff --git a/src/main.ts b/src/main.ts
index 2b4281a419682643fd04215e2b8d2f1f6908a277..d2e4efa54e9620c806b93a331a52295317247b6b
--- a/src/main.ts
+++ b/src/main.ts
@@ -45,11 +45,17 @@
 } from './pwa/browser-support-notice';
 
 const launchUrl = new URL(location.href);
+const handoffWorkerLaunch = launchUrl.pathname.replace(/\/+$/, '') === '/vtt-handoff';
 const localEncounterLaunch =
   launchUrl.pathname.replace(/\/+$/, '') === '/vtt' &&
   launchUrl.searchParams.get('encounter') === 'reference';
 
-if (localEncounterLaunch) {
+if (handoffWorkerLaunch) {
+  const handoffRoot = document.querySelector<HTMLElement>('#app');
+  if (handoffRoot === null) throw new Error('Application root #app is missing.');
+  void import('./vtt/handoff/worker-harness').then(({ mountWorkerHarness }) =>
+    mountWorkerHarness(handoffRoot));
+} else if (localEncounterLaunch) {
   const encounterRoot = document.querySelector<HTMLElement>('#app');
   if (encounterRoot === null) throw new Error('Application root #app is missing.');
   const view = launchUrl.searchParams.get('view') === 'dm' ? 'dm' : 'player';
diff --git a/src/vtt/handoff/worker-entry.ts b/src/vtt/handoff/worker-entry.ts
new file mode 100644
index 0000000000000000000000000000000000000000..7b5b9967e8366d161967a76a9c281bb3628b8115
--- /dev/null
+++ b/src/vtt/handoff/worker-entry.ts
@@ -0,0 +1,172 @@
+import { DmEncounterHost } from '../dm-encounter-host';
+import { EncounterSessionService, type PlayerSeatRegistration, type SessionInvocationToken } from '../encounter-session-service';
+import { encounterSeed } from '../session-seed';
+import type { CombatantId } from '../../combat/values';
+import type { EncounterState } from '../../combat/encounter';
+import type { LegalActionSummary } from '../../combat/controllers';
+import {
+  buildTwoRoomEncounter, TWO_ROOM_ADVENTURER_ID, TWO_ROOM_SEED, twoRoomArtPackage,
+} from './fixtures/two-room';
+import { NamedWorkerMemorySessionStore } from './worker-memory-session-store';
+import {
+  workerClientMessageSchema, type WorkerConnectMessage, type WorkerServerMessage,
+} from './worker-messages';
+import { ProtocolRuntime } from './protocol-runtime';
+
+function post(port: MessagePort, message: WorkerServerMessage): void {
+  port.postMessage(message);
+}
+
+function workerLegalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
+  if (actor === TWO_ROOM_ADVENTURER_ID) return { actions: [{ type: 'end_turn', actor }] };
+  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
+  if (token === undefined) return { actions: [{ type: 'end_turn', actor }] };
+  const direction = token.position.column < 5 ? 1 : -1;
+  return {
+    actions: [
+      { type: 'move', actor, path: [{ column: token.position.column + direction, row: token.position.row }], cause: 'voluntary' },
+      { type: 'end_turn', actor },
+    ],
+  };
+}
+
+export function attachHandoffWorkerPort(
+  port: MessagePort,
+  options: { readonly startAutonomous?: boolean } = {},
+): () => void {
+  const state = buildTwoRoomEncounter();
+  const store = new NamedWorkerMemorySessionStore('vtt-handoff-worker-memory');
+  const host = new DmEncounterHost('scene:vtt-handoff-worker', store, {
+    initialState: state,
+    initialSeed: encounterSeed(TWO_ROOM_SEED),
+    initialControllers: state.combatants.map((combatant, index) => ({
+      combatantId: combatant.profile.id,
+      controllerId: `${combatant.profile.id}:worker`,
+      kind: index === 0 ? 'algorithm' as const : 'human' as const,
+      generation: 0,
+    })),
+    playerIds: state.combatants.map((combatant) => combatant.profile.id),
+    turnLegalActions: workerLegalActions,
+  });
+  const bindings = host.rendererTokenBindings();
+  const seats: PlayerSeatRegistration[] = state.combatants.map((combatant) => ({
+    playerId: String(combatant.profile.id),
+    seatId: `seat:${String(combatant.profile.id)}`,
+    observerCombatantId: combatant.profile.id,
+    ownedCombatantIds: [combatant.profile.id],
+    controlledTokenIds: bindings
+      .filter((binding) => binding.combatantId === combatant.profile.id)
+      .map((binding) => binding.tokenId),
+  }));
+  const service = new EncounterSessionService(host, seats);
+  const runtime = new ProtocolRuntime({ service, principal: { role: 'dm' }, seats, art: twoRoomArtPackage() });
+  const invocations = new Map<SessionInvocationToken, number>();
+  let started = false;
+  const unsubscribeEvent = runtime.subscribe((event, receipt) => {
+    const receiptInvocation = receipt === undefined ? undefined : invocations.get(receipt.invocationToken);
+    post(port, {
+      kind: 'event',
+      event,
+      ...(receiptInvocation === undefined || receipt === undefined
+        ? {}
+        : { receiptInvocation, receiptRevision: receipt.revision }),
+    });
+  });
+  const unsubscribeFault = runtime.subscribeFaults((fault) => post(port, { kind: 'fault', fault }));
+  const onMessage = (messageEvent: MessageEvent<unknown>): void => {
+    const decoded = workerClientMessageSchema.safeParse(messageEvent.data);
+    if (!decoded.success) {
+      post(port, {
+        kind: 'fault',
+        fault: {
+          kind: 'transport_fault', code: 'PROTOCOL_ERROR',
+          message: 'Worker message envelope is invalid.', websocketCloseCode: 1002,
+        },
+      });
+      return;
+    }
+    const message = decoded.data;
+    if (message.kind === 'request') {
+      const token = runtime.createInvocationToken();
+      invocations.set(token, message.invocation);
+      void runtime.dispatch(message.request, undefined, token).then(async (result) => {
+        invocations.delete(token);
+        if (result.kind === 'transport_fault') {
+          post(port, { kind: 'request-fault', invocation: message.invocation, fault: result.fault });
+          return;
+        }
+        if (options.startAutonomous !== false && !started && result.response.ok && result.response.id !== undefined) {
+          const request = message.request;
+          if (typeof request === 'object' && request !== null && Reflect.get(request, 'method') === 'session.open') {
+            started = true;
+            await new Promise<void>((resolve, reject) => {
+              let unsubscribe = (): void => undefined;
+              unsubscribe = service.subscribeDm((event) => {
+                if (event.kind !== 'offer') return;
+                unsubscribe();
+                resolve();
+              });
+              void service.start().catch((error: unknown) => {
+                unsubscribe();
+                reject(error);
+              });
+            });
+          }
+        }
+        post(port, { kind: 'response', invocation: message.invocation, response: result.response });
+      }).catch(() => {
+        invocations.delete(token);
+        post(port, {
+          kind: 'request-fault', invocation: message.invocation,
+          fault: { kind: 'transport_fault', code: 'PROTOCOL_ERROR', message: 'Worker dispatch failed.', websocketCloseCode: 1002 },
+        });
+      });
+      return;
+    }
+    try {
+      if (message.kind === 'close') runtime.close();
+      else if (message.kind === 'dispose') runtime.dispose();
+      else runtime.destroySession();
+    } catch {
+      post(port, {
+        kind: 'fault',
+        fault: {
+          kind: 'transport_fault', code: 'PROTOCOL_ERROR',
+          message: 'Worker session cleanup failed.', websocketCloseCode: 1002,
+        },
+      });
+    } finally {
+      unsubscribeEvent();
+      unsubscribeFault();
+      invocations.clear();
+      post(port, { kind: 'closed' });
+      port.close();
+    }
+  };
+  port.addEventListener('message', onMessage);
+  port.start();
+  return () => {
+    port.removeEventListener('message', onMessage);
+    unsubscribeEvent();
+    unsubscribeFault();
+    try {
+      runtime.destroySession();
+    } finally {
+      invocations.clear();
+      port.close();
+    }
+  };
+}
+
+interface WorkerScope {
+  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerConnectMessage>) => void): void;
+}
+
+const scope = globalThis as unknown as Partial<WorkerScope>;
+scope.addEventListener?.('message', (event) => {
+  const data: unknown = event.data;
+  if (
+    typeof data === 'object' && data !== null &&
+    Reflect.get(data, 'kind') === 'vtt-handoff.connect' && Reflect.get(data, 'port') instanceof MessagePort
+  ) attachHandoffWorkerPort(Reflect.get(data, 'port') as MessagePort);
+});
diff --git a/src/vtt/handoff/worker-harness.ts b/src/vtt/handoff/worker-harness.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d2b30a6dc6347521b83446798669af2446d93eeb
--- /dev/null
+++ b/src/vtt/handoff/worker-harness.ts
@@ -0,0 +1,209 @@
+import type { HandoffResponse } from './protocol-runtime';
+import { SceneTransportFaultError } from './scene-transport';
+import { createHandoffWorkerTransport, type WorkerSceneTransport } from './worker-transport';
+import type { SceneSnapshot } from './v1/contracts';
+
+interface ArtifactMarker {
+  readonly artifact: 'dev' | 'dist';
+  readonly commit?: string;
+  readonly worker?: { readonly url: string; readonly sha256: string };
+}
+
+export interface WorkerHarnessState {
+  readonly artifact: ArtifactMarker;
+  readonly generation: number;
+  readonly status: string;
+  readonly eventSequences: readonly number[];
+  readonly eventRevisions: readonly number[];
+  readonly snapshot: SceneSnapshot | null;
+  readonly lastResponse: HandoffResponse | null;
+  readonly lastFault: string | null;
+}
+
+export interface WorkerHarnessApi {
+  state(): WorkerHarnessState;
+  request(request: unknown): Promise<HandoffResponse>;
+  malformed(): Promise<string>;
+  reconnect(): Promise<WorkerHarnessState>;
+  dispose(): void;
+}
+
+declare global {
+  interface Window {
+    __VTT_HANDOFF_HARNESS__?: WorkerHarnessApi;
+  }
+}
+
+async function artifactMarker(): Promise<ArtifactMarker> {
+  if (import.meta.env.DEV) return { artifact: 'dev' };
+  const response = await fetch('/vtt-handoff-artifact.json', { cache: 'no-store' });
+  if (!response.ok) throw new Error('The production VTT handoff artifact stamp is unavailable.');
+  const marker: unknown = await response.json();
+  if (
+    typeof marker !== 'object' || marker === null ||
+    Reflect.get(marker, 'artifact') !== 'dist' ||
+    typeof Reflect.get(marker, 'commit') !== 'string'
+  ) throw new Error('The production VTT handoff artifact stamp is invalid.');
+  const worker = Reflect.get(marker, 'worker');
+  if (
+    typeof worker !== 'object' || worker === null ||
+    typeof Reflect.get(worker, 'url') !== 'string' ||
+    typeof Reflect.get(worker, 'sha256') !== 'string'
+  ) throw new Error('The production VTT handoff Worker stamp is invalid.');
+  return {
+    artifact: 'dist',
+    commit: Reflect.get(marker, 'commit') as string,
+    worker: {
+      url: Reflect.get(worker, 'url') as string,
+      sha256: Reflect.get(worker, 'sha256') as string,
+    },
+  };
+}
+
+function render(root: HTMLElement, state: WorkerHarnessState, api: WorkerHarnessApi | null): void {
+  root.replaceChildren();
+  const heading = document.createElement('h1');
+  heading.textContent = 'VTT handoff Worker';
+  const summary = document.createElement('output');
+  summary.dataset.testid = 'handoff-state';
+  summary.dataset.artifact = state.artifact.artifact;
+  summary.dataset.generation = String(state.generation);
+  summary.dataset.status = state.status;
+  summary.dataset.eventCount = String(state.eventSequences.length);
+  summary.dataset.revision = String(state.snapshot?.revision ?? -1);
+  summary.dataset.lastFault = state.lastFault ?? '';
+  summary.textContent = JSON.stringify({
+    artifact: state.artifact,
+    generation: state.generation,
+    status: state.status,
+    eventSequences: state.eventSequences,
+    eventRevisions: state.eventRevisions,
+    lastResponse: state.lastResponse,
+  });
+  const scene = document.createElement('section');
+  scene.dataset.testid = 'synthetic-scene';
+  scene.setAttribute('aria-label', 'Synthetic VTT scene');
+  for (const token of state.snapshot?.tokens ?? []) {
+    const tokenElement = document.createElement('span');
+    tokenElement.dataset.tokenId = token.id;
+    tokenElement.dataset.position = `${String(token.x)},${String(token.y)},${String(token.z)}`;
+    tokenElement.textContent = `${token.label} @ ${tokenElement.dataset.position}`;
+    scene.append(tokenElement);
+  }
+  for (const door of state.snapshot?.doors ?? []) {
+    const doorElement = document.createElement('span');
+    doorElement.dataset.doorId = door.id;
+    doorElement.dataset.open = String(door.open);
+    doorElement.textContent = `${door.id}: ${door.open ? 'open' : 'closed'}`;
+    scene.append(doorElement);
+  }
+  const controls = document.createElement('nav');
+  controls.setAttribute('aria-label', 'Worker harness controls');
+  const control = (label: string, action: () => void): HTMLButtonElement => {
+    const button = document.createElement('button');
+    button.type = 'button';
+    button.textContent = label;
+    button.disabled = api === null;
+    button.addEventListener('click', action);
+    return button;
+  };
+  controls.append(
+    control('Snapshot', () => { void api?.request({ v: 1, id: `snapshot:${String(state.generation)}`, method: 'scene.snapshot', params: {} }); }),
+    control('Open door', () => { void api?.request({
+      v: 1, id: `door:${String(state.generation)}`, method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    }); }),
+    control('Reconnect', () => { void api?.reconnect(); }),
+    control('Dispose', () => api?.dispose()),
+  );
+  root.append(heading, summary, scene, controls);
+}
+
+export async function mountWorkerHarness(root: HTMLElement): Promise<WorkerHarnessApi> {
+  const marker = await artifactMarker();
+  let generation = 0;
+  let transport: WorkerSceneTransport | null = null;
+  let snapshot: SceneSnapshot | null = null;
+  let lastResponse: HandoffResponse | null = null;
+  let lastFault: string | null = null;
+  let eventSequences: number[] = [];
+  let eventRevisions: number[] = [];
+  let api: WorkerHarnessApi | null = null;
+
+  const state = (): WorkerHarnessState => ({
+    artifact: marker,
+    generation,
+    status: transport?.status() ?? 'connecting',
+    eventSequences: [...eventSequences],
+    eventRevisions: [...eventRevisions],
+    snapshot,
+    lastResponse,
+    lastFault,
+  });
+  const update = (): void => render(root, state(), api);
+  const connect = async (): Promise<void> => {
+    generation += 1;
+    snapshot = null;
+    lastResponse = null;
+    lastFault = null;
+    eventSequences = [];
+    eventRevisions = [];
+    const nextTransport = createHandoffWorkerTransport();
+    transport = nextTransport;
+    nextTransport.subscribe((event) => {
+      snapshot = event.data;
+      eventSequences.push(event.seq);
+      eventRevisions.push(event.data.revision);
+      update();
+    });
+    nextTransport.subscribeStatus(update);
+    nextTransport.subscribeErrors((error) => {
+      lastFault = error.code;
+      update();
+    });
+    const initialSnapshot = nextTransport.initialSnapshot();
+    lastResponse = await nextTransport.request({
+      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    await initialSnapshot;
+    update();
+  };
+
+  await connect();
+  const activeTransport = (): WorkerSceneTransport => {
+    if (transport === null) throw new Error('The VTT handoff Worker is not connected.');
+    return transport;
+  };
+  api = {
+    state,
+    async request(request) {
+      lastResponse = await activeTransport().request(request);
+      update();
+      return lastResponse;
+    },
+    async malformed() {
+      try {
+        await activeTransport().request('{');
+        throw new Error('Malformed input unexpectedly succeeded.');
+      } catch (error: unknown) {
+        if (!(error instanceof SceneTransportFaultError)) throw error;
+        lastFault = error.code;
+        update();
+        return error.code;
+      }
+    },
+    async reconnect() {
+      activeTransport().destroySession();
+      await connect();
+      return state();
+    },
+    dispose() {
+      activeTransport().dispose();
+      update();
+    },
+  };
+  window.__VTT_HANDOFF_HARNESS__ = api;
+  update();
+  window.addEventListener('pagehide', () => activeTransport().dispose(), { once: true });
+  return api;
+}
diff --git a/src/vtt/handoff/worker-memory-session-store.ts b/src/vtt/handoff/worker-memory-session-store.ts
new file mode 100644
index 0000000000000000000000000000000000000000..0f07fc641f234e553f976ed96a784d304ead2baf
--- /dev/null
+++ b/src/vtt/handoff/worker-memory-session-store.ts
@@ -0,0 +1,12 @@
+import { MemoryBrowserSessionStore } from '../session-persistence';
+
+/** A deliberately page-lifetime-only Worker store. Reloading creates a new instance. */
+export class NamedWorkerMemorySessionStore extends MemoryBrowserSessionStore {
+  constructor(readonly name: string) {
+    super();
+  }
+
+  override async flush(): Promise<void> {
+    // Memory is already authoritative inside this named, page-lifetime session.
+  }
+}
diff --git a/src/vtt/handoff/worker-messages.ts b/src/vtt/handoff/worker-messages.ts
new file mode 100644
index 0000000000000000000000000000000000000000..6f68dd5a0d5f50d5ce5bb13a0cb894a4f9db30bc
--- /dev/null
+++ b/src/vtt/handoff/worker-messages.ts
@@ -0,0 +1,48 @@
+import { z } from 'zod';
+import { handoffEventSchema, handoffResponseSchema } from './v1/contracts';
+import type { ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
+import type { HandoffResponse } from './protocol-runtime';
+
+const invocationSchema = z.number().int().safe().positive();
+const transportFaultSchema = z.strictObject({
+  kind: z.literal('transport_fault'),
+  code: z.enum(['INVALID_UTF8', 'INVALID_JSON', 'PROTOCOL_ERROR']),
+  message: z.string(),
+  websocketCloseCode: z.union([z.literal(1002), z.literal(1007)]),
+});
+
+export const workerClientMessageSchema = z.discriminatedUnion('kind', [
+  z.strictObject({ kind: z.literal('request'), invocation: invocationSchema, request: z.unknown() }),
+  z.strictObject({ kind: z.literal('close') }),
+  z.strictObject({ kind: z.literal('dispose') }),
+  z.strictObject({ kind: z.literal('destroy') }),
+]);
+
+export const workerServerMessageSchema = z.discriminatedUnion('kind', [
+  z.strictObject({ kind: z.literal('response'), invocation: invocationSchema, response: handoffResponseSchema }),
+  z.strictObject({ kind: z.literal('request-fault'), invocation: invocationSchema, fault: transportFaultSchema }),
+  z.strictObject({
+    kind: z.literal('event'), event: handoffEventSchema,
+    receiptInvocation: invocationSchema.optional(), receiptRevision: z.number().int().safe().optional(),
+  }),
+  z.strictObject({ kind: z.literal('fault'), fault: transportFaultSchema }),
+  z.strictObject({ kind: z.literal('closed') }),
+]);
+
+export type WorkerClientMessage =
+  | { readonly kind: 'request'; readonly invocation: number; readonly request: unknown }
+  | { readonly kind: 'close' }
+  | { readonly kind: 'dispose' }
+  | { readonly kind: 'destroy' };
+
+export type WorkerServerMessage =
+  | { readonly kind: 'response'; readonly invocation: number; readonly response: HandoffResponse }
+  | { readonly kind: 'request-fault'; readonly invocation: number; readonly fault: ProtocolTransportFault }
+  | { readonly kind: 'event'; readonly event: SceneSnapshotEvent; readonly receiptInvocation?: number; readonly receiptRevision?: number }
+  | { readonly kind: 'fault'; readonly fault: ProtocolTransportFault }
+  | { readonly kind: 'closed' };
+
+export interface WorkerConnectMessage {
+  readonly kind: 'vtt-handoff.connect';
+  readonly port: MessagePort;
+}
diff --git a/src/vtt/handoff/worker-transport.ts b/src/vtt/handoff/worker-transport.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ede1febdc713811f8304d52f2805131b04ac66ef
--- /dev/null
+++ b/src/vtt/handoff/worker-transport.ts
@@ -0,0 +1,173 @@
+import { handoffEventSchema, handoffResponseSchema, type SceneSnapshot } from './v1/contracts';
+import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
+import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus } from './scene-transport';
+import {
+  workerServerMessageSchema, type WorkerClientMessage, type WorkerConnectMessage,
+} from './worker-messages';
+
+interface Pending {
+  readonly id: string | null;
+  readonly method: string | null;
+  readonly resolve: (response: HandoffResponse) => void;
+  readonly reject: (error: Error) => void;
+  receiptRevision: number | null;
+}
+
+function property(input: unknown, key: string): unknown {
+  if (typeof input !== 'object' || input === null) return undefined;
+  try { return Reflect.get(input, key); } catch { return undefined; }
+}
+
+export class WorkerSceneTransport implements SceneTransport {
+  readonly #pending = new Map<number, Pending>();
+  readonly #events = new Set<(event: SceneSnapshotEvent) => void>();
+  readonly #statuses = new Set<(status: SceneTransportStatus) => void>();
+  readonly #errors = new Set<(error: SceneTransportFaultError) => void>();
+  #status: SceneTransportStatus = 'connecting';
+  #invocation = 0;
+  #initial: Promise<SceneSnapshot>;
+  #resolveInitial: ((snapshot: SceneSnapshot) => void) | null = null;
+  #rejectInitial: ((error: Error) => void) | null = null;
+
+  constructor(readonly port: MessagePort, readonly terminate: () => void = () => port.close()) {
+    this.#initial = new Promise((resolve, reject) => {
+      this.#resolveInitial = resolve;
+      this.#rejectInitial = reject;
+    });
+    void this.#initial.catch(() => undefined);
+    port.addEventListener('message', this.#onMessage);
+    port.start();
+  }
+
+  request(request: unknown): Promise<HandoffResponse> {
+    if (this.#status === 'closed' || this.#status === 'disposed') return Promise.reject(new SceneTransportClosedError());
+    this.#invocation += 1;
+    const invocation = this.#invocation;
+    const idValue = property(request, 'id');
+    const methodValue = property(request, 'method');
+    let rejectRequest: ((error: Error) => void) | undefined;
+    const promise = new Promise<HandoffResponse>((resolve, reject) => {
+      rejectRequest = reject;
+      this.#pending.set(invocation, {
+        id: typeof idValue === 'string' ? idValue : null,
+        method: typeof methodValue === 'string' ? methodValue : null,
+        resolve, reject, receiptRevision: null,
+      });
+    });
+    try {
+      this.#post({ kind: 'request', invocation, request });
+    } catch {
+      this.#pending.delete(invocation);
+      const fault: ProtocolTransportFault = {
+        kind: 'transport_fault', code: 'PROTOCOL_ERROR',
+        message: 'Worker request could not cross the message boundary.', websocketCloseCode: 1002,
+      };
+      this.#emitFault(fault);
+      rejectRequest?.(new SceneTransportFaultError(fault));
+      return promise;
+    }
+    return promise;
+  }
+
+  initialSnapshot(): Promise<SceneSnapshot> { return this.#initial; }
+  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void { this.#events.add(listener); return () => this.#events.delete(listener); }
+  status(): SceneTransportStatus { return this.#status; }
+  subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void {
+    try { listener(this.#status); } catch { /* Isolated observer. */ }
+    this.#statuses.add(listener);
+    return () => this.#statuses.delete(listener);
+  }
+  subscribeErrors(listener: (error: SceneTransportFaultError) => void): () => void { this.#errors.add(listener); return () => this.#errors.delete(listener); }
+  close(): void { this.#shutdown('closed', 'close'); }
+  dispose(): void { this.#shutdown('disposed', 'dispose'); }
+  destroySession(): void { this.#shutdown('disposed', 'destroy'); }
+
+  readonly #onMessage = (messageEvent: MessageEvent<unknown>): void => {
+    const decoded = workerServerMessageSchema.safeParse(messageEvent.data);
+    if (!decoded.success) { this.#protocolFault('Worker emitted an invalid message envelope.'); return; }
+    const message = decoded.data;
+    if (message.kind === 'event') {
+      const parsed = handoffEventSchema.safeParse(message.event);
+      if (!parsed.success) { this.#protocolFault('Worker emitted an invalid event.'); return; }
+      if (message.receiptInvocation !== undefined) {
+        const pending = this.#pending.get(message.receiptInvocation);
+        if (pending !== undefined && (pending.method === 'token.move' || pending.method === 'door.set')) {
+          pending.receiptRevision = message.receiptRevision ?? null;
+        }
+      }
+      this.#resolveInitial?.(parsed.data.data);
+      this.#resolveInitial = null;
+      this.#rejectInitial = null;
+      for (const listener of this.#events) { try { listener(parsed.data); } catch { /* Isolated observer. */ } }
+      return;
+    }
+    if (message.kind === 'fault') { this.#emitFault(message.fault); return; }
+    if (message.kind === 'request-fault') {
+      const pending = this.#pending.get(message.invocation);
+      if (pending !== undefined) { this.#pending.delete(message.invocation); pending.reject(new SceneTransportFaultError(message.fault)); }
+      return;
+    }
+    if (message.kind === 'response') {
+      const pending = this.#pending.get(message.invocation);
+      if (pending === undefined) return;
+      const parsed = handoffResponseSchema.safeParse(message.response);
+      if (!parsed.success || pending.id !== null && parsed.data.id !== pending.id) { this.#protocolFault('Worker response correlation failed.'); return; }
+      this.#pending.delete(message.invocation);
+      if (pending.method === 'session.open' && parsed.data.ok) this.#setStatus('open');
+      pending.resolve(parsed.data);
+      return;
+    }
+    this.#finishShutdown();
+  };
+
+  #post(message: WorkerClientMessage): void { this.port.postMessage(message); }
+  #protocolFault(message: string): void {
+    this.#emitFault({ kind: 'transport_fault', code: 'PROTOCOL_ERROR', message, websocketCloseCode: 1002 });
+  }
+  #emitFault(fault: ProtocolTransportFault): void {
+    const error = new SceneTransportFaultError(fault);
+    for (const listener of this.#errors) { try { listener(error); } catch { /* Isolated observer. */ } }
+  }
+  #shutdown(status: SceneTransportStatus, kind: 'close' | 'dispose' | 'destroy'): void {
+    if (this.#status === 'closed' || this.#status === 'disposed') return;
+    this.#setStatus(status);
+    try {
+      this.#post({ kind });
+    } catch {
+      this.#protocolFault('Worker cleanup message could not cross the message boundary.');
+    } finally {
+      this.#finishShutdown();
+    }
+  }
+  #finishShutdown(): void {
+    const error = new SceneTransportClosedError();
+    this.#rejectInitial?.(error);
+    this.#resolveInitial = null;
+    this.#rejectInitial = null;
+    for (const [invocation, pending] of this.#pending) {
+      if (pending.receiptRevision !== null && pending.id !== null && (pending.method === 'token.move' || pending.method === 'door.set')) {
+        pending.resolve({ v: 1, id: pending.id, ok: true, result: { revision: pending.receiptRevision } });
+      } else pending.reject(error);
+      this.#pending.delete(invocation);
+    }
+    this.port.removeEventListener('message', this.#onMessage);
+    this.#events.clear();
+    this.#errors.clear();
+    this.#statuses.clear();
+    this.terminate();
+  }
+  #setStatus(status: SceneTransportStatus): void {
+    if (this.#status === status) return;
+    this.#status = status;
+    for (const listener of this.#statuses) { try { listener(status); } catch { /* Isolated observer. */ } }
+  }
+}
+
+export function createHandoffWorkerTransport(): WorkerSceneTransport {
+  const workerUrl = new URL('./worker-entry.ts', import.meta.url);
+  const worker = new Worker(workerUrl, { type: 'module', name: 'vtt-handoff-worker' });
+  const channel = new MessageChannel();
+  const connect: WorkerConnectMessage = { kind: 'vtt-handoff.connect', port: channel.port2 };
+  worker.postMessage(connect, [channel.port2]);
+  return new WorkerSceneTransport(channel.port1, () => worker.terminate());
+}
diff --git a/tests/browser/vtt-handoff/playwright.config.ts b/tests/browser/vtt-handoff/playwright.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..fc8a03e8a04fc655d4dcfa1cc23fbe77556ad2e0
--- /dev/null
+++ b/tests/browser/vtt-handoff/playwright.config.ts
@@ -0,0 +1,45 @@
+import { defineConfig } from '@playwright/test';
+import { fileURLToPath } from 'node:url';
+import { dirname, join, resolve } from 'node:path';
+import { tmpdir } from 'node:os';
+
+const rawPort = process.env.PLAYWRIGHT_PORT;
+if (rawPort === undefined || !/^\d+$/u.test(rawPort)) {
+  throw new Error('PLAYWRIGHT_PORT is required for the VTT handoff Worker spec.');
+}
+const port = Number(rawPort);
+if (!Number.isSafeInteger(port) || port < 1 || port > 65_535 || port === 4_173) {
+  throw new Error(`PLAYWRIGHT_PORT must be a valid non-4173 port; received "${rawPort}".`);
+}
+if (process.env.PLAYWRIGHT_WORKERS !== undefined && process.env.PLAYWRIGHT_WORKERS !== '1') {
+  throw new Error('The VTT handoff Worker spec requires PLAYWRIGHT_WORKERS=1.');
+}
+const artifact = process.env.VTT_HANDOFF_ARTIFACT;
+if (artifact !== 'dev' && artifact !== 'dist') {
+  throw new Error('VTT_HANDOFF_ARTIFACT must be either dev or dist.');
+}
+const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
+const cacheDirectory = join(tmpdir(), `dnd-vtt-handoff-playwright-${rawPort}-${String(process.pid)}`);
+
+export default defineConfig({
+  testDir: resolve(repositoryRoot, 'tests/browser/vtt-handoff'),
+  fullyParallel: false,
+  workers: 1,
+  use: {
+    baseURL: `http://127.0.0.1:${rawPort}`,
+    headless: true,
+    trace: 'on-first-retry',
+  },
+  webServer: {
+    cwd: repositoryRoot,
+    command: artifact === 'dev'
+      ? `npm run dev -- --host 127.0.0.1 --port ${rawPort} --strictPort`
+      : `node tools/vtt-handoff/serve-existing-dist.mjs --port ${rawPort}`,
+    url: `http://127.0.0.1:${rawPort}/vtt-handoff`,
+    reuseExistingServer: false,
+    env: {
+      AI_BRIDGE_FAKE: '1',
+      STATIC_APP_CACHE_DIR: cacheDirectory,
+    },
+  },
+});
diff --git a/tests/browser/vtt-handoff/worker.spec.ts b/tests/browser/vtt-handoff/worker.spec.ts
new file mode 100644
index 0000000000000000000000000000000000000000..547f4ffe590cd9d4f4c84fdba3756523dc102c45
--- /dev/null
+++ b/tests/browser/vtt-handoff/worker.spec.ts
@@ -0,0 +1,125 @@
+import { expect, test } from '@playwright/test';
+import type {} from '../../../src/vtt/handoff/worker-harness';
+
+test('drives the v1 handoff across an actual module Worker', async ({ page }, testInfo) => {
+  const workerUrls: string[] = [];
+  page.on('request', (request) => {
+    if (request.resourceType() === 'script' && /worker-entry/u.test(request.url())) workerUrls.push(request.url());
+  });
+  await page.goto('/vtt-handoff');
+  const state = page.getByTestId('handoff-state');
+  await expect(state).toHaveAttribute('data-status', 'open');
+
+  const initial = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.state();
+  });
+  expect(initial.lastResponse).toMatchObject({ v: 1, id: '', ok: true });
+  expect(initial.eventSequences.length).toBeGreaterThan(1);
+  expect(initial.eventSequences).toEqual(initial.eventSequences.map((_sequence, index) => index + 1));
+  expect(initial.eventRevisions[0]).toBe(0);
+  expect(initial.eventRevisions.at(-1)).toBeGreaterThan(0);
+  expect(initial.snapshot?.revision).toBe(initial.eventRevisions.at(-1));
+  expect(workerUrls).toHaveLength(1);
+
+  const correlated = await page.evaluate(async () => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return Promise.all([
+      api.request({ v: 1, id: 'snapshot:a', method: 'scene.snapshot', params: {} }),
+      api.request({ v: 1, id: 'snapshot:b', method: 'scene.snapshot', params: {} }),
+    ]);
+  });
+  expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
+  expect(correlated.every((response) => response.ok)).toBe(true);
+
+  const invalid = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.request({ v: 1, id: 'invalid-door', method: 'door.set', params: { doorId: 42, open: true } });
+  });
+  expect(invalid).toMatchObject({ id: 'invalid-door', ok: false, error: { code: 'INVALID_REQUEST' } });
+  await expect(page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.malformed();
+  })).resolves.toBe('INVALID_JSON');
+
+  const beforeMutation = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.state();
+  });
+  const mutation = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.request({
+      v: 1, id: 'door:once', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+  });
+  expect(mutation).toMatchObject({ id: 'door:once', ok: true });
+  if (!mutation.ok || typeof mutation.result.revision !== 'number') throw new Error('Expected a mutation revision.');
+  const afterMutation = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.state();
+  });
+  expect(afterMutation.eventSequences).toHaveLength(beforeMutation.eventSequences.length + 1);
+  expect(afterMutation.eventRevisions.at(-1)).toBe(mutation.result.revision);
+  expect(afterMutation.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
+
+  const duplicate = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.request({
+      v: 1, id: 'door:once', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: false },
+    });
+  });
+  expect(duplicate).toMatchObject({ id: 'door:once', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
+  expect((await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.state();
+  })).eventSequences).toEqual(afterMutation.eventSequences);
+
+  const reconnected = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.reconnect();
+  });
+  expect(reconnected.generation).toBe(2);
+  expect(reconnected.eventSequences.length).toBeGreaterThan(1);
+  expect(reconnected.eventSequences).toEqual(reconnected.eventSequences.map((_sequence, index) => index + 1));
+  expect(reconnected.eventRevisions[0]).toBe(0);
+  expect(reconnected.eventRevisions.at(-1)).toBeGreaterThan(0);
+  expect(reconnected.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(false);
+  expect(workerUrls).toHaveLength(2);
+
+  await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    api.dispose();
+  });
+  await expect(state).toHaveAttribute('data-status', 'disposed');
+  const artifact = await page.evaluate(() => {
+    const api = window.__VTT_HANDOFF_HARNESS__;
+    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
+    return api.state().artifact;
+  });
+  const expectedArtifact = process.env.VTT_HANDOFF_ARTIFACT;
+  expect(artifact.artifact).toBe(expectedArtifact);
+  if (expectedArtifact === 'dev') {
+    expect(artifact).toEqual({ artifact: 'dev' });
+  } else {
+    expect(artifact.artifact).not.toBe('dev');
+    expect(artifact.commit).toMatch(/^[0-9a-f]{40}$/u);
+    expect(artifact.worker?.sha256).toMatch(/^[0-9a-f]{64}$/u);
+    expect(new URL(workerUrls[0]!).pathname).toBe(artifact.worker?.url);
+  }
+  const record = JSON.stringify({ artifact, pageUrl: page.url(), workerUrls });
+  await testInfo.attach('vtt-handoff-artifact', { body: record, contentType: 'application/json' });
+  console.log(`artifact=${expectedArtifact} page=${page.url()} worker=${workerUrls.join(',')}`);
+});
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index 42ecfe130a4c6c724959b78552e33783bd06fa43..a0b09a33e9ce37b9fec93ea5b0e7122d3a92451f
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -112,7 +112,7 @@
   const violations: string[] = [];
   for (const module of graph.values()) {
     for (const edge of module.imports) {
-      if (edge.specifier === 'node:fs' || edge.specifier.startsWith('node:fs/')) {
+      if (edge.specifier.startsWith('node:')) {
         violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
       }
     }
@@ -131,7 +131,7 @@
       }
       if (
         ts.isIdentifier(node) &&
-        /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?)$/u.test(node.text)
+        /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u.test(node.text)
       ) {
         violations.push(`${repositoryPath(module.file)} names ${node.text}`);
       }
@@ -294,6 +294,8 @@
   'src/vtt/encounter-session-service.ts',
   'src/vtt/handoff/protocol-runtime.ts',
   'src/vtt/handoff/in-process-transport.ts',
+  'src/vtt/handoff/worker-entry.ts',
+  'src/vtt/handoff/worker-transport.ts',
 ] as const;
 
 let cachedCoreGraph: ReadonlyMap<string, SourceModule> | null = null;
diff --git a/tests/unit/vtt/serve-existing-dist.test.ts b/tests/unit/vtt/serve-existing-dist.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..60160df29489cfd220e5e9c6997d2dce6f4bcea7
--- /dev/null
+++ b/tests/unit/vtt/serve-existing-dist.test.ts
@@ -0,0 +1,82 @@
+import { createHash } from 'node:crypto';
+import type { AddressInfo } from 'node:net';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync,
+} from '../../helpers/test-filesystem';
+import {
+  createExistingDistServer, safeDistPath, validateExistingDist,
+} from '../../../tools/vtt-handoff/serve-existing-dist.mjs';
+
+const temporaryDirectories: string[] = [];
+
+function fixture(): string {
+  const root = mkdtempSync(join(tmpdir(), 'vtt-handoff-dist-test-'));
+  temporaryDirectories.push(root);
+  mkdirSync(join(root, 'assets'));
+  writeFileSync(join(root, 'index.html'), '<h1>stamped</h1>');
+  const worker = Buffer.from('self.onmessage = () => undefined;\n');
+  writeFileSync(join(root, 'assets/worker-entry-test.js'), worker);
+  writeFileSync(join(root, 'vtt-handoff-artifact.json'), `${JSON.stringify({
+    artifact: 'dist',
+    commit: 'a'.repeat(40),
+    worker: {
+      url: '/assets/worker-entry-test.js',
+      sha256: createHash('sha256').update(worker).digest('hex'),
+    },
+  })}\n`);
+  return root;
+}
+
+afterEach(() => {
+  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
+});
+
+describe('serve-existing-dist', () => {
+  it('serves only an existing stamped dist without invoking a build', async () => {
+    const root = fixture();
+    const server = createExistingDistServer(root);
+    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
+    const address = server.address() as AddressInfo;
+    const response = await fetch(`http://127.0.0.1:${String(address.port)}/vtt-handoff`);
+    expect(await response.text()).toBe('<h1>stamped</h1>');
+    await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
+    const source = readFileSync('tools/vtt-handoff/serve-existing-dist.mjs', 'utf8');
+    expect(source).not.toMatch(/(?:exec|spawn)(?:File|Sync)?\s*\(/u);
+  });
+
+  it('refuses missing, unstamped, and tampered dist trees', () => {
+    const missing = join(tmpdir(), `vtt-handoff-missing-${String(process.pid)}`);
+    expect(() => validateExistingDist(missing)).toThrow('missing dist');
+    const root = fixture();
+    rmSync(join(root, 'vtt-handoff-artifact.json'));
+    expect(() => validateExistingDist(root)).toThrow('unstamped dist');
+    const tampered = fixture();
+    writeFileSync(join(tampered, 'assets/worker-entry-test.js'), 'changed');
+    expect(() => validateExistingDist(tampered)).toThrow('hash disagrees');
+  });
+
+  it('rejects traversal while retaining ordinary asset resolution', () => {
+    const root = fixture();
+    expect(safeDistPath(root, '/assets/worker-entry-test.js')).toBe(join(root, 'assets/worker-entry-test.js'));
+    expect(safeDistPath(root, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
+    expect(safeDistPath(root, '/bad%00path')).toBeNull();
+  });
+
+  it('does not serve a symlink that escapes the stamped dist', async () => {
+    const root = fixture();
+    const outside = mkdtempSync(join(tmpdir(), 'vtt-handoff-dist-outside-'));
+    temporaryDirectories.push(outside);
+    writeFileSync(join(outside, 'secret.txt'), 'not part of dist');
+    symlinkSync(join(outside, 'secret.txt'), join(root, 'leak.txt'));
+    const server = createExistingDistServer(root);
+    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
+    const address = server.address() as AddressInfo;
+    const response = await fetch(`http://127.0.0.1:${String(address.port)}/leak.txt`);
+    expect(response.status).toBe(400);
+    expect(await response.text()).toBe('Invalid path.');
+    await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
+  });
+});
diff --git a/tests/unit/vtt/worker-boundary.test.ts b/tests/unit/vtt/worker-boundary.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5c0cab647081f3acec3606c4dd6ddc6969e5c51d
--- /dev/null
+++ b/tests/unit/vtt/worker-boundary.test.ts
@@ -0,0 +1,154 @@
+import { describe, expect, it, vi } from 'vitest';
+import { attachHandoffWorkerPort } from '../../../src/vtt/handoff/worker-entry';
+import { WorkerSceneTransport } from '../../../src/vtt/handoff/worker-transport';
+import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
+import { readFileSync } from '../../helpers/test-filesystem';
+
+describe('VTT handoff Worker message boundary', () => {
+  it('crosses one structured-clone boundary per port post without internal re-serialization', async () => {
+    const channel = new MessageChannel();
+    const clientPosts = vi.spyOn(channel.port1, 'postMessage');
+    const workerPosts = vi.spyOn(channel.port2, 'postMessage');
+    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    const events: number[] = [];
+    transport.subscribe((event) => events.push(event.seq));
+
+    const open = await transport.request({
+      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    const snapshot = await transport.initialSnapshot();
+    expect(open).toMatchObject({ v: 1, id: '', ok: true });
+    expect(snapshot).toMatchObject({ sceneId: 'scene:vtt-handoff-worker', revision: 0 });
+    expect(events).toEqual([1]);
+    expect({ requestClones: clientPosts.mock.calls.length, workerClones: workerPosts.mock.calls.length })
+      .toEqual({ requestClones: 1, workerClones: 2 });
+    const adapterSources = [
+      readFileSync('src/vtt/handoff/worker-entry.ts', 'utf8'),
+      readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8'),
+      readFileSync('src/vtt/handoff/worker-messages.ts', 'utf8'),
+      readFileSync('src/vtt/handoff/worker-memory-session-store.ts', 'utf8'),
+    ].join('\n');
+    expect(adapterSources).not.toMatch(/JSON\.(?:parse|stringify)|structuredClone/u);
+    transport.dispose();
+    detach();
+
+    const liveChannel = new MessageChannel();
+    const detachLive = attachHandoffWorkerPort(liveChannel.port2);
+    const live = new WorkerSceneTransport(liveChannel.port1, () => undefined);
+    const liveEvents: Array<{ readonly seq: number; readonly revision: number }> = [];
+    const autonomous = new Promise<void>((resolve) => {
+      live.subscribe((event) => {
+        liveEvents.push({ seq: event.seq, revision: event.data.revision });
+        if (event.seq > 1) resolve();
+      });
+    });
+    await live.request({
+      v: 1, id: 'open-live', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    await autonomous;
+
+    await expect(live.request({
+      v: 1, id: 'invalid', method: 'door.set', params: { doorId: 42, open: true },
+    })).resolves.toMatchObject({ id: 'invalid', ok: false, error: { code: 'INVALID_REQUEST' } });
+    const faults: string[] = [];
+    live.subscribeErrors((error) => faults.push(error.code));
+    await expect(live.request('{')).rejects.toBeInstanceOf(SceneTransportFaultError);
+    expect(faults).toEqual(['INVALID_JSON']);
+
+    const mutation = await live.request({
+      v: 1, id: 'door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+    if (!mutation.ok) throw new Error(`Worker door mutation failed: ${mutation.error.code}: ${mutation.error.message}`);
+    expect(mutation).toMatchObject({ id: 'door', ok: true });
+    if (typeof mutation.result.revision !== 'number') throw new Error('Expected a mutation revision.');
+    expect(liveEvents.some((event) => event.revision === mutation.result.revision)).toBe(true);
+    const beforeDuplicate = liveEvents.length;
+    await expect(live.request({
+      v: 1, id: 'door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: false },
+    })).resolves.toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
+    expect(liveEvents.length).toBe(beforeDuplicate);
+
+    live.dispose();
+    await expect(live.request({
+      v: 1, id: 'after-dispose', method: 'scene.snapshot', params: {},
+    })).rejects.toBeInstanceOf(SceneTransportClosedError);
+    detachLive();
+  });
+
+  it('rejects a wrong-shaped Worker response instead of inventing success', async () => {
+    const channel = new MessageChannel();
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    const faults: string[] = [];
+    transport.subscribeErrors((error) => faults.push(error.code));
+    const pending = transport.request({ v: 1, id: 'expected', method: 'scene.snapshot', params: {} });
+    channel.port2.postMessage({
+      kind: 'response', invocation: 1,
+      response: { v: 1, id: 'wrong', ok: true, result: {} },
+    });
+    await new Promise<void>((resolve) => setTimeout(resolve, 0));
+    expect(faults).toEqual(['PROTOCOL_ERROR']);
+    transport.close();
+    await expect(pending).rejects.toBeInstanceOf(SceneTransportClosedError);
+    channel.port2.close();
+  });
+
+  it('turns a malformed client boundary envelope into a typed fault', async () => {
+    const channel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
+    const fault = new Promise<unknown>((resolve) => {
+      channel.port1.addEventListener('message', (event) => resolve(event.data), { once: true });
+    });
+    channel.port1.start();
+    channel.port1.postMessage(null);
+    await expect(fault).resolves.toMatchObject({
+      kind: 'fault', fault: { kind: 'transport_fault', code: 'PROTOCOL_ERROR', websocketCloseCode: 1002 },
+    });
+    detach();
+    channel.port1.close();
+  });
+
+  it('rejects an uncloneable request as a typed fault without orphaning later work', async () => {
+    const channel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    const faults: string[] = [];
+    transport.subscribeErrors((error) => faults.push(error.code));
+    await expect(transport.request({
+      v: 1, id: 'uncloneable', method: 'scene.snapshot', params: { callback: () => undefined },
+    })).rejects.toMatchObject({ code: 'PROTOCOL_ERROR' });
+    expect(faults).toEqual(['PROTOCOL_ERROR']);
+    await expect(transport.request({
+      v: 1, id: 'open-after-fault', method: 'session.open', params: { requestedRole: 'dm' },
+    })).resolves.toMatchObject({ id: 'open-after-fault', ok: true });
+    transport.dispose();
+    detach();
+  });
+
+  it('preserves an established mutation receipt when its snapshot observer closes the transport', async () => {
+    const channel = new MessageChannel();
+    const detach = attachHandoffWorkerPort(channel.port2);
+    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
+    await transport.request({
+      v: 1, id: 'open-for-receipt', method: 'session.open', params: { requestedRole: 'dm' },
+    });
+    transport.subscribe((event) => {
+      const door = event.data.doors.find((candidate) => candidate.id === 'object:two-room-door');
+      if (door?.open === true) transport.close();
+    });
+    const committed = await transport.request({
+      v: 1, id: 'close-on-door', method: 'door.set',
+      params: { doorId: 'object:two-room-door', open: true },
+    });
+    expect(committed).toMatchObject({ id: 'close-on-door', ok: true });
+    if (!committed.ok) throw new Error('The established Worker receipt was not committed.');
+    expect(typeof committed.result.revision).toBe('number');
+    expect(transport.status()).toBe('closed');
+    await expect(transport.request({
+      v: 1, id: 'unknown-after-close', method: 'scene.snapshot', params: {},
+    })).rejects.toBeInstanceOf(SceneTransportClosedError);
+    detach();
+  });
+});
diff --git a/tools/vtt-handoff/serve-existing-dist.d.mts b/tools/vtt-handoff/serve-existing-dist.d.mts
new file mode 100644
index 0000000000000000000000000000000000000000..5ce4566321cf12d592ce3f32c0547b33ea0dfbbd
--- /dev/null
+++ b/tools/vtt-handoff/serve-existing-dist.d.mts
@@ -0,0 +1,14 @@
+import type { Server } from 'node:http';
+
+export interface DistArtifactStamp {
+  readonly artifact: 'dist';
+  readonly commit: string;
+  readonly worker: { readonly url: string; readonly sha256: string };
+}
+
+export function validateExistingDist(directory: string): {
+  readonly root: string;
+  readonly stamp: DistArtifactStamp;
+};
+export function safeDistPath(root: string, requestPath: string): string | null;
+export function createExistingDistServer(directory: string): Server;
diff --git a/tools/vtt-handoff/serve-existing-dist.mjs b/tools/vtt-handoff/serve-existing-dist.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..5ea7f41241fe6dd9eb2680c4ff76f4a7c51e4b82
--- /dev/null
+++ b/tools/vtt-handoff/serve-existing-dist.mjs
@@ -0,0 +1,127 @@
+import { createHash } from 'node:crypto';
+import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
+import { createServer } from 'node:http';
+import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const CONTENT_TYPES = new Map([
+  ['.css', 'text/css; charset=utf-8'],
+  ['.html', 'text/html; charset=utf-8'],
+  ['.js', 'text/javascript; charset=utf-8'],
+  ['.json', 'application/json; charset=utf-8'],
+  ['.svg', 'image/svg+xml'],
+  ['.wasm', 'application/wasm'],
+]);
+
+function containedRealFile(root, candidate) {
+  try {
+    const real = realpathSync(candidate);
+    const inside = relative(root, real);
+    if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside) || !statSync(real).isFile()) return null;
+    return real;
+  } catch {
+    return null;
+  }
+}
+
+export function validateExistingDist(directory) {
+  const root = resolve(directory);
+  if (!existsSync(root) || !statSync(root).isDirectory()) {
+    throw new Error(`Refusing to serve missing dist directory: ${root}`);
+  }
+  const realRoot = realpathSync(root);
+  const indexPath = containedRealFile(realRoot, resolve(realRoot, 'index.html'));
+  if (indexPath === null) throw new Error(`Refusing to serve missing dist directory: ${root}`);
+  const stampPath = containedRealFile(realRoot, resolve(realRoot, 'vtt-handoff-artifact.json'));
+  if (stampPath === null) throw new Error(`Refusing to serve unstamped dist directory: ${root}`);
+  const stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
+  if (
+    typeof stamp !== 'object' || stamp === null || stamp.artifact !== 'dist' ||
+    typeof stamp.commit !== 'string' || !/^[0-9a-f]{40}$/u.test(stamp.commit) ||
+    typeof stamp.worker !== 'object' || stamp.worker === null ||
+    typeof stamp.worker.url !== 'string' || !stamp.worker.url.startsWith('/') ||
+    typeof stamp.worker.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(stamp.worker.sha256)
+  ) throw new Error('Refusing to serve an invalid VTT handoff dist stamp.');
+  const workerCandidate = safeDistPath(realRoot, stamp.worker.url);
+  const workerPath = workerCandidate === null ? null : containedRealFile(realRoot, workerCandidate);
+  if (workerPath === null) {
+    throw new Error('Refusing to serve a dist whose stamped Worker is missing.');
+  }
+  const actualHash = createHash('sha256').update(readFileSync(workerPath)).digest('hex');
+  if (actualHash !== stamp.worker.sha256) {
+    throw new Error('Refusing to serve a dist whose Worker hash disagrees with its stamp.');
+  }
+  return { root: realRoot, stamp };
+}
+
+export function safeDistPath(root, requestPath) {
+  let pathname;
+  try {
+    pathname = decodeURIComponent(requestPath.split(/[?#]/u, 1)[0]);
+  } catch {
+    return null;
+  }
+  if (pathname.includes('\0') || pathname.split('/').includes('..')) return null;
+  pathname = new URL(pathname, 'http://127.0.0.1').pathname;
+  const candidate = resolve(root, `.${pathname}`);
+  const inside = relative(root, candidate);
+  if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) return null;
+  return candidate;
+}
+
+export function createExistingDistServer(directory) {
+  const validated = validateExistingDist(directory);
+  return createServer((request, response) => {
+    if (request.method !== 'GET' && request.method !== 'HEAD') {
+      response.writeHead(405, { Allow: 'GET, HEAD' });
+      response.end();
+      return;
+    }
+    const requestPath = request.url ?? '/';
+    let filePath = safeDistPath(validated.root, requestPath);
+    if (filePath === null) {
+      response.writeHead(400);
+      response.end('Invalid path.');
+      return;
+    }
+    if (!existsSync(filePath)) {
+      filePath = resolve(validated.root, 'index.html');
+    } else {
+      const contained = containedRealFile(validated.root, filePath);
+      if (contained === null) {
+        response.writeHead(400);
+        response.end('Invalid path.');
+        return;
+      }
+      filePath = contained;
+    }
+    response.writeHead(200, {
+      'Content-Type': CONTENT_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
+      'Cache-Control': 'no-store',
+    });
+    if (request.method === 'HEAD') {
+      response.end();
+      return;
+    }
+    createReadStream(filePath).pipe(response);
+  });
+}
+
+function argumentValue(name) {
+  const index = process.argv.indexOf(name);
+  return index === -1 ? undefined : process.argv[index + 1];
+}
+
+if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
+  const rawPort = argumentValue('--port');
+  if (rawPort === undefined || !/^\d+$/u.test(rawPort)) throw new Error('--port is required.');
+  const port = Number(rawPort);
+  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535 || port === 4_173) {
+    throw new Error(`Invalid non-4173 port: ${rawPort}`);
+  }
+  const directory = argumentValue('--dist') ?? resolve(process.cwd(), 'dist');
+  const server = createExistingDistServer(directory);
+  server.listen(port, '127.0.0.1', () => {
+    console.log(`Serving stamped dist from ${resolve(directory)} at http://127.0.0.1:${String(port)}`);
+  });
+}
diff --git a/vite.config.ts b/vite.config.ts
index 40595367ee24df9efbb0de225c41cbc87772de43..d100e3d643c999c0dc506c8975cb10461f20c54c
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -1,5 +1,6 @@
 import { defineConfig, type Plugin } from 'vite';
 import { createHash } from 'node:crypto';
+import { execFileSync } from 'node:child_process';
 import {
   readFileSync,
   readdirSync,
@@ -87,6 +88,35 @@
   };
 }
 
+function vttHandoffArtifactStamp(): Plugin {
+  let outputDirectory: string | undefined;
+  return {
+    name: 'vtt-handoff-artifact-stamp',
+    apply: 'build',
+    configResolved(config) {
+      outputDirectory = resolve(config.root, config.build.outDir);
+    },
+    writeBundle() {
+      if (outputDirectory === undefined) throw new Error('VTT handoff output directory is unavailable.');
+      const worker = deployableAssets(outputDirectory).find((asset) =>
+        /(?:^|\/)worker-entry-[^/]+\.js$/u.test(asset.fileName));
+      if (worker === undefined) throw new Error('The built VTT handoff Worker asset is unavailable.');
+      const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
+        cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
+      }).trim();
+      if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error('The build commit is invalid.');
+      writeFileSync(join(outputDirectory, 'vtt-handoff-artifact.json'), `${JSON.stringify({
+        artifact: 'dist',
+        commit,
+        worker: {
+          url: `/${worker.fileName.replaceAll('\\', '/')}`,
+          sha256: createHash('sha256').update(worker.source).digest('hex'),
+        },
+      })}\n`);
+    },
+  };
+}
+
 /**
  * Production receives a worker built from the finalized Rollup output. The
  * exact shell filenames and bytes mint its cache name, so each build installs
@@ -276,7 +306,7 @@
 
 const shared = {
   ...core,
-  plugins: [...core.plugins, bundledLicenseTexts(), appShellServiceWorker()],
+  plugins: [...core.plugins, bundledLicenseTexts(), vttHandoffArtifactStamp(), appShellServiceWorker()],
 };
 
 /**
