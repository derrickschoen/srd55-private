/**
 * SUPERVISOR-OWNED — PART OF THE SEAM, ratified from B3.
 *
 * The seam file said every cross-agent name belongs in it, and B3 correctly
 * refused to edit a file declared read-only to implementers; it defined its
 * contract here and offered it up instead. Ratified as a seam module rather
 * than folded into `contracts.ts`, which is already long — but the ownership
 * rule is identical: **neither the production nor the test agent edits this
 * file.** `contracts.ts` re-exports it so there is one import point.
 */
/**
 * THE BACKGROUND STEP'S CHOICES (dispatch B3, per D61 and D63).
 *
 * NOT THE SEAM. The seam (`contracts.ts`) is supervisor-owned and pins nothing
 * for B3 — no params shape for a background apply that carries the player's
 * increases and Origin feat, no options shape carrying the SRD's printed
 * pairing, no locators for the assignment controls, and no RPC names for
 * either. Every dispatch so far has found such a gap; following the ratified
 * pattern (A1's and A4's panel locators, B1's validator), the values here are
 * the implementer's, OFFERED FOR RATIFICATION into the seam — reported, not
 * silently chosen for both sides.
 *
 * WHAT D61 RULES, as amended by D68: the background is required; its Origin
 * feat and ability increases are the PLAYER'S to choose, because the owner
 * judges the SRD's allowed combinations too restrictive. The printed pairing
 * is the DEFAULT — marked as the background's own, prefilled, never a
 * constraint — and changing it is ordinary use, not a labelled departure
 * (D68; see the note at the locators below).
 */

import { abilities, isEnumValue, type Ability } from '../domain/enums';
import { hasExactKeys } from './contracts';

/**
 * Magic Initiate's two closed choice sets. Declared HERE — a leaf module —
 * and imported by `add_source` (which enforced them first), so the guided
 * picker and the expert command validate the same sets without the UI bundle
 * swallowing the command machinery. `update-source-config.ts` predates this
 * and still carries its own list copy.
 */
export const MAGIC_INITIATE_LISTS = ['Cleric', 'Druid', 'Wizard'] as const;
export const MAGIC_INITIATE_ABILITIES = [
  'intelligence',
  'wisdom',
  'charisma',
] as const;

/* ------------------------------------------------------------ RPC methods */

export const BACKGROUND_RPC = Object.freeze({
  /** The step's option data: backgrounds with their printed pairing, and the Origin feats. */
  choiceOptions: 'queries.characters.backgroundChoiceOptions',
  /** The one-transaction apply: background, increases, Origin feat. */
  applyBackground: 'queries.characters.applyBackground',
} as const);

/* ------------------------------------------------------------- constants */

/**
 * "None of these increases can raise a score above 20."
 * (`docs/srd/source/backgrounds.txt:51`). The cap travels ON the
 * contribution (`character_effects.maximum`) because sources genuinely
 * differ: ASI feats also stop at 20, Epic Boons at 30.
 */
export const BACKGROUND_ABILITY_INCREASE_MAXIMUM = 20;

/**
 * Magic Initiate is the one bundled Origin feat whose grant rules read config
 * (`$config.chosen_list`); generating it with an empty config THROWS in
 * `materializeListChoices`, so its two sub-choices are gathered by the picker
 * — the same requirement `add_source` enforces on the expert path. The key is
 * the literal already hardcoded in `add-source.ts` and `editors.ts`.
 */
export const MAGIC_INITIATE_FEAT_CONTENT_KEY = '2024:feat:magic-initiate';

/* ---------------------------------------------------------------- options */

export interface GuidedOriginFeatOption {
  readonly content_key: string;
  readonly name: string;
}

/**
 * A background's printed pairing: the licensed text, verbatim, plus the
 * machine-usable suggestion parsed from it. The parsed fields are NULLABLE —
 * a printed name that resolves to no bundled ability or feat yields no
 * suggestion rather than a guessed one (D33) — and the verbatim fields are
 * what the screen prints either way.
 */
export interface BackgroundPrintedPairing {
  readonly background_name: string;
  /** The three printed ability names, verbatim (e.g. "Intelligence"). */
  readonly printed_abilities: readonly [string, string, string];
  /** The printed feat, verbatim (e.g. "Magic Initiate (Cleric)"). */
  readonly printed_feat: string;
  /** The printed abilities as domain abilities; null when any fails to parse. */
  readonly suggested_abilities: readonly Ability[] | null;
  /** The printed feat's bundled definition key; null when it names none. */
  readonly suggested_feat_content_key: string | null;
  /** The printed Magic Initiate list, when the printed feat carries one. */
  readonly suggested_magic_initiate_list: string | null;
}

