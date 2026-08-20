import './ui/styles/base.css';
import {
  RpcClient,
  type RpcTransport,
} from './rpc/client';
import type { RpcRequest, RpcResponse } from './rpc/protocol';
import type { SqlRow } from './db/codecs';
import {
  bootDatabaseWorkerWithRetry,
  classifyDatabaseBootFailure,
  type DatabaseBootFailure,
} from './db/database-worker-boot';
import {
  databaseBootStageLabel,
  isDatabaseBootProgress,
  type DatabaseBootProgress,
} from './db/database-boot-progress';
import {
  databaseBootMeasureName,
  DatabaseBootTimeline,
  type DatabaseBootPhase,
} from './db/database-boot-timeline';
import type { SystemInfo } from './worker/handlers/system';
import { Application } from './ui/app';
import { Router } from './ui/router';
import { screen as legalScreen } from './ui/screens/legal/screen';
import {
  persistentStorageLabel,
  requestPersistentStorage,
} from './pwa/storage-persistence';
import { registerAppServiceWorker } from './pwa/register-service-worker';
import {
  BROWSER_CAPABILITY_DEADLINE_MS,
  classifyBrowserSupport,
  observeBrowserCapability,
  type BrowserCapabilityProbe,
  type BrowserSupportDecision,
} from './pwa/browser-capability';
import { probeBrowserCapabilityInWorker } from './pwa/browser-capability-worker-port';
import {
  browserSupportNoticeElements,
  hideBrowserSupportNotice,
  readBrowserEngineProfile,
  showBrowserSupportNotice,
} from './pwa/browser-support-notice';

const launchUrl = new URL(location.href);
const localEncounterLaunch =
  launchUrl.pathname.replace(/\/+$/, '') === '/vtt' &&
  launchUrl.searchParams.get('encounter') === 'reference';

