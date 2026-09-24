import { canonicalJson } from '../commands/canonical-json';
import { z } from 'zod';
import { effectiveCombatRules } from '../combat/combat-rules';
import type { EncounterState } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import type {
  MonsterAttackAction,
  MonsterBonusAction,
  MonsterDamageTerm,
  MonsterMultiattackAction,
  MonsterSavingThrowAction,
  MonsterSpellcastingAction,
  MonsterStatblock,
} from '../combat/statblock';
import { BUNDLED_MONSTER_ROSTER } from '../combat/statblocks/roster';
import { spellDefinition } from '../combat/spells/definitions';
import type { SpellDefinition } from '../combat/spells/types';
import { sha256 } from '../crypto/sha256';
import {
  BLIND_INTENT_VERSION,
  type DmMode,
} from './blind-dm-contract';
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
export const BLIND_STATBLOCK_ESSENTIALS_FORMAT = 'blind-statblock-mechanical-essentials-v1' as const;
export const BLIND_SPELL_ESSENTIALS_FORMAT = 'blind-spell-mechanical-essentials-v1' as const;

export const BLIND_STATBLOCK_DROPPED_FIELDS = Object.freeze([
  { path: 'provenance', reason: 'Source attribution is recorded once in creature_facts.provenance.rules_sources; design notes and modification prose are not rules.' },
  { path: 'sourceDetails.source', reason: 'Source spans are recorded once in creature_facts.provenance.rules_sources.' },
  { path: 'sourceDetails.classification.alignment', reason: 'Alignment is descriptive and does not change the combat rules engine.' },
  { path: 'sourceDetails.challenge', reason: 'Challenge rating, experience points, and proficiency provenance do not adjudicate the live creature.' },
  { path: 'sourceDetails.hitPointDice', reason: 'The sourced maximum HP is retained; construction dice are not live HP.' },
  { path: 'sourceDetails.abilities', reason: 'The requested saving throws and skills are retained; raw ability-score presentation is omitted.' },
  { path: 'sourceDetails.gear', reason: 'Inventory prose is omitted; every attack and reaction mechanic remains explicit.' },
  { path: 'sourceDetails.languages', reason: 'Language presentation is outside this combat-planning payload.' },
  { path: '*.average', reason: 'Redundant averages are omitted while their sourced damage or healing dice remain.' },
  { path: '*.source|*.execution|*.note', reason: 'Source locators, implementation status, and absence prose are provenance rather than game mechanics.' },
] as const);

export const BLIND_SPELL_DROPPED_FIELDS = Object.freeze([
  { path: 'name', reason: 'Referenced spells are keyed by their stable spell id.' },
  { path: 'source', reason: 'Source locator prose is not a spell mechanic.' },
  { path: 'components', reason: 'Monster spell use is already constrained by the typed engine action; component presentation is not needed here.' },
  { path: 'ritual', reason: 'The monster spell actions in this payload do not offer ritual casting.' },
] as const);

export type BlindHpBand = 'UNINJURED' | 'BLOODIED' | 'NEAR DEATH' | 'UNKNOWN';

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

export interface BoardDisplayIdentity {
  readonly id: string;
  readonly name: string;
  readonly badge: number;
  readonly side: 'party' | 'foe';
  readonly hpBand: BlindHpBand;
}

function encodedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

const BLIND_CREATURE_BADGE_LIMIT = 12;
const BLIND_CELL_BADGE_LIMIT = 2;

function displayHpBand(hitPoints: number, hitPointMaximum: number): BlindHpBand {
  if (hitPointMaximum <= 0) return 'UNKNOWN';
  if (hitPoints >= hitPointMaximum) return 'UNINJURED';
  return hitPoints * 4 <= hitPointMaximum ? 'NEAR DEATH' : 'BLOODIED';
}

