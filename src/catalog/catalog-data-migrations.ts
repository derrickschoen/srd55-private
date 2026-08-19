import type { DatabaseContext } from '../db/database';
import { sha256 } from '../crypto/sha256';
import {
  contentFingerprintSchemeRegistry,
  CONTENT_FINGERPRINT_SCHEME_V1,
  CONTENT_FINGERPRINT_SCHEME_V2,
  type ContentFingerprintScheme,
} from './content-identity';
import lineageDeleteGuardSource from './catalog-lineage-delete-guard.ts?raw';
import retirementSource from './retire-non-srd-bundled-subclasses-v1.ts?raw';
import {
  retireNonSrdBundledSubclassesV1,
} from './retire-non-srd-bundled-subclasses-v1';
import lineageMigrationSource from './reconcile-species-lineage-content-v2.ts?raw';
import lineageSeedSource from '../rules/origin-definitions-srd.ts?raw';
import configuredChoiceSource from '../grants/configured-choice-rule.ts?raw';
import configuredChoiceErrorsSource from '../grants/configured-choice-rule-errors.ts?raw';
import grantRuleSource from '../grants/grant-rule.ts?raw';
import grantRuleErrorsSource from '../grants/grant-rule-errors.ts?raw';
import sourceRuleReaderSource from '../grants/source-rule-reader.ts?raw';
import sourceRuleReaderErrorsSource from '../grants/source-rule-reader-errors.ts?raw';
import sourceInstanceStateSource from '../domain/source-instance-state.ts?raw';
import characterLevelSource from '../rules/character-level.ts?raw';
import slotGeneratorSource from '../grants/grant-rule-slot-generator.ts?raw';
import slotGeneratorErrorsSource from '../grants/grant-rule-slot-generator-errors.ts?raw';
import grantPlannerSource from '../grants/grant-rule-planner.ts?raw';
import skillGrantsSource from '../grants/skill-grants.ts?raw';
import skillExpertiseGrantsSource from '../grants/skill-expertise-grants.ts?raw';
import spellEligibilitySource from '../eligibility/spell-selection-eligibility.ts?raw';
import spellConstraintSource from '../eligibility/spell-selection-constraint.ts?raw';
import storedProjectorSource from './stored-authored-content-projector-v1.ts?raw';
import contentIdentitySource from './content-identity.ts?raw';
import contentRegistrySource from './content-registry.ts?raw';
import { reconcileSpeciesLineageContentV2 } from './reconcile-species-lineage-content-v2';
import {
  CatalogDataMigrationChecksumMismatchError,
  CatalogDataMigrationDuplicateIdError,
  CatalogDataMigrationDuplicateSourcePathError,
  CatalogDataMigrationForeignKeyError,
  CatalogDataMigrationIdEmptyError,
  CatalogDataMigrationMarkerDisagreementError,
  CatalogDataMigrationMarkerMalformedError,
  CatalogDataMigrationProjectorSchemeError,
  CatalogDataMigrationSourcesEmptyError,
  CatalogDataMigrationUnregisteredMarkerError,
} from './catalog-data-migrations-errors';

/**
 * One append-only semantic catalog migration.
 *
 * `sources` explicitly lists the committed TypeScript modules whose
 * migration-specific behaviour determines its reconciled rows, including
 * decision-bearing runtime dependencies. Generic runtime infrastructure and
 * type-only imports stay outside this boundary. Each module is imported with
 * Vite's `?raw` suffix; emitted JavaScript function source is not a stable
 * persistence checksum.
 */
export interface CatalogDataMigrationSource {
  readonly path: string;
  readonly bytes: string;
}

export interface CatalogDataMigration {
  readonly id: string;
  readonly projectorScheme: ContentFingerprintScheme;
  readonly sources: readonly CatalogDataMigrationSource[];
  readonly checksum: string;
  run(db: DatabaseContext): void;
}

/**
 * Hash an explicit source set without depending on discovery or caller order.
 * Repository paths define the fixed order; JSON tuple framing keeps adjacent
 * paths and source bytes unambiguous.
 */
