import { describe, expect, it } from 'vitest';
import {
  SpellAccessMissingCharacterClassError,
  SpellAccessUnknownSelectionBucketError,
} from '../../../../src/access/spell-access-errors';
import {
  SpellSlotAssignmentReferenceConflictError,
} from '../../../../src/access/spell-slot-assignment-errors';
import {
  type BuildReportAbilitySource,
  BuildReportRitualRouteSpellbookEntryError,
  BuildReportUnknownAbilityError,
  BuildReportUnsupportedCasterFractionError,
} from '../../../../src/reports/build-report-errors';

const ALL_ABILITY_SOURCES: readonly BuildReportAbilitySource[] = [
  'class',
  'subclass',
  'configured',
];

describe('reports and access error formatters', () => {
  it('formats BuildReportUnknownAbilityError', () => {
    const error = new BuildReportUnknownAbilityError(
      'class',
      'luck',
    );

    expect(error.message).toBe("Unknown class spellcasting ability 'luck'.");
    expect(error.name).toBe('BuildReportUnknownAbilityError');
    expect(error).toMatchObject({
      source: 'class',
      value: 'luck',
    });
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats every BuildReportUnknownAbilityError source token', () => {
    for (const source of ALL_ABILITY_SOURCES) {
      expect(
        new BuildReportUnknownAbilityError(source, 'luck').message,
      ).not.toContain('undefined');
    }
  });

  it('formats BuildReportUnsupportedCasterFractionError', () => {
    const error = new BuildReportUnsupportedCasterFractionError(
      '1/4',
      'sideways',
    );

    expect(error.message).toBe(
      'Unsupported caster fraction 1/4 rounded sideways.',
    );
    expect(error.name).toBe('BuildReportUnsupportedCasterFractionError');
    expect(error).toMatchObject({ fraction: '1/4', rounding: 'sideways' });
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats BuildReportRitualRouteSpellbookEntryError', () => {
    const error = new BuildReportRitualRouteSpellbookEntryError(71);

    expect(error.message).toBe('Ritual-only route 71 has no spellbook entry.');
    expect(error.name).toBe('BuildReportRitualRouteSpellbookEntryError');
    expect(error.spell_version_id).toBe(71);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats SpellAccessUnknownSelectionBucketError', () => {
    const error = new SpellAccessUnknownSelectionBucketError('corrupt');

    expect(error.message).toBe('Unknown spell selection bucket corrupt.');
    expect(error.name).toBe('SpellAccessUnknownSelectionBucketError');
    expect(error.bucket).toBe('corrupt');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('formats SpellAccessMissingCharacterClassError', () => {
    const error = new SpellAccessMissingCharacterClassError(23);

    expect(error.message).toBe(
      'Spell access routes require at least one character class.',
    );
    expect(error.name).toBe('SpellAccessMissingCharacterClassError');
    expect(error.character_id).toBe(23);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats SpellSlotAssignmentReferenceConflictError', () => {
    const error = new SpellSlotAssignmentReferenceConflictError(12, 34);

    expect(error.message).toBe(
      'A spell slot cannot hold both a fixed grant and a user selection.',
    );
    expect(error.name).toBe('SpellSlotAssignmentReferenceConflictError');
    expect(error).toMatchObject({
      fixed_spell_version_id: 12,
      current_spell_version_id: 34,
    });
    expect(error).toBeInstanceOf(TypeError);
  });
});
