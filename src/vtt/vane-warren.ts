import {
  monsterCombatantProfile,
  type CombatantProfile,
} from '../combat/combatant';
import {
  createEncounter,
  type EncounterState,
  type InitiativeEntry,
} from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import {
  GREASE_MATERIAL,
  WEB_MATERIAL,
  persistentAreaContains,
  type PersistentArea,
  type PersistentAreaMaterial,
} from '../combat/persistent-areas';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import { feetPoint } from '../combat/templates';
import {
  armorClass,
  combatantId,
  damageType,
  feet,
  persistentAreaId,
  worldObjectId,
  type CombatantId,
  type WorldObjectId,
} from '../combat/values';
import type {
  EncounterEnvironment,
  WorldObject,
} from '../combat/world-objects';
import { loadedPartyTurnLegalActions, type LoadedPartyMember } from './party-pack';
import { preloadPartySessionState, type PartySessionState } from './party-session-state';
import {
  storedPartyControllerIdentities,
  type StoredCharacterEncounter,
} from './stored-character-encounter';

export const VANE_WARREN_ID = 'encounter:vane-warren' as const;
export const VANE_WARREN_SESSION_ID = 'session:vane-warren-flagship' as const;
export const VANE_WARREN_FIGHT_IDS = [
  'cinder-rite',
  'iron-voice',
  'last-muster',
] as const;
export type VaneWarrenFightId = (typeof VANE_WARREN_FIGHT_IDS)[number];

export type VaneWarrenActivation =
  | { readonly kind: 'standing' }
  | { readonly kind: 'alarm_wave'; readonly waveId: string; readonly delayRounds: number }
  | { readonly kind: 'conditional'; readonly condition: 'leader_bloodied' };

export interface VaneWarrenRosterEntry {
  readonly id: string;
  readonly statblockId: string;
  readonly displayName: string;
  readonly position: GridCell;
  readonly activation: VaneWarrenActivation;
}

export interface VaneWarrenAlarmWave {
  readonly id: string;
  readonly delayRounds: number;
  readonly adds: readonly VaneWarrenRosterEntry[];
}

export interface VaneWarrenFight {
  readonly id: VaneWarrenFightId;
  readonly name: string;
  readonly leaderRosterId: string;
  readonly standing: readonly VaneWarrenRosterEntry[];
  readonly alarmWaves: readonly VaneWarrenAlarmWave[];
  readonly conditionalJoiners: readonly VaneWarrenRosterEntry[];
  readonly legendaryActionPool: number;
  readonly targetActionEconomyRatio: 3.5 | 2 | 1.5;
}

const standing = { kind: 'standing' } as const;
const bloodied = { kind: 'conditional', condition: 'leader_bloodied' } as const;

function roster(
  id: string,
  statblockId: string,
  displayName: string,
  column: number,
  row: number,
  activation: VaneWarrenActivation = standing,
): VaneWarrenRosterEntry {
  return { id, statblockId, displayName, position: { column, row }, activation };
}

const cinderWaveOne = [
  roster('cinder-wave-1-a', 'statblock:goblin-minion', 'Cinder Runner', 12, 1, { kind: 'alarm_wave', waveId: 'cinder-first-beat', delayRounds: 1 }),
  roster('cinder-wave-1-b', 'statblock:goblin-minion', 'Cinder Runner', 12, 3, { kind: 'alarm_wave', waveId: 'cinder-first-beat', delayRounds: 1 }),
  roster('cinder-wave-1-c', 'statblock:goblin-minion', 'Cinder Runner', 12, 6, { kind: 'alarm_wave', waveId: 'cinder-first-beat', delayRounds: 1 }),
  roster('cinder-wave-1-d', 'statblock:goblin-minion', 'Cinder Runner', 12, 8, { kind: 'alarm_wave', waveId: 'cinder-first-beat', delayRounds: 1 }),
] as const;
const cinderWaveTwo = [
  roster('cinder-wave-2-a', 'statblock:goblin-warrior', 'Vane Spear', 13, 1, { kind: 'alarm_wave', waveId: 'cinder-second-beat', delayRounds: 2 }),
  roster('cinder-wave-2-b', 'statblock:goblin-warrior', 'Vane Spear', 13, 3, { kind: 'alarm_wave', waveId: 'cinder-second-beat', delayRounds: 2 }),
  roster('cinder-wave-2-c', 'statblock:goblin-warrior', 'Vane Spear', 13, 6, { kind: 'alarm_wave', waveId: 'cinder-second-beat', delayRounds: 2 }),
  roster('cinder-wave-2-d', 'statblock:goblin-warrior', 'Vane Spear', 13, 8, { kind: 'alarm_wave', waveId: 'cinder-second-beat', delayRounds: 2 }),
] as const;

