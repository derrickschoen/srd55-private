type RpcMethod =
  | 'info'
  | 'reset'
  | 'writeCharacter'
  | 'countCharacters'
  | 'attemptTriggerViolation'
  | 'attemptForeignKeyViolation';

type RpcResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

const worker = new Worker(new URL('./db/worker.ts', import.meta.url), {
  type: 'module',
});
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (reason: Error) => void }
>();

worker.addEventListener('message', (event: MessageEvent<RpcResponse>) => {
  const response = event.data;
  const request = pending.get(response.id);
  if (!request) {
    return;
  }
  pending.delete(response.id);
  if (response.ok) {
    request.resolve(response.result);
  } else {
    request.reject(new Error(response.error));
  }
});

worker.addEventListener('error', (event) => {
  const error = new Error(event.message);
  for (const request of pending.values()) {
    request.reject(error);
  }
  pending.clear();
});

function rpc<T>(
  method: RpcMethod,
  params?: Record<string, unknown>,
): Promise<T> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    worker.postMessage({ id, method, params });
  });
}

const api = {
  info: () => rpc('info'),
  reset: () => rpc('reset'),
  writeCharacter: (name: string) => rpc('writeCharacter', { name }),
  countCharacters: () => rpc<number>('countCharacters'),
  attemptTriggerViolation: () => rpc('attemptTriggerViolation'),
  attemptForeignKeyViolation: () => rpc('attemptForeignKeyViolation'),
};

declare global {
  interface Window {
    spikeDb: typeof api;
  }
}

window.spikeDb = api;

const status = document.querySelector<HTMLOutputElement>('#status');
api.info()
  .then((info) => {
    if (status) {
      status.value = `Ready: ${JSON.stringify(info)}`;
      status.dataset.ready = 'true';
    }
  })
  .catch((error: unknown) => {
    if (status) {
      status.value =
        error instanceof Error ? `Failed: ${error.message}` : `Failed: ${error}`;
      status.dataset.ready = 'false';
    }
  });
