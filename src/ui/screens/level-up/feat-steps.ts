import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  type DerivedNumberId,
  type FeatApplicationPlan,
  type FeatEligibilityReason,
  type FeatEligibilityResult,
  type LevelUpFeatApplication,
  type LevelUpFeatCandidate,
  type LevelUpWarningPresentation,
} from '../../../builder/level-up-wizard';
import type { Ability } from '../../../domain/enums';
import type { JsonObject, JsonValue } from '../../../domain/models';
import type { PlannedCharacterEffect } from '../../../builder/level-up-wizard';
import { element, listen, type Cleanup } from '../../dom';

export type FeatStepDraft =
  | {
      readonly kind: 'selected';
      readonly application: LevelUpFeatApplication;
    }
  | { readonly kind: 'defer_epic_boon' }
  | null;

export interface FeatStepView {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

function titleCaseIdentifier(value: string): string {
  return value
    .split('_')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function abilityName(ability: Ability): string {
  switch (ability) {
    case 'strength':
      return 'Strength';
    case 'dexterity':
      return 'Dexterity';
    case 'constitution':
      return 'Constitution';
    case 'intelligence':
      return 'Intelligence';
    case 'wisdom':
      return 'Wisdom';
    case 'charisma':
      return 'Charisma';
  }
}

function abilityList(abilities: readonly Ability[]): string {
  return abilities.map(abilityName).join(', ');
}

function reasonText(reason: FeatEligibilityReason): string {
  switch (reason.kind) {
    case 'minimum_level':
      return `Minimum level ${String(reason.minimum)}; projected level is ${String(reason.actual)}.`;
    case 'ability_score_minimum':
      return `${abilityList(reason.abilities)} must include a score of ${String(reason.minimum)} or higher; returned scores: ${reason.actual.map((score) => score === null ? 'unknown' : String(score)).join(', ')}.`;
    case 'feature_missing':
      return `Required feature is missing: ${titleCaseIdentifier(reason.feature)}.`;
    case 'already_taken':
      return 'This nonrepeatable feat has already been taken.';
    case 'repeat_configuration_unavailable':
      return `No unused ${titleCaseIdentifier(reason.field)} configuration remains.`;
    case 'repeat_configuration_already_used':
      return `${titleCaseIdentifier(reason.field)} “${reason.value}” has already been used for this repeatable feat.`;
    case 'ability_score_unknown':
      return `${abilityList(reason.abilities)} cannot be verified against the minimum score of ${String(reason.minimum)}.`;
    case 'feature_unprovable':
      return `Required feature cannot be verified: ${titleCaseIdentifier(reason.feature)}.`;
    case 'repeat_configuration_unprovable':
      return `Prior ${titleCaseIdentifier(reason.field)} configurations cannot be verified.`;
  }
}

function eligibilityText(status: FeatEligibilityResult['status']): string {
  switch (status) {
    case 'qualified':
      return 'Qualified';
    case 'unmet':
      return 'Unmet';
    case 'unprovable':
      return 'Unprovable';
  }
}

function checkedAttributes(checked: boolean): Readonly<Record<string, string>> {
  return checked ? { checked: '' } : {};
}

function scalarConfigEntries(
  config: JsonObject,
): readonly (readonly [string, string])[] {
  return Object.entries(config).flatMap(([key, value]) =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? [[key, String(value)] as const]
      : [],
  );
}

function applicationLabel(application: LevelUpFeatApplication): string {
  const config = scalarConfigEntries(application.selection.config).map(
    ([key, value]) => `${titleCaseIdentifier(key)}: ${titleCaseIdentifier(value)}`,
  );
  const increases = application.selection.ability_increases.length === 0
    ? ['No ability increase']
    : application.selection.ability_increases.map(
        (increase) => `${abilityName(increase.ability)} +${String(increase.amount)}`,
      );
  return [...config, ...increases].join('; ');
}

function nullableNumber(value: number | null): string {
  return value === null ? 'unknown' : String(value);
}

function effectText(effect: PlannedCharacterEffect): string {
  switch (effect.effect_kind) {
    case 'damage_resistance':
      return `Damage resistance: ${effect.damage_type ?? 'unspecified'}.`;
    case 'hp_modifier':
      return `Hit points: ${nullableNumber(effect.hit_points_flat)} flat; ${nullableNumber(effect.hit_points_per_level)} per level.`;
    case 'speed':
      return `Speed bonus: ${String(effect.speed_bonus_feet)} feet.`;
    case 'ability_increase':
      return `${abilityName(effect.ability)} +${String(effect.amount)}, maximum ${String(effect.maximum)}.`;
    case 'ability_override':
      return `Set ${abilityName(effect.ability)} to ${String(effect.maximum)}.`;
    case 'armor_class_bonus':
      return `Armor Class bonus: +${String(effect.amount)}.`;
    case 'armor_class_formula':
      return `Armor Class: ${String(effect.base)} + ${abilityName(effect.ability_1)}${effect.ability_2 === null ? '' : ` + ${abilityName(effect.ability_2)}`}; shield ${effect.allows_shield ? 'allowed' : 'not allowed'}.`;
    case 'attack_ability_override':
      return `Use ${abilityName(effect.ability)} for ${titleCaseIdentifier(effect.weapon_scope)} weapon attacks.`;
    case 'weapon_attack_bonus':
      return `Weapon attack bonus: +${String(effect.amount)} for ${titleCaseIdentifier(effect.weapon_scope)} weapons.`;
    case 'weapon_damage_bonus':
      return `Weapon damage bonus: +${String(effect.amount)} for ${titleCaseIdentifier(effect.weapon_scope)} weapons.`;
  }
}

function structuredValue(value: JsonValue | undefined): string {
  if (value === undefined) return 'not supplied';
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => structuredValue(item)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${structuredValue(item)}`).join('; ')} }`;
  }
  return String(value);
}

function renderEffects(plan: FeatApplicationPlan): HTMLElement {
  return element('section', { className: 'level-up-feat-plan-section' }, [
    element('h4', { text: 'Applied effects' }),
    ...(plan.effects.length === 0
      ? [element('p', { text: 'No applied effects.' })]
      : [element(
          'ul',
          {},
          plan.effects.map((effect) =>
            element('li', {}, [
              element('strong', { text: effect.label }),
              element('p', { text: effectText(effect) }),
              ...(effect.notes === null
                ? []
                : [element('p', { text: effect.notes })]),
            ]),
          ),
        )]),
  ]);
}

function renderGrantRules(plan: FeatApplicationPlan): HTMLElement {
  return element('section', { className: 'level-up-feat-plan-section' }, [
    element('h4', { text: 'Grant-rule benefits' }),
    ...(plan.grant_rules.length === 0
      ? [element('p', { text: 'No grant-rule benefits.' })]
      : [element(
          'ol',
          {},
          plan.grant_rules.map((rule) =>
            element(
              'li',
              {},
              [element(
                'dl',
                { className: 'level-up-feat-rule' },
                Object.entries(rule).flatMap(([key, value]) => [
                  element('dt', { text: titleCaseIdentifier(key) }),
                  element('dd', { text: structuredValue(value as JsonValue) }),
                ]),
              )],
            ),
          ),
        )]),
  ]);
}

function renderTextBenefits(plan: FeatApplicationPlan): HTMLElement {
  return element('section', { className: 'level-up-feat-plan-section' }, [
    element('h4', { text: 'Sourced text benefits' }),
    ...(plan.text_benefits.length === 0
      ? [element('p', { text: 'No sourced text-only benefits.' })]
      : plan.text_benefits.map((benefit) =>
          element('article', { className: 'level-up-feat-source-text' }, [
            element('h5', { text: benefit.label }),
            element('p', { text: benefit.text }),
            element('p', {
              text: `Not represented as a structured number: ${titleCaseIdentifier(benefit.gap)}.`,
            }),
          ]),
        )),
  ]);
}

function derivedNumberName(number: DerivedNumberId): string {
  switch (number) {
    case 'initiative':
      return 'Initiative';
    case 'ranged_weapon_attack_bonus':
      return 'Ranged weapon attack bonus';
    case 'armor_class':
      return 'Armor Class';
  }
}

function renderUndeterminedNumbers(plan: FeatApplicationPlan): HTMLElement {
  return element('section', { className: 'level-up-feat-plan-section' }, [
    element('h4', { text: 'Undetermined numbers' }),
    ...(plan.undetermined_numbers.length === 0
      ? [element('p', { text: 'No affected numbers are undetermined.' })]
      : [element(
          'ul',
          {},
          plan.undetermined_numbers.map((number) =>
            element('li', {
              text: `${derivedNumberName(number)} (${number}) cannot be determined exactly.`,
            }),
          ),
        )]),
  ]);
}

function renderPlan(plan: FeatApplicationPlan): HTMLElement {
  return element('div', { className: 'level-up-feat-plan' }, [
    renderEffects(plan),
    renderGrantRules(plan),
    renderTextBenefits(plan),
    renderUndeterminedNumbers(plan),
  ]);
}

function selectedPlanForCandidate(
  candidate: LevelUpFeatCandidate,
  draft: FeatStepDraft,
): FeatApplicationPlan | null {
  if (
    draft?.kind === 'selected' &&
    draft.application.selection.feat_content_key === candidate.definition.content_key
  ) {
    return draft.application.plan;
  }
  return candidate.applications.find(
    (application) => application.plan.eligibility.status === 'qualified',
  )?.plan ?? candidate.applications[0]?.plan ?? null;
}

function eligibilityDescription(
  candidate: LevelUpFeatCandidate,
  descriptionId: string,
): HTMLElement {
  const eligibility = candidate.eligibility;
  const refusedApplications = candidate.applications.filter(
    (application) => application.plan.eligibility.status !== 'qualified',
  );
  return element('div', { attributes: { id: descriptionId } }, [
    element('p', {
      className: `level-up-feat-status level-up-feat-status-${eligibility.status}`,
      text: `Eligibility: ${eligibilityText(eligibility.status)}`,
    }),
    ...(eligibility.reasons.length === 0
      ? [element('p', { text: 'No unmet eligibility requirements.' })]
      : [element(
          'ul',
          {},
          eligibility.reasons.map((reason) =>
            element('li', { text: reasonText(reason) }),
          ),
        )]),
    ...(refusedApplications.length === 0
      ? []
      : [
          element('h4', { text: 'Unavailable returned configurations' }),
          element(
            'ul',
            {},
            refusedApplications.map((application) =>
              element('li', {}, [
                element('strong', {
                  text: `${applicationLabel(application)} — ${eligibilityText(application.plan.eligibility.status)}`,
                }),
                ...(application.plan.eligibility.reasons.length === 0
                  ? []
                  : [element(
                      'ul',
                      {},
                      application.plan.eligibility.reasons.map((reason) =>
                        element('li', { text: reasonText(reason) }),
                      ),
                    )]),
              ]),
            ),
          ),
        ]),
  ]);
}

function abilityPresentation(candidate: LevelUpFeatCandidate): HTMLElement {
  const definition = candidate.definition;
  if (definition.ability_points === 0) {
    return element('p', {
      className: 'level-up-feat-ability',
      text: 'Ability increase: This feat grants no ability increase.',
    });
  }
  const allowed = definition.ability_increase_abilities === null
    ? 'unavailable'
    : definition.ability_increase_abilities === 'any'
      ? 'any ability'
      : abilityList(definition.ability_increase_abilities);
  return element('p', {
    className: 'level-up-feat-ability',
    text: `Ability increase budget: ${String(definition.ability_points)} points. Allowed abilities: ${allowed}. Cap: ${definition.ability_increase_maximum === null ? 'unavailable' : String(definition.ability_increase_maximum)}.`,
  });
}

function createCandidateCard(options: {
  readonly candidate: LevelUpFeatCandidate;
  readonly candidateIndex: number;
  readonly step: 'feat' | 'epic_boon';
  readonly draft: FeatStepDraft;
  readonly onSelect: (application: LevelUpFeatApplication) => void;
}): FeatStepView {
  const cleanups: Cleanup[] = [];
  const { candidate } = options;
  const headingId = `level-up-${options.step}-candidate-${String(options.candidateIndex)}-heading`;
  const descriptionId = `level-up-${options.step}-candidate-${String(options.candidateIndex)}-eligibility`;
  const qualified = candidate.eligibility.status === 'qualified';
  const selectable = qualified
    ? candidate.applications.filter(
        (application) => application.plan.eligibility.status === 'qualified',
      )
    : [];
  const controls = selectable.map((application, applicationIndex) => {
    const radio = element('input', {
      attributes: {
        id: `level-up-${options.step}-candidate-${String(options.candidateIndex)}-application-${String(applicationIndex)}`,
        type: 'radio',
        name: `level-up-${options.step}-choice`,
        value: `${candidate.definition.content_key}:${String(applicationIndex)}`,
        'aria-label': `${candidate.definition.name}: ${applicationLabel(application)}`,
        [LEVEL_UP_ATTR.featOption]: String(candidate.definition.content_key),
        ...checkedAttributes(
          options.draft?.kind === 'selected' &&
            options.draft.application === application,
        ),
      },
    });
    cleanups.push(
      listen(radio, 'change', () => {
        if (radio.checked) options.onSelect(application);
      }),
    );
    return element('label', { className: 'level-up-feat-application' }, [
      radio,
      element('span', { text: applicationLabel(application) }),
    ]);
  });
  const plan = selectedPlanForCandidate(candidate, options.draft);
  const cardAttributes: Record<string, string> = {
    'data-level-up-feat-card': String(candidate.definition.content_key),
    'aria-labelledby': headingId,
    'aria-describedby': descriptionId,
  };
  if (!qualified) cardAttributes.tabindex = '0';

  return {
    element: element(
      'article',
      {
        className: `level-up-feat-card level-up-feat-card-${candidate.eligibility.status}`,
        attributes: cardAttributes,
      },
      [
        element('header', {}, [
          element('h3', {
            text: candidate.definition.name,
            attributes: { id: headingId },
          }),
          ...(candidate.is_class_default
            ? [element('strong', {
                className: 'level-up-feat-default',
                text: 'Class default',
              })]
            : []),
        ]),
        element('dl', { className: 'level-up-feat-metadata' }, [
          element('dt', { text: 'Category' }),
          element('dd', { text: titleCaseIdentifier(candidate.definition.grouping) }),
          element('dt', { text: 'Minimum level' }),
          element('dd', {
            text: candidate.definition.min_level === null
              ? 'None'
              : String(candidate.definition.min_level),
          }),
          element('dt', { text: 'Repeatability' }),
          element('dd', {
            text: candidate.definition.repeatable ? 'Repeatable' : 'Not repeatable',
          }),
        ]),
        eligibilityDescription(candidate, descriptionId),
        abilityPresentation(candidate),
        ...(qualified
          ? [element('fieldset', { className: 'level-up-feat-applications' }, [
              element('legend', { text: 'Returned configurations' }),
              ...(controls.length === 0
                ? [element('p', {
                    text: 'No qualified application configuration was returned.',
                  })]
                : controls),
            ])]
          : []),
        ...(plan === null
          ? [element('p', { text: 'No application plan was returned.' })]
          : [renderPlan(plan)]),
      ],
    ),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

export function renderDeferredEpicWarning(
  warning: LevelUpWarningPresentation,
): HTMLElement {
  return element(
    'aside',
    {
      className: 'level-up-warnings level-up-epic-deferred-warning',
      attributes: {
        [LEVEL_UP_ATTR.warning]: warning.key,
        'aria-label': 'Outstanding Epic Boon choice',
      },
    },
    [
      element('strong', { text: warning.title }),
      element('p', {
        text: 'The Epic Boon remains unresolved and this named warning stays visible until it is resolved.',
      }),
    ],
  );
}

export function createFeatStep(options: {
  readonly step: 'feat' | 'epic_boon';
  readonly candidates: readonly LevelUpFeatCandidate[];
  readonly draft: FeatStepDraft;
  readonly allowDefer: boolean;
  readonly deferredWarning: LevelUpWarningPresentation;
  readonly onSelect: (draft: Exclude<FeatStepDraft, null>) => void;
}): FeatStepView {
  const cleanups: Cleanup[] = [];
  const displayedCandidates = options.step === 'epic_boon'
    ? options.candidates.filter(
        (candidate) => candidate.eligibility.status === 'qualified',
      )
    : options.candidates;
  const cards = displayedCandidates.map((candidate, candidateIndex) => {
    const card = createCandidateCard({
      candidate,
      candidateIndex,
      step: options.step,
      draft: options.draft,
      onSelect: (application) => options.onSelect({ kind: 'selected', application }),
    });
    cleanups.push(card.cleanup);
    return card.element;
  });
  const defer = options.allowDefer
    ? (() => {
        const radio = element('input', {
          attributes: {
            id: 'level-up-epic-boon-defer',
            type: 'radio',
            name: 'level-up-epic_boon-choice',
            value: 'defer_epic_boon',
            'aria-label': 'Decide later',
            ...checkedAttributes(options.draft?.kind === 'defer_epic_boon'),
          },
        });
        cleanups.push(
          listen(radio, 'change', () => {
            if (radio.checked) options.onSelect({ kind: 'defer_epic_boon' });
          }),
        );
        return element('label', { className: 'level-up-feat-defer' }, [
          radio,
          element('span', { text: 'Decide later' }),
        ]);
      })()
    : null;

  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: {
          [LEVEL_UP_PANEL_ATTRIBUTE]: options.step === 'feat'
            ? LEVEL_UP_PANEL.feat
            : LEVEL_UP_PANEL.epicBoon,
        },
      },
      [
        element('h2', {
          text: options.step === 'feat' ? 'Choose a feat' : 'Choose an Epic Boon',
        }),
        element('p', {
          text: options.step === 'feat'
            ? 'Choose one qualified feat configuration for this class level.'
            : 'Choose one qualified Epic Boon configuration.',
        }),
        element('div', { className: 'level-up-feat-grid' }, cards),
        ...(defer === null ? [] : [
          element('fieldset', { className: 'level-up-feat-defer-fieldset' }, [
            element('legend', { text: 'Epic Boon decision' }),
            defer,
          ]),
        ]),
        ...(options.draft?.kind === 'defer_epic_boon'
          ? [renderDeferredEpicWarning(options.deferredWarning)]
          : []),
      ],
    ),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}
