import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { persistentAreaContains } from '../../../src/combat/persistent-areas';
import type { CombatantId } from '../../../src/combat/values';
import { projectPlayerView } from '../../../src/combat/visibility';
import { WorldObjectAlgorithmController } from '../../../src/combat/world-object-controller';
import {
  VANE_WARREN_DRUMMER_PRIORITY,
  VANE_WARREN_FIGHTS,
  VANE_WARREN_SOUND_DRUM_ACTION_ID,
  advanceVaneWarrenAlarm,
  createVaneWarrenFight,
  igniteVaneWarrenSurfaceFromBrazier,
  reduceVaneWarrenEncounter,
  reduceVaneWarrenWorldObjectAction,
  useVaneWarrenWarDrum,
  vaneWarrenDmWarDrumControl,
  vaneWarrenWorldObjectLegalActions,
  vaneWarrenActionEconomy,
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
    state = reduceVaneWarrenEncounter(state, {
      type: 'set_hidden_roll_category', category: 'death_saves', hidden: true,
    }, faceOne).state;
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
