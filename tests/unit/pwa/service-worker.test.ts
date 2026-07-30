import { describe, expect, it } from 'vitest';
import {
  APP_SHELL_CACHE_PREFIX,
  appShellCacheName,
  appShellUrl,
  appShellVersion,
  serviceWorkerSource,
} from '../../../tools/pwa/service-worker';

describe('PWA app-shell cache versioning', () => {
  const assets = [
    { fileName: 'index.html', source: '<script src="app-a.js"></script>' },
    { fileName: 'assets/app-a.js', source: 'console.log("a")' },
  ] as const;

  it('is stable across output order and changes for bytes or filenames', () => {
    expect(appShellVersion([...assets].reverse())).toBe(
      appShellVersion(assets),
    );
    expect(
      appShellVersion([
        assets[0],
        { fileName: 'assets/app-a.js', source: 'console.log("b")' },
      ]),
    ).not.toBe(appShellVersion(assets));
    expect(
      appShellVersion([
        assets[0],
        { fileName: 'assets/app-b.js', source: assets[1].source },
      ]),
    ).not.toBe(appShellVersion(assets));
  });

  it('puts the derived version in a namespaced cache name', () => {
    expect(appShellCacheName(assets)).toBe(
      `${APP_SHELL_CACHE_PREFIX}${appShellVersion(assets)}`,
    );
    expect(appShellUrl('/assets/app-a.js')).toBe('./assets/app-a.js');
  });

  it('generates an atomic, current-cache-only worker that waits for consent', () => {
    const cacheName = appShellCacheName(assets);
    const source = serviceWorkerSource(cacheName, [
      './index.html',
      './assets/app-a.js',
    ]);

    expect(source).toContain(`const CACHE_NAME = "${cacheName}"`);
    expect(source).toContain('cache.addAll(APP_SHELL)');
    expect(source).toContain("event.data === 'SKIP_WAITING'");
    expect(source).not.toContain("addEventListener('install', () => self.skipWaiting");
    expect(source).toContain('caches.open(CACHE_NAME)');
    expect(source).toContain('name !== CACHE_NAME');
    expect(source.indexOf("request.mode === 'navigate'")).toBeLessThan(
      source.indexOf('return fetch(request)'),
    );
  });
});
