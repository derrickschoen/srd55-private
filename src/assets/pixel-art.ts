import type { PixelPalette, StarterArtInput } from './starter-art-inputs';

const PALETTES: Readonly<Record<PixelPalette, Readonly<Record<'background' | '#' | '+' | 'o', string>>>> = {
  'pc-blue': { background: '#12213a', '#': '#d7e6ff', '+': '#68a7ff', o: '#fff3a8' },
  'monster-red': { background: '#35151b', '#': '#ffd7cf', '+': '#d95b55', o: '#fff0a8' },
  stone: { background: '#292d35', '#': '#697382', '+': '#aeb7c2', o: '#eef2f4' },
  wood: { background: '#2c1c15', '#': '#71442d', '+': '#b87745', o: '#f2d49d' },
  terrain: { background: '#00000000', '#': '#766d5e', '+': '#b7a88d', o: '#eee3c7' },
  hazard: { background: '#30131b', '#': '#c73635', '+': '#ffb52e', o: '#fff0a8' },
  fog: { background: '#10141c', '#': '#202738', '+': '#4a5266', o: '#8790a4' },
  focus: { background: '#00000000', '#': '#00000000', '+': '#58f09a', o: '#d2ffe3' },
  adjudicated: { background: '#00000000', '#': '#00000000', '+': '#ffad42', o: '#fff0bd' },
};

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

interface PixelRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly symbol: '#' | '+' | 'o';
}

function pixelRuns(rows: readonly string[]): readonly PixelRun[] {
  const runs: PixelRun[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const symbol = row[x];
      if (symbol === '.') {
        x += 1;
        continue;
      }
      if (symbol !== '#' && symbol !== '+' && symbol !== 'o') {
        throw new Error(`Unknown procedural pixel symbol ${String(symbol)}.`);
      }
      let end = x + 1;
      while (row[end] === symbol) end += 1;
      runs.push({ x, y, width: end - x, symbol });
      x = end;
    }
  });
  return runs;
}

export function renderPixelArtSvg(input: StarterArtInput): string {
  const palette = PALETTES[input.palette];
  const rectangles = pixelRuns(input.pixels)
    .map((run) => `<rect x="${String(run.x)}" y="${String(run.y)}" width="${String(run.width)}" height="1" fill="${palette[run.symbol]}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges" role="img" aria-label="${escapeXml(input.title)}"><rect width="16" height="16" fill="${palette.background}"/>${rectangles}</svg>\n`;
}
