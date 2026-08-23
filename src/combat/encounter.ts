import { skills, type Ability, type Skill } from '../domain/enums';
import { canonicalJson } from '../commands/canonical-json';
import {
  importedSpellDefinition,
  type LoadedContentPack,
} from '../content/content-pack';
import {
  conditionMechanicalState,
  conditionSpeedPenaltyFeet,
  exhaustionPenalty,
  isIncapacitated,
  type AppliedCondition,
  type ExhaustionLevel,
} from './conditions';
import type { CombatantProfile, CombatToken } from './combatant';
import {
  FREE_OBJECT_INTERACTIONS_PER_TURN,
  type CombatantEquipment,
  type EquipmentItemDefinition,
  type EquipmentRefusalCode,
  type GroundItem,
  type HandEquipment,
  type ItemPhysicalContact,
  type ObjectInteractionMode,
} from './equipment';
import type {
  DamageOperationPacket,
  DamageOperationSpec,
  OperationDice,
  ThresholdDamageRider,
} from './damage-operations';
import { isAttackFormSubstitutionPayload, isTypedCombatFeaturePayload } from './effects';
import type {
  CombatFeatureEffect,
  EffectApplication,
  EffectPayload,
  EncounterEffect,
  TurnBoundary,
} from './effects';
import type { EncounterCommand, EncounterEvent } from './events';
import {
  gridDistance,
  isCellInside,
  type GridBounds,
  type GridCell,
} from './grid';
import {
  planMovement,
  spendMovement,
  startTurnMovement,
  type MovementWorld,
  type TurnMovement,
} from './movement';
import {
  fixedOrigin,
  feetShape,
  persistentAreaContains,
  type PersistentArea,
  type PersistentAreaEffectSpec,
  type PersistentAreaHook,
  type PersistentAreaInput,
} from './persistent-areas';
import { rollDice, rollDie, transactionalRng, type Rng, type TransactionalRng } from './random';
import {
  applyDamageResponse,
  resolveAttackRoll,
  resolveDamage,
  resolveSavingThrow,
  rollD20,
  type DamageRequest,
  type DiceExpression,
  type DamageResponse,
  type RollMode,
} from './resolution';
import { spellDefinition } from './spells/definitions';
import { validateSpellSlotCapacities } from './spells/resources';
import type {
  BranchSpellOperation,
  CastChoice,
  CompositionStep,
  ConditionLifecycleOperation,
  EffectData,
  ModifierDuration,
  ScaledDice,
  SharedOutcomeDamageReferenceOperation,
  SharedOutcomeOperation,
  SpellCastCommand,
  SpellDefinition,
  SpellOperation,
  SpellPersistentAreaEffectSpec,
  TargetCountRule,
  TargetGeometryRule,
} from './spells/types';
import { affectedCells, creatureOccupiesAffectedCell, type AreaTemplate } from './templates';
import {
  armorClass,
  damageType,
  difficultyClass,
  dieSides,
  encounterEffectId,
  effectStackingIdentity,
  feet,
  persistentAreaId,
  worldObjectId,
  type CombatantId,
  type DamageType,
  type EncounterEffectId,
  type ItemId,
  type LimitedResourcePoolId,
  type ObjectTargetId,
  type PersistentAreaId,
  type WorldObjectId,
} from './values';
import {
  EMPTY_ENCOUNTER_ENVIRONMENT,
  assertEnvironmentRegion,
  assertWorldObjectInput,
  environmentLightAt,
  environmentObscurementAt,
  isEnvironmentDifficultTerrain,
  type CoverTier,
  type EncounterEnvironment,
  type WorldObject,
  type WorldOperation,
} from './world-objects';

export type LifeState = 'living' | 'dying' | 'stable' | 'dead';

export interface DeathSaveState {
  readonly successes: number;
  readonly failures: number;
}

export type ActionResource =
  | { readonly kind: 'available' }
  | { readonly kind: 'attack_sequence'; readonly attacksRemaining: number }
  | { readonly kind: 'spent' };

export interface TurnResources {
  readonly action: ActionResource;
  readonly bonusActionAvailable: boolean;
  readonly bonusAttacksRemaining?: number;
  readonly bonusAttackGrantEffectId?: EncounterEffectId | null;
  readonly usedDamageRiderEffectIds?: readonly EncounterEffectId[];
  readonly usedDamageReductionEffectIds?: readonly EncounterEffectId[];
  readonly usedSpellDamageModifierEffectIds?: readonly EncounterEffectId[];
  readonly additionalLeveledSpellActionsRemaining?: 0 | 1;
  readonly reactionAvailable: boolean;
  readonly movement: TurnMovement;
  readonly disengaging: boolean;
  readonly dodging: boolean;
  readonly objectInteractionsUsed?: 0 | 1;
}

export interface EncounterCombatantState {
  readonly profile: CombatantProfile;
  readonly hitPoints: number;
  readonly life: LifeState;
  readonly deathSaves: DeathSaveState | null;
  readonly turn: TurnResources;
  readonly temporaryHitPoints: number;
  readonly spellSlots: readonly SpellSlotState[];
  readonly limitedResources?: readonly LimitedResourceState[];
}

export interface SpellSlotState {
  readonly level: number;
  readonly maximum: number;
  readonly remaining: number;
}

export interface LimitedResourceState {
  readonly id: LimitedResourcePoolId;
  readonly maximum: number;
  readonly remaining: number;
  readonly recharge: 'short_rest' | 'long_rest';
}

export interface InitiativeEntry {
  readonly combatant: CombatantId;
  readonly total: number;
  readonly roll: number;
  readonly bonus: number;
  /** Combatants sharing this value occupy one contiguous initiative slot. */
  readonly slot: number;
}

export const INITIATIVE_MODES = [
  'per_combatant',
  'shared_enemy',
  'side_alternating',
] as const;

export type InitiativeMode = (typeof INITIATIVE_MODES)[number];

export interface EncounterConfig {
  readonly initiativeMode: InitiativeMode;
}

export const DEFAULT_ENCOUNTER_CONFIG: EncounterConfig = Object.freeze({
  initiativeMode: 'shared_enemy',
});

export function isInitiativeMode(value: unknown): value is InitiativeMode {
  return typeof value === 'string' && INITIATIVE_MODES.includes(value as InitiativeMode);
}

export function isEncounterConfig(value: unknown): value is EncounterConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    isInitiativeMode(Reflect.get(value, 'initiativeMode'))
  );
}

export interface EncounterState {
  readonly config: EncounterConfig;
  readonly revision: number;
  readonly nextEventSequence: number;
  readonly nextEffectSequence: number;
  readonly bounds: GridBounds;
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: readonly WorldObject[];
  readonly nextWorldObjectSequence: number;
  readonly environment: EncounterEnvironment;
  readonly foggedCells: readonly GridCell[];
  readonly dmNotes: readonly string[];
  readonly combatants: readonly EncounterCombatantState[];
  readonly tokens: readonly CombatToken[];
  /** Tokens owned by temporary board-absence effects, including their return cells. */
  readonly absentTokens?: readonly CombatToken[];
  readonly initiative: readonly InitiativeEntry[];
  readonly activeCombatant: CombatantId | null;
  readonly activeInitiativeIndex: number | null;
  readonly round: number;
  readonly effects: readonly EncounterEffect[];
  /** Creation-sequenced areas; reducers never depend on insertion order. */
  readonly persistentAreas: readonly PersistentArea[];
  readonly nextPersistentAreaSequence: number;
  /** Creation-sequenced later-turn branches; evaluated after area hooks and before effects. */
  readonly reevaluatedBranches?: readonly ReevaluatedSpellBranch[];
  readonly eventLog: readonly EncounterEvent[];
  /** Exact imported records plus their reducer-ready projections. */
  readonly contentPacks?: readonly LoadedContentPack[];
  readonly equipment?: readonly CombatantEquipment[];
  readonly groundItems?: readonly GroundItem[];
  readonly itemContacts?: readonly ItemPhysicalContact[];
}

interface ReevaluatedSpellBranch {
  readonly sequence: number;
  readonly spellId: string;
  readonly command: SpellCastCommand;
  readonly target: CombatantId;
  readonly hook: 'target_start' | 'target_end';
  readonly remaining: number;
  readonly operation: SpellOperation;
}

export interface EncounterSetup {
  readonly config?: EncounterConfig;
  readonly bounds: GridBounds;
  readonly blockedCells?: readonly GridCell[];
  readonly worldObjects?: readonly WorldObject[];
  readonly environment?: EncounterEnvironment;
  readonly foggedCells?: readonly GridCell[];
  readonly dmNotes?: readonly string[];
  readonly combatants: readonly CombatantProfile[];
  readonly tokens: readonly CombatToken[];
  readonly contentPacks?: readonly LoadedContentPack[];
  readonly equipment?: readonly CombatantEquipment[];
  readonly groundItems?: readonly GroundItem[];
  readonly itemContacts?: readonly ItemPhysicalContact[];
}

export interface EncounterReduction {
  readonly state: EncounterState;
  readonly events: readonly EncounterEvent[];
}

export class EncounterRuleError extends Error {
  override readonly name: string = 'EncounterRuleError';

  constructor(readonly reason: string) {
    super(reason);
  }
}

export type TargetSelectionRefusalRule =
  | 'fixed_count'
  | 'up_to_count'
  | 'slot_scaled_count'
  | 'projectile_allocation_count'
  | 'secondary_range_from_primary'
  | 'pair_range'
  | 'all_targets_range'
  | 'unique_targets'
  | 'each_target_own_destination';

/** The controller chooses; the reducer reports exactly which declared selection rule rejected it. */
export class TargetSelectionRuleError extends EncounterRuleError {
  override readonly name = 'TargetSelectionRuleError' as const;

  constructor(readonly rule: TargetSelectionRefusalRule, reason: string) {
    super(reason);
  }
}

export class EquipmentRuleError extends EncounterRuleError {
  override readonly name = 'EquipmentRuleError' as const;

  constructor(readonly code: EquipmentRefusalCode, reason: string) {
    super(reason);
  }
}

export type SustainedActivationRefusalCode =
  | 'effect_not_sustained'
  | 'effect_ended'
  | 'wrong_owner'
  | 'activation_not_yet_available'
  | 'activation_not_declared'
  | 'bound_target_mismatch';

/** Runtime identities make bound-target misuse a typed refusal rather than a representable success. */
export class SustainedActivationRuleError extends EncounterRuleError {
  constructor(readonly code: SustainedActivationRefusalCode, reason: string) {
    super(reason);
  }
}

const EMPTY_TURN: TurnResources = {
  action: { kind: 'spent' },
  bonusActionAvailable: false,
  reactionAvailable: false,
  movement: { speed: feet(0), spent: feet(0), remaining: feet(0) },
  disengaging: false,
  dodging: false,
};

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function assertUnique<T>(values: readonly T[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new EncounterRuleError(`${label} must be unique.`);
  }
}

function heldItems(hands: HandEquipment): readonly ItemId[] {
  switch (hands.kind) {
    case 'empty': return [];
    case 'one_handed': return hands.items;
    case 'two_handed': return [hands.item];
  }
}

function itemRegistry(packs: readonly LoadedContentPack[] | undefined): readonly EquipmentItemDefinition[] {
  return (packs ?? []).flatMap((pack) => pack.items);
}

function setupItemDefinition(
  registry: readonly EquipmentItemDefinition[],
  id: ItemId,
): EquipmentItemDefinition {
  const definition = registry.find((candidate) => candidate.id === id);
  if (definition === undefined) throw new EquipmentRuleError('unknown_item', `Unknown item ${id}.`);
  return definition;
}

function normalizedEquipment(setup: EncounterSetup): readonly CombatantEquipment[] {
  const supplied = setup.equipment ?? [];
  assertUnique(supplied.map((entry) => entry.combatant), 'Equipment combatants');
  const registry = itemRegistry(setup.contentPacks);
  const combatantIds = new Set(setup.combatants.map((profile) => profile.id));
  if (supplied.some((entry) => !combatantIds.has(entry.combatant))) {
    throw new EncounterRuleError('Equipment cannot name an unknown combatant.');
  }
  const result = setup.combatants.map((profile): CombatantEquipment => {
    const entry = supplied.find((candidate) => candidate.combatant === profile.id) ?? {
      combatant: profile.id, hands: { kind: 'empty' as const }, worn: [], carried: [],
    };
    const handItems = heldItems(entry.hands);
    assertUnique(handItems, `Held item ids for ${profile.id}`);
    assertUnique(entry.worn, `Worn item ids for ${profile.id}`);
    assertUnique(entry.carried, `Carried item ids for ${profile.id}`);
    for (const id of handItems) {
      const definition = setupItemDefinition(registry, id);
      if (
        definition.equip.kind !== 'held' ||
        (entry.hands.kind === 'two_handed' && definition.equip.handCapacity !== 2) ||
        (entry.hands.kind === 'one_handed' && definition.equip.handCapacity !== 1)
      ) {
        throw new EquipmentRuleError('equip_location_mismatch', `Item ${id} does not match its declared hand state.`);
      }
    }
    for (const id of entry.worn) {
      if (setupItemDefinition(registry, id).equip.kind !== 'worn') {
        throw new EquipmentRuleError('equip_location_mismatch', `Item ${id} is not wearable.`);
      }
    }
    for (const id of entry.carried) setupItemDefinition(registry, id);
    return {
      combatant: entry.combatant,
      hands: structuredClone(entry.hands),
      worn: [...entry.worn].sort((left, right) => String(left).localeCompare(String(right))),
      carried: [...entry.carried].sort((left, right) => String(left).localeCompare(String(right))),
    };
  });
  const groundItems = setup.groundItems ?? [];
  for (const ground of groundItems) {
    setupItemDefinition(registry, ground.item);
    if (!isCellInside(setup.bounds, ground.position)) {
      throw new EncounterRuleError(`Ground item ${ground.item} is outside the encounter grid.`);
    }
  }
  assertUnique([
    ...result.flatMap((entry) => [...heldItems(entry.hands), ...entry.worn, ...entry.carried]),
    ...groundItems.map((ground) => ground.item),
  ], 'Placed item ids');
  return result;
}

/** Establishes the one-profile/one-token invariant before any event can run. */
export function createEncounter(setup: EncounterSetup): EncounterState {
  const config = setup.config ?? DEFAULT_ENCOUNTER_CONFIG;
  if (!isEncounterConfig(config)) {
    throw new EncounterRuleError('Encounter configuration has an invalid initiative mode.');
  }
  if (
    !Number.isSafeInteger(setup.bounds.columns) ||
    !Number.isSafeInteger(setup.bounds.rows) ||
    setup.bounds.columns < 1 ||
    setup.bounds.rows < 1
  ) {
    throw new EncounterRuleError('Encounter bounds must be positive safe integers.');
  }
  if (setup.combatants.length === 0) {
    throw new EncounterRuleError('An encounter requires at least one combatant.');
  }

  assertUnique(setup.combatants.map((profile) => profile.id), 'Combatant ids');
  assertUnique(setup.combatants.map((profile) => profile.tokenId), 'Profile token ids');
  assertUnique(setup.tokens.map((token) => token.id), 'Token ids');
  assertUnique(setup.tokens.map((token) => token.combatantId), 'Token combatant ids');
  assertUnique(setup.tokens.map((token) => cellKey(token.position)), 'Token positions');

  const profileIds = new Set(setup.combatants.map((profile) => profile.id));
  const profileTokenIds = new Set(setup.combatants.map((profile) => profile.tokenId));
  const tokenCombatantIds = new Set(setup.tokens.map((token) => token.combatantId));
  const tokenIds = new Set(setup.tokens.map((token) => token.id));
  if (
    setup.combatants.length !== setup.tokens.length ||
    [...profileIds].some((id) => !tokenCombatantIds.has(id)) ||
    [...profileTokenIds].some((id) => !tokenIds.has(id))
  ) {
    throw new EncounterRuleError(
      'Every combatant must have exactly one matching board token.',
    );
  }
  for (const token of setup.tokens) {
    const profile = setup.combatants.find((candidate) => candidate.id === token.combatantId);
    if (profile?.tokenId !== token.id) {
      throw new EncounterRuleError('A token must match its profile token identity.');
    }
    if (!isCellInside(setup.bounds, token.position)) {
      throw new EncounterRuleError(`Token ${token.id} is outside the encounter grid.`);
    }
  }

  const blockedCells = setup.blockedCells ?? [];
  assertUnique(blockedCells.map(cellKey), 'Blocked cells');
  for (const cell of blockedCells) {
    if (!isCellInside(setup.bounds, cell)) {
      throw new EncounterRuleError('Blocked cells must be inside the encounter grid.');
    }
    if (setup.tokens.some((token) => cellKey(token.position) === cellKey(cell))) {
      throw new EncounterRuleError('A token cannot start in a blocked cell.');
    }
  }
  const worldObjects = setup.worldObjects ?? [];
  assertUnique(worldObjects.map((object) => object.id), 'World object ids');
  for (const object of worldObjects) {
    try {
      assertWorldObjectInput(setup.bounds, object);
    } catch (error) {
      throw new EncounterRuleError(error instanceof Error ? error.message : 'Invalid world object.');
    }
    if (object.blocking.movement && setup.tokens.some((token) =>
      object.footprint.some((cell) => cellKey(cell) === cellKey(token.position)))) {
      throw new EncounterRuleError('A token cannot start in a movement-blocking world object.');
    }
  }
  const environment = setup.environment ?? EMPTY_ENCOUNTER_ENVIRONMENT;
  assertUnique(environment.lightRegions.map((region) => region.id), 'Light region ids');
  assertUnique(environment.difficultTerrainRegions.map((region) => region.id), 'Difficult-terrain region ids');
  assertUnique(environment.obscurementRegions.map((region) => region.id), 'Obscurement region ids');
  try {
    for (const region of environment.lightRegions) assertEnvironmentRegion(setup.bounds, region);
    for (const region of environment.difficultTerrainRegions) assertEnvironmentRegion(setup.bounds, region);
    for (const region of environment.obscurementRegions) assertEnvironmentRegion(setup.bounds, region);
  } catch (error) {
    throw new EncounterRuleError(error instanceof Error ? error.message : 'Invalid environment region.');
  }
  const foggedCells = setup.foggedCells ?? [];
  assertUnique(foggedCells.map(cellKey), 'Fogged cells');
  for (const cell of foggedCells) {
    if (!isCellInside(setup.bounds, cell)) {
      throw new EncounterRuleError('Fogged cells must be inside the encounter grid.');
    }
  }
  for (const note of setup.dmNotes ?? []) {
    if (note.trim().length === 0) {
      throw new EncounterRuleError('DM notes must be non-empty.');
    }
  }

  const equipment = normalizedEquipment(setup);
  const contacts = setup.itemContacts ?? [];
  assertUnique(contacts.map((contact) => `${String(contact.item)}:${String(contact.combatant)}`), 'Item contacts');
  for (const contact of contacts) {
    setupItemDefinition(itemRegistry(setup.contentPacks), contact.item);
    if (!profileIds.has(contact.combatant)) throw new EncounterRuleError('Item contact names an unknown combatant.');
  }

  for (const profile of setup.combatants) {
    const limitedResources = profile.rules.limitedResources ?? [];
    assertUnique(limitedResources.map((pool) => pool.id), `Resource pool ids for ${profile.id}`);
    for (const pool of limitedResources) {
      if (!Number.isSafeInteger(pool.maximum) || pool.maximum < 1) {
        throw new EncounterRuleError(`Resource pool ${pool.id} maximum must be a positive safe integer.`);
      }
    }
    const resourceIds = new Set(limitedResources.map((pool) => pool.id));
    for (const effect of profile.rules.featureEffects ?? []) {
      if (effect.resourcePoolId !== null && !resourceIds.has(effect.resourcePoolId)) {
        throw new EncounterRuleError(`Effect ${effect.id} references unknown resource pool ${effect.resourcePoolId}.`);
      }
    }
  }

  const initialEffects: EncounterEffect[] = [];
  let nextEffectSequence = 1;
  for (const profile of setup.combatants) {
    for (const feature of profile.rules.featureEffects ?? []) {
      if (
        feature.trigger !== 'always_on' ||
        feature.payload.kind === 'temporary_hit_points' ||
        feature.payload.kind === 'reckless_attack_mode' ||
        isTypedCombatFeaturePayload(feature.payload) ||
        isAttackFormSubstitutionPayload(feature.payload)
      ) continue;
      initialEffects.push({
        id: encounterEffectId(`effect:${String(nextEffectSequence)}`),
        source: profile.id,
        targets: [profile.id],
        createdRevision: 0,
        duration: { kind: 'permanent' },
        concentrationOwner: null,
        stackingIdentity: effectStackingIdentity(`feature:${feature.id}`),
        stacking: 'coexist',
        repeatedSave: null,
        payload: feature.payload,
      });
      nextEffectSequence += 1;
    }
  }

  return {
    config: { ...config },
    revision: 0,
    nextEventSequence: 1,
    nextEffectSequence,
    bounds: { ...setup.bounds },
    blockedCells: blockedCells.map((cell) => ({ ...cell })),
    worldObjects: structuredClone(worldObjects),
    nextWorldObjectSequence: 1,
    environment: structuredClone(environment),
    foggedCells: foggedCells.map((cell) => ({ ...cell })),
    dmNotes: [...(setup.dmNotes ?? [])],
    combatants: setup.combatants.map((profile) => ({
      profile,
      hitPoints: profile.rules.hitPointMaximum,
      life: 'living',
      deathSaves: null,
      turn: EMPTY_TURN,
      temporaryHitPoints: Math.max(0, ...(profile.rules.featureEffects ?? [])
        .filter((effect) => effect.trigger === 'always_on' && effect.payload.kind === 'temporary_hit_points')
        .map((effect) => effect.payload.kind === 'temporary_hit_points' ? effect.payload.amount : 0)),
      spellSlots: validateSpellSlotCapacities(profile.rules.spellSlots).map(
        (slot) => ({ ...slot, remaining: slot.maximum }),
      ),
      ...(profile.rules.limitedResources === undefined
        ? {}
        : {
            limitedResources: profile.rules.limitedResources.map(
              (pool) => ({ ...pool, remaining: pool.maximum }),
            ),
          }),
    })),
    tokens: setup.tokens.map((token) => ({ ...token, position: { ...token.position } })),
    initiative: [],
    activeCombatant: null,
    activeInitiativeIndex: null,
    round: 0,
    effects: initialEffects,
    persistentAreas: [],
    nextPersistentAreaSequence: 1,
    eventLog: [],
    ...(setup.contentPacks === undefined
      ? {}
      : { contentPacks: structuredClone(setup.contentPacks) }),
    ...(setup.equipment === undefined && setup.groundItems === undefined && setup.itemContacts === undefined
      ? {}
      : {
          equipment,
          groundItems: structuredClone(setup.groundItems ?? []),
          itemContacts: structuredClone(contacts),
        }),
  };
}

function combatant(state: EncounterState, id: CombatantId): EncounterCombatantState {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new EncounterRuleError(`Unknown combatant ${id}.`);
  return found;
}

function token(state: EncounterState, id: CombatantId): CombatToken {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new EncounterRuleError(`Combatant ${id} has no token.`);
  return found;
}

export function isCombatantOnBoard(state: EncounterState, id: CombatantId): boolean {
  return state.tokens.some((candidate) => candidate.combatantId === id);
}

function replaceCombatant(
  state: EncounterState,
  replacement: EncounterCombatantState,
): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((candidate) =>
      candidate.profile.id === replacement.profile.id ? replacement : candidate,
    ),
  };
}

function combatantEquipment(state: EncounterState, id: CombatantId): CombatantEquipment {
  const found = state.equipment?.find((candidate) => candidate.combatant === id);
  if (found === undefined) throw new EncounterRuleError(`Combatant ${id} has no equipment state.`);
  return found;
}

function replaceEquipment(state: EncounterState, replacement: CombatantEquipment): EncounterState {
  return {
    ...state,
    equipment: (state.equipment ?? []).map((candidate) =>
      candidate.combatant === replacement.combatant ? replacement : candidate),
  };
}

function encounterItem(state: EncounterState, id: ItemId): EquipmentItemDefinition {
  const definition = itemRegistry(state.contentPacks).find((candidate) => candidate.id === id);
  if (definition === undefined) throw new EquipmentRuleError('unknown_item', `Unknown item ${id}.`);
  return definition;
}

function removeEquippedItem(equipment: CombatantEquipment, id: ItemId): CombatantEquipment | null {
  if (equipment.worn.includes(id)) {
    return { ...equipment, worn: equipment.worn.filter((candidate) => candidate !== id) };
  }
  switch (equipment.hands.kind) {
    case 'empty': return null;
    case 'two_handed':
      return equipment.hands.item === id ? { ...equipment, hands: { kind: 'empty' } } : null;
    case 'one_handed': {
      if (!equipment.hands.items.includes(id)) return null;
      const remaining = equipment.hands.items.filter((candidate) => candidate !== id);
      return remaining.length === 0
        ? { ...equipment, hands: { kind: 'empty' } }
        : { ...equipment, hands: { kind: 'one_handed', items: [remaining[0] as ItemId] } };
    }
  }
}

function addEquippedItem(
  equipment: CombatantEquipment,
  definition: EquipmentItemDefinition,
): CombatantEquipment {
  if (definition.equip.kind === 'worn') {
    return {
      ...equipment,
      worn: [...equipment.worn, definition.id].sort((left, right) => String(left).localeCompare(String(right))),
    };
  }
  if (definition.equip.handCapacity === 2) {
    if (equipment.hands.kind !== 'empty') {
      throw new EquipmentRuleError('hand_capacity_exceeded', `Item ${definition.id} requires both free hands.`);
    }
    return { ...equipment, hands: { kind: 'two_handed', item: definition.id } };
  }
  switch (equipment.hands.kind) {
    case 'empty':
      return { ...equipment, hands: { kind: 'one_handed', items: [definition.id] } };
    case 'two_handed':
      throw new EquipmentRuleError('hand_capacity_exceeded', `Both hands are occupied by ${equipment.hands.item}.`);
    case 'one_handed': {
      if (equipment.hands.items.length === 2) {
        throw new EquipmentRuleError('hand_capacity_exceeded', 'Both hand-capacity units are occupied.');
      }
      const items = [equipment.hands.items[0], definition.id]
        .sort((left, right) => String(left).localeCompare(String(right))) as [ItemId, ItemId];
      return { ...equipment, hands: { kind: 'one_handed', items } };
    }
  }
}

function appliedConditions(effect: EncounterEffect): readonly AppliedCondition[] {
  switch (effect.payload.kind) {
    case 'ability_check_modifier':
    case 'skill_modifier':
    case 'armor_class_modifier':
    case 'attack_roll_modifier':
    case 'attack_roll_mode_modifier':
    case 'faerie_fire':
    case 'consumable_healing_pool':
    case 'cannot_regain_hit_points':
    case 'creature_type_protection':
    case 'd20_test_modifier':
    case 'damage_reduction':
    case 'damage_rider':
    case 'recurring_damage_operation':
    case 'bonus_action_attack_grant':
    case 'extra_attack_count_override':
    case 'action_surge':
    case 'magic_missile_immunity':
    case 'movement_modifier':
    case 'opportunity_attacks_disabled':
    case 'sanctuary':
    case 'saving_throw_modifier':
    case 'shield_defense':
    case 'communication_link':
    case 'sustained_effect':
    case 'conjured_hand':
    case 'illusion':
    case 'light_source':
    case 'minor_magic':
    case 'object_repair':
    case 'alarm_ward':
    case 'appearance_illusion':
    case 'base_armor_class':
    case 'bonus_action_dash':
    case 'commanded_action':
    case 'detection_sense':
    case 'environmental_water':
    case 'falling_protection':
    case 'floating_disk':
    case 'food_purification':
    case 'image_illusion':
    case 'illusory_script':
    case 'jump_movement':
    case 'language_comprehension':
    case 'magic_identification':
    case 'obscured_area':
    case 'summoned_familiar':
    case 'unseen_servant':
    case 'hit_point_maximum_modifier':
    case 'condition_choice':
    case 'form_alteration':
    case 'arcane_lock':
    case 'magic_aura':
    case 'augury':
    case 'attacks_against_target_roll_mode':
    case 'calm_emotions':
    case 'darkvision':
    case 'detect_thoughts':
    case 'granted_breath':
    case 'ability_check_advantage':
    case 'size_alteration':
    case 'trap_detection':
    case 'flaming_sphere':
    case 'corpse_preservation':
    case 'gust_of_wind_area':
    case 'levitation':
    case 'object_location':
    case 'magic_mouth':
    case 'object_unlock':
    case 'magic_weapon':
    case 'location_tracking':
    case 'mirror_images':
    case 'teleport':
    case 'poison_protection':
    case 'ray_enfeeblement':
    case 'rope_trick':
    case 'see_invisibility':
    case 'silence_area':
    case 'spider_climb':
    case 'spiritual_weapon':
    case 'warding_bond':
    case 'truth_zone':
    case 'ongoing_damage':
    case 'temporary_banishment':
    case 'summoned_undead':
    case 'beacon_of_hope':
    case 'bestow_curse':
    case 'blink':
    case 'clairvoyance_sensor':
    case 'created_food_and_water':
    case 'daylight_area':
    case 'flight':
    case 'gaseous_form':
    case 'glyph_of_warding':
    case 'haste':
    case 'magic_circle':
    case 'major_image':
    case 'meld_into_stone':
    case 'nondetection':
    case 'phantom_steed':
    case 'energy_protection':
    case 'sending':
    case 'sleet_storm_area':
    case 'slow':
    case 'speak_with_dead':
    case 'spirit_guardians_area':
    case 'stinking_cloud_area':
    case 'tiny_hut':
    case 'universal_language':
    case 'vampiric_touch':
    case 'water_breathing':
    case 'water_walk':
    case 'arcane_eye':
    case 'aura_of_life':
    case 'black_tentacles_area':
    case 'confusion_area':
    case 'conjure_minor_elementals':
    case 'control_water':
    case 'death_ward':
    case 'dimension_door':
    case 'divination':
    case 'fabricate':
    case 'faithful_hound':
    case 'fire_shield':
    case 'freedom_of_movement':
    case 'guardian_of_faith':
    case 'hallucinatory_terrain':
    case 'ice_storm_terrain':
    case 'locate_creature':
    case 'phantasmal_killer':
    case 'polymorph':
    case 'private_sanctum':
    case 'resilient_sphere':
    case 'secret_chest':
    case 'stone_shape':
    case 'damage_resistances':
    case 'wall_of_fire':
      return [];
    case 'ensnaring_strike':
      return [{ name: effect.payload.condition }];
    case 'banishment':
      return [{ name: effect.payload.condition }];
    case 'charm_monster':
      return [{ name: effect.payload.condition, source: effect.source }];
    case 'hypnotic_pattern':
      return effect.payload.conditions.map((condition) =>
        condition === 'Charmed' ? { name: condition, source: effect.source } : { name: condition });
    case 'fear':
      return [{ name: 'Frightened', source: effect.source }];
    case 'web_area':
      return [{ name: 'Restrained' }];
    case 'condition_bundle':
      return effect.payload.conditions.map((condition) =>
        condition === 'Charmed' || condition === 'Frightened' || condition === 'Grappled'
          ? { name: condition, source: effect.source }
          : { name: condition });
    case 'sleep_sequence':
      return [{ name: effect.payload.initial }];
    case 'exhaustion':
      return [{ name: 'Exhaustion', level: effect.payload.level }];
    case 'condition':
      switch (effect.payload.condition) {
        case 'Charmed':
        case 'Frightened':
        case 'Grappled':
          return [{ name: effect.payload.condition, source: effect.source }];
        case 'Blinded':
        case 'Deafened':
        case 'Incapacitated':
        case 'Invisible':
        case 'Paralyzed':
        case 'Petrified':
        case 'Poisoned':
        case 'Prone':
        case 'Restrained':
        case 'Stunned':
        case 'Unconscious':
          return [{ name: effect.payload.condition }];
      }
  }
}

export function combatantConditions(
  state: EncounterState,
  id: CombatantId,
): readonly AppliedCondition[] {
  const subject = combatant(state, id);
  const conditions: AppliedCondition[] = [];
  const seenConditions = new Set<string>();
  let exhaustionLevels = 0;
  for (const effect of state.effects) {
    if (!effect.targets.includes(id)) continue;
    for (const condition of appliedConditions(effect)) {
      if (condition.name === 'Exhaustion') {
        exhaustionLevels += condition.level;
        continue;
      }
      if (
        condition.name === 'Invisible' &&
        state.effects.some((candidate) =>
          candidate.targets.includes(id) &&
          candidate.payload.kind === 'faerie_fire' &&
          candidate.payload.preventsInvisibleConditionBenefit)
      ) continue;
      const key =
        'source' in condition
          ? `${condition.name}:${condition.source}`
          : condition.name;
      if (!seenConditions.has(key)) {
        seenConditions.add(key);
        conditions.push(condition);
      }
    }
  }
  if (exhaustionLevels > 0) {
    conditions.push({
      name: 'Exhaustion',
      level: Math.min(6, exhaustionLevels) as ExhaustionLevel,
    });
  }
  if (
    subject.life === 'dying' &&
    !conditions.some((condition) => condition.name === 'Unconscious')
  ) {
    conditions.push({ name: 'Unconscious' });
  }
  return conditions;
}

/** Resolved skill modifier after encounter effects; no roll or RNG is hidden here. */
export function effectiveSkillModifier(
  state: EncounterState,
  id: CombatantId,
  skill: keyof NonNullable<CombatantProfile['rules']['skillBonuses']>,
): number {
  const base = combatant(state, id).profile.rules.skillBonuses?.[skill] ?? 0;
  return state.effects.reduce((total, effect) =>
    effect.targets.includes(id) &&
    effect.payload.kind === 'skill_modifier' &&
    effect.payload.skill === skill
      ? total + effect.payload.amount
      : total, base);
}

function movementEffects(state: EncounterState, id: CombatantId): readonly Extract<EffectPayload, { readonly kind: 'movement_modifier' }>[] {
  return state.effects
    .filter((effect) => effect.targets.includes(id) && effect.payload.kind === 'movement_modifier')
    .map((effect) => effect.payload as Extract<EffectPayload, { readonly kind: 'movement_modifier' }>);
}

/**
 * Movement modifiers resolve in effect-creation order. Sets replace the
 * every speed currently available; later increases and reductions then apply.
 * A later fixed mode grant can therefore supersede an earlier reduction, while
 * a later reduction changes that grant. Any active
 * magical-reduction immunity suppresses all declared reductions. Finally, the
 * fastest granted movement mode supplies the usable turn speed.
 */
