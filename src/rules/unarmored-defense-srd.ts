/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE TWO AUTOMATIC UNARMORED DEFENSE FORMULAS.
 *
 * `docs/srd/source/unarmored-defense.txt` prints the Barbarian and Monk
 * level-1 features. The parser reads both load-bearing differences from that
 * text: Constitution versus Wisdom, and whether wielding a Shield preserves
 * or breaks the formula. Neither fact is inferred from the class name.
 */
import extract from '../../docs/srd/source/unarmored-defense.txt?raw';
import {
  abilities,
  isEnumValue,
  type Ability,
} from '../domain/enums';

const UNARMORED_DEFENSE_CLASSES = ['Barbarian', 'Monk'] as const;
type UnarmoredDefenseClass = (typeof UNARMORED_DEFENSE_CLASSES)[number];

export interface SrdUnarmoredDefenseFeature {
  readonly class_name: UnarmoredDefenseClass;
  readonly class_level: number;
  readonly name: string;
  readonly effect_kind: 'armor_class_formula';
  readonly base: number;
  readonly ability_1: Ability;
  readonly ability_2: Ability;
  readonly allows_shield: boolean;
}

export class SrdUnarmoredDefenseError extends Error {
  constructor(message: string) {
    super(`SRD Unarmored Defense: ${message}`);
    this.name = 'SrdUnarmoredDefenseError';
  }
}

const SECTION =
  /^=== (?<className>Barbarian|Monk) \(page \d+\) ===\s*$/gm;
const FEATURE = /^Level (?<level>\d+): (?<name>[^\n]+)$/m;
const FORMULA =
  /base Armor Class equals (?<base>\d+) plus your (?<ability1>[A-Za-z]+) and (?<ability2>[A-Za-z]+) modifiers\./;

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’]/g, "'")
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ability(text: string, className: string): Ability {
  const value = text.toLowerCase();
  if (!isEnumValue(abilities, value)) {
    throw new SrdUnarmoredDefenseError(
      `${className} names unknown ability "${text}".`,
    );
  }
  return value;
}

/**
 * Parses both feature blocks. Any missing or ambiguous shield clause throws:
 * silently choosing a default here would make one of the two formulas wrong.
 */
export function parseSrdUnarmoredDefenseFeatures(
  source = extract,
): readonly SrdUnarmoredDefenseFeature[] {
  const sections = [...source.matchAll(SECTION)];
  if (sections.length !== UNARMORED_DEFENSE_CLASSES.length) {
    throw new SrdUnarmoredDefenseError(
      `expected ${String(UNARMORED_DEFENSE_CLASSES.length)} class sections, found ${String(sections.length)}.`,
    );
  }

  const features = sections.map((section, index) => {
    const groups = section.groups;
    const className = groups?.['className'];
    if (
      className === undefined ||
      !UNARMORED_DEFENSE_CLASSES.includes(
        className as UnarmoredDefenseClass,
      )
    ) {
      throw new SrdUnarmoredDefenseError('a section has an unknown class.');
    }
    const start = (section.index ?? 0) + section[0].length;
    const end = sections[index + 1]?.index ?? source.length;
    const block = source.slice(start, end);
    const feature = FEATURE.exec(block)?.groups;
    const formula = FORMULA.exec(normalise(block))?.groups;
    if (feature === undefined || formula === undefined) {
      throw new SrdUnarmoredDefenseError(
        `${className} has no complete level, name, and formula.`,
      );
    }

    const classLevel = Number(feature['level']);
    const name = feature['name']?.trim();
    if (classLevel !== 1 || name !== 'Unarmored Defense') {
      throw new SrdUnarmoredDefenseError(
        `${className} is not the printed level-1 Unarmored Defense feature.`,
      );
    }

    const prose = normalise(block);
    const permitsShield = prose.includes(
      'You can use a Shield and still gain this benefit.',
    );
    const forbidsShield = prose.includes(
      "aren't wearing armor or wielding a Shield",
    );
    if (permitsShield === forbidsShield) {
      throw new SrdUnarmoredDefenseError(
        `${className} has a missing or ambiguous Shield clause.`,
      );
    }

    return {
      class_name: className as UnarmoredDefenseClass,
      class_level: classLevel,
      name,
      effect_kind: 'armor_class_formula' as const,
      base: Number(formula['base']),
      ability_1: ability(formula['ability1'] ?? '', className),
      ability_2: ability(formula['ability2'] ?? '', className),
      allows_shield: permitsShield,
    };
  });

  const foundClasses = new Set(features.map((feature) => feature.class_name));
  for (const className of UNARMORED_DEFENSE_CLASSES) {
    if (!foundClasses.has(className)) {
      throw new SrdUnarmoredDefenseError(
        `${className} has no feature section.`,
      );
    }
  }
  return features;
}
