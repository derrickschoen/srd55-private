import { createQueriesClient } from '../../../queries/client';
import { defineScreen, type ScreenContext } from '../../screen';
import type { Route } from '../../router';
import { renderBuildReport } from './build-report';
import './styles.css';

function characterId(route: Route): number | null {
  const value = route.segments[1];
  if (
    route.segments.length !== 3 ||
    route.segments[0] !== 'characters' ||
    route.segments[2] !== 'report' ||
    value === undefined ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function render(context: ScreenContext): Promise<() => void> {
  const id = characterId(context.route);
  if (id === null) {
    throw new Error('The build report route requires a valid character ID.');
  }
  const report = await createQueriesClient(context.rpc).buildReport(id);
  context.root.innerHTML = renderBuildReport(report);
  document.title = `${report.character.name} build report`;

  const cleanups: Array<() => void> = [];
  for (const link of Array.from(
    context.root.querySelectorAll<HTMLAnchorElement>(
      'a[data-router-link]',
    ),
  )) {
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
  id: 'build-report',
  matches: (route) => characterId(route) !== null,
  render,
});
