import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { combatantId, worldObjectId } from '../../../src/combat/values';
import { projectDmView } from '../../../src/combat/visibility';
import { layoutPixelText, normalizeLabelText, renderPixelText } from '../../../src/assets/pixel-font';
import {
  BOARD_CHROME_ART_SCALE,
  renderCreatureBadgeBitmap,
} from '../../../src/assets/board-chrome-art';
import {
  NEUTRAL_STEPS,
  PALETTE_RAMPS,
  RAMP_STEPS,
  neutral,
  paletteHex,
  paletteHsl,
  paletteRgb,
  ramp,
  type PaletteColorRef,
} from '../../../src/assets/palette';
import {
  BOARD_BORDER_PX,
  CHROME_TILE_PX,
  COORDINATE_CONVENTION,
  COORDINATE_GUTTER_PX,
  HP_BANDS,
  HP_BAR_HEIGHT_PX,
  HP_BAR_BORDER_PX,
  HP_BAR_TOP_PX,
  HP_BAR_WIDTH_PX,
  LEGEND_GAP_PX,
  LEGEND_HEIGHT_PX,
  CREATURE_BADGE_COLORS,
  CREATURE_BADGE_HEIGHT_PX,
  CREATURE_BADGE_LEFT_PX,
  CREATURE_BADGE_STACK_PITCH_PX,
  CREATURE_BADGE_TOP_PX,
  CREATURE_BADGE_WIDTH_PX,
  BADGE_SIDE_HUES,
  CREATURE_BADGE_HUE_EXCLUSION_DEGREES,
  CREATURE_LABEL_STYLE,
  DOOR_LABEL_STYLE,
  OBJECT_LABEL_STYLE,
  assignCreatureBadges,
  boardRailEntries,
  boardChromeDimensions,
  hpBandOf,
  layoutRosterName,
  legendHeightPx,
  legendEntriesFor,
  lightLegendEntries,
  type BoardLabelStyle,
} from '../../../src/vtt/board-chrome';
import { BOARD_GLYPH_MODES, CELL_GLYPH_KINDS, CELL_GLYPH_SIZE, cellGlyphOrigin } from '../../../src/assets/board-glyphs';
import { LIGHT_LEVELS } from '../../../src/assets/light-encoding';
import { LIGHT_GLYPH_ORIGIN, LIGHT_GLYPH_SIZE } from '../../../src/assets/light-glyphs';
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

