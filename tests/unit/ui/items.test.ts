import { describe, expect, it } from 'vitest';
import type { ItemsPanel } from '../../../src/domain/read-models';
import {
  renderItems,
  type PlannerItemActions,
} from '../../../src/ui/screens/planner/items';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

const panel: ItemsPanel = {
  items: [
    {
      id: 10,
      name: 'Crown',
      description: null,
      quantity: 1,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 1,
      effects: [],
    },
    {
      id: 20,
      name: 'Cloak',
      description: null,
      quantity: 2,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 2,
      effects: [],
    },
    {
      id: 30,
      name: 'Ring',
      description: null,
      quantity: 3,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 3,
      effects: [],
    },
    {
      id: 40,
      name: 'Boots',
      description: null,
      quantity: 4,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: null,
      effects: [],
    },
  ],
};

describe('the item attunement surface', () => {
  it('renders all three structural slots and dispatches the ordinary controls', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const actions: PlannerItemActions = {
        addItem: () => undefined,
        updateItem: () => undefined,
        removeItem: () => undefined,
        updateQuantity: (itemId, quantity) =>
          calls.push(`quantity:${String(itemId)}:${String(quantity)}`),
        attune: (itemId) => calls.push(`attune:${String(itemId)}`),
        unattune: (itemId) => calls.push(`unattune:${String(itemId)}`),
        replace: () => undefined,
        cancelReplacement: () => undefined,
      };
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: null,
          actions,
          disabled: false,
          editing: null,
          onEditingChanged: () => undefined,
        }),
      );

      expect(elementText(rendered as unknown as Node)).toContain('Slot 1');
      expect(elementText(rendered as unknown as Node)).toContain('Slot 2');
      expect(elementText(rendered as unknown as Node)).toContain('Slot 3');
      rendered.querySelector('[aria-label="Unattune Crown"]')?.click();
      rendered.querySelector('[aria-label="Attune Boots"]')?.click();
      const quantity = rendered.querySelector('[aria-label="Quantity for Cloak"]');
      if (quantity === null) {
        throw new Error('Quantity control did not render.');
      }
      quantity.value = '6';
      quantity.dispatchEvent(new Event('change'));
      expect(calls).toEqual([
        'unattune:10',
        'attune:40',
        'quantity:20:6',
      ]);
    } finally {
      restoreDocument();
    }
  });

  it('opens a three-choice replacement dialog and can replace or cancel', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const actions: PlannerItemActions = {
        addItem: () => undefined,
        updateItem: () => undefined,
        removeItem: () => undefined,
        updateQuantity: () => undefined,
        attune: () => undefined,
        unattune: () => undefined,
        replace: (itemId, replacedItemId) =>
          calls.push(`replace:${String(itemId)}:${String(replacedItemId)}`),
        cancelReplacement: () => calls.push('cancel'),
      };
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: {
            item_id: 40,
            occupants: [
              { slot: 1, item_id: 10, name: 'Crown' },
              { slot: 2, item_id: 20, name: 'Cloak' },
              { slot: 3, item_id: 30, name: 'Ring' },
            ],
          },
          actions,
          disabled: false,
          editing: null,
          onEditingChanged: () => undefined,
        }),
      );
      // The add-item button follows the modal in the rendered section.
      const dialog = rendered.children.at(-2);
      const choices = dialog?.children[2];

      expect(dialog?.getAttribute('data-testid')).toBe(
        'attunement-replace-modal',
      );
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(choices?.children).toHaveLength(3);
      choices?.children[1]?.click();
      expect(calls[0]).toBe('replace:40:20');

      dialog?.children.at(-1)?.click();
      expect(calls).toEqual(['replace:40:20', 'cancel']);
    } finally {
      restoreDocument();
    }
  });

  it('offers ability_override with ability and set-to fields in the item editor', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const actions: PlannerItemActions = {
        addItem: () => undefined,
        updateItem: () => undefined,
        removeItem: () => undefined,
        updateQuantity: () => undefined,
        attune: () => undefined,
        unattune: () => undefined,
        replace: () => undefined,
        cancelReplacement: () => undefined,
      };
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: null,
          actions,
          disabled: false,
          editing: 'new',
          onEditingChanged: () => undefined,
        }),
      );

      expect(elementText(rendered as unknown as Node)).toContain(
        'Ability score override',
      );
      expect(elementText(rendered as unknown as Node)).toContain('Effect kind');
      expect(rendered.querySelectorAll('select')[0]?.children[0]?.value).toBe(
        'ability_override',
      );
    } finally {
      restoreDocument();
    }
  });

  it('recovers the add affordance when the item under an edit form vanishes', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: null,
          actions: {
            addItem: () => undefined,
            updateItem: () => undefined,
            removeItem: () => undefined,
            updateQuantity: () => undefined,
            attune: () => undefined,
            unattune: () => undefined,
            replace: () => undefined,
            cancelReplacement: () => undefined,
          },
          disabled: false,
          editing: 99,
          onEditingChanged: () => undefined,
        }),
      );

      expect(
        rendered
          .querySelectorAll('button')
          .some((button) => button.textContent === 'Add item'),
      ).toBe(true);
      expect(rendered.querySelector('[data-testid="item-form"]')).toBeNull();
    } finally {
      restoreDocument();
    }
  });
});
