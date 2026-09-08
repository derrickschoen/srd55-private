import { paletteRgb, type PaletteColorRef } from './palette';

/** A palette reference plus coverage; the only way to put colour on a bitmap. */
export type Ink = PaletteColorRef & { readonly alpha?: number };

export interface Rgba {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

export const TRANSPARENT: Rgba = Object.freeze({ red: 0, green: 0, blue: 0, alpha: 0 });

/** 2×2 ordered-dither threshold: the ONLY texture primitive; never per-pixel noise. */
export function bayer2(x: number, y: number): 0 | 1 | 2 | 3 {
  const matrix = [[0, 2], [3, 1]] as const;
  return matrix[y & 1]![x & 1]!;
}

/** Deterministic integer hash in [0, 1) for placing accents; no Math.random anywhere. */
export function hashNoise(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4_294_967_296;
}

export function resolveInk(ink: Ink): Rgba {
  const rgb = paletteRgb(ink);
  return { ...rgb, alpha: ink.alpha ?? 255 };
}

export class Bitmap {
  readonly data: Uint8Array;

  constructor(readonly width: number, readonly height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new Error('Bitmap dimensions must be positive integers.');
    }
    this.data = new Uint8Array(width * height * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Rgba {
    if (!this.inside(x, y)) return TRANSPARENT;
    const offset = (y * this.width + x) * 4;
    return {
      red: this.data[offset]!,
      green: this.data[offset + 1]!,
      blue: this.data[offset + 2]!,
      alpha: this.data[offset + 3]!,
    };
  }

  /** Writes the colour, replacing whatever was there (including alpha). */
  put(x: number, y: number, ink: Ink): void {
    if (!this.inside(x, y)) return;
    const color = resolveInk(ink);
    this.writeRgba(x, y, color);
  }

  /** Source-over composite, for translucent overlays and soft edges. */
  blend(x: number, y: number, ink: Ink): void {
    this.blendRgba(x, y, resolveInk(ink));
  }

  /** Source-over composite of an already-resolved colour (layer compositing). */
  blendRgba(x: number, y: number, source: Rgba): void {
    if (!this.inside(x, y)) return;
    if (source.alpha >= 255) {
      this.writeRgba(x, y, source);
      return;
    }
    const target = this.get(x, y);
    const sa = source.alpha / 255;
    const ta = target.alpha / 255;
    const outAlpha = sa + ta * (1 - sa);
    if (outAlpha <= 0) {
      this.writeRgba(x, y, TRANSPARENT);
      return;
    }
    const mix = (s: number, t: number): number => Math.round((s * sa + t * ta * (1 - sa)) / outAlpha);
    this.writeRgba(x, y, {
      red: mix(source.red, target.red),
      green: mix(source.green, target.green),
      blue: mix(source.blue, target.blue),
      alpha: Math.round(outAlpha * 255),
    });
  }

  clear(x: number, y: number): void {
    if (!this.inside(x, y)) return;
    this.writeRgba(x, y, TRANSPARENT);
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) this.clear(px, py);
    }
  }

  fill(ink: Ink): void {
    this.rect(0, 0, this.width, this.height, ink);
  }

