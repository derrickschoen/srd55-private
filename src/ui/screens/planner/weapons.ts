import {
  weaponMasteryProperties,
  type SrdWeaponGroup,
  type WeaponMasteryProperty,
} from '../../../domain/enums';
import type { WeaponFields } from '../../../domain/command-contracts';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../../../domain/weapon-limits';
import type {
  CharacterWeapon,
  WeaponsPanel,
  WeaponTemplate,
} from '../../../domain/read-models';
import { freeTextSpan } from '../../free-text';

/**
 * THE WEAPONS PANEL.
 *
 * Plain controls only: real `<button>`, `<input>`, `<select>` and `<textarea>`
 * elements, every one with a visible `<label>` or an accessible name that names
 * the weapon. No drag-and-drop, no custom widgets, no hover-only affordance,
 * and no state that exists only in a tooltip — a browser AI extension driving
 * by accessible name must be able to do everything a mouse can.
 *
 * COPY CONSTRAINT, NOT A STYLE PREFERENCE. `tests/browser/attribution.spec.ts`
 * asserts that `/D&D|Dungeons|Wizards/` appears in neither the page title nor
 * the body text, because the licence asks that no attribution to the licensor
 * appear beyond the required notice. Every string in this file is written under
 * that rule: the picker says "Simple Melee", never anything carrying a
 * wordmark.
 */

const GROUP_LABELS: Readonly<Record<SrdWeaponGroup, string>> = {
  simple_melee: 'Simple Melee',
  simple_ranged: 'Simple Ranged',
  martial_melee: 'Martial Melee',
  martial_ranged: 'Martial Ranged',
};

/** The three damage types the reference weapons use, offered as suggestions. */
const SUGGESTED_DAMAGE_TYPES = ['Bludgeoning', 'Piercing', 'Slashing'] as const;

const TOGGLE_LABELS = [
  ['finesse', 'Finesse'],
  ['heavy', 'Heavy'],
  ['light', 'Light'],
  ['loading', 'Loading'],
  ['reach', 'Reach'],
  ['thrown', 'Thrown'],
  ['two_handed', 'Two-Handed'],
  ['ammunition', 'Ammunition'],
] as const satisfies readonly (readonly [keyof WeaponFields, string])[];

export interface PlannerWeaponActions {
  addWeapon(weapon: WeaponFields): void;
  updateWeapon(weaponId: number, weapon: WeaponFields): void;
  removeWeapon(weaponId: number, name: string): void;
  setWeaponMastery(weaponId: number, selected: boolean): void;
}

export interface WeaponsPanelOptions {
  readonly panel: WeaponsPanel;
  readonly actions: PlannerWeaponActions;
  readonly disabled: boolean;
  /** `null` when the form is closed; a weapon id when editing; `'new'` to add. */
  readonly editing: number | 'new' | null;
  readonly onEditingChanged: (editing: number | 'new' | null) => void;
}

export function blankWeapon(): WeaponFields {
  return {
    name: '',
    damage_dice: null,
    damage_type: null,
    versatile_damage_dice: null,
    finesse: false,
    heavy: false,
    light: false,
    loading: false,
    reach: false,
    thrown: false,
    two_handed: false,
    ammunition: false,
    ammunition_kind: null,
    range_normal_feet: null,
    range_long_feet: null,
    mastery_property: null,
    other_properties: null,
    notes: null,
  };
}

/**
 * A template's values as a weapon body.
 *
 * The spread is the whole implementation, and that is the point of
 * `WeaponProfile`: the catalog row and the character row carry the same
 * fillable fields, so pre-fill needs no mapping and cannot silently miss one.
 * `notes` is the single field a template cannot fill, because no catalog row
 * has one.
 *
 * The returned object is a fresh copy of plain values. Editing it afterwards
 * cannot reach the template — which is D1b made structural rather than
 * promised.
 */
export function weaponFromTemplate(template: WeaponTemplate): WeaponFields {
  const { id: _id, content_key: _key, srd_group: _group, ...profile } = template;
  return { ...profile, notes: null };
}

function labelled(
  labelText: string,
  control: HTMLElement,
  id: string,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'planner-field';
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  control.id = id;
  control.classList.add('planner-input');
  wrapper.append(label, control);
  return wrapper;
}

/**
 * Every weapon control carries the SAME bound the command validator enforces.
 *
 * Without it the form happily accepts prose or a distance that
 * `validateCharacterCommandPayload` then rejects, so the user learns the limit
 * only by losing the save. `maxLength` also stops the browser pasting past it.
 */
