import { createQueriesClient } from '../../../queries/client';
import type { PrintableVariant } from '../../../reports/printable-spell-list-builder';
import type { Route } from '../../router';
import { defineScreen, type ScreenContext } from '../../screen';
import { renderPrintableList } from './printable-list';
import './styles.css';

function characterId(route: Route): number | null {
  const value = route.segments[1];
  if (
    route.segments.length !== 3 ||
    route.segments[0] !== 'characters' ||
    route.segments[2] !== 'print' ||
    value === undefined ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function variant(route: Route): PrintableVariant {
  return route.query.get('variant') === 'full' ? 'full' : 'reference';
}

async function render(context: ScreenContext): Promise<() => void> {
  const id = characterId(context.route);
  if (id === null) {
    throw new Error('The printable-list route requires a valid character ID.');
  }
  const printable = await createQueriesClient(context.rpc).printable(
    id,
    variant(context.route),
  );
  context.root.innerHTML = renderPrintableList(printable);
  document.title = `${printable.character.name} spell list`;

  const cleanups: Array<() => void> = [];
  const backLink =
    context.root.querySelector<HTMLAnchorElement>('a[data-router-link]');
  if (backLink !== null) {
    const onBack = (event: MouseEvent): void => {
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
      context.router.navigate(backLink.href);
    };
    backLink.addEventListener('click', onBack);
    cleanups.push(() => backLink.removeEventListener('click', onBack));
  }

  const form =
    context.root.querySelector<HTMLFormElement>('form[data-variant-form]');
  if (form !== null) {
    const onSubmit = (event: SubmitEvent): void => {
      event.preventDefault();
      const selector = form.elements.namedItem('variant');
      const selected =
        selector instanceof HTMLSelectElement && selector.value === 'full'
          ? 'full'
          : 'reference';
      context.router.navigate(
        `/characters/${id}/print${
          selected === 'full' ? '?variant=full' : ''
        }`,
      );
    };
    form.addEventListener('submit', onSubmit);
    cleanups.push(() => form.removeEventListener('submit', onSubmit));
  }

  const printButton =
    context.root.querySelector<HTMLButtonElement>('button[data-print]');
  if (printButton !== null) {
    const onPrint = (): void => window.print();
    printButton.addEventListener('click', onPrint);
    cleanups.push(() => printButton.removeEventListener('click', onPrint));
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export const screen = defineScreen({
  id: 'printable-list',
  matches: (route) => characterId(route) !== null,
  render,
});
