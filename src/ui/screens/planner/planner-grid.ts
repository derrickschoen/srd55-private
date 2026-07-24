import type {
  EligibleSpell,
  Workspace,
  WorkspaceSlot,
} from '../../../domain/read-models';
import type { EligibleSpellClient } from './spell-picker';
import { createSpellPicker, type SpellPicker } from './spell-picker';

export type SelectionFilter = 'all' | 'selected' | 'empty';
export type TraitFilter =
  | 'all'
  | 'duplicates'
  | 'rituals'
  | 'concentration'
  | 'non_concentration';
export type SortKey = 'source' | 'label' | 'bucket';

export interface GridFilters {
  selection: SelectionFilter;
  trait: TraitFilter;
  source: string;
  level: string;
  sortKey: SortKey;
  sortDirection: 1 | -1;
}

export const defaultGridFilters: GridFilters = {
  selection: 'all',
  trait: 'all',
  source: 'all',
  level: 'all',
  sortKey: 'source',
  sortDirection: 1,
};

export function filterAndSortSlots(
  slots: readonly WorkspaceSlot[],
  filters: GridFilters,
): WorkspaceSlot[] {
  return slots
    .filter((slot) => {
      if (filters.selection === 'selected' && slot.spell_id === null) {
        return false;
      }
      if (filters.selection === 'empty' && slot.spell_id !== null) {
        return false;
      }
      if (
        filters.trait === 'duplicates' &&
        slot.duplicate_status === 'none'
      ) {
        return false;
      }
      if (filters.trait === 'rituals' && !slot.ritual) return false;
      if (
        filters.trait === 'concentration' &&
        !slot.concentration
      ) {
        return false;
      }
      if (
        filters.trait === 'non_concentration' &&
        slot.concentration
      ) {
        return false;
      }
      if (filters.source !== 'all' && slot.source !== filters.source) {
        return false;
      }
      if (
        filters.level !== 'all' &&
        slot.spell_level !== Number(filters.level)
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const a = left[filters.sortKey] ?? '';
      const b = right[filters.sortKey] ?? '';
      return (
        String(a).localeCompare(String(b), undefined, {
          numeric: true,
        }) * filters.sortDirection
      );
    });
}

function title(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function castingMath(slot: WorkspaceSlot): string {
  const signed = (value: number) => (value >= 0 ? `+${value}` : value);
  if (slot.attack_bonus !== null && slot.save_dc !== null) {
    return `${signed(slot.attack_bonus)} / ${slot.save_dc}`;
  }
  if (slot.attack_bonus !== null) return String(signed(slot.attack_bonus));
  if (slot.save_dc !== null) return String(slot.save_dc);
  return '—';
}

function select(
  label: string,
  value: string,
  choices: readonly [string, string][],
  onChange: (value: string) => void,
): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'planner-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement('select');
  input.className = 'planner-input';
  for (const [optionValue, optionLabel] of choices) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    input.append(option);
  }
  input.addEventListener('change', () => onChange(input.value));
  wrapper.append(caption, input);
  return wrapper;
}

