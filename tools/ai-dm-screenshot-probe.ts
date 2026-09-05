import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { DEFAULT_BOARD_GLYPH_MODE, isBoardGlyphMode, type BoardGlyphMode, type CornerGlyphFamily } from '../src/assets/board-glyphs';
import { canonicalJson } from '../src/commands/canonical-json';
import type { CombatantProfile } from '../src/combat/combatant';
import { createEncounter, type EncounterState, type LifeState } from '../src/combat/encounter';
import type { GridCell } from '../src/combat/grid';
import {
  armorClass,
  combatantId,
  tokenId,
} from '../src/combat/values';
import { dmVisibleEncounter, projectDmView } from '../src/combat/visibility';
import { projectEncounterBoard } from '../src/vtt/encounter-board';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { referenceEncounterSetup, REFERENCE_MONSTER_ID } from '../src/vtt/reference-encounter';
import { generateRoom } from '../src/vtt/room-generator';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  importSavedSession,
} from '../src/vtt/session-persistence';
import { createVaneWarrenFight } from '../src/vtt/vane-warren';
import { adaptWatabouDungeon } from '../src/vtt/watabou-adapter';
import {
  BoardSnapshotService,
  boardStateDigest,
  type BoardImageArtifact,
  type BoardImageSource,
} from './ai-dm-board-snapshot';

const repositoryRoot = resolve(new URL('../', import.meta.url).pathname);
const PROBE_VERSION = 'd519-screenshot-comprehension-v1' as const;
const ROW_VERSION = 'd525-screenshot-comprehension-row-v4' as const;
/** v3 (D525): the general primer gains one sentence per glyph family under `--board-glyphs full`. */
export const PRIMER_VERSION = 'd525-general-board-primer-v3' as const;
export const GENERAL_PRIMER = 'This is a tabletop RPG combat board viewed from above. Each grid square represents 5 feet, and tokens represent creatures. Cool-blue base plates identify party creatures; warm-red base plates identify foes. Numbers along the horizontal and vertical board edges are zero-based column,row coordinates, and answers must use that convention. Bars under tokens show hit-point bands using the colours named in the legend. The legend box names every terrain tint (Difficult, Obscured, Bright light, Dim light, Darkness, and Fog) and every board glyph (Blocked, Object, and Light source). Interpret walls, doors, and objects as they are drawn on the board.' as const;
/**
 * D525: the sentence describing how the board draws light levels, one per
 * convention. Each describes only the drawing convention — never a room fact —
 * and must match the legend rows board-chrome renders.
 */
export const LIGHT_PRIMER = {
  tint: 'Light levels are shown as floor tints: a pale warm tint marks bright light, a fainter warm tint marks dim light, a dark veil marks darkness, and untinted floor is also bright light.',
  glyph: 'Light levels are shown by a small glyph in the top-left corner of a cell: a sun marks bright light, a crescent moon marks dim light, a filled dark circle marks darkness, and a cell without a glyph has the room default level that the legend names after "No glyph =".',
} as const;
/**
 * D525 'full': one sentence per glyph family, naming the corner and the
 * meaning, in the corner order board-glyphs.ts fixes. The hidden mark rides
 * the token plate, so its sentence names the rim rather than a corner.
 */
export const GLYPH_FAMILY_PRIMER = {
  door: 'Doors are marked by a glyph in the top-right corner of the cell: a solid door slab crossed by a dark bar means the door is closed, and a door frame with an open gap and a swing arc means the door is open.',
  blocked: 'A blocked cell, such as a pillar or rubble, carries an X inside a square in the bottom-left corner of the cell.',
  veil: 'Fog is a veil of diagonal hatching with a cloud glyph in the bottom-right corner of the cell, obscurement is a dotted veil with a wave glyph just left of that corner, and a cell can carry both.',
  hidden: 'A creature hidden from the players has a dashed ring around its plate, an eye crossed by a slash on the left rim of that ring, and the word HIDDEN inside its name plate.',
} as const satisfies Readonly<Record<Exclude<CornerGlyphFamily, 'light'> | 'hidden', string>>;
/** The sentences appended to the general primer for each board-glyph mode. */
export const BOARD_GLYPH_PRIMER: Readonly<Record<BoardGlyphMode, readonly string[]>> = Object.freeze({
  none: [LIGHT_PRIMER.tint],
  light: [LIGHT_PRIMER.glyph],
  full: [LIGHT_PRIMER.glyph, GLYPH_FAMILY_PRIMER.door, GLYPH_FAMILY_PRIMER.blocked, GLYPH_FAMILY_PRIMER.veil, GLYPH_FAMILY_PRIMER.hidden],
});
const AI_DM_CODEX_HOME = '/home/vagrant/.codex-aidm' as const;
const REAL_CALL_CONCURRENCY = 4;
export const PASS_THRESHOLD = 0.9;

export const SCREENSHOT_QUESTION_IDS = [
  'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10',
] as const;
export type ScreenshotQuestionId = (typeof SCREENSHOT_QUESTION_IDS)[number];
export type ProbeEffort = 'low' | 'medium' | 'high' | 'xhigh';
export type ProseHitPointBand = 'uninjured' | 'injured' | 'critical' | 'unknown';
export type ProbeSide = 'party' | 'foe';
export type ProbeLight = 'bright' | 'dim' | 'dark';
export type PrimerMode = 'none' | 'general';
export type PrimerVersion = typeof PRIMER_VERSION | null;

declare const zeroBasedColumnBrand: unique symbol;
declare const zeroBasedRowBrand: unique symbol;
export type ZeroBasedColumn = number & { readonly [zeroBasedColumnBrand]: true };
export type ZeroBasedRow = number & { readonly [zeroBasedRowBrand]: true };

export interface ProbeCell {
  readonly column: ZeroBasedColumn;
  readonly row: ZeroBasedRow;
}

export interface FactSheetCombatant {
  readonly displayName: string;
  readonly cell: ProbeCell;
  readonly side: ProbeSide;
  readonly hpBand: ProseHitPointBand;
  readonly life: LifeState;
  readonly hiddenFromPlayers: boolean;
}

export interface ScreenshotFactSheet {
  readonly version: typeof PROBE_VERSION;
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly combatants: readonly FactSheetCombatant[];
  readonly difficultTerrainCells: readonly ProbeCell[];
  readonly obscuredCells: readonly ProbeCell[];
  readonly lightCells: readonly (ProbeCell & { readonly light: ProbeLight })[];
  readonly foggedCells: readonly ProbeCell[];
  readonly blockedCells: readonly ProbeCell[];
  readonly doors: readonly (ProbeCell & { readonly open: boolean })[];
  readonly worldObjects: readonly (ProbeCell & { readonly name: string })[];
  readonly adjacencyPairs: readonly {
    readonly first: Pick<FactSheetCombatant, 'displayName' | 'cell'>;
    readonly second: Pick<FactSheetCombatant, 'displayName' | 'cell'>;
  }[];
}

interface CreatureLocation {
  readonly name: string;
  readonly column: ZeroBasedColumn;
  readonly row: ZeroBasedRow;
}

