import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AUTHORING_RPC } from '../../src/authoring/client';
import {
  CHARACTER_EFFECT_FORM,
  FEATURE_ONLY_EFFECT_FORM,
} from '../../src/authoring/effect-forms';
import {
  characterEffectKinds,
  featureTemplateEffectKinds,
} from '../../src/domain/enums';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PROBES = [
  'docs/type-probes/homebrew-unions.probe.ts',
  'docs/type-probes/homebrew-effect-registry.probe.ts',
] as const;

describe('authoring contract seam', () => {
  it('pins the twenty-one catalog RPC names', () => {
    expect(AUTHORING_RPC).toEqual({
      list: 'authoring.list',
      backgroundReferences: 'authoring.backgroundReferences',
      createDraft: 'authoring.createDraft',
      readDraft: 'authoring.readDraft',
      saveDraft: 'authoring.saveDraft',
      discardDraft: 'authoring.discardDraft',
      previewPublish: 'authoring.previewPublish',
      commitPublish: 'authoring.commitPublish',
      usages: 'authoring.usages',
      previewReplacement: 'authoring.previewReplacement',
      commitReplacement: 'authoring.commitReplacement',
      previewReplacementSet: 'authoring.previewReplacementSet',
      commitReplacementSet: 'authoring.commitReplacementSet',
      previewArchiveSet: 'authoring.previewArchiveSet',
      commitArchiveSet: 'authoring.commitArchiveSet',
      listArchivedSets: 'authoring.listArchivedSets',
      previewRestoreSet: 'authoring.previewRestoreSet',
      commitRestoreSet: 'authoring.commitRestoreSet',
      purgeArchivedSet: 'authoring.purgeArchivedSet',
      previewBundledHomebrew: 'authoring.previewBundledHomebrew',
      installBundledHomebrew: 'authoring.installBundledHomebrew',
    });
  });

  it('maps every live effect kind and only those kinds', () => {
    expect(Object.keys(CHARACTER_EFFECT_FORM).sort()).toEqual(
      [...characterEffectKinds].sort(),
    );
    expect(Object.keys(FEATURE_ONLY_EFFECT_FORM).sort()).toEqual(
      featureTemplateEffectKinds
        .filter(
          (kind) =>
            !(characterEffectKinds as readonly string[]).includes(kind),
        )
        .sort(),
    );
  });

  /**
   * Measured alone at 3.1s post-CI-4a (3.20s originally). The 10s budget was
   * exceeded under a full parallel suite on the CI-4a-merged tree (the probe
   * compiles a larger contract surface and competes with every worker), so the
   * timeout carries full-suite headroom, not just isolated headroom.
   */
  it(
    'rejects every closed-union and registry probe',
    () => {
      const result = spawnSync(
        execPath,
        [
          fileURLToPath(
            new URL('../../node_modules/typescript/bin/tsc', import.meta.url),
          ),
          '--noEmit',
          '--strict',
          '--target',
          'ES2022',
          '--lib',
          'ES2022,DOM,WebWorker',
          '--module',
          'ESNext',
          '--moduleResolution',
          'Bundler',
          '--skipLibCheck',
          '--noUncheckedIndexedAccess',
          '--exactOptionalPropertyTypes',
          '--verbatimModuleSyntax',
          '--isolatedModules',
          '--moduleDetection',
          'force',
          'src/vite-env.d.ts',
          ...PROBES,
        ],
        { cwd: ROOT, encoding: 'utf8' },
      );
      const output = `${result.stdout}${result.stderr}`;
      const expectedDiagnostics = PROBES.flatMap((probe) =>
        readFileSync(`${ROOT}/${probe}`, 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            /^export const /u.test(line) ? [`${probe}:${String(index + 1)}`] : [],
          ),
      ).sort();
      const actualDiagnostics = [
        ...output.matchAll(
          /^(?<file>docs\/type-probes\/homebrew-[^(]+\.probe\.ts)\((?<line>\d+),\d+\): error/gmu,
        ),
      ]
        .map(
          (match) =>
            `${String(match.groups?.file)}:${String(match.groups?.line)}`,
        )
        .sort();

      expect(result.status, output).not.toBe(0);
      expect(output).not.toContain('error TS2307');
      expect(actualDiagnostics, output).toEqual(expectedDiagnostics);
    },
    30_000,
  );
});
