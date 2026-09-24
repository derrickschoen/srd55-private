import { combatToken, monsterCombatantProfile, type CombatantProfile } from '../combat/combatant';
import {
  autoRelocatePlacement,
  normalPlacementFor,
  sizedCombatantState,
  spacesIntersect,
  type CreatureSpace,
  type KnownCreatureSize,
} from '../combat/creature-space';
import { createEncounter, type EncounterCombatantState, type EncounterState } from '../combat/encounter';
import { combatantSpace } from '../combat/combat-rules';
import { traceCombatantLine, traceCombatantLineToCells } from '../combat/cover';
import type { GridBounds, GridCell } from '../combat/grid';
import { mulberry32, type Rng } from '../combat/random';
import type { ChallengeRating } from '../combat/statblock';
import {
  BUNDLED_MONSTER_ROSTER,
  STARTER_MONSTER_ROSTER,
  type BundledMonsterRosterRow,
  type StarterMonsterFamily,
  type StarterMonsterRosterRow,
} from '../combat/statblocks/roster';
import {
  armorClass,
  effectStackingIdentity,
  encounterEffectId,
  worldObjectId,
} from '../combat/values';
import { terrainBlocking, type CanonicalWorldObjectBlocking, type CoverTier } from '../combat/terrain';
import type { LightLevel, WorldObject } from '../combat/world-objects';
import { referenceEncounterSetup } from './reference-encounter';
import { encounterIr, type EncounterIr, type EncounterProvenance } from './encounter-ir';
import {
  d466GeneratedRoomOverride,
  d466ReplacementStatblock,
} from './d466-room-overrides';
import type { HeldoutPartyLevel } from './heldout-evaluation';
import type { LoadedExternalPartyPack } from './party-pack';

export const ROOM_GRID_DIMENSIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const;
export type RoomGridDimension = (typeof ROOM_GRID_DIMENSIONS)[number];

export const PARTY_HIT_POINT_FRACTIONS = [1, 0.75, 0.5, 0.25, 0] as const;
export type PartyHitPointFraction = (typeof PARTY_HIT_POINT_FRACTIONS)[number];

export const ROOM_DIFFICULTY_PROFILES = ['standard', 'hard', 'brutal'] as const;
export type RoomDifficultyProfile = (typeof ROOM_DIFFICULTY_PROFILES)[number];

export const BRUTAL_CHALLENGE_BUDGET_SCALE = 2 as const;
export const BRUTAL_CHALLENGE_SPEND_FRACTION_BAND = { minimum: 0.9, maximum: 1 } as const;
export const BRUTAL_TERRAIN_FEATURE_COUNT_BAND = { minimum: 10, maximum: 14 } as const;

export const ROOM_INITIATIVE_PROFILES = ['legacy', 'derived_v1'] as const;
export type RoomInitiativeProfile = (typeof ROOM_INITIATIVE_PROFILES)[number];

export const ROOM_TERRAIN_PROFILES = ['los_cover_v1'] as const;
export type RoomTerrainProfile = (typeof ROOM_TERRAIN_PROFILES)[number];

export const HELDOUT_ORDINARY_PROTOCOLS = [
  'heldout-ordinary-v1',
  'heldout-development-v1',
] as const;
export type HeldoutOrdinaryProtocol = (typeof HELDOUT_ORDINARY_PROTOCOLS)[number];
export type HeldoutTargetXp = 900 | 1_500 | 3_000 | 4_000;

export interface HeldoutOrdinaryRoomOptions {
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly party: LoadedExternalPartyPack;
  readonly partyLevel: HeldoutPartyLevel;
  readonly targetXp: HeldoutTargetXp;
}

type CoverBlocking<Tier extends 'half' | 'three_quarters'> = Extract<
  CanonicalWorldObjectBlocking,
  { readonly cover: Tier }
>;

export type GeneratedCoverObject<TerrainKind extends 'half_cover' | 'three_quarters_cover'> =
  WorldObject & {
    readonly kind: 'cover';
    readonly terrainKind: TerrainKind;
    readonly blocking: CoverBlocking<TerrainKind extends 'half_cover' ? 'half' : 'three_quarters'>;
  };

export type RoomTerrainFeature =
  | {
      readonly kind: 'difficult-terrain-patch';
      readonly id: string;
      readonly cells: readonly GridCell[];
    }
  | {
      readonly kind: 'hazard-object';
      readonly object: WorldObject & { readonly kind: 'hazard' };
    }
  | {
      readonly kind: 'light-source';
      readonly object: WorldObject & { readonly kind: 'light-source' };
      readonly level: LightLevel;
      readonly cells: readonly GridCell[];
    }
  | {
      readonly kind: 'obscurement-patch';
      readonly id: string;
      readonly obscurement: 'light' | 'heavy';
      readonly cells: readonly GridCell[];
    }
  | {
      readonly kind: 'cover-object';
      readonly object: GeneratedCoverObject<'half_cover'> | GeneratedCoverObject<'three_quarters_cover'>;
    }
  | {
      readonly kind: 'wall';
      readonly id: string;
      readonly terrainKind: 'wall';
      readonly cells: readonly GridCell[];
    };

export interface RoomMonsterRosterEntry {
  readonly combatantId: `combatant:generated-${string}`;
  readonly tokenId: `token:generated-${string}`;
  readonly statblockId: string;
  readonly challengeRating: ChallengeRating;
  readonly challengeEighths: number;
}

export interface SampledSpellSlot {
  readonly level: number;
  readonly maximum: number;
  readonly remaining: number;
  readonly spent: number;
}

export interface SampledPartySeat {
  readonly combatantId: string;
  readonly hitPointFraction: PartyHitPointFraction;
  readonly hitPoints: number;
  readonly life: 'living' | 'dying';
  readonly deathSaves: null | {
    readonly successes: number;
    readonly failures: number;
  };
  readonly spellSlots: readonly SampledSpellSlot[];
  readonly concentrating: boolean;
}

export interface AuthoredPartySeat {
  readonly source: 'authored_exact';
  readonly combatantId: string;
  readonly hitPoints: number;
  readonly life: 'living' | 'dying' | 'dead';
  readonly deathSaves: null | {
    readonly successes: number;
    readonly failures: number;
  };
  readonly spellSlots: readonly SampledSpellSlot[];
  readonly concentrating: boolean;
}

