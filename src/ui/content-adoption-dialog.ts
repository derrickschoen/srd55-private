import type {
  ContentImportChoices,
  ContentImportCommitResult,
  ContentImportPlan,
  ContentImportReviewRow,
} from '../catalog/content-adoption';
import { clear, element, listen, type Cleanup } from './dom';

export interface ContentAdoptionDialogOptions {
  readonly plan: ContentImportPlan;
  readonly replan: (
    choices: ContentImportChoices,
  ) => Promise<ContentImportPlan>;
  readonly commit: (
    plan: ContentImportPlan,
    choices: ContentImportChoices,
  ) => Promise<ContentImportCommitResult>;
  readonly onCommitted: (
    result: Extract<ContentImportCommitResult, { readonly kind: 'committed' }>,
  ) => void | Promise<void>;
  readonly onCancel?: () => void;
}

export interface ContentAdoptionDialog {
  readonly element: HTMLDialogElement;
  readonly cleanup: Cleanup;
}

function reasonLabel(reason: ContentImportReviewRow['matchClass']): string {
  switch (reason) {
    case 'alias': return 'Alias';
    case 'compatible-fingerprint': return 'Compatible fingerprint';
    case 'srd-fallback': return 'SRD fingerprint fallback';
    case 'metadata-conflict': return 'Metadata conflict';
    case 'key-collision': return 'Asserted key collision';
  }
}

function openModal(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
    return;
  }
  dialog.setAttribute('open', '');
}

/**
 * The common D82 review surface. Replanning is mandatory after every choice:
 * it disables commit, simulates the whole dependency graph, and only enables
 * commit for the token returned by that simulation.
 */
