import { createHash } from 'node:crypto';
import { sqlString } from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

export interface BuildReportFixture {
  readonly characterId: number;
  readonly wizardSourceId: number;
  readonly featSourceId: number;
  readonly spellIds: {
    readonly detectMagic: number;
    readonly mageArmor: number;
    readonly mageHand: number;
    readonly magicMissile: number;
    readonly shield2014: number;
    readonly shield2024: number;
    readonly invalidSpell: number;
  };
  readonly invalidSlotIds: readonly number[];
}

interface SpellOptions {
  readonly level?: number;
  readonly edition?: '2014' | '2024';
  readonly identityId?: number;
  readonly ritual?: boolean;
  readonly attack?: boolean;
}

interface SlotOptions {
  readonly bucket?: string;
  readonly fixed?: boolean;
  readonly levelMin?: number;
  readonly levelMax?: number;
  readonly withSlots?: boolean;
  readonly countsAgainstLimit?: boolean;
  readonly state?: 'active' | 'orphaned' | 'kept_override';
  readonly eligibility?: 'valid' | 'invalid' | 'unselected';
  readonly invalidReason?: string | null;
  readonly orphanReason?: string | null;
  readonly overrideNote?: string | null;
  readonly sortOrder?: number;
  readonly label?: string | null;
  readonly required?: boolean;
  readonly locked?: boolean;
  readonly allowedSpellLists?: readonly string[];
}

let sequence = 0;

function nextKey(prefix: string): string {
  sequence += 1;
  return `2024:r40.fixture:${prefix.replaceAll(':', '-')}-${sequence}`;
}

export function classDefinitionId(
  db: DatabaseContext,
  name: string,
): number {
  const id = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE name = ?',
    [name],
  );
  if (id === null) {
    throw new Error(`Missing seeded ${name} definition.`);
  }
  return id;
}

export function createCharacter(
  db: DatabaseContext,
  name: string,
  options: {
    readonly intelligence?: number;
    readonly wisdom?: number;
    readonly charisma?: number;
    readonly allowLegacy?: boolean;
    readonly proficiencyOverride?: number | null;
  } = {},
): number {
  return db.exec(
    `INSERT INTO characters (
       name, intelligence, wisdom, charisma, allow_legacy,
       proficiency_bonus_override, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      options.intelligence ?? 10,
      options.wisdom ?? 10,
      options.charisma ?? 10,
      options.allowLegacy === true ? 1 : 0,
      options.proficiencyOverride ?? null,
      `fixture:${name}`,
    ],
  ).lastInsertId;
}

export function addClassLevel(
  db: DatabaseContext,
  characterId: number,
  className: string,
  level: number,
  subclassDefinitionId: number | null = null,
): number {
  const definitionId = classDefinitionId(db, className);
  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, subclass_definition_id, level
     ) VALUES (?, ?, ?, ?)`,
    [characterId, definitionId, subclassDefinitionId, level],
  );
  return definitionId;
}

export function createSource(
  db: DatabaseContext,
  characterId: number,
  sourceType: 'class' | 'feat',
  definitionId: number,
  displayName: string,
  config: Readonly<Record<string, unknown>> = {},
): number {
  return db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state
     ) VALUES (?, ?, ?, ?, ?, ?, 1, 'active')`,
    [
      characterId,
      nextKey('source'),
      sourceType,
      definitionId,
      displayName,
      JSON.stringify(config),
    ],
  ).lastInsertId;
}

export function createSpellIdentity(
  db: DatabaseContext,
  name: string,
): number {
  return db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name
     ) VALUES (?, ?, ?)`,
    [nextKey('identity'), name, name.toLowerCase()],
  ).lastInsertId;
}