export interface RoomSpec {
  readonly seed: number;
  /** Omitted for the original standard profile so its frozen bytes remain stable. */
  readonly difficultyProfile?: Exclude<RoomDifficultyProfile, 'standard'>;
  /** Omitted unless the caller explicitly opts into a versioned terrain generator. */
  readonly terrainProfile?: RoomTerrainProfile;
  readonly dimensions: {
    readonly columns: RoomGridDimension;
    readonly rows: RoomGridDimension;
  };
  readonly terrain: readonly RoomTerrainFeature[];
  readonly blockedCells: readonly GridCell[];
  readonly monsterRoster: readonly RoomMonsterRosterEntry[];
  readonly challengeBudgetEighths: number;
  readonly challengeSpentEighths: number;
  readonly heldoutOrdinary?: {
    readonly protocol: HeldoutOrdinaryProtocol;
    readonly partyLevel: HeldoutPartyLevel;
    readonly targetXp: HeldoutTargetXp;
    readonly spentXp: number;
    readonly family: StarterMonsterFamily;
    readonly eligibleStatblockIds: readonly string[];
    readonly maximizingVectorCount: number;
    readonly maximizingVectorIndex: number;
    readonly rng: {
      readonly algorithm: 'mulberry32';
      readonly normalizedSeed: number;
      readonly familyDrawIndex: number;
      readonly vectorDrawIndex: number;
    };
  };
  readonly partyState: readonly (SampledPartySeat | AuthoredPartySeat)[];
  readonly hardFeatures?: {
    readonly shape: 'single-gate';
    readonly chokepointCells: readonly GridCell[];
    readonly likelyApproachTerrainRegionIds: readonly string[];
  };
}

export interface GeneratedRoom {
  readonly spec: RoomSpec;
  readonly encounter: EncounterIr;
}

export interface GenerateRoomOptions {
  readonly difficulty?: RoomDifficultyProfile;
  readonly initiativeProfile?: RoomInitiativeProfile;
  readonly terrainProfile?: RoomTerrainProfile;
  readonly dimensions?: {
    readonly columns: RoomGridDimension;
    readonly rows: RoomGridDimension;
  };
  readonly provenance?: EncounterProvenance;
  readonly heldoutOrdinary?: HeldoutOrdinaryRoomOptions;
}

const GENERATED_PARTY_ABILITY_SCORES = {
  'combatant:fighter': {
    strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8,
  },
  'combatant:cleric': {
    strength: 10, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 15, charisma: 13,
  },
  'combatant:wizard': {
    strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10,
  },
} as const satisfies Readonly<Record<string, NonNullable<CombatantProfile['rules']['abilityScores']>>>;

const GENERATED_PARTY_SIZE_CATEGORIES = {
  'combatant:fighter': 'Medium',
  'combatant:cleric': 'Medium',
  'combatant:wizard': 'Medium',
} as const satisfies Readonly<Record<string, NonNullable<CombatantProfile['rules']['sizeCategory']>>>;

function derivedAbilityScores(
  profile: CombatantProfile,
): NonNullable<CombatantProfile['rules']['abilityScores']> {
  const scores = profile.rules.abilityScores ??
    GENERATED_PARTY_ABILITY_SCORES[String(profile.id) as keyof typeof GENERATED_PARTY_ABILITY_SCORES];
  if (scores === undefined) {
    throw new Error(`derived_v1 initiative requires Dexterity for ${profile.id}.`);
  }
  return scores;
}

/** Applies an opt-in arena profile without mutating frozen fixtures or their callers. */
export function applyRoomInitiativeProfile(
  state: EncounterState,
  profile: RoomInitiativeProfile,
): EncounterState {
  if (profile === 'legacy') return structuredClone(state);
  return {
    ...structuredClone(state),
    config: { ...state.config, initiativeMode: 'per_combatant' },
    combatants: state.combatants.map((combatant) => {
      const abilityScores = derivedAbilityScores(combatant.profile);
      const configuredPartySize = GENERATED_PARTY_SIZE_CATEGORIES[
        String(combatant.profile.id) as keyof typeof GENERATED_PARTY_SIZE_CATEGORIES
      ];
      return {
        ...structuredClone(combatant),
        profile: {
          ...structuredClone(combatant.profile),
          rules: {
            ...structuredClone(combatant.profile.rules),
            abilityScores: structuredClone(abilityScores),
            initiativeBonus: Math.floor((abilityScores.dexterity - 10) / 2),
            ...(configuredPartySize === undefined ? {} : { sizeCategory: configuredPartySize }),
          },
        },
      };
    }),
  };
}

const HARD_CONTROL_CASTER_ID = 'statblock:priest';
const HARD_MELEE_ID = 'statblock:guard';
const HARD_RANGED_ID = 'statblock:scout';

function rosterRow(id: string): (typeof STARTER_MONSTER_ROSTER)[number] {
  const row = STARTER_MONSTER_ROSTER.find((candidate) => candidate.id === id);
  if (row === undefined) throw new Error(`Bundled starter roster is missing ${id}.`);
  return row;
}

function integer(rng: Rng, minimum: number, maximum: number): number {
  return minimum + Math.floor(rng() * (maximum - minimum + 1));
}

function pick<const Value>(rng: Rng, values: readonly Value[]): Value {
  const value = values[Math.floor(rng() * values.length)];
  if (value === undefined) throw new RangeError('Cannot sample an empty vocabulary.');
  return value;
}

