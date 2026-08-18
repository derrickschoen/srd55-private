export const databaseBootStages = [
  'loading_engine',
  'opening_storage',
  'checking_saved_verification',
  'checking_structure',
  'checking_database_integrity',
  'checking_schema_compatibility',
  'applying_data_updates',
  // D283. Reported INSTEAD of `checking_structure` when a verification stamp
  // for exactly these bytes was reproduced, so a fast boot is never silent:
  // the timeline shows a `reusing_verification` phase and, because the seed
  // skips it too, no `verifying_catalog_integrity` phase at all. A boot that
  // got quicker for a reason nobody can see is indistinguishable from a boot
  // that stopped checking.
  'reusing_verification',
  'checking_bundled_rules',
  'verifying_catalog_integrity',
] as const;

export type DatabaseBootStage = (typeof databaseBootStages)[number];

export interface DatabaseBootProgress {
  readonly kind: 'database_boot_progress';
  readonly stage: DatabaseBootStage;
  /**
   * Milliseconds from the worker's own time origin — which is the moment the
   * worker started, not the moment the page loaded — to the moment this stage
   * BEGAN. Taken inside the worker rather than on arrival because the receiving
   * thread is the one that can be busy: at boot it is running module
   * evaluation, first paint, and the capability probe, so a message posted at
   * the true stage boundary can sit in the task queue and be timestamped late.
   * The producer's clock is the only one that cannot attribute the reader's
   * delay to the worker.
   */
  readonly elapsedMs: number;
}

export function databaseBootStageLabel(stage: DatabaseBootStage): string {
  switch (stage) {
    case 'loading_engine':
      return 'Loading database engine…';
    case 'opening_storage':
      return 'Opening local character storage…';
    case 'checking_saved_verification':
      return 'Checking the saved database verification…';
    case 'checking_structure':
      return 'Checking database structure…';
    case 'checking_database_integrity':
      return 'Checking database integrity…';
    case 'checking_schema_compatibility':
      return 'Checking database compatibility…';
    case 'applying_data_updates':
      return 'Applying database updates…';
    case 'reusing_verification':
      return 'Reusing the last verified database check…';
    case 'checking_bundled_rules':
      return 'Checking bundled character rules…';
    case 'verifying_catalog_integrity':
      return 'Verifying bundled catalog integrity…';
  }
}

export function databaseBootProgress(
  stage: DatabaseBootStage,
  elapsedMs: number,
): DatabaseBootProgress {
  return { kind: 'database_boot_progress', stage, elapsedMs };
}

export function isDatabaseBootProgress(
  value: unknown,
): value is DatabaseBootProgress {
  if (value === null || typeof value !== 'object') return false;
  if (Reflect.get(value, 'kind') !== 'database_boot_progress') return false;
  const stage = Reflect.get(value, 'stage');
  if (!(databaseBootStages as readonly unknown[]).includes(stage)) return false;
  const elapsedMs = Reflect.get(value, 'elapsedMs');
  return typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) &&
    elapsedMs >= 0;
}
