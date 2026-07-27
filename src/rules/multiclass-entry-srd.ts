/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE "AS A MULTICLASS CHARACTER" CLAUSE OF ALL TWELVE CLASSES, PARSED.
 *
 * `docs/srd/source/multiclassing.txt:78-82` says a character entering a SECOND
 * class gains "only SOME of the new class's starting proficiencies, as detailed
 * in each class's description". `docs/srd/source/multiclass-entry-grants.txt`
 * holds those twelve descriptions verbatim; this module turns them into the
 * subset that `class_armor_training.granted_on_multiclass_entry`,
 * `class_weapon_proficiencies.granted_on_multiclass_entry` and the two
 * `class_sheet_traits.multiclass_skill_choice_*` columns record.
 *
 * PARSED, NOT TRANSCRIBED, for the reason `class-traits-srd.ts` gives: a parse
 * is diffable against the extract, and a value that is not in the extract
 * cannot reach the database.
 *
 * FOUR HAZARDS IN THIS EXTRACT, EACH MEASURED AND EACH BREAKING A DIFFERENT
 * NAIVE PARSER:
 *
 *  1. HYPHENATION ACROSS LINE BREAKS. Every one of the four Martial grants is
 *     split `Mar-` / `tial` (L24-25, L77-79, L102-103, L115-116), and the Bard's
 *     instrument is `In-` / `strument` (L38-39). A line-oriented reader extracts
 *     the weapon category `Mar`. `class-traits-srd.ts` has no dehyphenation step
 *     because `class-core-traits.txt` never needed one; this file needs it.
 *  2. BLANK LINES INSIDE SINGLE SENTENCES. Cleric L53-57, Druid L62-66, Fighter
 *     L75-79, Paladin L105-109 and Wizard L169-172 all break mid-sentence. The
 *     Druid's grant sentence alone spans L62-66 with two interior blanks. A
 *     blank line is NOT a record separator here.
 *  3. THE BULLET GLYPHS ARE MISSING FOR TWO CLASSES. Cleric and Wizard carry
 *     zero `•` characters where the other ten carry exactly two, because their
 *     slices are taken at the two highest column offsets in the file (75 and 73)
 *     and the cut lands right of the bullet column. So "count the bullets" is
 *     not a safe parse, and the Cleric's trait list runs into its level-1
 *     features sentence as one unbulleted block.
 *  4. THE SLICES ARE LOSSY AT BOTH EDGES. L174 reads `izard Class Features` —
 *     the `W` clipped by the same offset — and the Paladin's second bullet stops
 *     mid-word at L108. The file's own header says "Nothing is edited out"; that
 *     is not literally true, and no parse here may depend on it.
 *
 * THE ANSWER IS TO READ ONE SENTENCE, NOT ONE LINE. Each class's block is
 * joined into a single string with hyphens closed up, and the GRANT SENTENCE is
 * then the text between `Traits table:` (or `Gain the Hit Point Die`) and the
 * first full stop. Every hazard above is a line-level artifact and none of them
 * survives the join.
 *
 * FAILS LOUDLY, and the seed depends on it. A class count other than twelve, a
 * block with no recognisable grant sentence, an armour word outside the four
 * categories, or an entry grant that is NOT A SUBSET of the class's own Core
 * Traits row all throw. Writing twelve plausible wrong rows is the failure this
 * refuses; a mis-parse must fail the seed instead.
 */
import entryGrantsExtract from '../../docs/srd/source/multiclass-entry-grants.txt?raw';
import {
  parseSrdClassTraits,
  SRD_CLASS_NAMES,
  type SrdClassTraits,
} from './class-traits-srd';
import type {
  ArmorCategory,
  MulticlassSkillPool,
  WeaponProficiencyCategory,
} from '../domain/enums';

export class SrdMulticlassEntryError extends Error {
  constructor(message: string) {
    super(`SRD multiclass entry grants: ${message}`);
    this.name = 'SrdMulticlassEntryError';
  }
}

