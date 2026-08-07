import {
  CHARACTER_EFFECT_FORM,
  FEATURE_ONLY_EFFECT_FORM,
  type AuthorableEffectKind,
  type AuthoringDraftCharacterEffect,
  type AuthoringDraftFeatureEffect,
} from '../../authoring/effect-forms';
import type { AuthoringValidationIssue } from '../../authoring/contracts';
import {
  abilities,
  characterEffectKinds,
  damageTypes,
  extraAttackWeaponScopes,
  featureTemplateEffectKinds,
  type FeatureTemplateEffectKind,
} from '../../domain/enums';
import { element } from '../dom';
import { freeTextSpan } from '../free-text';
import type { ScreenContext } from '../screen';

export type AuthoringEffectDraft =
  | AuthoringDraftCharacterEffect
  | AuthoringDraftFeatureEffect;

type CharacterEffectFormField = {
  [K in keyof typeof CHARACTER_EFFECT_FORM]:
    (typeof CHARACTER_EFFECT_FORM)[K]['fields'][number];
}[keyof typeof CHARACTER_EFFECT_FORM];

type FeatureEffectFormField = {
  [K in keyof typeof FEATURE_ONLY_EFFECT_FORM]:
    (typeof FEATURE_ONLY_EFFECT_FORM)[K]['fields'][number];
}[keyof typeof FEATURE_ONLY_EFFECT_FORM];

type RenderableEffectFormField = CharacterEffectFormField | FeatureEffectFormField;

export interface OrderedCardControlsOptions {
  readonly collectionKey: string;
  readonly itemKey: string;
  readonly accessibleName: string;
  readonly position: number;
  readonly count: number;
  readonly disabled?: boolean;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onRemove: () => void;
}

function authoringHost(control: HTMLElement): HTMLElement {
  let current: HTMLElement | null = control.parentElement;
  let formParent: HTMLElement | null = null;
  while (current !== null) {
    if (current.getAttribute('data-authoring-form-kind') !== null) return current;
    if (current.tagName.toLowerCase() === 'form') formParent = current.parentElement;
    current = current.parentElement;
  }
  return formParent ?? document.body;
}

/**
 * Keyboard buttons are the primary ordering interaction. A later form may add
 * drag and drop, but cannot replace these named, focusable controls.
 */
export function createOrderedCardControls(
  options: OrderedCardControlsOptions,
): HTMLDivElement {
  const controls = element('div', {
    className: 'authoring-card-controls',
    attributes: { 'aria-label': `Reorder ${options.accessibleName}` },
  });
  const button = (
    label: string,
    disabled: boolean,
    action: () => void,
    nextPosition: number | null,
  ): HTMLButtonElement => {
    const control = element('button', {
      text: label,
      attributes: {
        type: 'button',
        'aria-label': `${label} ${options.accessibleName}, item ${String(options.position)} of ${String(options.count)}`,
        'data-authoring-order-action': label.toLowerCase().replace(' ', '-'),
        'data-authoring-order-collection': options.collectionKey,
        'data-authoring-order-item': options.itemKey,
        'data-authoring-order-position': String(options.position),
      },
    });
    control.disabled = disabled || options.disabled === true;
    control.addEventListener('click', () => {
      const host = authoringHost(controls);
      action();

      const available = Array.from(host.querySelectorAll<HTMLButtonElement>(
        '[data-authoring-order-action]',
      ));
      const sameItem = available.filter((candidate) =>
        candidate.getAttribute('data-authoring-order-item') === options.itemKey
      );
      const sameCollection = available.filter((candidate) =>
        candidate.getAttribute('data-authoring-order-collection') === options.collectionKey
      );
      const requestedAction = label.toLowerCase().replace(' ', '-');
      const requested = sameItem.find((candidate) =>
        candidate.getAttribute('data-authoring-order-action') === requestedAction &&
        !candidate.disabled
      );
      const replacementPosition = Math.max(1, Math.min(options.position, options.count - 1));
      const replacement = label === 'Remove'
        ? sameCollection.find((candidate) =>
            candidate.getAttribute('data-authoring-order-position') === String(replacementPosition) &&
            !candidate.disabled
          )
        : sameItem.find((candidate) => !candidate.disabled);
      const liveAccessibleName = sameItem[0]?.parentElement
        ?.getAttribute('aria-label')?.replace(/^Reorder /u, '') ?? options.accessibleName;
      const status = Array.from(host.querySelectorAll<HTMLElement>('[role="status"]'))
        .find((candidate) => candidate.getAttribute('aria-live') !== null);
      if (status !== undefined) {
        status.textContent = label === 'Remove'
          ? `Removed ${options.accessibleName}.`
          : `Moved ${liveAccessibleName} to position ${String(nextPosition ?? options.position)} of ${String(options.count)}.`;
      }
      (requested ?? replacement)?.focus();
    });
    return control;
  };
  controls.append(
    button('Move up', options.position <= 1, options.onMoveUp, options.position - 1),
    button('Move down', options.position >= options.count, options.onMoveDown, options.position + 1),
    button('Remove', false, options.onRemove, null),
  );
  return controls;
}

