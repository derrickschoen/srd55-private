import {
  combatToken,
  monsterCombatantProfile,
  type CombatantProfile,
} from '../combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterCommandReducer,
  type EncounterReduction,
  type EncounterState,
  type EncounterReductionOptions,
  type InitiativeEntry,
} from '../combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../combat/events';
import { combatantSpace } from '../combat/combat-rules';
import {
  creatureSpace,
  minimumSpaceDistanceToCells,
  normalPlacementFor,
  placementFor,
  sizedCombatantState,
  spaceFitsBounds,
  spacesIntersect,
  spaceTouchesCellSet,
} from '../combat/creature-space';
import type { GridCell } from '../combat/grid';
import { terrainPassabilityAt } from '../combat/terrain';
import type { Rng } from '../combat/random';
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
import { exactOrder } from '../domain/exact-table';
import {
  dmWorldObjectOverrideCommand,
  worldObjectClassActionCommands,
} from '../combat/world-object-actions';
import { loadedPartyTurnLegalActions, type LoadedPartyMember } from './party-pack';
import { preloadPartySessionState, type PartySessionState } from './party-session-state';
import { regretTurnLegalActions } from './regret/legal-actions';
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
  readonly targetActionEconomyRatio: 0.4 | 0.8;
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
] as const;
const cinderWaveTwo = [
  roster('cinder-wave-2-a', 'statblock:goblin-warrior', 'Vane Spear', 13, 1, { kind: 'alarm_wave', waveId: 'cinder-second-beat', delayRounds: 2 }),
] as const;

const VANE_WARREN_FIGHTS_BY_ID = {
  'cinder-rite': {
    id: 'cinder-rite',
    name: 'The Cinder Rite',
    leaderRosterId: 'ashmaw',
    standing: [
      roster('ashmaw', 'statblock:vane-warren/ashmaw-brute-priest', 'Ashmaw, Cinder Votary', 9, 5),
      roster('cinder-guard-b', 'statblock:goblin-warrior', 'Vane Guard', 10, 4),
    ],
    alarmWaves: [
      { id: 'cinder-first-beat', delayRounds: 1, adds: cinderWaveOne },
      { id: 'cinder-second-beat', delayRounds: 2, adds: cinderWaveTwo },
    ],
    conditionalJoiners: [],
    legendaryActionPool: 0,
    targetActionEconomyRatio: 0.8,
  },
  'iron-voice': {
    id: 'iron-voice',
    name: 'The Iron Voice',
    leaderRosterId: 'marshal-kett',
    standing: [
      roster('marshal-kett', 'statblock:vane-warren/marshal-kett', 'Marshal Kett, the Iron Voice', 9, 5),
    ],
    alarmWaves: [],
    conditionalJoiners: [],
    legendaryActionPool: 1,
    targetActionEconomyRatio: 0.4,
  },
  'last-muster': {
    id: 'last-muster',
    name: 'The Last Muster',
    leaderRosterId: 'commander-sablehook',
    standing: [
      roster('commander-sablehook', 'statblock:hobgoblin-captain', 'Commander Sablehook', 11, 5),
    ],
    alarmWaves: [],
    conditionalJoiners: [
      roster('muster-joiner-a', 'statblock:goblin-warrior', 'Reserve Spear', 12, 3, bloodied),
    ],
    legendaryActionPool: 0,
    targetActionEconomyRatio: 0.4,
  },
} as const satisfies Readonly<Record<VaneWarrenFightId, VaneWarrenFight>>;

export const VANE_WARREN_FIGHTS = exactOrder(
  VANE_WARREN_FIGHTS_BY_ID,
  VANE_WARREN_FIGHT_IDS,
);

export type VaneWarrenRehearsalScenario = 'default' | 'tpk-clean' | 'tpk-recovery';

export interface VaneWarrenTpkScenarioConfig {
  readonly id: Exclude<VaneWarrenRehearsalScenario, 'default'>;
  readonly sessionId: string;
  readonly sessionName: string;
  readonly recovery: 'none' | 'revivify_and_dm_override';
  readonly startingReinforcements: readonly VaneWarrenRosterEntry[];
  readonly playerPositions: readonly GridCell[];
  readonly enemyPositions: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>;
}

