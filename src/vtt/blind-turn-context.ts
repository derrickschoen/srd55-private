import { canonicalJson } from '../commands/canonical-json';
import { z } from 'zod';
import { effectiveCombatRules } from '../combat/combat-rules';
import type { EncounterState } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import type {
  MonsterBonusAction,
  MonsterSpellcastingAction,
  MonsterStatblock,
} from '../combat/statblock';
import { BUNDLED_MONSTER_ROSTER } from '../combat/statblocks/roster';
import { spellDefinition } from '../combat/spells/definitions';
import { sha256 } from '../crypto/sha256';
import { projectDmView } from '../combat/visibility';
import {
  BLIND_INTENT_VERSION,
  type DmMode,
} from './blind-dm-contract';
import {
  assignCreatureBadges,
  hpBandLabel,
  hpBandOf,
} from './board-chrome';
import { projectEncounterBoard } from './encounter-board';
import { engineStateHandle, type EngineStateCapsule } from './engine-state-capsule';
import type { EngineQueryPort } from './engine-query-port';
import {
  SEMANTIC_BOARD_FORMAT,
  semanticBoardPayload,
  type EngineSemanticBoardProjection,
  type SemanticBoardPayload,
} from './semantic-board-payload';

export const BLIND_TURN_CONTEXT_VERSION = 'blind-turn-context-v1' as const;
export const BLIND_LEGAL_MOVEMENT_VERSION = 'canonical-path-v1' as const;
export const BLIND_TURN_CONTEXT_MAX_BYTES = 65_536 as const;
export const BLIND_SEMANTIC_BOARD_MAX_BYTES = 8_192 as const;
export const BLIND_FULL_CONTEXT_REQUIRED = 'BLIND_FULL_CONTEXT_REQUIRED' as const;

export type BlindHpBand = ReturnType<typeof hpBandLabel>;

export interface BlindTurnContextBudgetEvidence {
  readonly configuredBaseBytes: typeof BLIND_TURN_CONTEXT_MAX_BYTES;
  readonly configuredSemanticBytes: typeof BLIND_SEMANTIC_BOARD_MAX_BYTES;
  readonly actualBaseBytes: number;
  readonly actualSemanticBytes: number;
  readonly truncatedBlocks: readonly [];
}

export interface BlindTurnContextRenderResult {
  readonly context: BlindTurnContext;
  readonly budget: BlindTurnContextBudgetEvidence;
}

export interface BlindFullContextRequiredResult {
  readonly status: 'rejected';
  readonly code: typeof BLIND_FULL_CONTEXT_REQUIRED;
}

interface BoardDisplayIdentity {
  readonly name: string;
  readonly badge: number;
  readonly side: 'party' | 'foe';
  readonly hpBand: BlindHpBand;
}

function encodedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function boardDisplayIdentities(state: EncounterState): ReadonlyMap<string, BoardDisplayIdentity> {
  const board = projectEncounterBoard(projectDmView(state));
  const placed = board.combatants.filter(
    (combatant): combatant is Extract<typeof combatant, { readonly placementStatus: 'placed' }> =>
      combatant.placementStatus === 'placed',
  );
  const assignments = assignCreatureBadges(placed);
  return new Map(placed.map((combatant, index) => {
    const assignment = assignments[index];
    if (assignment === undefined) {
      throw new Error(`Board display omitted badge assignment for ${String(combatant.id)}.`);
    }
    return [combatant.id, {
      name: combatant.name,
      badge: assignment.number,
      side: combatant.kind === 'player_character' ? 'party' : 'foe',
      hpBand: hpBandLabel(hpBandOf(combatant.hitPointBand)),
    }] as const;
  }));
}

function spellcastingActions(statblock: MonsterStatblock): readonly MonsterSpellcastingAction[] {
  const actions = statblock.sourceDetails.actions.kind === 'present'
    ? statblock.sourceDetails.actions.value
    : [];
  const bonusActions: readonly MonsterBonusAction[] =
    statblock.sourceDetails.bonusActions.kind === 'present'
      ? statblock.sourceDetails.bonusActions.value
      : [];
  return [...actions, ...bonusActions].filter(
    (action): action is MonsterSpellcastingAction => action.kind === 'spellcasting',
  );
}

