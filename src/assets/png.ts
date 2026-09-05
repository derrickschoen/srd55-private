/**
 * A dependency-free PNG encoder (8-bit RGBA, no interlace) with a real
 * DEFLATE (LZ77 + fixed Huffman) so a 64×64 tile stays a few kilobytes as a
 * data URI. Pure function of its input: same bytes in → same bytes out.
 */

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65_521;
    b = (b + a) % 65_521;
  }
  return ((b << 16) | a) >>> 0;
}

class BitWriter {
  private readonly bytes: number[] = [];
  private accumulator = 0;
  private count = 0;

  /** Writes `length` bits of `value`, least-significant bit first (DEFLATE order). */
  bits(value: number, length: number): void {
    for (let index = 0; index < length; index += 1) {
      this.accumulator |= ((value >>> index) & 1) << this.count;
      this.count += 1;
      if (this.count === 8) {
        this.bytes.push(this.accumulator);
        this.accumulator = 0;
        this.count = 0;
      }
    }
  }

  /** Huffman codes are packed most-significant bit first. */
  code(value: number, length: number): void {
    for (let index = length - 1; index >= 0; index -= 1) this.bits((value >>> index) & 1, 1);
  }

  finish(): Uint8Array {
    if (this.count > 0) {
      this.bytes.push(this.accumulator);
      this.accumulator = 0;
      this.count = 0;
    }
    return Uint8Array.from(this.bytes);
  }
}

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258] as const;
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0] as const;
const DISTANCE_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12_289, 16_385, 24_577] as const;
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13] as const;

const WINDOW_SIZE = 32_768;
const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MAX_CHAIN = 128;
const HASH_BITS = 15;

function writeLiteralOrLength(writer: BitWriter, symbol: number): void {
  if (symbol <= 143) writer.code(0x30 + symbol, 8);
  else if (symbol <= 255) writer.code(0x190 + (symbol - 144), 9);
  else if (symbol <= 279) writer.code(symbol - 256, 7);
  else writer.code(0xc0 + (symbol - 280), 8);
}

function writeLength(writer: BitWriter, length: number): void {
  let index = LENGTH_BASE.length - 1;
  while (LENGTH_BASE[index]! > length) index -= 1;
  writeLiteralOrLength(writer, 257 + index);
  const extra = LENGTH_EXTRA[index]!;
  if (extra > 0) writer.bits(length - LENGTH_BASE[index]!, extra);
}

function writeDistance(writer: BitWriter, distance: number): void {
  let index = DISTANCE_BASE.length - 1;
  while (DISTANCE_BASE[index]! > distance) index -= 1;
  writer.code(index, 5);
  const extra = DISTANCE_EXTRA[index]!;
  if (extra > 0) writer.bits(distance - DISTANCE_BASE[index]!, extra);
}

function hash3(input: Uint8Array, position: number): number {
  const value = (input[position]! << 16) | (input[position + 1]! << 8) | input[position + 2]!;
  return (Math.imul(value, 0x9e3779b1) >>> (32 - HASH_BITS)) & ((1 << HASH_BITS) - 1);
}

/** Single final fixed-Huffman block; greedy LZ77 over hash chains. */
export function deflateFixed(input: Uint8Array): Uint8Array {
  const writer = new BitWriter();
  writer.bits(1, 1);
  writer.bits(1, 2);
  const head = new Int32Array(1 << HASH_BITS).fill(-1);
  const previous = new Int32Array(input.length).fill(-1);
  let position = 0;
  const insert = (at: number): void => {
    if (at + MIN_MATCH > input.length) return;
    const bucket = hash3(input, at);
    previous[at] = head[bucket]!;
    head[bucket] = at;
  };
  while (position < input.length) {
    let bestLength = 0;
    let bestDistance = 0;
    if (position + MIN_MATCH <= input.length) {
      let candidate = head[hash3(input, position)]!;
      let chain = 0;
      const limit = Math.min(MAX_MATCH, input.length - position);
      while (candidate >= 0 && chain < MAX_CHAIN && position - candidate <= WINDOW_SIZE) {
        let length = 0;
        while (length < limit && input[candidate + length] === input[position + length]) length += 1;
        if (length > bestLength) {
          bestLength = length;
          bestDistance = position - candidate;
          if (length === limit) break;
        }
        candidate = previous[candidate]!;
        chain += 1;
      }
    }
    if (bestLength >= MIN_MATCH) {
      writeLength(writer, bestLength);
      writeDistance(writer, bestDistance);
      for (let offset = 0; offset < bestLength; offset += 1) insert(position + offset);
      position += bestLength;
    } else {
      writeLiteralOrLength(writer, input[position]!);
      insert(position);
      position += 1;
    }
  }
  writeLiteralOrLength(writer, 256);
  return writer.finish();
}

export function zlibCompress(input: Uint8Array): Uint8Array {
  const body = deflateFixed(input);
  const output = new Uint8Array(2 + body.length + 4);
  output[0] = 0x78;
  output[1] = 0x01;
  output.set(body, 2);
  const checksum = adler32(input);
  const tail = 2 + body.length;
  output[tail] = (checksum >>> 24) & 0xff;
  output[tail + 1] = (checksum >>> 16) & 0xff;
  output[tail + 2] = (checksum >>> 8) & 0xff;
  output[tail + 3] = checksum & 0xff;
  return output;
}

function uint32(value: number): Uint8Array {
  return Uint8Array.of((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function chunk(type: string, payload: Uint8Array): Uint8Array {
  const typeBytes = Uint8Array.from(type, (character) => character.charCodeAt(0));
  const body = new Uint8Array(typeBytes.length + payload.length);
  body.set(typeBytes, 0);
  body.set(payload, typeBytes.length);
  const output = new Uint8Array(4 + body.length + 4);
  output.set(uint32(payload.length), 0);
  output.set(body, 4);
  output.set(uint32(crc32(body)), 4 + body.length);
  return output;
}

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error('RGBA buffer does not match the PNG dimensions.');
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const header = new Uint8Array(13);
  header.set(uint32(width), 0);
  header.set(uint32(height), 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const parts = [PNG_SIGNATURE, chunk('IHDR', header), chunk('IDAT', zlibCompress(raw)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function pngDimensions(png: Uint8Array): { readonly width: number; readonly height: number } {
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (png[index] !== PNG_SIGNATURE[index]) throw new Error('Not a PNG.');
  }
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 without Buffer so the same code runs in the browser and in node. */
export function base64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    output += BASE64[(triple >>> 18) & 63]! + BASE64[(triple >>> 12) & 63]!;
    output += b === undefined ? '=' : BASE64[(triple >>> 6) & 63]!;
    output += c === undefined ? '=' : BASE64[triple & 63]!;
  }
  return output;
}
