import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import {
  traceCombatantLine,
  traceTerrainLine,
} from '../../../src/combat/cover';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import {
  BOARD_GLYPH_MODES,
  CELL_GLYPHS,
  GLYPH_FAMILY_CORNER,
} from '../../../src/assets/board-glyphs';
import {
  BOARD_GLYPH_PRIMER,
  GENERAL_PRIMER,
  GENERAL_PRIMER_V10,
  GENERAL_PRIMER_V11,
  GENERAL_PRIMER_V9,
  GLYPH_FAMILY_PRIMER,
  HISTORICAL_PRIMER_VERSION,
  LEGACY_PRIMER_VERSION,
  LIGHT_PRIMER,
  MIN_FACT_CLASS_STATE_COVERAGE,
  NORMALISER_VERSION,
  PASS_THRESHOLD,
  PREVIOUS_PRIMER_VERSION,
  PRIMER_HISTORY,
  PRIMER_VERSION,
  PROBE_CATALOGUE_SIZE,
  bootstrapMeanInterval95,
  defaultProbeStateCandidates,
  deriveScreenshotFactSheet,
  normalizeProbeAnswer,
  parseProbeAnswer,
  parseScreenshotProbeArgs,
  parseScreenshotProbeRescoreArgs,
  probeAnswerJsonSchema,
  probeCatalogueClassCoverage,
  probeCatalogueLineCoverage,
  runScreenshotProbe,
  rescoreScreenshotProbe,
  renderProbeSummary,
  scoreProbeAnswer,
  semanticBoardJsonForProbeState,
  screenshotQuestionPrompt,
  shiftedByOneRowAnswer,
  simulatedProbeAnswerer,
  strictProbeGate,
  truthAnswer,
  type ProbeSnapshotService,
  type ProbeAnswerRequest,
  type ProbeLineTracer,
  type ScreenshotFactSheet,
} from '../../../tools/ai-dm-screenshot-probe';
import {
  boardStateDigest,
  type BoardImageArtifact,
  type BoardImageSource,
} from '../../../tools/ai-dm-board-snapshot';
import { mkdirSync } from '../../helpers/test-filesystem';
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from '../../helpers/test-filesystem-promises';
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
    blocking: {
      movement,
      lineOfSight: movement,
      cover: movement ? 'total' : 'none',
    },
    createdRevision: 0,
  };
}

function coverObject(
  id: string,
  cells: readonly { readonly column: number; readonly row: number }[],
  cover: 'half' | 'three_quarters',
): WorldObject {
  const position = cells[0];
  if (position === undefined) throw new RangeError('Cover fixture needs a cell.');
  return {
    id: worldObjectId(`world-object:${id}`),
    name: id,
    kind: 'cover',
    position,
    footprint: cells,
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: {
      movement: cover !== 'half',
      lineOfSight: false,
      cover,
    },
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
      obscurementRegions: [
        { id: 'smoke', obscurement: 'heavy', cells: [{ column: 3, row: 1 }] },
      ],
      lightRegions: [
        { id: 'dim', level: 'dim', cells: [{ column: 1, row: 0 }] },
        { id: 'dark', level: 'darkness', cells: [{ column: 2, row: 0 }] },
      ],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
  });
  return {
    ...state,
    combatants: state.combatants.map((entry) =>
      entry.profile.id === foe.id
        ? { ...entry, hitPoints: 3, life: 'dying' }
        : entry,
    ),
    hiddenCombatants: [
      { combatant: foe.id, stealthTotal: 18, edition: '2024' },
    ],
  };
}

function cells(
  values: readonly { readonly column: number; readonly row: number }[],
): readonly string[] {
  return values
    .map((cell) => `${String(cell.column)},${String(cell.row)}`)
    .sort();
}

class FakeSnapshotService implements ProbeSnapshotService {
  closed = false;

  constructor(private readonly pngSha256 = 'a'.repeat(64)) {}

  capture(input: {
    readonly state: EncounterState;
    readonly source: BoardImageSource;
  }): Promise<BoardImageArtifact> {
    return Promise.resolve({
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath: `board-images/${this.pngSha256}.png`,
      sha256: this.pngSha256,
      bytes: 24,
      width: input.state.bounds.columns * 40,
      height: input.state.bounds.rows * 40,
      capturedAtUnixMs: 1,
      captureMs: 0,
      source: input.source,
      chromiumVersion: 'SIMULATED',
      html: {
        relativePath: `board-html/${'b'.repeat(64)}/board.html`,
        sha256: 'b'.repeat(64),
        bytes: 48,
      },
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

    expect(sheet.version).toBe('d576-screenshot-comprehension-v2');
    expect(sheet.bounds).toEqual({ columns: 6, rows: 4 });
    expect(sheet.combatants).toEqual([
      {
        id: 'combatant:screenshot-hero',
        displayName: 'screenshot-hero',
        badgeNumber: 2,
        badgeColor: 'ivory',
        cell: { column: 1, row: 1 },
        side: 'party',
        hpBand: 'uninjured',
        life: 'living',
        hiddenFromPlayers: false,
      },
      {
        id: 'combatant:screenshot-foe',
        displayName: 'screenshot-foe',
        badgeNumber: 1,
        badgeColor: 'deep-forest',
        cell: { column: 2, row: 2 },
        side: 'foe',
        hpBand: 'near_death',
        life: 'dying',
        hiddenFromPlayers: true,
      },
    ]);
    expect(
      new Set(sheet.combatants.map((combatant) => combatant.badgeNumber)).size,
    ).toBe(sheet.combatants.length);
    expect(
      new Set(sheet.combatants.map((combatant) => combatant.badgeColor)).size,
    ).toBe(sheet.combatants.length);
    expect(cells(sheet.difficultTerrainCells)).toEqual(['0,1']);
    expect(cells(sheet.obscuredCells)).toEqual(['3,1']);
    expect(cells(sheet.foggedCells)).toEqual(['4,3']);
    expect(cells(sheet.blockedCells)).toEqual(['5,3']);
    expect(sheet.lightCells).toHaveLength(24);
    expect(sheet.lightCells.filter((entry) => entry.light === 'dim')).toEqual([
      { column: 1, row: 0, light: 'dim' },
    ]);
    expect(sheet.lightCells.filter((entry) => entry.light === 'dark')).toEqual([
      { column: 2, row: 0, light: 'dark' },
    ]);
    expect(
      sheet.lightCells.filter((entry) => entry.light === 'bright'),
    ).toHaveLength(22);
    expect(sheet.doors).toEqual([
      { column: 0, row: 2, open: true },
      { column: 5, row: 2, open: false },
    ]);
    expect(sheet.worldObjects).toEqual([
      { column: 0, row: 2, name: 'Open Oak Door' },
      { column: 3, row: 2, name: 'Moon Statue' },
      { column: 5, row: 2, name: 'Closed Iron Door' },
    ]);
    expect(sheet.adjacencyPairs).toEqual([
      {
        first: { displayName: 'screenshot-hero', cell: { column: 1, row: 1 } },
        second: { displayName: 'screenshot-foe', cell: { column: 2, row: 2 } },
      },
    ]);
  });

  it('adjacency_ignores_diagonals: counts creatures whose cells share a corner as adjacent within 5 feet', () => {
    const sheet = deriveScreenshotFactSheet(everyClassState());
    expect(sheet.adjacencyPairs).toEqual([
      {
        first: { displayName: 'screenshot-hero', cell: { column: 1, row: 1 } },
        second: { displayName: 'screenshot-foe', cell: { column: 2, row: 2 } },
      },
    ]);
  });
});

