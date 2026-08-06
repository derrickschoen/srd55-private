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
  readonly settled: () => Promise<void>;
} {
  const events = new EventTarget();
  const location = {
    href: initialUrl,
    origin: new URL(initialUrl).origin,
  };
  let entries: HistoryEntry[] = [{ url: initialUrl, state: null }];
  let index = 0;
  let pendingMoves = 0;
  const settleResolvers = new Set<() => void>();
  const resolveSettled = (): void => {
    if (pendingMoves !== 0) return;
    for (const resolve of settleResolvers) resolve();
    settleResolvers.clear();
  };
  const move = (delta: number): void => {
    pendingMoves += 1;
    setTimeout(() => {
      try {
        const target = index + delta;
        if (target < 0 || target >= entries.length || target === index) return;
        index = target;
        const entry = entries[index]!;
        location.href = entry.url;
        const event = new Event('popstate');
        Object.defineProperty(event, 'state', { value: entry.state });
        events.dispatchEvent(event);
      } finally {
        pendingMoves -= 1;
        resolveSettled();
      }
    }, 0);
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
    settled: () =>
      pendingMoves === 0
        ? Promise.resolve()
        : new Promise((resolve) => settleResolvers.add(resolve)),
  };
}

function urls(entries: readonly HistoryEntry[]): readonly string[] {
  return entries.map((entry) => new URL(entry.url).pathname);
}

describe('router history-stack navigation guards', () => {
  it('forward-refusal leaves the history stack unchanged', async () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    router.start();
    router.navigate('/b');
    router.navigate('/c');
    harness.back();
    await harness.settled();
    const before = urls(harness.entries());
    const removeGuard = router.registerNavigationGuard(() => false);

    harness.forward();
    await harness.settled();

    expect(urls(harness.entries())).toEqual(before);
    expect(harness.index()).toBe(1);
    expect(router.current.path).toBe('/b');
    removeGuard();
    router.stop();
  });

  it('go(-2) refusal returns to the accepted entry with intermediates intact', async () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    router.start();
    router.navigate('/b');
    router.navigate('/c');
    router.navigate('/d');
    const before = urls(harness.entries());
    const removeGuard = router.registerNavigationGuard(() => false);

    harness.go(-2);
    await harness.settled();

    expect(urls(harness.entries())).toEqual(before);
    expect(harness.index()).toBe(3);
    expect(router.current.path).toBe('/d');
    removeGuard();
    router.stop();
  });

  it('does not swallow an immediate user traversal while a refusal repair echo is pending', async () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    const attempted: string[] = [];
    const visited: string[] = [];
    router.start();
    router.navigate('/b');
    router.navigate('/c');
    router.subscribe((route) => visited.push(route.path));
    const removeGuard = router.registerNavigationGuard(({ target }) => {
      attempted.push(target.path);
      if (attempted.length === 1) harness.back();
      return false;
    });

    harness.back();
    await harness.settled();

    expect(attempted).toEqual(['/b', '/a', '/b']);
    expect(visited).toEqual([]);
    expect(harness.index()).toBe(2);
    expect(router.current.path).toBe('/c');
    removeGuard();
    router.stop();
  });

  it('accepted push, replace, back, and forward navigations still work', async () => {
    const harness = historyHarness('https://example.test/a');
    const router = new Router(harness.windowObject);
    const visited: string[] = [];
    router.start();
    router.subscribe((route) => visited.push(route.path));

    expect(router.navigate('/b')).toBe(true);
    expect(router.navigate('/b?mode=replaced', { replace: true })).toBe(true);
    expect(router.navigate('/c')).toBe(true);
    harness.back();
    await harness.settled();
    harness.forward();
    await harness.settled();

    expect(urls(harness.entries())).toEqual(['/a', '/b', '/c']);
    expect(harness.index()).toBe(2);
    expect(router.current.path).toBe('/c');
    expect(visited).toEqual(['/b', '/b', '/c', '/b', '/c']);
    router.stop();
  });
});
