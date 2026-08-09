import {
  guidedBuildPath,
  guidedSpeciesChoicePath,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedChooseSpeciesLineageResult,
  type GuidedConfiguredChoiceOptionState,
  type GuidedConfiguredChoiceState,
  type GuidedOriginOption,
  type GuidedSpeciesChoiceStateResult,
} from '../../../builder/contracts';
import type { GuidedApplyOriginResult } from '../../../builder/guided-creation';
import type { Ability } from '../../../domain/enums';
import { BUNDLED_ORIGIN_RULES_EDITION } from '../../../rules/origin-rules-edition';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import {
  createSpellPicker,
  spellPickerControlId,
  type SpellPicker,
} from '../planner/spell-picker';
import { characterListLink, guidedShell } from './guided-builder';
import type { GuidedSpellTransition } from './spells-step';

export const SPECIES_STEP_PANEL = 'species-step';

function speciesKey(slug: string): string {
  return `${BUNDLED_ORIGIN_RULES_EDITION}:species:${slug}`;
}

/** Choices not represented by configured-choice data remain disclosed here. */
export const SPECIES_UNMADE_CHOICES: ReadonlyMap<string, readonly string[]> =
  new Map([
    [
      speciesKey('dragonborn'),
      [
        'a Draconic Ancestry — the kind of dragon, which sets the Breath Weapon and Damage Resistance damage type',
      ],
    ],
    [speciesKey('goliath'), ['a Giant Ancestry benefit (one of six)']],
    [
      speciesKey('human'),
      [
        'a size (Small or Medium — the copy records Medium)',
        'a Versatile Origin feat',
      ],
    ],
    [
      speciesKey('tiefling'),
      ['a size (Small or Medium — the copy records Medium)'],
    ],
  ]);

export function applyOriginRefusalMessage(error: unknown): string | null {
  if (!(error instanceof RpcError) || error.code !== 'handler_error') {
    return null;
  }
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  return (data as Record<string, unknown>)['reason'] === 'unknown_origin'
    ? 'That species is not available in this database, so nothing was applied. Reload the page to refresh the species list.'
    : null;
}

function abilityLabel(ability: Ability): string {
  return `${ability.charAt(0).toUpperCase()}${ability.slice(1)}`;
}

function optionDisclosure(
  choice: GuidedConfiguredChoiceState,
  option: GuidedConfiguredChoiceOptionState,
): HTMLElement {
  const facts: HTMLElement[] = [];
  if (choice.unknown_sheet_fields.includes('walking_speed_feet')) {
    const speed = option.effects.find((effect) => effect.kind === 'speed');
    facts.push(element('li', {
      text: speed?.speed_bonus_feet === null || speed === undefined
        ? 'Speed: no lineage adjustment.'
        : `Speed: +${String(speed.speed_bonus_feet)} feet — ${speed.label}.`,
    }));
  }
  if (option.darkvision_feet !== null) {
    facts.push(element('li', {
      text: `Darkvision: ${String(option.darkvision_feet)} feet.`,
    }));
  }
  for (const effect of option.effects) {
    if (effect.kind === 'damage_resistance' && effect.damage_type !== null) {
      facts.push(element('li', {
        text: `Damage resistance: ${effect.damage_type} — ${effect.label}.`,
      }));
    }
  }
  for (const grant of option.grants) {
    const level = grant.active_from_character_level ?? 1;
    facts.push(element('li', {
      text: grant.spell_name === null
        ? `${grant.kind} at character level ${String(level)}.`
        : `${grant.spell_name} at character level ${String(level)}.`,
    }));
  }
  if (option.replaceable_spell_choice !== null) {
    const replaceable = option.replaceable_spell_choice;
    facts.push(element('li', {
      text:
        `${replaceable.label}: choose a ${replaceable.spell_list} ` +
        `${replaceable.spell_level === 0 ? 'cantrip' : `level ${String(replaceable.spell_level)} spell`}; ` +
        `initially ${replaceable.initial_spell_name}.`,
    }));
  }
  return element('div', { className: 'guided-lineage-option-disclosure' }, [
    element('h4', { text: option.label }),
    element('ul', {}, facts),
  ]);
}

function configuredChoiceDisclosure(
  choice: GuidedConfiguredChoiceState,
): HTMLElement {
  return element('section', { className: 'guided-species-configured-choice' }, [
    element('h4', { text: `${choice.label} choice` }),
    element('p', {
      text:
        `Choose ${choice.label} and ` +
        `${choice.ability_choice === null ? 'record its option' : 'its spellcasting ability'}; ` +
        'the option data grants:',
    }),
    ...choice.options.map((option) => optionDisclosure(choice, option)),
  ]);
}