export const VANE_WARREN_FIGHTS = [
  {
    id: 'cinder-rite',
    name: 'The Cinder Rite',
    leaderRosterId: 'ashmaw',
    standing: [
      roster('ashmaw', 'statblock:vane-warren/ashmaw-brute-priest', 'Ashmaw, Cinder Votary', 9, 5),
      roster('cinder-brute', 'statblock:bugbear-warrior', 'Chain-Drag Brute', 8, 5),
      roster('cinder-guard-a', 'statblock:goblin-warrior', 'Vane Guard', 10, 2),
      roster('cinder-guard-b', 'statblock:goblin-warrior', 'Vane Guard', 10, 4),
      roster('cinder-guard-c', 'statblock:goblin-warrior', 'Vane Guard', 10, 6),
      roster('cinder-guard-d', 'statblock:goblin-warrior', 'Vane Guard', 10, 8),
    ],
    alarmWaves: [
      { id: 'cinder-first-beat', delayRounds: 1, adds: cinderWaveOne },
      { id: 'cinder-second-beat', delayRounds: 2, adds: cinderWaveTwo },
    ],
    conditionalJoiners: [],
    legendaryActionPool: 0,
    targetActionEconomyRatio: 3.5,
  },
  {
    id: 'iron-voice',
    name: 'The Iron Voice',
    leaderRosterId: 'marshal-kett',
    standing: [
      roster('marshal-kett', 'statblock:vane-warren/marshal-kett', 'Marshal Kett, the Iron Voice', 9, 5),
      roster('iron-retinue-a', 'statblock:hobgoblin-warrior', 'Iron Retainer', 8, 3),
      roster('iron-retinue-b', 'statblock:hobgoblin-warrior', 'Iron Retainer', 8, 7),
      roster('iron-retinue-c', 'statblock:goblin-boss', 'Vane Shield', 10, 3),
      roster('iron-retinue-d', 'statblock:goblin-boss', 'Vane Shield', 10, 7),
    ],
    alarmWaves: [],
    conditionalJoiners: [],
    legendaryActionPool: 3,
    targetActionEconomyRatio: 2,
  },
  {
    id: 'last-muster',
    name: 'The Last Muster',
    leaderRosterId: 'commander-sablehook',
    standing: [
      roster('commander-sablehook', 'statblock:hobgoblin-captain', 'Commander Sablehook', 9, 5),
      roster('muster-line-a', 'statblock:hobgoblin-warrior', 'Muster Guard', 8, 3),
      roster('muster-line-b', 'statblock:hobgoblin-warrior', 'Muster Guard', 8, 7),
      roster('muster-scout', 'statblock:goblin-boss', 'Hook Scout', 10, 5),
    ],
    alarmWaves: [],
    conditionalJoiners: [
      roster('muster-joiner-a', 'statblock:bugbear-warrior', 'Reserve Breaker', 12, 3, bloodied),
      roster('muster-joiner-b', 'statblock:bugbear-warrior', 'Reserve Breaker', 12, 7, bloodied),
    ],
    legendaryActionPool: 0,
    targetActionEconomyRatio: 1.5,
  },
] as const satisfies readonly VaneWarrenFight[];