function boardDisplayIdentities(
  state: EncounterState,
  capsule: EngineStateCapsule,
): readonly BoardDisplayIdentity[] {
  const initiativeOrder = new Map(state.initiative.map((entry, index) =>
    [entry.combatant, index] as const));
  const placed = capsule.projection.combatants
    .filter((combatant) => combatant.placementStatus === 'placed')
    .sort((left, right) =>
      (initiativeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (initiativeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
      String(left.id).localeCompare(String(right.id)));
  if (placed.length > BLIND_CREATURE_BADGE_LIMIT) {
    throw new RangeError(
      `The closed creature-badge palette supports ${String(BLIND_CREATURE_BADGE_LIMIT)} creatures.`,
    );
  }
  const cellCounts = new Map<string, number>();
  return placed.map((combatant, index) => {
    const cellKey = `${String(combatant.position.column)},${String(combatant.position.row)}`;
    const cellCount = cellCounts.get(cellKey) ?? 0;
    if (cellCount >= BLIND_CELL_BADGE_LIMIT) {
      throw new RangeError(`Cell ${cellKey} exceeds the ${String(BLIND_CELL_BADGE_LIMIT)}-badge column.`);
    }
    cellCounts.set(cellKey, cellCount + 1);
    return {
      id: String(combatant.id),
      name: combatant.name,
      badge: index + 1,
      side: combatant.side === 'player_character' ? 'party' : 'foe',
      hpBand: displayHpBand(combatant.hitPoints, combatant.hitPointMaximum),
    };
  });
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

type MechanicalJson =
  | null
  | boolean
  | number
  | string
  | readonly MechanicalJson[]
  | { readonly [key: string]: MechanicalJson };

function mechanicalJson(value: unknown): MechanicalJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) return value.map(mechanicalJson);
  if (typeof value !== 'object') throw new TypeError('Mechanical source value is not JSON-compatible.');
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) =>
    key === 'source' || key === 'execution' || key === 'note' || key === 'average'
      ? []
      : [[key, mechanicalJson(entry)] as const]));
}

interface BlindDamageTerm {
  readonly dice: MonsterDamageTerm['dice'];
  readonly type: MonsterDamageTerm['type'];
  readonly trigger: MonsterDamageTerm['trigger'];
}

export interface BlindEssentialAttack {
  readonly id: string;
  readonly name: string;
  readonly attack_bonus: number;
  readonly delivery: MonsterAttackAction['delivery'];
  readonly damage: readonly BlindDamageTerm[];
  readonly attack_roll_advantage: MonsterAttackAction['attackRollAdvantage'];
  readonly on_hit: MonsterAttackAction['onHit'];
  readonly mechanics: MechanicalJson;
}

export interface BlindEssentialMultiattack {
  readonly id: string;
  readonly count: number;
  readonly action_ids: readonly string[];
  readonly combination: MonsterMultiattackAction['combination'];
  readonly mechanics: MechanicalJson;
}

export interface BlindEssentialSavingThrowAction {
  readonly id: string;
  readonly name: string;
  readonly saving_throw: MonsterSavingThrowAction['savingThrow'];
  readonly target: MonsterSavingThrowAction['target'];
  readonly failure: {
    readonly damage: readonly BlindDamageTerm[];
    readonly effects: MonsterSavingThrowAction['failure']['effects'];
  };
  readonly success: MonsterSavingThrowAction['success'];
  readonly mechanics: MechanicalJson;
}

export type BlindEssentialSpellcasting =
  | {
      readonly kind: 'spellcasting';
      readonly id: string;
      readonly action_economy: MonsterSpellcastingAction['actionEconomy'];
      readonly ability: MonsterSpellcastingAction['ability'];
      readonly save_dc: number | null;
      readonly spell_attack_bonus: number | null;
      readonly spell_list: MonsterSpellcastingAction['spells'];
      readonly mechanics: MechanicalJson;
    }
  | {
      readonly kind: 'spell_choice';
      readonly id: string;
      readonly name: string;
      readonly action_economy: 'bonus_action';
      readonly uses: number;
      readonly recharge: 'day';
      readonly ability: Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }>['ability'];
      readonly save_dc: null;
      readonly spell_attack_bonus: null;
      readonly spell_list: Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }>['spells'];
      readonly mechanics: null;
    };

