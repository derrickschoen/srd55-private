import './ui/styles/base.css';
import { RpcClient } from './rpc/client';
import type { SqlRow } from './db/codecs';
import type { SystemInfo } from './worker/handlers/system';
import { Application } from './ui/app';

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

const status = document.querySelector<HTMLOutputElement>('#status');
system
  .info()
  .then(() => {
    new Application(root, rpc).start();
  })
  .catch((error: unknown) => {
    if (status !== null) {
      status.value =
        error instanceof Error ? `Failed: ${error.message}` : `Failed: ${error}`;
      status.dataset.ready = 'false';
      root.setAttribute('aria-busy', 'false');
    }
  });
