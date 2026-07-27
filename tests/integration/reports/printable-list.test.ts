import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  PrintableSpellListBuilder,
  type PrintableSourceGroup,
  type PrintableSpellList,
  type PrintableUnpreparedSection,
} from '../../../src/reports/printable-spell-list-builder';
import { openTestDatabase } from '../../helpers/open-db';
import {
  createPrintableListFixture,
  persistedPrintableTableHashes,
  type PrintableListFixture,
} from './printable-list-fixture';

function source(
  spellList: PrintableSpellList,
  sourceName: string,
): PrintableSourceGroup {
  const group = spellList.source_groups.find(
    (candidate) => candidate.source === sourceName,
  );
  if (group === undefined) {
    throw new Error(`Missing printable source ${sourceName}.`);
  }
  return group;
}

function section(
  spellList: PrintableSpellList,
  className: string,
): PrintableUnpreparedSection {
  const match = spellList.unprepared_sections.find(
    (candidate) => candidate.class_name === className,
  );
  if (match === undefined) {
    throw new Error(`Missing ${className} long-rest section.`);
  }
  return match;
}

function displayedDescriptions(
  spellList: PrintableSpellList,
): Array<string | null> {
  return [
    ...spellList.source_groups.flatMap((group) =>
      group.spells.map((spell) => spell.description),
    ),
    ...spellList.unprepared_sections.flatMap((candidate) =>
      candidate.spells.map((spell) => spell.description),
    ),
  ];
}

