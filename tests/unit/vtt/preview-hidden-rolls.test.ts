import { describe, expect, it } from 'vitest';
import { ControllerRegistry, HumanController } from '../../../src/combat/controllers';
import { TurnCoordinator, type PersistedCoordinatorState } from '../../../src/combat/coordinator';
import {
  createEncounter,
  previewMovementPathDangers,
  reduceEncounter,
  type EncounterState,
  type MovementPathDangerKind,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { WEB_MATERIAL, type PersistentArea } from '../../../src/combat/persistent-areas';
import { mulberry32 } from '../../../src/combat/random';
import { feetPoint } from '../../../src/combat/templates';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import {
  damageType,
  dieSides,
  encounterBranchId,
  encounterSessionId,
  feet,
  persistentAreaId,
} from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import {
  projectDmBoard,
  projectPlayerBoard,
  serializePlayerBoard,
} from '../../../src/vtt/encounter-projections';
import {
  EncounterSessionJournal,
  exportSavedSession,
  exportSavedSessionV5ForMigrationTest,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const IDLE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

function movementState(): {
  readonly state: EncounterState;
  readonly mover: ReturnType<typeof playerProfile>;
  readonly enemy: ReturnType<typeof monsterProfile>;
} {
  const mover = playerProfile('danger-mover', { initiativeBonus: 20 });
  const enemy = monsterProfile('danger-enemy', { initiativeBonus: -20 });
  const state = reduceEncounter(createEncounter({
    bounds: { columns: 8, rows: 3 },
    combatants: [mover, enemy],
    tokens: [placedToken(mover, 1, 1), placedToken(enemy, 0, 1)],
  }), { type: 'roll_initiative' }, fixedD20(10)).state;
  return { state, mover, enemy };
}

function move(
  actor: ReturnType<typeof playerProfile>['id'],
  ...path: readonly { readonly column: number; readonly row: number }[]
): Extract<EncounterCommand, { readonly type: 'move' }> {
  return { type: 'move', actor, path, cause: 'voluntary' };
}

function dangerCells(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
  kind: MovementPathDangerKind,
): readonly { readonly column: number; readonly row: number }[] {
  return previewMovementPathDangers(state, command).annotations.flatMap((annotation) =>
    annotation.dangers.includes(kind) ? [annotation.cell] : []);
}

function pendingMovement(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): PersistedCoordinatorState {
  return {
    ...IDLE,
    requestSequence: 2,
    pendingRequest: {
      kind: 'turn',
      requestId: 'request:movement-danger',
      encounterRevision: state.revision,
      actorId: command.actor,
      visibleState: projectPlayerView(state, {
        seatId: 'seat:movement-danger',
        combatantId: command.actor,
      }),
      legalActions: { actions: [command] },
    },
  };
}

describe('D377.12 movement path-danger preview', () => {
  it('oa_marker_ignores_disengage: marks only the departure that truly provokes, then removes it after Disengage', () => {
    // OA trigger, can-see gate, timing, and Disengage exemption:
    // docs/srd/full/srd-5.2.1.txt:933-956.
    const fixture = movementState();
    const command = move(fixture.mover.id, { column: 2, row: 1 });

    expect(dangerCells(fixture.state, command, 'opportunity_attack')).toEqual([
      { column: 1, row: 1 },
    ]);

    const disengaged = reduceEncounter(
      fixture.state,
      { type: 'disengage', actor: fixture.mover.id },
      fixedD20(10),
    ).state;
    expect(dangerCells(disengaged, command, 'opportunity_attack')).toEqual([]);
  });

  it('burning-cell marker matches burningCells exactly while area damage and Difficult Terrain stay separately typed', () => {
    const mover = playerProfile('surface-mover', { initiativeBonus: 20 });
    const enemy = monsterProfile('surface-enemy', { initiativeBonus: -20 });
    let state = reduceEncounter(createEncounter({
      bounds: { columns: 8, rows: 3 },
      environment: {
        narrowOpeningRegions: [],
        lightRegions: [],
        obscurementRegions: [],
        difficultTerrainRegions: [{ id: 'mud', cells: [{ column: 2, row: 1 }] }],
        movementRegions: [],
      },
      combatants: [mover, enemy],
      tokens: [placedToken(mover, 0, 1), placedToken(enemy, 7, 1)],
    }), { type: 'roll_initiative' }, fixedD20(10)).state;
    const area: PersistentArea = {
      id: persistentAreaId('area:path-danger-web'),
      sequence: 1,
      owner: mover.id,
      origin: { kind: 'fixed', point: feetPoint(10, 5) },
      shape: { kind: 'sphere', radius: feet(20) },
      duration: { kind: 'rounds', remaining: 10 },
      targetFilter: { kind: 'all' },
      difficultTerrain: false,
      material: WEB_MATERIAL,
      hooks: [{
        hook: 'on_start_of_turn_inside',
        frequency: 'once_per_turn',
        effect: {
          kind: 'automatic',
          payload: {
            kind: 'damage',
            damage: {
              terms: [{
                type: damageType('Fire'),
                dice: { count: 1, sides: dieSides(4), modifier: 0 },
              }],
              critical: false,
              responses: [],
            },
          },
        },
      }],
      movable: null,
      burningCells: [
        { cell: { column: 1, row: 1 }, burnsAwayAt: { round: 2, initiativeIndex: 0 } },
        { cell: { column: 3, row: 1 }, burnsAwayAt: { round: 2, initiativeIndex: 0 } },
      ],
      burnedAwayCells: [],
      members: [],
      consumedTurnKeys: [],
    };
    state = { ...state, persistentAreas: [area], nextPersistentAreaSequence: 2 };
    const command = move(
      mover.id,
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
    );

    expect(dangerCells(state, command, 'burning_surface')).toEqual(area.burningCells.map(
      (burning) => burning.cell,
    ));
    expect(dangerCells(state, command, 'persistent_area_damage')).toEqual(command.path);
    expect(dangerCells(state, command, 'difficult_terrain')).toEqual([{ column: 2, row: 1 }]);
  });

  it('danger_leaks_to_player: carries typed danger previews only on the DM projection and no serialized player keys', () => {
    const fixture = movementState();
    const command = move(fixture.mover.id, { column: 2, row: 1 });
    const coordinator = pendingMovement(fixture.state, command);
    const dm = projectDmBoard({
      view: projectDmView(fixture.state),
      coordinator,
      controllers: [{
        combatantId: fixture.mover.id,
        controllerId: 'controller:movement-danger',
        kind: 'human',
        generation: 0,
      }],
      history: [],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const player = projectPlayerBoard(projectPlayerView(fixture.state, {
      seatId: 'seat:movement-danger',
      combatantId: fixture.mover.id,
    }), coordinator);
    const serialized = serializePlayerBoard(player);

    expect(dm.movementPreviews[0]?.annotations).toContainEqual({
      cell: { column: 1, row: 1 },
      dangers: ['opportunity_attack'],
    });
    expect('movementPreviews' in player).toBe(false);
    expect(serialized).not.toContain('movementPreviews');
    expect(serialized).not.toContain('annotations');
    expect(serialized).not.toContain('opportunity_attack');
  });
});

function hiddenMonsterAttackState(): {
  readonly state: EncounterState;
  readonly player: ReturnType<typeof playerProfile>;
  readonly monster: ReturnType<typeof monsterProfile>;
} {
  const monster = monsterProfile('hidden-roll-monster', { initiativeBonus: 20 });
  const player = playerProfile('hidden-roll-player', { initiativeBonus: -20 });
  let state = reduceEncounter(createEncounter({
    hiddenRolls: ['monster_attack_rolls'],
    bounds: { columns: 5, rows: 2 },
    combatants: [monster, player],
    tokens: [placedToken(monster, 0), placedToken(player, 2)],
  }), { type: 'roll_initiative' }, fixedD20(11)).state;
  state = reduceEncounter(state, {
    type: 'attack',
    actor: monster.id,
    target: player.id,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Bludgeoning'),
        dice: { count: 0, sides: dieSides(6), modifier: 1 },
      }],
      critical: false,
      responses: [],
    },
  }, fixedD20(11)).state;
  return { state, player, monster };
}

describe('D377.12 hidden monster rolls', () => {
  it('hidden_number_leaks: player sees a monster attack outcome only while the DM surface retains its roll number', () => {
    const fixture = hiddenMonsterAttackState();
    const player = projectPlayerBoard(projectPlayerView(fixture.state, {
      seatId: 'seat:hidden-roll-player',
      combatantId: fixture.player.id,
    }), IDLE);
    const dm = projectDmBoard({
      view: projectDmView(fixture.state),
      coordinator: IDLE,
      controllers: [],
      history: [],
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const playerAttack = player.events.find((event) => event.type === 'attack_resolved');
    const dmAttack = dm.encounter.recentEvents.find((event) => event.type === 'attack_resolved');

    expect(playerAttack).toEqual({
      sequence: playerAttack?.sequence,
      type: 'attack_resolved',
      actor: fixture.monster.id,
      target: fixture.player.id,
      outcome: 'hit',
      rollVisibility: 'dm_only',
    });
    expect(playerAttack === undefined ? false : 'attack' in playerAttack).toBe(false);
    expect(JSON.stringify(playerAttack)).not.toMatch(/faces|chosen|total|attackBonus/u);
    expect(dmAttack?.type === 'attack_resolved' ? dmAttack.attack.total : null).toBe(111);
    expect(dm.board.log).toContainEqual(expect.objectContaining({
      rollKind: 'attack', faces: [11], total: 111, outcome: 'hit',
    }));
  });

  it('redacts a hidden monster saving throw to save/fail outcome while preserving the DM total', () => {
    const player = playerProfile('monster-save-source', { initiativeBonus: 20 });
    const monster = monsterProfile('monster-save-target', { initiativeBonus: -20 });
    let state = reduceEncounter(createEncounter({
      hiddenRolls: ['monster_saving_throws'],
      bounds: { columns: 5, rows: 2 },
      combatants: [player, monster],
      tokens: [placedToken(player, 0), placedToken(monster, 2)],
    }), { type: 'roll_initiative' }, fixedD20(8)).state;
    state = reduceEncounter(state, {
      type: 'force_save',
      actor: player.id,
      target: monster.id,
      ability: 'dexterity',
      dc: 15,
      rollMode: 'normal',
      damage: { terms: [], critical: false, responses: [] },
      onSuccess: 'none',
      cost: 'action',
    }, fixedD20(8)).state;

    const playerSave = projectPlayerView(state, {
      seatId: 'seat:monster-save-source', combatantId: player.id,
    }).recentEvents.find((event) => event.type === 'save_resolved');
    const dmSave = projectDmView(state).state.eventLog.find((event) => event.type === 'save_resolved');
    expect(playerSave).toEqual({
      sequence: playerSave?.sequence,
      type: 'save_resolved',
      source: player.id,
      target: monster.id,
      ability: 'dexterity',
      effectId: null,
      outcome: 'failure',
      rollVisibility: 'dm_only',
    });
    expect(playerSave === undefined ? false : 'save' in playerSave).toBe(false);
    expect(dmSave?.type === 'save_resolved' ? dmSave.save.total : null).toBe(8);
  });

  it('persists independently toggled categories through save and resume', () => {
    const fixture = hiddenMonsterAttackState();
    const state = { ...fixture.state, hiddenRolls: [] };
    const registry = new ControllerRegistry([
      { combatantId: fixture.monster.id, controller: new HumanController() },
      { combatantId: fixture.player.id, controller: new HumanController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const rng = mulberry32(44);
    const sessionId = encounterSessionId('session:hidden-roll-categories');
    const journal = EncounterSessionJournal.create({
      sessionId,
      branchId: encounterBranchId('branch:hidden-roll-categories'),
      encounterState: state,
      coordinatorState: IDLE,
      controllers: registry.identities(),
      rng,
      store,
      mirror: new MemoryMirrorSink(),
    });
    const coordinator = new TurnCoordinator(state, registry, rng, { persistence: journal });
    coordinator.setHiddenRollCategory('death_saves', true);
    coordinator.setHiddenRollCategory('monster_attack_rolls', true);
    coordinator.setHiddenRollCategory('monster_saving_throws', true);
    coordinator.setHiddenRollCategory('death_saves', false);

    const bytes = exportSavedSession(store, sessionId);
    const resumedStore = new MemoryBrowserSessionStore();
    importSavedSession(resumedStore, bytes);
    const resumed = EncounterSessionJournal.resume(sessionId, resumedStore, new MemoryMirrorSink());
    expect(resumed.encounterState.hiddenRolls).toEqual([
      'monster_attack_rolls',
      'monster_saving_throws',
    ]);
  });

  it('legacy_toggle_dropped: migrates a hideDeathSaveRolls-only v5 save to the equivalent category', () => {
    const fixture = hiddenMonsterAttackState();
    const state = { ...fixture.state, hiddenRolls: ['death_saves'] as const };
    const registry = new ControllerRegistry([
      { combatantId: fixture.monster.id, controller: new HumanController() },
      { combatantId: fixture.player.id, controller: new HumanController() },
    ]);
    const source = new MemoryBrowserSessionStore();
    const sessionId = encounterSessionId('session:legacy-hidden-death-save');
    EncounterSessionJournal.create({
      sessionId,
      branchId: encounterBranchId('branch:legacy-hidden-death-save'),
      encounterState: state,
      coordinatorState: IDLE,
      controllers: registry.identities(),
      rng: mulberry32(45),
      store: source,
      mirror: new MemoryMirrorSink(),
    });
    const legacyBytes = exportSavedSessionV5ForMigrationTest(source, sessionId);
    const destination = new MemoryBrowserSessionStore();
    importSavedSession(destination, legacyBytes);

    expect(EncounterSessionJournal.resume(
      sessionId,
      destination,
      new MemoryMirrorSink(),
    ).encounterState.hiddenRolls).toEqual(['death_saves']);
  });
});
