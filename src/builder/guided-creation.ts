/**
 * GUIDED CREATION — build-state derivation (dispatch A1), transactional
 * class-first materialisation (dispatch A2), the species step (dispatch A4)
 * and the background step (dispatch A5).
 *
 * The wizard's current step is a PURE FUNCTION OF CHARACTER STATE and nothing
 * else. D48 deleted the session-storage draft outright, so there is no second
 * store to consult and none may be introduced: a reload lands on the right step
 * because the database says so, not because a browser remembered.
 *
 * The derivation is split in two on purpose:
 *
 * 1. {@link readGuidedStepEvidence} touches the database and answers only
 *    yes/no questions about what is persisted;
 * 2. {@link deriveBuildStep} walks D55's step order over that evidence and is
 *    pure, so its fixtures need no database.
 *
 * Extending it — A4 (species), A5 (background) — is adding one evidence field
 * and flipping one entry of the completion record from a literal `false` to
 * that field. The record is keyed by the FULL `BuildStep` union, so a new step
 * added to the seam fails to compile here until someone decides how it is
 * detected. That is the point: a wrong program should not compile.
 */

import { UpdateClassCommand } from '../commands/update-class';
import type { CharacterCommandIntegrity } from '../commands/integrity';
import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  creatureSizes,
  creatureTypes,
  damageTypes,
  isEnumValue,
  type KnownCreatureSize,
  type KnownCreatureType,
  type KnownDamageType,
} from '../domain/enums';
import type { CharacterRow } from '../domain/models';
import { CharacterCrud } from '../queries/character-crud';
import { characterLevel } from '../rules/character-level';
import { bundledClassContentKeys } from '../rules/class-progression-lookup';
import {
  backgroundFromTemplate,
  effectsFromTemplate,
  speciesFromTemplate,
  speciesTraitFromTemplate,
  type BackgroundTemplateRow,
  type SpeciesTemplateRow,
  type SpeciesTemplateTraitEffectRow,
  type SpeciesTemplateTraitRow,
} from '../rules/origins';
import {
  bundledBackgroundTemplates,
  bundledSpeciesTemplates,
} from '../rules/origins-srd';
import {
  grantsLineageSpells,
  GUIDED_LEVEL_ONE_STEP_ORDER,
  type BuildStep,
  type GuidedApplyOriginResult,
  type GuidedBuildStateResult,
  type GuidedClassOption,
  type GuidedCreateParams,
  type GuidedOriginOption,
  type GuidedOriginParams,
  type GuidedRefusalReason,
  type OriginKind,
} from './contracts';

/**
 * What the database can currently attest about a character's guided progress.
 *
 * `classChosen` (A1): `characterLevel()` returns null with no class rows (A12
 * in the plan), and that null IS the class check — no separate query, so the
 * two cannot drift.
 *
 * `speciesChosen` (A4): a `character_species` row exists for the character.
 * That rule is PINNED by the plan (§8) — NOT a `character_source_instances`
 * row, which is not on this path at all.
 *
 * `backgroundChosen` (A5): a `character_background` row exists — pinned by the
 * same clause of §8, and by the same reasoning. Note what this deliberately
 * does NOT attest: a background row proves nothing about the feat, the skills,
 * the tool or the equipment, because recording a background applies none of
 * them. The step is complete when the choice is recorded, and the screen says
 * out loud that recording is ALL that happened.
 */
export interface GuidedStepEvidence {
  readonly classChosen: boolean;
  readonly speciesChosen: boolean;
  readonly backgroundChosen: boolean;
}

