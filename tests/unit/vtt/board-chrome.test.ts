import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { combatantId, worldObjectId } from '../../../src/combat/values';
import { projectDmView } from '../../../src/combat/visibility';
import { GLYPH_HEIGHT, LINE_GAP, PIXEL_FONT_GLYPHS, normalizeLabelText } from '../../../src/assets/pixel-font';
import {
  BOARD_BORDER_PX,
  CHROME_TILE_PX,
  COORDINATE_CONVENTION,
  COORDINATE_GUTTER_PX,
  HP_BANDS,
  LEGEND_GAP_PX,
  LEGEND_HEIGHT_PX,
  NAMEPLATE_SINGLE_LINE_CHARACTER_LIMIT,
  NAMEPLATE_TEXT_SCALE,
  STEM_INK_HEX,
  STEM_MIN_PX,
  STEM_OUTLINE_HEX,
  CREATURE_LABEL_STYLE,
  OBJECT_LABEL_STYLE,
  boardChromeDimensions,
  hpBandOf,
  legendEntriesFor,
  lightLegendEntries,
  nameplateSize,
  stackLabelOffsets,
  type NameplateLayout,
  type BoardLabelStyle,
} from '../../../src/vtt/board-chrome';
import { BOARD_GLYPH_MODES } from '../../../src/assets/board-glyphs';
import { LIGHT_LEVELS } from '../../../src/assets/light-encoding';
import { projectEncounterBoard, type BoardGlyphPresence, type EncounterBoardProjectionShape } from '../../../src/vtt/encounter-board';
import { renderBoard } from '../../../src/vtt/encounter-app';
import { hitPointKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { installInteractiveDocument, interactiveElement, type InteractiveTestElement } from '../../fixtures/interactive-dom';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface GeometryRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function overlaps(a: GeometryRect, b: GeometryRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function expectNoOverlap(plates: readonly NameplateLayout[]): void {
  for (let i = 0; i < plates.length; i += 1) {
    for (let j = i + 1; j < plates.length; j += 1) {
      expect(overlaps(plates[i]!, plates[j]!), `${plates[i]!.displayName} vs ${plates[j]!.displayName}`).toBe(false);
    }
  }
}

function expectInsideAnchorCell(plate: NameplateLayout): void {
  const left = plate.column * CHROME_TILE_PX;
  const top = plate.row * CHROME_TILE_PX;
  expect(plate.x, `${plate.displayName} left`).toBeGreaterThanOrEqual(left);
  expect(plate.x + plate.width, `${plate.displayName} right`).toBeLessThanOrEqual(left + CHROME_TILE_PX);
  expect(plate.y, `${plate.displayName} top`).toBeGreaterThanOrEqual(top);
  expect(plate.y + plate.height, `${plate.displayName} bottom`).toBeLessThanOrEqual(top + CHROME_TILE_PX);
}

describe('stackLabelOffsets never lets two nameplates overlap', () => {
  const bounds = { columns: 6, rows: 4 };

  it('keeps adjacent long-name plates wholly inside their own cells', () => {
    const plates = stackLabelOffsets([
      { id: combatantId('combatant:a'), displayName: 'Reference Fighter', column: 2, row: 1, tag: null },
      { id: combatantId('combatant:b'), displayName: 'Hobgoblin Warrior Captain', column: 2, row: 2, tag: null },
      { id: combatantId('combatant:c'), displayName: 'Sabertooth Tiger', column: 3, row: 1, tag: 'HIDDEN' },
      { id: combatantId('combatant:d'), displayName: 'Wolf', column: 1, row: 1, tag: null },
      { id: combatantId('combatant:e'), displayName: 'Goblin Warrior', column: 3, row: 2, tag: null },
    ], bounds);
    expect(plates).toHaveLength(5);
    expectNoOverlap(plates);
    for (const plate of plates) {
      expectInsideAnchorCell(plate);
      expect(plate.text.lines.join(' ')).toBe(normalizeLabelText(plate.displayName));
      expect(plate.anchorCell).toEqual({ column: plate.column, row: plate.row });
      expect(plate.placement).toBe('inside-token-cell');
      expect(Math.hypot(
        plate.stem.token.x - plate.stem.plate.x,
        plate.stem.token.y - plate.stem.plate.y,
      )).toBeGreaterThanOrEqual(STEM_MIN_PX);
      expect(plate.stem.token.x).toBeGreaterThan(plate.column * CHROME_TILE_PX);
      expect(plate.stem.token.x).toBeLessThan((plate.column + 1) * CHROME_TILE_PX);
      expect(plate.stem.token.y).toBeGreaterThan(plate.row * CHROME_TILE_PX);
      expect(plate.stem.token.y).toBeLessThan((plate.row + 1) * CHROME_TILE_PX);
    }
    const tiger = plates.find((plate) => plate.displayName === 'Sabertooth Tiger');
    // A HIDDEN tag adds one compact text line, and the contained placement accounts for it.
    const untagged = nameplateSize('Sabertooth Tiger', null);
    const tagged = nameplateSize('Sabertooth Tiger', 'HIDDEN');
    expect(tagged.height).toBe(untagged.height + (LINE_GAP + GLYPH_HEIGHT) * NAMEPLATE_TEXT_SCALE);
    expect(tagged.width).toBe(untagged.width);
    expect(tiger?.height).toBe(tagged.height);
    expect(nameplateSize('Ox', 'HIDDEN').width).toBeGreaterThan(nameplateSize('Ox', null).width);
  });

  it('is a pure function of the input regardless of request order', () => {
    const requests = [
      { id: combatantId('combatant:x'), displayName: 'Ancient Red Dragon', column: 0, row: 0, tag: null },
      { id: combatantId('combatant:y'), displayName: 'Ancient Blue Dragon', column: 1, row: 0, tag: null },
      { id: combatantId('combatant:z'), displayName: 'Kobold', column: 0, row: 1, tag: null },
    ];
    const forward = stackLabelOffsets(requests, bounds);
    const reversed = stackLabelOffsets([...requests].reverse(), bounds);
    expect(reversed).toEqual(forward);
    expectNoOverlap(forward);
  });

  it('contains an exceptionally long plate without dropping any name glyphs', () => {
    const [plate] = stackLabelOffsets([
      { id: combatantId('combatant:long'), displayName: 'The Extraordinarily Long Named Abomination', column: 0, row: 0, tag: null },
    ], { columns: 2, rows: 1 });
    if (plate === undefined) throw new Error('Long-name plate was not laid out.');
    expectInsideAnchorCell(plate);
    expect(plate?.text.lines.join(' ')).toBe('THE EXTRAORDINARILY LONG NAMED ABOMINATION');
  });

  it('keeps names on one line through the stated character limit and wraps only beyond it', () => {
    const atLimit = 'A'.repeat(NAMEPLATE_SINGLE_LINE_CHARACTER_LIMIT);
    const beyondLimit = `${atLimit} B`;
    expect(nameplateSize(atLimit, null).text.lines).toHaveLength(1);
    expect(nameplateSize(beyondLimit, null).text.lines).toHaveLength(2);
  });

  it('anchors every plate and stem to its token cell over 200 seeded random rosters', () => {
    let randomState = 0x5eed1234;
    const random = (): number => {
      randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
      return randomState / 4_294_967_296;
    };
    for (let sample = 0; sample < 200; sample += 1) {
      const bounds = {
        columns: 3 + Math.floor(random() * 7),
        rows: 2 + Math.floor(random() * 6),
      };
      const cellCount = bounds.columns * bounds.rows;
      const rosterSize = 1 + Math.floor(random() * Math.min(10, cellCount));
      const cells = Array.from({ length: cellCount }, (_, index) => index);
      for (let index = cells.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [cells[index], cells[swap]] = [cells[swap]!, cells[index]!];
      }
      const requests = cells.slice(0, rosterSize).map((cell, index) => ({
        id: combatantId(`combatant:random-${String(sample)}-${String(index)}`),
        displayName: index % 3 === 0 ? `Long Random Creature ${String(sample)} ${String(index)}` : `Foe ${String(index)}`,
        column: cell % bounds.columns,
        row: Math.floor(cell / bounds.columns),
        tag: index % 5 === 0 ? 'HIDDEN' as const : null,
      }));
      const plates = stackLabelOffsets(requests, bounds);
      expectNoOverlap(plates);
      for (const plate of plates) {
        const request = requests.find((entry) => entry.id === plate.id);
        expect(request).toBeDefined();
        expect(plate.anchorCell).toEqual({ column: request?.column, row: request?.row });
        expect(plate.stem.token.x).toBeGreaterThan(plate.anchorCell.column * CHROME_TILE_PX);
        expect(plate.stem.token.x).toBeLessThan((plate.anchorCell.column + 1) * CHROME_TILE_PX);
        expect(plate.stem.token.y).toBeGreaterThan(plate.anchorCell.row * CHROME_TILE_PX);
        expect(plate.stem.token.y).toBeLessThan((plate.anchorCell.row + 1) * CHROME_TILE_PX);
        expectInsideAnchorCell(plate);
        expect(Math.hypot(
          plate.stem.token.x - plate.stem.plate.x,
          plate.stem.token.y - plate.stem.plate.y,
        )).toBeGreaterThanOrEqual(STEM_MIN_PX);
      }
    }
  });
});

describe('HP band parity with the prose classifier', () => {
  function encounterAt(hitPoints: readonly number[]): EncounterState {
    const mover = playerProfile('chrome-pc', { hitPoints: 20, initiativeBonus: 20 });
    const foe = monsterProfile('chrome-foe', { hitPoints: 20, initiativeBonus: -20 });
    const initial = createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [mover, foe],
      tokens: [placedToken(mover, 1, 1), placedToken(foe, 4, 1)],
    });
    const rolled = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
    return {
      ...rolled,
      combatants: rolled.combatants.map((combatant, index) => ({ ...combatant, hitPoints: hitPoints[index] ?? combatant.hitPoints })),
    };
  }

  it('carries actor-knowledge bands onto the DM board and maps them to the four bar bands', () => {
    for (const [pc, foe, expectedPc, expectedFoe] of [
      [20, 20, 'uninjured', 'uninjured'],
      [19, 10, 'bloodied', 'bloodied'],
      [5, 6, 'near_death', 'bloodied'],
      [1, 5, 'near_death', 'near_death'],
    ] as const) {
      const state = encounterAt([pc, foe]);
      const board = projectEncounterBoard(projectDmView(state));
      for (const [index, expected] of [expectedPc, expectedFoe].entries()) {
        const subject = state.combatants[index]!;
        const projected = board.combatants.find((combatant) => combatant.id === subject.profile.id);
        expect(projected?.hitPointBand).toEqual(hitPointKnowledge(state, subject));
        expect(hpBandOf(projected?.hitPointBand)).toBe(expected);
      }
    }
    expect(hpBandOf(undefined)).toBe('unknown');
    expect(hpBandOf({ kind: 'unknown' })).toBe('unknown');
    expect(HP_BANDS).toEqual(['uninjured', 'bloodied', 'near_death', 'unknown']);
  });
});