function effectiveSpeed(state: EncounterState, id: CombatantId): number {
  const base = combatant(state, id).profile.rules.speed;
  const penalty = conditionSpeedPenaltyFeet(combatantConditions(state, id));
  if (penalty === Number.NEGATIVE_INFINITY) return 0;
  const modifiers = movementEffects(state, id);
  const immuneToReduction = modifiers.some((payload) =>
    'magicalSpeedReductionImmunity' in payload && payload.magicalSpeedReductionImmunity);
  const speeds = new Map<'walking' | 'flying' | 'climbing' | 'swimming', number>([['walking', base + penalty]]);
  for (const payload of modifiers) {
    if ('speedDeltaFeet' in payload) {
      speeds.set('walking', (speeds.get('walking') ?? 0) + payload.speedDeltaFeet);
      continue;
    }
    switch (payload.speedChange.kind) {
      case 'set':
        for (const mode of speeds.keys()) speeds.set(mode, payload.speedChange.speedFeet);
        break;
      case 'increase':
        for (const [mode, speed] of speeds) speeds.set(mode, speed + payload.speedChange.feet);
        break;
      case 'reduce':
        if (!immuneToReduction) {
          for (const [mode, speed] of speeds) {
            speeds.set(mode, payload.speedChange.reduction.kind === 'feet'
              ? speed - payload.speedChange.reduction.feet
              : speed * payload.speedChange.reduction.multiplier);
          }
        }
        break;
    }
    const walking = Math.max(0, speeds.get('walking') ?? 0);
    for (const grant of payload.modeGrants) {
      speeds.set(grant.mode, grant.speed.kind === 'fixed' ? grant.speed.feet : walking);
    }
  }
  return Math.max(0, ...speeds.values());
}

function ignoresDifficultTerrain(state: EncounterState, id: CombatantId): boolean {
  return movementEffects(state, id).some((payload) =>
    'modeGrants' in payload && (
      payload.difficultTerrainImmunity || payload.modeGrants.some((grant) => grant.mode === 'flying')
    ));
}

function effectiveArmorClass(
  state: EncounterState,
  id: CombatantId,
  attacker: CombatantId,
): ReturnType<typeof armorClass> {
  const base = combatant(state, id).profile.rules.armorClass;
  let bonus = 0;
  let floor = 0;
  for (const effect of state.effects) {
    if (!effect.targets.includes(id)) continue;
    if (effect.payload.kind === 'armor_class_modifier') {
      if ('minimum' in effect.payload) floor = Math.max(floor, effect.payload.minimum);
      else if (effect.payload.againstAttacker === undefined || effect.payload.againstAttacker === attacker) {
        bonus += effect.payload.amount;
      }
    }
    if (effect.payload.kind === 'shield_defense') bonus += effect.payload.armorClassBonus;
  }
  // Barkskin's floor evaluates the completed AC; it is not another additive bonus.
  return armorClass(Math.max(base + bonus, floor));
}

/** Dice modifiers consume the encounter RNG before the d20, oldest effect first, then effect id. */
export const ROLL_MODIFIER_ORDER = 'created_revision_then_effect_id_before_d20' as const;

function effectDiceModifier(
  state: EncounterState,
  id: CombatantId,
  test: 'attack_roll' | 'saving_throw' | 'ability_check',
  rng: Rng,
  skill: string | null = null,
): number {
  const effects = [...state.effects].sort((left, right) =>
    left.createdRevision - right.createdRevision || String(left.id).localeCompare(String(right.id)));
  return effects.reduce((total, effect) => {
    if (!effect.targets.includes(id)) return total;
    const payload = effect.payload;
    if (test !== 'ability_check' && payload.kind === 'd20_test_modifier' && payload.tests.includes(test)) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count,
        sides: dieSides(payload.sides),
        modifier: 0,
      }).total;
    }
    if (
      test === 'ability_check' &&
      payload.kind === 'ability_check_modifier' &&
      (payload.skill === undefined || payload.skill === skill)
    ) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count, sides: dieSides(payload.sides), modifier: 0,
      }).total;
    }
    if (
      (test === 'attack_roll' && payload.kind === 'attack_roll_modifier') ||
      (test === 'saving_throw' && payload.kind === 'saving_throw_modifier')
    ) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count,
        sides: dieSides(payload.sides),
        modifier: 0,
      }).total;
    }
    return total;
  }, 0);
}

function combineRollModes(modes: readonly RollMode[]): RollMode {
  const advantage = modes.includes('advantage');
  const disadvantage = modes.includes('disadvantage');
  if (advantage === disadvantage) return 'normal';
  return advantage ? 'advantage' : 'disadvantage';
}

function interveningCells(from: GridCell, to: GridCell): readonly GridCell[] {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));
  if (steps <= 1) return [];
  const result: GridCell[] = [];
  const seen = new Set<string>();
  for (let step = 1; step < steps; step += 1) {
    const cell = {
      column: Math.round(from.column + columnDelta * step / steps),
      row: Math.round(from.row + rowDelta * step / steps),
    };
    const key = cellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }
  return result;
}

function worldObjectOccupiesCell(object: WorldObject, cell: GridCell): boolean {
  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));
}

function movementBlocked(state: EncounterState, cell: GridCell): boolean {
  return state.blockedCells.some((candidate) => cellKey(candidate) === cellKey(cell)) ||
    state.worldObjects.some((object) => object.blocking.movement && worldObjectOccupiesCell(object, cell)) ||
    (state.environment.movementRegions ?? []).some((region) =>
      region.entry === 'blocked' && region.cells.some((candidate) => cellKey(candidate) === cellKey(cell)));
}

function templateBlockedCells(state: EncounterState): readonly GridCell[] {
  const cells = [
    ...state.blockedCells,
    ...state.worldObjects.flatMap((object) => object.blocking.lineOfSight ? object.footprint : []),
  ];
  return [...new Map(cells.map((cell) => [cellKey(cell), cell] as const)).values()];
}

export function hasLineOfSight(
  state: EncounterState,
  from: GridCell,
  to: GridCell,
): boolean {
  const blocked = new Set(state.worldObjects
    .flatMap((object) => object.blocking.lineOfSight ? object.footprint : [])
    .map(cellKey));
  return interveningCells(from, to).every((cell) => !blocked.has(cellKey(cell)));
}

const COVER_ORDER: Readonly<Record<CoverTier, number>> = {
  none: 0,
  half: 1,
  three_quarters: 2,
  total: 3,
};

export function coverTierBetween(
  state: EncounterState,
  from: GridCell,
  to: GridCell,
): CoverTier {
  let cover: CoverTier = 'none';
  for (const cell of interveningCells(from, to)) {
    for (const object of state.worldObjects) {
      if (
        worldObjectOccupiesCell(object, cell) &&
        COVER_ORDER[object.blocking.cover] > COVER_ORDER[cover]
      ) cover = object.blocking.cover;
    }
  }
  return cover;
}

export function canCombatantSee(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): boolean {
  const from = token(state, observer).position;
  const to = token(state, subject).position;
  if (!hasLineOfSight(state, from, to)) return false;
  const distance = gridDistance(from, to);
  const senses = combatant(state, observer).profile.rules.senses;
  const hasBlindsight = senses.some((sense) =>
    sense.kind === 'blindsight' && distance <= sense.rangeFeet);
  const hasTruesight = senses.some((sense) =>
    sense.kind === 'truesight' && distance <= sense.rangeFeet);
  if (hasBlindsight) return true;

  const observerBlinded = combatantConditions(state, observer)
    .some(({ name }) => name === 'Blinded');
  if (observerBlinded) return false;
  const subjectInvisible = combatantConditions(state, subject)
    .some(({ name }) => name === 'Invisible');
  if (subjectInvisible && !hasTruesight) return false;

  const environmentObscurement = environmentObscurementAt(state.environment, to);
  let heavyObscurement = environmentObscurement === 'heavy';
  let magicalDarkness = environmentObscurement === 'magical_darkness';
  for (const effect of state.effects) {
    if (effect.payload.kind !== 'obscured_area' || effect.payload.placement === 'selected_when_cast') continue;
    const cells = affectedCells(
      { bounds: state.bounds, blockedCells: templateBlockedCells(state) },
      effect.payload.placement,
    );
    if (!cells.some((cell) => cellKey(cell) === cellKey(to))) continue;
    if (effect.payload.obscurement === 'heavy') heavyObscurement = true;
    else magicalDarkness = true;
  }
  if (heavyObscurement) return false;
  if (magicalDarkness && !hasTruesight) return false;
  return environmentLightAt(state.environment, to) !== 'darkness' || hasTruesight;
}

function canCombatantPierceVisualIllusion(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): boolean {
  const distance = gridDistance(token(state, observer).position, token(state, subject).position);
  return combatant(state, observer).profile.rules.senses.some((sense) =>
    (sense.kind === 'blindsight' || sense.kind === 'truesight') && distance <= sense.rangeFeet);
}

function coverArmorClassBonus(tier: CoverTier): number {
  switch (tier) {
    case 'none': return 0;
    case 'half': return 2;
    case 'three_quarters': return 5;
    case 'total': return 0;
  }
}

function coverAdjustedArmorClass(
  state: EncounterState,
  attacker: CombatantId,
  target: CombatantId,
): ReturnType<typeof armorClass> {
  const tier = coverTierBetween(
    state,
    token(state, attacker).position,
    token(state, target).position,
  );
  return armorClass(effectiveArmorClass(state, target, attacker) + coverArmorClassBonus(tier));
}

function attackRollMode(
  state: EncounterState,
  command: Extract<
    EncounterCommand,
    { readonly type: 'attack' | 'opportunity_attack' }
  >,
): RollMode {
  const modes: RollMode[] = [command.rollMode];
  const attackerCanSeeTarget = command.attackerCanSeeTarget &&
    canCombatantSee(state, command.actor, command.target);
  const targetCanSeeAttacker = command.targetCanSeeAttacker &&
    canCombatantSee(state, command.target, command.actor);
  for (const effect of state.effects) {
    if (effect.payload.kind === 'faerie_fire') {
      if (effect.targets.includes(command.target)) modes.push(effect.payload.attackModeAgainstTarget);
      continue;
    }
    if (effect.payload.kind === 'attacks_against_target_roll_mode') {
      if (
        effect.targets.includes(command.target) &&
        !canCombatantPierceVisualIllusion(state, command.actor, command.target)
      ) modes.push(effect.payload.mode);
      continue;
    }
    if (effect.payload.kind !== 'attack_roll_mode_modifier') continue;
    const appliesTo = effect.payload.appliesTo;
    const applies =
      ((appliesTo.kind === 'next_attack_against_target' ||
        appliesTo.kind === 'attacks_against_target') &&
        effect.targets.includes(command.target)) ||
      (appliesTo.kind === 'next_attack_by_target' &&
        effect.targets.includes(command.actor)) ||
      (appliesTo.kind === 'all_attacks_by_target' &&
        effect.targets.includes(command.actor)) ||
      (appliesTo.kind === 'attacks_by_target' &&
        effect.targets.includes(command.actor) &&
        command.type === 'attack' &&
        command.attackId !== undefined &&
        appliesTo.attackIds.includes(command.attackId));
    if (applies) modes.push(effect.payload.mode);
  }
  const actorClauses = conditionMechanicalState(
    combatantConditions(state, command.actor),
  ).clauses;
  const targetClauses = conditionMechanicalState(
    combatantConditions(state, command.target),
  ).clauses;

  for (const clause of actorClauses) {
    if (clause.kind !== 'roll_mode' || clause.roll !== 'attack_by') continue;
    if (
      clause.predicate === 'always' ||
      (clause.predicate === 'target_not_source' && clause.source !== command.target) ||
      (clause.predicate === 'source_visible' && clause.source === command.target &&
        canCombatantSee(state, command.actor, clause.source)) ||
      (clause.predicate === 'recipient_unseen' && !targetCanSeeAttacker)
    ) {
      modes.push(clause.mode);
    }
  }
  const distance = gridDistance(
    token(state, command.actor).position,
    token(state, command.target).position,
  );
  for (const clause of targetClauses) {
    if (clause.kind !== 'roll_mode' || clause.roll !== 'attack_against') continue;
    if (
      clause.predicate === 'always' ||
      (clause.predicate === 'recipient_unseen' && !attackerCanSeeTarget) ||
      (clause.predicate === 'attacker_within_5_feet' && distance <= 5) ||
      (clause.predicate === 'attacker_beyond_5_feet' && distance > 5)
    ) {
      modes.push(clause.mode);
    }
  }

  const targetState = combatant(state, command.target);
  if (
    targetState.turn.dodging &&
    targetCanSeeAttacker &&
    effectiveSpeed(state, command.target) > 0 &&
    !isIncapacitated(combatantConditions(state, command.target))
  ) {
    modes.push('disadvantage');
  }
  return combineRollModes(modes);
}

function activateRecklessAttack(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
  wasFirstAttack: boolean,
): void {
  if (command.recklessAttackEffectId === undefined) return;
  const declared = featureEffect(context.state, command.actor, command.recklessAttackEffectId);
  if (declared.payload.kind !== 'reckless_attack_mode') {
    throw new EncounterRuleError(`Effect ${declared.id} is not a Reckless Attack mode.`);
  }
  if (
    !wasFirstAttack ||
    command.attackId === undefined ||
    !declared.payload.strengthBasedMeleeAttackIds.includes(command.attackId)
  ) {
    throw new EncounterRuleError('Reckless Attack must be chosen for the first declared Strength-based melee attack on the turn.');
  }
  const ownRollsIdentity = effectStackingIdentity(`feature:${declared.id}:own-rolls`);
  applyEffect(context, command.actor, {
    targets: [command.actor],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: command.actor,
        boundary: 'end',
        source: 'docs/srd/full/srd-5.2.1.txt:1858-1863',
      },
      remaining: 1,
    },
    concentration: false,
    stackingIdentity: ownRollsIdentity,
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: {
      kind: 'attack_roll_mode_modifier',
      mode: 'advantage',
      appliesTo: {
        kind: 'attacks_by_target',
        attackIds: declared.payload.strengthBasedMeleeAttackIds,
      },
    },
  });
  applyEffect(context, command.actor, {
    targets: [command.actor],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: command.actor,
        boundary: 'start',
        source: 'docs/srd/full/srd-5.2.1.txt:1801,1858-1863',
      },
      remaining: 1,
    },
    concentration: false,
    stackingIdentity: effectStackingIdentity(`feature:${declared.id}:incoming-rolls`),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: {
      kind: 'attack_roll_mode_modifier',
      mode: 'advantage',
      appliesTo: { kind: 'attacks_against_target' },
    },
  });
}

function cannotHarmTarget(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): boolean {
  return conditionMechanicalState(combatantConditions(state, actor)).clauses.some(
    (clause) => clause.kind === 'cannot_harm' && clause.target === target,
  );
}

function automaticSaveFailure(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
): boolean {
  return conditionMechanicalState(combatantConditions(state, target)).clauses.some(
    (clause) =>
      clause.kind === 'automatic_save_failure' && clause.abilities.includes(ability),
  );
}

function saveRollMode(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
  base: RollMode,
): RollMode {
  const modes: RollMode[] = [base];
  for (const effect of state.effects) {
    if (
      effect.targets.includes(target) &&
      effect.payload.kind === 'attack_roll_mode_modifier' &&
      effect.payload.appliesTo.kind === 'saving_throws_by_target'
    ) modes.push(effect.payload.mode);
  }
  for (const clause of conditionMechanicalState(combatantConditions(state, target)).clauses) {
    if (
      clause.kind === 'roll_mode' &&
      clause.roll === 'dexterity_save' &&
      ability === 'dexterity' &&
      clause.predicate === 'always'
    ) {
      modes.push(clause.mode);
    }
  }
  return combineRollModes(modes);
}

function abilityCheckRollMode(
  state: EncounterState,
  actor: CombatantId,
  base: RollMode,
): RollMode {
  const modes: RollMode[] = [base];
  for (const effect of state.effects) {
    if (
      effect.targets.includes(actor) &&
      effect.payload.kind === 'attack_roll_mode_modifier' &&
      effect.payload.appliesTo.kind === 'ability_checks_by_target'
    ) modes.push(effect.payload.mode);
  }
  for (const clause of conditionMechanicalState(combatantConditions(state, actor)).clauses) {
    if (
      clause.kind === 'roll_mode' &&
      clause.roll === 'ability_check' &&
      clause.predicate === 'source_visible' &&
      clause.source !== undefined &&
      canCombatantSee(state, actor, clause.source)
    ) modes.push(clause.mode);
  }
  return combineRollModes(modes);
}

function targetDamageResponses(
  state: EncounterState,
  source: CombatantId,
  target: CombatantId,
  request: DamageRequest,
): DamageRequest['responses'] {
  const subject = combatant(state, target);
  const responseByType = new Map<DamageType, Set<DamageResponse>>();
  const add = (type: DamageType, response: DamageResponse): void => {
    const responses = responseByType.get(type) ?? new Set<DamageResponse>();
    responses.add(response);
    responseByType.set(type, responses);
  };
  for (const entry of subject.profile.rules.damageResponses) {
    add(entry.type, entry.response);
  }
  const resistsAll = conditionMechanicalState(
    combatantConditions(state, target),
  ).clauses.some((clause) => clause.kind === 'all_damage_response');
  if (resistsAll) {
    for (const term of request.terms) add(term.type, 'resistant');
  }
  for (const effect of state.effects) {
    if (!effect.targets.includes(target) || effect.payload.kind !== 'damage_resistances') continue;
    if (effect.payload.source !== undefined && effect.payload.source !== source) continue;
    for (const type of effect.payload.damageTypes) add(type, effect.payload.response ?? 'resistant');
  }
  return [...responseByType].map(([type, responses]) => {
    if (responses.has('immune')) return { type, response: 'immune' as const };
    const resistant = responses.has('resistant') || responses.has('resistant_and_vulnerable');
    const vulnerable = responses.has('vulnerable') || responses.has('resistant_and_vulnerable');
    return {
      type,
      response: resistant && vulnerable
        ? 'resistant_and_vulnerable' as const
        : resistant ? 'resistant' as const : vulnerable ? 'vulnerable' as const : 'normal' as const,
    };
  });
}

interface ReductionContext {
  state: EncounterState;
  readonly rng: TransactionalRng;
  readonly events: EncounterEvent[];
}

function usedDamageReductionEffects(state: EncounterState): readonly EncounterEffectId[] {
  return state.activeCombatant === null
    ? []
    : combatant(state, state.activeCombatant).turn.usedDamageReductionEffectIds ?? [];
}

function markDamageReductionUsed(context: ReductionContext, effectId: EncounterEffectId): void {
  const active = context.state.activeCombatant;
  if (active === null) return;
  const subject = combatant(context.state, active);
  context.state = replaceCombatant(context.state, {
    ...subject,
    turn: {
      ...subject.turn,
      usedDamageReductionEffectIds: [...(subject.turn.usedDamageReductionEffectIds ?? []), effectId],
    },
  });
}

/**
 * All combatant damage paths converge here. SRD order is adjustments, then
 * Resistance, then Vulnerability (docs/srd/full/srd-5.2.1.txt:1044-1072).
 */
function resolveTargetDamage(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  request: DamageRequest,
): ReturnType<typeof resolveDamage> {
  const raw = resolveDamage({ ...request, responses: [] }, context.rng);
  const adjusted = raw.terms.map((term) => term.beforeResponse);
  const reductions = [...context.state.effects]
    .filter((effect) =>
      effect.targets.includes(target) &&
      effect.payload.kind === 'damage_reduction' &&
      !(usedDamageReductionEffects(context.state)).includes(effect.id))
    .sort((left, right) =>
      left.createdRevision - right.createdRevision || String(left.id).localeCompare(String(right.id)));
  for (const effect of reductions) {
    if (effect.payload.kind !== 'damage_reduction') continue;
    const payload = effect.payload;
    const matching = raw.terms
      .map((term, index) => ({ term, index }))
      .filter(({ term, index }) => term.type === payload.damageType && adjusted[index] !== 0);
    if (matching.length === 0) continue;
    let remaining = rollDice(context.rng, {
      count: payload.count, sides: dieSides(payload.sides), modifier: 0,
    }).total;
    for (const { index } of matching) {
      const reduction = Math.min(adjusted[index] ?? 0, remaining);
      adjusted[index] = (adjusted[index] ?? 0) - reduction;
      remaining -= reduction;
      if (remaining === 0) break;
    }
    markDamageReductionUsed(context, effect.id);
  }
  const responses = new Map(
    targetDamageResponses(context.state, source, target, request)
      .map((entry) => [entry.type, entry.response] as const),
  );
  const terms = raw.terms.map((term, index) => ({
    ...term,
    afterResponse: applyDamageResponse(adjusted[index] ?? 0, responses.get(term.type) ?? 'normal'),
  }));
  return { terms, total: terms.reduce((sum, term) => sum + term.afterResponse, 0) };
}

type UnsequencedEvent<T> = T extends EncounterEvent
  ? Omit<T, 'sequence'>
  : never;

function emit(
  context: ReductionContext,
  event: UnsequencedEvent<EncounterEvent>,
): void {
  const emitted = {
    ...event,
    sequence: context.state.nextEventSequence,
  } as EncounterEvent;
  context.events.push(emitted);
  context.state = {
    ...context.state,
    nextEventSequence: context.state.nextEventSequence + 1,
    eventLog: [...context.state.eventLog, emitted],
  };
}

function endEffects(
  context: ReductionContext,
  ids: ReadonlySet<EncounterEffectId>,
  reason: Extract<EncounterEvent, { readonly type: 'effect_ended' }>['reason'],
): void {
  if (ids.size === 0) return;
  for (const effect of context.state.effects) {
    if (!ids.has(effect.id)) continue;
    if (effect.payload.kind === 'temporary_banishment') {
      restoreBanishedTargets(context, effect, reason === 'duration_expired');
    }
    emit(context, { type: 'effect_ended', effectId: effect.id, reason });
  }
  context.state = {
    ...context.state,
    effects: context.state.effects.filter((effect) => !ids.has(effect.id)),
  };
}

function nearestReturnPosition(state: EncounterState, origin: GridCell): GridCell {
  const candidates: GridCell[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const cell = { column, row };
      if (movementBlocked(state, cell)) continue;
      if (state.tokens.some((occupied) => cellKey(occupied.position) === cellKey(cell))) continue;
      candidates.push(cell);
    }
  }
  const selected = candidates.sort((left, right) =>
    gridDistance(left, origin) - gridDistance(right, origin) ||
    left.row - right.row ||
    left.column - right.column)[0];
  if (selected === undefined) {
    throw new EncounterRuleError('A banished combatant has no unoccupied return space.');
  }
  return selected;
}

function restoreBanishedTargets(
  context: ReductionContext,
  effect: EncounterEffect,
  applyReturnDamage: boolean,
): void {
  if (effect.payload.kind !== 'temporary_banishment') return;
  for (const target of effect.targets) {
    const absentTokens = context.state.absentTokens ?? [];
    const stored = absentTokens.find((candidate) => candidate.combatantId === target);
    if (stored === undefined) continue;
    const position = nearestReturnPosition(context.state, stored.position);
    const returned = { ...stored, position };
    context.state = {
      ...context.state,
      tokens: [...context.state.tokens, returned],
      absentTokens: absentTokens.filter((candidate) => candidate.combatantId !== target),
    };
    emit(context, { type: 'combatant_returned_to_board', combatant: target, effectId: effect.id, position });
    if (!applyReturnDamage) continue;
    const request = effect.payload.returnDamage;
    const result = resolveTargetDamage(context, effect.source, target, request);
    applyDamage(context, effect.source, target, result.total);
    concentrationCheck(context, target, result.total);
  }
}

function endConcentration(
  context: ReductionContext,
  owner: CombatantId,
  reason: 'concentration_replaced' | 'concentration_ended' | 'concentration_broken',
): void {
  const areaIds = context.state.persistentAreas
    .filter((area) => area.owner === owner && area.duration.kind === 'concentration')
    .map((area) => area.id);
  endEffects(
    context,
    new Set(
      context.state.effects
        .filter((effect) => effect.concentrationOwner === owner)
        .map((effect) => effect.id),
    ),
    reason,
  );
  for (const areaId of areaIds) endPersistentArea(context, areaId, reason);
}

// Bundled SRD 5.2.1, docs/srd/full/srd-5.2.1.txt:1084-1120.
const DEATH_SAVE_NATURAL_ONE = 1;
const DEATH_SAVE_NATURAL_TWENTY = 20;
const DEATH_SAVE_SUCCESS_FLOOR = 10;
const DEATH_SAVE_RESOLUTION_COUNT = 3;
const DEATH_SAVE_SINGLE_MARK = 1;
const NATURAL_ONE_FAILURES = 2;
const NATURAL_TWENTY_HIT_POINTS = 1;

function effectiveHitPointMaximum(state: EncounterState, target: CombatantId): number {
  const base = combatant(state, target).profile.rules.hitPointMaximum;
  return state.effects.reduce((maximum, candidate) =>
    candidate.targets.includes(target) && candidate.payload.kind === 'hit_point_maximum_modifier'
      ? maximum + candidate.payload.amount
      : maximum, base);
}

function applyDamage(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  amount: number,
  critical = false,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new EncounterRuleError('Damage must be a non-negative safe integer.');
  }
  const before = combatant(context.state, target);
  const hitPointMaximum = effectiveHitPointMaximum(context.state, target);
  if (before.life === 'dead' || amount === 0) return;
  const absorbed = Math.min(before.temporaryHitPoints, amount);
  const hitPointDamage = amount - absorbed;
  const hitPointsAfter = Math.max(0, before.hitPoints - hitPointDamage);
  let life: LifeState = before.life;
  let deathSaves = before.deathSaves;
  let massiveDamage = false;
  if (before.hitPoints === 0) {
    massiveDamage =
      before.profile.rules.usesDeathSaves &&
      hitPointDamage >= hitPointMaximum;
    if (massiveDamage) {
      life = 'dead';
      deathSaves = null;
    } else if (before.profile.rules.usesDeathSaves) {
      const failures =
        (deathSaves?.failures ?? 0) +
        (critical ? NATURAL_ONE_FAILURES : DEATH_SAVE_SINGLE_MARK);
      if (failures >= DEATH_SAVE_RESOLUTION_COUNT) {
        life = 'dead';
        deathSaves = null;
      } else {
        life = 'dying';
        deathSaves = {
          successes: deathSaves?.successes ?? 0,
          failures,
        };
      }
    }
  } else if (hitPointsAfter === 0) {
    const remainder = hitPointDamage - before.hitPoints;
    massiveDamage =
      before.profile.rules.usesDeathSaves &&
      remainder >= hitPointMaximum;
    life = massiveDamage
      ? 'dead'
      : before.profile.rules.usesDeathSaves
        ? 'dying'
        : 'dead';
    deathSaves = life === 'dying' ? { successes: 0, failures: 0 } : null;
  }
  const after = {
    ...before,
    hitPoints: hitPointsAfter,
    temporaryHitPoints: before.temporaryHitPoints - absorbed,
    life,
    deathSaves,
  };
  context.state = replaceCombatant(context.state, after);
  emit(context, {
    type: 'damage_applied',
    source,
    target,
    amount: hitPointDamage,
    hitPointsBefore: before.hitPoints,
    hitPointsAfter,
    lifeState: life,
    massiveDamage,
  });
  breakEffectsOnDamage(context, source, target, amount);
  if (life !== 'living') endConcentration(context, target, 'concentration_broken');
}

function damageSourceMatchesEffect(
  state: EncounterState,
  effect: EncounterEffect,
  damageSource: CombatantId,
): boolean {
  if (effect.damageBreak?.sources === 'any') return true;
  return combatant(state, damageSource).profile.kind === combatant(state, effect.source).profile.kind;
}

function breakEffectsOnDamage(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  damage: number,
): void {
  if (damage < 1) return;
  const ids = new Set(
    context.state.effects
      .filter((effect) =>
        effect.targets.includes(target) &&
        effect.damageBreak !== undefined &&
        effect.damageBreak !== null &&
        damage >= effect.damageBreak.minimumDamage &&
        damageSourceMatchesEffect(context.state, effect, source))
      .map((effect) => effect.id),
  );
  endEffects(context, ids, 'damage_taken');
}

function resolveDeathSave(context: ReductionContext, id: CombatantId): void {
  const before = combatant(context.state, id);
  if (
    before.life !== 'dying' ||
    before.hitPoints !== 0 ||
    !before.profile.rules.usesDeathSaves
  ) {
    return;
  }
  const roll = rollD20(context.rng, 'normal').chosen;
  const prior = before.deathSaves ?? { successes: 0, failures: 0 };
  let successes = prior.successes;
  let failures = prior.failures;
  let life: LifeState = 'dying';
  let hitPoints = 0;
  let outcome: Extract<
    EncounterEvent,
    { readonly type: 'death_save_resolved' }
  >['outcome'];

  if (roll === DEATH_SAVE_NATURAL_ONE) {
    failures += NATURAL_ONE_FAILURES;
    outcome = 'natural_1';
  } else if (roll === DEATH_SAVE_NATURAL_TWENTY) {
    hitPoints = NATURAL_TWENTY_HIT_POINTS;
    life = 'living';
    outcome = 'natural_20';
  } else if (roll >= DEATH_SAVE_SUCCESS_FLOOR) {
    successes += DEATH_SAVE_SINGLE_MARK;
    outcome = 'success';
  } else {
    failures += DEATH_SAVE_SINGLE_MARK;
    outcome = 'failure';
  }

  if (life === 'dying' && successes >= DEATH_SAVE_RESOLUTION_COUNT) {
    life = 'stable';
  }
  if (life === 'dying' && failures >= DEATH_SAVE_RESOLUTION_COUNT) {
    life = 'dead';
  }
  context.state = replaceCombatant(context.state, {
    ...before,
    hitPoints,
    life,
    deathSaves: life === 'dying' ? { successes, failures } : null,
  });
  emit(context, {
    type: 'death_save_resolved',
    visibility: 'dm_only',
    combatant: id,
    roll,
    outcome,
    successes,
    failures,
    lifeState: life,
  });
}

function resolveTargetSave(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  ability: Ability,
  dc: number,
  mode: RollMode,
  effectId: EncounterEffectId | null,
): ReturnType<typeof resolveSavingThrow> {
  const subject = combatant(context.state, target);
  const save = automaticSaveFailure(context.state, target, ability)
    ? {
        outcome: 'failure' as const,
        roll: { mode: 'normal' as const, faces: [], chosen: 0 },
        total: 0,
      }
    : resolveSavingThrow(
        {
          bonus:
            subject.profile.rules.savingThrowBonuses[ability] +
            exhaustionPenalty(combatantConditions(context.state, target)) +
            effectDiceModifier(context.state, target, 'saving_throw', context.rng),
          dc: difficultyClass(dc),
          rollMode: saveRollMode(context.state, target, ability, mode),
        },
        context.rng,
      );
  emit(context, { type: 'save_resolved', source, target, ability, save, effectId });
  return save;
}

function concentrationCheck(
  context: ReductionContext,
  target: CombatantId,
  damage: number,
): void {
  if (damage === 0) return;
  if (!context.state.effects.some((effect) => effect.concentrationOwner === target)) return;
  const result = resolveTargetSave(
    context,
    target,
    target,
    'constitution',
    Math.min(30, Math.max(10, Math.floor(damage / 2))),
    'normal',
    null,
  );
  if (result.outcome === 'failure') endConcentration(context, target, 'concentration_broken');
}

function assertActiveActor(context: ReductionContext, actor: CombatantId): EncounterCombatantState {
  if (context.state.activeCombatant !== actor) {
    throw new EncounterRuleError(`Combatant ${actor} is not the active combatant.`);
  }
  const subject = combatant(context.state, actor);
  if (subject.life !== 'living') {
    throw new EncounterRuleError(`Combatant ${actor} cannot act while ${subject.life}.`);
  }
  if (!isCombatantOnBoard(context.state, actor)) {
    throw new EncounterRuleError(`Combatant ${actor} is absent from the board.`);
  }
  return subject;
}

function assertCanUseActions(context: ReductionContext, actor: CombatantId): void {
  if (isIncapacitated(combatantConditions(context.state, actor))) {
    throw new EncounterRuleError(`Combatant ${actor} is Incapacitated.`);
  }
}

function spendAction(
  context: ReductionContext,
  actor: CombatantId,
  purpose: string,
): void {
  assertCanUseActions(context, actor);
  const subject = combatant(context.state, actor);
  if (subject.turn.action.kind !== 'available') {
    throw new EncounterRuleError(`Combatant ${actor} has no action available.`);
  }
  context.state = replaceCombatant(context.state, {
    ...subject,
    turn: { ...subject.turn, action: { kind: 'spent' } },
  });
  emit(context, { type: 'resource_spent', combatant: actor, resource: 'action', purpose });
}

function spendCost(
  context: ReductionContext,
  actor: CombatantId,
  cost: 'action' | 'bonus_action' | 'reaction' | 'none',
  purpose: string,
): void {
  switch (cost) {
    case 'none':
      assertCanUseActions(context, actor);
      return;
    case 'action':
      spendAction(context, actor, purpose);
      return;
    case 'bonus_action': {
      assertCanUseActions(context, actor);
      const subject = combatant(context.state, actor);
      if (!subject.turn.bonusActionAvailable) {
        throw new EncounterRuleError(`Combatant ${actor} has no Bonus Action available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, bonusActionAvailable: false },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'bonus_action', purpose });
      return;
    }
    case 'reaction': {
      const subject = combatant(context.state, actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, actor))) {
        throw new EncounterRuleError(`Combatant ${actor} cannot react.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${actor} has no Reaction available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, reactionAvailable: false },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'reaction', purpose });
      return;
    }
  }
}

function spendObjectInteraction(
  context: ReductionContext,
  actor: CombatantId,
  mode: ObjectInteractionMode,
  purpose: 'drop' | 'pickup' | 'equip' | 'stow',
): void {
  assertActiveActor(context, actor);
  assertCanUseActions(context, actor);
  const subject = combatant(context.state, actor);
  if (mode === 'free') {
    if ((subject.turn.objectInteractionsUsed ?? 1) >= FREE_OBJECT_INTERACTIONS_PER_TURN) {
      throw new EquipmentRuleError(
        'free_interaction_spent',
        `Combatant ${actor} has already used its free object interaction.`,
      );
    }
    context.state = replaceCombatant(context.state, {
      ...subject,
      turn: { ...subject.turn, objectInteractionsUsed: 1 },
    });
  } else {
    if (subject.turn.action.kind !== 'available') {
      throw new EquipmentRuleError('utilize_action_unavailable', `Combatant ${actor} has no action available for Utilize.`);
    }
    spendAction(context, actor, `Utilize: ${purpose} item`);
  }
  emit(context, { type: 'object_interaction_spent', combatant: actor, mode, purpose });
}

