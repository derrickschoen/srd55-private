import { monsterCombatantProfile, type CombatantProfile } from '../combat/combatant';
import { createEncounter, type EncounterCombatantState, type EncounterState } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import { mulberry32, type Rng } from '../combat/random';
import type { ChallengeRating } from '../combat/statblock';
import {
  BUNDLED_MONSTER_ROSTER,
  STARTER_MONSTER_ROSTER,
  type BundledMonsterRosterRow,
  type StarterMonsterFamily,
} from '../combat/statblocks/roster';
import {
  armorClass,
  effectStackingIdentity,
  encounterEffectId,
  worldObjectId,
} from '../combat/values';
import type { LightLevel, WorldObject } from '../combat/world-objects';
import { referenceEncounterSetup } from './reference-encounter';
import { encounterIr, type EncounterIr, type EncounterProvenance } from './encounter-ir';

export const ROOM_GRID_DIMENSIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const;
export type RoomGridDimension = (typeof ROOM_GRID_DIMENSIONS)[number];

export const PARTY_HIT_POINT_FRACTIONS = [1, 0.75, 0.5, 0.25, 0] as const;
export type PartyHitPointFraction = (typeof PARTY_HIT_POINT_FRACTIONS)[number];

export const ROOM_DIFFICULTY_PROFILES = ['standard', 'hard', 'brutal'] as const;
export type RoomDifficultyProfile = (typeof ROOM_DIFFICULTY_PROFILES)[number];

export const BRUTAL_CHALLENGE_BUDGET_SCALE = 2 as const;
export const BRUTAL_TERRAIN_FEATURE_COUNT_BAND = { minimum: 10, maximum: 14 } as const;

export const ROOM_INITIATIVE_PROFILES = ['legacy', 'derived_v1'] as const;
export type RoomInitiativeProfile = (typeof ROOM_INITIATIVE_PROFILES)[number];

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

export interface RoomSpec {
  readonly seed: number;
  /** Omitted for the original standard profile so its frozen bytes remain stable. */
  readonly difficultyProfile?: Exclude<RoomDifficultyProfile, 'standard'>;
  readonly dimensions: {
    readonly columns: RoomGridDimension;
    readonly rows: RoomGridDimension;
  };
  readonly terrain: readonly RoomTerrainFeature[];
  readonly blockedCells: readonly GridCell[];
  readonly monsterRoster: readonly RoomMonsterRosterEntry[];
  readonly challengeBudgetEighths: number;
  readonly challengeSpentEighths: number;
  readonly partyState: readonly SampledPartySeat[];
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
  readonly dimensions?: {
    readonly columns: RoomGridDimension;
    readonly rows: RoomGridDimension;
  };
  readonly provenance?: EncounterProvenance;
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
      return {
        ...structuredClone(combatant),
        profile: {
          ...structuredClone(combatant.profile),
          rules: {
            ...structuredClone(combatant.profile.rules),
            abilityScores: structuredClone(abilityScores),
            initiativeBonus: Math.floor((abilityScores.dexterity - 10) / 2),
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

export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {
  if (!Number.isSafeInteger(seed)) throw new RangeError('Room seed must be a safe integer.');
  const normalizedSeed = seed >>> 0;
  const rng = mulberry32(normalizedSeed);
  const dimensions = options.dimensions ?? {
    columns: pick(rng, ROOM_GRID_DIMENSIONS),
    rows: pick(rng, ROOM_GRID_DIMENSIONS),
  };
  const partyProfiles = referenceEncounterSetup().combatants.filter(
    (profile) => profile.kind === 'player_character',
  );
  const difficulty = options.difficulty ?? 'standard';
  const roster = difficulty === 'brutal'
    ? sampledBrutalRoster(rng, normalizedSeed)
    : difficulty === 'hard'
      ? sampledHardRoster(rng, normalizedSeed)
      : sampledRoster(rng, normalizedSeed);
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
  const positions = [...partyPositions, ...monsterPositions];
  const fresh = createEncounter({
    bounds: dimensions,
    combatants,
    tokens: combatants.map((profile, index) => ({
      id: profile.tokenId,
      combatantId: profile.id,
      position: positions[index] ?? { column: 0, row: 0 },
    })),
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
    },
    dmNotes: [`Deterministic generated room seed ${String(normalizedSeed)}.`],
  });
  const sampled = samplePartyState(rng, fresh);
  const profiledState = applyRoomInitiativeProfile(
    sampled.state,
    options.initiativeProfile ?? 'legacy',
  );
  const spec: RoomSpec = {
    seed: normalizedSeed,
    ...(difficulty === 'standard' ? {} : { difficultyProfile: difficulty }),
    dimensions,
    terrain,
    blockedCells,
    monsterRoster: roster.entries,
    challengeBudgetEighths: roster.budget,
    challengeSpentEighths: roster.spent,
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
