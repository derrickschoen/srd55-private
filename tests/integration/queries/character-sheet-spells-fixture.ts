import type { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  addClassLevel,
  classDefinitionId,
  createCharacter,
  createSlot,
  createSpell,
  persistedReportTableHashes,
} from '../reports/build-report-fixture';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

export interface CharacterSheetSpellsFixture {
  readonly characterId: number;
  readonly classIds: {
    readonly cleric: number;
    readonly wizard: number;
  };
  readonly sourceIds: {
    readonly cleric: number;
    readonly wizardSubclass: number;
    readonly classChild: number;
    readonly standalone: number;
  };
  readonly spellIds: {
    readonly childSpark: number;
    readonly directBeacon: number;
    readonly echoWard: number;
    readonly reverseWard: number;
    readonly placeholder: number;
    readonly subclassVeil: number;
    readonly alwaysLantern: number;
    readonly giftFlame: number;
    readonly activeInvalid: number;
    readonly inactive: number;
    readonly orphaned: number;
    readonly spellbookBucket: number;
    readonly ritualOnly: number;
    readonly chromaticOrb: number;
    readonly comprehendLanguages: number;
  };
}

export interface SheetSpellRetirementFixture {
  readonly characterId: number;
  readonly spellIds: {
    readonly command: number;
    readonly detectMagic: number;
    readonly faerieFire: number;
    readonly goodberry: number;
    readonly mistyStep: number;
    readonly thornWhip: number;
    readonly unseenServant: number;
  };
  readonly slotIds: {
    readonly command: number;
    readonly faerieFire: number;
    readonly mistyStep: number;
  };
}

export const RETIREMENT_COMMAND_PROSE =
  'A one-word supernatural command.';
export const RETIREMENT_LONG_PROSE =
  `A thorny vine lashes out.\n${'The vine remains mechanically explicit. '.repeat(180)}` +
  '\nThe stored spell text ends here.  ';

/**
 * D91-R's resource projection for the fixture's Cleric 1 + Wizard 1 levels.
 *
 * This byte oracle is hand-authored from the sourced class progressions: the
 * two full-caster levels produce three level-1 slots, and Wizard's Arcane
 * Recovery remains the existing explicit feature-text absence. It must never
 * be regenerated from CharacterSheetBuilder output.
 */
export const HAND_AUTHORED_D91_R_RESOURCE_BYTES = new TextEncoder().encode(
  '[{"status":"absent","id":"resource:feature-text-not-modelled","kind":null,"class_name":null,"reason":"feature_text_maximum_not_modelled","detail":"Mystic Arcanum and Signature Spells are per-spell single uses, not one shared resource maximum."},{"status":"computed","id":"resource:spell-slot:1","kind":"spell_slot","class_definition_id":null,"class_name":null,"class_level":null,"spell_level":1,"maximum":3,"computation":{"kind":"shared_spell_slots","effective_caster_level":2}}]',
);

interface SourceOptions {
  readonly parentId?: number;
  readonly config?: Readonly<Record<string, unknown>>;
}

interface ReferenceOptions {
  readonly level?: number;
  readonly edition?: '2014' | '2024';
  readonly school?: string;
  readonly castingTime?: string | null;
  readonly actionType?: string | null;
  readonly range?: string | null;
  readonly duration?: string | null;
  readonly components?: string | null;
  readonly concentration?: boolean;
  readonly ritual?: boolean;
  readonly description?: string | null;
  readonly upcastLevels?: readonly number[];
  readonly upcastSummary?: string | null;
  readonly cantripUpgradeLevels?: readonly number[];
  readonly cantripUpgradeSummary?: string | null;
  readonly attackModes?: readonly string[];
  readonly saveAbilities?: readonly string[];
  readonly lists?: readonly string[];
  readonly active?: boolean;
  readonly placeholder?: boolean;
}

let sequence = 0;

function key(label: string): string {
  sequence += 1;
  return `2024:ss1.fixture:${label}-${sequence}`;
}

