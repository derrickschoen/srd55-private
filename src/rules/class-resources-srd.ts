import classLevelTables from '../../docs/srd/source/class-level-tables.txt?raw';
import srdFullText from '../../docs/srd/full/srd-5.2.1.txt?raw';
import type { DatabaseContext } from '../db/database';
import {
  decodeClassResourceFormula,
  type ClassFormulaResourceKind,
  type ClassResourceFormula,
  type ClassResourceKind,
  type PositiveInteger,
  type PositiveResourceMaximum,
  type ResourceFormulaAbility,
} from '../domain/class-resources';
import {
  characterLevels,
  type CharacterLevel,
} from '../domain/enums';
import type { ClassLevel, ContentKey } from '../domain/ids';
import { rowContractError } from '../domain/contracts/rows';
import { parseSrdClassLevelFeatures } from './class-level-features-srd';

export class SrdClassResourcesError extends Error {
  constructor(message: string) {
    super(`SRD class resources: ${message}`);
    this.name = 'SrdClassResourcesError';
  }
}

const CLASS_NAMES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

type BundledClassName = (typeof CLASS_NAMES)[number];

function contentKey(className: BundledClassName): ContentKey {
  return `2024:class:${className.toLowerCase()}` as ContentKey;
}

const BUNDLED_CONTENT_KEYS = CLASS_NAMES.map(contentKey);

interface LadderConfiguration {
  readonly kind: ClassResourceKind;
  readonly header: string;
  readonly header_anchor: string;
  readonly acquisition_level: CharacterLevel;
}

const LADDER_CONFIG: Readonly<
  Record<BundledClassName, LadderConfiguration | null>
> = {
  Barbarian: {
    kind: 'rage',
    header: 'Rages',
    header_anchor: 'Rages',
    acquisition_level: 1,
  },
  Bard: null,
  Cleric: {
    kind: 'channel_divinity',
    header: 'Channel Divinity',
    header_anchor: 'Divinity',
    acquisition_level: 2,
  },
  Druid: {
    kind: 'wild_shape',
    header: 'Wild Shape',
    header_anchor: 'Shape',
    acquisition_level: 2,
  },
  Fighter: {
    kind: 'second_wind',
    header: 'Second Wind',
    header_anchor: 'Wind',
    acquisition_level: 1,
  },
  Monk: {
    kind: 'focus_points',
    header: 'Focus Points',
    header_anchor: 'Points',
    acquisition_level: 2,
  },
  Paladin: {
    kind: 'channel_divinity',
    header: 'Channel Divinity',
    header_anchor: 'Divinity',
    acquisition_level: 3,
  },
  Ranger: {
    kind: 'favored_enemy',
    header: 'Favored Enemy',
    header_anchor: 'Enemy',
    acquisition_level: 1,
  },
  Rogue: null,
  Sorcerer: {
    kind: 'sorcery_points',
    header: 'Sorcery Points',
    header_anchor: 'Points',
    acquisition_level: 2,
  },
  Warlock: null,
  Wizard: null,
};

export interface SrdClassResourceLadder {
  readonly content_key: ContentKey;
  readonly class_name: BundledClassName;
  readonly resource_kind: ClassResourceKind;
  readonly maxima: readonly number[];
}

export interface SrdClassResourceManifestEntry {
  readonly content_key: ContentKey;
  readonly class_name: BundledClassName;
  readonly expected_resource_kinds: readonly ClassResourceKind[];
  readonly ladders: readonly SrdClassResourceLadder[];
}

interface ClassTableSection {
  readonly class_name: string;
  readonly body: string;
}

const SECTION_MARKER =
  /^=== (?<className>[A-Za-z]+) Features table — printed page \d+ ===$/gm;
const LEVEL_ROW = /^\s*(?<level>[1-9]|1\d|20)\s+\+[2-6]\s+(?<cells>.*)$/;
const TABLE_CELL = /\S+/g;
const KNOWN_RESOURCE_HEADERS = [
  ['Rages', /\bRages\b/],
  ['Channel Divinity', /\bChannel\b.*\bDivinity\b/],
  ['Wild Shape', /\bWild\b.*\bShape\b/],
  ['Second Wind', /\bSecond\b.*\bWind\b/],
  ['Focus Points', /\bFocus\b.*\bPoints\b/],
  ['Favored Enemy', /\bFavored\b.*\bEnemy\b/],
  ['Sorcery Points', /\bSorcery\b.*\bPoints\b/],
] as const;

