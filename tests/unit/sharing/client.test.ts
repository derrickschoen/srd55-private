import { describe, expect, it } from 'vitest';
import {
  deriveContentIdentityV1,
} from '../../../src/catalog/content-identity';
import { externalContentDisclosure } from '../../../src/catalog/content-adoption';
import { projectFeatContentV1 } from '../../../src/catalog/source-content-projector-v1';
import { RpcClient } from '../../../src/rpc/client';
import { createShareClient } from '../../../src/sharing/client';
import { decodeShareFragment } from '../../../src/sharing/codec';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  type CharacterShareDocument,
} from '../../../src/sharing/schema';
import { featProjectorV1Vector } from '../catalog/fixtures/source-projector-v1-vectors';

const carriedFeatKey = 'expanded:content.feat:keen-memory';

function noise(length: number): string {
  let seed = 0x51f15e;
  let output = '';
  for (let index = 0; index < length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    output += String.fromCharCode(33 + (Math.abs(seed) % 94));
  }
  return output;
}

function portableFeat(name: string, notes: string) {
  const aggregate = {
    ...featProjectorV1Vector.aggregate,
    name,
    notes,
  };
  const identity = deriveContentIdentityV1({
    kind: 'feat',
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projectFeatContentV1(aggregate),
  });
  return {
    kind: 'feat' as const,
    content_key: `expanded:content.feat:${name.toLowerCase().replaceAll(' ', '-')}`,
    key_kind: 'asserted' as const,
    fingerprint_scheme: identity.envelope.scheme,
    fingerprint_digest: identity.digest,
    aggregate,
    provenance: {
      origin_kind: 'authored_here' as const,
      received: false,
      local_derivation: false,
    },
  };
}

function documentWithPortableFeats(notes: readonly string[]): CharacterShareDocument {
  const content = notes.map((entryNotes, index) => portableFeat(
    index === 0 ? 'Keen Memory' : `Try Then Warn ${String(index)}`,
    entryNotes,
  ));
  return {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: { name: 'Try Then Warn' },
    classes: [],
    sources: [{
      id: 0,
      type: 'feat',
      key: carriedFeatKey,
      acquired: 1,
    }],
    selections: [],
    spellbook: [],
    preferences: [],
    overrides: [],
    portableContent: {
      content,
      supersessions: [],
    },
  };
}

function clientFor(document: CharacterShareDocument) {
  const rpc = {
    call: async <TParams, TResult>(
      _method: string,
      _params: TParams,
    ): Promise<TResult> => document as unknown as TResult,
  } as unknown as RpcClient;
  return createShareClient(rpc);
}

describe('share client try-then-warn encoding', () => {
  it('uses honest UNKNOWN display copy when an aggregate supplies no name', () => {
    expect(externalContentDisclosure({
      id: 'portable:species:missing-name',
      kind: 'species',
      name: '   ',
    })).toEqual({
      id: 'portable:species:missing-name',
      kind: 'species',
      name: 'UNKNOWN',
      catalog_layer: 'external',
    });
  });

  it('falls back to a reference-only fragment and names every omitted carried reference', async () => {
    const highEntropy = noise(180_000);
    const document = documentWithPortableFeats(Array.from(
      { length: 50 },
      (_, index) => highEntropy.slice(index * 3_600, (index + 1) * 3_600),
    ));

    const result = await clientFor(document).createFragmentResult(1);

    expect(result).toEqual({
      kind: 'encoded',
      fragment: expect.any(String),
      embeddedContent: [],
      omittedContent: [{
        kind: 'feat',
        contentKey: carriedFeatKey,
        name: 'Keen Memory',
      }],
    });
    if (result.kind !== 'encoded') throw new Error('Expected encoded fallback.');
    const decoded = await decodeShareFragment(result.fragment);
    expect(decoded.portableContent).toBeUndefined();
    expect(decoded.sources).toEqual([{
      id: 0,
      type: 'feat',
      key: carriedFeatKey,
      name: 'Keen Memory',
      acquired: 1,
    }]);
  });

  it('keeps portable content embedded when the first encoding fits', async () => {
    const document = documentWithPortableFeats(['Recall details.  \r\nPrecisely.   \r\n']);

    const result = await clientFor(document).createFragmentResult(1);

    expect(result.kind).toBe('encoded');
    if (result.kind !== 'encoded') throw new Error('Expected embedded fragment.');
    expect(Object.keys(result).sort()).toEqual([
      'embeddedContent',
      'fragment',
      'kind',
    ]);
    expect(result.embeddedContent).toEqual([{
      id: `portable:feat:${carriedFeatKey}`,
      kind: 'feat',
      name: 'Keen Memory',
      catalog_layer: 'external',
      provenance: {
        origin_kind: 'authored_here',
        received: false,
        local_derivation: false,
      },
    }]);
    await expect(decodeShareFragment(result.fragment)).resolves.toEqual(document);
  });
});