if (localEncounterLaunch) {
  const encounterRoot = document.querySelector<HTMLElement>('#app');
  if (encounterRoot === null) throw new Error('Application root #app is missing.');
  const view = launchUrl.searchParams.get('view') === 'dm' ? 'dm' : 'player';
  const sessionId = launchUrl.searchParams.get('session') ?? 'reference-encounter';
  void import('./vtt/encounter-app').then(({ mountEncounterVtt }) => {
    const mounted = mountEncounterVtt(encounterRoot, { view, sessionId });
    window.addEventListener('pagehide', () => mounted.close(), { once: true });
  });
} else {

const persistenceStatus =
  document.querySelector<HTMLOutputElement>('#persistence-status');
const browserStorage =
  'storage' in navigator ? navigator.storage : undefined;
void requestPersistentStorage(browserStorage).then((state) => {
  if (persistenceStatus !== null) {
    persistenceStatus.value = persistentStorageLabel(state);
    persistenceStatus.dataset.persistenceState = state;
  }
});

if ('serviceWorker' in navigator) {
  registerAppServiceWorker(
    navigator.serviceWorker,
    document.querySelector<HTMLElement>('#update-ready'),
    document.querySelector<HTMLButtonElement>('#refresh-update'),
    () => location.reload(),
  );
}

let browserCapabilityProbe: BrowserCapabilityProbe =
  probeBrowserCapabilityInWorker;
if (import.meta.env.DEV) {
  const injectedFailure = Reflect.get(
    window,
    '__SRD55_BROWSER_CAPABILITY_PROBE_FAILURE__',
  );
  if (injectedFailure === 'unavailable') {
    browserCapabilityProbe = async () => 'unavailable';
  } else if (injectedFailure === 'never') {
    browserCapabilityProbe = () =>
      new Promise(() => {
        // An intentionally unanswered DEV-only probe proves the deadline path.
      });
  } else if (
    injectedFailure !== null &&
    typeof injectedFailure === 'object' &&
    Reflect.get(injectedFailure, 'kind') === 'late-available'
  ) {
    const release = Reflect.get(injectedFailure, 'release');
    if (release instanceof Promise) {
      browserCapabilityProbe = async () => {
        await release;
        return 'available';
      };
    }
  }
}
const browserCapability = observeBrowserCapability(
  browserCapabilityProbe,
  BROWSER_CAPABILITY_DEADLINE_MS,
);

/**
 * The legal screen needs an Application before database access is allowed, but
 * constructing the sqlite worker starts its database boot immediately. This
 * transport lets the RPC client exist without constructing that worker. The
 * capability decision is the only path to activate(), apart from the explicit
 * Continue action.
 */
class DatabaseWorkerTransport implements RpcTransport {
  readonly #messageListeners = new Set<
    (event: MessageEvent<RpcResponse>) => void
  >();
  readonly #errorListeners = new Set<(event: ErrorEvent) => void>();
  readonly #progressListeners = new Set<
    (progress: DatabaseBootProgress) => void
  >();
  #worker: Worker | undefined;
  #activatedAtMs: number | undefined;

  /**
   * The main-thread instant of the most recent `new Worker(...)`, which is the
   * zero point the worker's own stage clock is offset from. Undefined until the
   * capability decision releases activation — the same condition that makes
   * every other member of this class inert.
   */
  get activatedAtMs(): number | undefined {
    return this.#activatedAtMs;
  }

  readonly #onWorkerMessage = (event: MessageEvent<unknown>): void => {
    if (isDatabaseBootProgress(event.data)) {
      for (const listener of this.#progressListeners) listener(event.data);
      return;
    }
    for (const listener of this.#messageListeners) {
      listener(event as MessageEvent<RpcResponse>);
    }
  };

  activate(): void {
    if (this.#worker !== undefined) {
      return;
    }
    this.#activatedAtMs = performance.now();
    const worker = new Worker(new URL('./db/worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener('message', this.#onWorkerMessage);
    for (const listener of this.#errorListeners) {
      worker.addEventListener('error', listener);
    }
    this.#worker = worker;
  }

  postMessage(message: RpcRequest, transfer: Transferable[] = []): void {
    if (this.#worker === undefined) {
      throw new Error('Database worker is held behind browser support gate.');
    }
    this.#worker.postMessage(message, transfer);
  }

  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      const messageListener = listener as (
        event: MessageEvent<RpcResponse>,
      ) => void;
      this.#messageListeners.add(messageListener);
      return;
    }
    const errorListener = listener as (event: ErrorEvent) => void;
    this.#errorListeners.add(errorListener);
    this.#worker?.addEventListener('error', errorListener);
  }

  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      const messageListener = listener as (
        event: MessageEvent<RpcResponse>,
      ) => void;
      this.#messageListeners.delete(messageListener);
      return;
    }
    const errorListener = listener as (event: ErrorEvent) => void;
    this.#errorListeners.delete(errorListener);
    this.#worker?.removeEventListener('error', errorListener);
  }

  terminate(): void {
    this.#worker?.terminate();
    this.#worker = undefined;
  }

  restart(): void {
    this.terminate();
    this.activate();
  }

  addProgressListener(listener: (progress: DatabaseBootProgress) => void): void {
    this.#progressListeners.add(listener);
  }

  removeProgressListener(listener: (progress: DatabaseBootProgress) => void): void {
    this.#progressListeners.delete(listener);
  }
}

const databaseWorkerTransport = new DatabaseWorkerTransport();
const rpc = new RpcClient(databaseWorkerTransport);

const system = {
  info: () => rpc.call<Record<string, never>, SystemInfo>('system.info', {}),
  reset: () =>
    rpc.call<Record<string, never>, { reset: true }>('system.reset', {}),
  writeCharacter: (name: string) =>
    rpc.call<{ name: string }, { id: number; name: string }>(
      'system.writeCharacter',
      { name },
    ),
  countCharacters: () =>
    rpc.call<Record<string, never>, number>('system.countCharacters', {}),
  inspectRows: (
    table: string,
    where: Record<string, string | number | boolean | null> = {},
  ) =>
    rpc.call<{ table: string; where: typeof where }, SqlRow[]>(
      'system.inspectRows',
      { table, where },
    ),
  exportDatabase: () =>
    rpc.call<Record<string, never>, Uint8Array>(
      'system.exportDatabase',
      {},
    ),
  replaceDatabase: (bytes: Uint8Array) =>
    rpc.call<{ bytes: Uint8Array }, { replaced: true }>(
      'system.replaceDatabase',
      { bytes },
    ),
  attemptTriggerViolation: () =>
    rpc.call<
      Record<string, never>,
      { rejected: boolean; message: string | null }
    >('system.attemptTriggerViolation', {}),
  attemptForeignKeyViolation: () =>
    rpc.call<
      Record<string, never>,
      { rejected: boolean; message: string | null }
    >('system.attemptForeignKeyViolation', {}),
};

