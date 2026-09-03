import { describe, expect, expectTypeOf, it } from 'vitest';
import { combatantId } from '../../../src/combat/values';
import {
  assertClosedObjectSchema,
  bindDecision,
  createDecisionCatalog,
  decisionActorIndex,
  decisionOptionIndex,
  finalIndicesDecisionSchema,
  minimalRoundSubmission,
  normalizeIndexDecision,
  renderDecisionCatalog,
  type DecisionActorIndex,
  type OptionIndex,
  type RawIdDecision,
} from '../../../src/vtt/agent-round-decision';
import { engineOptionId, type EngineTurnProposal } from '../../../src/vtt/turn-proposal';

function catalog(phase: 'initial' | 'correction' = 'initial') {
  return createDecisionCatalog({
    requestId: 'request:decision-test',
    phase,
    expectedRevision: 7,
    stateDigest: 'a'.repeat(64),
    actors: [
      {
        actorId: combatantId('combatant:alpha'),
        options: [
          { optionId: engineOptionId('option:alpha:recommendation'), label: 'Recommendation' },
          { optionId: engineOptionId('option:alpha:fallback'), label: 'Fallback' },
        ],
      },
      {
        actorId: combatantId('combatant:beta'),
        options: [
          { optionId: engineOptionId('option:beta:recommendation'), label: 'Recommendation' },
          { optionId: engineOptionId('option:beta:fallback'), label: 'Fallback' },
        ],
      },
    ],
  });
}

function validRaw(value: ReturnType<typeof catalog>) {
  return {
    catalogDigest: value.digest,
    reaction_guidance: { inherit: true } as const,
    proposals: {
      'combatant:alpha': {
        primaryOptionIndex: 0, fallbackOptionIndex: 1, override: null,
        reason: 'The recommendation retains pressure without wasting resources.',
      },
      'combatant:beta': {
        primaryOptionIndex: 0, fallbackOptionIndex: 1, override: null,
        reason: 'The recommendation keeps the second actor on the same tactical line.',
      },
    },
  };
}

