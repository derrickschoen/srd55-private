import { CharacterCommandIntegrity } from '../../commands/integrity';
import { EligibleSpellSearch } from '../../eligibility/eligible-spell-search';
import { CatalogQueries } from '../../queries/catalog-queries';
import {
  CharacterCompletenessQueries,
} from '../../queries/character-completeness';
import { CharacterCrud } from '../../queries/character-crud';
import { CharacterListBuilder } from '../../queries/character-list-builder';
import { CharacterSheetBuilder } from '../../queries/character-sheet-builder';
import {
  CharacterWorkspaceBuilder,
} from '../../queries/character-workspace-builder';
import {
  OperationHistoryQueries,
} from '../../queries/operation-history';
import { SavePointQueries } from '../../queries/save-points';
import { LevelUpPlannedEligibleSpells } from '../../queries/level-up-planned-eligible-spells';
import type {
  LevelUpPlannedEligibleSpellsParams,
  PlannedGrantSource,
} from '../../builder/level-up-wizard';
import { BuildReportBuilder } from '../../reports/build-report-builder';
import {
  PrintableSpellListBuilder,
} from '../../reports/printable-spell-list-builder';
import { COMMAND_INTEGRITY_KEY } from './commands';
import {
  defineRpcHandler,
  isEmptyParams,
  isRecord,
  type RpcHandler,
} from '../handler';
import { abilities, isEnumValue } from '../../domain/enums';

interface CharacterParams {
  readonly character_id: number;
}

interface EligibleSpellParams extends CharacterParams {
  readonly slot_id: number;
  readonly query: string;
}

interface CreateSavePointParams extends CharacterParams {
  readonly label: string;
}

interface SavePointCommandParams extends CharacterParams {
  readonly save_point_id: number;
}

interface PrintableParams extends CharacterParams {
  readonly variant: 'reference' | 'full';
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function plannedGrantSource(
  value: unknown,
): value is PlannedGrantSource {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }
  if (value.kind === 'existing_source') {
    return (
      exactKeys(value, ['kind', 'source_instance_id']) &&
      positiveInteger(value.source_instance_id)
    );
  }
  return (
    (value.kind === 'selected_class' ||
      value.kind === 'selected_class_subclass' ||
      value.kind === 'selected_feat') &&
    exactKeys(value, ['kind'])
  );
}

export function isLevelUpPlannedEligibleSpellsParams(
  params: unknown,
): params is LevelUpPlannedEligibleSpellsParams {
  if (
    !isRecord(params) ||
    !['character_id', 'expected_revision', 'class_definition_id',
      'target_class_level', 'locator', 'query'].every((key) =>
      Object.hasOwn(params, key),
    ) ||
    Object.keys(params).some((key) => ![
      'character_id',
      'expected_revision',
      'class_definition_id',
      'target_class_level',
      'subclass_content_key',
      'feat_choice',
      'locator',
      'query',
    ].includes(key)) ||
    !positiveInteger(params.character_id) ||
    !Number.isSafeInteger(params.expected_revision) ||
    Number(params.expected_revision) < 0 ||
    !positiveInteger(params.class_definition_id) ||
    !positiveInteger(params.target_class_level) ||
    Number(params.target_class_level) > 20 ||
    typeof params.query !== 'string' ||
    !isRecord(params.locator) ||
    !exactKeys(params.locator, ['source', 'rule_key', 'ordinal'])
  ) {
    return false;
  }
  if (
    Object.hasOwn(params, 'subclass_content_key') &&
    (typeof params.subclass_content_key !== 'string' ||
      params.subclass_content_key.trim() === '')
  ) {
    return false;
  }
  if (Object.hasOwn(params, 'feat_choice')) {
    const feat = params.feat_choice;
    if (
      !isRecord(feat) ||
      !exactKeys(feat, [
        'kind',
        'feat_content_key',
        'config',
        'ability_increases',
      ]) ||
      feat.kind !== 'feat' ||
      typeof feat.feat_content_key !== 'string' ||
      feat.feat_content_key.trim() === '' ||
      !isRecord(feat.config) ||
      !Array.isArray(feat.ability_increases) ||
      feat.ability_increases.length > 2 ||
      !feat.ability_increases.every(
        (value) =>
          isRecord(value) &&
          exactKeys(value, ['ability', 'amount']) &&
          isEnumValue(abilities, value.ability) &&
          Number.isSafeInteger(value.amount) &&
          Number(value.amount) >= 1 &&
          Number(value.amount) <= 2,
      )
    ) {
      return false;
    }
  }
  return (
    plannedGrantSource(params.locator.source) &&
    typeof params.locator.rule_key === 'string' &&
    params.locator.rule_key.trim() !== '' &&
    positiveInteger(params.locator.ordinal)
  );
}

export function isCharacterParams(
  params: unknown,
): params is CharacterParams {
  return (
    isRecord(params) &&
    exactKeys(params, ['character_id']) &&
    positiveInteger(params.character_id)
  );
}