function createDefinition(
  db: DatabaseContext,
  kind: 'feat' | 'subclass',
  options: {
    readonly name: string;
    readonly classId?: number;
    readonly spellcastingAbility?: 'intelligence' | null;
    readonly grantRules?: readonly Readonly<Record<string, unknown>>[];
  },
): number {
  const contentKey = key(kind);
  registerFixtureContentIdentity(db, {
    kind,
    contentKey,
    name: options.name,
    keyKind: 'asserted',
  });
  if (kind === 'subclass') {
    if (options.classId === undefined) {
      throw new Error('The SS-1 subclass fixture requires its parent class.');
    }
    return db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         spellcasting_ability, grant_rules
       ) VALUES (?, ?, ?, '2024', ?, '[]')`,
      [
        contentKey,
        options.classId,
        options.name,
        options.spellcastingAbility ?? null,
      ],
    ).lastInsertId;
  }
  return db.exec(
    `INSERT INTO feat_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (?, ?, '2024', 1, ?)`,
    [contentKey, options.name, JSON.stringify(options.grantRules ?? [])],
  ).lastInsertId;
}

function createSource(
  db: DatabaseContext,
  characterId: number,
  sourceType: 'class' | 'subclass' | 'feat',
  definitionId: number,
  name: string,
  options: SourceOptions = {},
): number {
  return db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, parent_source_instance_id,
       source_type, source_definition_id, display_name, config,
       acquired_at_character_level, state
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'active')`,
    [
      characterId,
      key('source'),
      options.parentId ?? null,
      sourceType,
      definitionId,
      name,
      JSON.stringify(options.config ?? {}),
    ],
  ).lastInsertId;
}

