import type { AuthoringClient } from '../../../authoring/client';
import type {
  AuthoringValidationIssue,
  BackgroundAuthoringDraft,
  BackgroundAuthoringDraftEquipment,
  BackgroundAuthoringReferenceOption,
  BackgroundAuthoringReferences,
  PublishPreview,
  PublishResult,
  StoredHomebrewDraft,
} from '../../../authoring/contracts';
import { catalogSelectGroups } from '../../catalog-control-disclosure';
import type { AuthoringDraftCharacterEffect } from '../../../authoring/effect-forms';
import type { HomebrewDraftItemUuid } from '../../../authoring/ids';
import {
  abilities,
  characterEffectKinds,
  rulesEditions,
  skills,
  type Ability,
  type CharacterEffectKind,
  type Skill,
} from '../../../domain/enums';
import type { ContentKey } from '../../../domain/ids';
import { RpcError } from '../../../rpc/protocol';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import { SKILL_LABELS } from '../../../rules/skills';
import { createAuthoringEditGeneration } from '../../authoring/edit-generation';
import {
  authoringPathKey,
  createEffectCard,
  createOrderedCardControls,
  installDraftBeforeUnloadGuard,
  installDraftNavigationGuard,
  orderedCollectionAnchorAttributes,
  renderValidationSummary,
  type AuthoringEffectFieldValue,
} from '../../authoring/form-components';
import {
  createDraftConflictDialog,
  draftRevisionConflict,
  type DraftConflictDialog,
} from '../../authoring/draft-conflict-dialog';
import {
  createPublishAdoptionDialog,
  type ContentAdoptionDialog,
} from '../../content-adoption-dialog';
import { clear, element, type Cleanup } from '../../dom';
import { freeTextSpan } from '../../free-text';
import { abilityLabel, rulesEditionLabel } from '../../human-labels';
import type { ScreenContext } from '../../screen';
import { homebrewPublishedPath } from './homebrew-routes';
import {
  renderPublishPreviewEffect,
  renderPublishPreviewGrant,
} from './publish-preview-renderer';
  showDraftSaveFailure,
  showDraftSaveProgress,
  showDraftSaveRefusal,
  showDraftSaveSuccess,
} from './draft-save-status';

type StoredBackgroundDraft = StoredHomebrewDraft & {
  readonly content_kind: 'background';
  readonly document: BackgroundAuthoringDraft;
};

export interface BackgroundFormOptions {
  readonly context: ScreenContext;
  readonly client: AuthoringClient;
  readonly mount: HTMLElement;
  readonly draft: StoredBackgroundDraft;
  readonly references: BackgroundAuthoringReferences;
  readonly randomUuid?: () => string;
  readonly confirmLeave?: () => boolean;
  readonly windowObject?: Window;
  readonly onSaved?: (draft: StoredBackgroundDraft) => void;
}

function pathAttribute(path: readonly (string | number)[]): Readonly<Record<string, string>> {
  return { 'data-authoring-path': authoringPathKey(path) };
}

function labelledControl(label: string, id: string, control: HTMLElement): readonly HTMLElement[] {
  return [element('label', {
    text: label,
    attributes: { for: control.getAttribute('id') ?? id },
  }), control];
}

function titleCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./u, (letter) => letter.toUpperCase());
}

