import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import {
  encodeBoolean,
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  rowId,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  encodeSpellComponents,
  parseSpellComponents,
} from '../domain/spell-components';
import { encodeSpellRange, parseSpellRange } from '../domain/spell-range';
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
  subclassImportNodes,
  type SubclassImportCounters,
} from './subclass-importer';
import {
  equipmentImportNodes,
  type EquipmentImportCounters,
} from './equipment-importer';
import {
  sourceContentImportNodes,
  type SourceContentImportCounters,
} from './source-content-importer';
import { spellActionType, spellTags } from './spell-document-semantics';
import { projectSpellDocumentV1 } from './spell-content-projector-v1';
import type { ContentKey } from '../domain/ids';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportCommitResult,
  type ContentImportNode,
  type ContentImportPlan,
  type ContentImportPlanToken,
  type ContentImportProjection,
  type ContentImportSpellActivityChange,
} from './content-adoption';
import {
  assertedExternalContentKey,
  assertedExternalContentKeyFromDeclared,
  normalizeCatalogKeyComponent,
} from './catalog-key';
import { projectStoredContentV1 } from './stored-content-projector-v1';
import { deriveContentIdentityV1 } from './content-identity';

/** The identity a spell version hangs off, in the three ways it is found. */
const spellIdentity: RowCodec<{
  readonly id: number;
  readonly content_key: string;
  readonly canonical_name: string;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  content_key: sqlString(row, 'content_key'),
  canonical_name: sqlString(row, 'canonical_name'),
});

/**
 * `source_page` is a NULLABLE INTEGER and `source_reference` a NULLABLE TEXT —
 * `db/schema/catalog-spells.ts:223-224`, and `CatalogPublication.sourcePage` is
 * `number | null` to match. A book with no page number is a normal record, not a
 * broken one.
 *
 * Worth recording: the first draft of this codec typed `source_page` as a
 * string, and three integration tests failed with
 * `Column "source_page" must be a string; received 14.` The old codec-less read
 * would have carried the number through untouched and compared it to a number
 * anyway — so nothing would have broken, and nothing would have been checked
 * either. The codec is the only reason the wrong assumption was ever said out
 * loud.
 */
const spellPublication: RowCodec<{
  readonly id: number;
  readonly source_book: string;
  readonly source_page: number | null;
  readonly source_reference: string | null;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  source_book: sqlString(row, 'source_book'),
  source_page: sqlNullableInteger(row, 'source_page'),
  source_reference: sqlNullableString(row, 'source_reference'),
});

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
  weapons_created: number;
  weapons_matched: number;
  armors_created: number;
  armors_matched: number;
  items_created: number;
  items_matched: number;
  item_definition_effects_created: number;
  classes_matched: number;
  feats_created: number;
  feats_matched: number;
  species_created: number;
  species_matched: number;
  backgrounds_created: number;
  backgrounds_matched: number;
  text_available: boolean;
  descriptions_loaded: number;
}

export type CatalogImportResult = CatalogImportSummary | ContentImportPlan;

export type CatalogImportCommitResult =
  | (Extract<ContentImportCommitResult, { readonly kind: 'committed' }> & {
      readonly summary: CatalogImportSummary;
    })
  | Exclude<ContentImportCommitResult, { readonly kind: 'committed' }>;

interface PreparedCatalogImport {
  readonly nodes: readonly ContentImportNode[];
  readonly normalized: readonly NormalizedCatalogRecord[];
  readonly sweepSpells: boolean;
  readonly summary: CatalogImportSummary;
}

type CounterSummary = Omit<
  CatalogImportSummary,
  | 'text_available'
  | 'descriptions_loaded'
  | keyof SubclassImportCounters
  | keyof EquipmentImportCounters
  | keyof SourceContentImportCounters
>;

type VersionAttributes = Record<
  string,
  string | number | null
>;

