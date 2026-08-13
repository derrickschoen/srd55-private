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
  // THERE IS DELIBERATELY NO `character_source_instances` ENTRY FOR THE R4
  // LANE, AND THE ABSENCE IS AN ANSWER RATHER THAN AN OVERSIGHT.
  //
  // Migration 0047 puts a `oneOf` CHECK on `character_source_instances.state`,
  // and a CHECK is the one write-side obligation that reaches the import path:
  // `insertPortableRow` (`src/backup/character-backup.ts`) builds a raw
  // `INSERT INTO "character_source_instances"` straight from a document's
  // columns, so from 0047 onwards a document carrying a third value would fail
  // at that INSERT. D8 makes that the highest-severity failure there is — a
  // contract narrower than its column making a user's own backup unrestorable —
  // so the audit doc requires normalization to LAND BEFORE the DDL unless the
  // vocabulary can be shown to be complete.
  //
  // It can be, and this is the reasoning rather than an assurance.
  //
  // A document that OMITS the column is REFUSED, and saying so is the honest
  // version of a claim this comment first got wrong. Nothing fills the absence
  // — there is no entry here — and the row contract is a `strictObject` over
  // every column, so `rows.ts` rejects a missing `state` exactly as it rejects
  // a missing `display_name` (`tests/unit/contracts/row-contracts.test.ts`,
  // "refuses a missing column rather than silently taking a default"). That is
  // harmless because no document can omit it: `state` is in this table in the
  // BASELINE schema (`drizzle/0000_skinny_lionheart.sql:419`), no migration has
  // added, renamed or retired it since, and it appears in no
  // `RETIRED_ROW_COLUMNS` entry — so every backup this application has ever
  // written carries it. The column's `NOT NULL DEFAULT 'active'` protects an
  // INSERT that names no `state`; it is NOT what would rescue a document
  // missing the key, because validation refuses that document before any
  // INSERT is built.
  //
  // A document that CARRIES the column can only carry a value some writer put
  // into a database this application wrote. Every writer in the tree sets one
  // of the two literals (`remove-source.ts`, `update-class.ts` ×2,
  // `grant-rule-slot-generator.ts` — whose child-source INSERT binds the value
  // rather than inlining it, and whose bound attribute has only ever been
  // `'active'` — and `authoring/reference-retarget.ts`; since R4 every one of
  // them binds `ACTIVE_SOURCE_INSTANCE_STATE` /
  // `TOMBSTONED_SOURCE_INSTANCE_STATE` instead of spelling a literal). An audit
  // of EVERY blob in this repository's history — each distinct version of every
  // file ever committed on any branch, deduplicated — found exactly two
  // literals ever written to this column BY APPLICATION CODE: `'active'` and
  // `'tombstoned'`.
  //
  // That scope is deliberate, and it is narrower than the sentence this comment
  // used to carry. Test fixtures DO write a third value on purpose, because
  // proving a CHECK can refuse requires writing something it refuses —
  // `kept_override`, in `tests/unit/db/migrations.test.ts` and
  // `tests/unit/schema-check-constraints.test.ts`. Those rows exist only inside
  // the test that writes them, against a database that test built, and never
  // reach a backup document.
  //
  // So there is no historical value to migrate forward, and inventing a
  // normalization rule for one would be machinery justified by what it protects
  // rather than what it does. Should a third literal ever ship, THAT is when an
  // entry belongs here — and it belongs here before its CHECK widens, not after.
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