const TPK_INITIAL_REINFORCEMENTS = [
  ...cinderWaveOne,
  ...cinderWaveTwo,
  roster('doomed-crocodile', 'statblock:giant-crocodile', 'Cinder Maw', 3, 4),
  roster('doomed-crocodile-second', 'statblock:giant-crocodile', 'Second Cinder Maw', 3, 5),
  roster('doomed-crocodile-third', 'statblock:giant-crocodile', 'Third Cinder Maw', 3, 1),
  roster('doomed-crocodile-fourth', 'statblock:giant-crocodile', 'Fourth Cinder Maw', 3, 2),
  roster('doomed-crocodile-fifth', 'statblock:giant-crocodile', 'Fifth Cinder Maw', 3, 6),
  roster('doomed-crocodile-sixth', 'statblock:giant-crocodile', 'Sixth Cinder Maw', 3, 7),
] as const;

const TPK_PLAYER_POSITIONS = [
  { column: 3, row: 1 },
  { column: 4, row: 0 },
  { column: 11, row: 1 },
  { column: 3, row: 8 },
  { column: 7, row: 8 },
] as const;

/** Manually curated completeness oracle; it is not derived from the table. */
export const VANE_WARREN_TPK_REQUIRED_ENEMY_ROSTER_IDS = [
  'ashmaw',
  'cinder-guard-b',
  'cinder-wave-1-a',
  'cinder-wave-2-a',
  'doomed-crocodile',
  'doomed-crocodile-second',
  'doomed-crocodile-third',
  'doomed-crocodile-fourth',
  'doomed-crocodile-fifth',
  'doomed-crocodile-sixth',
] as const;
export type VaneWarrenTpkEnemyRosterId =
  (typeof VANE_WARREN_TPK_REQUIRED_ENEMY_ROSTER_IDS)[number];

const TPK_ENEMY_POSITIONS = {
  ashmaw: { column: 4, row: 3 },
  'cinder-guard-b': { column: 4, row: 5 },
  'cinder-wave-1-a': { column: 5, row: 5 },
  'cinder-wave-2-a': { column: 4, row: 6 },
  'doomed-crocodile': { column: 0, row: 0 },
  'doomed-crocodile-second': { column: 5, row: 0 },
  'doomed-crocodile-third': { column: 8, row: 0 },
  'doomed-crocodile-fourth': { column: 0, row: 7 },
  'doomed-crocodile-fifth': { column: 8, row: 7 },
  'doomed-crocodile-sixth': { column: 11, row: 7 },
} as const satisfies Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>;

function tpkEnemyPosition(
  positions: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>,
  rosterId: string,
): GridCell | undefined {
  for (const requiredId of VANE_WARREN_TPK_REQUIRED_ENEMY_ROSTER_IDS) {
    if (requiredId === rosterId) return positions[requiredId];
  }
  return undefined;
}

/** Rehearsal-only composition variants. Every combatant uses an existing statblock unchanged. */
export const VANE_WARREN_TPK_SCENARIOS = {
  'tpk-clean': {
    id: 'tpk-clean',
    sessionId: 'session:vane-warren-tpk-clean',
    sessionName: 'The Cinder Rite — doomed clean wipe',
    recovery: 'none',
    startingReinforcements: TPK_INITIAL_REINFORCEMENTS,
    playerPositions: TPK_PLAYER_POSITIONS,
    enemyPositions: TPK_ENEMY_POSITIONS,
  },
  'tpk-recovery': {
    id: 'tpk-recovery',
    sessionId: 'session:vane-warren-tpk-recovery',
    sessionName: 'The Cinder Rite — doomed partial recovery',
    recovery: 'revivify_and_dm_override',
    startingReinforcements: TPK_INITIAL_REINFORCEMENTS,
    playerPositions: TPK_PLAYER_POSITIONS,
    enemyPositions: TPK_ENEMY_POSITIONS,
  },
} as const satisfies Readonly<Record<
  Exclude<VaneWarrenRehearsalScenario, 'default'>,
  VaneWarrenTpkScenarioConfig
>>;

