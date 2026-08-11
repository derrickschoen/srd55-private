/**
 * THE BACKGROUND STEP — dispatch A5 recorded the printed text; dispatch B3
 * makes the step APPLY what D61 puts in the player's hands: the ability
 * increases and the Origin feat.
 *
 * WHAT D61, AS AMENDED BY D68, RULES, because this screen is where the ruling
 * is visible: the 2024 rules hand a background over as a fixed package — a
 * specific Origin feat and increases to three named abilities. The owner
 * judges the SRD's allowed combinations too restrictive, so this app does not
 * enforce them. The printed pairing is the DEFAULT — it prefills the controls
 * and constrains nothing — and the DEFAULTS ARE MARKED as the background's
 * own, in the pairing line and on the options themselves, so a person can see
 * what the book prints versus what they picked. Changing either is ordinary
 * use: nothing here calls the choice a house rule, homebrew, or a departure,
 * and nothing is persisted into the contributions' `notes` (D68 deleted that
 * labelling — see the note in `background-choices.ts`).
 *
 * ONE SUBMISSION, ONE TRANSACTION: the background, both increases (or all
 * three), and the feat land through a single `applyBackground` call.
 * Re-submitting REPLACES — the worker deletes the previous apply's source
 * instance tree, and the contributions and child feat source cascade away
 * with their owner.
 *
 * THE DISCLOSURE IS OPTION-DERIVED: the exact printed skills, tool text and
 * configured effects travel with each background option; the chosen feat is
 * read from the same picker submitted to Apply. Only the fixed transaction
 * categories (ability contributions and later equipment step) remain prose.
 */

import {
  BACKGROUND_STEP_ATTR,
  MAGIC_INITIATE_ABILITIES,
  MAGIC_INITIATE_FEAT_CONTENT_KEY,
  SKILLED_FEAT_CONTENT_KEY,
  type GuidedApplyBackgroundParams,
  type GuidedBackgroundChoiceOptions,
  type GuidedBackgroundIncrease,
  type GuidedBackgroundOption,
} from '../../../builder/background-choices';
import { MAGIC_INITIATE_LISTS } from '../../../domain/background-feat-name';
import {
  guidedBuildPath,
  GUIDED_PANEL_ATTRIBUTE,
} from '../../../builder/contracts';
import type { GuidedApplyOriginResult } from '../../../builder/guided-creation';
import {
  abilities,
  skills,
  type Ability,
  type Skill,
} from '../../../domain/enums';
import { SKILL_LABELS } from '../../../rules/skills';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { abilityLabel } from '../../human-labels';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import { catalogSelectGroups } from '../../catalog-control-disclosure';
import { characterListLink, guidedShell } from './guided-builder';

/**
 * The seam pins no locator for this panel — the same gap every dispatch has
 * found. This value is the implementer's, offered for ratification the way
 * A1's, A3's and A4's panel values were.
 */
export const BACKGROUND_STEP_PANEL = 'background-step';

/** The two printed spread shapes; the SIZE of the budget is not D61's to lift. */
type IncreaseMode = 'two_one' | 'one_one_one';

const MODE_LABELS: Readonly<Record<IncreaseMode, string>> = {
  two_one: '+2 to one ability, +1 to another',
  one_one_one: '+1 to each of three abilities',
};

const SLOT_AMOUNTS: Readonly<Record<IncreaseMode, readonly number[]>> = {
  two_one: [2, 1],
  one_one_one: [1, 1, 1],
};

/**
 * The worker refuses `unknown_origin` as `handler_error` with structured
 * `data.reason` (seam, `GuidedRefusalData`). B3 widened what the reason can
 * mean — an unknown background, an unknown Origin feat, or a background
 * whose definition row was yielded to user-authored content — so the message
 * no longer guesses which; the worker's own sentence stays primary and this
 * is the fallback framing. Anything else is not a refusal and falls through
 * to the raw message.
 */
export function applyBackgroundRefusalMessage(error: unknown): string | null {
  if (!(error instanceof RpcError) || error.code !== 'handler_error') {
    return null;
  }
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const reason = (data as Record<string, unknown>)['reason'];
  if (reason === 'unknown_origin') {
    return (
      'That choice is not available in this database, so nothing was ' +
      'recorded. Reload the page to refresh the options.'
    );
  }
  return null;
}

