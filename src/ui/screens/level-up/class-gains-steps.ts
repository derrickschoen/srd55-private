import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  type LevelUpGuideableClassOption,
  type LevelUpDisabledClassOption,
  type LevelUpPendingEpicResolution,
  type LevelUpPermanentWarning,
  type LevelUpStateResult,
  type LevelUpTargetFeature,
} from '../../../builder/level-up-wizard';
import type {
  ClassDefinitionId,
  SubclassDefinitionId,
} from '../../../domain/ids';
import { element, listen, type Cleanup } from '../../dom';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import { catalogControlDescription } from '../../catalog-control-disclosure';

export type PendingEpicPath = 'resolve_now' | 'next_level';
export type SubclassDraft =
  | { readonly kind: 'selected'; readonly subclass_definition_id: SubclassDefinitionId }
  | { readonly kind: 'decide_later' };

export interface LevelUpStepView {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

export function plannerClassesPath(characterId: number): string {
  return `/characters/${String(characterId)}?panel=classes`;
}

export function createPendingEpicPathChoice(options: {
  readonly pending: LevelUpPendingEpicResolution;
  readonly selectedPath: PendingEpicPath | null;
  readonly allowNextLevel: boolean;
  readonly onSelect: (path: PendingEpicPath) => void;
}): LevelUpStepView {
  const cleanups: Cleanup[] = [];
  const resolve = element('input', {
    attributes: {
      id: 'level-up-resolve-epic-now',
      type: 'radio',
      name: 'pending-epic-path',
      value: 'resolve_now',
      ...checkedAttributes(options.selectedPath === 'resolve_now'),
    },
  });
  cleanups.push(
    listen(resolve, 'change', () => {
      if (resolve.checked) options.onSelect('resolve_now');
    }),
  );

  const nextLevel = options.allowNextLevel
    ? (() => {
        const proceed = element('input', {
          attributes: {
            id: 'level-up-proceed-next-level',
            type: 'radio',
            name: 'pending-epic-path',
            value: 'next_level',
            ...checkedAttributes(options.selectedPath === 'next_level'),
          },
        });
        cleanups.push(
          listen(proceed, 'change', () => {
            if (proceed.checked) options.onSelect('next_level');
          }),
        );
        return element('label', {}, [
          proceed,
          element('span', { text: 'Proceed to the next level' }),
        ]);
      })()
    : null;

  return {
    element: element('fieldset', { className: 'level-up-epic-paths' }, [
      element('legend', { text: options.pending.warning.title }),
      element('p', {
        text: options.allowNextLevel
          ? 'Choose what this visit should do. The deferred warning remains until the boon is resolved.'
          : 'Further level progression is unavailable, but the deferred Epic Boon can still be resolved.',
      }),
      element('label', {}, [
        resolve,
        element('span', { text: 'Resolve the Epic Boon now' }),
      ]),
      ...(nextLevel === null ? [] : [nextLevel]),
    ]),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

function checkedAttributes(checked: boolean): Readonly<Record<string, string>> {
  return checked ? { checked: '' } : {};
}

export function renderLevelUpWarnings(
  warnings: readonly LevelUpPermanentWarning[],
): HTMLElement | null {
  if (warnings.length === 0) {
    return null;
  }
  return element(
    'aside',
    {
      className: 'level-up-warnings',
      attributes: { 'aria-label': 'Character warnings' },
    },
    [
      element('h3', { text: 'Character warnings' }),
      element(
        'ul',
        {},
        warnings.map((warning) =>
          element('li', { attributes: { [LEVEL_UP_ATTR.warning]: warning.kind } }, [
            element('strong', { text: warning.title }),
            element('p', { text: warning.detail }),
            element('p', { text: warning.remedy }),
          ]),
        ),
      ),
    ],
  );
}

function prerequisiteWarning(
  option: LevelUpGuideableClassOption | LevelUpDisabledClassOption,
): HTMLElement | null {
  const warning = option.multiclass_prerequisite_warning;
  if (warning === null) return null;
  return element(
    'aside',
    {
      className: 'level-up-class-prerequisite-warning',
      attributes: {
        role: 'alert',
        [LEVEL_UP_ATTR.warning]: warning.kind,
      },
    },
    [
      element('strong', {
        text: `${warning.title} — ${catalogLayerLabel(
          warning.class_catalog_layer,
        )}`,
      }),
      element('p', { text: warning.detail }),
      element('p', { text: warning.remedy }),
    ],
  );
}

export function renderDisabledClassOption(
  option: LevelUpDisabledClassOption,
  index: number,
  idPrefix: string,
): HTMLElement {
  const headingId = `${idPrefix}-${String(index)}-heading`;
  const explanationId = `${idPrefix}-${String(index)}-explanation`;
  const warning = prerequisiteWarning(option);
  return element(
    'article',
    {
      className: 'level-up-class-card level-up-class-disabled',
      attributes: {
        tabindex: '0',
        [LEVEL_UP_ATTR.classOption]: String(option.class_definition_id),
        'aria-labelledby': headingId,
        'aria-describedby': explanationId,
      },
    },
    [
      element('h3', {
        text:
          `${option.name} ${String(option.current_level)} — ` +
          catalogLayerLabel(option.catalog_layer),
        attributes: { id: headingId },
      }),
      element('p', {
        text: option.explanation,
        attributes: { id: explanationId },
      }),
      ...(warning === null ? [] : [warning]),
    ],
  );
}

export function createClassStep(options: {
  readonly state: Extract<LevelUpStateResult, { readonly kind: 'ready' }>;
  readonly selectedClassId: number | null;
  readonly pendingEpicPath: PendingEpicPath | null;
  readonly onSelectClass: (classDefinitionId: ClassDefinitionId) => void;
  readonly onSelectPendingEpicPath: (path: PendingEpicPath) => void;
}): LevelUpStepView {
  const cleanups: Cleanup[] = [];
  const classCards = options.state.class_options.map((classOption, index) => {
    const headingId = `level-up-class-${String(index)}-heading`;
    const detailId = `level-up-class-${String(index)}-detail`;
    if (classOption.guideability === 'disabled') {
      return renderDisabledClassOption(
        classOption,
        index,
        'level-up-class-disabled',
      );
    }

    const inputId = `level-up-class-${String(index)}`;
    const disclosureId = `level-up-class-${String(index)}-catalog-layer`;
    const radio = element('input', {
      attributes: {
        id: inputId,
        type: 'radio',
        name: 'level-up-class',
        value: String(classOption.class_definition_id),
        'aria-label': `${classOption.name} ${String(classOption.current_level)} → ${String(classOption.target_level)}, ${classOption.rules_edition} rules, d${String(classOption.hit_die)} hit die`,
        [LEVEL_UP_ATTR.classOption]: String(classOption.class_definition_id),
        ...checkedAttributes(
          classOption.class_definition_id === options.selectedClassId,
        ),
      },
    });
    cleanups.push(
      listen(radio, 'change', () => {
        if (radio.checked) {
          options.onSelectClass(classOption.class_definition_id);
        }
      }),
    );
    const disclosure = catalogControlDescription(
      radio,
      disclosureId,
      classOption.catalog_layer,
    );
    const warning = prerequisiteWarning(classOption);
    return element('label', { className: 'level-up-class-card' }, [
      radio,
      element('span', {
        text:
          `${classOption.name} ${String(classOption.current_level)} → ` +
          String(classOption.target_level),
        attributes: { id: headingId },
      }),
      element('span', {
        text: `${classOption.rules_edition} rules · d${String(classOption.hit_die)} hit die`,
        attributes: { id: detailId },
      }),
      disclosure,
      ...(warning === null ? [] : [warning]),
    ]);
  });

  const pending = options.state.pending_epic_resolution;
  const epicChoice = pending === null
    ? null
    : createPendingEpicPathChoice({
        pending,
        selectedPath: options.pendingEpicPath,
        allowNextLevel: true,
        onSelect: options.onSelectPendingEpicPath,
      });
  if (epicChoice !== null) {
    cleanups.push(epicChoice.cleanup);
  }
  const warnings = renderLevelUpWarnings(
    options.state.character.warnings.filter(
      (warning) =>
        warning.kind !== 'multiclass_primary_ability_unmet' &&
        warning.kind !== 'multiclass_primary_ability_unprovable',
    ),
  );

  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.class },
      },
      [
        element('h2', { text: 'Choose a held class' }),
        element('p', {
          text: 'Guided level up advances one class you already hold by exactly one level.',
        }),
        element('fieldset', { className: 'level-up-class-options' }, [
          element('legend', { text: 'Class to advance' }),
          ...classCards,
        ]),
        ...(epicChoice === null ? [] : [epicChoice.element]),
        ...(warnings === null ? [] : [warnings]),
        element('p', { className: 'level-up-advanced-link' }, [
          element('a', {
            text: 'Take a level in a new class',
            attributes: {
              href: plannerClassesPath(
                options.state.character.character_id,
              ),
              'data-router-link': '',
            },
          }),
        ]),
      ],
    ),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

function signed(value: number): string {
  return value >= 0 ? `+${String(value)}` : String(value);
}

function targetFeatureItem(feature: LevelUpTargetFeature): HTMLLIElement {
  switch (feature.kind) {
    case 'class_feature':
      return element('li', {
        text: `${feature.name} — ${catalogLayerLabel(feature.catalog_layer)}`,
      });
    case 'subclass_feature':
      return element('li', {}, [
        element('strong', {
          text: `${feature.name} — ${catalogLayerLabel(feature.catalog_layer)}`,
        }),
        element('p', {
          text: feature.rules_text.kind === 'stored'
            ? feature.rules_text.text
            : 'Feature identity recorded; rules text not stored.',
        }),
      ]);
    case 'subclass_feature_unknown':
      switch (feature.reason) {
        case 'no_stored_feature':
          return element('li', {
            text:
              `Subclass feature unknown — ${feature.subclass_name} — ` +
              `${catalogLayerLabel(feature.subclass_catalog_layer)}. ` +
              'No stored feature row exists at this class level.',
          });
        case 'subclass_not_selected':
          return element('li', {
            text: 'Subclass feature unknown until a subclass is selected.',
          });
      }
  }
  const unhandled: never = feature;
  return unhandled;
}

export function renderGainsStep(
  selectedClass: LevelUpGuideableClassOption,
): HTMLElement {
  const gains = selectedClass.gains;
  const hp = gains.hit_points;
  const hitPoints = hp.kind === 'unknown'
    ? element('section', { className: 'level-up-gain level-up-hp-unknown' }, [
        element('h3', { text: 'Hit points' }),
        element('strong', { text: 'HP change unknown' }),
        element('p', {
          text: hp.reason === 'undetermined_level_scaled_effect'
            ? 'A level-scaled effect is undetermined, so an exact projection is not available.'
            : 'An exact fixed-HP projection is not available.',
        }),
        ...(hp.missing_hit_dice.length === 0
          ? []
          : [element('p', {
              text:
                'Missing recorded hit dice: ' +
                hp.missing_hit_dice.map((entry) =>
                  `${entry.class_name} — ` +
                  catalogLayerLabel(entry.class_catalog_layer)
                ).join(', ') + '.',
            })]),
      ])
    : element('section', { className: 'level-up-gain' }, [
        element('h3', { text: 'Fixed hit points' }),
        element('dl', { className: 'level-up-facts' }, [
          element('dt', { text: 'Hit die' }),
          element('dd', { text: `d${String(hp.hit_die)}` }),
          element('dt', { text: 'Fixed class base' }),
          element('dd', { text: String(hp.fixed_class_base) }),
          element('dt', { text: 'Constitution modifier' }),
          element('dd', { text: signed(hp.constitution_modifier) }),
          element('dt', { text: 'Class HP change (minimum 1)' }),
          element('dd', { text: signed(hp.class_hit_point_change) }),
          ...hp.level_scaled_effects.flatMap((effect) => [
            element('dt', { text: effect.label }),
            element('dd', {
              text: `${String(effect.current_contribution)} → ${String(effect.projected_contribution)} (${signed(effect.change)})`,
            }),
          ]),
          element('dt', { text: 'Current maximum HP' }),
          element('dd', { text: String(hp.current_maximum) }),
          element('dt', { text: 'Projected maximum HP' }),
          element('dd', {
            text: hp.projected_maximum.kind === 'known'
              ? String(hp.projected_maximum.value)
              : 'Pending subclass or feat choice',
          }),
        ]),
      ]);

  const proficiency = gains.proficiency_bonus_change === null
    ? null
    : element('p', {
        text: `Proficiency bonus: ${signed(gains.proficiency_bonus_change.current)} → ${signed(gains.proficiency_bonus_change.projected)}`,
      });
  const features = gains.target_features.kind === 'unavailable'
    ? element('p', { text: 'Target-level feature names are unavailable.' })
    : gains.target_features.features.length === 0
      ? element('p', { text: 'No target-level features are listed.' })
      : element(
          'ul',
          {},
          gains.target_features.features.map(targetFeatureItem),
        );

  return element(
    'section',
    {
      className: 'level-up-panel',
      attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.gains },
    },
    [
      element('h2', { text: 'Review level gains' }),
      element('p', {
        text: `${selectedClass.name} ${String(gains.current_class_level)} → ${String(gains.target_class_level)}; total level ${String(gains.current_total_level)} → ${String(gains.target_total_level)}.`,
      }),
      hitPoints,
      ...(proficiency === null ? [] : [proficiency]),
      element('section', { className: 'level-up-gain' }, [
        element('h3', { text: 'Target-level features' }),
        features,
      ]),
    ],
  );
}

