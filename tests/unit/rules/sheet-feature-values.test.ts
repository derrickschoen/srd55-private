import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import type {
  PositiveInteger,
} from '../../../src/domain/class-resources';
import type { CharacterLevel } from '../../../src/domain/enums';
import type { ClassLevel, ContentKey } from '../../../src/domain/ids';
import type { ValueEvaluationContext } from '../../../src/domain/value-expression';
import {
  AuthoredResourceMarkingShapeError,
  resolveSheetAuthoredResources,
  resolveSheetFeatureValues,
  type FeatureValueClassInput,
} from '../../../src/rules/sheet-feature-values';
import { openSeededTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

const ROGUE_KEY = '2024:class:rogue' as ContentKey;
const WIZARD_KEY = '2024:class:wizard' as ContentKey;

describe('sheet feature-value mutation boundaries', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openSeededTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    const id = db.scalar<number>(
      'SELECT id FROM class_definitions WHERE name = ?',
      [name],
    );
    if (id === null) throw new Error(`Missing class ${name}.`);
    return id;
  }

  function context(
    levels: ReadonlyMap<ContentKey, ClassLevel>,
  ): ValueEvaluationContext {
    return {
      character_level: Math.max(
        1,
        [...levels.values()].reduce<number>(
          (sum, level) => sum + Number(level),
          0,
        ),
      ) as CharacterLevel,
      proficiency_bonus: 4 as PositiveInteger,
      class_levels: levels,
      ability_modifiers: new Map(),
    };
  }

  function classInput(
    name: string,
    contentKey: ContentKey,
    level: number,
    subclass: FeatureValueClassInput['subclass'] = null,
  ): FeatureValueClassInput {
    return {
      class_definition_id: classId(name),
      class_content_key: contentKey,
      class_level: level as ClassLevel,
      subclass,
    };
  }

  function createSubclass(
    contentKey: ContentKey,
    baseClass = 'Fighter',
  ): { readonly id: number; readonly featureId: number } {
    registerFixtureContentIdentity(db, {
      kind: 'subclass',
      contentKey,
      name: 'Boundary subclass',
      keyKind: 'asserted',
    });
    const id = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition
       ) VALUES (?, ?, 'Boundary subclass', 'expanded')`,
      [contentKey, classId(baseClass)],
    ).lastInsertId;
    const featureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, name, description, class_level, sort_order
       ) VALUES (?, 'Boundary feature', 'Boundary fixture.', 1, 1)`,
      [id],
    ).lastInsertId;
    return { id, featureId };
  }

  function insertSubclassContribution(input: {
    readonly featureId: number;
    readonly contributionKey: string;
    readonly label: string;
    readonly targetKind: 'feature_dice_count' | 'resource_maximum';
    readonly targetKey: string;
    readonly value: unknown;
    readonly supersedes?: unknown;
    readonly displayLabel?: string;
    readonly markingShape?: 'boxes' | 'remaining';
  }): void {
    db.exec(
      `INSERT INTO subclass_feature_value_contributions (
         subclass_feature_id, contribution_key, label, target_kind,
         target_key, op, active_from_level, active_to_level, value_json,
         supersedes_ref, resource_display_label, resource_marking_shape
       ) VALUES (?, ?, ?, ?, ?, 'add', 1, 20, ?, ?, ?, ?)`,
      [
        input.featureId,
        input.contributionKey,
        input.label,
        input.targetKind,
        input.targetKey,
        JSON.stringify(input.value),
        input.supersedes === undefined
          ? null
          : JSON.stringify(input.supersedes),
        input.displayLabel ?? null,
        input.markingShape ?? null,
      ],
    );
  }

  it('pins Arcane Recovery presence, absence, source identity, base identity, and unavailable context', () => {
    // `docs/srd/full/srd-5.2.1.txt:324` states the combined recovered slot
    // levels are half the Wizard level, rounded up: Wizard 5 therefore gives 3.
    const wizard = classInput('Wizard', WIZARD_KEY, 5);
    const fighter = classInput(
      'Fighter',
      '2024:class:fighter' as ContentKey,
      2,
    );

    expect(resolveSheetFeatureValues(
      db,
      [fighter],
      context(new Map([['2024:class:fighter' as ContentKey, 2 as ClassLevel]])),
    )).toEqual([]);

    const available = resolveSheetFeatureValues(
      db,
      [fighter, wizard],
      context(new Map([
        ['2024:class:fighter' as ContentKey, 2 as ClassLevel],
        [WIZARD_KEY, 5 as ClassLevel],
      ])),
    );
    expect(available.map((value) => value.status === 'computed' && 'kind' in value
      ? {
          status: value.status,
          kind: value.kind,
          id: value.id,
          key: value.key,
          value: value.value,
          terms: value.terms,
          catalog_layer: value.catalog_layer,
        }
      : value)).toEqual([{
      status: 'computed',
      kind: 'resource_maximum',
      id: 'feature-value:arcane_recovery',
      key: 'arcane_recovery',
      value: 3,
      terms: [{
        source: {
          kind: 'contribution',
          content_key: '2024:class:wizard',
          contribution_key: 'arcane-recovery-budget',
        },
        label: 'Half Wizard level, rounded up',
        contribution: 3,
        is_base: true,
        status: 'applied',
      }],
      catalog_layer: 'bundled',
    }]);

    const unavailable = resolveSheetFeatureValues(
      db,
      [wizard],
      context(new Map()),
    );
    expect(unavailable.map((value) => value.status === 'unavailable' && 'kind' in value
      ? [value.status, value.kind, value.id, value.key, value.reason, value.catalog_layer]
      : value)).toEqual([[
      'unavailable',
      'resource_maximum',
      'feature-value:arcane_recovery',
      'arcane_recovery',
      'missing_class',
      'bundled',
    ]]);
  });

  it('pins base/contribution identity and duplicate source refusal', () => {
    const rogueId = classId('Rogue');
    db.exec(
      `INSERT INTO class_feature_value_contributions (
         class_definition_id, contribution_key, label, target_kind,
         target_key, op, active_from_level, active_to_level, value_json,
         supersedes_ref
       ) VALUES (?, 'bonus-dice', 'Bonus Dice', 'feature_dice_count',
         'sneak_attack', 'add', 1, 20, ?, NULL)`,
      [rogueId, JSON.stringify({ kind: 'const', amount: 2 })],
    );
    const rogue = classInput('Rogue', ROGUE_KEY, 5);
    const valueContext = context(new Map([[ROGUE_KEY, 5 as ClassLevel]]));

    expect(resolveSheetFeatureValues(db, [rogue], valueContext)).toEqual([{
      status: 'computed',
      id: 'feature-value:sneak_attack',
      key: 'sneak_attack',
      label: 'Sneak Attack',
      die_size: 6,
      value: 5,
      terms: [
        {
          source: {
            kind: 'contribution',
            content_key: '2024:class:rogue',
            contribution_key: 'sneak-attack',
          },
          label: 'Sneak Attack',
          contribution: 3,
          is_base: true,
          status: 'applied',
        },
        {
          source: {
            kind: 'contribution',
            content_key: '2024:class:rogue',
            contribution_key: 'bonus-dice',
          },
          label: 'Bonus Dice',
          contribution: 2,
          is_base: false,
          status: 'applied',
        },
      ],
    }]);

    expect(resolveSheetFeatureValues(db, [rogue, rogue], valueContext)).toEqual([{
      status: 'unavailable',
      id: 'feature-value:sneak_attack',
      key: 'sneak_attack',
      label: 'Sneak Attack',
      reason: 'duplicate_source',
    }]);
  });

  it('refuses malformed feature values and supersession references by exact reason', () => {
    const rogue = classInput('Rogue', ROGUE_KEY, 5);
    const valueContext = context(new Map([[ROGUE_KEY, 5 as ClassLevel]]));
    const expectReason = (reason: string): void => {
      expect(resolveSheetFeatureValues(db, [rogue], valueContext)).toEqual([{
        status: 'unavailable',
        id: 'feature-value:sneak_attack',
        key: 'sneak_attack',
        label: 'Sneak Attack',
        reason,
      }]);
    };

    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE class_feature_value_contributions
          SET value_json = '[]'
        WHERE class_definition_id = ? AND contribution_key = 'sneak-attack'`,
      [classId('Rogue')],
    );
    expectReason('invalid_data');

    db.exec(
      `UPDATE class_feature_value_contributions
          SET value_json = ?, supersedes_ref = '[]'
        WHERE class_definition_id = ? AND contribution_key = 'sneak-attack'`,
      [
        JSON.stringify({
          kind: 'scale',
          source: { kind: 'class_level', class_content_key: ROGUE_KEY },
          divide: 2,
          round: 'ceiling',
        }),
        classId('Rogue'),
      ],
    );
    expectReason('invalid_data');

    db.exec(
      `UPDATE class_feature_value_contributions
          SET supersedes_ref = ?
        WHERE class_definition_id = ? AND contribution_key = 'sneak-attack'`,
      [
        JSON.stringify({
          content_key: ROGUE_KEY,
          contribution_key: 'missing-source',
        }),
        classId('Rogue'),
      ],
    );
    expectReason('malformed_supersession');
  });

  it('replaces an existing historical feature fact instead of appending a duplicate', () => {
    const contentKey =
      'expanded:content.subclass:historical-boundary' as ContentKey;
    const subclass = createSubclass(contentKey, 'Rogue');
    insertSubclassContribution({
      featureId: subclass.featureId,
      contributionKey: 'bonus-die',
      label: 'Bonus Die',
      targetKind: 'feature_dice_count',
      targetKey: 'sneak_attack',
      value: { kind: 'const', amount: 1 },
    });
    db.exec(
      `INSERT INTO catalog_content_fingerprints (
         content_kind, fingerprint_scheme, fingerprint_digest, canonical_json,
         content_key, fingerprint_role
       ) VALUES ('subclass', 'content-v1', ?, 'historical fixture', ?, 'current')`,
      [
        'ba433201acabb302fac98efa457ed7846392d71c7400c198d00479912422135c',
        contentKey,
      ],
    );
    const rogue = classInput('Rogue', ROGUE_KEY, 5, {
      id: subclass.id,
      content_key: contentKey,
    });
    const wizard = classInput('Wizard', WIZARD_KEY, 1);

    expect(resolveSheetFeatureValues(
      db,
      [rogue, wizard],
      context(new Map([
        [ROGUE_KEY, 5 as ClassLevel],
        [WIZARD_KEY, 1 as ClassLevel],
      ])),
    ).map((value) => value.status === 'computed'
      ? [value.status, value.id, value.key, value.value]
      : [value.status, value.id, value.key, value.reason])).toEqual([
      [
        'unavailable',
        'feature-value:sneak_attack',
        'sneak_attack',
        'historical_contributions_not_recorded',
      ],
      [
        'computed',
        'feature-value:arcane_recovery',
        'arcane_recovery',
        1,
      ],
    ]);
  });

  function authoredFixture(): {
    readonly contentKey: ContentKey;
    readonly subclassId: number;
    readonly featureId: number;
    readonly owner: FeatureValueClassInput;
  } {
    const contentKey =
      'expanded:content.subclass:resource-boundary' as ContentKey;
    const subclass = createSubclass(contentKey);
    insertSubclassContribution({
      featureId: subclass.featureId,
      contributionKey: 'focus-pool',
      label: 'Focus Pool source',
      targetKind: 'resource_maximum',
      targetKey: 'focus-pool',
      value: { kind: 'const', amount: 2 },
      displayLabel: 'Focus Pool',
      markingShape: 'boxes',
    });
    return {
      contentKey,
      subclassId: subclass.id,
      featureId: subclass.featureId,
      owner: classInput(
        'Fighter',
        '2024:class:fighter' as ContentKey,
        5,
        { id: subclass.id, content_key: contentKey },
      ),
    };
  }

  it('pins a positive authored maximum and refuses zero and noninteger folds', () => {
    const fixture = authoredFixture();
    const valueContext = context(new Map([
      ['2024:class:fighter' as ContentKey, 5 as ClassLevel],
    ]));
    expect(resolveSheetAuthoredResources(db, [fixture.owner], valueContext)).toEqual([{
      status: 'computed',
      kind: 'authored',
      id: 'resource:authored:focus-pool',
      fact_key: 'focus-pool',
      label: 'Focus Pool',
      maximum: 2,
      marking_shape: 'boxes',
      terms: [{
        source: {
          kind: 'contribution',
          content_key: fixture.contentKey,
          contribution_key: 'focus-pool',
        },
        label: 'Focus Pool source',
        contribution: 2,
        is_base: false,
        status: 'applied',
      }],
    }]);

    for (const amount of [0, 1.5]) {
      db.exec(
        `UPDATE subclass_feature_value_contributions
            SET value_json = ?
          WHERE subclass_feature_id = ? AND contribution_key = 'focus-pool'`,
        [JSON.stringify({ kind: 'const', amount }), fixture.featureId],
      );
      expect(resolveSheetAuthoredResources(db, [fixture.owner], valueContext)).toEqual([{
        status: 'unavailable',
        kind: 'authored',
        id: 'resource:authored:focus-pool',
        fact_key: 'focus-pool',
        label: 'Focus Pool',
        marking_shape: 'boxes',
        reason: 'invalid_data',
      }]);
    }
  });

  it('pins authored-resource shape conflicts and duplicate sources', () => {
    const fixture = authoredFixture();
    const valueContext = context(new Map([
      ['2024:class:fighter' as ContentKey, 5 as ClassLevel],
    ]));
    const unavailable = (label = 'Focus Pool', shape = 'boxes') => [{
      status: 'unavailable',
      kind: 'authored',
      id: 'resource:authored:focus-pool',
      fact_key: 'focus-pool',
      label,
      marking_shape: shape,
      reason: 'invalid_data',
    }];

    expect(resolveSheetAuthoredResources(
      db,
      [fixture.owner, fixture.owner],
      valueContext,
    )).toEqual([{
      status: 'unavailable',
      kind: 'authored',
      id: 'resource:authored:focus-pool',
      fact_key: 'focus-pool',
      label: 'Focus Pool',
      marking_shape: 'boxes',
      reason: 'duplicate_source',
    }]);

    const secondFeature = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, name, description, class_level, sort_order
       ) VALUES (?, 'Second boundary feature', 'Boundary fixture.', 1, 2)`,
      [fixture.subclassId],
    ).lastInsertId;
    insertSubclassContribution({
      featureId: secondFeature,
      contributionKey: 'focus-pool-bonus',
      label: 'Focus Pool bonus',
      targetKind: 'resource_maximum',
      targetKey: 'focus-pool',
      value: { kind: 'const', amount: 1 },
      displayLabel: 'Other Pool',
      markingShape: 'boxes',
    });
    expect(resolveSheetAuthoredResources(db, [fixture.owner], valueContext))
      .toEqual(unavailable());

    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET resource_display_label = 'Focus Pool',
              resource_marking_shape = 'remaining'
        WHERE subclass_feature_id = ?`,
      [secondFeature],
    );
    expect(resolveSheetAuthoredResources(db, [fixture.owner], valueContext))
      .toEqual(unavailable());
  });

  it('refuses malformed authored storage and unknown marking shapes', () => {
    const fixture = authoredFixture();
    const valueContext = context(new Map([
      ['2024:class:fighter' as ContentKey, 5 as ClassLevel],
    ]));
    const exactUnavailable = [{
      status: 'unavailable',
      kind: 'authored',
      id: 'resource:authored:focus-pool',
      fact_key: 'focus-pool',
      label: 'Focus Pool',
      marking_shape: 'boxes',
      reason: 'invalid_data',
    }];

    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET value_json = '[]'
        WHERE subclass_feature_id = ?`,
      [fixture.featureId],
    );
    expect(resolveSheetAuthoredResources(db, [fixture.owner], valueContext))
      .toEqual(exactUnavailable);

    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET value_json = ?, supersedes_ref = '[]'
        WHERE subclass_feature_id = ?`,
      [JSON.stringify({ kind: 'const', amount: 2 }), fixture.featureId],
    );
    expect(resolveSheetAuthoredResources(db, [fixture.owner], valueContext))
      .toEqual(exactUnavailable);

    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET supersedes_ref = NULL, resource_marking_shape = 'circles'
        WHERE subclass_feature_id = ?`,
      [fixture.featureId],
    );
    expect(() => resolveSheetAuthoredResources(db, [fixture.owner], valueContext))
      .toThrowError(AuthoredResourceMarkingShapeError);
  });

  it('does not duplicate an existing historical authored fact key', () => {
    const fixture = authoredFixture();
    const historicalFactKey = `${fixture.contentKey}\u0000veteran-reflexes`;
    db.exec(
      `UPDATE subclass_feature_value_contributions
          SET target_key = ?, resource_display_label = 'Veteran Reflexes'
        WHERE subclass_feature_id = ?`,
      [historicalFactKey, fixture.featureId],
    );
    const otherFeature = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, name, description, class_level, sort_order
       ) VALUES (?, 'Other resource', 'Boundary fixture.', 1, 2)`,
      [fixture.subclassId],
    ).lastInsertId;
    insertSubclassContribution({
      featureId: otherFeature,
      contributionKey: 'other-pool',
      label: 'Other Pool source',
      targetKind: 'resource_maximum',
      targetKey: 'other-pool',
      value: { kind: 'const', amount: 1 },
      displayLabel: 'Other Pool',
      markingShape: 'remaining',
    });
    db.exec(
      `INSERT INTO catalog_content_fingerprints (
         content_kind, fingerprint_scheme, fingerprint_digest, canonical_json,
         content_key, fingerprint_role
       ) VALUES ('subclass', 'content-v1', ?, 'historical fixture', ?, 'current')`,
      [
        'ba433201acabb302fac98efa457ed7846392d71c7400c198d00479912422135c',
        fixture.contentKey,
      ],
    );

    expect(resolveSheetAuthoredResources(
      db,
      [fixture.owner],
      context(new Map([
        ['2024:class:fighter' as ContentKey, 5 as ClassLevel],
      ])),
    ).map((resource) => resource.status === 'computed'
      ? [
          resource.status,
          resource.id,
          resource.fact_key,
          resource.label,
          resource.maximum,
          resource.marking_shape,
        ]
      : [resource.status, resource.id, resource.fact_key, resource.reason]))
      .toEqual([
        [
          'computed',
          'resource:authored:expanded%3Acontent.subclass%3Aresource-boundary%00veteran-reflexes',
          historicalFactKey,
          'Veteran Reflexes',
          2,
          'boxes',
        ],
        [
          'computed',
          'resource:authored:other-pool',
          'other-pool',
          'Other Pool',
          1,
          'remaining',
        ],
      ]);
  });
});
