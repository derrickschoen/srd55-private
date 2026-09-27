import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildClosure,
  cachedVerdict,
  failClosedReasons,
  globalSalt,
  observationRecord,
  storeVerdict,
  type ObservationRecord,
} from '../../scripts/test-affected.mjs';
import { ENGINE_CHILD_BUNDLE_ENV, engineChildSealedReads } from '../../tools/engine-child-bundle';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from '../helpers/test-filesystem';

/*
 * The verdict recorder end to end (D912): one Vitest run under the recorder
 * over four probe files, then the verdict cache's own functions over what it
 * recorded.
 *   - RECORDER-A: a file that declares engine children passes the input audit
 *     with exactly the bundle check's reads declared; one that does not fails it.
 *   - ENV-TRACE: every environment variable a test reads is recorded and keys
 *     the verdict by value, so a green recorded with DND_LANE_INTEL_MODE unset
 *     is not reused under DND_LANE_INTEL_MODE=off (the false green the
 *     recorder research reproduced, P6).
 */

const repositoryRoot = realpathSync(process.cwd());
const vitestExecutable = join(repositoryRoot, 'node_modules/vitest/vitest.mjs');
const LANE_INTEL = 'DND_LANE_INTEL_MODE';

const PROBES = {
  environment: [
    "import { expect, it } from 'vitest';",
    '',
    "it('runs with lane intel on', () => {",
    `  expect(process.env['${LANE_INTEL}']).not.toBe('off');`,
    '});',
  ],
  enumeration: [
    "import { expect, it } from 'vitest';",
    '',
    "it('copies the whole environment', () => {",
    '  expect(Object.keys(process.env).length).toBeGreaterThan(0);',
    '});',
  ],
  declared: [
    "import { expect, it } from 'vitest';",
    "import { checkEngineChildBundle, ENGINE_CHILD_BUNDLE_ENV } from '../../../tools/engine-child-bundle';",
    "import { declareTestInputs } from '../../helpers/test-inputs';",
    '',
    'declareTestInputs({ engineChildren: true });',
    '',
    "it('checks the offered engine child bundle', () => {",
    "  expect(checkEngineChildBundle(process.cwd(), process.env[ENGINE_CHILD_BUNDLE_ENV] ?? '').status).toBe('valid');",
    '});',
  ],
  undeclared: [
    "import { expect, it } from 'vitest';",
    "import { checkEngineChildBundle, ENGINE_CHILD_BUNDLE_ENV } from '../../../tools/engine-child-bundle';",
    "import { declareTestInputs } from '../../helpers/test-inputs';",
    '',
    'declareTestInputs({});',
    '',
    "it('checks the offered engine child bundle', () => {",
    "  expect(checkEngineChildBundle(process.cwd(), process.env[ENGINE_CHILD_BUNDLE_ENV] ?? '').status).toBe('valid');",
    '});',
  ],
} as const;
type Probe = keyof typeof PROBES;

let probeDirectory = '';
let observationsDirectory = '';
let output = '';
let exitStatus: number | null = null;
const records = new Map<Probe, unknown>();
const cacheRoots: string[] = [];

const probePath = (probe: Probe): string => join(probeDirectory, `${probe}.test.ts`);
const repositoryName = (path: string): string => relative(repositoryRoot, path).split('\\').join('/');

function recordOf(probe: Probe): ObservationRecord {
  const record = observationRecord(records.get(probe));
  if (record === undefined) throw new Error(`The recorder wrote no well-formed record for the ${probe} probe.\n${output}`);
  return record;
}

beforeAll(() => {
  const parent = join(repositoryRoot, 'tests/test-input-boundary-probes');
  mkdirSync(parent, { recursive: true });
  probeDirectory = mkdtempSync(`${parent}/verdict-inputs-`);
  observationsDirectory = mkdtempSync(join(tmpdir(), 'dnd-verdict-recorder-observations-'));
  for (const [probe, lines] of Object.entries(PROBES)) {
    writeFileSync(join(probeDirectory, `${probe}.test.ts`), `${lines.join('\n')}\n`, 'utf8');
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    VERDICT_FS_OBSERVATIONS_DIR: observationsDirectory,
    VERDICT_REPOSITORY_ROOT: repositoryRoot,
  };
  delete env[LANE_INTEL];
  const result = spawnSync(
    process.execPath,
    [
      vitestExecutable, 'run', '--configLoader', 'runner', '--reporter=default', '--maxWorkers=1',
      ...Object.keys(PROBES).map((probe) => probePath(probe as Probe)),
    ],
    { cwd: repositoryRoot, encoding: 'utf8', env },
  );
  output = `${result.stdout}${result.stderr}`;
  exitStatus = result.status;
  for (const name of readdirSync(observationsDirectory)) {
    const record = JSON.parse(readFileSync(join(observationsDirectory, name), 'utf8')) as { testFile?: unknown };
    const probe = (Object.keys(PROBES) as Probe[]).find((candidate) => record.testFile === repositoryName(probePath(candidate)));
    if (probe !== undefined) records.set(probe, record);
  }
});

