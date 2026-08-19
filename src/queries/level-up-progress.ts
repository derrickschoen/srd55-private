import {
  LEVEL_UP_STEP_ORDER,
  type LevelUpStep,
  type LevelUpWizardProgress,
  type SaveLevelUpWizardProgressParams,
} from '../builder/level-up-wizard';
import type { DatabaseContext } from '../db/database';
import type {
  CharacterRevision,
  ContentKey,
} from '../domain/ids';
import { CharacterNotFoundError } from './character-crud';

export const LEVEL_UP_WIZARD_PROGRESS_RULE_KEY =
  'level_up_wizard_progress_v1';

function isLevelUpStep(value: unknown): value is LevelUpStep {
  return typeof value === 'string' &&
    (LEVEL_UP_STEP_ORDER as readonly string[]).includes(value);
}

function progressValue(value: unknown): LevelUpWizardProgress | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (
    Object.keys(candidate).length !== 3 ||
    !Object.hasOwn(candidate, 'character_revision') ||
    !Object.hasOwn(candidate, 'selected_class_content_key') ||
    !Object.hasOwn(candidate, 'current_step') ||
    !Number.isSafeInteger(candidate['character_revision']) ||
    Number(candidate['character_revision']) < 0 ||
    typeof candidate['selected_class_content_key'] !== 'string' ||
    candidate['selected_class_content_key'].trim() === '' ||
    !isLevelUpStep(candidate['current_step'])
  ) {
    return null;
  }
  return {
    character_revision:
      Number(candidate['character_revision']) as CharacterRevision,
    selected_class_content_key:
      candidate['selected_class_content_key'] as ContentKey,
    current_step: candidate['current_step'],
  };
}

export function readLevelUpWizardProgress(
  db: DatabaseContext,
  characterId: number,
): LevelUpWizardProgress | null {
  const stored = db.scalar<string>(
    `SELECT value
       FROM character_rule_overrides
      WHERE character_id = ? AND rule_key = ?`,
    [characterId, LEVEL_UP_WIZARD_PROGRESS_RULE_KEY],
  );
  if (stored === null) return null;
  try {
    return progressValue(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveLevelUpWizardProgress(
  db: DatabaseContext,
  params: SaveLevelUpWizardProgressParams,
): LevelUpWizardProgress | null {
  const revision = db.scalar<number>(
    'SELECT revision FROM characters WHERE id = ?',
    [params.character_id],
  );
  if (revision === null) {
    throw new CharacterNotFoundError(params.character_id);
  }
  if (params.progress === null) {
    db.exec(
      `DELETE FROM character_rule_overrides
        WHERE character_id = ? AND rule_key = ?`,
      [params.character_id, LEVEL_UP_WIZARD_PROGRESS_RULE_KEY],
    );
    return null;
  }
  const progress = progressValue(params.progress);
  if (progress === null || progress.character_revision !== revision) {
    throw new TypeError(
      'Level-up wizard progress must match the current character revision.',
    );
  }
  db.exec(
    `INSERT INTO character_rule_overrides (
       character_id, rule_key, value, note, created_at, updated_at
     ) VALUES (?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(character_id, rule_key) DO UPDATE SET
       value = excluded.value,
       note = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [
      params.character_id,
      LEVEL_UP_WIZARD_PROGRESS_RULE_KEY,
      JSON.stringify(progress),
    ],
  );
  return progress;
}