export interface VaneWarrenActionEconomy {
  readonly enemyOpportunities: number;
  readonly partyOpportunities: 4;
  readonly ratio: number;
}

export function vaneWarrenActionEconomy(fight: VaneWarrenFight): VaneWarrenActionEconomy {
  const listedEnemies = fight.standing.length +
    fight.alarmWaves.reduce((count, wave) => count + wave.adds.length, 0) +
    fight.conditionalJoiners.length;
  const enemyOpportunities = listedEnemies + fight.legendaryActionPool;
  return {
    enemyOpportunities,
    partyOpportunities: 4,
    ratio: enemyOpportunities / 4,
  };
}

export type VaneWarrenObjectClass = 'war_drum' | 'brazier' | 'oil_cask';

export interface VaneWarrenWorldObject {
  readonly class: VaneWarrenObjectClass;
  readonly object: WorldObject;
}

function encounterObject(
  fightId: VaneWarrenFightId,
  objectClass: VaneWarrenObjectClass,
  name: string,
  position: GridCell,
): VaneWarrenWorldObject {
  const durability = objectClass === 'brazier'
    ? { kind: 'indestructible' as const }
    : { kind: 'hit_points' as const, hitPoints: objectClass === 'war_drum' ? 12 : 8, maximumHitPoints: objectClass === 'war_drum' ? 12 : 8 };
  return {
    class: objectClass,
    object: {
      id: worldObjectId(`world-object:vane-warren:${fightId}:${objectClass}`),
      name,
      kind: objectClass === 'brazier' ? 'light-source' : objectClass === 'oil_cask' ? 'hazard' : 'generic',
      position,
      footprint: [position],
      durability,
      armorClass: armorClass(objectClass === 'oil_cask' ? 10 : 12),
      damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'none' },
      createdRevision: 0,
    },
  };
}

export type VaneWarrenTerrainFeature =
  | { readonly kind: 'world_object'; readonly objectClass: VaneWarrenObjectClass; readonly objectId: WorldObjectId }
  | { readonly kind: 'flammable_surface'; readonly material: 'webs' | 'grease'; readonly areaId: string }
  | { readonly kind: 'difficult_terrain'; readonly regionId: string }
  | { readonly kind: 'light'; readonly regionId: string }
  | { readonly kind: 'obscurement'; readonly regionId: string }
  | { readonly kind: 'forced_movement_hazard'; readonly regionId: string };

function environment(fightId: VaneWarrenFightId, leader: CombatantId): EncounterEnvironment {
  return {
    lightRegions: [{
      id: `${fightId}:brazier-light`,
      level: 'dim',
      cells: [{ column: 7, row: 3 }, { column: 7, row: 4 }, { column: 8, row: 3 }, { column: 8, row: 4 }],
    }],
    difficultTerrainRegions: [{
      id: `${fightId}:rubble`,
      cells: [{ column: 5, row: 2 }, { column: 5, row: 3 }, { column: 5, row: 4 }],
    }],
    obscurementRegions: [{
      id: `${fightId}:smoke`,
      obscurement: 'light',
      cells: [{ column: 6, row: 6 }, { column: 6, row: 7 }, { column: 7, row: 6 }, { column: 7, row: 7 }],
    }],
    movementRegions: [{
      id: `${fightId}:ember-bed`,
      source: leader,
      entry: 'allowed',
      cells: [{ column: 7, row: 5 }, { column: 7, row: 6 }],
      damage: {
        damageType: damageType('Fire'),
        dice: { count: 1, sides: 4, modifier: 0 },
        unitFeet: 5,
        partialUnit: 'completed_units_only',
      },
    }],
  };
}

