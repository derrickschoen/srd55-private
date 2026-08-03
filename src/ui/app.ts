import type { RpcClient } from '../rpc/client';
import { clear, element, showError, type Cleanup } from './dom';
import { Router, type Route } from './router';
import type { ScreenModule } from './screen';

interface ScreenModuleExport {
  screen: ScreenModule;
}

function screensFromModules(
  modules: Readonly<Record<string, unknown>>,
): readonly ScreenModule[] {
  const byId = new Map<string, ScreenModule>();
  for (const path of Object.keys(modules).sort()) {
    const module = modules[path] as Partial<ScreenModuleExport> | null;
    const screen = module?.screen;
    if (
      screen === undefined ||
      typeof screen.id !== 'string' ||
      typeof screen.matches !== 'function' ||
      typeof screen.render !== 'function'
    ) {
      throw new Error(`UI screen module "${path}" must export screen.`);
    }
    if (byId.has(screen.id)) {
      throw new Error(`Duplicate UI screen id "${screen.id}".`);
    }
    byId.set(screen.id, screen);
  }
  return Object.freeze([...byId.values()]);
}

const discoveredScreens = import.meta.glob('./screens/**/screen.ts', {
  eager: true,
});

export class Application {
  #cleanup: Cleanup | undefined;
  #unsubscribe: Cleanup | undefined;
  #renderSequence = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly rpc: RpcClient,
    private readonly router = new Router(),
    private readonly canRender: (route: Route) => boolean = () => true,
    private readonly screens = screensFromModules(discoveredScreens),
  ) {}

  start(): void {
    this.router.start();
    this.#unsubscribe = this.router.subscribe((route) => {
      void this.#render(route);
    });
    void this.#render(this.router.current);
  }

  stop(): void {
    this.#renderSequence += 1;
    this.#cleanup?.();
    this.#cleanup = undefined;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.router.stop();
  }

  renderCurrent(): void {
    void this.#render(this.router.current);
  }

  async #render(route: Route): Promise<void> {
    const sequence = ++this.#renderSequence;
    this.#cleanup?.();
    this.#cleanup = undefined;
    if (!this.canRender(route)) {
      return;
    }
    const screen = this.screens.find((candidate) => candidate.matches(route));
    if (screen === undefined) {
      clear(this.root);
      const status = element('output', {
        text: 'Local database ready.',
        attributes: {
          id: 'status',
          role: 'status',
          'data-ready': 'true',
        },
      });
      this.root.append(
        element('main', { className: 'empty-shell' }, [
          element('h1', { text: 'SRD-55' }),
          status,
        ]),
      );
      this.root.setAttribute('aria-busy', 'false');
      return;
    }

    this.root.setAttribute('aria-busy', 'true');
    clear(this.root);
    try {
      const cleanup = await screen.render({
        root: this.root,
        route,
        router: this.router,
        rpc: this.rpc,
      });
      if (sequence !== this.#renderSequence) {
        cleanup?.();
        return;
      }
      this.#cleanup = cleanup ?? undefined;
      this.root.setAttribute('aria-busy', 'false');
    } catch (error) {
      if (sequence === this.#renderSequence) {
        showError(this.root, error);
        this.root.setAttribute('aria-busy', 'false');
      }
    }
  }
}
