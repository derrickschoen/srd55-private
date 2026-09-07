import { resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import { projectDmView } from '../src/combat/visibility';
import { projectEncounterBoard } from '../src/vtt/encounter-board';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import {
  BLIND_STATE_PRIMER_VERSION,
  BOARD_SNAPSHOT_IMAGE_ROLES,
  BoardSnapshotService,
  boardSnapshotVisualDescriptor,
  boardStateDigest,
  type BoardImageArtifact,
  type BoardImageSource,
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

function inspectFamily(
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
  requireCondition(dm.blockedCells === state.blockedCells.length, 'DM image blocked cells differ from state.');
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

const outputArgument = process.argv[2];
if (outputArgument === undefined) {
  throw new Error('Usage: ai-dm-blind-board-snapshot-check.ts <artifact-directory-images>');
}
const outputDirectory = resolve(outputArgument);
const fixtures = [
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
] as const;
const service = await BoardSnapshotService.start({
  outputDirectory,
  informationMode: 'blind_state',
  boardGlyphs: 'full',
  captureTilePx: 128,
  primerVersion: BLIND_STATE_PRIMER_VERSION,
});

try {
  const results = [];
  for (const fixture of fixtures) {
    const state = await loadArenaFixture(fixture.path);
    const source = sourceFor(state);
    const artifacts = await service.captureSynchronized({
      state,
      source,
      roles: BOARD_SNAPSHOT_IMAGE_ROLES,
    });
    inspectFamily(state, artifacts);
    results.push({
      difficulty: fixture.difficulty,
      seed: fixture.seed,
      revision: source.revision,
      stateDigest: source.stateDigest,
      images: artifacts.map((artifact) => ({
        role: artifact.blindState?.role,
        ordinal: artifact.blindState?.ordinal,
        sha256: artifact.sha256,
        bytes: artifact.bytes,
        width: artifact.width,
        height: artifact.height,
        path: resolve(outputDirectory, artifact.relativePath),
      })),
    });
  }
  process.stdout.write(`BLIND_BOARD_SNAPSHOT_RESULT ${JSON.stringify({
    outputDirectory,
    manifestPath: service.manifestPath,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
    captureTilePx: 128,
    results,
  })}\n`);
} finally {
  await service.close();
}
