import { canonicalJson } from '../commands/canonical-json';
import type { GridCell } from '../combat/grid';
import type { CombatantId } from '../combat/values';
import type { DmBoardProjection } from './encounter-projections';

export const SEMANTIC_BOARD_FORMAT = 'engine-semantic-board-v1' as const;

export type SemanticBoardAudience = 'dm' | 'player';

export interface SemanticBoardPayloadOptions {
  readonly audience?: SemanticBoardAudience;
  /** Player-safe observation memory. Missing entries serialize as an explicit null. */
  readonly lastSeenByCreature?: ReadonlyMap<CombatantId, GridCell | null>;
}

export interface EngineFactList<Value> {
  readonly provenance: 'engine_fact';
  readonly items: readonly Value[];
}

export type SemanticCell = readonly [column: number, row: number];
export type SemanticCellRun = readonly [
  start_column: number,
  row: number,
  end_column_inclusive: number,
];
export type SemanticEncodedCell = SemanticCell | SemanticCellRun;
export type SemanticCellEncoding =
  | '[column,row]'
  | '[start_column,row,end_column_inclusive]; endpoint is inclusive';

export interface EngineCellFactList {
  readonly provenance: 'engine_fact';
  readonly encoding: SemanticCellEncoding;
  readonly items: readonly SemanticEncodedCell[];
}

interface SemanticCreature {
  readonly id: string;
  readonly name: string;
  readonly side: 'party' | 'foe';
  readonly cell: SemanticCell | null;
  readonly footprint: readonly SemanticCell[];
  readonly hp_band: 'uninjured' | 'bloodied' | 'near_death' | 'unknown';
  readonly conditions: readonly string[];
  readonly hidden: boolean;
  readonly last_seen: SemanticCell | null;
}

interface SemanticDoor {
  readonly id: string;
  readonly name: string;
  readonly cells: readonly SemanticEncodedCell[];
}

interface SemanticObject {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly cells: readonly SemanticEncodedCell[];
}

interface SemanticAdjacencyPair {
  readonly first_id: string;
  readonly second_id: string;
}

interface SemanticReachRangeSummary {
  readonly id: string;
  readonly reach_feet: number;
  readonly creatures_in_reach: readonly string[];
  readonly nearest_hostile_distance_feet: number | null;
}

export interface SemanticBoardPayload {
  readonly format: typeof SEMANTIC_BOARD_FORMAT;
  readonly revision: number;
  readonly audience: SemanticBoardAudience;
  readonly coordinates: {
    readonly order: 'column,row';
    readonly origin: 'top_left';
    readonly indexing: 'zero_based';
    readonly columns_increase: 'right';
    readonly rows_increase: 'down';
    readonly cell_list_encoding: 'each cell list declares its encoding';
  };
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly creatures: EngineFactList<SemanticCreature>;
  readonly cells: {
    readonly blocked: EngineCellFactList;
    readonly difficult_terrain: EngineCellFactList;
    readonly light: {
      readonly default_light: 'bright';
      readonly default_applies_to: 'cells not covered by dim or dark exception regions';
      readonly partition: 'bright, dim, and dark together contain every board cell exactly once';
      readonly bright: EngineCellFactList;
      readonly dim: EngineCellFactList;
      readonly dark: EngineCellFactList;
    };
    readonly obscurement: {
      readonly light: EngineCellFactList;
      readonly heavy: EngineCellFactList;
    };
    /** Q9 component: every kind of obscurement, including magical darkness. */
    readonly obscured: EngineCellFactList;
    /** Q9 component: fog only. */
    readonly fogged: EngineCellFactList;
    /** Q9 union: cells in either component, de-duplicated. */
    readonly obscured_or_fogged: EngineCellFactList;
  };
  readonly doors: {
    readonly open: EngineFactList<SemanticDoor>;
    readonly closed: EngineFactList<SemanticDoor>;
  };
  readonly objects: EngineFactList<SemanticObject>;
  readonly light_sources: EngineFactList<SemanticObject>;
  readonly adjacency_pairs: EngineFactList<SemanticAdjacencyPair>;
  readonly reach_range_summaries: EngineFactList<SemanticReachRangeSummary>;
}

