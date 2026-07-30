import { describe, expect, it } from 'vitest';
import {
  legacyArmorClassAdjustmentError,
  splitLegacyArmorClassAdjustment,
} from '../../../src/rules/legacy-armor-class-adjustment';

describe('retired Armor Class adjustment rows', () => {
  it('leaves a current shell row alone', () => {
    const row = { id: 1, character_id: 2 };

    expect(legacyArmorClassAdjustmentError(row, 'row')).toBeNull();
    expect(splitLegacyArmorClassAdjustment(row)).toBeNull();
  });

  it('refuses a note without its adjustment column', () => {
    expect(
      legacyArmorClassAdjustmentError(
        { armor_class_adjustment_note: 'orphan' },
        'row',
      ),
    ).toBe('row carries an Armor Class adjustment note without an adjustment.');
  });

  it('refuses an adjustment without its historical note column', () => {
    expect(
      legacyArmorClassAdjustmentError(
        { armor_class_adjustment: 2 },
        'row',
      ),
    ).toBe('row carries an Armor Class adjustment without its note column.');
  });

  it('refuses an adjustment below the historical bound', () => {
    expect(
      legacyArmorClassAdjustmentError(
        {
          armor_class_adjustment: -21,
          armor_class_adjustment_note: null,
        },
        'row',
      ),
    ).toBe(
      'row.armor_class_adjustment must be an integer from -20 through 20.',
    );
  });

  it('refuses a fractional adjustment', () => {
    expect(
      legacyArmorClassAdjustmentError(
        {
          armor_class_adjustment: 1.5,
          armor_class_adjustment_note: null,
        },
        'row',
      ),
    ).toBe(
      'row.armor_class_adjustment must be an integer from -20 through 20.',
    );
  });

  it('refuses a non-text note', () => {
    expect(
      legacyArmorClassAdjustmentError(
        {
          armor_class_adjustment: 2,
          armor_class_adjustment_note: 4,
        },
        'row',
      ),
    ).toBe('row.armor_class_adjustment_note must be text or null.');
  });

  it('drops zero with its note while stripping both retired columns', () => {
    expect(
      splitLegacyArmorClassAdjustment({
        id: 3,
        character_id: 2,
        armor_class_adjustment: 0,
        armor_class_adjustment_note: 'No numerical effect',
      }),
    ).toEqual({
      row: { id: 3, character_id: 2 },
      effect: null,
    });
  });

  it('uses the binding fallback label only when the old note is null', () => {
    expect(
      splitLegacyArmorClassAdjustment({
        id: 3,
        character_id: 2,
        armor_class_adjustment: -2,
        armor_class_adjustment_note: null,
        created_at: '2026-07-30 12:00:00',
        updated_at: null,
      }),
    ).toEqual({
      row: {
        id: 3,
        character_id: 2,
        created_at: '2026-07-30 12:00:00',
        updated_at: null,
      },
      effect: {
        effect_kind: 'armor_class_bonus',
        amount: -2,
        source_instance_id: null,
        character_item_id: null,
        character_weapon_id: null,
        template_ref: null,
        label: 'Manual Armor Class adjustment',
        notes: null,
        created_at: '2026-07-30 12:00:00',
        updated_at: null,
      },
    });
  });

  it('preserves a non-null note as the manual effect label', () => {
    expect(
      splitLegacyArmorClassAdjustment({
        armor_class_adjustment: 3,
        armor_class_adjustment_note: 'Shield spell at the table',
      })?.effect,
    ).toMatchObject({
      effect_kind: 'armor_class_bonus',
      amount: 3,
      label: 'Shield spell at the table',
    });
  });
});
