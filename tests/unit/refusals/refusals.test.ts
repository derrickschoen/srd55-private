import { describe, expect, it } from 'vitest';
import type {
  CharacterId,
  CharacterItemId,
  CharacterRevision,
  GrantOrdinal,
  GrantRuleKey,
  SourceInstanceId,
} from '../../../src/domain/ids';
import { decodeOutcome } from '../../../src/refusals/decode';
import {
  REFUSALS_WIRE_VERSION,
  ok,
  refused,
} from '../../../src/refusals/outcome';
import {
  assertMintedRefusal,
  attunementSlotsFullRefusal,
  characterArchivedRefusal,
  levelUpRefused,
  revisionConflictRefusal,
  speciesLineageRefused,
  UnmintedRefusalDefect,
  type Refusal,
} from '../../../src/refusals/refusal';
import {
  INCOMPATIBLE_REFUSAL_MESSAGE,
  renderRefusal,
} from '../../../src/refusals/render';

const characterId = 7 as CharacterId;
const expectedRevision = 4 as CharacterRevision;
const actualRevision = 5 as CharacterRevision;
const itemIds = [11, 12, 13] as const;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

describe('refusal factories and renderer', () => {
  it('mints an exact attunement refusal and renders every payload field', () => {
    const input = [
      {
        slot: 1 as const,
        item_id: itemIds[0] as CharacterItemId,
        name: 'Orb',
        not_clone_safe: () => 'must be stripped',
      },
      { slot: 2 as const, item_id: itemIds[1] as CharacterItemId, name: 'Ring' },
      { slot: 3 as const, item_id: itemIds[2] as CharacterItemId, name: 'Rod' },
    ];

    const result = attunementSlotsFullRefusal(3, input);

    expect(result).toEqual({
      kind: 'attunement_slots_full',
      limit: 3,
      occupants: [
        { slot: 1, item_id: 11, name: 'Orb' },
        { slot: 2, item_id: 12, name: 'Ring' },
        { slot: 3, item_id: 13, name: 'Rod' },
      ],
    });
    expect(result.occupants).not.toBe(input);
    expect(result.occupants[0]).not.toBe(input[0]);
    expect(() => assertMintedRefusal(result)).not.toThrow();
    expect(() => structuredClone(result)).not.toThrow();
    expect(renderRefusal(result)).toBe(
      'All 3 attunement slots are full (slot 1: Orb (#11), slot 2: Ring (#12), slot 3: Rod (#13)).',
    );
  });

  it('mints and renders a revision conflict with expected and actual revisions', () => {
    const result = revisionConflictRefusal(expectedRevision, actualRevision);

    expect(result).toEqual({
      kind: 'revision_conflict',
      expected: 4,
      actual: 5,
    });
    expect(renderRefusal(result)).toBe(
      'This character changed from revision 4 to 5. Reload before trying again.',
    );
  });

  it('mints and renders an archived character with its id and revision', () => {
    const result = characterArchivedRefusal(characterId, actualRevision);

    expect(result).toEqual({
      kind: 'character_archived',
      character_id: 7,
      current_revision: 5,
    });
    expect(renderRefusal(result)).toBe(
      'Character #7 is archived at revision 5 and cannot be changed.',
    );
  });

  it('ports and renders every field of both level-up refusal shapes', () => {
    const simple = levelUpRefused({ reason: 'class_not_held' });
    const planned = levelUpRefused({
      reason: 'planned_subchoice_refused',
      subchoice_kind: 'spell',
      index: 2,
      issue: 'spell_not_eligible',
      locator: {
        source: {
          kind: 'existing_source',
          source_instance_id: 19 as SourceInstanceId,
        },
        rule_key: 'known-spell' as GrantRuleKey,
        ordinal: 3 as GrantOrdinal,
      },
    });

    expect(simple).toEqual({
      kind: 'level_up_refused',
      reason: 'class_not_held',
    });
    expect(renderRefusal(simple)).toBe(
      'That class is not held by this character.',
    );
    expect(planned).toEqual({
      kind: 'level_up_refused',
      reason: 'planned_subchoice_refused',
      subchoice_kind: 'spell',
      index: 2,
      issue: 'spell_not_eligible',
      locator: {
        source: { kind: 'existing_source', source_instance_id: 19 },
        rule_key: 'known-spell',
        ordinal: 3,
      },
    });
    expect(renderRefusal(planned)).toBe(
      'Level-up spell choice 2 was refused (spell_not_eligible) at existing_source#19/known-spell/3.',
    );
  });

  it('ports and renders the species-lineage refusal reason', () => {
    const result = speciesLineageRefused('invalid_replaceable_spell');

    expect(result).toEqual({
      kind: 'species_lineage_refused',
      reason: 'invalid_replaceable_spell',
    });
    expect(renderRefusal(result)).toBe('That replaceable spell is invalid.');
  });

  it('rejects a structurally valid refusal that bypassed the factory', () => {
    const smuggled: Refusal = {
      kind: 'revision_conflict',
      expected: expectedRevision,
      actual: actualRevision,
    };

    expect(() => assertMintedRefusal(smuggled)).toThrowError(
      UnmintedRefusalDefect,
    );
    expect(() => refused(smuggled)).toThrowError(UnmintedRefusalDefect);
  });

  it('mints ok and refused outcome envelopes', () => {
    const refusal = speciesLineageRefused('invalid_option');

    expect(ok('saved')).toEqual({ kind: 'ok', value: 'saved' });
    expect(refused(refusal)).toEqual({
      kind: 'refused',
      wire_version: REFUSALS_WIRE_VERSION,
      refusal,
    });
  });
});

