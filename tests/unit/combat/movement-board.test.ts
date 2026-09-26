import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { narrowOpeningRegion, sharedSpaceRelation } from '../../../src/combat/creature-space';
import { createEncounter, type EncounterSetup, type EncounterState } from '../../../src/combat/encounter';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { adjacentCells, boardCell, type GridCell } from '../../../src/combat/grid';
import { GridSizeError, MAX_GRID_CELLS } from '../../../src/combat/grid-size';
import type { MovementWorld } from '../../../src/combat/movement';
import { persistentAreaContains, type PersistentArea } from '../../../src/combat/persistent-areas';
import { feetPoint } from '../../../src/combat/templates';
import { feet, persistentAreaId, type CombatantId } from '../../../src/combat/values';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { onBoard } from '../../helpers/board-cell';
import { movementBoardVariants, type NamedState } from '../../helpers/movement-board-variants';
import { encounterMovementWorld as frozenMovementWorld } from '../../helpers/reference-movement-world';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

// PERF-02 board3. The movement world answers from a flat typed-array board
// (src/combat/movement-board.ts). Rules: docs/srd/full/srd-5.2.1.txt:851 (four Tiny creatures per
// square), :859-871 (moving around other creatures), :880 (difficult terrain costs an extra foot).
// Narrow openings and squeezing are the engine's creature-space model (creature-space.ts): a normal
// placement may not touch an opening sized for a smaller creature, and a squeezed creature takes the
// opening's smaller space and must fit inside ONE opening sized for that smaller size.

type Size = NonNullable<CombatantProfile['rules']['sizeCategory']>;

function sized(profile: CombatantProfile, sizeCategory: Size): CombatantProfile {
  return { ...profile, rules: { ...profile.rules, sizeCategory } };
}

function encounter(setup: EncounterSetup): { readonly state: EncounterState; readonly world: MovementWorld<CombatantId> } {
  const state = createEncounter(setup);
  return { state, world: encounterMovementWorld(state) };
}

function environment(overrides: Partial<NonNullable<EncounterSetup['environment']>>): NonNullable<EncounterSetup['environment']> {
  return {
    lightRegions: [],
    difficultTerrainRegions: [],
    obscurementRegions: [],
    narrowOpeningRegions: [],
    movementRegions: [],
    ...overrides,
  };
}

function difficultSphere(id: string, owner: CombatantId, sequence: number, point: GridCell): PersistentArea {
  return {
    id: persistentAreaId(id),
    sequence,
    owner,
    origin: { kind: 'fixed', point: feetPoint(point.column * 5, point.row * 5) },
    shape: { kind: 'sphere', radius: feet(5) },
    duration: { kind: 'rounds', remaining: 3 },
    targetFilter: { kind: 'all' },
    difficultTerrain: true,
    material: null,
    hooks: [],
    movable: null,
    burningCells: [],
    burnedAwayCells: [],
    members: [],
    consumedTurnKeys: [],
  };
}

const PASS_BLOCKED = { kind: 'blocked', reason: 'creature space cannot be traversed' } as const;

