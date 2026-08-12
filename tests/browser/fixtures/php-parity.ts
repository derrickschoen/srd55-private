import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import { sqlInteger, sqlNullableInteger } from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  createBuildReportFixture,
  createCharacter,
  createSlot,
  createSource,
  createSpell,
  registerFixtureSpellFingerprintV1,
} from '../../integration/reports/build-report-fixture';
import {
  createSheetSpellRetirementFixture,
} from '../../integration/queries/character-sheet-spells-fixture';
import { registerBrowserFixtureContentIdentity } from './content-identity';

const schema = readFileSync(
  new URL('../../../src/db/schema.sql', import.meta.url),
  'utf8',
);

const sqlite3Promise = sqlite3InitModule();

export interface FixtureImage<TIds extends object> {
  readonly bytes: number[];
  readonly ids: TIds;
}

export interface SourceCatalogIds {
  readonly magicInitiate: number;
  readonly human: number;
  readonly background: number;
}

export interface WorkspaceFixtureIds {
  readonly character: number;
  readonly wizardSource: number;
  readonly magicInitiateSource: number;
  readonly nestedRoot: number;
  readonly nestedChild: number;
  readonly backgroundRoot: number;
  readonly backgroundChild: number;
  readonly targetSlot: number;
  readonly secondSlot: number;
  readonly attackSlot: number;
  readonly saveSlot: number;
  readonly originalSpell: number;
  readonly replacementSpell: number;
  readonly alternateSpell: number;
  readonly attackSpell: number;
  readonly saveSpell: number;
  readonly legacySpell: number;
  readonly acquisitionSpell: number;
  readonly sorcererClass: number;
  readonly wizardClass: number;
  readonly humanDefinition: number;
  readonly backgroundDefinition: number;
  readonly magicInitiateDefinition: number;
  readonly classSourceCharacter: number | null;
}

interface WorkspaceFixtureOptions {
  readonly primaryCharacterAbilities?: {
    readonly strength?: number;
    readonly dexterity?: number;
  };
  readonly createQualifyingClassSourceCharacter?: boolean;
}

export interface ReportFixtureIds {
  readonly character: number;
  readonly invalidSlots: readonly number[];
  readonly mageHand: number;
  readonly shield2014: number;
  readonly shield2024: number;
}

export interface SheetSpellFixtureIds {
  readonly character: number;
  readonly command: number;
  readonly mistyStep: number;
  readonly commandSlot: number;
  readonly faerieFireSlot: number;
  readonly mistyStepSlot: number;
}

function magicInitiateRules(): readonly Record<string, unknown>[] {
  return [
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
      free_cast: {
        uses: 1,
        recovery: 'long_rest',
        pool_scope: 'per_spell',
      },
    },
  ];
}