function areaHooks(material: PersistentAreaMaterial): PersistentArea['hooks'] {
  if (material.id === 'webs') {
    return (['on_enter', 'on_start_of_turn_inside'] as const).map((hook) => ({
      hook,
      frequency: 'once_per_turn' as const,
      effect: {
        kind: 'save_gated' as const,
        ability: 'dexterity' as const,
        dc: 13,
        rollMode: 'normal' as const,
        onSuccess: 'none' as const,
        payload: {
          kind: 'effect' as const,
          payload: { kind: 'condition' as const, condition: 'Restrained' as const },
          lifetime: { kind: 'while_inside' as const },
        },
      },
    }));
  }
  return (['on_enter', 'on_end_of_turn_inside'] as const).map((hook) => ({
    hook,
    frequency: 'once_per_turn' as const,
    effect: {
      kind: 'save_gated' as const,
      ability: 'dexterity' as const,
      dc: 13,
      rollMode: 'normal' as const,
      onSuccess: 'none' as const,
      payload: {
        kind: 'effect' as const,
        payload: { kind: 'condition' as const, condition: 'Prone' as const },
        lifetime: { kind: 'fixed_rounds' as const, rounds: 1, boundary: 'end' as const },
      },
    },
  }));
}

function seededArea(
  sequence: number,
  owner: CombatantId,
  material: PersistentAreaMaterial,
  point: GridCell,
): PersistentArea {
  return {
    id: persistentAreaId(`area:${String(sequence)}`),
    sequence,
    owner,
    origin: { kind: 'fixed', point: feetPoint(point.column * 5, point.row * 5) },
    shape: { kind: 'cube', size: feet(material.id === 'webs' ? 20 : 10) },
    duration: { kind: 'rounds', remaining: material.id === 'webs' ? 600 : 10 },
    targetFilter: { kind: 'all' },
    difficultTerrain: true,
    material,
    hooks: areaHooks(material),
    movable: null,
    burningCells: [],
    burnedAwayCells: [],
    members: [],
    consumedTurnKeys: [],
  };
}

function profileFor(fightId: VaneWarrenFightId, entry: VaneWarrenRosterEntry): CombatantProfile {
  const lookup = lookupBundledMonster(entry.statblockId);
  if (lookup.status === 'refused' || lookup.entry.kind !== 'static') {
    throw new Error(`The Vane Warren references unregistered statblock ${entry.statblockId}.`);
  }
  return {
    ...monsterCombatantProfile(lookup.entry.statblock, {
      combatantId: `combatant:vane-warren:${fightId}:${entry.id}`,
      tokenId: `token:vane-warren:${fightId}:${entry.id}`,
    }),
    name: entry.displayName,
  };
}

export type VaneWarrenAlarmState =
  | { readonly kind: 'ready' }
  | {
      readonly kind: 'sounded';
      readonly usedBy: CombatantId;
      readonly usedAtRound: number;
      readonly waves: readonly {
        readonly id: string;
        readonly deployAtRound: number;
        readonly status: 'pending' | 'deployed';
      }[];
    }
  | {
      readonly kind: 'complete';
      readonly usedBy: CombatantId;
      readonly usedAtRound: number;
      readonly deployedWaveIds: readonly string[];
    };

export interface VaneWarrenTransition {
  readonly kind: 'alarm_used' | 'alarm_wave_deployed' | 'conditional_joiners_deployed' | 'oil_cask_broken' | 'surface_ignited';
  readonly round: number;
  readonly ids: readonly string[];
}

export interface VaneWarrenEncounterState {
  readonly fight: VaneWarrenFight;
  readonly encounter: EncounterState;
  readonly objects: readonly VaneWarrenWorldObject[];
  readonly terrainFeatures: readonly VaneWarrenTerrainFeature[];
  readonly alarm: VaneWarrenAlarmState;
  readonly deployedRosterIds: readonly string[];
  readonly transitions: readonly VaneWarrenTransition[];
}

function fightById(id: VaneWarrenFightId): VaneWarrenFight {
  const fight = VANE_WARREN_FIGHTS.find((candidate) => candidate.id === id);
  if (fight === undefined) throw new Error(`Unknown Vane Warren fight ${id}.`);
  return fight;
}