function forcedDropItem(context: ReductionContext, actor: CombatantId, id: ItemId): void {
  const equipment = combatantEquipment(context.state, actor);
  const definition = encounterItem(context.state, id);
  const removed = removeEquippedItem(equipment, id);
  if (removed === null) throw new EquipmentRuleError('item_not_equipped', `Item ${id} is not equipped by ${actor}.`);
  if (!heldItems(equipment.hands).includes(id) || definition.equip.droppable !== true) {
    throw new EquipmentRuleError('cannot_drop', `Item ${id} cannot be dropped while equipped.`);
  }
  const position = { ...token(context.state, actor).position };
  context.state = {
    ...replaceEquipment(context.state, removed),
    groundItems: [...(context.state.groundItems ?? []), { item: id, position }],
    itemContacts: (context.state.itemContacts ?? []).filter((contact) => contact.item !== id || contact.combatant !== actor),
  };
  emit(context, { type: 'item_dropped', combatant: actor, item: id, position, cause: 'forced' });
}

function processEquipmentCommand(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'drop_item' | 'pickup_item' | 'equip_item' | 'stow_item' }>,
): void {
  const definition = encounterItem(context.state, command.item);
  const equipment = combatantEquipment(context.state, command.actor);
  switch (command.type) {
    case 'drop_item': {
      const removed = removeEquippedItem(equipment, command.item);
      if (removed === null) throw new EquipmentRuleError('item_not_equipped', `Item ${command.item} is not equipped.`);
      if (!heldItems(equipment.hands).includes(command.item) || definition.equip.droppable !== true) {
        throw new EquipmentRuleError('cannot_drop', `Item ${command.item} cannot be dropped while equipped.`);
      }
      spendObjectInteraction(context, command.actor, command.interaction, 'drop');
      const position = { ...token(context.state, command.actor).position };
      context.state = {
        ...replaceEquipment(context.state, removed),
        groundItems: [...(context.state.groundItems ?? []), { item: command.item, position }],
        itemContacts: (context.state.itemContacts ?? []).filter((contact) =>
          contact.item !== command.item || contact.combatant !== command.actor),
      };
      emit(context, { type: 'item_dropped', combatant: command.actor, item: command.item, position, cause: 'interaction' });
      return;
    }
    case 'pickup_item': {
      const ground = context.state.groundItems?.find((candidate) => candidate.item === command.item);
      if (ground === undefined) throw new EquipmentRuleError('item_not_on_ground', `Item ${command.item} is not on the board.`);
      if (cellKey(ground.position) !== cellKey(token(context.state, command.actor).position)) {
        throw new EquipmentRuleError('item_not_at_actor_cell', `Item ${command.item} is not at ${command.actor}'s cell.`);
      }
      spendObjectInteraction(context, command.actor, command.interaction, 'pickup');
      context.state = replaceEquipment({
        ...context.state,
        groundItems: (context.state.groundItems ?? []).filter((candidate) => candidate.item !== command.item),
      }, {
        ...equipment,
        carried: [...equipment.carried, command.item].sort((left, right) => String(left).localeCompare(String(right))),
      });
      emit(context, { type: 'item_picked_up', combatant: command.actor, item: command.item });
      return;
    }
    case 'equip_item': {
      if (!equipment.carried.includes(command.item)) {
        throw new EquipmentRuleError('item_not_carried', `Item ${command.item} is not carried by ${command.actor}.`);
      }
      const equipped = addEquippedItem(equipment, definition);
      spendObjectInteraction(context, command.actor, command.interaction, 'equip');
      context.state = replaceEquipment(context.state, {
        ...equipped,
        carried: equipment.carried.filter((candidate) => candidate !== command.item),
      });
      emit(context, { type: 'item_equipped', combatant: command.actor, item: command.item });
      return;
    }
    case 'stow_item': {
      const removed = removeEquippedItem(equipment, command.item);
      if (removed === null) throw new EquipmentRuleError('item_not_equipped', `Item ${command.item} is not equipped.`);
      spendObjectInteraction(context, command.actor, command.interaction, 'stow');
      context.state = replaceEquipment(context.state, {
        ...removed,
        carried: [...removed.carried, command.item].sort((left, right) => String(left).localeCompare(String(right))),
      });
      emit(context, { type: 'item_stowed', combatant: command.actor, item: command.item });
      return;
    }
  }
}

function spendLimitedResource(
  context: ReductionContext,
  actor: CombatantId,
  resourcePoolId: LimitedResourcePoolId,
  purpose: string,
): void {
  const subject = combatant(context.state, actor);
  const limitedResources = subject.limitedResources ?? [];
  const pool = limitedResources.find((candidate) => candidate.id === resourcePoolId);
  if (pool === undefined) {
    throw new EncounterRuleError(`Combatant ${actor} has no resource pool ${resourcePoolId}.`);
  }
  if (pool.remaining < 1) {
    throw new EncounterRuleError(`Resource pool ${resourcePoolId} is empty.`);
  }
  const remaining = pool.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    limitedResources: limitedResources.map((candidate) =>
      candidate.id === resourcePoolId ? { ...candidate, remaining } : candidate),
  });
  emit(context, {
    type: 'limited_resource_spent',
    combatant: actor,
    resourcePoolId,
    remaining,
    purpose,
  });
}

function featureEffect(
  state: EncounterState,
  actor: CombatantId,
  effectId: EncounterEffectId,
): CombatFeatureEffect {
  const effect = (combatant(state, actor).profile.rules.featureEffects ?? [])
    .find((candidate) => candidate.id === effectId);
  if (effect === undefined) {
    throw new EncounterRuleError(`Combatant ${actor} has no feature effect ${effectId}.`);
  }
  return effect;
}

function attacksPerAction(subject: EncounterCombatantState): number {
  const overrides = (subject.profile.rules.featureEffects ?? []).flatMap((effect) =>
    effect.payload.kind === 'extra_attack_count_override'
      ? [effect.payload.attackCount]
      : []);
  return overrides.length === 0
    ? subject.profile.rules.attacksPerAction
    : Math.max(...overrides);
}

