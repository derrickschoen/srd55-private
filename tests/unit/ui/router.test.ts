import { describe, expect, it } from 'vitest';
import { Router } from '../../../src/ui/router';

interface HistoryEntry {
  readonly url: string;
  readonly state: unknown;
}

function historyHarness(initialUrl: string): {
  readonly windowObject: Window;
  readonly entries: () => readonly HistoryEntry[];
  readonly index: () => number;
  readonly back: () => void;
  readonly forward: () => void;
  readonly go: (delta: number) => void;
} {
  const events = new EventTarget();
  const location = {
    href: initialUrl,
    origin: new URL(initialUrl).origin,
  };
  let entries: HistoryEntry[] = [{ url: initialUrl, state: null }];
  let index = 0;
  const move = (delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= entries.length || target === index) return;
    index = target;
    location.href = entries[index]!.url;
    events.dispatchEvent(new Event('popstate'));
  };
  const history = {
    get state(): unknown {
      return entries[index]!.state;
    },
    pushState(state: unknown, _unused: string, target?: string | URL | null): void {
      const url = target === undefined || target === null
        ? location.href
        : new URL(String(target), location.href).href;
      entries = [...entries.slice(0, index + 1), { url, state }];
      index += 1;
      location.href = url;
    },
    replaceState(state: unknown, _unused: string, target?: string | URL | null): void {
      const url = target === undefined || target === null
        ? location.href
        : new URL(String(target), location.href).href;
      entries[index] = { url, state };
      location.href = url;
    },
    go: move,
    back: () => move(-1),
    forward: () => move(1),
  };
  return {
    windowObject: {
      location,
      history,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
        events.addEventListener(type, listener),
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
        events.removeEventListener(type, listener),
    } as unknown as Window,
    entries: () => entries,
    index: () => index,
    back: history.back,
    forward: history.forward,
    go: history.go,
  };
}

function urls(entries: readonly HistoryEntry[]): readonly string[] {
  return entries.map((entry) => new URL(entry.url).pathname);
}

describe('router history-stack navigation guards', () => {
  it('forward-refusal leaves the history stack unchanged', () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    router.start();
    router.navigate('/b');
    router.navigate('/c');
    harness.back();
    const before = urls(harness.entries());
    const removeGuard = router.registerNavigationGuard(() => false);

    harness.forward();

    expect(urls(harness.entries())).toEqual(before);
    expect(harness.index()).toBe(1);
    expect(router.current.path).toBe('/b');
    removeGuard();
    router.stop();
  });

  it('go(-2) refusal returns to the accepted entry with intermediates intact', () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    router.start();
    router.navigate('/b');
    router.navigate('/c');
    router.navigate('/d');
    const before = urls(harness.entries());
    const removeGuard = router.registerNavigationGuard(() => false);

    harness.go(-2);

    expect(urls(harness.entries())).toEqual(before);
    expect(harness.index()).toBe(3);
    expect(router.current.path).toBe('/d');
    removeGuard();
    router.stop();
  });

  it('accepted push, replace, back, and forward navigations still work', () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    const visited: string[] = [];
    router.start();
    router.subscribe((route) => visited.push(route.path));

    expect(router.navigate('/b')).toBe(true);
    expect(router.navigate('/b?mode=replaced', { replace: true })).toBe(true);
    expect(router.navigate('/c')).toBe(true);
    harness.back();
    harness.forward();

    expect(urls(harness.entries())).toEqual(['/a', '/b', '/c']);
    expect(harness.index()).toBe(2);
    expect(router.current.path).toBe('/c');
    expect(visited).toEqual(['/b', '/b', '/c', '/b', '/c']);
    router.stop();
  });
});