export interface GuidedBackgroundOption {
  readonly content_key: string;
  readonly name: string;
  readonly pairing: BackgroundPrintedPairing;
}

export interface GuidedBackgroundChoiceOptions {
  readonly backgrounds: readonly GuidedBackgroundOption[];
  readonly origin_feats: readonly GuidedOriginFeatOption[];
}

/* ----------------------------------------------------------------- params */

export interface GuidedBackgroundIncrease {
  readonly ability: Ability;
  readonly amount: number;
}

/**
 * The whole step in one request, because the plan pins the apply as ONE
 * transaction: replacing a background replaces its contributions and its
 * child feat source together, so gathering the choices across several
 * requests would manufacture partial states the wizard must not produce.
 *
 * `origin_feat_config` is the chosen feat's own configuration — Magic
 * Initiate's spell list and casting ability, `{}` for every other feat. The
 * key names are `add_source`'s existing vocabulary, validated by
 * {@link isGuidedApplyBackgroundParams} against the same closed sets.
 */
export interface GuidedApplyBackgroundParams {
  readonly character_id: number;
  readonly content_key: string;
  readonly increases: readonly GuidedBackgroundIncrease[];
  readonly origin_feat_content_key: string;
  readonly origin_feat_config: Readonly<Record<string, unknown>>;
}

/**
 * THE SPREAD IS THE SRD'S; THE ABILITIES ARE THE PLAYER'S. "Increase one by 2
 * and another one by 1, or increase all three by 1"
 * (`docs/srd/source/backgrounds.txt`) — D61 lifts the restriction on WHICH
 * abilities and WHICH feat may pair, not the size of the budget, so the two
 * printed shapes are the legal ones and the six abilities are all eligible.
 */
export function isValidBackgroundIncreaseSpread(
  increases: readonly GuidedBackgroundIncrease[],
): boolean {
  const distinct =
    new Set(increases.map((increase) => increase.ability)).size ===
    increases.length;
  if (!distinct) {
    return false;
  }
  const amounts = increases
    .map((increase) => increase.amount)
    .sort((left, right) => left - right)
    .join(',');
  return amounts === '1,2' || amounts === '1,1,1';
}

function isGuidedBackgroundIncrease(
  value: unknown,
): value is GuidedBackgroundIncrease {
  if (!hasExactKeys(value, ['ability', 'amount'])) {
    return false;
  }
  return (
    isEnumValue(abilities, value['ability']) &&
    (value['amount'] === 1 || value['amount'] === 2)
  );
}

/**
 * Magic Initiate's config, held to exactly the shape `add_source` enforces;
 * every other feat must carry `{}` — an unknown key riding along would be
 * stored config nothing reads, which is how drift starts.
 */
function isValidOriginFeatConfig(
  featContentKey: unknown,
  config: unknown,
): boolean {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return false;
  }
  if (featContentKey !== MAGIC_INITIATE_FEAT_CONTENT_KEY) {
    return Object.keys(config).length === 0;
  }
  if (!hasExactKeys(config, ['chosen_list', 'spellcasting_ability'])) {
    return false;
  }
  return (
    typeof config['chosen_list'] === 'string' &&
    (MAGIC_INITIATE_LISTS as readonly string[]).includes(
      config['chosen_list'],
    ) &&
    typeof config['spellcasting_ability'] === 'string' &&
    (MAGIC_INITIATE_ABILITIES as readonly string[]).includes(
      config['spellcasting_ability'],
    )
  );
}

export function isGuidedApplyBackgroundParams(
  value: unknown,
): value is GuidedApplyBackgroundParams {
  if (
    !hasExactKeys(value, [
      'character_id',
      'content_key',
      'increases',
      'origin_feat_content_key',
      'origin_feat_config',
    ])
  ) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const increases = candidate['increases'];
  return (
    typeof candidate['character_id'] === 'number' &&
    Number.isInteger(candidate['character_id']) &&
    candidate['character_id'] > 0 &&
    typeof candidate['content_key'] === 'string' &&
    candidate['content_key'].length > 0 &&
    typeof candidate['origin_feat_content_key'] === 'string' &&
    candidate['origin_feat_content_key'].length > 0 &&
    Array.isArray(increases) &&
    increases.every((increase) => isGuidedBackgroundIncrease(increase)) &&
    isValidBackgroundIncreaseSpread(
      increases as readonly GuidedBackgroundIncrease[],
    ) &&
    isValidOriginFeatConfig(
      candidate['origin_feat_content_key'],
      candidate['origin_feat_config'],
    )
  );
}

/* ------------------------------------------------------ printed pairing */