export function createSpell(
  db: DatabaseContext,
  name: string,
  options: SpellOptions = {},
): number {
  const identityId =
    options.identityId ?? createSpellIdentity(db, name);
  const edition = options.edition ?? '2024';
  const contentKey = nextKey(`version:${edition}`);
  registerFixtureContentIdentity(db, {
    kind: 'spell', contentKey, name, keyKind: 'asserted',
  });
  const versionId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, ritual, is_active
     ) VALUES (?, ?, ?, ?, ?, 'Abjuration', ?, 1)`,
    [
      contentKey,
      identityId,
      name,
      edition,
      options.level ?? 1,
      options.ritual === true ? 1 : 0,
    ],
  ).lastInsertId;
  if (options.attack === true) {
    db.exec(
      `INSERT INTO spell_version_attack_modes (
         spell_version_id, attack_mode
       ) VALUES (?, 'ranged')`,
      [versionId],
    );
  }
  return versionId;
}

export function createSlot(
  db: DatabaseContext,
  characterId: number,
  sourceId: number,
  spellVersionId: number | null,
  key: string,
  ordinal: number,
  options: SlotOptions = {},
): number {
  const fixed = options.fixed === true;
  return db.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, ordinal,
       bucket, eligibility_kind, fixed_spell_version_id,
       current_spell_version_id, label, spell_level_min, spell_level_max,
       with_slots, counts_against_limit, state, orphan_reason_code,
       override_note, sort_order, selection_eligibility,
       selection_invalid_reason, required, is_locked, allowed_spell_lists
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     )`,
    [
      characterId,
      sourceId,
      key,
      key.split(':')[0]!,
      ordinal,
      options.bucket ?? 'prepared',
      fixed ? 'fixed_spell' : 'choice_from_list',
      fixed ? spellVersionId : null,
      fixed ? null : spellVersionId,
      options.label ?? null,
      options.levelMin ?? 0,
      options.levelMax ?? 9,
      options.withSlots === false ? 0 : 1,
      options.countsAgainstLimit === false ? 0 : 1,
      options.state ?? 'active',
      options.orphanReason ?? null,
      options.overrideNote ?? null,
      options.sortOrder ?? ordinal,
      options.eligibility ??
        (spellVersionId === null ? 'unselected' : 'valid'),
      options.invalidReason ?? null,
      options.required === true ? 1 : 0,
      options.locked === true ? 1 : 0,
      options.allowedSpellLists === undefined
        ? null
        : JSON.stringify(options.allowedSpellLists),
    ],
  ).lastInsertId;
}

