export type DecodePartyDocumentResult =
  | { readonly kind: 'success'; readonly document: unknown }
  | {
      readonly kind: 'invalid-document';
      readonly reason: 'invalid-utf8' | 'invalid-json';
    };

const encoder = new TextEncoder();

export function encodePartyDocument(document: unknown): Uint8Array {
  const json = JSON.stringify(document, null, 2);
  if (json === undefined) {
    throw new TypeError('Party documents must be JSON-serializable values');
  }
  return encoder.encode(`${json}\n`);
}

export function decodePartyDocument(
  bytes: Uint8Array,
): DecodePartyDocumentResult {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return { kind: 'invalid-document', reason: 'invalid-utf8' };
  }

  try {
    const document: unknown = JSON.parse(text);
    return { kind: 'success', document };
  } catch {
    return { kind: 'invalid-document', reason: 'invalid-json' };
  }
}
