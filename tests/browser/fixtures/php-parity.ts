import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import { AddSourceCommand } from '../../../src/commands/add-source';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  createBuildReportFixture,
  createSlot,
  createSource,
  createSpell,
} from '../../integration/reports/build-report-fixture';
import {
  createPrintableListFixture,
} from '../../integration/reports/printable-list-fixture';

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
}

export interface ReportFixtureIds {
  readonly character: number;
  readonly invalidSlots: readonly number[];
  readonly mageHand: number;
  readonly shield2014: number;
  readonly shield2024: number;
}

export interface PrintableFixtureIds {
  readonly character: number;
  readonly command: number;
  readonly mistyStep: number;
  readonly commandSlot: number;
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
  const magicInitiate =
    existingMagicInitiateId ??
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         '2024:feat:magic-initiate', 'Magic Initiate', '2024', 1, ?
       )`,
      [JSON.stringify(magicInitiateRules())],
    ).lastInsertId;

  if (existingMagicInitiateId !== undefined) {
    db.exec(
      `UPDATE feat_definitions
       SET content_key = '2024:feat:magic-initiate',
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
  const human = db.exec(
    `INSERT INTO species_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES ('2024:species:human', 'Human', '2024', 0, ?)`,
    [nestedRule('human-origin-feat')],
  ).lastInsertId;
  const background = db.exec(
    `INSERT INTO background_definitions (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (
       '2024:background:custom', 'Custom Background', '2024', 0, ?
     )`,
    [nestedRule('background-origin-feat')],
  ).lastInsertId;
  return { magicInitiate, human, background };
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
  });
  db.exec(
    'UPDATE spell_versions SET content_key = ? WHERE id = ?',
    [key, id],
  );
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

export async function workspaceFixtureImage(): Promise<
  FixtureImage<WorkspaceFixtureIds>
> {
  return image((db) => {
    const fixture = createBuildReportFixture(db);
    db.exec(
      `UPDATE characters
       SET allow_legacy = 0
       WHERE id = ?`,
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

    const integrity = new CharacterCommandIntegrity(
      'php-feature-parity-fixture',
    );
    new AddSourceCommand(
      db,
      {
        type: 'add_source',
        source_type: 'species',
        source_definition_id: catalog.human,
        config: {
          origin_feat_key: '2024:feat:magic-initiate',
          origin_feat_config: {
            chosen_list: 'Cleric',
            spellcasting_ability: 'wisdom',
          },
        },
      },
      integrity,
    ).apply(fixture.characterId);
    new AddSourceCommand(
      db,
      {
        type: 'add_source',
        source_type: 'background',
        source_definition_id: catalog.background,
        config: {
          origin_feat_key: '2024:feat:magic-initiate',
          origin_feat_config: {
            chosen_list: 'Druid',
            spellcasting_ability: 'intelligence',
          },
        },
      },
      integrity,
    ).apply(fixture.characterId);

    const nestedRoot = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'species'
         ORDER BY id LIMIT 1`,
        [fixture.characterId],
      ),
    );
    const nestedChild = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE parent_source_instance_id = ?`,
        [nestedRoot],
      ),
    );
    const backgroundRoot = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'background'
         ORDER BY id LIMIT 1`,
        [fixture.characterId],
      ),
    );
    const backgroundChild = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE parent_source_instance_id = ?`,
        [backgroundRoot],
      ),
    );
    const wizardSlots = db.all<{ id: number; current_spell_version_id: number }>(
      `SELECT id, current_spell_version_id
       FROM spell_selection_slots
       WHERE character_id = ? AND source_instance_id = ?
         AND rule_key = 'wizard-cantrip'
       ORDER BY id`,
      [fixture.characterId, fixture.wizardSourceId],
    );
    const targetSlot = wizardSlots[0]!;
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
      originalSpell: targetSlot.current_spell_version_id,
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

export async function printableFixtureImage(): Promise<
  FixtureImage<PrintableFixtureIds>
> {
  return image((db) => {
    const fixture = createPrintableListFixture(db);
    return {
      character: fixture.characterId,
      command: fixture.spellIds.command,
      mistyStep: fixture.spellIds.mistyStep,
      commandSlot: fixture.slotIds.command,
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
