import {
  damageType as toDamageType,
  type WeaponAttackKind,
  weaponMasteryProperties,
  weaponProficiencyCategories,
  type SrdWeaponGroup,
  type WeaponMasteryProperty,
  type WeaponProficiencyCategory,
} from '../../../domain/enums';
import type { WeaponFields } from '../../../domain/command-contracts';
import {
  formatWeaponDamage,
  type VersatileWeaponDamage,
  type WeaponDamage,
} from '../../../domain/weapon-damage';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../../../domain/weapon-limits';
import type {
  CharacterWeapon,
  WeaponsPanel,
  WeaponTemplate,
} from '../../../domain/read-models';
import { catalogSelectGroups } from '../../catalog-control-disclosure';
import type { WeaponRange } from '../../../domain/weapon-range';
import { freeTextSpan } from '../../free-text';
import { renderAttackProfiles } from './attack-profiles';
import {
  weaponAttackKindOf,
  weaponProficiencyCategoryOf,
} from '../../../rules/weapon-template-fold';

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
 * asserts that licensor wordmarks appear in neither the page title nor the body
 * text, because the licence asks that no attribution to the licensor appear
 * beyond the required notice. Every string in this file is written under that
 * rule: the picker says "Simple Melee", never anything carrying a
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
    // NOT STATED, which is the correct starting value for a weapon someone is
    // typing in by hand: this application does not know whether their invented
    // weapon is simple or martial, and guessing `simple` would hand them a
    // proficiency bonus nobody sourced.
    proficiency_category: null,
    attack_kind: null,
    damage: { kind: 'not_recorded' },
    damage_type: null,
    versatile_damage: { kind: 'not_applicable' },
    finesse: false,
    heavy: false,
    light: false,
    loading: false,
    reach: false,
    thrown: false,
    two_handed: false,
    ammunition: false,
    ammunition_kind: null,
    range: { kind: 'none' },
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
  const {
    id: _id,
    content_key: _key,
    srd_group: group,
    catalog_layer: _layer,
    ...profile
  } = template;
  return {
    ...profile,
    notes: null,
    proficiency_category: weaponProficiencyCategoryOf(group),
    attack_kind: weaponAttackKindOf(group),
  };
}

/**
 * The two `srd_group` folds moved to `src/rules/weapon-template-fold.ts` when
 * the equipment mint became their second caller — a worker-side module must
 * not import this DOM-building one. Re-exported so existing importers keep
 * working; the fold still happens in exactly ONE place.
 */
export { weaponAttackKindOf, weaponProficiencyCategoryOf };

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
  const amount =
    weapon.damage.kind === 'not_recorded'
      ? null
      : formatWeaponDamage(weapon.damage);
  const base = [amount, weapon.damage_type]
    .filter((part): part is string => part !== null)
    .join(' ');
  const versatile =
    weapon.versatile_damage.kind === 'not_applicable'
      ? ''
      : ` (Versatile ${formatWeaponDamage(weapon.versatile_damage)})`;
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
  const range = weaponRangeSummary(weapon.range);
  if (range !== null) {
    parts.push(range);
  }
  if (weapon.other_properties !== null) {
    parts.push(weapon.other_properties);
  }
  return parts.length === 0 ? 'none' : parts.join(', ');
}

