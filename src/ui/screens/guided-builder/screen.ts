import {
  GUIDED_BUILD_SCREEN_ID,
  matchesGuidedBuildRoute,
  matchesGuidedNewRoute,
} from '../../../builder/contracts';
import { createQueriesClient } from '../../../queries/client';
import type { Route } from '../../router';
import { defineScreen, type ScreenContext } from '../../screen';
import { renderGuidedBuildState, renderGuidedNew } from './guided-builder';
import './styles.css';

/**
 * THE GUIDED-BUILDER SCREEN (dispatch A1).
 *
 * Shaped after `sheet/screen.ts`, the deliberately simple one: parse, at most
 * one awaited query, one pure render, composed cleanup. Route matching comes
 * from the seam's `matchesGuidedNewRoute` / `matchesGuidedBuildRoute` — never
 * hand-rolled, because `src/ui/app.ts` renders the FIRST matching screen in
 * module-path order and a loose matcher here would shadow another screen.
 *
 * NO SESSION STORAGE, READ OR WRITTEN. D48 deleted the pre-class draft
 * outright: `/characters/new` persists nothing, and the build route derives
 * its step from character state alone via `queries.characters.buildState`,
 * so a reload asks the database and nothing else.
 */
function matches(route: Route): boolean {
  return (
    matchesGuidedNewRoute(route.segments) ||
    matchesGuidedBuildRoute(route.segments) !== null
  );
}

async function render(context: ScreenContext): Promise<() => void> {
  const characterId = matchesGuidedBuildRoute(context.route.segments);
  let view: HTMLElement;
  if (characterId === null) {
    if (!matchesGuidedNewRoute(context.route.segments)) {
      throw new Error('The guided builder requires a valid build route.');
    }
    view = renderGuidedNew();
    document.title = 'Create a character';
  } else {
    const state = await createQueriesClient(context.rpc).buildState(
      characterId,
    );
    view = renderGuidedBuildState(state);
    document.title = 'Guided character builder';
  }
  context.root.replaceChildren(view);

  const cleanups: Array<() => void> = [];
  const links = Array.from(
    context.root.querySelectorAll<HTMLAnchorElement>('a[data-router-link]'),
  );
  for (const link of links) {
    const onClick = (event: MouseEvent): void => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      context.router.navigate(link.href);
    };
    link.addEventListener('click', onClick);
    cleanups.push(() => link.removeEventListener('click', onClick));
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export const screen = defineScreen({
  id: GUIDED_BUILD_SCREEN_ID,
  matches,
  render,
});
