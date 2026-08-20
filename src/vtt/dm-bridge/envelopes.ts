import type { EncounterSessionId } from '../../combat/values';

export const TRANSPORT_ENVELOPE_VERSION = 1 as const;
export const DISCORD_ACK_DEADLINE_MS = 3_000 as const;
export const DISCORD_INTERACTION_TOKEN_MAX_AGE_MS = 15 * 60 * 1_000;
export const DISCORD_CONTENT_LIMIT = 2_000 as const;
export const DISCORD_EMBED_COUNT_LIMIT = 10 as const;
export const DISCORD_EMBED_AGGREGATE_LIMIT = 6_000 as const;

export type VisibilityClass = 'player' | 'dm' | 'public';

export type RenderPart =
  | { readonly kind: 'content'; readonly text: string }
  | {
      readonly kind: 'embed';
      readonly title?: string;
      readonly description: string;
    };

export interface EnvelopeTiming {
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly acknowledgement: {
    readonly acknowledgedAtMs: number;
    readonly deferred: boolean;
  } | null;
  readonly interactionTokenIssuedAtMs: number | null;
}

export interface TransportEnvelope<Payload> {
  readonly version: typeof TRANSPORT_ENVELOPE_VERSION;
  readonly kind: 'command' | 'projection';
  readonly envelopeId: string;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly replySequence: number;
  readonly chunkSequence: number;
  readonly chunkCount: number;
  readonly visibility: VisibilityClass;
  readonly timing: EnvelopeTiming;
  readonly renderParts: readonly RenderPart[];
  readonly payload: Payload;
}

function length(value: string): number {
  return [...value].length;
}

function splitText(value: string, limit: number): readonly string[] {
  const characters = [...value];
  if (characters.length === 0) return [''];
  const parts: string[] = [];
  for (let index = 0; index < characters.length; index += limit) {
    parts.push(characters.slice(index, index + limit).join(''));
  }
  return parts;
}

function embedCharacters(embed: Extract<RenderPart, { readonly kind: 'embed' }>): number {
  return length(embed.title ?? '') + length(embed.description);
}

function validateTiming(timing: EnvelopeTiming): void {
  if (
    !Number.isSafeInteger(timing.issuedAtMs) ||
    !Number.isSafeInteger(timing.expiresAtMs) ||
    timing.expiresAtMs < timing.issuedAtMs
  ) {
    throw new TypeError('Envelope timing must contain an ordered millisecond validity window.');
  }
  if (
    timing.acknowledgement !== null &&
    (
      !Number.isSafeInteger(timing.acknowledgement.acknowledgedAtMs) ||
      timing.acknowledgement.acknowledgedAtMs < timing.issuedAtMs ||
      timing.acknowledgement.acknowledgedAtMs - timing.issuedAtMs > DISCORD_ACK_DEADLINE_MS
    )
  ) {
    throw new RangeError('Interaction acknowledgement or defer exceeded 3 seconds.');
  }
  if (
    timing.interactionTokenIssuedAtMs !== null &&
    (
      !Number.isSafeInteger(timing.interactionTokenIssuedAtMs) ||
      timing.interactionTokenIssuedAtMs < 0
    )
  ) {
    throw new TypeError('Interaction token issue time must be a non-negative safe integer.');
  }
}

export function interactionTokenUsable(timing: EnvelopeTiming, nowMs: number): boolean {
  const issued = timing.interactionTokenIssuedAtMs;
  return issued !== null && nowMs >= issued && nowMs - issued <= DISCORD_INTERACTION_TOKEN_MAX_AGE_MS;
}

export function assertInteractionTokenUsable(timing: EnvelopeTiming, nowMs: number): void {
  if (!interactionTokenUsable(timing, nowMs)) {
    throw new RangeError('Interaction token is expired or not yet valid.');
  }
}

function renderChunks(parts: readonly RenderPart[]): readonly (readonly RenderPart[])[] {
  const chunks: RenderPart[][] = [];
  let embedChunk: Extract<RenderPart, { readonly kind: 'embed' }>[] = [];
  let embedLength = 0;
  const flushEmbeds = () => {
    if (embedChunk.length === 0) return;
    chunks.push(embedChunk);
    embedChunk = [];
    embedLength = 0;
  };
  for (const part of parts) {
    if (part.kind === 'content') {
      flushEmbeds();
      for (const text of splitText(part.text, DISCORD_CONTENT_LIMIT)) {
        chunks.push([{ kind: 'content', text }]);
      }
      continue;
    }
    const partLength = embedCharacters(part);
    if (partLength > DISCORD_EMBED_AGGREGATE_LIMIT) {
      throw new RangeError('A single embed exceeds the 6,000-character aggregate boundary.');
    }
    if (
      embedChunk.length === DISCORD_EMBED_COUNT_LIMIT ||
      embedLength + partLength > DISCORD_EMBED_AGGREGATE_LIMIT
    ) {
      flushEmbeds();
    }
    embedChunk.push(part);
    embedLength += partLength;
  }
  flushEmbeds();
  return chunks.length === 0 ? [[]] : chunks;
}

export function chunkEnvelope<Payload>(
  input: Omit<TransportEnvelope<Payload>, 'chunkSequence' | 'chunkCount' | 'renderParts'> & {
    readonly renderParts: readonly RenderPart[];
  },
): readonly TransportEnvelope<Payload>[] {
  validateTiming(input.timing);
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
    throw new TypeError('Envelope expectedRevision must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(input.replySequence) || input.replySequence < 0) {
    throw new TypeError('Envelope replySequence must be a non-negative safe integer.');
  }
  const chunks = renderChunks(input.renderParts);
  return chunks.map((renderParts, index) => ({
    ...input,
    chunkSequence: index,
    chunkCount: chunks.length,
    renderParts,
  }));
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

/** Transport-neutral idempotency guard for retries and duplicated chunks. */
export class EnvelopeInbox {
  readonly #accepted = new Map<string, string>();

  accept(
    envelope: TransportEnvelope<unknown>,
    currentRevision: number,
    nowMs: number,
  ): 'accepted' | 'duplicate' {
    if (envelope.version !== TRANSPORT_ENVELOPE_VERSION) throw new TypeError('Unsupported envelope version.');
    if (envelope.expectedRevision !== currentRevision) throw new RangeError('Envelope expected revision is stale.');
    if (
      envelope.chunkCount < 1 ||
      envelope.chunkSequence < 0 ||
      envelope.chunkSequence >= envelope.chunkCount
    ) {
      throw new RangeError('Envelope chunk sequence is outside its declared boundary.');
    }
    validateTiming(envelope.timing);
    if (nowMs < envelope.timing.issuedAtMs || nowMs > envelope.timing.expiresAtMs) {
      throw new RangeError('Envelope is outside its validity window.');
    }
    const key = [
      envelope.encounterId,
      envelope.requestId,
      envelope.replySequence,
      envelope.chunkSequence,
    ].join('|');
    const serialized = canonical(envelope);
    const previous = this.#accepted.get(key);
    if (previous === serialized) return 'duplicate';
    if (previous !== undefined) throw new Error('Idempotency key was reused with different envelope bytes.');
    this.#accepted.set(key, serialized);
    return 'accepted';
  }
}

export const envelopeInternals = { length, splitText, renderChunks, validateTiming };
