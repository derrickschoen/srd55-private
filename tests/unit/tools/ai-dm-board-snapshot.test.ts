import { describe, expect, it, vi } from 'vitest';
import { readFile } from '../../helpers/test-filesystem-promises';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { EncounterState } from '../../../src/combat/encounter';
import { terrainWallCells } from '../../../src/combat/terrain';
import { projectDmView } from '../../../src/combat/visibility';
import { projectDmBoard, projectStateOnlyDmBoard } from '../../../src/vtt/encounter-projections';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import { renderBoard } from '../../../src/vtt/encounter-app';
import {
  encounterBoardRenderModel,
  projectEncounterBoard,
  projectEncounterTerrainCells,
} from '../../../src/vtt/encounter-board';
import {
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  importSavedSession,
  EncounterSessionJournal,
} from '../../../src/vtt/session-persistence';
import {
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
import {
  createDisabledEngineOfferFamilyPolicy,
} from '../../../src/vtt/offers/offer-environment';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import {
  assertBoardImageFresh,
  assertSynchronizedBoardImages,
  BLIND_STATE_PRIMER_VERSION,
  BOARD_SNAPSHOT_IMAGE_ROLES,
  BOARD_SNAPSHOT_TERRAIN_SELECTORS,
  boardSnapshotCaptureGeometry,
  boardSnapshotInformationMode,
  boardSnapshotVisualDescriptor,
  boardStateDigest,
  configuredPreviewPort,
  createBoardSnapshotSessionBundle,
  isBoardSnapshotDomEvidence,
  type BoardImageArtifact,
  type BoardImageSource,
  type BoardSnapshotDomEvidence,
} from '../../../tools/ai-dm-board-snapshot';
import { installInteractiveDocument, interactiveElement } from '../../fixtures/interactive-dom';

const CONTROL_FIXTURES = Array.from(
  { length: 10 },
  (_unused, index) => `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`,
);
const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});

