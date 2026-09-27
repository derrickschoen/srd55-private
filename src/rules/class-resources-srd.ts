/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
/**
 * The bundled class-resource catalog: the eight resource ladders, the eighteen
 * formulas and the Arcane Recovery prose, all read from the SRD text AT BUILD
 * TIME. This module reads the generated artifact
 * (`generated/class-resources-srd.ts`, written by `npm run srd:artifacts` from
 * `class-resources-srd-reader.ts`) and mints its brands back through the
 * validating constructors; it imports no SRD text.
 */
import type { DatabaseContext } from '../db/database';
import {
  decodeClassResourceFormula,
  type ClassResourceFormula,
  type ClassResourceKind,
} from '../domain/class-resources';
import type { ClassLevel, ContentKey } from '../domain/ids';
import { rowContractError } from '../domain/contracts/rows';
import { deepFreeze } from '../domain/deep-freeze';
import {
  BUNDLED_CONTENT_KEYS,
  bundledClassContentKey,
  formulaColumns,
  level,
  SrdClassResourcesError,
  type SrdClassResourceFormulaManifest,
  type SrdClassResourceManifestEntry,
} from './class-resources-srd-reader';
import { BUNDLED_SRD_CLASS_RESOURCES } from './generated/class-resources-srd';

const BUNDLED_MANIFEST: readonly SrdClassResourceManifestEntry[] = deepFreeze(
  BUNDLED_SRD_CLASS_RESOURCES.manifest.map((entry) => ({
    content_key: bundledClassContentKey(entry.content_key),
    class_name: entry.class_name,
    expected_resource_kinds: entry.expected_resource_kinds,
    ladders: entry.ladders.map((ladder) => ({
      content_key: bundledClassContentKey(ladder.content_key),
      class_name: ladder.class_name,
      resource_kind: ladder.resource_kind,
      maxima: ladder.maxima,
    })),
  })),
);

const BUNDLED_FORMULA_MANIFEST: SrdClassResourceFormulaManifest = deepFreeze({
  formulas: BUNDLED_SRD_CLASS_RESOURCES.formula_manifest.formulas.map(
    (entry) => ({
      content_key: bundledClassContentKey(entry.content_key),
      class_name: entry.class_name,
      resource_kind: entry.resource_kind,
      formula: decodeClassResourceFormula(entry.formula),
      citation: entry.citation,
    }),
  ),
  unmodelled: BUNDLED_SRD_CLASS_RESOURCES.formula_manifest.unmodelled.map(
    (entry) => ({
      content_key: bundledClassContentKey(entry.content_key),
      class_name: entry.class_name,
      resource_kind: entry.resource_kind,
      citation: entry.citation,
    }),
  ),
});

/** All twelve class headings and the exact eight complete ladders. */
export function bundledSrdClassResourceManifest(): readonly SrdClassResourceManifestEntry[] {
  return BUNDLED_MANIFEST;
}

/** The eighteen formulas and the positively classified exclusions. */
export function bundledSrdClassResourceFormulaManifest(): SrdClassResourceFormulaManifest {
  return BUNDLED_FORMULA_MANIFEST;
}

/** Exact readable Arcane Recovery prose, normalized from the bundled SRD. */
export const SRD_ARCANE_RECOVERY_DESCRIPTION =
  BUNDLED_SRD_CLASS_RESOURCES.arcane_recovery_description;

export function bundledClassResourceRows(): readonly {
  readonly content_key: ContentKey;
  readonly resource_kind: ClassResourceKind;
  readonly class_level: ClassLevel;
  readonly maximum: number;
}[] {
  return BUNDLED_MANIFEST.flatMap((entry) =>
    entry.ladders.flatMap((ladder) =>
      ladder.maxima.map((value, index) => ({
        content_key: entry.content_key,
        resource_kind: ladder.resource_kind,
        class_level: level(index + 1),
        maximum: value,
      })),
    ),
  );
}

function formulaKey(contentKeyValue: string, resourceKind: string): string {
  return `${contentKeyValue}|${resourceKind}`;
}

function ladderKey(contentKeyValue: string, resourceKind: string, classLevel: number): string {
  return `${contentKeyValue}|${resourceKind}|${String(classLevel)}`;
}

function sameFormula(left: ClassResourceFormula, right: ClassResourceFormula): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

interface BundledClassResourceExpectation {
  readonly ladders: ReturnType<typeof bundledClassResourceRows>;
  readonly formulas: SrdClassResourceFormulaManifest['formulas'];
}

