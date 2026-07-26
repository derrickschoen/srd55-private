/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE TWO EXTRA ATTACK GRANTS THAT ARE NOT CLASS TABLE ROWS.
 *
 * `docs/srd/source/extra-attack-other-sources.txt` carries Thirsting Blade and
 * Devouring Blade, and D19 §2 says why they matter more than the owner's
 * subclass example: they are content this project may legitimately BUNDLE, and
 * `class_extra_attack_grants` cannot hold either of them. The first is granted
 * by an invocation rather than by a class table and reaches ONE WEAPON ONLY;
 * the second UPGRADES the first rather than adding to it.
 *
 * PARSED, NOT TRANSCRIBED, for the reason `class-traits-srd.ts` gives: a parse
 * is diffable against the extract, and a value that is not in the extract
 * cannot reach the database. Every number below is produced by matching a
 * printed sentence.
 *
 * THE COLUMN PROBLEM IS HERE TOO, AND IT IS WORSE IN ONE PLACE. The extract was
 * sliced by character at the column boundary, so Devouring Blade's block
 * carries the FACING column's bleed on the left of every line:
 *
 *     an't    Devouring Blade
 *     st.     Prerequisite: Level 12+ Warlock, Thirsting Blade
 *             Invocation
 *
 * A `trim()`-per-line parser reads `an't    Devouring Blade` as the title. So
 * each block's left edge is located from its own title line — the heading above
 * it names the feature, and the title is the last occurrence of that name on
 * the line — and only text at or right of that edge is read. That is correct
 * for a block with bleed and for one without, without needing to know which.
 *
 * AND A SECOND HAZARD THE BLEED CREATES: Devouring Blade's paragraph is
 * followed IMMEDIATELY, with no blank line, by the next invocation's title and
 * first sentence:
 *
 *             confers two extra attacks rather than one.
 *             Eldritch Mind
 *             You have Advantage on Constitution saving throws
 *
 * A blank-line paragraph terminator therefore swallows a feature that is not
 * being parsed at all. The terminator used instead is the first line ENDING in
 * a full stop, which is measured against both blocks: Thirsting Blade's
 * paragraph is four lines and only its last ends in one, Devouring Blade's is
 * two and likewise. A block whose paragraph never terminates throws.
 *
 * FAILS LOUDLY, EVERYWHERE. A missing prerequisite, an unparseable level, a
 * paragraph with no granting sentence, a scope that cannot be resolved, or a
 * feature count other than the two the extract prints all throw. Skipping the
 * unrecognised would turn an extraction change into a character silently losing
 * an attack.
 */
import extract from '../../docs/srd/source/extra-attack-other-sources.txt?raw';
import type {
  ExtraAttackWeaponScope,
  RulesEdition,
} from '../domain/enums';

export class SrdNamedFeatureError extends Error {
  constructor(message: string) {
    super(`SRD named features: ${message}`);
    this.name = 'SrdNamedFeatureError';
  }
}

/**
 * The edition these two features are printed under.
 *
 * Its own constant rather than an import of `BUNDLED_ARMOR_RULES_EDITION`: the
 * two happen to be equal and are not the same fact, and binding them would make
 * a future extract of a different edition move the armour catalog with it.
 */
export const BUNDLED_FEATURE_RULES_EDITION: RulesEdition = '2024';

/** One parsed named feature, ready for `named_features` unchanged. */
export interface SrdNamedFeature {
  readonly content_key: string;
  readonly name: string;
  /** The class whose LEVEL the prerequisite counts. */
  readonly class_name: string;
  /** The level in that class at which the prerequisite is met. */
  readonly class_level: number;
  /** The printed Prerequisite line, verbatim and unabridged. */
  readonly prerequisite: string;
  /** The printed paragraph, re-joined into one line. */
  readonly description: string;
  /** TOTAL attacks on the Attack action, absolute — never extra attacks. */
  readonly attack_count: number;
  readonly weapon_scope: ExtraAttackWeaponScope;
}