function beginAttack(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): void {
  const actor = command.actor;
  assertCanUseActions(context, actor);
  let subject = combatant(context.state, actor);
  if (command.bonusActionGrantEffectId !== undefined) {
    const grant = featureEffect(context.state, actor, command.bonusActionGrantEffectId);
    if (grant.payload.kind !== 'bonus_action_attack_grant') {
      throw new EncounterRuleError(`Effect ${grant.id} does not grant Bonus Action attacks.`);
    }
    if ((subject.turn.bonusAttacksRemaining ?? 0) > 0) {
      if (subject.turn.bonusAttackGrantEffectId !== grant.id) {
        throw new EncounterRuleError(`Combatant ${actor} is already resolving another Bonus Action attack grant.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          bonusAttacksRemaining: (subject.turn.bonusAttacksRemaining ?? 0) - 1,
          bonusAttackGrantEffectId:
            subject.turn.bonusAttacksRemaining === 1 ? null : grant.id,
        },
      });
      return;
    }
    spendCost(context, actor, 'bonus_action', `Effect ${grant.id}`);
    if (grant.resourcePoolId !== null) {
      spendLimitedResource(context, actor, grant.resourcePoolId, `Effect ${grant.id}`);
    }
    subject = combatant(context.state, actor);
    context.state = replaceCombatant(context.state, {
      ...subject,
      turn: {
        ...subject.turn,
        bonusAttacksRemaining: grant.payload.attackCount - 1,
        bonusAttackGrantEffectId: grant.payload.attackCount === 1 ? null : grant.id,
      },
    });
    return;
  }
  switch (subject.turn.action.kind) {
    case 'available': {
      const remaining = attacksPerAction(subject) - 1;
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          action:
            remaining === 0
              ? { kind: 'spent' }
              : { kind: 'attack_sequence', attacksRemaining: remaining },
        },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'action', purpose: 'Attack' });
      return;
    }
    case 'attack_sequence': {
      const remaining = subject.turn.action.attacksRemaining - 1;
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          action:
            remaining === 0
              ? { kind: 'spent' }
              : { kind: 'attack_sequence', attacksRemaining: remaining },
        },
      });
      return;
    }
    case 'spent':
      throw new EncounterRuleError(`Combatant ${actor} has no attack available.`);
  }
}

export function encounterMovementWorld(state: EncounterState): MovementWorld<CombatantId> {
  return {
    bounds: state.bounds,
    canTraverseStep: () => true,
    traversal: (actorId, _from, to) => {
      if (movementBlocked(state, to)) {
        return { kind: 'blocked', reason: 'blocked cell' };
      }
      const occupied = state.tokens.some(
        (candidate) =>
          candidate.combatantId !== actorId &&
          combatant(state, candidate.combatantId).life !== 'dead' &&
          cellKey(candidate.position) === cellKey(to),
      );
      const difficult = !ignoresDifficultTerrain(state, actorId) && (isEnvironmentDifficultTerrain(state.environment, to) || state.persistentAreas.some((area) => {
        if (!area.difficultTerrain) return false;
        const origin = area.origin;
        const anchor = origin.kind === 'anchored'
          ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
          : origin.kind === 'anchored_to_object'
            ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
            : null;
        return persistentAreaContains(area, to, anchor, state);
      }));
      return { kind: 'enterable', cost: feet(difficult ? 10 : 5), canEnd: !occupied };
    },
  };
}

const AREA_HOOK_ORDER: Readonly<Record<PersistentAreaHook, number>> = {
  on_enter: 0,
  on_start_of_turn_inside: 1,
  on_end_of_turn_inside: 2,
  on_exit: 3,
};

function orderedAreas(state: EncounterState): readonly PersistentArea[] {
  return [...state.persistentAreas].sort((left, right) =>
    left.sequence - right.sequence || String(left.id).localeCompare(String(right.id)));
}

function areaTargetEligible(state: EncounterState, area: PersistentArea, target: CombatantId): boolean {
  switch (area.targetFilter.kind) {
    case 'all': return true;
    case 'selected': return area.targetFilter.combatants.includes(target);
    case 'allies': return combatant(state, target).profile.kind === combatant(state, area.owner).profile.kind;
    case 'enemies': return combatant(state, target).profile.kind !== combatant(state, area.owner).profile.kind;
  }
}

function areaMembers(state: EncounterState, area: PersistentArea): readonly CombatantId[] {
  const origin = area.origin;
  const anchor = origin.kind === 'anchored'
    ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
    : origin.kind === 'anchored_to_object'
      ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
      : null;
  return state.combatants
    .filter((subject) => subject.life !== 'dead')
    .filter((subject) => areaTargetEligible(state, area, subject.profile.id))
    .flatMap((subject): readonly CombatantId[] => {
      const placed = state.tokens.find((candidate) => candidate.combatantId === subject.profile.id);
      return placed !== undefined && persistentAreaContains(area, placed.position, anchor, state)
        ? [subject.profile.id]
        : [];
    })
    .sort((left, right) => String(left).localeCompare(String(right)));
}

function endPersistentArea(
  context: ReductionContext,
  areaId: PersistentAreaId,
  reason: Extract<EncounterEvent, { readonly type: 'persistent_area_ended' }>['reason'],
): void {
  if (!context.state.persistentAreas.some((area) => area.id === areaId)) return;
  endEffects(
    context,
    new Set(context.state.effects.filter((effect) => effect.areaSource === areaId).map((effect) => effect.id)),
    reason === 'anchor_destroyed' ? 'no_targets' : reason,
  );
  context.state = {
    ...context.state,
    persistentAreas: context.state.persistentAreas.filter((area) => area.id !== areaId),
  };
  emit(context, { type: 'persistent_area_ended', areaId, reason });
}

function areaTurnIdentity(state: EncounterState): string {
  return `${String(state.round)}:${String(state.activeCombatant ?? 'none')}`;
}

function consumeAreaTurnKey(
  context: ReductionContext,
  area: PersistentArea,
  hook: PersistentAreaHook,
  target: CombatantId,
): boolean {
  const turn = areaTurnIdentity(context.state);
  const key = `${turn}:${String(target)}`;
  const currentKeys = area.consumedTurnKeys.filter((candidate) => candidate.startsWith(`${turn}:`));
  if (currentKeys.includes(key)) return false;
  context.state = {
    ...context.state,
    persistentAreas: context.state.persistentAreas.map((candidate) => candidate.id === area.id
      ? { ...candidate, consumedTurnKeys: [...currentKeys, key].sort() }
      : candidate),
  };
  void hook;
  return true;
}

function applyPersistentAreaEffect(
  context: ReductionContext,
  area: PersistentArea,
  hook: PersistentAreaHook,
  target: CombatantId,
  spec: PersistentAreaEffectSpec,
  hookIndex: number,
): void {
  if (combatant(context.state, target).life === 'dead') return;
  let saveSucceeded = false;
  if (spec.kind === 'save_gated') {
    saveSucceeded = resolveTargetSave(
      context,
      area.owner,
      target,
      spec.ability,
      spec.dc,
      spec.rollMode,
      null,
    ).outcome === 'success';
  }
  if (spec.payload.kind === 'damage') {
    const result = resolveTargetDamage(context, area.owner, target, spec.payload.damage);
    const amount = saveSucceeded
      ? spec.kind === 'save_gated' && spec.onSuccess === 'half' ? Math.floor(result.total / 2) : 0
      : result.total;
    applyDamage(context, area.owner, target, amount);
    concentrationCheck(context, target, amount);
    return;
  }
  if (saveSucceeded) return;
  const lifetime = spec.payload.lifetime;
  if (lifetime.kind === 'save_ends' && spec.kind !== 'save_gated') {
    throw new EncounterRuleError('A save-ends area effect requires a save gate.');
  }
  const duration = lifetime.kind === 'fixed_rounds'
    ? {
        kind: 'turn_boundaries' as const,
        timing: { combatant: target, boundary: lifetime.boundary, source: `persistent-area:${String(area.id)}` },
        remaining: lifetime.rounds,
      }
    : { kind: 'permanent' as const };
  const repeatedSave = lifetime.kind === 'save_ends' && spec.kind === 'save_gated'
    ? {
        timing: { combatant: target, boundary: lifetime.boundary, source: `persistent-area:${String(area.id)}` },
        ability: spec.ability,
        dc: spec.dc,
        rollMode: spec.rollMode,
        onSuccess: 'remove_target' as const,
      }
    : null;
  applyEffect(context, area.owner, {
    targets: [target],
    duration,
    concentration: false,
    stackingIdentity: effectStackingIdentity(`area:${String(area.id)}:${hook}:${String(hookIndex)}:${String(target)}`),
    stacking: 'replace_same_source',
    repeatedSave,
    payload: spec.payload.payload,
    areaSource: area.id,
    ...(lifetime.kind === 'while_inside' ? { areaMembershipBound: true as const } : {}),
  });
}

function triggerPersistentAreaHook(
  context: ReductionContext,
  areaId: PersistentAreaId,
  hook: PersistentAreaHook,
  target: CombatantId,
): void {
  const area = context.state.persistentAreas.find((candidate) => candidate.id === areaId);
  if (area === undefined || !areaTargetEligible(context.state, area, target)) return;
  const specs = area.hooks
    .map((spec, index) => ({ spec, index }))
    .filter(({ spec }) => spec.hook === hook)
    .sort((left, right) => AREA_HOOK_ORDER[left.spec.hook] - AREA_HOOK_ORDER[right.spec.hook] || left.index - right.index);
  for (const { spec, index } of specs) {
    const refreshed = context.state.persistentAreas.find((candidate) => candidate.id === areaId);
    if (refreshed === undefined) return;
    if (spec.frequency === 'once_per_turn' && !consumeAreaTurnKey(context, refreshed, hook, target)) continue;
    emit(context, { type: 'persistent_area_triggered', areaId, hook, target });
    applyPersistentAreaEffect(context, refreshed, hook, target, spec.effect, index);
  }
  triggerSustainedAreaHook(context, areaId, hook, target);
}

/**
 * Re-evaluates areas in creation order and creatures by CombatantId. This is
 * the single membership ordering used by movement, area movement, and replay.
 */
function reevaluatePersistentAreaMembership(context: ReductionContext): void {
  for (const snapshot of orderedAreas(context.state)) {
    const area = context.state.persistentAreas.find((candidate) => candidate.id === snapshot.id);
    if (area === undefined) continue;
    const members = areaMembers(context.state, area);
    const entered = members.filter((member) => !area.members.includes(member));
    const exited = area.members.filter((member) => !members.includes(member));
    if (entered.length === 0 && exited.length === 0) continue;
    context.state = {
      ...context.state,
      persistentAreas: context.state.persistentAreas.map((candidate) => candidate.id === area.id
        ? { ...candidate, members }
        : candidate),
    };
    emit(context, { type: 'persistent_area_membership_changed', areaId: area.id, entered, exited });
    const transitions = [...entered.map((target) => ({ target, hook: 'on_enter' as const })),
      ...exited.map((target) => ({ target, hook: 'on_exit' as const }))]
      .sort((left, right) => String(left.target).localeCompare(String(right.target)) ||
        AREA_HOOK_ORDER[left.hook] - AREA_HOOK_ORDER[right.hook]);
    for (const transition of transitions) {
      if (transition.hook === 'on_exit') {
        endEffects(
          context,
          new Set(context.state.effects.filter((effect) =>
            effect.areaSource === area.id && effect.areaMembershipBound === true && effect.targets.includes(transition.target))
            .map((effect) => effect.id)),
          'no_targets',
        );
      }
      triggerPersistentAreaHook(context, area.id, transition.hook, transition.target);
    }
  }
}

function validatePersistentAreaInput(state: EncounterState, actor: CombatantId, input: PersistentAreaInput): void {
  if (input.owner !== actor) throw new EncounterRuleError('A persistent area must be owned by its acting combatant.');
  combatant(state, input.owner);
  if (!Number.isSafeInteger(input.duration.remaining) || input.duration.remaining < 1) {
    throw new EncounterRuleError('Persistent-area duration must be a positive number of rounds.');
  }
  if (input.origin.kind === 'anchored') {
    token(state, input.origin.combatant);
    if (input.movable !== null) throw new EncounterRuleError('An anchored persistent area cannot also be moved independently.');
  }
  if (input.origin.kind === 'anchored_to_object') {
    const anchorObjectId = input.origin.object;
    if (!state.worldObjects.some((object) => object.id === anchorObjectId)) {
      throw new EncounterRuleError(`Persistent-area anchor object ${anchorObjectId} does not exist.`);
    }
    if (input.movable !== null) throw new EncounterRuleError('An object-anchored persistent area cannot also be moved independently.');
  }
  if (input.targetFilter.kind === 'selected') {
    assertUnique(input.targetFilter.combatants, 'Persistent-area selected targets');
    for (const target of input.targetFilter.combatants) combatant(state, target);
  }
  for (const hook of input.hooks) {
    if (hook.effect.payload.kind === 'effect' && hook.effect.payload.lifetime.kind === 'fixed_rounds' &&
      (!Number.isSafeInteger(hook.effect.payload.lifetime.rounds) || hook.effect.payload.lifetime.rounds < 1)) {
      throw new EncounterRuleError('A fixed persistent-area effect duration must be positive.');
    }
    if (hook.effect.kind === 'save_gated') difficultyClass(hook.effect.dc);
  }
}

function createPersistentArea(context: ReductionContext, actor: CombatantId, input: PersistentAreaInput): PersistentAreaId {
  validatePersistentAreaInput(context.state, actor, input);
  if (input.duration.kind === 'concentration') endConcentration(context, actor, 'concentration_replaced');
  const sequence = context.state.nextPersistentAreaSequence;
  const id = persistentAreaId(`area:${String(sequence)}`);
  const area: PersistentArea = {
    ...structuredClone(input),
    id,
    sequence,
    members: [],
    consumedTurnKeys: [],
  };
  context.state = {
    ...context.state,
    nextPersistentAreaSequence: sequence + 1,
    persistentAreas: [...context.state.persistentAreas, area],
  };
  emit(context, { type: 'persistent_area_created', areaId: id, owner: actor });
  reevaluatePersistentAreaMembership(context);
  return id;
}

/**
 * SRD Spike Growth says "for every 5 feet" (spell-descriptions.txt:7309-7312)
 * and is silent about a partial increment. The grid therefore charges only a
 * completed 5-foot entered cell; an incomplete increment causes no damage.
 */
export const MOVEMENT_DAMAGE_PARTIAL_UNIT_RULE = 'completed_units_only' as const;

/**
 * Stable entered-cell order: movement regions by id first, then persistent
 * areas by their creation sequence through membership reevaluation.
 */
function processEnteredCell(context: ReductionContext, mover: CombatantId): void {
  const position = token(context.state, mover).position;
  const regions = [...(context.state.environment.movementRegions ?? [])]
    .filter((region) => region.damage !== null && region.cells.some((cell) => cellKey(cell) === cellKey(position)))
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const region of regions) {
    if (region.damage === null || combatant(context.state, mover).life !== 'living') continue;
    const request: DamageRequest = {
      terms: [{
        type: region.damage.damageType,
        dice: {
          count: region.damage.dice.count,
          sides: dieSides(region.damage.dice.sides),
          modifier: region.damage.dice.modifier,
        },
      }],
      critical: false,
      responses: [],
    };
    const result = resolveTargetDamage(context, region.source, mover, request);
    applyDamage(context, region.source, mover, result.total);
    concentrationCheck(context, mover, result.total);
  }
  reevaluatePersistentAreaMembership(context);
}

function processMove(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): void {
  const subject = assertActiveActor(context, command.actor);
  assertCanUseActions(context, command.actor);
  const actorToken = token(context.state, command.actor);
  const reachSources = context.state.combatants
    .filter(
      (candidate) =>
        candidate.life === 'living' &&
        candidate.profile.kind !== subject.profile.kind &&
        candidate.profile.id !== command.actor,
    )
    .map((candidate) => ({
      reactorId: candidate.profile.id,
      cell: token(context.state, candidate.profile.id).position,
      reach: candidate.profile.rules.reach,
      reactionAvailable: candidate.turn.reactionAvailable,
      hostile: true,
    }));
  const cause =
    (command.cause === 'voluntary' && subject.turn.disengaging) ||
    command.cause === 'reactions_resolved'
      ? 'disengaged'
      : command.cause;
  const plan = planMovement(encounterMovementWorld(context.state), {
    actorId: command.actor,
    start: actorToken.position,
    path: command.path,
    budgetRemaining: subject.turn.movement.remaining,
    cause,
    reachSources,
  });
  if (plan.kind === 'illegal') {
    throw new EncounterRuleError(`Illegal movement: ${plan.reason} at step ${plan.stepIndex}.`);
  }
  if (plan.steps.some((step) => step.beforeLeaving.length > 0)) {
    throw new EncounterRuleError('Movement has an unresolved Opportunity Attack window.');
  }
  const traversed: GridCell[] = [];
  let spent = feet(0);
  for (const step of plan.steps) {
    context.state = {
      ...context.state,
      tokens: context.state.tokens.map((candidate) => candidate.combatantId === command.actor
        ? { ...candidate, position: { ...step.to } }
        : candidate),
    };
    traversed.push({ ...step.to });
    spent = feet(spent + step.cost);
    processEnteredCell(context, command.actor);
    if (combatant(context.state, command.actor).life !== 'living') break;
  }
  const movement = spendMovement(subject.turn.movement, spent);
  context.state = replaceCombatant(context.state, {
    ...combatant(context.state, command.actor),
    turn: { ...combatant(context.state, command.actor).turn, movement },
  });
  emit(context, {
    type: 'movement_completed',
    combatant: command.actor,
    path: traversed,
    spent,
    remaining: movement.remaining,
  });
}

function effectBoundaryMatches(
  combatantId: CombatantId,
  boundary: TurnBoundary,
  timing: { readonly combatant: CombatantId; readonly boundary: TurnBoundary },
): boolean {
  return timing.combatant === combatantId && timing.boundary === boundary;
}

function removeEffectTarget(
  context: ReductionContext,
  effectId: EncounterEffectId,
  target: CombatantId,
  reason: 'save_succeeded' | 'condition_immunity' | 'condition_removed',
): void {
  const effect = context.state.effects.find((candidate) => candidate.id === effectId);
  if (effect === undefined || !effect.targets.includes(target)) return;
  const targets = effect.targets.filter((candidate) => candidate !== target);
  emit(context, { type: 'effect_target_removed', effectId, target, reason });
  if (targets.length === 0) {
    endEffects(context, new Set([effectId]), 'no_targets');
  } else {
    context.state = {
      ...context.state,
      effects: context.state.effects.map((candidate) =>
        candidate.id === effectId ? { ...candidate, targets } : candidate,
      ),
    };
  }
}

type SustainedEncounterEffect = EncounterEffect & {
  readonly payload: Extract<EffectPayload, { readonly kind: 'sustained_effect' }>;
};

type SustainedSpellDefinition = SpellDefinition & {
  readonly operation: Extract<BranchSpellOperation, { readonly kind: 'sustained_effect' }>;
};

function isSustainedEncounterEffect(effect: EncounterEffect): effect is SustainedEncounterEffect {
  return effect.payload.kind === 'sustained_effect';
}

function sustainedSpellCommand(
  effect: SustainedEncounterEffect,
  targets: readonly CombatantId[],
): SpellCastCommand {
  return {
    type: 'cast_spell', actor: effect.source, spellId: effect.payload.spellId,
    slotLevel: effect.payload.slotLevel, castAsRitual: false,
    casterLevel: effect.payload.casterLevel, attackBonus: effect.payload.attackBonus,
    saveDc: effect.payload.saveDc, spellcastingModifier: effect.payload.spellcastingModifier,
    targets, area: effect.payload.area === null ? null : structuredClone(effect.payload.area),
    weaponAttack: null, selectedOption: effect.payload.selectedOption,
    objectTargets: effect.payload.boundObjects,
    ownedObjectTargets: effect.payload.ownedObjects,
  };
}

function sustainedDefinitionForEffect(
  state: EncounterState,
  effect: SustainedEncounterEffect,
): SustainedSpellDefinition {
  const definition = spellDefinition(effect.payload.spellId) ??
    importedSpellDefinition(state.contentPacks, effect.payload.spellId);
  if (definition === null || definition.operation.kind !== 'sustained_effect') {
    throw new EncounterRuleError(`Sustained spell ${effect.payload.spellId} is not implemented.`);
  }
  return definition as SustainedSpellDefinition;
}

function resolveSustainedSequence(
  context: ReductionContext,
  effect: SustainedEncounterEffect,
  sequenceKind: 'automatic_tick' | 'event_trigger' | 'delayed_one_shot',
  trigger: 'source_start' | 'source_end' | PersistentAreaHook,
  targets: readonly CombatantId[],
  operation: BranchSpellOperation,
): void {
  const definition = sustainedDefinitionForEffect(context.state, effect);
  emit(context, {
    type: 'sustained_effect_triggered', caster: effect.source, effectId: effect.id,
    spellId: definition.id, sequenceKind, trigger, targets,
  });
  executeSpellOperation(
    context,
    definition,
    sustainedSpellCommand(effect, targets),
    targets,
    operation,
  );
}

function triggerSustainedAreaHook(
  context: ReductionContext,
  areaId: PersistentAreaId,
  hook: PersistentAreaHook,
  target: CombatantId,
): void {
  const snapshots = context.state.effects.filter((effect): effect is SustainedEncounterEffect =>
    isSustainedEncounterEffect(effect) && effect.payload.ownedAreas.includes(areaId));
  for (const snapshot of snapshots) {
    const effect = context.state.effects.find((candidate) => candidate.id === snapshot.id);
    if (effect === undefined || !isSustainedEncounterEffect(effect)) continue;
    const definition = sustainedDefinitionForEffect(context.state, effect);
    const sequence = definition.operation.sequence;
    switch (sequence.kind) {
      case 'activation':
      case 'automatic_tick':
      case 'delayed_one_shot':
      case 'instance_group_activation':
        continue;
      case 'event_trigger': {
        if (sequence.hook !== hook) continue;
        if (sequence.frequency === 'once_per_turn') {
          const turn = areaTurnIdentity(context.state);
          const key = `${turn}:${String(target)}`;
          const currentKeys = effect.payload.consumedEventTurnKeys
            .filter((candidate) => candidate.startsWith(`${turn}:`));
          if (currentKeys.includes(key)) continue;
          context.state = {
            ...context.state,
            effects: context.state.effects.map((candidate) => candidate.id === effect.id && candidate.payload.kind === 'sustained_effect'
              ? { ...candidate, payload: { ...candidate.payload, consumedEventTurnKeys: [...currentKeys, key].sort() } }
              : candidate),
          };
        }
        resolveSustainedSequence(context, effect, 'event_trigger', hook, [target], sequence.operation);
        break;
      }
    }
  }
}

function processBoundary(
  context: ReductionContext,
  subjectId: CombatantId,
  boundary: TurnBoundary,
): void {
  reevaluatePersistentAreaMembership(context);
  const areaHook: PersistentAreaHook = boundary === 'start'
    ? 'on_start_of_turn_inside'
    : 'on_end_of_turn_inside';
  for (const area of orderedAreas(context.state)) {
    if (area.members.includes(subjectId)) triggerPersistentAreaHook(context, area.id, areaHook, subjectId);
  }
  const branchHook = boundary === 'start' ? 'target_start' : 'target_end';
  const scheduledBranches = [...(context.state.reevaluatedBranches ?? [])]
    .sort((left, right) => left.sequence - right.sequence);
  for (const snapshot of scheduledBranches) {
    const scheduled = context.state.reevaluatedBranches?.find((candidate) => candidate.sequence === snapshot.sequence);
    if (scheduled === undefined || scheduled.target !== subjectId || scheduled.hook !== branchHook) continue;
    const definition = spellDefinition(scheduled.spellId) ??
      importedSpellDefinition(context.state.contentPacks, scheduled.spellId);
    if (definition === null) throw new EncounterRuleError(`Scheduled spell ${scheduled.spellId} is not implemented.`);
    executeSpellOperation(
      context,
      definition,
      { ...scheduled.command, targets: [subjectId] },
      [subjectId],
      scheduled.operation,
    );
    const remaining = scheduled.remaining - 1;
    context.state = {
      ...context.state,
      reevaluatedBranches: (context.state.reevaluatedBranches ?? []).flatMap((candidate) =>
        candidate.sequence !== scheduled.sequence
          ? [candidate]
          : remaining === 0 ? [] : [{ ...candidate, remaining }]),
    };
  }
  const effectIds = context.state.effects.map((effect) => effect.id);
  for (const effectId of effectIds) {
    const effect = context.state.effects.find((candidate) => candidate.id === effectId);
    if (effect === undefined) continue;

    if (isSustainedEncounterEffect(effect)) {
      const definition = sustainedDefinitionForEffect(context.state, effect);
      const sequence = definition.operation.sequence;
      const sourceBoundary = effect.source === subjectId &&
        (sequence.kind === 'automatic_tick' || sequence.kind === 'delayed_one_shot') &&
        (sequence.boundary === 'source_start' ? boundary === 'start' : boundary === 'end');
      switch (sequence.kind) {
        case 'activation':
        case 'event_trigger':
        case 'instance_group_activation':
          break;
        case 'automatic_tick':
          if (sourceBoundary) {
            resolveSustainedSequence(
              context, effect, 'automatic_tick', sequence.boundary,
              effect.payload.boundCombatants, sequence.operation,
            );
          }
          break;
        case 'delayed_one_shot':
          if (sourceBoundary) {
            const remaining = effect.payload.delayedRoundsRemaining;
            if (remaining === null || remaining < 1) {
              throw new EncounterRuleError(`${definition.name} has an invalid delayed one-shot clock.`);
            }
            const next = remaining - 1;
            context.state = {
              ...context.state,
              effects: context.state.effects.map((candidate) => candidate.id === effect.id && candidate.payload.kind === 'sustained_effect'
                ? { ...candidate, payload: { ...candidate.payload, delayedRoundsRemaining: next } }
                : candidate),
            };
            if (next === 0) {
              resolveSustainedSequence(
                context, effect, 'delayed_one_shot', sequence.boundary,
                effect.payload.boundCombatants, sequence.operation,
              );
              endEffects(context, new Set([effect.id]), 'trigger_consumed');
            }
          }
          break;
      }
    }

    if (
      effect.targets.includes(subjectId) &&
      effect.payload.kind === 'ensnaring_strike' &&
      boundary === effect.payload.timing
    ) {
      const result = resolveTargetDamage(context, effect.source, subjectId, effect.payload.damage);
      applyDamage(context, effect.source, subjectId, result.total);
      concentrationCheck(context, subjectId, result.total);
    }

    if (
      effect.targets.includes(subjectId) &&
      effect.payload.kind === 'ongoing_damage' &&
      effectBoundaryMatches(subjectId, boundary, effect.payload.timing)
    ) {
      const result = resolveTargetDamage(context, effect.source, subjectId, effect.payload.damage);
      applyDamage(context, effect.source, subjectId, result.total);
      concentrationCheck(context, subjectId, result.total);
    }

    if (
      effect.targets.includes(subjectId) &&
      effect.payload.kind === 'recurring_damage_operation' &&
      effectBoundaryMatches(subjectId, boundary, effect.payload.timing)
    ) {
      resolvePreparedDamageOperation(
        context,
        effect.source,
        subjectId,
        effect.payload.delivery,
        effect.payload.saveDc,
        effect.payload.instances,
        String(effect.stackingIdentity),
      );
    }

    const current = context.state.effects.find((candidate) => candidate.id === effectId);
    if (
      current !== undefined &&
      current.targets.includes(subjectId) &&
      current.repeatedSave !== null &&
      effectBoundaryMatches(subjectId, boundary, current.repeatedSave.timing) &&
      combatant(context.state, subjectId).life !== 'dead'
    ) {
      const save = resolveTargetSave(
        context,
        current.source,
        subjectId,
        current.repeatedSave.ability,
        current.repeatedSave.dc,
        current.repeatedSave.rollMode,
        current.id,
      );
      if (save.outcome === 'success') {
        if (current.repeatedSave.onSuccess === 'end_effect') {
          endEffects(context, new Set([current.id]), 'save_succeeded');
        } else {
          removeEffectTarget(context, current.id, subjectId, 'save_succeeded');
        }
      }
    }

    const afterSave = context.state.effects.find((candidate) => candidate.id === effectId);
    if (
      afterSave?.duration.kind === 'turn_boundaries' &&
      effectBoundaryMatches(subjectId, boundary, afterSave.duration.timing)
    ) {
      const remaining = afterSave.duration.remaining - 1;
      emit(context, { type: 'effect_clock_ticked', effectId, boundary, remaining });
      if (remaining === 0) {
        endEffects(context, new Set([effectId]), 'duration_expired');
      } else {
        context.state = {
          ...context.state,
          effects: context.state.effects.map((candidate) =>
            candidate.id === effectId && candidate.duration.kind === 'turn_boundaries'
              ? { ...candidate, duration: { ...candidate.duration, remaining } }
              : candidate,
          ),
        };
      }
    }
  }
  if (boundary === 'start') {
    for (const snapshot of orderedAreas(context.state)) {
      const area = context.state.persistentAreas.find((candidate) => candidate.id === snapshot.id);
      if (area === undefined || area.owner !== subjectId) continue;
      const remaining = area.duration.remaining - 1;
      if (remaining === 0) {
        endPersistentArea(context, area.id, 'duration_expired');
      } else {
        context.state = {
          ...context.state,
          persistentAreas: context.state.persistentAreas.map((candidate) => candidate.id === area.id
            ? { ...candidate, duration: { ...candidate.duration, remaining } }
            : candidate),
        };
      }
    }
  }
}

function validateEffectApplication(
  state: EncounterState,
  effect: EffectApplication,
): void {
  if (effect.targets.length === 0) throw new EncounterRuleError('An effect requires a target.');
  assertUnique(effect.targets, 'Effect targets');
  for (const target of effect.targets) combatant(state, target);
  if (effect.duration.kind === 'turn_boundaries') {
    combatant(state, effect.duration.timing.combatant);
    if (!Number.isSafeInteger(effect.duration.remaining) || effect.duration.remaining < 1) {
      throw new EncounterRuleError('Effect duration remaining must be a positive safe integer.');
    }
    if (effect.duration.timing.source.trim().length === 0) {
      throw new EncounterRuleError('Effect duration timing requires a source locator.');
    }
  }
  if (effect.repeatedSave !== null) {
    combatant(state, effect.repeatedSave.timing.combatant);
    if (!effect.targets.includes(effect.repeatedSave.timing.combatant)) {
      throw new EncounterRuleError('Repeated-save timing must name an effect target.');
    }
    difficultyClass(effect.repeatedSave.dc);
    if (effect.repeatedSave.timing.source.trim().length === 0) {
      throw new EncounterRuleError('Repeated-save timing requires a source locator.');
    }
  }
  if (
    effect.payload.kind === 'ongoing_damage' &&
    (!effect.targets.includes(effect.payload.timing.combatant) ||
      effect.payload.timing.source.trim().length === 0)
  ) {
    throw new EncounterRuleError(
      'Ongoing-damage timing requires a target and source locator.',
    );
  }
  if (
    effect.payload.kind === 'recurring_damage_operation' &&
    (!effect.targets.includes(effect.payload.timing.combatant) ||
      effect.payload.timing.source.trim().length === 0)
  ) {
    throw new EncounterRuleError(
      'Recurring-damage timing requires a target and source locator.',
    );
  }
}

function cloneEffectApplication(
  application: EffectApplication,
): EffectApplication {
  const duration =
    application.duration.kind === 'permanent'
      ? { kind: 'permanent' as const }
      : {
          kind: 'turn_boundaries' as const,
          timing: { ...application.duration.timing },
          remaining: application.duration.remaining,
        };
  const repeatedSave =
    application.repeatedSave === null
      ? null
      : {
          ...application.repeatedSave,
          timing: { ...application.repeatedSave.timing },
        };
  const payload = (() => {
    switch (application.payload.kind) {
      case 'condition':
      case 'exhaustion':
      case 'ability_check_modifier':
      case 'skill_modifier':
      case 'armor_class_modifier':
      case 'attack_roll_modifier':
      case 'attack_roll_mode_modifier':
      case 'faerie_fire':
      case 'consumable_healing_pool':
      case 'cannot_regain_hit_points':
      case 'creature_type_protection':
      case 'd20_test_modifier':
      case 'damage_reduction':
      case 'bonus_action_attack_grant':
      case 'extra_attack_count_override':
      case 'action_surge':
      case 'magic_missile_immunity':
      case 'movement_modifier':
      case 'opportunity_attacks_disabled':
      case 'sanctuary':
      case 'saving_throw_modifier':
      case 'shield_defense':
      case 'communication_link':
      case 'conjured_hand':
      case 'illusion':
      case 'light_source':
      case 'minor_magic':
      case 'object_repair':
      case 'alarm_ward':
      case 'appearance_illusion':
      case 'base_armor_class':
      case 'bonus_action_dash':
      case 'detection_sense':
      case 'environmental_water':
      case 'falling_protection':
      case 'floating_disk':
      case 'food_purification':
      case 'image_illusion':
      case 'illusory_script':
      case 'jump_movement':
      case 'language_comprehension':
      case 'magic_identification':
      case 'obscured_area':
      case 'sleep_sequence':
      case 'unseen_servant':
      case 'hit_point_maximum_modifier':
      case 'condition_choice':
      case 'form_alteration':
      case 'arcane_lock':
      case 'magic_aura':
      case 'augury':
      case 'attacks_against_target_roll_mode':
      case 'calm_emotions':
      case 'darkvision':
      case 'detect_thoughts':
      case 'granted_breath':
      case 'ability_check_advantage':
      case 'size_alteration':
      case 'trap_detection':
      case 'flaming_sphere':
      case 'corpse_preservation':
      case 'gust_of_wind_area':
      case 'levitation':
      case 'object_location':
      case 'magic_mouth':
      case 'object_unlock':
      case 'magic_weapon':
      case 'location_tracking':
      case 'mirror_images':
      case 'teleport':
      case 'poison_protection':
      case 'ray_enfeeblement':
      case 'rope_trick':
      case 'see_invisibility':
      case 'silence_area':
      case 'spider_climb':
      case 'spiritual_weapon':
      case 'warding_bond':
      case 'web_area':
      case 'truth_zone':
      case 'summoned_undead':
      case 'beacon_of_hope':
      case 'bestow_curse':
      case 'blink':
      case 'clairvoyance_sensor':
      case 'created_food_and_water':
      case 'daylight_area':
      case 'flight':
      case 'gaseous_form':
      case 'glyph_of_warding':
      case 'haste':
      case 'hypnotic_pattern':
      case 'fear':
      case 'magic_circle':
      case 'major_image':
      case 'meld_into_stone':
      case 'nondetection':
      case 'phantom_steed':
      case 'energy_protection':
      case 'sending':
      case 'sleet_storm_area':
      case 'slow':
      case 'speak_with_dead':
      case 'spirit_guardians_area':
      case 'stinking_cloud_area':
      case 'tiny_hut':
      case 'universal_language':
      case 'vampiric_touch':
      case 'water_breathing':
      case 'water_walk':
      case 'arcane_eye':
      case 'aura_of_life':
      case 'banishment':
      case 'black_tentacles_area':
      case 'charm_monster':
      case 'confusion_area':
      case 'conjure_minor_elementals':
      case 'control_water':
      case 'death_ward':
      case 'dimension_door':
      case 'divination':
      case 'fabricate':
      case 'faithful_hound':
      case 'fire_shield':
      case 'freedom_of_movement':
      case 'guardian_of_faith':
      case 'hallucinatory_terrain':
      case 'ice_storm_terrain':
      case 'locate_creature':
      case 'phantasmal_killer':
      case 'polymorph':
      case 'private_sanctum':
      case 'resilient_sphere':
      case 'secret_chest':
      case 'stone_shape':
      case 'damage_resistances':
      case 'wall_of_fire':
        return { ...application.payload };
      case 'sustained_effect':
        return {
          ...application.payload,
          boundCombatants: [...application.payload.boundCombatants],
          boundObjects: [...application.payload.boundObjects],
          ownedObjects: [...application.payload.ownedObjects],
          ownedAreas: [...application.payload.ownedAreas],
          consumedEventTurnKeys: [...application.payload.consumedEventTurnKeys],
          area: application.payload.area === null ? null : structuredClone(application.payload.area),
        };
      case 'commanded_action':
        return { ...application.payload, options: [...application.payload.options] };
      case 'condition_bundle':
        return { ...application.payload, conditions: [...application.payload.conditions] };
      case 'summoned_familiar':
        return { ...application.payload, forms: [...application.payload.forms] };
      case 'damage_rider':
        return {
          ...application.payload,
          damage: {
            ...application.payload.damage,
            terms: application.payload.damage.terms.map((term) => ({
              ...term,
              dice: { ...term.dice },
            })),
            responses: application.payload.damage.responses.map((response) => ({ ...response })),
          },
          ...(application.payload.followUp === undefined
            ? {}
            : {
                followUp: application.payload.followUp.kind === 'save_then_condition'
                  ? { ...application.payload.followUp }
                  : {
                      ...application.payload.followUp,
                      damage: {
                        ...application.payload.followUp.damage,
                        terms: application.payload.followUp.damage.terms.map((term) => ({
                          ...term,
                          dice: { ...term.dice },
                        })),
                        responses: application.payload.followUp.damage.responses.map((response) => ({ ...response })),
                      },
                    },
              }),
        };
      case 'recurring_damage_operation':
        return {
          ...application.payload,
          timing: { ...application.payload.timing },
          delivery: { ...application.payload.delivery },
          instances: application.payload.instances.map((instance) => ({
            thresholdRider: instance.thresholdRider === null ? null : { ...instance.thresholdRider },
            damage: {
              ...instance.damage,
              terms: instance.damage.terms.map((term) => ({ ...term, dice: { ...term.dice } })),
              responses: instance.damage.responses.map((response) => ({ ...response })),
            },
          })),
        };
      case 'ensnaring_strike':
        return {
          ...application.payload,
          damage: {
            ...application.payload.damage,
            terms: application.payload.damage.terms.map((term) => ({ ...term, dice: { ...term.dice } })),
            responses: application.payload.damage.responses.map((response) => ({ ...response })),
          },
        };
      case 'ongoing_damage':
        return {
          ...application.payload,
          timing: { ...application.payload.timing },
          damage: {
            ...application.payload.damage,
            terms: application.payload.damage.terms.map((term) => ({
              ...term,
              dice: { ...term.dice },
            })),
            responses: application.payload.damage.responses.map((response) => ({
              ...response,
            })),
          },
        };
      case 'temporary_banishment':
        return {
          ...application.payload,
          returnDamage: {
            ...application.payload.returnDamage,
            terms: application.payload.returnDamage.terms.map((term) => ({
              ...term,
              dice: { ...term.dice },
            })),
            responses: application.payload.returnDamage.responses.map((response) => ({ ...response })),
          },
        };
    }
  })();
  return {
    ...application,
    targets: [...application.targets],
    duration,
    repeatedSave,
    damageBreak: application.damageBreak === undefined || application.damageBreak === null
      ? application.damageBreak ?? null
      : { ...application.damageBreak },
    payload,
  };
}

function applyEffect(
  context: ReductionContext,
  source: CombatantId,
  application: EffectApplication,
): void {
  validateEffectApplication(context.state, application);
  const owned = cloneEffectApplication(application);
  if (owned.concentration) {
    endConcentration(context, source, 'concentration_replaced');
  }
  const stackingMatches = context.state.effects.filter(
    (effect) =>
      effect.stackingIdentity === owned.stackingIdentity &&
      owned.stacking !== 'coexist' &&
      (owned.stacking === 'replace_any_source' || effect.source === source),
  );
  endEffects(
    context,
    new Set(stackingMatches.map((effect) => effect.id)),
    'stacking_replaced',
  );

  const id = encounterEffectId(`effect:${context.state.nextEffectSequence}`);
  let targets = [...owned.targets];
  const effect: EncounterEffect = {
    id,
    source,
    targets,
    createdRevision: context.state.revision,
    duration: owned.duration,
    concentrationOwner: owned.concentration ? source : null,
    stackingIdentity: owned.stackingIdentity,
    stacking: owned.stacking,
    repeatedSave: owned.repeatedSave,
    damageBreak: owned.damageBreak ?? null,
    payload: owned.payload,
    ...(owned.areaSource === undefined ? {} : { areaSource: owned.areaSource }),
    ...(owned.areaMembershipBound === undefined ? {} : { areaMembershipBound: true }),
  };
  context.state = {
    ...context.state,
    nextEffectSequence: context.state.nextEffectSequence + 1,
    effects: [...context.state.effects, effect],
  };

  if (owned.payload.kind === 'condition') {
    for (const target of [...targets]) {
      if (combatant(context.state, target).profile.rules.conditionImmunities.includes(owned.payload.condition)) {
        removeEffectTarget(context, id, target, 'condition_immunity');
        targets = targets.filter((candidate) => candidate !== target);
      }
    }
  }
  if (owned.payload.kind === 'ensnaring_strike') {
    for (const target of [...targets]) {
      if (combatant(context.state, target).profile.rules.conditionImmunities.includes('Restrained')) {
        removeEffectTarget(context, id, target, 'condition_immunity');
        targets = targets.filter((candidate) => candidate !== target);
      }
    }
  }
  if (context.state.effects.some((candidate) => candidate.id === id)) {
    emit(context, { type: 'effect_applied', effectId: id, source, targets });
  }
  if (owned.payload.kind === 'temporary_banishment') {
    if (targets.length !== 1) {
      throw new EncounterRuleError('Temporary banishment requires exactly one target.');
    }
    const target = targets[0];
    if (target === undefined) throw new EncounterRuleError('Temporary banishment requires a target.');
    const removed = context.state.tokens.find((candidate) => candidate.combatantId === target);
    if (removed === undefined) throw new EncounterRuleError(`Combatant ${target} is already absent from the board.`);
    context.state = {
      ...context.state,
      tokens: context.state.tokens.filter((candidate) => candidate.combatantId !== target),
      absentTokens: [...(context.state.absentTokens ?? []), removed],
    };
    emit(context, { type: 'combatant_left_board', combatant: target, effectId: id });
  }
  for (const target of targets) {
    const targetConditions = combatantConditions(context.state, target);
    if (
      conditionMechanicalState(targetConditions).clauses.some(
        (clause) => clause.kind === 'exhaustion' && clause.dies,
      )
    ) {
      const subject = combatant(context.state, target);
      context.state = replaceCombatant(context.state, {
        ...subject,
        hitPoints: 0,
        life: 'dead',
        deathSaves: null,
        turn: EMPTY_TURN,
      });
      endConcentration(context, target, 'concentration_broken');
      continue;
    }
    if (isIncapacitated(targetConditions)) {
      const subject = combatant(context.state, target);
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          action: { kind: 'spent' },
          bonusActionAvailable: false,
          reactionAvailable: false,
        },
      });
      endConcentration(context, target, 'concentration_broken');
    }
  }
}

function startTurn(context: ReductionContext, id: CombatantId, round: number): void {
  context.state = { ...context.state, activeCombatant: id, round };
  processBoundary(context, id, 'start');
  const beforeSave = combatant(context.state, id);
  const speed = feet(effectiveSpeed(context.state, id));
  const incapacitated =
    beforeSave.life !== 'living' ||
    !isCombatantOnBoard(context.state, id) ||
    isIncapacitated(combatantConditions(context.state, id));
  context.state = replaceCombatant(context.state, {
    ...beforeSave,
    turn: {
      action: incapacitated ? { kind: 'spent' } : { kind: 'available' },
      bonusActionAvailable: !incapacitated,
      reactionAvailable: !incapacitated,
      movement: startTurnMovement(speed),
      disengaging: false,
      dodging: false,
      ...(context.state.equipment === undefined ? {} : { objectInteractionsUsed: incapacitated ? 1 as const : 0 as const }),
    },
  });
  emit(context, { type: 'turn_started', combatant: id, round });
  resolveDeathSave(context, id);
  const afterSave = combatant(context.state, id);
  if (afterSave.life === 'living' && beforeSave.life === 'dying') {
    context.state = replaceCombatant(context.state, {
      ...afterSave,
      turn: {
        action: { kind: 'available' },
        bonusActionAvailable: true,
        reactionAvailable: true,
        movement: startTurnMovement(feet(effectiveSpeed(context.state, id))),
        disengaging: false,
        dodging: false,
        ...(context.state.equipment === undefined ? {} : { objectInteractionsUsed: 0 as const }),
      },
    });
  }
}

function hasAdjacentAlly(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): boolean {
  const acting = combatant(state, actor);
  return state.combatants.some((candidate) =>
    candidate.profile.id !== actor &&
    candidate.profile.kind === acting.profile.kind &&
    candidate.life === 'living' &&
    gridDistance(token(state, candidate.profile.id).position, token(state, target).position) <= 5);
}

function selectedSlotLevel(
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
  effectId: EncounterEffectId,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null {
  const selections = command.riderSelections ?? [];
  if (new Set(selections.map((selection) => selection.effectId)).size !== selections.length) {
    throw new EncounterRuleError('Attack rider selections must name unique effects.');
  }
  return selections.find((selection) => selection.effectId === effectId)?.slotLevel ?? null;
}

function spendRiderSpellSlot(
  context: ReductionContext,
  actor: CombatantId,
  slotLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  effectId: EncounterEffectId,
): void {
  const subject = combatant(context.state, actor);
  const slot = subject.spellSlots.find((candidate) => candidate.level === slotLevel);
  if (slot === undefined || slot.remaining < 1) {
    throw new EncounterRuleError(`Combatant ${actor} has no level-${String(slotLevel)} spell slot remaining.`);
  }
  const remaining = slot.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    spellSlots: subject.spellSlots.map((candidate) =>
      candidate.level === slotLevel ? { ...candidate, remaining } : candidate),
  });
  emit(context, { type: 'spell_slot_spent', combatant: actor, slotLevel, remaining });
  const refreshed = combatant(context.state, actor);
  context.state = replaceCombatant(context.state, {
    ...refreshed,
    turn: {
      ...refreshed.turn,
      usedDamageRiderEffectIds: [...(refreshed.turn.usedDamageRiderEffectIds ?? []), effectId],
    },
  });
}

function applyWeaponHitRiderFollowUp(
  context: ReductionContext,
  rider: EncounterEffect,
  target: CombatantId,
): void {
  if (rider.payload.kind !== 'damage_rider' || rider.payload.followUp === undefined) return;
  if (combatant(context.state, target).life === 'dead') return;
  const followUp = rider.payload.followUp;
  const followUpIdentity = effectStackingIdentity(
    `${String(rider.stackingIdentity)}:follow-up:${String(target)}`,
  );
  switch (followUp.kind) {
    case 'ongoing_damage_save_ends':
      applyEffect(context, rider.source, {
        targets: [target],
        duration: {
          kind: 'turn_boundaries',
          timing: { combatant: target, boundary: followUp.timing, source: String(followUpIdentity) },
          remaining: followUp.durationRounds,
        },
        concentration: rider.concentrationOwner !== null,
        stackingIdentity: followUpIdentity,
        stacking: 'replace_same_source',
        repeatedSave: {
          timing: { combatant: target, boundary: followUp.timing, source: String(followUpIdentity) },
          ability: followUp.saveAbility,
          dc: followUp.saveDc,
          rollMode: 'normal',
          onSuccess: 'remove_target',
        },
        payload: {
          kind: 'ongoing_damage',
          damage: followUp.damage,
          timing: { combatant: target, boundary: followUp.timing, source: String(followUpIdentity) },
        },
      });
      return;
    case 'save_then_restrain': {
      const save = resolveTargetSave(
        context,
        rider.source,
        target,
        followUp.saveAbility,
        followUp.saveDc,
        followUp.rollMode,
        rider.id,
      );
      if (save.outcome === 'success') return;
      applyEffect(context, rider.source, {
        targets: [target],
        duration: {
          kind: 'turn_boundaries',
          timing: { combatant: target, boundary: followUp.timing, source: String(followUpIdentity) },
          remaining: followUp.durationRounds,
        },
        concentration: rider.concentrationOwner !== null,
        stackingIdentity: followUpIdentity,
        stacking: 'replace_same_source',
        repeatedSave: null,
        payload: {
          kind: 'ensnaring_strike',
          condition: 'Restrained',
          damage: followUp.damage,
          timing: followUp.timing,
          escapeCheckAbility: 'strength',
          escapeCheckSkill: 'Athletics',
        },
      });
      return;
    }
    case 'save_then_condition': {
      const save = resolveTargetSave(
        context,
        rider.source,
        target,
        followUp.saveAbility,
        followUp.saveDc,
        followUp.rollMode,
        rider.id,
      );
      if (save.outcome === 'success') return;
      applyEffect(context, rider.source, {
        targets: [target],
        duration: {
          kind: 'turn_boundaries',
          timing: {
            combatant: target,
            boundary: followUp.expiresAt === 'target_start' ? 'start' : 'end',
            source: String(followUpIdentity),
          },
          remaining: followUp.durationRounds,
        },
        concentration: rider.concentrationOwner !== null,
        stackingIdentity: followUpIdentity,
        stacking: 'replace_same_source',
        repeatedSave: null,
        payload: { kind: 'condition', condition: followUp.condition },
      });
      return;
    }
  }
}

function attackDamageTypeSelection(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): Extract<CombatFeatureEffect['payload'], { readonly kind: 'attack_damage_type_choice' }> | null {
  if (command.damageTypeSelection === undefined) {
    const requiresSelection = command.attackId !== undefined &&
      (combatant(state, command.actor).profile.rules.featureEffects ?? []).some((effect) =>
        effect.payload.kind === 'attack_damage_type_choice' &&
        effect.payload.attackId === command.attackId);
    if (requiresSelection) {
      throw new EncounterRuleError('This attack requires a declared damage-type selection.');
    }
    return null;
  }
  const effect = featureEffect(state, command.actor, command.damageTypeSelection.effectId);
  if (
    effect.payload.kind !== 'attack_damage_type_choice' ||
    command.attackId !== effect.payload.attackId ||
    !effect.payload.options.includes(command.damageTypeSelection.damageType)
  ) {
    throw new EncounterRuleError('Attack damage-type selection is not declared for this attack.');
  }
  return effect.payload;
}

function selectedManeuver(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): CombatFeatureEffect | null {
  if (command.maneuverEffectId === undefined) return null;
  const effect = featureEffect(state, command.actor, command.maneuverEffectId);
  if (effect.payload.kind !== 'resource_die_maneuver' || effect.resourcePoolId === null) {
    throw new EncounterRuleError(`Effect ${effect.id} is not a resource-die maneuver.`);
  }
  return effect;
}

function markDamageFeatureUsed(
  context: ReductionContext,
  actor: CombatantId,
  effectId: EncounterEffectId,
): void {
  const current = combatant(context.state, actor);
  context.state = replaceCombatant(context.state, {
    ...current,
    turn: {
      ...current.turn,
      usedDamageRiderEffectIds: [...(current.turn.usedDamageRiderEffectIds ?? []), effectId],
    },
  });
}

function applyManeuverCondition(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  effect: CombatFeatureEffect,
): void {
  if (effect.payload.kind !== 'resource_die_maneuver') return;
  if (combatant(context.state, target).life === 'dead') return;
  applyEffect(context, source, {
    targets: [target],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: target,
        boundary: 'end',
        source: 'party-pack:resource-die-maneuver',
      },
      remaining: 1,
    },
    concentration: false,
    stackingIdentity: effectStackingIdentity(`feature:${effect.id}:condition`),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: { kind: 'condition', condition: effect.payload.condition },
  });
}

function applySaveGatedBanishments(
  context: ReductionContext,
  actor: CombatantId,
  target: CombatantId,
): void {
  if (combatant(context.state, target).life === 'dead') return;
  const effects = combatant(context.state, actor).profile.rules.featureEffects ?? [];
  for (const effect of effects) {
    if (effect.trigger !== 'on_hit' || effect.payload.kind !== 'save_gated_banishment_on_hit') continue;
    const save = resolveTargetSave(
      context,
      actor,
      target,
      effect.payload.saveAbility,
      effect.payload.saveDc,
      effect.payload.rollMode,
      null,
    );
    if (save.outcome === 'success') continue;
    applyEffect(context, actor, {
      targets: [target],
      duration: {
        kind: 'turn_boundaries',
        timing: {
          combatant: actor,
          boundary: 'start',
          source: 'party-pack:save-gated-banishment-on-hit',
        },
        remaining: 1,
      },
      concentration: false,
      stackingIdentity: effectStackingIdentity(`feature:${effect.id}:banishment`),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: {
        kind: 'temporary_banishment',
        returnDamage: effect.payload.returnDamage,
        returnPlacement: effect.payload.returnPlacement,
      },
    });
    return;
  }
}

function processAttack(
  context: ReductionContext,
  command: Extract<
    EncounterCommand,
    { readonly type: 'attack' | 'opportunity_attack' }
  >,
): void {
  if (!isCombatantOnBoard(context.state, command.actor)) {
    throw new EncounterRuleError(`Combatant ${command.actor} is absent from the board.`);
  }
  if (!isCombatantOnBoard(context.state, command.target)) {
    throw new EncounterRuleError(`Combatant ${command.target} is absent from the board.`);
  }
  let wasFirstAttack = false;
  const typeChoice = command.type === 'attack'
    ? attackDamageTypeSelection(context.state, command)
    : null;
  const maneuver = command.type === 'attack'
    ? selectedManeuver(context.state, command)
    : null;
  if (command.type === 'attack') {
    assertActiveActor(context, command.actor);
    wasFirstAttack = combatant(context.state, command.actor).turn.action.kind === 'available';
    beginAttack(context, command);
    activateRecklessAttack(context, command, wasFirstAttack);
  } else {
    const reactor = combatant(context.state, command.actor);
    if (
      reactor.life !== 'living' ||
      isIncapacitated(combatantConditions(context.state, command.actor))
    ) {
      throw new EncounterRuleError(`Combatant ${command.actor} cannot react.`);
    }
    if (!reactor.turn.reactionAvailable) {
      throw new EncounterRuleError(`Combatant ${command.actor} has no Reaction available.`);
    }
    if (context.state.effects.some((effect) =>
      effect.targets.includes(command.actor) && effect.payload.kind === 'opportunity_attacks_disabled')) {
      throw new EncounterRuleError(`Combatant ${command.actor} cannot make Opportunity Attacks.`);
    }
    if (context.state.activeCombatant !== command.target) {
      throw new EncounterRuleError('An Opportunity Attack must target the active mover.');
    }
    if (
      gridDistance(
        token(context.state, command.actor).position,
        token(context.state, command.target).position,
      ) > reactor.profile.rules.reach
    ) {
      throw new EncounterRuleError('An Opportunity Attack reactor is out of reach.');
    }
    context.state = replaceCombatant(context.state, {
      ...reactor,
      turn: { ...reactor.turn, reactionAvailable: false },
    });
    emit(context, {
      type: 'resource_spent',
      combatant: command.actor,
      resource: 'reaction',
      purpose: 'Opportunity Attack',
    });
  }
  if (combatant(context.state, command.target).life === 'dead') {
    throw new EncounterRuleError('A dead combatant cannot be attacked.');
  }
  if (cannotHarmTarget(context.state, command.actor, command.target)) {
    throw new EncounterRuleError('The Charmed condition prohibits harming this target.');
  }
  const actorPosition = token(context.state, command.actor).position;
  const targetPosition = token(context.state, command.target).position;
  if (
    !hasLineOfSight(context.state, actorPosition, targetPosition) ||
    coverTierBetween(context.state, actorPosition, targetPosition) === 'total'
  ) {
    throw new EncounterRuleError('The target has Total Cover or is outside line of sight.');
  }
  const attack = resolveAttackRoll(
    {
      attackBonus:
        command.attackBonus +
        exhaustionPenalty(combatantConditions(context.state, command.actor)) +
        effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
      targetArmorClass: coverAdjustedArmorClass(context.state, command.actor, command.target),
      rollMode: attackRollMode(context.state, command),
      criticalFloor: command.criticalFloor,
    },
    context.rng,
  );
  const consumedAdvantage = new Set(
    context.state.effects
      .filter((effect) =>
        effect.payload.kind === 'attack_roll_mode_modifier' &&
        ((effect.targets.includes(command.target) &&
          effect.payload.appliesTo.kind === 'next_attack_against_target') ||
          (effect.targets.includes(command.actor) &&
            effect.payload.appliesTo.kind === 'next_attack_by_target')))
      .map((effect) => effect.id),
  );
  endEffects(context, consumedAdvantage, 'duration_expired');
  let damageResult: ReturnType<typeof resolveDamage> | null = null;
  if (attack.outcome !== 'miss') {
    const criticalWithin = conditionMechanicalState(
      combatantConditions(context.state, command.target),
    ).clauses.some(
      (clause) =>
        clause.kind === 'critical_if_hit_within' &&
        gridDistance(
          token(context.state, command.actor).position,
          token(context.state, command.target).position,
        ) <= clause.feet,
    );
    const attacking = combatant(context.state, command.actor);
    const baseTerms = command.damage.terms.map((term, index) =>
      typeChoice !== null && index === typeChoice.damageTermIndex && command.type === 'attack'
        ? { ...term, type: command.damageTypeSelection?.damageType ?? term.type }
        : term);
    const candidateRiders = [
      ...(attacking.profile.rules.featureEffects ?? []).flatMap((effect) =>
        effect.payload.kind === 'damage_rider'
          ? [{
              id: effect.id,
              trigger: effect.trigger,
              resourcePoolId: effect.resourcePoolId,
              payload: effect.payload,
              encounterEffect: null,
            }]
          : []),
      ...context.state.effects.flatMap((effect) =>
        effect.targets.includes(command.actor) && effect.payload.kind === 'damage_rider'
          ? [{
              id: effect.id,
              trigger: 'on_hit' as const,
              resourcePoolId: null,
              payload: effect.payload,
              encounterEffect: effect,
            }]
          : []),
    ];
    const triggeredRiders = candidateRiders.filter((effect) => {
      if (
        effect.payload.kind !== 'damage_rider' ||
        effect.payload.appliesTo !== 'weapon_attack_by_target' ||
        (effect.trigger !== 'on_hit' && !(effect.trigger === 'on_crit' && attack.outcome === 'critical'))
      ) return false;
      const gating = effect.payload.gating ?? { kind: 'unconditional' as const };
      switch (gating.kind) {
        case 'unconditional':
          return true;
        case 'once_per_turn':
          return !(attacking.turn.usedDamageRiderEffectIds ?? []).includes(effect.id) &&
            gating.qualifyingGates.some((gate) => {
              switch (gate) {
                case 'advantage_on_attack': return attack.roll.mode === 'advantage';
                case 'ally_adjacent_to_target':
                  return hasAdjacentAlly(context.state, command.actor, command.target);
              }
            });
        case 'first_hit_this_turn':
          return !(attacking.turn.usedDamageRiderEffectIds ?? []).includes(effect.id);
        case 'slot_spend':
          return command.type === 'attack' && selectedSlotLevel(command, effect.id) !== null;
      }
    });
    for (const rider of triggeredRiders) {
      const gating = rider.payload.gating ?? { kind: 'unconditional' as const };
      if (gating.kind === 'slot_spend') {
        if (command.type !== 'attack') {
          throw new EncounterRuleError('An Opportunity Attack cannot select a slot-spend rider.');
        }
        const slotLevel = selectedSlotLevel(command, rider.id);
        if (slotLevel === null) throw new EncounterRuleError(`Effect ${rider.id} requires a selected spell slot.`);
        spendRiderSpellSlot(context, command.actor, slotLevel, rider.id);
      } else if (gating.kind === 'once_per_turn' || gating.kind === 'first_hit_this_turn') {
        const current = combatant(context.state, command.actor);
        context.state = replaceCombatant(context.state, {
          ...current,
          turn: {
            ...current.turn,
            usedDamageRiderEffectIds: [...(current.turn.usedDamageRiderEffectIds ?? []), rider.id],
          },
        });
      }
      if (rider.resourcePoolId !== null) {
        spendLimitedResource(context, command.actor, rider.resourcePoolId, `Effect ${rider.id}`);
      }
    }
    if (maneuver !== null && maneuver.resourcePoolId !== null) {
      spendLimitedResource(context, command.actor, maneuver.resourcePoolId, `Effect ${maneuver.id}`);
    }
    const elementalFury = (attacking.profile.rules.featureEffects ?? []).find((effect) =>
      effect.trigger === 'always_on' &&
      effect.payload.kind === 'elemental_fury' &&
      command.type === 'attack' &&
      command.attackId !== undefined &&
      effect.payload.attackIds.includes(command.attackId) &&
      !(attacking.turn.usedDamageRiderEffectIds ?? []).includes(effect.id));
    if (elementalFury !== undefined) markDamageFeatureUsed(context, command.actor, elementalFury.id);
    const riderTerms = triggeredRiders.flatMap((effect) => {
      const payload = effect.payload;
      return payload.gating?.kind === 'slot_spend' && command.type === 'attack'
          ? payload.damage.terms.map((term) => ({
              ...term,
              dice: {
                ...term.dice,
                count: payload.gating?.kind === 'slot_spend'
                  ? payload.gating.baseCount +
                    payload.gating.countPerSlotLevel *
                    (selectedSlotLevel(command, effect.id) ?? 0)
                  : term.dice.count,
              },
            }))
          : payload.damage.terms;
    });
    const primaryDamageType = baseTerms[0]?.type;
    if (maneuver !== null && primaryDamageType === undefined) {
      throw new EncounterRuleError('A resource-die maneuver requires primary attack damage.');
    }
    const maneuverTerms = maneuver?.payload.kind === 'resource_die_maneuver' && primaryDamageType !== undefined
      ? [{
          type: primaryDamageType,
          dice: { count: 1, sides: maneuver.payload.dieSides, modifier: 0 },
        }]
      : [];
    const elementalTerms = elementalFury?.payload.kind === 'elemental_fury'
      ? [{
          type: elementalFury.payload.selectedDamageType,
          dice: { count: 0, sides: dieSides(6), modifier: elementalFury.payload.amount },
        }]
      : [];
    const terms = [...baseTerms, ...riderTerms, ...maneuverTerms, ...elementalTerms];
    const request = {
      ...command.damage,
      terms,
      critical: attack.outcome === 'critical' || criticalWithin,
      responses: [],
    };
    damageResult = resolveTargetDamage(context, command.actor, command.target, request);
    applyDamage(
      context,
      command.actor,
      command.target,
      damageResult.total,
      request.critical,
    );
    concentrationCheck(context, command.target, damageResult.total);
    if (maneuver !== null) applyManeuverCondition(context, command.actor, command.target, maneuver);
    for (const rider of triggeredRiders) {
      if (rider.encounterEffect === null) continue;
      if (rider.payload.consumeOnHit === true) {
        endEffects(context, new Set([rider.encounterEffect.id]), 'trigger_consumed');
      }
      applyWeaponHitRiderFollowUp(context, rider.encounterEffect, command.target);
    }
    applySaveGatedBanishments(context, command.actor, command.target);
  }
  emit(context, {
    type: 'attack_resolved',
    actor: command.actor,
    target: command.target,
    attack,
    damage: damageResult,
  });
}

function cantripUpgradeCount(casterLevel: number): number {
  if (!Number.isSafeInteger(casterLevel) || casterLevel < 1 || casterLevel > 20) {
    throw new EncounterRuleError('Caster level must be an integer from 1 through 20.');
  }
  if (casterLevel >= 17) return 3;
  if (casterLevel >= 11) return 2;
  if (casterLevel >= 5) return 1;
  return 0;
}

function attackBeamCount(
  casterLevel: number,
  operation: Extract<SpellDefinition['operation'], { readonly kind: 'attack_beams' }>,
): number {
  cantripUpgradeCount(casterLevel);
  return operation.baseBeams + operation.additionalBeamLevels.filter(
    (minimumLevel) => casterLevel >= minimumLevel,
  ).length;
}

function scaledDiceExpression(
  definition: SpellDefinition,
  scaling: ScaledDice,
  command: SpellCastCommand,
): DiceExpression {
  const slotDelta = definition.level === 0
    ? 0
    : (command.slotLevel as number) - definition.level;
  const cantripDelta = scaling.cantripUpgrade
    ? cantripUpgradeCount(command.casterLevel)
    : 0;
  return {
    count: scaling.baseCount + scaling.perSlotCount * slotDelta + cantripDelta,
    sides: dieSides(scaling.sides),
    modifier: scaling.modifier + scaling.perSlotModifier * slotDelta,
    ...(scaling.minimumTotal === undefined ? {} : { minimumTotal: scaling.minimumTotal }),
    ...(scaling.maximumTotal === undefined ? {} : { maximumTotal: scaling.maximumTotal }),
    ...(scaling.rerollBelow === undefined ? {} : { rerollBelow: scaling.rerollBelow }),
  };
}

function scaledSpellDamageExpression(
  context: ReductionContext,
  definition: SpellDefinition,
  scaling: ScaledDice,
  command: SpellCastCommand,
): DiceExpression {
  let expression: DiceExpression = scaledDiceExpression(definition, scaling, command);
  const effects = combatant(context.state, command.actor).profile.rules.featureEffects ?? [];
  const exploding = effects.find((effect) =>
    effect.trigger === 'always_on' &&
    effect.payload.kind === 'exploding_spell_damage_die' &&
    effect.payload.spellId === definition.id);
  if (exploding?.payload.kind === 'exploding_spell_damage_die') {
    expression = {
      ...expression,
      explosion: {
        triggerFace: exploding.payload.triggerFace,
        maximumExplosionsPerDie: exploding.payload.maximumExplosionsPerDie,
      },
    };
  }
  const actor = combatant(context.state, command.actor);
  const modifier = effects.find((effect) =>
    effect.trigger === 'always_on' &&
    effect.payload.kind === 'spell_damage_ability_modifier' &&
    effect.payload.spellId === definition.id &&
    !(actor.turn.usedSpellDamageModifierEffectIds ?? []).includes(effect.id));
  if (modifier !== undefined) {
    expression = { ...expression, modifier: expression.modifier + command.spellcastingModifier };
    const current = combatant(context.state, command.actor);
    context.state = replaceCombatant(context.state, {
      ...current,
      turn: {
        ...current.turn,
        usedSpellDamageModifierEffectIds: [
          ...(current.turn.usedSpellDamageModifierEffectIds ?? []),
          modifier.id,
        ],
      },
    });
  }
  return expression;
}

function spendSpellCastingCost(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
): void {
  const actor = command.actor;
  if (command.castAsRitual) {
    if (definition.ritual !== true) throw new EncounterRuleError(`${definition.name} cannot be cast as a ritual.`);
    if (context.state.activeCombatant !== null) throw new EncounterRuleError('A ritual cannot resolve as a turn action.');
    return;
  }
  switch (definition.castingTime) {
    case 'action':
      assertActiveActor(context, actor);
      if (combatant(context.state, actor).turn.action.kind === 'available') {
        spendAction(context, actor, `Cast ${definition.name}`);
        return;
      }
      if (
        definition.level > 0 &&
        combatant(context.state, actor).turn.additionalLeveledSpellActionsRemaining === 1
      ) {
        const subject = combatant(context.state, actor);
        context.state = replaceCombatant(context.state, {
          ...subject,
          turn: { ...subject.turn, additionalLeveledSpellActionsRemaining: 0 },
        });
        emit(context, {
          type: 'resource_spent',
          combatant: actor,
          resource: 'additional_leveled_spell_action',
          purpose: `Cast ${definition.name}`,
        });
        return;
      }
      throw new EncounterRuleError(`Combatant ${actor} has no spell action available.`);
    case 'bonus_action':
      assertActiveActor(context, actor);
      spendCost(context, actor, 'bonus_action', `Cast ${definition.name}`);
      return;
    case 'reaction': {
      const subject = combatant(context.state, actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, actor))) {
        throw new EncounterRuleError(`Combatant ${actor} cannot cast a Reaction spell.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${actor} has no Reaction available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, reactionAvailable: false },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'reaction', purpose: `Cast ${definition.name}` });
      return;
    }
    case 'minute':
    case 'ten_minutes':
    case 'hour':
      if (context.state.activeCombatant !== null) {
        throw new EncounterRuleError(`${definition.name} has a long casting time and cannot resolve as a turn action.`);
      }
      return;
  }
}