function bundledClassResourceExpectation(): BundledClassResourceExpectation {
  return {
    ladders: bundledClassResourceRows(),
    formulas: BUNDLED_FORMULA_MANIFEST.formulas,
  };
}

/** Exact tuple-and-value boot guard for both independently sourced catalogs. */
function hasExpectedBundledClassResourceContent(
  db: DatabaseContext,
  expected: BundledClassResourceExpectation,
): boolean {
  const placeholders = BUNDLED_CONTENT_KEYS.map(() => '?').join(', ');
  const actualLadders = db.all(
    `SELECT definition.content_key, resource.resource_kind,
            resource.class_level, resource.maximum
       FROM class_resources AS resource
       JOIN class_definitions AS definition
         ON definition.id = resource.class_definition_id
      WHERE definition.content_key IN (${placeholders})`,
    [...BUNDLED_CONTENT_KEYS],
    (row) => ({
      content_key: String(row.content_key),
      resource_kind: String(row.resource_kind),
      class_level: Number(row.class_level),
      maximum: Number(row.maximum),
    }),
  );
  if (actualLadders.length !== expected.ladders.length) {
    return false;
  }
  const actualLadderMap = new Map(
    actualLadders.map((row) => [
      ladderKey(row.content_key, row.resource_kind, row.class_level),
      row.maximum,
    ]),
  );
  if (
    expected.ladders.some(
      (row) =>
        actualLadderMap.get(
          ladderKey(row.content_key, row.resource_kind, row.class_level),
        ) !== row.maximum,
    )
  ) {
    return false;
  }

  const actualFormulaRows = db.allRaw(
    `SELECT definition.content_key, formula.resource_kind,
            formula.formula_kind, formula.minimum_class_level,
            formula.fixed_count, formula.ability, formula.multiplier,
            formula.later_fixed_count_steps
       FROM class_resource_formulas AS formula
       JOIN class_definitions AS definition
         ON definition.id = formula.class_definition_id
      WHERE definition.content_key IN (${placeholders})`,
    [...BUNDLED_CONTENT_KEYS],
  );
  if (actualFormulaRows.length !== expected.formulas.length) {
    return false;
  }
  const actualFormulaMap = new Map<string, ClassResourceFormula>();
  try {
    for (const row of actualFormulaRows) {
      actualFormulaMap.set(
        formulaKey(String(row.content_key), String(row.resource_kind)),
        decodeClassResourceFormula({
          formula_kind: row.formula_kind,
          minimum_class_level: row.minimum_class_level,
          fixed_count: row.fixed_count,
          ability: row.ability,
          multiplier: row.multiplier,
          later_fixed_count_steps: row.later_fixed_count_steps,
        }),
      );
    }
  } catch {
    return false;
  }
  return expected.formulas.every((entry) => {
    const actual = actualFormulaMap.get(
      formulaKey(entry.content_key, entry.resource_kind),
    );
    return actual !== undefined && sameFormula(actual, entry.formula);
  });
}

export function hasBundledClassResourceContent(db: DatabaseContext): boolean {
  return hasExpectedBundledClassResourceContent(
    db,
    bundledClassResourceExpectation(),
  );
}

function classIds(db: DatabaseContext): ReadonlyMap<string, number> {
  const placeholders = BUNDLED_CONTENT_KEYS.map(() => '?').join(', ');
  const rows = db.all(
    `SELECT id, content_key FROM class_definitions
      WHERE content_key IN (${placeholders})`,
    [...BUNDLED_CONTENT_KEYS],
    (row) => ({ id: Number(row.id), content_key: String(row.content_key) }),
  );
  const result = new Map(rows.map((row) => [row.content_key, row.id]));
  return result;
}

function assertRow(
  table: 'class_resources' | 'class_resource_formulas',
  row: Record<string, unknown>,
): void {
  const error = rowContractError(table, row, `Bundled ${table} row`);
  if (error !== null) {
    throw new SrdClassResourcesError(error);
  }
}

