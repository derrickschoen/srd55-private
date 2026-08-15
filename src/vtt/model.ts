import * as Y from 'yjs';

export const VTT_SCHEMA_VERSION = 1;
export const BOARD_COLUMNS = 16;
export const BOARD_ROWS = 12;
export const GRID_SIZE = 50;

export interface Cell {
  readonly column: number;
  readonly row: number;
}

export interface RoomMetadata {
  readonly schemaVersion: typeof VTT_SCHEMA_VERSION;
  readonly roomCode: string;
  readonly dmClientId: string;
  readonly createdAt: string;
}

export interface BoardToken {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly cell: Cell;
}

export interface DiceRoll {
  readonly id: string;
  readonly expression: string;
  readonly dice: readonly number[];
  readonly modifier: number;
  readonly total: number;
  readonly rollerClientId: string;
  readonly rolledAt: string;
}

export interface ParsedDiceExpression {
  readonly count: number;
  readonly sides: number;
  readonly modifier: number;
  readonly expression: string;
}

const roomMetadataRoot = (doc: Y.Doc): Y.Map<RoomMetadata> =>
  doc.getMap<RoomMetadata>('meta');
const tokenRoot = (doc: Y.Doc): Y.Map<Y.Map<unknown>> =>
  doc.getMap<Y.Map<unknown>>('tokens');
const fogRoot = (doc: Y.Doc): Y.Map<number> => doc.getMap<number>('fog');
const diceRoot = (doc: Y.Doc): Y.Array<DiceRoll> =>
  doc.getArray<DiceRoll>('diceLog');

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function requiredString(
  record: Readonly<Record<string, unknown>>,
  key: string,
): string {
  const value = Reflect.get(record, key);
  if (typeof value !== 'string') {
    throw new Error(`VTT document field "${key}" must be text.`);
  }
  return value;
}

