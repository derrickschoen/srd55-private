import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { adler32, base64, crc32, deflateFixed, encodePng, pngDimensions, zlibCompress } from '../../../src/assets/png';

function chunks(png: Uint8Array): readonly { readonly type: string; readonly data: Uint8Array }[] {
  const out: { type: string; data: Uint8Array }[] = [];
  let offset = 8;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    out.push({ type, data: png.slice(offset + 8, offset + 8 + length) });
    offset += 12 + length;
  }
  return out;
}

function pattern(width: number, height: number): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = (x * 7 + y * 3) & 0xff;
      rgba[offset + 1] = ((x ^ y) * 5) & 0xff;
      rgba[offset + 2] = (x + y) % 4 === 0 ? 200 : 40;
      rgba[offset + 3] = x < 4 ? 0 : 255;
    }
  }
  return rgba;
}

describe('dependency-free PNG encoder', () => {
  it('crc32 and adler32 match the published check values', () => {
    expect(crc32(Uint8Array.from('123456789', (c) => c.charCodeAt(0))).toString(16)).toBe('cbf43926');
    expect(adler32(Uint8Array.from('Wikipedia', (c) => c.charCodeAt(0))).toString(16)).toBe('11e60398');
  });

  it('deflate round-trips through node:zlib and actually compresses repetition', () => {
    const rows = pattern(64, 64);
    const compressed = zlibCompress(rows);
    expect(Buffer.from(inflateSync(Buffer.from(compressed))).equals(Buffer.from(rows))).toBe(true);

    const repetitive = Uint8Array.from({ length: 64 * 64 * 4 }, (_, index) => ((index >> 2) % 8) * 30);
    const packed = zlibCompress(repetitive);
    expect(Buffer.from(inflateSync(Buffer.from(packed))).equals(Buffer.from(repetitive))).toBe(true);
    expect(packed.length).toBeLessThan(repetitive.length / 20);

    const incompressible = Uint8Array.from({ length: 300 }, (_, index) => (index * 97 + 13) % 251);
    expect(Buffer.from(inflateSync(Buffer.from(zlibCompress(incompressible)))).equals(Buffer.from(incompressible))).toBe(true);
    expect(Buffer.from(inflateSync(Buffer.from(zlibCompress(new Uint8Array(0))))).length).toBe(0);
    expect(deflateFixed(new Uint8Array(0)).length).toBeGreaterThan(0);
  });

  it('writes IHDR/IDAT/IEND with RGBA scanlines that decode back to the input', () => {
    const rgba = pattern(64, 64);
    const png = encodePng(64, 64, rgba);
    expect(pngDimensions(png)).toEqual({ width: 64, height: 64 });
    const parsed = chunks(png);
    expect(parsed.map((chunk) => chunk.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    const header = parsed[0]!.data;
    expect([header[8], header[9], header[10], header[11], header[12]]).toEqual([8, 6, 0, 0, 0]);
    const raw = inflateSync(Buffer.from(parsed[1]!.data));
    expect(raw.length).toBe(64 * (64 * 4 + 1));
    for (let y = 0; y < 64; y += 1) {
      expect(raw[y * 257]).toBe(0);
      expect(Buffer.from(raw.subarray(y * 257 + 1, (y + 1) * 257)).equals(Buffer.from(rgba.subarray(y * 256, (y + 1) * 256)))).toBe(true);
    }
  });

  it('is a pure function of its input and rejects mismatched buffers', () => {
    const rgba = pattern(16, 8);
    expect(Buffer.from(encodePng(16, 8, rgba)).equals(Buffer.from(encodePng(16, 8, rgba)))).toBe(true);
    expect(() => encodePng(16, 9, rgba)).toThrow(/does not match/u);
  });

  it('base64 agrees with Buffer for every padding length', () => {
    for (const length of [0, 1, 2, 3, 4, 5, 61, 62, 63, 64]) {
      const bytes = Uint8Array.from({ length }, (_, index) => (index * 31 + 7) & 0xff);
      expect(base64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    }
  });
});
