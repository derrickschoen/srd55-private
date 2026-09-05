import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readFileSync } from '../../helpers/test-filesystem';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const CC0_1_0_UNIVERSAL_SHA256 =
  'a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499';

const forbiddenExternalReference =
  /(?:diablo|baldur|blizzard|larian|bg3|nimble)|\/home(?:\/|$)/iu;

function repositoryBytes(path: string): Buffer {
  return readFileSync(join(repositoryRoot, path));
}

describe('repository licence split', () => {
  it('keeps the code, generated-art, and SRD licence texts present', () => {
    for (const path of ['LICENSE', 'LICENSE-ART', 'docs/licenses/CC-BY-4.0.txt']) {
      expect(repositoryBytes(path).byteLength, path).toBeGreaterThan(0);
    }
  });

  it('pins LICENSE-ART to the verbatim CC0 1.0 Universal legalcode', () => {
    expect(createHash('sha256').update(repositoryBytes('LICENSE-ART')).digest('hex'))
      .toBe(CC0_1_0_UNIVERSAL_SHA256);
  });

  it('provenance_names_a_game rejects named inspirations and local paths', () => {
    const provenance = repositoryBytes('ART-PROVENANCE.md').toString('utf8');

    expect(provenance).not.toMatch(forbiddenExternalReference);
  });
});
