import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { isDeepStrictEqual } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import { DatabaseContext } from '../../../src/db/database';
import { registerSqliteQueryEngine } from '../../../src/db/query';
import {
  classResourceFormula,
  classResourceFormulaColumns,
  classResourceFormulaKinds,
  decodeClassResourceFormula,
  resourceFormulaAbilities,
  type ClassResourceFormula,
  type ClassResourceFormulaRecord,
  type StoredClassResourceFormula,
} from '../../../src/domain/class-resources';
import { characterLevels, type CharacterLevel } from '../../../src/domain/enums';
import { bundledSrdClassResourceFormulaManifest } from '../../../src/rules/class-resources-srd';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

/**
 * EVERY FORMULA THE TYPE ADMITS SURVIVES ITS STORAGE (fix round 3, P2).
 *
 * Round 2 left a one-step stepped count that the type admitted and the mint
 * accepted, but that the writer stored as `later_fixed_count_steps = '[]'`,
 * which the decoder and the table's CHECK both refuse. Round 3 makes that value
 * unrepresentable (a stepped count holds at least two steps; the type test
 * proves it). This file proves the other half: every value that IS
 * representable goes to its columns and comes back as the same value, key
 * order included, both through the domain boundary alone and through a real
 * database built from `schema.sql`, whose CHECK constraints judge each row.
 *
 * The variants are enumerated, not sampled: every kind at every class level,
 * both abilities, every two-step count (each pair of levels, the count rising
 * and falling) and every run of three to twenty consecutive levels (the count
 * rising, and alternating). The eighteen bundled formulas go through too.
 */
type Step = { readonly minimum_class_level: CharacterLevel; readonly count: number };

function stepped(
  levels: readonly CharacterLevel[],
  count: (index: number) => number,
): ClassResourceFormulaRecord {
  const [first, second, ...later] = levels.map(
    (level, index): Step => ({ minimum_class_level: level, count: count(index) }),
  );
  if (first === undefined || second === undefined) {
    throw new Error('a stepped variant needs at least two levels.');
  }
  return { kind: 'fixed_count_by_class_level', steps: [first, second, ...later] };
}

function everyFormulaVariant(): readonly ClassResourceFormulaRecord[] {
  const variants: ClassResourceFormulaRecord[] = [];
  for (const level of characterLevels) {
    for (const count of [1, 2, 5]) {
      variants.push({ kind: 'fixed_count', minimum_class_level: level, count });
    }
    for (const ability of resourceFormulaAbilities) {
      variants.push({ kind: 'ability_modifier_minimum_one', minimum_class_level: level, ability });
    }
    for (const multiplier of [1, 5]) {
      variants.push({ kind: 'class_level_multiple', minimum_class_level: level, multiplier });
    }
  }
  characterLevels.forEach((low, index) => {
    for (const high of characterLevels.slice(index + 1)) {
      variants.push(stepped([low, high], (step) => step + 1));
      variants.push(stepped([low, high], (step) => 2 - step));
    }
  });
  for (let length = 3; length <= characterLevels.length; length += 1) {
    for (let start = 0; start + length <= characterLevels.length; start += 1) {
      const levels = characterLevels.slice(start, start + length);
      variants.push(stepped(levels, (step) => step + 1));
      variants.push(stepped(levels, (step) => (step % 2) + 1));
    }
  }
  return variants;
}

type Outcome =
  | { readonly value: ClassResourceFormula }
  | { readonly threw: string };