function challengeEighths(challenge: ChallengeRating): number {
  switch (challenge) {
    case '1/8': return 1;
    case '1/4': return 2;
    case '1/2': return 4;
    case 1: return 8;
    case 2: return 16;
    case 3: return 24;
    case 4: return 32;
    case 5: return 40;
    case 6: return 48;
    case 11: return 88;
  }
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function uniqueCells(cells: readonly GridCell[]): readonly GridCell[] {
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = cellKey(cell);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function patchCells(
  rng: Rng,
  dimensions: RoomSpec['dimensions'],
  reserved: ReadonlySet<string>,
): readonly [GridCell, ...GridCell[]] {
  const width = integer(rng, 2, 4);
  const height = integer(rng, 2, 4);
  const startColumn = integer(rng, 3, dimensions.columns - width - 3);
  const startRow = integer(rng, 1, dimensions.rows - height - 1);
  const result: GridCell[] = [];
  for (let row = startRow; row < startRow + height; row += 1) {
    for (let column = startColumn; column < startColumn + width; column += 1) {
      const cell = { column, row };
      if (!reserved.has(cellKey(cell))) result.push(cell);
    }
  }
  const [first, ...rest] = result;
  if (first !== undefined) return [first, ...rest];

  // A sampled patch can be fully covered by the hard layout's reserved cells.
  // Keep the consumed RNG sequence stable and deterministically select the
  // first legal interior cell instead of emitting an invalid empty region.
  for (let row = 1; row < dimensions.rows - 1; row += 1) {
    for (let column = 1; column < dimensions.columns - 1; column += 1) {
      const cell = { column, row };
      if (!reserved.has(cellKey(cell))) return [cell];
    }
  }
  throw new RangeError('Generated room has no unreserved interior cell for a terrain patch.');
}

function unreservedCell(
  rng: Rng,
  dimensions: RoomSpec['dimensions'],
  reserved: Set<string>,
): GridCell {
  for (let attempt = 0; attempt < dimensions.columns * dimensions.rows; attempt += 1) {
    const candidate = {
      column: integer(rng, 1, dimensions.columns - 2),
      row: integer(rng, 1, dimensions.rows - 2),
    };
    if (!reserved.has(cellKey(candidate))) {
      reserved.add(cellKey(candidate));
      return candidate;
    }
  }
  throw new RangeError('Generated room has no unreserved interior cell.');
}

function generatedWorldObject<const Kind extends 'hazard' | 'light-source'>(
  seed: number,
  sequence: number,
  kind: Kind,
  position: GridCell,
): WorldObject & { readonly kind: Kind } {
  return {
    id: worldObjectId(`world-object:generated-${String(seed)}-${String(sequence)}`),
    name: kind === 'hazard' ? 'Unstable Arcane Vent' : 'Runed Brazier',
    kind,
    position,
    footprint: [position],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: { movement: false, lineOfSight: false, cover: 'none' },
    createdRevision: 0,
  };
}

function legalGeneratedPositions(
  profiles: readonly CombatantProfile[],
  preferredPositions: readonly GridCell[],
  dimensions: RoomSpec['dimensions'],
  blockedCells: readonly GridCell[],
): readonly GridCell[] {
  const blocked = new Set(blockedCells.map(cellKey));
  const occupied: CreatureSpace<KnownCreatureSize>[] = [];
  return profiles.map((profile, index) => {
    const preferred = preferredPositions[index];
    if (preferred === undefined) throw new Error(`Generated combatant ${profile.id} has no preferred anchor.`);
    const size = profile.rules.sizeCategory;
    if (size === undefined) throw new Error(`Generated combatant ${profile.id} has no mechanical size.`);
    const combatant = sizedCombatantState(size);
    let acceptedSpace: CreatureSpace<KnownCreatureSize> | undefined;
    const relocated = autoRelocatePlacement(
      combatant,
      preferred,
      normalPlacementFor(combatant),
      dimensions,
      (space) => {
        const legal = space.cells.every((cell) => !blocked.has(cellKey(cell))) &&
          occupied.every((other) => !spacesIntersect(space, other));
        if (legal) acceptedSpace = space;
        return legal;
      },
    );
    if (relocated.kind === 'refused') {
      throw new RangeError(`Generated room has no legal anchor for ${profile.id}.`);
    }
    if (acceptedSpace === undefined) throw new Error(`Generated space for ${profile.id} disappeared.`);
    occupied.push(acceptedSpace);
    return relocated.placement.anchor;
  });
}

function sampledRoster(
  rng: Rng,
  seed: number,
): {
  readonly budget: number;
  readonly spent: number;
  readonly entries: readonly RoomMonsterRosterEntry[];
  readonly profiles: readonly CombatantProfile[];
} {
  const budget = integer(rng, 12, 24);
  const family = pick<StarterMonsterFamily>(rng, [
    'goblinoid_warband',
    'undead_crypt',
    'mercenary_company',
    'wild_beasts',
  ]);
  const familyRows = STARTER_MONSTER_ROSTER.filter((row) =>
    row.family === family && challengeEighths(row.challengeRating) <= budget);
  let remaining = budget;
  const entries: RoomMonsterRosterEntry[] = [];
  const profiles: CombatantProfile[] = [];
  while (entries.length < 6) {
    const affordable = familyRows.filter((row) => challengeEighths(row.challengeRating) <= remaining);
    if (affordable.length === 0) break;
    const row = pick(rng, affordable);
    const sequence = entries.length + 1;
    const combatantIdentity = `combatant:generated-${String(seed)}-monster-${String(sequence)}` as const;
    const tokenIdentity = `token:generated-${String(seed)}-monster-${String(sequence)}` as const;
    const eighths = challengeEighths(row.challengeRating);
    entries.push({
      combatantId: combatantIdentity,
      tokenId: tokenIdentity,
      statblockId: row.id,
      challengeRating: row.challengeRating,
      challengeEighths: eighths,
    });
    profiles.push(monsterCombatantProfile(row.statblock, {
      combatantId: combatantIdentity,
      tokenId: tokenIdentity,
    }));
    remaining -= eighths;
    if (entries.length >= 2 && rng() < 0.3) break;
  }
  return { budget, spent: budget - remaining, entries, profiles };
}

export const HELDOUT_STARTER_MONSTER_FAMILIES = [
  'goblinoid_warband',
  'undead_crypt',
  'mercenary_company',
  'wild_beasts',
] as const satisfies readonly StarterMonsterFamily[];

type HeldoutRosterSource = Pick<
  StarterMonsterRosterRow,
  'id' | 'family' | 'challengeRating' | 'statblock'
>;

export interface HeldoutMaximizingRoster {
  readonly statblockIds: readonly string[];
  readonly spentXp: number;
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function heldoutMaximizingMonsterRosters(
  family: StarterMonsterFamily,
  targetXp: HeldoutTargetXp,
  roster: readonly HeldoutRosterSource[] = STARTER_MONSTER_ROSTER,
): readonly HeldoutMaximizingRoster[] {
  const candidates = roster.filter((row) => row.family === family).map((row) => {
    const challenge = row.statblock.sourceDetails.challenge;
    if (challenge.kind !== 'present') {
      throw new Error(`Held-out starter monster ${row.id} has no sourced challenge XP.`);
    }
    return { row, xp: challenge.value.experiencePoints };
  });
  if (candidates.length === 0) {
    throw new Error(`Held-out starter family ${family} has no eligible monsters.`);
  }
  const reachable: Array<Array<Set<number>>> = Array.from(
    { length: candidates.length + 1 },
    () => Array.from({ length: 9 }, () => new Set<number>()),
  );
  reachable[candidates.length]?.[0]?.add(0);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];
    if (candidate === undefined) throw new Error('Held-out roster dynamic program lost a candidate.');
    for (let count = 0; count <= 8; count += 1) {
      const values = reachable[index]?.[count];
      if (values === undefined) throw new Error('Held-out roster dynamic-program state is absent.');
      for (let take = 0; take <= count; take += 1) {
        const suffix = reachable[index + 1]?.[count - take];
        if (suffix === undefined) throw new Error('Held-out roster suffix state is absent.');
        for (const suffixXp of suffix) {
          const xp = suffixXp + take * candidate.xp;
          if (xp <= targetXp) values.add(xp);
        }
      }
    }
  }
  let maximumXp = -1;
  for (let count = 2; count <= 8; count += 1) {
    for (const xp of reachable[0]?.[count] ?? []) maximumXp = Math.max(maximumXp, xp);
  }
  if (maximumXp < 0) {
    throw new Error(`Held-out starter family ${family} has no roster within ${String(targetXp)} XP.`);
  }
  const maximizing: HeldoutMaximizingRoster[] = [];
  const counts = Array.from({ length: candidates.length }, () => 0);
  const visit = (index: number, creaturesRemaining: number, xpRemaining: number): void => {
    if (index === candidates.length) {
      if (creaturesRemaining !== 0 || xpRemaining !== 0) return;
      const statblockIds = candidates.flatMap(({ row }, candidateIndex) =>
        Array.from({ length: counts[candidateIndex] ?? 0 }, () => row.id))
        .sort(codePointCompare);
      maximizing.push({ statblockIds, spentXp: maximumXp });
      return;
    }
    const candidate = candidates[index];
    if (candidate === undefined) throw new Error('Held-out roster enumeration lost a candidate.');
    for (let take = 0; take <= creaturesRemaining; take += 1) {
      const suffixXp = xpRemaining - take * candidate.xp;
      if (suffixXp < 0) break;
      if (!(reachable[index + 1]?.[creaturesRemaining - take]?.has(suffixXp) ?? false)) continue;
      counts[index] = take;
      visit(index + 1, creaturesRemaining - take, suffixXp);
    }
    counts[index] = 0;
  };
  for (let creatureCount = 2; creatureCount <= 8; creatureCount += 1) {
    if (reachable[0]?.[creatureCount]?.has(maximumXp) ?? false) {
      visit(0, creatureCount, maximumXp);
    }
  }
  return maximizing.sort((left, right) =>
    codePointCompare(left.statblockIds.join('\0'), right.statblockIds.join('\0')));
}

function sampledHeldoutRoster(
  rng: Rng,
  seed: number,
  targetXp: HeldoutTargetXp,
): {
  readonly budget: number;
  readonly spent: number;
  readonly entries: readonly RoomMonsterRosterEntry[];
  readonly profiles: readonly CombatantProfile[];
  readonly provenance: NonNullable<RoomSpec['heldoutOrdinary']>;
} {
  const familyDrawIndex = integer(rng, 0, HELDOUT_STARTER_MONSTER_FAMILIES.length - 1);
  const family = HELDOUT_STARTER_MONSTER_FAMILIES[familyDrawIndex];
  if (family === undefined) throw new Error('Held-out family draw was outside its closed registry.');
  const familyRows = STARTER_MONSTER_ROSTER.filter((row) => row.family === family);
  const maximizing = heldoutMaximizingMonsterRosters(family, targetXp);
  const vectorDrawIndex = integer(rng, 0, maximizing.length - 1);
  const selected = maximizing[vectorDrawIndex];
  if (selected === undefined) throw new Error('Held-out roster draw was outside its maximizing set.');
  const rowsById = new Map<string, (typeof familyRows)[number]>(
    familyRows.map((row) => [row.id, row]),
  );
  const entries = selected.statblockIds.map((statblockId, index): RoomMonsterRosterEntry => {
    const row = rowsById.get(statblockId);
    if (row === undefined) throw new Error(`Held-out roster selected unknown statblock ${statblockId}.`);
    return {
      combatantId: `combatant:generated-${String(seed)}-monster-${String(index + 1)}`,
      tokenId: `token:generated-${String(seed)}-monster-${String(index + 1)}`,
      statblockId,
      challengeRating: row.challengeRating,
      challengeEighths: challengeEighths(row.challengeRating),
    };
  });
  const profiles = entries.map((entry) => {
    const row = rowsById.get(entry.statblockId);
    if (row === undefined) throw new Error(`Held-out roster lost statblock ${entry.statblockId}.`);
    return monsterCombatantProfile(row.statblock, {
      combatantId: entry.combatantId,
      tokenId: entry.tokenId,
    });
  });
  const challengeTotal = entries.reduce((sum, entry) => sum + entry.challengeEighths, 0);
  return {
    budget: challengeTotal,
    spent: challengeTotal,
    entries,
    profiles,
    provenance: {
      protocol: 'heldout-ordinary-v1',
      partyLevel: 3,
      targetXp,
      spentXp: selected.spentXp,
      family,
      eligibleStatblockIds: familyRows.map((row) => row.id).sort(codePointCompare),
      maximizingVectorCount: maximizing.length,
      maximizingVectorIndex: vectorDrawIndex,
      rng: {
        algorithm: 'mulberry32',
        normalizedSeed: seed,
        familyDrawIndex,
        vectorDrawIndex,
      },
    },
  };
}

function sampledHardRoster(
  rng: Rng,
  seed: number,
): {
  readonly budget: number;
  readonly spent: number;
  readonly entries: readonly RoomMonsterRosterEntry[];
  readonly profiles: readonly CombatantProfile[];
} {
  const count = integer(rng, 4, 7);
  const required = [
    rosterRow(HARD_CONTROL_CASTER_ID),
    rosterRow(HARD_MELEE_ID),
    rosterRow(HARD_RANGED_ID),
  ];
  const reinforcements = STARTER_MONSTER_ROSTER.filter((row) =>
    row.family === 'mercenary_company' &&
    ['statblock:bandit', 'statblock:guard', 'statblock:scout', 'statblock:tough'].includes(row.id));
  const rows = [
    ...required,
    ...Array.from({ length: count - required.length }, () => pick(rng, reinforcements)),
  ];
  const entries = rows.map((row, index): RoomMonsterRosterEntry => {
    const sequence = index + 1;
    return {
      combatantId: `combatant:generated-${String(seed)}-monster-${String(sequence)}`,
      tokenId: `token:generated-${String(seed)}-monster-${String(sequence)}`,
      statblockId: row.id,
      challengeRating: row.challengeRating,
      challengeEighths: challengeEighths(row.challengeRating),
    };
  });
  const profiles = rows.map((row, index) => monsterCombatantProfile(row.statblock, {
    combatantId: entries[index]!.combatantId,
    tokenId: entries[index]!.tokenId,
  }));
  const spent = entries.reduce((total, entry) => total + entry.challengeEighths, 0);
  return { budget: spent + integer(rng, 0, 8), spent, entries, profiles };
}

function bundledChallengeRating(row: BundledMonsterRosterRow): ChallengeRating {
  const challenge = row.statblock.sourceDetails.challenge;
  if (challenge.kind === 'absent' || challenge.value.rating === 'none') {
    throw new Error(`Bundled monster ${row.id} has no challenge rating.`);
  }
  return challenge.value.rating;
}

function hasExecutableAction(row: BundledMonsterRosterRow): boolean {
  const actions = row.statblock.sourceDetails.actions;
  return actions.kind === 'present' && actions.value.some((action) =>
    action.execution?.kind !== 'absent');
}

function hasExecutableSpellcasting(row: BundledMonsterRosterRow): boolean {
  const actions = row.statblock.sourceDetails.actions;
  return actions.kind === 'present' && actions.value.some((action) =>
    action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
    action.spells.some((spell) => spell.manifestStatus === 'implemented'));
}

const BRUTAL_EXECUTABLE_ROSTER = BUNDLED_MONSTER_ROSTER.filter(hasExecutableAction);
const BRUTAL_EXECUTABLE_CASTERS = BUNDLED_MONSTER_ROSTER.filter(hasExecutableSpellcasting);

function sampledBrutalRoster(
  rng: Rng,
  seed: number,
): {
  readonly budget: number;
  readonly spent: number;
  readonly entries: readonly RoomMonsterRosterEntry[];
  readonly profiles: readonly CombatantProfile[];
} {
  const hardBaseline = sampledHardRoster(rng, seed);
  const budget = hardBaseline.budget * BRUTAL_CHALLENGE_BUDGET_SCALE;
  const caster = pick(rng, BRUTAL_EXECUTABLE_CASTERS.filter((row) =>
    challengeEighths(bundledChallengeRating(row)) <= budget));
  const rows: BundledMonsterRosterRow[] = [caster];
  let remaining = budget - challengeEighths(bundledChallengeRating(caster));

  while (remaining > 0 && rows.length < 8) {
    const affordable = BRUTAL_EXECUTABLE_ROSTER.filter((row) =>
      challengeEighths(bundledChallengeRating(row)) <= remaining);
    if (affordable.length === 0) break;
    const largestAffordable = Math.max(...affordable.map((row) =>
      challengeEighths(bundledChallengeRating(row))));
    const pressureRows = affordable.filter((row) =>
      challengeEighths(bundledChallengeRating(row)) >= Math.ceil(largestAffordable / 2));
    const row = pick(rng, pressureRows);
    rows.push(row);
    remaining -= challengeEighths(bundledChallengeRating(row));
  }

  const entries = rows.map((row, index): RoomMonsterRosterEntry => {
    const challengeRating = bundledChallengeRating(row);
    const sequence = index + 1;
    return {
      combatantId: `combatant:generated-${String(seed)}-monster-${String(sequence)}`,
      tokenId: `token:generated-${String(seed)}-monster-${String(sequence)}`,
      statblockId: row.id,
      challengeRating,
      challengeEighths: challengeEighths(challengeRating),
    };
  });
  const profiles = rows.map((row, index) => monsterCombatantProfile(row.statblock, {
    combatantId: entries[index]!.combatantId,
    tokenId: entries[index]!.tokenId,
  }));
  return { budget, spent: budget - remaining, entries, profiles };
}

function applyD466GeneratedRoomOverride(
  seed: number,
  roster: {
    readonly budget: number;
    readonly spent: number;
    readonly entries: readonly RoomMonsterRosterEntry[];
    readonly profiles: readonly CombatantProfile[];
  },
): typeof roster {
  const replacement = d466GeneratedRoomOverride(seed);
  if (replacement === null) return roster;
  const matchingIndexes = roster.entries.flatMap((entry, index) =>
    entry.statblockId === replacement.original ? [index] : []);
  if (matchingIndexes.length === 0) {
    throw new Error(
      `D466 room override seed ${String(seed)} has no ${replacement.original} to replace.`,
    );
  }
  const matchingIndexSet = new Set(matchingIndexes);
  const replacementStatblock = d466ReplacementStatblock(replacement);
  return {
    budget: roster.budget,
    spent: roster.spent,
    entries: roster.entries.map((entry, index) => matchingIndexSet.has(index)
      ? {
          ...entry,
          statblockId: replacement.replacement,
          challengeRating: replacement.challengeRating,
          challengeEighths: replacement.crEighths,
        }
      : entry),
    profiles: roster.profiles.map((profile, index) => {
      if (!matchingIndexSet.has(index)) return profile;
      const entry = roster.entries[index];
      if (profile.kind !== 'monster' || entry === undefined ||
        profile.statblockId !== replacement.original) {
        throw new Error(`D466 room override seed ${String(seed)} found a misaligned roster profile.`);
      }
      return monsterCombatantProfile(replacementStatblock, {
        combatantId: entry.combatantId,
        tokenId: entry.tokenId,
      });
    }),
  };
}

function hardChokepoint(
  rng: Rng,
  seed: number,
  dimensions: RoomSpec['dimensions'],
): {
  readonly blockedCells: readonly GridCell[];
  readonly terrain: readonly RoomTerrainFeature[];
  readonly chokepointCells: readonly GridCell[];
  readonly likelyApproachTerrainRegionIds: readonly string[];
} {
  const barrierColumn = Math.floor(dimensions.columns / 2);
  const gateRow = integer(rng, 3, dimensions.rows - 4);
  const chokepointCells = [{ column: barrierColumn, row: gateRow }];
  const blockedCells = Array.from({ length: dimensions.rows }, (_unused, row) => ({
    column: barrierColumn,
    row,
  })).filter((cell) => cell.row !== gateRow);
  const approachRegionId = `difficult:generated-${String(seed)}-approach`;
  const approachCells = uniqueCells([-2, -1, 1, 2].flatMap((columnOffset) =>
    [-1, 0, 1].map((rowOffset) => ({
      column: barrierColumn + columnOffset,
      row: gateRow + rowOffset,
    }))));
  return {
    blockedCells,
    terrain: [{
      kind: 'difficult-terrain-patch',
      id: approachRegionId,
      cells: approachCells,
    }],
    chokepointCells,
    likelyApproachTerrainRegionIds: [approachRegionId],
  };
}

function samplePartyState(
  rng: Rng,
  state: EncounterState,
): { readonly state: EncounterState; readonly samples: readonly SampledPartySeat[] } {
  const playerIndexes = state.combatants.flatMap((subject, index) =>
    subject.profile.kind === 'player_character' ? [index] : []);
  const downedIndex = rng() < 0.25 ? pick(rng, playerIndexes) : null;
  const casterIndexes = playerIndexes.filter((index) =>
    (state.combatants[index]?.spellSlots.length ?? 0) > 0 && index !== downedIndex);
  const concentratingIndex = casterIndexes.length > 0 && rng() < 0.5
    ? pick(rng, casterIndexes)
    : null;
  const samples: SampledPartySeat[] = [];
  const combatants = state.combatants.map((subject, index): EncounterCombatantState => {
    if (subject.profile.kind !== 'player_character') return subject;
    const downed = index === downedIndex;
    const fraction = downed ? 0 : pick(rng, PARTY_HIT_POINT_FRACTIONS.slice(0, -1));
    const spellSlots = subject.spellSlots.map((slot) => ({
      ...slot,
      remaining: integer(rng, 0, slot.maximum),
    }));
    const deathSaves = downed
      ? { successes: integer(rng, 0, 2), failures: integer(rng, 0, 2) }
      : null;
    const hitPoints = downed
      ? 0
      : Math.max(1, Math.ceil(subject.profile.rules.hitPointMaximum * fraction));
    samples.push({
      combatantId: subject.profile.id,
      hitPointFraction: fraction,
      hitPoints,
      life: downed ? 'dying' : 'living',
      deathSaves,
      spellSlots: spellSlots.map(({ level, maximum, remaining }) => ({
        level,
        maximum,
        remaining,
        spent: maximum - remaining,
      })),
      concentrating: index === concentratingIndex,
    });
    return {
      ...subject,
      hitPoints,
      life: downed ? 'dying' : 'living',
      deathSaves,
      spellSlots,
    };
  });
  if (concentratingIndex === null) return { state: { ...state, combatants }, samples };
  const owner = combatants[concentratingIndex];
  if (owner === undefined) throw new Error('Concentration sampler selected an absent party seat.');
  const effect = {
    id: encounterEffectId(`effect:generated-${String(state.revision + 1)}`),
    source: owner.profile.id,
    targets: [owner.profile.id],
    createdRevision: state.revision,
    duration: { kind: 'permanent' as const },
    concentrationOwner: owner.profile.id,
    stackingIdentity: effectStackingIdentity('generated:active-concentration'),
    stacking: 'replace_same_source' as const,
    repeatedSave: null,
    damageBreak: null,
    payload: { kind: 'armor_class_modifier' as const, amount: 1 },
  };
  return {
    state: {
      ...state,
      combatants,
      effects: [...state.effects, effect],
      nextEffectSequence: state.nextEffectSequence + 1,
    },
    samples,
  };
}

function generateLegacyRoom(seed: number, options: GenerateRoomOptions): GeneratedRoom {
  if (!Number.isSafeInteger(seed)) throw new RangeError('Room seed must be a safe integer.');
  const normalizedSeed = seed >>> 0;
  const rng = mulberry32(normalizedSeed);
  const heldout = options.heldoutOrdinary;
  if (heldout !== undefined) {
    if (options.difficulty !== undefined && options.difficulty !== 'standard') {
      throw new TypeError('Held-out ordinary rooms use only the standard difficulty layout.');
    }
    if (heldout.party.members.length !== 4) {
      throw new RangeError('Held-out ordinary rooms require exactly four player characters.');
    }
    const expectedTargetXp: Readonly<Record<HeldoutPartyLevel, HeldoutTargetXp>> = {
      3: 900,
      4: 1_500,
      5: 3_000,
      6: 4_000,
    };
    if (heldout.targetXp !== expectedTargetXp[heldout.partyLevel]) {
      throw new RangeError(
        `Held-out level ${String(heldout.partyLevel)} requires ${String(expectedTargetXp[heldout.partyLevel])} XP.`,
      );
    }
    for (const member of heldout.party.members) {
      const level = member.source.classes.reduce((sum, heldClass) => sum + heldClass.level, 0);
      if (level !== heldout.partyLevel) {
        throw new RangeError(
          `Held-out party member ${member.source.combatantId} is level ${String(level)}, expected ${String(heldout.partyLevel)}.`,
        );
      }
    }
  }
  const dimensions = options.dimensions ?? {
    columns: pick(rng, ROOM_GRID_DIMENSIONS),
    rows: pick(rng, ROOM_GRID_DIMENSIONS),
  };
  const partyProfiles = heldout === undefined
    ? referenceEncounterSetup().combatants.filter((profile) => profile.kind === 'player_character')
    : heldout.party.members.map((member) => member.profile);
  const difficulty = options.difficulty ?? 'standard';
  const sampledRoomRoster = heldout !== undefined
    ? sampledHeldoutRoster(rng, normalizedSeed, heldout.targetXp)
    : difficulty === 'brutal'
      ? sampledBrutalRoster(rng, normalizedSeed)
      : difficulty === 'hard'
        ? sampledHardRoster(rng, normalizedSeed)
        : sampledRoster(rng, normalizedSeed);
  const roster = difficulty === 'brutal'
    ? applyD466GeneratedRoomOverride(normalizedSeed, sampledRoomRoster)
    : sampledRoomRoster;
  const partyPositions = partyProfiles.map((_profile, index) => ({
    column: 1 + index % 2,
    row: 2 + index * 2,
  }));
  const monsterPositions = roster.profiles.map((_profile, index) => ({
    column: dimensions.columns - 2 - index % 2,
    row: 1 + Math.floor(index / 2) * 2,
  }));
  const reserved = new Set([...partyPositions, ...monsterPositions].map(cellKey));

  const hardLayout = difficulty === 'hard' || difficulty === 'brutal'
    ? hardChokepoint(rng, normalizedSeed, dimensions)
    : null;
  if (hardLayout !== null) {
    for (const cell of hardLayout.blockedCells) reserved.add(cellKey(cell));
    for (const feature of hardLayout.terrain) {
      if (feature.kind === 'difficult-terrain-patch') {
        for (const cell of feature.cells) reserved.add(cellKey(cell));
      }
    }
  }
  const blockedCells = hardLayout?.blockedCells ?? uniqueCells(Array.from(
    { length: integer(rng, 2, 5) },
    () => unreservedCell(rng, dimensions, reserved),
  ));
  const terrain: RoomTerrainFeature[] = hardLayout === null ? [] : [...hardLayout.terrain];
  if (hardLayout === null) {
    for (let sequence = 1; sequence <= integer(rng, 1, 3); sequence += 1) {
      terrain.push({
        kind: 'difficult-terrain-patch',
        id: `difficult:generated-${String(normalizedSeed)}-${String(sequence)}`,
        cells: patchCells(rng, dimensions, reserved),
      });
    }
  } else if (difficulty === 'brutal') {
    for (let sequence = 1; sequence <= integer(rng, 2, 3); sequence += 1) {
      terrain.push({
        kind: 'difficult-terrain-patch',
        id: `difficult:generated-${String(normalizedSeed)}-brutal-${String(sequence)}`,
        cells: patchCells(rng, dimensions, reserved),
      });
    }
  }
  let objectSequence = 1;
  const brutalHazardCount = difficulty === 'brutal' ? integer(rng, 3, 4) : null;
  for (let sequence = 1;
    sequence <= (brutalHazardCount ?? integer(rng, 1, 2)); sequence += 1) {
    const object = generatedWorldObject(
      normalizedSeed,
      objectSequence++,
      'hazard',
      unreservedCell(rng, dimensions, reserved),
    );
    terrain.push({ kind: 'hazard-object', object });
  }
  const brutalLightCount = difficulty === 'brutal' ? integer(rng, 2, 3) : null;
  for (let sequence = 1;
    sequence <= (brutalLightCount ?? integer(rng, 1, 2)); sequence += 1) {
    const object = generatedWorldObject(
      normalizedSeed,
      objectSequence++,
      'light-source',
      unreservedCell(rng, dimensions, reserved),
    );
    terrain.push({
      kind: 'light-source',
      object,
      level: pick(rng, ['bright', 'dim'] as const),
      cells: patchCells(rng, dimensions, reserved),
    });
  }
  if (difficulty === 'brutal') {
    for (let sequence = 1; sequence <= integer(rng, 2, 3); sequence += 1) {
      terrain.push({
        kind: 'obscurement-patch',
        id: `obscurement:generated-${String(normalizedSeed)}-${String(sequence)}`,
        obscurement: pick(rng, ['light', 'heavy'] as const),
        cells: patchCells(rng, dimensions, reserved),
      });
    }
  }
  const combatants = [...partyProfiles, ...roster.profiles];
  const positions = legalGeneratedPositions(
    combatants,
    [...partyPositions, ...monsterPositions],
    dimensions,
    blockedCells,
  );
  const fresh = createEncounter({
    bounds: dimensions,
    combatants,
    tokens: combatants.map((profile, index) => combatToken(
      profile,
      positions[index] ?? { column: 0, row: 0 },
    )),
    blockedCells,
    worldObjects: terrain.flatMap((feature) =>
      feature.kind === 'hazard-object' || feature.kind === 'light-source' ? [feature.object] : []),
    environment: {
      difficultTerrainRegions: terrain.flatMap((feature) =>
        feature.kind === 'difficult-terrain-patch'
          ? [{ id: feature.id, cells: feature.cells }]
          : []),
      lightRegions: terrain.flatMap((feature) =>
        feature.kind === 'light-source'
          ? [{ id: `light:${feature.object.id}`, cells: feature.cells, level: feature.level }]
          : []),
      obscurementRegions: terrain.flatMap((feature) =>
        feature.kind === 'obscurement-patch'
          ? [{ id: feature.id, cells: feature.cells, obscurement: feature.obscurement }]
          : []),
      movementRegions: [],
      narrowOpeningRegions: [],
    },
    dmNotes: [`Deterministic generated room seed ${String(normalizedSeed)}.`],
  });
  const sampled = heldout === undefined
    ? samplePartyState(rng, fresh)
    : {
        state: fresh,
        samples: fresh.combatants.flatMap((subject): readonly SampledPartySeat[] =>
          subject.profile.kind === 'player_character'
            ? [{
                combatantId: subject.profile.id,
                hitPointFraction: 1,
                hitPoints: subject.profile.rules.hitPointMaximum,
                life: 'living',
                deathSaves: null,
                spellSlots: subject.spellSlots.map((slot) => ({
                  level: slot.level,
                  maximum: slot.maximum,
                  remaining: slot.remaining,
                  spent: 0,
                })),
                concentrating: false,
              }]
            : []),
      };
  const profiledState = applyRoomInitiativeProfile(
    sampled.state,
    options.initiativeProfile ?? 'legacy',
  );
  const heldoutRosterProvenance = heldout === undefined
    ? undefined
    : (sampledRoomRoster as ReturnType<typeof sampledHeldoutRoster>).provenance;
  const spec: RoomSpec = {
    seed: normalizedSeed,
    ...(difficulty === 'standard' ? {} : { difficultyProfile: difficulty }),
    dimensions,
    terrain,
    blockedCells,
    monsterRoster: roster.entries,
    challengeBudgetEighths: roster.budget,
    challengeSpentEighths: roster.spent,
    ...(heldout === undefined || heldoutRosterProvenance === undefined ? {} : {
      heldoutOrdinary: {
        ...heldoutRosterProvenance,
        protocol: heldout.protocol,
        partyLevel: heldout.partyLevel,
      },
    }),
    partyState: sampled.samples,
    ...(hardLayout === null ? {} : {
      hardFeatures: {
        shape: 'single-gate' as const,
        chokepointCells: hardLayout.chokepointCells,
        likelyApproachTerrainRegionIds: hardLayout.likelyApproachTerrainRegionIds,
      },
    }),
  };
  return {
    spec,
    encounter: encounterIr(profiledState, options.provenance ?? {
      source: 'generated',
      licenseTag: 'MIT',
      seed: normalizedSeed,
    }),
  };
}

function cellIsInside(dimensions: GridBounds, cell: GridCell): boolean {
  return cell.column >= 0 && cell.column < dimensions.columns &&
    cell.row >= 0 && cell.row < dimensions.rows;
}

function featureFootprintCandidates(dimensions: GridBounds): readonly (readonly GridCell[])[] {
  const candidates: GridCell[][] = [];
  const shapes = [
    [{ column: 0, row: 0 }],
    [{ column: 0, row: -1 }, { column: 0, row: 0 }],
    [{ column: -1, row: 0 }, { column: 0, row: 0 }],
    [{ column: 0, row: -1 }, { column: 0, row: 0 }, { column: 0, row: 1 }],
    [{ column: -1, row: 0 }, { column: 0, row: 0 }, { column: 1, row: 0 }],
  ] as const;
  for (let row = 1; row < dimensions.rows - 1; row += 1) {
    for (let column = 1; column < dimensions.columns - 1; column += 1) {
      for (const shape of shapes) {
        const footprint = shape.map((offset) => ({
          column: column + offset.column,
          row: row + offset.row,
        }));
        if (footprint.every((cell) => cellIsInside(dimensions, cell))) candidates.push(footprint);
      }
    }
  }
  return candidates;
}

function generatedCoverObject<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  seed: number,
  terrainKind: TerrainKind,
  footprint: readonly GridCell[],
): GeneratedCoverObject<TerrainKind> {
  const position = footprint[0];
  if (position === undefined) throw new RangeError('Generated cover must occupy at least one cell.');
  const blocking = terrainBlocking(terrainKind) as GeneratedCoverObject<TerrainKind>['blocking'];
  return {
    id: worldObjectId(`world-object:generated-${String(seed)}-${terrainKind}`),
    name: terrainKind === 'half_cover' ? 'Low Stone Barricade' : 'Arrow-Slit Bulwark',
    kind: 'cover',
    terrainKind,
    position,
    footprint,
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking,
    createdRevision: 0,
  };
}

