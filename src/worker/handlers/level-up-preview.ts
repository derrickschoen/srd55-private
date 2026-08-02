import {
  LEVEL_UP_RPC,
  type LevelUpPermanentWarning,
  type LevelUpPreviewParams,
  type LevelUpPreviewResult,
} from '../../builder/level-up-wizard';
import { CharacterCommandPreflight } from '../../commands/character-command-preflight';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import { canonicalJson } from '../../commands/canonical-json';
import type { DatabaseContext } from '../../db/database';
import { CharacterCompletenessQueries } from '../../queries/character-completeness';
import { CharacterSheetBuilder } from '../../queries/character-sheet-builder';
import {
  defineRpcHandler,
  isRecord,
  type RpcHandler,
} from '../handler';
import { characterCommandRpcError } from '../character-command-errors';
import { COMMAND_INTEGRITY_KEY } from './commands';

const LEVEL_UP_PREVIEW_ROLLBACK = new Error(
  'Rollback successful level-up preview.',
);

function exactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

export function isLevelUpPreviewParams(
  params: unknown,
): params is LevelUpPreviewParams {
  return (
    isRecord(params) &&
    exactKeys(params, ['character_id', 'expected_revision', 'command']) &&
    Number.isSafeInteger(params.character_id) &&
    Number(params.character_id) >= 1 &&
    Number.isSafeInteger(params.expected_revision) &&
    Number(params.expected_revision) >= 0 &&
    isRecord(params.command) &&
    (
      params.command.type === 'level_up_class' ||
      params.command.type === 'resolve_level_feat_choice'
    )
  );
}

function warningKey(warning: LevelUpPermanentWarning): string {
  return canonicalJson(warning);
}

function newOutstandingChoices(
  before: readonly LevelUpPermanentWarning[],
  after: readonly LevelUpPermanentWarning[],
): readonly LevelUpPermanentWarning[] {
  const existing = new Set(before.map(warningKey));
  return after.filter((warning) => !existing.has(warningKey(warning)));
}

/**
 * Applies the real merged command under one outer transaction and always
 * unwinds it with the module-private identity sentinel above.
 */
async function previewLevelUp(
  db: DatabaseContext,
  params: LevelUpPreviewParams,
): Promise<LevelUpPreviewResult> {
  const preflight = new CharacterCommandPreflight(
    db,
    new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
  );
  const prepared = await preflight.prepare(params);
  const before = new CharacterSheetBuilder(db).build(params.character_id);
  const beforeCompleteness = new CharacterCompletenessQueries(db).build(
    params.character_id,
  );
  let result: LevelUpPreviewResult | null = null;

  try {
    db.transaction(() => {
      preflight.assertExpectedRevision(params, prepared.payload);
      const applied = prepared.command.apply(params.character_id);
      if (applied instanceof Promise) {
        throw new Error(
          `Command ${prepared.payload.type} cannot preview asynchronously inside SQLite.`,
        );
      }
      const after = new CharacterSheetBuilder(db).build(params.character_id);
      const afterCompleteness = new CharacterCompletenessQueries(db).build(
        params.character_id,
      );
      result = {
        before,
        after,
        new_outstanding_choices: newOutstandingChoices(
          [...beforeCompleteness.items, ...beforeCompleteness.catalog_gaps],
          [...afterCompleteness.items, ...afterCompleteness.catalog_gaps],
        ),
        command_fingerprint: canonicalJson(prepared.payload),
      };
      throw LEVEL_UP_PREVIEW_ROLLBACK;
    });
  } catch (error) {
    if (error !== LEVEL_UP_PREVIEW_ROLLBACK) throw error;
  }

  if (result === null) {
    throw new Error('Level-up preview rolled back without a result.');
  }
  return result;
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    LEVEL_UP_RPC.preview,
    isLevelUpPreviewParams,
    async (context, params) => {
      try {
        return await previewLevelUp(context.db, params);
      } catch (error) {
        const translated = characterCommandRpcError(error);
        if (translated !== null) throw translated;
        throw error;
      }
    },
  ),
]);
