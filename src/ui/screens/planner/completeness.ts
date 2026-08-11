import type {
  CatalogGapItem,
  CompletenessItem,
  CompletenessResult,
  UnfilledSkillGrantsItem,
} from '../../../queries/character-completeness';
import {
  guidedSpeciesChoicePath,
  SKILL_GRANT_KEYS,
} from '../../../builder/contracts';
import type { Skill } from '../../../domain/enums';
import { SKILL_LABELS } from '../../../rules/skills';
import { CATALOG_IMPORT_ROUTE } from '../character-list/import-backup-controls';

export interface PlannerCompletenessActions {
  /**
   * Fills one ADDRESSED grant (skills-with-provenance §3.5): the payload
   * carries the grant's own id, so filling through one class's form fills
   * THAT class's ordinal — the retired `choose_multiclass_skill` could not
   * say which grant it paid.
   */
  fillSkillGrant(grantId: number, skill: Skill): void;
}

/**
 * One form per UNFILLED GRANT, each addressed by its `grant_id`. A grant with
 * no available skill renders its select disabled — the item's detail already
 * explains why — rather than a control that can only fail.
 */
function skillGrantControls(
  item: UnfilledSkillGrantsItem,
  actions: PlannerCompletenessActions,
  disabled: boolean,
): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'skill-grant-controls';
  for (const grant of item.grants) {
    const form = document.createElement('form');
    form.className = 'skill-grant-form';
    const label = document.createElement('label');
    label.className = 'planner-field';
    const select = document.createElement('select');
    select.className = 'planner-input';
    select.name = `skill-grant-${String(grant.grant_id)}`;
    select.dataset.focusKey = `skill-grant-${String(grant.grant_id)}`;
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
      `${item.source_name} skill choice ${String(grant.ordinal)} of ${String(item.required)}`,
      select,
    );
    let instrumentStatement: HTMLParagraphElement | null = null;
    if (
      item.grant_key === SKILL_GRANT_KEYS.multiclassSkill &&
      item.source_name.startsWith('Bard')
    ) {
      instrumentStatement = document.createElement('p');
      instrumentStatement.className = 'multiclass-instrument-statement';
      instrumentStatement.textContent =
        'This also grants one musical instrument of your choice; the app does not track it.';
    }
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'button-primary';
    button.disabled = select.disabled;
    button.textContent = `Choose ${item.source_name} skill ${String(grant.ordinal)}`;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const skill = select.value;
      if (skill === '') return;
      actions.fillSkillGrant(grant.grant_id, skill as Skill);
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
  characterId: number,
): HTMLElement {
  const listItem = document.createElement('li');
  const heading = document.createElement('h3');
  heading.textContent = item.title;
  const detail = document.createElement('p');
  detail.textContent = item.detail;
  const remedy = document.createElement('p');
  remedy.className = 'outstanding-remedy';
  if (item.kind === 'required_source_choice') {
    const link = document.createElement('a');
    link.setAttribute('href', guidedSpeciesChoicePath(characterId));
    link.dataset.routerLink = 'true';
    link.textContent = item.remedy;
    remedy.append(link);
  } else if (item.kind === 'catalog_gap') {
    const link = document.createElement('a');
    link.setAttribute('href', CATALOG_IMPORT_ROUTE);
    link.dataset.routerLink = 'true';
    link.className = 'button-secondary';
    link.textContent = 'Import a catalog with eligible spells';
    remedy.append(link);
  } else {
    remedy.textContent = item.remedy;
  }
  listItem.append(heading, detail, remedy);
  if (item.kind === 'unfilled_skill_grants') {
    listItem.append(skillGrantControls(item, actions, disabled));
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
      list.append(entry(item, actions, disabled, result.character_id));
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
      list.append(entry(gap, actions, disabled, result.character_id));
    }
    section.append(gapHeading, explanation, list);
  }
  return section;
}
