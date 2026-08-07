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
import {
  CharacterCommandExecutor,
} from '../commands/character-command-executor';
import type { CharacterCommandIntegrity } from '../commands/integrity';
import {
  rowId,
  sqlCreatureSize,
  sqlCreatureType,
  sqlNullableCreatureSize,
  sqlNullableDamageType,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  abilityAllocationMethods,
  backgroundEquipmentOptions,
  classEquipmentOptions,
  isEnumValue,
  skills,
  type KnownAbilityAllocationMethod,
  type Skill,
} from '../domain/enums';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../domain/source-markers';
export { GUIDED_SPECIES_SOURCE_MARKER } from '../domain/source-markers';
import type { CharacterRow } from '../domain/models';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import {
  availableSkillsForExpertiseGrant,
  fillSkillExpertiseGrant,
  reconcileCharacterSkillExpertise,
  resolveSkillExpertiseGrants,
} from '../grants/skill-expertise-grants';
import { assignSpellSelection } from '../eligibility/spell-selection-assignment';
import { EligibleSpellSearch } from '../eligibility/eligible-spell-search';
import { spellSelectionConstraint } from '../eligibility/spell-selection-constraint';
import {
  classSkillGrantsFilled,
  mintFilledSkillGrants,
  rebuildSkillProjection,
  resolveSkillGrants,
  unfilledSpeciesSkillGrants,
} from '../grants/skill-grants';
import { CharacterCrud } from '../queries/character-crud';
import { skillFromLabel } from '../rules/skills';
import { characterLevel } from '../rules/character-level';
import {
  bundledSourceContentKeys,
} from '../catalog/bundled-source-membership';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import {
  backgroundEffectsFromTemplate,
  backgroundFromTemplate,
  effectsFromTemplate,
  speciesFromTemplate,
  speciesTraitFromTemplate,
  type BackgroundTemplateEffectRow,
  type BackgroundTemplateRow,
  type SpeciesTemplateRow,
  type SpeciesTemplateTraitEffectRow,
  type SpeciesTemplateTraitRow,
} from '../rules/origins';
import {
  ORIGIN_FEAT_CONFIG_CONFIG,
  ORIGIN_FEAT_KEY_CONFIG,
} from '../rules/background-definitions-srd';
import {
  BACKGROUND_ABILITY_INCREASE_MAXIMUM,
  isGuidedOriginFeatOfferable,
  printedPairing,
  type GuidedApplyBackgroundParams,
  type GuidedBackgroundChoiceOptions,
} from './background-choices';
import { GrantRule } from '../grants/grant-rule';
import { SourceRuleReader } from '../grants/source-rule-reader';
import {
  countAbilitiesAtLeastPlusTwo,
  EQUIPMENT_CHOICE_CONFIG_KEY,
  grantsLineageSpells,
  GUIDED_LEVEL_ONE_STEP_ORDER,
  hasWeakScores,
  SKILL_GRANT_KEYS,
  type AbilityAllocationMethod,
  type BuildStep,
  type EquipmentSourceKind,
  type GuidedAbilityWarning,
  type GuidedAllocateAbilitiesParams,
  type GuidedAllocateAbilitiesResult,
  type GuidedApplyOriginResult,
  type GuidedBuildStateResult,
  type GuidedClassOption,
  type GuidedCreateParams,
  type GuidedFillSkillGrantParams,
  type GuidedFillSkillGrantResult,
  type GuidedExpertiseStepState,
  type GuidedFillExpertiseGrantParams,
  type GuidedAssignSpellParams,
  type GuidedEligibleSpellsParams,
  type GuidedEligibleSpellsResult,
  type GuidedSpellsStepState,
  type GuidedOriginOption,
  type GuidedOriginParams,
  type GuidedRefusalReason,
  type GuidedSkillsStepState,
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
 *
 * `abilitiesAllocated` (B1): `characters.ability_allocation_method` is
 * non-NULL. The signal is EXPLICIT because inference is unsound (plan B-A2):
 * the six score columns are NOT NULL with a DEFAULT of 10, so "scores exist"
 * is true for every character by construction and nothing else can tell a
 * chosen 10 from a defaulted one. D64 makes all 10s a VALID allocation, so
 * this is the difference between a completion predicate and a guess.
 *
 * `skillsFilled` (S-C): NO unfilled ACTIVE class grant exists —
 * `classSkillGrantsFilled` in `src/grants/skill-grants.ts`, the seam-pinned
 * predicate. NEVER the planner-count completeness (skills-with-provenance
 * §5's trap): a count-shaped predicate reports a Fighter complete the moment
 * a background hands them two skills, and this per-grant one does not.
 * Species choice grants are choosable in the step but never gate it (§4:
 * "advances only when every class ordinal is filled").
 *
 * `equipmentChosen` (E-B): BOTH sources carry a recorded package choice —
 * the starting class's active source instance AND the background's each hold
 * the seam's `EQUIPMENT_CHOICE_CONFIG_KEY` in `config` with a valid option
 * letter (plan §3: "one option per source. Both are required before the step
 * completes", per D65 and D61). The predicate reads the RECORDED CHOICE and
 * never counts owned rows: an option can legitimately mint zero rows, and a
 * count-shaped predicate is exactly §5's trap one more time. A character
 * whose class or background has no resolvable source instance cannot be
 * equipment-complete, which is true — there is nothing to stamp grants with.
 */
export interface GuidedStepEvidence {
  readonly classChosen: boolean;
  readonly abilitiesAllocated: boolean;
  readonly speciesChosen: boolean;
  readonly backgroundChosen: boolean;
  readonly skillsFilled: boolean;
  readonly expertiseFilled: boolean;
  readonly spellsFilled: boolean;
  readonly equipmentChosen: boolean;
}

/**
 * The first step the evidence cannot prove complete, in D55's order.
 *
 * `abilities` (B1) is REAL DETECTION now: the allocation signal
 * `characters.ability_allocation_method` replaced the pinned `abilities: true`
 * literal A1 shipped while no abilities screen existed. That literal is
 * DELETED, not reworded (plan §5), along with the species screen's
 * abilities-step-skipped disclosure — both existed only while the step was
 * unbuildable. `skills` (S-C) followed the same path: its `false` literal is
 * deleted and the evidence field is the per-grant predicate. `equipment`
 * (E-B) was the LAST literal `false` — the one step whose flag could never
 * be true — and its evidence is now the both-choices-recorded predicate, so
 * no entry of this record is pinned any more.
 */
export function deriveBuildStep(evidence: GuidedStepEvidence): BuildStep {
  const complete: Readonly<Record<BuildStep, boolean>> = {
    class: evidence.classChosen,
    abilities: evidence.abilitiesAllocated,
    species: evidence.speciesChosen,
    background: evidence.backgroundChosen,
    skills: evidence.skillsFilled,
    expertise: evidence.expertiseFilled,
    spells: evidence.spellsFilled,
    equipment: evidence.equipmentChosen,
  };
  for (const step of GUIDED_LEVEL_ONE_STEP_ORDER) {
    if (!complete[step]) {
      return step;
    }
  }
  // The contract has no "done" member, so a fully complete character rests on
  // the final step — whose SCREEN then shows the recorded state rather than
  // an open choice, because the equipment step read carries `complete`.
  return 'equipment';
}

/**
 * One equipment-granting source, resolved from character state (E-B).
 *
 * `source_instance_id` is the ACTIVE instance the recorded choice lives on —
 * null when the source was recorded without one (the record-only
 * `applyOrigin` background arm), in which case no choice can be recorded yet
 * and E-A's mint produces the instance at apply time.
 */
export interface ResolvedEquipmentSource {
  readonly content_key: string;
  readonly source_name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly source_instance_id: number | null;
}

/**
 * The class whose kit the equipment step offers: the STARTING class (D42's
 * class-first door; a second class re-opens the kit only as a suggestion
 * that never rewrites a choice, D42.6, which is not this step). Null when
 * the character has no class rows at all.
 */
export function resolveEquipmentClassSource(
  db: DatabaseContext,
  characterId: number,
): ResolvedEquipmentSource | null {
  const definition = db.one(
    `SELECT definition.id AS definition_id, definition.content_key,
            definition.name, identity.catalog_layer
     FROM character_class_levels AS level
     INNER JOIN class_definitions AS definition
       ON definition.id = level.class_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'class'
      AND identity.content_key = definition.content_key
     WHERE level.character_id = ?
     ORDER BY level.is_starting_class DESC, level.id
     LIMIT 1`,
    [characterId],
    (row) => ({
      definition_id: sqlInteger(row, 'definition_id'),
      content_key: sqlString(row, 'content_key'),
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  if (definition === null) {
    return null;
  }
  const instanceId = db.scalar(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'class' AND state = 'active'
       AND source_definition_id = ?
     ORDER BY id
     LIMIT 1`,
    [characterId, definition.definition_id],
  );
  return {
    content_key: definition.content_key,
    source_name: definition.name,
    catalog_layer: definition.catalog_layer,
    source_instance_id: typeof instanceId === 'number' ? instanceId : null,
  };
}

/**
 * The background whose kit the equipment step offers.
 *
 * The active root background source instance is the primary resolution — the
 * guided `applyBackground` (B3) always mints one. A background recorded by
 * the record-only `applyOrigin` arm stores only the printed prose, so it
 * resolves through a UNIQUE template-name match; a name matching zero or
 * several bundled templates yields null and the step DISCLOSES that the
 * background has no resolvable package rather than guessing (D33). This is
 * content identity, not a mechanical fact decided by text (D15's subject):
 * the row was copied verbatim from the template whose name it carries.
 */
export function resolveEquipmentBackgroundSource(
  db: DatabaseContext,
  characterId: number,
): ResolvedEquipmentSource | null {
  const instance = db.one(
    `SELECT source.id AS instance_id, definition.content_key,
            source.display_name, identity.catalog_layer
     FROM character_source_instances AS source
     INNER JOIN background_definitions AS definition
       ON definition.id = source.source_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'background'
      AND identity.content_key = definition.content_key
     WHERE source.character_id = ?
       AND source.source_type = 'background'
       AND source.parent_source_instance_id IS NULL
       AND source.state = 'active'
     ORDER BY source.id
     LIMIT 1`,
    [characterId],
    (row) => ({
      instance_id: sqlInteger(row, 'instance_id'),
      content_key: sqlString(row, 'content_key'),
      display_name: sqlString(row, 'display_name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  if (instance !== null) {
    return {
      content_key: instance.content_key,
      source_name: instance.display_name,
      source_instance_id: instance.instance_id,
      catalog_layer: instance.catalog_layer,
    };
  }
  const recordedName = db.scalar(
    'SELECT name FROM character_background WHERE character_id = ?',
    [characterId],
  );
  if (typeof recordedName !== 'string') {
    return null;
  }
  const templates = db.all(
    `SELECT template.content_key, template.name, identity.catalog_layer
     FROM background_templates AS template
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'background'
      AND identity.content_key = template.content_key
     WHERE template.name = ?`,
    [recordedName],
    (row) => ({
      content_key: sqlString(row, 'content_key'),
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  const template = templates[0];
  if (templates.length !== 1 || template === undefined) {
    return null;
  }
  return {
    content_key: template.content_key,
    source_name: template.name,
    source_instance_id: null,
    catalog_layer: template.catalog_layer,
  };
}

/**
 * ONE source's recorded package choice, read from its active source
 * instance's `config` under the seam's `EQUIPMENT_CHOICE_CONFIG_KEY` — the
 * single truth the step evidence, the equipment step read AND the sheet's
 * package line all consult, so three surfaces cannot disagree about whether
 * a choice was made (§5's trap is exactly several surfaces with several
 * predicates).
 *
 * A stored value whose `kind` does not match the source it sits on, or whose
 * option letter is outside the source's closed set, reads as NO CHOICE
 * rather than a plausible one: nothing downstream may act on a config shape
 * this module never writes.
 */
export function recordedEquipmentChoiceOption(
  db: DatabaseContext,
  characterId: number,
  kind: EquipmentSourceKind,
): string | null {
  const source =
    kind === 'class'
      ? resolveEquipmentClassSource(db, characterId)
      : resolveEquipmentBackgroundSource(db, characterId);
  if (source === null || source.source_instance_id === null) {
    return null;
  }
  const stored = db.scalar(
    'SELECT config FROM character_source_instances WHERE id = ?',
    [source.source_instance_id],
  );
  if (typeof stored !== 'string' || stored === '') {
    return null;
  }
  const parsed: unknown = JSON.parse(stored);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const choice = (parsed as Record<string, unknown>)[
    EQUIPMENT_CHOICE_CONFIG_KEY
  ];
  if (typeof choice !== 'object' || choice === null || Array.isArray(choice)) {
    return null;
  }
  const record = choice as Record<string, unknown>;
  if (record['kind'] !== kind) {
    return null;
  }
  const option = record['option'];
  const validOptions: readonly string[] =
    kind === 'class' ? classEquipmentOptions : backgroundEquipmentOptions;
  return typeof option === 'string' && validOptions.includes(option)
    ? option
    : null;
}

export function readGuidedStepEvidence(
  db: DatabaseContext,
  characterId: number,
): GuidedStepEvidence {
  return {
    classChosen: characterLevel(db, characterId) !== null,
    abilitiesAllocated:
      db.one(
        `SELECT ability_allocation_method
         FROM characters
         WHERE id = ?`,
        [characterId],
        (row) => sqlNullableString(row, 'ability_allocation_method'),
      ) !== null,
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
    skillsFilled: classSkillGrantsFilled(db, characterId),
    expertiseFilled:
      resolveSkillExpertiseGrants(db, characterId).every(
        (grant) => grant.state !== 'active' || grant.skill !== null,
      ),
    spellsFilled:
      Number(
        db.scalar(
          `SELECT (
             SELECT count(*) FROM spell_selection_slots AS slot
             INNER JOIN character_source_instances AS source
               ON source.id = slot.source_instance_id
              AND source.character_id = slot.character_id
             WHERE slot.character_id = ? AND source.state = 'active'
               AND slot.state = 'active' AND slot.is_locked = 0
               AND slot.fixed_spell_version_id IS NULL
               AND slot.current_spell_version_id IS NULL
           ) + (
             SELECT count(*) FROM wizard_spellbook_entries AS entry
             INNER JOIN character_source_instances AS source
               ON source.id = entry.source_instance_id
              AND source.character_id = entry.character_id
             WHERE entry.character_id = ? AND source.state = 'active'
               AND entry.state = 'active' AND entry.spell_version_id IS NULL
           )`,
          [characterId, characterId],
        ) ?? 0,
      ) === 0,
    equipmentChosen:
      recordedEquipmentChoiceOption(db, characterId, 'class') !== null &&
      recordedEquipmentChoiceOption(db, characterId, 'background') !== null,
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
function bundledClassKeys(db: DatabaseContext): readonly string[] {
  void db;
  return bundledSourceContentKeys('class');
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
 * NOT the ordinary catalogue query's registry join — and NOT the bundled key
 * list alone, because a bundled key is not a promise that a
 * row exists (plan A11: seeding yields a `(name, rules_edition)` slot already
 * held by homebrew and skips that class). A key with no row is simply not
 * offered.
 *
 * D133 keeps this boundary permanently bundled-only in v1. HA-10 widens the
 * origin and subclass consumers, never this class picker.
 *
 * `hit_die` comes from `class_sheet_traits` via LEFT JOIN and the row can be
 * absent; a null stays null so the UI renders "unknown" (D33) — never the
 * sheet's `ASSUMED_HIT_DIE`, which would be a guess presented as a fact at
 * the moment of choosing. Ordered by name so the list is deterministic.
 */
export function listGuidedClassOptions(
  db: DatabaseContext,
): readonly GuidedClassOption[] {
  const keys = bundledClassKeys(db);
  const placeholders = keys.map(() => '?').join(', ');
  return db
    .all(
      `SELECT definition.id AS id,
              definition.content_key AS content_key,
              definition.name AS name,
              traits.hit_die AS hit_die,
              identity.catalog_layer AS catalog_layer
       FROM class_definitions AS definition
       LEFT JOIN class_sheet_traits AS traits
         ON traits.class_definition_id = definition.id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'class'
        AND identity.content_key = definition.content_key
       WHERE definition.content_key IN (${placeholders})
       ORDER BY definition.name`,
      [...keys],
      (row) => ({
        ...bundledClassRow(row),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    )
    .map(({ content_key, name, hit_die, catalog_layer }) => ({
      content_key,
      name,
      hit_die,
      catalog_layer,
    }));
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
  if (!bundledSourceContentKeys('class').includes(contentKey)) {
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
 * A6 ADDED THE GRANT BRIDGE BESIDE THE COPY (D56): when the applied species
 * has a `species_definitions` row — seeded for the three lineage species by
 * `src/rules/origin-definitions-srd.ts`, this repository's first writer of
 * that table — the apply also writes a `character_source_instances` row and
 * runs the EXISTING `GrantRuleSlotGenerator` over it, the same generator the
 * class path uses. See {@link replaceGuidedLineageGrants} for what actually
 * arrives today and for the honest limit that remains — the lineage choice
 * itself, which the species screen's unmade-choices list still names.
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

const speciesTemplateRow: RowCodec<SpeciesTemplateRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  content_key: sqlString(row, 'content_key'),
  rules_edition: sqlString(row, 'rules_edition'),
  name: sqlString(row, 'name'),
  creature_type: sqlCreatureType(row, 'creature_type'),
  size: sqlCreatureSize(row, 'size'),
  alternate_size: sqlNullableCreatureSize(row, 'alternate_size'),
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
  damage_type: sqlNullableDamageType(row, 'damage_type'),
  hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
  hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
  speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
  ability: sqlNullableString(row, 'ability'),
  amount: sqlNullableInteger(row, 'amount'),
  maximum: sqlNullableInteger(row, 'maximum'),
  base: sqlNullableInteger(row, 'base'),
  ability_1: sqlNullableString(row, 'ability_1'),
  ability_2: sqlNullableString(row, 'ability_2'),
  allows_shield: sqlNullableInteger(row, 'allows_shield'),
  weapon_scope: sqlNullableString(row, 'weapon_scope'),
  label: sqlString(row, 'label'),
  notes: sqlNullableString(row, 'notes'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

/**
 * The species the wizard offers: bundled templates plus complete external
 * definition/template aggregates. Requiring both external halves keeps the
 * application source and catalogue definition on one identity.
 *
 * `grants_lineage_spells` comes from the seam's pinned literal set, NEVER from
 * trait text — sniffing text is how two agents invent two different lists.
 *
 * `kind: 'background'` (A5) reads `background_templates` the same way. Its
 * `grants_lineage_spells` is a LITERAL `false`, pinned by the seam — "the
 * seam's set is species-only; backgrounds are always false" — not a lookup
 * that happens to miss.
 *
 * HA-4 gives backgrounds the same complete-two-half rule as species.
 */
export function listGuidedOriginOptions(
  db: DatabaseContext,
  kind: OriginKind,
): readonly GuidedOriginOption[] {
  if (kind === 'background') {
    return db
      .all(
        `SELECT template.content_key, template.name, identity.catalog_layer
         FROM background_templates AS template
         LEFT JOIN catalog_content_identities AS identity
           ON identity.content_kind = 'background'
          AND identity.content_key = template.content_key
         LEFT JOIN background_definitions AS definition
           ON definition.content_key = template.content_key
         WHERE identity.catalog_layer = 'bundled'
            OR definition.content_key IS NOT NULL
         ORDER BY template.name, template.content_key`,
        undefined,
        (row) => ({
          content_key: sqlString(row, 'content_key'),
          name: sqlString(row, 'name'),
          catalog_layer: sqlNullableString(row, 'catalog_layer'),
        }),
      )
      .map(({ content_key, name, catalog_layer }) => ({
        content_key,
        name,
        catalog_layer: catalogLayerDisclosure(catalog_layer),
        grants_lineage_spells: false,
      }));
  }
  return db
    .all(
      `SELECT template.content_key, template.name, identity.catalog_layer
       FROM species_templates AS template
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'species'
        AND identity.content_key = template.content_key
       LEFT JOIN species_definitions AS definition
         ON definition.content_key = template.content_key
       WHERE identity.catalog_layer = 'bundled'
          OR definition.content_key IS NOT NULL
       ORDER BY template.name, template.content_key`,
      undefined,
      (row) => ({
        content_key: sqlString(row, 'content_key'),
        name: sqlString(row, 'name'),
        catalog_layer: sqlNullableString(row, 'catalog_layer'),
      }),
    )
    .map(({ content_key, name, catalog_layer }) => ({
      content_key,
      name,
      catalog_layer: catalogLayerDisclosure(catalog_layer),
      grants_lineage_spells: grantsLineageSpells(content_key),
    }));
}

/**
 * The origin gate accepts a bundled template or a complete external
 * definition/template aggregate. The seam's refusal vocabulary has only
 * `unknown_origin` for this path, so an incomplete or absent aggregate refuses
 * with that reason rather than being partially applied.
 */
function gateInstalledSpecies(
  db: DatabaseContext,
  contentKey: string,
): SpeciesTemplateRow {
  const template = db.one(
    `SELECT template.id, template.content_key, template.rules_edition,
            template.name, template.creature_type, template.size,
            template.alternate_size, template.base_speed_feet,
            template.created_at, template.updated_at
     FROM species_templates AS template
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'species'
      AND identity.content_key = template.content_key
     LEFT JOIN species_definitions AS definition
       ON definition.content_key = template.content_key
     WHERE template.content_key = ?
       AND (identity.catalog_layer = 'bundled' OR definition.content_key IS NOT NULL)`,
    [contentKey],
    speciesTemplateRow,
  );
  if (template === null) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `The installed species "${contentKey}" is incomplete or unavailable.`,
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

const backgroundTemplateEffectRow: RowCodec<BackgroundTemplateEffectRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  background_template_id: sqlInteger(row, 'background_template_id'),
  sort_order: sqlInteger(row, 'sort_order'),
  effect_kind: sqlString(row, 'effect_kind'),
  damage_type: sqlNullableDamageType(row, 'damage_type'),
  hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
  hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
  speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
  ability: sqlNullableString(row, 'ability'),
  amount: sqlNullableInteger(row, 'amount'),
  maximum: sqlNullableInteger(row, 'maximum'),
  base: sqlNullableInteger(row, 'base'),
  ability_1: sqlNullableString(row, 'ability_1'),
  ability_2: sqlNullableString(row, 'ability_2'),
  allows_shield: sqlNullableInteger(row, 'allows_shield'),
  weapon_scope: sqlNullableString(row, 'weapon_scope'),
  label: sqlString(row, 'label'),
  notes: sqlNullableString(row, 'notes'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

/** A complete installed background aggregate, with the same refusal vocabulary. */
function gateInstalledBackground(
  db: DatabaseContext,
  contentKey: string,
): BackgroundTemplateRow {
  const template = db.one(
    `SELECT template.id, template.content_key, template.rules_edition,
            template.name, template.ability_score_1,
            template.ability_score_2, template.ability_score_3,
            template.feat_name, template.skill_proficiency_1,
            template.skill_proficiency_2, template.tool_proficiency,
            template.equipment_option_a, template.equipment_option_b,
            template.created_at, template.updated_at
     FROM background_templates AS template
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'background'
      AND identity.content_key = template.content_key
     LEFT JOIN background_definitions AS definition
       ON definition.content_key = template.content_key
     WHERE template.content_key = ?
       AND (identity.catalog_layer = 'bundled' OR definition.content_key IS NOT NULL)`,
    [contentKey],
    backgroundTemplateRow,
  );
  if (template === null) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `The installed background "${contentKey}" is incomplete or unavailable.`,
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
 * trait rows, and the marker-owned source instance whose cascade removes the
 * generated `character_effects` rows. A narrow unsourced label cleanup remains
 * below only for rows minted by builds predating generated source ownership.
 *
 * A6 WIDENED WHAT AN APPLY OWNS, so the replace widened with it: the previous
 * apply's grant SOURCE INSTANCE — marked with
 * {@link GUIDED_SPECIES_SOURCE_MARKER}, so only rows this path minted are
 * ever candidates — is hard-deleted with its subtree before the new one is
 * written, inside the same transaction. Its spell-selection slots and any
 * sourced effects go with it by `ON DELETE CASCADE`. Without this, a player
 * who switches from Tiefling to Dwarf keeps Thaumaturgy forever — the orphan
 * shape §9's A4-SOURCED control was written against, inverted. A hard delete
 * rather than the tombstone `RemoveSourceCommand` uses, because this is the
 * SAME replace semantic as the tables above: re-applying means the earlier
 * apply never happened, and is idempotent under retry. Source instances the
 * guided path did not mint — added through the planner's expert commands —
 * carry no marker and are left alone.
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
      const backgroundTemplate = gateInstalledBackground(db, params.content_key);
      // Replace. A5 could say "the parent row is the whole footprint of a
      // background apply"; B3 widened the footprint to a marker-tagged source
      // instance owning ability_increase contributions and a child feat
      // source. This RECORD-ONLY path (the seam's `applyOrigin`) writes no
      // instance of its own — it has no choices to write one from — but it
      // must still remove the previous apply's, or a background change through
      // this path would leave increases from a background the character no
      // longer has: exactly the orphan D63's cascade exists to forbid.
      //
      // S-B widened the footprint AGAIN: the previous apply's source now owns
      // FILLED skill grants, which the hard delete just cascaded away — a
      // grant-changing path, so the projection is reconciled here (§3.2).
      // What this record-only path still does NOT do is mint grants of its
      // own: a grant requires a source instance and this path writes none —
      // the B3 apply (`applyGuidedBackgroundChoices`) is the producer.
      deleteGuidedBackgroundSources(db, characterId);
      rebuildSkillProjection(db, characterId);
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

    const template = gateInstalledSpecies(db, params.content_key);

    // Replace the previous apply's grant bridge first (A6): the marker finds
    // it without reference to the rows the statements below delete.
    const speciesSourceId = replaceGuidedLineageGrants(
      db,
      characterId,
      template,
    );

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
                speed_bonus_feet, ability, amount, maximum, base, ability_1,
                ability_2, allows_shield, weapon_scope, label, notes,
                created_at, updated_at
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
             ability, amount, maximum, base, ability_1, ability_2,
             allows_shield, weapon_scope,
             source_instance_id, template_ref, label, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            characterId,
            effectOrder,
            effect.effect_kind,
            effect.damage_type,
            effect.hit_points_flat,
            effect.hit_points_per_level,
            effect.speed_bonus_feet,
            effect.ability,
            effect.amount,
            effect.maximum,
            effect.base,
            effect.ability_1,
            effect.ability_2,
            effect.allows_shield,
            effect.weapon_scope,
            speciesSourceId,
            effect.template_ref,
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

/* ----------------------------------------- A6: the lineage-spell bridge */

/**
 * The `notes` marker naming a source instance the guided species apply owns.
 *
 * Ownership must be recorded, not inferred: the planner's expert commands can
 * also put species source instances on a character, and "any root species
 * source" as the replace target would delete rows this path never wrote. The
 * generator's own children use `notes` markers (`grant_rule:…`) the same way
 * and for the same reason.
 */

/**
 * Deletes one source instance AND its subtree, children first — necessary
 * because the parent foreign key is `ON DELETE SET NULL`, so deleting only
 * the root would silently orphan any granted children rather than remove
 * them. The rows that hang OFF each instance — `spell_selection_slots`,
 * sourced `character_effects` — cascade (`src/db/schema.sql`, both FKs are
 * `ON DELETE CASCADE`, and `PRAGMA foreign_keys = ON` is set at open).
 */
function deleteSourceInstanceTree(
  db: DatabaseContext,
  sourceInstanceId: number,
): void {
  const children = db.all(
    `SELECT id FROM character_source_instances
     WHERE parent_source_instance_id = ?`,
    [sourceInstanceId],
    rowId,
  );
  for (const childId of children) {
    deleteSourceInstanceTree(db, childId);
  }
  db.exec(`DELETE FROM character_source_instances WHERE id = ?`, [
    sourceInstanceId,
  ]);
}

/**
 * THE BRIDGE (dispatch A6, per D56). Three pieces, none of them new
 * machinery: the `species_definitions` rows are seeded at boot
 * (`src/rules/origin-definitions-srd.ts`), this writes the
 * `character_source_instances` row, and the EXISTING `GrantRuleSlotGenerator`
 * turns the definition's rules into spell-selection slots exactly as it does
 * for classes.
 *
 * WHAT ARRIVES TODAY, HONESTLY: only the rules that are unconditional — the
 * Tiefling's Thaumaturgy. Every other lineage spell is gated on the lineage
 * choice (`active_if_config` on the seeded rules), which nothing can record
 * yet: the seam's `applyOrigin` params carry no lineage, and the species
 * screen lists that choice as unmade. Granting a Drow's spells to an Elf who
 * never chose Drow would be a guess wearing a fact's clothes (D33), so the
 * dormant rules wait for the unit that records the choice, and the moment a
 * source config carries it the generator fires them with no further change
 * here.
 *
 * `config.class_level` IS REQUIRED, NOT DECORATION: the seeded level-3/5
 * rules are gated `active_from_class_level`, and for a non-class source
 * `SourceRuleReader.classLevelForSource` reads `class_level` from the
 * instance config — and THROWS if it is absent, which would fail the whole
 * apply. Guided creation is class-first at level 1, so 1 is exact here; the
 * level-up unit inherits the duty of maintaining it.
 *
 * NO DEFINITION IS A QUIET NO-OP, and that is correct rather than lenient:
 * only four species have definitions — the three lineage species, plus HUMAN
 * since S-B, whose row exists so this bridge mints the source instance the
 * Skillful skill grant hangs on (skills-with-provenance §3.4) — and a bundled
 * definition can also be legitimately absent when seeding yielded its name to
 * user-authored content. A species with no definition has no grants to bridge
 * — the template copy above is the whole apply, exactly as it was under A4.
 *
 * S-B WIDENED WHAT THE BRIDGE DELIVERS: `generateForSource` now runs the
 * generator's SPECIES SKILL ARM (`syncSpeciesSkillGrants`), so an Elf source
 * mints its unfilled Keen Senses grant and a Human source its unfilled
 * Skillful grant from the seam's `SPECIES_SKILL_GRANT_PLANS` — structured
 * obligations the skills step reports, not prose.
 */
function replaceGuidedLineageGrants(
  db: DatabaseContext,
  characterId: number,
  template: SpeciesTemplateRow,
): number {
  const previous = db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'species' AND notes = ?`,
    [characterId, GUIDED_SPECIES_SOURCE_MARKER],
    rowId,
  );
  for (const sourceInstanceId of previous) {
    deleteSourceInstanceTree(db, sourceInstanceId);
  }
  // S-B: the deleted tree's skill grants (Elf's Keen Senses, Human's
  // Skillful) just cascaded away — a grant-changing path, reconciled HERE,
  // before the no-definition early return below, so switching to a species
  // with no definition row cannot leave a stale projection row behind (§3.2).
  rebuildSkillProjection(db, characterId);

  const definitionId = db.one(
    `SELECT id FROM species_definitions WHERE content_key = ?`,
    [template.content_key],
    rowId,
  );
  const timestamp = new Date().toISOString();
  const instanceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state, notes,
       created_at, updated_at
     ) VALUES (?, ?, 'species', ?, ?, ?, 1, 'active', ?, ?, ?)`,
    [
      characterId,
      crypto.randomUUID(),
      definitionId,
      template.name,
      JSON.stringify({ class_level: 1 }),
      GUIDED_SPECIES_SOURCE_MARKER,
      timestamp,
      timestamp,
    ],
  ).lastInsertId;
  if (definitionId !== null) {
    new GrantRuleSlotGenerator(db).generateForSource(instanceId);
  }
  return instanceId;
}

/* ------------------------------- B3: background choices, per D61 and D63 */

/**
 * The `notes` marker naming a source instance the guided BACKGROUND apply
 * owns — {@link GUIDED_SPECIES_SOURCE_MARKER}'s twin, for the same reason:
 * ownership is recorded, not inferred, so the replace never deletes an
 * instance the planner's expert commands or a share import put there.
 *
 * EXPORTED since E-A: the equipment mint's record-only fallback
 * (`src/grants/equipment-grants.ts`) produces a background instance when the
 * seam's `applyOrigin` path recorded a background without one — the recorded
 * equipment CHOICE lives in a source instance's `config` and needs a row to
 * carry it — and that instance MUST carry this marker: an unmarked instance
 * would survive the next background change and leave a recorded choice from
 * a background the character no longer has. (Since D69 the instance owns
 * only the record; minted weapon and armour rows are the player's own and
 * survive the replace.) One string, one owner; the mint imports it rather
 * than spelling a second copy.
 */
export const GUIDED_BACKGROUND_SOURCE_MARKER = 'guided:background-apply';

/**
 * Hard-deletes every background source instance this path minted, with its
 * subtree: the child Origin-feat source goes recursively, and the
 * `ability_increase` contributions owned by any of them go by the composite
 * `(source_instance_id, character_id)` FK's ON DELETE CASCADE — the cascade
 * the plan says proves the replace. Same replace-not-tombstone semantic as
 * the species twin: re-applying means the earlier apply never happened.
 */
function deleteGuidedBackgroundSources(
  db: DatabaseContext,
  characterId: number,
): void {
  const previous = db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'background' AND notes = ?`,
    [characterId, GUIDED_BACKGROUND_SOURCE_MARKER],
    rowId,
  );
  for (const sourceInstanceId of previous) {
    deleteSourceInstanceTree(db, sourceInstanceId);
  }
}

/**
 * The background step's option data: every bundled or complete external
 * background with its printed pairing (the background's own DEFAULT, per
 * D61/D68 never a constraint), and every mechanically offerable installed
 * Origin feat the player may pick instead. Both carry the registry layer.
 */
export function listGuidedBackgroundChoiceOptions(
  db: DatabaseContext,
): GuidedBackgroundChoiceOptions {
  const backgrounds = db
    .all(
      `SELECT template.content_key, template.name, template.ability_score_1,
              template.ability_score_2, template.ability_score_3,
              template.feat_name, template.default_origin_feat_content_key,
              identity.catalog_layer
       FROM background_templates AS template
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'background'
        AND identity.content_key = template.content_key
       LEFT JOIN background_definitions AS definition
         ON definition.content_key = template.content_key
       WHERE identity.catalog_layer IS NULL
          OR identity.catalog_layer = 'bundled'
          OR definition.content_key IS NOT NULL
       ORDER BY template.name, template.content_key`,
      undefined,
      (row) => ({
        content_key: sqlString(row, 'content_key'),
        name: sqlString(row, 'name'),
        ability_score_1: sqlString(row, 'ability_score_1'),
        ability_score_2: sqlString(row, 'ability_score_2'),
        ability_score_3: sqlString(row, 'ability_score_3'),
        feat_name: sqlString(row, 'feat_name'),
        default_origin_feat_content_key: sqlNullableString(
          row,
          'default_origin_feat_content_key',
        ),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    )
    .map((template) => ({
      content_key: template.content_key,
      name: template.name,
      catalog_layer: template.catalog_layer,
      pairing: printedPairing(template),
    }));

  const originFeats = db.all(
    `SELECT feat.content_key, feat.name, feat.grant_rules,
            identity.catalog_layer
     FROM feat_definitions AS feat
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'feat'
      AND identity.content_key = feat.content_key
     WHERE feat.category = 'origin'
     ORDER BY feat.name, feat.content_key`,
    undefined,
    (row) => ({
      content_key: sqlString(row, 'content_key'),
      name: sqlString(row, 'name'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
      catalog_layer: sqlString(row, 'catalog_layer'),
    }),
  ).filter((feat) =>
    isGuidedOriginFeatOfferable(feat.catalog_layer, feat.grant_rules)
  ).map(({ content_key, name, catalog_layer }) => ({
    content_key,
    name,
    catalog_layer: catalogLayerDisclosure(catalog_layer),
  }));

  return { backgrounds, origin_feats: originFeats };
}

/**
 * The Origin-feat gate admits each mechanically offerable installed feat from
 * the same registry-backed list the picker displays. The seam's refusal
 * vocabulary is a CLOSED union with no feat-specific member, so an unavailable
 * key rides `unknown_origin`: the feat is part of applying the origin.
 */
function gateInstalledOriginFeat(
  db: DatabaseContext,
  contentKey: string,
): { readonly id: number; readonly name: string } {
  const feat = db.one(
    `SELECT feat.id, feat.name, feat.grant_rules, identity.catalog_layer
     FROM feat_definitions AS feat
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'feat'
      AND identity.content_key = feat.content_key
     WHERE feat.content_key = ? AND feat.category = 'origin'`,
    [contentKey],
    (row) => ({
      id: sqlInteger(row, 'id'),
      name: sqlString(row, 'name'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
      catalog_layer: sqlString(row, 'catalog_layer'),
    }),
  );
  if (
    feat === null ||
    !isGuidedOriginFeatOfferable(feat.catalog_layer, feat.grant_rules)
  ) {
    throw new GuidedCreationRefusal(
      'unknown_origin',
      `No installed Origin feat exists for content key "${contentKey}".`,
    );
  }
  return { id: feat.id, name: feat.name };
}

/**
 * The two printed skills, normalised from prose to verified `Skill` values
 * (S-B). The template columns hold PRINTED WORDS copied verbatim from the SRD
 * extract ("Insight", "Sleight of Hand"); `skillFromLabel` inverts the
 * display spellings the Skills table closed the vocabulary on. Failure is a
 * LOUD error, not a refusal and not a skipped grant: every bundled
 * background's prose must normalise, so an unrecognised value is a seed
 * defect to fix, and minting one skill of two would be a background that
 * looks applied with half of it missing.
 */
function backgroundSkillsFromTemplate(
  template: BackgroundTemplateRow,
): readonly [Skill, Skill] {
  const first = isEnumValue(skills, template.skill_proficiency_1)
    ? template.skill_proficiency_1
    : skillFromLabel(template.skill_proficiency_1);
  const second = isEnumValue(skills, template.skill_proficiency_2)
    ? template.skill_proficiency_2
    : skillFromLabel(template.skill_proficiency_2);
  if (first === null || second === null) {
    throw new Error(
      `The background "${template.name}" prints a skill the vocabulary ` +
        `does not know (${JSON.stringify(template.skill_proficiency_1)}, ` +
        `${JSON.stringify(template.skill_proficiency_2)}).`,
    );
  }
  return [first, second];
}

/**
 * THE B3 APPLY: background, player-assigned increases and player-chosen
 * Origin feat, ONE transaction (plan §4 B3).
 *
 * What one apply owns, and therefore what a replace removes: the
 * `character_background` row; a marker-tagged background SOURCE INSTANCE —
 * the owner D63's contributions require, minted here exactly as the species
 * bridge mints its own; the `ability_increase` rows that instance owns; and
 * the child Origin-feat source the EXISTING `GrantRuleSlotGenerator`
 * materialises from the seeded definition's one `grant_source` rule, reading
 * the chosen feat from the instance config — no parallel machinery. Changing
 * the background deletes that tree first, so the feat and the increases
 * cascade away with their owner and cannot outlive it.
 *
 * THE CAP IS 20: "None of these increases can raise a score above 20"
 * (`docs/srd/source/backgrounds.txt:51`), carried per contribution because
 * other sources genuinely differ (Epic Boons stop at 30).
 *
 * NO LABEL IS PERSISTED (D68): a chosen combination that differs from the
 * printed pairing is ordinary use, not a house rule, so the contributions'
 * `notes` stay null. The deviation sentence D61 used to persist here was
 * deleted with the ruling — see the D68 note in `background-choices.ts`.
 *
 * NO DEFINITION IS A REFUSAL HERE, NOT A QUIET NO-OP, and the difference from
 * the species bridge is deliberate: a species with no definition merely has
 * no spells to grant, but a background instance is what OWNS the increases —
 * the kind's CHECK requires a non-null source — so without the definition row
 * (its name slot yielded to user-authored content) the choices cannot be
 * recorded and pretending otherwise would ship a background that looks
 * applied with nothing behind it.
 */
export function applyGuidedBackgroundChoices(
  db: DatabaseContext,
  params: GuidedApplyBackgroundParams,
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

    const template = gateInstalledBackground(db, params.content_key);
    gateInstalledOriginFeat(db, params.origin_feat_content_key);
    const definitionId = db.one(
      `SELECT id FROM background_definitions WHERE content_key = ?`,
      [template.content_key],
      rowId,
    );
    if (definitionId === null) {
      throw new GuidedCreationRefusal(
        'unknown_origin',
        `The background "${template.name}" has no definition in this ` +
          'database, so its ability increases and Origin feat cannot be ' +
          'recorded with an owner.',
      );
    }

    // Replace: the previous apply's whole footprint, sources first (the
    // marker finds them without reference to the row the next statement
    // deletes), then the recorded text row.
    deleteGuidedBackgroundSources(db, characterId);
    db.exec(
      `DELETE FROM character_background WHERE character_id = ?`,
      [characterId],
    );
    const background = backgroundFromTemplate(template);
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

    // The owning instance. `class_level` for the reason the species bridge
    // records at length; the feat choice lives in config because that is the
    // path the seeded grant_source rule reads (`definition_key_config`), and
    // the config vocabulary is `add_source`'s existing one.
    const config: Record<string, unknown> = {
      class_level: 1,
      [ORIGIN_FEAT_KEY_CONFIG]: params.origin_feat_content_key,
    };
    if (Object.keys(params.origin_feat_config).length > 0) {
      config[ORIGIN_FEAT_CONFIG_CONFIG] = { ...params.origin_feat_config };
    }
    const timestamp = new Date().toISOString();
    const instanceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state, notes,
         created_at, updated_at
       ) VALUES (?, ?, 'background', ?, ?, ?, 1, 'active', ?, ?, ?)`,
      [
        characterId,
        crypto.randomUUID(),
        definitionId,
        template.name,
        JSON.stringify(config),
        GUIDED_BACKGROUND_SOURCE_MARKER,
        timestamp,
        timestamp,
      ],
    ).lastInsertId;

    // The contributions (D63): base is never touched; each increase is an
    // additive row that knows its source. Ordered after the character's
    // surviving effects, exactly as the species copy orders its own. No
    // `notes` label rides along — the player's own pairing is ordinary use,
    // never a house rule (D68).
    const baseOrder =
      db.one(
        `SELECT COALESCE(MAX(sort_order), 0) AS base
         FROM character_effects
         WHERE character_id = ?`,
        [characterId],
        (row) => sqlInteger(row, 'base'),
      ) ?? 0;
    let effectOrder = baseOrder;
    for (const increase of params.increases) {
      effectOrder += 1;
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, ability, amount, maximum,
           source_instance_id, label
         ) VALUES (?, ?, 'ability_increase', ?, ?, ?, ?, ?)`,
        [
          characterId,
          effectOrder,
          increase.ability,
          increase.amount,
          BACKGROUND_ABILITY_INCREASE_MAXIMUM,
          instanceId,
          `${template.name} (background increase)`,
        ],
      );
    }

    const templateEffects = db.all(
      `SELECT id, background_template_id, sort_order, effect_kind,
              damage_type, hit_points_flat, hit_points_per_level,
              speed_bonus_feet, ability, amount, maximum, base, ability_1,
              ability_2, allows_shield, weapon_scope, label, notes,
              created_at, updated_at
       FROM background_template_effects
       WHERE background_template_id = ?
       ORDER BY sort_order`,
      [template.id],
      backgroundTemplateEffectRow,
    );
    for (const effect of backgroundEffectsFromTemplate(templateEffects)) {
      effectOrder += 1;
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, damage_type,
           hit_points_flat, hit_points_per_level, speed_bonus_feet,
           ability, amount, maximum, base, ability_1, ability_2,
           allows_shield, weapon_scope, source_instance_id, template_ref,
           label, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId, effectOrder, effect.effect_kind, effect.damage_type,
          effect.hit_points_flat, effect.hit_points_per_level,
          effect.speed_bonus_feet, effect.ability, effect.amount,
          effect.maximum, effect.base, effect.ability_1, effect.ability_2,
          effect.allows_shield, effect.weapon_scope, instanceId,
          effect.template_ref, effect.label, effect.notes,
        ],
      );
    }

    // THE BACKGROUND'S TWO PRINTED SKILLS, AS FILLED GRANTS (S-B, §4): the
    // prose is normalised to VERIFIED `Skill` values — a background whose
    // printed skill the vocabulary does not know throws loudly rather than
    // minting a guess — and written under this apply's own source instance,
    // ordinals in printed order. §3.3's collision (a class ordinal already
    // filled with a skill the new background grants) refuses inside the mint
    // with the NAMED `skill_already_held`, rolling this whole transaction
    // back: silently unfilling a choice the person made is worse than saying
    // no, and refusing is right only because the fill command's null-selection
    // CLEAR exists.
    mintFilledSkillGrants(
      db,
      characterId,
      instanceId,
      SKILL_GRANT_KEYS.backgroundSkill,
      backgroundSkillsFromTemplate(template),
    );

    // The Origin feat, through the EXISTING machinery: the seeded
    // definition's grant_source rule resolves the config's feat key,
    // materialises the child feat source and recursively generates ITS
    // grants — Magic Initiate's spell slots arrive the same way they do on
    // the expert path.
    new GrantRuleSlotGenerator(db).generateForSource(instanceId);

    return {
      character_id: characterId,
      current_step: deriveBuildStep(readGuidedStepEvidence(db, characterId)),
    };
  });
}

/* --------------------------------------------- B1: the abilities step */

/**
 * The seam's `AbilityAllocationMethod` and the domain vocabulary
 * `abilityAllocationMethods` are the SAME closed set, proven at compile time
 * in both directions. The seam is supervisor-owned and cannot host the
 * runtime array; the schema CHECK and the payload validator read the domain
 * array; these two lines are what stop the pair drifting apart silently.
 */
type _Expect<T extends true> = T;
export type _AllocationMethodsMatchSeam = _Expect<
  [
    Exclude<AbilityAllocationMethod, KnownAbilityAllocationMethod>,
    Exclude<KnownAbilityAllocationMethod, AbilityAllocationMethod>,
  ] extends [never, never]
    ? true
    : never
>;
const _allocationMethodsAreTheSeams: readonly AbilityAllocationMethod[] =
  abilityAllocationMethods;
void _allocationMethodsAreTheSeams;

/**
 * ONE atomic allocation (plan §3.1): all six base scores AND the method land
 * together through the command executor — never six `update_ability` calls,
 * because partial allocation is not a state the wizard should be able to
 * produce. Riding the executor is what buys idempotent replay by
 * `operation_uuid`, the revision check, the audit entry — and the SNAPSHOT
 * inverse pinned in `prepareInverse`, so undo restores the signal with the
 * scores.
 *
 * WARNINGS ARE DATA IN THE RESULT, NEVER REFUSALS (D49, D64). Point buy and
 * manual entry warn; a result with fewer than two abilities at modifier +2 or
 * better warns via the seam's `hasWeakScores`. Every one of these journeys
 * SUCCEEDS — the signal is written and `current_step` advances — with the
 * warning travelling beside the result. All 10s is a VALID allocation, not an
 * error state. Nothing in this function can turn a warning into a block,
 * because the warnings are computed after the command has already committed.
 *
 * THE WEAKNESS WARNING FIRES ON THE RESULT, NOT THE METHOD: a weak standard
 * array assignment warns, a strong manual entry does not (it carries only the
 * method warning).
 */
export async function allocateGuidedAbilities(
  db: DatabaseContext,
  params: GuidedAllocateAbilitiesParams,
  integrity: CharacterCommandIntegrity,
): Promise<GuidedAllocateAbilitiesResult> {
  await new CharacterCommandExecutor(db, integrity).execute({
    character_id: params.character_id,
    operation_uuid: params.operation_uuid,
    expected_revision: params.expected_revision,
    command: {
      type: 'allocate_abilities',
      method: params.method,
      scores: params.scores,
    },
  });

  const warnings: GuidedAbilityWarning[] = [];
  if (params.method !== 'standard_array') {
    warnings.push({ kind: 'non_standard_method', method: params.method });
  }
  if (hasWeakScores(params.scores)) {
    warnings.push({
      kind: 'weak_scores',
      at_least_plus_two: countAbilitiesAtLeastPlusTwo(params.scores),
    });
  }

  return {
    character_id: params.character_id,
    current_step: deriveBuildStep(
      readGuidedStepEvidence(db, params.character_id),
    ),
    warnings,
  };
}

/* --------------------------------------------- S-B: the skills fill command */

/**
 * ONE fill (or clear) of one ADDRESSED grant, through the command executor —
 * the same ride `allocateGuidedAbilities` takes, and for the same reasons:
 * idempotent replay by `operation_uuid`, the revision check, the audit entry,
 * and an inverse (here a PRECISE one — the same command with the displaced
 * selection, prepared by the executor).
 *
 * All domain refusals — the seam's `SkillGrantRefusalReason` — are raised by
 * `fillSkillGrant` in `src/grants/skill-grants.ts` and thrown through here as
 * `SkillGrantRefusal` for the RPC handler to translate; this wrapper adds
 * only the executor envelope and the updated build position.
 */
/* --------------------------------------------- S-C: the skills step's read */

/**
 * Everything the guided skills step renders, in one query (seam:
 * `GuidedSkillsStepState`, `GUIDED_RPC.skillsStep`).
 *
 * ONE TRUTH, SHARED: the class choices are the resolver's
 * `unfilledClassGrants` and the species choices are
 * `unfilledSpeciesSkillGrants` — the same functions the completion predicate
 * and planner completeness read — so the step, the derivation and the
 * planner cannot disagree about what is outstanding (§5's trap is exactly
 * three surfaces with three predicates).
 *
 * THE D102 SKILL-OR-TOOL DISCLOSURE IS COMPUTED HERE, AS DATA:
 *
 *  - `unmodelled_tool_alternative_sources` — every ACTIVE source with an
 *    `allows_tool_instead` skill rule whose configured skill selections do
 *    not occupy every ordinal. Filled skill arms are ordinary durable grant
 *    rows; missing ordinals are not false owed-skill rows because they may be
 *    tools, which D102 deliberately leaves unmodelled.
 * Expertise is no longer a disclosure: GF-2 models it as sourced grant state
 * in the dedicated step that follows every skill source.
 */
function guidedSourceDisplay(
  db: DatabaseContext,
  sourceInstanceId: number,
): {
    readonly source_name: string;
    readonly source_catalog_layer: CatalogLayerDisclosure;
  } {
  const source = db.oneRaw(
    `SELECT source.display_name,
              identity.catalog_layer
       FROM character_source_instances AS source
       LEFT JOIN class_definitions AS class
         ON source.source_type = 'class'
        AND class.id = source.source_definition_id
       LEFT JOIN subclass_definitions AS subclass
         ON source.source_type = 'subclass'
        AND subclass.id = source.source_definition_id
       LEFT JOIN feat_definitions AS feat
         ON source.source_type = 'feat'
        AND feat.id = source.source_definition_id
       LEFT JOIN species_definitions AS species
         ON source.source_type = 'species'
        AND species.id = source.source_definition_id
       LEFT JOIN background_definitions AS background
         ON source.source_type = 'background'
        AND background.id = source.source_definition_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = source.source_type
        AND identity.content_key = COALESCE(
          class.content_key,
          subclass.content_key,
          feat.content_key,
          species.content_key,
          background.content_key
        )
     WHERE source.id = ?`,
    [sourceInstanceId],
  );
  return {
    source_name:
      source === null ? 'Unknown source' : String(source.display_name),
    source_catalog_layer: catalogLayerDisclosure(
      source === null || source.catalog_layer === null
        ? null
        : String(source.catalog_layer),
    ),
  };
}

export function guidedSkillsStepState(
  db: DatabaseContext,
  characterId: number,
): GuidedSkillsStepState {
  const revision = db.one(
    `SELECT revision FROM characters WHERE id = ?`,
    [characterId],
    (row) => sqlInteger(row, 'revision'),
  );
  if (revision === null) {
    throw new Error(`No character with id ${characterId} exists.`);
  }

  const resolved = resolveSkillGrants(db, characterId);

  const clearableKeys: readonly string[] = [
    SKILL_GRANT_KEYS.classSkill,
    SKILL_GRANT_KEYS.multiclassSkill,
    SKILL_GRANT_KEYS.speciesKeenSenses,
    SKILL_GRANT_KEYS.speciesSkillful,
  ];
  const granted = resolved.grants
    .filter(
      (grant): grant is typeof grant & { skill: Skill } =>
        grant.state === 'active' && grant.skill !== null,
    )
    .map((grant) => ({
      grant_id: grant.id,
      skill: grant.skill,
      grant_key: grant.grant_key,
      ...guidedSourceDisplay(db, grant.source_instance_id),
      // A background's printed skills are FACTS, not choices — shown, never
      // clearable here. The §3.3 collision's clear remedy targets the CHOICE
      // grants, which are exactly the fillable keys.
      clearable: clearableKeys.includes(grant.grant_key),
    }));

  const speciesChoices = unfilledSpeciesSkillGrants(db, characterId).map(
    (grant) => ({
      grant_id: grant.grant_id,
      grant_key: grant.grant_key,
      ...guidedSourceDisplay(db, grant.source_instance_id),
      available: grant.available,
    }),
  );

  const reader = new SourceRuleReader(db);
  const activeSourceIds = db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND state = 'active'
     ORDER BY id`,
    [characterId],
    rowId,
  );
  const unmodelledToolAlternativeSources: Array<
    ReturnType<typeof guidedSourceDisplay>
  > = [];
  for (const sourceInstanceId of activeSourceIds) {
    for (const rule of reader.activeRulesForSource(sourceInstanceId)) {
      if (rule.kind !== GrantRule.SKILL_PROFICIENCY) {
        continue;
      }
      const data = rule.toObject() as Readonly<Record<string, unknown>>;
      if (data['allows_tool_instead'] !== true) {
        continue;
      }
      const recorded = Number(
        db.scalar(
          `SELECT count(*) FROM character_skill_grants
           WHERE source_instance_id = ? AND grant_key = ?
             AND state = 'active' AND skill IS NOT NULL`,
          [sourceInstanceId, rule.ruleKey],
        ),
      );
      if (recorded < (rule.count ?? 0)) {
        unmodelledToolAlternativeSources.push(
          guidedSourceDisplay(db, sourceInstanceId),
        );
        break;
      }
    }
  }

  return {
    character_id: characterId,
    revision,
    granted,
    class_choices: resolved.unfilledClassGrants,
    species_choices: speciesChoices,
    unmodelled_tool_alternative_sources:
      unmodelledToolAlternativeSources,
  };
}

export async function fillGuidedSkillGrant(
  db: DatabaseContext,
  params: GuidedFillSkillGrantParams,
  integrity: CharacterCommandIntegrity,
): Promise<GuidedFillSkillGrantResult> {
  await new CharacterCommandExecutor(db, integrity).execute({
    character_id: params.character_id,
    operation_uuid: params.operation_uuid,
    expected_revision: params.expected_revision,
    command: {
      type: 'fill_skill_grant',
      grant_id: params.grant_id,
      skill: params.skill,
    },
  });

  return {
    character_id: params.character_id,
    current_step: deriveBuildStep(
      readGuidedStepEvidence(db, params.character_id),
    ),
  };
}

export function guidedExpertiseStepState(
  db: DatabaseContext,
  characterId: number,
): GuidedExpertiseStepState {
  reconcileCharacterSkillExpertise(db, characterId);
  const revision = Number(
    db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
  );
  const choices = resolveSkillExpertiseGrants(db, characterId)
    .filter((grant) => grant.state === 'active' && grant.skill === null)
    .map((grant) => {
      const source = guidedSourceDisplay(db, grant.source_instance_id);
      return {
        grant_id: grant.id,
        ...source,
        ordinal: grant.ordinal,
        available: availableSkillsForExpertiseGrant(
          db,
          characterId,
          grant,
        ),
      };
    });
  return { character_id: characterId, revision, choices };
}

export function fillGuidedExpertiseGrant(
  db: DatabaseContext,
  params: GuidedFillExpertiseGrantParams,
): { readonly character_id: number; readonly current_step: BuildStep } {
  db.transaction(() => {
    const revision = Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [
        params.character_id,
      ]),
    );
    if (revision !== params.expected_revision) {
      throw new Error('The character changed; reload this Expertise step.');
    }
    fillSkillExpertiseGrant(
      db,
      params.character_id,
      params.grant_id,
      params.skill,
    );
    db.exec(
      `UPDATE characters SET revision = revision + 1, updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), params.character_id],
    );
  });
  return {
    character_id: params.character_id,
    current_step: deriveBuildStep(
      readGuidedStepEvidence(db, params.character_id),
    ),
  };
}

