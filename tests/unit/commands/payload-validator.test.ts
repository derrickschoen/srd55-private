import { describe, expect, it } from 'vitest';
import {
  CharacterCommandPayloadValidator,
  validateCharacterCommandPayload,
} from '../../../src/commands/payload-validator';

const signature = 'a'.repeat(64);

function restoreState(): Record<string, unknown> {
  return {
    current_spell_version_id: 7,
    selection_eligibility: 'valid',
    selection_invalid_reason: 'Still selected.',
    state: 'active',
    override_note: 'Allowed.',
  };
}

function expectInvalid(payload: unknown, message: string): void {
  expect(() => validateCharacterCommandPayload(payload)).toThrow(message);
}

describe('character command payload validation', () => {
  it('accepts all nine command variants, every mode, and preserves allowed fields', () => {
    const commands: Array<Record<string, unknown>> = [
      {
        type: 'update_ability',
        ability: 'wisdom',
        score: 16,
        reason: 'Level up.',
      },
      {
        type: 'set_slot',
        slot_id: 1,
        mode: 'select',
        spell_version_id: 2,
        note: 'Allowed but unused in this mode.',
        state: restoreState(),
        integrity: signature,
      },
      { type: 'set_slot', slot_id: 1, mode: 'clear' },
      {
        type: 'set_slot',
        slot_id: 1,
        mode: 'keep_override',
        note: 'House rule.',
      },
      {
        type: 'set_slot',
        slot_id: 1,
        mode: 'restore',
        state: restoreState(),
        integrity: signature,
      },
      {
        type: 'update_character_rules',
        allow_legacy: false,
      },
      {
        type: 'update_source_config',
        source_instance_id: 3,
        chosen_list: 'Cleric',
      },
      {
        type: 'update_source_config',
        source_instance_id: 3,
        chosen_option: 'Thaumaturge',
      },
      {
        type: 'add_source',
        source_type: 'class',
        source_definition_id: 4,
        config: {
          level: 1,
          wizard_spellbook_acquisitions: [],
          divine_order: { chosen_option: 'Thaumaturge' },
          primal_order: { chosen_option: 'Magician' },
        },
      },
      {
        type: 'add_source',
        source_type: 'feat',
        source_definition_id: 5,
        config: {},
      },
      {
        type: 'add_source',
        source_type: 'species',
        source_definition_id: 6,
        config: {},
      },
      {
        type: 'add_source',
        source_type: 'background',
        source_definition_id: 7,
        config: { nested: { b: 2, a: 1 } },
      },
      { type: 'remove_source', source_instance_id: 8 },
      {
        type: 'acknowledge_warning',
        mode: 'acknowledge',
        warning_fingerprint: 'conflicting_versions:1',
        note: 'Intentional.',
      },
      {
        type: 'acknowledge_warning',
        mode: 'delete',
        warning_fingerprint: 'conflicting_versions:1',
        integrity: signature,
      },
      {
        type: 'update_class',
        class_definition_id: 9,
        level: 3,
        subclass_definition_id: 10,
      },
      {
        type: 'update_class',
        class_definition_id: 9,
        level: null,
        subclass_definition_id: null,
      },
      {
        type: 'restore_snapshot',
        snapshot: { version: 'a7-v1', tables: {} },
        integrity: signature,
      },
    ];

    const validator = new CharacterCommandPayloadValidator();
    for (const command of commands) {
      expect(validator.validate(command)).toEqual(command);
    }

    const withoutMode = {
      type: 'acknowledge_warning',
      warning_fingerprint: 'conflicting_versions:2',
      note: 'Reviewed.',
    };
    expect(validator.validate(withoutMode)).toEqual({
      ...withoutMode,
      mode: 'acknowledge',
    });
    expect(withoutMode).not.toHaveProperty('mode');
  });

  it('rejects unknown command fields and ill-typed required fields', () => {
    const cases: Array<[unknown, string]> = [
      [
        {
          type: 'update_ability',
          ability: 'wisdom',
          score: 16,
          extra: true,
        },
        'Unknown command field: extra.',
      ],
      [null, 'Character command must be an object.'],
      [[], 'Character command must be an object.'],
      [{}, 'type must be a string.'],
      [
        { type: 'remove_source', source_instance_id: '1' },
        'source_instance_id must be an integer.',
      ],
      [
        { type: 'remove_source', source_instance_id: 1.5 },
        'source_instance_id must be an integer.',
      ],
      [
        { type: 'remove_source', source_instance_id: 0 },
        'source_instance_id must be a positive integer.',
      ],
      [
        { type: 'update_character_rules', allow_legacy: 0 },
        'allow_legacy must be a boolean.',
      ],
      [
        {
          type: 'update_source_config',
          source_instance_id: 1,
        },
        'Source configuration must provide exactly one of chosen_list or chosen_option.',
      ],
      [
        {
          type: 'update_source_config',
          source_instance_id: 1,
          chosen_list: 'Cleric',
          chosen_option: 'Thaumaturge',
        },
        'Source configuration must provide exactly one of chosen_list or chosen_option.',
      ],
      [
        {
          type: 'update_class',
          class_definition_id: 1,
        },
        'Class level is required; use null to remove the class.',
      ],
      [
        {
          type: 'restore_snapshot',
          snapshot: [],
          integrity: signature,
        },
        'Character snapshot must be an object.',
      ],
      // RETIRED COMMANDS REFUSE AS UNKNOWN (skills-with-provenance §3.5):
      // `choose_multiclass_skill` could not name the grant it filled and
      // `set_skill_proficiency` had no source; both are deliberately absent
      // from the command vocabulary, not renamed within it.
      [
        {
          type: 'choose_multiclass_skill',
          skill: 'performance',
        },
        'Unknown character command type.',
      ],
      [
        {
          type: 'set_skill_proficiency',
          skill: 'stealth',
          proficient: true,
        },
        'Unknown character command type.',
      ],
    ];

    for (const [payload, message] of cases) {
      expectInvalid(payload, message);
    }
  });

  it('rejects every unknown command enum and conditional mode requirement', () => {
    const cases: Array<[unknown, string]> = [
      [
        { type: 'update_ability', ability: 'luck', score: 16 },
        'Unknown ability.',
      ],
      [{ type: 'teleport' }, 'Unknown character command type.'],
      [
        { type: 'set_slot', slot_id: 1, mode: 'teleport' },
        'Unknown slot mutation mode.',
      ],
      [
        { type: 'set_slot', slot_id: 1, mode: 'select' },
        'spell_version_id must be an integer.',
      ],
      [
        { type: 'set_slot', slot_id: 1, mode: 'keep_override', note: ' ' },
        'note must not be empty.',
      ],
      [
        {
          type: 'add_source',
          source_type: 'subclass',
          source_definition_id: 1,
          config: {},
        },
        'Source type must be class, feat, species, or background.',
      ],
      [
        {
          type: 'acknowledge_warning',
          mode: 'ignore',
          warning_fingerprint: 'warning',
        },
        'Unknown warning acknowledgement mode.',
      ],
      [
        {
          type: 'acknowledge_warning',
          mode: 'delete',
          warning_fingerprint: 'warning',
        },
        'integrity must be a string.',
      ],
    ];

    for (const [payload, message] of cases) {
      expectInvalid(payload, message);
    }
  });

  it('validates every field and enum in a restored slot row', () => {
    for (const [eligibility, state] of [
      ['valid', 'active'],
      ['invalid', 'orphaned'],
      ['unselected', 'discarded'],
      ['valid', 'kept_override'],
    ]) {
      expect(
        validateCharacterCommandPayload({
          type: 'set_slot',
          slot_id: 1,
          mode: 'restore',
          state: {
            ...restoreState(),
            current_spell_version_id: null,
            selection_eligibility: eligibility,
            selection_invalid_reason: null,
            state,
            override_note: null,
          },
          integrity: signature,
        }),
      ).toHaveProperty('mode', 'restore');
    }

    const malformed: Array<[Record<string, unknown>, string]> = [
      [
        { ...restoreState(), extra: true },
        'Unknown slot restore state field: extra.',
      ],
      [
        Object.fromEntries(
          Object.entries(restoreState()).filter(([key]) => key !== 'state'),
        ),
        'Slot restore state is missing state.',
      ],
      [
        { ...restoreState(), current_spell_version_id: 0 },
        'Slot restore spell_version_id must be a positive integer or null.',
      ],
      [
        { ...restoreState(), selection_eligibility: 'unknown' },
        'Unknown slot selection eligibility.',
      ],
      [
        { ...restoreState(), selection_invalid_reason: [] },
        'Slot selection invalid reason must be a string or null.',
      ],
      [
        { ...restoreState(), state: 'unknown' },
        'Unknown restored slot state.',
      ],
      [
        { ...restoreState(), override_note: [] },
        'Slot override note must be a string or null.',
      ],
    ];

    for (const [state, message] of malformed) {
      expectInvalid(
        {
          type: 'set_slot',
          slot_id: 1,
          mode: 'restore',
          state,
          integrity: signature,
        },
        message,
      );
    }
  });

  it('enforces exact string, integrity, JSON-object, and class-config boundaries', () => {
    expect(
      validateCharacterCommandPayload({
        type: 'update_ability',
        ability: 'wisdom',
        score: 1,
        reason: '😀'.repeat(255),
      }),
    ).toHaveProperty('reason', '😀'.repeat(255));

    const cases: Array<[unknown, string]> = [
      [
        // 26 is the length of the longest command type,
        // `set_armor_class_adjustment`, and the bound is DERIVED from the
        // vocabulary rather than typed here — the hand-written 22 it replaced
        // was already shorter than that command's own name, so adding it would
        // have made every one of those commands fail on its length.
        { type: 'x'.repeat(27) },
        'type must not exceed 26 characters.',
      ],
      [
        {
          type: 'remove_source',
          source_instance_id: 1,
          reason: 'r'.repeat(256),
        },
        'reason must not exceed 255 characters.',
      ],
      [
        {
          type: 'restore_snapshot',
          snapshot: {},
          integrity: 'a'.repeat(63),
        },
        'integrity must be a 64-character hexadecimal signature.',
      ],
      [
        {
          type: 'restore_snapshot',
          snapshot: {},
          integrity: 'g'.repeat(64),
        },
        'integrity must be a 64-character hexadecimal signature.',
      ],
      [
        {
          type: 'add_source',
          source_type: 'feat',
          source_definition_id: 1,
          config: [],
        },
        'Source config must be an object.',
      ],
      [
        {
          type: 'add_source',
          source_type: 'class',
          source_definition_id: 1,
          config: {},
        },
        'level must be an integer.',
      ],
      [
        {
          type: 'add_source',
          source_type: 'class',
          source_definition_id: 1,
          config: { level: 21 },
        },
        'Class source level must be between 1 and 20.',
      ],
      [
        {
          type: 'add_source',
          source_type: 'class',
          source_definition_id: 1,
          config: {
            level: 1,
            wizard_spellbook_acquisitions: {},
          },
        },
        'Wizard spellbook acquisitions must be a list.',
      ],
      [
        {
          type: 'add_source',
          source_type: 'class',
          source_definition_id: 1,
          config: { level: 1, spellcasting_ability: 'charisma' },
        },
        'Unknown class source config field: spellcasting_ability.',
      ],
    ];

    for (const [payload, message] of cases) {
      expectInvalid(payload, message);
    }
  });
});