function spendSpellSlot(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
): void {
  if (command.castAsRitual) {
    if (command.resourcePoolId !== undefined) {
      throw new EncounterRuleError('A ritual cast cannot spend a limited resource pool.');
    }
    if (command.slotLevel !== null) throw new EncounterRuleError('A ritual cast does not expend a spell slot.');
    return;
  }
  if (definition.level === 0) {
    if (command.slotLevel !== null) throw new EncounterRuleError('Cantrips do not expend spell slots.');
    if (command.resourcePoolId !== undefined) {
      spendLimitedResource(context, command.actor, command.resourcePoolId, `Cast ${definition.name}`);
    }
    return;
  }
  if (
    command.slotLevel === null ||
    !Number.isSafeInteger(command.slotLevel) ||
    command.slotLevel < definition.level ||
    command.slotLevel > 9
  ) {
    throw new EncounterRuleError(`${definition.name} requires a slot of level ${definition.level} or higher.`);
  }
  if (command.resourcePoolId !== undefined) {
    spendLimitedResource(context, command.actor, command.resourcePoolId, `Cast ${definition.name}`);
    return;
  }
  const subject = combatant(context.state, command.actor);
  const slot = subject.spellSlots.find((candidate) => candidate.level === command.slotLevel);
  if (slot === undefined || slot.remaining < 1) {
    throw new EncounterRuleError(`Combatant ${command.actor} has no level-${command.slotLevel} spell slot remaining.`);
  }
  const remaining = slot.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    spellSlots: subject.spellSlots.map((candidate) =>
      candidate.level === command.slotLevel ? { ...candidate, remaining } : candidate,
    ),
  });
  emit(context, {
    type: 'spell_slot_spent',
    combatant: command.actor,
    slotLevel: command.slotLevel,
    remaining,
  });
}

function placedAreaTargets(
  state: EncounterState,
  spellName: string,
  rangeFeet: number,
  shape: AreaTemplate['shape'],
  expectedSizeFeet: number,
  command: SpellCastCommand,
  expectedSecondarySizeFeet: number | null = null,
): readonly CombatantId[] {
  if (command.area === null) {
    throw new EncounterRuleError(`${spellName} requires an area placement.`);
  }
  if (command.area.shape !== shape) {
    throw new EncounterRuleError(`${spellName} requires a ${shape} template.`);
  }
  const submittedSize = command.area.shape === 'sphere'
    ? command.area.template.radius
    : command.area.shape === 'cone'
      ? command.area.template.length
      : command.area.shape === 'cube'
        ? command.area.template.size
        : command.area.shape === 'line'
          ? command.area.template.length
          : command.area.shape === 'cylinder'
            ? command.area.template.radius
            : command.area.template.radius;
  if (submittedSize !== expectedSizeFeet) {
    throw new EncounterRuleError(`${spellName} requires a ${expectedSizeFeet}-foot ${shape} template.`);
  }
  if (expectedSecondarySizeFeet !== null) {
    const submittedSecondary = command.area.shape === 'line'
      ? command.area.template.width
      : command.area.shape === 'cylinder'
        ? command.area.template.height
        : null;
    if (submittedSecondary !== expectedSecondarySizeFeet) {
      throw new EncounterRuleError(`${spellName} requires a ${expectedSecondarySizeFeet}-foot secondary ${shape} dimension.`);
    }
  }
  const actorCell = token(state, command.actor).position;
  const origin = command.area.template.origin;
  const minimumX = actorCell.column * 5;
  const maximumX = minimumX + 5;
  const minimumY = actorCell.row * 5;
  const maximumY = minimumY + 5;
  const horizontal = Math.max(minimumX - origin.x, 0, origin.x - maximumX);
  const vertical = Math.max(minimumY - origin.y, 0, origin.y - maximumY);
  if (Math.max(horizontal, vertical) > rangeFeet) {
    throw new EncounterRuleError(`${spellName} area origin is out of range.`);
  }
  const cells = affectedCells(
    { bounds: state.bounds, blockedCells: templateBlockedCells(state) },
    command.area,
  );
  return state.combatants.flatMap((subject): readonly CombatantId[] => {
    if (subject.life === 'dead') return [];
    const occupied = [token(state, subject.profile.id).position];
    return creatureOccupiesAffectedCell(occupied, cells) ? [subject.profile.id] : [];
  });
}

function areaTargets(
  state: EncounterState,
  definition: SpellDefinition,
  command: SpellCastCommand,
): readonly CombatantId[] {
  if (definition.targeting.kind !== 'area' && definition.targeting.kind !== 'area_selected') {
    throw new EncounterRuleError(`${definition.name} does not use area targeting.`);
  }
  return placedAreaTargets(
    state,
    definition.name,
    definition.targeting.rangeFeet,
    definition.targeting.shape,
    definition.targeting.baseSizeFeet + definition.targeting.sizePerSlotFeet *
      ((command.slotLevel ?? definition.level) - definition.level),
    command,
    definition.targeting.secondarySizeFeet ?? null,
  );
}

function validateTargetRange(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  rangeFeet: number,
  allowDead = false,
): void {
  if (!isCombatantOnBoard(state, actor) || !isCombatantOnBoard(state, target)) {
    throw new EncounterRuleError('Spell caster and target must be present on the board.');
  }
  if (!allowDead && combatant(state, target).life === 'dead') {
    throw new EncounterRuleError('A dead combatant is not a legal spell target.');
  }
  if (gridDistance(token(state, actor).position, token(state, target).position) > rangeFeet) {
    throw new EncounterRuleError(`Spell target ${target} is out of range.`);
  }
}

function selectedSpellTargets(
  state: EncounterState,
  definition: SpellDefinition,
  command: SpellCastCommand,
): readonly CombatantId[] {
  const targeting = definition.targeting;
  switch (targeting.kind) {
    case 'self':
      if (command.targets.length !== 0) throw new EncounterRuleError('A Self spell does not select targets.');
      return [command.actor];
    case 'single':
      if (command.targets.length !== 1) throw new EncounterRuleError(`${definition.name} requires one target.`);
      validateTargetRange(state, command.actor, command.targets[0] as CombatantId, targeting.rangeFeet, targeting.allowDead === true);
      return command.targets;
    case 'multiple': {
      const slotDelta = definition.level === 0 ? 0 : (command.slotLevel as number) - definition.level;
      const operation = definition.operation;
      const maximum = operation.kind === 'attack_beams'
        ? attackBeamCount(command.casterLevel, operation)
        : targeting.baseMaximum + targeting.additionalPerSlot * slotDelta;
      const requiresEveryDart = operation.kind === 'magic_missiles' ||
        operation.kind === 'attack_rays' ||
        operation.kind === 'attack_beams';
      if (command.targets.length < 1 || command.targets.length > maximum) {
        throw new EncounterRuleError(`${definition.name} allows at most ${maximum} targets.`);
      }
      if (requiresEveryDart && command.targets.length !== maximum) {
        throw new EncounterRuleError(`${definition.name} requires one target allocation per projectile.`);
      }
      if (!requiresEveryDart) assertUnique(command.targets, 'Spell targets');
      for (const target of command.targets) validateTargetRange(state, command.actor, target, targeting.rangeFeet);
      return command.targets;
    }
    case 'selected': {
      validateDeclaredTargetSelection(state, definition, command);
      for (const target of command.targets) {
        validateTargetRange(state, command.actor, target, targeting.rangeFeet);
      }
      return command.targets;
    }
    case 'area':
      if (command.targets.length !== 0) throw new EncounterRuleError('Area spell targets come from its exact template.');
      return areaTargets(state, definition, command);
    case 'area_selected': {
      const inArea = areaTargets(state, definition, command);
      const slotDelta = (command.slotLevel as number) - definition.level;
      const maximum = targeting.baseMaximum + targeting.additionalPerSlot * slotDelta;
      if (command.targets.length < 1 || command.targets.length > maximum) {
        throw new EncounterRuleError(`${definition.name} allows at most ${maximum} selected area targets.`);
      }
      assertUnique(command.targets, 'Spell targets');
      if (command.targets.some((target) => !inArea.includes(target))) {
        throw new EncounterRuleError(`${definition.name} selected targets must occupy its exact template.`);
      }
      return command.targets;
    }
    case 'all_in_range':
      if (command.targets.length < 1) throw new EncounterRuleError(`${definition.name} requires at least one target.`);
      assertUnique(command.targets, 'Spell targets');
      for (const target of command.targets) validateTargetRange(state, command.actor, target, targeting.rangeFeet);
      return command.targets;
    case 'remote':
      if (command.targets.length !== 1) throw new EncounterRuleError(`${definition.name} requires one remote target.`);
      if (combatant(state, command.targets[0] as CombatantId).life === 'dead') throw new EncounterRuleError('A dead combatant is not a legal spell target.');
      if (!isCombatantOnBoard(state, command.targets[0] as CombatantId)) throw new EncounterRuleError('An absent combatant is not a legal spell target.');
      return command.targets;
    case 'utility':
      if (command.targets.length !== 0) throw new EncounterRuleError('This utility spell does not target a combatant.');
      return [command.actor];
  }
}

function scaledTargetCount(
  definition: SpellDefinition,
  command: SpellCastCommand,
  rule: TargetCountRule,
): number {
  if (rule.kind === 'fixed') return rule.count;
  if (rule.kind === 'up_to') return rule.maximum;
  const slotLevel = command.slotLevel;
  if (slotLevel === null) {
    throw new TargetSelectionRuleError('slot_scaled_count', `${definition.name} slot-scaled selection requires a spell slot.`);
  }
  return rule.base + rule.additionalPerSlot * (slotLevel - definition.level);
}

function validateTargetCount(
  definition: SpellDefinition,
  command: SpellCastCommand,
  rule: TargetCountRule,
): void {
  const maximum = scaledTargetCount(definition, command, rule);
  const selected = command.targets.length;
  if (rule.kind === 'fixed' && selected !== maximum) {
    throw new TargetSelectionRuleError('fixed_count', `${definition.name} violates fixed_count: select exactly ${String(maximum)} targets.`);
  }
  if (rule.kind === 'up_to' && (selected < 1 || selected > maximum)) {
    throw new TargetSelectionRuleError('up_to_count', `${definition.name} violates up_to_count: select from 1 through ${String(maximum)} targets.`);
  }
  if (rule.kind === 'slot_scaled') {
    const legal = rule.limit === 'exact' ? selected === maximum : selected >= 1 && selected <= maximum;
    if (!legal) {
      throw new TargetSelectionRuleError(
        'slot_scaled_count',
        `${definition.name} violates slot_scaled_count: select ${rule.limit === 'exact' ? 'exactly' : 'up to'} ${String(maximum)} targets.`,
      );
    }
  }
}

function targetDistance(state: EncounterState, left: CombatantId, right: CombatantId): number {
  return gridDistance(token(state, left).position, token(state, right).position);
}

function validateTargetGeometry(
  state: EncounterState,
  definition: SpellDefinition,
  targets: readonly CombatantId[],
  rule: TargetGeometryRule,
): void {
  switch (rule.kind) {
    case 'secondaries_within_primary': {
      const primary = targets[0];
      if (primary !== undefined && targets.slice(1).some((target) => targetDistance(state, primary, target) > rule.distanceFeet)) {
        throw new TargetSelectionRuleError(
          'secondary_range_from_primary',
          `${definition.name} violates secondary_range_from_primary: every secondary must be within ${String(rule.distanceFeet)} feet of the primary.`,
        );
      }
      return;
    }
    case 'pair_within':
      if (targets.length === 2 && targetDistance(state, targets[0] as CombatantId, targets[1] as CombatantId) > rule.distanceFeet) {
        throw new TargetSelectionRuleError(
          'pair_range',
          `${definition.name} violates pair_range: the pair must be within ${String(rule.distanceFeet)} feet.`,
        );
      }
      return;
    case 'all_within_each_other':
      for (const [index, left] of targets.entries()) {
        if (targets.slice(index + 1).some((right) => targetDistance(state, left, right) > rule.distanceFeet)) {
          throw new TargetSelectionRuleError(
            'all_targets_range',
            `${definition.name} violates all_targets_range: every pair must be within ${String(rule.distanceFeet)} feet.`,
          );
        }
      }
      return;
  }
}

function validateTargetDestinations(
  definition: SpellDefinition,
  command: SpellCastCommand,
): void {
  const destinations = command.targetDestinations ?? [];
  if (
    destinations.length !== command.targets.length ||
    destinations.some((entry, index) => entry.target !== command.targets[index])
  ) {
    throw new TargetSelectionRuleError(
      'each_target_own_destination',
      `${definition.name} violates each_target_own_destination: each selected target needs its own ordered destination.`,
    );
  }
}

function validateDeclaredTargetSelection(
  state: EncounterState,
  definition: SpellDefinition,
  command: SpellCastCommand,
): void {
  if (definition.targeting.kind !== 'selected') return;
  const selection = definition.targeting.selection;
  if (selection.kind === 'targets') {
    validateTargetCount(definition, command, selection.count);
  } else {
    const expected = scaledTargetCount(definition, command, selection.projectiles);
    if (command.targets.length !== expected) {
      throw new TargetSelectionRuleError(
        'projectile_allocation_count',
        `${definition.name} violates projectile_allocation_count: allocate exactly ${String(expected)} projectiles.`,
      );
    }
  }
  if (selection.uniqueness === 'unique' && new Set(command.targets).size !== command.targets.length) {
    throw new TargetSelectionRuleError('unique_targets', `${definition.name} violates unique_targets: each target can be selected at most once.`);
  }
  for (const geometry of selection.geometry) validateTargetGeometry(state, definition, command.targets, geometry);
  if (selection.kind === 'targets' && selection.destinations === 'each_target') {
    validateTargetDestinations(definition, command);
  }
}

function cloneAreaTemplate(template: AreaTemplate): AreaTemplate {
  switch (template.shape) {
    case 'cone':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin }, direction: { ...template.template.direction } } };
    case 'cube':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin }, center: { ...template.template.center }, axis: { ...template.template.axis } } };
    case 'cylinder':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin } } };
    case 'emanation':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin } } };
    case 'sphere':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin } } };
    case 'line':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin }, direction: { ...template.template.direction } } };
  }
}

function resolvedSpellEffectPayload(
  definition: SpellDefinition,
  command: SpellCastCommand,
  payload: EffectPayload,
): EffectPayload {
  const selectedArea = (): AreaTemplate => {
    if (command.area === null) throw new EncounterRuleError(`${definition.name} requires an area placement.`);
    return cloneAreaTemplate(command.area);
  };
  const slotDelta = definition.level === 0 || command.castAsRitual
    ? 0
    : (command.slotLevel as number) - definition.level;
  switch (payload.kind) {
    case 'recurring_damage_operation':
      return payload;
    case 'damage_reduction':
      return payload.damageType === 'chosen_when_cast'
        ? { ...payload, damageType: command.selectedOption ?? 'Acid' }
        : payload;
    case 'ability_check_modifier':
    case 'skill_modifier':
      return payload.skill === 'chosen_when_cast'
        ? { ...payload, skill: command.selectedOption ?? 'Arcana' }
        : payload;
    case 'alarm_ward':
    case 'food_purification':
    case 'image_illusion':
      return payload.placement === 'selected_when_cast'
        ? { ...payload, placement: selectedArea() }
        : payload;
    case 'environmental_water':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        gallons: payload.gallons + payload.gallonsPerSlot * slotDelta,
        cubeFeet: payload.cubeFeet + payload.cubeFeetPerSlot * slotDelta,
      };
    case 'condition_choice': {
      const selected = command.selectedOption;
      if (selected !== 'Blinded' && selected !== 'Deafened') {
        throw new EncounterRuleError(`${definition.name} requires Blinded or Deafened selection.`);
      }
      if (!payload.conditions.includes(selected)) {
        throw new EncounterRuleError(`${definition.name} does not allow ${selected}.`);
      }
      return { kind: 'condition', condition: selected };
    }
    case 'gust_of_wind_area':
    case 'flaming_sphere':
    case 'silence_area':
    case 'web_area':
    case 'truth_zone':
    case 'daylight_area':
    case 'magic_circle':
    case 'major_image':
    case 'sleet_storm_area':
    case 'stinking_cloud_area':
    case 'tiny_hut':
    case 'black_tentacles_area':
    case 'confusion_area':
    case 'control_water':
    case 'hallucinatory_terrain':
    case 'ice_storm_terrain':
      return payload.placement === 'selected_when_cast'
        ? { ...payload, placement: selectedArea() }
        : payload;
    case 'obscured_area':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        radiusFeet: payload.radiusFeet +
          (definition.targeting.kind === 'area' ? definition.targeting.sizePerSlotFeet * slotDelta : 0),
      };
    case 'summoned_undead':
      return {
        ...payload,
        createdCreatures: payload.createdCreatures + payload.createdCreaturesPerSlot * slotDelta,
        reassertedCreatures: payload.reassertedCreatures + payload.reassertedCreaturesPerSlot * slotDelta,
      };
    case 'glyph_of_warding':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        explosiveDamageCount: payload.explosiveDamageCount + payload.explosiveDamagePerSlotCount * slotDelta,
        storedSpellMaximumLevel: payload.storedSpellMaximumLevel + slotDelta,
      };
    case 'spirit_guardians_area':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta,
      };
    case 'conjure_minor_elementals':
      return { ...payload, damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta };
    case 'phantasmal_killer':
      return { ...payload, repeatDamageCount: payload.repeatDamageCount + payload.repeatDamagePerSlotCount * slotDelta };
    case 'private_sanctum':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        maximumCubeFeet: payload.maximumCubeFeet + payload.cubeFeetPerSlot * slotDelta,
      };
    case 'wall_of_fire':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta,
      };
    case 'energy_protection': {
      const selected = command.selectedOption;
      if (selected === null || !payload.damageTypes.includes(selected as 'Acid' | 'Cold' | 'Fire' | 'Lightning' | 'Thunder')) {
        throw new EncounterRuleError(`${definition.name} requires a listed energy damage type.`);
      }
      return { ...payload, selectedDamageType: selected };
    }
    case 'condition':
    case 'sustained_effect':
    case 'condition_bundle':
    case 'exhaustion':
    case 'ongoing_damage':
    case 'temporary_banishment':
    case 'armor_class_modifier':
    case 'hit_point_maximum_modifier':
    case 'attack_roll_modifier':
    case 'saving_throw_modifier':
    case 'd20_test_modifier':
    case 'movement_modifier':
    case 'damage_rider':
    case 'ensnaring_strike':
    case 'bonus_action_attack_grant':
    case 'extra_attack_count_override':
    case 'action_surge':
    case 'cannot_regain_hit_points':
    case 'opportunity_attacks_disabled':
    case 'light_source':
    case 'conjured_hand':
    case 'communication_link':
    case 'illusion':
    case 'commanded_action':
    case 'language_comprehension':
    case 'detection_sense':
    case 'appearance_illusion':
    case 'bonus_action_dash':
    case 'falling_protection':
    case 'summoned_familiar':
    case 'floating_disk':
    case 'magic_identification':
    case 'illusory_script':
    case 'jump_movement':
    case 'base_armor_class':
    case 'sleep_sequence':
    case 'unseen_servant':
    case 'form_alteration':
    case 'arcane_lock':
    case 'magic_aura':
    case 'augury':
    case 'attacks_against_target_roll_mode':
    case 'calm_emotions':
    case 'darkvision':
    case 'detect_thoughts':
    case 'granted_breath':
    case 'ability_check_advantage':
    case 'size_alteration':
    case 'trap_detection':
    case 'corpse_preservation':
    case 'levitation':
    case 'object_location':
    case 'magic_mouth':
    case 'object_unlock':
    case 'magic_weapon':
    case 'location_tracking':
    case 'mirror_images':
    case 'teleport':
    case 'poison_protection':
    case 'ray_enfeeblement':
    case 'rope_trick':
    case 'see_invisibility':
    case 'spider_climb':
    case 'spiritual_weapon':
    case 'warding_bond':
    case 'minor_magic':
    case 'object_repair':
    case 'attack_roll_mode_modifier':
    case 'faerie_fire':
    case 'consumable_healing_pool':
    case 'creature_type_protection':
    case 'sanctuary':
    case 'magic_missile_immunity':
    case 'shield_defense':
    case 'beacon_of_hope':
    case 'bestow_curse':
    case 'blink':
    case 'clairvoyance_sensor':
    case 'created_food_and_water':
    case 'flight':
    case 'gaseous_form':
    case 'haste':
    case 'hypnotic_pattern':
    case 'fear':
    case 'meld_into_stone':
    case 'nondetection':
    case 'phantom_steed':
    case 'sending':
    case 'slow':
    case 'speak_with_dead':
    case 'universal_language':
    case 'vampiric_touch':
    case 'water_breathing':
    case 'water_walk':
    case 'arcane_eye':
    case 'aura_of_life':
    case 'banishment':
    case 'charm_monster':
    case 'death_ward':
    case 'dimension_door':
    case 'divination':
    case 'fabricate':
    case 'faithful_hound':
    case 'fire_shield':
    case 'freedom_of_movement':
    case 'guardian_of_faith':
    case 'locate_creature':
    case 'polymorph':
    case 'resilient_sphere':
    case 'secret_chest':
    case 'stone_shape':
    case 'damage_resistances':
      return payload;
  }
}

function effectApplication(
  definition: SpellDefinition,
  command: SpellCastCommand,
  data: EffectData,
  targets: readonly CombatantId[],
): EffectApplication {
  const actualTargets = data.target === 'self' ? [command.actor] : targets;
  const timingCombatant = data.expiresAt.startsWith('source_')
    ? command.actor
    : actualTargets[0] as CombatantId;
  const boundary: TurnBoundary = data.expiresAt.endsWith('_start') ? 'start' : 'end';
  const payload = resolvedSpellEffectPayload(definition, command, data.payload);
  const slotDelta = definition.level === 0 || command.castAsRitual
    ? 0
    : (command.slotLevel as number) - definition.level;
  const slotLevel = command.slotLevel ?? definition.level;
  const durationTier = data.slotDurationTiers
    ?.reduce<NonNullable<EffectData['slotDurationTiers']>[number] | undefined>(
      (highest, candidate) => candidate.minimumSlot <= slotLevel &&
        (highest === undefined || candidate.minimumSlot > highest.minimumSlot) ? candidate : highest,
      undefined,
    );
  const durationRounds = durationTier !== undefined
    ? durationTier.durationRounds
    : data.durationRounds === null
      ? null
      : data.durationRounds + (data.durationRoundsPerSlot ?? 0) * slotDelta;
  return {
    targets: actualTargets,
    duration: durationRounds === null
      ? { kind: 'permanent' }
      : {
          kind: 'turn_boundaries',
          timing: { combatant: timingCombatant, boundary, source: definition.source },
          remaining: durationRounds,
        },
    concentration: durationTier?.concentration ?? data.concentration,
    stackingIdentity: effectStackingIdentity(`spell:${definition.id}`),
    stacking: data.stacking ?? 'replace_same_source',
    repeatedSave: data.repeatedSave === undefined
      ? null
      : {
          timing: {
            combatant: actualTargets[0] as CombatantId,
            boundary: data.repeatedSave.timing === 'target_start' ? 'start' : 'end',
            source: definition.source,
          },
          ability: data.repeatedSave.ability,
          dc: command.saveDc,
          rollMode: data.repeatedSave.rollMode,
          onSuccess: 'remove_target',
        },
    payload,
  };
}

function applySpellEffect(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  data: EffectData,
  targets: readonly CombatantId[],
): void {
  if (targets.length === 0 && data.target === 'targets') return;
  if (data.repeatedSave !== undefined && data.target === 'targets') {
    for (const target of targets) {
      applyEffect(context, command.actor, effectApplication(definition, command, data, [target]));
    }
    return;
  }
  applyEffect(context, command.actor, effectApplication(definition, command, data, targets));
}

function applyHealing(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  amount: number,
): void {
  const before = combatant(context.state, target);
  if (before.life === 'dead') throw new EncounterRuleError('A dead creature cannot regain Hit Points.');
  if (context.state.effects.some((candidate) =>
    candidate.targets.includes(target) && candidate.payload.kind === 'cannot_regain_hit_points')) return;
  const hitPoints = Math.min(effectiveHitPointMaximum(context.state, target), before.hitPoints + amount);
  context.state = replaceCombatant(context.state, {
    ...before,
    hitPoints,
    life: hitPoints > 0 ? 'living' : before.life,
    deathSaves: hitPoints > 0 ? null : before.deathSaves,
  });
  emit(context, {
    type: 'healing_applied', source, target, amount: hitPoints - before.hitPoints,
    hitPointsBefore: before.hitPoints, hitPointsAfter: hitPoints,
  });
}

function grantTemporaryHitPoints(
  context: ReductionContext,
  target: CombatantId,
  amount: number,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new EncounterRuleError('Temporary Hit Points must be a non-negative safe integer.');
  }
  const subject = combatant(context.state, target);
  const after = Math.max(subject.temporaryHitPoints, amount);
  context.state = replaceCombatant(context.state, { ...subject, temporaryHitPoints: after });
  emit(context, {
    type: 'temporary_hit_points_changed',
    combatant: target,
    before: subject.temporaryHitPoints,
    after,
  });
}

/**
 * Thunderwave and Gust of Wind state push distances but the SRD is silent on
 * collision handling (spell-descriptions.txt:4034-4039, 7878-7883). Product
 * rule: resolve each entered cell and stop before the first map edge,
 * movement-blocking object/region, or occupied cell.
 */
export const FORCED_MOVEMENT_OBSTACLE_RULE = 'stop_before_first_blocker' as const;

function forceMove(
  context: ReductionContext,
  origin: GridCell,
  source: CombatantId,
  target: CombatantId,
  distanceFeet: number,
  direction: 'away' | 'toward',
): void {
  const subjectToken = token(context.state, target);
  const sign = direction === 'away' ? 1 : -1;
  const columnStep = Math.sign(subjectToken.position.column - origin.column) * sign;
  const rowStep = Math.sign(subjectToken.position.row - origin.row) * sign;
  if (columnStep === 0 && rowStep === 0) return;
  let position = subjectToken.position;
  const traversed: GridCell[] = [];
  const occupied = new Set(context.state.tokens.filter((entry) => entry.combatantId !== target).map((entry) => cellKey(entry.position)));
  for (let distance = 0; distance + 5 <= distanceFeet; distance += 5) {
    const candidate = { column: position.column + columnStep, row: position.row + rowStep };
    if (!isCellInside(context.state.bounds, candidate) || movementBlocked(context.state, candidate) || occupied.has(cellKey(candidate))) break;
    position = candidate;
    context.state = {
      ...context.state,
      tokens: context.state.tokens.map((entry) =>
        entry.combatantId === target ? { ...entry, position: { ...position } } : entry),
    };
    traversed.push({ ...position });
    processEnteredCell(context, target);
    if (combatant(context.state, target).life !== 'living') break;
  }
  const movement = combatant(context.state, target).turn.movement;
  emit(context, { type: 'movement_completed', combatant: target, path: traversed, spent: feet(0), remaining: movement.remaining });
  void source;
}

function rollSpellAttack(
  context: ReductionContext,
  command: SpellCastCommand,
  target: CombatantId,
): ReturnType<typeof resolveAttackRoll> {
  const actorPosition = token(context.state, command.actor).position;
  const targetPosition = token(context.state, target).position;
  if (
    !hasLineOfSight(context.state, actorPosition, targetPosition) ||
    coverTierBetween(context.state, actorPosition, targetPosition) === 'total'
  ) throw new EncounterRuleError('The spell target has Total Cover or is outside line of sight.');
  const rollModeEffects = context.state.effects.filter((effect) => {
    if (effect.payload.kind === 'faerie_fire') return effect.targets.includes(target);
    if (effect.payload.kind === 'attacks_against_target_roll_mode') {
      return effect.targets.includes(target) &&
        !canCombatantPierceVisualIllusion(context.state, command.actor, target);
    }
    if (effect.payload.kind !== 'attack_roll_mode_modifier') return false;
    const appliesTo = effect.payload.appliesTo;
    return ((appliesTo.kind === 'next_attack_against_target' ||
      appliesTo.kind === 'attacks_against_target') && effect.targets.includes(target)) ||
      ((appliesTo.kind === 'next_attack_by_target' || appliesTo.kind === 'all_attacks_by_target') &&
        effect.targets.includes(command.actor));
  });
  const visibilityMode: RollMode = canCombatantSee(context.state, command.actor, target)
    ? 'normal'
    : 'disadvantage';
  const attack = resolveAttackRoll({
    attackBonus: command.attackBonus + effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
    targetArmorClass: coverAdjustedArmorClass(context.state, command.actor, target),
    rollMode: combineRollModes([visibilityMode, ...rollModeEffects.map((effect) =>
      effect.payload.kind === 'faerie_fire'
        ? effect.payload.attackModeAgainstTarget
        : effect.payload.kind === 'attack_roll_mode_modifier' ||
          effect.payload.kind === 'attacks_against_target_roll_mode'
          ? effect.payload.mode
          : 'normal')]),
    criticalFloor: 20,
  }, context.rng);
  endEffects(context, new Set(rollModeEffects.flatMap((effect) =>
    effect.payload.kind === 'attack_roll_mode_modifier' &&
    (effect.payload.appliesTo.kind === 'next_attack_against_target' ||
      effect.payload.appliesTo.kind === 'next_attack_by_target')
      ? [effect.id]
      : [])), 'duration_expired');
  return attack;
}

function resolveSpellAttack(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  target: CombatantId,
  damage: ScaledDice,
  spellDamageType: DamageType,
  rider: EffectData | null,
): ReturnType<typeof resolveAttackRoll> {
  const attack = rollSpellAttack(context, command, target);
  let result: ReturnType<typeof resolveDamage> | null = null;
  if (attack.outcome !== 'miss') {
    const baseRequest: DamageRequest = {
      terms: [{ type: spellDamageType, dice: scaledSpellDamageExpression(context, definition, damage, command) }],
      critical: attack.outcome === 'critical',
      responses: [],
    };
    const request: DamageRequest = baseRequest;
    result = resolveTargetDamage(context, command.actor, target, request);
    applyDamage(context, command.actor, target, result.total, request.critical);
    concentrationCheck(context, target, result.total);
    if (rider !== null) applySpellEffect(context, definition, command, rider, [target]);
  }
  emit(context, { type: 'attack_resolved', actor: command.actor, target, attack, damage: result });
  return attack;
}