export function guidedSpellsStepState(
  db: DatabaseContext,
  characterId: number,
): GuidedSpellsStepState {
  const revision = Number(
    db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
  );
  const slots = db.all(
    `SELECT slot.id, COALESCE(slot.label, slot.rule_key) AS label
     FROM spell_selection_slots AS slot
     INNER JOIN character_source_instances AS source
       ON source.id = slot.source_instance_id
      AND source.character_id = slot.character_id
     WHERE slot.character_id = ? AND source.state = 'active'
       AND slot.state = 'active' AND slot.is_locked = 0
       AND slot.fixed_spell_version_id IS NULL
       AND slot.current_spell_version_id IS NULL
     ORDER BY source.id, slot.sort_order, slot.ordinal`,
    [characterId],
    (row) => ({
      kind: 'slot_selection' as const,
      id: sqlInteger(row, 'id'),
      label: sqlString(row, 'label'),
    }),
  );
  const acquisitions = db.all(
    `SELECT entry.id,
            'Wizard spellbook spell ' || entry.ordinal AS label
     FROM wizard_spellbook_entries AS entry
     INNER JOIN character_source_instances AS source
       ON source.id = entry.source_instance_id
      AND source.character_id = entry.character_id
     WHERE entry.character_id = ? AND source.state = 'active'
       AND entry.state = 'active' AND entry.spell_version_id IS NULL
     ORDER BY source.id, entry.ordinal`,
    [characterId],
    (row) => ({
      kind: 'spellbook_acquisition' as const,
      id: sqlInteger(row, 'id'),
      label: sqlString(row, 'label'),
    }),
  );
  return {
    character_id: characterId,
    revision,
    choices: [...slots, ...acquisitions],
  };
}