function valueLabel(value: string | number | boolean | null): string {
  if (value === null || value === '') return 'not set';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

/** Plain-language preview generated from the same discriminated union as storage. */
export function effectPreview(effect: AuthoringEffectDraft): string {
  switch (effect.kind) {
    case 'damage_resistance':
      return `Resistance to ${valueLabel(effect.damage_type)} damage.`;
    case 'hp_modifier':
      return `Hit points: ${valueLabel(effect.hit_points_flat)} flat; ${valueLabel(effect.hit_points_per_level)} per character level.`;
    case 'speed':
      return `${valueLabel(effect.speed_bonus_feet)} feet to walking speed.`;
    case 'ability_increase':
      return `${valueLabel(effect.amount)} ${valueLabel(effect.ability)}, up to ${valueLabel(effect.maximum)}.`;
    case 'ability_override':
      return `Set ${valueLabel(effect.ability)} to at least ${valueLabel(effect.maximum)}.`;
    case 'armor_class_bonus':
      return `${valueLabel(effect.amount)} to Armor Class.`;
    case 'armor_class_formula':
      return `Armor Class ${valueLabel(effect.base)} + ${valueLabel(effect.ability_1)} + ${valueLabel(effect.ability_2)}; shield allowed: ${valueLabel(effect.allows_shield)}.`;
    case 'attack_ability_override':
      return `Use ${valueLabel(effect.ability)} for attacks with ${valueLabel(effect.weapon_scope)}.`;
    case 'weapon_attack_bonus':
      return `${valueLabel(effect.amount)} to attacks with ${valueLabel(effect.weapon_scope)}.`;
    case 'weapon_damage_bonus':
      return `${valueLabel(effect.amount)} damage with ${valueLabel(effect.weapon_scope)}.`;
    case 'extra_attack':
      return `${valueLabel(effect.attack_count)} total attacks with ${valueLabel(effect.weapon_scope)}.`;
  }
  const exhaustive: never = effect;
  return exhaustive;
}

function effectDefinition(kind: AuthorableEffectKind) {
  if (kind === 'extra_attack') return FEATURE_ONLY_EFFECT_FORM.extra_attack;
  return CHARACTER_EFFECT_FORM[kind];
}

export type AuthoringEffectFieldValue = string | number | boolean | null;

export interface EffectCardOptions {
  readonly effect: AuthoringEffectDraft;
  readonly position: number;
  readonly count: number;
  readonly allowFeatureOnly: boolean;
  readonly disabled?: boolean;
  /** Backend validation path owned by this effect within its aggregate. */
  readonly pathPrefix?: readonly (string | number)[];
  readonly onKindChange: (kind: AuthorableEffectKind) => void;
  readonly onCommonChange: (
    field: 'label' | 'notes',
    value: string | null,
  ) => void;
  readonly onFieldChange: (
    field: string,
    value: AuthoringEffectFieldValue,
  ) => void;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onRemove: () => void;
}

function appendOption(
  select: HTMLSelectElement,
  value: string,
  label: string,
): void {
  select.append(element('option', { text: label, attributes: { value } }));
}

function fieldValue(effect: AuthoringEffectDraft, key: string): unknown {
  return Reflect.get(effect, key);
}

function fieldControl(
  effect: AuthoringEffectDraft,
  field: RenderableEffectFormField,
  id: string,
  disabled: boolean,
  onChange: EffectCardOptions['onFieldChange'],
  path?: readonly (string | number)[],
): HTMLElement {
  const current = fieldValue(effect, field.key);
  if (field.control === 'boolean') {
    const input = element('input', {
      attributes: {
        id,
        type: 'checkbox',
        ...(path === undefined ? {} : { 'data-authoring-path': authoringPathKey(path) }),
      },
    });
    input.checked = current === true;
    input.disabled = disabled;
    input.addEventListener('change', () => onChange(field.key, input.checked));
    return input;
  }
  if (field.control === 'integer') {
    const input = element('input', {
      attributes: {
        id,
        type: 'number',
        min: String(field.minimum),
        max: String(field.maximum),
        step: '1',
        ...(field.required ? { required: '' } : {}),
        ...(path === undefined ? {} : { 'data-authoring-path': authoringPathKey(path) }),
      },
    });
    input.value = typeof current === 'number' ? String(current) : '';
    input.disabled = disabled;
    input.addEventListener('change', () => {
      const parsed = input.value.trim() === '' ? null : Number(input.value);
      onChange(field.key, Number.isSafeInteger(parsed) ? parsed : null);
    });
    return input;
  }
  if (field.control === 'damage_type') {
    const input = element('input', {
      attributes: {
        id,
        type: 'text',
        list: `${id}-known-values`,
        ...(field.required ? { required: '' } : {}),
        ...(path === undefined ? {} : { 'data-authoring-path': authoringPathKey(path) }),
      },
    });
    input.value = typeof current === 'string' ? current : '';
    input.disabled = disabled;
    input.addEventListener('change', () =>
      onChange(field.key, input.value === '' ? null : input.value),
    );
    const wrapper = element('span', { className: 'authoring-known-custom' });
    const suggestions = element('datalist', {
      attributes: { id: `${id}-known-values` },
    });
    for (const damageType of damageTypes) {
      suggestions.append(element('option', { attributes: { value: damageType } }));
    }
    wrapper.append(input, suggestions);
    return wrapper;
  }
  const select = element('select', {
    attributes: {
      id,
      ...(field.required ? { required: '' } : {}),
      ...(path === undefined ? {} : { 'data-authoring-path': authoringPathKey(path) }),
    },
  });
  appendOption(select, '', 'Choose…');
  const values = field.control === 'ability'
    ? abilities
    : extraAttackWeaponScopes;
  for (const value of values) appendOption(select, value, value.replaceAll('_', ' '));
  select.value = typeof current === 'string' ? current : '';
  select.disabled = disabled;
  select.addEventListener('change', () =>
    onChange(field.key, select.value === '' ? null : select.value),
  );
  return select;
}

function supportedKinds(allowFeatureOnly: boolean): readonly AuthorableEffectKind[] {
  return allowFeatureOnly
    ? featureTemplateEffectKinds
    : characterEffectKinds;
}

/**
 * Shared exhaustive card. Every structured field comes from the compile-time
 * effect registry; there is deliberately no generic numeric/"other" input.
 */
export function createEffectCard(options: EffectCardOptions): HTMLFieldSetElement {
  const { effect } = options;
  const disabled = options.disabled === true;
  const card = element('fieldset', {
    className: 'authoring-effect-card',
    attributes: {
      'data-draft-item-uuid': effect.draft_item_uuid,
      'aria-label': `Effect ${String(options.position)} of ${String(options.count)}: ${effect.label || effectDefinition(effect.kind).label}`,
    },
  });
  card.append(element('legend', {
    text: `Effect ${String(options.position)} — ${effectDefinition(effect.kind).label}`,
  }));

  const prefix = `authoring-effect-${effect.draft_item_uuid}`;
  const kind = element('select', { attributes: {
    id: `${prefix}-kind`,
    ...(options.pathPrefix === undefined
      ? {}
      : { 'data-authoring-path': authoringPathKey([...options.pathPrefix, 'kind']) }),
  } });
  for (const availableKind of supportedKinds(options.allowFeatureOnly)) {
    appendOption(kind, availableKind, effectDefinition(availableKind).label);
  }
  kind.value = effect.kind;
  kind.disabled = disabled;
  kind.addEventListener('change', () => {
    const next = supportedKinds(options.allowFeatureOnly).find(
      (candidate) => candidate === kind.value,
    );
    if (next !== undefined) options.onKindChange(next);
  });
  card.append(element('label', {
    text: 'Effect kind',
    attributes: { for: `${prefix}-kind` },
  }), kind);

  const label = element('input', {
    attributes: {
      id: `${prefix}-label`, type: 'text', required: '',
      ...(options.pathPrefix === undefined
        ? {}
        : { 'data-authoring-path': authoringPathKey([...options.pathPrefix, 'label']) }),
    },
  });
  label.value = effect.label;
  label.disabled = disabled;
  label.addEventListener('input', () => options.onCommonChange('label', label.value));
  card.append(element('label', {
    text: 'Label',
    attributes: { for: `${prefix}-label` },
  }), label);

  const definition = effectDefinition(effect.kind);
  for (const field of definition.fields) {
    const id = `${prefix}-${field.key}`;
    card.append(
      element('label', { text: field.label, attributes: { for: id } }),
      fieldControl(
        effect,
        field,
        id,
        disabled,
        options.onFieldChange,
        options.pathPrefix === undefined ? undefined : [...options.pathPrefix, field.key],
      ),
    );
  }

  const notes = element('textarea', {
    attributes: {
      id: `${prefix}-notes`,
      ...(options.pathPrefix === undefined
        ? {}
        : { 'data-authoring-path': authoringPathKey([...options.pathPrefix, 'notes']) }),
    },
  });
  notes.value = effect.notes ?? '';
  notes.disabled = disabled;
  notes.addEventListener('input', () =>
    options.onCommonChange('notes', notes.value === '' ? null : notes.value),
  );
  card.append(
    element('label', { text: 'Description', attributes: { for: `${prefix}-notes` } }),
    notes,
  );

  const preview = element('p', {
    className: 'authoring-effect-preview',
    attributes: { 'aria-label': 'Effect preview' },
  });
  preview.append(freeTextSpan(effectPreview(effect)));
  card.append(preview);
  const scope = fieldValue(effect, 'weapon_scope');
  if (scope === 'one_bonded_weapon') {
    card.append(element('p', {
      className: 'authoring-mechanic-disclosure',
      text: 'Not applied to sheet numbers until the character has a bonded weapon.',
    }));
  }
  if (effect.notes !== null && effect.notes !== '') {
    const prose = element('p', { className: 'authoring-effect-prose' });
    prose.append(freeTextSpan(effect.notes));
    card.append(prose);
  }
  card.append(createOrderedCardControls({
    collectionKey: authoringPathKey(options.pathPrefix?.slice(0, -1) ?? ['effects']),
    itemKey: effect.draft_item_uuid,
    accessibleName: effect.label || definition.label,
    position: options.position,
    count: options.count,
    disabled,
    onMoveUp: options.onMoveUp,
    onMoveDown: options.onMoveDown,
    onRemove: options.onRemove,
  }));
  return card;
}

export function authoringPathKey(path: readonly (string | number)[]): string {
  return JSON.stringify(path);
}

function fieldForIssue(
  form: HTMLFormElement,
  issue: AuthoringValidationIssue,
): HTMLElement | null {
  const expected = authoringPathKey(issue.path);
  return Array.from(form.querySelectorAll<HTMLElement>('[data-authoring-path]'))
    .find((candidate) => candidate.getAttribute('data-authoring-path') === expected) ?? null;
}

/** Renders every backend issue and moves focus to the first invalid control. */
export function renderValidationSummary(
  form: HTMLFormElement,
  issues: readonly AuthoringValidationIssue[],
): HTMLElement {
  for (const field of Array.from(
    form.querySelectorAll<HTMLElement>('[aria-invalid="true"]'),
  )) {
    field.removeAttribute('aria-invalid');
  }
  const summary = element('section', {
    className: 'authoring-validation-summary',
    attributes: {
      role: 'alert',
      'aria-labelledby': 'authoring-validation-heading',
      tabindex: '-1',
    },
  });
  summary.append(element('h2', {
    text: 'Fix these fields',
    attributes: { id: 'authoring-validation-heading' },
  }));
  const list = element('ul');
  let firstInvalid: HTMLElement | null = null;
  for (const [index, issue] of issues.entries()) {
    const target = fieldForIssue(form, issue);
    if (target !== null) {
      target.setAttribute('aria-invalid', 'true');
      if (target.id === '') {
        target.id = `authoring-invalid-${String(index + 1)}`;
        target.setAttribute('id', target.id);
      }
      firstInvalid ??= target;
    }
    const item = element('li');
    if (target === null) {
      item.textContent = issue.message;
    } else {
      const link = element('a', {
        text: issue.message,
        attributes: { href: `#${target.id}` },
      });
      link.addEventListener('click', (event) => {
        event.preventDefault();
        target.focus();
      });
      item.append(link);
    }
    list.append(item);
  }
  summary.append(list);
  firstInvalid?.focus();
  return summary;
}

export function isFeatureEffectKind(
  kind: AuthorableEffectKind,
): kind is FeatureTemplateEffectKind {
  return featureTemplateEffectKinds.some((candidate) => candidate === kind);
}

export interface DraftNavigationGuardOptions {
  readonly isDirty: () => boolean;
  readonly confirmLeave: () => boolean;
}

/** Register the explicit Save draft boundary for every router entry point. */
export function installDraftNavigationGuard(
  screen: Pick<ScreenContext, 'registerNavigationGuard'>,
  options: DraftNavigationGuardOptions,
): () => void {
  return screen.registerNavigationGuard(() =>
    !options.isDirty() || options.confirmLeave());
}

export function installDraftBeforeUnloadGuard(
  windowObject: Window,
  isDirty: () => boolean,
): () => void {
  const warn = (event: BeforeUnloadEvent): void => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  };
  windowObject.addEventListener('beforeunload', warn);
  return () => windowObject.removeEventListener('beforeunload', warn);
}
