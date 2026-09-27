/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * WHICH WEAPON MASTERIES THE COMBAT ENGINE EXECUTES, AND WHAT THE OTHERS AWAIT
 * (PC-EXPORT-TRUTH, D918 "represented" definition).
 *
 * The eight mastery properties are defined at docs/srd/full/srd-5.2.1.txt:
 * 5426-5480 (right column). The engine's attack command runs two of them —
 * Slow and Topple (`EncounterCommand` attack `weaponMastery`). The other six
 * were loaded as `null`, indistinguishable from a weapon with no mastery at
 * all. They are now "sourced, not executed", naming the capability they await
 * and the unit that owns it (WEAPON-EXEC, census unit 17), never `null` and
 * never "unknown".
 *
 * Production rule H: this is a judgement about the engine, hand-typed, with
 * each mastery's definition span cited and its text hash pinned by
 * tests/unit/rules/weapon-mastery-status.test.ts. The record is exhaustive over
 * the closed `WeaponMasteryProperty` union, so a ninth property fails to
 * compile until it is given a status; and the executed set must equal the
 * engine command's own vocabulary, so flipping a status without engine support
 * fails to compile too.
 */
import type { EncounterCommand } from '../combat/events';
import type { WeaponMasteryProperty } from '../domain/enums';

export type SrdFullSpan = `docs/srd/full/srd-5.2.1.txt:${number}-${number}`;

/** The capability every non-executed mastery awaits. */
export type WeaponMasteryCapability = 'weapon_mastery_execution';

export const WEAPON_MASTERY_CAPABILITY_OWNER = {
  weapon_mastery_execution: 'WEAPON-EXEC',
} as const satisfies Readonly<Record<WeaponMasteryCapability, string>>;

export type WeaponMasteryStatus =
  | { readonly status: 'executed'; readonly span: SrdFullSpan }
  | {
      readonly status: 'sourced_not_executed';
      readonly span: SrdFullSpan;
      readonly awaiting: WeaponMasteryCapability;
    };

export const WEAPON_MASTERY_STATUS = {
  Cleave: { status: 'sourced_not_executed', span: 'docs/srd/full/srd-5.2.1.txt:5426-5434', awaiting: 'weapon_mastery_execution' },
  Graze: { status: 'sourced_not_executed', span: 'docs/srd/full/srd-5.2.1.txt:5436-5442', awaiting: 'weapon_mastery_execution' },
  Nick: { status: 'sourced_not_executed', span: 'docs/srd/full/srd-5.2.1.txt:5444-5448', awaiting: 'weapon_mastery_execution' },
  Push: { status: 'sourced_not_executed', span: 'docs/srd/full/srd-5.2.1.txt:5450-5453', awaiting: 'weapon_mastery_execution' },
  Sap: { status: 'sourced_not_executed', span: 'docs/srd/full/srd-5.2.1.txt:5455-5458', awaiting: 'weapon_mastery_execution' },
  Slow: { status: 'executed', span: 'docs/srd/full/srd-5.2.1.txt:5460-5465' },
  Topple: { status: 'executed', span: 'docs/srd/full/srd-5.2.1.txt:5468-5474' },
  Vex: { status: 'sourced_not_executed', span: 'docs/srd/full/srd-5.2.1.txt:5476-5480', awaiting: 'weapon_mastery_execution' },
} as const satisfies { readonly [Property in WeaponMasteryProperty]: WeaponMasteryStatus };

type StatusOf<Property extends WeaponMasteryProperty> =
  (typeof WEAPON_MASTERY_STATUS)[Property]['status'];

export type ExecutedWeaponMasteryProperty = {
  [Property in WeaponMasteryProperty]: StatusOf<Property> extends 'executed' ? Property : never;
}[WeaponMasteryProperty];

export type SourcedNotExecutedWeaponMasteryProperty = Exclude<
  WeaponMasteryProperty,
  ExecutedWeaponMasteryProperty
>;

/** The mastery rider the engine's attack command runs. */
export type ExecutedWeaponMastery = NonNullable<
  Extract<EncounterCommand, { readonly type: 'attack' }>['weaponMastery']
>;

/** A stated mastery the engine cannot run yet, carried as a typed fact. */
export interface SourcedNotExecutedWeaponMastery {
  readonly property: SourcedNotExecutedWeaponMasteryProperty;
  readonly status: 'sourced_not_executed';
  readonly awaiting: WeaponMasteryCapability;
}

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends (<T>() => T extends Right ? 1 : 2) ? true : false;

/**
 * The executed set IS the engine's vocabulary: marking a mastery executed
 * without an engine rider for it, or adding a rider without marking it, stops
 * this line compiling.
 */
export const EXECUTED_MASTERIES_MATCH_ENGINE: Equal<
  ExecutedWeaponMasteryProperty,
  ExecutedWeaponMastery['property']
> = true;

/**
 * TOPPLE'S SAVE DC, AS A FORMULA RATHER THAN A NUMBER READ OFF THE ATTACK.
 *
 * "If you hit a creature with this weapon, you can force the creature to make
 * a Constitution saving throw (DC 8 plus the ability modifier used to make the
 * attack roll and your Proficiency Bonus)" — docs/srd/full/srd-5.2.1.txt:
 * 5468-5474, right column. The export used 8 + the attack bonus, which is the
 * same number only for a proficient attack with no other bonus: a magic
 * weapon's +1 raised the DC (owner D923 Q12), and a weapon the character is
 * not proficient with lowered it by the Proficiency Bonus the rule still adds.
 * The inputs are named for what the rule names, so an attack bonus cannot be
 * passed where the ability modifier belongs without a visible lie.
 */
export interface ToppleSaveDcInputs {
  /** The modifier of the ability the attack roll uses, and nothing else. */
  readonly attackAbilityModifier: number;
  readonly proficiencyBonus: number;
}

export const TOPPLE_SAVE_DC_BASE = 8;

export function toppleSaveDc(inputs: ToppleSaveDcInputs): number {
  return TOPPLE_SAVE_DC_BASE + inputs.attackAbilityModifier + inputs.proficiencyBonus;
}

export function sourcedNotExecutedMastery(
  property: SourcedNotExecutedWeaponMasteryProperty,
): SourcedNotExecutedWeaponMastery {
  return {
    property,
    status: WEAPON_MASTERY_STATUS[property].status,
    awaiting: WEAPON_MASTERY_STATUS[property].awaiting,
  };
}