function referencedSpellDefinitions(statblock: MonsterStatblock): Readonly<Record<string, unknown>> {
  const ids = [...new Set(spellcastingActions(statblock)
    .flatMap((action) => action.spells.map((spell) => spell.id)))]
    .sort((left, right) => left.localeCompare(right));
  return Object.fromEntries(ids.map((id) => {
    const definition = spellDefinition(id);
    return [id, definition === null
      ? { availability: 'declared_by_statblock', definition: null }
      : structuredClone(definition)] as const;
  }));
}

function strictKnownJsonSchema(value: unknown): z.ZodType<unknown> {
  if (value === null) return z.null();
  if (Array.isArray(value)) {
    const itemSchemas = value.map(strictKnownJsonSchema);
    return z.array(z.unknown()).length(value.length).superRefine((items, context) => {
      for (const [index, item] of items.entries()) {
        const schema = itemSchemas[index];
        if (schema !== undefined && !schema.safeParse(item).success) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: 'Array item does not match its strict sourced shape.',
          });
        }
      }
    });
  }
  if (typeof value === 'object') {
    const shape = Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, strictKnownJsonSchema(entry)] as const));
    return z.strictObject(shape);
  }
  switch (typeof value) {
    case 'string': return z.string();
    case 'number': return z.number();
    case 'boolean': return z.boolean();
    default: return z.never();
  }
}

const identifierSchema = z.string().min(1);
const safeIntegerSchema = z.number().int().safe();
const nonNegativeIntegerSchema = safeIntegerSchema.nonnegative();
const positiveIntegerSchema = safeIntegerSchema.positive();

const blindDisplayIdentitySchema = z.strictObject({
  name: z.string(),
  badge: positiveIntegerSchema,
});

const blindRosterEntrySchema = blindDisplayIdentitySchema.extend({
  side: z.enum(['party', 'foe']),
  hp_band: z.enum(['UNINJURED', 'BLOODIED', 'NEAR DEATH', 'UNKNOWN']),
});

const blindInitiativeEntrySchema = blindRosterEntrySchema.extend({
  current: z.boolean(),
  delayed: z.boolean(),
});

const semanticCellSchema = z.union([
  z.tuple([nonNegativeIntegerSchema, nonNegativeIntegerSchema]),
  z.tuple([nonNegativeIntegerSchema, nonNegativeIntegerSchema, nonNegativeIntegerSchema]),
]);

const semanticFactList = <Schema extends z.ZodType>(item: Schema) => z.strictObject({
  provenance: z.literal('engine_fact'),
  items: z.array(item),
});

const semanticCellFactListSchema = z.strictObject({
  provenance: z.literal('engine_fact'),
  encoding: z.enum([
    '[column,row]',
    '[start_column,row,end_column_inclusive]; endpoint is inclusive',
  ]),
  items: z.array(semanticCellSchema),
});

const semanticCreatureSchema = z.strictObject({
  id: identifierSchema,
  name: z.string(),
  side: z.enum(['party', 'foe']),
  cell: z.tuple([nonNegativeIntegerSchema, nonNegativeIntegerSchema]).nullable(),
  footprint: z.array(z.tuple([nonNegativeIntegerSchema, nonNegativeIntegerSchema])),
  hp_band: z.enum(['uninjured', 'bloodied', 'near_death', 'unknown']),
  conditions: z.array(z.string()),
  hidden: z.boolean(),
  last_seen: z.tuple([nonNegativeIntegerSchema, nonNegativeIntegerSchema]).nullable(),
});

const semanticNamedCellsSchema = z.strictObject({
  id: identifierSchema,
  name: z.string(),
  cells: z.array(semanticCellSchema),
});

const semanticObjectSchema = semanticNamedCellsSchema.extend({ kind: z.string() });