function seedSourceCatalog(
  db: DatabaseContext,
  existingMagicInitiateId?: number,
): SourceCatalogIds {
  registerBrowserFixtureContentIdentity(db, {
    kind: 'feat',
    contentKey: '2024:feat:magic-initiate',
    name: 'Magic Initiate',
    keyKind: 'bundled-stable',
  });
  const magicInitiate =
    existingMagicInitiateId ??
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, category, repeatable, grant_rules
       ) VALUES (
         '2024:feat:magic-initiate', 'Magic Initiate', '2024', 'origin', 1, ?
       )`,
      [JSON.stringify(magicInitiateRules())],
    ).lastInsertId;

  if (existingMagicInitiateId !== undefined) {
    db.exec(
      `UPDATE feat_definitions
       SET content_key = '2024:feat:magic-initiate',
           category = 'origin',
           repeatable = 1,
           grant_rules = ?
       WHERE id = ?`,
      [JSON.stringify(magicInitiateRules()), magicInitiate],
    );
  }

  const nestedRule = (key: string) =>
    JSON.stringify([
      {
        kind: 'grant_source',
        rule_key: key,
        source_type: 'feat',
        source_definition_id: magicInitiate,
        child_config_config: 'origin_feat_config',
      },
    ]);
  // NOT '2024:species:human', deliberately: S-B's boot seeding owns that
  // bundled key (Human anchors the Skillful grant) and reconciles its
  // definition on every start, so a fixture squatting on it had its nested
  // Magic Initiate rule silently rewritten to the bundled empty rule set —
  // which is exactly what happened, unobserved, while this suite could not
  // collect. A fixture species keeps a key seeding will never claim.
  const humanContentKey = '2024:species:parity-human';
  registerBrowserFixtureContentIdentity(db, {
    kind: 'species',
    contentKey: humanContentKey,
    name: 'Parity Human',
    keyKind: 'bundled-stable',
  });
  const human = db.exec(
    `INSERT INTO species_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (?, 'Parity Human', '2024', 0, ?)`,
    [humanContentKey, nestedRule('human-origin-feat')],
  ).lastInsertId;
  // This replacement-image source is a bundled aggregate, so keep both
  // halves present just like production seeding. CI-3s fingerprints the whole
  // aggregate and must not have to invent a missing template half at boot.
  db.exec(
    `INSERT INTO species_templates (
       content_key, name, rules_edition, creature_type, size,
       alternate_size, base_speed_feet
     ) VALUES (?, 'Parity Human', '2024', 'humanoid', 'medium', NULL, 30)`,
    [humanContentKey],
  );
  const backgroundContentKey = '2024:background:custom';
  registerBrowserFixtureContentIdentity(db, {
    kind: 'background',
    contentKey: backgroundContentKey,
    name: 'Custom Background',
    keyKind: 'bundled-stable',
  });
  const background = db.exec(
    `INSERT INTO background_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (
       ?, 'Custom Background', '2024', 0, ?
     )`,
    [backgroundContentKey, nestedRule('background-origin-feat')],
  ).lastInsertId;
  db.exec(
    `INSERT INTO background_templates (
       content_key, name, rules_edition, ability_score_1, ability_score_2,
       ability_score_3, feat_name, default_origin_feat_content_key,
       skill_proficiency_1,
       skill_proficiency_2, tool_proficiency, equipment_option_a,
       equipment_option_b
     ) VALUES (
       ?, 'Custom Background', '2024', 'intelligence', 'wisdom', 'charisma',
       'Magic Initiate (Cleric)', '2024:feat:magic-initiate',
       'Arcana', 'Religion', '', '', ''
     )`,
    [backgroundContentKey],
  );
  return { magicInitiate, human, background };
}

function seedNestedMagicInitiateFixture(
  db: DatabaseContext,
  characterId: number,
  root: {
    readonly type: 'species' | 'background';
    readonly definitionId: number;
    readonly displayName: string;
    readonly ruleKey: string;
  },
  magicInitiateDefinitionId: number,
  chosenList: 'Cleric' | 'Druid' | 'Wizard',
  spellcastingAbility: 'intelligence' | 'wisdom' | 'charisma',
): { readonly rootId: number; readonly childId: number } {
  const acquiredAtCharacterLevel = Number(
    db.scalar(
      `SELECT COALESCE(SUM(level), 0)
       FROM character_class_levels
       WHERE character_id = ?`,
      [characterId],
    ),
  );
  const childConfig = {
    chosen_list: chosenList,
    spellcasting_ability: spellcastingAbility,
  };
  const magicInitiateName = String(
    db.scalar(
      'SELECT name FROM feat_definitions WHERE id = ?',
      [magicInitiateDefinitionId],
    ),
  );
  const now = new Date().toISOString();
  const rootId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      characterId,
      crypto.randomUUID(),
      root.type,
      root.definitionId,
      root.displayName,
      JSON.stringify({
        origin_feat_key: '2024:feat:magic-initiate',
        origin_feat_config: childConfig,
      }),
      acquiredAtCharacterLevel,
      now,
      now,
    ],
  ).lastInsertId;
  const childUuid = crypto.randomUUID();
  const childId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, parent_source_instance_id, source_type,
       source_definition_id, display_name, config,
       acquired_at_character_level, state, notes, created_at, updated_at
     ) VALUES (?, ?, ?, 'feat', ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      characterId,
      childUuid,
      rootId,
      magicInitiateDefinitionId,
      `${magicInitiateName}: ${chosenList}`,
      JSON.stringify(childConfig),
      acquiredAtCharacterLevel,
      `grant_rule:${root.ruleKey}:1`,
      now,
      now,
    ],
  ).lastInsertId;

  for (let ordinal = 1; ordinal <= 2; ordinal += 1) {
    const slotId = createSlot(
      db,
      characterId,
      childId,
      null,
      `${childUuid}:magic-initiate-cantrips:${String(ordinal)}`,
      ordinal,
      {
        bucket: 'cantrip_known',
        levelMax: 0,
        withSlots: false,
        allowedSpellLists: [chosenList],
      },
    );
    db.exec(
      `UPDATE spell_selection_slots
       SET rule_key = 'magic-initiate-cantrips'
       WHERE id = ?`,
      [slotId],
    );
  }
  const levelOneSlotId = createSlot(
    db,
    characterId,
    childId,
    null,
    `${childUuid}:magic-initiate-level-one:1`,
    1,
    {
      bucket: 'known',
      levelMin: 1,
      levelMax: 1,
      allowedSpellLists: [chosenList],
    },
  );
  db.exec(
    `UPDATE spell_selection_slots
     SET rule_key = 'magic-initiate-level-one',
         free_cast = ?
     WHERE id = ?`,
    [
      JSON.stringify({
        uses: 1,
        recovery: 'long_rest',
        pool_scope: 'per_spell',
      }),
      levelOneSlotId,
    ],
  );

  return { rootId, childId };
}

function addListMembership(
  db: DatabaseContext,
  spellVersionId: number,
  list: string,
): void {
  db.exec(
    `INSERT INTO spell_list_memberships (
       spell_version_id, spell_list_key
     ) VALUES (?, ?)`,
    [spellVersionId, list],
  );
}

function controlledSpell(
  db: DatabaseContext,
  key: string,
  name: string,
  options: {
    readonly level?: number;
    readonly edition?: '2014' | '2024';
    readonly list?: string;
    readonly attack?: boolean;
    readonly save?: string;
  } = {},
): number {
  const id = createSpell(db, name, {
    level: options.level ?? 0,
    edition: options.edition ?? '2024',
    contentIdentity: { contentKey: key, keyKind: 'bundled-stable' },
    deferFingerprint: true,
  });
  if (options.list !== undefined) {
    addListMembership(db, id, options.list);
  }
  if (options.attack === true) {
    db.exec(
      `INSERT INTO spell_version_attack_modes (
         spell_version_id, attack_mode
       ) VALUES (?, 'ranged_spell')`,
      [id],
    );
  }
  if (options.save !== undefined) {
    db.exec(
      `INSERT INTO spell_version_save_abilities (
         spell_version_id, save_ability
       ) VALUES (?, ?)`,
      [id, options.save],
    );
  }
  registerFixtureSpellFingerprintV1(db, id);
  return id;
}

async function database(): Promise<{
  readonly connection: InstanceType<
    Awaited<typeof sqlite3Promise>['oo1']['DB']
  >;
  readonly db: DatabaseContext;
}> {
  const sqlite3 = await sqlite3Promise;
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  return { connection, db: new DatabaseContext(connection) };
}

async function image<TIds extends object>(
  build: (db: DatabaseContext) => TIds,
): Promise<FixtureImage<TIds>> {
  const sqlite3 = await sqlite3Promise;
  const { connection, db } = await database();
  const ids = build(db);
  const bytes = Array.from(sqlite3.capi.sqlite3_js_db_export(connection));
  connection.close();
  return { bytes, ids };
}

export async function workspaceFixtureImage(
  options: WorkspaceFixtureOptions = {},
): Promise<
  FixtureImage<WorkspaceFixtureIds>
> {
  return image((db) => {
    const fixture = createBuildReportFixture(
      db,
      options.primaryCharacterAbilities,
    );
    const classSourceCharacter =
      options.createQualifyingClassSourceCharacter === true
        ? createCharacter(db, 'Class Source Command', {
          intelligence: 13,
          charisma: 13,
        })
        : null;
    db.exec(
      `UPDATE characters
       SET allow_legacy = 0, notes = NULL
       WHERE id = ?`,
      [fixture.characterId],
    );
    // D86's portable/restorable column probe: a plain possession with no
    // effects, and a non-default quantity so a dropped/defaulted field is loud.
    db.exec(
      `INSERT INTO character_items (
         character_id, name, description, quantity, requires_attunement
       ) VALUES (?, 'Healing Potion', 'Browser parity possession', 4, 0)`,
      [fixture.characterId],
    );

    const catalog = seedSourceCatalog(db, Number(
      db.scalar(
        'SELECT source_definition_id FROM character_source_instances WHERE id = ?',
        [fixture.featSourceId],
      ),
    ));
    db.exec(
      `UPDATE character_source_instances
       SET display_name = 'Magic Initiate: Wizard',
           config = '{"chosen_list":"Wizard","spellcasting_ability":"intelligence"}'
       WHERE id = ?`,
      [fixture.featSourceId],
    );

    const replacementSpell = controlledSpell(
      db,
      '2024:parity-replacement',
      'Parity Replacement',
      { list: 'Wizard' },
    );
    const alternateSpell = controlledSpell(
      db,
      '2024:parity-alternate',
      'Parity Alternate',
      { list: 'Wizard' },
    );
    const attackSpell = controlledSpell(
      db,
      '2024:parity-attack',
      'Parity Attack',
      { list: 'Druid', attack: true },
    );
    const saveSpell = controlledSpell(
      db,
      '2024:parity-save',
      'Parity Save',
      { list: 'Druid', save: 'dexterity' },
    );
    const legacySpell = controlledSpell(
      db,
      '2014:parity-legacy',
      'Parity Legacy',
      { edition: '2014', list: 'Wizard' },
    );
    const acquisitionSpell = controlledSpell(
      db,
      '2024:parity-shield',
      'Parity Shield',
      { level: 1, list: 'Wizard' },
    );

    const wisdomSource = createSource(
      db,
      fixture.characterId,
      'feat',
      catalog.magicInitiate,
      'Wisdom parity source',
      { chosen_list: 'Druid', spellcasting_ability: 'wisdom' },
    );
    const attackSlot = createSlot(
      db,
      fixture.characterId,
      wisdomSource,
      attackSpell,
      'parity-attack:1',
      1,
      { bucket: 'cantrip_known', levelMax: 0, withSlots: false },
    );
    const saveSlot = createSlot(
      db,
      fixture.characterId,
      wisdomSource,
      saveSpell,
      'parity-save:1',
      1,
      { bucket: 'cantrip_known', levelMax: 0, withSlots: false },
    );

    const nestedSpecies = seedNestedMagicInitiateFixture(
      db,
      fixture.characterId,
      {
        type: 'species',
        definitionId: catalog.human,
        displayName: 'Parity Human',
        ruleKey: 'human-origin-feat',
      },
      catalog.magicInitiate,
      'Cleric',
      'wisdom',
    );
    const nestedBackground = seedNestedMagicInitiateFixture(
      db,
      fixture.characterId,
      {
        type: 'background',
        definitionId: catalog.background,
        displayName: 'Custom Background',
        ruleKey: 'background-origin-feat',
      },
      catalog.magicInitiate,
      'Druid',
      'intelligence',
    );
    const nestedRoot = nestedSpecies.rootId;
    const nestedChild = nestedSpecies.childId;
    const backgroundRoot = nestedBackground.rootId;
    const backgroundChild = nestedBackground.childId;
    const wizardSlots = db.all(
      `SELECT id, current_spell_version_id
       FROM spell_selection_slots
       WHERE character_id = ? AND source_instance_id = ?
         AND rule_key = 'wizard-cantrip'
       ORDER BY id`,
      [fixture.characterId, fixture.wizardSourceId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        // NULLABLE, and the old `number` type param said otherwise: an unassigned
        // cantrip slot stores NULL here, and this fixture picks the first slot
        // whether or not it holds a spell.
        current_spell_version_id: sqlNullableInteger(
          row,
          'current_spell_version_id',
        ),
      }),
    );
    const targetSlot = wizardSlots[0]!;
    // The fixture's whole point is a slot that ALREADY HOLDS a spell — every
    // parity assertion downstream compares against `originalSpell` as a real
    // version id. The old `db.all<{ current_spell_version_id: number }>` type
    // param asserted that without checking it, so a fixture that silently
    // stopped assigning the cantrip would have travelled all the way to a
    // browser assertion comparing `null` to a rendered name. Checked here, once.
    if (targetSlot.current_spell_version_id === null) {
      throw new Error(
        'The parity fixture expects the first wizard cantrip slot to hold a spell.',
      );
    }
    const originalSpell = targetSlot.current_spell_version_id;
    const secondSlot = Number(
      db.scalar(
        `SELECT id FROM spell_selection_slots
         WHERE character_id = ? AND id != ?
           AND spell_level_max = 0 AND is_locked = 0
         ORDER BY id LIMIT 1`,
        [fixture.characterId, targetSlot.id],
      ),
    );

    return {
      character: fixture.characterId,
      wizardSource: fixture.wizardSourceId,
      magicInitiateSource: fixture.featSourceId,
      nestedRoot,
      nestedChild,
      backgroundRoot,
      backgroundChild,
      targetSlot: targetSlot.id,
      secondSlot,
      attackSlot,
      saveSlot,
      originalSpell,
      replacementSpell,
      alternateSpell,
      attackSpell,
      saveSpell,
      legacySpell,
      acquisitionSpell,
      sorcererClass: Number(
        db.scalar("SELECT id FROM class_definitions WHERE name = 'Sorcerer'"),
      ),
      wizardClass: Number(
        db.scalar("SELECT id FROM class_definitions WHERE name = 'Wizard'"),
      ),
      humanDefinition: catalog.human,
      backgroundDefinition: catalog.background,
      magicInitiateDefinition: catalog.magicInitiate,
      classSourceCharacter,
    };
  });
}

export async function reportFixtureImage(): Promise<
  FixtureImage<ReportFixtureIds>
> {
  return image((db) => {
    const fixture = createBuildReportFixture(db);
    return {
      character: fixture.characterId,
      invalidSlots: fixture.invalidSlotIds,
      mageHand: fixture.spellIds.mageHand,
      shield2014: fixture.spellIds.shield2014,
      shield2024: fixture.spellIds.shield2024,
    };
  });
}

export async function sheetSpellFixtureImage(): Promise<
  FixtureImage<SheetSpellFixtureIds>
> {
  return image((db) => {
    const fixture = createSheetSpellRetirementFixture(db);
    return {
      character: fixture.characterId,
      command: fixture.spellIds.command,
      mistyStep: fixture.spellIds.mistyStep,
      commandSlot: fixture.slotIds.command,
      faerieFireSlot: fixture.slotIds.faerieFire,
      mistyStepSlot: fixture.slotIds.mistyStep,
    };
  });
}

export async function catalogBaseFixtureImage(): Promise<
  FixtureImage<SourceCatalogIds>
> {
  return image((db) => {
    seedClassProgressions(db);
    return seedSourceCatalog(db);
  });
}

/**
 * The abbreviated `'Action or R'` and `'C, up to 1 minute'` below are the PHP
 * catalog's notation, and they are KEPT ON PURPOSE now that they decide nothing.
 * Until F13 the importer read them with a regex and OR-ed the result into the
 * `ritual`/`concentration` tags; both flags here are declared `true`, so the
 * tags this fixture's assertions expect come from the declaration either way.
 * An override that sets both to `false` — `php-feature-parity.spec.ts`'s Journey
 * Spell — inherits this prose and is now correctly left untagged.
 */
export function catalogRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    identityKey: 'php-parity-spell',
    versionKey: '2024:php-parity-spell',
    name: 'PHP Parity Spell',
    edition: '2024',
    level: 0,
    school: 'Evocation',
    castingTime: 'Action or R',
    range: '60 feet',
    components: 'V, S',
    duration: 'C, up to 1 minute',
    concentration: true,
    ritual: true,
    attackModes: ['ranged_spell'],
    saveAbilities: ['wisdom'],
    effectReliabilityCategory: 'attack_roll',
    spellLists: ['Wizard'],
    sourceBooks: ['Parity Book'],
    sourcePage: 81,
    sourceSlug: 'php-parity-spell',
    tags: ['parity'],
    ...overrides,
  };
}