export function createContentAdoptionDialog(
  options: ContentAdoptionDialogOptions,
): ContentAdoptionDialog {
  const dialog = document.createElement('dialog');
  dialog.className = 'content-adoption-modal';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'content-adoption-heading');
  dialog.setAttribute('aria-describedby', 'content-adoption-explanation');
  dialog.dataset.testid = 'content-adoption-modal';

  const rows = new Map(options.plan.reviews.map((row) => [row.id, row]));
  const choices: Record<string, { decision: 'match' | 'clone'; cloneName?: string }> = {};
  for (const row of options.plan.reviews) {
    choices[row.id] = { decision: 'match', cloneName: row.cloneName };
  }
  let plan = options.plan;
  let generation = 0;
  let disposed = false;
  const cleanups: Cleanup[] = [];

  const heading = element('h2', {
    text: 'Review matching catalog content',
    attributes: { id: 'content-adoption-heading' },
  });
  const explanation = element('p', {
    text: 'Choose whether each incoming entry should use the matching local content or become a renamed private copy.',
    attributes: { id: 'content-adoption-explanation' },
  });
  const status = element('p', {
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const list = element('div', { className: 'content-adoption-list' });
  const cancel = element('button', {
    text: 'Cancel',
    attributes: { type: 'button' },
  });
  const commit = element('button', {
    text: 'Import with these choices',
    attributes: { type: 'button' },
  });
  const actions = element('div', { className: 'content-adoption-actions' }, [
    cancel,
    commit,
  ]);
  dialog.append(heading, explanation, status, list, actions);

  const currentChoices = (): ContentImportChoices => Object.freeze(
    Object.fromEntries(Object.entries(choices).map(([id, choice]) => [
      id,
      Object.freeze({ ...choice }),
    ])),
  );

  async function refresh(): Promise<void> {
    const requested = ++generation;
    commit.disabled = true;
    status.textContent = 'Refreshing dependent matches…';
    try {
      const refreshed = await options.replan(currentChoices());
      if (disposed || requested !== generation) return;
      plan = refreshed;
      rows.clear();
      for (const row of refreshed.reviews) rows.set(row.id, row);
      status.textContent = refreshed.outcomes.some((outcome) => outcome.kind === 'refused')
        ? 'One or more choices still need attention.'
        : 'Choices checked against the current catalog.';
      renderRows();
      commit.disabled = refreshed.outcomes.some((outcome) =>
        outcome.kind === 'refused' || outcome.kind === 'review' && choices[outcome.id] === undefined,
      );
    } catch (error) {
      if (disposed || requested !== generation) return;
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
    }
  }

  function renderRows(): void {
    clear(list);
    for (const row of rows.values()) {
      const selected = choices[row.id] ?? {
        decision: 'match' as const,
        cloneName: row.cloneName,
      };
      choices[row.id] = selected;
      const fieldset = element('fieldset', {
        className: 'content-adoption-row',
        attributes: { 'data-content-id': row.id },
      });
      fieldset.append(element('legend', {
        text: `${row.kind}: ${row.incomingName}`,
      }));
      fieldset.append(element('p', {
        text: `${reasonLabel(row.matchClass)} — local: ${row.localName}`,
      }));
      for (const conflict of row.conflictDetails) {
        fieldset.append(element('p', {
          text: `${conflict.field} — incoming: ${conflict.incomingValue}; local: ${conflict.localValue}`,
        }));
      }
      if (row.dependencies.length > 0) {
        fieldset.append(element('p', {
          text: `Depends on: ${row.dependencies.join(', ')}`,
        }));
      }
      const matchId = `content-adoption-${row.id}-match`;
      const cloneId = `content-adoption-${row.id}-clone`;
      const cloneNameId = `content-adoption-${row.id}-clone-name`;
      const match = element('input', {
        attributes: {
          id: matchId,
          type: 'radio',
          name: `content-adoption-${row.id}`,
          value: 'match',
          ...(selected.decision === 'match' ? { checked: '' } : {}),
        },
      });
      const clone = element('input', {
        attributes: {
          id: cloneId,
          type: 'radio',
          name: `content-adoption-${row.id}`,
          value: 'clone',
          ...(selected.decision === 'clone' ? { checked: '' } : {}),
        },
      });
      const cloneName = element('input', {
        attributes: {
          id: cloneNameId,
          type: 'text',
          value: selected.cloneName ?? row.cloneName,
          ...(selected.decision === 'match' ? { disabled: '' } : {}),
        },
      });
      fieldset.append(
        match,
        element('label', { text: 'Match', attributes: { for: matchId } }),
        clone,
        element('label', { text: 'Clone instead', attributes: { for: cloneId } }),
        element('label', { text: 'Private copy name', attributes: { for: cloneNameId } }),
        cloneName,
      );
      match.addEventListener('change', () => {
        choices[row.id] = { decision: 'match', cloneName: cloneName.value };
        void refresh();
      });
      clone.addEventListener('change', () => {
        choices[row.id] = { decision: 'clone', cloneName: cloneName.value };
        void refresh();
      });
      cloneName.addEventListener('change', () => {
        choices[row.id] = { decision: 'clone', cloneName: cloneName.value };
        void refresh();
      });
      list.append(fieldset);
    }
  }

  cleanups.push(listen(cancel, 'click', () => {
    dialog.close?.();
    options.onCancel?.();
  }));
  cleanups.push(listen(commit, 'click', () => {
    if (commit.disabled) return;
    commit.disabled = true;
    status.textContent = 'Committing import…';
    void options.commit(plan, currentChoices()).then(async (result) => {
      if (disposed) return;
      if (result.kind === 'stale-plan') {
        plan = result.freshPlan;
        rows.clear();
        for (const row of result.freshPlan.reviews) rows.set(row.id, row);
        status.textContent = 'The catalog changed. Review the refreshed plan before committing.';
        renderRows();
        commit.disabled = result.freshPlan.outcomes.some((outcome) =>
          outcome.kind === 'refused',
        );
        return;
      }
      if (result.kind === 'refused') {
        status.textContent = 'The import was refused; no changes were committed.';
        status.setAttribute('role', 'alert');
        return;
      }
      await options.onCommitted(result);
      dialog.close?.();
    });
  }));

  renderRows();
  openModal(dialog);
  return {
    element: dialog,
    cleanup: () => {
      disposed = true;
      generation += 1;
      for (const cleanup of cleanups.splice(0)) cleanup();
      dialog.close?.();
    },
  };
}
