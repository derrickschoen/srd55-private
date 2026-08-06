import {
  createAuthoringClient,
  type AuthoringClient,
} from '../../../authoring/client';
import type {
  AuthoredContentKind,
  AuthoringLibrary,
  HomebrewDraftSummary,
  PublishedHomebrewSummary,
  StoredHomebrewDraft,
} from '../../../authoring/contracts';
import type { HomebrewDraftUuid } from '../../../authoring/ids';
import type { GuidedClassOption } from '../../../builder/contracts';
import { createQueriesClient } from '../../../queries/client';
import type { ScreenContext } from '../../screen';
import { clear, element, listen, type Cleanup } from '../../dom';
import { freeTextSpan } from '../../free-text';
import {
  createDraftConflictDialog,
  draftRevisionConflict,
  type DraftConflictDialog,
} from '../../authoring/draft-conflict-dialog';
import {
  isStoredSpeciesDraft,
  renderSpeciesForm,
} from './species-form';
import {
  isStoredSubclassDraft,
  renderSubclassForm,
} from './subclass-form';
import {
  isStoredBackgroundDraft,
  renderBackgroundForm,
} from './background-form';

export const HOMEBREW_ROUTE = '/homebrew';

export type HomebrewLibraryTab = AuthoredContentKind | 'drafts';

interface LibraryTabDefinition {
  readonly id: HomebrewLibraryTab;
  readonly label: string;
}

export const HOMEBREW_LIBRARY_TABS: readonly LibraryTabDefinition[] = [
  { id: 'species', label: 'Species' },
  { id: 'subclass', label: 'Subclasses' },
  { id: 'background', label: 'Backgrounds' },
  { id: 'drafts', label: 'Drafts' },
] as const;

const KIND_LABELS: Readonly<Record<AuthoredContentKind, string>> = {
  species: 'Species',
  subclass: 'Subclass',
  background: 'Background',
};

export function homebrewTabPath(tab: HomebrewLibraryTab): string {
  return tab === 'species' ? HOMEBREW_ROUTE : `${HOMEBREW_ROUTE}?tab=${tab}`;
}

export function homebrewDraftPath(draftUuid: HomebrewDraftUuid): string {
  return `${HOMEBREW_ROUTE}/drafts/${encodeURIComponent(draftUuid)}`;
}

export function selectedHomebrewTab(value: string | null): HomebrewLibraryTab {
  return HOMEBREW_LIBRARY_TABS.find((tab) => tab.id === value)?.id ?? 'species';
}

export interface HomebrewLibraryRenderOptions {
  readonly client?: AuthoringClient;
  readonly confirmDiscard?: (draft: HomebrewDraftSummary) => boolean;
  readonly parentClasses?: readonly GuidedClassOption[];
}

function badge(text: string, tone: 'draft' | 'homebrew' | 'neutral'): HTMLElement {
  return element('span', {
    className: `homebrew-badge homebrew-badge-${tone}`,
    text,
  });
}

function routedLink(
  context: ScreenContext,
  cleanups: Cleanup[],
  text: string,
  href: string,
  className?: string,
): HTMLAnchorElement {
  const link = element('a', {
    text,
    ...(className === undefined ? {} : { className }),
    attributes: { href },
  });
  cleanups.push(listen(link, 'click', (event) => {
    event.preventDefault();
    context.router.navigate(href);
  }));
  return link;
}

function shell(
  context: ScreenContext,
  cleanups: Cleanup[],
): { readonly container: HTMLElement; readonly main: HTMLElement } {
  const container = element('div', { className: 'homebrew-shell' });
  const main = element('main', { className: 'homebrew-main' });
  container.append(
    element('header', { className: 'homebrew-header' }, [
      element('div', { className: 'homebrew-header-content' }, [
        element('div', {}, [
          routedLink(context, cleanups, '← Characters', '/'),
          element('h1', { text: 'Homebrew library' }),
          element('p', {
            text: 'Draft locally, then publish an immutable catalog entry.',
          }),
        ]),
      ]),
    ]),
    main,
  );
  clear(context.root);
  context.root.append(container);
  return { container, main };
}

