import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { LIGHT_ENCODINGS } from '../../../src/assets/light-encoding';
import {
  GENERAL_PRIMER,
  LIGHT_ENCODING_PRIMER,
  PASS_THRESHOLD,
  PRIMER_VERSION,
  defaultProbeStateCandidates,
  deriveScreenshotFactSheet,
  parseProbeAnswer,
  parseScreenshotProbeArgs,
  runScreenshotProbe,
  scoreProbeAnswer,
  screenshotQuestionPrompt,
  shiftedByOneRowAnswer,
  simulatedProbeAnswerer,
  strictProbeGate,
  truthAnswer,
  type ProbeSnapshotService,
  type ScreenshotFactSheet,
} from '../../../tools/ai-dm-screenshot-probe';
import type { BoardImageArtifact, BoardImageSource } from '../../../tools/ai-dm-board-snapshot';
import { mkdirSync } from '../../helpers/test-filesystem';
import { mkdtemp, readFile, rm } from '../../helpers/test-filesystem-promises';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function object(
  id: string,
  name: string,
  kind: WorldObject['kind'],
  column: number,
  row: number,
  movement: boolean,
): WorldObject {
  const position = { column, row };
  return {
    id: worldObjectId(`world-object:${id}`),
    name,
    kind,
    position,
    footprint: [position],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: { movement, lineOfSight: movement, cover: movement ? 'total' : 'none' },
    createdRevision: 0,
  };
}

function everyClassState(): EncounterState {
  const hero = playerProfile('screenshot-hero', { hitPoints: 12 });
  const foe = monsterProfile('screenshot-foe', { hitPoints: 12 });
  const state = createEncounter({
    bounds: { columns: 6, rows: 4 },
    combatants: [hero, foe],
    tokens: [placedToken(hero, 1, 1), placedToken(foe, 2, 2)],
    blockedCells: [{ column: 5, row: 3 }],
    foggedCells: [{ column: 4, row: 3 }],
    worldObjects: [
      object('open-door', 'Open Oak Door', 'door', 0, 2, false),
      object('closed-door', 'Closed Iron Door', 'door', 5, 2, true),
      object('statue', 'Moon Statue', 'generic', 3, 2, false),
    ],
    environment: {
      difficultTerrainRegions: [{ id: 'mud', cells: [{ column: 0, row: 1 }] }],
      obscurementRegions: [{ id: 'smoke', obscurement: 'heavy', cells: [{ column: 3, row: 1 }] }],
      lightRegions: [
        { id: 'dim', level: 'dim', cells: [{ column: 1, row: 0 }] },
        { id: 'dark', level: 'darkness', cells: [{ column: 2, row: 0 }] },
      ],
      movementRegions: [],
    },
  });
  return {
    ...state,
    combatants: state.combatants.map((entry) => entry.profile.id === foe.id
      ? { ...entry, hitPoints: 3, life: 'dying' }
      : entry),
    hiddenCombatants: [{ combatant: foe.id, stealthTotal: 18, edition: '2024' }],
  };
}

function cells(values: readonly { readonly column: number; readonly row: number }[]): readonly string[] {
  return values.map((cell) => `${String(cell.column)},${String(cell.row)}`).sort();
}

class FakeSnapshotService implements ProbeSnapshotService {
  closed = false;