/**
 * The skill a class grants on entry, as a DISCRIMINATED UNION rather than a
 * count-and-pool pair.
 *
 * D25's rule applied to the one place in this change where it bites: the pair
 * `{ count: 0, pool: 'any' }` is representable and meaningless, and a consumer
 * that read the count without the pool would offer a Bard the Ranger's list.
 * With `none` carrying no count at all, a caller that wants a number must first
 * narrow to a pool that has one, and the meaningless pair does not typecheck.
 *
 * The two storage columns reconstitute this exactly, and the CHECK on
 * `class_sheet_traits` is what keeps the round trip honest at the database.
 */
export type SrdMulticlassSkillGrant =
  | { readonly pool: 'none' }
  | {
      /** The Ranger (L116-117) and the Rogue (L128-129): this class's own list. */
      readonly pool: 'class_list';
      readonly count: number;
    }
  | {
      /** The Bard (L37-38): "one skill of your choice", no qualifier. */
      readonly pool: 'any';
      readonly count: number;
    };

export interface SrdMulticlassEntryGrant {
  readonly class_name: string;
  /**
   * True for all twelve, and READ OFF THE SENTENCE rather than asserted. It is
   * the only thing three of them grant (Monk L88-89, Sorcerer L140-141, Wizard
   * L166-167), so a parser that hard-coded `true` would be inventing the one
   * fact those three blocks exist to state.
   *
   * NO DIE SIZE HERE, and that is a sourcing seam worth naming: the entry
   * extract contains no `d4`..`d12` anywhere in its 175 lines. Every clause
   * names the trait "Hit Point Die" and points at the Core Traits table for the
   * size. `class_sheet_traits.hit_die` already holds it, read from
   * `class-core-traits.txt`; nothing here may fill one in.
   */
  readonly hit_die: boolean;
  readonly weapon_categories: readonly WeaponProficiencyCategory[];
  readonly armor_categories: readonly ArmorCategory[];
  readonly skill_choice: SrdMulticlassSkillGrant;
  /**
   * The tool grants, VERBATIM, and DELIBERATELY NOT SEEDED — see the note in
   * `seedClassSheetContent`. Two classes print one: the Bard's "one Musical
   * Instrument of your choice" (L38-39) and the Rogue's "Thieves' Tools"
   * (L129-130).
   *
   * Parsed anyway because the parse is the diff against the extract: dropping
   * them at the PARSE would make the omission invisible, and a later reader
   * could not tell "the source grants no tool" from "we chose not to model it".
   * Dropping them at the SEED, with the reason written there, is D26 applied
   * visibly.
   */
  readonly tool_grants: readonly string[];
}

const SECTION = /^=== (?<className>[A-Za-z]+) \(page line \d+, column \d+\) ===$/;

/**
 * Normalises the non-ASCII code points this extract uses.
 *
 * Same five as `class-core-traits.txt` and for the same reason: the right single
 * quote appears inside `Barbarian’s` and `Thieves’ Tools`, so leaving it would
 * make a comparison fail on a character nobody can see in a diff.
 */
function normalise(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*')
    .replace(/…/g, '...');
}

/**
 * The lines of one `=== Class (page line N, column M) ===` block.
 *
 * The header before the first section — the attribution and the layout note —
 * is discarded because no section is open yet, which is what keeps its own use
 * of the words "proficiencies" and "saving throws" out of every class's text.
 */
function blocks(extract: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const raw of normalise(extract).split('\n')) {
    const section = SECTION.exec(raw.trim())?.groups;
    if (section !== undefined) {
      current = [];
      found.set(section.className as string, current);
      continue;
    }
    current?.push(raw);
  }
  return found;
}

/**
 * One block as ONE STRING, with hyphenated line breaks closed up.
 *
 * `Mar-` + `tial` joins with NO space; anything else joins with one. That is the
 * same rule `class-traits-srd.ts` applies inside a field, lifted to the whole
 * block because here the hazard spans a bullet rather than a table cell.
 *
 * A LEADING `*` IS DROPPED PER LINE rather than used as a separator: two of the
 * twelve blocks have no bullets at all (see the module note), so a bullet is a
 * decoration this parse can survive the absence of.
 */
function joined(lines: readonly string[]): string {
  let text = '';
  for (const raw of lines) {
    const line = raw.trim().replace(/^\*\s*/, '');
    if (line === '') {
      continue;
    }
    if (text === '') {
      text = line;
      continue;
    }
    text = text.endsWith('-') ? `${text.slice(0, -1)}${line}` : `${text} ${line}`;
  }
  return text;
}

