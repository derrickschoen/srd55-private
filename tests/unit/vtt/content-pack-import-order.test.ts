import { afterEach, describe, expect, it, vi } from 'vitest';
import { declareTestInputs } from '../../helpers/test-inputs';

const { readText: readFileSync } = declareTestInputs({
  fixtures: ['tests/fixtures/content-pack-v1-homebrew.json'],
}).fixtures;

afterEach(() => {
  vi.resetModules();
});

describe('content-pack module initialization order', () => {
  it('keeps feature-effect schemas complete when party-pack initializes first', async () => {
    vi.resetModules();
    const partyPack = await import('../../../src/vtt/party-pack');
    expect(partyPack.externalPartyPackFeatureEffectSchema).toBeDefined();

    const { loadContentPack } = await import('../../../src/content/content-pack');
    const fixture = JSON.parse(
      readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8'),
    );

    expect(loadContentPack(fixture).status).toBe('loaded');
  });
});
