import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_DM_KB_FIXTURE_DIRECTORY,
  DEFAULT_AI_DM_KB_ROOT,
  KB_SUBJECTS,
  loadAiDmKnowledgeBase,
} from '../../../src/vtt/knowledge-base-contract';
import { SRD_ATTRIBUTION_NOTICE } from '../../../src/rules/srd-attribution';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';
import { tmpdir } from 'node:os';
import {
  createEngineMcpRuntime,
  createLauncherKbReadBudget,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import {
  kbSubjectSources,
  KbReadBudget,
  type KbReadRecord,
} from '../../../src/vtt/mcp/knowledge-base';
import { ENGINE_TOOL_SPECS } from '../../../src/vtt/mcp/schemas';

const fixturePaths = [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  'tests/fixtures/ai-dm-kb/actions.md',
  'tests/fixtures/ai-dm-kb/movement.md',
  'tests/fixtures/ai-dm-kb/targeting.md',
  'tests/fixtures/ai-dm-kb/spells.md',
  'tests/fixtures/ai-dm-kb/conditions.md',
  'tests/fixtures/ai-dm-kb/reactions.md',
  'tests/fixtures/ai-dm-kb/protocol.md',
  'tests/fixtures/ai-dm-kb/k5.txt',
  'tests/fixtures/ai-dm-kb/k6.txt',
  'tests/fixtures/ai-dm-kb/k7-close.txt',
] as const;

const arenaFixture = 'tests/fixtures/arena-basis/seed-3943001.json' as const;
const inputs = declareTestInputs({ fixtures: [...fixturePaths, arenaFixture] });
const fixtureText = (path: (typeof fixturePaths)[number]): string => inputs.fixtures.readText(path);
const rootText = fixtureText(DEFAULT_AI_DM_KB_ROOT);
const tacticsText = fixtureText('tests/fixtures/ai-dm-kb/tactics.md');
const subjectPaths = KB_SUBJECTS.map((subject) =>
  `${AI_DM_KB_FIXTURE_DIRECTORY}/${subject}.md` as (typeof fixturePaths)[number]);

function sha256(text: string): string {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function copyFixturePackage(destinationRoot: string): void {
  const destination = resolve(destinationRoot, AI_DM_KB_FIXTURE_DIRECTORY);
  mkdirSync(destination, { recursive: true });
  for (const path of fixturePaths) {
    writeFileSync(resolve(destinationRoot, path), inputs.fixtures.readBytes(path));
  }
}

describe('D466 AI DM knowledge-base fixture package', () => {
  it('enforces root and startup byte caps plus the exact root structure and role', () => {
    const rootBytes = Buffer.byteLength(rootText, 'utf8');
    const startupBytes = Buffer.byteLength(`${rootText}\n\n${tacticsText}`, 'utf8');
    expect(rootBytes).toBeLessThanOrEqual(3_072);
    expect(rootBytes).toBeLessThan(4_096);
    expect(startupBytes).toBeLessThanOrEqual(4_608);
    expect(rootText.match(/^## .+$/gmu)).toEqual([
      '## Role',
      '## Running a round',
      '## Glossary',
      '## Subject index',
    ]);
    expect(rootText.split('\n')[1]).toBe(
      'You are the AI Dungeon Master running the monster side of a D&D 5e SRD 5.2.1 encounter through the engine tools.',
    );
    expect(rootText).toContain(
      'Read indexed subjects with engine.read_kb_subject when needed; at most two successful subject reads are allowed per round.',
    );
  });

  it('indexes all seven unique existing subject files with repo-relative paths', () => {
    const indexedPaths = [...rootText.matchAll(/^- `([^`]+)` —/gmu)].map((match) => match[1] ?? '');
    expect(indexedPaths).toEqual(subjectPaths);
    expect(new Set(indexedPaths).size).toBe(7);
    expect(indexedPaths.every((path) => !isAbsolute(path) && !path.split('/').includes('..'))).toBe(true);
    expect(indexedPaths.every((path) => existsSync(resolve(process.cwd(), path)))).toBe(true);
  });

  it('keeps every k7 tactical sentinel out of the root and every subject', () => {
    expect(Buffer.from(tacticsText, 'utf8')).toEqual(
      Buffer.from(fixtureText('tests/fixtures/ai-dm-kb/k7-close.txt'), 'utf8'),
    );
    const nonTacticalText = [rootText, ...subjectPaths.map((path) => fixtureText(path))].join('\n');
    const sentinels = [
      ...tacticsText.split('\n').filter((line) => line.length > 0),
      'Prefer an offered attack when available; Dodge-only rounds with attacks available are usually wrong.',
      "Use Disengage only when leaving an enemy's reach; without movement it provides no benefit.",
      'If no attack is offered, move or Dash to improve the fight when useful.',
      'Do not treat a self-targeted utility spell such as Detect Thoughts as an attack; if nothing useful is offered, Dodge.',
    ];
    expect(sentinels).toHaveLength(14);
    for (const sentinel of sentinels) expect(nonTacticalText).not.toContain(sentinel);
  });

  it('carries the bundle attribution and excludes banned source vocabulary', () => {
    const completeBundle = fixturePaths.map((path) => fixtureText(path)).join('\n');
    expect(rootText.replace(/\s+/gu, ' ').trim()).toContain(SRD_ATTRIBUTION_NOTICE);
    expect(completeBundle).not.toMatch(/\b(?:BG3|Baldur(?:'s)? Gate|Nimble|wiki)\b/iu);
  });

  it('relocates the bundle, resolves every substituted index path, and keeps host paths out of fixtures', async () => {
    const relocatedRoot = mkdtempSync(join(tmpdir(), 'dnd-ai-dm-kb-relocated-'));
    copyFixturePackage(relocatedRoot);

    const loaded = await loadAiDmKnowledgeBase(relocatedRoot, DEFAULT_AI_DM_KB_ROOT);
    expect(loaded.kind).toBe('bundle');
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const substituted = [...loaded.startupInstructions.matchAll(/^- `([^`]+)` —/gmu)]
      .map((match) => match[1] ?? '');
    expect(substituted).toHaveLength(7);
    expect(substituted.every((path) => isAbsolute(path) && existsSync(path))).toBe(true);
    expect(substituted.every((path) => path.startsWith(`${relocatedRoot}/`))).toBe(true);
    expect(fixturePaths.every((path) => !fixtureText(path).includes('/home/vagrant'))).toBe(true);
  });

  it('loads the cold-start pair in root-then-tactics order with pinned hashes', async () => {
    const loaded = await loadAiDmKnowledgeBase(process.cwd(), DEFAULT_AI_DM_KB_ROOT);
    expect(loaded.kind).toBe('bundle');
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const expectedRoot = KB_SUBJECTS.reduce((text, subject) => text.replaceAll(
      `${AI_DM_KB_FIXTURE_DIRECTORY}/${subject}.md`,
      resolve(process.cwd(), AI_DM_KB_FIXTURE_DIRECTORY, `${subject}.md`),
    ), rootText);
    expect(loaded.startupInstructions).toBe(`${expectedRoot}\n\n${tacticsText}`);
    expect(loaded.combinedStartupHash).toBe('00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0');
    expect(loaded.componentSha256).toEqual({
      root: sha256(rootText),
      tactics: sha256(tacticsText),
      subjects: {
        actions: sha256(fixtureText('tests/fixtures/ai-dm-kb/actions.md')),
        movement: sha256(fixtureText('tests/fixtures/ai-dm-kb/movement.md')),
        targeting: sha256(fixtureText('tests/fixtures/ai-dm-kb/targeting.md')),
        spells: sha256(fixtureText('tests/fixtures/ai-dm-kb/spells.md')),
        conditions: sha256(fixtureText('tests/fixtures/ai-dm-kb/conditions.md')),
        reactions: sha256(fixtureText('tests/fixtures/ai-dm-kb/reactions.md')),
        protocol: sha256(fixtureText('tests/fixtures/ai-dm-kb/protocol.md')),
      },
    });
  });

  it('tags only the three historical fixtures as legacy single-file knowledge bases', async () => {
    for (const name of ['k5.txt', 'k6.txt', 'k7-close.txt'] as const) {
      const loaded = await loadAiDmKnowledgeBase(
        process.cwd(),
        `${AI_DM_KB_FIXTURE_DIRECTORY}/${name}`,
      );
      expect(loaded.kind).toBe('legacy_single_file');
      expect(loaded.startupInstructions).toBe(fixtureText(`${AI_DM_KB_FIXTURE_DIRECTORY}/${name}`));
    }
  });

  it('logs two different successful subject reads once with pinned hashes and ordinals (mutation: log each read twice)', async () => {
    const loaded = await loadAiDmKnowledgeBase(process.cwd(), DEFAULT_AI_DM_KB_ROOT);
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const records: KbReadRecord[] = [];
    const budget = new KbReadBudget(kbSubjectSources(loaded), [], (record) => records.push(record));

    const actions = budget.read('actions', 'initial');
    const spells = budget.read('spells', 'correction');

    expect(actions).toEqual({
      kind: 'kb_subject', subject: 'actions',
      text: fixtureText('tests/fixtures/ai-dm-kb/actions.md'),
      sha256: loaded.subjects.actions.sha256,
      byteCount: loaded.subjects.actions.byteCount,
    });
    expect(spells).toEqual({
      kind: 'kb_subject', subject: 'spells',
      text: fixtureText('tests/fixtures/ai-dm-kb/spells.md'),
      sha256: loaded.subjects.spells.sha256,
      byteCount: loaded.subjects.spells.byteCount,
    });
    expect(records).toEqual([
      {
        subject: 'actions', repoRelativePath: loaded.subjects.actions.repoRelativePath,
        sha256: loaded.subjects.actions.sha256, byteCount: loaded.subjects.actions.byteCount,
        ordinal: 1, callPhase: 'initial',
      },
      {
        subject: 'spells', repoRelativePath: loaded.subjects.spells.repoRelativePath,
        sha256: loaded.subjects.spells.sha256, byteCount: loaded.subjects.spells.byteCount,
        ordinal: 2, callPhase: 'correction',
      },
    ]);
  });

  it('exposes the closed-subject reader through the launcher-owned MCP tool surface (mutation: omit the tool)', async () => {
    const loaded = await loadAiDmKnowledgeBase(process.cwd(), DEFAULT_AI_DM_KB_ROOT);
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const budget = new KbReadBudget(kbSubjectSources(loaded));
    const state = await loadArenaFixture(resolve(process.cwd(), arenaFixture));
    const runtime = createEngineMcpRuntime(state, {
      toolProfile: 'dm', kbReadBudget: budget, kbReadCallPhase: 'initial',
    });

    expect(runtime.toolSurface.tools.map((tool) => tool.name)).toContain('engine.read_kb_subject');
    expect(runtime.toolSurface.execute('engine.read_kb_subject', { subject: 'actions' }))
      .toEqual(expect.objectContaining({
        kind: 'kb_subject', subject: 'actions', sha256: loaded.subjects.actions.sha256,
      }));
    expect(() => runtime.toolSurface.execute('engine.read_kb_subject', { subject: 'unknown' }))
      .toThrow('Invalid tool arguments');
    expect(budget.records()).toHaveLength(1);
  });

  it('returns the typed budget rejection on a third read (mutation: allow a third success)', async () => {
    const loaded = await loadAiDmKnowledgeBase(process.cwd(), DEFAULT_AI_DM_KB_ROOT);
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const budget = new KbReadBudget(kbSubjectSources(loaded));
    budget.read('actions', 'initial');
    budget.read('movement', 'initial');

    expect(budget.read('targeting', 'correction')).toEqual({
      kind: 'kb_read_budget_exhausted', allowed: 2,
    });
    expect(budget.records().map((record) => record.subject)).toEqual(['actions', 'movement']);
  });

  it('persists one budget across initial, correction, and adjustment launcher instances (mutation: reset per launcher)', async () => {
    const loaded = await loadAiDmKnowledgeBase(process.cwd(), DEFAULT_AI_DM_KB_ROOT);
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const directory = mkdtempSync(join(tmpdir(), 'dnd-kb-read-budget-'));
    const spoolPath = join(directory, 'row-kb-reads.jsonl');
    writeFileSync(spoolPath, '');
    const launcher = { kbReadSpoolPath: spoolPath, kbSubjectSources: kbSubjectSources(loaded) };

    createLauncherKbReadBudget(launcher)?.read('actions', 'initial');
    createLauncherKbReadBudget(launcher)?.read('movement', 'correction');
    const third = createLauncherKbReadBudget(launcher)?.read('spells', 'adjustment');

    expect(third).toEqual({ kind: 'kb_read_budget_exhausted', allowed: 2 });
    expect(readFileSync(spoolPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line)))
      .toEqual([
        expect.objectContaining({ subject: 'actions', ordinal: 1, callPhase: 'initial' }),
        expect.objectContaining({ subject: 'movement', ordinal: 2, callPhase: 'correction' }),
      ]);
  });

  it('schema-rejects an unknown subject without consuming a read (mutation: accept arbitrary subject strings)', async () => {
    const loaded = await loadAiDmKnowledgeBase(process.cwd(), DEFAULT_AI_DM_KB_ROOT);
    if (loaded.kind !== 'bundle') throw new TypeError('Expected the structured KB bundle.');
    const budget = new KbReadBudget(kbSubjectSources(loaded));
    const tool = ENGINE_TOOL_SPECS.find((spec) => spec.descriptor.name === 'engine.read_kb_subject');
    if (tool === undefined) throw new TypeError('KB subject tool schema is absent.');

    expect(tool.input.safeParse({ subject: 'unknown' }).success).toBe(false);
    expect(budget.records()).toEqual([]);
    expect(budget.read('protocol', 'initial')).toEqual(expect.objectContaining({
      kind: 'kb_subject', subject: 'protocol',
    }));
    expect(budget.records()).toEqual([
      expect.objectContaining({ subject: 'protocol', ordinal: 1 }),
    ]);
  });
});
