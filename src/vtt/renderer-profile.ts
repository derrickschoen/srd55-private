import { z } from 'zod';
import type { EncounterState } from '../combat/encounter';
import { gridDistance } from '../combat/grid';
import { BUNDLED_MONSTER_ROSTER } from '../combat/statblocks/roster';
import type { EngineStateCapsule } from './engine-state-capsule';

export const RENDERER_POLICY_VERSION = 'turn-context-renderer-v1' as const;

export const rendererProfileSchema = z.strictObject({
  delta: z.enum(['path_granular', 'guarded', 'off']),
  anchor: z.enum(['full', 'hash_only']),
  rows: z.enum(['full', 'best_exception', 'top_target', 'off']),
  slots: z.enum(['full', 'sparse']),
  opportunityCost: z.enum(['full', 'conditional', 'status_ids']),
  threats: z.enum(['full', 'counts_exception_ids']),
  ids: z.enum(['full', 'short_refs']),
  status: z.enum(['full', 'sparse']),
  movement: z.enum(['always', 'material_only']),
  labels: z.enum(['always', 'derivable']),
  frontier: z.enum(['full', 'candidates_summary', 'off']),
  knowledge: z.enum(['full', 'relevance_gated']),
  failures: z.enum(['full', 'headline_codes']),
  adverts: z.enum(['full', 'stubs']),
  rare: z.enum(['always', 'triggered']),
  misc: z.enum(['separate', 'merged']),
  shortlist: z.enum(['all', 'k3', 'k2']),
  optionDetail: z.enum(['full', 'top2_stubs']),
});

export type RendererProfile = z.infer<typeof rendererProfileSchema>;

export const DEFAULT_RENDERER_PROFILE: RendererProfile = Object.freeze({
  delta: 'path_granular',
  anchor: 'full',
  rows: 'full',
  slots: 'full',
  opportunityCost: 'full',
  threats: 'full',
  ids: 'full',
  status: 'full',
  movement: 'always',
  labels: 'always',
  frontier: 'full',
  knowledge: 'full',
  failures: 'full',
  adverts: 'full',
  rare: 'always',
  misc: 'separate',
  shortlist: 'all',
  optionDetail: 'full',
});

export const PLANNED_COMBINED_RENDERER_PROFILES = Object.freeze({
  conservative: rendererProfileSchema.parse({
    ...DEFAULT_RENDERER_PROFILE,
    delta: 'guarded', rows: 'best_exception', opportunityCost: 'conditional',
    movement: 'material_only', frontier: 'candidates_summary', knowledge: 'relevance_gated',
    failures: 'headline_codes', adverts: 'stubs', rare: 'triggered', status: 'sparse',
    labels: 'derivable',
  }),
  compact: rendererProfileSchema.parse({
    ...DEFAULT_RENDERER_PROFILE,
    delta: 'guarded', anchor: 'hash_only', rows: 'top_target', slots: 'sparse',
    opportunityCost: 'status_ids', threats: 'counts_exception_ids', ids: 'short_refs',
    status: 'sparse', movement: 'material_only', labels: 'derivable', frontier: 'candidates_summary',
    knowledge: 'relevance_gated', failures: 'headline_codes', adverts: 'stubs', rare: 'triggered',
    misc: 'merged', shortlist: 'k3', optionDetail: 'top2_stubs',
  }),
  minimum_safe: rendererProfileSchema.parse({
    ...DEFAULT_RENDERER_PROFILE,
    delta: 'off', anchor: 'hash_only', rows: 'off', slots: 'sparse',
    opportunityCost: 'status_ids', threats: 'counts_exception_ids', ids: 'short_refs',
    status: 'sparse', movement: 'material_only', labels: 'derivable', frontier: 'off',
    knowledge: 'relevance_gated', failures: 'headline_codes', adverts: 'stubs', rare: 'triggered',
    misc: 'merged', shortlist: 'k2', optionDetail: 'top2_stubs',
  }),
});

