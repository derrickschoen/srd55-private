import type { DatabaseContext } from '../../src/db/database';

let executionCount = 0;

export function resetCatalogDataMigrationProbe(): void {
  executionCount = 0;
}

export function catalogDataMigrationProbeExecutions(): number {
  return executionCount;
}

/**
 * Hand-authored semantic migration fixture. The test imports this module a
 * second time through `?raw`, so the checksum is pinned to the same source
 * bytes that define this function.
 */
export function runCatalogDataMigrationProbe(db: DatabaseContext): void {
  executionCount += 1;
  db.exec(
    `UPDATE characters
     SET notes = 'CI-2b prefix migration applied'
     WHERE name = 'CI-2b prefix fixture'`,
  );
}
