import { describe, expect, it } from 'vitest';
import {
  canonicalRuleText,
  contentIdentityOptional,
  contentIdentitySequence,
  contentIdentitySet,
  deriveContentIdentityV1,
  CONTENT_FINGERPRINT_SCHEME_V1,
} from '../../../src/catalog/content-identity';
import {
  frozenContentIdentityV1Vectors,
  type FrozenContentIdentityAggregate,
} from './fixtures/content-identity-v1-vectors';

function deriveFixtureAggregate(
  aggregate: FrozenContentIdentityAggregate,
) {
  const identity = {
    edition: aggregate.edition,
    kind: aggregate.kind,
    name: aggregate.name,
  } as const;

  switch (aggregate.kind) {
    case 'feat':
      return deriveContentIdentityV1({
        ...identity,
        payload: {
          description: canonicalRuleText(aggregate.description ?? ''),
          minimumLevel: contentIdentityOptional(aggregate.minimumLevel),
          repeatable: aggregate.repeatable ?? false,
          tags: contentIdentitySet(aggregate.tags ?? []),
        },
      });
    case 'species':
      return deriveContentIdentityV1({
        ...identity,
        payload: {
          description: canonicalRuleText(aggregate.description ?? ''),
          traits: contentIdentitySequence(aggregate.traits ?? []),
        },
      });
    case 'spell':
      return deriveContentIdentityV1({
        ...identity,
        payload: {
          description: canonicalRuleText(aggregate.description ?? ''),
          tags: contentIdentitySet(aggregate.tags ?? []),
        },
      });
    case 'subclass':
      return deriveContentIdentityV1({
        ...identity,
        payload: {
          features: contentIdentitySequence(
            (aggregate.features ?? []).map((feature) => ({
              name: feature.name,
              text: canonicalRuleText(feature.text),
            })),
          ),
        },
      });
  }
}

describe('CI-FROZEN-V1 hand-pinned vectors', () => {
  it('CI-8 content-v1 fingerprint scheme stays frozen', () => {
    expect(CONTENT_FINGERPRINT_SCHEME_V1).toBe('content-v1');
    expect(deriveFixtureAggregate(frozenContentIdentityV1Vectors[0]!.aggregate)
      .envelope.scheme).toBe('content-v1');
  });

  it.each(frozenContentIdentityV1Vectors)(
    'pins $label',
    ({ aggregate, equivalentAggregates, canonicalJson, sha256, derivedKey }) => {
      const actual = deriveFixtureAggregate(aggregate);

      expect(actual.canonicalJson).toBe(canonicalJson);
      expect(actual.digest).toBe(sha256);
      expect(actual.derivedKey).toBe(derivedKey);

      for (const equivalent of equivalentAggregates ?? []) {
        const equivalentIdentity = deriveFixtureAggregate(equivalent);
        expect(equivalentIdentity.canonicalJson).toBe(canonicalJson);
        expect(equivalentIdentity.digest).toBe(sha256);
        expect(equivalentIdentity.derivedKey).toBe(derivedKey);
      }
    },
  );

  it('pins sequence order as significant', () => {
    const first = deriveFixtureAggregate(
      frozenContentIdentityV1Vectors[4]!.aggregate,
    );
    const reversed = deriveFixtureAggregate(
      frozenContentIdentityV1Vectors[5]!.aggregate,
    );

    expect(first.canonicalJson).not.toBe(reversed.canonicalJson);
    expect(first.digest).not.toBe(reversed.digest);
    expect(first.derivedKey).not.toBe(reversed.derivedKey);
  });
});
