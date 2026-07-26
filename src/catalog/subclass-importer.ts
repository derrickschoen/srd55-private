import { sqlInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  CatalogSubclassFeature,
  CatalogSubclassRecord,
} from './catalog-schema';

/**
 * THE SUBCLASS ARM OF `catalog.import`.
 *
 * ─── WHY THIS IS ADDITIVE AND THE SPELL ARM IS NOT ──────────────────────────
 *
 * A spell import is a FULL REPLACEMENT: everything with `provenance = 'import'`
 * and absent from the document is tombstoned by `is_active = 0`. That works
 * because `spell_versions` carries both a provenance column to scope the sweep
 * and an `is_active` flag to make removal reversible and non-destructive to the
 * characters holding the row.
 *
 * `subclass_definitions` HAS NEITHER, and the difference is not cosmetic:
 *
 *  1. There is no `provenance` column, so a sweep would have nothing to scope
 *     itself by. Unlike spells — which this application bundles NONE of, by
 *     `src/db/bootstrap.ts` — the bundled SRD subclasses live in THIS table,
 *     beside any imported one. A `NOT IN (seen)` sweep would take out
 *     `2024:subclass:ek`.
 *  2. There is no `is_active` column, so removal would have to be a hard
 *     DELETE. `character_class_levels` holds a composite foreign key to this
 *     table with NO `ON DELETE` clause, so deleting a subclass a character has
 *     taken raises SQLITE_CONSTRAINT_FOREIGNKEY — which, inside the import
 *     transaction, aborts the WHOLE import including every spell in it.
 *
 * So this increment lands the RECORD KIND and its round trip — create, update,
 * re-import as a no-op — and REMOVAL IS NOT PART OF IT. An imported subclass is
 * never deleted by an import. That is stated in the format's docs rather than
 * left for a user to discover, and the two columns it would need are the named
 * next increment.
 *
 * ─── WHAT *IS* A FULL REPLACEMENT: THE FEATURE LIST ─────────────────────────
 *
 * Within one subclass, the document's `features` array is authoritative and
 * replaces whatever is stored. It can be: nothing points at a `subclass_features`
 * row. `character_class_levels` references the DEFINITION, and
 * `src/domain/contracts/tables.ts` marks `subclass_features` `backupReference:
 * false` precisely because a backup names the subclass and never its features.
 * A feature that vanishes from a revised document therefore vanishes from the
 * database with nothing left dangling.
 */

export interface SubclassImportCounters {
  subclasses_created: number;
  subclasses_updated: number;
  subclass_features_created: number;
}

/** A feature row as stored, for the comparison that keeps re-import a no-op. */
interface StoredFeature {
  readonly class_level: number;
  readonly sort_order: number;
  readonly name: string;
  readonly description: string;
  readonly effect_kind: string | null;
  readonly effect_attack_count: number | null;
  readonly effect_weapon_scope: string | null;
}

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * A parsed feature becomes the row it will be stored as.
 *
 * THE THREE EFFECT COLUMNS MOVE TOGETHER OR NOT AT ALL, which is what
 * `subclass_features_extra_attack_payload_check` and its two `IS`-written
 * companions require. Destructuring the union here rather than at the INSERT
 * means there is one place a null-effect row can be built, and it fills all
 * three with NULL.
 */
function storedFeature(
  feature: CatalogSubclassFeature,
  index: number,
): StoredFeature {
  return {
    class_level: feature.classLevel,
    // Printed order IS the array order. See `CatalogSubclassFeature`.
    sort_order: index + 1,
    name: feature.name,
    description: feature.description,
    effect_kind: feature.effect === null ? null : feature.effect.kind,
    effect_attack_count:
      feature.effect === null ? null : feature.effect.attack_count,
    effect_weapon_scope:
      feature.effect === null ? null : feature.effect.weapon_scope,
  };
}

function readStoredFeatures(
  db: DatabaseContext,
  subclassId: number,
): StoredFeature[] {
  return db.all(
    `SELECT class_level, sort_order, name, description,
            effect_kind, effect_attack_count, effect_weapon_scope
     FROM subclass_features
     WHERE subclass_definition_id = ?
     ORDER BY sort_order`,
    [subclassId],
    (row): StoredFeature => ({
      class_level: Number(row.class_level),
      sort_order: Number(row.sort_order),
      name: String(row.name),
      description: String(row.description),
      effect_kind: row.effect_kind === null ? null : String(row.effect_kind),
      effect_attack_count:
        row.effect_attack_count === null
          ? null
          : Number(row.effect_attack_count),
      effect_weapon_scope:
        row.effect_weapon_scope === null
          ? null
          : String(row.effect_weapon_scope),
    }),
  );
}

function sameFeatures(
  left: readonly StoredFeature[],
  right: readonly StoredFeature[],
): boolean {
  return (
    left.length === right.length &&
    left.every((feature, index) => {
      const other = right[index] as StoredFeature;
      return (
        feature.class_level === other.class_level &&
        feature.sort_order === other.sort_order &&
        feature.name === other.name &&
        feature.description === other.description &&
        feature.effect_kind === other.effect_kind &&
        feature.effect_attack_count === other.effect_attack_count &&
        feature.effect_weapon_scope === other.effect_weapon_scope
      );
    })
  );
}