/**
 * The first step the evidence cannot prove complete, in D55's order.
 *
 * Steps with no detection yet (`skills`, `equipment`) are pinned incomplete,
 * so the walk stops at the first of them. The build screen renders
 * those undetectable steps as the terminal not-built-yet panel rather than
 * pretending they can be finished here.
 *
 * `abilities` IS PINNED COMPLETE, AND THAT IS A DISCLOSED LIMITATION, NOT A
 * DETECTION. Ability scores are six NOT-NULL columns on `characters` with a
 * DEFAULT of 10, so "scores exist" is true for every character by construction
 * and nothing in the schema can distinguish an allocated score from a
 * defaulted one. A literal `false` here would be worse: the walk would stop at
 * `abilities` forever — no dispatch in this group builds that screen — and the
 * species and background steps behind it would be unreachable dead code, the
 * exact dead-end wizard shell §5 of the plan forbids (D54: the bar is usable).
 * It would also leave §9's A1-STEP control unfireable, which requires a
 * fixture advanced PAST species. The species screen says out loud that the
 * abilities step was skipped (D33), and when an abilities step is built this
 * literal becomes its evidence field.
 */
export function deriveBuildStep(evidence: GuidedStepEvidence): BuildStep {
  const complete: Readonly<Record<BuildStep, boolean>> = {
    class: evidence.classChosen,
    abilities: true,
    species: evidence.speciesChosen,
    background: evidence.backgroundChosen,
    skills: false,
    equipment: false,
  };
  for (const step of GUIDED_LEVEL_ONE_STEP_ORDER) {
    if (!complete[step]) {
      return step;
    }
  }
  // Unreachable while any step above is a literal `false`; the contract has no
  // "done" member, so a fully complete character rests on the final step.
  return 'equipment';
}

export function readGuidedStepEvidence(
  db: DatabaseContext,
  characterId: number,
): GuidedStepEvidence {
  return {
    classChosen: characterLevel(db, characterId) !== null,
    speciesChosen:
      db.one(
        `SELECT id
         FROM character_species
         WHERE character_id = ?`,
        [characterId],
        (row) => sqlInteger(row, 'id'),
      ) !== null,
    backgroundChosen:
      db.one(
        `SELECT id
         FROM character_background
         WHERE character_id = ?`,
        [characterId],
        (row) => sqlInteger(row, 'id'),
      ) !== null,
  };
}

/**
 * The `queries.characters.buildState` result.
 *
 * An absent character is a SUCCESSFUL `not_found` result, never an RPC error —
 * pinned by the seam, because the existing `CharacterNotFoundError` path
 * degrades to a bare `handler_error` nothing can discriminate on. The
 * existence probe is deliberately not `CharacterCrud.get`: this query needs
 * the row's presence, not its columns, and must not throw to signal absence.
 */
export function guidedBuildState(
  db: DatabaseContext,
  characterId: number,
): GuidedBuildStateResult {
  const existing = db.one(
    `SELECT id
     FROM characters
     WHERE id = ?`,
    [characterId],
    (row) => sqlInteger(row, 'id'),
  );
  if (existing === null) {
    return { kind: 'not_found' };
  }
  return {
    kind: 'ready',
    character_id: characterId,
    current_step: deriveBuildStep(readGuidedStepEvidence(db, characterId)),
  };
}

/* ------------------------------------------------- A2: class-first creation */

/**
 * A DOMAIN refusal, distinct from an unexpected failure. The worker handler
 * translates it to `handler_error` with structured `data` (the seam's
 * `GuidedRefusalData`), following the `RevisionConflict` precedent — a bare
 * SQL or generator failure stays a bare `handler_error` with no reason.
 */
export class GuidedCreationRefusal extends Error {
  constructor(
    readonly reason: GuidedRefusalReason,
    message: string,
  ) {
    super(message);
    this.name = 'GuidedCreationRefusal';
  }
}

/**
 * THE BUNDLED IDENTITY IS CONTENT-KEY MEMBERSHIP, NOTHING ELSE.
 *
 * `class_definitions` has no provenance column (plan A9), so bundled-vs-import
 * is decidable only against `bundledClassContentKeys()`. Both the option list
 * and the creation gate below read this one set, so the UI's filter and the
 * server-side gate cannot drift apart.
 */
function bundledClassKeys(): readonly string[] {
  return bundledClassContentKeys().classes;
}

interface BundledClassRow {
  readonly id: number;
  readonly content_key: string;
  readonly name: string;
  readonly hit_die: number | null;
}

