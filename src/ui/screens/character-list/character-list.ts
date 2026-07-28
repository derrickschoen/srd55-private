import { GUIDED_NEW_ROUTE } from '../../../builder/contracts';
import type { CharacterRow } from '../../../domain/models';
import type { CharacterSummary } from '../../../domain/read-models';
import type {
  CompletenessCount,
} from '../../../queries/character-completeness';
import {
  createQueriesClient,
  type QueriesClient,
} from '../../../queries/client';
import type { ScreenContext } from '../../screen';
import {
  clear,
  element,
  listen,
  type Cleanup,
} from '../../dom';
import {
  createImportBackupControls,
  type ImportBackupControls,
} from './import-backup-controls';
import {
  createShareControls,
  type ShareControls,
} from './share-controls';

export interface CharacterListQueries {
  listCharacters(): Promise<CharacterSummary[]>;
  createCharacter(name: string): Promise<CharacterRow>;
  deleteCharacter(
    characterId: number,
  ): Promise<{ id: number; deleted: boolean }>;
}

export interface CharacterListControllerOptions {
  readonly queries: CharacterListQueries;
  readonly navigate: (path: string) => void;
  readonly confirm: (message: string) => boolean;
}

export class CharacterListController {
  constructor(private readonly options: CharacterListControllerOptions) {}

  list(): Promise<CharacterSummary[]> {
    return this.options.queries.listCharacters();
  }

  async create(name: string): Promise<CharacterRow> {
    const trimmed = name.trim();
    if (trimmed === '') {
      throw new TypeError('Character name is required.');
    }
    const character = await this.options.queries.createCharacter(trimmed);
    this.options.navigate(`/characters/${character.id}`);
    return character;
  }

  async delete(character: CharacterSummary): Promise<boolean> {
    if (
      !this.options.confirm(
        `Delete ${character.name}? This cannot be undone.`,
      )
    ) {
      return false;
    }
    const result = await this.options.queries.deleteCharacter(character.id);
    if (!result.deleted) {
      throw new Error(`${character.name} was not found.`);
    }
    return true;
  }
}

export type DurableStorageState =
  | 'durable'
  | 'best-effort'
  | 'unavailable';

export async function durableStorageState(
  storage: Pick<StorageManager, 'persisted'> | undefined,
): Promise<DurableStorageState> {
  if (storage === undefined || typeof storage.persisted !== 'function') {
    return 'unavailable';
  }
  try {
    return (await storage.persisted()) ? 'durable' : 'best-effort';
  } catch {
    return 'unavailable';
  }
}

export function durableStorageLabel(state: DurableStorageState): string {
  if (state === 'durable') {
    return 'Durable local storage is enabled.';
  }
  if (state === 'best-effort') {
    return 'Local data may be cleared by the browser; keep backups.';
  }
  return 'Durable-storage status is unavailable in this browser.';
}

export function warningLabel(count: number): string {
  return `${count} ${count === 1 ? 'warning' : 'warnings'}`;
}

export function outstandingLabel(count: number): string {
  return count === 0
    ? 'nothing outstanding'
    : `${count} unfinished ${count === 1 ? 'choice' : 'choices'}`;
}

export function catalogGapLabel(count: number): string {
  return `${count} catalog ${count === 1 ? 'gap' : 'gaps'}`;
}

// Completeness is an informational adjunct: one character it cannot be
// computed for must not cost every card on the screen, so a failed batch
// drops the badges rather than the list.
export async function completenessByCharacter(
  load: () => Promise<readonly CompletenessCount[]>,
): Promise<ReadonlyMap<number, CompletenessCount>> {
  try {
    return new Map((await load()).map((count) => [count.character_id, count]));
  } catch {
    return new Map();
  }
}

export function classSummary(character: CharacterSummary): string {
  return character.classes.length > 0
    ? character.classes.join(' / ')
    : 'No classes yet. Open the build to add one.';
}

function appTheme(): boolean {
  const saved = localStorage.getItem('spell-planner-theme');
  return saved === null
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : saved === 'dark';
}