function createReferenceSpell(
  db: DatabaseContext,
  name: string,
  options: ReferenceOptions = {},
): number {
  const spellId = createSpell(db, name, {
    ...(options.placeholder === true
      ? { level: 1 }
      : options.level === undefined
        ? {}
        : { level: options.level }),
    ...(options.edition === undefined ? {} : { edition: options.edition }),
    ...(options.ritual === undefined ? {} : { ritual: options.ritual }),
    deferFingerprint: true,
  });
  db.exec(
    `UPDATE spell_versions
     SET level = ?, school = ?, casting_time = ?, action_type = ?,
         range = ?, duration = ?, components = ?, concentration = ?,
         ritual = ?, short_summary = ?, upcast_summary = ?,
         cantrip_upgrade_summary = ?, is_active = ?, provenance = ?
     WHERE id = ?`,
    [
      options.placeholder === true ? -1 : (options.level ?? 1),
      options.school ?? 'Abjuration',
      options.castingTime ?? null,
      options.actionType ?? null,
      options.range ?? null,
      options.duration ?? null,
      options.components ?? null,
      options.concentration === true ? 1 : 0,
      options.ritual === true ? 1 : 0,
      options.description ?? null,
      options.upcastSummary ?? null,
      options.cantripUpgradeSummary ?? null,
      options.active === false ? 0 : 1,
      options.placeholder === true ? 'placeholder' : 'import',
      spellId,
    ],
  );
  for (const level of options.upcastLevels ?? []) {
    db.exec(
      `INSERT INTO spell_version_upcast_levels (spell_version_id, level)
       VALUES (?, ?)`,
      [spellId, level],
    );
  }
  for (const level of options.cantripUpgradeLevels ?? []) {
    db.exec(
      `INSERT INTO spell_version_cantrip_upgrade_levels (
         spell_version_id, level
       ) VALUES (?, ?)`,
      [spellId, level],
    );
  }
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

export function createCharacterSheetSpellsFixture(
  db: DatabaseContext,
): CharacterSheetSpellsFixture {
  seedClassProgressions(db);
  const clericClassId = classDefinitionId(db, 'Cleric');
  const wizardClassId = classDefinitionId(db, 'Wizard');
  // This browser-safe fixture cannot import the Vite-only SRD resource parser.
  // The hand-authored level-1 row is the only stored ladder value used by its
  // Cleric 1 + Wizard 1 D91-R oracle; Wizard contributes no stored ladder row.
  db.exec(
    `INSERT INTO class_resources (
       class_definition_id, class_level, resource_kind, maximum
     ) VALUES (?, 1, 'channel_divinity', 0)`,
    [clericClassId],
  );
  db.exec(
    `INSERT INTO class_resource_formulas (
       class_definition_id, resource_kind, formula_kind,
       minimum_class_level, fixed_count
     ) VALUES (?, 'divine_intervention', 'fixed_count', 10, 1)`,
    [clericClassId],
  );
  const subclassId = createDefinition(db, 'subclass', {
    name: 'SS-1 Chronurgy',
    classId: wizardClassId,
    spellcastingAbility: 'intelligence',
  });
  const capabilityDefinitionId = createDefinition(db, 'feat', {
    name: 'SS-1 Standalone Gift',
    grantRules: [
      {
        kind: 'capability',
        rule_key: 'ss1-ritual-capability',
        capability_key: 'ss1-wizard-ritual-capability',
        collection: 'wizard_spellbook',
        access_mode: 'ritual_only',
        tags: ['ritual'],
      },
    ],
  });
  const nestedDefinitionId = createDefinition(db, 'feat', {
    name: 'SS-1 Nested Grant',
  });

  const characterId = createCharacter(db, 'SS-1 Projection', {
    intelligence: 18,
    wisdom: 14,
    charisma: 13,
    allowLegacy: true,
  });
  // Acquisition order is the opposite of the required alphabetical groups.
  addClassLevel(db, characterId, 'Wizard', 1, subclassId);
  addClassLevel(db, characterId, 'Cleric', 1);

  const clericSourceId = createSource(
    db,
    characterId,
    'class',
    clericClassId,
    'Cleric direct',
  );
  const nestedParentId = createSource(
    db,
    characterId,
    'feat',
    nestedDefinitionId,
    'Cleric feature parent',
    { parentId: clericSourceId, config: { spellcasting_ability: 'wisdom' } },
  );
  const classChildSourceId = createSource(
    db,
    characterId,
    'feat',
    nestedDefinitionId,
    'Cleric feature child',
    {
      parentId: nestedParentId,
      config: { spellcasting_ability: 'wisdom' },
    },
  );
  const subclassSourceId = createSource(
    db,
    characterId,
    'subclass',
    subclassId,
    'Chronurgy subclass',
  );
  const standaloneSourceId = createSource(
    db,
    characterId,
    'feat',
    capabilityDefinitionId,
    'Gift 10',
  );
  // A corrupt self-cycle must terminate and remain truthful Other sources;
  // the recursive query's slash-delimited visited path is load-bearing here.
  db.exec(
    `UPDATE character_source_instances
     SET parent_source_instance_id = ?
     WHERE id = ?`,
    [standaloneSourceId, standaloneSourceId],
  );

  const childSpark = createReferenceSpell(db, 'Child Spark', {
    level: 0,
    description: 'Child-source cantrip.',
  });
  const directBeacon = createReferenceSpell(db, 'Direct Beacon', {
    level: 1,
    description: 'Direct class spell.',
  });
  const echoWard = createReferenceSpell(db, 'Echo Ward', {
    level: 1,
    edition: '2014',
    school: 'Chronomancy',
    castingTime: ' 1 Reaction\nwhen struck ',
    actionType: 'Reaction',
    range: 'Self (30-foot echo)',
    duration: 'Until dawn',
    components: 'V, S, M (silver thread)',
    concentration: true,
    description: '  First reference line.\nSecond reference line.  ',
    upcastLevels: [4, 2],
    upcastSummary: 'One echo for each listed slot level.',
    cantripUpgradeLevels: [17, 5, 11],
    cantripUpgradeSummary: 'Deliberately asymmetric imported progression.',
    attackModes: ['ranged_spell', 'melee_spell'],
    saveAbilities: ['wisdom', 'charisma'],
  });
  const reverseWard = createReferenceSpell(db, 'Reverse Ward', {
    level: 1,
    description: 'Prepared route arrives before its duplicate Known route.',
  });
  const placeholder = createReferenceSpell(db, 'A Placeholder', {
    placeholder: true,
    school: 'Unrecorded School',
  });
  const subclassVeil = createReferenceSpell(db, 'Subclass Veil', {
    level: 1,
    description: 'Subclass-attributed spell.',
  });
  const alwaysLantern = createReferenceSpell(db, 'Always Lantern', {
    level: 2,
    description: 'Always prepared by its stored flag.',
  });
  const giftFlame = createReferenceSpell(db, 'Gift Flame', {
    level: 1,
    description: null,
  });
  const activeInvalid = createReferenceSpell(db, 'Invalid Active', {
    level: 2,
  });
  const inactive = createReferenceSpell(db, 'Inactive Selection', {
    level: 1,
    active: false,
  });
  const orphaned = createReferenceSpell(db, 'Orphaned Selection', {
    level: 1,
  });
  const spellbookBucket = createReferenceSpell(db, 'Book Only', {
    level: 1,
  });
  const ritualOnly = createReferenceSpell(db, 'Ritual Capability Only', {
    level: 1,
    ritual: true,
  });
  const chromaticOrb = createReferenceSpell(db, 'Chromatic Orb', {
    level: 1,
    description: 'Unprepared spellbook acquisition one.',
  });
  const comprehendLanguages = createReferenceSpell(
    db,
    'Comprehend Languages',
    {
      level: 1,
      ritual: true,
      description: 'Unprepared spellbook acquisition two.',
    },
  );

  createSlot(
    db,
    characterId,
    classChildSourceId,
    echoWard,
    'a-child-known-echo:1',
    1,
    { bucket: 'known', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    clericSourceId,
    reverseWard,
    'a-cleric-prepared-reverse:1',
    1,
    { bucket: 'prepared', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    classChildSourceId,
    reverseWard,
    'z-child-known-reverse:1',
    1,
    { bucket: 'known', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    clericSourceId,
    echoWard,
    'z-cleric-prepared-echo:1',
    1,
    { bucket: 'prepared', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    subclassSourceId,
    echoWard,
    'wizard-known-echo:1',
    1,
    { bucket: 'known', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    clericSourceId,
    directBeacon,
    'cleric-direct:1',
    1,
    { bucket: 'known', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    classChildSourceId,
    childSpark,
    'cleric-child-cantrip:1',
    1,
    {
      bucket: 'cantrip_known',
      levelMin: 0,
      levelMax: 0,
      withSlots: false,
    },
  );
  createSlot(
    db,
    characterId,
    classChildSourceId,
    placeholder,
    'cleric-kept-placeholder:1',
    1,
    {
      bucket: 'known',
      state: 'kept_override',
      eligibility: 'invalid',
      invalidReason: 'Placeholder level is not eligible for a normal slot.',
      overrideNote: 'Explicitly retained imported placeholder.',
    },
  );
  createSlot(
    db,
    characterId,
    subclassSourceId,
    subclassVeil,
    'subclass-known:1',
    1,
    { bucket: 'known', levelMin: 1, levelMax: 1 },
  );
  const alwaysSlotId = createSlot(
    db,
    characterId,
    subclassSourceId,
    alwaysLantern,
    'subclass-automatic:1',
    1,
    {
      bucket: 'automatic',
      fixed: true,
      levelMin: 2,
      levelMax: 2,
    },
  );
  db.exec(
    'UPDATE spell_selection_slots SET always_prepared = 1 WHERE id = ?',
    [alwaysSlotId],
  );
  createSlot(
    db,
    characterId,
    standaloneSourceId,
    giftFlame,
    'gift-automatic:1',
    1,
    {
      bucket: 'automatic',
      fixed: true,
      levelMin: 1,
      levelMax: 1,
    },
  );

  createSlot(
    db,
    characterId,
    standaloneSourceId,
    activeInvalid,
    'excluded-invalid:1',
    1,
    {
      bucket: 'known',
      levelMin: 0,
      levelMax: 1,
      eligibility: 'invalid',
      invalidReason: 'Level 2 exceeds the fixture slot maximum.',
    },
  );
  createSlot(
    db,
    characterId,
    standaloneSourceId,
    inactive,
    'excluded-inactive:1',
    1,
    { bucket: 'known', levelMin: 1, levelMax: 1 },
  );
  createSlot(
    db,
    characterId,
    standaloneSourceId,
    orphaned,
    'excluded-orphaned:1',
    1,
    {
      bucket: 'known',
      state: 'orphaned',
      orphanReason: 'grant_rule_removed',
    },
  );
  createSlot(
    db,
    characterId,
    standaloneSourceId,
    null,
    'excluded-empty:1',
    1,
    { bucket: 'known' },
  );
  createSlot(
    db,
    characterId,
    standaloneSourceId,
    spellbookBucket,
    'excluded-spellbook-bucket:1',
    1,
    { bucket: 'spellbook', levelMin: 1, levelMax: 1 },
  );
  db.exec(
    `INSERT INTO wizard_spellbook_entries (
       character_id, source_instance_id, rule_key, ordinal,
       spell_version_id, spell_level_min, spell_level_max,
       state, selection_eligibility
     ) VALUES (?, ?, 'fixture-spellbook', 1, ?, 0, 9, 'active', 'valid')`,
    [characterId, subclassSourceId, ritualOnly],
  );
  // Deliberately noncanonical insertion order. Echo Ward is already selected
  // in the Wizard group, so it proves the unprepared bucket does not duplicate
  // a prepared/known row.
  for (const [ordinal, spellVersionId] of [
    comprehendLanguages,
    echoWard,
    chromaticOrb,
  ].entries()) {
    db.exec(
      `INSERT INTO wizard_spellbook_entries (
         character_id, source_instance_id, rule_key, ordinal,
         acquired_at_class_level, spell_version_id,
         spell_level_min, spell_level_max, state, selection_eligibility
       ) VALUES (?, ?, 'wizard-spellbook', ?, 2, ?, 1, 1, 'active', 'valid')`,
      [characterId, subclassSourceId, ordinal + 7, spellVersionId],
    );
  }

  return {
    characterId,
    classIds: { cleric: clericClassId, wizard: wizardClassId },
    sourceIds: {
      cleric: clericSourceId,
      wizardSubclass: subclassSourceId,
      classChild: classChildSourceId,
      standalone: standaloneSourceId,
    },
    spellIds: {
      childSpark,
      directBeacon,
      echoWard,
      reverseWard,
      placeholder,
      subclassVeil,
      alwaysLantern,
      giftFlame,
      activeInvalid,
      inactive,
      orphaned,
      spellbookBucket,
      ritualOnly,
      chromaticOrb,
      comprehendLanguages,
    },
  };
}

/**
 * Controlled SS-4 browser/parity image. It keeps every persisted fact carried
 * by the retired printable fixture while expressing only D149 sheet subjects:
 * current selections, class provenance, full stored text, and one free cast.
 */
export function createSheetSpellRetirementFixture(
  db: DatabaseContext,
): SheetSpellRetirementFixture {
  seedClassProgressions(db);
  const clericClassId = classDefinitionId(db, 'Cleric');
  const druidClassId = classDefinitionId(db, 'Druid');
  const wizardClassId = classDefinitionId(db, 'Wizard');
  const giftDefinitionId = createDefinition(db, 'feat', {
    name: 'SS-4 Gift',
  });
  const characterId = createCharacter(db, 'P50 Printable', {
    intelligence: 16,
    wisdom: 14,
    charisma: 18,
  });
  addClassLevel(db, characterId, 'Wizard', 1);
  addClassLevel(db, characterId, 'Druid', 1);
  addClassLevel(db, characterId, 'Cleric', 1);

  const clericSourceId = createSource(
    db,
    characterId,
    'class',
    clericClassId,
    'Cleric 1',
  );
  const druidSourceId = createSource(
    db,
    characterId,
    'class',
    druidClassId,
    'Druid 1',
  );
  const wizardSourceId = createSource(
    db,
    characterId,
    'class',
    wizardClassId,
    'Wizard 1',
  );
  // Insert Gift 10 before Gift 2 so source ordering cannot follow row ids.
  const gift10SourceId = createSource(
    db,
    characterId,
    'feat',
    giftDefinitionId,
    'Gift 10',
    { config: { spellcasting_ability: 'charisma' } },
  );
  const gift2SourceId = createSource(
    db,
    characterId,
    'feat',
    giftDefinitionId,
    'Gift 2',
    { config: { spellcasting_ability: 'charisma' } },
  );

  const command = createReferenceSpell(db, 'Command', {
    level: 1,
    school: 'Enchantment',
    castingTime: 'Action',
    actionType: 'Action',
    range: '60 feet',
    duration: '1 round',
    components: 'V',
    description: RETIREMENT_COMMAND_PROSE,
    saveAbilities: ['wisdom'],
    lists: ['Cleric'],
  });
  const guidance = createReferenceSpell(db, 'Guidance', {
    level: 0,
    description: 'A brief divine nudge.',
    lists: ['Cleric'],
  });
  const goodberry = createReferenceSpell(db, 'Goodberry', {
    level: 1,
    school: 'Transmutation',
    castingTime: 'Action',
    description: null,
    lists: ['Druid'],
  });
  const thornWhip = createReferenceSpell(db, 'Thorn Whip', {
    level: 0,
    school: 'Transmutation',
    castingTime: 'Bonus Action',
    actionType: 'Bonus Action',
    range: '30 feet',
    duration: 'Instantaneous',
    components: 'V, S, M',
    description: RETIREMENT_LONG_PROSE,
    attackModes: ['melee_spell', 'ranged_spell'],
    lists: ['Druid'],
  });
  const mageHand = createReferenceSpell(db, 'Mage Hand', {
    level: 0,
    description: 'A spectral hand appears.',
  });
  const shield = createReferenceSpell(db, 'Shield', {
    level: 1,
    castingTime: 'Reaction',
    actionType: 'Reaction',
    range: 'Self',
    duration: '1 round',
    components: 'V, S',
    description: 'A sudden magical barrier.',
    lists: ['Wizard'],
  });
  const detectMagic = createReferenceSpell(db, 'Detect Magic', {
    level: 1,
    school: 'Divination',
    castingTime: 'Action or Ritual',
    duration: 'Concentration, up to 10 minutes',
    concentration: true,
    ritual: true,
    description: 'Sense magic nearby.',
    lists: ['Wizard'],
  });
  const unseenServant = createReferenceSpell(db, 'Unseen Servant', {
    level: 1,
    school: 'Conjuration',
    castingTime: 'Action',
    description: 'An invisible servant performs simple tasks.',
    lists: ['Wizard'],
  });
  const mistyStep = createReferenceSpell(db, 'Misty Step', {
    level: 2,
    school: 'Conjuration',
    castingTime: 'Bonus Action',
    actionType: 'Bonus Action',
    range: 'Self',
    duration: 'Instantaneous',
    description: 'Teleport a short distance.',
  });
  const faerieFire = createReferenceSpell(db, 'Faerie Fire', {
    level: 1,
    school: 'Evocation',
    castingTime: 'Action',
    concentration: true,
    description: 'Outline creatures in revealing light.',
    saveAbilities: ['dexterity'],
  });

  const commandSlotId = createSlot(
    db,
    characterId,
    clericSourceId,
    command,
    'cleric-prepared-command:1',
    1,
    { bucket: 'prepared', levelMin: 1, levelMax: 1 },
  );
  createSlot(db, characterId, clericSourceId, guidance, 'cleric-cantrip:1', 1, {
    bucket: 'cantrip_known',
    levelMin: 0,
    levelMax: 0,
    withSlots: false,
  });
  createSlot(db, characterId, druidSourceId, goodberry, 'druid-known:1', 1, {
    bucket: 'known',
    levelMin: 1,
    levelMax: 1,
  });
  createSlot(db, characterId, druidSourceId, thornWhip, 'druid-cantrip:1', 1, {
    bucket: 'cantrip_known',
    levelMin: 0,
    levelMax: 0,
    withSlots: false,
  });
  createSlot(db, characterId, wizardSourceId, command, 'wizard-known:1', 1, {
    bucket: 'known',
    levelMin: 1,
    levelMax: 1,
  });
  createSlot(db, characterId, wizardSourceId, mageHand, 'wizard-cantrip:1', 1, {
    bucket: 'cantrip_known',
    levelMin: 0,
    levelMax: 0,
    withSlots: false,
  });
  createSlot(db, characterId, wizardSourceId, shield, 'wizard-prepared:1', 1, {
    bucket: 'prepared',
    levelMin: 1,
    levelMax: 1,
  });
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
    `UPDATE spell_selection_slots SET free_cast = ? WHERE id = ?`,
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
      levelMin: 1,
      levelMax: 1,
      withSlots: false,
    },
  );
  db.exec(
    `UPDATE spell_selection_slots SET free_cast = ? WHERE id = ?`,
    [
      JSON.stringify({
        uses: 2,
        recovery: 'dawn',
        pool_scope: 'shared',
      }),
      faerieFireSlotId,
    ],
  );
  for (const [index, spellId] of [
    detectMagic,
    shield,
    unseenServant,
  ].entries()) {
    db.exec(
      `INSERT INTO wizard_spellbook_entries (
         character_id, source_instance_id, rule_key, ordinal,
         spell_version_id, spell_level_min, spell_level_max,
         state, selection_eligibility
       ) VALUES (?, ?, 'fixture-spellbook', ?, ?, 0, 9, 'active', 'valid')`,
      [characterId, wizardSourceId, index + 1, spellId],
    );
  }
  // D162 makes the appendix optional. Seeding this named preference lets the
  // retirement tests exercise printing while retaining a byte-exact no-write
  // oracle across render, print entry/exit, print-button click, and reload.
  db.exec(
    `INSERT INTO character_rule_overrides (
       character_id, rule_key, value, note
     ) VALUES (?, 'print_appendix_spells', 'true', NULL)`,
    [characterId],
  );

  return {
    characterId,
    spellIds: {
      command,
      detectMagic,
      faerieFire,
      goodberry,
      mistyStep,
      thornWhip,
      unseenServant,
    },
    slotIds: {
      command: commandSlotId,
      faerieFire: faerieFireSlotId,
      mistyStep: mistyStepSlotId,
    },
  };
}

export {
  persistedReportTableHashes as persistedCharacterSheetSpellTableHashes,
};
