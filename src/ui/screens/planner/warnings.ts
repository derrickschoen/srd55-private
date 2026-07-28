import type {
  DuplicateAssessment,
  WorkspaceBuildReport,
} from '../../../domain/read-models';

function title(value: string): string {
  if (value === 'conflicting_version') return 'CONFLICTING VERSIONS';
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metric(label: string, value: string): HTMLElement {
  const item = document.createElement('div');
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  item.append(term, description);
  return item;
}

function warningArticle(
  item: DuplicateAssessment,
  disabled: boolean,
  acknowledge: (fingerprint: string, note: string) => void,
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'warning-card';
  if (item.category === 'conflicting_version') {
    article.setAttribute('role', 'alert');
  }
  const heading = document.createElement('h4');
  heading.textContent = `⚠ ${item.spell_name}`;
  const explanation = document.createElement('p');
  explanation.textContent = item.explanation;
  const sources = document.createElement('small');
  sources.textContent = `Sources: ${item.sources.join(', ')}`;
  article.append(heading, explanation);
  if (item.versions.length > 1) {
    const versions = document.createElement('ul');
    for (const version of item.versions) {
      const entry = document.createElement('li');
      entry.textContent = version.label;
      versions.append(entry);
    }
    article.append(versions);
  }
  article.append(sources);
  if (item.acknowledgement !== null) {
    const acknowledged = document.createElement('p');
    acknowledged.className = 'acknowledged';
    acknowledged.textContent = `Acknowledged: ${item.acknowledgement.note}`;
    article.append(acknowledged);
  } else if (item.warning_fingerprint !== null) {
    const row = document.createElement('div');
    row.className = 'acknowledgement-form';
    const note = document.createElement('input');
    note.className = 'planner-input';
    note.placeholder = 'Why both versions are intentional';
    note.setAttribute('aria-label', `Acknowledgement for ${item.spell_name}`);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button-secondary';
    button.textContent = 'Acknowledge warning';
    button.disabled = disabled;
    button.addEventListener('click', () => {
      if (
        item.warning_fingerprint !== null &&
        note.value.trim() !== ''
      ) {
        acknowledge(item.warning_fingerprint, note.value.trim());
      }
    });
    row.append(note, button);
    article.append(row);
  }
  return article;
}

export function renderWarnings(options: {
  report: WorkspaceBuildReport;
  disabled: boolean;
  acknowledge(fingerprint: string, note: string): void;
}): HTMLElement {
  const aside = document.createElement('aside');
  aside.className = 'planner-sidebar';
  aside.setAttribute('aria-label', 'Live build report');
  const live = document.createElement('section');
  live.className = 'planner-panel';
  const heading = document.createElement('div');
  heading.className = 'panel-heading';
  heading.innerHTML =
    '<h2>Live report</h2><small>Recomputes after every save</small>';
  const metrics = document.createElement('dl');
  metrics.className = 'report-metrics';
  metrics.append(
    metric('Caster level', String(options.report.caster.caster_level)),
    metric(
      'Proficiency',
      options.report.character.proficiency_bonus === null
        ? 'Undetermined'
        : `+${options.report.character.proficiency_bonus}`,
    ),
    metric('Unique spells', String(options.report.summary.unique_spells)),
    metric('Access routes', String(options.report.summary.access_routes)),
  );
  const slots = document.createElement('div');
  slots.className = 'slot-badges';
  const slotsHeading = document.createElement('h3');
  slotsHeading.textContent = 'Shared spell slots';
  for (const slot of options.report.caster.slots) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `L${slot.level}: ${slot.count}`;
    slots.append(badge);
  }
  if (options.report.caster.slots.length === 0) {
    slots.textContent = 'No shared spell slots.';
  }
  live.append(heading, metrics, slotsHeading, slots);
  if (options.report.caster.pact_magic !== null) {
    const pact = document.createElement('p');
    pact.className = 'pact-magic';
    pact.textContent = `Pact Magic: ${options.report.caster.pact_magic.count} × level ${options.report.caster.pact_magic.level}`;
    live.append(pact);
  }
  aside.append(live);

  const ceilings = document.createElement('section');
  ceilings.className = 'planner-panel';
  const ceilingHeading = document.createElement('h2');
  ceilingHeading.textContent = 'Class preparation ceilings';
  const classList = document.createElement('ul');
  classList.className = 'ceiling-list';
  for (const entry of options.report.classes) {
    const item = document.createElement('li');
    item.textContent = `${entry.name} ${entry.class_level}${
      entry.subclass === null ? '' : ` · ${entry.subclass}`
    } — max L${entry.max_preparable_level}`;
    classList.append(item);
  }
  const callout = document.createElement('p');
  callout.className = 'report-callout';
  callout.textContent = `Why this matters: ${options.report.preparation_callout}`;
  ceilings.append(ceilingHeading, classList, callout);
  aside.append(ceilings);

  const warningSection = document.createElement('section');
  warningSection.className = 'planner-panel';
  const warningHeading = document.createElement('h2');
  const warnings = options.report.duplicate_assessments.filter(
    (item) => item.category !== 'none',
  );
  warningHeading.textContent = `Duplicate warnings · ${warnings.length}`;
  warningSection.append(warningHeading);
  if (warnings.length === 0) {
    const none = document.createElement('p');
    none.className = 'muted';
    none.textContent = 'No duplicate spell warnings.';
    warningSection.append(none);
  } else {
    const groups = new Map<
      DuplicateAssessment['category'],
      DuplicateAssessment[]
    >();
    for (const warning of warnings) {
      const items = groups.get(warning.category) ?? [];
      items.push(warning);
      groups.set(warning.category, items);
    }
    for (const [category, items] of groups) {
      const group = document.createElement('h3');
      group.textContent = title(category);
      warningSection.append(group);
      for (const item of items) {
        warningSection.append(
          warningArticle(item, options.disabled, options.acknowledge),
        );
      }
    }
  }
  aside.append(warningSection);

  const wizard = document.createElement('section');
  wizard.className = 'planner-panel';
  const wizardHeading = document.createElement('h2');
  wizardHeading.textContent = 'Wizard spellbook access';
  const wizardExplanation = document.createElement('p');
  wizardExplanation.className = 'wizard-explanation';
  wizardExplanation.textContent = options.report.wizard.explanation;
  const wizardStates = document.createElement('div');
  wizardStates.className = 'wizard-states';
  const stateList = (
    heading: string,
    entries: readonly {
      readonly spell_name: string;
      readonly active?: boolean;
    }[],
  ): HTMLElement => {
    const section = document.createElement('section');
    const title = document.createElement('h3');
    title.textContent = `${heading} · ${entries.length}`;
    const list = document.createElement('ul');
    for (const entry of entries) {
      const item = document.createElement('li');
      item.textContent =
        entry.spell_name +
        (entry.active === false
          ? ' (unavailable — removed from catalog)'
          : '');
      list.append(item);
    }
    section.append(title, list);
    return section;
  };
  wizardStates.append(
    stateList('In my book', options.report.wizard.spellbook),
    stateList('Prepared', options.report.wizard.prepared),
    stateList('Ritual-only', options.report.wizard.ritual_only),
  );
  wizard.append(wizardHeading, wizardExplanation, wizardStates);
  aside.append(wizard);

  const invalid = document.createElement('section');
  invalid.className = 'planner-panel';
  const invalidHeading = document.createElement('h2');
  invalidHeading.textContent = 'Invalid or orphaned selections';
  invalid.append(invalidHeading);
  if (options.report.invalid_selections.length === 0) {
    const none = document.createElement('p');
    none.className = 'muted';
    none.textContent = '✓ Every visible selection is current and eligible.';
    invalid.append(none);
  } else {
    const list = document.createElement('ul');
    list.className = 'invalid-list';
    for (const slot of options.report.invalid_selections) {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = slot.spell_name ?? 'Empty slot';
      const reason = document.createElement('small');
      reason.textContent =
        slot.invalid_reason ??
        slot.orphan_reason ??
        'Kept as an explicit override.';
      item.append(
        '⚠ ',
        name,
        ` in ${slot.source} · ${slot.label}`,
        reason,
      );
      list.append(item);
    }
    invalid.append(list);
  }
  aside.append(invalid);
  return aside;
}
