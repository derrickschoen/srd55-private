/**
 * Every export is a wrong program and must fail to compile. A flat/custom/
 * absent limb does not own `dice`; a dice/custom/absent limb does not own
 * `amount`.
 */
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../../src/domain/weapon-damage';

declare const flat: Extract<WeaponDamage, { kind: 'flat' }>;
declare const custom: Extract<WeaponDamage, { kind: 'custom' }>;
declare const absent: Extract<WeaponDamage, { kind: 'not_recorded' }>;
declare const dice: Extract<WeaponDamage, { kind: 'dice' }>;
declare const notApplicable: Extract<
  VersatileWeaponDamage,
  { kind: 'not_applicable' }
>;

export const diceFromFlat = flat.dice;
export const diceFromCustom = custom.dice;
export const diceFromAbsent = absent.dice;
export const amountFromDice = dice.amount;
export const amountFromNotApplicable = notApplicable.amount;