function livingOpposingPairs(state: EncounterState): readonly {
  readonly source: EncounterCombatantState;
  readonly target: EncounterCombatantState;
}[] {
  const party = state.combatants.filter((combatant) =>
    combatant.life === 'living' && combatant.profile.kind === 'player_character');
  const monsters = state.combatants.filter((combatant) =>
    combatant.life === 'living' && combatant.profile.kind === 'monster');
  return [
    ...party.flatMap((source) => monsters.map((target) => ({ source, target }))),
    ...monsters.flatMap((source) => party.map((target) => ({ source, target }))),
  ];
}

function traceHasAuthoredSource(
  state: EncounterState,
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  return livingOpposingPairs(state).some(({ source, target }) => {
    const trace = traceCombatantLine(state, source.profile.id, target.profile.id);
    return trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id));
  });
}

function hasOpenOpposingRay(state: EncounterState): boolean {
  if (livingOpposingPairs(state).some(({ source, target }) =>
    traceCombatantLine(state, source.profile.id, target.profile.id).tier === 'none')) return true;
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (!occupied.has(cellKey(target)) &&
          traceCombatantLineToCells(state, source.profile.id, [target]).tier === 'none') return true;
      }
    }
    return false;
  });
}

function traceToCellHasAuthoredSource(
  state: EncounterState,
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (occupied.has(cellKey(target))) continue;
        const trace = traceCombatantLineToCells(state, source.profile.id, [target]);
        if (trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id))) {
          return true;
        }
      }
    }
    return false;
  });
}

