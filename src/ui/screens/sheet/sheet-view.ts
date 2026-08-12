import { freeTextSpan } from '../../free-text';
import { BUILD_ID } from '../../../build-id';
import { levelUpPath } from '../../../builder/level-up-wizard';
import type {
  CharacterSheet,
  SheetAbilityScore,
  SheetArmorClassFormula,
} from '../../../queries/character-sheet-builder';
import type {
  CharacterSpellSection,
  SheetSpell,
  SheetSpellbookEntry,
  SheetSpellGroup,
  SheetSpellReference,
  SheetSpellcastingStatistic,
} from '../../../queries/character-spell-section-builder';
import type {
  ArmorClassExclusionReason,
  ArmorClassSourceCategory,
  SheetResourceComputation,
  SheetResourceKind,
  SheetResourceMaximum,
} from '../../../rules/sheet';
import type { WeaponProficiencyVerdict } from '../../../rules/multiclass-proficiency';
import { SRD_ATTRIBUTION_NOTICE } from '../../../rules/srd-attribution';
import {
  catalogLayerLabel,
  type CatalogLayerDisclosure,
} from '../../../catalog/catalog-disclosure';
import {
  classFormulaResourceKinds,
  classFormulaResourceLabel,
  classResourceKinds,
  classResourceLabel,
  type ClassFormulaResourceKind,
  type ClassResourceKind,
} from '../../../domain/class-resources';
import type { SheetFeatureValue } from '../../../rules/sheet-feature-values';

export interface SheetHeaderRouteAction {
  readonly label: 'All characters' | 'Level Up' | 'Open planner';
  readonly href: string;
  readonly className: 'button-primary sheet-chrome' | 'button-secondary sheet-chrome';
}

export function sheetHeaderRouteActions(
  characterId: number,
): readonly SheetHeaderRouteAction[] {
  return [
    {
      label: 'All characters',
      href: '/',
      className: 'button-secondary sheet-chrome',
    },
    {
      label: 'Level Up',
      href: levelUpPath(characterId),
      className: 'button-primary sheet-chrome',
    },
    {
      label: 'Open planner',
      href: `/characters/${String(characterId)}`,
      className: 'button-secondary sheet-chrome',
    },
  ];
}

/**
 * THE CHARACTER SHEET, PROJECTED ONCE AND RENDERED TWICE.
 *
 * 1. {@link sheetSections} — the readable form, as labelled rows;
 * 2. {@link sheetFacts} — the same facts as a JSON object.
 *
 * `renderSheet` turns the FIRST into the page and drops the SECOND into a
 * `<script type="application/json">` beside it. Both are pure functions of one
 * `CharacterSheet`, which is what lets `tests/unit/ui/sheet-view.test.ts` pin
 * every field of the JSON to a labelled row of the readable form WITHOUT A DOM
 * — the arrangement `agent-reference.ts` established, and the reason this is
 * shaped this way rather than as one render function that happens to emit both.
 *
 * THE D20 LESSON IS WHY THAT MATTERS. That defect was one screen building two
 * lists independently, and the test covering it could not fail because both
 * lists were read from the same place the code wrote them. Two projections of
 * one input, compared against each other, is the shape that can fail.
 *
 * D4, ON THE SAME STRICT TERMS AS `agent-reference-panel.ts`: both forms are in
 * the ordinary document, neither is hidden from a person, nothing here is
 * `display: none`, off-screen or transparent, and nothing addresses a reader in
 * the imperative. The JSON states FACTS about this character and gives no
 * instructions.
 *
 * FREE TEXT NEVER ENTERS THE JSON. A character name, a class name, an armour
 * name and an adjustment note can all arrive from a stranger's share link. They
 * are marked `free_text` in the readable projection — where `renderSheet` gives
 * them the `unverified-origin` provenance marker — and are omitted from the
 * structured form entirely. An enum-checked value may cross that boundary; a
 * user-typed string may not.
 */

export const SHEET_JSON_SCRIPT_ID = 'character-sheet-facts';

export const FLAVOR_PRINT_CODE_POINT_LIMIT = 400;
export const FLAVOR_APPENDIX_ORDER = 100;
export const SPELL_APPENDIX_ORDER = 200;
export const SPELL_APPENDIX_SPLIT_CODE_POINT_THRESHOLD = 2_000;
export const SHEET_PRINT_APPENDIX_CLASS = 'sheet-print-appendix';
export const SHEET_PRINT_APPENDIX_PROSE_CLASS =
  'sheet-print-appendix-prose';
export const MISSING_SPELL_TEXT_DISCLOSURE =
  'Full spell text unavailable for this imported or placeholder spell.';

export interface FlavorAppendixContent {
  readonly id: 'flavor';
  readonly order: number;
  readonly title: string;
  readonly entries: readonly {
    readonly id: 'backstory' | 'notes';
    readonly label: string;
    readonly text: string;
  }[];
}

export interface SpellAppendixFact {
  readonly label: string;
  readonly value: string;
}

export type SpellAppendixDescription =
  | { readonly status: 'recorded'; readonly text: string }
  | { readonly status: 'absent'; readonly disclosure: string };

export interface SpellAppendixCardContent {
  readonly spell_version_id: SheetSpellbookEntry['spell_version_id'];
  readonly name: string;
  readonly catalog_layer: SheetSpellbookEntry['catalog_layer'];
  readonly level: string;
  readonly school: string;
  readonly edition_marker: string | null;
  readonly facts: readonly SpellAppendixFact[];
  readonly supplemental: readonly SpellAppendixFact[];
  readonly description: SpellAppendixDescription;
  readonly pagination: 'keep_together' | 'split_prose';
}

export interface SpellAppendixContent {
  readonly id: 'spells';
  readonly order: number;
  readonly title: 'Full spell text';
  readonly text_status: 'partial' | 'unavailable' | 'available';
  readonly groups: readonly {
    readonly id: string;
    readonly name: string;
    readonly catalog_layer: CatalogLayerDisclosure;
    readonly cards: readonly SpellAppendixCardContent[];
  }[];
  readonly missing_spell_names: readonly string[];
}

export interface SheetPrintAppendixRegistration {
  readonly id: string;
  readonly order: number;
  readonly element: HTMLElement;
}

export interface FlavorPrintProjection {
  readonly text: string;
  readonly total_code_points: number;
  readonly printed_code_points: number;
  readonly continuation: string | null;
}

