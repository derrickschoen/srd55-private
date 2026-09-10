import { describe, expect, it } from 'vitest';
import { projectPlayerView } from '../../../src/combat/visibility';
import { feet } from '../../../src/combat/values';
import { feetPoint, type AreaTemplate } from '../../../src/combat/templates';
import {
  matchOfferedMoveDestination,
  previewAffectedCellKeys,
} from '../../../src/vtt/encounter-selectors';
import { projectPlayerBoard, type PlayerBoardProjection } from '../../../src/vtt/encounter-projections';
import {
  buildTwoRoomEncounter,
  TWO_ROOM_ADVENTURER_ID,
  TWO_ROOM_GOBLIN_ID,
} from '../../../src/vtt/handoff/fixtures/two-room';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fullBoardArea(x = 10): AreaTemplate {
  return {
    shape: 'sphere',
    template: { origin: feetPoint(x, 20), radius: feet(100) },
  };
}

describe('audience-safe encounter selectors', () => {
  it('derives distinct two-seat previews only from each filtered visible geometry', () => {
    const state = buildTwoRoomEncounter();
    const adventurer = projectPlayerBoard(projectPlayerView(state, {
      seatId: 'seat:selector-adventurer', combatantId: TWO_ROOM_ADVENTURER_ID,
    }), IDLE);
    const goblin = projectPlayerBoard(projectPlayerView(state, {
      seatId: 'seat:selector-goblin', combatantId: TWO_ROOM_GOBLIN_ID,
    }), IDLE);
    const first = previewAffectedCellKeys(adventurer, fullBoardArea());
    const second = previewAffectedCellKeys(goblin, fullBoardArea(40));
    if (first.kind !== 'available' || second.kind !== 'available') {
      throw new Error('Expected both real seats to have visible geometry.');
    }
    const adventurerVisible = new Set(adventurer.visibleCells.map((cell) => `${cell.column},${cell.row}`));
    const goblinVisible = new Set(goblin.visibleCells.map((cell) => `${cell.column},${cell.row}`));

    expect(first.cellKeys.every((key) => adventurerVisible.has(key))).toBe(true);
    expect(second.cellKeys.every((key) => goblinVisible.has(key))).toBe(true);
    expect(first.cellKeys).not.toEqual(second.cellKeys);
    expect(first.cellKeys).not.toContain('8,4');
  });

  it('returns unavailable instead of consulting concealed geometry', () => {
    const state = buildTwoRoomEncounter();
    const projection = projectPlayerBoard(projectPlayerView(state, {
      seatId: 'seat:selector-empty', combatantId: TWO_ROOM_ADVENTURER_ID,
    }), IDLE);

    expect(previewAffectedCellKeys({ ...projection, visibleCells: [] }, fullBoardArea())).toEqual({
      kind: 'unavailable', reason: 'no_visible_geometry',
    });
  });

  it('matches only the unique revision-bound offered move destination', () => {
    const state = buildTwoRoomEncounter();
    const base = projectPlayerBoard(projectPlayerView(state, {
      seatId: 'seat:selector-offers', combatantId: TWO_ROOM_ADVENTURER_ID,
    }), IDLE);
    const moveA = {
      type: 'move' as const, actor: TWO_ROOM_ADVENTURER_ID,
      path: [{ column: 2, row: 5 }, { column: 3, row: 5 }], cause: 'voluntary' as const,
    };
    const moveB = {
      type: 'move' as const, actor: TWO_ROOM_ADVENTURER_ID,
      path: [{ column: 3, row: 4 }, { column: 3, row: 5 }], cause: 'voluntary' as const,
    };
    const projection: PlayerBoardProjection = {
      ...base,
      pendingRequest: {
        kind: 'turn', requestId: 'request:selector-offers', encounterRevision: base.revision,
        actorId: TWO_ROOM_ADVENTURER_ID,
        legalActions: [moveA], offeredActionIds: ['offer:unique'],
      },
    };

    expect(matchOfferedMoveDestination(projection, TWO_ROOM_ADVENTURER_ID, { column: 3, row: 5 }))
      .toEqual({ kind: 'matched', offeredActionId: 'offer:unique' });
    expect(matchOfferedMoveDestination(projection, TWO_ROOM_ADVENTURER_ID, { column: 4, row: 5 }))
      .toEqual({ kind: 'illegal' });
    expect(matchOfferedMoveDestination({
      ...projection,
      pendingRequest: {
        ...projection.pendingRequest!, legalActions: [moveA, moveB],
        offeredActionIds: ['offer:a', 'offer:b'],
      },
    }, TWO_ROOM_ADVENTURER_ID, { column: 3, row: 5 })).toEqual({
      kind: 'ambiguous', offeredActionIds: ['offer:a', 'offer:b'],
    });
    expect(matchOfferedMoveDestination(projection, TWO_ROOM_GOBLIN_ID, { column: 3, row: 5 }))
      .toEqual({ kind: 'unavailable', reason: 'no_current_offer' });
  });
});
