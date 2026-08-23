import { afterEach, describe, expect, it } from 'vitest';
import type { DatabaseContext } from '../../../src/db/database';
import { loadExternalPartyPack } from '../../../src/vtt/party-pack';
import { StoredCharacterPartyPackExporter } from '../../../src/vtt/stored-character-party-member';
import {
  addClassLevel,
  createCharacter,
  createSlot,
  createSource,
} from '../reports/build-report-fixture';
import {
  createSeededRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

function addSpecies(
  db: DatabaseContext,
  characterId: number,
  speed: number | null = 30,
): void {
  db.exec(
    `INSERT INTO character_species (
       character_id, name, creature_type, size, base_speed_feet
     ) VALUES (?, 'Human', 'Humanoid', 'Medium', ?)`,
    [characterId, speed],
  );
}

function exportable(
  db: DatabaseContext,
  name: string,
  classes: readonly { readonly name: string; readonly level: number }[] = [
    { name: 'Fighter', level: 1 },
  ],
): number {
  const id = createCharacter(db, name, { dexterity: 14 });
  for (const heldClass of classes) {
    const classDefinitionId = addClassLevel(db, id, heldClass.name, heldClass.level);
    if (heldClass.name === 'Wizard') {
      const sourceId = createSource(
        db,
        id,
        'class',
        classDefinitionId,
        `Wizard ${String(heldClass.level)}`,
        { spellcasting_ability: 'intelligence' },
      );
      const magicMissileId = db.scalar<number>(
        `SELECT id FROM spell_versions
         WHERE display_name = 'Magic Missile'
           AND rules_edition = '2024'
           AND is_active = 1
         ORDER BY id LIMIT 1`,
      );
      if (magicMissileId === null) throw new Error('Seeded Magic Missile is missing.');
      createSlot(db, id, sourceId, magicMissileId, 'pcbridge-prepared:1', 1, {
        bucket: 'prepared',
        levelMin: 1,
        levelMax: 1,
        allowedSpellLists: ['Wizard'],
      });
    }
  }
  addSpecies(db, id);
  return id;
}

function exportedMember(db: DatabaseContext, characterId: number) {
  const result = new StoredCharacterPartyPackExporter(db).export(characterId);
  expect(result.status).toBe('exported');
  if (result.status !== 'exported') {
    throw new Error(`Export refused at ${result.refusal.field}.`);
  }
  return result.member;
}

describe('stored character party-pack bridge', () => {
  let harness: RpcHarness | null = null;

  afterEach(() => {
    harness?.close();
    harness = null;
  });

  it('multiclass_level_miscount: exports multiclass totals across adjacent caster-slot boundaries from sheet resources', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const casterLevelTwo = exportable(db, 'Caster Two', [
      { name: 'Wizard', level: 1 },
      { name: 'Cleric', level: 1 },
    ]);
    const casterLevelThree = exportable(db, 'Caster Three', [
      { name: 'Wizard', level: 2 },
      { name: 'Cleric', level: 1 },
    ]);

    const levelTwo = exportedMember(db, casterLevelTwo);
    const levelThree = exportedMember(db, casterLevelThree);

    expect(levelTwo.classes).toEqual([
      { classId: 'Cleric', level: 1 },
      { classId: 'Wizard', level: 1 },
    ]);
    expect(levelTwo.classes.reduce((total, row) => total + row.level, 0)).toBe(2);
    expect('sharedSpellSlots' in levelTwo ? levelTwo.sharedSpellSlots : null).toEqual([
      { level: 1, count: 3, recharge: 'long_rest' },
    ]);
    expect('sharedSpellSlots' in levelThree ? levelThree.sharedSpellSlots : null).toEqual([
      { level: 1, count: 4, recharge: 'long_rest' },
      { level: 2, count: 2, recharge: 'long_rest' },
    ]);
  });

  it('exporter_drops_passive_ac: keeps passive AC separate while the loaded profiles differ exactly at resolved AC', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const baseId = exportable(db, 'Base Armor');
    const bonusId = exportable(db, 'Bonus Armor');
    const fillerOne = exportable(db, 'Filler One');
    const fillerTwo = exportable(db, 'Filler Two');
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, label
       ) VALUES (?, 1, 'armor_class_bonus', 1, 'Passive ward')`,
      [bonusId],
    );

    const base = exportedMember(db, baseId);
    const bonus = exportedMember(db, bonusId);
    const firstFiller = exportedMember(db, fillerOne);
    const secondFiller = exportedMember(db, fillerTwo);
    expect(base.armorClass).toBe(12);
    expect(bonus.armorClass).toBe(12);
    expect('passives' in bonus ? bonus.passives : null).toEqual({ armorClassBonus: 1 });
    expect(base.initiativeBonus).toBe(2);
    expect(bonus.initiativeBonus).toBe(2);

    const load = (member: typeof base) => loadExternalPartyPack({
      schemaVersion: 2,
      partyId: 'party:distinguishing-ac',
      allowPartial: false,
      members: [member, firstFiller, secondFiller],
    });
    const loadedBase = load(base);
    const loadedBonus = load(bonus);
    if (loadedBase.status !== 'loaded') {
      throw new Error(JSON.stringify(loadedBase));
    }
    if (loadedBonus.status !== 'loaded') {
      throw new Error(JSON.stringify(loadedBonus));
    }
    expect(loadedBase).toMatchObject({ status: 'loaded' });
    expect(loadedBonus).toMatchObject({ status: 'loaded' });
    if (loadedBase.status !== 'loaded' || loadedBonus.status !== 'loaded') {
      throw new Error('Distinguishing party packs did not load.');
    }
    const baseRules = loadedBase.party.members[0]?.profile.rules;
    const bonusRules = loadedBonus.party.members[0]?.profile.rules;
    expect(baseRules).toBeDefined();
    expect(bonusRules).toEqual({ ...baseRules, armorClass: 13 });
  });

  it('exports a caster with no attacks because attacks are optional for spellcasters', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const attacklessId = exportable(db, 'Attackless Caster', [{ name: 'Wizard', level: 1 }]);
    expect(exportedMember(db, attacklessId).attacks).toEqual([]);
  });

  it('refusal_defaulted: refuses a named missing required field instead of supplying speed', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const incompleteId = createCharacter(db, 'No Speed');
    addClassLevel(db, incompleteId, 'Fighter', 1);
    addSpecies(db, incompleteId, null);
    expect(new StoredCharacterPartyPackExporter(db).export(incompleteId)).toEqual({
      status: 'refused',
      refusal: {
        kind: 'stored_character_party_pack_refusal',
        field: 'walkingSpeedFeet',
        detail: 'UNKNOWN because this character has no species speed entered',
      },
    });
  });
});