function selectedSpellDamageType(
  definition: SpellDefinition,
  command: SpellCastCommand,
  configured: DamageType | readonly DamageType[],
): DamageType {
  if (!Array.isArray(configured)) return configured as DamageType;
  if (command.selectedOption === null) {
    throw new EncounterRuleError(`${definition.name} requires a damage type selection.`);
  }
  const selected = damageType(command.selectedOption);
  if (!configured.includes(selected)) {
    throw new EncounterRuleError(`${definition.name} does not allow ${command.selectedOption} damage.`);
  }
  return selected;
}

function selectedModifierSkill(
  definition: SpellDefinition,
  command: SpellCastCommand,
  configured: CastChoice<Skill>,
): Skill {
  if (typeof configured === 'string') return configured;
  const selected = skills.find((skill) => skill === command.selectedOption);
  if (selected === undefined || !configured.options.includes(selected)) {
    throw new EncounterRuleError(`${definition.name} requires one of its declared skill choices.`);
  }
  return selected;
}

function selectedModifierDamageType(
  definition: SpellDefinition,
  command: SpellCastCommand,
  configured: CastChoice<DamageType>,
): DamageType {
  if (typeof configured === 'string') return configured;
  const selected = configured.options.find((candidate) => candidate === command.selectedOption);
  if (selected === undefined) {
    throw new EncounterRuleError(`${definition.name} requires one of its declared damage-type choices.`);
  }
  return selected;
}

function removeSpellConditions(
  context: ReductionContext,
  target: CombatantId,
  conditions: readonly string[],
): void {
  const matching = context.state.effects.filter((candidate) =>
    candidate.targets.includes(target) &&
    candidate.payload.kind === 'condition' &&
    conditions.includes(candidate.payload.condition));
  for (const effect of matching) removeEffectTarget(context, effect.id, target, 'condition_removed');
}

function applySpellDamageAmount(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  type: DamageType,
  sides: number,
  rawAmount: number,
): void {
  const baseRequest: DamageRequest = {
    terms: [{ type, dice: { count: 0, sides: dieSides(sides), modifier: rawAmount } }],
    critical: false,
    responses: [],
  };
  const adjusted = resolveTargetDamage(context, source, target, baseRequest).total;
  applyDamage(context, source, target, adjusted);
  concentrationCheck(context, target, adjusted);
}

interface DamageScalingContext {
  readonly definition: SpellDefinition | null;
  readonly command: SpellCastCommand | null;
}

function operationDiceExpression(
  state: EncounterState,
  target: CombatantId,
  dice: OperationDice,
  scaling: DamageOperationPacket['scaling'],
  cast: DamageScalingContext,
): DiceExpression {
  const slotDelta = cast.definition === null || cast.command === null || cast.definition.level === 0
    ? 0
    : (cast.command.slotLevel as number) - cast.definition.level;
  const cantripDelta = dice.cantripUpgrade && cast.command !== null
    ? cantripUpgradeCount(cast.command.casterLevel)
    : 0;
  const subject = combatant(state, target);
  const additionalDice = (() => {
    switch (scaling.kind) {
      case 'none': return 0;
      case 'target_size': {
        const size = subject.profile.rules.sizeCategory;
        if (size === undefined) {
          throw new EncounterRuleError(`Damage scaling requires a known size for ${target}.`);
        }
        return scaling.additionalDiceBySize[size];
      }
      case 'target_missing_hit_points':
        return Math.min(
          scaling.maximumAdditionalDice,
          Math.floor(
            (effectiveHitPointMaximum(state, target) - subject.hitPoints) /
            scaling.hitPointsPerAdditionalDie,
          ),
        );
    }
  })();
  return {
    count: dice.baseCount + dice.perSlotCount * slotDelta + cantripDelta + additionalDice,
    sides: dieSides(dice.sides),
    modifier: dice.modifier + dice.perSlotModifier * slotDelta,
    ...(dice.minimumTotal === undefined ? {} : { minimumTotal: dice.minimumTotal }),
    ...(dice.maximumTotal === undefined ? {} : { maximumTotal: dice.maximumTotal }),
    ...(dice.rerollBelow === undefined ? {} : { rerollBelow: dice.rerollBelow }),
  };
}

function operationDamageType(packet: DamageOperationPacket): DamageType {
  return packet.damageType.kind === 'fixed'
    ? packet.damageType.damageType
    : packet.damageType.to;
}

function preparedDamageOperationInstances(
  state: EncounterState,
  target: CombatantId,
  operation: DamageOperationSpec,
  cast: DamageScalingContext,
): readonly { readonly damage: DamageRequest; readonly thresholdRider: ThresholdDamageRider | null }[] {
  return Array.from({ length: operation.instancesPerTarget }, () =>
    operation.packets.map((packet) => {
      const type = operationDamageType(packet);
      const baseRequest: DamageRequest = {
        terms: [{ type, dice: operationDiceExpression(state, target, packet.dice, packet.scaling, cast) }],
        critical: false,
        responses: [],
      };
      return { damage: baseRequest, thresholdRider: packet.thresholdRider };
    }),
  ).flat();
}

function applyThresholdDamageRider(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  rider: ThresholdDamageRider | null,
  damage: number,
  identity: string,
): void {
  if (rider === null || damage < rider.minimumDamage || combatant(context.state, target).life === 'dead') return;
  applyEffect(context, source, {
    targets: [target],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: target,
        boundary: rider.expiresAt === 'target_start' ? 'start' : 'end',
        source: identity,
      },
      remaining: rider.durationRounds,
    },
    concentration: false,
    stackingIdentity: effectStackingIdentity(identity),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: { kind: 'condition', condition: rider.condition },
  });
}

function resolvePreparedDamageOperation(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  delivery: DamageOperationSpec['delivery'],
  saveDc: number,
  instances: readonly { readonly damage: DamageRequest; readonly thresholdRider: ThresholdDamageRider | null }[],
  identity: string,
): SpellOperationOutcome {
  const saveSucceeded = delivery.kind === 'save' && resolveTargetSave(
    context,
    source,
    target,
    delivery.ability,
    saveDc,
    delivery.rollMode,
    null,
  ).outcome === 'success';
  let dealtDamage = false;
  for (const [index, instance] of instances.entries()) {
    const result = resolveTargetDamage(context, source, target, instance.damage);
    const amount = saveSucceeded
      ? delivery.kind === 'save' && delivery.onSuccess === 'half'
        ? Math.floor(result.total / 2)
        : 0
      : result.total;
    if (amount > 0) dealtDamage = true;
    applyDamage(context, source, target, amount);
    concentrationCheck(context, target, amount);
    applyThresholdDamageRider(context, source, target, instance.thresholdRider, amount, `${identity}:${String(index)}`);
  }
  return delivery.kind === 'save' || dealtDamage ? 'applied' : 'no_op';
}

function applyDamageOperation(
  context: ReductionContext,
  source: CombatantId,
  targets: readonly CombatantId[],
  operation: DamageOperationSpec,
  saveDc: number,
  identity: string,
  cast: DamageScalingContext,
): SpellOperationOutcome {
  if (targets.length === 0) throw new EncounterRuleError('A damage operation requires at least one target.');
  const resolveNow = operation.timing.kind === 'immediate' || operation.timing.initial === 'immediate';
  const immediateOutcomes: SpellOperationOutcome[] = [];
  if (resolveNow) {
    for (const target of targets) {
      immediateOutcomes.push(resolvePreparedDamageOperation(
        context,
        source,
        target,
        operation.delivery,
        saveDc,
        preparedDamageOperationInstances(context.state, target, operation, cast),
        `${identity}:immediate:${String(target)}`,
      ));
    }
  }
  if (operation.timing.kind !== 'recurring') return combinedSpellOperationOutcome(immediateOutcomes);
  if (operation.timing.concentration) endConcentration(context, source, 'concentration_replaced');
  const created: EncounterEffectId[] = [];
  for (const target of targets) {
    const before = context.state.nextEffectSequence;
    applyEffect(context, source, {
      targets: [target],
      duration: {
        kind: 'turn_boundaries',
        timing: {
          combatant: target,
          boundary: operation.timing.tick === 'target_start' ? 'start' : 'end',
          source: identity,
        },
        remaining: operation.timing.durationRounds,
      },
      concentration: false,
      stackingIdentity: effectStackingIdentity(`${identity}:${String(target)}`),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: {
        kind: 'recurring_damage_operation',
        instances: preparedDamageOperationInstances(context.state, target, operation, cast),
        delivery: operation.delivery,
        saveDc,
        timing: {
          combatant: target,
          boundary: operation.timing.tick === 'target_start' ? 'start' : 'end',
          source: identity,
        },
      },
    });
    created.push(encounterEffectId(`effect:${String(before)}`));
  }
  if (operation.timing.concentration) {
    context.state = {
      ...context.state,
      effects: context.state.effects.map((effect) => created.includes(effect.id)
        ? { ...effect, concentrationOwner: source }
        : effect),
    };
  }
  return 'applied';
}

/**
 * Equal-potency repeat castings use the most recent effect. Bundled SRD 5.2.1:
 * docs/srd/full/srd-5.2.1.txt:6462-6469. Imported operations still declare
 * their policy; this constant is the named SRD choice available to packs.
 */
export const CONDITION_LIFECYCLE_EQUAL_POTENCY_STACKING_RULE = Object.freeze({
  kind: 'replace' as const,
  sources: 'any_source' as const,
});

/**
 * One shared processBoundary scheduler is reused for area hooks, step-4
 * re-evaluated branches, repeated saves, and duration clocks. Damage lifecycle
 * consequences run synchronously immediately after their damage event.
 */
export const CONDITION_LIFECYCLE_HOOK_ORDER = Object.freeze([
  'persistent_area_hooks_then_owned_area_event_bindings_and_damage_lifecycle',
  'reevaluated_branches_and_damage_lifecycle',
  'creation_ordered_effect_payloads_including_automatic_ticks_and_delayed_one_shots',
  'repeat_saves',
  'duration_expiry',
] as const);

function lifecycleDuration(
  operation: ConditionLifecycleOperation,
  sourceCombatant: CombatantId,
  target: CombatantId,
  source: string,
): EffectApplication['duration'] {
  if (operation.duration.kind === 'concentration') return { kind: 'permanent' };
  return {
    kind: 'turn_boundaries',
    timing: {
      combatant: operation.duration.expiresAt.startsWith('source_') ? sourceCombatant : target,
      boundary: operation.duration.expiresAt.endsWith('_start') ? 'start' : 'end',
      source,
    },
    remaining: operation.duration.rounds,
  };
}

function modifierEffectData(
  payload: EffectPayload,
  duration: ModifierDuration,
): EffectData {
  return {
    payload,
    target: 'targets',
    concentration: duration.kind !== 'fixed_rounds',
    durationRounds: duration.kind === 'concentration' ? null : duration.rounds,
    expiresAt: duration.kind === 'concentration' ? 'target_end' : duration.expiresAt,
    stacking: 'coexist',
  };
}

type EquippedItemContact = {
  readonly combatant: CombatantId;
  readonly relationship: 'held' | 'worn' | 'carried' | 'other';
};

function itemContacts(state: EncounterState, id: ItemId): readonly EquippedItemContact[] {
  const contacts = new Map<CombatantId, EquippedItemContact['relationship']>();
  for (const equipment of state.equipment ?? []) {
    if (heldItems(equipment.hands).includes(id)) contacts.set(equipment.combatant, 'held');
    else if (equipment.worn.includes(id)) contacts.set(equipment.combatant, 'worn');
    else if (equipment.carried.includes(id)) contacts.set(equipment.combatant, 'carried');
  }
  for (const contact of state.itemContacts ?? []) {
    if (contact.item === id && !contacts.has(contact.combatant)) contacts.set(contact.combatant, 'other');
  }
  const ground = state.groundItems?.find((candidate) => candidate.item === id);
  if (ground !== undefined) {
    for (const placed of state.tokens) {
      if (cellKey(placed.position) === cellKey(ground.position) && !contacts.has(placed.combatantId)) {
        contacts.set(placed.combatantId, 'other');
      }
    }
  }
  return [...contacts.entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([combatant, relationship]) => ({ combatant, relationship }));
}

function itemPosition(state: EncounterState, id: ItemId): GridCell {
  const ground = state.groundItems?.find((candidate) => candidate.item === id);
  if (ground !== undefined) return ground.position;
  const possessor = state.equipment?.find((equipment) =>
    heldItems(equipment.hands).includes(id) || equipment.worn.includes(id) || equipment.carried.includes(id));
  if (possessor === undefined) throw new EquipmentRuleError('unknown_item', `Item ${id} is not present in the encounter.`);
  return token(state, possessor.combatant).position;
}

function heatMetalRange(definition: SpellDefinition): number {
  switch (definition.targeting.kind) {
    case 'single':
    case 'utility': return definition.targeting.rangeFeet;
    case 'self':
    case 'multiple':
    case 'selected':
    case 'area':
    case 'area_selected':
    case 'all_in_range':
    case 'remote':
      throw new EncounterRuleError(`${definition.name} has incompatible item targeting.`);
  }
}

function executeHeatMetal(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  operation: Extract<BranchSpellOperation, { readonly kind: 'heat_metal' }>,
): SpellOperationOutcome {
  const selected = command.objectTargets ?? [];
  if (selected.length !== 1) throw new EncounterRuleError(`${definition.name} requires exactly one item target.`);
  const id = selected[0] as ItemId;
  const item = encounterItem(context.state, id);
  if (!item.materials.some((material) => material.kind === 'known' && material.name === operation.requiredMaterial)) {
    throw new EquipmentRuleError('material_mismatch', `${definition.name} requires a metal item.`);
  }
  const casterPosition = token(context.state, command.actor).position;
  const position = itemPosition(context.state, id);
  if (
    gridDistance(casterPosition, position) > heatMetalRange(definition) ||
    !hasLineOfSight(context.state, casterPosition, position)
  ) throw new EncounterRuleError(`${definition.name} item target is out of range or not visible.`);

  const contacts = itemContacts(context.state, id);
  const rolled = resolveDamage({
    terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
    critical: false,
    responses: [],
  }, context.rng);
  const damaged: EquippedItemContact[] = [];
  for (const contact of contacts) {
    const request: DamageRequest = {
      terms: [{ type: operation.damageType, dice: { count: 0, sides: dieSides(operation.dice.sides), modifier: rolled.total } }],
      critical: false,
      responses: [],
    };
    const adjusted = resolveTargetDamage(context, command.actor, contact.combatant, request).total;
    applyDamage(context, command.actor, contact.combatant, adjusted);
    concentrationCheck(context, contact.combatant, adjusted);
    if (adjusted > 0) damaged.push(contact);
  }
  for (const contact of damaged) {
    if (contact.relationship !== 'held' && contact.relationship !== 'worn') continue;
    const save = resolveTargetSave(
      context, command.actor, contact.combatant,
      operation.failedSave.ability, command.saveDc, operation.failedSave.rollMode, null,
    );
    if (save.outcome !== 'failure') continue;
    if (contact.relationship === 'held') {
      forcedDropItem(context, contact.combatant, id);
      continue;
    }
    for (const cannotDropOperation of operation.failedSave.cannotDrop) {
      executeSpellOperation(context, definition, { ...command, targets: [contact.combatant] }, [contact.combatant], cannotDropOperation);
    }
  }
  return contacts.length === 0 ? 'no_op' : 'applied';
}

function lifecycleStacking(
  operation: ConditionLifecycleOperation,
): EffectApplication['stacking'] {
  switch (operation.stacking.kind) {
    case 'coexist':
      return 'coexist';
    case 'replace':
      return operation.stacking.sources === 'any_source' ? 'replace_any_source' : 'replace_same_source';
    case 'extend_duration':
      return 'coexist';
  }
}

function extendLifecycleDuration(
  context: ReductionContext,
  source: CombatantId,
  identity: ReturnType<typeof effectStackingIdentity>,
  operation: ConditionLifecycleOperation,
): boolean {
  if (operation.stacking.kind !== 'extend_duration') return false;
  if (operation.duration.kind !== 'fixed_rounds') {
    throw new EncounterRuleError('Only a fixed-round condition lifecycle can extend duration.');
  }
  const stackingSources = operation.stacking.sources;
  const existing = context.state.effects.find((effect) =>
    effect.stackingIdentity === identity &&
    (stackingSources === 'any_source' || effect.source === source));
  if (existing === undefined) return false;
  if (existing.duration.kind !== 'turn_boundaries') {
    throw new EncounterRuleError('A condition lifecycle cannot extend a permanent effect.');
  }
  const remaining = existing.duration.remaining + operation.duration.rounds;
  context.state = {
    ...context.state,
    effects: context.state.effects.map((effect) =>
      effect.id === existing.id
        ? { ...effect, duration: { ...effect.duration, remaining } }
        : effect),
  };
  emit(context, {
    type: 'effect_duration_extended', effectId: existing.id,
    addedRounds: operation.duration.rounds, remaining,
  });
  return true;
}

function applyConditionLifecycleOperation(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  targets: readonly CombatantId[],
  operation: ConditionLifecycleOperation,
): SpellOperationOutcome {
  const concentration = operation.duration.kind === 'concentration' ||
    operation.duration.kind === 'fixed_rounds_or_concentration';
  if (concentration) endConcentration(context, command.actor, 'concentration_replaced');
  const created: EncounterEffectId[] = [];
  let refusedTargets = 0;
  let appliedTargets = 0;
  for (const target of targets) {
    const conditionImmunities = combatant(context.state, target).profile.rules.conditionImmunities;
    const blockingImmunity = conditionImmunities.includes(operation.condition)
      ? operation.condition
      : operation.immunity !== null && conditionImmunities.includes(operation.immunity.condition)
        ? operation.immunity.condition
        : null;
    if (blockingImmunity !== null) {
      emit(context, {
        type: 'condition_application_refused', source: command.actor, target,
        condition: operation.condition, immunity: blockingImmunity,
      });
      refusedTargets += 1;
      continue;
    }
    if (
      operation.initialSave !== null &&
      resolveTargetSave(
        context, command.actor, target, operation.initialSave.ability,
        command.saveDc, operation.initialSave.rollMode, null,
      ).outcome !== operation.initialSave.applyOn
    ) {
      appliedTargets += 1;
      continue;
    }

    appliedTargets += 1;

    const identity = effectStackingIdentity(`condition-lifecycle:${definition.id}:${operation.condition}:${String(target)}`);
    if (extendLifecycleDuration(context, command.actor, identity, operation)) continue;
    const sequence = context.state.nextEffectSequence;
    applyEffect(context, command.actor, {
      targets: [target],
      duration: lifecycleDuration(operation, command.actor, target, definition.source),
      concentration: false,
      stackingIdentity: identity,
      stacking: lifecycleStacking(operation),
      repeatedSave: operation.repeatedSave === null
        ? null
        : {
            timing: {
              combatant: target,
              boundary: operation.repeatedSave.hook === 'target_start' ? 'start' : 'end',
              source: definition.source,
            },
            ability: operation.repeatedSave.ability,
            dc: command.saveDc,
            rollMode: operation.repeatedSave.rollMode,
            onSuccess: operation.repeatedSave.onSuccess,
          },
      damageBreak: operation.damageBreak,
      payload: { kind: 'condition', condition: operation.condition },
    });
    const id = encounterEffectId(`effect:${String(sequence)}`);
    if (context.state.effects.some((effect) => effect.id === id)) created.push(id);
  }
  if (concentration && created.length > 0) {
    context.state = {
      ...context.state,
      effects: context.state.effects.map((effect) => created.includes(effect.id)
        ? { ...effect, concentrationOwner: command.actor }
        : effect),
    };
  }
  if (appliedTargets > 0) return 'applied';
  return refusedTargets > 0 ? 'refused' : 'no_op';
}

function resolvedPersistentAreaSpellEffect(
  definition: SpellDefinition,
  command: SpellCastCommand,
  spec: SpellPersistentAreaEffectSpec,
): PersistentAreaEffectSpec {
  const payload = spec.payload.kind === 'damage'
    ? {
        kind: 'damage' as const,
        damage: {
          terms: [{
            type: spec.payload.damageType,
            dice: scaledDiceExpression(definition, spec.payload.dice, command),
          }],
          critical: false,
          responses: [],
        },
      }
    : {
        kind: 'effect' as const,
        payload: structuredClone(spec.payload.payload),
        lifetime: structuredClone(spec.payload.lifetime),
      };
  return spec.kind === 'automatic'
    ? { kind: 'automatic', payload }
    : {
        kind: 'save_gated',
        ability: spec.ability,
        dc: command.saveDc,
        rollMode: spec.rollMode,
        onSuccess: spec.onSuccess,
        payload,
      };
}

function processSpellCast(context: ReductionContext, command: SpellCastCommand): void {
  const definition = spellDefinition(command.spellId) ??
    importedSpellDefinition(context.state.contentPacks, command.spellId);
  if (definition === null) throw new EncounterRuleError(`Spell ${command.spellId} is not implemented.`);
  const targets = selectedSpellTargets(context.state, definition, command);
  spendSpellCastingCost(context, definition, command);
  spendSpellSlot(context, definition, command);
  emit(context, { type: 'spell_cast', caster: command.actor, spellId: definition.id, slotLevel: command.slotLevel, targets });

  executeSpellOperation(context, definition, command, targets, definition.operation);
}

export type SpellOperationOutcome = 'applied' | 'refused' | 'no_op';

function combinedSpellOperationOutcome(outcomes: readonly SpellOperationOutcome[]): SpellOperationOutcome {
  if (outcomes.includes('refused')) return 'refused';
  return outcomes.includes('applied') ? 'applied' : 'no_op';
}

function continuedCompositionOutcome(outcomes: readonly SpellOperationOutcome[]): SpellOperationOutcome {
  if (outcomes.includes('applied')) return 'applied';
  return outcomes.includes('refused') ? 'refused' : 'no_op';
}

function compositionTargets(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  inherited: readonly CombatantId[],
  resolution: CompositionStep['targetResolution'],
): readonly CombatantId[] {
  if (resolution.kind === 'inherit') return inherited;
  switch (resolution.selector.kind) {
    case 'caster':
      return [command.actor];
    case 'enclosing_area':
      return areaTargets(context.state, definition, command);
  }
}

function compositionOrder(operation: Extract<SpellOperation, { readonly kind: 'composition' }>): readonly number[] {
  if (operation.ordering === 'declaration_order') return [0, 1];
  return operation.order;
}

interface CompositionStepResolution {
  readonly outcome: SpellOperationOutcome;
  readonly refusalReason: 'operation_refused' | 'encounter_rule_refusal' | null;
}

function executeCompositionStep(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  inheritedTargets: readonly CombatantId[],
  step: CompositionStep,
): CompositionStepResolution {
  const stateBefore = context.state;
  const eventCountBefore = context.events.length;
  const rngCheckpoint = context.rng.checkpoint();
  try {
    const targets = compositionTargets(context, definition, command, inheritedTargets, step.targetResolution);
    const outcome = executeSpellOperation(context, definition, { ...command, targets }, targets, step.operation);
    if (outcome !== 'refused') return { outcome, refusalReason: null };
  } catch (error) {
    if (!(error instanceof EncounterRuleError)) throw error;
    context.state = stateBefore;
    context.events.splice(eventCountBefore);
    context.rng.restoreCheckpoint(rngCheckpoint);
    return { outcome: 'refused', refusalReason: 'encounter_rule_refusal' };
  }
  context.state = stateBefore;
  context.events.splice(eventCountBefore);
  context.rng.restoreCheckpoint(rngCheckpoint);
  return { outcome: 'refused', refusalReason: 'operation_refused' };
}

function sharedOutcomeDamageAmount(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  target: CombatantId,
  operation: Extract<BranchSpellOperation, { readonly kind: 'damage_operation' }>,
  critical: boolean,
  transform: 'full' | SharedOutcomeDamageReferenceOperation['transform'],
): SpellOperationOutcome {
  const instance = preparedDamageOperationInstances(
    context.state,
    target,
    operation,
    { definition, command },
  )[0];
  const packet = operation.packets[0];
  if (
    instance === undefined ||
    packet === undefined ||
    operation.delivery.kind !== 'automatic' ||
    operation.timing.kind !== 'immediate' ||
    operation.instancesPerTarget !== 1 ||
    operation.packets.length !== 1 ||
    packet.thresholdRider !== null
  ) {
    throw new EncounterRuleError('A shared outcome damage reference requires one immediate automatic damage packet without a threshold rider.');
  }
  const rolled = resolveDamage({ ...instance.damage, critical, responses: [] }, context.rng);
  const rawAmount = transform === 'half_round_down' ? Math.floor(rolled.total / 2) : rolled.total;
  applySpellDamageAmount(
    context,
    command.actor,
    target,
    operationDamageType(packet),
    packet.dice.sides,
    rawAmount,
  );
  return rawAmount === 0 ? 'no_op' : 'applied';
}

function executeSharedOutcomeBranch(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  target: CombatantId,
  branch: readonly (BranchSpellOperation | SharedOutcomeDamageReferenceOperation)[],
  failureBranch: readonly BranchSpellOperation[],
  critical: boolean,
): SpellOperationOutcome {
  const outcomes: SpellOperationOutcome[] = [];
  for (const operation of branch) {
    if (operation.kind === 'shared_outcome_damage_reference') {
      const referenced = failureBranch[operation.source.operationIndex];
      if (referenced?.kind !== 'damage_operation') {
        throw new EncounterRuleError('A shared outcome damage reference did not identify failure-branch damage.');
      }
      outcomes.push(sharedOutcomeDamageAmount(
        context, definition, command, target, referenced, false, operation.transform,
      ));
      continue;
    }
    if (
      critical &&
      operation.kind === 'damage_operation' &&
      operation.delivery.kind === 'automatic' &&
      operation.timing.kind === 'immediate' &&
      operation.instancesPerTarget === 1 &&
      operation.packets.length === 1 &&
      operation.packets[0]?.thresholdRider === null
    ) {
      outcomes.push(sharedOutcomeDamageAmount(
        context, definition, command, target, operation, critical, 'full',
      ));
      continue;
    }
    outcomes.push(executeSpellOperation(
      context, definition, { ...command, targets: [target] }, [target], operation,
    ));
  }
  return combinedSpellOperationOutcome(outcomes);
}

function executeSharedOutcome(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  targets: readonly CombatantId[],
  operation: SharedOutcomeOperation,
): SpellOperationOutcome {
  const outcomes: SpellOperationOutcome[] = [];
  for (const target of targets) {
    if ('onHit' in operation) {
      const attack = rollSpellAttack(context, command, target);
      emit(context, { type: 'attack_resolved', actor: command.actor, target, attack, damage: null });
      const branch = attack.outcome === 'miss' ? 'miss' : 'hit';
      emit(context, {
        type: 'shared_outcome_resolved', caster: command.actor, spellId: definition.id,
        target, delivery: 'attack', branch,
      });
      const selected = branch === 'hit' ? operation.onHit : operation.onMiss;
      outcomes.push(executeSharedOutcomeBranch(
        context, definition, command, target, selected, [], attack.outcome === 'critical',
      ));
      continue;
    }
    const save = resolveTargetSave(
      context, command.actor, target, operation.delivery.ability,
      command.saveDc, operation.delivery.rollMode, null,
    );
    const branch = save.outcome === 'failure' ? 'failure' : 'success';
    emit(context, {
      type: 'shared_outcome_resolved', caster: command.actor, spellId: definition.id,
      target, delivery: 'save', branch,
    });
    const selected = branch === 'failure' ? operation.onFailure : operation.onSuccess;
    outcomes.push(executeSharedOutcomeBranch(
      context, definition, command, target, selected, operation.onFailure, false,
    ));
  }
  return targets.length === 0 ? 'no_op' : combinedSpellOperationOutcome(outcomes) === 'refused' ? 'refused' : 'applied';
}

