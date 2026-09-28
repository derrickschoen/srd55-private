/**
 * The stale catalog data marker an image created before PC-EXPORT-TRUTH
 * carries: `reconcile_species_lineage_content_v2` applied under the checksum
 * main registered before this unit (eb45b16b,
 * src/catalog/catalog-data-migrations.ts).
 *
 * Plain data, importable by Vitest and by Playwright alike: the unit witnesses
 * build the stale image in Node, and tests/browser/database-recovery.spec.ts
 * plants the same row into the browser's stored database.
 */
export const STALE_CATALOG_MARKER = Object.freeze({
  migrationId: 'reconcile_species_lineage_content_v2',
  preUnitChecksum: 'e649951df8c8177c80ebc6363c6bbc4902e7c82d8e1e7c5a0749ede307b25125',
});
