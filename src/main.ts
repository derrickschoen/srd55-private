import './ui/styles/base.css';
import { RpcClient } from './rpc/client';
import type { SqlRow } from './db/codecs';
import type { SystemInfo } from './worker/handlers/system';
import { Application } from './ui/app';
import { Router } from './ui/router';
import { screen as legalScreen } from './ui/screens/legal/screen';
import {
  persistentStorageLabel,
  requestPersistentStorage,
} from './pwa/storage-persistence';
import { registerAppServiceWorker } from './pwa/register-service-worker';

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

const worker = new Worker(new URL('./db/worker.ts', import.meta.url), {
  type: 'module',
});
const rpc = new RpcClient(worker);

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

const status = document.querySelector<HTMLOutputElement>('#status');
const router = new Router();

let application: Application | undefined;

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
  application = new Application(root, rpc, router);
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
} else {
  system
    .info()
    .then(startApplication)
    .catch((error: unknown) => {
      if (status !== null) {
        status.value =
          error instanceof Error
            ? `Failed: ${error.message}`
            : `Failed: ${error}`;
        status.dataset.ready = 'false';
        root.setAttribute('aria-busy', 'false');
      }
    });
}
