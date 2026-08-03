import { createQueriesClient } from '../../../queries/client';
import type { Route } from '../../router';
import { defineScreen, type ScreenContext } from '../../screen';
import { renderSheet, setSheetPrintContent } from './sheet-view';
import './styles.css';

const flavorAppendixPreferenceKey = (characterId: number): string =>
  `srd55:character:${String(characterId)}:print-option:flavor-appendix`;

/**
 * THE SHEET SCREEN.
 *
 * SHAPED AFTER `print/screen.ts` AND DELIBERATELY NOT AFTER THE PLANNER: parse
 * the id, one awaited query, one pure render, a few listeners, a composed
 * cleanup. It holds no session, no undo stack and no focus restoration, because
 * it does not write — every input it displays is edited in the planner, and a
 * read-only screen that invented a second editing surface would be a second
 * place for the same data to be written from.
 *
 * `matches` IS EXACT, AND THAT IS LOAD-BEARING. `src/ui/app.ts` sorts screen
 * modules by PATH and renders the FIRST match, so `print` (p) is tested before
 * `sheet` (s). A loose matcher here would never be reached for
 * `/characters/1/print`; an exact one for `/characters/:id/sheet` is
 * unambiguous in both directions.
 */
function characterId(route: Route): number | null {
  const value = route.segments[1];
  if (
    route.segments.length !== 3 ||
    route.segments[0] !== 'characters' ||
    route.segments[2] !== 'sheet' ||
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
    throw new Error('The character sheet route requires a valid character ID.');
  }
  const sheet = await createQueriesClient(context.rpc).sheet(id);
  const sheetElement = renderSheet(sheet);
  context.root.replaceChildren(sheetElement);
  document.title = `${sheet.name} character sheet`;

  const flavorAppendix = sheetElement.querySelector<HTMLInputElement>(
    '[data-sheet-print-option="flavor-appendix"]',
  );
  if (flavorAppendix !== null) {
    flavorAppendix.checked =
      localStorage.getItem(flavorAppendixPreferenceKey(id)) === 'true';
  }

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

  const printButton = context.root.querySelector<HTMLButtonElement>(
    'button[data-sheet-print]',
  );
  if (printButton === null) {
    throw new Error('The character sheet print button was not rendered.');
  }
  const printSheet = (): void => window.print();
  printButton.addEventListener('click', printSheet);
  cleanups.push(() => printButton.removeEventListener('click', printSheet));

  /**
   * `beforeprint` covers the browser's real print dialog; the media-query
   * listener covers print preview transitions and Playwright's emulated media.
   * Initial synchronisation also handles a sheet route opened while print
   * media is already active.
   */
  const printMedia = window.matchMedia('print');
  const syncPrintFields = (): void => {
    setSheetPrintContent(sheetElement, sheet, printMedia.matches, {
      flavor_appendix: flavorAppendix?.checked ?? false,
    });
  };
  const beforePrint = (): void => {
    setSheetPrintContent(sheetElement, sheet, true, {
      flavor_appendix: flavorAppendix?.checked ?? false,
    });
  };
  const afterPrint = (): void => {
    syncPrintFields();
  };
  const flavorPreferenceChanged = (): void => {
    if (flavorAppendix === null) {
      return;
    }
    localStorage.setItem(
      flavorAppendixPreferenceKey(id),
      String(flavorAppendix.checked),
    );
    syncPrintFields();
  };
  syncPrintFields();
  flavorAppendix?.addEventListener('change', flavorPreferenceChanged);
  printMedia.addEventListener('change', syncPrintFields);
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);
  cleanups.push(() => {
    flavorAppendix?.removeEventListener('change', flavorPreferenceChanged);
    printMedia.removeEventListener('change', syncPrintFields);
    window.removeEventListener('beforeprint', beforePrint);
    window.removeEventListener('afterprint', afterPrint);
  });

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export const screen = defineScreen({
  id: 'character-sheet',
  matches: (route) => characterId(route) !== null,
  render,
});
