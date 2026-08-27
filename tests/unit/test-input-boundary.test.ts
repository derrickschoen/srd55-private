import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from '../helpers/test-filesystem';

const repositoryRoot = process.cwd();
const vitestExecutable = resolve(repositoryRoot, 'node_modules/vitest/vitest.mjs');

function repositoryProbeDirectory(): string {
  const parent = resolve(repositoryRoot, 'tests/test-input-boundary-probes');
  mkdirSync(parent, { recursive: true });
  return mkdtempSync(`${parent}/probe-`);
}

describe('test input build-time and runtime boundaries', () => {
  it('reports a planted raw node:fs import in a fake test path', () => {
    const probeDirectory = repositoryProbeDirectory();
    const probe = join(probeDirectory, 'raw-filesystem.test.ts');
    try {
      writeFileSync(probe, "import { readFileSync } from 'node:fs';\n", 'utf8');
      const result = spawnSync(
        'sg',
        [
          'scan',
          '--rule',
          'ast-grep-rules/no-raw-fs-in-tests.yml',
          '--color',
          'never',
          relative(repositoryRoot, probe),
        ],
        { cwd: repositoryRoot, encoding: 'utf8' },
      );

      const output = `${result.stdout}${result.stderr}`;
      expect(result.status).toBe(1);
      expect(output).toContain('error[no-raw-fs-in-tests]');
      expect(output).toContain("import { readFileSync } from 'node:fs';");
    } finally {
      rmSync(probeDirectory, { recursive: true, force: true });
    }
  });

  it('fails an undeclared repository read and emits no observation record', () => {
    const probeDirectory = repositoryProbeDirectory();
    const probe = join(probeDirectory, 'undeclared-input.test.ts');
    const observations = mkdtempSync(join(tmpdir(), 'dnd-input-audit-observations-'));
    try {
      writeFileSync(
        probe,
        [
          "import { readFileSync } from '../../helpers/test-filesystem';",
          "import { declareTestInputs } from '../../helpers/test-inputs';",
          "import { expect, it } from 'vitest';",
          '',
          "declareTestInputs({ fixtures: ['tests/fixtures/content-pack-v1-homebrew.json'] });",
          '',
          "it('reads outside its declaration', () => {",
          "  expect(readFileSync('tests/fixtures/external-party-pack-valid.json', 'utf8')).not.toBe('');",
          '});',
          '',
        ].join('\n'),
        'utf8',
      );

      const result = spawnSync(
        process.execPath,
        [
          vitestExecutable,
          'run',
          '--configLoader',
          'runner',
          '--reporter=default',
          probe,
        ],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            VERDICT_FS_OBSERVATIONS_DIR: observations,
            VERDICT_REPOSITORY_ROOT: repositoryRoot,
          },
        },
      );

      const output = `${result.stdout}${result.stderr}`;
      expect(result.status).toBe(1);
      expect(output).toContain('Test input audit failed');
      expect(output).toContain(
        'undeclared repository input: file:tests/fixtures/external-party-pack-valid.json',
      );
      expect(readdirSync(observations)).toEqual([]);
    } finally {
      rmSync(probeDirectory, { recursive: true, force: true });
      rmSync(observations, { recursive: true, force: true });
    }
  });
});