describe('movement board: the in-bounds cell type', () => {
  it('decodes only whole-number cells inside the grid, as a fresh frozen copy the caller cannot change', () => {
    const bounds = { columns: 3, rows: 2 };
    for (const outside of [
      { column: -1, row: 0 }, { column: 0, row: -1 }, { column: 0.5, row: 0 }, { column: 1, row: 1.5 },
      { column: 3, row: 0 }, { column: 0, row: 2 }, { column: Number.NaN, row: 0 },
    ]) {
      expect(boardCell(bounds, outside), JSON.stringify(outside)).toBeNull();
    }
    const inside = { column: 2, row: 1 };
    const decoded = boardCell(bounds, inside);
    expect(decoded).toEqual({ column: 2, row: 1 });
    expect(decoded).not.toBe(inside);
    expect(Object.isFrozen(decoded)).toBe(true);
    // The caller's own object stays its own: changing it leaves the decoded cell inside the grid.
    inside.column = 7;
    expect(decoded).toEqual({ column: 2, row: 1 });
    expect(boardCell({ columns: 2.5, rows: 2 }, { column: 0, row: 0 })).toBeNull();
    // Neighbours are minted the same way, in row-major order.
    const neighbours = adjacentCells(bounds, { column: 1, row: 0 });
    expect(neighbours).toEqual([{ column: 0, row: 0 }, { column: 2, row: 0 }, { column: 0, row: 1 }, { column: 1, row: 1 }, { column: 2, row: 1 }]);
    expect(neighbours.every((cell) => Object.isFrozen(cell))).toBe(true);
    // From the far corner only the three cells behind it are on the grid.
    expect(adjacentCells(bounds, { column: 2, row: 1 })).toEqual([{ column: 1, row: 0 }, { column: 2, row: 0 }, { column: 1, row: 1 }]);
  });

  it('answers a cell decoded against a larger grid as outside this board, never reading past it', () => {
    // One encounter has one bounds, so this never happens in the engine; the board still
    // checks every square against its own columns and rows before it indexes anything.
    const mover = playerProfile('board-cross-grid-mover');
    const { state, world } = encounter({ bounds: { columns: 3, rows: 2 }, combatants: [mover], tokens: [placedToken(mover, 0)] });
    const from = onBoard(state.bounds, { column: 0, row: 0 });
    for (const foreign of [{ column: 3, row: 0 }, { column: 0, row: 2 }, { column: 5, row: 4 }]) {
      const cell = onBoard({ columns: 6, rows: 5 }, foreign);
      expect(world.canTraverseStep(mover.id, from, cell), JSON.stringify(foreign)).toBe(false);
      expect(world.traversal(mover.id, from, cell), JSON.stringify(foreign))
        .toEqual({ kind: 'blocked', reason: 'creature footprint is outside the grid' });
    }
  });

  it('refuses at compile time to ask a movement world about a cell that was never decoded', () => {
    const mover = playerProfile('board-type-mover');
    const { state, world } = encounter({ bounds: { columns: 3, rows: 1 }, combatants: [mover], tokens: [placedToken(mover, 0)] });
    const decoded = onBoard(state.bounds, { column: 1, row: 0 });
    const undecoded = (): unknown => [
      // @ts-expect-error a GridCell is not a BoardCell: it must pass the boardCell bounds check first.
      world.canTraverseStep(mover.id, { column: -1, row: 0 }, decoded),
      // @ts-expect-error same for traversal's destination.
      world.traversal(mover.id, decoded, { column: 0.5, row: 0 }),
      // @ts-expect-error same for occupiedCells' anchor.
      world.occupiedCells(mover.id, { column: 3, row: 0 }),
    ];
    expect(typeof undecoded).toBe('function');
    expect(world.traversal(mover.id, onBoard(state.bounds, { column: 0, row: 0 }), decoded))
      .toEqual({ kind: 'enterable', cost: 5, canEnd: true });
  });

  it('builds a board of exactly MAX_GRID_CELLS and refuses one cell more before allocating', () => {
    // Only a state spread together in memory can carry such bounds: createEncounter and every
    // decoder refuse them first (tests/unit/vtt/grid-size-contract.test.ts).
    const mover = playerProfile('board-grid-size-mover');
    const { state } = encounter({ bounds: { columns: 3, rows: 1 }, combatants: [mover], tokens: [placedToken(mover, 0)] });
    const atLimit = { ...state, bounds: { columns: 1_024, rows: 1_024 } };
    expect(MAX_GRID_CELLS).toBe(1_024 * 1_024);
    let world: MovementWorld<CombatantId> | undefined;
    expect(() => { world = encounterMovementWorld(atLimit); }).not.toThrow();
    expect(world?.traversal(mover.id, onBoard(atLimit.bounds, { column: 1_023, row: 1_023 }),
      onBoard(atLimit.bounds, { column: 1_022, row: 1_022 }))).toEqual({ kind: 'enterable', cost: 5, canEnd: true });
    let refused: unknown;
    try {
      encounterMovementWorld({ ...state, bounds: { columns: 17, rows: 61_681 } });
    } catch (error) {
      refused = error;
    }
    expect(refused instanceof GridSizeError && refused.problem === 'over_max_cells').toBe(true);
  });
});