describe('A3 indexed round decisions', () => {
  it('maps each checked index to the exact frozen option id (mutation: map index n to n+1)', () => {
    const value = catalog();
    const normalized = normalizeIndexDecision(validRaw(value), value, null);
    if (normalized.kind !== 'accepted') throw new Error(`Expected accepted decision, got ${normalized.code}.`);

    expect(minimalRoundSubmission(bindDecision(value, normalized.decision, null))).toEqual({
      proposals: [
        {
          actor_id: 'combatant:alpha', expected_revision: 7,
          primary_option_id: 'option:alpha:recommendation',
          fallback_option_id: 'option:alpha:fallback', override_justification: null,
        },
        {
          actor_id: 'combatant:beta', expected_revision: 7,
          primary_option_id: 'option:beta:recommendation',
          fallback_option_id: 'option:beta:fallback', override_justification: null,
        },
      ],
    });
  });

  it('accepts a complete snake_case decision into the same canonical binding (mutation: swap dialect mappings)', () => {
    const value = catalog();
    const normalized = normalizeIndexDecision({
      catalog_digest: value.digest,
      reaction_guidance: { inherit: true },
      proposals: {
        'combatant:alpha': {
          primary_option_index: 0, fallback_option_index: 1, override: null,
          reason: 'The first actor uses the engine recommendation.',
        },
        'combatant:beta': {
          primary_option_index: 0, fallback_option_index: 1, override: null,
          reason: 'The second actor uses the engine recommendation.',
        },
      },
    }, value, null);
    if (normalized.kind !== 'accepted') throw new Error(`Expected accepted decision, got ${normalized.code}.`);

    expect(bindDecision(value, normalized.decision, null).proposals.map((proposal) => proposal.primaryOptionId))
      .toEqual(['option:alpha:recommendation', 'option:beta:recommendation']);
  });

  it('rejects mixed or duplicate dialect keys (mutation: accept a mixed dialect)', () => {
    const value = catalog();
    expect(normalizeIndexDecision({
      catalogDigest: value.digest,
      catalog_digest: value.digest,
      reaction_guidance: { inherit: true },
      proposals: {},
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'dialect_mismatch' });
    expect(normalizeIndexDecision({
      catalogDigest: value.digest,
      reaction_guidance: { inherit: true },
      proposals: {
        'combatant:alpha': {
          primary_option_index: 0, fallback_option_index: 1, override: null,
          reason: 'Mixed dialect.',
        },
        'combatant:beta': {
          primary_option_index: 0, fallback_option_index: 1, override: null,
          reason: 'Second actor completes coverage.',
        },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'dialect_mismatch' });
  });

  it('rejects named actor, option, and fallback errors', () => {
    const value = catalog();
    const raw = validRaw(value);
    expect(normalizeIndexDecision({ ...raw, proposals: { 'combatant:alpha': raw.proposals['combatant:alpha'] } }, value, null))
      .toMatchObject({ kind: 'rejected', code: 'missing_actor' });
    expect(normalizeIndexDecision({
      ...raw, proposals: {
        ...raw.proposals,
        'combatant:alpha': { ...raw.proposals['combatant:alpha'], primaryOptionIndex: 2 },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'unknown_option' });
    expect(normalizeIndexDecision({
      ...raw, proposals: {
        ...raw.proposals,
        'combatant:alpha': { ...raw.proposals['combatant:alpha'], fallbackOptionIndex: 0 },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'identical_fallback' });
  });

  it('rejects a decision against a differently ordered rendered catalog (mutation: change ordering between render and bind)', () => {
    const first = catalog();
    const reordered = createDecisionCatalog({
      requestId: first.requestId,
      phase: first.phase,
      expectedRevision: first.expectedRevision,
      stateDigest: first.stateDigest,
      actors: first.actors.map((actor) => ({ ...actor, options: [...actor.options].reverse() })),
    });

    expect(normalizeIndexDecision(validRaw(first), reordered, null))
      .toMatchObject({ kind: 'rejected', code: 'stale_catalog' });
  });

  it('requires null correction fallback in both runtime binding and the generated schema (mutation: permit non-null correction fallback)', () => {
    const value = catalog('correction');
    expect(normalizeIndexDecision({
      catalogDigest: value.digest,
      reaction_guidance: { inherit: true },
      proposals: validRaw(value).proposals,
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'non_null_correction_fallback' });
    expect(finalIndicesDecisionSchema(value)).toMatchObject({
      properties: {
        proposals: {
          properties: {
            'combatant:alpha': { properties: { fallbackOptionIndex: { type: 'null' } } },
          },
        },
      },
    });
  });

  it('renders index 0 as the engine recommendation and closes every nested object schema (mutation: permit an extra nested property)', () => {
    const value = catalog();
    expect(renderDecisionCatalog(value)).toEqual({
      catalogDigest: value.digest,
      recommendation: 'index 0 = engine recommendation',
      actors: [
        {
          actorIndex: 0,
          actorId: 'combatant:alpha',
          options: [{ optionIndex: 0, label: 'Recommendation' }, { optionIndex: 1, label: 'Fallback' }],
        },
        {
          actorIndex: 1,
          actorId: 'combatant:beta',
          options: [{ optionIndex: 0, label: 'Recommendation' }, { optionIndex: 1, label: 'Fallback' }],
        },
      ],
    });
    expect(() => assertClosedObjectSchema(finalIndicesDecisionSchema(value))).not.toThrow();
    expect(() => assertClosedObjectSchema({ type: 'object', properties: { nested: { type: 'object' } } }))
      .toThrow('additionalProperties');
  });

  it('checks brand constructors rather than exporting total number casts (mutation: return a brand for an out-of-range number)', () => {
    const value = catalog();
    const checked = decisionActorIndex(0 as const, value);
    const rejected = decisionActorIndex(2 as const, value);
    expect(typeof checked).toBe('number');
    expect(rejected).toEqual({ kind: 'out_of_range', value: 2, upperExclusive: 2 });
    expectTypeOf<number>().not.toMatchTypeOf<DecisionActorIndex>();
  });

  it('keeps option indices phantom-bound to their checked actor (mutation: use actor alpha option index for actor beta)', () => {
    const value = catalog();
    const alpha = decisionActorIndex(0 as const, value);
    const beta = decisionActorIndex(1 as const, value);
    if (typeof alpha !== 'number' || typeof beta !== 'number') throw new Error('Catalog actor index unexpectedly rejected.');
    const alphaOption = decisionOptionIndex(alpha, 0 as const, 2);
    const betaOption = decisionOptionIndex(beta, 0 as const, 2);
    if (typeof alphaOption !== 'number' || typeof betaOption !== 'number') {
      throw new Error('Catalog option index unexpectedly rejected.');
    }
    expectTypeOf<OptionIndex<typeof alpha>>().not.toMatchTypeOf<OptionIndex<typeof beta>>();
    expect(alphaOption).toBe(0);
    expect(betaOption).toBe(0);
  });

  it('generates actor-keyed required coverage rather than an array (mutation: make one actor optional in schema)', () => {
    expect(finalIndicesDecisionSchema(catalog())).toMatchObject({
      properties: {
        proposals: {
          type: 'object', additionalProperties: false,
          required: ['combatant:alpha', 'combatant:beta'],
        },
      },
    });
  });

  it('requires explicit reaction guidance inheritance (mutation: fill inherited guidance as a default)', () => {
    const value = catalog();
    const raw = validRaw(value);
    expect(normalizeIndexDecision({ ...raw, reaction_guidance: { inherit: false } }, value, null))
      .toMatchObject({ kind: 'rejected', code: 'invalid_shape' });
  });

  it('requires each bounded decision reason before binding (mutation: make reason optional)', () => {
    const value = catalog();
    const raw = validRaw(value);
    expect(normalizeIndexDecision({
      ...raw,
      proposals: {
        ...raw.proposals,
        'combatant:alpha': { ...raw.proposals['combatant:alpha'], reason: '' },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'REASON_REQUIRED' });
    expect(finalIndicesDecisionSchema(value)).toMatchObject({
      properties: {
        proposals: {
          properties: {
            'combatant:alpha': {
              properties: { reason: { maxLength: 240 } },
              required: expect.arrayContaining(['reason']),
            },
          },
        },
      },
    });
  });

  it('keeps raw id-shaped ingress unassignable to engine proposals (compile-only mutation: pass raw data to submit)', () => {
    expectTypeOf<RawIdDecision>().not.toMatchTypeOf<EngineTurnProposal>();
  });
});