export function assignGuidedSpell(
  db: DatabaseContext,
  params: GuidedAssignSpellParams,
): { readonly character_id: number; readonly current_step: BuildStep } {
  db.transaction(() => {
    const revision = Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [
        params.character_id,
      ]),
    );
    if (revision !== params.expected_revision) {
      throw new Error('The character changed; reload this spell step.');
    }
    if (params.address.kind === 'slot_selection') {
      assignSpellSelection(db, {
        address: { kind: 'slot_selection', id: params.address.id },
        character_id: params.character_id,
        spell_version_id: params.spell_version_id,
      });
    } else {
      assignSpellSelection(db, {
        address: {
          kind: 'spellbook_acquisition',
          id: params.address.id,
        },
        character_id: params.character_id,
        spell_version_id: params.spell_version_id,
      });
    }
    db.exec(
      `UPDATE characters SET revision = revision + 1, updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), params.character_id],
    );
  });
  return {
    character_id: params.character_id,
    current_step: deriveBuildStep(
      readGuidedStepEvidence(db, params.character_id),
    ),
  };
}

export function guidedEligibleSpells(
  db: DatabaseContext,
  params: GuidedEligibleSpellsParams,
): GuidedEligibleSpellsResult {
  const table =
    params.address.kind === 'slot_selection'
      ? 'spell_selection_slots'
      : 'wizard_spellbook_entries';
  const row = db.oneRaw(
    `SELECT spell_level_min, spell_level_max, allowed_spell_lists,
            allowed_schools, allowed_tags,
            ${params.address.kind === 'slot_selection' ? 'selection_collection' : 'NULL AS selection_collection'}
     FROM ${table}
     WHERE id = ? AND character_id = ?`,
    [params.address.id, params.character_id],
  );
  if (row === null) {
    throw new Error('That guided spell choice no longer exists.');
  }
  const eligible = new EligibleSpellSearch(db).searchConstraint(
    params.character_id,
    spellSelectionConstraint({
      spell_level_min: Number(row.spell_level_min),
      spell_level_max: Number(row.spell_level_max),
      allowed_spell_lists:
        row.allowed_spell_lists === null
          ? null
          : String(row.allowed_spell_lists),
      allowed_schools:
        row.allowed_schools === null ? null : String(row.allowed_schools),
      allowed_tags:
        row.allowed_tags === null ? null : String(row.allowed_tags),
      selection_collection:
        row.selection_collection === null
          ? null
          : String(row.selection_collection),
    }),
    params.query,
  );
  if (params.address.kind === 'slot_selection') {
    return eligible;
  }
  const held = new Set(
    db.all(
      `SELECT spell_version_id
       FROM wizard_spellbook_entries
       WHERE character_id = ? AND state = 'active'
         AND spell_version_id IS NOT NULL AND id <> ?`,
      [params.character_id, params.address.id],
      (candidate) => sqlInteger(candidate, 'spell_version_id'),
    ),
  );
  return eligible.filter((spell) => !held.has(spell.id));
}
