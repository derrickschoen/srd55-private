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
};

/**
 * Reconcile one historical row with nullable columns introduced later.
 *
 * Shared by full-backup validation, save-point restore, and quarantined-image
 * audit so the three portability paths cannot disagree about an old row.
 */
export function fillAddedNullableRowColumns(
  table: HistoricalRowTable,
  row: HistoricalRow,
): HistoricalRow {
  const fills = (ADDED_NULLABLE_ROW_COLUMNS[table] ?? []).filter(
    (key) => !Object.hasOwn(row, key),
  );
  if (fills.length === 0) {
    return row;
  }
  const reconciled: Record<string, unknown> = { ...row };
  for (const key of fills) {
    reconciled[key] = null;
  }
  return reconciled;
}