export function catalogDataMigrationChecksum(
  sources: readonly CatalogDataMigrationSource[],
): string {
  const ordered = [...sources].sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return sha256(JSON.stringify(
    ordered.map(({ path, bytes }) => [path, bytes]),
  ));
}

/** Append-only, checksum-frozen product-data migrations. */
export const CATALOG_DATA_MIGRATIONS: readonly CatalogDataMigration[] =
  Object.freeze([
    Object.freeze({
      id: 'retire_non_srd_bundled_subclasses_v1',
      projectorScheme: CONTENT_FINGERPRINT_SCHEME_V1,
      sources: Object.freeze([
        Object.freeze({
          path: 'src/catalog/retire-non-srd-bundled-subclasses-v1.ts',
          bytes: retirementSource,
        }),
        Object.freeze({
          path: 'src/catalog/catalog-lineage-delete-guard.ts',
          bytes: lineageDeleteGuardSource,
        }),
      ]),
      checksum:
        '69781850c8b75e9e83cffd421f278810986859af07d2366e2e44ac854259eb4a',
      run: retireNonSrdBundledSubclassesV1,
    }),
    Object.freeze({
      id: 'reconcile_species_lineage_content_v2',
      projectorScheme: CONTENT_FINGERPRINT_SCHEME_V2,
      sources: Object.freeze([
        Object.freeze({
          path: 'src/catalog/reconcile-species-lineage-content-v2.ts',
          bytes: lineageMigrationSource,
        }),
        Object.freeze({
          path: 'src/rules/origin-definitions-srd.ts',
          bytes: lineageSeedSource,
        }),
        Object.freeze({
          path: 'src/grants/configured-choice-rule.ts',
          bytes: configuredChoiceSource,
        }),
        Object.freeze({
          path: 'src/grants/configured-choice-rule-errors.ts',
          bytes: configuredChoiceErrorsSource,
        }),
        Object.freeze({
          path: 'src/grants/grant-rule.ts',
          bytes: grantRuleSource,
        }),
        Object.freeze({
          path: 'src/grants/grant-rule-errors.ts',
          bytes: grantRuleErrorsSource,
        }),
        Object.freeze({
          path: 'src/grants/source-rule-reader.ts',
          bytes: sourceRuleReaderSource,
        }),
        Object.freeze({
          path: 'src/grants/source-rule-reader-errors.ts',
          bytes: sourceRuleReaderErrorsSource,
        }),
        // D226 round 2: `source-rule-reader.ts`'s decode THROWS on a state
        // outside this array, so the array decides whether reconciliation
        // accepts a row or aborts. It is a module of its own precisely so this
        // pin covers one vocabulary rather than every vocabulary in `enums.ts`.
        Object.freeze({
          path: 'src/domain/source-instance-state.ts',
          bytes: sourceInstanceStateSource,
        }),
        Object.freeze({
          path: 'src/rules/character-level.ts',
          bytes: characterLevelSource,
        }),
        Object.freeze({
          path: 'src/grants/grant-rule-slot-generator.ts',
          bytes: slotGeneratorSource,
        }),
        Object.freeze({
          path: 'src/grants/grant-rule-slot-generator-errors.ts',
          bytes: slotGeneratorErrorsSource,
        }),
        Object.freeze({
          path: 'src/grants/grant-rule-planner.ts',
          bytes: grantPlannerSource,
        }),
        Object.freeze({
          path: 'src/grants/skill-grants.ts',
          bytes: skillGrantsSource,
        }),
        Object.freeze({
          path: 'src/grants/skill-expertise-grants.ts',
          bytes: skillExpertiseGrantsSource,
        }),
        Object.freeze({
          path: 'src/eligibility/spell-selection-eligibility.ts',
          bytes: spellEligibilitySource,
        }),
        Object.freeze({
          path: 'src/eligibility/spell-selection-constraint.ts',
          bytes: spellConstraintSource,
        }),
        Object.freeze({
          path: 'src/catalog/stored-authored-content-projector-v1.ts',
          bytes: storedProjectorSource,
        }),
        Object.freeze({
          path: 'src/catalog/content-identity.ts',
          bytes: contentIdentitySource,
        }),
        Object.freeze({
          path: 'src/catalog/content-registry.ts',
          bytes: contentRegistrySource,
        }),
      ]),
      // Re-pinned 2026-08-13: the SRD attribution header in
      // origin-definitions-srd.ts was corrected from the 5.2 statement to the
      // 5.2.1 statement the source document requires (comment-only diff,
      // verified; no reconciled row changes).
      //
      // Re-pinned again 2026-08-13 (D226 working exactly as designed):
      // grant-rule.ts and grant-rule-slot-generator.ts changed together — a
      // grant_source rule may now DECLARE `allows_pending_choice`, and one
      // that does materialises nothing while the config naming what it grants
      // is unwritten, instead of throwing. This migration's OWN reconciled
      // rows are unaffected: lineage grants reach the generator as
      // configured_choice OPTION GRANTS, which are fixed_spell rules, and none
      // of them is a grant_source delegating its definition to config, so no
      // lineage row can take the new path and none can carry the new field.
      // (Species SKILL grants are not option grants at all — they are
      // synchronised by their own `syncSpeciesSkillGrants` arm, outside this
      // seam.) The pin moves anyway because D226 freezes the TRANSITIVE
      // SOURCE, not the subset of it a migration happens to exercise — a
      // freeze covering only the exercised subset would be a claim broader
      // than the freeze.
      // MERGE 2026-08-13: champion (allows_pending_choice) and R4 (typed state +
      // frozen source-instance-state module) both moved this pin; recomputed
      // below over the MERGED frozen sources by the designed procedure.
      // Re-pinned 2026-08-13 (R4, D226), twice in one lane and the second time
      // is the interesting one. Round 1: `src/grants/source-rule-reader.ts` — a
      // frozen source — gained a throwing decode for
      // `character_source_instances.state`, narrowing `GrantSourceInstance.state`
      // to `SourceInstanceState`. Round 2: codex found that freeze INCOMPLETE,
      // and correctly — the decode's behaviour now depends on the vocabulary
      // array, which lived in `enums.ts` and was not pinned, so editing the
      // enum could change what this migration accepts without moving this
      // checksum. `src/domain/source-instance-state.ts` above is the remedy and
      // exists for it. No reconciled row changes in either round: every source
      // instance this walks holds `active` or `tombstoned`.
      // Re-pinned 2026-08-17 at the merge of D299, the grants tagged-error
      // migration, and the catalog tagged-error migration: the pin covers the
      // combined source set (grants' four sibling error modules plus the
      // catalog lane's migrated modules). Reconciled rows unchanged by all.
      // Re-pinned 2026-08-18 after spell eligibility split its point-read path
      // from the equivalent build-scoped snapshot path. Reconciliation still
      // calls the point-read API and its rows are unchanged; D226 freezes the
      // complete source module, so the pin moves with the added path anyway.
      // Re-pinned 2026-08-18 after content identity's key comparator gained a
      // semantics-preserving native fast path. The 444-aggregate digest oracle
      // is unchanged; D226 freezes source bytes, so this checksum still moves.
      // Re-pinned 2026-08-19 for the skill-grants orphan-revival bug fix
      // (f8287123): a revived tool-alternative row's stale state check made
      // the sync immediately re-orphan it. This is NOT rows-unchanged: replay
      // on an affected image now yields active rows where the buggy code
      // yielded orphaned — the corrected output. The idempotency and rollback
      // sibling tests verify the fixed behavior.
      // 2026-08-19 merge recompute (wt/simcore -> main): both parents re-pinned
      // over different frozen sources (main: skill-grants revival fix; simcore:
      // configured-choice-rule work); recomputed over the merged bytes via
      // catalogDataMigrationChecksum(entry.sources) per the D226 procedure.
      checksum:
        'e649951df8c8177c80ebc6363c6bbc4902e7c82d8e1e7c5a0749ede307b25125',
      run: reconcileSpeciesLineageContentV2,
    }),
  ]);