const bundledClassRow: RowCodec<BundledClassRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  content_key: sqlString(row, 'content_key'),
  name: sqlString(row, 'name'),
  hit_die: sqlNullableInteger(row, 'hit_die'),
});

interface ClassIdentityRow {
  readonly id: number;
  readonly content_key: string;
  readonly name: string;
}

const classIdentityRow: RowCodec<ClassIdentityRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  content_key: sqlString(row, 'content_key'),
  name: sqlString(row, 'name'),
});

/**
 * The classes the wizard offers: rows of `class_definitions` whose
 * `content_key` is in the bundled set.
 *
 * NOT the ordinary catalogue query, which has no predicate at all — and NOT
 * the bundled key list alone, because a bundled key is not a promise that a
 * row exists (plan A11: seeding yields a `(name, rules_edition)` slot already
 * held by homebrew and skips that class). A key with no row is simply not
 * offered.
 *
 * `hit_die` comes from `class_sheet_traits` via LEFT JOIN and the row can be
 * absent; a null stays null so the UI renders "unknown" (D33) — never the
 * sheet's `ASSUMED_HIT_DIE`, which would be a guess presented as a fact at
 * the moment of choosing. Ordered by name so the list is deterministic.
 */
export function listGuidedClassOptions(
  db: DatabaseContext,
): readonly GuidedClassOption[] {
  const keys = bundledClassKeys();
  const placeholders = keys.map(() => '?').join(', ');
  return db
    .all(
      `SELECT definition.id AS id,
              definition.content_key AS content_key,
              definition.name AS name,
              traits.hit_die AS hit_die
       FROM class_definitions AS definition
       LEFT JOIN class_sheet_traits AS traits
         ON traits.class_definition_id = definition.id
       WHERE definition.content_key IN (${placeholders})
       ORDER BY definition.name`,
      [...keys],
      bundledClassRow,
    )
    .map(({ content_key, name, hit_die }) => ({ content_key, name, hit_die }));
}

/**
 * THE BUNDLED GATE. This is its ONLY enforcement point (plan §8): every path
 * into guided creation goes through here, inside the transaction, before any
 * row is written. `UpdateClassCommand` validates only that the class id
 * exists — it accepts homebrew — so D52's refusal lives here and nowhere
 * else. The UI list above merely applies the same predicate; filtering a
 * client list is not enforcement, because the RPC is callable without the UI.
 *
 * Refusal order is pinned by the seam: no row for the key is `unknown_class`
 * — including a bundled key whose seeding was skipped (A11) — and an existing
 * row outside the bundled set is `class_not_bundled`.
 */
function gateBundledClass(
  db: DatabaseContext,
  contentKey: string,
): ClassIdentityRow {
  const definition = db.one(
    `SELECT id, content_key, name
     FROM class_definitions
     WHERE content_key = ?`,
    [contentKey],
    classIdentityRow,
  );
  if (definition === null) {
    throw new GuidedCreationRefusal(
      'unknown_class',
      `No class exists for content key "${contentKey}".`,
    );
  }
  if (!bundledClassKeys().includes(contentKey)) {
    throw new GuidedCreationRefusal(
      'class_not_bundled',
      `"${definition.name}" is not a bundled class; the guided builder does not guide homebrew classes.`,
    );
  }
  return definition;
}

/**
 * ONE transaction spanning the character insert AND the class application.
 *
 * Neither participant owns an outer transaction (plan A6):
 * `CharacterCrud.create()` and `UpdateClassCommand.apply()` each open their
 * own, which only become savepoints when someone outside holds the real one
 * (`src/db/transaction.ts`). This wrapper is that someone. If grant
 * generation — or anything else inside the class application — throws, the
 * outer transaction rolls back and the `characters` insert goes with it:
 * no orphaned character row, ever.
 *
 * Deliberately NOT routed through `commands.execute`: creation is revision 0
 * with no audit or history entry, matching share import (plan §3.2). There is
 * no `operation_uuid` and creation is NOT idempotent (plan §3.3, reversed at
 * round 3) — double submission is the UI's problem.
 *
 * The class is applied at level 1; `UpdateClassCommand` marks the first class
 * of a class-less character as the starting class and generates its source
 * instance and grants (plan A7).
 */
