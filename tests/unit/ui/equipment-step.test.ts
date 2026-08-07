import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EQUIPMENT_STEP_ATTR,
  EQUIPMENT_STEP_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedApplyEquipmentParams,
  type GuidedEquipmentStepState,
} from '../../../src/builder/contracts';
import { RpcError } from '../../../src/rpc/protocol';
import {
  applyEquipmentRefusalMessage,
  createEquipmentStep,
} from '../../../src/ui/screens/guided-builder/equipment-step';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

/**
 * THE EQUIPMENT STEP'S DOM (E-B): the one-option confirmation, the
 * Fighter-only two-option choice, coin-free contents, the recorded state,
 * the D65 not-itemised disclosure and the completion notice — every locator
 * from the seam's `EQUIPMENT_STEP_ATTR`, never a second invented set.
 */
let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  vi.restoreAllMocks();
});

function selector(attribute: string, value?: string): string {
  return value === undefined
    ? `[${attribute}]`
    : `[${attribute}="${value}"]`;
}

/**
 * The common case in miniature (§0c): a Wizard with an Acolyte background —
 * ONE offerable option per source, so the step is a confirmation. The
 * contents arrive display-filtered, exactly as the read model sends them.
 */
function wizardAcolyteState(): GuidedEquipmentStepState {
  return {
    character_id: 7,
    class_package: {
      content_key: '2024:class:wizard',
      source_name: 'Wizard',
      catalog_layer: 'bundled',
      offered: [
        {
          option: 'a',
          contents: [
            { item_name: 'Quarterstaff', quantity: 1, item_kind: 'weapon' },
            { item_name: 'Dagger', quantity: 2, item_kind: 'weapon' },
            { item_name: "Scholar's Pack", quantity: 1, item_kind: 'gear' },
          ],
        },
      ],
      chosen_option: null,
    },
    background_package: {
      content_key: '2024:background:acolyte',
      source_name: 'Acolyte',
      catalog_layer: 'bundled',
      offered: [
        {
          option: 'a',
          contents: [
            { item_name: 'Holy Symbol', quantity: 1, item_kind: 'gear' },
            { item_name: 'Parchment', quantity: 10, item_kind: 'gear' },
          ],
        },
      ],
      chosen_option: null,
    },
    complete: false,
  };
}

/** Fighter, the ONLY class where the step is a real choice (§0c). */
function fighterClassPackage(): GuidedEquipmentStepState['class_package'] {
  return {
    content_key: '2024:class:fighter',
    source_name: 'Fighter',
    catalog_layer: 'bundled',
    offered: [
      {
        option: 'a',
        contents: [
          { item_name: 'Chain Mail', quantity: 1, item_kind: 'armor' },
          { item_name: 'Greatsword', quantity: 1, item_kind: 'weapon' },
          { item_name: "Dungeoneer's Pack", quantity: 1, item_kind: 'gear' },
        ],
      },
      {
        option: 'b',
        contents: [
          { item_name: 'Studded Leather Armor', quantity: 1, item_kind: 'armor' },
          { item_name: 'Scimitar', quantity: 1, item_kind: 'weapon' },
        ],
      },
    ],
    chosen_option: null,
  };
}