function expectOfferEnvironmentIdentity(
  state: EncounterState,
  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
): void {
  const planningState = freshMonsterPlanningState(state);
  const actorId = planningState.combatants.find(
    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
  )?.profile.id;
  if (actorId === undefined) throw new Error('Snapshot offer-environment probe has no living monster.');
  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
  if (option === undefined) throw new Error(`Snapshot offer-environment probe has no option for ${actorId}.`);
  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
  const equalBindingEnvironment = buildOfferEnvironment({
    kind: 'binding',
    binding: offerEnvironment.binding,
  });
  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
    valid: false,
    code: 'OFFER_ENVIRONMENT_MISMATCH',
  });
}

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

  it('defaults the information profile to byte-compatible advice and closes state-only roles', () => {
    expect(boardSnapshotInformationMode()).toBe('advice');
    expect(boardSnapshotInformationMode('advice')).toBe('advice');
    expect(boardSnapshotInformationMode('blind_state')).toBe('blind_state');
    expect(BOARD_SNAPSHOT_IMAGE_ROLES).toEqual([
      'dm_board', 'accessible_board_raster', 'player_board',
    ]);
  });

  it('accepts the complete terrain evidence shape and rejects legacy or incomplete shapes', () => {
    const evidence: BoardSnapshotDomEvidence = {
      optionSurfaceAbsent: true,
      nextEventPreviewAbsent: true,
      coordinateLabels: 0,
      creatureBadges: 0,
      rosterEntries: 0,
      hpBars: 0,
      legendEntries: 0,
      wallCells: 0,
      halfCoverCells: 0,
      threeQuartersCoverCells: 0,
      difficultCells: 0,
      obscuredCells: 0,
      illuminatedCells: 0,
      fogMarks: 0,
      doors: 0,
      objects: 0,
      hiddenMarks: 0,
      multiCellFootprints: 0,
    };
    expect(isBoardSnapshotDomEvidence(evidence)).toBe(true);

    const legacyShape: Record<string, unknown> = { ...evidence };
    Reflect.deleteProperty(legacyShape, 'wallCells');
    Reflect.deleteProperty(legacyShape, 'halfCoverCells');
    Reflect.deleteProperty(legacyShape, 'threeQuartersCoverCells');
    legacyShape['blockedCells'] = 0;
    expect(isBoardSnapshotDomEvidence(legacyShape)).toBe(false);

    const missingHalfCover: Record<string, unknown> = { ...evidence };
    Reflect.deleteProperty(missingHalfCover, 'halfCoverCells');
    expect(isBoardSnapshotDomEvidence(missingHalfCover)).toBe(false);
  });

  it.each([
    ['hard', 5_117_001, 'tests/fixtures/arena-basis-hard/seed-5117001.json'],
    ['brutal', 6_203_001, 'tests/fixtures/arena-basis-brutal/seed-6203001.json'],
  ] as const)('renders state-derived terrain evidence for %s seed %i', async (_difficulty, _seed, path) => {
    const restoreDocument = installInteractiveDocument();
    try {
      const state = await loadArenaFixture(path);
      const projection = projectEncounterBoard(projectDmView(state));
      const board = interactiveElement(renderBoard(
        projection,
        new Set(),
        null,
        { revision: state.revision, round: state.round, stateDigest: boardStateDigest(state) },
        'full',
        true,
        128,
      ));
      const projectedTerrain = projectEncounterTerrainCells(state.bounds, state);
      const expected = {
        wallCells: terrainWallCells(state).length,
        halfCoverCells: projectedTerrain.filter((cell) => cell.kind === 'half_cover').length,
        threeQuartersCoverCells: projectedTerrain.filter(
          (cell) => cell.kind === 'three_quarters_cover',
        ).length,
      };

      for (const key of Object.keys(BOARD_SNAPSHOT_TERRAIN_SELECTORS) as readonly (
        keyof typeof BOARD_SNAPSHOT_TERRAIN_SELECTORS
      )[]) {
        expect(
          board.querySelectorAll(BOARD_SNAPSHOT_TERRAIN_SELECTORS[key]),
          `${key} must match its independent state derivation`,
        ).toHaveLength(expected[key]);
      }
    } finally {
      restoreDocument();
    }
  });

  it('removes offered paths at the projection boundary without changing board state', async () => {
    const state = await loadArenaFixture(CONTROL_FIXTURES[0]!);
    const projection = projectDmBoard({
      view: projectDmView(state),
      coordinator: {
        requestSequence: 1,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: { kind: 'interrupted' },
      },
      controllers: state.combatants.map((combatant) => ({
        combatantId: combatant.profile.id,
        controllerId: `test:${String(combatant.profile.id)}`,
        kind: 'human' as const,
        generation: 0,
      })),
      history: [],
      offerEnvironment: BOUND_OFFER_ENVIRONMENT,
    });
    const stateOnly = projectStateOnlyDmBoard(projection);

    expect(projection.offeredOptionPaths.length).toBeGreaterThan(0);
    expect(stateOnly.offeredOptionPaths).toEqual([]);
    expect(stateOnly.board).toBe(projection.board);
    expect(stateOnly.stateDigest).toBe(projection.stateDigest);
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
    expect(cells.flatMap((cell) => cell.mechanicalLayers).filter(
      (layer) => layer.kind === 'terrain' && layer.terrainKind === 'wall',
    )).toHaveLength(projection.terrainCells.filter((cell) => cell.kind === 'wall').length);

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
    const runtimeConstructor = vi.spyOn(engineMcpEntrypoint, 'createEngineMcpRuntime');
    let runtime: ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime>;
    try {
      runtime = engineMcpEntrypoint.createEngineMcpRuntime(resumed.encounterState, {
        offerEnvironment: BOUND_OFFER_ENVIRONMENT,
      });
      expect(runtimeConstructor.mock.calls.at(-1)?.[1]?.offerEnvironment).toBe(BOUND_OFFER_ENVIRONMENT);
      expect(runtime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
      expectOfferEnvironmentIdentity(resumed.encounterState, BOUND_OFFER_ENVIRONMENT);
    } finally {
      runtimeConstructor.mockRestore();
      expect(vi.isMockFunction(engineMcpEntrypoint.createEngineMcpRuntime)).toBe(false);
    }
    expect(canonicalJson(resumed.encounterState)).toBe(stateBytes);
    expect(runtime.feed.current().projection.combatants.map((combatant) => combatant.id).sort()).toEqual(
      resumed.encounterState.combatants
        .filter((combatant) => combatant.life !== 'dead')
        .map((combatant) => combatant.profile.id)
        .sort(),
    );
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

  it('records hashes privately while exposing only a neutral role descriptor model-side', async () => {
    const state = await loadArenaFixture(CONTROL_FIXTURES[0]!);
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
      source: sourceFor(state),
      chromiumVersion: 'unit',
      html: {
        relativePath: `board-html/${'b'.repeat(64)}/board.html`,
        sha256: 'b'.repeat(64),
        bytes: 1,
      },
      blindState: {
        informationMode: 'blind_state',
        role: 'player_board',
        ordinal: 3,
        primerVersion: BLIND_STATE_PRIMER_VERSION,
        glyphMode: 'full',
        captureTilePx: 128,
        domEvidence: {
          optionSurfaceAbsent: true,
          nextEventPreviewAbsent: true,
          coordinateLabels: 0,
          creatureBadges: 0,
          rosterEntries: 0,
          hpBars: 0,
          legendEntries: 0,
          wallCells: 0,
          halfCoverCells: 0,
          threeQuartersCoverCells: 0,
          difficultCells: 0,
          obscuredCells: 0,
          illuminatedCells: 0,
          fogMarks: 0,
          doors: 0,
          objects: 0,
          hiddenMarks: 0,
          multiCellFootprints: 0,
        },
      },
    };

    const descriptor = boardSnapshotVisualDescriptor(artifact);
    expect(descriptor).toEqual({
      kind: 'player_board',
      ordinal: 3,
      primer_version: BLIND_STATE_PRIMER_VERSION,
      glyph_mode: 'full',
      capture_tile_px: 128,
    });
    expect(JSON.stringify(descriptor)).not.toContain(artifact.sha256);
    const singleArtifact: BoardImageArtifact = {
      ...artifact,
      blindState: { ...artifact.blindState!, ordinal: 1 },
    };
    expect(() => assertSynchronizedBoardImages({
      artifacts: [singleArtifact],
      state,
      source: sourceFor(state),
      primaryDispatchStartedAtUnixMs: 2,
    })).not.toThrow();
    expect(() => assertSynchronizedBoardImages({
      artifacts: [singleArtifact],
      state,
      source: sourceFor(state),
      primaryDispatchStartedAtUnixMs: 0,
    })).toThrow('before primary model dispatch');
  });

  it('keeps the frozen contract at its required digest', async () => {
    const bytes = await readFile('src/vtt/intel/contracts.ts');
    const { createHash } = await import('node:crypto');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1',
    );
  });
});
