import type { Brand } from '../domain/ids';

export type Feet = Brand<number, 'Feet'>;
export type ArmorClass = Brand<number, 'ArmorClass'>;
export type DifficultyClass = Brand<number, 'DifficultyClass'>;
export type DieSides = Brand<number, 'DieSides'>;
export type DamageType = Brand<string, 'DamageType'>;
export type CombatantId = Brand<string, 'CombatantId'>;
export type TokenId = Brand<string, 'TokenId'>;
export type StatblockId = Brand<string, 'StatblockId'>;
export type EncounterEffectId = Brand<string, 'EncounterEffectId'>;
export type PersistentAreaId = Brand<string, 'PersistentAreaId'>;
export type WorldObjectId = Brand<string, 'WorldObjectId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ObjectTargetId = WorldObjectId | ItemId;
export type EffectStackingIdentity = Brand<string, 'EffectStackingIdentity'>;
export type LimitedResourcePoolId = Brand<string, 'LimitedResourcePoolId'>;
export type EncounterSessionId = Brand<string, 'EncounterSessionId'>;
export type EncounterBranchId = Brand<string, 'EncounterBranchId'>;
export type CodexSessionId = Brand<string, 'CodexSessionId'>;

const MAX_DAMAGE_TYPE_LENGTH = 100;
const MAX_IDENTITY_LENGTH = 200;

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number.`);
  }
  return value;
}

/** Establishes the non-negative, finite invariant for spatial measurements. */
export function feet(value: number): Feet {
  return nonNegativeFinite(value, 'Feet') as Feet;
}

export function armorClass(value: number): ArmorClass {
  return nonNegativeFinite(value, 'ArmorClass') as ArmorClass;
}

export function difficultyClass(value: number): DifficultyClass {
  return nonNegativeFinite(value, 'DifficultyClass') as DifficultyClass;
}

export function dieSides(value: number): DieSides {
  if (!Number.isInteger(value) || value < 2) {
    throw new RangeError('DieSides must be an integer greater than or equal to 2.');
  }
  return value as DieSides;
}

export function damageType(value: string): DamageType {
  if (value.trim().length === 0 || value.length > MAX_DAMAGE_TYPE_LENGTH) {
    throw new RangeError(
      `DamageType must be non-empty and at most ${MAX_DAMAGE_TYPE_LENGTH} characters.`,
    );
  }
  return value as DamageType;
}

function identity<T extends string>(value: string, label: string): T {
  if (
    value.length === 0 ||
    value.length > MAX_IDENTITY_LENGTH ||
    value.trim() !== value
  ) {
    throw new RangeError(
      `${label} must be trimmed, non-empty, and at most ${MAX_IDENTITY_LENGTH} characters.`,
    );
  }
  return value as T;
}

export const combatantId = (value: string): CombatantId =>
  identity<CombatantId>(value, 'CombatantId');

export const tokenId = (value: string): TokenId =>
  identity<TokenId>(value, 'TokenId');

export const statblockId = (value: string): StatblockId =>
  identity<StatblockId>(value, 'StatblockId');

export const encounterEffectId = (value: string): EncounterEffectId =>
  identity<EncounterEffectId>(value, 'EncounterEffectId');

export const persistentAreaId = (value: string): PersistentAreaId =>
  identity<PersistentAreaId>(value, 'PersistentAreaId');

export const worldObjectId = (value: string): WorldObjectId =>
  identity<WorldObjectId>(value, 'WorldObjectId');

export const itemId = (value: string): ItemId =>
  identity<ItemId>(value, 'ItemId');

export const effectStackingIdentity = (
  value: string,
): EffectStackingIdentity =>
  identity<EffectStackingIdentity>(value, 'EffectStackingIdentity');

export const limitedResourcePoolId = (value: string): LimitedResourcePoolId =>
  identity<LimitedResourcePoolId>(value, 'LimitedResourcePoolId');

export const encounterSessionId = (value: string): EncounterSessionId =>
  identity<EncounterSessionId>(value, 'EncounterSessionId');

export const encounterBranchId = (value: string): EncounterBranchId =>
  identity<EncounterBranchId>(value, 'EncounterBranchId');

export const codexSessionId = (value: string): CodexSessionId =>
  identity<CodexSessionId>(value, 'CodexSessionId');