/**
 * The extract prints two invocations, and a parse finding another number means
 * the extract moved under this parser.
 *
 * Pinned for the same reason `class-traits-srd.ts` pins twelve classes: without
 * it, a renamed heading produces a SHORTER catalog rather than an error, and a
 * character who should have three attacks quietly gets two.
 */
const EXPECTED_FEATURE_COUNT = 2;

/** `=== Thirsting Blade (Eldritch Invocation) ===` and nothing else. */
const FEATURE_HEADING =
  /^=== (?<name>.+?) \(Eldritch Invocation\) ===\s*$/;
/** Any `===` heading at all, including the ones that are not features. */
const ANY_HEADING = /^===/;

const PREREQUISITE = /^Prerequisite:\s*(?<text>\S.*)$/;
/** `Level 5+ Warlock` — the machine-readable half of a prerequisite line. */
const PREREQUISITE_LEVEL = /Level (?<level>\d{1,2})\+ (?<className>[A-Za-z]+)/;

/**
 * WHAT A GRANTING SENTENCE SAYS THE TOTAL IS.
 *
 * TRANSCRIBED, THEN THE SOURCE'S OWN ARITHMETIC — and the difference from
 * `ATTACK_FEATURES` in `class-traits-srd.ts` is worth stating rather than
 * glossing, because that table is pure transcription and this one is not.
 *
 *  - Thirsting Blade prints a TOTAL in its own words: "you can attack TWICE
 *    with the weapon instead of ONCE". Two. Nothing is computed.
 *  - Devouring Blade prints no total. It replaces a QUANTITY: "confers two
 *    extra attacks rather than one". The quantity being replaced — one extra
 *    attack — is exactly what Thirsting Blade's sentence prints as the
 *    difference between "twice" and "once", so the baseline of one attack is in
 *    the extract too, and one plus two is three. Every term in that sum is a
 *    printed word; none is recalled. Reading 3 out of the NAME "Devouring
 *    Blade" would have been the fabrication both parsers exist to refuse.
 *
 * `docs/srd/source/attack-class-features.txt` independently licenses a total
 * above two: "You can't make more than two attacks with this feature unless you
 * have a feature that says you can." Devouring Blade is such a feature.
 */
const GRANT_SENTENCES: readonly (readonly [string, number])[] = [
  ['attack twice with the weapon instead of once', 2],
  ['confers two extra attacks rather than one', 3],
];

/**
 * WHAT A SENTENCE SAYS ABOUT WHICH WEAPONS THE GRANT REACHES.
 *
 * Only one phrase states a scope outright — Thirsting Blade's "for your pact
 * weapon only". Devouring Blade states none, and inventing `any_weapon` as a
 * default for it would silently WIDEN a one-weapon grant to every weapon the
 * character holds, which is the exact wrong answer D19 §3 names. Its scope is
 * instead INHERITED, and by a relation the sentence itself states: "The Extra
 * Attack of your Thirsting Blade invocation confers…" modifies another parsed
 * feature's grant, so it takes that feature's scope. See `inheritScope`.
 */
const SCOPE_SENTENCES: readonly (readonly [string, ExtraAttackWeaponScope])[] = [
  ['for your pact weapon only', 'one_bonded_weapon'],
];

/** `of your Thirsting Blade invocation` — a grant that modifies another. */
const MODIFIES = /of your (?<name>.+?) invocation/;

