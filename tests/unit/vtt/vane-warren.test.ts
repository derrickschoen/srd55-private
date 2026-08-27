import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import {
  coverTierBetweenObjects,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { persistentAreaContains } from '../../../src/combat/persistent-areas';
import { worldObjectId, type CombatantId } from '../../../src/combat/values';
import { projectPlayerView } from '../../../src/combat/visibility';
import { WorldObjectAlgorithmController } from '../../../src/combat/world-object-controller';
import { loadExternalPartyPack, type ExternalPartyPackV2 } from '../../../src/vtt/party-pack';
import { createPartySessionState } from '../../../src/vtt/party-session-state';
import {
  VANE_WARREN_DRUMMER_PRIORITY,
  VANE_WARREN_FIGHTS,
  VANE_WARREN_SOUND_DRUM_ACTION_ID,
  VANE_WARREN_TPK_SCENARIOS,
  advanceVaneWarrenAlarm,
  breakVaneWarrenOilCask,
  composeVaneWarrenFight,
  composeVaneWarrenSessionEncounter,
  createVaneWarrenFight,
  deployVaneWarrenConditionalJoiners,
  igniteVaneWarrenSurfaceFromBrazier,
  reduceVaneWarrenEncounter,
  reduceVaneWarrenWorldObjectAction,
  useVaneWarrenWarDrum,
  vaneWarrenDmWarDrumControl,
  vaneWarrenWorldObjectLegalActions,
  vaneWarrenActionEconomy,
  vaneWarrenPartyPolicy,
  type VaneWarrenEncounterState,
  type VaneWarrenFightId,
} from '../../../src/vtt/vane-warren';
import { playerProfile } from '../combat/fixtures';

function faceOne(): number {
  return 0;
}

function players() {
  return [
    playerProfile('vane-player-a', { initiativeBonus: 30, hitPoints: 40 }),
    playerProfile('vane-player-b', { initiativeBonus: 20, hitPoints: 40 }),
    playerProfile('vane-player-c', { initiativeBonus: 10, hitPoints: 40 }),
    playerProfile('vane-player-d', { initiativeBonus: 5, hitPoints: 40 }),
    playerProfile('vane-player-e', { initiativeBonus: 0, hitPoints: 40 }),
  ] as const;
}

function loadedMutationParty() {
  const members: ExternalPartyPackV2['members'] = Array.from({ length: 5 }, (_unused, index) => ({
    combatantId: `combatant:vane-loaded-${String(index)}`,
    tokenId: `token:vane-loaded-${String(index)}`,
    characterId: 20_000 + index,
    classes: [{ classId: 'Fighter', level: 5 }],
    hitDice: [{ sides: 10, maximum: 5 }],
    abilities: {
      strength: 16, dexterity: 12, constitution: 14,
      intelligence: 10, wisdom: 10, charisma: 8,
    },
    armorClass: 16,
    hitPointMaximum: 30,
    sizeCategory: 'Medium',
    walkingSpeedFeet: 30,
    initiativeBonus: index,
    savingThrowBonuses: {
      strength: 5, dexterity: 1, constitution: 4,
      intelligence: 0, wisdom: 0, charisma: -1,
    },
    attacksPerAction: 1,
    attacks: [{
      attackId: `attack:vane-loaded-${String(index)}`,
      kind: 'ranged',
      attackBonus: 6,
      criticalFloor: 20,
      reachFeet: 5,
      rangeFeet: 100,
      damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 3 }],
    }],
    startingConditions: [],
  }));
  const loaded = loadExternalPartyPack({
    schemaVersion: 2,
    partyId: 'party:vane-mutation-contract',
    allowPartial: false,
    members,
  });
  if (loaded.status !== 'loaded') throw new Error('Vane mutation party was refused.');
  return loaded.party;
}

function fight(id: VaneWarrenFightId): VaneWarrenEncounterState {
  return createVaneWarrenFight(id, players());
}

function combatantIdFor(state: VaneWarrenEncounterState, rosterId: string): CombatantId {
  const subject = state.encounter.combatants.find((candidate) =>
    String(candidate.profile.id).endsWith(`:${rosterId}`));
  if (subject === undefined) throw new Error(`Missing deployed roster entry ${rosterId}.`);
  return subject.profile.id;
}

function hitPoints(state: EncounterState, id: CombatantId): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new Error(`Missing combatant ${id}.`);
  return subject.hitPoints;
}

function activeTurn(
  state: VaneWarrenEncounterState,
  actor: CombatantId,
): VaneWarrenEncounterState {
  return {
    ...state,
    encounter: {
      ...state.encounter,
      activeCombatant: actor,
      round: 1,
      combatants: state.encounter.combatants.map((candidate) => candidate.profile.id === actor
        ? {
            ...candidate,
            turn: {
              ...candidate.turn,
              action: { kind: 'available' },
            },
          }
        : candidate),
    },
  };
}