function textInput(
  id: string,
  value: string | null,
  maximum: number,
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = maximum;
  input.value = value ?? '';
  input.dataset.focusKey = id;
  return input;
}

function numberInput(id: string, value: number | null): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = String(WEAPON_RANGE_MAX_FEET);
  input.value = value === null ? '' : String(value);
  input.dataset.focusKey = id;
  return input;
}

function trimmedOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function integerOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** `1d8 Slashing (Versatile 1d10)`, or an honest blank. */
export function damageSummary(weapon: CharacterWeapon): string {
  const base = [weapon.damage_dice, weapon.damage_type]
    .filter((part): part is string => part !== null)
    .join(' ');
  const versatile =
    weapon.versatile_damage_dice === null
      ? ''
      : ` (Versatile ${weapon.versatile_damage_dice})`;
  return base === '' && versatile === ''
    ? 'not recorded'
    : `${base}${versatile}`.trim();
}

/** The property list as a plain sentence, booleans first then the free text. */
export function propertySummary(weapon: CharacterWeapon): string {
  const parts: string[] = [];
  for (const [key, label] of TOGGLE_LABELS) {
    if (weapon[key] === true) {
      parts.push(label);
    }
  }
  if (weapon.ammunition && weapon.ammunition_kind !== null) {
    parts[parts.length - 1] = `Ammunition (${weapon.ammunition_kind})`;
  }
  if (weapon.range_normal_feet !== null || weapon.range_long_feet !== null) {
    parts.push(
      `Range ${weapon.range_normal_feet ?? '—'}/${weapon.range_long_feet ?? '—'} ft`,
    );
  }
  if (weapon.other_properties !== null) {
    parts.push(weapon.other_properties);
  }
  return parts.length === 0 ? 'none' : parts.join(', ');
}

/**
 * The allowance, in a sentence.
 *
 * Four states and four sentences. None of them is a number the application
 * cannot defend: the multiclass case lists each class and says plainly that it
 * does not know how they combine, rather than summing and being confidently
 * wrong.
 */
export function masteryStatement(panel: WeaponsPanel): string {
  const allowance = panel.allowance;
  const chosen = panel.selected_count;
  switch (allowance.state) {
    case 'none':
      return 'Weapon Mastery: none of this character’s classes grant it.';
    case 'known': {
      const granting = allowance.classes.find(
        (entry) => entry.allowance.state === 'known',
      );
      const where =
        granting === undefined
          ? ''
          : ` (${granting.class_name}, level ${granting.class_level})`;
      return `Weapon Mastery: ${chosen} of ${allowance.count} chosen${where}.`;
    }
    case 'unknown': {
      /*
       * Two different ignorances, and only one of them may claim a grant.
       *
       * `unsourced` is a SOURCED fact: the class grants Weapon Mastery and the
       * count is not in `docs/srd/source/`. Naming the grant is honest.
       *
       * `content_missing` means there is no grant row at all, or a
       * `counts_known` class whose counts table is short. The first case is an
       * unseeded database, where we do not know whether the class grants
       * anything — so "grants it" would assert exactly what we are missing.
       * This module's rule is that absent content is a state and never a
       * number; saying "grants it" on no evidence is the same mistake one
       * level up, a missing row rendered as a fact.
       *
       * One sentence covers both `content_missing` causes because it claims
       * nothing: for a short counts table it under-claims, which is the safe
       * direction to be wrong in.
       */
      const sourced = allowance.classes.find(
        (entry) => entry.allowance.state === 'unsourced',
      );
      if (sourced !== undefined) {
        const name = sourced.class_name;
        return (
          `Weapon Mastery: ${name} grants it, but this application does not ` +
          `have the count for ${name}. ${chosen} chosen. Choose what your ` +
          'table agrees on.'
        );
      }
      const missing = allowance.classes.find(
        (entry) => entry.allowance.state === 'content_missing',
      );
      const name = missing?.class_name ?? 'that class';
      return (
        `Weapon Mastery: this application does not have the Weapon Mastery ` +
        `data for ${name}, so it cannot say whether it is granted or how ` +
        `many. ${chosen} chosen. Choose what your table agrees on.`
      );
    }
    case 'unresolved': {
      const parts = allowance.classes
        .filter((entry) => entry.allowance.state !== 'not_granted')
        .map((entry) => {
          const state = entry.allowance;
          return state.state === 'known'
            ? `${entry.class_name} grants ${state.count}`
            : `${entry.class_name} grants it (count not available)`;
        });
      return (
        `Weapon Mastery: ${parts.join(', ')}. This application does not know ` +
        `how these combine when multiclassing. ${chosen} chosen.`
      );
    }
  }
}

