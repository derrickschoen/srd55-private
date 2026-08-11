import {
  createAuthoringClient,
  type AuthoringClient,
} from '../../../authoring/client';
import type {
  ArchiveSetCharacter,
  AuthoredContentKind,
  AuthoringLibrary,
  HomebrewDraftSummary,
  PublishedHomebrewSummary,
  ReplacementDecision,
  ReplacementNotice,
  StoredHomebrewDraft,
} from '../../../authoring/contracts';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import type { HomebrewDraftUuid } from '../../../authoring/ids';
import { AUTHORING_TEXT_LIMITS } from '../../../authoring/limits';
import type { GuidedClassOption } from '../../../builder/contracts';
import { createQueriesClient } from '../../../queries/client';
import { RpcError } from '../../../rpc/protocol';
import type { ScreenContext } from '../../screen';
import { clear, element, listen, type Cleanup } from '../../dom';
import { contentDecisionConsequence } from '../../content-decision-copy';
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
import { createPermanentPurgeDialog } from './permanent-purge-dialog';
import {
  HOMEBREW_ARCHIVE_ROUTE,
  HOMEBREW_MISSING_DRAFT_NOTICE,
  HOMEBREW_ROUTE,
  homebrewDeletePath,
  homebrewMissingDraftPath,
  homebrewReplacementPath,
} from './homebrew-routes';

export {
  HOMEBREW_ARCHIVE_ROUTE,
  HOMEBREW_ROUTE,
  homebrewDeletePath,
  homebrewMissingDraftPath,
  homebrewPublishedPath,
  homebrewReplacementPath,
} from './homebrew-routes';

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

interface PublishedRouteResult {
  readonly outcome: 'created' | 'matched_existing';
  readonly contentKey: string;
  readonly name: string;
  readonly catalogLayer: 'bundled' | 'external';
  readonly previousUsageCount: number;
  readonly previousKey: string | null;
}

function publishedRouteResult(query: URLSearchParams): PublishedRouteResult | null {
  const outcome = query.get('publishOutcome');
  const contentKey = query.get('publishedKey');
  const name = query.get('publishedName');
  const catalogLayer = query.get('publishedLayer');
  const usageText = query.get('previousUsageCount');
  if (
    (outcome !== 'created' && outcome !== 'matched_existing') ||
    contentKey === null ||
    name === null ||
    (catalogLayer !== 'bundled' && catalogLayer !== 'external') ||
    usageText === null ||
    !/^\d+$/u.test(usageText)
  ) {
    return null;
  }
  const previousUsageCount = Number(usageText);
  if (!Number.isSafeInteger(previousUsageCount)) return null;
  return {
    outcome,
    contentKey,
    name,
    catalogLayer,
    previousUsageCount,
    previousKey: query.get('previousKey'),
  };
}

function draftNotFound(error: unknown): boolean {
  if (!(error instanceof RpcError)) return false;
  if (typeof error.data !== 'object' || error.data === null || Array.isArray(error.data)) {
    return false;
  }
  return Reflect.get(error.data, 'reason') === 'draft_not_found';
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

function replacementNoticeText(notice: ReplacementNotice): string {
  switch (notice.kind) {
    case 'retargeted_selection_invalid': {
      const selected = (() => {
        switch (notice.selected.kind) {
          case 'spell':
            return `${notice.selected.display_name} — ${catalogLayerLabel(
              notice.selected.catalog_layer,
            )}`;
          case 'spell_unknown':
            return 'UNKNOWN spell name — Unknown catalog layer';
          case 'skill':
            return notice.selected.skill;
        }
      })();
      return `${selected} in ${notice.rule_key} became invalid because ` +
        `${notice.consequence}.`;
    }
    case 'retargeted_level_feat_invalid':
      return 'A feat selection became invalid ' +
        'because the replacement has no matching source.';
  }
}

function replacementNoticeItem(
  context: ScreenContext,
  cleanups: Cleanup[],
  notice: ReplacementNotice,
  includeRepair: boolean,
): HTMLLIElement {
  const item = element('li');
  item.append(element('span', { text: replacementNoticeText(notice) }));
  if (includeRepair) {
    item.append(' ', routedLink(
      context,
      cleanups,
      notice.repair.label,
      notice.repair.href,
    ));
  }
  return item;
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
        routedLink(
          context,
          cleanups,
          'Archive',
          HOMEBREW_ARCHIVE_ROUTE,
          'button-secondary',
        ),
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
  const edit = element('button', {
    className: 'button-secondary',
    text: 'Edit as new version',
    attributes: {
      type: 'button',
      'aria-label': `Edit ${item.name} as a new version`,
    },
  });
  cleanups.push(listen(edit, 'click', () => {
    edit.disabled = true;
    status.textContent = `Creating a new version of ${item.name}…`;
    void client.createDraft({
      content_kind: item.content_kind,
      base_content_key: item.content_key,
    }).then((draft) => {
      context.router.navigate(homebrewDraftPath(draft.draft_uuid));
    }).catch((error: unknown) => {
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
      edit.disabled = false;
    });
  }));
  const remove = routedLink(
    context,
    cleanups,
    'Delete',
    homebrewDeletePath(item.content_key),
    'button-danger',
  );
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
    element('div', { className: 'homebrew-card-actions' }, [
      ...(item.superseded_by === null ? [edit] : []),
      remove,
    ]),
  ]);
}

