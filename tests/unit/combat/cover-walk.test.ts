/**
 * PERF-02 cover6: the exact lattice walk and the typed line verdict (src/combat/cover.ts).
 *
 * The hand-derived tests below each name the wrong rule they catch. Expected values come from
 * D576.3 (decisions.md: four outer source corners to four outer target corners; a line counts a
 * cell only when it crosses the cell's open interior; count 0 none / 1-2 half / 3 three-quarters,
 * clamped by the strongest crossed tier and by three-quarters; all four lines sight-blocked is
 * Total with no sight; least-protective source corner, ties by row then column).
 *
 * The last block is the bounded permanent differential against the FROZEN pre-walk code in
 * tests/helpers/reference-cover.ts. A line traced from a hypothetical anchor is compared with the
 * reference on the state where the mover really stands at that anchor: the mover's body goes with
 * it (the coverself rule, owner ruling D888), which the pre-walk code only knew for real positions.
 * The exhaustive version (every fixture, every anchor) is experiment evidence only:
 * tools/experiments/cover-walk/exhaustive-differential.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  combatantLineVerdict,
  combatantLineVerdictToCells,
  cornerLineCrossesCell,
  coverBetweenCombatants,
  coverTierBetweenObjects,
  outerCorners,
  rasterizeCornerLine,
  terrainLineVerdict,
  traceCombatantLine,
  traceCombatantLineToCells,
  traceTerrainLine,
  visitCornerRayCells,
  walkCornerLine,
  type CornerPoint,
} from '../../../src/combat/cover';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { terrainBlocking } from '../../../src/combat/terrain';
import { armorClass, worldObjectId, type CombatantId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import * as reference from '../../helpers/reference-cover';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function walked(from: CornerPoint, to: CornerPoint): GridCell[] {
  const cells: GridCell[] = [];
  walkCornerLine(from, to, (column, row) => cells.push({ column, row }));
  return cells;
}

function feature(
  id: string,
  cells: readonly GridCell[],
  kind: Parameters<typeof terrainBlocking>[0],
): WorldObject {
  const position = cells[0];
  if (position === undefined) throw new Error('A test feature needs a footprint.');
  return {
    id: worldObjectId(`object:${id}`),
    name: id,
    kind: 'cover',
    position,
    footprint: cells,
    durability: { kind: 'indestructible' },
    armorClass: armorClass(10),
    damageResponses: [],
    blocking: terrainBlocking(kind),
    createdRevision: 0,
  };
}

function column(index: number, rows: number): GridCell[] {
  return Array.from({ length: rows }, (_unused, row) => ({ column: index, row }));
}

describe('PERF-02 cover6 exact lattice walk', () => {
  it('COVER-WALK-SEQUENCES visits exactly the crossed cells in order, stepping diagonally through grid corners', () => {
    // (0,0)->(3,2): y = 2x/3. x in (0,1): y < 2/3, cell (0,0). x in (1,1.5): y in (2/3,1), (1,0).
    // x in (1.5,2): y in (1,4/3), (1,1). x in (2,3): y in (4/3,2), (2,1). 3 + 2 - gcd(3,2) = 4 cells.
    expect(walked({ column: 0, row: 0 }, { column: 3, row: 2 })).toEqual([
      { column: 0, row: 0 }, { column: 1, row: 0 }, { column: 1, row: 1 }, { column: 2, row: 1 },
    ]);
    // The same segment walked backwards: the same cells in reverse. A leftward and upward ray starts
    // in the cell up and to the left of its start corner, (2,1), not in (3,2), which it only touches.
    expect(walked({ column: 3, row: 2 }, { column: 0, row: 0 })).toEqual([
      { column: 2, row: 1 }, { column: 1, row: 1 }, { column: 1, row: 0 }, { column: 0, row: 0 },
    ]);
    // Leftward and downward: (4,0)->(1,2), y = 2(4-x)/3. x in (3,4): y < 2/3, (3,0). x in (2.5,3):
    // y in (2/3,1), (2,0). x in (2,2.5): y in (1,4/3), (2,1). x in (1,2): y in (4/3,2), (1,1).
    expect(walked({ column: 4, row: 0 }, { column: 1, row: 2 })).toEqual([
      { column: 3, row: 0 }, { column: 2, row: 0 }, { column: 2, row: 1 }, { column: 1, row: 1 },
    ]);
    // (0,0)->(2,2) passes through the grid corner (1,1): it crosses (0,0) and (1,1) and only touches
    // (1,0) and (0,1) at that corner. 2 + 2 - gcd(2,2) = 2 cells.
    expect(walked({ column: 0, row: 0 }, { column: 2, row: 2 })).toEqual([
      { column: 0, row: 0 }, { column: 1, row: 1 },
    ]);
    // (0,0)->(4,2) passes through the grid corner (2,1): (0,0) (1,0) then (2,1) (3,1). 4 + 2 - 2 = 4.
    expect(walked({ column: 0, row: 0 }, { column: 4, row: 2 })).toEqual([
      { column: 0, row: 0 }, { column: 1, row: 0 }, { column: 2, row: 1 }, { column: 3, row: 1 },
    ]);
    // Axis-parallel segments lie on grid lines and graze the cells on both sides; zero length is no line.
    expect(walked({ column: 0, row: 1 }, { column: 4, row: 1 })).toEqual([]);
    expect(walked({ column: 4, row: 1 }, { column: 0, row: 1 })).toEqual([]);
    expect(walked({ column: 2, row: 0 }, { column: 2, row: 5 })).toEqual([]);
    expect(walked({ column: 2, row: 5 }, { column: 2, row: 0 })).toEqual([]);
    expect(walked({ column: 3, row: 3 }, { column: 3, row: 3 })).toEqual([]);
    // The exported rasterizer keeps only candidates, in traversal order: a graze along y = 1 crosses
    // neither the row above it nor the row below it.
    const besideTheLine = [0, 1, 2, 3].flatMap((index) => [{ column: index, row: 0 }, { column: index, row: 1 }]);
    expect(rasterizeCornerLine({ column: 0, row: 1 }, { column: 4, row: 1 }, besideTheLine)).toEqual([]);
    expect(rasterizeCornerLine({ column: 1, row: 0 }, { column: 1, row: 4 }, [
      { column: 0, row: 1 }, { column: 1, row: 1 }, { column: 0, row: 2 }, { column: 1, row: 2 },
    ])).toEqual([]);
  });

  it('COVER-WALK-SPEC equals the open-interior crossing test on every lattice segment of a window', () => {
    const cells: GridCell[] = [];
    for (let row = -3; row <= 6; row += 1) for (let index = -3; index <= 6; index += 1) cells.push({ column: index, row });
    const points: CornerPoint[] = [];
    for (let row = -2; row <= 5; row += 1) for (let index = -2; index <= 5; index += 1) points.push({ column: index, row });
    const gcd = (left: number, right: number): number => (right === 0 ? left : gcd(right, left % right));
    const problems: string[] = [];
    for (const from of points) {
      for (const to of points) {
        const visited = walked(from, to);
        const key = (cell: GridCell) => `${String(cell.column)},${String(cell.row)}`;
        const expected = cells.filter((cell) => cornerLineCrossesCell(from, to, cell)).map(key).sort();
        if (JSON.stringify(visited.map(key).sort()) !== JSON.stringify(expected)) {
          problems.push(`set ${JSON.stringify(from)}->${JSON.stringify(to)}`);
        }
        const columnSpan = Math.abs(to.column - from.column);
        const rowSpan = Math.abs(to.row - from.row);
        const count = columnSpan === 0 || rowSpan === 0 ? 0 : columnSpan + rowSpan - gcd(columnSpan, rowSpan);
        if (visited.length !== count) problems.push(`count ${JSON.stringify(from)}->${JSON.stringify(to)}`);
        const progress = visited.map((cell) =>
          (2 * cell.column + 1 - 2 * from.column) * (to.column - from.column) +
          (2 * cell.row + 1 - 2 * from.row) * (to.row - from.row));
        if (progress.some((value, index) => index > 0 && value <= (progress[index - 1] ?? value))) {
          problems.push(`order ${JSON.stringify(from)}->${JSON.stringify(to)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('COVER-AXIS-GRAZE a corner line along a grid line gets no cover from the walls it runs beside', () => {
    // Board 6 x 3. Source cell S = (0,1), target cell T = (4,1); walls on (1,0) (2,0) (3,0), the row
    // above both. Source corners (0,1) (1,1) (0,2) (1,2); target corners (4,1) (5,1) (4,2) (5,2).
    // From (0,1): ->(4,1) and ->(5,1) run along y = 1, the walls' lower edge: a graze, no crossing.
    //   ->(4,2) y = 1 + x/4 and ->(5,2) y = 1 + x/5 stay inside row 1 (y in (1,2)) and cross only
    //   (1,1) (2,1) (3,1) [and (4,1) = T for the second, excluded], which hold nothing.
    // So corner (0,1) has four clear lines: tier none, and as the first corner in row-major order it
    // is chosen. A rule that let a graze count would put the walls on the two y = 1 lines.
    const actor = playerProfile('axis-graze-bystander');
    const state = createEncounter({
      bounds: { columns: 6, rows: 3 }, combatants: [actor], tokens: [placedToken(actor, 5, 2)],
      blockedCells: [{ column: 1, row: 0 }, { column: 2, row: 0 }, { column: 3, row: 0 }],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 1 }, { column: 4, row: 1 });
    expect(trace).toMatchObject({
      sourceCorner: { column: 0, row: 1 }, tier: 'none', blocksSight: false, sourceIds: [], interveningCells: [],
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'none', 'none']);
    expect(terrainLineVerdict(state, { column: 0, row: 1 }, { column: 4, row: 1 })).toEqual({
      sourceCell: { column: 0, row: 1 }, targetCell: { column: 4, row: 1 },
      tier: 'none', blocksSight: false, sourceIds: [],
    });
  });

  it('COVER-THREE-QUARTERS-CLAMP four obstructed lines, some but not all through a wall, give Three-Quarters Cover', () => {
    // Board 6 x 4. S = (0,0), T = (4,2); low cover on column 2 (rows 0-3); a wall at W = (3,2).
    // Every line runs from x in {0,1} to x in {4,5} with a nonzero rise, so it crosses the interior of
    // a column-2 cell: every line is at least half. Target corners (4,2) (5,2) (4,3) (5,3).
    //   Corner (0,0): ->(4,2) y = x/2 meets column 3 at y in (1.5,2): (3,1), not W: half.
    //     ->(5,2) y = 2x/5, column 3 at y in (1.2,1.6): half. ->(4,3) y = 3x/4, column 3 at
    //     y in (2.25,3): W, total. ->(5,3) y = 3x/5, column 3 at y in (1.8,2.4): (3,1) and W, total.
    //   Corner (1,0): ->(4,2) y = 2(x-1)/3, column 3 at y in (4/3,2): half. ->(5,2) y = (x-1)/2: half.
    //     ->(4,3) y = x-1 passes the grid corner (3,2) into W at y in (2,3): total. ->(5,3)
    //     y = 3(x-1)/4, column 3 at y in (1.5,2.25): W, total.
    //   Corner (0,1): ->(4,2) y = 1+x/4 and ->(5,2) y = 1+x/5 stay in row 1: half. ->(4,3) y = 1+x/2,
    //     column 3 at y in (2.5,3): W. ->(5,3) y = 1+2x/5, column 3 at y in (2.2,2.6): W. total, total.
    //   Corner (1,1): ->(4,2), ->(5,2) stay in row 1: half. ->(4,3) y = 1+2(x-1)/3, column 3 at
    //     y in (7/3,3): W. ->(5,3) y = 1+(x-1)/2, column 3 at y in (2,2.5): W. total, total.
    // Each corner: four obstructed lines (count Total), strongest Total, but not all four sight-blocked:
    // min(Total, Total, Three-Quarters) = Three-Quarters. The tie goes to (0,0). The named sources are
    // those of the strongest line tier, Total: the wall alone.
    const actor = playerProfile('clamp-bystander');
    const state = createEncounter({
      bounds: { columns: 6, rows: 4 }, combatants: [actor], tokens: [placedToken(actor, 5, 0)],
      blockedCells: [{ column: 3, row: 2 }],
      worldObjects: [feature('low-strip', column(2, 4), 'half_cover')],
    });
    expect(terrainLineVerdict(state, { column: 0, row: 0 }, { column: 4, row: 2 })).toEqual({
      sourceCell: { column: 0, row: 0 }, targetCell: { column: 4, row: 2 },
      tier: 'three_quarters', blocksSight: false, sourceIds: ['blocked:3,2'],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    expect(trace).toMatchObject({
      sourceCorner: { column: 0, row: 0 }, tier: 'three_quarters', blocksSight: false,
      sourceIds: ['blocked:3,2'], firstBlockingCell: null,
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['half', 'half', 'total', 'total']);
  });

  it('COVER-STRONGEST-NOT-LAST a line keeps the strongest source it crosses even when a weaker one comes later', () => {
    // Board 6 x 4. S = (0,0), T = (4,2); tall cover (three-quarters) on column 1 and low cover (half)
    // on column 3, rows 0-3. Every line runs from x in {0,1} to x in {4,5} with a nonzero rise, so it
    // crosses the interior of a column-1 cell and later a column-3 cell: three-quarters first, then half.
    // Each line's tier is its strongest source, three-quarters, on all 16 lines. Each corner: four
    // obstructed lines, strongest three-quarters: min(Total, Three-Quarters, Three-Quarters) =
    // Three-Quarters, named source the tall strip. (Taking the last source crossed would give Half.)
    const actor = playerProfile('strongest-bystander');
    const state = createEncounter({
      bounds: { columns: 6, rows: 4 }, combatants: [actor], tokens: [placedToken(actor, 5, 0)],
      worldObjects: [
        feature('tall-strip', column(1, 4), 'three_quarters_cover'),
        feature('low-strip', column(3, 4), 'half_cover'),
      ],
    });
    expect(terrainLineVerdict(state, { column: 0, row: 0 }, { column: 4, row: 2 })).toEqual({
      sourceCell: { column: 0, row: 0 }, targetCell: { column: 4, row: 2 },
      tier: 'three_quarters', blocksSight: false, sourceIds: ['object:object:tall-strip'],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
    expect(trace.lines.map((line) => line.tier)).toEqual([
      'three_quarters', 'three_quarters', 'three_quarters', 'three_quarters',
    ]);
    expect(trace.lines.map((line) => line.sourceIds)).toEqual([
      ['object:object:tall-strip'], ['object:object:tall-strip'],
      ['object:object:tall-strip'], ['object:object:tall-strip'],
    ]);
  });

  it('COVER-CORNER-TIE breaks a tie between equally protective source corners by row before column', () => {
    // Board 5 x 5. S = (0,0), T = (3,3), a wall at W = (1,1) on the diagonal between them.
    // Target corners (3,3) (4,3) (3,4) (4,4).
    //   Corner (0,0): ->(3,3) y = x runs through W's interior; ->(4,3) y = 3x/4 is in W for
    //     x in (4/3,2); ->(3,4) is its mirror image; ->(4,4) y = x. All four sight-blocked: Total.
    //   Corner (1,0): ->(3,3) y = 3(x-1)/2 is in W for x in (5/3,2): total. ->(4,3) y = x-1 passes
    //     the grid corners (2,1) and (3,2): cells (1,0) (2,1) (3,2), none. ->(3,4) y = 2(x-1) and
    //     ->(4,4) y = 4(x-1)/3 both enter W: total. Lines total, none, total, total: three
    //     obstructed, strongest Total: Three-Quarters.
    //   Corner (0,1): the mirror image of (1,0) across y = x: total, total, none, total: Three-Quarters.
    //   Corner (1,1) is W's own corner; every line leaves it through W: Total.
    // (1,0) and (0,1) tie at Three-Quarters. Row before column chooses (1,0), in row 0; column
    // before row would choose (0,1). The verdict is the same either way; the trace is not.
    const actor = playerProfile('corner-tie-bystander');
    const state = createEncounter({
      bounds: { columns: 5, rows: 5 }, combatants: [actor], tokens: [placedToken(actor, 4, 0)],
      blockedCells: [{ column: 1, row: 1 }],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
    expect(trace).toMatchObject({
      sourceCorner: { column: 1, row: 0 }, tier: 'three_quarters', blocksSight: false,
      sourceIds: ['blocked:1,1'], firstBlockingCell: null,
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['total', 'none', 'total', 'total']);
    expect(terrainLineVerdict(state, { column: 0, row: 0 }, { column: 3, row: 3 })).toEqual({
      sourceCell: { column: 0, row: 0 }, targetCell: { column: 3, row: 3 },
      tier: 'three_quarters', blocksSight: false, sourceIds: ['blocked:1,1'],
    });
  });

  it('COVER-VERDICT-STRONGEST-ONLY names only the strongest line tier\'s sources, not a weaker creature on another line', () => {
    // Board 6 x 4. Fighter at S = (0,0), goblin at T = (4,2); an ogre (living, Half Cover) at (2,0) and
    // an arrow slit (three-quarters) at (2,2). Target corners (4,2) (5,2) (4,3) (5,3).
    //   Corner (0,0): ->(4,2) y = x/2 passes the grid corner (2,1): cells (1,0) (2,1) (3,1), nothing.
    //     ->(5,2) y = 2x/5, column 2 at y in (0.8,1.2): (2,0) the ogre and (2,1): half.
    //     ->(4,3) y = 3x/4, column 2 at y in (1.5,2.25): (2,1) and (2,2) the slit: three-quarters.
    //     ->(5,3) y = 3x/5, column 2 at y in (1.2,1.8): (2,1) only; column 3 (3,1) (3,2); nothing.
    //   Two obstructed lines: Half; the strongest line is three-quarters, so the named source is the
    //   slit alone. Corner (0,0) is first in row-major order and has the lowest possible nonzero tier;
    //   the other corners each have an obstructed line ((1,0)->(5,2) y = (x-1)/2 crosses the ogre;
    //   (0,1)->(4,3) y = 1+x/2 and (1,1)->(4,3) y = 1+2(x-1)/3 cross the slit), so none is clear.
    const fighter = playerProfile('strongest-only-fighter');
    const goblin = monsterProfile('strongest-only-goblin');
    const ogre = monsterProfile('strongest-only-ogre');
    const state = createEncounter({
      bounds: { columns: 6, rows: 4 },
      combatants: [fighter, goblin, ogre],
      tokens: [placedToken(fighter, 0, 0), placedToken(goblin, 4, 2), placedToken(ogre, 2, 0)],
      worldObjects: [feature('slit', [{ column: 2, row: 2 }], 'three_quarters_cover')],
    });
    expect(coverBetweenCombatants(state, fighter.id, goblin.id)).toEqual({
      tier: 'half', sourceIds: ['object:object:slit'],
    });
    expect(combatantLineVerdict(state, fighter.id, goblin.id)).toEqual({
      sourceCell: { column: 0, row: 0 }, targetCell: { column: 4, row: 2 },
      tier: 'half', blocksSight: false, sourceIds: ['object:object:slit'],
    });
    const trace = traceCombatantLine(state, fighter.id, goblin.id);
    expect(trace).toMatchObject({ sourceCorner: { column: 0, row: 0 }, tier: 'half', sourceIds: ['object:object:slit'] });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'half', 'three_quarters', 'none']);
    expect(trace.lines.map((line) => line.sourceIds)).toEqual([
      [], [`creature:${ogre.id}`], ['object:object:slit'], [],
    ]);
  });

  it('COVER-RAY-CELLS visits the cells crossed by all sixteen corner rays, not only the first source corner\'s', () => {
    // S = (0,0), T = (2,1). Source corners (0,0) (1,0) (0,1) (1,1); target corners (2,1) (3,1) (2,2) (3,2).
    //   From (0,0): ->(2,1) y = x/2: (0,0) (1,0). ->(3,1) y = x/3: (0,0) (1,0) (2,0). ->(2,2) y = x passes the
    //     grid corner (1,1): (0,0) (1,1). ->(3,2) y = 2x/3: (0,0) (1,0) (1,1) (2,1).
    //   From (1,0): ->(2,1) (1,0). ->(3,1) (1,0) (2,0). ->(2,2) y = 2(x-1): (1,0) (1,1). ->(3,2) y = x-1 passes
    //     the grid corner (2,1): (1,0) (2,1).
    //   From (0,1): ->(2,1) and ->(3,1) run along y = 1: none. ->(2,2) y = 1+x/2: (0,1) (1,1).
    //     ->(3,2) y = 1+x/3: (0,1) (1,1) (2,1).
    //   From (1,1): ->(2,1) and ->(3,1): none. ->(2,2) (1,1). ->(3,2) y = 1+(x-1)/2: (1,1) (2,1).
    // (0,1) is crossed only by the bottom-left corner's rays: a walk of the first corner alone misses it.
    const key = (column: number, row: number) => `${String(column)},${String(row)}`;
    const visited = new Set<string>();
    visitCornerRayCells([{ column: 0, row: 0 }], [{ column: 2, row: 1 }], (column, row) => visited.add(key(column, row)));
    expect([...visited].sort()).toEqual(['0,0', '0,1', '1,0', '1,1', '2,0', '2,1']);

    // The same set, for single cells and 2 x 2 spaces in a window, as the union over the sixteen outer-corner
    // pairs of the cells whose open interior the ray crosses (the slab test, not the walk).
    const window: GridCell[] = [];
    for (let row = -1; row <= 6; row += 1) for (let index = -1; index <= 6; index += 1) window.push({ column: index, row });
    const spaces: GridCell[][] = [];
    for (let row = 0; row <= 3; row += 1) {
      for (let index = 0; index <= 3; index += 1) {
        spaces.push([{ column: index, row }]);
        if (row <= 2 && index <= 2) {
          spaces.push([
            { column: index, row }, { column: index + 1, row }, { column: index, row: row + 1 }, { column: index + 1, row: row + 1 },
          ]);
        }
      }
    }
    const problems: string[] = [];
    for (const source of spaces) {
      for (const target of spaces) {
        const walkedCells = new Set<string>();
        visitCornerRayCells(source, target, (column, row) => walkedCells.add(key(column, row)));
        const expected = new Set<string>();
        for (const from of outerCorners(source)) {
          for (const to of outerCorners(target)) {
            for (const cell of window) if (cornerLineCrossesCell(from, to, cell)) expected.add(key(cell.column, cell.row));
          }
        }
        if (JSON.stringify([...walkedCells].sort()) !== JSON.stringify([...expected].sort())) {
          problems.push(`${JSON.stringify(source)}->${JSON.stringify(target)}`);
        }
      }
    }
    expect(spaces).toHaveLength(25);
    expect(problems).toEqual([]);
  });

  it('COVER-RAY-CELLS-SOUND a wall off every corner ray changes no line, and one crossed only by another corner\'s rays can', () => {
    // Board 4 x 3. S = (0,0), T = (2,1); walls W1 = (1,0), W2 = (1,1). Rays as in COVER-RAY-CELLS.
    //   Corner (0,0): ->(2,1) W1, ->(3,1) W1, ->(2,2) W2, ->(3,2) W1 W2: four sight-blocked lines, Total.
    //   Corner (1,0): every line starts in W1: Total.
    //   Corner (0,1): ->(2,1), ->(3,1) none; ->(2,2) and ->(3,2) cross W2: two lines, Half.
    //   Corner (1,1): the same two lines through W2: Half. The tie goes to (0,1): Half, named W2.
    // A third wall at (0,1) lies on (0,1)'s two obstructed lines only: still Half from (0,1), which wins the
    // tie, now naming both walls. The los_cover_v1 generator re-traces a line only when a changed cell lies
    // on visitCornerRayCells, so every cell whose wall changes the line must be on it.
    const actor = playerProfile('ray-cells-bystander');
    const base = createEncounter({
      bounds: { columns: 4, rows: 3 }, combatants: [actor], tokens: [placedToken(actor, 3, 2)],
      blockedCells: [{ column: 1, row: 0 }, { column: 1, row: 1 }],
    });
    const source = { column: 0, row: 0 };
    const target = { column: 2, row: 1 };
    const key = (cell: GridCell) => `${String(cell.column)},${String(cell.row)}`;
    expect(terrainLineVerdict(base, source, target)).toEqual({
      sourceCell: source, targetCell: target, tier: 'half', blocksSight: false, sourceIds: ['blocked:1,1'],
    });
    const rayCells = new Set<string>();
    visitCornerRayCells([source], [target], (column, row) => rayCells.add(key({ column, row })));
    const baseTrace = JSON.stringify(traceTerrainLine(base, source, target));
    const changing: string[] = [];
    for (let row = 0; row < 3; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        const cell = { column: index, row };
        if ([source, target, ...base.blockedCells].some((taken) => key(taken) === key(cell))) continue;
        const walled = { ...base, blockedCells: [...base.blockedCells, cell] };
        if (JSON.stringify(traceTerrainLine(walled, source, target)) !== baseTrace) changing.push(key(cell));
      }
    }
    expect(changing).toContain('0,1');
    expect(changing.filter((cell) => !rayCells.has(cell))).toEqual([]);
    expect(terrainLineVerdict({ ...base, blockedCells: [...base.blockedCells, { column: 0, row: 1 }] }, source, target))
      .toEqual({
        sourceCell: source, targetCell: target, tier: 'half', blocksSight: false,
        sourceIds: ['blocked:0,1', 'blocked:1,1'],
      });
  });
});

function syntheticState(): EncounterState {
  const fighter = playerProfile('diff-fighter');
  const archer = playerProfile('diff-archer');
  const goblin = monsterProfile('diff-goblin');
  const baseOgre = monsterProfile('diff-ogre');
  const ogre = { ...baseOgre, rules: { ...baseOgre.rules, sizeCategory: 'Large' as const } };
  const baseGiant = monsterProfile('diff-giant');
  const giant = { ...baseGiant, rules: { ...baseGiant.rules, sizeCategory: 'Huge' as const } };
  return createEncounter({
    bounds: { columns: 12, rows: 10 },
    combatants: [fighter, archer, goblin, ogre, giant],
    tokens: [
      placedToken(fighter, 0, 0), placedToken(archer, 1, 8), placedToken(goblin, 10, 1),
      placedToken(ogre, 5, 3), placedToken(giant, 8, 6),
    ],
    blockedCells: [{ column: 3, row: 1 }, { column: 3, row: 2 }, { column: 7, row: 8 }, { column: 10, row: 4 }],
    worldObjects: [
      feature('diff-low', [{ column: 2, row: 5 }, { column: 3, row: 5 }], 'half_cover'),
      feature('diff-slit', [{ column: 6, row: 1 }], 'three_quarters_cover'),
      feature('diff-wall', [{ column: 4, row: 7 }, { column: 5, row: 7 }], 'wall'),
      feature('diff-open', [{ column: 9, row: 2 }], 'open'),
    ],
  });
}

function outcome(run: () => unknown): string {
  try {
    return JSON.stringify(run());
  } catch (error) {
    return `THROW ${error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)}`;
  }
}

interface VerdictFields {
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly tier: string;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
}

function verdictFields(line: VerdictFields): VerdictFields {
  return {
    sourceCell: line.sourceCell,
    targetCell: line.targetCell,
    tier: line.tier,
    blocksSight: line.blocksSight,
    sourceIds: line.sourceIds,
  };
}

/** The same encounter with one creature's token really standing at the anchor. */
function withTokenAt(state: EncounterState, mover: CombatantId, anchor: GridCell): EncounterState {
  return {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === mover ? { ...token, position: { ...anchor } } : token),
  };
}

