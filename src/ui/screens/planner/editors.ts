import {
  abilities,
  type Ability,
  type StandaloneSourceType,
} from '../../../domain/enums';
import type {
  CharacterClass,
  SourceDefinition,
  Workspace,
} from '../../../domain/read-models';
import type { JsonObject } from '../../../domain/models';
import { CHARACTER_TEXT_LIMITS } from '../../../domain/character-limits';
import { freeTextSpan } from '../../free-text';

export interface PlannerEditorActions {
  updateFlavor(flavor: Workspace['flavor']): void;
  updateAbility(ability: Ability, score: number): void;
  updateLegacy(allowLegacy: boolean): void;
  updateClass(
    entry: CharacterClass,
    changes: {
      subclass_definition_id?: number | null;
    },
  ): void;
  removeClass(entry: CharacterClass): void;
  addClass(classDefinitionId: number): void;
  updateSourceList(sourceId: number, list: string): void;
  updateClassOrder(sourceId: number, option: string): void;
  addSource(
    sourceType: StandaloneSourceType,
    sourceDefinitionId: number,
    config: JsonObject,
  ): void;
  removeSource(sourceId: number, displayName: string): void;
}

function panel(title: string): [HTMLElement, HTMLElement] {
  const section = document.createElement('section');
  section.className = 'planner-panel';
  const heading = document.createElement('h2');
  heading.textContent = title;
  section.append(heading);
  return [section, heading];
}

function field(
  label: string,
  input:
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | HTMLOutputElement,
): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'planner-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  input.classList.add('planner-input');
  wrapper.append(caption, input);
  return wrapper;
}

export function renderCharacterDetails(options: {
  workspace: Workspace;
  actions: Pick<PlannerEditorActions, 'updateFlavor'>;
  disabled: boolean;
}): HTMLElement {
  const [section] = panel('Character details');
  const statement = document.createElement('p');
  statement.textContent =
    'Free text only. These words are stored and printed, but never used to calculate character facts.';
  const sharing = document.createElement('p');
  sharing.textContent =
    'Share links include these fields only when you turn on “Include my written text”.';
  const form = document.createElement('form');
  form.className = 'character-details-form';
  form.dataset.testid = 'character-details-form';

  const alignment = document.createElement('input');
  alignment.type = 'text';
  const controls = {
    alignment,
    appearance: document.createElement('textarea'),
    backstory: document.createElement('textarea'),
    notes: document.createElement('textarea'),
  };

  for (const fieldName of [
    'alignment',
    'appearance',
    'backstory',
    'notes',
  ] as const) {
    const control = controls[fieldName];
    const maximum = CHARACTER_TEXT_LIMITS[fieldName];
    control.value = options.workspace.flavor[fieldName] ?? '';
    control.maxLength = maximum;
    control.disabled = options.disabled;
    control.dataset.focusKey = `flavor-${fieldName}`;
    const wrapper = field(
      fieldName[0]!.toUpperCase() + fieldName.slice(1),
      control,
    );
    const remaining = document.createElement('output');
    remaining.dataset.flavorRemaining = fieldName;
    const refreshRemaining = (): void => {
      remaining.value = `${String(maximum - [...control.value].length)} / ${String(maximum)} remaining`;
    };
    control.addEventListener('input', refreshRemaining);
    refreshRemaining();
    wrapper.append(remaining);
    form.append(wrapper);
  }

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'button-primary';
  save.textContent = 'Save character details';
  save.disabled = options.disabled;
  save.dataset.focusKey = 'flavor-save';
  form.append(save);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (options.disabled) return;
    options.actions.updateFlavor({
      alignment: controls.alignment.value,
      appearance: controls.appearance.value,
      backstory: controls.backstory.value,
      notes: controls.notes.value,
    });
  });
  section.append(statement, sharing, form);
  return section;
}

function option(
  value: string,
  label: string,
  selected = false,
): HTMLOptionElement {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  node.selected = selected;
  return node;
}

function modifier(score: number): string {
  const result = Math.floor((score - 10) / 2);
  return result >= 0 ? `+${result}` : String(result);
}