/**
 * THE TWO PROGRESSION FACTS, AND THE ONE EXEMPTION FROM THE REFERENCED-VERSION
 * FREEZE THAT IS NOT A CHANGE TO A RULE.
 *
 * A version a character REFERENCES is frozen: `docs/CATALOG-IMPORT.md` states
 * it as *"its imported rules and pivots are preserved byte-for-byte"*, and the
 * reason is that a spell must not change under a character who has already
 * chosen it. `short_summary` has always been exempt for the reason the same
 * paragraph gives — *"optional text can still be filled in"* — and that
 * exemption is not a hole in the freeze, it is the freeze's own distinction
 * between CHANGING a stored fact and SUPPLYING one that was never stored.
 *
 * BOTH PROGRESSIONS ARE NET-NEW, WHICH MAKES THAT DISTINCTION DECISIVE RATHER
 * THAN ACADEMIC. No catalog document written before them carries `upcastLevels`
 * or `cantripUpgradeLevels`, so EVERY existing version has both facts absent —
 * and a version is referenced precisely when a character uses it, which is
 * precisely when the printable card renders it. Frozen unconditionally, the
 * only spells that print a progression are the ones no character has, and a
 * user re-importing an improved document to get it is told `updated: 0`.
 *
 * SO THE EXEMPTION IS A FILL, NEVER AN OVERWRITE, AND IT IS ALL-OR-NOTHING
 * WITHIN EACH FACT. A fact is fillable only when the version says NOTHING about
 * it: no summary and no level rows. Filling the halves independently would let
 * a stored summary describing one ladder sit beside a document's levels
 * describing another, and the card prints them on one line — a new wrong
 * sentence invented by the fix for an absence.
 *
 * TWO SETS AND NOT ONE, because they are two facts. A version that already
 * states its slot-level upcasting can still be given the Cantrip Upgrade it
 * has never had, and vice versa; folding them into one gate would freeze both
 * because either was present, which is a freeze on content nobody stored.
 */
const UPCAST_COLUMNS = new Set(['upcast_summary']);
const CANTRIP_UPGRADE_COLUMNS = new Set(['cantrip_upgrade_summary']);

/**
 * The two level ladders, as a closed union. Interpolated into SQL by
 * `#syncLevels` and `#levelCount`, so it is deliberately NOT `string`: the
 * union is what makes the interpolation safe by construction rather than by a
 * caller's discipline.
 */
