import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { observeFileReads } from '../../helpers/fs-read-spy';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';
import {
  checkEngineChildBundle,
  ENGINE_CHILD_BUNDLE_ENV,
  ENGINE_CHILD_ENTRY,
  ENGINE_CHILD_RECIPE_SOURCE,
  engineChildBundleDirectory,
  EngineChildBundleError,
  engineChildCheckReads,
  engineChildRecipe,
  engineChildSealedReads,
  writeEngineChildBundle,
  type EngineChildSidecar,
  type ViteNodeProfile,
} from '../../../tools/engine-child-bundle';

/*
 * DESIGN A of the recorder research (D912): a test file that starts engine
 * children declares exactly what the bundle check reads, derived from the
 * offered bundle's sidecar by `engineChildCheckReads`. The trace verifies the
 * walk: every case runs the real check under a file-read spy and holds the
 * spy's reads equal to the helper's, so the check cannot gain a read the
 * declaration lacks, and the helper cannot declare a file the check never
 * reads.
 */
declareTestInputs({ engineChildren: true });

const root = process.cwd();
const sha256Hex = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const scratch: string[] = [];
afterEach(() => {
  for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** The offered bundle's sidecar, as the check parses it. */
function sidecarOf(bundlePath: string): EngineChildSidecar {
  return JSON.parse(readFileSync(bundlePath.replace(/\.mjs$/, '.json'), 'utf8')) as EngineChildSidecar;
}

/** A two-input stand-in checkout sealed with `vite`, built from `profile(checkout)`. */
function sealedFakeCheckout(label: string, profile: (checkout: string) => ViteNodeProfile) {
  const checkout = mkdtempSync(join(tmpdir(), `dnd-engine-child-check-reads-${label}-`));
  scratch.push(checkout);
  mkdirSync(join(checkout, 'tools'), { recursive: true });
  mkdirSync(join(checkout, 'src'), { recursive: true });
  writeFileSync(join(checkout, ENGINE_CHILD_RECIPE_SOURCE), '// recipe\n');
  writeFileSync(join(checkout, 'src/engine.ts'), 'export const rule = 2;\n');
  writeFileSync(join(checkout, 'src/corpus.txt'), 'Fireball\n');
  const vite = profile(checkout);
  const inputs = ['src/corpus.txt', 'src/engine.ts'].map((path) => ({
    path: join(checkout, path), sha256: sha256Hex(readFileSync(join(checkout, path))),
  }));
  const sealed = writeEngineChildBundle(
    engineChildBundleDirectory(checkout), engineChildRecipe(checkout), inputs, vite, 'export const engine = 1;\n',
  );
  return { checkout, bundlePath: sealed.bundlePath };
}

/** What vite-node resolves with no Vite config; the resolve settings are never read by the check. */
function plainProfile(checkout: string, overrides: Partial<ViteNodeProfile> = {}): ViteNodeProfile {
  return {
    configFile: null, configInputs: [], envDir: checkout, mode: 'development', base: '/', environment: {},
    resolve: { ssr: {}, client: {} }, divergences: [], ...overrides,
  };
}

/** Runs the check under the spy; it must find the bundle valid, or the reads are some early exit's. */
function checkReads(checkout: string, bundlePath: string) {
  const { result, reads } = observeFileReads(() => checkEngineChildBundle(checkout, bundlePath));
  expect(result.status, JSON.stringify(result)).toBe('valid');
  return reads;
}

describe('engineChildCheckReads (recorder design A)', () => {
  it('names exactly what the check reads for the bundle the Vitest global setup offers in this checkout', () => {
    const offer = process.env[ENGINE_CHILD_BUNDLE_ENV];
    if (offer === undefined) expect.fail(`${ENGINE_CHILD_BUNDLE_ENV} is unset: the global setup offered no bundle.`);
    const reads = checkReads(root, offer);
    const declared = engineChildCheckReads(root, offer, sidecarOf(offer));

    expect(reads).toEqual({ ...declared, listings: [] });
    expect(engineChildSealedReads(root, offer)).toEqual(declared);
    // Hand-derived for this checkout: Vite's lookup stops at vite.config.ts,
    // and vite-node would load four .env files for mode development from the root.
    expect(declared.existence).toEqual([
      '.env', '.env.development', '.env.development.local', '.env.local',
      'vite.config.js', 'vite.config.mjs', 'vite.config.ts',
    ].map((name) => join(root, name)));
    expect(declared.contents).toEqual(expect.arrayContaining([
      offer, offer.replace(/\.mjs$/, '.json'), join(root, ENGINE_CHILD_RECIPE_SOURCE),
      join(root, ENGINE_CHILD_ENTRY), join(root, 'vite.config.ts'),
    ]));
  });

  it('probes the whole config lookup and every .env file when no Vite config is recorded', () => {
    const { checkout, bundlePath } = sealedFakeCheckout('plain', (at) => plainProfile(at));
    const reads = checkReads(checkout, bundlePath);

    expect(reads).toEqual({ ...engineChildCheckReads(checkout, bundlePath, sidecarOf(bundlePath)), listings: [] });
    expect(reads).toEqual({
      contents: [
        bundlePath, bundlePath.replace(/\.mjs$/, '.json'),
        join(checkout, 'src/corpus.txt'), join(checkout, 'src/engine.ts'), join(checkout, ENGINE_CHILD_RECIPE_SOURCE),
      ].sort(),
      existence: [
        '.env', '.env.development', '.env.development.local', '.env.local',
        'vite.config.cjs', 'vite.config.cts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts', 'vite.config.ts',
      ].map((name) => join(checkout, name)),
      listings: [],
    });
  });

  it('stops the lookup at the recorded config file, reads its inputs, and probes no .env file without an envDir', () => {
    const { checkout, bundlePath } = sealedFakeCheckout('config', (at) => {
      const configFile = join(at, 'vite.config.mjs');
      writeFileSync(configFile, 'export default {};\n');
      return plainProfile(at, {
        configFile, configInputs: [{ path: configFile, sha256: sha256Hex(readFileSync(configFile)) }], envDir: null,
      });
    });
    const reads = checkReads(checkout, bundlePath);

    expect(reads).toEqual({ ...engineChildCheckReads(checkout, bundlePath, sidecarOf(bundlePath)), listings: [] });
    expect(reads.existence).toEqual([join(checkout, 'vite.config.js'), join(checkout, 'vite.config.mjs')]);
    expect(reads.contents).toContain(join(checkout, 'vite.config.mjs'));
  });

  it('reads nothing itself', () => {
    const { checkout, bundlePath } = sealedFakeCheckout('pure', (at) => plainProfile(at));
    const sidecar = sidecarOf(bundlePath);
    const { result, reads } = observeFileReads(() => engineChildCheckReads(checkout, bundlePath, sidecar));

    expect(reads).toEqual({ contents: [], existence: [], listings: [] });
    expect(result.contents).toContain(join(checkout, 'src/engine.ts'));
  });

  it('declares nothing from a missing or invalid offer', () => {
    const { checkout, bundlePath } = sealedFakeCheckout('refused', (at) => plainProfile(at));
    const absent = join(checkout, 'absent.mjs');
    expect(() => engineChildSealedReads(checkout, absent)).toThrow(new EngineChildBundleError(
      `No engine child reads can be declared from ${absent}, which is missing: ${absent} does not exist.`,
    ));
    writeFileSync(bundlePath, 'export const engine = 2;\n');
    expect(() => engineChildSealedReads(checkout, bundlePath)).toThrow(new EngineChildBundleError(
      `No engine child reads can be declared from ${bundlePath}, which is invalid: ` +
        `${bundlePath} does not hash to the output digest recorded beside it.`,
    ));
  });
});
