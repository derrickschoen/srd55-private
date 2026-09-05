import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STARTER_ART_ATTRIBUTION } from '../../../src/assets/attribution';
import { assetId } from '../../../src/assets/ids';
import { TILE_SIZE } from '../../../src/assets/pixel-art';
import { pngDimensions } from '../../../src/assets/png';
import {
  decodeArtManifest,
  STARTER_ART_MANIFEST,
} from '../../../src/assets/starter-art-manifest';
import {
  renderStarterArtPng,
  resolveStarterArt,
  starterArtDataUri,
} from '../../../src/assets/starter-art-resolver';
import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
import starterArtInputsSource from '../../../src/assets/starter-art-inputs.ts?raw';
import { renderLegalPage } from '../../../src/ui/screens/legal/legal';
import {
  BUNDLED_LICENSE_FILES,
  bundledLicenseAssets,
} from '../../../tools/licenses/bundled-license-files';
import { STARTER_ART_PREVIEW_PATH, generateStarterArt } from '../../../tools/assets/generate-starter-art';
import {
  EXPECTED_FIXED_INPUTS_SHA256,
  EXPECTED_PREVIEW_SHA256,
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

const EXPECTED_ASSET_COUNT = 79;
const EXPECTED_TOKEN_COUNT = 36;

const EXPECTED_NAMED_TOKEN_IDS = [
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

describe('procedural starter-art manifest and deterministic outputs (D516, generator 2.0.0)', () => {
  it('inventories 36 token busts (13 fixture-named, 22 archetype×side, 1 dead) and 43 room/state assets', () => {
    expect(STARTER_ART_MANIFEST.assets).toHaveLength(EXPECTED_ASSET_COUNT);
    const tokens = STARTER_ART_MANIFEST.assets.filter((entry) => entry.kind === 'token').map((entry) => entry.id);
    expect(tokens).toHaveLength(EXPECTED_TOKEN_COUNT);
    expect(tokens.slice(0, EXPECTED_NAMED_TOKEN_IDS.length)).toEqual(EXPECTED_NAMED_TOKEN_IDS);
    expect(Object.keys(EXPECTED_STARTER_ART_SHA256)).toHaveLength(EXPECTED_ASSET_COUNT);
    expect(STARTER_ART_MANIFEST.generator).toEqual({
      id: 'starter-pixel-art',
      version: '2.0.0',
      fixedInputSet: 'starter-art-inputs-v2',
      fixedInputsSha256: EXPECTED_FIXED_INPUTS_SHA256,
    });
    expect(STARTER_ART_MANIFEST.assets.every((entry) =>
      entry.output.width === TILE_SIZE && entry.output.height === TILE_SIZE && entry.output.mediaType === 'image/png',
    )).toBe(true);
  });

  it('M51-ASSET-WITHOUT-AUTHORIZATION rejects any manifest row lacking its redistribution license', () => {
    const mutated = structuredClone(STARTER_ART_MANIFEST) as unknown as {
      assets: Array<Record<string, unknown>>;
    };
    delete mutated.assets[0]?.license;

    expect(() => decodeArtManifest(mutated)).toThrow();
    expect(STARTER_ART_MANIFEST.assets.every((entry) =>
      entry.license.spdx === 'CC0-1.0' && entry.source.type === 'procedural',
    )).toBe(true);
  });

  it('owns every checked-in art output exactly once and pins independent hashes', () => {
    const actualFiles = readdirSync(join(repositoryRoot, 'public/assets/art'))
      .filter((name) => name.endsWith('.png'))
      .map((name) => `assets/art/${name}`)
      .sort();
    const declaredFiles = STARTER_ART_MANIFEST.assets.map((entry) => entry.output.path).sort();
    expect(actualFiles).toEqual(declaredFiles);
    expect(readdirSync(join(repositoryRoot, 'public/assets/art')).filter((name) => name.endsWith('.svg'))).toEqual([]);

    for (const entry of STARTER_ART_MANIFEST.assets) {
      const expected = EXPECTED_STARTER_ART_SHA256[entry.id];
      expect(expected, entry.id).toBeDefined();
      const rendered = renderStarterArtPng(entry.id);
      expect(sha256(rendered), entry.id).toBe(expected);
      expect(sha256(bytes(`public/${entry.output.path}`)), entry.id).toBe(expected);
      expect(entry.output.sha256, entry.id).toBe(expected);
      expect(pngDimensions(rendered), entry.id).toEqual({ width: TILE_SIZE, height: TILE_SIZE });
    }
    expect(sha256(starterArtInputsSource)).toBe(
      EXPECTED_FIXED_INPUTS_SHA256,
    );
  });

  it('renders byte-identically from equal fixed inputs', () => {
    const first = STARTER_ART_INPUTS.map((entry) => Buffer.from(renderStarterArtPng(entry.id)).toString('base64'));
    const second = STARTER_ART_INPUTS.map((entry) => Buffer.from(renderStarterArtPng(entry.id)).toString('base64'));
    expect(first).toEqual(second);
  });

  it('runs the checked-in generator in isolation and matches every committed output byte', () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'srd55-starter-art-generator-'));
    try {
      const result = generateStarterArt({ outputRoot, checkOnly: false });
      expect(result).toEqual({ assetCount: EXPECTED_ASSET_COUNT, previewCount: 1 });

      for (const entry of STARTER_ART_MANIFEST.assets) {
        expect(
          readFileSync(join(outputRoot, 'public', entry.output.path)),
          `generator drift for ${entry.id}`,
        ).toEqual(bytes(`public/${entry.output.path}`));
      }
      expect(
        readFileSync(join(outputRoot, STARTER_ART_PREVIEW_PATH)),
        'preview generator drift, including palette and presentation inputs',
      ).toEqual(bytes(STARTER_ART_PREVIEW_PATH));
    } finally {
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it('M53-ASSET-ID-RESOLVES-BY-FILENAME keeps stable-id rendering through an output rename', () => {
    const renamed = structuredClone(STARTER_ART_MANIFEST);
    const fighter = renamed.assets.find((entry) => entry.id === 'art.token.pc.fighter.v1');
    expect(fighter).toBeDefined();
    if (fighter === undefined) return;
    fighter.output.path = 'assets/art/renamed-fighter-proof.png';
    const decoded = decodeArtManifest(renamed);

    expect(resolveStarterArt(assetId('art.token.pc.fighter.v1'), decoded).manifest.output.path)
      .toBe('assets/art/renamed-fighter-proof.png');
    expect(renderStarterArtPng(assetId('art.token.pc.fighter.v1'), decoded))
      .toEqual(renderStarterArtPng(assetId('art.token.pc.fighter.v1')));
  });

  it('M54-FIXTURE-FETCHES-REMOTE-TEXTURE renders with a hostile network sentinel', () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('NETWORK ACCESS FORBIDDEN DURING ART RENDER');
    }) as typeof fetch;
    try {
      for (const entry of STARTER_ART_MANIFEST.assets) {
        expect(starterArtDataUri(entry.id)).toMatch(/^data:image\/png;base64,/u);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }

    for (const path of [
      'src/assets/pixel-art.ts',
      'src/assets/starter-art-resolver.ts',
      'src/vtt/board-chrome.ts',
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
    expect(text('ART-PROVENANCE.md')).toContain('CC0 1.0 Universal');
    expect(text('NOTICE.md')).toContain('[LICENSE-ART](LICENSE-ART)');
    expect(renderLegalPage()).toContain(STARTER_ART_ATTRIBUTION);

    const declaration = BUNDLED_LICENSE_FILES.find(
      (entry) => entry.fileName === 'LICENSE-ART',
    );
    expect(declaration?.sha256).toBe(sha256(bytes('LICENSE-ART')));
    const emitted = bundledLicenseAssets(repositoryRoot).find(
      (entry) => entry.fileName === 'LICENSE-ART',
    );
    expect(Buffer.from(emitted?.source ?? []).toString('utf8')).toBe(
      text('LICENSE-ART'),
    );
    const guard = text('tools/assert-dist-clean.mjs');
    expect(guard).toContain('LICENSE-ART');
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
    const preview = text(STARTER_ART_PREVIEW_PATH);
    expect(sha256(preview)).toBe(EXPECTED_PREVIEW_SHA256);
    expect(preview).toContain(`data-sprite-inventory="${String(EXPECTED_TOKEN_COUNT)}"`);
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
