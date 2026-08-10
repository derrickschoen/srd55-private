import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { applicationSeed } from '../../../src/db/bootstrap';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import { CatalogAuthoringService } from '../../../src/authoring/draft-service';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import { slotsForCasterLevel } from '../../../src/rules/spell-slots';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import {
  addClassLevel,
  classDefinitionId,
  createBuildReportFixture,
  createCharacter,
  persistedReportTableHashes,
  type BuildReportFixture,
} from './build-report-fixture';

function publishStoredSlotDiscriminator(db: DatabaseContext): number {
  const entry = BUNDLED_HOMEBREW_CATALOG.find(
    (candidate) => candidate.catalog_key === 'spell-student',
  );
  const source = entry?.revisions.at(-1);
  if (source?.kind !== 'subclass' || source.progression.mode !== 'override') {
    throw new Error('Spell Student override fixture is missing.');
  }

  // D223 constrains shipped content, not a user's valid authored schedule. Keep
  // the table monotone while making levels 7-8 intentionally differ from the
  // derived third-caster fallback: stored 4/2 versus derived 3/0 at level 7.
  const document = {
    ...source,
    name: 'Persistent Arcanist',
    reference_text:
      'A homebrew fighter subclass with an intentionally authored slot table.',
    progression: {
      ...source.progression,
      rows: source.progression.rows.map((row) => {
        if (row.class_level < 7) return row;
        const slotCounts = [...row.slot_counts];
        slotCounts[0] = Math.max(slotCounts[0] ?? 0, 4);
        slotCounts[1] = Math.max(slotCounts[1] ?? 0, 2);
        return {
          ...row,
          maximum_spell_level: Math.max(row.maximum_spell_level ?? 0, 2),
          slot_counts: slotCounts,
        };
      }),
    },
  } as const;

  let uuidSequence = 0;
  const authoring = new CatalogAuthoringService(db, {
    randomUuid: () => `r40-persisted-slot-${String(++uuidSequence)}`,
    now: () => '2042-08-07T12:00:00.000Z',
  });
  const created = authoring.createDraft({ content_kind: 'subclass' });
  const saved = authoring.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document,
  });
  const preview = authoring.previewPublish({
    draft_uuid: saved.draft_uuid,
    expected_revision: saved.revision,
  });
  const published = authoring.commitPublish({
    token: preview.token,
    decisions: [],
  });
  if (published.outcome !== 'created') {
    throw new Error('Persisted-slot discriminator was not newly published.');
  }

  const subclassId = db.scalar<number>(
    'SELECT id FROM subclass_definitions WHERE content_key = ?',
    [published.content_key],
  );
  if (subclassId === null) {
    throw new Error('Persisted-slot discriminator definition is missing.');
  }
  return subclassId;
}