function presentFlavorText(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

/** Pure, code-point-aware projection used by the transient print DOM. */
export function flavorPrintProjection(value: string): FlavorPrintProjection {
  const codePoints = [...value];
  if (codePoints.length <= FLAVOR_PRINT_CODE_POINT_LIMIT) {
    return {
      text: value,
      total_code_points: codePoints.length,
      printed_code_points: codePoints.length,
      continuation: null,
    };
  }
  return {
    text: codePoints.slice(0, FLAVOR_PRINT_CODE_POINT_LIMIT).join(''),
    total_code_points: codePoints.length,
    printed_code_points: FLAVOR_PRINT_CODE_POINT_LIMIT,
    continuation:
      `Text cut for the main sheet: the first ${String(FLAVOR_PRINT_CODE_POINT_LIMIT)} ` +
      `of ${String(codePoints.length)} code points are printed here. The full ` +
      'written-text appendix option prints the rest.',
  };
}

/** Pure appendix factory: stored text enters unchanged and no DOM is required. */
export function flavorAppendix(
  sheet: CharacterSheet,
): FlavorAppendixContent | null {
  const entries: FlavorAppendixContent['entries'][number][] = [];
  if (presentFlavorText(sheet.flavor.backstory)) {
    entries.push({
      id: 'backstory',
      label: 'Backstory',
      text: sheet.flavor.backstory,
    });
  }
  if (presentFlavorText(sheet.flavor.notes)) {
    entries.push({ id: 'notes', label: 'Notes', text: sheet.flavor.notes });
  }
  return entries.length === 0
    ? null
    : {
        id: 'flavor',
        order: FLAVOR_APPENDIX_ORDER,
        title: 'Full character written text',
        entries,
      };
}

function recordedSpellFact(
  facts: SpellAppendixFact[],
  label: string,
  value: string | null,
): void {
  if (value !== null) {
    facts.push({ label, value });
  }
}

function spellProgressionFact(
  label: 'Upcast' | 'Cantrip upgrades',
  unit: 'Spell levels' | 'Character levels',
  levels: readonly number[],
  summary: string | null,
): SpellAppendixFact | null {
  if (levels.length === 0 && summary === null) {
    return null;
  }
  const parts: string[] = [];
  if (levels.length > 0) {
    parts.push(`${unit} ${levels.map(String).join(', ')}`);
  }
  if (summary !== null) {
    parts.push(summary);
  }
  return { label, value: parts.join(' — ') };
}

function spellEditionMarker(
  edition: SheetSpellReference['edition'],
): string | null {
  switch (edition) {
    case '2014':
      return '2014 rules';
    case '2024':
      return null;
    case 'expanded':
      return 'Expanded rules';
  }
  const unhandled: never = edition;
  return unhandled;
}

function spellAppendixCard(
  spell: SheetSpellbookEntry,
): SpellAppendixCardContent {
  const facts: SpellAppendixFact[] = [];
  recordedSpellFact(facts, 'Casting time', spell.reference.casting_time);
  recordedSpellFact(facts, 'Action type', spell.reference.action_type);
  recordedSpellFact(facts, 'Range', spell.reference.range);
  recordedSpellFact(facts, 'Duration', spell.reference.duration);
  recordedSpellFact(facts, 'Components', spell.reference.components);
  facts.push(
    {
      label: 'Concentration',
      value: spell.reference.concentration ? 'Yes' : 'No',
    },
    { label: 'Ritual', value: spell.reference.ritual ? 'Yes' : 'No' },
  );

  const supplemental: SpellAppendixFact[] = [];
  const upcast = spellProgressionFact(
    'Upcast',
    'Spell levels',
    spell.reference.upcast_levels,
    spell.reference.upcast_summary,
  );
  if (upcast !== null) {
    supplemental.push(upcast);
  }
  const cantripUpgrades = spellProgressionFact(
    'Cantrip upgrades',
    'Character levels',
    spell.reference.cantrip_upgrade_levels,
    spell.reference.cantrip_upgrade_summary,
  );
  if (cantripUpgrades !== null) {
    supplemental.push(cantripUpgrades);
  }
  if (spell.reference.attack_modes.length > 0) {
    supplemental.push({
      label: 'Attack modes',
      value: spell.reference.attack_modes.join(', '),
    });
  }
  if (spell.reference.save_abilities.length > 0) {
    supplemental.push({
      label: 'Save abilities',
      value: spell.reference.save_abilities.join(', '),
    });
  }

  const description: SpellAppendixDescription =
    spell.reference.description === null
      ? {
          status: 'absent',
          disclosure: MISSING_SPELL_TEXT_DISCLOSURE,
        }
      : { status: 'recorded', text: spell.reference.description };
  return {
    spell_version_id: spell.spell_version_id,
    name: spell.name,
    catalog_layer: spell.catalog_layer,
    level: spellLevelText(spell),
    school: spell.reference.school,
    edition_marker: spellEditionMarker(spell.reference.edition),
    facts,
    supplemental,
    description,
    pagination:
      description.status === 'recorded' &&
      [...description.text].length > SPELL_APPENDIX_SPLIT_CODE_POINT_THRESHOLD
        ? 'split_prose'
        : 'keep_together',
  };
}

/** Pure D149 projection: consumes the compact arrays without regrouping or sorting. */
export function spellAppendix(
  sheet: CharacterSheet,
): SpellAppendixContent | null {
  const groups: SpellAppendixContent['groups'][number][] = [];
  const missingSpellNames: string[] = [];
  for (const group of sheet.spells) {
    const spells: readonly SheetSpellbookEntry[] =
      group.kind === 'class'
        ? [...group.spells, ...group.spellbook]
        : group.spells;
    if (spells.length === 0) {
      continue;
    }
    const cards = spells.map(spellAppendixCard);
    for (const card of cards) {
      if (card.description.status === 'absent') {
        missingSpellNames.push(card.name);
      }
    }
    groups.push({
      id: spellGroupId(group),
      name: group.kind === 'class' ? group.class_name : group.source_name,
      catalog_layer:
        group.kind === 'class'
          ? group.class_catalog_layer
          : group.source_catalog_layer,
      cards,
    });
  }
  return groups.length === 0
    ? null
    : {
        id: 'spells',
        order: SPELL_APPENDIX_ORDER,
        title: 'Full spell text',
        text_status:
          missingSpellNames.length === 0
            ? 'available'
            : groups.every((group) =>
                group.cards.every(
                  (card) => card.description.status === 'absent',
                ),
              )
              ? 'unavailable'
              : 'partial',
        groups,
        missing_spell_names: missingSpellNames,
      };
}

/** One run of text in the readable form. `free_text` means the author is unverified. */
export interface SheetCell {
  readonly text: string;
  readonly free_text?: true;
}

export interface SheetRow {
  /** A stable machine key, never localised and never reordered. */
  readonly id: string;
  readonly label: readonly SheetCell[];
  /** The value as printed, tokenised when it contains untrusted labels. */
  readonly value: string | readonly SheetCell[] | null;
  /** How the number was reached, in the source's own terms. */
  readonly detail: readonly SheetCell[];
  readonly resource_marking?: {
    readonly shape: ResourceMarkingShape;
    readonly maximum: number;
  };
  readonly disclosure?: {
    readonly summary: string;
    readonly detail: readonly SheetCell[];
  };
}

export interface SheetRowSection {
  readonly caption: string;
  readonly rows: readonly SheetRow[];
  readonly spell_groups?: never;
}

export interface SheetSpellStatisticsBlock {
  readonly label: string | null;
  readonly lines: readonly (readonly SheetCell[])[];
}

export interface SheetSpellDisplayGroup {
  readonly id: string;
  readonly heading: readonly SheetCell[] | null;
  readonly statistics: SheetSpellStatisticsBlock;
  readonly rows: readonly SheetRow[];
  readonly spellbook_rows: readonly SheetRow[];
}

export interface SheetSpellSection {
  readonly caption: 'Spells';
  readonly spell_groups: readonly SheetSpellDisplayGroup[];
  readonly rows?: never;
}

export type SheetSection = SheetRowSection | SheetSpellSection;

function plain(text: string): SheetCell[] {
  return [{ text }];
}

function signed(value: number): string {
  return value >= 0 ? `+${String(value)}` : String(value);
}

function abilityLabel(
  statistic: SheetSpellcastingStatistic & { readonly status: 'computed' },
): string {
  switch (statistic.ability) {
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
  const unhandled: never = statistic.ability;
  return unhandled;
}

function spellStatisticText(statistic: SheetSpellcastingStatistic): string {
  switch (statistic.status) {
    case 'computed':
      return `Save DC ${String(statistic.save_dc)} · Spell attack ${signed(statistic.attack_bonus)}`;
    case 'absent':
      return 'Save DC and spell attack are unknown because this source has no spellcasting ability recorded.';
  }
  const unhandled: never = statistic;
  return unhandled;
}

function spellLevelText(spell: SheetSpellbookEntry): string {
  switch (spell.level.status) {
    case 'known':
      return spell.level.value === 0
        ? 'Cantrip'
        : `Level ${String(spell.level.value)}`;
    case 'unknown':
      return 'Level unknown';
  }
  const unhandled: never = spell.level;
  return unhandled;
}

function spellMarkerText(spell: SheetSpell): string {
  switch (spell.marker) {
    case 'prepared':
      return 'Prepared';
    case 'known':
      return 'Known';
  }
  const unhandled: never = spell.marker;
  return unhandled;
}

export type CurrentCantripEffect =
  | {
      readonly status: 'recorded';
      readonly character_level: number;
      readonly value: string;
    }
  | {
      readonly status: 'unknown';
      readonly reason: 'character_level_unknown' | 'current_value_not_recorded';
    };

/**
 * Reads only explicit `level (current value)` pairs from stored rule text.
 * It never guesses a die from a spell name or treats a prose increment as a
 * base value. Imported prose outside this narrow shape stays UNKNOWN (D33).
 */
export function currentCantripEffect(
  spell: SheetSpellbookEntry,
  totalCharacterLevel: number | null,
): CurrentCantripEffect {
  if (totalCharacterLevel === null) {
    return { status: 'unknown', reason: 'character_level_unknown' };
  }
  const summary = spell.reference.cantrip_upgrade_summary;
  const description = spell.reference.description;
  const marker = description?.indexOf('Cantrip Upgrade.') ?? -1;
  const source = summary ?? (marker < 0 ? null : description?.slice(marker));
  if (source === null || source === undefined) {
    return { status: 'unknown', reason: 'current_value_not_recorded' };
  }
  const recorded = [...source.matchAll(/\b(\d{1,2})\s*\(([^()\n]{1,80})\)/gu)]
    .map((match) => ({ level: Number(match[1]), value: match[2] ?? '' }))
    .filter(
      (entry) =>
        Number.isInteger(entry.level) &&
        entry.level >= 1 &&
        entry.level <= totalCharacterLevel &&
        entry.value.trim().length > 0,
    )
    .sort((left, right) => right.level - left.level)[0];
  return recorded === undefined
    ? { status: 'unknown', reason: 'current_value_not_recorded' }
    : {
        status: 'recorded',
        character_level: totalCharacterLevel,
        value: recorded.value,
      };
}

function spellRulesDisclosure(
  spell: SheetSpellbookEntry,
  totalCharacterLevel: number | null,
): SheetCell[] {
  const cells: SheetCell[] = [];
  const fact = (label: string, value: string | null): void => {
    if (cells.length > 0) cells.push({ text: ' ' });
    cells.push(
      { text: `${label}: ` },
      value === null
        ? { text: 'UNKNOWN — not recorded.' }
        : { text: value, free_text: true },
      ...(value === null ? [] : [{ text: '.' }]),
    );
  };
  fact('Casting time', spell.reference.casting_time);
  fact('Range', spell.reference.range);
  fact('Components', spell.reference.components);
  fact('Duration', spell.reference.duration);
  if (spell.level.status === 'known' && spell.level.value === 0) {
    const current = currentCantripEffect(spell, totalCharacterLevel);
    fact(
      'Current cantrip effect',
      current.status === 'recorded'
        ? `${current.value} at character level ${String(totalCharacterLevel)}`
        : null,
    );
  }
  fact('Effect', spell.reference.description);
  return cells;
}

function spellGroupId(group: SheetSpellGroup): string {
  switch (group.kind) {
    case 'class':
      return `class:${String(group.class_definition_id)}`;
    case 'other_source':
      return `source:${String(group.source_instance_id)}`;
  }
  const unhandled: never = group;
  return unhandled;
}

function spellSection(
  spells: CharacterSpellSection,
  totalCharacterLevel: number | null,
): SheetSpellSection {
  let contributingClassGroups = 0;
  for (const group of spells) {
    if (group.kind === 'class') {
      contributingClassGroups += 1;
    }
  }
  return {
    caption: 'Spells',
    spell_groups: spells.map((group): SheetSpellDisplayGroup => {
      const id = spellGroupId(group);
      const heading =
        group.kind === 'other_source'
          ? [
              { text: group.source_name, free_text: true as const },
              { text: ` — ${catalogLayerLabel(group.source_catalog_layer)}` },
            ]
          : contributingClassGroups >= 2
            ? [
                { text: group.class_name, free_text: true as const },
                { text: ` — ${catalogLayerLabel(group.class_catalog_layer)}` },
              ]
            : null;
      const mixedStatistics = group.statistics.length > 1;
      const sourceName =
        group.kind === 'class' ? group.class_name : group.source_name;
      return {
        id,
        heading,
        statistics: {
          label: mixedStatistics ? 'Spellcasting statistics' : null,
          lines: group.statistics.map((statistic) =>
            mixedStatistics
              ? [
                  { text: sourceName, free_text: true as const },
                  {
                    text:
                      ` — ${catalogLayerLabel(
                        group.kind === 'class'
                          ? group.class_catalog_layer
                          : group.source_catalog_layer,
                      )}` + (statistic.status === 'computed'
                        ? ` (${abilityLabel(statistic)}) — ${spellStatisticText(statistic)}`
                        : ` — ${spellStatisticText(statistic)}`),
                  },
                ]
              : [{ text: spellStatisticText(statistic) }],
          ),
        },
        rows: group.spells.map((spell) => ({
          id: `spell:${id}:${String(spell.spell_version_id)}`,
          label: [{ text: spell.name, free_text: true }],
          value: spellLevelText(spell),
          detail: plain(
            `${spellMarkerText(spell)} · ${catalogLayerLabel(spell.catalog_layer)}`,
          ),
          disclosure: {
            summary: 'Read spell rules',
            detail: spellRulesDisclosure(spell, totalCharacterLevel),
          },
        })),
        spellbook_rows:
          group.kind === 'class'
            ? group.spellbook.map((spell) => ({
                id: `spellbook:${id}:${String(spell.spell_version_id)}`,
                label: [{ text: spell.name, free_text: true }],
                value: spellLevelText(spell),
                detail: plain(
                  `Spellbook · ${catalogLayerLabel(spell.catalog_layer)}`,
                ),
                disclosure: {
                  summary: 'Read spell rules',
                  detail: spellRulesDisclosure(spell, totalCharacterLevel),
                },
              }))
            : [],
      };
    }),
  };
}

export type ResourceMarkingShape = 'boxes' | 'remaining';

/** D123/D134: one exhaustive, level-independent classification. */
export const RESOURCE_MARKING_SHAPES = {
  rage: 'boxes',
  channel_divinity: 'boxes',
  wild_shape: 'boxes',
  second_wind: 'boxes',
  focus_points: 'remaining',
  favored_enemy: 'boxes',
  sorcery_points: 'remaining',
  persistent_rage_recovery: 'boxes',
  bardic_inspiration: 'boxes',
  divine_intervention: 'boxes',
  wild_resurgence_conversion: 'boxes',
  nature_magician_conversion: 'boxes',
  action_surge: 'boxes',
  indomitable: 'boxes',
  uncanny_metabolism: 'boxes',
  lay_on_hands: 'remaining',
  paladins_smite: 'boxes',
  faithful_steed: 'boxes',
  tireless: 'boxes',
  natures_veil: 'boxes',
  stroke_of_luck: 'boxes',
  innate_sorcery: 'boxes',
  sorcerous_restoration: 'boxes',
  magical_cunning: 'boxes',
  contact_patron: 'boxes',
  spell_slot: 'boxes',
  pact_slot: 'boxes',
} as const satisfies Readonly<Record<SheetResourceKind, ResourceMarkingShape>>;

function numberRow(
  entry: {
    readonly id: string;
    readonly label: string;
    readonly value: number | null;
    readonly formula: string;
  },
  signedValue: boolean,
): SheetRow {
  return {
    id: entry.id,
    label: plain(entry.label),
    value:
      entry.value === null
        ? 'undetermined'
        : signedValue
          ? signed(entry.value)
          : String(entry.value),
    detail: plain(entry.formula),
  };
}

function armorClassSourceText(source: ArmorClassSourceCategory): string {
  switch (source) {
    case 'worn_armor':
      return 'worn armour';
    case 'species':
      return 'species';
    case 'subclass':
      return 'subclass';
    case 'class':
      return 'class';
    case 'feat':
      return 'feat';
    case 'background':
      return 'background';
    case 'item':
      return 'item';
    case 'weapon':
      return 'weapon';
    case 'manual':
      return 'manual or default';
  }
}

function armorClassFormulaCells(
  formula: SheetArmorClassFormula,
): SheetCell[] {
  return [
    { text: formula.label, free_text: true },
    { text: ` (${formula.expression})` },
  ];
}

function armorClassExclusionText(
  reason: ArmorClassExclusionReason,
): string {
  switch (reason.kind) {
    case 'wearing_armor':
      return ' does not apply while you are wearing armour.';
    case 'shield_not_allowed':
      return ' does not apply while you carry a shield.';
  }
}

function armorClassRows(sheet: CharacterSheet): SheetRow[] {
  const armorClass = sheet.armor_class;
  const winner = armorClass.winner;
  const rows: SheetRow[] = [
    {
      id: 'armor_class:base',
      label: plain('Armor Class base'),
      value: winner.total === null ? null : String(winner.total),
      detail: [
        ...armorClassFormulaCells(winner),
        {
          text:
            ` is the winning eligible formula. Source category: ` +
            `${armorClassSourceText(winner.source)}.`,
        },
      ],
    },
  ];
  armorClass.shields.forEach((shield, index) => {
    rows.push({
      id: `armor_class:shield:${String(index)}`,
      label: plain('Shield contribution'),
      value: signed(shield.amount),
      detail: [
        { text: shield.label, free_text: true },
        { text: ' applies after the winning base is chosen.' },
      ],
    });
  });
  armorClass.bonuses.forEach((bonus, index) => {
    rows.push({
      id: `armor_class:bonus:${String(index)}`,
      label: plain('Armor Class effect'),
      value: signed(bonus.amount),
      detail: [
        { text: bonus.label, free_text: true },
        { text: ' applies after the winning base is chosen.' },
      ],
    });
  });
  armorClass.excluded.forEach((excluded, index) => {
    rows.push({
      id: `armor_class:excluded:${String(index)}`,
      label: plain('Armor Class formula excluded'),
      value: null,
      detail: [
        ...armorClassFormulaCells(excluded.formula),
        {
          text: armorClassExclusionText(excluded.reason),
        },
      ],
    });
  });
  armorClass.tie_break?.losers.forEach((loser, index) => {
    const tieWinner = armorClass.tie_break?.winner;
    if (tieWinner === undefined) {
      throw new Error('Armor Class tie has no winner.');
    }
    rows.push({
      id: `armor_class:tie:${String(index)}`,
      label: plain('Armor Class tie resolved'),
      value: tieWinner.total === null ? null : String(tieWinner.total),
      detail: [
        ...armorClassFormulaCells(tieWinner),
        { text: ' won over ' },
        ...armorClassFormulaCells(loser),
        {
          text:
            '. Both produced the same base; source precedence, then ' +
            'alphabetical label, broke the tie.',
        },
      ],
    });
  });
  return rows;
}

function abilitySourceCells(entry: SheetAbilityScore): SheetCell[] {
  const cells: SheetCell[] = [
    {
      text:
        `${entry.formula} Score path: base ${String(entry.base_score)}; ` +
        `after increases ${String(entry.increased_score)}.`,
    },
  ];
  for (const override of entry.override_terms) {
    cells.push({ text: ' ' }, { text: override.label, free_text: true });
    switch (override.outcome) {
      case 'applied':
        cells.push({
          text:
            ` sets the score to ${String(override.set_to)} and is the ` +
            'winning override.',
        });
        break;
      case 'floored_by_increased_score':
        cells.push({
          text:
            ` would set the score to ${String(override.set_to)} but is inert; ` +
            `the score after increases is already ${String(entry.increased_score)}.`,
        });
        break;
      case 'tied_at_winning_value':
        cells.push({
          text:
            ` also sets the score to ${String(override.set_to)}, matching ` +
            'the winning value without stacking.',
        });
        break;
      case 'superseded_by_higher_override':
        cells.push({
          text:
            ` would set the score to ${String(override.set_to)} but is inert; ` +
            'a higher set-to value wins.',
        });
        break;
    }
  }
  return cells;
}

function resourceKindLabel(kind: SheetResourceKind): string {
  if (kind === 'spell_slot') {
    return 'Spell slots';
  }
  if (kind === 'pact_slot') {
    return 'Pact slots';
  }
  if ((classResourceKinds as readonly string[]).includes(kind)) {
    return classResourceLabel(kind as ClassResourceKind);
  }
  if ((classFormulaResourceKinds as readonly string[]).includes(kind)) {
    return classFormulaResourceLabel(kind as ClassFormulaResourceKind);
  }
  throw new TypeError(`Unlabelled resource kind ${kind}.`);
}

function resourceComputationText(
  computation: SheetResourceComputation,
  maximum: number,
): string {
  switch (computation.kind) {
    case 'level_table':
      return `Exact sourced table row at class level ${String(computation.class_level)}.`;
    case 'fixed_count':
      return `Fixed count ${String(computation.count)}, acquired at class level ${String(computation.minimum_class_level)}.`;
    case 'fixed_count_by_class_level':
      return `Sourced class-level steps ${computation.steps
        .map((step) => `${String(step.minimum_class_level)} → ${String(step.count)}`)
        .join(', ')}; current maximum ${String(maximum)}.`;
    case 'ability_modifier_minimum_one': {
      const ability =
        computation.ability === 'charisma' ? 'Charisma' : 'Wisdom';
      return `Live resolved ${ability} modifier ${signed(computation.resolved_modifier)}, with a minimum of one.`;
    }
    case 'class_level_multiple':
      return `${String(computation.multiplier)} × owning class level; current maximum ${String(maximum)}.`;
    case 'shared_spell_slots':
      return `Shared spell-slot table at effective caster level ${String(computation.effective_caster_level)}.`;
    case 'pact_magic':
      return `Pact Magic at class level ${String(computation.class_level)}; these are level ${String(computation.spell_level)} slots.`;
  }
}

function computedResourceLabel(
  resource: Extract<SheetResourceMaximum, { status: 'computed' }>,
): SheetCell[] {
  if (resource.kind === 'spell_slot') {
    return plain(`Level ${String(resource.spell_level)} spell slots`);
  }
  if (resource.kind === 'pact_slot') {
    return plain(`Pact slots — level ${String(resource.spell_level)}`);
  }
  if (resource.class_name === null) {
    throw new TypeError(`Class resource ${resource.id} has no class name.`);
  }
  return [
    { text: resource.class_name, free_text: true },
    { text: ` — ${resourceKindLabel(resource.kind)}` },
  ];
}

function absentResourceCells(
  resource: Extract<SheetResourceMaximum, { status: 'absent' }>,
): { readonly label: SheetCell[]; readonly detail: SheetCell[] } {
  if (
    resource.reason === 'resource_catalog_not_recorded' &&
    resource.class_name !== null
  ) {
    return {
      label: plain('Resource maxima not recorded'),
      detail: [
        { text: 'Resource maxima are not recorded for ' },
        { text: resource.class_name, free_text: true },
        { text: '.' },
      ],
    };
  }
  if (
    resource.reason === 'spell_progression_missing_or_invalid' &&
    resource.class_name !== null
  ) {
    return {
      label: plain('Resource maximum unavailable'),
      detail: [
        { text: resource.class_name, free_text: true },
        { text: resource.detail },
      ],
    };
  }
  if (resource.class_name !== null && resource.kind !== null) {
    return {
      label: [
        { text: resource.class_name, free_text: true },
        { text: ` — ${resourceKindLabel(resource.kind)}` },
      ],
      detail: plain(resource.detail),
    };
  }
  return {
    label: plain(
      resource.reason === 'feature_text_maximum_not_modelled'
        ? 'Feature-text resource limits'
        : 'Resource maximum unavailable',
    ),
    detail: plain(resource.detail),
  };
}

function resourceRows(
  resources: readonly SheetResourceMaximum[],
): readonly SheetRow[] {
  return resources.map((resource): SheetRow => {
    if (resource.status === 'absent') {
      const cells = absentResourceCells(resource);
      return {
        id: resource.id,
        label: cells.label,
        value: null,
        detail: cells.detail,
      };
    }
    return {
      id: resource.id,
      label: computedResourceLabel(resource),
      value: String(resource.maximum),
      detail: plain(
        resourceComputationText(resource.computation, resource.maximum),
      ),
      resource_marking: {
        shape: RESOURCE_MARKING_SHAPES[resource.kind],
        maximum: resource.maximum,
      },
    };
  });
}

function featureValueRows(
  values: readonly SheetFeatureValue[],
): readonly SheetRow[] {
  return values.map((feature): SheetRow => {
    if ('kind' in feature) {
      if (feature.status === 'unavailable') {
        return {
          id: feature.id,
          label: plain(feature.label),
          value: 'UNKNOWN',
          detail: plain(featureValueUnavailableDetail(feature.reason)),
          disclosure: {
            summary: 'Read Arcane Recovery rules',
            detail: [{ text: feature.description, free_text: true }],
          },
        };
      }
      return {
        id: feature.id,
        label: plain(feature.label),
        value: String(feature.value),
        detail: plain(
          `Half Wizard level, rounded up · ${catalogLayerLabel(feature.catalog_layer)}. No usage tracker: this is a combined recovered-slot-level budget.`,
        ),
        disclosure: {
          summary: 'Read Arcane Recovery rules',
          detail: [{ text: feature.description, free_text: true }],
        },
      };
    }
    if (feature.status === 'unavailable') {
      return {
        id: feature.id,
        label: plain(feature.label),
        value: 'UNKNOWN',
        detail: plain(featureValueUnavailableDetail(feature.reason)),
      };
    }
    const applied = feature.terms.filter((term) => term.status === 'applied');
    const superseded = feature.terms.filter(
      (term) => typeof term.status === 'object',
    );
    const valueCells: SheetCell[] = [];
    for (const [index, term] of applied.entries()) {
      if (index > 0) valueCells.push({ text: ' + ' });
      valueCells.push({
        text: `${String(term.contribution)}d${String(feature.die_size)}`,
      });
      if (!term.is_base) {
        valueCells.push(
          { text: ' (' },
          { text: term.label, free_text: true },
          { text: ')' },
        );
      }
    }
    const detail: SheetCell[] = [];
    for (const [index, term] of applied.entries()) {
      if (index > 0) detail.push({ text: ' ' });
      detail.push(
        { text: term.label, free_text: true },
        {
          text: ` contributes ${String(term.contribution)}d${String(feature.die_size)}.`,
        },
      );
    }
    const supersededDetail: SheetCell[] = [];
    for (const [index, term] of superseded.entries()) {
      if (index > 0) supersededDetail.push({ text: ' ' });
      supersededDetail.push(
        { text: term.label, free_text: true },
        {
          text: ` would contribute ${String(term.contribution)}d${String(feature.die_size)} but is superseded.`,
        },
      );
    }
    return {
      id: feature.id,
      label: plain(feature.label),
      value: valueCells,
      detail,
      ...(supersededDetail.length === 0
        ? {}
        : {
            disclosure: {
              summary: 'Superseded terms',
              detail: supersededDetail,
            },
          }),
    };
  });
}

function featureValueUnavailableDetail(
  reason: Extract<SheetFeatureValue, { readonly status: 'unavailable' }>['reason'],
): string {
  switch (reason) {
    case 'missing_class':
      return 'This value needs a class level the character does not have.';
    case 'missing_ability':
      return 'This value needs an ability modifier that is not available.';
    case 'invalid_data':
      return 'One of the recorded contributions is invalid.';
    case 'overflow':
      return 'The recorded contributions produce a number that is too large.';
    case 'malformed_supersession':
      return 'The recorded replacement links are incomplete or contradictory.';
    case 'duplicate_source':
      return 'Two recorded contributions use the same source key.';
    default: {
      const unreachable: never = reason;
      throw new TypeError(
        `Unhandled feature-value absence ${String(unreachable)}.`,
      );
    }
  }
}

/**
 * The readable projection: every number on the sheet as a labelled row.
 *
 * Each row's `id` is the same key its counterpart uses in {@link sheetFacts}
 * wherever the two describe one fact, so the test can pair them without a
 * lookup table that could itself be wrong.
 */
export function sheetSections(sheet: CharacterSheet): readonly SheetSection[] {
  const sections: SheetSection[] = [];

  const identity: SheetRow[] = [
    {
      id: 'character',
      label: plain('Character'),
      value: null,
      detail: [{ text: sheet.name, free_text: true }],
    },
    {
      id: 'total_level',
      label: plain('Total character level'),
      value:
        sheet.total_level === null
          ? 'undetermined'
          : String(sheet.total_level),
      detail: plain(
        'The sum across every class. The proficiency bonus is taken from this ' +
          'and never from the level in one class.',
      ),
    },
  ];
  for (const entry of sheet.classes) {
    identity.push({
      id: `class:${entry.class_name}`,
      label: [
        { text: 'Class — ' },
        { text: entry.class_name, free_text: true },
      ],
      value: String(entry.level),
      detail: plain(
        // NOT "d8" WHEN THE DIE IS UNKNOWN. `hitPointMaximum` assumes one so a
        // number can exist at all, and warns; printing that assumption here as
        // "Hit die d8" would restate the guess as this class's printed value.
        `${
          entry.hit_die === null
            ? 'Hit die not recorded for this class'
            : `Hit die d${String(entry.hit_die)}`
        }. ${
          entry.is_starting_class
            ? 'This is the starting class, so it contributes the level 1 hit point maximum.'
            : 'Not the starting class.'
        } Saving throws: ${
          entry.saving_throws.length === 0
            ? 'none recorded'
            : entry.saving_throws.join(', ')
        }.`,
      ),
    });
  }
  for (const [index, source] of sheet.catalog_sources.entries()) {
    identity.push({
      id: `catalog_source:${source.kind}:${String(index)}`,
      label: [
        { text: `${source.kind[0]?.toUpperCase() ?? ''}${source.kind.slice(1)} — ` },
        { text: source.name, free_text: true },
      ],
      value: catalogLayerLabel(source.catalog_layer),
      detail: plain(
        source.content_key === null
          ? 'The applied content remains readable, but its catalog identity is not recorded.'
          : 'Publication layer read from the catalog identity registry.',
      ),
    });
  }
  sections.push({ caption: 'Character', rows: identity });

  const core: SheetRow[] = [
    numberRow(sheet.proficiency_bonus, true),
    numberRow(sheet.hit_point_maximum, false),
    numberRow(sheet.class_hit_points_subtotal, false),
  ];
  if (sheet.species_hit_points !== null) {
    core.push(numberRow(sheet.species_hit_points, true));
  }
  core.push(numberRow(sheet.armor_class, false));
  core.push(...armorClassRows(sheet));
  core.push(numberRow(sheet.initiative, true));
  core.push(numberRow(sheet.passive_perception, false));
  sections.push({ caption: 'Core numbers', rows: core });

  sections.push({ caption: 'Resources', rows: resourceRows(sheet.resources) });

  if (sheet.feature_values.length > 0) {
    sections.push({
      caption: 'Feature values',
      rows: featureValueRows(sheet.feature_values),
    });
  }

  sections.push({
    caption: 'Ability scores',
    rows: sheet.ability_scores.map((entry) => ({
      id: entry.id,
      label: plain(`${entry.label} ${String(entry.score)}`),
      value: entry.value === null ? 'undetermined' : signed(entry.value),
      detail: abilitySourceCells(entry),
    })),
  });

  sections.push({
    caption: 'Saving throws',
    rows: sheet.saves.map((save) => ({
      id: save.id,
      label: plain(`${save.label}${save.proficient ? ' (proficient)' : ''}`),
      value: save.value === null ? 'undetermined' : signed(save.value),
      detail: plain(save.formula),
    })),
  });

  sections.push({
    caption: 'Skills',
    rows: sheet.skills.map((skill) => ({
      id: skill.id,
      label: plain(
        `${skill.label}${
          skill.expertise
            ? ' (Expertise)'
            : skill.proficient
              ? ' (proficient)'
              : ''
        }`,
      ),
      value: skill.value === null ? 'undetermined' : signed(skill.value),
      detail: plain(skill.formula),
    })),
  });

  // THE PROFICIENCIES SECTION (D28). It sits after Skills and before Combat
  // because it is the answer to "can I use this", which a player asks with the
  // weapon in front of them.
  const proficiencies: SheetRow[] = [
    {
      id: 'armor_training',
      label: plain('Armor training'),
      value:
        sheet.proficiencies.armor_training.length === 0
          ? 'None'
          : sheet.proficiencies.armor_training.join(', '),
      detail: plain(
        'The UNION across every class: a character is trained if ANY of their ' +
          'classes trains them. The class they started in contributes its full ' +
          'Core Traits row; every class they multiclassed into contributes only ' +
          'the smaller set its "As a Multiclass Character" clause grants.',
      ),
    },
  ];
  for (const entry of sheet.proficiencies.classes) {
    proficiencies.push({
      id: `proficiency_source:${entry.class_name}`,
      label: [
        { text: 'Granted by — ' },
        { text: entry.class_name, free_text: true },
      ],
      value: entry.via === 'initial' ? 'Starting class' : 'Multiclass entry',
      detail: plain(
        entry.via === 'initial'
          ? 'The starting class, so it grants everything its Core Traits table ' +
              'lists — including the saving throws, which no multiclass entry ' +
              'ever grants.'
          : 'Entered by multiclassing, so it grants only what its "As a ' +
              'Multiclass Character" clause lists: never its saving throws, and ' +
              'not necessarily all of its armour training or weapons.',
      ),
    });
  }
  for (const grant of sheet.proficiencies.weapon_proficiencies) {
    proficiencies.push({
      id: `weapon_proficiency:${grant.class_name}:${grant.category}`,
      label: [
        { text: `Weapons — ${grant.category} from ` },
        { text: grant.class_name, free_text: true },
      ],
      value: grant.property_qualifier ?? 'all',
      // THE QUALIFIER IS PRINTED WHETHER OR NOT IT WAS EVALUATED, because the
      // player is the one who adjudicates (D26). Where this application CAN
      // read it — "Finesse or Light" is `finesse OR light` over columns the
      // weapon already stores — the per-weapon verdicts below have applied it.
      detail:
        grant.property_qualifier === null
          ? plain('Every weapon of that category, with no qualification.')
          : [
              { text: 'Only weapons with the ' },
              { text: grant.property_qualifier, free_text: true },
              {
                text:
                  ' property. Where those words name properties this ' +
                  'application stores, the weapons below have been checked ' +
                  'against them; where they do not, the sheet says so instead ' +
                  'of guessing.',
              },
            ],
    });
  }
  for (const weapon of sheet.proficiencies.weapons) {
    proficiencies.push({
      id: `weapon_verdict:${weapon.name}`,
      label: [{ text: weapon.name, free_text: true }],
      value: weaponVerdictValue(weapon.verdict),
      detail: weaponVerdictDetail(weapon.verdict),
    });
  }
  sections.push({ caption: 'Proficiencies', rows: proficiencies });

  const combat: SheetRow[] = [
    {
      id: 'attacks_per_action',
      label: plain('Attacks per Attack action'),
      value: String(sheet.attacks_per_action.count),
      detail: plain(
        'Features granting Extra Attack do not stack; the largest applies. ' +
          'Per-weapon attack profiles are on the planner, beside the weapon ' +
          'list they describe.',
      ),
    },
  ];
  // A grant this application could not apply gets its own row rather than being
  // folded into the count. The count is a number it stands behind.
  sheet.attacks_per_action.unresolved.forEach((grant, index) => {
    grant.unresolved.forEach((reason, position) => {
      combat.push({
        id: `unresolved_attack_grant:${String(index)}:${String(position)}`,
        label: plain('Extra Attack not applied'),
        value: null,
        detail: plain(reason),
      });
    });
  });
  for (const die of sheet.martial_arts) {
    combat.push({
      id: `martial_arts_die:${die.class_name}`,
      label: plain('Martial Arts die'),
      value: `1d${String(die.die)}`,
      detail: [
        { text: 'Resolved at ' },
        { text: die.class_name, free_text: true },
        {
          text:
            ` level ${String(die.class_level)} — that class's own level, not ` +
            'the total character level.',
        },
      ],
    });
  }
  combat.push({
    id: 'walking_speed_feet',
    label: plain('Walking speed'),
    value:
      sheet.walking_speed.kind === 'unknown'
        ? 'UNKNOWN'
        : `${String(sheet.walking_speed.value)} feet`,
    detail: plain(sheet.walking_speed.detail),
  });
  if (sheet.lineage_darkvision !== null) {
    combat.push({
      id: 'lineage_darkvision',
      label: plain('Darkvision'),
      value:
        sheet.lineage_darkvision.kind === 'unknown'
          ? 'UNKNOWN'
          : `${String(sheet.lineage_darkvision.value)} feet`,
      detail: plain(sheet.lineage_darkvision.detail),
    });
  }
  // THE UNCHOSEN HALF NAMES ITSELF NOW. It used to read "plus 2 whose type this
  // application does not record" — a count, because an effect lived on a trait
  // row and two anonymous resistances were indistinguishable. Each is a row
  // with a `label`, so the page says WHICH grant is waiting on the user, which
  // is the difference between a limitation the reader is told about and a
  // decision they can act on.
  combat.push({
    id: 'damage_resistances',
    label: plain('Damage resistances'),
    value: null,
    detail: plain(
      `${
        sheet.damage_resistances.length === 0 &&
        sheet.lineage_damage_resistance?.kind !== 'unknown'
          ? 'None chosen'
          : sheet.damage_resistances.join(', ')
      }${
        sheet.lineage_damage_resistance?.kind === 'unknown'
          ? `${sheet.damage_resistances.length === 0 ? '' : ', '}UNKNOWN (${sheet.lineage_damage_resistance.detail})`
          : ''
      }${
        sheet.unchosen_damage_resistances.length === 0
          ? '.'
          : `, plus one from ${sheet.unchosen_damage_resistances.join(
              ' and one from ',
            )} whose type is not yet chosen.`
      }`,
    ),
  });
  sections.push({ caption: 'Attacks and movement', rows: combat });

  if (sheet.spells.length > 0) {
    sections.push(spellSection(sheet.spells, sheet.total_level));
  }

  if (sheet.subclass_features.length > 0) {
    sections.push({
      caption: 'Subclass features',
      rows: sheet.subclass_features.map((feature, index) => ({
        id: `subclass-feature:${String(index)}`,
        label: [{ text: feature.name, free_text: true }],
        value: `Level ${String(feature.class_level)}`,
        detail: [
          { text: feature.subclass_name, free_text: true },
          { text: ` · ${catalogLayerLabel(feature.subclass_catalog_layer)}` },
        ],
        disclosure: {
          summary: 'Read feature rules',
          detail: [{ text: feature.description, free_text: true }],
        },
      })),
    });
  }

  // D102: PRINT THE WORDS, DO NOT TURN THEM INTO FACTS. Background tool text
  // and species trait prose stay in the readable projection, marked as
  // unverified free text, and are deliberately absent from `sheetFacts`.
  // This is a normal sheet section, not a hover surface, so D89 carries it
  // through the existing print stylesheet.
  if (sheet.printed_features.length > 0) {
    sections.push({
      caption: 'Features and traits',
      rows: sheet.printed_features.map((feature, index) => ({
        id: `feature:${feature.source}:${String(index)}`,
        label: [
          {
            text:
              feature.source === 'background'
                ? 'Background feature — '
                : 'Species trait — ',
          },
          ...(feature.source_name === null
            ? []
            : [
                { text: feature.source_name, free_text: true as const },
                { text: ' — ' },
              ]),
          { text: feature.name, free_text: true },
        ],
        value: null,
        detail:
          feature.text === null
            ? plain('No description is recorded.')
            : [{ text: feature.text, free_text: true }],
      })),
    });
  }

  const flavorRows: SheetRow[] = [];
  const flavorFields = [
    ['alignment', 'Alignment', sheet.flavor.alignment],
    ['appearance', 'Appearance', sheet.flavor.appearance],
    ['backstory', 'Backstory', sheet.flavor.backstory],
    ['notes', 'Notes', sheet.flavor.notes],
  ] as const;
  for (const [id, label, value] of flavorFields) {
    if (!presentFlavorText(value)) {
      continue;
    }
    flavorRows.push({
      id: `flavor:${id}`,
      label: plain(`${label} — unverified free text`),
      value: null,
      detail: [{ text: value, free_text: true }],
    });
  }
  if (flavorRows.length > 0) {
    sections.push({ caption: 'Character details', rows: flavorRows });
  }

  const recorded: SheetRow[] = [];
  if (sheet.armor.length === 0) {
    recorded.push({
      id: 'armor:none',
      label: plain('Armour and shield'),
      value: null,
      detail: plain(
        'None recorded, so the Armor Class is 10 plus the Dexterity modifier.',
      ),
    });
  }
  for (const row of sheet.armor) {
    recorded.push({
      id: `armor:${row.slot}`,
      label: plain(`Armour — ${row.slot} slot`),
      value: `${row.category === 'shield' ? '+' : ''}${String(row.armor_class)}`,
      detail: [
        { text: row.name, free_text: true },
        {
          text:
            ` — ${row.category}, ${
              row.category === 'shield'
                ? 'a bonus over whatever base applies'
                : 'a base Armor Class'
            }${
              row.strength_requirement === null
                ? ''
                : `, requires Strength ${String(row.strength_requirement)}`
            }${row.stealth_disadvantage ? ', disadvantage on Stealth' : ''}.`,
        },
      ],
    });
  }
  if (sheet.items.length === 0) {
    recorded.push({
      id: 'item:none',
      label: plain('Items with mechanical effects'),
      value: null,
      detail: plain(
        'None recorded. General possessions are not itemised on this sheet.',
      ),
    });
  }
  for (const [index, item] of sheet.items.entries()) {
    const state = item.requires_attunement
      ? item.attuned
        ? 'Requires attunement; attuned, so its effects apply.'
        : 'Requires attunement; not attuned, so its effects do not apply.'
      : 'Does not require attunement; its effects apply.';
    recorded.push({
      id: `item:${String(index)}`,
      label: plain('Item'),
      value: null,
      detail: [
        { text: item.name, free_text: true },
        { text: ` — ${state}` },
        ...(item.description === null
          ? []
          : [
              { text: ' ' },
              { text: item.description, free_text: true as const },
            ]),
      ],
    });
  }
  if (sheet.hit_point_rolls.length === 0) {
    recorded.push({
      id: 'hit_point_roll:none',
      label: plain('Hit point rolls'),
      value: null,
      detail: plain(
        'None recorded, so every level after the first uses the printed fixed ' +
          'value for its hit die.',
      ),
    });
  }
  for (const roll of sheet.hit_point_rolls) {
    recorded.push({
      id: `hit_point_roll:${roll.class_name}:${String(roll.class_level)}`,
      label: plain(`Hit point roll — level ${String(roll.class_level)}`),
      value: String(roll.rolled_value),
      detail: [
        { text: 'Rolled for ' },
        { text: roll.class_name, free_text: true },
        {
          text: roll.applies
            ? '.'
            : ' — this character has no class of that name, so it is not counted.',
        },
      ],
    });
  }
  // THE RECORDED PACKAGE, NEVER A BLANK INVENTORY (D33, D65): the sheet says
  // gear is not itemised rather than showing nothing. The recorded package
  // prints with its contents from the rules tables — already coin-free,
  // because no purse is ever granted (D56) — marked as not tracked
  // individually. The option letter is closed-vocabulary; the source and
  // item names are stored text and carry the free-text marker.
  if (sheet.equipment_packages.length === 0) {
    recorded.push({
      id: 'equipment:none',
      label: plain('Starting equipment'),
      value: null,
      detail: plain(
        'No package choice is recorded. Gear is never itemised here either ' +
          'way — see "What this sheet does not show".',
      ),
    });
  }
  for (const pack of sheet.equipment_packages) {
    recorded.push({
      id: `equipment:${pack.kind}`,
      label: plain(`Starting equipment — ${pack.kind} package`),
      value: `Option ${pack.option.toUpperCase()}`,
      detail: [
        { text: pack.source_name, free_text: true },
        {
          text:
            ` — ${catalogLayerLabel(pack.source_catalog_layer)} — `,
        },
        ...pack.contents.flatMap((line, index) => [
          ...(index === 0 ? [] : [{ text: ', ' }]),
          {
            text: line.quantity === 1
              ? line.item_name
              : `${String(line.quantity)} ${line.item_name}`,
            free_text: true as const,
          },
          ...(line.catalog_layer === null
            ? []
            : [{ text: ` — ${catalogLayerLabel(line.catalog_layer)}` }]),
        ]),
        {
          text:
            '. Shown from the rules tables; these items are not tracked ' +
            'individually.',
        },
      ],
    });
  }
  sections.push({ caption: 'What is recorded', rows: recorded });

  // WHAT THE SHEET DOES NOT HAVE, PRINTED RATHER THAN LEFT BLANK. F4: a blank
  // features box reads as "this character has no features", which is false.
  sections.push({
    caption: 'What this sheet does not show',
    rows: sheet.gaps.map((gap) => ({
      id: `gap:${gap.kind}`,
      label: plain(gap.title),
      value: null,
      detail: plain(gap.detail),
    })),
  });

  return sections;
}

/**
 * The structured projection.
 *
 * ENUM-TYPED AND NUMERIC FACTS ONLY. Every key is one this module owns; no
 * user-authored string appears. An armour row contributes its slot, its
 * category and its numbers — the fields a CHECK constraint bounds — and not its
 * name.
 */
export function sheetFacts(sheet: CharacterSheet): Record<string, unknown> {
  return {
    character_id: sheet.character_id,
    total_level: sheet.total_level,
    proficiency_bonus: sheet.proficiency_bonus.value,
    ability_modifiers: sheet.ability_scores.map((entry) => ({
      ability: entry.ability,
      score: entry.score,
      modifier: entry.value,
      overrides: entry.override_terms.map((override) => ({
        set_to: override.set_to,
        outcome: override.outcome,
      })),
    })),
    class_hit_points_subtotal: sheet.class_hit_points_subtotal.value,
    species_hit_points: sheet.species_hit_points?.value ?? 0,
    hit_point_maximum: sheet.hit_point_maximum.value,
    armor_class: sheet.armor_class.value,
    armor_class_resolution: {
      winner: {
        source: sheet.armor_class.winner.source,
        expression: sheet.armor_class.winner.expression,
        total: sheet.armor_class.winner.total,
      },
      shields: sheet.armor_class.shields.map((shield) => shield.amount),
      bonuses: sheet.armor_class.bonuses.map((bonus) => bonus.amount),
      excluded: sheet.armor_class.excluded.map((excluded) => ({
        source: excluded.formula.source,
        expression: excluded.formula.expression,
        reason: excluded.reason.kind,
      })),
      tie_break:
        sheet.armor_class.tie_break === null
          ? null
          : {
              rule: sheet.armor_class.tie_break.rule,
              loser_count: sheet.armor_class.tie_break.losers.length,
            },
    },
    feature_values: sheet.feature_values.map((feature) =>
      'kind' in feature
        ? feature.status === 'unavailable'
          ? {
              key: feature.key,
              kind: feature.kind,
              status: feature.status,
              reason: feature.reason,
            }
          : {
              key: feature.key,
              kind: feature.kind,
              status: feature.status,
              value: feature.value,
              terms: feature.terms.map((term, term_order) => ({
                contribution: term.contribution,
                status: term.status,
                term_order,
              })),
            }
        : feature.status === 'unavailable'
        ? {
            key: feature.key,
            status: feature.status,
            reason: feature.reason,
          }
        : {
            key: feature.key,
            status: feature.status,
            value: feature.value,
            die_size: feature.die_size,
            terms: feature.terms.map((term, index, terms) => {
              const status = term.status;
              const supersededBy =
                typeof status !== 'object'
                  ? null
                  : terms.findIndex(
                      (candidate) =>
                        candidate.source.kind === 'contribution' &&
                        status.superseded_by.kind === 'contribution' &&
                        candidate.source.content_key ===
                          status.superseded_by.content_key &&
                        candidate.source.contribution_key ===
                          status.superseded_by.contribution_key,
                    );
              return {
                contribution: term.contribution,
                status: typeof status === 'object' ? 'superseded' : status,
                superseded_by:
                  supersededBy === -1 ? null : supersededBy,
                term_order: index,
              };
            }),
          },
    ),
    initiative: sheet.initiative.value,
    passive_perception: sheet.passive_perception.value,
    saving_throws: sheet.saves.map((save) => ({
      ability: save.ability,
      modifier: save.value,
      proficient: save.proficient,
    })),
    skills: sheet.skills.map((skill) => ({
      skill: skill.skill,
      ability: skill.ability,
      modifier: skill.value,
      proficient: skill.proficient,
    })),
    attacks_per_action: sheet.attacks_per_action.count,
    resources: sheet.resources.flatMap((resource) =>
      resource.status === 'computed'
        ? [
            {
              kind: resource.kind,
              maximum: resource.maximum,
              class_level: resource.class_level,
              spell_level: resource.spell_level,
            },
          ]
        : [],
    ),
    unresolved_attack_grants: sheet.attacks_per_action.unresolved.flatMap(
      (grant) => grant.unresolved,
    ).length,
    martial_arts_dice: sheet.martial_arts.map((die) => ({
      class_level: die.class_level,
      die: die.die,
    })),
    walking_speed_feet:
      sheet.walking_speed.kind === 'known'
        ? sheet.walking_speed.value
        : null,
    lineage_darkvision_feet:
      sheet.lineage_darkvision?.kind === 'known'
        ? sheet.lineage_darkvision.value
        : null,
    lineage_damage_resistance:
      sheet.lineage_damage_resistance === null
        ? null
        : sheet.lineage_damage_resistance.kind === 'unknown'
          ? 'unknown'
          : [...sheet.lineage_damage_resistance.values],
    damage_resistances: [...sheet.damage_resistances],
    unchosen_damage_resistances: [...sheet.unchosen_damage_resistances],
    classes: sheet.classes.map((entry) => ({
      level: entry.level,
      hit_die: entry.hit_die,
      is_starting_class: entry.is_starting_class,
      saving_throws: [...entry.saving_throws],
    })),
    catalog_sources: sheet.catalog_sources.map((source) => ({
      kind: source.kind,
      catalog_layer: source.catalog_layer,
    })),
    armor: sheet.armor.map((row) => ({
      slot: row.slot,
      category: row.category,
      armor_class: row.armor_class,
      dex_bonus: row.dex_bonus,
      dex_bonus_max: row.dex_bonus_max,
      strength_requirement: row.strength_requirement,
      stealth_disadvantage: row.stealth_disadvantage,
    })),
    items: sheet.items.map((item) => ({
      requires_attunement: item.requires_attunement,
      attuned: item.attuned,
    })),
    hit_point_rolls: sheet.hit_point_rolls.map((roll) => ({
      class_level: roll.class_level,
      rolled_value: roll.rolled_value,
      applies: roll.applies,
    })),
    // The recorded package choices: source kind and option letter are both
    // closed vocabularies; the item names stay in the readable form only.
    equipment_packages: sheet.equipment_packages.map((pack) => ({
      kind: pack.kind,
      option: pack.option,
    })),
    // D4's machine block gets the union and the per-weapon verdict KINDS, not
    // the prose. A verdict kind is a stable key; the sentence beside it is not.
    armor_training: [...sheet.proficiencies.armor_training],
    weapon_proficiencies: sheet.proficiencies.weapon_proficiencies.map(
      (grant) => ({
        category: grant.category,
        qualified: grant.property_qualifier !== null,
      }),
    ),
    weapon_proficiency_verdicts: sheet.proficiencies.weapons.map(
      (weapon) => weapon.verdict.kind,
    ),
    warnings: sheet.warnings.map((warning) => warning.code),
    gaps: sheet.gaps.map((gap) => gap.kind),
  };
}

/**
 * The four proficiency verdicts, as the word in the value column.
 *
 * EXHAUSTIVE, NO `default` ARM. A fifth verdict is a compile error here rather
 * than a weapon that renders with a blank cell, which is the whole reason
 * `WeaponProficiencyVerdict` is a closed union.
 */
function weaponVerdictValue(verdict: WeaponProficiencyVerdict): string {
  switch (verdict.kind) {
    case 'proficient':
      return 'Proficient';
    case 'not_proficient':
      return 'Not proficient';
    case 'category_not_stated':
      return 'Unknown';
    case 'qualifier_not_evaluated':
      return 'Undecided';
  }
}

/**
 * A list of CLASS NAMES as free-text cells, joined by plain separators.
 *
 * A CLASS NAME IS FREE TEXT ON THIS PAGE and concatenating it into a sentence is
 * the defect this exists to not have. A share link resolves its classes against
 * the recipient's own catalog, but that catalog can itself hold an IMPORTED
 * class whose name a stranger chose — so the same rule the character name, the
 * armour name and the adjustment note already follow applies here, and the test
 * that asserts it caught this being written the other way.
 */
function classNameCells(
  names: readonly string[],
  separator = ' and ',
): SheetCell[] {
  const parts: SheetCell[] = [];
  names.forEach((name, index) => {
    if (index > 0) {
      parts.push({ text: separator });
    }
    parts.push({ text: name, free_text: true });
  });
  return parts;
}

function weaponVerdictDetail(
  verdict: WeaponProficiencyVerdict,
): readonly SheetCell[] {
  switch (verdict.kind) {
    case 'proficient':
      return [
        { text: 'Granted by ' },
        ...classNameCells(verdict.via),
        {
          text:
            '. One class is enough — proficiency is a union across a ' +
            'character’s classes.',
        },
      ];
    case 'not_proficient':
      // WARN, NEVER REFUSE (D28 §1). Carrying it is legal; what is missing is
      // the bonus.
      //
      // THIS SENTENCE USED TO BE A BARE ASSERTION AND IS NOW A DESCRIPTION OF A
      // NUMBER THE READER CAN GO AND SEE. When it was written the planner's
      // attack profile for the same weapon still added the proficiency bonus, so
      // the two screens said opposite things; the profile withholds it now, and
      // `tests/integration/queries/weapon-proficiency-agreement.test.ts` is what
      // keeps them answering the same way.
      return plain(
        'No class this character has grants this weapon’s category. They may ' +
          'still carry and use it — nothing here refuses the row — but they add ' +
          'no proficiency bonus to the attack, and the attack profiles in the ' +
          'planner leave it out.',
      );
    case 'category_not_stated':
      return plain(
        'This weapon records no simple/martial category, so nothing can be ' +
          'checked. Set it on the weapon in the planner. A weapon that arrived ' +
          'on an older share link, or one typed in by hand, is normally in this ' +
          'state.',
      );
    case 'qualifier_not_evaluated':
      return [
        ...classNameCells(verdict.via),
        { text: ' grants this category only ' },
        // THE QUALIFIER IS FREE TEXT TOO. Ten of twelve SRD classes print none
        // and the two that do are ours, but an IMPORTED class's qualifier is a
        // string a stranger wrote — and this arm is the one that only ever fires
        // for a qualifier this application did not recognise, which makes an
        // imported one its most likely source.
        ...classNameCells(verdict.qualifiers, ', '),
        {
          text:
            ', and this application does not read those words. It has assumed ' +
            'NOT proficient rather than guessing either way; decide at the table.',
        },
      ];
  }
}

function cells(parts: readonly SheetCell[], into: HTMLElement): void {
  for (const part of parts) {
    if (part.free_text === true) {
      into.append(freeTextSpan(part.text));
    } else {
      into.append(part.text);
    }
  }
}

function renderSheetRow(row: SheetRow): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'sheet-number';
  container.dataset.sheetId = row.id;
  const label = document.createElement('dt');
  cells(row.label, label);
  const value = document.createElement('dd');
  if (row.value !== null) {
    const figure = document.createElement('span');
    figure.className = 'sheet-figure';
    figure.dataset.sheetValue = row.id;
    if (typeof row.value === 'string') figure.textContent = row.value;
    else cells(row.value, figure);
    value.append(figure);
  }
  if (row.resource_marking !== undefined) {
    value.append(resourceTrack(row.resource_marking));
  }
  const detail = document.createElement('p');
  detail.className = 'sheet-formula';
  if (row.id.startsWith('flavor:')) {
    detail.classList.add('sheet-flavor-value');
  }
  cells(row.detail, detail);
  value.append(detail);
  if (row.disclosure !== undefined) {
    const disclosure = document.createElement('details');
    disclosure.className = 'sheet-term-disclosure';
    const summary = document.createElement('summary');
    summary.textContent = row.disclosure.summary;
    const disclosureDetail = document.createElement('p');
    disclosureDetail.className = 'sheet-formula';
    cells(row.disclosure.detail, disclosureDetail);
    disclosure.append(summary, disclosureDetail);
    value.append(disclosure);
  }
  container.append(label, value);
  return container;
}

function renderSpellGroup(group: SheetSpellDisplayGroup): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'sheet-spell-group';
  element.dataset.spellGroup = group.id;
  if (group.heading !== null) {
    const heading = document.createElement('h3');
    heading.className = 'sheet-spell-group-heading';
    cells(group.heading, heading);
    element.append(heading);
  }

  const statistics = document.createElement('div');
  statistics.className = 'sheet-spell-statistics';
  if (group.statistics.label !== null) {
    const statisticsLabel = document.createElement('p');
    statisticsLabel.className = 'sheet-spell-statistics-label';
    statisticsLabel.textContent = group.statistics.label;
    statistics.append(statisticsLabel);
  }
  for (const line of group.statistics.lines) {
    const statistic = document.createElement('p');
    statistic.className = 'sheet-spell-statistic';
    cells(line, statistic);
    statistics.append(statistic);
  }
  element.append(statistics);

  const list = document.createElement('dl');
  list.className = 'sheet-numbers sheet-spells';
  for (const row of group.rows) {
    list.append(renderSheetRow(row));
  }
  element.append(list);
  if (group.spellbook_rows.length > 0) {
    const spellbook = document.createElement('dl');
    spellbook.className = 'sheet-numbers sheet-spells sheet-spellbook';
    spellbook.setAttribute('aria-label', 'Spellbook');
    for (const row of group.spellbook_rows) {
      spellbook.append(renderSheetRow(row));
    }
    element.append(spellbook);
  }
  return element;
}

