export const databaseBootStages = [
  'loading_engine',
  'opening_storage',
  'checking_structure',
  'checking_bundled_rules',
  'verifying_catalog_integrity',
] as const;

export type DatabaseBootStage = (typeof databaseBootStages)[number];

export interface DatabaseBootProgress {
  readonly kind: 'database_boot_progress';
  readonly stage: DatabaseBootStage;
}

export function databaseBootStageLabel(stage: DatabaseBootStage): string {
  switch (stage) {
    case 'loading_engine':
      return 'Loading database engine…';
    case 'opening_storage':
      return 'Opening local character storage…';
    case 'checking_structure':
      return 'Checking database structure…';
    case 'checking_bundled_rules':
      return 'Checking bundled character rules…';
    case 'verifying_catalog_integrity':
      return 'Verifying bundled catalog integrity…';
  }
}

export function databaseBootProgress(
  stage: DatabaseBootStage,
): DatabaseBootProgress {
  return { kind: 'database_boot_progress', stage };
}

export function isDatabaseBootProgress(
  value: unknown,
): value is DatabaseBootProgress {
  if (value === null || typeof value !== 'object') return false;
  if (Reflect.get(value, 'kind') !== 'database_boot_progress') return false;
  const stage = Reflect.get(value, 'stage');
  return (databaseBootStages as readonly unknown[]).includes(stage);
}
