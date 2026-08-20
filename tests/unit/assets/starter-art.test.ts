import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STARTER_ART_ATTRIBUTION } from '../../../src/assets/attribution';
import { assetId } from '../../../src/assets/ids';
import {
  decodeArtManifest,
  STARTER_ART_MANIFEST,
} from '../../../src/assets/starter-art-manifest';
import {
  renderStarterArtSvg,
  resolveStarterArt,
  starterArtDataUri,
} from '../../../src/assets/starter-art-resolver';
import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
import { renderLegalPage } from '../../../src/ui/screens/legal/legal';
import {
  BUNDLED_LICENSE_FILES,
  bundledLicenseAssets,
} from '../../../tools/licenses/bundled-license-files';
import {
  EXPECTED_FIXED_INPUTS_SHA256,
  EXPECTED_PREVIEW_SHA256,
  EXPECTED_SPRITE_INVENTORY_SHA256,
  EXPECTED_STARTER_ART_SHA256,
} from './expected-art-hashes';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

function bytes(path: string): Buffer {
  return readFileSync(join(repositoryRoot, path));
}

function text(path: string): string {
  return bytes(path).toString('utf8');
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

const EXPECTED_TOKEN_IDS = [
  'art.token.pc.fighter.v1',
  'art.token.pc.cleric.v1',
  'art.token.pc.wizard.v1',
  'art.token.pc.rogue.v1',
  'art.token.monster.goblin-warrior.v1',
  'art.token.monster.hobgoblin-warrior.v1',
  'art.token.monster.bandit-captain.v1',
  'art.token.monster.ogre.v1',
  'art.token.monster.priest-acolyte.v1',
  'art.token.monster.priest.v1',
  'art.token.monster.skeleton.v1',
  'art.token.monster.zombie.v1',
  'art.token.monster.wolf.v1',
] as const;

describe('procedural starter-art manifest and deterministic outputs', () => {
  it('inventories 13 readable token silhouettes and 12 room/state assets', () => {
    expect(STARTER_ART_MANIFEST.assets).toHaveLength(25);
    expect(
      STARTER_ART_MANIFEST.assets.filter((entry) => entry.kind === 'token').map((entry) => entry.id),
    ).toEqual(EXPECTED_TOKEN_IDS);
    expect(Object.keys(EXPECTED_STARTER_ART_SHA256)).toHaveLength(25);
    expect(STARTER_ART_MANIFEST.generator).toEqual({
      id: 'starter-pixel-art',
      version: '1.0.0',
      fixedInputSet: 'starter-art-inputs-v1',
      fixedInputsSha256: EXPECTED_FIXED_INPUTS_SHA256,
    });
  });

  it('M51-ASSET-WITHOUT-AUTHORIZATION rejects any manifest row lacking its redistribution license', () => {
    const mutated = structuredClone(STARTER_ART_MANIFEST) as unknown as {
      assets: Array<Record<string, unknown>>;
    };
    delete mutated.assets[0]?.license;

    expect(() => decodeArtManifest(mutated)).toThrow();
    expect(STARTER_ART_MANIFEST.assets.every((entry) =>
      entry.license.spdx === 'CC-BY-4.0' && entry.source.type === 'procedural',
    )).toBe(true);
  });

  it('owns every checked-in art output exactly once and pins independent hashes', () => {
    const actualFiles = readdirSync(join(repositoryRoot, 'public/assets/art'))
      .filter((name) => name.endsWith('.svg'))
      .map((name) => `assets/art/${name}`)
      .sort();
    const declaredFiles = STARTER_ART_MANIFEST.assets.map((entry) => entry.output.path).sort();
    expect(actualFiles).toEqual(declaredFiles);

    for (const entry of STARTER_ART_MANIFEST.assets) {
      const expected = EXPECTED_STARTER_ART_SHA256[entry.id];
      expect(expected, entry.id).toBeDefined();
      expect(sha256(renderStarterArtSvg(entry.id)), entry.id).toBe(expected);
      expect(sha256(bytes(`public/${entry.output.path}`)), entry.id).toBe(expected);
      expect(entry.output.sha256, entry.id).toBe(expected);
      expect(text(`public/${entry.output.path}`), entry.id).toBe(renderStarterArtSvg(entry.id));
    }
    expect(sha256(bytes('src/assets/starter-art-inputs.ts'))).toBe(
      EXPECTED_FIXED_INPUTS_SHA256,
    );
  });

  it('renders byte-identically from equal fixed inputs and pins the combined sprite inventory', () => {
    const first = STARTER_ART_INPUTS.map((entry) => renderStarterArtSvg(entry.id));
    const second = STARTER_ART_INPUTS.map((entry) => renderStarterArtSvg(entry.id));
    expect(first).toEqual(second);

    const digest = createHash('sha256');
    for (const id of EXPECTED_TOKEN_IDS) {
      digest.update(id);
      digest.update('\0');
      digest.update(renderStarterArtSvg(assetId(id)));
      digest.update('\0');
    }
    expect(digest.digest('hex')).toBe(EXPECTED_SPRITE_INVENTORY_SHA256);
  });

  it('M53-ASSET-ID-RESOLVES-BY-FILENAME keeps stable-id rendering through an output rename', () => {
    const renamed = structuredClone(STARTER_ART_MANIFEST);
    const fighter = renamed.assets.find((entry) => entry.id === 'art.token.pc.fighter.v1');
    expect(fighter).toBeDefined();
    if (fighter === undefined) return;
    fighter.output.path = 'assets/art/renamed-fighter-proof.svg';
    const decoded = decodeArtManifest(renamed);

    expect(resolveStarterArt(assetId('art.token.pc.fighter.v1'), decoded).manifest.output.path)
      .toBe('assets/art/renamed-fighter-proof.svg');
    expect(renderStarterArtSvg(assetId('art.token.pc.fighter.v1'), decoded))
      .toBe(renderStarterArtSvg(assetId('art.token.pc.fighter.v1')));
  });

  it('M54-FIXTURE-FETCHES-REMOTE-TEXTURE renders with a hostile network sentinel', () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('NETWORK ACCESS FORBIDDEN DURING ART RENDER');
    }) as typeof fetch;
    try {
      for (const entry of STARTER_ART_MANIFEST.assets) {
        expect(starterArtDataUri(entry.id)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/u);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }

    for (const path of [
      'src/assets/starter-art-resolver.ts',
      'src/vtt/encounter-package.ts',
      'src/vtt/encounter-board.ts',
      'src/vtt/encounter-app.ts',
      'tools/assets/generate-starter-art.ts',
    ]) {
      const source = text(path);
      expect(source, path).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|src\s*=\s*['"]https?:|url\(\s*['"]?https?:/u);
    }
  });
});