function stepWith(
  state: GuidedEquipmentStepState,
  apply = vi.fn((params: GuidedApplyEquipmentParams) =>
    Promise.resolve({
      character_id: params.character_id,
      current_step: 'equipment' as const,
    }),
  ),
  navigate = vi.fn(),
) {
  const step = createEquipmentStep({
    characterId: 7,
    state,
    applyEquipment: apply,
    navigate,
  });
  return { step, apply, navigate };
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe('the confirmation shape', () => {
  it('renders a hostile external package source inert with its exact layer', () => {
    const hostile = '</h3><img data-ha10-equipment-source src=x>';
    const state = wizardAcolyteState();
    const { step } = stepWith({
      ...state,
      background_package: state.background_package === null
        ? null
        : {
            ...state.background_package,
            source_name: hostile,
            catalog_layer: 'external',
          },
    });
    const section = interactiveElement(step.element).querySelector(
      selector(EQUIPMENT_STEP_ATTR.source, 'background'),
    );

    expect(elementText(section! as unknown as Node)).toContain(
      `Background package — ${hostile} — Homebrew · external layer`,
    );
    expect(
      interactiveElement(step.element).querySelector(
        '[data-ha10-equipment-source]',
      ),
    ).toBeNull();
    step.cleanup();
  });

  it('renders both sources with one option each and confirms the class package with its content key and letter', async () => {
    const { step, apply, navigate } = stepWith(wizardAcolyteState());
    const view = interactiveElement(step.element);
    expect(
      view.querySelector(
        selector(GUIDED_PANEL_ATTRIBUTE, EQUIPMENT_STEP_PANEL),
      ),
    ).not.toBeNull();
    expect(
      view.querySelectorAll(selector(EQUIPMENT_STEP_ATTR.source)),
    ).toHaveLength(2);

    // The single-option common case is a confirmation, not a chooser.
    const classSection = view.querySelector(
      selector(EQUIPMENT_STEP_ATTR.source, 'class'),
    );
    const confirm = classSection!.querySelector(
      selector(EQUIPMENT_STEP_ATTR.choose, 'a'),
    );
    expect(elementText(confirm! as unknown as Node)).toContain(
      'Take this package',
    );
    confirm!.click();
    await settle();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({
      character_id: 7,
      kind: 'class',
      content_key: '2024:class:wizard',
      option: 'a',
    });
    expect(navigate).toHaveBeenCalledWith('/characters/7/build/levels/1');
    step.cleanup();
  });

  it('renders quantities and the not-itemised disclosure, and no completion notice while incomplete', () => {
    const { step } = stepWith(wizardAcolyteState());
    const view = interactiveElement(step.element);
    const text = elementText(step.element);
    // "2 Dagger" and "10 Parchment": count first, name verbatim.
    expect(text).toContain('2 Dagger');
    expect(text).toContain('10 Parchment');
    // D65's sentence and D56's, on the step itself.
    const disclosure = view.querySelector(
      selector(EQUIPMENT_STEP_ATTR.notItemised),
    );
    expect(elementText(disclosure! as unknown as Node)).toContain(
      'not tracked individually',
    );
    expect(elementText(disclosure! as unknown as Node)).toContain('No gold');
    expect(
      view.querySelectorAll(selector(EQUIPMENT_STEP_ATTR.complete)),
    ).toHaveLength(0);
    step.cleanup();
  });

  it('offers the Fighter both real options, each with its own addressed confirm', async () => {
    const { step, apply } = stepWith({
      ...wizardAcolyteState(),
      class_package: fighterClassPackage(),
    });
    const view = interactiveElement(step.element);
    const options = view.querySelectorAll(
      selector(EQUIPMENT_STEP_ATTR.option),
    );
    // Two class options plus the background's one.
    expect(
      options.map((entry) => entry.getAttribute(EQUIPMENT_STEP_ATTR.option)),
    ).toEqual(['a', 'b', 'a']);

    view
      .querySelector(selector(EQUIPMENT_STEP_ATTR.source, 'class'))!
      .querySelector(selector(EQUIPMENT_STEP_ATTR.choose, 'b'))!
      .click();
    await settle();
    // Option B, not "whichever option renders first".
    expect(apply).toHaveBeenCalledWith({
      character_id: 7,
      kind: 'class',
      content_key: '2024:class:fighter',
      option: 'b',
    });
    step.cleanup();
  });
});

describe('the recorded and completed states', () => {
  it('shows the recorded option, disables its confirm, and offers the switch', () => {
    const { step } = stepWith({
      ...wizardAcolyteState(),
      class_package: { ...fighterClassPackage(), chosen_option: 'a' },
    });
    const view = interactiveElement(step.element);
    const classSection = view.querySelector(
      selector(EQUIPMENT_STEP_ATTR.source, 'class'),
    );
    const recorded = classSection!.querySelector(
      selector(EQUIPMENT_STEP_ATTR.recorded, 'a'),
    );
    expect(elementText(recorded! as unknown as Node)).toContain(
      'Recorded: option A',
    );
    // The recorded option's control is inert; the OTHER option is a switch.
    const confirmA = classSection!.querySelector(
      selector(EQUIPMENT_STEP_ATTR.choose, 'a'),
    );
    expect(confirmA!.disabled).toBe(true);
    const confirmB = classSection!.querySelector(
      selector(EQUIPMENT_STEP_ATTR.choose, 'b'),
    );
    expect(confirmB!.disabled).toBe(false);
    expect(elementText(confirmB! as unknown as Node)).toContain(
      'Switch to option B',
    );
    step.cleanup();
  });

  it('says the build is complete exactly when the read model says so', () => {
    const state = wizardAcolyteState();
    const { step } = stepWith({
      ...state,
      class_package: { ...state.class_package, chosen_option: 'a' },
      background_package:
        state.background_package === null
          ? null
          : { ...state.background_package, chosen_option: 'a' },
      complete: true,
    });
    const view = interactiveElement(step.element);
    const notice = view.querySelector(
      selector(EQUIPMENT_STEP_ATTR.complete),
    );
    expect(elementText(notice! as unknown as Node)).toContain(
      'Every level 1 step is complete',
    );
    step.cleanup();
  });

  it('discloses an unresolvable background rather than guessing (D33)', () => {
    const { step } = stepWith({
      ...wizardAcolyteState(),
      background_package: null,
    });
    const text = elementText(step.element);
    expect(text).toContain('does not match one installed background');
    expect(text).toContain('cannot complete');
    step.cleanup();
  });
});

describe('the refusal sentences', () => {
  it('names what collided for an occupied armour slot, with the remedy', () => {
    const message = applyEquipmentRefusalMessage(
      new RpcError('handler_error', 'raw worker sentence', {
        reason: 'armor_slot_occupied',
        slot: 'worn',
        item: 'Chain Mail',
        holder: 'Family Breastplate',
      }),
    );
    expect(message).toContain('Chain Mail');
    expect(message).toContain('Family Breastplate');
    expect(message).toContain('worn');
    expect(message).toContain('Nothing was changed');
  });

  it('translates the two step refusals and leaves everything else to the raw message', () => {
    expect(
      applyEquipmentRefusalMessage(
        new RpcError('handler_error', 'raw', {
          reason: 'equipment_option_not_offered',
          kind: 'class',
          content_key: 'x',
          option: 'b',
        }),
      ),
    ).toContain('package only');
    expect(
      applyEquipmentRefusalMessage(
        new RpcError('handler_error', 'raw', {
          reason: 'equipment_source_mismatch',
          kind: 'background',
          content_key: 'x',
          option: 'a',
        }),
      ),
    ).toContain('does not belong to this character');
    expect(
      applyEquipmentRefusalMessage(new Error('unrelated')),
    ).toBeNull();
  });

  it('shows the refusal on the step and re-enables the controls', async () => {
    const apply = vi.fn(() =>
      Promise.reject(
        new RpcError('handler_error', 'raw worker sentence', {
          reason: 'armor_slot_occupied',
          slot: 'worn',
          item: 'Chain Mail',
          holder: 'Family Breastplate',
        }),
      ),
    );
    const { step, navigate } = stepWith(
      {
        ...wizardAcolyteState(),
        class_package: fighterClassPackage(),
      },
      apply,
    );
    const view = interactiveElement(step.element);
    const confirm = view
      .querySelector(selector(EQUIPMENT_STEP_ATTR.source, 'class'))!
      .querySelector(selector(EQUIPMENT_STEP_ATTR.choose, 'a'));
    confirm!.click();
    await settle();
    expect(navigate).not.toHaveBeenCalled();
    expect(elementText(step.element)).toContain('Family Breastplate');
    expect(confirm!.disabled).toBe(false);
    step.cleanup();
  });
});