const blindSemanticBoardSchema = z.strictObject({
  provenance: z.strictObject({
    kind: z.literal('engine_fact'),
    format: z.literal(SEMANTIC_BOARD_FORMAT),
    state_digest: z.string(),
  }),
  format: z.literal(SEMANTIC_BOARD_FORMAT),
  revision: positiveIntegerSchema,
  audience: z.literal('dm'),
  coordinates: z.strictObject({
    order: z.literal('column,row'),
    origin: z.literal('top_left'),
    indexing: z.literal('zero_based'),
    columns_increase: z.literal('right'),
    rows_increase: z.literal('down'),
    cell_list_encoding: z.literal('each cell list declares its encoding'),
  }),
  bounds: z.strictObject({
    columns: positiveIntegerSchema,
    rows: positiveIntegerSchema,
  }),
  creatures: semanticFactList(semanticCreatureSchema),
  cells: z.strictObject({
    blocked: semanticCellFactListSchema,
    difficult_terrain: semanticCellFactListSchema,
    light: z.strictObject({
      default_light: z.literal('bright'),
      default_applies_to: z.literal('cells not covered by dim or dark exception regions'),
      partition: z.literal('bright, dim, and dark together contain every board cell exactly once'),
      bright: semanticCellFactListSchema,
      dim: semanticCellFactListSchema,
      dark: semanticCellFactListSchema,
    }),
    obscurement: z.strictObject({
      light: semanticCellFactListSchema,
      heavy: semanticCellFactListSchema,
    }),
    obscured: semanticCellFactListSchema,
    fogged: semanticCellFactListSchema,
    obscured_or_fogged: semanticCellFactListSchema,
  }),
  doors: z.strictObject({
    open: semanticFactList(semanticNamedCellsSchema),
    closed: semanticFactList(semanticNamedCellsSchema),
  }),
  objects: semanticFactList(semanticObjectSchema),
  light_sources: semanticFactList(semanticObjectSchema),
  adjacency_pairs: semanticFactList(z.strictObject({
    first_id: identifierSchema,
    second_id: identifierSchema,
  })),
});

const blindStatblockFactsEntrySchema = z.strictObject({
  statblock: z.unknown(),
  referenced_spells: z.record(z.string(), z.unknown()),
}).superRefine((entry, context) => {
  if (typeof entry.statblock !== 'object' || entry.statblock === null || Array.isArray(entry.statblock)) {
    context.addIssue({ code: 'custom', path: ['statblock'], message: 'Statblock must be an object.' });
    return;
  }
  const id = (entry.statblock as Readonly<Record<string, unknown>>)['id'];
  const source = typeof id === 'string'
    ? BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === id)?.statblock
    : undefined;
  if (source === undefined) {
    context.addIssue({ code: 'custom', path: ['statblock'], message: 'Statblock is not a bundled sourced block.' });
    return;
  }
  const expected = {
    statblock: source,
    referenced_spells: referencedSpellDefinitions(source),
  };
  if (!strictKnownJsonSchema(expected).safeParse(entry).success ||
    canonicalJson(entry) !== canonicalJson(expected)) {
    context.addIssue({
      code: 'custom',
      message: 'Statblock facts must exactly match their recursively strict sourced value.',
    });
  }
});

const blindActiveRulesSchema = z.record(z.string().regex(/^rules:[a-f0-9]{64}$/u), z.unknown())
  .superRefine((entries, context) => {
    for (const [reference, rules] of Object.entries(entries)) {
      if (reference !== `rules:${sha256(canonicalJson(rules))}` ||
        !strictKnownJsonSchema(rules).safeParse(rules).success) {
        context.addIssue({
          code: 'custom',
          path: [reference],
          message: 'Active rules must match their recursively strict content address.',
        });
      }
    }
  });

const blindHpKnowledgeSchema = z.union([
  z.strictObject({
    kind: z.literal('displayed_band'),
    band: z.enum(['UNINJURED', 'BLOODIED', 'NEAR DEATH', 'UNKNOWN']),
  }),
  z.strictObject({
    kind: z.literal('exact'),
    current: safeIntegerSchema,
    maximum: positiveIntegerSchema,
    temporary: nonNegativeIntegerSchema,
  }),
]);

const blindRemainingResourcesSchema = z.strictObject({
  spell_slots: z.array(z.strictObject({
    level: z.number().int().min(1).max(9),
    remaining: nonNegativeIntegerSchema,
  })),
  limited_uses: z.array(z.strictObject({
    id: identifierSchema,
    maximum: nonNegativeIntegerSchema,
    remaining: nonNegativeIntegerSchema,
    recharge: z.enum(['short_rest', 'long_rest']),
  })),
  legendary_actions: nonNegativeIntegerSchema.nullable(),
  legendary_resistances: nonNegativeIntegerSchema.nullable(),
});