describe('deterministic printable spell-list data', () => {
  let connection: Database;
  let db: DatabaseContext;
  let fixture: PrintableListFixture;
  let builder: PrintableSpellListBuilder;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    fixture = createPrintableListFixture(db);
    builder = new PrintableSpellListBuilder(db);
  });

  afterEach(() => {
    connection.close();
  });

  it('groups persisted routes naturally with complete facts, relevant stats, and free-cast modes', () => {
    expect(
      db.allRaw(
        `SELECT source.display_name, slot.with_slots, slot.free_cast,
                slot.current_spell_version_id, slot.fixed_spell_version_id
         FROM spell_selection_slots AS slot
         INNER JOIN character_source_instances AS source
           ON source.id = slot.source_instance_id
         WHERE slot.id IN (?, ?, ?, ?, ?)
         ORDER BY source.display_name`,
        [
          fixture.slotIds.command,
          fixture.slotIds.faerieFire,
          fixture.slotIds.mistyStep,
          fixture.slotIds.shield,
          fixture.slotIds.thornWhip,
        ],
      ),
    ).toEqual([
      {
        display_name: 'Cleric 1',
        with_slots: 1,
        free_cast: null,
        current_spell_version_id: fixture.spellIds.command,
        fixed_spell_version_id: null,
      },
      {
        display_name: 'Druid 1',
        with_slots: 0,
        free_cast: null,
        current_spell_version_id: fixture.spellIds.thornWhip,
        fixed_spell_version_id: null,
      },
      {
        display_name: 'Gift 10',
        with_slots: 0,
        free_cast: JSON.stringify({
          uses: 2,
          recovery: 'dawn',
          pool_scope: 'shared',
        }),
        current_spell_version_id: null,
        fixed_spell_version_id: fixture.spellIds.faerieFire,
      },
      {
        display_name: 'Gift 2',
        with_slots: 1,
        free_cast: JSON.stringify({
          uses: 1,
          recovery: 'long_rest',
          pool_scope: 'per_spell',
        }),
        current_spell_version_id: null,
        fixed_spell_version_id: fixture.spellIds.mistyStep,
      },
      {
        display_name: 'Wizard 1',
        with_slots: 1,
        free_cast: null,
        current_spell_version_id: fixture.spellIds.shield,
        fixed_spell_version_id: null,
      },
    ]);
    const before = persistedPrintableTableHashes(db, fixture.characterId);
    const spellList = builder.build(fixture.characterId);
    const commandIdentityId = Number(
      db.scalar(
        `SELECT spell_identity_id
         FROM spell_versions
         WHERE id = ?`,
        [fixture.spellIds.command],
      ),
    );

    expect(builder.build(fixture.characterId)).toEqual(spellList);
    expect(persistedPrintableTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
    expect(spellList.variant).toBe('reference');
    expect(spellList.text_status).toBe('not_requested');
    expect(spellList.source_groups.map((group) => group.source)).toEqual([
      'Cleric 1',
      'Druid 1',
      'Gift 2',
      'Gift 10',
      'Wizard 1',
    ]);

    expect(source(spellList, 'Cleric 1')).toMatchObject({
      ability: 'wisdom',
      attack_bonus: 4,
      save_dc: 12,
    });
    expect(source(spellList, 'Druid 1')).toMatchObject({
      ability: 'wisdom',
      attack_bonus: 4,
      save_dc: 12,
    });
    expect(source(spellList, 'Gift 2')).toMatchObject({
      ability: 'charisma',
      attack_bonus: 6,
      save_dc: 14,
    });
    expect(source(spellList, 'Gift 10')).toMatchObject({
      ability: 'charisma',
      attack_bonus: 6,
      save_dc: 14,
    });
    expect(source(spellList, 'Wizard 1')).toMatchObject({
      ability: 'intelligence',
      attack_bonus: 5,
      save_dc: 13,
    });

    expect(source(spellList, 'Cleric 1').spells[0]).toMatchObject({
      spell_version_id: fixture.spellIds.command,
      spell_identity_id: commandIdentityId,
      name: 'Command',
      edition: '2024',
      level: 1,
      school: 'Enchantment',
      casting_time: 'Action',
      action_type: 'Action',
      range: '60 feet',
      duration: '1 round',
      concentration: false,
      ritual: false,
      components: 'V',
      spellcasting_ability: 'wisdom',
      attack_bonus: null,
      save_dc: 12,
      attack_modes: [],
      save_abilities: ['wisdom'],
      casting_mode: 'with_slots',
      description: null,
    });
    expect(source(spellList, 'Druid 1').spells[0]).toMatchObject({
      name: 'Thorn Whip',
      action_type: 'Bonus Action',
      spellcasting_ability: 'wisdom',
      attack_bonus: 4,
      save_dc: null,
      attack_modes: ['melee_spell', 'ranged_spell'],
      save_abilities: [],
      casting_mode: 'at_will',
    });
    expect(source(spellList, 'Gift 2').spells[0]).toMatchObject({
      name: 'Misty Step',
      casting_mode: 'slots_and_free_cast',
      spellcasting_ability: 'charisma',
      attack_bonus: null,
      save_dc: null,
    });
    expect(source(spellList, 'Gift 10').spells[0]).toMatchObject({
      name: 'Faerie Fire',
      casting_mode: 'free_cast_only',
      spellcasting_ability: 'charisma',
      attack_bonus: null,
      save_dc: 14,
    });
    expect(source(spellList, 'Wizard 1').spells[0]).toMatchObject({
      name: 'Detect Magic',
      action_type: 'Action',
      concentration: true,
      ritual: true,
      casting_mode: 'ritual_only',
      attack_bonus: null,
      save_dc: null,
    });
  });

  it('builds exact persisted Cleric, Druid, and Wizard long-rest swaps without cantrips', () => {
    expect(
      db.allRaw(
        `SELECT version.display_name, version.level, version.rules_edition,
                version.is_active, membership.spell_list_key
         FROM spell_list_memberships AS membership
         INNER JOIN spell_versions AS version
           ON version.id = membership.spell_version_id
         WHERE membership.spell_list_key IN ('Cleric', 'Druid', 'Wizard')
         ORDER BY membership.spell_list_key, version.display_name`,
      ),
    ).toContainEqual({
      display_name: 'Guidance',
      level: 0,
      rules_edition: '2024',
      is_active: 1,
      spell_list_key: 'Cleric',
    });
    const spellList = builder.build(fixture.characterId);
    const cleric = section(spellList, 'Cleric');
    const druid = section(spellList, 'Druid');
    const wizard = section(spellList, 'Wizard');

    expect(spellList.unprepared_sections.map((item) => item.class_name)).toEqual(
      ['Cleric', 'Druid', 'Wizard'],
    );
    expect(cleric).toMatchObject({
      title:
        'Cleric — not prepared (available to swap in on a long rest)',
      ability: 'wisdom',
      max_level: 1,
      cantrip_note:
        'Unprepared cantrips are not listed because cantrips cannot be swapped on a long rest.',
    });
    expect(cleric.spells.map((spell) => spell.name)).toEqual(['Bless']);
    expect(druid.spells.map((spell) => spell.name)).toEqual(['Goodberry']);
    expect(wizard.spells.map((spell) => spell.name)).toEqual([
      'Alarm',
      'Detect Magic',
      'Unseen Servant',
    ]);
    expect(
      spellList.unprepared_sections.flatMap((item) =>
        item.spells.map((spell) => spell.level),
      ),
    ).toEqual([1, 1, 1, 1, 1]);
    expect(
      spellList.unprepared_sections.flatMap((item) =>
        item.spells.map((spell) => spell.casting_mode),
      ),
    ).toEqual([
      'available_on_long_rest',
      'available_on_long_rest',
      'available_on_long_rest',
      'available_on_long_rest',
      'available_on_long_rest',
    ]);
    expect(cleric.spells.map((spell) => spell.name)).not.toContain(
      'Command',
    );
    expect(druid.spells.map((spell) => spell.name)).not.toContain(
      'Thorn Whip',
    );
    expect(wizard.spells.map((spell) => spell.name)).not.toContain(
      'Shield',
    );
  });

  it('preserves persisted Wizard book, prepared, and ritual-only states and explanation', () => {
    expect(
      db.allRaw(
        `SELECT entry.id, version.display_name, version.ritual
         FROM wizard_spellbook_entries AS entry
         INNER JOIN spell_versions AS version
           ON version.id = entry.spell_version_id
         WHERE entry.character_id = ?
         ORDER BY version.display_name`,
        [fixture.characterId],
      ),
    ).toEqual([
      {
        id: expect.any(Number),
        display_name: 'Detect Magic',
        ritual: 0,
      },
      {
        id: expect.any(Number),
        display_name: 'Shield',
        ritual: 0,
      },
      {
        id: expect.any(Number),
        display_name: 'Unseen Servant',
        ritual: 0,
      },
    ]);
    expect(
      db.allRaw(
        `SELECT tag
         FROM spell_version_tags
         WHERE spell_version_id = ?
         ORDER BY tag`,
        [fixture.spellIds.detectMagic],
      ),
    ).toEqual([{ tag: 'concentration' }, { tag: 'ritual' }]);

    const wizard = builder.build(fixture.characterId).wizard;
    expect(wizard.spellbook.map((entry) => entry.spell_name)).toEqual([
      'Detect Magic',
      'Shield',
      'Unseen Servant',
    ]);
    expect(wizard.spellbook.map((entry) => entry.prepared)).toEqual([
      false,
      true,
      false,
    ]);
    expect(wizard.prepared.map((entry) => entry.spell_name)).toEqual([
      'Shield',
    ]);
    expect(wizard.ritual_only.map((entry) => entry.spell_name)).toEqual([
      'Detect Magic',
    ]);
    for (const phrase of [
      '“In my book” marks only the spells that Ritual Adept can expose',
      'does not constrain Wizard preparation',
      'not the same as labeling a spell known or prepared',
      'whole Wizard spell list',
      'both in the book and as prepared',
      'ritual-only access',
      'that route is not a selection',
      'consumes no preparation capacity',
      'ignored by duplicate-waste checks',
      'Unprepared non-ritual book spells are not castable.',
    ]) {
      expect(wizard.explanation).toContain(phrase);
    }
  });

  it('degrades full mode to partial or unavailable from persisted description completeness', () => {
    expect(
      db.oneRaw(
        `SELECT short_summary
         FROM spell_versions
         WHERE id = ?`,
        [fixture.spellIds.goodberry],
      ),
    ).toEqual({ short_summary: null });
    const partial = builder.build(fixture.characterId, true);
    expect(partial.variant).toBe('full');
    expect(partial.text_status).toBe('partial');
    expect(
      section(partial, 'Druid').spells.find(
        (spell) => spell.name === 'Goodberry',
      )?.description,
    ).toBeNull();
    expect(
      source(partial, 'Cleric 1').spells[0]?.description,
    ).toBe('A one-word supernatural command.');

    db.exec('UPDATE spell_versions SET short_summary = NULL');
    expect(
      db.scalar<number>(
        `SELECT COUNT(*)
         FROM spell_versions
         WHERE short_summary IS NOT NULL`,
      ),
    ).toBe(0);
    const unavailable = builder.build(fixture.characterId, true);
    expect(unavailable.text_status).toBe('unavailable');
    expect(displayedDescriptions(unavailable).every((text) => text === null)).toBe(
      true,
    );
  });

  it('includes complete persisted text only in full mode and never leaks it into reference data', () => {
    db.exec(
      `UPDATE spell_versions
       SET short_summary = 'Complete test-only rules text.'`,
    );
    expect(
      db.scalar<number>(
        `SELECT COUNT(DISTINCT short_summary)
         FROM spell_versions`,
      ),
    ).toBe(1);
    const reference = builder.build(fixture.characterId);
    const full = builder.build(fixture.characterId, true);

    expect(reference.variant).toBe('reference');
    expect(reference.text_status).toBe('not_requested');
    expect(
      displayedDescriptions(reference).every((text) => text === null),
    ).toBe(true);
    expect(full.variant).toBe('full');
    expect(full.text_status).toBe('available');
    expect(new Set(displayedDescriptions(full))).toEqual(
      new Set(['Complete test-only rules text.']),
    );
  });
});