export interface VaneWarrenActionEconomy {
  readonly enemyOpportunities: number;
  readonly partyOpportunities: 5;
  readonly ratio: number;
}

export function vaneWarrenActionEconomy(fight: VaneWarrenFight): VaneWarrenActionEconomy {
  const listedEnemies = fight.standing.length +
    fight.alarmWaves.reduce((count, wave) => count + wave.adds.length, 0) +
    fight.conditionalJoiners.length;
  const enemyOpportunities = listedEnemies + fight.legendaryActionPool;
  return {
    enemyOpportunities,
    partyOpportunities: 5,
    ratio: enemyOpportunities / 5,
  };
}

export type VaneWarrenObjectClass = 'war_drum' | 'brazier' | 'oil_cask';
export const VANE_WARREN_SOUND_DRUM_ACTION_ID = 'sound_war_drum' as const;
export const VANE_WARREN_DRUMMER_PRIORITY = 10_000 as const;

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
  const cover = objectClass === 'war_drum' ? 'three_quarters' as const : 'half' as const;
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
      blocking: { movement: false, lineOfSight: false, cover },
      ...(objectClass === 'war_drum'
        ? {
            classActions: [{
              id: VANE_WARREN_SOUND_DRUM_ACTION_ID,
              label: 'Sound the war drum',
              cost: 'action',
              reach: 'adjacent',
              uses: 'once',
              eligibleActor: 'monster',
              controllerPriority: {
                actor: combatantId(`combatant:vane-warren:${fightId}:cinder-guard-b`),
                score: VANE_WARREN_DRUMMER_PRIORITY,
              },
              dmOverride: {
                actor: combatantId(`combatant:vane-warren:${fightId}:cinder-guard-b`),
                reasoning: 'DM fallback: the Vane Warren war drum sounds and starts its authored alarm waves.',
              },
            }],
          }
        : {}),
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
    narrowOpeningRegions: [],
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

function playerPositions(scenario: VaneWarrenRehearsalScenario): readonly GridCell[] {
  if (scenario !== 'default') return VANE_WARREN_TPK_SCENARIOS[scenario].playerPositions;
  return [
    { column: 1, row: 2 },
    { column: 1, row: 4 },
    { column: 1, row: 6 },
    { column: 1, row: 8 },
    { column: 2, row: 5 },
  ];
}

