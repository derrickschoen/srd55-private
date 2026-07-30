import type { Database } from '@sqlite.org/sqlite-wasm';
import baseline from '../../drizzle/0000_skinny_lionheart.sql?raw';
import baselineTriggers from '../../drizzle/0000_skinny_lionheart.triggers.sql?raw';
import weaponRangeAdd from '../../drizzle/0001_weapon_range_add.sql?raw';
import weaponRangeDrop from '../../drizzle/0002_weapon_range_drop.sql?raw';
import spellFork from '../../drizzle/0003_spell_fork.sql?raw';
import retireCoin from '../../drizzle/0004_retire_coin.sql?raw';
import classEquipment from '../../drizzle/0005_class_equipment.sql?raw';
import weaponAttackKind from '../../drizzle/0006_weapon_attack_kind.sql?raw';
import featModel from '../../drizzle/0007_feat_model.sql?raw';
import abilityAllocationMethod from '../../drizzle/0008_ability_allocation_method.sql?raw';
import abilityIncrease from '../../drizzle/0009_ability_increase.sql?raw';
import characterSkillGrants from '../../drizzle/0010_character_skill_grants.sql?raw';
import equipmentProvenance from '../../drizzle/0011_equipment_provenance.sql?raw';
import removeEquipmentProvenance from '../../drizzle/0012_remove_equipment_provenance.sql?raw';
import armorClassItemsAndEffects from '../../drizzle/0013_armor_class_items_and_effects.sql?raw';
import featureEffectProduction from '../../drizzle/0014_feature_effect_production.sql?raw';
import effectEquipmentOwnership from '../../drizzle/0015_effect_equipment_ownership.sql?raw';
import { sha256 } from '../crypto/sha256';

export interface DatabaseMigration {
  /** Stable product identity. Once shipped, this value and its SQL never move. */
  readonly id: string;
  readonly sql: string;
  /** SHA-256 of `sql`, checked synchronously before any image is touched. */
  readonly checksum: string;
  /** SHA-256 of the exact sqlite_schema signature after this chain prefix. */
  readonly resultSchemaChecksum: string;
}

const baselineSql = [
  baseline.trim(),
  baselineTriggers.trim(),
  '-- migration-bundle-control:0000',
].join('\n\n') + '\n';

/**
 * Append-only product data.
 *
 * A shipped entry is immutable. Schema work adds a generated SQL file and a
 * new entry; it never edits or regenerates an existing migration. The result
 * checksum makes every chain prefix a known source schema for later upgrades.
 */
