import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { applicationSeed } from '../../../src/db/bootstrap';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { sheetFacts, sheetSections } from '../../../src/ui/screens/sheet/sheet-view';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import veteranPlayer from '../../../docs/homebrew/cc-by/veteran-player.md?raw';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';

interface RogueSourceRow {
  readonly level: number;
  readonly proficiencyBonus: number;
  readonly sneakAttackDice: number;
}

function rogueSourceRows(): readonly RogueSourceRow[] {
  const start = classLevelTables.indexOf('=== Rogue Features table');
  const end = classLevelTables.indexOf('=== Sorcerer Features table', start);
  if (start < 0 || end < 0) throw new Error('The bounded Rogue source table is missing.');
  return classLevelTables.slice(start, end).split('\n').flatMap((line) => {
    const match = /^\s*(?<level>[1-9]|1\d|20)\s+\+(?<pb>[2-6]).*\s(?<dice>\d+)d6\s*$/u.exec(line);
    return match?.groups === undefined ? [] : [{
      level: Number(match.groups.level),
      proficiencyBonus: Number(match.groups.pb),
      sneakAttackDice: Number(match.groups.dice),
    }];
  });
}

describe('character sheet feature-value projection', () => {
  let connection: Database;
  let db: DatabaseContext;
  let builder: CharacterSheetBuilder;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    applicationSeed(db);
    builder = new CharacterSheetBuilder(db);
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    const id = db.scalar<number>('SELECT id FROM class_definitions WHERE name = ?', [name]);
    if (id === null) throw new Error(`Missing class ${name}.`);
    return id;
  }

  function character(rogueLevel: number, otherLevel = 0): number {
    const id = db.exec("INSERT INTO characters (name) VALUES ('Sneak Attack oracle')").lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, ?, 1)`,
      [id, classId('Rogue'), rogueLevel],
    );
    if (otherLevel > 0) {
      db.exec(
        `INSERT INTO character_class_levels (
           character_id, class_definition_id, level, is_starting_class
         ) VALUES (?, ?, ?, 0)`,
        [id, classId('Fighter'), otherLevel],
      );
    }
    return id;
  }

  it('uses Rogue class level at 1/2/5/20 and never multiclass total level', () => {
    const cases = [
      [1, 0, 1],
      [2, 0, 1],
      [5, 0, 3],
      [20, 0, 10],
      [5, 15, 3],
    ] as const;

    for (const [rogueLevel, otherLevel, expected] of cases) {
      const sheet = builder.build(character(rogueLevel, otherLevel));
      expect(sheet.feature_values).toMatchObject([
        {
          status: 'computed',
          key: 'sneak_attack',
          value: expected,
          terms: [{ label: 'Sneak Attack', contribution: expected, status: 'applied' }],
        },
      ]);
      const readable = sheetSections(sheet)
        .flatMap((section) => section.rows ?? [])
        .find((row) => row.id === 'feature-value:sneak_attack');
      expect(readable).toMatchObject({
        label: [{ text: 'Sneak Attack' }],
      });
      expect(
        Array.isArray(readable?.value)
          ? readable.value.map((cell) => cell.text).join('')
          : readable?.value,
      ).toBe(`${String(expected)}d6`);
      expect(sheetFacts(sheet).feature_values).toEqual([
        {
          key: 'sneak_attack',
          status: 'computed',
          value: expected,
          die_size: 6,
          terms: [
            {
              contribution: expected,
              status: 'applied',
              superseded_by: null,
              term_order: 0,
            },
          ],
        },
      ]);
    }
  });

  it('shows Arcane Recovery ceil(Wizard level / 2) at levels 2 and 5 without a usage tracker', () => {
    for (const [wizardLevel, expected] of [[2, 1], [5, 3]] as const) {
      const id = db.exec(
        "INSERT INTO characters (name) VALUES ('Arcane Recovery oracle')",
      ).lastInsertId;
      db.exec(
        `INSERT INTO character_class_levels (
           character_id, class_definition_id, level, is_starting_class
         ) VALUES (?, ?, ?, 1)`,
        [id, classId('Wizard'), wizardLevel],
      );

      const sheet = builder.build(id);
      expect(sheet.feature_values).toMatchObject([
        {
          status: 'computed',
          kind: 'resource_maximum',
          key: 'arcane_recovery',
          value: expected,
          terms: [
            {
              label: 'Half Wizard level, rounded up',
              contribution: expected,
              status: 'applied',
            },
          ],
        },
      ]);
      const readable = sheetSections(sheet)
        .flatMap((section) => section.rows ?? [])
        .find((row) => row.id === 'feature-value:arcane_recovery');
      expect(readable).toMatchObject({
        value: String(expected),
        disclosure: { summary: 'Read Arcane Recovery rules' },
      });
      expect(readable).not.toHaveProperty('resource_marking');
      expect(readable?.disclosure?.detail.map((cell) => cell.text).join(''))
        .toContain('none of the slots can be level 6 or higher');
      expect(sheetFacts(sheet).feature_values).toEqual([
        {
          key: 'arcane_recovery',
          kind: 'resource_maximum',
          status: 'computed',
          value: expected,
          terms: [
            { contribution: expected, status: 'applied', term_order: 0 },
          ],
        },
      ]);
    }
  });

  it('folds subclass modifiers in pipeline order and retains a superseded term in disclosure', () => {
    const rogueId = classId('Rogue');
    const contentKey = 'expanded:content.subclass:typed-veteran';
    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey, name: 'Typed Veteran', keyKind: 'asserted',
    });
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition
       ) VALUES (?, ?, 'Typed Veteran', 'expanded')`,
      [contentKey, rogueId],
    ).lastInsertId;
    const deeperId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, name, description, class_level, sort_order
       ) VALUES (?, 'Deeper Cuts', 'Adds one die.', 3, 1)`,
      [subclassId],
    ).lastInsertId;
    const strikeId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, name, description, class_level, sort_order
       ) VALUES (?, 'Veteran Strike', 'Replaces Deeper Cuts.', 9, 2)`,
      [subclassId],
    ).lastInsertId;
    const unrelatedId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, name, description, class_level, sort_order
       ) VALUES (?, 'Other Dice', 'Adds two dice.', 3, 3)`,
      [subclassId],
    ).lastInsertId;
    const insert = (
      featureId: number,
      key: string,
      label: string,
      from: number,
      value: object,
      supersedes: object | null = null,
    ) => db.exec(
      `INSERT INTO subclass_feature_value_contributions (
         subclass_feature_id, contribution_key, label, target_kind,
         target_key, op, active_from_level, active_to_level, value_json,
         supersedes_ref
       ) VALUES (?, ?, ?, 'feature_dice_count', 'sneak_attack', 'add', ?, 20, ?, ?)`,
      [
        featureId,
        key,
        label,
        from,
        JSON.stringify(value),
        supersedes === null ? null : JSON.stringify(supersedes),
      ],
    );
    insert(deeperId, 'deeper-cuts', 'Deeper Cuts', 3, { kind: 'const', amount: 1 });
    insert(
      strikeId,
      'veteran-strike',
      'Veteran Strike',
      9,
      {
        kind: 'scale',
        source: { kind: 'class_level', class_content_key: '2024:class:rogue' },
        divide: 2,
        round: 'floor',
      },
      { content_key: contentKey, contribution_key: 'deeper-cuts' },
    );
    insert(unrelatedId, 'other-dice', 'Other Dice', 3, { kind: 'const', amount: 2 });

    for (const [level, expectedValue, expectedLabels] of [
      [2, 1, ['Sneak Attack']],
      [3, 5, ['Sneak Attack', 'Deeper Cuts', 'Other Dice']],
      [8, 7, ['Sneak Attack', 'Deeper Cuts', 'Other Dice']],
    ] as const) {
      const boundaryId = character(level);
      db.exec(
        'UPDATE character_class_levels SET subclass_definition_id = ? WHERE character_id = ?',
        [subclassId, boundaryId],
      );
      const boundary = builder.build(boundaryId).feature_values[0];
      expect(boundary).toMatchObject({ status: 'computed', value: expectedValue });
      expect(
        boundary?.status === 'computed'
          ? boundary.terms.map((term) => term.label)
          : [],
      ).toEqual(expectedLabels);
    }

    const id = character(9);
    db.exec(
      'UPDATE character_class_levels SET subclass_definition_id = ? WHERE character_id = ?',
      [subclassId, id],
    );
    const sheet = builder.build(id);
    const feature = sheet.feature_values[0];
    expect(feature).toMatchObject({
      status: 'computed',
      value: 11,
      terms: [
        { label: 'Sneak Attack', contribution: 5, status: 'applied' },
        { label: 'Deeper Cuts', contribution: 1, status: { superseded_by: expect.any(Object) } },
        { label: 'Veteran Strike', contribution: 4, status: 'applied' },
        { label: 'Other Dice', contribution: 2, status: 'applied' },
      ],
    });
    const readable = sheetSections(sheet)
      .flatMap((section) => section.rows ?? [])
      .find((row) => row.id === 'feature-value:sneak_attack');
    expect(readable).toMatchObject({
      disclosure: { summary: 'Superseded terms' },
    });
    expect(
      Array.isArray(readable?.value)
        ? readable.value.map((cell) => cell.text).join('')
        : readable?.value,
    ).toBe('5d6 + 4d6 (Veteran Strike) + 2d6 (Other Dice)');
    expect(readable?.disclosure?.detail).toContainEqual({
      text: 'Deeper Cuts',
      free_text: true,
    });

    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET supersedes_ref = ?
        WHERE subclass_feature_id = ?`,
      [
        JSON.stringify({
          content_key: contentKey,
          contribution_key: 'missing-victim',
        }),
        strikeId,
      ],
    );
    expect(builder.build(id).feature_values).toEqual([{
      status: 'unavailable',
      id: 'feature-value:sneak_attack',
      key: 'sneak_attack',
      label: 'Sneak Attack',
      reason: 'malformed_supersession',
    }]);

    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET supersedes_ref = ?
        WHERE subclass_feature_id = ?`,
      [
        JSON.stringify({
          content_key: contentKey,
          contribution_key: 'deeper-cuts',
        }),
        strikeId,
      ],
    );
    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET contribution_key = 'deeper-cuts'
        WHERE subclass_feature_id = ?`,
      [unrelatedId],
    );
    expect(builder.build(id).feature_values).toMatchObject([{
      status: 'unavailable',
      reason: 'duplicate_source',
    }]);
  });

  it('derives Veteran v3 Sneak Attack correspondence and Reflexes maxima from the two source documents', () => {
    expect(veteranPlayer).toMatch(/Your Sneak Attack. deals one extra die of damage\./u);
    expect(veteranPlayer).toMatch(/Your Sneak Attack dice equal your Rogue level/u);
    expect(veteranPlayer).toContain('This replaces Deeper Cuts.');
    expect(veteranPlayer).toMatch(/a number of times equal to your Proficiency\s+Bonus/u);

    const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
      (entry) => entry.catalog_key === 'veteran',
    );
    const plan = planBundledHomebrewInstall(db, catalog);
    const installed = commitBundledHomebrewInstall(db, plan.token, catalog);
    if (installed.kind !== 'committed') throw new Error('Veteran v3 install failed.');
    const outcome = installed.outcomes[0];
    if (outcome?.kind !== 'create') throw new Error('Veteran v3 was not freshly created.');
    const subclassId = db.scalar<number>(
      'SELECT id FROM subclass_definitions WHERE content_key = ?',
      [outcome.contentKey],
    );
    if (subclassId === null) throw new Error('Veteran v3 definition is missing.');

    const rows = rogueSourceRows();
    expect(rows).toHaveLength(20);
    const id = character(3);
    db.exec(
      'UPDATE character_class_levels SET subclass_definition_id = ? WHERE character_id = ?',
      [subclassId, id],
    );
    for (const source of rows.filter(({ level }) => level >= 3)) {
      db.exec(
        'UPDATE character_class_levels SET level = ? WHERE character_id = ?',
        [source.level, id],
      );
      const sheet = builder.build(id);
      const sneakAttack = sheet.feature_values.find((value) => value.key === 'sneak_attack');
      if (sneakAttack?.status !== 'computed' || 'kind' in sneakAttack) {
        throw new Error(`Veteran Sneak Attack is unavailable at level ${String(source.level)}.`);
      }
      const appliedSum = sneakAttack.terms.reduce(
        (sum, term) => term.status === 'applied' ? sum + term.contribution : sum,
        0,
      );
      if (source.level < 9) {
        expect(sneakAttack.value).toBe(source.sneakAttackDice + 1);
        expect(appliedSum).toBe(source.sneakAttackDice + 1);
      } else {
        expect(source.sneakAttackDice + Math.floor(source.level / 2))
          .toBe(source.level);
        expect(sneakAttack.value).toBe(source.level);
        expect(appliedSum).toBe(source.level);
        expect(sneakAttack.terms).toEqual([
          expect.objectContaining({ label: 'Sneak Attack', status: 'applied' }),
          expect.objectContaining({
            label: 'Deeper Cuts',
            status: { superseded_by: expect.any(Object) },
          }),
          expect.objectContaining({ label: "Veteran's Strike", status: 'applied' }),
        ]);
      }
      const reflexes = sheet.resources.find(
        (resource) => resource.kind === 'authored' && resource.label === 'Veteran Reflexes',
      );
      if (source.level < 13) {
        expect(reflexes).toBeUndefined();
      } else {
        expect(reflexes).toMatchObject({
          status: 'computed',
          fact_key:
            '2024:content.subclass:veteran-bundled-revision-3\u0000veteran-reflexes',
          maximum: source.proficiencyBonus,
          marking_shape: 'boxes',
        });
        const readable = sheetSections(sheet)
          .flatMap((section) => section.rows ?? [])
          .find((row) => row.id === reflexes?.id);
        expect(readable).toMatchObject({
          label: [{ text: 'Veteran Reflexes', free_text: true }],
          value: String(source.proficiencyBonus),
          resource_marking: {
            shape: 'boxes',
            maximum: source.proficiencyBonus,
          },
        });
        expect(sheetFacts(sheet).resources).toContainEqual({
          kind: 'authored',
          fact_key:
            '2024:content.subclass:veteran-bundled-revision-3\u0000veteran-reflexes',
          maximum: source.proficiencyBonus,
          marking_shape: 'boxes',
        });
      }
    }
  }, 20_000);
});