window.appRpc = rpc;
window.staticApp = system;

const root = document.querySelector<HTMLElement>('#app');
if (root === null) {
  throw new Error('Application root #app is missing.');
}

/**
 * The site footer lives outside #app, so no screen owns its links. Routing them
 * here keeps the attribution page a navigation rather than a full reload, which
 * would restart the worker and reopen the database.
 *
 * TWO THINGS MAKE THIS SAFE, AND BOTH ARE LOAD-BEARING.
 *
 * It is attached during module evaluation, ahead of the boot gate below, rather
 * than from `startApplication`. The footer is static markup in index.html: it
 * paints in tens of milliseconds, while the gate waits on the worker
 * instantiating sqlite's wasm and provisioning the OPFS pool, measured here at
 * ~1.5 s on the production build and 1.9–3.7 s in dev. Attaching after the gate
 * left the link visible, live and unhandled for that whole span, and a click
 * inside it was precisely the full reload this function exists to prevent — it
 * destroyed the worker part way through `installOpfsSAHPoolVfs` and started the
 * boot again from zero. Attaching first removes that window instead of
 * narrowing it.
 *
 * And it delegates from `.site-footer`, which the document ships with, instead
 * of binding each anchor. A per-anchor loop can only bind the anchors that
 * exist when it runs, which is what tied it to application start in the first
 * place; one listener on an element present at first paint has no such
 * ordering requirement.
 */
function routeFooterLinks(router: Router, start: () => void): void {
  const footer = document.querySelector<HTMLElement>('.site-footer');
  if (footer === null) {
    return;
  }
  footer.addEventListener('click', (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target;
    const link =
      target instanceof Element
        ? target.closest<HTMLAnchorElement>('a[data-router-link]')
        : null;
    if (link === null || !footer.contains(link)) {
      return;
    }
    event.preventDefault();
    /**
     * Order matters. Pushing the URL before starting means an application that
     * has not started yet renders the route that was asked for, rather than
     * rendering the pre-click route and replacing it a moment later.
     */
    router.navigate(link.href);
    start();
  });
}

const router = new Router();

let application: Application | undefined;
let browserSupportDecision: BrowserSupportDecision | undefined;
let browserSupportWarningAcknowledged = false;
let databaseBootStarted = false;
let databaseReady = false;

const showDatabaseBootStatus = (message: string): HTMLOutputElement => {
  const shell = document.createElement('main');
  shell.className = 'loading-shell';
  const heading = document.createElement('h1');
  heading.textContent = 'SRD-55';
  const phaseLabel = document.createElement('p');
  phaseLabel.id = 'loading-phase-label';
  phaseLabel.className = 'loading-phase-label';
  phaseLabel.textContent = 'Current startup phase';
  const output = document.createElement('output');
  output.id = 'status';
  output.setAttribute('role', 'status');
  output.setAttribute('aria-labelledby', phaseLabel.id);
  output.value = message;
  shell.append(heading, phaseLabel, output);
  root.replaceChildren(shell);
  root.setAttribute('aria-busy', 'true');
  return output;
};

const showBrowserBootHold = (): void => {
  if (databaseBootStarted) {
    return;
  }
  const shell = document.createElement('main');
  shell.className = 'browser-support-hold';
  const heading = document.createElement('h1');
  heading.textContent = 'Browser support check needs your decision';
  const explanation = document.createElement('output');
  explanation.id = 'status';
  explanation.value =
    'Application start is paused. Review the browser support warning and choose Continue anyway to try opening your data.';
  explanation.dataset.ready = 'false';
  explanation.setAttribute('role', 'status');
  shell.append(heading, explanation);
  root.replaceChildren(shell);
  root.setAttribute('aria-busy', 'false');
};

