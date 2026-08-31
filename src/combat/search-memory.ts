import type { GridBounds, GridCell } from './grid';
import { gridDistance, isCellInside } from './grid';
import { feet, type CombatantId, type Feet } from './values';

export const SEARCH_MEMORY_POLICY = 'search-memory-v1' as const;
export const SEARCH_MEMORY_DURATION_ROUNDS = 3 as const;
export const SEARCH_REGION_EXPANSION_PER_ROUND = feet(5);

export const SEARCH_MEMORY_RULE_CITATIONS = {
  unseenTarget: 'docs/srd/full/srd-5.2.1.txt:884-889',
  ready: 'docs/srd/full/srd-5.2.1.txt:11997-12015',
  search: 'docs/srd/full/srd-5.2.1.txt:12016-12027',
} as const;

export type SearchMemoryCause = 'hiding' | 'invisibility' | 'obscurement';

export interface SearchMemoryExpiry {
  readonly kind: 'start_of_round';
  readonly round: number;
}

export interface SuspicionRegion {
  readonly kind: 'grid_radius';
  readonly center: GridCell;
  readonly radius: Feet;
  readonly cells: readonly GridCell[];
}

export type SearchEscalationOption =
  | {
      readonly kind: 'move_and_search';
      readonly target: CombatantId;
      readonly searchCitation: typeof SEARCH_MEMORY_RULE_CITATIONS.search;
    }
  | {
      readonly kind: 'ready_action';
      readonly target: CombatantId;
      readonly readyCitation: typeof SEARCH_MEMORY_RULE_CITATIONS.ready;
    }
  | {
      readonly kind: 'attack_suspected_square';
      readonly target: CombatantId;
      readonly cells: readonly GridCell[];
      readonly rollMode: 'disadvantage';
      readonly unseenTargetCitation: typeof SEARCH_MEMORY_RULE_CITATIONS.unseenTarget;
    }
  | {
      readonly kind: 'area_effect_over_region';
      readonly target: CombatantId;
      readonly cells: readonly GridCell[];
    };

export interface SearchMemory {
  readonly policy: typeof SEARCH_MEMORY_POLICY;
  readonly observer: CombatantId;
  readonly target: CombatantId;
  readonly cause: SearchMemoryCause;
  readonly lastKnownPosition: GridCell;
  readonly lostAtRound: number;
  readonly lastExpandedRound: number;
  readonly expires: SearchMemoryExpiry;
  readonly suspicion: SuspicionRegion;
  readonly legalOptions: readonly SearchEscalationOption[];
}

function orderedCells(cells: readonly GridCell[]): readonly GridCell[] {
  return [...cells].sort((left, right) =>
    left.row - right.row || left.column - right.column);
}

/** A clipped Chebyshev radius matches the engine's eight-way 5-foot grid distance. */
export function suspicionCells(
  bounds: GridBounds,
  center: GridCell,
  radius: Feet,
): readonly GridCell[] {
  if (!isCellInside(bounds, center)) throw new RangeError('A suspicion-region center must be on the grid.');
  const cells: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) {
      const candidate = { column, row };
      if (gridDistance(center, candidate) <= radius) cells.push(candidate);
    }
  }
  return orderedCells(cells);
}

function legalOptions(target: CombatantId, cells: readonly GridCell[]): readonly SearchEscalationOption[] {
  return [
    { kind: 'move_and_search', target, searchCitation: SEARCH_MEMORY_RULE_CITATIONS.search },
    { kind: 'ready_action', target, readyCitation: SEARCH_MEMORY_RULE_CITATIONS.ready },
    {
      kind: 'attack_suspected_square',
      target,
      cells,
      rollMode: 'disadvantage',
      unseenTargetCitation: SEARCH_MEMORY_RULE_CITATIONS.unseenTarget,
    },
    { kind: 'area_effect_over_region', target, cells },
  ];
}

export function createSearchMemory(input: {
  readonly bounds: GridBounds;
  readonly observer: CombatantId;
  readonly target: CombatantId;
  readonly cause: SearchMemoryCause;
  readonly lastKnownPosition: GridCell;
  readonly round: number;
}): SearchMemory {
  const cells = suspicionCells(input.bounds, input.lastKnownPosition, feet(0));
  return {
    policy: SEARCH_MEMORY_POLICY,
    observer: input.observer,
    target: input.target,
    cause: input.cause,
    lastKnownPosition: { ...input.lastKnownPosition },
    lostAtRound: input.round,
    lastExpandedRound: input.round,
    expires: { kind: 'start_of_round', round: input.round + SEARCH_MEMORY_DURATION_ROUNDS },
    suspicion: {
      kind: 'grid_radius',
      center: { ...input.lastKnownPosition },
      radius: feet(0),
      cells,
    },
    legalOptions: legalOptions(input.target, cells),
  };
}

export function expandSearchMemory(
  bounds: GridBounds,
  memory: SearchMemory,
  round: number,
): SearchMemory {
  if (round <= memory.lastExpandedRound) return memory;
  const elapsedRounds = round - memory.lostAtRound;
  const radius = feet(elapsedRounds * SEARCH_REGION_EXPANSION_PER_ROUND);
  const cells = suspicionCells(bounds, memory.lastKnownPosition, radius);
  return {
    ...memory,
    lastExpandedRound: round,
    suspicion: {
      kind: 'grid_radius',
      center: { ...memory.lastKnownPosition },
      radius,
      cells,
    },
    legalOptions: legalOptions(memory.target, cells),
  };
}