function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
}

function createShell(
  context: ScreenContext,
  cleanups: Cleanup[],
): {
  readonly main: HTMLElement;
  readonly status: HTMLOutputElement;
  readonly list: HTMLElement;
  readonly transfer: HTMLElement;
  readonly share: HTMLElement;
} {
  let dark = appTheme();
  applyTheme(dark);
  const home = element('a', {
    className: 'brand-link',
    text: 'Spell Planner',
    attributes: { href: '/' },
  });
  cleanups.push(
    listen(home, 'click', (event) => {
      event.preventDefault();
      context.router.navigate('/');
    }),
  );
  const theme = element('button', {
    className: 'button-secondary',
    attributes: {
      type: 'button',
      'aria-label': dark ? 'Use light theme' : 'Use dark theme',
    },
  });
  const updateThemeButton = (): void => {
    theme.textContent = dark ? '☀ Light' : '☾ Dark';
    theme.setAttribute(
      'aria-label',
      dark ? 'Use light theme' : 'Use dark theme',
    );
  };
  updateThemeButton();
  cleanups.push(
    listen(theme, 'click', () => {
      dark = !dark;
      localStorage.setItem(
        'spell-planner-theme',
        dark ? 'dark' : 'light',
      );
      applyTheme(dark);
      updateThemeButton();
    }),
  );
  const status = element('output', {
    className: 'storage-status',
    text: 'Loading characters…',
    attributes: {
      id: 'status',
      role: 'status',
      'aria-live': 'polite',
      'data-ready': 'false',
    },
  });
  const list = element('div', {
    className: 'character-results',
    attributes: { 'aria-busy': 'true' },
  });
  const transfer = element('div');
  const share = element('div');
  const main = element('main', { className: 'character-list-main' });
  clear(context.root);
  context.root.append(
    element('div', { className: 'application-shell' }, [
      element('header', { className: 'app-header' }, [
        element('div', { className: 'header-content' }, [
          element('div', { className: 'header-title' }, [
            home,
            element('h1', { text: 'Characters' }),
            element('p', {
              text: 'Open a build or start a new multiclass spell plan.',
            }),
          ]),
          element('div', { className: 'header-actions' }, [status, theme]),
        ]),
      ]),
      main,
    ]),
  );
  return { main, status, list, transfer, share };
}

/**
 * The PRIMARY action (D42): every new character starts in the guided flow, so
 * the front-door control navigates to the class chooser and persists nothing
 * itself — the class comes first (D48), and it is chosen over there.
 */
function createGuidedStart(
  context: ScreenContext,
  cleanups: Cleanup[],
): HTMLElement {
  const start = element('a', {
    className: 'button-primary',
    text: 'Create a character',
    attributes: { href: GUIDED_NEW_ROUTE },
  });
  cleanups.push(
    listen(start, 'click', (event) => {
      event.preventDefault();
      context.router.navigate(GUIDED_NEW_ROUTE);
    }),
  );
  return element('section', { className: 'start-panel panel' }, [
    element('div', { className: 'start-copy' }, [
      element('h2', { text: 'Start a new character' }),
      element('p', {
        text:
          'The guided builder opens with the class choice and walks the ' +
          'level 1 steps in order.',
      }),
    ]),
    start,
  ]);
}

function createForm(
  controller: CharacterListController,
  setError: (error: unknown | null) => void,
  cleanups: Cleanup[],
): HTMLFormElement {
  const input = element('input', {
    className: 'field',
    attributes: {
      maxlength: '120',
      required: '',
      autocomplete: 'off',
      placeholder: 'e.g. Selene, spellblade',
    },
  });
  const button = element('button', {
    className: 'button-secondary',
    text: 'Create blank character',
    attributes: { type: 'submit' },
  });
  const form = element('form', { className: 'create-panel' }, [
    element('label', { text: 'Character name' }, [input]),
    button,
  ]);
  cleanups.push(
    listen(input, 'input', () => {
      button.disabled = input.value.trim() === '';
    }),
    listen(form, 'submit', (event) => {
      event.preventDefault();
      if (button.disabled || input.value.trim() === '') {
        return;
      }
      button.disabled = true;
      button.textContent = 'Creating…';
      setError(null);
      void controller.create(input.value).catch((error: unknown) => {
        setError(error);
        button.disabled = input.value.trim() === '';
        button.textContent = 'Create blank character';
      });
    }),
  );
  button.disabled = true;
  return form;
}