/**
 * The blocked-tab shell. It is a SHELL rather than a status line because the
 * tab is not going to recover on its own: the owning tab holds the OPFS pool
 * for as long as it lives, so there is nothing to wait for and the only way
 * forward is one of the two actions named here. A dead end — a bare "Failed:"
 * with no statement of what is holding the database or what to do — is exactly
 * what this replaces.
 */
const showBlockedByOtherTab = (
  failure: Extract<
    DatabaseBootFailure,
    { kind: 'another_tab_holds_database' }
  >,
  retry: () => void,
): void => {
  const shell = document.createElement('main');
  shell.className = 'error-shell';
  shell.dataset.bootFailure = failure.kind;
  const heading = document.createElement('h1');
  heading.textContent = failure.headline;
  const status = document.createElement('output');
  status.id = 'status';
  status.setAttribute('role', 'status');
  status.value = failure.explanation;
  status.dataset.ready = 'false';
  const remedy = document.createElement('p');
  remedy.textContent = failure.remedy;
  const tryAgain = document.createElement('button');
  tryAgain.type = 'button';
  tryAgain.dataset.testid = 'retry-database-boot';
  tryAgain.textContent = 'Try again';
  tryAgain.addEventListener('click', retry);
  shell.append(heading, status, remedy, tryAgain);
  root.replaceChildren(shell);
  root.setAttribute('aria-busy', 'false');
};

/**
 * Separate from the idempotence guard below because it has a SECOND caller:
 * the blocked-tab shell's Try again. Retrying is only meaningful after the
 * worker is discarded — a worker whose pool install already failed will not
 * try again on its own — so the retry terminates it first and this function
 * re-activates a fresh one through `bootDatabaseWorkerWithRetry`.
 */
const runDatabaseBoot = (): void => {
  const bootStatus = showDatabaseBootStatus('Starting local database…');
  /**
   * The stage reports already drive the status text; recording them as
   * `performance` measures as well is what makes the boot's internal split —
   * wasm, OPFS pool, schema, catalog seed — a number rather than an inference
   * from a status the user happened to see.
   */
  const recordPhase = (phase: DatabaseBootPhase): void => {
    performance.measure(databaseBootMeasureName(phase), {
      start: phase.startMs,
      end: phase.endMs,
    });
  };
  let timeline: DatabaseBootTimeline | undefined;
  const reportProgress = (progress: DatabaseBootProgress): void => {
    bootStatus.value = databaseBootStageLabel(progress.stage);
    // `loading_engine` is the first thing a worker reports, so it is also the
    // signal that a RESTARTED worker has begun again — the retry path would
    // otherwise fold two boots into one timeline whose phases interleave.
    if (progress.stage === 'loading_engine' || timeline === undefined) {
      const activatedAtMs = databaseWorkerTransport.activatedAtMs;
      timeline = new DatabaseBootTimeline(activatedAtMs ?? performance.now());
    }
    recordPhase(timeline.observe(progress));
  };
  databaseWorkerTransport.addProgressListener(reportProgress);
  void bootDatabaseWorkerWithRetry(databaseWorkerTransport, system.info)
    .then(() => {
      for (const phase of timeline?.finish(performance.now()) ?? []) {
        recordPhase(phase);
      }
      databaseWorkerTransport.removeProgressListener(reportProgress);
      databaseReady = true;
      if (application === undefined) {
        startApplication();
      } else {
        application.renderCurrent();
      }
    })
    .catch((error: unknown) => {
      databaseWorkerTransport.removeProgressListener(reportProgress);
      const failure = classifyDatabaseBootFailure(error);
      if (failure.kind === 'another_tab_holds_database') {
        showBlockedByOtherTab(failure, () => {
          databaseWorkerTransport.terminate();
          runDatabaseBoot();
        });
        return;
      }
      bootStatus.value = `Failed: ${failure.detail}`;
      bootStatus.dataset.ready = 'false';
      root.setAttribute('aria-busy', 'false');
    });
};

