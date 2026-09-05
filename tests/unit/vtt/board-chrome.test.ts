import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { combatantId } from '../../../src/combat/values';
import { projectDmView } from '../../../src/combat/visibility';
import { GLYPH_HEIGHT, LINE_GAP, PIXEL_FONT_GLYPHS, normalizeLabelText } from '../../../src/assets/pixel-font';
import {
  BOARD_BORDER_PX,
  CHROME_TEXT_SCALE,
  CHROME_TILE_PX,
  COORDINATE_CONVENTION,
  COORDINATE_GUTTER_PX,
  HP_BANDS,
  LEGEND_GAP_PX,
  LEGEND_HEIGHT_PX,
  boardChromeDimensions,
  hpBandOf,
  legendEntriesFor,
  lightLegendEntries,
  nameplateSize,
  portraitBox,
  stackLabelOffsets,
  type NameplateLayout,
} from '../../../src/vtt/board-chrome';
import { BOARD_GLYPH_MODES } from '../../../src/assets/board-glyphs';
import { LIGHT_LEVELS } from '../../../src/assets/light-encoding';
import { projectEncounterBoard, type BoardGlyphPresence, type EncounterBoardProjectionShape } from '../../../src/vtt/encounter-board';
import { renderBoard } from '../../../src/vtt/encounter-app';
import { hitPointKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { installInteractiveDocument, interactiveElement, type InteractiveTestElement } from '../../fixtures/interactive-dom';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function overlaps(a: NameplateLayout, b: NameplateLayout): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function expectNoOverlap(plates: readonly NameplateLayout[]): void {
  for (let i = 0; i < plates.length; i += 1) {
    for (let j = i + 1; j < plates.length; j += 1) {
      expect(overlaps(plates[i]!, plates[j]!), `${plates[i]!.displayName} vs ${plates[j]!.displayName}`).toBe(false);
    }
    for (const other of plates) {
      if (other.id === plates[i]!.id) continue;
      const portrait = portraitBox(other);
      expect(
        overlaps(plates[i]!, { ...portrait, id: other.id, displayName: other.displayName, column: other.column, row: other.row, text: other.text, tag: other.tag }),
        `${plates[i]!.displayName} covers ${other.displayName}'s portrait`,
      ).toBe(false);
    }
  }
}

describe('stackLabelOffsets never lets two nameplates overlap', () => {
  const bounds = { columns: 6, rows: 4 };

  it('stacks vertically adjacent tokens and horizontally adjacent long names', () => {
    const plates = stackLabelOffsets([
      { id: combatantId('combatant:a'), displayName: 'Reference Fighter', column: 2, row: 1, tag: null },
      { id: combatantId('combatant:b'), displayName: 'Hobgoblin Warrior Captain', column: 2, row: 2, tag: null },
      { id: combatantId('combatant:c'), displayName: 'Sabertooth Tiger', column: 3, row: 1, tag: 'HIDDEN' },
      { id: combatantId('combatant:d'), displayName: 'Wolf', column: 1, row: 1, tag: null },
      { id: combatantId('combatant:e'), displayName: 'Goblin Warrior', column: 3, row: 2, tag: null },
    ], bounds);
    expect(plates).toHaveLength(5);
    expectNoOverlap(plates);
    const occupied = new Set(plates.map((plate) => `${String(plate.column)},${String(plate.row)}`));
    for (const plate of plates) {
      expect(plate.x).toBeGreaterThanOrEqual(0);
      expect(plate.x + plate.width).toBeLessThanOrEqual(bounds.columns * CHROME_TILE_PX);
      if (occupied.has(`${String(plate.column)},${String(plate.row + 1)}`)) {
        // a token directly below: the name goes above its own portrait, never over the other token
        expect(plate.y + plate.height, plate.displayName).toBeLessThanOrEqual(plate.row * CHROME_TILE_PX + 1);
      } else {
        expect(plate.y, plate.displayName).toBeGreaterThanOrEqual((plate.row + 1) * CHROME_TILE_PX - 1);
      }
      expect(plate.text.lines.join(' ')).toBe(normalizeLabelText(plate.displayName));
    }
    const fighter = plates.find((plate) => plate.displayName === 'Reference Fighter');
    const tiger = plates.find((plate) => plate.displayName === 'Sabertooth Tiger');
    expect(fighter && fighter.y + fighter.height <= CHROME_TILE_PX * 1 + 1).toBe(true);
    expect(tiger && tiger.y + tiger.height <= CHROME_TILE_PX * 1 + 1).toBe(true);
    // D525: a HIDDEN tag adds one text line to the plate, and the placement accounts for it
    const untagged = nameplateSize('Sabertooth Tiger', null);
    const tagged = nameplateSize('Sabertooth Tiger', 'HIDDEN');
    expect(tagged.height).toBe(untagged.height + (LINE_GAP + GLYPH_HEIGHT) * CHROME_TEXT_SCALE);
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

  it('clamps a plate wider than its row into the grid instead of cutting the name', () => {
    const [plate] = stackLabelOffsets([
      { id: combatantId('combatant:long'), displayName: 'The Extraordinarily Long Named Abomination', column: 0, row: 0, tag: null },
    ], { columns: 2, rows: 1 });
    expect(plate?.x).toBe(0);
    expect(plate?.text.lines.join(' ')).toBe('THE EXTRAORDINARILY LONG NAMED ABOMINATION');
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
      const text = plate?.querySelector('.encounter-nameplate-text') as StyledElement | null;
      expect(text?.src, combatant.name).toBeDefined();
      expect(rectCountOf(text?.src ?? ''), `${combatant.name} is drawn in full`).toBe(fullNameRectCount(combatant.name));
      const bar = dm.querySelectorAll('.encounter-hp-bar').find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(bar?.getAttribute('data-hp-band')).toBe(hpBandOf(combatant.hitPointBand));
      const glyph = dm.querySelectorAll('.encounter-life-glyph').find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(glyph?.getAttribute('data-life')).toBe(combatant.life);
    }
    expect(dm.querySelectorAll('.encounter-hidden-ring').map((ring) => ring.getAttribute('data-combatant-id'))).toEqual(['combatant:training-brute']);

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