function playerPositions(): readonly GridCell[] {
  return [
    { column: 1, row: 2 },
    { column: 1, row: 4 },
    { column: 1, row: 6 },
    { column: 1, row: 8 },
  ];
}

export function createVaneWarrenFight(
  fightId: VaneWarrenFightId,
  players: readonly CombatantProfile[],
): VaneWarrenEncounterState {
  if (players.length !== 4 || players.some((profile) => profile.kind !== 'player_character')) {
    throw new RangeError('The Vane Warren is balanced and bundled for exactly four player characters.');
  }
  const fight = fightById(fightId);
  const standingProfiles = fight.standing.map((entry) => profileFor(fightId, entry));
  const leaderIndex = fight.standing.findIndex((entry) => entry.id === fight.leaderRosterId);
  const leader = standingProfiles[leaderIndex];
  if (leader === undefined) throw new Error(`${fight.name} has no leader profile.`);
  const objects = [
    ...(fight.alarmWaves.length === 0
      ? []
      : [encounterObject(fightId, 'war_drum', 'Vane Warren War Drum', { column: 11, row: 5 })]),
    encounterObject(fightId, 'brazier', 'Coal-Red Brazier', { column: 7, row: 4 }),
    encounterObject(fightId, 'oil_cask', 'Pitch-Oil Cask', { column: 7, row: 7 }),
  ];
  const grease = seededArea(1, leader.id, GREASE_MATERIAL, { column: 6, row: 4 });
  const web = seededArea(2, leader.id, WEB_MATERIAL, { column: 6, row: 7 });
  const encounter = createEncounter({
    config: { initiativeMode: 'per_combatant', optionalRules: ['flammable_grease'] },
    rulesEdition: '2024',
    bounds: { columns: 14, rows: 10 },
    combatants: [...players, ...standingProfiles],
    tokens: [
      ...players.map((profile, index) => ({
        id: profile.tokenId,
        combatantId: profile.id,
        position: playerPositions()[index] as GridCell,
      })),
      ...standingProfiles.map((profile, index) => ({
        id: profile.tokenId,
        combatantId: profile.id,
        position: fight.standing[index]?.position ?? { column: 9, row: index + 1 },
      })),
    ],
    blockedCells: [{ column: 4, row: 1 }, { column: 4, row: 8 }],
    worldObjects: objects.map((entry) => entry.object),
    environment: environment(fightId, leader.id),
    foggedCells: [
      { column: 11, row: 1 }, { column: 12, row: 1 }, { column: 13, row: 1 },
      { column: 11, row: 8 }, { column: 12, row: 8 }, { column: 13, row: 8 },
    ],
    dmNotes: [
      `${VANE_WARREN_ID}: ${fight.name}.`,
      'Flat stronghold floor only: no elevation, falls, or chasms.',
      'Forced movement can drive creatures into the ember-bed movement hazard.',
    ],
  });
  const withAreas: EncounterState = {
    ...encounter,
    persistentAreas: [grease, web],
    nextPersistentAreaSequence: 3,
  };
  const terrainFeatures: readonly VaneWarrenTerrainFeature[] = [
    ...objects.map((entry): VaneWarrenTerrainFeature => ({
      kind: 'world_object', objectClass: entry.class, objectId: entry.object.id,
    })),
    { kind: 'flammable_surface', material: 'grease', areaId: String(grease.id) },
    { kind: 'flammable_surface', material: 'webs', areaId: String(web.id) },
    { kind: 'difficult_terrain', regionId: `${fightId}:rubble` },
    { kind: 'light', regionId: `${fightId}:brazier-light` },
    { kind: 'obscurement', regionId: `${fightId}:smoke` },
    { kind: 'forced_movement_hazard', regionId: `${fightId}:ember-bed` },
  ];
  return {
    fight,
    encounter: withAreas,
    objects,
    terrainFeatures,
    alarm: { kind: 'ready' },
    deployedRosterIds: fight.standing.map((entry) => entry.id),
    transitions: [],
  };
}