export interface BlindReferencedSpellDefinition {
  readonly level: SpellDefinition['level'];
  readonly casting_time: SpellDefinition['castingTime'];
  readonly targeting: SpellDefinition['targeting'];
  readonly effect: SpellDefinition['operation'];
}

export interface BlindUnavailableSpellDefinition {
  readonly availability: 'declared_by_statblock';
  readonly definition: null;
}

export type BlindReferencedSpell = BlindReferencedSpellDefinition | BlindUnavailableSpellDefinition;

export interface BlindEssentialStatblock {
  readonly id: MonsterStatblock['id'];
  readonly name: string;
  readonly armor_class: MonsterStatblock['armorClass'];
  readonly hit_points_maximum: number;
  readonly speeds: Extract<MonsterStatblock['sourceDetails']['movement'], { readonly kind: 'present' }>['value'];
  readonly size_type: {
    readonly sizes: Extract<MonsterStatblock['sourceDetails']['classification'], { readonly kind: 'present' }>['value']['sizes'];
    readonly type: Extract<MonsterStatblock['sourceDetails']['classification'], { readonly kind: 'present' }>['value']['type'];
    readonly subtype: string | null;
  };
  readonly senses: MonsterStatblock['senses'];
  readonly passive_perception: number;
  readonly saving_throw_bonuses: MonsterStatblock['savingThrowBonuses'];
  readonly skills: readonly { readonly name: string; readonly bonus: number }[] | null;
  readonly damage_responses: MonsterStatblock['damageResponses'];
  readonly condition_immunities: MonsterStatblock['conditionImmunities'];
  readonly attacks: readonly BlindEssentialAttack[];
  readonly multiattacks: readonly BlindEssentialMultiattack[];
  readonly saving_throw_actions: readonly BlindEssentialSavingThrowAction[];
  readonly spellcasting: readonly BlindEssentialSpellcasting[];
  readonly traits: MechanicalJson;
  readonly bonus_actions: MechanicalJson;
  readonly reactions: MechanicalJson;
  readonly legendary_actions: MechanicalJson;
  readonly legendary_resistance: MechanicalJson;
}

export interface BlindStatblockFactsEntry {
  readonly statblock: BlindEssentialStatblock;
  readonly referenced_spells: Readonly<Record<string, BlindReferencedSpell>>;
}

function damageTerm(term: MonsterDamageTerm): BlindDamageTerm {
  return {
    dice: structuredClone(term.dice),
    type: term.type,
    trigger: structuredClone(term.trigger),
  };
}

function attackAction(action: MonsterAttackAction): BlindEssentialAttack {
  return {
    id: action.id,
    name: action.name,
    attack_bonus: action.attackBonus,
    delivery: structuredClone(action.delivery),
    damage: action.damage.map(damageTerm),
    attack_roll_advantage: structuredClone(action.attackRollAdvantage),
    on_hit: structuredClone(action.onHit),
    mechanics: mechanicalJson(action.mechanics ?? null),
  };
}

function multiattackAction(action: MonsterMultiattackAction): BlindEssentialMultiattack {
  return {
    id: action.id,
    count: action.count,
    action_ids: [...action.actionIds],
    combination: action.combination,
    mechanics: mechanicalJson(action.mechanics ?? null),
  };
}

function savingThrowAction(action: MonsterSavingThrowAction): BlindEssentialSavingThrowAction {
  return {
    id: action.id,
    name: action.name,
    saving_throw: structuredClone(action.savingThrow),
    target: structuredClone(action.target),
    failure: {
      damage: action.failure.damage.map(damageTerm),
      effects: structuredClone(action.failure.effects),
    },
    success: structuredClone(action.success),
    mechanics: mechanicalJson(action.mechanics ?? null),
  };
}

