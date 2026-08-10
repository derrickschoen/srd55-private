import type { ArchivedHomebrewSet } from '../../../authoring/contracts';
import { element, type Cleanup } from '../../dom';
import { freeTextSpan } from '../../free-text';
import { attachModalTrap } from '../../modal-trap';

export interface PermanentPurgeDialogOptions {
  readonly mount: HTMLElement;
  readonly archivedSet: ArchivedHomebrewSet;
  readonly restoreFocus: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void | Promise<void>;
}

export interface PermanentPurgeDialog {
  readonly element: HTMLDialogElement;
  readonly whenSettled: () => Promise<void>;
  readonly cleanup: Cleanup;
}

function victimCharacters(archivedSet: ArchivedHomebrewSet): HTMLElement {
  if (archivedSet.purge_characters.length === 0) {
    return element('p', { text: 'No attached characters.' });
  }
  const list = element('ul');
  for (const character of archivedSet.purge_characters) {
    const item = element('li');
    item.append(freeTextSpan(character.character_name));
    list.append(item);
  }
  return list;
}

export function createPermanentPurgeDialog(
  options: PermanentPurgeDialogOptions,
): PermanentPurgeDialog {
  const dialog = document.createElement('dialog');
  dialog.className = 'homebrew-purge-modal';
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'homebrew-purge-heading');
  dialog.setAttribute('aria-describedby', 'homebrew-purge-explanation');
  dialog.dataset.testid = 'homebrew-purge-confirmation';

  const heading = element('h2', { attributes: { id: 'homebrew-purge-heading' } });
  heading.append('Permanently purge “', freeTextSpan(options.archivedSet.content_name), '”?');
  const explanation = element('p', {
    text: 'This cannot be undone. Confirm the exact content and characters that will be permanently deleted.',
    attributes: { id: 'homebrew-purge-explanation' },
  });
  const revisionCount = options.archivedSet.lineage_revision_count;
  const revisions = element('p', {
    text: `${String(revisionCount)} ${revisionCount === 1 ? 'revision' : 'revisions'} in this lineage`,
  });
  const characterCount = options.archivedSet.purge_characters.length;
  const cancel = element('button', {
    className: 'button-secondary',
    text: 'Cancel — keep everything',
    attributes: { type: 'button' },
  });
  const confirm = element('button', {
    className: 'button-danger',
    text: 'Permanently purge named victims',
    attributes: { type: 'button' },
  });
  const status = element('p', {
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  dialog.append(
    heading,
    explanation,
    element('h3', { text: 'Lineage revisions' }),
    revisions,
    element('h3', {
      text: `Attached characters (${String(characterCount)})`,
    }),
    victimCharacters(options.archivedSet),
    status,
    element('div', { className: 'homebrew-purge-actions' }, [cancel, confirm]),
  );

  let disposed = false;
  let busy = false;
  let latestOperation = Promise.resolve();
  const closeAsCancel = (): void => {
    if (disposed || busy) return;
    options.onCancel();
    modal.close();
  };
  const onConfirm = (): void => {
    if (disposed || busy) return;
    busy = true;
    cancel.disabled = true;
    confirm.disabled = true;
    status.textContent = 'Permanently purging the named victims…';
    latestOperation = Promise.resolve().then(options.onConfirm).then(() => {
      if (!disposed) modal.close();
    }).catch((error: unknown) => {
      busy = false;
      cancel.disabled = false;
      confirm.disabled = false;
      status.textContent = error instanceof Error ? error.message : String(error);
      status.setAttribute('role', 'alert');
      cancel.focus();
    });
  };
  cancel.addEventListener('click', closeAsCancel);
  confirm.addEventListener('click', onConfirm);
  const modal = attachModalTrap({
    dialog,
    mount: options.mount,
    focusable: () => [cancel, confirm],
    onDismiss: closeAsCancel,
    restoreFocus: options.restoreFocus,
  });

  return {
    element: dialog,
    whenSettled: () => latestOperation,
    cleanup: () => {
      if (disposed) return;
      disposed = true;
      cancel.removeEventListener('click', closeAsCancel);
      confirm.removeEventListener('click', onConfirm);
      modal.cleanup();
    },
  };
}
