import type { DraftRevision } from '../../authoring/contracts';
import type { HomebrewDraftUuid } from '../../authoring/ids';
import { RpcError } from '../../rpc/protocol';
import { element } from '../dom';

export interface DraftRevisionConflict {
  readonly draft_uuid: HomebrewDraftUuid;
  readonly expected_revision: DraftRevision;
  readonly actual_revision: DraftRevision;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null
    ? value as Readonly<Record<string, unknown>>
    : null;
}

export function draftRevisionConflict(error: unknown): DraftRevisionConflict | null {
  if (!(error instanceof RpcError)) return null;
  const data = record(error.data);
  if (data?.reason !== 'stale_draft_revision') return null;
  if (
    typeof data.draft_uuid !== 'string' ||
    !Number.isSafeInteger(data.expected_revision) ||
    !Number.isSafeInteger(data.actual_revision)
  ) {
    return null;
  }
  return {
    draft_uuid: data.draft_uuid as HomebrewDraftUuid,
    expected_revision: Number(data.expected_revision) as DraftRevision,
    actual_revision: Number(data.actual_revision) as DraftRevision,
  };
}

export interface DraftConflictDialogOptions {
  readonly conflict: DraftRevisionConflict;
  readonly restoreFocus: () => void;
  readonly onLoadSaved: () => void | Promise<void>;
  readonly onKeepLocal: () => void | Promise<void>;
}

export interface DraftConflictDialog {
  readonly element: HTMLDialogElement;
  readonly whenSettled: () => Promise<void>;
  readonly cleanup: () => void;
}

/**
 * Stale saves never gain a force-overwrite door. The author either reloads the
 * saved revision or keeps this tab's edits locally while comparing manually.
 */
export function createDraftConflictDialog(
  options: DraftConflictDialogOptions,
): DraftConflictDialog {
  const dialog = document.createElement('dialog');
  dialog.className = 'authoring-conflict-modal';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'authoring-conflict-heading');
  dialog.setAttribute('aria-describedby', 'authoring-conflict-explanation');
  dialog.dataset.testid = 'authoring-draft-conflict';

  const heading = element('h2', {
    text: 'This draft changed in another tab',
    attributes: { id: 'authoring-conflict-heading' },
  });
  const explanation = element('p', {
    text: `This tab opened revision ${String(options.conflict.expected_revision)}, but revision ${String(options.conflict.actual_revision)} is now saved. Nothing was overwritten.`,
    attributes: { id: 'authoring-conflict-explanation' },
  });
  const status = element('p', {
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const keep = element('button', {
    text: 'Keep my unsaved changes',
    attributes: { type: 'button' },
  });
  const load = element('button', {
    text: 'Load saved revision',
    attributes: { type: 'button' },
  });
  dialog.append(
    heading,
    explanation,
    status,
    element('div', { className: 'authoring-conflict-actions' }, [keep, load]),
  );

  let disposed = false;
  let dismissed = false;
  let latestOperation = Promise.resolve();
  const controls = [keep, load];
  const finish = (operation: () => void | Promise<void>): void => {
    if (dismissed || disposed) return;
    dismissed = true;
    keep.disabled = true;
    load.disabled = true;
    latestOperation = Promise.resolve().then(operation).then(() => {
      if (disposed) return;
      dialog.close?.();
      options.restoreFocus();
    }).catch((error: unknown) => {
      dismissed = false;
      keep.disabled = false;
      load.disabled = false;
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
      keep.focus();
    });
  };
  const onKeep = (): void => finish(options.onKeepLocal);
  const onLoad = (): void => finish(options.onLoadSaved);
  const onCancel = (event: Event): void => {
    event.preventDefault();
    finish(options.onKeepLocal);
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(options.onKeepLocal);
      return;
    }
    if (event.key !== 'Tab') return;
    const active = document.activeElement;
    if (event.shiftKey && (active === keep || !controls.includes(active as HTMLButtonElement))) {
      event.preventDefault();
      load.focus();
    } else if (!event.shiftKey && (active === load || !controls.includes(active as HTMLButtonElement))) {
      event.preventDefault();
      keep.focus();
    }
  };
  keep.addEventListener('click', onKeep);
  load.addEventListener('click', onLoad);
  dialog.addEventListener('cancel', onCancel);
  dialog.addEventListener('keydown', onKeydown);
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  keep.focus();

  return {
    element: dialog,
    whenSettled: () => latestOperation,
    cleanup: () => {
      disposed = true;
      keep.removeEventListener('click', onKeep);
      load.removeEventListener('click', onLoad);
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('keydown', onKeydown);
      dialog.close?.();
    },
  };
}