export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = Object.freeze([
  Object.freeze({
    id: '0000_skinny_lionheart',
    sql: baselineSql,
    checksum:
      'cfd5b76e09514b890f20990df5cf743c32aeb3a1d41b80cea2370900eed74cfb',
    resultSchemaChecksum:
      'fa9627e3cdef381b97d24aee249867ebee9866941e3fd65e9b739111989da1d9',
  }),
  Object.freeze({
    id: '0001_weapon_range_add',
    sql: weaponRangeAdd,
    checksum:
      'e34aeb2658f3ab88e4cfeb94bfbbeae98530d7e56d1a83e544e7cc4f55679d52',
    resultSchemaChecksum:
      'ef0b8e30f0bade51d3c2784bae9e4b4cebe328ab369cdb584a2bf22e252a228c',
  }),
  Object.freeze({
    id: '0002_weapon_range_drop',
    sql: weaponRangeDrop,
    checksum:
      '9053cce25b59ffc2c22f3f2cd441236219bdfb57c4c3ab195545f39a3bfa0bdf',
    resultSchemaChecksum:
      '6f3b23a58a73cd5daff97044aa31be963b429ac9ed9afe5ec60445f6a12910a0',
  }),
  Object.freeze({
    id: '0003_spell_fork',
    sql: spellFork,
    checksum:
      'f71c10580a314e09791b4cacbbef02b421fc6baa7e95106f8c536fb9f935612e',
    resultSchemaChecksum:
      '098203a2476b0c7f4d646e78a9f0f65da85cfe84eab547f5b8915cca4cfbfcbc',
  }),
  Object.freeze({
    id: '0004_retire_coin',
    sql: retireCoin,
    checksum:
      '9ab23a9810078e3aff5808b145aa3f1df6fce6af933506f487e248d1df0acaab',
    resultSchemaChecksum:
      '801bac9e738d40392178b88f67291230ce51aa1c60c2fdbb9aae4bd95cc1e64d',
  }),
  Object.freeze({
    id: '0005_class_equipment',
    sql: classEquipment,
    checksum:
      '42fef4ecdb27704ba956b7a2dd95b591f84c6670eba212df4547a6a981f58123',
    resultSchemaChecksum:
      'c38a9355b00ddb5adf961e7c40120720bb0d601daadd32ad835444199b99e6fb',
  }),
  Object.freeze({
    id: '0006_weapon_attack_kind',
    sql: weaponAttackKind,
    checksum:
      '0343dc5213461e0186d51b32ebd6f90047a3650e1b1bccb40d181c41a6769991',
    resultSchemaChecksum:
      'c3d1920ddf61b5ecb64563ae0e04dea577d1ab7bf83d17bdcfce24c04a1bb5d7',
  }),
  Object.freeze({
    id: '0007_feat_model',
    sql: featModel,
    checksum:
      '2b6a218077a4efe287234d30b0da1873c29c0ec8523efed283f40efa29ed11ac',
    resultSchemaChecksum:
      'cc2945880764c4a5cba7ba4dd7d85f9f65cf3b7368e6c9d65d7f6ae7b02b489c',
  }),
  Object.freeze({
    id: '0008_ability_allocation_method',
    sql: abilityAllocationMethod,
    checksum:
      'dcc6e5de3a8f7ac44af39e27f53fc7942576ad8734a4c18916b95dfb2b201b27',
    resultSchemaChecksum:
      'd8c6d27baba26254e14f7316797bed69deb0a9e58377b1dfb744ffd7eea44331',
  }),
  Object.freeze({
    id: '0009_ability_increase',
    sql: abilityIncrease,
    checksum:
      '58ec411448ee05a15e25bb782157e905ea08d7bff9ebb996850f14468521309b',
    resultSchemaChecksum:
      '0ecf8c299a6a95d56f5c4824629dd3c2f814cdfcfc7ea64a2c8cdd4e0b3d3645',
  }),
  Object.freeze({
    id: '0010_character_skill_grants',
    sql: characterSkillGrants,
    checksum:
      'f4ddef795542f602699f3e247ea1fa519952238c66e43bbd84185155b44aed27',
    resultSchemaChecksum:
      'ba7cd3692fae389a569fcbec8afb3dc3058f212f129bebb61b4976f31b65c587',
  }),
  Object.freeze({
    id: '0011_equipment_provenance',
    sql: equipmentProvenance,
    checksum:
      'a30d5b0d7e81923dbe0734931e7c2d986babf408a6577567bbd8431264a78d47',
    resultSchemaChecksum:
      'eec2bb4a6d9d1381720152e805f6bca2a828379b6dd36780649aa1a5c0c459fa',
  }),
  // D69: the owner struck equipment provenance four hours after 0011 minted
  // it. The chain is append-only — 0011 is never edited — so this migration
  // recreates both tables WITHOUT `source_instance_id`, discarding the stamp
  // values (pre-alpha, zero users; the rows themselves all survive).
  Object.freeze({
    id: '0012_remove_equipment_provenance',
    sql: removeEquipmentProvenance,
    checksum:
      '42009457e8c61528cfb31c5746899378e75d7315ff9a1af74605f8abde42d8eb',
    // Identical to 0010's result checksum, and that identity is the proof
    // the removal is exact: 0012 restores the pre-0011 schema shape.
    resultSchemaChecksum:
      'ba7cd3692fae389a569fcbec8afb3dc3058f212f129bebb61b4976f31b65c587',
  }),
  // AC-1 (D72): the vocabulary and persistence for Armor Class formulas,
  // bonuses and weapon-scoped modifiers, plus the new `character_items`
  // table. Widens `character_effects` with five new kinds, five new payload
  // columns, and widened `amount`/`ability` kind-scoped CHECKs; creates
  // `character_items` fresh. `docs/design/2026-07-29-armor-class-items-and-effects.md`.
  Object.freeze({
    id: '0013_armor_class_items_and_effects',
    sql: armorClassItemsAndEffects,
    checksum:
      '22cfd200c40d46ffbf698f7a3da92bca49f087bdbfdbee3e21bc07405aa4bf52',
    resultSchemaChecksum:
      'b8b13b323d1eb176c490b688413f2eacb2e8e19c96c4933a6a159165e9dcdfa1',
  }),
  Object.freeze({
    id: '0014_feature_effect_production',
    sql: featureEffectProduction,
    checksum:
      'babf5dd042c78f8865a3cdd9a2b725db75472fe785fa6af9c05a9f0efb667a67',
    resultSchemaChecksum:
      '4fc9e0f01553d7161dd81799466276d2068357598a9fde0a07d69491ed0bd600',
  }),
  Object.freeze({
    id: '0015_effect_equipment_ownership',
    sql: effectEquipmentOwnership,
    checksum:
      'a3471329fd7f62a9637e738437ab977ee1664bea1783784295ac17cb42cd4d3e',
    resultSchemaChecksum:
      '2533e8099b522103359dad23da321304cf3a3dac3b797b8607e29820b39e03eb',
  }),
]);

