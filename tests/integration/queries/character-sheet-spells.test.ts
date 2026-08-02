import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import { DatabaseContext } from '../../../src/db/database';
import {
  CharacterSpellSectionBuilder,
  type CharacterSpellSection,
  type SheetSpellGroup,
} from '../../../src/queries/character-spell-section-builder';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { getSqlite3, openTestDatabase } from '../../helpers/open-db';
import {
  createCharacterSheetSpellsFixture,
  HAND_AUTHORED_D91_R_RESOURCE_BYTES,
  persistedCharacterSheetSpellTableHashes,
  type CharacterSheetSpellsFixture,
} from './character-sheet-spells-fixture';

function classGroup(
  section: CharacterSpellSection,
  name: string,
): Extract<SheetSpellGroup, { readonly kind: 'class' }> {
  const group = section.find(
    (candidate) => candidate.kind === 'class' && candidate.class_name === name,
  );
  if (group === undefined || group.kind !== 'class') {
    throw new Error(`Missing SS-1 class group ${name}.`);
  }
  return group;
}

function otherSourceGroup(
  section: CharacterSpellSection,
  name: string,
): Extract<SheetSpellGroup, { readonly kind: 'other_source' }> {
  const group = section.find(
    (candidate) =>
      candidate.kind === 'other_source' && candidate.source_name === name,
  );
  if (group === undefined || group.kind !== 'other_source') {
    throw new Error(`Missing SS-1 Other sources group ${name}.`);
  }
  return group;
}

function spellNames(group: SheetSpellGroup): string[] {
  return group.spells.map((spell) => spell.name);
}

function spellbookNames(
  group: Extract<SheetSpellGroup, { readonly kind: 'class' }>,
): string[] {
  return group.spellbook.map((spell) => spell.name);
}

