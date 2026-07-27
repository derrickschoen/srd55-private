import type { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  addClassLevel,
  createCharacter,
  createSlot,
  createSource,
  createSpell,
  persistedReportTableHashes,
} from './build-report-fixture';

export interface PrintableListFixture {
  readonly characterId: number;
  readonly sourceIds: {
    readonly cleric: number;
    readonly druid: number;
    readonly gift2: number;
    readonly gift10: number;
    readonly wizard: number;
  };
  readonly spellIds: {
    readonly aid: number;
    readonly alarm: number;
    readonly bless: number;
    readonly command: number;
    readonly detectMagic: number;
    readonly faerieFire: number;
    readonly goodberry: number;
    readonly guidance: number;
    readonly mistyStep: number;
    readonly shield: number;
    readonly thornWhip: number;
    readonly thunderwave: number;
    readonly unseenServant: number;
  };
  readonly slotIds: {
    readonly command: number;
    readonly faerieFire: number;
    readonly mistyStep: number;
    readonly shield: number;
    readonly thornWhip: number;
  };
}

interface PrintableSpellOptions {
  readonly level?: number;
  readonly school?: string;
  readonly edition?: '2014' | '2024';
  readonly active?: boolean;
  readonly ritual?: boolean;
  readonly concentration?: boolean;
  readonly castingTime?: string | null;
  readonly actionType?: string | null;
  readonly range?: string | null;
  readonly duration?: string | null;
  readonly components?: string | null;
  readonly summary?: string | null;
  readonly attackModes?: readonly string[];
  readonly saveAbilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly lists?: readonly string[];
  readonly upcastScale?: 'slot_level' | 'character_level';
  readonly upcastLevels?: readonly number[];
  readonly upcastSummary?: string | null;
}

let fixtureSequence = 0;

function key(prefix: string): string {
  fixtureSequence += 1;
  return `p50:${prefix}:${fixtureSequence}`;
}