/**
 * True only when the application is CERTAIN the user has over-chosen.
 *
 * Certainty needs a single granting class with a sourced count, which is the
 * only state in which `known` is produced. Every other state leaves selection
 * fully available and produces no warning, because a warning the app cannot
 * justify is worse than none.
 */
export function masteryOverselected(panel: WeaponsPanel): boolean {
  return (
    panel.allowance.state === 'known' &&
    panel.selected_count > panel.allowance.count
  );
}

function renderMasteryBlock(panel: WeaponsPanel): HTMLElement {
  const block = document.createElement('div');
  block.className = 'weapon-mastery-status';
  block.dataset.testid = 'weapon-mastery-status';
  const statement = document.createElement('p');
  statement.textContent = masteryStatement(panel);
  block.append(statement);
  if (masteryOverselected(panel)) {
    const warning = document.createElement('p');
    warning.className = 'weapon-mastery-warning';
    warning.setAttribute('role', 'status');
    warning.dataset.testid = 'weapon-mastery-warning';
    warning.textContent =
      'More weapons have mastery selected than this character’s allowance. ' +
      'Nothing is blocked; sort it out at the table.';
    block.append(warning);
  }
  return block;
}

function renderList(
  panel: WeaponsPanel,
  actions: PlannerWeaponActions,
  disabled: boolean,
  onEditingChanged: WeaponsPanelOptions['onEditingChanged'],
): HTMLElement {
  const table = document.createElement('table');
  table.className = 'weapon-table';
  table.dataset.testid = 'weapon-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Weapons carried by this character';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const showMastery = panel.allowance.state !== 'none';
  const headings = [
    'Weapon',
    'Damage',
    'Properties',
    'Mastery property',
    ...(showMastery ? ['Mastery selected'] : []),
    'Actions',
  ];
  for (const heading of headings) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = heading;
    headRow.append(cell);
  }
  head.append(headRow);
  const body = document.createElement('tbody');

  for (const weapon of panel.weapons) {
    const row = document.createElement('tr');
    row.dataset.weaponId = String(weapon.id);
    const name = document.createElement('th');
    name.scope = 'row';
    // The name is the user's own text, and may equally have arrived from
    // somewhere else; it is marked where it is rendered, like every other
    // free text on this screen.
    name.append(freeTextSpan(weapon.name));
    row.append(name);
    for (const text of [
      damageSummary(weapon),
      propertySummary(weapon),
      weapon.mastery_property ?? 'none',
    ]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }
    if (showMastery) {
      const cell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = weapon.mastery_selected;
      checkbox.disabled = disabled || weapon.mastery_property === null;
      checkbox.dataset.focusKey = `weapon-mastery-${weapon.id}`;
      checkbox.setAttribute(
        'aria-label',
        weapon.mastery_property === null
          ? `${weapon.name} has no mastery property`
          : `Select ${weapon.mastery_property} mastery for ${weapon.name}`,
      );
      checkbox.addEventListener('change', () =>
        actions.setWeaponMastery(weapon.id, checkbox.checked),
      );
      cell.append(checkbox);
      row.append(cell);
    }
    const actionsCell = document.createElement('td');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'button-secondary';
    edit.textContent = 'Edit';
    // The weapon's name is in the ACCESSIBLE name, not only the visible one, so
    // "remove the longsword" is unambiguous to something driving by name.
    edit.setAttribute('aria-label', `Edit ${weapon.name}`);
    edit.disabled = disabled;
    edit.addEventListener('click', () => onEditingChanged(weapon.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button-secondary';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${weapon.name}`);
    remove.disabled = disabled;
    remove.addEventListener('click', () =>
      actions.removeWeapon(weapon.id, weapon.name),
    );
    actionsCell.append(edit, remove);
    row.append(actionsCell);
    body.append(row);
  }

  table.append(caption, head, body);
  return table;
}

function renderForm(
  options: WeaponsPanelOptions,
  initial: WeaponFields,
  weaponId: number | null,
): HTMLElement {
  const form = document.createElement('form');
  form.className = 'weapon-form';
  form.dataset.testid = 'weapon-form';
  form.noValidate = true;
  const legendText =
    weaponId === null ? 'Add a weapon' : `Edit ${initial.name}`;
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = legendText;
  fieldset.append(legend);
  fieldset.disabled = options.disabled;

  // Mutable draft. The template picker rewrites it and re-renders the fields;
  // every field stays editable afterwards, which is the whole point of storing
  // values rather than a template reference.
  let draft: WeaponFields = { ...initial };

  const fields = document.createElement('div');
  fields.className = 'weapon-form-fields';

  const rebuild = (): void => {
    fields.replaceChildren();

    const name = textInput('weapon-name', draft.name, WEAPON_TEXT_LIMITS.name);
    name.required = true;
    name.addEventListener('input', () => {
      draft = { ...draft, name: name.value };
    });
    fields.append(labelled('Name', name, 'weapon-name'));

    const damage = textInput(
      'weapon-damage-dice',
      draft.damage_dice,
      WEAPON_TEXT_LIMITS.damage_dice,
    );
    damage.addEventListener('input', () => {
      draft = { ...draft, damage_dice: trimmedOrNull(damage.value) };
    });
    fields.append(labelled('Damage dice', damage, 'weapon-damage-dice'));

    const damageType = textInput(
      'weapon-damage-type',
      draft.damage_type,
      WEAPON_TEXT_LIMITS.damage_type,
    );
    damageType.setAttribute('list', 'weapon-damage-types');
    damageType.addEventListener('input', () => {
      draft = { ...draft, damage_type: trimmedOrNull(damageType.value) };
    });
    const datalist = document.createElement('datalist');
    datalist.id = 'weapon-damage-types';
    for (const type of SUGGESTED_DAMAGE_TYPES) {
      const entry = document.createElement('option');
      entry.value = type;
      datalist.append(entry);
    }
    fields.append(
      labelled('Damage type', damageType, 'weapon-damage-type'),
      datalist,
    );

    const versatile = textInput(
      'weapon-versatile-dice',
      draft.versatile_damage_dice,
      WEAPON_TEXT_LIMITS.versatile_damage_dice,
    );
    versatile.addEventListener('input', () => {
      draft = {
        ...draft,
        versatile_damage_dice: trimmedOrNull(versatile.value),
      };
    });
    fields.append(
      labelled('Versatile damage dice', versatile, 'weapon-versatile-dice'),
    );

    const toggles = document.createElement('fieldset');
    toggles.className = 'weapon-toggles';
    const togglesLegend = document.createElement('legend');
    togglesLegend.textContent = 'Properties';
    toggles.append(togglesLegend);
    for (const [key, label] of TOGGLE_LABELS) {
      const wrapper = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = draft[key] === true;
      checkbox.dataset.focusKey = `weapon-${key}`;
      checkbox.addEventListener('change', () => {
        draft = { ...draft, [key]: checkbox.checked };
      });
      const caption = document.createElement('span');
      caption.textContent = label;
      wrapper.append(checkbox, caption);
      toggles.append(wrapper);
    }
    fields.append(toggles);

    const kind = textInput(
      'weapon-ammunition-kind',
      draft.ammunition_kind,
      WEAPON_TEXT_LIMITS.ammunition_kind,
    );
    kind.addEventListener('input', () => {
      draft = { ...draft, ammunition_kind: trimmedOrNull(kind.value) };
    });
    fields.append(
      labelled('Ammunition kind', kind, 'weapon-ammunition-kind'),
    );

    const normal = numberInput('weapon-range-normal', draft.range_normal_feet);
    normal.addEventListener('input', () => {
      draft = { ...draft, range_normal_feet: integerOrNull(normal.value) };
    });
    fields.append(
      labelled('Normal range (feet)', normal, 'weapon-range-normal'),
    );

    const long = numberInput('weapon-range-long', draft.range_long_feet);
    long.addEventListener('input', () => {
      draft = { ...draft, range_long_feet: integerOrNull(long.value) };
    });
    fields.append(labelled('Long range (feet)', long, 'weapon-range-long'));

    const mastery = document.createElement('select');
    mastery.dataset.focusKey = 'weapon-mastery-property';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'None';
    none.selected = draft.mastery_property === null;
    mastery.append(none);
    for (const property of weaponMasteryProperties) {
      const entry = document.createElement('option');
      entry.value = property;
      entry.textContent = property;
      entry.selected = draft.mastery_property === property;
      mastery.append(entry);
    }
    mastery.addEventListener('change', () => {
      draft = {
        ...draft,
        mastery_property:
          mastery.value === ''
            ? null
            : (mastery.value as WeaponMasteryProperty),
      };
    });
    fields.append(
      labelled('Mastery property', mastery, 'weapon-mastery-property'),
    );

    const other = textInput(
      'weapon-other-properties',
      draft.other_properties,
      WEAPON_TEXT_LIMITS.other_properties,
    );
    other.addEventListener('input', () => {
      draft = { ...draft, other_properties: trimmedOrNull(other.value) };
    });
    fields.append(
      labelled('Other properties', other, 'weapon-other-properties'),
    );

    const notes = document.createElement('textarea');
    notes.maxLength = WEAPON_TEXT_LIMITS.notes;
    notes.value = draft.notes ?? '';
    notes.dataset.focusKey = 'weapon-notes';
    notes.addEventListener('input', () => {
      draft = { ...draft, notes: trimmedOrNull(notes.value) };
    });
    fields.append(labelled('Notes', notes, 'weapon-notes'));
  };

  // The picker is only offered when ADDING. Re-filling an existing weapon from
  // a template would overwrite edits the user made on purpose, and there is no
  // link to "re-sync" because there is deliberately no link at all.
  if (weaponId === null) {
    const picker = document.createElement('select');
    picker.dataset.focusKey = 'weapon-template';
    const custom = document.createElement('option');
    custom.value = '';
    custom.textContent = 'Custom weapon (fill in yourself)';
    picker.append(custom);
    const groups = new Map<SrdWeaponGroup, HTMLOptGroupElement>();
    for (const template of options.panel.templates) {
      let group = groups.get(template.srd_group);
      if (group === undefined) {
        group = document.createElement('optgroup');
        group.label = GROUP_LABELS[template.srd_group];
        groups.set(template.srd_group, group);
        picker.append(group);
      }
      const entry = document.createElement('option');
      entry.value = String(template.id);
      entry.textContent = template.name;
      group.append(entry);
    }
    picker.addEventListener('change', () => {
      const chosen = options.panel.templates.find(
        (template) => String(template.id) === picker.value,
      );
      draft = chosen === undefined ? blankWeapon() : weaponFromTemplate(chosen);
      rebuild();
    });
    fieldset.append(
      labelled('Start from a reference weapon', picker, 'weapon-template'),
    );
  }

  rebuild();
  fieldset.append(fields);

  const controls = document.createElement('div');
  controls.className = 'weapon-form-controls';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = weaponId === null ? 'Add weapon' : 'Save weapon';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => options.onEditingChanged(null));
  controls.append(submit, cancel);
  fieldset.append(controls);

  const error = document.createElement('p');
  error.className = 'weapon-form-error';
  error.setAttribute('role', 'alert');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (draft.name.trim() === '') {
      error.textContent = 'A weapon needs a name.';
      form.append(error);
      return;
    }
    if (weaponId === null) {
      options.actions.addWeapon(draft);
    } else {
      options.actions.updateWeapon(weaponId, draft);
    }
    options.onEditingChanged(null);
  });

  form.append(fieldset);
  return form;
}