const nonNegativeInteger = z.number().int().nonnegative();
export const circumstanceFeatureVectorSchema = z.strictObject({
  actor_count: nonNegativeInteger,
  caster_count: nonNegativeInteger,
  terrain_feature_count: nonNegativeInteger,
  blocked_cell_fraction: z.number().finite().min(0).max(1),
  difficult_cell_fraction: z.number().finite().min(0).max(1),
  mean_pairwise_engagement_distance: z.number().finite().nonnegative(),
  minimum_pairwise_engagement_distance: z.number().finite().nonnegative(),
  challenge_budget_spent_eighths: nonNegativeInteger,
  granularity: z.enum(['full', 'turn_delta']),
  pre_trim_bytes: nonNegativeInteger,
  trim_engaged: z.boolean(),
  trim_bytes_removed: nonNegativeInteger,
  options_per_actor_mean: z.number().finite().nonnegative(),
  options_per_actor_max: nonNegativeInteger,
});

export type CircumstanceFeatureVector = z.infer<typeof circumstanceFeatureVectorSchema>;

export const rendererAttributionSchema = z.strictObject({
  policy_version: z.literal(RENDERER_POLICY_VERSION),
});

export interface RendererAttribution {
  readonly policy_version: typeof RENDERER_POLICY_VERSION;
}

export interface RendererRemovalCounts {
  readonly rows: number;
  readonly options: number;
  readonly threats: number;
  readonly movement: number;
  readonly rare: number;
  readonly adverts: number;
  readonly topLevel: number;
}

type MutableRecord = Record<string, unknown>;

function record(value: unknown): MutableRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as MutableRecord
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function challengeEighths(value: string | number): number {
  if (typeof value === 'number') return value * 8;
  switch (value) {
    case '0': return 0;
    case '1/8': return 1;
    case '1/4': return 2;
    case '1/2': return 4;
    default: return 0;
  }
}

function renderedActors(context: Readonly<Record<string, unknown>>): readonly MutableRecord[] {
  return array(context['actors']).flatMap((value) => {
    const actor = record(value);
    return actor === null ? [] : [actor];
  });
}

export function extractCircumstanceFeatures(input: {
  readonly state: EncounterState;
  readonly capsule: EngineStateCapsule;
  readonly renderedContext: Readonly<Record<string, unknown>>;
  readonly granularity: 'full' | 'turn_delta';
  readonly preTrimBytes: number;
  readonly postTrimBytes: number;
}): CircumstanceFeatureVector {
  const living = input.state.combatants.filter((actor) => actor.life !== 'dead');
  const positions = new Map(input.state.tokens.map((token) => [token.combatantId, token.position]));
  const engagementDistances = living.flatMap((left, leftIndex) => living.slice(leftIndex + 1)
    .filter((right) => right.profile.kind !== left.profile.kind)
    .flatMap((right) => {
      const leftPosition = positions.get(left.profile.id);
      const rightPosition = positions.get(right.profile.id);
      return leftPosition === undefined || rightPosition === undefined
        ? []
        : [gridDistance(leftPosition, rightPosition)];
    }));
  const totalCells = Math.max(1, input.state.bounds.columns * input.state.bounds.rows);
  const difficultCells = new Set(input.state.environment.difficultTerrainRegions
    .flatMap((region) => region.cells.map((cell) => `${String(cell.column)}:${String(cell.row)}`)));
  const actors = renderedActors(input.renderedContext);
  const optionCounts = actors.map((actor) => array(actor['options']).length);
  // Encounter budget is spent when a combatant is added, not refunded when it dies.
  const challengeSpent = input.state.combatants.reduce((total, actor) => {
    const profile = actor.profile;
    if (profile.kind !== 'monster') return total;
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === profile.statblockId);
    const challenge = row?.statblock.sourceDetails.challenge;
    return total + (challenge?.kind === 'present' ? challengeEighths(challenge.value.rating) : 0);
  }, 0);
  const feature = {
    actor_count: living.length,
    caster_count: living.filter((actor) =>
      actor.spellSlots.some((slot) => slot.remaining > 0) ||
      actor.limitedResources?.some((pool) =>
        pool.remaining > 0 && String(pool.id).startsWith('monster-spell:')) === true).length,
    terrain_feature_count: input.state.blockedCells.length + input.state.worldObjects.length +
      input.state.environment.difficultTerrainRegions.length + input.state.environment.lightRegions.length +
      input.state.environment.obscurementRegions.length + (input.state.environment.movementRegions?.length ?? 0),
    blocked_cell_fraction: input.state.blockedCells.length / totalCells,
    difficult_cell_fraction: difficultCells.size / totalCells,
    mean_pairwise_engagement_distance: engagementDistances.length === 0
      ? 0
      : engagementDistances.reduce((sum, distance) => sum + distance, 0) / engagementDistances.length,
    minimum_pairwise_engagement_distance: engagementDistances.length === 0
      ? 0
      : Math.min(...engagementDistances),
    challenge_budget_spent_eighths: challengeSpent,
    granularity: input.granularity,
    pre_trim_bytes: input.preTrimBytes,
    trim_engaged: input.postTrimBytes < input.preTrimBytes,
    trim_bytes_removed: Math.max(0, input.preTrimBytes - input.postTrimBytes),
    options_per_actor_mean: optionCounts.length === 0
      ? 0
      : optionCounts.reduce((sum, count) => sum + count, 0) / optionCounts.length,
    options_per_actor_max: optionCounts.length === 0 ? 0 : Math.max(...optionCounts),
  };
  return circumstanceFeatureVectorSchema.parse(feature);
}

