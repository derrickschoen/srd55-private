import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AgentInvocation } from '../../../src/vtt/agent-session';
import { KB_SUBJECTS } from '../../../src/vtt/knowledge-base-contract';
import {
  captureLegacyAdviceProtocolSurface,
  LEGACY_ADVICE_ARENA_FIXTURE,
  type LegacyAdviceProtocolSurface,
} from '../../helpers/legacy-advice-surface';
import {
  parseConversationArgs,
  runConversation,
  serializeConversationRow,
  type ConversationBoardSnapshotService,
  type ConversationRowPersisted,
} from '../../../tools/ai-dm-conversation';
import {
  captureLegacyRunnerComponents,
  type LegacyRunnerCapture,
} from '../../../tools/ai-dm-legacy-oracle-capture';
import type { BoardImageArtifact, BoardSnapshotCapture } from '../../../tools/ai-dm-board-snapshot';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { declareTestInputs } from '../../helpers/test-inputs';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { readFile, readdir } from '../../helpers/test-filesystem-promises';

const legacyFixturePath = 'tests/fixtures/ai-dm-legacy/implicit-advice-v1.json' as const;
const runnerOraclePath = 'tests/fixtures/ai-dm-legacy/runner-oracle-main.json' as const;
const arenaFixturePath = 'tests/fixtures/arena-basis/seed-3943001.json' as const;
const legacyKbPaths = [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  ...KB_SUBJECTS.map((subject) => `tests/fixtures/ai-dm-kb/${subject}.md` as const),
] as const;
const inputs = declareTestInputs({
  fixtures: [
    legacyFixturePath,
    runnerOraclePath,
    arenaFixturePath,
    LEGACY_ADVICE_ARENA_FIXTURE,
    ...legacyKbPaths,
  ],
});

const APPROVED_COMMIT = '493121dd902e5033197d72f0050a1b8b8e32ae7c';
const APPROVED_TREE = '87de2ce5776d6194413d61f94b6a0debe2640707';
const CAPTURE_TOOL_PATH = 'tools/ai-dm-legacy-oracle-capture.ts';
const LEGACY_TIMING_FIELDS = [
  'endToEndWall',
  'timeToFirstAction',
  'wallPerCreature',
] as const satisfies readonly (keyof ConversationRowPersisted)[];
const testDirectory = mkdtempSync(join(tmpdir(), 'dnd-legacy-runner-invariance-'));

interface LockedBytes {
  readonly byteCount: number;
  readonly sha256: string;
  readonly base64: string;
}

