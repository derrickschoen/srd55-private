import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import { blindTurnContextSchema } from './blind-turn-context';

export const BLIND_INGRESS_AUDIT_VERSION = 'blind-model-ingress-v1' as const;

export const BLIND_CONTEXT_TOP_LEVEL_KEYS = Object.freeze([
  'granularity',
  'dm_mode',
  'state_ref',
  'request',
  'round',
  'initiative',
  'roster',
  'semantic_board',
  'creature_facts',
  'legal_movement',
  'visuals',
  'intent_contract',
] as const);

const BLIND_CONTEXT_REQUIRED_TOP_LEVEL_KEYS = BLIND_CONTEXT_TOP_LEVEL_KEYS
  .filter((key) => key !== 'semantic_board');

export type BlindIngressChannel =
  | 'startup'
  | 'initial_prompt'
  | 'retry_prompt'
  | 'turn_context'
  | 'tools_list'
  | 'tool_result'
  | 'resources_list'
  | 'resource_templates'
  | 'resource_read'
  | 'prompts_list'
  | 'prompt_get'
  | 'kb_read'
  | 'replay_history'
  | 'image_metadata';

export interface BlindIngressRecord {
  readonly ordinal: number;
  readonly channel: BlindIngressChannel;
  readonly text: string;
  readonly utf8Bytes: number;
  readonly sha256: string;
}

export interface BlindIngressAuditSummary {
  readonly version: typeof BLIND_INGRESS_AUDIT_VERSION;
  readonly stringCount: number;
  readonly utf8Bytes: number;
  readonly sha256: string;
  readonly passed: true;
}

export interface BlindIngressScanOracle {
  readonly offeredOptionIds?: readonly string[];
  readonly requiredText?: readonly string[];
}

const FORBIDDEN_ENGINE_PROTOCOL_KEYS = Object.freeze([
  'options',
  'option_id',
  'option_ref',
  'option_index',
  'option_order',
  'option_count',
  'options_omitted_for_size',
  'suggested_plan',
  'team_plan_frontier',
  'opportunity_cost',
  'movement_candidates',
  'engine_default_option_id',
  'top_recommendation',
  'rank',
  'score',
  'scores',
  'intel',
  'tactical_intel',
  'threats',
  'adverts',
  'plays',
  'applicable_plays',
  'applicable_skills',
  'consequence_cards',
] as const);

const FORBIDDEN_ADVICE_TEXT = Object.freeze([
  'top recommendation',
  'suggested plan',
  'team plan frontier',
  'engine default option',
  'movement candidate score',
  'path_cells',
] as const);

const FORBIDDEN_SURFACE_NAMES = Object.freeze([
  'engine.query_tactical_intel',
  'engine.propose_from_play',
  'engine.load_skill',
  'engine.validate_proposal',
  'engine.submit_round_proposals',
  'engine.submit_plan_adjustment',
  'engine.submit_speculative_round_plan',
  'engine.get_state_summary',
  'engine.get_combatant_options',
  'engine.query_path',
  'engine.query_reach',
  'engine.query_cover',
  'engine.query_visibility',
  'engine.query_dice_expectation',
  'engine.plan_round',
  'engine.correct_proposal',
  '/schema/turn-proposal-v1',
  '/room/current',
  '/journal/',
] as const);

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

export function assertBlindTurnContextAllowlist(value: unknown): void {
  blindTurnContextSchema.parse(value);
  const context = recordValue(value);
  if (context === null) throw new TypeError('Blind turn context must be an object.');
  const actual = Object.keys(context).sort();
  const expected = [
    ...BLIND_CONTEXT_REQUIRED_TOP_LEVEL_KEYS,
    ...(context['semantic_board'] === undefined ? [] : ['semantic_board'] as const),
  ].sort();
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new TypeError(`Blind turn context keys are not allowlisted: ${canonicalJson(actual)}.`);
  }
  if (context['granularity'] !== 'full' || context['dm_mode'] !== 'blind') {
    throw new TypeError('Blind turn context must be a full blind projection.');
  }
  const semantic = context['semantic_board'] === undefined
    ? undefined
    : recordValue(context['semantic_board']);
  if (semantic === null || semantic !== undefined && 'reach_range_summaries' in semantic) {
    throw new TypeError('Blind semantic board, when enabled, must omit reach_range_summaries.');
  }
}