function rowIsException(row: MutableRecord, best: MutableRecord): boolean {
  return array(row['consequence_codes']).length > 0 ||
    row['roll_mode'] !== best['roll_mode'] || row['range'] !== best['range'] ||
    row['action_id'] !== best['action_id'] || row['movement_need_feet'] !== best['movement_need_feet'] ||
    row['ev'] !== best['ev'] || row['p_hit'] !== best['p_hit'];
}

function materialMovement(row: MutableRecord): boolean {
  const before = record(row['before']);
  const after = record(row['after']);
  return after !== null && before !== null && (
    before['range'] !== after['range'] || before['roll'] !== after['roll'] ||
    before['ev'] !== after['ev'] || row['opportunity_risk'] !== 'none' ||
    row['hazard_risk'] !== 'none' || String(row['attack_eta']) !== 'now'
  );
}

function optionSemantic(option: MutableRecord): string {
  return JSON.stringify([
    option['kind'], option['action_id'], option['resource_cost_labels'],
    option['minimum_movement_feet'], option['usable_now'], option['usable_after_movement'],
  ]);
}

function shortlist(
  options: MutableRecord[],
  defaultId: unknown,
  maximum: 2 | 3,
  opportunity: MutableRecord | null,
): MutableRecord[] {
  if (typeof defaultId !== 'string') {
    throw new Error('Renderer K-set safety failure: engine default identity is unavailable.');
  }
  const defaultIndex = options.findIndex((option) => option['option_id'] === defaultId);
  if (defaultIndex < 0) {
    throw new Error('Renderer K-set safety failure: engine default is not in the offered option set.');
  }
  const ordered = defaultIndex < 0
    ? [...options]
    : [options[defaultIndex]!, ...options.filter((_option, index) => index !== defaultIndex)];
  const knownDominatedId = opportunity?.['status'] === 'dominated' &&
    opportunity['dodge_option_id'] !== defaultId
    ? opportunity['dodge_option_id']
    : null;
  const eligible = ordered.filter((option) => option['option_id'] !== knownDominatedId);
  const selected: MutableRecord[] = [eligible[0]!];
  const semantics = new Set<string>([optionSemantic(eligible[0]!)]);
  for (const option of eligible.slice(1)) {
    const semantic = optionSemantic(option);
    if (!semantics.has(semantic)) {
      selected.push(option);
      semantics.add(semantic);
    }
    if (selected.length >= maximum) break;
  }
  for (const option of eligible.slice(1)) {
    if (selected.length >= maximum || selected.includes(option)) continue;
    const sameSemantic = selected.find((candidate) => optionSemantic(candidate) === optionSemantic(option));
    const changesConsequence = array(option['risks']).length > 0 || (sameSemantic !== undefined &&
      JSON.stringify(record(option['expectation'])) !== JSON.stringify(record(sameSemantic['expectation'])));
    if (changesConsequence) selected.push(option);
  }
  for (const option of eligible) {
    if (selected.length >= Math.min(maximum, 2) || selected.includes(option)) continue;
    selected.push(option);
  }
  if (options.length >= 2 && selected.length < 2) {
    throw new Error('Renderer K-set safety failure: actor lost every visible non-default option.');
  }
  if (defaultIndex >= 0 && selected[0]?.['option_id'] !== defaultId) {
    throw new Error('Renderer K-set safety failure: engine default is not first.');
  }
  return selected;
}

