import type { AuthoringClient } from '../../../authoring/client';
import type {
  AuthoringDraftGrant,
  AuthoringValidationIssue,
  PublishPreview,
  PublishResult,
  SpellGrantAuthoringReferences,
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
  SubclassAuthoringDraftFeature,
  SubclassAuthoringDraftContribution,
  SubclassAuthoringDraftProgressionRow,
} from '../../../authoring/contracts';
import type {
  AuthoringDraftFeatureEffect,
} from '../../../authoring/effect-forms';
import type { HomebrewDraftItemUuid } from '../../../authoring/ids';
import { subclassProgressionScheduleIssues } from '../../../authoring/subclass-progression-validation';
import type { GuidedClassOption } from '../../../builder/contracts';
import { catalogSelectGroups } from '../../catalog-control-disclosure';
import {
  abilities,
  characterLevels,
  rulesEditions,
  spellSchools,
  type CharacterLevel,
  type FeatureTemplateEffectKind,
  type ProgressionType,
} from '../../../domain/enums';
import { featureValueKeys } from '../../../domain/feature-values';
import type { ContentKey } from '../../../domain/ids';
import { RpcError } from '../../../rpc/protocol';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import {
  authoringPathKey,
  createEffectCard,
  createOrderedCardControls,
  installDraftBeforeUnloadGuard,
  installDraftNavigationGuard,
  isFeatureEffectKind,
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
import { createAuthoringEditGeneration } from '../../authoring/edit-generation';
import { clear, element, type Cleanup } from '../../dom';
import { freeTextSpan } from '../../free-text';
import {
  abilityLabel,
  featureValueLabel,
  rulesEditionLabel,
} from '../../human-labels';
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
  readonly spellGrantReferences: SpellGrantAuthoringReferences;
  readonly randomUuid?: () => string;
  readonly confirmLeave?: () => boolean;
  readonly windowObject?: Window;
  readonly onSaved?: (draft: StoredSubclassDraft) => void;
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

function emptyContribution(
  draftItemUuid: HomebrewDraftItemUuid,
  featureLevel: CharacterLevel,
): SubclassAuthoringDraftContribution {
  return {
    kind: 'feature_value_contribution',
    draft_item_uuid: draftItemUuid,
    contribution_key: '',
    label: '',
    target: { kind: 'feature_dice_count', key: 'sneak_attack' },
    op: 'add',
    active_from_level: featureLevel,
    active_to_level: 20,
    value: { kind: 'constant', amount: null },
    supersedes_contribution_key: null,
  };
}

function sameContributionTarget(
  left: SubclassAuthoringDraftContribution,
  right: SubclassAuthoringDraftContribution,
): boolean {
  if (left.target.kind !== right.target.kind) return false;
  if (left.target.kind === 'feature_dice_count') {
    return right.target.kind === left.target.kind && left.target.key === right.target.key;
  }
  return right.target.kind === left.target.kind;
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
        bucket: 'known',
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
        bucket: 'known',
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

function previewElement(
  preview: PublishPreview,
  draft: SubclassAuthoringDraft,
  spellGrantReferences: SpellGrantAuthoringReferences,
  parentClasses: readonly GuidedClassOption[],
): HTMLElement {
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
  const parentReference = parentClasses.find((parent) =>
    parent.content_key === draft.parent_class_content_key
  );
  const parent = element('p');
  parent.append(
    'Parent class: ',
    parentReference === undefined
      ? 'Configured bundled class'
      : freeTextSpan(parentReference.name),
    ` · ${catalogLayerLabel(parentReference?.catalog_layer ?? 'unknown')}`,
  );
  root.append(name, element('p', {
    text: `Rules edition: ${rulesEditionLabel(aggregate.rules_edition)}; progression: ${titleCase(aggregate.progression.mode)}.`,
  }), parent);
  const draftGrants = draft.progression.mode === 'override'
    ? draft.progression.rows.flatMap((progressionRow) => progressionRow.grants)
    : [];
  const grantContext = {
    catalogNameForGrant: (grant: Parameters<typeof renderPublishPreviewGrant>[0]) =>
      spellCatalogNameForGrant(grant, draftGrants, spellGrantReferences),
  };
  const definitionGrants = element('ul', {
    attributes: { 'aria-label': 'Subclass grant preview' },
  });
  if (aggregate.grants.length === 0) {
    definitionGrants.append(element('li', { text: 'No definition-level grants.' }));
  } else {
    for (const grant of aggregate.grants) {
      definitionGrants.append(renderPublishPreviewGrant(grant, grantContext));
    }
  }
  root.append(definitionGrants);
  if (aggregate.progression.mode === 'override') {
    root.append(element('p', {
      text: `Dense override: ${aggregate.progression.rows.length} levels; ${titleCase(aggregate.progression.caster_contribution)} caster contribution.`,
    }));
    root.append(element('p', {
      text: aggregate.progression.spellcasting_ability === null
        ? 'No spellcasting ability is fixed by this subclass.'
        : `Spell attack = proficiency bonus + ${abilityLabel(aggregate.progression.spellcasting_ability)} modifier; spell save DC = 8 + those values. Character values determine the boundary-level numbers.`,
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
      ]) tableRow.append(element('td', { text: String(value) }));
      const grantCell = element('td');
      if (progressionRow.grants.length === 0) {
        grantCell.textContent = 'None';
      } else {
        const grantList = element('ul');
        const draftRow = draft.progression.mode === 'override'
          ? draft.progression.rows.find((candidate) =>
              candidate.class_level === progressionRow.class_level
            )
          : undefined;
        const rowGrantContext = {
          catalogNameForGrant: (grant: Parameters<typeof renderPublishPreviewGrant>[0]) =>
            spellCatalogNameForGrant(
              grant,
              draftRow?.grants ?? [],
              spellGrantReferences,
            ),
        };
        for (const grant of progressionRow.grants) {
          grantList.append(renderPublishPreviewGrant(grant, rowGrantContext));
        }
        grantCell.append(grantList);
      }
      tableRow.append(grantCell);
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
      effects.append(renderPublishPreviewEffect(effect));
    }
    for (const contribution of feature.contributions ?? []) {
      const target = contribution.target.kind === 'feature_dice_count'
        ? featureValueLabel(contribution.target.key)
        : typeof contribution.target.resource === 'string'
          ? contribution.target.resource
          : contribution.target.resource.display_label;
      const value = (() => {
        switch (contribution.value.kind) {
          case 'const':
            return `constant ${String(contribution.value.amount)}`;
          case 'scale':
            return `${String(contribution.value.multiply ?? 1)} × class level ÷ ${String(contribution.value.divide ?? 1)}, ${contribution.value.round}`;
          case 'table':
            return contribution.value.rows
              .map((row) => `${String(row.from)}–${String(row.to)}: ${String(row.amount)}`)
              .join('; ');
          case 'ref':
          case 'piecewise':
          case 'sum':
          case 'clamp':
            return 'preserved advanced expression';
        }
      })();
      const contributionItem = element('li');
      contributionItem.append(
        freeTextSpan(contribution.label),
        `: add ${value} to ${target}, levels ${String(contribution.active_from_level)}–${String(contribution.active_to_level)}`,
        contribution.supersedes === undefined
          ? '.'
          : `; supersedes ${contribution.supersedes.contribution_key} in this subclass.`,
      );
      effects.append(contributionItem);
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
  const edits = createAuthoringEditGeneration();
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
    edits.edit();
    options.mount.querySelector('.subclass-publish-preview')?.remove();
    const status = options.mount.querySelector<HTMLElement>('.subclass-authoring-status');
    if (status !== null) status.textContent = 'Unsaved changes.';
  };

  const installGuards: Cleanup[] = [installDraftNavigationGuard(options.context, {
    isDirty: () => edits.dirty,
    confirmLeave: options.confirmLeave ?? (() =>
      runtimeWindow?.confirm('Leave this subclass draft with unsaved changes?') ?? false),
  })];
  if (runtimeWindow !== null) {
    installGuards.push(installDraftBeforeUnloadGuard(runtimeWindow, () => edits.dirty));
  }

  const renderPublished = (result: PublishResult): void => {
    edits.publish();
    options.context.router.navigate(homebrewPublishedPath(
      'subclass',
      result,
      options.draft.base_content_key,
    ), { replace: true });
  };

  const discardStalePreview = (): void => {
    options.mount.querySelector('.subclass-publish-preview')?.remove();
    const liveStatus = options.mount.querySelector<HTMLElement>('.subclass-authoring-status');
    if (liveStatus === null) return;
    liveStatus.textContent = 'Draft changed; preview again.';
    liveStatus.setAttribute('role', 'alert');
  };

  const render = (): void => {
    clear(options.mount);
    const form = element('form', {
      className: 'subclass-authoring-form',
      attributes: { novalidate: '' },
    });
    const validationMount = element('div', { className: 'authoring-validation-mount' });
    const status = element('p', {
      className: 'subclass-authoring-status',
      text: edits.dirty ? 'Unsaved changes.' : `Saved revision ${String(stored.revision)}.`,
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
      edition.append(element('option', {
        text: rulesEditionLabel(value),
        attributes: { value },
      }));
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
    parent.append(...catalogSelectGroups(options.parentClasses.map((candidate) => ({
      value: candidate.content_key,
      label: candidate.name,
      catalogLayer: candidate.catalog_layer,
    }))));
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
        text: 'Only bundled classes can be subclass parents.',
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
        const changeGrant = (field: string, value: unknown): void => {
          Reflect.set(grant, field, value);
          const liveRow = liveOverride().rows[rowIndex]!;
          const grants = liveRow.grants.map((candidate, index) =>
            index === grantIndex ? { ...grant } as AuthoringDraftGrant : candidate);
          replaceProgressionRow(rowIndex, { ...liveRow, grants });
        };
        card.append(
          ...labelledControl('Spell grant kind', kind.id, kind),
          ...spellGrantControls({
            grant,
            prefix,
            pathAttribute,
            path: ['progression', 'rows', rowIndex, 'grants', grantIndex],
            references: options.spellGrantReferences,
            peerRuleKeys: (liveOverride().rows[rowIndex]?.grants ?? [])
              .filter((_, candidateGrantIndex) => candidateGrantIndex !== grantIndex)
              .map((candidate) => candidate.rule_key),
            ruleKeyScope: 'subclass_level',
            change: changeGrant,
          }),
        );
        if (grant.kind === 'fixed_spell') {
          const prepared = element('input', {
            attributes: { id: `${prefix}-prepared`, type: 'checkbox' },
          });
          prepared.checked = grant.always_prepared;
          prepared.addEventListener('change', () => changeGrant('always_prepared', prepared.checked));
          card.append(
            ...labelledControl('Always prepared', prepared.id, prepared),
          );
        } else if (grant.kind === 'choice_from_list') {
          const bucket = element('select', {
            attributes: {
              id: `${prefix}-bucket`,
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'bucket']),
            },
          });
          bucket.append(
            element('option', { text: 'Known', attributes: { value: 'known' } }),
            element('option', { text: 'Prepared', attributes: { value: 'prepared' } }),
          );
          bucket.value = grant.bucket ?? 'known';
          bucket.addEventListener('change', () => {
            if (bucket.value === 'known' || bucket.value === 'prepared') {
              changeGrant('bucket', bucket.value);
            }
          });
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
          minimum.value = grant.minimum_spell_level == null
            ? ''
            : String(grant.minimum_spell_level);
          minimum.addEventListener('input', () =>
            changeGrant('minimum_spell_level', nullableInteger(minimum.value)));
          const maximum = element('input', {
            attributes: {
              id: `${prefix}-maximum`, type: 'number', min: '0', max: '9', step: '1',
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'maximum_spell_level']),
            },
          });
          maximum.value = grant.maximum_spell_level === null ? '' : String(grant.maximum_spell_level);
          maximum.addEventListener('input', () => changeGrant('maximum_spell_level', nullableInteger(maximum.value)));
          card.append(
            ...labelledControl('Spell handling', bucket.id, bucket),
            ...labelledControl('Number of spells', count.id, count),
            ...labelledControl('Minimum spell level (optional)', minimum.id, minimum),
            ...labelledControl('Maximum spell level (optional)', maximum.id, maximum),
          );
        } else {
          const bucket = element('select', {
            attributes: {
              id: `${prefix}-bucket`,
              ...pathAttribute(['progression', 'rows', rowIndex, 'grants', grantIndex, 'bucket']),
            },
          });
          bucket.append(
            element('option', { text: 'Known', attributes: { value: 'known' } }),
            element('option', { text: 'Prepared', attributes: { value: 'prepared' } }),
          );
          bucket.value = grant.bucket ?? 'known';
          bucket.addEventListener('change', () => {
            if (bucket.value === 'known' || bucket.value === 'prepared') {
              changeGrant('bucket', bucket.value);
            }
          });
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
            ...labelledControl('Spell handling', bucket.id, bucket),
            ...labelledControl('Schools (known or custom, one per line)', schools.id, schools),
            element('p', { text: `Known schools: ${spellSchools.join(', ')}.` }),
            ...labelledControl('Tags (one per line)', tags.id, tags),
            ...labelledControl('Number of spells', count.id, count),
            ...labelledControl('Minimum spell level (optional)', minimum.id, minimum),
            ...labelledControl('Maximum spell level (optional)', maximum.id, maximum),
          );
        }
        card.append(createOrderedCardControls({
          collectionKey: `subclass-progression-${String(rowIndex)}-grants`,
          itemKey: grant.draft_item_uuid,
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
          attributes: {
            type: 'button',
            ...orderedCollectionAnchorAttributes(
              `subclass-progression-${String(rowIndex)}-grants`,
            ),
          },
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
        attributes: {
          type: 'button',
          ...orderedCollectionAnchorAttributes(`subclass-level-${String(level)}-features`),
        },
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
          attributes: {
            type: 'button',
            ...orderedCollectionAnchorAttributes(authoringPathKey([
              'features', featureIndex, 'effects',
            ])),
          },
        });
        addEffect.disabled = locked;
        addEffect.addEventListener('click', () => {
          const features = document.features.map((candidate, index) => index === featureIndex
            ? { ...candidate, effects: [...candidate.effects, emptyFeatureEffect('armor_class_bonus', itemUuid())] }
            : candidate);
          update({ ...document, features });
          render();
        });
        const contributions = element('div', {
          className: 'subclass-feature-value-contributions',
          attributes: {
            'aria-label': `Scaling feature values for ${feature.name || `level ${String(level)} feature ${String(withinLevelIndex + 1)}`}`,
          },
        });
        for (const [contributionIndex, contribution] of (
          feature.contributions ?? []
        ).entries()) {
          let liveContribution = contribution;
          const replaceContribution = (
            changed: SubclassAuthoringDraftContribution,
          ): void => {
            liveContribution = changed;
            const features = document.features.map((candidate, index) =>
              index === featureIndex
                ? {
                    ...candidate,
                    contributions: (candidate.contributions ?? []).map(
                      (current, position) =>
                        position === contributionIndex ? changed : current,
                    ),
                  }
                : candidate);
            update({ ...document, features });
          };
          const contributionPath = [
            'features', featureIndex, 'contributions', contributionIndex,
          ] as const;
          const contributionCard = element('fieldset', {
            className: 'subclass-feature-value-card',
            attributes: {
              'data-draft-item-uuid': contribution.draft_item_uuid,
              'aria-label': `Scaling feature value ${String(contributionIndex + 1)}`,
            },
          });
          contributionCard.append(element('legend', {
            text: `Scaling feature value ${String(contributionIndex + 1)}`,
          }));
          const contributionKey = element('input', {
            attributes: {
              id: `${prefix}-contribution-${String(contributionIndex)}-key`,
              type: 'text',
              ...pathAttribute([...contributionPath, 'contribution_key']),
            },
          });
          contributionKey.value = contribution.contribution_key;
          contributionKey.disabled = locked;
          contributionKey.addEventListener('input', () => replaceContribution({
            ...liveContribution,
            contribution_key: contributionKey.value,
          }));
          const contributionLabel = element('input', {
            attributes: {
              id: `${prefix}-contribution-${String(contributionIndex)}-label`,
              type: 'text',
              ...pathAttribute([...contributionPath, 'label']),
            },
          });
          contributionLabel.value = contribution.label;
          contributionLabel.disabled = locked;
          contributionLabel.addEventListener('input', () => replaceContribution({
            ...liveContribution,
            label: contributionLabel.value,
          }));
          contributionCard.append(
            ...labelledControl('Stable contribution key', contributionKey.id, contributionKey),
            ...labelledControl('Contribution label', contributionLabel.id, contributionLabel),
          );

          if (contribution.target.kind === 'preserved') {
            contributionCard.append(element('p', {
              text: 'This imported target is preserved exactly and is not editable by this form.',
            }));
          } else {
            const target = element('select', {
              attributes: {
                id: `${prefix}-contribution-${String(contributionIndex)}-target`,
                ...pathAttribute([...contributionPath, 'target']),
              },
            });
            for (const key of featureValueKeys) {
              target.append(element('option', {
                text: featureValueLabel(key),
                attributes: { value: `feature_dice_count:${key}` },
              }));
            }
            target.append(element('option', {
              text: 'Authored resource maximum',
              attributes: { value: 'resource_maximum' },
            }));
            target.value = contribution.target.kind === 'feature_dice_count'
              ? `feature_dice_count:${contribution.target.key ?? 'sneak_attack'}`
              : 'resource_maximum';
            target.disabled = locked;
            target.addEventListener('change', () => {
              replaceContribution({
                ...liveContribution,
                target: target.value === 'resource_maximum'
                  ? {
                      kind: 'resource_maximum',
                      display_label: feature.name,
                      marking_shape: 'boxes',
                    }
                  : { kind: 'feature_dice_count', key: 'sneak_attack' },
                supersedes_contribution_key: null,
              });
              render();
            });
            contributionCard.append(
              ...labelledControl('Target value', target.id, target),
            );
            if (contribution.target.kind === 'resource_maximum') {
              const resourceTarget = contribution.target;
              const displayLabel = element('input', {
                attributes: {
                  id: `${prefix}-contribution-${String(contributionIndex)}-resource-label`,
                  type: 'text',
                  ...pathAttribute([...contributionPath, 'target', 'display_label']),
                },
              });
              displayLabel.value = resourceTarget.display_label;
              displayLabel.disabled = locked;
              displayLabel.addEventListener('input', () => replaceContribution({
                ...liveContribution,
                target: {
                  ...(liveContribution.target.kind === 'resource_maximum'
                    ? liveContribution.target
                    : resourceTarget),
                  display_label: displayLabel.value,
                },
              }));
              const marking = element('select', {
                attributes: {
                  id: `${prefix}-contribution-${String(contributionIndex)}-marking`,
                  ...pathAttribute([...contributionPath, 'target', 'marking_shape']),
                },
              });
              for (const [value, text] of [
                ['boxes', 'Boxes'], ['remaining', 'Remaining uses'],
              ] as const) marking.append(element('option', { text, attributes: { value } }));
              marking.value = resourceTarget.marking_shape ?? '';
              marking.disabled = locked;
              marking.addEventListener('change', () => replaceContribution({
                ...liveContribution,
                target: {
                  ...(liveContribution.target.kind === 'resource_maximum'
                    ? liveContribution.target
                    : resourceTarget),
                  marking_shape: marking.value === 'remaining' ? 'remaining' : 'boxes',
                },
              }));
              contributionCard.append(
                ...labelledControl('Resource display label', displayLabel.id, displayLabel),
                ...labelledControl('Resource marking style', marking.id, marking),
              );
            }
          }

          const operation = element('select', {
            attributes: {
              id: `${prefix}-contribution-${String(contributionIndex)}-op`,
              ...pathAttribute([...contributionPath, 'op']),
            },
          });
          operation.append(element('option', { text: 'Add', attributes: { value: 'add' } }));
          operation.value = contribution.op ?? '';
          operation.disabled = locked;
          operation.addEventListener('change', () => replaceContribution({
            ...liveContribution,
            op: 'add',
          }));
          const levelControl = (
            field: 'active_from_level' | 'active_to_level',
            label: string,
          ) => {
            const select = element('select', {
              attributes: {
                id: `${prefix}-contribution-${String(contributionIndex)}-${field}`,
                ...pathAttribute([...contributionPath, field]),
              },
            });
            for (const candidate of characterLevels) {
              select.append(element('option', {
                text: `Level ${String(candidate)}`,
                attributes: { value: String(candidate) },
              }));
            }
            select.value = String(contribution[field] ?? '');
            select.disabled = locked;
            select.addEventListener('change', () => {
              const next = characterLevels.find((candidate) => candidate === Number(select.value));
              if (next !== undefined) replaceContribution({ ...liveContribution, [field]: next });
            });
            return labelledControl(label, select.id, select);
          };
          contributionCard.append(
            ...labelledControl('Operation', operation.id, operation),
            ...levelControl('active_from_level', 'Active from level'),
            ...levelControl('active_to_level', 'Active to level'),
          );

          if (contribution.value.kind === 'preserved') {
            contributionCard.append(element('p', {
              text: 'This imported expression uses the wider storage grammar and is preserved exactly.',
            }));
          } else {
            const valueKind = element('select', {
              attributes: {
                id: `${prefix}-contribution-${String(contributionIndex)}-value-kind`,
                ...pathAttribute([...contributionPath, 'value', 'kind']),
              },
            });
            for (const [value, text] of [
              ['constant', 'Constant'],
              ['class_level_scale', 'Class-level scale'],
              ['breakpoint_table', 'Breakpoint table'],
            ] as const) valueKind.append(element('option', { text, attributes: { value } }));
            valueKind.value = contribution.value.kind;
            valueKind.disabled = locked;
            valueKind.addEventListener('change', () => {
              const value: SubclassAuthoringDraftContribution['value'] =
                valueKind.value === 'class_level_scale'
                  ? { kind: 'class_level_scale', multiply: 1, divide: 1, round: 'floor' }
                  : valueKind.value === 'breakpoint_table'
                    ? { kind: 'breakpoint_table', rows: [] }
                    : { kind: 'constant', amount: null };
              replaceContribution({ ...liveContribution, value });
              render();
            });
            contributionCard.append(
              ...labelledControl('Scaling method', valueKind.id, valueKind),
            );
            const numberInput = (
              field: 'amount' | 'multiply' | 'divide',
              label: string,
              value: number | null,
              onChange: (next: number | null) => void,
            ) => {
              const input = element('input', {
                attributes: {
                  id: `${prefix}-contribution-${String(contributionIndex)}-${field}`,
                  type: 'number',
                  ...pathAttribute([...contributionPath, 'value', field]),
                },
              });
              input.value = value === null ? '' : String(value);
              input.disabled = locked;
              input.addEventListener('input', () => onChange(nullableInteger(input.value)));
              return labelledControl(label, input.id, input);
            };
            if (contribution.value.kind === 'constant') {
              contributionCard.append(...numberInput(
                'amount',
                'Amount',
                contribution.value.amount,
                (amount) => replaceContribution({
                  ...liveContribution,
                  value: { kind: 'constant', amount },
                }),
              ));
            } else if (contribution.value.kind === 'class_level_scale') {
              const scaleValue = contribution.value;
              contributionCard.append(
                ...numberInput('multiply', 'Multiply class level by', scaleValue.multiply, (multiply) => replaceContribution({
                  ...liveContribution,
                  value: {
                    ...(liveContribution.value.kind === 'class_level_scale'
                      ? liveContribution.value
                      : scaleValue),
                    multiply,
                  },
                })),
                ...numberInput('divide', 'Divide class level by', scaleValue.divide, (divide) => replaceContribution({
                  ...liveContribution,
                  value: {
                    ...(liveContribution.value.kind === 'class_level_scale'
                      ? liveContribution.value
                      : scaleValue),
                    divide,
                  },
                })),
              );
              const rounding = element('select', {
                attributes: {
                  id: `${prefix}-contribution-${String(contributionIndex)}-round`,
                  ...pathAttribute([...contributionPath, 'value', 'round']),
                },
              });
              for (const [value, text] of [['floor', 'Round down'], ['ceiling', 'Round up']] as const) {
                rounding.append(element('option', { text, attributes: { value } }));
              }
              rounding.value = scaleValue.round ?? '';
              rounding.disabled = locked;
              rounding.addEventListener('change', () => replaceContribution({
                ...liveContribution,
                value: {
                  ...(liveContribution.value.kind === 'class_level_scale'
                    ? liveContribution.value
                    : scaleValue),
                  round: rounding.value === 'ceiling' ? 'ceiling' : 'floor',
                },
              }));
              contributionCard.append(...labelledControl('Rounding', rounding.id, rounding));
            } else {
              for (const [rowIndex, breakpoint] of contribution.value.rows.entries()) {
                const rowMount = element('div', { className: 'subclass-breakpoint-row' });
                for (const [field, text] of [
                  ['from', 'From level'], ['to', 'To level'], ['amount', 'Amount'],
                ] as const) {
                  const input = element('input', {
                    attributes: {
                      id: `${prefix}-contribution-${String(contributionIndex)}-row-${String(rowIndex)}-${field}`,
                      type: 'number',
                      ...pathAttribute([...contributionPath, 'value', 'rows', rowIndex, field]),
                    },
                  });
                  input.value = breakpoint[field] === null ? '' : String(breakpoint[field]);
                  input.disabled = locked;
                  input.addEventListener('input', () => {
                    const rows = liveContribution.value.kind === 'breakpoint_table'
                      ? liveContribution.value.rows.map((row, index) => index === rowIndex
                          ? { ...row, [field]: nullableInteger(input.value) }
                          : row)
                      : [];
                    replaceContribution({
                      ...liveContribution,
                      value: { kind: 'breakpoint_table', rows },
                    });
                  });
                  rowMount.append(...labelledControl(text, input.id, input));
                }
                const removeRow = element('button', {
                  text: 'Remove breakpoint',
                  attributes: { type: 'button' },
                });
                removeRow.disabled = locked;
                removeRow.addEventListener('click', () => {
                  if (liveContribution.value.kind !== 'breakpoint_table') return;
                  replaceContribution({
                    ...liveContribution,
                    value: {
                      ...liveContribution.value,
                      rows: liveContribution.value.rows.filter((_row, index) => index !== rowIndex),
                    },
                  });
                  render();
                });
                rowMount.append(removeRow);
                contributionCard.append(rowMount);
              }
              const addRow = element('button', {
                text: 'Add breakpoint',
                attributes: { type: 'button' },
              });
              addRow.disabled = locked;
              addRow.addEventListener('click', () => {
                if (liveContribution.value.kind !== 'breakpoint_table') return;
                replaceContribution({
                  ...liveContribution,
                  value: {
                    ...liveContribution.value,
                    rows: [...liveContribution.value.rows, {
                      draft_item_uuid: itemUuid(), from: null, to: null, amount: null,
                    }],
                  },
                });
                render();
              });
              contributionCard.append(addRow);
            }
          }

          const supersedes = element('select', {
            attributes: {
              id: `${prefix}-contribution-${String(contributionIndex)}-supersedes`,
              ...pathAttribute([...contributionPath, 'supersedes_contribution_key']),
            },
          });
          supersedes.append(element('option', { text: 'Does not supersede another contribution', attributes: { value: '' } }));
          for (const ownerFeature of document.features) {
            for (const candidate of ownerFeature.contributions ?? []) {
              if (
                candidate.draft_item_uuid === contribution.draft_item_uuid ||
                candidate.contribution_key === '' ||
                !sameContributionTarget(candidate, contribution)
              ) continue;
              supersedes.append(element('option', {
                text: `${candidate.label || candidate.contribution_key} — this subclass`,
                attributes: { value: candidate.contribution_key },
              }));
            }
          }
          supersedes.value = contribution.supersedes_contribution_key ?? '';
          supersedes.disabled = locked;
          supersedes.addEventListener('change', () => replaceContribution({
            ...liveContribution,
            supersedes_contribution_key: supersedes.value || null,
          }));
          const removeContribution = element('button', {
            className: 'button-secondary',
            text: 'Remove scaling feature value',
            attributes: { type: 'button' },
          });
          removeContribution.disabled = locked;
          removeContribution.addEventListener('click', () => {
            const features = document.features.map((candidate, index) =>
              index === featureIndex
                ? {
                    ...candidate,
                    contributions: (candidate.contributions ?? []).filter(
                      (_current, position) => position !== contributionIndex,
                    ),
                  }
                : candidate);
            update({ ...document, features });
            render();
          });
          contributionCard.append(
            ...labelledControl('Supersedes', supersedes.id, supersedes),
            removeContribution,
          );
          contributions.append(contributionCard);
        }
        const addContribution = element('button', {
          className: 'button-secondary',
          text: 'Add scaling feature value',
          attributes: { type: 'button' },
        });
        addContribution.disabled = locked;
        addContribution.addEventListener('click', () => {
          const features = document.features.map((candidate, index) =>
            index === featureIndex
              ? {
                  ...candidate,
                  contributions: [
                    ...(candidate.contributions ?? []),
                    emptyContribution(itemUuid(), level),
                  ],
                }
              : candidate);
          update({ ...document, features });
          render();
        });
        const reorder = createOrderedCardControls({
          collectionKey: `subclass-level-${String(level)}-features`,
          itemKey: feature.draft_item_uuid,
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
        card.append(effects, addEffect, contributions, addContribution, reorder);
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
      const savedGeneration = edits.capture();
      save.disabled = true;
      preview.disabled = true;
      showDraftSaveProgress(status);
      try {
        const saved = await options.client.saveDraft({
          draft_uuid: stored.draft_uuid,
          expected_revision: stored.revision,
          document,
        });
        if (saved.content_kind !== 'subclass' || saved.document.kind !== 'subclass') {
          throw new TypeError('Saving the subclass draft returned a different content kind.');
        }
        clear(validationMount);
        stored = saved as StoredSubclassDraft;
        options.onSaved?.(stored);
        if (edits.acceptSave(savedGeneration)) {
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
              edits.replaceWithSaved();
              openLevels.clear();
              for (const feature of document.features) {
                if (feature.class_level !== null) openLevels.add(feature.class_level);
              }
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
        if (!disposed) {
          save.disabled = false;
          preview.disabled = false;
        }
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
      const previewGeneration = edits.capture();
      status.textContent = 'Validating publish preview…';
      void options.client.previewPublish({
        draft_uuid: stored.draft_uuid,
        expected_revision: stored.revision,
      }).then((publishPreview) => {
        if (disposed) return;
        if (!edits.isCurrent(previewGeneration)) {
          discardStalePreview();
          return;
        }
        clear(validationMount);
        options.mount.querySelector('.subclass-publish-preview')?.remove();
        const renderedPreview = previewElement(
          publishPreview,
          document,
          options.spellGrantReferences,
          options.parentClasses,
        );
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
        if (!edits.isCurrent(previewGeneration)) {
          discardStalePreview();
          return;
        }
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
