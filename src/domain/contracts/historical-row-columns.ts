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
  character_weapons: ['proficiency_category', 'attack_kind'],
  // The `ability_increase` payload (B2). Every effect row written before the
  // contribution layer existed lacks all three keys; without this entry the
  // exact-key row contract would refuse every save point and portable backup
  // already in the wild over columns their rows could not have named. NULL is
  // correct: no historical row can be of kind `ability_increase`, so the
  // kind-payload CHECKs hold with all three absent.
  character_effects: ['ability', 'amount', 'maximum'],
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