type ProbeAnswer =
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q1'; readonly creatures: readonly CreatureLocation[] }
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q2'; readonly creatures: readonly (CreatureLocation & { readonly side: ProbeSide })[] }
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q3'; readonly creatures: readonly (CreatureLocation & { readonly hpBand: ProseHitPointBand })[] }
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q4'; readonly cells: readonly ProbeCell[] }
  | {
      readonly version: typeof PROBE_VERSION;
      readonly question: 'Q5';
      readonly brightCells: readonly ProbeCell[];
      readonly dimCells: readonly ProbeCell[];
      readonly darkCells: readonly ProbeCell[];
    }
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q6'; readonly doors: readonly (ProbeCell & { readonly open: boolean })[] }
  | {
      readonly version: typeof PROBE_VERSION;
      readonly question: 'Q7';
      readonly pairs: readonly { readonly first: CreatureLocation; readonly second: CreatureLocation }[];
    }
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q8'; readonly creatures: readonly CreatureLocation[] }
  | {
      readonly version: typeof PROBE_VERSION;
      readonly question: 'Q9';
      readonly foggedCells: readonly ProbeCell[];
      readonly obscuredCells: readonly ProbeCell[];
    }
  | { readonly version: typeof PROBE_VERSION; readonly question: 'Q10'; readonly cells: readonly ProbeCell[] };

export interface ProbeModelSpec {
  readonly model: string;
  readonly effort: ProbeEffort;
}

export interface ScreenshotProbeConfig {
  readonly models: readonly ProbeModelSpec[];
  readonly stateCount: number;
  readonly seed: number;
  readonly imagesRoot: string;
  readonly outPath: string;
  readonly summaryPath: string;
  readonly simulate: boolean;
  readonly primer: PrimerMode;
  readonly generation: string;
  readonly comparePath: string | null;
  /** D525: the glyph mode every board is captured under and the primer sentences that describe it. */
  readonly boardGlyphs: BoardGlyphMode;
}