function nullableInteger(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function move<T>(values: readonly T[], from: number, to: number): readonly T[] {
  if (to < 0 || to >= values.length) return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function emptyEffect(
  kind: CharacterEffectKind,
  draftItemUuid: HomebrewDraftItemUuid,
): AuthoringDraftCharacterEffect {
  const common = { draft_item_uuid: draftItemUuid, label: '', notes: null };
  switch (kind) {
    case 'damage_resistance':
      return { kind, ...common, damage_type: null };
    case 'hp_modifier':
      return { kind, ...common, hit_points_flat: null, hit_points_per_level: null };
    case 'speed':
      return { kind, ...common, speed_bonus_feet: null };
    case 'ability_increase':
      return { kind, ...common, ability: null, amount: null, maximum: null };
    case 'ability_override':
      return { kind, ...common, ability: null, maximum: null };
    case 'armor_class_bonus':
      return { kind, ...common, amount: null };
    case 'armor_class_formula':
      return { kind, ...common, base: null, ability_1: null, ability_2: null, allows_shield: null };
    case 'attack_ability_override':
      return { kind, ...common, ability: null, weapon_scope: null };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return { kind, ...common, amount: null, weapon_scope: null };
  }
}

function changedEffect(
  effect: AuthoringDraftCharacterEffect,
  field: string,
  value: AuthoringEffectFieldValue,
): AuthoringDraftCharacterEffect {
  Reflect.set(effect, field, value);
  return { ...effect } as AuthoringDraftCharacterEffect;
}

function validationIssues(error: unknown): readonly AuthoringValidationIssue[] | null {
  if (!(error instanceof RpcError) || error.data === undefined ||
      typeof error.data !== 'object' || error.data === null || Array.isArray(error.data) ||
      Reflect.get(error.data, 'reason') !== 'validation_failed') return null;
  const issues = Reflect.get(error.data, 'issues');
  if (!Array.isArray(issues)) return null;
  return issues.every((issue) => typeof issue === 'object' && issue !== null &&
    Array.isArray(Reflect.get(issue, 'path')) &&
    typeof Reflect.get(issue, 'code') === 'string' &&
    typeof Reflect.get(issue, 'message') === 'string')
    ? issues as unknown as readonly AuthoringValidationIssue[]
    : null;
}

function previewElement(
  preview: PublishPreview,
  draft: BackgroundAuthoringDraft,
  references: BackgroundAuthoringReferences,
): HTMLElement {
  if (preview.aggregate.kind !== 'background') {
    throw new TypeError('The background form received a non-background publish preview.');
  }
  const aggregate = preview.aggregate;
  const root = element('section', {
    className: 'background-publish-preview panel',
    attributes: { 'aria-labelledby': 'background-publish-preview-heading' },
  });
  root.append(element('h2', {
    text: 'Publish preview',
    attributes: { id: 'background-publish-preview-heading' },
  }));
  const name = element('p');
  name.append('Name: ', freeTextSpan(aggregate.name));
  const feat = element('p');
  const featReference = references.origin_feats.find((reference) =>
    reference.content_key === draft.default_origin_feat_content_key
  );
  feat.append(
    'Default Origin feat: ',
    freeTextSpan(aggregate.default_origin_feat_display_name),
    ` · ${catalogLayerLabel(featReference?.catalog_layer ?? 'unknown')}`,
  );
  root.append(
    name,
    element('p', { text: `Rules edition: ${rulesEditionLabel(aggregate.rules_edition)}` }),
    element('p', { text: `Suggested abilities: ${aggregate.suggested_abilities.map(abilityLabel).join(', ')}` }),
    feat,
    element('p', { text: `Skill proficiencies: ${aggregate.skill_proficiencies.map((skill) => SKILL_LABELS[skill]).join(', ')}` }),
  );
  const grants = element('ul', { attributes: { 'aria-label': 'Grant preview' } });
  for (const grant of aggregate.grants) {
    grants.append(renderPublishPreviewGrant(grant, {
      catalogNameForGrant: (candidate) => candidate.kind === 'grant_source'
        ? {
            name: aggregate.default_origin_feat_display_name,
            catalog_layer: featReference?.catalog_layer ?? 'unknown',
          }
        : null,
    }));
  }
  if (aggregate.grants.length === 0) {
    grants.append(element('li', { text: 'No structured grants.' }));
  }
  root.append(grants);
  if (aggregate.tool_reference_text !== null) {
    const tool = element('p');
    tool.append('Tool reference: ', freeTextSpan(aggregate.tool_reference_text));
    root.append(tool);
  }
  for (const [label, description, items] of [
    ['A', aggregate.equipment_option_a_description, aggregate.equipment_option_a],
    ['B', aggregate.equipment_option_b_description, aggregate.equipment_option_b],
  ] as const) {
    const section = element('section', { attributes: { 'aria-label': `Equipment option ${label} preview` } });
    const heading = element('h3');
    heading.append(`Option ${label}: `, freeTextSpan(description));
    const list = element('ol');
    for (const item of items) {
      const row = element('li');
      row.append(`${String(item.quantity)} × `, freeTextSpan(item.printed_name));
      if (item.kind === 'gear') {
        row.append(' (gear)');
      } else {
        const draftItem = (label === 'A'
          ? draft.equipment_option_a
          : draft.equipment_option_b)[item.sort_order - 1];
        const referenceList = item.kind === 'weapon' ? references.weapons : references.armors;
        const reference = draftItem === undefined || draftItem.kind === 'gear'
          ? undefined
          : referenceList.find((candidate) => candidate.content_key === draftItem.content_key);
        row.append(` (${item.kind}) · ${catalogLayerLabel(reference?.catalog_layer ?? 'unknown')}`);
      }
      list.append(row);
    }
    section.append(heading, list);
    root.append(section);
  }
  const effects = element('ul', { attributes: { 'aria-label': 'Background effect preview' } });
  for (const effect of aggregate.effects) {
    effects.append(renderPublishPreviewEffect(effect));
  }
  root.append(effects);
  if (aggregate.reference_text !== '') {
    const reference = element('p', { className: 'authoring-reference-preview' });
    reference.append(freeTextSpan(aggregate.reference_text));
    root.append(reference);
  }
  return root;
}

function referenceOptions(
  select: HTMLSelectElement,
  references: readonly BackgroundAuthoringReferenceOption[],
): void {
  select.append(...catalogSelectGroups(references.map((reference) => ({
    value: reference.content_key,
    label: `${reference.name} (${rulesEditionLabel(reference.rules_edition)})`,
    catalogLayer: reference.catalog_layer,
  }))));
}

/** Render the complete HA-9 background authoring session. */
export function renderBackgroundForm(options: BackgroundFormOptions): Cleanup {
  let stored = options.draft;
  let document = stored.document;
  const edits = createAuthoringEditGeneration();
  let disposed = false;
  const dialogs: (DraftConflictDialog | ContentAdoptionDialog)[] = [];
  const randomUuid = options.randomUuid ?? (() => crypto.randomUUID());
  const itemUuid = (): HomebrewDraftItemUuid => randomUuid() as HomebrewDraftItemUuid;
  const runtimeWindow = options.windowObject ?? (typeof window === 'undefined' ? null : window);

  const update = (changed: BackgroundAuthoringDraft): void => {
    document = changed;
    edits.edit();
    options.mount.querySelector('.background-publish-preview')?.remove();
    const status = options.mount.querySelector<HTMLElement>('.background-authoring-status');
    if (status !== null) status.textContent = 'Unsaved changes.';
  };

  const guards: Cleanup[] = [installDraftNavigationGuard(options.context, {
    isDirty: () => edits.dirty,
    confirmLeave: options.confirmLeave ?? (() =>
      runtimeWindow?.confirm('Leave this background draft with unsaved changes?') ?? false),
  })];
  if (runtimeWindow !== null) {
    guards.push(installDraftBeforeUnloadGuard(runtimeWindow, () => edits.dirty));
  }

  const renderPublished = (result: PublishResult): void => {
    edits.publish();
    options.context.router.navigate(homebrewPublishedPath(
      'background',
      result,
      options.draft.base_content_key,
    ), { replace: true });
  };

  const discardStalePreview = (): void => {
    options.mount.querySelector('.background-publish-preview')?.remove();
    const status = options.mount.querySelector<HTMLElement>('.background-authoring-status');
    if (status === null) return;
    status.textContent = 'Draft changed; preview again.';
    status.setAttribute('role', 'alert');
  };

  const render = (): void => {
    clear(options.mount);
    const form = element('form', {
      className: 'background-authoring-form', attributes: { novalidate: '' },
    });
    const validationMount = element('div', { className: 'authoring-validation-mount' });
    const status = element('p', {
      className: 'background-authoring-status',
      text: edits.dirty ? 'Unsaved changes.' : `Saved revision ${String(stored.revision)}.`,
      attributes: { role: 'status', 'aria-live': 'polite' },
    });

    const name = element('input', {
      attributes: { id: 'background-name', type: 'text', required: '', ...pathAttribute(['name']) },
    });
    name.value = document.name;
    name.addEventListener('input', () => update({ ...document, name: name.value }));
    const edition = element('select', {
      attributes: { id: 'background-rules-edition', required: '', ...pathAttribute(['rules_edition']) },
    });
    edition.append(element('option', { text: 'Choose…', attributes: { value: '' } }));
    for (const value of rulesEditions) {
      edition.append(element('option', {
        text: rulesEditionLabel(value),
        attributes: { value },
      }));
    }
    edition.value = document.rules_edition ?? '';
    edition.addEventListener('change', () => update({
      ...document,
      rules_edition: rulesEditions.find((candidate) => candidate === edition.value) ?? null,
    }));
    const reference = element('textarea', {
      attributes: { id: 'background-reference-text', ...pathAttribute(['reference_text']) },
    });
    reference.value = document.reference_text;
    reference.addEventListener('input', () => update({ ...document, reference_text: reference.value }));
    const rootFields = element('fieldset', {}, [
      element('legend', { text: 'Background details' }),
      ...labelledControl('Name', name.id, name),
      ...labelledControl('Rules edition', edition.id, edition),
      ...labelledControl('Reference text for mechanics not applied to the sheet', reference.id, reference),
    ]);

    const multiSelect = <T extends Ability | Skill>(
      legend: string,
      path: 'suggested_abilities' | 'skill_proficiencies',
      values: readonly T[],
      selected: readonly T[],
      requiredCount: number,
      onChange: (next: readonly T[]) => void,
    ): HTMLFieldSetElement => {
      const fieldset = element('fieldset', {
        className: 'background-multi-select',
        attributes: { tabindex: '-1', ...pathAttribute([path]) },
      });
      fieldset.append(
        element('legend', { text: legend }),
        element('p', { text: `Choose exactly ${String(requiredCount)}.` }),
      );
      for (const value of values) {
        const input = element('input', {
          attributes: { id: `background-${path}-${value}`, type: 'checkbox', value },
        });
        input.checked = selected.includes(value);
        input.disabled = !input.checked && selected.length >= requiredCount;
        input.addEventListener('change', () => {
          const next = input.checked
            ? [...selected, value]
            : selected.filter((candidate) => candidate !== value);
          onChange(next);
          render();
        });
        fieldset.append(input, element('label', {
          text: titleCase(value),
          attributes: { for: input.getAttribute('id') ?? input.id },
        }));
      }
      return fieldset;
    };

    const abilitiesField = multiSelect(
      'Suggested abilities', 'suggested_abilities', abilities,
      document.suggested_abilities, 3,
      (selected) => update({ ...document, suggested_abilities: selected as readonly Ability[] }),
    );
    const feat = element('select', {
      attributes: {
        id: 'background-default-origin-feat', required: '',
        ...pathAttribute(['default_origin_feat_content_key']),
      },
    });
    feat.append(element('option', { text: 'Choose an Origin feat…', attributes: { value: '' } }));
    referenceOptions(feat, options.references.origin_feats);
    feat.value = document.default_origin_feat_content_key ?? '';
    feat.addEventListener('change', () => {
      const selected = options.references.origin_feats.find((candidate) => candidate.content_key === feat.value);
      update({
        ...document,
        default_origin_feat_content_key: selected?.content_key ?? null,
        default_origin_feat_display_name: selected?.name ?? null,
      });
      render();
    });
    const featDisplay = element('input', {
      attributes: {
        id: 'background-default-origin-feat-display-name', type: 'text',
        ...pathAttribute(['default_origin_feat_display_name']),
      },
    });
    featDisplay.value = document.default_origin_feat_display_name ?? '';
    featDisplay.disabled = document.default_origin_feat_content_key === null;
    featDisplay.addEventListener('input', () => update({
      ...document,
      default_origin_feat_display_name: featDisplay.value === '' ? null : featDisplay.value,
    }));
    const featFields = element('fieldset', {}, [
      element('legend', { text: 'Default Origin feat' }),
      ...labelledControl('Installed Origin feat', feat.id, feat),
      ...labelledControl('Origin feat display name', featDisplay.id, featDisplay),
    ]);
    const skillsField = multiSelect(
      'Skill proficiencies', 'skill_proficiencies', skills,
      document.skill_proficiencies, 2,
      (selected) => update({ ...document, skill_proficiencies: selected as readonly Skill[] }),
    );
    const tool = element('textarea', {
      attributes: { id: 'background-tool-reference', ...pathAttribute(['tool_reference_text']) },
    });
    tool.value = document.tool_reference_text ?? '';
    tool.addEventListener('input', () => update({
      ...document, tool_reference_text: tool.value === '' ? null : tool.value,
    }));
    const origins = element('section', {
      attributes: { 'aria-labelledby': 'background-origin-fields-heading' },
    }, [
      element('h2', { text: 'Background grants', attributes: { id: 'background-origin-fields-heading' } }),
      abilitiesField,
      featFields,
      skillsField,
      ...labelledControl('Tool reference text (optional)', tool.id, tool),
      element('p', {
        className: 'authoring-mechanic-disclosure',
        text: 'Tool reference text is preserved as prose; tools are not structured grants in v1.',
      }),
    ]);

    const equipmentSection = element('section', {
      attributes: { 'aria-labelledby': 'background-equipment-heading' },
    });
    equipmentSection.append(element('h2', {
      text: 'Equipment options', attributes: { id: 'background-equipment-heading' },
    }));
    const renderOption = (
      option: 'a' | 'b',
      description: string,
      items: readonly BackgroundAuthoringDraftEquipment[],
    ): HTMLElement => {
      const upper = option.toUpperCase();
      const optionPath = option === 'a' ? 'equipment_option_a' : 'equipment_option_b';
      const descriptionPath = option === 'a'
        ? 'equipment_option_a_description'
        : 'equipment_option_b_description';
      const section = element('section', {
        className: 'background-equipment-option',
        attributes: { 'aria-labelledby': `background-equipment-${option}-heading` },
      });
      section.append(element('h3', {
        text: `Option ${upper}`, attributes: { id: `background-equipment-${option}-heading` },
      }));
      const descriptionInput = element('input', {
        attributes: {
          id: `background-equipment-${option}-description`, type: 'text', required: '',
          ...pathAttribute([descriptionPath]),
        },
      });
      descriptionInput.value = description;
      descriptionInput.addEventListener('input', () => update(option === 'a'
        ? { ...document, equipment_option_a_description: descriptionInput.value }
        : { ...document, equipment_option_b_description: descriptionInput.value }));
      section.append(...labelledControl(`Equipment option ${upper} description`, descriptionInput.id, descriptionInput));
      const replaceItems = (next: readonly BackgroundAuthoringDraftEquipment[]): void => update(option === 'a'
        ? { ...document, equipment_option_a: next }
        : { ...document, equipment_option_b: next });
      const currentItems = (): readonly BackgroundAuthoringDraftEquipment[] => option === 'a'
        ? document.equipment_option_a
        : document.equipment_option_b;
      for (const [index, item] of items.entries()) {
        const prefix = `background-equipment-${option}-${item.draft_item_uuid}`;
        const card = element('fieldset', {
          className: 'background-equipment-card',
          attributes: {
            'data-draft-item-uuid': item.draft_item_uuid,
            'aria-label': `Option ${upper} item ${String(index + 1)} of ${String(items.length)}`,
          },
        });
        card.append(element('legend', { text: `Item ${String(index + 1)}` }));
        const kind = element('select', {
          attributes: { id: `${prefix}-kind`, ...pathAttribute([optionPath, index, 'kind']) },
        });
        for (const value of ['gear', 'weapon', 'armor'] as const) {
          kind.append(element('option', { text: titleCase(value), attributes: { value } }));
        }
        kind.value = item.kind;
        kind.addEventListener('change', () => {
          const liveItem = currentItems()[index];
          if (liveItem === undefined) return;
          const nextKind = kind.value === 'weapon' || kind.value === 'armor' ? kind.value : 'gear';
          const changed: BackgroundAuthoringDraftEquipment = nextKind === 'gear'
            ? {
                kind: nextKind,
                draft_item_uuid: liveItem.draft_item_uuid,
                quantity: liveItem.quantity,
                printed_name: liveItem.printed_name,
              }
            : {
                kind: nextKind,
                draft_item_uuid: liveItem.draft_item_uuid,
                quantity: liveItem.quantity,
                printed_name: liveItem.printed_name,
                content_key: null,
              };
          replaceItems(currentItems().map((candidate, position) => position === index ? changed : candidate));
          render();
        });
        const quantity = element('input', {
          attributes: {
            id: `${prefix}-quantity`, type: 'number', min: '1', step: '1', required: '',
            ...pathAttribute([optionPath, index, 'quantity']),
          },
        });
        quantity.value = item.quantity === null ? '' : String(item.quantity);
        quantity.addEventListener('input', () => replaceItems(currentItems().map((candidate, position) =>
          position === index ? { ...candidate, quantity: nullableInteger(quantity.value) } : candidate)));
        const printedName = element('input', {
          attributes: {
            id: `${prefix}-printed-name`, type: 'text', required: '',
            ...pathAttribute([optionPath, index, 'printed_name']),
          },
        });
        printedName.value = item.printed_name;
        printedName.addEventListener('input', () => replaceItems(currentItems().map((candidate, position) =>
          position === index ? { ...candidate, printed_name: printedName.value } : candidate)));
        card.append(
          ...labelledControl('Item kind', kind.id, kind),
          ...labelledControl('Quantity', quantity.id, quantity),
          ...labelledControl('Printed name', printedName.id, printedName),
        );
        if (item.kind !== 'gear') {
          const catalog = element('select', {
            attributes: {
              id: `${prefix}-catalog`, required: '',
              ...pathAttribute([optionPath, index, 'content_key']),
            },
          });
          catalog.append(element('option', {
            text: `Choose installed ${item.kind}…`, attributes: { value: '' },
          }));
          referenceOptions(catalog, item.kind === 'weapon' ? options.references.weapons : options.references.armors);
          catalog.value = item.content_key ?? '';
          catalog.addEventListener('change', () => replaceItems(currentItems().map((candidate, position) =>
            position === index && candidate.kind !== 'gear'
              ? { ...candidate, content_key: catalog.value === '' ? null : catalog.value as ContentKey }
              : candidate)));
          card.append(...labelledControl(`Catalog ${item.kind}`, catalog.id, catalog));
        }
        card.append(createOrderedCardControls({
          collectionKey: `background-equipment-${option}`,
          itemKey: item.draft_item_uuid,
          accessibleName: `option ${upper} ${item.printed_name || `item ${String(index + 1)}`}`,
          position: index + 1,
          count: items.length,
          onMoveUp: () => { replaceItems(move(currentItems(), index, index - 1)); render(); },
          onMoveDown: () => { replaceItems(move(currentItems(), index, index + 1)); render(); },
          onRemove: () => { replaceItems(currentItems().filter((_candidate, position) => position !== index)); render(); },
        }));
        section.append(card);
      }
      const add = element('button', {
        className: 'button-secondary', text: `Add equipment to option ${upper}`,
        attributes: {
          type: 'button',
          ...orderedCollectionAnchorAttributes(`background-equipment-${option}`),
        },
      });
      add.addEventListener('click', () => {
        replaceItems([...currentItems(), {
          kind: 'gear', draft_item_uuid: itemUuid(), quantity: null, printed_name: '',
        }]);
        render();
      });
      section.append(add);
      return section;
    };
    equipmentSection.append(
      renderOption('a', document.equipment_option_a_description, document.equipment_option_a),
      renderOption('b', document.equipment_option_b_description, document.equipment_option_b),
    );

    const effectsSection = element('section', {
      attributes: { 'aria-labelledby': 'background-effects-heading' },
    });
    effectsSection.append(element('h2', {
      text: 'Flat effects', attributes: { id: 'background-effects-heading' },
    }));
    for (const [index, effect] of document.effects.entries()) {
      const replaceEffect = (changed: AuthoringDraftCharacterEffect): void => update({
        ...document,
        effects: document.effects.map((candidate, position) => position === index ? changed : candidate),
      });
      effectsSection.append(createEffectCard({
        effect,
        position: index + 1,
        count: document.effects.length,
        allowFeatureOnly: false,
        pathPrefix: ['effects', index],
        onKindChange: (kind) => {
          const characterKind = characterEffectKinds.find((candidate) => candidate === kind);
          if (characterKind === undefined) return;
          replaceEffect(emptyEffect(characterKind, effect.draft_item_uuid));
          render();
        },
        onCommonChange: (field, value) => replaceEffect(changedEffect(effect, field, value)),
        onFieldChange: (field, value) => replaceEffect(changedEffect(effect, field, value)),
        onMoveUp: () => { update({ ...document, effects: move(document.effects, index, index - 1) }); render(); },
        onMoveDown: () => { update({ ...document, effects: move(document.effects, index, index + 1) }); render(); },
        onRemove: () => {
          update({ ...document, effects: document.effects.filter((_candidate, position) => position !== index) });
          render();
        },
      }));
    }
    const addEffect = element('button', {
      className: 'button-secondary', text: 'Add effect', attributes: {
        type: 'button',
        ...orderedCollectionAnchorAttributes(authoringPathKey(['effects'])),
      },
    });
    addEffect.addEventListener('click', () => {
      update({ ...document, effects: [...document.effects, emptyEffect('armor_class_bonus', itemUuid())] });
      render();
    });
    effectsSection.append(addEffect);

    const save = element('button', {
      className: 'button-secondary', text: 'Save draft',
      attributes: { type: 'button', 'data-authoring-action': 'save-draft' },
    });
    const preview = element('button', {
      className: 'button-primary', text: 'Preview publish', attributes: { type: 'submit' },
    });
    const saveDraft = async (): Promise<boolean> => {
      const generation = edits.capture();
      save.disabled = true;
      preview.disabled = true;
      showDraftSaveProgress(status);
      try {
        const saved = await options.client.saveDraft({
          draft_uuid: stored.draft_uuid,
          expected_revision: stored.revision,
          document,
        });
        if (!isStoredBackgroundDraft(saved)) {
          throw new TypeError('Saving the background draft returned a different content kind.');
        }
        clear(validationMount);
        stored = saved;
        options.onSaved?.(stored);
        if (edits.acceptSave(generation)) {
          document = stored.document;
          showDraftSaveSuccess(status, `Saved revision ${String(stored.revision)}.`);
        } else {
          showDraftSaveSuccess(
            status,
            `Saved revision ${String(stored.revision)}; newer unsaved changes remain.`,
          );
        }
        return true;
      } catch (error) {
        const conflict = draftRevisionConflict(error);
        if (conflict !== null) {
          showDraftSaveRefusal(status);
          const dialog = createDraftConflictDialog({
            conflict,
            mount: options.context.root,
            restoreFocus: () => options.mount.querySelector<HTMLElement>('[data-authoring-action="save-draft"]')?.focus(),
            onLoadSaved: async () => {
              const loaded = await options.client.readDraft({ draft_uuid: stored.draft_uuid });
              if (!isStoredBackgroundDraft(loaded)) {
                throw new TypeError('Reloading the background draft returned a different content kind.');
              }
              stored = loaded;
              document = stored.document;
              edits.replaceWithSaved();
              render();
            },
            onKeepLocal: () => {
              edits.edit();
              status.textContent = 'The newer saved revision was left unchanged.';
            },
          });
          dialogs.push(dialog);
        } else {
          const issues = validationIssues(error);
          if (issues !== null) {
            showDraftSaveRefusal(status);
            clear(validationMount);
            validationMount.append(renderValidationSummary(form, issues));
          } else {
            showDraftSaveFailure(status, error);
          }
        }
        return false;
      } finally {
        if (!disposed) { save.disabled = false; preview.disabled = false; }
      }
    };
    save.addEventListener('click', () => void saveDraft());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (edits.dirty) {
        status.textContent = 'Save the draft before previewing publish.';
        status.setAttribute('role', 'alert');
        save.focus();
        return;
      }
      const generation = edits.capture();
      preview.disabled = true;
      status.textContent = 'Validating publish preview…';
      void options.client.previewPublish({
        draft_uuid: stored.draft_uuid,
        expected_revision: stored.revision,
      }).then((publishPreview) => {
        if (disposed) return;
        if (!edits.isCurrent(generation)) { discardStalePreview(); return; }
        clear(validationMount);
        options.mount.querySelector('.background-publish-preview')?.remove();
        const rendered = previewElement(publishPreview, document, options.references);
        const publish = element('button', {
          className: 'button-primary', text: 'Publish background',
          attributes: { type: 'button', 'data-authoring-action': 'publish-background' },
        });
        const commit = (decisions: Parameters<AuthoringClient['commitPublish']>[0]['decisions']) =>
          options.client.commitPublish({ token: publishPreview.token, decisions });
        publish.addEventListener('click', () => {
          if (publishPreview.review.length === 0) {
            publish.disabled = true;
            status.textContent = 'Publishing…';
            void commit([]).then(renderPublished).catch((error: unknown) => {
              publish.disabled = false;
              status.textContent = error instanceof Error ? error.message : String(error);
              status.setAttribute('role', 'alert');
            });
            return;
          }
          const dialog = createPublishAdoptionDialog({
            mount: options.context.root,
            preview: publishPreview,
            commit,
            onCommitted: renderPublished,
            restoreFocus: () => options.mount.querySelector<HTMLElement>('[data-authoring-action="publish-background"]')?.focus(),
          });
          dialogs.push(dialog);
        });
        rendered.append(publish);
        options.mount.append(rendered);
        status.textContent = publishPreview.review.length === 0
          ? 'Preview ready.'
          : 'Preview ready; content adoption review is required.';
      }).catch((error: unknown) => {
        if (disposed) return;
        if (!edits.isCurrent(generation)) { discardStalePreview(); return; }
        const issues = validationIssues(error);
        if (issues !== null) {
          clear(validationMount);
          validationMount.append(renderValidationSummary(form, issues));
          status.textContent = `${String(issues.length)} field issue(s) found.`;
        } else {
          status.textContent = error instanceof Error ? error.message : String(error);
          status.setAttribute('role', 'alert');
        }
      }).finally(() => { if (!disposed) preview.disabled = false; });
    });

    form.append(
      validationMount,
      rootFields,
      origins,
      equipmentSection,
      effectsSection,
      element('div', { className: 'background-form-actions' }, [save, preview]),
      status,
    );
    options.mount.append(form);
  };

  render();
  return () => {
    disposed = true;
    for (const dialog of dialogs.splice(0)) dialog.cleanup();
    for (const cleanup of guards.splice(0)) cleanup();
  };
}

export function isStoredBackgroundDraft(
  draft: StoredHomebrewDraft,
): draft is StoredBackgroundDraft {
  return draft.content_kind === 'background' && draft.document.kind === 'background';
}