export function createVaneWarrenFight(
  fightId: VaneWarrenFightId,
  players: readonly CombatantProfile[],
  scenario: VaneWarrenRehearsalScenario = 'default',
): VaneWarrenEncounterState {
  if (players.length !== 5 || players.some((profile) => profile.kind !== 'player_character')) {
    throw new RangeError('The Vane Warren is bundled for exactly five player characters.');
  }
  const fight = fightById(fightId);
  if (scenario !== 'default' && fightId !== 'cinder-rite') {
    throw new Error(`${scenario} is configured only for The Cinder Rite.`);
  }
  const scenarioConfig = scenario === 'default' ? null : VANE_WARREN_TPK_SCENARIOS[scenario];
  const startingRoster = [
    ...fight.standing,
    ...(scenarioConfig?.startingReinforcements ?? []),
  ];
  const standingProfiles = startingRoster.map((entry) => profileFor(fightId, entry));
  const leaderEntry = fight.standing.find((entry) => entry.id === fight.leaderRosterId);
  if (leaderEntry === undefined) throw new Error(`${fight.name} has no leader profile.`);
  const leader = profileFor(fightId, leaderEntry);
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
      ...players.map((profile, index) => combatToken(profile, playerPositions(scenario)[index] as GridCell)),
      ...startingRoster.map((entry) => {
        const profile = profileFor(fightId, entry);
        return combatToken(profile, scenarioConfig === null
          ? entry.position
          : tpkEnemyPosition(scenarioConfig.enemyPositions, entry.id) ?? entry.position);
      }),
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
      ...(scenarioConfig === null ? [] : [
        `${scenarioConfig.id}: the alarm was pre-sounded and both authored waves plus the doomed reinforcement composition begin on the board.`,
      ]),
    ],
  });
  const alarmCaller = combatantId(`combatant:vane-warren:${fightId}:cinder-guard-b`);
  const alarmObjectId = worldObjectId(`world-object:vane-warren:${fightId}:war_drum`);
  const configuredEvents: readonly EncounterEvent[] = scenarioConfig === null
    ? []
    : [
        {
          sequence: 1,
          type: 'world_object_used',
          actor: alarmCaller,
          objectId: alarmObjectId,
          actionId: VANE_WARREN_SOUND_DRUM_ACTION_ID,
          round: 1,
          authority: 'dm_override',
        },
        ...fight.alarmWaves.map((wave, index): EncounterEvent => ({
          sequence: index + 2,
          type: 'reinforcement_wave_deployed',
          objectId: alarmObjectId,
          waveId: wave.id,
          calledBy: alarmCaller,
          combatants: wave.adds.map((entry) => combatantId(`combatant:vane-warren:${fightId}:${entry.id}`)),
          round: 1,
        })),
      ];
  const withAreas: EncounterState = {
    ...encounter,
    eventLog: configuredEvents,
    nextEventSequence: configuredEvents.length + 1,
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
    alarm: scenarioConfig === null
      ? { kind: 'ready' }
      : {
          kind: 'complete',
          usedBy: alarmCaller,
          usedAtRound: 1,
          deployedWaveIds: fight.alarmWaves.map((wave) => wave.id),
        },
    deployedRosterIds: startingRoster.map((entry) => entry.id),
    transitions: [],
  };
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
  if (!state.encounter.tokens.some((token) => token.combatantId === actor)) {
    throw new Error(`Combatant ${actor} has no Vane Warren token.`);
  }
  if (minimumSpaceDistanceToCells(combatantSpace(state.encounter, actor), alarmObject.object.footprint) > 5) {
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

export function vaneWarrenWorldObjectLegalActions(
  state: VaneWarrenEncounterState,
  actor: CombatantId,
): readonly EncounterCommand[] {
  return worldObjectClassActionCommands(state.encounter, actor).actions;
}

export function vaneWarrenDmWarDrumControl(
  state: VaneWarrenEncounterState,
): Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }> | null {
  const alarmObject = drum(state);
  return dmWorldObjectOverrideCommand(
    state.encounter,
    alarmObject.object.id,
    VANE_WARREN_SOUND_DRUM_ACTION_ID,
  );
}

export function reduceVaneWarrenWorldObjectAction(
  state: VaneWarrenEncounterState,
  command: Extract<EncounterCommand, { readonly type: 'use_world_object' | 'dm_use_world_object' }>,
  rng: Rng = () => 0,
): VaneWarrenEncounterState {
  const reduction = reduceEncounter(state.encounter, command, rng);
  const sounded = useVaneWarrenWarDrum({ ...state, encounter: reduction.state }, command.actor);
  return sounded;
}

function openPosition(
  state: EncounterState,
  profile: CombatantProfile,
  preferred: GridCell,
  additionalOccupied: readonly ReturnType<typeof combatantSpace>[],
): GridCell {
  const size = profile.rules.sizeCategory;
  if (size === undefined) throw new Error(`The Vane Warren reinforcement ${profile.id} has no mechanical size.`);
  const sized = sizedCombatantState(size);
  const occupied = [
    ...state.tokens.map((token) => combatantSpace(state, token.combatantId)),
    ...additionalOccupied,
  ];
  const blocked = [
    ...state.blockedCells,
    ...state.worldObjects.flatMap((object) => object.footprint.filter((cell) =>
      terrainPassabilityAt(state, cell) === 'blocked')),
    ...(state.environment.movementRegions ?? []).filter((region) => region.entry === 'blocked').flatMap((region) => region.cells),
  ];
  for (let radius = 0; radius < Math.max(state.bounds.columns, state.bounds.rows); radius += 1) {
    for (let row = Math.max(0, preferred.row - radius); row <= Math.min(state.bounds.rows - 1, preferred.row + radius); row += 1) {
      for (let column = Math.max(0, preferred.column - radius); column <= Math.min(state.bounds.columns - 1, preferred.column + radius); column += 1) {
        const anchor = { column, row };
        const candidate = creatureSpace(sized, placementFor(sized, anchor, normalPlacementFor(sized)));
        if (spaceFitsBounds(candidate, state.bounds) &&
          !spaceTouchesCellSet(candidate, blocked) &&
          occupied.every((space) => !spacesIntersect(candidate, space))) return anchor;
      }
    }
  }
  throw new Error('The Vane Warren has no open reinforcement cell.');
}