export function createSubclassStep(options: {
  readonly selectedClass: LevelUpGuideableClassOption;
  readonly draft: SubclassDraft;
  readonly warnings: readonly LevelUpPermanentWarning[];
  readonly onSelect: (draft: SubclassDraft) => void;
}): LevelUpStepView {
  const cleanups: Cleanup[] = [];
  const choice = options.selectedClass.subclass_choice;
  if (choice === null) {
    throw new Error('The subclass step requires a returned subclass choice.');
  }
  const choices = choice.options.map((subclass, index) => {
    const accessibleName = `${subclass.name} — ${selectedClassName(options.selectedClass)}, ${subclass.rules_edition} rules`;
    const disclosureId = `level-up-subclass-${String(index)}-catalog-layer`;
    const radio = element('input', {
      attributes: {
        id: `level-up-subclass-${String(index)}`,
        type: 'radio',
        name: 'level-up-subclass',
        value: String(subclass.subclass_definition_id),
        'aria-label': accessibleName,
        ...checkedAttributes(
          options.draft.kind === 'selected' &&
          options.draft.subclass_definition_id === subclass.subclass_definition_id,
        ),
      },
    });
    cleanups.push(
      listen(radio, 'change', () => {
        if (radio.checked) {
          options.onSelect({
            kind: 'selected',
            subclass_definition_id: subclass.subclass_definition_id,
          });
        }
      }),
    );
    const disclosure = catalogControlDescription(
      radio,
      disclosureId,
      subclass.catalog_layer,
    );
    return element('label', { className: 'level-up-subclass-option' }, [
      radio,
      element('span', {
        text: accessibleName,
      }),
      disclosure,
    ]);
  });
  const later = element('input', {
    attributes: {
      id: 'level-up-subclass-later',
      type: 'radio',
      name: 'level-up-subclass',
      value: 'decide_later',
      'aria-label': 'Decide later',
      ...checkedAttributes(options.draft.kind === 'decide_later'),
    },
  });
  cleanups.push(
    listen(later, 'change', () => {
      if (later.checked) options.onSelect({ kind: 'decide_later' });
    }),
  );
  const subclassWarnings = renderLevelUpWarnings(
    options.warnings.filter((warning) => warning.kind === 'subclass_unselected'),
  );

  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.subclass },
      },
      [
        element('h2', { text: 'Choose a subclass' }),
        element('fieldset', { className: 'level-up-subclass-options' }, [
          element('legend', { text: 'Subclass choice' }),
          ...(choice.options.length === 0
            ? [element('p', {
                text: 'No subclass options are available. You can continue and decide later.',
              })]
            : choices),
          element('label', { className: 'level-up-subclass-option' }, [
            later,
            element('span', { text: 'Decide later' }),
          ]),
        ]),
        element('p', {
          text: 'Deciding later leaves the subclass choice unfinished and keeps its named warning visible.',
        }),
        ...(subclassWarnings === null ? [] : [subclassWarnings]),
      ],
    ),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

function selectedClassName(selectedClass: LevelUpGuideableClassOption): string {
  return selectedClass.name;
}