function sparseSlot(slot: MutableRecord): MutableRecord {
  const result: MutableRecord = { slot: slot['slot'], kind: slot['kind'], action_id: slot['action_id'] };
  for (const key of ['component_action_ids', 'spell_id', 'target_ids', 'world_object_id'] as const) {
    const value = slot[key];
    if (value !== null && (!Array.isArray(value) || value.length > 0)) result[key] = value;
  }
  return result;
}

export function decodeSparseActionSlot(slotValue: unknown): Readonly<Record<string, unknown>> {
  const slot = record(slotValue);
  if (slot === null || typeof slot['slot'] !== 'string' || typeof slot['kind'] !== 'string' ||
    typeof slot['action_id'] !== 'string') throw new TypeError('Sparse action slot is malformed.');
  return {
    slot: slot['slot'], kind: slot['kind'], action_id: slot['action_id'],
    component_action_ids: array(slot['component_action_ids']),
    spell_id: typeof slot['spell_id'] === 'string' ? slot['spell_id'] : null,
    target_ids: array(slot['target_ids']),
    world_object_id: typeof slot['world_object_id'] === 'string' ? slot['world_object_id'] : null,
  };
}

function sparseStatus(status: MutableRecord): MutableRecord {
  const result = { ...status };
  if (array(result['effect_tags']).length === 0) delete result['effect_tags'];
  if (array(result['pending_decision_ids']).length === 0) delete result['pending_decision_ids'];
  if (result['action_available'] === true) delete result['action_available'];
  if (result['bonus_action_available'] === true) delete result['bonus_action_available'];
  if (result['reaction_available'] === true) delete result['reaction_available'];
  return result;
}

export function decodeSparseActorStatus(statusValue: unknown): Readonly<Record<string, unknown>> {
  const status = record(statusValue);
  if (status === null) throw new TypeError('Sparse actor status is malformed.');
  return {
    ...status,
    action_available: status['action_available'] ?? true,
    bonus_action_available: status['bonus_action_available'] ?? true,
    reaction_available: status['reaction_available'] ?? true,
    effect_tags: array(status['effect_tags']),
    pending_decision_ids: array(status['pending_decision_ids']),
  };
}

function derivedLabel(actionId: unknown): string | null {
  if (typeof actionId !== 'string') return null;
  return actionId.split(':').at(-1)?.replaceAll('-', ' ').replace(/\b\w/gu, (letter) => letter.toUpperCase()) ?? null;
}

function headlineCode(value: unknown): string {
  return String(value).split(':', 1)[0]!.trim().toLowerCase().replaceAll(/[^a-z0-9]+/gu, '_').replaceAll(/^_|_$/gu, '');
}

function rareTriggered(key: string, value: MutableRecord): boolean {
  switch (key) {
    case 'legendary_windows': return array(value['actors']).length > 0 || array(value['resistance_spend_inputs']).length > 0;
    case 'alert_state': return array(value['calls']).length > 0 || array(value['joined']).length > 0;
    case 'search_memory': return array(value['memories']).length > 0;
    case 'recovery_capabilities': return array(value['targets']).length > 0;
    case 'reaction_spend_hold': return array(value['windows']).length > 0;
    default: return false;
  }
}

export interface RenderedProfileContext {
  readonly context: Readonly<Record<string, unknown>>;
  readonly optionRefs: ReadonlyMap<string, string>;
  readonly removals: RendererRemovalCounts;
}

