import { describe, expect, it } from 'vitest';
import { projectDmView } from '../../../src/combat/visibility';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
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

const EXPECTED_LEGACY_ENVIRONMENT_DIGEST = 'fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b';
const EXPECTED_REVISION_ENVIRONMENT_DIGEST = 'e93555826672102b37c9bcb16d53f743cffa90134c037ec015d5828e3ea1d3a2';

describe('Slice 3A production board offer environment', () => {
  it('production board keeps every moving offered-option path and its hazard overlays', () => {
    const state = createOptionPathFixtureEncounter();
    const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
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
      offerEnvironment: environment,
    });
    const revisionEnvironment = buildOfferEnvironment({
      kind: 'configuration',
      mode: 'revision_bound',
      familyPolicy: createEngineOfferFamilyPolicy({
        format: 'engine-offer-family-policy-v1',
        helpAttack: 'enabled',
        readyAttack: 'disabled',
        unarmedControl: 'disabled',
        reposition: 'disabled',
      }),
      partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
    });
    const revisionProjection = projectDmBoard({
      view: projectDmView(state),
      coordinator: IDLE,
      controllers: [],
      history: [],
      offerEnvironment: revisionEnvironment,
    });

    expect(environment.digest).toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);
    expect(projection.offerEnvironmentDigest).toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);
    expect(projection.offerEnvironmentDigest).toBe(environment.digest);
    expect(revisionEnvironment.digest).toBe(EXPECTED_REVISION_ENVIRONMENT_DIGEST);
    expect(revisionProjection.offerEnvironmentDigest).toBe(EXPECTED_REVISION_ENVIRONMENT_DIGEST);
    expect(revisionProjection.offerEnvironmentDigest).toBe(revisionEnvironment.digest);
    expect(revisionProjection.offerEnvironmentDigest).not.toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);
    expect(movingOptionIds.length).toBeGreaterThanOrEqual(2);
    expect(projection.offeredOptionPaths.map((path) => path.optionId)).toEqual(movingOptionIds);
    expect(projection.offeredOptionPaths).toEqual(expectedPaths);
    expect(projection.offeredOptionPaths.every((path) => path.path.length > 0)).toBe(true);
    expect(new Set(projection.offeredOptionPaths.flatMap((path) =>
      path.annotations.flatMap((annotation) => annotation.dangers))))
      .toEqual(new Set(['opportunity_attack', 'difficult_terrain']));
  });
});