function executeSpellOperation(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  targets: readonly CombatantId[],
  operation: SpellOperation,
): SpellOperationOutcome {
  switch (operation.kind) {
    case 'composition': {
      const compositionState = context.state;
      const compositionEventCount = context.events.length;
      const compositionRngCheckpoint = context.rng.checkpoint();
      const outcomes: SpellOperationOutcome[] = [];
      for (const stepIndex of compositionOrder(operation)) {
        const step = operation.steps[stepIndex];
        if (step === undefined) throw new EncounterRuleError('A composition order referenced a missing step.');
        const resolution = executeCompositionStep(context, definition, command, targets, step);
        outcomes.push(resolution.outcome);
        if (resolution.outcome !== 'refused') {
          emit(context, {
            type: 'composition_step_resolved', caster: command.actor, spellId: definition.id,
            stepIndex, outcome: resolution.outcome, propagation: operation.onRefusal,
          });
          continue;
        }
        if (operation.onRefusal === 'abort') {
          context.state = compositionState;
          context.events.splice(compositionEventCount);
          context.rng.restoreCheckpoint(compositionRngCheckpoint);
        }
        emit(context, {
          type: 'composition_step_resolved', caster: command.actor, spellId: definition.id,
          stepIndex, outcome: 'refused', propagation: operation.onRefusal,
          reason: resolution.refusalReason as 'operation_refused' | 'encounter_rule_refusal',
        });
        if (operation.onRefusal === 'abort') return 'refused';
      }
      return operation.onRefusal === 'continue'
        ? continuedCompositionOutcome(outcomes)
        : combinedSpellOperationOutcome(outcomes);
    }
    case 'shared_outcome':
      return executeSharedOutcome(context, definition, command, targets, operation);
    case 'caster_choice': {
      const mode = operation.modes.find((candidate) => candidate.mode === command.selectedOption);
      if (mode === undefined) {
        throw new EncounterRuleError(`${definition.name} requires one of its declared caster modes.`);
      }
      return executeSpellOperation(context, definition, command, targets, mode.operation);
    }
    case 'random_branch': {
      const covered = new Set<number>();
      for (const branch of operation.branches) {
        if (
          !Number.isSafeInteger(branch.minimum) ||
          !Number.isSafeInteger(branch.maximum) ||
          branch.minimum < 1 ||
          branch.maximum > operation.dieSides ||
          branch.minimum > branch.maximum
        ) throw new EncounterRuleError(`${definition.name} has an invalid random-branch range.`);
        for (let face = branch.minimum; face <= branch.maximum; face += 1) {
          if (covered.has(face)) throw new EncounterRuleError(`${definition.name} has overlapping random-branch ranges.`);
          covered.add(face);
        }
      }
      if (covered.size !== operation.dieSides) {
        throw new EncounterRuleError(`${definition.name} has a gap in its random-branch table.`);
      }
      const subjects = targets.length === 0 ? [command.actor] : targets;
      const outcomes: SpellOperationOutcome[] = [];
      for (const target of subjects) {
        const rolled = rollDie(context.rng, dieSides(operation.dieSides));
        const branch = operation.branches.find((candidate) =>
          rolled >= candidate.minimum && rolled <= candidate.maximum);
        if (branch === undefined) throw new EncounterRuleError(`${definition.name} has no branch for roll ${String(rolled)}.`);
        outcomes.push(executeSpellOperation(context, definition, { ...command, targets: [target] }, [target], branch.operation));
      }
      return combinedSpellOperationOutcome(outcomes);
    }
    case 'target_branch': {
      const outcomes: SpellOperationOutcome[] = [];
      for (const target of targets) {
        const subject = combatant(context.state, target);
        const branch = operation.branches.find((candidate) => {
          switch (candidate.predicate.kind) {
            case 'creature_type':
              return subject.profile.rules.creatureType === candidate.predicate.creatureType;
          }
        });
        const selected = branch?.operation ?? operation.otherwise;
        if (selected !== null) {
          outcomes.push(executeSpellOperation(context, definition, { ...command, targets: [target] }, [target], selected));
        }
      }
      return combinedSpellOperationOutcome(outcomes);
    }
    case 'reevaluated_branch': {
      const current = context.state.reevaluatedBranches ?? [];
      let sequence = current.reduce((maximum, candidate) => Math.max(maximum, candidate.sequence), 0) + 1;
      const scheduled = targets.map((target) => ({
        sequence: sequence++, spellId: definition.id,
        command: structuredClone({ ...command, targets: [target] }), target,
        hook: operation.hook, remaining: operation.durationRounds,
        operation: structuredClone(operation.operation),
      }));
      context.state = { ...context.state, reevaluatedBranches: [...current, ...scheduled] };
      return scheduled.length === 0 ? 'no_op' : 'applied';
    }
    case 'condition_lifecycle':
      return applyConditionLifecycleOperation(context, definition, command, targets, operation);
    case 'roll_dice_modifier': {
      const payload: EffectPayload = operation.application === 'chosen_skill_checks'
        ? {
            kind: 'ability_check_modifier', count: operation.die.count, sides: operation.die.sides,
            sign: operation.sign,
            skill: selectedModifierSkill(definition, command, operation.skill),
            application: operation.application,
          }
        : operation.tests.length === 2
          ? {
              kind: 'd20_test_modifier', tests: operation.tests, count: operation.die.count,
              sides: operation.die.sides, sign: operation.sign, application: operation.application,
            }
          : operation.tests[0] === 'attack_roll'
            ? {
                kind: 'attack_roll_modifier', count: operation.die.count, sides: operation.die.sides,
                sign: operation.sign, application: operation.application,
              }
            : {
                kind: 'saving_throw_modifier', count: operation.die.count, sides: operation.die.sides,
                sign: operation.sign, application: operation.application,
              };
      applySpellEffect(context, definition, command, modifierEffectData(payload, operation.duration), targets);
      return 'applied';
    }
    case 'damage_dice_reduction':
      applySpellEffect(context, definition, command, modifierEffectData({
        kind: 'damage_reduction', damageType: selectedModifierDamageType(definition, command, operation.damageType),
        count: operation.die.count, sides: operation.die.sides, oncePerTurn: true,
      }, operation.duration), targets);
      return 'applied';
    case 'roll_mode_modifier': {
      const appliesTo = operation.roll === 'attack_roll'
        ? operation.scope.kind === 'attacks_against_target'
          ? { kind: 'attacks_against_target' as const }
          : { kind: 'all_attacks_by_target' as const }
        : operation.roll === 'saving_throw'
          ? { kind: 'saving_throws_by_target' as const }
          : { kind: 'ability_checks_by_target' as const };
      applySpellEffect(context, definition, command, modifierEffectData({
        kind: 'attack_roll_mode_modifier', mode: operation.mode, appliesTo,
      }, operation.duration), targets);
      return 'applied';
    }
    case 'armor_class_modifier':
      applySpellEffect(context, definition, command, modifierEffectData(
        operation.modification.kind === 'bonus'
          ? { kind: 'armor_class_modifier', amount: operation.modification.amount }
          : { kind: 'armor_class_modifier', minimum: operation.modification.minimum },
        operation.duration,
      ), targets);
      return 'applied';
    case 'damage_response_modifier':
      applySpellEffect(context, definition, command, modifierEffectData({
        kind: 'damage_resistances',
        damageTypes: [selectedModifierDamageType(definition, command, operation.damageType)],
        response: operation.response,
      }, operation.duration), targets);
      return 'applied';
    case 'targeted_defense_modifier': {
      if (command.modifierSource === undefined) {
        throw new EncounterRuleError(`${definition.name} requires a selected attacker for its targeted defense.`);
      }
      combatant(context.state, command.modifierSource);
      applySpellEffect(context, definition, command, modifierEffectData({
        kind: 'armor_class_modifier', amount: operation.armorClassBonus,
        againstAttacker: command.modifierSource,
      }, operation.duration), targets);
      return 'applied';
    }
    case 'heat_metal':
      return executeHeatMetal(context, definition, command, operation);
    case 'sustained_effect': {
      if (operation.establishment?.kind === 'sustained_effect' || operation.sequence.operation.kind === 'sustained_effect') {
        throw new EncounterRuleError(`${definition.name} cannot nest a sustained effect.`);
      }
      const objectIdsBefore = new Set(context.state.worldObjects.map((object) => object.id));
      const areaIdsBefore = new Set(context.state.persistentAreas.map((area) => area.id));
      if (operation.establishment !== null) {
        executeSpellOperation(context, definition, command, targets, operation.establishment);
      }
      const createdObjects = context.state.worldObjects
        .filter((object) => !objectIdsBefore.has(object.id))
        .map((object) => object.id);
      const createdAreas = context.state.persistentAreas
        .filter((area) => !areaIdsBefore.has(area.id))
        .map((area) => area.id);
      let targetBinding: Extract<EffectPayload, { readonly kind: 'sustained_effect' }>['targetBinding'];
      let boundCombatants: readonly CombatantId[] = [];
      let boundObjects: readonly ObjectTargetId[] = [];
      switch (operation.sequence.kind) {
        case 'activation':
          targetBinding = operation.sequence.targetBinding.kind === 'reselect'
            ? 'reselect'
            : operation.sequence.targetBinding.to === 'cast_combatant_targets'
              ? 'bound_combatants'
              : operation.sequence.targetBinding.to === 'cast_object_targets'
                ? 'bound_objects'
                : 'bound_owned_objects';
          boundCombatants = targetBinding === 'bound_combatants' ? targets : [];
          boundObjects = targetBinding === 'bound_objects' ? command.objectTargets ?? [] : [];
          if (
            (targetBinding === 'bound_combatants' && boundCombatants.length === 0) ||
            (targetBinding === 'bound_objects' && boundObjects.length === 0) ||
            (targetBinding === 'bound_owned_objects' && createdObjects.length === 0)
          ) throw new EncounterRuleError(`${definition.name} did not establish its declared bound target.`);
          break;
        case 'automatic_tick':
          if (targets.length === 0) throw new EncounterRuleError(`${definition.name} automatic ticks require cast targets.`);
          if (operation.lifecycle.durationRounds !== operation.sequence.ticks) {
            throw new EncounterRuleError(`${definition.name} automatic tick duration must equal its tick count.`);
          }
          targetBinding = 'bound_combatants';
          boundCombatants = targets;
          break;
        case 'event_trigger':
          if (createdAreas.length !== 1) throw new EncounterRuleError(`${definition.name} must establish exactly one event-owned area.`);
          targetBinding = 'reselect';
          break;
        case 'delayed_one_shot':
          if (targets.length === 0) throw new EncounterRuleError(`${definition.name} delayed one-shot requires cast targets.`);
          if (operation.lifecycle.durationRounds !== null) {
            throw new EncounterRuleError(`${definition.name} delayed one-shot cannot also declare a duration clock.`);
          }
          targetBinding = 'bound_combatants';
          boundCombatants = targets;
          break;
        case 'instance_group_activation':
          if (createdObjects.length !== operation.sequence.instanceCount) {
            throw new EncounterRuleError(`${definition.name} must establish exactly ${String(operation.sequence.instanceCount)} owned instances.`);
          }
          targetBinding = 'bound_owned_objects';
          break;
      }
      applyEffect(context, command.actor, {
        targets: [command.actor],
        duration: operation.sequence.kind === 'delayed_one_shot' || operation.lifecycle.durationRounds === null
          ? { kind: 'permanent' }
          : {
              kind: 'turn_boundaries',
              timing: {
                combatant: command.actor,
                boundary: operation.lifecycle.expiresAt === 'source_start' ? 'start' : 'end',
                source: definition.source,
              },
              remaining: operation.lifecycle.durationRounds,
            },
        concentration: operation.lifecycle.concentration,
        stackingIdentity: effectStackingIdentity(`sustained:${definition.id}`),
        stacking: 'replace_same_source',
        repeatedSave: null,
        payload: {
          kind: 'sustained_effect',
          spellId: definition.id,
          establishedRound: context.state.round,
          sequenceKind: operation.sequence.kind,
          targetBinding,
          boundCombatants: [...boundCombatants],
          boundObjects: [...boundObjects],
          ownedObjects: [...createdObjects],
          ownedAreas: [...createdAreas],
          consumedEventTurnKeys: [],
          delayedRoundsRemaining: operation.sequence.kind === 'delayed_one_shot'
            ? operation.sequence.delayRounds
            : null,
          slotLevel: command.slotLevel,
          casterLevel: command.casterLevel,
          attackBonus: command.attackBonus,
          saveDc: command.saveDc,
          spellcastingModifier: command.spellcastingModifier,
          area: command.area === null ? null : structuredClone(command.area),
          selectedOption: command.selectedOption,
        },
      });
      return 'applied';
    }
    case 'damage_operation':
      return applyDamageOperation(
        context,
        command.actor,
        targets,
        operation,
        command.saveDc,
        `spell:${definition.id}:${String(context.state.revision)}`,
        { definition, command },
      );
    case 'armed_weapon_hit_rider': {
      const packet = operation.damage;
      if (packet !== null && (packet.scaling.kind !== 'none' || packet.thresholdRider !== null)) {
        throw new EncounterRuleError('An armed weapon-hit rider cannot defer target scaling or a damage-threshold rider.');
      }
      const damage: DamageRequest = {
        terms: packet === null
          ? []
          : [{
              type: operationDamageType(packet),
              dice: operationDiceExpression(
                context.state,
                command.actor,
                packet.dice,
                packet.scaling,
                { definition, command },
              ),
            }],
        critical: false,
        responses: [],
      };
      const followUp = operation.saveGatedRider === null
        ? undefined
        : {
            kind: 'save_then_condition' as const,
            saveAbility: operation.saveGatedRider.ability,
            saveDc: command.saveDc,
            rollMode: operation.saveGatedRider.rollMode,
            condition: operation.saveGatedRider.condition,
            expiresAt: operation.saveGatedRider.expiresAt,
            durationRounds: operation.saveGatedRider.durationRounds,
          };
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'damage_rider',
          damage,
          appliesTo: 'weapon_attack_by_target',
          consumeOnHit: operation.persistence === 'consume_on_hit',
          ...(followUp === undefined ? {} : { followUp }),
        },
        target: 'self',
        concentration: operation.concentration,
        durationRounds: operation.durationRounds,
        expiresAt: 'source_start',
      }, [command.actor]);
      return 'applied';
    }
    case 'persistent_area': {
      const selected = [...new Set([
        ...(operation.includeOwner ? [command.actor] : []),
        ...targets,
      ])].sort((left, right) => String(left).localeCompare(String(right)));
      const targetFilter = operation.targetFilter === 'selected'
        ? { kind: 'selected' as const, combatants: selected }
        : { kind: operation.targetFilter };
      if (operation.origin === 'selected_when_cast' && command.area === null) {
        throw new EncounterRuleError(`${definition.name} requires an area placement.`);
      }
      if (operation.origin === 'anchored_to_caster' && operation.shape === null) {
        throw new EncounterRuleError(`${definition.name} requires an anchored area shape.`);
      }
      const input: PersistentAreaInput = {
        owner: command.actor,
        origin: operation.origin === 'selected_when_cast'
          ? fixedOrigin(command.area as AreaTemplate)
          : { kind: 'anchored', combatant: command.actor },
        shape: operation.origin === 'selected_when_cast'
          ? feetShape(command.area as AreaTemplate)
          : structuredClone(operation.shape as NonNullable<typeof operation.shape>),
        duration: {
          kind: operation.concentration ? 'concentration' : 'rounds',
          remaining: operation.durationRounds,
        },
        targetFilter,
        difficultTerrain: operation.difficultTerrain,
        hooks: operation.hooks.map((hook) => ({
          hook: hook.hook,
          frequency: hook.frequency,
          effect: resolvedPersistentAreaSpellEffect(definition, command, hook.effect),
        })),
        movable: operation.movableFeet === null ? null : { maximumFeet: feet(operation.movableFeet) },
      };
      const areaId = createPersistentArea(context, command.actor, input);
      for (const initial of operation.initialEffects) {
        const area = context.state.persistentAreas.find((candidate) => candidate.id === areaId);
        if (area === undefined) break;
        for (const target of selected.filter((candidate) => !initial.excludeOwner || candidate !== command.actor)) {
          applyPersistentAreaEffect(
            context,
            area,
            'on_enter',
            target,
            resolvedPersistentAreaSpellEffect(definition, command, initial.effect),
            operation.hooks.length,
          );
        }
      }
      return 'applied';
    }
    case 'world_operations': {
      const areaCells = (): readonly GridCell[] => {
        if (command.area === null) {
          throw new EncounterRuleError(`${definition.name} requires an area placement for its environment operation.`);
        }
        return affectedCells(
          { bounds: context.state.bounds, blockedCells: templateBlockedCells(context.state) },
          command.area,
        );
      };
      for (const declared of operation.operations) {
        switch (declared.kind) {
          case 'create_object': {
            const position = declared.placement === 'caster_cell'
              ? token(context.state, command.actor).position
              : (() => {
                  if (command.area === null) {
                    throw new EncounterRuleError(`${definition.name} requires an object placement area.`);
                  }
                  const origin = fixedOrigin(command.area);
                  if (origin.kind !== 'fixed') throw new EncounterRuleError('Object placement did not resolve to a fixed point.');
                  return { column: Math.floor(origin.point.x / 5), row: Math.floor(origin.point.y / 5) };
                })();
            let sequence = context.state.nextWorldObjectSequence;
            let id = worldObjectId(`object:${String(sequence)}`);
            while (context.state.worldObjects.some((object) => object.id === id)) {
              sequence += 1;
              id = worldObjectId(`object:${String(sequence)}`);
            }
            const footprint = declared.footprintOffsets.map((offset) => ({
              column: position.column + offset.column,
              row: position.row + offset.row,
            }));
            processWorldOperation(context, command.actor, {
              kind: 'create_object',
              object: {
                ...structuredClone(declared.object),
                id,
                position,
                footprint,
              },
            });
            context.state = { ...context.state, nextWorldObjectSequence: sequence + 1 };
            break;
          }
          case 'transform_terrain':
            processWorldOperation(context, command.actor, {
              kind: 'transform_terrain',
              region: { id: declared.regionId, cells: areaCells() },
              difficultTerrain: declared.difficultTerrain,
            });
            break;
          case 'set_light_level':
            processWorldOperation(context, command.actor, {
              kind: 'set_light_level',
              region: { id: declared.regionId, cells: areaCells() },
              level: declared.level,
            });
            break;
          case 'set_obscurement':
            processWorldOperation(context, command.actor, {
              kind: 'set_obscurement',
              region: { id: declared.regionId, cells: areaCells() },
              obscurement: declared.obscurement,
            });
            break;
          case 'remove_objects': {
            const objectTargets = command.objectTargets ?? [];
            if (objectTargets.length === 0) {
              throw new EncounterRuleError(`${definition.name} requires at least one world-object target.`);
            }
            for (const objectId of objectTargets) {
              processWorldOperation(context, command.actor, {
                kind: 'remove_object', objectId: objectId as WorldObjectId, reason: declared.reason,
              });
            }
            break;
          }
          case 'modify_objects': {
            const objectTargets = command.objectTargets ?? [];
            if (objectTargets.length === 0) {
              throw new EncounterRuleError(`${definition.name} requires at least one world-object target.`);
            }
            for (const objectId of objectTargets) {
              processWorldOperation(context, command.actor, {
                kind: 'modify_object', objectId: objectId as WorldObjectId, changes: structuredClone(declared.changes),
              });
            }
            break;
          }
          case 'move_owned_object': {
            if (
              definition.operation.kind !== 'sustained_effect' ||
              definition.operation.sequence.kind !== 'activation'
            ) {
              throw new EncounterRuleError('Owned world-object movement is only available to a sustained effect activation.');
            }
            const objectTargets = command.ownedObjectTargets ?? [];
            if (objectTargets.length !== 1 || command.spatialPoint === undefined) {
              throw new EncounterRuleError(`${definition.name} requires one owned object and one destination.`);
            }
            const objectId = objectTargets[0] as WorldObjectId;
            const existing = worldObject(context.state, objectId);
            const destination = command.spatialPoint;
            if (
              !isCellInside(context.state.bounds, destination) ||
              gridDistance(existing.position, destination) > declared.maximumDistanceFeet
            ) {
              throw new EncounterRuleError(`${definition.name} object destination is outside its declared movement range.`);
            }
            const columnDelta = destination.column - existing.position.column;
            const rowDelta = destination.row - existing.position.row;
            processWorldOperation(context, command.actor, {
              kind: 'modify_object',
              objectId,
              changes: {
                position: { ...destination },
                footprint: existing.footprint.map((cell) => ({
                  column: cell.column + columnDelta,
                  row: cell.row + rowDelta,
                })),
              },
            });
            break;
          }
          case 'move_owned_object_group': {
            if (
              definition.operation.kind !== 'sustained_effect' ||
              definition.operation.sequence.kind !== 'instance_group_activation'
            ) {
              throw new EncounterRuleError('Owned world-object group movement is only available to a sustained effect activation.');
            }
            const objectTargets = command.ownedObjectTargets ?? [];
            const destinations = command.ownedObjectDestinations ?? [];
            if (
              destinations.length !== objectTargets.length ||
              !sameIdentitySet(destinations.map((entry) => entry.objectId), objectTargets)
            ) {
              throw new EncounterRuleError(`${definition.name} requires one destination for every owned instance.`);
            }
            const moves = [...destinations]
              .sort((left, right) => String(left.objectId).localeCompare(String(right.objectId)))
              .map((entry) => {
                const existing = worldObject(context.state, entry.objectId);
                if (
                  !isCellInside(context.state.bounds, entry.destination) ||
                  gridDistance(existing.position, entry.destination) > declared.maximumDistanceFeet
                ) {
                  throw new EncounterRuleError(`${definition.name} group destination is outside its declared movement range.`);
                }
                const columnDelta = entry.destination.column - existing.position.column;
                const rowDelta = entry.destination.row - existing.position.row;
                return {
                  objectId: entry.objectId,
                  destination: entry.destination,
                  footprint: existing.footprint.map((cell) => ({
                    column: cell.column + columnDelta,
                    row: cell.row + rowDelta,
                  })),
                };
              });
            for (const move of moves) {
              processWorldOperation(context, command.actor, {
                kind: 'modify_object', objectId: move.objectId,
                changes: { position: { ...move.destination }, footprint: move.footprint },
              });
            }
            break;
          }
          case 'damage_objects': {
            const objectTargets = command.objectTargets ?? [];
            if (objectTargets.length === 0) {
              throw new EncounterRuleError(`${definition.name} requires at least one world-object target.`);
            }
            for (const objectId of objectTargets) {
              processWorldOperation(context, command.actor, {
                kind: 'damage_object', objectId: objectId as WorldObjectId, delivery: { kind: 'area_effect' },
                damage: structuredClone(declared.damage),
              });
            }
            break;
          }
        }
      }
      return 'applied';
    }
    case 'teleport': {
      const movers = operation.subject === 'caster' ? [command.actor] : targets;
      const casterPosition = token(context.state, command.actor).position;
      const declaredDestinations = command.targetDestinations;
      const destinations = declaredDestinations === undefined
        ? command.spatialPoint === undefined ? [] : movers.map((mover) => ({ target: mover, destination: command.spatialPoint as GridCell }))
        : declaredDestinations;
      if (destinations.length !== movers.length) throw new EncounterRuleError(`${definition.name} requires one destination per teleported creature.`);
      for (const [index, mover] of movers.entries()) {
        const declared = destinations[index];
        if (declared === undefined || declared.target !== mover) {
          throw new TargetSelectionRuleError('each_target_own_destination', `${definition.name} violates each_target_own_destination.`);
        }
        const destination = declared.destination;
        const occupied = context.state.tokens.some((placed) =>
          placed.combatantId !== mover && combatant(context.state, placed.combatantId).life !== 'dead' &&
          cellKey(placed.position) === cellKey(destination));
        if (
          !isCellInside(context.state.bounds, destination) ||
          gridDistance(casterPosition, destination) > operation.maximumDistanceFeet ||
          movementBlocked(context.state, destination) ||
          occupied ||
          (operation.destination.requireLineOfSight && !hasLineOfSight(context.state, casterPosition, destination))
        ) throw new EncounterRuleError(`${definition.name} requires an unoccupied, occupiable destination satisfying its declared constraint.`);
        context.state = {
          ...context.state,
          tokens: context.state.tokens.map((placed) => placed.combatantId === mover
            ? { ...placed, position: { ...destination } }
            : placed),
        };
        const movement = combatant(context.state, mover).turn.movement;
        emit(context, { type: 'movement_completed', combatant: mover, path: [{ ...destination }], spent: feet(0), remaining: movement.remaining });
      }
      // Teleport has no intervening cells; only final area membership changes.
      reevaluatePersistentAreaMembership(context);
      return 'applied';
    }
    case 'forced_movement': {
      const origin = operation.origin === 'caster'
        ? token(context.state, command.actor).position
        : command.spatialPoint;
      if (origin === undefined) throw new EncounterRuleError(`${definition.name} requires a forced-movement origin point.`);
      for (const target of targets) {
        if (operation.save !== null) {
          const save = resolveTargetSave(
            context, command.actor, target, operation.save.ability, command.saveDc, operation.save.rollMode, null,
          );
          if (save.outcome !== operation.save.moveOn) continue;
        }
        forceMove(context, origin, command.actor, target, operation.distanceFeet, operation.direction);
      }
      return 'applied';
    }
    case 'movement_mode': {
      const before = new Map(targets.map((target) => [target, effectiveSpeed(context.state, target)] as const));
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'movement_modifier', speedChange: { kind: 'increase', feet: 0 },
          modeGrants: operation.grants, difficultTerrainImmunity: operation.difficultTerrainImmunity,
          magicalSpeedReductionImmunity: operation.magicalSpeedReductionImmunity,
        },
        target: 'targets', concentration: operation.concentration, durationRounds: operation.durationRounds,
        expiresAt: operation.expiresAt,
      }, targets);
      for (const target of targets) {
        const subject = combatant(context.state, target);
        const nextSpeed = feet(effectiveSpeed(context.state, target));
        const prior = before.get(target) ?? nextSpeed;
        context.state = replaceCombatant(context.state, {
          ...subject,
          turn: {
            ...subject.turn,
            movement: {
              speed: nextSpeed,
              spent: subject.turn.movement.spent,
              remaining: feet(Math.max(0, subject.turn.movement.remaining + nextSpeed - prior)),
            },
          },
        });
      }
      return 'applied';
    }
    case 'movement_region': {
      assertEnvironmentRegion(context.state.bounds, operation.region);
      const movementRegions = (context.state.environment.movementRegions ?? [])
        .filter((region) => region.id !== operation.region.id);
      const difficultTerrainRegions = context.state.environment.difficultTerrainRegions
        .filter((region) => region.id !== operation.region.id);
      context.state = {
        ...context.state,
        environment: {
          ...context.state.environment,
          movementRegions: [...movementRegions, {
            ...structuredClone(operation.region), source: command.actor,
            entry: operation.entry, damage: structuredClone(operation.damage),
          }],
          difficultTerrainRegions: operation.difficultTerrain
            ? [...difficultTerrainRegions, structuredClone(operation.region)]
            : difficultTerrainRegions,
        },
      };
      return 'applied';
    }
    case 'speed_modification': {
      const before = new Map(targets.map((target) => [target, effectiveSpeed(context.state, target)] as const));
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'movement_modifier', speedChange: operation.modification, modeGrants: [],
          difficultTerrainImmunity: false, magicalSpeedReductionImmunity: false,
        },
        target: 'targets', concentration: operation.concentration, durationRounds: operation.durationRounds,
        expiresAt: operation.expiresAt,
      }, targets);
      for (const target of targets) {
        const subject = combatant(context.state, target);
        const nextSpeed = feet(effectiveSpeed(context.state, target));
        const prior = before.get(target) ?? nextSpeed;
        context.state = replaceCombatant(context.state, {
          ...subject,
          turn: {
            ...subject.turn,
            movement: {
              speed: nextSpeed,
              spent: subject.turn.movement.spent,
              remaining: feet(Math.max(0, subject.turn.movement.remaining + nextSpeed - prior)),
            },
          },
        });
      }
      return 'applied';
    }
    case 'attack_damage':
      for (const target of targets) {
        resolveSpellAttack(
          context,
          definition,
          command,
          target,
          operation.dice,
          selectedSpellDamageType(definition, command, operation.damageType),
          operation.rider,
        );
      }
      return 'applied';
    case 'attack_then_save_damage': {
      const primary = targets[0] as CombatantId;
      const burstTargets = placedAreaTargets(
        context.state,
        definition.name,
        definition.targeting.kind === 'single' ? definition.targeting.rangeFeet : 0,
        operation.burstShape,
        operation.burstRadiusFeet,
        command,
      );
      if (!burstTargets.includes(primary)) {
        throw new EncounterRuleError(`${definition.name} burst must include its primary target.`);
      }
      resolveSpellAttack(
        context,
        definition,
        command,
        primary,
        operation.attackDice,
        operation.attackDamageType,
        null,
      );
      const rolled = resolveDamage({
        terms: [{ type: operation.saveDamageType, dice: scaledSpellDamageExpression(context, definition, operation.saveDice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of burstTargets) {
        const save = resolveTargetSave(context, command.actor, target, operation.saveAbility, command.saveDc, 'normal', null);
        const rawAmount = save.outcome === 'failure'
          ? rolled.total
          : operation.onSaveSuccess === 'half' ? Math.floor(rolled.total / 2) : 0;
        applySpellDamageAmount(
          context, command.actor, target, operation.saveDamageType, operation.saveDice.sides, rawAmount,
        );
      }
      return 'applied';
    }
    case 'attack_damage_over_time': {
      const target = targets[0] as CombatantId;
      const attack = resolveSpellAttack(
        context,
        definition,
        command,
        target,
        operation.initialDice,
        operation.damageType,
        null,
      );
      if (attack.outcome === 'miss') {
        const rolled = rollDice(context.rng, scaledSpellDamageExpression(context, definition, operation.initialDice, command));
        applySpellDamageAmount(
          context, command.actor, target, operation.damageType, operation.initialDice.sides,
          Math.floor(rolled.total / 2),
        );
        return 'applied';
      }
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'ongoing_damage',
          damage: {
            terms: [{ type: operation.damageType, dice: scaledDiceExpression(definition, operation.laterDice, command) }],
            critical: false,
            responses: [],
          },
          timing: { combatant: target, boundary: 'end', source: definition.source },
        },
        target: 'targets',
        concentration: false,
        durationRounds: 1,
        expiresAt: 'target_end',
      }, [target]);
      return 'applied';
    }
    case 'hit_point_maximum_increase': {
      const slotDelta = (command.slotLevel as number) - definition.level;
      const amount = operation.baseAmount + operation.additionalPerSlot * slotDelta;
      applySpellEffect(context, definition, command, {
        payload: { kind: 'hit_point_maximum_modifier', amount },
        target: 'targets', concentration: false, durationRounds: 4800, expiresAt: 'source_start',
      }, targets);
      for (const target of targets) {
        const subject = combatant(context.state, target);
        context.state = replaceCombatant(context.state, { ...subject, hitPoints: subject.hitPoints + amount });
      }
      return 'applied';
    }
    case 'save_damage': {
      const roll = resolveDamage({
        terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const rawAmount = save.outcome === 'failure'
          ? roll.total
          : operation.onSuccess === 'half' ? Math.floor(roll.total / 2) : 0;
        applySpellDamageAmount(context, command.actor, target, operation.damageType, operation.dice.sides, rawAmount);
        if (save.outcome === 'failure' && operation.riderOnFailure !== null) {
          applySpellEffect(context, definition, command, operation.riderOnFailure, [target]);
        }
        if (save.outcome === 'failure' && operation.pushFeetOnFailure > 0) {
          forceMove(context, token(context.state, command.actor).position, command.actor, target, operation.pushFeetOnFailure, 'away');
        }
      }
      return 'applied';
    }
    case 'save_multi_damage': {
      const rolled = operation.terms.map((term) => ({
        type: term.damageType,
        sides: term.dice.sides,
        total: resolveDamage({
          terms: [{ type: term.damageType, dice: scaledSpellDamageExpression(context, definition, term.dice, command) }],
          critical: false,
          responses: [],
        }, context.rng).total,
      }));
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        for (const term of rolled) {
          const amount = save.outcome === 'failure'
            ? term.total
            : operation.onSuccess === 'half' ? Math.floor(term.total / 2) : 0;
          applySpellDamageAmount(context, command.actor, target, term.type, term.sides, amount);
        }
      }
      if (operation.effect !== null) applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return 'applied';
    }
    case 'save_damage_over_time': {
      const initial = resolveDamage({
        terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.initialDice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const amount = save.outcome === 'failure' ? initial.total : Math.floor(initial.total / 2);
        applySpellDamageAmount(context, command.actor, target, operation.damageType, operation.initialDice.sides, amount);
        if (save.outcome === 'failure') {
          applySpellEffect(context, definition, command, {
            payload: {
              kind: 'ongoing_damage',
              damage: {
                terms: [{ type: operation.damageType, dice: scaledDiceExpression(definition, operation.laterDice, command) }],
                critical: false,
                responses: [],
              },
              timing: { combatant: target, boundary: 'end', source: definition.source },
            },
            target: 'targets', concentration: false, durationRounds: 1, expiresAt: 'target_end',
          }, [target]);
        }
      }
      return 'applied';
    }
    case 'save_damage_and_effect': {
      const rolled = resolveDamage({
        terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const amount = save.outcome === 'failure'
          ? rolled.total
          : operation.onSuccess === 'half' ? Math.floor(rolled.total / 2) : 0;
        applySpellDamageAmount(context, command.actor, target, operation.damageType, operation.dice.sides, amount);
      }
      applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return 'applied';
    }
    case 'healing': {
      const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.dice, command));
      const amount = rolled.total + (operation.addSpellcastingModifier ? command.spellcastingModifier : 0);
      for (const target of targets) applyHealing(context, command.actor, target, Math.max(0, amount));
      return 'applied';
    }
    case 'fixed_healing': {
      const amount = operation.baseAmount + operation.additionalPerSlot *
        ((command.slotLevel as number) - definition.level);
      for (const target of targets) {
        applyHealing(context, command.actor, target, amount);
        removeSpellConditions(context, target, operation.removesConditions);
      }
      return 'applied';
    }
    case 'temporary_hit_points': {
      const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.dice, command));
      grantTemporaryHitPoints(context, command.actor, rolled.total);
      return 'applied';
    }
    case 'effect':
      applySpellEffect(context, definition, command, operation.effect, targets);
      return 'applied';
    case 'save_effect': {
      const eligible = operation.excludeCaster
        ? targets.filter((target) => target !== command.actor)
        : targets;
      const failed = operation.willingTargetSkipsSave === true && command.selectedOption === 'willing'
        ? eligible
        : eligible.filter((target) =>
          resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, operation.rollMode, null).outcome === 'failure');
      applySpellEffect(context, definition, command, operation.effect, failed);
      return 'applied';
    }
    case 'save_push': {
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        if (save.outcome === 'failure') {
          forceMove(context, token(context.state, command.actor).position, command.actor, target, operation.pushFeetOnFailure, 'away');
        }
      }
      applySpellEffect(context, definition, command, operation.effect, targets);
      return 'applied';
    }
    case 'remove_condition': {
      const selected = command.selectedOption;
      if (selected === null || !operation.conditions.includes(selected as 'Blinded' | 'Deafened' | 'Paralyzed' | 'Poisoned')) {
        throw new EncounterRuleError(`${definition.name} requires a removable condition selection.`);
      }
      for (const target of targets) removeSpellConditions(context, target, [selected]);
      return 'applied';
    }
    case 'remove_condition_and_effect':
      for (const target of targets) removeSpellConditions(context, target, [operation.condition]);
      applySpellEffect(context, definition, command, operation.effect, targets);
      return 'applied';
    case 'save_branch_effect':
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        applySpellEffect(
          context,
          definition,
          command,
          save.outcome === 'success' ? operation.successEffect : operation.failureEffect,
          [target],
        );
      }
      return 'applied';
    case 'reaction_save_cancel':
      for (const target of targets) {
        resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
      }
      return 'applied';
    case 'dispel_magic': {
      const automaticLevel = Math.max(operation.baseAutomaticLevel, command.slotLevel as number);
      const matching = context.state.effects.filter((candidate) => {
        if (!candidate.targets.some((target) => targets.includes(target))) return false;
        const identity = String(candidate.stackingIdentity);
        if (!identity.startsWith('spell:')) return false;
        const affectedId = identity.slice('spell:'.length);
        const affected = spellDefinition(affectedId) ??
          importedSpellDefinition(context.state.contentPacks, affectedId);
        return affected !== null && affected.level <= automaticLevel;
      });
      endEffects(context, new Set(matching.map((candidate) => candidate.id)), 'dispelled');
      return 'applied';
    }
    case 'remove_curse': {
      const matching = context.state.effects.filter((candidate) =>
        candidate.targets.some((target) => targets.includes(target)) && candidate.payload.kind === 'bestow_curse');
      endEffects(context, new Set(matching.map((candidate) => candidate.id)), 'dispelled');
      return 'applied';
    }
    case 'revive':
      for (const target of targets) {
        const subject = combatant(context.state, target);
        if (subject.life !== 'dead') throw new EncounterRuleError(`${definition.name} requires a dead creature.`);
        context.state = replaceCombatant(context.state, {
          ...subject, life: 'living', hitPoints: operation.hitPoints, deathSaves: null,
        });
      }
      return 'applied';
    case 'lifedrain_attack': {
      const target = targets[0] as CombatantId;
      const before = combatant(context.state, target).hitPoints;
      const attack = resolveSpellAttack(context, definition, command, target, operation.dice, operation.damageType, null);
      if (attack.outcome !== 'miss') {
        const dealt = before - combatant(context.state, target).hitPoints;
        applyHealing(context, command.actor, command.actor, Math.floor(dealt / operation.healingDivisor));
      }
      applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return 'applied';
    }
    case 'attack_rays':
      for (const target of targets) {
        resolveSpellAttack(context, definition, command, target, operation.dice, operation.damageType, null);
      }
      return 'applied';
    case 'attack_beams':
      for (const target of targets) {
        resolveSpellAttack(context, definition, command, target, operation.dice, operation.damageType, null);
      }
      return 'applied';
    case 'summoned_weapon_attack': {
      const target = targets[0] as CombatantId;
      const diceWithModifier = {
        ...operation.dice,
        modifier: operation.dice.modifier + command.spellcastingModifier,
      };
      resolveSpellAttack(context, definition, command, target, diceWithModifier, operation.damageType, null);
      applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return 'applied';
    }
    case 'magic_missiles':
      for (const target of targets) {
        const immune = context.state.effects.some((candidate) =>
          candidate.targets.includes(target) &&
          (candidate.payload.kind === 'magic_missile_immunity' || candidate.payload.kind === 'shield_defense'));
        if (immune) continue;
        const baseRequest: DamageRequest = {
          terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
          critical: false,
          responses: [],
        };
        const result = resolveTargetDamage(context, command.actor, target, baseRequest);
        applyDamage(context, command.actor, target, result.total);
        concentrationCheck(context, target, result.total);
      }
      return 'applied';
    case 'stabilize': {
      const target = combatant(context.state, targets[0] as CombatantId);
      if (target.hitPoints !== 0 || target.life === 'dead') throw new EncounterRuleError('Spare the Dying requires a living creature at 0 Hit Points.');
      context.state = replaceCombatant(context.state, { ...target, life: 'stable', deathSaves: null });
      return 'applied';
    }
    case 'weapon_attack_augmentation': {
      if (operation.timing === 'during_cast') {
        if (command.weaponAttack === null) throw new EncounterRuleError('True Strike requires a weapon attack profile.');
        if (command.selectedOption !== null && command.selectedOption !== 'Radiant') {
          throw new EncounterRuleError('True Strike damage must use the weapon type or Radiant.');
        }
        const target = targets[0] as CombatantId;
        const advantageEffects = context.state.effects.filter((effect) => {
          if (effect.payload.kind !== 'attack_roll_mode_modifier') return false;
          const appliesTo = effect.payload.appliesTo;
          return (effect.targets.includes(target) &&
            (appliesTo.kind === 'next_attack_against_target' || appliesTo.kind === 'attacks_against_target')) ||
            (effect.targets.includes(command.actor) && appliesTo.kind === 'all_attacks_by_target');
        });
        const attack = resolveAttackRoll({
          attackBonus: command.attackBonus +
            effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
          targetArmorClass: coverAdjustedArmorClass(context.state, command.actor, target),
          rollMode: combineRollModes(['normal', ...advantageEffects.map((effect) =>
            effect.payload.kind === 'attack_roll_mode_modifier' ? effect.payload.mode : 'normal')]),
          criticalFloor: 20,
        }, context.rng);
        endEffects(context, new Set(advantageEffects.flatMap((effect) =>
          effect.payload.kind === 'attack_roll_mode_modifier' &&
          effect.payload.appliesTo.kind === 'next_attack_against_target'
            ? [effect.id]
            : [])), 'duration_expired');
        let result: ReturnType<typeof resolveDamage> | null = null;
        if (attack.outcome !== 'miss') {
          const weaponDamageType = command.selectedOption === 'Radiant'
            ? operation.extraDamage.type
            : command.weaponAttack.damageType;
          result = resolveTargetDamage(context, command.actor, target, {
            terms: [
              {
                type: weaponDamageType,
                dice: {
                  count: command.weaponAttack.damageCount,
                  sides: dieSides(command.weaponAttack.damageSides),
                  modifier: command.spellcastingModifier,
                },
              },
              {
                type: operation.extraDamage.type,
                dice: scaledSpellDamageExpression(context, definition, operation.extraDamage.dice, command),
              },
            ],
            critical: attack.outcome === 'critical',
            responses: [],
          });
          applyDamage(context, command.actor, target, result.total, attack.outcome === 'critical');
        }
        emit(context, { type: 'attack_resolved', actor: command.actor, target, attack, damage: result });
        return 'applied';
      }
      const damage: DamageRequest = {
        terms: operation.extraDamage === null
          ? []
          : [{
              type: operation.extraDamage.type,
              dice: scaledDiceExpression(definition, operation.extraDamage.dice, command),
            }],
        critical: false,
        responses: [],
      };
      const followUp = operation.followUp === null
        ? undefined
        : operation.followUp.kind === 'ongoing_damage_save_ends'
          ? {
              kind: operation.followUp.kind,
              damage: {
                terms: [{
                  type: operation.followUp.damageType,
                  dice: scaledDiceExpression(definition, operation.followUp.dice, command),
                }],
                critical: false,
                responses: [],
              },
              saveAbility: operation.followUp.saveAbility,
              saveDc: command.saveDc,
              timing: 'start',
              durationRounds: operation.followUp.durationRounds,
            } as const
          : {
              kind: operation.followUp.kind,
              saveAbility: operation.followUp.saveAbility,
              saveDc: command.saveDc,
              rollMode: operation.followUp.rollMode,
              damage: {
                terms: [{
                  type: operation.followUp.damageType,
                  dice: scaledDiceExpression(definition, operation.followUp.dice, command),
                }],
                critical: false,
                responses: [],
              },
              timing: 'start',
              durationRounds: operation.followUp.durationRounds,
            } as const;
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'damage_rider',
          damage,
          appliesTo: 'weapon_attack_by_target',
          consumeOnHit: operation.consumeOnHit,
          ...(followUp === undefined ? {} : { followUp }),
        },
        target: 'self',
        concentration: operation.concentration,
        durationRounds: operation.durationRounds,
        expiresAt: 'source_start',
      }, [command.actor]);
      return 'applied';
    }
    case 'utility':
      emit(context, {
        type: 'spell_utility_resolved',
        caster: command.actor,
        spellId: definition.id,
        capability: operation.effect.kind,
        effect: resolvedSpellEffectPayload(definition, command, operation.effect),
      });
      if (operation.durationRounds !== null || operation.concentration || operation.stateful === true) {
        const slotLevel = command.slotLevel ?? definition.level;
        const becomesPermanent = operation.becomesPermanentAtSlot !== undefined && slotLevel >= operation.becomesPermanentAtSlot;
        const losesConcentration = operation.losesConcentrationAtSlot !== undefined && slotLevel >= operation.losesConcentrationAtSlot;
        const slotDelta = definition.level === 0 ? 0 : slotLevel - definition.level;
        applySpellEffect(context, definition, command, {
          payload: operation.effect,
          target: 'self',
          concentration: losesConcentration ? false : operation.concentration,
          durationRounds: becomesPermanent
            ? null
            : operation.durationRounds === null
              ? null
              : operation.durationRounds + (operation.durationRoundsPerSlot ?? 0) * slotDelta,
          expiresAt: 'source_start',
        }, [command.actor]);
      }
      return 'applied';
  }
}