const blindCreatureActorSchema = blindDisplayIdentitySchema.extend({
  side: z.enum(['party', 'foe']),
  statblock_ref: identifierSchema.nullable(),
  active_rules_ref: z.string().regex(/^rules:[a-f0-9]{64}$/u),
  action_economy: z.strictObject({
    action_available: z.boolean(),
    bonus_action_available: z.boolean(),
    reaction_available: z.boolean(),
  }),
  movement_remaining_feet: nonNegativeIntegerSchema,
  conditions: z.array(z.union([
    z.strictObject({ name: z.string() }),
    z.strictObject({ name: z.string(), source: identifierSchema }),
    z.strictObject({ name: z.literal('Exhaustion'), level: z.number().int().min(1).max(6) }),
  ])),
  concentration: z.boolean(),
  hp_knowledge: blindHpKnowledgeSchema,
  remaining_resources: blindRemainingResourcesSchema.nullable(),
});

const blindCreatureFactsSchema = z.strictObject({
  provenance: z.strictObject({
    kind: z.literal('engine_fact'),
    rules_sources: z.array(z.strictObject({
      source_id: identifierSchema,
      license: identifierSchema,
      page_or_entry: z.string(),
    })),
  }),
  statblocks: z.record(identifierSchema, blindStatblockFactsEntrySchema),
  active_rules: blindActiveRulesSchema,
  actors: z.array(blindCreatureActorSchema),
});

const blindLegalMovementCellSchema = z.strictObject({
  label: z.string().regex(/^(?:0|[1-9]\d*),(?:0|[1-9]\d*)$/u),
  cost_feet: nonNegativeIntegerSchema,
});

const blindLegalMovementActorSchema = blindDisplayIdentitySchema.extend({
  movement_budget_feet: nonNegativeIntegerSchema,
  cells: z.array(blindLegalMovementCellSchema),
});

const blindLegalMovementSchema = z.strictObject({
  provenance: z.strictObject({
    kind: z.literal('engine_fact'),
    query: z.literal(BLIND_LEGAL_MOVEMENT_VERSION),
    state_digest: z.string(),
  }),
  actors: z.array(blindLegalMovementActorSchema),
});

export const blindVisualDescriptorSchema = z.strictObject({
  kind: z.enum(['dm_board', 'accessible_board_raster', 'player_board']),
  ordinal: positiveIntegerSchema,
  primer_version: identifierSchema,
  glyph_mode: identifierSchema,
  capture_tile_px: positiveIntegerSchema,
});
export type BlindVisualDescriptor = z.infer<typeof blindVisualDescriptorSchema>;

export const blindTurnContextSchema = z.strictObject({
  granularity: z.literal('full'),
  dm_mode: z.literal('blind'),
  state_ref: z.strictObject({
    run_id: identifierSchema,
    state_handle: identifierSchema,
    expected_revision: positiveIntegerSchema,
    state_digest: z.string(),
  }),
  request: z.strictObject({
    request_id: identifierSchema,
    phase: z.enum(['initial', 'correction']),
    required_actors: z.array(blindDisplayIdentitySchema),
  }),
  round: nonNegativeIntegerSchema,
  initiative: z.array(blindInitiativeEntrySchema),
  roster: z.array(blindRosterEntrySchema),
  semantic_board: blindSemanticBoardSchema,
  creature_facts: blindCreatureFactsSchema,
  legal_movement: blindLegalMovementSchema,
  visuals: z.array(blindVisualDescriptorSchema),
  intent_contract: z.literal(BLIND_INTENT_VERSION),
});

export type BlindTurnContext = z.infer<typeof blindTurnContextSchema>;
export type BlindCreatureFacts = z.infer<typeof blindCreatureFactsSchema>;
export type BlindCreatureActor = z.infer<typeof blindCreatureActorSchema>;
export type BlindLegalMovement = z.infer<typeof blindLegalMovementSchema>;
export type BlindLegalMovementActor = z.infer<typeof blindLegalMovementActorSchema>;
export type BlindLegalMovementCell = z.infer<typeof blindLegalMovementCellSchema>;
export type BlindSemanticBoard = z.infer<typeof blindSemanticBoardSchema>;