interface AppliedCatalogDataMigration {
  readonly id: string;
  readonly scheme: string;
  readonly checksum: string;
}

function appliedCatalogDataMigrations(
  db: DatabaseContext,
): readonly AppliedCatalogDataMigration[] {
  return db.allRaw(
    `SELECT id, scheme, checksum
     FROM catalog_data_migrations
     ORDER BY id`,
  ).map((row) => {
    const id = row.id;
    const scheme = row.scheme;
    const checksum = row.checksum;
    if (
      typeof id !== 'string' ||
      typeof scheme !== 'string' ||
      typeof checksum !== 'string'
    ) {
      throw new CatalogDataMigrationMarkerMalformedError();
    }
    return { id, scheme, checksum };
  });
}

export function validateCatalogDataMigrationRegistry(
  migrations: readonly CatalogDataMigration[],
): void {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (migration.id.length === 0) {
      throw new CatalogDataMigrationIdEmptyError();
    }
    if (ids.has(migration.id)) {
      throw new CatalogDataMigrationDuplicateIdError(migration.id);
    }
    ids.add(migration.id);

    if (
      !Object.prototype.hasOwnProperty.call(
        contentFingerprintSchemeRegistry,
        migration.projectorScheme,
      )
    ) {
      throw new CatalogDataMigrationProjectorSchemeError(
        migration.id,
        String(migration.projectorScheme),
      );
    }

    if (migration.sources.length === 0) {
      throw new CatalogDataMigrationSourcesEmptyError(migration.id);
    }
    const paths = migration.sources.map(({ path }) => path);
    if (new Set(paths).size !== paths.length) {
      throw new CatalogDataMigrationDuplicateSourcePathError(migration.id);
    }

    const actual = catalogDataMigrationChecksum(migration.sources);
    if (actual !== migration.checksum) {
      throw new CatalogDataMigrationChecksumMismatchError(
        migration.id,
        migration.checksum,
        actual,
      );
    }
  }
}

