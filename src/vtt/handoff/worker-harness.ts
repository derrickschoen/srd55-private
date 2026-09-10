import type { HandoffResponse } from './protocol-runtime';
import { SceneTransportFaultError } from './scene-transport';
import { createHandoffWorkerTransport, type WorkerSceneTransport } from './worker-transport';
import type { SceneSnapshot } from './v1/contracts';

interface ArtifactMarker {
  readonly artifact: 'dev' | 'dist';
  readonly commit?: string;
  readonly worker?: { readonly url: string; readonly sha256: string };
}

export interface WorkerHarnessState {
  readonly artifact: ArtifactMarker;
  readonly generation: number;
  readonly status: string;
  readonly eventSequences: readonly number[];
  readonly eventRevisions: readonly number[];
  readonly snapshot: SceneSnapshot | null;
  readonly lastResponse: HandoffResponse | null;
  readonly lastFault: string | null;
}

export interface WorkerHarnessApi {
  state(): WorkerHarnessState;
  request(request: unknown): Promise<HandoffResponse>;
  malformed(): Promise<string>;
  reconnect(): Promise<WorkerHarnessState>;
  dispose(): void;
}

declare global {
  interface Window {
    __VTT_HANDOFF_HARNESS__?: WorkerHarnessApi;
  }
}

async function artifactMarker(): Promise<ArtifactMarker> {
  if (import.meta.env.DEV) return { artifact: 'dev' };
  const response = await fetch('/vtt-handoff-artifact.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('The production VTT handoff artifact stamp is unavailable.');
  const marker: unknown = await response.json();
  if (
    typeof marker !== 'object' || marker === null ||
    Reflect.get(marker, 'artifact') !== 'dist' ||
    typeof Reflect.get(marker, 'commit') !== 'string'
  ) throw new Error('The production VTT handoff artifact stamp is invalid.');
  const worker = Reflect.get(marker, 'worker');
  if (
    typeof worker !== 'object' || worker === null ||
    typeof Reflect.get(worker, 'url') !== 'string' ||
    typeof Reflect.get(worker, 'sha256') !== 'string'
  ) throw new Error('The production VTT handoff Worker stamp is invalid.');
  return {
    artifact: 'dist',
    commit: Reflect.get(marker, 'commit') as string,
    worker: {
      url: Reflect.get(worker, 'url') as string,
      sha256: Reflect.get(worker, 'sha256') as string,
    },
  };
}

function render(root: HTMLElement, state: WorkerHarnessState, api: WorkerHarnessApi | null): void {
  root.replaceChildren();
  const heading = document.createElement('h1');
  heading.textContent = 'VTT handoff Worker';
  const summary = document.createElement('output');
  summary.dataset.testid = 'handoff-state';
  summary.dataset.artifact = state.artifact.artifact;
  summary.dataset.generation = String(state.generation);
  summary.dataset.status = state.status;
  summary.dataset.eventCount = String(state.eventSequences.length);
  summary.dataset.revision = String(state.snapshot?.revision ?? -1);
  summary.dataset.lastFault = state.lastFault ?? '';
  summary.textContent = JSON.stringify({
    artifact: state.artifact,
    generation: state.generation,
    status: state.status,
    eventSequences: state.eventSequences,
    eventRevisions: state.eventRevisions,
    lastResponse: state.lastResponse,
  });
  const scene = document.createElement('section');
  scene.dataset.testid = 'synthetic-scene';
  scene.setAttribute('aria-label', 'Synthetic VTT scene');
  for (const token of state.snapshot?.tokens ?? []) {
    const tokenElement = document.createElement('span');
    tokenElement.dataset.tokenId = token.id;
    tokenElement.dataset.position = `${String(token.x)},${String(token.y)},${String(token.z)}`;
    tokenElement.textContent = `${token.label} @ ${tokenElement.dataset.position}`;
    scene.append(tokenElement);
  }
  for (const door of state.snapshot?.doors ?? []) {
    const doorElement = document.createElement('span');
    doorElement.dataset.doorId = door.id;
    doorElement.dataset.open = String(door.open);
    doorElement.textContent = `${door.id}: ${door.open ? 'open' : 'closed'}`;
    scene.append(doorElement);
  }
  const controls = document.createElement('nav');
  controls.setAttribute('aria-label', 'Worker harness controls');
  const control = (label: string, action: () => void): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = api === null;
    button.addEventListener('click', action);
    return button;
  };
  controls.append(
    control('Snapshot', () => { void api?.request({ v: 1, id: `snapshot:${String(state.generation)}`, method: 'scene.snapshot', params: {} }); }),
    control('Open door', () => { void api?.request({
      v: 1, id: `door:${String(state.generation)}`, method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }); }),
    control('Reconnect', () => { void api?.reconnect(); }),
    control('Dispose', () => api?.dispose()),
  );
  root.append(heading, summary, scene, controls);
}

export async function mountWorkerHarness(root: HTMLElement): Promise<WorkerHarnessApi> {
  const marker = await artifactMarker();
  let generation = 0;
  let transport: WorkerSceneTransport | null = null;
  let snapshot: SceneSnapshot | null = null;
  let lastResponse: HandoffResponse | null = null;
  let lastFault: string | null = null;
  let eventSequences: number[] = [];
  let eventRevisions: number[] = [];
  let api: WorkerHarnessApi | null = null;

  const state = (): WorkerHarnessState => ({
    artifact: marker,
    generation,
    status: transport?.status() ?? 'connecting',
    eventSequences: [...eventSequences],
    eventRevisions: [...eventRevisions],
    snapshot,
    lastResponse,
    lastFault,
  });
  const update = (): void => render(root, state(), api);
  const connect = async (): Promise<void> => {
    generation += 1;
    snapshot = null;
    lastResponse = null;
    lastFault = null;
    eventSequences = [];
    eventRevisions = [];
    const nextTransport = createHandoffWorkerTransport();
    transport = nextTransport;
    nextTransport.subscribe((event) => {
      snapshot = event.data;
      eventSequences.push(event.seq);
      eventRevisions.push(event.data.revision);
      update();
    });
    nextTransport.subscribeStatus(update);
    nextTransport.subscribeErrors((error) => {
      lastFault = error.code;
      update();
    });
    const initialSnapshot = nextTransport.initialSnapshot();
    lastResponse = await nextTransport.request({
      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await initialSnapshot;
    update();
  };

  await connect();
  const activeTransport = (): WorkerSceneTransport => {
    if (transport === null) throw new Error('The VTT handoff Worker is not connected.');
    return transport;
  };
  api = {
    state,
    async request(request) {
      lastResponse = await activeTransport().request(request);
      update();
      return lastResponse;
    },
    async malformed() {
      try {
        await activeTransport().request('{');
        throw new Error('Malformed input unexpectedly succeeded.');
      } catch (error: unknown) {
        if (!(error instanceof SceneTransportFaultError)) throw error;
        lastFault = error.code;
        update();
        return error.code;
      }
    },
    async reconnect() {
      activeTransport().destroySession();
      await connect();
      return state();
    },
    dispose() {
      activeTransport().dispose();
      update();
    },
  };
  window.__VTT_HANDOFF_HARNESS__ = api;
  update();
  window.addEventListener('pagehide', () => activeTransport().dispose(), { once: true });
  return api;
}