  rect(x: number, y: number, width: number, height: number, ink: Ink): void {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) this.put(px, py, ink);
    }
  }

  blendRect(x: number, y: number, width: number, height: number, ink: Ink): void {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) this.blend(px, py, ink);
    }
  }

  outline(x: number, y: number, width: number, height: number, ink: Ink): void {
    this.hLine(x, x + width - 1, y, ink);
    this.hLine(x, x + width - 1, y + height - 1, ink);
    this.vLine(x, y, y + height - 1, ink);
    this.vLine(x + width - 1, y, y + height - 1, ink);
  }

  hLine(x0: number, x1: number, y: number, ink: Ink): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) this.put(x, y, ink);
  }

  vLine(x: number, y0: number, y1: number, ink: Ink): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) this.put(x, y, ink);
  }

  line(x0: number, y0: number, x1: number, y1: number, ink: Ink): void {
    this.walkLine(x0, y0, x1, y1, (x, y) => this.put(x, y, ink));
  }

  /** Composited line, for translucent accents over an opaque surface. */
  blendLine(x0: number, y0: number, x1: number, y1: number, ink: Ink): void {
    this.walkLine(x0, y0, x1, y1, (x, y) => this.blend(x, y, ink));
  }

  private walkLine(x0: number, y0: number, x1: number, y1: number, visit: (x: number, y: number) => void): void {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      visit(x, y);
      if (x === x1 && y === y1) break;
      const doubled = 2 * error;
      if (doubled >= dy) { error += dy; x += sx; }
      if (doubled <= dx) { error += dx; y += sy; }
    }
  }

  /**
   * Fills the 2×2-Bayer mix of two inks over a rectangle. `level` 0 paints
   * only `a`, 4 only `b`; 1–3 interleave them in the ordered pattern.
   */
  dither(x: number, y: number, width: number, height: number, a: Ink, b: Ink, level: number): void {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) {
        this.put(px, py, bayer2(px, py) < level ? b : a);
      }
    }
  }

  /** Bayer-mixed blend for translucent veils with a soft, patterned edge. */
  blendDither(x: number, y: number, width: number, height: number, ink: Ink, level: number): void {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) {
        if (bayer2(px, py) < level) this.blend(px, py, ink);
      }
    }
  }

  disc(cx: number, cy: number, radius: number, ink: Ink): void {
    this.ellipse(cx, cy, radius, radius, ink);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, ink: Ink): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const nx = (x + 0.5 - cx) / (rx + 0.5);
        const ny = (y + 0.5 - cy) / (ry + 0.5);
        if (nx * nx + ny * ny <= 1) this.put(x, y, ink);
      }
    }
  }

  /** One-pixel ring on the ellipse boundary (inside the filled ellipse). */
  ellipseRing(cx: number, cy: number, rx: number, ry: number, ink: Ink): void {
    const insideAt = (x: number, y: number): boolean => {
      const nx = (x + 0.5 - cx) / (rx + 0.5);
      const ny = (y + 0.5 - cy) / (ry + 0.5);
      return nx * nx + ny * ny <= 1;
    };
    for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y += 1) {
      for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x += 1) {
        if (!insideAt(x, y)) continue;
        if (!insideAt(x - 1, y) || !insideAt(x + 1, y) || !insideAt(x, y - 1) || !insideAt(x, y + 1)) {
          this.put(x, y, ink);
        }
      }
    }
  }

  ring(cx: number, cy: number, radius: number, ink: Ink): void {
    this.ellipseRing(cx, cy, radius, radius, ink);
  }

  /** Rectangle whose shading moves from `a` (upper-left) to `b` (lower-right) in Bayer steps. */
  gradientRect(x: number, y: number, width: number, height: number, a: Ink, b: Ink): void {
    const span = Math.max(1, width + height - 2);
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) {
        const t = ((px - x) + (py - y)) / span;
        const level = Math.round(t * 4);
        this.put(px, py, bayer2(px, py) < level ? b : a);
      }
    }
  }

  column(x: number): Uint8Array {
    const bytes = new Uint8Array(this.height * 4);
    for (let y = 0; y < this.height; y += 1) {
      const offset = (y * this.width + x) * 4;
      bytes.set(this.data.subarray(offset, offset + 4), y * 4);
    }
    return bytes;
  }

  row(y: number): Uint8Array {
    const offset = y * this.width * 4;
    return this.data.slice(offset, offset + this.width * 4);
  }

  private writeRgba(x: number, y: number, color: Rgba): void {
    const offset = (y * this.width + x) * 4;
    this.data[offset] = color.red;
    this.data[offset + 1] = color.green;
    this.data[offset + 2] = color.blue;
    this.data[offset + 3] = color.alpha;
  }
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}