/**
 * The GRANT SENTENCE — everything the class's first bullet says it gives.
 *
 * TWO PRINTED SHAPES, and the split is a reliable syntactic tell rather than a
 * guess. Nine classes write "Gain the following traits from the Core X Traits
 * table: <list>."; Monk (L88-89), Sorcerer (L140-141) and Wizard (L166-167)
 * write the singular "Gain the Hit Point Die … from the Core X Traits table.",
 * granting nothing else. Those three are exactly the three the brief's grid
 * shows as hit-die-only, derived here rather than recalled.
 *
 * THE SENTENCE STOPS AT THE FIRST FULL STOP, which is what keeps the SECOND
 * bullet — "Gain the Barbarian's level 1 features…" — out of the grant. That
 * bullet is a feature grant and not a trait grant, and the Cleric block is why
 * a bullet glyph cannot be used to separate them.
 */
function grantSentence(className: string, text: string): string | null {
  const listed = new RegExp(
    `Gain the following traits from the Core ${className} Traits table:\\s*(?<list>[^.]*)\\.`,
  ).exec(text)?.groups;
  if (listed !== undefined) {
    return (listed.list as string).trim();
  }
  const hitDieOnly = new RegExp(
    `Gain the Hit Point Die(?: trait)? from the Core ${className} Traits\\s*table\\.`,
  ).test(text);
  if (hitDieOnly) {
    return HIT_DIE_TRAIT;
  }
  return null;
}

/**
 * The trait's own printed name, and the one string every grant sentence shares.
 *
 * The three hit-die-only classes have no list to read it out of, so their
 * sentence is normalised TO this rather than to the empty string — which keeps
 * `hit_die` a fact derived from the text for all twelve rather than a constant
 * for three of them.
 */
const HIT_DIE_TRAIT = 'Hit Point Die';

/**
 * `training with Light and Medium armor and Shields` -> light, medium, shield.
 *
 * SHIELDS ARE ARMOUR TRAINING ON A GRAMMATICAL READING, matching the schema:
 * the source writes one verb, "training with", governing both "armor" and
 * "Shields". The Barbarian is what makes that load-bearing — L25 is "training
 * with Shields" with NO armour tier at all, so Shields has to be representable
 * independently of any tier, which is exactly what `class_armor_training`
 * already does.
 *
 * SCOPED TO THE `training with …` CLAUSE and not run over the whole sentence,
 * because the Bard's sentence also contains the word "one" and the Rogue's
 * contains "Light armor" after a tool grant. Anchoring on the verb is what keeps
 * the two apart.
 */
function armorTraining(className: string, sentence: string): ArmorCategory[] {
  const clause = /\btraining with\s+(?<clause>[^,]*?)(?:,|$)/.exec(sentence)
    ?.groups;
  if (clause === undefined) {
    return [];
  }
  const text = clause.clause as string;
  const categories: ArmorCategory[] = [];
  if (/\bLight\b/.test(text)) categories.push('light');
  if (/\bMedium\b/.test(text)) categories.push('medium');
  if (/\bHeavy\b/.test(text)) categories.push('heavy');
  if (/\bShields?\b/.test(text)) categories.push('shield');
  if (categories.length === 0) {
    throw new SrdMulticlassEntryError(
      `${className} says "training with ${text}", which names no armour category.`,
    );
  }
  return categories;
}

/**
 * `proficiency with Martial weapons` -> martial.
 *
 * NO CLASS GRANTS SIMPLE WEAPONS ON ENTRY, and this function is written so that
 * fact is DERIVED rather than assumed: it looks for both words, and a future
 * extract that granted Simple would be picked up without an edit. A parser that
 * expanded Martial to Simple+Martial would over-grant all four classes that have
 * a weapon clause here.
 *
 * Anchored on `proficiency with` so the Rogue's "proficiency with Thieves'
 * Tools" cannot be read as a weapon grant, and so the Bard's "proficiency in one
 * skill" — a different preposition in the source — is not scanned at all.
 */
