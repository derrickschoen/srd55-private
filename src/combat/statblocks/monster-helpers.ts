import type { Ability, CreatureSize } from '../../domain/enums';
import type {
  DecodedField,
  MonsterAbilityLine,
  MonsterAttackAction,
  MonsterAttackDelivery,
  MonsterDamageTerm,
  MonsterMovementSpeed,
  MonsterOnHitEffect,
  MonsterSourceDetailsInput,
} from '../statblock';

export const SRD_PATH = 'docs/srd/full/srd-5.2.1.txt' as const;

export const present = <T>(value: T): DecodedField<T> => ({ kind: 'present', value });

export const notListed = <T>(field: string): DecodedField<T> => ({
  kind: 'absent',
  note: `The bundled SRD statblock does not list ${field}.`,
});

export const abilityLines = (
  strength: readonly [number, number, number],
  dexterity: readonly [number, number, number],
  constitution: readonly [number, number, number],
  intelligence: readonly [number, number, number],
  wisdom: readonly [number, number, number],
  charisma: readonly [number, number, number],
): Readonly<Record<Ability, MonsterAbilityLine>> => ({
  strength: { score: strength[0], modifier: strength[1], saveBonus: strength[2] },
  dexterity: { score: dexterity[0], modifier: dexterity[1], saveBonus: dexterity[2] },
  constitution: { score: constitution[0], modifier: constitution[1], saveBonus: constitution[2] },
  intelligence: { score: intelligence[0], modifier: intelligence[1], saveBonus: intelligence[2] },
  wisdom: { score: wisdom[0], modifier: wisdom[1], saveBonus: wisdom[2] },
  charisma: { score: charisma[0], modifier: charisma[1], saveBonus: charisma[2] },
});

export const savingThrowBonuses = (lines: Readonly<Record<Ability, MonsterAbilityLine>>): Readonly<Record<Ability, number>> => ({
  strength: lines.strength.saveBonus,
  dexterity: lines.dexterity.saveBonus,
  constitution: lines.constitution.saveBonus,
  intelligence: lines.intelligence.saveBonus,
  wisdom: lines.wisdom.saveBonus,
  charisma: lines.charisma.saveBonus,
});

export const baseDetails = (
  source: MonsterSourceDetailsInput['source'],
  classification: MonsterSourceDetailsInput['classification'],
  challenge: MonsterSourceDetailsInput['challenge'],
  hitPointDice: MonsterSourceDetailsInput['hitPointDice'],
  speedFeet: number,
  abilities: MonsterSourceDetailsInput['abilities'],
  additionalMovement: readonly MonsterMovementSpeed[] = [],
): Pick<MonsterSourceDetailsInput, 'source' | 'classification' | 'challenge' | 'hitPointDice' | 'movement' | 'abilities'> => ({
  source,
  classification,
  challenge,
  hitPointDice,
  movement: [{ kind: 'walk', feet: speedFeet, hover: false }, ...additionalMovement],
  abilities,
});

export const damage = (
  average: number,
  count: number,
  sides: 4 | 6 | 8 | 10 | 12 | 20,
  modifier: number,
  type: MonsterDamageTerm['type'],
  trigger: MonsterDamageTerm['trigger'] = { kind: 'always' },
): MonsterDamageTerm => ({ average, dice: { count, sides, modifier }, type, trigger });

export const attack = (
  id: string,
  name: string,
  attackBonus: number,
  delivery: MonsterAttackDelivery,
  terms: readonly MonsterDamageTerm[],
  onHit: readonly MonsterOnHitEffect[] = [],
  attackRollAdvantage: MonsterAttackAction['attackRollAdvantage'] = null,
): MonsterAttackAction => ({
  kind: 'attack', id, name, attackBonus, delivery, damage: terms, attackRollAdvantage, onHit,
});

export const melee = (
  id: string,
  name: string,
  attackBonus: number,
  terms: readonly MonsterDamageTerm[],
  onHit: readonly MonsterOnHitEffect[] = [],
  reachFeet = 5,
  attackRollAdvantage: MonsterAttackAction['attackRollAdvantage'] = null,
): MonsterAttackAction => attack(id, name, attackBonus, { kind: 'melee', reachFeet }, terms, onHit, attackRollAdvantage);

export const ranged = (
  id: string,
  name: string,
  attackBonus: number,
  terms: readonly MonsterDamageTerm[],
  rangeFeet: number,
  longRangeFeet: DecodedField<number>,
): MonsterAttackAction => attack(id, name, attackBonus, { kind: 'ranged', rangeFeet, longRangeFeet }, terms);

export const meleeOrRanged = (
  id: string,
  name: string,
  attackBonus: number,
  terms: readonly MonsterDamageTerm[],
  reachFeet: number,
  rangeFeet: number,
  longRangeFeet: number,
  onHit: readonly MonsterOnHitEffect[] = [],
): MonsterAttackAction => attack(id, name, attackBonus, { kind: 'melee_or_ranged', reachFeet, rangeFeet, longRangeFeet }, terms, onHit);

export const conditionOnHit = (
  condition: 'Frightened' | 'Grappled' | 'Paralyzed' | 'Poisoned' | 'Prone' | 'Restrained',
  maximumSize: CreatureSize | null,
  options: {
    readonly excludedKinds?: readonly ('Undead' | 'Elf')[];
    readonly save?: { readonly ability: Ability; readonly dc: number } | null;
    readonly escapeDc?: number | null;
    readonly duration?: 'until_escape' | 'until_end_of_monster_next_turn' | 'until_end_of_target_next_turn' | 'until_start_of_monster_next_turn' | null;
    readonly trigger?: MonsterDamageTerm['trigger'];
  } = {},
): MonsterOnHitEffect => ({
  kind: 'condition',
  condition,
  trigger: options.trigger ?? { kind: 'always' },
  target: { maximumSize, excludedKinds: options.excludedKinds ?? [] },
  savingThrow: options.save ?? null,
  escapeDc: options.escapeDc ?? null,
  duration: options.duration ?? null,
});