function decodedNumber(value: MonsterSpellcastingAction['saveDc']): number | null {
  return value.kind === 'present' ? value.value : null;
}

function spellcastingAction(action: MonsterSpellcastingAction): BlindEssentialSpellcasting {
  return {
    kind: 'spellcasting',
    id: action.id,
    action_economy: action.actionEconomy,
    ability: action.ability,
    save_dc: decodedNumber(action.saveDc),
    spell_attack_bonus: decodedNumber(action.spellAttackBonus),
    spell_list: structuredClone(action.spells),
    mechanics: mechanicalJson(action.mechanics ?? null),
  };
}

function spellChoiceAction(
  action: Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }>,
): BlindEssentialSpellcasting {
  return {
    kind: 'spell_choice',
    id: action.id,
    name: action.name,
    action_economy: 'bonus_action',
    uses: action.uses,
    recharge: action.recharge,
    ability: action.ability,
    save_dc: null,
    spell_attack_bonus: null,
    spell_list: structuredClone(action.spells),
    mechanics: null,
  };
}

function referencedSpellIds(statblock: MonsterStatblock): readonly string[] {
  const bonusActions = statblock.sourceDetails.bonusActions.kind === 'present'
    ? statblock.sourceDetails.bonusActions.value
    : [];
  const spellChoices = bonusActions.filter(
    (action): action is Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }> =>
      action.kind === 'spell_choice',
  );
  return [...new Set([
    ...spellcastingActions(statblock).flatMap((action) => action.spells.map((spell) => spell.id)),
    ...spellChoices.flatMap((action) => action.spells.map((spell) => spell.id)),
  ])].sort((left, right) => left.localeCompare(right));
}

function referencedSpellDefinitions(
  statblock: MonsterStatblock,
): Readonly<Record<string, BlindReferencedSpell>> {
  return Object.fromEntries(referencedSpellIds(statblock).map((id) => {
    const definition = spellDefinition(id);
    return [id, definition === null
      ? { availability: 'declared_by_statblock' as const, definition: null }
      : {
      level: definition.level,
      casting_time: definition.castingTime,
      targeting: structuredClone(definition.targeting),
      effect: structuredClone(definition.operation),
    }] as const;
  }));
}

function requiredPresent<Value>(
  value: { readonly kind: 'present'; readonly value: Value } | { readonly kind: 'absent'; readonly note: string },
  field: string,
): Value {
  if (value.kind === 'absent') {
    throw new TypeError(`Bundled statblock ${field} is required for blind mechanical essentials.`);
  }
  return value.value;
}