function positionOf(state: EncounterState, actor: CombatantId): GridCell {
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  if (token === undefined) throw new Error(`Combatant ${actor} has no Vane Warren token.`);
  return token.position;
}

function adjacent(left: GridCell, right: GridCell): boolean {
  return Math.max(Math.abs(left.column - right.column), Math.abs(left.row - right.row)) <= 1;
}

function drum(state: VaneWarrenEncounterState): VaneWarrenWorldObject {
  const found = state.objects.find((entry) => entry.class === 'war_drum');
  if (found === undefined) throw new Error(`${state.fight.name} has no war drum.`);
  return found;
}

export function useVaneWarrenWarDrum(
  state: VaneWarrenEncounterState,
  actor: CombatantId,
): VaneWarrenEncounterState {
  if (state.alarm.kind !== 'ready') throw new Error('The Vane Warren war drum has already been used.');
  const subject = state.encounter.combatants.find((candidate) => candidate.profile.id === actor);
  if (subject === undefined || subject.profile.kind !== 'monster') {
    throw new Error('Only an enemy in this fight can sound the Vane Warren war drum.');
  }
  const alarmObject = drum(state);
  if (!adjacent(positionOf(state.encounter, actor), alarmObject.object.position)) {
    throw new Error('The enemy must reach the war drum before using it.');
  }
  const usedAtRound = Math.max(1, state.encounter.round);
  return {
    ...state,
    alarm: {
      kind: 'sounded',
      usedBy: actor,
      usedAtRound,
      waves: state.fight.alarmWaves.map((wave) => ({
        id: wave.id,
        deployAtRound: usedAtRound + wave.delayRounds,
        status: 'pending',
      })),
    },
    transitions: [...state.transitions, {
      kind: 'alarm_used', round: usedAtRound, ids: [String(alarmObject.object.id)],
    }],
  };
}