function placed(state: EncounterState): CombatantId[] {
  return state.combatants
    .filter((combatant) => state.tokens.some((token) => token.combatantId === combatant.profile.id))
    .map((combatant) => combatant.profile.id);
}

/** Every mismatch between the frozen reference and the candidate, as `label` strings. */
function differential(label: string, state: EncounterState): { compared: number; mismatches: string[] } {
  let compared = 0;
  const mismatches: string[] = [];
  const check = (name: string, expected: string, actual: string) => {
    compared += 1;
    if (expected !== actual) mismatches.push(`${label} ${name}`);
  };
  const ids = placed(state);
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      check(`${String(a)}->${String(b)} trace`,
        outcome(() => reference.traceCombatantLine(state, a, b)),
        outcome(() => traceCombatantLine(state, a, b)));
      check(`${String(a)}->${String(b)} cover`,
        outcome(() => reference.coverBetweenCombatants(state, a, b)),
        outcome(() => coverBetweenCombatants(state, a, b)));
      check(`${String(a)}->${String(b)} verdict`,
        outcome(() => verdictFields(reference.traceCombatantLine(state, a, b))),
        outcome(() => verdictFields(combatantLineVerdict(state, a, b))));
    }
  }
  const [first, mover] = ids;
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let index = 0; index < state.bounds.columns; index += 1) {
      const cell = { column: index, row };
      if (first !== undefined) {
        check(`${String(first)}->${String(index)},${String(row)} trace`,
          outcome(() => reference.traceCombatantLineToCells(state, first, [cell])),
          outcome(() => traceCombatantLineToCells(state, first, [cell])));
        check(`${String(first)}->${String(index)},${String(row)} verdict`,
          outcome(() => verdictFields(reference.traceCombatantLineToCells(state, first, [cell]))),
          outcome(() => verdictFields(combatantLineVerdictToCells(state, first, [cell]))));
      }
      if (mover === undefined) continue;
      const options = { sourceAnchor: cell };
      const moved = withTokenAt(state, mover, cell);
      for (const target of ids) {
        if (target === mover) continue;
        check(`${String(mover)}@${String(index)},${String(row)}->${String(target)} trace`,
          outcome(() => reference.traceCombatantLine(moved, mover, target)),
          outcome(() => traceCombatantLine(state, mover, target, options)));
        check(`${String(mover)}@${String(index)},${String(row)}->${String(target)} verdict`,
          outcome(() => verdictFields(reference.traceCombatantLine(moved, mover, target))),
          outcome(() => verdictFields(combatantLineVerdict(state, mover, target, options))));
      }
      // One bare cell per anchor: the anchor's mirror image across the board's centre.
      const mirror = [{ column: state.bounds.columns - 1 - index, row: state.bounds.rows - 1 - row }];
      check(`${String(mover)}@${String(index)},${String(row)}->mirror trace`,
        outcome(() => reference.traceCombatantLineToCells(moved, mover, mirror)),
        outcome(() => traceCombatantLineToCells(state, mover, mirror, options)));
      check(`${String(mover)}@${String(index)},${String(row)}->mirror verdict`,
        outcome(() => verdictFields(reference.traceCombatantLineToCells(moved, mover, mirror))),
        outcome(() => verdictFields(combatantLineVerdictToCells(state, mover, mirror, options))));
    }
  }
  for (let index = 0; index < 120; index += 1) {
    // A fixed spread of cell pairs across the board (a multiplicative walk, no RNG state).
    const size = state.bounds.columns * state.bounds.rows;
    const fromIndex = (index * 37 + 11) % size;
    const toIndex = (index * 53 + 29) % size;
    const from = { column: fromIndex % state.bounds.columns, row: Math.floor(fromIndex / state.bounds.columns) };
    const to = { column: toIndex % state.bounds.columns, row: Math.floor(toIndex / state.bounds.columns) };
    check(`terrain ${String(index)} trace`,
      outcome(() => reference.traceTerrainLine(state, from, to)),
      outcome(() => traceTerrainLine(state, from, to)));
    check(`terrain ${String(index)} verdict`,
      outcome(() => verdictFields(reference.traceTerrainLine(state, from, to))),
      outcome(() => verdictFields(terrainLineVerdict(state, from, to))));
    check(`objects ${String(index)}`,
      outcome(() => reference.coverTierBetweenObjects(state.worldObjects, from, to)),
      outcome(() => coverTierBetweenObjects(state.worldObjects, from, to)));
  }
  if (first !== undefined) {
    check('empty target list', outcome(() => reference.traceCombatantLineToCells(state, first, [])),
      outcome(() => traceCombatantLineToCells(state, first, [])));
  }
  return { compared, mismatches };
}

