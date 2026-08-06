import type { RpcClient } from '../rpc/client';
import type { NavigationGuard, Route, Router } from './router';
import type { Cleanup } from './dom';

export interface ScreenContext {
  readonly root: HTMLElement;
  readonly route: Route;
  readonly router: Router;
  readonly rpc: RpcClient;
  registerNavigationGuard(guard: NavigationGuard): Cleanup;
}

export interface ScreenModule {
  readonly id: string;
  matches(route: Route): boolean;
  render(context: ScreenContext): void | Cleanup | Promise<void | Cleanup>;
}

export function defineScreen(screen: ScreenModule): ScreenModule {
  if (!/^[a-z][a-z0-9-]*$/.test(screen.id)) {
    throw new Error(`Invalid screen id "${screen.id}".`);
  }
  return Object.freeze(screen);
}