export function createBuildReportFixture(
  db: DatabaseContext,
): BuildReportFixture {
  seedClassProgressions(db);

  const characterId = createCharacter(db, 'R40 Golden', {
    intelligence: 16,
    wisdom: 14,
    charisma: 18,
    allowLegacy: true,
  });
  const wizardDefinitionId = addClassLevel(
    db,
    characterId,
    'Wizard',
    1,
  );
  addClassLevel(db, characterId, 'Paladin', 1);
  addClassLevel(db, characterId, 'Ranger', 1);
  addClassLevel(db, characterId, 'Warlock', 5);

  const wizardSourceId = createSource(
    db,
    characterId,
    'class',
    wizardDefinitionId,
    'Wizard 1',
    { spellcasting_ability: 'intelligence' },
  );
  const featContentKey = nextKey('feat');
  registerFixtureContentIdentity(db, {
    kind: 'feat', contentKey: featContentKey, name: 'Report Fixture Feat',
    keyKind: 'asserted',
  });
  const featDefinitionId = db.exec(
    `INSERT INTO feat_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (?, 'Report Fixture Feat', '2024', 1, '[]')`,
    [featContentKey],
  ).lastInsertId;
  const featSourceId = createSource(
    db,
    characterId,
    'feat',
    featDefinitionId,
    'Magic Initiate: Wizard',
    { spellcasting_ability: 'wisdom' },
  );

  const mageHand = createSpell(db, 'Mage Hand', { level: 0 });
  const detectMagic = createSpell(db, 'Detect Magic', {
    ritual: true,
  });
  const mageArmor = createSpell(db, 'Mage Armor');
  const magicMissile = createSpell(db, 'Magic Missile');
  const shieldIdentity = createSpellIdentity(db, 'Shield');
  const shield2024 = createSpell(db, 'Shield', {
    identityId: shieldIdentity,
  });
  const shield2014 = createSpell(db, 'Shield', {
    edition: '2014',
    identityId: shieldIdentity,
  });
  const invalidSpell = createSpell(db, 'Invalid Bolt', {
    level: 1,
    attack: true,
  });

  createSlot(
    db,
    characterId,
    featSourceId,
    mageHand,
    'feat-cantrip:1',
    1,
    {
      bucket: 'cantrip_known',
      levelMax: 0,
      withSlots: false,
      sortOrder: 8,
    },
  );
  createSlot(
    db,
    characterId,
    wizardSourceId,
    mageHand,
    'wizard-cantrip:1',
    1,
    {
      bucket: 'cantrip_known',
      levelMax: 0,
      withSlots: false,
      sortOrder: 7,
    },
  );
  for (const [index, versionId] of [
    mageArmor,
    magicMissile,
    shield2024,
    shield2014,
  ].entries()) {
    createSlot(
      db,
      characterId,
      wizardSourceId,
      versionId,
      `wizard-prepared:${index + 1}`,
      index + 1,
      { bucket: 'prepared', levelMin: 1, levelMax: 1 },
    );
  }

  for (const versionId of [magicMissile, detectMagic, mageArmor]) {
    db.exec(
      `INSERT INTO wizard_spellbook_entries (
         character_id, spell_version_id
       ) VALUES (?, ?)`,
      [characterId, versionId],
    );
  }

  const activeInvalid = createSlot(
    db,
    characterId,
    featSourceId,
    invalidSpell,
    'invalid-choice:1',
    1,
    {
      bucket: 'known',
      levelMax: 0,
      eligibility: 'invalid',
      invalidReason: 'Selected spell is outside the slot level range.',
      label: 'Persisted invalid choice',
      sortOrder: 2,
    },
  );
  const orphaned = createSlot(
    db,
    characterId,
    featSourceId,
    null,
    'orphaned-choice:1',
    1,
    {
      bucket: 'known',
      state: 'orphaned',
      eligibility: 'unselected',
      orphanReason: 'grant_rule_removed',
      sortOrder: 1,
    },
  );
  const keptOverride = createSlot(
    db,
    characterId,
    featSourceId,
    invalidSpell,
    'override-choice:1',
    1,
    {
      bucket: 'known',
      levelMax: 0,
      state: 'kept_override',
      eligibility: 'invalid',
      invalidReason: 'Selected spell is outside the slot level range.',
      overrideNote: 'Explicit table ruling.',
      sortOrder: 3,
    },
  );

  return {
    characterId,
    wizardSourceId,
    featSourceId,
    spellIds: {
      detectMagic,
      mageArmor,
      mageHand,
      magicMissile,
      shield2014,
      shield2024,
      invalidSpell,
    },
    invalidSlotIds: [orphaned, activeInvalid, keptOverride],
  };
}

export function persistedReportTableHashes(
  db: DatabaseContext,
  characterId: number,
): Readonly<Record<string, string>> {
  const tableHashes = Object.fromEntries(
    db
      .all(
        `SELECT name
         FROM sqlite_schema
         WHERE type = 'table'
           AND (name NOT LIKE 'sqlite_%' OR name = 'sqlite_sequence')
         ORDER BY name`,
        undefined,
        (row) => sqlString(row, 'name'),
      )
      .map((name) => {
        const quotedName = `"${name.replaceAll('"', '""')}"`;
        const rows = db.allRaw(`SELECT * FROM ${quotedName} ORDER BY rowid`);
        return [
          name,
          createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
        ];
      }),
  );

  return {
    character_id: String(characterId),
    ...tableHashes,
  };
}