function deployRosterEntriesInEncounter(
  initial: EncounterState,
  fight: VaneWarrenFight,
  entries: readonly VaneWarrenRosterEntry[],
  incrementRevision = true,
): EncounterState {
  const profiles: CombatantProfile[] = [];
  const positions: GridCell[] = [];
  const addedSpaces: ReturnType<typeof combatantSpace>[] = [];
  for (const entry of entries) {
    const profile = profileFor(fight.id, entry);
    const position = openPosition(initial, profile, entry.position, addedSpaces);
    profiles.push(profile);
    positions.push(position);
    const size = profile.rules.sizeCategory;
    if (size === undefined) throw new Error(`The Vane Warren reinforcement ${profile.id} has no mechanical size.`);
    const sized = sizedCombatantState(size);
    addedSpaces.push(creatureSpace(sized, placementFor(sized, position, normalPlacementFor(sized))));
  }
  const initialized = createEncounter({
    bounds: initial.bounds,
    combatants: profiles,
    tokens: profiles.map((profile, index) => combatToken(profile, positions[index] as GridCell)),
  });
  const lastSlot = Math.max(-1, ...initial.initiative.map((entry) => entry.slot));
  const lastTotal = Math.min(0, ...initial.initiative.map((entry) => entry.total));
  const appendedInitiative: readonly InitiativeEntry[] = initial.initiative.length === 0
    ? []
    : profiles.map((profile, index) => ({
        combatant: profile.id,
        total: lastTotal - 1,
        roll: 1,
        bonus: profile.rules.initiativeBonus,
        slot: lastSlot + index + 1,
      }));
  return {
    ...initial,
    revision: incrementRevision ? initial.revision + 1 : initial.revision,
    combatants: [...initial.combatants, ...initialized.combatants],
    tokens: [...initial.tokens, ...initialized.tokens],
    initiative: [...initial.initiative, ...appendedInitiative],
  };
}

function deployRosterEntries(
  state: VaneWarrenEncounterState,
  entries: readonly VaneWarrenRosterEntry[],
): VaneWarrenEncounterState {
  return {
    ...state,
    encounter: deployRosterEntriesInEncounter(state.encounter, state.fight, entries),
    deployedRosterIds: [...state.deployedRosterIds, ...entries.map((entry) => entry.id)],
  };
}

function fightForEncounter(state: EncounterState): VaneWarrenFight | null {
  return VANE_WARREN_FIGHTS.find((fight) => state.combatants.some((subject) =>
    subject.profile.id === combatantId(`combatant:vane-warren:${fight.id}:${fight.leaderRosterId}`))) ?? null;
}

