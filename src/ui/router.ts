export interface Route {
  readonly path: string;
  readonly segments: readonly string[];
  readonly query: URLSearchParams;
}

export type RouteListener = (route: Route) => void;

export interface NavigationAttempt {
  readonly current: Route;
  readonly target: Route;
  readonly source: 'navigate' | 'popstate';
}

export type NavigationGuard = (attempt: NavigationAttempt) => boolean;

const ROUTER_LAUNCH_URL_KEY = 'srd55RouterLaunchUrl';
const ROUTER_HISTORY_POSITION_KEY = 'srd55RouterHistoryPosition';

function historyPosition(state: unknown): number | null {
  if (typeof state !== 'object' || state === null) return null;
  const position = Reflect.get(state, ROUTER_HISTORY_POSITION_KEY);
  return Number.isSafeInteger(position) ? Number(position) : null;
}

function withHistoryPosition(
  state: unknown,
  position: number,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    ...(typeof state === 'object' && state !== null ? state : {}),
    [ROUTER_HISTORY_POSITION_KEY]: position,
  });
}

export function hasSameOriginInAppHistory(
  state: unknown,
  currentOrigin: string,
): boolean {
  if (typeof state !== 'object' || state === null) {
    return false;
  }
  const launchUrl = Reflect.get(state, ROUTER_LAUNCH_URL_KEY);
  if (typeof launchUrl !== 'string') {
    return false;
  }
  try {
    return new URL(launchUrl).origin === currentOrigin;
  } catch {
    return false;
  }
}

export function parseRoute(url: URL): Route {
  const path = url.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  return Object.freeze({
    path,
    segments: Object.freeze(
      path
        .split('/')
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment)),
    ),
    query: new URLSearchParams(url.search),
  });
}

export class Router {
  readonly #listeners = new Set<RouteListener>();
  readonly #navigationGuards = new Set<NavigationGuard>();
  #acceptedUrl: string;
  #acceptedHistoryPosition: number;
  #repairingPopState = false;
  readonly #onPopState = (): void => {
    if (this.#repairingPopState) {
      this.#repairingPopState = false;
      return;
    }
    const targetUrl = new URL(this.windowObject.location.href);
    const target = parseRoute(targetUrl);
    if (!this.#allows(target, 'popstate')) {
      const targetPosition = historyPosition(this.windowObject.history.state);
      if (targetPosition === null) {
        throw new Error('Cannot repair refused navigation without router history position.');
      }
      const delta = this.#acceptedHistoryPosition - targetPosition;
      if (delta !== 0) {
        this.#repairingPopState = true;
        this.windowObject.history.go(delta);
      }
      return;
    }
    this.#acceptedUrl = targetUrl.href;
    const targetPosition = historyPosition(this.windowObject.history.state);
    if (targetPosition === null) {
      throw new Error('Accepted router history entry has no position.');
    }
    this.#acceptedHistoryPosition = targetPosition;
    this.#emit(target);
  };

  constructor(private readonly windowObject: Window = window) {
    this.#acceptedUrl = this.windowObject.location.href;
    this.#acceptedHistoryPosition = historyPosition(
      this.windowObject.history.state,
    ) ?? 0;
    const initialState = withHistoryPosition(
      this.windowObject.history.state,
      this.#acceptedHistoryPosition,
    );
    this.windowObject.history.replaceState(
      initialState,
      '',
      this.#acceptedUrl,
    );
  }

  get current(): Route {
    return parseRoute(new URL(this.#acceptedUrl));
  }

  start(): void {
    this.windowObject.addEventListener('popstate', this.#onPopState);
  }

  stop(): void {
    this.windowObject.removeEventListener('popstate', this.#onPopState);
    this.#repairingPopState = false;
    this.#listeners.clear();
    this.#navigationGuards.clear();
  }

  subscribe(listener: RouteListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  registerNavigationGuard(guard: NavigationGuard): () => void {
    this.#navigationGuards.add(guard);
    return () => this.#navigationGuards.delete(guard);
  }

  navigate(target: string, options: { replace?: boolean } = {}): boolean {
    const url = new URL(target, this.windowObject.location.href);
    if (url.origin !== this.windowObject.location.origin) {
      throw new Error('Router navigation must stay on the current origin.');
    }
    const route = parseRoute(url);
    if (!this.#allows(route, 'navigate')) return false;
    const method = options.replace ? 'replaceState' : 'pushState';
    const position = options.replace
      ? this.#acceptedHistoryPosition
      : this.#acceptedHistoryPosition + 1;
    const state = withHistoryPosition(
      options.replace
        ? this.windowObject.history.state
        : { [ROUTER_LAUNCH_URL_KEY]: this.windowObject.location.href },
      position,
    );
    this.windowObject.history[method](state, '', url);
    this.#acceptedUrl = url.href;
    this.#acceptedHistoryPosition = position;
    this.#emit(route);
    return true;
  }

  #allows(target: Route, source: NavigationAttempt['source']): boolean {
    const current = parseRoute(new URL(this.#acceptedUrl));
    for (const guard of this.#navigationGuards) {
      if (!guard({ current, target, source })) return false;
    }
    return true;
  }

  #emit(route = this.current): void {
    for (const listener of this.#listeners) {
      listener(route);
    }
  }
}