function unmadeChoicesBlock(option: GuidedOriginOption): HTMLElement {
  const choices = SPECIES_UNMADE_CHOICES.get(option.content_key) ?? [];
  if (choices.length === 0 && option.configured_choices.length === 0) {
    return element('p', {
      className: 'guided-species-choices-none',
      text: 'The SRD offers no further choice for this species.',
    });
  }
  if (choices.length === 0) {
    return element('div', { className: 'guided-species-configured-choices' },
      option.configured_choices.map(configuredChoiceDisclosure));
  }
  return element('div', { className: 'guided-species-choices' }, [
    element('p', {
      text:
        'Other required choices this step does not model yet — applying this species records none of them:',
    }),
    element('ul', {}, choices.map((choice) => element('li', { text: choice }))),
    ...option.configured_choices.map(configuredChoiceDisclosure),
  ]);
}

export interface SpeciesStepDeps {
  readonly characterId: number;
  readonly options: readonly GuidedOriginOption[];
  readonly choiceState: GuidedSpeciesChoiceStateResult | null;
  readonly applyOrigin: (contentKey: string) => Promise<GuidedApplyOriginResult>;
  readonly chooseLineage: (
    chosenOption: string,
    spellcastingAbility: Ability,
    replaceableSpellVersionKey: string | undefined,
    operationUuid: string,
    expectedRevision: number,
  ) => Promise<GuidedChooseSpeciesLineageResult>;
  readonly navigate: (path: string, transition?: GuidedSpellTransition) => void;
}

export interface SpeciesStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

function speciesCards(
  deps: SpeciesStepDeps,
  cleanups: Cleanup[],
): HTMLElement {
  const cards: HTMLButtonElement[] = [];
  let inFlight = false;
  const errorMount = element('div', { className: 'guided-error-mount' });
  const setError = (message: string | null): void => {
    clear(errorMount);
    if (message !== null) {
      errorMount.append(element('p', {
        className: 'guided-error',
        text: message,
        attributes: { role: 'alert' },
      }));
    }
  };
  const list = element('ul', {
    className: 'guided-species-options',
    attributes: { 'aria-label': 'Catalog species' },
  }, deps.options.map((option) => {
    const disclosureId = `guided-species-${option.content_key.replace(/[^a-z0-9]+/giu, '-')}-catalog-layer`;
    const apply = element('button', {
      className: 'guided-species-apply',
      text: `Choose ${option.name}`,
      attributes: {
        type: 'button',
        'data-species-option': option.content_key,
        'aria-describedby': disclosureId,
      },
    });
    cards.push(apply);
    cleanups.push(listen(apply, 'click', () => {
      if (inFlight) return;
      inFlight = true;
      setError(null);
      cards.forEach((card) => { card.disabled = true; });
      void deps.applyOrigin(option.content_key)
        .then(() => deps.navigate(guidedBuildPath(deps.characterId)))
        .catch((error: unknown) => {
          setError(applyOriginRefusalMessage(error) ??
            (error instanceof Error ? error.message : String(error)));
          inFlight = false;
          cards.forEach((card) => { card.disabled = false; });
        });
    }));
    return element('li', { className: 'guided-species-card' }, [
      element('h3', { className: 'guided-species-name', text: option.name }),
      element('p', {
        className: 'catalog-layer-disclosure',
        text: catalogLayerLabel(option.catalog_layer),
        attributes: { id: disclosureId },
      }),
      unmadeChoicesBlock(option),
      apply,
    ]);
  }));
  return element('section', {
    className: 'guided-panel',
    attributes: { [GUIDED_PANEL_ATTRIBUTE]: SPECIES_STEP_PANEL },
  }, [
    element('h2', { text: 'Choose a species' }),
    element('p', {
      text:
        'Applying a species copies its printed traits, speed and effects onto the character. Any configured lineage remains saveable and can be completed by returning to this Species step.',
    }),
    ...(deps.options.length === 0
      ? [element('p', {
          className: 'guided-empty-catalog',
          text: 'No catalog species are available in this database, so this step cannot offer one.',
        })]
      : [list]),
    errorMount,
    characterListLink(),
  ]);
}