function weaponRangeSummary(range: WeaponRange): string | null {
  switch (range.kind) {
    case 'none':
      return null;
    case 'ranged':
      return range.far_feet === null
        ? `Range ${range.near_feet} ft`
        : `Range ${range.near_feet}/${range.far_feet} ft`;
    case 'legacy':
      return `Legacy range ${range.near_feet ?? '—'}/${range.far_feet} ft (repair required)`;
  }
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
  let rangeError: string | null = null;
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

    // D27. A pre-filled weapon already carries the category folded out of its
    // template, so this control mostly confirms it; it exists for the weapon
    // someone typed in, which the picker never touched.
    //
    // "NOT STATED" IS A REAL FIRST OPTION AND NOT A PLACEHOLDER, for the reason
    // D20 records about the damage-type select: a `<select>` has no empty state,
    // so without an option for it the undecided case becomes unreachable after
    // any pick, and a user who set `martial` by mistake could never take it back
    // to "I do not know".
    const category = document.createElement('select');
    category.dataset.focusKey = 'weapon-proficiency-category';
    const unstated = document.createElement('option');
    unstated.value = '';
    unstated.textContent = 'Not stated';
    unstated.selected = draft.proficiency_category === null;
    category.append(unstated);
    for (const member of weaponProficiencyCategories) {
      const entry = document.createElement('option');
      entry.value = member;
      entry.textContent = member === 'simple' ? 'Simple' : 'Martial';
      entry.selected = draft.proficiency_category === member;
      category.append(entry);
    }
    category.addEventListener('change', () => {
      draft = {
        ...draft,
        proficiency_category:
          category.value === ''
            ? null
            : (category.value as WeaponProficiencyCategory),
      };
    });
    fields.append(
      labelled(
        'Simple or martial',
        category,
        'weapon-proficiency-category',
      ),
    );

    const damageKind = document.createElement('select');
    for (const [value, label] of [
      ['not_recorded', 'Not recorded'],
      ['dice', 'Dice'],
      ['flat', 'Flat'],
      ['custom', 'Custom'],
    ] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = draft.damage.kind === value;
      damageKind.append(option);
    }
    damageKind.addEventListener('change', () => {
      const kind = damageKind.value;
      draft = {
        ...draft,
        damage:
          kind === 'dice'
            ? { kind, dice: '' }
            : kind === 'flat'
              ? { kind, amount: 0 }
              : kind === 'custom'
                ? { kind, text: '' }
                : { kind: 'not_recorded' },
      };
      rebuild();
    });
    fields.append(labelled('Damage kind', damageKind, 'weapon-damage-kind'));
    if (draft.damage.kind === 'dice') {
      const damage = textInput(
        'weapon-damage-dice',
        draft.damage.dice,
        WEAPON_TEXT_LIMITS.damage_dice,
      );
      damage.addEventListener('input', () => {
        draft = { ...draft, damage: { kind: 'dice', dice: damage.value } };
      });
      fields.append(labelled('Damage dice', damage, 'weapon-damage-dice'));
    } else if (draft.damage.kind === 'flat') {
      const damage = numberInput('weapon-damage-flat', draft.damage.amount);
      damage.addEventListener('input', () => {
        draft = {
          ...draft,
          damage: { kind: 'flat', amount: integerOrNull(damage.value) ?? 0 },
        };
      });
      fields.append(labelled('Flat damage', damage, 'weapon-damage-flat'));
    } else if (draft.damage.kind === 'custom') {
      const damage = textInput(
        'weapon-damage-custom',
        draft.damage.text,
        WEAPON_TEXT_LIMITS.damage_custom,
      );
      damage.addEventListener('input', () => {
        draft = { ...draft, damage: { kind: 'custom', text: damage.value } };
      });
      fields.append(labelled('Custom damage', damage, 'weapon-damage-custom'));
    }

    const damageType = textInput(
      'weapon-damage-type',
      draft.damage_type,
      WEAPON_TEXT_LIMITS.damage_type,
    );
    damageType.setAttribute('list', 'weapon-damage-types');
    damageType.addEventListener('input', () => {
      const value = trimmedOrNull(damageType.value);
      draft = {
        ...draft,
        damage_type: value === null ? null : toDamageType(value),
      };
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

    const versatileKind = document.createElement('select');
    for (const [value, label] of [
      ['not_applicable', 'Not applicable'],
      ['dice', 'Dice'],
      ['flat', 'Flat'],
      ['custom', 'Custom'],
    ] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = draft.versatile_damage.kind === value;
      versatileKind.append(option);
    }
    versatileKind.addEventListener('change', () => {
      const kind = versatileKind.value;
      let versatileDamage: VersatileWeaponDamage;
      if (kind === 'dice') versatileDamage = { kind, dice: '' };
      else if (kind === 'flat') versatileDamage = { kind, amount: 0 };
      else if (kind === 'custom') versatileDamage = { kind, text: '' };
      else versatileDamage = { kind: 'not_applicable' };
      draft = { ...draft, versatile_damage: versatileDamage };
      rebuild();
    });
    fields.append(
      labelled(
        'Versatile damage kind',
        versatileKind,
        'weapon-versatile-damage-kind',
      ),
    );
    if (draft.versatile_damage.kind === 'dice') {
      const versatile = textInput(
        'weapon-versatile-dice',
        draft.versatile_damage.dice,
        WEAPON_TEXT_LIMITS.versatile_damage_dice,
      );
      versatile.addEventListener('input', () => {
        draft = {
          ...draft,
          versatile_damage: { kind: 'dice', dice: versatile.value },
        };
      });
      fields.append(
        labelled('Versatile damage dice', versatile, 'weapon-versatile-dice'),
      );
    } else if (draft.versatile_damage.kind === 'flat') {
      const versatile = numberInput(
        'weapon-versatile-flat',
        draft.versatile_damage.amount,
      );
      versatile.addEventListener('input', () => {
        draft = {
          ...draft,
          versatile_damage: {
            kind: 'flat',
            amount: integerOrNull(versatile.value) ?? 0,
          },
        };
      });
      fields.append(
        labelled(
          'Versatile flat damage',
          versatile,
          'weapon-versatile-flat',
        ),
      );
    } else if (draft.versatile_damage.kind === 'custom') {
      const versatile = textInput(
        'weapon-versatile-custom',
        draft.versatile_damage.text,
        WEAPON_TEXT_LIMITS.versatile_damage_custom,
      );
      versatile.addEventListener('input', () => {
        draft = {
          ...draft,
          versatile_damage: { kind: 'custom', text: versatile.value },
        };
      });
      fields.append(
        labelled(
          'Versatile custom damage',
          versatile,
          'weapon-versatile-custom',
        ),
      );
    }

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

    if (draft.range.kind === 'legacy') {
      const warning = document.createElement('p');
      warning.setAttribute('role', 'status');
      warning.textContent =
        'Imported legacy range: preserve it unchanged, or enter a valid near/far pair to repair it.';
      fields.append(warning);
    }
    const nearValue =
      draft.range.kind === 'none' ? null : draft.range.near_feet;
    const farValue =
      draft.range.kind === 'none' ? null : draft.range.far_feet;
    const normal = numberInput('weapon-range-normal', nearValue);
    fields.append(
      labelled('Near range (feet)', normal, 'weapon-range-normal'),
    );

    const far = numberInput('weapon-range-long', farValue);
    fields.append(labelled('Far range (feet)', far, 'weapon-range-long'));
    const updateRange = (): void => {
      const nearFeet = integerOrNull(normal.value);
      const farFeet = integerOrNull(far.value);
      if (nearFeet === null && farFeet === null) {
        rangeError = null;
        draft = { ...draft, range: { kind: 'none' } };
        return;
      }
      if (nearFeet === null) {
        rangeError = 'A far range requires a near range.';
        return;
      }
      if (farFeet !== null && farFeet < nearFeet) {
        rangeError = 'Far range must be at least near range.';
        return;
      }
      rangeError = null;
      draft = {
        ...draft,
        range: { kind: 'ranged', near_feet: nearFeet, far_feet: farFeet },
      };
    };
    normal.addEventListener('input', updateRange);
    far.addEventListener('input', updateRange);

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
    picker.append(...catalogSelectGroups(options.panel.templates.map((template) => ({
      value: String(template.id),
      label: template.name,
      catalogLayer: template.catalog_layer,
      group: GROUP_LABELS[template.srd_group],
    }))));
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
    if (rangeError !== null) {
      error.textContent = rangeError;
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
    section.append(renderAttackProfiles(options.panel.attacks));
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
    section.append(renderAttackProfiles(options.panel.attacks));
    return section;
  }

  const { id: _id, mastery_selected: _selected, ...initial } =
    editingWeapon ?? { id: 0, mastery_selected: false, ...blankWeapon() };
  section.append(
    renderForm(options, initial, editingWeapon === null ? null : editingWeapon.id),
  );
  // The profiles stay on the page under the open form: they are what the user
  // is editing the weapon to change, and hiding them would make the edit blind.
  section.append(renderAttackProfiles(options.panel.attacks));
  return section;
}