function essentialStatblock(statblock: MonsterStatblock): BlindEssentialStatblock {
  const details = statblock.sourceDetails;
  const classification = requiredPresent(details.classification, 'classification');
  const actions = requiredPresent(details.actions, 'actions');
  const bonusActions = details.bonusActions.kind === 'present' ? details.bonusActions.value : null;
  const spellChoices = bonusActions?.filter(
    (action): action is Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }> =>
      action.kind === 'spell_choice',
  ) ?? [];
  return {
    id: statblock.id,
    name: statblock.name,
    armor_class: statblock.armorClass,
    hit_points_maximum: statblock.hitPointMaximum,
    speeds: structuredClone(requiredPresent(details.movement, 'movement')),
    size_type: {
      sizes: structuredClone(classification.sizes),
      type: classification.type,
      subtype: classification.subtype,
    },
    senses: structuredClone(statblock.senses),
    passive_perception: requiredPresent(details.passivePerception, 'passive perception'),
    saving_throw_bonuses: structuredClone(statblock.savingThrowBonuses),
    skills: details.skills.kind === 'present' ? structuredClone(details.skills.value) : null,
    damage_responses: structuredClone(statblock.damageResponses),
    condition_immunities: [...statblock.conditionImmunities],
    attacks: actions
      .filter((action): action is MonsterAttackAction => action.kind === 'attack')
      .map(attackAction),
    multiattacks: actions
      .filter((action): action is MonsterMultiattackAction => action.kind === 'multiattack')
      .map(multiattackAction),
    saving_throw_actions: actions
      .filter((action): action is MonsterSavingThrowAction => action.kind === 'saving_throw')
      .map(savingThrowAction),
    spellcasting: [
      ...spellcastingActions(statblock).map(spellcastingAction),
      ...spellChoices.map(spellChoiceAction),
    ],
    traits: details.traits.kind === 'present' ? mechanicalJson(details.traits.value) : null,
    bonus_actions: bonusActions === null
      ? null
      : mechanicalJson(bonusActions.filter((action) =>
          action.kind !== 'spellcasting' && action.kind !== 'spell_choice')),
    reactions: details.reactions.kind === 'present' ? mechanicalJson(details.reactions.value) : null,
    legendary_actions: details.legendaryActions.kind === 'present'
      ? mechanicalJson(details.legendaryActions.value)
      : null,
    legendary_resistance: details.legendaryResistance.kind === 'present'
      ? mechanicalJson(details.legendaryResistance.value)
      : null,
  };
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
  terrain_kind: z.enum(['open', 'half_cover', 'three_quarters_cover', 'wall']),
});

const semanticObjectSchema = z.strictObject({
  id: identifierSchema,
  name: z.string(),
  kind: z.string(),
  cells: z.array(semanticCellSchema),
  terrain_kind: z.enum(['open', 'half_cover', 'three_quarters_cover', 'wall']),
});

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
    terrain: z.strictObject({
      partition: z.literal('open, half_cover, three_quarters_cover, and wall together contain every board cell exactly once'),
      open: semanticCellFactListSchema,
      half_cover: semanticCellFactListSchema,
      three_quarters_cover: semanticCellFactListSchema,
      wall: semanticCellFactListSchema,
    }),
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

const blindDamageTermSchema = z.strictObject({
  dice: z.strictObject({
    count: nonNegativeIntegerSchema,
    sides: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)]),
    modifier: safeIntegerSchema,
  }),
  type: identifierSchema,
  trigger: z.unknown(),
});

const blindAttackSchema = z.strictObject({
  id: identifierSchema,
  name: identifierSchema,
  attack_bonus: safeIntegerSchema,
  delivery: z.unknown(),
  damage: z.array(blindDamageTermSchema),
  attack_roll_advantage: z.unknown(),
  on_hit: z.array(z.unknown()),
  mechanics: z.unknown(),
});

const blindMultiattackSchema = z.strictObject({
  id: identifierSchema,
  count: positiveIntegerSchema,
  action_ids: z.array(identifierSchema),
  combination: z.enum(['any', 'fixed', 'one_attack_may_be_replaced']),
  mechanics: z.unknown(),
});

const blindSavingThrowActionSchema = z.strictObject({
  id: identifierSchema,
  name: identifierSchema,
  saving_throw: z.unknown(),
  target: z.unknown(),
  failure: z.strictObject({
    damage: z.array(blindDamageTermSchema),
    effects: z.array(z.unknown()),
  }),
  success: z.unknown(),
  mechanics: z.unknown(),
});

const blindSpellcastingSchema = z.union([
  z.strictObject({
    kind: z.literal('spellcasting'),
    id: identifierSchema,
    action_economy: z.enum(['action', 'bonus_action']),
    ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
    save_dc: safeIntegerSchema.nullable(),
    spell_attack_bonus: safeIntegerSchema.nullable(),
    spell_list: z.array(z.unknown()),
    mechanics: z.unknown(),
  }),
  z.strictObject({
    kind: z.literal('spell_choice'),
    id: identifierSchema,
    name: identifierSchema,
    action_economy: z.literal('bonus_action'),
    uses: positiveIntegerSchema,
    recharge: z.literal('day'),
    ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
    save_dc: z.null(),
    spell_attack_bonus: z.null(),
    spell_list: z.array(z.unknown()),
    mechanics: z.null(),
  }),
]);

