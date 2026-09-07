import { z } from 'zod';
import { combatantsAreAllies } from '../combat/allies';
import type { EncounterState } from '../combat/encounter';
import { combatantSpace } from '../combat/combat-rules';
import { minimumSpaceDistance } from '../combat/creature-space';
import { BUNDLED_MONSTER_ROSTER } from '../combat/statblocks/roster';
import type { EngineStateCapsule } from './engine-state-capsule';
import type { EngineOmittedRider, NoModeledEffect } from './option-modeling';
import { engineOptionId, type EngineOptionId } from './turn-proposal';

export const RENDERER_POLICY_VERSION = 'turn-context-renderer-v4-creature-space' as const;

export const rendererFormatSchema = z.enum(['structured', 'caveman_prose', 'regular_prose']);
export type RendererFormat = z.infer<typeof rendererFormatSchema>;
export type ProseRendererFormat = Exclude<RendererFormat, 'structured'>;

export const rendererProfileSchema = z.strictObject({
  format: rendererFormatSchema,
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
  nullFields: z.enum(['omit', 'explicit']),
  attribution: z.enum(['stamped', 'off']),
});

export type RendererProfile = z.infer<typeof rendererProfileSchema>;
export type RendererNullFields = RendererProfile['nullFields'];

export const DEFAULT_RENDERER_PROFILE: RendererProfile = Object.freeze({
  format: 'structured',
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
  nullFields: 'explicit',
  attribution: 'off',
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

function plainWords(value: string): string {
  return value.replaceAll('-', ' ').replaceAll('_', ' ');
}

export function renderNoModeledEffectReason(reason: NoModeledEffect): string {
  switch (reason.kind) {
    case 'disengage_without_movement':
      return 'no effect here: no movement to disengage with';
    case 'disengage_without_adjacent_hostile':
      return 'no effect here: no adjacent enemy to disengage from';
    case 'unsupported_action_payload':
      return `not modeled: ${reason.sourceNote.replace(/[.]$/u, '').toLocaleLowerCase()}`;
    case 'unsupported_spell_payload': {
      const spell = plainWords(reason.spellId);
      switch (reason.limitation) {
        case 'not_in_manifest': return `not modeled: ${spell} is not implemented`;
        case 'definition_unavailable': return `not modeled: ${spell} has no engine definition`;
        case 'targeting_unresolved': return `not modeled: ${spell} targeting cannot be resolved`;
        case 'utility_operation_unmodeled': return `not modeled: ${spell} has no in-combat effect`;
      }
    }
  }
}

export function renderOmittedRider(rider: EngineOmittedRider): string {
  const component = plainWords(rider.componentActionId);
  switch (rider.kind) {
    case 'conditional_damage_trigger':
      return `${component}: conditional ${plainWords(rider.trigger)} damage is not executed`;
    case 'conditional_on_hit_effect':
      return `${component}: conditional ${plainWords(rider.trigger)} on-hit ${rider.effect} is not executed`;
    case 'attack_advantage_window':
      return `${component}: ${plainWords(rider.window)} attack Advantage is not executed`;
    case 'delayed_zombie_creation':
      return `${component}: delayed Zombie creation after ${String(rider.delayHours)} hours is not executed`;
    case 'other_explicitly_classified_secondary_effect':
      return `${component}: ${plainWords(rider.classification)} is not executed`;
  }
}

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
    .filter((right) => !combatantsAreAllies(input.state, left.profile.id, right.profile.id))
    .flatMap((right) => {
      const leftPosition = positions.get(left.profile.id);
      const rightPosition = positions.get(right.profile.id);
      return leftPosition === undefined || rightPosition === undefined
        ? []
        : [minimumSpaceDistance(
            combatantSpace(input.state, left.profile.id),
            combatantSpace(input.state, right.profile.id),
          )];
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
    option['kind'], option['action_id'], option['resource_cost_labels'], option['activation_choice'],
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
    throw new Error(`Renderer K-set safety failure: actor ${String(options[0]?.['actor_id'])} lost every visible non-default option (${options
      .map((option) => `${String(option['option_id'])}:${String(option['label'])}`)
      .join(', ')}; dominated ${String(knownDominatedId)}).`);
  }
  if (defaultIndex >= 0 && selected[0]?.['option_id'] !== defaultId) {
    throw new Error('Renderer K-set safety failure: engine default is not first.');
  }
  return selected;
}

function sparseSlot(slot: MutableRecord): MutableRecord {
  const result: MutableRecord = { slot: slot['slot'], kind: slot['kind'], action_id: slot['action_id'] };
  for (const key of ['component_action_ids', 'components', 'omitted_riders', 'spell_id', 'target_ids', 'world_object_id'] as const) {
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
    ...(Array.isArray(slot['components']) ? { components: slot['components'] } : {}),
    ...(Array.isArray(slot['omitted_riders']) ? { omitted_riders: slot['omitted_riders'] } : {}),
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
  readonly shownOptionIdsByActor: ReadonlyMap<string, ReadonlySet<EngineOptionId>>;
  readonly removals: RendererRemovalCounts;
}

const shownOptionIdBrand = Symbol('ShownOptionId');

/** An exact engine id proven to be present in one actor's rendered option list. */
type ShownOptionId = EngineOptionId & { readonly [shownOptionIdBrand]: true };

interface RenderedOptionCatalogEntry {
  readonly actorId: string;
  readonly optionId: EngineOptionId;
  readonly displayId: string;
  readonly label: string;
}

export interface ShownOptionContext {
  readonly context: Readonly<Record<string, unknown>>;
  readonly shownOptionIdsByActor: ReadonlyMap<string, ReadonlySet<EngineOptionId>>;
}

function optionLabel(option: MutableRecord): string {
  if (typeof option['label'] === 'string') return option['label'];
  return derivedLabel(option['action_id']) ?? 'Unlabelled option';
}

function optionCatalog(
  context: Readonly<Record<string, unknown>>,
  references: ReadonlyMap<string, string>,
): readonly RenderedOptionCatalogEntry[] {
  return renderedActors(context).flatMap((actor) => {
    const actorId = String(actor['actor_id']);
    return array(actor['options']).flatMap((value) => {
      const option = record(value);
      if (option === null) return [];
      const displayId = typeof option['option_id'] === 'string'
        ? option['option_id']
        : typeof option['option_ref'] === 'string'
          ? option['option_ref']
          : null;
      if (displayId === null) return [];
      const exactId = references.get(displayId) ?? (typeof option['option_id'] === 'string'
        ? option['option_id']
        : undefined);
      return exactId === undefined ? [] : [{
        actorId,
        optionId: engineOptionId(exactId),
        displayId,
        label: optionLabel(option),
      }];
    });
  });
}

function shownOptionId(id: EngineOptionId, shown: ReadonlySet<EngineOptionId>): ShownOptionId | null {
  return shown.has(id) ? id as ShownOptionId : null;
}

/**
 * Close every rendered option reference over the actor's visible option list.
 * Hidden choices retain human-readable coaching as labels, but their executable
 * ids are removed. This keeps the D430/D431 relevance cut readable without
 * turning an omitted choice back into an offer through an intel side channel.
 */
export function bindIntelToShownOptions(
  contextValue: Readonly<Record<string, unknown>>,
  references: ReadonlyMap<string, string>,
  catalogContext: Readonly<Record<string, unknown>> = contextValue,
  declareSizeOmissions = false,
): ShownOptionContext {
  const context = structuredClone(contextValue) as MutableRecord;
  const catalogValue = optionCatalog(catalogContext, references);
  const shownCatalog = optionCatalog(context, references);
  const shownOptionIdsByActor = new Map<string, ReadonlySet<EngineOptionId>>();
  for (const actorId of new Set(renderedActors(context).map((actor) => String(actor['actor_id'])))) {
    shownOptionIdsByActor.set(actorId, new Set(shownCatalog
      .filter((entry) => entry.actorId === actorId)
      .map((entry) => entry.optionId)));
  }
  const catalogCounts = new Map<string, number>();
  for (const entry of catalogValue) {
    catalogCounts.set(entry.actorId, (catalogCounts.get(entry.actorId) ?? 0) + 1);
  }
  for (const actor of renderedActors(context)) {
    const actorId = String(actor['actor_id']);
    const shownCount = shownCatalog.filter((entry) => entry.actorId === actorId).length;
    actor['options_omitted_for_size'] = declareSizeOmissions
      ? Math.max(0, (catalogCounts.get(actorId) ?? shownCount) - shownCount)
      : 0;
  }
  const byId = new Map(catalogValue.map((entry) => [entry.optionId, entry] as const));
  const shownById = new Map(shownCatalog.map((entry) => [entry.optionId, entry] as const));
  const hiddenEntries = catalogValue.filter((entry) =>
    shownOptionId(entry.optionId, shownOptionIdsByActor.get(entry.actorId) ?? new Set()) === null);

  const suggested = record(context['suggested_plan']);
  const suggestedProposals = array(suggested?.['proposals']).flatMap((value) => {
    const proposal = record(value);
    return proposal === null ? [] : [proposal];
  });
  if (suggested !== null && suggestedProposals.some((proposal) => {
    const actorShown = shownOptionIdsByActor.get(String(proposal['actor_id'])) ?? new Set();
    return [proposal['primary_option_id'], proposal['fallback_option_id']].some((id) =>
      typeof id === 'string' && !actorShown.has(engineOptionId(id)));
  })) {
    // A suggested plan is advertised as executable as-is. If byte pruning hid
    // either branch, omit the whole advert instead of leaking an unshown id or
    // presenting a plan that the proposal validator must reject.
    delete context['suggested_plan'];
  }

  const visit = (value: unknown, insideOption: boolean): void => {
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, insideOption));
      return;
    }
    const current = record(value);
    if (current === null) return;
    for (const [key, nested] of Object.entries(current)) {
      const childInsideOption = insideOption || key === 'options';
      if (!insideOption && key.endsWith('option_id') && typeof nested === 'string') {
        const catalogEntry = byId.get(engineOptionId(nested));
        const shownEntry = shownById.get(engineOptionId(nested));
        if (shownEntry === undefined) {
          delete current[key];
          const labelKey = key.replace(/_id$/u, '_label');
          if (typeof current[labelKey] !== 'string') {
            current[labelKey] = catalogEntry?.label ?? plainWords(key.replace(/_option_id$/u, ''));
          }
        } else {
          current[key] = shownEntry.displayId;
        }
        continue;
      }
      if (!insideOption && typeof nested === 'string') {
        current[key] = hiddenEntries.reduce((text, entry) =>
          text.replaceAll(entry.optionId, entry.label), nested);
      } else {
        visit(nested, childInsideOption);
      }
    }
  };
  visit(context, false);
  return { context, shownOptionIdsByActor };
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
        omitted_riders: option['omitted_riders'],
        ...(option['activation_choice'] === undefined ? {} : { activation_choice: option['activation_choice'] }),
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
  if (profile.attribution === 'stamped') {
    context['renderer_attribution'] = rendererAttributionSchema.parse({
      policy_version: RENDERER_POLICY_VERSION,
    });
  } else {
    delete context['renderer_attribution'];
  }
  const bound = bindIntelToShownOptions(context, optionRefs, input);
  return {
    context: bound.context,
    optionRefs,
    shownOptionIdsByActor: bound.shownOptionIdsByActor,
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

interface ProseSegment {
  readonly group: string;
  readonly priority: number;
  readonly protected: boolean;
  readonly text: string;
  readonly compactText: string;
  readonly actorOption?: {
    readonly actorId: string;
    readonly optionId: EngineOptionId;
  };
  readonly actorOmissionDeclaration?: string;
}

export interface RenderedProseTurnContext {
  readonly context: Readonly<Record<string, unknown>>;
  readonly shownOptionIdsByActor: ReadonlyMap<string, ReadonlySet<EngineOptionId>>;
  readonly preTrimBytes: number;
  readonly postTrimBytes: number;
  readonly optionsOmittedForSizeByActor: readonly {
    readonly actorId: string;
    readonly count: number;
  }[];
}

function proseBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function words(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

function sentenceLabel(path: readonly string[]): string {
  return path.map(words).join(' ');
}

function scalarText(value: unknown): string {
  if (value === null) return 'none';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function flatClauses(value: unknown, path: readonly string[] = []): readonly string[] {
  if (!Array.isArray(value) && record(value) === null) {
    return [`${sentenceLabel(path)} ${scalarText(value)}`.trim()];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${sentenceLabel(path)} none`.trim()];
    if (value.every((entry) => !Array.isArray(entry) && record(entry) === null)) {
      return [`${sentenceLabel(path)} ${value.map(scalarText).join(', ')}`.trim()];
    }
    return value.flatMap((entry, index) => flatClauses(entry, [...path, String(index + 1)]));
  }
  const object = record(value);
  if (object === null) return [];
  const entries = Object.entries(object);
  if (entries.length === 0) return [`${sentenceLabel(path)} none`.trim()];
  return entries.flatMap(([key, entry]) => flatClauses(entry, [...path, key]));
}

function proseSegmentText(
  style: ProseRendererFormat,
  subject: string,
  clauses: readonly string[],
): string {
  const details = clauses.length === 0 ? 'No details' : clauses.join('; ');
  return style === 'caveman_prose'
    ? `${subject}. ${details}.`
    : `${subject}. The details are ${details}.`;
}

function exactOptionId(option: MutableRecord, references: ReadonlyMap<string, string>): string | null {
  if (typeof option['option_id'] === 'string') return option['option_id'];
  return typeof option['option_ref'] === 'string'
    ? references.get(option['option_ref']) ?? null
    : null;
}

function listed(value: unknown, empty = 'none'): string {
  const entries = array(value).map(String);
  return entries.length === 0 ? empty : entries.join(', ');
}

function cleanClause(value: unknown): string {
  return String(value).trim().replace(/[.!?]+$/u, '');
}

function optionFacts(option: MutableRecord): readonly string[] {
  const kind = words(String(option['kind']));
  const actionId = String(option['action_id']);
  const readableAction = words(actionId);
  const facts: string[] = [kind === readableAction ? readableAction : `${kind} using ${readableAction}`];
  for (const slotValue of array(option['action_slots'])) {
    const slot = record(slotValue);
    if (slot === null) continue;
    const slotFacts = [`Uses the ${words(String(slot['slot']))} action to ${words(String(slot['kind']))}`];
    if (words(String(slot['action_id'])) !== words(String(slot['kind']))) slotFacts.push(String(slot['action_id']));
    if (typeof slot['spell_id'] === 'string') slotFacts.push(`spell ${slot['spell_id']}`);
    if (array(slot['component_action_ids']).length > 0) {
      slotFacts.push(`components ${listed(slot['component_action_ids'])}`);
    }
    if (array(slot['target_ids']).length > 0) slotFacts.push(`targets ${listed(slot['target_ids'])}`);
    if (typeof slot['world_object_id'] === 'string') slotFacts.push(`object ${slot['world_object_id']}`);
    facts.push(slotFacts.join(', '));
  }
  if (array(option['target_selectors']).length > 0) {
    facts.push(`target selectors ${flatClauses(option['target_selectors']).join(', ')}`);
  }
  if (array(option['resource_cost_labels']).length > 0) {
    facts.push(`Costs ${listed(option['resource_cost_labels'])}`);
  }
  const activationChoice = record(option['activation_choice']);
  if (activationChoice !== null) {
    const values = listed(activationChoice['values']);
    const targets = array(activationChoice['target_ids']);
    facts.push(`Choose ${words(String(activationChoice['kind']))} at activation from ${values}${
      targets.length === 0 ? '' : ` for each target ${targets.join(', ')}`}`);
  }
  for (const riderValue of array(option['omitted_riders'])) {
    const rider = record(riderValue);
    if (rider === null) continue;
    const component = words(String(rider['componentActionId']));
    facts.push(`Omitted rider beside ${component}: ${words(String(rider['kind']))}`);
  }
  if (option['usable_now'] === true && option['usable_after_movement'] === true) facts.push('Works now and after movement');
  else if (option['usable_after_movement'] === true) facts.push('Needs movement first');
  else if (option['usable_now'] === true) facts.push('Works now but not after movement');
  else facts.push('Unavailable now and after movement');
  if (typeof option['minimum_movement_feet'] === 'number') {
    facts.push(option['minimum_movement_feet'] === 0
      ? 'No movement needed'
      : `Needs ${String(option['minimum_movement_feet'])} ft movement`);
  } else if (option['minimum_movement_feet'] === null) facts.push('Needed distance is unknown');
  if (option['visibility'] === 'yes' || option['visibility'] === true) facts.push('Target is visible');
  else if (option['visibility'] !== 'unknown') facts.push('Target is not visible');
  if (option['cover'] === 'none') facts.push('No cover');
  else if (option['cover'] !== 'unknown') facts.push(`Cover is ${String(option['cover'])}`);
  for (const riskValue of array(option['risks'])) {
    const risk = record(riskValue);
    if (risk !== null) facts.push(
      `${String(risk['severity'])} ${words(String(risk['kind']))} risk` +
      (typeof risk['source_id'] === 'string' ? ` from ${risk['source_id']}` : ''),
    );
  }
  const expectation = record(option['expectation']);
  if (expectation !== null) {
    facts.push(expectation['resolvable'] === true ? 'outcome resolved' : 'outcome unresolved');
    if (expectation['kind'] === 'hard_control') {
      facts.push(`expected ${String(expectation['expected_initially_affected'])} caught initially`);
      facts.push(`${String(expectation['expected_control_burden'])} expected enemy actions over ${String(expectation['horizon_rounds'])} rounds`);
      facts.push(`${String(expectation['expected_disabled_turns'])} lost turns`);
      facts.push(`${String(expectation['expected_wake_actions'])} wake actions`);
      facts.push(`${String(expectation['resource_penalty'])} limited-use penalty`);
      facts.push(`${String(expectation['net_action_equivalents'])} net action-equivalents`);
    }
    if (typeof expectation['outcome_probability'] === 'number') {
      facts.push(`outcome probability ${String(expectation['outcome_probability'])}`);
    }
    if (typeof expectation['critical_probability'] === 'number') {
      facts.push(`critical probability ${String(expectation['critical_probability'])}`);
    }
    if (typeof expectation['expected_value'] === 'number') {
      facts.push(`EV ${String(expectation['expected_value'])} ${String(expectation['metric'])}`);
    } else if (expectation['metric'] !== 'none' && expectation['kind'] !== 'hard_control') {
      facts.push(`EV unavailable for ${String(expectation['metric'])}`);
    }
  }
  for (const refusalValue of array(option['refusals'])) {
    const refusal = record(refusalValue);
    if (refusal !== null) facts.push(`Unavailable because ${cleanClause(refusal['summary'])}`);
  }
  return facts;
}

function optionText(
  style: ProseRendererFormat,
  label: string,
  optionId: string,
  option: MutableRecord,
): string {
  const facts = optionFacts(option);
  const [action, ...details] = facts;
  if (style === 'caveman_prose') {
    return `${label} [${optionId}]. ${details.join('; ')}.`;
  }
  const article = action?.startsWith('use ') === true ? 'a' : /^[aeiou]/iu.test(action ?? '') ? 'an' : 'a';
  return `${label} [${optionId}] is ${article} ${action ?? 'advertised'} option. ${details.join('; ')}.`;
}

function statusText(style: ProseRendererFormat, actorId: string, status: MutableRecord | null): string {
  if (status === null) return `Actor ${actorId}. Status unavailable.`;
  const readiness = [
    `${String(status['movement_feet'])} ft movement`,
    status['action_available'] === true ? 'action ready' : 'action spent',
    status['bonus_action_available'] === true ? 'bonus action ready' : 'bonus action spent',
    status['reaction_available'] === true ? 'reaction ready' : 'reaction spent',
    `effects ${listed(status['effect_tags'])}`,
    `pending decisions ${listed(status['pending_decision_ids'])}`,
  ];
  return style === 'caveman_prose'
    ? `Actor ${actorId}. ${String(status['life'])}. ${String(status['hit_point_band'])}. ${readiness.join('. ')}.`
    : `Actor ${actorId} is ${String(status['life'])} and ${String(status['hit_point_band'])}. It has ${readiness.join('; ')}.`;
}

function commonRowFact(rows: readonly MutableRecord[], key: string): unknown | undefined {
  if (rows.length === 0) return undefined;
  const first = rows[0]?.[key];
  return rows.every((row) => row[key] === first) ? first : undefined;
}

function verdictGroupText(style: ProseRendererFormat, rows: readonly MutableRecord[]): string {
  const first = rows[0];
  if (first === undefined) return 'No target verdicts.';
  const action = first['action_id'] === null || first['action_id'] === undefined
    ? 'An action'
    : words(String(first['action_id']));
  const actionName = action[0]?.toUpperCase() + action.slice(1);
  const kind = String(first['kind']);
  const targetFacts = rows.map((row) => {
    const facts = [String(row['target_id'])];
    if (typeof row['distance_feet'] === 'number') facts.push(`${String(row['distance_feet'])} ft away`);
    else facts.push('distance unknown');
    if (typeof row['movement_need_feet'] === 'number' && row['movement_need_feet'] !== 0) {
      facts.push(`${String(row['movement_need_feet'])} ft movement needed`);
    }
    if (row['p_hit'] !== null && row['p_hit'] !== undefined) facts.push(`hit chance ${String(row['p_hit'])}`);
    if (row['ev'] !== null && row['ev'] !== undefined) facts.push(`EV ${String(row['ev'])}`);
    if (typeof row['attacks'] === 'number') facts.push(`${String(row['attacks'])} attacks`);
    return facts.join(', ');
  });
  const commonFacts: string[] = [];
  const visibility = commonRowFact(rows, 'visibility');
  if (visibility !== undefined) commonFacts.push(`All targets are ${String(visibility).toLowerCase()}`);
  const cover = commonRowFact(rows, 'cover');
  if (cover !== undefined) commonFacts.push(`Cover is ${String(cover).toLowerCase()} for all`);
  const range = commonRowFact(rows, 'range');
  if (range !== undefined) {
    const rangeText = String(range).toLowerCase() === 'out' ? 'out of range' : `at ${String(range).toLowerCase()} range`;
    commonFacts.push(`All are ${rangeText}`);
  }
  const rollMode = commonRowFact(rows, 'roll_mode');
  if (rollMode !== undefined) commonFacts.push(`All rolls are ${String(rollMode).toLowerCase()}`);
  const movementNeed = commonRowFact(rows, 'movement_need_feet');
  if (movementNeed === 0) commonFacts.push('No movement is needed');
  const unresolvedHit = rows.every((row) => row['p_hit'] === null || row['p_hit'] === undefined);
  const unresolvedEv = rows.every((row) => row['ev'] === null || row['ev'] === undefined);
  const unresolved = unresolvedHit && unresolvedEv
    ? kind === 'approach'
      ? 'Numbers are unknown until closer'
      : 'Hit chance and EV are unknown'
    : unresolvedHit
      ? 'Hit chance is unknown'
      : unresolvedEv
        ? 'EV is unknown'
        : null;
  if (unresolved !== null) commonFacts.push(unresolved);
  if (style === 'caveman_prose') {
    const lead = kind === 'approach' ? `${actionName} needs approach first.` : `${actionName}.`;
    return `${lead} ${targetFacts.join('. ')}. ${commonFacts.join('. ')}.`;
  }
  const lead = kind === 'approach'
    ? `${actionName} needs an approach before it can land.`
    : `${actionName} can be considered against these targets.`;
  return `${lead} ${targetFacts.join('; ')}. ${commonFacts.join('; ')}.`;
}

function movementText(style: ProseRendererFormat, rowValue: unknown): string {
  const row = record(rowValue);
  if (row === null) return 'Movement note unavailable.';
  const before = record(row['before']);
  const after = record(row['after']);
  const move = typeof row['move_feet'] === 'number' ? `${String(row['move_feet'])} ft` : 'an unknown distance';
  const action = words(String(row['action_id']));
  const target = String(row['target_id']);
  const range = after === null
    ? 'Range after moving is unknown'
    : before?.['range'] === after['range']
      ? `Range stays ${String(after['range']).toLowerCase()}`
      : `Range changes from ${String(before?.['range']).toLowerCase()} to ${String(after['range']).toLowerCase()}`;
  const roll = after === null
    ? 'Roll after moving is unknown'
    : before?.['roll'] === after['roll']
      ? `Roll stays ${String(after['roll']).toLowerCase()}`
      : `Roll changes from ${String(before?.['roll']).toLowerCase()} to ${String(after['roll']).toLowerCase()}`;
  const beforeEv = before?.['ev'];
  const afterEv = after?.['ev'];
  const ev = beforeEv === null && afterEv === null
    ? 'EV stays unknown'
    : `EV changes from ${String(beforeEv ?? 'unknown')} to ${String(afterEv ?? 'unknown')}`;
  const risk = row['opportunity_risk'] === 'none' && row['hazard_risk'] === 'none'
    ? 'No opportunity or hazard risk'
    : `Opportunity risk is ${String(row['opportunity_risk'])}. Hazard risk is ${String(row['hazard_risk'])}`;
  return style === 'caveman_prose'
    ? `Move ${move} toward ${target} for ${action}. ${range}. ${roll}. ${ev}. ${risk}. Attack timing ${String(row['attack_eta'])}.`
    : `Move ${move} toward ${target} to set up ${action}. ${range}; ${roll}; ${ev.toLowerCase()}. ${risk}. The attack timing is ${String(row['attack_eta'])}.`;
}

function opportunityText(
  style: ProseRendererFormat,
  actorId: string,
  value: unknown,
  options: readonly MutableRecord[],
  references: ReadonlyMap<string, string>,
): string {
  const opportunity = record(value);
  if (opportunity === null) return `No opportunity note for ${actorId}.`;
  const labelFor = (id: unknown, fallback: string): string => {
    const exactId = typeof id === 'string' ? resolveOptionReference(id, references) : id;
    const match = options.find((option) => exactOptionId(option, references) === exactId);
    return typeof match?.['label'] === 'string' ? cleanClause(match['label']) : fallback;
  };
  const dodge = typeof opportunity['dodge_option_label'] === 'string'
    ? cleanClause(opportunity['dodge_option_label'])
    : labelFor(opportunity['dodge_option_id'], 'Dodge');
  const better = typeof opportunity['better_option_label'] === 'string'
    ? cleanClause(opportunity['better_option_label'])
    : labelFor(opportunity['better_option_id'], 'the better option');
  if (opportunity['status'] === 'dominated' &&
    (typeof opportunity['better_option_id'] === 'string' || typeof opportunity['better_option_label'] === 'string')) {
    return style === 'caveman_prose'
      ? `${dodge} is worse than ${better}. Every metric is equal or better. Overriding needs a typed reason.`
      : `${dodge} is dominated by ${better} — no metric favors it; keeping it would need a typed override reason.`;
  }
  return style === 'caveman_prose'
    ? `${dodge} has no clear better option. Use the engine default.`
    : `${dodge} is not dominated by another advertised option, so the engine default remains reasonable.`;
}

function threatText(style: ProseRendererFormat, actorId: string, threatValue: unknown): string {
  const threat = record(threatValue);
  if (threat === null) return `Threat for ${actorId} unavailable.`;
  const source = String(threat['source_id']);
  const kinds = array(threat['kinds']).map((kind) => words(String(kind))).join(' and ');
  const distance = String(threat['distance_band']);
  const reach = threat['can_reach_now'] === true ? 'can reach now' : 'cannot reach now';
  const visibility = threat['visible'] === true ? 'visible' : 'not visible';
  return style === 'caveman_prose'
    ? `Threat ${source}. ${kinds} threat. ${distance} away. ${reach}. ${visibility}.`
    : `${source} is a ${visibility} ${kinds} threat to ${actorId}. It is ${distance} away and ${reach}.`;
}

function actorSegments(
  actor: MutableRecord,
  actorIndex: number,
  style: ProseRendererFormat,
  references: ReadonlyMap<string, string>,
): readonly ProseSegment[] {
  const actorId = String(actor['actor_id']);
  const group = `actor:${String(actorIndex)}:${actorId}`;
  const segments: ProseSegment[] = [];
  const options = array(actor['options']).flatMap((value) => {
    const option = record(value);
    return option === null ? [] : [option];
  });
  const opportunity = record(record(actor['intel'])?.['opportunity_cost']);
  const renderedDefaultOptionId = opportunity?.['engine_default_option_id'];
  const defaultOptionId = typeof renderedDefaultOptionId === 'string'
    ? resolveOptionReference(renderedDefaultOptionId, references)
    : renderedDefaultOptionId;
  const defaultOptionIndex = typeof defaultOptionId === 'string'
    ? options.findIndex((option) => exactOptionId(option, references) === defaultOptionId)
    : -1;
  const renderedDominatedDodgeId = opportunity?.['status'] === 'dominated'
    ? opportunity['dodge_option_id']
    : null;
  const dominatedDodgeId = typeof renderedDominatedDodgeId === 'string'
    ? resolveOptionReference(renderedDominatedDodgeId, references)
    : renderedDominatedDodgeId;
  const protectedOptionIndices = new Set<number>([
    defaultOptionIndex >= 0 ? defaultOptionIndex : 0,
  ]);
  const alternativeIndex = options.findIndex((option, index) =>
    !protectedOptionIndices.has(index) && exactOptionId(option, references) !== dominatedDodgeId);
  if (alternativeIndex >= 0) protectedOptionIndices.add(alternativeIndex);
  segments.push({
    group,
    priority: 90,
    protected: false,
    text: statusText(style, actorId, record(actor['status'])),
    compactText: `Actor ${actorId}.`,
  });
  segments.push({
    group,
    priority: 120,
    protected: true,
    text: `Actor ${actorId} options omitted for size: none.`,
    compactText: `Actor ${actorId} options omitted for size: none.`,
    actorOmissionDeclaration: actorId,
  });
  options.forEach((option, optionIndex) => {
    const optionId = exactOptionId(option, references);
    if (optionId === null) return;
    const label = typeof option['label'] === 'string'
      ? option['label']
      : typeof option['action_id'] === 'string'
        ? words(option['action_id'])
        : 'Option';
    segments.push({
      group,
      priority: optionIndex === defaultOptionIndex ? 105 : protectedOptionIndices.has(optionIndex) ? 99 : 70 - optionIndex,
      protected: protectedOptionIndices.has(optionIndex),
      text: optionText(style, label, optionId, option),
      compactText: `${label} [${optionId}]. Actor ${actorId}.`,
      actorOption: { actorId, optionId: engineOptionId(optionId) },
    });
  });
  const threats = array(actor['threats']);
  threats.forEach((threat, index) => segments.push({
    group,
    priority: 48 - index,
    protected: false,
    text: threatText(style, actorId, threat),
    compactText: `Threat ${String(index + 1)} for ${actorId}.`,
  }));
  if (actor['threat_summary'] !== undefined) segments.push({
    group,
    priority: 52,
    protected: false,
    text: proseSegmentText(style, `Threat summary for ${actorId}`, flatClauses(actor['threat_summary'])),
    compactText: `Threat summary for ${actorId}.`,
  });
  const intel = record(actor['intel']);
  if (intel !== null) {
    const rows = array(intel['rows']).flatMap((rowValue) => {
      const row = record(rowValue);
      return row === null ? [] : [row];
    });
    const rowGroups = new Map<string, MutableRecord[]>();
    for (const row of rows) {
      const key = `${String(row['action_id'])}:${String(row['kind'])}`;
      const groupRows = rowGroups.get(key) ?? [];
      groupRows.push(row);
      rowGroups.set(key, groupRows);
    }
    [...rowGroups.values()].forEach((groupRows, index) => segments.push({
      group,
      priority: 76 - index,
      protected: false,
      text: verdictGroupText(style, groupRows),
      compactText: `Target advice ${String(index + 1)} for ${actorId}.`,
    }));
    const movement = array(intel['movement']);
    movement.forEach((row, index) => segments.push({
      group,
      priority: 66 - index,
      protected: false,
      text: movementText(style, row),
      compactText: `Movement note ${String(index + 1)} for ${actorId}.`,
    }));
    if (intel['opportunity_cost'] !== null && intel['opportunity_cost'] !== undefined) segments.push({
      group,
      priority: 82,
      protected: false,
      text: opportunityText(style, actorId, intel['opportunity_cost'], options, references),
      compactText: `Opportunity note for ${actorId}.`,
    });
    const zeroMovement = String(intel['zero_movement_offense_count'] ?? 'unknown');
    const salient = intel['salient_window'] === null || intel['salient_window'] === undefined
      ? 'No salient initiative window'
      : `Salient initiative window: ${String(intel['salient_window'])}`;
    segments.push({
      group,
      priority: 62,
      protected: false,
      text: style === 'caveman_prose'
        ? `${zeroMovement} offense rows need no movement. ${salient}.`
        : `${actorId} has ${zeroMovement} offense rows that need no movement. ${salient}.`,
      compactText: `Tactical note for ${actorId}.`,
    });
  }
  return segments;
}

function topLevelPriority(key: string): number {
  switch (key) {
    case 'summary': return 88;
    case 'current_plan':
    case 'materiality': return 84;
    case 'suggested_plan': return 78;
    case 'team_plan_frontier': return 58;
    case 'applicable_plays': return 54;
    case 'known_failure_modes': return 44;
    case 'recent_changes': return 38;
    case 'actor_knowledge':
    case 'reaction_spend_hold': return 34;
    case 'legendary_windows':
    case 'recovery_capabilities':
    case 'search_memory':
    case 'alert_state': return 30;
    case 'applicable_skills': return 20;
    default: return 42;
  }
}

function advertisedSurfaceText(
  style: ProseRendererFormat,
  kind: 'play' | 'skill',
  value: unknown,
): string {
  const item = record(value);
  if (item === null) return `No ${kind}.`;
  const name = String(item['name'] ?? item['id']);
  const description = cleanClause(item['description'] ?? item['label']);
  if (style === 'caveman_prose') {
    return `${kind === 'play' ? 'Plan' : 'Tactic'} ${words(name)}. ${description}.`;
  }
  return `The ${words(name)} ${kind} recommends this: ${description}.`;
}

function actorKnowledgeText(style: ProseRendererFormat, value: unknown): string {
  const knowledge = record(value);
  if (knowledge === null || array(knowledge['actors']).length === 0) return 'No actor knowledge notes.';
  const notes = array(knowledge['actors']).flatMap((actorValue) => {
    const actor = record(actorValue);
    if (actor === null) return [];
    const targets = array(actor['targets']).flatMap((targetValue) => {
      const target = record(targetValue);
      if (target === null) return [];
      return [String(target['target_id'])];
    });
    const lastSeenSentences = array(actor['targets']).flatMap((targetValue) => {
      const target = record(targetValue);
      const lastSeen = record(target?.['last_seen']);
      const position = record(lastSeen?.['lastSeenPosition']);
      return lastSeen?.['status'] === 'resolved' && position !== null
        ? [`${String(actor['actor_id'])} last saw ${String(target?.['target_id'])} at cell (${String(position['column'])}, ${String(position['row'])}).`]
        : [];
    });
    return [{ actorId: String(actor['actor_id']), targets, lastSeenSentences }];
  });
  const lastSeenText = notes.flatMap((note) => note.lastSeenSentences).join(' ');
  const sharedTargets = notes[0]?.targets;
  const allShared = sharedTargets !== undefined && notes.every((note) =>
    note.targets.length === sharedTargets.length && note.targets.every((target, index) => target === sharedTargets[index]));
  if (allShared) {
    const shared = style === 'caveman_prose'
      ? `Actor knowledge. All ${String(notes.length)} actors perceive ${sharedTargets.join(', ')}.`
      : `Actor knowledge is shared: all ${String(notes.length)} actors perceive ${sharedTargets.join(', ')}.`;
    return lastSeenText.length === 0 ? shared : `${shared} ${lastSeenText}`;
  }
  const individual = notes.map((note) => `${note.actorId} perceives ${note.targets.join(', ')}`);
  const differentiated = style === 'caveman_prose'
    ? `Actor knowledge. ${individual.join('. ')}.`
    : `Actor knowledge differs by actor. ${individual.join('. ')}.`;
  return lastSeenText.length === 0 ? differentiated : `${differentiated} ${lastSeenText}`;
}

function legendaryText(style: ProseRendererFormat, value: unknown): string {
  const legendary = record(value);
  if (legendary === null) return 'No legendary window data.';
  const notes: string[] = [];
  for (const actorValue of array(legendary['actors'])) {
    const actor = record(actorValue);
    if (actor === null) continue;
    const actionUses = record(actor['action_uses']);
    const resistanceUses = record(actor['resistance_uses']);
    const nextWindow = record(actor['next_window']);
    notes.push(
      `${String(actor['name'])} has ${String(actionUses?.['remaining'])} of ${String(actionUses?.['maximum'])} legendary actions and ${String(resistanceUses?.['remaining'])} of ${String(resistanceUses?.['maximum'])} resistances`,
      nextWindow?.['status'] === 'unresolved' ? 'The next legendary window is unknown' : `The next legendary window is ${String(nextWindow?.['status'])}`,
      actor['pending_window'] === null ? 'No legendary window is pending' : 'A legendary window is pending',
    );
  }
  for (const spend of array(legendary['resistance_spend_inputs'])) {
    notes.push(`resistance decision ${flatClauses(spend).join(', ')}`);
  }
  if (array(legendary['actors']).length === 0 && Array.isArray(legendary['compact'])) {
    notes.push(`summary ${listed(legendary['compact'])}`);
  }
  return style === 'caveman_prose'
    ? `Legendary actions. ${notes.join('. ')}.`
    : `Legendary-action coaching: ${notes.join('. ')}.`;
}

function teamFrontierText(style: ProseRendererFormat, value: unknown): string {
  const frontier = record(value);
  if (frontier === null) return 'No team plan frontier.';
  const plans: string[] = [];
  const unknowns = new Set<string>();
  for (const candidateValue of array(frontier['candidates'])) {
    const candidate = record(candidateValue);
    if (candidate === null) continue;
    const name = words(String(candidate['candidate_id']));
    plans.push(`${name[0]?.toUpperCase() + name.slice(1)}: ${cleanClause(candidate['label'] ?? '')}`);
    for (const metric of array(candidate['unresolved_metrics'])) unknowns.add(words(String(metric)));
  }
  const unresolved = [...unknowns];
  return style === 'caveman_prose'
    ? `Team plans remain open. ${plans.join('. ')}.` +
      (unresolved.length === 0 ? '' : ` Still unknown: ${unresolved.join(', ')}.`)
    : `The team plan is still open. ${plans.join('. ')}.` +
      (unresolved.length === 0 ? '' : ` The unresolved measures are ${unresolved.join(' and ')}.`);
}

function topSurfaceText(
  style: ProseRendererFormat,
  key: string,
  value: unknown,
  index: number,
): string {
  switch (key) {
    case 'recent_changes': return Array.isArray(value) && value.length === 0
      ? 'No recent changes.'
      : proseSegmentText(style, `Recent change ${String(index + 1)}`, flatClauses(value));
    case 'actor_knowledge': return actorKnowledgeText(style, value);
    case 'reaction_spend_hold': {
      const windows = array(record(value)?.['windows']);
      return windows.length === 0
        ? 'No reaction spend-or-hold windows.'
        : proseSegmentText(style, 'Reaction spend-or-hold windows', flatClauses(windows));
    }
    case 'legendary_windows': return legendaryText(style, value);
    case 'recovery_capabilities': {
      const targets = array(record(value)?.['targets']);
      return targets.length === 0
        ? 'No recovery capabilities matter now.'
        : proseSegmentText(style, 'Recovery capabilities', flatClauses(targets));
    }
    case 'search_memory': {
      const memories = array(record(value)?.['memories']);
      return memories.length === 0
        ? 'No search memories.'
        : proseSegmentText(style, 'Search memories', flatClauses(memories));
    }
    case 'alert_state': {
      const alert = record(value);
      if (alert === null) return 'No alert state.';
      const sound = record(alert['sound_propagation']);
      const callState = array(alert['calls']).length === 0 ? 'No help calls are active' : 'Help calls are active';
      const joinState = array(alert['joined']).length === 0 ? 'No one is joining now' : 'Reinforcements are joining';
      return style === 'caveman_prose'
        ? `Alert state. A help call carries ${String(alert['yelling_distance_feet'])} ft. Sound spreads ${words(String(sound?.['kind']))}. Occlusion is ${words(String(sound?.['occlusion']))}. ${callState}. ${joinState}.`
        : `Alert coaching: a help call carries ${String(alert['yelling_distance_feet'])} ft, and sound spreads ${words(String(sound?.['kind']))}. Occlusion is ${words(String(sound?.['occlusion']))}. ${callState}. ${joinState}.`;
    }
    case 'applicable_plays': return advertisedSurfaceText(style, 'play', value);
    case 'applicable_skills': return advertisedSurfaceText(style, 'skill', value);
    case 'team_plan_frontier': return teamFrontierText(style, value);
    default: {
      const subject = `${words(key)}${index > 0 ? ` ${String(index + 1)}` : ''}`;
      return proseSegmentText(style, subject[0]?.toUpperCase() + subject.slice(1), flatClauses(value));
    }
  }
}

function topLevelSegments(
  context: Readonly<Record<string, unknown>>,
  style: ProseRendererFormat,
): readonly ProseSegment[] {
  const segments: ProseSegment[] = [];
  const summary = record(context['summary']);
  if (summary !== null) {
    const terrain = array(summary['terrain_tags']).map((tag) => words(String(tag))).join(' and ') || 'open ground';
    const hurt = renderedActors(context).flatMap((actor) => {
      const status = record(actor['status']);
      return status === null || status['hit_point_band'] === 'uninjured'
        ? []
        : [`${String(actor['actor_id'])} is ${String(status['hit_point_band'])}`];
    });
    const actorCount = renderedActors(context).length;
    const health = hurt.length === 0
      ? `All ${String(actorCount)} required actors are uninjured`
      : `Hurt now: ${hurt.join('; ')}`;
    const firstPlay = array(context['applicable_plays']).map(record).find((play) => play !== null);
    const priority = firstPlay === undefined
      ? null
      : cleanClause(firstPlay['description'] ?? firstPlay['label']);
    const summaryText = style === 'caveman_prose'
      ? `Round ${String(summary['round'])}. Your side: ${String(summary['living_allies'])} allies. Enemy: ${String(summary['living_enemies'])} enemies. Terrain: ${terrain}. ${health}.` +
        (priority === null ? '' : ` What matters: ${priority}.`)
      : `Round ${String(summary['round'])}. Your side has ${String(summary['living_allies'])} allies against ${String(summary['living_enemies'])} enemies in ${terrain}. ${health}.` +
        (priority === null ? '' : ` The immediate priority is this: ${priority}.`);
    segments.push({
      group: 'opening', priority: 108, protected: false,
      text: summaryText, compactText: `Round ${String(summary['round'])}.`,
    });
  }
  const omitted = new Set([
    'granularity', 'context_trimmed', 'state_ref', 'request', 'summary', 'actors',
    'truncated', 'next_cursor', 'renderer_attribution',
  ]);
  for (const [key, value] of Object.entries(context)) {
    if (omitted.has(key) || value === undefined) continue;
    const values = Array.isArray(value) && value.some((entry) => record(entry) !== null)
      ? value
      : [value];
    values.forEach((entry, index) => {
      const subject = `${words(key)}${values.length > 1 ? ` ${String(index + 1)}` : ''}`;
      segments.push({
        group: 'top', priority: topLevelPriority(key) - index, protected: false,
        text: topSurfaceText(style, key, entry, index),
        compactText: `${subject[0]?.toUpperCase() + subject.slice(1)}.`,
      });
    });
  }
  return segments;
}

function referenceDataSegment(
  context: Readonly<Record<string, unknown>>,
  style: ProseRendererFormat,
): ProseSegment {
  const stateRef = record(context['state_ref']);
  const request = record(context['request']);
  const summary = record(context['summary']);
  const opportunityRuleCodes = new Set<string>();
  const parts = [
    `run ${String(stateRef?.['run_id'] ?? 'unknown')}`,
    `state handle ${String(stateRef?.['state_handle'] ?? 'unknown')}`,
    `revision ${String(stateRef?.['expected_revision'] ?? 'unknown')}`,
    `request ${String(request?.['request_id'] ?? 'unknown')}`,
    `kind ${String(request?.['kind'] ?? 'unknown')}`,
    `phase ${String(request?.['phase'] ?? 'unknown')}`,
    `correction ${String(request?.['correction_number'] ?? 'unknown')}`,
    `required actors ${listed(request?.['required_actor_ids'])}`,
    `room ${String(summary?.['room'] ?? 'unknown')}`,
    `active side ${String(summary?.['active_side'] ?? 'unknown')}`,
    `terrain tags ${listed(summary?.['terrain_tags'])}`,
  ];
  for (const key of ['applicable_plays', 'applicable_skills'] as const) {
    const kind = key === 'applicable_plays' ? 'play' : 'skill';
    const hashKey = kind === 'play' ? 'snippet_hash' : 'skill_hash';
    const values = Array.isArray(context[key]) ? array(context[key]) : [context[key]];
    for (const value of values) {
      const item = record(value);
      if (item === null) continue;
      const details = [
        `${kind} ${String(item['name'] ?? item['id'])}`,
        ...(item[hashKey] === undefined ? [] : [`hash ${String(item[hashKey])}`]),
        ...(item['dominance_status'] === undefined ? [] : [`dominance ${String(item['dominance_status'])}`]),
        ...(item['override_status'] === undefined ? [] : [`override ${String(item['override_status'])}`]),
      ];
      parts.push(details.join(', '));
    }
  }
  for (const actor of renderedActors(context)) {
    const actorId = String(actor['actor_id']);
    const options = array(actor['options']).flatMap((value) => {
      const option = record(value);
      return option === null ? [] : [option];
    });
    const revisions = [...new Set(options.map((option) => option['revision']).filter((value) => value !== undefined))];
    if (revisions.length > 0) parts.push(`${actorId} option revisions ${revisions.map(String).join(', ')}`);
    for (const option of options) {
      const optionId = typeof option['option_id'] === 'string' ? option['option_id'] : String(option['option_ref']);
      const expectation = record(option['expectation']);
      const assumptions = array(expectation?.['assumption_codes']);
      const refusalCodes = array(option['refusals']).flatMap((value) => {
        const refusal = record(value);
        return refusal === null || refusal['code'] === undefined ? [] : [String(refusal['code'])];
      });
      if (assumptions.length > 0 || refusalCodes.length > 0) {
        parts.push([
          `option ${optionId}`,
          ...(assumptions.length === 0 ? [] : [`assumptions ${listed(assumptions)}`]),
          ...(refusalCodes.length === 0 ? [] : [`refusals ${refusalCodes.join(', ')}`]),
        ].join(', '));
      }
    }
    for (const threatValue of array(actor['threats'])) {
      const threat = record(threatValue);
      if (threat !== null && array(threat['note_codes']).length > 0) {
        parts.push(`threat ${actorId}/${String(threat['source_id'])} codes ${listed(threat['note_codes'])}`);
      }
    }
    const intel = record(actor['intel']);
    const opportunity = record(intel?.['opportunity_cost']);
    if (opportunity !== null) {
      if (typeof opportunity['delta'] === 'string') {
        for (const match of opportunity['delta'].matchAll(/\b[A-Z]\d+\b/gu)) {
          const code = match[0];
          if (code !== undefined) opportunityRuleCodes.add(code);
        }
      }
      parts.push([
        `opportunity ${actorId}`,
        `dodge ${String(opportunity['dodge_option_id'] ?? opportunity['dodge_option_label'])}`,
        `default ${String(opportunity['engine_default_option_id'] ?? opportunity['engine_default_option_label'])}`,
        ...(opportunity['better_option_id'] === undefined && opportunity['better_option_label'] === undefined
          ? []
          : [`better ${String(opportunity['better_option_id'] ?? opportunity['better_option_label'])}`]),
        `status ${String(opportunity['status'])}`,
        ...(array(opportunity['reason_codes']).length === 0 ? [] : [`codes ${listed(opportunity['reason_codes'])}`]),
      ].join(', '));
    }
    for (const rowValue of array(intel?.['rows'])) {
      const row = record(rowValue);
      if (row === null) continue;
      const reasonCodes = array(row['reason_codes']);
      const consequenceCodes = array(row['consequence_codes']);
      if (reasonCodes.length > 0 || consequenceCodes.length > 0) {
        parts.push([
          `row ${actorId}/${String(row['target_id'])}/${String(row['action_id'])}`,
          ...(reasonCodes.length === 0 ? [] : [`reasons ${listed(reasonCodes)}`]),
          ...(consequenceCodes.length === 0 ? [] : [`consequences ${listed(consequenceCodes)}`]),
        ].join(', '));
      }
    }
    for (const movementValue of array(intel?.['movement'])) {
      const movement = record(movementValue);
      if (movement !== null) {
        parts.push(`movement ${actorId}/${String(movement['target_id'])}/${String(movement['action_id'])} semantic ${String(movement['semantic'])}`);
      }
    }
  }
  if (opportunityRuleCodes.size > 0) parts.push(`opportunity source rules ${[...opportunityRuleCodes].join(', ')}`);
  const legendary = record(context['legendary_windows']);
  if (legendary !== null) {
    if (typeof legendary['reason'] === 'string') parts.push(`legendary reason ${legendary['reason']}`);
    for (const actorValue of array(legendary['actors'])) {
      const actor = record(actorValue);
      const nextWindow = record(actor?.['next_window']);
      if (actor !== null && nextWindow !== null && typeof nextWindow['reason'] === 'string') {
        parts.push(`legendary next window ${String(actor['combatant'])} reason ${nextWindow['reason']}`);
      }
    }
  }
  const frontier = record(context['team_plan_frontier']);
  if (frontier !== null) {
    parts.push(`frontier resolution ${String(frontier['frontier_resolution'])}`);
    for (const candidateValue of array(frontier['candidates'])) {
      const candidate = record(candidateValue);
      if (candidate === null) continue;
      parts.push([
        `candidate ${String(candidate['candidate_id'])}`,
        `status ${String(candidate['status'])}`,
        ...(array(candidate['unresolved_metrics']).length === 0 ? [] : [`unresolved ${listed(candidate['unresolved_metrics'])}`]),
        ...(array(candidate['reason_codes']).length === 0 ? [] : [`reasons ${listed(candidate['reason_codes'])}`]),
      ].join(', '));
    }
  }
  const text = style === 'caveman_prose'
    ? `Reference data. ${parts.join('; ')}.`
    : `Reference data: ${parts.join('; ')}.`;
  const compactParts = parts.slice(0, 8);
  const compactText = style === 'caveman_prose'
    ? `Reference data. ${compactParts.join('; ')}.`
    : `Reference data: ${compactParts.join('; ')}.`;
  return {
    group: 'reference',
    priority: 110,
    protected: true,
    text,
    compactText,
  };
}

function proseDocument(segments: readonly ProseSegment[]): string {
  const groups: string[] = [];
  const grouped = new Map<string, string[]>();
  for (const segment of segments) {
    if (!grouped.has(segment.group)) groups.push(segment.group);
    const entries = grouped.get(segment.group) ?? [];
    entries.push(segment.text);
    grouped.set(segment.group, entries);
  }
  return groups.map((group) => grouped.get(group)?.join('\n') ?? '')
    .filter((value) => value.length > 0)
    .join('\n\n')
    .replace(/\.{2,}/gu, '.');
}

function trimProseSegments(
  segments: readonly ProseSegment[],
  maximumBytes: number,
): { readonly segments: readonly ProseSegment[]; readonly trimmed: boolean } {
  let retained = [...segments];
  let trimmed = false;
  const removable = retained
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => !segment.protected)
    .sort((left, right) => left.segment.priority - right.segment.priority || right.index - left.index);
  for (const candidate of removable) {
    if (proseBytes(proseDocument(retained)) <= maximumBytes) break;
    retained = retained.filter((segment) => segment !== candidate.segment);
    trimmed = true;
  }
  if (proseBytes(proseDocument(retained)) > maximumBytes) {
    retained = retained.map((segment) => segment.protected && segment.text !== segment.compactText
      ? { ...segment, text: segment.compactText }
      : segment);
    trimmed = true;
  }
  return { segments: retained, trimmed };
}

export function renderProseTurnContext(
  structuredContext: Readonly<Record<string, unknown>>,
  style: ProseRendererFormat,
  optionReferences: ReadonlyMap<string, string>,
  maximumBytes: number,
): RenderedProseTurnContext {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new RangeError('maximumBytes must be a positive safe integer.');
  }
  const topSegments = topLevelSegments(structuredContext, style);
  const segments = [
    ...topSegments.filter((segment) => segment.group === 'opening'),
    ...renderedActors(structuredContext).flatMap((actor, index) =>
      actorSegments(actor, index, style, optionReferences)),
    ...topSegments.filter((segment) => segment.group !== 'opening'),
    referenceDataSegment(structuredContext, style),
  ];
  const untrimmedDocument = proseDocument(segments);
  const trimmed = trimProseSegments(segments, maximumBytes);
  const shownOptionIdsByActor = new Map<string, ReadonlySet<EngineOptionId>>();
  for (const actor of renderedActors(structuredContext)) {
    shownOptionIdsByActor.set(String(actor['actor_id']), new Set());
  }
  for (const segment of trimmed.segments) {
    if (segment.actorOption === undefined) continue;
    const current = new Set(shownOptionIdsByActor.get(segment.actorOption.actorId) ?? []);
    current.add(segment.actorOption.optionId);
    shownOptionIdsByActor.set(segment.actorOption.actorId, current);
  }
  const catalog = optionCatalog(structuredContext, optionReferences);
  const hidden = catalog.filter((entry) =>
    !shownOptionIdsByActor.get(entry.actorId)?.has(entry.optionId));
  const optionsOmittedForSizeByActor = [...shownOptionIdsByActor.keys()].map((actorId) => ({
    actorId,
    count: hidden.filter((entry) => entry.actorId === actorId).length,
  }));
  const declaredSegments = trimmed.segments.map((segment) => {
    if (segment.actorOmissionDeclaration === undefined) return segment;
    const omitted = catalog.filter((entry) => entry.actorId === segment.actorOmissionDeclaration &&
      !shownOptionIdsByActor.get(entry.actorId)?.has(entry.optionId)).length;
    const declaration = `Actor ${segment.actorOmissionDeclaration} options omitted for size: ${omitted === 0 ? 'none' : String(omitted)}.`;
    return { ...segment, text: declaration, compactText: declaration };
  });
  const document = hidden.reduce((text, entry) => text.replaceAll(entry.optionId, entry.label),
    proseDocument(declaredSegments));
  const sourceTrimmed = structuredContext['context_trimmed'] === true || structuredContext['truncated'] === true;
  const contextTrimmed = sourceTrimmed || trimmed.trimmed;
  const context = {
    format: style,
    granularity: 'full' as const,
    context_trimmed: contextTrimmed,
    state_ref: structuredContext['state_ref'],
    request: structuredContext['request'],
    document,
    ...(structuredContext['renderer_attribution'] === undefined
      ? {}
      : { renderer_attribution: structuredContext['renderer_attribution'] }),
    truncated: contextTrimmed,
    next_cursor: null,
  };
  return {
    context,
    shownOptionIdsByActor,
    preTrimBytes: proseBytes(untrimmedDocument),
    postTrimBytes: proseBytes(document),
    optionsOmittedForSizeByActor,
  };
}