export function createGuidedCharacter(
  db: DatabaseContext,
  params: GuidedCreateParams,
  integrity: CharacterCommandIntegrity,
): CharacterRow {
  return db.transaction(() => {
    const definition = gateBundledClass(db, params.class_content_key);
    const crud = new CharacterCrud(db);
    const created = crud.create({ name: params.name });
    new UpdateClassCommand(
      db,
      {
        type: 'update_class',
        class_definition_id: definition.id,
        level: 1,
      },
      integrity,
    ).apply(created.id);
    return crud.get(created.id);
  });
}

/* ------------------------------------- A4 + A5: the species and background steps */

/**
 * SPECIES ARE APPLIED FROM THE TEMPLATE TABLES. NOT THROUGH `add_source`.
 *
 * `AddSourceCommand` resolves a species through `species_definitions`, and
 * nothing in this repository ever writes that table — it is empty after a full
 * application seed, and two review rounds of the plan died on exactly this.
 * What IS populated, by `ensureBundledOriginContent`, is `species_templates`,
 * `species_template_traits` and `species_template_trait_effects`; the guided
 * step copies those into the character-owned rows `character_species`,
 * `character_species_traits` and `character_effects` via the existing pure
 * helpers in `src/rules/origins.ts` — their first production callers.
 *
 * The species is therefore genuinely APPLIED, not merely recorded: the sheet
 * reads speed from `character_species` and effects from `character_effects`,
 * so a person sees a consequence (§9's A4-APPLIED control).
 *
 * The honest limit, disclosed on the screen rather than hidden: there is no
 * `character_source_instances` row, so no grant-rule consequence exists —
 * lineage spells above all (A6 grants them for real; until then the UI says
 * they are not granted YET, never that the character lacks them).
 */

/**
 * The seam pins `{ character_id, current_step }` as `applyOrigin`'s result.
 *
 * A4 declared this locally because §8 described the shape only in prose; the
 * seam has since ratified it (`contracts.ts`). Re-exported from here so A4's
 * existing importers keep working, but the declaration now lives in the seam
 * ALONE — two identical declarations are one edit away from being different.
 */
export type { GuidedApplyOriginResult };

/**
 * THE BUNDLED ORIGIN IDENTITY IS CONTENT-KEY MEMBERSHIP, mirroring the class
 * gate. `species_templates` carries no provenance column either; the bundled
 * set is derived from the same SRD parse the seeder writes from, so the option
 * list and the apply gate cannot drift apart.
 */
function bundledSpeciesKeys(): readonly string[] {
  return bundledSpeciesTemplates().map((template) => template.content_key);
}

/** The background twin (A5), derived from the same SRD parse the seeder uses. */
function bundledBackgroundKeys(): readonly string[] {
  return bundledBackgroundTemplates().map((template) => template.content_key);
}

