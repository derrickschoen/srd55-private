import type { DraftRevision } from '../../authoring/contracts';
import type { HomebrewDraftUuid } from '../../authoring/ids';
import { RpcError } from '../../rpc/protocol';
import { element } from '../dom';
import { attachModalTrap, type ModalTrap } from '../modal-trap';

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
  readonly mount: HTMLElement;
  readonly restoreFocus: (action: DraftConflictAction) => void;
  readonly onLoadSaved: () => void | Promise<void>;
  readonly onKeepLocal: () => void | Promise<void>;
}

export type DraftConflictAction = 'keep-local' | 'load-saved';

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
  let completedAction: DraftConflictAction = 'keep-local';
  let latestOperation = Promise.resolve();
  const controls = [keep, load];
  let modal: ModalTrap;
  const finish = (
    action: DraftConflictAction,
    operation: () => void | Promise<void>,
  ): void => {
    if (dismissed || disposed) return;
    dismissed = true;
    completedAction = action;
    keep.disabled = true;
    load.disabled = true;
    latestOperation = Promise.resolve().then(operation).then(() => {
      if (disposed) return;
      modal.close();
    }).catch((error: unknown) => {
      dismissed = false;
      keep.disabled = false;
      load.disabled = false;
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
      keep.focus();
    });
  };
  const onKeep = (): void => finish('keep-local', options.onKeepLocal);
  const onLoad = (): void => finish('load-saved', options.onLoadSaved);
  const onCancel = (): void => finish('keep-local', options.onKeepLocal);
  keep.addEventListener('click', onKeep);
  load.addEventListener('click', onLoad);
  modal = attachModalTrap({
    dialog,
    mount: options.mount,
    focusable: () => controls,
    onDismiss: onCancel,
    restoreFocus: () => options.restoreFocus(completedAction),
  });

  return {
    element: dialog,
    whenSettled: () => latestOperation,
    cleanup: () => {
      disposed = true;
      keep.removeEventListener('click', onKeep);
      load.removeEventListener('click', onLoad);
      modal.cleanup();
    },
  };
}
