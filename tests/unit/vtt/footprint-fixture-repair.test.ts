import { describe, expect, it } from 'vitest';
import {
  FOOTPRINT_FIXTURE_MOVES,
  FOOTPRINT_REPAIRED_FIXTURE_PATHS,
  withFootprintMoves,
  type FootprintFixtureMove,
  type FootprintRepairedFixturePath,
} from '../../helpers/footprint-fixture-moves';
import { declareTestInputs } from '../../helpers/test-inputs';

// FOOTPRINT W15b (owner rulings D900, D904 Q1). The eight repaired fixtures are checked against a TEST-LOCAL
// restatement of the repair rule that imports no engine code, so the repair and its check share nothing:
//   - a body is its anchor's side x side square, north-west anchored; Tiny/Small/Medium 1, Large 2, Huge 3,
//     Gargantuan 4 (decisions.md D511; SRD 5.2.1 Creature Size table);
//   - a body is legal when every square is on the grid, no square is movement-blocked (a blocked cell; a world
//     object with blocking.movement or three_quarters/total cover; a movement region whose entry is 'blocked'),
//     and it shares no square with another non-dead token's body;
//   - rule C (D904): a token legal against every other token stays; every other token, in token order, keeps its
//     anchor when that is legal against the tokens already fixed, else takes the first legal anchor by Chebyshev
//     distance from its old anchor, then row, then column (D514).

const inputs = declareTestInputs({ fixtures: [...FOOTPRINT_REPAIRED_FIXTURE_PATHS] });

interface Cell { readonly column: number; readonly row: number }
interface JsonState {
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly blockedCells?: readonly Cell[];
  readonly worldObjects?: readonly {
    readonly blocking?: { readonly movement?: boolean; readonly cover?: string };
    readonly footprint?: readonly Cell[];
  }[];
  readonly environment?: { readonly movementRegions?: readonly { readonly entry?: string; readonly cells?: readonly Cell[] }[] };
  readonly effects?: readonly { readonly payload?: { readonly kind?: string } }[];
  readonly combatants: readonly {
    readonly life?: string;
    readonly profile: { readonly id: string; readonly kind: string; readonly statblockId?: string; readonly rules: { readonly sizeCategory?: string } };
  }[];
  readonly tokens: readonly { readonly combatantId: string; readonly position: Cell; readonly placementMode?: unknown }[];
}

const SIDE: Readonly<Record<string, number>> = { Tiny: 1, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 };
// Legacy fixture rows without a sizeCategory: the three PCs and SRD stat blocks whose size line reads
// "Medium or Small Humanoid" (srd-5.2.1.txt: Bandit, Priest, Priest Acolyte, Spy). All are one square.
const LEGACY_ONE_SQUARE_STATBLOCKS = new Set(['statblock:bandit', 'statblock:priest', 'statblock:priest-acolyte', 'statblock:spy']);

function state(bytes: string): JsonState {
  return (JSON.parse(bytes) as { readonly encounter: { readonly state: JsonState } }).encounter.state;
}

function sideOf(current: JsonState, combatantId: string): number {
  const combatant = current.combatants.find((entry) => entry.profile.id === combatantId);
  if (combatant === undefined) throw new Error(`${combatantId} has no combatant.`);
  const size = combatant.profile.rules.sizeCategory;
  if (size !== undefined) {
    const side = SIDE[size];
    if (side === undefined) throw new Error(`${combatantId} has an unknown size ${size}.`);
    return side;
  }
  if (combatant.profile.kind === 'player_character') return 1;
  if (LEGACY_ONE_SQUARE_STATBLOCKS.has(combatant.profile.statblockId ?? '')) return 1;
  throw new Error(`${combatantId} has no size this oracle can state.`);
}

function squares(anchor: Cell, side: number): readonly string[] {
  const keys: string[] = [];
  for (let row = anchor.row; row < anchor.row + side; row += 1) {
    for (let column = anchor.column; column < anchor.column + side; column += 1) keys.push(`${String(column)},${String(row)}`);
  }
  return keys;
}

function blockedSquares(current: JsonState): ReadonlySet<string> {
  const blocked = new Set((current.blockedCells ?? []).map((cell) => `${String(cell.column)},${String(cell.row)}`));
  for (const object of current.worldObjects ?? []) {
    const blocking = object.blocking ?? {};
    if (blocking.movement === true || blocking.cover === 'three_quarters' || blocking.cover === 'total') {
      for (const cell of object.footprint ?? []) blocked.add(`${String(cell.column)},${String(cell.row)}`);
    }
  }
  for (const region of current.environment?.movementRegions ?? []) {
    if (region.entry === 'blocked') for (const cell of region.cells ?? []) blocked.add(`${String(cell.column)},${String(cell.row)}`);
  }
  return blocked;
}

function legal(current: JsonState, anchor: Cell, side: number, others: readonly ReadonlySet<string>[]): boolean {
  const { columns, rows } = current.bounds;
  if (anchor.column < 0 || anchor.row < 0 || anchor.column + side > columns || anchor.row + side > rows) return false;
  const blocked = blockedSquares(current);
  return squares(anchor, side).every((square) => !blocked.has(square) && others.every((body) => !body.has(square)));
}