const blindEssentialStatblockSchema = z.strictObject({
  id: identifierSchema,
  name: identifierSchema,
  armor_class: positiveIntegerSchema,
  hit_points_maximum: positiveIntegerSchema,
  speeds: z.array(z.strictObject({
    kind: z.enum(['walk', 'burrow', 'climb', 'fly', 'swim']),
    feet: nonNegativeIntegerSchema,
    hover: z.boolean(),
  })),
  size_type: z.strictObject({
    sizes: z.array(identifierSchema),
    type: identifierSchema,
    subtype: z.string().nullable(),
  }),
  senses: z.array(z.union([
    z.strictObject({ kind: z.literal('normal_sight') }),
    z.strictObject({
      kind: z.enum(['blindsight', 'darkvision', 'tremorsense', 'truesight']),
      rangeFeet: positiveIntegerSchema,
    }),
  ])),
  passive_perception: nonNegativeIntegerSchema,
  saving_throw_bonuses: z.strictObject({
    strength: safeIntegerSchema,
    dexterity: safeIntegerSchema,
    constitution: safeIntegerSchema,
    intelligence: safeIntegerSchema,
    wisdom: safeIntegerSchema,
    charisma: safeIntegerSchema,
  }),
  skills: z.array(z.strictObject({ name: identifierSchema, bonus: safeIntegerSchema })).nullable(),
  damage_responses: z.array(z.strictObject({ type: identifierSchema, response: identifierSchema })),
  condition_immunities: z.array(identifierSchema),
  attacks: z.array(blindAttackSchema),
  multiattacks: z.array(blindMultiattackSchema),
  saving_throw_actions: z.array(blindSavingThrowActionSchema),
  spellcasting: z.array(blindSpellcastingSchema),
  traits: z.unknown(),
  bonus_actions: z.unknown(),
  reactions: z.unknown(),
  legendary_actions: z.unknown(),
  legendary_resistance: z.unknown(),
});

const blindReferencedSpellSchema = z.union([
  z.strictObject({
    level: z.number().int().min(0).max(9),
    casting_time: z.enum(['action', 'bonus_action', 'reaction', 'minute', 'ten_minutes', 'hour']),
    targeting: z.unknown(),
    effect: z.unknown(),
  }),
  z.strictObject({
    availability: z.literal('declared_by_statblock'),
    definition: z.null(),
  }),
]);

