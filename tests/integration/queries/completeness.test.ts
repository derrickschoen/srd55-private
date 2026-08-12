import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { AddSourceCommand } from '../../../src/commands/add-source';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import {
  CharacterCompletenessQueries,
  type CompletenessResult,
  type UnfilledChoicesItem,
} from '../../../src/queries/character-completeness';
import { CharacterListBuilder } from '../../../src/queries/character-list-builder';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { assignSpellSelection } from '../../../src/eligibility/spell-selection-assignment';
import {
  addClassLevel,
  classDefinitionId,
  createCharacter,
  createSlot,
  createSource,
  createSpell,
} from '../reports/build-report-fixture';

let connection: Database | undefined;

afterEach(() => {
  connection?.close();
  connection = undefined;
});

async function context(
  options: { readonly seedClasses?: boolean } = {},
): Promise<DatabaseContext> {
  connection = await openTestDatabase();
  const db = new DatabaseContext(connection);
  if (options.seedClasses !== false) {
    seedClassProgressions(db);
  }
  return db;
}

const magicInitiateRules = [
  {
    kind: 'choice_from_list',
    rule_key: 'magic-initiate-cantrips',
    count: 2,
    bucket: 'cantrip_known',
    list: '$config.chosen_list',
    level_min: 0,
    level_max: 0,
    with_slots: false,
  },
  {
    kind: 'choice_from_list',
    rule_key: 'magic-initiate-level-one',
    count: 1,
    bucket: 'known',
    list: '$config.chosen_list',
    level_min: 1,
    level_max: 1,
    with_slots: true,
  },
];

function seedMagicInitiate(db: DatabaseContext): number {
  registerFixtureContentIdentity(db, {
    kind: 'feat', contentKey: '2024:feat:magic-initiate',
    name: 'Magic Initiate', keyKind: 'bundled-stable',
  });
  return db.exec(
    `INSERT INTO feat_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES ('2024:feat:magic-initiate', 'Magic Initiate', '2024', 1, ?)`,
    [JSON.stringify(magicInitiateRules)],
  ).lastInsertId;
}

function addMagicInitiate(
  db: DatabaseContext,
  characterId: number,
  definitionId: number,
  chosenList: string,
): void {
  new AddSourceCommand(
    db,
    {
      type: 'add_source',
      source_type: 'feat',
      source_definition_id: definitionId,
      config: {
        chosen_list: chosenList,
        spellcasting_ability: 'intelligence',
      },
    },
    new CharacterCommandIntegrity('completeness-fixture'),
  ).apply(characterId);
}

function listSpell(
  db: DatabaseContext,
  name: string,
  level: number,
  list: string,
): number {
  const id = createSpell(db, name, { level });
  db.exec(
    `INSERT INTO spell_list_memberships (spell_version_id, spell_list_key)
     VALUES (?, ?)`,
    [id, list],
  );
  return id;
}

function unfilled(
  result: CompletenessResult,
): readonly UnfilledChoicesItem[] {
  return result.items.filter(
    (item): item is UnfilledChoicesItem =>
      item.kind === 'unfilled_choices',
  );
}