const ABILITY_BY_PRINTED_NAME: ReadonlyMap<string, Ability> = new Map(
  abilities.map((ability) => [
    `${ability.slice(0, 1).toUpperCase()}${ability.slice(1)}`,
    ability,
  ]),
);

/**
 * Parses one background's printed pairing into a suggestion. The feat name
 * may carry a parenthetical ("Magic Initiate (Cleric)"): the base name is
 * matched against the Origin feats by NAME — the template stores prose, not a
 * key — and the parenthetical becomes the suggested spell list only when the
 * feat is Magic Initiate and the option is one of its three printed lists.
 */
export function printedPairing(
  template: {
    readonly name: string;
    readonly ability_score_1: string;
    readonly ability_score_2: string;
    readonly ability_score_3: string;
    readonly feat_name: string;
  },
  originFeatKeyByName: ReadonlyMap<string, string>,
): BackgroundPrintedPairing {
  const printedAbilities: readonly [string, string, string] = [
    template.ability_score_1,
    template.ability_score_2,
    template.ability_score_3,
  ];
  const parsedAbilities: Ability[] = [];
  for (const printed of printedAbilities) {
    const ability = ABILITY_BY_PRINTED_NAME.get(printed.trim());
    if (ability !== undefined) {
      parsedAbilities.push(ability);
    }
  }
  const suggestedAbilities =
    parsedAbilities.length === printedAbilities.length
      ? parsedAbilities
      : null;

  const printedFeat = template.feat_name.trim();
  const parenthetical = /^(?<base>.*?)\s*\((?<option>[^)]+)\)$/.exec(
    printedFeat,
  )?.groups;
  const baseName = parenthetical?.base ?? printedFeat;
  const option = parenthetical?.option ?? null;
  const featKey = originFeatKeyByName.get(baseName) ?? null;
  const magicInitiateList =
    featKey === MAGIC_INITIATE_FEAT_CONTENT_KEY &&
    option !== null &&
    (MAGIC_INITIATE_LISTS as readonly string[]).includes(option)
      ? option
      : null;

  return {
    background_name: template.name,
    printed_abilities: printedAbilities,
    printed_feat: printedFeat,
    suggested_abilities: suggestedAbilities,
    suggested_feat_content_key: featKey,
    suggested_magic_initiate_list: magicInitiateList,
  };
}

/* ---------------------------------------------------------------- locators */

/**
 * D68 — DO NOT MARK THIS AS HOMEBREW, A HOUSE RULE, OR A DEPARTURE. THIS NOTE
 * EXISTS BECAUSE A FUTURE SESSION WILL BE TEMPTED TO PUT THE LABEL BACK.
 *
 * The owner ruled it directly: choosing the background's Origin feat and
 * ability increases *"is commonly allowed"* at real tables. Labelling it tells
 * a person something misleading about their own character.
 *
 * D61 originally called the freedom a deliberate SRD departure and required it
 * be labelled where a person can see it. **D68 struck the labelling.** What
 * survives from D61: background is REQUIRED, and the player chooses.
 *
 * What the step does instead: the SRD's printed feat and increases are the
 * DEFAULT, both are selectable, and **the DEFAULTS are marked** so a person can
 * see what the book prints versus what they picked. The marking moved from the
 * deviation to the default — that inversion is the whole ruling.
 *
 * So this constant and the deviation sentence are DELETED, not reworded, per
 * the standing rule for a disclosure whose reason has expired. If you are
 * reading this because you are about to add a "house rule" notice back: don't.
 *
 * (The constant the note above anchored to — `BACKGROUND_HOUSE_RULE_NOTICE` —
 * and `backgroundPairingDeviation` lived here until D68 deleted them, along
 * with the `houseRule` and `deviation` locators below. The note stays, by
 * explicit owner instruction, where a session touching this step's contract
 * will read it.)
 */
/**
 * The step's locators, mirroring `ABILITY_STEP_ATTR`'s ratified shape.
 */
export const BACKGROUND_STEP_ATTR = Object.freeze({
  /** Each background radio, valued with its content key. */
  option: 'data-background-option',
  /** The spread selector: `two_one` or `one_one_one`. */
  increaseMode: 'data-background-increase-mode',
  /** Each ability select, valued with its slot index within the spread. */
  increaseAbility: 'data-background-increase-ability',
  /** The Origin feat select. */
  feat: 'data-background-feat',
  /** Magic Initiate's spell list select. */
  magicInitiateList: 'data-background-feat-list',
  /** Magic Initiate's casting ability select. */
  magicInitiateAbility: 'data-background-feat-ability',
  /** The line naming the selected background's printed default pairing. */
  suggestion: 'data-background-suggestion',
  /** The one submit button. */
  submit: 'data-background-submit',
} as const);