interface Body { readonly combatantId: string; readonly anchor: Cell; readonly side: number; readonly living: boolean }

function bodies(current: JsonState): readonly Body[] {
  // The oracle states only what these fixtures need: no size-altering effect, no placement mode.
  expect(current.effects?.some((effect) => effect.payload?.kind === 'size_alteration') ?? false).toBe(false);
  return current.tokens.map((token) => {
    expect(token.placementMode).toBeUndefined();
    return {
      combatantId: token.combatantId,
      anchor: token.position,
      side: sideOf(current, token.combatantId),
      living: current.combatants.find((entry) => entry.profile.id === token.combatantId)?.life !== 'dead',
    };
  });
}

/** Rule C over the pre-repair state: the moves it makes, in token order. */
function ruleC(current: JsonState): readonly FootprintFixtureMove[] {
  const all = bodies(current);
  const bodySquares = (body: Body, anchor: Cell = body.anchor): ReadonlySet<string> => new Set(squares(anchor, body.side));
  const occupants = (except: Body, from: readonly Body[]): readonly ReadonlySet<string>[] =>
    from.filter((body) => body !== except && body.living).map((body) => bodySquares(body));
  const stays = new Set(all.filter((body) => legal(current, body.anchor, body.side, occupants(body, all))));
  const fixed: Body[] = [...all.filter((body) => stays.has(body))];
  const moves: FootprintFixtureMove[] = [];
  for (const body of all) {
    if (stays.has(body)) continue;
    const against = occupants(body, fixed);
    if (legal(current, body.anchor, body.side, against)) {
      fixed.push(body);
      continue;
    }
    const candidates: Cell[] = [];
    for (let row = 0; row < current.bounds.rows; row += 1) {
      for (let column = 0; column < current.bounds.columns; column += 1) candidates.push({ column, row });
    }
    const chebyshev = (cell: Cell): number =>
      Math.max(Math.abs(cell.column - body.anchor.column), Math.abs(cell.row - body.anchor.row));
    candidates.sort((left, right) => chebyshev(left) - chebyshev(right) || left.row - right.row || left.column - right.column);
    const to = candidates.find((anchor) => legal(current, anchor, body.side, against));
    if (to === undefined) throw new Error(`${body.combatantId} has no legal anchor.`);
    fixed.push({ ...body, anchor: to });
    moves.push({
      combatantId: body.combatantId as FootprintFixtureMove['combatantId'],
      from: { column: body.anchor.column, row: body.anchor.row },
      to: { column: to.column, row: to.row },
    });
  }
  return moves;
}

describe('FOOTPRINT fixture repair (W15b)', () => {
  it.each(FOOTPRINT_REPAIRED_FIXTURE_PATHS)('%s holds the literal repaired anchors, every body is legal, and each move is the first D514-legal anchor', (path: FootprintRepairedFixturePath) => {
    const bytes = inputs.fixtures.readText(path);
    const repaired = state(bytes);
    const moves = FOOTPRINT_FIXTURE_MOVES[path];
    for (const move of moves) {
      expect(repaired.tokens.find((token) => token.combatantId === move.combatantId)?.position, `${move.combatantId} literal anchor`)
        .toEqual(move.to);
    }

    // Every body of the repaired start is on the grid, off every movement-blocked square, and alone.
    const repairedBodies = bodies(repaired);
    for (const body of repairedBodies) {
      const others = repairedBodies.filter((other) => other !== body && other.living).map((other) => new Set(squares(other.anchor, other.side)));
      expect(legal(repaired, body.anchor, body.side, others), `${path} ${body.combatantId} at ${JSON.stringify(body.anchor)}`).toBe(true);
    }

    // The pre-repair start was illegal, and rule C over it makes exactly the literal moves.
    const before = state(withFootprintMoves(bytes, moves, 'revert'));
    expect(ruleC(before)).toEqual(moves);
  });

  it('the repaired corpus is the 19 problems D904 counted: one overhang and 18 overlapping pairs', () => {
    let overhangs = 0;
    let overlaps = 0;
    for (const path of FOOTPRINT_REPAIRED_FIXTURE_PATHS) {
      const before = state(withFootprintMoves(inputs.fixtures.readText(path), FOOTPRINT_FIXTURE_MOVES[path], 'revert'));
      const all = bodies(before);
      for (const body of all) {
        if (body.anchor.column + body.side > before.bounds.columns || body.anchor.row + body.side > before.bounds.rows) overhangs += 1;
        expect(squares(body.anchor, body.side).some((square) => blockedSquares(before).has(square)), `${path} ${body.combatantId} on a blocked square`)
          .toBe(false);
      }
      for (let left = 0; left < all.length; left += 1) {
        for (let right = left + 1; right < all.length; right += 1) {
          const [first, second] = [all[left], all[right]];
          if (first === undefined || second === undefined || !first.living || !second.living) continue;
          const seen = new Set(squares(first.anchor, first.side));
          if (squares(second.anchor, second.side).some((square) => seen.has(square))) overlaps += 1;
        }
      }
    }
    expect({ overhangs, overlaps }).toEqual({ overhangs: 1, overlaps: 18 });
  });
});
