import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { persistentAreaContains } from '../../../src/combat/persistent-areas';
import type { CombatantId } from '../../../src/combat/values';
import {
  VANE_WARREN_FIGHTS,
  advanceVaneWarrenAlarm,
  createVaneWarrenFight,
  igniteVaneWarrenSurfaceFromBrazier,
  useVaneWarrenWarDrum,
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

describe('D377.5 The Vane Warren flagship bundle', () => {
  it('loads each separate fight with pre-placed tokens, fog, light, surfaces, and at least six landed terrain or hazard elements', () => {
    for (const manifest of VANE_WARREN_FIGHTS) {
      const loaded = fight(manifest.id);
      expect(loaded.encounter.combatants).toHaveLength(4 + manifest.standing.length);
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

  it('ratio_drift: derives 3.5x, 2.0x, and 1.5x from each fight roster instead of a copied expectation', () => {
    expect(VANE_WARREN_FIGHTS.map((manifest) => ({
      id: manifest.id,
      ...vaneWarrenActionEconomy(manifest),
      recorded: manifest.targetActionEconomyRatio,
    }))).toEqual([
      { id: 'cinder-rite', enemyOpportunities: 14, partyOpportunities: 4, ratio: 3.5, recorded: 3.5 },
      { id: 'iron-voice', enemyOpportunities: 8, partyOpportunities: 4, ratio: 2, recorded: 2 },
      { id: 'last-muster', enemyOpportunities: 6, partyOpportunities: 4, ratio: 1.5, recorded: 1.5 },
    ]);
  });

  it('alarm_double_wave: deploys each fight-local alarm wave once on its listed subsequent round', () => {
    let state = fight('cinder-rite');
    const drummer = combatantIdFor(state, 'cinder-guard-b');
    state = useVaneWarrenWarDrum(state, drummer);
    expect(state.alarm).toMatchObject({ kind: 'sounded', usedAtRound: 1 });
    expect(state.deployedRosterIds).toHaveLength(6);

    state = advanceVaneWarrenAlarm(state, 1);
    expect(state.deployedRosterIds).toHaveLength(6);
    state = advanceVaneWarrenAlarm(state, 2);
    expect(state.deployedRosterIds).toHaveLength(10);
    state = advanceVaneWarrenAlarm(state, 2);
    expect(state.deployedRosterIds).toHaveLength(10);
    state = advanceVaneWarrenAlarm(state, 3);
    expect(state.deployedRosterIds).toHaveLength(14);
    state = advanceVaneWarrenAlarm(state, 20);
    expect(state.deployedRosterIds).toHaveLength(14);
    expect(state.alarm).toEqual({
      kind: 'complete',
      usedBy: drummer,
      usedAtRound: 1,
      deployedWaveIds: ['cinder-first-beat', 'cinder-second-beat'],
    });
    expect(state.transitions.filter((transition) => transition.kind === 'alarm_wave_deployed')).toHaveLength(2);
    expect(state.encounter.combatants.filter((subject) =>
      String(subject.profile.id).includes(':cinder-wave-')).map((subject) => subject.profile.id)).toHaveLength(8);
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

  it('legendary_pool_wrong: gives the warlord three landed windows and one Legendary Resistance', () => {
    const bundled = fight('iron-voice');
    const warlord = bundled.encounter.combatants.find((subject) =>
      subject.profile.kind === 'monster' &&
      subject.profile.statblockId === 'statblock:vane-warren/marshal-kett');
    if (warlord === undefined) throw new Error('The Iron Voice has no warlord.');
    expect(warlord.legendary).toEqual({
      actionUsesMaximum: 3,
      actionUsesRemaining: 3,
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
      'legendary_action:press-the-line',
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
});
