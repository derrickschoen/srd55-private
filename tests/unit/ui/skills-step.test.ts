import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  SKILL_STEP_ATTR,
  type GuidedSkillsStepState,
} from '../../../src/builder/contracts';
import type { Skill } from '../../../src/domain/enums';
import { RpcError } from '../../../src/rpc/protocol';
import {
  createSkillsStep,
  fillSkillGrantRefusalMessage,
} from '../../../src/ui/screens/guided-builder/skills-step';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

/**
 * THE SKILLS STEP'S DOM (S-C): the already-granted display, the ADDRESSED
 * fill, the clear, the never-gating species choice, and the two §3.7
 * disclosures — every locator from the seam's `SKILL_STEP_ATTR`, never a
 * second invented set.
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
 * The exit fixture in miniature: an Acolyte Fighter with a Human's Skillful
 * choice. Two skills already granted by the background, two class choices
 * still owed, Insight missing from the available lists because it is held.
 */
function acolyteFighterState(): GuidedSkillsStepState {
  const fighterPoolMinusHeld: Skill[] = [
    'acrobatics',
    'animal_handling',
    'athletics',
    'history',
    'intimidation',
    'perception',
    'persuasion',
    'survival',
  ];
  return {
    character_id: 7,
    revision: 3,
    granted: [
      {
        grant_id: 11,
        skill: 'insight',
        grant_key: 'background_skill',
        source_name: 'Acolyte',
        source_catalog_layer: 'bundled',
        clearable: false,
      },
      {
        grant_id: 12,
        skill: 'religion',
        grant_key: 'background_skill',
        source_name: 'Acolyte',
        source_catalog_layer: 'bundled',
        clearable: false,
      },
    ],
    class_choices: [
      {
        grant_id: 21,
        source_instance_id: 1,
        grant_key: 'class_skill',
        ordinal: 1,
        class_definition_id: 5,
        class_name: 'Fighter',
        class_catalog_layer: 'bundled',
        available: fighterPoolMinusHeld,
      },
      {
        grant_id: 22,
        source_instance_id: 1,
        grant_key: 'class_skill',
        ordinal: 2,
        class_definition_id: 5,
        class_name: 'Fighter',
        class_catalog_layer: 'bundled',
        available: fighterPoolMinusHeld,
      },
    ],
    species_choices: [
      {
        grant_id: 31,
        grant_key: 'species_skillful',
        source_name: 'Human',
        source_catalog_layer: 'bundled',
        available: fighterPoolMinusHeld,
      },
    ],
    unmodelled_tool_alternative_sources: [],
  };
}

function stepWith(
  state: GuidedSkillsStepState,
  fill = vi.fn(() =>
    Promise.resolve({ character_id: 7, current_step: 'skills' as const }),
  ),
  navigate = vi.fn(),
) {
  const step = createSkillsStep({
    characterId: 7,
    state,
    fillSkillGrant: fill,
    navigate,
  });
  return { step, fill, navigate };
}

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe('the already-granted display', () => {
  it('shows every filled grant with its source, choosable nowhere', () => {
    const { step } = stepWith(acolyteFighterState());
    const view = interactiveElement(step.element);
    expect(
      view.querySelector(
        selector(GUIDED_PANEL_ATTRIBUTE, GUIDED_PANEL.skillsStep),
      ),
    ).not.toBeNull();

    const granted = view.querySelectorAll(selector(SKILL_STEP_ATTR.granted));
    expect(granted.map((entry) => entry.getAttribute(SKILL_STEP_ATTR.granted)))
      .toEqual(['insight', 'religion']);
    expect(elementText(granted[0] as unknown as Node)).toContain('Acolyte');
    // A background's printed skills are FACTS, not choices: no clear control.
    expect(
      view.querySelectorAll(selector(SKILL_STEP_ATTR.clear)),
    ).toHaveLength(0);
    step.cleanup();
  });

  it('offers a clear control on a choice-filled grant, and clearing is a null fill', async () => {
    const state: GuidedSkillsStepState = {
      ...acolyteFighterState(),
      granted: [
        {
          grant_id: 21,
          skill: 'athletics',
          grant_key: 'class_skill',
          source_name: 'Fighter 1',
          source_catalog_layer: 'bundled',
          clearable: true,
        },
      ],
    };
    const { step, fill, navigate } = stepWith(state);
    const clear = interactiveElement(step.element).querySelector(
      selector(SKILL_STEP_ATTR.clear, '21'),
    );
    expect(clear).not.toBeNull();
    clear!.click();
    await settle();
    expect(fill).toHaveBeenCalledWith(21, null, expect.any(String));
    expect(navigate).toHaveBeenCalledWith('/characters/7/build/levels/1');
    step.cleanup();
  });
});

