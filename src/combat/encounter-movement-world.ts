import { combatantsAreAllies } from './allies';
import { combatantConditions, combatantSpace, combatantSpaceAt } from './combat-rules';
import { isIncapacitated } from './conditions';
import type { EncounterCombatantState, EncounterState } from './encounter';
import type { BoardCell, GridCell } from './grid';
import {
  buildMovementBoard,
  cellIndex,
  squareCell,
  squareFits,
  NO_OPENING,
  type CellIndex,
  type FootprintSide,
} from './movement-board';
import type { CellTraversal, MovementWorld } from './movement';
import { persistentAreaContains } from './persistent-areas';
import { feet, type CombatantId } from './values';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';

function ignoresDifficultTerrain(state: EncounterState, id: CombatantId): boolean {
  return state.effects.some((effect) => effect.targets.includes(id) && effect.payload.kind === 'movement_modifier' &&
    'modeGrants' in effect.payload && (effect.payload.difficultTerrainImmunity ||
      effect.payload.modeGrants.some((grant) => grant.mode === 'flying')));
}

/** A living, placed creature whose stationary space other movers must cross or avoid. */
interface Occupant {
  readonly combatant: EncounterCombatantState;
  /** `creatureSizes` ordinal of its actual size. */
  readonly sizeIndex: number;
  readonly tiny: boolean;
}

/** A remembered answer: not yet asked, answered true, answered false. */
const UNKNOWN = 0;
const YES = 1;
const NO = 2;

/** What one mover brings to every step: its footprint, its size and the relations learned so far. */
interface MoverProfile {
  readonly side: FootprintSide;
  /** `creatureSizes` ordinal of the mover's actual size; squeezing does not change it. */
  readonly sizeIndex: number;
  readonly tiny: boolean;
  /** The opening size a squeezed mover needs its whole footprint inside; null when not squeezed. */
  readonly squeezedInto: KnownCreatureSize | null;
  readonly ignoresDifficult: boolean;
  /** Per occupant ordinal, UNKNOWN until first answered without throwing. */
  readonly allied: Int8Array;
  readonly passable: Int8Array;
}

function footprintSide(cells: 1 | 4 | 9 | 16): FootprintSide {
  switch (cells) {
    case 1: return 1;
    case 4: return 2;
    case 9: return 3;
    case 16: return 4;
  }
}

const OUTSIDE_GRID: CellTraversal = Object.freeze({ kind: 'blocked', reason: 'creature footprint is outside the grid' });
const BLOCKED_CELL: CellTraversal = Object.freeze({ kind: 'blocked', reason: 'blocked cell' });
const CREATURE_BLOCKS: CellTraversal = Object.freeze({ kind: 'blocked', reason: 'creature space cannot be traversed' });
const NORMAL_PASS: CellTraversal = Object.freeze({ kind: 'enterable', cost: feet(5), canEnd: false });
const NORMAL_END: CellTraversal = Object.freeze({ kind: 'enterable', cost: feet(5), canEnd: true });
const DIFFICULT_PASS: CellTraversal = Object.freeze({ kind: 'enterable', cost: feet(10), canEnd: false });
const DIFFICULT_END: CellTraversal = Object.freeze({ kind: 'enterable', cost: feet(10), canEnd: true });

const movementWorldCache = new WeakMap<EncounterState, MovementWorld<CombatantId>>();

/**
 * One state-space adapter shared by reducer validation and every path planner, answered
 * from the state's movement board (movement-board.ts).
 *
 * The rules are SRD 5.2.1 "Moving around Other Creatures" and "Difficult Terrain"
 * (docs/srd/full/srd-5.2.1.txt:851, :859-868, :880): a mover may pass through an ally, an
 * Incapacitated creature, a Tiny creature, or a creature two sizes larger or smaller; another
 * creature's space is Difficult Terrain unless that creature is Tiny or an ally; a mover may
 * not willingly end in an occupied space, except that up to four Tiny creatures share one.
 * A creature squeezing through a narrow opening occupies the opening's smaller space and may
 * stand only where one opening sized for that smaller size holds its whole footprint.
 *
 * Every evaluation that can throw (an unknown actor, an ally relation through a broken summon
 * chain, a persistent area anchored to a missing creature) is made in the order the rules
 * above list it, and a throw is never remembered, so a question that throws throws every
 * time. Answers that were computed are remembered per mover or per area, which is sound
 * because a state never changes.
 */