afterAll(() => {
  rmSync(probeDirectory, { recursive: true, force: true });
  rmSync(observationsDirectory, { recursive: true, force: true });
  for (const directory of cacheRoots.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('recorder design A: declared engine children', () => {
  it('passes the audit of a file that declares engine children, having observed exactly what the check reads', () => {
    const offer = process.env[ENGINE_CHILD_BUNDLE_ENV];
    if (offer === undefined) throw new Error(`${ENGINE_CHILD_BUNDLE_ENV} is unset: the global setup offered no bundle.`);
    const reads = engineChildSealedReads(repositoryRoot, offer);
    const derived = [
      ...reads.contents.map((path) => `file:${repositoryName(path)}`),
      ...reads.existence.map((path) => `path:${repositoryName(path)}`),
    ].sort();
    const record = recordOf('declared');
    const snapshotProbe = `path:${repositoryName(join(probeDirectory, '__snapshots__/declared.test.ts.snap'))}`;

    expect(record.observedInputs.filter((input) => input !== snapshotProbe)).toEqual(derived);
    expect(record.declaredInputs).toEqual(derived);
    expect(record.externalInputs).toEqual([]);
  });

  it('fails the audit of a file that runs the bundle check without declaring engine children', () => {
    const offer = process.env[ENGINE_CHILD_BUNDLE_ENV] ?? '';
    const sidecar = repositoryName(offer.replace(/\.mjs$/, '.json'));

    expect(exitStatus).toBe(1);
    expect(records.has('undeclared')).toBe(false);
    expect(output).toContain(`Test input audit failed for ${repositoryName(probePath('undeclared'))}`);
    expect(output).toContain(`undeclared repository input: file:${sidecar}`);
  });
});

describe('ENV-TRACE: environment reads key the verdict', () => {
  it('does not reuse a green recorded with DND_LANE_INTEL_MODE unset once it is off, and reuses it again once unset', () => {
    const probe = probePath('environment');
    const record = recordOf('environment');
    const graph = buildClosure(probe);
    const cacheRoot = mkdtempSync(join(tmpdir(), 'dnd-verdict-cache-witness-'));
    cacheRoots.push(cacheRoot);
    vi.stubEnv(LANE_INTEL, undefined);

    expect(failClosedReasons(graph, record)).toEqual([]);
    expect(storeVerdict({ testFile: probe, graph, record, testCount: 1, salt: globalSalt(), cacheRoot }))
      .toBeTypeOf('string');
    expect(cachedVerdict(probe, globalSalt(), cacheRoot)?.testCount).toBe(1);
    vi.stubEnv(LANE_INTEL, 'off');
    expect(cachedVerdict(probe, globalSalt(), cacheRoot)).toBeUndefined();
    vi.stubEnv(LANE_INTEL, 'full');
    expect(cachedVerdict(probe, globalSalt(), cacheRoot)).toBeUndefined();
    vi.stubEnv(LANE_INTEL, undefined);
    expect(cachedVerdict(probe, globalSalt(), cacheRoot)?.testCount).toBe(1);
  });

  it('records the variables a test reads, by name', () => {
    const record = recordOf('environment');

    expect(record.environmentInputs).toContain(LANE_INTEL);
    expect(record.environmentEnumerated).toBe(false);
  });

  it('fails closed a file that enumerates the environment, whose verdict every variable would key', () => {
    const record = recordOf('enumeration');

    expect(record.environmentEnumerated).toBe(true);
    expect(failClosedReasons(buildClosure(probePath('enumeration')), record)).toEqual(['<process.env enumerated>']);
  });
});
