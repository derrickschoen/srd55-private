import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { armorClass, effectStackingIdentity, worldObjectId } from '../../../src/combat/values';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { traceCombatantLine } from '../../../src/combat/cover';
import type { GridCell } from '../../../src/combat/grid';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

const face = (value: number) => () => (value - 0.5) / 20;

function fixture() {
  const player = playerProfile('last-seen-player', { initiativeBonus: -20 });
  const monster = monsterProfile('last-seen-monster', { initiativeBonus: 20 });
  let state = createEncounter({
    bounds: { columns: 6, rows: 2 },
    combatants: [player, monster],
    tokens: [placedToken(player, 0), placedToken(monster, 2)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, face(10)).state;
  return { player, monster, state };
}

function invisible(state: EncounterState, actor: ReturnType<typeof monsterProfile>): EncounterState {
  return reduceEncounter(state, {
    type: 'apply_effect',
    actor: actor.id,
    cost: 'none',
    effect: {
      targets: [actor.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('test:last-seen-invisible'),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: { kind: 'condition', condition: 'Invisible' },
    },
  }, face(10)).state;
}

function playerBoard(state: EncounterState, playerId: ReturnType<typeof playerProfile>['id']) {
  return projectPlayerBoard(projectPlayerView(state, {
    seatId: 'seat:last-seen',
    combatantId: playerId,
    ownedCombatantIds: [playerId],
  }), IDLE);
}

/** Every serialized object carrying the exact grid coordinate, regardless of its field name. */
function coordinatePaths(value: unknown, target: GridCell, path = '$'): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => coordinatePaths(entry, target, `${path}[${String(index)}]`));
  }
  const nested = Object.entries(value).flatMap(([key, entry]) =>
    coordinatePaths(entry, target, `${path}.${key}`));
  return 'column' in value && value.column === target.column &&
    'row' in value && value.row === target.row
    ? [path, ...nested]
    : nested;
}