interface Serialized {
  readonly tag: string;
  readonly className: string;
  readonly attributes: readonly (readonly [string, string])[];
  readonly text: string | null;
  readonly src: string | null;
  readonly style: readonly (readonly [string, string])[];
  readonly children: readonly Serialized[];
}

type StyledElement = InteractiveTestElement & {
  src?: string;
  style?: { readonly declarations: Map<string, string>; setProperty(name: string, value: string): void };
};

function serialize(node: InteractiveTestElement): Serialized {
  const styled = node as StyledElement;
  return {
    tag: node.tagName,
    className: node.className,
    attributes: [...node.attributes.entries()].sort(([a], [b]) => a.localeCompare(b)),
    text: node.textContent,
    src: styled.src ?? null,
    style: [...(styled.style?.declarations.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b)),
    children: node.children.map(serialize),
  };
}

const CHROME_CLASSES = new Set(['encounter-coordinate-labels', 'encounter-token-chrome', 'encounter-legend']);
const NOTHING_PRESENT: BoardGlyphPresence = { cells: [], hidden: false };
const EVERYTHING_PRESENT: BoardGlyphPresence = { cells: ['door-closed', 'door-open', 'blocked', 'fog', 'obscured'], hidden: true };

function withoutChrome(node: Serialized): Serialized {
  return { ...node, children: node.children.filter((child) => !CHROME_CLASSES.has(child.className)) };
}

