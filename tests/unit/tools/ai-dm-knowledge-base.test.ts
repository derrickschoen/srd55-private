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
  writeFileSync,
} from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';
import { tmpdir } from 'node:os';

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

const inputs = declareTestInputs({ fixtures: fixturePaths });
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
    expect(loaded.combinedStartupHash).toBe('45ea6c7b6ccfcd04aad13e51ff3d7e9884247782cb9feba1e9297344ce7d39f0');
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
});
