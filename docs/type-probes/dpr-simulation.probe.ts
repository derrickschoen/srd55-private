/**
 * Deliberately invalid DPR programs. This file lives outside both tsconfigs and
 * is compiled only by its negative test. Every exported statement must fail.
 */
import type {
  AttackDamageComponent,
  CatalogMechanicCoverage,
  CharacterAttackRoutineId,
  DamageNeutralMechanicId,
  EncounterResourceCap,
  EncounterRoundCount,
  ExpectedCycleDamage,
  ExpectedEncounterDamage,
  ExpectedEventDamage,
  ExpectedRoundDamage,
  Probability,
  PositiveResourceCost,
  PublicSourceRef,
  RoutineEventId,
  SaveSuccessClauseId,
  SimResourcePool,
  SimResourcePoolSet,
  SimResourceId,
  TargetArmorClass,
} from '../../src/simulation/contracts';
import {
  BUNDLED_SRD_5_2_1_PATH,
  characterAttackRoutineId,
  damageFlatModifier,
  encounterRoundCount,
  expectedCycleDamage,
  expectedEncounterDamage,
  expectedEventDamage,
  expectedRoundDamage,
  probability,
  positiveDiceCount,
  projectOwnedSourcePath,
  routineEventId,
  simResourceId,
  sourceStableKey,
  targetArmorClass,
} from '../../src/simulation/contracts';

export const roundFromArmorClass: EncounterRoundCount = targetArmorClass(3);
export const armorClassFromRound: TargetArmorClass = encounterRoundCount(3);
export const routineFromEvent: CharacterAttackRoutineId = routineEventId('event');
export const eventFromResource: RoutineEventId = simResourceId('resource');
export const resourceFromRoutine: SimResourceId = characterAttackRoutineId('routine');
export const costFromCap: PositiveResourceCost = 1 as EncounterResourceCap;
export const probabilityFromNumber: Probability = 0.5;
export const eventFromRound: ExpectedEventDamage = expectedRoundDamage(4);
export const roundFromEncounter: ExpectedRoundDamage = expectedEncounterDamage(4);
export const encounterFromCycle: ExpectedEncounterDamage = expectedCycleDamage(4);
export const cycleFromEvent: ExpectedCycleDamage = expectedEventDamage(4);
export const flatDiceClaim: AttackDamageComponent = { kind: 'flat', modifier: damageFlatModifier(3), trigger: 'hit', part_of_attack_damage_dice: true };
export const ordinaryDiceOptOut: AttackDamageComponent = { kind: 'dice', pool: { count: positiveDiceCount(1), die: 6 }, trigger: 'hit', part_of_attack_damage_dice: false };
export const forgedProbability: Probability = probability(0.5) as ExpectedEventDamage;
export const selfAssertedProjectLicense: PublicSourceRef = { kind: 'project_owned', path: projectOwnedSourcePath('src/simulation/contracts.ts'), license: 'MIT' };
export const uncheckedBundledHeading: PublicSourceRef = { kind: 'bundled_srd', path: BUNDLED_SRD_5_2_1_PATH, heading: 'This Heading Does Not Exist' };
export const unboundNeutrality: CatalogMechanicCoverage = { status: 'confirmed_damage_neutral', evidence: { kind: 'project_owned', path: projectOwnedSourcePath('src/simulation/contracts.ts') } };
export const forgedNeutralityId: DamageNeutralMechanicId = sourceStableKey('srd-5.2.1:spell:fireball:flammable-objects');
export const effectKeyAsSaveClause: SaveSuccessClauseId = sourceStableKey('srd-5.2.1:spell:fireball');
export const unvalidatedResourcePools: SimResourcePoolSet = [] as readonly SimResourcePool[];
