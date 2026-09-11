import { describe, expect, it } from 'vitest';
import { projectDmView } from '../../../src/combat/visibility';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { createLegacyEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
import {
  offeredOptionActorsForState,
  offeredOptionPaths,
} from '../../../src/vtt/offered-option-paths';
import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

describe('Slice 3A production board offer environment', () => {
  it('production board keeps every moving offered-option path and its hazard overlays', () => {
    const state = createOptionPathFixtureEncounter();
    const environment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
    const offeredActors = offeredOptionActorsForState(state, undefined, environment);
    const movingOptionIds = offeredActors.flatMap((actor) => actor.options.flatMap((option) => {
      const resolution = resolveEngineActorOption(state, option, environment);
      return resolution.valid && resolution.mechanics.path.length > 0 ? [option.optionId] : [];
    }));
    const expectedPaths = offeredOptionPaths(state, offeredActors, environment);
    const projection = projectDmBoard({
      view: projectDmView(state),
      coordinator: IDLE,
      controllers: [],
      history: [],
    });

    expect(movingOptionIds.length).toBeGreaterThanOrEqual(2);
    expect(projection.offeredOptionPaths.map((path) => path.optionId)).toEqual(movingOptionIds);
    expect(projection.offeredOptionPaths).toEqual(expectedPaths);
    expect(projection.offeredOptionPaths.every((path) => path.path.length > 0)).toBe(true);
    expect(new Set(projection.offeredOptionPaths.flatMap((path) =>
      path.annotations.flatMap((annotation) => annotation.dangers))))
      .toEqual(new Set(['opportunity_attack', 'difficult_terrain']));
  });
});