describe('starter-art attribution reaches repository and distribution', () => {
  it('M52-ATTRIBUTION-OMITTED emits the exact notice and renders it on the legal screen', () => {
    const notice = text('docs/licenses/STARTER-ART-NOTICE.txt').trimEnd();
    expect(notice).toBe(STARTER_ART_ATTRIBUTION);
    expect(text('NOTICE.md').split(STARTER_ART_ATTRIBUTION)).toHaveLength(2);
    expect(renderLegalPage()).toContain(STARTER_ART_ATTRIBUTION);

    const declaration = BUNDLED_LICENSE_FILES.find(
      (entry) => entry.fileName === 'licenses/STARTER-ART-NOTICE.txt',
    );
    expect(declaration?.sha256).toBe(sha256(bytes('docs/licenses/STARTER-ART-NOTICE.txt')));
    const emitted = bundledLicenseAssets(repositoryRoot).find(
      (entry) => entry.fileName === 'licenses/STARTER-ART-NOTICE.txt',
    );
    expect(Buffer.from(emitted?.source ?? []).toString('utf8')).toBe(
      text('docs/licenses/STARTER-ART-NOTICE.txt'),
    );
    const guard = text('tools/assert-dist-clean.mjs');
    expect(guard).toContain('licenses/STARTER-ART-NOTICE.txt');
    expect(guard).toContain(declaration?.sha256);
  });

  it('contains no external art-family provenance', () => {
    const serialized = JSON.stringify(STARTER_ART_MANIFEST).toLowerCase();
    expect(serialized).not.toContain('game-icons');
    expect(serialized).not.toContain('external');
    expect(new Set(STARTER_ART_MANIFEST.assets.map((entry) => entry.source.creator)))
      .toEqual(new Set(['SRD-55 contributors']));
  });

  it('pins the visual-review artifact and both projection markers', () => {
    const preview = text('docs/design/assets-preview/starter-art-board.svg');
    expect(sha256(preview)).toBe(EXPECTED_PREVIEW_SHA256);
    expect(preview).toContain('data-sprite-inventory="13"');
    for (const marker of [
      'data-projection="player"',
      'data-projection="dm"',
      'focus.active-pc',
      'event.adjudicated',
      'fog.hidden',
      'terrain',
      'one-room',
    ]) {
      expect(preview).toContain(marker);
    }
  });
});
