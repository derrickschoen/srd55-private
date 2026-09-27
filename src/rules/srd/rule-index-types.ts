/**
 * THE SHAPE OF ONE SRD 5.2.1 RULE UNIT (owner D918: the "represented"
 * definition is binding; synthesis .tmp/runs/srd-typed/synthesis/report.md §5).
 *
 * A RULE UNIT is one printed thing a later unit can type, execute, refuse or
 * exclude as a whole. `scripts/srd/rule-index.ts` enumerates them from the SRD
 * text and writes `generated/rule-index.ts`; nothing here is hand-listed. The
 * kinds, and what counts as one unit of each, are:
 *
 * - `rule_section`: a Contents entry of a rules chapter (Playing the Game,
 *   Character Creation, the chapter intros, Equipment, the Spells chapter
 *   rules, Rules Glossary, Gameplay Toolbox, Magic Items rules, Monsters
 *   rules). Its span is its own text up to the next indexed heading.
 * - `glossary`, `condition`, `action`, `area_of_effect`, `attitude`, `hazard`:
 *   one Rules Glossary entry each. The bracket tag decides the kind; an entry
 *   with no tag is `glossary`. Each entry is exactly one unit (a condition is
 *   not a second glossary unit).
 * - `class`: a class chapter heading. `class_feature`: one `Level N: Name`
 *   heading in that class's feature list. The level is part of the identity
 *   because the SRD prints the same name at two levels as two rules (Barbarian
 *   Improved Brutal Strike at 13 and at 17).
 * - `subclass` / `subclass_feature`: the same for the one SRD subclass of each
 *   class.
 * - `class_option`: one Metamagic option or one Eldritch Invocation.
 * - `spell_list`: one class spell list.
 * - `species`, `species_trait`, `background`, `feat`: one each as printed.
 * - `weapon`, `armor`: one table row. `weapon_property`, `weapon_mastery`,
 *   `tool`, `adventuring_gear`: one description each.
 * - `spell`: one Spell Descriptions entry.
 * - `stat_block`: one stat block, wherever it is printed (the Monsters and
 *   Animals chapters, a spell, or a magic item).
 * - `magic_item`: one Magic Items A–Z entry.
 * - `environmental_effect`, `trap`, `poison`, `magical_contagion`: one Gameplay
 *   Toolbox entry each.
 *
 * NOT units, deliberately: a table ROW other than weapons and armour (a CR row,
 * a travel-terrain row, a trinket), a clause inside a rule (that is a
 * `SubRuleId`, owned by the unit that types the rule's clause tuple), and a
 * sub-heading below the Contents level inside a rule section (it is inside that
 * section's span).
 */
export const SRD_RULE_KINDS = [
  'rule_section',
  'glossary',
  'condition',
  'action',
  'area_of_effect',
  'attitude',
  'hazard',
  'class',
  'class_feature',
  'subclass',
  'subclass_feature',
  'class_option',
  'spell_list',
  'species',
  'species_trait',
  'background',
  'feat',
  'weapon',
  'armor',
  'weapon_property',
  'weapon_mastery',
  'tool',
  'adventuring_gear',
  'spell',
  'stat_block',
  'magic_item',
  'environmental_effect',
  'trap',
  'poison',
  'magical_contagion',
] as const;
export type SrdRuleKind = (typeof SRD_RULE_KINDS)[number];

/** The column of a two-column printed page a span's lines are read from. */
export type SrdColumn = 'left' | 'right';

/**
 * WHERE A RULE IS PRINTED: an inclusive line range of a committed SRD corpus.
 *
 * - A curated extract under `docs/srd/source/` is single-column, so a line range
 *   is exact.
 * - The complete text `docs/srd/full/srd-5.2.1.txt` is `pdftotext -layout`
 *   output, and a two-column page interleaves its columns on each line. A span
 *   there names the column it reads (`@left` or `@right`); a span with no
 *   column is a page printed as one column or a full-width table.
 *
 * A rule that continues into the other column or onto the next page has one
 * span per piece, in reading order (`SrdRuleIndexEntry.spans`).
 */
export type SrdSpan =
  | `docs/srd/source/${string}.txt:${number}-${number}`
  | `docs/srd/full/srd-5.2.1.txt:${number}-${number}`
  | `docs/srd/full/srd-5.2.1.txt:${number}-${number}@${SrdColumn}`;

/** One row of the generated index. The row's key is its `SrdRuleId`. */
export interface SrdRuleIndexEntry {
  readonly kind: SrdRuleKind;
  /** The printed name, without a glossary tag or a printed price. */
  readonly name: string;
  /** Where it is printed, in reading order. Never empty. */
  readonly spans: readonly [SrdSpan, ...SrdSpan[]];
  /**
   * The unit it is printed inside, when it has one: a class feature's class, a
   * trait's species, a stat block's spell or magic item. `rule-index.ts` checks
   * at compile time that every parent is itself an id.
   */
  readonly parent?: string;
}