function resourceLikeHeaders(header: string): string[] {
  const known: string[] = [];
  let remainder = header;
  for (const [label, pattern] of KNOWN_RESOURCE_HEADERS) {
    if (pattern.test(header)) {
      known.push(label);
      for (const word of label.split(' ')) {
        remainder = remainder.replace(new RegExp(`\\b${word}\\b`), ' ');
      }
    }
  }
  const generic = remainder.match(/\b[A-Za-z]+ (?:Points|Uses)\b/g) ?? [];
  return [...new Set([...known, ...generic])];
}

function sections(source: string): ClassTableSection[] {
  const markers = [...source.matchAll(SECTION_MARKER)];
  if (markers.length === 0) {
    throw new SrdClassResourcesError('class level-table extract has no class sections.');
  }
  return markers.map((marker, index) => {
    const className = marker.groups?.className;
    if (className === undefined || marker.index === undefined) {
      throw new SrdClassResourcesError('class level-table extract has an invalid section marker.');
    }
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    return { class_name: className, body: source.slice(start, end) };
  });
}

function normalizedHeader(body: string): string {
  const lines = body.split('\n');
  const firstRow = lines.findIndex((line) => LEVEL_ROW.test(line));
  if (firstRow < 0) {
    throw new SrdClassResourcesError('class table has no level rows.');
  }
  return lines.slice(0, firstRow).join(' ').replace(/\s+/g, ' ').trim();
}

function parseLadder(
  className: BundledClassName,
  body: string,
  configuration: LadderConfiguration,
): SrdClassResourceLadder {
  const header = normalizedHeader(body);
  const resourceHeaders = resourceLikeHeaders(header);
  if (
    resourceHeaders.length !== 1 ||
    resourceHeaders[0] !== configuration.header
  ) {
    throw new SrdClassResourcesError(
      `${className} table resource headers are ${JSON.stringify(resourceHeaders)}, expected ${configuration.header}.`,
    );
  }

  const headerLines = body.split('\n').slice(
    0,
    body.split('\n').findIndex((line) => LEVEL_ROW.test(line)),
  );
  const anchorPositions = headerLines.flatMap((line) => {
    const position = line.indexOf(configuration.header_anchor);
    return position < 0 ? [] : [position];
  });
  if (anchorPositions.length !== 1) {
    throw new SrdClassResourcesError(
      `${className} table has ${String(anchorPositions.length)} ${configuration.header_anchor} column anchors, expected one.`,
    );
  }
  const columnPosition = anchorPositions[0] as number;

  const maxima = new Map<CharacterLevel, number>();
  for (const line of body.split('\n')) {
    const row = LEVEL_ROW.exec(line);
    if (row?.groups === undefined) {
      continue;
    }
    const level = Number(row.groups.level);
    if (!characterLevels.includes(level as CharacterLevel)) {
      throw new SrdClassResourcesError(`${className} table has out-of-range level ${String(level)}.`);
    }
    const classLevel = level as CharacterLevel;
    if (maxima.has(classLevel)) {
      throw new SrdClassResourcesError(`${className} table repeats level ${String(level)}.`);
    }
    const cellText = row.groups.cells;
    if (cellText === undefined) {
      throw new SrdClassResourcesError(`${className} level ${String(level)} has no table cells.`);
    }
    const values = [...cellText.matchAll(TABLE_CELL)].map((match) => ({
      value: match[0],
      position: (match.index ?? 0) + line.indexOf(cellText),
    }));
    const selected = values.sort(
      (left, right) =>
        Math.abs(left.position - columnPosition) -
        Math.abs(right.position - columnPosition),
    )[0];
    if (selected === undefined || Math.abs(selected.position - columnPosition) > 10) {
      throw new SrdClassResourcesError(`${className} level ${String(level)} has no ${configuration.header} value.`);
    }
    const rawMaximum = selected.value;
    if (rawMaximum !== '—' && !/^\d+$/.test(rawMaximum)) {
      throw new SrdClassResourcesError(
        `${className} level ${String(level)} ${configuration.header} is not an integer count.`,
      );
    }
    if (level < configuration.acquisition_level && rawMaximum !== '—') {
      throw new SrdClassResourcesError(
        `${className} level ${String(level)} must use a dash before ${configuration.header} is acquired.`,
      );
    }
    const maximum = rawMaximum === '—' ? 0 : Number(rawMaximum);
    if (level >= configuration.acquisition_level && maximum <= 0) {
      throw new SrdClassResourcesError(
        `${className} level ${String(level)} must have a positive ${configuration.header} count after acquisition.`,
      );
    }
    maxima.set(classLevel, maximum);
  }
  if (
    maxima.size !== characterLevels.length ||
    characterLevels.some((level) => !maxima.has(level))
  ) {
    throw new SrdClassResourcesError(`${className} table does not enumerate resource levels 1..20.`);
  }
  return {
    content_key: contentKey(className),
    class_name: className,
    resource_kind: configuration.kind,
    maxima: characterLevels.map((level) => maxima.get(level) as number),
  };
}

