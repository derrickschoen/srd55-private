import { createHash } from 'node:crypto';

export const APP_SHELL_CACHE_PREFIX = 'spell-planner-shell-';

export interface BuildAsset {
  readonly fileName: string;
  readonly source: string | Uint8Array;
}

/**
 * Hash the filenames and bytes that make up one deployable app shell. Sorting
 * makes the result independent of Rollup's object insertion order; hashing the
 * filename as well as the contents means a renamed asset also mints a new
 * cache.
 */
export function appShellVersion(assets: readonly BuildAsset[]): string {
  const hash = createHash('sha256');
  const ordered = [...assets].sort((left, right) =>
    left.fileName.localeCompare(right.fileName),
  );
  for (const asset of ordered) {
    hash.update(asset.fileName);
    hash.update('\0');
    hash.update(asset.source);
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

export function appShellCacheName(
  assets: readonly BuildAsset[],
): string {
  return `${APP_SHELL_CACHE_PREFIX}${appShellVersion(assets)}`;
}

export function appShellUrl(fileName: string): string {
  return `./${fileName.replace(/^\/+/, '')}`;
}

/**
 * The generated worker deliberately contains no build-time imports. A newly
 * installed worker fills a distinct cache with one cache.addAll operation and
 * remains waiting. Only an explicit SKIP_WAITING message activates it.
 *
 * Fetches consult only this build's cache. That is the boundary that prevents
 * an old index from being combined with new hashed chunks (or vice versa).
 */
export function serviceWorkerSource(
  cacheName: string,
  appShell: readonly string[],
): string {
  const shell = [...new Set(appShell)].sort();
  return `const CACHE_PREFIX = ${JSON.stringify(APP_SHELL_CACHE_PREFIX)};
const CACHE_NAME = ${JSON.stringify(cacheName)};
const APP_SHELL = ${JSON.stringify(shell)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(async (error) => {
        await caches.delete(CACHE_NAME);
        throw error;
      }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (
    request.method !== 'GET' ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached !== undefined) {
        return cached;
      }

      if (request.mode === 'navigate') {
        const fallback = await cache.match(
          new URL('./index.html', self.registration.scope),
        );
        if (fallback !== undefined) {
          return fallback;
        }
      }

      return fetch(request);
    }),
  );
});
`;
}