function openPosition(state: EncounterState, preferred: GridCell): GridCell {
  const occupied = new Set(state.tokens.map((token) => `${String(token.position.column)},${String(token.position.row)}`));
  const blocked = new Set(state.blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`));
  for (let radius = 0; radius < Math.max(state.bounds.columns, state.bounds.rows); radius += 1) {
    for (let row = Math.max(0, preferred.row - radius); row <= Math.min(state.bounds.rows - 1, preferred.row + radius); row += 1) {
      for (let column = Math.max(0, preferred.column - radius); column <= Math.min(state.bounds.columns - 1, preferred.column + radius); column += 1) {
        const key = `${String(column)},${String(row)}`;
        if (!occupied.has(key) && !blocked.has(key)) return { column, row };
      }
    }
  }
  throw new Error('The Vane Warren has no open reinforcement cell.');
}

function deployRosterEntries(
  state: VaneWarrenEncounterState,
  entries: readonly VaneWarrenRosterEntry[],
): VaneWarrenEncounterState {
  let encounter = state.encounter;
  const profiles: CombatantProfile[] = [];
  const positions: GridCell[] = [];
  for (const entry of entries) {
    const profile = profileFor(state.fight.id, entry);
    const position = openPosition(encounter, entry.position);
    profiles.push(profile);
    positions.push(position);
    encounter = {
      ...encounter,
      tokens: [...encounter.tokens, { id: profile.tokenId, combatantId: profile.id, position }],
    };
  }
  const initialized = createEncounter({
    bounds: state.encounter.bounds,
    combatants: profiles,
    tokens: profiles.map((profile, index) => ({
      id: profile.tokenId,
      combatantId: profile.id,
      position: positions[index] as GridCell,
    })),
  });
  const lastSlot = Math.max(-1, ...encounter.initiative.map((entry) => entry.slot));
  const lastTotal = Math.min(0, ...encounter.initiative.map((entry) => entry.total));
  const appendedInitiative: readonly InitiativeEntry[] = encounter.initiative.length === 0
    ? []
    : profiles.map((profile, index) => ({
        combatant: profile.id,
        total: lastTotal - 1,
        roll: 1,
        bonus: profile.rules.initiativeBonus,
        slot: lastSlot + index + 1,
      }));
  return {
    ...state,
    encounter: {
      ...encounter,
      revision: encounter.revision + 1,
      combatants: [...encounter.combatants, ...initialized.combatants],
      initiative: [...encounter.initiative, ...appendedInitiative],
    },
    deployedRosterIds: [...state.deployedRosterIds, ...entries.map((entry) => entry.id)],
  };
}

export function advanceVaneWarrenAlarm(
  state: VaneWarrenEncounterState,
  round: number,
): VaneWarrenEncounterState {
  if (!Number.isSafeInteger(round) || round < 1) throw new RangeError('Alarm advancement requires a positive round.');
  if (state.alarm.kind !== 'sounded') return state;
  const due = state.alarm.waves.filter((wave) => wave.status === 'pending' && wave.deployAtRound <= round);
  let next = state;
  for (const pending of due) {
    const wave = state.fight.alarmWaves.find((candidate) => candidate.id === pending.id);
    if (wave === undefined) throw new Error(`Alarm wave ${pending.id} is not listed for ${state.fight.name}.`);
    next = deployRosterEntries(next, wave.adds);
    next = {
      ...next,
      transitions: [...next.transitions, {
        kind: 'alarm_wave_deployed', round, ids: wave.adds.map((entry) => entry.id),
      }],
    };
  }
  const waves = state.alarm.waves.map((wave) =>
    due.some((candidate) => candidate.id === wave.id) ? { ...wave, status: 'deployed' as const } : wave);
  const remaining = waves.some((wave) => wave.status === 'pending');
  return {
    ...next,
    alarm: remaining
      ? { ...state.alarm, waves }
      : {
          kind: 'complete',
          usedBy: state.alarm.usedBy,
          usedAtRound: state.alarm.usedAtRound,
          deployedWaveIds: waves.map((wave) => wave.id),
        },
  };
}

export function deployVaneWarrenConditionalJoiners(
  state: VaneWarrenEncounterState,
): VaneWarrenEncounterState {
  const pending = state.fight.conditionalJoiners.filter((entry) => !state.deployedRosterIds.includes(entry.id));
  if (pending.length === 0) return state;
  const leaderEntry = state.fight.standing.find((entry) => entry.id === state.fight.leaderRosterId);
  if (leaderEntry === undefined) throw new Error(`${state.fight.name} has no listed leader.`);
  const leaderId = combatantId(`combatant:vane-warren:${state.fight.id}:${leaderEntry.id}`);
  const leader = state.encounter.combatants.find((candidate) => candidate.profile.id === leaderId);
  if (leader === undefined || leader.hitPoints * 2 > leader.profile.rules.hitPointMaximum) return state;
  const deployed = deployRosterEntries(state, pending);
  return {
    ...deployed,
    transitions: [...deployed.transitions, {
      kind: 'conditional_joiners_deployed',
      round: Math.max(1, state.encounter.round),
      ids: pending.map((entry) => entry.id),
    }],
  };
}

export function breakVaneWarrenOilCask(
  state: VaneWarrenEncounterState,
): VaneWarrenEncounterState {
  const cask = state.objects.find((entry) => entry.class === 'oil_cask');
  if (cask === undefined || !state.encounter.worldObjects.some((object) => object.id === cask.object.id)) return state;
  const sequence = state.encounter.nextPersistentAreaSequence;
  const owner = state.encounter.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
  if (owner === undefined) throw new Error('The oil-cask surface requires a fight owner.');
  const grease = seededArea(sequence, owner, GREASE_MATERIAL, cask.object.position);
  return {
    ...state,
    encounter: {
      ...state.encounter,
      revision: state.encounter.revision + 1,
      worldObjects: state.encounter.worldObjects.filter((object) => object.id !== cask.object.id),
      persistentAreas: [...state.encounter.persistentAreas, grease],
      nextPersistentAreaSequence: sequence + 1,
    },
    terrainFeatures: [...state.terrainFeatures, {
      kind: 'flammable_surface', material: 'grease', areaId: String(grease.id),
    }],
    transitions: [...state.transitions, {
      kind: 'oil_cask_broken', round: Math.max(1, state.encounter.round), ids: [String(cask.object.id), String(grease.id)],
    }],
  };
}

export function igniteVaneWarrenSurfaceFromBrazier(
  state: VaneWarrenEncounterState,
  cell: GridCell,
): VaneWarrenEncounterState {
  const brazier = state.objects.find((entry) => entry.class === 'brazier');
  if (brazier === undefined || !adjacent(brazier.object.position, cell)) {
    throw new Error('A Vane Warren brazier can ignite only an adjacent cell.');
  }
  const initiativeIndex = state.encounter.activeInitiativeIndex;
  if (initiativeIndex === null) throw new Error('Roll initiative before resolving brazier ignition.');
  const matching = state.encounter.persistentAreas.filter((area) => {
    const flammability = area.material?.flammability;
    const enabled = flammability?.kind === 'flammable' ||
      (flammability?.kind === 'optional_rule' && state.encounter.config.optionalRules?.includes(flammability.rule) === true);
    return enabled && persistentAreaContains(area, cell, null, state.encounter);
  });
  if (matching.length === 0) throw new Error('The adjacent cell has no enabled flammable surface.');
  const encounter = {
    ...state.encounter,
    revision: state.encounter.revision + 1,
    persistentAreas: state.encounter.persistentAreas.map((area) => matching.some((candidate) => candidate.id === area.id)
      ? {
          ...area,
          burningCells: area.burningCells.some((entry) => entry.cell.column === cell.column && entry.cell.row === cell.row)
            ? area.burningCells
            : [...area.burningCells, {
                cell: { ...cell },
                burnsAwayAt: { round: state.encounter.round + 1, initiativeIndex },
              }],
        }
      : area),
  };
  return {
    ...state,
    encounter,
    transitions: [...state.transitions, {
      kind: 'surface_ignited', round: state.encounter.round, ids: matching.map((area) => String(area.id)),
    }],
  };
}

export function composeVaneWarrenFight(
  fightId: VaneWarrenFightId,
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  partyState: PartySessionState,
): StoredCharacterEncounter {
  const players = members.map((member) => ({
    ...member.profile,
    name: displayNames.get(member.profile.characterId) ?? member.profile.name,
  }));
  const bundle = createVaneWarrenFight(fightId, players);
  const state = preloadPartySessionState(bundle.encounter, partyState);
  const partyActions = loadedPartyTurnLegalActions(members);
  return {
    rulesEdition: '2024',
    partyState,
    members,
    displayNames,
    state,
    playerIds: players.map((profile) => profile.id),
    controllers: storedPartyControllerIdentities(state.combatants),
    turnLegalActions: (current, actor) => {
      const member = members.find((candidate) => candidate.profile.id === actor);
      return member === undefined
        ? { actions: [{ type: 'end_turn', actor }] }
        : partyActions(current, actor);
    },
  };
}

export function composeVaneWarrenSessionEncounter(
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  partyState: PartySessionState,
): StoredCharacterEncounter {
  const fightId = VANE_WARREN_FIGHT_IDS[partyState.room - 1];
  if (fightId === undefined) {
    throw new Error('The three-encounter Vane Warren session is complete.');
  }
  return {
    ...composeVaneWarrenFight(fightId, members, displayNames, partyState),
    composeNextRoom: composeVaneWarrenSessionEncounter,
    sessionFlow: {
      name: 'The Vane Warren',
      encounterCount: 3,
      endControlLabel: 'End Session and export',
    },
  };
}
