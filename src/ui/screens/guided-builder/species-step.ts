/**
 * THE SPECIES STEP — dispatch A4, the first post-class step that does
 * something.
 *
 * Shape and rules, all from the plan (§3.4, §4, §5, §8) and the law:
 *
 * - Choosing a species APPLIES it: the worker copies the template's printed
 *   traits, speed and effects onto the character in one transaction, and the
 *   sheet immediately reads them back. This screen never writes selection
 *   metadata and calls nothing but the seam's `applyOrigin` method.
 * - D33, the part people get wrong (§3.4): the step advances once the
 *   `character_species` row exists, but several bundled species REQUIRE
 *   choices this application cannot model — there is no table for a lineage,
 *   a chosen skill, or an Origin feat. Every card names the choices applying
 *   it will NOT make, so a species never arrives looking finished while its
 *   lineage and skill were never chosen. The lists live in
 *   {@link SPECIES_UNMADE_CHOICES}, a pinned literal reviewed by eye — never
 *   inferred from trait text.
 * - Lineage spells (D56, deferred to A6): for species in the seam's pinned
 *   lineage set, the card says the spells are NOT YET GRANTED — the character
 *   has them by the rules; this builder simply has not granted them. It must
 *   never imply the character has none.
 * - §5's trap: nothing here links into the planner grid. Success re-navigates
 *   to the build route, which re-derives the step from the database.
 * - Re-applying replaces (§8): the worker owns that semantic; this screen just
 *   shows the options whenever the derived step is `species`.
 */

import {
  guidedBuildPath,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedOriginOption,
} from '../../../builder/contracts';
import type { GuidedApplyOriginResult } from '../../../builder/guided-creation';
import { BUNDLED_ORIGIN_RULES_EDITION } from '../../../rules/origins-srd';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { characterListLink, guidedShell } from './guided-builder';

/**
 * The seam pins no locator for this panel — the same gap the class chooser
 * found and reported. This value is the implementer's, offered for
 * ratification the way A1's and A3's panel values were.
 */
export const SPECIES_STEP_PANEL = 'species-step';

function speciesKey(slug: string): string {
  return `${BUNDLED_ORIGIN_RULES_EDITION}:species:${slug}`;
}

/**
 * THE REQUIRED CHOICES THIS STEP CANNOT MAKE, per bundled species.
 *
 * A PINNED LITERAL, NOT AN INFERENCE — the same rule the seam applies to
 * `LINEAGE_SPELL_SPECIES_CONTENT_KEYS`, for the same reason: no table records
 * these choices, and sniffing trait text would let two agents invent two
 * different lists. Transcribed from the SRD 5.2.1 species descriptions
 * (`docs/srd/source/species-descriptions.txt`), reviewed by eye:
 *
 * - Dragonborn: Draconic Ancestry ("Choose the kind of dragon…").
 * - Elf: Elven Lineage + its spellcasting ability; Keen Senses skill.
 * - Gnome: Gnomish Lineage + its spellcasting ability.
 * - Goliath: Giant Ancestry benefit (one of six).
 * - Human: size ("Medium … or Small …, chosen when you select this
 *   species" — the copy records the first printed size, Medium); Skillful
 *   skill; Versatile Origin feat.
 * - Tiefling: size (same clause as Human); Fiendish Legacy + its spellcasting
 *   ability.
 * - Dwarf, Halfling, Orc: the SRD text offers no choice.
 *
 * When the species-choice model is built, entries here are DELETED rather than
 * reworded — they exist only while the choices are unmakeable (plan §3.4).
 */
export const SPECIES_UNMADE_CHOICES: ReadonlyMap<string, readonly string[]> =
  new Map([
    [
      speciesKey('dragonborn'),
      [
        'a Draconic Ancestry — the kind of dragon, which sets the Breath Weapon and Damage Resistance damage type',
      ],
    ],
    [
      speciesKey('elf'),
      [
        'an Elven Lineage (Drow, High Elf, or Wood Elf)',
        'a spellcasting ability for its spells (Intelligence, Wisdom, or Charisma)',
        'a Keen Senses skill (Insight, Perception, or Survival)',
      ],
    ],
    [
      speciesKey('gnome'),
      [
        'a Gnomish Lineage (Forest Gnome or Rock Gnome)',
        'a spellcasting ability for its spells (Intelligence, Wisdom, or Charisma)',
      ],
    ],
    [
      speciesKey('goliath'),
      ['a Giant Ancestry benefit (one of six)'],
    ],
    [
      speciesKey('human'),
      [
        'a size (Small or Medium — the copy records Medium)',
        'a Skillful skill (any one skill)',
        'a Versatile Origin feat',
      ],
    ],
    [
      speciesKey('tiefling'),
      [
        'a size (Small or Medium — the copy records Medium)',
        'a Fiendish Legacy (Abyssal, Chthonic, or Infernal)',
        'a spellcasting ability for its spells (Intelligence, Wisdom, or Charisma)',
      ],
    ],
  ]);