function renderRules(
  workspace: Workspace,
  actions: PlannerEditorActions,
  disabled: boolean,
): HTMLElement {
  const [section] = panel('Rules editions');
  const label = document.createElement('label');
  label.className = 'checkbox-description';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = workspace.allow_legacy;
  checkbox.disabled = disabled;
  checkbox.dataset.focusKey = 'allow-legacy';
  checkbox.addEventListener('change', () =>
    actions.updateLegacy(checkbox.checked),
  );
  const description = document.createElement('span');
  description.innerHTML =
    '<strong>Allow legacy 2014 spell versions</strong><small>Legacy versions remain distinct from their 2024 counterparts and conflicting selections are warned.</small>';
  label.append(checkbox, description);
  section.append(label);
  return section;
}

function renderAbilities(
  workspace: Workspace,
  actions: PlannerEditorActions,
  disabled: boolean,
): HTMLElement {
  const [section] = panel('Ability scores');
  const grid = document.createElement('div');
  grid.className = 'ability-grid';
  for (const ability of abilities) {
    // THE INPUT DISPLAYS AND EDITS BASE, NEVER THE RESOLVED TOTAL (plan §3.5).
    // `update_ability` writes whatever was typed straight into the base
    // column, so an input showing the total (base 15 + 2 = 17) would let a
    // person "nudge 17 to 18" and write base = 18 — the contribution baked
    // into base by their own hand, which is exactly what D63 forbids. The
    // dirty-check and the modifier caption read base for the same reason; the
    // resolved total is shown BESIDE the input, not in it.
    const base = workspace.report.character.abilities_base[ability];
    const total = workspace.report.character.abilities[ability];
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = '30';
    input.value = String(base);
    input.disabled = disabled;
    input.dataset.focusKey = `ability-${ability}`;
    input.addEventListener('change', () => {
      const score = Number(input.value);
      if (score !== workspace.report.character.abilities_base[ability]) {
        actions.updateAbility(ability, score);
      }
    });
    const wrapper = field(ability.slice(0, 3).toUpperCase(), input);
    const result = document.createElement('small');
    result.textContent = `modifier ${modifier(base)}`;
    wrapper.append(result);
    if (total !== base) {
      const resolved = document.createElement('small');
      resolved.className = 'ability-total';
      resolved.textContent = `total ${total} (${modifier(total)})`;
      wrapper.append(resolved);
    }
    grid.append(wrapper);
  }
  section.append(grid);
  const casting = new Map<
    string,
    { ability: Ability; attack: number; dc: number }
  >();
  const proficiency = workspace.report.character.proficiency_bonus;
  for (const slot of workspace.slots) {
    if (
      slot.ability === null ||
      proficiency === null ||
      casting.has(slot.source)
    ) continue;
    const abilityScore =
      workspace.report.character.abilities[slot.ability];
    const mod = Math.floor((abilityScore - 10) / 2);
    casting.set(slot.source, {
      ability: slot.ability,
      attack: proficiency + mod,
      dc: 8 + proficiency + mod,
    });
  }
  if (casting.size > 0) {
    const results = document.createElement('div');
    results.className = 'casting-results';
    const heading = document.createElement('h3');
    heading.textContent = 'Resulting casting numbers by source';
    results.append(heading);
    for (const [source, values] of casting) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `${source} · ${values.ability
        .slice(0, 3)
        .toUpperCase()} · attack ${
        values.attack >= 0 ? '+' : ''
      }${values.attack} · DC ${values.dc}`;
      results.append(badge);
    }
    section.append(results);
  }
  return section;
}

function sourceConfiguration(
  definition: SourceDefinition,
  list: string,
  ability: string,
): JsonObject {
  const magicInitiate = {
    chosen_list: list,
    spellcasting_ability: ability,
  };
  if (definition.configuration_kind === 'magic_initiate') {
    return magicInitiate;
  }
  if (definition.configuration_kind === 'origin_feat_magic_initiate') {
    return {
      origin_feat_key: '2024:feat:magic-initiate',
      origin_feat_config: magicInitiate,
    };
  }
  return {};
}

