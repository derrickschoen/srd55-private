import { inflateSync } from 'node:zlib';
import { crc32 } from '../../src/assets/png.ts';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const PNG_LIMITS = {
  maximumDimension: 8_192,
  maximumPixels: 64_000_000,
  maximumCompressedBytes: 64 * 1024 * 1024,
  maximumDecodedBytes: 256 * 1024 * 1024,
} as const;

export interface ValidatedPng {
  readonly width: number;
  readonly height: number;
  readonly hasTransparency: boolean;
  readonly decodedBytes: number;
  readonly compressedBytes: number;
}

function invalid(code: string): never {
  throw new Error(`PNG_${code}`);
}

function checkedProduct(left: number, right: number, code: string): number {
  const product = left * right;
  if (!Number.isSafeInteger(product)) invalid(code);
  return product;
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
    ? left
    : aboveDistance <= upperLeftDistance ? above : upperLeft;
}

export function validatePng(bytes: Uint8Array): ValidatedPng {
  const png = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (png.length < SIGNATURE.length || !png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) invalid('SIGNATURE');
  let offset = SIGNATURE.length;
  let width = 0;
  let height = 0;
  let chunkIndex = 0;
  let ihdrCount = 0;
  let idatStarted = false;
  let idatEnded = false;
  let iendSeen = false;
  let paletteSeen = false;
  let compressedBytes = 0;
  const compressedParts: Buffer[] = [];
  while (offset < png.length) {
    if (iendSeen) invalid('TRAILING_BYTES');
    if (png.length - offset < 12) invalid('TRUNCATED_CHUNK');
    const length = png.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (!Number.isSafeInteger(crcEnd) || dataEnd < dataStart || crcEnd > png.length) invalid('CHUNK_LENGTH');
    const typeBytes = png.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString('ascii');
    if (!/^[A-Za-z]{4}$/u.test(type)) invalid('CHUNK_TYPE');
    const expectedCrc = png.readUInt32BE(dataEnd);
    const actualCrc = crc32(png.subarray(offset + 4, dataEnd)) >>> 0;
    if (expectedCrc !== actualCrc) invalid('CRC');
    const data = png.subarray(dataStart, dataEnd);
    if (chunkIndex === 0 && type !== 'IHDR') invalid('IHDR_NOT_FIRST');
    if (type === 'IHDR') {
      ihdrCount += 1;
      if (ihdrCount !== 1 || chunkIndex !== 0 || length !== 13) invalid('IHDR');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (width === 0 || height === 0 || width > PNG_LIMITS.maximumDimension || height > PNG_LIMITS.maximumDimension) invalid('DIMENSIONS');
      const pixels = checkedProduct(width, height, 'PIXEL_OVERFLOW');
      if (pixels > PNG_LIMITS.maximumPixels) invalid('PIXEL_LIMIT');
      if (data[8] !== 8 || data[9] !== 6 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) invalid('IHDR_FORMAT');
    } else if (type === 'IDAT') {
      if (ihdrCount !== 1 || idatEnded) invalid('IDAT_ORDER');
      idatStarted = true;
      compressedBytes += length;
      if (!Number.isSafeInteger(compressedBytes) || compressedBytes > PNG_LIMITS.maximumCompressedBytes) invalid('COMPRESSED_LIMIT');
      compressedParts.push(data);
    } else {
      if (idatStarted) idatEnded = true;
      if (type === 'IEND') {
        if (!idatStarted || length !== 0) invalid('IEND');
        iendSeen = true;
        if (crcEnd !== png.length) invalid('TRAILING_BYTES');
      } else if (type === 'PLTE') {
        if (paletteSeen || idatStarted || length === 0 || length % 3 !== 0 || length > 768) invalid('PLTE');
        paletteSeen = true;
      } else if ((typeBytes[0] ?? 0) >= 65 && (typeBytes[0] ?? 0) <= 90) {
        invalid('UNKNOWN_CRITICAL_CHUNK');
      }
    }
    offset = crcEnd;
    chunkIndex += 1;
  }
  if (ihdrCount !== 1 || !iendSeen || !idatStarted) invalid('INCOMPLETE');
  const rowBytes = checkedProduct(width, 4, 'ROW_OVERFLOW');
  const scanlineBytes = rowBytes + 1;
  if (!Number.isSafeInteger(scanlineBytes)) invalid('ROW_OVERFLOW');
  const decodedLength = checkedProduct(scanlineBytes, height, 'DECODED_OVERFLOW');
  if (decodedLength > PNG_LIMITS.maximumDecodedBytes) invalid('DECODED_LIMIT');
  let inflated: Buffer;
  let consumed: number;
  try {
    const result: unknown = inflateSync(Buffer.concat(compressedParts), {
      maxOutputLength: PNG_LIMITS.maximumDecodedBytes,
      info: true,
    });
    if (typeof result !== 'object' || result === null) invalid('INFLATE');
    const buffer = Reflect.get(result, 'buffer');
    const engine = Reflect.get(result, 'engine');
    const bytesWritten = typeof engine === 'object' && engine !== null ? Reflect.get(engine, 'bytesWritten') : null;
    if (!Buffer.isBuffer(buffer) || typeof bytesWritten !== 'number') invalid('INFLATE');
    inflated = buffer;
    consumed = bytesWritten;
  } catch {
    invalid('INFLATE');
  }
  if (inflated.length !== decodedLength) invalid('SCANLINE_LENGTH');
  if (consumed !== compressedBytes) invalid('COMPRESSED_TRAILING_DATA');
  const prior = Buffer.alloc(rowBytes);
  const current = Buffer.alloc(rowBytes);
  let sourceOffset = 0;
  let hasTransparency = false;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    if (filter === undefined || filter > 4) invalid('FILTER');
    sourceOffset += 1;
    for (let column = 0; column < rowBytes; column += 1) {
      const raw = inflated[sourceOffset + column];
      if (raw === undefined) invalid('SCANLINE_LENGTH');
      const left = column >= 4 ? current[column - 4] ?? 0 : 0;
      const above = prior[column] ?? 0;
      const upperLeft = column >= 4 ? prior[column - 4] ?? 0 : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? above
            : filter === 3 ? Math.floor((left + above) / 2)
              : paeth(left, above, upperLeft);
      current[column] = (raw + predictor) & 0xff;
    }
    for (let alpha = 3; alpha < rowBytes; alpha += 4) if (current[alpha] !== 255) hasTransparency = true;
    current.copy(prior);
    sourceOffset += rowBytes;
  }
  return { width, height, hasTransparency, decodedBytes: decodedLength, compressedBytes };
}
