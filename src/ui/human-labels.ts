import type { Ability, RulesEdition } from '../domain/enums';
import type { FeatureValueKey } from '../domain/feature-values';

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

const FEATURE_VALUE_LABELS = Object.freeze({
  sneak_attack: 'Sneak Attack dice',
} as const satisfies Readonly<Record<FeatureValueKey, string>>);

/** One display seam for the closed engine-known feature-value vocabulary. */
export function featureValueLabel(key: FeatureValueKey): string {
  return FEATURE_VALUE_LABELS[key];
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
