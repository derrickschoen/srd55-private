import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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

function insert(db: Database, table: string, values: Values): number {
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

function newSource(db: Database, characterId: number): number {
  return insert(db, 'character_source_instances', {
    character_id: characterId,
    instance_uuid: uid('source'),
    source_type: 'feat',
    display_name: uid('Feat'),
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

const classDefinition =
  (values: Values): Write =>
  (db) => {
    newClass(db, values);
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

const sheetAdjustment =
  (values: Values): Write =>
  (db) => {
    insert(db, 'character_sheet_adjustments', {
      character_id: newCharacter(db),
      armor_class_adjustment: 0,
      ...values,
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

// D19's two class-feature tables. Both start from a FREE-TEXT row — no
// `effect_kind`, no payload — because that is the common case and because it is
// the row every payload-without-a-kind case has to start from.
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

interface ConstraintCase {
  readonly constraint: string;
  /** Writes that MUST be refused, each with the corruption it would have made. */
  readonly rejects: ReadonlyArray<readonly [string, Write]>;
  /** Legitimate writes that MUST get through — the over-strictness guard. */
  readonly accepts: ReadonlyArray<readonly [string, Write]>;
}

const CONSTRAINT_CASES: readonly ConstraintCase[] = [
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
      // one does not quietly accept its neighbour's members. It is also why
      // `character_source_instances.state` is left unconstrained — see the note
      // in `db/schema/character.ts`.
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
      // A NON-NUMERIC text hit die. `'8'` is deliberately NOT tested as a
      // rejection and is in the accept list instead: INTEGER affinity converts
      // it losslessly to the integer 8, exactly as `db/schema/columns.ts`
      // records. What `typeof` refuses is text that does not convert.
      ['a text hit die', sheetTraits({ hit_die: 'eight' })],
      ['a zero skill choice count', sheetTraits({ skill_choice_count: 0 })],
      ['a negative skill choice count', sheetTraits({ skill_choice_count: -2 })],
      // A bare `>= 1` admits every text value, since SQLite orders TEXT above
      // every number. The `typeof` limb is what refuses this.
      ['a text skill choice count', sheetTraits({ skill_choice_count: 'two' })],
    ],
    accepts: [
      ['the Sorcerer and Wizard d6', sheetTraits({ hit_die: 6 })],
      ['the Barbarian d12', sheetTraits({ hit_die: 12 })],
      ['the Rogue choosing 4 skills', sheetTraits({ skill_choice_count: 4 })],
      // MEASURED, not assumed: INTEGER affinity stores this as the integer 8,
      // so `typeof` sees `integer` and the row is legal. Asserting it here is
      // what stops someone "fixing" the constraint to reject a value SQLite has
      // already converted.
      ['a digit string, which affinity converts to an integer', sheetTraits({ hit_die: '8' })],
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
      // Non-numeric: `'8'` would be converted by INTEGER affinity and stored
      // as the integer 8, which is legitimate.
      ['a text die size', martialArtsDie({ martial_arts_die: 'eight' })],
    ],
    accepts: [
      ['the level 1 d6', martialArtsDie({ class_level: 1, martial_arts_die: 6 })],
      ['the level 17 d12', martialArtsDie({ class_level: 17, martial_arts_die: 12 })],
    ],
  },
  // --- D19: subclass features ---------------------------------------------
  {
    constraint: 'subclass_features_class_level_check',
    rejects: [
      ['level 0, which a `class_level <= ?` resolution would always win', subclassFeature({ class_level: 0 })],
      ['level 21', subclassFeature({ class_level: 21 })],
    ],
    accepts: [
      // The owner's own case: a subclass that grants Extra Attack at level 6.
      ['the level 6 grant D19 was raised about', subclassFeature({ class_level: 6 })],
      ['level 3, where a 2024 subclass is taken', subclassFeature({ class_level: 3 })],
      ['level 20', subclassFeature({ class_level: 20 })],
    ],
  },
  {
    constraint: 'subclass_features_sort_order_check',
    rejects: [
      ['a zero order, which printed order never starts at', subclassFeature({ sort_order: 0 })],
      ['a negative order', subclassFeature({ sort_order: -1 })],
      ['a text order', subclassFeature({ sort_order: 'first' })],
    ],
    accepts: [['the first printed feature', subclassFeature({ sort_order: 1 })]],
  },
  {
    constraint: 'subclass_features_effect_kind_check',
    rejects: [
      ['a kind outside the closed set', subclassFeature({ effect_kind: 'extra_attacks' })],
      ['an empty kind', subclassFeature({ effect_kind: '' })],
      // The species vocabulary is a different closed set on a different table,
      // and a member of one is not a member of the other.
      ['a member of the species trait vocabulary', subclassFeature({ effect_kind: 'hp_modifier' })],
    ],
    accepts: [
      // THE DEFAULT CASE, NOT AN EDGE: most subclass features are text.
      ['the NULL a text-only feature carries', subclassFeature({ effect_kind: null })],
      ['extra_attack, with both halves of its payload', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'any_weapon' })],
    ],
  },
  {
    constraint: 'subclass_features_effect_weapon_scope_check',
    rejects: [
      ['a scope outside the closed set', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'pact_weapon' })],
      ['an empty scope', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: '' })],
    ],
    accepts: [
      ['any_weapon', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'any_weapon' })],
      ['one_bonded_weapon', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  {
    constraint: 'subclass_features_effect_attack_count_check',
    rejects: [
      // A row carries this effect BECAUSE the feature granted Extra Attack, and
      // the least that can mean is two attacks.
      ['a single attack, which is the absence of the feature', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 1, effect_weapon_scope: 'any_weapon' })],
      ['zero attacks', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 0, effect_weapon_scope: 'any_weapon' })],
      ['a text attack count', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 'two', effect_weapon_scope: 'any_weapon' })],
    ],
    accepts: [
      ['the NULL a text-only feature carries', subclassFeature({ effect_attack_count: null })],
      ['two attacks', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'any_weapon' })],
    ],
  },
  {
    constraint: 'subclass_features_attack_count_kind_check',
    rejects: [
      // The `IS` limb doing its work: written with `=`, this CHECK would
      // evaluate to NULL for a text-only feature and SQLite would PASS it,
      // admitting exactly the orphaned payload it exists to refuse.
      ['an attack count on a free-text feature', subclassFeature({ effect_kind: null, effect_attack_count: 2 })],
    ],
    accepts: [
      ['a free-text feature with no count', subclassFeature({ effect_kind: null, effect_attack_count: null })],
    ],
  },
  {
    constraint: 'subclass_features_weapon_scope_kind_check',
    rejects: [
      ['a weapon scope on a free-text feature', subclassFeature({ effect_kind: null, effect_weapon_scope: 'any_weapon' })],
    ],
    accepts: [
      ['a free-text feature with no scope', subclassFeature({ effect_kind: null, effect_weapon_scope: null })],
    ],
  },
  {
    constraint: 'subclass_features_extra_attack_payload_check',
    rejects: [
      ['an extra_attack effect with no count at all', subclassFeature({ effect_kind: 'extra_attack', effect_weapon_scope: 'any_weapon' })],
      // A scope-less grant would have to be defaulted to `any_weapon` by every
      // reader, which silently WIDENS a one-weapon grant to all of them.
      ['an extra_attack effect with no weapon scope', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 2 })],
      ['an extra_attack effect with neither', subclassFeature({ effect_kind: 'extra_attack' })],
    ],
    accepts: [
      ['an extra_attack effect carrying both', subclassFeature({ effect_kind: 'extra_attack', effect_attack_count: 3, effect_weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  // --- D19: named features -------------------------------------------------
  {
    constraint: 'named_features_class_level_check',
    rejects: [
      ['level 0', namedFeature({ class_level: 0 })],
      ['level 21', namedFeature({ class_level: 21 })],
    ],
    accepts: [
      // The two bundled rows: Thirsting Blade at 5, Devouring Blade at 12.
      ['the level 5 prerequisite', namedFeature({ class_level: 5 })],
      ['the level 12 prerequisite', namedFeature({ class_level: 12 })],
    ],
  },
  {
    constraint: 'named_features_effect_kind_check',
    rejects: [
      ['a kind outside the closed set', namedFeature({ effect_kind: 'invocation' })],
      ['an empty kind', namedFeature({ effect_kind: '' })],
    ],
    accepts: [
      ['the NULL a text-only feature carries', namedFeature({ effect_kind: null })],
      ['extra_attack, with both halves of its payload', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  {
    constraint: 'named_features_effect_weapon_scope_check',
    rejects: [
      ['a scope outside the closed set', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'pact' })],
    ],
    accepts: [
      ["Thirsting Blade's own scope", namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'one_bonded_weapon' })],
      ['an unscoped named feature', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'any_weapon' })],
    ],
  },
  {
    constraint: 'named_features_effect_attack_count_check',
    rejects: [
      ['a single attack, which is the absence of the feature', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 1, effect_weapon_scope: 'one_bonded_weapon' })],
      ['a text attack count', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 'three', effect_weapon_scope: 'one_bonded_weapon' })],
    ],
    accepts: [
      ['the NULL a text-only feature carries', namedFeature({ effect_attack_count: null })],
      ["Devouring Blade's three", namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 3, effect_weapon_scope: 'one_bonded_weapon' })],
    ],
  },
  {
    constraint: 'named_features_attack_count_kind_check',
    rejects: [
      ['an attack count on a free-text feature', namedFeature({ effect_kind: null, effect_attack_count: 2 })],
    ],
    accepts: [
      ['a free-text feature with no count', namedFeature({ effect_kind: null, effect_attack_count: null })],
    ],
  },
  {
    constraint: 'named_features_weapon_scope_kind_check',
    rejects: [
      ['a weapon scope on a free-text feature', namedFeature({ effect_kind: null, effect_weapon_scope: 'one_bonded_weapon' })],
    ],
    accepts: [
      ['a free-text feature with no scope', namedFeature({ effect_kind: null, effect_weapon_scope: null })],
    ],
  },
  {
    constraint: 'named_features_extra_attack_payload_check',
    rejects: [
      ['an extra_attack effect with no count at all', namedFeature({ effect_kind: 'extra_attack', effect_weapon_scope: 'one_bonded_weapon' })],
      ['an extra_attack effect with no weapon scope', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 2 })],
    ],
    accepts: [
      ['Thirsting Blade, whole', namedFeature({ effect_kind: 'extra_attack', effect_attack_count: 2, effect_weapon_scope: 'one_bonded_weapon' })],
    ],
  },
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
    constraint: 'character_sheet_adjustments_armor_class_adjustment_check',
    rejects: [
      ['a magnitude past the bound', sheetAdjustment({ armor_class_adjustment: 21 })],
      ['a negative magnitude past the bound', sheetAdjustment({ armor_class_adjustment: -21 })],
      // The `typeof` limb: SQLite orders every TEXT value above every number,
      // so a bare range would admit this on the upper side.
      ['a text adjustment', sheetAdjustment({ armor_class_adjustment: 'three' })],
    ],
    accepts: [
      ['the column default of zero', sheetAdjustment({})],
      // SIGNED, on purpose: a cursed item or a house rule is a real negative
      // adjustment, and refusing one would invent a rule the source never states.
      ['a negative adjustment', sheetAdjustment({ armor_class_adjustment: -2 })],
      ['the positive bound', sheetAdjustment({ armor_class_adjustment: 20 })],
      ['the negative bound', sheetAdjustment({ armor_class_adjustment: -20 })],
      ['a Barbarian-sized Unarmored Defense bonus', sheetAdjustment({ armor_class_adjustment: 5, armor_class_adjustment_note: 'Unarmored Defense: +Con' })],
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
    it('refuses a NULL effect_kind on both effect tables, by NOT NULL', () => {
      for (const [table, write] of [
        [
          'species_template_trait_effects',
          speciesTemplateTraitEffect({ effect_kind: null }),
        ],
        ['character_effects', characterEffect({ effect_kind: null })],
      ] as const) {
        expect(caughtErrorMessage(() => write(db)), table).toContain(
          'SQLITE_CONSTRAINT_NOTNULL',
        );
      }
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