describe('decodeOutcome', () => {
  it('uses the caller-supplied guard for ok values', () => {
    expect(decodeOutcome({ kind: 'ok', value: 'saved' }, isString)).toEqual({
      kind: 'ok',
      value: 'saved',
    });
    expect(decodeOutcome({ kind: 'ok', value: 42 }, isString)).toEqual({
      kind: 'incompatible_refusal',
      wire_version: null,
    });
  });

  it('decodes valid envelopes for all five refusal arms', () => {
    const refusals = [
      attunementSlotsFullRefusal(1, [
        { slot: 1, item_id: 11 as CharacterItemId, name: 'Orb' },
      ]),
      revisionConflictRefusal(expectedRevision, actualRevision),
      characterArchivedRefusal(characterId, actualRevision),
      levelUpRefused({
        reason: 'planned_subchoice_refused',
        subchoice_kind: 'skill',
        index: 0,
        issue: 'skill_already_held',
        locator: {
          source: { kind: 'selected_class' },
          rule_key: 'skill-choice' as GrantRuleKey,
          ordinal: 1 as GrantOrdinal,
        },
      }),
      speciesLineageRefused('configured_choice_unavailable'),
    ];

    for (const refusal of refusals) {
      const envelope = structuredClone(refused(refusal));
      expect(decodeOutcome(envelope, isString)).toEqual(envelope);
    }
  });

  it.each([
    [null, null],
    [{}, null],
    [{ kind: 'ok' }, null],
    [{ kind: 'refused', wire_version: REFUSALS_WIRE_VERSION }, 1],
    [
      {
        kind: 'refused',
        wire_version: REFUSALS_WIRE_VERSION,
        refusal: { kind: 'revision_conflict', expected: 4 },
      },
      1,
    ],
    [
      {
        kind: 'refused',
        wire_version: REFUSALS_WIRE_VERSION,
        refusal: {
          kind: 'level_up_refused',
          reason: 'planned_subchoice_refused',
          subchoice_kind: 'spell',
          index: -1,
          issue: 'spell_not_eligible',
          locator: {
            source: { kind: 'selected_class' },
            rule_key: 'spell',
            ordinal: 1,
          },
        },
      },
      1,
    ],
  ] as const)(
    'falls back for malformed data: %j',
    (data, expectedWireVersion) => {
    expect(decodeOutcome(data, isString)).toEqual({
      kind: 'incompatible_refusal',
      wire_version: expectedWireVersion,
    });
    },
  );

  it('falls back for an unknown refusal kind without throwing', () => {
    const decoded = decodeOutcome(
      {
        kind: 'refused',
        wire_version: REFUSALS_WIRE_VERSION,
        refusal: { kind: 'newer_refusal', detail: 'new' },
      },
      isString,
    );

    expect(decoded).toEqual({
      kind: 'incompatible_refusal',
      wire_version: REFUSALS_WIRE_VERSION,
    });
    if (decoded.kind !== 'incompatible_refusal') {
      return expect.fail('Expected an incompatible-refusal fallback.');
    }
    expect(renderRefusal(decoded)).toBe(INCOMPATIBLE_REFUSAL_MESSAGE);
  });

  it('simulates an older UI receiving a future wire version', () => {
    const futureVersion = REFUSALS_WIRE_VERSION + 1;
    const decoded = decodeOutcome(
      {
        kind: 'refused',
        wire_version: futureVersion,
        refusal: {
          kind: 'species_lineage_refused',
          reason: 'invalid_option',
        },
      },
      isString,
    );

    expect(decoded).toEqual({
      kind: 'incompatible_refusal',
      wire_version: futureVersion,
    });
    if (decoded.kind !== 'incompatible_refusal') {
      return expect.fail('Expected an incompatible-refusal fallback.');
    }
    expect(renderRefusal(decoded)).toBe(
      "We couldn't do that — reloading may help.",
    );
  });

  // Exhaustiveness probe run for increment 1: a temporary sixth Refusal arm
  // produced TS1360 at both satisfies Record tables (decode.ts and render.ts),
  // plus the renderer's TS2366 missing-return failure; the arm was then removed.
});
