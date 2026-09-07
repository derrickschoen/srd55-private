import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { KB_SUBJECTS } from '../../../src/vtt/knowledge-base-contract';
import {
  captureLegacyAdviceProtocolSurface,
  LEGACY_ADVICE_ARENA_FIXTURE,
  type LegacyAdviceProtocolSurface,
} from '../../helpers/legacy-advice-surface';
import {
  parseConversationArgs,
  serializeConversationRow,
  type ConversationRowPersisted,
} from '../../../tools/ai-dm-conversation';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { declareTestInputs } from '../../helpers/test-inputs';
import { mkdtempSync } from '../../helpers/test-filesystem';

const legacyFixturePath = 'tests/fixtures/ai-dm-legacy/implicit-advice-v1.json' as const;
const legacyKbPaths = [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  ...KB_SUBJECTS.map((subject) => `tests/fixtures/ai-dm-kb/${subject}.md` as const),
] as const;
const inputs = declareTestInputs({
  fixtures: [legacyFixturePath, LEGACY_ADVICE_ARENA_FIXTURE, ...legacyKbPaths],
});

interface LockedBytes {
  readonly byteCount: number;
  readonly sha256: string;
  readonly base64: string;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
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

  it('keeps explicit incumbent defaults byte-identical to the no-flag fixture', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-legacy-advice-explicit-'));
    const implicit = parseConversationArgs([
      '--out', join(directory, 'implicit.jsonl'),
      '--dry-run',
    ]);
    const explicit = parseConversationArgs([
      '--out', join(directory, 'explicit.jsonl'),
      '--dry-run',
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
    ]);
    const normalizeOutput = <T extends { readonly outPath: string }>(config: T): T => ({
      ...config,
      outPath: '<legacy-output>',
    });

    expect(normalizeOutput(implicit)).toEqual(normalizeOutput(explicit));
    expect(record(implicit as unknown, 'implicit config')).not.toHaveProperty('dmMode');
  });
});
