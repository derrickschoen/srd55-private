import { describe, expect, it } from 'vitest';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import {
  projectClassContentV1,
  projectFeatContentV1,
} from '../../../src/catalog/source-content-projector-v1';
import {
  classProjectorV1Vector,
  featProjectorV1Vector,
} from './fixtures/source-projector-v1-vectors';

describe('class and feat content-v1 hand-pinned vectors', () => {
  it('reproduces the hand-pinned complete class aggregate bytes and key', () => {
    const aggregate = classProjectorV1Vector.aggregate;
    const identity = deriveContentIdentityV1({
      kind: aggregate.kind,
      edition: aggregate.rules_edition,
      name: aggregate.name,
      payload: projectClassContentV1(aggregate),
    });
    expect(identity.canonicalJson).toBe(classProjectorV1Vector.canonicalJson);
    expect(identity.digest).toBe(classProjectorV1Vector.sha256);
    expect(identity.derivedKey).toBe(classProjectorV1Vector.derivedKey);
  });

  it('reproduces the hand-pinned feat prose bytes and key', () => {
    const aggregate = featProjectorV1Vector.aggregate;
    const identity = deriveContentIdentityV1({
      kind: aggregate.kind,
      edition: aggregate.rules_edition,
      name: aggregate.name,
      payload: projectFeatContentV1(aggregate),
    });
    expect(identity.canonicalJson).toBe(featProjectorV1Vector.canonicalJson);
    expect(identity.digest).toBe(featProjectorV1Vector.sha256);
    expect(identity.derivedKey).toBe(featProjectorV1Vector.derivedKey);
  });
});