describe('the addressed fill', () => {
  it('fills exactly the grant whose control was used — the id travels with the click', async () => {
    const { step, fill, navigate } = stepWith(acolyteFighterState());
    const view = interactiveElement(step.element);

    const second = view.querySelector(selector(SKILL_STEP_ATTR.choice, '22'));
    expect(second).not.toBeNull();
    const select = second!.querySelector(
      selector(SKILL_STEP_ATTR.select, '22'),
    );
    select!.value = 'perception';
    second!
      .querySelector(selector(SKILL_STEP_ATTR.fill, '22'))!
      .click();
    await settle();
    // Grant 22, not "whichever grant is unfilled" — §5's second trap.
    expect(fill).toHaveBeenCalledTimes(1);
    expect(fill).toHaveBeenCalledWith(22, 'perception', expect.any(String));
    expect(navigate).toHaveBeenCalledWith('/characters/7/build/levels/1');
    step.cleanup();
  });

  it('does nothing on an empty selection, and held skills are absent from the lists', () => {
    const { step, fill } = stepWith(acolyteFighterState());
    const view = interactiveElement(step.element);
    const options = view
      .querySelector(selector(SKILL_STEP_ATTR.select, '21'))!
      .querySelectorAll('option')
      .map((option) => option.getAttribute('value'));
    expect(options).not.toContain('insight');
    expect(options).toContain('athletics');

    view.querySelector(selector(SKILL_STEP_ATTR.fill, '21'))!.click();
    expect(fill).not.toHaveBeenCalled();
    step.cleanup();
  });

  it('renders the species choice as fillable and says it never holds the step up', () => {
    const { step } = stepWith(acolyteFighterState());
    const view = interactiveElement(step.element);
    expect(
      view.querySelector(selector(SKILL_STEP_ATTR.choice, '31')),
    ).not.toBeNull();
    expect(elementText(step.element)).toContain(
      'Skipping it does not hold this step up.',
    );
    step.cleanup();
  });

  it('shows a refusal sentence and re-enables the controls when the fill rejects', async () => {
    const fill = vi.fn(() =>
      Promise.reject(
        new RpcError('handler_error', 'held', {
          reason: 'skill_already_held',
          skill: 'athletics',
        }),
      ),
    );
    const { step, navigate } = stepWith(acolyteFighterState(), fill);
    const view = interactiveElement(step.element);
    const select = view.querySelector(selector(SKILL_STEP_ATTR.select, '21'));
    select!.value = 'athletics';
    const button = view.querySelector(
      selector(SKILL_STEP_ATTR.fill, '21'),
    ) as InteractiveTestElement;
    button.click();
    await settle();
    expect(navigate).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
    expect(elementText(step.element)).toContain(
      'You already have Athletics from another source',
    );
    step.cleanup();
  });

  it('explains an emptied pool instead of showing a dead picker', () => {
    const base = acolyteFighterState();
    const state: GuidedSkillsStepState = {
      ...base,
      species_choices: [
        {
          grant_id: 31,
          grant_key: 'species_keen_senses',
          source_name: 'Elf',
          source_catalog_layer: 'bundled',
          available: [],
        },
      ],
    };
    const { step, fill } = stepWith(state);
    const view = interactiveElement(step.element);
    const choice = view.querySelector(selector(SKILL_STEP_ATTR.choice, '31'));
    expect(elementText(choice as unknown as Node)).toContain(
      'Every skill this choice offers is already held from another source',
    );
    const button = choice!.querySelector(
      selector(SKILL_STEP_ATTR.fill, '31'),
    ) as InteractiveTestElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(fill).not.toHaveBeenCalled();
    step.cleanup();
  });
});

describe('the D102 skill-or-tool disclosure', () => {
  it('renders unmodelled tool-capable ordinals from result data', () => {
    const state: GuidedSkillsStepState = {
      ...acolyteFighterState(),
      unmodelled_tool_alternative_sources: [{
        source_name: 'Skilled',
        source_catalog_layer: 'bundled',
      }],
    };
    const { step } = stepWith(state);
    const view = interactiveElement(step.element);
    const skilled = view.querySelector(
      selector(SKILL_STEP_ATTR.toolAlternativeGap),
    );
    expect(skilled).not.toBeNull();
    expect(elementText(skilled as unknown as Node)).toContain('Skilled');
    expect(elementText(skilled as unknown as Node)).toContain(
      'does not model tool choices',
    );
    step.cleanup();
  });

  it('renders no disclosure when no unmodelled rule source exists', () => {
    const { step } = stepWith(acolyteFighterState());
    const view = interactiveElement(step.element);
    expect(
      view.querySelectorAll(selector(SKILL_STEP_ATTR.toolAlternativeGap)),
    ).toHaveLength(0);
    step.cleanup();
  });
});

describe('fillSkillGrantRefusalMessage', () => {
  it('translates each named refusal and passes unknown errors through as null', () => {
    const refusal = (reason: string, skill: string | null) =>
      new RpcError('handler_error', 'refused', { reason, skill });
    expect(
      fillSkillGrantRefusalMessage(refusal('grant_not_found', null)),
    ).toContain('no longer exists');
    expect(
      fillSkillGrantRefusalMessage(refusal('grant_already_filled', 'insight')),
    ).toContain('already made');
    expect(
      fillSkillGrantRefusalMessage(refusal('skill_not_in_pool', 'arcana')),
    ).toContain('Arcana');
    expect(
      fillSkillGrantRefusalMessage(refusal('skill_already_held', 'insight')),
    ).toContain('Insight');
    expect(fillSkillGrantRefusalMessage(new Error('plain'))).toBeNull();
    expect(
      fillSkillGrantRefusalMessage(
        new RpcError('handler_error', 'other', { reason: 'unrelated' }),
      ),
    ).toBeNull();
  });
});
