import type { AuthoringClient } from '../../../authoring/client';
import type {
  AuthoringDraftGrant,
  AuthoringValidationIssue,
  PublishPreview,
  PublishResult,
  SpellGrantAuthoringReferences,
  SpeciesAuthoringDraft,
  SpeciesAuthoringDraftTrait,
  StoredHomebrewDraft,
} from '../../../authoring/contracts';
import type {
  AuthoringDraftCharacterEffect,
} from '../../../authoring/effect-forms';
import type { HomebrewDraftItemUuid } from '../../../authoring/ids';
import {
  creatureSizes,
  creatureTypes,
  rulesEditions,
  skills,
  spellSchools,
  type CharacterEffectKind,
  type Skill,
} from '../../../domain/enums';
import { RpcError } from '../../../rpc/protocol';
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
import { rulesEditionLabel } from '../../human-labels';
import type { ScreenContext } from '../../screen';
import { homebrewPublishedPath } from './homebrew-routes';
import {
  renderPublishPreviewEffect,
  renderPublishPreviewGrant,
  spellCatalogNameForGrant,
} from './publish-preview-renderer';
import {
  showDraftSaveFailure,
  showDraftSaveProgress,
  showDraftSaveRefusal,
  showDraftSaveSuccess,
} from './draft-save-status';
import { spellGrantControls } from './spell-grant-controls';

type StoredSpeciesDraft = StoredHomebrewDraft & {
  readonly content_kind: 'species';
  readonly document: SpeciesAuthoringDraft;
};

export interface SpeciesFormOptions {
  readonly context: ScreenContext;
  readonly client: AuthoringClient;
  readonly mount: HTMLElement;
  readonly draft: StoredSpeciesDraft;
  readonly spellGrantReferences: SpellGrantAuthoringReferences;
  readonly randomUuid?: () => string;
  readonly confirmLeave?: () => boolean;
  readonly windowObject?: Window;
  readonly onSaved?: (draft: StoredSpeciesDraft) => void;
}

function pathAttribute(path: readonly (string | number)[]): Readonly<Record<string, string>> {
  return { 'data-authoring-path': authoringPathKey(path) };
}

function labelledControl(
  label: string,
  id: string,
  control: HTMLElement,
): readonly HTMLElement[] {
  return [element('label', { text: label, attributes: { for: id } }), control];
}

function move<T>(values: readonly T[], from: number, to: number): readonly T[] {
  if (to < 0 || to >= values.length) return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function titleCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./u, (letter) => letter.toUpperCase());
}

