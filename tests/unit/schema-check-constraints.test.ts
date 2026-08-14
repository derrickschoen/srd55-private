import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ContentKind } from '../../src/catalog/content-identity';
import { DatabaseContext } from '../../src/db/database';
import { registerFixtureContentIdentity } from '../helpers/content-identity';
import { schemaSources } from '../helpers/schema-sources';

/**
 * BEHAVIOURAL PROOF OF EVERY CHECK CONSTRAINT.
 *
 * This is a deliberate extension of the pattern at the foot of
 * `tests/unit/invariants.test.ts`, which proves the exclusive-assignment CHECK
 * by attempting the illegal write and asserting SQLite's exact refusal. Every
 * case here does the same, against a real schema applied to a real database.
 *
 * WHAT THIS SUITE IS NOT, AND WHY THAT MATTERS.
 *
 *  - It does NOT compare the CHECK EXPRESSIONS to hand-copied expected text.
 *    That would be an echo of the artifact under test: it would fail on a typo
 *    and pass on a semantically wrong but well-formed constraint. Only
 *    behaviour is asserted.
 *  - It does NOT move anything in `tests/unit/schema.test.ts`, and nothing here
 *    could. That suite reads `PRAGMA table_info` — (name, type, notnull,
 *    dflt_value, pk) — and a CHECK constraint appears in NONE of those five
 *    fields, so `table_info` is byte-identical with and without one. A CHECK
 *    lives only in the DDL text, which is why its effect has to be EXECUTED
 *    rather than inspected, and why this file exists at all.
 *
 * THE ACCEPT SIDE IS NOT DECORATION. A constraint that rejects too much is
 * every bit as much a defect as one that rejects nothing, and it is the harder
 * one to notice — it surfaces as an import that fails on a user's machine. Each
 * case therefore states the legitimate values it must let through: the interior
 * of the range, BOTH boundaries, the defended nulls, the column default, and —
 * for `spell_versions_level_check` — the placeholder row whose `level = -1` is
 * exactly what the obvious form of that constraint would have broken.
 *
 * ON EXISTING DATABASES: see the block comment in `db/schema/columns.ts`. These
 * constraints bind rows written into a schema created from this artifact; they
 * do not reach back into an image that already exists.
 *
 * ONE THING HERE IS DELIBERATELY NOT ASSERTED, AND SAYING SO IS THE HONEST
 * ALTERNATIVE TO FAKING IT. `spell_versions_level_check` reads
 * `provenance IS 'placeholder'` rather than `=` so that a NULL `provenance`
 * cannot make the whole constraint evaluate to NULL — which SQLite PASSES. No
 * case below covers that, because `provenance` is `NOT NULL` and SQL therefore
 * offers no way to reach the row: any test of it would have to construct a
 * different schema and would be measuring SQLite's operators, not ours. It is
 * defence against a future nullability change, and it is written down here
 * instead of being asserted by a test that could not fail.
 */

type SqlValue = number | string | null;
type Values = Readonly<Record<string, SqlValue>>;
type Write = (db: Database) => void;

let sqlite3: Sqlite3Static;
const openDatabases: Database[] = [];
let sequence = 0;

/** Unique enough for every UNIQUE index these fixtures pass through. */
function uid(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

function checkError(constraint: string): string {
  return (
    'SQLITE_CONSTRAINT_CHECK: sqlite3 result code 275: ' +
    `CHECK constraint failed: ${constraint}`
  );
}

function caughtErrorMessage(action: () => void): string {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    throw error;
  }
  throw new Error('Expected SQLite operation to throw');
}

const ROOT_CONTENT_KINDS: Readonly<Record<string, ContentKind>> = {
  class_definitions: 'class',
  subclass_definitions: 'subclass',
  feat_definitions: 'feat',
  species_definitions: 'species',
  species_templates: 'species',
  background_definitions: 'background',
  background_templates: 'background',
  spell_versions: 'spell',
  weapon_templates: 'weapon',
  armor_templates: 'armor',
  item_definitions: 'item',
};