export function assertBlindTurnContextsValid(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) assertBlindTurnContextsValid(entry);
    return;
  }
  const candidate = recordValue(value);
  if (candidate === null) return;
  if (candidate['dm_mode'] === 'blind') blindTurnContextSchema.parse(candidate);
  for (const entry of Object.values(candidate)) assertBlindTurnContextsValid(entry);
}

function forbiddenStructuralPaths(value: unknown, path = '$'): readonly string[] {
  if (path.includes('.creature_facts.statblocks.')) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => forbiddenStructuralPaths(entry, `${path}[${String(index)}]`));
  }
  const candidate = recordValue(value);
  if (candidate === null) return [];
  return Object.entries(candidate).flatMap(([key, entry]) => [
    ...(FORBIDDEN_ENGINE_PROTOCOL_KEYS.includes(key as (typeof FORBIDDEN_ENGINE_PROTOCOL_KEYS)[number])
      ? [`${path}.${key}`]
      : []),
    ...forbiddenStructuralPaths(entry, `${path}.${key}`),
  ]);
}

export function assertBlindIngressSafe(
  records: readonly BlindIngressRecord[],
  oracle: BlindIngressScanOracle = {},
): BlindIngressAuditSummary {
  if (records.length === 0) throw new TypeError('Blind ingress audit cannot pass with no recorded input.');
  const joined = records.map((record) => record.text).join('\n');
  const lower = joined.toLowerCase();
  const forbidden = [
    ...FORBIDDEN_SURFACE_NAMES.filter((name) => lower.includes(name.toLowerCase())),
    ...FORBIDDEN_ADVICE_TEXT.filter((text) => lower.includes(text)),
    ...(oracle.offeredOptionIds ?? []).filter((id) => id.length > 0 && joined.includes(id)),
  ];
  if (forbidden.length > 0) {
    throw new TypeError(`Blind model ingress contains forbidden recommendation bytes: ${forbidden.join(', ')}.`);
  }
  for (const expected of oracle.requiredText ?? []) {
    if (!joined.includes(expected)) {
      throw new TypeError(`Blind model ingress omitted required bytes: ${expected}.`);
    }
  }
  return {
    version: BLIND_INGRESS_AUDIT_VERSION,
    stringCount: records.length,
    utf8Bytes: records.reduce((total, record) => total + record.utf8Bytes, 0),
    sha256: sha256(records.map((record) =>
      `${String(record.ordinal)}\0${record.channel}\0${record.text}`).join('\n')),
    passed: true,
  };
}

export class BlindModelIngressRecorder {
  readonly #records: BlindIngressRecord[];

  constructor(
    initialRecords: readonly BlindIngressRecord[] = [],
    private readonly onRecord?: (record: BlindIngressRecord) => void,
  ) {
    this.#records = initialRecords.map((record) => ({ ...record }));
  }

  record(channel: BlindIngressChannel, text: string): void {
    const ordinal = this.#records.length + 1;
    const record = Object.freeze({
      ordinal,
      channel,
      text,
      utf8Bytes: utf8Bytes(text),
      sha256: sha256(text),
    });
    this.#records.push(record);
    this.onRecord?.(record);
  }

  recordJson(channel: BlindIngressChannel, value: unknown): void {
    assertBlindTurnContextsValid(value);
    assertNoForbiddenBlindStructure(value);
    this.record(channel, canonicalJson(value));
  }

  records(): readonly BlindIngressRecord[] {
    return this.#records.map((record) => ({ ...record }));
  }

  assertSafe(oracle: BlindIngressScanOracle = {}): BlindIngressAuditSummary {
    return assertBlindIngressSafe(this.#records, oracle);
  }
}

export function blindIngressChannelForMcpMethod(method: string): BlindIngressChannel | null {
  switch (method) {
    case 'tools/list': return 'tools_list';
    case 'tools/call': return 'tool_result';
    case 'resources/list': return 'resources_list';
    case 'resources/templates/list': return 'resource_templates';
    case 'resources/read': return 'resource_read';
    case 'prompts/list': return 'prompts_list';
    case 'prompts/get': return 'prompt_get';
    default: return null;
  }
}

export function assertNoForbiddenBlindStructure(value: unknown): void {
  const paths = forbiddenStructuralPaths(value);
  if (paths.length > 0) {
    throw new TypeError(`Blind structure contains recommendation fields: ${paths.join(', ')}.`);
  }
}