describe('movement board: creature-space rules only the frozen-world differential used to guard', () => {
  it('lets a Tiny mover end among three Tiny creatures but not among four (four Tiny per square)', () => {
    const mover = sized(playerProfile('tiny-crowd-mover'), 'Tiny');
    const three = [1, 2, 3].map((index) => sized(monsterProfile(`tiny-crowd-three-${String(index)}`), 'Tiny'));
    const four = [1, 2, 3, 4].map((index) => sized(monsterProfile(`tiny-crowd-four-${String(index)}`), 'Tiny'));
    const pairs = (group: readonly CombatantProfile[]) => group.flatMap((left, index) => group.slice(index + 1).map((right) =>
      sharedSpaceRelation({ left: left.id, right: right.id, provenance: 'tiny_capacity', originatingId: 'board3-test' })));
    const { state, world } = encounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [mover, ...three, ...four],
      tokens: [placedToken(mover, 1, 1), ...three.map((profile) => placedToken(profile, 0, 0)),
        ...four.map((profile) => placedToken(profile, 2, 0))],
      sharedSpaceRelations: [...pairs(three), ...pairs(four)],
    });
    const from = onBoard(state.bounds, { column: 1, row: 1 });
    // Tiny spaces are neither obstacles nor Difficult Terrain; the square's capacity decides canEnd.
    expect(world.traversal(mover.id, from, onBoard(state.bounds, { column: 0, row: 0 })))
      .toEqual({ kind: 'enterable', cost: 5, canEnd: true });
    expect(world.traversal(mover.id, from, onBoard(state.bounds, { column: 2, row: 0 })))
      .toEqual({ kind: 'enterable', cost: 5, canEnd: false });
  });

  it('blocks passage through a hostile one size larger or smaller, and allows it two sizes apart', () => {
    const mover = playerProfile('size-step-mover');
    const large = sized(monsterProfile('size-step-large'), 'Large');
    const small = sized(monsterProfile('size-step-small'), 'Small');
    const huge = sized(monsterProfile('size-step-huge'), 'Huge');
    const { state, world } = encounter({
      bounds: { columns: 7, rows: 4 },
      combatants: [mover, large, small, huge],
      tokens: [placedToken(mover, 2, 3), placedToken(large, 0, 2), placedToken(small, 3, 3), placedToken(huge, 3, 0)],
    });
    const from = onBoard(state.bounds, { column: 2, row: 3 });
    expect(world.traversal(mover.id, from, onBoard(state.bounds, { column: 1, row: 3 }))).toEqual(PASS_BLOCKED);
    expect(world.traversal(mover.id, from, onBoard(state.bounds, { column: 3, row: 3 }))).toEqual(PASS_BLOCKED);
    // Huge is two sizes above Medium: passable, but a hostile's space is Difficult Terrain and cannot be an end.
    expect(world.traversal(mover.id, from, onBoard(state.bounds, { column: 3, row: 2 })))
      .toEqual({ kind: 'enterable', cost: 10, canEnd: false });
  });

  it('admits a mover into an opening sized for its own size, and refuses one sized for a smaller creature', () => {
    const mover = playerProfile('opening-mover');
    const bounds = { columns: 3, rows: 3 };
    const { state, world } = encounter({
      bounds,
      combatants: [mover],
      tokens: [placedToken(mover, 1, 1)],
      environment: environment({ narrowOpeningRegions: [
        narrowOpeningRegion({ id: 'medium-gap', sizedFor: 'Medium', cells: [{ column: 2, row: 1 }], bounds }),
        narrowOpeningRegion({ id: 'small-gap', sizedFor: 'Small', cells: [{ column: 0, row: 1 }], bounds }),
      ] }),
    });
    const from = onBoard(state.bounds, { column: 1, row: 1 });
    expect(world.canTraverseStep(mover.id, from, onBoard(state.bounds, { column: 2, row: 1 }))).toBe(true);
    expect(world.canTraverseStep(mover.id, from, onBoard(state.bounds, { column: 0, row: 1 }))).toBe(false);
  });

  it('lets the smallest of overlapping openings decide, whatever order they were authored in', () => {
    const mover = playerProfile('overlap-mover');
    const bounds = { columns: 3, rows: 1 };
    const { state, world } = encounter({
      bounds,
      combatants: [mover],
      tokens: [placedToken(mover, 0)],
      environment: environment({ narrowOpeningRegions: [
        narrowOpeningRegion({ id: 'small-first', sizedFor: 'Small', cells: [{ column: 1, row: 0 }], bounds }),
        narrowOpeningRegion({ id: 'large-second', sizedFor: 'Large', cells: [{ column: 1, row: 0 }, { column: 2, row: 0 }], bounds }),
      ] }),
    });
    const from = onBoard(state.bounds, { column: 0, row: 0 });
    expect(world.canTraverseStep(mover.id, from, onBoard(state.bounds, { column: 1, row: 0 }))).toBe(false);
    expect(world.canTraverseStep(mover.id, from, onBoard(state.bounds, { column: 2, row: 0 }))).toBe(true);
  });

  it('asks each difficult persistent area on its own: a cell only the second area covers is difficult', () => {
    const mover = playerProfile('areas-mover');
    const created = createEncounter({ bounds: { columns: 8, rows: 3 }, combatants: [mover], tokens: [placedToken(mover, 3, 1)] });
    const first = difficultSphere('area:far-corner', mover.id, 1, { column: 8, row: 3 });
    const second = difficultSphere('area:beside-mover', mover.id, 2, { column: 5, row: 1 });
    const state: EncounterState = { ...created, persistentAreas: [first, second] };
    const entered = { column: 4, row: 1 };
    // Premises from the area geometry itself, not from the board: only the second sphere holds the cell.
    expect(persistentAreaContains(first, entered, null, state)).toBe(false);
    expect(persistentAreaContains(second, entered, null, state)).toBe(true);
    const world = encounterMovementWorld(state);
    expect(world.traversal(mover.id, onBoard(state.bounds, { column: 3, row: 1 }), onBoard(state.bounds, entered)))
      .toEqual({ kind: 'enterable', cost: 10, canEnd: true });
  });

  it('learns passability per mover: a Huge mover crossing a Medium hostile does not let a Medium mover cross it', () => {
    const huge = sized(playerProfile('per-mover-huge'), 'Huge');
    const medium = playerProfile('per-mover-medium');
    const hostile = monsterProfile('per-mover-hostile');
    const { state, world } = encounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [huge, medium, hostile],
      tokens: [placedToken(huge, 0, 0), placedToken(medium, 4, 2), placedToken(hostile, 3, 1)],
    });
    // The Huge mover's 3x3 footprint at (1,0) covers the hostile at (3,1): two sizes apart, so it passes.
    expect(world.traversal(huge.id, onBoard(state.bounds, { column: 0, row: 0 }), onBoard(state.bounds, { column: 1, row: 0 })))
      .toEqual({ kind: 'enterable', cost: 10, canEnd: false });
    // Asked second, on the same world: the Medium mover is the hostile's size, so it may not pass.
    expect(world.traversal(medium.id, onBoard(state.bounds, { column: 4, row: 2 }), onBoard(state.bounds, { column: 3, row: 1 })))
      .toEqual(PASS_BLOCKED);
  });
});