export function cellKey(cell: Cell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

export function parseCell(value: unknown): Cell {
  if (typeof value !== 'string') {
    throw new Error('Token cell must be a column,row string.');
  }
  const match = /^(\d+),(\d+)$/.exec(value);
  if (match === null) {
    throw new Error(`Invalid token cell "${value}".`);
  }
  const column = Number(match[1]);
  const row = Number(match[2]);
  if (
    !Number.isSafeInteger(column) ||
    !Number.isSafeInteger(row) ||
    column < 0 ||
    column >= BOARD_COLUMNS ||
    row < 0 ||
    row >= BOARD_ROWS
  ) {
    throw new Error(`Token cell "${value}" is outside the board.`);
  }
  return Object.freeze({ column, row });
}

export function initializeRoom(
  doc: Y.Doc,
  roomCode: string,
  dmClientId: string,
): RoomMetadata {
  if (roomMetadataRoot(doc).has('room')) {
    throw new Error('This VTT document already belongs to a room.');
  }
  const normalizedCode = roomCode.trim();
  if (!/^[a-zA-Z0-9-]{3,64}$/.test(normalizedCode)) {
    throw new Error('Room code must be 3–64 letters, numbers, or hyphens.');
  }
  const metadata: RoomMetadata = Object.freeze({
    schemaVersion: VTT_SCHEMA_VERSION,
    roomCode: normalizedCode,
    dmClientId,
    createdAt: new Date().toISOString(),
  });
  roomMetadataRoot(doc).set('room', metadata);
  return metadata;
}

export function readRoomMetadata(doc: Y.Doc): RoomMetadata | null {
  const value: unknown = roomMetadataRoot(doc).get('room');
  if (value === undefined) return null;
  if (!isRecord(value)) {
    throw new Error('VTT room metadata is malformed.');
  }
  const schemaVersion = Reflect.get(value, 'schemaVersion');
  if (schemaVersion !== VTT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported VTT document schema ${String(schemaVersion)}; expected ${String(VTT_SCHEMA_VERSION)}.`,
    );
  }
  const createdAt = requiredString(value, 'createdAt');
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error('VTT room creation time is malformed.');
  }
  return Object.freeze({
    schemaVersion,
    roomCode: requiredString(value, 'roomCode'),
    dmClientId: requiredString(value, 'dmClientId'),
    createdAt,
  });
}

export function abandonRoomInitialization(doc: Y.Doc): void {
  roomMetadataRoot(doc).delete('room');
}

export function createToken(
  doc: Y.Doc,
  label: string,
  color: string,
): BoardToken {
  const id = crypto.randomUUID();
  const token = new Y.Map<unknown>();
  token.set('label', normalizedLabel(label));
  token.set('color', normalizedColor(color));
  token.set('cell', cellKey(firstAvailableCell(doc)));
  tokenRoot(doc).set(id, token);
  return readToken(id, token);
}

export function updateToken(
  doc: Y.Doc,
  id: string,
  changes: { readonly label?: string; readonly color?: string; readonly cell?: Cell },
): void {
  const token = tokenRoot(doc).get(id);
  if (token === undefined) throw new Error(`Unknown VTT token "${id}".`);
  doc.transact(() => {
    if (changes.label !== undefined) {
      token.set('label', normalizedLabel(changes.label));
    }
    if (changes.color !== undefined) {
      token.set('color', normalizedColor(changes.color));
    }
    if (changes.cell !== undefined) {
      parseCell(cellKey(changes.cell));
      // One atomic register prevents concurrent x/y moves from interleaving.
      token.set('cell', cellKey(changes.cell));
    }
  });
}

export function listTokens(doc: Y.Doc): readonly BoardToken[] {
  return [...tokenRoot(doc).entries()]
    .map(([id, token]) => readToken(id, token))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function readToken(id: string, token: Y.Map<unknown>): BoardToken {
  const label = token.get('label');
  const color = token.get('color');
  if (typeof label !== 'string' || typeof color !== 'string') {
    throw new Error(`VTT token "${id}" is malformed.`);
  }
  return Object.freeze({
    id,
    label: normalizedLabel(label),
    color: normalizedColor(color),
    cell: parseCell(token.get('cell')),
  });
}

function normalizedLabel(value: string): string {
  const label = value.trim();
  if (label.length < 1 || label.length > 40) {
    throw new Error('Token label must be 1–40 characters.');
  }
  return label;
}

function normalizedColor(value: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error('Token color must be a six-digit hex color.');
  }
  return value.toLowerCase();
}

function firstAvailableCell(doc: Y.Doc): Cell {
  const occupied = new Set(listTokens(doc).map((token) => cellKey(token.cell)));
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let column = 0; column < BOARD_COLUMNS; column += 1) {
      const candidate = Object.freeze({ column, row });
      if (!occupied.has(cellKey(candidate))) return candidate;
    }
  }
  return Object.freeze({ column: 0, row: 0 });
}

export function paintFog(doc: Y.Doc, cell: Cell): void {
  parseCell(cellKey(cell));
  const key = cellKey(cell);
  if (fogRoot(doc).has(key)) return;
  fogRoot(doc).set(key, 1);
}

export function eraseFog(doc: Y.Doc, cell: Cell): void {
  fogRoot(doc).delete(cellKey(cell));
}

export function fogCells(doc: Y.Doc): readonly Cell[] {
  return [...fogRoot(doc).keys()].map(parseCell);
}

export function hasFog(doc: Y.Doc, cell: Cell): boolean {
  return fogRoot(doc).has(cellKey(cell));
}

export function parseDiceExpression(value: string): ParsedDiceExpression {
  const match = /^(\d{1,3})d(\d{1,4})([+-]\d{1,5})?$/i.exec(value.trim());
  if (match === null) {
    throw new Error('Use dice notation like 2d6+3 or 1d20-1.');
  }
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[3] === undefined ? 0 : Number(match[3]);
  if (count < 1 || count > 100) {
    throw new Error('Dice count must be between 1 and 100.');
  }
  if (sides < 2 || sides > 1_000) {
    throw new Error('Die sides must be between 2 and 1000.');
  }
  if (modifier < -10_000 || modifier > 10_000) {
    throw new Error('Dice modifier must be between -10000 and 10000.');
  }
  const suffix = modifier === 0 ? '' : modifier > 0 ? `+${String(modifier)}` : String(modifier);
  return Object.freeze({
    count,
    sides,
    modifier,
    expression: `${String(count)}d${String(sides)}${suffix}`,
  });
}

function uniformDie(sides: number): number {
  const range = 0x1_0000_0000;
  const accepted = Math.floor(range / sides) * sides;
  const sample = new Uint32Array(1);
  do {
    crypto.getRandomValues(sample);
  } while ((sample[0] ?? range) >= accepted);
  return ((sample[0] ?? 0) % sides) + 1;
}

export function rollDice(
  doc: Y.Doc,
  expression: string,
  rollerClientId: string,
): DiceRoll {
  const parsed = parseDiceExpression(expression);
  const dice = Array.from({ length: parsed.count }, () => uniformDie(parsed.sides));
  const total = dice.reduce((sum, die) => sum + die, parsed.modifier);
  const roll: DiceRoll = Object.freeze({
    id: crypto.randomUUID(),
    expression: parsed.expression,
    dice: Object.freeze(dice),
    modifier: parsed.modifier,
    total,
    rollerClientId,
    rolledAt: new Date().toISOString(),
  });
  diceRoot(doc).push([roll]);
  return roll;
}

export function listDiceRolls(doc: Y.Doc): readonly DiceRoll[] {
  return Object.freeze(
    diceRoot(doc).toArray().map((roll: unknown) => parseDiceRoll(roll)),
  );
}

function parseDiceRoll(value: unknown): DiceRoll {
  if (!isRecord(value)) throw new Error('VTT dice roll is malformed.');
  const id = requiredString(value, 'id');
  const expression = requiredString(value, 'expression');
  const parsed = parseDiceExpression(expression);
  const diceValue = Reflect.get(value, 'dice');
  const modifier = Reflect.get(value, 'modifier');
  const total = Reflect.get(value, 'total');
  const rollerClientId = requiredString(value, 'rollerClientId');
  const rolledAt = requiredString(value, 'rolledAt');
  if (!Array.isArray(diceValue) || diceValue.length !== parsed.count) {
    throw new Error(`VTT dice roll "${id}" has invalid dice.`);
  }
  const dice = diceValue.map((die: unknown) => {
    if (
      typeof die !== 'number' ||
      !Number.isSafeInteger(die) ||
      die < 1 ||
      die > parsed.sides
    ) {
      throw new Error(`VTT dice roll "${id}" has an invalid die result.`);
    }
    return die;
  });
  if (
    typeof modifier !== 'number' ||
    !Number.isSafeInteger(modifier) ||
    modifier !== parsed.modifier ||
    typeof total !== 'number' ||
    !Number.isSafeInteger(total) ||
    total !== dice.reduce((sum, die) => sum + die, modifier) ||
    Number.isNaN(Date.parse(rolledAt)) ||
    rollerClientId.length === 0
  ) {
    throw new Error(`VTT dice roll "${id}" is inconsistent.`);
  }
  return Object.freeze({
    id,
    expression: parsed.expression,
    dice: Object.freeze(dice),
    modifier,
    total,
    rollerClientId,
    rolledAt,
  });
}

export function serializeBoardDocument(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function deserializeBoardDocument(bytes: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bytes);
  readRoomMetadata(doc);
  listTokens(doc);
  fogCells(doc);
  listDiceRolls(doc);
  return doc;
}
