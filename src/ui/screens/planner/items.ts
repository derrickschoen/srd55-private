import type {
  AttunementOccupant,
} from '../../../domain/attunement';
import type { ItemsPanel } from '../../../domain/read-models';
import { freeTextSpan } from '../../free-text';

export interface AttunementReplacement {
  readonly item_id: number;
  readonly occupants: readonly AttunementOccupant[];
}

export interface PlannerItemActions {
  updateQuantity(itemId: number, quantity: number): void;
  attune(itemId: number): void;
  unattune(itemId: number): void;
  replace(itemId: number, replacedItemId: number): void;
  cancelReplacement(): void;
}

interface ItemsPanelOptions {
  readonly panel: ItemsPanel;
  readonly replacement: AttunementReplacement | null;
  readonly actions: PlannerItemActions;
  readonly disabled: boolean;
}

function replacementModal(options: ItemsPanelOptions): HTMLDialogElement | null {
  const replacement = options.replacement;
  if (replacement === null) {
    return null;
  }
  const incoming = options.panel.items.find(
    (item) => item.id === replacement.item_id,
  );
  if (incoming === undefined) {
    return null;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'attunement-replace-modal';
  dialog.open = true;
  dialog.setAttribute('aria-modal', 'true');
  dialog.dataset.testid = 'attunement-replace-modal';
  const heading = document.createElement('h3');
  heading.textContent = 'Replace an attuned item';
  const explanation = document.createElement('p');
  explanation.append(
    'All three attunement slots are full. Choose which item ',
    freeTextSpan(incoming.name),
    ' replaces, or cancel.',
  );
  const choices = document.createElement('div');
  choices.className = 'attunement-replace-choices';
  for (const occupant of replacement.occupants) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button-secondary';
    button.disabled = options.disabled;
    button.dataset.attunementSlot = String(occupant.slot);
    button.setAttribute(
      'aria-label',
      `Replace ${occupant.name} with ${incoming.name}`,
    );
    button.append(`Slot ${String(occupant.slot)} — `, freeTextSpan(occupant.name));
    button.addEventListener('click', () =>
      options.actions.replace(incoming.id, occupant.item_id),
    );
    choices.append(button);
  }
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  cancel.disabled = options.disabled;
  cancel.addEventListener('click', options.actions.cancelReplacement);
  dialog.append(heading, explanation, choices, cancel);
  return dialog;
}

export function renderItems(options: ItemsPanelOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel';
  section.dataset.testid = 'items-panel';
  const heading = document.createElement('h2');
  heading.textContent = 'Items and attunement';
  const rule = document.createElement('p');
  rule.textContent =
    'A character has exactly three attunement slots. Attuning a fourth item asks which current item to replace.';
  section.append(heading, rule);

  if (options.panel.items.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No possessions are recorded.';
    section.append(empty);
  } else {
    const table = document.createElement('table');
    table.className = 'item-table';
    const caption = document.createElement('caption');
    caption.textContent = 'Possessions';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Item', 'Quantity', 'Attunement', 'Action']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      headRow.append(cell);
    }
    head.append(headRow);
    const body = document.createElement('tbody');
    for (const item of options.panel.items) {
      const row = document.createElement('tr');
      row.dataset.itemId = String(item.id);
      const name = document.createElement('th');
      name.scope = 'row';
      name.append(freeTextSpan(item.name));
      const quantity = document.createElement('td');
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.value = String(item.quantity);
      quantityInput.disabled = options.disabled;
      quantityInput.setAttribute('aria-label', `Quantity for ${item.name}`);
      quantityInput.addEventListener('change', () => {
        const next = Number(quantityInput.value);
        if (Number.isSafeInteger(next) && next >= 1 && next !== item.quantity) {
          options.actions.updateQuantity(item.id, next);
        } else {
          quantityInput.value = String(item.quantity);
        }
      });
      quantity.append(quantityInput);
      const state = document.createElement('td');
      state.textContent =
        item.attunement_slot === null
          ? item.requires_attunement
            ? 'Not attuned'
            : 'Not required'
          : `Slot ${String(item.attunement_slot)}`;
      const action = document.createElement('td');
      if (item.attunement_slot !== null) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button-secondary';
        button.textContent = 'Unattune';
        button.disabled = options.disabled;
        button.setAttribute('aria-label', `Unattune ${item.name}`);
        button.addEventListener('click', () =>
          options.actions.unattune(item.id),
        );
        action.append(button);
      } else if (item.requires_attunement) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button-secondary';
        button.textContent = 'Attune';
        button.disabled = options.disabled;
        button.setAttribute('aria-label', `Attune ${item.name}`);
        button.addEventListener('click', () => options.actions.attune(item.id));
        action.append(button);
      }
      row.append(name, quantity, state, action);
      body.append(row);
    }
    table.append(caption, head, body);
    section.append(table);
  }

  const modal = replacementModal(options);
  if (modal !== null) {
    section.append(modal);
  }
  return section;
}
