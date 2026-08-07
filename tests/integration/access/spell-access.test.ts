import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import { DatabaseContext } from '../../../src/db/database';
import type { SlotBucket } from '../../../src/domain/enums';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';
import { applicationSeed } from '../../../src/db/bootstrap';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';

interface SpellOptions {
  readonly level?: number;
  readonly ritual?: boolean;
  readonly ritualTag?: boolean;
  readonly active?: boolean;
  readonly lists?: readonly string[];
}

interface SlotOptions {
  readonly bucket?: SlotBucket;
  readonly fixed?: boolean;
  readonly withSlots?: boolean;
  readonly freeCast?: Readonly<Record<string, unknown>> | null;
  readonly state?: 'active' | 'kept_override';
  readonly eligibility?: 'valid' | 'invalid' | 'unselected';
  readonly lists?: readonly string[];
}

describe('persisted spell access routes', () => {
  let connection: Database;
  let db: DatabaseContext;
  let builder: SpellAccessBuilder;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    builder = new SpellAccessBuilder(db);
  });

  afterEach(() => {
    connection.close();
  });

  function character(
    name = 'Access Character',
    scores: Partial<
      Record<
        | 'strength'
        | 'dexterity'
        | 'constitution'
        | 'intelligence'
        | 'wisdom'
        | 'charisma',
        number
      >
    > = {},
    proficiencyOverride: number | null = null,
  ): number {
    return db.exec(
      `INSERT INTO characters (
         name, strength, dexterity, constitution, intelligence, wisdom,
         charisma, proficiency_bonus_override
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        scores.strength ?? 10,
        scores.dexterity ?? 10,
        scores.constitution ?? 10,
        scores.intelligence ?? 10,
        scores.wisdom ?? 10,
        scores.charisma ?? 10,
        proficiencyOverride,
      ],
    ).lastInsertId;
  }

  function spell(
    key: string,
    name: string,
    options: SpellOptions = {},
  ): number {
    registerFixtureContentIdentity(db, {
      kind: 'spell', contentKey: key, name, keyKind: 'bundled-stable',
    });
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES (?, ?, ?)`,
      [`identity:${key}`, name, name.toLowerCase()],
    ).lastInsertId;
    const versionId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, ritual, is_active
       ) VALUES (?, ?, ?, '2024', ?, 'Abjuration', ?, ?)`,
      [
        key,
        identityId,
        name,
        options.level ?? 1,
        options.ritual === true ? 1 : 0,
        options.active === false ? 0 : 1,
      ],
    ).lastInsertId;
    for (const list of options.lists ?? []) {
      db.exec(
        `INSERT INTO spell_list_memberships
           (spell_version_id, spell_list_key)
         VALUES (?, ?)`,
        [versionId, list],
      );
    }
    if (options.ritualTag === true) {
      db.exec(
        `INSERT INTO spell_version_tags (spell_version_id, tag)
         VALUES (?, 'ritual')`,
        [versionId],
      );
    }
    return versionId;
  }

  function featDefinition(
    name: string,
    rules: readonly Record<string, unknown>[] = [],
  ): number {
    const contentKey = `feat:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey, name, keyKind: 'bundled-stable',
    });
    return db.exec(
      `INSERT INTO feat_definitions
         (content_key, name, rules_edition, grant_rules)
       VALUES (?, ?, '2024', ?)`,
      [contentKey, name, JSON.stringify(rules)],
    ).lastInsertId;
  }

  function classDefinition(
    name: string,
    ability: string | null,
    rules: readonly Record<string, unknown>[] = [],
  ): number {
    const contentKey = `class:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey, name, keyKind: 'bundled-stable',
    });
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, spellcasting_ability,
         progression_type
       ) VALUES (?, ?, '2024', ?, 'full')`,
      [contentKey, name, ability],
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_progressions
         (class_definition_id, class_level, grant_rules)
       VALUES (?, 1, ?)`,
      [classId, JSON.stringify(rules)],
    );
    return classId;
  }

  function subclassDefinition(
    classId: number,
    name: string,
    ability: string | null,
  ): number {
    const contentKey = `subclass:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey, name, keyKind: 'bundled-stable',
    });
    return db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         spellcasting_ability
       ) VALUES (?, ?, ?, '2024', ?)`,
      [contentKey, classId, name, ability],
    ).lastInsertId;
  }

  function source(
    characterId: number,
    sourceType: 'class' | 'subclass' | 'feat',
    definitionId: number,
    name: string,
    config: Readonly<Record<string, unknown>> = {},
    state: 'active' | 'tombstoned' = 'active',
  ): number {
    return db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, state
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        crypto.randomUUID(),
        sourceType,
        definitionId,
        name,
        JSON.stringify(config),
        state,
      ],
    ).lastInsertId;
  }

  function classLevel(
    characterId: number,
    classId: number,
    level: number,
  ): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level)
       VALUES (?, ?, ?)`,
      [characterId, classId, level],
    );
  }

  function slot(
    characterId: number,
    sourceId: number,
    versionId: number,
    key: string,
    options: SlotOptions = {},
  ): number {
    const fixed = options.fixed === true;
    return db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key, ordinal,
         bucket, eligibility_kind, fixed_spell_version_id,
         current_spell_version_id, spell_level_min, spell_level_max,
         allowed_spell_lists, with_slots, free_cast,
         counts_against_limit, state, selection_eligibility
       ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, 0, 9, ?, ?, ?, 1, ?, ?)`,
      [
        characterId,
        sourceId,
        key,
        key,
        options.bucket ?? 'known',
        fixed ? 'fixed_spell' : 'choice_from_list',
        fixed ? versionId : null,
        fixed ? null : versionId,
        options.lists === undefined
          ? null
          : JSON.stringify(options.lists),
        options.withSlots === false ? 0 : 1,
        options.freeCast === undefined || options.freeCast === null
          ? null
          : JSON.stringify(options.freeCast),
        options.state ?? 'active',
        options.eligibility ?? 'valid',
      ],
    ).lastInsertId;
  }

  function persistedAccessState(characterId: number): {
    slots: unknown[];
    sources: unknown[];
    entries: unknown[];
    versions: unknown[];
  } {
    return {
      slots: db.allRaw(
        `SELECT * FROM spell_selection_slots
         WHERE character_id = ? ORDER BY id`,
        [characterId],
      ),
      sources: db.allRaw(
        `SELECT * FROM character_source_instances
         WHERE character_id = ? ORDER BY id`,
        [characterId],
      ),
      entries: db.allRaw(
        `SELECT * FROM wizard_spellbook_entries
         WHERE character_id = ? ORDER BY id`,
        [characterId],
      ),
      versions: db.allRaw(
        `SELECT version.*
         FROM spell_versions AS version
         WHERE version.id IN (
           SELECT fixed_spell_version_id FROM spell_selection_slots
           WHERE character_id = ?
           UNION
           SELECT current_spell_version_id FROM spell_selection_slots
           WHERE character_id = ?
           UNION
           SELECT spell_version_id FROM wizard_spellbook_entries
           WHERE character_id = ?
         )
         ORDER BY version.id`,
        [characterId, characterId, characterId],
      ),
    };
  }

  it('builds no routes without a class and resumes exact level math once one exists', () => {
    const characterId = character('Class precondition', {
      intelligence: 16,
    });
    const featId = featDefinition('Classless spell holder');
    const sourceId = source(
      characterId,
      'feat',
      featId,
      'Classless spell holder',
      { spellcasting_ability: 'intelligence' },
    );
    const versionId = spell('2024:classless-route', 'Classless Route');
    slot(characterId, sourceId, versionId, 'classless:1');

    expect(builder.buildForCharacter(characterId)).toEqual([]);

    const fighterId = classDefinition('Fighter', null);
    classLevel(characterId, fighterId, 3);
    expect(builder.buildForCharacter(characterId)).toEqual([
      expect.objectContaining({
        spell_version_id: versionId,
        attack_bonus: 5,
        save_dc: 13,
      }),
    ]);
  });

  it('B2-DC resolves casting contributions inside the spell-access calculation', () => {
    const characterId = character('Contributed casting', {
      intelligence: 15,
    });
    const wizardId = classDefinition('Contribution Wizard', 'intelligence');
    classLevel(characterId, wizardId, 3);
    const wizardSourceId = source(
      characterId,
      'class',
      wizardId,
      'Contribution Wizard 3',
    );
    const versionId = spell(
      '2024:contributed-casting',
      'Contributed Casting',
    );
    slot(
      characterId,
      wizardSourceId,
      versionId,
      'contributed-casting:1',
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (
         ?, 1, 'ability_increase', 'intelligence', 2, 20, ?,
         'Arcane training'
       )`,
      [characterId, wizardSourceId],
    );

    const [route] = builder.buildForCharacter(characterId);

    // Base 15 is +2; the contribution resolves 17 to +3. Character level 3
    // supplies proficiency +2, so spell access must expose +5 and DC 13.
    expect(route?.ability_modifier).toBe(3);
    expect(route?.attack_bonus).toBe(5);
    expect(route?.save_dc).toBe(13);
  });

  it('builds every slot casting mode with fixed/selected provenance and source ability math', () => {
    const characterId = character('Casting Math', {
      intelligence: 18,
      wisdom: 14,
    });
    const wizardId = classDefinition('Wizard', 'intelligence');
    classLevel(characterId, wizardId, 5);
    const wizardSourceId = source(
      characterId,
      'class',
      wizardId,
      'Wizard 5',
    );
    const configuredFeatId = featDefinition('Wise Magic');
    const configuredSourceId = source(
      characterId,
      'feat',
      configuredFeatId,
      'Wise Magic',
      { spellcasting_ability: 'WISDOM' },
    );

    const atWillId = spell('2024:a-at-will', 'A At Will', { level: 0 });
    const freeOnlyId = spell('2024:b-free-only', 'B Free Only');
    const grantedId = spell('2024:c-granted', 'C Granted');
    const slotsAndFreeId = spell(
      '2024:d-slots-and-free',
      'D Slots And Free',
    );
    const preparedId = spell('2024:e-prepared', 'E Prepared');
    const knownId = spell('2024:f-known', 'F Known');

    const atWillSlotId = slot(
      characterId,
      wizardSourceId,
      atWillId,
      'wizard:cantrip:1',
      {
        fixed: true,
        bucket: 'automatic',
        withSlots: false,
        freeCast: {
          uses: 1,
          recovery: 'long_rest',
          pool_scope: 'per_spell',
        },
      },
    );
    const freeOnlySlotId = slot(
      characterId,
      wizardSourceId,
      freeOnlyId,
      'wizard:free:1',
      {
        fixed: true,
        bucket: 'automatic',
        withSlots: false,
        freeCast: {
          uses: 1,
          recovery: 'long_rest',
          pool_scope: 'per_spell',
        },
      },
    );
    const grantedSlotId = slot(
      characterId,
      wizardSourceId,
      grantedId,
      'wizard:grant:1',
      {
        fixed: true,
        bucket: 'automatic',
        withSlots: false,
      },
    );
    const slotsAndFreeSlotId = slot(
      characterId,
      wizardSourceId,
      slotsAndFreeId,
      'wizard:known:1',
      {
        bucket: 'known',
        freeCast: {
          uses: 2,
          recovery: 'short_rest',
          pool_scope: 'shared',
        },
      },
    );
    const preparedSlotId = slot(
      characterId,
      wizardSourceId,
      preparedId,
      'wizard:prepared:1',
      { bucket: 'prepared' },
    );
    const knownSlotId = slot(
      characterId,
      configuredSourceId,
      knownId,
      'feat:known:1',
      { bucket: 'known' },
    );
    const before = persistedAccessState(characterId);

    const routes = builder.buildForCharacter(characterId);

    expect(
      routes.map((route) => [
        route.spell_name,
        route.casting_mode,
        route.bucket,
        route.slot_id === null ? null : route.slot_key,
      ]),
    ).toEqual([
      ['A At Will', 'at_will', 'automatic', 'wizard:cantrip:1'],
      ['B Free Only', 'free_cast_only', 'automatic', 'wizard:free:1'],
      ['C Granted', 'granted', 'automatic', 'wizard:grant:1'],
      ['D Slots And Free', 'slots_and_free_cast', 'known', 'wizard:known:1'],
      ['E Prepared', 'with_slots', 'prepared', 'wizard:prepared:1'],
      ['F Known', 'with_slots', 'known', 'feat:known:1'],
    ]);
    expect(
      routes.map((route) => ({
        spellVersionId: route.spell_version_id,
        sourceInstanceId: route.source_instance_id,
        slotId: route.slot_id,
        slotKey: route.slot_key,
        selectionKey: route.selection_key,
      })),
    ).toEqual([
      {
        spellVersionId: atWillId,
        sourceInstanceId: wizardSourceId,
        slotId: atWillSlotId,
        slotKey: 'wizard:cantrip:1',
        selectionKey: 'wizard:cantrip:1',
      },
      {
        spellVersionId: freeOnlyId,
        sourceInstanceId: wizardSourceId,
        slotId: freeOnlySlotId,
        slotKey: 'wizard:free:1',
        selectionKey: 'wizard:free:1',
      },
      {
        spellVersionId: grantedId,
        sourceInstanceId: wizardSourceId,
        slotId: grantedSlotId,
        slotKey: 'wizard:grant:1',
        selectionKey: 'wizard:grant:1',
      },
      {
        spellVersionId: slotsAndFreeId,
        sourceInstanceId: wizardSourceId,
        slotId: slotsAndFreeSlotId,
        slotKey: 'wizard:known:1',
        selectionKey: 'wizard:known:1',
      },
      {
        spellVersionId: preparedId,
        sourceInstanceId: wizardSourceId,
        slotId: preparedSlotId,
        slotKey: 'wizard:prepared:1',
        selectionKey: 'wizard:prepared:1',
      },
      {
        spellVersionId: knownId,
        sourceInstanceId: configuredSourceId,
        slotId: knownSlotId,
        slotKey: 'feat:known:1',
        selectionKey: 'feat:known:1',
      },
    ]);
    expect(
      routes.slice(0, 5).map((route) => ({
        ability: route.spellcasting_ability,
        modifier: route.ability_modifier,
        attack: route.attack_bonus,
        dc: route.save_dc,
        origin: route.origin,
        selection: route.is_selection,
      })),
    ).toEqual(
      Array.from({ length: 5 }, () => ({
        ability: 'intelligence',
        modifier: 4,
        attack: 7,
        dc: 15,
        origin: 'slot',
        selection: true,
      })),
    );
    expect(routes[5]).toMatchObject({
      spellcasting_ability: 'wisdom',
      ability_modifier: 2,
      attack_bonus: 5,
      save_dc: 13,
    });
    expect(routes[3]!.free_cast).toEqual({
      uses: 2,
      recovery: 'short_rest',
      pool_scope: 'shared',
    });
    expect(routes[0]!.free_cast).toEqual({
      uses: 1,
      recovery: 'long_rest',
      pool_scope: 'per_spell',
    });
    expect(persistedAccessState(characterId)).toEqual(before);
  });

  // Measured alone at 2.1s; 20s retains contention headroom.
  it('resolves the published Spell Student ability and proficiency override', () => {
    applicationSeed(db);
    const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
      (entry) => entry.catalog_key === 'spell-student',
    );
    const plan = planBundledHomebrewInstall(db, catalog);
    expect(commitBundledHomebrewInstall(db, plan.token, catalog)).toMatchObject({
      kind: 'committed',
      outcomes: [{ kind: 'create', contentKey: '2024:content.subclass:spell-student' }],
    });
    const characterId = character(
      'Subclass Caster',
      { intelligence: 14 },
      5,
    );
    const fighterId = Number(db.scalar(
      `SELECT id FROM class_definitions WHERE content_key = '2024:class:fighter'`,
    ));
    classLevel(characterId, fighterId, 3);
    const subclassId = Number(db.scalar(
      `SELECT id FROM subclass_definitions
        WHERE content_key = '2024:content.subclass:spell-student'`,
    ));
    const sourceId = source(
      characterId,
      'subclass',
      subclassId,
      'Spell Student 3',
    );
    const versionId = spell('2024:subclass-spell', 'Subclass Spell');
    const slotId = slot(
      characterId,
      sourceId,
      versionId,
      'spell-student:known:1',
    );
    const before = persistedAccessState(characterId);

    expect(builder.buildForCharacter(characterId)).toEqual([
      expect.objectContaining({
        spell_version_id: versionId,
        source_instance_id: sourceId,
        slot_id: slotId,
        spellcasting_ability: 'intelligence',
        ability_modifier: 2,
        attack_bonus: 7,
        save_dc: 15,
      }),
    ]);
    expect(
      db.oneRaw(
        `SELECT source.source_type, source.source_definition_id,
                subclass.spellcasting_ability,
                character.proficiency_bonus_override
         FROM character_source_instances AS source
         INNER JOIN subclass_definitions AS subclass
           ON subclass.id = source.source_definition_id
         INNER JOIN characters AS character
           ON character.id = source.character_id
         WHERE source.id = ?`,
        [sourceId],
      ),
    ).toEqual({
      source_type: 'subclass',
      source_definition_id: subclassId,
      spellcasting_ability: 'intelligence',
      proficiency_bonus_override: 5,
    });
    expect(persistedAccessState(characterId)).toEqual(before);
  }, 20_000);

  it('evaluates ordinary routes live, lets kept overrides bypass source and eligibility, but never inactive versions', () => {
    const characterId = character();
    const classId = classDefinition('Override Route Class', null);
    classLevel(characterId, classId, 1);
    const definitionId = featDefinition('Override Feat');
    const activeSourceId = source(
      characterId,
      'feat',
      definitionId,
      'Active Source',
      { spellcasting_ability: 'charisma' },
    );
    const tombstonedSourceId = source(
      characterId,
      'feat',
      definitionId,
      'Removed Source',
      { spellcasting_ability: 'charisma' },
      'tombstoned',
    );
    const versionId = spell('2024:override', 'Override Spell', {
      level: 0,
      lists: ['Wizard'],
    });
    const staleOrdinaryId = slot(
      characterId,
      activeSourceId,
      versionId,
      'active:stale:1',
      {
        lists: ['Cleric'],
        eligibility: 'valid',
      },
    );
    const ordinaryRemovedId = slot(
      characterId,
      tombstonedSourceId,
      versionId,
      'removed:ordinary:1',
    );
    const overrideId = slot(
      characterId,
      tombstonedSourceId,
      versionId,
      'removed:override:1',
      {
        state: 'kept_override',
        lists: ['Cleric'],
        eligibility: 'valid',
      },
    );

    expect(
      builder.buildForCharacter(characterId).map((route) => route.slot_id),
    ).toEqual([overrideId]);
    expect(
      db.allRaw(
        `SELECT id, state, selection_eligibility
         FROM spell_selection_slots
         WHERE character_id = ? ORDER BY id`,
        [characterId],
      ),
    ).toEqual([
      {
        id: staleOrdinaryId,
        state: 'active',
        selection_eligibility: 'valid',
      },
      {
        id: ordinaryRemovedId,
        state: 'active',
        selection_eligibility: 'valid',
      },
      {
        id: overrideId,
        state: 'kept_override',
        selection_eligibility: 'valid',
      },
    ]);

    db.exec('UPDATE spell_versions SET is_active = 0 WHERE id = ?', [
      versionId,
    ]);

    expect(builder.buildForCharacter(characterId)).toEqual([]);
    expect(
      db.oneRaw(
        `SELECT is_active FROM spell_versions WHERE id = ?`,
        [versionId],
      ),
    ).toEqual({ is_active: 0 });
    expect(
      db.oneRaw(
        `SELECT current_spell_version_id, state, selection_eligibility
         FROM spell_selection_slots WHERE id = ?`,
        [overrideId],
      ),
    ).toEqual({
      current_spell_version_id: versionId,
      state: 'kept_override',
      selection_eligibility: 'valid',
    });
  });

  it('adds one live Wizard ritual capability route for an unprepared active spellbook ritual', () => {
    const characterId = character('Ritual Wizard', {
      intelligence: 16,
    });
    const capability = {
      kind: 'capability',
      rule_key: 'ritual-adept',
      capability_key: 'wizard-ritual-adept',
      collection: 'wizard_spellbook',
      tags: ['ritual'],
      access_mode: 'ritual_only',
    };
    const wizardId = classDefinition('Wizard', 'intelligence', [
      capability,
    ]);
    classLevel(characterId, wizardId, 3);
    const wizardSourceId = source(
      characterId,
      'class',
      wizardId,
      'Wizard 3',
    );
    const secondCapabilityId = featDefinition('Second Ritual Source', [
      capability,
    ]);
    source(
      characterId,
      'feat',
      secondCapabilityId,
      'Second Ritual Source',
      { spellcasting_ability: 'wisdom' },
    );
    const clericId = classDefinition('Cleric', 'wisdom');
    classLevel(characterId, clericId, 1);
    const clericSourceId = source(
      characterId,
      'class',
      clericId,
      'Cleric 1',
    );

    const preparedId = spell(
      '2024:prepared-ritual',
      'Prepared Ritual',
      { ritual: true },
    );
    const taggedRitualId = spell(
      '2024:tagged-ritual',
      'Tagged Ritual',
      { ritualTag: true },
    );
    const ordinaryId = spell('2024:ordinary-book', 'Ordinary Book Spell');
    const inactiveId = spell(
      '2024:inactive-ritual',
      'Inactive Ritual',
      { ritual: true, active: false },
    );
    const preparedSlotId = slot(
      characterId,
      wizardSourceId,
      preparedId,
      'wizard:prepared:1',
      { bucket: 'prepared' },
    );
    const clericSlotId = slot(
      characterId,
      clericSourceId,
      taggedRitualId,
      'cleric:prepared:1',
      { bucket: 'prepared' },
    );
    const spellbookEntryIds = new Map<number, number>();
    for (const versionId of [
      preparedId,
      taggedRitualId,
      ordinaryId,
      inactiveId,
    ]) {
      const entryId = db.exec(
        `INSERT INTO wizard_spellbook_entries
           (character_id, spell_version_id)
         VALUES (?, ?)`,
        [characterId, versionId],
      ).lastInsertId;
      spellbookEntryIds.set(versionId, entryId);
    }
    const before = persistedAccessState(characterId);

    const routes = builder.buildForCharacter(characterId);
    const ritualRoute = routes.find(
      (route) => route.casting_mode === 'ritual_only',
    );

    expect(routes).toHaveLength(3);
    expect(routes[0]).toMatchObject({
      spell_name: 'Prepared Ritual',
      origin: 'slot',
      slot_id: preparedSlotId,
      casting_mode: 'with_slots',
    });
    expect(ritualRoute).toMatchObject({
      spell_version_id: taggedRitualId,
      spell_name: 'Tagged Ritual',
      origin: 'capability',
      source_instance_id: wizardSourceId,
      source_name: 'Wizard 3',
      slot_id: null,
      slot_key: null,
      selection_key: null,
      bucket: null,
      casting_mode: 'ritual_only',
      spellcasting_ability: 'intelligence',
      ability_modifier: 3,
      attack_bonus: 5,
      save_dc: 13,
      is_selection: false,
      counts_against_limit: false,
      free_cast: null,
      spellbook_entry_id: spellbookEntryIds.get(taggedRitualId),
    });
    expect(
      routes.filter(
        (route) => route.spell_version_id === taggedRitualId,
      ).map((route) => [
        route.origin,
        route.casting_mode,
        route.slot_id,
      ]),
    ).toEqual([
      ['capability', 'ritual_only', null],
      ['slot', 'with_slots', clericSlotId],
    ]);
    expect(
      routes.some((route) => route.spell_version_id === ordinaryId),
    ).toBe(false);
    expect(
      routes.some((route) => route.spell_version_id === inactiveId),
    ).toBe(false);
    expect(persistedAccessState(characterId)).toEqual(before);
  });
});