function occupiedCombatantCells(state: EncounterState): ReadonlySet<string> {
  return new Set(state.combatants.flatMap((combatant) => {
    if (combatant.life === 'dead' || !state.tokens.some((token) =>
      token.combatantId === combatant.profile.id)) return [];
    return combatantSpace(state, combatant.profile.id).cells.map(cellKey);
  }));
}

function footprintIsAvailable(
  footprint: readonly GridCell[],
  occupied: ReadonlySet<string>,
  authored: ReadonlySet<string>,
  blocked: boolean,
): boolean {
  const keys = footprint.map(cellKey);
  if (new Set(keys).size !== keys.length || keys.some((key) => occupied.has(key) || authored.has(key))) {
    return false;
  }
  if (!blocked) return true;
  return footprint.every((cell) => {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (authored.has(cellKey({
          column: cell.column + columnOffset,
          row: cell.row + rowOffset,
        }))) return false;
      }
    }
    return true;
  });
}

function withCoverObject<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  state: EncounterState,
  object: GeneratedCoverObject<TerrainKind>,
): EncounterState {
  return { ...state, worldObjects: [...state.worldObjects, object] };
}

function findCoverPlacement<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  state: EncounterState,
  seed: number,
  terrainKind: TerrainKind,
  occupied: ReadonlySet<string>,
  authored: ReadonlySet<string>,
  preserves: (candidate: EncounterState) => boolean,
): {
  readonly state: EncounterState;
  readonly object: GeneratedCoverObject<TerrainKind>;
} {
  const tier = terrainKind === 'half_cover' ? 'half' : 'three_quarters';
  for (const footprint of featureFootprintCandidates(state.bounds)) {
    if (!footprintIsAvailable(footprint, occupied, authored, terrainKind === 'three_quarters_cover')) {
      continue;
    }
    const object = generatedCoverObject(seed, terrainKind, footprint);
    const candidate = withCoverObject(state, object);
    const sourceId = `object:${String(object.id)}`;
    if (traceHasAuthoredSource(candidate, tier, new Set([sourceId])) && preserves(candidate)) {
      return { state: candidate, object };
    }
  }
  throw new RangeError(`los_cover_v1 could not place exercised ${terrainKind} for seed ${String(seed)}.`);
}