function nextLivingInitiativeIndex(state: EncounterState, current: number): number {
  for (let offset = 1; offset <= state.initiative.length; offset += 1) {
    const index = (current + offset) % state.initiative.length;
    const entry = state.initiative[index];
    if (entry !== undefined && combatant(state, entry.combatant).life !== 'dead') return index;
  }
  throw new EncounterRuleError('No living combatant remains in initiative.');
}

type InitiativeEntryDraft = Omit<InitiativeEntry, 'slot'>;

interface InitiativeSlotDraft {
  readonly entries: readonly InitiativeEntryDraft[];
  readonly total: number;
  readonly bonus: number;
  readonly tieBreaker: CombatantId;
}

function initiativeBonusFor(
  state: EncounterState,
  subject: EncounterCombatantState,
): number {
  return subject.profile.rules.initiativeBonus + exhaustionPenalty(
    combatantConditions(state, subject.profile.id),
  );
}

function initiativeRollModeFor(
  state: EncounterState,
  subject: EncounterCombatantState,
): RollMode {
  const modes: RollMode[] = ['normal'];
  for (const clause of conditionMechanicalState(
    combatantConditions(state, subject.profile.id),
  ).clauses) {
    if (clause.kind === 'roll_mode' && clause.roll === 'initiative') modes.push(clause.mode);
  }
  return combineRollModes(modes);
}

function rollIndividualInitiative(
  context: ReductionContext,
  subject: EncounterCombatantState,
): InitiativeSlotDraft {
  const roll = rollD20(context.rng, initiativeRollModeFor(context.state, subject));
  const bonus = initiativeBonusFor(context.state, subject);
  const entry: InitiativeEntryDraft = {
    combatant: subject.profile.id,
    total: roll.chosen + bonus,
    roll: roll.chosen,
    bonus,
  };
  emit(context, {
    type: 'initiative_rolled',
    combatant: subject.profile.id,
    faces: roll.faces,
    total: entry.total,
  });
  return {
    entries: [entry],
    total: entry.total,
    bonus,
    tieBreaker: subject.profile.id,
  };
}

function rollEnemyInitiativeBlock(
  context: ReductionContext,
  monsters: readonly EncounterCombatantState[],
): InitiativeSlotDraft | null {
  const ordered = [...monsters].sort((left, right) => {
    const bonusDifference =
      initiativeBonusFor(context.state, right) - initiativeBonusFor(context.state, left);
    return bonusDifference || left.profile.id.localeCompare(right.profile.id);
  });
  const representative = ordered[0];
  if (representative === undefined) return null;
  const bonus = initiativeBonusFor(context.state, representative);
  const roll = rollD20(
    context.rng,
    initiativeRollModeFor(context.state, representative),
  );
  const total = roll.chosen + bonus;
  emit(context, {
    type: 'initiative_block_rolled',
    combatants: ordered.map((subject) => subject.profile.id),
    faces: roll.faces,
    total,
    bonus,
  });
  return {
    entries: ordered.map((subject) => ({
      combatant: subject.profile.id,
      total,
      roll: roll.chosen,
      bonus,
    })),
    total,
    bonus,
    tieBreaker: representative.profile.id,
  };
}

function sortInitiativeSlots(slots: readonly InitiativeSlotDraft[]): InitiativeSlotDraft[] {
  return [...slots].sort(
    (left, right) =>
      right.total - left.total ||
      right.bonus - left.bonus ||
      left.tieBreaker.localeCompare(right.tieBreaker),
  );
}

function rollInitiativeSlots(context: ReductionContext): readonly InitiativeSlotDraft[] {
  if (context.state.config.initiativeMode === 'per_combatant') {
    return sortInitiativeSlots(
      context.state.combatants.map((subject) => rollIndividualInitiative(context, subject)),
    );
  }
  const players = context.state.combatants.filter(
    (subject) => subject.profile.kind === 'player_character',
  );
  const monsters = context.state.combatants.filter(
    (subject) => subject.profile.kind === 'monster',
  );
  const playerSlots = sortInitiativeSlots(
    players.map((subject) => rollIndividualInitiative(context, subject)),
  );
  const enemySlot = rollEnemyInitiativeBlock(context, monsters);
  if (context.state.config.initiativeMode === 'side_alternating') {
    return enemySlot === null ? playerSlots : [...playerSlots, enemySlot];
  }
  return sortInitiativeSlots(enemySlot === null ? playerSlots : [...playerSlots, enemySlot]);
}

function worldObject(state: EncounterState, id: WorldObjectId): WorldObject {
  const found = state.worldObjects.find((object) => object.id === id);
  if (found === undefined) throw new EncounterRuleError(`Unknown world object ${id}.`);
  return found;
}

function validateWorldObjectForState(
  state: EncounterState,
  object: WorldObject,
  replacing: WorldObjectId | null,
): void {
  try {
    assertWorldObjectInput(state.bounds, object);
  } catch (error) {
    throw new EncounterRuleError(error instanceof Error ? error.message : 'Invalid world object.');
  }
  if (state.worldObjects.some((candidate) => candidate.id === object.id && candidate.id !== replacing)) {
    throw new EncounterRuleError(`World object ${object.id} already exists.`);
  }
  if (object.blocking.movement && state.tokens.some((placed) =>
    object.footprint.some((cell) => cellKey(cell) === cellKey(placed.position)))) {
    throw new EncounterRuleError('A movement-blocking world object cannot overlap a combatant.');
  }
}

function removeWorldObject(
  context: ReductionContext,
  actor: CombatantId | null,
  id: WorldObjectId,
  reason: 'destroyed' | 'dismissed',
): void {
  worldObject(context.state, id);
  const anchoredAreaIds = context.state.persistentAreas
    .filter((area) => area.origin.kind === 'anchored_to_object' && area.origin.object === id)
    .map((area) => area.id);
  context.state = {
    ...context.state,
    worldObjects: context.state.worldObjects.filter((object) => object.id !== id),
  };
  emit(context, { type: 'world_object_removed', actor, objectId: id, reason });
  for (const areaId of anchoredAreaIds) endPersistentArea(context, areaId, 'anchor_destroyed');
  reevaluatePersistentAreaMembership(context);
}

function processWorldOperation(
  context: ReductionContext,
  actor: CombatantId | null,
  operation: WorldOperation,
): void {
  switch (operation.kind) {
    case 'create_object': {
      const object: WorldObject = {
        ...structuredClone(operation.object),
        createdRevision: context.state.revision,
      };
      validateWorldObjectForState(context.state, object, null);
      context.state = {
        ...context.state,
        worldObjects: [...context.state.worldObjects, object],
      };
      emit(context, { type: 'world_object_created', actor, object });
      reevaluatePersistentAreaMembership(context);
      return;
    }
    case 'modify_object': {
      const existing = worldObject(context.state, operation.objectId);
      if (Object.keys(operation.changes).length === 0) {
        throw new EncounterRuleError('A world-object modification must change at least one field.');
      }
      const modified: WorldObject = {
        ...existing,
        ...structuredClone(operation.changes),
        id: existing.id,
        createdRevision: existing.createdRevision,
      };
      validateWorldObjectForState(context.state, modified, existing.id);
      context.state = {
        ...context.state,
        worldObjects: context.state.worldObjects.map((object) =>
          object.id === existing.id ? modified : object),
      };
      emit(context, { type: 'world_object_modified', actor, objectId: existing.id });
      reevaluatePersistentAreaMembership(context);
      return;
    }
    case 'remove_object':
      removeWorldObject(context, actor, operation.objectId, operation.reason);
      return;
    case 'damage_object': {
      const existing = worldObject(context.state, operation.objectId);
      if (existing.durability.kind === 'indestructible') {
        throw new EncounterRuleError(`World object ${existing.id} is indestructible.`);
      }
      const attack = operation.delivery.kind === 'attack'
        ? resolveAttackRoll({
            attackBonus: operation.delivery.attackBonus,
            targetArmorClass: existing.armorClass,
            criticalFloor: operation.delivery.criticalFloor,
            rollMode: operation.delivery.rollMode,
          }, context.rng)
        : null;
      const damage = attack?.outcome === 'miss'
        ? null
        : resolveDamage({
            ...operation.damage,
            critical: operation.damage.critical || attack?.outcome === 'critical',
            responses: existing.damageResponses,
          }, context.rng);
      const before = existing.durability.hitPoints;
      const after = Math.max(0, before - (damage?.total ?? 0));
      context.state = {
        ...context.state,
        worldObjects: context.state.worldObjects.map((object) => object.id === existing.id
          ? { ...object, durability: { ...existing.durability, hitPoints: after } }
          : object),
      };
      emit(context, {
        type: 'world_object_damaged', actor, objectId: existing.id,
        attack, damage, hitPointsBefore: before, hitPointsAfter: after,
      });
      if (after === 0) removeWorldObject(context, actor, existing.id, 'destroyed');
      return;
    }
    case 'transform_terrain': {
      try {
        assertEnvironmentRegion(context.state.bounds, operation.region);
      } catch (error) {
        throw new EncounterRuleError(error instanceof Error ? error.message : 'Invalid terrain region.');
      }
      const retained = context.state.environment.difficultTerrainRegions
        .filter((region) => region.id !== operation.region.id);
      context.state = {
        ...context.state,
        environment: {
          ...context.state.environment,
          difficultTerrainRegions: operation.difficultTerrain
            ? [...retained, structuredClone(operation.region)]
            : retained,
        },
      };
      emit(context, {
        type: 'environment_terrain_changed', actor,
        regionId: operation.region.id, difficultTerrain: operation.difficultTerrain,
      });
      return;
    }
    case 'set_light_level': {
      try {
        assertEnvironmentRegion(context.state.bounds, operation.region);
      } catch (error) {
        throw new EncounterRuleError(error instanceof Error ? error.message : 'Invalid light region.');
      }
      context.state = {
        ...context.state,
        environment: {
          ...context.state.environment,
          lightRegions: [
            ...context.state.environment.lightRegions.filter((region) => region.id !== operation.region.id),
            { ...structuredClone(operation.region), level: operation.level },
          ],
        },
      };
      emit(context, {
        type: 'environment_light_changed', actor,
        regionId: operation.region.id, level: operation.level,
      });
      return;
    }
    case 'set_obscurement': {
      try {
        assertEnvironmentRegion(context.state.bounds, operation.region);
      } catch (error) {
        throw new EncounterRuleError(error instanceof Error ? error.message : 'Invalid obscurement region.');
      }
      const retained = context.state.environment.obscurementRegions
        .filter((region) => region.id !== operation.region.id);
      context.state = {
        ...context.state,
        environment: {
          ...context.state.environment,
          obscurementRegions: operation.obscurement === null
            ? retained
            : [...retained, { ...structuredClone(operation.region), obscurement: operation.obscurement }],
        },
      };
      return;
    }
  }
}

function sameIdentitySet<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value));
}

function processSustainedEffectActivation(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'activate_sustained_effect' }>,
): void {
  const effect = context.state.effects.find((candidate) => candidate.id === command.effectId);
  if (effect === undefined) {
    throw new SustainedActivationRuleError('effect_ended', `Sustained effect ${command.effectId} has ended.`);
  }
  if (effect.payload.kind !== 'sustained_effect') {
    throw new SustainedActivationRuleError('effect_not_sustained', `Effect ${command.effectId} is not sustained.`);
  }
  if (effect.source !== command.actor) {
    throw new SustainedActivationRuleError('wrong_owner', `Sustained effect ${command.effectId} belongs to ${effect.source}.`);
  }
  const definition = spellDefinition(effect.payload.spellId) ??
    importedSpellDefinition(context.state.contentPacks, effect.payload.spellId);
  if (definition === null || definition.operation.kind !== 'sustained_effect') {
    throw new SustainedActivationRuleError('effect_not_sustained', `Spell ${effect.payload.spellId} has no sustained declaration.`);
  }
  const sequence = definition.operation.sequence;
  if (sequence.kind !== 'activation' && sequence.kind !== 'instance_group_activation') {
    throw new SustainedActivationRuleError(
      'activation_not_declared',
      `Sustained effect ${command.effectId} advances without an activation command.`,
    );
  }
  if (context.state.round <= effect.payload.establishedRound) {
    throw new SustainedActivationRuleError(
      'activation_not_yet_available',
      `Sustained effect ${command.effectId} is available only on a later turn.`,
    );
  }
  const boundTargetMismatch = sequence.kind === 'instance_group_activation'
    ? !sameIdentitySet(command.ownedObjectTargets, effect.payload.ownedObjects)
    : (effect.payload.targetBinding === 'bound_combatants' &&
        !sameIdentitySet(command.targets, effect.payload.boundCombatants)) ||
      (effect.payload.targetBinding === 'bound_objects' &&
        !sameIdentitySet(command.objectTargets, effect.payload.boundObjects)) ||
      (effect.payload.targetBinding === 'bound_owned_objects' &&
        !sameIdentitySet(command.ownedObjectTargets, effect.payload.ownedObjects)) ||
      !sameIdentitySet(command.ownedObjectTargets, effect.payload.ownedObjects);
  if (boundTargetMismatch) {
    throw new SustainedActivationRuleError(
      'bound_target_mismatch',
      `Sustained effect ${command.effectId} must use its bound target set.`,
    );
  }
  const activationCommand: SpellCastCommand = {
    type: 'cast_spell',
    actor: command.actor,
    spellId: definition.id,
    slotLevel: effect.payload.slotLevel,
    castAsRitual: false,
    casterLevel: effect.payload.casterLevel,
    attackBonus: effect.payload.attackBonus,
    saveDc: effect.payload.saveDc,
    spellcastingModifier: effect.payload.spellcastingModifier,
    targets: command.targets,
    area: command.area,
    ...(command.spatialPoint === undefined ? {} : { spatialPoint: command.spatialPoint }),
    weaponAttack: null,
    selectedOption: command.selectedOption,
    objectTargets: command.objectTargets,
    ownedObjectTargets: command.ownedObjectTargets,
    ...(command.ownedObjectDestinations === undefined
      ? {}
      : { ownedObjectDestinations: command.ownedObjectDestinations }),
  };
  const activationDefinition: SpellDefinition = {
    ...definition,
    targeting: sequence.targeting,
  };
  const targets = selectedSpellTargets(context.state, activationDefinition, activationCommand);
  const actionType = sequence.action.actionType;
  if (actionType !== 'reaction') assertActiveActor(context, command.actor);
  spendCost(
    context,
    command.actor,
    actionType === 'magic_action' ? 'action' : actionType,
    `Activate ${definition.name}`,
  );
  executeSpellOperation(
    context,
    definition,
    activationCommand,
    targets,
    sequence.operation,
  );
  emit(context, {
    type: 'sustained_effect_activated',
    caster: command.actor,
    effectId: effect.id,
    spellId: definition.id,
    targets,
    objectTargets: command.objectTargets,
    ownedObjectTargets: command.ownedObjectTargets,
  });
}

function processCommand(context: ReductionContext, command: EncounterCommand): void {
  switch (command.type) {
    case 'drop_item':
    case 'pickup_item':
    case 'equip_item':
    case 'stow_item':
      processEquipmentCommand(context, command);
      return;
    case 'adjudicate': {
      if (command.reasoning.trim().length === 0) {
        throw new EncounterRuleError('An adjudication requires DM reasoning.');
      }
      if (command.subject.trim().length === 0 || command.subject.length > 200) {
        throw new EncounterRuleError('An adjudication subject must be non-empty and at most 200 characters.');
      }
      const subject = combatant(context.state, command.target);
      if (command.consequence.kind === 'hit_point_delta') {
        if (!Number.isSafeInteger(command.consequence.amount)) {
          throw new EncounterRuleError('An adjudicated Hit Point delta must be a safe integer.');
        }
        const before = subject.hitPoints;
        const after = Math.max(
          0,
          Math.min(subject.profile.rules.hitPointMaximum, before + command.consequence.amount),
        );
        const life = after > 0
          ? 'living'
          : subject.profile.rules.usesDeathSaves
            ? 'dying'
            : 'dead';
        context.state = replaceCombatant(context.state, {
          ...subject,
          hitPoints: after,
          life,
          deathSaves: life === 'dying'
            ? subject.deathSaves ?? { successes: 0, failures: 0 }
            : null,
        });
        emit(context, {
          type: 'adjudicated',
          target: command.target,
          subject: command.subject,
          reasoning: command.reasoning.trim(),
          consequence: { kind: 'hit_points', before, after, lifeState: life },
        });
        return;
      }
      const consequence = command.consequence;
      if (!isCellInside(context.state.bounds, consequence.to)) {
        throw new EncounterRuleError('An adjudicated destination is outside the encounter grid.');
      }
      if (
        movementBlocked(context.state, consequence.to) ||
        context.state.tokens.some(
          (candidate) =>
            candidate.combatantId !== command.target &&
            cellKey(candidate.position) === cellKey(consequence.to),
        )
      ) {
        throw new EncounterRuleError('An adjudicated destination must be unoccupied and unblocked.');
      }
      const existing = token(context.state, command.target);
      context.state = {
        ...context.state,
        tokens: context.state.tokens.map((candidate) =>
          candidate.combatantId === command.target
            ? { ...candidate, position: { ...consequence.to } }
            : candidate,
        ),
      };
      emit(context, {
        type: 'adjudicated',
        target: command.target,
        subject: command.subject,
        reasoning: command.reasoning.trim(),
        consequence: {
          kind: 'position',
          from: { ...existing.position },
          to: { ...consequence.to },
        },
      });
      reevaluatePersistentAreaMembership(context);
      return;
    }
    case 'cast_spell':
      processSpellCast(context, command);
      return;
    case 'activate_sustained_effect':
      processSustainedEffectActivation(context, command);
      return;
    case 'roll_initiative': {
      if (context.state.initiative.length > 0) {
        throw new EncounterRuleError('Initiative has already been rolled.');
      }
      const slots = rollInitiativeSlots(context);
      const initiative = slots.flatMap((slot, slotIndex) =>
        slot.entries.map((entry) => ({ ...entry, slot: slotIndex })),
      );
      context.state = {
        ...context.state,
        initiative,
        activeInitiativeIndex: 0,
        combatants: context.state.combatants.map((subject) => ({
          ...subject,
          turn: {
            ...subject.turn,
            reactionAvailable:
              subject.life === 'living' &&
              !isIncapacitated(
                combatantConditions(context.state, subject.profile.id),
              ),
          },
        })),
      };
      emit(context, {
        type: 'initiative_ordered',
        order: initiative.map((entry) => entry.combatant),
        slots: slots.map((slot) => slot.entries.map((entry) => entry.combatant)),
      });
      const first = initiative[0];
      if (first === undefined) throw new EncounterRuleError('Initiative order is empty.');
      startTurn(context, first.combatant, 1);
      return;
    }
    case 'move':
      processMove(context, command);
      return;
    case 'create_persistent_area': {
      if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Create persistent area');
      if (command.featureEffectId !== undefined) {
        const feature = featureEffect(context.state, command.actor, command.featureEffectId);
        if (feature.payload.kind !== 'persistent_area') {
          throw new EncounterRuleError(`Effect ${command.featureEffectId} does not create a persistent area.`);
        }
        if (feature.resourcePoolId !== null) {
          spendLimitedResource(context, command.actor, feature.resourcePoolId, `Effect ${feature.id}`);
        }
        const { origin: declaredOrigin, ...declaredArea } = feature.payload.area;
        const { owner: _owner, origin: submittedOrigin, ...submittedArea } = command.area;
        if (
          canonicalJson(declaredArea) !== canonicalJson(submittedArea) ||
          (declaredOrigin === 'self' &&
            (submittedOrigin.kind !== 'anchored' || submittedOrigin.combatant !== command.actor)) ||
          (declaredOrigin === 'selected' && submittedOrigin.kind !== 'fixed')
        ) {
          throw new EncounterRuleError(`Effect ${command.featureEffectId} persistent-area declaration was altered.`);
        }
      }
      createPersistentArea(context, command.actor, command.area);
      return;
    }
    case 'move_persistent_area': {
      assertActiveActor(context, command.actor);
      const area = context.state.persistentAreas.find((candidate) => candidate.id === command.areaId);
      if (area === undefined) throw new EncounterRuleError(`Unknown persistent area ${command.areaId}.`);
      if (area.owner !== command.actor || area.origin.kind !== 'fixed' || area.movable === null) {
        throw new EncounterRuleError(`Persistent area ${command.areaId} is not movable by ${command.actor}.`);
      }
      const distance = Math.hypot(
        command.origin.point.x - area.origin.point.x,
        command.origin.point.y - area.origin.point.y,
      );
      if (distance > area.movable.maximumFeet) {
        throw new EncounterRuleError(`Persistent area ${command.areaId} moved farther than allowed.`);
      }
      spendAction(context, command.actor, `Move persistent area ${command.areaId}`);
      context.state = {
        ...context.state,
        persistentAreas: context.state.persistentAreas.map((candidate) => candidate.id === area.id
          ? { ...candidate, origin: structuredClone(command.origin) }
          : candidate),
      };
      emit(context, { type: 'persistent_area_moved', areaId: area.id, owner: command.actor, origin: command.origin });
      reevaluatePersistentAreaMembership(context);
      return;
    }
    case 'world_operation': {
      if (command.actor === null) {
        if (command.cost !== 'none') {
          throw new EncounterRuleError('An encounter-authored world operation cannot spend a combatant resource.');
        }
      } else {
        if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
        spendCost(context, command.actor, command.cost, 'World operation');
      }
      processWorldOperation(context, command.actor, command.operation);
      return;
    }
    case 'attack':
    case 'opportunity_attack': {
      processAttack(context, command);
      return;
    }
    case 'decline_reaction': {
      const reactor = combatant(context.state, command.actor);
      if (reactor.life !== 'living' || !reactor.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${command.actor} cannot decline this Reaction.`);
      }
      if (context.state.activeCombatant !== command.mover) {
        throw new EncounterRuleError('A declined Reaction must name the active mover.');
      }
      emit(context, {
        type: 'reaction_declined',
        combatant: command.actor,
        mover: command.mover,
      });
      return;
    }
    case 'force_save': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Force saving throw');
      const save = resolveTargetSave(
        context,
        command.actor,
        command.target,
        command.ability,
        command.dc,
        command.rollMode,
        null,
      );
      const damage = resolveTargetDamage(context, command.actor, command.target, command.damage);
      const amount =
        save.outcome === 'failure'
          ? damage.total
          : command.onSuccess === 'half'
            ? Math.floor(damage.total / 2)
            : 0;
      applyDamage(context, command.actor, command.target, amount);
      concentrationCheck(context, command.target, amount);
      return;
    }
    case 'roll_ability_check': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Ability check');
      if (!Number.isFinite(command.bonus)) throw new EncounterRuleError('Ability check bonus must be finite.');
      const modifier = effectDiceModifier(
        context.state, command.actor, 'ability_check', context.rng, command.skill,
      );
      const roll = rollD20(context.rng, abilityCheckRollMode(context.state, command.actor, command.rollMode));
      const total = roll.chosen + command.bonus +
        exhaustionPenalty(combatantConditions(context.state, command.actor)) +
        modifier;
      const check = {
        outcome: total < difficultyClass(command.dc) ? 'failure' as const : 'success' as const,
        roll,
        total,
      };
      emit(context, {
        type: 'ability_check_resolved', actor: command.actor,
        ability: command.ability, skill: command.skill, check,
      });
      return;
    }
    case 'dash': {
      assertActiveActor(context, command.actor);
      spendAction(context, command.actor, 'Dash');
      const subject = combatant(context.state, command.actor);
      const extra = effectiveSpeed(context.state, command.actor);
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          movement: {
            speed: feet(subject.turn.movement.speed + extra),
            spent: subject.turn.movement.spent,
            remaining: feet(subject.turn.movement.remaining + extra),
          },
        },
      });
      return;
    }
    case 'disengage':
    case 'dodge': {
      assertActiveActor(context, command.actor);
      spendAction(context, command.actor, command.type === 'dodge' ? 'Dodge' : 'Disengage');
      const subject = combatant(context.state, command.actor);
      const stance = command.type === 'dodge' ? 'dodging' : 'disengaging';
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, [stance]: true },
      });
      emit(context, {
        type: 'stance_started',
        combatant: command.actor,
        stance,
      });
      return;
    }
    case 'spend_bonus_action': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, 'bonus_action', command.purpose);
      return;
    }
    case 'spend_reaction': {
      const subject = combatant(context.state, command.actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, command.actor))) {
        throw new EncounterRuleError(`Combatant ${command.actor} cannot react.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${command.actor} has no Reaction available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, reactionAvailable: false },
      });
      emit(context, {
        type: 'resource_spent',
        combatant: command.actor,
        resource: 'reaction',
        purpose: command.purpose,
      });
      return;
    }
    case 'activate_action_surge': {
      const subject = assertActiveActor(context, command.actor);
      assertCanUseActions(context, command.actor);
      const effect = featureEffect(context.state, command.actor, command.effectId);
      if (effect.payload.kind !== 'action_surge' || effect.resourcePoolId === null) {
        throw new EncounterRuleError(`Effect ${effect.id} does not grant a resource-fueled extra action.`);
      }
      if (subject.turn.action.kind !== 'spent') {
        throw new EncounterRuleError(`Combatant ${command.actor} must spend its current action before gaining another.`);
      }
      spendLimitedResource(context, command.actor, effect.resourcePoolId, `Effect ${effect.id}`);
      const refreshed = combatant(context.state, command.actor);
      context.state = replaceCombatant(context.state, {
        ...refreshed,
        turn: { ...refreshed.turn, action: { kind: 'available' } },
      });
      return;
    }
    case 'activate_timed_spellcasting_mode': {
      const subject = assertActiveActor(context, command.actor);
      assertCanUseActions(context, command.actor);
      const effect = featureEffect(context.state, command.actor, command.effectId);
      if (
        effect.payload.kind !== 'timed_spellcasting_mode' ||
        effect.resourcePoolId === null ||
        effect.trigger !== 'bonus_action'
      ) {
        throw new EncounterRuleError(`Effect ${effect.id} is not a resource-fueled timed spellcasting mode.`);
      }
      if (subject.turn.additionalLeveledSpellActionsRemaining === 1) {
        throw new EncounterRuleError('The timed spellcasting mode is already active this turn.');
      }
      spendCost(context, command.actor, 'bonus_action', `Effect ${effect.id}`);
      spendLimitedResource(context, command.actor, effect.resourcePoolId, `Effect ${effect.id}`);
      const refreshed = combatant(context.state, command.actor);
      context.state = replaceCombatant(context.state, {
        ...refreshed,
        turn: {
          ...refreshed.turn,
          additionalLeveledSpellActionsRemaining: effect.payload.additionalLeveledSpellActions,
        },
      });
      return;
    }
    case 'activate_damage_operation': {
      assertActiveActor(context, command.actor);
      const effect = featureEffect(context.state, command.actor, command.effectId);
      if (effect.payload.kind !== 'damage_operation') {
        throw new EncounterRuleError(`Effect ${effect.id} is not a damage operation.`);
      }
      if (effect.trigger !== 'action' && effect.trigger !== 'bonus_action') {
        throw new EncounterRuleError(`Effect ${effect.id} has no activatable damage cost.`);
      }
      spendCost(context, command.actor, effect.trigger, `Effect ${effect.id}`);
      if (effect.resourcePoolId !== null) {
        spendLimitedResource(context, command.actor, effect.resourcePoolId, `Effect ${effect.id}`);
      }
      applyDamageOperation(
        context,
        command.actor,
        command.targets,
        effect.payload,
        effect.payload.saveDc,
        `feature:${String(effect.id)}:${String(context.state.revision)}`,
        { definition: null, command: null },
      );
      return;
    }
    case 'arm_weapon_hit_rider': {
      assertActiveActor(context, command.actor);
      const effect = featureEffect(context.state, command.actor, command.effectId);
      if (
        effect.payload.kind !== 'damage_rider' ||
        effect.payload.arming === undefined ||
        (effect.trigger !== 'action' && effect.trigger !== 'bonus_action')
      ) {
        throw new EncounterRuleError(`Effect ${effect.id} is not an armed weapon-hit rider.`);
      }
      spendCost(context, command.actor, effect.trigger, `Effect ${effect.id}`);
      if (effect.resourcePoolId !== null) {
        spendLimitedResource(context, command.actor, effect.resourcePoolId, `Effect ${effect.id}`);
      }
      applyEffect(context, command.actor, {
        targets: [command.actor],
        duration: {
          kind: 'turn_boundaries',
          timing: {
            combatant: command.actor,
            boundary: 'start',
            source: `feature:${String(effect.id)}`,
          },
          remaining: effect.payload.arming.durationRounds,
        },
        concentration: effect.payload.arming.concentration,
        stackingIdentity: effectStackingIdentity(`feature:${String(effect.id)}`),
        stacking: 'replace_same_source',
        repeatedSave: null,
        payload: effect.payload,
      });
      return;
    }
    case 'heal': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Heal');
      if (!Number.isSafeInteger(command.amount) || command.amount < 0) {
        throw new EncounterRuleError('Healing must be a non-negative safe integer.');
      }
      applyHealing(context, command.actor, command.target, command.amount);
      return;
    }
    case 'consume_healing_pool': {
      assertActiveActor(context, command.actor);
      const pool = context.state.effects.find((effect) => effect.id === command.effectId);
      if (pool === undefined || pool.payload.kind !== 'consumable_healing_pool') {
        throw new EncounterRuleError(`Effect ${command.effectId} is not a consumable healing pool.`);
      }
      if (pool.payload.remainingUses < 1) {
        throw new EncounterRuleError(`Healing pool ${command.effectId} is empty.`);
      }
      spendCost(context, command.actor, pool.payload.activation, 'Consume healing resource');
      const remaining = pool.payload.remainingUses - 1;
      context.state = {
        ...context.state,
        effects: context.state.effects.map((effect) => effect.id === pool.id
          ? { ...effect, payload: { ...pool.payload, remainingUses: remaining } }
          : effect),
      };
      applyHealing(context, command.actor, command.actor, pool.payload.healingPerUse);
      emit(context, {
        type: 'healing_pool_consumed',
        combatant: command.actor,
        effectId: pool.id,
        remaining,
      });
      return;
    }
    case 'apply_effect':
      if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Apply effect');
      if (command.resourcePoolId !== undefined) {
        spendLimitedResource(context, command.actor, command.resourcePoolId, 'Apply effect');
      }
      applyEffect(context, command.actor, command.effect);
      return;
    case 'grant_temporary_hit_points':
      if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Grant temporary Hit Points');
      if (command.resourcePoolId !== undefined) {
        spendLimitedResource(
          context,
          command.actor,
          command.resourcePoolId,
          'Grant temporary Hit Points',
        );
      }
      grantTemporaryHitPoints(context, command.target, command.amount);
      return;
    case 'end_concentration':
      assertActiveActor(context, command.actor);
      endConcentration(context, command.actor, 'concentration_ended');
      return;
    case 'end_turn': {
      if (context.state.activeCombatant !== command.actor) {
        throw new EncounterRuleError(`Combatant ${command.actor} is not the active combatant.`);
      }
      const currentIndex = context.state.activeInitiativeIndex;
      if (currentIndex === null) throw new EncounterRuleError('Initiative is not active.');
      processBoundary(context, command.actor, 'end');
      emit(context, { type: 'turn_ended', combatant: command.actor, round: context.state.round });
      const nextIndex = nextLivingInitiativeIndex(context.state, currentIndex);
      const next = context.state.initiative[nextIndex];
      if (next === undefined) throw new EncounterRuleError('Next initiative entry is missing.');
      const round = nextIndex <= currentIndex ? context.state.round + 1 : context.state.round;
      context.state = { ...context.state, activeInitiativeIndex: nextIndex };
      startTurn(context, next.combatant, round);
      return;
    }
  }
}

/** Pure state transition apart from consuming the explicitly supplied RNG stream. */
export function reduceEncounter(
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
): EncounterReduction {
  const context: ReductionContext = {
    state: { ...state, revision: state.revision + 1 },
    rng: transactionalRng(rng),
    events: [],
  };
  processCommand(context, command);
  return { state: context.state, events: context.events };
}