export function renderTurnContextProfile(
  input: Readonly<Record<string, unknown>>,
  profileValue: RendererProfile,
): RenderedProfileContext {
  const profile = rendererProfileSchema.parse(profileValue);
  const context = structuredClone(input) as MutableRecord;
  const optionRefs = new Map<string, string>();
  let removedRows = 0;
  let removedOptions = 0;
  let removedThreats = 0;
  let removedMovement = 0;
  let removedRare = 0;
  let removedAdverts = 0;
  let removedTopLevel = 0;
  const actors = renderedActors(context);
  let nextOptionRef = 1;
  for (const actor of actors) {
    const intel = record(actor['intel']);
    const opportunity = record(intel?.['opportunity_cost']);
    let options = array(actor['options']).flatMap((value) => {
      const option = record(value);
      return option === null ? [] : [option];
    });
    if (profile.shortlist !== 'all') {
      const selected = shortlist(options, opportunity?.['engine_default_option_id'], profile.shortlist === 'k3' ? 3 : 2, opportunity);
      removedOptions += options.length - selected.length;
      options = selected;
      actor['options'] = options;
    }
    if (profile.optionDetail === 'top2_stubs') {
      actor['options'] = options.map((option, index) => index < 2 ? option : ({
        option_id: option['option_id'], actor_id: option['actor_id'], revision: option['revision'],
        action_id: option['action_id'], kind: option['kind'], usable_now: option['usable_now'],
        usable_after_movement: option['usable_after_movement'],
      }));
      options = actor['options'] as MutableRecord[];
    }
    for (const option of options) {
      if (profile.slots === 'sparse' && Array.isArray(option['action_slots'])) {
        option['action_slots'] = option['action_slots'].flatMap((value) => {
          const slot = record(value);
          return slot === null ? [] : [sparseSlot(slot)];
        });
      }
      if (profile.labels === 'derivable' && option['label'] === derivedLabel(option['action_id'])) {
        delete option['label'];
      }
      if (profile.ids === 'short_refs' && typeof option['option_id'] === 'string') {
        const ref = `o${String(nextOptionRef)}`;
        nextOptionRef += 1;
        optionRefs.set(ref, option['option_id']);
        option['option_ref'] = ref;
        delete option['option_id'];
        delete option['actor_id'];
        delete option['revision'];
      }
    }
    const status = record(actor['status']);
    if (profile.status === 'sparse' && status !== null) actor['status'] = sparseStatus(status);
    const threats = array(actor['threats']).flatMap((value) => {
      const threat = record(value);
      return threat === null ? [] : [threat];
    });
    if (profile.threats === 'counts_exception_ids') {
      actor['threat_summary'] = {
        count: threats.length,
        exceptional_source_ids: threats.filter((threat) =>
          threat['can_reach_now'] === 'yes' || array(threat['note_codes']).length > 0)
          .map((threat) => threat['source_id']),
      };
      delete actor['threats'];
      removedThreats += threats.length;
    }
    if (intel !== null) {
      const rows = array(intel['rows']);
      let selectedRows = rows;
      if (profile.rows === 'off') selectedRows = [];
      else if (profile.rows === 'top_target') selectedRows = rows.slice(0, 1);
      else if (profile.rows === 'best_exception') {
        const best = record(rows[0]);
        selectedRows = best === null ? [] : rows.filter((value, index) => {
          const row = record(value);
          return index === 0 || (row !== null && rowIsException(row, best));
        });
      }
      removedRows += rows.length - selectedRows.length;
      intel['rows'] = selectedRows;
      if (profile.movement === 'material_only') {
        const movement = array(intel['movement']);
        const selected = movement.filter((value) => {
          const row = record(value);
          return row !== null && materialMovement(row);
        });
        removedMovement += movement.length - selected.length;
        intel['movement'] = selected;
      }
      if (profile.opportunityCost !== 'full' && opportunity !== null) {
        if (profile.opportunityCost === 'conditional' &&
          opportunity['status'] === 'dominated' && opportunity['dodge_option_id'] !== opportunity['engine_default_option_id']) {
          intel['opportunity_cost'] = null;
        } else if (profile.opportunityCost === 'status_ids') {
          intel['opportunity_cost'] = Object.fromEntries(Object.entries(opportunity).filter(([key]) =>
            ['policy', 'correction_policy', 'dodge_option_id', 'engine_default_option_id', 'better_option_id', 'status'].includes(key)));
        }
      }
    }
  }
  const frontier = record(context['team_plan_frontier']);
  if (profile.frontier === 'off' && context['team_plan_frontier'] !== null) {
    context['team_plan_frontier'] = null;
    removedTopLevel += 1;
  } else if (profile.frontier === 'candidates_summary' && frontier !== null && Array.isArray(frontier['candidates'])) {
    context['team_plan_frontier'] = {
      policy: frontier['policy'], frontier_resolution: frontier['frontier_resolution'],
      detail_level: 'candidate_summary',
      candidates: array(frontier['candidates']).map((value) => {
        const candidate = record(value);
        if (candidate === null) return value;
        return candidate['status'] === 'resolved'
          ? { candidate_id: candidate['candidate_id'], label: candidate['label'], status: 'resolved', wasted_turn_count: array(candidate['markers']).length }
          : { candidate_id: candidate['candidate_id'], label: candidate['label'], status: 'unresolved', unresolved_metrics: candidate['unresolved_metrics'], reason_codes: candidate['reason_codes'] };
      }),
      removed: array(frontier['removed']).map((value) => {
        const candidate = record(value);
        return candidate === null ? value : {
          candidate_id: candidate['candidate_id'], dominated_by_candidate_id: candidate['dominated_by_candidate_id'],
          better_metrics: candidate['better_metrics'], wasted_turn_count: array(candidate['markers']).length,
        };
      }),
    };
  }
  const knowledge = record(context['actor_knowledge']);
  if (profile.knowledge === 'relevance_gated' && knowledge !== null) {
    const relevant = array(knowledge['actors']).filter((value) => array(record(value)?.['targets']).some((target) =>
      record(target)?.['kind'] !== 'perceived'));
    if (relevant.length === 0) {
      delete context['actor_knowledge'];
      removedTopLevel += 1;
    } else knowledge['actors'] = relevant;
  }
  const failures = record(context['known_failure_modes']);
  if (profile.failures === 'headline_codes' && failures !== null) {
    context['known_failure_modes'] = {
      policy: failures['policy'], codes: array(failures['modes']).map(headlineCode),
    };
  }
  if (profile.adverts === 'stubs') {
    const selectedPlay = record(context['suggested_plan'])?.['play_name'];
    for (const key of ['applicable_plays', 'applicable_skills'] as const) {
      const values = array(context[key]);
      context[key] = values.flatMap((value) => {
        const item = record(value);
        if (item === null) return [];
        removedAdverts += 1;
        return [{
          id: item['name'],
          label: item['name'],
          dominance_status: key === 'applicable_plays' ? 'frontier' : 'not_evaluated',
          override_status: key === 'applicable_plays' && item['name'] === selectedPlay
            ? 'selected'
            : 'available',
        }];
      });
    }
  }
  if (profile.rare === 'triggered') {
    for (const key of ['legendary_windows', 'alert_state', 'search_memory', 'recovery_capabilities', 'reaction_spend_hold'] as const) {
      const value = record(context[key]);
      if (context[key] !== undefined && (value === null || !rareTriggered(key, value))) {
        delete context[key];
        removedRare += 1;
      }
    }
  }
  if (profile.misc === 'merged') {
    const summary = record(context['summary']);
    context['situation'] = JSON.stringify({
      room: summary?.['room'], round: summary?.['round'], side: summary?.['active_side'],
      allies: summary?.['living_allies'], enemies: summary?.['living_enemies'],
      terrain: summary?.['terrain_tags'], changes: context['recent_changes'],
    });
    delete context['summary'];
    delete context['recent_changes'];
    removedTopLevel += 2;
  }
  context['renderer_attribution'] = rendererAttributionSchema.parse({
    policy_version: RENDERER_POLICY_VERSION,
  });
  return {
    context,
    optionRefs,
    removals: {
      rows: removedRows, options: removedOptions, threats: removedThreats,
      movement: removedMovement, rare: removedRare, adverts: removedAdverts,
      topLevel: removedTopLevel,
    },
  };
}

export function resolveOptionReference(value: string, references: ReadonlyMap<string, string>): string {
  return references.get(value) ?? value;
}

export function decodeShortReferencedOption(
  optionValue: unknown,
  actorId: string,
  revision: number,
  references: ReadonlyMap<string, string>,
): Readonly<Record<string, unknown>> {
  const option = record(optionValue);
  if (option === null || typeof option['option_ref'] !== 'string') {
    throw new TypeError('Short-referenced option is malformed.');
  }
  const { option_ref: reference, ...rest } = option;
  const optionId = references.get(reference);
  if (optionId === undefined) throw new RangeError(`Unknown option reference ${reference}.`);
  return { option_id: optionId, actor_id: actorId, revision, ...rest };
}

export function renderBytes(value: unknown): number {
  return jsonBytes(value);
}