function characterList(characters: readonly ArchiveSetCharacter[]): HTMLElement {
  if (characters.length === 0) {
    return element('p', { text: 'No characters are attached.' });
  }
  const list = element('ul');
  for (const character of characters) {
    const item = element('li');
    item.append(freeTextSpan(character.character_name));
    list.append(item);
  }
  return list;
}

async function renderReplacementRoute(
  context: ScreenContext,
  client: AuthoringClient,
  oldContentKey: string,
  newContentKey: string,
  cleanups: Cleanup[],
): Promise<void> {
  const view = shell(context, cleanups);
  const status = element('p', {
    className: 'homebrew-status', text: 'Loading replacement review…',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  view.main.append(status);
  const plan = await client.previewReplacementSet({
    old_content_key: oldContentKey as PublishedHomebrewSummary['content_key'],
    new_content_key: newContentKey as PublishedHomebrewSummary['content_key'],
  });
  const reviewSelections = new Map<string, ReplacementDecision>();
  const selectableReviewKeys: string[] = [];
  let apply: HTMLButtonElement | null = null;
  const selectionKey = (replacementIndex: number, candidateContentKey: string): string =>
    `${String(replacementIndex)}\u0000${candidateContentKey}`;
  const reviewSelection = (key: string): ReplacementDecision => {
    const decision = reviewSelections.get(key);
    if (decision === undefined) {
      throw new Error('An explicit replacement review choice is required.');
    }
    return decision;
  };
  const refreshApplyState = (): void => {
    if (apply === null) return;
    apply.disabled = selectableReviewKeys.some((key) => {
      const decision = reviewSelections.get(key);
      return decision === undefined ||
        decision.decision === 'clone' && decision.clone_name.trim() === '';
    });
  };
  const review = element('section', {
    className: 'panel homebrew-replacement-review',
    attributes: { 'aria-label': 'Fix affected characters' },
  }, [
    element('h2', { text: 'Review character fixes' }),
    element('p', {
      text: 'Each listed character keeps the previous version unless you explicitly apply every change below.',
    }),
  ]);
  for (const [replacementIndex, replacement] of plan.replacements.entries()) {
    const name = element('h3');
    name.append(freeTextSpan(replacement.character_name));
    const changes = element('dl');
    for (const change of replacement.changes) {
      changes.append(
        element('dt', { text: change.label }),
        element('dd', { text: `Before: ${String(change.before)}` }),
        element('dd', { text: `After: ${String(change.after)}` }),
      );
    }
    const consequences = replacement.notices.length === 0
      ? []
      : [
          element('h4', { text: 'Selections that will become invalid' }),
          element('ul', {}, replacement.notices.map((notice) =>
            replacementNoticeItem(context, cleanups, notice, false)
          )),
        ];
    const selectableChoices: HTMLElement[] = [];
    for (const [candidateIndex, candidate] of replacement.review.entries()) {
      if (
        candidate.reason !== 'key-collision' &&
        candidate.reason !== 'installed-target'
      ) continue;
      const key = selectionKey(replacementIndex, candidate.candidate_content_key);
      selectableReviewKeys.push(key);
      const prefix = `replacement-review-${String(replacementIndex + 1)}-${String(candidateIndex + 1)}`;
      const match = element('input', {
        attributes: {
          id: `${prefix}-match`, type: 'radio', name: prefix, value: 'match',
        },
      });
      const clone = element('input', {
        attributes: {
          id: `${prefix}-clone`, type: 'radio', name: prefix, value: 'clone',
        },
      });
      const cloneName = element('input', {
        attributes: {
          id: `${prefix}-clone-name`, type: 'text', value: candidate.clone_name,
          maxlength: String(AUTHORING_TEXT_LIMITS.name), disabled: '',
        },
      });
      cloneName.value = candidate.clone_name;
      cloneName.disabled = true;
      if (candidate.reason === 'installed-target') {
        match.checked = true;
        reviewSelections.set(key, {
          candidate_content_key: candidate.candidate_content_key,
          decision: 'match',
        });
      }
      const chooseMatch = (): void => {
        reviewSelections.set(key, {
          candidate_content_key: candidate.candidate_content_key,
          decision: 'match',
        });
        cloneName.disabled = true;
        refreshApplyState();
      };
      const chooseClone = (): void => {
        reviewSelections.set(key, {
          candidate_content_key: candidate.candidate_content_key,
          decision: 'clone',
          clone_name: cloneName.value,
        });
        cloneName.disabled = false;
        refreshApplyState();
      };
      cleanups.push(
        listen(match, 'change', chooseMatch),
        listen(clone, 'change', chooseClone),
        listen(cloneName, 'input', () => {
          clone.checked = true;
          match.checked = false;
          chooseClone();
        }),
      );
      selectableChoices.push(element('fieldset', {
        className: 'content-adoption-row replacement-review-row',
        attributes: { 'data-content-key': candidate.candidate_content_key },
      }, [
        element('legend', {
          text: `${candidate.candidate_name} — ` +
            catalogLayerLabel(candidate.candidate_catalog_layer),
        }),
        element('p', {
          text: candidate.reason === 'installed-target'
            ? 'This target was certified from the complete entry already installed in this library. Match is safe by default; choose Clone only to fork it.'
            : 'This same-key replacement reference has no incoming rules evidence. Choose what this attached character should use.',
        }),
        match,
        element('label', {
          text: contentDecisionConsequence('match', 'reference-replacement'),
          attributes: { for: `${prefix}-match` },
        }),
        clone,
        element('label', {
          text: contentDecisionConsequence('clone', 'reference-replacement'),
          attributes: { for: `${prefix}-clone` },
        }),
        element('label', {
          text: 'Private copy name', attributes: { for: `${prefix}-clone-name` },
        }),
        cloneName,
      ]));
    }
    review.append(element('article', { className: 'homebrew-card' }, [
      name,
      changes,
      ...consequences,
      ...selectableChoices,
    ]));
  }
  if (plan.replacements.length === 0) {
    review.append(element('p', { text: 'No characters use the previous version.' }));
  } else {
    const applyButton = element('button', {
      className: 'button-primary',
      text: 'Apply to all listed characters',
      attributes: { type: 'button' },
    });
    apply = applyButton;
    refreshApplyState();
    cleanups.push(listen(applyButton, 'click', () => {
      if (applyButton.disabled) return;
      applyButton.disabled = true;
      status.textContent = 'Applying every reviewed replacement…';
      void client.commitReplacementSet({
        old_content_key: plan.old_content_key,
        new_content_key: plan.new_content_key,
        replacements: plan.replacements.map((replacement, replacementIndex) => ({
          token: replacement.token,
          decisions: replacement.review.flatMap((candidate) => {
            if (
              candidate.reason === 'key-collision' ||
              candidate.reason === 'installed-target'
            ) {
              const selected = reviewSelection(selectionKey(
                replacementIndex,
                candidate.candidate_content_key,
              ));
              return selected.decision === 'match' &&
                  candidate.reason === 'installed-target'
                ? []
                : [selected];
            }
            return [{
              candidate_content_key: candidate.candidate_content_key,
              decision: candidate.default_decision,
            }];
          }),
          choices: [],
        })),
      }).then((result) => {
        clear(review);
        review.append(
          element('h2', { text: 'Character fixes applied' }),
          element('p', {
            text: `${String(result.replacements.length)} character(s) now use the new version.`,
          }),
        );
        for (const replacement of result.replacements) {
          if (replacement.notices.length === 0) continue;
          const planned = plan.replacements.find((entry) =>
            entry.facts.character_id === replacement.character_id
          );
          const heading = element('h3');
          heading.append(freeTextSpan(
            planned?.character_name ?? `Character ${String(replacement.character_id)}`,
          ));
          review.append(element('article', {
            className: 'homebrew-card homebrew-replacement-notices',
          }, [
            heading,
            element('p', { text: 'Needs review after replacement:' }),
            element('ul', {}, replacement.notices.map((notice) =>
              replacementNoticeItem(context, cleanups, notice, true)
            )),
          ]));
        }
        status.textContent = 'All listed characters were updated.';
      }).catch((error: unknown) => {
        refreshApplyState();
        status.textContent = error instanceof Error ? error.message : String(error);
        status.setAttribute('role', 'alert');
      });
    }));
    review.append(applyButton);
  }
  view.main.append(review);
  status.textContent = 'Replacement review loaded.';
}

async function renderDeleteRoute(
  context: ScreenContext,
  client: AuthoringClient,
  contentKey: string,
  cleanups: Cleanup[],
): Promise<void> {
  const view = shell(context, cleanups);
  const status = element('p', {
    className: 'homebrew-status', text: 'Loading delete review…',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  view.main.append(status);
  const plan = await client.previewArchiveSet({
    content_key: contentKey as PublishedHomebrewSummary['content_key'],
  });
  const name = element('h2', { text: 'Delete creation and attached characters' });
  const creation = element('p');
  creation.append('Creation: ', freeTextSpan(plan.content_name));
  const commit = element('button', {
    className: 'button-danger',
    text: 'Archive creation and all listed characters',
    attributes: { type: 'button' },
  });
  cleanups.push(listen(commit, 'click', () => {
    commit.disabled = true;
    status.textContent = 'Archiving the reviewed set…';
    void client.commitArchiveSet({ token: plan.token }).then(() => {
      context.router.navigate(HOMEBREW_ARCHIVE_ROUTE);
    }).catch((error: unknown) => {
      commit.disabled = false;
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
    });
  }));
  view.main.append(element('section', { className: 'panel' }, [
    name,
    badge(catalogLayerLabel(plan.content_catalog_layer), 'homebrew'),
    element('p', {
      text: 'Nothing is removed silently. This entire set moves to the restorable archive:',
    }),
    creation,
    element('h3', { text: 'Attached characters' }),
    characterList(plan.characters),
    commit,
  ]));
  status.textContent = 'Delete review loaded.';
}

async function renderArchiveRoute(
  context: ScreenContext,
  client: AuthoringClient,
  cleanups: Cleanup[],
): Promise<void> {
  const view = shell(context, cleanups);
  const status = element('p', {
    className: 'homebrew-status', text: 'Loading archive…',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const list = element('section', { attributes: { 'aria-label': 'Archived homebrew sets' } });
  view.main.append(status, list);
  const render = async (announcement = 'Archive loaded.'): Promise<void> => {
    const sets = await client.listArchivedSets();
    clear(list);
    list.append(element('h2', {
      text: 'Archive',
      attributes: { id: 'homebrew-archive-heading', tabindex: '-1' },
    }));
    if (sets.length === 0) list.append(element('p', { text: 'The archive is empty.' }));
    for (const set of sets) {
      const heading = element('h3');
      heading.append(freeTextSpan(set.content_name));
      const restore = element('button', {
        className: 'button-primary',
        text: 'Restore creation and all listed characters',
        attributes: { type: 'button' },
      });
      cleanups.push(listen(restore, 'click', () => {
        restore.disabled = true;
        status.textContent = 'Restoring the complete set…';
        void client.previewRestoreSet({ content_key: set.content_key })
          .then((plan) => client.commitRestoreSet({ token: plan.token }))
          .then(() => render('Creation and all listed characters restored.'))
          .catch((error: unknown) => {
            restore.disabled = false;
            status.textContent = error instanceof Error ? error.message : String(error);
            status.setAttribute('role', 'alert');
          });
      }));
      const purge = element('button', {
        className: 'button-danger',
        text: 'Permanently purge entire lineage',
        attributes: {
          type: 'button',
          'aria-label': `Permanently purge ${set.content_name} and its entire version lineage`,
        },
      });
      cleanups.push(listen(purge, 'click', () => {
        status.textContent = `Permanent purge confirmation opened for ${set.content_name}. ` +
          'Nothing has been deleted.';
        const dialog = createPermanentPurgeDialog({
          mount: context.root,
          archivedSet: set,
          restoreFocus: () => {
            if (purge.isConnected) {
              purge.focus();
              return;
            }
            list.querySelector<HTMLElement>('#homebrew-archive-heading')?.focus();
          },
          onCancel: () => {
            status.textContent = 'Permanent purge cancelled. Nothing was deleted.';
          },
          onConfirm: async () => {
            purge.disabled = true;
            restore.disabled = true;
            status.textContent = 'Permanently purging the complete version lineage…';
            try {
              await client.purgeArchivedSet({
                content_kind: set.content_kind,
                content_key: set.content_key,
              });
              await render('Entire version lineage permanently purged.');
            } catch (error) {
              purge.disabled = false;
              restore.disabled = false;
              status.textContent = error instanceof Error ? error.message : String(error);
              status.setAttribute('role', 'alert');
              throw error;
            }
          },
        });
        cleanups.push(dialog.cleanup);
      }));
      list.append(element('article', { className: 'homebrew-card panel' }, [
        heading,
        badge(catalogLayerLabel(set.content_catalog_layer), 'homebrew'),
        element('p', { text: `Archived ${set.archived_at.split('#', 1)[0]}` }),
        element('h4', { text: 'Characters in this set' }),
        characterList(set.characters),
        restore,
        element('p', {
          text: 'Permanent purge removes every predecessor and successor version and all characters attached to that lineage.',
        }),
        purge,
      ]));
    }
    status.textContent = announcement;
    status.setAttribute('role', 'status');
  };
  await render();
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

function publishedResultNotice(
  context: ScreenContext,
  cleanups: Cleanup[],
  contentKind: AuthoredContentKind,
  result: PublishedRouteResult,
): { readonly root: HTMLElement; readonly heading: HTMLElement; readonly announcement: string } {
  const headingText = result.outcome === 'created'
    ? `${KIND_LABELS[contentKind]} published`
    : 'Matched existing content';
  const heading = element('h2', {
    text: headingText,
    attributes: { id: 'homebrew-publish-result-heading', tabindex: '-1' },
  });
  const name = element('p');
  name.append(freeTextSpan(result.name));
  const actions: HTMLElement[] = [routedLink(
    context,
    cleanups,
    `View ${KIND_LABELS[contentKind].toLowerCase()} library`,
    homebrewTabPath(contentKind),
    'button-primary',
  )];
  if (
    result.previousKey !== null &&
    result.previousKey !== result.contentKey &&
    result.previousUsageCount > 0
  ) {
    actions.push(routedLink(
      context,
      cleanups,
      'Review character fixes',
      homebrewReplacementPath(result.previousKey, result.contentKey),
      'button-secondary',
    ));
  }
  return {
    root: element('section', {
      className: `${contentKind}-publish-result panel`,
      attributes: { 'aria-labelledby': 'homebrew-publish-result-heading' },
    }, [
      heading,
      name,
      badge(result.catalogLayer === 'external' ? 'Homebrew' : 'SRD',
        result.catalogLayer === 'external' ? 'homebrew' : 'neutral'),
      element('p', {
        text: result.previousUsageCount === 0
          ? 'No characters use a previous version.'
          : `${String(result.previousUsageCount)} character(s) still use the previous version.`,
      }),
      element('div', { className: 'homebrew-card-actions' }, actions),
    ]),
    heading,
    announcement: `${headingText}: ${result.name}. Homebrew library loaded.`,
  };
}

function missingDraftNotice(
  context: ScreenContext,
  cleanups: Cleanup[],
): { readonly root: HTMLElement; readonly heading: HTMLElement; readonly announcement: string } {
  const heading = element('h2', {
    text: 'Draft no longer exists',
    attributes: { id: 'homebrew-missing-draft-heading', tabindex: '-1' },
  });
  return {
    root: element('section', {
      className: 'homebrew-missing-draft-notice panel',
      attributes: { 'aria-labelledby': 'homebrew-missing-draft-heading' },
    }, [
      heading,
      element('p', {
        text: 'That draft was published or deleted. It is no longer available to edit.',
      }),
      routedLink(
        context,
        cleanups,
        'View current drafts',
        homebrewTabPath('drafts'),
        'button-primary',
      ),
    ]),
    heading,
    announcement: 'Draft no longer exists. Homebrew library loaded.',
  };
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
    const spellGrantReferences = await client.spellGrantReferences();
    cleanups.push(renderSpeciesForm({
      context, client, mount: formMount, draft, spellGrantReferences,
    }));
  } else if (isStoredSubclassDraft(draft)) {
    const [bundledParents, spellGrantReferences] = await Promise.all([
      parentClasses === undefined
        ? createQueriesClient(context.rpc).guidedClassOptions()
        : Promise.resolve(parentClasses),
      client.spellGrantReferences(),
    ]);
    cleanups.push(renderSubclassForm({
      context,
      client,
      mount: formMount,
      draft,
      parentClasses: bundledParents,
      spellGrantReferences,
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
  if (
    context.route.segments.length === 4 &&
    context.route.segments[0] === 'homebrew' &&
    context.route.segments[1] === 'replacements'
  ) {
    await renderReplacementRoute(
      context,
      client,
      context.route.segments[2]!,
      context.route.segments[3]!,
      cleanups,
    );
    return () => {
      active = false;
      for (const cleanup of cleanups.splice(0)) cleanup();
    };
  }
  if (
    context.route.segments.length === 3 &&
    context.route.segments[0] === 'homebrew' &&
    context.route.segments[1] === 'delete'
  ) {
    await renderDeleteRoute(
      context,
      client,
      context.route.segments[2]!,
      cleanups,
    );
    return () => {
      active = false;
      for (const cleanup of cleanups.splice(0)) cleanup();
    };
  }
  if (context.route.path === HOMEBREW_ARCHIVE_ROUTE) {
    await renderArchiveRoute(context, client, cleanups);
    return () => {
      active = false;
      for (const cleanup of cleanups.splice(0)) cleanup();
    };
  }
  const draftUuid = context.route.segments.length === 3 &&
    context.route.segments[0] === 'homebrew' &&
    context.route.segments[1] === 'drafts'
    ? context.route.segments[2] as HomebrewDraftUuid
    : null;
  if (draftUuid !== null) {
    try {
      await renderDraftRoute(context, client, draftUuid, cleanups, options.parentClasses);
    } catch (error) {
      if (!draftNotFound(error)) throw error;
      context.router.navigate(homebrewMissingDraftPath(), { replace: true });
    }
    return () => {
      active = false;
      for (const dialog of dialogs.splice(0)) dialog.cleanup();
      for (const cleanup of cleanups.splice(0)) cleanup();
    };
  }

  const selected = selectedHomebrewTab(context.route.query.get('tab'));
  const selectedContentKind: AuthoredContentKind | null = selected === 'drafts'
    ? null
    : selected;
  const publishResult = selectedContentKind === null
    ? null
    : publishedRouteResult(context.route.query);
  const showMissingDraftNotice = selected === 'drafts' &&
    context.route.query.get('notice') === HOMEBREW_MISSING_DRAFT_NOTICE;
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
  const noticeMount = element('div', { className: 'homebrew-route-notice' });
  view.main.append(tabList(context, selected, cleanups), status, noticeMount, panel);

  const confirmDiscard = options.confirmDiscard ?? ((draft) =>
    window.confirm(`Discard ${draft.name || 'this untitled draft'}? This cannot be undone.`));
  const renderLibrary = (library: AuthoringLibrary): void => {
    if (!active) return;
    for (const cleanup of cardCleanups.splice(0)) cleanup();
    clear(panel);
    clear(noticeMount);
    let routeAnnouncement = 'Homebrew library loaded.';
    let routeHeading: HTMLElement | null = null;
    if (publishResult !== null && selectedContentKind !== null) {
      const notice = publishedResultNotice(
        context,
        cardCleanups,
        selectedContentKind,
        publishResult,
      );
      noticeMount.append(notice.root);
      routeAnnouncement = notice.announcement;
      routeHeading = notice.heading;
    } else if (showMissingDraftNotice) {
      const notice = missingDraftNotice(context, cardCleanups);
      noticeMount.append(notice.root);
      routeAnnouncement = notice.announcement;
      routeHeading = notice.heading;
    }
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
    status.textContent = routeAnnouncement;
    status.setAttribute('role', 'status');
    if (routeHeading !== null) {
      const heading = routeHeading;
      setTimeout(() => {
        if (heading.isConnected) heading.focus();
      }, 0);
    }
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
