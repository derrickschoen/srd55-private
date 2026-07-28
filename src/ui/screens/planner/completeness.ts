import type {
  CatalogGapItem,
  CompletenessItem,
  CompletenessResult,
  UnmadeMulticlassSkillChoiceItem,
} from '../../../queries/character-completeness';
import type { Skill } from '../../../domain/enums';
import { SKILL_LABELS } from '../../../rules/skills';

export interface PlannerCompletenessActions {
  chooseMulticlassSkill(skill: Skill): void;
}

function multiclassSkillControls(
  item: UnmadeMulticlassSkillChoiceItem,
  actions: PlannerCompletenessActions,
  disabled: boolean,
): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'multiclass-skill-controls';
  for (const grant of item.entries) {
    const form = document.createElement('form');
    form.className = 'multiclass-skill-form';
    const label = document.createElement('label');
    label.className = 'planner-field';
    const select = document.createElement('select');
    select.className = 'planner-input';
    select.name = `${grant.class_name.toLowerCase()}-multiclass-skill`;
    select.dataset.focusKey = `multiclass-skill-${grant.class_name}`;
    select.disabled = disabled || grant.available_skills.length === 0;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a skill';
    select.append(placeholder);
    for (const skill of grant.available_skills) {
      const option = document.createElement('option');
      option.value = skill;
      option.textContent = SKILL_LABELS[skill];
      select.append(option);
    }
    label.append(
      `${grant.class_name} multiclass skill (${String(grant.count)} granted)`,
      select,
    );
    let instrumentStatement: HTMLParagraphElement | null = null;
    if (grant.class_name === 'Bard') {
      instrumentStatement = document.createElement('p');
      instrumentStatement.className = 'multiclass-instrument-statement';
      instrumentStatement.textContent =
        'This also grants one musical instrument of your choice; the app does not track it.';
    }
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'button-primary';
    button.disabled = select.disabled;
    button.textContent = `Choose ${grant.class_name} skill`;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const skill = select.value;
      if (skill === '') return;
      actions.chooseMulticlassSkill(skill as Skill);
    });
    form.append(label, button);
    if (instrumentStatement !== null) {
      form.append(instrumentStatement);
    }
    controls.append(form);
  }
  return controls;
}

function entry(
  item: CompletenessItem | CatalogGapItem,
  actions: PlannerCompletenessActions,
  disabled: boolean,
): HTMLElement {
  const listItem = document.createElement('li');
  const heading = document.createElement('h3');
  heading.textContent = item.title;
  const detail = document.createElement('p');
  detail.textContent = item.detail;
  const remedy = document.createElement('p');
  remedy.className = 'outstanding-remedy';
  remedy.textContent = item.remedy;
  listItem.append(heading, detail, remedy);
  if (item.kind === 'unmade_multiclass_skill_choice') {
    listItem.append(multiclassSkillControls(item, actions, disabled));
  }
  return listItem;
}

function countLabel(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

// The panel renders only once the workspace has loaded, so a null count means
// the completeness query failed, not that it is still in flight.
export function outstandingHeading(count: number | null): string {
  if (count === null) {
    return 'Not chosen yet — unavailable for this character.';
  }
  return count === 0
    ? 'Not chosen yet — nothing outstanding.'
    : `Not chosen yet — ${countLabel(count, 'item')}`;
}

export function catalogGapHeading(count: number): string {
  return `Catalog gaps — ${countLabel(count, 'item')}`;
}

export function renderCompleteness(
  result: CompletenessResult | null,
  actions: PlannerCompletenessActions,
  disabled: boolean,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel outstanding-panel';
  const heading = document.createElement('h2');
  heading.textContent = outstandingHeading(
    result === null ? null : result.outstanding_count,
  );
  section.append(heading);
  if (result === null) {
    return section;
  }
  if (result.items.length > 0) {
    const list = document.createElement('ol');
    list.className = 'outstanding-list';
    for (const item of result.items) {
      list.append(entry(item, actions, disabled));
    }
    section.append(list);
  }
  if (result.catalog_gaps.length > 0) {
    const gapHeading = document.createElement('h2');
    gapHeading.textContent = catalogGapHeading(result.catalog_gap_count);
    const explanation = document.createElement('p');
    explanation.className = 'muted';
    explanation.textContent =
      'These are missing from your catalog rather than unfinished on this character, so they are not counted above.';
    const list = document.createElement('ol');
    list.className = 'outstanding-list';
    for (const gap of result.catalog_gaps) {
      list.append(entry(gap, actions, disabled));
    }
    section.append(gapHeading, explanation, list);
  }
  return section;
}