function resourceTrack(
  marking: NonNullable<SheetRow['resource_marking']>,
): HTMLSpanElement {
  const track = document.createElement('span');
  track.className = 'sheet-resource-track';
  track.dataset.resourceShape = marking.shape;
  track.setAttribute('role', 'group');
  switch (marking.shape) {
    case 'boxes':
      track.classList.add('sheet-resource-boxes');
      track.setAttribute(
        'aria-label',
        `${String(marking.maximum)} empty boxes; mark spending on paper`,
      );
      for (let index = 0; index < marking.maximum; index += 1) {
        const box = document.createElement('span');
        box.className = 'sheet-resource-box';
        box.setAttribute('role', 'presentation');
        track.append(box);
      }
      break;
    case 'remaining': {
      track.classList.add('sheet-resource-remaining');
      track.setAttribute(
        'aria-label',
        `Remaining amount out of ${String(marking.maximum)}; fill in on paper`,
      );
      track.append('Remaining: ');
      const line = document.createElement('span');
      line.className = 'sheet-resource-remaining-line';
      line.setAttribute('role', 'presentation');
      track.append(line, ` / ${String(marking.maximum)}`);
      break;
    }
  }
  return track;
}

export function renderSheet(sheet: CharacterSheet): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'sheet-shell';
  shell.dataset.screen = 'character-sheet';

  const header = document.createElement('header');
  header.className = 'sheet-header';
  const routeActions = sheetHeaderRouteActions(sheet.character_id).map(
    (action) => {
      const link = document.createElement('a');
      link.href = action.href;
      link.dataset.routerLink = 'true';
      link.className = action.className;
      link.textContent = action.label;
      return link;
    },
  );
  const print = document.createElement('button');
  print.type = 'button';
  print.className = 'button-secondary sheet-chrome';
  print.dataset.sheetPrint = 'true';
  print.textContent = 'Print character sheet';
  const heading = document.createElement('h1');
  heading.append('Character sheet — ');
  heading.append(freeTextSpan(sheet.name));
  header.append(...routeActions, print, heading);
  const hasFlavorAppendix = flavorAppendix(sheet) !== null;
  const hasSpellAppendix = spellAppendix(sheet) !== null;
  if (hasFlavorAppendix || hasSpellAppendix) {
    const options = document.createElement('fieldset');
    options.className = 'sheet-print-options sheet-chrome';
    const legend = document.createElement('legend');
    legend.textContent = 'Print options';
    options.append(legend);
    if (hasFlavorAppendix) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `sheet-print-flavor-${String(sheet.character_id)}`;
      input.dataset.sheetPrintOption = 'flavor-appendix';
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = 'Include full backstory and notes appendix';
      options.append(input, label);
    }
    if (hasSpellAppendix) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `sheet-print-spells-${String(sheet.character_id)}`;
      input.dataset.sheetPrintOption = 'spells-appendix';
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = 'Include full spell text appendix';
      options.append(input, label);
    }
    header.append(options);
  }
  shell.append(header);

  // THE WARNINGS COME FIRST AND ARE NOT COLLAPSIBLE. Each describes a
  // degradation of a number printed below it — a crossed armour slot, an unmet
  // Strength requirement, no starting class — so a reader who sees the number
  // without the warning has been told something false.
  if (sheet.warnings.length > 0) {
    const warnings = document.createElement('section');
    warnings.className = 'sheet-panel sheet-warnings';
    warnings.setAttribute('role', 'alert');
    const warningHeading = document.createElement('h2');
    warningHeading.textContent = 'Warnings about these numbers';
    const list = document.createElement('ul');
    for (const warning of sheet.warnings) {
      const item = document.createElement('li');
      item.dataset.warningCode = warning.code;
      item.textContent = warning.message;
      list.append(item);
    }
    warnings.append(warningHeading, list);
    shell.append(warnings);
  }

  for (const section of sheetSections(sheet)) {
    const element = document.createElement('section');
    element.className = 'sheet-panel';
    const caption = document.createElement('h2');
    caption.textContent = section.caption;
    if ('rows' in section) {
      const list = document.createElement('dl');
      list.className = 'sheet-numbers';
      for (const row of section.rows) {
        list.append(renderSheetRow(row));
      }
      element.append(caption, list);
    } else {
      element.append(caption);
      for (const group of section.spell_groups) {
        element.append(renderSpellGroup(group));
      }
    }
    shell.append(element);
  }

  const facts = document.createElement('section');
  facts.className = 'sheet-panel';
  const factsHeading = document.createElement('h2');
  factsHeading.textContent = 'These numbers as structured data';
  const factsNote = document.createElement('p');
  factsNote.className = 'sheet-note';
  factsNote.textContent =
    'The same facts as above, as JSON. Nothing is here that is not printed ' +
    'on this page, and no free text is included.';
  const script = document.createElement('script');
  script.type = 'application/json';
  script.id = SHEET_JSON_SCRIPT_ID;
  script.textContent = JSON.stringify(sheetFacts(sheet), null, 2);
  facts.append(factsHeading, factsNote, script);
  shell.append(facts);

  return shell;
}