interface BlindRulesSourceEvidence {
  readonly source_id: string;
  readonly license: string;
  readonly page_or_entry: string;
}

function sourceEvidence(statblock: MonsterStatblock): readonly BlindRulesSourceEvidence[] {
  const provenance = statblock.provenance;
  switch (provenance.kind) {
    case 'srd_5_2_1_decoded':
      return provenance.source.map((source) => ({
        source_id: 'srd-5.2.1',
        license: 'CC-BY-4.0',
        page_or_entry: `${source.path}:${String(source.lineStart)}-${String(source.lineEnd)}`,
      }));
    case 'adapted_cc_by':
      return [{
        source_id: provenance.sourceId,
        license: provenance.attributionKey,
        page_or_entry: provenance.locator,
      }];
    case 'original_homebrew':
      return [{
        source_id: `project-original:${String(statblock.id)}`,
        license: 'project-original',
        page_or_entry: provenance.designNote,
      }];
    case 'external_import':
      return [{
        source_id: provenance.sourceId,
        license: 'external-import',
        page_or_entry: String(statblock.id),
      }];
  }
}

export function blindStatblockFacts(
  statblock: MonsterStatblock,
): z.infer<typeof blindStatblockFactsEntrySchema> {
  return {
    statblock: structuredClone(statblock),
    referenced_spells: referencedSpellDefinitions(statblock),
  };
}

function redactedPartyRules(state: EncounterState, actorId: EncounterState['combatants'][number]['profile']['id']): Readonly<Record<string, unknown>> {
  const rules = effectiveCombatRules(state, actorId);
  const {
    hitPointMaximum: _hitPointMaximum,
    spellSlots: _spellSlots,
    limitedResources: _limitedResources,
    ...visibleRules
  } = rules;
  return structuredClone(visibleRules);
}

function creatureFacts(
  state: EncounterState,
  capsule: EngineStateCapsule,
  displays: ReadonlyMap<string, BoardDisplayIdentity>,
): BlindCreatureFacts {
  const statblocks = new Map<string, z.infer<typeof blindStatblockFactsEntrySchema>>();
  const activeRules = new Map<string, unknown>();
  const rulesSources = new Map<string, BlindRulesSourceEvidence>();
  const actors = capsule.projection.combatants.map((actor): BlindCreatureActor => {
    const display = displays.get(actor.id);
    const stateActor = state.combatants.find((candidate) => candidate.profile.id === actor.id);
    if (display === undefined || stateActor === undefined) {
      throw new Error(`Blind creature facts cannot bind board actor ${String(actor.id)}.`);
    }
    const profile = stateActor.profile;
    const monsterStatblock = profile.kind === 'monster'
      ? BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === profile.statblockId)?.statblock
      : undefined;
    if (profile.kind === 'monster' && monsterStatblock === undefined) {
      throw new Error(`Blind creature facts cannot source statblock ${String(profile.statblockId)}.`);
    }
    if (monsterStatblock !== undefined && !statblocks.has(monsterStatblock.id)) {
      statblocks.set(monsterStatblock.id, blindStatblockFacts(monsterStatblock));
      for (const source of sourceEvidence(monsterStatblock)) {
        rulesSources.set(canonicalJson(source), source);
      }
    }
    const effectiveRules = profile.kind === 'monster'
      ? structuredClone(effectiveCombatRules(state, actor.id))
      : redactedPartyRules(state, actor.id);
    const activeRulesRef = `rules:${sha256(canonicalJson(effectiveRules))}`;
    activeRules.set(activeRulesRef, effectiveRules);
    const common = {
      name: display.name,
      badge: display.badge,
      side: display.side,
      statblock_ref: monsterStatblock?.id ?? null,
      active_rules_ref: activeRulesRef,
      action_economy: {
        action_available: actor.actionAvailable,
        bonus_action_available: actor.bonusActionAvailable,
        reaction_available: actor.reactionAvailable,
      },
      movement_remaining_feet: actor.movementRemainingFeet,
      conditions: [...actor.planning.conditionFlags],
      concentration: actor.planning.concentrating,
    };
    if (profile.kind === 'player_character') {
      return {
        ...common,
        hp_knowledge: { kind: 'displayed_band', band: display.hpBand },
        remaining_resources: null,
      };
    }
    return {
      ...common,
      hp_knowledge: {
        kind: 'exact',
        current: actor.hitPoints,
        maximum: actor.hitPointMaximum,
        temporary: actor.planning.temporaryHitPoints,
      },
      remaining_resources: {
        spell_slots: actor.planning.spellSlots.map((slot) => ({ ...slot })),
        limited_uses: (stateActor.limitedResources ?? []).map((resource) => ({ ...resource })),
        legendary_actions: actor.planning.legendaryActionUsesRemaining,
        legendary_resistances: actor.planning.legendaryResistanceUsesRemaining,
      },
    };
  });
  return {
    provenance: {
      kind: 'engine_fact',
      rules_sources: [...rulesSources.values()],
    },
    statblocks: Object.fromEntries([...statblocks.entries()].sort(([left], [right]) => left.localeCompare(right))),
    active_rules: Object.fromEntries([...activeRules.entries()].sort(([left], [right]) => left.localeCompare(right))),
    actors,
  };
}