/**
 * D42's escape hatch: blank creation SURVIVES — import, share and fixtures
 * need a class-less row, and `queries.characters.create` is untouched — but it
 * is no longer the front door. It lives collapsed behind an "advanced"
 * disclosure, reachable in two clicks and visibly secondary.
 */
function createBlankEscapeHatch(
  controller: CharacterListController,
  setError: (error: unknown | null) => void,
  cleanups: Cleanup[],
): HTMLElement {
  return element('details', { className: 'advanced-create panel' }, [
    element('summary', { text: 'Advanced: create a blank character' }),
    element('p', {
      className: 'advanced-note',
      text:
        'Skips the guided builder. A blank character has no class until ' +
        'one is added in its workspace.',
    }),
    createForm(controller, setError, cleanups),
  ]);
}

function renderCards(
  target: HTMLElement,
  characters: readonly CharacterSummary[],
  completeness: ReadonlyMap<number, CompletenessCount>,
  controller: CharacterListController,
  context: ScreenContext,
  reload: () => Promise<void>,
  setError: (error: unknown | null) => void,
  cleanups: Cleanup[],
  shareCharacter: (
    character: Pick<CharacterSummary, 'id' | 'name'>,
  ) => void,
): void {
  clear(target);
  if (characters.length === 0) {
    target.append(
      element('section', { className: 'empty-state panel' }, [
        element('div', {
          className: 'empty-mark',
          text: '⌁',
          attributes: { 'aria-hidden': 'true' },
        }),
        element('h2', { text: 'No characters yet' }),
        element('p', {
          text: 'Use "Create a character" above to choose a class and start the guided build.',
        }),
      ]),
    );
    target.setAttribute('aria-busy', 'false');
    return;
  }

  const grid = element('div', { className: 'character-grid' });
  for (const character of characters) {
    const open = element('a', {
      className: 'button-primary',
      text: 'Open workspace',
      attributes: { href: `/characters/${character.id}` },
    });
    cleanups.push(
      listen(open, 'click', (event) => {
        event.preventDefault();
        context.router.navigate(`/characters/${character.id}`);
      }),
    );
    const remove = element('button', {
      className: 'button-danger',
      text: 'Delete',
      attributes: {
        type: 'button',
        'aria-label': `Delete ${character.name}`,
      },
    });
    const share = element('button', {
      className: 'button-secondary',
      text: 'Share link',
      attributes: {
        type: 'button',
        'aria-label': `Share ${character.name} by link`,
      },
    });
    cleanups.push(
      listen(share, 'click', () => shareCharacter(character)),
    );
    cleanups.push(
      listen(remove, 'click', () => {
        remove.disabled = true;
        setError(null);
        void controller
          .delete(character)
          .then(async (deleted) => {
            if (deleted) {
              await reload();
            }
          })
          .catch((error: unknown) => setError(error))
          .finally(() => {
            remove.disabled = false;
          });
      }),
    );
    const warnings = element('span', {
      className:
        character.warning_count > 0
          ? 'status-badge status-warning'
          : 'status-badge status-ok',
      text: `${character.warning_count > 0 ? '⚠' : '✓'} ${warningLabel(
        character.warning_count,
      )}`,
    });
    const counts = completeness.get(character.id);
    const badges = [warnings];
    if (counts !== undefined) {
      badges.push(
        element('span', {
          className:
            counts.outstanding_count > 0
              ? 'status-badge status-outstanding'
              : 'status-badge status-settled',
          text: outstandingLabel(counts.outstanding_count),
        }),
      );
      if (counts.catalog_gap_count > 0) {
        badges.push(
          element('span', {
            className: 'status-badge status-catalog-gap',
            text: catalogGapLabel(counts.catalog_gap_count),
          }),
        );
      }
    }
    grid.append(
      element('article', { className: 'character-card panel' }, [
        element('div', { className: 'card-heading' }, [
          element('div', {}, [
            element('h2', { text: character.name }),
            element('p', {
              text:
                character.level === null
                  ? 'Level undetermined'
                  : `Level ${character.level}`,
            }),
          ]),
          element('div', { className: 'card-badges' }, badges),
        ]),
        element('p', {
          className: 'class-summary',
          text: classSummary(character),
        }),
        element('div', { className: 'card-actions' }, [
          open,
          share,
          remove,
        ]),
      ]),
    );
  }
  target.append(grid);
  target.setAttribute('aria-busy', 'false');
}