export interface ProbeTokenUsage {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

export interface ScreenshotProbeRow {
  readonly version: typeof ROW_VERSION;
  readonly stateId: string;
  readonly stateDigest: string;
  readonly model: string;
  readonly effort: ProbeEffort;
  readonly question: ScreenshotQuestionId;
  readonly promptVersion: typeof PROBE_VERSION;
  readonly primerVersion: PrimerVersion;
  readonly generation: string;
  readonly boardGlyphs: BoardGlyphMode;
  readonly png: {
    readonly sha256: string;
    readonly relativePath: string;
    readonly width: number;
    readonly height: number;
  };
  readonly outcome: 'answered' | 'schema_rejected' | 'call_error';
  readonly score: number;
  readonly hallucinations: number;
  readonly confusions: readonly string[];
  readonly wallMs: number;
  readonly tokens: ProbeTokenUsage | null;
  readonly truth: ProbeAnswer;
  readonly answer: ProbeAnswer | null;
  readonly rawAnswer: string;
  readonly error: string | null;
}

export interface ProbeStateCandidate {
  readonly id: string;
  readonly state: EncounterState;
}

export interface ProbeSnapshotService {
  capture(input: { readonly state: EncounterState; readonly source: BoardImageSource }): Promise<BoardImageArtifact>;
  close(): Promise<void>;
}

export interface ProbeAnswerRequest {
  readonly model: string;
  readonly effort: ProbeEffort;
  readonly question: ScreenshotQuestionId;
  readonly prompt: string;
  readonly schemaPath: string;
  readonly imagePath: string;
  readonly truth: ProbeAnswer;
}

export interface ProbeAnswerResult {
  readonly rawAnswer: string;
  readonly wallMs: number;
  readonly tokens: ProbeTokenUsage | null;
  readonly error: string | null;
}

export interface ProbeAnswerer {
  answer(request: ProbeAnswerRequest): Promise<ProbeAnswerResult>;
}

export interface ScreenshotProbeDependencies {
  readonly candidates?: readonly ProbeStateCandidate[];
  readonly snapshotService?: ProbeSnapshotService;
  readonly answerer?: ProbeAnswerer;
}

const effortSchema = z.enum(['low', 'medium', 'high', 'xhigh']);
const nonNegativeInteger = z.number().int().nonnegative();
const cellSchema = z.object({ column: nonNegativeInteger, row: nonNegativeInteger }).strict();
const creatureSchema = z.object({
  name: z.string().min(1), column: nonNegativeInteger, row: nonNegativeInteger,
}).strict();

const answerSchemas = {
  Q1: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q1'), creatures: z.array(creatureSchema) }).strict(),
  Q2: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q2'), creatures: z.array(creatureSchema.extend({ side: z.enum(['party', 'foe']) }).strict()) }).strict(),
  Q3: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q3'), creatures: z.array(creatureSchema.extend({ hpBand: z.enum(['uninjured', 'injured', 'critical', 'unknown']) }).strict()) }).strict(),
  Q4: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q4'), cells: z.array(cellSchema) }).strict(),
  Q5: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q5'), brightCells: z.array(cellSchema), dimCells: z.array(cellSchema), darkCells: z.array(cellSchema) }).strict(),
  Q6: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q6'), doors: z.array(cellSchema.extend({ open: z.boolean() }).strict()) }).strict(),
  Q7: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q7'), pairs: z.array(z.object({ first: creatureSchema, second: creatureSchema }).strict()) }).strict(),
  Q8: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q8'), creatures: z.array(creatureSchema) }).strict(),
  Q9: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q9'), foggedCells: z.array(cellSchema), obscuredCells: z.array(cellSchema) }).strict(),
  Q10: z.object({ version: z.literal(PROBE_VERSION), question: z.literal('Q10'), cells: z.array(cellSchema) }).strict(),
} as const;

const QUESTION_TEXT = {
  Q1: 'List every creature visible on the board with its display name and grid coordinate.',
  Q2: 'List every creature and classify it as party or foe. Include its coordinate to identify repeated names.',
  Q3: 'List every creature and its displayed HP band: uninjured, injured, critical, or unknown. Include its coordinate.',
  Q4: 'List every difficult-terrain cell.',
  Q5: 'Classify every board cell as bright, dim, or dark and list the cells in the matching arrays.',
  Q6: 'List every door cell and say whether the door is open.',
  Q7: 'List every unordered pair of creatures that are within 5 feet of each other. Include both names and coordinates.',
  Q8: 'List every creature marked as hidden from players, including its coordinate.',
  Q9: 'List fogged cells and obscured cells separately. A cell may appear in both arrays.',
  Q10: 'List every blocked cell.',
} as const satisfies Readonly<Record<ScreenshotQuestionId, string>>;

function zeroBasedColumn(value: number): ZeroBasedColumn {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Column must be a zero-based safe integer.');
  return value as ZeroBasedColumn;
}

function zeroBasedRow(value: number): ZeroBasedRow {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Row must be a zero-based safe integer.');
  return value as ZeroBasedRow;
}

function probeCell(cell: GridCell): ProbeCell {
  return { column: zeroBasedColumn(cell.column), row: zeroBasedRow(cell.row) };
}

function cellKey(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function orderedCells(cells: readonly GridCell[]): readonly ProbeCell[] {
  const unique = new Map(cells.map((cell) => [cellKey(cell), probeCell(cell)] as const));
  return [...unique.values()].sort((left, right) => left.row - right.row || left.column - right.column);
}

/** Matches the prose renderer's HP classifier in src/vtt/mcp/engine-server.ts. */
export function proseHitPointBand(hitPoints: number, maximum: number): ProseHitPointBand {
  if (maximum <= 0) return 'unknown';
  if (hitPoints >= maximum) return 'uninjured';
  return hitPoints * 4 <= maximum ? 'critical' : 'injured';
}

export function deriveScreenshotFactSheet(state: EncounterState): ScreenshotFactSheet {
  const dmView = projectDmView(state);
  const dmEncounter = dmVisibleEncounter(dmView);
  const board = projectEncounterBoard(dmView);
  const hidden = new Set(dmView.state.hiddenCombatants.map((entry) => entry.combatant));
  const visibleById = new Map(dmEncounter.combatants.map((entry) => [entry.id, entry] as const));
  const combatants = board.combatants.map((entry): FactSheetCombatant => {
    const projected = visibleById.get(entry.id);
    if (projected === undefined) throw new Error(`DM board combatant ${String(entry.id)} has no state projection.`);
    return {
      displayName: entry.name,
      cell: probeCell(entry.position),
      side: projected.kind === 'player_character' ? 'party' : 'foe',
      hpBand: proseHitPointBand(projected.hitPoints, projected.rules.hitPointMaximum),
      life: entry.life,
      hiddenFromPlayers: hidden.has(entry.id),
    };
  }).sort((left, right) => left.cell.row - right.cell.row || left.cell.column - right.cell.column ||
    left.displayName.localeCompare(right.displayName));

  const difficultTerrainCells = orderedCells([
    ...(board.difficultTerrainRegions ?? []).flatMap((region) => region.cells),
    ...board.areas.filter((area) => area.difficultTerrain).flatMap((area) => area.cells),
  ]);
  const obscuredCells = orderedCells((board.obscurementRegions ?? []).flatMap((region) => region.cells));
  const lightByCell = new Map<string, ProbeLight>();
  for (let row = 0; row < board.bounds.rows; row += 1) {
    for (let column = 0; column < board.bounds.columns; column += 1) {
      lightByCell.set(cellKey({ column, row }), 'bright');
    }
  }
  for (const region of board.environmentLightRegions ?? []) {
    const light: ProbeLight = region.level === 'darkness' ? 'dark' : region.level;
    for (const cell of region.cells) lightByCell.set(cellKey(cell), light);
  }
  const lightCells = [...lightByCell.entries()].map(([key, light]) => {
    const [columnText, rowText] = key.split(',');
    if (columnText === undefined || rowText === undefined) throw new Error(`Malformed projected cell key ${key}.`);
    return {
      column: zeroBasedColumn(Number(columnText)),
      row: zeroBasedRow(Number(rowText)),
      light,
    };
  }).sort((left, right) => left.row - right.row || left.column - right.column);
  const doors = board.worldObjects.filter((object) => object.kind === 'door').map((object) => ({
    ...probeCell(object.position),
    open: !object.blocking.movement,
  })).sort((left, right) => left.row - right.row || left.column - right.column);
  const worldObjects = board.worldObjects.map((object) => ({
    ...probeCell(object.position), name: object.name,
  })).sort((left, right) => left.row - right.row || left.column - right.column || left.name.localeCompare(right.name));
  const adjacencyPairs: Array<ScreenshotFactSheet['adjacencyPairs'][number]> = [];
  for (let firstIndex = 0; firstIndex < combatants.length; firstIndex += 1) {
    const first = combatants[firstIndex];
    if (first === undefined) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < combatants.length; secondIndex += 1) {
      const second = combatants[secondIndex];
      if (second === undefined) continue;
      const distance = Math.max(
        Math.abs(first.cell.column - second.cell.column),
        Math.abs(first.cell.row - second.cell.row),
      );
      if (distance <= 1) {
        adjacencyPairs.push({
          first: { displayName: first.displayName, cell: first.cell },
          second: { displayName: second.displayName, cell: second.cell },
        });
      }
    }
  }
  return {
    version: PROBE_VERSION,
    bounds: { ...board.bounds },
    combatants,
    difficultTerrainCells,
    obscuredCells,
    lightCells,
    foggedCells: orderedCells(board.foggedCells),
    blockedCells: orderedCells(board.blockedCells ?? []),
    doors,
    worldObjects,
    adjacencyPairs,
  };
}

function creatureLocation(combatant: FactSheetCombatant): CreatureLocation {
  return { name: combatant.displayName, ...combatant.cell };
}

export function truthAnswer(sheet: ScreenshotFactSheet, question: ScreenshotQuestionId): ProbeAnswer {
  switch (question) {
    case 'Q1': return { version: PROBE_VERSION, question, creatures: sheet.combatants.map(creatureLocation) };
    case 'Q2': return { version: PROBE_VERSION, question, creatures: sheet.combatants.map((entry) => ({ ...creatureLocation(entry), side: entry.side })) };
    case 'Q3': return { version: PROBE_VERSION, question, creatures: sheet.combatants.map((entry) => ({ ...creatureLocation(entry), hpBand: entry.hpBand })) };
    case 'Q4': return { version: PROBE_VERSION, question, cells: sheet.difficultTerrainCells };
    case 'Q5': return {
      version: PROBE_VERSION,
      question,
      brightCells: sheet.lightCells.filter((entry) => entry.light === 'bright').map(probeCell),
      dimCells: sheet.lightCells.filter((entry) => entry.light === 'dim').map(probeCell),
      darkCells: sheet.lightCells.filter((entry) => entry.light === 'dark').map(probeCell),
    };
    case 'Q6': return { version: PROBE_VERSION, question, doors: sheet.doors };
    case 'Q7': return {
      version: PROBE_VERSION,
      question,
      pairs: sheet.adjacencyPairs.map((pair) => ({
        first: { name: pair.first.displayName, ...pair.first.cell },
        second: { name: pair.second.displayName, ...pair.second.cell },
      })),
    };
    case 'Q8': return { version: PROBE_VERSION, question, creatures: sheet.combatants.filter((entry) => entry.hiddenFromPlayers).map(creatureLocation) };
    case 'Q9': return { version: PROBE_VERSION, question, foggedCells: sheet.foggedCells, obscuredCells: sheet.obscuredCells };
    case 'Q10': return { version: PROBE_VERSION, question, cells: sheet.blockedCells };
  }
}

export function parseProbeAnswer(question: ScreenshotQuestionId, rawAnswer: string): ProbeAnswer {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawAnswer) as unknown;
  } catch (error) {
    throw new TypeError('Screenshot probe answer is not JSON.', { cause: error });
  }
  const brandCell = (cell: { readonly column: number; readonly row: number }): ProbeCell => ({
    column: zeroBasedColumn(cell.column), row: zeroBasedRow(cell.row),
  });
  const brandCreature = (creature: { readonly name: string; readonly column: number; readonly row: number }): CreatureLocation => ({
    name: creature.name, ...brandCell(creature),
  });
  switch (question) {
    case 'Q1': {
      const parsed = answerSchemas.Q1.parse(decoded);
      return { ...parsed, creatures: parsed.creatures.map(brandCreature) };
    }
    case 'Q2': {
      const parsed = answerSchemas.Q2.parse(decoded);
      return { ...parsed, creatures: parsed.creatures.map((entry) => ({ ...brandCreature(entry), side: entry.side })) };
    }
    case 'Q3': {
      const parsed = answerSchemas.Q3.parse(decoded);
      return { ...parsed, creatures: parsed.creatures.map((entry) => ({ ...brandCreature(entry), hpBand: entry.hpBand })) };
    }
    case 'Q4': {
      const parsed = answerSchemas.Q4.parse(decoded);
      return { ...parsed, cells: parsed.cells.map(brandCell) };
    }
    case 'Q5': {
      const parsed = answerSchemas.Q5.parse(decoded);
      return {
        ...parsed,
        brightCells: parsed.brightCells.map(brandCell),
        dimCells: parsed.dimCells.map(brandCell),
        darkCells: parsed.darkCells.map(brandCell),
      };
    }
    case 'Q6': {
      const parsed = answerSchemas.Q6.parse(decoded);
      return { ...parsed, doors: parsed.doors.map((entry) => ({ ...brandCell(entry), open: entry.open })) };
    }
    case 'Q7': {
      const parsed = answerSchemas.Q7.parse(decoded);
      return { ...parsed, pairs: parsed.pairs.map((entry) => ({ first: brandCreature(entry.first), second: brandCreature(entry.second) })) };
    }
    case 'Q8': {
      const parsed = answerSchemas.Q8.parse(decoded);
      return { ...parsed, creatures: parsed.creatures.map(brandCreature) };
    }
    case 'Q9': {
      const parsed = answerSchemas.Q9.parse(decoded);
      return { ...parsed, foggedCells: parsed.foggedCells.map(brandCell), obscuredCells: parsed.obscuredCells.map(brandCell) };
    }
    case 'Q10': {
      const parsed = answerSchemas.Q10.parse(decoded);
      return { ...parsed, cells: parsed.cells.map(brandCell) };
    }
  }
}