const blindStatblockFactsEntrySchema = z.strictObject({
  statblock: blindEssentialStatblockSchema,
  referenced_spells: z.record(identifierSchema, blindReferencedSpellSchema),
}).superRefine((entry, context) => {
  const source = BUNDLED_MONSTER_ROSTER.find((row) => row.statblock.id === entry.statblock.id)?.statblock;
  if (source === undefined) {
    context.addIssue({ code: 'custom', path: ['statblock'], message: 'Statblock is not a bundled sourced block.' });
    return;
  }
  const expected = {
    statblock: essentialStatblock(source),
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
    statblock_projection: z.strictObject({
      format: z.literal(BLIND_STATBLOCK_ESSENTIALS_FORMAT),
      dropped_fields: z.array(z.strictObject({ path: identifierSchema, reason: identifierSchema })),
    }),
    spell_projection: z.strictObject({
      format: z.literal(BLIND_SPELL_ESSENTIALS_FORMAT),
      dropped_fields: z.array(z.strictObject({ path: identifierSchema, reason: identifierSchema })),
    }),
    rules_sources: z.array(z.strictObject({
      source_id: identifierSchema,
      license: identifierSchema,
      page_or_entry: z.string(),
    })),
  }),
  statblocks: z.record(identifierSchema, blindStatblockFactsEntrySchema),
  active_rules: blindActiveRulesSchema,
  actors: z.array(blindCreatureActorSchema),
}).superRefine((facts, context) => {
  for (const [id, entry] of Object.entries(facts.statblocks)) {
    if (entry.statblock.id !== id) {
      context.addIssue({
        code: 'custom',
        path: ['statblocks', id],
        message: 'A shared statblock must be keyed by its sourced statblock id.',
      });
    }
  }
  for (const [index, actor] of facts.actors.entries()) {
    if (actor.statblock_ref !== null && facts.statblocks[actor.statblock_ref] === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['actors', index, 'statblock_ref'],
        message: 'Every monster actor must reference one shared statblock.',
      });
    }
  }
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
  semantic_board: blindSemanticBoardSchema.optional(),
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
        page_or_entry: String(statblock.id),
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
): BlindStatblockFactsEntry {
  return {
    statblock: essentialStatblock(statblock),
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
  const statblocks = new Map<string, BlindStatblockFactsEntry>();
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
  return blindCreatureFactsSchema.parse({
    provenance: {
      kind: 'engine_fact',
      statblock_projection: {
        format: BLIND_STATBLOCK_ESSENTIALS_FORMAT,
        dropped_fields: BLIND_STATBLOCK_DROPPED_FIELDS.map((field) => ({ ...field })),
      },
      spell_projection: {
        format: BLIND_SPELL_ESSENTIALS_FORMAT,
        dropped_fields: BLIND_SPELL_DROPPED_FIELDS.map((field) => ({ ...field })),
      },
      rules_sources: [...rulesSources.values()],
    },
    statblocks: Object.fromEntries([...statblocks.entries()].sort(([left], [right]) => left.localeCompare(right))),
    active_rules: Object.fromEntries([...activeRules.entries()].sort(([left], [right]) => left.localeCompare(right))),
    actors,
  });
}

export interface BlindResolvedMovementCell {
  readonly label: string;
  readonly cell: GridCell;
  readonly costFeet: number;
  readonly path: readonly GridCell[];
}

export interface BlindResolvedActorMovement {
  readonly actorId: string;
  readonly movementBudgetFeet: number;
  readonly cells: readonly BlindResolvedMovementCell[];
}

function legalMovement(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
  displays: ReadonlyMap<string, BoardDisplayIdentity>,
): {
  readonly visible: BlindLegalMovement;
  readonly resolved: readonly BlindResolvedActorMovement[];
} {
  const required = capsule.request?.actors ?? [];
  const resolved = required.map((actorId): BlindResolvedActorMovement => {
    const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
    const display = displays.get(actorId);
    if (actor === undefined || display === undefined) {
      throw new Error(`Blind legal movement cannot bind required actor ${String(actorId)}.`);
    }
    // One search per actor, row-major: the cells, costs and routes `queries.path` reports legal cell by cell.
    const reachable = queries.reachable(state, { actorId, maximumFeet: actor.movementRemainingFeet });
    const cells = reachable.legal
      ? reachable.destinations.map(({ destination, cells: path, costFeet }): BlindResolvedMovementCell => ({
          label: `${String(destination.column)},${String(destination.row)}`,
          cell: destination,
          costFeet,
          path,
        }))
      : [];
    return {
      actorId: String(actorId),
      movementBudgetFeet: actor.movementRemainingFeet,
      cells,
    };
  });
  return {
    visible: {
      provenance: {
        kind: 'engine_fact',
        query: BLIND_LEGAL_MOVEMENT_VERSION,
        state_digest: capsule.digest,
      },
      actors: resolved.map((entry): BlindLegalMovementActor => {
        const display = displays.get(entry.actorId);
        if (display === undefined) throw new Error(`Blind legal movement lost display ${entry.actorId}.`);
        return {
          name: display.name,
          badge: display.badge,
          movement_budget_feet: entry.movementBudgetFeet,
          cells: entry.cells.map((cell): BlindLegalMovementCell => ({
            label: cell.label,
            cost_feet: cell.costFeet,
          })),
        };
      }),
    },
    resolved,
  };
}

export interface EngineBlindTurnProjection {
  readonly revision: number;
  readonly round: number;
  readonly displays: readonly BoardDisplayIdentity[];
  readonly initiative: BlindTurnContext['initiative'];
  readonly creatureFacts: BlindCreatureFacts;
  readonly legalMovement: BlindLegalMovement;
  /** Private canonical paths backing the visible destination/cost set. */
  readonly resolvedMovement: readonly BlindResolvedActorMovement[];
}

/** Reducer-free projection consumed by the standalone MCP blind renderer. */
export function projectEngineBlindTurn(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
): EngineBlindTurnProjection {
  const displays = boardDisplayIdentities(state, capsule);
  const displaysById = new Map(displays.map((display) => [display.id, display] as const));
  const delayed = new Map(capsule.projection.initiative.timeline.initiative.map((entry) =>
    [entry.combatant, entry.delayedThisRound] as const));
  const initiative = state.initiative.map((entry) => {
    const display = displaysById.get(entry.combatant);
    if (display === undefined) {
      throw new Error(`Blind initiative cannot bind board actor ${String(entry.combatant)}.`);
    }
    return {
      name: display.name,
      badge: display.badge,
      side: display.side,
      hp_band: display.hpBand,
      current: state.activeCombatant === entry.combatant,
      delayed: delayed.get(entry.combatant) ?? false,
    };
  });
  const movement = legalMovement(state, capsule, queries, displaysById);
  return {
    revision: capsule.revision,
    round: state.round,
    displays,
    initiative,
    creatureFacts: creatureFacts(state, capsule, displaysById),
    legalMovement: movement.visible,
    resolvedMovement: movement.resolved,
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
  return blindSemanticBoardSchema.parse(candidate);
}

export function renderBlindTurnContext(input: {
  readonly capsule: EngineStateCapsule;
  readonly blindProjection: EngineBlindTurnProjection;
  readonly semanticBoardProjection?: EngineSemanticBoardProjection;
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
  if (input.semanticBoardProjection !== undefined &&
    input.semanticBoardProjection.revision !== input.capsule.revision) {
    throw new RangeError('SEMANTIC_BOARD_REVISION_MISMATCH');
  }
  if (input.blindProjection.revision !== input.capsule.revision) {
    throw new RangeError('BLIND_PROJECTION_REVISION_MISMATCH');
  }
  const displays = new Map(input.blindProjection.displays.map((display) => [display.id, display] as const));
  const request = input.capsule.request;
  if (request === null || request.phase === 'speculative' || request.kind === 'plan_adjustment') {
    throw new RangeError('Blind v1 requires an ordinary full-round request.');
  }
  const roster = input.blindProjection.displays.map((display) => ({
    name: display.name,
    badge: display.badge,
    side: display.side,
    hp_band: display.hpBand,
  }));
  const semanticBoard = input.semanticBoardProjection === undefined
    ? undefined
    : blindSemanticBoard(input.semanticBoardProjection, input.capsule.digest);
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
    round: input.blindProjection.round,
    initiative: input.blindProjection.initiative,
    roster,
    ...(semanticBoard === undefined ? {} : { semantic_board: semanticBoard }),
    creature_facts: input.blindProjection.creatureFacts,
    legal_movement: input.blindProjection.legalMovement,
    visuals: (input.visuals ?? []).map((visual) => ({ ...visual })),
    intent_contract: BLIND_INTENT_VERSION,
  };
  blindTurnContextSchema.parse(candidate);
  const context = candidate;
  const { semantic_board: _semanticBoard, ...baseContext } = context;
  const actualBaseBytes = encodedBytes(baseContext);
  const actualSemanticBytes = semanticBoard === undefined ? 0 : encodedBytes(semanticBoard);
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