function everyCell(bounds: EncounterState['bounds']): readonly GridCell[] {
  return Array.from({ length: bounds.rows }, (_row, row) =>
    Array.from({ length: bounds.columns }, (_column, column) => ({ column, row }))).flat();
}

function legalMovement(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
  displays: ReadonlyMap<string, BoardDisplayIdentity>,
): BlindLegalMovement {
  const required = capsule.request?.actors ?? [];
  const actors = required.map((actorId): BlindLegalMovementActor => {
    const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
    const display = displays.get(actorId);
    if (actor === undefined || display === undefined) {
      throw new Error(`Blind legal movement cannot bind required actor ${String(actorId)}.`);
    }
    const cells: BlindLegalMovementCell[] = everyCell(state.bounds).flatMap((destination): BlindLegalMovementCell[] => {
      const result = queries.path(state, {
        actorId,
        destination,
        movement: 'normal',
        maximumFeet: actor.movementRemainingFeet,
      });
      return result.legal
        ? [{ label: `${String(destination.column)},${String(destination.row)}`, cost_feet: result.costFeet }]
        : [];
    });
    return {
      name: display.name,
      badge: display.badge,
      movement_budget_feet: actor.movementRemainingFeet,
      cells,
    };
  });
  return {
    provenance: {
      kind: 'engine_fact',
      query: BLIND_LEGAL_MOVEMENT_VERSION,
      state_digest: capsule.digest,
    },
    actors,
  };
}

export function blindSemanticBoard(
  projection: EngineSemanticBoardProjection,
  stateDigest: string,
): BlindSemanticBoard {
  const payload: SemanticBoardPayload = semanticBoardPayload(projection);
  if (payload.audience !== 'dm') throw new TypeError('Blind semantic board must have DM audience.');
  const { reach_range_summaries: _reachRangeSummaries, ...retained } = payload;
  const candidate = {
    provenance: {
      kind: 'engine_fact',
      format: SEMANTIC_BOARD_FORMAT,
      state_digest: stateDigest,
    },
    ...retained,
    audience: 'dm',
  };
  blindSemanticBoardSchema.parse(candidate);
  return candidate as BlindSemanticBoard;
}