function weaponProficiencies(sentence: string): WeaponProficiencyCategory[] {
  const found: WeaponProficiencyCategory[] = [];
  for (const match of sentence.matchAll(
    /\bproficiency with\s+(?<clause>[^,]*?)(?:,|$)/g,
  )) {
    const clause = match.groups?.clause ?? '';
    if (/\bSimple\b/.test(clause)) found.push('simple');
    if (/\bMartial\b/.test(clause)) found.push('martial');
  }
  return [...new Set(found)];
}

/**
 * `proficiency in one skill of your choice from the Ranger's skill list` ->
 * one skill, this class's list.
 *
 * THE DISCRIMINATOR IS THE PRESENCE OF THE `from the X's skill list` CLAUSE,
 * which is the only textual difference between the Bard's grant and the
 * Ranger's. Both are "one skill of your choice"; only the Ranger and the Rogue
 * qualify it. Reading a count without that clause would make Bard and Ranger
 * the same row.
 *
 * THE COUNT IS READ FROM THE WORD, not defaulted to 1. All three print "one",
 * but a `count` that was always 1 would be this parser asserting a number the
 * source did not have to print.
 *
 * A `Map` AND NOT AN OBJECT LITERAL. The count word comes out of a `\w+` capture
 * and `__proto__` and `constructor` are both `\w+`, so an object lookup returns
 * an inherited MEMBER rather than `undefined` for either — and the unknown-word
 * throw below, which is what stops an unparsed number reaching an integer
 * column, would be walked straight past with a function as the `count`. A `Map`
 * has no inherited keys.
 */
const SKILL_COUNT_WORDS: ReadonlyMap<string, number> = new Map([
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
]);

function skillChoice(
  className: string,
  sentence: string,
): SrdMulticlassSkillGrant {
  const match =
    /\bproficiency in\s+(?<count>\w+)\s+skills?\s+of your choice(?<qualifier>\s+from the [^,]*?skill list)?(?:,|$)/.exec(
      sentence,
    )?.groups;
  if (match === undefined) {
    if (/\bproficiency in\b/.test(sentence)) {
      throw new SrdMulticlassEntryError(
        `${className} has a "proficiency in" clause this parser does not recognise: ${JSON.stringify(sentence)}.`,
      );
    }
    return { pool: 'none' };
  }
  const word = (match.count as string).toLowerCase();
  const count = SKILL_COUNT_WORDS.get(word);
  if (count === undefined) {
    throw new SrdMulticlassEntryError(
      `${className} grants "${word}" skills, which is not a number word this parser holds.`,
    );
  }
  return match.qualifier === undefined
    ? { pool: 'any', count }
    : { pool: 'class_list', count };
}

/**
 * The tool grants, verbatim. Parsed and then dropped at the seed — see
 * `SrdMulticlassEntryGrant.tool_grants`.
 */
function toolGrants(sentence: string): string[] {
  const found: string[] = [];
  for (const match of sentence.matchAll(
    /\bproficiency with\s+(?<clause>[^,]*?)(?:,|$)/g,
  )) {
    const clause = (match.groups?.clause ?? '').trim();
    if (/\bweapons?\b/.test(clause)) {
      continue;
    }
    found.push(clause);
  }
  return found;
}

/**
 * Parses `docs/srd/source/multiclass-entry-grants.txt` and CHECKS IT AGAINST
 * `class-core-traits.txt`.
 *
 * THE SUBSET CHECK IS PART OF THE PARSE, NOT A TEST, and that is deliberate. The
 * whole justification for storing the entry grant as a per-row FLAG is that the
 * entry set is a subset of the initial set; an entry grant naming a category the
 * class's own Core Traits row does not have would have NO ROW TO FLAG, so the
 * seed would silently drop it. Failing here is what makes the storage shape
 * safe rather than merely convenient.
 *
 * IT IS NOT A *PROPER* SUBSET FOR HALF THE TABLE, and the check does not demand
 * one. Bard, Cleric, Druid, Ranger, Rogue and Warlock grant on entry exactly the
 * armour training their Core Traits row grants; six of twelve entry armour sets
 * EQUAL their initial set. Asserting properness would fail on correct content.
 *
 * THE `class_list` POOL IS CHECKED THE SAME WAY: a class whose entry grant says
 * "from the X's skill list" must actually HAVE `class_skill_options` rows to
 * draw from, which SQLite cannot express as a CHECK across tables. Ranger and
 * Rogue both do; the Bard, which does not, is `any` and is exempt by
 * construction rather than by exception.
 *
 * @param traits the Core Traits parse to check the subset against. Injectable so
 *   a test can prove the check BITES without editing an extract on disk.
 */
