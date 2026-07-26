import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import {
  encodeBoolean,
  sqlBoolean,
  sqlInteger,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { SpellSelectionEligibility } from '../eligibility/spell-selection-eligibility';
import {
  normalizeCatalogName,
  normalizeCatalogRecords,
  type CatalogPublication,
  type NormalizedCatalogRecord,
} from './catalog-normalize';
import {
  parseCatalogDocuments,
  parseDescriptionDocuments,
  type CatalogImportParams,
} from './catalog-schema';
import {
  importSubclassRecords,
  type SubclassImportCounters,
} from './subclass-importer';

export interface CatalogImportSummary {
  created: number;
  updated: number;
  tombstoned: number;
  identities_created: number;
  identities_updated: number;
  publications_created: number;
  memberships_created: number;
  tags_created: number;
  attack_modes_created: number;
  save_abilities_created: number;
  /**
   * The subclass arm's counters. SEPARATE FROM `created`/`updated` rather than
   * folded into them: those three numbers are what the character-list screen
   * prints, and a user who imported five spells and one subclass reading
   * "6 created" would be reading a spell count that is wrong.
   *
   * THERE IS NO `subclasses_tombstoned`, AND THE ABSENCE IS THE STATEMENT: an
   * import never removes a subclass. `src/catalog/subclass-importer.ts` says
   * why, and what the next increment would have to add first.
   */
  subclasses_created: number;
  subclasses_updated: number;
  subclass_features_created: number;
  text_available: boolean;
  descriptions_loaded: number;
}

type CounterSummary = Omit<
  CatalogImportSummary,
  'text_available' | 'descriptions_loaded' | keyof SubclassImportCounters
>;

type VersionAttributes = Record<
  string,
  string | number | null
>;

class DryRunRollback extends Error {
  constructor(readonly summary: CatalogImportSummary) {
    super('Catalog dry run rollback.');
  }
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

function timestamp(): string {
  return new Date().toISOString();
}

function sameValues(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export class CatalogImporter {
  readonly #eligibility: SpellSelectionEligibility;

  constructor(private readonly db: DatabaseContext) {
    this.#eligibility = new SpellSelectionEligibility(db);
  }

  /**
   * ONE CALL IMPORTS EVERY KIND, AND A KIND IT DID NOT CARRY IS LEFT ALONE.
   *
   * THIS IS THE RULE THAT STOPS AN IMPORT DESTROYING CONTENT IT NEVER MENTIONED.
   * A spell import is a full replacement — everything `provenance = 'import'`
   * and absent from the document is tombstoned — and that sweep used to run
   * unconditionally. Once a document can carry a SUBCLASS, an unconditional
   * sweep means "here are my subclasses" also means "and I have no spells", and
   * a user who imported their homebrew subclasses after their spell catalog
   * would have watched the whole catalog go inactive with no error anywhere.
   * That is silent data loss, so the sweep is now scoped to the kinds the
   * documents DECLARED.
   *
   * AN EMPTY DOCUMENT STILL MEANS "NO SPELLS", AND IT MEANS THAT PER DOCUMENT.
   * `catalog.import` with `documents: ['[]']` is the shipped and tested way to
   * empty the spell catalog (`tests/browser/catalog-import.spec.ts`), so
   * `parseCatalogDocuments` has an EMPTY DOCUMENT declare `spell` itself rather
   * than this condition inferring it from an empty parse. The difference is
   * `['[]', <subclasses>]`, which the multi-file picker makes an ordinary
   * selection: inferring emptiness from the whole parse would see only
   * `subclass` there and silently skip the sweep the user asked for. A parse
   * that saw only subclasses still does not touch spells at all.
   *
   * The reverse direction needs no condition: the subclass arm removes nothing,
   * ever, so a spell-only import cannot reach a subclass. See
   * `src/catalog/subclass-importer.ts`.
   */
  import(params: CatalogImportParams): CatalogImportSummary {
    const records = parseCatalogDocuments(params.documents);
    const descriptions = parseDescriptionDocuments(params.textDocuments);
    const normalized = normalizeCatalogRecords(records.spells, descriptions);
    const textAvailable = descriptions !== null;
    // `kinds` is never empty: at least one document is required, and every
    // document declares at least one kind — an empty one declares `spell`.
    const sweepSpells = records.kinds.has('spell');

    try {
      return this.db.transaction(() => {
        const counters = this.#importRecords(normalized, sweepSpells);
        const subclasses = importSubclassRecords(this.db, records.subclasses);
        const summary: CatalogImportSummary = {
          ...counters,
          ...subclasses,
          text_available: textAvailable,
          descriptions_loaded: descriptions?.length ?? 0,
        };
        if (params.dryRun === true) {
          throw new DryRunRollback(summary);
        }
        return summary;
      });
    } catch (error) {
      if (error instanceof DryRunRollback) {
        return error.summary;
      }
      throw error;
    }
  }

  #importRecords(
    records: readonly NormalizedCatalogRecord[],
    sweepSpells: boolean,
  ): CounterSummary {
    const summary: CounterSummary = {
      created: 0,
      updated: 0,
      tombstoned: 0,
      identities_created: 0,
      identities_updated: 0,
      publications_created: 0,
      memberships_created: 0,
      tags_created: 0,
      attack_modes_created: 0,
      save_abilities_created: 0,
    };
    const seenVersionKeys: string[] = [];
    const activityChangedVersionIds: number[] = [];

    for (const record of records) {
      const identityId = this.#resolveIdentity(record, summary);
      seenVersionKeys.push(record.versionKey);
      const version = this.db.one(
        'SELECT * FROM spell_versions WHERE content_key = ?',
        [record.versionKey],
      );
      let versionId: number;
      let referenced: boolean;
      let versionChanged: boolean;
      const attributes = this.#versionAttributes(record, identityId);

      if (version === null) {
        const columns = [...Object.keys(attributes), 'created_at', 'updated_at'];
        const now = timestamp();
        versionId = this.db.exec(
          `INSERT INTO spell_versions (${columns.join(', ')})
           VALUES (${placeholders(columns)})`,
          [...Object.values(attributes), now, now],
        ).lastInsertId;
        summary.created += 1;
        referenced = false;
        versionChanged = false;
      } else {
        versionId = sqlInteger(version, 'id');
        referenced = this.#isReferenced(versionId);
        const upgradingPlaceholder =
          version.provenance === 'placeholder';
        const changes: VersionAttributes = {};
        if (!sqlBoolean(version, 'is_active')) {
          changes.is_active = 1;
          activityChangedVersionIds.push(versionId);
        }
        for (const [column, value] of Object.entries(attributes)) {
          if (
            (column === 'short_summary' ||
              !referenced ||
              upgradingPlaceholder) &&
            version[column] !== value
          ) {
            changes[column] = value;
          }
        }
        if (Object.keys(changes).length > 0) {
          changes.updated_at = timestamp();
          const columns = Object.keys(changes);
          this.db.exec(
            `UPDATE spell_versions
             SET ${columns.map((column) => `${column} = ?`).join(', ')}
             WHERE id = ?`,
            [...Object.values(changes), versionId],
          );
        }
        versionChanged = Object.keys(changes).length > 0;
      }

      if (
        !referenced ||
        (version !== null && version.provenance === 'placeholder')
      ) {
        versionChanged =
          this.#syncPublications(
            versionId,
            record.publications,
            summary,
          ) || versionChanged;
        versionChanged =
          this.#syncSimplePivot(
            'spell_list_memberships',
            'spell_list_key',
            versionId,
            record.spellLists,
            'memberships_created',
            summary,
            true,
          ) || versionChanged;

        const tags = [...record.tags];
        if (
          record.ritual ||
          /(?:^|\s)(?:or\s+)?R(?:$|\s)/iu.test(
            record.castingTime ?? '',
          )
        ) {
          tags.push('ritual');
        }
        if (
          record.concentration ||
          /^C(?:,|\s)/iu.test(record.duration ?? '')
        ) {
          tags.push('concentration');
        }
        versionChanged =
          this.#syncSimplePivot(
            'spell_version_tags',
            'tag',
            versionId,
            tags,
            'tags_created',
            summary,
          ) || versionChanged;
        versionChanged =
          this.#syncSimplePivot(
            'spell_version_attack_modes',
            'attack_mode',
            versionId,
            record.attackModes,
            'attack_modes_created',
            summary,
          ) || versionChanged;
        versionChanged =
          this.#syncSimplePivot(
            'spell_version_save_abilities',
            'save_ability',
            versionId,
            record.saveAbilities,
            'save_abilities_created',
            summary,
          ) || versionChanged;
      }

      if (version !== null && versionChanged) {
        summary.updated += 1;
      }
    }

    // See `import` for why this is conditional and why an empty parse still
    // sweeps.
    const tombstones = !sweepSpells
      ? []
      : this.db.all(
          `SELECT id
       FROM spell_versions
       WHERE provenance = 'import'
         AND is_active = 1
         ${
           seenVersionKeys.length === 0
             ? ''
             : `AND content_key NOT IN (${placeholders(seenVersionKeys)})`
         }`,
          seenVersionKeys.length === 0 ? undefined : seenVersionKeys,
        );
    for (const version of tombstones) {
      const versionId = sqlInteger(version, 'id');
      this.db.exec(
        `UPDATE spell_versions
         SET is_active = 0, updated_at = ?
         WHERE id = ?`,
        [timestamp(), versionId],
      );
      activityChangedVersionIds.push(versionId);
      summary.tombstoned += 1;
    }

    this.#refreshAffectedSelections(activityChangedVersionIds);
    return summary;
  }

  #resolveIdentity(
    record: NormalizedCatalogRecord,
    summary: CounterSummary,
  ): number {
    const normalizedName = normalizeCatalogName(record.canonicalName);
    let identity = this.db.one(
      `SELECT id, content_key, canonical_name
       FROM spell_identities
       WHERE content_key = ?`,
      [record.identityKey],
    );
    identity ??= this.db.one(
      `SELECT id, content_key, canonical_name
       FROM spell_identities
       WHERE normalized_name = ?
       ORDER BY id
       LIMIT 1`,
      [normalizedName],
    );
    identity ??= this.db.one(
      `SELECT identity.id, identity.content_key, identity.canonical_name
       FROM spell_identity_aliases AS alias
       INNER JOIN spell_identities AS identity
         ON identity.id = alias.spell_identity_id
       WHERE alias.normalized_alias = ?
       LIMIT 1`,
      [normalizedName],
    );

    if (identity === null) {
      const now = timestamp();
      const identityId = this.db.exec(
        `INSERT INTO spell_identities (
           content_key, canonical_name, normalized_name,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          record.identityKey,
          record.canonicalName,
          normalizedName,
          now,
          now,
        ],
      ).lastInsertId;
      summary.identities_created += 1;
      return identityId;
    }

    const identityId = sqlInteger(identity, 'id');
    const currentName = sqlString(identity, 'canonical_name');
    const currentKey = sqlString(identity, 'content_key');
    if (
      currentName !== record.canonicalName ||
      currentKey.startsWith('placeholder:')
    ) {
      const now = timestamp();
      this.db.exec(
        `INSERT OR IGNORE INTO spell_identity_aliases (
           spell_identity_id, alias, normalized_alias,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          identityId,
          currentName,
          normalizeCatalogName(currentName),
          now,
          now,
        ],
      );
      this.db.exec(
        `UPDATE spell_identities
         SET content_key = ?, canonical_name = ?, normalized_name = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          record.identityKey,
          record.canonicalName,
          normalizedName,
          now,
          identityId,
        ],
      );
      summary.identities_updated += 1;
    }
    return identityId;
  }

  #versionAttributes(
    record: NormalizedCatalogRecord,
    identityId: number,
  ): VersionAttributes {
    return {
      content_key: record.versionKey,
      spell_identity_id: identityId,
      display_name: record.name,
      rules_edition: record.edition,
      level: record.level,
      school: record.school,
      ritual: encodeBoolean(record.ritual),
      concentration: encodeBoolean(record.concentration),
      casting_time: record.castingTime,
      action_type: this.#actionType(record.castingTime),
      range: record.range,
      duration: record.duration,
      components: record.components,
      healing: encodeBoolean(record.healing),
      effect_reliability_category:
        record.effectReliabilityCategory,
      provenance: 'import',
      is_active: 1,
      ...(record.description === undefined
        ? {}
        : { short_summary: record.description }),
    };
  }

  #actionType(castingTime: string | null): string | null {
    if (castingTime === null) {
      return null;
    }
    if (/\bbonus action\b/iu.test(castingTime)) {
      return 'Bonus Action';
    }
    if (/\breaction\b/iu.test(castingTime)) {
      return 'Reaction';
    }
    if (/\baction\b/iu.test(castingTime)) {
      return 'Action';
    }
    return null;
  }

  #isReferenced(versionId: number): boolean {
    return (
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1 FROM spell_selection_slots
              WHERE fixed_spell_version_id = ?
                 OR current_spell_version_id = ?
             UNION ALL
             SELECT 1 FROM wizard_spellbook_entries
              WHERE spell_version_id = ?
             UNION ALL
             SELECT 1 FROM spell_loadout_entries
              WHERE spell_version_id = ?
             UNION ALL
             SELECT 1 FROM character_spell_preferences
              WHERE spell_version_id = ?
           )`,
          [versionId, versionId, versionId, versionId, versionId],
        ) ?? 0,
      ) === 1
    );
  }

  #syncPublications(
    versionId: number,
    desired: readonly CatalogPublication[],
    summary: CounterSummary,
  ): boolean {
    const existing = this.db.all(
      `SELECT id, source_book, source_page, source_reference
       FROM spell_version_publications
       WHERE spell_version_id = ?`,
      [versionId],
    );
    const byBook = new Map(
      existing.map((row) => [sqlString(row, 'source_book'), row]),
    );
    let changed = false;
    for (const publication of desired) {
      const row = byBook.get(publication.sourceBook);
      if (row === undefined) {
        const now = timestamp();
        this.db.exec(
          `INSERT INTO spell_version_publications (
             spell_version_id, source_book, source_page,
             source_reference, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            versionId,
            publication.sourceBook,
            publication.sourcePage,
            publication.sourceReference,
            now,
            now,
          ],
        );
        summary.publications_created += 1;
        changed = true;
        continue;
      }
      if (
        row.source_page !== publication.sourcePage ||
        row.source_reference !== publication.sourceReference
      ) {
        this.db.exec(
          `UPDATE spell_version_publications
           SET source_page = ?, source_reference = ?, updated_at = ?
           WHERE id = ?`,
          [
            publication.sourcePage,
            publication.sourceReference,
            timestamp(),
            sqlInteger(row, 'id'),
          ],
        );
        changed = true;
      }
    }

    const desiredBooks = new Set(
      desired.map((publication) => publication.sourceBook),
    );
    const removed = [...byBook.keys()].filter(
      (book) => !desiredBooks.has(book),
    );
    if (removed.length > 0) {
      this.db.exec(
        `DELETE FROM spell_version_publications
         WHERE spell_version_id = ?
           AND source_book IN (${placeholders(removed)})`,
        [versionId, ...removed],
      );
      changed = true;
    }
    return changed;
  }

  #syncSimplePivot(
    table: string,
    column: string,
    versionId: number,
    desiredValues: readonly string[],
    createdCounter:
      | 'memberships_created'
      | 'tags_created'
      | 'attack_modes_created'
      | 'save_abilities_created',
    summary: CounterSummary,
    timestamps = false,
  ): boolean {
    const desired = [...new Set(desiredValues)].sort();
    const existing = this.db
      .all(
        `SELECT ${column}
         FROM ${table}
         WHERE spell_version_id = ?`,
        [versionId],
      )
      .map((row) => sqlString(row, column))
      .sort();
    if (sameValues(existing, desired)) {
      return false;
    }

    const existingSet = new Set(existing);
    for (const value of desired.filter((item) => !existingSet.has(item))) {
      const columns = ['spell_version_id', column];
      const values: BindableValue[] = [versionId, value];
      if (timestamps) {
        const now = timestamp();
        columns.push('created_at', 'updated_at');
        values.push(now, now);
      }
      this.db.exec(
        `INSERT INTO ${table} (${columns.join(', ')})
         VALUES (${placeholders(columns)})`,
        values,
      );
      summary[createdCounter] += 1;
    }

    const desiredSet = new Set(desired);
    const removed = existing.filter((item) => !desiredSet.has(item));
    if (removed.length > 0) {
      this.db.exec(
        `DELETE FROM ${table}
         WHERE spell_version_id = ?
           AND ${column} IN (${placeholders(removed)})`,
        [versionId, ...removed],
      );
    }
    return true;
  }

  #refreshAffectedSelections(versionIds: readonly number[]): void {
    const uniqueIds = [...new Set(versionIds)];
    if (uniqueIds.length === 0) {
      return;
    }
    const slots = this.db.all<SqlRow>(
      `SELECT id
       FROM spell_selection_slots
       WHERE fixed_spell_version_id IN (${placeholders(uniqueIds)})
          OR current_spell_version_id IN (${placeholders(uniqueIds)})
       ORDER BY id`,
      [...uniqueIds, ...uniqueIds],
    );
    for (const slot of slots) {
      this.#eligibility.refresh(sqlInteger(slot, 'id'));
    }
  }
}
