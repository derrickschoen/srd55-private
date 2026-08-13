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
import grantRuleSource from '../grants/grant-rule.ts?raw';
import sourceRuleReaderSource from '../grants/source-rule-reader.ts?raw';
import characterLevelSource from '../rules/character-level.ts?raw';
import slotGeneratorSource from '../grants/grant-rule-slot-generator.ts?raw';
import grantPlannerSource from '../grants/grant-rule-planner.ts?raw';
import skillGrantsSource from '../grants/skill-grants.ts?raw';
import skillExpertiseGrantsSource from '../grants/skill-expertise-grants.ts?raw';
import spellEligibilitySource from '../eligibility/spell-selection-eligibility.ts?raw';
import spellConstraintSource from '../eligibility/spell-selection-constraint.ts?raw';
import storedProjectorSource from './stored-authored-content-projector-v1.ts?raw';
import contentIdentitySource from './content-identity.ts?raw';
import contentRegistrySource from './content-registry.ts?raw';
import { reconcileSpeciesLineageContentV2 } from './reconcile-species-lineage-content-v2';

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
        'e30bd134e9173b51f925e977e3ac8f1e274e14bdf9a3c956c04c9a58b7fde8a4',
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
          path: 'src/grants/grant-rule.ts',
          bytes: grantRuleSource,
        }),
        Object.freeze({
          path: 'src/grants/source-rule-reader.ts',
          bytes: sourceRuleReaderSource,
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
      // Re-pinned 2026-08-13 (R4, D226): `src/grants/source-rule-reader.ts` is
      // one of this migration's frozen behavioural sources, and R4 gave it a
      // throwing decode for `character_source_instances.state`, narrowing
      // `GrantSourceInstance.state` to `SourceInstanceState`. No reconciled row
      // changes — every source instance this walks holds `active` or
      // `tombstoned` — but the freeze exists to notice a behavioural source
      // moving, so the pin moves with it.
      checksum:
        'c077a07074f66c54bfe430f7b37ec4b6a9d5f9f988550b7466148fbe9e0a63bf',
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
      throw new Error('Catalog data-migration marker is malformed.');
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
      throw new Error('Catalog data-migration id must not be empty.');
    }
    if (ids.has(migration.id)) {
      throw new Error(
        `Duplicate catalog data-migration id "${migration.id}".`,
      );
    }
    ids.add(migration.id);

    if (
      !Object.prototype.hasOwnProperty.call(
        contentFingerprintSchemeRegistry,
        migration.projectorScheme,
      )
    ) {
      throw new Error(
        `Catalog data migration "${migration.id}" uses unknown projector ` +
          `scheme "${String(migration.projectorScheme)}".`,
      );
    }

    if (migration.sources.length === 0) {
      throw new Error(
        `Catalog data migration "${migration.id}" has no checksum sources.`,
      );
    }
    const paths = migration.sources.map(({ path }) => path);
    if (new Set(paths).size !== paths.length) {
      throw new Error(
        `Catalog data migration "${migration.id}" has duplicate checksum ` +
          'source paths.',
      );
    }

    const actual = catalogDataMigrationChecksum(migration.sources);
    if (actual !== migration.checksum) {
      throw new Error(
        `Catalog data migration "${migration.id}" source checksum mismatch: ` +
          `expected ${migration.checksum}, got ${actual}.`,
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
      throw new Error(
        `Applied catalog data migration "${marker.id}" is not registered by ` +
          'this application.',
      );
    }
    if (
      marker.scheme !== migration.projectorScheme ||
      marker.checksum !== migration.checksum
    ) {
      throw new Error(
        `Applied catalog data migration "${marker.id}" does not match the ` +
          'registered projector scheme and checksum.',
      );
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
        throw new Error(
          `Catalog data migration "${migration.id}" foreign-key check ` +
            `failed for ${foreignKeyProblem}.`,
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