function foreignKeyFailure(db: DatabaseContext): string | null {
  const violation = db.connection.selectObject('PRAGMA foreign_key_check');
  if (violation === undefined) {
    return null;
  }
  return `table ${String(violation.table)}`;
}

/**
 * Runs each pending semantic migration in its own transaction.
 *
 * The marker is the final write in that transaction. A thrown projector,
 * failed constraint, failed reference check, or marker insert therefore rolls
 * back both the semantic writes and the claim that they were applied.
 */
export function runCatalogDataMigrations(
  db: DatabaseContext,
  migrations: readonly CatalogDataMigration[] = CATALOG_DATA_MIGRATIONS,
): void {
  validateCatalogDataMigrationRegistry(migrations);

  const registered = new Map(
    migrations.map((migration) => [migration.id, migration] as const),
  );
  const applied = new Map<string, AppliedCatalogDataMigration>();
  for (const marker of appliedCatalogDataMigrations(db)) {
    const migration = registered.get(marker.id);
    if (migration === undefined) {
      throw new CatalogDataMigrationUnregisteredMarkerError(marker.id);
    }
    if (
      marker.scheme !== migration.projectorScheme ||
      marker.checksum !== migration.checksum
    ) {
      throw new CatalogDataMigrationMarkerDisagreementError(marker.id);
    }
    applied.set(marker.id, marker);
  }

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    db.transaction((transaction) => {
      migration.run(transaction);

      const foreignKeyProblem = foreignKeyFailure(transaction);
      if (foreignKeyProblem !== null) {
        throw new CatalogDataMigrationForeignKeyError(
          migration.id,
          foreignKeyProblem,
        );
      }

      transaction.exec(
        `INSERT INTO catalog_data_migrations (
           id, scheme, checksum
         ) VALUES (?, ?, ?)`,
        [
          migration.id,
          migration.projectorScheme,
          migration.checksum,
        ],
      );
    }, 'EXCLUSIVE');
  }
}