export const reduceVaneWarrenEncounter: EncounterCommandReducer = (
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
  options: EncounterReductionOptions = {},
): EncounterReduction => {
  const reduction = reduceEncounter(state, command, rng, options);
  const fight = fightForEncounter(reduction.state);
  if (fight === null) return reduction;
  const alarmObjectId = worldObjectId(`world-object:vane-warren:${fight.id}:war_drum`);
  const alarm = reduction.state.eventLog.find((event) =>
    event.type === 'world_object_used' &&
    event.objectId === alarmObjectId &&
    event.actionId === VANE_WARREN_SOUND_DRUM_ACTION_ID);
  let next = reduction.state;
  const events: EncounterEvent[] = [...reduction.events];
  if (alarm?.type === 'world_object_used') {
    for (const wave of fight.alarmWaves) {
      const deployAtRound = alarm.round + wave.delayRounds;
      const alreadyDeployed = wave.adds.every((entry) => next.combatants.some((subject) =>
        subject.profile.id === combatantId(`combatant:vane-warren:${fight.id}:${entry.id}`)));
      if (alreadyDeployed || deployAtRound > next.round) continue;
      next = deployRosterEntriesInEncounter(next, fight, wave.adds, false);
      const event: EncounterEvent = {
        sequence: next.nextEventSequence,
        type: 'reinforcement_wave_deployed',
        objectId: alarmObjectId,
        waveId: wave.id,
        calledBy: alarm.actor,
        combatants: wave.adds.map((entry) => combatantId(`combatant:vane-warren:${fight.id}:${entry.id}`)),
        round: next.round,
      };
      next = {
        ...next,
        nextEventSequence: next.nextEventSequence + 1,
        eventLog: [...next.eventLog, event],
      };
      events.push(event);
    }
  }
  const pendingJoiners = fight.conditionalJoiners.filter((entry) => !next.combatants.some((subject) =>
    subject.profile.id === combatantId(`combatant:vane-warren:${fight.id}:${entry.id}`)));
  const leader = next.combatants.find((subject) =>
    subject.profile.id === combatantId(`combatant:vane-warren:${fight.id}:${fight.leaderRosterId}`));
  if (pendingJoiners.length > 0 && leader !== undefined &&
    leader.hitPoints * 2 <= leader.profile.rules.hitPointMaximum) {
    next = deployRosterEntriesInEncounter(next, fight, pendingJoiners, false);
    const event: EncounterEvent = {
      sequence: next.nextEventSequence,
      type: 'conditional_joiners_deployed',
      leader: leader.profile.id,
      combatants: pendingJoiners.map((entry) => combatantId(`combatant:vane-warren:${fight.id}:${entry.id}`)),
      condition: 'leader_bloodied',
      round: next.round,
    };
    next = {
      ...next,
      nextEventSequence: next.nextEventSequence + 1,
      eventLog: [...next.eventLog, event],
    };
    events.push(event);
  }
  return { state: next, events };
};

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
  policy?: Parameters<typeof loadedPartyTurnLegalActions>[1],
  scenario: VaneWarrenRehearsalScenario = 'default',
): StoredCharacterEncounter {
  const players = members.map((member) => ({
    ...member.profile,
    name: displayNames.get(member.profile.characterId) ?? member.profile.name,
  }));
  const bundle = createVaneWarrenFight(fightId, players, scenario);
  const state = preloadPartySessionState(bundle.encounter, partyState);
  const partyActions = loadedPartyTurnLegalActions(members, vaneWarrenPartyPolicy('default', policy));
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
      const base = member === undefined
        ? regretTurnLegalActions(current, actor).actions
        : partyActions(current, actor).actions;
      return { actions: [...worldObjectClassActionCommands(current, actor).actions, ...base] };
    },
  };
}

export function vaneWarrenPartyPolicy(
  scenario: VaneWarrenRehearsalScenario,
  override?: Parameters<typeof loadedPartyTurnLegalActions>[1],
): NonNullable<Parameters<typeof loadedPartyTurnLegalActions>[1]> {
  if (override !== undefined) return override;
  return {
    useHealingPotions: true,
    openWithBless: true,
    reserveClericSlotsForBless: true,
    useWizardTactics: true,
    useClericContingency: true,
    ...(scenario === 'default'
      ? {}
      : { reserveClericSlotForRevivify: scenario === 'tpk-recovery' }),
  };
}

export function composeVaneWarrenSessionEncounter(
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  partyState: PartySessionState,
  scenario: VaneWarrenRehearsalScenario = 'default',
): StoredCharacterEncounter {
  if (scenario !== 'default') {
    const config = VANE_WARREN_TPK_SCENARIOS[scenario];
    const encounter = composeVaneWarrenFight(
      'cinder-rite',
      members,
      displayNames,
      partyState,
      vaneWarrenPartyPolicy(scenario),
      scenario,
    );
    return {
      ...encounter,
      controllers: encounter.controllers.map((identity) => ({
        ...identity,
        controllerId: `${identity.combatantId}:algorithm:rehearsal`,
        kind: 'algorithm' as const,
      })),
      startPaused: true,
      sessionFlow: {
        name: config.sessionName,
        encounterCount: 1,
        endControlLabel: 'End Session and export',
      },
    };
  }
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