function sqlKnownCreatureType(
  row: SqlRow,
  column: string,
): KnownCreatureType {
  const value = sqlString(row, column);
  if (!isEnumValue(creatureTypes, value)) {
    throw new Error(
      `Species template column ${column} holds unknown creature type ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

function sqlKnownCreatureSize(
  row: SqlRow,
  column: string,
): KnownCreatureSize {
  const value = sqlString(row, column);
  if (!isEnumValue(creatureSizes, value)) {
    throw new Error(
      `Species template column ${column} holds unknown size ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

function sqlKnownNullableCreatureSize(
  row: SqlRow,
  column: string,
): KnownCreatureSize | null {
  const value = sqlNullableString(row, column);
  if (value === null) {
    return null;
  }
  return sqlKnownCreatureSize(row, column);
}

function sqlKnownNullableDamageType(
  row: SqlRow,
  column: string,
): KnownDamageType | null {
  const value = sqlNullableString(row, column);
  if (value === null) {
    return null;
  }
  if (!isEnumValue(damageTypes, value)) {
    throw new Error(
      `Species template column ${column} holds unknown damage type ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

const speciesTemplateRow: RowCodec<SpeciesTemplateRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  content_key: sqlString(row, 'content_key'),
  rules_edition: sqlString(row, 'rules_edition'),
  name: sqlString(row, 'name'),
  creature_type: sqlKnownCreatureType(row, 'creature_type'),
  size: sqlKnownCreatureSize(row, 'size'),
  alternate_size: sqlKnownNullableCreatureSize(row, 'alternate_size'),
  base_speed_feet: sqlInteger(row, 'base_speed_feet'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

const speciesTemplateTraitRow: RowCodec<SpeciesTemplateTraitRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  species_template_id: sqlInteger(row, 'species_template_id'),
  sort_order: sqlInteger(row, 'sort_order'),
  name: sqlString(row, 'name'),
  description: sqlString(row, 'description'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

const speciesTemplateTraitEffectRow: RowCodec<SpeciesTemplateTraitEffectRow> = (
  row,
) => ({
  id: sqlInteger(row, 'id'),
  species_template_trait_id: sqlInteger(row, 'species_template_trait_id'),
  sort_order: sqlInteger(row, 'sort_order'),
  effect_kind: sqlString(row, 'effect_kind'),
  damage_type: sqlKnownNullableDamageType(row, 'damage_type'),
  hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
  hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
  speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

/**
 * The species the wizard offers: rows of `species_templates` whose
 * `content_key` is in the bundled set — the same shape as the class list, for
 * the same reasons (a bundled key with no row is simply not offered).
 *
 * `grants_lineage_spells` comes from the seam's pinned literal set, NEVER from
 * trait text — sniffing text is how two agents invent two different lists.
 *
 * `kind: 'background'` (A5) reads `background_templates` the same way. Its
 * `grants_lineage_spells` is a LITERAL `false`, pinned by the seam — "the
 * seam's set is species-only; backgrounds are always false" — not a lookup
 * that happens to miss.
 */
export function listGuidedOriginOptions(
  db: DatabaseContext,
  kind: OriginKind,
): readonly GuidedOriginOption[] {
  if (kind === 'background') {
    const keys = bundledBackgroundKeys();
    const placeholders = keys.map(() => '?').join(', ');
    return db
      .all(
        `SELECT content_key, name
         FROM background_templates
         WHERE content_key IN (${placeholders})
         ORDER BY name`,
        [...keys],
        (row) => ({
          content_key: sqlString(row, 'content_key'),
          name: sqlString(row, 'name'),
        }),
      )
      .map(({ content_key, name }) => ({
        content_key,
        name,
        grants_lineage_spells: false,
      }));
  }
  const keys = bundledSpeciesKeys();
  const placeholders = keys.map(() => '?').join(', ');
  return db
    .all(
      `SELECT content_key, name
       FROM species_templates
       WHERE content_key IN (${placeholders})
       ORDER BY name`,
      [...keys],
      (row) => ({
        content_key: sqlString(row, 'content_key'),
        name: sqlString(row, 'name'),
      }),
    )
    .map(({ content_key, name }) => ({
      content_key,
      name,
      grants_lineage_spells: grantsLineageSpells(content_key),
    }));
}

/**
 * The origin gate, mirroring `gateBundledClass`. The seam's refusal vocabulary
 * has only `unknown_origin` for this path — there is no `origin_not_bundled` —
 * so a key outside the bundled set and a bundled key whose row is absent both
 * refuse with the same reason: neither is a species the guided builder knows.
 */
function gateBundledSpecies(
  db: DatabaseContext,
  contentKey: string,
): SpeciesTemplateRow {
  if (!bundledSpeciesKeys().includes(contentKey)) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `No bundled species exists for content key "${contentKey}".`,
    );
  }
  const template = db.one(
    `SELECT id, content_key, rules_edition, name, creature_type, size,
            alternate_size, base_speed_feet, created_at, updated_at
     FROM species_templates
     WHERE content_key = ?`,
    [contentKey],
    speciesTemplateRow,
  );
  if (template === null) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `The bundled species "${contentKey}" has no row in this database.`,
    );
  }
  return template;
}

/**
 * Every `background_templates` column is NOT NULL except the timestamps, so
 * the codec is all plain strings — no enum narrowing, because the background
 * fields (ability names, feat, skills, tool, equipment text) are printed prose
 * copied verbatim, not values any rule dispatches on.
 */
const backgroundTemplateRow: RowCodec<BackgroundTemplateRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  content_key: sqlString(row, 'content_key'),
  rules_edition: sqlString(row, 'rules_edition'),
  name: sqlString(row, 'name'),
  ability_score_1: sqlString(row, 'ability_score_1'),
  ability_score_2: sqlString(row, 'ability_score_2'),
  ability_score_3: sqlString(row, 'ability_score_3'),
  feat_name: sqlString(row, 'feat_name'),
  skill_proficiency_1: sqlString(row, 'skill_proficiency_1'),
  skill_proficiency_2: sqlString(row, 'skill_proficiency_2'),
  tool_proficiency: sqlString(row, 'tool_proficiency'),
  equipment_option_a: sqlString(row, 'equipment_option_a'),
  equipment_option_b: sqlString(row, 'equipment_option_b'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

/** The background gate, `gateBundledSpecies`'s twin, same refusal vocabulary. */
function gateBundledBackground(
  db: DatabaseContext,
  contentKey: string,
): BackgroundTemplateRow {
  if (!bundledBackgroundKeys().includes(contentKey)) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `No bundled background exists for content key "${contentKey}".`,
    );
  }
  const template = db.one(
    `SELECT id, content_key, rules_edition, name, ability_score_1,
            ability_score_2, ability_score_3, feat_name, skill_proficiency_1,
            skill_proficiency_2, tool_proficiency, equipment_option_a,
            equipment_option_b, created_at, updated_at
     FROM background_templates
     WHERE content_key = ?`,
    [contentKey],
    backgroundTemplateRow,
  );
  if (template === null) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `The bundled background "${contentKey}" has no row in this database.`,
    );
  }
  return template;
}

/**
 * ONE transaction for the whole origin, and RE-APPLYING REPLACES (plan §8).
 *
 * `character_species` is unique per character, so a second naive insert is a
 * raw constraint failure; the wizard's back button must be able to change a
 * species, so the existing species rows are deleted and the new ones inserted
 * inside the same transaction. There is no `ClearSpeciesCommand` to call — the
 * schema comment names one and it was never built — so the delete is inline.
 *
 * The delete removes exactly what a species apply owns: the parent row, the
 * trait rows, and the `character_effects` rows the previous copy minted —
 * identified as unsourced effects (`source_instance_id IS NULL`) whose label
 * matches a current species trait name, because the label-is-the-trait's-name
 * binding is made at the moment of the copy and nowhere else. Effects that
 * belong to a source instance (a share-imported grant, a future feat) are not
 * touched.
 *
 * `effectsFromTemplate` deliberately drops the template's `sort_order`; this
 * caller assigns a dense per-character order starting after the character's
 * surviving effects, honouring the template's ordering as array order.
 *
 * THE BACKGROUND ARM (A5) IS THE SPECIES ARM WITH ONE TABLE. A background copy
 * is a single `character_background` row via `backgroundFromTemplate` — no
 * traits, no effects, no proficiency rows, no equipment rows, because the
 * copy records the printed words and applies nothing. Its replace is therefore
 * one delete of the one row the previous copy owned, and it deliberately
 * spares EVERYTHING else on the character — there is nothing else a
 * background apply has ever written. `character_background` is unique per
 * character, so without the delete a re-apply would be a raw constraint
 * failure; with it, re-applying is idempotent under retry and the back button
 * can change a background, same as species.
 */
export function applyGuidedOrigin(
  db: DatabaseContext,
  params: GuidedOriginParams,
): GuidedApplyOriginResult {
  return db.transaction(() => {
    const characterId = params.character_id;
    const existing = db.one(
      `SELECT id
       FROM characters
       WHERE id = ?`,
      [characterId],
      (row) => sqlInteger(row, 'id'),
    );
    if (existing === null) {
      throw new Error(`No character with id ${characterId} exists.`);
    }

    if (params.kind === 'background') {
      const backgroundTemplate = gateBundledBackground(db, params.content_key);
      // Replace: the parent row is the whole footprint of a background apply.
      db.exec(
        `DELETE FROM character_background WHERE character_id = ?`,
        [characterId],
      );
      const background = backgroundFromTemplate(backgroundTemplate);
      db.exec(
        `INSERT INTO character_background (
           character_id, name, ability_score_1, ability_score_2,
           ability_score_3, feat_name, skill_proficiency_1,
           skill_proficiency_2, tool_proficiency, equipment_option_a,
           equipment_option_b, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          background.name,
          background.ability_score_1,
          background.ability_score_2,
          background.ability_score_3,
          background.feat_name,
          background.skill_proficiency_1,
          background.skill_proficiency_2,
          background.tool_proficiency,
          background.equipment_option_a,
          background.equipment_option_b,
          background.notes,
        ],
      );
      return {
        character_id: characterId,
        current_step: deriveBuildStep(readGuidedStepEvidence(db, characterId)),
      };
    }

    const template = gateBundledSpecies(db, params.content_key);

    // Replace: effects first, because identifying them needs the trait rows
    // that the next statement deletes.
    db.exec(
      `DELETE FROM character_effects
       WHERE character_id = ?
         AND source_instance_id IS NULL
         AND label IN (
           SELECT name FROM character_species_traits WHERE character_id = ?
         )`,
      [characterId, characterId],
    );
    db.exec(
      `DELETE FROM character_species_traits WHERE character_id = ?`,
      [characterId],
    );
    db.exec(
      `DELETE FROM character_species WHERE character_id = ?`,
      [characterId],
    );

    const species = speciesFromTemplate(template);
    db.exec(
      `INSERT INTO character_species (
         character_id, name, creature_type, size, base_speed_feet, notes
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        species.name,
        species.creature_type,
        species.size,
        species.base_speed_feet,
        species.notes,
      ],
    );

    const baseOrder = db.one(
      `SELECT COALESCE(MAX(sort_order), 0) AS base
       FROM character_effects
       WHERE character_id = ?`,
      [characterId],
      (row) => sqlInteger(row, 'base'),
    );
    let effectOrder = baseOrder ?? 0;
    const traits = db.all(
      `SELECT id, species_template_id, sort_order, name, description,
              created_at, updated_at
       FROM species_template_traits
       WHERE species_template_id = ?
       ORDER BY sort_order`,
      [template.id],
      speciesTemplateTraitRow,
    );
    for (const trait of traits) {
      const copy = speciesTraitFromTemplate(trait);
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, description, notes
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          characterId,
          copy.sort_order,
          copy.name,
          copy.description,
          copy.notes,
        ],
      );
      const effects = db.all(
        `SELECT id, species_template_trait_id, sort_order, effect_kind,
                damage_type, hit_points_flat, hit_points_per_level,
                speed_bonus_feet, created_at, updated_at
         FROM species_template_trait_effects
         WHERE species_template_trait_id = ?
         ORDER BY sort_order`,
        [trait.id],
        speciesTemplateTraitEffectRow,
      );
      for (const effect of effectsFromTemplate(trait.name, effects)) {
        effectOrder += 1;
        db.exec(
          `INSERT INTO character_effects (
             character_id, sort_order, effect_kind, damage_type,
             hit_points_flat, hit_points_per_level, speed_bonus_feet,
             source_instance_id, label, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          [
            characterId,
            effectOrder,
            effect.effect_kind,
            effect.damage_type,
            effect.hit_points_flat,
            effect.hit_points_per_level,
            effect.speed_bonus_feet,
            effect.label,
            effect.notes,
          ],
        );
      }
    }

    return {
      character_id: characterId,
      current_step: deriveBuildStep(readGuidedStepEvidence(db, characterId)),
    };
  });
}