/**
 * Resolves the parent class BY CONTENT KEY, or refuses.
 *
 * REFUSING BEATS CREATING ONE. A missing parent class means the document names
 * a class this database does not have, and inventing a `class_definitions` row
 * would mint a class with no progression table, no hit die and no saving
 * throws — a class that exists everywhere in the UI and computes nothing.
 */
function parentClassId(db: DatabaseContext, record: CatalogSubclassRecord): number {
  const id = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE content_key = ?',
    [record.parentClassKey],
  );
  if (id === null) {
    throw new TypeError(
      `Subclass '${record.contentKey}' names the parent class '${record.parentClassKey}', which is not in this catalog.`,
    );
  }
  return Number(id);
}

function importSubclass(
  db: DatabaseContext,
  record: CatalogSubclassRecord,
  counters: SubclassImportCounters,
): void {
  const classId = parentClassId(db, record);
  const existing = db.one(
    `SELECT id, class_definition_id, name, rules_edition
     FROM subclass_definitions
     WHERE content_key = ?`,
    [record.contentKey],
  );

  /**
   * RE-PARENTING IS REFUSED, EXPLICITLY, RATHER THAN LEFT TO THE FOREIGN KEY.
   *
   * `character_class_levels` holds a COMPOSITE key over
   * (subclass_definition_id, class_definition_id) exactly so that a character
   * cannot hold a subclass of another class. Moving a subclass to a different
   * parent while a character holds it therefore raises
   * SQLITE_CONSTRAINT_FOREIGNKEY, and inside this transaction that aborts the
   * entire import — every spell in the same call included — with an opaque
   * message. The refusal below names the file, the key and the fix instead.
   */
  if (
    existing !== null &&
    sqlInteger(existing, 'class_definition_id') !== classId
  ) {
    throw new TypeError(
      `Subclass '${record.contentKey}' is already stored under a different parent class; an import cannot move a subclass between classes, because a character may already hold it.`,
    );
  }

  /**
   * THE NAME SLOT, CHECKED BEFORE IT IS TAKEN.
   *
   * `subclass_definitions_class_definition_id_name_rules_edition_unique` is the
   * same triple `upsertThirdCaster` yields on, and the yield runs both ways: the
   * seeder refuses to overwrite a key it does not own, and so does this. The
   * KEY grammar already stops a document naming `2024:subclass:ek`
   * (see `importedContentKeyOwner`); this stops the same row being taken by its
   * NAME under a different key.
   */
  const holder = db.scalar<string>(
    `SELECT content_key FROM subclass_definitions
     WHERE class_definition_id = ? AND name = ? AND rules_edition = ?`,
    [classId, record.name, record.edition],
  );
  if (holder !== null && holder !== record.contentKey) {
    throw new TypeError(
      `Subclass '${record.contentKey}' cannot be named '${record.name}': '${holder}' already holds that name on this class and edition.`,
    );
  }

  const now = timestamp();
  let subclassId: number;
  let changed: boolean;
  if (existing === null) {
    subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        record.contentKey,
        classId,
        record.name,
        record.edition,
        now,
        now,
      ],
    ).lastInsertId;
    counters.subclasses_created += 1;
    changed = false;
  } else {
    subclassId = sqlInteger(existing, 'id');
    changed =
      sqlString(existing, 'name') !== record.name ||
      sqlString(existing, 'rules_edition') !== record.edition;
    if (changed) {
      db.exec(
        `UPDATE subclass_definitions
         SET name = ?, rules_edition = ?, updated_at = ?
         WHERE id = ?`,
        [record.name, record.edition, now, subclassId],
      );
    }
  }

  const desired = record.features.map(storedFeature);
  const stored = existing === null ? [] : readStoredFeatures(db, subclassId);
  if (!sameFeatures(stored, desired)) {
    // DELETE-THEN-INSERT, NOT A PER-ROW DIFF, and the unique indexes are why: a
    // feature that moved from sort_order 2 to 1 collides with the row still
    // holding 1 partway through any in-place reordering. Nothing references
    // these rows, so replacing them wholesale costs nothing — see the module
    // comment.
    db.exec('DELETE FROM subclass_features WHERE subclass_definition_id = ?', [
      subclassId,
    ]);
    for (const feature of desired) {
      db.exec(
        `INSERT INTO subclass_features (
           subclass_definition_id, class_level, sort_order, name, description,
           effect_kind, effect_attack_count, effect_weapon_scope,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subclassId,
          feature.class_level,
          feature.sort_order,
          feature.name,
          feature.description,
          feature.effect_kind,
          feature.effect_attack_count,
          feature.effect_weapon_scope,
          now,
          now,
        ],
      );
      counters.subclass_features_created += 1;
    }
    changed = true;
  }

  if (existing !== null && changed) {
    counters.subclasses_updated += 1;
  }
}

/**
 * Imports every subclass record in one Tier 1 parse.
 *
 * CALLED INSIDE THE IMPORTER'S TRANSACTION, so a refusal anywhere rolls the
 * whole call back — spells included. That is the correct blast radius: a
 * document is one edit, and half of one applied is worse than none of it.
 */
export function importSubclassRecords(
  db: DatabaseContext,
  records: readonly CatalogSubclassRecord[],
): SubclassImportCounters {
  const counters: SubclassImportCounters = {
    subclasses_created: 0,
    subclasses_updated: 0,
    subclass_features_created: 0,
  };
  for (const record of records) {
    importSubclass(db, record, counters);
  }
  return counters;
}
