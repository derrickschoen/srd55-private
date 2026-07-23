export interface Route {
  readonly path: string;
  readonly segments: readonly string[];
  readonly query: URLSearchParams;
}

export type RouteListener = (route: Route) => void;

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
  readonly #onPopState = (): void => this.#emit();

  constructor(private readonly windowObject: Window = window) {}

  get current(): Route {
    return parseRoute(new URL(this.windowObject.location.href));
  }

  start(): void {
    this.windowObject.addEventListener('popstate', this.#onPopState);
  }

  stop(): void {
    this.windowObject.removeEventListener('popstate', this.#onPopState);
    this.#listeners.clear();
  }

  subscribe(listener: RouteListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  navigate(target: string, options: { replace?: boolean } = {}): void {
    const url = new URL(target, this.windowObject.location.href);
    if (url.origin !== this.windowObject.location.origin) {
      throw new Error('Router navigation must stay on the current origin.');
    }
    const method = options.replace ? 'replaceState' : 'pushState';
    this.windowObject.history[method](null, '', url);
    this.#emit();
  }

  #emit(): void {
    const route = this.current;
    for (const listener of this.#listeners) {
      listener(route);
    }
  }
}