export function renderWeapons(options: WeaponsPanelOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel weapons-panel';
  section.dataset.testid = 'weapons-panel';
  const heading = document.createElement('h2');
  heading.textContent = 'Weapons';
  section.append(heading);

  // A portability notice used to stand here, saying weapons were left out of
  // backups, share links and save points. They are not, so it is gone: a false
  // warning on screen is worse than the gap it described.
  section.append(renderMasteryBlock(options.panel));

  if (options.panel.weapons.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No weapons recorded for this character.';
    section.append(empty);
  } else {
    section.append(
      renderList(
        options.panel,
        options.actions,
        options.disabled,
        options.onEditingChanged,
      ),
    );
  }

  if (options.editing === null) {
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add weapon';
    add.dataset.focusKey = 'weapon-add';
    add.disabled = options.disabled;
    add.addEventListener('click', () => options.onEditingChanged('new'));
    section.append(add);
    return section;
  }

  const editingWeapon =
    options.editing === 'new'
      ? null
      : (options.panel.weapons.find(
          (weapon) => weapon.id === options.editing,
        ) ?? null);
  if (options.editing !== 'new' && editingWeapon === null) {
    // The weapon vanished under the form — removed in another tab, or undone.
    // Closing is the honest response; keeping a form over a missing row would
    // save edits to nothing.
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add weapon';
    add.disabled = options.disabled;
    add.addEventListener('click', () => options.onEditingChanged('new'));
    section.append(add);
    return section;
  }

  const { id: _id, mastery_selected: _selected, ...initial } =
    editingWeapon ?? { id: 0, mastery_selected: false, ...blankWeapon() };
  section.append(
    renderForm(options, initial, editingWeapon === null ? null : editingWeapon.id),
  );
  return section;
}