export function isCreateCharacterParams(
  params: unknown,
): params is { name: string } {
  return (
    isRecord(params) &&
    exactKeys(params, ['name']) &&
    typeof params.name === 'string' &&
    params.name.trim() !== '' &&
    [...params.name].length <= 120
  );
}

export function isEligibleSpellParams(
  params: unknown,
): params is EligibleSpellParams {
  return (
    isRecord(params) &&
    exactKeys(params, ['character_id', 'slot_id', 'query']) &&
    positiveInteger(params.character_id) &&
    positiveInteger(params.slot_id) &&
    typeof params.query === 'string'
  );
}

export function isCreateSavePointParams(
  params: unknown,
): params is CreateSavePointParams {
  return (
    isRecord(params) &&
    exactKeys(params, ['character_id', 'label']) &&
    positiveInteger(params.character_id) &&
    typeof params.label === 'string' &&
    params.label.trim() !== '' &&
    [...params.label].length <= 120
  );
}

export function isSavePointCommandParams(
  params: unknown,
): params is SavePointCommandParams {
  return (
    isRecord(params) &&
    exactKeys(params, ['character_id', 'save_point_id']) &&
    positiveInteger(params.character_id) &&
    positiveInteger(params.save_point_id)
  );
}

export function isPrintableParams(
  params: unknown,
): params is PrintableParams {
  return (
    isRecord(params) &&
    exactKeys(params, ['character_id', 'variant']) &&
    positiveInteger(params.character_id) &&
    (params.variant === 'reference' || params.variant === 'full')
  );
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'queries.characters.list',
    isEmptyParams,
    (context) => new CharacterListBuilder(context.db).build(),
  ),
  defineRpcHandler(
    'queries.characters.get',
    isCharacterParams,
    (context, params) =>
      new CharacterCrud(context.db).get(params.character_id),
  ),
  defineRpcHandler(
    'queries.characters.create',
    isCreateCharacterParams,
    (context, params) =>
      new CharacterCrud(context.db).create(params),
  ),
  defineRpcHandler(
    'queries.characters.delete',
    isCharacterParams,
    (context, params) =>
      new CharacterCrud(context.db).delete(params.character_id),
  ),
  defineRpcHandler(
    'queries.characters.workspace',
    isCharacterParams,
    (context, params) =>
      new CharacterWorkspaceBuilder(context.db).build(
        params.character_id,
      ),
  ),
  defineRpcHandler(
    'queries.characters.completeness',
    isCharacterParams,
    (context, params) =>
      new CharacterCompletenessQueries(context.db).build(
        params.character_id,
      ),
  ),
  defineRpcHandler(
    'queries.characters.outstanding',
    isEmptyParams,
    (context) => new CharacterCompletenessQueries(context.db).counts(),
  ),
  defineRpcHandler(
    'queries.catalog.read',
    isEmptyParams,
    (context) => new CatalogQueries(context.db).read(),
  ),
  defineRpcHandler(
    'queries.eligibleSpells.search',
    isEligibleSpellParams,
    (context, params) =>
      new EligibleSpellSearch(context.db).search(
        params.character_id,
        params.slot_id,
        params.query.trim(),
      ),
  ),
  defineRpcHandler(
    'queries.characters.levelUpPlannedEligibleSpells',
    isLevelUpPlannedEligibleSpellsParams,
    (context, params) =>
      new LevelUpPlannedEligibleSpells(context.db).search(params),
  ),
  defineRpcHandler(
    'queries.savePoints.create',
    isCreateSavePointParams,
    (context, params) => {
      new SavePointQueries(context.db).create(
        params.character_id,
        params.label,
      );
      return new CharacterWorkspaceBuilder(context.db).build(
        params.character_id,
      );
    },
  ),
  defineRpcHandler(
    'queries.savePoints.restoreCommand',
    isSavePointCommandParams,
    (context, params) =>
      new SavePointQueries(context.db).restoreCommand(
        params.character_id,
        params.save_point_id,
        new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
      ),
  ),
  defineRpcHandler(
    'queries.characters.sheet',
    isCharacterParams,
    (context, params) =>
      new CharacterSheetBuilder(context.db).build(params.character_id),
  ),
  defineRpcHandler(
    'queries.reports.build',
    isCharacterParams,
    (context, params) =>
      new BuildReportBuilder(context.db).build(params.character_id),
  ),
  defineRpcHandler(
    'queries.reports.printable',
    isPrintableParams,
    (context, params) =>
      new PrintableSpellListBuilder(context.db).build(
        params.character_id,
        params.variant === 'full',
      ),
  ),
  defineRpcHandler(
    'queries.history.read',
    isCharacterParams,
    (context, params) =>
      new OperationHistoryQueries(context.db).read(
        params.character_id,
      ),
  ),
]);
