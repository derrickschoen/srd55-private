import { describe, expect, it } from 'vitest';
import { readFile } from '../../helpers/test-filesystem-promises';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { EncounterState } from '../../../src/combat/encounter';
import { projectDmView } from '../../../src/combat/visibility';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import { encounterBoardRenderModel, projectEncounterBoard } from '../../../src/vtt/encounter-board';
import {
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  importSavedSession,
  EncounterSessionJournal,
} from '../../../src/vtt/session-persistence';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import {
  assertBoardImageFresh,
  boardSnapshotCaptureGeometry,
  boardStateDigest,
  configuredPreviewPort,
  createBoardSnapshotSessionBundle,
  type BoardImageArtifact,
  type BoardImageSource,
} from '../../../tools/ai-dm-board-snapshot';

const CONTROL_FIXTURES = Array.from(
  { length: 10 },
  (_unused, index) => `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`,
);

function sourceFor(state: EncounterState, room = 1): BoardImageSource {
  return {
    room,
    round: state.round,
    revision: state.revision,
    stateDigest: boardStateDigest(state),
  };
}

function movedState(state: EncounterState): EncounterState {
  const first = state.tokens[0];
  if (first === undefined) throw new Error('Fixture has no token to move.');
  return {
    ...state,
    tokens: state.tokens.map((token, index) => index === 0
      ? {
          ...token,
          position: {
            column: Math.min(token.position.column + 1, state.bounds.columns - 1),
            row: token.position.row,
          },
        }
      : token),
  };
}

describe('AI DM board snapshot contracts', () => {
  it('isolates its preview port from the Playwright worker pool', () => {
    expect(configuredPreviewPort({ PLAYWRIGHT_PORT: '4650' })).toBe(0);
    expect(configuredPreviewPort({
      PLAYWRIGHT_PORT: '4650',
      BOARD_SNAPSHOT_PREVIEW_PORT: '4750',
    })).toBe(4_750);
  });

  it('derives the CSS tile, marker height, and default from capture scale', () => {
    expect(boardSnapshotCaptureGeometry(64)).toEqual({
      tileSizeCssPx: 64,
      markerHeightCssPx: 640,
    });
    expect(boardSnapshotCaptureGeometry()).toEqual({
      tileSizeCssPx: 128,
      markerHeightCssPx: 1_280,
    });
  });

  it.each(CONTROL_FIXTURES)('renders generated bounds and every mechanical terrain cell for %s', async (path) => {
    const state = await loadArenaFixture(path);
    const projection = projectEncounterBoard(projectDmView(state));
    const art = encounterArtForBoard(projection);
    const cells = encounterBoardRenderModel(projection, art);

    expect(art.room).toMatchObject(state.bounds);
    expect(art.id).toBe(`encounter-art:generated-${String(state.bounds.columns)}x${String(state.bounds.rows)}:v1`);
    expect(art.terrain).toEqual([]);
    expect(cells).toHaveLength(state.bounds.columns * state.bounds.rows);
    expect(cells.flatMap((cell) => cell.mechanicalLayers).filter((layer) => layer.kind === 'blocked'))
      .toHaveLength(state.blockedCells.length);

    const expectedDifficult = new Set(state.environment.difficultTerrainRegions.flatMap(
      (region) => region.cells.map((cell) => `${region.id}:${String(cell.column)},${String(cell.row)}`),
    ));
    const actualDifficult = new Set(cells.flatMap((cell) => cell.mechanicalLayers.flatMap((layer) =>
      layer.kind === 'difficult_terrain' ? [`${layer.regionId}:${cell.key}`] : [])));
    expect(actualDifficult).toEqual(expectedDifficult);

    const expectedObscurement = new Set(state.environment.obscurementRegions.flatMap(
      (region) => region.cells.map(
        (cell) => `${region.id}:${region.obscurement}:${String(cell.column)},${String(cell.row)}`,
      ),
    ));
    const actualObscurement = new Set(cells.flatMap((cell) => cell.mechanicalLayers.flatMap(
      (layer) => layer.kind === 'obscurement'
        ? [`${layer.regionId}:${layer.obscurement}:${cell.key}`]
        : [],
    )));
    expect(actualObscurement).toEqual(expectedObscurement);

    const expectedIllumination = new Set(state.environment.lightRegions.flatMap(
      (region) => region.cells.map(
        (cell) => `${region.id}:${region.level}:${String(cell.column)},${String(cell.row)}`,
      ),
    ));
    const actualIllumination = new Set(cells.flatMap((cell) => cell.mechanicalLayers.flatMap(
      (layer) => layer.kind === 'illumination'
        ? [`${layer.regionId}:${layer.level}:${cell.key}`]
        : [],
    )));
    expect(actualIllumination).toEqual(expectedIllumination);
  });

  it('builds a replayable interrupted all-human save without changing encounter bytes', async () => {
    const state = await loadArenaFixture(CONTROL_FIXTURES[0]!);
    const stateBytes = canonicalJson(state);
    const source = sourceFor(state);
    const bundle = createBoardSnapshotSessionBundle(state, source, 1);
    const store = new MemoryBrowserSessionStore();

    expect(importSavedSession(store, bundle.bytes)).toBe(bundle.sessionId);
    const resumed = EncounterSessionJournal.resume(bundle.sessionId, store, new MemoryMirrorSink());
    expect(canonicalJson(resumed.encounterState)).toBe(stateBytes);
    expect(resumed.coordinatorState.pause).toEqual({ kind: 'interrupted' });
    expect(resumed.controllers).toHaveLength(state.combatants.length);
    expect(resumed.controllers.every((controller) => controller.kind === 'human')).toBe(true);
  });

  it('board_image_stale_after_move rejects an artifact after canonical state movement', async () => {
    const state = await loadArenaFixture(CONTROL_FIXTURES[1]!);
    const source = sourceFor(state);
    const artifact: BoardImageArtifact = {
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath: `board-images/${'a'.repeat(64)}.png`,
      sha256: 'a'.repeat(64),
      bytes: 100,
      width: 10,
      height: 10,
      capturedAtUnixMs: 1,
      captureMs: 1,
      source,
      chromiumVersion: 'unit',
      html: {
        relativePath: `board-html/${'b'.repeat(64)}/board.html`,
        sha256: 'b'.repeat(64),
        bytes: 1,
      },
    };
    const moved = movedState(state);
    const movedSource = sourceFor(moved);

    expect(() => assertBoardImageFresh(artifact, state, source)).not.toThrow();
    expect(() => assertBoardImageFresh(artifact, moved, movedSource)).toThrow(/stale/u);
    expect(movedSource.stateDigest).not.toBe(source.stateDigest);
  });

  it('keeps the frozen contract at its required digest', async () => {
    const bytes = await readFile('src/vtt/intel/contracts.ts');
    const { createHash } = await import('node:crypto');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1',
    );
  });
});