function choiceEditor(
  deps: SpeciesStepDeps,
  choice: GuidedConfiguredChoiceState,
  revision: number,
  initiallyEditing: boolean,
  cleanups: Cleanup[],
): HTMLElement {
  const container = element('section', { className: 'guided-lineage-editor' });
  const status = element('p', {
    className: 'guided-status guided-species-status',
    attributes: { role: 'status', 'aria-live': 'polite', 'data-guided-status': '' },
  });
  const focusKey = `guided-species-change-${choice.rule_key}`;
  const selectedChoice = () => choice.options.find(
    (option) => option.value === choice.selected_option,
  ) ?? null;
  let picker: SpellPicker | null = null;

  const announce = (message: string): void => {
    clear(status);
    status.textContent = message;
  };

  const renderForm = (focus: boolean): void => {
    picker?.destroy();
    picker = null;
    let selectedOption = selectedChoice();
    let selectedAbility = choice.ability_choice?.selected ?? null;
    let replaceableKey = selectedOption?.replaceable_spell_choice
      ?.selected_spell_version_key ?? undefined;
    let inFlight = false;
    const errorMount = element('div', { className: 'guided-error-mount' });
    const form = element('form', { className: 'guided-lineage-form' });
    const optionFieldset = element('fieldset', { className: 'guided-lineage-options' }, [
      element('legend', { text: choice.label }),
    ]);
    const replaceableMount = element('div', { className: 'guided-lineage-spell' });
    const renderReplaceable = (): void => {
      picker?.destroy();
      picker = null;
      clear(replaceableMount);
      const replaceable = selectedOption?.replaceable_spell_choice ?? null;
      if (replaceable === null) {
        replaceableKey = undefined;
        return;
      }
      const addressKey = `species-${choice.rule_key}`;
      const visibleLabel = element('label', {
        className: 'guided-spell-choice-label',
        text: replaceable.label,
        attributes: { for: spellPickerControlId(addressKey) },
      });
      picker = createSpellPicker({
        addressKey,
        label: replaceable.label,
        contextDescriptionId: null,
        value: replaceable.selected_spell?.spell.name ??
          replaceable.initial_spell_name,
        valueCatalogLayer: replaceable.selected_spell?.spell.catalog_layer ?? null,
        freeTextValue: false,
        invalid: false,
        disabled: false,
        search: async (query) => replaceable.eligible_spells
          .map((candidate) => candidate.spell)
          .filter((spell) => spell.name.toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())),
        onSelect: (spell) => {
          replaceableKey = replaceable.eligible_spells.find(
            (candidate) => candidate.spell.id === spell.id,
          )?.content_key;
        },
      });
      replaceableMount.append(
        visibleLabel,
        element('p', {
          className: 'guided-lineage-spell-help',
          text:
            `Choose one level ${String(replaceable.spell_level)} spell from the ${replaceable.spell_list} list. The sourced initial choice is ${replaceable.initial_spell_name}.`,
        }),
        picker.element,
      );
    };
    for (const option of choice.options) {
      const id = `guided-lineage-${choice.rule_key}-${option.value.replace(/[^a-z0-9]+/giu, '-')}`;
      const radio = element('input', {
        attributes: {
          id,
          type: 'radio',
          name: `configured-choice-${choice.rule_key}`,
          value: option.value,
        },
      });
      radio.checked = selectedOption?.value === option.value;
      cleanups.push(listen(radio, 'change', () => {
        if (!radio.checked) return;
        selectedOption = option;
        replaceableKey = option.replaceable_spell_choice
          ?.selected_spell_version_key ?? undefined;
        renderReplaceable();
      }));
      optionFieldset.append(element('div', { className: 'guided-lineage-option' }, [
        element('label', { text: option.label, attributes: { for: id } }),
        radio,
        optionDisclosure(choice, option),
      ]));
    }
    const abilitySelect = element('select', {
      className: 'guided-lineage-ability',
      attributes: { id: `guided-lineage-ability-${choice.rule_key}` },
    });
    abilitySelect.append(element('option', { text: 'Choose an ability', attributes: { value: '' } }));
    for (const ability of choice.ability_choice?.options ?? []) {
      const option = element('option', {
        text: abilityLabel(ability),
        attributes: { value: ability },
      });
      option.selected = selectedAbility === ability;
      abilitySelect.append(option);
    }
    cleanups.push(listen(abilitySelect, 'change', () => {
      selectedAbility = (choice.ability_choice?.options ?? []).find(
        (ability) => ability === abilitySelect.value,
      ) ?? null;
    }));
    const submit = element('button', {
      className: 'guided-species-apply',
      text: `Save ${choice.label}`,
      attributes: { type: 'submit' },
    });
    cleanups.push(listen(form, 'submit', (event) => {
      event.preventDefault();
      if (inFlight) return;
      clear(errorMount);
      if (selectedOption === null || selectedAbility === null) {
        errorMount.append(element('p', {
          className: 'guided-error',
          text: `Choose ${choice.label} and its spellcasting ability.`,
          attributes: { role: 'alert' },
        }));
        return;
      }
      inFlight = true;
      submit.disabled = true;
      void deps.chooseLineage(
        selectedOption.value,
        selectedAbility,
        replaceableKey,
        crypto.randomUUID(),
        revision,
      ).then(() => {
        const announcement = `${selectedOption?.label ?? choice.label} selected for ${choice.label}.`;
        deps.navigate(guidedSpeciesChoicePath(deps.characterId), {
          focusKey,
          announcement,
        });
      }).catch((error: unknown) => {
        errorMount.append(element('p', {
          className: 'guided-error',
          text: error instanceof Error ? error.message : String(error),
          attributes: { role: 'alert' },
        }));
        inFlight = false;
        submit.disabled = false;
      });
    }));
    renderReplaceable();
    form.append(
      optionFieldset,
      ...(choice.ability_choice === null
        ? []
        : [
            element('label', {
              className: 'guided-spell-choice-label',
              text: `${choice.label} spellcasting ability`,
              attributes: { for: `guided-lineage-ability-${choice.rule_key}` },
            }),
            abilitySelect,
          ]),
      replaceableMount,
      errorMount,
      submit,
    );
    container.replaceChildren(form, status);
    if (focus) {
      optionFieldset.querySelector<HTMLInputElement>('input')?.focus();
    }
  };

  const renderSummary = (): void => {
    const option = selectedChoice();
    const replaceable = option?.replaceable_spell_choice;
    const change = element('button', {
      className: 'guided-species-change',
      text: `Change ${choice.label}`,
      attributes: { type: 'button', 'data-focus-key': focusKey },
    });
    cleanups.push(listen(change, 'click', () => {
      announce(`Choose a replacement for ${option?.label ?? choice.label}.`);
      renderForm(true);
    }));
    container.replaceChildren(
      element('div', { className: 'guided-species-choice-summary' }, [
        element('h3', { text: choice.label }),
        element('p', {
          text:
            `${option?.label ?? 'Unknown option'} — ` +
            `${choice.ability_choice?.selected === null || choice.ability_choice === null
              ? 'no spellcasting ability'
              : abilityLabel(choice.ability_choice.selected)}`,
        }),
        ...(replaceable === null ||
        replaceable === undefined ||
        replaceable.selected_spell === null
          ? []
          : [element('p', {
              text: `${replaceable.label}: ${replaceable.selected_spell.spell.name}`,
            })]),
        change,
      ]),
      status,
    );
  };

  if (initiallyEditing) renderForm(false);
  else renderSummary();
  cleanups.push(() => picker?.destroy());
  return container;
}

