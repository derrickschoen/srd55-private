/**
 * GUIDED CREATION — build-state derivation (dispatch A1) and transactional
 * class-first materialisation (dispatch A2).
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
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterRow } from '../domain/models';
import { CharacterCrud } from '../queries/character-crud';
import { characterLevel } from '../rules/character-level';
import { bundledClassContentKeys } from '../rules/class-progression-lookup';
import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  type BuildStep,
  type GuidedBuildStateResult,
  type GuidedClassOption,
  type GuidedCreateParams,
  type GuidedRefusalReason,
} from './contracts';

/**
 * What the database can currently attest about a character's guided progress.
 *
 * A1 can distinguish exactly one thing: whether any class row exists.
 * `characterLevel()` returns null with no class rows (A12 in the plan), and
 * that null IS the class check — no separate query, so the two cannot drift.
 */
export interface GuidedStepEvidence {
  readonly classChosen: boolean;
}

/**
 * The first step the evidence cannot prove complete, in D55's order.
 *
 * Steps with no detection yet (`abilities`, `species`, `background`, `skills`,
 * `equipment`) are pinned incomplete, so the walk stops at the first of them —
 * for A1 that means: no class rows → `'class'`; class present → `'abilities'`.
 * The build screen renders those undetectable steps as the terminal
 * not-built-yet panel rather than pretending they can be finished here.
 */
export function deriveBuildStep(evidence: GuidedStepEvidence): BuildStep {
  const complete: Readonly<Record<BuildStep, boolean>> = {
    class: evidence.classChosen,
    abilities: false,
    species: false,
    background: false,
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
  return { classChosen: characterLevel(db, characterId) !== null };
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