describe('D533 creature badge and roster types', () => {
  const roster = [
    { id: combatantId('combatant:a'), name: 'Reference Fighter', kind: 'player_character' as const, position: { column: 2, row: 1 } },
    { id: combatantId('combatant:b'), name: 'Chronomancy Abomination', kind: 'monster' as const, position: { column: 2, row: 1 } },
  ];

  it('assigns unique closed-palette colours and numbers in stable roster order, including a shared cell', () => {
    const badges = assignCreatureBadges(roster);
    expect(badges.map((badge) => badge.number)).toEqual([1, 2]);
    expect(badges.map((badge) => badge.color)).toEqual(CREATURE_BADGE_COLORS.slice(0, 2));
    expect(badges.map((badge) => badge.stackIndex)).toEqual([0, 1]);
    expect(new Set(badges.map((badge) => badge.number)).size).toBe(badges.length);
    expect(new Set(badges.map((badge) => badge.color.id)).size).toBe(badges.length);
    expect(assignCreatureBadges(roster)).toEqual(badges);
  });

  const DICHROMACY_MATRICES = {
    protanopia: [
      [0.152286, 1.052583, -0.204868],
      [0.114503, 0.786281, 0.099216],
      [-0.003882, -0.048116, 1.051998],
    ],
    deuteranopia: [
      [0.367322, 0.860646, -0.227968],
      [0.280085, 0.672501, 0.047413],
      [-0.011820, 0.042940, 0.968881],
    ],
  } as const;

  function linearChannel(channel: number): number {
    const encoded = channel / 255;
    return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
  }

  function encodedChannel(channel: number): number {
    const linear = Math.min(1, Math.max(0, channel));
    return 255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055);
  }

  function simulatedRgb(
    color: PaletteColorRef,
    matrix: (typeof DICHROMACY_MATRICES)[keyof typeof DICHROMACY_MATRICES],
  ): readonly [number, number, number] {
    const rgb = paletteRgb(color);
    const source = [linearChannel(rgb.red), linearChannel(rgb.green), linearChannel(rgb.blue)] as const;
    const channel = (row: readonly [number, number, number]): number => encodedChannel(
      row[0] * source[0] + row[1] * source[1] + row[2] * source[2],
    );
    return [channel(matrix[0]), channel(matrix[1]), channel(matrix[2])];
  }

  function cieLab(rgb: readonly [number, number, number]): readonly [number, number, number] {
    const linear = rgb.map(linearChannel);
    const x = (0.4124564 * linear[0]! + 0.3575761 * linear[1]! + 0.1804375 * linear[2]!) / 0.95047;
    const y = 0.2126729 * linear[0]! + 0.7151522 * linear[1]! + 0.0721750 * linear[2]!;
    const z = (0.0193339 * linear[0]! + 0.1191920 * linear[1]! + 0.9503041 * linear[2]!) / 1.08883;
    const transform = (value: number): number => value > 216 / 24_389
      ? Math.cbrt(value)
      : ((24_389 / 27) * value + 16) / 116;
    return [116 * transform(y) - 16, 500 * (transform(x) - transform(y)), 200 * (transform(y) - transform(z))];
  }

  function deltaE(left: readonly [number, number, number], right: readonly [number, number, number]): number {
    return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
  }

  function relativeLuminance(color: PaletteColorRef): number {
    const rgb = paletteRgb(color);
    return 0.2126 * linearChannel(rgb.red) + 0.7152 * linearChannel(rgb.green) + 0.0722 * linearChannel(rgb.blue);
  }

  function contrastRatio(left: PaletteColorRef, right: PaletteColorRef): number {
    const luminances = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
    return (luminances[0]! + 0.05) / (luminances[1]! + 0.05);
  }

  function hueDistance(left: number, right: number): number {
    const distance = Math.abs(left - right);
    return Math.min(distance, 360 - distance);
  }

  it('keeps the closed palette outside both side-hue bands and pairwise distinct under standard dichromacy matrices', () => {
    expect(CREATURE_BADGE_COLORS).toHaveLength(12);
    expect(new Set(CREATURE_BADGE_COLORS.map((color) => paletteHex(color.disc))).size).toBe(CREATURE_BADGE_COLORS.length);
    for (const color of CREATURE_BADGE_COLORS) {
      const sourceRamp: string = color.disc.ramp;
      expect(['cloth-warm', 'cloth-cool'].includes(sourceRamp), color.id).toBe(false);
      const hsl = paletteHsl(color.disc);
      if (hsl.saturation > 15) {
        for (const sideHue of BADGE_SIDE_HUES) {
          expect(hueDistance(hsl.hue, sideHue), `${color.id} against side hue ${String(sideHue)}`)
            .toBeGreaterThanOrEqual(CREATURE_BADGE_HUE_EXCLUSION_DEGREES);
        }
      }
    }
    for (let left = 0; left < CREATURE_BADGE_COLORS.length; left += 1) {
      for (let right = left + 1; right < CREATURE_BADGE_COLORS.length; right += 1) {
        for (const [simulation, matrix] of Object.entries(DICHROMACY_MATRICES)) {
          const first = cieLab(simulatedRgb(CREATURE_BADGE_COLORS[left]!.disc, matrix));
          const second = cieLab(simulatedRgb(CREATURE_BADGE_COLORS[right]!.disc, matrix));
          expect(deltaE(first, second), `${simulation}: ${CREATURE_BADGE_COLORS[left]!.id}/${CREATURE_BADGE_COLORS[right]!.id}`)
            .toBeGreaterThanOrEqual(10);
        }
      }
    }
  });

  it('roster_numeral_low_contrast: gives every badge numeral at least 4.5:1 contrast against its disc', () => {
    for (const color of CREATURE_BADGE_COLORS) {
      expect(contrastRatio(color.disc, color.numeralInk), color.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('contains every 1..12 numeral bitmap inside the opaque badge with at least 2 CSS px clearance', () => {
    expect(BOARD_CHROME_ART_SCALE).toBe(2);
    for (let number = 1; number <= CREATURE_BADGE_COLORS.length; number += 1) {
      const color = CREATURE_BADGE_COLORS[number - 1]!;
      const art = renderCreatureBadgeBitmap(number, color.disc, color.numeralInk);
      expect(art.cssWidth).toBe(CREATURE_BADGE_WIDTH_PX);
      expect(art.cssHeight).toBe(CREATURE_BADGE_HEIGHT_PX);
      art.numeralRows.forEach((row, y) => Array.from(row).forEach((pixel, x) => {
        if (pixel !== '#') return;
        const badgeX = art.numeralOrigin.x + x;
        const badgeY = art.numeralOrigin.y + y;
        for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          expect(
            art.opaqueRows[badgeY + dy]?.[badgeX + dx],
            `badge ${String(number)} numeral pixel ${String(x)},${String(y)} clearance`,
          ).toBe('#');
        }
      }));
    }
  });

  it('wraps full 2x roster names without losing glyphs and hyphenates overlong words at a fixed count', () => {
    const layout = layoutRosterName('Chronomancysupercalifragilistic Hero');
    expect(layout.lines[0]).toBe('CHRONOMANCYSUPERC-');
    expect(layout.lines.every((line) => line.length <= 18)).toBe(true);
    const reconstructed = layout.lines.join(' ').replaceAll('- ', '').replaceAll(' ', '');
    expect(reconstructed).toBe(normalizeLabelText('Chronomancysupercalifragilistic Hero').replaceAll(' ', ''));
    const rendered = renderPixelText(layout, neutral(8), 2);
    expect(rendered.cssWidth).toBe(layout.width * 2);
    expect(rendered.cssHeight).toBe(layout.height * 2);
  });

  it('keeps both badge slots disjoint from every corner glyph box and the HP bar', () => {
    const badges = [0, 1].map((stackIndex): GeometryRect => ({
      x: CREATURE_BADGE_LEFT_PX,
      y: CREATURE_BADGE_TOP_PX + stackIndex * CREATURE_BADGE_STACK_PITCH_PX,
      width: CREATURE_BADGE_WIDTH_PX,
      height: CREATURE_BADGE_HEIGHT_PX,
    }));
    const glyphs = [
      { x: LIGHT_GLYPH_ORIGIN - 1, y: LIGHT_GLYPH_ORIGIN - 1, width: LIGHT_GLYPH_SIZE + 2, height: LIGHT_GLYPH_SIZE + 2 },
      ...CELL_GLYPH_KINDS.map((kind) => {
        const origin = cellGlyphOrigin(kind, CHROME_TILE_PX);
        return { x: origin.x - 1, y: origin.y - 1, width: CELL_GLYPH_SIZE + 2, height: CELL_GLYPH_SIZE + 2 };
      }),
    ];
    const hp = {
      x: Math.round((CHROME_TILE_PX - HP_BAR_WIDTH_PX) / 2) - HP_BAR_BORDER_PX,
      y: HP_BAR_TOP_PX,
      width: HP_BAR_WIDTH_PX + 2 * HP_BAR_BORDER_PX,
      height: HP_BAR_HEIGHT_PX + 2 * HP_BAR_BORDER_PX,
    };
    for (const badge of badges) {
      for (const [index, glyph] of glyphs.entries()) expect(overlaps(badge, glyph), `badge vs glyph ${String(index)}`).toBe(false);
      expect(overlaps(badge, hp), 'badge vs HP bar').toBe(false);
    }
  });

  it('refuses to reuse a palette colour or overfill a two-badge cell column', () => {
    const tooMany = Array.from({ length: CREATURE_BADGE_COLORS.length + 1 }, (_, index) => ({
      id: combatantId(`combatant:palette-${String(index)}`), name: `Foe ${String(index)}`,
      kind: 'monster' as const, position: { column: index, row: 0 },
    }));
    expect(() => assignCreatureBadges(tooMany)).toThrow('closed creature-badge palette');
    expect(() => assignCreatureBadges([...roster, {
      id: combatantId('combatant:c'), name: 'Third', kind: 'monster' as const, position: { column: 2, row: 1 },
    }])).toThrow('2-badge column');
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

  it('draws one unique badge and one full-name roster row per creature in stable number order', () => {
    const dm = interactiveElement(renderBoard(projection, new Set(), null, provenance));
    expect(dm.getAttribute('data-board-chrome')).toBe('on');
    expect(dm.getAttribute('data-coordinate-labels')).toBe(COORDINATE_CONVENTION);

    const badges = dm.querySelectorAll('.encounter-creature-badge');
    const roster = dm.querySelectorAll('.encounter-roster-entry');
    expect(badges).toHaveLength(projection.combatants.length);
    expect(roster).toHaveLength(projection.combatants.length);
    expect(dm.querySelectorAll('.encounter-nameplate')).toHaveLength(0);
    expect(roster.map((row) => row.getAttribute('data-roster-order'))).toEqual(['1', '2', '3', '4']);
    expect(new Set(badges.map((badge) => badge.getAttribute('data-badge-number'))).size).toBe(badges.length);
    expect(new Set(badges.map((badge) => badge.getAttribute('data-badge-color'))).size).toBe(badges.length);
    for (const [index, combatant] of projection.combatants.entries()) {
      const badge = badges.find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      const row = roster.find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(badge?.getAttribute('data-anchor-column')).toBe(String(combatant.position.column));
      expect(badge?.getAttribute('data-anchor-row')).toBe(String(combatant.position.row));
      expect(badge?.getAttribute('data-badge-number')).toBe(String(index + 1));
      expect(row?.getAttribute('data-badge-number')).toBe(String(index + 1));
      expect(row?.getAttribute('data-badge-color')).toBe(badge?.getAttribute('data-badge-color'));
      expect(row?.getAttribute('data-full-name')).toBe(combatant.name);
      expect(row?.getAttribute('data-label-style')).toBe(CREATURE_LABEL_STYLE);
      const tokenBadge = badge as StyledElement | undefined;
      const rosterBadge = row?.querySelector('.encounter-roster-badge') as StyledElement | null;
      expect(rosterBadge?.src, `${combatant.name} roster badge`).toBe(tokenBadge?.src);
      const coordinate = row?.querySelector('.encounter-roster-coordinate');
      expect(coordinate?.getAttribute('data-coordinate')).toBe(`(${String(combatant.position.column)},${String(combatant.position.row)})`);
      const name = row?.querySelector('.encounter-roster-name') as StyledElement | null;
      const expectedName = renderPixelText(layoutRosterName(combatant.name), neutral(8), 2);
      expect(name?.src, combatant.name).toBe(expectedName.dataUri);
      expect(name?.getAttribute('style')).toBe(`width:${String(expectedName.cssWidth)}px;height:${String(expectedName.cssHeight)}px`);
      const bar = dm.querySelectorAll('.encounter-hp-bar').find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(bar?.getAttribute('data-hp-band')).toBe(hpBandOf(combatant.hitPointBand));
      const glyph = dm.querySelectorAll('.encounter-life-glyph').find((candidate) => candidate.getAttribute('data-combatant-id') === combatant.id);
      expect(glyph?.getAttribute('data-life')).toBe(combatant.life);
    }
    expect(roster.map((row) => row.getAttribute('data-full-name'))).toEqual(projection.combatants.map((combatant) => combatant.name));
    expect(dm.querySelectorAll('.encounter-hidden-ring').map((ring) => ring.getAttribute('data-combatant-id'))).toEqual(['combatant:training-brute']);
    expect(dm.querySelectorAll('.encounter-roster-hidden')).toHaveLength(1);

    const labels = dm.querySelector('[data-coordinate-labels]');
    expect(labels?.querySelectorAll('[data-axis="column"]')).toHaveLength(projection.bounds.columns * 2);
    expect(labels?.querySelectorAll('[data-axis="row"]')).toHaveLength(projection.bounds.rows * 2);
    // The reference room names no light region, so every cell is bright and the default mode is 'none'.
    const legend = dm.querySelector('[data-legend]');
    // D525: the band is a minimum so a narrow board's rows are never clipped.
    expect(legend?.getAttribute('style')).toContain(`min-height:${String(legendHeightPx({ combatants: projection.combatants, objects: projection.worldObjects ?? [] }))}px`);
    expect(legend?.getAttribute('style')).not.toMatch(/(?:^|;)height:/u);
    expect(legend?.getAttribute('data-board-glyphs')).toBe('none');
    expect(legend?.getAttribute('data-room-default-light')).toBe('bright');
    const noneEntries = legendEntriesFor('none', 'bright', NOTHING_PRESENT);
    expect(legend?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key'))).toEqual(noneEntries.map((entry) => entry.key));
    for (const band of HP_BANDS) expect(noneEntries.some((entry) => entry.key === `hp-${band.replaceAll('_', '-')}`)).toBe(true);
    expect(noneEntries.map((entry) => entry.label)).toContain('Bright light');
    // under 'none' no eye-slash cell mark is drawn; the roster still says HIDDEN
    expect(dm.querySelectorAll('.encounter-hidden-glyph')).toHaveLength(0);
  });

  it('keeps objects and doors in an unclipped typed rail with distinct frames, coordinates, and matching sigils', () => {
    const styles: readonly BoardLabelStyle[] = [CREATURE_LABEL_STYLE, OBJECT_LABEL_STYLE, DOOR_LABEL_STYLE];
    expect(new Set(styles).size).toBe(3);
    const objects = Array.from({ length: 8 }, (_, index) => ({
      id: worldObjectId(`world-object:crate-${String(index)}`),
      name: `Crate ${String(index + 1)}`,
      kind: 'generic' as const,
      position: { column: index, row: 1 },
      cells: [{ column: index, row: 1 }],
      blocking: { movement: false, lineOfSight: false, cover: 'none' as const },
      lightClass: 'none' as const,
    }));
    const door = {
      id: worldObjectId('world-object:rail-door'), name: 'Rail Door', kind: 'door' as const,
      position: { column: 9, row: 1 }, cells: [{ column: 9, row: 1 }],
      blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, lightClass: 'none' as const,
    };
    const openDoor = {
      ...door,
      id: worldObjectId('world-object:rail-open-door'),
      name: 'Open Rail Door',
      position: { column: 9, row: 2 }, cells: [{ column: 9, row: 2 }],
      blocking: { movement: false, lineOfSight: false, cover: 'none' as const },
    };
    const objectProjection = { ...projection, worldObjects: [...objects, door, openDoor] };
    expect(boardRailEntries(objectProjection.worldObjects).map((entry) => [entry.kind, entry.labelStyle, entry.label])).toEqual([
      ...objects.map((object) => ['object', OBJECT_LABEL_STYLE, `${object.name} (${String(object.position.column)},1)`]),
      ['door', DOOR_LABEL_STYLE, 'DOOR CLOSED (9,1)'],
      ['door', DOOR_LABEL_STYLE, 'DOOR OPEN (9,2)'],
    ]);
    const liveDm = interactiveElement(renderBoard(objectProjection, new Set(), null, provenance));
    const liveObjectLabel = liveDm.querySelector('.encounter-world-object-label');
    expect(liveObjectLabel?.getAttribute('data-label-style')).toBe(OBJECT_LABEL_STYLE);

    const snapshotDm = interactiveElement(renderBoard(objectProjection, new Set(), null, provenance, 'full', true));
    const creatureRow = snapshotDm.querySelector('.encounter-roster-entry');
    const objectTag = snapshotDm.querySelector('.encounter-object-tag');
    const objectSigil = objectTag?.querySelector('.encounter-object-tag-sigil') as StyledElement | null;
    const legendSigil = snapshotDm.querySelector('[data-legend-key="object"]')
      ?.querySelector('.encounter-legend-swatch-mark') as StyledElement | null;
    const objectText = objectTag?.querySelector('.encounter-object-tag-text');
    const doorTags = snapshotDm.querySelectorAll('.encounter-door-tag');
    expect(snapshotDm.querySelector('.encounter-world-object-label')).toBeNull();
    expect(objectTag?.getAttribute('data-label-style')).toBe(OBJECT_LABEL_STYLE);
    expect(objectTag?.getAttribute('data-anchor-column')).toBe('0');
    expect(objectTag?.getAttribute('data-anchor-row')).toBe('1');
    expect(objectText?.getAttribute('data-full-label')).toBe('Crate 1 (0,1)');
    expect(objectSigil?.src).toBe(legendSigil?.src);
    const expectedObjectText = renderPixelText(layoutPixelText('Crate 1 (0,1)', 2), neutral(8), 2);
    expect((objectText as StyledElement | null)?.src).toBe(expectedObjectText.dataUri);
    expect((objectText as StyledElement | null)?.getAttribute('style')).toBe(`width:${String(expectedObjectText.cssWidth)}px;height:${String(expectedObjectText.cssHeight)}px`);
    expect(objectTag?.parentElement?.className).toBe('encounter-object-tag-rail');
    expect(creatureRow?.getAttribute('data-label-style')).toBe(CREATURE_LABEL_STYLE);
    expect(objectTag?.getAttribute('data-label-style')).not.toBe(creatureRow?.getAttribute('data-label-style'));
    expect(snapshotDm.querySelectorAll('.encounter-object-tag')).toHaveLength(8);
    expect(doorTags).toHaveLength(2);
    expect(doorTags.map((tag) => [
      tag.getAttribute('data-label-style'),
      tag.getAttribute('data-door-state'),
      tag.querySelector('.encounter-door-tag-text')?.getAttribute('data-full-label'),
    ])).toEqual([
      [DOOR_LABEL_STYLE, 'closed', 'DOOR CLOSED (9,1)'],
      [DOOR_LABEL_STYLE, 'open', 'DOOR OPEN (9,2)'],
    ]);
    expect(doorTags.every((tag) => tag.getAttribute('data-label-style') !== OBJECT_LABEL_STYLE)).toBe(true);
    for (const tag of doorTags) {
      const key = tag.getAttribute('data-door-state') === 'open' ? 'door-open' : 'door-closed';
      const railSigil = tag.querySelector('.encounter-door-tag-sigil') as StyledElement | null;
      const matchingLegend = snapshotDm.querySelector(`[data-legend-key="${key}"]`)
        ?.querySelector('.encounter-legend-swatch-mark') as StyledElement | null;
      expect(railSigil?.src, key).toBe(matchingLegend?.src);
    }
    expect(snapshotDm.querySelectorAll('.encounter-world-object-sigil')).toHaveLength(8);
    const expectedLegendHeight = legendHeightPx({ combatants: projection.combatants, objects: objectProjection.worldObjects });
    expect(snapshotDm.querySelector('.encounter-legend')?.getAttribute('style')).toContain(`min-height:${String(expectedLegendHeight)}px`);
    expect(boardChromeDimensions(projection.bounds, {
      combatants: projection.combatants,
      objects: objectProjection.worldObjects,
    }).height).toBe(boardChromeDimensions(projection.bounds).height + expectedLegendHeight - LEGEND_HEIGHT_PX);
  });

  it('renders exact 2x roster bitmaps and unique in-cell badges over 200 seeded rosters', () => {
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
      const badges = board.querySelectorAll('.encounter-creature-badge');
      const rosterRows = board.querySelectorAll('.encounter-roster-entry');
      expect(badges).toHaveLength(combatants.length);
      expect(rosterRows).toHaveLength(combatants.length);
      expect(new Set(badges.map((badge) => badge.getAttribute('data-badge-number'))).size).toBe(combatants.length);
      expect(new Set(badges.map((badge) => badge.getAttribute('data-badge-color'))).size).toBe(combatants.length);
      for (const badge of badges) {
        const id = badge.getAttribute('data-combatant-id');
        if (id === null) throw new Error('Rendered badge has no combatant identity.');
        const column = numericData(badge, 'data-anchor-column');
        const row = numericData(badge, 'data-anchor-row');
        const rect = {
          x: inlinePixels(badge, 'left'), y: inlinePixels(badge, 'top'),
          width: inlinePixels(badge, 'width'), height: inlinePixels(badge, 'height'),
        };
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
        const hpRect = {
          x: cellRect.x + Math.round((CHROME_TILE_PX - HP_BAR_WIDTH_PX) / 2) - 1,
          y: cellRect.y + HP_BAR_TOP_PX,
          width: HP_BAR_WIDTH_PX + 2,
          height: HP_BAR_HEIGHT_PX + 2,
        };
        expect(overlaps(rect, hpRect), `${id} badge overlaps HP bar`).toBe(false);
      }
      for (const [index, row] of rosterRows.entries()) {
        const combatant = combatants[index];
        if (combatant === undefined) throw new Error('Roster row exceeds its source roster.');
        expect(row.getAttribute('data-full-name')).toBe(combatant.name);
        expect(row.getAttribute('data-roster-order')).toBe(String(index + 1));
        expect(row.querySelector('.encounter-roster-coordinate')?.getAttribute('data-coordinate'))
          .toBe(`(${String(combatant.position.column)},${String(combatant.position.row)})`);
        const rosterBadge = row.querySelector('.encounter-roster-badge') as StyledElement | null;
        const tokenBadge = badges[index] as StyledElement | undefined;
        expect(rosterBadge?.src).toBe(tokenBadge?.src);
        const image = row.querySelector('.encounter-roster-name') as StyledElement | null;
        const expected = renderPixelText(layoutRosterName(combatant.name), neutral(8), 2);
        expect(image?.src, `sample ${String(sample)} ${combatant.name}`).toBe(expected.dataUri);
        expect(image?.getAttribute('style')).toBe(`width:${String(expected.cssWidth)}px;height:${String(expected.cssHeight)}px`);
      }
    }
  });

  it('stacks two same-cell badges in number order without overlap', () => {
    const shared = {
      ...projection,
      combatants: projection.combatants.slice(0, 2).map((combatant) => ({
        ...combatant,
        position: { column: 3, row: 2 },
      })),
    };
    const board = interactiveElement(renderBoard(shared, new Set(), null, provenance, 'full', true));
    const badges = board.querySelectorAll('.encounter-creature-badge');
    expect(badges.map((badge) => [badge.getAttribute('data-badge-number'), badge.getAttribute('data-stack-index')]))
      .toEqual([['1', '0'], ['2', '1']]);
    const rects = badges.map((badge) => ({
      x: inlinePixels(badge, 'left'), y: inlinePixels(badge, 'top'),
      width: inlinePixels(badge, 'width'), height: inlinePixels(badge, 'height'),
    }));
    expect(overlaps(rects[0]!, rects[1]!)).toBe(false);
    expect(inlinePixels(badges[0]!, 'left')).toBe(COORDINATE_GUTTER_PX + 3 * CHROME_TILE_PX + CREATURE_BADGE_LEFT_PX);
    expect(inlinePixels(badges[1]!, 'top') - inlinePixels(badges[0]!, 'top')).toBe(CREATURE_BADGE_STACK_PITCH_PX);
  });

  it('uses identical bust and badge composition in live and snapshot DM modes', () => {
    const live = interactiveElement(renderBoard(projection, new Set(), null, provenance, 'full', false));
    const snapshot = interactiveElement(renderBoard(projection, new Set(), null, provenance, 'full', true));
    expect(live.querySelectorAll('.encounter-token-sprite').map(serialize))
      .toEqual(snapshot.querySelectorAll('.encounter-token-sprite').map(serialize));
    expect(live.querySelectorAll('.encounter-creature-badge').map(serialize))
      .toEqual(snapshot.querySelectorAll('.encounter-creature-badge').map(serialize));
    expect(live.querySelectorAll('.encounter-nameplate')).toHaveLength(0);
    expect(snapshot.querySelectorAll('.encounter-nameplate')).toHaveLength(0);
  });

  it('contains no non-integer CSS scale in declarations targeting rendered board elements', () => {
    const boardStyles = readFileSync(new URL('../../../src/vtt/styles.css', import.meta.url), 'utf8');
    const board = interactiveElement(renderBoard(projection, new Set(), null, provenance, 'full', true));
    const renderedClasses = new Set<string>();
    const visit = (node: InteractiveTestElement): void => {
      for (const className of node.className.split(/\s+/u).filter((value) => value !== '')) {
        renderedClasses.add(className);
      }
      for (const child of node.children) visit(child);
    };
    visit(board);
    const applicableScales = [...boardStyles.matchAll(/([^{}]+)\{([^{}]*)\}/gu)].flatMap((rule) => {
      const selector = rule[1] ?? '';
      const declarations = rule[2] ?? '';
      const selectorClasses = [...selector.matchAll(/\.([a-z][a-z0-9-]*)/gu)]
        .flatMap((match) => match[1] === undefined ? [] : [match[1]]);
      const targetsRenderedBoardElement = selectorClasses.length > 0 &&
        selectorClasses.every((className) => renderedClasses.has(className));
      if (!targetsRenderedBoardElement) return [];
      return [...declarations.matchAll(/scale\(\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\)/gu)].map((match) => ({
        selector: selector.trim(),
        value: Number(match[1]),
      }));
    });
    expect(
      applicableScales.filter(({ value }) => !Number.isInteger(value)),
      JSON.stringify(applicableScales),
    ).toEqual([]);
    const everyDeclaredScale = [...boardStyles.matchAll(/scale\(\s*(-?[0-9]+(?:\.[0-9]+)?)\s*\)/gu)]
      .map((match) => Number(match[1]));
    expect(everyDeclaredScale.filter((value) => !Number.isInteger(value)), everyDeclaredScale.join(','))
      .toEqual([]);
  });

  it('keeps every declared rendered chrome pixel in the generated closed palette with no CSS-rounded chrome', () => {
    const closedPalette = new Set([
      ...PALETTE_RAMPS.flatMap((name) => RAMP_STEPS.map((step) => paletteHex(ramp(name, step)))),
      ...NEUTRAL_STEPS.map((step) => paletteHex(neutral(step))),
    ]);
    const boardStyles = readFileSync(new URL('../../../src/vtt/styles.css', import.meta.url), 'utf8');
    const chromeStart = boardStyles.indexOf('D516 — classic board');
    const chromeEnd = boardStyles.indexOf('/* --- DM chrome:', chromeStart);
    expect(chromeStart).toBeGreaterThanOrEqual(0);
    expect(chromeEnd).toBeGreaterThan(chromeStart);
    const chromeCss = boardStyles.slice(chromeStart, chromeEnd);
    expect(chromeCss).not.toContain('border-radius');
    for (const color of chromeCss.match(/#[0-9a-f]{6}/gu) ?? []) {
      expect(closedPalette.has(color), `chrome CSS ${color}`).toBe(true);
    }

    const board = interactiveElement(renderBoard(projection, new Set(), null, provenance, 'full', true));
    const chromeRoots = ['.encounter-coordinate-labels', '.encounter-token-chrome', '.encounter-legend']
      .map((selector) => board.querySelector(selector))
      .filter((root): root is InteractiveTestElement => root !== null);
    expect(chromeRoots).toHaveLength(3);
    const visit = (node: InteractiveTestElement): void => {
      const styledNode = node as StyledElement;
      const source = styledNode.src;
      if (source?.startsWith('data:image/svg+xml;charset=utf-8,') === true) {
        const svg = decodeURIComponent(source.slice('data:image/svg+xml;charset=utf-8,'.length));
        expect(svg).toContain('shape-rendering="crispEdges"');
        for (const color of svg.match(/#[0-9a-f]{6}/gu) ?? []) {
          expect(closedPalette.has(color), `${node.className} SVG ${color}`).toBe(true);
        }
      } else if (source !== undefined && source !== '') {
        expect(source, node.className).toMatch(/^data:image\/png;base64,/u);
      }
      for (const color of (node.getAttribute('style')?.match(/#[0-9a-f]{6}/gu) ?? [])) {
        expect(closedPalette.has(color), `${node.className} inline ${color}`).toBe(true);
      }
      for (const child of node.children) visit(child);
    };
    for (const root of chromeRoots) visit(root);
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