interface ScorableFact {
  readonly key: string;
  readonly subject: string;
  readonly positions: readonly ProbeCell[];
  readonly classification: string | null;
}

function onePositionFact(prefix: string, subject: string, cell: ProbeCell, classification: string | null): ScorableFact {
  return {
    key: canonicalJson({ prefix, subject, column: cell.column, row: cell.row, classification }),
    subject,
    positions: [cell],
    classification,
  };
}

function factsForAnswer(answer: ProbeAnswer): readonly ScorableFact[] {
  switch (answer.question) {
    case 'Q1': return answer.creatures.map((entry) => onePositionFact('creature', entry.name, entry, null));
    case 'Q2': return answer.creatures.map((entry) => onePositionFact('side', entry.name, entry, entry.side));
    case 'Q3': return answer.creatures.map((entry) => onePositionFact('hp', entry.name, entry, entry.hpBand));
    case 'Q4': return answer.cells.map((entry) => onePositionFact('difficult', '', entry, null));
    case 'Q5': return [
      ...answer.brightCells.map((entry) => onePositionFact('light', '', entry, 'bright')),
      ...answer.dimCells.map((entry) => onePositionFact('light', '', entry, 'dim')),
      ...answer.darkCells.map((entry) => onePositionFact('light', '', entry, 'dark')),
    ];
    case 'Q6': return answer.doors.map((entry) => onePositionFact('door', '', entry, entry.open ? 'open' : 'closed'));
    case 'Q7': return answer.pairs.map((entry) => {
      const endpoints = [entry.first, entry.second].sort((left, right) =>
        left.name.localeCompare(right.name) || left.row - right.row || left.column - right.column);
      const first = endpoints[0];
      const second = endpoints[1];
      if (first === undefined || second === undefined) throw new Error('Adjacency pair lost an endpoint.');
      return {
        key: canonicalJson({ prefix: 'adjacent', endpoints }),
        subject: `${first.name}|${second.name}`,
        positions: [probeCell(first), probeCell(second)],
        classification: null,
      };
    });
    case 'Q8': return answer.creatures.map((entry) => onePositionFact('hidden', entry.name, entry, null));
    case 'Q9': return [
      ...answer.foggedCells.map((entry) => onePositionFact('visibility', '', entry, 'fogged')),
      ...answer.obscuredCells.map((entry) => onePositionFact('visibility', '', entry, 'obscured')),
    ];
    case 'Q10': return answer.cells.map((entry) => onePositionFact('blocked', '', entry, null));
  }
}

function samePositions(left: readonly ProbeCell[], right: readonly ProbeCell[]): boolean {
  return left.length === right.length && left.every((cell, index) => {
    const candidate = right[index];
    return candidate !== undefined && candidate.column === cell.column && candidate.row === cell.row;
  });
}

function rowsShiftedByOne(left: readonly ProbeCell[], right: readonly ProbeCell[]): boolean {
  return left.length === right.length && left.every((cell, index) => {
    const candidate = right[index];
    return candidate !== undefined && candidate.column === cell.column && Math.abs(candidate.row - cell.row) === 1;
  });
}

function columnsShiftedByOne(left: readonly ProbeCell[], right: readonly ProbeCell[]): boolean {
  return left.length === right.length && left.every((cell, index) => {
    const candidate = right[index];
    return candidate !== undefined && candidate.row === cell.row && Math.abs(candidate.column - cell.column) === 1;
  });
}

function detectedConfusions(answerFacts: readonly ScorableFact[], truthFacts: readonly ScorableFact[]): readonly string[] {
  const truthKeys = new Set(truthFacts.map((fact) => fact.key));
  const answerKeys = new Set(answerFacts.map((fact) => fact.key));
  const unmatchedAnswers = answerFacts.filter((fact) => !truthKeys.has(fact.key));
  const availableTruth = truthFacts.filter((fact) => !answerKeys.has(fact.key));
  const confusions: string[] = [];
  for (const answer of unmatchedAnswers) {
    const classificationIndex = availableTruth.findIndex((truth) =>
      truth.subject === answer.subject && samePositions(truth.positions, answer.positions) &&
      truth.classification !== answer.classification);
    if (classificationIndex >= 0) {
      const truth = availableTruth.splice(classificationIndex, 1)[0];
      if (truth !== undefined) confusions.push(`${truth.classification ?? 'unclassified'} read as ${answer.classification ?? 'unclassified'}`);
      continue;
    }
    const rowIndex = availableTruth.findIndex((truth) =>
      truth.subject === answer.subject && truth.classification === answer.classification &&
      rowsShiftedByOne(truth.positions, answer.positions));
    if (rowIndex >= 0) {
      availableTruth.splice(rowIndex, 1);
      confusions.push('row off by one');
      continue;
    }
    const columnIndex = availableTruth.findIndex((truth) =>
      truth.subject === answer.subject && truth.classification === answer.classification &&
      columnsShiftedByOne(truth.positions, answer.positions));
    if (columnIndex >= 0) {
      availableTruth.splice(columnIndex, 1);
      confusions.push('column off by one');
      continue;
    }
    confusions.push('fact not present');
  }
  confusions.push(...availableTruth.map(() => 'fact omitted'));
  return confusions;
}

export interface ProbeScore {
  readonly score: number;
  readonly hallucinations: number;
  readonly confusions: readonly string[];
}

export function scoreProbeAnswer(answer: ProbeAnswer, truth: ProbeAnswer): ProbeScore {
  if (answer.question !== truth.question) throw new TypeError('Cannot score answers from different question classes.');
  const answerFacts = factsForAnswer(answer);
  const truthFacts = factsForAnswer(truth);
  const answerKeys = new Set(answerFacts.map((fact) => fact.key));
  const truthKeys = new Set(truthFacts.map((fact) => fact.key));
  let intersection = 0;
  for (const key of answerKeys) if (truthKeys.has(key)) intersection += 1;
  const union = new Set([...answerKeys, ...truthKeys]).size;
  return {
    score: union === 0 ? 1 : intersection / union,
    hallucinations: [...answerKeys].filter((key) => !truthKeys.has(key)).length,
    confusions: detectedConfusions([...new Map(answerFacts.map((fact) => [fact.key, fact])).values()],
      [...new Map(truthFacts.map((fact) => [fact.key, fact])).values()]),
  };
}

