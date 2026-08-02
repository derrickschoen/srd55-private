import { describe, expect, it } from 'vitest';
import {
  decodePartyDocument,
  encodePartyDocument,
} from '../../../src/party/storage/document-bytes';

describe('party document byte boundary', () => {
  it('PARTY-NO-THIRD-SERIALIZATION emits the document itself as indented UTF-8 JSON with one final newline', () => {
    const bytes = encodePartyDocument({
      format: 'character',
      values: ['Ash', 3],
    });
    expect([...bytes]).toEqual([
      123, 10, 32, 32, 34, 102, 111, 114, 109, 97, 116, 34, 58, 32, 34, 99,
      104, 97, 114, 97, 99, 116, 101, 114, 34, 44, 10, 32, 32, 34, 118, 97,
      108, 117, 101, 115, 34, 58, 32, 91, 10, 32, 32, 32, 32, 34, 65, 115,
      104, 34, 44, 10, 32, 32, 32, 32, 51, 10, 32, 32, 93, 10, 125, 10,
    ]);
    expect(new TextDecoder().decode(bytes)).toBe(
      '{\n  "format": "character",\n  "values": [\n    "Ash",\n    3\n  ]\n}\n',
    );
  });

  it('decodes valid JSON as unknown data', () => {
    expect(decodePartyDocument(new TextEncoder().encode('{"value":1}\n'))).toEqual({
      kind: 'success',
      document: { value: 1 },
    });
  });

  it('returns named invalid-document results for fatal UTF-8 and JSON failures', () => {
    expect(decodePartyDocument(new Uint8Array([0xc3, 0x28]))).toEqual({
      kind: 'invalid-document',
      reason: 'invalid-utf8',
    });
    expect(decodePartyDocument(new TextEncoder().encode('{'))).toEqual({
      kind: 'invalid-document',
      reason: 'invalid-json',
    });
  });
});
