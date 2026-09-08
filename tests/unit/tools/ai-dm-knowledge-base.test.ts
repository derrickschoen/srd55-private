import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_DM_KB_FIXTURE_DIRECTORY,
  D569_AI_DM_KB_COMPONENT_PATHS,
  D569_AI_DM_KB_PROVENANCE,
  D569_AI_DM_KB_ROOT,
  D569_KB_COMPONENT_MAX_BYTES,
  D569_KB_ROOT_MAX_BYTES,
  D569_KB_STARTUP_MAX_BYTES,
  DEFAULT_AI_DM_KB_ROOT,
  KB_SUBJECTS,
  loadD569AiDmKnowledgeBase,
  loadD569KbProvenanceManifest,
  loadAiDmKnowledgeBase,
  scanD569KnowledgeBaseBytes,
} from '../../../src/vtt/knowledge-base-contract';
import { CELL_GLYPH_KINDS, CELL_GLYPHS } from '../../../src/assets/board-glyphs';
import { legendEntriesFor, TERRAIN_LEGEND_LABELS } from '../../../src/vtt/board-chrome';
import { traceCombatantLine, traceTerrainLine, type TerrainLineTrace } from '../../../src/combat/cover';
import { TERRAIN_KINDS, terrainBlocking, type TerrainKind } from '../../../src/combat/terrain';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
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
import { createEncounter } from '../../../src/combat/encounter';
import { hitPointKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

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

const d569FixturePaths = [
  ...D569_AI_DM_KB_COMPONENT_PATHS,
  D569_AI_DM_KB_PROVENANCE,
] as const;

const arenaFixture = 'tests/fixtures/arena-basis/seed-3943001.json' as const;
const srdFixture = 'docs/srd/full/srd-5.2.1.txt' as const;
const inputs = declareTestInputs({
  fixtures: [...fixturePaths, ...d569FixturePaths, arenaFixture],
  srdText: [srdFixture],
});
const fixtureText = (path: (typeof fixturePaths)[number]): string => inputs.fixtures.readText(path);
const rootText = fixtureText(DEFAULT_AI_DM_KB_ROOT);
const tacticsText = fixtureText('tests/fixtures/ai-dm-kb/tactics.md');
const subjectPaths = KB_SUBJECTS.map((subject) =>
  `${AI_DM_KB_FIXTURE_DIRECTORY}/${subject}.md` as (typeof fixturePaths)[number]);

function sha256(text: string): string {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function guideTerrainObject(
  id: string,
  cells: readonly { readonly column: number; readonly row: number }[],
  kind: Exclude<TerrainKind, 'open'>,
): WorldObject {
  const position = cells[0];
  if (position === undefined) throw new Error('A guide trace object needs a footprint.');
  return {
    id: worldObjectId(`world-object:${id}`),
    name: id,
    kind: 'cover',
    position,
    footprint: cells,
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: terrainBlocking(kind),
    createdRevision: 0,
  };
}

function guideTraceSummary(label: string, trace: TerrainLineTrace): string {
  const cell = (value: { readonly column: number; readonly row: number }): string =>
    `${String(value.column)},${String(value.row)}`;
  const tier = (value: TerrainLineTrace['tier']): string => value === 'none'
    ? 'NO COVER'
    : value === 'half'
      ? 'HALF COVER'
      : value === 'three_quarters'
        ? 'THREE-QUARTERS COVER'
        : 'TOTAL COVER';
  return `${label}: source cell ${cell(trace.sourceCell)}, target cell ${cell(trace.targetCell)}, ` +
    `chosen source corner ${cell(trace.sourceCorner)}, corner-line tiers ` +
    `${trace.lines.map((line) => line.tier).join(' / ')}; result ${tier(trace.tier)}; ` +
    `line of sight ${trace.blocksSight ? 'NO' : 'YES'}.`;
}

function d569ComponentEntries(bundle: Awaited<ReturnType<typeof loadD569AiDmKnowledgeBase>>) {
  return [
    bundle.root,
    bundle.tactics,
    ...KB_SUBJECTS.map((subject) => bundle.subjects[subject]),
  ] as const;
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

describe('D569 shared blind/advice knowledge-base fixture package', () => {
  it('loads the complete byte-identical primer at startup for both DM modes', async () => {
    const [advice, blind] = await Promise.all([
      loadD569AiDmKnowledgeBase(process.cwd(), 'advice'),
      loadD569AiDmKnowledgeBase(process.cwd(), 'blind'),
    ]);
    const adviceComponents = d569ComponentEntries(advice);
    const blindComponents = d569ComponentEntries(blind);
    const relocatedRoot = KB_SUBJECTS.reduce((text, subject) => text.replaceAll(
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/${subject}.md`,
      resolve(process.cwd(), AI_DM_KB_FIXTURE_DIRECTORY, 'd569', `${subject}.md`),
    ), String(inputs.fixtures.readText(D569_AI_DM_KB_ROOT)));
    const expectedStartup = [
      relocatedRoot,
      ...D569_AI_DM_KB_COMPONENT_PATHS.slice(1).map((path) => inputs.fixtures.readText(path)),
    ].join('\n\n');

    expect(advice.root.repoRelativePath).toBe(D569_AI_DM_KB_ROOT);
    expect(advice.subjectReadPolicy).toBe('startup_only');
    expect(blind.subjectReadPolicy).toBe('startup_only');
    expect(advice.startupInstructions).toBe(expectedStartup);
    expect(advice.startupInstructions).toBe(blind.startupInstructions);
    expect(advice.combinedStartupHash).toBe(blind.combinedStartupHash);
    expect(advice.componentSha256).toEqual(blind.componentSha256);
    expect(adviceComponents.map((component) => Buffer.from(component.text, 'utf8')))
      .toEqual(blindComponents.map((component) => Buffer.from(component.text, 'utf8')));
    expect(adviceComponents.map((component) => component.sha256)).toEqual(
      D569_AI_DM_KB_COMPONENT_PATHS.map((path) =>
        sha256(inputs.fixtures.readText(path))),
    );
    expect(advice.root.byteCount).toBeLessThanOrEqual(D569_KB_ROOT_MAX_BYTES);
    expect(adviceComponents.every((component) =>
      component.byteCount <= D569_KB_COMPONENT_MAX_BYTES)).toBe(true);
    expect(Buffer.byteLength(advice.startupInstructions, 'utf8'))
      .toBeLessThanOrEqual(D569_KB_STARTUP_MAX_BYTES);
  });

  it('keeps the guide HP claims aligned with actor-knowledge boundary classifications', () => {
    const maximum = 20;
    const profile = monsterProfile('kb-hp-boundaries', { hitPoints: maximum });
    const initial = createEncounter({
      bounds: { columns: 2, rows: 1 },
      combatants: [profile],
      tokens: [placedToken(profile, 0)],
    });
    const classify = (hitPoints: number) => {
      const target = { ...initial.combatants[0]!, hitPoints };
      const state = { ...initial, combatants: [target] };
      const knowledge = hitPointKnowledge(state, target);
      if (knowledge.kind !== 'perceived_band') throw new Error('Positive maximum lost its HP band.');
      return knowledge.band;
    };
    expect([
      classify(maximum),
      classify(maximum - 1),
      classify(maximum / 4),
      classify(maximum / 4 + 1),
    ]).toEqual(['uninjured', 'bloodied', 'near_death', 'bloodied']);

    const guide = inputs.fixtures.readText(`${AI_DM_KB_FIXTURE_DIRECTORY}/d569/protocol.md`);
    const hpSection = guide.split('## Hit-point bars, life glyphs, and corpses\n')[1]
      ?.split('\n## ')[0];
    if (hpSection === undefined) throw new Error('HP guide section is missing.');
    const claims = new Map([...hpSection.matchAll(
      /<!-- board-feature:hp-(uninjured|bloodied|near-death|unknown) -->\s*([\s\S]*?)(?=<!-- board-feature:hp-|$)/gu,
    )].map((match) => [match[1], match[2] ?? ''] as const));

    expect([...claims.keys()]).toEqual(['uninjured', 'bloodied', 'near-death', 'unknown']);
    expect(claims.get('uninjured')).toMatch(/undamaged[\s\S]*full hit points/iu);
    expect(claims.get('bloodied')).toMatch(/damaged[\s\S]*above (?:a|one) quarter/iu);
    expect(claims.get('bloodied')).toMatch(/wide range[\s\S]*weak evidence/iu);
    expect(claims.get('bloodied')).toMatch(/not[\s\S]*half/iu);
    expect(claims.get('bloodied')).not.toMatch(/(?:at|below|under)\s+(?:or\s+below\s+)?half/iu);
    expect(claims.get('bloodied')).not.toMatch(/\b(?:means?|indicates?|represents?)\b[^.;]{0,40}\bhalf\b/iu);
    expect(claims.get('near-death')).toMatch(/at or below (?:a|one) quarter/iu);
    expect(claims.get('unknown')).toMatch(/withholds the band/iu);
    expect(hpSection).toMatch(/fixed per-band glyph[\s\S]*not a proportional measure/iu);
  });

  it('byte-scans startup, tactics, every subject, and provenance for the complete forbidden vocabulary', async () => {
    const bundle = await loadD569AiDmKnowledgeBase(process.cwd(), 'blind');
    const realComponents = [
      { name: 'startupInstructions', bytes: Buffer.from(bundle.startupInstructions, 'utf8') },
      ...d569ComponentEntries(bundle).map((component) => ({
        name: component.repoRelativePath,
        bytes: Buffer.from(component.text, 'utf8'),
      })),
      { name: D569_AI_DM_KB_PROVENANCE, bytes: inputs.fixtures.readBytes(D569_AI_DM_KB_PROVENANCE) },
    ];
    expect(scanD569KnowledgeBaseBytes(realComponents)).toEqual([]);

    const scannerSentinels = [
      'option_id', 'OPTION_REF', 'option id', 'option ref', 'offered option',
      'primary_option', 'fallback_option', 'options_omitted_for_size', 'option count',
      'option_index', 'option score', 'ranked option', 'top recommendation',
      'current legal move', 'engine.', 'proposal',
      'suggested_plan', 'suggested plan', 'team_plan_frontier', 'tactical_intel',
      'tactical intel', 'intel_mode', 'engine advert', 'adverts', 'consequence_card',
      'consequence card', 'opportunity_cost', 'opportunity cost', 'movement_options',
      'applicable_play', 'play_id', 'snippet',
      'engine rank',
    ] as const;
    const seeded = scannerSentinels.map((token, index) => ({
      name: `seeded-${String(index)}`,
      bytes: Buffer.from(token, 'utf8'),
    }));
    expect(scanD569KnowledgeBaseBytes(seeded).map((finding) => finding.component))
      .toEqual(seeded.map((component) => component.name));
  });

  it('records complete allowlisted provenance with no restricted-source claim', async () => {
    const manifest = await loadD569KbProvenanceManifest(process.cwd());
    const rawManifest = inputs.fixtures.readText(D569_AI_DM_KB_PROVENANCE);
    const componentPaths = manifest.components.map((component) => component.path);

    expect(componentPaths).toEqual(D569_AI_DM_KB_COMPONENT_PATHS);
    expect(new Set(componentPaths).size).toBe(D569_AI_DM_KB_COMPONENT_PATHS.length);
    expect(manifest.version).toBe('d570-kb-provenance-v2');
    expect(manifest.components.every((component) =>
      component.revision.startsWith('d569-') && component.sources.length > 0)).toBe(true);
    expect(manifest.components.map((component) => component.sha256)).toEqual(
      D569_AI_DM_KB_COMPONENT_PATHS.map((path) => sha256(inputs.fixtures.readText(path))),
    );
    expect(manifest.components.flatMap((component) => component.sources)
      .every((source) => source.kind === 'cc_by_srd' || source.kind === 'project_experience'))
      .toBe(true);
    expect(manifest.components.flatMap((component) => component.sources)
      .filter((source) => source.kind === 'cc_by_srd')
      .every((source) => source.locator.startsWith('docs/srd/'))).toBe(true);
    expect(inputs.fixtures.readText(D569_AI_DM_KB_ROOT).replace(/\s+/gu, ' ').trim())
      .toContain(SRD_ATTRIBUTION_NOTICE);
    expect(rawManifest).not.toMatch(/\b(?:BG3|Baldur(?:'s)? Gate|Nimble|private[-_ ]research)\b/iu);
  });

  it('resolves every rules-section SRD locator to its recorded heading and real line range', async () => {
    const manifest = await loadD569KbProvenanceManifest(process.cwd());
    const srdLines = inputs.srdText.readText(srdFixture).split('\n');
    const rulesComponents = new Set([
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/actions.md`,
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/movement.md`,
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/targeting.md`,
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/spells.md`,
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/conditions.md`,
      `${AI_DM_KB_FIXTURE_DIRECTORY}/d569/reactions.md`,
    ]);

    for (const component of manifest.components) {
      if (!rulesComponents.has(component.path)) continue;
      const recordedSections = new Set(component.sources.map((source) => source.section));
      const markdownSections = [...inputs.fixtures.readText(component.path)
        .matchAll(/^## (.+)$/gmu)].map((match) => match[1] ?? '');
      expect(markdownSections.filter((section) => !recordedSections.has(section)), component.path)
        .toEqual([]);
    }

    for (const source of manifest.components.flatMap((component) => component.sources)) {
      if (source.kind !== 'cc_by_srd') continue;
      const match = /^docs\/srd\/full\/srd-5\.2\.1\.txt:(\d+)-(\d+)$/u.exec(source.locator);
      expect(match, source.locator).not.toBeNull();
      const firstLine = Number(match?.[1]);
      const lastLine = Number(match?.[2]);
      expect(Number.isSafeInteger(firstLine) && firstLine >= 1, source.locator).toBe(true);
      expect(Number.isSafeInteger(lastLine) && lastLine >= firstLine, source.locator).toBe(true);
      expect(lastLine, source.locator).toBeLessThanOrEqual(srdLines.length);
      expect(srdLines.slice(firstLine - 1, lastLine).join('\n'), source.locator)
        .toContain(source.heading);
    }
  });

  it('documents every renderer legend entry in the map guide', () => {
    const presence = { cells: CELL_GLYPH_KINDS, hidden: true, terrainKinds: TERRAIN_KINDS } as const;
    const rendererKeys = new Set([
      ...CELL_GLYPH_KINDS,
      ...[
        ...legendEntriesFor('none', 'bright', presence),
        ...legendEntriesFor('light', 'dim', presence),
        ...legendEntriesFor('full', 'darkness', presence),
      ].map((entry) => entry.key),
    ]);
    const guide = inputs.fixtures.readText(`${AI_DM_KB_FIXTURE_DIRECTORY}/d569/protocol.md`);
    const documentedKeys = new Set([...guide.matchAll(/<!-- board-feature:([a-z_-]+) -->/gu)]
      .map((match) => match[1] ?? ''));

    expect([...rendererKeys].filter((key) => !documentedKeys.has(key))).toEqual([]);
  });

  it('copies the D576 terrain legend exactly and binds the three worked examples to the production corner trace', () => {
    const guide = inputs.fixtures.readText(`${AI_DM_KB_FIXTURE_DIRECTORY}/d569/protocol.md`);
    for (const kind of TERRAIN_KINDS) expect(guide).toContain(TERRAIN_LEGEND_LABELS[kind]);
    expect(guide).toContain(CELL_GLYPHS['terrain-half'].label);
    expect(guide).toContain(CELL_GLYPHS['terrain-three-quarters'].label);
    expect(guide).toContain(CELL_GLYPHS['terrain-wall'].label);

    const tracer = playerProfile('guide-feature-tracer');
    const featureState = createEncounter({
      bounds: { columns: 6, rows: 4 },
      combatants: [tracer],
      tokens: [placedToken(tracer, 5, 3)],
      worldObjects: [guideTerrainObject('guide-arrow-slit', [
        { column: 2, row: 0 },
        { column: 1, row: 1 },
      ], 'three_quarters_cover')],
    });

    const source = playerProfile('guide-source');
    const screen = playerProfile('guide-screen');
    const target = playerProfile('guide-target');
    const creatureState = createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [source, screen, target],
      tokens: [placedToken(source, 0, 1), placedToken(screen, 2, 1), placedToken(target, 4, 1)],
    });

    const largeBase = playerProfile('guide-large-source');
    const large = { ...largeBase, rules: { ...largeBase.rules, sizeCategory: 'Large' as const } };
    const largeTarget = playerProfile('guide-large-target');
    const largeState = createEncounter({
      bounds: { columns: 7, rows: 6 },
      combatants: [large, largeTarget],
      tokens: [placedToken(large, 0, 0), placedToken(largeTarget, 6, 0)],
      worldObjects: [guideTerrainObject(
        'guide-low-barricade',
        [{ column: 2, row: 0 }],
        'half_cover',
      )],
    });

    const productionExamples = [
      guideTraceSummary('Feature trace', traceTerrainLine(
        featureState,
        { column: 0, row: 0 },
        { column: 4, row: 2 },
      )),
      guideTraceSummary('Creature trace', traceCombatantLine(creatureState, source.id, target.id)),
      guideTraceSummary('Large-source trace', traceCombatantLine(largeState, large.id, largeTarget.id)),
    ];
    for (const example of productionExamples) expect(guide).toContain(example);
  });
});