describe('typed character spell section projection', () => {
  let sqlite3: Sqlite3Static;
  let connection: Database;
  let db: DatabaseContext;
  let fixture: CharacterSheetSpellsFixture;
  let builder: CharacterSpellSectionBuilder;

  beforeAll(async () => {
    sqlite3 = await getSqlite3();
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    fixture = createCharacterSheetSpellsFixture(db);
    builder = new CharacterSpellSectionBuilder(db);
  });

  afterAll(() => {
    connection.close();
  });

  it('sheet spells resolve nearest contributing class without inventing one', () => {
    expect(
      db.allRaw(
        `SELECT child.id, child.source_type,
                child.parent_source_instance_id,
                parent.parent_source_instance_id AS grandparent_id
         FROM character_source_instances AS child
         LEFT JOIN character_source_instances AS parent
           ON parent.id = child.parent_source_instance_id
         WHERE child.id IN (?, ?, ?, ?)
         ORDER BY child.id`,
        [
          fixture.sourceIds.cleric,
          fixture.sourceIds.wizardSubclass,
          fixture.sourceIds.classChild,
          fixture.sourceIds.standalone,
        ],
      ),
    ).toEqual([
      {
        id: fixture.sourceIds.cleric,
        source_type: 'class',
        parent_source_instance_id: null,
        grandparent_id: null,
      },
      {
        id: fixture.sourceIds.classChild,
        source_type: 'feat',
        parent_source_instance_id: expect.any(Number),
        grandparent_id: fixture.sourceIds.cleric,
      },
      {
        id: fixture.sourceIds.wizardSubclass,
        source_type: 'subclass',
        parent_source_instance_id: null,
        grandparent_id: null,
      },
      {
        id: fixture.sourceIds.standalone,
        source_type: 'feat',
        parent_source_instance_id: fixture.sourceIds.standalone,
        grandparent_id: fixture.sourceIds.standalone,
      },
    ]);

    const section = builder.build(fixture.characterId);
    expect(
      section.map((group) =>
        group.kind === 'class'
          ? ['class', group.class_name]
          : ['other_source', group.source_name],
      ),
    ).toEqual([
      ['class', 'Cleric'],
      ['class', 'Wizard'],
      ['other_source', 'Gift 10'],
    ]);

    const cleric = classGroup(section, 'Cleric');
    const wizard = classGroup(section, 'Wizard');
    const gift = otherSourceGroup(section, 'Gift 10');
    expect(cleric.class_definition_id).toBe(fixture.classIds.cleric);
    expect(wizard.class_definition_id).toBe(fixture.classIds.wizard);
    expect(gift.source_instance_id).toBe(fixture.sourceIds.standalone);
    expect(cleric.statistics).toEqual([
      {
        status: 'computed',
        ability: 'wisdom',
        save_dc: 12,
        attack_bonus: 4,
      },
    ]);
    expect(wizard.statistics).toEqual([
      {
        status: 'computed',
        ability: 'intelligence',
        save_dc: 14,
        attack_bonus: 6,
      },
    ]);
    expect(gift.statistics).toEqual([
      {
        status: 'absent',
        reason: 'spellcasting_ability_not_recorded',
        detail: 'Gift 10 has no spellcasting ability recorded.',
      },
    ]);
    expect(spellNames(cleric)).toContain('Direct Beacon');
    expect(spellNames(cleric)).toContain('Child Spark');
    expect(spellNames(wizard)).toContain('Subclass Veil');
    expect(spellNames(gift)).toEqual(['Gift Flame']);
    expect(gift.spells[0]?.reference.description).toBeNull();
  });

  it('multiclass duplicate spell preserves both class contributions', () => {
    const section = builder.build(fixture.characterId);
    const clericEchoes = classGroup(section, 'Cleric').spells.filter(
      (spell) => spell.spell_version_id === fixture.spellIds.echoWard,
    );
    const wizardEchoes = classGroup(section, 'Wizard').spells.filter(
      (spell) => spell.spell_version_id === fixture.spellIds.echoWard,
    );

    expect(clericEchoes).toHaveLength(1);
    expect(clericEchoes[0]?.marker).toBe('prepared');
    expect(wizardEchoes).toHaveLength(1);
    expect(wizardEchoes[0]?.marker).toBe('known');
    const reverseDuplicates = classGroup(section, 'Cleric').spells.filter(
      (spell) => spell.spell_version_id === fixture.spellIds.reverseWard,
    );
    expect(reverseDuplicates).toHaveLength(1);
    expect(reverseDuplicates[0]?.marker).toBe('prepared');
  });

  it('spell markers distinguish prepared, always prepared, and known access', () => {
    const section = builder.build(fixture.characterId);
    expect(
      classGroup(section, 'Cleric').spells.map((spell) => [
        spell.name,
        spell.marker,
      ]),
    ).toEqual([
      ['Child Spark', 'known'],
      ['Direct Beacon', 'known'],
      ['Echo Ward', 'prepared'],
      ['Reverse Ward', 'prepared'],
      ['A Placeholder', 'known'],
    ]);
    expect(
      classGroup(section, 'Wizard').spells.map((spell) => [
        spell.name,
        spell.marker,
      ]),
    ).toEqual([
      ['Echo Ward', 'known'],
      ['Subclass Veil', 'known'],
      ['Always Lantern', 'prepared'],
    ]);
    expect(otherSourceGroup(section, 'Gift 10').spells[0]?.marker).toBe(
      'known',
    );

    const alwaysRoute = new SpellAccessBuilder(db)
      .buildForCharacter(fixture.characterId)
      .find(
        (route) => route.spell_version_id === fixture.spellIds.alwaysLantern,
      );
    expect(alwaysRoute?.bucket).toBe('automatic');
    expect(alwaysRoute?.always_prepared).toBe(true);
  });

  it('spellbook entries project in a typed distinct bucket without Prepared or Known markers', () => {
    const section = builder.build(fixture.characterId);
    const wizard = classGroup(section, 'Wizard');

    expect(spellbookNames(wizard)).toEqual([
      'Chromatic Orb',
      'Comprehend Languages',
    ]);
    expect(wizard.spellbook).toEqual([
      expect.objectContaining({
        spell_version_id: fixture.spellIds.chromaticOrb,
        name: 'Chromatic Orb',
        level: { status: 'known', value: 1 },
      }),
      expect.objectContaining({
        spell_version_id: fixture.spellIds.comprehendLanguages,
        name: 'Comprehend Languages',
        level: { status: 'known', value: 1 },
      }),
    ]);
    expect(wizard.spellbook.every((spell) => !('marker' in spell))).toBe(true);
    expect(spellNames(wizard)).toContain('Echo Ward');
    expect(spellbookNames(wizard)).not.toContain('Echo Ward');
  });

  it('a class with no spellbook mechanic shows nothing new', () => {
    const cleric = classGroup(builder.build(fixture.characterId), 'Cleric');

    expect(cleric.spellbook).toEqual([]);
  });

  it('class spell order is level then name with unknown level last', () => {
    const section = builder.build(fixture.characterId);
    const cleric = classGroup(section, 'Cleric');
    const wizard = classGroup(section, 'Wizard');

    expect(spellNames(cleric)).toEqual([
      'Child Spark',
      'Direct Beacon',
      'Echo Ward',
      'Reverse Ward',
      'A Placeholder',
    ]);
    expect(cleric.spells.map((spell) => spell.level)).toEqual([
      { status: 'known', value: 0 },
      { status: 'known', value: 1 },
      { status: 'known', value: 1 },
      { status: 'known', value: 1 },
      { status: 'unknown', reason: 'placeholder_level' },
    ]);
    expect(spellNames(wizard)).toEqual([
      'Echo Ward',
      'Subclass Veil',
      'Always Lantern',
    ]);
  });

  it('sheet spells use evaluated current access only', () => {
    const accessRoutes = new SpellAccessBuilder(db).buildForCharacter(
      fixture.characterId,
    );
    const accessNames = accessRoutes.map((route) => route.spell_name);
    expect(accessNames).toContain('Book Only');
    expect(accessNames).toContain('Ritual Capability Only');
    expect(accessNames).toContain('A Placeholder');
    expect(accessNames).not.toContain('Invalid Active');
    expect(accessNames).not.toContain('Inactive Selection');
    expect(accessNames).not.toContain('Orphaned Selection');

    const projectedNames = builder
      .build(fixture.characterId)
      .flatMap((group) => spellNames(group));
    expect(projectedNames).toContain('A Placeholder');
    expect(projectedNames).not.toContain('Book Only');
    expect(projectedNames).not.toContain('Ritual Capability Only');
    expect(projectedNames).not.toContain('Invalid Active');
    expect(projectedNames).not.toContain('Inactive Selection');
    expect(projectedNames).not.toContain('Orphaned Selection');
  });

  it('sheet spell reference preserves stored full text bytes', () => {
    const echo = builder
      .build(fixture.characterId)
      .flatMap((group) => group.spells)
      .find(
        (spell) => spell.spell_version_id === fixture.spellIds.echoWard,
      );
    expect(echo).toEqual({
      spell_version_id: fixture.spellIds.echoWard,
      name: 'Echo Ward',
      level: { status: 'known', value: 1 },
      marker: 'prepared',
      reference: {
        edition: '2014',
        school: 'Chronomancy',
        casting_time: ' 1 Reaction\nwhen struck ',
        action_type: 'Reaction',
        range: 'Self (30-foot echo)',
        duration: 'Until dawn',
        components: 'V, S, M (silver thread)',
        concentration: true,
        ritual: false,
        upcast_levels: [2, 4],
        upcast_summary: 'One echo for each listed slot level.',
        cantrip_upgrade_levels: [5, 11, 17],
        cantrip_upgrade_summary:
          'Deliberately asymmetric imported progression.',
        attack_modes: ['melee_spell', 'ranged_spell'],
        save_abilities: ['charisma', 'wisdom'],
        description: '  First reference line.\nSecond reference line.  ',
      },
    });
  });

  it(
    'character spell projection is deterministic and byte-read-only',
    () => {
      const beforeBytes = sqlite3.capi.sqlite3_js_db_export(connection).slice();
      const beforeTables = persistedCharacterSheetSpellTableHashes(
        db,
        fixture.characterId,
      );
      const first = builder.build(fixture.characterId);
      const second = builder.build(fixture.characterId);
      const afterBytes = sqlite3.capi.sqlite3_js_db_export(connection).slice();

      expect(second).toEqual(first);
      expect(afterBytes).toEqual(beforeBytes);
      expect(
        persistedCharacterSheetSpellTableHashes(db, fixture.characterId),
      ).toEqual(beforeTables);
    },
    // Measured alone at 2.556s: hashing every persisted table is intentional.
    20_000,
  );

  it('spell section does not alter D91 resource maxima', () => {
    const sheet = new CharacterSheetBuilder(db).build(fixture.characterId);

    expect(sheet.spells).not.toEqual([]);
    expect(
      new TextEncoder().encode(JSON.stringify(sheet.resources)),
    ).toEqual(HAND_AUTHORED_D91_R_RESOURCE_BYTES);
  });
});