  capture(input: { readonly state: EncounterState; readonly source: BoardImageSource }): Promise<BoardImageArtifact> {
    return Promise.resolve({
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath: `board-images/${'a'.repeat(64)}.png`,
      sha256: 'a'.repeat(64),
      bytes: 24,
      width: input.state.bounds.columns * 40,
      height: input.state.bounds.rows * 40,
      capturedAtUnixMs: 1,
      captureMs: 0,
      source: input.source,
      chromiumVersion: 'SIMULATED',
    });
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

describe('D519 screenshot comprehension fact sheet', () => {
  it('derives every fact class from the DM projection with zero-based coordinates', () => {
    const sheet = deriveScreenshotFactSheet(everyClassState());

    expect(sheet.version).toBe('d519-screenshot-comprehension-v1');
    expect(sheet.bounds).toEqual({ columns: 6, rows: 4 });
    expect(sheet.combatants).toEqual([
      {
        displayName: 'screenshot-hero',
        cell: { column: 1, row: 1 },
        side: 'party',
        hpBand: 'uninjured',
        life: 'living',
        hiddenFromPlayers: false,
      },
      {
        displayName: 'screenshot-foe',
        cell: { column: 2, row: 2 },
        side: 'foe',
        hpBand: 'critical',
        life: 'dying',
        hiddenFromPlayers: true,
      },
    ]);
    expect(cells(sheet.difficultTerrainCells)).toEqual(['0,1']);
    expect(cells(sheet.obscuredCells)).toEqual(['3,1']);
    expect(cells(sheet.foggedCells)).toEqual(['4,3']);
    expect(cells(sheet.blockedCells)).toEqual(['5,3']);
    expect(sheet.lightCells).toHaveLength(24);
    expect(sheet.lightCells.filter((entry) => entry.light === 'dim')).toEqual([{ column: 1, row: 0, light: 'dim' }]);
    expect(sheet.lightCells.filter((entry) => entry.light === 'dark')).toEqual([{ column: 2, row: 0, light: 'dark' }]);
    expect(sheet.lightCells.filter((entry) => entry.light === 'bright')).toHaveLength(22);
    expect(sheet.doors).toEqual([
      { column: 0, row: 2, open: true },
      { column: 5, row: 2, open: false },
    ]);
    expect(sheet.worldObjects).toEqual([
      { column: 0, row: 2, name: 'Open Oak Door' },
      { column: 3, row: 2, name: 'Moon Statue' },
      { column: 5, row: 2, name: 'Closed Iron Door' },
    ]);
    expect(sheet.adjacencyPairs).toEqual([{
      first: { displayName: 'screenshot-hero', cell: { column: 1, row: 1 } },
      second: { displayName: 'screenshot-foe', cell: { column: 2, row: 2 } },
    }]);
  });
});

describe('D519 screenshot comprehension scoring', () => {
  const sheet: ScreenshotFactSheet = deriveScreenshotFactSheet(everyClassState());

  it('scores a perfect answer as 1.0', () => {
    for (const question of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'] as const) {
      expect(scoreProbeAnswer(truthAnswer(sheet, question), truthAnswer(sheet, question))).toEqual({
        score: 1,
        hallucinations: 0,
        confusions: [],
      });
    }
  });

  it('jaccard_ignores_hallucinations: penalizes an asserted row-shifted fact absent from truth', () => {
    const truth = parseProbeAnswer('Q4', JSON.stringify({
      version: 'd519-screenshot-comprehension-v1', question: 'Q4', cells: [{ column: 2, row: 0 }],
    }));
    const withHallucination = parseProbeAnswer('Q4', JSON.stringify({
      version: 'd519-screenshot-comprehension-v1', question: 'Q4',
      cells: [{ column: 2, row: 0 }, { column: 2, row: 1 }],
    }));

    expect(scoreProbeAnswer(withHallucination, truth)).toMatchObject({
      score: 0.5,
      hallucinations: 1,
    });
  });

  it('detects row-off-by-one confusions and counts shifted assertions as hallucinations', async () => {
    const truth = truthAnswer(sheet, 'Q1');
    const shifted = shiftedByOneRowAnswer(truth);
    const score = scoreProbeAnswer(shifted, truth);

    expect(score.score).toBe(0);
    expect(score.hallucinations).toBe(sheet.combatants.length);
    expect(score.confusions).toEqual(['row off by one', 'row off by one']);
    const simulated = await simulatedProbeAnswerer('shifted_row').answer({
      model: 'SIMULATED', effort: 'low', question: 'Q1', prompt: '', schemaPath: '', imagePath: '', truth,
    });
    expect(scoreProbeAnswer(parseProbeAnswer('Q1', simulated.rawAnswer), truth).confusions)
      .toEqual(['row off by one', 'row off by one']);
  });
});

describe('D524 general screenshot primer', () => {
  it('is versioned, uses generic classic-board conventions, and leaks no probed fact-sheet names or coordinates', async () => {
    const primerPrompt = screenshotQuestionPrompt('Q1', 'general');
    expect(primerPrompt).toContain(`General primer ${PRIMER_VERSION}: ${GENERAL_PRIMER}`);
    expect(primerPrompt).toContain('Each grid square represents 5 feet');
    expect(primerPrompt).toContain('Cool-blue base plates identify party creatures');
    expect(primerPrompt).toContain('warm-red base plates identify foes');
    expect(primerPrompt).toContain('zero-based column,row coordinates');
    expect(primerPrompt).toContain('Bars under tokens show hit-point bands');
    expect(primerPrompt).toContain('Difficult, Obscured, Bright light, Dim light, Darkness, and Fog');
    expect(primerPrompt).toContain('Blocked, Object, and Light source');
    expect(primerPrompt).toContain('walls, doors, and objects as they are drawn');

    const sheets = [
      deriveScreenshotFactSheet(everyClassState()),
      ...(await defaultProbeStateCandidates()).map((candidate) => deriveScreenshotFactSheet(candidate.state)),
    ];
    const factSheetStrings = new Set(sheets.flatMap((sheet) => {
      const cells = [
        ...sheet.combatants.map((entry) => entry.cell),
        ...sheet.difficultTerrainCells,
        ...sheet.obscuredCells,
        ...sheet.lightCells,
        ...sheet.foggedCells,
        ...sheet.blockedCells,
        ...sheet.doors,
        ...sheet.worldObjects,
      ];
      return [
        ...sheet.combatants.map((entry) => entry.displayName),
        ...sheet.worldObjects.map((entry) => entry.name),
        ...cells.map((cell) => `${String(cell.column)},${String(cell.row)}`),
      ];
    }));
    // D525: the leak test covers the whole primer under every light encoding, not just the shared base.
    for (const encoding of LIGHT_ENCODINGS) {
      const normalizedPrimer = `${GENERAL_PRIMER} ${LIGHT_ENCODING_PRIMER[encoding]}`.toLocaleLowerCase('en-US');
      for (const fact of factSheetStrings) {
        expect(normalizedPrimer, `${encoding} primer leaked fact-sheet string ${JSON.stringify(fact)}`)
          .not.toContain(fact.toLocaleLowerCase('en-US'));
      }
    }
  });

  it('D525: gains exactly one sentence per light encoding, chosen by --light-encoding, and defaults to tint', () => {
    expect(PRIMER_VERSION).toBe('d525-general-board-primer-v2');
    for (const encoding of LIGHT_ENCODINGS) {
      const sentence = LIGHT_ENCODING_PRIMER[encoding];
      expect(sentence.match(/[.!?]/gu), `${encoding} is one sentence`).toHaveLength(1);
      expect(sentence.endsWith('.')).toBe(true);
      const prompt = screenshotQuestionPrompt('Q5', 'general', encoding);
      expect(prompt).toContain(`General primer ${PRIMER_VERSION}: ${GENERAL_PRIMER} ${sentence}`);
      for (const other of LIGHT_ENCODINGS) {
        if (other !== encoding) expect(prompt).not.toContain(LIGHT_ENCODING_PRIMER[other]);
      }
      expect(screenshotQuestionPrompt('Q5', 'none', encoding)).not.toContain(sentence);
    }
    expect(screenshotQuestionPrompt('Q5', 'general')).toContain(LIGHT_ENCODING_PRIMER.tint);
    // each sentence names the three levels the legend rows carry for that encoding
    expect(LIGHT_ENCODING_PRIMER.inverse).toMatch(/unveiled floor is bright light/u);
    expect(LIGHT_ENCODING_PRIMER.inverse).toMatch(/veil marks dim light/u);
    expect(LIGHT_ENCODING_PRIMER.inverse).toMatch(/heavy dark veil marks darkness/u);
    expect(LIGHT_ENCODING_PRIMER.symbol).toMatch(/sun marks bright light/u);
    expect(LIGHT_ENCODING_PRIMER.symbol).toMatch(/crescent moon marks dim light/u);
    expect(LIGHT_ENCODING_PRIMER.symbol).toMatch(/filled dark circle marks darkness/u);
    expect(LIGHT_ENCODING_PRIMER.symbol).toContain('No glyph =');
    expect(LIGHT_ENCODING_PRIMER.tint).toMatch(/untinted floor is also bright light/u);

    const base = ['--models', 'gpt-5.6-luna:low', '--states', '1', '--seed', '1', '--images-root', 'dnd-slim-runs/x-images', '--out', 'dnd-slim-runs/x.jsonl', '--generation', 'g3'];
    expect(parseScreenshotProbeArgs(base).lightEncoding).toBe('tint');
    expect(parseScreenshotProbeArgs([...base, '--light-encoding', 'symbol']).lightEncoding).toBe('symbol');
    expect(parseScreenshotProbeArgs([...base, '--light-encoding', 'inverse']).lightEncoding).toBe('inverse');
    expect(() => parseScreenshotProbeArgs([...base, '--light-encoding', 'glow'])).toThrow('--light-encoding must be tint, symbol or inverse.');
  });

  it('omits the general primer when explicitly disabled', () => {
    const prompt = screenshotQuestionPrompt('Q1', 'none');
    expect(prompt).not.toContain(PRIMER_VERSION);
    expect(prompt).not.toContain(GENERAL_PRIMER);
    expect(prompt).toContain('Question Q1:');
    expect(prompt).toContain('Use zero-based column,row coordinates');
  });
});

describe('D519 screenshot comprehension schema and CLI', () => {
  it('pins the strict threshold to 0.9', () => {
    expect(PASS_THRESHOLD).toBe(0.9);
  });

  it('rejects malformed, wrong-question, negative-coordinate, and extra-property answers', () => {
    expect(() => parseProbeAnswer('Q1', 'not-json')).toThrow('not JSON');
    expect(() => parseProbeAnswer('Q1', JSON.stringify({ version: 'd519-screenshot-comprehension-v1', question: 'Q2', creatures: [] }))).toThrow();
    expect(() => parseProbeAnswer('Q4', JSON.stringify({ version: 'd519-screenshot-comprehension-v1', question: 'Q4', cells: [{ column: 0, row: -1 }] }))).toThrow();
    expect(() => parseProbeAnswer('Q10', JSON.stringify({ version: 'd519-screenshot-comprehension-v1', question: 'Q10', cells: [], prose: 'none' }))).toThrow();
  });

  it('runs perfect and impostor answerers through the strict gate and writes comparison metadata', async () => {
    const artifactRoot = resolve('dnd-slim-runs');
    mkdirSync(artifactRoot, { recursive: true });
    const directory = await mkdtemp(join(artifactRoot, 'd519-probe-test-'));
    const imagesRoot = join(directory, 'e2e-images');
    const outPath = join(directory, 'e2e.jsonl');
    const service = new FakeSnapshotService();
    try {
      const config = parseScreenshotProbeArgs([
        '--models', 'gpt-5.6-luna:low,gpt-5.6-luna:medium',
        '--states', '1',
        '--seed', '6203001',
        '--images-root', imagesRoot,
        '--out', outPath,
        '--generation', 'g2-classic-general',
        '--light-encoding', 'inverse',
        '--simulate',
      ]);
      expect(config.primer).toBe('general');
      expect(config.comparePath).toBeNull();
      expect(config.lightEncoding).toBe('inverse');
      const rows = await runScreenshotProbe(config, {
        candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
        snapshotService: service,
      });

      expect(rows).toHaveLength(20);
      expect(rows.every((row) => row.outcome === 'answered' && row.score === 1)).toBe(true);
      expect(rows.every((row) => row.primerVersion === PRIMER_VERSION)).toBe(true);
      expect(rows.every((row) => row.generation === 'g2-classic-general')).toBe(true);
      expect(rows.every((row) => row.lightEncoding === 'inverse')).toBe(true);
      expect(rows.every((row) => row.version === 'd525-screenshot-comprehension-row-v3')).toBe(true);
      expect(strictProbeGate(rows)).toBe(true);
      expect((await readFile(outPath, 'utf8')).trim().split('\n')).toHaveLength(20);
      const summary = await readFile(config.summaryPath, 'utf8');
      expect(summary).toContain('Light encoding: inverse.');
      expect(summary).toContain('gpt-5.6-luna:low');
      expect(summary).toContain('gpt-5.6-luna:medium');
      expect(summary.match(/Strict all classes >= 0\.9: \*\*PASS\*\*/gu)).toHaveLength(2);

      const comparisonOutPath = join(directory, 'e2e-without-primer.jsonl');
      const comparisonConfig = parseScreenshotProbeArgs([
        '--models', 'gpt-5.6-luna:low,gpt-5.6-luna:medium',
        '--states', '1',
        '--seed', '6203001',
        '--images-root', join(directory, 'e2e-without-primer-images'),
        '--out', comparisonOutPath,
        '--primer', 'none',
        '--generation', 'g1-like-for-like',
        '--compare', outPath,
        '--simulate',
      ]);
      const impostorRows = await runScreenshotProbe(comparisonConfig, {
        candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
        snapshotService: service,
        answerer: simulatedProbeAnswerer('shifted_row'),
      });
      expect(impostorRows.every((row) => row.primerVersion === null)).toBe(true);
      expect(impostorRows.every((row) => row.generation === 'g1-like-for-like')).toBe(true);
      expect(impostorRows.every((row) => row.lightEncoding === 'tint')).toBe(true);
      expect(strictProbeGate(impostorRows)).toBe(false);
      const comparisonSummary = await readFile(comparisonConfig.summaryPath, 'utf8');
      expect(comparisonSummary).toContain('Delta vs previous run');
      expect(comparisonSummary).toContain('-1.000');
      expect(comparisonSummary.match(/Strict all classes >= 0\.9: \*\*FAIL\*\*/gu)).toHaveLength(2);
      expect(service.closed).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