describe('D545 last-seen observation history', () => {
  it('retains the exact cell where a seen creature became invisible', () => {
    const setup = fixture();
    const hidden = invisible(setup.state, setup.monster);

    expect(hidden.observationHistory.find((entry) =>
      entry.observer === setup.player.id && entry.subject === setup.monster.id)).toEqual({
      observer: setup.player.id,
      subject: setup.monster.id,
      cell: { column: 2, row: 0 },
      round: 1,
      revision: 1,
    });
    expect(playerBoard(hidden, setup.player.id).lastSeen).toEqual([{
      id: setup.monster.id,
      name: 'last-seen-monster',
      kind: 'monster',
      cell: { column: 2, row: 0 },
      round: 1,
    }]);
  });

  it('does not project hidden movement as a combatant, event, history entry or last-seen marker', () => {
    const setup = fixture();
    let hidden = invisible(setup.state, setup.monster);
    hidden = reduceEncounter(hidden, {
      type: 'move', actor: setup.monster.id, path: [{ column: 3, row: 0 }], cause: 'voluntary',
    }, face(10)).state;
    hidden = reduceEncounter(hidden, {
      type: 'move', actor: setup.monster.id, path: [{ column: 4, row: 0 }], cause: 'voluntary',
    }, face(10)).state;

    const board = playerBoard(hidden, setup.player.id);
    expect(hidden.observationHistory.filter((entry) => entry.subject === setup.monster.id)).toEqual([{
      observer: setup.player.id,
      subject: setup.monster.id,
      cell: { column: 2, row: 0 },
      round: 1,
      revision: 1,
    }]);
    expect(board.lastSeen).toEqual([{
      id: setup.monster.id,
      name: 'last-seen-monster',
      kind: 'monster',
      cell: { column: 2, row: 0 },
      round: 1,
    }]);
    expect(board.combatants.map((combatant) => combatant.id)).not.toContain(setup.monster.id);
    expect(board.events.some((event) =>
      event.type === 'movement_completed' && event.combatant === setup.monster.id)).toBe(false);
  });

  it('allows hidden-route coordinates only as exhaustive public geometry in canonical player JSON', () => {
    const setup = fixture();
    let hidden = invisible(setup.state, setup.monster);
    hidden = reduceEncounter(hidden, {
      type: 'move', actor: setup.monster.id, path: [{ column: 3, row: 0 }], cause: 'voluntary',
    }, face(10)).state;
    hidden = reduceEncounter(hidden, {
      type: 'move', actor: setup.monster.id, path: [{ column: 4, row: 0 }], cause: 'voluntary',
    }, face(10)).state;

    const baselineBoard = playerBoard(setup.state, setup.player.id);
    const hiddenBoard = playerBoard(hidden, setup.player.id);
    expect(hiddenBoard.visibleCells).toEqual(baselineBoard.visibleCells);
    const serializedBoard: unknown = JSON.parse(canonicalJson(hiddenBoard));

    // These exact paths prove the old substring came from exhaustive public geometry.
    // A current/intermediate coordinate added under any other field creates a
    // second path and fails this exhaustive recursive assertion.
    expect(coordinatePaths(serializedBoard, { column: 3, row: 0 }).sort()).toEqual([
      '$.terrainCells[3].cell',
      '$.visibleCells[3]',
    ]);
    expect(coordinatePaths(serializedBoard, { column: 4, row: 0 }).sort()).toEqual([
      '$.terrainCells[4].cell',
      '$.visibleCells[4]',
    ]);
  });

  it('returns a seen-again subject to combatants and removes its marker', () => {
    const setup = fixture();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.monster.id, stealthTotal: 18, edition: '2024' }],
    };
    expect(playerBoard(hidden, setup.player.id).lastSeen[0]?.cell).toEqual({ column: 2, row: 0 });

    const revealed = reduceEncounter(hidden, {
      type: 'reveal_hidden', actor: setup.monster.id, reason: 'stopped_hiding',
    }, face(10)).state;
    const board = playerBoard(revealed, setup.player.id);
    expect(board.lastSeen).toEqual([]);
    expect(board.combatants.map((entry) => entry.id)).toEqual([setup.monster.id, setup.player.id]);
  });

  it('does not project another seat’s observation to an owner who never saw the subject', () => {
    const seeing = playerProfile('last-seen-seeing-seat');
    const blocked = playerProfile('last-seen-blocked-seat');
    const subject = monsterProfile('last-seen-seat-subject');
    const created = createEncounter({
      bounds: { columns: 5, rows: 4 },
      combatants: [seeing, blocked, subject],
      tokens: [placedToken(seeing, 1, 0), placedToken(blocked, 4, 2), placedToken(subject, 2, 0)],
      worldObjects: [{
        id: worldObjectId('object:last-seen-sight-wall'),
        name: 'Last-seen sight wall',
        kind: 'barrier',
        position: { column: 3, row: 1 },
        footprint: [
          { column: 3, row: 0 },
          { column: 3, row: 1 },
          { column: 3, row: 2 },
          { column: 3, row: 3 },
        ],
        durability: { kind: 'indestructible' },
        armorClass: armorClass(12),
        damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' },
        createdRevision: 0,
      }],
    });
    const state = reduceEncounter(created, { type: 'roll_initiative' }, face(10)).state;
    const blockedTrace = traceCombatantLine(state, blocked.id, subject.id);
    expect(blockedTrace.lines.map((line) => line.blocksSight)).toEqual([true, true, true, true]);
    expect(traceCombatantLine(state, seeing.id, subject.id).blocksSight).toBe(false);
    const hidden: EncounterState = {
      ...state,
      hiddenCombatants: [{ combatant: subject.id, stealthTotal: 18, edition: '2024' }],
    };

    expect(state.observationHistory.filter((entry) => entry.subject === subject.id)).toEqual([{
      observer: seeing.id,
      subject: subject.id,
      cell: { column: 2, row: 0 },
      round: 1,
      revision: 1,
    }]);
    expect(projectPlayerView(hidden, {
      seatId: 'seat:seeing', combatantId: seeing.id, ownedCombatantIds: [seeing.id],
    }).lastSeen).toEqual([expect.objectContaining({ id: subject.id, cell: { column: 2, row: 0 } })]);
    expect(projectPlayerView(hidden, {
      seatId: 'seat:blocked', combatantId: blocked.id, ownedCombatantIds: [blocked.id],
    }).lastSeen).toEqual([]);
  });

  it('drops a hidden subject’s observations when the subject is marked dead', () => {
    const setup = fixture();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.monster.id, stealthTotal: 18, edition: '2024' }],
    };
    const dead = reduceEncounter(hidden, { type: 'dm_mark_dead', target: setup.monster.id }, face(10)).state;

    expect(dead.observationHistory.filter((entry) => entry.subject === setup.monster.id)).toEqual([]);
    expect(playerBoard(dead, setup.player.id).lastSeen).toEqual([]);
  });

  it('resolves monster last-seen knowledge and distinguishes a genuinely never-observed target', () => {
    const setup = fixture();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.player.id, stealthTotal: 18, edition: '2024' }],
    };
    const monsterKnowledge = projectActorKnowledge(hidden, setup.monster.id).targets[0];
    expect(monsterKnowledge).toEqual({
      kind: 'suspected',
      targetId: setup.player.id,
      lastSeen: { status: 'resolved', lastSeenPosition: { column: 0, row: 0 } },
    });

    const neverObserved = projectActorKnowledge({ ...hidden, observationHistory: [] }, setup.monster.id).targets[0];
    expect(neverObserved).toEqual({
      kind: 'unknown',
      targetId: setup.player.id,
      lastSeen: { status: 'unresolved', reason: 'never_observed' },
    });
  });

  it('leaves the DM board structure unchanged by last-seen player knowledge', () => {
    const setup = fixture();
    const hidden = invisible(setup.state, setup.monster);
    const dm = projectDmBoard({
      view: projectDmView(hidden), coordinator: IDLE, controllers: [], history: [],
    });

    expect(Object.keys(dm.encounter).sort()).toEqual([
      'activeCombatant', 'adjudicationPending', 'blockedCells', 'bounds', 'combatants', 'dmOnly',
      'environment', 'hiddenRolls', 'phase', 'recentEvents', 'revision', 'round',
      'sharedSpaceRelations', 'viewer', 'worldObjects',
    ].sort());
    expect(dm.encounter.combatants.find((entry) => entry.id === setup.monster.id)).toMatchObject({
      placementStatus: 'placed', position: { column: 2, row: 0 }, hiddenFromPlayers: false,
    });
  });
});