/** D33 disclosure for the seam's pinned lineage-spell species. */
export const LINEAGE_SPELLS_DISCLOSURE =
  'Lineage spells are not granted yet: this species has them by the rules, ' +
  'but this builder does not put them on the character, so they will not ' +
  'appear on the sheet until spell grants are built.';

/**
 * D33 disclosure for the step this group never built. `deriveBuildStep` pins
 * abilities complete because nothing can detect allocation; the person on this
 * screen is told rather than left to notice the step list jumped.
 */
export const ABILITIES_SKIPPED_DISCLOSURE =
  'The Ability scores step is not built yet, so the guided builder has ' +
  'skipped it: no scores have been asked for or chosen.';

/**
 * The worker refuses `unknown_origin` as `handler_error` with structured
 * `data.reason` (seam, `GuidedRefusalData`). Anything else is not a refusal
 * and falls through to the raw message.
 */
export function applyOriginRefusalMessage(error: unknown): string | null {
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
      'That species is not available in this database, so nothing was ' +
      'applied. Reload the page to refresh the species list.'
    );
  }
  return null;
}

export interface SpeciesStepDeps {
  readonly characterId: number;
  readonly options: readonly GuidedOriginOption[];
  readonly applyOrigin: (
    contentKey: string,
  ) => Promise<GuidedApplyOriginResult>;
  readonly navigate: (path: string) => void;
}

export interface SpeciesStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

function unmadeChoicesBlock(option: GuidedOriginOption): HTMLElement {
  const choices = SPECIES_UNMADE_CHOICES.get(option.content_key) ?? [];
  if (choices.length === 0) {
    return element('p', {
      className: 'guided-species-choices-none',
      text: 'The SRD offers no further choice for this species.',
    });
  }
  return element('div', { className: 'guided-species-choices' }, [
    element('p', {
      text:
        'Required choices this step cannot make yet — applying this ' +
        'species records none of them:',
    }),
    element(
      'ul',
      {},
      choices.map((choice) => element('li', { text: choice })),
    ),
  ]);
}

export function createSpeciesStep(deps: SpeciesStepDeps): SpeciesStep {
  const cleanups: Cleanup[] = [];
  const cards: HTMLButtonElement[] = [];
  let inFlight = false;

  /** Errors exist only while there is one to show, mirroring the chooser. */
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

  const setCardsDisabled = (disabled: boolean): void => {
    for (const card of cards) {
      card.disabled = disabled;
    }
  };

  const applySpecies = async (option: GuidedOriginOption): Promise<void> => {
    if (inFlight) {
      return;
    }
    // The same UI-only double-submit guard as creation (plan §3.3): disable
    // before the await, re-enable only on failure.
    inFlight = true;
    setError(null);
    setCardsDisabled(true);
    try {
      await deps.applyOrigin(option.content_key);
      // The species is now applied; the build route re-derives the step from
      // the database and renders whatever comes next.
      deps.navigate(guidedBuildPath(deps.characterId));
    } catch (error) {
      setError(
        applyOriginRefusalMessage(error) ??
          (error instanceof Error ? error.message : String(error)),
      );
      inFlight = false;
      setCardsDisabled(false);
    }
  };

  const cardList = element(
    'ul',
    {
      className: 'guided-species-options',
      attributes: { 'aria-label': 'Bundled species' },
    },
    deps.options.map((option) => {
      // A container with an explicit apply button, NOT one giant clickable
      // card: the disclosures are flow content a `button` may not contain,
      // and applying is consequential enough to deserve a labelled control.
      const apply = element('button', {
        className: 'guided-species-apply',
        text: `Choose ${option.name}`,
        attributes: {
          type: 'button',
          'data-species-option': option.content_key,
        },
      });
      cards.push(apply);
      cleanups.push(listen(apply, 'click', () => void applySpecies(option)));
      return element(
        'li',
        { className: 'guided-species-card' },
        [
          element('h3', {
            className: 'guided-species-name',
            text: option.name,
          }),
          unmadeChoicesBlock(option),
          ...(option.grants_lineage_spells
            ? [
                element('p', {
                  className: 'guided-lineage-disclosure',
                  text: LINEAGE_SPELLS_DISCLOSURE,
                }),
              ]
            : []),
          apply,
        ],
      );
    }),
  );

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: SPECIES_STEP_PANEL },
    },
    [
      element('h2', { text: 'Choose a species' }),
      element('p', {
        text:
          'Applying a species copies its printed traits, speed and effects ' +
          'onto the character, and they appear on the sheet immediately. ' +
          'Choosing again later replaces the earlier species.',
      }),
      element('p', {
        className: 'guided-abilities-skipped',
        text: ABILITIES_SKIPPED_DISCLOSURE,
      }),
      ...(deps.options.length === 0
        ? [
            element('p', {
              className: 'guided-empty-catalog',
              text:
                'No bundled species are available in this database, so ' +
                'this step cannot offer one.',
            }),
          ]
        : [cardList]),
      errorMount,
      characterListLink(),
    ],
  );

  return {
    element: guidedShell('species', panel),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
