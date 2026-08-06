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
  #acceptedHistoryState: unknown;
  readonly #onPopState = (): void => {
    const targetUrl = new URL(this.windowObject.location.href);
    const target = parseRoute(targetUrl);
    if (!this.#allows(target, 'popstate')) {
      this.windowObject.history.pushState(
        this.#acceptedHistoryState,
        '',
        this.#acceptedUrl,
      );
      return;
    }
    this.#acceptedUrl = targetUrl.href;
    this.#acceptedHistoryState = this.windowObject.history.state;
    this.#emit(target);
  };

  constructor(private readonly windowObject: Window = window) {
    this.#acceptedUrl = this.windowObject.location.href;
    this.#acceptedHistoryState = this.windowObject.history.state;
  }

  get current(): Route {
    return parseRoute(new URL(this.windowObject.location.href));
  }

  start(): void {
    this.windowObject.addEventListener('popstate', this.#onPopState);
  }

  stop(): void {
    this.windowObject.removeEventListener('popstate', this.#onPopState);
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
    const state = options.replace
      ? this.windowObject.history.state
      : { [ROUTER_LAUNCH_URL_KEY]: this.windowObject.location.href };
    this.windowObject.history[method](state, '', url);
    this.#acceptedUrl = url.href;
    this.#acceptedHistoryState = state;
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
