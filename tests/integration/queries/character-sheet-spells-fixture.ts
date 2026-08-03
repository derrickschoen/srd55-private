import type { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedClassResources } from '../../../src/rules/class-resources-srd';
import {
  addClassLevel,
  classDefinitionId,
  createCharacter,
  createSlot,
  createSpell,
  persistedReportTableHashes,
} from '../reports/build-report-fixture';

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

/**
 * D91-R's resource projection for the fixture's Cleric 1 + Wizard 1 levels.
 *
 * This byte oracle is hand-authored from the sourced class progressions: the
 * two full-caster levels produce three level-1 slots, and Wizard's Arcane
 * Recovery remains the existing explicit feature-text absence. It must never
 * be regenerated from CharacterSheetBuilder output.
 */
export const HAND_AUTHORED_D91_R_RESOURCE_BYTES = new TextEncoder().encode(
  '[{"status":"absent","id":"resource:feature-text-not-modelled","kind":null,"class_name":null,"reason":"feature_text_maximum_not_modelled","detail":"Arcane Recovery is a slot-level budget, while Mystic Arcanum and Signature Spells are per-spell single uses; use their printed feature text."},{"status":"computed","id":"resource:spell-slot:1","kind":"spell_slot","class_definition_id":null,"class_name":null,"class_level":null,"spell_level":1,"maximum":3,"computation":{"kind":"shared_spell_slots","effective_caster_level":2}}]',
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
  readonly active?: boolean;
  readonly placeholder?: boolean;
}

let sequence = 0;

function key(label: string): string {
  sequence += 1;
  return `ss1:${label}:${sequence}`;
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
  return spellId;
}

export function createCharacterSheetSpellsFixture(
  db: DatabaseContext,
): CharacterSheetSpellsFixture {
  seedClassProgressions(db);
  seedClassResources(db);
  const clericClassId = classDefinitionId(db, 'Cleric');
  const wizardClassId = classDefinitionId(db, 'Wizard');
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
       character_id, spell_version_id
     ) VALUES (?, ?)`,
    [characterId, ritualOnly],
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

export {
  persistedReportTableHashes as persistedCharacterSheetSpellTableHashes,
};
