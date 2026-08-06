export interface ModalTrapOptions {
  readonly dialog: HTMLDialogElement;
  readonly mount: HTMLElement;
  readonly focusable: () => readonly HTMLElement[];
  readonly onDismiss: () => void;
  readonly restoreFocus?: () => void;
}

export interface ModalTrap {
  readonly close: () => void;
  readonly cleanup: () => void;
}

function enabledControls(options: ModalTrapOptions): readonly HTMLElement[] {
  return options.focusable().filter((control) =>
    control.isConnected && !control.hidden && Reflect.get(control, 'disabled') !== true,
  );
}

/**
 * The one D108 modal discipline: attach before opening, inventory the current
 * enabled controls, loop both Tab directions, route Escape/native cancel
 * through one dismissal action, and restore focus after close.
 */
export function attachModalTrap(options: ModalTrapOptions): ModalTrap {
  const restoreTarget = document.activeElement as HTMLElement | null;
  let closed = false;
  let disposed = false;

  const restoreFocus = options.restoreFocus ?? (() => restoreTarget?.focus());
  const close = (): void => {
    if (closed) return;
    closed = true;
    options.dialog.close?.();
    options.dialog.remove();
    restoreFocus();
  };
  const onCancel = (event: Event): void => {
    event.preventDefault();
    if (!closed && !disposed) options.onDismiss();
  };
  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      onCancel(event);
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = enabledControls(options);
    const current = controls.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && current <= 0) {
      event.preventDefault();
      controls.at(-1)?.focus();
    } else if (!event.shiftKey && (current < 0 || current >= controls.length - 1)) {
      event.preventDefault();
      controls[0]?.focus();
    }
  };

  options.dialog.addEventListener('cancel', onCancel);
  options.dialog.addEventListener('keydown', onKeydown);
  options.mount.append(options.dialog);
  if (typeof options.dialog.showModal === 'function') {
    if (!options.dialog.open) options.dialog.showModal();
  } else {
    options.dialog.setAttribute('open', '');
  }
  enabledControls(options)[0]?.focus();

  return {
    close,
    cleanup: () => {
      if (disposed) return;
      disposed = true;
      options.dialog.removeEventListener('cancel', onCancel);
      options.dialog.removeEventListener('keydown', onKeydown);
      if (!closed) {
        closed = true;
        options.dialog.close?.();
        options.dialog.remove();
      }
    },
  };
}
