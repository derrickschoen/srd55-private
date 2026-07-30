type Row = Readonly<Record<string, unknown>>;

export const RETIRED_ARMOR_CLASS_ADJUSTMENT_COLUMNS = [
  'armor_class_adjustment',
  'armor_class_adjustment_note',
] as const;

export interface LegacyArmorClassBonus {
  readonly effect_kind: 'armor_class_bonus';
  readonly amount: unknown;
  readonly source_instance_id: null;
  readonly character_item_id: null;
  readonly character_weapon_id: null;
  readonly template_ref: null;
  readonly label: unknown;
  readonly notes: null;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

export interface SplitLegacyArmorClassAdjustment {
  readonly row: Row;
  readonly effect: LegacyArmorClassBonus | null;
}

/**
 * Validate the two columns against the schema that existed before AC-4.
 *
 * The current row contract cannot check columns it no longer has. Every JSON
 * boundary calls this before stripping them so a hostile historical artifact
 * cannot turn a string or an out-of-range value into a new effect row.
 */
export function legacyArmorClassAdjustmentError(
  row: Row,
  label: string,
): string | null {
  const hasAmount = Object.hasOwn(row, 'armor_class_adjustment');
  const hasNote = Object.hasOwn(row, 'armor_class_adjustment_note');
  if (!hasAmount && !hasNote) {
    return null;
  }
  if (!hasAmount) {
    return `${label} carries an Armor Class adjustment note without an adjustment.`;
  }
  if (!hasNote) {
    return `${label} carries an Armor Class adjustment without its note column.`;
  }
  const amount = row.armor_class_adjustment;
  if (
    !Number.isSafeInteger(amount) ||
    Number(amount) < -20 ||
    Number(amount) > 20
  ) {
    return `${label}.armor_class_adjustment must be an integer from -20 through 20.`;
  }
  const note = row.armor_class_adjustment_note;
  if (note !== null && typeof note !== 'string') {
    return `${label}.armor_class_adjustment_note must be text or null.`;
  }
  return null;
}

/**
 * Remove AC-4's retired columns and expose their one-vocabulary replacement.
 *
 * Zero — including zero with a note — yields no effect. The note is consumed
 * as the non-zero effect's label, with the binding fallback used only for NULL.
 */
export function splitLegacyArmorClassAdjustment(
  row: Row,
): SplitLegacyArmorClassAdjustment | null {
  if (
    !Object.hasOwn(row, 'armor_class_adjustment') &&
    !Object.hasOwn(row, 'armor_class_adjustment_note')
  ) {
    return null;
  }
  const current: Record<string, unknown> = { ...row };
  for (const column of RETIRED_ARMOR_CLASS_ADJUSTMENT_COLUMNS) {
    delete current[column];
  }
  const amount = row.armor_class_adjustment;
  return {
    row: current,
    effect:
      amount === 0
        ? null
        : {
            effect_kind: 'armor_class_bonus',
            amount,
            source_instance_id: null,
            character_item_id: null,
            character_weapon_id: null,
            template_ref: null,
            label:
              row.armor_class_adjustment_note === null
                ? 'Manual Armor Class adjustment'
                : row.armor_class_adjustment_note,
            notes: null,
            created_at: row.created_at ?? null,
            updated_at: row.updated_at ?? null,
          },
  };
}
