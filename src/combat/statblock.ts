import { abilities, type Ability } from '../domain/enums';
import type { DamageResponse } from './resolution';
import {
  armorClass,
  damageType,
  feet,
  statblockId,
  type ArmorClass,
  type DamageType,
  type Feet,
  type StatblockId,
} from './values';

export interface MonsterStatblockInput {
  readonly id: string;
  readonly name: string;
  readonly armorClass: number;
  readonly hitPointMaximum: number;
  readonly speedFeet: number;
  readonly initiativeBonus: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction?: number;
  readonly reachFeet?: number;
  readonly damageResponses?: readonly {
    readonly type: string;
    readonly response: DamageResponse;
  }[];
  readonly conditionImmunities?: readonly string[];
  readonly usesDeathSaves?: boolean;
}

export interface MonsterStatblock {
  readonly id: StatblockId;
  readonly name: string;
  readonly armorClass: ArmorClass;
  readonly hitPointMaximum: number;
  readonly speed: Feet;
  readonly initiativeBonus: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction: number;
  readonly reach: Feet;
  readonly damageResponses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
  readonly conditionImmunities: readonly string[];
  /** Ordinary monsters use the SRD's immediate-death-at-0 rule. */
  readonly usesDeathSaves: boolean;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive safe integer.`);
  }
  return value;
}

function finiteInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer.`);
  }
  return value;
}

function nonEmptyText(value: string, label: string): string {
  if (value.trim().length === 0 || value.trim() !== value) {
    throw new RangeError(`${label} must be trimmed and non-empty.`);
  }
  return value;
}

/** Validates imported or authored monster data before it becomes rules state. */
export function monsterStatblock(
  input: MonsterStatblockInput,
): MonsterStatblock {
  const savingThrowBonuses = Object.fromEntries(
    abilities.map((ability) => [
      ability,
      finiteInteger(input.savingThrowBonuses[ability], `${ability} save bonus`),
    ]),
  ) as Record<Ability, number>;

  const seenDamageTypes = new Set<string>();
  const damageResponses = (input.damageResponses ?? []).map((entry) => {
    const type = damageType(entry.type);
    if (seenDamageTypes.has(type)) {
      throw new RangeError(`Duplicate damage response for ${type}.`);
    }
    seenDamageTypes.add(type);
    return { type, response: entry.response };
  });

  const conditionImmunities = (input.conditionImmunities ?? []).map(
    (condition) => nonEmptyText(condition, 'Condition immunity'),
  );
  if (new Set(conditionImmunities).size !== conditionImmunities.length) {
    throw new RangeError('Condition immunities must be unique.');
  }

  const checkedArmorClass = armorClass(input.armorClass);
  if (checkedArmorClass < 1) {
    throw new RangeError('Monster Armor Class must be positive.');
  }

  return {
    id: statblockId(input.id),
    name: nonEmptyText(input.name, 'Monster name'),
    armorClass: checkedArmorClass,
    hitPointMaximum: positiveInteger(
      input.hitPointMaximum,
      'Monster Hit Point maximum',
    ),
    speed: feet(input.speedFeet),
    initiativeBonus: finiteInteger(
      input.initiativeBonus,
      'Monster Initiative bonus',
    ),
    savingThrowBonuses,
    attacksPerAction: positiveInteger(
      input.attacksPerAction ?? 1,
      'Attacks per action',
    ),
    reach: feet(input.reachFeet ?? 5),
    damageResponses,
    conditionImmunities,
    usesDeathSaves: input.usesDeathSaves ?? false,
  };
}