interface LegacyRunnerOracle {
  readonly version: 'legacy-runner-oracle-v1';
  readonly provenance: {
    readonly repoCommit: typeof APPROVED_COMMIT;
    readonly tree: typeof APPROVED_TREE;
    readonly commandLine: readonly string[];
    readonly capturedAt: string;
    readonly nodeVersion: string;
    readonly checkoutRoot: string;
    readonly captureToolSha256: string;
    readonly trackedStatus: '';
    readonly untrackedAllowlist: readonly [typeof CAPTURE_TOOL_PATH];
    readonly timingFields: typeof LEGACY_TIMING_FIELDS;
  };
  readonly runs: {
    readonly primary: LegacyRunnerCapture;
    readonly correction: LegacyRunnerCapture;
  };
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function mutableRecord(value: unknown, label: string): Record<string, unknown> {
  return record(value, label) as Record<string, unknown>;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function lockedBytes(value: unknown, label: string): LockedBytes {
  const component = record(value, label);
  if (typeof component['byteCount'] !== 'number' || !Number.isSafeInteger(component['byteCount']) ||
    component['byteCount'] < 0 || typeof component['sha256'] !== 'string' ||
    typeof component['base64'] !== 'string') {
    throw new TypeError(`${label} is malformed.`);
  }
  const bytes = Buffer.from(component['base64'], 'base64');
  if (bytes.byteLength !== component['byteCount']) throw new TypeError(`${label} byte count differs.`);
  if (sha256(bytes) !== component['sha256']) throw new TypeError(`${label} digest differs.`);
  return {
    byteCount: component['byteCount'],
    sha256: component['sha256'],
    base64: component['base64'],
  };
}

function lockedText(value: unknown, label: string): string {
  return Buffer.from(lockedBytes(value, label).base64, 'base64').toString('utf8');
}

function validateCapture(value: unknown, label: string): LegacyRunnerCapture {
  const capture = record(value, label);
  lockedBytes(capture['rowJsonl'], `${label}.rowJsonl`);
  lockedBytes(capture['protectedPrimaryInvocation'], `${label}.protectedPrimaryInvocation`);
  const launchers = record(capture['launchers'], `${label}.launchers`);
  const expectedNames = [
    'room-1-round-1-correction-launcher-full.json',
    'room-1-round-1-correction-launcher.json',
    'room-1-round-1-initial-launcher-full.json',
    'room-1-round-1-initial-launcher.json',
  ];
  if (JSON.stringify(Object.keys(launchers).sort()) !== JSON.stringify(expectedNames)) {
    throw new TypeError(`${label} launcher inventory differs.`);
  }
  for (const name of expectedNames) lockedBytes(launchers[name], `${label}.launchers.${name}`);
  return capture as unknown as LegacyRunnerCapture;
}

function currentHead(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
}

function captureToolDigest(): string {
  return sha256(readFileSync(resolve(process.cwd(), CAPTURE_TOOL_PATH)));
}

function validateRunnerOracle(text: string | null): LegacyRunnerOracle {
  if (text === null) throw new TypeError('missing runner-oracle-main.json');
  const parsed = record(JSON.parse(text) as unknown, 'runner oracle');
  if (parsed['version'] !== 'legacy-runner-oracle-v1') {
    throw new TypeError('runner oracle is provisional or has an unsupported version');
  }
  const provenance = record(parsed['provenance'], 'runner oracle provenance');
  if (provenance['repoCommit'] !== APPROVED_COMMIT) throw new TypeError('runner oracle commit differs');
  if (provenance['tree'] !== APPROVED_TREE) throw new TypeError('runner oracle tree differs');
  if (provenance['repoCommit'] === currentHead()) throw new TypeError('runner oracle commit equals current HEAD');
  if (provenance['captureToolSha256'] !== captureToolDigest()) {
    throw new TypeError('runner oracle capture tool digest differs');
  }
  if (provenance['trackedStatus'] !== '') throw new TypeError('runner oracle tracked status is dirty');
  if (JSON.stringify(provenance['untrackedAllowlist']) !== JSON.stringify([CAPTURE_TOOL_PATH])) {
    throw new TypeError('runner oracle untracked allowlist differs');
  }
  if (JSON.stringify(provenance['timingFields']) !== JSON.stringify(LEGACY_TIMING_FIELDS)) {
    throw new TypeError('runner oracle timing fields differ');
  }
  if (!Array.isArray(provenance['commandLine']) ||
    !provenance['commandLine'].every((entry) => typeof entry === 'string') ||
    !provenance['commandLine'].includes('--expected-commit') ||
    !provenance['commandLine'].includes(APPROVED_COMMIT) ||
    provenance['commandLine'].includes('--provisional')) {
    throw new TypeError('runner oracle command line differs');
  }
  if (typeof provenance['capturedAt'] !== 'string' ||
    Number.isNaN(Date.parse(provenance['capturedAt']))) {
    throw new TypeError('runner oracle capture date is invalid');
  }
  if (typeof provenance['nodeVersion'] !== 'string' || !provenance['nodeVersion'].startsWith('v')) {
    throw new TypeError('runner oracle Node version is invalid');
  }
  if (typeof provenance['checkoutRoot'] !== 'string' || provenance['checkoutRoot'].length === 0) {
    throw new TypeError('runner oracle checkout root is invalid');
  }
  const runs = record(parsed['runs'], 'runner oracle runs');
  validateCapture(runs['primary'], 'runner oracle primary');
  validateCapture(runs['correction'], 'runner oracle correction');
  return parsed as unknown as LegacyRunnerOracle;
}

function runnerOracleText(): string {
  try {
    return inputs.fixtures.readText(runnerOraclePath);
  } catch {
    throw new TypeError('missing runner-oracle-main.json');
  }
}

function runnerOracle(): LegacyRunnerOracle {
  return validateRunnerOracle(runnerOracleText());
}

function legacyConfig(outPath: string, extra: readonly string[] = []) {
  return parseConversationArgs([
    '--fixtures', 'tests/fixtures/arena-basis',
    '--rooms', '1',
    '--rounds', '1',
    '--out', outPath,
    '--dry-run',
    ...extra,
  ]);
}

function explicitIncumbentArgs(): readonly string[] {
  return [
    '--cli', 'codex',
    '--model', 'gpt-5.6-sol',
    '--effort', 'medium',
    '--timeout-ms', '120000',
    '--transport', 'mcp_minimal',
    '--instruction-source', 'none',
    '--combat-model', 'initiative_segments_v1',
    '--initiative-profile', 'derived_v1',
    '--intel-mode', 'full',
    '--override-policy', 'typed_reason',
    '--renderer-profile', JSON.stringify(DEFAULT_RENDERER_PROFILE),
    '--board-image', 'off',
  ];
}

interface PrimaryEvidence {
  readonly capture: LegacyRunnerCapture;
  readonly invocation: AgentInvocation;
}

let primaryEvidencePromise: Promise<PrimaryEvidence> | null = null;
function primaryEvidence(): Promise<PrimaryEvidence> {
  primaryEvidencePromise ??= (async () => {
    const invocations: AgentInvocation[] = [];
    const capture = await captureLegacyRunnerComponents(
      legacyConfig(join(testDirectory, 'implicit.jsonl')),
      {
        repoCommit: APPROVED_COMMIT,
        clock: () => 0,
        onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
      },
    );
    const invocation = invocations[0];
    if (invocations.length !== 1 || invocation === undefined) {
      throw new TypeError(`Expected one primary invocation; received ${String(invocations.length)}.`);
    }
    return { capture, invocation };
  })();
  return primaryEvidencePromise;
}

let correctionCapturePromise: Promise<LegacyRunnerCapture> | null = null;
function correctionCapture(): Promise<LegacyRunnerCapture> {
  correctionCapturePromise ??= captureLegacyRunnerComponents(
    legacyConfig(join(testDirectory, 'correction.jsonl')),
    {
      repoCommit: APPROVED_COMMIT,
      clock: () => 0,
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    },
  );
  return correctionCapturePromise;
}

function firstDifference(expected: unknown, actual: unknown, path: string): string | null {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${String(index)}]`);
      if (difference !== null) return difference;
    }
    return path;
  }
  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) &&
    typeof actual === 'object' && actual !== null && !Array.isArray(actual)) {
    const expectedObject = expected as Readonly<Record<string, unknown>>;
    const actualObject = actual as Readonly<Record<string, unknown>>;
    const expectedKeys = Object.keys(expectedObject);
    const actualKeys = Object.keys(actualObject);
    const unexpected = actualKeys.filter((key) => !Object.hasOwn(expectedObject, key)).sort()[0];
    if (unexpected !== undefined) return `${path}.${unexpected}`;
    const missing = expectedKeys.filter((key) => !Object.hasOwn(actualObject, key)).sort()[0];
    if (missing !== undefined) return `${path}.${missing}`;
    const keys = expectedKeys.sort();
    for (const key of keys) {
      const difference = firstDifference(expectedObject[key], actualObject[key], `${path}.${key}`);
      if (difference !== null) return difference;
    }
    return path;
  }
  return path;
}

function expectExactJson(expectedText: string, actualText: string, path: string): void {
  if (expectedText === actualText) return;
  const expected = JSON.parse(expectedText) as unknown;
  const actual = JSON.parse(actualText) as unknown;
  throw new Error(`${firstDifference(expected, actual, path) ?? path} differs`);
}

function assertNoProperty(value: unknown, property: string, label: string, path = '$'): void {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      assertNoProperty(entry, property, label, `${path}[${String(index)}]`);
    }
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === property) throw new Error(`${label} ${path}.${key}`);
    assertNoProperty(entry, property, label, `${path}.${key}`);
  }
}

function normalizeOracleRow(bytes: LockedBytes, label: string): string {
  const original = lockedText(bytes, label);
  if (!original.endsWith('\n') || original.includes('\r') || original.split('\n').length !== 2) {
    throw new TypeError(`${label} is not canonical one-row JSONL.`);
  }
  const expected = JSON.parse(original.slice(0, -1)) as Mutable<ConversationRowPersisted>;
  for (const field of LEGACY_TIMING_FIELDS) {
    const value = expected[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`${label} ${field} is not finite and non-negative.`);
    }
  }
  if (expected.endToEndWall <= 0 || expected.timeToFirstAction <= 0) {
    throw new TypeError(`${label} approved-main primary timing values must be positive.`);
  }
  expected.endToEndWall = 0;
  expected.timeToFirstAction = 0;
  expected.wallPerCreature = 0;
  return `${JSON.stringify(expected)}\n`;
}

function dimensionedPng(identity: string): Buffer {
  const png = Buffer.alloc(96);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(1, 16);
  png.writeUInt32BE(1, 20);
  Buffer.from(identity, 'utf8').subarray(0, 72).copy(png, 24);
  return png;
}

class FakeAdviceSnapshotService implements ConversationBoardSnapshotService {
  readonly outputDirectory = mkdtempSync(join(tmpdir(), 'legacy-advice-images-'));

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    const png = dimensionedPng(input.source.stateDigest);
    const digest = sha256(png);
    const relativePath = `board-images/${digest}.png` as const;
    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
    writeFileSync(join(this.outputDirectory, relativePath), png);
    const html = Buffer.from('<!doctype html><html lang="en"><body>legacy advice</body></html>\n');
    const htmlDigest = sha256(html);
    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
    mkdirSync(join(this.outputDirectory, 'board-html', htmlDigest), { recursive: true });
    writeFileSync(join(this.outputDirectory, htmlRelativePath), html);
    return {
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath,
      sha256: digest,
      bytes: png.byteLength,
      width: 1,
      height: 1,
      capturedAtUnixMs: Date.now(),
      captureMs: 1,
      source: { ...input.source },
      chromiumVersion: 'SIMULATED Chromium',
      html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
    };
  }

  async close(): Promise<void> {}
}

type LockedComponentName = keyof LegacyAdviceProtocolSurface | 'row';

function lockedFixture(): Readonly<Record<LockedComponentName, LockedBytes>> {
  const root = record(JSON.parse(inputs.fixtures.readText(legacyFixturePath)) as unknown, 'legacy fixture');
  if (root['version'] !== 'legacy-implicit-advice-v1') {
    throw new TypeError('Legacy advice fixture has an unsupported version.');
  }
  const components = record(root['components'], 'legacy fixture components');
  const names = [
    'startupInstructions', 'initialPrompt', 'tools', 'resources', 'prompts', 'context', 'row',
  ] as const satisfies readonly LockedComponentName[];
  return Object.fromEntries(names.map((name) => {
    const component = record(components[name], `legacy fixture ${name}`);
    if (typeof component['byteCount'] !== 'number' || typeof component['sha256'] !== 'string' ||
      typeof component['base64'] !== 'string') {
      throw new TypeError(`Legacy fixture ${name} is malformed.`);
    }
    return [name, {
      byteCount: component['byteCount'],
      sha256: component['sha256'],
      base64: component['base64'],
    }];
  })) as Readonly<Record<LockedComponentName, LockedBytes>>;
}

function expectLockedBytes(actual: LegacyAdviceProtocolSurface): void {
  const expected = lockedFixture();
  for (const name of Object.keys(actual) as (keyof LegacyAdviceProtocolSurface)[]) {
    const actualBytes = Buffer.from(actual[name], 'utf8');
    const expectedBytes = Buffer.from(expected[name].base64, 'base64');
    expect(actualBytes, `${name} bytes`).toEqual(expectedBytes);
    expect(actualBytes.byteLength, `${name} byte count`).toBe(expected[name].byteCount);
    expect(createHash('sha256').update(actualBytes).digest('hex'), `${name} digest`)
      .toBe(expected[name].sha256);
  }
}

describe('D569 implicit advice legacy invariance', () => {
  it('locks the no-flag startup, prompt, tool, resource, context, and row bytes', async () => {
    const surface = await captureLegacyAdviceProtocolSurface(process.cwd());
    const lockedRow = Buffer.from(lockedFixture().row.base64, 'base64').toString('utf8');
    const parsedRow = JSON.parse(lockedRow) as ConversationRowPersisted;

    expectLockedBytes(surface);
    expect(serializeConversationRow(parsedRow)).toBe(lockedRow);
    expect(record(parsedRow as unknown, 'legacy row')).not.toHaveProperty('dmMode');
  });

  it('keeps implicit and explicit incumbent configs equal except outPath while retaining internal advice mode metadata', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-legacy-advice-explicit-'));
    const implicit = parseConversationArgs([
      '--out', join(directory, 'implicit.jsonl'),
      '--dry-run',
    ]);
    const explicit = parseConversationArgs([
      '--out', join(directory, 'explicit.jsonl'),
      '--dry-run',
      ...explicitIncumbentArgs(),
    ]);
    const normalizeOutput = <T extends { readonly outPath: string }>(config: T): T => ({
      ...config,
      outPath: '<legacy-output>',
    });

    expect(normalizeOutput(implicit)).toEqual(normalizeOutput(explicit));
    expect(implicit.dmMode).toBe('advice');
    expect(implicit.dmModeExplicit).toBe(false);
    expect(explicit.dmMode).toBe('advice');
    expect(explicit.dmModeExplicit).toBe(false);
  });

  it('refuses every runner oracle except the clean approved main 493121dd capture', () => {
    const text = runnerOracleText();
    expect(() => validateRunnerOracle(null)).toThrow('missing runner-oracle-main.json');
    const approved = validateRunnerOracle(text);
    const source = JSON.parse(text) as unknown;
    const clone = (): Record<string, unknown> =>
      mutableRecord(JSON.parse(JSON.stringify(source)) as unknown, 'runner oracle clone');
    const withProvenance = (
      mutation: Readonly<Record<string, unknown>>,
    ): string => {
      const candidate = clone();
      candidate['provenance'] = {
        ...record(candidate['provenance'], 'runner oracle clone provenance'),
        ...mutation,
      };
      return JSON.stringify(candidate);
    };
    const provisional = clone();
    provisional['version'] = 'legacy-runner-oracle-provisional-v1';

    expect(() => validateRunnerOracle(JSON.stringify(provisional))).toThrow('provisional');
    expect(() => validateRunnerOracle(withProvenance({ repoCommit: '0000000000000000000000000000000000000000' })))
      .toThrow('commit differs');
    expect(() => validateRunnerOracle(withProvenance({ tree: '0000000000000000000000000000000000000000' })))
      .toThrow('tree differs');
    expect(() => validateRunnerOracle(withProvenance({ captureToolSha256: '0'.repeat(64) })))
      .toThrow('capture tool digest differs');
    expect(() => validateRunnerOracle(withProvenance({ repoCommit: currentHead() })))
      .toThrow('commit differs');
    expect(approved.provenance.repoCommit).not.toBe(currentHead());
  });

  describe('approved-main row comparison', () => {
    let primary: PrimaryEvidence;
    let correction: LegacyRunnerCapture;
    beforeAll(async () => { primary = await primaryEvidence(); });
    beforeAll(async () => { correction = await correctionCapture(); });

    it('matches both approved-main captured JSONL cases after only the frozen timing substitution', () => {
      const oracle = runnerOracle();
      for (const [name, expectedCapture, actualCapture] of [
        ['primary', oracle.runs.primary, primary.capture],
        ['correction', oracle.runs.correction, correction],
      ] as const) {
        const expected = normalizeOracleRow(expectedCapture.rowJsonl, `runner oracle ${name} row`);
        const actual = lockedText(actualCapture.rowJsonl, `blind replay ${name} row`);
        expectExactJson(expected.slice(0, -1), actual.slice(0, -1), 'row[0]');
        expect(actual, `${name} canonical transformed JSONL`).toBe(expected);
      }
    });
  });

  describe('literal incumbent-default runner comparison', () => {
    let implicit: PrimaryEvidence;
    let explicit: LegacyRunnerCapture;
    beforeAll(async () => {
      implicit = await primaryEvidence();
    });
    beforeAll(async () => {
      explicit = await captureLegacyRunnerComponents(
        legacyConfig(join(testDirectory, 'explicit.jsonl'), explicitIncumbentArgs()),
        { repoCommit: APPROVED_COMMIT, clock: () => 0 },
      );
    });

    it('keeps explicit incumbent-default persisted JSONL literally identical to no-flag JSONL', () => {
      const implicitText = lockedText(implicit.capture.rowJsonl, 'implicit row');
      const explicitText = lockedText(explicit.rowJsonl, 'explicit incumbent-default row');

      expect(explicitText).toBe(implicitText);
      expect(explicitText.endsWith('\n')).toBe(true);
      expect(explicitText.split('\n')).toHaveLength(2);
    });
  });

  describe('approved-main initial launcher comparison', () => {
    let actual: LegacyRunnerCapture;
    beforeAll(async () => { actual = (await primaryEvidence()).capture; });

    it('matches initial launchers across distinct checkouts modulo only the frozen root inventory and contains no dmMode', () => {
      const oracle = runnerOracle();
      expect(oracle.provenance.checkoutRoot).not.toBe(realpathSync(process.cwd()));
      for (const name of [
        'room-1-round-1-initial-launcher.json',
        'room-1-round-1-initial-launcher-full.json',
      ]) {
        const expectedText = lockedText(oracle.runs.primary.launchers[name], `oracle ${name}`);
        const actualText = lockedText(actual.launchers[name], `blind replay ${name}`);
        const diagnostic = name.endsWith('-launcher.json')
          ? 'initial-launcher.json'
          : 'initial-launcher-full.json';
        assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', diagnostic);
        expectExactJson(expectedText, actualText, diagnostic);
        expect(actualText, name).toBe(expectedText);
      }
    });
  });

  describe('approved-main correction launcher comparison', () => {
    let actual: LegacyRunnerCapture;
    beforeAll(async () => { actual = await correctionCapture(); });

    it('enters correction and matches every approved-main correction launcher manifest without dmMode at any depth', () => {
      const oracle = runnerOracle();
      const actualRow = record(
        JSON.parse(lockedText(actual.rowJsonl, 'blind correction row').slice(0, -1)) as unknown,
        'blind correction row',
      );
      const roundTotals = record(actualRow['roundTotals'], 'blind correction round totals');
      expect(roundTotals['correctionCalls']).toBe(1);
      for (const name of [
        'room-1-round-1-correction-launcher.json',
        'room-1-round-1-correction-launcher-full.json',
      ]) {
        const expectedText = lockedText(oracle.runs.correction.launchers[name], `oracle ${name}`);
        const actualText = lockedText(actual.launchers[name], `blind replay ${name}`);
        const diagnostic = name.endsWith('-launcher.json')
          ? 'correction-launcher.json'
          : 'correction-launcher-full.json';
        assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', diagnostic);
        expectExactJson(expectedText, actualText, diagnostic);
        expect(actualText, name).toBe(expectedText);
      }
    });
  });

  describe('approved-main protected invocation comparison', () => {
    let actual: PrimaryEvidence;
    beforeAll(async () => { actual = await primaryEvidence(); });

    it('matches protected primary invocation across checkouts modulo exact KB instruction roots and emits no undeclared config keys', () => {
      const oracle = runnerOracle();
      expect(oracle.provenance.checkoutRoot).not.toBe(realpathSync(process.cwd()));
      const expectedText = lockedText(
        oracle.runs.primary.protectedPrimaryInvocation,
        'oracle protected primary invocation',
      );
      const actualText = lockedText(
        actual.capture.protectedPrimaryInvocation,
        'blind protected primary invocation',
      );
      expectExactJson(expectedText, actualText, 'protectedPrimaryInvocation');
      expect(actualText).toBe(expectedText);
      expect(Object.keys(actual.invocation).sort()).toEqual([
        'callPhase',
        'freshSessionContext',
        'instructionSource',
        'instructions',
        'launcherToken',
        'model',
        'output',
        'prompt',
        'reasoningEffort',
        'recoveryLauncherToken',
        'runId',
        'sessionProfile',
        'skill',
        'timeoutMs',
      ]);
      assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', 'protectedPrimaryInvocation');
    });
  });

  describe('explicit advice runner capture', () => {
    let explicitRow: ConversationRowPersisted;
    let launcherTexts: readonly string[];
    beforeAll(async () => {
      const service = new FakeAdviceSnapshotService();
      const invocations: AgentInvocation[] = [];
      const result = await runConversation(
        legacyConfig(join(testDirectory, 'explicit-advice.jsonl'), ['--dm-mode', 'advice']),
        {
          repoCommit: APPROVED_COMMIT,
          clock: () => 0,
          boardSnapshotService: service,
          onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
        },
      );
      const invocation = invocations[0];
      if (invocations.length !== 1 || invocation === undefined || result.rows[0] === undefined) {
        throw new TypeError('Explicit advice runner did not produce one invocation and one row.');
      }
      explicitRow = result.rows[0];
      const artifactRoot = dirname(invocation.launcherToken);
      const launcherNames = (await readdir(artifactRoot))
        .filter((name) => name.includes('-launcher') && name.endsWith('.json'))
        .sort();
      launcherTexts = await Promise.all(launcherNames.map((name) =>
        readFile(join(artifactRoot, name), 'utf8')));
    });

    it('threads dmMode advice only when the mode flag is explicit', () => {
      expect(explicitRow.dmMode).toBe('advice');
      expect(launcherTexts).toHaveLength(4);
      for (const [index, text] of launcherTexts.entries()) {
        const launcher = record(JSON.parse(text) as unknown, `explicit advice launcher ${String(index)}`);
        expect(launcher['dmMode'], `explicit advice launcher ${String(index)}`).toBe('advice');
      }
    });
  });
});
