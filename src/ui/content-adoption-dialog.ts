import type {
  ContentImportChoices,
  ContentImportCommitResult,
  ContentImportPlan,
  ContentImportReviewRow,
} from '../catalog/content-adoption';
import {
  contentKinds,
  normalizeContentIdentityName,
  type ContentKind,
} from '../catalog/content-identity';
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
  /** Resolves after the latest user-triggered replan or commit settles. */
  readonly whenSettled: () => Promise<void>;
  readonly cleanup: Cleanup;
}

function sameIdentityName(review: ContentImportReviewRow): boolean {
  return normalizeContentIdentityName(review.incomingName) ===
    normalizeContentIdentityName(review.localName);
}

function reasonLabel(review: ContentImportReviewRow): string {
  if (review.incomingFingerprint === null) {
    return 'Reference supplied no rules evidence';
  }
  switch (review.matchClass) {
    case 'alias': return 'Alias';
    case 'compatible-fingerprint': return 'Compatible fingerprint';
    case 'srd-fallback': return 'SRD fingerprint fallback';
    case 'metadata-conflict': return 'Metadata conflict';
    case 'key-collision':
      return sameIdentityName(review)
        ? 'Same name, distinct rules content'
        : 'Alias points to distinct rules content';
  }
}

interface PreviewKindCounts {
  readonly newCount: number;
  readonly matchedCount: number;
  readonly reviewCount: number;
  readonly refusedCount: number;
}

interface PortablePreviewShape {
  readonly new_by_kind: Readonly<Record<ContentKind, number>>;
  readonly matched_by_kind: Readonly<Record<ContentKind, number>>;
  readonly review_required_by_kind: Readonly<Record<ContentKind, number>>;
  readonly refused_by_kind: Readonly<Record<ContentKind, number>>;
}

function portablePreview(plan: ContentImportPlan): PortablePreviewShape | null {
  if (!('preview' in plan)) return null;
  const preview = plan.preview;
  if (preview === null || typeof preview !== 'object') return null;
  return preview as PortablePreviewShape;
}

function emptyPreviewCounts(): Record<ContentKind, PreviewKindCounts> {
  return Object.fromEntries(contentKinds.map((kind) => [kind, {
    newCount: 0,
    matchedCount: 0,
    reviewCount: 0,
    refusedCount: 0,
  }])) as Record<ContentKind, PreviewKindCounts>;
}

function planKind(id: string, plan: ContentImportPlan): ContentKind | null {
  const reviewed = plan.reviews.find((review) => review.id === id)?.kind;
  if (reviewed !== undefined) return reviewed;
  return contentKinds.find((kind) =>
    id.startsWith(`portable:${kind}:`) || id.startsWith(`${kind}:`),
  ) ?? null;
}

function previewCounts(plan: ContentImportPlan): Readonly<Record<ContentKind, PreviewKindCounts>> {
  const portable = portablePreview(plan);
  if (portable !== null) {
    return Object.fromEntries(contentKinds.map((kind) => [kind, {
      newCount: portable.new_by_kind[kind],
      matchedCount: portable.matched_by_kind[kind],
      reviewCount: portable.review_required_by_kind[kind],
      refusedCount: portable.refused_by_kind[kind],
    }])) as Readonly<Record<ContentKind, PreviewKindCounts>>;
  }
  const counts = emptyPreviewCounts();
  for (const outcome of plan.outcomes) {
    const kind = planKind(outcome.id, plan);
    if (kind === null) continue;
    const current = counts[kind];
    switch (outcome.kind) {
      case 'create':
        counts[kind] = { ...current, newCount: current.newCount + 1 };
        break;
      case 'match':
      case 'remembered-match':
      case 'remembered-clone':
        counts[kind] = { ...current, matchedCount: current.matchedCount + 1 };
        break;
      case 'review':
        counts[kind] = { ...current, reviewCount: current.reviewCount + 1 };
        break;
      case 'refused':
        counts[kind] = { ...current, refusedCount: current.refusedCount + 1 };
        break;
    }
  }
  return counts;
}

