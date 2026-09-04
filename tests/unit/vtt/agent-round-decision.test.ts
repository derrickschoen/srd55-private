import { describe, expect, expectTypeOf, it } from 'vitest';
import { combatantId, type CombatantId } from '../../../src/combat/values';
import {
  assertStrictStructuredOutputSchema,
  bindDecision,
  createDecisionCatalog,
  decisionActorIndex,
  decisionOptionIndex,
  finalIndicesDecisionSchema,
  minimalRoundSubmission,
  normalizeIndexDecision,
  renderDecisionCatalog,
  strictStructuredOutputSchemaViolations,
  type DecisionActorIndex,
  type OptionIndex,
  type RawIdDecision,
} from '../../../src/vtt/agent-round-decision';
import {
  ENGINE_OVERRIDE_JUSTIFICATION_KINDS,
  engineOptionId,
  enginePlayToken,
  type EngineTurnProposal,
} from '../../../src/vtt/turn-proposal';
import { decisionReasonProblem } from '../../../src/vtt/decision-reason';

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
    rationale: null,
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

function schemaRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be a schema object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function generatedOverrideKinds(schema: unknown): readonly string[] {
  const rootProperties = schemaRecord(schemaRecord(schema, 'root')['properties'], 'root properties');
  const proposalProperties = schemaRecord(
    schemaRecord(rootProperties['proposals'], 'proposals')['properties'],
    'proposal properties',
  );
  const actorProperties = schemaRecord(
    schemaRecord(proposalProperties['combatant:alpha'], 'actor proposal')['properties'],
    'actor properties',
  );
  const variants = schemaRecord(actorProperties['override'], 'override')['anyOf'];
  if (!Array.isArray(variants)) throw new TypeError('Override schema must contain anyOf variants.');
  return variants.flatMap((variant) => {
    const variantSchema = schemaRecord(variant, 'override variant');
    if (variantSchema['type'] === 'null') return [];
    const properties = schemaRecord(variantSchema['properties'], 'override variant properties');
    const enumeration = schemaRecord(properties['kind'], 'override kind')['enum'];
    if (!Array.isArray(enumeration)) throw new TypeError('Override kind must use enum.');
    return enumeration.filter((kind): kind is string => typeof kind === 'string');
  });
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
          fallback_option_id: 'option:alpha:fallback',
          reason: 'The recommendation retains pressure without wasting resources.',
          override_justification: null,
        },
        {
          actor_id: 'combatant:beta', expected_revision: 7,
          primary_option_id: 'option:beta:recommendation',
          fallback_option_id: 'option:beta:fallback',
          reason: 'The recommendation keeps the second actor on the same tactical line.',
          override_justification: null,
        },
      ],
    });
  });

  it('accepts a complete snake_case decision into the same canonical binding (mutation: swap dialect mappings)', () => {
    const value = catalog();
    const normalized = normalizeIndexDecision({
      catalog_digest: value.digest,
      reaction_guidance: { inherit: true },
      rationale: null,
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
      rationale: null,
      proposals: {},
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'dialect_mismatch' });
    expect(normalizeIndexDecision({
      catalogDigest: value.digest,
      reaction_guidance: { inherit: true },
      rationale: null,
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
      rationale: null,
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

  it('renders index 0 as the engine recommendation and satisfies every strict structured-output invariant', () => {
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
    const schema = finalIndicesDecisionSchema(value);
    expect(strictStructuredOutputSchemaViolations(schema)).toEqual([]);
    expect(() => assertStrictStructuredOutputSchema(schema)).not.toThrow();
    expect(strictStructuredOutputSchemaViolations({
      type: 'object', additionalProperties: false,
      properties: { requiredValue: { type: 'string', maxLength: 12 }, optionalValue: { type: 'string' } },
      required: ['requiredValue'],
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'required_properties_mismatch' }),
      expect.objectContaining({ kind: 'forbidden_keyword', keyword: 'maxLength' }),
    ]));
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

  it('binds every engine override kind from the shared closed contract', () => {
    const value = catalog();
    const raw = validRaw(value);
    const overrides: readonly NonNullable<EngineTurnProposal['overrideJustification']>[] = [
      { kind: 'objective' },
      { kind: 'morale' },
      { kind: 'roleplay' },
      { kind: 'resource_conservation' },
      { kind: 'unknown_engine_gap' },
      { kind: 'engine_play', token: enginePlayToken('engine-play:test') },
      { kind: 'missing_metric', id: 'expected_damage_milli' },
    ];
    for (const override of overrides) {
      const normalized = normalizeIndexDecision({
        ...raw,
        proposals: {
          ...raw.proposals,
          'combatant:alpha': { ...raw.proposals['combatant:alpha'], override },
        },
      }, value, null);
      if (normalized.kind !== 'accepted') throw new Error(`Expected accepted decision, got ${normalized.code}.`);
      expect(bindDecision(value, normalized.decision, null).proposals[0]?.overrideJustification).toEqual(override);
    }
  });

  it('emits exactly the engine override kind list (mutation: drop one kind from the generator)', () => {
    expect(generatedOverrideKinds(finalIndicesDecisionSchema(catalog())))
      .toEqual(ENGINE_OVERRIDE_JUSTIFICATION_KINDS);
  });

  it('keeps index, reason, rationale, and digest bounds in normalization', () => {
    const value = catalog();
    const raw = validRaw(value);
    expect(normalizeIndexDecision({
      ...raw,
      proposals: {
        ...raw.proposals,
        'combatant:alpha': { ...raw.proposals['combatant:alpha'], reason: '' },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'REASON_REQUIRED' });
    expect(normalizeIndexDecision({
      ...raw,
      proposals: {
        ...raw.proposals,
        'combatant:alpha': { ...raw.proposals['combatant:alpha'], primaryOptionIndex: 2 },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'unknown_option' });
    expect(normalizeIndexDecision({
      ...raw,
      proposals: {
        ...raw.proposals,
        'combatant:alpha': { ...raw.proposals['combatant:alpha'], reason: 'r'.repeat(241) },
      },
    }, value, null)).toMatchObject({ kind: 'rejected', code: 'invalid_shape' });
    expect(normalizeIndexDecision({ ...raw, rationale: 'r'.repeat(601) }, value, null))
      .toMatchObject({ kind: 'rejected', code: 'invalid_shape' });
    expect(normalizeIndexDecision({ ...raw, catalogDigest: 'wrong-digest' }, value, null))
      .toMatchObject({ kind: 'rejected', code: 'stale_catalog' });
  });

  it('applies the shared semantic reason gate to structured-final decisions', () => {
    const value = catalog();
    const raw = validRaw(value);
    const gate = {
      validate: (_actorId: CombatantId, reason: string) => decisionReasonProblem(reason) === null
        ? { kind: 'accepted' as const }
        : { kind: 'rejected' as const, code: 'REASON_REQUIRED' as const },
    };

    expect(normalizeIndexDecision({
      ...raw,
      proposals: {
        ...raw.proposals,
        'combatant:alpha': {
          ...raw.proposals['combatant:alpha'],
          reason: 'Use the offered legal option for this actor.',
        },
      },
    }, value, null, gate)).toMatchObject({ kind: 'rejected', code: 'REASON_REQUIRED' });
    expect(normalizeIndexDecision(raw, value, null, gate)).toMatchObject({ kind: 'accepted' });
  });

  it('keeps raw id-shaped ingress unassignable to engine proposals (compile-only mutation: pass raw data to submit)', () => {
    expectTypeOf<RawIdDecision>().not.toMatchTypeOf<EngineTurnProposal>();
  });
});