export function parseSrdMulticlassEntryGrants(
  extract: string = entryGrantsExtract,
  traits: readonly SrdClassTraits[] = parseSrdClassTraits(),
): SrdMulticlassEntryGrant[] {
  const found = blocks(extract);
  const names = [...found.keys()];
  const expected = [...SRD_CLASS_NAMES];
  if (
    names.length !== expected.length ||
    names.some((name) => !expected.includes(name as never))
  ) {
    throw new SrdMulticlassEntryError(
      `expected the twelve classes ${expected.join(', ')}, found ${String(names.length)}: ${names.join(', ')}.`,
    );
  }

  const byName = new Map(traits.map((entry) => [entry.class_name, entry]));

  return expected.map((className): SrdMulticlassEntryGrant => {
    const text = joined(found.get(className) as string[]);
    const sentence = grantSentence(className, text);
    if (sentence === null) {
      throw new SrdMulticlassEntryError(
        `${className} block has no recognisable "As a Multiclass Character" grant sentence.`,
      );
    }

    if (!sentence.includes(HIT_DIE_TRAIT)) {
      throw new SrdMulticlassEntryError(
        `${className} grants ${JSON.stringify(sentence)} on multiclass entry, ` +
          `which does not include the ${HIT_DIE_TRAIT}. All twelve printed ` +
          'clauses do; a class that does not is a parse this cannot vouch for.',
      );
    }

    const grant: SrdMulticlassEntryGrant = {
      class_name: className,
      hit_die: true,
      weapon_categories: weaponProficiencies(sentence),
      armor_categories: armorTraining(className, sentence),
      skill_choice: skillChoice(className, sentence),
      tool_grants: toolGrants(sentence),
    };

    const initial = byName.get(className);
    if (initial === undefined) {
      throw new SrdMulticlassEntryError(
        `${className} has an entry clause but no Core Traits block to check it against.`,
      );
    }
    assertSubset(grant, initial);
    return grant;
  });
}

/** Throws unless every entry grant has a row on the class's Core Traits list. */
function assertSubset(
  grant: SrdMulticlassEntryGrant,
  initial: SrdClassTraits,
): void {
  for (const category of grant.armor_categories) {
    if (!initial.armor_training.includes(category)) {
      throw new SrdMulticlassEntryError(
        `${grant.class_name} grants ${category} armour training on multiclass ` +
          'entry, but its Core Traits table does not train it at all. The entry ' +
          'grant must be a subset of the initial grant; there is no row to flag.',
      );
    }
  }
  for (const category of grant.weapon_categories) {
    if (
      !initial.weapon_proficiencies.some((entry) => entry.category === category)
    ) {
      throw new SrdMulticlassEntryError(
        `${grant.class_name} grants ${category} weapon proficiency on multiclass ` +
          'entry, but its Core Traits table does not grant it at all. The entry ' +
          'grant must be a subset of the initial grant; there is no row to flag.',
      );
    }
  }
  if (
    grant.skill_choice.pool === 'class_list' &&
    initial.skill_options.length === 0
  ) {
    throw new SrdMulticlassEntryError(
      `${grant.class_name} grants a skill from its own list on multiclass entry, ` +
        'but its Core Traits table prints no skill list to draw from.',
    );
  }
}

/**
 * The two storage columns for a parsed skill grant.
 *
 * ONE PLACE where the union becomes a pair, so the seeder and any test agree by
 * construction. The reverse direction lives in `src/rules/sheet-content-lookup`
 * consumers, which read the pair back.
 */
export function multiclassSkillColumns(grant: SrdMulticlassSkillGrant): {
  readonly pool: MulticlassSkillPool;
  readonly count: number;
} {
  switch (grant.pool) {
    case 'none':
      return { pool: 'none', count: 0 };
    case 'class_list':
      return { pool: 'class_list', count: grant.count };
    case 'any':
      return { pool: 'any', count: grant.count };
  }
}