function createPrintableSpell(
  db: DatabaseContext,
  name: string,
  options: PrintableSpellOptions = {},
): number {
  const spellId = createSpell(db, name, {
    ...(options.level === undefined ? {} : { level: options.level }),
    ...(options.edition === undefined
      ? {}
      : { edition: options.edition }),
    ...(options.ritual === undefined
      ? {}
      : { ritual: options.ritual }),
  });
  db.exec(
    `UPDATE spell_versions
     SET school = ?, concentration = ?, casting_time = ?, action_type = ?,
         range = ?, duration = ?, components = ?, short_summary = ?,
         is_active = ?
     WHERE id = ?`,
    [
      options.school ?? 'Abjuration',
      options.concentration === true ? 1 : 0,
      options.castingTime ?? null,
      options.actionType ?? null,
      options.range ?? null,
      options.duration ?? null,
      options.components ?? null,
      options.summary ?? null,
      options.active === false ? 0 : 1,
      spellId,
    ],
  );
  for (const attackMode of options.attackModes ?? []) {
    db.exec(
      `INSERT INTO spell_version_attack_modes (
         spell_version_id, attack_mode
       ) VALUES (?, ?)`,
      [spellId, attackMode],
    );
  }
  for (const saveAbility of options.saveAbilities ?? []) {
    db.exec(
      `INSERT INTO spell_version_save_abilities (
         spell_version_id, save_ability
       ) VALUES (?, ?)`,
      [spellId, saveAbility],
    );
  }
  for (const tag of options.tags ?? []) {
    db.exec(
      `INSERT INTO spell_version_tags (spell_version_id, tag)
       VALUES (?, ?)`,
      [spellId, tag],
    );
  }
  if (options.upcastScale !== undefined || options.upcastSummary !== undefined) {
    db.exec(
      'UPDATE spell_versions SET upcast_scale = ?, upcast_summary = ? WHERE id = ?',
      [
        options.upcastScale ?? null,
        options.upcastSummary ?? null,
        spellId,
      ],
    );
  }
  for (const level of options.upcastLevels ?? []) {
    db.exec(
      `INSERT INTO spell_version_upcast_levels (spell_version_id, level)
       VALUES (?, ?)`,
      [spellId, level],
    );
  }
  for (const list of options.lists ?? []) {
    db.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (?, ?)`,
      [spellId, list],
    );
  }
  return spellId;
}

function classDefinitionId(
  db: DatabaseContext,
  className: string,
): number {
  const id = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE name = ?',
    [className],
  );
  if (id === null) {
    throw new Error(`Missing ${className} class definition.`);
  }
  return id;
}

export function createPrintableListFixture(
  db: DatabaseContext,
): PrintableListFixture {
  seedClassProgressions(db);
  const characterId = createCharacter(db, 'P50 Printable', {
    intelligence: 16,
    wisdom: 14,
    charisma: 18,
  });
  for (const className of ['Cleric', 'Druid', 'Wizard']) {
    addClassLevel(db, characterId, className, 1);
  }

  const clericSourceId = createSource(
    db,
    characterId,
    'class',
    classDefinitionId(db, 'Cleric'),
    'Cleric 1',
  );
  const druidSourceId = createSource(
    db,
    characterId,
    'class',
    classDefinitionId(db, 'Druid'),
    'Druid 1',
  );
  const wizardSourceId = createSource(
    db,
    characterId,
    'class',
    classDefinitionId(db, 'Wizard'),
    'Wizard 1',
  );
  const featDefinitionId = db.exec(
    `INSERT INTO feat_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (?, 'P50 Gift', '2024', 1, '[]')`,
    [key('feat')],
  ).lastInsertId;
  const gift10SourceId = createSource(
    db,
    characterId,
    'feat',
    featDefinitionId,
    'Gift 10',
    { spellcasting_ability: 'charisma' },
  );
  const gift2SourceId = createSource(
    db,
    characterId,
    'feat',
    featDefinitionId,
    'Gift 2',
    { spellcasting_ability: 'charisma' },
  );

  const command = createPrintableSpell(db, 'Command', {
    school: 'Enchantment',
    castingTime: 'Action',
    actionType: 'Action',
    range: '60 feet',
    duration: '1 round',
    components: 'V',
    summary: 'A one-word supernatural command.',
    saveAbilities: ['wisdom'],
    lists: ['Cleric'],
  });
  const bless = createPrintableSpell(db, 'Bless', {
    school: 'Enchantment',
    castingTime: 'Action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    components: 'V, S, M',
    summary: 'Bolster three creatures.',
    tags: ['concentration'],
    lists: ['Cleric'],
    // THE UPCAST PROGRESSION, on ONE spell of the five. The other four carry
    // none, which is what makes the printable card's "print no line at all"
    // behaviour observable rather than merely stated: a card that printed
    // `Upcast: —` for a spell whose document said nothing would be asserting
    // that it cannot be upcast.
    upcastScale: 'slot_level',
    upcastLevels: [3, 2, 4],
    upcastSummary: 'One additional creature per slot level above 2.',
  });
  const guidance = createPrintableSpell(db, 'Guidance', {
    level: 0,
    lists: ['Cleric'],
  });
  const aid = createPrintableSpell(db, 'Aid', {
    level: 2,
    lists: ['Cleric'],
  });
  createPrintableSpell(db, 'Legacy Prayer', {
    edition: '2014',
    lists: ['Cleric'],
  });
  createPrintableSpell(db, 'Inactive Prayer', {
    active: false,
    lists: ['Cleric'],
  });

  const thornWhip = createPrintableSpell(db, 'Thorn Whip', {
    level: 0,
    school: 'Transmutation',
    castingTime: '1 Bonus Action',
    range: '30 feet',
    duration: 'Instantaneous',
    components: 'V, S, M',
    summary: 'A thorny vine lashes out.',
    attackModes: ['ranged_spell', 'melee_spell'],
    lists: ['Druid'],
  });
  const goodberry = createPrintableSpell(db, 'Goodberry', {
    school: 'Transmutation',
    castingTime: 'Action',
    summary: null,
    lists: ['Druid'],
  });
  const thunderwave = createPrintableSpell(db, 'Thunderwave', {
    level: 2,
    saveAbilities: ['constitution'],
    lists: ['Druid'],
  });

  const shield = createPrintableSpell(db, 'Shield', {
    castingTime: '1 Reaction',
    range: 'Self',
    duration: '1 round',
    components: 'V, S',
    summary: 'A sudden magical barrier.',
    lists: ['Wizard'],
  });
  const detectMagic = createPrintableSpell(db, 'Detect Magic', {
    school: 'Divination',
    castingTime: 'Action or Ritual',
    duration: 'Concentration, up to 10 minutes',
    summary: 'Sense magic nearby.',
    tags: ['concentration', 'ritual'],
    lists: ['Wizard'],
  });
  const unseenServant = createPrintableSpell(db, 'Unseen Servant', {
    school: 'Conjuration',
    castingTime: 'Action',
    summary: 'An invisible servant performs simple tasks.',
    lists: ['Wizard'],
  });
  const alarm = createPrintableSpell(db, 'Alarm', {
    school: 'Abjuration',
    castingTime: '1 minute',
    summary: 'Set a magical alarm.',
    ritual: true,
    lists: ['Wizard'],
  });
  createPrintableSpell(db, 'Mage Hand', {
    level: 0,
    lists: ['Wizard'],
  });

  const mistyStep = createPrintableSpell(db, 'Misty Step', {
    level: 2,
    school: 'Conjuration',
    castingTime: 'Bonus Action',
    range: 'Self',
    duration: 'Instantaneous',
    summary: 'Teleport a short distance.',
  });
  const faerieFire = createPrintableSpell(db, 'Faerie Fire', {
    school: 'Evocation',
    castingTime: 'Action',
    concentration: true,
    summary: 'Outline creatures in revealing light.',
    saveAbilities: ['dexterity'],
  });

  const commandSlotId = createSlot(
    db,
    characterId,
    clericSourceId,
    command,
    'cleric-prepared:1',
    1,
    { bucket: 'prepared', levelMin: 1, levelMax: 1 },
  );
  const thornWhipSlotId = createSlot(
    db,
    characterId,
    druidSourceId,
    thornWhip,
    'druid-cantrip:1',
    1,
    {
      bucket: 'cantrip_known',
      levelMax: 0,
      withSlots: false,
    },
  );
  const shieldSlotId = createSlot(
    db,
    characterId,
    wizardSourceId,
    shield,
    'wizard-prepared:1',
    1,
    { bucket: 'prepared', levelMin: 1, levelMax: 1 },
  );
  const mistyStepSlotId = createSlot(
    db,
    characterId,
    gift2SourceId,
    mistyStep,
    'gift-two:1',
    1,
    { bucket: 'automatic', fixed: true, levelMin: 2, levelMax: 2 },
  );
  db.exec(
    `UPDATE spell_selection_slots
     SET free_cast = ?
     WHERE id = ?`,
    [
      JSON.stringify({
        uses: 1,
        recovery: 'long_rest',
        pool_scope: 'per_spell',
      }),
      mistyStepSlotId,
    ],
  );
  const faerieFireSlotId = createSlot(
    db,
    characterId,
    gift10SourceId,
    faerieFire,
    'gift-ten:1',
    1,
    {
      bucket: 'automatic',
      fixed: true,
      withSlots: false,
    },
  );
  db.exec(
    `UPDATE spell_selection_slots
     SET free_cast = ?
     WHERE id = ?`,
    [
      JSON.stringify({
        uses: 2,
        recovery: 'dawn',
        pool_scope: 'shared',
      }),
      faerieFireSlotId,
    ],
  );

  for (const spellId of [detectMagic, shield, unseenServant]) {
    db.exec(
      `INSERT INTO wizard_spellbook_entries (
         character_id, spell_version_id
       ) VALUES (?, ?)`,
      [characterId, spellId],
    );
  }

  return {
    characterId,
    sourceIds: {
      cleric: clericSourceId,
      druid: druidSourceId,
      gift2: gift2SourceId,
      gift10: gift10SourceId,
      wizard: wizardSourceId,
    },
    spellIds: {
      aid,
      alarm,
      bless,
      command,
      detectMagic,
      faerieFire,
      goodberry,
      guidance,
      mistyStep,
      shield,
      thornWhip,
      thunderwave,
      unseenServant,
    },
    slotIds: {
      command: commandSlotId,
      faerieFire: faerieFireSlotId,
      mistyStep: mistyStepSlotId,
      shield: shieldSlotId,
      thornWhip: thornWhipSlotId,
    },
  };
}

export { persistedReportTableHashes as persistedPrintableTableHashes };
