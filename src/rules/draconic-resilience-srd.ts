/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * DRACONIC RESILIENCE'S TWO SHEET EFFECTS, PARSED AS ONE FEATURE.
 *
 * The HP effect is deliberately stored in the existing `hp_modifier`
 * per-level channel. Class/subclass templates use their owning class level;
 * `generated-feature-effects.ts` materialises that formula into the character
 * effect's flat channel when the class is synchronized. Character-authored
 * effects retain the public `per character level` meaning.
 */
import extract from '../../docs/srd/source/draconic-resilience.txt?raw';
import { abilities, isEnumValue, type Ability } from '../domain/enums';

export interface SrdDraconicResilienceHitPoints {
  readonly kind: 'hp_modifier';
  readonly label: 'Draconic Resilience';
  readonly hit_points_flat: 0;
  readonly hit_points_per_level: 1;
}

export interface SrdDraconicResilienceArmorClass {
  readonly kind: 'armor_class_formula';
  readonly label: 'Draconic Resilience';
  readonly base: 10;
  readonly ability_1: 'dexterity';
  readonly ability_2: 'charisma';
  readonly allows_shield: false;
}

export type SrdDraconicResilienceEffect =
  | SrdDraconicResilienceHitPoints
  | SrdDraconicResilienceArmorClass;

export interface SrdDraconicResilienceFeature {
  readonly class_name: 'Sorcerer';
  readonly subclass_name: 'Draconic Sorcery';
  readonly class_level: 3;
  readonly name: 'Draconic Resilience';
  readonly effects: readonly [
    SrdDraconicResilienceHitPoints,
    SrdDraconicResilienceArmorClass,
  ];
}

export class SrdDraconicResilienceError extends Error {
  override readonly name = 'SrdDraconicResilienceError' as const;
  constructor(message: string) {
    super(`SRD Draconic Resilience: ${message}`);
  }
}

const SECTION =
  /^=== (?<className>[^:]+): (?<subclassName>[^\n(]+) \(page \d+\) ===$/m;
const FEATURE = /^Level (?<level>\d+): (?<name>[^\n]+)$/m;
const HIT_POINTS =
  /Hit Point maximum increases by (?<initial>\d+), and it increases by (?<further>\d+) whenever you gain another (?<className>[A-Za-z]+) level\./;
const ARMOR_CLASS =
  /While you aren't wearing armor, your base Armor Class equals (?<base>\d+) plus your (?<ability1>[A-Za-z]+) and (?<ability2>[A-Za-z]+) modifiers\./;

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’]/g, "'")
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ability(text: string): Ability {
  const value = text.toLowerCase();
  if (!isEnumValue(abilities, value)) {
    throw new SrdDraconicResilienceError(
      `formula names unknown ability "${text}".`,
    );
  }
  return value;
}

export function parseSrdDraconicResilience(
  source = extract,
): SrdDraconicResilienceFeature {
  const section = SECTION.exec(source)?.groups;
  const feature = FEATURE.exec(source)?.groups;
  const prose = normalise(source);
  const hitPoints = HIT_POINTS.exec(prose)?.groups;
  const armorClass = ARMOR_CLASS.exec(prose)?.groups;
  if (
    section === undefined ||
    feature === undefined ||
    hitPoints === undefined ||
    armorClass === undefined
  ) {
    throw new SrdDraconicResilienceError(
      'feature heading or mechanical sentence is incomplete.',
    );
  }

  const classLevel = Number(feature['level']);
  const initialIncrease = Number(hitPoints['initial']);
  const furtherIncrease = Number(hitPoints['further']);
  const base = Number(armorClass['base']);
  const ability1 = ability(armorClass['ability1'] ?? '');
  const ability2 = ability(armorClass['ability2'] ?? '');
  if (
    section['className'] !== 'Sorcerer' ||
    section['subclassName']?.trim() !== 'Draconic Sorcery' ||
    classLevel !== 3 ||
    feature['name']?.trim() !== 'Draconic Resilience' ||
    hitPoints['className'] !== 'Sorcerer' ||
    initialIncrease !== classLevel * furtherIncrease ||
    furtherIncrease !== 1 ||
    base !== 10 ||
    ability1 !== 'dexterity' ||
    ability2 !== 'charisma'
  ) {
    throw new SrdDraconicResilienceError(
      'feature identity or supported formula has changed.',
    );
  }

  return {
    class_name: 'Sorcerer',
    subclass_name: 'Draconic Sorcery',
    class_level: 3,
    name: 'Draconic Resilience',
    effects: [
      {
        kind: 'hp_modifier',
        label: 'Draconic Resilience',
        hit_points_flat: 0,
        hit_points_per_level: 1,
      },
      {
        kind: 'armor_class_formula',
        label: 'Draconic Resilience',
        base: 10,
        ability_1: 'dexterity',
        ability_2: 'charisma',
        allows_shield: false,
      },
    ],
  };
}