export function encounterMovementWorld(state: EncounterState): MovementWorld<CombatantId> {
  const cached = movementWorldCache.get(state);
  if (cached !== undefined) return cached;

  const combatantsById = new Map(state.combatants.map((combatant) => [combatant.profile.id, combatant] as const));
  const stationarySpaces = new Map(
    state.tokens.map((token) => [token.combatantId, combatantSpace(state, token.combatantId)] as const),
  );
  const occupantCells: (readonly GridCell[])[] = [];
  const occupants: Occupant[] = [];
  for (const token of state.tokens) {
    const combatant = combatantsById.get(token.combatantId);
    const space = stationarySpaces.get(token.combatantId);
    if (combatant === undefined || combatant.life === 'dead' || space === undefined) continue;
    occupantCells.push(space.cells);
    occupants.push({ combatant, sizeIndex: creatureSizes.indexOf(space.actualSize), tiny: space.actualSize === 'Tiny' });
  }
  const ignoresDifficult = new Map(
    state.combatants.map((combatant) => [
      combatant.profile.id,
      ignoresDifficultTerrain(state, combatant.profile.id),
    ] as const),
  );
  const board = buildMovementBoard(state, occupantCells);
  const { blocked, difficult, narrowestOpening, openings, occupantStart, occupantOrdinals } = board;
  const difficultAreas = state.persistentAreas.filter((area) => area.difficultTerrain);
  const areaContains = difficultAreas.map(() => new Int8Array(board.columns * board.rows));

  const profiles = new Map<CombatantId, MoverProfile>();
  const profile = (actorId: CombatantId, anchor: BoardCell): MoverProfile => {
    const known = profiles.get(actorId);
    if (known !== undefined) return known;
    const space = combatantSpaceAt(state, actorId, anchor);
    const created: MoverProfile = {
      side: footprintSide(space.cells.length),
      sizeIndex: creatureSizes.indexOf(space.actualSize),
      tiny: space.actualSize === 'Tiny',
      squeezedInto: space.mode.kind === 'squeezed' ? space.mode.pair.sizedFor : null,
      ignoresDifficult: ignoresDifficult.get(actorId) === true,
      allied: new Int8Array(occupants.length),
      passable: new Int8Array(occupants.length),
    };
    profiles.set(actorId, created);
    return created;
  };
  const allied = (actorId: CombatantId, mover: MoverProfile, ordinal: number): boolean => {
    const known = mover.allied[ordinal];
    if (known !== UNKNOWN) return known === YES;
    const value = combatantsAreAllies(state, actorId, (occupants[ordinal] as Occupant).combatant.profile.id);
    mover.allied[ordinal] = value ? YES : NO;
    return value;
  };
  const passable = (actorId: CombatantId, mover: MoverProfile, ordinal: number): boolean => {
    const known = mover.passable[ordinal];
    if (known !== UNKNOWN) return known === YES;
    const occupant = occupants[ordinal] as Occupant;
    const value = allied(actorId, mover, ordinal) ||
      isIncapacitated(combatantConditions(state, occupant.combatant.profile.id)) ||
      occupant.tiny ||
      Math.abs(mover.sizeIndex - occupant.sizeIndex) >= 2;
    mover.passable[ordinal] = value ? YES : NO;
    return value;
  };
  const areaAnchor = (area: EncounterState['persistentAreas'][number]): GridCell | null => {
    const origin = area.origin;
    return origin.kind === 'anchored'
      ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
      : origin.kind === 'anchored_to_object'
        ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
        : null;
  };
  const insideArea = (area: number, index: CellIndex): boolean => {
    const known = areaContains[area] as Int8Array;
    const remembered = known[index];
    if (remembered !== UNKNOWN) return remembered === YES;
    const current = difficultAreas[area] as EncounterState['persistentAreas'][number];
    const cell: GridCell = { column: index % board.columns, row: Math.floor(index / board.columns) };
    const value = persistentAreaContains(current, cell, areaAnchor(current), state);
    known[index] = value ? YES : NO;
    return value;
  };
  /** Normal placement: no footprint cell lies in an opening sized for a smaller creature. */
  const clearOfSmallerOpenings = (mover: MoverProfile, anchor: CellIndex): boolean => {
    for (let row = 0; row < mover.side; row += 1) {
      for (let column = 0; column < mover.side; column += 1) {
        if ((narrowestOpening[squareCell(board, anchor, column, row)] ?? NO_OPENING) < mover.sizeIndex) return false;
      }
    }
    return true;
  };
  /** Squeezed placement: one opening sized for `sizedFor` holds the whole footprint. */
  const insideOneOpening = (mover: MoverProfile, sizedFor: KnownCreatureSize, anchor: CellIndex): boolean =>
    openings.some((opening) => {
      if (opening.sizedFor !== sizedFor) return false;
      for (let row = 0; row < mover.side; row += 1) {
        for (let column = 0; column < mover.side; column += 1) {
          if (opening.covers[squareCell(board, anchor, column, row)] !== 1) return false;
        }
      }
      return true;
    });

  // Scratch for one traversal: the overlapping occupants in token order, deduplicated by a
  // generation stamp, and the newly entered cells in row-major order. Nothing a traversal
  // calls reaches back into this world, so one set of buffers serves every call.
  const overlapping = new Int32Array(Math.max(1, occupants.length));
  const stamp = new Int32Array(Math.max(1, occupants.length));
  let generation = 0;
  const entered = new Int32Array(16);

  const world: MovementWorld<CombatantId> = {
    bounds: state.bounds,
    occupiedCells: (actorId, anchor) => combatantSpaceAt(state, actorId, anchor).cells,
    canTraverseStep: (actorId, _from, to) => {
      const mover = profile(actorId, to);
      if (!squareFits(board, to, mover.side)) return false;
      const anchor = cellIndex(board, to);
      return mover.squeezedInto === null
        ? clearOfSmallerOpenings(mover, anchor)
        : insideOneOpening(mover, mover.squeezedInto, anchor);
    },
    traversal: (actorId, from, to) => {
      const mover = profile(actorId, from);
      const side = mover.side;
      if (!squareFits(board, to, side)) return OUTSIDE_GRID;
      const anchor = cellIndex(board, to);

      let enteredCount = 0;
      for (let row = 0; row < side; row += 1) {
        const boardRow = to.row + row;
        const rowInSource = boardRow >= from.row && boardRow < from.row + side;
        for (let column = 0; column < side; column += 1) {
          const index = squareCell(board, anchor, column, row);
          if (blocked[index] === 1) return BLOCKED_CELL;
          const boardColumn = to.column + column;
          if (!rowInSource || boardColumn < from.column || boardColumn >= from.column + side) {
            entered[enteredCount] = index;
            enteredCount += 1;
          }
        }
      }

      if (generation === 0x3fffffff) {
        stamp.fill(0);
        generation = 0;
      }
      generation += 1;
      let overlapCount = 0;
      for (let row = 0; row < side; row += 1) {
        for (let column = 0; column < side; column += 1) {
          const index = squareCell(board, anchor, column, row);
          const end = occupantStart[index + 1] ?? 0;
          for (let slot = occupantStart[index] ?? 0; slot < end; slot += 1) {
            const ordinal = occupantOrdinals[slot] ?? 0;
            if (stamp[ordinal] === generation) continue;
            stamp[ordinal] = generation;
            if ((occupants[ordinal] as Occupant).combatant.profile.id === actorId) continue;
            let insert = overlapCount;
            while (insert > 0 && (overlapping[insert - 1] ?? 0) > ordinal) {
              overlapping[insert] = overlapping[insert - 1] ?? 0;
              insert -= 1;
            }
            overlapping[insert] = ordinal;
            overlapCount += 1;
          }
        }
      }

      for (let hit = 0; hit < overlapCount; hit += 1) {
        if (!passable(actorId, mover, overlapping[hit] ?? 0)) return CREATURE_BLOCKS;
      }

      // Every overlapping occupant's alliance is known by now (passable asks it first), so
      // skipping these checks for a mover that ignores difficult terrain skips no throw.
      let difficultStep = false;
      if (!mover.ignoresDifficult) {
        for (let hit = 0; hit < overlapCount && !difficultStep; hit += 1) {
          const ordinal = overlapping[hit] ?? 0;
          difficultStep = !allied(actorId, mover, ordinal) && !(occupants[ordinal] as Occupant).tiny;
        }
        for (let cell = 0; cell < enteredCount && !difficultStep; cell += 1) {
          difficultStep = difficult[entered[cell] ?? 0] === 1;
        }
        for (let area = 0; area < difficultAreas.length && !difficultStep; area += 1) {
          for (let cell = 0; cell < enteredCount && !difficultStep; cell += 1) {
            difficultStep = insideArea(area, (entered[cell] ?? 0) as CellIndex);
          }
        }
      }

      let canEnd = overlapCount === 0;
      if (!canEnd && mover.tiny && overlapCount < 4) {
        canEnd = true;
        for (let hit = 0; hit < overlapCount; hit += 1) {
          if (!(occupants[overlapping[hit] ?? 0] as Occupant).tiny) {
            canEnd = false;
            break;
          }
        }
      }
      return difficultStep
        ? canEnd ? DIFFICULT_END : DIFFICULT_PASS
        : canEnd ? NORMAL_END : NORMAL_PASS;
    },
  };
  movementWorldCache.set(state, world);
  return world;
}