function configuredChoicePanel(
  deps: SpeciesStepDeps,
  cleanups: Cleanup[],
): HTMLElement | null {
  if (deps.choiceState?.kind !== 'ready') return null;
  const resolution = deps.choiceState.resolution;
  if (resolution.kind === 'no_species') return null;
  if (resolution.kind === 'unresolvable') {
    return element('section', {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: SPECIES_STEP_PANEL },
    }, [
      element('h2', { text: 'Review species choices' }),
      element('p', { className: 'guided-error', text: resolution.reason }),
      characterListLink(),
    ]);
  }
  const continueBuild = element('p', { className: 'guided-nav' }, [
    element('a', {
      text: 'Continue guided build',
      attributes: {
        href: guidedBuildPath(deps.characterId),
        'data-router-link': '',
      },
    }),
  ]);
  return element('section', {
    className: 'guided-panel',
    attributes: { [GUIDED_PANEL_ATTRIBUTE]: SPECIES_STEP_PANEL },
  }, [
    element('h2', { text: `Review ${resolution.source_name} choices` }),
    element('p', {
      text:
        'This choice does not gate the guided journey. Record it here so its configured grants and sheet facts become known.',
    }),
    ...resolution.choices.map((choice) => choiceEditor(
      deps,
      choice,
      deps.choiceState?.kind === 'ready' ? deps.choiceState.revision : 0,
      resolution.kind === 'incomplete',
      cleanups,
    )),
    continueBuild,
    characterListLink(),
  ]);
}

export function createSpeciesStep(deps: SpeciesStepDeps): SpeciesStep {
  const cleanups: Cleanup[] = [];
  const panel = configuredChoicePanel(deps, cleanups) ?? speciesCards(deps, cleanups);
  return {
    element: guidedShell('species', panel, deps.characterId),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}