function attempt(run: () => ClassResourceFormula): Outcome {
  try {
    return { value: run() };
  } catch (error) {
    return { threw: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

/** The same value, AND the same key order: `sameFormula` in the seeder compares JSON text. */
function survives(formula: ClassResourceFormula, outcome: Outcome): boolean {
  return 'value' in outcome &&
    isDeepStrictEqual(outcome.value, formula) &&
    JSON.stringify(outcome.value) === JSON.stringify(formula);
}

interface Failure {
  readonly formula: unknown;
  readonly outcome: Outcome;
}

function roundTripFailures(
  formulas: readonly ClassResourceFormula[],
  store: (formula: ClassResourceFormula) => ClassResourceFormula,
): readonly Failure[] {
  return formulas.flatMap((formula) => {
    const outcome = attempt(() => store(formula));
    return survives(formula, outcome) ? [] : [{ formula, outcome }];
  });
}

const VARIANTS = everyFormulaVariant();
const MINTED = VARIANTS.map((record) => classResourceFormula(record));
const BUNDLED = bundledSrdClassResourceFormulaManifest().formulas.map((entry) => entry.formula);

describe('the formula variants this suite enumerates', () => {
  it('cover every kind, both abilities, and every stepped length from two to twenty', () => {
    expect(new Set(MINTED.map((formula) => formula.kind))).toEqual(new Set(classResourceFormulaKinds));
    expect(new Set(MINTED.flatMap((formula) =>
      formula.kind === 'ability_modifier_minimum_one' ? [formula.ability] : [],
    ))).toEqual(new Set(resourceFormulaAbilities));
    const lengths = new Set(MINTED.flatMap((formula) =>
      formula.kind === 'fixed_count_by_class_level' ? [formula.steps.length] : [],
    ));
    expect([...lengths].sort((left, right) => left - right)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 2),
    );
    // 20 levels x (3 counts + 2 abilities + 2 multipliers), 190 level pairs x 2,
    // and 171 runs of 3..20 consecutive levels x 2.
    expect(MINTED).toHaveLength(140 + 380 + 342);
    expect(BUNDLED).toHaveLength(18);
  });
});

describe('every formula the type admits survives the domain storage boundary', () => {
  it('each enumerated variant and each bundled formula decodes from its columns to itself', () => {
    const store = (formula: ClassResourceFormula): ClassResourceFormula =>
      decodeClassResourceFormula(classResourceFormulaColumns(formula));
    expect(roundTripFailures(MINTED, store)).toEqual([]);
    expect(roundTripFailures(BUNDLED, store)).toEqual([]);
  });

  it('a stepped count stores its later steps as a non-empty array', () => {
    const empty = MINTED.flatMap((formula) =>
      formula.kind === 'fixed_count_by_class_level' &&
        classResourceFormulaColumns(formula).later_fixed_count_steps === '[]'
        ? [formula]
        : [],
    );
    expect(empty).toEqual([]);
  });
});

describe('every formula the type admits survives a database built from schema.sql', () => {
  let db: Database;
  let classDefinitionId: number;

  beforeAll(async () => {
    const sqlite3 = await sqlite3InitModule();
    registerSqliteQueryEngine(sqlite3);
    db = new sqlite3.oo1.DB(':memory:', 'c');
    db.exec(schema);
    db.exec('PRAGMA foreign_keys = ON');
    registerFixtureContentIdentity(new DatabaseContext(db), {
      kind: 'class',
      contentKey: '2024:class:round-trip-probe',
      name: 'Round Trip Probe',
      keyKind: 'bundled-stable',
    });
    db.exec({
      sql: `INSERT INTO class_definitions (content_key, name, rules_edition)
            VALUES ('2024:class:round-trip-probe', 'Round Trip Probe', '2024')`,
    });
    classDefinitionId = Number(db.selectValue('SELECT last_insert_rowid()'));
  });

  afterAll(() => {
    db.close();
  });

  /** Writes the formula's columns as a row, reads the row back, decodes it, and removes it. */
  function throughTheTable(formula: ClassResourceFormula): ClassResourceFormula {
    const columns = classResourceFormulaColumns(formula);
    db.exec({
      sql: `INSERT INTO class_resource_formulas (
              class_definition_id, resource_kind, formula_kind, minimum_class_level,
              fixed_count, ability, multiplier, later_fixed_count_steps
            ) VALUES (?, 'action_surge', ?, ?, ?, ?, ?, ?)`,
      bind: [
        classDefinitionId,
        columns.formula_kind,
        columns.minimum_class_level,
        columns.fixed_count,
        columns.ability,
        columns.multiplier,
        columns.later_fixed_count_steps,
      ],
    });
    try {
      const row = db.selectObject(
        `SELECT formula_kind, minimum_class_level, fixed_count, ability, multiplier,
                later_fixed_count_steps
         FROM class_resource_formulas WHERE class_definition_id = ?`,
        [classDefinitionId],
      );
      if (row === undefined) {
        throw new Error('the written row is not there.');
      }
      return decodeClassResourceFormula(row as unknown as StoredClassResourceFormula);
    } finally {
      db.exec({
        sql: 'DELETE FROM class_resource_formulas WHERE class_definition_id = ?',
        bind: [classDefinitionId],
      });
    }
  }

  it('each enumerated variant and each bundled formula is written, accepted by every CHECK, and read back as itself', () => {
    expect(roundTripFailures(MINTED, throughTheTable)).toEqual([]);
    expect(roundTripFailures(BUNDLED, throughTheTable)).toEqual([]);
  });

  it('the table and the decoder refuse the empty later-step array the type no longer produces', () => {
    expect(() => db.exec({
      sql: `INSERT INTO class_resource_formulas (
              class_definition_id, resource_kind, formula_kind, minimum_class_level,
              fixed_count, ability, multiplier, later_fixed_count_steps
            ) VALUES (?, 'action_surge', 'fixed_count_by_class_level', 2, 1, NULL, NULL, '[]')`,
      bind: [classDefinitionId],
    })).toThrow(/class_resource_formulas_steps_json_check/u);
    expect(() => decodeClassResourceFormula({
      formula_kind: 'fixed_count_by_class_level',
      minimum_class_level: 2,
      fixed_count: 1,
      ability: null,
      multiplier: null,
      later_fixed_count_steps: '[]',
    })).toThrow('later_fixed_count_steps must be a non-empty array.');
  });
});
