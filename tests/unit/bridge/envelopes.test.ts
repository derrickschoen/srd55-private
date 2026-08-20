import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import {
  DISCORD_ACK_DEADLINE_MS,
  DISCORD_CONTENT_LIMIT,
  DISCORD_EMBED_AGGREGATE_LIMIT,
  DISCORD_EMBED_COUNT_LIMIT,
  DISCORD_INTERACTION_TOKEN_MAX_AGE_MS,
  EnvelopeInbox,
  assertInteractionTokenUsable,
  chunkEnvelope,
  type EnvelopeTiming,
  type RenderPart,
} from '../../../src/vtt/dm-bridge/envelopes';

const timing: EnvelopeTiming = {
  issuedAtMs: 10_000,
  expiresAtMs: 20_000,
  acknowledgement: { acknowledgedAtMs: 13_000, deferred: true },
  interactionTokenIssuedAtMs: 10_000,
};

function chunks(renderParts: readonly RenderPart[]) {
  return chunkEnvelope({
    version: 1,
    kind: 'projection',
    envelopeId: 'envelope:boundaries',
    encounterId: encounterSessionId('encounter:boundaries'),
    requestId: 'request:boundaries',
    expectedRevision: 8,
    replySequence: 0,
    visibility: 'player',
    timing,
    renderParts,
    payload: { status: 'ok' },
  });
}

describe('transport-neutral Discord-ready envelopes', () => {
  it.each([
    [DISCORD_CONTENT_LIMIT - 1, 1, [DISCORD_CONTENT_LIMIT - 1]],
    [DISCORD_CONTENT_LIMIT, 1, [DISCORD_CONTENT_LIMIT]],
    [DISCORD_CONTENT_LIMIT + 1, 2, [DISCORD_CONTENT_LIMIT, 1]],
    [DISCORD_CONTENT_LIMIT * 2, 2, [DISCORD_CONTENT_LIMIT, DISCORD_CONTENT_LIMIT]],
    [DISCORD_CONTENT_LIMIT * 2 + 1, 3, [DISCORD_CONTENT_LIMIT, DISCORD_CONTENT_LIMIT, 1]],
  ])('CONTENT-BOUNDARY-%i chunks into %i ordered replies', (characters, count, lengths) => {
    const result = chunks([{ kind: 'content', text: 'x'.repeat(characters) }]);
    expect(result).toHaveLength(count);
    expect(result.map((envelope) => envelope.chunkSequence)).toEqual(
      Array.from({ length: count }, (_, index) => index),
    );
    expect(result.map((envelope) => envelope.chunkCount)).toEqual(Array(count).fill(count));
    expect(result.map((envelope) => {
      const part = envelope.renderParts[0];
      return part?.kind === 'content' ? [...part.text].length : -1;
    })).toEqual(lengths);
  });

  it('M49-DISCORD-2001-SPLIT never emits an ordinary content part over 2,000 characters', () => {
    const result = chunks([{ kind: 'content', text: '🙂'.repeat(2_001) }]);
    expect(result).toHaveLength(2);
    expect(result.every((envelope) => envelope.renderParts.every((part) =>
      part.kind !== 'content' || [...part.text].length <= DISCORD_CONTENT_LIMIT,
    ))).toBe(true);
  });

  it('EMBED-BOUNDARIES split at 10 embeds and 6,000 aggregate characters', () => {
    const eleven = chunks(Array.from({ length: DISCORD_EMBED_COUNT_LIMIT + 1 }, (_, index) => ({
      kind: 'embed' as const,
      title: `E${index}`,
      description: 'x',
    })));
    expect(eleven.map((envelope) => envelope.renderParts.length)).toEqual([10, 1]);

    const aggregate = chunks([
      { kind: 'embed', description: 'a'.repeat(DISCORD_EMBED_AGGREGATE_LIMIT) },
      { kind: 'embed', description: 'b' },
    ]);
    expect(aggregate.map((envelope) => envelope.renderParts.length)).toEqual([1, 1]);
    expect(() => chunks([{ kind: 'embed', description: 'x'.repeat(DISCORD_EMBED_AGGREGATE_LIMIT + 1) }])).toThrow('6,000');
  });

  it('ACK-BOUNDARY allows exactly 3 seconds and rejects one millisecond later', () => {
    expect(chunks([{ kind: 'content', text: 'ok' }])).toHaveLength(1);
    expect(() => chunkEnvelope({
      ...chunks([{ kind: 'content', text: 'ok' }])[0]!,
      timing: {
        ...timing,
        acknowledgement: {
          acknowledgedAtMs: timing.issuedAtMs + DISCORD_ACK_DEADLINE_MS + 1,
          deferred: false,
        },
      },
      renderParts: [{ kind: 'content', text: 'late' }],
    })).toThrow('3 seconds');
  });

  it('M50-EXPIRED-INTERACTION-TOKEN-REFUSED allows 15 minutes exactly and rejects the next millisecond', () => {
    expect(() => assertInteractionTokenUsable(timing, 10_000 + DISCORD_INTERACTION_TOKEN_MAX_AGE_MS)).not.toThrow();
    expect(() => assertInteractionTokenUsable(timing, 10_001 + DISCORD_INTERACTION_TOKEN_MAX_AGE_MS)).toThrow('expired');
  });

  it('ENVELOPE-IDEMPOTENCY accepts an identical retry and refuses key reuse with changed bytes', () => {
    const envelope = chunks([{ kind: 'content', text: 'same' }])[0]!;
    const inbox = new EnvelopeInbox();
    expect(inbox.accept(envelope, 8, 15_000)).toBe('accepted');
    expect(inbox.accept(envelope, 8, 15_000)).toBe('duplicate');
    expect(() => inbox.accept({ ...envelope, payload: { status: 'changed' } }, 8, 15_000)).toThrow('different envelope bytes');
    expect(() => new EnvelopeInbox().accept(envelope, 9, 15_000)).toThrow('stale');
    expect(() => new EnvelopeInbox().accept(envelope, 8, 20_001)).toThrow('validity window');
  });
});