const startDatabaseBoot = (): void => {
  if (databaseBootStarted) {
    return;
  }
  // This is ordinary boot idempotence, not warning acknowledgement state. It
  // is never persisted and never changes whether the notice is rendered.
  databaseBootStarted = true;
  runDatabaseBoot();
};

const canRenderRoute = (route: Router['current']): boolean => {
  if (legalScreen.matches(route) || databaseReady) {
    return true;
  }
  switch (browserSupportDecision?.kind) {
    case 'supported':
    case 'untested-engine':
      startDatabaseBoot();
      break;
    case 'capability-warning':
      if (browserSupportWarningAcknowledged) {
        startDatabaseBoot();
      } else {
        showBrowserBootHold();
      }
      break;
    case undefined:
      showDatabaseBootStatus('Checking browser support…');
      break;
  }
  return false;
};

/**
 * Idempotent, because it now has two callers that do not know about each other:
 * the boot gate below, and a footer click that arrives before the gate fires.
 * Starting twice would leave two applications subscribed to one router, each
 * rendering into #app.
 */
const startApplication = (): void => {
  if (application !== undefined) {
    return;
  }
  application = new Application(root, rpc, router, canRenderRoute);
  application.start();
};

/**
 * A footer click can start the application before the database is open, which
 * is sound for the same reason the deep-link branch below is sound: the licence
 * route is the only route the footer offers and it reads nothing from the
 * database. It is also the only thing that reaches this early — every other
 * route still waits for the gate.
 */
routeFooterLinks(router, startApplication);

/**
 * DEV ONLY. The local AI bridge is a development convenience that must never
 * reach a deployed bundle, so this is the single entry point to its browser half
 * and it sits behind `import.meta.env.DEV`, which the production build replaces
 * with `false` — dead-code elimination then drops the dynamic import and every
 * module behind it. `npm run build` afterwards runs
 * `tools/assert-dist-clean.mjs`, which fails if any bridge literal reached
 * `dist/`, because a branch believed to be eliminated is not a proof that it was.
 *
 * With no bridge running, `mountAiChat` returns null having done nothing: no
 * panel, no request, no console output.
 */
if (import.meta.env.DEV) {
  void import('./ui/ai-chat/mount').then(({ mountAiChat }) =>
    mountAiChat(document.body),
  );
}

/**
 * The licence route reads nothing from the database, so it must not wait for
 * one: a worker that never comes up would otherwise hide the attribution, and
 * reloading /legal would fail the same way. Every other route keeps the boot
 * gate. A boot that never completes — because it is slow, or because it failed
 * outright — no longer strands the footer either: its link was routed during
 * module evaluation above, so it reaches the notice with neither a reload nor a
 * database.
 */
if (legalScreen.matches(router.current)) {
  startApplication();
}

const supportNotice = browserSupportNoticeElements();
const browserProfile = readBrowserEngineProfile();
supportNotice.continueButton.addEventListener('click', () => {
  browserSupportWarningAcknowledged = true;
  if (!legalScreen.matches(router.current)) {
    canRenderRoute(router.current);
  }
});

const applyBrowserCapability = (
  outcome: Awaited<typeof browserCapability.initial>,
): void => {
  const decision = classifyBrowserSupport(outcome, browserProfile.knownTested);
  browserSupportDecision = decision;
  switch (decision.kind) {
    case 'supported':
      hideBrowserSupportNotice(supportNotice);
      break;
    case 'untested-engine':
      showBrowserSupportNotice(supportNotice, decision, browserProfile.noun);
      break;
    case 'capability-warning':
      showBrowserSupportNotice(supportNotice, decision, browserProfile.noun);
      break;
  }
  if (!legalScreen.matches(router.current)) {
    canRenderRoute(router.current);
  }
};

void browserCapability.initial.then((initialOutcome) => {
  applyBrowserCapability(initialOutcome);
  void browserCapability.settled.then((settledOutcome) => {
    if (settledOutcome !== initialOutcome) {
      applyBrowserCapability(settledOutcome);
    }
  });
});
}
