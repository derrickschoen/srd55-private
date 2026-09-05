import { createEncounter } from '../combat/encounter';
import { combatToken } from '../combat/combatant';
import type { GridCell } from '../combat/grid';
import { armorClass, worldObjectId } from '../combat/values';
import type { WorldObject } from '../combat/world-objects';
import { encounterIr, type EncounterIr } from './encounter-ir';
import { generateRoom, ROOM_GRID_DIMENSIONS, type RoomGridDimension } from './room-generator';

/**
 * Watabou One Page Dungeon JSON export fields used by this adapter.
 * The exporter describes a dungeon as rectangular floor regions plus doors;
 * notes, columns, and water are optional enrichment fields. Door type values
 * follow the exporter vocabulary: 0 empty, 1 normal, 2 archway, 3 stairs,
 * 4 portcullis, 5 special, 6 secret, 7 barred, 8 exit, 9 steps.
 *
 * Schema references:
 * https://watabou.itch.io/one-page-dungeon/comments?after=232
 * https://github.com/EnderPy/one-page-importer/blob/main/src/types.ts
 */
export interface WatabouPoint {
  readonly x: number;
  readonly y: number;
}

export interface WatabouRect extends WatabouPoint {
  readonly w: number;
  readonly h: number;
  readonly rotunda?: boolean;
  readonly ending?: boolean;
  readonly roomID?: string;
}