type LevelTable =
  | 'spell_version_upcast_levels'
  | 'spell_version_cantrip_upgrade_levels';

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
  import(params: CatalogImportParams): CatalogImportSummary;
  import(params: CatalogImportParams): CatalogImportResult {
    const prepared = this.#prepare(params);
    const plan = this.#planPrepared(prepared, Object.freeze({}));
    if (
      plan.reviews.length > 0 ||
      plan.outcomes.some((outcome) => outcome.kind === 'refused')
    ) {
      return plan;
    }
    const commit = (): CatalogImportCommitResult => this.#commitPrepared(
      prepared,
      plan.token,
      Object.freeze({}),
    );
    if (params.dryRun === true) {
      try {
        return this.db.transaction(() => {
          const result = commit();
          if (result.kind !== 'committed') {
            return result.kind === 'stale-plan' ? result.freshPlan : plan;
          }
          throw new DryRunRollback(result.summary);
        });
      } catch (error) {
        if (error instanceof DryRunRollback) return error.summary;
        throw error;
      }
    }
    const result = commit();
    if (result.kind === 'committed') return result.summary;
    return result.kind === 'stale-plan'
      ? result.freshPlan
      : plan;
  }

  plan(
    params: CatalogImportParams,
    choices: ContentImportChoices = Object.freeze({}),
  ): ContentImportPlan {
    return this.#planPrepared(this.#prepare(params), choices);
  }

  commit(
    params: CatalogImportParams,
    token: ContentImportPlanToken,
    choices: ContentImportChoices = Object.freeze({}),
  ): CatalogImportCommitResult {
    return this.#commitPrepared(this.#prepare(params), token, choices);
  }

  #prepare(params: CatalogImportParams): PreparedCatalogImport {
    const records = parseCatalogDocuments(params.documents);
    const descriptions = parseDescriptionDocuments(params.textDocuments);
    const normalized = normalizeCatalogRecords(records.spells, descriptions);
    const summary: CatalogImportSummary = {
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
      subclasses_created: 0,
      subclasses_updated: 0,
      subclass_features_created: 0,
      weapons_created: 0,
      weapons_matched: 0,
      armors_created: 0,
      armors_matched: 0,
      items_created: 0,
      items_matched: 0,
      item_definition_effects_created: 0,
      classes_matched: 0,
      feats_created: 0,
      feats_matched: 0,
      species_created: 0,
      species_matched: 0,
      backgrounds_created: 0,
      backgrounds_matched: 0,
      text_available: descriptions !== null,
      descriptions_loaded: descriptions?.length ?? 0,
    };
    const nodes = [
      ...normalized.map((record) => this.#spellImportNode(record, summary)),
      ...subclassImportNodes(this.db, records.subclasses, summary),
      ...equipmentImportNodes(records, summary),
      ...sourceContentImportNodes(this.db, records, summary),
    ];
    return Object.freeze({
      nodes: Object.freeze(nodes),
      normalized: Object.freeze(normalized),
      sweepSpells: records.kinds.has('spell'),
      summary,
    });
  }

  #spellImportNode(
    record: NormalizedCatalogRecord,
    summary: CatalogImportSummary,
  ): ContentImportNode<'spell'> {
    const declaredProjection = projectSpellDocumentV1(record);
    const declaredIdentity = deriveContentIdentityV1({
      kind: 'spell',
      edition: record.edition,
      name: record.name,
      payload: declaredProjection.payload,
    });
    const declaredFingerprintExists = this.db.scalar<number>(
      `SELECT 1 FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND fingerprint_scheme = ?
         AND fingerprint_digest = ?
       LIMIT 1`,
      [declaredIdentity.envelope.scheme, declaredIdentity.digest],
    ) === 1;
    const declaredKeyIsBundled = this.db.scalar<string>(
      `SELECT catalog_layer FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [record.versionKey],
    ) === 'bundled';
    const assertedKey = declaredFingerprintExists && declaredKeyIsBundled
      ? assertedExternalContentKey('spell', record.edition, record.name)
      : assertedExternalContentKeyFromDeclared(
          'spell', record.edition, record.name, record.versionKey,
        );
    const baseRecord = assertedKey !== record.versionKey && !declaredFingerprintExists
      ? {
          ...record,
          versionKey: assertedKey,
          identityKey: `user-spell:${normalizeCatalogKeyComponent(record.name)}`,
        }
      : record;
    const build = (
      name: string,
      nextKey: ContentKey,
    ): ContentImportProjection<'spell'> => {
      const renamed = name === baseRecord.name && nextKey === assertedKey
        ? baseRecord
        : {
            ...baseRecord,
            name,
            canonicalName: name,
            versionKey: nextKey,
            identityKey: `user-spell:${normalizeCatalogKeyComponent(name)}`,
          };
      const projected = projectSpellDocumentV1(renamed);
      return {
        kind: 'spell',
        edition: renamed.edition,
        name: renamed.name,
        assertedKey: nextKey,
        payload: projected.payload,
        installExact: true,
        ...(baseRecord === record && assertedKey !== record.versionKey
          ? { declaredAlias: record.versionKey as ContentKey }
          : {}),
        projectStored: (database, contentKey) =>
          projectStoredContentV1(database, 'spell', contentKey) as
            ReturnType<ContentImportProjection<'spell'>['projectStored']>,
        install: (_database, _contentKey, _projection, phase) => {
          const counters = this.#importRecords([renamed], false);
          if (phase === 'commit') this.#mergeCounterSummary(summary, counters);
        },
      };
    };
    const reproject: NonNullable<ContentImportNode<'spell'>['reproject']> =
      ({ name, assertedKey: nextKey }) => build(name, nextKey);
    const node: ContentImportNode<'spell'> = Object.freeze({
      id: `spell:${record.versionKey}`,
      projection: build(record.name, assertedKey),
      reproject,
    });
    return node;
  }

  #mergeCounterSummary(
    summary: CatalogImportSummary,
    counters: CounterSummary,
  ): void {
    for (const key of Object.keys(counters) as (keyof CounterSummary)[]) {
      summary[key] += counters[key];
    }
  }

  #commitPrepared(
    prepared: PreparedCatalogImport,
    token: ContentImportPlanToken,
    choices: ContentImportChoices,
  ): CatalogImportCommitResult {
    const planned = this.#planPrepared(prepared, choices);
    if (planned.token !== token) {
      return Object.freeze({ kind: 'stale-plan', freshPlan: planned });
    }
    const spellKeys = planned.outcomes.flatMap((outcome) => {
      const node = prepared.nodes.find((candidate) => candidate.id === outcome.id);
      return node?.projection.kind === 'spell' && outcome.kind !== 'refused'
        ? [outcome.contentKey]
        : [];
    });
    const result = commitContentImport(this.db, {
      nodes: prepared.nodes,
      token: planned.token,
      choices,
      spellActivityChanges: planned.spellActivityChanges,
      afterInstall: () => {
        if (prepared.sweepSpells) {
          this.#sweepAbsentSpells(
            spellKeys,
            prepared.summary,
          );
        }
      },
    });
    if (result.kind !== 'committed') return result;
    for (const outcome of result.outcomes) {
      if (outcome.kind === 'create' || outcome.kind === 'refused') continue;
      const kind = prepared.nodes.find((node) => node.id === outcome.id)
        ?.projection.kind;
      if (kind === 'class') prepared.summary.classes_matched += 1;
      if (kind === 'feat') prepared.summary.feats_matched += 1;
      if (kind === 'species') prepared.summary.species_matched += 1;
      if (kind === 'background') prepared.summary.backgrounds_matched += 1;
      if (kind === 'weapon') prepared.summary.weapons_matched += 1;
      if (kind === 'armor') prepared.summary.armors_matched += 1;
      if (kind === 'item') prepared.summary.items_matched += 1;
    }
    return Object.freeze({ ...result, summary: Object.freeze({ ...prepared.summary }) });
  }

  #planPrepared(
    prepared: PreparedCatalogImport,
    choices: ContentImportChoices,
  ): ContentImportPlan {
    const unbound = planContentImport(this.db, prepared.nodes, choices);
    const seenSpellKeys = unbound.outcomes.flatMap((outcome) => {
      const node = prepared.nodes.find((candidate) => candidate.id === outcome.id);
      return node?.projection.kind === 'spell' && outcome.kind !== 'refused'
        ? [outcome.contentKey]
        : [];
    });
    const installedSpellKeys = unbound.outcomes.flatMap((outcome) => {
      const node = prepared.nodes.find((candidate) => candidate.id === outcome.id);
      return node?.projection.kind === 'spell' &&
          (outcome.kind === 'create' || outcome.kind === 'match')
        ? [outcome.contentKey]
        : [];
    });
    const activity = this.#spellActivityChanges(
      installedSpellKeys,
      seenSpellKeys,
      prepared.sweepSpells,
    );
    return planContentImport(this.db, prepared.nodes, choices, activity);
  }

  #spellActivityChanges(
    installedKeys: readonly ContentKey[],
    seenKeys: readonly ContentKey[],
    sweepSpells: boolean,
  ): readonly ContentImportSpellActivityChange[] {
    const seen = new Set<string>(seenKeys);
    const changes: ContentImportSpellActivityChange[] = [];
    if (installedKeys.length > 0) {
      const inactive = this.db.allRaw(
        `SELECT content_key FROM spell_versions
         WHERE is_active = 0
           AND content_key IN (${placeholders(installedKeys)})`,
        installedKeys,
      );
      for (const row of inactive) {
        changes.push({
          contentKey: String(row.content_key) as ContentKey,
          action: 'reactivate',
        });
      }
    }
    if (sweepSpells) {
      const active = this.db.allRaw(
        `SELECT content_key FROM spell_versions
         WHERE provenance = 'import' AND is_active = 1
         ORDER BY content_key`,
      );
      for (const row of active) {
        const contentKey = String(row.content_key) as ContentKey;
        if (!seen.has(contentKey)) {
          changes.push({ contentKey, action: 'deactivate' });
        }
      }
    }
    return Object.freeze(changes.sort((left, right) =>
      left.contentKey === right.contentKey
        ? left.action.localeCompare(right.action)
        : left.contentKey.localeCompare(right.contentKey),
    ).map((change) => Object.freeze(change)));
  }

  #sweepAbsentSpells(
    seenVersionKeys: readonly string[],
    summary: Pick<CatalogImportSummary, 'tombstoned'>,
  ): void {
    const tombstones = this.db.all(
      `SELECT id
       FROM spell_versions
       WHERE provenance = 'import' AND is_active = 1
         ${seenVersionKeys.length === 0
          ? ''
          : `AND content_key NOT IN (${placeholders(seenVersionKeys)})`}`,
      seenVersionKeys.length === 0 ? undefined : seenVersionKeys,
      rowId,
    );
    for (const versionId of tombstones) {
      this.db.exec(
        `UPDATE spell_versions SET is_active = 0, updated_at = ? WHERE id = ?`,
        [timestamp(), versionId],
      );
      summary.tombstoned += 1;
    }
    this.#refreshAffectedSelections(tombstones);
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
      // RAW on purpose: the loop below compares `version[column]` against
      // `attributes`, whose keys are whatever `#versionAttributes` produced for
      // THIS record. Decoding to a fixed shape would close the column set that
      // the comparison exists to keep open.
      const version = this.db.oneRaw(
        'SELECT * FROM spell_versions WHERE content_key = ?',
        [record.versionKey],
      );
      let versionId: number;
      let referenced: boolean;
      let versionChanged: boolean;
      // See {@link UPCAST_COLUMNS}. Both `false` for a version this import
      // CREATED, which needs no exemption because nothing is frozen on it.
      let upcastFillable = false;
      let cantripUpgradeFillable = false;
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
        const fillable = referenced && !upgradingPlaceholder;
        upcastFillable =
          fillable &&
          version.upcast_summary === null &&
          this.#levelCount('spell_version_upcast_levels', versionId) === 0;
        cantripUpgradeFillable =
          fillable &&
          version.cantrip_upgrade_summary === null &&
          this.#levelCount(
            'spell_version_cantrip_upgrade_levels',
            versionId,
          ) === 0;
        const changes: VersionAttributes = {};
        if (!sqlBoolean(version, 'is_active')) {
          changes.is_active = 1;
          activityChangedVersionIds.push(versionId);
        }
        for (const [column, value] of Object.entries(attributes)) {
          const writable =
            !referenced ||
            upgradingPlaceholder ||
            column === 'short_summary' ||
            (upcastFillable && UPCAST_COLUMNS.has(column)) ||
            (cantripUpgradeFillable && CANTRIP_UPGRADE_COLUMNS.has(column));
          if (writable && version[column] !== value) {
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

        const tags = spellTags(record);
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

      // OUTSIDE the freeze block, and {@link UPCAST_COLUMNS} says why. Each
      // list is the other half of the same fact as its summary column, so it
      // moves on exactly the condition that column moves on — and the two facts
      // are gated separately because they are two facts.
      const unfrozen =
        !referenced ||
        (version !== null && version.provenance === 'placeholder');
      if (unfrozen || upcastFillable) {
        versionChanged =
          this.#syncLevels(
            'spell_version_upcast_levels',
            versionId,
            record.upcastLevels,
          ) || versionChanged;
      }
      if (unfrozen || cantripUpgradeFillable) {
        versionChanged =
          this.#syncLevels(
            'spell_version_cantrip_upgrade_levels',
            versionId,
            record.cantripUpgradeLevels,
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
          rowId,
        );
    for (const versionId of tombstones) {
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
      spellIdentity,
    );
    identity ??= this.db.one(
      `SELECT id, content_key, canonical_name
       FROM spell_identities
       WHERE normalized_name = ?
       ORDER BY id
       LIMIT 1`,
      [normalizedName],
      spellIdentity,
    );
    identity ??= this.db.one(
      `SELECT identity.id, identity.content_key, identity.canonical_name
       FROM spell_identity_aliases AS alias
       INNER JOIN spell_identities AS identity
         ON identity.id = alias.spell_identity_id
       WHERE alias.normalized_alias = ?
       LIMIT 1`,
      [normalizedName],
      spellIdentity,
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

    const identityId = identity.id;
    const currentName = identity.canonical_name;
    const currentKey = identity.content_key;
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
      action_type: spellActionType(record.castingTime),
      range: record.range,
      duration: record.duration,
      components: record.components,
      // The printed lines above stay VERBATIM; these are read out of them.
      // Both parsers return "nothing recognised" rather than a guess, so a
      // range or components line this build cannot read stores NULLs and
      // still prints exactly as the author wrote it.
      ...encodeSpellRange(parseSpellRange(record.range)),
      ...encodeSpellComponents(parseSpellComponents(record.components)),
      upcast_summary: record.upcastSummary,
      cantrip_upgrade_summary: record.cantripUpgradeSummary,
      healing: encodeBoolean(record.healing),
      requires_mod_for_effect: encodeBoolean(record.requiresModForEffect === true),
      effect_reliability_category:
        record.effectReliabilityCategory,
      provenance: 'import',
      is_active: 1,
      ...(record.description === undefined
        ? {}
        : { short_summary: record.description }),
    };
  }

  /**
   * How many rows one of the two level ladders currently holds. See
   * {@link UPCAST_COLUMNS}.
   */
  #levelCount(table: LevelTable, versionId: number): number {
    return Number(
      this.db.scalar(
        `SELECT COUNT(*) FROM ${table} WHERE spell_version_id = ?`,
        [versionId],
      ) ?? 0,
    );
  }

  /**
   * REPLACE ONE OF A SPELL'S TWO LEVEL LADDERS WITH THE DOCUMENT'S.
   *
   * SEPARATE FROM `#syncSimplePivot` RATHER THAN GENERICISED OVER IT, and the
   * reason is the sort. That helper compares two `string[]`s sorted
   * LEXICOGRAPHICALLY, which orders levels `1, 11, 17, 2, 5`. The comparison
   * would still be correct — both sides are sorted the same way — but the
   * insert order would not be, and a "list of levels" whose stored order is
   * `11` before `2` is a list a reader has to re-sort.
   *
   * PARAMETERISED BY TABLE, WHICH IS NOT THE SAME WIDENING. `LevelTable` is a
   * two-member literal union, so a typo is a compile error and no caller can
   * reach a table this method was not written for; and the two callers are
   * genuinely the same operation on the same shape, which is what the sort
   * argument above says `#syncSimplePivot` is not.
   *
   * A FULL REPLACEMENT, like every other pivot here: the document is the whole
   * truth about the record it describes, so a level the document dropped is a
   * level the spell no longer changes at.
   */
  #syncLevels(
    table: LevelTable,
    versionId: number,
    desiredLevels: readonly number[],
  ): boolean {
    const desired = [...new Set(desiredLevels)].sort(
      (left, right) => left - right,
    );
    const existing = this.db
      .all(
        `SELECT level
         FROM ${table}
         WHERE spell_version_id = ?
         ORDER BY level`,
        [versionId],
        (row) => sqlInteger(row, 'level'),
      );
    if (
      existing.length === desired.length &&
      existing.every((level, index) => level === desired[index])
    ) {
      return false;
    }
    this.db.exec(
      `DELETE FROM ${table} WHERE spell_version_id = ?`,
      [versionId],
    );
    for (const level of desired) {
      this.db.exec(
        `INSERT INTO ${table} (spell_version_id, level) VALUES (?, ?)`,
        [versionId, level],
      );
    }
    return true;
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
      spellPublication,
    );
    const byBook = new Map(existing.map((row) => [row.source_book, row]));
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
            row.id,
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
    // The COLUMN is chosen at runtime, but the codec still decodes: it closes
    // over `column` rather than handing the caller a raw row to index.
    const existing = this.db
      .all(
        `SELECT ${column}
         FROM ${table}
         WHERE spell_version_id = ?`,
        [versionId],
        (row) => sqlString(row, column),
      )
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
    const slots = this.db.all(
      `SELECT id
       FROM spell_selection_slots
       WHERE fixed_spell_version_id IN (${placeholders(uniqueIds)})
          OR current_spell_version_id IN (${placeholders(uniqueIds)})
       ORDER BY id`,
      [...uniqueIds, ...uniqueIds],
      rowId,
    );
    for (const slotId of slots) {
      this.#eligibility.refresh(slotId);
    }
  }
}