describe('D519 screenshot comprehension scoring', () => {
  const sheet: ScreenshotFactSheet =
    deriveScreenshotFactSheet(everyClassState());

  it('scores a perfect answer as 1.0', () => {
    for (const question of [
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
      'Q6',
      'Q7',
      'Q8',
      'Q9',
      'Q10',
      'Q11',
      'Q12',
      'Q13',
      'Q14',
    ] as const) {
      expect(
        scoreProbeAnswer(
          truthAnswer(sheet, question),
          truthAnswer(sheet, question),
        ),
      ).toEqual({
        score: 1,
        hallucinations: 0,
        confusions: [],
      });
    }
  });

  it('compares names case-insensitively with whitespace collapsed', () => {
    const truth = parseProbeAnswer(
      'Q1',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q1',
        creatures: [{ name: 'Mirel Ash', column: 2, row: 1 }],
      }),
    );
    const uppercase = parseProbeAnswer(
      'Q1',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q1',
        creatures: [{ name: '  MIREL   ASH  ', column: 2, row: 1 }],
      }),
    );

    expect(scoreProbeAnswer(uppercase, truth)).toEqual({
      score: 1,
      hallucinations: 0,
      confusions: [],
    });
    expect(normalizeProbeAnswer(uppercase)).toEqual({
      version: 'd576-screenshot-comprehension-v2',
      question: 'Q1',
      creatures: [{ name: 'mirel ash', column: 2, row: 1 }],
    });
  });

  it('keeps live names exact after case-folding and strips HIDDEN only for hidden truth creatures', () => {
    const truth = parseProbeAnswer(
      'Q1',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q1',
        creatures: [{ name: 'Unicorn', column: 2, row: 1 }],
      }),
    );
    const tagged = parseProbeAnswer(
      'Q1',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q1',
        creatures: [{ name: 'Unicorn hidden', column: 2, row: 1 }],
      }),
    );
    expect(scoreProbeAnswer(tagged, truth).score).toBe(0);
    expect(
      scoreProbeAnswer(tagged, truth, {
        source: 'live',
        hiddenCreatureNames: ['Unicorn'],
      }),
    ).toEqual({ score: 1, hallucinations: 0, confusions: [] });

    const prefixed = parseProbeAnswer(
      'Q1',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q1',
        creatures: [{ name: 'Probe fixture: Unicorn', column: 2, row: 1 }],
      }),
    );
    expect(scoreProbeAnswer(prefixed, truth).score).toBe(0);

    const hiddenTruth = parseProbeAnswer(
      'Q8',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q8',
        creatures: [{ name: 'Unicorn', column: 2, row: 1 }],
      }),
    );
    const omitted = parseProbeAnswer(
      'Q8',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q8',
        creatures: [],
      }),
    );
    expect(scoreProbeAnswer(omitted, hiddenTruth).score).toBe(0);
  });

  it('jaccard_ignores_hallucinations: penalizes an asserted row-shifted fact absent from truth', () => {
    const truth = parseProbeAnswer(
      'Q4',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q4',
        cells: [{ column: 2, row: 0 }],
      }),
    );
    const withHallucination = parseProbeAnswer(
      'Q4',
      JSON.stringify({
        version: 'd576-screenshot-comprehension-v2',
        question: 'Q4',
        cells: [
          { column: 2, row: 0 },
          { column: 2, row: 1 },
        ],
      }),
    );

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
      model: 'SIMULATED',
      effort: 'low',
      question: 'Q1',
      prompt: '',
      schemaPath: '',
      imagePath: '',
      truth,
    });
    expect(
      scoreProbeAnswer(parseProbeAnswer('Q1', simulated.rawAnswer), truth)
        .confusions,
    ).toEqual(['row off by one', 'row off by one']);
  });
});