function findWallPlacement(
  state: EncounterState,
  seed: number,
  occupied: ReadonlySet<string>,
  authored: ReadonlySet<string>,
  halfSourceId: string,
  threeQuartersSourceId: string,
): { readonly state: EncounterState; readonly cells: readonly GridCell[] } {
  for (const footprint of featureFootprintCandidates(state.bounds)) {
    if (!footprintIsAvailable(footprint, occupied, authored, true)) continue;
    const candidate = { ...state, blockedCells: footprint };
    const wallSourceIds = new Set(footprint.map((cell) => `blocked:${cellKey(cell)}`));
    if (
      traceToCellHasAuthoredSource(candidate, 'total', wallSourceIds) &&
      traceHasAuthoredSource(candidate, 'half', new Set([halfSourceId])) &&
      traceHasAuthoredSource(candidate, 'three_quarters', new Set([threeQuartersSourceId])) &&
      hasOpenOpposingRay(candidate)
    ) return { state: candidate, cells: footprint };
  }
  throw new RangeError(`los_cover_v1 could not place an exercised wall for seed ${String(seed)}.`);
}

function applyLosCoverTerrainProfile(room: GeneratedRoom): GeneratedRoom {
  const seed = room.spec.seed;
  const baseState: EncounterState = {
    ...room.encounter.state,
    blockedCells: [],
    worldObjects: room.encounter.state.worldObjects.filter((object) => object.blocking.cover === 'none'),
  };
  const occupied = occupiedCombatantCells(baseState);
  const authored = new Set<string>();
  const half = findCoverPlacement(
    baseState,
    seed,
    'half_cover',
    occupied,
    authored,
    () => true,
  );
  half.object.footprint.forEach((cell) => authored.add(cellKey(cell)));
  const halfSourceId = `object:${String(half.object.id)}`;
  const threeQuarters = findCoverPlacement(
    half.state,
    seed,
    'three_quarters_cover',
    occupied,
    authored,
    (candidate) => traceHasAuthoredSource(
      candidate,
      'half',
      new Set([halfSourceId]),
    ),
  );
  threeQuarters.object.footprint.forEach((cell) => authored.add(cellKey(cell)));
  const threeQuartersSourceId = `object:${String(threeQuarters.object.id)}`;
  const wall = findWallPlacement(
    threeQuarters.state,
    seed,
    occupied,
    authored,
    halfSourceId,
    threeQuartersSourceId,
  );
  const wallId = `wall:generated-${String(seed)}-los-cover-v1`;
  const terrain: RoomTerrainFeature[] = [
    ...room.spec.terrain.filter((feature) =>
      feature.kind !== 'cover-object' && feature.kind !== 'wall'),
    { kind: 'cover-object', object: threeQuarters.object },
    { kind: 'cover-object', object: half.object },
    { kind: 'wall', id: wallId, terrainKind: 'wall', cells: wall.cells },
  ];
  const { hardFeatures: _legacyHardFeatures, ...legacySpec } = room.spec;
  return {
    spec: {
      ...legacySpec,
      terrainProfile: 'los_cover_v1',
      terrain,
      blockedCells: wall.cells,
    },
    encounter: {
      ...room.encounter,
      state: wall.state,
    },
  };
}

export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {
  const legacy = generateLegacyRoom(seed, options);
  return options.terrainProfile === 'los_cover_v1'
    ? applyLosCoverTerrainProfile(legacy)
    : legacy;
}