export async function renderCharacterList(
  context: ScreenContext,
): Promise<Cleanup> {
  const cleanups: Cleanup[] = [];
  const cardCleanups: Cleanup[] = [];
  let transferControls: ImportBackupControls | undefined;
  let shareControls: ShareControls | undefined;
  let active = true;
  const queries: QueriesClient = createQueriesClient(context.rpc);
  const controller = new CharacterListController({
    queries,
    navigate: (path) => context.router.navigate(path),
    confirm: (message) => window.confirm(message),
  });
  const shell = createShell(context, cleanups);
  const error = element('p', {
    className: 'action-error',
    attributes: { role: 'alert', hidden: '' },
  });
  const setError = (value: unknown | null): void => {
    if (value === null) {
      error.textContent = '';
      error.hidden = true;
      return;
    }
    error.textContent =
      value instanceof Error ? value.message : String(value);
    error.hidden = false;
  };
  shell.main.append(
    createGuidedStart(context, cleanups),
    createBlankEscapeHatch(controller, setError, cleanups),
    error,
    shell.share,
    shell.transfer,
    shell.list,
  );

  const storage = navigator.storage;
  const durability = durableStorageState(storage);

  const reload = async (): Promise<void> => {
    shell.list.setAttribute('aria-busy', 'true');
    const [characters, completeness] = await Promise.all([
      controller.list(),
      completenessByCharacter(() => queries.outstandingCounts()),
    ]);
    if (!active) {
      return;
    }
    for (const cleanup of cardCleanups.splice(0)) {
      cleanup();
    }
    if (transferControls === undefined) {
      transferControls = createImportBackupControls({
        rpc: context.rpc,
        characters,
        onPersistedChange: async () => {
          try {
            setError(null);
            await reload();
          } catch (reloadError) {
            setError(reloadError);
          }
        },
      });
      shell.transfer.replaceChildren(transferControls.element);
    } else {
      transferControls.updateCharacters(characters);
    }
    if (shareControls === undefined) {
      shareControls = createShareControls({
        rpc: context.rpc,
        initialFragment: location.hash.slice(1),
        onPersistedChange: async () => {
          try {
            setError(null);
            await reload();
          } catch (reloadError) {
            setError(reloadError);
          }
        },
      });
      shell.share.replaceChildren(shareControls.element);
    }
    renderCards(
      shell.list,
      characters,
      completeness,
      controller,
      context,
      reload,
      setError,
      cardCleanups,
      (character) => shareControls?.shareCharacter(character),
    );
  };

  try {
    await reload();
  } catch (error) {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
    throw error;
  }
  const storageState = await durability;
  if (active) {
    shell.status.textContent = `Local database ready. ${durableStorageLabel(
      storageState,
    )}`;
    shell.status.dataset.ready = 'true';
  }

  return () => {
    active = false;
    transferControls?.cleanup();
    shareControls?.cleanup();
    for (const cleanup of [...cardCleanups, ...cleanups]) {
      cleanup();
    }
    cardCleanups.length = 0;
    cleanups.length = 0;
  };
}