function renderSources(
  workspace: Workspace,
  actions: PlannerEditorActions,
  disabled: boolean,
): HTMLElement {
  const [section] = panel('Source configuration');
  const form = document.createElement('form');
  form.className = 'source-add-form';
  let sourceType: StandaloneSourceType = 'feat';
  const type = document.createElement('select');
  type.append(
    option('feat', 'Feat', true),
    option('species', 'Species'),
    option('background', 'Background'),
  );
  const definition = document.createElement('select');
  const list = document.createElement('select');
  for (const spellList of workspace.spell_lists) {
    list.append(option(spellList, spellList, spellList === 'Cleric'));
  }
  const ability = document.createElement('select');
  ability.append(
    option('intelligence', 'Intelligence', true),
    option('wisdom', 'Wisdom'),
    option('charisma', 'Charisma'),
  );
  const definitionField = field('Source to add', definition);
  const listField = field('Magic Initiate spell list', list);
  const abilityField = field('Magic Initiate casting ability', ability);
  const add = document.createElement('button');
  add.type = 'submit';
  add.className = 'button-primary';
  add.textContent = 'Add source';
  const drawDefinitions = (): void => {
    definition.replaceChildren(
      option('', 'Choose a source…', true),
      ...workspace.source_catalog[sourceType].map((item) =>
        option(String(item.id), item.name),
      ),
    );
    listField.hidden = true;
    abilityField.hidden = true;
    add.disabled = true;
  };
  const chosenDefinition = (): SourceDefinition | undefined =>
    workspace.source_catalog[sourceType].find(
      (item) => item.id === Number(definition.value),
    );
  type.addEventListener('change', () => {
    sourceType = type.value as StandaloneSourceType;
    drawDefinitions();
  });
  definition.addEventListener('change', () => {
    const selected = chosenDefinition();
    const needsConfig =
      selected !== undefined && selected.configuration_kind !== 'none';
    listField.hidden = !needsConfig;
    abilityField.hidden = !needsConfig;
    add.disabled = selected === undefined || disabled;
    add.textContent = `Add ${selected?.name ?? 'source'}`;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = chosenDefinition();
    if (selected === undefined) return;
    actions.addSource(
      sourceType,
      selected.id,
      sourceConfiguration(selected, list.value, ability.value),
    );
  });
  drawDefinitions();
  form.append(
    field('Source type', type),
    definitionField,
    listField,
    abilityField,
    add,
  );
  section.append(form);
  const configuration = document.createElement('div');
  configuration.className = 'source-config-list';
  for (const source of workspace.order_sources) {
    const editor = document.createElement('article');
    const summary = document.createElement('div');
    summary.innerHTML = `<strong></strong><small></small>`;
    summary.querySelector('strong')!.textContent =
      `${source.order_name} · ${source.display_name}`;
    summary.querySelector('small')!.textContent =
      `${source.bonus_option} adds one ${source.class_name} cantrip slot; switching preserves a selection as an orphan.`;
    const input = document.createElement('select');
    input.append(
      option('', `Choose ${source.order_name}…`),
      ...source.options.map((item) =>
        option(item, item, item === source.chosen_option),
      ),
    );
    input.disabled = disabled;
    input.setAttribute(
      'aria-label',
      `${source.order_name} option for ${source.display_name}`,
    );
    input.addEventListener('change', () => {
      if (input.value !== '') {
        actions.updateClassOrder(source.id, input.value);
      }
    });
    editor.append(summary, input);
    configuration.append(editor);
  }
  for (const source of workspace.configurable_sources) {
    const editor = document.createElement('article');
    const name = document.createElement('strong');
    // A feat instance's display name can have come from an imported share link.
    name.append(freeTextSpan(source.display_name));
    const input = document.createElement('select');
    for (const spellList of workspace.spell_lists) {
      input.append(
        option(
          spellList,
          spellList,
          spellList === source.chosen_list,
        ),
      );
    }
    input.disabled = disabled;
    input.setAttribute(
      'aria-label',
      `Chosen spell list for source ${source.id}`,
    );
    input.addEventListener('change', () =>
      actions.updateSourceList(source.id, input.value),
    );
    editor.append(name, input);
    configuration.append(editor);
  }
  section.append(configuration);
  const activeHeading = document.createElement('h3');
  activeHeading.textContent = 'Active feats, species, and backgrounds';
  section.append(activeHeading);
  const active = document.createElement('ul');
  active.className = 'removable-sources';
  for (const source of workspace.removable_sources) {
    const item = document.createElement('li');
    const description = document.createElement('span');
    const descriptionName = document.createElement('strong');
    // Feat, species and background display names can come from a share link.
    descriptionName.append(freeTextSpan(source.display_name));
    const descriptionType = document.createElement('small');
    descriptionType.textContent =
      source.source_type +
      (source.parent_source_instance_id === null
        ? ''
        : ' · granted by another source');
    description.append(descriptionName, descriptionType);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button-danger';
    remove.textContent = 'Remove';
    remove.disabled = disabled;
    remove.setAttribute('aria-label', `Remove ${source.display_name}`);
    remove.addEventListener('click', () =>
      actions.removeSource(source.id, source.display_name),
    );
    item.append(description, remove);
    active.append(item);
  }
  if (workspace.removable_sources.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No active feats, species, or backgrounds.';
    section.append(empty);
  } else section.append(active);
  return section;
}