describe('deterministic read-only build report', () => {
  let connection: Database;
  let db: DatabaseContext;
  let fixture: BuildReportFixture;
  let builder: BuildReportBuilder;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    fixture = createBuildReportFixture(db);
    builder = new BuildReportBuilder(db);
  });

  afterEach(() => {
    connection.close();
  });

  it('builds the complete ordered report from persisted source state without writes', () => {
    expect(
      db.allRaw(
        `SELECT class.name, level.level
         FROM character_class_levels AS level
         INNER JOIN class_definitions AS class
           ON class.id = level.class_definition_id
         WHERE level.character_id = ?
         ORDER BY class.name`,
        [fixture.characterId],
      ),
    ).toEqual([
      { name: 'Paladin', level: 1 },
      { name: 'Ranger', level: 1 },
      { name: 'Warlock', level: 5 },
      { name: 'Wizard', level: 1 },
    ]);
    expect(
      db.allRaw(
        `SELECT id, state, selection_eligibility,
                selection_invalid_reason, orphan_reason_code, override_note
         FROM spell_selection_slots
         WHERE id IN (?, ?, ?)
         ORDER BY id`,
        fixture.invalidSlotIds,
      ),
    ).toEqual([
      {
        id: fixture.invalidSlotIds[1],
        state: 'active',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is outside the slot level range.',
        orphan_reason_code: null,
        override_note: null,
      },
      {
        id: fixture.invalidSlotIds[0],
        state: 'orphaned',
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
        orphan_reason_code: 'grant_rule_removed',
        override_note: null,
      },
      {
        id: fixture.invalidSlotIds[2],
        state: 'kept_override',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is outside the slot level range.',
        orphan_reason_code: null,
        override_note: 'Explicit table ruling.',
      },
    ]);

    const before = persistedReportTableHashes(db, fixture.characterId);
    const report = builder.build(fixture.characterId);
    const second = builder.build(fixture.characterId);

    expect(report).toEqual(second);
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
    expect(Object.keys(report)).toEqual([
      'character',
      'caster',
      'classes',
      'catalog_sources',
      'preparation_callout',
      'access_routes',
      'wizard',
      'duplicate_assessments',
      'invalid_selections',
    ]);
    expect(report.character).toEqual({
      id: fixture.characterId,
      name: 'R40 Golden',
      character_level: 8,
      proficiency_bonus: 3,
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 16,
        wisdom: 14,
        charisma: 18,
      },
      abilities_base: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 16,
        wisdom: 14,
        charisma: 18,
      },
    });
    expect(report.caster).toEqual({
      caster_level: 3,
      slots: [
        { level: 1, count: 4 },
        { level: 2, count: 2 },
      ],
      pact_magic: { count: 2, level: 3 },
    });
    expect(
      report.classes.map((entry) => ({
        name: entry.name,
        subclass: entry.subclass,
        level: entry.class_level,
        ability: entry.spellcasting_ability,
        progression: entry.progression_type,
        prepared: entry.prepared_count,
        maximum: entry.max_preparable_level,
      })),
    ).toEqual([
      {
        name: 'Paladin',
        subclass: null,
        level: 1,
        ability: 'charisma',
        progression: 'half_up',
        prepared: 2,
        maximum: 1,
      },
      {
        name: 'Ranger',
        subclass: null,
        level: 1,
        ability: 'wisdom',
        progression: 'half_up',
        prepared: 2,
        maximum: 1,
      },
      {
        name: 'Warlock',
        subclass: null,
        level: 5,
        ability: 'charisma',
        progression: 'pact',
        prepared: 6,
        maximum: 3,
      },
      {
        name: 'Wizard',
        subclass: null,
        level: 1,
        ability: 'intelligence',
        progression: 'full',
        prepared: 4,
        maximum: 1,
      },
    ]);
    expect(report.preparation_callout).toBe(
      'This build possesses shared Spellcasting slots through 2nd level and Pact Magic slots at 3rd level. Either pool can cast an eligible prepared spell. Class-specific preparation limits reach 3rd-level spells; a slot from either pool does not unlock higher-level choices for another class.',
    );

    expect(
      report.access_routes
        .filter((route) => route.spell_name === 'Mage Hand')
        .map((route) => route.source_name),
    ).toEqual(['Magic Initiate: Wizard', 'Wizard 1']);
    expect(
      report.access_routes
        .filter((route) => route.spell_name === 'Invalid Bolt')
        .map((route) => ({
          source: route.source_name,
          state: route.slot_id,
          ability: route.spellcasting_ability,
        })),
    ).toEqual([
      {
        source: 'Magic Initiate: Wizard',
        state: fixture.invalidSlotIds[2],
        ability: 'wisdom',
      },
    ]);

    const mageHand = report.duplicate_assessments.find(
      (item) => item.spell_name === 'Mage Hand',
    );
    expect(mageHand).toMatchObject({
      category: 'wasteful',
      selection_count: 2,
      sources: ['Magic Initiate: Wizard', 'Wizard 1'],
      acknowledgement: null,
    });
    const shield = report.duplicate_assessments.find(
      (item) => item.spell_name === 'Shield',
    );
    expect(shield).toMatchObject({
      category: 'conflicting_version',
      selection_count: 2,
      acknowledgement: null,
    });
    expect(shield?.versions.map((version) => version.edition)).toEqual([
      '2014',
      '2024',
    ]);

    expect(
      report.wizard.spellbook.map((entry) => ({
        name: entry.spell_name,
        prepared: entry.prepared,
        active: entry.active,
      })),
    ).toEqual([
      { name: 'Detect Magic', prepared: false, active: true },
      { name: 'Mage Armor', prepared: true, active: true },
      { name: 'Magic Missile', prepared: true, active: true },
    ]);
    expect(report.wizard.prepared.map((entry) => entry.spell_name)).toEqual([
      'Mage Armor',
      'Magic Missile',
      'Shield',
      'Shield',
    ]);
    expect(Object.keys(report.wizard.prepared[0]!)).toEqual([
      'spell_version_id',
      'spell_name',
      'spell_catalog_layer',
      'level',
    ]);
    expect(
      report.wizard.ritual_only.map((entry) => entry.spell_name),
    ).toEqual(['Detect Magic']);
    expect(report.wizard.explanation).toContain(
      'consumes no preparation capacity',
    );

    expect(
      report.invalid_selections.map((slot) => ({
        id: slot.id,
        source: slot.source,
        label: slot.label,
        spell: slot.spell_name,
        state: slot.state,
        eligibility: slot.eligibility,
        reason: slot.invalid_reason ?? slot.orphan_reason,
        attack: slot.attack_bonus,
      })),
    ).toEqual([
      {
        id: fixture.invalidSlotIds[0],
        source: 'Magic Initiate: Wizard',
        label: 'Known 1',
        spell: null,
        state: 'orphaned',
        eligibility: 'unselected',
        reason: 'grant_rule_removed',
        attack: null,
      },
      {
        id: fixture.invalidSlotIds[1],
        source: 'Magic Initiate: Wizard',
        label: 'Persisted invalid choice',
        spell: 'Invalid Bolt',
        state: 'active',
        eligibility: 'invalid',
        reason: 'Selected spell is outside the slot level range.',
        attack: 5,
      },
      {
        id: fixture.invalidSlotIds[2],
        source: 'Magic Initiate: Wizard',
        label: 'Known 1',
        spell: 'Invalid Bolt',
        state: 'kept_override',
        eligibility: 'invalid',
        reason: 'Selected spell is outside the slot level range.',
        attack: 5,
      },
    ]);
  });

  it('attaches only the persisted active acknowledgement to its exact warning', () => {
    const initial = builder.build(fixture.characterId);
    const conflict = initial.duplicate_assessments.find(
      (item) => item.category === 'conflicting_version',
    );
    expect(conflict?.warning_fingerprint).toMatch(
      /^conflicting_versions:[a-f0-9]{64}$/,
    );

    const acknowledgementId = db.exec(
      `INSERT INTO warning_acknowledgements (
         character_id, warning_fingerprint, note, created_at, updated_at
       ) VALUES (?, ?, 'Accepted for roleplay', ?, ?)`,
      [
        fixture.characterId,
        conflict!.warning_fingerprint!,
        '2026-07-22 12:34:56',
        '2026-07-22 12:34:56',
      ],
    ).lastInsertId;
    expect(
      db.oneRaw(
        `SELECT id, note, invalidated_at, created_at
         FROM warning_acknowledgements
         WHERE id = ?`,
        [acknowledgementId],
      ),
    ).toEqual({
      id: acknowledgementId,
      note: 'Accepted for roleplay',
      invalidated_at: null,
      created_at: '2026-07-22 12:34:56',
    });

    const beforeActiveBuild = persistedReportTableHashes(
      db,
      fixture.characterId,
    );
    const active = builder
      .build(fixture.characterId)
      .duplicate_assessments.find(
        (item) => item.category === 'conflicting_version',
      );
    expect(active?.acknowledgement).toEqual({
      id: acknowledgementId,
      note: 'Accepted for roleplay',
      created_at: '2026-07-22 12:34:56',
    });
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      beforeActiveBuild,
    );

    db.exec(
      `UPDATE warning_acknowledgements
       SET invalidated_at = '2026-07-23 00:00:00'
       WHERE id = ?`,
      [acknowledgementId],
    );
    const beforeInvalidatedBuild = persistedReportTableHashes(
      db,
      fixture.characterId,
    );
    const invalidated = builder
      .build(fixture.characterId)
      .duplicate_assessments.find(
        (item) => item.category === 'conflicting_version',
      );
    expect(invalidated?.acknowledgement).toBeNull();
    expect(
      db.scalar(
        `SELECT invalidated_at
         FROM warning_acknowledgements
         WHERE id = ?`,
        [acknowledgementId],
      ),
    ).toBe('2026-07-23 00:00:00');
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      beforeInvalidatedBuild,
    );
  });

  // Full-suite ms: postswap-vitest.log=4029, digest-vitest6.log=4176,
  // digest-postmerge.log=4132, a11ygaps-vitest2.log=4559,
  // a11ygaps-postmerge.log=4233, a11ygaps-postmerge2.log=4204,
  // hardening-vitest.log=4259.
  // 4559 x 1.5 = 6838.5, rounded up to 6900ms.
  it('uses a lone third-caster subclass table and shared slots for multiple providers', () => {
    applicationSeed(db);
    const fighterId = classDefinitionId(db, 'Fighter');
    const spellStudentCatalog = BUNDLED_HOMEBREW_CATALOG.filter(
      (entry) => entry.catalog_key === 'spell-student',
    );
    const plan = planBundledHomebrewInstall(db, spellStudentCatalog);
    const installed = commitBundledHomebrewInstall(
      db,
      plan.token,
      spellStudentCatalog,
    );
    if (installed.kind !== 'committed') {
      throw new Error(`Spell Student install failed: ${installed.kind}`);
    }
    const subclassId = Number(
      db.scalar(
        `SELECT id FROM subclass_definitions
         WHERE class_definition_id = ?
           AND content_key = '2024:content.subclass:spell-student-bundled-revision-2'`,
        [fighterId],
      ),
    );
    expect(db.oneRaw(
      `SELECT subclass.content_key, subclass.name, progression.class_level,
         progression.cantrips_known, progression.prepared_count,
         progression.max_spell_level, progression.slots,
         progression.grant_rules
       FROM subclass_definitions AS subclass
       INNER JOIN subclass_progressions AS progression
         ON progression.subclass_definition_id = subclass.id
       WHERE subclass.content_key = '2024:content.subclass:spell-student'
         AND progression.class_level = 7`,
    )).toEqual({
      content_key: '2024:content.subclass:spell-student',
      name: 'Spell Student',
      class_level: 7,
      cantrips_known: 1,
      prepared_count: 2,
      max_spell_level: 1,
      slots: JSON.stringify({ 1: 3 }),
      grant_rules: JSON.stringify([
        {
          kind: 'choice_from_list',
          rule_key: 'spell-student-cantrips',
          list: 'Wizard',
          count: 1,
          bucket: 'known',
          level_min: 0,
          level_max: 0,
          always_prepared: false,
          with_slots: true,
          free_cast: null,
        },
        {
          kind: 'choice_from_list',
          rule_key: 'spell-student-spells',
          list: 'Wizard',
          count: 2,
          bucket: 'known',
          level_min: 0,
          level_max: 1,
          always_prepared: false,
          with_slots: true,
          free_cast: null,
        },
      ]),
    });

    const discriminatingSubclassId = publishStoredSlotDiscriminator(db);
    const discriminatingId = createCharacter(db, 'Stored table third caster', {
      intelligence: 16,
    });
    addClassLevel(
      db,
      discriminatingId,
      'Fighter',
      7,
      discriminatingSubclassId,
    );
    const storedSlots = db.scalar<string>(
      `SELECT slots FROM subclass_progressions
       WHERE subclass_definition_id = ? AND class_level = 7`,
      [discriminatingSubclassId],
    );
    expect(storedSlots === null ? null : JSON.parse(storedSlots)).toEqual({
      1: 4,
      2: 2,
    });
    expect(slotsForCasterLevel(2)).toEqual({ 1: 3 });
    const discriminatingBefore = persistedReportTableHashes(
      db,
      discriminatingId,
    );
    const discriminating = builder.build(discriminatingId);
    expect(discriminating.classes).toEqual([
      {
        name: 'Fighter',
        subclass: 'Persistent Arcanist',
        class_catalog_layer: 'bundled',
        subclass_catalog_layer: 'external',
        class_level: 7,
        spellcasting_ability: 'intelligence',
        progression_type: 'third_down',
        prepared_count: 2,
        max_preparable_level: 2,
      },
    ]);
    expect(
      discriminating.caster,
      'negative control: removing the persisted-table branch must fall back to derived level-2 caster slots {1: 3} and fail this assertion',
    ).toEqual({
      caster_level: 2,
      slots: [
        { level: 1, count: 4 },
        { level: 2, count: 2 },
      ],
      pact_magic: null,
    });
    expect(
      persistedReportTableHashes(db, discriminatingId),
    ).toEqual(discriminatingBefore);

    const singleId = createCharacter(db, 'Single third caster', {
      intelligence: 16,
    });
    addClassLevel(db, singleId, 'Fighter', 7, subclassId);
    const singleBefore = persistedReportTableHashes(db, singleId);
    const single = builder.build(singleId);
    expect(single.classes).toEqual([
      {
        name: 'Fighter',
        subclass: 'Spell Student (Bundled revision 2)',
        class_catalog_layer: 'bundled',
        subclass_catalog_layer: 'external',
        class_level: 7,
        spellcasting_ability: 'intelligence',
        progression_type: 'third_down',
        prepared_count: 2,
        max_preparable_level: 1,
      },
    ]);
    expect(single.caster).toEqual({
      caster_level: 2,
      slots: [{ level: 1, count: 3 }],
      pact_magic: null,
    });
    expect(persistedReportTableHashes(db, singleId)).toEqual(singleBefore);

    const multiclassId = createCharacter(db, 'Two providers', {
      intelligence: 16,
      charisma: 16,
    });
    addClassLevel(db, multiclassId, 'Fighter', 7, subclassId);
    addClassLevel(db, multiclassId, 'Wizard', 3);
    expect(
      db.allRaw(
        `SELECT class.name, level.level, subclass.name AS subclass
         FROM character_class_levels AS level
         INNER JOIN class_definitions AS class
           ON class.id = level.class_definition_id
         LEFT JOIN subclass_definitions AS subclass
           ON subclass.id = level.subclass_definition_id
         WHERE level.character_id = ?
         ORDER BY class.name`,
        [multiclassId],
      ),
    ).toEqual([
      {
        name: 'Fighter',
        level: 7,
        subclass: 'Spell Student (Bundled revision 2)',
      },
      { name: 'Wizard', level: 3, subclass: null },
    ]);
    const multiclassBefore = persistedReportTableHashes(db, multiclassId);
    expect(builder.build(multiclassId).caster).toEqual({
      caster_level: 5,
      slots: [
        { level: 1, count: 4 },
        { level: 2, count: 3 },
        { level: 3, count: 2 },
      ],
      pact_magic: null,
    });
    expect(persistedReportTableHashes(db, multiclassId)).toEqual(
      multiclassBefore,
    );
  }, 6900);

  it('renders exact Pact-only, shared-only, and martial preparation callouts', () => {
    const pactId = createCharacter(db, 'Pact only');
    addClassLevel(db, pactId, 'Warlock', 5);
    const pactBefore = persistedReportTableHashes(db, pactId);
    const pact = builder.build(pactId);
    expect(pact.caster).toEqual({
      caster_level: 0,
      slots: [],
      pact_magic: { count: 2, level: 3 },
    });
    expect(pact.preparation_callout).toBe(
      'This build possesses no shared Spellcasting slots and Pact Magic slots at 3rd level. Pact Magic can cast eligible prepared spells. Class-specific preparation limits reach 3rd-level spells; slot level does not unlock higher-level choices.',
    );
    expect(persistedReportTableHashes(db, pactId)).toEqual(pactBefore);

    const sharedId = createCharacter(db, 'Second-level Callout');
    addClassLevel(db, sharedId, 'Bard', 1);
    addClassLevel(db, sharedId, 'Wizard', 2);
    const sharedBefore = persistedReportTableHashes(db, sharedId);
    expect(builder.build(sharedId).preparation_callout).toBe(
      'This build possesses 2nd-level slots, but every class can prepare only 1st-level spells. Higher-level slots can upcast those lower-level spells; they do not unlock higher-level choices.',
    );
    expect(persistedReportTableHashes(db, sharedId)).toEqual(sharedBefore);

    const martialId = createCharacter(db, 'Martial only');
    addClassLevel(db, martialId, 'Fighter', 2);
    addClassLevel(db, martialId, 'Barbarian', 2);
    const martialBefore = persistedReportTableHashes(db, martialId);
    const martial = builder.build(martialId);
    expect(martial.caster).toEqual({
      caster_level: 0,
      slots: [],
      pact_magic: null,
    });
    expect(martial.preparation_callout).toBe(
      'This build possesses no Spellcasting or Pact Magic slots.',
    );
    expect(persistedReportTableHashes(db, martialId)).toEqual(martialBefore);
  });

  it('maps all subclass fractions and rejects unsupported or missing builds exactly', () => {
    const fighterId = classDefinitionId(db, 'Fighter');
    const cases = [
      ['1/2', 'up', 'half_up', 3],
      ['1/2', 'down', 'half_down', 2],
      ['1/3', 'up', 'third_up', 2],
      ['1/3', 'down', 'third_down', 1],
    ] as const;

    for (const [fraction, rounding, progression, expectedCaster] of cases) {
      const contentKey = `r40:fraction:${fraction}:${rounding}`;
      const name = `Test ${fraction} ${rounding}`;
      registerFixtureContentIdentity(db, {
        kind: 'subclass', contentKey, name, keyKind: 'bundled-stable',
      });
      const subclassId = db.exec(
        `INSERT INTO subclass_definitions (
           content_key, class_definition_id, name, rules_edition,
           spellcasting_ability, caster_fraction, caster_rounding
         ) VALUES (?, ?, ?, '2024', 'intelligence', ?, ?)`,
        [
          contentKey,
          fighterId,
          name,
          fraction,
          rounding,
        ],
      ).lastInsertId;
      const characterId = createCharacter(
        db,
        `Fraction ${fraction} ${rounding}`,
      );
      addClassLevel(db, characterId, 'Fighter', 5, subclassId);
      expect(
        db.oneRaw(
          `SELECT subclass.caster_fraction, subclass.caster_rounding,
                  level.level
           FROM character_class_levels AS level
           INNER JOIN subclass_definitions AS subclass
             ON subclass.id = level.subclass_definition_id
           WHERE level.character_id = ?`,
          [characterId],
        ),
      ).toEqual({
        caster_fraction: fraction,
        caster_rounding: rounding,
        level: 5,
      });
      const before = persistedReportTableHashes(db, characterId);
      const report = builder.build(characterId);
      expect(report.classes[0]?.progression_type).toBe(progression);
      expect(report.classes[0]?.spellcasting_ability).toBe(
        'intelligence',
      );
      expect(report.caster.caster_level).toBe(expectedCaster);
      expect(persistedReportTableHashes(db, characterId)).toEqual(before);
    }

    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey: 'r40:unsupported',
      name: 'Unsupported Fraction', keyKind: 'bundled-stable',
    });
    const unsupportedSubclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         spellcasting_ability, caster_fraction, caster_rounding
       ) VALUES (
         'r40:unsupported', ?, 'Unsupported Fraction', '2024',
         'intelligence', '2/3', 'up'
       )`,
      [fighterId],
    ).lastInsertId;
    const unsupportedId = createCharacter(db, 'Unsupported Fraction');
    addClassLevel(
      db,
      unsupportedId,
      'Fighter',
      3,
      unsupportedSubclassId,
    );
    const unsupportedBefore = persistedReportTableHashes(db, unsupportedId);
    expect(() => builder.build(unsupportedId)).toThrowError(
      'Unsupported caster fraction 2/3 rounded up.',
    );
    expect(persistedReportTableHashes(db, unsupportedId)).toEqual(
      unsupportedBefore,
    );

    expect(() => builder.build(999_999)).toThrowError(
      'Character 999999 does not exist.',
    );
  });
});
