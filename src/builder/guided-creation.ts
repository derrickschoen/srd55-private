/**
 * GUIDED CREATION — build-state derivation (dispatch A1).
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

import { sqlInteger } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { characterLevel } from '../rules/character-level';
import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  type BuildStep,
  type GuidedBuildStateResult,
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