export function renderPlannerGrid(options: {
  workspace: Workspace;
  filters: GridFilters;
  queries: EligibleSpellClient;
  disabled: boolean;
  onFiltersChanged(): void;
  onSelect(slot: WorkspaceSlot, spell: EligibleSpell): void;
  onClear(slot: WorkspaceSlot): void;
  onOverride(slot: WorkspaceSlot, note: string): void;
}): { element: HTMLElement; destroy(): void } {
  const section = document.createElement('section');
  section.className = 'planner-panel planner-grid-panel';
  const heading = document.createElement('div');
  heading.className = 'grid-heading';
  const titleNode = document.createElement('h2');
  titleNode.textContent = 'Spell choice slots';
  const controls = document.createElement('div');
  controls.className = 'grid-filters';
  const sources = [
    ...new Set(options.workspace.slots.map((slot) => slot.source)),
  ].sort();
  controls.append(
    select(
      'Selection',
      options.filters.selection,
      [
        ['all', 'Selected + empty'],
        ['selected', 'Selected only'],
        ['empty', 'Empty only'],
      ],
      (value) => {
        options.filters.selection = value as SelectionFilter;
        options.onFiltersChanged();
      },
    ),
    select(
      'Traits',
      options.filters.trait,
      [
        ['all', 'All traits'],
        ['duplicates', 'Duplicates'],
        ['rituals', 'Rituals'],
        ['concentration', 'Concentration'],
        ['non_concentration', 'Non-concentration'],
      ],
      (value) => {
        options.filters.trait = value as TraitFilter;
        options.onFiltersChanged();
      },
    ),
    select(
      'Source',
      options.filters.source,
      [
        ['all', 'All sources'],
        ...sources.map(
          (source): [string, string] => [source, source],
        ),
      ],
      (value) => {
        options.filters.source = value;
        options.onFiltersChanged();
      },
    ),
    select(
      'Selected spell level',
      options.filters.level,
      [
        ['all', 'All levels'],
        ...Array.from(
          { length: 10 },
          (_, level): [string, string] => [
            String(level),
            `Level ${level}`,
          ],
        ),
      ],
      (value) => {
        options.filters.level = value;
        options.onFiltersChanged();
      },
    ),
  );
  const filtered = filterAndSortSlots(
    options.workspace.slots,
    options.filters,
  );
  const count = document.createElement('p');
  count.className = 'grid-count';
  count.textContent = `Showing ${filtered.length} of ${options.workspace.slots.length} slots. Search results contain eligible spells only.`;
  heading.append(titleNode, controls, count);
  section.append(heading);

  const scroller = document.createElement('div');
  scroller.className = 'grid-scroll';
  const table = document.createElement('table');
  table.className = 'planner-grid';
  const headers: Array<[string, SortKey | null]> = [
    ['Source', 'source'],
    ['Slot label', 'label'],
    ['Bucket', 'bucket'],
    ['Level range', null],
    ['Current selection', null],
    ['Ability', null],
    ['Attack/DC', null],
    ['Concentration', null],
    ['Ritual', null],
    ['Duplicate', null],
    ['State', null],
  ];
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  for (const [label, key] of headers) {
    const cell = document.createElement('th');
    if (key === null) cell.textContent = label;
    else {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent =
        label +
        (options.filters.sortKey === key
          ? options.filters.sortDirection === 1
            ? ' ↑'
            : ' ↓'
          : '');
      button.addEventListener('click', () => {
        if (options.filters.sortKey === key) {
          options.filters.sortDirection =
            options.filters.sortDirection === 1 ? -1 : 1;
        } else {
          options.filters.sortKey = key;
          options.filters.sortDirection = 1;
        }
        options.onFiltersChanged();
      });
      cell.append(button);
    }
    headerRow.append(cell);
  }
  const body = table.createTBody();
  const pickers: SpellPicker[] = [];
  for (const slot of filtered) {
    const attention =
      slot.eligibility === 'invalid' || slot.state !== 'active';
    const row = body.insertRow();
    row.className = attention ? 'slot-attention' : '';
    row.dataset.slotId = String(slot.id);
    const values = [
      slot.source,
      slot.label,
      title(slot.bucket),
      `L${slot.level_min}–${slot.level_max}`,
    ];
    for (const value of values) row.insertCell().textContent = value;
    const selection = row.insertCell();
    let pickerForSlot: SpellPicker | undefined;
    if (slot.locked) {
      selection.textContent = slot.spell_name ?? 'Locked grant';
    } else {
      const picker = createSpellPicker({
        characterId: options.workspace.report.character.id,
        slotId: slot.id,
        value: slot.spell_name,
        invalid: attention,
        disabled: options.disabled,
        queries: options.queries,
        onSelect: (spell) => options.onSelect(slot, spell),
      });
      pickerForSlot = picker;
      pickers.push(picker);
      selection.append(picker.element);
      if (
        slot.state === 'active' &&
        slot.eligibility !== 'invalid' &&
        slot.spell_name !== null
      ) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'button-danger compact';
        clear.textContent = 'Clear';
        clear.setAttribute(
          'aria-label',
          `Clear selection for slot ${slot.id}`,
        );
        clear.disabled = options.disabled;
        clear.addEventListener('click', () => options.onClear(slot));
        selection.append(clear);
      }
    }
    row.insertCell().textContent =
      slot.ability?.slice(0, 3).toUpperCase() ?? '—';
    row.insertCell().textContent = castingMath(slot);
    row.insertCell().textContent = slot.concentration ? '◆ Yes' : '— No';
    row.insertCell().textContent = slot.ritual ? '◇ Yes' : '— No';
    row.insertCell().textContent =
      slot.duplicate_status === 'none'
        ? '— None'
        : `⚠ ${title(slot.duplicate_status)}`;
    row.insertCell().textContent =
      slot.state === 'active' && slot.eligibility !== 'invalid'
        ? `✓ ${title(slot.eligibility)}`
        : `⚠ ${title(slot.state)}`;
    if (attention) {
      const detailRow = body.insertRow();
      detailRow.className = 'slot-attention slot-attention-detail';
      const detail = detailRow.insertCell();
      detail.colSpan = 11;
      const explanation = document.createElement('p');
      explanation.innerHTML =
        '<strong>⚠ Selection needs attention.</strong> ';
      explanation.append(
        slot.invalid_reason ??
          slot.orphan_reason ??
          'This selection is being kept as an explicit override.',
      );
      if (slot.override_note !== null) {
        explanation.append(` Note: ${slot.override_note}`);
      }
      const replace = document.createElement('button');
      replace.type = 'button';
      replace.className = 'button-secondary';
      replace.textContent = 'Replace';
      replace.disabled = pickerForSlot === undefined;
      replace.addEventListener('click', () => {
        pickerForSlot?.focus();
      });
      const note = document.createElement('input');
      note.className = 'planner-input';
      note.placeholder = 'Why this house rule is allowed';
      note.setAttribute('aria-label', `Override note for slot ${slot.id}`);
      const keep = document.createElement('button');
      keep.type = 'button';
      keep.className = 'button-secondary';
      keep.textContent = 'Keep as override';
      keep.addEventListener('click', () => {
        if (note.value.trim() !== '') {
          options.onOverride(slot, note.value.trim());
        }
      });
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'button-danger';
      clear.textContent = 'Clear';
      clear.addEventListener('click', () => options.onClear(slot));
      detail.append(explanation, replace, note, keep, clear);
    }
  }
  if (filtered.length === 0) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 11;
    cell.className = 'empty-cell';
    cell.textContent =
      'No slots match these filters. Clear a filter to see more choices.';
  }
  scroller.append(table);
  section.append(scroller);
  return {
    element: section,
    destroy: () => pickers.forEach((picker) => picker.destroy()),
  };
}