function nullableInteger(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function textLines(value: string): readonly string[] {
  return value.split('\n').map((line) => line.trim()).filter((line) => line !== '');
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
      return {
        kind,
        ...common,
        base: null,
        ability_1: null,
        ability_2: null,
        allows_shield: null,
      };
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

function emptyGrant(
  kind: AuthoringDraftGrant['kind'],
  draftItemUuid: HomebrewDraftItemUuid,
): AuthoringDraftGrant {
  switch (kind) {
    case 'fixed_spell':
      return {
        kind,
        draft_item_uuid: draftItemUuid,
        rule_key: '',
        spell_content_key: null,
        always_prepared: false,
      };
    case 'choice_from_list':
      return {
        kind,
        draft_item_uuid: draftItemUuid,
        rule_key: '',
        list: '',
        count: null,
        minimum_spell_level: null,
        maximum_spell_level: null,
      };
    case 'choice_from_query':
      return {
        kind,
        draft_item_uuid: draftItemUuid,
        rule_key: '',
        schools: [],
        tags: [],
        count: null,
        minimum_spell_level: null,
        maximum_spell_level: null,
      };
    case 'skill_proficiency':
      return {
        kind,
        draft_item_uuid: draftItemUuid,
        rule_key: '',
        count: null,
        skills: [],
      };
  }
}

function validationIssues(error: unknown): readonly AuthoringValidationIssue[] | null {
  if (!(error instanceof RpcError) || error.data === undefined) return null;
  if (typeof error.data !== 'object' || error.data === null || Array.isArray(error.data)) {
    return null;
  }
  if (Reflect.get(error.data, 'reason') !== 'validation_failed') return null;
  const issues = Reflect.get(error.data, 'issues');
  if (!Array.isArray(issues)) return null;
  const valid = issues.every((issue) =>
    typeof issue === 'object' && issue !== null &&
    Array.isArray(Reflect.get(issue, 'path')) &&
    typeof Reflect.get(issue, 'code') === 'string' &&
    typeof Reflect.get(issue, 'message') === 'string');
  return valid ? issues as unknown as readonly AuthoringValidationIssue[] : null;
}

function previewList(
  preview: PublishPreview,
  draft: SpeciesAuthoringDraft,
  spellGrantReferences: SpellGrantAuthoringReferences,
): HTMLElement {
  const aggregate = preview.aggregate;
  if (aggregate.kind !== 'species') {
    throw new TypeError('The species form received a non-species publish preview.');
  }
  const root = element('section', {
    className: 'species-publish-preview panel',
    attributes: { 'aria-labelledby': 'species-publish-preview-heading' },
  });
  root.append(element('h2', {
    text: 'Publish preview',
    attributes: { id: 'species-publish-preview-heading' },
  }));
  const name = element('p');
  name.append('Name: ', freeTextSpan(aggregate.name));
  const creature = element('p');
  creature.append('Creature type: ', freeTextSpan(aggregate.creature_type));
  const size = element('p');
  size.append(
    'Size: ',
    freeTextSpan(aggregate.primary_size),
    ...(aggregate.alternate_size === null
      ? []
      : [' or ', freeTextSpan(aggregate.alternate_size)]),
  );
  root.append(name, creature, size, element('p', {
    text: `Rules edition: ${rulesEditionLabel(aggregate.rules_edition)}; walking speed: ${String(aggregate.walking_speed_feet)} feet.`,
  }));
  const traits = element('ol', { attributes: { 'aria-label': 'Trait preview' } });
  for (const trait of aggregate.traits) {
    const item = element('li');
    const heading = element('strong');
    heading.append(freeTextSpan(trait.name));
    const description = element('p');
    description.append(freeTextSpan(trait.description));
    const effects = element('ul');
    for (const effect of trait.effects) {
      effects.append(renderPublishPreviewEffect(effect));
    }
    item.append(heading, description, effects);
    traits.append(item);
  }
  root.append(traits);
  const grants = element('ul', { attributes: { 'aria-label': 'Grant preview' } });
  for (const grant of aggregate.grants) {
    grants.append(renderPublishPreviewGrant(grant, {
      catalogNameForGrant: (candidate) =>
        spellCatalogNameForGrant(candidate, draft.grants, spellGrantReferences),
    }));
  }
  if (aggregate.grants.length === 0) {
    grants.append(element('li', { text: 'No structured grants.' }));
  }
  root.append(grants);
  if (aggregate.reference_text !== '') {
    const reference = element('p', { className: 'authoring-reference-preview' });
    reference.append(freeTextSpan(aggregate.reference_text));
    root.append(reference);
  }
  return root;
}

/** Render one complete HA-7 species authoring session. */
export function renderSpeciesForm(options: SpeciesFormOptions): Cleanup {
  let stored = options.draft;
  let document = stored.document;
  let dirty = false;
  let disposed = false;
  const dialogs: (DraftConflictDialog | ContentAdoptionDialog)[] = [];
  const randomUuid = options.randomUuid ?? (() => crypto.randomUUID());
  const itemUuid = (): HomebrewDraftItemUuid => randomUuid() as HomebrewDraftItemUuid;
  const runtimeWindow = options.windowObject ?? (
    typeof window === 'undefined' ? null : window
  );

  const update = (changed: SpeciesAuthoringDraft): void => {
    document = changed;
    dirty = true;
    const preview = options.mount.querySelector('.species-publish-preview');
    preview?.remove();
    const status = options.mount.querySelector<HTMLElement>('.species-authoring-status');
    if (status !== null) status.textContent = 'Unsaved changes.';
  };

  const installGuards: Cleanup[] = [installDraftNavigationGuard(options.context, {
    isDirty: () => dirty,
    confirmLeave: options.confirmLeave ?? (() =>
      runtimeWindow?.confirm('Leave this species draft with unsaved changes?') ?? false),
  })];
  if (runtimeWindow !== null) {
    installGuards.push(installDraftBeforeUnloadGuard(runtimeWindow, () => dirty));
  }

  const renderPublished = (result: PublishResult): void => {
    dirty = false;
    options.context.router.navigate(homebrewPublishedPath(
      'species',
      result,
      options.draft.base_content_key,
    ), { replace: true });
  };

  const render = (): void => {
    clear(options.mount);
    const form = element('form', {
      className: 'species-authoring-form',
      attributes: { novalidate: '' },
    });
    const validationMount = element('div', { className: 'authoring-validation-mount' });
    const status = element('p', {
      className: 'species-authoring-status',
      text: dirty ? 'Unsaved changes.' : `Saved revision ${String(stored.revision)}.`,
      attributes: { role: 'status', 'aria-live': 'polite' },
    });

    const name = element('input', {
      attributes: { id: 'species-name', type: 'text', required: '', ...pathAttribute(['name']) },
    });
    name.value = document.name;
    name.addEventListener('input', () => update({ ...document, name: name.value }));
    const edition = element('select', {
      attributes: { id: 'species-rules-edition', required: '', ...pathAttribute(['rules_edition']) },
    });
    edition.append(element('option', { text: 'Choose…', attributes: { value: '' } }));
    for (const value of rulesEditions) {
      edition.append(element('option', {
        text: rulesEditionLabel(value),
        attributes: { value },
      }));
    }
    edition.value = document.rules_edition ?? '';
    edition.addEventListener('change', () => {
      const value = rulesEditions.find((candidate) => candidate === edition.value) ?? null;
      update({ ...document, rules_edition: value });
    });
    const knownCustom = (
      id: string,
      label: string,
      path: readonly (string | number)[],
      value: string,
      suggestions: readonly string[],
      onChange: (value: string) => void,
      required = false,
    ): readonly HTMLElement[] => {
      const input = element('input', {
        attributes: {
          id,
          type: 'text',
          list: `${id}-known`,
          ...(required ? { required: '' } : {}),
          ...pathAttribute(path),
        },
      });
      input.value = value;
      input.addEventListener('input', () => onChange(input.value));
      const datalist = element('datalist', { attributes: { id: `${id}-known` } });
      for (const suggestion of suggestions) {
        datalist.append(element('option', { attributes: { value: suggestion } }));
      }
      return [...labelledControl(label, id, input), datalist];
    };
    const speed = element('input', {
      attributes: {
        id: 'species-walking-speed', type: 'number', min: '1', step: '1', required: '',
        ...pathAttribute(['walking_speed_feet']),
      },
    });
    speed.value = document.walking_speed_feet === null
      ? ''
      : String(document.walking_speed_feet);
    speed.addEventListener('input', () =>
      update({ ...document, walking_speed_feet: nullableInteger(speed.value) }));
    const reference = element('textarea', {
      attributes: { id: 'species-reference-text', ...pathAttribute(['reference_text']) },
    });
    reference.value = document.reference_text;
    reference.addEventListener('input', () =>
      update({ ...document, reference_text: reference.value }));
    const rootFields = element('fieldset', { className: 'species-root-fields' }, [
      element('legend', { text: 'Species details' }),
      ...labelledControl('Name', name.id, name),
      ...labelledControl('Rules edition', edition.id, edition),
      ...knownCustom(
        'species-creature-type', 'Creature type', ['creature_type'],
        document.creature_type, creatureTypes,
        (value) => update({ ...document, creature_type: value }), true,
      ),
      ...knownCustom(
        'species-primary-size', 'Primary size', ['primary_size'],
        document.primary_size, creatureSizes,
        (value) => update({ ...document, primary_size: value }), true,
      ),
      ...knownCustom(
        'species-alternate-size', 'Alternate size (optional)', ['alternate_size'],
        document.alternate_size ?? '', creatureSizes,
        (value) => update({ ...document, alternate_size: value === '' ? null : value }),
      ),
      ...labelledControl('Walking speed (feet)', speed.id, speed),
      ...labelledControl('Reference text for mechanics not applied to the sheet', reference.id, reference),
      element('p', {
        className: 'authoring-mechanic-disclosure',
        text: 'Reference text is shown to the player but is not applied to sheet numbers.',
      }),
    ]);

    const traitsSection = element('section', {
      className: 'species-traits-section',
      attributes: { 'aria-labelledby': 'species-traits-heading' },
    });
    const renderTraits = (): void => {
      clear(traitsSection);
      const add = element('button', {
        className: 'button-secondary',
        text: 'Add trait',
        attributes: {
          type: 'button',
          ...orderedCollectionAnchorAttributes('species-traits'),
        },
      });
      add.addEventListener('click', () => {
        const trait: SpeciesAuthoringDraftTrait = {
          draft_item_uuid: itemUuid(),
          name: '',
          description: '',
          effects: [],
        };
        update({ ...document, traits: [...document.traits, trait] });
        render();
      });
      traitsSection.append(
        element('h2', { text: 'Traits', attributes: { id: 'species-traits-heading' } }),
        add,
      );
      for (const [traitIndex, trait] of document.traits.entries()) {
        const card = element('fieldset', {
          className: 'species-trait-card',
          attributes: {
            'data-draft-item-uuid': trait.draft_item_uuid,
            'aria-label': `Trait ${String(traitIndex + 1)} of ${String(document.traits.length)}`,
          },
        });
        card.append(element('legend', { text: `Trait ${String(traitIndex + 1)}` }));
        const traitName = element('input', {
          attributes: {
            id: `species-trait-${trait.draft_item_uuid}-name`, type: 'text', required: '',
            ...pathAttribute(['traits', traitIndex, 'name']),
          },
        });
        traitName.value = trait.name;
        traitName.addEventListener('input', () => {
          const traits = document.traits.map((candidate, index) =>
            index === traitIndex ? { ...candidate, name: traitName.value } : candidate);
          update({ ...document, traits });
        });
        const description = element('textarea', {
          attributes: {
            id: `species-trait-${trait.draft_item_uuid}-description`, required: '',
            ...pathAttribute(['traits', traitIndex, 'description']),
          },
        });
        description.value = trait.description;
        description.addEventListener('input', () => {
          const traits = document.traits.map((candidate, index) =>
            index === traitIndex ? { ...candidate, description: description.value } : candidate);
          update({ ...document, traits });
        });
        card.append(
          ...labelledControl('Trait name', traitName.id, traitName),
          ...labelledControl('Trait description', description.id, description),
        );
        if (trait.name !== '' || trait.description !== '') {
          const prose = element('p', { className: 'species-trait-prose' });
          prose.append(freeTextSpan(`${trait.name}: ${trait.description}`));
          card.append(prose);
        }
        const effects = element('div', {
          className: 'species-trait-effects',
          attributes: { 'aria-label': `Effects for trait ${String(traitIndex + 1)}` },
        });
        for (const [effectIndex, effect] of trait.effects.entries()) {
          const replaceEffect = (changed: AuthoringDraftCharacterEffect): void => {
            const traits = document.traits.map((candidate, index) => index === traitIndex
              ? {
                  ...candidate,
                  effects: candidate.effects.map((current, position) =>
                    position === effectIndex ? changed : current),
                }
              : candidate);
            update({ ...document, traits });
          };
          effects.append(createEffectCard({
            effect,
            position: effectIndex + 1,
            count: trait.effects.length,
            allowFeatureOnly: false,
            pathPrefix: ['traits', traitIndex, 'effects', effectIndex],
            onKindChange: (kind) => {
              if (kind === 'extra_attack') return;
              replaceEffect(emptyEffect(kind, effect.draft_item_uuid));
              render();
            },
            onCommonChange: (field, value) => replaceEffect(changedEffect(effect, field, value)),
            onFieldChange: (field, value) => replaceEffect(changedEffect(effect, field, value)),
            onMoveUp: () => {
              const traits = document.traits.map((candidate, index) => index === traitIndex
                ? { ...candidate, effects: move(candidate.effects, effectIndex, effectIndex - 1) }
                : candidate);
              update({ ...document, traits });
              render();
            },
            onMoveDown: () => {
              const traits = document.traits.map((candidate, index) => index === traitIndex
                ? { ...candidate, effects: move(candidate.effects, effectIndex, effectIndex + 1) }
                : candidate);
              update({ ...document, traits });
              render();
            },
            onRemove: () => {
              const traits = document.traits.map((candidate, index) => index === traitIndex
                ? {
                    ...candidate,
                    effects: candidate.effects.filter((_current, position) => position !== effectIndex),
                  }
                : candidate);
              update({ ...document, traits });
              render();
            },
          }));
        }
        const addEffect = element('button', {
          className: 'button-secondary',
          text: 'Add effect',
          attributes: {
            type: 'button',
            ...orderedCollectionAnchorAttributes(authoringPathKey([
              'traits', traitIndex, 'effects',
            ])),
          },
        });
        addEffect.addEventListener('click', () => {
          const traits = document.traits.map((candidate, index) => index === traitIndex
            ? {
                ...candidate,
                effects: [...candidate.effects, emptyEffect('damage_resistance', itemUuid())],
              }
            : candidate);
          update({ ...document, traits });
          render();
        });
        card.append(effects, addEffect, createOrderedCardControls({
          collectionKey: 'species-traits',
          itemKey: trait.draft_item_uuid,
          accessibleName: trait.name || `trait ${String(traitIndex + 1)}`,
          position: traitIndex + 1,
          count: document.traits.length,
          onMoveUp: () => {
            update({ ...document, traits: move(document.traits, traitIndex, traitIndex - 1) });
            render();
          },
          onMoveDown: () => {
            update({ ...document, traits: move(document.traits, traitIndex, traitIndex + 1) });
            render();
          },
          onRemove: () => {
            update({
              ...document,
              traits: document.traits.filter((_candidate, index) => index !== traitIndex),
            });
            render();
          },
        }));
        traitsSection.append(card);
      }
    };
    renderTraits();

    const grantsSection = element('section', {
      className: 'species-grants-section',
      attributes: { 'aria-labelledby': 'species-grants-heading' },
    });
    const renderGrants = (): void => {
      clear(grantsSection);
      const add = element('button', {
        className: 'button-secondary',
        text: 'Add grant',
        attributes: {
          type: 'button',
          ...orderedCollectionAnchorAttributes('species-grants'),
        },
      });
      add.addEventListener('click', () => {
        update({
          ...document,
          grants: [...document.grants, emptyGrant('skill_proficiency', itemUuid())],
        });
        render();
      });
      grantsSection.append(
        element('h2', { text: 'Supported grants', attributes: { id: 'species-grants-heading' } }),
        element('p', {
          text: 'Only fixed spells, spell choices, and skill proficiency choices are applied mechanically.',
        }),
        add,
      );
      const replaceGrant = (grantIndex: number, changed: AuthoringDraftGrant): void => {
        update({
          ...document,
          grants: document.grants.map((current, index) =>
            index === grantIndex ? changed : current),
        });
      };
      const changeGrant = (
        grantIndex: number,
        grant: AuthoringDraftGrant,
        field: string,
        value: unknown,
      ): void => {
        Reflect.set(grant, field, value);
        replaceGrant(grantIndex, { ...grant } as AuthoringDraftGrant);
      };
      for (const [grantIndex, grant] of document.grants.entries()) {
        const prefix = `species-grant-${grant.draft_item_uuid}`;
        const card = element('fieldset', {
          className: 'species-grant-card',
          attributes: {
            'data-draft-item-uuid': grant.draft_item_uuid,
            'aria-label': `Grant ${String(grantIndex + 1)} of ${String(document.grants.length)}`,
          },
        });
        card.append(element('legend', { text: `Grant ${String(grantIndex + 1)}` }));
        const kind = element('select', { attributes: {
          id: `${prefix}-kind`,
          ...pathAttribute(['grants', grantIndex, 'kind']),
        } });
        const kinds: readonly AuthoringDraftGrant['kind'][] = [
          'fixed_spell', 'choice_from_list', 'choice_from_query', 'skill_proficiency',
        ];
        for (const value of kinds) {
          kind.append(element('option', { text: titleCase(value), attributes: { value } }));
        }
        kind.value = grant.kind;
        kind.addEventListener('change', () => {
          const selected = kinds.find((candidate) => candidate === kind.value);
          if (selected === undefined) return;
          replaceGrant(grantIndex, emptyGrant(selected, grant.draft_item_uuid));
          render();
        });
        card.append(...labelledControl('Grant kind', kind.id, kind));
        if (grant.kind !== 'skill_proficiency') {
          card.append(...spellGrantControls({
            grant,
            prefix,
            pathAttribute,
            path: ['grants', grantIndex],
            references: options.spellGrantReferences,
            peerRuleKeys: document.grants
              .filter((_, index) => index !== grantIndex)
              .map((candidate) => candidate.rule_key),
            ruleKeyScope: 'species',
            change: (field, value) => changeGrant(grantIndex, grant, field, value),
          }));
        } else {
          const ruleKey = element('input', {
            attributes: {
              id: `${prefix}-rule-key`, type: 'text', required: '',
              ...pathAttribute(['grants', grantIndex, 'rule_key']),
            },
          });
          ruleKey.value = grant.rule_key;
          ruleKey.addEventListener('input', () =>
            changeGrant(grantIndex, grant, 'rule_key', ruleKey.value));
          card.append(...labelledControl('Stable grant label', ruleKey.id, ruleKey));
        }
        if (grant.kind === 'fixed_spell') {
          const prepared = element('input', {
            attributes: { id: `${prefix}-prepared`, type: 'checkbox' },
          });
          prepared.checked = grant.always_prepared;
          prepared.addEventListener('change', () =>
            changeGrant(grantIndex, grant, 'always_prepared', prepared.checked));
          card.append(
            ...labelledControl('Always prepared', prepared.id, prepared),
          );
        } else if (grant.kind === 'choice_from_list') {
          const count = element('input', {
            attributes: {
              id: `${prefix}-count`, type: 'number', min: '1', step: '1', required: '',
              ...pathAttribute(['grants', grantIndex, 'count']),
            },
          });
          count.value = grant.count === null ? '' : String(grant.count);
          count.addEventListener('input', () =>
            changeGrant(grantIndex, grant, 'count', nullableInteger(count.value)));
          const minimum = element('input', {
            attributes: {
              id: `${prefix}-minimum-level`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['grants', grantIndex, 'minimum_spell_level']),
            },
          });
          minimum.value = grant.minimum_spell_level == null
            ? ''
            : String(grant.minimum_spell_level);
          minimum.addEventListener('input', () => changeGrant(
            grantIndex,
            grant,
            'minimum_spell_level',
            nullableInteger(minimum.value),
          ));
          const maximum = element('input', {
            attributes: {
              id: `${prefix}-maximum-level`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['grants', grantIndex, 'maximum_spell_level']),
            },
          });
          maximum.value = grant.maximum_spell_level === null
            ? ''
            : String(grant.maximum_spell_level);
          maximum.addEventListener('input', () => changeGrant(
            grantIndex,
            grant,
            'maximum_spell_level',
            nullableInteger(maximum.value),
          ));
          card.append(
            ...labelledControl('Number of spells', count.id, count),
            ...labelledControl('Minimum spell level (optional)', minimum.id, minimum),
            ...labelledControl('Maximum spell level (optional)', maximum.id, maximum),
          );
        } else if (grant.kind === 'choice_from_query') {
          const schoolsInput = element('textarea', {
            attributes: {
              id: `${prefix}-schools`,
              ...pathAttribute(['grants', grantIndex, 'schools']),
              'aria-describedby': `${prefix}-known-schools`,
            },
          });
          schoolsInput.value = grant.schools.join('\n');
          schoolsInput.addEventListener('input', () => changeGrant(
            grantIndex,
            grant,
            'schools',
            textLines(schoolsInput.value) as typeof grant.schools,
          ));
          const known = element('p', {
            text: `Known schools: ${spellSchools.join(', ')}. Custom schools are allowed, one per line.`,
            attributes: { id: `${prefix}-known-schools` },
          });
          const tags = element('textarea', {
            attributes: {
              id: `${prefix}-tags`,
              ...pathAttribute(['grants', grantIndex, 'tags']),
            },
          });
          tags.value = grant.tags.join('\n');
          tags.addEventListener('input', () =>
            changeGrant(grantIndex, grant, 'tags', textLines(tags.value)));
          const count = element('input', {
            attributes: {
              id: `${prefix}-count`, type: 'number', min: '1', step: '1', required: '',
              ...pathAttribute(['grants', grantIndex, 'count']),
            },
          });
          count.value = grant.count === null ? '' : String(grant.count);
          count.addEventListener('input', () =>
            changeGrant(grantIndex, grant, 'count', nullableInteger(count.value)));
          const minimum = element('input', {
            attributes: {
              id: `${prefix}-minimum-level`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['grants', grantIndex, 'minimum_spell_level']),
            },
          });
          minimum.value = grant.minimum_spell_level === null
            ? ''
            : String(grant.minimum_spell_level);
          minimum.addEventListener('input', () => changeGrant(
            grantIndex,
            grant,
            'minimum_spell_level',
            nullableInteger(minimum.value),
          ));
          const maximum = element('input', {
            attributes: {
              id: `${prefix}-maximum-level`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['grants', grantIndex, 'maximum_spell_level']),
            },
          });
          maximum.value = grant.maximum_spell_level === null
            ? ''
            : String(grant.maximum_spell_level);
          maximum.addEventListener('input', () => changeGrant(
            grantIndex,
            grant,
            'maximum_spell_level',
            nullableInteger(maximum.value),
          ));
          card.append(
            ...labelledControl('Schools (known or custom, one per line)', schoolsInput.id, schoolsInput),
            known,
            ...labelledControl('Tags (one per line)', tags.id, tags),
            ...labelledControl('Number of spells', count.id, count),
            ...labelledControl('Minimum spell level (optional)', minimum.id, minimum),
            ...labelledControl('Maximum spell level (optional)', maximum.id, maximum),
          );
        } else {
          const count = element('input', {
            attributes: {
              id: `${prefix}-count`, type: 'number', min: '1', step: '1', required: '',
              ...pathAttribute(['grants', grantIndex, 'count']),
            },
          });
          count.value = grant.count === null ? '' : String(grant.count);
          count.addEventListener('input', () =>
            changeGrant(grantIndex, grant, 'count', nullableInteger(count.value)));
          const choices = element('fieldset', {
            className: 'species-skill-choices',
            attributes: {
              tabindex: '-1',
              ...pathAttribute(['grants', grantIndex, 'skills']),
            },
          });
          choices.append(element('legend', { text: 'Available skills' }));
          for (const skill of skills) {
            const input = element('input', {
              attributes: { id: `${prefix}-skill-${skill}`, type: 'checkbox', value: skill },
            });
            input.checked = grant.skills.includes(skill);
            input.addEventListener('change', () => {
              const selected: readonly Skill[] = input.checked
                ? [...grant.skills, skill]
                : grant.skills.filter((candidate) => candidate !== skill);
              changeGrant(grantIndex, grant, 'skills', selected);
            });
            choices.append(
              input,
              element('label', { text: titleCase(skill), attributes: { for: input.id } }),
            );
          }
          card.append(...labelledControl('Number of skills to choose', count.id, count), choices);
        }
        card.append(createOrderedCardControls({
          collectionKey: 'species-grants',
          itemKey: grant.draft_item_uuid,
          accessibleName: grant.rule_key || `grant ${String(grantIndex + 1)}`,
          position: grantIndex + 1,
          count: document.grants.length,
          onMoveUp: () => {
            update({ ...document, grants: move(document.grants, grantIndex, grantIndex - 1) });
            render();
          },
          onMoveDown: () => {
            update({ ...document, grants: move(document.grants, grantIndex, grantIndex + 1) });
            render();
          },
          onRemove: () => {
            update({
              ...document,
              grants: document.grants.filter((_candidate, index) => index !== grantIndex),
            });
            render();
          },
        }));
        grantsSection.append(card);
      }
    };
    renderGrants();

    const save = element('button', {
      className: 'button-secondary', text: 'Save draft', attributes: {
        type: 'button',
        'data-authoring-action': 'save-draft',
      },
    });
    const preview = element('button', {
      className: 'button-primary', text: 'Preview publish', attributes: { type: 'submit' },
    });
    const saveDraft = async (): Promise<boolean> => {
      save.disabled = true;
      preview.disabled = true;
      showDraftSaveProgress(status);
      try {
        const saved = await options.client.saveDraft({
          draft_uuid: stored.draft_uuid,
          expected_revision: stored.revision,
          document,
        });
        if (saved.content_kind !== 'species' || saved.document.kind !== 'species') {
          throw new TypeError('Saving the species draft returned a different content kind.');
        }
        clear(validationMount);
        stored = saved as StoredSpeciesDraft;
        document = stored.document;
        dirty = false;
        options.onSaved?.(stored);
        showDraftSaveSuccess(status, `Saved revision ${String(stored.revision)}.`);
        return true;
      } catch (error) {
        const conflict = draftRevisionConflict(error);
        if (conflict !== null) {
          showDraftSaveRefusal(status);
          const dialog = createDraftConflictDialog({
            conflict,
            mount: options.context.root,
            restoreFocus: () => {
              options.mount.querySelector<HTMLButtonElement>(
                '[data-authoring-action="save-draft"]',
              )?.focus();
            },
            onLoadSaved: async () => {
              const loaded = await options.client.readDraft({ draft_uuid: stored.draft_uuid });
              if (loaded.content_kind !== 'species' || loaded.document.kind !== 'species') {
                throw new TypeError('Reloading the species draft returned a different content kind.');
              }
              stored = loaded as StoredSpeciesDraft;
              document = stored.document;
              dirty = false;
              render();
            },
            onKeepLocal: () => {
              dirty = true;
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
        if (!disposed) {
          save.disabled = false;
          preview.disabled = false;
        }
      }
    };
    save.addEventListener('click', () => void saveDraft());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (dirty) {
        status.textContent = 'Save the draft before previewing publish.';
        status.setAttribute('role', 'alert');
        save.focus();
        return;
      }
      preview.disabled = true;
      status.textContent = 'Validating publish preview…';
      void options.client.previewPublish({
        draft_uuid: stored.draft_uuid,
        expected_revision: stored.revision,
      }).then((publishPreview) => {
        if (disposed) return;
        clear(validationMount);
        options.mount.querySelector('.species-publish-preview')?.remove();
        const previewElement = previewList(
          publishPreview,
          document,
          options.spellGrantReferences,
        );
        const publish = element('button', {
          className: 'button-primary', text: 'Publish species', attributes: {
            type: 'button',
            'data-authoring-action': 'publish-species',
          },
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
            restoreFocus: () => {
              options.mount.querySelector<HTMLButtonElement>(
                '[data-authoring-action="publish-species"]',
              )?.focus();
            },
          });
          dialogs.push(dialog);
        });
        previewElement.append(publish);
        options.mount.append(previewElement);
        status.textContent = publishPreview.review.length === 0
          ? 'Preview ready.'
          : 'Preview ready; content adoption review is required.';
      }).catch((error: unknown) => {
        if (disposed) return;
        const issues = validationIssues(error);
        if (issues !== null) {
          clear(validationMount);
          validationMount.append(renderValidationSummary(form, issues));
          status.textContent = `${String(issues.length)} field issue(s) found.`;
        } else {
          status.textContent = error instanceof Error ? error.message : String(error);
          status.setAttribute('role', 'alert');
        }
      }).finally(() => {
        if (!disposed) preview.disabled = false;
      });
    });
    form.append(
      validationMount,
      rootFields,
      traitsSection,
      grantsSection,
      element('div', { className: 'species-form-actions' }, [save, preview]),
      status,
    );
    options.mount.append(form);
  };

  render();
  return () => {
    disposed = true;
    for (const dialog of dialogs.splice(0)) dialog.cleanup();
    for (const cleanup of installGuards.splice(0)) cleanup();
  };
}

export function isStoredSpeciesDraft(
  draft: StoredHomebrewDraft,
): draft is StoredSpeciesDraft {
  return draft.content_kind === 'species' && draft.document.kind === 'species';
}