function tabList(
  context: ScreenContext,
  selected: HomebrewLibraryTab,
  cleanups: Cleanup[],
): HTMLElement {
  const tabs = element('nav', {
    className: 'homebrew-tabs',
    attributes: { role: 'tablist', 'aria-label': 'Homebrew content' },
  });
  const links = HOMEBREW_LIBRARY_TABS.map((tab) => {
    const link = routedLink(
      context,
      cleanups,
      tab.label,
      homebrewTabPath(tab.id),
    );
    link.setAttribute('role', 'tab');
    link.setAttribute('aria-selected', String(tab.id === selected));
    link.setAttribute('aria-controls', 'homebrew-tab-panel');
    link.tabIndex = tab.id === selected ? 0 : -1;
    link.dataset.homebrewTab = tab.id;
    tabs.append(link);
    return link;
  });
  cleanups.push(listen(tabs, 'keydown', (event) => {
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current < 0) return;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (current + 1) % links.length;
    if (event.key === 'ArrowLeft') next = (current - 1 + links.length) % links.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = links.length - 1;
    if (next === null) return;
    event.preventDefault();
    links[next]?.focus();
  }));
  return tabs;
}

function publishedCard(
  context: ScreenContext,
  item: PublishedHomebrewSummary,
  client: AuthoringClient,
  status: HTMLElement,
  cleanups: Cleanup[],
): HTMLElement {
  const copy = element('button', {
    className: 'button-secondary',
    text: 'Make a homebrew copy',
    attributes: {
      type: 'button',
      'aria-label': `Make a homebrew copy of ${item.name}`,
    },
  });
  cleanups.push(listen(copy, 'click', () => {
    copy.disabled = true;
    status.textContent = `Creating a draft from ${item.name}…`;
    void client.createDraft({
      content_kind: item.content_kind,
      base_content_key: item.content_key,
    }).then((draft) => {
      context.router.navigate(homebrewDraftPath(draft.draft_uuid));
    }).catch((error: unknown) => {
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
      copy.disabled = false;
    });
  }));
  const title = element('h2');
  title.append(freeTextSpan(item.name));
  return element('article', { className: 'homebrew-card panel' }, [
    element('div', { className: 'homebrew-card-heading' }, [
      title,
      element('div', { className: 'homebrew-card-badges' }, [
        badge('Homebrew', 'homebrew'),
        badge(item.rules_edition, 'neutral'),
      ]),
    ]),
    element('p', { text: `${KIND_LABELS[item.content_kind]} · immutable published version` }),
    copy,
  ]);
}

function draftCard(
  context: ScreenContext,
  item: HomebrewDraftSummary,
  client: AuthoringClient,
  status: HTMLElement,
  confirmDiscard: (draft: HomebrewDraftSummary) => boolean,
  reload: () => Promise<void>,
  cleanups: Cleanup[],
  dialogs: DraftConflictDialog[],
): HTMLElement {
  const title = element('h2');
  title.append(freeTextSpan(item.name === '' ? 'Untitled draft' : item.name));
  const open = routedLink(
    context,
    cleanups,
    'Continue editing',
    homebrewDraftPath(item.draft_uuid),
    'button-primary',
  );
  const discard = element('button', {
    className: 'button-danger',
    text: 'Discard draft',
    attributes: {
      type: 'button',
      'aria-label': `Discard ${item.name || 'untitled'} draft`,
    },
  });
  cleanups.push(listen(discard, 'click', () => {
    if (!confirmDiscard(item)) return;
    discard.disabled = true;
    status.textContent = 'Discarding draft…';
    void client.discardDraft({
      draft_uuid: item.draft_uuid,
      expected_revision: item.revision,
    }).then(reload).catch((error: unknown) => {
      discard.disabled = false;
      const conflict = draftRevisionConflict(error);
      if (conflict === null) {
        status.textContent = error instanceof Error ? error.message : String(error);
        status.setAttribute('role', 'alert');
        return;
      }
      const dialog = createDraftConflictDialog({
        conflict,
        mount: context.root,
        restoreFocus: (action) => {
          if (action === 'keep-local') {
            discard.focus();
            return;
          }
          const reloadedDraftControl = context.root
            .querySelector<HTMLElement>('.homebrew-tab-panel')
            ?.querySelector<HTMLElement>('a');
          (reloadedDraftControl ?? context.root.querySelector<HTMLElement>('[aria-selected="true"]'))
            ?.focus();
        },
        onLoadSaved: reload,
        onKeepLocal: () => {
          discard.disabled = false;
          status.textContent = 'The newer saved revision was left unchanged.';
        },
      });
      dialogs.push(dialog);
    });
  }));
  return element('article', { className: 'homebrew-card panel' }, [
    element('div', { className: 'homebrew-card-heading' }, [
      title,
      element('div', { className: 'homebrew-card-badges' }, [
        badge('Draft', 'draft'),
        badge(KIND_LABELS[item.content_kind], 'neutral'),
      ]),
    ]),
    element('p', {
      text: `Saved revision ${String(item.revision)} · updated ${item.updated_at}`,
    }),
    element('div', { className: 'homebrew-card-actions' }, [open, discard]),
  ]);
}

