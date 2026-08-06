import type { AuthoringClient } from '../../../authoring/client';
import type {
  AuthoringDraftGrant,
  AuthoringValidationIssue,
  PublishPreview,
  PublishResult,
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
  SubclassAuthoringDraftFeature,
  SubclassAuthoringDraftProgressionRow,
} from '../../../authoring/contracts';
import type {
  AuthoringDraftFeatureEffect,
} from '../../../authoring/effect-forms';
import type { HomebrewDraftItemUuid } from '../../../authoring/ids';
import { subclassProgressionScheduleIssues } from '../../../authoring/subclass-progression-validation';
import type { GuidedClassOption } from '../../../builder/contracts';
import {
  abilities,
  characterLevels,
  rulesEditions,
  spellSchools,
  type CharacterLevel,
  type FeatureTemplateEffectKind,
  type ProgressionType,
} from '../../../domain/enums';
import type { ContentKey } from '../../../domain/ids';
import { RpcError } from '../../../rpc/protocol';
import {
  authoringPathKey,
  createEffectCard,
  createOrderedCardControls,
  installDraftBeforeUnloadGuard,
  installDraftNavigationGuard,
  isFeatureEffectKind,
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
import type { ScreenContext } from '../../screen';

type StoredSubclassDraft = StoredHomebrewDraft & {
  readonly content_kind: 'subclass';
  readonly document: SubclassAuthoringDraft;
};

export interface SubclassFormOptions {
  readonly context: ScreenContext;
  readonly client: AuthoringClient;
  readonly mount: HTMLElement;
  readonly draft: StoredSubclassDraft;
  readonly parentClasses: readonly GuidedClassOption[];
  readonly randomUuid?: () => string;
  readonly confirmLeave?: () => boolean;
  readonly windowObject?: Window;
}

const overrideCasterContributions = [
  'full',
  'half_up',
  'half_down',
  'third_up',
  'third_down',
] as const satisfies readonly Exclude<ProgressionType, 'none' | 'pact'>[];

function pathAttribute(path: readonly (string | number)[]): Readonly<Record<string, string>> {
  return { 'data-authoring-path': authoringPathKey(path) };
}

function labelledControl(label: string, id: string, control: HTMLElement): readonly HTMLElement[] {
  return [element('label', { text: label, attributes: { for: id } }), control];
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

function move<T>(values: readonly T[], from: number, to: number): readonly T[] {
  if (to < 0 || to >= values.length) return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function orderedFeatures(
  features: readonly SubclassAuthoringDraftFeature[],
): readonly SubclassAuthoringDraftFeature[] {
  return features.map((feature, sourceOrder) => ({ feature, sourceOrder }))
    .sort((left, right) =>
      (left.feature.class_level ?? 21) - (right.feature.class_level ?? 21) ||
      left.sourceOrder - right.sourceOrder)
    .map(({ feature }) => feature);
}

function row(classLevel: CharacterLevel): SubclassAuthoringDraftProgressionRow {
  return {
    class_level: classLevel,
    cantrips_known: 0,
    prepared_or_known_count: 0,
    maximum_spell_level: 0,
    slot_counts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    grants: [],
  };
}

function emptyOverrideRows(): readonly SubclassAuthoringDraftProgressionRow[] {
  return characterLevels.map(row);
}

function emptyFeatureEffect(
  kind: FeatureTemplateEffectKind,
  draftItemUuid: HomebrewDraftItemUuid,
): AuthoringDraftFeatureEffect {
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
    case 'extra_attack':
      return { kind, ...common, attack_count: null, weapon_scope: null };
  }
}

function changedEffect(
  effect: AuthoringDraftFeatureEffect,
  field: string,
  value: AuthoringEffectFieldValue,
): AuthoringDraftFeatureEffect {
  Reflect.set(effect, field, value);
  return { ...effect } as AuthoringDraftFeatureEffect;
}

function emptyGrant(
  kind: Exclude<AuthoringDraftGrant['kind'], 'skill_proficiency'>,
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

/** Inline mirror of the publisher's dense progression schedule checks. */
export function subclassProgressionGridIssues(
  progression: SubclassAuthoringDraft['progression'],
): readonly AuthoringValidationIssue[] {
  if (progression.mode !== 'override') return [];
  const issues = [...subclassProgressionScheduleIssues(progression)];
  progression.rows.forEach((current, index) => {
    const path = ['progression', 'rows', index] as const;
    if (current.class_level !== index + 1) {
      issues.push(Object.freeze({
        path: Object.freeze([...path, 'class_level']),
        code: 'invalid_value',
        message: `Progression row ${String(index + 1)} must represent class level ${String(index + 1)}.`,
      }));
    }
  });
  return Object.freeze(issues);
}

function previewElement(preview: PublishPreview): HTMLElement {
  if (preview.aggregate.kind !== 'subclass') {
    throw new TypeError('The subclass form received a non-subclass publish preview.');
  }
  const aggregate = preview.aggregate;
  const root = element('section', {
    className: 'subclass-publish-preview panel',
    attributes: { 'aria-labelledby': 'subclass-publish-preview-heading' },
  });
  root.append(element('h2', {
    text: 'Publish preview',
    attributes: { id: 'subclass-publish-preview-heading' },
  }));
  const name = element('p');
  name.append('Name: ', freeTextSpan(aggregate.name));
  root.append(name, element('p', {
    text: `Rules edition: ${aggregate.rules_edition}; progression: ${titleCase(aggregate.progression.mode)}.`,
  }));
  if (aggregate.progression.mode === 'override') {
    root.append(element('p', {
      text: `Dense override: ${aggregate.progression.rows.length} levels; ${titleCase(aggregate.progression.caster_contribution)} caster contribution.`,
    }));
    root.append(element('p', {
      text: aggregate.progression.spellcasting_ability === null
        ? 'No spellcasting ability is fixed by this subclass.'
        : `Spell attack = proficiency bonus + ${titleCase(aggregate.progression.spellcasting_ability)} modifier; spell save DC = 8 + those values. Character values determine the boundary-level numbers.`,
    }));
    const boundaries = element('table', {
      className: 'subclass-progression-preview',
      attributes: { 'aria-label': 'Progression boundary preview' },
    });
    const head = element('tr');
    for (const label of ['Level', 'Cantrips', 'Prepared / known', 'Maximum spell level', 'Slots 1–9', 'Spell grants']) {
      head.append(element('th', { text: label, attributes: { scope: 'col' } }));
    }
    boundaries.append(element('thead', {}, [head]));
    const body = element('tbody');
    let previousSignature: string | null = null;
    for (const progressionRow of aggregate.progression.rows) {
      const { class_level: _classLevel, ...values } = progressionRow;
      const signature = JSON.stringify(values);
      if (signature === previousSignature) continue;
      previousSignature = signature;
      const tableRow = element('tr');
      for (const value of [
        progressionRow.class_level,
        progressionRow.cantrips_known,
        progressionRow.prepared_or_known_count,
        progressionRow.maximum_spell_level,
        progressionRow.slot_counts.join('/'),
        progressionRow.grants.length,
      ]) tableRow.append(element('td', { text: String(value) }));
      body.append(tableRow);
    }
    boundaries.append(body);
    root.append(boundaries);
  }
  const timeline = element('ol', { attributes: { 'aria-label': 'Subclass feature preview' } });
  for (const feature of aggregate.features) {
    const item = element('li');
    const heading = element('strong');
    heading.append(`Level ${String(feature.class_level)} — `, freeTextSpan(feature.name));
    const description = element('p');
    description.append(freeTextSpan(feature.description));
    const effects = element('ul');
    for (const effect of feature.effects) {
      const effectItem = element('li');
      effectItem.append(`${titleCase(effect.kind)} — `, freeTextSpan(effect.label));
      effects.append(effectItem);
    }
    item.append(heading, description, effects);
    timeline.append(item);
  }
  root.append(timeline);
  if (aggregate.reference_text !== '') {
    const reference = element('p', { className: 'authoring-reference-preview' });
    reference.append(freeTextSpan(aggregate.reference_text));
    root.append(reference);
  }
  return root;
}

function sameProgressionRow(
  left: SubclassAuthoringDraftProgressionRow,
  right: SubclassAuthoringDraftProgressionRow,
): boolean {
  const grantShape = (grants: readonly AuthoringDraftGrant[]): string => JSON.stringify(
    grants.map(({ draft_item_uuid: _draftItemUuid, ...grant }) => grant),
  );
  return left.cantrips_known === right.cantrips_known &&
    left.prepared_or_known_count === right.prepared_or_known_count &&
    left.maximum_spell_level === right.maximum_spell_level &&
    JSON.stringify(left.slot_counts) === JSON.stringify(right.slot_counts) &&
    grantShape(left.grants) === grantShape(right.grants);
}

function progressionRuns(
  rows: readonly SubclassAuthoringDraftProgressionRow[],
): readonly (readonly SubclassAuthoringDraftProgressionRow[])[] {
  const runs: SubclassAuthoringDraftProgressionRow[][] = [];
  for (const current of rows) {
    const last = runs[runs.length - 1];
    if (last === undefined || !sameProgressionRow(last[0]!, current)) {
      runs.push([current]);
    } else {
      last.push(current);
    }
  }
  return runs;
}

/** Render the complete HA-8 subclass authoring session. */
export function renderSubclassForm(options: SubclassFormOptions): Cleanup {
  let stored = options.draft;
  let document = stored.document;
  let dirty = false;
  let disposed = false;
  const dialogs: (DraftConflictDialog | ContentAdoptionDialog)[] = [];
  const openLevels = new Set<CharacterLevel>(
    document.features.flatMap((feature) => feature.class_level === null ? [] : [feature.class_level]),
  );
  const randomUuid = options.randomUuid ?? (() => crypto.randomUUID());
  const itemUuid = (): HomebrewDraftItemUuid => randomUuid() as HomebrewDraftItemUuid;
  const runtimeWindow = options.windowObject ?? (
    typeof window === 'undefined' ? null : window
  );
  const readOnlyRootOnly = (): boolean => document.progression.mode === 'root_only';

  const update = (changed: SubclassAuthoringDraft): void => {
    document = changed;
    dirty = true;
    options.mount.querySelector('.subclass-publish-preview')?.remove();
    const status = options.mount.querySelector<HTMLElement>('.subclass-authoring-status');
    if (status !== null) status.textContent = 'Unsaved changes.';
  };

  const installGuards: Cleanup[] = [installDraftNavigationGuard(options.context, {
    isDirty: () => dirty,
    confirmLeave: options.confirmLeave ?? (() =>
      runtimeWindow?.confirm('Leave this subclass draft with unsaved changes?') ?? false),
  })];
  if (runtimeWindow !== null) {
    installGuards.push(installDraftBeforeUnloadGuard(runtimeWindow, () => dirty));
  }

  const renderPublished = (result: PublishResult): void => {
    dirty = false;
    clear(options.mount);
    const heading = element('h2', {
      text: result.outcome === 'created' ? 'Subclass published' : 'Matched existing content',
      attributes: { tabindex: '-1' },
    });
    const publishedName = element('p');
    publishedName.append(freeTextSpan(result.name));
    const library = element('a', {
      className: 'button-primary',
      text: 'View subclass library',
      attributes: { href: '/homebrew?tab=subclass' },
    });
    library.addEventListener('click', (event) => {
      event.preventDefault();
      options.context.router.navigate('/homebrew?tab=subclass');
    });
    options.mount.append(element('section', {
      className: 'subclass-publish-result',
      attributes: { role: 'status' },
    }, [
      heading,
      publishedName,
      element('span', {
        className: `homebrew-badge ${result.catalog_layer === 'external' ? 'homebrew-badge-homebrew' : 'homebrew-badge-neutral'}`,
        text: result.catalog_layer === 'external' ? 'Homebrew' : 'SRD',
      }),
      element('p', {
        text: result.previous_key_usage_count === 0
          ? 'No characters use a previous version.'
          : `${String(result.previous_key_usage_count)} character(s) still use the previous version.`,
      }),
      library,
    ]));
    setTimeout(() => {
      if (heading.isConnected) heading.focus();
    }, 0);
  };

  const render = (): void => {
    clear(options.mount);
    const form = element('form', {
      className: 'subclass-authoring-form',
      attributes: { novalidate: '', 'aria-label': 'Subclass authoring form' },
    });
    const validationMount = element('div', { className: 'authoring-validation-mount' });
    const status = element('p', {
      className: 'subclass-authoring-status',
      text: dirty ? 'Unsaved changes.' : `Saved revision ${String(stored.revision)}.`,
      attributes: { role: 'status', 'aria-live': 'polite' },
    });
    const locked = readOnlyRootOnly();

    const name = element('input', {
      attributes: { id: 'subclass-name', type: 'text', required: '', ...pathAttribute(['name']) },
    });
    name.value = document.name;
    name.disabled = locked;
    name.addEventListener('input', () => update({ ...document, name: name.value }));
    const edition = element('select', {
      attributes: { id: 'subclass-rules-edition', required: '', ...pathAttribute(['rules_edition']) },
    });
    edition.append(element('option', { text: 'Choose…', attributes: { value: '' } }));
    for (const value of rulesEditions) {
      edition.append(element('option', { text: value, attributes: { value } }));
    }
    edition.value = document.rules_edition ?? '';
    edition.disabled = locked;
    edition.addEventListener('change', () => {
      const value = rulesEditions.find((candidate) => candidate === edition.value) ?? null;
      update({ ...document, rules_edition: value });
    });
    const parent = element('select', {
      attributes: {
        id: 'subclass-parent-class',
        required: '',
        ...pathAttribute(['parent_class_content_key']),
      },
    });
    parent.append(element('option', { text: 'Choose a bundled class…', attributes: { value: '' } }));
    for (const candidate of options.parentClasses) {
      parent.append(element('option', {
        text: candidate.name,
        attributes: { value: candidate.content_key },
      }));
    }
    if (
      document.parent_class_content_key !== null &&
      !options.parentClasses.some((candidate) => candidate.content_key === document.parent_class_content_key)
    ) {
      parent.append(element('option', {
        text: 'Current parent (not available)',
        attributes: { value: document.parent_class_content_key },
      }));
    }
    parent.value = document.parent_class_content_key ?? '';
    parent.disabled = locked;
    parent.addEventListener('change', () => update({
      ...document,
      parent_class_content_key: parent.value === '' ? null : parent.value as ContentKey,
    }));
    const reference = element('textarea', {
      attributes: { id: 'subclass-reference-text', ...pathAttribute(['reference_text']) },
    });
    reference.value = document.reference_text;
    reference.disabled = locked;
    reference.addEventListener('input', () => update({ ...document, reference_text: reference.value }));
    const rootFields = element('fieldset', { className: 'subclass-root-fields' }, [
      element('legend', { text: 'Subclass details' }),
      ...labelledControl('Name', name.id, name),
      ...labelledControl('Rules edition', edition.id, edition),
      ...labelledControl('Parent bundled class', parent.id, parent),
      element('p', {
        className: 'authoring-mechanic-disclosure',
        text: 'Only bundled classes can be subclass parents. The publish service enforces this boundary.',
      }),
      ...labelledControl('Reference text for mechanics not applied to the sheet', reference.id, reference),
    ]);
    if (locked) {
      rootFields.append(element('p', {
        className: 'authoring-mechanic-disclosure',
        attributes: { role: 'status' },
        text: 'This copied subclass uses a root-only progression. It can be republished unchanged; choose the dense progression mode to unlock fields and timeline controls for editing.',
      }));
    }

    const progressionSection = element('section', {
      className: 'subclass-progression-section',
      attributes: { 'aria-labelledby': 'subclass-progression-heading' },
    });
    const progressionHeading = element('h2', {
      text: 'Spellcasting progression',
      attributes: { id: 'subclass-progression-heading' },
    });
    const mode = element('select', {
      attributes: { id: 'subclass-progression-mode', ...pathAttribute(['progression']) },
    });
    if (document.progression.mode !== 'root_only') {
      mode.append(element('option', {
        text: 'Inherit parent progression',
        attributes: { value: 'inherit_parent' },
      }));
    }
    mode.append(element('option', {
      text: 'Override with a dense 20-level progression',
      attributes: { value: 'override' },
    }));
    if (document.progression.mode === 'root_only') {
      mode.append(element('option', {
        text: 'Preserve copied root-only progression',
        attributes: { value: 'root_only' },
      }));
    }
    mode.value = document.progression.mode;
    mode.addEventListener('change', () => {
      if (mode.value === 'inherit_parent') {
        update({ ...document, progression: { mode: 'inherit_parent' } });
      } else if (mode.value === 'override') {
        update({
          ...document,
          progression: {
            mode: 'override',
            spellcasting_ability: null,
            caster_contribution: 'third_down',
            rows: emptyOverrideRows(),
          },
        });
      }
      render();
    });
    progressionSection.append(
      progressionHeading,
      ...labelledControl('Progression mode', mode.id, mode),
    );
    form.append(validationMount, rootFields, progressionSection);

    if (document.progression.mode === 'root_only') {
      progressionSection.append(element('p', {
        text: `Copied root contribution: ${document.progression.caster_fraction ?? 'none'}; rounding: ${document.progression.caster_rounding ?? 'none'}; ability: ${document.progression.spellcasting_ability ?? 'none'}.`,
      }));
    }

    const progressionChecks = element('div', { className: 'subclass-progression-checks' });
    const refreshProgressionChecks = (): void => {
      clear(progressionChecks);
      for (const invalid of Array.from(
        form.querySelectorAll<HTMLElement>('.subclass-progression-grid [aria-invalid="true"]'),
      )) invalid.removeAttribute('aria-invalid');
      const issues = subclassProgressionGridIssues(document.progression);
      if (issues.length === 0) {
        progressionChecks.append(element('p', {
          text: 'Progression check: all filled values are monotonic and slot levels have no gaps.',
          attributes: { role: 'status' },
        }));
        return;
      }
      const summary = element('section', {
        className: 'subclass-progression-issues',
        attributes: { role: 'alert', 'aria-labelledby': 'subclass-progression-issues-heading' },
      });
      summary.append(element('h3', {
        text: 'Fix progression gaps',
        attributes: { id: 'subclass-progression-issues-heading' },
      }));
      const list = element('ul');
      for (const issue of issues) {
        const target = Array.from(form.querySelectorAll<HTMLElement>('[data-authoring-path]'))
          .find((candidate) => candidate.getAttribute('data-authoring-path') === authoringPathKey(issue.path));
        target?.setAttribute('aria-invalid', 'true');
        const item = element('li');
        if (target === undefined) {
          item.textContent = issue.message;
        } else {
          const focus = element('button', { text: issue.message, attributes: { type: 'button' } });
          focus.addEventListener('click', () => target.focus());
          item.append(focus);
        }
        list.append(item);
      }
      summary.append(list);
      progressionChecks.append(summary);
    };

    if (document.progression.mode === 'override') {
      const progression = document.progression;
      const liveOverride = (): Extract<
        SubclassAuthoringDraft['progression'],
        { readonly mode: 'override' }
      > => {
        if (document.progression.mode !== 'override') {
          throw new TypeError('The progression editor is no longer in override mode.');
        }
        return document.progression;
      };
      const spellAbility = element('select', {
        attributes: {
          id: 'subclass-spellcasting-ability',
          ...pathAttribute(['progression', 'spellcasting_ability']),
        },
      });
      spellAbility.append(element('option', { text: 'No spellcasting ability', attributes: { value: '' } }));
      for (const ability of abilities) {
        spellAbility.append(element('option', { text: titleCase(ability), attributes: { value: ability } }));
      }
      spellAbility.value = progression.spellcasting_ability ?? '';
      spellAbility.addEventListener('change', () => {
        const live = liveOverride();
        update({
          ...document,
          progression: {
            ...live,
            spellcasting_ability: abilities.find((candidate) => candidate === spellAbility.value) ?? null,
          },
        });
      });
      const contribution = element('select', {
        attributes: {
          id: 'subclass-caster-contribution',
          required: '',
          ...pathAttribute(['progression', 'caster_contribution']),
        },
      });
      contribution.append(element('option', { text: 'Choose…', attributes: { value: '' } }));
      for (const value of overrideCasterContributions) {
        contribution.append(element('option', { text: titleCase(value), attributes: { value } }));
      }
      contribution.value = progression.caster_contribution ?? '';
      contribution.addEventListener('change', () => {
        const value = overrideCasterContributions.find((candidate) => candidate === contribution.value) ?? null;
        const live = liveOverride();
        update({ ...document, progression: { ...live, caster_contribution: value } });
      });
      progressionSection.append(
        ...labelledControl('Spellcasting ability (optional)', spellAbility.id, spellAbility),
        ...labelledControl('Caster contribution', contribution.id, contribution),
        progressionChecks,
      );
      const grid = element('div', {
        className: 'subclass-progression-grid',
        attributes: { 'aria-label': 'Levels 1 through 20 spellcasting progression grid' },
      });

      const replaceProgressionRow = (
        rowIndex: number,
        changed: SubclassAuthoringDraftProgressionRow,
      ): void => {
        const live = liveOverride();
        const rows = live.rows.map((candidate, index) => index === rowIndex ? changed : candidate);
        update({ ...document, progression: { ...live, rows } });
        refreshProgressionChecks();
      };
      const renderGrant = (
        rowIndex: number,
        grantIndex: number,
        grant: AuthoringDraftGrant,
      ): HTMLFieldSetElement => {
        const prefix = `subclass-progression-${String(rowIndex + 1)}-grant-${grant.draft_item_uuid}`;
        const card = element('fieldset', {
          className: 'subclass-progression-grant-card',
          attributes: { 'aria-label': `Spell grant ${String(grantIndex + 1)} at class level ${String(rowIndex + 1)}` },
        });
        card.append(element('legend', { text: `Spell grant ${String(grantIndex + 1)}` }));
        if (grant.kind === 'skill_proficiency') {
          card.append(element('p', {
            className: 'authoring-mechanic-disclosure',
            text: 'This copied non-spell grant is preserved but cannot be edited by the subclass spell-progression form.',
          }));
          return card;
        }
        const spellKinds = ['fixed_spell', 'choice_from_list', 'choice_from_query'] as const;
        const kind = element('select', {
          attributes: {
            id: `${prefix}-kind`,
            ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'kind']),
          },
        });
        for (const value of spellKinds) {
          kind.append(element('option', { text: titleCase(value), attributes: { value } }));
        }
        kind.value = grant.kind;
        kind.addEventListener('change', () => {
          const selected = spellKinds.find((candidate) => candidate === kind.value);
          if (selected === undefined) return;
          const liveRow = liveOverride().rows[rowIndex]!;
          const grants = liveRow.grants.map((candidate, index) =>
            index === grantIndex ? emptyGrant(selected, grant.draft_item_uuid) : candidate);
          replaceProgressionRow(rowIndex, { ...liveRow, grants });
          render();
        });
        const ruleKey = element('input', {
          attributes: {
            id: `${prefix}-rule-key`, type: 'text', required: '',
            ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'rule_key']),
          },
        });
        ruleKey.value = grant.rule_key;
        const changeGrant = (field: string, value: unknown): void => {
          Reflect.set(grant, field, value);
          const liveRow = liveOverride().rows[rowIndex]!;
          const grants = liveRow.grants.map((candidate, index) =>
            index === grantIndex ? { ...grant } as AuthoringDraftGrant : candidate);
          replaceProgressionRow(rowIndex, { ...liveRow, grants });
        };
        ruleKey.addEventListener('input', () => changeGrant('rule_key', ruleKey.value));
        card.append(
          ...labelledControl('Spell grant kind', kind.id, kind),
          ...labelledControl('Rule key', ruleKey.id, ruleKey),
        );
        if (grant.kind === 'fixed_spell') {
          const spell = element('input', {
            attributes: {
              id: `${prefix}-spell`, type: 'text', required: '',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'spell_content_key']),
            },
          });
          spell.value = grant.spell_content_key ?? '';
          spell.addEventListener('input', () => changeGrant(
            'spell_content_key', spell.value === '' ? null : spell.value as ContentKey,
          ));
          const prepared = element('input', {
            attributes: { id: `${prefix}-prepared`, type: 'checkbox' },
          });
          prepared.checked = grant.always_prepared;
          prepared.addEventListener('change', () => changeGrant('always_prepared', prepared.checked));
          card.append(
            ...labelledControl('Spell content key', spell.id, spell),
            ...labelledControl('Always prepared', prepared.id, prepared),
          );
        } else if (grant.kind === 'choice_from_list') {
          const list = element('input', {
            attributes: {
              id: `${prefix}-list`, type: 'text', required: '',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'list']),
            },
          });
          list.value = grant.list;
          list.addEventListener('input', () => changeGrant('list', list.value));
          const count = element('input', {
            attributes: {
              id: `${prefix}-count`, type: 'number', min: '1', step: '1', required: '',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'count']),
            },
          });
          count.value = grant.count === null ? '' : String(grant.count);
          count.addEventListener('input', () => changeGrant('count', nullableInteger(count.value)));
          const maximum = element('input', {
            attributes: {
              id: `${prefix}-maximum`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'maximum_spell_level']),
            },
          });
          maximum.value = grant.maximum_spell_level === null ? '' : String(grant.maximum_spell_level);
          maximum.addEventListener('input', () => changeGrant('maximum_spell_level', nullableInteger(maximum.value)));
          card.append(
            ...labelledControl('Spell list', list.id, list),
            ...labelledControl('Number of spells', count.id, count),
            ...labelledControl('Maximum spell level (optional)', maximum.id, maximum),
          );
        } else {
          const schools = element('textarea', {
            attributes: {
              id: `${prefix}-schools`,
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'schools']),
            },
          });
          schools.value = grant.schools.join('\n');
          schools.addEventListener('input', () => changeGrant(
            'schools', textLines(schools.value) as typeof grant.schools,
          ));
          const tags = element('textarea', {
            attributes: {
              id: `${prefix}-tags`,
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'tags']),
            },
          });
          tags.value = grant.tags.join('\n');
          tags.addEventListener('input', () => changeGrant('tags', textLines(tags.value)));
          const count = element('input', {
            attributes: {
              id: `${prefix}-count`, type: 'number', min: '1', step: '1', required: '',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'count']),
            },
          });
          count.value = grant.count === null ? '' : String(grant.count);
          count.addEventListener('input', () => changeGrant('count', nullableInteger(count.value)));
          const minimum = element('input', {
            attributes: {
              id: `${prefix}-minimum`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'minimum_spell_level']),
            },
          });
          minimum.value = grant.minimum_spell_level === null ? '' : String(grant.minimum_spell_level);
          minimum.addEventListener('input', () => changeGrant('minimum_spell_level', nullableInteger(minimum.value)));
          const maximum = element('input', {
            attributes: {
              id: `${prefix}-maximum`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'maximum_spell_level']),
            },
          });
          maximum.value = grant.maximum_spell_level === null ? '' : String(grant.maximum_spell_level);
          maximum.addEventListener('input', () => changeGrant('maximum_spell_level', nullableInteger(maximum.value)));
          card.append(
            ...labelledControl('Schools (known or custom, one per line)', schools.id, schools),
            element('p', { text: `Known schools: ${spellSchools.join(', ')}.` }),
            ...labelledControl('Tags (one per line)', tags.id, tags),
            ...labelledControl('Number of spells', count.id, count),
            ...labelledControl('Minimum spell level (optional)', minimum.id, minimum),
            ...labelledControl('Maximum spell level (optional)', maximum.id, maximum),
          );
        }
        card.append(createOrderedCardControls({
          accessibleName: grant.rule_key || `spell grant ${String(grantIndex + 1)}`,
          position: grantIndex + 1,
          count: progression.rows[rowIndex]!.grants.length,
          onMoveUp: () => {
            const liveRow = liveOverride().rows[rowIndex]!;
            replaceProgressionRow(rowIndex, {
              ...liveRow,
              grants: move(liveRow.grants, grantIndex, grantIndex - 1),
            });
            render();
          },
          onMoveDown: () => {
            const liveRow = liveOverride().rows[rowIndex]!;
            replaceProgressionRow(rowIndex, {
              ...liveRow,
              grants: move(liveRow.grants, grantIndex, grantIndex + 1),
            });
            render();
          },
          onRemove: () => {
            const liveRow = liveOverride().rows[rowIndex]!;
            replaceProgressionRow(rowIndex, {
              ...liveRow,
              grants: liveRow.grants.filter((_candidate, index) => index !== grantIndex),
            });
            render();
          },
        }));
        return card;
      };
      const renderRow = (current: SubclassAuthoringDraftProgressionRow): HTMLFieldSetElement => {
        const rowIndex = current.class_level - 1;
        const fieldset = element('fieldset', {
          className: 'subclass-progression-row',
          attributes: { 'aria-label': `Class level ${String(current.class_level)} progression` },
        });
        fieldset.append(element('legend', { text: `Class level ${String(current.class_level)}` }));
        const numeric = (
          key: 'cantrips_known' | 'prepared_or_known_count' | 'maximum_spell_level',
          label: string,
          maximum?: number,
        ): readonly HTMLElement[] => {
          const id = `subclass-progression-${String(current.class_level)}-${key}`;
          const input = element('input', {
            attributes: {
              id, type: 'number', min: '0', ...(maximum === undefined ? {} : { max: String(maximum) }),
              step: '1', required: '', ...pathAttribute(['progression', 'rows', rowIndex, key]),
            },
          });
          input.value = current[key] === null ? '' : String(current[key]);
          input.addEventListener('input', () => {
            const liveRow = liveOverride().rows[rowIndex]!;
            replaceProgressionRow(rowIndex, {
              ...liveRow,
              [key]: nullableInteger(input.value),
            });
          });
          return labelledControl(label, id, input);
        };
        fieldset.append(
          ...numeric('cantrips_known', 'Cantrips known'),
          ...numeric('prepared_or_known_count', 'Prepared or known spells'),
          ...numeric('maximum_spell_level', 'Maximum spell level', 9),
        );
        const slots = element('fieldset', {
          className: 'subclass-slot-counts',
          attributes: {
            tabindex: '-1',
            ...pathAttribute(['progression', 'rows', rowIndex, 'slot_counts']),
          },
        });
        slots.append(element('legend', { text: 'Spell slots by spell level' }));
        for (const slotIndex of Array.from({ length: 9 }, (_unused, index) => index)) {
          const id = `subclass-progression-${String(current.class_level)}-slot-${String(slotIndex + 1)}`;
          const slot = element('input', {
            attributes: { id, type: 'number', min: '0', step: '1', required: '' },
          });
          slot.value = current.slot_counts[slotIndex] === undefined ? '' : String(current.slot_counts[slotIndex]);
          slot.addEventListener('input', () => {
            const liveRow = liveOverride().rows[rowIndex]!;
            const counts = [...liveRow.slot_counts];
            const value = nullableInteger(slot.value);
            counts[slotIndex] = value ?? 0;
            replaceProgressionRow(rowIndex, { ...liveRow, slot_counts: counts });
          });
          slots.append(...labelledControl(`Spell level ${String(slotIndex + 1)} slots`, id, slot));
        }
        const grants = element('div', {
          className: 'subclass-progression-grants',
          attributes: { 'aria-label': `Spell grants at class level ${String(current.class_level)}` },
        });
        for (const [grantIndex, grant] of current.grants.entries()) {
          grants.append(renderGrant(rowIndex, grantIndex, grant));
        }
        const addGrant = element('button', {
          className: 'button-secondary',
          text: 'Add spell grant',
          attributes: { type: 'button' },
        });
        addGrant.addEventListener('click', () => {
          const liveRow = liveOverride().rows[rowIndex]!;
          replaceProgressionRow(rowIndex, {
            ...liveRow,
            grants: [...liveRow.grants, emptyGrant('fixed_spell', itemUuid())],
          });
          render();
        });
        fieldset.append(slots, grants, addGrant);
        return fieldset;
      };
      for (const run of progressionRuns(progression.rows)) {
        const first = run[0]!;
        const last = run[run.length - 1]!;
        const details = element('details', {
          className: 'subclass-progression-run',
          attributes: {
            ...(run.length === 1 ? { open: '' } : {}),
          },
        });
        details.append(element('summary', {
          text: run.length === 1
            ? `Class level ${String(first.class_level)}`
            : `Class levels ${String(first.class_level)}–${String(last.class_level)} — unchanged run; expand to edit`,
        }));
        for (const current of run) details.append(renderRow(current));
        grid.append(details);
      }
      progressionSection.append(grid);
      refreshProgressionChecks();
    }

    const timeline = element('section', {
      className: 'subclass-timeline',
      attributes: { 'aria-labelledby': 'subclass-timeline-heading' },
    });
    timeline.append(element('h2', {
      text: 'Feature timeline',
      attributes: { id: 'subclass-timeline-heading' },
    }));
    const addLevelSelect = element('select', { attributes: { id: 'subclass-add-level' } });
    for (const level of characterLevels) {
      addLevelSelect.append(element('option', { text: `Level ${String(level)}`, attributes: { value: String(level) } }));
    }
    const addLevel = element('button', {
      className: 'button-secondary',
      text: 'Add level',
      attributes: { type: 'button' },
    });
    addLevel.disabled = locked;
    addLevel.addEventListener('click', () => {
      const level = characterLevels.find((candidate) => candidate === Number(addLevelSelect.value));
      if (level === undefined) return;
      openLevels.add(level);
      render();
    });
    addLevelSelect.disabled = locked;
    timeline.append(
      element('div', { className: 'subclass-add-level-controls' }, [
        ...labelledControl('Timeline level', addLevelSelect.id, addLevelSelect),
        addLevel,
      ]),
    );

    const featureLevels = new Set<CharacterLevel>(openLevels);
    for (const feature of document.features) {
      if (feature.class_level !== null) featureLevels.add(feature.class_level);
    }
    for (const level of [...featureLevels].sort((left, right) => left - right)) {
      const group = element('section', {
        className: 'subclass-level-group',
        attributes: { 'aria-labelledby': `subclass-level-${String(level)}-heading` },
      });
      group.append(element('h3', {
        text: `Level ${String(level)}`,
        attributes: { id: `subclass-level-${String(level)}-heading` },
      }));
      const levelFeatures = document.features.filter((feature) => feature.class_level === level);
      const addFeature = element('button', {
        className: 'button-secondary',
        text: `Add feature at level ${String(level)}`,
        attributes: { type: 'button' },
      });
      addFeature.disabled = locked;
      addFeature.addEventListener('click', () => {
        const feature: SubclassAuthoringDraftFeature = {
          draft_item_uuid: itemUuid(),
          class_level: level,
          name: '',
          description: '',
          effects: [],
        };
        update({ ...document, features: orderedFeatures([...document.features, feature]) });
        render();
      });
      group.append(addFeature);
      for (const [withinLevelIndex, feature] of levelFeatures.entries()) {
        const featureIndex = document.features.indexOf(feature);
        const prefix = `subclass-feature-${feature.draft_item_uuid}`;
        const card = element('fieldset', {
          className: 'subclass-feature-card',
          attributes: {
            'data-draft-item-uuid': feature.draft_item_uuid,
            'aria-label': `Level ${String(level)} feature ${String(withinLevelIndex + 1)} of ${String(levelFeatures.length)}`,
          },
        });
        card.append(element('legend', { text: `Feature ${String(withinLevelIndex + 1)}` }));
        const featureName = element('input', {
          attributes: {
            id: `${prefix}-name`, type: 'text', required: '',
            ...pathAttribute(['features', featureIndex, 'name']),
          },
        });
        featureName.value = feature.name;
        featureName.disabled = locked;
        featureName.addEventListener('input', () => {
          const features = document.features.map((candidate, index) =>
            index === featureIndex ? { ...candidate, name: featureName.value } : candidate);
          update({ ...document, features });
        });
        const description = element('textarea', {
          attributes: {
            id: `${prefix}-description`, required: '',
            ...pathAttribute(['features', featureIndex, 'description']),
          },
        });
        description.value = feature.description;
        description.disabled = locked;
        description.addEventListener('input', () => {
          const features = document.features.map((candidate, index) =>
            index === featureIndex ? { ...candidate, description: description.value } : candidate);
          update({ ...document, features });
        });
        const featureLevel = element('select', {
          attributes: {
            id: `${prefix}-level`,
            ...pathAttribute(['features', featureIndex, 'class_level']),
          },
        });
        for (const candidate of characterLevels) {
          featureLevel.append(element('option', { text: `Level ${String(candidate)}`, attributes: { value: String(candidate) } }));
        }
        featureLevel.value = String(level);
        featureLevel.disabled = locked;
        featureLevel.addEventListener('change', () => {
          const nextLevel = characterLevels.find((candidate) => candidate === Number(featureLevel.value));
          if (nextLevel === undefined) return;
          openLevels.add(nextLevel);
          const features = document.features.map((candidate, index) =>
            index === featureIndex ? { ...candidate, class_level: nextLevel } : candidate);
          update({ ...document, features: orderedFeatures(features) });
          render();
        });
        card.append(
          ...labelledControl('Feature name', featureName.id, featureName),
          ...labelledControl('Feature description', description.id, description),
          ...labelledControl('Feature level', featureLevel.id, featureLevel),
        );
        if (feature.name !== '' || feature.description !== '') {
          const prose = element('p', { className: 'subclass-feature-prose' });
          prose.append(freeTextSpan(`${feature.name}: ${feature.description}`));
          card.append(prose);
        }
        const effects = element('div', {
          className: 'subclass-feature-effects',
          attributes: { 'aria-label': `Effects for ${feature.name || `level ${String(level)} feature ${String(withinLevelIndex + 1)}`}` },
        });
        for (const [effectIndex, effect] of feature.effects.entries()) {
          const replaceEffect = (changed: AuthoringDraftFeatureEffect): void => {
            const features = document.features.map((candidate, index) => index === featureIndex
              ? {
                  ...candidate,
                  effects: candidate.effects.map((current, position) =>
                    position === effectIndex ? changed : current),
                }
              : candidate);
            update({ ...document, features });
          };
          effects.append(createEffectCard({
            effect,
            position: effectIndex + 1,
            count: feature.effects.length,
            allowFeatureOnly: true,
            disabled: locked,
            pathPrefix: ['features', featureIndex, 'effects', effectIndex],
            onKindChange: (kind) => {
              if (!isFeatureEffectKind(kind)) return;
              replaceEffect(emptyFeatureEffect(kind, effect.draft_item_uuid));
              render();
            },
            onCommonChange: (field, value) => replaceEffect(changedEffect(effect, field, value)),
            onFieldChange: (field, value) => replaceEffect(changedEffect(effect, field, value)),
            onMoveUp: () => {
              const features = document.features.map((candidate, index) => index === featureIndex
                ? { ...candidate, effects: move(candidate.effects, effectIndex, effectIndex - 1) }
                : candidate);
              update({ ...document, features });
              render();
            },
            onMoveDown: () => {
              const features = document.features.map((candidate, index) => index === featureIndex
                ? { ...candidate, effects: move(candidate.effects, effectIndex, effectIndex + 1) }
                : candidate);
              update({ ...document, features });
              render();
            },
            onRemove: () => {
              const features = document.features.map((candidate, index) => index === featureIndex
                ? { ...candidate, effects: candidate.effects.filter((_current, position) => position !== effectIndex) }
                : candidate);
              update({ ...document, features });
              render();
            },
          }));
        }
        const addEffect = element('button', {
          className: 'button-secondary',
          text: 'Add effect',
          attributes: { type: 'button' },
        });
        addEffect.disabled = locked;
        addEffect.addEventListener('click', () => {
          const features = document.features.map((candidate, index) => index === featureIndex
            ? { ...candidate, effects: [...candidate.effects, emptyFeatureEffect('armor_class_bonus', itemUuid())] }
            : candidate);
          update({ ...document, features });
          render();
        });
        const reorder = createOrderedCardControls({
          accessibleName: feature.name || `level ${String(level)} feature ${String(withinLevelIndex + 1)}`,
          position: withinLevelIndex + 1,
          count: levelFeatures.length,
          disabled: locked,
          onMoveUp: () => {
            if (withinLevelIndex === 0) return;
            const prior = levelFeatures[withinLevelIndex - 1]!;
            const priorIndex = document.features.findIndex((candidate) =>
              candidate.draft_item_uuid === prior.draft_item_uuid);
            if (priorIndex < 0) return;
            const features = [...document.features];
            [features[featureIndex], features[priorIndex]] = [features[priorIndex]!, features[featureIndex]!];
            update({ ...document, features });
            render();
          },
          onMoveDown: () => {
            const next = levelFeatures[withinLevelIndex + 1];
            if (next === undefined) return;
            const nextIndex = document.features.findIndex((candidate) =>
              candidate.draft_item_uuid === next.draft_item_uuid);
            if (nextIndex < 0) return;
            const features = [...document.features];
            [features[featureIndex], features[nextIndex]] = [features[nextIndex]!, features[featureIndex]!];
            update({ ...document, features });
            render();
          },
          onRemove: () => {
            update({
              ...document,
              features: document.features.filter((_candidate, index) => index !== featureIndex),
            });
            render();
          },
        });
        card.append(effects, addEffect, reorder);
        group.append(card);
      }
      timeline.append(group);
    }

    const save = element('button', {
      className: 'button-secondary',
      text: 'Save draft',
      attributes: { type: 'button', 'data-authoring-action': 'save-draft' },
    });
    const preview = element('button', {
      className: 'button-primary',
      text: 'Preview publish',
      attributes: { type: 'submit' },
    });
    const saveDraft = async (): Promise<boolean> => {
      save.disabled = true;
      preview.disabled = true;
      status.textContent = 'Saving draft…';
      try {
        const saved = await options.client.saveDraft({
          draft_uuid: stored.draft_uuid,
          expected_revision: stored.revision,
          document,
        });
        if (saved.content_kind !== 'subclass' || saved.document.kind !== 'subclass') {
          throw new TypeError('Saving the subclass draft returned a different content kind.');
        }
        stored = saved as StoredSubclassDraft;
        document = stored.document;
        dirty = false;
        status.textContent = `Saved revision ${String(stored.revision)}.`;
        return true;
      } catch (error) {
        const conflict = draftRevisionConflict(error);
        if (conflict !== null) {
          const dialog = createDraftConflictDialog({
            conflict,
            mount: options.context.root,
            restoreFocus: () => {
              options.mount.querySelector<HTMLButtonElement>('[data-authoring-action="save-draft"]')?.focus();
            },
            onLoadSaved: async () => {
              const loaded = await options.client.readDraft({ draft_uuid: stored.draft_uuid });
              if (loaded.content_kind !== 'subclass' || loaded.document.kind !== 'subclass') {
                throw new TypeError('Reloading the subclass draft returned a different content kind.');
              }
              stored = loaded as StoredSubclassDraft;
              document = stored.document;
              dirty = false;
              openLevels.clear();
              for (const feature of document.features) {
                if (feature.class_level !== null) openLevels.add(feature.class_level);
              }
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
            clear(validationMount);
            validationMount.append(renderValidationSummary(form, issues));
          } else {
            status.textContent = error instanceof Error ? error.message : String(error);
            status.setAttribute('role', 'alert');
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
      const gridIssues = subclassProgressionGridIssues(document.progression);
      if (
        document.progression.mode === 'override' &&
        document.progression.rows.length === 20 &&
        gridIssues.length > 0
      ) {
        status.textContent = 'Fix the progression gaps before previewing publish.';
        status.setAttribute('role', 'alert');
        options.mount.querySelector<HTMLElement>('.subclass-progression-issues button')?.focus();
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
        options.mount.querySelector('.subclass-publish-preview')?.remove();
        const renderedPreview = previewElement(publishPreview);
        const publish = element('button', {
          className: 'button-primary',
          text: 'Publish subclass',
          attributes: { type: 'button', 'data-authoring-action': 'publish-subclass' },
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
              options.mount.querySelector<HTMLButtonElement>('[data-authoring-action="publish-subclass"]')?.focus();
            },
          });
          dialogs.push(dialog);
        });
        renderedPreview.append(publish);
        options.mount.append(renderedPreview);
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
      timeline,
      element('div', { className: 'subclass-form-actions' }, [save, preview]),
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

export function isStoredSubclassDraft(draft: StoredHomebrewDraft): draft is StoredSubclassDraft {
  return draft.content_kind === 'subclass' && draft.document.kind === 'subclass';
}