describe('D524 general screenshot primer', () => {
  it('is versioned, uses generic classic-board conventions, and leaks no non-rendered probe identity', async () => {
    const primerPrompt = screenshotQuestionPrompt('Q1', 'general');
    expect(primerPrompt).toContain(
      `General primer ${PRIMER_VERSION}: ${GENERAL_PRIMER}`,
    );
    expect(primerPrompt).toContain('Each grid square represents 5 feet');
    expect(primerPrompt).toContain(
      'Cool-blue floor plates beneath busts identify party creatures',
    );
    expect(primerPrompt).toContain(
      'warm-red floor plates beneath busts identify foes',
    );
    expect(primerPrompt).toContain('upper-left side of world art is lit');
    expect(primerPrompt).toContain('lower-right contact shadow grounds it');
    expect(primerPrompt).toContain(
      'Each creature token carries a numbered coloured badge',
    );
    expect(primerPrompt).toContain(
      "roster box under the board repeats that badge and lists the creature's full name, cell, side and HP band",
    );
    expect(primerPrompt).toContain(
      'A creature stands in the cell that holds its badge',
    );
    expect(primerPrompt).toContain(
      'An OBJECT-sigil tag in the legend rail names an object',
    );
    expect(primerPrompt).toContain(
      'coordinate printed on that tag is the cell where the object stands',
    );
    expect(primerPrompt).toContain(
      "roster box under the board repeats that badge and lists the creature's full name, cell, side and HP band",
    );
    expect(primerPrompt).toContain(
      "Door rail entries use the door glyph and print DOOR OPEN or DOOR CLOSED with the door's coordinate",
    );
    expect(primerPrompt).toContain(
      'top-left cell, whose column and row are both zero',
    );
    expect(primerPrompt).toContain(
      'columns increase rightward and rows increase downward',
    );
    expect(primerPrompt).toContain(
      'share an edge or a corner, so diagonals count',
    );
    expect(primerPrompt).toContain(
      'Doors are drawn only where the engine has a door',
    );
    expect(primerPrompt).toContain(
      'green for uninjured, amber for bloodied, red for near death, and grey for unknown',
    );
    expect(primerPrompt).toContain(
      'Difficult, Obscured, Bright light, Dim light, Darkness, and Fog',
    );
    expect(primerPrompt).toContain('Blocked, Object, and Light source');
    expect(primerPrompt).toContain(
      'walls, doors, and objects as they are drawn',
    );

    const candidates = await defaultProbeStateCandidates();
    const leakCanaries = candidates.flatMap((candidate) => [
      candidate.id,
      boardStateDigest(candidate.state),
      ...candidate.state.combatants.map((combatant) => combatant.profile.name),
      ...candidate.state.worldObjects.map((worldObject) => worldObject.name),
    ]);
    // D525: the leak test covers the whole primer under every board-glyph mode, not just the shared base.
    for (const mode of BOARD_GLYPH_MODES) {
      const normalizedPrimer = [GENERAL_PRIMER, ...BOARD_GLYPH_PRIMER[mode]]
        .join(' ')
        .toLocaleLowerCase('en-US');
      for (const canary of leakCanaries) {
        const escapedCanary = canary
          .toLocaleLowerCase('en-US')
          .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
        expect(
          normalizedPrimer,
          `${mode} primer leaked id, digest, combatant name, or object name ${JSON.stringify(canary)}`,
        ).not.toMatch(
          new RegExp(`(?:^|[^a-z0-9])${escapedCanary}(?:$|[^a-z0-9])`, 'u'),
        );
      }
    }
  });

  it('D525: appends the light sentence per mode plus one sentence per glyph family under full, chosen by --board-glyphs, defaulting to none', () => {
    expect(PRIMER_VERSION).toBe('d576-general-board-primer-v12');
    expect(PREVIOUS_PRIMER_VERSION).toBe('d576-general-board-primer-v11');
    expect(HISTORICAL_PRIMER_VERSION).toBe('d562-general-board-primer-v10');
    expect(LEGACY_PRIMER_VERSION).toBe('d557-general-board-primer-v9');
    expect(PRIMER_HISTORY[PREVIOUS_PRIMER_VERSION].general).toBe(
      GENERAL_PRIMER_V11,
    );
    expect(PRIMER_HISTORY[PREVIOUS_PRIMER_VERSION].glyphFamilies.veil).toBe(
      GLYPH_FAMILY_PRIMER.veil,
    );
    expect(PRIMER_HISTORY[HISTORICAL_PRIMER_VERSION].general).toBe(
      GENERAL_PRIMER_V10,
    );
    expect(PRIMER_HISTORY[LEGACY_PRIMER_VERSION].general).toBe(
      GENERAL_PRIMER_V9,
    );
    expect(GENERAL_PRIMER).toContain(
      'Cool-blue floor plates beneath busts identify party creatures',
    );
    expect(GENERAL_PRIMER).toContain(
      'warm-red floor plates beneath busts identify foes',
    );
    expect(GENERAL_PRIMER).toContain(
      'Difficult terrain is marked by one cell-local emblem of three inset opaque pale-ochre zigzag ridges with a dark outline.',
    );
    expect(GENERAL_PRIMER).toContain(
      'Blocked terrain is marked by a large cross-braced stone pile spanning the cell.',
    );
    expect(BOARD_GLYPH_PRIMER.none).toEqual([LIGHT_PRIMER.tint]);
    expect(BOARD_GLYPH_PRIMER.light).toEqual([LIGHT_PRIMER.glyph]);
    expect(BOARD_GLYPH_PRIMER.full).toEqual([
      LIGHT_PRIMER.glyph,
      GLYPH_FAMILY_PRIMER.door,
      GLYPH_FAMILY_PRIMER.blocked,
      GLYPH_FAMILY_PRIMER.veil,
      GLYPH_FAMILY_PRIMER.hidden,
    ]);
    for (const sentence of [
      ...Object.values(LIGHT_PRIMER),
      ...Object.values(GLYPH_FAMILY_PRIMER),
    ]) {
      expect(
        sentence.match(/[.!?]/gu),
        `one sentence: ${sentence}`,
      ).toHaveLength(1);
      expect(sentence.endsWith('.')).toBe(true);
    }
    for (const mode of BOARD_GLYPH_MODES) {
      const prompt = screenshotQuestionPrompt('Q5', 'general', mode);
      expect(prompt).toContain(
        `General primer ${PRIMER_VERSION}: ${[GENERAL_PRIMER, ...BOARD_GLYPH_PRIMER[mode]].join(' ')}`,
      );
      for (const family of Object.values(GLYPH_FAMILY_PRIMER)) {
        expect(
          prompt.includes(family),
          `${mode} carries family sentences only under full`,
        ).toBe(mode === 'full');
      }
      expect(prompt.includes(LIGHT_PRIMER.tint)).toBe(mode === 'none');
      expect(prompt.includes(LIGHT_PRIMER.glyph)).toBe(mode !== 'none');
      for (const sentence of BOARD_GLYPH_PRIMER[mode])
        expect(screenshotQuestionPrompt('Q5', 'none', mode)).not.toContain(
          sentence,
        );
    }
    expect(screenshotQuestionPrompt('Q5', 'general')).toContain(
      LIGHT_PRIMER.tint,
    );
    // the light sentences name the three levels the legend rows carry
    expect(LIGHT_PRIMER.glyph).toMatch(/sun marks bright light/u);
    expect(LIGHT_PRIMER.glyph).toMatch(/crescent moon marks dim light/u);
    expect(LIGHT_PRIMER.glyph).toMatch(/filled dark circle marks darkness/u);
    expect(LIGHT_PRIMER.glyph).toContain('No glyph =');
    expect(LIGHT_PRIMER.tint).toMatch(/untinted floor is also bright light/u);
    // each family sentence names its corner (or the plate rim) and both meanings the legend rows carry
    expect(GLYPH_FAMILY_PRIMER.door).toContain(GLYPH_FAMILY_CORNER.door);
    expect(GLYPH_FAMILY_PRIMER.door).toMatch(
      /dark bar means the door is closed/u,
    );
    expect(GLYPH_FAMILY_PRIMER.door).toMatch(
      /swing arc means the door is open/u,
    );
    expect(GLYPH_FAMILY_PRIMER.blocked).toContain(GLYPH_FAMILY_CORNER.blocked);
    expect(GLYPH_FAMILY_PRIMER.blocked).toMatch(/X inside a square/u);
    expect(GLYPH_FAMILY_PRIMER.veil).toContain(GLYPH_FAMILY_CORNER.veil);
    expect(GLYPH_FAMILY_PRIMER.veil).toMatch(/hatching with a cloud glyph/u);
    expect(GLYPH_FAMILY_PRIMER.veil).toMatch(
      /cool cyan veil of three closed inset diamonds forming a lattice/u,
    );
    expect(GLYPH_FAMILY_PRIMER.veil).toMatch(/glyph of cyan waves/u);
    expect(GLYPH_FAMILY_PRIMER.hidden).toMatch(
      /eye crossed by a slash on the left rim/u,
    );
    expect(GLYPH_FAMILY_PRIMER.hidden).toContain('HIDDEN');
    // the legend's words appear in the family sentence's words, lower-cased and stemmed
    const familySentence = {
      door: GLYPH_FAMILY_PRIMER.door,
      blocked: GLYPH_FAMILY_PRIMER.blocked,
      veil: GLYPH_FAMILY_PRIMER.veil,
    } as const;
    for (const kind of [
      'door-closed',
      'door-open',
      'blocked',
      'fog',
      'obscured',
    ] as const) {
      const glyph = CELL_GLYPHS[kind];
      if (glyph.family === 'light')
        throw new Error(`${kind} is not a light glyph.`);
      const words = glyph.label.toLocaleLowerCase('en-US').split(' ');
      for (const word of words)
        expect(
          familySentence[glyph.family].toLocaleLowerCase('en-US'),
          `${kind}: ${word}`,
        ).toContain(word.replace(/ed$/u, ''));
    }

    const base = [
      '--models',
      'gpt-5.6-luna:low',
      '--states',
      '1',
      '--seed',
      '1',
      '--images-root',
      'dnd-slim-runs/x-images',
      '--out',
      'dnd-slim-runs/x.jsonl',
      '--generation',
      'g3',
    ];
    expect(parseScreenshotProbeArgs(base).boardGlyphs).toBe('none');
    expect(parseScreenshotProbeArgs(base).captureTilePx).toBe(128);
    expect(
      parseScreenshotProbeArgs([...base, '--capture-tile-px', '64'])
        .captureTilePx,
    ).toBe(64);
    expect(
      parseScreenshotProbeArgs([...base, '--capture-tile-px', '128'])
        .captureTilePx,
    ).toBe(128);
    expect(() =>
      parseScreenshotProbeArgs([...base, '--capture-tile-px', '96']),
    ).toThrow('--capture-tile-px must be 64 or 128.');
    expect(
      parseScreenshotProbeArgs([...base, '--board-glyphs', 'light'])
        .boardGlyphs,
    ).toBe('light');
    expect(
      parseScreenshotProbeArgs([...base, '--board-glyphs', 'full']).boardGlyphs,
    ).toBe('full');
    for (const rejected of ['symbol', 'tint', 'inverse', 'glow']) {
      expect(
        () => parseScreenshotProbeArgs([...base, '--board-glyphs', rejected]),
        rejected,
      ).toThrow('--board-glyphs must be none, light or full.');
    }
    expect(() =>
      parseScreenshotProbeArgs([...base, '--light-encoding', 'symbol']),
    ).toThrow('Unknown screenshot probe option --light-encoding.');
  });

  it('D576-I5-HISTORICAL-PRIMER-PINS independently preserves v9, v10, and v11 primer bundles', () => {
    const historicalPrimerHash = (version: keyof typeof PRIMER_HISTORY): string =>
      createHash('sha256')
        .update(JSON.stringify(PRIMER_HISTORY[version]))
        .digest('hex');
    expect(historicalPrimerHash(PREVIOUS_PRIMER_VERSION)).toBe(
      '5430cb20d5ec766cd634bbfbfef710a1ceac4e54958dbc1f6b2c41806634e3e9',
    );
    expect(historicalPrimerHash(HISTORICAL_PRIMER_VERSION)).toBe(
      'c4d8503e80bd16d8e4d69b3c3d2cbeddcfc05f256c0e9ecbeccbdb50b30262db',
    );
    expect(historicalPrimerHash(LEGACY_PRIMER_VERSION)).toBe(
      '404e242a5dd2c0dc90b976e2d468ad5456188dfa0505b17eb6a7f95dccf3f9f0',
    );
  });

  it('D576-I5-PRIMER-TRACES keeps all three worked examples identical to canonical corner traces', () => {
    const fixtureActor = playerProfile('primer-feature-actor');
    const featureState = createEncounter({
      bounds: { columns: 6, rows: 4 },
      combatants: [fixtureActor],
      tokens: [placedToken(fixtureActor, 5, 3)],
      worldObjects: [
        coverObject(
          'primer-three-quarters',
          [{ column: 2, row: 0 }, { column: 1, row: 1 }],
          'three_quarters',
        ),
      ],
    });
    const featureTrace = traceTerrainLine(
      featureState,
      { column: 0, row: 0 },
      { column: 4, row: 2 },
    );
    expect(featureTrace).toMatchObject({
      sourceCorner: { column: 0, row: 0 },
      tier: 'three_quarters',
      blocksSight: false,
    });
    expect(featureTrace.lines.map((line) => line.tier)).toEqual([
      'none',
      'three_quarters',
      'three_quarters',
      'three_quarters',
    ]);
    const threeHalfState = {
      ...featureState,
      worldObjects: [
        coverObject(
          'primer-three-half-rays',
          [{ column: 2, row: 0 }, { column: 1, row: 1 }],
          'half',
        ),
      ],
    };
    const threeHalfTrace = traceTerrainLine(
      threeHalfState,
      { column: 0, row: 0 },
      { column: 4, row: 2 },
    );
    expect(threeHalfTrace.lines.map((line) => line.tier)).toEqual([
      'none',
      'half',
      'half',
      'half',
    ]);
    expect(threeHalfTrace).toMatchObject({ tier: 'half', blocksSight: false });

    const fourHalfState = {
      ...featureState,
      worldObjects: [
        coverObject(
          'primer-four-half-rays',
          [0, 1, 2, 3, 4, 5].map((row) => ({ column: 1, row })),
          'half',
        ),
      ],
    };
    const fourHalfTrace = traceTerrainLine(
      fourHalfState,
      { column: 0, row: 0 },
      { column: 4, row: 2 },
    );
    expect(fourHalfTrace.lines.map((line) => line.tier)).toEqual([
      'half',
      'half',
      'half',
      'half',
    ]);
    expect(fourHalfTrace).toMatchObject({ tier: 'half', blocksSight: false });

    const wallState = createEncounter({
      bounds: { columns: 6, rows: 6 },
      combatants: [fixtureActor],
      tokens: [placedToken(fixtureActor, 5, 5)],
      blockedCells: [0, 1, 2, 3, 4, 5].map((row) => ({ column: 1, row })),
    });
    expect(
      traceTerrainLine(
        wallState,
        { column: 0, row: 0 },
        { column: 4, row: 2 },
      ),
    ).toMatchObject({ tier: 'total', blocksSight: true });
    const endpointFeatureState = {
      ...featureState,
      worldObjects: [
        coverObject(
          'primer-source-endpoint',
          [{ column: 0, row: 0 }],
          'three_quarters',
        ),
        coverObject(
          'primer-target-endpoint',
          [{ column: 4, row: 2 }],
          'three_quarters',
        ),
      ],
    };
    expect(
      traceTerrainLine(
        endpointFeatureState,
        { column: 0, row: 0 },
        { column: 4, row: 2 },
      ),
    ).toMatchObject({ tier: 'none', blocksSight: false });

    const creatureSource = playerProfile('primer-creature-source');
    const creatureMiddle = monsterProfile('primer-creature-middle');
    const creatureTarget = monsterProfile('primer-creature-target');
    const creatureState = createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [creatureSource, creatureMiddle, creatureTarget],
      tokens: [
        placedToken(creatureSource, 0, 1),
        placedToken(creatureMiddle, 2, 1),
        placedToken(creatureTarget, 4, 1),
      ],
    });
    const creatureTrace = traceCombatantLine(
      creatureState,
      creatureSource.id,
      creatureTarget.id,
    );
    expect(creatureTrace).toMatchObject({
      sourceCorner: { column: 0, row: 1 },
      tier: 'half',
      blocksSight: false,
    });
    expect(creatureTrace.lines.map((line) => line.tier)).toEqual([
      'none',
      'none',
      'half',
      'half',
    ]);
    const deadCreatureState: EncounterState = {
      ...creatureState,
      combatants: creatureState.combatants.map((combatant) =>
        combatant.profile.id === creatureMiddle.id
          ? { ...combatant, hitPoints: 0, life: 'dead' as const }
          : combatant),
    };
    expect(
      traceCombatantLine(deadCreatureState, creatureSource.id, creatureTarget.id),
    ).toMatchObject({ tier: 'none', blocksSight: false });

    const baseLargeSource = playerProfile('primer-large-source');
    const largeSource = {
      ...baseLargeSource,
      rules: { ...baseLargeSource.rules, sizeCategory: 'Large' as const },
    };
    const largeTarget = monsterProfile('primer-large-target');
    const largeState = createEncounter({
      bounds: { columns: 8, rows: 4 },
      combatants: [largeSource, largeTarget],
      tokens: [placedToken(largeSource, 0, 0), placedToken(largeTarget, 6, 0)],
      worldObjects: [
        coverObject('primer-large-low', [{ column: 2, row: 0 }], 'half'),
      ],
    });
    const largeTrace = traceCombatantLine(
      largeState,
      largeSource.id,
      largeTarget.id,
    );
    expect(
      traceTerrainLine(
        largeState,
        { column: 0, row: 0 },
        { column: 6, row: 0 },
      ).tier,
    ).toBe('half');
    expect(largeTrace).toMatchObject({
      sourceCorner: { column: 0, row: 2 },
      tier: 'none',
      blocksSight: false,
    });
    expect(largeTrace.lines.map((line) => line.tier)).toEqual([
      'none',
      'none',
      'none',
      'none',
    ]);

    expect(GENERAL_PRIMER).toContain('the weakest of the ray-count tier');
    expect(GENERAL_PRIMER).toContain(
      'three or four rays that cross only 1/2 COVER still give half cover',
    );
    expect(GENERAL_PRIMER.match(/Worked /gu)).toHaveLength(3);
  });

  it('omits the general primer when explicitly disabled', () => {
    const prompt = screenshotQuestionPrompt('Q1', 'none');
    expect(prompt).not.toContain(PRIMER_VERSION);
    expect(prompt).not.toContain(GENERAL_PRIMER);
    expect(prompt).toContain('Question Q1:');
    expect(prompt).toContain('Use zero-based column,row coordinates');
  });

  it('names cell-list encoding for semantic inputs without changing the PNG primer', () => {
    const semantic = screenshotQuestionPrompt('Q5', 'general', 'full', 'semantic', '{}');
    const both = screenshotQuestionPrompt('Q9', 'general', 'full', 'both', '{}');
    const png = screenshotQuestionPrompt('Q5', 'general', 'full', 'png');

    expect(semantic).toContain(
      'Cell-list encoding: [column,row] is one cell; [start_column,row,end_column_inclusive] is a horizontal run that includes both endpoints.',
    );
    expect(both).toContain(
      'Cell-list encoding: [column,row] is one cell; [start_column,row,end_column_inclusive] is a horizontal run that includes both endpoints.',
    );
    expect(png).not.toContain('Cell-list encoding:');
    expect(png).toContain(`General primer ${PRIMER_VERSION}: ${GENERAL_PRIMER}`);
  });
});