const PRINT_FIELD_SELECTOR = '[data-sheet-print-field]';
const PRINT_NOTICE_SELECTOR = '[data-sheet-print-notice]';
const PRINT_APPENDIX_SELECTOR = '[data-sheet-print-appendix]';

export interface SheetPrintOptions {
  readonly flavor_appendix: boolean;
  readonly spell_appendix: boolean;
  readonly [option: string]: boolean;
}

function emptyPaperEntry(kind: 'box' | 'line'): HTMLSpanElement {
  const entry = document.createElement('span');
  entry.className = `sheet-print-entry sheet-print-entry-${kind}`;
  entry.dataset.sheetPrintEntry = kind;
  entry.setAttribute('aria-label', 'Empty; fill in on paper');
  return entry;
}

function setFlavorPrintRows(
  shell: HTMLElement,
  sheet: CharacterSheet,
  printMedia: boolean,
): void {
  const values = [
    ['alignment', sheet.flavor.alignment, false],
    ['appearance', sheet.flavor.appearance, false],
    ['backstory', sheet.flavor.backstory, true],
    ['notes', sheet.flavor.notes, true],
  ] as const;
  for (const [id, value, truncatable] of values) {
    if (!presentFlavorText(value)) {
      continue;
    }
    const container = shell.querySelector<HTMLElement>(
      `[data-sheet-id="flavor:${id}"] .sheet-flavor-value`,
    );
    if (container === null) {
      throw new Error(`The printable sheet requires its ${id} flavor row.`);
    }
    const projection =
      printMedia && truncatable
        ? flavorPrintProjection(value)
        : {
            text: value,
            total_code_points: [...value].length,
            printed_code_points: [...value].length,
            continuation: null,
          };
    container.replaceChildren(freeTextSpan(projection.text));
    if (projection.continuation !== null) {
      const marker = document.createElement('span');
      marker.className = 'sheet-flavor-continuation';
      marker.dataset.sheetFlavorContinuation = id;
      marker.textContent = projection.continuation;
      container.append(marker);
    }
  }
}