describe('movement board: squeezing', () => {
  // A Huge creature squeezing takes a Large (2x2) space. Block A is covered by two Large openings that
  // each hold only half of it; block B by one Large opening; block C by a Medium opening.
  function squeezeRoom() {
    const squeezer = sized(playerProfile('squeeze-huge'), 'Huge');
    const bounds = { columns: 12, rows: 4 };
    const block = (column: number, row: number): GridCell[] => [
      { column, row }, { column: column + 1, row }, { column, row: row + 1 }, { column: column + 1, row: row + 1 },
    ];
    const { state, world } = encounter({
      bounds,
      combatants: [squeezer],
      tokens: [{ ...placedToken(squeezer, 4, 0), placementMode: { kind: 'squeezed', actual: 'Huge', sizedFor: 'Large' } }],
      environment: environment({
        narrowOpeningRegions: [
          narrowOpeningRegion({ id: 'split-left', sizedFor: 'Large', cells: [{ column: 0, row: 0 }, { column: 0, row: 1 }], bounds }),
          narrowOpeningRegion({ id: 'split-right', sizedFor: 'Large', cells: [{ column: 1, row: 0 }, { column: 1, row: 1 }], bounds }),
          narrowOpeningRegion({ id: 'whole', sizedFor: 'Large', cells: [...block(4, 0), { column: 6, row: 0 }, { column: 6, row: 1 }], bounds }),
          narrowOpeningRegion({ id: 'medium', sizedFor: 'Medium', cells: block(9, 0), bounds }),
        ],
        difficultTerrainRegions: [{ id: 'rubble', cells: [{ column: 6, row: 2 }] }],
      }),
    });
    return { squeezer, state, world };
  }

  it('stands only where one opening sized for its squeeze size holds its whole footprint', () => {
    const { squeezer, state, world } = squeezeRoom();
    const from = onBoard(state.bounds, { column: 4, row: 0 });
    const standsAt = (column: number, row: number) => world.canTraverseStep(squeezer.id, from, onBoard(state.bounds, { column, row }));
    expect(standsAt(0, 0)).toBe(false);
    expect(standsAt(4, 0)).toBe(true);
    expect(standsAt(5, 0)).toBe(true);
    expect(standsAt(9, 0)).toBe(false);
    expect(standsAt(4, 1)).toBe(false);
  });

  it('occupies and enters only its squeezed 2x2 space', () => {
    const { squeezer, state, world } = squeezeRoom();
    expect(world.occupiedCells(squeezer.id, onBoard(state.bounds, { column: 5, row: 0 }))).toEqual([
      { column: 5, row: 0 }, { column: 6, row: 0 }, { column: 5, row: 1 }, { column: 6, row: 1 },
    ]);
    // The rubble at (6,2) lies under a 3x3 footprint from (5,0), but not under the squeezed 2x2 one.
    expect(world.traversal(squeezer.id, onBoard(state.bounds, { column: 4, row: 0 }), onBoard(state.bounds, { column: 5, row: 0 })))
      .toEqual({ kind: 'enterable', cost: 5, canEnd: true });
    expect(world.traversal(squeezer.id, onBoard(state.bounds, { column: 5, row: 0 }), onBoard(state.bounds, { column: 5, row: 1 })))
      .toEqual({ kind: 'enterable', cost: 10, canEnd: true });
  });
});