function factList<Value>(items: readonly Value[]): EngineFactList<Value> {
  return { provenance: 'engine_fact', items };
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function semanticCell(cell: GridCell): SemanticCell {
  return [cell.column, cell.row];
}

function explicitOrderedCells(cells: readonly GridCell[]): readonly SemanticCell[] {
  const unique = new Map(cells.map((cell) => [cellKey(cell), semanticCell(cell)] as const));
  return [...unique.values()].sort(
    (left, right) => (left[1] ?? 0) - (right[1] ?? 0) || (left[0] ?? 0) - (right[0] ?? 0),
  );
}

function horizontalRuns(sorted: readonly SemanticCell[]): readonly SemanticCellRun[] {
  const runs: SemanticCellRun[] = [];
  for (let index = 0; index < sorted.length;) {
    const first = sorted[index];
    if (first === undefined) break;
    let endColumn = first[0];
    let nextIndex = index + 1;
    while (nextIndex < sorted.length) {
      const next = sorted[nextIndex];
      if (next === undefined || next[1] !== first[1] || next[0] !== endColumn + 1) break;
      endColumn = next[0];
      nextIndex += 1;
    }
    runs.push([first[0], first[1], endColumn]);
    index = nextIndex;
  }
  return runs;
}

/** Small classes stay literal; only large classes use explicitly inclusive runs. */
function encodedCells(cells: readonly GridCell[]): EngineCellFactList {
  const explicit = explicitOrderedCells(cells);
  return explicit.length <= 200
    ? {
        provenance: 'engine_fact',
        encoding: '[column,row]',
        items: explicit,
      }
    : {
        provenance: 'engine_fact',
        encoding: '[start_column,row,end_column_inclusive]; endpoint is inclusive',
        items: horizontalRuns(explicit),
      };
}

function encodedCellItems(cells: readonly GridCell[]): readonly SemanticEncodedCell[] {
  return encodedCells(cells).items;
}

function hitPointBand(
  band: DmBoardProjection['board']['combatants'][number]['hitPointBand'],
): SemanticCreature['hp_band'] {
  if (band === undefined || band.kind === 'unknown') return 'unknown';
  return band.band;
}

function gridDistanceFeet(left: GridCell, right: GridCell): number {
  return Math.max(
    Math.abs(left.column - right.column),
    Math.abs(left.row - right.row),
  ) * 5;
}

/**
 * Canonical engine facts drawn from the exact projection rendered by the board.
 * Player mode is a testable redaction boundary; the DM export is never routed to
 * a player channel.
 */
export function semanticBoardPayload(
  projection: DmBoardProjection,
  options: SemanticBoardPayloadOptions = {},
): SemanticBoardPayload {
  const audience = options.audience ?? projection.audience;
  const board = projection.board;
  const orderedCombatants = [...board.combatants].sort(
    (left, right) =>
      left.position.row - right.position.row ||
      left.position.column - right.position.column ||
      left.id.localeCompare(right.id),
  );
  const creatures = orderedCombatants.map((combatant): SemanticCreature => {
    const hidden = combatant.hiddenFromPlayers === true;
    const redactPosition = audience === 'player' && hidden;
    const lastSeen = redactPosition
      ? options.lastSeenByCreature?.get(combatant.id) ?? null
      : null;
    return {
      id: String(combatant.id),
      name: combatant.name,
      side: combatant.kind === 'player_character' ? 'party' : 'foe',
      cell: redactPosition ? null : semanticCell(combatant.position),
      footprint: redactPosition ? [] : [semanticCell(combatant.position)],
      hp_band: audience === 'player' ? 'unknown' : hitPointBand(combatant.hitPointBand),
      conditions: redactPosition
        ? []
        : [...(combatant.conditions ?? [])].sort((left, right) => left.localeCompare(right)),
      hidden,
      last_seen: lastSeen === null ? null : semanticCell(lastSeen),
    };
  });

  const difficultTerrain = [
    ...(board.difficultTerrainRegions ?? []).flatMap((region) => region.cells),
    ...board.areas.filter((area) => area.difficultTerrain).flatMap((area) => area.cells),
  ];
  const lightByCell = new Map<string, 'bright' | 'dim' | 'dark'>();
  for (let row = 0; row < board.bounds.rows; row += 1) {
    for (let column = 0; column < board.bounds.columns; column += 1) {
      lightByCell.set(cellKey({ column, row }), 'bright');
    }
  }
  for (const region of board.environmentLightRegions ?? []) {
    const level = region.level === 'darkness' ? 'dark' : region.level;
    for (const cell of region.cells) lightByCell.set(cellKey(cell), level);
  }
  const lightCells = (level: 'bright' | 'dim' | 'dark'): readonly GridCell[] =>
    [...lightByCell.entries()].flatMap(([key, value]) => {
      if (value !== level) return [];
      const [column, row] = key.split(',').map(Number);
      if (column === undefined || row === undefined)
        throw new Error(`Malformed semantic board cell ${key}.`);
      return [{ column, row }];
    });
  const obscurementCells = (level: 'light' | 'heavy'): readonly GridCell[] =>
    (board.obscurementRegions ?? []).flatMap((region) =>
      region.obscurement === level ||
      (level === 'heavy' && region.obscurement === 'magical_darkness')
        ? region.cells
        : []);
  const obscuredCells = (board.obscurementRegions ?? []).flatMap((region) => region.cells);
  const foggedCells = board.foggedCells;

  const orderedObjects = [...board.worldObjects].sort(
    (left, right) =>
      left.position.row - right.position.row ||
      left.position.column - right.position.column ||
      left.id.localeCompare(right.id),
  );
  const objectValue = (object: (typeof orderedObjects)[number]): SemanticObject => ({
    id: String(object.id),
    name: object.name,
    kind: object.kind,
    cells: encodedCellItems(object.cells),
  });
  const doorValue = (object: (typeof orderedObjects)[number]): SemanticDoor => ({
    id: String(object.id),
    name: object.name,
    cells: encodedCellItems(object.cells),
  });
  const doors = orderedObjects.filter((object) => object.kind === 'door');

  const spatialCombatants = audience === 'player'
    ? orderedCombatants.filter((combatant) => combatant.hiddenFromPlayers !== true)
    : orderedCombatants;
  const adjacencyPairs: SemanticAdjacencyPair[] = [];
  for (let firstIndex = 0; firstIndex < spatialCombatants.length; firstIndex += 1) {
    const first = spatialCombatants[firstIndex];
    if (first === undefined) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < spatialCombatants.length; secondIndex += 1) {
      const second = spatialCombatants[secondIndex];
      if (second === undefined) continue;
      if (gridDistanceFeet(first.position, second.position) <= 5) {
        adjacencyPairs.push({ first_id: String(first.id), second_id: String(second.id) });
      }
    }
  }
  const reachById = new Map(
    projection.encounter.combatants.map((combatant) => [combatant.id, combatant.rules.reach] as const),
  );
  const reachRangeSummaries = spatialCombatants.map((combatant): SemanticReachRangeSummary => {
    const reach = reachById.get(combatant.id);
    if (reach === undefined)
      throw new Error(`Semantic board creature ${String(combatant.id)} has no encounter rules.`);
    const hostileDistances = spatialCombatants
      .filter((target) => target.kind !== combatant.kind)
      .map((target) => gridDistanceFeet(combatant.position, target.position));
    return {
      id: String(combatant.id),
      reach_feet: reach,
      creatures_in_reach: spatialCombatants
        .filter((target) =>
          target.id !== combatant.id &&
          gridDistanceFeet(combatant.position, target.position) <= reach)
        .map((target) => String(target.id)),
      nearest_hostile_distance_feet: hostileDistances.length === 0
        ? null
        : Math.min(...hostileDistances),
    };
  });

  return {
    format: SEMANTIC_BOARD_FORMAT,
    revision: projection.encounter.revision,
    audience,
    coordinates: {
      order: 'column,row',
      origin: 'top_left',
      indexing: 'zero_based',
      columns_increase: 'right',
      rows_increase: 'down',
      cell_list_encoding: 'each cell list declares its encoding',
    },
    bounds: { ...board.bounds },
    creatures: factList(creatures),
    cells: {
      blocked: encodedCells(board.blockedCells ?? []),
      difficult_terrain: encodedCells(difficultTerrain),
      light: {
        default_light: 'bright',
        default_applies_to: 'cells not covered by dim or dark exception regions',
        partition: 'bright, dim, and dark together contain every board cell exactly once',
        bright: encodedCells(lightCells('bright')),
        dim: encodedCells(lightCells('dim')),
        dark: encodedCells(lightCells('dark')),
      },
      obscurement: {
        light: encodedCells(obscurementCells('light')),
        heavy: encodedCells(obscurementCells('heavy')),
      },
      obscured: encodedCells(obscuredCells),
      fogged: encodedCells(foggedCells),
      obscured_or_fogged: encodedCells([...obscuredCells, ...foggedCells]),
    },
    doors: {
      open: factList(doors.filter((door) => !door.blocking.movement).map(doorValue)),
      closed: factList(doors.filter((door) => door.blocking.movement).map(doorValue)),
    },
    objects: factList(orderedObjects.filter((object) => object.kind !== 'door').map(objectValue)),
    light_sources: factList(orderedObjects.filter((object) => object.lightClass === 'light-source').map(objectValue)),
    adjacency_pairs: factList(adjacencyPairs),
    reach_range_summaries: factList(reachRangeSummaries),
  };
}

/** Byte-stable canonical JSON for hashing and model input. */
export function semanticBoardJson(
  projection: DmBoardProjection,
  options: SemanticBoardPayloadOptions = {},
): string {
  return canonicalJson(semanticBoardPayload(projection, options));
}
