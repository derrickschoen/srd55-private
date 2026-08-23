import type { Brand } from '../../domain/ids';
import type { MonsterStatblock } from '../statblock';
import type { StatblockId } from '../values';
import {
  BUNDLED_MONSTER_REGISTRY,
  instantiateMonsterTemplate,
  type BundledMonsterRegistryEntry,
  type CasterContext,
} from './companions';

export type SummonSpellId = Brand<string, 'SummonSpellId'>;
export type SummonMonsterId = Brand<string, 'SummonMonsterId'>;

export interface MonsterSpellMapping {
  readonly monsterId: SummonMonsterId;
  readonly spellId: SummonSpellId;
}

export const summonSpellId = (value: string): SummonSpellId => value as SummonSpellId;
export const summonMonsterId = (value: string): SummonMonsterId => value as SummonMonsterId;

export const SRD_MONSTER_SPELL_MAPPINGS = [
  { monsterId: summonMonsterId('statblock:otherworldly-steed'), spellId: summonSpellId('2024:find-steed') },
  { monsterId: summonMonsterId('statblock:giant-insect'), spellId: summonSpellId('2024:giant-insect') },
  { monsterId: summonMonsterId('statblock:animated-object'), spellId: summonSpellId('2024:animate-objects') },
] as const satisfies readonly MonsterSpellMapping[];

export type SummonMappingExtensionResult =
  | { readonly status: 'loaded'; readonly mappings: readonly MonsterSpellMapping[] }
  | {
      readonly status: 'refused';
      readonly refusal:
        | { readonly reason: 'missing_monster_id'; readonly monsterId: string }
        | { readonly reason: 'missing_spell_id'; readonly spellId: string };
    };

export function extendMonsterSpellMappings(
  current: readonly MonsterSpellMapping[],
  additions: readonly MonsterSpellMapping[],
  loaded: { readonly monsterIds: readonly string[]; readonly spellIds: readonly string[] },
): SummonMappingExtensionResult {
  const monsterIds = new Set(loaded.monsterIds);
  const spellIds = new Set(loaded.spellIds);
  for (const mapping of additions) {
    if (!monsterIds.has(mapping.monsterId)) {
      return { status: 'refused', refusal: { reason: 'missing_monster_id', monsterId: mapping.monsterId } };
    }
    if (!spellIds.has(mapping.spellId)) {
      return { status: 'refused', refusal: { reason: 'missing_spell_id', spellId: mapping.spellId } };
    }
  }
  return { status: 'loaded', mappings: [...current, ...additions] };
}

export interface LoadedSummonMappingPackSurface {
  readonly monsters: readonly { readonly id: string }[];
  readonly spells: readonly { readonly id: string }[];
}

export function extendMonsterSpellMappingsFromPacks(
  current: readonly MonsterSpellMapping[],
  additions: readonly MonsterSpellMapping[],
  packs: readonly LoadedSummonMappingPackSurface[],
): SummonMappingExtensionResult {
  return extendMonsterSpellMappings(current, additions, {
    monsterIds: packs.flatMap((pack) => pack.monsters.map(({ id }) => id)),
    spellIds: packs.flatMap((pack) => pack.spells.map(({ id }) => id)),
  });
}

export type SummonMappingLookup =
  | { readonly status: 'resolved'; readonly mapping: MonsterSpellMapping }
  | { readonly status: 'refused'; readonly refusal: { readonly reason: 'unmapped_spell_id'; readonly spellId: string } };

export function lookupMonsterForSpell(
  spellId: string,
  mappings: readonly MonsterSpellMapping[] = SRD_MONSTER_SPELL_MAPPINGS,
): SummonMappingLookup {
  const mapping = mappings.find((candidate) => candidate.spellId === spellId);
  return mapping === undefined
    ? { status: 'refused', refusal: { reason: 'unmapped_spell_id', spellId } }
    : { status: 'resolved', mapping };
}

export type OrdinaryMonsterRegistryEntry =
  | BundledMonsterRegistryEntry
  | { readonly kind: 'static'; readonly id: StatblockId; readonly statblock: MonsterStatblock };

export type SummonRegistryLookup =
  | { readonly status: 'resolved'; readonly mapping: MonsterSpellMapping; readonly entry: OrdinaryMonsterRegistryEntry }
  | { readonly status: 'refused'; readonly refusal:
      | { readonly reason: 'unmapped_spell_id'; readonly spellId: string }
      | { readonly reason: 'missing_monster_id'; readonly monsterId: string } };

export function resolveSummonRegistryEntry(
  spellId: string,
  mappings: readonly MonsterSpellMapping[] = SRD_MONSTER_SPELL_MAPPINGS,
  registry: readonly OrdinaryMonsterRegistryEntry[] = BUNDLED_MONSTER_REGISTRY,
): SummonRegistryLookup {
  const mapped = lookupMonsterForSpell(spellId, mappings);
  if (mapped.status === 'refused') return mapped;
  const entry = registry.find((candidate) => candidate.id === mapped.mapping.monsterId);
  return entry === undefined
    ? { status: 'refused', refusal: { reason: 'missing_monster_id', monsterId: mapped.mapping.monsterId } }
    : { status: 'resolved', mapping: mapped.mapping, entry };
}

export type BundledSummonInstantiationRequest =
  | ({ readonly spellId: '2024:find-steed'; readonly creatureType: 'Celestial' | 'Fey' | 'Fiend' } & CasterContext)
  | ({ readonly spellId: '2024:giant-insect'; readonly form: 'Centipede' | 'Spider' | 'Wasp' } & CasterContext)
  | ({ readonly spellId: '2024:animate-objects'; readonly size: 'Medium or smaller' | 'Large' | 'Huge' } & CasterContext);

export function instantiateBundledSummon(request: BundledSummonInstantiationRequest): MonsterStatblock {
  const resolved = resolveSummonRegistryEntry(request.spellId);
  if (resolved.status === 'refused') throw new RangeError(`Bundled summon mapping refused ${request.spellId}.`);
  if (resolved.entry.kind !== 'parameterized') throw new TypeError(`Bundled summon ${request.spellId} did not resolve to a parameterized template.`);
  switch (request.spellId) {
    case '2024:find-steed':
      return instantiateMonsterTemplate({ ...request, monsterId: 'statblock:otherworldly-steed' });
    case '2024:giant-insect':
      return instantiateMonsterTemplate({ ...request, monsterId: 'statblock:giant-insect' });
    case '2024:animate-objects':
      return instantiateMonsterTemplate({ ...request, monsterId: 'statblock:animated-object' });
  }
}