describe('D519 screenshot comprehension schema and CLI', () => {
  it('accepts png, semantic and both board inputs, defaults to png, and rejects others', () => {
    const base = [
      '--models',
      'gpt-5.6-luna:medium',
      '--states',
      '1',
      '--seed',
      '1',
      '--images-root',
      'dnd-slim-runs/board-input-images',
      '--out',
      'dnd-slim-runs/board-input.jsonl',
      '--generation',
      'e1-semantic-board',
    ];
    expect(parseScreenshotProbeArgs(base).boardInput).toBe('png');
    for (const boardInput of ['png', 'semantic', 'both'] as const) {
      expect(
        parseScreenshotProbeArgs([...base, '--board-input', boardInput]).boardInput,
      ).toBe(boardInput);
    }
    expect(() =>
      parseScreenshotProbeArgs([...base, '--board-input', 'coordinates']),
    ).toThrow('--board-input must be png, semantic or both.');
  });

  it('marks semantic facts authoritative only when semantic input is present', () => {
    const semantic = screenshotQuestionPrompt('Q1', 'general', 'none', 'semantic', '{"revision":7}');
    const both = screenshotQuestionPrompt('Q1', 'general', 'none', 'both', '{"revision":7}');
    expect(semantic).not.toContain(GENERAL_PRIMER);
    expect(semantic).not.toContain('attached PNG');
    expect(semantic).toContain('Semantic board JSON:\n{"revision":7}');
    expect(both).toContain('The semantic facts are authoritative and the attached PNG is illustrative.');
    expect(both).toContain(GENERAL_PRIMER);
    expect(() => screenshotQuestionPrompt('Q1', 'general', 'none', 'both')).toThrow(
      'both board input requires a semantic payload.',
    );
  });

  it('sends semantic input without an image and records its canonical artifact', async () => {
    const artifactRoot = resolve('dnd-slim-runs');
    mkdirSync(artifactRoot, { recursive: true });
    const directory = await mkdtemp(join(artifactRoot, 'e1-semantic-test-'));
    const imagesRoot = join(directory, 'semantic-images');
    const outPath = join(directory, 'semantic.jsonl');
    const requests: ProbeAnswerRequest[] = [];
    try {
      const config = parseScreenshotProbeArgs([
        '--models',
        'gpt-5.6-luna:medium',
        '--states',
        '1',
        '--seed',
        '1',
        '--images-root',
        imagesRoot,
        '--out',
        outPath,
        '--generation',
        'e1-semantic-board',
        '--board-input',
        'semantic',
        '--simulate',
      ]);
      const rows = await runScreenshotProbe(config, {
        candidates: [{ id: 'semantic-fixture', state: everyClassState() }],
        snapshotService: new FakeSnapshotService(),
        answerer: {
          answer(request) {
            requests.push(request);
            return Promise.resolve({
              rawAnswer: JSON.stringify(request.truth),
              wallMs: 0,
              tokens: null,
              error: null,
            });
          },
        },
      });

      expect(requests).toHaveLength(10);
      expect(requests.every((request) => request.imagePath === null)).toBe(true);
      expect(requests.every((request) => request.prompt.includes('Semantic board JSON:'))).toBe(true);
      expect(rows.every((row) => row.boardInput === 'semantic')).toBe(true);
      const semanticHash = rows[0]?.semanticPayloadSha256;
      const semanticPath = rows[0]?.semanticPayloadRelativePath;
      expect(semanticHash).toMatch(/^[0-9a-f]{64}$/u);
      expect(rows.every((row) => row.semanticPayloadSha256 === semanticHash)).toBe(true);
      expect(semanticPath).toBe(`semantic-boards/${semanticHash ?? ''}.json`);
      const bytes = await readFile(join(imagesRoot, semanticPath ?? ''), 'utf8');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(semanticHash);
      expect(requests.map((request) => request.question)).toEqual([
        'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10',
      ]);
      const semanticBoard = semanticBoardJsonForProbeState(everyClassState());
      for (const forbiddenPairAnswer of [
        'queryId', 'creatureLineQuery', 'cellLineQuery', 'sourceCorner',
        'targetCorner', 'blocksSight', 'sourceIds',
      ]) {
        expect(semanticBoard).not.toContain(forbiddenPairAnswer);
      }
      expect(await readFile(config.summaryPath, 'utf8')).toContain('Board input: semantic.');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('pins the strict threshold to 0.9', () => {
    expect(PASS_THRESHOLD).toBe(0.9);
  });

  it('D576-I5-CATALOGUE-DIVERSITY builds 24 balanced states from diverse queries and open/closed doors', async () => {
    const first = await defaultProbeStateCandidates();
    const second = await defaultProbeStateCandidates();
    expect(PROBE_CATALOGUE_SIZE).toBe(24);
    expect(MIN_FACT_CLASS_STATE_COVERAGE).toBe(6);
    expect(first).toHaveLength(PROBE_CATALOGUE_SIZE);
    expect(new Set(first.map((candidate) => candidate.id)).size).toBe(
      PROBE_CATALOGUE_SIZE,
    );
    expect(
      new Set(first.map((candidate) => boardStateDigest(candidate.state))).size,
    ).toBe(PROBE_CATALOGUE_SIZE);
    expect(
      second.map((candidate) => ({
        id: candidate.id,
        digest: boardStateDigest(candidate.state),
      })),
    ).toEqual(
      first.map((candidate) => ({
        id: candidate.id,
        digest: boardStateDigest(candidate.state),
      })),
    );
    // Probe identity lives only in the non-rendered catalogue id and state digest.
    expect(
      first
        .flatMap((candidate) => candidate.state.combatants)
        .every((combatant) => !combatant.profile.name.startsWith('Probe ')),
    ).toBe(true);
    expect(
      first.every((candidate) => {
        const terrainCells = new Set([
          ...candidate.state.blockedCells,
          ...candidate.state.worldObjects
            .filter((object) => 'terrainKind' in object)
            .flatMap((object) => object.footprint),
        ].map((cell) => `${String(cell.column)},${String(cell.row)}`));
        return candidate.state.worldObjects.some((object) =>
          'terrainKind' in object && object.terrainKind === 'half_cover') &&
          candidate.state.worldObjects.some((object) =>
            'terrainKind' in object && object.terrainKind === 'three_quarters_cover') &&
          candidate.state.blockedCells.length > 0 &&
          terrainCells.size < candidate.state.bounds.columns * candidate.state.bounds.rows;
      }),
    ).toBe(true);
    const coverage = probeCatalogueClassCoverage(first);
    for (const [question, count] of Object.entries(coverage)) {
      expect(count, `${question} state coverage`).toBeGreaterThanOrEqual(
        MIN_FACT_CLASS_STATE_COVERAGE,
      );
    }
    expect(probeCatalogueLineCoverage(first)).toEqual({
      creatureCover: { none: 6, half: 6, three_quarters: 6, total: 6 },
      cellCover: { none: 6, half: 6, three_quarters: 6, total: 6 },
      creatureLineOfSight: { clear: 18, blocked: 6 },
      cellLineOfSight: { clear: 18, blocked: 6 },
    });
    const catalogueDoors = first.flatMap((candidate) =>
      candidate.state.worldObjects.filter((worldObject) =>
        worldObject.id.startsWith('world-object:screenshot-probe-door-')),
    );
    expect(catalogueDoors).toHaveLength(PROBE_CATALOGUE_SIZE);
    expect(catalogueDoors.filter((door) => !door.blocking.movement)).toHaveLength(12);
    expect(catalogueDoors.filter((door) => door.blocking.movement)).toHaveLength(12);
    for (const tier of ['none', 'half', 'three_quarters', 'total'] as const) {
      const sheets = first
        .filter((candidate) => candidate.desiredLineTier === tier)
        .map((candidate) => deriveScreenshotFactSheet(candidate.state, tier));
      expect(
        new Set(sheets.map((sheet) => JSON.stringify(sheet.creatureLineQuery))).size,
        `${tier} creature-query diversity`,
      ).toBeGreaterThanOrEqual(5);
      expect(
        new Set(sheets.map((sheet) => JSON.stringify(sheet.cellLineQuery))).size,
        `${tier} cell-query diversity`,
      ).toBeGreaterThanOrEqual(5);
    }
    const totalCandidate = first.find((candidate) =>
      candidate.desiredLineTier === 'total');
    if (totalCandidate === undefined) throw new Error('Missing total-cover catalogue state.');
    const totalSheet = deriveScreenshotFactSheet(totalCandidate.state, 'total');
    expect(truthAnswer(totalSheet, 'Q11')).toMatchObject({
      question: 'Q11',
      lineOfSight: 'blocked',
    });
    expect(truthAnswer(totalSheet, 'Q12')).toMatchObject({
      question: 'Q12',
      cover: 'total',
    });
  });

  it('builds PNG-only directional Q11-Q14 prompts without leaking production answers', () => {
    const sheet = deriveScreenshotFactSheet(everyClassState());
    for (const question of ['Q11', 'Q12', 'Q13', 'Q14'] as const) {
      const truth = truthAnswer(sheet, question);
      if (!('queryId' in truth) || !('source' in truth)) {
        throw new Error(`${question} truth lacks a directional query.`);
      }
      const prompt = screenshotQuestionPrompt(
        question,
        'general',
        'full',
        'png',
        null,
        truth,
      );
      expect(prompt).toContain(`Directional query ${truth.queryId}:`);
      expect(prompt).toContain(truth.source.name);
      expect(prompt).toContain('Inspect only the attached PNG.');
      expect(prompt).not.toContain('Semantic board JSON:');
      if (truth.question === 'Q11' || truth.question === 'Q13') {
        expect(prompt).not.toContain(`lineOfSight":"${truth.lineOfSight}`);
      } else if (truth.question === 'Q12' || truth.question === 'Q14') {
        expect(prompt).not.toContain(`cover":"${truth.cover}`);
      }
    }
    expect(() => screenshotQuestionPrompt('Q11')).toThrow(
      'Q11 prompt requires its matching directional query.',
    );
    expect(() =>
      screenshotQuestionPrompt(
        'Q11',
        'general',
        'full',
        'semantic',
        '{}',
        truthAnswer(sheet, 'Q11'),
      ),
    ).toThrow('Q11 is a PNG-only directional query.');
  });

  it('keeps total, blocked sight, direction, and the four cover tiers distinct in Q11-Q14 schemas and scoring', () => {
    const sheet = deriveScreenshotFactSheet(everyClassState());
    const q11 = truthAnswer(sheet, 'Q11');
    const q12 = truthAnswer(sheet, 'Q12');
    expect(parseProbeAnswer('Q11', JSON.stringify(q11))).toEqual(q11);
    expect(parseProbeAnswer('Q12', JSON.stringify(q12))).toEqual(q12);
    expect(probeAnswerJsonSchema('Q12')).toMatchObject({
      properties: {
        cover: { enum: ['none', 'half', 'three_quarters', 'total'] },
      },
    });
    expect(() =>
      parseProbeAnswer('Q12', JSON.stringify({ ...q12, cover: 'blocked' })),
    ).toThrow();
    expect(() =>
      parseProbeAnswer('Q12', JSON.stringify({ ...q12, cover: '3/4' })),
    ).toThrow();
    if (q12.question !== 'Q12') throw new Error('Q12 truth changed class.');
    const swapped = { ...q12, source: q12.target, target: q12.source };
    expect(scoreProbeAnswer(swapped, q12)).toMatchObject({
      score: 0,
      hallucinations: 1,
    });
  });

  it('D576-I5-TRACE-SEAM forwards both directional query paths through the injected canonical tracer dependency', () => {
    const state = everyClassState();
    let creatureCalls = 0;
    let cellCalls = 0;
    const tracer: ProbeLineTracer = {
      traceCombatantLine: () => {
        creatureCalls += 1;
        return { tier: 'total', blocksSight: true };
      },
      traceCombatantLineToCells: () => {
        cellCalls += 1;
        return { tier: 'three_quarters', blocksSight: false };
      },
    };
    const sheet = deriveScreenshotFactSheet(state, undefined, tracer);
    expect(creatureCalls).toBeGreaterThan(0);
    expect(cellCalls).toBeGreaterThan(0);
    expect(sheet.creatureLineQuery).toMatchObject({
      tier: 'total',
      lineOfSight: 'blocked',
    });
    expect(sheet.cellLineQuery).toMatchObject({
      tier: 'three_quarters',
      lineOfSight: 'clear',
    });
    const productionSheet = deriveScreenshotFactSheet(state);
    expect({
      creature: productionSheet.creatureLineQuery.tier,
      cell: productionSheet.cellLineQuery.tier,
    }).not.toEqual({ creature: 'total', cell: 'three_quarters' });
  });

  it('D576-I5-HISTORICAL-ROW re-scores Q1-Q10 but rejects a valid-shaped Q11 with historical provenance', async () => {
    const artifactRoot = resolve('dnd-slim-runs');
    mkdirSync(artifactRoot, { recursive: true });
    const directory = await mkdtemp(join(artifactRoot, 'd519-rescore-test-'));
    const savedPath = join(directory, 'saved.jsonl');
    const outPath = join(directory, 'rescored.jsonl');
    try {
      const sheet = deriveScreenshotFactSheet(everyClassState());
      const rows = (
        ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'] as const
      ).map((question) => {
        const truth = truthAnswer(sheet, question);
        const savedTruth =
          truth.question === 'Q3'
            ? {
                ...truth,
                creatures: truth.creatures.map((creature) => ({
                  ...creature,
                  hpBand:
                    creature.hpBand === 'bloodied'
                      ? 'injured'
                      : creature.hpBand === 'near_death'
                        ? 'critical'
                        : creature.hpBand,
                })),
              }
            : truth;
        const raw =
          question === 'Q1'
            ? {
                ...truth,
                creatures:
                  truth.question === 'Q1'
                    ? truth.creatures.map((creature) => ({
                        ...creature,
                        name: `Probe fixture: ${creature.name}${
                          sheet.combatants.some(
                            (combatant) =>
                              combatant.displayName === creature.name &&
                              combatant.hiddenFromPlayers,
                          )
                            ? ' hidden'
                            : ''
                        }`,
                      }))
                    : [],
              }
            : savedTruth;
        const historicalTruth = {
          ...savedTruth,
          version: 'd519-screenshot-comprehension-v1',
        };
        const historicalRaw = {
          ...raw,
          version: 'd519-screenshot-comprehension-v1',
        };
        return {
          version: 'd525-screenshot-comprehension-row-v5',
          stateId: 'saved-state',
          stateDigest: 'a'.repeat(64),
          model: 'saved-model',
          effort: 'low',
          question,
          promptVersion: 'd519-screenshot-comprehension-v1',
          primerVersion: HISTORICAL_PRIMER_VERSION,
          generation: 'saved-generation',
          boardGlyphs: 'full',
          png: {
            sha256: 'b'.repeat(64),
            relativePath: 'board-images/saved.png',
            width: 640,
            height: 480,
          },
          outcome: 'answered',
          score: 0,
          hallucinations: 1,
          confusions: ['old normalizer'],
          wallMs: 12,
          tokens: null,
          truth: historicalTruth,
          answer: null,
          normalizedAnswer: null,
          rawAnswer: JSON.stringify(historicalRaw),
          error: null,
        };
      });
      const savedBytes = rows.map((row) => `${JSON.stringify(row)}\n`).join('');
      await writeFile(savedPath, savedBytes, 'utf8');
      const config = parseScreenshotProbeRescoreArgs([
        '--rescore',
        savedPath,
        '--out',
        outPath,
      ]);
      const rescored = await rescoreScreenshotProbe(config);
      expect(rescored).toHaveLength(10);
      expect(rescored.every((row) => row.score === 1)).toBe(true);
      expect(
        rescored.every(
          (row) => row.version === 'd576-screenshot-comprehension-row-v10',
        ),
      ).toBe(true);
      expect(rescored.every((row) => row.resultKind === 'rescored')).toBe(true);
      expect(
        rescored.every((row) => row.normaliserVersion === NORMALISER_VERSION),
      ).toBe(true);
      expect(
        rescored.every(
          (row) =>
            row.sourceFileSha256 ===
            createHash('sha256').update(savedBytes).digest('hex'),
        ),
      ).toBe(true);
      expect(rescored[0]?.normalizedAnswer).toEqual(truthAnswer(sheet, 'Q1'));
      expect(
        rescored.find((row) => row.question === 'Q3')?.normalizedAnswer,
      ).toEqual(truthAnswer(sheet, 'Q3'));
      expect(await readFile(config.summaryPath, 'utf8')).toContain(
        'RESCORED ESTIMATE (image unchanged)',
      );
      expect(await readFile(config.summaryPath, 'utf8')).toContain(
        'uninjured / bloodied / near_death / unknown',
      );
      expect(renderProbeSummary(rescored)).toContain(
        'RESCORED ESTIMATE (image unchanged)',
      );
      expect(strictProbeGate(rescored)).toBe(false);
      await expect(rescoreScreenshotProbe(config)).rejects.toThrow();
      const historicalQ11Path = join(directory, 'historical-q11.jsonl');
      const historicalQ11Out = join(directory, 'historical-q11-rescored.jsonl');
      const historicalBase = rows[0];
      if (historicalBase === undefined)
        throw new Error('Historical Q11 witness needs a base row.');
      const q11 = truthAnswer(sheet, 'Q11');
      await writeFile(
        historicalQ11Path,
        `${JSON.stringify({
          ...historicalBase,
          question: 'Q11',
          truth: q11,
          rawAnswer: JSON.stringify(q11),
        })}\n`,
        'utf8',
      );
      await expect(
        rescoreScreenshotProbe(
          parseScreenshotProbeRescoreArgs([
            '--rescore', historicalQ11Path, '--out', historicalQ11Out,
          ]),
        ),
      ).rejects.toThrow('Historical');
      expect(() =>
        parseScreenshotProbeRescoreArgs([
          '--rescore',
          savedPath,
          '--out',
          savedPath,
        ]),
      ).toThrow('--out must be a new path');

      const comparisonConfig = parseScreenshotProbeArgs([
        '--models',
        'saved-model:low',
        '--states',
        '1',
        '--seed',
        '1',
        '--images-root',
        join(directory, 'comparison-images'),
        '--out',
        join(directory, 'comparison.jsonl'),
        '--generation',
        'comparison-generation',
        '--compare',
        outPath,
        '--simulate',
      ]);
      await expect(
        runScreenshotProbe(comparisonConfig, {
          candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
          snapshotService: new FakeSnapshotService(),
        }),
      ).rejects.toThrow('Invalid comparison row 1');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('accepts --states through the catalogue size and rejects larger requests', () => {
    const base = [
      '--models',
      'gpt-5.6-luna:low',
      '--seed',
      '1',
      '--images-root',
      'dnd-slim-runs/x-images',
      '--out',
      'dnd-slim-runs/x.jsonl',
      '--generation',
      'g3',
    ];
    expect(
      parseScreenshotProbeArgs([
        ...base,
        '--states',
        String(PROBE_CATALOGUE_SIZE),
      ]).stateCount,
    ).toBe(PROBE_CATALOGUE_SIZE);
    expect(() =>
      parseScreenshotProbeArgs([
        ...base,
        '--states',
        String(PROBE_CATALOGUE_SIZE + 1),
      ]),
    ).toThrow(
      `--states cannot exceed the ${String(PROBE_CATALOGUE_SIZE)}-state catalogue.`,
    );
    expect(() =>
      parseScreenshotProbeArgs([
        ...base,
        '--states',
        '1',
        '--comparison-mode',
        'acceptance',
      ]),
    ).toThrow('--comparison-mode requires --compare.');
  });

  it('computes deterministic seeded 95% bootstrap intervals', () => {
    expect(bootstrapMeanInterval95([0, 0.5, 1, 1], 6203001)).toEqual(
      bootstrapMeanInterval95([0, 0.5, 1, 1], 6203001),
    );
    expect(bootstrapMeanInterval95([1, 1, 1], 6203001)).toEqual({
      lower: 1,
      upper: 1,
    });
  });

  it('rejects malformed, wrong-question, negative-coordinate, and extra-property answers', () => {
    expect(() => parseProbeAnswer('Q1', 'not-json')).toThrow('not JSON');
    expect(() =>
      parseProbeAnswer(
        'Q1',
        JSON.stringify({
          version: 'd576-screenshot-comprehension-v2',
          question: 'Q2',
          creatures: [],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseProbeAnswer(
        'Q4',
        JSON.stringify({
          version: 'd576-screenshot-comprehension-v2',
          question: 'Q4',
          cells: [{ column: 0, row: -1 }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseProbeAnswer(
        'Q10',
        JSON.stringify({
          version: 'd576-screenshot-comprehension-v2',
          question: 'Q10',
          cells: [],
          prose: 'none',
        }),
      ),
    ).toThrow();
  });

  it('D576-I5-COMPARISON-IDENTITY separates explicit ablation metadata from exact acceptance pairs', async () => {
    const artifactRoot = resolve('dnd-slim-runs');
    mkdirSync(artifactRoot, { recursive: true });
    const directory = await mkdtemp(join(artifactRoot, 'd519-probe-test-'));
    const imagesRoot = join(directory, 'e2e-images');
    const outPath = join(directory, 'e2e.jsonl');
    const service = new FakeSnapshotService();
    try {
      const config = parseScreenshotProbeArgs([
        '--models',
        'gpt-5.6-luna:low,gpt-5.6-luna:medium',
        '--states',
        '1',
        '--seed',
        '6203001',
        '--images-root',
        imagesRoot,
        '--out',
        outPath,
        '--generation',
        'g2-classic-general',
        '--board-glyphs',
        'full',
        '--capture-tile-px',
        '64',
        '--simulate',
      ]);
      expect(config.primer).toBe('general');
      expect(config.comparePath).toBeNull();
      expect(config.comparisonMode).toBe('acceptance');
      expect(config.boardGlyphs).toBe('full');
      expect(config.captureTilePx).toBe(64);
      const rows = await runScreenshotProbe(config, {
        candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
        snapshotService: service,
      });

      expect(rows).toHaveLength(28);
      expect(
        rows.every((row) => row.outcome === 'answered' && row.score === 1),
      ).toBe(true);
      expect(rows.every((row) => row.primerVersion === PRIMER_VERSION)).toBe(
        true,
      );
      expect(rows.every((row) => row.generation === 'g2-classic-general')).toBe(
        true,
      );
      expect(rows.every((row) => row.boardGlyphs === 'full')).toBe(true);
      expect(rows.every((row) => row.captureTilePx === 64)).toBe(true);
      expect(
        rows.every(
          (row) => row.version === 'd576-screenshot-comprehension-row-v10',
        ),
      ).toBe(true);
      expect(rows.every((row) => row.resultKind === 'generated')).toBe(true);
      expect(rows.every((row) => row.sourceFileSha256 === null)).toBe(true);
      expect(
        rows.every((row) => row.normaliserVersion === NORMALISER_VERSION),
      ).toBe(true);
      expect(
        rows.every(
          (row) => row.answer !== null && row.normalizedAnswer !== null,
        ),
      ).toBe(true);
      for (const row of rows) {
        if (row.answer === null)
          throw new Error('Perfect simulated answer was not recorded.');
        expect(row.normalizedAnswer).toEqual(normalizeProbeAnswer(row.answer));
        expect(parseProbeAnswer(row.question, row.rawAnswer)).toEqual(
          row.answer,
        );
      }
      expect(strictProbeGate(rows)).toBe(true);
      expect(
        strictProbeGate(
          rows.map((row) => row.question === 'Q1' ? { ...row, score: 0 } : row),
        ),
      ).toBe(false);
      expect((await readFile(outPath, 'utf8')).trim().split('\n')).toHaveLength(
        28,
      );
      const summary = await readFile(config.summaryPath, 'utf8');
      expect(summary).not.toContain('RESCORED ESTIMATE');
      expect(summary).toContain('Board glyphs: full.');
      expect(summary).toContain('Capture tile: 64 px.');
      expect(summary).toContain('gpt-5.6-luna:low');
      expect(summary).toContain('gpt-5.6-luna:medium');
      expect(
        summary.match(/Strict all classes >= 0\.9: \*\*PASS\*\*/gu),
      ).toHaveLength(2);

      const comparisonOutPath = join(directory, 'e2e-without-primer.jsonl');
      const comparisonConfig = parseScreenshotProbeArgs([
        '--models',
        'gpt-5.6-luna:low,gpt-5.6-luna:medium',
        '--states',
        '1',
        '--seed',
        '6203001',
        '--images-root',
        join(directory, 'e2e-without-primer-images'),
        '--out',
        comparisonOutPath,
        '--primer',
        'none',
        '--generation',
        'g1-like-for-like',
        '--compare',
        outPath,
        '--comparison-mode',
        'ablation',
        '--simulate',
      ]);
      expect(comparisonConfig.comparisonMode).toBe('ablation');
      const impostorRows = await runScreenshotProbe(comparisonConfig, {
        candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
        snapshotService: service,
        answerer: simulatedProbeAnswerer('shifted_row'),
      });
      expect(impostorRows.every((row) => row.primerVersion === null)).toBe(
        true,
      );
      expect(
        impostorRows.every((row) => row.generation === 'g1-like-for-like'),
      ).toBe(true);
      expect(impostorRows.every((row) => row.boardGlyphs === 'none')).toBe(
        true,
      );
      expect(strictProbeGate(impostorRows)).toBe(false);
      const comparisonSummary = await readFile(
        comparisonConfig.summaryPath,
        'utf8',
      );
      expect(comparisonSummary).toContain('Delta vs previous run');
      expect(comparisonSummary).toContain('Comparison mode: ablation.');
      expect(comparisonSummary).toContain(
        'Changed comparison dimensions: primer version, generation, board glyphs, capture tile.',
      );
      expect(comparisonSummary).toContain('Delta 95% bootstrap interval');
      expect(comparisonSummary).toContain('signal');
      expect(comparisonSummary).toContain('-1.000');
      expect(
        comparisonSummary.match(/Strict all classes >= 0\.9: \*\*FAIL\*\*/gu),
      ).toHaveLength(2);

      const acceptanceConfig = parseScreenshotProbeArgs([
        '--models',
        'gpt-5.6-luna:low,gpt-5.6-luna:medium',
        '--states',
        '1',
        '--seed',
        '6203001',
        '--images-root',
        join(directory, 'acceptance-images'),
        '--out',
        join(directory, 'acceptance.jsonl'),
        '--generation',
        'g2-classic-general',
        '--board-glyphs',
        'full',
        '--capture-tile-px',
        '64',
        '--compare',
        outPath,
        '--comparison-mode',
        'acceptance',
        '--simulate',
      ]);
      const acceptanceRows = await runScreenshotProbe(acceptanceConfig, {
        candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
        snapshotService: service,
      });
      expect(acceptanceRows).toHaveLength(28);
      expect(await readFile(acceptanceConfig.summaryPath, 'utf8')).toContain(
        'Changed comparison dimensions: none.',
      );

      const changedPngConfig = parseScreenshotProbeArgs([
        '--models',
        'gpt-5.6-luna:low,gpt-5.6-luna:medium',
        '--states',
        '1',
        '--seed',
        '6203001',
        '--images-root',
        join(directory, 'changed-png-images'),
        '--out',
        join(directory, 'changed-png.jsonl'),
        '--generation',
        'g2-classic-general',
        '--board-glyphs',
        'full',
        '--capture-tile-px',
        '64',
        '--compare',
        outPath,
        '--comparison-mode',
        'acceptance',
        '--simulate',
      ]);
      await expect(
        runScreenshotProbe(changedPngConfig, {
          candidates: [{ id: 'fixture-all-classes', state: everyClassState() }],
          snapshotService: new FakeSnapshotService('c'.repeat(64)),
        }),
      ).rejects.toThrow('Acceptance comparison requires identical capture');
      expect(service.closed).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
