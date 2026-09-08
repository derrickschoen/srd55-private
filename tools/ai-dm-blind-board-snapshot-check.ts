import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser } from '@playwright/test';
import type { EncounterState } from '../src/combat/encounter';
import { terrainWallCells } from '../src/combat/terrain';
import { projectDmView } from '../src/combat/visibility';
import { projectEncounterBoard, projectEncounterTerrainCells } from '../src/vtt/encounter-board';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import {
  BLIND_STATE_PRIMER_VERSION,
  BOARD_SNAPSHOT_IMAGE_ROLES,
  BoardSnapshotService,
  boardSnapshotVisualDescriptor,
  boardStateDigest,
  type BoardImageArtifact,
  type BoardImageSource,
  type BoardSnapshotImageRole,
} from './ai-dm-board-snapshot';

function sourceFor(state: EncounterState): BoardImageSource {
  return {
    room: 1,
    round: state.round,
    revision: state.revision,
    stateDigest: boardStateDigest(state),
  };
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function placedCombatants(state: EncounterState): number {
  return projectEncounterBoard(projectDmView(state)).combatants.filter(
    (combatant) => combatant.placementStatus === 'placed',
  ).length;
}

export function inspectBlindBoardSnapshotFamily(
  state: EncounterState,
  artifacts: readonly BoardImageArtifact[],
): void {
  requireCondition(artifacts.length === BOARD_SNAPSHOT_IMAGE_ROLES.length, 'Image family omitted a role.');
  requireCondition(new Set(artifacts.map((artifact) => artifact.sha256)).size === artifacts.length,
    'Independent image roles unexpectedly produced identical PNGs.');
  for (const [index, artifact] of artifacts.entries()) {
    const blind = artifact.blindState;
    requireCondition(blind !== undefined, 'State-only artifact omitted blind metadata.');
    if (blind === undefined) continue;
    requireCondition(blind.role === BOARD_SNAPSHOT_IMAGE_ROLES[index], 'Image role order changed.');
    requireCondition(blind.ordinal === index + 1, 'Image ordinal does not match delivery order.');
    requireCondition(blind.primerVersion === BLIND_STATE_PRIMER_VERSION, 'Primer version changed.');
    requireCondition(blind.glyphMode === 'full', 'State-only visual lost full glyphs.');
    requireCondition(blind.captureTilePx === 128, 'State-only visual lost its 128-pixel scale.');
    requireCondition(artifact.source.stateDigest === boardStateDigest(state), 'Image digest binding changed.');
    requireCondition(artifact.source.revision === state.revision, 'Image revision binding changed.');
    requireCondition(blind.domEvidence.optionSurfaceAbsent, 'Image contains an option surface.');
    requireCondition(blind.domEvidence.nextEventPreviewAbsent, 'Image contains a next-event preview.');
    requireCondition(artifact.bytes > 0 && artifact.bytes <= 1_000_000, 'Image violates its byte cap.');
    requireCondition(JSON.stringify(boardSnapshotVisualDescriptor(artifact)).includes(blind.role),
      'Neutral visual descriptor omitted its role.');
  }

  const dm = artifacts[0]?.blindState?.domEvidence;
  if (dm === undefined) throw new Error('DM image omitted DOM evidence.');
  const creatureCount = placedCombatants(state);
  requireCondition(dm.coordinateLabels === 2 * (state.bounds.columns + state.bounds.rows),
    'DM image omitted coordinate gutters.');
  requireCondition(dm.creatureBadges === creatureCount, 'DM image badge count differs from state.');
  requireCondition(dm.rosterEntries === creatureCount, 'DM image roster differs from state.');
  requireCondition(dm.hpBars === creatureCount, 'DM image HP bars differ from state.');
  requireCondition(dm.legendEntries > 0, 'DM image omitted its legend.');
  const wallCells = terrainWallCells(state).length;
  const projectedTerrain = projectEncounterTerrainCells(state.bounds, state);
  const halfCoverCells = projectedTerrain.filter((cell) => cell.kind === 'half_cover').length;
  const threeQuartersCoverCells = projectedTerrain.filter(
    (cell) => cell.kind === 'three_quarters_cover',
  ).length;
  requireCondition(
    dm.wallCells === wallCells,
    `DM image wall cells differ from state: DOM ${String(dm.wallCells)}, state ${String(wallCells)}.`,
  );
  requireCondition(
    dm.halfCoverCells === halfCoverCells,
    `DM image half-cover cells differ from state: DOM ${String(dm.halfCoverCells)}, state ${String(halfCoverCells)}.`,
  );
  requireCondition(
    dm.threeQuartersCoverCells === threeQuartersCoverCells,
    `DM image three-quarters-cover cells differ from state: DOM ${String(dm.threeQuartersCoverCells)}, state ${String(threeQuartersCoverCells)}.`,
  );
  requireCondition(
    dm.wallCells >= state.blockedCells.length,
    `DM image wall cell count ${String(dm.wallCells)} is smaller than blocked cell count ${String(state.blockedCells.length)}.`,
  );
  requireCondition(
    dm.difficultCells === state.environment.difficultTerrainRegions.reduce(
      (total, region) => total + region.cells.length,
      0,
    ),
    'DM image difficult terrain differs from state.',
  );
  requireCondition(
    dm.obscuredCells === state.environment.obscurementRegions.reduce(
      (total, region) => total + region.cells.length,
      0,
    ),
    'DM image obscurement differs from state.',
  );
  requireCondition(
    dm.illuminatedCells === state.environment.lightRegions.reduce(
      (total, region) => total + region.cells.length,
      0,
    ),
    'DM image light cells differ from state.',
  );
  requireCondition(dm.fogMarks === state.foggedCells.length, 'DM image fog differs from state.');
  requireCondition(dm.objects >= state.worldObjects.length, 'DM image omitted world-object footprints.');
  requireCondition(dm.doors === state.worldObjects.filter((object) => object.kind === 'door').length,
    'DM image doors differ from state.');
  requireCondition(dm.hiddenMarks === projectEncounterBoard(projectDmView(state)).combatants.filter(
    (combatant) => combatant.placementStatus === 'placed' && combatant.hiddenFromPlayers,
  ).length,
    'DM image hidden marks differ from state.');

  const accessible = artifacts[1]?.blindState?.domEvidence;
  if (accessible === undefined) throw new Error('Accessible raster omitted DOM evidence.');
  requireCondition(accessible.rosterEntries === 0 && accessible.coordinateLabels === 0,
    'Accessible raster unexpectedly used the graphical DM chrome.');

  const player = artifacts[2]?.blindState?.domEvidence;
  if (player === undefined) throw new Error('Player image omitted DOM evidence.');
  requireCondition(
    player.coordinateLabels === 0 && player.creatureBadges === 0 && player.rosterEntries === 0 &&
      player.hpBars === 0 && player.legendEntries === 0,
    'Player projection received DM-only chrome.',
  );
}

export const BLIND_BOARD_SNAPSHOT_FIXTURES = Object.freeze([
  {
    difficulty: 'hard',
    seed: 5_117_001,
    path: 'tests/fixtures/arena-basis-hard/seed-5117001.json',
  },
  {
    difficulty: 'brutal',
    seed: 6_203_001,
    path: 'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  },
] as const);

type BlindBoardSnapshotFixture = typeof BLIND_BOARD_SNAPSHOT_FIXTURES[number];

export interface BlindBrowserCheckResult {
  readonly outputDirectory: string;
  readonly manifestPath: string | null;
  readonly primerVersion: string;
  readonly captureTilePx: number;
  readonly results: readonly {
    readonly difficulty: BlindBoardSnapshotFixture['difficulty'];
    readonly seed: number;
    readonly revision: number;
    readonly stateDigest: string;
    readonly images: readonly {
      readonly role: 'dm_board' | 'accessible_board_raster' | 'player_board';
      readonly ordinal: number;
      readonly sha256: string;
      readonly bytes: number;
      readonly width: number;
      readonly height: number;
      readonly path: string;
    }[];
  }[];
}

export interface CapturedBlindBoardSnapshotFamily {
  readonly fixture: BlindBoardSnapshotFixture;
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly artifacts: readonly BoardImageArtifact[];
}

export interface PreparedBlindBoardSnapshotFixture {
  readonly fixture: BlindBoardSnapshotFixture;
  readonly state: EncounterState;
  readonly source: BoardImageSource;
}

export async function prepareBlindBoardSnapshotFixture(
  fixture: BlindBoardSnapshotFixture,
): Promise<PreparedBlindBoardSnapshotFixture> {
  const state = await loadArenaFixture(fixture.path);
  return { fixture, state, source: sourceFor(state) };
}

export async function capturePreparedBlindBoardSnapshotRoles(
  service: BoardSnapshotService,
  prepared: PreparedBlindBoardSnapshotFixture,
  roles: readonly BoardSnapshotImageRole[],
  firstOrdinal: number,
): Promise<readonly BoardImageArtifact[]> {
  return service.captureSynchronized({
    state: prepared.state,
    source: prepared.source,
    roles,
    firstOrdinal,
  });
}

export async function warmPreparedBlindBoardSnapshot(
  service: BoardSnapshotService,
  prepared: PreparedBlindBoardSnapshotFixture,
): Promise<void> {
  await service.warm({
    state: prepared.state,
    source: prepared.source,
    role: 'dm_board',
  });
}

export async function captureWarmedPreparedBlindBoardSnapshot(
  service: BoardSnapshotService,
  prepared: PreparedBlindBoardSnapshotFixture,
  role: BoardSnapshotImageRole,
  visualOrdinal: number,
): Promise<readonly BoardImageArtifact[]> {
  return [await service.captureWarmed({
    state: prepared.state,
    source: prepared.source,
    role,
  }, visualOrdinal)];
}

export function completeBlindBoardSnapshotFamily(
  prepared: PreparedBlindBoardSnapshotFixture,
  artifacts: readonly BoardImageArtifact[],
): CapturedBlindBoardSnapshotFamily {
  return { ...prepared, artifacts };
}

export async function captureBlindBoardSnapshotFixture(
  service: BoardSnapshotService,
  fixture: BlindBoardSnapshotFixture,
): Promise<CapturedBlindBoardSnapshotFamily> {
  const prepared = await prepareBlindBoardSnapshotFixture(fixture);
  const artifacts = await capturePreparedBlindBoardSnapshotRoles(
    service,
    prepared,
    BOARD_SNAPSHOT_IMAGE_ROLES,
    1,
  );
  return completeBlindBoardSnapshotFamily(prepared, artifacts);
}

export async function startInProcessBlindBoardSnapshotService(
  outputDirectory: string,
  browser: Browser,
): Promise<BoardSnapshotService> {
  return BoardSnapshotService.startInProcess({
    outputDirectory,
    informationMode: 'blind_state',
    boardGlyphs: 'full',
    captureTilePx: 128,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
  }, browser);
}

export function inspectCapturedBlindBoardSnapshotFamily(
  family: CapturedBlindBoardSnapshotFamily,
): void {
  inspectBlindBoardSnapshotFamily(family.state, family.artifacts);
}

export function blindBoardSnapshotResult(
  outputDirectory: string,
  families: readonly CapturedBlindBoardSnapshotFamily[],
  manifestPath: string | null = null,
): BlindBrowserCheckResult {
  return {
    outputDirectory,
    manifestPath,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
    captureTilePx: 128,
    results: families.map(({ fixture, source, artifacts }) => ({
      difficulty: fixture.difficulty,
      seed: fixture.seed,
      revision: source.revision,
      stateDigest: source.stateDigest,
      images: artifacts.map((artifact) => {
        const blind = artifact.blindState;
        if (blind === undefined) throw new Error('State-only artifact omitted blind metadata.');
        return {
          role: blind.role,
          ordinal: blind.ordinal,
          sha256: artifact.sha256,
          bytes: artifact.bytes,
          width: artifact.width,
          height: artifact.height,
          path: resolve(outputDirectory, artifact.relativePath),
        };
      }),
    })),
  };
}

export async function runBlindBoardSnapshotCheck(
  outputDirectory: string,
): Promise<BlindBrowserCheckResult> {
  const service = await BoardSnapshotService.start({
    outputDirectory,
    informationMode: 'blind_state',
    boardGlyphs: 'full',
    captureTilePx: 128,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
  });

  try {
    const families: CapturedBlindBoardSnapshotFamily[] = [];
    for (const fixture of BLIND_BOARD_SNAPSHOT_FIXTURES) {
      const family = await captureBlindBoardSnapshotFixture(service, fixture);
      inspectBlindBoardSnapshotFamily(family.state, family.artifacts);
      families.push(family);
    }
    return blindBoardSnapshotResult(outputDirectory, families, service.manifestPath);
  } finally {
    await service.close();
  }
}

const entrypoint = process.argv[1];
const invokedByViteNode = entrypoint !== undefined && basename(entrypoint) === 'vite-node';
if (invokedByViteNode ||
  (entrypoint !== undefined && resolve(entrypoint) === fileURLToPath(import.meta.url))) {
  const outputArgument = process.argv[2];
  if (outputArgument === undefined) {
    throw new Error('Usage: ai-dm-blind-board-snapshot-check.ts <artifact-directory-images>');
  }
  const outputDirectory = resolve(outputArgument);
  const result = await runBlindBoardSnapshotCheck(outputDirectory);
  process.stdout.write(`BLIND_BOARD_SNAPSHOT_RESULT ${JSON.stringify(result)}\n`);
}