function renderFlavorAppendix(
  content: FlavorAppendixContent,
): SheetPrintAppendixRegistration {
  const appendix = document.createElement('section');
  appendix.className = `${SHEET_PRINT_APPENDIX_CLASS} sheet-flavor-appendix`;
  const heading = document.createElement('h2');
  heading.textContent = content.title;
  appendix.append(heading);
  for (const entry of content.entries) {
    const section = document.createElement('section');
    section.className = 'sheet-print-appendix-section';
    section.dataset.flavorAppendixEntry = entry.id;
    const label = document.createElement('h3');
    label.textContent = `${entry.label} — unverified free text`;
    const prose = document.createElement('p');
    prose.className = `${SHEET_PRINT_APPENDIX_PROSE_CLASS} sheet-flavor-value`;
    prose.append(freeTextSpan(entry.text));
    section.append(label, prose);
    appendix.append(section);
  }
  return {
    id: content.id,
    order: content.order,
    element: appendix,
  };
}

function renderSpellAppendix(
  content: SpellAppendixContent,
): SheetPrintAppendixRegistration {
  const appendix = document.createElement('section');
  appendix.className = `${SHEET_PRINT_APPENDIX_CLASS} sheet-spell-appendix`;
  const heading = document.createElement('h2');
  heading.textContent = content.title;
  appendix.append(heading);

  if (content.missing_spell_names.length > 0) {
    const missing = document.createElement('p');
    missing.className = 'sheet-spell-appendix-missing';
    missing.append('Full spell text is unavailable for: ');
    content.missing_spell_names.forEach((name, index) => {
      if (index > 0) {
        missing.append(', ');
      }
      missing.append(freeTextSpan(name));
    });
    missing.append('.');
    appendix.append(missing);
  }

  for (const group of content.groups) {
    const groupElement = document.createElement('section');
    groupElement.className =
      'sheet-print-appendix-section sheet-spell-appendix-group';
    groupElement.dataset.spellAppendixGroup = group.id;
    const groupHeading = document.createElement('h3');
    groupHeading.append(
      freeTextSpan(group.name),
      ` — ${catalogLayerLabel(group.catalog_layer)}`,
    );
    groupElement.append(groupHeading);

    for (const card of group.cards) {
      const article = document.createElement('article');
      article.className = 'sheet-spell-appendix-card';
      article.dataset.spellAppendixCard = String(card.spell_version_id);
      article.dataset.spellAppendixPagination = card.pagination;
      const summary = document.createElement('div');
      summary.className = 'sheet-spell-appendix-summary';
      const cardHeading = document.createElement('h4');
      cardHeading.append(
        freeTextSpan(card.name),
        ` — ${card.level} · ${card.school} · ${catalogLayerLabel(card.catalog_layer)}`,
      );
      if (card.edition_marker !== null) {
        cardHeading.append(` · ${card.edition_marker}`);
      }
      summary.append(cardHeading);

      const facts = document.createElement('dl');
      facts.className = 'sheet-spell-appendix-facts';
      for (const fact of [...card.facts, ...card.supplemental]) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        term.textContent = fact.label;
        const value = document.createElement('dd');
        value.textContent = fact.value;
        row.append(term, value);
        facts.append(row);
      }
      summary.append(facts);

      const prose = document.createElement('p');
      prose.className =
        `${SHEET_PRINT_APPENDIX_PROSE_CLASS} sheet-spell-appendix-prose`;
      switch (card.description.status) {
        case 'recorded':
          prose.textContent = card.description.text;
          break;
        case 'absent':
          prose.textContent = card.description.disclosure;
          break;
      }
      article.append(summary, prose);
      groupElement.append(article);
    }
    appendix.append(groupElement);
  }

  return {
    id: content.id,
    order: content.order,
    element: appendix,
  };
}