export function screenshotQuestionPrompt(
  question: ScreenshotQuestionId,
  primer: PrimerMode = 'general',
  boardGlyphs: BoardGlyphMode = DEFAULT_BOARD_GLYPH_MODE,
): string {
  const questionLines = [
    `Question ${question}: ${QUESTION_TEXT[question]}`,
    'Use zero-based column,row coordinates. Column numbers and row numbers appear along the board edges.',
    'Inspect only the attached PNG. Return only JSON matching the supplied strict schema.',
  ];
  return primer === 'general'
    ? [`General primer ${PRIMER_VERSION}: ${[GENERAL_PRIMER, ...BOARD_GLYPH_PRIMER[boardGlyphs]].join(' ')}`, ...questionLines].join('\n')
    : questionLines.join('\n');
}

function scalarSchema(type: 'string' | 'integer' | 'boolean', options: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  return { type, ...options };
}

function objectSchema(properties: Readonly<Record<string, unknown>>, required = Object.keys(properties)): Readonly<Record<string, unknown>> {
  return { type: 'object', properties, required, additionalProperties: false };
}

const jsonCellSchema = objectSchema({
  column: scalarSchema('integer', { minimum: 0 }),
  row: scalarSchema('integer', { minimum: 0 }),
});
const jsonCreatureSchema = objectSchema({
  name: scalarSchema('string', { minLength: 1 }),
  column: scalarSchema('integer', { minimum: 0 }),
  row: scalarSchema('integer', { minimum: 0 }),
});

function answerHeader(question: ScreenshotQuestionId): Readonly<Record<string, unknown>> {
  return {
    version: scalarSchema('string', { const: PROBE_VERSION }),
    question: scalarSchema('string', { const: question }),
  };
}

export function probeAnswerJsonSchema(question: ScreenshotQuestionId): Readonly<Record<string, unknown>> {
  const array = (items: Readonly<Record<string, unknown>>) => ({ type: 'array', items });
  switch (question) {
    case 'Q1': return objectSchema({ ...answerHeader(question), creatures: array(jsonCreatureSchema) });
    case 'Q2': return objectSchema({ ...answerHeader(question), creatures: array(objectSchema({
      ...(jsonCreatureSchema['properties'] as Readonly<Record<string, unknown>>),
      side: scalarSchema('string', { enum: ['party', 'foe'] }),
    })) });
    case 'Q3': return objectSchema({ ...answerHeader(question), creatures: array(objectSchema({
      ...(jsonCreatureSchema['properties'] as Readonly<Record<string, unknown>>),
      hpBand: scalarSchema('string', { enum: ['uninjured', 'injured', 'critical', 'unknown'] }),
    })) });
    case 'Q4': return objectSchema({ ...answerHeader(question), cells: array(jsonCellSchema) });
    case 'Q5': return objectSchema({ ...answerHeader(question), brightCells: array(jsonCellSchema), dimCells: array(jsonCellSchema), darkCells: array(jsonCellSchema) });
    case 'Q6': return objectSchema({ ...answerHeader(question), doors: array(objectSchema({
      ...(jsonCellSchema['properties'] as Readonly<Record<string, unknown>>),
      open: scalarSchema('boolean'),
    })) });
    case 'Q7': return objectSchema({ ...answerHeader(question), pairs: array(objectSchema({ first: jsonCreatureSchema, second: jsonCreatureSchema })) });
    case 'Q8': return objectSchema({ ...answerHeader(question), creatures: array(jsonCreatureSchema) });
    case 'Q9': return objectSchema({ ...answerHeader(question), foggedCells: array(jsonCellSchema), obscuredCells: array(jsonCellSchema) });
    case 'Q10': return objectSchema({ ...answerHeader(question), cells: array(jsonCellSchema) });
  }
}

function shiftCell(cell: ProbeCell): ProbeCell {
  return { column: cell.column, row: zeroBasedRow(cell.row + 1) };
}

export function shiftedByOneRowAnswer(answer: ProbeAnswer): ProbeAnswer {
  const creature = (entry: CreatureLocation): CreatureLocation => ({ ...entry, row: zeroBasedRow(entry.row + 1) });
  switch (answer.question) {
    case 'Q1': return { ...answer, creatures: answer.creatures.map(creature) };
    case 'Q2': return { ...answer, creatures: answer.creatures.map((entry) => ({ ...creature(entry), side: entry.side })) };
    case 'Q3': return { ...answer, creatures: answer.creatures.map((entry) => ({ ...creature(entry), hpBand: entry.hpBand })) };
    case 'Q4': return { ...answer, cells: answer.cells.map(shiftCell) };
    case 'Q5': return { ...answer, brightCells: answer.brightCells.map(shiftCell), dimCells: answer.dimCells.map(shiftCell), darkCells: answer.darkCells.map(shiftCell) };
    case 'Q6': return { ...answer, doors: answer.doors.map((entry) => ({ ...shiftCell(entry), open: entry.open })) };
    case 'Q7': return { ...answer, pairs: answer.pairs.map((pair) => ({ first: creature(pair.first), second: creature(pair.second) })) };
    case 'Q8': return { ...answer, creatures: answer.creatures.map(creature) };
    case 'Q9': return { ...answer, foggedCells: answer.foggedCells.map(shiftCell), obscuredCells: answer.obscuredCells.map(shiftCell) };
    case 'Q10': return { ...answer, cells: answer.cells.map(shiftCell) };
  }
}

