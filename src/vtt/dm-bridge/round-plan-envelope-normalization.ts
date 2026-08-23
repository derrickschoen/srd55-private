import type { CombatantId, EncounterSessionId } from '../../combat/values';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  type RoundPlanSurface,
} from './round-plan-contract';

export const ROUND_PLAN_ENVELOPE_NORMALIZATION_RULES = [
  'missing_envelope_fields',
  'programs_collection',
  'plans_collection',
  'combatant_keyed_object',
  'single_program',
  'monster_entry_aliases',
] as const;

export type RoundPlanEnvelopeNormalizationRule =
  (typeof ROUND_PLAN_ENVELOPE_NORMALIZATION_RULES)[number];

export interface RoundPlanEnvelopeNormalizationContext {
  readonly surface: RoundPlanSurface;
  readonly encounterId: EncounterSessionId;
  readonly requestId: string;
  readonly expectedRevision: number;
  readonly round: number;
  readonly requestedMonsterIds: readonly CombatantId[];
}

export interface RoundPlanEnvelopeNormalizationResult {
  readonly value: unknown;
  readonly rule: RoundPlanEnvelopeNormalizationRule | null;
}

const ENVELOPE_IDENTITY_FIELDS = [
  'protocolVersion',
  'encounterId',
  'requestId',
  'expectedRevision',
  'round',
] as const;

const OBSERVED_ENVELOPE_KINDS = new Set([
  'decision_program',
  'js_program',
  'round_plan',
  'round_plan_response',
]);

const PROGRAM_FIELD_ALIASES = ['program', 'source', 'code', 'sourceCode'] as const;
const BARE_PROGRAM_FIELD_ALIASES = [...PROGRAM_FIELD_ALIASES, 'plan'] as const;
const MONSTER_ID_FIELD_ALIASES = ['monsterId', 'combatantId', 'actorId'] as const;

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function canonicalKind(surface: RoundPlanSurface): 'round_plan' | 'js_round_plan' {
  return surface === 'json_ast' ? 'round_plan' : 'js_round_plan';
}

function canonicalProgramField(surface: RoundPlanSurface): 'program' | 'source' {
  return surface === 'json_ast' ? 'program' : 'source';
}

function aliasPresent(
  input: UnknownRecord,
  aliases: readonly string[],
): string | null {
  const present = aliases.filter((alias) => hasOwn(input, alias));
  return present.length === 1 ? present[0] ?? null : null;
}

function normalizeEntry(
  value: unknown,
  surface: RoundPlanSurface,
  keyedMonsterId?: string,
): { readonly value: unknown; readonly changed: boolean } {
  const programField = canonicalProgramField(surface);
  if (!isRecord(value)) {
    if (keyedMonsterId === undefined) return { value, changed: false };
    return {
      value: { monsterId: keyedMonsterId, [programField]: value },
      changed: true,
    };
  }

  const input = { ...value };
  const idAlias = keyedMonsterId === undefined
    ? aliasPresent(input, MONSTER_ID_FIELD_ALIASES)
    : null;
  const sourceAlias = aliasPresent(input, PROGRAM_FIELD_ALIASES);
  let changed = false;

  if (keyedMonsterId !== undefined) {
    if (!hasOwn(input, 'monsterId')) {
      input.monsterId = keyedMonsterId;
      changed = true;
    }
  } else if (idAlias !== null && idAlias !== 'monsterId') {
    input.monsterId = input[idAlias];
    delete input[idAlias];
    changed = true;
  }

  if (sourceAlias !== null && sourceAlias !== programField) {
    input[programField] = input[sourceAlias];
    delete input[sourceAlias];
    changed = true;
  }
  return { value: input, changed };
}

function normalizeCollection(
  value: unknown,
  surface: RoundPlanSurface,
): { readonly value: unknown; readonly entriesChanged: boolean } {
  if (Array.isArray(value)) {
    let entriesChanged = false;
    const normalized = value.map((entry) => {
      const result = normalizeEntry(entry, surface);
      entriesChanged ||= result.changed;
      return result.value;
    });
    return { value: normalized, entriesChanged };
  }
  if (isRecord(value)) {
    return {
      value: Object.entries(value).map(([monsterId, entry]) =>
        normalizeEntry(entry, surface, monsterId).value),
      entriesChanged: true,
    };
  }
  return { value, entriesChanged: false };
}