export function databaseSchemaChecksum(signature: string): string {
  return sha256(signature);
}

export function validateMigrationRegistry(
  migrations: readonly DatabaseMigration[],
): void {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(`Duplicate database migration id "${migration.id}".`);
    }
    ids.add(migration.id);

    const actual = sha256(migration.sql);
    if (actual !== migration.checksum) {
      throw new Error(
        `Database migration "${migration.id}" checksum mismatch: ` +
          `expected ${migration.checksum}, got ${actual}.`,
      );
    }
  }
}

export function appliedMigrationCount(
  schemaChecksum: string,
  migrations: readonly DatabaseMigration[],
): number | null {
  const index = migrations.findIndex(
    (migration) => migration.resultSchemaChecksum === schemaChecksum,
  );
  return index === -1 ? null : index + 1;
}

function foreignKeyFailure(db: Database): string | null {
  const violation = db.selectObject('PRAGMA foreign_key_check');
  if (violation === undefined) {
    return null;
  }
  return `table ${String(violation.table)}`;
}

/**
 * Applies one suffix as a single atomic unit.
 *
 * `foreign_keys=OFF` must precede `BEGIN`; SQLite silently ignores it inside a
 * transaction. The check and target-signature comparison deliberately happen
 * before COMMIT so either failure restores the exact source image.
 */
export function applyMigrationSuffix(
  db: Database,
  migrations: readonly DatabaseMigration[],
  appliedCount: number,
  expectedSignature: string,
  signatureOf: (database: Database) => string,
): void {
  const pending = migrations.slice(appliedCount);
  if (pending.length === 0) {
    return;
  }

  db.exec('PRAGMA foreign_keys = OFF');
  if (Number(db.selectValue('PRAGMA foreign_keys')) !== 0) {
    throw new Error(
      'Database migration could not disable foreign-key enforcement.',
    );
  }

  let transactionOpen = false;
  try {
    db.exec('BEGIN EXCLUSIVE');
    transactionOpen = true;
    try {
      for (const migration of pending) {
        db.exec(migration.sql);
      }

      const foreignKeyProblem = foreignKeyFailure(db);
      if (foreignKeyProblem !== null) {
        throw new Error(
          `Database migration foreign-key check failed for ${foreignKeyProblem}.`,
        );
      }

      if (signatureOf(db) !== expectedSignature) {
        throw new Error(
          'Migrated database schema does not match the application schema.',
        );
      }

      db.exec('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) {
        db.exec('ROLLBACK');
        transactionOpen = false;
      }
      throw error;
    }
  } finally {
    if (transactionOpen) {
      db.exec('ROLLBACK');
    }
    db.exec('PRAGMA foreign_keys = ON');
    if (Number(db.selectValue('PRAGMA foreign_keys')) !== 1) {
      throw new Error(
        'Database migration could not re-enable foreign-key enforcement.',
      );
    }
  }
}
