import './ui/styles/base.css';
import { RpcClient } from './rpc/client';
import type { SqlRow } from './db/codecs';
import type { SystemInfo } from './worker/handlers/system';
import { Application } from './ui/app';
import { Router } from './ui/router';
import { screen as legalScreen } from './ui/screens/legal/screen';

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
 */
function routeFooterLinks(router: Router): void {
  for (const link of Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      '.site-footer a[data-router-link]',
    ),
  )) {
    link.addEventListener('click', (event: MouseEvent): void => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      router.navigate(link.href);
    });
  }
}

const status = document.querySelector<HTMLOutputElement>('#status');
const router = new Router();

const startApplication = (): void => {
  new Application(root, rpc, router).start();
  routeFooterLinks(router);
};

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
 * gate, and a failed boot leaves the footer link a plain anchor so it still
 * reaches the notice through a full navigation.
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