function renderClasses(
  workspace: Workspace,
  actions: PlannerEditorActions,
  disabled: boolean,
): HTMLElement {
  const [section, heading] = panel('Classes');
  const autosave = document.createElement('small');
  autosave.textContent = 'Autosaves on change';
  heading.append(autosave);
  const classes = document.createElement('div');
  classes.className = 'class-list';
  for (const entry of workspace.classes) {
    const row = document.createElement('article');
    const name = document.createElement('strong');
    name.textContent = entry.name;
    // NOT AN INPUT ANY MORE (level-up plan §3): the numeric level control was
    // the second writer §0 names — it could move a level to any number
    // without a hit-point row ever being written. The level is read-only
    // here; levelling happens through the guarded `level_up_class` path
    // (L-B's screen). The output keeps a per-class accessible name for the
    // same reason the input carried one.
    const level = document.createElement('output');
    level.textContent = String(entry.level);
    level.setAttribute('aria-label', `${entry.name} level`);
    const subclass = document.createElement('select');
    subclass.setAttribute('aria-label', `${entry.name} subclass`);
    subclass.append(
      option('', 'None', entry.subclass_definition_id === null),
      ...entry.subclasses.map((item) =>
        option(
          String(item.id),
          item.name,
          item.id === entry.subclass_definition_id,
        ),
      ),
    );
    subclass.disabled = disabled || entry.subclasses.length === 0;
    subclass.addEventListener('change', () =>
      actions.updateClass(entry, {
        subclass_definition_id:
          subclass.value === '' ? null : Number(subclass.value),
      }),
    );
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button-danger';
    remove.textContent = 'Remove';
    remove.disabled = disabled;
    remove.setAttribute('aria-label', `Remove ${entry.name}`);
    remove.addEventListener('click', () => actions.removeClass(entry));
    row.append(
      name,
      field('Level', level),
      field('Subclass', subclass),
      remove,
    );
    classes.append(row);
  }
  if (workspace.classes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-callout';
    empty.textContent =
      'No classes yet. Add one below to generate its spell slots.';
    classes.append(empty);
  }
  section.append(classes);
  const used = new Set(
    workspace.classes.map((entry) => entry.class_definition_id),
  );
  const available = workspace.available_classes.filter(
    (entry) => !used.has(entry.id),
  );
  const addRow = document.createElement('div');
  addRow.className = 'class-add';
  const selection = document.createElement('select');
  selection.className = 'planner-input';
  selection.setAttribute('aria-label', 'Class to add');
  selection.append(
    option('', 'Choose a class…', true),
    ...available.map((entry) => option(String(entry.id), entry.name)),
  );
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button-primary';
  add.textContent = 'Add class';
  add.disabled = true;
  selection.addEventListener('change', () => {
    add.disabled = selection.value === '' || disabled;
  });
  add.addEventListener('click', () => {
    if (selection.value !== '') actions.addClass(Number(selection.value));
  });
  addRow.append(selection, add);
  section.append(addRow);
  return section;
}

export function renderEditors(options: {
  workspace: Workspace;
  actions: PlannerEditorActions;
  disabled: boolean;
}): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(
    renderRules(options.workspace, options.actions, options.disabled),
    renderAbilities(
      options.workspace,
      options.actions,
      options.disabled,
    ),
    renderSources(
      options.workspace,
      options.actions,
      options.disabled,
    ),
    renderClasses(
      options.workspace,
      options.actions,
      options.disabled,
    ),
  );
  return fragment;
}