function insert(db: Database, table: string, values: Values): number {
  const kind = ROOT_CONTENT_KINDS[table];
  const contentKey = values.content_key;
  if (kind !== undefined && typeof contentKey === 'string') {
    const fixtureName = values.name ?? values.display_name ?? contentKey;
    registerFixtureContentIdentity(new DatabaseContext(db), {
      kind,
      contentKey,
      name: typeof fixtureName === 'string' ? fixtureName : contentKey,
      keyKind: 'bundled-stable',
    });
  }

  const columns = Object.keys(values);
  db.exec({
    sql: `INSERT INTO "${table}" (${columns
      .map((column) => `"${column}"`)
      .join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    bind: Object.values(values),
  });
  return Number(db.selectValue('SELECT last_insert_rowid()'));
}

/**
 * SQLite applies a CHECK to UPDATE exactly as it does to INSERT, so the writers
 * below that go through this function are not testing a second SQLite feature —
 * they are testing the path where the app's own risk actually lives. Three of
 * these constraints are realistically violated only by an edit to an existing
 * row: `spell_selection_slots.state` transitions, the `characters.revision`
 * counter, and the catalog importer's `UPDATE spell_versions`. And a
 * multi-column constraint under a SINGLE-column update is the one shape whose
 * behaviour is not obvious from the INSERT cases at all — SQLite re-evaluates
 * the whole expression against the merged row, so a legal `spell_level_max`
 * write can be refused because of a `spell_level_min` nobody touched. That is
 * asserted rather than assumed.
 */
function update(db: Database, table: string, id: number, values: Values): void {
  const columns = Object.keys(values);
  db.exec({
    sql: `UPDATE "${table}" SET ${columns
      .map((column) => `"${column}" = ?`)
      .join(', ')} WHERE "id" = ?`,
    bind: [...Object.values(values), id],
  });
}

// --- parent minters --------------------------------------------------------
// Every case mints its own parents so that no UNIQUE index makes one case's
// success depend on another case's ordering.

function newCharacter(db: Database, values: Values = {}): number {
  return insert(db, 'characters', { name: uid('character'), ...values });
}

function newClass(db: Database, values: Values = {}): number {
  return insert(db, 'class_definitions', {
    content_key: uid('class'),
    name: uid('Class'),
    rules_edition: '2024',
    ...values,
  });
}

function newSubclass(db: Database, classDefinitionId: number): number {
  return insert(db, 'subclass_definitions', {
    content_key: uid('subclass'),
    class_definition_id: classDefinitionId,
    name: uid('Subclass'),
    rules_edition: '2024',
  });
}

function newSpellIdentity(db: Database): number {
  const key = uid('identity');
  return insert(db, 'spell_identities', {
    content_key: key,
    canonical_name: key,
    normalized_name: key,
  });
}

function newSource(
  db: Database,
  characterId: number,
  values: Values = {},
): number {
  return insert(db, 'character_source_instances', {
    character_id: characterId,
    instance_uuid: uid('source'),
    source_type: 'feat',
    display_name: uid('Feat'),
    ...values,
  });
}

// --- row writers -----------------------------------------------------------
// Each takes only the columns the case is about; everything else is a valid
// default, so a failure can only be caused by the value under test.

const character =
  (values: Values): Write =>
  (db) => {
    newCharacter(db, values);
  };

const classLevel =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_class_levels', {
      character_id: newCharacter(db),
      class_definition_id: newClass(db),
      level: 3,
      ...values,
    });
  };

function newSlot(db: Database, values: Values = {}): number {
  const characterId = newCharacter(db);
  return insert(db, 'spell_selection_slots', {
    character_id: characterId,
    source_instance_id: newSource(db, characterId),
    slot_key: uid('slot'),
    rule_key: 'fixture-rule',
    bucket: 'known',
    eligibility_kind: 'choice_from_list',
    ...values,
  });
}

const slot =
  (values: Values): Write =>
  (db) => {
    newSlot(db, values);
  };

const wizardAcquisition =
  (
    values: Values,
    address: 'none' | 'complete' | 'source_only' = 'none',
  ): Write =>
  (db) => {
    const characterId = newCharacter(db);
    const sourceId =
      address === 'none' ? null : newSource(db, characterId);
    insert(db, 'wizard_spellbook_entries', {
      character_id: characterId,
      source_instance_id: sourceId,
      rule_key: address === 'complete' ? 'wizard-spellbook' : null,
      ordinal: address === 'complete' ? 1 : null,
      ...values,
    });
  };

const classDefinition =
  (values: Values): Write =>
  (db) => {
    newClass(db, values);
  };

const featDefinition =
  (values: Values): Write =>
  (db) => {
    insert(db, 'feat_definitions', {
      content_key: uid('feat'),
      name: uid('Feat'),
      rules_edition: '2024',
      ...values,
    });
  };

const classProgression =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_progressions', {
      class_definition_id: newClass(db),
      class_level: 5,
      ...values,
    });
  };

const subclassProgression =
  (values: Values): Write =>
  (db) => {
    insert(db, 'subclass_progressions', {
      subclass_definition_id: newSubclass(db, newClass(db)),
      class_level: 5,
      ...values,
    });
  };

function newSpellVersion(db: Database, values: Values = {}): number {
  return insert(db, 'spell_versions', {
    content_key: uid('2024:spell'),
    spell_identity_id: newSpellIdentity(db),
    display_name: uid('Spell'),
    rules_edition: '2024',
    level: 3,
    school: 'Evocation',
    ...values,
  });
}

const spellVersion =
  (values: Values): Write =>
  (db) => {
    newSpellVersion(db, values);
  };

const weapon =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_weapons', {
      character_id: newCharacter(db),
      name: uid('Weapon'),
      ...values,
    });
  };

const weaponTemplate =
  (values: Values): Write =>
  (db) => {
    insert(db, 'weapon_templates', {
      content_key: uid('weapon'),
      name: uid('Weapon'),
      srd_group: 'simple_melee',
      damage_kind: 'dice',
      damage_dice: '1d6',
      damage_type: 'Slashing',
      mastery_property: 'Sap',
      ...values,
    });
  };

const masteryGrant =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_weapon_mastery_grants', {
      class_definition_id: newClass(db),
      grant: 'not_granted',
      ...values,
    });
  };

const masteryCount =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_weapon_mastery_counts', {
      class_definition_id: newClass(db),
      class_level: 5,
      mastery_count: 2,
      ...values,
    });
  };

const classResource =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_resources', {
      class_definition_id: newClass(db),
      class_level: 5,
      resource_kind: 'rage',
      maximum: 3,
      ...values,
    });
  };

const classResourceFormula =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_resource_formulas', {
      class_definition_id: newClass(db),
      resource_kind: 'bardic_inspiration',
      formula_kind: 'fixed_count',
      minimum_class_level: 1,
      fixed_count: 1,
      ability: null,
      multiplier: null,
      later_fixed_count_steps: null,
      ...values,
    });
  };

// --- sheet core (D11/D12) --------------------------------------------------

const armorTemplate =
  (values: Values): Write =>
  (db) => {
    insert(db, 'armor_templates', {
      content_key: uid('armor'),
      name: uid('Armor'),
      category: 'medium',
      armor_class: 14,
      dex_bonus: 'capped',
      dex_bonus_max: 2,
      ...values,
    });
  };

/**
 * THE CHARACTER'S OWN ARMOUR, whose fillable columns are deliberately identical
 * to `armor_templates`' (D1b: picking a template is a column-wise copy), plus
 * `slot`.
 */
const characterArmor =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_armor', {
      character_id: newCharacter(db),
      slot: 'worn',
      name: uid('Armor'),
      category: 'medium',
      armor_class: 14,
      dex_bonus: 'capped',
      dex_bonus_max: 2,
      ...values,
    });
  };

const hitPointRoll =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_hit_point_rolls', {
      character_id: newCharacter(db),
      class_name: 'Fighter',
      class_level: 2,
      rolled_value: 7,
      ...values,
    });
  };

const skillProficiency =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_skill_proficiencies', {
      character_id: newCharacter(db),
      skill: 'stealth',
      ...values,
    });
  };

const skillGrant =
  (values: Values): Write =>
  (db) => {
    const characterId = newCharacter(db);
    insert(db, 'character_skill_grants', {
      character_id: characterId,
      source_instance_id: newSource(db, characterId),
      grant_key: 'class_skill',
      ordinal: 1,
      ...values,
    });
  };

const expertiseGrant =
  (values: Values): Write =>
  (db) => {
    const characterId = newCharacter(db);
    insert(db, 'character_skill_expertise_grants', {
      character_id: characterId,
      source_instance_id: newSource(db, characterId),
      grant_key: 'class_expertise_1',
      ordinal: 1,
      granted_at_class_level: 1,
      ...values,
    });
  };

const levelFeatChoice =
  (values: Values): Write =>
  (db) => {
    const characterId = newCharacter(db);
    const classLevelId = insert(db, 'character_class_levels', {
      character_id: characterId,
      class_definition_id: newClass(db),
      level: 20,
      is_starting_class: 1,
    });
    insert(db, 'character_level_feat_choices', {
      character_id: characterId,
      character_class_level_id: classLevelId,
      class_level: 4,
      choice_kind: 'asi_level_feat',
      ...values,
    });
  };

const characterItem =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_items', {
      character_id: newCharacter(db),
      name: uid('Item'),
      ...values,
    });
  };

const attunementSlotRow =
  (positions: readonly (number | null)[]): Write =>
  (db) => {
    const characterId = newCharacter(db);
    const itemIds = ['Crown', 'Cloak', 'Ring'].map((name) =>
      insert(db, 'character_items', {
        character_id: characterId,
        name: `${name} ${uid('item')}`,
      })
    );
    insert(db, 'character_attunement_slots', {
      character_id: characterId,
      slot_1_item_id:
        positions[0] === null ? null : itemIds[positions[0] ?? 0]!,
      slot_2_item_id:
        positions[1] === null ? null : itemIds[positions[1] ?? 1]!,
      slot_3_item_id:
        positions[2] === null ? null : itemIds[positions[2] ?? 2]!,
    });
  };

const sheetTraits =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_sheet_traits', {
      class_definition_id: newClass(db),
      hit_die: 8,
      skill_choice_count: 2,
      ...values,
    });
  };

const savingThrowProficiency =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_saving_throw_proficiencies', {
      class_definition_id: newClass(db),
      ability: 'dexterity',
      ...values,
    });
  };

const skillOption =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_skill_options', {
      class_definition_id: newClass(db),
      skill: 'stealth',
      ...values,
    });
  };

const armorTraining =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_armor_training', {
      class_definition_id: newClass(db),
      category: 'light',
      ...values,
    });
  };

const weaponProficiency =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_weapon_proficiencies', {
      class_definition_id: newClass(db),
      category: 'martial',
      ...values,
    });
  };

const extraAttackGrant =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_extra_attack_grants', {
      class_definition_id: newClass(db),
      class_level: 5,
      attack_count: 2,
      ...values,
    });
  };

const martialArtsDie =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_martial_arts_dice', {
      class_definition_id: newClass(db),
      class_level: 5,
      martial_arts_die: 8,
      ...values,
    });
  };

/**
 * A REAL DIE SIZE, WHICH `insert` PHYSICALLY CANNOT PRODUCE.
 *
 * JavaScript has one number type and sqlite-wasm binds an integral one as an
 * SQLite INTEGER, so `{ hit_die: 8.0 }` arrives as 8 and proves nothing. The
 * only way to hand the engine a REAL is to write the literal into the SQL text,
 * which is why these two writers exist instead of another `Values` case.
 *
 * They cover the gap a review found in this file: the `typeof(…) = 'integer'`
 * limb on both die CHECKs was justified in `db/schema/columns.ts` by a REAL
 * `8.0` that no case here had ever tried. It is tried now, in both directions —
 * `8.0` is ACCEPTED (INTEGER affinity converts it before the CHECK sees it) and
 * `8.5` is REFUSED (affinity cannot convert it losslessly, so it stays a REAL).
 */
const sheetTraitsRealHitDie =
  (literal: string): Write =>
  (db) => {
    db.exec(
      `INSERT INTO "class_sheet_traits"
         ("class_definition_id", "hit_die", "skill_choice_count")
       VALUES (${String(newClass(db))}, ${literal}, 2)`,
    );
  };

const martialArtsRealDie =
  (literal: string): Write =>
  (db) => {
    db.exec(
      `INSERT INTO "class_martial_arts_dice"
         ("class_definition_id", "class_level", "martial_arts_die")
       VALUES (${String(newClass(db))}, 5, ${literal})`,
    );
  };

// D19's two class-feature tables contain printed feature identity only. A
// feature with no mechanical effect is now the absence of a child row.
const subclassFeature =
  (values: Values): Write =>
  (db) => {
    insert(db, 'subclass_features', {
      subclass_definition_id: newSubclass(db, newClass(db)),
      class_level: 6,
      sort_order: 1,
      name: uid('Feature'),
      description: 'Printed feature text.',
      ...values,
    });
  };

const namedFeature =
  (values: Values): Write =>
  (db) => {
    insert(db, 'named_features', {
      content_key: uid('feature'),
      class_definition_id: newClass(db),
      name: uid('Feature'),
      rules_edition: '2024',
      prerequisite: 'Level 5+ Someclass',
      description: 'Printed feature text.',
      class_level: 5,
      ...values,
    });
  };

const subclassFeatureEffect =
  (values: Values): Write =>
  (db) => {
    const featureId = insert(db, 'subclass_features', {
      subclass_definition_id: newSubclass(db, newClass(db)),
      class_level: 6,
      sort_order: 1,
      name: uid('Feature'),
      description: 'Printed feature text.',
    });
    insert(db, 'subclass_feature_effects', {
      subclass_feature_id: featureId,
      sort_order: 1,
      label: uid('Grant'),
      ...values,
    });
  };

const namedFeatureEffect =
  (values: Values): Write =>
  (db) => {
    const featureId = insert(db, 'named_features', {
      content_key: uid('feature'),
      class_definition_id: newClass(db),
      name: uid('Feature'),
      rules_edition: '2024',
      prerequisite: 'Level 5+ Someclass',
      description: 'Printed feature text.',
      class_level: 5,
    });
    insert(db, 'named_feature_effects', {
      named_feature_id: featureId,
      sort_order: 1,
      ...values,
    });
  };

const classFeatureEffect =
  (values: Values): Write =>
  (db) => {
    insert(db, 'class_feature_effects', {
      class_definition_id: newClass(db),
      class_level: 5,
      name: uid('Feature'),
      ...values,
    });
  };

const STORED_SCALE_EXPRESSION = JSON.stringify({
  kind: 'scale',
  source: { kind: 'class_level', class_content_key: '2024:class:rogue' },
  divide: 2,
  round: 'ceiling',
});

function featureValueContribution(
  table:
    | 'class_feature_value_contributions'
    | 'subclass_feature_value_contributions',
  values: Values,
): Write {
  return (db) => {
    let ownerColumn: string;
    let ownerId: number;
    if (table === 'class_feature_value_contributions') {
      ownerColumn = 'class_definition_id';
      ownerId = newClass(db);
    } else {
      ownerColumn = 'subclass_feature_id';
      ownerId = insert(db, 'subclass_features', {
        subclass_definition_id: newSubclass(db, newClass(db)),
        class_level: 3,
        sort_order: 1,
        name: uid('Feature'),
        description: 'Printed feature text.',
      });
    }
    insert(db, table, {
      [ownerColumn]: ownerId,
      contribution_key: uid('contribution'),
      label: 'Sneak Attack',
      target_kind: 'feature_dice_count',
      target_key: 'sneak_attack',
      op: 'add',
      active_from_level: 1,
      active_to_level: 20,
      value_json: STORED_SCALE_EXPRESSION,
      supersedes_ref: null,
      ...values,
    });
  };
}

const classFeatureValueContribution = (values: Values): Write =>
  featureValueContribution('class_feature_value_contributions', values);

const subclassFeatureValueContribution = (values: Values): Write =>
  featureValueContribution('subclass_feature_value_contributions', values);

// --- edit writers ----------------------------------------------------------
// Each inserts a row that is legal on every constraint, then changes it. The
// insert MUST succeed for the case to mean anything: if a fixture's starting
// row were itself refused, the reject cases would pass for the wrong reason and
// the accept cases would fail loudly — which is why every starting row here is
// one an accept case elsewhere already proves legal.

const characterEdit =
  (initial: Values, patch: Values): Write =>
  (db) => {
    update(db, 'characters', newCharacter(db, initial), patch);
  };

const slotEdit =
  (initial: Values, patch: Values): Write =>
  (db) => {
    update(db, 'spell_selection_slots', newSlot(db, initial), patch);
  };

const sourceInstance =
  (values: Values): Write =>
  (db) => {
    newSource(db, newCharacter(db), values);
  };

const sourceInstanceEdit =
  (patch: Values): Write =>
  (db) => {
    const characterId = newCharacter(db);
    update(db, 'character_source_instances', newSource(db, characterId), patch);
  };

const spellVersionEdit =
  (initial: Values, patch: Values): Write =>
  (db) => {
    update(db, 'spell_versions', newSpellVersion(db, initial), patch);
  };

function newSpeciesTemplate(db: Database, values: Values = {}): number {
  return insert(db, 'species_templates', {
    content_key: uid('species'),
    name: uid('Species'),
    creature_type: 'Humanoid',
    size: 'Medium',
    base_speed_feet: 30,
    ...values,
  });
}

const speciesTemplate =
  (values: Values): Write =>
  (db) => {
    newSpeciesTemplate(db, values);
  };

const backgroundTemplate =
  (values: Values): Write =>
  (db) => {
    insert(db, 'background_templates', {
      content_key: uid('background'),
      name: uid('Background'),
      ability_score_1: 'Strength',
      ability_score_2: 'Dexterity',
      ability_score_3: 'Constitution',
      feat_name: 'Savage Attacker',
      skill_proficiency_1: 'Athletics',
      skill_proficiency_2: 'Intimidation',
      tool_proficiency: "Thieves' Tools",
      equipment_option_a: 'Spear, Shortbow, 14 GP',
      equipment_option_b: '50 GP',
      ...values,
    });
  };

function newBackgroundTemplate(db: Database, values: Values = {}): number {
  return insert(db, 'background_templates', {
    content_key: uid('background'),
    name: uid('Background'),
    ability_score_1: 'Strength',
    ability_score_2: 'Dexterity',
    ability_score_3: 'Constitution',
    feat_name: 'Savage Attacker',
    skill_proficiency_1: 'Athletics',
    skill_proficiency_2: 'Intimidation',
    tool_proficiency: "Thieves' Tools",
    equipment_option_a: 'Spear, Shortbow, 14 GP',
    equipment_option_b: '50 GP',
    ...values,
  });
}

function newWeaponTemplate(db: Database, values: Values = {}): number {
  return insert(db, 'weapon_templates', {
    content_key: uid('weapon'),
    name: uid('Weapon'),
    srd_group: 'simple_melee',
    damage_kind: 'dice',
    damage_dice: '1d6',
    damage_type: 'Slashing',
    mastery_property: 'Sap',
    ...values,
  });
}

function newArmorTemplate(db: Database, values: Values = {}): number {
  return insert(db, 'armor_templates', {
    content_key: uid('armor'),
    name: uid('Armor'),
    category: 'medium',
    armor_class: 14,
    dex_bonus: 'capped',
    dex_bonus_max: 2,
    ...values,
  });
}

/**
 * ONE EQUIPMENT LINE. The default is a `gear` line, because that is the
 * majority case in all four licensed packages and because it carries NO
 * payload — so a case about the payload CHECK can only fail on the value it
 * puts there.
 *
 * `weapon_template_id` and `armor_template_id` are given as the STRING
 * sentinels `'@weapon'` and `'@armor'`, substituted here for a freshly-minted
 * row's id. A literal id cannot be written into the table below, because these
 * writers run before any database exists.
 */
const equipmentItem =
  (
    values: Values,
    table: 'background_equipment_items' | 'class_equipment_items' =
      'background_equipment_items',
  ): Write =>
  (db) => {
    const resolved: Record<string, SqlValue> = { ...values };
    if (resolved.weapon_template_id === '@weapon') {
      resolved.weapon_template_id = newWeaponTemplate(db);
    }
    if (resolved.armor_template_id === '@armor') {
      resolved.armor_template_id = newArmorTemplate(db);
    }
    insert(db, table, {
      ...(table === 'background_equipment_items'
        ? { background_template_id: newBackgroundTemplate(db) }
        : { class_definition_id: newClass(db) }),
      option: 'a',
      sort_order: 1,
      quantity: 1,
      item_name: uid('Item'),
      item_kind: 'gear',
      ...resolved,
    });
  };

const upcastLevel =
  (values: Values): Write =>
  (db) => {
    insert(db, 'spell_version_upcast_levels', {
      spell_version_id: newSpellVersion(db),
      level: 3,
      ...values,
    });
  };

const cantripUpgradeLevel =
  (values: Values): Write =>
  (db) => {
    insert(db, 'spell_version_cantrip_upgrade_levels', {
      spell_version_id: newSpellVersion(db),
      level: 5,
      ...values,
    });
  };

const speciesTemplateTrait =
  (values: Values): Write =>
  (db) => {
    insert(db, 'species_template_traits', {
      species_template_id: newSpeciesTemplate(db),
      sort_order: 1,
      name: uid('Trait'),
      description: 'Printed trait text.',
      ...values,
    });
  };

const characterSpecies =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_species', {
      character_id: newCharacter(db),
      name: uid('Species'),
      ...values,
    });
  };

const characterSpeciesTrait =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_species_traits', {
      character_id: newCharacter(db),
      sort_order: 1,
      name: uid('Trait'),
      ...values,
    });
  };

/**
 * The two effect tables' fixtures.
 *
 * `effect_kind` DEFAULTS TO A REAL MEMBER on both, where the trait fixtures it
 * replaced defaulted to nothing: the column is NOT NULL now, because a trait
 * with no effect is the absence of a row rather than a row of nulls, so there
 * is no "free text" default to fall back on. That is why every case below that
 * used to pass `effect_kind: null` passes an unrelated KIND instead — the
 * mis-paired payload is still the thing being refused.
 */
const speciesTemplateTraitEffect =
  (values: Values): Write =>
  (db) => {
    const traitId = insert(db, 'species_template_traits', {
      species_template_id: newSpeciesTemplate(db),
      sort_order: 1,
      name: uid('Trait'),
      description: 'Printed trait text.',
    });
    insert(db, 'species_template_trait_effects', {
      species_template_trait_id: traitId,
      sort_order: 1,
      effect_kind: 'damage_resistance',
      label: uid('Grant'),
      ...values,
    });
  };

const backgroundTemplateEffect =
  (values: Values): Write =>
  (db) => {
    insert(db, 'background_template_effects', {
      background_template_id: newBackgroundTemplate(db),
      sort_order: 1,
      effect_kind: 'damage_resistance',
      label: uid('Grant'),
      ...values,
    });
  };

const itemDefinition =
  (values: Values): Write =>
  (db) => {
    insert(db, 'item_definitions', {
      content_key: uid('item-definition'),
      name: uid('Item'),
      rules_edition: 'expanded',
      description: 'Definition text.',
      requires_attunement: 0,
      ...values,
    });
  };

const itemDefinitionEffect =
  (values: Values): Write =>
  (db) => {
    const definitionId = insert(db, 'item_definitions', {
      content_key: uid('item-definition'),
      name: uid('Item'),
      rules_edition: 'expanded',
      description: 'Definition text.',
      requires_attunement: 0,
    });
    insert(db, 'item_definition_effects', {
      item_definition_id: definitionId,
      sort_order: 1,
      effect_kind: 'damage_resistance',
      label: uid('Grant'),
      ...values,
    });
  };

const characterEffect =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_effects', {
      character_id: newCharacter(db),
      sort_order: 1,
      effect_kind: 'damage_resistance',
      label: uid('Grant'),
      ...values,
    });
  };

const sourcedCharacterEffect =
  (values: Values): Write =>
  (db) => {
    const characterId = newCharacter(db);
    const definitionId = insert(db, 'feat_definitions', {
      content_key: uid('feat'),
      name: uid('Feat'),
      rules_edition: '2024',
      repeatable: 1,
      grant_rules: '[]',
    });
    const sourceId = insert(db, 'character_source_instances', {
      character_id: characterId,
      instance_uuid: uid('source'),
      source_type: 'feat',
      source_definition_id: definitionId,
      display_name: uid('Source'),
      config: '{}',
      acquired_at_character_level: 1,
      state: 'active',
    });
    insert(db, 'character_effects', {
      character_id: characterId,
      sort_order: 1,
      effect_kind: 'ability_increase',
      ability: 'strength',
      amount: 1,
      maximum: 20,
      source_instance_id: sourceId,
      label: uid('Grant'),
      ...values,
    });
  };

/**
 * AC-1 (D72) fixtures. `armorClassFormulaEffect` defaults to the Armadillo
 * species' own formula (13 + DEX, shield permitted); `weaponScopedCharacterEffect`
 * defaults to Pact-of-the-Blade-shaped `attack_ability_override` (one bonded
 * weapon). Neither needs `sourcedCharacterEffect`'s granting source: unlike
 * `ability_increase`, no new kind's CHECK requires one.
 */
const armorClassFormulaEffect =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_effects', {
      character_id: newCharacter(db),
      sort_order: 1,
      effect_kind: 'armor_class_formula',
      base: 13,
      ability_1: 'dexterity',
      allows_shield: 1,
      label: uid('Formula'),
      ...values,
    });
  };

const weaponScopedCharacterEffect =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_effects', {
      character_id: newCharacter(db),
      sort_order: 1,
      effect_kind: 'attack_ability_override',
      ability: 'charisma',
      weapon_scope: 'one_bonded_weapon',
      label: uid('Override'),
      ...values,
    });
  };

const abilityOverrideEffect =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_effects', {
      character_id: newCharacter(db),
      sort_order: 1,
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 19,
      label: uid('Set score'),
      ...values,
    });
  };

const catalogContentDraft =
  (values: Values): Write =>
  (db) => {
    insert(db, 'catalog_content_drafts', {
      draft_uuid: uid('catalog-content-draft'),
      content_kind: 'species',
      document_version: 1,
      revision: 0,
      document_json: '{}',
      ...values,
    });
  };

const catalogContentIdentity =
  (values: Values): Write =>
  (db) => {
    insert(db, 'catalog_content_identities', {
      content_key: `2024:test.owner:${uid('archived-content')}`,
      content_kind: 'species',
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: uid('archived-content'),
      ...values,
    });
  };

const catalogContentProvenance =
  (values: Values): Write =>
  (db) => {
    const contentKey = `2024:test.owner:${uid('provenance')}`;
    insert(db, 'catalog_content_identities', {
      content_key: contentKey,
      content_kind: 'species',
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: uid('provenance'),
    });
    insert(db, 'catalog_content_provenance', {
      content_kind: 'species',
      content_key: contentKey,
      origin_kind: 'unknown',
      received: 0,
      local_derivation: 0,
      ...values,
    });
  };

const characterShareReceipt =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_share_receipts', {
      character_id: newCharacter(db),
      local_document_id: uid('local-share-document'),
      ...values,
    });
  };

const catalogContentArchiveMember =
  (values: Values): Write =>
  (db) => {
    const contentKind = values.content_kind ?? 'species';
    const contentKey = `2024:test.owner:${uid('archive-member')}`;
    insert(db, 'catalog_content_identities', {
      content_key: contentKey,
      content_kind: contentKind,
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: uid('archivemember'),
    });
    insert(db, 'catalog_content_archive_members', {
      content_kind: 'species',
      content_key: contentKey,
      character_id: 1,
      character_revision: 0,
      character_name: 'Promised Hero',
      archived_at: '2042-08-12T13:14:15.000Z',
      ...values,
    });
  };

const catalogContentSupersession =
  (values: Values): Write =>
  (db) => {
    const suffix = uid('catalog-content-supersession');
    const oldKey = `2024:test.owner:${suffix}-old`;
    const newKey = `2024:test.owner:${suffix}-new`;
    for (const [contentKey, normalizedName] of [
      [oldKey, `${suffix}old`],
      [newKey, `${suffix}new`],
    ] as const) {
      insert(db, 'catalog_content_identities', {
        content_key: contentKey,
        content_kind: 'species',
        key_kind: 'asserted',
        catalog_layer: 'external',
        normalized_name: normalizedName,
      });
    }
    insert(db, 'catalog_content_supersessions', {
      content_kind: 'species',
      superseded_content_key: oldKey,
      successor_content_key: newKey,
      ...values,
    });
  };

const catalogContentReplacementChoice =
  (values: Values): Write =>
  (db) => {
    const suffix = uid('catalog-content-replacement-choice');
    const oldKey = typeof values.superseded_content_key === 'string'
      ? values.superseded_content_key
      : `2024:test.owner:${suffix}-old`;
    const newKey = typeof values.successor_content_key === 'string'
      ? values.successor_content_key
      : `2024:test.owner:${suffix}-new`;
    for (const contentKey of new Set([oldKey, newKey])) {
      insert(db, 'catalog_content_identities', {
        content_key: contentKey,
        content_kind: 'species',
        key_kind: 'asserted',
        catalog_layer: 'external',
        normalized_name: uid('replacementchoice'),
      });
    }
    insert(db, 'catalog_content_replacement_choices', {
      content_kind: 'species',
      superseded_content_key: oldKey,
      successor_content_key: newKey,
      character_id: newCharacter(db),
      decided_at: '2042-08-12 13:14:15',
      ...values,
    });
  };

const catalogDataMigration =
  (values: Values): Write =>
  (db) => {
    insert(db, 'catalog_data_migrations', {
      id: uid('catalog-data-migration'),
      scheme: 'content-v1',
      checksum: 'a'.repeat(64),
      ...values,
    });
  };

const partyDocumentState =
  (values: Values): Write =>
  (db) => {
    insert(db, 'party_document_states', {
      forge: 'github',
      repository: uid('party-repository'),
      path: `characters/${uid('publication')}--pub.json`,
      document_kind: 'character',
      observation_state: 'Never published',
      ...values,
    });
  };

interface ConstraintCase {
  readonly constraint: string;
  /** Writes that MUST be refused, each with the corruption it would have made. */
  readonly rejects: ReadonlyArray<readonly [string, Write]>;
  /** Legitimate writes that MUST get through — the over-strictness guard. */
  readonly accepts: ReadonlyArray<readonly [string, Write]>;
}

/** Independent SQL behaviour oracle for migration 0042's shared CHECK shape. */
function featureValueContributionConstraintCases(
  table: string,
  contribution: (values: Values) => Write,
): readonly ConstraintCase[] {
  return [
    {
      constraint: `${table}_contribution_key_check`,
      rejects: [
        ['an empty stable key', contribution({ contribution_key: '' })],
        ['a key beyond the storage bound', contribution({ contribution_key: 'k'.repeat(201) })],
      ],
      accepts: [
        ['an ASCII stable key at the storage bound', contribution({ contribution_key: 'k'.repeat(200) })],
        ['a Unicode stable key at the code-point bound', contribution({ contribution_key: '🗝'.repeat(200) })],
      ],
    },
    {
      constraint: `${table}_label_check`,
      rejects: [
        ['an empty label', contribution({ label: '' })],
        ['a label beyond the storage bound', contribution({ label: 'l'.repeat(201) })],
      ],
      accepts: [
        ['an ASCII label at the storage bound', contribution({ label: 'l'.repeat(200) })],
        ['a Unicode label at the code-point bound', contribution({ label: '🗝'.repeat(200) })],
      ],
    },
    {
      constraint: `${table}_target_kind_check`,
      rejects: [['an unknown target kind', contribution({ target_kind: 'spell_damage' })]],
      accepts: [['a resource maximum target', contribution({
        target_kind: 'resource_maximum', target_key: 'focus_points',
        resource_display_label: 'Focus Points', resource_marking_shape: 'boxes',
      })]],
    },
    {
      constraint: `${table}_op_check`,
      rejects: [['a replacement operation', contribution({ op: 'replace' })]],
      accepts: [['the additive operation', contribution({ op: 'add' })]],
    },
    {
      constraint: `${table}_target_payload_check`,
      rejects: [
        ['an unknown feature dice target', contribution({ target_key: 'superiority_dice' })],
        ['an empty resource key', contribution({ target_kind: 'resource_maximum', target_key: '', resource_display_label: 'Focus Points', resource_marking_shape: 'boxes' })],
        ['a resource key beyond the storage bound', contribution({ target_kind: 'resource_maximum', target_key: 'r'.repeat(201), resource_display_label: 'Focus Points', resource_marking_shape: 'boxes' })],
        ['a resource without a display label', contribution({ target_kind: 'resource_maximum', target_key: 'focus_points', resource_display_label: null, resource_marking_shape: 'boxes' })],
        ['an empty resource display label', contribution({ target_kind: 'resource_maximum', target_key: 'focus_points', resource_display_label: '', resource_marking_shape: 'boxes' })],
        ['a resource display label beyond the storage bound', contribution({ target_kind: 'resource_maximum', target_key: 'focus_points', resource_display_label: 'l'.repeat(201), resource_marking_shape: 'boxes' })],
        ['an unknown resource marking shape', contribution({ target_kind: 'resource_maximum', target_key: 'focus_points', resource_display_label: 'Focus Points', resource_marking_shape: 'circles' })],
        ['resource display fields on feature dice', contribution({ resource_display_label: 'Sneak Dice', resource_marking_shape: 'boxes' })],
      ],
      accepts: [
        ['Sneak Attack dice', contribution({})],
        ['a bounded resource key', contribution({ target_kind: 'resource_maximum', target_key: 'r'.repeat(200), resource_display_label: 'Focus Points', resource_marking_shape: 'boxes' })],
        ['a Unicode resource key at the code-point bound', contribution({ target_kind: 'resource_maximum', target_key: '🗝'.repeat(200), resource_display_label: '🗝'.repeat(200), resource_marking_shape: 'remaining' })],
      ],
    },
    {
      constraint: `${table}_active_level_band_check`,
      rejects: [
        ['level zero', contribution({ active_from_level: 0 })],
        ['level twenty-one', contribution({ active_to_level: 21 })],
        ['a reversed band', contribution({ active_from_level: 10, active_to_level: 9 })],
        ['a fractional boundary', contribution({ active_from_level: 1.5 })],
      ],
      accepts: [
        ['the whole class-level range', contribution({ active_from_level: 1, active_to_level: 20 })],
        ['a one-level band', contribution({ active_from_level: 7, active_to_level: 7 })],
      ],
    },
    {
      constraint: `${table}_value_json_check`,
      rejects: [
        ['malformed JSON', contribution({ value_json: '{' })],
        ['a JSON array', contribution({ value_json: '[]' })],
        ['an object beyond the byte bound', contribution({ value_json: JSON.stringify({ padding: 'x'.repeat(4090) }) })],
      ],
      accepts: [
        ['a stored scale expression', contribution({})],
        ['an object exactly at the byte bound', contribution({ value_json: JSON.stringify({ padding: 'x'.repeat(4082) }) })],
      ],
    },
    {
      constraint: `${table}_supersedes_ref_check`,
      rejects: [
        ['malformed JSON', contribution({ supersedes_ref: '{' })],
        ['a JSON array', contribution({ supersedes_ref: '[]' })],
        ['an object beyond the byte bound', contribution({ supersedes_ref: JSON.stringify({ padding: 'x'.repeat(506) }) })],
      ],
      accepts: [
        ['no superseded contribution', contribution({ supersedes_ref: null })],
        ['a qualified contribution reference', contribution({ supersedes_ref: JSON.stringify({ content_key: '2024:class:rogue', contribution_key: 'sneak-attack' }) })],
      ],
    },
  ];
}

/**
 * The three class-feature effect tables deliberately have the same payload
 * contract. This factory is an independently authored behavioural oracle for
 * that shared contract: every returned case attempts one illegal row and one
 * legal boundary row. The live DDL is not read or transformed here.
 */
function featureEffectConstraintCases(
  table: string,
  effect: (values: Values) => Write,
  damagePolicy: 'known-only' | 'passthrough' = 'known-only',
): readonly ConstraintCase[] {
  return [
    {
      constraint: `${table}_kind_check`,
      rejects: [
        ['an unknown mechanical kind', effect({ effect_kind: 'extra_attacks' })],
        ['the character-only ability override', effect({ effect_kind: 'ability_override', ability: 'strength', maximum: 19 })],
      ],
      accepts: [['Extra Attack', effect({ effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })]],
    },
    ...(damagePolicy === 'known-only'
      ? [{
          constraint: `${table}_damage_type_check`,
          rejects: [['a damage type outside the closed mechanical set', effect({ effect_kind: 'damage_resistance', damage_type: 'Steam' })]],
          accepts: [['a known damage type', effect({ effect_kind: 'damage_resistance', damage_type: 'Poison' })]],
        } satisfies ConstraintCase]
      : []),
    {
      constraint: `${table}_damage_type_kind_check`,
      rejects: [['a damage type on an HP effect', effect({ effect_kind: 'hp_modifier', hit_points_flat: 1, damage_type: 'Fire' })]],
      accepts: [['a typed resistance', effect({ effect_kind: 'damage_resistance', damage_type: 'Fire' })]],
    },
    {
      constraint: `${table}_hit_points_kind_check`,
      rejects: [['HP payload on a speed effect', effect({ effect_kind: 'speed', speed_bonus_feet: 5, hit_points_flat: 1 })]],
      accepts: [['both HP payloads on one HP effect', effect({ effect_kind: 'hp_modifier', hit_points_flat: 1, hit_points_per_level: 1 })]],
    },
    {
      constraint: `${table}_speed_kind_check`,
      rejects: [['a speed payload on a resistance', effect({ effect_kind: 'damage_resistance', speed_bonus_feet: 5 })]],
      accepts: [['a speed payload on a speed effect', effect({ effect_kind: 'speed', speed_bonus_feet: 5 })]],
    },
    {
      constraint: `${table}_ability_kind_check`,
      rejects: [['an ability on an AC bonus', effect({ effect_kind: 'armor_class_bonus', amount: 1, ability: 'dexterity' })]],
      accepts: [['an attack ability override', effect({ effect_kind: 'attack_ability_override', ability: 'charisma', weapon_scope: 'one_bonded_weapon' })]],
    },
    {
      constraint: `${table}_amount_kind_check`,
      rejects: [['an amount on a resistance', effect({ effect_kind: 'damage_resistance', amount: 1 })]],
      accepts: [['an amount on an AC bonus', effect({ effect_kind: 'armor_class_bonus', amount: 1 })]],
    },
    {
      constraint: `${table}_maximum_kind_check`,
      rejects: [['a maximum on an AC bonus', effect({ effect_kind: 'armor_class_bonus', amount: 1, maximum: 20 })]],
      accepts: [['an ability increase maximum', effect({ effect_kind: 'ability_increase', ability: 'strength', amount: 1, maximum: 20 })]],
    },
    {
      constraint: `${table}_base_kind_check`,
      rejects: [['an AC base on a resistance', effect({ effect_kind: 'damage_resistance', base: 10 })]],
      accepts: [['an AC formula base', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_ability_1_kind_check`,
      rejects: [['a formula ability on a resistance', effect({ effect_kind: 'damage_resistance', ability_1: 'dexterity' })]],
      accepts: [['a first formula ability', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_ability_2_kind_check`,
      rejects: [['a second formula ability on a resistance', effect({ effect_kind: 'damage_resistance', ability_2: 'wisdom' })]],
      accepts: [['a second formula ability', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', ability_2: 'wisdom', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_allows_shield_kind_check`,
      rejects: [['a shield flag on a resistance', effect({ effect_kind: 'damage_resistance', allows_shield: 1 })]],
      accepts: [['a shield flag on a formula', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', allows_shield: 0 })]],
    },
    {
      constraint: `${table}_weapon_scope_kind_check`,
      rejects: [['a weapon scope on an AC bonus', effect({ effect_kind: 'armor_class_bonus', amount: 1, weapon_scope: 'any_weapon' })]],
      accepts: [['a weapon-scoped attack bonus', effect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })]],
    },
    {
      constraint: `${table}_attack_count_kind_check`,
      rejects: [['an attack count on a resistance', effect({ effect_kind: 'damage_resistance', attack_count: 2 })]],
      accepts: [['an Extra Attack count', effect({ effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })]],
    },
    {
      constraint: `${table}_hp_modifier_payload_check`,
      rejects: [['an HP effect with neither payload', effect({ effect_kind: 'hp_modifier' })]],
      accepts: [['a per-level HP effect', effect({ effect_kind: 'hp_modifier', hit_points_per_level: 1 })]],
    },
    {
      constraint: `${table}_speed_payload_check`,
      rejects: [['a speed effect with no speed', effect({ effect_kind: 'speed' })]],
      accepts: [['a complete speed effect', effect({ effect_kind: 'speed', speed_bonus_feet: 5 })]],
    },
    {
      constraint: `${table}_ability_increase_payload_check`,
      rejects: [['an ability increase with no maximum', effect({ effect_kind: 'ability_increase', ability: 'strength', amount: 1 })]],
      accepts: [['a complete ability increase', effect({ effect_kind: 'ability_increase', ability: 'strength', amount: 1, maximum: 20 })]],
    },
    {
      constraint: `${table}_armor_class_bonus_payload_check`,
      rejects: [['an AC bonus with no amount', effect({ effect_kind: 'armor_class_bonus' })]],
      accepts: [['a complete AC bonus', effect({ effect_kind: 'armor_class_bonus', amount: 1 })]],
    },
    {
      constraint: `${table}_armor_class_formula_payload_check`,
      rejects: [['an AC formula with no shield rule', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity' })]],
      accepts: [['a complete AC formula', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_attack_ability_override_payload_check`,
      rejects: [['an ability override with no weapon scope', effect({ effect_kind: 'attack_ability_override', ability: 'charisma' })]],
      accepts: [['a complete ability override', effect({ effect_kind: 'attack_ability_override', ability: 'charisma', weapon_scope: 'one_bonded_weapon' })]],
    },
    {
      constraint: `${table}_weapon_attack_bonus_payload_check`,
      rejects: [['a weapon attack bonus with no scope', effect({ effect_kind: 'weapon_attack_bonus', amount: 1 })]],
      accepts: [['a complete weapon attack bonus', effect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })]],
    },
    {
      constraint: `${table}_weapon_damage_bonus_payload_check`,
      rejects: [['a weapon damage bonus with no amount', effect({ effect_kind: 'weapon_damage_bonus', weapon_scope: 'any_weapon' })]],
      accepts: [['a complete weapon damage bonus', effect({ effect_kind: 'weapon_damage_bonus', amount: 1, weapon_scope: 'any_weapon' })]],
    },
    {
      constraint: `${table}_extra_attack_payload_check`,
      rejects: [['Extra Attack with no count', effect({ effect_kind: 'extra_attack', weapon_scope: 'any_weapon' })]],
      accepts: [['a complete Extra Attack effect', effect({ effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })]],
    },
    {
      constraint: `${table}_ability_check`,
      rejects: [['an unknown ability', effect({ effect_kind: 'attack_ability_override', ability: 'luck', weapon_scope: 'any_weapon' })]],
      accepts: [['a known ability', effect({ effect_kind: 'attack_ability_override', ability: 'wisdom', weapon_scope: 'any_weapon' })]],
    },
    {
      constraint: `${table}_amount_check`,
      rejects: [['zero, which changes no number', effect({ effect_kind: 'armor_class_bonus', amount: 0 })]],
      accepts: [['a negative amount', effect({ effect_kind: 'armor_class_bonus', amount: -1 })]],
    },
    {
      constraint: `${table}_maximum_check`,
      rejects: [['a maximum above 30', effect({ effect_kind: 'ability_increase', ability: 'strength', amount: 1, maximum: 31 })]],
      accepts: [['the upper bound 30', effect({ effect_kind: 'ability_increase', ability: 'strength', amount: 1, maximum: 30 })]],
    },
    {
      constraint: `${table}_base_check`,
      rejects: [['a zero AC base', effect({ effect_kind: 'armor_class_formula', base: 0, ability_1: 'dexterity', allows_shield: 1 })]],
      accepts: [['the lower bound one', effect({ effect_kind: 'armor_class_formula', base: 1, ability_1: 'dexterity', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_ability_1_check`,
      rejects: [['an unknown first formula ability', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'luck', allows_shield: 1 })]],
      accepts: [['a known first formula ability', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'constitution', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_ability_2_check`,
      rejects: [['an unknown second formula ability', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', ability_2: 'luck', allows_shield: 1 })]],
      accepts: [['a known second formula ability', effect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', ability_2: 'wisdom', allows_shield: 1 })]],
    },
    {
      constraint: `${table}_weapon_scope_check`,
      rejects: [['an unknown weapon scope', effect({ effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'pact_weapon' })]],
      accepts: [['one bonded weapon', effect({ effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'one_bonded_weapon' })]],
    },
    {
      constraint: `${table}_attack_count_check`,
      rejects: [['one attack, which is no Extra Attack', effect({ effect_kind: 'extra_attack', attack_count: 1, weapon_scope: 'any_weapon' })]],
      accepts: [['two attacks', effect({ effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })]],
    },
  ];
}

/** Character-effect payload contract used by authored species/backgrounds. */
function authoredCharacterEffectConstraintCases(
  table: string,
  effect: (values: Values) => Write,
): readonly ConstraintCase[] {
  const featureOnlyConstraints = new Set([
    `${table}_attack_count_kind_check`,
    `${table}_extra_attack_payload_check`,
    `${table}_attack_count_check`,
    `${table}_weapon_scope_check`,
  ]);

  return [
    {
      constraint: `${table}_kind_check`,
      rejects: [
        ['an unknown mechanical kind', effect({ effect_kind: 'ability_score_increase' })],
        ['the feature-only Extra Attack kind', effect({ effect_kind: 'extra_attack' })],
      ],
      accepts: [
        ['a resistance', effect({ effect_kind: 'damage_resistance', damage_type: 'Void' })],
        ['an ability override', effect({ effect_kind: 'ability_override', ability: 'strength', maximum: 19 })],
        ['a weapon bonus', effect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })],
      ],
    },
    ...featureEffectConstraintCases(table, effect, 'passthrough').filter(
      ({ constraint }) =>
        constraint !== `${table}_kind_check` &&
        !featureOnlyConstraints.has(constraint),
    ),
    {
      constraint: `${table}_ability_override_payload_check`,
      rejects: [['an ability override without its score', effect({ effect_kind: 'ability_override', ability: 'strength' })]],
      accepts: [['a complete ability override', effect({ effect_kind: 'ability_override', ability: 'strength', maximum: 19 })]],
    },
    {
      constraint: `${table}_weapon_scope_check`,
      rejects: [['an unknown weapon scope', effect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'pact_weapon' })]],
      accepts: [['one bonded weapon', effect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'one_bonded_weapon' })]],
    },
  ];
}

const CONSTRAINT_CASES: readonly ConstraintCase[] = [
  {
    constraint: 'character_share_receipts_local_document_id_check',
    rejects: [[
      'an empty local document id',
      characterShareReceipt({ local_document_id: '' }),
    ]],
    accepts: [[
      'a non-empty local document id',
      characterShareReceipt({}),
    ]],
  },
  {
    constraint: 'character_share_receipts_received_document_id_check',
    rejects: [[
      'an empty received document id',
      characterShareReceipt({
        received_document_id: '', received_revision: 0,
        baseline_character_revision: 0,
      }),
    ]],
    accepts: [[
      'a non-empty received document id',
      characterShareReceipt({
        received_document_id: uid('received-share-document'),
        received_revision: 0, baseline_character_revision: 0,
      }),
    ]],
  },
  {
    constraint: 'character_share_receipts_received_pair_check',
    rejects: [
      ['an id without its revisions', characterShareReceipt({
        received_document_id: uid('received-share-document'),
      })],
      ['revisions without an id', characterShareReceipt({
        received_revision: 0, baseline_character_revision: 0,
      })],
      ['a negative received revision', characterShareReceipt({
        received_document_id: uid('received-share-document'),
        received_revision: -1, baseline_character_revision: 0,
      })],
      ['a negative baseline revision', characterShareReceipt({
        received_document_id: uid('received-share-document'),
        received_revision: 0, baseline_character_revision: -1,
      })],
    ],
    accepts: [
      ['an entirely absent received lineage', characterShareReceipt({})],
      ['a complete received lineage', characterShareReceipt({
        received_document_id: uid('received-share-document'),
        received_revision: 1, baseline_character_revision: 2,
      })],
    ],
  },
  {
    constraint: 'catalog_content_identities_archived_at_check',
    rejects: [
      ['an integer lifecycle value', catalogContentIdentity({ archived_at: 20420304 })],
      ['a binary lifecycle value', catalogContentIdentity({
        archived_at: new Uint8Array([65]) as unknown as string,
      })],
    ],
    accepts: [
      ['the active NULL', catalogContentIdentity({ archived_at: null })],
      ['an ISO timestamp', catalogContentIdentity({ archived_at: '2042-03-04T05:06:07.000Z' })],
      ['a SQLite timestamp', catalogContentIdentity({ archived_at: '2042-03-04 05:06:07' })],
    ],
  },
  {
    constraint: 'catalog_content_provenance_kind_check',
    rejects: [[
      'an unknown content kind',
      catalogContentProvenance({ content_kind: 'talent' }),
    ]],
    accepts: [[
      'a known content kind',
      catalogContentProvenance({ content_kind: 'species' }),
    ]],
  },
  {
    constraint: 'catalog_content_provenance_origin_kind_check',
    rejects: [[
      'an invented origin',
      catalogContentProvenance({ origin_kind: 'claimed_by_sender' }),
    ]],
    accepts: [
      ['authored here', catalogContentProvenance({ origin_kind: 'authored_here' })],
      ['built in', catalogContentProvenance({ origin_kind: 'built_in' })],
      ['unknown', catalogContentProvenance({ origin_kind: 'unknown' })],
    ],
  },
  {
    constraint: 'catalog_content_provenance_received_check',
    rejects: [[
      'a received flag outside the boolean set',
      catalogContentProvenance({ received: 2 }),
    ]],
    accepts: [
      ['not received', catalogContentProvenance({ received: 0 })],
      ['received', catalogContentProvenance({ received: 1 })],
    ],
  },
  {
    constraint: 'catalog_content_provenance_local_derivation_check',
    rejects: [[
      'a derivation flag outside the boolean set',
      catalogContentProvenance({ local_derivation: 2 }),
    ]],
    accepts: [
      ['not derived locally', catalogContentProvenance({ local_derivation: 0 })],
      ['derived locally', catalogContentProvenance({ local_derivation: 1 })],
    ],
  },
  {
    constraint: 'catalog_content_provenance_labels_check',
    rejects: [
      ['an empty author label', catalogContentProvenance({ author_label: '' })],
      ['an author label above 200 characters', catalogContentProvenance({ author_label: 'a'.repeat(201) })],
      ['an empty source label', catalogContentProvenance({ source_label: '' })],
      ['a source label above 200 characters', catalogContentProvenance({ source_label: 's'.repeat(201) })],
      ['an empty license label', catalogContentProvenance({ license_label: '' })],
      ['a license label above 200 characters', catalogContentProvenance({ license_label: 'l'.repeat(201) })],
      ['empty attribution', catalogContentProvenance({ attribution_text: '' })],
      ['attribution above 4096 bytes', catalogContentProvenance({ attribution_text: 'x'.repeat(4097) })],
    ],
    accepts: [
      ['absent optional attribution', catalogContentProvenance({})],
      ['labels and attribution at their bounds', catalogContentProvenance({
        author_label: 'a'.repeat(200),
        source_label: 's'.repeat(200),
        license_label: 'l'.repeat(200),
        attribution_text: 'x'.repeat(4096),
      })],
    ],
  },
  {
    constraint: 'catalog_content_archive_members_kind_check',
    rejects: [[
      'a non-authorable class kind',
      catalogContentArchiveMember({ content_kind: 'class' }),
    ]],
    accepts: [
      ['a species member', catalogContentArchiveMember({ content_kind: 'species' })],
      ['a subclass member', catalogContentArchiveMember({ content_kind: 'subclass' })],
      ['a background member', catalogContentArchiveMember({ content_kind: 'background' })],
    ],
  },
  {
    constraint: 'catalog_content_archive_members_character_id_check',
    rejects: [
      ['character id zero', catalogContentArchiveMember({ character_id: 0 })],
      ['a text character id', catalogContentArchiveMember({ character_id: 'one' })],
    ],
    accepts: [['the first character id', catalogContentArchiveMember({ character_id: 1 })]],
  },
  {
    constraint: 'catalog_content_archive_members_character_revision_check',
    rejects: [
      ['a negative revision', catalogContentArchiveMember({ character_revision: -1 })],
      ['a text revision', catalogContentArchiveMember({ character_revision: 'zero' })],
    ],
    accepts: [['the initial revision', catalogContentArchiveMember({ character_revision: 0 })]],
  },
  {
    constraint: 'catalog_content_archive_members_archived_at_check',
    rejects: [
      ['an integer timestamp', catalogContentArchiveMember({ archived_at: 20420812 })],
      ['a binary timestamp', catalogContentArchiveMember({
        archived_at: new Uint8Array([65]) as unknown as string,
      })],
    ],
    accepts: [
      ['an ISO timestamp', catalogContentArchiveMember({ archived_at: '2042-08-12T13:14:15.000Z' })],
      ['a SQLite timestamp', catalogContentArchiveMember({ archived_at: '2042-08-12 13:14:15' })],
    ],
  },
  {
    constraint: 'catalog_content_drafts_uuid_check',
    rejects: [['an empty draft UUID', catalogContentDraft({ draft_uuid: '' })]],
    accepts: [['a non-empty durable UUID', catalogContentDraft({})]],
  },
  {
    constraint: 'catalog_content_supersessions_content_kind_check',
    rejects: [[
      'an unknown content kind',
      catalogContentSupersession({ content_kind: 'unknown' }),
    ]],
    accepts: [[
      'a species version edge',
      catalogContentSupersession({ content_kind: 'species' }),
    ]],
  },
  {
    constraint: 'catalog_content_supersessions_distinct_keys_check',
    rejects: [[
      'a self-supersession',
      (db) => {
        const key = `2024:test.owner:${uid('self-supersession')}`;
        insert(db, 'catalog_content_identities', {
          content_key: key,
          content_kind: 'species',
          key_kind: 'asserted',
          catalog_layer: 'external',
          normalized_name: uid('selfsupersession'),
        });
        insert(db, 'catalog_content_supersessions', {
          content_kind: 'species',
          superseded_content_key: key,
          successor_content_key: key,
        });
      },
    ]],
    accepts: [[
      'two distinct immutable versions',
      catalogContentSupersession({}),
    ]],
  },
  {
    constraint: 'catalog_content_replacement_choices_kind_check',
    rejects: [[
      'a non-authorable class kind',
      catalogContentReplacementChoice({ content_kind: 'class' }),
    ]],
    accepts: [[
      'a species choice',
      catalogContentReplacementChoice({ content_kind: 'species' }),
    ]],
  },
  {
    constraint: 'catalog_content_replacement_choices_distinct_keys_check',
    rejects: [[
      'the same version on both sides',
      catalogContentReplacementChoice({
        superseded_content_key: '2024:test.owner:same-replacement-choice',
        successor_content_key: '2024:test.owner:same-replacement-choice',
      }),
    ]],
    accepts: [['two distinct versions', catalogContentReplacementChoice({})]],
  },
  {
    constraint: 'catalog_content_replacement_choices_character_id_check',
    rejects: [
      ['character id zero', catalogContentReplacementChoice({ character_id: 0 })],
      ['a text character id', catalogContentReplacementChoice({ character_id: 'one' })],
    ],
    accepts: [['a positive character id', catalogContentReplacementChoice({})]],
  },
  {
    constraint: 'catalog_content_replacement_choices_decided_at_check',
    rejects: [[
      'an integer decision time',
      catalogContentReplacementChoice({ decided_at: 20420812 }),
    ]],
    accepts: [[
      'a SQLite timestamp',
      catalogContentReplacementChoice({ decided_at: '2042-08-12 13:14:15' }),
    ]],
  },
  {
    constraint: 'catalog_content_drafts_kind_check',
    rejects: [
      [
        'a non-authorable class kind',
        catalogContentDraft({ content_kind: 'class' }),
      ],
    ],
    accepts: [
      ['a species draft', catalogContentDraft({ content_kind: 'species' })],
      ['a subclass draft', catalogContentDraft({ content_kind: 'subclass' })],
      ['a background draft', catalogContentDraft({ content_kind: 'background' })],
    ],
  },
  {
    constraint: 'catalog_content_drafts_document_version_check',
    rejects: [
      ['document version zero', catalogContentDraft({ document_version: 0 })],
      [
        'a text document version',
        catalogContentDraft({ document_version: 'one' }),
      ],
    ],
    accepts: [
      [
        'the first document version',
        catalogContentDraft({ document_version: 1 }),
      ],
    ],
  },
  {
    constraint: 'catalog_content_drafts_revision_check',
    rejects: [
      ['a negative revision', catalogContentDraft({ revision: -1 })],
      ['a text revision', catalogContentDraft({ revision: 'zero' })],
    ],
    accepts: [['the initial revision', catalogContentDraft({ revision: 0 })]],
  },
  {
    constraint: 'catalog_content_drafts_document_size_check',
    rejects: [
      ['an empty document', catalogContentDraft({ document_json: '' })],
      [
        'a document one byte above the 524288-byte limit',
        catalogContentDraft({ document_json: 'x'.repeat(524_289) }),
      ],
    ],
    accepts: [
      ['a one-byte document', catalogContentDraft({ document_json: 'x' })],
      [
        'a document at the 524288-byte limit',
        catalogContentDraft({ document_json: 'x'.repeat(524_288) }),
      ],
    ],
  },
  {
    constraint: 'party_document_states_forge_check',
    rejects: [
      ['an unsupported forge', partyDocumentState({ forge: 'bitbucket' })],
    ],
    accepts: [
      ['the Codeberg forge', partyDocumentState({ forge: 'codeberg' })],
    ],
  },
  {
    constraint: 'party_document_states_kind_check',
    rejects: [
      ['an invented manifest kind', partyDocumentState({ document_kind: 'manifest' })],
    ],
    accepts: [
      ['a library observation', partyDocumentState({ document_kind: 'library' })],
    ],
  },
  {
    constraint: 'party_document_states_observation_state_check',
    rejects: [
      ['an unnamed observation', partyDocumentState({ observation_state: 'Unknown' })],
    ],
    accepts: [
      [
        'the semicolon-bearing publish observation',
        partyDocumentState({
          observation_state:
            'Published; refresh required before another publish',
        }),
      ],
    ],
  },
  {
    constraint: 'party_document_states_local_revision_check',
    rejects: [
      ['a negative local revision', partyDocumentState({ last_published_local_revision: -1 })],
      ['a text local revision', partyDocumentState({ last_published_local_revision: 'one' })],
    ],
    accepts: [
      ['the initial local revision', partyDocumentState({ last_published_local_revision: 0 })],
      ['the defended unknown revision', partyDocumentState({ last_published_local_revision: null })],
    ],
  },
  {
    constraint: 'catalog_data_migrations_id_check',
    rejects: [
      ['an empty migration id', catalogDataMigration({ id: '' })],
    ],
    accepts: [
      ['a stable non-empty migration id', catalogDataMigration({})],
    ],
  },
  {
    constraint: 'catalog_data_migrations_scheme_check',
    rejects: [
      [
        'an unregistered projector scheme',
        catalogDataMigration({ scheme: 'content-v3' }),
      ],
    ],
    accepts: [
      ['the frozen content-v1 projector scheme', catalogDataMigration({})],
      ['the registered content-v2 projector scheme', catalogDataMigration({ scheme: 'content-v2' })],
    ],
  },
  {
    constraint: 'catalog_data_migrations_checksum_check',
    rejects: [
      ['a truncated checksum', catalogDataMigration({ checksum: 'abc' })],
      [
        'uppercase hexadecimal',
        catalogDataMigration({ checksum: 'A'.repeat(64) }),
      ],
      [
        'a non-hexadecimal character',
        catalogDataMigration({ checksum: `${'a'.repeat(63)}g` }),
      ],
    ],
    accepts: [
      [
        'exactly 64 lowercase hexadecimal characters',
        catalogDataMigration({}),
      ],
    ],
  },
  {
    constraint: 'characters_ability_scores_check',
    // One reject per column, so dropping a column from the six-way expression
    // is a failing test rather than a silent hole.
    rejects: [
      ['strength below 1', character({ strength: 0 })],
      ['dexterity below 1', character({ dexterity: 0 })],
      ['constitution below 1', character({ constitution: 0 })],
      ['intelligence below 1', character({ intelligence: 0 })],
      ['wisdom below 1', character({ wisdom: 0 })],
      ['charisma below 1', character({ charisma: 0 })],
      ['a score above 30', character({ strength: 31 })],
      ['a negative score', character({ wisdom: -4 })],
    ],
    accepts: [
      ['the column defaults of 10', character({})],
      ['the lower bound of 1', character({ strength: 1, charisma: 1 })],
      ['the upper bound of 30', character({ strength: 30, charisma: 30 })],
    ],
  },
  {
    constraint: 'characters_ability_allocation_method_check',
    rejects: [
      ['a removed Roll in Order method', character({ ability_allocation_method: 'roll_in_order' })],
      ['an unknown method', character({ ability_allocation_method: 'guess' })],
    ],
    accepts: [
      ['the never-allocated NULL', character({ ability_allocation_method: null })],
      ['standard array', character({ ability_allocation_method: 'standard_array' })],
      ['point buy', character({ ability_allocation_method: 'point_buy' })],
      ['manual entry', character({ ability_allocation_method: 'manual' })],
    ],
  },
  {
    constraint: 'characters_rules_edition_preference_check',
    rejects: [
      ['an edition no catalog row uses', character({ rules_edition_preference: '2025' })],
      ['an empty edition', character({ rules_edition_preference: '' })],
    ],
    accepts: [
      ['the 2024 default', character({})],
      ['2014', character({ rules_edition_preference: '2014' })],
      ['expanded', character({ rules_edition_preference: 'expanded' })],
    ],
  },
  {
    constraint: 'characters_proficiency_bonus_override_check',
    rejects: [
      ['a zero override, which is a lost bonus rather than an override', character({ proficiency_bonus_override: 0 })],
      ['a negative override', character({ proficiency_bonus_override: -2 })],
      // Written as a bare `>= 1` this passed: SQLite orders TEXT above every
      // number, so `'three' >= 1` is TRUE. The `typeof` limb is what refuses it.
      ['a text override, which a bare lower bound would have admitted', character({ proficiency_bonus_override: 'three' })],
      ['a fractional override', character({ proficiency_bonus_override: 2.5 })],
    ],
    accepts: [
      // The defended null: "derive from total level" is the ordinary case.
      ['the null that means derive from total level', character({ proficiency_bonus_override: null })],
      ['the lowest real override', character({ proficiency_bonus_override: 1 })],
      // INTEGER affinity converts this losslessly, so `typeof` sees an integer
      // and the limb does not reject a value the column would have stored fine.
      ['a numeric string the column stores as an integer', character({ proficiency_bonus_override: '4' })],
    ],
  },
  {
    constraint: 'characters_revision_check',
    rejects: [
      ['a negative revision counter', character({ revision: -1 })],
      // The counter every optimistic-concurrency comparison reads. A TEXT value
      // here does not merely mis-count, it defeats the comparison — and a bare
      // `revision >= 0` accepted it.
      ['a text revision, which a bare lower bound would have admitted', character({ revision: 'zero' })],
      // The path that actually matters: revision is written by UPDATE, not by
      // INSERT, on every command a character ever runs.
      ['a decrement below zero on UPDATE', characterEdit({}, { revision: -1 })],
    ],
    accepts: [
      ['the zero a fresh character starts at', character({ revision: 0 })],
      ['the increment every command performs', characterEdit({ revision: 3 }, { revision: 4 })],
    ],
  },
  {
    constraint: 'characters_archived_at_check',
    rejects: [
      ['an integer lifecycle value', character({ archived_at: 20420304 })],
      ['a binary lifecycle value', character({
        archived_at: new Uint8Array([65]) as unknown as string,
      })],
    ],
    accepts: [
      ['the active NULL', character({ archived_at: null })],
      ['an ISO timestamp', character({ archived_at: '2042-03-04T05:06:07.000Z' })],
      ['a SQLite timestamp', character({ archived_at: '2042-03-04 05:06:07' })],
    ],
  },
  {
    constraint: 'character_class_levels_spellcasting_ability_override_check',
    rejects: [
      ['an ability that does not exist', classLevel({ spellcasting_ability_override: 'luck' })],
      ['a capitalised ability, which no column is keyed by', classLevel({ spellcasting_ability_override: 'Intelligence' })],
    ],
    accepts: [
      ['the null that means no override', classLevel({ spellcasting_ability_override: null })],
      ['a real ability', classLevel({ spellcasting_ability_override: 'intelligence' })],
    ],
  },
  {
    constraint: 'spell_selection_slots_bucket_check',
    rejects: [
      ['a misspelled bucket no count would ever see', slot({ bucket: 'preprared' })],
      ['an empty bucket', slot({ bucket: '' })],
    ],
    accepts: [
      ['cantrip_known', slot({ bucket: 'cantrip_known' })],
      ['automatic', slot({ bucket: 'automatic' })],
      ['spellbook', slot({ bucket: 'spellbook' })],
    ],
  },
  {
    constraint: 'spell_selection_slots_state_check',
    rejects: [
      ['a state isUsableSlotState would silently call unusable', slot({ state: 'archived' })],
      // A slot is minted `active` and moved by UPDATE thereafter, so a bad
      // state realistically arrives as a transition, never as an insert.
      //
      // `tombstoned` is deliberately the value used: it is a REAL state, but of
      // `character_source_instances.state`, written by `update-class.ts` and
      // `grant-rule-slot-generator.ts`. The two `state` columns are different
      // vocabularies that merely share a name, and this asserts that the slot
      // one does not quietly accept its neighbour's members. Since R4 the
      // neighbour is constrained too, and the case below is this one's mirror.
      ['a transition to a state belonging to another table', slotEdit({}, { state: 'tombstoned' })],
    ],
    accepts: [
      ['the active default', slot({})],
      ['kept_override', slot({ state: 'kept_override' })],
      ['orphaned', slot({ state: 'orphaned' })],
      ['discarded', slot({ state: 'discarded' })],
      ['the orphaning transition a removed class performs', slotEdit({}, { state: 'orphaned' })],
    ],
  },
  {
    /**
     * THE MIRROR OF THE SLOT CASE ABOVE, AND THE END OF THE LONGEST-STANDING
     * "NO CHECK HERE" NOTE IN THE SCHEMA.
     *
     * This column went unconstrained until R4 not from doubt but from D13's
     * order: a CHECK must read ONE declared source, and this vocabulary had
     * none. `sourceInstanceStates` is now that source. The rejects below are
     * chosen to be the two failures that were actually available: a typo of a
     * real member, and members of the NEIGHBOURING `state` column whose set
     * this one was nearly constrained to. `orphaned` and `kept_override` are
     * both perfectly legal three tables away, which is exactly why a shared
     * vocabulary would have been the wrong answer.
     */
    constraint: 'character_source_instances_state_check',
    rejects: [
      ['a typo of a real member', sourceInstance({ state: 'tombstoend' })],
      ["the slot column's kept_override", sourceInstance({ state: 'kept_override' })],
      // A source is minted `active` and moved by UPDATE thereafter, so the
      // realistic bad value arrives as a transition, exactly as it does for a
      // slot. `orphaned` is what a slot or a skill grant becomes when this row
      // tombstones — the neighbouring word for the neighbouring event.
      ['a transition to a state belonging to another table', sourceInstanceEdit({ state: 'orphaned' })],
      ['the empty string a missing binding would produce', sourceInstance({ state: '' })],
    ],
    accepts: [
      ['the active default', sourceInstance({})],
      ['active named explicitly', sourceInstance({ state: 'active' })],
      ['tombstoned at insert, which the grant generator writes', sourceInstance({ state: 'tombstoned' })],
      ['the tombstoning transition class removal performs', sourceInstanceEdit({ state: 'tombstoned' })],
      ['the re-take transition that writes active back', sourceInstanceEdit({ state: 'active' })],
    ],
  },
  {
    constraint: 'spell_selection_slots_selection_eligibility_check',
    rejects: [['an unclassifiable eligibility', slot({ selection_eligibility: 'maybe' })]],
    accepts: [
      ['the unselected default', slot({})],
      ['valid', slot({ selection_eligibility: 'valid' })],
      ['invalid', slot({ selection_eligibility: 'invalid' })],
    ],
  },
  {
    constraint: 'spell_selection_slots_level_window_check',
    rejects: [
      ['a minimum below cantrip level', slot({ spell_level_min: -1 })],
      ['a maximum above 9', slot({ spell_level_max: 10 })],
      ['an inverted window, which matches no spell at all', slot({ spell_level_min: 5, spell_level_max: 4 })],
      // THE SHAPE NO INSERT CASE COVERS. Every value in this UPDATE is legal on
      // its own — 4 is a fine `spell_level_max` — and the statement names only
      // that one column. It must still be refused, because SQLite re-evaluates
      // the constraint against the MERGED row and the untouched
      // `spell_level_min` of 5 now exceeds it. A writer that narrows a window
      // one column at a time can invert it without ever writing a bad value.
      ['a legal maximum that inverts the window against an untouched minimum', slotEdit({ spell_level_min: 5, spell_level_max: 9 }, { spell_level_max: 4 })],
    ],
    accepts: [
      ['the 0..9 column defaults', slot({})],
      ['a cantrip-only window of 0..0', slot({ spell_level_min: 0, spell_level_max: 0 })],
      ['a ninth-level-only window of 9..9', slot({ spell_level_min: 9, spell_level_max: 9 })],
      ['a single-level window in the interior', slot({ spell_level_min: 3, spell_level_max: 3 })],
      // The same one-column narrowing, in the direction that stays well-formed.
      ['a one-column narrowing that leaves the window well-formed', slotEdit({ spell_level_min: 0, spell_level_max: 9 }, { spell_level_min: 9 })],
    ],
  },
  {
    constraint: 'wizard_spellbook_entries_logical_address_check',
    rejects: [
      [
        'a source without its rule and ordinal',
        wizardAcquisition({}, 'source_only'),
      ],
    ],
    accepts: [
      ['a historical address-less acquisition', wizardAcquisition({})],
      [
        'a complete generated logical address',
        wizardAcquisition({}, 'complete'),
      ],
    ],
  },
  {
    constraint: 'wizard_spellbook_entries_ordinal_check',
    rejects: [
      [
        'ordinal zero in a generated address',
        wizardAcquisition({ ordinal: 0 }, 'complete'),
      ],
    ],
    accepts: [
      ['a nullable historical ordinal', wizardAcquisition({})],
      [
        'the first generated ordinal',
        wizardAcquisition({ ordinal: 1 }, 'complete'),
      ],
    ],
  },
  {
    constraint: 'wizard_spellbook_entries_acquisition_level_check',
    rejects: [
      [
        'class level zero',
        wizardAcquisition({ acquired_at_class_level: 0 }),
      ],
      [
        'class level 21',
        wizardAcquisition({ acquired_at_class_level: 21 }),
      ],
    ],
    accepts: [
      ['an unknown historical level', wizardAcquisition({})],
      [
        'the first class level',
        wizardAcquisition({ acquired_at_class_level: 1 }),
      ],
      [
        'the twentieth class level',
        wizardAcquisition({ acquired_at_class_level: 20 }),
      ],
    ],
  },
  {
    constraint: 'wizard_spellbook_entries_level_window_check',
    rejects: [
      [
        'a minimum below cantrip level',
        wizardAcquisition({ spell_level_min: -1 }),
      ],
      [
        'a maximum above ninth level',
        wizardAcquisition({ spell_level_max: 10 }),
      ],
      [
        'an inverted acquisition window',
        wizardAcquisition({ spell_level_min: 2, spell_level_max: 1 }),
      ],
    ],
    accepts: [
      ['the 1..9 defaults', wizardAcquisition({})],
      [
        'a cantrip-only acquisition window',
        wizardAcquisition({ spell_level_min: 0, spell_level_max: 0 }),
      ],
      [
        'a ninth-level-only acquisition window',
        wizardAcquisition({ spell_level_min: 9, spell_level_max: 9 }),
      ],
    ],
  },
  {
    constraint: 'wizard_spellbook_entries_state_check',
    rejects: [
      [
        'a slot-only discarded state',
        wizardAcquisition({ state: 'discarded' }),
      ],
    ],
    accepts: [
      ['the active default', wizardAcquisition({})],
      ['the orphaned lifecycle state', wizardAcquisition({ state: 'orphaned' })],
    ],
  },
  {
    constraint: 'wizard_spellbook_entries_selection_eligibility_check',
    rejects: [
      [
        'an unclassifiable eligibility',
        wizardAcquisition({ selection_eligibility: 'unknown' }),
      ],
    ],
    accepts: [
      ['the unselected default', wizardAcquisition({})],
      ['a valid selection', wizardAcquisition({ selection_eligibility: 'valid' })],
      [
        'an invalid retained selection',
        wizardAcquisition({ selection_eligibility: 'invalid' }),
      ],
    ],
  },
  {
    constraint: 'feat_definitions_min_level_check',
    rejects: [
      ['level 0, below every character level', featDefinition({ min_level: 0 })],
      ['level 21, above every character level', featDefinition({ min_level: 21 })],
      ['a fractional level', featDefinition({ min_level: 4.5 })],
    ],
    accepts: [
      ['no minimum level', featDefinition({ min_level: null })],
      ['level 1', featDefinition({ min_level: 1 })],
      ['the General feat level', featDefinition({ min_level: 4 })],
      ['the Epic Boon level', featDefinition({ min_level: 19 })],
      ['level 20', featDefinition({ min_level: 20 })],
    ],
  },
  {
    constraint: 'feat_definitions_ability_points_check',
    rejects: [
      ['a negative point grant', featDefinition({ ability_points: -1 })],
      ['three points', featDefinition({ ability_points: 3 })],
      ['a fractional point', featDefinition({ ability_points: 1.5 })],
      ['a text description', featDefinition({ ability_points: 'one' })],
    ],
    accepts: [
      ['the zero-point default', featDefinition({})],
      ['one point', featDefinition({ ability_points: 1 })],
      ['two points', featDefinition({ ability_points: 2 })],
    ],
  },
  {
    constraint: 'feat_definitions_ability_increase_maximum_check',
    rejects: [
      ['a zero cap', featDefinition({ ability_increase_maximum: 0 })],
      ['a cap above the ability-score range', featDefinition({ ability_increase_maximum: 31 })],
      ['a fractional cap', featDefinition({ ability_increase_maximum: 20.5 })],
      ['a text cap', featDefinition({ ability_increase_maximum: 'twenty' })],
    ],
    accepts: [
      ['an honestly unknown cap', featDefinition({ ability_increase_maximum: null })],
      ['the ASI cap', featDefinition({ ability_increase_maximum: 20 })],
      ['the Epic Boon cap', featDefinition({ ability_increase_maximum: 30 })],
    ],
  },
  {
    constraint: 'class_definitions_progression_type_check',
    rejects: [
      ['a progression every caster-fraction branch would fall through', classDefinition({ progression_type: 'half' })],
      ['an empty progression type', classDefinition({ progression_type: '' })],
    ],
    accepts: [
      ['the none default', classDefinition({})],
      ['pact', classDefinition({ progression_type: 'pact' })],
      ['third_down', classDefinition({ progression_type: 'third_down' })],
    ],
  },
  {
    constraint: 'class_definitions_spellcasting_ability_check',
    rejects: [['an ability with no column behind it', classDefinition({ spellcasting_ability: 'sorcery' })]],
    accepts: [
      ['the null a non-casting class genuinely has', classDefinition({ spellcasting_ability: null })],
      ['a real ability', classDefinition({ spellcasting_ability: 'charisma' })],
    ],
  },
  {
    constraint: 'class_progressions_class_level_check',
    rejects: [
      ['level 0, which every `class_level <= ?` lookup would always match', classProgression({ class_level: 0 })],
      ['level 21, which none would ever match', classProgression({ class_level: 21 })],
    ],
    accepts: [
      ['level 1', classProgression({ class_level: 1 })],
      ['level 20', classProgression({ class_level: 20 })],
    ],
  },
  {
    constraint: 'class_resources_kind_check',
    rejects: [['an unseeded ladder kind', classResource({ resource_kind: 'ki_points' })]],
    accepts: [['Focus Points', classResource({ resource_kind: 'focus_points' })]],
  },
  {
    constraint: 'class_resources_level_maximum_check',
    rejects: [
      ['class level 0', classResource({ class_level: 0 })],
      ['class level 21', classResource({ class_level: 21 })],
      ['fractional class level 1.5', classResource({ class_level: 1.5 })],
      ['a negative maximum', classResource({ maximum: -1 })],
      ['a text maximum', classResource({ maximum: 'three' })],
    ],
    accepts: [
      ['the sourced zero before acquisition', classResource({ class_level: 1, maximum: 0 })],
      ['level 20 with a positive maximum', classResource({ class_level: 20, maximum: 20 })],
    ],
  },
  {
    constraint: 'class_resource_formulas_resource_kind_check',
    rejects: [['a feature outside the licensed inventory', classResourceFormula({ resource_kind: 'arcane_recovery' })]],
    accepts: [['Lay On Hands', classResourceFormula({ resource_kind: 'lay_on_hands' })]],
  },
  {
    constraint: 'class_resource_formulas_formula_kind_check',
    rejects: [['an arbitrary expression discriminator', classResourceFormula({ formula_kind: 'expression' })]],
    accepts: [['a sourced fixed count', classResourceFormula({})]],
  },
  {
    constraint: 'class_resource_formulas_level_check',
    rejects: [
      ['acquisition level 0', classResourceFormula({ minimum_class_level: 0 })],
      ['acquisition level 21', classResourceFormula({ minimum_class_level: 21 })],
      ['fractional acquisition level 1.5', classResourceFormula({ minimum_class_level: 1.5 })],
    ],
    accepts: [
      ['acquisition level 1', classResourceFormula({ minimum_class_level: 1 })],
      ['acquisition level 20', classResourceFormula({ minimum_class_level: 20 })],
    ],
  },
  {
    constraint: 'class_resource_formulas_fixed_count_check',
    rejects: [
      ['a zero fixed count', classResourceFormula({ fixed_count: 0 })],
      ['a text fixed count', classResourceFormula({ fixed_count: 'one' })],
    ],
    accepts: [['a one-use gate', classResourceFormula({ fixed_count: 1 })]],
  },
  {
    constraint: 'class_resource_formulas_ability_check',
    rejects: [['an unsupported ability', classResourceFormula({
      formula_kind: 'ability_modifier_minimum_one',
      fixed_count: null,
      ability: 'strength',
    })]],
    accepts: [['Wisdom', classResourceFormula({
      formula_kind: 'ability_modifier_minimum_one',
      fixed_count: null,
      ability: 'wisdom',
    })]],
  },
  {
    constraint: 'class_resource_formulas_multiplier_check',
    rejects: [['a zero multiplier', classResourceFormula({
      formula_kind: 'class_level_multiple',
      fixed_count: null,
      multiplier: 0,
    })]],
    accepts: [['the Lay On Hands multiplier', classResourceFormula({
      formula_kind: 'class_level_multiple',
      fixed_count: null,
      multiplier: 5,
    })]],
  },
  {
    constraint: 'class_resource_formulas_payload_check',
    rejects: [
      ['a fixed count with a stray ability', classResourceFormula({ ability: 'charisma' })],
      ['an ability formula without an ability', classResourceFormula({
        formula_kind: 'ability_modifier_minimum_one',
        fixed_count: null,
      })],
      ['a stepped formula without later steps', classResourceFormula({
        formula_kind: 'fixed_count_by_class_level',
      })],
    ],
    accepts: [['a complete stepped payload', classResourceFormula({
      formula_kind: 'fixed_count_by_class_level',
      later_fixed_count_steps: '[{"minimum_class_level":17,"count":2}]',
    })]],
  },
  {
    constraint: 'class_resource_formulas_steps_json_check',
    rejects: [
      ['malformed step JSON', classResourceFormula({
        formula_kind: 'fixed_count_by_class_level',
        later_fixed_count_steps: '[',
      })],
      ['an empty step array', classResourceFormula({
        formula_kind: 'fixed_count_by_class_level',
        later_fixed_count_steps: '[]',
      })],
      ['a JSON object instead of an array', classResourceFormula({
        formula_kind: 'fixed_count_by_class_level',
        later_fixed_count_steps: '{}',
      })],
    ],
    accepts: [['a non-empty canonical step array', classResourceFormula({
      formula_kind: 'fixed_count_by_class_level',
      later_fixed_count_steps: '[{"minimum_class_level":17,"count":2}]',
    })]],
  },
  {
    constraint: 'subclass_progressions_class_level_check',
    rejects: [
      ['level 0', subclassProgression({ class_level: 0 })],
      ['level 21', subclassProgression({ class_level: 21 })],
    ],
    accepts: [
      ['level 1', subclassProgression({ class_level: 1 })],
      ['level 20', subclassProgression({ class_level: 20 })],
    ],
  },
  {
    constraint: 'subclass_progressions_max_spell_level_check',
    rejects: [
      ['a negative maximum spell level', subclassProgression({ max_spell_level: -1 })],
      ['a maximum above 9', subclassProgression({ max_spell_level: 10 })],
    ],
    accepts: [
      ['the zero default a pre-spellcasting level carries', subclassProgression({})],
      ['the ninth-level maximum', subclassProgression({ max_spell_level: 9 })],
    ],
  },
  {
    constraint: 'spell_versions_level_check',
    rejects: [
      ['a catalog spell below cantrip level', spellVersion({ level: -1 })],
      ['a catalog spell above ninth level', spellVersion({ level: 10 })],
      ['a catalog spell at -1 even when it says so in provenance', spellVersion({ level: -1, provenance: 'import' })],
      // WHY THE CATALOG IMPORTER MUST UPGRADE A PLACEHOLDER IN ONE STATEMENT.
      // `catalog-importer.ts` accumulates every changed column into a single
      // `changes` object and emits ONE `UPDATE spell_versions`, so `level` and
      // `provenance` move together. Split into two statements, the provenance
      // half would land first and leave `level = -1` on a row no longer
      // claiming to be a placeholder — refused here, which is what makes the
      // single-statement upgrade a requirement rather than a coincidence.
      ['dropping placeholder provenance while the level is still -1', spellVersionEdit({ level: -1, provenance: 'placeholder' }, { provenance: 'import' })],
    ],
    accepts: [
      // THE CASE THIS CONSTRAINT EXISTS FOR. The unguarded form `level BETWEEN
      // 0 AND 9` breaks share import: `mintPlaceholderSpellVersion` writes -1
      // for an uncatalogued spell. If this ever fails, the guard was dropped.
      ['the share-import placeholder at level -1', spellVersion({ level: -1, provenance: 'placeholder' })],
      ['a cantrip at level 0', spellVersion({ level: 0 })],
      ['a ninth-level spell', spellVersion({ level: 9 })],
      // The importer's real upgrade path: both columns in one statement. This
      // is the accept whose absence would make the reject above a demand the
      // application cannot satisfy.
      ['the placeholder upgrade the importer performs, level and provenance together', spellVersionEdit({ level: -1, provenance: 'placeholder' }, { level: 3, provenance: 'import' })],
    ],
  },
  /* ======================================================================
   * THE STRUCTURED SPELL VALUES.
   *
   * The four range constraints are the ones worth reading carefully, because
   * the first version of them was WRONG in a way that parsed, generated and
   * looked right. `nullOrIntegerAtLeast` emits a top-level `OR`, SQL binds
   * `AND` tighter than `OR`, and composing the two un-parenthesised turned
   * `spell_versions_area_check` into "true whenever `area_feet` is NULL" — so
   * a shape with no size, the exact thing it exists to refuse, would have
   * passed. The helper now parenthesises itself (`db/schema/columns.ts`) and
   * the cases below are what would have caught it.
   * ====================================================================== */
  {
    constraint: 'spell_versions_range_kind_check',
    rejects: [
      ['a kind no reader recognises', spellVersion({ range_kind: 'planar' })],
      // The printed word rather than the stored member. `decodeSpellRange`
      // matches exactly, so a capitalised value reads as NO structured range —
      // silently, and with the raw text still printing correctly beside it.
      ['the printed capitalisation', spellVersion({ range_kind: 'Touch' })],
      ['an empty kind, which is a null in costume', spellVersion({ range_kind: '' })],
    ],
    accepts: [
      // THE COMMON CASE BY FAR: a spell whose range line this build could not
      // read. Every column this change adds is NULL and the text still prints.
      ['a range line nothing parsed', spellVersion({})],
      ['Touch, which is not a distance', spellVersion({ range_kind: 'touch' })],
      ['Self, which the bundled SRD prints twice', spellVersion({ range_kind: 'self' })],
    ],
  },
  {
    constraint: 'spell_versions_range_feet_check',
    rejects: [
      ['a negative distance', spellVersion({ range_kind: 'ranged', range_feet: -1 })],
      ['a fractional distance', spellVersion({ range_kind: 'ranged', range_feet: 2.5 })],
      // THE CROSS-COLUMN HALF. A distance on a Touch spell would print a range
      // the source never gave, and it is exactly what a writer that set the
      // feet without the kind would produce.
      ['a distance attached to Touch', spellVersion({ range_kind: 'touch', range_feet: 30 })],
      ['a distance with no kind at all', spellVersion({ range_feet: 60 })],
    ],
    accepts: [
      ['no distance recorded, which is not zero', spellVersion({ range_kind: 'touch' })],
      // ZERO IS A REAL VALUE AND NOT AN ABSENCE. D24: a 0-foot range and an
      // unrecorded range are different facts, so the bound is 0 and not 1.
      ['a zero-foot ranged spell', spellVersion({ range_kind: 'ranged', range_feet: 0 })],
      ['sixty feet', spellVersion({ range_kind: 'ranged', range_feet: 60 })],
    ],
  },
  {
    constraint: 'spell_versions_area_shape_check',
    rejects: [
      ['a shape outside the owner\u2019s four', spellVersion({ range_kind: 'self', area_shape: 'cube', area_feet: 15 })],
      ['the printed capitalisation', spellVersion({ range_kind: 'self', area_shape: 'Cone', area_feet: 15 })],
    ],
    accepts: [
      ['no area at all', spellVersion({ range_kind: 'self' })],
      ['a cone, the shape the bundled SRD names', spellVersion({ range_kind: 'self', area_shape: 'cone', area_feet: 15 })],
      ['a line, the owner\u2019s lightning-bolt case', spellVersion({ range_kind: 'self', area_shape: 'line', area_feet: 100 })],
    ],
  },
  {
    constraint: 'spell_versions_area_check',
    rejects: [
      // BOTH DIRECTIONS OF THE CORRELATION. Half an area is worse than none: a
      // reader would have to invent the missing half.
      ['a shape with no size', spellVersion({ range_kind: 'self', area_shape: 'cone' })],
      ['a size with no shape', spellVersion({ range_kind: 'self', area_feet: 15 })],
      // A zero-foot cone is not an area. Unlike `range_feet`, where zero is a
      // real printed value, an area of zero has no referent.
      ['a zero-foot area', spellVersion({ range_kind: 'self', area_shape: 'cone', area_feet: 0 })],
      ['a fractional area', spellVersion({ range_kind: 'self', area_shape: 'sphere', area_feet: 7.5 })],
    ],
    accepts: [
      ['neither half, which is most spells', spellVersion({})],
      ['both halves', spellVersion({ range_kind: 'self', area_shape: 'cone', area_feet: 30 })],
      // The two numbers are INDEPENDENT, which is the whole reason `area_feet`
      // is not `range_feet`: a 30-foot cone is not a 30-foot range.
      ['an area on a ranged spell, with two different numbers', spellVersion({ range_kind: 'ranged', range_feet: 150, area_shape: 'sphere', area_feet: 20 })],
    ],
  },
  {
    constraint: 'spell_versions_material_cost_check',
    rejects: [
      // BOTH DIRECTIONS AGAIN. A price with no `exact`/`minimum` cannot be
      // printed without inventing which one it is, and inventing `exact` for
      // the SRD's `worth 1+ CP` is the D24 failure this pair exists to stop.
      ['a price with no exact/minimum', spellVersion({ material_cost_copper: 100 })],
      ['an exact/minimum with no price', spellVersion({ material_cost_kind: 'minimum' })],
      ['a negative price', spellVersion({ material_cost_copper: -1, material_cost_kind: 'exact' })],
      ['a fractional copper price', spellVersion({ material_cost_copper: 0.5, material_cost_kind: 'exact' })],
      ['a kind no reader recognises', spellVersion({ material_cost_copper: 100, material_cost_kind: 'about' })],
    ],
    accepts: [
      ['no material price, which is most spells', spellVersion({})],
      // THE BUNDLED TRUE STRIKE COMPONENT: "worth 1+ CP". One copper, and a
      // FLOOR — the `+` that an integer column alone would have dropped.
      ['the bundled 1+ CP floor', spellVersion({ material_cost_copper: 1, material_cost_kind: 'minimum' })],
      ['a free component priced at nothing', spellVersion({ material_cost_copper: 0, material_cost_kind: 'exact' })],
      ['300 GP in copper', spellVersion({ material_cost_copper: 30_000, material_cost_kind: 'minimum' })],
    ],
  },
  /* ======================================================================
   * THE TWO PROGRESSION LADDERS, AND THE WHOLE POINT IS THAT THEIR BOUNDS
   * DIFFER.
   *
   * `spell_versions_upcast_scale_check` USED TO SIT HERE and is deleted with
   * its subject: there is no `upcast_scale` column for it to constrain. Its
   * five cases are not re-homed, because each named a value of a vocabulary
   * that no longer exists — `'spell_level'`, `''`, `'slot_level'`,
   * `'character_level'` — and the question they asked ("which levels is this
   * list counted in?") is now answered by which TABLE the row is in.
   *
   * The bound each table carries used to be one loose 1..20 shared by both
   * meanings, because a column CHECK could not see the parent's scale. Two
   * tables can each state their own, so the database now refuses a 20 in a slot
   * list rather than deferring to a contract one layer up.
   * ====================================================================== */
  {
    constraint: 'spell_version_upcast_levels_level_check',
    rejects: [
      ['level 0, which is a cantrip and not a slot', upcastLevel({ level: 0 })],
      // THE VALUES THAT USED TO BE ACCEPTED HERE. 17 and 20 are Cantrip
      // Upgrade character levels and they belong in the sibling table; storing
      // one here would print "slot levels 5, 11, 17", a ladder no spell has.
      ['level 10, above every spell slot level', upcastLevel({ level: 10 })],
      ['level 17, a Cantrip Upgrade step and not a slot level', upcastLevel({ level: 17 })],
      ['level 20, the highest character level', upcastLevel({ level: 20 })],
      ['level 21, above every level of anything', upcastLevel({ level: 21 })],
      ['a fractional level', upcastLevel({ level: 2.5 })],
    ],
    accepts: [
      ['level 1', upcastLevel({ level: 1 })],
      ['level 9, the highest slot level', upcastLevel({ level: 9 })],
    ],
  },
  {
    constraint: 'spell_version_cantrip_upgrade_levels_level_check',
    rejects: [
      ['level 0, which is no character level at all', cantripUpgradeLevel({ level: 0 })],
      ['level 21, above every character level', cantripUpgradeLevel({ level: 21 })],
      ['a fractional level', cantripUpgradeLevel({ level: 5.5 })],
    ],
    accepts: [
      ['level 1', cantripUpgradeLevel({ level: 1 })],
      // The bundled ladder, verbatim: "when you reach levels 5 …, 11 …, and 17"
      // (`docs/srd/source/weapon-attack-cantrips.txt:26-29`). Every one of the
      // three is now unstorable in the OTHER table, which is the asymmetry this
      // pair of constraints exists to hold.
      ['level 5, the first bundled Cantrip Upgrade step', cantripUpgradeLevel({ level: 5 })],
      ['level 11, the second', cantripUpgradeLevel({ level: 11 })],
      ['level 17, the third', cantripUpgradeLevel({ level: 17 })],
      ['level 20, the highest character level', cantripUpgradeLevel({ level: 20 })],
    ],
  },
  /* ======================================================================
   * BACKGROUND EQUIPMENT.
   * ====================================================================== */
  {
    constraint: 'background_equipment_items_option_check',
    rejects: [
      ['a third package the printed line cannot express', equipmentItem({ option: 'c' })],
      ['the printed capitalisation', equipmentItem({ option: 'A' })],
    ],
    accepts: [
      ['package A', equipmentItem({ option: 'a' })],
      ['package B, which is money text alone for all four backgrounds', equipmentItem({ option: 'b' })],
    ],
  },
  {
    constraint: 'background_equipment_items_item_kind_check',
    rejects: [
      ['a kind the exhaustive switch has no arm for', equipmentItem({ item_kind: 'tool' })],
      ['an empty kind', equipmentItem({ item_kind: '' })],
      ['the retired coin kind', equipmentItem({ item_kind: 'coin' })],
    ],
    accepts: [
      ['gear, the majority case', equipmentItem({ item_kind: 'gear' })],
      ['a weapon line', equipmentItem({ item_kind: 'weapon', weapon_template_id: '@weapon' })],
      // NO LICENSED BACKGROUND PACKAGE CONTAINS ARMOUR — `Robe` and
      // `Traveler's Clothes` are clothing. This is the case that keeps the
      // owner's "unless weapon or ARMOR" limb from shipping unexercised.
      ['an armour line, which no bundled package reaches', equipmentItem({ item_kind: 'armor', armor_template_id: '@armor' })],
    ],
  },
  {
    constraint: 'background_equipment_items_sort_order_check',
    rejects: [
      ['a zero-based order', equipmentItem({ sort_order: 0 })],
      ['a fractional order', equipmentItem({ sort_order: 1.5 })],
    ],
    accepts: [['the first printed line', equipmentItem({ sort_order: 1 })]],
  },
  {
    constraint: 'background_equipment_items_quantity_check',
    rejects: [
      // A LINE WITH NO ITEMS IS NOT A LINE. Zero here is the "absence printed
      // as a fact" D24 forbids, on a column where absence is not a state.
      ['a quantity of nothing', equipmentItem({ quantity: 0 })],
      ['a fractional quantity', equipmentItem({ quantity: 1.5 })],
    ],
    accepts: [
      ['the implicit one an unnumbered line carries', equipmentItem({ quantity: 1 })],
      ['the Soldier\u2019s twenty arrows', equipmentItem({ quantity: 20 })],
    ],
  },
  {
    constraint: 'background_equipment_items_payload_check',
    rejects: [
      ['a weapon line with no weapon', equipmentItem({ item_kind: 'weapon' })],
      ['an armour line with no armour', equipmentItem({ item_kind: 'armor' })],
      // THE NEGATIVE HALF, and it is what makes `item_kind` mean something
      // rather than merely be recorded: without it a reader would have two
      // answers to "what is this line" and no way to break the tie.
      ['gear carrying a weapon anyway', equipmentItem({ item_kind: 'gear', weapon_template_id: '@weapon' })],
      ['a weapon line that is also armour', equipmentItem({ item_kind: 'weapon', weapon_template_id: '@weapon', armor_template_id: '@armor' })],
    ],
    accepts: [
      ['gear carrying nothing', equipmentItem({ item_kind: 'gear' })],
      ['a weapon line with its weapon', equipmentItem({ item_kind: 'weapon', weapon_template_id: '@weapon' })],
      ['an armour line with its armour', equipmentItem({ item_kind: 'armor', armor_template_id: '@armor' })],
    ],
  },
  /* ======================================================================
   * CLASS EQUIPMENT. These execute the same shared rule against its A/B/C
   * parent, so neither table's named constraint is merely assumed.
   * ====================================================================== */
  {
    constraint: 'class_equipment_items_option_check',
    rejects: [
      ['a fourth package the extract does not print', equipmentItem({ option: 'd' }, 'class_equipment_items')],
      ['the printed capitalisation', equipmentItem({ option: 'C' }, 'class_equipment_items')],
    ],
    accepts: [
      ['package A', equipmentItem({ option: 'a' }, 'class_equipment_items')],
      ['package B', equipmentItem({ option: 'b' }, 'class_equipment_items')],
      ['Fighter package C', equipmentItem({ option: 'c' }, 'class_equipment_items')],
    ],
  },
  {
    constraint: 'class_equipment_items_item_kind_check',
    rejects: [
      ['a kind no package reader knows', equipmentItem({ item_kind: 'tool' }, 'class_equipment_items')],
      ['the retired coin kind', equipmentItem({ item_kind: 'coin' }, 'class_equipment_items')],
    ],
    accepts: [
      ['gear', equipmentItem({ item_kind: 'gear' }, 'class_equipment_items')],
      ['weapon', equipmentItem({ item_kind: 'weapon', weapon_template_id: '@weapon' }, 'class_equipment_items')],
      ['armor', equipmentItem({ item_kind: 'armor', armor_template_id: '@armor' }, 'class_equipment_items')],
    ],
  },
  {
    constraint: 'class_equipment_items_sort_order_check',
    rejects: [
      ['a zero-based order', equipmentItem({ sort_order: 0 }, 'class_equipment_items')],
      ['a fractional order', equipmentItem({ sort_order: 1.5 }, 'class_equipment_items')],
    ],
    accepts: [['the first printed line', equipmentItem({ sort_order: 1 }, 'class_equipment_items')]],
  },
  {
    constraint: 'class_equipment_items_quantity_check',
    rejects: [
      ['a quantity of nothing', equipmentItem({ quantity: 0 }, 'class_equipment_items')],
      ['a fractional quantity', equipmentItem({ quantity: 1.5 }, 'class_equipment_items')],
    ],
    accepts: [
      ['Chain Mail as one item', equipmentItem({ quantity: 1 }, 'class_equipment_items')],
      ['the Fighter\u2019s eight javelins', equipmentItem({ quantity: 8 }, 'class_equipment_items')],
      ['twenty arrows', equipmentItem({ quantity: 20 }, 'class_equipment_items')],
    ],
  },
  {
    constraint: 'class_equipment_items_payload_check',
    rejects: [
      ['a weapon line with no weapon', equipmentItem({ item_kind: 'weapon' }, 'class_equipment_items')],
      ['an armour line with no armour', equipmentItem({ item_kind: 'armor' }, 'class_equipment_items')],
      ['gear carrying a weapon anyway', equipmentItem({ item_kind: 'gear', weapon_template_id: '@weapon' }, 'class_equipment_items')],
      ['a weapon line that is also armour', equipmentItem({ item_kind: 'weapon', weapon_template_id: '@weapon', armor_template_id: '@armor' }, 'class_equipment_items')],
    ],
    accepts: [
      ['gear carrying nothing', equipmentItem({ item_kind: 'gear' }, 'class_equipment_items')],
      ['a weapon line with its weapon', equipmentItem({ item_kind: 'weapon', weapon_template_id: '@weapon' }, 'class_equipment_items')],
      ['an armour line with its armour', equipmentItem({ item_kind: 'armor', armor_template_id: '@armor' }, 'class_equipment_items')],
    ],
  },
  {
    constraint: 'spell_versions_effect_reliability_category_check',
    rejects: [['a category no report branch knows', spellVersion({ effect_reliability_category: 'unknown' })]],
    accepts: [
      ['the fixed_effect default', spellVersion({})],
      ['attack_roll', spellVersion({ effect_reliability_category: 'attack_roll' })],
      ['mixed', spellVersion({ effect_reliability_category: 'mixed' })],
    ],
  },
  {
    constraint: 'character_weapons_damage_check',
    rejects: [
      ['dice with a NULL payload', weapon({ damage_kind: 'dice' })],
      ['flat with a NULL payload', weapon({ damage_kind: 'flat' })],
      ['custom with a NULL payload', weapon({ damage_kind: 'custom' })],
      ['not_recorded carrying dice', weapon({ damage_kind: 'not_recorded', damage_dice: '1d6' })],
      ['flat carrying a dice payload too', weapon({ damage_kind: 'flat', damage_flat: 0, damage_dice: '1d6' })],
      ['negative flat damage', weapon({ damage_kind: 'flat', damage_flat: -1 })],
      ['an unknown discriminator', weapon({ damage_kind: 'unknown' })],
    ],
    accepts: [
      ['dice with only dice', weapon({ damage_kind: 'dice', damage_dice: '2d6' })],
      ['flat zero, which is real damage', weapon({ damage_kind: 'flat', damage_flat: 0 })],
      ['custom text with only custom text', weapon({ damage_kind: 'custom', damage_custom: 'ability modifier' })],
      ['not_recorded with no payload', weapon({ damage_kind: 'not_recorded' })],
    ],
  },
  {
    constraint: 'character_weapons_versatile_damage_check',
    rejects: [
      ['dice with a NULL payload', weapon({ versatile_damage_kind: 'dice' })],
      ['flat with a NULL payload', weapon({ versatile_damage_kind: 'flat' })],
      ['custom with a NULL payload', weapon({ versatile_damage_kind: 'custom' })],
      ['not_applicable carrying dice', weapon({ versatile_damage_kind: 'not_applicable', versatile_damage_dice: '1d8' })],
      ['flat carrying custom text too', weapon({ versatile_damage_kind: 'flat', versatile_damage_flat: 0, versatile_damage_custom: 'two hands' })],
      ['negative flat damage', weapon({ versatile_damage_kind: 'flat', versatile_damage_flat: -1 })],
      ['not_recorded, which belongs only to primary damage', weapon({ versatile_damage_kind: 'not_recorded' })],
    ],
    accepts: [
      ['dice with only dice', weapon({ versatile_damage_kind: 'dice', versatile_damage_dice: '1d8' })],
      ['flat zero', weapon({ versatile_damage_kind: 'flat', versatile_damage_flat: 0 })],
      ['custom text', weapon({ versatile_damage_kind: 'custom', versatile_damage_custom: 'twice the level' })],
      ['not_applicable with no payload', weapon({ versatile_damage_kind: 'not_applicable' })],
    ],
  },
  {
    constraint: 'character_weapons_range_check',
    rejects: [
      ['none carrying a near distance', weapon({ range_kind: 'none', range_near_feet: 20 })],
      ['ranged with no near distance', weapon({ range_kind: 'ranged', range_far_feet: 60 })],
      ['ranged with an inverted pair', weapon({ range_kind: 'ranged', range_near_feet: 60, range_far_feet: 20 })],
      ['legacy with no far distance', weapon({ range_kind: 'legacy', range_near_feet: 60 })],
      ['legacy with an ordinary pair', weapon({ range_kind: 'legacy', range_near_feet: 20, range_far_feet: 60 })],
      ['a near distance below zero', weapon({ range_kind: 'ranged', range_near_feet: -1 })],
      ['a far distance above the bound', weapon({ range_kind: 'ranged', range_near_feet: 0, range_far_feet: 100001 })],
      ['a fractional distance', weapon({ range_kind: 'ranged', range_near_feet: 1.5 })],
    ],
    accepts: [
      ['none with no payload', weapon({ range_kind: 'none' })],
      ['ranged at the lower bound with no far band', weapon({ range_kind: 'ranged', range_near_feet: 0 })],
      ['ranged at both upper bounds', weapon({ range_kind: 'ranged', range_near_feet: 100000, range_far_feet: 100000 })],
      ['legacy long-only', weapon({ range_kind: 'legacy', range_far_feet: 60 })],
      ['legacy inverted', weapon({ range_kind: 'legacy', range_near_feet: 60, range_far_feet: 20 })],
    ],
  },
  {
    constraint: 'character_weapons_mastery_property_check',
    rejects: [
      ['a lowercased property, which no display or lookup matches', weapon({ mastery_property: 'cleave' })],
      ['a property that is not one of the eight', weapon({ mastery_property: 'Vorpal' })],
    ],
    accepts: [
      ['the null a user-invented weapon legitimately has', weapon({ mastery_property: null })],
      ['a real property', weapon({ mastery_property: 'Cleave' })],
      ['a real property that is actually selected', weapon({ mastery_property: 'Vex', mastery_selected: 1 })],
    ],
  },
  {
    constraint: 'character_weapons_proficiency_category_check',
    rejects: [
      // The FOUR-member vocabulary of `weapon_templates.srd_group` is not this
      // column's vocabulary, and copying a group across verbatim instead of
      // FOLDING it is the mistake this refuses. `martial_ranged` matches no
      // class's proficiency grant, so it would read as "not proficient" for a
      // Fighter holding a Longbow — the silent-wrong these CHECKs exist for.
      ['an srd_group copied across without the fold', weapon({ proficiency_category: 'martial_ranged' })],
      ['a category nobody grants', weapon({ proficiency_category: 'exotic' })],
      ['an empty category, which is a null in costume', weapon({ proficiency_category: '' })],
    ],
    accepts: [
      // THE NULL LIMB IS THE ONE THAT MATTERS. A share link minted before D27
      // carries no category, and refusing it would make somebody's character
      // unopenable to close a gap that costs a warning (D11 part 2).
      ['the null a pre-D27 share link and a hand-typed weapon both have', weapon({ proficiency_category: null })],
      // The bare `simple` that `weapon_templates_srd_group_check` REJECTS. It
      // is legal here and illegal there, and that asymmetry is the whole of
      // D27: the template's vocabulary is the source's four table headings, and
      // this column's is the two categories a class grants.
      ['the bare simple the template refuses', weapon({ proficiency_category: 'simple' })],
      ['martial', weapon({ proficiency_category: 'martial' })],
    ],
  },
  {
    constraint: 'character_weapons_attack_kind_check',
    rejects: [
      ['a template group copied without its proficiency half removed', weapon({ attack_kind: 'simple_melee' })],
      ['an attack kind no formula branch knows', weapon({ attack_kind: 'siege' })],
      ['an empty value pretending to be absence', weapon({ attack_kind: '' })],
    ],
    accepts: [
      ['the honest not-recorded state', weapon({ attack_kind: null })],
      ['melee', weapon({ attack_kind: 'melee' })],
      ['ranged', weapon({ attack_kind: 'ranged' })],
    ],
  },
  {
    constraint: 'weapon_templates_damage_check',
    rejects: [
      ['dice with a NULL payload', weaponTemplate({ damage_kind: 'dice', damage_dice: null })],
      ['flat with a NULL payload', weaponTemplate({ damage_kind: 'flat', damage_dice: null })],
      ['custom with a NULL payload', weaponTemplate({ damage_kind: 'custom', damage_dice: null })],
      ['not_recorded carrying custom text', weaponTemplate({ damage_kind: 'not_recorded', damage_dice: null, damage_custom: 'unknown' })],
      ['negative flat damage', weaponTemplate({ damage_kind: 'flat', damage_dice: null, damage_flat: -1 })],
    ],
    accepts: [
      ['dice', weaponTemplate({ damage_kind: 'dice', damage_dice: '1d6' })],
      ['flat zero', weaponTemplate({ damage_kind: 'flat', damage_dice: null, damage_flat: 0 })],
      ['custom text', weaponTemplate({ damage_kind: 'custom', damage_dice: null, damage_custom: 'special table' })],
      ['not_recorded', weaponTemplate({ damage_kind: 'not_recorded', damage_dice: null })],
    ],
  },
  {
    constraint: 'weapon_templates_versatile_damage_check',
    rejects: [
      ['dice with a NULL payload', weaponTemplate({ versatile_damage_kind: 'dice' })],
      ['flat with a NULL payload', weaponTemplate({ versatile_damage_kind: 'flat' })],
      ['custom with a NULL payload', weaponTemplate({ versatile_damage_kind: 'custom' })],
      ['not_applicable carrying a flat amount', weaponTemplate({ versatile_damage_kind: 'not_applicable', versatile_damage_flat: 1 })],
      ['negative flat damage', weaponTemplate({ versatile_damage_kind: 'flat', versatile_damage_flat: -1 })],
    ],
    accepts: [
      ['dice', weaponTemplate({ versatile_damage_kind: 'dice', versatile_damage_dice: '1d8' })],
      ['flat zero', weaponTemplate({ versatile_damage_kind: 'flat', versatile_damage_flat: 0 })],
      ['custom text', weaponTemplate({ versatile_damage_kind: 'custom', versatile_damage_custom: 'special table' })],
      ['not_applicable', weaponTemplate({ versatile_damage_kind: 'not_applicable' })],
    ],
  },
  {
    constraint: 'weapon_templates_range_check',
    rejects: [
      ['ranged with no near distance', weaponTemplate({ range_kind: 'ranged', range_far_feet: 60 })],
      ['ranged with an inverted pair', weaponTemplate({ range_kind: 'ranged', range_near_feet: 60, range_far_feet: 20 })],
      ['legacy long-only', weaponTemplate({ range_kind: 'legacy', range_far_feet: 60 })],
      ['legacy inverted', weaponTemplate({ range_kind: 'legacy', range_near_feet: 60, range_far_feet: 20 })],
      ['a negative distance', weaponTemplate({ range_kind: 'ranged', range_near_feet: -1 })],
      ['a distance above the bound', weaponTemplate({ range_kind: 'ranged', range_near_feet: 100001 })],
    ],
    accepts: [
      ['none with no payload', weaponTemplate({ range_kind: 'none' })],
      ['ranged with no far band', weaponTemplate({ range_kind: 'ranged', range_near_feet: 20 })],
      ['ranged at both upper bounds', weaponTemplate({ range_kind: 'ranged', range_near_feet: 100000, range_far_feet: 100000 })],
    ],
  },
  {
    constraint: 'weapon_templates_mastery_property_check',
    rejects: [['a mis-parsed property from the SRD table', weaponTemplate({ mastery_property: 'cleave' })]],
    accepts: [['a real property', weaponTemplate({ mastery_property: 'Vex' })]],
  },
  {
    constraint: 'weapon_templates_srd_group_check',
    rejects: [['the struck-down simple/martial category', weaponTemplate({ srd_group: 'simple' })]],
    accepts: [
      ['simple_melee', weaponTemplate({ srd_group: 'simple_melee' })],
      ['martial_ranged', weaponTemplate({ srd_group: 'martial_ranged' })],
    ],
  },
  {
    constraint: 'weapon_templates_rules_edition_check',
    rejects: [['an edition the seeder never writes', weaponTemplate({ rules_edition: '2025' })]],
    accepts: [
      ['the 2024 default the seeder binds', weaponTemplate({})],
      ['2014', weaponTemplate({ rules_edition: '2014' })],
    ],
  },
  {
    constraint: 'class_weapon_mastery_grants_grant_check',
    rejects: [
      ['a grant that would read as not_granted to every non-exhaustive branch', masteryGrant({ grant: 'granted' })],
      ['an empty grant', masteryGrant({ grant: '' })],
    ],
    accepts: [
      ['not_granted', masteryGrant({ grant: 'not_granted' })],
      ['counts_known', masteryGrant({ grant: 'counts_known' })],
      // The load-bearing member: the class grants the feature and we do not
      // hold its numbers. Collapsing it costs the character an entitlement.
      ['counts_unsourced', masteryGrant({ grant: 'counts_unsourced' })],
    ],
  },
  {
    constraint: 'class_weapon_mastery_counts_check',
    rejects: [
      ['level 0, which the `class_level <= ?` resolution would always win', masteryCount({ class_level: 0 })],
      ['level 21', masteryCount({ class_level: 21 })],
      ['a negative mastery count', masteryCount({ mastery_count: -1 })],
      // A bare `mastery_count >= 0` admitted this; the `typeof` limb refuses
      // it. `class_level` needs no such limb — its `BETWEEN` upper bound
      // already rejects text, which is the asymmetry `columns.ts` measures.
      ['a text mastery count, which a bare lower bound would have admitted', masteryCount({ mastery_count: 'two' })],
      ['a text class level, already refused by the BETWEEN upper bound', masteryCount({ class_level: 'five' })],
    ],
    accepts: [
      ['level 1', masteryCount({ class_level: 1 })],
      ['level 20', masteryCount({ class_level: 20 })],
      // Zero is legitimate in principle even though no printed row carries one;
      // refusing it would invent a rule the source does not state.
      ['a zero count', masteryCount({ mastery_count: 0 })],
    ],
  },

  // --- origins ------------------------------------------------------------
  // The trait cases below are declared TWICE, once per trait table, and that
  // duplication is deliberate: the template's constraints and the character
  // copy's are identical because the copy is column-wise, and a rule that held
  // on only one side would let the copy itself produce a row the schema
  // refuses. Proving them separately is what makes that claim checkable.
  {
    constraint: 'species_templates_rules_edition_check',
    rejects: [
      ['an edition no catalog row uses', speciesTemplate({ rules_edition: '5e' })],
    ],
    accepts: [
      ['the 2024 default', speciesTemplate({})],
      ['2014', speciesTemplate({ rules_edition: '2014' })],
    ],
  },
  {
    constraint: 'species_templates_base_speed_check',
    rejects: [
      // Eight of the nine print 30 and the Goliath prints 35. A zero here is a
      // mis-parse of the `Speed: NN feet` line, not a species.
      ['a zero Speed, which is a mis-parse rather than a species', speciesTemplate({ base_speed_feet: 0 })],
      ['a negative Speed', speciesTemplate({ base_speed_feet: -30 })],
      ['a text Speed, which a bare lower bound would have admitted', speciesTemplate({ base_speed_feet: 'thirty' })],
    ],
    accepts: [
      ['the 30 eight of the nine species print', speciesTemplate({ base_speed_feet: 30 })],
      // The one species that would ship silently wrong if Speed were defaulted.
      ["the Goliath's 35", speciesTemplate({ base_speed_feet: 35 })],
    ],
  },
  {
    constraint: 'background_templates_rules_edition_check',
    rejects: [
      ['an edition no catalog row uses', backgroundTemplate({ rules_edition: '5e' })],
    ],
    accepts: [
      ['the 2024 default', backgroundTemplate({})],
      ['2014', backgroundTemplate({ rules_edition: '2014' })],
    ],
  },
  ...authoredCharacterEffectConstraintCases(
    'background_template_effects',
    backgroundTemplateEffect,
  ),
  {
    constraint: 'background_template_effects_sort_order_check',
    rejects: [
      ['sort order zero', backgroundTemplateEffect({ sort_order: 0 })],
      ['a text sort order', backgroundTemplateEffect({ sort_order: 'first' })],
    ],
    accepts: [['the first effect', backgroundTemplateEffect({ sort_order: 1 })]],
  },
  {
    constraint: 'character_species_base_speed_check',
    rejects: [
      ['a zero Speed, which is a decision the rules do not make', characterSpecies({ base_speed_feet: 0 })],
      ['a negative Speed', characterSpecies({ base_speed_feet: -5 })],
      ['a text Speed', characterSpecies({ base_speed_feet: 'fast' })],
    ],
    accepts: [
      // The null limb is load-bearing HERE and absent on the template: a user
      // may name their own species before deciding how fast it walks.
      ['the NULL that means half-entered', characterSpecies({ base_speed_feet: null })],
      ['a copied 35', characterSpecies({ base_speed_feet: 35 })],
    ],
  },
  // --- the inverted effect model -------------------------------------------
  //
  // THE SAME SEVEN CONSTRAINTS AS BEFORE, ON TWO NEW TABLES, and the ONE that
  // changed shape is the `effect_kind` check: it was `nullOrOneOf` on a trait
  // row and is `oneOf` here, because a trait with no mechanical effect is now
  // the ABSENCE of a row. Everything else is deliberately identical on both
  // sides — the catalog-to-character copy is column-wise, so a rule that held
  // for one and not the other would let the copy itself produce a row the
  // schema refuses.
  {
    constraint: 'species_template_trait_effects_kind_check',
    rejects: [
      // An unrecognised kind reads as "no effect" to the derivation, which
      // costs the character a trait's mechanics with no error anywhere.
      ['a kind outside the closed set', speciesTemplateTraitEffect({ effect_kind: 'ability_score_increase' })],
      ['an empty kind', speciesTemplateTraitEffect({ effect_kind: '' })],
      ['a near-miss of a real member', speciesTemplateTraitEffect({ effect_kind: 'damage_resistances' })],
      // THE RETIRED MEMBER. A share link minted before this build may still
      // SAY `granted_spells`, and the boundary accepts and drops it; what must
      // never happen is one reaching a stored row, because nothing downstream
      // has a meaning for it.
      ['granted_spells, retired from the vocabulary', speciesTemplateTraitEffect({ effect_kind: 'granted_spells' })],
      // The NULL that used to be the DEFAULT is refused too, by NOT NULL rather
      // than by this CHECK — see the dedicated case at the end of this file,
      // which asserts the error code rather than assuming which rule fired.
    ],
    accepts: [
      ['damage_resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', damage_type: 'Poison' })],
      ['hp_modifier', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1 })],
      ['speed', speciesTemplateTraitEffect({ effect_kind: 'speed', speed_bonus_feet: 5 })],
      ['ability_increase', speciesTemplateTraitEffect({ effect_kind: 'ability_increase', ability: 'strength', amount: 1, maximum: 20 })],
      ['ability_override', speciesTemplateTraitEffect({ effect_kind: 'ability_override', ability: 'strength', maximum: 19 })],
      ['armor_class_bonus', speciesTemplateTraitEffect({ effect_kind: 'armor_class_bonus', amount: 1 })],
      ['armor_class_formula', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 1 })],
      ['attack_ability_override', speciesTemplateTraitEffect({ effect_kind: 'attack_ability_override', ability: 'charisma', weapon_scope: 'one_bonded_weapon' })],
      ['weapon_attack_bonus', speciesTemplateTraitEffect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })],
      ['weapon_damage_bonus', speciesTemplateTraitEffect({ effect_kind: 'weapon_damage_bonus', amount: 1, weapon_scope: 'any_weapon' })],
    ],
  },
  {
    constraint: 'species_template_trait_effects_damage_type_kind_check',
    rejects: [
      ['a damage type on an hp_modifier effect', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1, damage_type: 'Fire' })],
      ['a damage type on a speed effect', speciesTemplateTraitEffect({ effect_kind: 'speed', speed_bonus_feet: 5, damage_type: 'Fire' })],
    ],
    accepts: [
      ['a typed resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', damage_type: 'Poison' })],
      // The Dragonborn AND the Tiefling: each grants A resistance and the TYPE
      // is a choice the source declines to make, so a null here is a real
      // state. Recording that for the Tiefling is the whole point of this
      // change — it used to be recorded nowhere.
      ['an untyped resistance, which is the Dragonborn and the Tiefling', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', damage_type: null })],
    ],
  },
  {
    constraint: 'species_template_trait_effects_hit_points_kind_check',
    rejects: [
      ['a flat HP bonus on a resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', hit_points_flat: 1 })],
      ['a per-level HP bonus on a speed effect', speciesTemplateTraitEffect({ effect_kind: 'speed', speed_bonus_feet: 5, hit_points_per_level: 1 })],
    ],
    accepts: [
      // BOTH halves at once. Not the seeded Dwarven Toughness, which is
      // per-level only (`flat = 0`) — this is the shape a user's own effect may
      // take, and the constraint must permit it.
      ['both halves on one effect', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1, hit_points_per_level: 1 })],
      ['a flat-only HP bonus', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_flat: 2 })],
    ],
  },
  {
    constraint: 'species_template_trait_effects_speed_kind_check',
    rejects: [
      ['a speed bonus on a resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', speed_bonus_feet: 10 })],
      ['a speed bonus on an hp_modifier effect', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1, speed_bonus_feet: 10 })],
    ],
    accepts: [
      ['a speed effect carrying its bonus', speciesTemplateTraitEffect({ effect_kind: 'speed', speed_bonus_feet: 5 })],
    ],
  },
  {
    constraint: 'species_template_trait_effects_base_kind_check',
    rejects: [['an AC base on a resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', base: 13 })]],
    accepts: [['an AC formula base', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_ability_1_kind_check',
    rejects: [['a formula ability on a resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', ability_1: 'dexterity' })]],
    accepts: [['a first formula ability', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_ability_2_kind_check',
    rejects: [['a second formula ability on a resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', ability_2: 'wisdom' })]],
    accepts: [['a second formula ability', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', ability_2: 'wisdom', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_allows_shield_kind_check',
    rejects: [['a shield flag on a resistance', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', allows_shield: 1 })]],
    accepts: [['a formula that forbids a shield', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 0 })]],
  },
  {
    constraint: 'species_template_trait_effects_weapon_scope_kind_check',
    rejects: [['a weapon scope on a species formula', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 1, weapon_scope: 'any_weapon' })]],
    accepts: [['a species formula with no weapon scope', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 1, weapon_scope: null })]],
  },
  {
    constraint: 'species_template_trait_effects_hp_modifier_payload_check',
    rejects: [
      // Without this the derivation returns 0, which is indistinguishable from
      // an effect that was never mechanical.
      ['an hp_modifier effect promising a number and carrying none', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier' })],
    ],
    accepts: [
      ['a flat-only bonus', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1 })],
      ['a per-level-only bonus', speciesTemplateTraitEffect({ effect_kind: 'hp_modifier', hit_points_per_level: 1 })],
      // `damage_resistance` is deliberately outside this constraint: an
      // untyped resistance is a real state, not an incomplete one.
      ['an untyped resistance with no payload at all', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance' })],
    ],
  },
  {
    constraint: 'species_template_trait_effects_speed_payload_check',
    rejects: [
      ['a speed effect promising a number and carrying none', speciesTemplateTraitEffect({ effect_kind: 'speed' })],
    ],
    accepts: [
      ['a speed effect carrying its bonus', speciesTemplateTraitEffect({ effect_kind: 'speed', speed_bonus_feet: 10 })],
      ['a resistance, which promises no number', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance' })],
    ],
  },
  {
    constraint: 'species_template_trait_effects_armor_class_formula_payload_check',
    rejects: [['a formula with no shield rule', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity' })]],
    accepts: [['a complete species formula', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_base_check',
    rejects: [['a zero AC base', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 0, ability_1: 'dexterity', allows_shield: 1 })]],
    accepts: [['the lower bound one', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 1, ability_1: 'dexterity', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_ability_1_check',
    rejects: [['an unknown first ability', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'luck', allows_shield: 1 })]],
    accepts: [['a known first ability', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'constitution', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_ability_2_check',
    rejects: [['an unknown second ability', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', ability_2: 'luck', allows_shield: 1 })]],
    accepts: [['a known second ability', speciesTemplateTraitEffect({ effect_kind: 'armor_class_formula', base: 10, ability_1: 'dexterity', ability_2: 'wisdom', allows_shield: 1 })]],
  },
  {
    constraint: 'species_template_trait_effects_weapon_scope_check',
    // D236 permits the wide character vocabulary here, including weapon-scoped
    // kinds. Their positive and negative payload cases are pinned by the shared
    // authored-character cases below; this row keeps the nullable limb pinned.
    rejects: [],
    accepts: [['the required NULL scope', speciesTemplateTraitEffect({ effect_kind: 'damage_resistance', weapon_scope: null })]],
  },
  ...authoredCharacterEffectConstraintCases(
    'species_template_trait_effects',
    speciesTemplateTraitEffect,
  ).filter(({ constraint }) => new Set([
    'species_template_trait_effects_ability_check',
    'species_template_trait_effects_ability_kind_check',
    'species_template_trait_effects_amount_check',
    'species_template_trait_effects_amount_kind_check',
    'species_template_trait_effects_maximum_check',
    'species_template_trait_effects_maximum_kind_check',
    'species_template_trait_effects_ability_increase_payload_check',
    'species_template_trait_effects_ability_override_payload_check',
    'species_template_trait_effects_armor_class_bonus_payload_check',
    'species_template_trait_effects_attack_ability_override_payload_check',
    'species_template_trait_effects_weapon_attack_bonus_payload_check',
    'species_template_trait_effects_weapon_damage_bonus_payload_check',
  ]).has(constraint)),
  {
    constraint: 'species_template_trait_effects_sort_order_check',
    rejects: [
      ['sort order 0, below the dense 1-based declared order', speciesTemplateTraitEffect({ sort_order: 0 })],
      ['a negative sort order', speciesTemplateTraitEffect({ sort_order: -1 })],
      ['a text sort order, which a bare lower bound would have admitted', speciesTemplateTraitEffect({ sort_order: 'first' })],
    ],
    accepts: [
      ['the first declared effect', speciesTemplateTraitEffect({ sort_order: 1 })],
      ['the second, which is what a two-effect trait needs', speciesTemplateTraitEffect({ sort_order: 2 })],
    ],
  },
  {
    constraint: 'species_template_traits_sort_order_check',
    rejects: [
      ['sort order 0, below the dense 1-based printed order', speciesTemplateTrait({ sort_order: 0 })],
      ['a negative sort order', speciesTemplateTrait({ sort_order: -1 })],
      ['a text sort order, which a bare lower bound would have admitted', speciesTemplateTrait({ sort_order: 'first' })],
    ],
    accepts: [
      ['the first printed trait', speciesTemplateTrait({ sort_order: 1 })],
      ["the fifth, which is the Dragonborn's Draconic Flight", speciesTemplateTrait({ sort_order: 5 })],
    ],
  },
  {
    constraint: 'character_effects_kind_check',
    rejects: [
      ['a kind outside the closed set', characterEffect({ effect_kind: 'ability_score_increase' })],
      ['an empty kind', characterEffect({ effect_kind: '' })],
      ['a near-miss of a real member', characterEffect({ effect_kind: 'damage_resistances' })],
      ['granted_spells, retired from the vocabulary', characterEffect({ effect_kind: 'granted_spells' })],
    ],
    accepts: [
      ['damage_resistance', characterEffect({ effect_kind: 'damage_resistance', damage_type: 'Poison' })],
      ['hp_modifier', characterEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1 })],
      ['speed', characterEffect({ effect_kind: 'speed', speed_bonus_feet: 5 })],
      ['ability_increase', sourcedCharacterEffect({})],
      ['ability_override', abilityOverrideEffect({})],
    ],
  },
  {
    constraint: 'character_effects_damage_type_kind_check',
    rejects: [
      ['a damage type on an hp_modifier effect', characterEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1, damage_type: 'Fire' })],
      ['a damage type on a speed effect', characterEffect({ effect_kind: 'speed', speed_bonus_feet: 5, damage_type: 'Fire' })],
    ],
    accepts: [
      ['a typed resistance', characterEffect({ effect_kind: 'damage_resistance', damage_type: 'Poison' })],
      // On THIS side the null means something different from the template's:
      // there it is "the source declines to say", here it is "this player has
      // not decided yet". Same column, same constraint, different fact — which
      // is why the two tables are two tables.
      ['an untyped resistance, which is a decision the player has not made', characterEffect({ effect_kind: 'damage_resistance', damage_type: null })],
    ],
  },
  {
    constraint: 'character_effects_hit_points_kind_check',
    rejects: [
      ['a flat HP bonus on a resistance', characterEffect({ effect_kind: 'damage_resistance', hit_points_flat: 1 })],
      ['a per-level HP bonus on a speed effect', characterEffect({ effect_kind: 'speed', speed_bonus_feet: 5, hit_points_per_level: 1 })],
    ],
    accepts: [
      ['both halves on one effect', characterEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1, hit_points_per_level: 1 })],
      ['a flat-only HP bonus', characterEffect({ effect_kind: 'hp_modifier', hit_points_flat: 2 })],
    ],
  },
  {
    constraint: 'character_effects_speed_kind_check',
    rejects: [
      ['a speed bonus on a resistance', characterEffect({ effect_kind: 'damage_resistance', speed_bonus_feet: 10 })],
      ['a speed bonus on an hp_modifier effect', characterEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1, speed_bonus_feet: 10 })],
    ],
    accepts: [
      ['a speed effect carrying its bonus', characterEffect({ effect_kind: 'speed', speed_bonus_feet: 5 })],
    ],
  },
  {
    constraint: 'character_effects_hp_modifier_payload_check',
    rejects: [
      ['an hp_modifier effect promising a number and carrying none', characterEffect({ effect_kind: 'hp_modifier' })],
    ],
    accepts: [
      ['a flat-only bonus', characterEffect({ effect_kind: 'hp_modifier', hit_points_flat: 1 })],
      ['a per-level-only bonus', characterEffect({ effect_kind: 'hp_modifier', hit_points_per_level: 1 })],
      ['an untyped resistance with no payload at all', characterEffect({ effect_kind: 'damage_resistance' })],
    ],
  },
  {
    constraint: 'character_effects_speed_payload_check',
    rejects: [
      ['a speed effect promising a number and carrying none', characterEffect({ effect_kind: 'speed' })],
    ],
    accepts: [
      ['a speed effect carrying its bonus', characterEffect({ effect_kind: 'speed', speed_bonus_feet: 10 })],
      ['a resistance, which promises no number', characterEffect({ effect_kind: 'damage_resistance' })],
    ],
  },
  {
    constraint: 'character_effects_ability_check',
    rejects: [
      ['an unknown ability vocabulary value', characterEffect({ ability: 'luck' })],
    ],
    accepts: [
      ['each closed-set ability used by a complete contribution', sourcedCharacterEffect({ ability: 'charisma' })],
    ],
  },
  {
    constraint: 'character_effects_ability_kind_check',
    rejects: [
      ['an ability payload on a resistance', characterEffect({ ability: 'strength' })],
    ],
    accepts: [
      ['an ability payload on an ability contribution', sourcedCharacterEffect({ ability: 'wisdom' })],
      ['an ability payload on a score override', abilityOverrideEffect({ ability: 'constitution' })],
      // WIDENED (AC-1, D72): the same column is now also
      // `attack_ability_override`'s payload.
      ['an ability payload on an attack override', weaponScopedCharacterEffect({})],
    ],
  },
  {
    constraint: 'character_effects_amount_kind_check',
    rejects: [
      ['an amount payload on a resistance', characterEffect({ amount: 1 })],
    ],
    accepts: [
      ['an amount payload on an ability contribution', sourcedCharacterEffect({ amount: 2 })],
      // WIDENED (AC-1, D72): the same column is now also `armor_class_bonus`'s
      // flat addend and `weapon_attack_bonus` / `weapon_damage_bonus`'s
      // weapon-scoped bonus.
      ['an amount payload on an armor class bonus', characterEffect({ effect_kind: 'armor_class_bonus', amount: 1 })],
      ['an amount payload on a weapon attack bonus', characterEffect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })],
    ],
  },
  {
    constraint: 'character_effects_maximum_kind_check',
    rejects: [
      ['a maximum payload on a resistance', characterEffect({ maximum: 20 })],
    ],
    accepts: [
      ['a maximum payload on an ability contribution', sourcedCharacterEffect({ maximum: 30 })],
      ['a set-to value on an ability override', abilityOverrideEffect({ maximum: 24 })],
    ],
  },
  {
    constraint: 'character_effects_ability_increase_payload_check',
    rejects: [
      ['an ability contribution missing ability', sourcedCharacterEffect({ ability: null })],
      ['an ability contribution missing amount', sourcedCharacterEffect({ amount: null })],
      ['an ability contribution missing maximum', sourcedCharacterEffect({ maximum: null })],
    ],
    accepts: [
      ['the complete three-field payload', sourcedCharacterEffect({ ability: 'dexterity', amount: 2, maximum: 20 })],
    ],
  },
  {
    constraint: 'character_effects_ability_increase_source_check',
    rejects: [
      ['a complete contribution with no granting source', characterEffect({
        effect_kind: 'ability_increase',
        ability: 'strength',
        amount: 2,
        maximum: 20,
      })],
    ],
    accepts: [
      ['a complete contribution linked to its source', sourcedCharacterEffect({})],
    ],
  },
  {
    constraint: 'character_effects_ability_override_payload_check',
    rejects: [
      ['an ability override missing ability', abilityOverrideEffect({ ability: null })],
      ['an ability override missing its set-to value', abilityOverrideEffect({ maximum: null })],
    ],
    accepts: [
      ['the complete ability and set-to payload', abilityOverrideEffect({ ability: 'constitution', maximum: 24 })],
    ],
  },
  {
    constraint: 'character_effects_amount_check',
    rejects: [
      ['zero, which contributes nothing', sourcedCharacterEffect({ amount: 0 })],
      ['a fractional amount', sourcedCharacterEffect({ amount: 1.5 })],
      ['a text amount', sourcedCharacterEffect({ amount: 'two' })],
    ],
    accepts: [
      ['a positive amount', sourcedCharacterEffect({ amount: 2 })],
      ['a negative amount', sourcedCharacterEffect({ amount: -2 })],
    ],
  },
  {
    constraint: 'character_effects_maximum_check',
    rejects: [
      ['a maximum below the seam minimum', sourcedCharacterEffect({ maximum: 0 })],
      ['a maximum above the seam maximum', sourcedCharacterEffect({ maximum: 31 })],
      ['a fractional maximum', sourcedCharacterEffect({ maximum: 20.5 })],
      ['a text maximum', sourcedCharacterEffect({ maximum: 'twenty' })],
    ],
    accepts: [
      ['the seam minimum', sourcedCharacterEffect({ maximum: 1 })],
      ['the seam maximum', sourcedCharacterEffect({ maximum: 30 })],
      ['an override at the seam maximum', abilityOverrideEffect({ maximum: 30 })],
    ],
  },
  // --- AC-1 (D72): the five new kinds' own kind-scope, payload-completeness
  // and value-domain CHECKs. ---------------------------------------------
  {
    constraint: 'character_effects_base_kind_check',
    rejects: [
      ['a base on a resistance', characterEffect({ base: 13 })],
    ],
    accepts: [
      ['a base on an armor class formula', armorClassFormulaEffect({})],
    ],
  },
  {
    constraint: 'character_effects_ability_1_kind_check',
    rejects: [
      ['an ability_1 on a resistance', characterEffect({ ability_1: 'dexterity' })],
    ],
    accepts: [
      ['an ability_1 on an armor class formula', armorClassFormulaEffect({})],
    ],
  },
  {
    constraint: 'character_effects_ability_2_kind_check',
    rejects: [
      ['an ability_2 on a resistance', characterEffect({ ability_2: 'constitution' })],
    ],
    accepts: [
      // The Armadillo Paladin's own formula: 10 + CON + CHA.
      ['an ability_2 on a two-ability armor class formula', armorClassFormulaEffect({ base: 10, ability_1: 'constitution', ability_2: 'charisma' })],
    ],
  },
  {
    constraint: 'character_effects_allows_shield_kind_check',
    rejects: [
      ['an allows_shield on a resistance', characterEffect({ allows_shield: 1 })],
    ],
    accepts: [
      // The Monk's own formula: shield forbidden.
      ['allows_shield false on an armor class formula', armorClassFormulaEffect({ ability_2: 'wisdom', allows_shield: 0 })],
    ],
  },
  {
    constraint: 'character_effects_weapon_scope_kind_check',
    rejects: [
      ['a weapon_scope on a resistance', characterEffect({ weapon_scope: 'any_weapon' })],
    ],
    accepts: [
      ['a weapon_scope on an attack override', weaponScopedCharacterEffect({})],
      ['a weapon_scope on a weapon attack bonus', characterEffect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })],
      ['a weapon_scope on a weapon damage bonus', characterEffect({ effect_kind: 'weapon_damage_bonus', amount: 2, weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  {
    constraint: 'character_effects_armor_class_bonus_payload_check',
    rejects: [
      ['an armor class bonus promising a number and carrying none', characterEffect({ effect_kind: 'armor_class_bonus' })],
    ],
    accepts: [
      ['an armor class bonus carrying its amount', characterEffect({ effect_kind: 'armor_class_bonus', amount: 1 })],
    ],
  },
  {
    constraint: 'character_effects_armor_class_formula_payload_check',
    rejects: [
      ['an armor class formula missing base', characterEffect({ effect_kind: 'armor_class_formula', ability_1: 'dexterity', allows_shield: 1 })],
      ['an armor class formula missing ability_1', characterEffect({ effect_kind: 'armor_class_formula', base: 13, allows_shield: 1 })],
      ['an armor class formula missing allows_shield', characterEffect({ effect_kind: 'armor_class_formula', base: 13, ability_1: 'dexterity' })],
    ],
    accepts: [
      ['the complete one-ability payload (the Armadillo species)', armorClassFormulaEffect({})],
      ['the complete two-ability payload (the Armadillo Paladin)', armorClassFormulaEffect({ base: 10, ability_1: 'constitution', ability_2: 'charisma' })],
    ],
  },
  {
    constraint: 'character_effects_attack_ability_override_payload_check',
    rejects: [
      ['an attack override missing ability', characterEffect({ effect_kind: 'attack_ability_override', weapon_scope: 'any_weapon' })],
      ['an attack override missing weapon_scope', characterEffect({ effect_kind: 'attack_ability_override', ability: 'charisma' })],
    ],
    accepts: [
      ['the complete payload (Pact of the Blade)', weaponScopedCharacterEffect({})],
    ],
  },
  {
    constraint: 'character_effects_weapon_attack_bonus_payload_check',
    rejects: [
      ['a weapon attack bonus missing amount', characterEffect({ effect_kind: 'weapon_attack_bonus', weapon_scope: 'any_weapon' })],
      ['a weapon attack bonus missing weapon_scope', characterEffect({ effect_kind: 'weapon_attack_bonus', amount: 1 })],
    ],
    accepts: [
      ['the complete payload (a +1 weapon)', characterEffect({ effect_kind: 'weapon_attack_bonus', amount: 1, weapon_scope: 'any_weapon' })],
    ],
  },
  {
    constraint: 'character_effects_weapon_damage_bonus_payload_check',
    rejects: [
      ['a weapon damage bonus missing amount', characterEffect({ effect_kind: 'weapon_damage_bonus', weapon_scope: 'any_weapon' })],
      ['a weapon damage bonus missing weapon_scope', characterEffect({ effect_kind: 'weapon_damage_bonus', amount: 2 })],
    ],
    accepts: [
      ['the complete payload (a flat damage bonus)', characterEffect({ effect_kind: 'weapon_damage_bonus', amount: 2, weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  {
    constraint: 'character_effects_base_check',
    rejects: [
      ['a zero base', armorClassFormulaEffect({ base: 0 })],
      ['a negative base', armorClassFormulaEffect({ base: -1 })],
      ['a fractional base', armorClassFormulaEffect({ base: 13.5 })],
      ['a text base', armorClassFormulaEffect({ base: 'thirteen' })],
    ],
    accepts: [
      ['the seam minimum', armorClassFormulaEffect({ base: 1 })],
      ['the Armadillo species base', armorClassFormulaEffect({ base: 13 })],
    ],
  },
  {
    constraint: 'character_effects_ability_1_check',
    rejects: [
      ['an unknown ability_1 vocabulary value', armorClassFormulaEffect({ ability_1: 'luck' })],
    ],
    accepts: [
      ["the Monk's own ability_1", armorClassFormulaEffect({ ability_1: 'wisdom' })],
    ],
  },
  {
    constraint: 'character_effects_ability_2_check',
    rejects: [
      ['an unknown ability_2 vocabulary value', armorClassFormulaEffect({ ability_2: 'luck' })],
    ],
    accepts: [
      ["the Monk's own ability_2", armorClassFormulaEffect({ ability_2: 'wisdom' })],
    ],
  },
  {
    constraint: 'character_effects_weapon_scope_check',
    rejects: [
      ['an unknown weapon_scope vocabulary value', weaponScopedCharacterEffect({ weapon_scope: 'every_weapon' })],
    ],
    accepts: [
      ['any_weapon', weaponScopedCharacterEffect({ weapon_scope: 'any_weapon' })],
      ['one_bonded_weapon', weaponScopedCharacterEffect({ weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  {
    constraint: 'character_effects_sort_order_check',
    rejects: [
      ['sort order 0, below the dense 1-based order', characterEffect({ sort_order: 0 })],
      ['a negative sort order', characterEffect({ sort_order: -1 })],
      ['a text sort order, which a bare lower bound would have admitted', characterEffect({ sort_order: 'first' })],
    ],
    accepts: [
      ['the first effect', characterEffect({ sort_order: 1 })],
      // Two effects sharing a sort order is deliberately ALLOWED — the index is
      // not unique — so this pair is the over-strictness guard for a user
      // reordering their own list mid-edit.
      ['the fifth', characterEffect({ sort_order: 5 })],
    ],
  },
  {
    constraint: 'character_species_traits_sort_order_check',
    rejects: [
      ['sort order 0, below the dense 1-based printed order', characterSpeciesTrait({ sort_order: 0 })],
      ['a negative sort order', characterSpeciesTrait({ sort_order: -1 })],
      ['a text sort order, which a bare lower bound would have admitted', characterSpeciesTrait({ sort_order: 'first' })],
    ],
    accepts: [
      ['the first printed trait', characterSpeciesTrait({ sort_order: 1 })],
      ["the fifth, which is the Dragonborn's Draconic Flight", characterSpeciesTrait({ sort_order: 5 })],
    ],
  },
  // --- sheet core (D11 part 1, D12) ----------------------------------------
  {
    constraint: 'class_sheet_traits_check',
    rejects: [
      // A D7 or a D20 is a mis-parse of `D12 per Barbarian level`, and the
      // point of constraining catalog content is that a mis-parse fails the
      // seed rather than writing twelve plausible-looking wrong rows.
      ['a hit die the SRD never prints', sheetTraits({ hit_die: 7 })],
      ['a d4 hit die', sheetTraits({ hit_die: 4 })],
      ['a d20 hit die', sheetTraits({ hit_die: 20 })],
      ['a d100 hit die', sheetTraits({ hit_die: 100 })],
      // A NON-NUMERIC text hit die. `'8'` is deliberately NOT tested as a
      // rejection and is in the accept list instead: INTEGER affinity converts
      // it losslessly to the integer 8, exactly as `db/schema/columns.ts`
      // records. What `typeof` refuses is text that does not convert.
      ['a text hit die', sheetTraits({ hit_die: 'eight' })],
      // A REAL that affinity CANNOT convert losslessly, so it stays a REAL and
      // is refused. Note which limb does the refusing: `8.5 IN (6, 8, 10, 12)`
      // is already false, so this is refused with or without `typeof`.
      ['a fractional hit die', sheetTraitsRealHitDie('8.5')],
      ['a zero skill choice count', sheetTraits({ skill_choice_count: 0 })],
      ['a negative skill choice count', sheetTraits({ skill_choice_count: -2 })],
      // A bare `>= 1` admits every text value, since SQLite orders TEXT above
      // every number. The `typeof` limb is what refuses this.
      ['a text skill choice count', sheetTraits({ skill_choice_count: 'two' })],
    ],
    accepts: [
      ['the Sorcerer and Wizard d6', sheetTraits({ hit_die: 6 })],
      ['the six d8 classes', sheetTraits({ hit_die: 8 })],
      ['the Fighter, Paladin and Ranger d10', sheetTraits({ hit_die: 10 })],
      ['the Barbarian d12', sheetTraits({ hit_die: 12 })],
      ['the Rogue choosing 4 skills', sheetTraits({ skill_choice_count: 4 })],
      // MEASURED, not assumed: INTEGER affinity stores this as the integer 8,
      // so `typeof` sees `integer` and the row is legal. Asserting it here is
      // what stops someone "fixing" the constraint to reject a value SQLite has
      // already converted.
      ['a digit string, which affinity converts to an integer', sheetTraits({ hit_die: '8' })],
      // THE VALUE `db/schema/columns.ts` USED TO CLAIM ONLY `typeof` COULD
      // REFUSE. It is accepted, and it SHOULD be: INTEGER affinity converts the
      // REAL 8.0 to the integer 8 before the CHECK is evaluated, so the limb
      // never sees a REAL on this column at all. Asserting the acceptance is
      // what stops someone "hardening" the CHECK against a value the engine has
      // already converted — and it is why that comment now says the limb is
      // inert here rather than load-bearing.
      ['a REAL 8.0, which affinity converts before the CHECK runs', sheetTraitsRealHitDie('8.0')],
      ['the column default for choose-any', sheetTraits({ skill_choice_from_any: 1 })],
    ],
  },
  {
    constraint: 'class_sheet_traits_multiclass_skill_choice_check',
    rejects: [
      // THE TWO INCOHERENT PAIRS, AND THEY ARE THE POINT. Either one alone
      // would let the same fact be spelled two ways, and a completeness check
      // reading only one of the columns would then give two different answers
      // for two rows that mean the same thing.
      ['a pool that grants nothing carrying a count', sheetTraits({ multiclass_skill_choice_pool: 'none', multiclass_skill_choice_count: 1 })],
      ['a granting pool with nothing to grant', sheetTraits({ multiclass_skill_choice_pool: 'any', multiclass_skill_choice_count: 0 })],
      ["the Ranger's pool with nothing to grant", sheetTraits({ multiclass_skill_choice_pool: 'class_list', multiclass_skill_choice_count: 0 })],
      ['a pool no reader knows', sheetTraits({ multiclass_skill_choice_pool: 'class_and_background', multiclass_skill_choice_count: 1 })],
      // A bare `>= 1` admits every text value, since SQLite orders TEXT above
      // every number — the same D13 finding the traits check above records.
      ['a text count', sheetTraits({ multiclass_skill_choice_pool: 'any', multiclass_skill_choice_count: 'one' })],
      ['a negative count', sheetTraits({ multiclass_skill_choice_pool: 'any', multiclass_skill_choice_count: -1 })],
    ],
    accepts: [
      ['the none/0 default nine of twelve classes carry', sheetTraits({})],
      ["the Bard's one skill from anywhere", sheetTraits({ multiclass_skill_choice_pool: 'any', multiclass_skill_choice_count: 1 })],
      ["the Ranger's one skill from its own list", sheetTraits({ multiclass_skill_choice_pool: 'class_list', multiclass_skill_choice_count: 1 })],
      // NOT a value any SRD class has, and accepted deliberately: an imported
      // class granting two on entry is content this model must be able to hold.
      ['an imported class granting two', sheetTraits({ multiclass_skill_choice_pool: 'class_list', multiclass_skill_choice_count: 2 })],
    ],
  },
  {
    constraint: 'class_saving_throw_proficiencies_ability_check',
    rejects: [
      // An unrecognised ability reads as "not proficient" to every lookup that
      // is not an exhaustive switch, silently costing the character their
      // proficiency bonus on that save.
      ['an ability that is not one of the six', savingThrowProficiency({ ability: 'luck' })],
      ['title case, which no writer produces', savingThrowProficiency({ ability: 'Dexterity' })],
      ['an empty ability', savingThrowProficiency({ ability: '' })],
    ],
    accepts: [
      ['strength', savingThrowProficiency({ ability: 'strength' })],
      ['charisma', savingThrowProficiency({ ability: 'charisma' })],
    ],
  },
  {
    constraint: 'class_skill_options_skill_check',
    rejects: [
      ['a skill outside the Skills table', skillOption({ skill: 'lockpicking' })],
      // The display spelling, which is what a hand-edit would most plausibly
      // write. The column holds the snake-case enum member.
      ['the display spelling of a real skill', skillOption({ skill: 'Sleight of Hand' })],
    ],
    accepts: [
      ['sleight_of_hand', skillOption({ skill: 'sleight_of_hand' })],
      // In the Skills table and in NO class's list. If the vocabulary had been
      // closed on the class lists it would be missing, and this would fail.
      ['performance, which no class offers', skillOption({ skill: 'performance' })],
    ],
  },
  {
    constraint: 'class_armor_training_category_check',
    rejects: [
      ['a category outside the source table', armorTraining({ category: 'plate' })],
      ['the plural the Core Traits tables print', armorTraining({ category: 'shields' })],
    ],
    accepts: [
      ['light', armorTraining({ category: 'light' })],
      ['heavy', armorTraining({ category: 'heavy' })],
      // A category of the source's own Armor table, not a separate concept.
      ['shield', armorTraining({ category: 'shield' })],
    ],
  },
  {
    constraint: 'class_weapon_proficiencies_category_check',
    rejects: [
      ['a category that is neither Simple nor Martial', weaponProficiency({ category: 'exotic' })],
      ['title case', weaponProficiency({ category: 'Martial' })],
    ],
    accepts: [
      ['simple', weaponProficiency({ category: 'simple' })],
      // The Monk and Rogue shape: the category is plain `martial` and the
      // qualifier carries what a bare category would lie about.
      ['martial with a property qualifier', weaponProficiency({ property_qualifier: 'Finesse or Light' })],
      // Null for the ten classes whose proficiency carries no qualification.
      ['martial with no qualifier at all', weaponProficiency({ property_qualifier: null })],
    ],
  },
  {
    constraint: 'class_extra_attack_grants_check',
    rejects: [
      ['level 0, which the `class_level <= ?` resolution would always win', extraAttackGrant({ class_level: 0 })],
      ['level 21', extraAttackGrant({ class_level: 21 })],
      // A row exists here BECAUSE a class granted Extra Attack, and the least
      // that feature can mean is two attacks. A 1 is a parse that found the
      // wrong line.
      ['a single attack, which is the absence of the feature', extraAttackGrant({ attack_count: 1 })],
      ['zero attacks', extraAttackGrant({ attack_count: 0 })],
      ['a text attack count', extraAttackGrant({ attack_count: 'two' })],
    ],
    accepts: [
      ['the level 5 grant every one of the five classes has', extraAttackGrant({ class_level: 5, attack_count: 2 })],
      ["the Fighter's level 11 three attacks", extraAttackGrant({ class_level: 11, attack_count: 3 })],
      ["the Fighter's level 20 four attacks", extraAttackGrant({ class_level: 20, attack_count: 4 })],
    ],
  },
  {
    constraint: 'class_martial_arts_dice_check',
    rejects: [
      ['level 0', martialArtsDie({ class_level: 0 })],
      ['level 21', martialArtsDie({ class_level: 21 })],
      ['a die size that is not a die', martialArtsDie({ martial_arts_die: 7 })],
      ['a d20', martialArtsDie({ martial_arts_die: 20 })],
      // THE d4, AND IT WAS ACCEPTED HERE UNTIL THIS CHANGE. Nothing pinned it
      // in either direction, while the mirror case for `hit_die` above HAS been
      // pinned since D13 ("a d4 hit die"). The extract prints no 1d4 at all
      // (`attack-class-features.txt` contains the string zero times), so the 4
      // was a 2014-edition memory sitting in a CHECK whose stated purpose is
      // that a mis-parse fails the seed. It is refused now, and the refusal is
      // pinned so it cannot drift back in unnoticed.
      ['a d4, which is the 2014 Monk and is not in the bundled extract', martialArtsDie({ martial_arts_die: 4 })],
      ['a d100', martialArtsDie({ martial_arts_die: 100 })],
      // Non-numeric: `'8'` would be converted by INTEGER affinity and stored
      // as the integer 8, which is legitimate.
      ['a text die size', martialArtsDie({ martial_arts_die: 'eight' })],
      ['a fractional die size', martialArtsRealDie('8.5')],
    ],
    accepts: [
      ['the level 1 d6', martialArtsDie({ class_level: 1, martial_arts_die: 6 })],
      ['the levels 5-10 d8', martialArtsDie({ class_level: 5, martial_arts_die: 8 })],
      ['the levels 11-16 d10', martialArtsDie({ class_level: 11, martial_arts_die: 10 })],
      ['the level 17 d12', martialArtsDie({ class_level: 17, martial_arts_die: 12 })],
      // The mirror of the `hit_die` case above: affinity converts, so the
      // `typeof` limb is inert on this column too.
      ['a REAL 8.0, which affinity converts before the CHECK runs', martialArtsRealDie('8.0')],
    ],
  },
  // --- D19 and D72: feature identity and mechanical child rows -------------
  {
    constraint: 'subclass_features_class_level_check',
    rejects: [
      ['level 0, which a class-level resolution would always win', subclassFeature({ class_level: 0 })],
      ['level 21', subclassFeature({ class_level: 21 })],
    ],
    accepts: [
      ['the level 6 grant D19 was raised about', subclassFeature({ class_level: 6 })],
      ['level 20', subclassFeature({ class_level: 20 })],
    ],
  },
  {
    constraint: 'subclass_features_sort_order_check',
    rejects: [
      ['a zero printed order', subclassFeature({ sort_order: 0 })],
      ['a text printed order', subclassFeature({ sort_order: 'first' })],
    ],
    accepts: [['the first printed feature', subclassFeature({ sort_order: 1 })]],
  },
  {
    constraint: 'named_features_class_level_check',
    rejects: [
      ['level 0', namedFeature({ class_level: 0 })],
      ['level 21', namedFeature({ class_level: 21 })],
    ],
    accepts: [
      ['Thirsting Blade at level 5', namedFeature({ class_level: 5 })],
      ['Devouring Blade at level 12', namedFeature({ class_level: 12 })],
    ],
  },
  ...featureEffectConstraintCases(
    'subclass_feature_effects',
    subclassFeatureEffect,
    'passthrough',
  ),
  {
    constraint: 'subclass_feature_effects_sort_order_check',
    rejects: [
      ['a zero child order', subclassFeatureEffect({ sort_order: 0, effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })],
      ['a text child order', subclassFeatureEffect({ sort_order: 'first', effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })],
    ],
    accepts: [['the first effect', subclassFeatureEffect({ sort_order: 1, effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })]],
  },
  ...featureEffectConstraintCases('named_feature_effects', namedFeatureEffect),
  {
    constraint: 'named_feature_effects_sort_order_check',
    rejects: [
      ['a zero child order', namedFeatureEffect({ sort_order: 0, effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })],
      ['a text child order', namedFeatureEffect({ sort_order: 'first', effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })],
    ],
    accepts: [['the first effect', namedFeatureEffect({ sort_order: 1, effect_kind: 'extra_attack', attack_count: 2, weapon_scope: 'any_weapon' })]],
  },
  ...featureEffectConstraintCases('class_feature_effects', classFeatureEffect),
  {
    constraint: 'class_feature_effects_class_level_check',
    rejects: [
      ['level 0', classFeatureEffect({ class_level: 0, effect_kind: 'armor_class_bonus', amount: 1 })],
      ['level 21', classFeatureEffect({ class_level: 21, effect_kind: 'armor_class_bonus', amount: 1 })],
    ],
    accepts: [
      ['level 1', classFeatureEffect({ class_level: 1, effect_kind: 'armor_class_bonus', amount: 1 })],
      ['level 20', classFeatureEffect({ class_level: 20, effect_kind: 'armor_class_bonus', amount: 1 })],
    ],
  },
  ...featureValueContributionConstraintCases(
    'class_feature_value_contributions',
    classFeatureValueContribution,
  ),
  ...featureValueContributionConstraintCases(
    'subclass_feature_value_contributions',
    subclassFeatureValueContribution,
  ),
  // --- the four stored sheet inputs ---------------------------------------
  {
    constraint: 'character_armor_slot_check',
    rejects: [
      // The SLOT is not the category, and a value from the wrong vocabulary is
      // the mistake that would follow from thinking it is.
      ['a category used as a slot', characterArmor({ slot: 'medium' })],
      ['title case', characterArmor({ slot: 'Worn' })],
      ['the empty string', characterArmor({ slot: '' })],
    ],
    accepts: [
      ['the worn slot', characterArmor({ slot: 'worn' })],
      [
        'the shield slot, holding a shield',
        characterArmor({
          slot: 'shield',
          category: 'shield',
          armor_class: 2,
          dex_bonus: 'none',
          dex_bonus_max: null,
        }),
      ],
      // A SHIELD IN THE WORN SLOT IS ACCEPTED ON PURPOSE. It is a state a share
      // link can carry, `armorClass` counts it by what it IS, and the sheet
      // says the slots are crossed. Refusing it here would silently discard an
      // imported character instead of importing it and stating the problem.
      [
        'a shield recorded in the worn slot, which the sheet warns about',
        characterArmor({
          slot: 'worn',
          category: 'shield',
          armor_class: 2,
          dex_bonus: 'none',
          dex_bonus_max: null,
        }),
      ],
    ],
  },
  {
    constraint: 'character_armor_category_check',
    rejects: [
      ['a category outside the four the table prints', characterArmor({ category: 'plate' })],
      ['a slot used as a category', characterArmor({ category: 'worn' })],
    ],
    accepts: [
      ['light with an uncapped Dex term', characterArmor({ category: 'light', dex_bonus: 'full', dex_bonus_max: null })],
      ['heavy with no Dex term', characterArmor({ category: 'heavy', dex_bonus: 'none', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'character_armor_dex_bonus_check',
    rejects: [
      ['a Dex rule outside the three', characterArmor({ dex_bonus: 'limited' })],
      ['the empty string', characterArmor({ dex_bonus: '' })],
    ],
    accepts: [
      ['capped, with its cap', characterArmor({ dex_bonus: 'capped', dex_bonus_max: 2 })],
      ['full, with no cap', characterArmor({ dex_bonus: 'full', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'character_armor_dex_bonus_max_check',
    rejects: [
      // THE ONE THAT MATTERS MOST ON THE CHARACTER'S COPY. `dexterityTerm`
      // reads `dex_bonus_max ?? 0` on the capped arm and documents that `?? 0`
      // as unreachable; without this constraint a share link or a hand-edited
      // image makes it reachable, and a Light suit degrades to Heavy behaviour.
      ['capped with no cap', characterArmor({ dex_bonus: 'capped', dex_bonus_max: null })],
      ['full carrying a stray cap', characterArmor({ dex_bonus: 'full', dex_bonus_max: 2 })],
      ['a negative cap', characterArmor({ dex_bonus: 'capped', dex_bonus_max: -1 })],
      ['a text cap', characterArmor({ dex_bonus: 'capped', dex_bonus_max: 'two' })],
    ],
    accepts: [
      ['the Medium armour cap of 2', characterArmor({ dex_bonus: 'capped', dex_bonus_max: 2 })],
      ['a cap of zero, which is a house rule and not Heavy armour', characterArmor({ dex_bonus: 'capped', dex_bonus_max: 0 })],
      ['the defended null on an uncapped row', characterArmor({ dex_bonus: 'full', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'character_armor_shield_check',
    rejects: [
      ['a shield that adds a Dexterity modifier', characterArmor({ slot: 'shield', category: 'shield', armor_class: 2, dex_bonus: 'full', dex_bonus_max: null })],
      ['a shield with a capped Dexterity modifier', characterArmor({ slot: 'shield', category: 'shield', armor_class: 2, dex_bonus: 'capped', dex_bonus_max: 2 })],
    ],
    accepts: [
      ['the Shield as the table prints it', characterArmor({ slot: 'shield', category: 'shield', armor_class: 2, dex_bonus: 'none', dex_bonus_max: null })],
      ['a Medium armour, unaffected by the shield limb', characterArmor({})],
    ],
  },
  {
    constraint: 'character_armor_armor_class_check',
    rejects: [
      ['a zero armor class', characterArmor({ armor_class: 0 })],
      ['a negative armor class', characterArmor({ armor_class: -1 })],
      ['a text armor class', characterArmor({ armor_class: 'fourteen' })],
    ],
    accepts: [
      ['the lowest value the table prints', characterArmor({ category: 'light', armor_class: 11, dex_bonus: 'full', dex_bonus_max: null })],
      ['a shield bonus of 2, which is not a base', characterArmor({ slot: 'shield', category: 'shield', armor_class: 2, dex_bonus: 'none', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'character_armor_strength_requirement_check',
    rejects: [
      ['a zero requirement', characterArmor({ strength_requirement: 0 })],
      ['a text requirement', characterArmor({ strength_requirement: 'thirteen' })],
    ],
    accepts: [
      ['the Str 13 the table prints', characterArmor({ strength_requirement: 13 })],
      // Ten of thirteen printed rows have an em-dash here, so the null is the
      // source's own absence (D6b limb 2) and refusing it would refuse them.
      ['the defended null', characterArmor({ strength_requirement: null })],
    ],
  },
  {
    constraint: 'character_hit_point_rolls_check',
    rejects: [
      ['a level of zero', hitPointRoll({ class_level: 0 })],
      ['a level past twenty', hitPointRoll({ class_level: 21 })],
      // A roll of zero is not a low roll; it is the absence of one, and absence
      // is already spelled by having no row at all.
      ['a roll of zero', hitPointRoll({ rolled_value: 0 })],
      ['a negative roll', hitPointRoll({ rolled_value: -1 })],
      // 12 is the largest hit die any class in the source uses.
      ['a roll past the largest hit die', hitPointRoll({ rolled_value: 13 })],
      ['a text roll', hitPointRoll({ rolled_value: 'seven' })],
    ],
    accepts: [
      ['the lowest roll on any die', hitPointRoll({ class_level: 1, rolled_value: 1 })],
      ['the highest roll on a d12', hitPointRoll({ class_level: 20, rolled_value: 12 })],
    ],
  },
  {
    constraint: 'character_skill_proficiencies_skill_check',
    rejects: [
      ['a skill outside the eighteen', skillProficiency({ skill: 'lockpicking' })],
      // The display casing the source prints; the column stores snake case
      // because a CHECK cannot hold a value with a space in it.
      ['the printed display form', skillProficiency({ skill: 'Sleight of Hand' })],
    ],
    accepts: [
      ['a one-word skill', skillProficiency({ skill: 'stealth' })],
      ['a two-word skill in snake case', skillProficiency({ skill: 'sleight_of_hand' })],
    ],
  },
  {
    constraint: 'character_skill_grants_skill_check',
    rejects: [
      ['a skill outside the eighteen', skillGrant({ skill: 'lockpicking' })],
      // The display casing the source prints; the column stores snake case
      // because a CHECK cannot hold a value with a space in it.
      ['the printed display form', skillGrant({ skill: 'Sleight of Hand' })],
    ],
    accepts: [
      // The null limb FIRST, because it is the constraint's most important
      // half: NULL is GRANTED BUT UNFILLED — the defended null the grants
      // table exists for (skills plan §3.1) — not a missing value.
      ['an unfilled grant', skillGrant({})],
      ['a filled grant', skillGrant({ skill: 'athletics' })],
      ['a two-word skill in snake case', skillGrant({ skill: 'sleight_of_hand' })],
    ],
  },
  {
    constraint: 'character_skill_grants_state_check',
    rejects: [
      // The spell-slot vocabulary's other two members, refused ON PURPOSE: a
      // grant has no `discarded` and no `kept_override` (skills plan §3.8),
      // and admitting one would let a writer park a grant in a state no
      // reader counts — the silent-disable failure the slot state's own
      // comment warns about.
      ['the slot vocabulary discarded state', skillGrant({ state: 'discarded' })],
      ['the slot vocabulary kept_override state', skillGrant({ state: 'kept_override' })],
      ['the source vocabulary tombstoned state', skillGrant({ state: 'tombstoned' })],
    ],
    accepts: [
      ['the default active state', skillGrant({})],
      ['an orphaned grant', skillGrant({ state: 'orphaned' })],
    ],
  },
  {
    constraint: 'character_skill_grants_ordinal_check',
    rejects: [
      // Ordinals are 1-based (skills plan §3.6): the generator mints from 1,
      // matching the spell slots' loop, and a zero would collide with the
      // slot table's "ordinal 0" default meaning something different.
      ['a zero ordinal', skillGrant({ ordinal: 0 })],
      ['a negative ordinal', skillGrant({ ordinal: -1 })],
      // The `typeof` limb: SQLite orders every TEXT value above every number,
      // so a bare `>= 1` would admit this.
      ['a text ordinal', skillGrant({ ordinal: 'first' })],
    ],
    accepts: [
      ['the first ordinal', skillGrant({ ordinal: 1 })],
      ['a later ordinal', skillGrant({ ordinal: 3 })],
    ],
  },
  {
    constraint: 'character_skill_expertise_grants_skill_check',
    rejects: [
      ['a skill outside the eighteen', expertiseGrant({ skill: 'lockpicking' })],
      ['the printed display form', expertiseGrant({ skill: 'Sleight of Hand' })],
    ],
    accepts: [
      ['an unfilled Expertise grant', expertiseGrant({})],
      ['a filled Expertise grant', expertiseGrant({ skill: 'athletics' })],
    ],
  },
  {
    constraint: 'character_skill_expertise_grants_state_check',
    rejects: [
      ['the slot discarded state', expertiseGrant({ state: 'discarded' })],
      ['the source tombstoned state', expertiseGrant({ state: 'tombstoned' })],
    ],
    accepts: [
      ['the default active state', expertiseGrant({})],
      ['an orphaned grant', expertiseGrant({ state: 'orphaned' })],
    ],
  },
  {
    constraint: 'character_skill_expertise_grants_ordinal_check',
    rejects: [
      ['a zero ordinal', expertiseGrant({ ordinal: 0 })],
      ['a negative ordinal', expertiseGrant({ ordinal: -1 })],
      ['a text ordinal', expertiseGrant({ ordinal: 'first' })],
    ],
    accepts: [
      ['the first ordinal', expertiseGrant({ ordinal: 1 })],
      ['a later ordinal', expertiseGrant({ ordinal: 3 })],
    ],
  },
  {
    constraint: 'character_skill_expertise_grants_level_check',
    rejects: [
      ['level zero', expertiseGrant({ granted_at_class_level: 0 })],
      ['level twenty-one', expertiseGrant({ granted_at_class_level: 21 })],
      ['a text level', expertiseGrant({ granted_at_class_level: 'first' })],
    ],
    accepts: [
      ['level one', expertiseGrant({ granted_at_class_level: 1 })],
      ['level twenty', expertiseGrant({ granted_at_class_level: 20 })],
    ],
  },
  {
    constraint: 'character_level_feat_choices_class_level_check',
    rejects: [
      ['level zero', levelFeatChoice({ class_level: 0 })],
      ['level twenty-one', levelFeatChoice({ class_level: 21 })],
      ['a fractional level', levelFeatChoice({ class_level: 4.5 })],
      ['a text level', levelFeatChoice({ class_level: 'fourth' })],
    ],
    accepts: [
      ['level one', levelFeatChoice({ class_level: 1 })],
      ['level twenty', levelFeatChoice({ class_level: 20 })],
    ],
  },
  {
    constraint: 'character_level_feat_choices_choice_kind_check',
    rejects: [
      ['an unknown occurrence', levelFeatChoice({ choice_kind: 'general' })],
      ['an empty occurrence', levelFeatChoice({ choice_kind: '' })],
    ],
    accepts: [
      ['an ASI-level feat', levelFeatChoice({ choice_kind: 'asi_level_feat' })],
      ['an Epic Boon', levelFeatChoice({ choice_kind: 'epic_boon' })],
    ],
  },
  {
    constraint: 'armor_templates_category_check',
    rejects: [
      ['a category outside the four the table prints', armorTemplate({ category: 'plate' })],
      ['title case', armorTemplate({ category: 'Medium' })],
    ],
    accepts: [
      ['light with an uncapped Dex term', armorTemplate({ category: 'light', dex_bonus: 'full', dex_bonus_max: null })],
      ['heavy with no Dex term', armorTemplate({ category: 'heavy', dex_bonus: 'none', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'armor_templates_dex_bonus_check',
    rejects: [
      ['a Dex rule outside the three', armorTemplate({ dex_bonus: 'limited' })],
      // "cap of zero" is the shape this vocabulary exists to prevent, because
      // `min(dexMod, 0)` SUBTRACTS for a negative modifier.
      ['the empty string', armorTemplate({ dex_bonus: '' })],
    ],
    accepts: [
      ['capped, with its cap', armorTemplate({ dex_bonus: 'capped', dex_bonus_max: 2 })],
      ['full, with no cap', armorTemplate({ dex_bonus: 'full', dex_bonus_max: null })],
      ['none, with no cap', armorTemplate({ dex_bonus: 'none', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'armor_templates_dex_bonus_max_check',
    rejects: [
      // The pair must agree in BOTH directions, which is what turns a
      // correlated-null smell into a discriminated union the database enforces.
      ['capped with no cap', armorTemplate({ dex_bonus: 'capped', dex_bonus_max: null })],
      ['full carrying a stray cap', armorTemplate({ dex_bonus: 'full', dex_bonus_max: 2 })],
      ['none carrying a stray cap', armorTemplate({ dex_bonus: 'none', dex_bonus_max: 0 })],
      ['a negative cap', armorTemplate({ dex_bonus: 'capped', dex_bonus_max: -1 })],
      ['a text cap', armorTemplate({ dex_bonus: 'capped', dex_bonus_max: 'two' })],
    ],
    accepts: [
      ['the Medium armour cap of 2', armorTemplate({ dex_bonus: 'capped', dex_bonus_max: 2 })],
      // Zero is not a value the table prints, but a CHECK that refused it would
      // be inventing a rule; the vocabulary is what keeps it from MEANING
      // "Heavy armour".
      ['a cap of zero', armorTemplate({ dex_bonus: 'capped', dex_bonus_max: 0 })],
      ['the defended null on an uncapped row', armorTemplate({ dex_bonus: 'full', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'armor_templates_shield_check',
    rejects: [
      // A mis-parse filing the Shield's `+2` as a base AC with a Dex term is
      // exactly what this refuses: it would quietly halve somebody's armour.
      ['a Shield that adds a Dexterity modifier', armorTemplate({ category: 'shield', armor_class: 2, dex_bonus: 'full', dex_bonus_max: null })],
      ['a Shield with a capped Dexterity modifier', armorTemplate({ category: 'shield', armor_class: 2, dex_bonus: 'capped', dex_bonus_max: 2 })],
    ],
    accepts: [
      ['the Shield row as the table prints it', armorTemplate({ category: 'shield', armor_class: 2, dex_bonus: 'none', dex_bonus_max: null })],
      ['a Medium armour, unaffected by the shield limb', armorTemplate({})],
    ],
  },
  {
    constraint: 'armor_templates_armor_class_check',
    rejects: [
      ['a zero armor class', armorTemplate({ armor_class: 0 })],
      ['a negative armor class', armorTemplate({ armor_class: -1 })],
      ['a text armor class', armorTemplate({ armor_class: 'fourteen' })],
    ],
    accepts: [
      ["the Shield's +2, which is a BONUS rather than a base", armorTemplate({ category: 'shield', armor_class: 2, dex_bonus: 'none', dex_bonus_max: null })],
      ['Plate Armor at 18', armorTemplate({ category: 'heavy', armor_class: 18, dex_bonus: 'none', dex_bonus_max: null })],
    ],
  },
  {
    constraint: 'armor_templates_strength_requirement_check',
    rejects: [
      ['a zero requirement, which is the em-dash written wrong', armorTemplate({ strength_requirement: 0 })],
      ['a negative requirement', armorTemplate({ strength_requirement: -13 })],
      ['a text requirement', armorTemplate({ strength_requirement: 'Str 13' })],
    ],
    accepts: [
      ["Chain Mail's Str 13", armorTemplate({ strength_requirement: 13 })],
      ["Plate Armor's Str 15", armorTemplate({ strength_requirement: 15 })],
      // The defended null: ten of thirteen rows print an em-dash here, which is
      // the source's own "no requirement" (D6b limb 2).
      ['the em-dash, as a null', armorTemplate({ strength_requirement: null })],
    ],
  },
  {
    constraint: 'armor_templates_rules_edition_check',
    rejects: [['an edition the seeder never writes', armorTemplate({ rules_edition: '2025' })]],
    accepts: [
      ['the 2024 default the seeder binds', armorTemplate({})],
      ['2014', armorTemplate({ rules_edition: '2014' })],
    ],
  },
  {
    constraint: 'character_items_quantity_check',
    rejects: [
      ['a zero quantity', characterItem({ quantity: 0 })],
      ['a negative quantity', characterItem({ quantity: -1 })],
    ],
    accepts: [
      ['the default single possession', characterItem({})],
      ['three identical possessions in one row', characterItem({ quantity: 3 })],
    ],
  },
  {
    constraint: 'item_definitions_rules_edition_check',
    rejects: [['an edition outside the shared catalog vocabulary', itemDefinition({ rules_edition: '5e' })]],
    accepts: [['the external-content edition', itemDefinition({ rules_edition: 'expanded' })]],
  },
  ...authoredCharacterEffectConstraintCases(
    'item_definition_effects',
    itemDefinitionEffect,
  ),
  {
    constraint: 'item_definition_effects_sort_order_check',
    rejects: [
      ['sort order zero', itemDefinitionEffect({ sort_order: 0 })],
      ['a text sort order', itemDefinitionEffect({ sort_order: 'first' })],
    ],
    accepts: [['the first ordered effect', itemDefinitionEffect({ sort_order: 1 })]],
  },
  {
    constraint: 'character_attunement_slots_distinct_check',
    rejects: [
      ['one item in slots 1 and 2', attunementSlotRow([0, 0, null])],
      ['one item in slots 1 and 3', attunementSlotRow([0, null, 0])],
      ['one item in slots 2 and 3', attunementSlotRow([null, 1, 1])],
    ],
    accepts: [
      ['three distinct occupants', attunementSlotRow([0, 1, 2])],
      ['three empty slots', attunementSlotRow([null, null, null])],
      ['one occupant with two empty slots', attunementSlotRow([null, 1, null])],
    ],
  },
];

/**
 * The two CHECKs that predate this suite. Both are already proved
 * behaviourally in `tests/unit/invariants.test.ts` — the exclusive-assignment
 * one by dropping its triggers first so the CHECK is what answers — so they are
 * listed rather than duplicated. They are named here only so the coverage test
 * below can account for every constraint in the artifact.
 */
const COVERED_ELSEWHERE = [
  'spell_slots_exclusive_assignment_check',
  'character_weapons_mastery_requires_property_check',
  // D104's three identical nullable-text shapes are exercised together by
  // `character flavor CHECKs reject non-text and limit+1` above.
  'characters_alignment_check',
  'characters_appearance_check',
  'characters_backstory_check',
  // CI-2a's closed vocabularies and correlated registry invariants are
  // exercised together in content-registry.test.ts, where the resolver API
  // and the stored rows are visible in the same control.
  'catalog_content_aliases_alias_kind_check',
  'catalog_content_aliases_content_kind_check',
  'catalog_content_fingerprints_content_kind_check',
  'catalog_content_fingerprints_digest_check',
  'catalog_content_fingerprints_role_check',
  'catalog_content_fingerprints_scheme_check',
  'catalog_content_identities_catalog_layer_check',
  'catalog_content_identities_content_kind_check',
  'catalog_content_identities_key_kind_check',
  'catalog_content_identities_key_layer_check',
  'catalog_content_identities_normalized_name_check',
  'catalog_content_match_decisions_content_kind_check',
  'catalog_content_match_decisions_decision_check',
  'catalog_content_match_decisions_digest_check',
  'catalog_content_match_decisions_scheme_check',
];

for (const [sourceLabel, schemaSql] of schemaSources) {
  describe(`CHECK constraints (${sourceLabel})`, () => {
    let db: Database;

    beforeAll(async () => {
      sqlite3 = await sqlite3InitModule();
      db = new sqlite3.oo1.DB(':memory:', 'c');
      openDatabases.push(db);
      db.exec(schemaSql);
    });

    afterAll(() => {
      for (const open of openDatabases.splice(0)) {
        open.close();
      }
    });

    for (const testCase of CONSTRAINT_CASES) {
      describe(testCase.constraint, () => {
        for (const [why, write] of testCase.rejects) {
          it(`rejects ${why}`, () => {
            expect(caughtErrorMessage(() => write(db))).toBe(
              checkError(testCase.constraint),
            );
          });
        }
        for (const [why, write] of testCase.accepts) {
          it(`accepts ${why}`, () => {
            expect(() => write(db)).not.toThrow();
          });
        }
      });
    }

    it('character flavor CHECKs reject non-text and limit+1', () => {
      const exactLimits = {
        alignment: 120,
        appearance: 4_000,
        backstory: 20_000,
      } as const;

      for (const [column, maximum] of Object.entries(exactLimits)) {
        expect(
          caughtErrorMessage(() =>
            character({ [column]: '' })(db)
          ),
          `${column}: empty text`,
        ).toBe(checkError(`characters_${column}_check`));
        expect(
          caughtErrorMessage(() =>
            character({ [column]: new Uint8Array([65]) as unknown as string })(
              db,
            )
          ),
          `${column}: non-text`,
        ).toBe(checkError(`characters_${column}_check`));
        expect(
          caughtErrorMessage(() =>
            character({ [column]: 'x'.repeat(maximum + 1) })(db)
          ),
          `${column}: limit + 1`,
        ).toBe(checkError(`characters_${column}_check`));

        expect(
          () => character({ [column]: null })(db),
          `${column}: defended null`,
        ).not.toThrow();
        expect(
          () => character({ [column]: 'x'.repeat(maximum) })(db),
          `${column}: exact limit`,
        ).not.toThrow();
      }
    });

    /**
     * THE NULL LIMB THAT WENT AWAY, ASSERTED RATHER THAN ASSUMED.
     *
     * `effect_kind` was NULLABLE on both trait tables and NULL was the DEFAULT
     * — twenty-six of the thirty-three printed traits carried it. On both
     * effect tables it is NOT NULL, because a trait with no mechanical effect
     * is now the ABSENCE OF A ROW. This pins the consequence: the null is
     * refused, and it is refused by NOT NULL rather than by the kind CHECK, so
     * a later change that made the column nullable again would have to delete
     * this test rather than merely watch it keep passing.
     */
    it('refuses a NULL effect_kind on every effect table, by NOT NULL', () => {
      for (const [table, write] of [
        [
          'species_template_trait_effects',
          speciesTemplateTraitEffect({ effect_kind: null }),
        ],
        ['character_effects', characterEffect({ effect_kind: null })],
        [
          'background_template_effects',
          backgroundTemplateEffect({ effect_kind: null }),
        ],
        [
          'subclass_feature_effects',
          subclassFeatureEffect({ effect_kind: null }),
        ],
        ['named_feature_effects', namedFeatureEffect({ effect_kind: null })],
        ['class_feature_effects', classFeatureEffect({ effect_kind: null })],
      ] as const) {
        expect(caughtErrorMessage(() => write(db)), table).toContain(
          'SQLITE_CONSTRAINT_NOTNULL',
        );
      }
    });

    it('accepts authored passthrough vocabulary members without folding them', () => {
      expect(() => speciesTemplate({
        creature_type: 'Clockwork  Humanoid',
        size: 'Minuscule',
        alternate_size: 'Sma\u0301ll',
      })(db)).not.toThrow();
      expect(() => speciesTemplateTraitEffect({
        damage_type: 'Void  Fire',
      })(db)).not.toThrow();
      expect(() => backgroundTemplateEffect({
        damage_type: 'void',
      })(db)).not.toThrow();
      expect(() => subclassFeatureEffect({
        effect_kind: 'damage_resistance',
        damage_type: 'Steam',
      })(db)).not.toThrow();
    });

    /**
     * THE `typeof` LIMB'S OWN JUSTIFICATION, EXECUTED.
     *
     * `db/schema/columns.ts` used to say that a bare `c IN (…)` would let a REAL
     * `8.0` through and that the `typeof` limb was what refused it. A review
     * measured that and it is FALSE for both columns the limb actually guards:
     * they are declared `integer`, so affinity converts the REAL before the
     * CHECK is evaluated. The claim is true only where nothing converts.
     *
     * Both halves are run here, against the ENGINE and against the SHIPPED
     * expression — the guarded form is cut out of the live DDL and the bare form
     * is derived from it by deleting the limb, so neither side is a hand-copy
     * that could drift from what the schema emits. This is the same shape as the
     * affinity classifier in `tests/unit/schema.test.ts`: a comment claiming
     * something about SQLite is worth exactly as much as the run that shows it.
     */
    it('shows the `typeof` limb is inert on an integer column and load-bearing without affinity', () => {
      const ddl = String(
        db.selectValue(
          `SELECT sql FROM sqlite_schema
           WHERE type = 'table' AND name = 'class_martial_arts_dice'`,
        ),
      );
      const found =
        /typeof\(`martial_arts_die`\) = 'integer' AND (?<bare>`martial_arts_die` IN \([\d, ]+\))/u.exec(
          ddl,
        );
      const bare = found?.groups?.bare;
      // If the CHECK is ever rewritten this must fail LOUDLY rather than quietly
      // probe an empty string — and throwing narrows both values, so neither
      // probe below needs a cast.
      if (found === null || bare === undefined) {
        throw new Error(
          `class_martial_arts_dice no longer carries a guarded IN list:\n${ddl}`,
        );
      }
      const guarded = found[0];
      expect(guarded).not.toBe(bare);

      /** What the engine does with a REAL `8.0` under one CHECK and one type. */
      function storedTypeOf(declared: string, expression: string): string {
        sequence += 1;
        const table = `limb_probe_${String(sequence)}`;
        db.exec(
          `CREATE TABLE "${table}" (\`martial_arts_die\` ${declared} NOT NULL, ` +
            `CHECK(${expression}))`,
        );
        let outcome: string;
        try {
          db.exec(`INSERT INTO "${table}" VALUES (8.0)`);
          outcome = String(
            db.selectValue(`SELECT typeof(martial_arts_die) FROM "${table}"`),
          );
        } catch {
          outcome = 'refused';
        }
        db.exec(`DROP TABLE "${table}"`);
        return outcome;
      }

      // INTEGER affinity: identical either way, so the limb changes nothing on
      // `hit_die` and `martial_arts_die` as they are declared today.
      expect(storedTypeOf('integer', guarded)).toBe('integer');
      expect(storedTypeOf('integer', bare)).toBe('integer');
      // NO affinity: the bare list stores a REAL in a column whose vocabulary is
      // four integers, and only the limb refuses it. This is the case the
      // comment describes, and the reason the limb stays.
      expect(storedTypeOf('BLOB', guarded)).toBe('refused');
      expect(storedTypeOf('BLOB', bare)).toBe('real');
    });

    /**
     * A COVERAGE GUARD, NOT A TRANSCRIPTION.
     *
     * It reads the constraint NAMES out of the live schema and asserts each one
     * is exercised above or accounted for in `COVERED_ELSEWHERE`. It says
     * nothing about what any constraint MEANS — that is what the behavioural
     * cases are for — so it cannot become the "compare our own artifact to a
     * hand-copied string" test that passes on a well-formed wrong constraint.
     * What it catches is the real hazard: a CHECK added to `db/schema/*.ts`
     * with no test, which is decoration.
     */
    it('leaves no CHECK constraint in the schema untested', () => {
      const declared = db
        .selectValues(
          `SELECT sql FROM sqlite_schema
           WHERE type = 'table' AND sql IS NOT NULL`,
        )
        .flatMap((statement) =>
          [...String(statement).matchAll(/CONSTRAINT\s+"([^"]+)"\s+CHECK/g)].map(
            (match) => match[1] as string,
          ),
        )
        .sort();

      expect(declared.length).toBeGreaterThan(0);
      expect(declared).toEqual(
        [
          ...CONSTRAINT_CASES.map((testCase) => testCase.constraint),
          ...COVERED_ELSEWHERE,
        ].sort(),
      );
    });
  });
}