export function renderBlindTurnContext(input: {
  readonly state: EncounterState;
  readonly capsule: EngineStateCapsule;
  readonly queries: EngineQueryPort;
  readonly semanticBoardProjection: EngineSemanticBoardProjection;
  readonly visuals?: readonly BlindVisualDescriptor[];
  readonly baseMaximumBytes?: number;
  readonly semanticMaximumBytes?: number;
}): BlindTurnContextRenderResult {
  const baseMaximumBytes = input.baseMaximumBytes ?? BLIND_TURN_CONTEXT_MAX_BYTES;
  const semanticMaximumBytes = input.semanticMaximumBytes ?? BLIND_SEMANTIC_BOARD_MAX_BYTES;
  if (baseMaximumBytes !== BLIND_TURN_CONTEXT_MAX_BYTES) {
    throw new RangeError(`Blind context base cap must be ${String(BLIND_TURN_CONTEXT_MAX_BYTES)} bytes.`);
  }
  if (semanticMaximumBytes !== BLIND_SEMANTIC_BOARD_MAX_BYTES) {
    throw new RangeError(`Blind semantic-board cap must be ${String(BLIND_SEMANTIC_BOARD_MAX_BYTES)} bytes.`);
  }
  if (input.semanticBoardProjection.revision !== input.capsule.revision) {
    throw new RangeError('SEMANTIC_BOARD_REVISION_MISMATCH');
  }
  const displays = boardDisplayIdentities(input.state);
  const request = input.capsule.request;
  if (request === null || request.phase === 'speculative' || request.kind === 'plan_adjustment') {
    throw new RangeError('Blind v1 requires an ordinary full-round request.');
  }
  const roster = [...displays.values()].map((display) => ({
    name: display.name,
    badge: display.badge,
    side: display.side,
    hp_band: display.hpBand,
  }));
  const delayed = new Map(input.capsule.projection.initiative.timeline.initiative.map((entry) =>
    [entry.combatant, entry.delayedThisRound] as const));
  const initiative = input.state.initiative.map((entry) => {
    const display = displays.get(entry.combatant);
    if (display === undefined) {
      throw new Error(`Blind initiative cannot bind board actor ${String(entry.combatant)}.`);
    }
    return {
      name: display.name,
      badge: display.badge,
      side: display.side,
      hp_band: display.hpBand,
      current: input.state.activeCombatant === entry.combatant,
      delayed: delayed.get(entry.combatant) ?? false,
    };
  });
  const semanticBoard = blindSemanticBoard(input.semanticBoardProjection, input.capsule.digest);
  const candidate: BlindTurnContext = {
    granularity: 'full' as const,
    dm_mode: 'blind' as const,
    state_ref: {
      run_id: input.capsule.runId,
      state_handle: engineStateHandle(input.capsule),
      expected_revision: input.capsule.revision,
      state_digest: input.capsule.digest,
    },
    request: {
      request_id: request.requestId,
      phase: request.phase,
      required_actors: request.actors.map((actorId) => {
        const display = displays.get(actorId);
        if (display === undefined) {
          throw new Error(`Blind request cannot bind board actor ${String(actorId)}.`);
        }
        return { name: display.name, badge: display.badge };
      }),
    },
    round: input.state.round,
    initiative,
    roster,
    semantic_board: semanticBoard,
    creature_facts: creatureFacts(input.state, input.capsule, displays),
    legal_movement: legalMovement(input.state, input.capsule, input.queries, displays),
    visuals: (input.visuals ?? []).map((visual) => ({ ...visual })),
    intent_contract: BLIND_INTENT_VERSION,
  };
  blindTurnContextSchema.parse(candidate);
  const context = candidate;
  const { semantic_board: _semanticBoard, ...baseContext } = context;
  const actualBaseBytes = encodedBytes(baseContext);
  const actualSemanticBytes = encodedBytes(semanticBoard);
  if (actualBaseBytes > baseMaximumBytes) {
    throw new RangeError(
      `Protected blind context requires ${String(actualBaseBytes)} UTF-8 bytes; maximum is ${String(baseMaximumBytes)}.`,
    );
  }
  if (actualSemanticBytes > semanticMaximumBytes) {
    throw new RangeError(
      `Protected blind semantic-board facts require ${String(actualSemanticBytes)} UTF-8 bytes; maximum is ${String(semanticMaximumBytes)}.`,
    );
  }
  return {
    context,
    budget: {
      configuredBaseBytes: BLIND_TURN_CONTEXT_MAX_BYTES,
      configuredSemanticBytes: BLIND_SEMANTIC_BOARD_MAX_BYTES,
      actualBaseBytes,
      actualSemanticBytes,
      truncatedBlocks: [],
    },
  };
}

export function renderTurnContextForDmMode<T>(input: {
  readonly dmMode: DmMode;
  readonly advice: () => T;
  readonly blind: () => T;
}): T {
  switch (input.dmMode) {
    case 'advice': return input.advice();
    case 'blind': return input.blind();
  }
}