describe('PERF-02 cover6 bounded differential against the frozen pre-walk cover code', () => {
  it('COVER-DIFFERENTIAL-RASTER rasterizes every lattice segment of a window like the reference', () => {
    const cells: GridCell[] = [];
    for (let row = -3; row <= 7; row += 1) for (let index = -3; index <= 7; index += 1) cells.push({ column: index, row });
    const mismatches: string[] = [];
    let compared = 0;
    for (let fromRow = -2; fromRow <= 6; fromRow += 1) {
      for (let fromColumn = -2; fromColumn <= 6; fromColumn += 1) {
        for (let toRow = -2; toRow <= 6; toRow += 1) {
          for (let toColumn = -2; toColumn <= 6; toColumn += 1) {
            const from = { column: fromColumn, row: fromRow };
            const to = { column: toColumn, row: toRow };
            compared += 1;
            if (JSON.stringify(reference.rasterizeCornerLine(from, to, cells)) !==
              JSON.stringify(rasterizeCornerLine(from, to, cells))) mismatches.push(`${JSON.stringify(from)}->${JSON.stringify(to)}`);
          }
        }
      }
    }
    expect(compared).toBe(6_561);
    expect(mismatches).toEqual([]);
  });

  it('COVER-DIFFERENTIAL-STATES traces, verdicts and cover equal the reference on real and synthetic encounters', async () => {
    const states: [string, EncounterState][] = [
      ['synthetic large and huge', syntheticState()],
      ['los-cover 5762201', await loadArenaFixture('tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json')],
      ['brutal-b 6206001', await loadArenaFixture('tests/fixtures/arena-basis-brutal-b/seed-6206001.json')],
    ];
    const results = states.map(([label, state]) => differential(label, state));
    expect(results.flatMap((result) => result.mismatches)).toEqual([]);
    expect(results.map((result) => result.compared > 1_000)).toEqual([true, true, true]);
  });
});
