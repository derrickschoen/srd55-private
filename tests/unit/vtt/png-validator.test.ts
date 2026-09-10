import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32, encodePng } from '../../../src/assets/png';
import { PNG_LIMITS, validatePng } from '../../../tools/vtt-handoff/png-validator';

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Uint8Array): Buffer {
  return chunkBytes(Buffer.from(type, 'ascii'), data);
}

function chunkBytes(typeBytes: Buffer, data: Uint8Array): Buffer {
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  Buffer.from(data).copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(data)])) >>> 0, 8 + data.length);
  return output;
}

function ihdr(width = 1, height = 1, overrides: Partial<Record<8 | 9 | 10 | 11 | 12, number>> = {}): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = overrides[8] ?? 8;
  data[9] = overrides[9] ?? 6;
  data[10] = overrides[10] ?? 0;
  data[11] = overrides[11] ?? 0;
  data[12] = overrides[12] ?? 0;
  return chunk('IHDR', data);
}

function pngFromCompressed(compressed: Uint8Array, header = ihdr()): Buffer {
  return Buffer.concat([signature, header, chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function pngFromRaw(raw: Uint8Array, header = ihdr()): Buffer {
  return pngFromCompressed(deflateSync(raw), header);
}

describe('bounded complete PNG validation', () => {
  it('accepts valid opaque and transparent 8-bit RGBA non-interlaced images independently', () => {
    const opaque = validatePng(encodePng(1, 1, Uint8Array.of(10, 20, 30, 255)));
    const transparent = validatePng(encodePng(1, 1, Uint8Array.of(10, 20, 30, 0)));
    expect(opaque).toMatchObject({ width: 1, height: 1, hasTransparency: false });
    expect(transparent).toMatchObject({ width: 1, height: 1, hasTransparency: true });
  });

  it('unfilters every exact PNG filter 0 through 4 and rejects filter 5', () => {
    const rowsByFilter = new Map<number, Uint8Array>([
      [0, Uint8Array.of(0, 10, 20, 30, 255, 40, 50, 60, 255, 0, 70, 80, 90, 255, 100, 110, 120, 255)],
      [1, Uint8Array.of(1, 10, 20, 30, 255, 30, 30, 30, 0, 1, 70, 80, 90, 255, 30, 30, 30, 0)],
      [2, Uint8Array.of(2, 10, 20, 30, 255, 40, 50, 60, 255, 2, 60, 60, 60, 0, 60, 60, 60, 0)],
      [3, Uint8Array.of(3, 10, 20, 30, 255, 35, 40, 45, 128, 3, 65, 70, 75, 128, 45, 45, 45, 0)],
      [4, Uint8Array.of(4, 10, 20, 30, 255, 30, 30, 30, 0, 4, 60, 60, 60, 0, 30, 30, 30, 0)],
    ]);
    for (const filter of [0, 1, 2, 3, 4]) {
      const rows = rowsByFilter.get(filter);
      if (rows === undefined) throw new Error('filter fixture missing');
      expect(validatePng(pngFromRaw(rows, ihdr(2, 2))).hasTransparency, `filter ${String(filter)}`).toBe(false);
    }
    expect(() => validatePng(pngFromRaw(Uint8Array.of(5, 0, 0, 0, 0)))).toThrow('PNG_FILTER');
  });

  it('rejects truncated chunks, false lengths, corrupt CRCs and corrupt deflate streams', () => {
    const valid = Buffer.from(encodePng(1, 1, Uint8Array.of(1, 2, 3, 255)));
    expect(() => validatePng(valid.subarray(0, valid.length - 1))).toThrow(/PNG_(CHUNK_LENGTH|TRUNCATED_CHUNK)/u);
    const falseLength = Buffer.from(valid);
    falseLength.writeUInt32BE(0xffff_ffff, 8);
    expect(() => validatePng(falseLength)).toThrow('PNG_CHUNK_LENGTH');
    const crcBroken = Buffer.from(valid);
    crcBroken[29] = (crcBroken[29] ?? 0) ^ 1;
    expect(() => validatePng(crcBroken)).toThrow('PNG_CRC');
    expect(() => validatePng(pngFromCompressed(Uint8Array.of(1, 2, 3, 4)))).toThrow('PNG_INFLATE');
  });

  it('requires one first IHDR, contiguous IDAT, and a terminal zero-length IEND', () => {
    const compressed = deflateSync(Uint8Array.of(0, 0, 0, 0, 255));
    expect(() => validatePng(Buffer.concat([signature, chunk('IDAT', compressed), ihdr(), chunk('IEND', Buffer.alloc(0))])))
      .toThrow('PNG_IHDR_NOT_FIRST');
    expect(() => validatePng(Buffer.concat([signature, ihdr(), ihdr(), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])))
      .toThrow('PNG_IHDR');
    const midpoint = Math.floor(compressed.length / 2);
    expect(() => validatePng(Buffer.concat([
      signature, ihdr(), chunk('IDAT', compressed.subarray(0, midpoint)), chunk('tEXt', Buffer.from('x')),
      chunk('IDAT', compressed.subarray(midpoint)), chunk('IEND', Buffer.alloc(0)),
    ]))).toThrow('PNG_IDAT_ORDER');
    expect(() => validatePng(Buffer.concat([signature, ihdr(), chunk('IDAT', compressed), chunk('IEND', Buffer.from([0]))])))
      .toThrow('PNG_IEND');
    expect(() => validatePng(Buffer.concat([pngFromCompressed(compressed), Buffer.from([0])]))).toThrow('PNG_TRAILING_BYTES');
  });

  it('rejects illegal IHDR methods, unknown critical chunks, scanline mismatch and zlib trailing data', () => {
    for (const [index, value] of [[8, 16], [9, 2], [10, 1], [11, 1], [12, 1]] as const) {
      expect(() => validatePng(pngFromRaw(Uint8Array.of(0, 0, 0, 0, 0), ihdr(1, 1, { [index]: value }))))
        .toThrow('PNG_IHDR_FORMAT');
    }
    expect(() => validatePng(Buffer.concat([
      signature, ihdr(), chunk('ABCD', Buffer.alloc(0)), chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
    ]))).toThrow('PNG_UNKNOWN_CRITICAL_CHUNK');
    expect(() => validatePng(Buffer.concat([
      signature, chunkBytes(Buffer.from([0xc9, 0xc8, 0xc4, 0xd2]), Buffer.alloc(13)),
      chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
    ]))).toThrow('PNG_CHUNK_TYPE');
    expect(() => validatePng(Buffer.concat([
      signature, ihdr(), chunkBytes(Buffer.from('abcd'), Buffer.alloc(0)),
      chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
    ]))).toThrow('PNG_CHUNK_TYPE');
    expect(() => validatePng(pngFromRaw(Uint8Array.of(0, 0, 0, 0)))).toThrow('PNG_SCANLINE_LENGTH');
    expect(() => validatePng(pngFromCompressed(Buffer.concat([
      deflateSync(Uint8Array.of(0, 0, 0, 0, 0)), Buffer.from([1, 2, 3]),
    ])))).toThrow('PNG_COMPRESSED_TRAILING_DATA');
  });

  it('rejects dimension, pixel, compressed and decoded bomb inputs before unbounded allocation', () => {
    expect(() => validatePng(pngFromRaw(Uint8Array.of(0), ihdr(PNG_LIMITS.maximumDimension + 1, 1))))
      .toThrow('PNG_DIMENSIONS');
    expect(() => validatePng(pngFromRaw(Uint8Array.of(0), ihdr(8_000, 8_001))))
      .toThrow('PNG_PIXEL_LIMIT');
    const compressedBomb = Buffer.alloc(PNG_LIMITS.maximumCompressedBytes + 1);
    expect(() => validatePng(Buffer.concat([
      signature, ihdr(), chunk('IDAT', compressedBomb), chunk('IEND', Buffer.alloc(0)),
    ]))).toThrow('PNG_COMPRESSED_LIMIT');
    const expanded = Buffer.alloc(401);
    expect(() => validatePng(pngFromCompressed(deflateSync(expanded), ihdr(100, 1)), {
      maximumInflateOutputBytes: 64,
    })).toThrow('PNG_INFLATE');
    const validCompressed = deflateSync(Uint8Array.of(0, 0, 0, 0, 255));
    expect(() => validatePng(pngFromCompressed(validCompressed.subarray(0, validCompressed.length - 1))))
      .toThrow('PNG_INFLATE');
  });
});
