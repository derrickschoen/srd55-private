import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ABILITY_STEP_ATTR,
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedAbilityScores,
} from '../../../src/builder/contracts';
import { abilities, type Ability } from '../../../src/domain/enums';
import type { CharacterRow } from '../../../src/domain/models';
import {
  createAbilitiesStep,
} from '../../../src/ui/screens/guided-builder/abilities-step';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  vi.restoreAllMocks();
});

function character(): CharacterRow {
  return {
    id: 7,
    name: 'Base Score Reader',
    strength: 11,
    dexterity: 12,
    constitution: 13,
    intelligence: 14,
    wisdom: 15,
    charisma: 16,
    ability_allocation_method: null,
    proficiency_bonus_override: null,
    rules_edition_preference: '2024',
    allow_legacy: false,
    revision: 0,
    alignment: null,
    appearance: null,
    backstory: null,
    notes: null,
    archived_at: null,
    created_at: null,
    updated_at: null,
  };
}

function selector(attribute: string, value?: string): string {
  return value === undefined
    ? `[${attribute}]`
    : `[${attribute}="${value}"]`;
}

function clickMethod(view: HTMLElement, method: string): void {
  const radio = interactiveElement(view).querySelector(
    selector(ABILITY_STEP_ATTR.method, method),
  );
  if (radio === null) {
    throw new Error(`The abilities step has no ${method} method selector.`);
  }
  const checkable = radio as InteractiveTestElement & { checked: boolean };
  checkable.checked = true;
  radio.dispatchEvent(new Event('change'));
}

function scoreInput(
  view: HTMLElement,
  ability: Ability,
): InteractiveTestElement {
  const input = interactiveElement(view).querySelector(
    selector(ABILITY_STEP_ATTR.input, ability),
  );
  if (input === null) {
    throw new Error(`The abilities step has no ${ability} input.`);
  }
  return input;
}

function setAllScores(view: HTMLElement, score: number): void {
  for (const ability of abilities) {
    const input = scoreInput(view, ability);
    input.value = String(score);
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
  }
}

async function clickSubmit(view: HTMLElement): Promise<void> {
  const submit = interactiveElement(view).querySelector(
    selector(ABILITY_STEP_ATTR.submit),
  );
  if (submit === null) {
    throw new Error('The abilities step has no submit control.');
  }
  submit.click();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe('abilities step base-score inputs', () => {
  it('prefills manual entry from all six base columns', () => {
    const row = character();
    const step = createAbilitiesStep({
      characterId: row.id,
      character: row,
      allocateAbilities: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });

    expect(
      step.element.querySelector(
        selector(GUIDED_PANEL_ATTRIBUTE, GUIDED_PANEL.abilitiesStep),
      ),
    ).not.toBeNull();
    clickMethod(step.element, 'manual');

    for (const ability of abilities) {
      expect(scoreInput(step.element, ability).getAttribute('value')).toBe(
        String(row[ability]),
      );
    }
    step.cleanup();
  });
});

describe('method-integrity refusals are not warnings', () => {
  it('refuses a standard-array submission that does not use the printed multiset', async () => {
    const allocate = vi.fn(
      (_method: string, _scores: GuidedAbilityScores, _operation: string) =>
        Promise.reject(new Error('must not allocate')),
    );
    const step = createAbilitiesStep({
      characterId: character().id,
      character: character(),
      allocateAbilities: allocate,
      navigate: () => undefined,
    });

    setAllScores(step.element, 15);
    await clickSubmit(step.element);

    expect(allocate).not.toHaveBeenCalled();
    expect(elementText(step.element)).toContain(
      'A standard-array assignment uses each of the six printed scores',
    );
    expect(step.element.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      step.element.querySelectorAll(selector(ABILITY_STEP_ATTR.warning)),
    ).toHaveLength(0);
    step.cleanup();
  });

  it('refuses an over-budget point buy through the error channel while retaining its non-blocking method warning', async () => {
    const allocate = vi.fn(
      (_method: string, _scores: GuidedAbilityScores, _operation: string) =>
        Promise.reject(new Error('must not allocate')),
    );
    const step = createAbilitiesStep({
      characterId: character().id,
      character: character(),
      allocateAbilities: allocate,
      navigate: () => undefined,
    });

    clickMethod(step.element, 'point_buy');
    setAllScores(step.element, 15);
    await clickSubmit(step.element);

    expect(allocate).not.toHaveBeenCalled();
    expect(elementText(step.element)).toContain(
      'That spend costs 54 points and the budget is 27.',
    );
    expect(step.element.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      step.element.querySelector(
        selector(ABILITY_STEP_ATTR.warning, 'non_standard_method'),
      ),
    ).not.toBeNull();
    step.cleanup();
  });
});