export interface BackgroundStepDeps {
  readonly characterId: number;
  readonly options: GuidedBackgroundChoiceOptions;
  readonly applyBackground: (
    params: GuidedApplyBackgroundParams,
  ) => Promise<GuidedApplyOriginResult>;
  readonly navigate: (path: string) => void;
}

export interface BackgroundStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

export function createBackgroundStep(deps: BackgroundStepDeps): BackgroundStep {
  const cleanups: Cleanup[] = [];
  let inFlight = false;

  let selected: GuidedBackgroundOption | null = null;
  let mode: IncreaseMode = 'two_one';
  /** One chosen ability per slot of the current mode. */
  let slots: Ability[] = ['strength', 'dexterity'];
  let featKey =
    deps.options.origin_feats[0]?.content_key ?? '';
  let magicInitiateList: string = MAGIC_INITIATE_LISTS[0];
  let magicInitiateAbility: string = MAGIC_INITIATE_ABILITIES[0];
  const skilledSkills: Array<Skill | null> = [null, null, null];

  const errorMount = element('div', { className: 'guided-error-mount' });
  const setError = (message: string | null): void => {
    clear(errorMount);
    if (message !== null) {
      errorMount.append(
        element('p', {
          className: 'guided-error',
          text: message,
          attributes: { role: 'alert' },
        }),
      );
    }
  };

  const chosenIncreases = (): readonly GuidedBackgroundIncrease[] =>
    SLOT_AMOUNTS[mode].map((amount, index) => ({
      ability: slots[index] ?? 'strength',
      amount,
    }));

  /**
   * THE PRINTED PAIRING, shown for the selected background as ITS OWN DEFAULT
   * (D68). Verbatim licensed text — never a constraint (D61) — and the same
   * defaults are marked on the individual options below.
   */
  const suggestionMount = element('p', {
    className: 'guided-background-suggestion',
    attributes: { [BACKGROUND_STEP_ATTR.suggestion]: '' },
  });
  const renderSuggestion = (): void => {
    if (selected === null) {
      suggestionMount.textContent =
        'Choose a background to see its default increases and Origin feat.';
      return;
    }
    const pairing = selected.pairing;
    suggestionMount.textContent =
      `${pairing.background_name}'s printed default: increases to ` +
      `${pairing.suggested_abilities?.map(abilityLabel).join(', ') ?? pairing.printed_abilities.join(', ')}, and the ` +
      `${pairing.printed_feat} feat. Change any of it below; the defaults ` +
      'are marked.';
  };

  const applyDisclosureMount = element('div', {
    className: 'guided-background-apply-disclosure',
  });
  const renderApplyDisclosure = (): void => {
    clear(applyDisclosureMount);
    if (selected === null) {
      applyDisclosureMount.append(element('p', {
        text: 'Choose a background to see exactly what Apply will change.',
      }));
      return;
    }
    const background = selected;

    const chosenFeat = deps.options.origin_feats.find(
      (feat) => feat.content_key === featKey,
    );
    const applied = [
      element('li', { text: 'your chosen ability-score increases' }),
      element('li', {
        text:
          `${background.applied_skill_proficiencies.map((skill) =>
            SKILL_LABELS[skill]
          ).join(' and ')} as skill proficiencies`,
      }),
      element('li', {
        text: chosenFeat === undefined
          ? 'your chosen Origin feat and its configured grants'
          : `${chosenFeat.name} · ${catalogLayerLabel(
              chosenFeat.catalog_layer,
            )} as your Origin feat, including its configured grants`,
      }),
      ...background.applied_effects.map((effect) =>
        element('li', {
          text:
            `${effect.label} · ${catalogLayerLabel(
              background.catalog_layer,
            )} as a configured background effect`,
        })
      ),
    ];
    const sourceLayer = catalogLayerLabel(background.catalog_layer);
    applyDisclosureMount.append(
      element('h3', { text: 'What Apply changes now' }),
      element('p', {
        text:
          'Apply records the printed background text and mechanically adds:',
      }),
      element('ul', {}, applied),
      element('h3', { text: 'What stays reference text or happens later' }),
      element('ul', {}, [
        element('li', {
          text:
            `${background.deferred_tool_reference_text} · ${sourceLayer} is ` +
            'recorded as tool reference text; no tool proficiency is ' +
            'mechanically applied.',
        }),
        element('li', {
          text:
            'The starting equipment package is chosen and mechanically ' +
            'applied at the equipment step, not by Apply background.',
        }),
      ]),
      element('p', {
        text:
          'Applying a different background later replaces this background, ' +
          'its applied mechanics, and its chosen Origin feat together.',
      }),
    );
  };

  /** True when `ability` is one of the selected background's printed three. */
  const isDefaultAbility = (ability: Ability): boolean =>
    selected?.pairing.suggested_abilities?.includes(ability) ?? false;

  /* ------------------------------------------------------ the increases */

  const slotMount = element('div', {
    className: 'guided-background-increase-slots',
  });
  const renderSlots = (): void => {
    clear(slotMount);
    const amounts = SLOT_AMOUNTS[mode];
    amounts.forEach((amount, index) => {
      const select = element(
        'select',
        {
          attributes: {
            [BACKGROUND_STEP_ATTR.increaseAbility]: String(index),
            'aria-label': `Ability receiving +${String(amount)}`,
          },
        },
        abilities.map((ability) => {
          // The background's printed abilities are marked as its defaults
          // (D68); every ability stays equally selectable.
          const option = element('option', {
            text: isDefaultAbility(ability)
              ? `${abilityLabel(ability)} (default)`
              : abilityLabel(ability),
            attributes: { value: ability },
          });
          if (ability === slots[index]) {
            option.selected = true;
          }
          return option;
        }),
      );
      cleanups.push(
        listen(select, 'change', () => {
          slots[index] = select.value as Ability;
          setError(null);
        }),
      );
      slotMount.append(
        element('label', { className: 'guided-background-increase' }, [
          element('span', { text: `+${String(amount)}` }),
          select,
        ]),
      );
    });
  };

  const defaultSlotsFor = (nextMode: IncreaseMode): Ability[] => {
    const suggested = selected?.pairing.suggested_abilities ?? null;
    const fallback: readonly Ability[] = abilities;
    const source = suggested ?? fallback;
    return SLOT_AMOUNTS[nextMode].map(
      (_, index) => source[index] ?? fallback[index] ?? 'strength',
    );
  };

  const modeSelector = element(
    'fieldset',
    { className: 'guided-background-increase-modes' },
    [
      element('legend', { text: 'Assign the ability increases' }),
      ...(['two_one', 'one_one_one'] as const).map((candidate) => {
        const radio = element('input', {
          attributes: {
            type: 'radio',
            name: 'background-increase-mode',
            value: candidate,
            [BACKGROUND_STEP_ATTR.increaseMode]: candidate,
          },
        });
        if (candidate === mode) {
          radio.checked = true;
        }
        cleanups.push(
          listen(radio, 'change', () => {
            if (!radio.checked) {
              return;
            }
            mode = candidate;
            slots = defaultSlotsFor(candidate);
            setError(null);
            renderSlots();
          }),
        );
        return element('label', { className: 'guided-background-mode' }, [
          radio,
          element('span', { text: MODE_LABELS[candidate] }),
        ]);
      }),
    ],
  );

  /* -------------------------------------------------------- the feat */

  const featSelect = element('select', {
    attributes: {
      [BACKGROUND_STEP_ATTR.feat]: '',
      'aria-label': 'Origin feat',
    },
  });
  /**
   * Rebuilt whenever the background changes, because the selected
   * background's printed feat is marked as its default (D68). Every Origin
   * feat stays equally selectable.
   */
  const renderFeatOptions = (): void => {
    clear(featSelect);
    const defaultFeat = selected?.pairing.suggested_feat_content_key ?? null;
    featSelect.append(...catalogSelectGroups(
      deps.options.origin_feats.map((feat) => ({
        value: feat.content_key,
        label: feat.content_key === defaultFeat
          ? `${feat.name} (default)`
          : feat.name,
        catalogLayer: feat.catalog_layer,
        selected: feat.content_key === featKey,
      })),
    ));
  };

  const magicInitiateFields = element(
    'div',
    { className: 'guided-background-magic-initiate' },
    [],
  );
  const renderMagicInitiateFields = (): void => {
    clear(magicInitiateFields);
    if (featKey !== MAGIC_INITIATE_FEAT_CONTENT_KEY) {
      magicInitiateFields.hidden = true;
      return;
    }
    magicInitiateFields.hidden = false;
    const list = element(
      'select',
      {
        attributes: {
          [BACKGROUND_STEP_ATTR.magicInitiateList]: '',
          'aria-label': 'Magic Initiate spell list',
        },
      },
      MAGIC_INITIATE_LISTS.map((candidate) => {
        // The list printed in the background's feat name ("Magic Initiate
        // (Cleric)") is marked as its default (D68).
        const option = element('option', {
          text:
            candidate === selected?.pairing.suggested_magic_initiate_list
              ? `${candidate} (default)`
              : candidate,
          attributes: { value: candidate },
        });
        if (candidate === magicInitiateList) {
          option.selected = true;
        }
        return option;
      }),
    );
    cleanups.push(
      listen(list, 'change', () => {
        magicInitiateList = list.value;
      }),
    );
    const ability = element(
      'select',
      {
        attributes: {
          [BACKGROUND_STEP_ATTR.magicInitiateAbility]: '',
          'aria-label': 'Magic Initiate spellcasting ability',
        },
      },
      MAGIC_INITIATE_ABILITIES.map((candidate) => {
        const option = element('option', {
          text: abilityLabel(candidate),
          attributes: { value: candidate },
        });
        if (candidate === magicInitiateAbility) {
          option.selected = true;
        }
        return option;
      }),
    );
    cleanups.push(
      listen(ability, 'change', () => {
        magicInitiateAbility = ability.value;
      }),
    );
    magicInitiateFields.append(
      element('label', { className: 'guided-background-feat-config' }, [
        element('span', { text: 'Magic Initiate spell list' }),
        list,
      ]),
      element('label', { className: 'guided-background-feat-config' }, [
        element('span', { text: 'Magic Initiate spellcasting ability' }),
        ability,
      ]),
    );
  };
  const skilledFields = element(
    'fieldset',
    { className: 'guided-background-skilled' },
    [],
  );
  const renderSkilledFields = (): void => {
    clear(skilledFields);
    if (featKey !== SKILLED_FEAT_CONTENT_KEY) {
      skilledFields.hidden = true;
      return;
    }
    skilledFields.hidden = false;
    skilledFields.append(
      element('legend', { text: 'Skilled choices' }),
      element('p', {
        text:
          'Each choice may be a skill or a tool. Tool choices remain ' +
          'unrecorded because this application does not model tools.',
      }),
    );
    skilledSkills.forEach((selectedSkill, index) => {
      const select = element(
        'select',
        {
          attributes: {
            [BACKGROUND_STEP_ATTR.skilledSkill]: String(index),
            'aria-label': `Skilled choice ${String(index + 1)}`,
          },
        },
        [
          element('option', {
            text: 'Tool choice / leave unrecorded',
            attributes: { value: '' },
          }),
          ...skills.map((skill) =>
            element('option', {
              text: SKILL_LABELS[skill],
              attributes: { value: skill },
            }),
          ),
        ],
      );
      select.value = selectedSkill ?? '';
      cleanups.push(
        listen(select, 'change', () => {
          skilledSkills[index] =
            select.value === '' ? null : (select.value as Skill);
          setError(null);
        }),
      );
      skilledFields.append(
        element('label', { className: 'guided-background-feat-config' }, [
          element('span', {
            text: `Skilled choice ${String(index + 1)}`,
          }),
          select,
        ]),
      );
    });
  };
  cleanups.push(
    listen(featSelect, 'change', () => {
      featKey = featSelect.value;
      setError(null);
      renderMagicInitiateFields();
      renderSkilledFields();
      renderApplyDisclosure();
    }),
  );

  /* -------------------------------------------------- the backgrounds */

  const selectBackground = (option: GuidedBackgroundOption): void => {
    selected = option;
    setError(null);
    // Prefill from the printed pairing — the background's own DEFAULT, never
    // a constraint (D61/D68). The player changes any of it freely below.
    slots = defaultSlotsFor(mode);
    const suggestedFeat = option.pairing.suggested_feat_content_key;
    if (
      suggestedFeat !== null &&
      deps.options.origin_feats.some(
        (feat) => feat.content_key === suggestedFeat,
      )
    ) {
      featKey = suggestedFeat;
    }
    const suggestedList = option.pairing.suggested_magic_initiate_list;
    if (suggestedList !== null) {
      magicInitiateList = suggestedList;
    }
    renderSlots();
    renderFeatOptions();
    renderMagicInitiateFields();
    renderSkilledFields();
    renderSuggestion();
    renderApplyDisclosure();
  };

  const backgroundList = element(
    'ul',
    {
      className: 'guided-background-options',
      attributes: { 'aria-label': 'Catalog backgrounds' },
    },
    deps.options.backgrounds.map((option) => {
      const disclosureId = `guided-background-${option.content_key.replace(/[^a-z0-9]+/giu, '-')}-catalog-layer`;
      const radio = element('input', {
        attributes: {
          type: 'radio',
          name: 'background-option',
          value: option.content_key,
          [BACKGROUND_STEP_ATTR.option]: option.content_key,
          'aria-describedby': disclosureId,
        },
      });
      cleanups.push(
        listen(radio, 'change', () => {
          if (radio.checked) {
            selectBackground(option);
          }
        }),
      );
      return element('li', { className: 'guided-background-card' }, [
        element('label', { className: 'guided-background-choice' }, [
          radio,
          element('span', {
            className: 'guided-background-name',
            text: option.name,
          }),
        ]),
        element('p', {
          className: 'catalog-layer-disclosure',
          text: catalogLayerLabel(option.catalog_layer),
          attributes: { id: disclosureId },
        }),
        element('p', {
          className: 'guided-background-printed',
          text:
            `Printed defaults: ${option.pairing.suggested_abilities?.map(abilityLabel).join(', ') ?? option.pairing.printed_abilities.join(', ')}; ` +
            `${option.pairing.printed_feat}.`,
        }),
      ]);
    }),
  );

  /* ------------------------------------------------------- submission */

  const entryError = (): string | null => {
    if (selected === null) {
      return 'Choose a background first.';
    }
    const chosen = chosenIncreases().map((increase) => increase.ability);
    if (new Set(chosen).size !== chosen.length) {
      return 'Each increase must go to a different ability.';
    }
    if (featKey === '') {
      return 'Choose an Origin feat.';
    }
    const chosenSkills = skilledSkills.filter(
      (skill): skill is Skill => skill !== null,
    );
    if (new Set(chosenSkills).size !== chosenSkills.length) {
      return 'Each Skilled skill choice must be different.';
    }
    return null;
  };

  const submit = element('button', {
    className: 'guided-background-submit',
    text: 'Apply background',
    attributes: { type: 'button', [BACKGROUND_STEP_ATTR.submit]: '' },
  });

  const apply = async (): Promise<void> => {
    if (inFlight) {
      return;
    }
    const refusal = entryError();
    if (refusal !== null || selected === null) {
      setError(refusal);
      return;
    }
    inFlight = true;
    setError(null);
    submit.disabled = true;
    try {
      await deps.applyBackground({
        character_id: deps.characterId,
        content_key: selected.content_key,
        increases: chosenIncreases(),
        origin_feat_content_key: featKey,
        origin_feat_config:
          featKey === MAGIC_INITIATE_FEAT_CONTENT_KEY
            ? {
                chosen_list: magicInitiateList,
                spellcasting_ability: magicInitiateAbility,
              }
            : featKey === SKILLED_FEAT_CONTENT_KEY
              ? { selected_skills: skilledSkills }
              : {},
      });
      // The background is applied; the build route re-derives the step from
      // the database and renders whatever comes next.
      deps.navigate(guidedBuildPath(deps.characterId));
    } catch (error) {
      setError(
        applyBackgroundRefusalMessage(error) ??
          (error instanceof Error ? error.message : String(error)),
      );
      inFlight = false;
      submit.disabled = false;
    }
  };
  cleanups.push(listen(submit, 'click', () => void apply()));

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: BACKGROUND_STEP_PANEL },
    },
    [
      element('h2', { text: 'Choose a background' }),
      ...(deps.options.backgrounds.length === 0
        ? [
            element('p', {
              className: 'guided-empty-catalog',
              text:
                'No catalog backgrounds are available in this database, so ' +
                'this step cannot offer one.',
            }),
          ]
        : [
            backgroundList,
            suggestionMount,
            modeSelector,
            slotMount,
            element('label', { className: 'guided-background-feat' }, [
              element('span', { text: 'Origin feat' }),
              featSelect,
            ]),
            magicInitiateFields,
            skilledFields,
            applyDisclosureMount,
            submit,
          ]),
      errorMount,
      characterListLink(),
    ],
  );

  renderSlots();
  renderFeatOptions();
  renderMagicInitiateFields();
  renderSkilledFields();
  renderSuggestion();
  renderApplyDisclosure();

  return {
    element: guidedShell('background', panel, deps.characterId),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
