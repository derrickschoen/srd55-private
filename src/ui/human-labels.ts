import type { Ability, RulesEdition } from '../domain/enums';

const ABILITY_LABELS = Object.freeze({
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
} as const satisfies Readonly<Record<Ability, string>>);

/** One display seam for the closed ability vocabulary. */
export function abilityLabel(ability: Ability): string {
  return ABILITY_LABELS[ability];
}

/** Human labels for stored rules-edition values. */
export function rulesEditionLabel(edition: RulesEdition): string {
  switch (edition) {
    case '2014':
      return '2014 rules';
    case '2024':
      return '2024 rules';
    case 'expanded':
      return 'Expanded rules';
  }
  const unhandled: never = edition;
  return unhandled;
}