function directNewButton(
  context: ScreenContext,
  kind: AuthoredContentKind,
  client: AuthoringClient,
  status: HTMLElement,
  cleanups: Cleanup[],
): HTMLButtonElement {
  const button = element('button', {
    className: 'button-primary',
    text: `New ${KIND_LABELS[kind].toLowerCase()}`,
    attributes: { type: 'button' },
  });
  cleanups.push(listen(button, 'click', () => {
    button.disabled = true;
    status.textContent = `Creating ${KIND_LABELS[kind].toLowerCase()} draft…`;
    void client.createDraft({ content_kind: kind }).then((draft) => {
      context.router.navigate(homebrewDraftPath(draft.draft_uuid));
    }).catch((error: unknown) => {
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
      button.disabled = false;
    });
  }));
  return button;
}

function draftHeading(draft: StoredHomebrewDraft): HTMLElement {
  const heading = element('h2');
  heading.append(freeTextSpan(draft.document.name === '' ? 'Untitled draft' : draft.document.name));
  return element('div', { className: 'homebrew-draft-heading' }, [
    heading,
    element('div', { className: 'homebrew-card-badges' }, [
      badge('Draft', 'draft'),
      badge(KIND_LABELS[draft.content_kind], 'neutral'),
    ]),
  ]);
}

async function renderDraftRoute(
  context: ScreenContext,
  client: AuthoringClient,
  draftUuid: HomebrewDraftUuid,
  cleanups: Cleanup[],
  parentClasses?: readonly GuidedClassOption[],
): Promise<void> {
  const view = shell(context, cleanups);
  const draft = await client.readDraft({ draft_uuid: draftUuid });
  const back = routedLink(context, cleanups, '← All drafts', homebrewTabPath('drafts'));
  const formMount = element('div', {
    className: 'homebrew-form-mount',
    attributes: {
      'data-authoring-form-kind': draft.content_kind,
      'aria-label': `${KIND_LABELS[draft.content_kind]} authoring form`,
    },
  });
  view.main.append(
    back,
    element('article', { className: 'homebrew-draft-shell panel' }, [
      draftHeading(draft),
      element('p', { text: `Saved revision ${String(draft.revision)}.` }),
      formMount,
    ]),
  );
  if (isStoredSpeciesDraft(draft)) {
    cleanups.push(renderSpeciesForm({ context, client, mount: formMount, draft }));
  } else if (isStoredSubclassDraft(draft)) {
    const bundledParents = parentClasses ?? await createQueriesClient(context.rpc).guidedClassOptions();
    cleanups.push(renderSubclassForm({
      context,
      client,
      mount: formMount,
      draft,
      parentClasses: bundledParents,
    }));
  } else if (isStoredBackgroundDraft(draft)) {
    const references = await client.backgroundReferences();
    cleanups.push(renderBackgroundForm({
      context,
      client,
      mount: formMount,
      draft,
      references,
    }));
  } else {
    formMount.append(element('p', {
      text: `The shared ${KIND_LABELS[draft.content_kind].toLowerCase()} draft shell is ready for its authoring form.`,
    }));
  }
}

