/**
 * SYNTHETIC feat benefit paragraphs, written by hand for
 * `feat-grants-bridge.test.ts`.
 *
 * Same rule as `synthetic-feat-pages.ts`: not one byte of this file came from
 * a scrape. Every feat name, every label and every line of benefit text
 * below is original, invented for the purpose. Unlike
 * `synthetic-feat-pages.ts`, these are not full wiki-page HTML — the bridge's
 * input is `ParsedFeat.description` (`readonly FeatParagraph[]`, defined in
 * `tools/scrape/parse-feat.ts`), the same paragraph shape `parseFeatPage`
 * already produces, so these fixtures are written directly at that level
 * rather than round-tripped through HTML a second time.
 *
 * `GREAT_WEAPON_FIGHTING_MASTER_BONUS` and `SUDDEN_CHARGE_DAMAGE` intentionally
 * carry the kind of mechanic this module's closed sentence-shape vocabulary
 * does NOT recognise (a flat numeric bonus tied to proficiency bonus; a
 * damage die grant) — they exist to prove those paragraphs land in
 * `unmodeledProse`, VERBATIM, never guessed at and never silently dropped.
 */
import type { FeatParagraph } from '../../../tools/scrape/parse-feat';

/** Shape (a), two-point/"any": exactly the sentence `readAbilityIncreaseOptions` promotes. */
export const ASI_TWO_POINT_ANY: FeatParagraph = {
  label: 'Ability Score Increase.',
  text:
    'Increase one ability score of your choice by 2, or increase two ability ' +
    'scores of your choice by 1. This feat can’t increase an ability score above 20.',
};

/** Shape (a), one-point/named-pair: the other closed ASI shape. */
export const ASI_ONE_POINT_NAMED: FeatParagraph = {
  label: 'Ability Score Increase.',
  text: 'Increase your Wisdom or Charisma score by 1, to a maximum of 20.',
};

/** Labelled "Ability Score Increase." but matching neither closed shape. */
export const ASI_UNREADABLE: FeatParagraph = {
  label: 'Ability Score Increase.',
  text: 'Increase whichever ability score you feel like today.',
};

/** Shape (b): the ONLY recognised single-skill-proficiency sentence. */
export const SKILL_PROFICIENCY_SURVIVAL: FeatParagraph = {
  label: 'Keen Tracker.',
  text: 'You gain proficiency in Survival.',
};

export const SKILL_PROFICIENCY_ARCANA: FeatParagraph = {
  label: 'Bookish.',
  text: 'You gain proficiency in Arcana.',
};

/** Wrong preposition ("with", not "in") — must NOT match; stays unmodeled. */
export const SKILL_PROFICIENCY_WRONG_PREPOSITION: FeatParagraph = {
  label: 'Almost Keen Tracker.',
  text: 'You gain proficiency with Survival.',
};

/** Extra clause (two skills, not one) — must NOT match; stays unmodeled. */
export const SKILL_PROFICIENCY_EXTRA_CLAUSE: FeatParagraph = {
  label: 'Overreaching Tracker.',
  text: 'You gain proficiency in Survival and Perception.',
};

/**
 * Shape (c): "Your speed increases by N feet." Recognised by
 * `matchSpeedIncreaseFeet` in isolation, but `bridgeFeatProse` still leaves
 * this exact paragraph in `unmodeledProse` — see `feat-grants-bridge.ts`'s
 * file comment, "THE SPEED GAP", for why: no `GrantRuleKind` and no
 * `FeatContentAggregateV1` field can honestly carry it yet.
 */
export const SPEED_INCREASE_10_FEET: FeatParagraph = {
  label: 'Fleet of Foot.',
  text: 'Your speed increases by 10 feet.',
};

/**
 * A flat numeric bonus equal to proficiency bonus — the kind of mechanic
 * `docs`-shaped feats print but this module's closed vocabulary does not
 * cover. Deliberately unrecognisable, never a fabricated grant.
 */
export const GREAT_WEAPON_FIGHTING_MASTER_BONUS: FeatParagraph = {
  label: 'Overwhelming Force.',
  text:
    'When you hit a creature with a melee weapon attack using a heavy ' +
    'weapon, you can add your proficiency bonus to the damage roll.',
};

/** A budget-limited charge feat granting a damage die — also unrecognised. */
export const SUDDEN_CHARGE_DAMAGE: FeatParagraph = {
  label: 'Sudden Charge.',
  text:
    'Once per turn when you move at least 10 feet in a straight line toward ' +
    'a target and then hit it with a melee attack, you deal an extra 1d8 damage. ' +
    'You can use this benefit a number of times equal to your proficiency ' +
    'bonus, regaining all expended uses when you finish a Long Rest.',
};

/** Plain, mechanic-free flavour text — never a match, never surprising in `unmodeledProse`. */
export const FLAVOR_TEXT: FeatParagraph = {
  label: null,
  text: 'You gain the following benefits.',
};

/**
 * A full mixed feat: two recognised shapes (an ASI and a skill proficiency)
 * alongside two unrecognised mechanics and one flavour paragraph, in
 * document order — the "mixed feat" acceptance fixture.
 */
export const MIXED_FEAT_PROSE: readonly FeatParagraph[] = [
  FLAVOR_TEXT,
  ASI_ONE_POINT_NAMED,
  SKILL_PROFICIENCY_SURVIVAL,
  GREAT_WEAPON_FIGHTING_MASTER_BONUS,
  SUDDEN_CHARGE_DAMAGE,
];
