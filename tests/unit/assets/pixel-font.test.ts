import { describe, expect, it } from 'vitest';
import {
  GLYPH_ADVANCE,
  GLYPH_HEIGHT,
  GLYPH_WIDTH,
  LIFE_GLYPHS,
  PIXEL_FONT_GLYPHS,
  REPLACEMENT_GLYPH,
  layoutPixelText,
  normalizeLabelText,
  renderLifeGlyph,
  renderPixelText,
  textPixelWidth,
} from '../../../src/assets/pixel-font';
import { neutral } from '../../../src/assets/palette';

function rectCount(svg: string): number {
  return svg.split('<rect ').length - 1;
}

function expectedRuns(rows: readonly string[]): number {
  return rows.reduce((total, row) => total + (row.match(/#+/gu)?.length ?? 0), 0);
}

describe('D516 pixel font', () => {
  it('draws every glyph inside its 5×7 cell and renders each one', () => {
    for (const [character, rows] of PIXEL_FONT_GLYPHS) {
      expect(rows, character).toHaveLength(GLYPH_HEIGHT);
      for (const row of rows) expect(row, character).toHaveLength(GLYPH_WIDTH);
      const rendered = renderPixelText(layoutPixelText(character, 1), neutral(8), 2);
      expect(rectCount(rendered.svg), character).toBe(expectedRuns(rows));
      if (character !== ' ') expect(rectCount(rendered.svg), character).toBeGreaterThan(0);
    }
    expect(PIXEL_FONT_GLYPHS.size).toBeGreaterThanOrEqual(26 + 10 + 10);
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(PIXEL_FONT_GLYPHS.has(letter)).toBe(true);
  });

  it('renders the four life-state marks', () => {
    for (const glyph of ['living', 'dying', 'stable', 'dead'] as const) {
      const rendered = renderLifeGlyph(glyph, neutral(8), 2);
      expect(rectCount(rendered.svg)).toBe(expectedRuns(LIFE_GLYPHS[glyph]));
      expect(rendered.cssWidth).toBe(GLYPH_WIDTH * 2);
      expect(rendered.cssHeight).toBe(GLYPH_HEIGHT * 2);
    }
  });

  it('normalizes without ever shortening: unsupported characters become the replacement glyph', () => {
    const input = 'Zoë d\'Arc — vampire (élite) #2';
    const normalized = normalizeLabelText(input);
    expect(normalized).toHaveLength(Array.from(input).length);
    expect(normalized).toBe(`ZO${REPLACEMENT_GLYPH} D'ARC ${REPLACEMENT_GLYPH} VAMPIRE (${REPLACEMENT_GLYPH}LITE) #2`);
    expect(normalizeLabelText('goblin warrior')).toBe('GOBLIN WARRIOR');
  });

  it('wraps to at most two lines and keeps every word', () => {
    for (const name of ['Reference Fighter', 'Hobgoblin Warrior Captain of the Third Watch', 'X', '', 'Wolf']) {
      const layout = layoutPixelText(name, 2);
      expect(layout.lines.length).toBeLessThanOrEqual(2);
      expect(layout.lines.join(' ').trim()).toBe(normalizeLabelText(name).trim());
      expect(layout.width).toBe(Math.max(...layout.lines.map(textPixelWidth)));
      expect(layout.height).toBe(layout.lines.length * GLYPH_HEIGHT + (layout.lines.length - 1) * 2);
    }
    expect(layoutPixelText('Reference Fighter', 2).lines).toEqual(['REFERENCE', 'FIGHTER']);
    expect(textPixelWidth('ABC')).toBe(3 * GLYPH_ADVANCE - 1);
  });

  it('renders at 2× as a crisp SVG data URI sized in CSS px', () => {
    const rendered = renderPixelText(layoutPixelText('Reference Fighter', 2), neutral(8), 2);
    expect(rendered.dataUri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(rendered.svg).toContain('shape-rendering="crispEdges"');
    expect(rendered.cssWidth).toBe(rendered.layout.width * 2);
    expect(rendered.cssHeight).toBe(rendered.layout.height * 2);
  });
});