/** Idempotent exact repair. Correct tuples keep their ids; extra bundled rows go. */
function seedExpectedClassResources(
  db: DatabaseContext,
  expected: BundledClassResourceExpectation,
): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    const ids = classIds(db);
    const expectedLadderKeys = new Set(
      expected.ladders.map((row) => ladderKey(row.content_key, row.resource_kind, row.class_level)),
    );
    const existingLadders = db.all(
      `SELECT resource.id, definition.content_key, resource.resource_kind,
              resource.class_level
         FROM class_resources AS resource
         JOIN class_definitions AS definition
           ON definition.id = resource.class_definition_id
        WHERE definition.content_key LIKE '2024:class:%'`,
      undefined,
      (row) => ({ id: Number(row.id), content_key: String(row.content_key), resource_kind: String(row.resource_kind), class_level: Number(row.class_level) }),
    );
    for (const row of existingLadders) {
      if (
        BUNDLED_CONTENT_KEYS.includes(row.content_key as ContentKey) &&
        !expectedLadderKeys.has(ladderKey(row.content_key, row.resource_kind, row.class_level))
      ) {
        db.exec('DELETE FROM class_resources WHERE id = ?', [row.id]);
      }
    }
    for (const row of expected.ladders) {
      const classDefinitionId = ids.get(row.content_key);
      if (classDefinitionId === undefined) {
        continue;
      }
      const stored = {
        id: 1,
        class_definition_id: classDefinitionId,
        class_level: row.class_level,
        resource_kind: row.resource_kind,
        maximum: row.maximum,
        created_at: timestamp,
        updated_at: timestamp,
      };
      assertRow('class_resources', stored);
      db.exec(
        `INSERT INTO class_resources (
           class_definition_id, class_level, resource_kind, maximum,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(class_definition_id, class_level, resource_kind)
         DO UPDATE SET maximum = excluded.maximum, updated_at = excluded.updated_at`,
        [classDefinitionId, row.class_level, row.resource_kind, row.maximum, timestamp, timestamp],
      );
    }

    const expectedFormulaKeys = new Set(
      expected.formulas.map((entry) => formulaKey(entry.content_key, entry.resource_kind)),
    );
    const existingFormulas = db.all(
      `SELECT formula.id, definition.content_key, formula.resource_kind
         FROM class_resource_formulas AS formula
         JOIN class_definitions AS definition
           ON definition.id = formula.class_definition_id
        WHERE definition.content_key LIKE '2024:class:%'`,
      undefined,
      (row) => ({ id: Number(row.id), content_key: String(row.content_key), resource_kind: String(row.resource_kind) }),
    );
    for (const row of existingFormulas) {
      if (
        BUNDLED_CONTENT_KEYS.includes(row.content_key as ContentKey) &&
        !expectedFormulaKeys.has(formulaKey(row.content_key, row.resource_kind))
      ) {
        db.exec('DELETE FROM class_resource_formulas WHERE id = ?', [row.id]);
      }
    }
    for (const entry of expected.formulas) {
      const classDefinitionId = ids.get(entry.content_key);
      if (classDefinitionId === undefined) {
        continue;
      }
      const columns = formulaColumns(entry.formula);
      const stored = {
        id: 1,
        class_definition_id: classDefinitionId,
        resource_kind: entry.resource_kind,
        ...columns,
        created_at: timestamp,
        updated_at: timestamp,
      };
      assertRow('class_resource_formulas', stored);
      db.exec(
        `INSERT INTO class_resource_formulas (
           class_definition_id, resource_kind, formula_kind,
           minimum_class_level, fixed_count, ability, multiplier,
           later_fixed_count_steps, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(class_definition_id, resource_kind) DO UPDATE SET
           formula_kind = excluded.formula_kind,
           minimum_class_level = excluded.minimum_class_level,
           fixed_count = excluded.fixed_count,
           ability = excluded.ability,
           multiplier = excluded.multiplier,
           later_fixed_count_steps = excluded.later_fixed_count_steps,
           updated_at = excluded.updated_at`,
        [classDefinitionId, entry.resource_kind, columns.formula_kind, columns.minimum_class_level, columns.fixed_count, columns.ability, columns.multiplier, columns.later_fixed_count_steps, timestamp, timestamp],
      );
    }
  });
}

export function seedClassResources(db: DatabaseContext): void {
  seedExpectedClassResources(db, bundledClassResourceExpectation());
}

/** Boot-time entry point. Returns whether exact repair wrote anything. */
export function ensureBundledClassResources(db: DatabaseContext): boolean {
  const expected = bundledClassResourceExpectation();
  if (hasExpectedBundledClassResourceContent(db, expected)) {
    return false;
  }
  seedExpectedClassResources(db, expected);
  return true;
}