export function simulatedProbeAnswerer(mode: 'perfect' | 'shifted_row'): ProbeAnswerer {
  return {
    answer(request) {
      const answer = mode === 'perfect' ? request.truth : shiftedByOneRowAnswer(request.truth);
      return Promise.resolve({
        rawAnswer: canonicalJson(answer),
        wallMs: 0,
        tokens: { input: 0, cachedInput: 0, output: 0, reasoning: 0 },
        error: null,
      });
    },
  };
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function tokenUsage(value: unknown): ProbeTokenUsage | null {
  const usage = record(value);
  const input = usage?.['input_tokens'];
  const cachedInput = usage?.['cached_input_tokens'];
  const output = usage?.['output_tokens'];
  const reasoning = usage?.['reasoning_output_tokens'];
  return [input, cachedInput, output, reasoning].every((entry) => Number.isSafeInteger(entry) && (entry as number) >= 0)
    ? { input: input as number, cachedInput: cachedInput as number, output: output as number, reasoning: reasoning as number }
    : null;
}

function decodeCodexOutput(stdout: string): { readonly rawAnswer: string; readonly tokens: ProbeTokenUsage | null } {
  let rawAnswer = '';
  let tokens: ProbeTokenUsage | null = null;
  for (const line of stdout.split('\n')) {
    if (line.trim().length === 0) continue;
    const event = record(JSON.parse(line) as unknown);
    if (event === null) throw new TypeError('Codex emitted a non-object JSON event.');
    if (event['type'] === 'item.completed') {
      const item = record(event['item']);
      if (item?.['type'] === 'agent_message' && typeof item['text'] === 'string') rawAnswer = item['text'];
    }
    if (event['type'] === 'turn.completed') tokens = tokenUsage(event['usage']);
  }
  if (rawAnswer.length === 0) throw new TypeError('Codex emitted no final answer.');
  return { rawAnswer, tokens };
}

export function codexScreenshotAnswerer(): ProbeAnswerer {
  return {
    answer(request) {
      const started = performance.now();
      return new Promise<ProbeAnswerResult>((resolvePromise) => {
        const child = spawn('codex', [
          'exec',
          '-C', repositoryRoot,
          '--sandbox', 'workspace-write',
          '--json',
          '-m', request.model,
          '-i', request.imagePath,
          '--output-schema', request.schemaPath,
          '-c', `model_reasoning_effort=${JSON.stringify(request.effort)}`,
          '-c', 'approval_policy="never"',
          '-c', 'project_doc_max_bytes=0',
          '-c', 'features.plugins=false',
          '-c', 'skills.include_instructions=false',
          '-c', 'developer_instructions=""',
          '-',
        ], {
          cwd: repositoryRoot,
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, CODEX_HOME: AI_DM_CODEX_HOME },
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => { stdout += chunk; });
        child.stderr.on('data', (chunk: string) => { stderr += chunk; });
        child.once('error', (error) => resolvePromise({
          rawAnswer: stdout,
          wallMs: performance.now() - started,
          tokens: null,
          error: error instanceof Error ? error.message : String(error),
        }));
        child.once('close', (code, signal) => {
          const wallMs = performance.now() - started;
          if (code !== 0) {
            resolvePromise({
              rawAnswer: stdout,
              wallMs,
              tokens: null,
              error: `codex exited ${code === null ? `on signal ${signal ?? 'unknown'}` : `with code ${String(code)}`}: ${stderr.slice(-4_000)}`,
            });
            return;
          }
          try {
            const decoded = decodeCodexOutput(stdout);
            resolvePromise({ ...decoded, wallMs, error: null });
          } catch (error) {
            resolvePromise({
              rawAnswer: stdout,
              wallMs,
              tokens: null,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
        child.stdin.end(request.prompt);
      });
    },
  };
}

function parseModelSpec(value: string): ProbeModelSpec {
  const split = value.split(':');
  if (split.length !== 2) throw new TypeError(`Model specification ${value} must use model:effort syntax.`);
  const [model, rawEffort] = split;
  if (model === undefined || model.trim().length === 0 || rawEffort === undefined) {
    throw new TypeError(`Model specification ${value} is incomplete.`);
  }
  return { model, effort: effortSchema.parse(rawEffort) };
}

function insideRepository(path: string, label: string): string {
  const resolved = resolve(path);
  const fromRoot = relative(repositoryRoot, resolved);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
    throw new RangeError(`${label} must be inside the repository.`);
  }
  return resolved;
}

function requiredOption(values: ReadonlyMap<string, string>, option: string): string {
  const value = values.get(option);
  if (value === undefined || value.length === 0) throw new TypeError(`${option} is required.`);
  return value;
}

export function parseScreenshotProbeArgs(argv: readonly string[]): ScreenshotProbeConfig {
  const values = new Map<string, string>();
  let simulate = false;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--simulate') {
      simulate = true;
      continue;
    }
    if (!['--models', '--states', '--seed', '--images-root', '--out', '--primer', '--generation', '--compare', '--board-glyphs'].includes(option ?? '')) {
      throw new TypeError(`Unknown screenshot probe option ${option ?? '<missing>'}.`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option ?? '<missing>'} requires a value.`);
    values.set(option ?? '', value);
    index += 1;
  }
  const models = requiredOption(values, '--models').split(',').map(parseModelSpec);
  if (new Set(models.map((entry) => `${entry.model}:${entry.effort}`)).size !== models.length) {
    throw new TypeError('--models cannot contain duplicate model/effort pairs.');
  }
  const stateCount = Number(requiredOption(values, '--states'));
  const seed = Number(requiredOption(values, '--seed'));
  if (!Number.isSafeInteger(stateCount) || stateCount < 1) throw new RangeError('--states must be a positive safe integer.');
  if (!Number.isSafeInteger(seed)) throw new RangeError('--seed must be a safe integer.');
  const imagesRoot = insideRepository(requiredOption(values, '--images-root'), '--images-root');
  if (!basename(imagesRoot).endsWith('-images')) throw new RangeError('--images-root basename must end in -images.');
  const outPath = insideRepository(requiredOption(values, '--out'), '--out');
  if (!outPath.endsWith('.jsonl')) throw new RangeError('--out must end in .jsonl.');
  const summaryPath = outPath.slice(0, -'.jsonl'.length) + '-summary.md';
  const primerValue = values.get('--primer') ?? 'general';
  if (primerValue !== 'none' && primerValue !== 'general') {
    throw new TypeError('--primer must be none or general.');
  }
  const generation = requiredOption(values, '--generation');
  const compareValue = values.get('--compare');
  const comparePath = compareValue === undefined ? null : insideRepository(compareValue, '--compare');
  if (comparePath !== null && !comparePath.endsWith('.jsonl')) throw new RangeError('--compare must end in .jsonl.');
  const boardGlyphs = values.get('--board-glyphs') ?? DEFAULT_BOARD_GLYPH_MODE;
  if (!isBoardGlyphMode(boardGlyphs)) throw new TypeError('--board-glyphs must be none, light or full.');
  return {
    models,
    stateCount,
    seed,
    imagesRoot,
    outPath,
    summaryPath,
    simulate,
    primer: primerValue,
    generation,
    comparePath,
    boardGlyphs,
  };
}

function vanePlayers(): readonly CombatantProfile[] {
  const referencePlayers = referenceEncounterSetup().combatants.filter((profile) => profile.kind === 'player_character');
  const template = referencePlayers[0];
  if (template === undefined || template.kind !== 'player_character') throw new Error('Reference party has no player template.');
  return [
    ...referencePlayers,
    { ...template, id: combatantId('combatant:vane-probe-four'), tokenId: tokenId('token:vane-probe-four'), name: 'Vane Probe Four', characterId: 4 },
    { ...template, id: combatantId('combatant:vane-probe-five'), tokenId: tokenId('token:vane-probe-five'), name: 'Vane Probe Five', characterId: 5 },
  ];
}

async function arenaSavePaths(directory: string): Promise<readonly string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (record(error)?.['code'] === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(entries.map(async (entry): Promise<readonly string[]> => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return arenaSavePaths(path);
    return entry.isFile() && entry.name.endsWith('.vtt.json') && path.toLowerCase().includes('arena')
      ? [path]
      : [];
  }));
  return nested.flat().sort();
}

async function persistedArenaCandidates(): Promise<readonly ProbeStateCandidate[]> {
  const paths = await arenaSavePaths(join(repositoryRoot, 'dnd-slim-runs'));
  return Promise.all(paths.map(async (path, index): Promise<ProbeStateCandidate> => {
    const store = new MemoryBrowserSessionStore();
    const sessionId = importSavedSession(store, await readFile(path, 'utf8'));
    const resumed = EncounterSessionJournal.resume(sessionId, store, new MemoryMirrorSink());
    return { id: `arena-session-${String(index + 1)}-${basename(path, '.vtt.json')}`, state: resumed.encounterState };
  }));
}

export async function defaultProbeStateCandidates(): Promise<readonly ProbeStateCandidate[]> {
  const [small, maximum, persisted, watabouBytes] = await Promise.all([
    loadArenaFixture(join(repositoryRoot, 'tests/fixtures/arena-basis-brutal/seed-6203002.json')),
    loadArenaFixture(join(repositoryRoot, 'tests/fixtures/arena-basis-brutal/seed-6203004.json')),
    persistedArenaCandidates(),
    readFile(join(repositoryRoot, 'tests/fixtures/watabou/one-page-dungeon-sample.json'), 'utf8'),
  ]);
  const required: ProbeStateCandidate[] = [
    { id: 'arena-brutal-6203002', state: small },
    { id: 'arena-brutal-6203004', state: maximum },
  ];
  if (persisted.length > 0) return [...required, ...persisted];
  const reference = createEncounter(referenceEncounterSetup());
  const referenceWithHidden: EncounterState = {
    ...reference,
    hiddenCombatants: [{ combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: reference.rulesEdition }],
  };
  return [
    ...required,
    { id: 'reference-hidden', state: referenceWithHidden },
    { id: 'vane-warren-cinder-rite', state: createVaneWarrenFight('cinder-rite', vanePlayers()).encounter },
    { id: 'watabou-generated-bounds', state: adaptWatabouDungeon(JSON.parse(watabouBytes) as unknown, { seed: 6203003 }).state },
    { id: 'generated-bounds-24x24', state: generateRoom(6203001, { dimensions: { columns: 24, rows: 24 }, difficulty: 'brutal' }).encounter.state },
  ];
}

function shuffledCandidates(candidates: readonly ProbeStateCandidate[], seed: number): readonly ProbeStateCandidate[] {
  const shuffled = [...candidates];
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap]!, shuffled[index]!];
  }
  return shuffled;
}

function boardSource(state: EncounterState, room: number): BoardImageSource {
  return { room, round: state.round, revision: state.revision, stateDigest: boardStateDigest(state) };
}

async function writeSchemas(directory: string): Promise<Readonly<Record<ScreenshotQuestionId, string>>> {
  const schemaDirectory = join(directory, 'probe-schemas');
  await mkdir(schemaDirectory, { recursive: true });
  const entries = await Promise.all(SCREENSHOT_QUESTION_IDS.map(async (question) => {
    const path = join(schemaDirectory, `${question.toLowerCase()}.schema.json`);
    await writeFile(path, `${canonicalJson(probeAnswerJsonSchema(question))}\n`, 'utf8');
    return [question, path] as const;
  }));
  return Object.fromEntries(entries) as Readonly<Record<ScreenshotQuestionId, string>>;
}

async function mapConcurrent<Input, Output>(
  inputs: readonly Input[],
  concurrency: number,
  work: (input: Input) => Promise<Output>,
): Promise<readonly Output[]> {
  const outputs: Output[] = new Array(inputs.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, inputs.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= inputs.length) return;
      const input = inputs[index];
      if (input === undefined) throw new Error('Concurrent probe queue lost an input.');
      outputs[index] = await work(input);
    }
  });
  await Promise.all(workers);
  return outputs;
}

interface ProbeTask {
  readonly candidate: ProbeStateCandidate;
  readonly artifact: BoardImageArtifact;
  readonly model: ProbeModelSpec;
  readonly question: ScreenshotQuestionId;
  readonly truth: ProbeAnswer;
}

async function runTask(
  task: ProbeTask,
  answerer: ProbeAnswerer,
  schemas: Readonly<Record<ScreenshotQuestionId, string>>,
  imagesRoot: string,
  primer: PrimerMode,
  generation: string,
  boardGlyphs: BoardGlyphMode,
): Promise<ScreenshotProbeRow> {
  const result = await answerer.answer({
    ...task.model,
    question: task.question,
    prompt: screenshotQuestionPrompt(task.question, primer, boardGlyphs),
    schemaPath: schemas[task.question],
    imagePath: join(imagesRoot, task.artifact.relativePath),
    truth: task.truth,
  });
  const base = {
    version: ROW_VERSION,
    stateId: task.candidate.id,
    stateDigest: task.artifact.source.stateDigest,
    model: task.model.model,
    effort: task.model.effort,
    question: task.question,
    promptVersion: PROBE_VERSION,
    primerVersion: primer === 'general' ? PRIMER_VERSION : null,
    generation,
    boardGlyphs,
    png: {
      sha256: task.artifact.sha256,
      relativePath: task.artifact.relativePath,
      width: task.artifact.width,
      height: task.artifact.height,
    },
    wallMs: result.wallMs,
    tokens: result.tokens,
    truth: task.truth,
    rawAnswer: result.rawAnswer,
  } as const;
  if (result.error !== null) {
    return { ...base, outcome: 'call_error', score: 0, hallucinations: 0, confusions: ['call error'], answer: null, error: result.error };
  }
  let answer: ProbeAnswer;
  try {
    answer = parseProbeAnswer(task.question, result.rawAnswer);
  } catch (error) {
    return {
      ...base,
      outcome: 'schema_rejected',
      score: 0,
      hallucinations: 0,
      confusions: ['schema rejected'],
      answer: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const score = scoreProbeAnswer(answer, task.truth);
  return { ...base, outcome: 'answered', ...score, answer, error: null };
}

interface ClassSummary {
  readonly question: ScreenshotQuestionId;
  readonly accuracy: number;
  readonly hallucinations: number;
  readonly confusions: readonly string[];
  readonly passes: boolean;
  readonly deltaVsPrevious: number | null;
}

export interface ComparisonProbeRow {
  readonly stateId: string;
  readonly stateDigest: string;
  readonly model: string;
  readonly effort: ProbeEffort;
  readonly question: ScreenshotQuestionId;
  readonly score: number;
}

const comparisonProbeRowSchema = z.object({
  stateId: z.string().min(1),
  stateDigest: z.string().min(1),
  model: z.string().min(1),
  effort: effortSchema,
  question: z.enum(SCREENSHOT_QUESTION_IDS),
  score: z.number().min(0).max(1),
}).passthrough();

function topConfusions(rows: readonly ScreenshotProbeRow[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const confusion of rows.flatMap((row) => row.confusions)) {
    counts.set(confusion, (counts.get(confusion) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([confusion, count]) => `${confusion} (${String(count)})`);
}

function classSummaries(
  rows: readonly ScreenshotProbeRow[],
  previousRows: readonly ComparisonProbeRow[] | null = null,
): readonly ClassSummary[] {
  return SCREENSHOT_QUESTION_IDS.map((question) => {
    const selected = rows.filter((row) => row.question === question);
    if (selected.length === 0) throw new Error(`Summary has no rows for ${question}.`);
    const accuracy = selected.reduce((sum, row) => sum + row.score, 0) / selected.length;
    const previousSelected = previousRows?.filter((row) => row.question === question) ?? null;
    if (previousSelected !== null && previousSelected.length === 0) {
      throw new Error(`Previous summary has no rows for ${question}.`);
    }
    const previousAccuracy = previousSelected === null
      ? null
      : previousSelected.reduce((sum, row) => sum + row.score, 0) / previousSelected.length;
    return {
      question,
      accuracy,
      hallucinations: selected.reduce((sum, row) => sum + row.hallucinations, 0),
      confusions: accuracy < PASS_THRESHOLD ? topConfusions(selected) : [],
      passes: accuracy >= PASS_THRESHOLD,
      deltaVsPrevious: previousAccuracy === null ? null : accuracy - previousAccuracy,
    };
  }).sort((left, right) => left.accuracy - right.accuracy || left.question.localeCompare(right.question));
}

function groupedRows<Row extends Pick<ComparisonProbeRow, 'model' | 'effort'>>(
  rows: readonly Row[],
): ReadonlyMap<string, readonly Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.model}:${row.effort}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

function comparisonKey(row: ComparisonProbeRow): string {
  return canonicalJson({
    model: row.model,
    effort: row.effort,
    stateId: row.stateId,
    stateDigest: row.stateDigest,
    question: row.question,
  });
}

function assertComparableRuns(
  rows: readonly ScreenshotProbeRow[],
  previousRows: readonly ComparisonProbeRow[],
): void {
  const keys = rows.map(comparisonKey);
  const previousKeys = previousRows.map(comparisonKey);
  if (new Set(keys).size !== keys.length) throw new TypeError('Current run has duplicate model/state/question rows.');
  if (new Set(previousKeys).size !== previousKeys.length) throw new TypeError('Previous run has duplicate model/state/question rows.');
  const ordered = [...keys].sort();
  const previousOrdered = [...previousKeys].sort();
  if (canonicalJson(ordered) !== canonicalJson(previousOrdered)) {
    throw new TypeError('--compare requires the same models, efforts, states, and questions as the current run.');
  }
}

async function readComparisonRows(path: string): Promise<readonly ComparisonProbeRow[]> {
  const lines = (await readFile(path, 'utf8')).split('\n').filter((line) => line.trim().length > 0);
  return lines.map((line, index) => {
    try {
      return comparisonProbeRowSchema.parse(JSON.parse(line) as unknown);
    } catch (error) {
      throw new TypeError(`Invalid comparison row ${String(index + 1)} in ${path}.`, { cause: error });
    }
  });
}

export function strictProbeGate(rows: readonly ScreenshotProbeRow[]): boolean {
  const groups = groupedRows(rows);
  return groups.size > 0 && [...groups.values()].every((group) =>
    classSummaries(group).every((summary) => summary.passes));
}

export function renderProbeSummary(
  rows: readonly ScreenshotProbeRow[],
  previousRows: readonly ComparisonProbeRow[] | null = null,
): string {
  if (previousRows !== null) assertComparableRuns(rows, previousRows);
  const groups = new Map<string, ScreenshotProbeRow[]>();
  for (const row of rows) {
    const key = `${row.model}:${row.effort}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const lines = [
    '# D519 screenshot comprehension probe',
    '',
    `Pass criterion: every question class has mean Jaccard accuracy >= ${PASS_THRESHOLD.toFixed(1)}.`,
    '',
    `Board glyphs: ${[...new Set(rows.map((row) => row.boardGlyphs))].sort().join(', ')}.`,
    '',
  ];
  for (const [key, group] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const previousGroup = previousRows === null ? null : groupedRows(previousRows).get(key) ?? null;
    if (previousRows !== null && previousGroup === null) throw new Error(`Previous run has no ${key} rows.`);
    const summaries = classSummaries(group, previousGroup);
    const allPass = summaries.every((entry) => entry.passes);
    const deltaHeading = previousRows === null ? '' : ' Delta vs previous run |';
    const deltaDivider = previousRows === null ? '' : '---:|';
    lines.push(`## ${key}`, '', `Strict all classes >= 0.9: **${allPass ? 'PASS' : 'FAIL'}**`, '',
      `| Class | Mean Jaccard |${deltaHeading} Hallucinations | Three most common confusions | Gate |`,
      `|---|---:|${deltaDivider}---:|---|---|`);
    for (const summary of summaries) {
      const delta = summary.deltaVsPrevious === null
        ? ''
        : ` ${summary.deltaVsPrevious >= 0 ? '+' : ''}${summary.deltaVsPrevious.toFixed(3)} |`;
      lines.push(`| ${summary.question} | ${summary.accuracy.toFixed(3)} |${delta} ${String(summary.hallucinations)} | ${summary.confusions.join('; ') || '—'} | ${summary.passes ? 'PASS' : 'FAIL'} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export async function runScreenshotProbe(
  config: ScreenshotProbeConfig,
  dependencies: ScreenshotProbeDependencies = {},
): Promise<readonly ScreenshotProbeRow[]> {
  const comparisonRows = config.comparePath === null ? null : await readComparisonRows(config.comparePath);
  const candidates = dependencies.candidates ?? await defaultProbeStateCandidates();
  if (config.stateCount > candidates.length) {
    throw new RangeError(`Requested ${String(config.stateCount)} states, but only ${String(candidates.length)} are available.`);
  }
  await Promise.all([
    mkdir(config.imagesRoot, { recursive: true }),
    mkdir(resolve(config.outPath, '..'), { recursive: true }),
  ]);
  await writeFile(config.outPath, '', 'utf8');
  const schemas = await writeSchemas(config.imagesRoot);
  const selected = shuffledCandidates(candidates, config.seed).slice(0, config.stateCount);
  const ownedService = dependencies.snapshotService === undefined
    ? await BoardSnapshotService.start({ outputDirectory: config.imagesRoot, boardGlyphs: config.boardGlyphs })
    : null;
  const snapshotService = dependencies.snapshotService ?? ownedService;
  if (snapshotService === null) throw new Error('Screenshot probe has no snapshot service.');
  const answerer = dependencies.answerer ?? (config.simulate
    ? simulatedProbeAnswerer('perfect')
    : codexScreenshotAnswerer());
  try {
    const captured: Array<{ readonly candidate: ProbeStateCandidate; readonly artifact: BoardImageArtifact; readonly sheet: ScreenshotFactSheet }> = [];
    for (let index = 0; index < selected.length; index += 1) {
      const candidate = selected[index];
      if (candidate === undefined) throw new Error('Selected screenshot state vanished.');
      const source = boardSource(candidate.state, index + 1);
      const artifact = await snapshotService.capture({ state: candidate.state, source });
      captured.push({ candidate, artifact, sheet: deriveScreenshotFactSheet(candidate.state) });
    }
    const tasks = captured.flatMap(({ candidate, artifact, sheet }) =>
      config.models.flatMap((model) => SCREENSHOT_QUESTION_IDS.map((question): ProbeTask => ({
        candidate, artifact, model, question, truth: truthAnswer(sheet, question),
      }))));
    const rows = await mapConcurrent(tasks, config.simulate ? tasks.length : REAL_CALL_CONCURRENCY,
      (task) => runTask(task, answerer, schemas, config.imagesRoot, config.primer, config.generation, config.boardGlyphs));
    for (const row of rows) await appendFile(config.outPath, `${canonicalJson(row)}\n`, 'utf8');
    await writeFile(config.summaryPath, renderProbeSummary(rows, comparisonRows), 'utf8');
    return rows;
  } finally {
    await ownedService?.close();
  }
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/ai-dm-screenshot-probe.ts') || argument.endsWith('\\ai-dm-screenshot-probe.ts'));
  const argv = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  const config = parseScreenshotProbeArgs(argv);
  const rows = await runScreenshotProbe(config);
  process.stdout.write(renderProbeSummary(rows));
}

const invokedPath = process.argv[1];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  import.meta.url === pathToFileURL(invokedPath).href ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    process.argv.includes('--models') && process.argv.includes('--states'))
)) {
  await main();
}