export interface WatabouDoor extends WatabouPoint {
  readonly dir: WatabouPoint;
  readonly type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export interface WatabouNote {
  readonly text: string;
  readonly ref: string;
  readonly pos: WatabouPoint;
}

export interface WatabouOnePageDungeonJson {
  readonly version: string;
  readonly title: string;
  readonly story: string;
  readonly rects: readonly WatabouRect[];
  readonly doors: readonly WatabouDoor[];
  readonly notes: readonly WatabouNote[];
  readonly columns?: readonly WatabouPoint[];
  readonly water?: readonly unknown[];
}

export interface WatabouAdapterOptions {
  readonly seed: number | null;
  readonly licenseTag?: string;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  return value;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function point(value: unknown, label: string): WatabouPoint {
  const input = record(value, label);
  return {
    x: finiteNumber(input['x'], `${label}.x`),
    y: finiteNumber(input['y'], `${label}.y`),
  };
}

export function decodeWatabouDungeon(value: unknown): WatabouOnePageDungeonJson {
  const input = record(value, 'Watabou dungeon');
  const rects = array(input['rects'], 'Watabou dungeon.rects').map((value, index): WatabouRect => {
    const item = record(value, `Watabou dungeon.rects[${String(index)}]`);
    const origin = point(item, `Watabou dungeon.rects[${String(index)}]`);
    const w = finiteNumber(item['w'], `Watabou dungeon.rects[${String(index)}].w`);
    const h = finiteNumber(item['h'], `Watabou dungeon.rects[${String(index)}].h`);
    if (!Number.isSafeInteger(origin.x) || !Number.isSafeInteger(origin.y) ||
      !Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w < 1 || h < 1) {
      throw new TypeError('Watabou rectangles must use positive whole-cell dimensions.');
    }
    return {
      ...origin,
      w,
      h,
      ...(typeof item['rotunda'] === 'boolean' ? { rotunda: item['rotunda'] } : {}),
      ...(typeof item['ending'] === 'boolean' ? { ending: item['ending'] } : {}),
      ...(typeof item['roomID'] === 'string' ? { roomID: item['roomID'] } : {}),
    };
  });
  if (rects.length === 0) throw new TypeError('Watabou dungeon must contain at least one rectangle.');
  const doors = array(input['doors'], 'Watabou dungeon.doors').map((value, index): WatabouDoor => {
    const item = record(value, `Watabou dungeon.doors[${String(index)}]`);
    const origin = point(item, `Watabou dungeon.doors[${String(index)}]`);
    const direction = point(item['dir'], `Watabou dungeon.doors[${String(index)}].dir`);
    const type = finiteNumber(item['type'], `Watabou dungeon.doors[${String(index)}].type`);
    if (!Number.isSafeInteger(type) || type < 0 || type > 9) {
      throw new TypeError('Watabou door type must be an integer from 0 through 9.');
    }
    return { ...origin, dir: direction, type: type as WatabouDoor['type'] };
  });
  const notes = array(input['notes'], 'Watabou dungeon.notes').map((value, index): WatabouNote => {
    const item = record(value, `Watabou dungeon.notes[${String(index)}]`);
    return {
      text: text(item['text'], `Watabou dungeon.notes[${String(index)}].text`),
      ref: text(item['ref'], `Watabou dungeon.notes[${String(index)}].ref`),
      pos: point(item['pos'], `Watabou dungeon.notes[${String(index)}].pos`),
    };
  });
  return {
    version: text(input['version'], 'Watabou dungeon.version'),
    title: text(input['title'], 'Watabou dungeon.title'),
    story: text(input['story'], 'Watabou dungeon.story'),
    rects,
    doors,
    notes,
  };
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function dimension(value: number): RoomGridDimension {
  if (!ROOM_GRID_DIMENSIONS.includes(value as RoomGridDimension)) {
    throw new RangeError('Watabou dungeon dimensions must fit a 12x12 through 24x24 encounter grid.');
  }
  return value as RoomGridDimension;
}

function doorObject(
  door: WatabouDoor,
  index: number,
  minimumX: number,
  minimumY: number,
): WorldObject {
  const position = { column: door.x - minimumX, row: door.y - minimumY };
  const open = door.type === 0 || door.type === 2 || door.type === 9;
  return {
    id: worldObjectId(`world-object:watabou-door-${String(index + 1)}`),
    name: open ? 'Watabou Archway' : 'Watabou Door',
    kind: 'door',
    position,
    footprint: [position],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: {
      movement: !open,
      lineOfSight: !open,
      cover: open ? 'none' : 'total',
    },
    createdRevision: 0,
  };
}

export function adaptWatabouDungeon(
  value: unknown,
  options: WatabouAdapterOptions,
): EncounterIr {
  const source = decodeWatabouDungeon(value);
  const minimumX = Math.min(...source.rects.map((rect) => rect.x), ...source.doors.map((door) => door.x));
  const minimumY = Math.min(...source.rects.map((rect) => rect.y), ...source.doors.map((door) => door.y));
  const maximumX = Math.max(...source.rects.map((rect) => rect.x + rect.w), ...source.doors.map((door) => door.x + 1));
  const maximumY = Math.max(...source.rects.map((rect) => rect.y + rect.h), ...source.doors.map((door) => door.y + 1));
  const columns = dimension(Math.max(12, maximumX - minimumX));
  const rows = dimension(Math.max(12, maximumY - minimumY));
  const floor = new Set<string>();
  for (const rect of source.rects) {
    for (let row = rect.y; row < rect.y + rect.h; row += 1) {
      for (let column = rect.x; column < rect.x + rect.w; column += 1) {
        floor.add(cellKey({ column: column - minimumX, row: row - minimumY }));
      }
    }
  }
  for (const door of source.doors) {
    floor.add(cellKey({ column: door.x - minimumX, row: door.y - minimumY }));
  }
  const blockedCells: GridCell[] = [];
  const openCells: GridCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = { column, row };
      (floor.has(cellKey(cell)) ? openCells : blockedCells).push(cell);
    }
  }
  const worldObjects = source.doors.map((door, index) => doorObject(door, index, minimumX, minimumY));
  const objectCells = new Set(worldObjects.filter((object) => object.blocking.movement).map((object) => cellKey(object.position)));
  const placementCells = openCells.filter((cell) => !objectCells.has(cellKey(cell)));
  const generated = generateRoom(options.seed ?? 0, { dimensions: { columns, rows } });
  const profiles = generated.encounter.state.combatants.map((subject) => subject.profile);
  if (placementCells.length < profiles.length) {
    throw new RangeError('Watabou dungeon has too few open cells for the generated encounter roster.');
  }
  const tokens = profiles.map((profile, index) => {
    const spreadIndex = Math.floor(index * (placementCells.length - 1) / Math.max(1, profiles.length - 1));
    const position = placementCells[spreadIndex];
    if (position === undefined) throw new RangeError('Watabou token placement failed.');
    return combatToken(profile, position);
  });
  const fresh = createEncounter({
    bounds: { columns, rows },
    combatants: profiles,
    tokens,
    blockedCells,
    worldObjects,
    environment: {
      lightRegions: [],
      difficultTerrainRegions: [],
      obscurementRegions: [],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
    dmNotes: [
      source.title,
      ...(source.story.trim().length === 0 ? [] : [source.story]),
      ...source.notes.map((note) => `${note.ref}: ${note.text}`),
    ],
  });
  return encounterIr({
    ...fresh,
    combatants: generated.encounter.state.combatants,
    effects: generated.encounter.state.effects,
    nextEffectSequence: generated.encounter.state.nextEffectSequence,
  }, {
    source: 'watabou',
    licenseTag: options.licenseTag ?? 'LicenseRef-Watabou-Output-Free-Use',
    seed: options.seed,
  });
}