function normalise(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/** `Thirsting Blade` -> `thirsting-blade`. */
function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** The raw lines of each `(Eldritch Invocation)` block, keyed by feature name. */
function featureBlocks(text: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  let name: string | null = null;
  let lines: string[] = [];

  const flush = (): void => {
    if (name !== null) {
      found.set(name, lines);
    }
    name = null;
    lines = [];
  };

  for (const line of normalise(text).split('\n')) {
    const heading = FEATURE_HEADING.exec(line)?.groups;
    if (heading !== undefined) {
      flush();
      name = heading.name as string;
      continue;
    }
    // Any other `===` heading ENDS the block. The extract's third heading is
    // the multiclassing rule, which is prose about these features rather than
    // one of them, and reading it as a block would look for a Prerequisite line
    // it does not have.
    if (ANY_HEADING.test(line)) {
      flush();
      continue;
    }
    if (name !== null) {
      lines.push(line);
    }
  }
  flush();
  return found;
}

/**
 * The block's own left edge, taken from its title line.
 *
 * The title is the LAST occurrence of the feature's name on the line, because
 * the facing column's bleed sits to its left and can itself contain letters.
 */
function columnEdge(name: string, lines: readonly string[]): number {
  for (const line of lines) {
    if (line.trimEnd().endsWith(name)) {
      return line.lastIndexOf(name);
    }
  }
  throw new SrdNamedFeatureError(
    `${name} has no title line inside its own block.`,
  );
}

interface ParsedBlock {
  readonly name: string;
  readonly class_name: string;
  readonly class_level: number;
  readonly prerequisite: string;
  readonly description: string;
  readonly attack_count: number;
  /** `null` when the block states no scope of its own; resolved afterwards. */
  readonly weapon_scope: ExtraAttackWeaponScope | null;
}

/**
 * The ONE entry of a sentence table this paragraph matches, or `undefined`.
 *
 * TWO MATCHES IS AN ERROR AND NOT A PRECEDENCE RULE. Every other failure in
 * this parser is loud — a missing prerequisite, an unparseable level, an
 * unterminated paragraph, an unresolvable scope, the wrong block count all
 * throw — and array order was the single quiet exception: `find` would have
 * taken the earlier table entry and read a total or a scope out of a paragraph
 * that states two, which is exactly the re-extract that silently gives a
 * character the wrong number of attacks. Table ORDER is not a source and must
 * not become one.
 *
 * BOTH TABLES GO THROUGH THIS, which is the point of it being generic.
 * `SCOPE_SENTENCES` has one entry today and so cannot itself produce two
 * matches; routing it through the same function means the guard arrives with
 * the second entry rather than having to be remembered then.
 */
function soleMatch<T>(
  name: string,
  what: string,
  table: readonly (readonly [string, T])[],
  description: string,
): readonly [string, T] | undefined {
  const matched = table.filter(([sentence]) => description.includes(sentence));
  if (matched.length > 1) {
    throw new SrdNamedFeatureError(
      `${name} paragraph states ${String(matched.length)} ${what} sentences ` +
        `this parser recognises, and only one can be right: "${description}"`,
    );
  }
  return matched[0];
}

function parseBlock(name: string, raw: readonly string[]): ParsedBlock {
  const edge = columnEdge(name, raw);
  const lines = raw.map((line) =>
    line.length > edge ? line.slice(edge).trimEnd() : '',
  );

  const prerequisiteIndex = lines.findIndex((line) => PREREQUISITE.test(line));
  if (prerequisiteIndex === -1) {
    throw new SrdNamedFeatureError(`${name} block has no Prerequisite line.`);
  }
  const prerequisite = (
    PREREQUISITE.exec(lines[prerequisiteIndex] as string)?.groups as {
      text: string;
    }
  ).text;

  const level = PREREQUISITE_LEVEL.exec(prerequisite)?.groups;
  if (level === undefined) {
    throw new SrdNamedFeatureError(
      `${name} prerequisite "${prerequisite}" names no class level.`,
    );
  }
  const classLevel = Number(level.level);
  if (classLevel < 1 || classLevel > 20) {
    throw new SrdNamedFeatureError(
      `${name} has out-of-range prerequisite level ${String(classLevel)}.`,
    );
  }

  const description = paragraphAfterPrerequisite(
    name,
    lines.slice(prerequisiteIndex + 1),
  );

  const grant = soleMatch(name, 'attack total', GRANT_SENTENCES, description);
  if (grant === undefined) {
    throw new SrdNamedFeatureError(
      `${name} paragraph states no attack total this parser recognises: ` +
        `"${description}"`,
    );
  }

  const scope = soleMatch(name, 'weapon scope', SCOPE_SENTENCES, description);

  return {
    name,
    class_name: level.className as string,
    class_level: classLevel,
    prerequisite,
    description,
    attack_count: grant[1],
    weapon_scope: scope?.[1] ?? null,
  };
}

/**
 * The printed paragraph, from after the Prerequisite line to the first full
 * stop at end of line.
 *
 * The single-word ITEM TYPE line ("Invocation") sits between the two and is
 * required rather than skipped-if-present: it is the marker that the layout is
 * the one this parser measured, and a block that has lost it has been
 * re-extracted into a shape whose paragraph boundaries are unverified.
 */
function paragraphAfterPrerequisite(
  name: string,
  lines: readonly string[],
): string {
  let index = 0;
  const skipBlank = (): void => {
    while (index < lines.length && lines[index] === '') {
      index += 1;
    }
  };

  skipBlank();
  const typeLine = lines[index];
  if (typeLine === undefined || /\s/.test(typeLine)) {
    throw new SrdNamedFeatureError(
      `${name} has no single-word item type line after its prerequisite.`,
    );
  }
  index += 1;
  skipBlank();

  const paragraph: string[] = [];
  for (; index < lines.length; index += 1) {
    const line = lines[index] as string;
    if (line === '') {
      throw new SrdNamedFeatureError(
        `${name} paragraph ends at a blank line without a full stop.`,
      );
    }
    paragraph.push(line);
    if (line.endsWith('.')) {
      return paragraph.join(' ');
    }
  }
  throw new SrdNamedFeatureError(
    `${name} paragraph runs to the end of its block without a full stop.`,
  );
}

/**
 * A block that states no scope takes the scope of the feature its own sentence
 * says it modifies.
 *
 * NOT A DEFAULT AND NOT A GUESS: the target is named in the text, is itself a
 * parsed feature of this extract, and must already have a scope of its own.
 * Anything else throws, so a re-extract that drops Thirsting Blade cannot leave
 * Devouring Blade silently applying to every weapon a character owns.
 */
function inheritScope(
  block: ParsedBlock,
  parsed: ReadonlyMap<string, ParsedBlock>,
): ExtraAttackWeaponScope {
  if (block.weapon_scope !== null) {
    return block.weapon_scope;
  }
  const modified = MODIFIES.exec(block.description)?.groups;
  if (modified === undefined) {
    throw new SrdNamedFeatureError(
      `${block.name} states no weapon scope and modifies no other feature.`,
    );
  }
  const target = parsed.get(modified.name as string);
  if (target === undefined || target.weapon_scope === null) {
    throw new SrdNamedFeatureError(
      `${block.name} modifies "${String(modified.name)}", which is not a ` +
        'parsed feature with a weapon scope of its own.',
    );
  }
  return target.weapon_scope;
}

/**
 * Every named Extra Attack grant the extract prints.
 *
 * ORDERED BY PREREQUISITE LEVEL, so the upgrade follows what it upgrades. The
 * ORDER IS COSMETIC AND THE MODEL DOES NOT DEPEND ON IT: `attack_count` is an
 * absolute total and the combinator over grants is `max`, so Devouring Blade's
 * 3 replaces Thirsting Blade's 2 whichever order they are read in. That is why
 * no "upgrades" relation is stored — see `src/rules/extra-attack.ts`.
 */
export function parseSrdNamedExtraAttackFeatures(
  source: string = extract,
): SrdNamedFeature[] {
  const blocks = featureBlocks(source);
  const parsed = new Map<string, ParsedBlock>();
  for (const [name, lines] of blocks) {
    parsed.set(name, parseBlock(name, lines));
  }

  if (parsed.size !== EXPECTED_FEATURE_COUNT) {
    throw new SrdNamedFeatureError(
      `expected ${String(EXPECTED_FEATURE_COUNT)} invocation blocks, found ` +
        `${String(parsed.size)}.`,
    );
  }

  return [...parsed.values()]
    .map(
      (block): SrdNamedFeature => ({
        content_key: `${BUNDLED_FEATURE_RULES_EDITION}:feature:${slug(block.name)}`,
        name: block.name,
        class_name: block.class_name,
        class_level: block.class_level,
        prerequisite: block.prerequisite,
        description: block.description,
        attack_count: block.attack_count,
        weapon_scope: inheritScope(block, parsed),
      }),
    )
    .sort((a, b) => a.class_level - b.class_level);
}
