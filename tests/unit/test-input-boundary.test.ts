import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRANSIENT_PROBES } from '../../scripts/transient-probes.mjs';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from '../helpers/test-filesystem';

const repositoryRoot = process.cwd();
const vitestExecutable = resolve(repositoryRoot, 'node_modules/vitest/vitest.mjs');

/**
 * A probe directory of its own in TRANSIENT_PROBES, where a probe the ast-grep
 * rule's `files` reaches may be written, and one Vitest runs under
 * tests/helpers/transient-probes.vitest.config.ts.
 */
function repositoryProbeDirectory(): string {
  const parent = resolve(repositoryRoot, TRANSIENT_PROBES);
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
          // The regular config leaves TRANSIENT_PROBES out.
          '--config',
          'tests/helpers/transient-probes.vitest.config.ts',
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

/*
 * A probe lies in TRANSIENT_PROBES only while the test that wrote it runs: a
 * run killed before its `finally` leaves it behind, gitignored and so never
 * committed. The regular include reaches that directory, and a probe with no
 * test in it fails its suite with "No test suite found" (review r1 P2). So the
 * regular config and the mutation config, which extends it, leave the
 * directory out, and a probe that must run through Vitest runs under the
 * probe config, which includes that directory alone.
 */
describe(`an orphaned probe in ${TRANSIENT_PROBES}`, () => {
  const control = 'tests/unit/test-input-boundary.test.ts';
  const probeConfig = 'tests/helpers/transient-probes.vitest.config.ts';

  /** The test files, as repository paths, that Vitest under `config` lists among `filters`. */
  function listed(config: string, filters: readonly string[]): string[] {
    const listing = mkdtempSync(join(tmpdir(), 'dnd-transient-probes-listing-'));
    const output = join(listing, 'files.json');
    try {
      const result = spawnSync(
        process.execPath,
        [vitestExecutable, 'list', '--configLoader', 'runner', '--config', config, '--filesOnly', `--json=${output}`, ...filters],
        { cwd: repositoryRoot, encoding: 'utf8' },
      );
      expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
      const files = JSON.parse(readFileSync(output, 'utf8')) as readonly { readonly file: string }[];
      return files.map(({ file }) => relative(repositoryRoot, file)).sort();
    } finally {
      rmSync(listing, { recursive: true, force: true });
    }
  }

  /** Runs `check` with the raw-filesystem probe the first test above writes, left behind as a killed run leaves it. */
  function withOrphan(check: (orphan: string) => void): void {
    const probeDirectory = repositoryProbeDirectory();
    try {
      const orphan = join(probeDirectory, 'raw-filesystem.test.ts');
      writeFileSync(orphan, "import { readFileSync } from 'node:fs';\n", 'utf8');
      check(relative(repositoryRoot, orphan));
    } finally {
      rmSync(probeDirectory, { recursive: true, force: true });
    }
  }

  it.each(['vitest.config.ts', 'vitest.stryker.config.ts'])('is not a test file under %s', (config) => {
    withOrphan((orphan) => {
      expect(listed(config, [orphan, control])).toEqual([control]);
    });
  });

  it(`is a test file under ${probeConfig}, which lists no other`, () => {
    withOrphan((orphan) => {
      expect(listed(probeConfig, [orphan, control])).toEqual([orphan]);
    });
  });
});
