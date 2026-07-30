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
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 1,
    },
    {
      id: 20,
      name: 'Cloak',
      description: null,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 2,
    },
    {
      id: 30,
      name: 'Ring',
      description: null,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 3,
    },
    {
      id: 40,
      name: 'Boots',
      description: null,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: null,
    },
  ],
};

describe('the item attunement surface', () => {
  it('renders all three structural slots and dispatches the ordinary controls', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const actions: PlannerItemActions = {
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
        }),
      );

      expect(elementText(rendered as unknown as Node)).toContain('Slot 1');
      expect(elementText(rendered as unknown as Node)).toContain('Slot 2');
      expect(elementText(rendered as unknown as Node)).toContain('Slot 3');
      rendered.querySelector('[aria-label="Unattune Crown"]')?.click();
      rendered.querySelector('[aria-label="Attune Boots"]')?.click();
      expect(calls).toEqual(['unattune:10', 'attune:40']);
    } finally {
      restoreDocument();
    }
  });

  it('opens a three-choice replacement dialog and can replace or cancel', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const actions: PlannerItemActions = {
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
        }),
      );
      const dialog = rendered.children.at(-1);
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
});