function createPreview(plan: ContentImportPlan): HTMLElement {
  const counts = previewCounts(plan);
  const nonEmpty = contentKinds.filter((kind) => {
    const count = counts[kind];
    return count.newCount + count.matchedCount + count.reviewCount +
      count.refusedCount > 0;
  });
  const list = element('ul');
  for (const kind of nonEmpty) {
    const count = counts[kind];
    list.append(element('li', {
      text: `${kind}: ${String(count.newCount)} new, ` +
        `${String(count.matchedCount)} matched, ` +
        `${String(count.reviewCount)} needs review, ` +
        `${String(count.refusedCount)} refused`,
    }));
  }
  if (nonEmpty.length === 0) {
    list.append(element('li', { text: 'No catalog content changes.' }));
  }
  const conflicts = plan.reviews.filter((review) =>
    review.matchClass === 'key-collision' ||
    review.matchClass === 'metadata-conflict' ||
    review.conflictDetails.length > 0,
  );
  return element('section', {
    className: 'content-import-preview',
    attributes: { 'aria-label': 'Import preview' },
  }, [
    element('h3', { text: 'Import preview' }),
    list,
    ...(conflicts.length === 0
      ? []
      : [element('p', {
          text: `${String(conflicts.length)} conflict${conflicts.length === 1 ? '' : 's'} ` +
            'must be reviewed below.',
        })]),
  ]);
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
  let latestOperation: Promise<void> = Promise.resolve();
  const cleanups: Cleanup[] = [];

  const heading = element('h2', {
    text: 'Review content import',
    attributes: { id: 'content-adoption-heading' },
  });
  const explanation = element('p', {
    text: options.plan.reviews.length === 0
      ? 'Check the content counts before importing.'
      : 'Choose whether each incoming entry should use the matching local content or become a renamed private copy.',
    attributes: { id: 'content-adoption-explanation' },
  });
  const preview = createPreview(options.plan);
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
  commit.disabled = options.plan.outcomes.some(
    (outcome) => outcome.kind === 'refused',
  );
  const actions = element('div', { className: 'content-adoption-actions' }, [
    cancel,
    commit,
  ]);
  dialog.append(heading, explanation, preview, status, list, actions);

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
      const refreshedPreview = createPreview(refreshed);
      preview.replaceChildren(...Array.from(refreshedPreview.children));
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
        text: `Match reason: ${reasonLabel(row)} — local: ${row.localName}`,
      }));
      if (row.incomingFingerprint === null) {
        fieldset.append(element('p', {
          text: 'The share supplied only a reference, not incoming rules. Confirm that your local content should stand in for it, or keep a renamed private copy.',
        }));
      } else if (row.matchClass === 'key-collision') {
        fieldset.append(element('p', {
          text: sameIdentityName(row)
            ? 'The normalized name is already in use for different rules. Rename the private copy to keep both.'
            : 'The incoming alias points to differently named local content with different rules. Match them only if they are meant to be the same; otherwise keep a renamed private copy.',
        }));
      }
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
        latestOperation = refresh();
      });
      clone.addEventListener('change', () => {
        choices[row.id] = { decision: 'clone', cloneName: cloneName.value };
        latestOperation = refresh();
      });
      cloneName.addEventListener('change', () => {
        choices[row.id] = { decision: 'clone', cloneName: cloneName.value };
        latestOperation = refresh();
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
    latestOperation = options.commit(plan, currentChoices()).then(async (result) => {
      if (disposed) return;
      if (result.kind === 'stale-plan') {
        plan = result.freshPlan;
        const refreshedPreview = createPreview(result.freshPlan);
        preview.replaceChildren(...Array.from(refreshedPreview.children));
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
    whenSettled: () => latestOperation,
    cleanup: () => {
      disposed = true;
      generation += 1;
      for (const cleanup of cleanups.splice(0)) cleanup();
      dialog.close?.();
    },
  };
}