/**
 * Shared relative-order compositor. Future appendix producers register an
 * order and element; no producer owns a closed list of appendix kinds.
 */
export function composeSheetPrintAppendices(
  shell: HTMLElement,
  registrations: readonly SheetPrintAppendixRegistration[],
): void {
  for (const appendix of Array.from(
    shell.querySelectorAll(PRINT_APPENDIX_SELECTOR),
  )) {
    appendix.remove();
  }
  const notice = shell.querySelector(PRINT_NOTICE_SELECTOR);
  for (const registration of orderedSheetPrintAppendices(registrations)) {
    registration.element.dataset.sheetPrintAppendix = registration.id;
    shell.insertBefore(registration.element, notice);
  }
}

export function orderedSheetPrintAppendices(
  registrations: readonly SheetPrintAppendixRegistration[],
): readonly SheetPrintAppendixRegistration[] {
  return [...registrations].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id),
  );
}

/**
 * D88/D89/D104/D125: play-state is paper state. The empty writing surfaces and
 * attribution notice exist only while print media is active; they are
 * deliberately not hidden screen DOM, because the sheet's D4 invariant says
 * its screen subtree contains no concealed content.
 */
export function setSheetPrintContent(
  shell: HTMLElement,
  sheet: CharacterSheet,
  printMedia: boolean,
  options: SheetPrintOptions,
): void {
  for (const field of Array.from(
    shell.querySelectorAll(PRINT_FIELD_SELECTOR),
  )) {
    field.remove();
  }
  composeSheetPrintAppendices(shell, []);
  shell.querySelector(PRINT_NOTICE_SELECTOR)?.remove();
  setFlavorPrintRows(shell, sheet, printMedia);
  if (!printMedia) {
    return;
  }

  const hitPointValue = shell.querySelector<HTMLElement>(
    '[data-sheet-id="hit_point_maximum"] dd',
  );
  if (hitPointValue === null) {
    throw new Error('The printable sheet requires its hit point maximum row.');
  }
  const currentHitPoints = document.createElement('span');
  currentHitPoints.className = 'sheet-print-current-hp';
  currentHitPoints.dataset.sheetPrintField = 'current-hit-points';
  const currentHitPointLabel = document.createElement('span');
  currentHitPointLabel.textContent = 'Current HP';
  currentHitPoints.append(
    currentHitPointLabel,
    emptyPaperEntry('box'),
  );
  hitPointValue.insertBefore(
    currentHitPoints,
    hitPointValue.querySelector('.sheet-formula'),
  );

  const totalLevel = shell.querySelector<HTMLElement>(
    '[data-sheet-id="total_level"]',
  );
  if (totalLevel === null) {
    throw new Error('The printable sheet requires its total level row.');
  }
  const experiencePoints = document.createElement('div');
  experiencePoints.className = 'sheet-number sheet-print-xp';
  experiencePoints.dataset.sheetPrintField = 'experience-points';
  const experiencePointsLabel = document.createElement('dt');
  experiencePointsLabel.textContent = 'Experience points';
  const experiencePointsValue = document.createElement('dd');
  experiencePointsValue.append(emptyPaperEntry('line'));
  experiencePoints.append(experiencePointsLabel, experiencePointsValue);
  totalLevel.after(experiencePoints);

  const appendices: SheetPrintAppendixRegistration[] = [];
  const flavorContent = flavorAppendix(sheet);
  if (options.flavor_appendix && flavorContent !== null) {
    appendices.push(renderFlavorAppendix(flavorContent));
  }
  const spellContent = spellAppendix(sheet);
  if (options.spell_appendix && spellContent !== null) {
    appendices.push(renderSpellAppendix(spellContent));
  }
  composeSheetPrintAppendices(shell, appendices);

  const notice = document.createElement('section');
  notice.className = 'sheet-print-notice';
  notice.dataset.sheetPrintNotice = 'true';
  const noticeHeading = document.createElement('h2');
  noticeHeading.textContent = 'SRD 5.2 attribution';
  const attribution = document.createElement('p');
  attribution.textContent = SRD_ATTRIBUTION_NOTICE;
  const origin = document.createElement('p');
  origin.textContent = `Printed from SRD-55 ${BUILD_ID}`;
  notice.append(noticeHeading, attribution, origin);
  shell.append(notice);
}