export async function renderHomebrewLibrary(
  context: ScreenContext,
  options: HomebrewLibraryRenderOptions = {},
): Promise<Cleanup> {
  const client = options.client ?? createAuthoringClient(context.rpc);
  const cleanups: Cleanup[] = [];
  const cardCleanups: Cleanup[] = [];
  const dialogs: DraftConflictDialog[] = [];
  let active = true;
  const draftUuid = context.route.segments.length === 3 &&
    context.route.segments[0] === 'homebrew' &&
    context.route.segments[1] === 'drafts'
    ? context.route.segments[2] as HomebrewDraftUuid
    : null;
  if (draftUuid !== null) {
    await renderDraftRoute(context, client, draftUuid, cleanups, options.parentClasses);
    return () => {
      active = false;
      for (const dialog of dialogs.splice(0)) dialog.cleanup();
      for (const cleanup of cleanups.splice(0)) cleanup();
    };
  }

  const selected = selectedHomebrewTab(context.route.query.get('tab'));
  const view = shell(context, cleanups);
  const status = element('p', {
    className: 'homebrew-status',
    text: 'Loading library…',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const panel = element('section', {
    className: 'homebrew-tab-panel',
    attributes: {
      id: 'homebrew-tab-panel',
      role: 'tabpanel',
      'aria-busy': 'true',
    },
  });
  view.main.append(tabList(context, selected, cleanups), status, panel);

  const confirmDiscard = options.confirmDiscard ?? ((draft) =>
    window.confirm(`Discard ${draft.name || 'this untitled draft'}? This cannot be undone.`));
  const renderLibrary = (library: AuthoringLibrary): void => {
    if (!active) return;
    for (const cleanup of cardCleanups.splice(0)) cleanup();
    clear(panel);
    if (selected === 'drafts') {
      panel.append(element('h2', { text: 'Drafts' }));
      if (library.drafts.length === 0) {
        panel.append(element('p', { text: 'No drafts yet.' }));
      } else {
        const cards = element('div', { className: 'homebrew-grid' });
        for (const draft of library.drafts) {
          cards.append(draftCard(
            context,
            draft,
            client,
            status,
            confirmDiscard,
            reload,
            cardCleanups,
            dialogs,
          ));
        }
        panel.append(cards);
      }
    } else {
      const entries = library.published.filter(
        (entry) => entry.content_kind === selected,
      );
      panel.append(element('div', { className: 'homebrew-panel-heading' }, [
        element('h2', { text: HOMEBREW_LIBRARY_TABS.find((tab) => tab.id === selected)?.label ?? KIND_LABELS[selected] }),
        directNewButton(context, selected, client, status, cardCleanups),
      ]));
      if (entries.length === 0) {
        panel.append(element('p', {
          text: `No published homebrew ${KIND_LABELS[selected].toLowerCase()} entries yet.`,
        }));
      } else {
        const cards = element('div', { className: 'homebrew-grid' });
        for (const entry of entries) {
          cards.append(publishedCard(context, entry, client, status, cardCleanups));
        }
        panel.append(cards);
      }
    }
    panel.setAttribute('aria-busy', 'false');
    status.textContent = 'Homebrew library loaded.';
    status.setAttribute('role', 'status');
  };
  const reload = async (): Promise<void> => {
    panel.setAttribute('aria-busy', 'true');
    renderLibrary(await client.list());
  };
  await reload();
  return () => {
    active = false;
    for (const dialog of dialogs.splice(0)) dialog.cleanup();
    for (const cleanup of [...cardCleanups, ...cleanups]) cleanup();
    cardCleanups.length = 0;
    cleanups.length = 0;
  };
}