function fillEnvelope(
  input: UnknownRecord,
  context: RoundPlanEnvelopeNormalizationContext,
): { readonly value: UnknownRecord; readonly changed: boolean } {
  const output: Record<string, unknown> = { ...input };
  const expected = {
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: context.encounterId,
    requestId: context.requestId,
    expectedRevision: context.expectedRevision,
    round: context.round,
  } as const;
  let changed = false;
  for (const field of ENVELOPE_IDENTITY_FIELDS) {
    if (!hasOwn(output, field)) {
      output[field] = expected[field];
      changed = true;
    }
  }
  const expectedKind = canonicalKind(context.surface);
  if (!hasOwn(output, 'kind')) {
    output.kind = expectedKind;
    changed = true;
  } else if (typeof output.kind === 'string' && OBSERVED_ENVELOPE_KINDS.has(output.kind)) {
    if (output.kind !== expectedKind) changed = true;
    output.kind = expectedKind;
  }
  return { value: output, changed };
}

function bareProgramAlias(input: UnknownRecord): string | null {
  return aliasPresent(input, BARE_PROGRAM_FIELD_ALIASES);
}

function assertSingleMonsterAssociation(context: RoundPlanEnvelopeNormalizationContext): CombatantId {
  const [onlyMonster] = context.requestedMonsterIds;
  if (context.requestedMonsterIds.length !== 1 || onlyMonster === undefined) {
    throw new TypeError(
      `Bare single-program reply cannot be associated with multiple requested monsters; programs were required for ${context.requestedMonsterIds.join(', ')}.`,
    );
  }
  return onlyMonster;
}

/**
 * Repairs only reply envelopes observed in E05 run 3. Canonical structural and
 * identity validation still runs after this function; present identity values
 * are deliberately retained so stale replies remain refusals.
 */
export function normalizeRoundPlanEnvelope(
  value: unknown,
  context: RoundPlanEnvelopeNormalizationContext,
): RoundPlanEnvelopeNormalizationResult {
  if (!isRecord(value)) return { value, rule: null };

  let input: UnknownRecord = value;
  let rule: RoundPlanEnvelopeNormalizationRule | null = null;
  let entriesChanged = false;

  const hasMonsters = hasOwn(input, 'monsters');
  const hasPrograms = hasOwn(input, 'programs');
  const hasPlans = hasOwn(input, 'plans');
  if (Number(hasMonsters) + Number(hasPrograms) + Number(hasPlans) === 1) {
    const collectionField = hasMonsters ? 'monsters' : hasPrograms ? 'programs' : 'plans';
    const collection = normalizeCollection(input[collectionField], context.surface);
    const output: Record<string, unknown> = { ...input, monsters: collection.value };
    if (collectionField !== 'monsters') delete output[collectionField];
    input = output;
    entriesChanged = collection.entriesChanged;
    rule = collectionField === 'programs'
      ? 'programs_collection'
      : collectionField === 'plans'
        ? 'plans_collection'
        : entriesChanged ? 'monster_entry_aliases' : null;
  } else if (
    Object.keys(input).length > 0 &&
    Object.keys(input).every((key) => key.startsWith('combatant:'))
  ) {
    input = {
      monsters: Object.entries(input).map(([monsterId, entry]) =>
        normalizeEntry(entry, context.surface, monsterId).value),
    };
    rule = 'combatant_keyed_object';
  } else {
    const programAlias = bareProgramAlias(input);
    if (programAlias !== null) {
      const monsterId = assertSingleMonsterAssociation(context);
      const output: Record<string, unknown> = { ...input };
      const program = output[programAlias];
      delete output[programAlias];
      output.monsters = [{
        monsterId,
        [canonicalProgramField(context.surface)]: program,
      }];
      input = output;
      rule = 'single_program';
    }
  }

  const filled = fillEnvelope(input, context);
  if (rule === null && filled.changed) rule = 'missing_envelope_fields';
  return { value: filled.value, rule };
}
