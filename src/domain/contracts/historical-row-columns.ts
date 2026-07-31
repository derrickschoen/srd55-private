import type { BackupTable, SnapshotTable } from './tables';

type HistoricalRowTable = BackupTable | SnapshotTable;
type HistoricalRow = Readonly<Record<string, unknown>>;

/**
 * Nullable columns added after portable rows and save-point rows already
 * existed in the wild.
 *
 * This map is append-only: each member records that an older artifact could
 * not have named the column. Filling such an absence with NULL preserves the
 * historical fact; applying a non-null default would manufacture user data.
 */
const ADDED_NULLABLE_ROW_COLUMNS: Readonly<
  Partial<Record<HistoricalRowTable, readonly string[]>>
> = {
  // NOTE (D69): E-A briefly listed `source_instance_id` here for BOTH
  // weapons and armour; the owner struck the column (migration 0012), and a
  // dropped column needs no added-column allowance — a document written
  // while it existed is handled by `RETIRED_ROW_COLUMNS` in
  // `src/backup/character-backup.ts`, the removed-column direction.
  character_weapons: ['proficiency_category', 'attack_kind'],
  // The `ability_increase` payload (B2), PLUS the five AC-1 (D72) columns —
  // `base`, `ability_1`, `ability_2`, `allows_shield`, `weapon_scope`. Every
  // effect row written before this unit lacks all eight keys; without this
  // entry the exact-key row contract would refuse every save point and
  // portable backup already in the wild over columns their rows could not
  // have named. NULL is correct in every case: no historical row can be of a
  // kind that needs one of these columns, so the kind-payload CHECKs hold
  // with all eight absent.
  character_effects: [
    'ability',
    'amount',
    'maximum',
    'base',
    'ability_1',
    'ability_2',
    'allows_shield',
    'weapon_scope',
    'template_ref',
    'character_item_id',
    'character_weapon_id',
  ],
  spell_selection_slots: ['selection_acquired_at_class_level'],
  wizard_spellbook_entries: [
    'source_instance_id',
    'rule_key',
    'ordinal',
    'acquired_at_class_level',
    'allowed_spell_lists',
    'allowed_schools',
    'allowed_tags',
    'orphan_reason_code',
    'orphaned_at',
    'selection_invalid_reason',
  ],
};

/**
 * NOT NULL columns added after portable rows and save-point rows already
 * existed. Unlike the nullable map above, each entry carries the domain
 * default that reconstructs the historical fact.
 */
const ADDED_DEFAULTED_ROW_COLUMNS: Readonly<
  Partial<Record<HistoricalRowTable, Readonly<Record<string, unknown>>>>
> = {
  // D86: every historical item row represented one possession because no
  // quantity could be recorded. Restore and candidate audit share this fill.
  character_items: { quantity: 1 },
  // Before GF-1 every spellbook row was itself a selected Wizard spell. The
  // generated address and constraint did not exist, but its active, selected
  // status did. These values reconstruct only facts the old row necessarily
  // asserted.
  wizard_spellbook_entries: {
    spell_level_min: 1,
    spell_level_max: 9,
    state: 'active',
    selection_eligibility: 'valid',
  },
};

/**
 * Reconcile one historical row with columns introduced later.
 *
 * Shared by full-backup validation, save-point restore, and quarantined-image
 * audit so the three portability paths cannot disagree about an old row.
 */
export function fillHistoricalRowColumns(
  table: HistoricalRowTable,
  row: HistoricalRow,
  fillDefaultedColumns = true,
): HistoricalRow {
  const nullableFills = (ADDED_NULLABLE_ROW_COLUMNS[table] ?? []).filter(
    (key) => !Object.hasOwn(row, key),
  );
  const defaultFills = Object.entries(
    fillDefaultedColumns ? ADDED_DEFAULTED_ROW_COLUMNS[table] ?? {} : {},
  ).filter(([key]) => !Object.hasOwn(row, key));
  if (nullableFills.length === 0 && defaultFills.length === 0) {
    return row;
  }
  const reconciled: Record<string, unknown> = { ...row };
  for (const key of nullableFills) {
    reconciled[key] = null;
  }
  for (const [key, value] of defaultFills) {
    reconciled[key] = value;
  }
  return reconciled;
}