describe('D377.5 The Vane Warren flagship bundle', () => {
  it('tpk_rehearsal_configs: keeps the default fight unchanged and stacks both doomed variants from existing roster content', () => {
    const ordinary = createVaneWarrenFight('cinder-rite', players());
    const clean = createVaneWarrenFight('cinder-rite', players(), 'tpk-clean');
    const recovery = createVaneWarrenFight('cinder-rite', players(), 'tpk-recovery');

    expect(ordinary.encounter.combatants).toHaveLength(7);
    expect(ordinary.alarm).toEqual({ kind: 'ready' });
    expect(ordinary.encounter.eventLog).toEqual([]);
    for (const configured of [clean, recovery]) {
      expect(configured.encounter.combatants).toHaveLength(15);
      expect(configured.alarm).toEqual(expect.objectContaining({
        kind: 'complete',
        deployedWaveIds: ['cinder-first-beat', 'cinder-second-beat'],
      }));
      expect(configured.encounter.eventLog.map((event) => event.type)).toEqual([
        'world_object_used',
        'reinforcement_wave_deployed',
        'reinforcement_wave_deployed',
      ]);
      expect(configured.encounter.eventLog).toEqual([
        {
          sequence: 1,
          type: 'world_object_used',
          actor: 'combatant:vane-warren:cinder-rite:cinder-guard-b',
          objectId: 'world-object:vane-warren:cinder-rite:war_drum',
          actionId: VANE_WARREN_SOUND_DRUM_ACTION_ID,
          round: 1,
          authority: 'dm_override',
        },
        {
          sequence: 2,
          type: 'reinforcement_wave_deployed',
          objectId: 'world-object:vane-warren:cinder-rite:war_drum',
          waveId: 'cinder-first-beat',
          calledBy: 'combatant:vane-warren:cinder-rite:cinder-guard-b',
          combatants: ['combatant:vane-warren:cinder-rite:cinder-wave-1-a'],
          round: 1,
        },
        {
          sequence: 3,
          type: 'reinforcement_wave_deployed',
          objectId: 'world-object:vane-warren:cinder-rite:war_drum',
          waveId: 'cinder-second-beat',
          calledBy: 'combatant:vane-warren:cinder-rite:cinder-guard-b',
          combatants: ['combatant:vane-warren:cinder-rite:cinder-wave-2-a'],
          round: 1,
        },
      ]);
      expect(configured.encounter.nextEventSequence).toBe(4);
      expect(configured.encounter.dmNotes).toEqual([
        'encounter:vane-warren: The Cinder Rite.',
        'Flat stronghold floor only: no elevation, falls, or chasms.',
        'Forced movement can drive creatures into the ember-bed movement hazard.',
        `${configured.fight.id === 'cinder-rite' && configured.alarm.kind === 'complete'
          ? clean === configured ? 'tpk-clean' : 'tpk-recovery'
          : 'unreachable'}: the alarm was pre-sounded and both authored waves plus the doomed reinforcement composition begin on the board.`,
      ]);
      expect(configured.encounter.combatants.map((subject) => String(subject.profile.id)))
        .toEqual(expect.arrayContaining([
          'combatant:vane-warren:cinder-rite:cinder-wave-1-a',
          'combatant:vane-warren:cinder-rite:cinder-wave-2-a',
          'combatant:vane-warren:cinder-rite:doomed-crocodile',
          'combatant:vane-warren:cinder-rite:doomed-crocodile-second',
          'combatant:vane-warren:cinder-rite:doomed-crocodile-third',
          'combatant:vane-warren:cinder-rite:doomed-crocodile-fourth',
          'combatant:vane-warren:cinder-rite:doomed-crocodile-fifth',
          'combatant:vane-warren:cinder-rite:doomed-crocodile-sixth',
        ]));
      expect(configured.encounter.tokens
        .filter((token) => String(token.combatantId).startsWith('combatant:vane-player-'))
        .map((token) => token.position)).toEqual([
          { column: 1, row: 3 },
          { column: 1, row: 4 },
          { column: 1, row: 5 },
          { column: 2, row: 4 },
          { column: 2, row: 5 },
        ]);
    }
    expect(VANE_WARREN_TPK_SCENARIOS['tpk-clean'].startingReinforcements)
      .toEqual(VANE_WARREN_TPK_SCENARIOS['tpk-recovery'].startingReinforcements);
    expect(VANE_WARREN_TPK_SCENARIOS['tpk-clean'].recovery).toBe('none');
    expect(VANE_WARREN_TPK_SCENARIOS['tpk-recovery'].recovery).toBe('revivify_and_dm_override');
    expect(VANE_WARREN_TPK_SCENARIOS['tpk-clean'].enemyPositions).toEqual({
      ashmaw: { column: 4, row: 3 },
      'cinder-guard-b': { column: 4, row: 4 },
      'cinder-wave-1-a': { column: 4, row: 5 },
      'cinder-wave-2-a': { column: 4, row: 6 },
      'doomed-crocodile': { column: 3, row: 4 },
      'doomed-crocodile-second': { column: 3, row: 5 },
      'doomed-crocodile-third': { column: 3, row: 1 },
      'doomed-crocodile-fourth': { column: 3, row: 2 },
      'doomed-crocodile-fifth': { column: 3, row: 6 },
      'doomed-crocodile-sixth': { column: 3, row: 7 },
    });
  });

  it('pins the complete authored object, environment, and seeded-area contracts', () => {
    const loaded = fight('cinder-rite');
    const byClass = new Map(loaded.objects.map((entry) => [entry.class, entry.object]));
    expect(byClass.get('war_drum')).toMatchObject({
      name: 'Vane Warren War Drum', kind: 'generic', position: { column: 11, row: 5 },
      footprint: [{ column: 11, row: 5 }],
      durability: { kind: 'hit_points', hitPoints: 12, maximumHitPoints: 12 },
      armorClass: 12,
      damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'three_quarters' },
      createdRevision: 0,
    });
    expect(byClass.get('brazier')).toMatchObject({
      name: 'Coal-Red Brazier', kind: 'light-source', position: { column: 7, row: 4 },
      footprint: [{ column: 7, row: 4 }], durability: { kind: 'indestructible' },
      armorClass: 12, damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'half' }, createdRevision: 0,
    });
    expect(byClass.get('oil_cask')).toMatchObject({
      name: 'Pitch-Oil Cask', kind: 'hazard', position: { column: 7, row: 7 },
      footprint: [{ column: 7, row: 7 }],
      durability: { kind: 'hit_points', hitPoints: 8, maximumHitPoints: 8 },
      armorClass: 10, damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'half' }, createdRevision: 0,
    });
    expect('classActions' in (byClass.get('brazier') ?? {})).toBe(false);
    expect('classActions' in (byClass.get('oil_cask') ?? {})).toBe(false);
    expect(loaded.encounter.environment).toEqual({
      lightRegions: [{
        id: 'cinder-rite:brazier-light', level: 'dim',
        cells: [{ column: 7, row: 3 }, { column: 7, row: 4 }, { column: 8, row: 3 }, { column: 8, row: 4 }],
      }],
      difficultTerrainRegions: [{
        id: 'cinder-rite:rubble',
        cells: [{ column: 5, row: 2 }, { column: 5, row: 3 }, { column: 5, row: 4 }],
      }],
      obscurementRegions: [{
        id: 'cinder-rite:smoke', obscurement: 'light',
        cells: [{ column: 6, row: 6 }, { column: 6, row: 7 }, { column: 7, row: 6 }, { column: 7, row: 7 }],
      }],
      movementRegions: [{
        id: 'cinder-rite:ember-bed',
        source: 'combatant:vane-warren:cinder-rite:ashmaw',
        entry: 'allowed',
        cells: [{ column: 7, row: 5 }, { column: 7, row: 6 }],
        damage: {
          damageType: 'Fire', dice: { count: 1, sides: 4, modifier: 0 },
          unitFeet: 5, partialUnit: 'completed_units_only',
        },
      }],
    });
    const areas = loaded.encounter.persistentAreas;
    expect(areas.map((area) => ({
      id: area.id,
      sequence: area.sequence,
      origin: area.origin,
      shape: area.shape,
      duration: area.duration,
      material: area.material?.id,
      hooks: area.hooks,
      burningCells: area.burningCells,
      burnedAwayCells: area.burnedAwayCells,
      members: area.members,
      consumedTurnKeys: area.consumedTurnKeys,
    }))).toEqual([
      {
        id: 'area:1', sequence: 1, origin: { kind: 'fixed', point: { x: 30, y: 20 } },
        shape: { kind: 'cube', size: 10 }, duration: { kind: 'rounds', remaining: 10 },
        material: 'grease',
        hooks: expect.arrayContaining([
          expect.objectContaining({ hook: 'on_enter', effect: expect.objectContaining({
            payload: expect.objectContaining({ payload: { kind: 'condition', condition: 'Prone' } }),
          }) }),
          expect.objectContaining({ hook: 'on_end_of_turn_inside' }),
        ]),
        burningCells: [], burnedAwayCells: [], members: [], consumedTurnKeys: [],
      },
      {
        id: 'area:2', sequence: 2, origin: { kind: 'fixed', point: { x: 30, y: 35 } },
        shape: { kind: 'cube', size: 20 }, duration: { kind: 'rounds', remaining: 600 },
        material: 'webs',
        hooks: expect.arrayContaining([
          expect.objectContaining({ hook: 'on_enter', effect: expect.objectContaining({
            payload: expect.objectContaining({ payload: { kind: 'condition', condition: 'Restrained' } }),
          }) }),
          expect.objectContaining({ hook: 'on_start_of_turn_inside' }),
        ]),
        burningCells: [], burnedAwayCells: [], members: [], consumedTurnKeys: [],
      },
    ]);
    expect(loaded.terrainFeatures).toEqual([
      { kind: 'world_object', objectClass: 'war_drum', objectId: 'world-object:vane-warren:cinder-rite:war_drum' },
      { kind: 'world_object', objectClass: 'brazier', objectId: 'world-object:vane-warren:cinder-rite:brazier' },
      { kind: 'world_object', objectClass: 'oil_cask', objectId: 'world-object:vane-warren:cinder-rite:oil_cask' },
      { kind: 'flammable_surface', material: 'grease', areaId: 'area:1' },
      { kind: 'flammable_surface', material: 'webs', areaId: 'area:2' },
      { kind: 'difficult_terrain', regionId: 'cinder-rite:rubble' },
      { kind: 'light', regionId: 'cinder-rite:brazier-light' },
      { kind: 'obscurement', regionId: 'cinder-rite:smoke' },
      { kind: 'forced_movement_hazard', regionId: 'cinder-rite:ember-bed' },
    ]);
  });

  it('drum_from_anywhere: exposes the typed alarm action only to adjacent enemies and gives the designated drummer highest algorithm priority', async () => {
    let state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    state = activeTurn(state, drummer);
    const action = vaneWarrenWorldObjectLegalActions(state, drummer).find((candidate) =>
      candidate.type === 'use_world_object' && candidate.actionId === VANE_WARREN_SOUND_DRUM_ACTION_ID);
    if (action?.type !== 'use_world_object') throw new Error('The adjacent drummer has no alarm action.');
    expect(action).toEqual({
      type: 'use_world_object',
      actor: drummer,
      objectId: 'world-object:vane-warren:cinder-rite:war_drum',
      actionId: VANE_WARREN_SOUND_DRUM_ACTION_ID,
    });
    const warDrum = state.encounter.worldObjects.find((object) => object.id === action?.objectId);
    expect(warDrum?.classActions?.[0]?.controllerPriority).toEqual({
      actor: drummer,
      score: VANE_WARREN_DRUMMER_PRIORITY,
    });
    const controller = new WorldObjectAlgorithmController();
    const decision = await controller.choose({
      kind: 'turn',
      requestId: 'turn:alarm-surface',
      encounterRevision: state.encounter.revision,
      actorId: drummer,
      visibleState: projectPlayerView(state.encounter, { seatId: 'seat:drummer', combatantId: drummer }),
      legalActions: {
        actions: [
          { type: 'move', actor: drummer, path: [{ column: 9, row: 4 }], cause: 'voluntary' },
          action,
        ],
      },
    }, new AbortController().signal);
    expect(decision.action).toEqual(action);

    state = {
      ...state,
      encounter: {
        ...state.encounter,
        tokens: state.encounter.tokens.map((token) => token.combatantId === drummer
          ? { ...token, position: { column: 2, row: 2 } }
          : token),
      },
    };
    expect(vaneWarrenWorldObjectLegalActions(state, drummer)).toEqual([]);
  });

  it('refuses the typed war-drum action from exactly two cells away', () => {
    let state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    state = activeTurn(state, drummer);
    const action = vaneWarrenWorldObjectLegalActions(state, drummer)[0];
    if (action?.type !== 'use_world_object') throw new Error('The adjacent drummer has no use-object action.');
    const warDrum = state.encounter.worldObjects.find((object) => object.id === action.objectId);
    if (warDrum === undefined) throw new Error('The war drum is missing.');
    state = {
      ...state,
      encounter: {
        ...state.encounter,
        tokens: state.encounter.tokens.map((token) => token.combatantId === drummer
          ? {
              ...token,
              position: { column: warDrum.position.column + 2, row: warDrum.position.row },
            }
          : token),
      },
    };

    expect(() => reduceVaneWarrenEncounter(state.encounter, action, faceOne)).toThrowError(expect.objectContaining({
      name: 'EncounterRuleError',
      refusalClass: 'validation',
      reason: 'Sound the war drum requires adjacency to Vane Warren War Drum.',
    }));
  });

  it('drum_double_trigger: taking the adjacent class action sounds the alarm once and cannot queue it again', () => {
    let state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    state = activeTurn(state, drummer);
    const action = vaneWarrenWorldObjectLegalActions(state, drummer)[0];
    if (action?.type !== 'use_world_object') throw new Error('The drummer has no use-object action.');
    state = reduceVaneWarrenWorldObjectAction(state, action);
    expect(state.alarm).toMatchObject({ kind: 'sounded', usedBy: drummer, usedAtRound: 1 });
    expect(state.transitions.filter((transition) => transition.kind === 'alarm_used')).toHaveLength(1);
    expect(state.transitions[0]).toEqual({
      kind: 'alarm_used',
      round: 1,
      ids: ['world-object:vane-warren:cinder-rite:war_drum'],
    });
    expect(state.encounter.eventLog.filter((event) => event.type === 'world_object_used')).toHaveLength(1);
    const nextTurn = activeTurn(state, drummer);
    expect(() => reduceVaneWarrenEncounter(nextTurn.encounter, action, faceOne)).toThrow('already been used');
  });

  it('the live command reducer deploys each alarm wave once when its arrival round is reached', () => {
    let bundled = fight('cinder-rite');
    const drummer = combatantIdFor(bundled, 'cinder-guard-b');
    bundled = activeTurn(bundled, drummer);
    const action = vaneWarrenWorldObjectLegalActions(bundled, drummer)[0];
    if (action?.type !== 'use_world_object') throw new Error('The drummer has no live use-object action.');
    let state = reduceVaneWarrenEncounter(bundled.encounter, action, faceOne).state;
    state = { ...state, round: 2 };
    const firstWave = reduceVaneWarrenEncounter(state, {
      type: 'set_hidden_roll_category', category: 'death_saves', hidden: true,
    }, faceOne);
    state = firstWave.state;
    expect(state.revision).toBe(bundled.encounter.revision + 2);
    expect(firstWave.events.at(-1)).toEqual({
      sequence: state.nextEventSequence - 1,
      type: 'reinforcement_wave_deployed',
      objectId: 'world-object:vane-warren:cinder-rite:war_drum',
      waveId: 'cinder-first-beat',
      calledBy: drummer,
      combatants: ['combatant:vane-warren:cinder-rite:cinder-wave-1-a'],
      round: 2,
    });
    expect(state.eventLog.at(-1)).toEqual(firstWave.events.at(-1));
    expect(state.eventLog.filter((event) => event.type === 'reinforcement_wave_deployed')).toHaveLength(1);
    expect(state.combatants.filter((subject) => String(subject.profile.id).includes(':cinder-wave-1-'))).toHaveLength(1);
    state = reduceVaneWarrenEncounter(state, {
      type: 'set_hidden_roll_category', category: 'death_saves', hidden: false,
    }, faceOne).state;
    expect(state.eventLog.filter((event) => event.type === 'reinforcement_wave_deployed')).toHaveLength(1);
    state = { ...state, round: 3 };
    state = reduceVaneWarrenEncounter(state, {
      type: 'set_hidden_roll_category', category: 'death_saves', hidden: true,
    }, faceOne).state;
    expect(state.eventLog.filter((event) => event.type === 'reinforcement_wave_deployed')).toHaveLength(2);
    expect(state.combatants.filter((subject) => String(subject.profile.id).includes(':cinder-wave-'))).toHaveLength(2);
  });

  it('ignores world-object events unless both the drum id and action id match', () => {
    const initial = fight('cinder-rite');
    const drummer = combatantIdFor(initial, 'cinder-guard-b');
    for (const [objectId, actionId] of [
      [worldObjectId('world-object:vane-warren:cinder-rite:brazier'), VANE_WARREN_SOUND_DRUM_ACTION_ID],
      [worldObjectId('world-object:vane-warren:cinder-rite:war_drum'), 'wrong-action'],
    ] as const) {
      const state: EncounterState = {
        ...initial.encounter,
        round: 3,
        eventLog: [{
          sequence: 1,
          type: 'world_object_used',
          actor: drummer,
          objectId,
          actionId,
          round: 1,
          authority: 'dm_override',
        }],
        nextEventSequence: 2,
      };
      const reduced = reduceVaneWarrenEncounter(state, {
        type: 'set_hidden_roll_category', category: 'death_saves', hidden: true,
      }, faceOne);
      expect(reduced.state.combatants.some((subject) =>
        String(subject.profile.id).includes(':cinder-wave-'))).toBe(false);
      expect(reduced.events.some((event) => event.type === 'reinforcement_wave_deployed')).toBe(false);
    }
  });

  it('the live reducer deploys a conditional joiner at exactly half HP with one exact event', () => {
    const initial = fight('last-muster');
    const leader = combatantIdFor(initial, initial.fight.leaderRosterId);
    const bloodied: EncounterState = {
      ...initial.encounter,
      combatants: initial.encounter.combatants.map((subject) => subject.profile.id === leader
        ? { ...subject, hitPoints: subject.profile.rules.hitPointMaximum / 2 }
        : subject),
    };
    const reduced = reduceVaneWarrenEncounter(bloodied, {
      type: 'set_hidden_roll_category', category: 'death_saves', hidden: true,
    }, faceOne);
    expect(reduced.state.revision).toBe(bloodied.revision + 1);
    const event = reduced.events.at(-1);
    expect(event).toEqual({
      sequence: reduced.state.nextEventSequence - 1,
      type: 'conditional_joiners_deployed',
      leader,
      combatants: ['combatant:vane-warren:last-muster:muster-joiner-a'],
      condition: 'leader_bloodied',
      round: 0,
    });
    expect(reduced.state.eventLog.at(-1)).toEqual(event);
    expect(reduced.state.combatants.filter((subject) =>
      String(subject.profile.id).endsWith(':muster-joiner-a'))).toHaveLength(1);
  });

  it('dm_trigger_unlogged: exposes the object fallback and records its ruling card while sounding the same alarm once', () => {
    const initial = fight('cinder-rite');
    const command = vaneWarrenDmWarDrumControl(initial);
    if (command === null) throw new Error('The DM war-drum control is missing.');
    const state = reduceVaneWarrenWorldObjectAction(initial, command);
    expect(state.alarm).toMatchObject({ kind: 'sounded', usedBy: command.actor, usedAtRound: 1 });
    expect(state.encounter.eventLog.filter((event) => event.type === 'world_object_used')).toEqual([
      expect.objectContaining({ authority: 'dm_override', actionId: VANE_WARREN_SOUND_DRUM_ACTION_ID }),
    ]);
    expect(state.encounter.eventLog.filter((event) => event.type === 'adjudicated')).toEqual([
      expect.objectContaining({
        target: command.actor,
        subject: `dm-override:world-object:${VANE_WARREN_SOUND_DRUM_ACTION_ID}`,
        consequence: {
          kind: 'world_object_interaction',
          objectId: command.objectId,
          actionId: VANE_WARREN_SOUND_DRUM_ACTION_ID,
        },
      }),
    ]);
    expect(vaneWarrenDmWarDrumControl(state)).toBeNull();
  });

  it('loads each separate fight with pre-placed tokens, fog, light, surfaces, and at least six landed terrain or hazard elements', () => {
    expect(players().map((player) => player.id)).toEqual([
      'combatant:vane-player-a',
      'combatant:vane-player-b',
      'combatant:vane-player-c',
      'combatant:vane-player-d',
      'combatant:vane-player-e',
    ]);
    for (const manifest of VANE_WARREN_FIGHTS) {
      const loaded = fight(manifest.id);
      expect(loaded.encounter.combatants).toHaveLength(5 + manifest.standing.length);
      expect(loaded.encounter.tokens).toHaveLength(loaded.encounter.combatants.length);
      expect(loaded.encounter.foggedCells.length).toBeGreaterThan(0);
      expect(loaded.encounter.environment.lightRegions.length).toBeGreaterThan(0);
      expect(loaded.encounter.environment.obscurementRegions.length).toBeGreaterThan(0);
      expect(loaded.encounter.environment.difficultTerrainRegions.length).toBeGreaterThan(0);
      expect(loaded.encounter.environment.movementRegions?.length).toBeGreaterThan(0);
      expect(loaded.encounter.persistentAreas.map((area) => area.material?.id)).toEqual(['grease', 'webs']);
      expect(loaded.encounter.config.optionalRules).toEqual(['flammable_grease']);
      expect(loaded.terrainFeatures.length).toBeGreaterThanOrEqual(6);
      expect(loaded.encounter.dmNotes.join(' ')).toContain('no elevation, falls, or chasms');
    }
    const allDeployedIds = VANE_WARREN_FIGHTS.map((manifest) =>
      fight(manifest.id).deployedRosterIds);
    expect(new Set(allDeployedIds.flat()).size).toBe(allDeployedIds.flat().length);
  });

  it('all three Vane Warren fights expose anchored brazier and cask cover, with Cinder Rite adding its war drum', () => {
    for (const manifest of VANE_WARREN_FIGHTS) {
      const loaded = fight(manifest.id);
      const cover = loaded.encounter.worldObjects.map((object) => ({
        name: object.name,
        position: object.position,
        tier: object.blocking.cover,
        movement: object.blocking.movement,
      }));
      expect(cover).toContainEqual({
        name: 'Coal-Red Brazier', position: { column: 7, row: 4 }, tier: 'half', movement: false,
      });
      expect(cover).toContainEqual({
        name: 'Pitch-Oil Cask', position: { column: 7, row: 7 }, tier: 'half', movement: false,
      });
      expect(cover).toHaveLength(manifest.id === 'cinder-rite' ? 3 : 2);
      if (manifest.id === 'cinder-rite') {
        expect(cover).toContainEqual({
          name: 'Vane Warren War Drum', position: { column: 11, row: 5 },
          tier: 'three_quarters', movement: false,
        });
      }
      const leader = combatantIdFor(loaded, manifest.leaderRosterId);
      const leaderPosition = loaded.encounter.tokens.find((token) => token.combatantId === leader)?.position;
      if (leaderPosition === undefined) throw new Error(`${manifest.name} has no leader token.`);
      expect(coverTierBetweenObjects(
        loaded.encounter.worldObjects,
        { column: 6, row: 4 },
        leaderPosition,
      )).toBe('half');
      expect(coverTierBetweenObjects(
        loaded.encounter.worldObjects,
        { column: 6, row: 8 },
        leaderPosition,
      )).toBe('half');
    }
  });

  it('ratio_drift: detune_ratio_stale: derives every detuned ratio from its live roster instead of a copied expectation', () => {
    expect(VANE_WARREN_FIGHTS.map((manifest) => ({
      id: manifest.id,
      ...vaneWarrenActionEconomy(manifest),
      recorded: manifest.targetActionEconomyRatio,
    }))).toEqual([
      { id: 'cinder-rite', enemyOpportunities: 4, partyOpportunities: 5, ratio: 0.8, recorded: 0.8 },
      { id: 'iron-voice', enemyOpportunities: 2, partyOpportunities: 5, ratio: 0.4, recorded: 0.4 },
      { id: 'last-muster', enemyOpportunities: 2, partyOpportunities: 5, ratio: 0.4, recorded: 0.4 },
    ]);
  });

  it('alarm_double_wave: deploys each fight-local alarm wave once on its listed subsequent round', () => {
    let state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    state = useVaneWarrenWarDrum(state, drummer);
    expect(state.alarm).toMatchObject({ kind: 'sounded', usedAtRound: 1 });
    expect(state.deployedRosterIds).toHaveLength(2);

    state = advanceVaneWarrenAlarm(state, 1);
    expect(state.deployedRosterIds).toHaveLength(2);
    state = advanceVaneWarrenAlarm(state, 2);
    expect(state.deployedRosterIds).toHaveLength(3);
    state = advanceVaneWarrenAlarm(state, 2);
    expect(state.deployedRosterIds).toHaveLength(3);
    state = advanceVaneWarrenAlarm(state, 3);
    expect(state.deployedRosterIds).toHaveLength(4);
    state = advanceVaneWarrenAlarm(state, 20);
    expect(state.deployedRosterIds).toHaveLength(4);
    expect(state.alarm).toEqual({
      kind: 'complete',
      usedBy: drummer,
      usedAtRound: 1,
      deployedWaveIds: ['cinder-first-beat', 'cinder-second-beat'],
    });
    expect(state.transitions.filter((transition) => transition.kind === 'alarm_wave_deployed')).toHaveLength(2);
    expect(state.encounter.combatants.filter((subject) =>
      String(subject.profile.id).includes(':cinder-wave-')).map((subject) => subject.profile.id)).toHaveLength(2);
    expect(state.encounter.initiative).toEqual([]);
  });

  it('alarm_wave_timing: keeps every Cinder Rite reinforcement off-board until its exact arrival round', () => {
    let state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    state = {
      ...state,
      encounter: reduceEncounter(state.encounter, { type: 'roll_initiative' }, faceOne).state,
    };
    state = useVaneWarrenWarDrum(state, drummer);

    const expectedWaves = [
      { id: 'cinder-first-beat', delayRounds: 1 },
      { id: 'cinder-second-beat', delayRounds: 2 },
    ] as const;
    const isOnBoard = (rosterId: string): boolean => state.encounter.tokens.some((token) =>
      String(token.combatantId).endsWith(`:${rosterId}`));
    const advanceOneRound = (): void => {
      const startingRound = state.encounter.round;
      while (state.encounter.round === startingRound) {
        const active = state.encounter.activeCombatant;
        if (active === null) throw new Error('The Cinder Rite lost its active turn.');
        state = {
          ...state,
          encounter: reduceEncounter(state.encounter, { type: 'end_turn', actor: active }, faceOne).state,
        };
      }
      state = advanceVaneWarrenAlarm(state, state.encounter.round);
    };

    for (const expected of expectedWaves) {
      const wave = state.fight.alarmWaves.find((candidate) => candidate.id === expected.id);
      if (wave === undefined) throw new Error(`Missing alarm wave ${expected.id}.`);
      expect(wave.delayRounds).toBe(expected.delayRounds);
      for (const member of wave.adds) {
        expect(member.activation).toEqual({
          kind: 'alarm_wave',
          waveId: expected.id,
          delayRounds: expected.delayRounds,
        });
      }

      const roundBeforeArrival = 1 + expected.delayRounds - 1;
      while (state.encounter.round < roundBeforeArrival) advanceOneRound();
      expect(wave.adds.every((member) => !isOnBoard(member.id))).toBe(true);

      advanceOneRound();
      expect(state.encounter.round).toBe(1 + expected.delayRounds);
      expect(wave.adds.every((member) => isOnBoard(member.id))).toBe(true);
    }
  });

  it('alarm reached-but-not-used does nothing', () => {
    const state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    const token = state.encounter.tokens.find((candidate) => candidate.combatantId === drummer);
    const warDrum = state.objects.find((entry) => entry.class === 'war_drum');
    if (token === undefined || warDrum === undefined) throw new Error('Alarm boundary fixture is incomplete.');
    expect(Math.max(
      Math.abs(token.position.column - warDrum.object.position.column),
      Math.abs(token.position.row - warDrum.object.position.row),
    )).toBe(1);
    expect(advanceVaneWarrenAlarm(state, 20)).toBe(state);
    expect(state.alarm).toEqual({ kind: 'ready' });
    expect(state.transitions).toEqual([]);
  });

  it('covers the fight-construction refusal contract and exact scenario boundary', () => {
    expect(() => createVaneWarrenFight('cinder-rite', players().slice(0, 4)))
      .toThrow('exactly five player characters');
    const monster = fight('iron-voice').encounter.combatants.find(
      (subject) => subject.profile.kind === 'monster',
    )?.profile;
    if (monster === undefined) throw new Error('Construction refusal fixture has no monster.');
    expect(() => createVaneWarrenFight('cinder-rite', [...players().slice(0, 4), monster]))
      .toThrow('exactly five player characters');
    expect(() => createVaneWarrenFight('iron-voice', players(), 'tpk-clean'))
      .toThrow('tpk-clean is configured only for The Cinder Rite.');
    expect(() => createVaneWarrenFight('missing' as VaneWarrenFightId, players()))
      .toThrow('Unknown Vane Warren fight missing.');
  });

  it('reports every direct war-drum refusal with its exact contract reason', () => {
    const initial = fight('cinder-rite');
    const drummer = combatantIdFor(initial, 'cinder-guard-b');
    const player = players()[0].id;
    const used = useVaneWarrenWarDrum(initial, drummer);
    expect(() => useVaneWarrenWarDrum(used, drummer)).toThrow(
      'The Vane Warren war drum has already been used.',
    );
    expect(() => useVaneWarrenWarDrum(initial, player)).toThrow(
      'Only an enemy in this fight can sound the Vane Warren war drum.',
    );
    expect(() => useVaneWarrenWarDrum(initial, 'combatant:missing-vane-actor' as CombatantId)).toThrow(
      'Only an enemy in this fight can sound the Vane Warren war drum.',
    );
    const withoutToken: VaneWarrenEncounterState = {
      ...initial,
      encounter: {
        ...initial.encounter,
        tokens: initial.encounter.tokens.filter((token) => token.combatantId !== drummer),
      },
    };
    expect(() => useVaneWarrenWarDrum(withoutToken, drummer)).toThrow(
      `Combatant ${drummer} has no Vane Warren token.`,
    );
    expect(() => useVaneWarrenWarDrum(fight('iron-voice'), combatantIdFor(fight('iron-voice'), 'marshal-kett')))
      .toThrow('The Iron Voice has no war drum.');
    const distant: VaneWarrenEncounterState = {
      ...initial,
      encounter: {
        ...initial.encounter,
        tokens: initial.encounter.tokens.map((token) => token.combatantId === drummer
          ? { ...token, position: { column: 9, row: 5 } }
          : token),
      },
    };
    expect(() => useVaneWarrenWarDrum(distant, drummer)).toThrow(
      'The enemy must reach the war drum before using it.',
    );
  });

  it('rejects invalid alarm rounds and a sounded wave absent from the fight manifest', () => {
    const initial = fight('cinder-rite');
    for (const round of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => advanceVaneWarrenAlarm(initial, round)).toThrow(
        'Alarm advancement requires a positive round.',
      );
    }
    const drummer = combatantIdFor(initial, 'cinder-guard-b');
    const sounded = useVaneWarrenWarDrum(initial, drummer);
    if (sounded.alarm.kind !== 'sounded') throw new Error('Expected a sounded alarm fixture.');
    const corrupt: VaneWarrenEncounterState = {
      ...sounded,
      alarm: {
        ...sounded.alarm,
        waves: [{ id: 'missing-wave', deployAtRound: 1, status: 'pending' }],
      },
    };
    expect(() => advanceVaneWarrenAlarm(corrupt, 1)).toThrow(
      'Alarm wave missing-wave is not listed for The Cinder Rite.',
    );
  });

  it('deploys conditional joiners exactly at half HP and only once', () => {
    const initial = fight('last-muster');
    expect(deployVaneWarrenConditionalJoiners(initial)).toBe(initial);
    const leader = combatantIdFor(initial, initial.fight.leaderRosterId);
    const bloodied: VaneWarrenEncounterState = {
      ...initial,
      encounter: {
        ...initial.encounter,
        round: 0,
        combatants: initial.encounter.combatants.map((subject) => subject.profile.id === leader
          ? { ...subject, hitPoints: subject.profile.rules.hitPointMaximum / 2 }
          : subject),
      },
    };

    const deployed = deployVaneWarrenConditionalJoiners(bloodied);
    expect(deployed.deployedRosterIds).toContain('muster-joiner-a');
    expect(deployed.encounter.combatants).toContainEqual(expect.objectContaining({
      profile: expect.objectContaining({ id: 'combatant:vane-warren:last-muster:muster-joiner-a' }),
    }));
    expect(deployed.transitions.at(-1)).toEqual({
      kind: 'conditional_joiners_deployed',
      round: 1,
      ids: ['muster-joiner-a'],
    });
    expect(deployVaneWarrenConditionalJoiners(deployed)).toBe(deployed);
  });

  it('deploys into the first open searched cell with exact appended initiative and revision', () => {
    let initial = fight('cinder-rite');
    initial = {
      ...initial,
      encounter: reduceEncounter(initial.encounter, { type: 'roll_initiative' }, faceOne).state,
    };
    const drummer = combatantIdFor(initial, 'cinder-guard-b');
    let sounded = useVaneWarrenWarDrum(initial, drummer);
    sounded = {
      ...sounded,
      encounter: {
        ...sounded.encounter,
        blockedCells: [...sounded.encounter.blockedCells, { column: 12, row: 1 }],
      },
    };
    const beforeRevision = sounded.encounter.revision;
    const beforeSlots = sounded.encounter.initiative.map((entry) => entry.slot);
    const beforeTotals = sounded.encounter.initiative.map((entry) => entry.total);
    const deployed = advanceVaneWarrenAlarm(sounded, 2);
    const reinforcement = deployed.encounter.combatants.find((subject) =>
      String(subject.profile.id).endsWith(':cinder-wave-1-a'));
    if (reinforcement === undefined) throw new Error('Searched reinforcement was not deployed.');
    const token = deployed.encounter.tokens.find((candidate) => candidate.combatantId === reinforcement.profile.id);
    const initiative = deployed.encounter.initiative.find((entry) => entry.combatant === reinforcement.profile.id);

    expect(token?.position).toEqual({ column: 11, row: 0 });
    expect(deployed.encounter.revision).toBe(beforeRevision + 1);
    expect(initiative).toEqual({
      combatant: reinforcement.profile.id,
      total: Math.min(0, ...beforeTotals) - 1,
      roll: 1,
      bonus: reinforcement.profile.rules.initiativeBonus,
      slot: Math.max(-1, ...beforeSlots) + 1,
    });
  });

  it('reports a full reinforcement grid and a manifest without its named leader', () => {
    const initial = fight('cinder-rite');
    const drummer = combatantIdFor(initial, 'cinder-guard-b');
    const sounded = useVaneWarrenWarDrum(initial, drummer);
    const full: VaneWarrenEncounterState = {
      ...sounded,
      encounter: {
        ...sounded.encounter,
        blockedCells: Array.from({ length: sounded.encounter.bounds.rows }, (_row, row) =>
          Array.from({ length: sounded.encounter.bounds.columns }, (_column, column) => ({ column, row }))).flat(),
      },
    };
    expect(() => advanceVaneWarrenAlarm(full, 2)).toThrow(
      'The Vane Warren has no open reinforcement cell.',
    );

    const oneDistantCell: VaneWarrenEncounterState = {
      ...sounded,
      encounter: {
        ...sounded.encounter,
        blockedCells: Array.from({ length: sounded.encounter.bounds.rows }, (_row, row) =>
          Array.from({ length: sounded.encounter.bounds.columns }, (_column, column) => ({ column, row }))).flat()
          .filter((cell) => cell.column !== 0 || cell.row !== 9),
      },
    };
    const distant = advanceVaneWarrenAlarm(oneDistantCell, 2);
    expect(distant.encounter.tokens.find((token) =>
      String(token.combatantId).endsWith(':cinder-wave-1-a'))?.position).toEqual({ column: 0, row: 9 });

    const last = fight('last-muster');
    const missingLeader: VaneWarrenEncounterState = {
      ...last,
      fight: { ...last.fight, leaderRosterId: 'missing-leader' },
    };
    expect(() => deployVaneWarrenConditionalJoiners(missingLeader)).toThrow(
      'The Last Muster has no listed leader.',
    );
  });

  it('breaks the oil cask once, removes its object, and refuses a surface without an enemy owner', () => {
    const initial = fight('cinder-rite');
    const cask = initial.objects.find((entry) => entry.class === 'oil_cask');
    if (cask === undefined) throw new Error('Oil-cask fixture is missing.');
    const broken = breakVaneWarrenOilCask(initial);
    const grease = broken.encounter.persistentAreas.at(-1);
    expect(broken.encounter.revision).toBe(initial.encounter.revision + 1);
    expect(broken.encounter.worldObjects.some((object) => object.id === cask.object.id)).toBe(false);
    expect(broken.encounter.worldObjects.map((object) => object.id)).toEqual([
      'world-object:vane-warren:cinder-rite:war_drum',
      'world-object:vane-warren:cinder-rite:brazier',
    ]);
    expect(grease).toEqual(expect.objectContaining({
      id: `area:${String(initial.encounter.nextPersistentAreaSequence)}`,
      material: expect.objectContaining({ id: 'grease' }),
    }));
    expect(broken.encounter.nextPersistentAreaSequence)
      .toBe(initial.encounter.nextPersistentAreaSequence + 1);
    expect(broken.transitions.at(-1)).toEqual({
      kind: 'oil_cask_broken',
      round: 1,
      ids: [String(cask.object.id), String(grease?.id)],
    });
    expect(broken.terrainFeatures.at(-1)).toEqual({
      kind: 'flammable_surface', material: 'grease', areaId: String(grease?.id),
    });
    expect(breakVaneWarrenOilCask(broken)).toBe(broken);

    const ownerless: VaneWarrenEncounterState = {
      ...initial,
      encounter: {
        ...initial.encounter,
        combatants: initial.encounter.combatants.filter(
          (subject) => subject.profile.kind === 'player_character',
        ),
      },
    };
    expect(() => breakVaneWarrenOilCask(ownerless)).toThrow(
      'The oil-cask surface requires a fight owner.',
    );
  });

  it('legendary_pool_wrong: offers only executable landed actions and one Legendary Resistance', () => {
    const bundled = fight('iron-voice');
    const warlord = bundled.encounter.combatants.find((subject) =>
      subject.profile.kind === 'monster' &&
      subject.profile.statblockId === 'statblock:vane-warren/marshal-kett');
    if (warlord === undefined) throw new Error('The Iron Voice has no warlord.');
    expect(warlord.legendary).toEqual({
      actionUsesMaximum: 1,
      actionUsesRemaining: 1,
      resistanceUsesMaximum: 1,
      resistanceUsesRemaining: 1,
    });
    let state = reduceEncounter(bundled.encounter, { type: 'roll_initiative' }, faceOne).state;
    const active = state.activeCombatant;
    if (active === null) throw new Error('The Iron Voice did not start initiative.');
    expect(state.combatants.find((subject) => subject.profile.id === active)?.profile.kind).toBe('player_character');
    const resistance = state.pendingDecisions.find((decision) => decision.kind === 'legendary_resistance');
    if (resistance !== undefined) {
      state = reduceEncounter(state, {
        type: 'resolve_pending_decision', decisionId: resistance.id, optionId: 'suffer',
      }, faceOne).state;
    }
    state = reduceEncounter(state, { type: 'end_turn', actor: active }, faceOne).state;
    const window = state.pendingDecisions.find((decision) =>
      decision.kind === 'legendary_action_window' && decision.combatant === warlord.profile.id);
    expect(window?.options.map((option) => option.id)).toEqual([
      'legendary_action:shielding-order',
      'pass',
    ]);
  });

  it('ignition_skipped: brazier adjacency converts Grease to burning and its next start deals cited 2d4 Fire damage', () => {
    let bundled = fight('cinder-rite');
    const grease = bundled.encounter.persistentAreas.find((area) => area.material?.id === 'grease');
    const web = bundled.encounter.persistentAreas.find((area) => area.material?.id === 'webs');
    const brazier = bundled.objects.find((entry) => entry.class === 'brazier');
    if (grease === undefined || web === undefined || brazier === undefined) throw new Error('Ignition fixture is incomplete.');
    const candidateCells = [
      { column: brazier.object.position.column - 1, row: brazier.object.position.row },
      { column: brazier.object.position.column + 1, row: brazier.object.position.row },
      { column: brazier.object.position.column, row: brazier.object.position.row - 1 },
      { column: brazier.object.position.column, row: brazier.object.position.row + 1 },
    ];
    const ignitionCell = candidateCells.find((cell) =>
      persistentAreaContains(grease, cell, null, bundled.encounter) &&
      !persistentAreaContains(web, cell, null, bundled.encounter));
    if (ignitionCell === undefined) throw new Error('No Grease cell is adjacent to the brazier.');
    const target = players()[0];
    bundled = {
      ...bundled,
      encounter: {
        ...bundled.encounter,
        tokens: bundled.encounter.tokens.map((token) => token.combatantId === target.id
          ? { ...token, position: ignitionCell }
          : token),
      },
    };
    bundled = {
      ...bundled,
      encounter: reduceEncounter(bundled.encounter, { type: 'roll_initiative' }, faceOne).state,
    };
    expect(bundled.encounter.activeCombatant).toBe(target.id);
    const before = hitPoints(bundled.encounter, target.id);
    bundled = igniteVaneWarrenSurfaceFromBrazier(bundled, ignitionCell);
    expect(bundled.encounter.persistentAreas.find((area) => area.id === grease.id)?.burningCells).toEqual([
      expect.objectContaining({ cell: ignitionCell }),
    ]);

    let state = bundled.encounter;
    const initiativeCount = state.initiative.length;
    for (let turn = 0; turn < initiativeCount; turn += 1) {
      const active = state.activeCombatant;
      if (active === null) throw new Error('Ignition encounter lost its active turn.');
      state = reduceEncounter(state, { type: 'end_turn', actor: active }, faceOne).state;
    }
    expect(state.activeCombatant).toBe(target.id);
    expect(hitPoints(state, target.id)).toBe(before - 2);
  });

  it('enforces brazier ignition preconditions and does not duplicate a burning cell', () => {
    const initial = fight('cinder-rite');
    const brazier = initial.objects.find((entry) => entry.class === 'brazier');
    if (brazier === undefined) throw new Error('Ignition precondition fixture has no brazier.');
    const adjacentCells = [
      { column: brazier.object.position.column - 1, row: brazier.object.position.row },
      { column: brazier.object.position.column + 1, row: brazier.object.position.row },
      { column: brazier.object.position.column, row: brazier.object.position.row - 1 },
      { column: brazier.object.position.column, row: brazier.object.position.row + 1 },
    ];
    const flammable = adjacentCells.find((cell) => initial.encounter.persistentAreas.some((area) =>
      persistentAreaContains(area, cell, null, initial.encounter)));
    const bare = adjacentCells[0];
    if (flammable === undefined || bare === undefined) throw new Error('Ignition precondition cells are incomplete.');
    expect(() => igniteVaneWarrenSurfaceFromBrazier(initial, flammable)).toThrow(
      'Roll initiative before resolving brazier ignition.',
    );
    const started: VaneWarrenEncounterState = {
      ...initial,
      encounter: reduceEncounter(initial.encounter, { type: 'roll_initiative' }, faceOne).state,
    };
    expect(() => igniteVaneWarrenSurfaceFromBrazier(started, { column: 0, row: 0 })).toThrow(
      'A Vane Warren brazier can ignite only an adjacent cell.',
    );
    const withoutAreas: VaneWarrenEncounterState = {
      ...started,
      encounter: { ...started.encounter, persistentAreas: [] },
    };
    expect(() => igniteVaneWarrenSurfaceFromBrazier(withoutAreas, bare)).toThrow(
      'The adjacent cell has no enabled flammable surface.',
    );
    const once = igniteVaneWarrenSurfaceFromBrazier(started, flammable);
    const twice = igniteVaneWarrenSurfaceFromBrazier(once, flammable);
    expect(twice.encounter.persistentAreas.map((area) => area.burningCells))
      .toEqual(once.encounter.persistentAreas.map((area) => area.burningCells));

    const disabledGrease: VaneWarrenEncounterState = {
      ...started,
      encounter: {
        ...started.encounter,
        config: { ...started.encounter.config, optionalRules: [] },
        persistentAreas: started.encounter.persistentAreas.filter((area) => area.material?.id === 'grease'),
      },
    };
    expect(() => igniteVaneWarrenSurfaceFromBrazier(disabledGrease, flammable)).toThrow(
      'The adjacent cell has no enabled flammable surface.',
    );
  });

  it('ignites only matching areas, preserves same-column cells, and records the exact transition', () => {
    const initial = fight('cinder-rite');
    const brazier = initial.objects.find((entry) => entry.class === 'brazier');
    const grease = initial.encounter.persistentAreas.find((area) => area.material?.id === 'grease');
    const web = initial.encounter.persistentAreas.find((area) => area.material?.id === 'webs');
    if (brazier === undefined || grease === undefined || web === undefined) {
      throw new Error('Exact ignition fixture is incomplete.');
    }
    const cell = { column: brazier.object.position.column - 1, row: brazier.object.position.row };
    const existingCell = { column: cell.column, row: cell.row + 1 };
    let started: VaneWarrenEncounterState = {
      ...initial,
      encounter: reduceEncounter(initial.encounter, { type: 'roll_initiative' }, faceOne).state,
    };
    const initialRevision = started.encounter.revision;
    const prior = {
      cell: existingCell,
      burnsAwayAt: { round: started.encounter.round + 9, initiativeIndex: 0 },
    };
    started = {
      ...started,
      encounter: {
        ...started.encounter,
        persistentAreas: [
          ...started.encounter.persistentAreas.map((area) => area.id === grease.id
            ? { ...area, burningCells: [prior] }
            : area),
          { ...grease, id: 'area:99' as typeof grease.id, material: null },
        ],
      },
    };
    const ignited = igniteVaneWarrenSurfaceFromBrazier(started, cell);
    const ignitedGrease = ignited.encounter.persistentAreas.find((area) => area.id === grease.id);
    const ignitedWeb = ignited.encounter.persistentAreas.find((area) => area.id === web.id);
    const inert = ignited.encounter.persistentAreas.find((area) => area.id === 'area:99');

    expect(ignited.encounter.revision).toBe(initialRevision + 1);
    expect(ignitedGrease?.burningCells).toEqual([
      prior,
      {
        cell,
        burnsAwayAt: {
          round: started.encounter.round + 1,
          initiativeIndex: started.encounter.activeInitiativeIndex,
        },
      },
    ]);
    expect(ignitedWeb?.burningCells).toEqual([{
      cell,
      burnsAwayAt: {
        round: started.encounter.round + 1,
        initiativeIndex: started.encounter.activeInitiativeIndex,
      },
    }]);
    expect(inert?.burningCells).toEqual([]);
    expect(ignited.transitions.at(-1)).toEqual({
      kind: 'surface_ignited',
      round: started.encounter.round,
      ids: [String(grease.id), String(web.id)],
    });
  });

  it('exposes exact default, clean-wipe, recovery, and override party policies', () => {
    const baseline = {
      useHealingPotions: true,
      openWithBless: true,
      reserveClericSlotsForBless: true,
      useWizardTactics: true,
      useClericContingency: true,
    } as const;
    expect(vaneWarrenPartyPolicy('default')).toEqual(baseline);
    expect(vaneWarrenPartyPolicy('tpk-clean')).toEqual({
      ...baseline, reserveClericSlotForRevivify: false,
    });
    expect(vaneWarrenPartyPolicy('tpk-recovery')).toEqual({
      ...baseline, reserveClericSlotForRevivify: true,
    });
    const override = {
      useHealingPotions: false,
      openWithBless: false,
      reserveClericSlotsForBless: false,
      useWizardTactics: false,
      useClericContingency: false,
    } as const;
    expect(vaneWarrenPartyPolicy('default', override)).toBe(override);
  });

  it('composes fast default and rehearsal contracts with actor-specific actions', () => {
    const party = loadedMutationParty();
    const partyState = createPartySessionState(party.members);
    const displayNames = new Map(party.members.map((member, index) => [
      member.profile.characterId,
      `Loaded Vane ${String(index)}`,
    ]));
    const composed = composeVaneWarrenFight('cinder-rite', party.members, displayNames, partyState);
    const selected = party.members[4];
    if (selected === undefined) throw new Error('Loaded Vane party has no fifth member.');
    const actionState: EncounterState = {
      ...composed.state,
      activeCombatant: selected.profile.id,
      round: 1,
      combatants: composed.state.combatants.map((subject) => subject.profile.id === selected.profile.id
        ? { ...subject, turn: { ...subject.turn, action: { kind: 'available' } } }
        : subject),
    };
    const selectedActions = composed.turnLegalActions(actionState, selected.profile.id).actions;
    expect(selectedActions.filter((action) => action.type === 'attack').map((action) => action.attackId))
      .toContain('attack:vane-loaded-4');
    expect(selectedActions.filter((action) => action.type === 'attack').map((action) => action.attackId))
      .not.toContain('attack:vane-loaded-0');

    for (const scenario of ['tpk-clean', 'tpk-recovery'] as const) {
      const rehearsal = composeVaneWarrenSessionEncounter(
        party.members, displayNames, partyState, scenario,
      );
      expect(rehearsal.startPaused).toBe(true);
      expect(rehearsal.controllers).toHaveLength(15);
      expect(rehearsal.controllers.every((identity) => identity.kind === 'algorithm')).toBe(true);
      expect(rehearsal.controllers.every((identity) =>
        identity.controllerId === `${identity.combatantId}:algorithm:rehearsal`)).toBe(true);
      expect(rehearsal.sessionFlow).toEqual({
        name: VANE_WARREN_TPK_SCENARIOS[scenario].sessionName,
        encounterCount: 1,
        endControlLabel: 'End Session and export',
      });
    }
    expect(() => composeVaneWarrenSessionEncounter(
      party.members,
      displayNames,
      { ...partyState, room: 4 },
    )).toThrow('The three-encounter Vane Warren session is complete.');
  });

  it('pins the four applied-and-restored mutation controls to named killing tests', () => {
    const ledger = readFileSync('docs/audits/2026-08-24-flagship-mutation-ledger.md', 'utf8');
    const tests = readFileSync('tests/unit/vtt/vane-warren.test.ts', 'utf8');
    for (const control of [
      'alarm_double_wave',
      'ratio_drift',
      'legendary_pool_wrong',
      'ignition_skipped',
    ]) {
      expect(ledger).toContain(`\`${control}\``);
      expect(tests).toContain(`${control}:`);
    }
    expect(ledger.match(/`exit 1`/gu)).toHaveLength(4);
    expect(ledger).toContain('All four mutations were restored.');
  });

  it('pins the three alarm-surface mutations to their named killing tests', () => {
    const ledger = readFileSync('docs/audits/2026-08-25-alarm-surface-mutation-ledger.md', 'utf8');
    const tests = readFileSync('tests/unit/vtt/vane-warren.test.ts', 'utf8');
    for (const control of [
      'drum_from_anywhere',
      'drum_double_trigger',
      'dm_trigger_unlogged',
    ]) {
      expect(ledger).toContain(`\`${control}\``);
      expect(tests).toContain(`${control}:`);
    }
    expect(ledger.match(/`exit 1`/gu)).toHaveLength(3);
    expect(ledger).toContain('Tests  13 passed (13)');
    expect(ledger).toContain('All three mutations were restored.');
  });
});
