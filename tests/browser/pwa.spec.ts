import { serviceWorkerSource } from '../../tools/pwa/service-worker';
import { expect, test } from './fixtures/parallel-test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(StorageManager.prototype, 'persist', {
      configurable: true,
      value: async () => false,
    });
  });
});

test('links the install manifest, registers the worker, and reports refused persistence', async ({
  page,
}) => {
  await page.goto('/');

  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute('href', '/manifest.webmanifest');
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: 'SRD-55',
    short_name: 'SRD-55',
    display: 'standalone',
    start_url: './',
  });

  await expect(page.locator('#persistence-status')).toHaveAttribute(
    'data-persistence-state',
    'refused',
  );
  await expect(page.locator('#persistence-status')).toHaveText(
    'Browser eviction protection was not granted; keep backups.',
  );

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.scriptURL ?? null;
      }),
    )
    .toMatch(/\/service-worker\.js$/);
});

test('PARTY-SW-IGNORES-FORGE leaves a fixture-backed forge request outside the service worker', async ({
  page,
}) => {
  await page.goto('/');
  const metrics = await page.evaluate(
    async ({ source, forgeUrl }) => {
      type WorkerListener = (event: unknown) => void;
      const listeners = new Map<string, WorkerListener>();
      const observed = {
        cacheOpens: 0,
        fetches: 0,
        logs: 0,
        requestClones: 0,
        respondWithCalls: 0,
      };
      const workerSelf = {
        location: { origin: globalThis.location.origin },
        registration: { scope: `${globalThis.location.origin}/` },
        clients: { claim: () => Promise.resolve() },
        skipWaiting: () => Promise.resolve(),
        addEventListener(type: string, listener: WorkerListener): void {
          listeners.set(type, listener);
        },
      };
      const cache = { match: () => Promise.resolve(undefined) };
      const workerCaches = {
        open: () => {
          observed.cacheOpens += 1;
          return Promise.resolve(cache);
        },
        keys: () => Promise.resolve([]),
        delete: () => Promise.resolve(true),
      };
      const workerFetch = (): Promise<Response> => {
        observed.fetches += 1;
        return Promise.resolve(new Response('{}'));
      };
      const workerConsole = {
        debug: () => {
          observed.logs += 1;
        },
        error: () => {
          observed.logs += 1;
        },
        info: () => {
          observed.logs += 1;
        },
        log: () => {
          observed.logs += 1;
        },
        warn: () => {
          observed.logs += 1;
        },
      };
      const execute = new Function(
        'self',
        'caches',
        'fetch',
        'console',
        source,
      ) as (
        selfValue: typeof workerSelf,
        cachesValue: typeof workerCaches,
        fetchValue: typeof workerFetch,
        consoleValue: typeof workerConsole,
      ) => void;
      execute(workerSelf, workerCaches, workerFetch, workerConsole);
      const fetchListener = listeners.get('fetch');
      if (fetchListener === undefined) {
        throw new Error('Generated service worker did not register fetch');
      }
      const forgeRequest = {
        method: 'GET',
        mode: 'cors',
        url: forgeUrl,
        clone() {
          observed.requestClones += 1;
          return this;
        },
      };
      fetchListener({
        request: forgeRequest,
        respondWith(response: Promise<Response> | Response): void {
          observed.respondWithCalls += 1;
          void Promise.resolve(response).catch(() => undefined);
        },
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const forgeMetrics = { ...observed };

      let sameOriginResponse: Promise<Response> | undefined;
      const sameOriginRequest = {
        ...forgeRequest,
        url: `${globalThis.location.origin}/same-origin-control.json`,
      };
      fetchListener({
        request: sameOriginRequest,
        respondWith(response: Promise<Response> | Response): void {
          observed.respondWithCalls += 1;
          sameOriginResponse = Promise.resolve(response);
        },
      });
      if (sameOriginResponse === undefined) {
        throw new Error('Same-origin control did not call respondWith');
      }
      await sameOriginResponse;

      return { forgeMetrics, sameOriginMetrics: observed };
    },
    {
      source: serviceWorkerSource('party-boundary-browser-control', []),
      forgeUrl:
        'https://api.github.com/repos/example-owner/party-fixture/contents/library/party-library.json?ref=main',
    },
  );

  expect(metrics.forgeMetrics).toEqual({
    cacheOpens: 0,
    fetches: 0,
    logs: 0,
    requestClones: 0,
    respondWithCalls: 0,
  });
  expect(metrics.sameOriginMetrics).toEqual({
    cacheOpens: 1,
    fetches: 1,
    logs: 0,
    requestClones: 0,
    respondWithCalls: 1,
  });
});