/** Parse all twelve class headings and the exact eight complete ladders. */
export function parseSrdClassResourceManifest(
  source: string = classLevelTables,
): SrdClassResourceManifestEntry[] {
  const parsedSections = sections(source);
  if (
    parsedSections.length !== CLASS_NAMES.length ||
    parsedSections.some(
      (section, index) => section.class_name !== CLASS_NAMES[index],
    )
  ) {
    throw new SrdClassResourcesError(
      `expected the twelve class tables in source order; found ${parsedSections.map((entry) => entry.class_name).join(', ')}.`,
    );
  }
  return CLASS_NAMES.map((className, index) => {
    const body = (parsedSections[index] as ClassTableSection).body;
    const configuration = LADDER_CONFIG[className];
    const resourceHeaders = resourceLikeHeaders(normalizedHeader(body));
    if (configuration === null) {
      if (resourceHeaders.length !== 0) {
        throw new SrdClassResourcesError(
          `${className} has unexpected resource-like headers ${JSON.stringify(resourceHeaders)}.`,
        );
      }
      return {
        content_key: contentKey(className),
        class_name: className,
        expected_resource_kinds: [],
        ladders: [],
      };
    }
    const ladder = parseLadder(className, body, configuration);
    return {
      content_key: contentKey(className),
      class_name: className,
      expected_resource_kinds: [configuration.kind],
      ladders: [ladder],
    };
  });
}

