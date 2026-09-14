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
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  createRevisionBoundEngineOptionEnvironment,
  engineOptionEnvironmentFromBinding,
} from '../../../src/vtt/offers/offer-environment';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
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
const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);

function observeOfferEnvironment() {
  let bindingReads = 0;
  return {
    environment: new Proxy(BOUND_OFFER_ENVIRONMENT, {
      get(target, property, receiver) {
        if (property === 'binding') bindingReads += 1;
        return Reflect.get(target, property, receiver) as unknown;
      },
    }),
    bindingReads: () => bindingReads,
  };
}

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
  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
    offerEnvironment.queries,
    offerEnvironment.binding,
  );
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
    const observed = observeOfferEnvironment();
    const runtime = createEngineMcpRuntime(resumed.encounterState, {
      offerEnvironment: observed.environment,
    });
    expect(observed.bindingReads()).toBeGreaterThan(0);
    expectOfferEnvironmentIdentity(resumed.encounterState, observed.environment);
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

  it('keeps the frozen contract at its required digest', async () => {
    const bytes = await readFile('src/vtt/intel/contracts.ts');
    const { createHash } = await import('node:crypto');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1',
    );
  });
});