function fullNameRectCount(name: string): number {
  return Array.from(normalizeLabelText(name)).reduce((total, character) => {
    const rows = PIXEL_FONT_GLYPHS.get(character) ?? PIXEL_FONT_GLYPHS.get('?') ?? [];
    return total + rows.reduce((runs, row) => runs + (row.match(/#+/gu)?.length ?? 0), 0);
  }, 0);
}

function rectCountOf(dataUri: string): number {
  return decodeURIComponent(dataUri.slice('data:image/svg+xml;charset=utf-8,'.length)).split('<rect ').length - 1;
}

function inlinePixels(node: InteractiveTestElement, property: string): number {
  const match = node.getAttribute('style')?.match(new RegExp(`(?:^|;)${property}:(-?[0-9.]+)px(?:;|$)`, 'u'));
  if (match?.[1] === undefined) throw new Error(`${node.className} has no ${property} pixel style.`);
  return Number(match[1]);
}

function numericData(node: InteractiveTestElement, attribute: string): number {
  const value = node.getAttribute(attribute);
  if (value === null) throw new Error(`${node.className} has no ${attribute}.`);
  return Number(value);
}

function pointInside(point: { readonly x: number; readonly y: number }, rect: GeometryRect): boolean {
  return point.x > rect.x && point.x < rect.x + rect.width && point.y > rect.y && point.y < rect.y + rect.height;
}

function segmentCrossesRect(
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
  rect: GeometryRect,
): boolean {
  if (pointInside(start, rect) || pointInside(end, rect)) return true;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let enter = 0;
  let exit = 1;
  for (const [p, q] of [
    [-dx, start.x - rect.x],
    [dx, rect.x + rect.width - start.x],
    [-dy, start.y - rect.y],
    [dy, rect.y + rect.height - start.y],
  ] as const) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) enter = Math.max(enter, ratio);
    else exit = Math.min(exit, ratio);
  }
  return enter < exit && exit > 0 && enter < 1;
}

describe('renderBoard: DM board with chrome, player board without', () => {
  let restoreDocument: () => void;
  let restoreCreate: () => void;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
    const original = document.createElement.bind(document);
    const patched = ((tag: string) => {
      const node = original(tag) as unknown as StyledElement;
      const declarations = new Map<string, string>();
      Object.defineProperty(node, 'style', {
        value: { declarations, setProperty: (name: string, value: string) => { declarations.set(name, value); } },
      });
      return node as unknown as HTMLElement;
    }) as typeof document.createElement;
    Object.defineProperty(document, 'createElement', { configurable: true, value: patched });
    restoreCreate = () => { Object.defineProperty(document, 'createElement', { configurable: true, value: original }); };
  });

  afterEach(() => {
    restoreCreate();
    restoreDocument();
  });

  const projection: EncounterBoardProjectionShape = {
    bounds: { columns: 10, rows: 7 },
    combatants: [
      { id: combatantId('combatant:fighter'), name: 'Reference Fighter', kind: 'player_character', position: { column: 2, row: 3 }, life: 'living', hitPointBand: { kind: 'perceived_band', band: 'uninjured' } },
      { id: combatantId('combatant:cleric'), name: 'Reference Cleric', kind: 'player_character', position: { column: 2, row: 4 }, life: 'dying', hitPointBand: { kind: 'perceived_band', band: 'near_death' } },
      { id: combatantId('combatant:wizard'), name: 'Reference Wizard', kind: 'player_character', position: { column: 1, row: 2 }, life: 'living', hitPointBand: { kind: 'perceived_band', band: 'bloodied' } },
      { id: combatantId('combatant:training-brute'), name: 'Training Brute', kind: 'monster', position: { column: 6, row: 3 }, life: 'living', hitPointBand: { kind: 'unknown' }, hiddenFromPlayers: true },
    ],
    highlightedCombatant: combatantId('combatant:fighter'),
    adjudicatedTargets: [],
    worldObjects: [{
      id: worldObjectId('world-object:runed-brazier'),
      name: 'Runed Brazier',
      kind: 'generic',
      position: { column: 4, row: 1 },
      cells: [{ column: 4, row: 1 }],
      blocking: { movement: false, lineOfSight: false, cover: 'none' },
      lightClass: 'light-source',
    }],
  };
  const provenance = { revision: 3, round: 1, stateDigest: 'digest-under-test' };

  it('draws every full display name, coordinates, HP bands and a legend on the DM board only', () => {
    const dm = interactiveElement(renderBoard(projection, new Set(), null, provenance));
    expect(dm.getAttribute('data-board-chrome')).toBe('on');
    expect(dm.getAttribute('data-coordinate-labels')).toBe(COORDINATE_CONVENTION);

    const plates = dm.querySelectorAll('.encounter-nameplate');
    expect(plates).toHaveLength(projection.combatants.length);
    for (const combatant of projection.combatants) {
      const plate = plates.find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(plate?.getAttribute('data-display-name')).toBe(combatant.name);
      expect(plate?.getAttribute('data-label-style')).toBe(CREATURE_LABEL_STYLE);
      expect(plate?.getAttribute('data-anchor-column')).toBe(String(combatant.position.column));
      expect(plate?.getAttribute('data-anchor-row')).toBe(String(combatant.position.row));
      const text = plate?.querySelector('.encounter-nameplate-text') as StyledElement | null;
      expect(text?.src, combatant.name).toBeDefined();
      expect(rectCountOf(text?.src ?? ''), `${combatant.name} is drawn in full`).toBe(fullNameRectCount(combatant.name));
      const bar = dm.querySelectorAll('.encounter-hp-bar').find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(bar?.getAttribute('data-hp-band')).toBe(hpBandOf(combatant.hitPointBand));
      const glyph = dm.querySelectorAll('.encounter-life-glyph').find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(glyph?.getAttribute('data-life')).toBe(combatant.life);
    }
    expect(dm.querySelectorAll('.encounter-hidden-ring').map((ring) => ring.getAttribute('data-combatant-id'))).toEqual(['combatant:training-brute']);
    expect(dm.querySelectorAll('.encounter-nameplate-stem')).toHaveLength(projection.combatants.length);

    const labels = dm.querySelector('[data-coordinate-labels]');
    expect(labels?.querySelectorAll('[data-axis="column"]')).toHaveLength(projection.bounds.columns * 2);
    expect(labels?.querySelectorAll('[data-axis="row"]')).toHaveLength(projection.bounds.rows * 2);
    // The reference room names no light region, so every cell is bright and the default mode is 'none'.
    const legend = dm.querySelector('[data-legend]');
    // D525: the band is a minimum so a narrow board's rows are never clipped.
    expect(legend?.getAttribute('style')).toContain(`min-height:${String(LEGEND_HEIGHT_PX)}px`);
    expect(legend?.getAttribute('style')).not.toMatch(/(?:^|;)height:/u);
    expect(legend?.getAttribute('data-board-glyphs')).toBe('none');
    expect(legend?.getAttribute('data-room-default-light')).toBe('bright');
    const noneEntries = legendEntriesFor('none', 'bright', NOTHING_PRESENT);
    expect(legend?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key'))).toEqual(noneEntries.map((entry) => entry.key));
    for (const band of HP_BANDS) expect(noneEntries.some((entry) => entry.key === `hp-${band.replaceAll('_', '-')}`)).toBe(true);
    expect(noneEntries.map((entry) => entry.label)).toContain('Bright light');
    // under 'none' no plate carries a tag and no eye-slash mark is drawn, hidden creature or not
    expect(dm.querySelectorAll('.encounter-nameplate-tag')).toHaveLength(0);
    expect(dm.querySelectorAll('.encounter-hidden-glyph')).toHaveLength(0);
    expect(dm.querySelectorAll('.encounter-nameplate').every((plate) => plate.getAttribute('data-tag') === null)).toBe(true);
  });

  it('moves snapshot object labels to an unclipped pixel-tag rail with the legend OBJECT sigil', () => {
    const styles: readonly BoardLabelStyle[] = [CREATURE_LABEL_STYLE, OBJECT_LABEL_STYLE];
    expect(new Set(styles).size).toBe(2);
    const liveDm = interactiveElement(renderBoard(projection, new Set(), null, provenance));
    const liveObjectLabel = liveDm.querySelector('.encounter-world-object-label');
    expect(liveObjectLabel?.getAttribute('data-label-style')).toBe(OBJECT_LABEL_STYLE);

    const snapshotDm = interactiveElement(renderBoard(projection, new Set(), null, provenance, 'full', true));
    const creaturePlate = snapshotDm.querySelector('.encounter-nameplate');
    const objectTag = snapshotDm.querySelector('.encounter-object-tag');
    const objectSigil = objectTag?.querySelector('.encounter-object-tag-sigil') as StyledElement | null;
    const legendSigil = snapshotDm.querySelector('[data-legend-key="object"]')
      ?.querySelector('.encounter-legend-swatch-mark') as StyledElement | null;
    const objectText = objectTag?.querySelector('.encounter-object-tag-text');
    expect(snapshotDm.querySelector('.encounter-world-object-label')).toBeNull();
    expect(objectTag?.getAttribute('data-label-style')).toBe(OBJECT_LABEL_STYLE);
    expect(objectTag?.getAttribute('data-anchor-column')).toBe('4');
    expect(objectTag?.getAttribute('data-anchor-row')).toBe('1');
    expect(objectText?.getAttribute('data-full-label')).toBe('Runed Brazier (4,1)');
    expect(objectSigil?.src).toBe(legendSigil?.src);
    expect(objectTag?.parentElement?.className).toBe('encounter-object-tag-rail');
    expect(creaturePlate?.getAttribute('data-label-style')).toBe(CREATURE_LABEL_STYLE);
    expect(objectTag?.getAttribute('data-label-style')).not.toBe(creaturePlate?.getAttribute('data-label-style'));
  });

  it('renders 200 seeded rosters with outlined stems under every plate and no cross-cell plate coverage', () => {
    let randomState = 0x5eed1234;
    const random = (): number => {
      randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
      return randomState / 4_294_967_296;
    };
    for (let sample = 0; sample < 200; sample += 1) {
      const bounds = { columns: 3 + Math.floor(random() * 7), rows: 2 + Math.floor(random() * 6) };
      const cellCount = bounds.columns * bounds.rows;
      const rosterSize = 1 + Math.floor(random() * Math.min(10, cellCount));
      const cells = Array.from({ length: cellCount }, (_, index) => index);
      for (let index = cells.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [cells[index], cells[swap]] = [cells[swap]!, cells[index]!];
      }
      const combatants = cells.slice(0, rosterSize).map((cell, index) => ({
        id: combatantId(`combatant:rendered-${String(sample)}-${String(index)}`),
        name: index % 3 === 0 ? `Long Rendered Creature ${String(sample)} ${String(index)}` : `Foe ${String(index)}`,
        kind: 'monster' as const,
        position: { column: cell % bounds.columns, row: Math.floor(cell / bounds.columns) },
        life: 'living' as const,
        hitPointBand: { kind: 'unknown' as const },
        hiddenFromPlayers: index % 5 === 0,
      }));
      const board = interactiveElement(renderBoard({
        bounds,
        combatants,
        highlightedCombatant: null,
        adjudicatedTargets: [],
        worldObjects: [],
      }, new Set(), null, provenance, 'full', true));
      const chrome = board.querySelector('.encounter-token-chrome');
      if (chrome === null) throw new Error('Rendered board has no token chrome.');
      const leaders = chrome.querySelector('.encounter-nameplate-leaders');
      const plateLayer = chrome.querySelector('.encounter-nameplate-plates');
      if (leaders === null || plateLayer === null) throw new Error('Rendered chrome lost its plate layers.');
      expect(chrome.children.indexOf(leaders), `sample ${String(sample)} leader layer`).toBeLessThan(chrome.children.indexOf(plateLayer));
      const plates = plateLayer.querySelectorAll('.encounter-nameplate');
      const stems = leaders.querySelectorAll('.encounter-nameplate-stem');
      expect(plates).toHaveLength(combatants.length);
      expect(stems).toHaveLength(combatants.length);
      const plateRects = new Map(plates.map((plate) => [plate.getAttribute('data-combatant-id'), {
        x: inlinePixels(plate, 'left'),
        y: inlinePixels(plate, 'top'),
        width: inlinePixels(plate, 'width'),
        height: inlinePixels(plate, 'height'),
      }] as const));
      for (const plate of plates) {
        const id = plate.getAttribute('data-combatant-id');
        const rect = plateRects.get(id);
        if (id === null || rect === undefined) throw new Error('Rendered plate has no geometry identity.');
        const column = numericData(plate, 'data-anchor-column');
        const row = numericData(plate, 'data-anchor-row');
        const cellRect = {
          x: COORDINATE_GUTTER_PX + column * CHROME_TILE_PX,
          y: COORDINATE_GUTTER_PX + row * CHROME_TILE_PX,
          width: CHROME_TILE_PX,
          height: CHROME_TILE_PX,
        };
        expect(rect.x).toBeGreaterThanOrEqual(cellRect.x);
        expect(rect.y).toBeGreaterThanOrEqual(cellRect.y);
        expect(rect.x + rect.width).toBeLessThanOrEqual(cellRect.x + cellRect.width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(cellRect.y + cellRect.height);
        for (let otherRow = 0; otherRow < bounds.rows; otherRow += 1) {
          for (let otherColumn = 0; otherColumn < bounds.columns; otherColumn += 1) {
            if (otherColumn === column && otherRow === row) continue;
            const otherCell = {
              x: COORDINATE_GUTTER_PX + otherColumn * CHROME_TILE_PX,
              y: COORDINATE_GUTTER_PX + otherRow * CHROME_TILE_PX,
              width: CHROME_TILE_PX,
              height: CHROME_TILE_PX,
            };
            expect(overlaps(rect, otherCell), `${id} covers cell ${String(otherColumn)},${String(otherRow)}`).toBe(false);
          }
        }
      }
      for (const stem of stems) {
        const id = stem.getAttribute('data-combatant-id');
        const anchor = combatants.find((combatant) => combatant.id === id)?.position;
        if (id === null || anchor === undefined) throw new Error('Rendered stem has no anchor combatant.');
        const start = {
          x: COORDINATE_GUTTER_PX + numericData(stem, 'data-plate-x'),
          y: COORDINATE_GUTTER_PX + numericData(stem, 'data-plate-y'),
        };
        const end = {
          x: COORDINATE_GUTTER_PX + numericData(stem, 'data-token-x'),
          y: COORDINATE_GUTTER_PX + numericData(stem, 'data-token-y'),
        };
        expect(inlinePixels(stem, 'width'), `${id} rendered length`).toBeGreaterThanOrEqual(STEM_MIN_PX);
        expect(stem.getAttribute('style')).toContain(`background:${STEM_INK_HEX}`);
        expect(stem.getAttribute('style')).toContain(`box-shadow:0 0 0 1px ${STEM_OUTLINE_HEX}`);
        expect(end.x).toBeGreaterThan(COORDINATE_GUTTER_PX + anchor.column * CHROME_TILE_PX);
        expect(end.x).toBeLessThan(COORDINATE_GUTTER_PX + (anchor.column + 1) * CHROME_TILE_PX);
        expect(end.y).toBeGreaterThan(COORDINATE_GUTTER_PX + anchor.row * CHROME_TILE_PX);
        expect(end.y).toBeLessThan(COORDINATE_GUTTER_PX + (anchor.row + 1) * CHROME_TILE_PX);
        for (const [otherId, rect] of plateRects) {
          if (otherId === id) continue;
          expect(segmentCrossesRect(start, end, rect), `${id} stem crosses ${otherId ?? '<unknown>'}`).toBe(false);
        }
      }
    }
  });

  it("D525: 'none' and 'light' keep the D516 rows and swap only the light rows; the glyph modes add the room default", () => {
    for (const mode of ['none', 'light'] as const) {
      for (const roomDefault of LIGHT_LEVELS) {
        // presence never matters outside 'full'
        for (const presence of [NOTHING_PRESENT, EVERYTHING_PRESENT]) {
          const entries = legendEntriesFor(mode, roomDefault, presence);
          const lightRows = lightLegendEntries(mode, roomDefault);
          const keys = entries.map((entry) => entry.key);
          expect(new Set(keys).size, `${mode}/${roomDefault} keys are unique`).toBe(keys.length);
          expect(keys.slice(0, 5)).toEqual(['side-party', 'side-foe', 'hidden', 'difficult', 'obscured']);
          expect(keys.slice(5, 5 + lightRows.length)).toEqual(lightRows.map((entry) => entry.key));
          expect(keys.slice(5 + lightRows.length)).toEqual(['fog', 'blocked', 'object', 'light-source', 'hp-uninjured', 'hp-bloodied', 'hp-near-death', 'hp-unknown']);
          expect(lightRows.map((entry) => entry.key).slice(0, 3)).toEqual(['bright', 'dim', 'darkness']);
        }
      }
    }
    expect(lightLegendEntries('none', 'bright').map((entry) => [entry.style, entry.label])).toEqual([
      ['tint', 'Bright light'],
      ['tint', 'Dim light'],
      ['tint', 'Darkness'],
    ]);
    for (const mode of ['light', 'full'] as const) {
      expect(lightLegendEntries(mode, 'darkness').map((entry) => [entry.style, entry.label])).toEqual([
        ['mark', 'BRIGHT'],
        ['mark', 'DIM'],
        ['mark', 'DARK'],
        ['art', 'No glyph = DARK'],
      ]);
      expect(lightLegendEntries(mode, 'dim').at(-1)?.label).toBe('No glyph = DIM');
    }
    // 'none' has no room-default row: the tints name every level whatever the majority.
    expect(lightLegendEntries('none', 'darkness')).toEqual(lightLegendEntries('none', 'bright'));
    expect(BOARD_GLYPH_MODES).toEqual(['none', 'light', 'full']);
  });

  it('leaves the player board byte-identical to the DM board minus its chrome', () => {
    const player = serialize(interactiveElement(renderBoard(projection)));
    const dm = serialize(interactiveElement(renderBoard(projection, new Set(), null, provenance)));
    expect(player.children.some((child) => CHROME_CLASSES.has(child.className))).toBe(false);
    expect(player.attributes.some(([name]) => name === 'data-board-chrome')).toBe(false);
    const dmWithoutChrome = withoutChrome({
      ...dm,
      attributes: dm.attributes.filter(([name]) => !['data-board-chrome', 'data-coordinate-labels', 'data-encounter-rows', 'data-source-revision', 'data-source-round', 'data-source-state-digest'].includes(name) && name !== 'data-board-audience'),
      style: dm.style.filter(([name]) => name !== '--encounter-rows'),
    });
    const playerComparable = { ...player, attributes: player.attributes.filter(([name]) => name !== 'data-board-audience') };
    expect(JSON.stringify(dmWithoutChrome)).toBe(JSON.stringify(playerComparable));
    expect(player.children.every((child) => child.className === 'encounter-cell')).toBe(true);
    expect(player.children).toHaveLength(projection.bounds.columns * projection.bounds.rows);
  });

  it('states the captured board size from the bounds alone', () => {
    expect(boardChromeDimensions({ columns: 17, rows: 13 })).toEqual({ width: 1140, height: 1012 });
    expect(boardChromeDimensions({ columns: 24, rows: 15 })).toEqual({ width: 1588, height: 1140 });
    expect(boardChromeDimensions({ columns: 1, rows: 1 })).toEqual({
      width: 2 * BOARD_BORDER_PX + 2 * COORDINATE_GUTTER_PX + CHROME_TILE_PX,
      height: 2 * BOARD_BORDER_PX + 2 * COORDINATE_GUTTER_PX + CHROME_TILE_PX + LEGEND_GAP_PX + LEGEND_HEIGHT_PX,
    });
  });
});