function sourceReadingOrder(source: string): string {
  const pages = source.split('\f').map((page) => {
    const lines = page.split('\n');
    const left = lines.map((line) => line.slice(0, 62)).join('\n');
    const right = lines.map((line) => line.slice(62)).join('\n');
    return `${left}\n${right}`;
  });
  return pages
    .join('\n')
    .replace(/-\s*\n\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function occurrenceCount(source: string, needle: string): number {
  let count = 0;
  let offset = 0;
  while (true) {
    const found = source.indexOf(needle, offset);
    if (found < 0) {
      return count;
    }
    count += 1;
    offset = found + needle.length;
  }
}

const FULL_TEXT_CLASS_SECTION_MARKER =
  /\b(?<className>Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard) Class Features\b/g;

function fullTextClassSections(source: string): ReadonlyMap<BundledClassName, string> {
  const markers = [...source.matchAll(FULL_TEXT_CLASS_SECTION_MARKER)];
  if (
    markers.length !== CLASS_NAMES.length ||
    markers.some((marker, index) => marker.groups?.className !== CLASS_NAMES[index])
  ) {
    throw new SrdClassResourcesError(
      `expected the twelve full-text class sections in source order; found ${markers.map((marker) => marker.groups?.className ?? '?').join(', ')}.`,
    );
  }
  return new Map(
    markers.map((marker, index): [BundledClassName, string] => {
      const className = marker.groups?.className as BundledClassName;
      const start = (marker.index as number) + marker[0].length;
      const end = markers[index + 1]?.index ?? source.length;
      return [className, source.slice(start, end)];
    }),
  );
}

function featureBlock(
  source: string,
  classSections: ReadonlyMap<BundledClassName, string>,
  className: BundledClassName,
  heading: string,
): string {
  const count = occurrenceCount(source, heading);
  if (count !== 1) {
    throw new SrdClassResourcesError(`${heading} occurs ${String(count)} times, expected once.`);
  }
  const classSection = classSections.get(className);
  if (classSection === undefined || !classSection.includes(heading)) {
    throw new SrdClassResourcesError(`${heading} occurs outside the ${className} class section.`);
  }
  const start = classSection.indexOf(heading);
  const next = / Level (?:[1-9]|1\d|20): /.exec(
    classSection.slice(start + heading.length),
  );
  const end = next === null
    ? classSection.length
    : start + heading.length + next.index;
  return classSection.slice(start, end);
}

function requireEvidence(block: string, pattern: RegExp, label: string): RegExpExecArray {
  const match = pattern.exec(block);
  if (match === null) {
    throw new SrdClassResourcesError(`${label} no longer matches its cited source phrase.`);
  }
  return match;
}

function level(value: number): ClassLevel {
  if (!characterLevels.includes(value as CharacterLevel)) {
    throw new SrdClassResourcesError(`formula level ${String(value)} is outside 1..20.`);
  }
  return value as ClassLevel;
}

function maximum(value: number): PositiveResourceMaximum {
  if (!Number.isInteger(value) || value < 1) {
    throw new SrdClassResourcesError(`formula count ${String(value)} is not positive.`);
  }
  return value as PositiveResourceMaximum;
}

function countWord(value: string): PositiveResourceMaximum {
  switch (value.toLowerCase()) {
    case 'once':
    case 'one':
      return maximum(1);
    case 'twice':
    case 'two':
      return maximum(2);
    case 'three':
      return maximum(3);
    case 'five':
      return maximum(5);
    default:
      throw new SrdClassResourcesError(`unsupported source count word ${value}.`);
  }
}

export type UnmodelledClassResourceFeature =
  | 'arcane_recovery'
  | 'mystic_arcanum'
  | 'signature_spells';

export interface SrdClassResourceFormulaEntry {
  readonly content_key: ContentKey;
  readonly class_name: BundledClassName;
  readonly resource_kind: ClassFormulaResourceKind;
  readonly formula: ClassResourceFormula;
  readonly citation: string;
}

export interface SrdUnmodelledClassResourceEntry {
  readonly content_key: ContentKey;
  readonly class_name: BundledClassName;
  readonly resource_kind: UnmodelledClassResourceFeature;
  readonly citation: string;
}

export interface SrdClassResourceFormulaManifest {
  readonly formulas: readonly SrdClassResourceFormulaEntry[];
  readonly unmodelled: readonly SrdUnmodelledClassResourceEntry[];
}

interface FixedFormulaSource {
  readonly class_name: BundledClassName;
  readonly resource_kind: ClassFormulaResourceKind;
  readonly heading: string;
  readonly evidence: RegExp;
  readonly count_group?: number;
  readonly citation: string;
}

const FIXED_FORMULAS: readonly FixedFormulaSource[] = [
  { class_name: 'Barbarian', resource_kind: 'persistent_rage_recovery', heading: 'Level 15: Persistent Rage', evidence: /After you regain uses of Rage in this way, you can’t do so again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:1897-1901' },
  { class_name: 'Cleric', resource_kind: 'divine_intervention', heading: 'Level 10: Divine Intervention', evidence: /You can’t use this feature again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:2339-2348' },
  { class_name: 'Druid', resource_kind: 'wild_resurgence_conversion', heading: 'Level 5: Wild Resurgence', evidence: /you can’t do so again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:2618-2625' },
  { class_name: 'Druid', resource_kind: 'nature_magician_conversion', heading: 'Level 20: Archdruid', evidence: /Nature Magician\..*?Once you use this benefit, you can’t do so again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:2657-2670' },
  { class_name: 'Monk', resource_kind: 'uncanny_metabolism', heading: 'Level 2: Uncanny Metabolism', evidence: /Once you use this feature, you can’t use it again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:3089-3095' },
  { class_name: 'Paladin', resource_kind: 'paladins_smite', heading: 'Level 2: Paladin’s Smite', evidence: /cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again\./, citation: 'srd-5.2.1.txt:3262-3266' },
  { class_name: 'Paladin', resource_kind: 'faithful_steed', heading: 'Level 5: Faithful Steed', evidence: /cast the spell (once) without expending a spell slot/, count_group: 1, citation: 'srd-5.2.1.txt:3334-3339' },
  { class_name: 'Rogue', resource_kind: 'stroke_of_luck', heading: 'Level 20: Stroke of Luck', evidence: /Once you use this feature, you can’t use it again until you finish a Short or Long Rest\./, citation: 'srd-5.2.1.txt:3816-3821' },
  { class_name: 'Sorcerer', resource_kind: 'innate_sorcery', heading: 'Level 1: Innate Sorcery', evidence: /You can use this feature (twice), and you regain all expended uses of it when you finish a Long Rest\./, count_group: 1, citation: 'srd-5.2.1.txt:3936-3951' },
  { class_name: 'Sorcerer', resource_kind: 'sorcerous_restoration', heading: 'Level 5: Sorcerous Restoration', evidence: /Once you use this feature, you can’t do so again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:3969-3974' },
  { class_name: 'Warlock', resource_kind: 'magical_cunning', heading: 'Level 2: Magical Cunning', evidence: /Once you use this feature, you can’t do so again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:4330-4335' },
  { class_name: 'Warlock', resource_kind: 'contact_patron', heading: 'Level 9: Contact Patron', evidence: /Once you cast the spell with this feature, you can’t do so in this way again until you finish a Long Rest\./, citation: 'srd-5.2.1.txt:4351-4360' },
];

interface AbilityFormulaSource {
  readonly class_name: BundledClassName;
  readonly resource_kind: ClassFormulaResourceKind;
  readonly heading: string;
  readonly citation: string;
}

const ABILITY_FORMULAS: readonly AbilityFormulaSource[] = [
  { class_name: 'Bard', resource_kind: 'bardic_inspiration', heading: 'Level 1: Bardic Inspiration', citation: 'srd-5.2.1.txt:1949-2002' },
  { class_name: 'Ranger', resource_kind: 'tireless', heading: 'Level 10: Tireless', citation: 'srd-5.2.1.txt:3544-3553' },
  { class_name: 'Ranger', resource_kind: 'natures_veil', heading: 'Level 14: Nature’s Veil', citation: 'srd-5.2.1.txt:3563-3570' },
];

function headingLevel(heading: string): ClassLevel {
  const match = /^Level (?<level>\d+):/.exec(heading);
  if (match?.groups?.level === undefined) {
    throw new SrdClassResourcesError(`${heading} has no acquisition level.`);
  }
  return level(Number(match.groups.level));
}

function fighterSteps(
  source: string,
  feature: 'Action Surge' | 'Indomitable',
): ClassResourceFormula {
  const fighter = parseSrdClassLevelFeatures(source).find(
    (entry) => entry.class_name === 'Fighter',
  );
  if (fighter === undefined) {
    throw new SrdClassResourcesError('Fighter class table is missing.');
  }
  const pattern = new RegExp(`${feature} \\((one|two|three) uses?\\)`);
  const steps = fighter.levels.flatMap((entry) => {
    const match = pattern.exec(entry.feature_cell);
    return match?.[1] === undefined
      ? []
      : [{ minimum_class_level: entry.class_level as ClassLevel, count: countWord(match[1]) }];
  });
  const expectedLength = feature === 'Action Surge' ? 2 : 3;
  if (steps.length !== expectedLength) {
    throw new SrdClassResourcesError(`${feature} has ${String(steps.length)} table steps, expected ${String(expectedLength)}.`);
  }
  return {
    kind: 'fixed_count_by_class_level',
    steps: steps as [
      { readonly minimum_class_level: ClassLevel; readonly count: PositiveResourceMaximum },
      ...Array<{ readonly minimum_class_level: ClassLevel; readonly count: PositiveResourceMaximum }>,
    ],
  };
}

/** Parse the eighteen formulas and positively classify the three exclusions. */
export function parseSrdClassResourceFormulaManifest(
  fullSource: string = srdFullText,
  tableSource: string = classLevelTables,
): SrdClassResourceFormulaManifest {
  const source = sourceReadingOrder(fullSource);
  const classSections = fullTextClassSections(source);
  const formulas: SrdClassResourceFormulaEntry[] = [];

  for (const fixed of FIXED_FORMULAS) {
    const block = featureBlock(
      source,
      classSections,
      fixed.class_name,
      fixed.heading,
    );
    const evidence = requireEvidence(block, fixed.evidence, fixed.heading);
    const count = fixed.count_group === undefined
      ? maximum(1)
      : countWord(evidence[fixed.count_group] as string);
    formulas.push({
      content_key: contentKey(fixed.class_name),
      class_name: fixed.class_name,
      resource_kind: fixed.resource_kind,
      formula: {
        kind: 'fixed_count',
        minimum_class_level: headingLevel(fixed.heading),
        count,
      },
      citation: fixed.citation,
    });
  }

  for (const abilitySource of ABILITY_FORMULAS) {
    const block = featureBlock(
      source,
      classSections,
      abilitySource.class_name,
      abilitySource.heading,
    );
    const evidence = requireEvidence(
      block,
      /number of times equal to your (Charisma|Wisdom) modifier \(minimum of once\)/,
      abilitySource.heading,
    );
    const ability = (evidence[1] as string).toLowerCase();
    if (ability !== 'charisma' && ability !== 'wisdom') {
      throw new SrdClassResourcesError(`${abilitySource.heading} uses an unsupported ability.`);
    }
    formulas.push({
      content_key: contentKey(abilitySource.class_name),
      class_name: abilitySource.class_name,
      resource_kind: abilitySource.resource_kind,
      formula: {
        kind: 'ability_modifier_minimum_one',
        minimum_class_level: headingLevel(abilitySource.heading),
        ability: ability as ResourceFormulaAbility,
      },
      citation: abilitySource.citation,
    });
  }

  const layOnHandsHeading = 'Level 1: Lay On Hands';
  const layOnHands = requireEvidence(
    featureBlock(source, classSections, 'Paladin', layOnHandsHeading),
    /equal to (five) times your Paladin level/,
    layOnHandsHeading,
  );
  formulas.push({
    content_key: contentKey('Paladin'),
    class_name: 'Paladin',
    resource_kind: 'lay_on_hands',
    formula: {
      kind: 'class_level_multiple',
      minimum_class_level: level(1),
      multiplier: Number(countWord(layOnHands[1] as string)) as PositiveInteger,
    },
    citation: 'srd-5.2.1.txt:3206-3211',
  });

  const stepped = [
    {
      resource_kind: 'action_surge' as const,
      heading: 'Level 2: Action Surge',
      evidence: /Starting at level 17, you can use it twice before a rest/,
      citation: 'class-level-tables.txt:120-135; srd-5.2.1.txt:2938-2945',
      feature: 'Action Surge' as const,
    },
    {
      resource_kind: 'indomitable' as const,
      heading: 'Level 9: Indomitable',
      evidence: /twice before a Long Rest starting at level 13 and three times before a Long Rest starting at level 17/,
      citation: 'class-level-tables.txt:127-135; srd-5.2.1.txt:2928-2935',
      feature: 'Indomitable' as const,
    },
  ];
  for (const entry of stepped) {
    requireEvidence(
      featureBlock(source, classSections, 'Fighter', entry.heading),
      entry.evidence,
      entry.heading,
    );
    formulas.push({
      content_key: contentKey('Fighter'),
      class_name: 'Fighter',
      resource_kind: entry.resource_kind,
      formula: fighterSteps(tableSource, entry.feature),
      citation: entry.citation,
    });
  }

  const unmodelled: SrdUnmodelledClassResourceEntry[] = [
    { content_key: contentKey('Wizard'), class_name: 'Wizard', resource_kind: 'arcane_recovery', citation: 'srd-5.2.1.txt:4671-4683' },
    { content_key: contentKey('Warlock'), class_name: 'Warlock', resource_kind: 'mystic_arcanum', citation: 'srd-5.2.1.txt:4362-4374' },
    { content_key: contentKey('Wizard'), class_name: 'Wizard', resource_kind: 'signature_spells', citation: 'srd-5.2.1.txt:4763-4771' },
  ];
  const absentEvidence = [
    ['Wizard', 'Level 1: Arcane Recovery', /combined level equal to no more than half your Wizard level/],
    ['Warlock', 'Level 11: Mystic Arcanum', /Choose one level 6 Warlock spell.*?cast your arcanum spell once/],
    ['Wizard', 'Level 20: Signature Spells', /Choose two level 3 spells.*?cast each of them once/],
  ] as const;
  for (const [className, heading, evidence] of absentEvidence) {
    requireEvidence(
      featureBlock(source, classSections, className, heading),
      evidence,
      heading,
    );
  }

  if (formulas.length !== 18) {
    throw new SrdClassResourcesError(`formula parser produced ${String(formulas.length)} rows, expected 18.`);
  }
  const keys = new Set(formulas.map((entry) => `${entry.content_key}|${entry.resource_kind}`));
  if (keys.size !== formulas.length) {
    throw new SrdClassResourcesError('formula parser produced a duplicate class/resource pair.');
  }
  return { formulas, unmodelled };
}

export function bundledClassResourceRows(): readonly {
  readonly content_key: ContentKey;
  readonly resource_kind: ClassResourceKind;
  readonly class_level: ClassLevel;
  readonly maximum: number;
}[] {
  return parseSrdClassResourceManifest().flatMap((entry) =>
    entry.ladders.flatMap((ladder) =>
      ladder.maxima.map((value, index) => ({
        content_key: entry.content_key,
        resource_kind: ladder.resource_kind,
        class_level: level(index + 1),
        maximum: value,
      })),
    ),
  );
}

function formulaColumns(formula: ClassResourceFormula): {
  readonly formula_kind: ClassResourceFormula['kind'];
  readonly minimum_class_level: number;
  readonly fixed_count: number | null;
  readonly ability: ResourceFormulaAbility | null;
  readonly multiplier: number | null;
  readonly later_fixed_count_steps: string | null;
} {
  switch (formula.kind) {
    case 'fixed_count':
      return { formula_kind: formula.kind, minimum_class_level: formula.minimum_class_level, fixed_count: formula.count, ability: null, multiplier: null, later_fixed_count_steps: null };
    case 'fixed_count_by_class_level': {
      const [first, ...later] = formula.steps;
      return { formula_kind: formula.kind, minimum_class_level: first.minimum_class_level, fixed_count: first.count, ability: null, multiplier: null, later_fixed_count_steps: JSON.stringify(later) };
    }
    case 'ability_modifier_minimum_one':
      return { formula_kind: formula.kind, minimum_class_level: formula.minimum_class_level, fixed_count: null, ability: formula.ability, multiplier: null, later_fixed_count_steps: null };
    case 'class_level_multiple':
      return { formula_kind: formula.kind, minimum_class_level: formula.minimum_class_level, fixed_count: null, ability: null, multiplier: formula.multiplier, later_fixed_count_steps: null };
  }
}

function formulaKey(contentKeyValue: string, resourceKind: string): string {
  return `${contentKeyValue}|${resourceKind}`;
}

function ladderKey(contentKeyValue: string, resourceKind: string, classLevel: number): string {
  return `${contentKeyValue}|${resourceKind}|${String(classLevel)}`;
}

function sameFormula(left: ClassResourceFormula, right: ClassResourceFormula): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

interface BundledClassResourceExpectation {
  readonly ladders: ReturnType<typeof bundledClassResourceRows>;
  readonly formulas: SrdClassResourceFormulaManifest['formulas'];
}

function bundledClassResourceExpectation(): BundledClassResourceExpectation {
  return {
    ladders: bundledClassResourceRows(),
    formulas: parseSrdClassResourceFormulaManifest().formulas,
  };
}

/** Exact tuple-and-value boot guard for both independently sourced catalogs. */
function hasExpectedBundledClassResourceContent(
  db: DatabaseContext,
  expected: BundledClassResourceExpectation,
): boolean {
  const placeholders = BUNDLED_CONTENT_KEYS.map(() => '?').join(', ');
  const actualLadders = db.all(
    `SELECT definition.content_key, resource.resource_kind,
            resource.class_level, resource.maximum
       FROM class_resources AS resource
       JOIN class_definitions AS definition
         ON definition.id = resource.class_definition_id
      WHERE definition.content_key IN (${placeholders})`,
    [...BUNDLED_CONTENT_KEYS],
    (row) => ({
      content_key: String(row.content_key),
      resource_kind: String(row.resource_kind),
      class_level: Number(row.class_level),
      maximum: Number(row.maximum),
    }),
  );
  if (actualLadders.length !== expected.ladders.length) {
    return false;
  }
  const actualLadderMap = new Map(
    actualLadders.map((row) => [
      ladderKey(row.content_key, row.resource_kind, row.class_level),
      row.maximum,
    ]),
  );
  if (
    expected.ladders.some(
      (row) =>
        actualLadderMap.get(
          ladderKey(row.content_key, row.resource_kind, row.class_level),
        ) !== row.maximum,
    )
  ) {
    return false;
  }

  const actualFormulaRows = db.allRaw(
    `SELECT definition.content_key, formula.resource_kind,
            formula.formula_kind, formula.minimum_class_level,
            formula.fixed_count, formula.ability, formula.multiplier,
            formula.later_fixed_count_steps
       FROM class_resource_formulas AS formula
       JOIN class_definitions AS definition
         ON definition.id = formula.class_definition_id
      WHERE definition.content_key IN (${placeholders})`,
    [...BUNDLED_CONTENT_KEYS],
  );
  if (actualFormulaRows.length !== expected.formulas.length) {
    return false;
  }
  const actualFormulaMap = new Map<string, ClassResourceFormula>();
  try {
    for (const row of actualFormulaRows) {
      actualFormulaMap.set(
        formulaKey(String(row.content_key), String(row.resource_kind)),
        decodeClassResourceFormula({
          formula_kind: row.formula_kind,
          minimum_class_level: row.minimum_class_level,
          fixed_count: row.fixed_count,
          ability: row.ability,
          multiplier: row.multiplier,
          later_fixed_count_steps: row.later_fixed_count_steps,
        }),
      );
    }
  } catch {
    return false;
  }
  return expected.formulas.every((entry) => {
    const actual = actualFormulaMap.get(
      formulaKey(entry.content_key, entry.resource_kind),
    );
    return actual !== undefined && sameFormula(actual, entry.formula);
  });
}

export function hasBundledClassResourceContent(db: DatabaseContext): boolean {
  return hasExpectedBundledClassResourceContent(
    db,
    bundledClassResourceExpectation(),
  );
}

function classIds(db: DatabaseContext): ReadonlyMap<string, number> {
  const placeholders = BUNDLED_CONTENT_KEYS.map(() => '?').join(', ');
  const rows = db.all(
    `SELECT id, content_key FROM class_definitions
      WHERE content_key IN (${placeholders})`,
    [...BUNDLED_CONTENT_KEYS],
    (row) => ({ id: Number(row.id), content_key: String(row.content_key) }),
  );
  const result = new Map(rows.map((row) => [row.content_key, row.id]));
  return result;
}

function assertRow(
  table: 'class_resources' | 'class_resource_formulas',
  row: Record<string, unknown>,
): void {
  const error = rowContractError(table, row, `Bundled ${table} row`);
  if (error !== null) {
    throw new SrdClassResourcesError(error);
  }
}

/** Idempotent exact repair. Correct tuples keep their ids; extra bundled rows go. */
function seedExpectedClassResources(
  db: DatabaseContext,
  expected: BundledClassResourceExpectation,
): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    const ids = classIds(db);
    const expectedLadderKeys = new Set(
      expected.ladders.map((row) => ladderKey(row.content_key, row.resource_kind, row.class_level)),
    );
    const existingLadders = db.all(
      `SELECT resource.id, definition.content_key, resource.resource_kind,
              resource.class_level
         FROM class_resources AS resource
         JOIN class_definitions AS definition
           ON definition.id = resource.class_definition_id
        WHERE definition.content_key LIKE '2024:class:%'`,
      undefined,
      (row) => ({ id: Number(row.id), content_key: String(row.content_key), resource_kind: String(row.resource_kind), class_level: Number(row.class_level) }),
    );
    for (const row of existingLadders) {
      if (
        BUNDLED_CONTENT_KEYS.includes(row.content_key as ContentKey) &&
        !expectedLadderKeys.has(ladderKey(row.content_key, row.resource_kind, row.class_level))
      ) {
        db.exec('DELETE FROM class_resources WHERE id = ?', [row.id]);
      }
    }
    for (const row of expected.ladders) {
      const classDefinitionId = ids.get(row.content_key);
      if (classDefinitionId === undefined) {
        continue;
      }
      const stored = {
        id: 1,
        class_definition_id: classDefinitionId,
        class_level: row.class_level,
        resource_kind: row.resource_kind,
        maximum: row.maximum,
        created_at: timestamp,
        updated_at: timestamp,
      };
      assertRow('class_resources', stored);
      db.exec(
        `INSERT INTO class_resources (
           class_definition_id, class_level, resource_kind, maximum,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(class_definition_id, class_level, resource_kind)
         DO UPDATE SET maximum = excluded.maximum, updated_at = excluded.updated_at`,
        [classDefinitionId, row.class_level, row.resource_kind, row.maximum, timestamp, timestamp],
      );
    }

    const expectedFormulaKeys = new Set(
      expected.formulas.map((entry) => formulaKey(entry.content_key, entry.resource_kind)),
    );
    const existingFormulas = db.all(
      `SELECT formula.id, definition.content_key, formula.resource_kind
         FROM class_resource_formulas AS formula
         JOIN class_definitions AS definition
           ON definition.id = formula.class_definition_id
        WHERE definition.content_key LIKE '2024:class:%'`,
      undefined,
      (row) => ({ id: Number(row.id), content_key: String(row.content_key), resource_kind: String(row.resource_kind) }),
    );
    for (const row of existingFormulas) {
      if (
        BUNDLED_CONTENT_KEYS.includes(row.content_key as ContentKey) &&
        !expectedFormulaKeys.has(formulaKey(row.content_key, row.resource_kind))
      ) {
        db.exec('DELETE FROM class_resource_formulas WHERE id = ?', [row.id]);
      }
    }
    for (const entry of expected.formulas) {
      const classDefinitionId = ids.get(entry.content_key);
      if (classDefinitionId === undefined) {
        continue;
      }
      const columns = formulaColumns(entry.formula);
      const stored = {
        id: 1,
        class_definition_id: classDefinitionId,
        resource_kind: entry.resource_kind,
        ...columns,
        created_at: timestamp,
        updated_at: timestamp,
      };
      assertRow('class_resource_formulas', stored);
      db.exec(
        `INSERT INTO class_resource_formulas (
           class_definition_id, resource_kind, formula_kind,
           minimum_class_level, fixed_count, ability, multiplier,
           later_fixed_count_steps, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(class_definition_id, resource_kind) DO UPDATE SET
           formula_kind = excluded.formula_kind,
           minimum_class_level = excluded.minimum_class_level,
           fixed_count = excluded.fixed_count,
           ability = excluded.ability,
           multiplier = excluded.multiplier,
           later_fixed_count_steps = excluded.later_fixed_count_steps,
           updated_at = excluded.updated_at`,
        [classDefinitionId, entry.resource_kind, columns.formula_kind, columns.minimum_class_level, columns.fixed_count, columns.ability, columns.multiplier, columns.later_fixed_count_steps, timestamp, timestamp],
      );
    }
  });
}

export function seedClassResources(db: DatabaseContext): void {
  seedExpectedClassResources(db, bundledClassResourceExpectation());
}

/** Boot-time entry point. Returns whether exact repair wrote anything. */
export function ensureBundledClassResources(db: DatabaseContext): boolean {
  const expected = bundledClassResourceExpectation();
  if (hasExpectedBundledClassResourceContent(db, expected)) {
    return false;
  }
  seedExpectedClassResources(db, expected);
  return true;
}
