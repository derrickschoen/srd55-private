import type { Ability } from '../domain/enums';
import { abilities } from '../domain/enums';
import { AbilityScore } from './ability-score';

export type AbilityScoreInput = Readonly<Record<string, unknown>>;

export class AbilityScores {
  readonly strength: AbilityScore;
  readonly dexterity: AbilityScore;
  readonly constitution: AbilityScore;
  readonly intelligence: AbilityScore;
  readonly wisdom: AbilityScore;
  readonly charisma: AbilityScore;

  constructor(
    strength: AbilityScore,
    dexterity: AbilityScore,
    constitution: AbilityScore,
    intelligence: AbilityScore,
    wisdom: AbilityScore,
    charisma: AbilityScore,
  ) {
    this.strength = strength;
    this.dexterity = dexterity;
    this.constitution = constitution;
    this.intelligence = intelligence;
    this.wisdom = wisdom;
    this.charisma = charisma;
  }

  static fromArray(values: AbilityScoreInput): AbilityScores {
    const scores = Object.fromEntries(
      abilities.map((ability) => [ability, AbilityScores.read(values, ability)]),
    ) as Record<Ability, AbilityScore>;

    return new AbilityScores(
      scores.strength,
      scores.dexterity,
      scores.constitution,
      scores.intelligence,
      scores.wisdom,
      scores.charisma,
    );
  }

  score(ability: Ability): AbilityScore {
    return this[ability];
  }

  private static read(
    values: AbilityScoreInput,
    ability: Ability,
  ): AbilityScore {
    const value = values[ability];
    const validInteger = typeof value === 'number' && Number.isSafeInteger(value);
    const validDigitString =
      typeof value === 'string' && /^[0-9]+$/.test(value);
    if (!validInteger && !validDigitString) {
      throw new TypeError(`Missing or invalid ${ability} ability score.`);
    }

    return new AbilityScore(Number(value));
  }
}