describe('completeness detection', () => {
  it('surfaces six initial Wizard book entries and preserves an out-of-book preparation with addressed repairs', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'Spellbook Repair');
    new AddSourceCommand(
      db,
      {
        type: 'add_source',
        source_type: 'class',
        source_definition_id: classDefinitionId(db, 'Wizard'),
        config: { level: 1 },
      },
      new CharacterCommandIntegrity('completeness-fixture'),
    ).apply(characterId);
    const inBookId = listSpell(db, 'In Book Ward', 1, 'Wizard');
    const outOfBookId = listSpell(db, 'Out of Book Ward', 1, 'Wizard');
    const acquisitions = db.allRaw(
      `SELECT id FROM wizard_spellbook_entries
       WHERE character_id = ? ORDER BY ordinal`,
      [characterId],
    );
    expect(acquisitions).toHaveLength(6);
    assignSpellSelection(db, {
      address: {
        kind: 'spellbook_acquisition',
        id: Number(acquisitions[0]?.id),
      },
      character_id: characterId,
      spell_version_id: inBookId,
    });
    const preparedSlotId = Number(
      db.scalar(
        `SELECT id FROM spell_selection_slots
         WHERE character_id = ? AND rule_key = 'wizard-prepared'
         ORDER BY ordinal LIMIT 1`,
        [characterId],
      ),
    );
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?, selection_eligibility = 'invalid',
           selection_invalid_reason = ?
       WHERE id = ?`,
      [
        outOfBookId,
        'Selected Wizard preparation is not in this character’s active spellbook.',
        preparedSlotId,
      ],
    );

    const items = new CharacterCompletenessQueries(db).build(characterId).items
      .filter((item) => item.kind.startsWith('wizard_'));
    expect(items).toEqual([
      {
        kind: 'wizard_spellbook_incomplete',
        title: 'Wizard 1 — 1 of 6 spellbook spells chosen',
        detail:
          'This Wizard has 5 empty spellbook entries. Preparation is limited to filled entries, so complete the spellbook before choosing the prepared list.',
        remedy: 'Choose the missing spellbook spells.',
        source_name: 'Wizard 1',
        source_catalog_layer: 'bundled',
        chosen: 1,
        required: 6,
        missing: 5,
        acquisition_id: Number(acquisitions[1]?.id),
      },
      {
        kind: 'wizard_preparation_out_of_book',
        title: 'Wizard 1 — Out of Book Ward is prepared but not in the spellbook',
        detail:
          'The selection is preserved, but it is invalid and grants no Wizard preparation access until it is replaced with a spell in the active spellbook.',
        remedy: 'Choose an in-book replacement.',
        source_name: 'Wizard 1',
        source_catalog_layer: 'bundled',
        spell_name: 'Out of Book Ward',
        spell_catalog_layer: 'external',
        slot_id: preparedSlotId,
      },
    ]);
  });

  it('reports fillable groups, suppresses unfillable ones, and never counts a catalog gap as outstanding', async () => {
    const db = await context();
    const definitionId = seedMagicInitiate(db);
    const characterId = createCharacter(db, 'Gate Probe');
    addClassLevel(db, characterId, 'Wizard', 1);
    listSpell(db, 'Prestidigitation', 0, 'Wizard');
    addMagicInitiate(db, characterId, definitionId, 'Wizard');

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(unfilled(result)).toEqual([
      {
        kind: 'unfilled_choices',
        title: 'Magic Initiate: Wizard — 0 of 2 cantrips chosen',
        detail: 'This source grants 2 cantrip choices; 2 are still empty.',
        remedy:
          'Open Magic Initiate: Wizard in the planner and choose 2 cantrips.',
        source_instance_id: expect.any(Number) as number,
        source_name: 'Magic Initiate: Wizard',
        rule_key: 'magic-initiate-cantrips',
        bucket: 'cantrip_known',
        chosen: 0,
        required: 2,
        missing: 2,
      },
    ]);
    expect(result.catalog_gaps).toEqual([
      {
        kind: 'catalog_gap',
        title: 'No eligible Wizard level 1 spells in your catalog',
        detail:
          'Magic Initiate: Wizard asks for Wizard level 1 spells, and no spell in the imported catalog can fill them.',
        remedy_action: 'import_catalog',
        spell_lists: ['Wizard'],
        spell_schools: [],
        spell_tags: [],
        spell_level_min: 1,
        spell_level_max: 1,
        sources: ['Magic Initiate: Wizard'],
      },
    ]);
    expect(result.outstanding_count).toBe(1);
    expect(result.catalog_gap_count).toBe(1);
  });

  it('emits nothing outstanding when every group is blocked by an empty catalog, one gap per distinct constraint', async () => {
    const db = await context();
    const definitionId = seedMagicInitiate(db);
    const characterId = createCharacter(db, 'Empty Catalog');
    addClassLevel(db, characterId, 'Wizard', 1);
    addMagicInitiate(db, characterId, definitionId, 'Cleric');

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(result.outstanding_count).toBe(0);
    expect(result.items).toEqual([]);
    // The cantrip group and the level-one group differ only by level range;
    // collapsing them onto one gap would under-count and misstate the remedy.
    expect(result.catalog_gaps.map((gap) => gap.title)).toEqual([
      'No eligible Cleric cantrips in your catalog',
      'No eligible Cleric level 1 spells in your catalog',
    ]);
    expect(result.catalog_gaps.map((gap) => gap.remedy_action)).toEqual([
      'import_catalog',
      'import_catalog',
    ]);
    expect(result.catalog_gap_count).toBe(2);
  });

  it('collapses one logical constraint written in two array orders onto a single gap', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'List Order');
    addClassLevel(db, characterId, 'Wizard', 1);
    const sourceId = createSource(
      db,
      characterId,
      'class',
      classDefinitionId(db, 'Wizard'),
      'Wizard 1',
      {},
    );
    for (const [ordinal, lists] of [
      [1, ['Cleric', 'Wizard']],
      [2, ['Wizard', 'Cleric']],
    ] as const) {
      createSlot(db, characterId, sourceId, null, `order:${ordinal}`, ordinal, {
        bucket: 'known',
        levelMin: 1,
        levelMax: 1,
        required: true,
        allowedSpellLists: lists,
      });
    }

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(result.catalog_gaps.map((gap) => gap.title)).toEqual([
      'No eligible Cleric and Wizard level 1 spells in your catalog',
    ]);
    expect(result.catalog_gap_count).toBe(1);
  });

  it('reports a group whose lowest-id slot is unfillable when a later slot is fillable', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'Mixed Group');
    addClassLevel(db, characterId, 'Wizard', 1);
    const sourceId = createSource(
      db,
      characterId,
      'class',
      classDefinitionId(db, 'Wizard'),
      'Wizard 1',
      {},
    );
    listSpell(db, 'Magic Missile', 1, 'Wizard');
    // The Bard slot has the lower id, so probing min(id) alone would hide the
    // Wizard slot beside it, which is fillable and real work.
    createSlot(db, characterId, sourceId, null, 'mixed:1', 1, {
      bucket: 'known',
      levelMin: 1,
      levelMax: 1,
      required: true,
      allowedSpellLists: ['Bard'],
    });
    createSlot(db, characterId, sourceId, null, 'mixed:2', 2, {
      bucket: 'known',
      levelMin: 1,
      levelMax: 1,
      required: true,
      allowedSpellLists: ['Wizard'],
    });

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(unfilled(result).map((item) => item.title)).toEqual([
      'Wizard 1 — 0 of 2 known spells chosen',
    ]);
    expect(result.outstanding_count).toBe(1);
    expect(result.catalog_gaps).toEqual([]);
  });

  it('drops a slot whose constraint will not decode instead of failing the whole query', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'Corrupt Constraint');
    addClassLevel(db, characterId, 'Wizard', 1);
    const sourceId = createSource(
      db,
      characterId,
      'class',
      classDefinitionId(db, 'Wizard'),
      'Wizard 1',
      {},
    );
    listSpell(db, 'Magic Missile', 1, 'Wizard');
    const slotId = createSlot(db, characterId, sourceId, null, 'broken:1', 1, {
      bucket: 'known',
      levelMin: 1,
      levelMax: 1,
      required: true,
      allowedSpellLists: ['Wizard'],
    });
    db.exec(
      'UPDATE spell_selection_slots SET allowed_spell_lists = ? WHERE id = ?',
      ['not json', slotId],
    );

    const queries = new CharacterCompletenessQueries(db);

    expect(queries.build(characterId)).toEqual({
      character_id: characterId,
      outstanding_count: 0,
      catalog_gap_count: 0,
      items: [],
      catalog_gaps: [],
    });
    expect(queries.counts()).toEqual([
      { character_id: characterId, outstanding_count: 0, catalog_gap_count: 0 },
    ]);
  });

  it('raises the same not-found error as every other per-character query', async () => {
    const db = await context();

    expect(() => new CharacterCompletenessQueries(db).build(999999)).toThrow(
      'Character 999999 does not exist.',
    );
  });

  it('counts a prepared group only when it is wholly empty and counts partial under-fill elsewhere', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'Bucket Policy');
    addClassLevel(db, characterId, 'Cleric', 3);
    const sourceId = createSource(
      db,
      characterId,
      'class',
      classDefinitionId(db, 'Cleric'),
      'Cleric 3',
      { divine_order: { chosen_option: 'Protector' } },
    );
    const spellId = listSpell(db, 'Bless', 1, 'Cleric');
    const group = (
      ruleKey: string,
      bucket: string,
      filled: number,
      empty: number,
    ): void => {
      for (let ordinal = 1; ordinal <= filled + empty; ordinal += 1) {
        createSlot(
          db,
          characterId,
          sourceId,
          ordinal <= filled ? spellId : null,
          `${ruleKey}:${ordinal}`,
          ordinal,
          {
            bucket,
            levelMin: 1,
            levelMax: 1,
            required: true,
            allowedSpellLists: ['Cleric'],
          },
        );
      }
    };
    group('partial-prepared', 'prepared', 2, 1);
    group('empty-prepared', 'prepared', 0, 2);
    group('partial-known', 'known', 1, 1);
    group('automatic-empty', 'automatic', 0, 2);

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(
      unfilled(result).map((item) => [item.rule_key, item.title]),
    ).toEqual([
      [
        'empty-prepared',
        'Cleric 3 — 0 of 2 prepared spells chosen',
      ],
      [
        'partial-known',
        'Cleric 3 — 1 of 2 known spells chosen',
      ],
    ]);
    expect(
      unfilled(result).map((item) => item.remedy),
    ).toEqual([
      'Open Cleric 3 in the planner and choose 2 spells for the prepared list.',
      'Open Cleric 3 in the planner and choose 1 more known spell.',
    ]);
  });

  it('keeps under-fill disjoint from the warnings badge through both guard clauses', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'Disjoint');
    addClassLevel(db, characterId, 'Wizard', 1);
    const sourceId = createSource(
      db,
      characterId,
      'class',
      classDefinitionId(db, 'Wizard'),
      'Wizard 1',
      {},
    );
    const spellId = listSpell(db, 'Magic Missile', 1, 'Wizard');
    const otherSpellId = listSpell(db, 'Shield', 1, 'Wizard');
    const slot = (
      ordinal: number,
      spell: number | null,
      overrides: Parameters<typeof createSlot>[6],
    ): void => {
      createSlot(db, characterId, sourceId, spell, `guard:${ordinal}`, ordinal, {
        bucket: 'known',
        levelMin: 1,
        levelMax: 1,
        required: true,
        allowedSpellLists: ['Wizard'],
        ...overrides,
      });
    };
    slot(1, spellId, {});
    slot(2, otherSpellId, {
      eligibility: 'invalid',
      invalidReason: 'Selected spell is outside the slot level range.',
    });
    slot(3, null, {
      eligibility: 'invalid',
      invalidReason: 'Selected spell is outside the slot level range.',
    });
    slot(4, null, {});
    slot(5, null, { state: 'orphaned', orphanReason: 'grant_rule_removed' });

    const result = new CharacterCompletenessQueries(db).build(characterId);

    // Slot 3 is empty yet flagged invalid — a state only a restored database
    // reaches. It is already a warning, so it leaves the arithmetic entirely
    // rather than counting as a chosen spell that is not there.
    expect(
      unfilled(result).map((item) => ({
        required: item.required,
        chosen: item.chosen,
        missing: item.missing,
      })),
    ).toEqual([{ required: 3, chosen: 2, missing: 1 }]);
    expect(
      new CharacterListBuilder(db)
        .build()
        .map((card) => card.warning_count),
    ).toEqual([3]);
  });

  it('reports an unchosen Cleric order without flagging any other class', async () => {
    const db = await context();
    const characterId = createCharacter(db, 'Order Probe');
    const integrity = new CharacterCommandIntegrity('completeness-fixture');
    for (const [className, config] of [
      ['Cleric', { level: 3 }],
      ['Druid', { level: 1, primal_order: { chosen_option: 'Warden' } }],
      ['Wizard', { level: 1 }],
    ] as const) {
      new AddSourceCommand(
        db,
        {
          type: 'add_source',
          source_type: 'class',
          source_definition_id: classDefinitionId(db, className),
          config,
        },
        integrity,
      ).apply(characterId);
    }

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(
      result.items.filter((item) => item.kind === 'unchosen_option'),
    ).toEqual([
      {
        kind: 'unchosen_option',
        title: 'Cleric 3 — Divine Order not chosen',
        detail:
          'Divine Order is unchosen, so this source has granted no spells yet.',
        remedy:
          'Open Cleric 3 in the planner and choose Protector or Thaumaturge.',
        source_instance_id: expect.any(Number) as number,
        source_name: 'Cleric 3',
        order_name: 'Divine Order',
        options: ['Protector', 'Thaumaturge'],
      },
    ]);
  });

  it('reports a class-less character and its feat choices together', async () => {
    const db = await context();
    const definitionId = seedMagicInitiate(db);
    const characterId = createCharacter(db, 'Class-less');
    listSpell(db, 'Guidance', 0, 'Cleric');
    listSpell(db, 'Bless', 1, 'Cleric');
    addMagicInitiate(db, characterId, definitionId, 'Cleric');

    const result = new CharacterCompletenessQueries(db).build(characterId);

    expect(result.items.map((item) => item.title)).toEqual([
      'No class added yet',
      'Magic Initiate: Cleric — 0 of 2 cantrips chosen',
      'Magic Initiate: Cleric — 0 of 1 known spells chosen',
    ]);
    expect(result.catalog_gaps).toEqual([]);
    expect(result.outstanding_count).toBe(3);
  });

  it('reports only the missing class on a database with no seeded content', async () => {
    const db = await context({ seedClasses: false });
    const characterId = createCharacter(db, 'Fresh Install');

    expect(new CharacterCompletenessQueries(db).build(characterId)).toEqual({
      character_id: characterId,
      outstanding_count: 1,
      catalog_gap_count: 0,
      items: [
        {
          kind: 'no_class',
          title: 'No class added yet',
          detail:
            'This character has no class levels, so no class spellcasting is set up.',
          remedy:
            'Use Add source in the planner to add a class and its level.',
        },
      ],
      catalog_gaps: [],
    });
  });

  it('counts every character in list order without building a report', async () => {
    const db = await context();
    const definitionId = seedMagicInitiate(db);
    const busy = createCharacter(db, 'Busy');
    addClassLevel(db, busy, 'Wizard', 1);
    listSpell(db, 'Prestidigitation', 0, 'Wizard');
    addMagicInitiate(db, busy, definitionId, 'Wizard');
    const bare = createCharacter(db, 'Absent');

    expect(new CharacterCompletenessQueries(db).counts()).toEqual([
      { character_id: bare, outstanding_count: 1, catalog_gap_count: 0 },
      { character_id: busy, outstanding_count: 1, catalog_gap_count: 1 },
    ]);
  });
});