const DIFFERENTIAL_STEPS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const;

function outcome(run: () => unknown): string {
  try {
    return `ok:${JSON.stringify(run())}`;
  } catch (error) {
    return `throw:${error instanceof Error ? `${error.constructor.name}:${error.message}` : String(error)}`;
  }
}

describe('movement board: bounded differential against the frozen string-keyed world', () => {
  it('answers every step of every creature exactly as the frozen world, on fixture states and their synthetic variants', async () => {
    // seed-6203009 carries a Huge creature whose footprint leaves the grid (an occupant cell the board
    // drops). The exhaustive version over every fixture is tools/experiments/movement-board/differential.ts.
    const base: NamedState = {
      name: 'brutal 6203009',
      state: await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203009.json'),
    };
    const states = [base, ...movementBoardVariants(base, 0xb0a4d)];
    const unknownActor = 'combatant:board3-unknown' as CombatantId;
    const mismatches: string[] = [];
    let compared = 0;
    let expectedComparisons = 0;
    for (const { name, state } of states) {
      const build = [outcome(() => { encounterMovementWorld({ ...state }); return null; }),
        outcome(() => { frozenMovementWorld({ ...state }); return null; })];
      if (build[0] !== build[1]) mismatches.push(`${name} build: ${String(build[0])} vs ${String(build[1])}`);
      if (build[1] !== 'ok:null') continue;
      // Every in-bounds (from, to) pair: (columns - |dc|) x (rows - |dr|) per step, two questions each.
      const stepPairs = DIFFERENTIAL_STEPS.reduce((sum, [dc, dr]) =>
        sum + (state.bounds.columns - Math.abs(dc)) * (state.bounds.rows - Math.abs(dr)), 0);
      expectedComparisons += (state.tokens.length + 1) * stepPairs * 2;
      const board = encounterMovementWorld({ ...state });
      const frozen = frozenMovementWorld({ ...state });
      for (const actor of [...state.tokens.map((token) => token.combatantId), unknownActor]) {
        for (let row = 0; row < state.bounds.rows; row += 1) {
          for (let column = 0; column < state.bounds.columns; column += 1) {
            const from = onBoard(state.bounds, { column, row });
            for (const [columnStep, rowStep] of DIFFERENTIAL_STEPS) {
              const to = boardCell(state.bounds, { column: column + columnStep, row: row + rowStep });
              if (to === null) continue;
              const pairs = [
                [outcome(() => board.canTraverseStep(actor, from, to)), outcome(() => frozen.canTraverseStep(actor, from, to))],
                [outcome(() => board.traversal(actor, from, to)), outcome(() => frozen.traversal(actor, from, to))],
              ] as const;
              for (const [fromBoard, fromFrozen] of pairs) {
                compared += 1;
                if (fromBoard !== fromFrozen && mismatches.length < 5) {
                  mismatches.push(`${name} ${String(actor)} ${String(column)},${String(row)}->${String(to.column)},${String(to.row)}: ${fromBoard} vs ${fromFrozen}`);
                }
              }
            }
          }
        }
      }
    }
    expect(states).toHaveLength(8);
    expect(mismatches).toEqual([]);
    expect(compared).toBe(expectedComparisons);
    expect(compared).toBeGreaterThan(0);
  });
});
