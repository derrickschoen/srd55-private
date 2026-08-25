import { creatureSizes, skills, type Ability, type Skill } from '../domain/enums';
import { canonicalJson } from '../commands/canonical-json';
import { combatantSide, combatantsAreAllies } from './allies';
import {
  importedMonsterProfile,
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
import type { CombatantProfile, CombatRulesProfile, CombatToken } from './combatant';
import { EncounterRuleError } from './encounter-rule-error';
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
  EffectDurationClock,
  EffectPayload,
  EncounterEffect,
  TurnBoundary,
} from './effects';
import type { EncounterCommand, EncounterEvent } from './events';
import {
  executableMonsterOnHitEffects,
  monsterAttackCommand,
} from './monster-commands';
import {
  adjacentCells,
  gridDistance,
  isCellInside,
  type GridBounds,
  type GridCell,
} from './grid';
import {
  findPath,
  planMovement,
  spendMovement,
  startTurnMovement,
  type MovementWorld,
  type TurnMovement,
} from './movement';
import {
  fixedOrigin,
  feetShape,
  PERSISTENT_AREA_OPTIONAL_RULES,
  persistentAreaContains,
  type PersistentArea,
  type PersistentAreaEffectSpec,
  type PersistentAreaHook,
  type PersistentAreaInput,
  type PersistentAreaIgnitionRule,
  type PersistentAreaOptionalRule,
} from './persistent-areas';
import { rollDice, rollDie, transactionalRng, type Rng, type TransactionalRng } from './random';
import type { HiddenRollCategory } from './roll-visibility';
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
  ReactionOperation,
  ReactionTrigger,
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
import { FORM_REPLACEMENT_RETAINED_STATISTICS } from './spells/types';
import type {
  MonsterAction,
  MonsterDamageTrigger,
  MonsterEffectDuration,
  MonsterLegendaryAction,
  MonsterOnHitEffect,
} from './statblock';
import { lookupBundledMonster } from './statblocks/companions';
import { affectedCells, creatureOccupiesAffectedCell, type AreaTemplate } from './templates';
import {
  armorClass,
  combatantId,
  damageType,
  difficultyClass,
  dieSides,
  encounterEffectId,
  effectStackingIdentity,
  feet,
  persistentAreaId,
  tokenId,
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
  type WorldObjectClassAction,
  type CoverTier,
  type EncounterEnvironment,
  type WorldObject,
  type WorldOperation,
} from './world-objects';
import {
  WildShapeRuleError,
  wildShapeDurationRounds,
  wildShapeForm,
  wildShapeGateFor,
  wildShapePhysicalLayer,
  wildShapeRulesLens,
  type WildShapeOverlay,
  type WildShapeReversionReason,
  type WildShapeUseState,
} from './wild-shape';

export type LifeState = 'living' | 'dying' | 'stable' | 'dead';

export type EncounterOutcome = 'victory' | 'defeat' | 'mutual';

export type EncounterPhase =
  | { readonly kind: 'active' }
  | {
      readonly kind: 'concluded';
      readonly outcome: EncounterOutcome;
      readonly survivingSide: 'player_character' | 'monster' | null;
      readonly round: number;
      readonly revision: number;
    };

export function isEncounterPhase(value: unknown): value is EncounterPhase {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const kind = Reflect.get(value, 'kind');
  if (kind === 'active') return Object.keys(value).length === 1;
  if (kind !== 'concluded' || Object.keys(value).length !== 5) return false;
  const outcome = Reflect.get(value, 'outcome');
  const survivingSide = Reflect.get(value, 'survivingSide');
  return (
    (outcome === 'victory' || outcome === 'defeat' || outcome === 'mutual') &&
    (survivingSide === 'player_character' || survivingSide === 'monster' || survivingSide === null) &&
    Number.isSafeInteger(Reflect.get(value, 'round')) &&
    Number.isSafeInteger(Reflect.get(value, 'revision'))
  );
}

export interface DeathSaveState {
  readonly successes: number;
  readonly failures: number;
}

export interface EncounterDeathMoment {
  readonly round: number;
  readonly initiativeIndex: number;
}

export const REVIVIFY_CITATIONS = {
  castingTime: 'docs/srd/full/srd-5.2.1.txt:10141',
  component: 'docs/srd/full/srd-5.2.1.txt:10145-10146',
  deathWindowAndHitPoints: 'docs/srd/full/srd-5.2.1.txt:10148-10150',
  exclusions: 'docs/srd/full/srd-5.2.1.txt:10150-10151',
} as const;

export class RevivifyRuleError extends EncounterRuleError {
  override readonly name = 'RevivifyRuleError' as const;

  constructor(
    readonly code: 'death_time_unknown' | 'target_dead_too_long',
    readonly citation: typeof REVIVIFY_CITATIONS.deathWindowAndHitPoints,
  ) {
    super('revivify_validation', code === 'death_time_unknown'
      ? `Revivify requires a recorded time of death (${citation}).`
      : `Revivify requires a creature that died within the last minute (${citation}).`);
  }
}

export class VisionTargetingRuleError extends EncounterRuleError {
  override readonly name = 'VisionTargetingRuleError' as const;

  constructor(
    readonly code: 'target_not_seen',
    readonly actor: CombatantId,
    readonly target: CombatantId,
  ) {
    super('vision_targeting_validation', `Combatant ${actor} cannot select unseen target ${target} for an effect that requires sight.`);
  }
}

export class PendingDecisionRuleError extends EncounterRuleError {
  override readonly name = 'PendingDecisionRuleError' as const;

  constructor(readonly code: 'turn_boundary_blocked' | 'unknown_decision') {
    super(code === 'turn_boundary_blocked' ? 'pending_decision_boundary' : 'pending_decision_validation', code === 'turn_boundary_blocked'
      ? 'The turn cannot advance while a Reaction offer for this boundary is unresolved.'
      : 'The pending decision does not exist.');
  }
}

export class EncounterConcludedBoundaryError extends EncounterRuleError {
  override readonly name = 'EncounterConcludedBoundaryError' as const;

  constructor(
    readonly code: 'encounter_concluded',
    readonly conclusion: Extract<EncounterPhase, { readonly kind: 'concluded' }>,
  ) {
    super(
      'encounter_concluded_boundary',
      `The encounter concluded with ${conclusion.outcome}; turn advancement is unavailable.`,
    );
  }
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
  readonly deathAt: EncounterDeathMoment | null;
  readonly turn: TurnResources;
  readonly temporaryHitPoints: number;
  readonly wildShapeUses: WildShapeUseState | null;
  readonly wildShape?: WildShapeOverlay;
  /** Present only while a replacement form is active; omission preserves untouched state identity. */
  readonly form?: FormReplacementState;
  readonly spellSlots: readonly SpellSlotState[];
  readonly limitedResources?: readonly LimitedResourceState[];
  readonly legendary?: {
    readonly actionUsesMaximum: number;
    readonly actionUsesRemaining: number;
    readonly resistanceUsesMaximum: number;
    readonly resistanceUsesRemaining: number;
  };
}

export type WildShapeTransferClassification =
  | 'true_form_retained'
  | 'physical_lens'
  | 'feature_resource'
  | 'active_overlay';

/** A new combatant-state field cannot silently cross the Wild Shape boundary. */
export const WILD_SHAPE_COMBATANT_TRANSFER = {
  profile: 'true_form_retained',
  hitPoints: 'true_form_retained',
  life: 'true_form_retained',
  deathSaves: 'true_form_retained',
  deathAt: 'true_form_retained',
  turn: 'true_form_retained',
  temporaryHitPoints: 'true_form_retained',
  wildShapeUses: 'feature_resource',
  wildShape: 'active_overlay',
  form: 'true_form_retained',
  spellSlots: 'true_form_retained',
  limitedResources: 'true_form_retained',
  legendary: 'true_form_retained',
} as const satisfies Readonly<Record<keyof EncounterCombatantState, WildShapeTransferClassification>>;

/**
 * Reducer-owned reversible form state. Original HP remains on the combatant;
 * form HP is a separate pool so neither can be mistaken for the other.
 */
export interface FormReplacementState {
  readonly effectId: EncounterEffectId;
  readonly formId: string;
  readonly formName: string;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly originalProfile: CombatantProfile;
  readonly availableActions: readonly MonsterAction[];
  readonly retainedStatistics: typeof FORM_REPLACEMENT_RETAINED_STATISTICS;
  readonly equipmentDisposition: 'merged_into_form' | 'dropped_at_origin';
  readonly spellcasting: 'prohibited';
}

export interface SpellSlotState {
  readonly level: number;
  readonly maximum: number;
  readonly remaining: number;
  /** Omitted for ordinary long-rest slots so existing encounter records stay canonical. */
  readonly recharge?: 'short_rest';
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
  /** Named deviations are absent by default; SRD behavior remains the baseline. */
  readonly optionalRules?: readonly PersistentAreaOptionalRule[];
}

export type DetectionRulesEdition = '2014' | '2024';

export const REACTION_KINDS = [
  'hit_by_attack',
  'damaged_by_creature',
  'taking_damage_of_type',
  'creature_casts_spell',
  'opportunity_attack',
] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
export const DECISION_POLICY_KINDS = [...REACTION_KINDS, 'legendary_resistance'] as const;
export type DecisionPolicyKind = (typeof DECISION_POLICY_KINDS)[number];
export type ReactionPolicy = 'ask' | 'always' | 'never';

export interface HiddenCombatant {
  readonly combatant: CombatantId;
  readonly stealthTotal: number;
  readonly edition: DetectionRulesEdition;
}

export interface PendingDecisionOption {
  readonly id: string;
  readonly label: string;
}

export type NonEmptyPendingDecisionOptions<
  Option extends PendingDecisionOption = PendingDecisionOption,
> = readonly [Option, ...Option[]] | readonly [...Option[], Option];

interface PendingDecisionBase<Options extends NonEmptyPendingDecisionOptions> {
  readonly id: string;
  readonly combatant: CombatantId;
  readonly options: Options;
  readonly boundary: {
    readonly activeCombatant: CombatantId;
    readonly round: number;
  };
}

/** Closed engine decision vocabulary; every kind owns its legal option tuple. */
export type PendingDecision =
  | (PendingDecisionBase<readonly [
      PendingDecisionOption & { readonly id: 'accept' },
      PendingDecisionOption & { readonly id: 'decline' },
    ]> & {
      readonly kind: 'reaction_offer';
      readonly reactionKind: 'opportunity_attack';
      readonly opportunityAttack: {
        readonly mover: CombatantId;
        readonly from: GridCell;
        readonly to: GridCell;
        readonly command: Extract<EncounterCommand, { readonly type: 'opportunity_attack' }>;
      };
    })
  | (PendingDecisionBase<readonly [PendingDecisionOption & { readonly id: 'roll' }]> & {
      readonly kind: 'death_save';
    })
  | (PendingDecisionBase<readonly [
      ...(PendingDecisionOption & { readonly id: `legendary_action:${string}` })[],
      PendingDecisionOption & { readonly id: 'pass' },
    ]> & {
      readonly kind: 'legendary_action_window';
    })
  | (PendingDecisionBase<readonly [
      PendingDecisionOption & { readonly id: 'spend' },
      PendingDecisionOption & { readonly id: 'suffer' },
    ]> & {
      readonly kind: 'legendary_resistance';
      readonly failedSave: {
        readonly source: CombatantId;
        readonly ability: Ability;
        readonly dc: number;
        readonly original: ReturnType<typeof resolveSavingThrow>;
        readonly effectId: EncounterEffectId | null;
      };
      readonly checkpoint: {
        readonly subject: EncounterCombatantState;
        readonly tokenPosition: GridCell | null;
        readonly effects: readonly EncounterEffect[];
      };
    })
  | (PendingDecisionBase<readonly [PendingDecisionOption & { readonly id: 'rule_manually' }]> & {
      readonly kind: 'adjudication_prompt';
      readonly refusal: import('../vtt/refusal-handling').NonBoundaryActionRefusal;
    });

export interface CombatantReactionPolicy {
  readonly combatant: CombatantId;
  readonly reactionKind: DecisionPolicyKind;
  readonly policy: ReactionPolicy;
}

export const DEFAULT_ENCOUNTER_CONFIG: EncounterConfig = Object.freeze({
  initiativeMode: 'shared_enemy',
});

export function isInitiativeMode(value: unknown): value is InitiativeMode {
  return typeof value === 'string' && INITIATIVE_MODES.includes(value as InitiativeMode);
}

export function isEncounterConfig(value: unknown): value is EncounterConfig {
  const optionalRules = typeof value === 'object' && value !== null
    ? Reflect.get(value, 'optionalRules')
    : undefined;
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    isInitiativeMode(Reflect.get(value, 'initiativeMode')) &&
    (optionalRules === undefined || (
      Array.isArray(optionalRules) &&
      optionalRules.every((rule) => typeof rule === 'string' &&
        PERSISTENT_AREA_OPTIONAL_RULES.includes(rule as PersistentAreaOptionalRule)) &&
      new Set(optionalRules).size === optionalRules.length
    ))
  );
}

export interface EncounterState {
  readonly config: EncounterConfig;
  readonly phase: EncounterPhase;
  readonly rulesEdition: DetectionRulesEdition;
  /** DM-controlled projection policy; raw events always retain their rolls. */
  readonly hiddenRolls: readonly HiddenRollCategory[];
  readonly revision: number;
  readonly nextEventSequence: number;
  readonly nextDecisionSequence: number;
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
  /** Original order for the current round while one or more DM delays are active. */
  readonly initiativeBeforeDelays?: {
    readonly round: number;
    readonly order: readonly CombatantId[];
  };
  readonly effects: readonly EncounterEffect[];
  /** Creation-sequenced areas; reducers never depend on insertion order. */
  readonly persistentAreas: readonly PersistentArea[];
  readonly nextPersistentAreaSequence: number;
  /** Creation-sequenced later-turn branches; evaluated after area hooks and before effects. */
  readonly reevaluatedBranches?: readonly ReevaluatedSpellBranch[];
  readonly eventLog: readonly EncounterEvent[];
  readonly hiddenCombatants: readonly HiddenCombatant[];
  readonly pendingDecisions: readonly PendingDecision[];
  readonly reactionPolicies: readonly CombatantReactionPolicy[];
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
  readonly rulesEdition?: DetectionRulesEdition;
  readonly hiddenRolls?: readonly HiddenRollCategory[];
  /** Legacy construction input retained only to preserve the existing death-save behavior. */
  readonly hideDeathSaveRolls?: boolean;
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
  readonly reactionPolicies?: readonly CombatantReactionPolicy[];
}

export interface EncounterReduction {
  readonly state: EncounterState;
  readonly events: readonly EncounterEvent[];
}

export type ReactionTriggerEvent =
  | {
      readonly kind: 'hit_by_attack';
      readonly attacker: CombatantId;
      readonly target: CombatantId;
      readonly attackTotal: number;
    }
  | {
      readonly kind: 'damaged_by_creature';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly amount: number;
    }
  | {
      readonly kind: 'taking_damage_of_type';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly damageTypes: readonly DamageType[];
    }
  | {
      readonly kind: 'creature_casts_spell';
      readonly caster: CombatantId;
      readonly spellId: string;
      readonly hasComponents: boolean;
    };

export type ReactionAvailability =
  | 'available'
  | 'reaction_spent'
  | 'incapacitated'
  | 'slot_unavailable';

export interface ReactionOffer {
  readonly reactor: CombatantId;
  readonly spellId: string;
  readonly trigger: ReactionTrigger['kind'];
  readonly availability: ReactionAvailability;
}

export interface ReactionDecisionRequest {
  readonly state: EncounterState;
  readonly event: ReactionTriggerEvent;
  readonly offers: readonly ReactionOffer[];
}

/** A synchronous seam for reducer-owned interception; coordinators may supply it. */
export type ReactionDecisionHook = (
  request: ReactionDecisionRequest,
) => SpellCastCommand | null;

export interface EncounterReductionOptions {
  readonly reactionDecision?: ReactionDecisionHook;
}

export type EncounterCommandReducer = (
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
  options?: EncounterReductionOptions,
) => EncounterReduction;

export { combatantSide, combatantsAreAllies, EncounterRuleError };

/** Dying and stable combatants remain on their side; only `dead` removes one. */
export function nonDeadEncounterSides(
  state: EncounterState,
): ReadonlySet<'player_character' | 'monster'> {
  return new Set(state.combatants
    .filter((subject) => subject.life !== 'dead')
    .map((subject) => combatantSide(state, subject.profile.id)));
}

export function encounterConclusionAfter(
  before: EncounterState,
  after: EncounterState,
): Extract<EncounterPhase, { readonly kind: 'concluded' }> | null {
  if (before.phase.kind === 'concluded') return null;
  const beforeSides = nonDeadEncounterSides(before);
  if (!beforeSides.has('player_character') || !beforeSides.has('monster')) return null;
  return encounterConclusionFromCurrentState(after);
}

function encounterConclusionFromCurrentState(
  state: EncounterState,
): Extract<EncounterPhase, { readonly kind: 'concluded' }> | null {
  const afterSides = nonDeadEncounterSides(state);
  if (afterSides.has('player_character') && afterSides.has('monster')) return null;
  const survivingSide = afterSides.has('player_character')
    ? 'player_character' as const
    : afterSides.has('monster')
      ? 'monster' as const
      : null;
  return {
    kind: 'concluded',
    outcome: survivingSide === 'player_character'
      ? 'victory'
      : survivingSide === 'monster'
        ? 'defeat'
        : 'mutual',
    survivingSide,
    round: state.round,
    revision: state.revision,
  };
}

function resumesLegendaryTurnBoundary(
  state: EncounterState,
  actor: CombatantId,
): boolean {
  const closedWindow = state.eventLog.some((event) =>
    event.type === 'legendary_action_window_closed' &&
    event.activeCombatant === actor && event.round === state.round);
  const completedBoundary = state.eventLog.some((event) =>
    event.type === 'turn_ended' && event.combatant === actor && event.round === state.round);
  return closedWindow && !completedBoundary;
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
    super('target_selection_validation', reason);
  }
}

export class EquipmentRuleError extends EncounterRuleError {
  override readonly name = 'EquipmentRuleError' as const;

  constructor(readonly code: EquipmentRefusalCode, reason: string) {
    super('equipment_validation', reason);
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
  override readonly name = 'SustainedActivationRuleError' as const;

  constructor(readonly code: SustainedActivationRefusalCode, reason: string) {
    super('sustained_activation_validation', reason);
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
    throw new EncounterRuleError('validation', `${label} must be unique.`);
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
    throw new EncounterRuleError('validation', 'Equipment cannot name an unknown combatant.');
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
      throw new EncounterRuleError('validation', `Ground item ${ground.item} is outside the encounter grid.`);
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
    throw new EncounterRuleError('validation', 'Encounter configuration has an invalid initiative mode.');
  }
  if (setup.rulesEdition !== undefined && setup.rulesEdition !== '2014' && setup.rulesEdition !== '2024') {
    throw new EncounterRuleError('validation', 'Encounter detection rules edition must be 2014 or 2024.');
  }
  if (
    !Number.isSafeInteger(setup.bounds.columns) ||
    !Number.isSafeInteger(setup.bounds.rows) ||
    setup.bounds.columns < 1 ||
    setup.bounds.rows < 1
  ) {
    throw new EncounterRuleError('validation', 'Encounter bounds must be positive safe integers.');
  }
  if (setup.combatants.length === 0) {
    throw new EncounterRuleError('validation', 'An encounter requires at least one combatant.');
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
    throw new EncounterRuleError('validation', 
      'Every combatant must have exactly one matching board token.',
    );
  }
  for (const token of setup.tokens) {
    const profile = setup.combatants.find((candidate) => candidate.id === token.combatantId);
    if (profile?.tokenId !== token.id) {
      throw new EncounterRuleError('validation', 'A token must match its profile token identity.');
    }
    if (!isCellInside(setup.bounds, token.position)) {
      throw new EncounterRuleError('validation', `Token ${token.id} is outside the encounter grid.`);
    }
  }

  const reactionPolicies = setup.reactionPolicies ?? [];
  assertUnique(
    reactionPolicies.map((policy) => `${String(policy.combatant)}:${policy.reactionKind}`),
    'Reaction policies',
  );
  for (const policy of reactionPolicies) {
    if (!profileIds.has(policy.combatant) || !DECISION_POLICY_KINDS.includes(policy.reactionKind)) {
      throw new EncounterRuleError('validation', 'A decision policy must name a combatant and closed policy kind in this encounter.');
    }
  }

  const blockedCells = setup.blockedCells ?? [];
  assertUnique(blockedCells.map(cellKey), 'Blocked cells');
  for (const cell of blockedCells) {
    if (!isCellInside(setup.bounds, cell)) {
      throw new EncounterRuleError('validation', 'Blocked cells must be inside the encounter grid.');
    }
    if (setup.tokens.some((token) => cellKey(token.position) === cellKey(cell))) {
      throw new EncounterRuleError('validation', 'A token cannot start in a blocked cell.');
    }
  }
  const worldObjects = setup.worldObjects ?? [];
  assertUnique(worldObjects.map((object) => object.id), 'World object ids');
  for (const object of worldObjects) {
    try {
      assertWorldObjectInput(setup.bounds, object);
    } catch (error) {
      throw new EncounterRuleError('validation', error instanceof Error ? error.message : 'Invalid world object.');
    }
    if (object.blocking.movement && setup.tokens.some((token) =>
      object.footprint.some((cell) => cellKey(cell) === cellKey(token.position)))) {
      throw new EncounterRuleError('validation', 'A token cannot start in a movement-blocking world object.');
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
    throw new EncounterRuleError('validation', error instanceof Error ? error.message : 'Invalid environment region.');
  }
  const foggedCells = setup.foggedCells ?? [];
  assertUnique(foggedCells.map(cellKey), 'Fogged cells');
  for (const cell of foggedCells) {
    if (!isCellInside(setup.bounds, cell)) {
      throw new EncounterRuleError('validation', 'Fogged cells must be inside the encounter grid.');
    }
  }
  for (const note of setup.dmNotes ?? []) {
    if (note.trim().length === 0) {
      throw new EncounterRuleError('validation', 'DM notes must be non-empty.');
    }
  }

  const equipment = normalizedEquipment(setup);
  const contacts = setup.itemContacts ?? [];
  assertUnique(contacts.map((contact) => `${String(contact.item)}:${String(contact.combatant)}`), 'Item contacts');
  for (const contact of contacts) {
    setupItemDefinition(itemRegistry(setup.contentPacks), contact.item);
    if (!profileIds.has(contact.combatant)) throw new EncounterRuleError('validation', 'Item contact names an unknown combatant.');
  }

  for (const profile of setup.combatants) {
    const limitedResources = profile.rules.limitedResources ?? [];
    assertUnique(limitedResources.map((pool) => pool.id), `Resource pool ids for ${profile.id}`);
    for (const pool of limitedResources) {
      if (!Number.isSafeInteger(pool.maximum) || pool.maximum < 1) {
        throw new EncounterRuleError('validation', `Resource pool ${pool.id} maximum must be a positive safe integer.`);
      }
    }
    const resourceIds = new Set(limitedResources.map((pool) => pool.id));
    for (const effect of profile.rules.featureEffects ?? []) {
      if (effect.resourcePoolId !== null && !resourceIds.has(effect.resourcePoolId)) {
        throw new EncounterRuleError('validation', `Effect ${effect.id} references unknown resource pool ${effect.resourcePoolId}.`);
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
    phase: { kind: 'active' },
    rulesEdition: setup.rulesEdition ?? '2024',
    hiddenRolls: setup.hiddenRolls === undefined
      ? setup.hideDeathSaveRolls === true ? ['death_saves'] : []
      : [...new Set(setup.hiddenRolls)],
    revision: 0,
    nextEventSequence: 1,
    nextDecisionSequence: 1,
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
      deathAt: null,
      turn: EMPTY_TURN,
      temporaryHitPoints: Math.max(0, ...(profile.rules.featureEffects ?? [])
        .filter((effect) => effect.trigger === 'always_on' && effect.payload.kind === 'temporary_hit_points')
        .map((effect) => effect.payload.kind === 'temporary_hit_points' ? effect.payload.amount : 0)),
      wildShapeUses: profile.kind === 'player_character' && profile.wildShape !== null
        ? {
            kind: 'wild_shape_uses',
            maximum: profile.wildShape.usesMaximum,
            remaining: profile.wildShape.usesMaximum,
          }
        : null,
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
      ...(profile.rules.legendary === undefined
        ? {}
        : {
            legendary: {
              actionUsesMaximum: profile.rules.legendary.actionUsesMaximum,
              actionUsesRemaining: profile.rules.legendary.actionUsesMaximum,
              resistanceUsesMaximum: profile.rules.legendary.resistanceUsesMaximum,
              resistanceUsesRemaining: profile.rules.legendary.resistanceUsesMaximum,
            },
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
    hiddenCombatants: [],
    pendingDecisions: [],
    reactionPolicies: structuredClone(reactionPolicies),
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
  if (found === undefined) throw new EncounterRuleError('validation', `Unknown combatant ${id}.`);
  return found;
}

function token(state: EncounterState, id: CombatantId): CombatToken {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new EncounterRuleError('validation', `Combatant ${id} has no token.`);
  return found;
}

export function isCombatantOnBoard(state: EncounterState, id: CombatantId): boolean {
  return state.tokens.some((candidate) => candidate.combatantId === id);
}

export function availableFormActions(
  state: EncounterState,
  id: CombatantId,
): readonly MonsterAction[] | null {
  const subject = combatant(state, id);
  return subject.wildShape?.physical.actions ?? subject.form?.availableActions ?? null;
}

/** The only combatant-state -> active-rules lens. */
export function effectiveCombatRules(
  state: EncounterState,
  id: CombatantId,
): CombatRulesProfile {
  const subject = combatant(state, id);
  return subject.wildShape === undefined
    ? subject.profile.rules
    : wildShapeRulesLens(subject.profile.rules, subject.wildShape);
}

function replaceCombatant(
  state: EncounterState,
  replacement: EncounterCombatantState,
): EncounterState {
  const prior = state.combatants.find((candidate) => candidate.profile.id === replacement.profile.id);
  if (prior === undefined) throw new EncounterRuleError('validation', `Unknown combatant ${replacement.profile.id}.`);
  const normalized: EncounterCombatantState = replacement.life === 'dead'
    ? {
        ...replacement,
        deathAt: prior.life === 'dead' && prior.deathAt !== null
          ? prior.deathAt
          : {
              round: state.round,
              initiativeIndex: state.activeInitiativeIndex ?? 0,
            },
      }
    : { ...replacement, deathAt: null };
  return {
    ...state,
    combatants: state.combatants.map((candidate) =>
      candidate.profile.id === normalized.profile.id ? normalized : candidate,
    ),
  };
}

function combatantEquipment(state: EncounterState, id: CombatantId): CombatantEquipment {
  const found = state.equipment?.find((candidate) => candidate.combatant === id);
  if (found === undefined) throw new EncounterRuleError('validation', `Combatant ${id} has no equipment state.`);
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
    case 'summon_lifecycle':
    case 'ability_check_modifier':
    case 'skill_modifier':
    case 'armor_class_modifier':
    case 'roll_defense_modifier':
    case 'attack_roll_modifier':
    case 'attack_roll_mode_modifier':
    case 'faerie_fire':
    case 'consumable_healing_pool':
    case 'healing_potion':
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
  const base = effectiveCombatRules(state, id).skillBonuses?.[skill] ?? 0;
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
  const base = effectiveCombatRules(state, id).speed;
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
  const base = effectiveCombatRules(state, id).armorClass;
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
    if (
      isRollDefenseEffect(effect) &&
      effect.payload.scopes.includes('armor_class') &&
      effect.payload.modifier.kind === 'flat' &&
      rollDefenseEligibilityMatches(state, effect, id, attacker, 'other')
    ) bonus += effect.payload.modifier.amount;
    if (effect.payload.kind === 'shield_defense') bonus += effect.payload.armorClassBonus;
  }
  // Barkskin's floor evaluates the completed AC; it is not another additive bonus.
  return armorClass(Math.max(base + bonus, floor));
}

/** Dice modifiers consume the encounter RNG before the d20, oldest effect first, then effect id. */
export const ROLL_MODIFIER_ORDER = 'created_revision_then_effect_id_before_d20' as const;

type RollDefenseEffect = EncounterEffect & {
  readonly payload: Extract<EffectPayload, { readonly kind: 'roll_defense_modifier' }>;
};

function isRollDefenseEffect(effect: EncounterEffect): effect is RollDefenseEffect {
  return effect.payload.kind === 'roll_defense_modifier';
}

type RollCause = 'spell_or_magical_effect' | 'other';

function rollDefenseEligibilityMatches(
  state: EncounterState,
  effect: RollDefenseEffect,
  eligibleCombatant: CombatantId,
  opposingCombatant: CombatantId | null,
  cause: RollCause,
): boolean {
  switch (effect.payload.eligibility.kind) {
    case 'effect_targets':
      return effect.targets.includes(eligibleCombatant);
    case 'source_against_effect_targets':
      return eligibleCombatant === effect.source &&
        opposingCombatant !== null && effect.targets.includes(opposingCombatant);
    case 'effect_targets_against_creatures_other_than_source':
      return effect.targets.includes(eligibleCombatant) &&
        opposingCombatant !== null && opposingCombatant !== effect.source;
    case 'allies_within_aura':
      return (effect.payload.eligibility.savingThrowCause === 'any' || cause === 'spell_or_magical_effect') &&
        combatantsAreAllies(state, eligibleCombatant, effect.source) &&
        isCombatantOnBoard(state, eligibleCombatant) &&
        isCombatantOnBoard(state, effect.source) &&
        gridDistance(token(state, eligibleCombatant).position, token(state, effect.source).position) <=
          effect.payload.eligibility.radiusFeet;
  }
}

function qualifyingRollDefenseEffects(
  state: EncounterState,
  scope: Exclude<Extract<EffectPayload, { readonly kind: 'roll_defense_modifier' }>['scopes'][number], 'armor_class'>,
  eligibleCombatant: CombatantId,
  opposingCombatant: CombatantId | null,
  cause: RollCause,
  selectedEffectIds: readonly EncounterEffectId[] = [],
): readonly RollDefenseEffect[] {
  const selected = new Set(selectedEffectIds);
  return [...state.effects]
    .filter((effect): effect is RollDefenseEffect =>
      isRollDefenseEffect(effect) &&
      effect.payload.scopes.includes(scope) &&
      (effect.payload.consumption !== 'chosen_qualifying_roll' || selected.has(effect.id)) &&
      rollDefenseEligibilityMatches(state, effect, eligibleCombatant, opposingCombatant, cause))
    .sort((left, right) =>
      left.createdRevision - right.createdRevision || String(left.id).localeCompare(String(right.id)));
}

function rollDefenseTotalModifier(
  context: ReductionContext,
  scope: 'attack_rolls_made' | 'saving_throws' | 'ability_checks',
  eligibleCombatant: CombatantId,
  opposingCombatant: CombatantId | null,
  cause: RollCause,
  selectedEffectIds: readonly EncounterEffectId[] = [],
): number {
  const consumed = new Set<EncounterEffectId>();
  const total = qualifyingRollDefenseEffects(
    context.state, scope, eligibleCombatant, opposingCombatant, cause, selectedEffectIds,
  ).reduce((sum, effect) => {
    const modifier = effect.payload.modifier;
    if (modifier.kind === 'roll_mode') return sum;
    if (effect.payload.consumption !== 'duration') consumed.add(effect.id);
    if (modifier.kind === 'flat') return sum + modifier.amount;
    return sum + modifier.sign * rollDice(context.rng, {
      count: modifier.count, sides: dieSides(modifier.sides), modifier: 0,
    }).total;
  }, 0);
  endEffects(context, consumed, 'trigger_consumed');
  return total;
}

function rollDefenseModes(
  state: EncounterState,
  scope: 'attack_rolls_made' | 'attack_rolls_against' | 'saving_throws' | 'ability_checks',
  eligibleCombatant: CombatantId,
  opposingCombatant: CombatantId | null,
  cause: RollCause,
  selectedEffectIds: readonly EncounterEffectId[] = [],
): { readonly modes: readonly RollMode[]; readonly consumed: ReadonlySet<EncounterEffectId> } {
  const consumed = new Set<EncounterEffectId>();
  const modes = qualifyingRollDefenseEffects(
    state, scope, eligibleCombatant, opposingCombatant, cause, selectedEffectIds,
  ).flatMap((effect) => {
    if (effect.payload.modifier.kind !== 'roll_mode') return [];
    if (effect.payload.consumption !== 'duration') consumed.add(effect.id);
    return [effect.payload.modifier.mode];
  });
  return { modes, consumed };
}

function successfulSaveNegatesHalfDamage(
  state: EncounterState,
  target: CombatantId,
  source: CombatantId,
  cause: RollCause,
): boolean {
  return qualifyingRollDefenseEffects(
    state, 'saving_throws', target, source, cause,
  ).some((effect) => effect.payload.successfulSaveDamage === 'none_instead_of_half');
}

function successfulSaveDamage(
  state: EncounterState,
  source: CombatantId,
  target: CombatantId,
  amount: number,
  onSuccess: 'half' | 'none',
  cause: RollCause,
): number {
  if (onSuccess === 'none' || successfulSaveNegatesHalfDamage(state, target, source, cause)) return 0;
  return Math.floor(amount / 2);
}

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
  return coverTierBetweenObjects(state.worldObjects, from, to);
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  let cover: CoverTier = 'none';
  for (const cell of interveningCells(from, to)) {
    for (const object of objects) {
      if (
        worldObjectOccupiesCell(object, cell) &&
        COVER_ORDER[object.blocking.cover] > COVER_ORDER[cover]
      ) cover = object.blocking.cover;
    }
  }
  return cover;
}

export type DetectionResult =
  | {
      readonly kind: 'seen';
      readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight';
    }
  | {
      readonly kind: 'located';
      readonly sense: 'tremorsense' | 'web_sense';
    }
  | {
      readonly kind: 'undetected';
      readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range';
    };

function combatantIsHidden(state: EncounterState, subject: CombatantId): boolean {
  return state.hiddenCombatants.some((entry) => entry.combatant === subject);
}

function sharesWebArea(state: EncounterState, observer: CombatantId, subject: CombatantId): boolean {
  const observerCell = token(state, observer).position;
  const subjectCell = token(state, subject).position;
  const persistentWeb = state.persistentAreas.some((area) => {
    if (area.material?.id !== 'webs') return false;
    const origin = area.origin;
    const anchor = origin.kind === 'anchored'
      ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
      : origin.kind === 'anchored_to_object'
        ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
        : null;
    return persistentAreaContains(area, observerCell, anchor, state) &&
      persistentAreaContains(area, subjectCell, anchor, state);
  });
  return persistentWeb || state.effects.some((effect) => {
    if (effect.payload.kind !== 'web_area' || effect.payload.placement === 'selected_when_cast') return false;
    const cells = affectedCells(
      { bounds: state.bounds, blockedCells: templateBlockedCells(state) },
      effect.payload.placement,
    );
    const keys = new Set(cells.map(cellKey));
    return keys.has(cellKey(observerCell)) && keys.has(cellKey(subjectCell));
  });
}

/**
 * Detection vocabulary and source clauses:
 * - Blindsight: docs/srd/full/srd-5.2.1.txt:11356-11362.
 * - Darkvision: docs/srd/full/srd-5.2.1.txt:11582-11588.
 * - Tremorsense: docs/srd/full/srd-5.2.1.txt:12206-12214 (location, not sight).
 * - Truesight: docs/srd/full/srd-5.2.1.txt:12216-12241.
 * - Web Sense: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23501-23503.
 */
export function detectCombatant(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): DetectionResult {
  const from = token(state, observer).position;
  const to = token(state, subject).position;
  const distance = gridDistance(from, to);
  const senses = effectiveCombatRules(state, observer).senses;
  const hasBlindsight = senses.some((sense) =>
    sense.kind === 'blindsight' && distance <= sense.rangeFeet);
  if (hasBlindsight && hasLineOfSight(state, from, to)) {
    return { kind: 'seen', sense: 'blindsight' };
  }
  const hasTruesight = senses.some((sense) =>
    sense.kind === 'truesight' && distance <= sense.rangeFeet);
  const hasTremorsense = senses.some((sense) =>
    sense.kind === 'tremorsense' && distance <= sense.rangeFeet);
  const observerRules = effectiveCombatRules(state, observer);
  const subjectRules = effectiveCombatRules(state, subject);
  if (
    hasTremorsense &&
    observerRules.contactMedium !== 'air' &&
    observerRules.contactMedium === subjectRules.contactMedium
  ) return { kind: 'located', sense: 'tremorsense' };
  if (observerRules.detectionTraits.includes('web_sense') && sharesWebArea(state, observer, subject)) {
    return { kind: 'located', sense: 'web_sense' };
  }
  if (!hasLineOfSight(state, from, to)) return { kind: 'undetected', reason: 'blocked' };

  const observerBlinded = combatantConditions(state, observer)
    .some(({ name }) => name === 'Blinded');
  if (observerBlinded) return { kind: 'undetected', reason: 'obscured' };
  const subjectInvisible = combatantConditions(state, subject)
    .some(({ name }) => name === 'Invisible');
  const hidden = combatantIsHidden(state, subject);
  if (hidden && !hasTruesight) return { kind: 'undetected', reason: 'hidden' };
  if (subjectInvisible && !hasTruesight) return { kind: 'undetected', reason: 'invisible' };

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
  if (heavyObscurement) return { kind: 'undetected', reason: 'obscured' };
  if (hasTruesight) return { kind: 'seen', sense: 'truesight' };
  if (magicalDarkness) return { kind: 'undetected', reason: 'darkness' };
  const light = environmentLightAt(state.environment, to);
  if (light !== 'darkness') return { kind: 'seen', sense: 'normal_sight' };
  const hasDarkvision = senses.some((sense) =>
    sense.kind === 'darkvision' && distance <= sense.rangeFeet);
  return hasDarkvision
    ? { kind: 'seen', sense: 'darkvision' }
    : { kind: 'undetected', reason: senses.some((sense) => sense.kind === 'darkvision') ? 'out_of_range' : 'darkness' };
}

export function canCombatantSee(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): boolean {
  return detectCombatant(state, observer, subject).kind === 'seen';
}

function canCombatantPierceVisualIllusion(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): boolean {
  const distance = gridDistance(token(state, observer).position, token(state, subject).position);
  return effectiveCombatRules(state, observer).senses.some((sense) =>
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
  // Unseen attacker/target: docs/srd/full/srd-5.2.1.txt:884-894 and
  // docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:5426-5442.
  if (!attackerCanSeeTarget) modes.push('disadvantage');
  if (!targetCanSeeAttacker) modes.push('advantage');
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
    throw new EncounterRuleError('validation', `Effect ${declared.id} is not a Reckless Attack mode.`);
  }
  if (
    !wasFirstAttack ||
    command.attackId === undefined ||
    !declared.payload.strengthBasedMeleeAttackIds.includes(command.attackId)
  ) {
    throw new EncounterRuleError('validation', 'Reckless Attack must be chosen for the first declared Strength-based melee attack on the turn.');
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
  cause: RollCause,
): RollMode {
  const modes: RollMode[] = [base];
  if (cause === 'spell_or_magical_effect' && effectiveCombatRules(state, target).magicResistance === true) {
    modes.push('advantage');
  }
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
  for (const entry of effectiveCombatRules(state, target).damageResponses) {
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
  readonly reactionDecision: ReactionDecisionHook | null;
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
  offerReaction(context, {
    kind: 'taking_damage_of_type', source, target,
    damageTypes: [...new Set(request.terms.map((term) => term.type))],
  });
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
  const result = { terms, total: terms.reduce((sum, term) => sum + term.afterResponse, 0) };
  exposePersistentAreasAtDamageCell(context, source, target, result);
  return result;
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

function despawnOwnedCombatants(
  context: ReductionContext,
  effect: EncounterEffect,
): void {
  const owned = effect.ownedCombatants ?? [];
  if (owned.length === 0) return;
  const ids = new Set(owned);
  for (const id of owned) {
    emit(context, {
      type: 'summoned_combatant_despawned',
      combatant: id,
      summoner: effect.source,
      effectId: effect.id,
    });
  }
  const priorInitiative = context.state.initiative;
  const priorIndex = context.state.activeInitiativeIndex;
  const removedBeforeActive = priorIndex === null
    ? 0
    : priorInitiative.slice(0, priorIndex).filter((entry) => ids.has(entry.combatant)).length;
  const activeRemoved = context.state.activeCombatant !== null && ids.has(context.state.activeCombatant);
  const initiative = priorInitiative.filter((entry) => !ids.has(entry.combatant));
  const shiftedIndex = priorIndex === null
    ? null
    : Math.max(0, Math.min(initiative.length - 1, priorIndex - removedBeforeActive));
  const replacementActive = activeRemoved && shiftedIndex !== null
    ? initiative[shiftedIndex]?.combatant ?? null
    : context.state.activeCombatant;
  context.state = {
    ...context.state,
    combatants: context.state.combatants.filter((entry) => !ids.has(entry.profile.id)),
    tokens: context.state.tokens.filter((entry) => !ids.has(entry.combatantId)),
    absentTokens: (context.state.absentTokens ?? []).filter((entry) => !ids.has(entry.combatantId)),
    initiative,
    activeInitiativeIndex: initiative.length === 0 ? null : shiftedIndex,
    activeCombatant: initiative.length === 0 ? null : replacementActive,
    effects: context.state.effects.filter((candidate) => !ids.has(candidate.source)),
    persistentAreas: context.state.persistentAreas.filter((area) => !ids.has(area.owner)),
    ...(context.state.equipment === undefined
      ? {}
      : { equipment: context.state.equipment.filter((entry) => !ids.has(entry.combatant)) }),
  };
}

function endEffects(
  context: ReductionContext,
  ids: ReadonlySet<EncounterEffectId>,
  reason: Extract<EncounterEvent, { readonly type: 'effect_ended' }>['reason'],
): void {
  if (ids.size === 0) return;
  const ending = new Set(ids);
  let foundDependent = true;
  while (foundDependent) {
    foundDependent = false;
    for (const effect of context.state.effects) {
      if (
        effect.parentEffectId !== undefined &&
        ending.has(effect.parentEffectId) &&
        !ending.has(effect.id)
      ) {
        ending.add(effect.id);
        foundDependent = true;
      }
    }
  }
  for (const effect of context.state.effects) {
    if (!ending.has(effect.id)) continue;
    if (effect.payload.kind === 'temporary_banishment') {
      restoreBanishedTargets(context, effect, reason === 'duration_expired');
    }
    context.state = {
      ...context.state,
      combatants: context.state.combatants.map((subject) => {
        if (subject.form?.effectId !== effect.id) return subject;
        const { form, ...withoutForm } = subject;
        return { ...withoutForm, profile: form.originalProfile };
      }),
    };
    despawnOwnedCombatants(context, effect);
    emit(context, { type: 'effect_ended', effectId: effect.id, reason });
  }
  context.state = {
    ...context.state,
    effects: context.state.effects.filter((effect) => !ending.has(effect.id)),
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
    throw new EncounterRuleError('validation', 'A banished combatant has no unoccupied return space.');
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
  const subject = combatant(state, target);
  const base = subject.form?.originalProfile.rules.hitPointMaximum ??
    effectiveCombatRules(state, target).hitPointMaximum;
  return state.effects.reduce((maximum, candidate) =>
    candidate.targets.includes(target) && candidate.payload.kind === 'hit_point_maximum_modifier'
      ? maximum + candidate.payload.amount
      : maximum, base);
}

function revertWildShape(
  context: ReductionContext,
  target: CombatantId,
  reason: WildShapeReversionReason,
  excessDamage = 0,
): void {
  const subject = combatant(context.state, target);
  const overlay = subject.wildShape;
  if (overlay === undefined) return;
  const { wildShape: _wildShape, ...trueForm } = subject;
  context.state = replaceCombatant(context.state, trueForm);
  emit(context, {
    type: 'wild_shape_reverted',
    combatant: target,
    formId: overlay.formId,
    reason,
    excessDamage,
  });
}

function revertExpiredWildShapes(context: ReductionContext, round: number): void {
  for (const subject of [...context.state.combatants]) {
    if (subject.wildShape !== undefined && round >= subject.wildShape.expiresAtRound) {
      revertWildShape(context, subject.profile.id, 'duration_expired');
    }
  }
}

function assumeWildShape(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'assume_wild_shape' }>,
): void {
  const subject = assertActiveActor(context, command.actor);
  if (subject.profile.kind !== 'player_character') {
    throw new WildShapeRuleError('not_player_character', null, 'Only a player character can use Wild Shape.');
  }
  const feature = subject.profile.wildShape;
  if (feature === null || subject.wildShapeUses === null) {
    throw new WildShapeRuleError('feature_unavailable', null, `Combatant ${command.actor} has no configured Wild Shape feature.`);
  }
  if (subject.form !== undefined) {
    throw new WildShapeRuleError('feature_unavailable', null, 'Wild Shape cannot overlay another replacement form.');
  }
  if (subject.wildShapeUses.remaining < 1) {
    throw new WildShapeRuleError('no_uses_remaining', null, `Combatant ${command.actor} has no Wild Shape uses remaining.`);
  }
  const form = wildShapeForm(command.formId);
  if (form === null) {
    throw new WildShapeRuleError('unknown_form', null, `Wild Shape form ${command.formId} is not a bundled Beast.`);
  }
  if (!feature.knownForms.includes(command.formId)) {
    throw new WildShapeRuleError('form_not_known', null, `Wild Shape form ${command.formId} is not on the character sheet.`);
  }
  const gate = wildShapeGateFor(feature.druidLevel, form);
  if (gate !== null) {
    switch (gate.kind) {
      case 'challenge_rating':
        throw new WildShapeRuleError('challenge_rating_gate', gate, `Wild Shape form ${command.formId} exceeds the level-${String(feature.druidLevel)} Challenge Rating gate.`);
      case 'fly_speed':
        throw new WildShapeRuleError('fly_speed_gate', gate, `Wild Shape form ${command.formId} requires Druid level 8 for its Fly Speed.`);
    }
  }
  if (subject.profile.rules.abilityScores === undefined) {
    throw new WildShapeRuleError('feature_unavailable', null, 'Wild Shape requires sourced true-form ability scores.');
  }
  spendCost(context, command.actor, 'bonus_action', `Wild Shape: ${form.name}`);
  const refreshed = combatant(context.state, command.actor);
  if (refreshed.wildShape !== undefined) {
    revertWildShape(context, command.actor, 'new_wild_shape');
  }
  const beforeOverlay = combatant(context.state, command.actor);
  const remaining = (beforeOverlay.wildShapeUses?.remaining ?? 0) - 1;
  const physical = wildShapePhysicalLayer(form);
  const expiresAtRound = context.state.round + wildShapeDurationRounds(feature.druidLevel);
  context.state = replaceCombatant(context.state, {
    ...beforeOverlay,
    wildShapeUses: {
      kind: 'wild_shape_uses',
      maximum: feature.usesMaximum,
      remaining,
    },
    wildShape: {
      kind: 'wild_shape_overlay',
      formId: form.id,
      formName: form.name,
      druidLevel: feature.druidLevel,
      startedRound: context.state.round,
      expiresAtRound,
      equipmentDisposition: command.equipmentDisposition,
      physical,
    },
  });
  grantTemporaryHitPoints(context, command.actor, feature.druidLevel);
  if (command.equipmentDisposition === 'dropped_at_origin') {
    dropEquipmentForWildShape(context, command.actor);
  }
  emit(context, {
    type: 'wild_shape_assumed',
    combatant: command.actor,
    formId: form.id,
    formName: form.name,
    expiresAtRound,
    usesRemaining: remaining,
  });
}

function clearDeathSaveDecisions(state: EncounterState, target: CombatantId): EncounterState {
  return {
    ...state,
    pendingDecisions: state.pendingDecisions.filter((decision) =>
      decision.kind !== 'death_save' || decision.combatant !== target),
  };
}

function applyDamage(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  amount: number,
  critical = false,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new EncounterRuleError('validation', 'Damage must be a non-negative safe integer.');
  }
  const before = combatant(context.state, target);
  const hitPointMaximum = effectiveHitPointMaximum(context.state, target);
  if (before.life === 'dead' || amount === 0) return;
  if (before.wildShape !== undefined) {
    const absorbedTemporary = Math.min(before.temporaryHitPoints, amount);
    const afterTemporary = before.temporaryHitPoints - absorbedTemporary;
    const afterTemporaryDamage = amount - absorbedTemporary;
    const absorbedByForm = Math.min(before.wildShape.physical.hitPoints, afterTemporaryDamage);
    const formHitPoints = before.wildShape.physical.hitPoints - absorbedByForm;
    context.state = replaceCombatant(context.state, {
      ...before,
      temporaryHitPoints: afterTemporary,
      wildShape: {
        ...before.wildShape,
        physical: { ...before.wildShape.physical, hitPoints: formHitPoints },
      },
    });
    if (formHitPoints > 0) {
      emit(context, {
        type: 'damage_applied', source, target, amount: 0,
        hitPointsBefore: before.hitPoints, hitPointsAfter: before.hitPoints,
        lifeState: before.life, massiveDamage: false,
      });
      breakEffectsOnDamage(context, source, target, amount);
      return;
    }
    const carryover = afterTemporaryDamage - absorbedByForm;
    revertWildShape(context, target, 'form_hit_points_depleted', carryover);
    if (carryover > 0) {
      applyDamage(context, source, target, carryover, critical);
    } else {
      emit(context, {
        type: 'damage_applied', source, target, amount: 0,
        hitPointsBefore: before.hitPoints, hitPointsAfter: before.hitPoints,
        lifeState: before.life, massiveDamage: false,
      });
      breakEffectsOnDamage(context, source, target, amount);
    }
    return;
  }
  if (before.form !== undefined) {
    const absorbedByForm = Math.min(before.form.hitPoints, amount);
    const formHitPoints = before.form.hitPoints - absorbedByForm;
    context.state = replaceCombatant(context.state, {
      ...before,
      form: { ...before.form, hitPoints: formHitPoints },
    });
    if (formHitPoints > 0) {
      emit(context, {
        type: 'damage_applied', source, target, amount: 0,
        hitPointsBefore: before.hitPoints, hitPointsAfter: before.hitPoints,
        lifeState: before.life, massiveDamage: false,
      });
      breakEffectsOnDamage(context, source, target, amount);
      return;
    }
    endEffects(context, new Set([before.form.effectId]), 'form_hit_points_depleted');
    const carryover = amount - absorbedByForm;
    if (carryover > 0) {
      applyDamage(context, source, target, carryover, critical);
    } else {
      emit(context, {
        type: 'damage_applied', source, target, amount: 0,
        hitPointsBefore: before.hitPoints, hitPointsAfter: before.hitPoints,
        lifeState: before.life, massiveDamage: false,
      });
      breakEffectsOnDamage(context, source, target, amount);
    }
    return;
  }
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
  if (life === 'dead') context.state = clearDeathSaveDecisions(context.state, target);
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
  offerReaction(context, {
    kind: 'damaged_by_creature', source, target, amount,
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
  return combatantsAreAllies(state, damageSource, effect.source);
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
    ...(life === 'living'
      ? {
          turn: {
            action: { kind: 'available' },
            bonusActionAvailable: true,
            reactionAvailable: true,
            movement: startTurnMovement(feet(effectiveSpeed(context.state, id))),
            disengaging: false,
            dodging: false,
            ...(context.state.equipment === undefined ? {} : { objectInteractionsUsed: 0 as const }),
          },
        }
      : {}),
  });
  emit(context, {
    type: 'death_save_resolved',
    combatant: id,
    roll,
    outcome,
    successes,
    failures,
    lifeState: life,
    stableRecovery: life === 'stable' ? '1d4_hours_outside_encounter' : null,
  });
}

function queueDeathSave(context: ReductionContext, id: CombatantId): void {
  const subject = combatant(context.state, id);
  if (subject.life !== 'dying' || subject.hitPoints !== 0 || !subject.profile.rules.usesDeathSaves) return;
  if (context.state.pendingDecisions.some((decision) =>
    decision.kind === 'death_save' &&
    decision.combatant === id &&
    decision.boundary.round === context.state.round)) return;
  const decisionId = `decision:${String(context.state.nextDecisionSequence)}`;
  const decision: PendingDecision = {
    id: decisionId,
    combatant: id,
    kind: 'death_save',
    options: [{ id: 'roll', label: 'Roll Death Save' }],
    boundary: { activeCombatant: id, round: context.state.round },
  };
  context.state = {
    ...context.state,
    nextDecisionSequence: context.state.nextDecisionSequence + 1,
    pendingDecisions: [...context.state.pendingDecisions, decision],
  };
  emit(context, {
    type: 'pending_decision_queued',
    decisionId,
    combatant: id,
    kind: 'death_save',
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
  cause: RollCause = 'spell_or_magical_effect',
  selectedEffectIds: readonly EncounterEffectId[] = [],
): ReturnType<typeof resolveSavingThrow> {
  const subject = combatant(context.state, target);
  const modifierModes = rollDefenseModes(
    context.state, 'saving_throws', target, source, cause, selectedEffectIds,
  );
  const save = automaticSaveFailure(context.state, target, ability)
    ? {
        outcome: 'failure' as const,
        roll: { mode: 'normal' as const, faces: [], chosen: 0 },
        total: 0,
      }
    : resolveSavingThrow(
        {
          bonus:
            effectiveCombatRules(context.state, target).savingThrowBonuses[ability] +
            exhaustionPenalty(combatantConditions(context.state, target)) +
            effectDiceModifier(context.state, target, 'saving_throw', context.rng) +
            rollDefenseTotalModifier(
              context, 'saving_throws', target, source, cause, selectedEffectIds,
            ),
          dc: difficultyClass(dc),
          rollMode: combineRollModes([
            saveRollMode(context.state, target, ability, mode, cause), ...modifierModes.modes,
          ]),
        },
        context.rng,
      );
  endEffects(context, modifierModes.consumed, 'trigger_consumed');
  emit(context, { type: 'save_resolved', source, target, ability, dc, save, effectId });
  const afterRoll = combatant(context.state, target);
  if (
    save.outcome === 'failure' &&
    afterRoll.life === 'living' &&
    (afterRoll.legendary?.resistanceUsesRemaining ?? 0) > 0
  ) {
    const policy = reactionPolicyFor(context.state, target, 'legendary_resistance');
    if (policy === 'always') {
      emit(context, {
        type: 'reaction_policy_auto_resolved', combatant: target,
        reactionKind: 'legendary_resistance', policy, resolution: 'accept', autoFired: true,
      });
      spendLegendaryResistance(context, target, source, ability);
      return { ...save, outcome: 'success' };
    }
    if (policy === 'never') {
      emit(context, {
        type: 'reaction_policy_auto_resolved', combatant: target,
        reactionKind: 'legendary_resistance', policy, resolution: 'decline', autoFired: false,
      });
      return save;
    }
    const decisionId = `decision:${String(context.state.nextDecisionSequence)}`;
    const subjectToken = context.state.tokens.find((candidate) => candidate.combatantId === target);
    const checkpointEffects = context.state.effects.filter((candidate) =>
      candidate.source === target || candidate.targets.includes(target) || candidate.concentrationOwner === target);
    const decision: PendingDecision = {
      id: decisionId,
      combatant: target,
      kind: 'legendary_resistance',
      options: [
        { id: 'spend', label: 'Spend Legendary Resistance' },
        { id: 'suffer', label: 'Suffer the Failure' },
      ],
      boundary: {
        activeCombatant: context.state.activeCombatant ?? source,
        round: context.state.round,
      },
      failedSave: { source, ability, dc, original: save, effectId },
      checkpoint: {
        subject: structuredClone(afterRoll),
        tokenPosition: subjectToken === undefined ? null : { ...subjectToken.position },
        effects: structuredClone(checkpointEffects),
      },
    };
    context.state = {
      ...context.state,
      nextDecisionSequence: context.state.nextDecisionSequence + 1,
      pendingDecisions: [...context.state.pendingDecisions, decision],
    };
    emit(context, {
      type: 'pending_decision_queued', decisionId, combatant: target, kind: 'legendary_resistance',
    });
  }
  return save;
}

function spendLegendaryResistance(
  context: ReductionContext,
  target: CombatantId,
  source: CombatantId,
  ability: Ability,
  checkpoint?: Extract<PendingDecision, { readonly kind: 'legendary_resistance' }>['checkpoint'],
): void {
  const current = combatant(context.state, target);
  const legendary = current.legendary;
  if (legendary === undefined || legendary.resistanceUsesRemaining < 1) {
    throw new PendingDecisionRuleError('unknown_decision');
  }
  if (checkpoint !== undefined) {
    const touchesTarget = (effect: EncounterEffect): boolean =>
      effect.source === target || effect.targets.includes(target) || effect.concentrationOwner === target;
    context.state = {
      ...context.state,
      effects: [
        ...context.state.effects.filter((effect) => !touchesTarget(effect)),
        ...structuredClone(checkpoint.effects),
      ].sort((left, right) => left.createdRevision - right.createdRevision || String(left.id).localeCompare(String(right.id))),
      tokens: context.state.tokens.map((candidate) =>
        candidate.combatantId === target && checkpoint.tokenPosition !== null
          ? { ...candidate, position: { ...checkpoint.tokenPosition } }
          : candidate),
    };
  }
  const restored = checkpoint?.subject ?? current;
  const restoredLegendary = restored.legendary;
  if (restoredLegendary === undefined) throw new PendingDecisionRuleError('unknown_decision');
  const remaining = legendary.resistanceUsesRemaining - 1;
  context.state = replaceCombatant(context.state, {
    ...restored,
    legendary: { ...restoredLegendary, resistanceUsesRemaining: remaining },
  });
  emit(context, {
    type: 'legendary_resistance_used', combatant: target, source, ability,
    originalOutcome: 'failure', convertedOutcome: 'success', remaining,
  });
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
    'other',
  );
  if (result.outcome === 'failure') endConcentration(context, target, 'concentration_broken');
}

function assertActiveActor(context: ReductionContext, actor: CombatantId): EncounterCombatantState {
  if (context.state.activeCombatant !== actor) {
    throw new EncounterRuleError('validation', `Combatant ${actor} is not the active combatant.`);
  }
  const subject = combatant(context.state, actor);
  if (subject.life !== 'living') {
    throw new EncounterRuleError('validation', `Combatant ${actor} cannot act while ${subject.life}.`);
  }
  if (!isCombatantOnBoard(context.state, actor)) {
    throw new EncounterRuleError('validation', `Combatant ${actor} is absent from the board.`);
  }
  return subject;
}

function assertCanUseActions(context: ReductionContext, actor: CombatantId): void {
  if (isIncapacitated(combatantConditions(context.state, actor))) {
    throw new EncounterRuleError('validation', `Combatant ${actor} is Incapacitated.`);
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
    throw new EncounterRuleError('validation', `Combatant ${actor} has no action available.`);
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
        throw new EncounterRuleError('validation', `Combatant ${actor} has no Bonus Action available.`);
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
        throw new EncounterRuleError('validation', `Combatant ${actor} cannot react.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError('validation', `Combatant ${actor} has no Reaction available.`);
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
  const transforming = combatant(context.state, command.actor);
  if (
    transforming.form?.equipmentDisposition === 'merged_into_form' ||
    transforming.wildShape?.equipmentDisposition === 'merged_into_form'
  ) {
    throw new EquipmentRuleError(
      'form_equipment_unavailable',
      `Combatant ${command.actor}'s equipment is merged into its current form.`,
    );
  }
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
    throw new EncounterRuleError('validation', `Combatant ${actor} has no resource pool ${resourcePoolId}.`);
  }
  if (pool.remaining < 1) {
    throw new EncounterRuleError('validation', `Resource pool ${resourcePoolId} is empty.`);
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
    throw new EncounterRuleError('validation', `Combatant ${actor} has no feature effect ${effectId}.`);
  }
  return effect;
}

function attacksPerAction(subject: EncounterCombatantState): number {
  const overrides = (subject.profile.rules.featureEffects ?? []).flatMap((effect) =>
    effect.payload.kind === 'extra_attack_count_override'
      ? [effect.payload.attackCount]
      : []);
  return overrides.length === 0
    ? subject.wildShape?.physical.attacksPerAction ?? subject.profile.rules.attacksPerAction
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
      throw new EncounterRuleError('validation', `Effect ${grant.id} does not grant Bonus Action attacks.`);
    }
    if ((subject.turn.bonusAttacksRemaining ?? 0) > 0) {
      if (subject.turn.bonusAttackGrantEffectId !== grant.id) {
        throw new EncounterRuleError('validation', `Combatant ${actor} is already resolving another Bonus Action attack grant.`);
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
      throw new EncounterRuleError('validation', `Combatant ${actor} has no attack available.`);
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

function persistentAreaAnchorCell(state: EncounterState, area: PersistentArea): GridCell | null {
  const origin = area.origin;
  return origin.kind === 'anchored'
    ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
    : origin.kind === 'anchored_to_object'
      ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
      : null;
}

export const MOVEMENT_PATH_DANGER_KINDS = [
  'opportunity_attack',
  'burning_surface',
  'persistent_area_damage',
  'difficult_terrain',
] as const;

export type MovementPathDangerKind = (typeof MOVEMENT_PATH_DANGER_KINDS)[number];

export interface MovementPathDangerAnnotation {
  readonly cell: GridCell;
  readonly dangers: readonly MovementPathDangerKind[];
}

export interface MovementPathDangerPreview {
  readonly actor: CombatantId;
  /** Start cell followed by each entered cell in travel order. */
  readonly path: readonly GridCell[];
  readonly annotations: readonly MovementPathDangerAnnotation[];
}

function persistentAreaHasDamage(area: PersistentArea): boolean {
  return area.hooks.some((hook) => hook.effect.payload.kind === 'damage');
}

/**
 * DM-only movement preview derived by the same movement/OA eligibility used by
 * the reducer. It does not mutate state or consume RNG.
 */
export function previewMovementPathDangers(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): MovementPathDangerPreview {
  const mover = combatant(state, command.actor);
  const start = token(state, command.actor).position;
  const plan = planMovement(encounterMovementWorld(state), {
    actorId: command.actor,
    start,
    path: command.path,
    budgetRemaining: mover.turn.movement.remaining,
    cause: effectiveMovementCause(state, command),
    reachSources: opportunityAttackReachSources(state, command.actor),
  });
  if (plan.kind === 'illegal') {
    throw new EncounterRuleError('validation', `Illegal movement preview: ${plan.reason} at step ${String(plan.stepIndex)}.`);
  }

  const dangersByCell = new Map<string, {
    readonly cell: GridCell;
    readonly dangers: Set<MovementPathDangerKind>;
  }>();
  const add = (cell: GridCell, danger: MovementPathDangerKind): void => {
    const key = cellKey(cell);
    const existing = dangersByCell.get(key);
    if (existing === undefined) {
      dangersByCell.set(key, { cell: { ...cell }, dangers: new Set([danger]) });
    } else {
      existing.dangers.add(danger);
    }
  };

  for (const step of plan.steps) {
    if (step.beforeLeaving.some((window) => opportunityAttackWindowEligible(
      state,
      command.actor,
      window.reactorId,
    ))) add(step.from, 'opportunity_attack');

    if (state.persistentAreas.some((area) => area.burningCells.some(
      (burning) => cellKey(burning.cell) === cellKey(step.to),
    ))) add(step.to, 'burning_surface');

    if (state.persistentAreas.some((area) =>
      persistentAreaHasDamage(area) &&
      persistentAreaContains(area, step.to, persistentAreaAnchorCell(state, area), state))) {
      add(step.to, 'persistent_area_damage');
    }

    if (step.cost > feet(5)) add(step.to, 'difficult_terrain');
  }

  return {
    actor: command.actor,
    path: [{ ...start }, ...plan.steps.map((step) => ({ ...step.to }))],
    annotations: [...dangersByCell.values()].map((annotation) => ({
      cell: annotation.cell,
      dangers: MOVEMENT_PATH_DANGER_KINDS.filter((danger) => annotation.dangers.has(danger)),
    })),
  };
}

function effectiveIgnitionRule(
  state: EncounterState,
  area: PersistentArea,
): PersistentAreaIgnitionRule | null {
  const flammability = area.material?.flammability;
  if (flammability === undefined || flammability.kind === 'nonflammable') return null;
  if (flammability.kind === 'flammable') return flammability.ignition;
  return state.config.optionalRules?.includes(flammability.rule) === true
    ? flammability.ignition
    : null;
}

function areaHasBurningCell(area: PersistentArea, cell: GridCell): boolean {
  return area.burningCells.some((entry) => cellKey(entry.cell) === cellKey(cell));
}

/**
 * A damage resolution exposes only its target's occupied 5-foot cell. Web's
 * text says each exposed Cube burns; it supplies no adjacent-cell spread rule
 * (spell-descriptions.txt:8486-8489), so this deliberately does not traverse.
 */
function exposePersistentAreasAtDamageCell(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  damage: ReturnType<typeof resolveDamage>,
): void {
  if (!damage.terms.some((term) => term.type === 'Fire' && term.beforeResponse > 0)) return;
  const exposedCell = token(context.state, target).position;
  const initiativeIndex = context.state.activeInitiativeIndex;
  if (initiativeIndex === null) return;
  for (const snapshot of orderedAreas(context.state)) {
    const area = context.state.persistentAreas.find((candidate) => candidate.id === snapshot.id);
    if (
      area === undefined ||
      effectiveIgnitionRule(context.state, area) === null ||
      areaHasBurningCell(area, exposedCell) ||
      !persistentAreaContains(area, exposedCell, persistentAreaAnchorCell(context.state, area), context.state)
    ) continue;
    context.state = {
      ...context.state,
      persistentAreas: context.state.persistentAreas.map((candidate) => candidate.id === area.id
        ? {
            ...candidate,
            burningCells: [...candidate.burningCells, {
              cell: { ...exposedCell },
              burnsAwayAt: {
                round: context.state.round + 1,
                initiativeIndex,
              },
            }].sort((left, right) =>
              left.cell.row - right.cell.row || left.cell.column - right.cell.column),
          }
        : candidate),
    };
  }
  void source;
}

function applyBurningPersistentAreaDamage(
  context: ReductionContext,
  subjectId: CombatantId,
): void {
  if (!isCombatantOnBoard(context.state, subjectId)) return;
  const subjectCell = token(context.state, subjectId).position;
  for (const snapshot of orderedAreas(context.state)) {
    const area = context.state.persistentAreas.find((candidate) => candidate.id === snapshot.id);
    if (area === undefined || !areaHasBurningCell(area, subjectCell)) continue;
    const ignition = effectiveIgnitionRule(context.state, area);
    if (ignition === null) continue;
    const result = resolveTargetDamage(context, area.owner, subjectId, ignition.startOfTurnDamage);
    applyDamage(context, area.owner, subjectId, result.total);
    concentrationCheck(context, subjectId, result.total);
  }
}

function burnAwayExpiredPersistentAreaCells(context: ReductionContext): void {
  const initiativeIndex = context.state.activeInitiativeIndex;
  if (initiativeIndex === null) return;
  let changed = false;
  context.state = {
    ...context.state,
    persistentAreas: context.state.persistentAreas.map((area) => {
      const expired = area.burningCells.filter((entry) =>
        context.state.round > entry.burnsAwayAt.round ||
        (context.state.round === entry.burnsAwayAt.round && initiativeIndex >= entry.burnsAwayAt.initiativeIndex));
      if (expired.length === 0) return area;
      changed = true;
      const expiredKeys = new Set(expired.map((entry) => cellKey(entry.cell)));
      return {
        ...area,
        burningCells: area.burningCells.filter((entry) => !expiredKeys.has(cellKey(entry.cell))),
        burnedAwayCells: [...area.burnedAwayCells, ...expired.map((entry) => ({ ...entry.cell }))]
          .sort((left, right) => left.row - right.row || left.column - right.column),
      };
    }),
  };
  if (changed) reevaluatePersistentAreaMembership(context);
}

function areaTargetEligible(state: EncounterState, area: PersistentArea, target: CombatantId): boolean {
  switch (area.targetFilter.kind) {
    case 'all': return true;
    case 'selected': return area.targetFilter.combatants.includes(target);
    case 'allies': return combatantsAreAllies(state, target, area.owner);
    case 'enemies': return !combatantsAreAllies(state, target, area.owner);
  }
}

function areaMembers(state: EncounterState, area: PersistentArea): readonly CombatantId[] {
  const anchor = persistentAreaAnchorCell(state, area);
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
    throw new EncounterRuleError('validation', 'A save-ends area effect requires a save gate.');
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
  if (input.owner !== actor) throw new EncounterRuleError('validation', 'A persistent area must be owned by its acting combatant.');
  combatant(state, input.owner);
  if (!Number.isSafeInteger(input.duration.remaining) || input.duration.remaining < 1) {
    throw new EncounterRuleError('validation', 'Persistent-area duration must be a positive number of rounds.');
  }
  if (input.origin.kind === 'anchored') {
    token(state, input.origin.combatant);
    if (input.movable !== null) throw new EncounterRuleError('validation', 'An anchored persistent area cannot also be moved independently.');
  }
  if (input.origin.kind === 'anchored_to_object') {
    const anchorObjectId = input.origin.object;
    if (!state.worldObjects.some((object) => object.id === anchorObjectId)) {
      throw new EncounterRuleError('validation', `Persistent-area anchor object ${anchorObjectId} does not exist.`);
    }
    if (input.movable !== null) throw new EncounterRuleError('validation', 'An object-anchored persistent area cannot also be moved independently.');
  }
  if (input.targetFilter.kind === 'selected') {
    assertUnique(input.targetFilter.combatants, 'Persistent-area selected targets');
    for (const target of input.targetFilter.combatants) combatant(state, target);
  }
  for (const hook of input.hooks) {
    if (hook.effect.payload.kind === 'effect' && hook.effect.payload.lifetime.kind === 'fixed_rounds' &&
      (!Number.isSafeInteger(hook.effect.payload.lifetime.rounds) || hook.effect.payload.lifetime.rounds < 1)) {
      throw new EncounterRuleError('validation', 'A fixed persistent-area effect duration must be positive.');
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
    material: input.material === undefined ? null : structuredClone(input.material),
    burningCells: [],
    burnedAwayCells: [],
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

function endHidden(
  context: ReductionContext,
  subject: CombatantId,
  reason: 'attack_roll' | 'verbal_spell' | 'sound_louder_than_whisper' | 'stopped_hiding' | 'found',
  finder?: CombatantId,
): void {
  if (!combatantIsHidden(context.state, subject)) return;
  context.state = {
    ...context.state,
    hiddenCombatants: context.state.hiddenCombatants.filter((entry) => entry.combatant !== subject),
  };
  emit(context, {
    type: 'hidden_ended', combatant: subject, reason,
    ...(finder === undefined ? {} : { finder }),
  });
}

function perceptionMode(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
  reliance: 'sight' | 'hearing',
): RollMode {
  if (reliance === 'hearing') return 'normal';
  const modes: RollMode[] = ['normal'];
  if (effectiveCombatRules(state, observer).detectionTraits.includes('keen_sight')) {
    modes.push('advantage');
  }
  const subjectCell = token(state, subject).position;
  const light = environmentLightAt(state.environment, subjectCell);
  const obscurement = environmentObscurementAt(state.environment, subjectCell);
  // Lightly Obscured sight checks have Disadvantage: docs/srd/full/srd-5.2.1.txt:656-660.
  // Dim Light creates Light Obscurement: docs/srd/full/srd-5.2.1.txt:673-678.
  if (light === 'dim' || obscurement === 'light') modes.push('disadvantage');
  return combineRollModes(modes);
}

function passivePerceptionAgainst(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): number {
  const rules = effectiveCombatRules(state, observer);
  const mode = perceptionMode(state, observer, subject, 'sight');
  // Passive +/-5: docs/srd/full/srd-5.2.1.txt:11965-11979 (2024) and
  // docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:4470-4488 (2014).
  return rules.passivePerception + (mode === 'advantage' ? 5 : mode === 'disadvantage' ? -5 : 0);
}

function processHide(context: ReductionContext, actor: CombatantId): void {
  assertActiveActor(context, actor);
  assertCanUseActions(context, actor);
  spendAction(context, actor, 'Hide');
  const enemies = context.state.combatants.filter((candidate) =>
    candidate.life === 'living' && !combatantsAreAllies(context.state, actor, candidate.profile.id));
  const actorCell = token(context.state, actor).position;
  const outOfEnemySight = enemies.every((enemy) => !canCombatantSee(context.state, enemy.profile.id, actor));
  const obscurement = environmentObscurementAt(context.state.environment, actorCell);
  const heavilyObscured =
    obscurement === 'heavy' || obscurement === 'magical_darkness' ||
    environmentLightAt(context.state.environment, actorCell) === 'darkness';
  const behindCover = enemies.length > 0 && enemies.every((enemy) => {
    const cover = coverTierBetween(
      context.state,
      token(context.state, enemy.profile.id).position,
      actorCell,
    );
    return cover === 'three_quarters' || cover === 'total';
  });
  const validPosition = context.state.rulesEdition === '2014'
    ? outOfEnemySight
    : outOfEnemySight && (heavilyObscured || behindCover);
  if (!validPosition) {
    emit(context, {
      type: 'hide_resolved', combatant: actor, edition: context.state.rulesEdition,
      total: 0, outcome: 'invalid_position',
    });
    return;
  }
  const roll = rollD20(context.rng, 'normal');
  const total = roll.chosen + (effectiveCombatRules(context.state, actor).skillBonuses?.stealth ?? 0);
  // 2024 fixed gate: docs/srd/full/srd-5.2.1.txt:11774-11784.
  if (context.state.rulesEdition === '2024' && total < 15) {
    emit(context, { type: 'hide_resolved', combatant: actor, edition: '2024', total, outcome: 'failed_dc' });
    return;
  }
  context.state = {
    ...context.state,
    hiddenCombatants: [
      ...context.state.hiddenCombatants.filter((entry) => entry.combatant !== actor),
      { combatant: actor, stealthTotal: total, edition: context.state.rulesEdition },
    ],
  };
  const finder = enemies.find((enemy) => {
    const detection = detectCombatant(context.state, enemy.profile.id, actor);
    return detection.kind === 'located' || passivePerceptionAgainst(
      context.state, enemy.profile.id, actor,
    ) >= total;
  });
  if (finder !== undefined) {
    context.state = {
      ...context.state,
      hiddenCombatants: context.state.hiddenCombatants.filter((entry) => entry.combatant !== actor),
    };
    emit(context, {
      type: 'hide_resolved', combatant: actor, edition: context.state.rulesEdition,
      total, outcome: 'passively_detected',
    });
    return;
  }
  emit(context, {
    type: 'hide_resolved', combatant: actor, edition: context.state.rulesEdition,
    total, outcome: 'hidden',
  });
}

function processSearch(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'search' }>,
): void {
  assertActiveActor(context, command.actor);
  assertCanUseActions(context, command.actor);
  spendAction(context, command.actor, 'Search');
  const hidden = context.state.hiddenCombatants.find((entry) => entry.combatant === command.target);
  if (hidden === undefined) {
    emit(context, {
      type: 'search_resolved', combatant: command.actor, target: command.target,
      total: 0, outcome: 'target_not_hidden',
    });
    return;
  }
  const roll = rollD20(context.rng, perceptionMode(
    context.state, command.actor, command.target, command.reliance,
  ));
  const total = roll.chosen + (effectiveCombatRules(context.state, command.actor).skillBonuses?.perception ?? 0);
  const found = total >= hidden.stealthTotal;
  emit(context, {
    type: 'search_resolved', combatant: command.actor, target: command.target,
    total, outcome: found ? 'found' : 'not_found',
  });
  if (found) endHidden(context, command.target, 'found', command.actor);
}

function reactionPolicyFor(
  state: EncounterState,
  combatantId: CombatantId,
  reactionKind: DecisionPolicyKind,
): ReactionPolicy {
  return state.reactionPolicies.find((entry) =>
    entry.combatant === combatantId && entry.reactionKind === reactionKind)?.policy ?? 'ask';
}

function defaultOpportunityAttack(
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'opportunity_attack' }> {
  return {
    type: 'opportunity_attack', actor, target, attackBonus: 0, criticalFloor: 20,
    rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    requiresSight: true,
    damage: {
      terms: [{
        type: damageType('Bludgeoning'),
        dice: { count: 0, sides: dieSides(4), modifier: 1 },
      }],
      critical: false,
      responses: [],
    },
  };
}

interface OpportunityAttackTrigger {
  readonly mover: CombatantId;
  readonly from: GridCell;
  readonly to: GridCell;
}

function opportunityAttackReachSources(
  state: EncounterState,
  mover: CombatantId,
): readonly import('./movement').ReachSource<CombatantId>[] {
  return state.combatants
    .filter((candidate) =>
      candidate.life === 'living' &&
      !combatantsAreAllies(state, candidate.profile.id, mover) &&
      candidate.profile.id !== mover)
    .map((candidate) => ({
      reactorId: candidate.profile.id,
      cell: token(state, candidate.profile.id).position,
      reach: effectiveCombatRules(state, candidate.profile.id).reach,
      reactionAvailable: candidate.turn.reactionAvailable,
      hostile: true,
    }));
}

function effectiveMovementCause(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): import('./movement').MovementCause {
  const subject = combatant(state, command.actor);
  return (command.cause === 'voluntary' && subject.turn.disengaging) ||
    command.cause === 'reactions_resolved'
    ? 'disengaged'
    : command.cause;
}

function opportunityAttackWindowEligible(
  state: EncounterState,
  mover: CombatantId,
  reactor: CombatantId,
): boolean {
  // Opportunity Attack trigger, sight gate, timing, and exemptions:
  // docs/srd/full/srd-5.2.1.txt:933-956.
  return !effectiveCombatRules(state, mover).detectionTraits.includes('flyby') &&
    canCombatantSee(state, reactor, mover) &&
    !state.effects.some((effect) =>
      effect.targets.includes(reactor) && effect.payload.kind === 'opportunity_attacks_disabled');
}

function queueOpportunityAttack(
  context: ReductionContext,
  reactor: CombatantId,
  trigger: OpportunityAttackTrigger,
  command: Extract<EncounterCommand, { readonly type: 'opportunity_attack' }>,
): void {
  if (context.state.eventLog.some((event) =>
    event.type === 'pending_decision_resolved' &&
    event.kind === 'reaction_offer' && event.reactionKind === 'opportunity_attack' &&
    event.combatant === reactor &&
    event.boundary.activeCombatant === trigger.mover && event.boundary.round === context.state.round)) return;
  if (context.state.pendingDecisions.some((decision) =>
    decision.kind === 'reaction_offer' &&
    decision.combatant === reactor && decision.reactionKind === 'opportunity_attack' &&
    decision.boundary.activeCombatant === trigger.mover && decision.boundary.round === context.state.round)) return;
  const id = `decision:${String(context.state.nextDecisionSequence)}`;
  const decision: PendingDecision = {
    id,
    combatant: reactor,
    kind: 'reaction_offer',
    reactionKind: 'opportunity_attack',
    options: [
      { id: 'accept', label: 'Make Opportunity Attack' },
      { id: 'decline', label: 'Decline' },
    ],
    boundary: { activeCombatant: trigger.mover, round: context.state.round },
    opportunityAttack: {
      mover: trigger.mover,
      from: { ...trigger.from },
      to: { ...trigger.to },
      command: structuredClone(command),
    },
  };
  context.state = {
    ...context.state,
    nextDecisionSequence: context.state.nextDecisionSequence + 1,
    pendingDecisions: [...context.state.pendingDecisions, decision],
  };
  emit(context, {
    type: 'pending_decision_queued', decisionId: id, combatant: reactor,
    kind: 'reaction_offer', reactionKind: 'opportunity_attack',
  });
}

function legendaryActionTarget(state: EncounterState, actor: CombatantId): CombatantId | null {
  if (!isCombatantOnBoard(state, actor)) return null;
  const origin = token(state, actor).position;
  return state.combatants
    .filter((candidate) =>
      candidate.profile.id !== actor && candidate.life === 'living' &&
      isCombatantOnBoard(state, candidate.profile.id) &&
      !combatantsAreAllies(state, actor, candidate.profile.id))
    .sort((left, right) =>
      gridDistance(origin, token(state, left.profile.id).position) -
        gridDistance(origin, token(state, right.profile.id).position) ||
      String(left.profile.id).localeCompare(String(right.profile.id)))[0]?.profile.id ?? null;
}

function moveForLegendaryAction(
  context: ReductionContext,
  actor: CombatantId,
  target: CombatantId,
  action: Extract<MonsterLegendaryAction, { readonly kind: 'move_and_attack' }>,
): void {
  const start = token(context.state, actor).position;
  const targetPosition = token(context.state, target).position;
  const maximumCost = feet(action.movement === 'half_speed'
    ? Math.floor(effectiveCombatRules(context.state, actor).speed / 2)
    : effectiveCombatRules(context.state, actor).speed);
  const candidates = adjacentCells(context.state.bounds, targetPosition)
    .filter((cell) => !context.state.tokens.some((candidate) =>
      candidate.combatantId !== actor && cellKey(candidate.position) === cellKey(cell)))
    .map((goal) => findPath(encounterMovementWorld(context.state), { actorId: actor, start, goal, maximumCost }))
    .filter((result) => result.kind === 'found')
    .sort((left, right) => left.cost - right.cost || left.cells.length - right.cells.length);
  const path = candidates[0];
  if (gridDistance(start, targetPosition) <= effectiveCombatRules(context.state, actor).reach) return;
  if (path === undefined || path.kind !== 'found') {
    throw new EncounterRuleError('validation', `Legendary Action ${action.id} cannot reach an enemy.`);
  }
  for (const step of path.cells) {
    context.state = {
      ...context.state,
      tokens: context.state.tokens.map((candidate) => candidate.combatantId === actor
        ? { ...candidate, position: { ...step } }
        : candidate),
    };
    processEnteredCell(context, actor);
    if (combatant(context.state, actor).life !== 'living') break;
  }
  emit(context, {
    type: 'movement_completed', combatant: actor, path: path.cells,
    spent: path.cost, remaining: combatant(context.state, actor).turn.movement.remaining,
  });
}

function executeLegendaryAction(
  context: ReductionContext,
  actor: CombatantId,
  action: MonsterLegendaryAction,
): void {
  const subject = combatant(context.state, actor);
  const legendary = subject.legendary;
  if (legendary === undefined || legendary.actionUsesRemaining < action.cost) {
    throw new PendingDecisionRuleError('unknown_decision');
  }
  const remaining = legendary.actionUsesRemaining - action.cost;
  context.state = replaceCombatant(context.state, {
    ...subject,
    legendary: { ...legendary, actionUsesRemaining: remaining },
  });
  emit(context, {
    type: 'legendary_action_used', combatant: actor, actionId: action.id, cost: action.cost, remaining,
  });
  if (action.kind === 'temporary_defense') {
    const amount = rollDice(context.rng, {
      ...action.temporaryHitPoints,
      sides: dieSides(action.temporaryHitPoints.sides),
    }).total;
    grantTemporaryHitPoints(context, actor, amount);
    applyEffect(context, actor, {
      targets: [actor],
      duration: {
        kind: 'turn_boundaries',
        timing: { combatant: actor, boundary: 'end', source: 'docs/srd/full/srd-5.2.1.txt:22006-22009' },
        remaining: 1,
      },
      concentration: false,
      stackingIdentity: effectStackingIdentity(`legendary:${action.id}:armor-class`),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: { kind: 'armor_class_modifier', amount: action.armorClassBonus },
    });
    return;
  }
  const target = legendaryActionTarget(context.state, actor);
  if (target === null) throw new EncounterRuleError('validation', `Legendary Action ${action.id} has no enemy target.`);
  moveForLegendaryAction(context, actor, target, action);
  const attack = declaredMonsterAction(context.state, actor, action.attackId);
  if (attack.kind !== 'attack') throw new EncounterRuleError('validation', `Legendary Action ${action.id} must reference an attack.`);
  processAttack(context, monsterAttackCommand(attack, actor, target), null, 'legendary');
}

function legendaryActionAvailable(
  state: EncounterState,
  actor: CombatantId,
  action: MonsterLegendaryAction,
): boolean {
  if (action.kind === 'temporary_defense') return true;
  const target = legendaryActionTarget(state, actor);
  if (target === null) return false;
  const start = token(state, actor).position;
  const targetPosition = token(state, target).position;
  if (gridDistance(start, targetPosition) <= effectiveCombatRules(state, actor).reach) return true;
  const maximumCost = feet(action.movement === 'half_speed'
    ? Math.floor(effectiveCombatRules(state, actor).speed / 2)
    : effectiveCombatRules(state, actor).speed);
  return adjacentCells(state.bounds, targetPosition)
    .filter((cell) => !state.tokens.some((candidate) =>
      candidate.combatantId !== actor && cellKey(candidate.position) === cellKey(cell)))
    .some((goal) => findPath(
      encounterMovementWorld(state),
      { actorId: actor, start, goal, maximumCost },
    ).kind === 'found');
}

function queueLegendaryActionWindows(context: ReductionContext, activeCombatant: CombatantId): boolean {
  let queued = false;
  for (const subject of context.state.combatants) {
    const actor = subject.profile.id;
    const pool = subject.legendary;
    const actions = subject.profile.rules.legendary?.actions ?? [];
    if (
      actor === activeCombatant || subject.life !== 'living' || pool === undefined ||
      pool.actionUsesRemaining < 1 || !isCombatantOnBoard(context.state, actor) ||
      isIncapacitated(combatantConditions(context.state, actor))
    ) continue;
    const alreadyHandled = context.state.eventLog.some((event) =>
      event.type === 'legendary_action_window_closed' && event.combatant === actor &&
      event.activeCombatant === activeCombatant && event.round === context.state.round);
    const alreadyPending = context.state.pendingDecisions.some((decision) =>
      decision.kind === 'legendary_action_window' && decision.combatant === actor &&
      decision.boundary.activeCombatant === activeCombatant && decision.boundary.round === context.state.round);
    if (alreadyHandled || alreadyPending) continue;
    const affordable = actions.filter((action) =>
      action.cost <= pool.actionUsesRemaining &&
      legendaryActionAvailable(context.state, actor, action));
    if (affordable.length === 0) continue;
    const id = `decision:${String(context.state.nextDecisionSequence)}`;
    const options: Extract<PendingDecision, { readonly kind: 'legendary_action_window' }>['options'] = [
      ...affordable.map((action) => ({
        id: `legendary_action:${action.id}` as const,
        label: `${action.name} (${String(action.cost)} ${action.cost === 1 ? 'use' : 'uses'})`,
      })),
      { id: 'pass', label: 'Pass' },
    ];
    const decision: PendingDecision = {
      id, combatant: actor, kind: 'legendary_action_window', options,
      boundary: { activeCombatant, round: context.state.round },
    };
    context.state = {
      ...context.state,
      nextDecisionSequence: context.state.nextDecisionSequence + 1,
      pendingDecisions: [...context.state.pendingDecisions, decision],
    };
    emit(context, { type: 'pending_decision_queued', decisionId: id, combatant: actor, kind: 'legendary_action_window' });
    queued = true;
  }
  return queued;
}

function processMove(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): void {
  const subject = assertActiveActor(context, command.actor);
  assertCanUseActions(context, command.actor);
  const actorToken = token(context.state, command.actor);
  const plan = planMovement(encounterMovementWorld(context.state), {
    actorId: command.actor,
    start: actorToken.position,
    path: command.path,
    budgetRemaining: subject.turn.movement.remaining,
    cause: effectiveMovementCause(context.state, command),
    reachSources: opportunityAttackReachSources(context.state, command.actor),
  });
  if (plan.kind === 'illegal') {
    throw new EncounterRuleError('validation', `Illegal movement: ${plan.reason} at step ${plan.stepIndex}.`);
  }
  const traversed: GridCell[] = [];
  let spent = feet(0);
  for (const step of plan.steps) {
    for (const window of step.beforeLeaving) {
      const reactor = combatant(context.state, window.reactorId);
      if (!opportunityAttackWindowEligible(
        context.state,
        command.actor,
        window.reactorId,
      )) continue;
      const trigger: OpportunityAttackTrigger = {
        mover: command.actor, from: { ...step.from }, to: { ...step.to },
      };
      const executableOpportunityAttack = command.executableOpportunityAttacks === undefined
        ? defaultOpportunityAttack(window.reactorId, command.actor)
        : command.executableOpportunityAttacks.find((candidate) =>
            candidate.actor === window.reactorId && candidate.target === command.actor);
      if (executableOpportunityAttack === undefined) continue;
      const policy = reactionPolicyFor(context.state, window.reactorId, 'opportunity_attack');
      if (policy === 'never') {
        emit(context, {
          type: 'reaction_policy_auto_resolved', combatant: window.reactorId,
          reactionKind: 'opportunity_attack', policy, resolution: 'decline', autoFired: false,
        });
        continue;
      }
      if (policy === 'always') {
        emit(context, {
          type: 'reaction_policy_auto_resolved', combatant: window.reactorId,
          reactionKind: 'opportunity_attack', policy, resolution: 'accept', autoFired: true,
        });
        processAttack(context, executableOpportunityAttack, trigger);
        if (combatant(context.state, command.actor).life !== 'living') break;
        continue;
      }
      if (reactor.turn.reactionAvailable) {
        queueOpportunityAttack(context, window.reactorId, trigger, executableOpportunityAttack);
      }
    }
    if (combatant(context.state, command.actor).life !== 'living') break;
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
  triggerRollDefenseMovementEvents(context, command.actor);
}

/** Reuses the event-trigger lifecycle: movement materializes a one-boundary flat adjustment. */
function triggerRollDefenseMovementEvents(
  context: ReductionContext,
  mover: CombatantId,
): void {
  const triggers = context.state.effects.filter((effect): effect is RollDefenseEffect =>
    effect.payload.kind === 'roll_defense_modifier' &&
    effect.targets.includes(mover) &&
    effect.payload.eventTrigger?.hook === 'effect_target_moves');
  for (const parent of triggers) {
    const eventTrigger = parent.payload.eventTrigger;
    if (eventTrigger === undefined) continue;
    const childId = applyEffect(context, parent.source, {
      targets: [mover],
      duration: {
        kind: 'turn_boundaries',
        timing: {
          combatant: mover,
          boundary: 'start',
          source: 'roll_defense_modifier.event_trigger.effect_target_moves',
        },
        remaining: eventTrigger.duration.rounds,
      },
      concentration: false,
      stackingIdentity: effectStackingIdentity(`roll-defense-event:${String(parent.id)}:${String(mover)}`),
      stacking: 'replace_any_source',
      repeatedSave: null,
      payload: {
        kind: 'roll_defense_modifier',
        scopes: [...parent.payload.scopes],
        eligibility: { kind: 'effect_targets' },
        consumption: 'duration',
        modifier: { kind: 'flat', amount: eventTrigger.flatAdjustment },
      },
    });
    if (parent.concentrationOwner !== null) {
      context.state = {
        ...context.state,
        effects: context.state.effects.map((effect) => effect.id === childId
          ? { ...effect, concentrationOwner: parent.concentrationOwner }
          : effect),
      };
    }
  }
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
    const dependents = context.state.effects.filter((candidate) =>
      candidate.parentEffectId === effectId && candidate.targets.includes(target));
    for (const dependent of dependents) {
      removeEffectTarget(context, dependent.id, target, reason);
    }
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
    throw new EncounterRuleError('rule_gap', `Sustained spell ${effect.payload.spellId} is not implemented.`);
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
  if (boundary === 'start') applyBurningPersistentAreaDamage(context, subjectId);
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
    if (definition === null) throw new EncounterRuleError('rule_gap', `Scheduled spell ${scheduled.spellId} is not implemented.`);
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
              throw new EncounterRuleError('validation', `${definition.name} has an invalid delayed one-shot clock.`);
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
    burnAwayExpiredPersistentAreaCells(context);
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
  if (effect.targets.length === 0) throw new EncounterRuleError('validation', 'An effect requires a target.');
  assertUnique(effect.targets, 'Effect targets');
  for (const target of effect.targets) combatant(state, target);
  if (effect.duration.kind === 'turn_boundaries') {
    combatant(state, effect.duration.timing.combatant);
    if (!Number.isSafeInteger(effect.duration.remaining) || effect.duration.remaining < 1) {
      throw new EncounterRuleError('validation', 'Effect duration remaining must be a positive safe integer.');
    }
    if (effect.duration.timing.source.trim().length === 0) {
      throw new EncounterRuleError('validation', 'Effect duration timing requires a source locator.');
    }
  }
  if (effect.repeatedSave !== null) {
    combatant(state, effect.repeatedSave.timing.combatant);
    if (!effect.targets.includes(effect.repeatedSave.timing.combatant)) {
      throw new EncounterRuleError('validation', 'Repeated-save timing must name an effect target.');
    }
    difficultyClass(effect.repeatedSave.dc);
    if (effect.repeatedSave.timing.source.trim().length === 0) {
      throw new EncounterRuleError('validation', 'Repeated-save timing requires a source locator.');
    }
  }
  if (effect.escapeCheck !== undefined) {
    difficultyClass(effect.escapeCheck.dc);
  }
  if (effect.parentEffectId !== undefined) {
    const parent = state.effects.find((candidate) => candidate.id === effect.parentEffectId);
    if (parent === undefined) throw new EncounterRuleError('validation', 'A dependent effect requires a live parent effect.');
    if (effect.targets.some((target) => !parent.targets.includes(target))) {
      throw new EncounterRuleError('validation', 'A dependent effect target must belong to its parent effect.');
    }
  }
  if (
    effect.payload.kind === 'ongoing_damage' &&
    (!effect.targets.includes(effect.payload.timing.combatant) ||
      effect.payload.timing.source.trim().length === 0)
  ) {
    throw new EncounterRuleError('validation', 
      'Ongoing-damage timing requires a target and source locator.',
    );
  }
  if (
    effect.payload.kind === 'recurring_damage_operation' &&
    (!effect.targets.includes(effect.payload.timing.combatant) ||
      effect.payload.timing.source.trim().length === 0)
  ) {
    throw new EncounterRuleError('validation', 
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
      case 'summon_lifecycle':
      case 'condition':
      case 'exhaustion':
      case 'ability_check_modifier':
      case 'skill_modifier':
      case 'armor_class_modifier':
      case 'roll_defense_modifier':
      case 'attack_roll_modifier':
      case 'attack_roll_mode_modifier':
      case 'faerie_fire':
      case 'consumable_healing_pool':
      case 'healing_potion':
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
    ...(application.ownedCombatants === undefined
      ? {}
      : { ownedCombatants: [...application.ownedCombatants] }),
    duration,
    repeatedSave,
    ...(application.escapeCheck === undefined
      ? {}
      : { escapeCheck: { ...application.escapeCheck } }),
    ...(application.parentEffectId === undefined
      ? {}
      : { parentEffectId: application.parentEffectId }),
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
): EncounterEffectId {
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
    ...(owned.escapeCheck === undefined ? {} : { escapeCheck: owned.escapeCheck }),
    ...(owned.parentEffectId === undefined ? {} : { parentEffectId: owned.parentEffectId }),
    damageBreak: owned.damageBreak ?? null,
    payload: owned.payload,
    ...(owned.ownedCombatants === undefined
      ? {}
      : { ownedCombatants: [...owned.ownedCombatants] }),
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
      if (effectiveCombatRules(context.state, target).conditionImmunities.includes(owned.payload.condition)) {
        removeEffectTarget(context, id, target, 'condition_immunity');
        targets = targets.filter((candidate) => candidate !== target);
      }
    }
  }
  if (owned.payload.kind === 'ensnaring_strike') {
    for (const target of [...targets]) {
      if (effectiveCombatRules(context.state, target).conditionImmunities.includes('Restrained')) {
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
      throw new EncounterRuleError('validation', 'Temporary banishment requires exactly one target.');
    }
    const target = targets[0];
    if (target === undefined) throw new EncounterRuleError('validation', 'Temporary banishment requires a target.');
    const removed = context.state.tokens.find((candidate) => candidate.combatantId === target);
    if (removed === undefined) throw new EncounterRuleError('validation', `Combatant ${target} is already absent from the board.`);
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
      revertWildShape(context, target, 'death');
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
      revertWildShape(context, target, 'incapacitated');
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
  return id;
}

function startTurn(context: ReductionContext, id: CombatantId, round: number): void {
  context.state = { ...context.state, activeCombatant: id, round };
  revertExpiredWildShapes(context, round);
  const entering = combatant(context.state, id);
  if (entering.legendary !== undefined && entering.legendary.actionUsesMaximum > 0) {
    context.state = replaceCombatant(context.state, {
      ...entering,
      legendary: {
        ...entering.legendary,
        actionUsesRemaining: entering.legendary.actionUsesMaximum,
      },
    });
    emit(context, {
      type: 'legendary_action_pool_refreshed', combatant: id,
      remaining: entering.legendary.actionUsesMaximum,
    });
  }
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
  queueDeathSave(context, id);
}

function hasAdjacentAlly(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): boolean {
  return state.combatants.some((candidate) =>
    candidate.profile.id !== actor &&
    combatantsAreAllies(state, candidate.profile.id, actor) &&
    candidate.life === 'living' &&
    gridDistance(token(state, candidate.profile.id).position, token(state, target).position) <= 5);
}

function selectedSlotLevel(
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
  effectId: EncounterEffectId,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null {
  const selections = command.riderSelections ?? [];
  if (new Set(selections.map((selection) => selection.effectId)).size !== selections.length) {
    throw new EncounterRuleError('validation', 'Attack rider selections must name unique effects.');
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
  const slot = subject.spellSlots.find((candidate) =>
    candidate.level === slotLevel && (candidate.recharge ?? 'long_rest') === 'long_rest');
  if (slot === undefined || slot.remaining < 1) {
    throw new EncounterRuleError('validation', `Combatant ${actor} has no level-${String(slotLevel)} spell slot remaining.`);
  }
  const remaining = slot.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    spellSlots: subject.spellSlots.map((candidate) =>
      candidate.level === slotLevel && (candidate.recharge ?? 'long_rest') === 'long_rest'
        ? { ...candidate, remaining }
        : candidate),
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
      throw new EncounterRuleError('validation', 'This attack requires a declared damage-type selection.');
    }
    return null;
  }
  const effect = featureEffect(state, command.actor, command.damageTypeSelection.effectId);
  if (
    effect.payload.kind !== 'attack_damage_type_choice' ||
    command.attackId !== effect.payload.attackId ||
    !effect.payload.options.includes(command.damageTypeSelection.damageType)
  ) {
    throw new EncounterRuleError('validation', 'Attack damage-type selection is not declared for this attack.');
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
    throw new EncounterRuleError('validation', `Effect ${effect.id} is not a resource-die maneuver.`);
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

function applyWeaponMastery(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  mastery: NonNullable<Extract<EncounterCommand, { readonly type: 'attack' }>['weaponMastery']>,
  damageTaken: number,
): void {
  if (combatant(context.state, target).life === 'dead') return;
  switch (mastery.property) {
    case 'Slow':
      // Slow reduces Speed by 10 feet until the start of the attacker's next
      // turn, and repeated Slow properties never exceed that reduction:
      // docs/srd/full/srd-5.2.1.txt:766; weapon table at :12807.
      if (damageTaken === 0) return;
      applyEffect(context, source, {
        targets: [target],
        duration: {
          kind: 'turn_boundaries',
          timing: { combatant: source, boundary: 'start', source: 'weapon-mastery:slow' },
          remaining: 1,
        },
        concentration: false,
        stackingIdentity: effectStackingIdentity(`weapon-mastery:slow:${String(target)}`),
        stacking: 'replace_any_source',
        repeatedSave: null,
        payload: {
          kind: 'movement_modifier',
          speedChange: { kind: 'reduce', reduction: { kind: 'feet', feet: 10 } },
          modeGrants: [],
          difficultTerrainImmunity: false,
          magicalSpeedReductionImmunity: false,
        },
      });
      return;
    case 'Topple': {
      // Topple forces a Constitution save at DC 8 + the attack ability
      // modifier + Proficiency Bonus and applies Prone on failure:
      // docs/srd/full/srd-5.2.1.txt:12807.
      const save = resolveTargetSave(
        context,
        source,
        target,
        'constitution',
        mastery.saveDc,
        'normal',
        null,
        'other',
      );
      if (save.outcome === 'success') return;
      applyEffect(context, source, {
        targets: [target],
        duration: { kind: 'permanent' },
        concentration: false,
        stackingIdentity: effectStackingIdentity(`weapon-mastery:topple:${String(target)}`),
        stacking: 'replace_any_source',
        repeatedSave: null,
        payload: { kind: 'condition', condition: 'Prone' },
      });
      return;
    }
  }
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

function monsterEffectDuration(
  actor: CombatantId,
  target: CombatantId,
  duration: MonsterEffectDuration | null,
  source: string,
): EffectDurationClock {
  switch (duration) {
    case null:
    case 'until_escape':
      return { kind: 'permanent' };
    case 'until_end_of_monster_next_turn':
      return {
        kind: 'turn_boundaries',
        timing: { combatant: actor, boundary: 'end', source },
        remaining: 1,
      };
    case 'until_end_of_target_next_turn':
      return {
        kind: 'turn_boundaries',
        timing: { combatant: target, boundary: 'end', source },
        remaining: 1,
      };
    case 'until_start_of_monster_next_turn':
      return {
        kind: 'turn_boundaries',
        timing: { combatant: actor, boundary: 'start', source },
        remaining: 1,
      };
  }
}

function monsterTriggerApplies(
  context: ReductionContext,
  target: CombatantId,
  trigger: MonsterDamageTrigger,
  attackRollMode: RollMode | null,
): boolean {
  switch (trigger.kind) {
    case 'always':
      return true;
    case 'attack_roll_advantage':
      if (attackRollMode === null) {
        throw new EncounterRuleError('validation', 'An attack-roll-advantage monster effect requires an attack roll.');
      }
      return attackRollMode === 'advantage';
    case 'replaces_base_when_target_bloodied': {
      const subject = combatant(context.state, target);
      return subject.hitPoints < effectiveHitPointMaximum(context.state, target);
    }
    case 'charge':
      throw new EncounterRuleError('validation', 
        'A charge-triggered monster on-hit effect cannot execute until straight-line movement is reducer-owned.',
      );
  }
}

function monsterEffectTargetIsEligible(
  context: ReductionContext,
  target: CombatantId,
  effect: Extract<MonsterOnHitEffect, { readonly kind: 'condition' }>,
): boolean {
  const rules = effectiveCombatRules(context.state, target);
  if (effect.target.maximumSize !== null) {
    if (rules.sizeCategory === undefined) {
      throw new EncounterRuleError('validation', `Monster on-hit size eligibility requires a known size for ${target}.`);
    }
    const targetIndex = creatureSizes.indexOf(rules.sizeCategory);
    const maximumIndex = creatureSizes.findIndex((size) => size === effect.target.maximumSize);
    if (maximumIndex < 0) {
      throw new EncounterRuleError('validation', `Monster on-hit maximum size ${effect.target.maximumSize} is not mechanically known.`);
    }
    if (targetIndex > maximumIndex) return false;
  }
  for (const excluded of effect.target.excludedKinds) {
    switch (excluded) {
      case 'Undead':
        if (rules.creatureType === undefined) {
          throw new EncounterRuleError('validation', `Monster on-hit creature-type eligibility requires a known type for ${target}.`);
        }
        if (rules.creatureType === 'Undead') return false;
        break;
      case 'Elf':
        if (rules.creatureType === 'Elf') return false;
        if (rules.creatureType === undefined || rules.creatureType === 'Humanoid') {
          throw new EncounterRuleError('unmodeled_interaction', 'The Elf monster-effect exclusion has no landed target discriminator.');
        }
        break;
    }
  }
  return true;
}

function monsterDamageRequest(
  effect: Extract<MonsterOnHitEffect, { readonly kind: 'condition_bound_ongoing_damage' }>,
): DamageRequest {
  return {
    terms: [{
      type: damageType(effect.damage.type),
      dice: {
        count: effect.damage.dice.count,
        sides: dieSides(effect.damage.dice.sides),
        modifier: effect.damage.dice.modifier,
      },
    }],
    critical: false,
    responses: [],
  };
}

function applyMonsterOnHitEffects(
  context: ReductionContext,
  actor: CombatantId,
  target: CombatantId,
  actionId: string,
  effects: readonly MonsterOnHitEffect[],
  attackRollMode: RollMode | null,
  damageTaken: number,
): void {
  for (const effect of effects) {
    if (
      effect.kind === 'condition_bound_ongoing_damage' &&
      !effects.some((candidate) =>
        candidate.kind === 'condition' && candidate.condition === effect.boundCondition)
    ) {
      throw new EncounterRuleError('validation', 
        `Monster ongoing damage names ${effect.boundCondition} without declaring that condition on the action.`,
      );
    }
  }

  const conditionEffects = new Map<string, EncounterEffectId>();
  const execute = (effect: MonsterOnHitEffect, index: number): void => {
    const source = `monster:${actionId}:on-hit:${String(index)}`;
    switch (effect.kind) {
      case 'condition': {
        if (!monsterTriggerApplies(context, target, effect.trigger, attackRollMode)) return;
        if (!monsterEffectTargetIsEligible(context, target, effect)) return;
        if (effect.savingThrow !== null) {
          const save = resolveTargetSave(
            context,
            actor,
            target,
            effect.savingThrow.ability,
            effect.savingThrow.dc,
            'normal',
            null,
            'other',
          );
          if (save.outcome === 'success') return;
        }
        const id = applyEffect(context, actor, {
          targets: [target],
          duration: monsterEffectDuration(actor, target, effect.duration, source),
          concentration: false,
          stackingIdentity: effectStackingIdentity(`${source}:${effect.condition}`),
          stacking: 'replace_same_source',
          repeatedSave: null,
          ...(effect.escapeDc === null
            ? {}
            : {
                escapeCheck: {
                  ability: 'strength' as const,
                  skill: 'athletics' as const,
                  dc: effect.escapeDc,
                },
              }),
          payload: { kind: 'condition', condition: effect.condition },
        });
        if (context.state.effects.some((candidate) =>
          candidate.id === id && candidate.targets.includes(target))) {
          conditionEffects.set(effect.condition, id);
        }
        return;
      }
      case 'condition_bound_ongoing_damage': {
        if (!monsterTriggerApplies(context, target, effect.damage.trigger, attackRollMode)) return;
        const parentEffectId = conditionEffects.get(effect.boundCondition);
        if (parentEffectId === undefined) return;
        applyEffect(context, actor, {
          targets: [target],
          duration: { kind: 'permanent' },
          concentration: false,
          stackingIdentity: effectStackingIdentity(`${source}:${effect.boundCondition}:ongoing-damage`),
          stacking: 'replace_same_source',
          repeatedSave: null,
          parentEffectId,
          payload: {
            kind: 'ongoing_damage',
            damage: monsterDamageRequest(effect),
            timing: { combatant: target, boundary: 'start', source },
          },
        });
        return;
      }
      case 'hit_point_maximum_reduction':
        if (damageTaken === 0) return;
        applyEffect(context, actor, {
          targets: [target],
          duration: { kind: 'permanent' },
          concentration: false,
          stackingIdentity: effectStackingIdentity(`${source}:hit-point-maximum-reduction`),
          stacking: 'coexist',
          repeatedSave: null,
          payload: { kind: 'hit_point_maximum_modifier', amount: -damageTaken },
        });
        return;
      case 'speed_reduction':
        applyEffect(context, actor, {
          targets: [target],
          duration: monsterEffectDuration(actor, target, effect.duration, source),
          concentration: false,
          stackingIdentity: effectStackingIdentity(`${source}:speed-reduction`),
          stacking: 'replace_same_source',
          repeatedSave: null,
          payload: {
            kind: 'movement_modifier',
            speedChange: { kind: 'set', speedFeet: effect.feet },
            modeGrants: [],
            difficultTerrainImmunity: false,
            magicalSpeedReductionImmunity: false,
          },
        });
        return;
      case 'raises_as_zombie':
        throw new EncounterRuleError('unmodeled_interaction',
          'The raises_as_zombie monster effect has no landed delayed out-of-combat lifecycle.',
        );
    }
    const unhandled: never = effect;
    throw new EncounterRuleError('rule_gap', `Declared monster effect ${String(unhandled)} was not executed.`);
  };

  effects.forEach((effect, index) => {
    if (effect.kind === 'condition') execute(effect, index);
  });
  effects.forEach((effect, index) => {
    if (effect.kind !== 'condition') execute(effect, index);
  });
}

function declaredMonsterAction(
  state: EncounterState,
  actor: CombatantId,
  actionId: string,
): MonsterAction {
  const subject = combatant(state, actor);
  const wildShapeAction = subject.wildShape?.physical.actions.find((candidate) => candidate.id === actionId);
  if (wildShapeAction !== undefined) return wildShapeAction;
  if (subject.wildShape !== undefined) {
    throw new EncounterRuleError('validation', `Combatant ${actor} must use an attack from Wild Shape form ${subject.wildShape.formId}.`);
  }
  const formAction = subject.form?.availableActions.find((candidate) => candidate.id === actionId);
  if (formAction !== undefined) return formAction;
  if (subject.form !== undefined) {
    throw new EncounterRuleError('validation', `Combatant ${actor} must use an attack from form ${subject.form.formId}.`);
  }
  if (subject.profile.kind !== 'monster') {
    throw new EncounterRuleError('validation', `Combatant ${actor} has no monster action ${actionId}.`);
  }
  const statblockId = subject.profile.statblockId;
  for (const pack of state.contentPacks ?? []) {
    const imported = pack.monsters.find((monster) => monster.statblock.id === statblockId);
    const action = imported?.actions.find((candidate) => candidate.id === actionId);
    if (action !== undefined) return action;
  }
  const lookup = lookupBundledMonster(String(statblockId));
  if (lookup.status === 'resolved' && lookup.entry.kind === 'static') {
    const decoded = lookup.entry.statblock.sourceDetails.actions;
    const action = decoded.kind === 'present'
      ? decoded.value.find((candidate) => candidate.id === actionId)
      : undefined;
    if (action !== undefined) return action;
  }
  throw new EncounterRuleError('validation', `Combatant ${actor} has no declared monster action ${actionId}.`);
}

function declaredMonsterDamage(
  terms: Extract<MonsterAction, { readonly kind: 'attack' }>['damage'] |
    Extract<MonsterAction, { readonly kind: 'saving_throw' }>['failure']['damage'],
): DamageRequest {
  return {
    terms: terms.filter((term) => term.trigger.kind === 'always').map((term) => ({
      type: damageType(term.type),
      dice: {
        count: term.dice.count,
        sides: dieSides(term.dice.sides),
        modifier: term.dice.modifier,
      },
    })),
    critical: false,
    responses: [],
  };
}

function processAttack(
  context: ReductionContext,
  command: Extract<
    EncounterCommand,
    { readonly type: 'attack' | 'opportunity_attack' }
  >,
  opportunityTrigger: OpportunityAttackTrigger | null = null,
  execution: 'ordinary' | 'legendary' = 'ordinary',
): void {
  const attackingSubject = combatant(context.state, command.actor);
  const activeForm = attackingSubject.form;
  const activeWildShape = attackingSubject.wildShape;
  if (activeForm !== undefined || activeWildShape !== undefined || command.monsterOnHit !== undefined) {
    if (command.attackId === undefined) {
      if (activeForm !== undefined) {
        throw new EncounterRuleError('validation', `Combatant ${command.actor} must use an attack from form ${activeForm.formId}.`);
      }
      if (activeWildShape !== undefined) {
        throw new EncounterRuleError('validation', `Combatant ${command.actor} must use an attack from Wild Shape form ${activeWildShape.formId}.`);
      }
      throw new EncounterRuleError('validation', 'A declared monster attack requires its action id.');
    }
    const declared = declaredMonsterAction(context.state, command.actor, command.attackId);
    if (declared.kind !== 'attack') {
      throw new EncounterRuleError('validation', `Monster action ${command.attackId} is not an attack.`);
    }
    if (
      command.attackBonus !== declared.attackBonus ||
      command.criticalFloor !== 20 ||
      canonicalJson(command.damage) !== canonicalJson(declaredMonsterDamage(declared.damage)) ||
      canonicalJson(command.monsterOnHit ?? []) !== canonicalJson(
        executableMonsterOnHitEffects(declared.onHit),
      )
    ) {
      throw new EncounterRuleError('validation', `Combatant ${command.actor}'s monster attack declaration was altered.`);
    }
  }
  if (!isCombatantOnBoard(context.state, command.actor)) {
    throw new EncounterRuleError('validation', `Combatant ${command.actor} is absent from the board.`);
  }
  if (!isCombatantOnBoard(context.state, command.target)) {
    throw new EncounterRuleError('validation', `Combatant ${command.target} is absent from the board.`);
  }
  if (
    opportunityTrigger === null && command.requiresSight === true &&
    !canCombatantSee(context.state, command.actor, command.target)
  ) {
    throw new VisionTargetingRuleError('target_not_seen', command.actor, command.target);
  }
  let wasFirstAttack = false;
  const typeChoice = command.type === 'attack'
    ? attackDamageTypeSelection(context.state, command)
    : null;
  const maneuver = command.type === 'attack'
    ? selectedManeuver(context.state, command)
    : null;
  if (command.type === 'attack') {
    if (execution === 'ordinary') {
      assertActiveActor(context, command.actor);
      wasFirstAttack = combatant(context.state, command.actor).turn.action.kind === 'available';
      beginAttack(context, command);
      activateRecklessAttack(context, command, wasFirstAttack);
    }
  } else {
    const reactor = combatant(context.state, command.actor);
    if (
      reactor.life !== 'living' ||
      isIncapacitated(combatantConditions(context.state, command.actor))
    ) {
      throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot react.`);
    }
    if (!reactor.turn.reactionAvailable) {
      throw new EncounterRuleError('validation', `Combatant ${command.actor} has no Reaction available.`);
    }
    if (context.state.effects.some((effect) =>
      effect.targets.includes(command.actor) && effect.payload.kind === 'opportunity_attacks_disabled')) {
      throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot make Opportunity Attacks.`);
    }
    if (context.state.activeCombatant !== command.target) {
      throw new EncounterRuleError('validation', 'An Opportunity Attack must target the active mover.');
    }
    if (
      opportunityTrigger === null &&
      gridDistance(
        token(context.state, command.actor).position,
        token(context.state, command.target).position,
      ) > effectiveCombatRules(context.state, reactor.profile.id).reach
    ) {
      throw new EncounterRuleError('validation', 'An Opportunity Attack reactor is out of reach.');
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
    throw new EncounterRuleError('validation', 'A dead combatant cannot be attacked.');
  }
  if (cannotHarmTarget(context.state, command.actor, command.target)) {
    throw new EncounterRuleError('validation', 'The Charmed condition prohibits harming this target.');
  }
  const actorPosition = token(context.state, command.actor).position;
  const targetPosition = token(context.state, command.target).position;
  if (
    opportunityTrigger === null &&
    (!hasLineOfSight(context.state, actorPosition, targetPosition) ||
      coverTierBetween(context.state, actorPosition, targetPosition) === 'total')
  ) {
    throw new EncounterRuleError('validation', 'The target has Total Cover or is outside line of sight.');
  }
  const madeModes = rollDefenseModes(
    context.state, 'attack_rolls_made', command.actor, command.target, 'other',
    command.rollModifierEffectIds,
  );
  const againstModes = rollDefenseModes(
    context.state, 'attack_rolls_against', command.target, command.actor, 'other',
    command.rollModifierEffectIds,
  );
  let attack = resolveAttackRoll(
    {
      attackBonus:
        command.attackBonus +
        exhaustionPenalty(combatantConditions(context.state, command.actor)) +
        effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng) +
        rollDefenseTotalModifier(
          context, 'attack_rolls_made', command.actor, command.target, 'other',
          command.rollModifierEffectIds,
        ),
      targetArmorClass: coverAdjustedArmorClass(context.state, command.actor, command.target),
      rollMode: combineRollModes([
        attackRollMode(context.state, command), ...madeModes.modes, ...againstModes.modes,
      ]),
      criticalFloor: command.criticalFloor,
    },
    context.rng,
  );
  endHidden(context, command.actor, 'attack_roll');
  endEffects(context, new Set([...madeModes.consumed, ...againstModes.consumed]), 'trigger_consumed');
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
  if (attack.outcome !== 'miss') {
    offerReaction(context, {
      kind: 'hit_by_attack', attacker: command.actor, target: command.target,
      attackTotal: attack.total,
    });
    // Shield explicitly includes the triggering attack (spell-descriptions.txt:6937-6954).
    // Equality remains a hit; only Armor Class above the already-rolled total reverses it.
    if (
      attack.outcome === 'hit' &&
      coverAdjustedArmorClass(context.state, command.actor, command.target) > attack.total
    ) {
      attack = { ...attack, outcome: 'miss' };
    }
  }
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
          throw new EncounterRuleError('validation', 'An Opportunity Attack cannot select a slot-spend rider.');
        }
        const slotLevel = selectedSlotLevel(command, rider.id);
        if (slotLevel === null) throw new EncounterRuleError('validation', `Effect ${rider.id} requires a selected spell slot.`);
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
      throw new EncounterRuleError('validation', 'A resource-die maneuver requires primary attack damage.');
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
    if (command.type === 'attack' && command.weaponMastery !== undefined) {
      applyWeaponMastery(context, command.actor, command.target, command.weaponMastery, damageResult.total);
    }
    for (const rider of triggeredRiders) {
      if (rider.encounterEffect === null) continue;
      if (rider.payload.consumeOnHit === true) {
        endEffects(context, new Set([rider.encounterEffect.id]), 'trigger_consumed');
      }
      applyWeaponHitRiderFollowUp(context, rider.encounterEffect, command.target);
    }
    applySaveGatedBanishments(context, command.actor, command.target);
    if (command.monsterOnHit !== undefined) {
      if (command.attackId === undefined) {
        throw new EncounterRuleError('validation', 'A monster on-hit declaration requires its attack id.');
      }
      applyMonsterOnHitEffects(
        context,
        command.actor,
        command.target,
        command.attackId,
        command.monsterOnHit,
        attack.roll.mode,
        damageResult.total,
      );
    }
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
    throw new EncounterRuleError('validation', 'Caster level must be an integer from 1 through 20.');
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
    if (definition.ritual !== true) throw new EncounterRuleError('validation', `${definition.name} cannot be cast as a ritual.`);
    if (context.state.activeCombatant !== null) throw new EncounterRuleError('validation', 'A ritual cannot resolve as a turn action.');
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
      throw new EncounterRuleError('validation', `Combatant ${actor} has no spell action available.`);
    case 'bonus_action':
      assertActiveActor(context, actor);
      spendCost(context, actor, 'bonus_action', `Cast ${definition.name}`);
      return;
    case 'reaction': {
      const subject = combatant(context.state, actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, actor))) {
        throw new EncounterRuleError('validation', `Combatant ${actor} cannot cast a Reaction spell.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError('validation', `Combatant ${actor} has no Reaction available.`);
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
        throw new EncounterRuleError('validation', `${definition.name} has a long casting time and cannot resolve as a turn action.`);
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
      throw new EncounterRuleError('validation', 'A ritual cast cannot spend a limited resource pool.');
    }
    if (command.slotLevel !== null) throw new EncounterRuleError('validation', 'A ritual cast does not expend a spell slot.');
    return;
  }
  if (definition.level === 0) {
    if (command.slotLevel !== null) throw new EncounterRuleError('validation', 'Cantrips do not expend spell slots.');
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
    throw new EncounterRuleError('validation', `${definition.name} requires a slot of level ${definition.level} or higher.`);
  }
  if (command.resourcePoolId !== undefined) {
    spendLimitedResource(context, command.actor, command.resourcePoolId, `Cast ${definition.name}`);
    return;
  }
  const subject = combatant(context.state, command.actor);
  const slot = subject.spellSlots.find((candidate) =>
    candidate.level === command.slotLevel &&
    (candidate.recharge ?? 'long_rest') === (command.slotRecharge ?? 'long_rest'));
  if (slot === undefined || slot.remaining < 1) {
    throw new EncounterRuleError('validation', `Combatant ${command.actor} has no level-${command.slotLevel} spell slot remaining.`);
  }
  const remaining = slot.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    spellSlots: subject.spellSlots.map((candidate) =>
      candidate.level === command.slotLevel &&
      (candidate.recharge ?? 'long_rest') === (command.slotRecharge ?? 'long_rest')
        ? { ...candidate, remaining }
        : candidate,
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
    throw new EncounterRuleError('validation', `${spellName} requires an area placement.`);
  }
  if (command.area.shape !== shape) {
    throw new EncounterRuleError('validation', `${spellName} requires a ${shape} template.`);
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
    throw new EncounterRuleError('validation', `${spellName} requires a ${expectedSizeFeet}-foot ${shape} template.`);
  }
  if (expectedSecondarySizeFeet !== null) {
    const submittedSecondary = command.area.shape === 'line'
      ? command.area.template.width
      : command.area.shape === 'cylinder'
        ? command.area.template.height
        : null;
    if (submittedSecondary !== expectedSecondarySizeFeet) {
      throw new EncounterRuleError('validation', `${spellName} requires a ${expectedSecondarySizeFeet}-foot secondary ${shape} dimension.`);
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
    throw new EncounterRuleError('validation', `${spellName} area origin is out of range.`);
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
    throw new EncounterRuleError('validation', `${definition.name} does not use area targeting.`);
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
    throw new EncounterRuleError('validation', 'Spell caster and target must be present on the board.');
  }
  if (!allowDead && combatant(state, target).life === 'dead') {
    throw new EncounterRuleError('validation', 'A dead combatant is not a legal spell target.');
  }
  if (gridDistance(token(state, actor).position, token(state, target).position) > rangeFeet) {
    throw new EncounterRuleError('validation', `Spell target ${target} is out of range.`);
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
      if (command.targets.length !== 0) throw new EncounterRuleError('validation', 'A Self spell does not select targets.');
      return [command.actor];
    case 'single':
      if (command.targets.length !== 1) throw new EncounterRuleError('validation', `${definition.name} requires one target.`);
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
        throw new EncounterRuleError('validation', `${definition.name} allows at most ${maximum} targets.`);
      }
      if (requiresEveryDart && command.targets.length !== maximum) {
        throw new EncounterRuleError('validation', `${definition.name} requires one target allocation per projectile.`);
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
      if (command.targets.length !== 0) throw new EncounterRuleError('validation', 'Area spell targets come from its exact template.');
      return areaTargets(state, definition, command);
    case 'area_selected': {
      const inArea = areaTargets(state, definition, command);
      const slotDelta = (command.slotLevel as number) - definition.level;
      const maximum = targeting.baseMaximum + targeting.additionalPerSlot * slotDelta;
      if (command.targets.length < 1 || command.targets.length > maximum) {
        throw new EncounterRuleError('validation', `${definition.name} allows at most ${maximum} selected area targets.`);
      }
      assertUnique(command.targets, 'Spell targets');
      if (command.targets.some((target) => !inArea.includes(target))) {
        throw new EncounterRuleError('validation', `${definition.name} selected targets must occupy its exact template.`);
      }
      return command.targets;
    }
    case 'all_in_range':
      if (command.targets.length < 1) throw new EncounterRuleError('validation', `${definition.name} requires at least one target.`);
      assertUnique(command.targets, 'Spell targets');
      for (const target of command.targets) validateTargetRange(state, command.actor, target, targeting.rangeFeet);
      return command.targets;
    case 'remote':
      if (command.targets.length !== 1) throw new EncounterRuleError('validation', `${definition.name} requires one remote target.`);
      if (combatant(state, command.targets[0] as CombatantId).life === 'dead') throw new EncounterRuleError('validation', 'A dead combatant is not a legal spell target.');
      if (!isCombatantOnBoard(state, command.targets[0] as CombatantId)) throw new EncounterRuleError('validation', 'An absent combatant is not a legal spell target.');
      return command.targets;
    case 'utility':
      if (command.targets.length !== 0) throw new EncounterRuleError('validation', 'This utility spell does not target a combatant.');
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
  validatePerSubjectDestinationCount(definition, command.targets.length, destinations.length);
  if (
    destinations.some((entry, index) => entry.target !== command.targets[index])
  ) {
    throw new TargetSelectionRuleError(
      'each_target_own_destination',
      `${definition.name} violates each_target_own_destination: each selected target needs its own ordered destination.`,
    );
  }
}

function validatePerSubjectDestinationCount(
  definition: SpellDefinition,
  subjectCount: number,
  destinationCount: number,
): void {
  if (destinationCount !== subjectCount) {
    throw new TargetSelectionRuleError(
      'each_target_own_destination',
      `${definition.name} violates each_target_own_destination: each subject needs its own ordered destination.`,
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
    if (command.area === null) throw new EncounterRuleError('validation', `${definition.name} requires an area placement.`);
    return cloneAreaTemplate(command.area);
  };
  const slotDelta = definition.level === 0 || command.castAsRitual
    ? 0
    : (command.slotLevel as number) - definition.level;
  switch (payload.kind) {
    case 'summon_lifecycle':
      return payload;
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
        throw new EncounterRuleError('validation', `${definition.name} requires Blinded or Deafened selection.`);
      }
      if (!payload.conditions.includes(selected)) {
        throw new EncounterRuleError('validation', `${definition.name} does not allow ${selected}.`);
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
        throw new EncounterRuleError('validation', `${definition.name} requires a listed energy damage type.`);
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
    case 'roll_defense_modifier':
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
    case 'healing_potion':
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
    stackingIdentity: effectStackingIdentity(data.payload.kind === 'roll_defense_modifier'
      ? `spell:${definition.id}:roll-defense:${data.payload.scopes.join('+')}:` +
        `${data.payload.modifier.kind}:` +
        `${data.payload.modifier.kind === 'roll_mode'
          ? data.payload.modifier.mode
          : data.payload.modifier.kind === 'flat'
            ? String(data.payload.modifier.amount)
            : `${String(data.payload.modifier.sign)}d${String(data.payload.modifier.sides)}`}:` +
        `${data.payload.eligibility.kind}`
      : `spell:${definition.id}`),
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
  if (before.life === 'dead') throw new EncounterRuleError('validation', 'A dead creature cannot regain Hit Points.');
  if (context.state.effects.some((candidate) =>
    candidate.targets.includes(target) && candidate.payload.kind === 'cannot_regain_hit_points')) return;
  const hitPoints = Math.min(effectiveHitPointMaximum(context.state, target), before.hitPoints + amount);
  context.state = replaceCombatant(context.state, {
    ...before,
    hitPoints,
    life: hitPoints > 0 ? 'living' : before.life,
    deathSaves: hitPoints > 0 ? null : before.deathSaves,
  });
  if (hitPoints > 0) context.state = clearDeathSaveDecisions(context.state, target);
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
    throw new EncounterRuleError('validation', 'Temporary Hit Points must be a non-negative safe integer.');
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
  ) throw new EncounterRuleError('validation', 'The spell target has Total Cover or is outside line of sight.');
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
  const madeModes = rollDefenseModes(
    context.state, 'attack_rolls_made', command.actor, target, 'spell_or_magical_effect',
    command.rollModifierEffectIds,
  );
  const againstModes = rollDefenseModes(
    context.state, 'attack_rolls_against', target, command.actor, 'spell_or_magical_effect',
    command.rollModifierEffectIds,
  );
  const attack = resolveAttackRoll({
    attackBonus: command.attackBonus + effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng) +
      rollDefenseTotalModifier(
        context, 'attack_rolls_made', command.actor, target, 'spell_or_magical_effect',
        command.rollModifierEffectIds,
      ),
    targetArmorClass: coverAdjustedArmorClass(context.state, command.actor, target),
    rollMode: combineRollModes([visibilityMode, ...madeModes.modes, ...againstModes.modes, ...rollModeEffects.map((effect) =>
      effect.payload.kind === 'faerie_fire'
        ? effect.payload.attackModeAgainstTarget
        : effect.payload.kind === 'attack_roll_mode_modifier' ||
          effect.payload.kind === 'attacks_against_target_roll_mode'
          ? effect.payload.mode
          : 'normal')]),
    criticalFloor: 20,
  }, context.rng);
  endEffects(context, new Set([...madeModes.consumed, ...againstModes.consumed]), 'trigger_consumed');
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
    throw new EncounterRuleError('validation', `${definition.name} requires a damage type selection.`);
  }
  const selected = damageType(command.selectedOption);
  if (!configured.includes(selected)) {
    throw new EncounterRuleError('validation', `${definition.name} does not allow ${command.selectedOption} damage.`);
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
    throw new EncounterRuleError('validation', `${definition.name} requires one of its declared skill choices.`);
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
    throw new EncounterRuleError('validation', `${definition.name} requires one of its declared damage-type choices.`);
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
        const size = effectiveCombatRules(state, subject.profile.id).sizeCategory;
        if (size === undefined) {
          throw new EncounterRuleError('validation', `Damage scaling requires a known size for ${target}.`);
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
      ? delivery.kind === 'save'
        ? successfulSaveDamage(
            context.state, source, target, result.total, delivery.onSuccess,
            'spell_or_magical_effect',
          )
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
  if (targets.length === 0) throw new EncounterRuleError('validation', 'A damage operation requires at least one target.');
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
      throw new EncounterRuleError('validation', `${definition.name} has incompatible item targeting.`);
  }
}

function executeHeatMetal(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  operation: Extract<BranchSpellOperation, { readonly kind: 'heat_metal' }>,
): SpellOperationOutcome {
  const selected = command.objectTargets ?? [];
  if (selected.length !== 1) throw new EncounterRuleError('validation', `${definition.name} requires exactly one item target.`);
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
  ) throw new EncounterRuleError('validation', `${definition.name} item target is out of range or not visible.`);

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
    throw new EncounterRuleError('validation', 'Only a fixed-round condition lifecycle can extend duration.');
  }
  const stackingSources = operation.stacking.sources;
  const existing = context.state.effects.find((effect) =>
    effect.stackingIdentity === identity &&
    (stackingSources === 'any_source' || effect.source === source));
  if (existing === undefined) return false;
  if (existing.duration.kind !== 'turn_boundaries') {
    throw new EncounterRuleError('validation', 'A condition lifecycle cannot extend a permanent effect.');
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
    const conditionImmunities = effectiveCombatRules(context.state, target).conditionImmunities;
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

function importedReactionDefinitions(
  state: EncounterState,
): readonly { readonly definition: SpellDefinition; readonly operation: ReactionOperation }[] {
  return (state.contentPacks ?? []).flatMap((pack) => pack.spells.flatMap((spell) => {
    const operation = spell.definition.operation;
    return spell.definition.castingTime === 'reaction' && operation.kind === 'reaction'
      ? [{ definition: spell.definition, operation }]
      : [];
  }));
}

function reactionEventTarget(event: ReactionTriggerEvent): CombatantId | null {
  switch (event.kind) {
    case 'hit_by_attack':
    case 'damaged_by_creature':
    case 'taking_damage_of_type':
      return event.target;
    case 'creature_casts_spell':
      return null;
  }
}

function reactionTriggerMatches(
  state: EncounterState,
  reactor: CombatantId,
  declaration: ReactionTrigger,
  event: ReactionTriggerEvent,
): boolean {
  if (declaration.kind !== event.kind) return false;
  switch (declaration.kind) {
    case 'hit_by_attack':
      return event.kind === 'hit_by_attack' && event.target === reactor;
    case 'damaged_by_creature':
      return event.kind === 'damaged_by_creature' && event.target === reactor &&
        gridDistance(token(state, reactor).position, token(state, event.source).position) <= declaration.rangeFeet &&
        (!declaration.requiresSight || canCombatantSee(state, reactor, event.source));
    case 'taking_damage_of_type':
      return event.kind === 'taking_damage_of_type' && event.target === reactor &&
        event.damageTypes.some((type) => declaration.damageTypes.some(
          (declared) => declared === String(type),
        ));
    case 'creature_casts_spell':
      return event.kind === 'creature_casts_spell' && event.caster !== reactor && event.hasComponents &&
        gridDistance(token(state, reactor).position, token(state, event.caster).position) <= declaration.rangeFeet &&
        (!declaration.requiresSight || canCombatantSee(state, reactor, event.caster));
  }
}

function reactionAvailability(
  state: EncounterState,
  reactor: CombatantId,
  definition: SpellDefinition,
): ReactionAvailability {
  const subject = combatant(state, reactor);
  if (subject.life !== 'living' || isIncapacitated(combatantConditions(state, reactor))) {
    return 'incapacitated';
  }
  if (!subject.turn.reactionAvailable) return 'reaction_spent';
  if (definition.level > 0 && !subject.spellSlots.some(
    (slot) => slot.level >= definition.level && slot.remaining > 0,
  )) return 'slot_unavailable';
  return 'available';
}

function reactionResponseTargets(event: ReactionTriggerEvent): readonly CombatantId[] {
  switch (event.kind) {
    case 'hit_by_attack': return [event.target];
    case 'damaged_by_creature': return [event.source];
    case 'taking_damage_of_type': return [event.target];
    case 'creature_casts_spell': return [event.caster];
  }
}

interface ReactionResolution {
  readonly reactor: CombatantId;
  readonly spellId: string;
  readonly cancelledTrigger: boolean;
}

function offerReaction(
  context: ReductionContext,
  event: ReactionTriggerEvent,
): ReactionResolution | null {
  const fixedReactor = reactionEventTarget(event);
  const possibleReactors = fixedReactor === null
    ? context.state.combatants.map((subject) => subject.profile.id)
    : [fixedReactor];
  const candidates = possibleReactors.flatMap((reactor) =>
    importedReactionDefinitions(context.state).flatMap(({ definition, operation }) =>
      reactionTriggerMatches(context.state, reactor, operation.trigger, event)
        ? [{ reactor, definition, operation }]
        : []));
  const offers = candidates.map(({ reactor, definition, operation }): ReactionOffer => ({
    reactor, spellId: definition.id, trigger: operation.trigger.kind,
    availability: reactionAvailability(context.state, reactor, definition),
  }));
  for (const offer of offers) {
    emit(context, {
      type: 'reaction_offered', combatant: offer.reactor, spellId: offer.spellId,
      trigger: offer.trigger, availability: offer.availability,
    });
  }
  if (offers.length === 0 || context.reactionDecision === null) return null;
  const command = context.reactionDecision({ state: context.state, event, offers });
  if (command === null) return null;
  const selected = candidates.find(({ reactor, definition }) =>
    reactor === command.actor && definition.id === command.spellId);
  if (selected === undefined) {
    throw new EncounterRuleError('validation', 'The controller selected a Reaction that was not offered for this trigger.');
  }
  const availability = reactionAvailability(context.state, selected.reactor, selected.definition);
  if (availability !== 'available') {
    emit(context, {
      type: 'reaction_refused', combatant: selected.reactor,
      spellId: selected.definition.id, reason: availability,
    });
    return null;
  }
  const targets = reactionResponseTargets(event);
  if (
    command.castAsRitual ||
    !sameIdentitySet(command.targets, targets) ||
    (event.kind === 'hit_by_attack' && command.modifierSource !== event.attacker) ||
    (event.kind !== 'hit_by_attack' && command.modifierSource !== undefined)
  ) {
    throw new EncounterRuleError('validation', 'The controller altered the offered Reaction target or trigger binding.');
  }
  if (
    selected.definition.level > 0 &&
    (command.slotLevel === null || command.slotLevel < selected.definition.level ||
      !combatant(context.state, command.actor).spellSlots.some(
        (slot) => slot.level === command.slotLevel && slot.remaining > 0 &&
          (slot.recharge ?? 'long_rest') === (command.slotRecharge ?? 'long_rest'),
      ))
  ) {
    emit(context, {
      type: 'reaction_refused', combatant: selected.reactor,
      spellId: selected.definition.id, reason: 'slot_unavailable',
    });
    return null;
  }
  spendSpellCastingCost(context, selected.definition, command);
  spendSpellSlot(context, selected.definition, command);
  emit(context, {
    type: 'spell_cast', caster: command.actor, spellId: selected.definition.id,
    slotLevel: command.slotLevel, targets,
  });
  let cancelledTrigger = false;
  if (selected.operation.response.kind === 'reaction_save_cancel') {
    const target = targets[0];
    if (target === undefined) throw new EncounterRuleError('validation', 'A cancelling Reaction requires one triggering caster.');
    cancelledTrigger = resolveTargetSave(
      context, command.actor, target, selected.operation.response.ability,
      command.saveDc, 'normal', null,
    ).outcome === 'failure';
  } else {
    executeSpellOperation(
      context, selected.definition, { ...command, targets }, targets,
      selected.operation.response,
    );
  }
  emit(context, {
    type: 'reaction_resolved', combatant: selected.reactor,
    spellId: selected.definition.id, trigger: selected.operation.trigger.kind,
  });
  return { reactor: selected.reactor, spellId: selected.definition.id, cancelledTrigger };
}

function processSpellCast(context: ReductionContext, command: SpellCastCommand): void {
  if (combatant(context.state, command.actor).form?.spellcasting === 'prohibited') {
    throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot cast spells in its current form.`);
  }
  const wildShape = combatant(context.state, command.actor).wildShape;
  if (wildShape !== undefined && wildShape.druidLevel < 18) {
    throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot cast spells while using Wild Shape before Druid level 18.`);
  }
  const definition = spellDefinition(command.spellId) ??
    importedSpellDefinition(context.state.contentPacks, command.spellId);
  if (definition === null) throw new EncounterRuleError('rule_gap', `Spell ${command.spellId} is not implemented.`);
  if (definition.operation.kind === 'reaction') {
    throw new EncounterRuleError('validation', `${definition.name} can be cast only through its declared Reaction trigger.`);
  }
  const targets = selectedSpellTargets(context.state, definition, command);
  if (definition.operation.kind === 'revive') {
    for (const target of targets) {
      const subject = combatant(context.state, target);
      if (subject.life !== 'dead') {
        throw new EncounterRuleError('validation', `${definition.name} requires a dead creature.`);
      }
      if (subject.deathAt === null) {
        throw new RevivifyRuleError('death_time_unknown', REVIVIFY_CITATIONS.deathWindowAndHitPoints);
      }
      const roundDelta = context.state.round - subject.deathAt.round;
      const withinWindow = roundDelta >= 0 && (
        roundDelta < definition.operation.maximumDeathAgeRounds ||
        (roundDelta === definition.operation.maximumDeathAgeRounds &&
          (context.state.activeInitiativeIndex ?? 0) <= subject.deathAt.initiativeIndex)
      );
      if (!withinWindow) {
        throw new RevivifyRuleError('target_dead_too_long', REVIVIFY_CITATIONS.deathWindowAndHitPoints);
      }
    }
  }
  if (
    definition.targeting.kind !== 'self' &&
    definition.targeting.kind !== 'area' &&
    definition.targeting.kind !== 'area_selected' &&
    definition.targeting.kind !== 'all_in_range' &&
    definition.targeting.kind !== 'remote' &&
    definition.targeting.kind !== 'utility' &&
    definition.targeting.requiresSight === true
  ) {
    const unseen = targets.find((target) => !canCombatantSee(context.state, command.actor, target));
    if (unseen !== undefined) {
      throw new VisionTargetingRuleError('target_not_seen', command.actor, unseen);
    }
  }
  if (definition.components.verbal) endHidden(context, command.actor, 'verbal_spell');
  spendSpellCastingCost(context, definition, command);
  const interception = offerReaction(context, {
    kind: 'creature_casts_spell', caster: command.actor, spellId: definition.id,
    hasComponents: definition.components.verbal || definition.components.somatic || definition.components.material !== null,
  });
  if (interception?.cancelledTrigger === true) {
    emit(context, {
      type: 'spell_cast_intercepted', caster: command.actor, spellId: definition.id,
      reactor: interception.reactor, reactionSpellId: interception.spellId,
    });
    return;
  }
  spendSpellSlot(context, definition, command);
  emit(context, { type: 'spell_cast', caster: command.actor, spellId: definition.id, slotLevel: command.slotLevel, targets });

  executeSpellOperation(context, definition, command, targets, definition.operation);
  if (definition.id === 'revivify') {
    emit(context, {
      type: 'spell_component_consumed',
      caster: command.actor,
      spellId: 'revivify',
      component: {
        kind: 'material',
        description: 'a diamond worth 300+ GP',
        minimumGoldPieceValue: 300,
        quantity: 1,
      },
      inventoryTracking: 'recorded_untracked_inventory',
      citation: REVIVIFY_CITATIONS.component,
    });
  }
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
    throw new EncounterRuleError('validation', 'A shared outcome damage reference requires one immediate automatic damage packet without a threshold rider.');
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
        throw new EncounterRuleError('validation', 'A shared outcome damage reference did not identify failure-branch damage.');
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

/**
 * SRD Giant Insect shares the caster's Initiative count and acts immediately
 * after them: docs/srd/source/spell-descriptions.txt:3714-3716.
 */
export const SUMMON_INITIATIVE_RULE = 'summoner_count_immediately_after' as const;
export const MAX_SUMMONED_COMBATANTS_PER_CAST = 100;

function summonCount(
  definition: SpellDefinition,
  command: SpellCastCommand,
  operation: Extract<BranchSpellOperation, { readonly kind: 'summon' }>,
): number {
  return scaledTargetCount(definition, command, operation.count);
}

function summonMonster(
  state: EncounterState,
  definition: SpellDefinition,
  monsterId: string,
): LoadedContentPack['monsters'][number] {
  for (const pack of state.contentPacks ?? []) {
    const spell = pack.spells.find((candidate) => candidate.id === definition.id);
    if (spell === undefined) continue;
    const monster = pack.monsters.find((candidate) =>
      candidate.sourceId === spell.sourceId && candidate.recordId === monsterId);
    if (monster !== undefined) return monster;
  }
  throw new EncounterRuleError('validation', 
    `${definition.name} references monster ${monsterId}, which is absent from its content pack.`,
  );
}

function formReplacementRules(
  original: CombatantProfile,
  operation: Extract<BranchSpellOperation, { readonly kind: 'form_replacement' }>,
  monster: LoadedContentPack['monsters'][number] | null,
): { readonly formId: string; readonly formName: string; readonly rules: CombatRulesProfile; readonly actions: readonly MonsterAction[] } {
  if (operation.form.kind === 'pack_monster') {
    if (monster === null) throw new EncounterRuleError('validation', 'A pack-monster form did not resolve its statblock.');
    const projected = importedMonsterProfile(monster, {
      combatantId: `form:${String(original.id)}`,
      tokenId: `form:${String(original.tokenId)}`,
    });
    return {
      formId: monster.id,
      formName: monster.name,
      rules: {
        ...projected.rules,
        ...(original.rules.creatureType === undefined ? {} : { creatureType: original.rules.creatureType }),
        spellSlots: [],
      },
      actions: monster.actions,
    };
  }
  const stats = operation.form.stats;
  return {
    formId: stats.id,
    formName: stats.name,
    rules: {
      armorClass: armorClass(stats.armorClass),
      hitPointMaximum: stats.hitPointMaximum,
      speed: feet(stats.speedFeet),
      initiativeBonus: stats.initiativeBonus,
      savingThrowBonuses: { ...stats.savingThrowBonuses },
      attacksPerAction: stats.attacksPerAction,
      reach: feet(stats.reachFeet),
      damageResponses: stats.damageResponses.map((entry) => ({
        type: damageType(entry.type), response: entry.response,
      })),
      conditionImmunities: [...stats.conditionImmunities],
      usesDeathSaves: false,
      senses: structuredClone(stats.senses),
      passivePerception: 10,
      detectionTraits: [],
      contactMedium: 'surface',
      ...(original.rules.creatureType === undefined ? {} : { creatureType: original.rules.creatureType }),
      spellSlots: [],
    },
    actions: stats.actions,
  };
}

function dropEquipmentForForm(
  context: ReductionContext,
  target: CombatantId,
  cause: Extract<EncounterEvent, { readonly type: 'item_dropped' }>['cause'] = 'form_replacement',
): void {
  if (context.state.equipment === undefined) return;
  const equipment = combatantEquipment(context.state, target);
  const items = [...heldItems(equipment.hands), ...equipment.worn, ...equipment.carried];
  if (items.length === 0) return;
  const position = { ...token(context.state, target).position };
  context.state = {
    ...replaceEquipment(context.state, {
      combatant: target, hands: { kind: 'empty' }, worn: [], carried: [],
    }),
    groundItems: [
      ...(context.state.groundItems ?? []),
      ...items.map((item) => ({ item, position: { ...position } })),
    ],
    itemContacts: (context.state.itemContacts ?? []).filter((contact) =>
      contact.combatant !== target || !items.includes(contact.item)),
  };
  for (const item of items) {
    emit(context, { type: 'item_dropped', combatant: target, item, position, cause });
  }
}

function dropEquipmentForWildShape(context: ReductionContext, target: CombatantId): void {
  dropEquipmentForForm(context, target, 'wild_shape');
}

function resolveFormReplacement(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  targets: readonly CombatantId[],
  operation: Extract<BranchSpellOperation, { readonly kind: 'form_replacement' }>,
): SpellOperationOutcome {
  if (targets.length === 0) return 'no_op';
  const existingForms = new Set(targets.flatMap((target) => {
    const form = combatant(context.state, target).form;
    return form === undefined ? [] : [form.effectId];
  }));
  endEffects(context, existingForms, 'stacking_replaced');
  const monster = operation.form.kind === 'pack_monster'
    ? summonMonster(context.state, definition, operation.form.monsterId)
    : null;
  const replacements = targets.map((target) => {
    const subject = combatant(context.state, target);
    return { target, subject, replacement: formReplacementRules(subject.profile, operation, monster) };
  });
  const effectId = applyEffect(context, command.actor, {
    targets,
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: command.actor,
        boundary: operation.lifecycle.expiresAt === 'source_start' ? 'start' : 'end',
        source: definition.source,
      },
      remaining: operation.lifecycle.durationRounds,
    },
    concentration: operation.lifecycle.concentration,
    stackingIdentity: effectStackingIdentity(`spell:${definition.id}:form-replacement`),
    stacking: 'replace_any_source',
    repeatedSave: null,
    payload: {
      kind: 'polymorph', formType: 'Beast', maximumChallengeRating: 'target_cr_or_level',
      temporaryHitPoints: 'beast_hit_points', endsAtTemporaryHitPoints: 0,
      canSpeak: false, canCastSpells: false,
      gearMelds: operation.equipmentDisposition === 'merged_into_form',
      retainedStatistics: FORM_REPLACEMENT_RETAINED_STATISTICS,
    },
  });
  for (const { target, subject, replacement } of replacements) {
    context.state = replaceCombatant(context.state, {
      ...subject,
      profile: { ...subject.profile, rules: replacement.rules },
      temporaryHitPoints: 0,
      form: {
        effectId,
        formId: replacement.formId,
        formName: replacement.formName,
        hitPoints: replacement.rules.hitPointMaximum,
        hitPointMaximum: replacement.rules.hitPointMaximum,
        originalProfile: subject.profile,
        availableActions: structuredClone(replacement.actions),
        retainedStatistics: FORM_REPLACEMENT_RETAINED_STATISTICS,
        equipmentDisposition: operation.equipmentDisposition,
        spellcasting: operation.spellcasting,
      },
    });
    if (operation.equipmentDisposition === 'dropped_at_origin') dropEquipmentForForm(context, target);
  }
  return 'applied';
}

function validateSummonDestinations(
  state: EncounterState,
  definition: SpellDefinition,
  command: SpellCastCommand,
  count: number,
  rangeFeet: number,
): readonly GridCell[] {
  const destinations = command.summonDestinations ?? [];
  if (count > MAX_SUMMONED_COMBATANTS_PER_CAST) {
    throw new TargetSelectionRuleError(
      'slot_scaled_count',
      `${definition.name} exceeds the ${String(MAX_SUMMONED_COMBATANTS_PER_CAST)}-creature summon boundary.`,
    );
  }
  validatePerSubjectDestinationCount(definition, count, destinations.length);
  const keys = destinations.map(cellKey);
  if (new Set(keys).size !== keys.length) {
    throw new TargetSelectionRuleError(
      'each_target_own_destination',
      `${definition.name} summon destinations must be unique.`,
    );
  }
  const casterPosition = token(state, command.actor).position;
  for (const destination of destinations) {
    if (!isCellInside(state.bounds, destination) || movementBlocked(state, destination)) {
      throw new EncounterRuleError('validation', `${definition.name} summon destination is not an occupiable cell.`);
    }
    if (state.tokens.some((placed) => cellKey(placed.position) === cellKey(destination))) {
      throw new EncounterRuleError('validation', `${definition.name} summon destination must be unoccupied.`);
    }
    if (gridDistance(casterPosition, destination) > rangeFeet) {
      throw new EncounterRuleError('validation', `${definition.name} summon destination is out of range.`);
    }
  }
  return destinations.map((destination) => ({ ...destination }));
}

function resolveSummon(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  operation: Extract<BranchSpellOperation, { readonly kind: 'summon' }>,
): void {
  const count = summonCount(definition, command, operation);
  const destinations = validateSummonDestinations(
    context.state, definition, command, count, operation.placementRangeFeet,
  );
  const monster = summonMonster(context.state, definition, operation.monsterId);
  const effectSequence = context.state.nextEffectSequence;
  const profiles = destinations.map((_destination, index) => importedMonsterProfile(monster, {
    combatantId: `summon:${String(effectSequence)}:${String(index + 1)}:${monster.recordId}`,
    tokenId: `summon-token:${String(effectSequence)}:${String(index + 1)}:${monster.recordId}`,
  }));
  const summonIds = profiles.map((profile) => profile.id);
  const summonedStates: EncounterCombatantState[] = profiles.map((profile) => ({
    profile,
    hitPoints: profile.rules.hitPointMaximum,
    life: 'living',
    deathSaves: null,
    deathAt: null,
    turn: EMPTY_TURN,
    temporaryHitPoints: 0,
    wildShapeUses: null,
    spellSlots: [],
  }));
  const tokens = profiles.map((profile, index): CombatToken => ({
    id: tokenId(`summon-token:${String(effectSequence)}:${String(index + 1)}:${monster.recordId}`),
    combatantId: combatantId(`summon:${String(effectSequence)}:${String(index + 1)}:${monster.recordId}`),
    position: { ...(destinations[index] as GridCell) },
  }));
  context.state = {
    ...context.state,
    combatants: [...context.state.combatants, ...summonedStates],
    tokens: [...context.state.tokens, ...tokens],
    ...(context.state.equipment === undefined
      ? {}
      : { equipment: [
          ...context.state.equipment,
          ...summonIds.map((combatant): CombatantEquipment => ({
            combatant, hands: { kind: 'empty' }, worn: [], carried: [],
          })),
        ] }),
  };
  const effectId = applyEffect(context, command.actor, {
    targets: [command.actor],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: command.actor,
        boundary: operation.lifecycle.expiresAt === 'source_start' ? 'start' : 'end',
        source: definition.source,
      },
      remaining: operation.lifecycle.durationRounds,
    },
    concentration: operation.lifecycle.concentration,
    stackingIdentity: effectStackingIdentity(`spell:${definition.id}:summon:${String(effectSequence)}`),
    stacking: 'coexist',
    repeatedSave: null,
    payload: { kind: 'summon_lifecycle', monsterId: monster.id },
    ownedCombatants: summonIds,
  });
  const summonerIndex = context.state.initiative.findIndex((entry) => entry.combatant === command.actor);
  const summonerEntry = context.state.initiative[summonerIndex];
  if (summonerIndex < 0 || summonerEntry === undefined) {
    throw new EncounterRuleError('validation', `${definition.name} requires active initiative before summoning.`);
  }
  const summonEntries = summonIds.map((combatant) => ({ ...summonerEntry, combatant }));
  context.state = {
    ...context.state,
    initiative: [
      ...context.state.initiative.slice(0, summonerIndex + 1),
      ...summonEntries,
      ...context.state.initiative.slice(summonerIndex + 1),
    ],
  };
  for (const [index, profile] of profiles.entries()) {
    emit(context, {
      type: 'combatant_summoned', combatant: profile.id, summoner: command.actor,
      effectId, position: { ...(destinations[index] as GridCell) },
    });
  }
}

function executeSpellOperation(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  targets: readonly CombatantId[],
  operation: SpellOperation,
): SpellOperationOutcome {
  switch (operation.kind) {
    case 'reaction':
      throw new EncounterRuleError('validation', `${definition.name} requires an event interception window.`);
    case 'composition': {
      const compositionState = context.state;
      const compositionEventCount = context.events.length;
      const compositionRngCheckpoint = context.rng.checkpoint();
      const outcomes: SpellOperationOutcome[] = [];
      for (const stepIndex of compositionOrder(operation)) {
        const step = operation.steps[stepIndex];
        if (step === undefined) throw new EncounterRuleError('validation', 'A composition order referenced a missing step.');
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
    case 'summon':
      resolveSummon(context, definition, command, operation);
      return 'applied';
    case 'form_replacement':
      return resolveFormReplacement(context, definition, command, targets, operation);
    case 'caster_choice': {
      const mode = operation.modes.find((candidate) => candidate.mode === command.selectedOption);
      if (mode === undefined) {
        throw new EncounterRuleError('validation', `${definition.name} requires one of its declared caster modes.`);
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
        ) throw new EncounterRuleError('validation', `${definition.name} has an invalid random-branch range.`);
        for (let face = branch.minimum; face <= branch.maximum; face += 1) {
          if (covered.has(face)) throw new EncounterRuleError('validation', `${definition.name} has overlapping random-branch ranges.`);
          covered.add(face);
        }
      }
      if (covered.size !== operation.dieSides) {
        throw new EncounterRuleError('validation', `${definition.name} has a gap in its random-branch table.`);
      }
      const subjects = targets.length === 0 ? [command.actor] : targets;
      const outcomes: SpellOperationOutcome[] = [];
      for (const target of subjects) {
        const rolled = rollDie(context.rng, dieSides(operation.dieSides));
        const branch = operation.branches.find((candidate) =>
          rolled >= candidate.minimum && rolled <= candidate.maximum);
        if (branch === undefined) throw new EncounterRuleError('validation', `${definition.name} has no branch for roll ${String(rolled)}.`);
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
              return effectiveCombatRules(context.state, subject.profile.id).creatureType === candidate.predicate.creatureType;
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
    case 'roll_defense_modifier': {
      const payload: Extract<EffectPayload, { readonly kind: 'roll_defense_modifier' }> = {
        kind: 'roll_defense_modifier',
        scopes: [...operation.scopes],
        eligibility: structuredClone(operation.eligibility),
        consumption: operation.consumption,
        modifier: structuredClone(operation.modifier),
        ...(operation.successfulSaveDamage === undefined
          ? {}
          : { successfulSaveDamage: operation.successfulSaveDamage }),
        ...(operation.eventTrigger === undefined
          ? {}
          : { eventTrigger: structuredClone(operation.eventTrigger) }),
      };
      applySpellEffect(context, definition, command, {
        ...modifierEffectData(payload, operation.duration),
        // The combining-magical-effects rule keys on spell identity, not caster identity.
        stacking: 'replace_any_source',
      }, targets);
      return 'applied';
    }
    case 'targeted_defense_modifier': {
      if (command.modifierSource === undefined) {
        throw new EncounterRuleError('validation', `${definition.name} requires a selected attacker for its targeted defense.`);
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
        throw new EncounterRuleError('validation', `${definition.name} cannot nest a sustained effect.`);
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
          ) throw new EncounterRuleError('validation', `${definition.name} did not establish its declared bound target.`);
          break;
        case 'automatic_tick':
          if (targets.length === 0) throw new EncounterRuleError('validation', `${definition.name} automatic ticks require cast targets.`);
          if (operation.lifecycle.durationRounds !== operation.sequence.ticks) {
            throw new EncounterRuleError('validation', `${definition.name} automatic tick duration must equal its tick count.`);
          }
          targetBinding = 'bound_combatants';
          boundCombatants = targets;
          break;
        case 'event_trigger':
          if (createdAreas.length !== 1) throw new EncounterRuleError('validation', `${definition.name} must establish exactly one event-owned area.`);
          targetBinding = 'reselect';
          break;
        case 'delayed_one_shot':
          if (targets.length === 0) throw new EncounterRuleError('validation', `${definition.name} delayed one-shot requires cast targets.`);
          if (operation.lifecycle.durationRounds !== null) {
            throw new EncounterRuleError('validation', `${definition.name} delayed one-shot cannot also declare a duration clock.`);
          }
          targetBinding = 'bound_combatants';
          boundCombatants = targets;
          break;
        case 'instance_group_activation':
          if (createdObjects.length !== operation.sequence.instanceCount) {
            throw new EncounterRuleError('validation', `${definition.name} must establish exactly ${String(operation.sequence.instanceCount)} owned instances.`);
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
        throw new EncounterRuleError('validation', 'An armed weapon-hit rider cannot defer target scaling or a damage-threshold rider.');
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
        throw new EncounterRuleError('validation', `${definition.name} requires an area placement.`);
      }
      if (operation.origin === 'anchored_to_caster' && operation.shape === null) {
        throw new EncounterRuleError('validation', `${definition.name} requires an anchored area shape.`);
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
        material: operation.material === undefined ? null : structuredClone(operation.material),
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
          throw new EncounterRuleError('validation', `${definition.name} requires an area placement for its environment operation.`);
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
                    throw new EncounterRuleError('validation', `${definition.name} requires an object placement area.`);
                  }
                  const origin = fixedOrigin(command.area);
                  if (origin.kind !== 'fixed') throw new EncounterRuleError('validation', 'Object placement did not resolve to a fixed point.');
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
              throw new EncounterRuleError('validation', `${definition.name} requires at least one world-object target.`);
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
              throw new EncounterRuleError('validation', `${definition.name} requires at least one world-object target.`);
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
              throw new EncounterRuleError('validation', 'Owned world-object movement is only available to a sustained effect activation.');
            }
            const objectTargets = command.ownedObjectTargets ?? [];
            if (objectTargets.length !== 1 || command.spatialPoint === undefined) {
              throw new EncounterRuleError('validation', `${definition.name} requires one owned object and one destination.`);
            }
            const objectId = objectTargets[0] as WorldObjectId;
            const existing = worldObject(context.state, objectId);
            const destination = command.spatialPoint;
            if (
              !isCellInside(context.state.bounds, destination) ||
              gridDistance(existing.position, destination) > declared.maximumDistanceFeet
            ) {
              throw new EncounterRuleError('validation', `${definition.name} object destination is outside its declared movement range.`);
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
              throw new EncounterRuleError('validation', 'Owned world-object group movement is only available to a sustained effect activation.');
            }
            const objectTargets = command.ownedObjectTargets ?? [];
            const destinations = command.ownedObjectDestinations ?? [];
            if (
              destinations.length !== objectTargets.length ||
              !sameIdentitySet(destinations.map((entry) => entry.objectId), objectTargets)
            ) {
              throw new EncounterRuleError('validation', `${definition.name} requires one destination for every owned instance.`);
            }
            const moves = [...destinations]
              .sort((left, right) => String(left.objectId).localeCompare(String(right.objectId)))
              .map((entry) => {
                const existing = worldObject(context.state, entry.objectId);
                if (
                  !isCellInside(context.state.bounds, entry.destination) ||
                  gridDistance(existing.position, entry.destination) > declared.maximumDistanceFeet
                ) {
                  throw new EncounterRuleError('validation', `${definition.name} group destination is outside its declared movement range.`);
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
              throw new EncounterRuleError('validation', `${definition.name} requires at least one world-object target.`);
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
      if (destinations.length !== movers.length) throw new EncounterRuleError('validation', `${definition.name} requires one destination per teleported creature.`);
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
        ) throw new EncounterRuleError('validation', `${definition.name} requires an unoccupied, occupiable destination satisfying its declared constraint.`);
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
      if (origin === undefined) throw new EncounterRuleError('validation', `${definition.name} requires a forced-movement origin point.`);
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
        throw new EncounterRuleError('validation', `${definition.name} burst must include its primary target.`);
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
          : successfulSaveDamage(
              context.state, command.actor, target, rolled.total, operation.onSaveSuccess,
              'spell_or_magical_effect',
            );
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
          : successfulSaveDamage(
              context.state, command.actor, target, roll.total, operation.onSuccess,
              'spell_or_magical_effect',
            );
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
            : successfulSaveDamage(
                context.state, command.actor, target, term.total, operation.onSuccess,
                'spell_or_magical_effect',
              );
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
        const amount = save.outcome === 'failure'
          ? initial.total
          : successfulSaveDamage(
              context.state, command.actor, target, initial.total, 'half',
              'spell_or_magical_effect',
            );
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
          : successfulSaveDamage(
              context.state, command.actor, target, rolled.total, operation.onSuccess,
              'spell_or_magical_effect',
            );
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
        throw new EncounterRuleError('validation', `${definition.name} requires a removable condition selection.`);
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
        if (subject.life !== 'dead') throw new EncounterRuleError('validation', `${definition.name} requires a dead creature.`);
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
      if (target.hitPoints !== 0 || target.life === 'dead') throw new EncounterRuleError('validation', 'Spare the Dying requires a living creature at 0 Hit Points.');
      context.state = replaceCombatant(context.state, { ...target, life: 'stable', deathSaves: null });
      return 'applied';
    }
    case 'weapon_attack_augmentation': {
      if (operation.timing === 'during_cast') {
        if (command.weaponAttack === null) throw new EncounterRuleError('validation', 'True Strike requires a weapon attack profile.');
        if (command.selectedOption !== null && command.selectedOption !== 'Radiant') {
          throw new EncounterRuleError('validation', 'True Strike damage must use the weapon type or Radiant.');
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
  throw new EncounterRuleError('validation', 'No living combatant remains in initiative.');
}

function restoreInitiativeAfterDelayedRound(state: EncounterState): EncounterState {
  const delayed = state.initiativeBeforeDelays;
  if (delayed === undefined) return state;
  const byCombatant = new Map(state.initiative.map((entry) => [entry.combatant, entry] as const));
  const restored = delayed.order.flatMap((combatant): readonly InitiativeEntry[] => {
    const entry = byCombatant.get(combatant);
    if (entry === undefined) return [];
    byCombatant.delete(combatant);
    return [entry];
  });
  const initiative = [...restored, ...byCombatant.values()];
  const { initiativeBeforeDelays: _completedDelay, ...withoutDelay } = state;
  return { ...withoutDelay, initiative };
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
  return effectiveCombatRules(state, subject.profile.id).initiativeBonus + exhaustionPenalty(
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
  if (found === undefined) throw new EncounterRuleError('validation', `Unknown world object ${id}.`);
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
    throw new EncounterRuleError('validation', error instanceof Error ? error.message : 'Invalid world object.');
  }
  if (state.worldObjects.some((candidate) => candidate.id === object.id && candidate.id !== replacing)) {
    throw new EncounterRuleError('validation', `World object ${object.id} already exists.`);
  }
  if (object.blocking.movement && state.tokens.some((placed) =>
    object.footprint.some((cell) => cellKey(cell) === cellKey(placed.position)))) {
    throw new EncounterRuleError('validation', 'A movement-blocking world object cannot overlap a combatant.');
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
        throw new EncounterRuleError('validation', 'A world-object modification must change at least one field.');
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
        throw new EncounterRuleError('validation', `World object ${existing.id} is indestructible.`);
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
        throw new EncounterRuleError('validation', error instanceof Error ? error.message : 'Invalid terrain region.');
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
        throw new EncounterRuleError('validation', error instanceof Error ? error.message : 'Invalid light region.');
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
        throw new EncounterRuleError('validation', error instanceof Error ? error.message : 'Invalid obscurement region.');
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

function worldObjectClassActionFor(
  state: EncounterState,
  objectId: WorldObjectId,
  actionId: string,
): { readonly object: WorldObject; readonly action: WorldObjectClassAction } {
  const object = worldObject(state, objectId);
  const action = object.classActions?.find((candidate) => candidate.id === actionId);
  if (action === undefined) {
    throw new EncounterRuleError('validation', `World object ${objectId} has no class action ${actionId}.`);
  }
  if (action.uses === 'once' && state.eventLog.some((event) =>
    event.type === 'world_object_used' && event.objectId === objectId && event.actionId === actionId)) {
    throw new EncounterRuleError('validation', `${action.label} has already been used.`);
  }
  return { object, action };
}

function useWorldObject(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'use_world_object' }>,
): void {
  const subject = assertActiveActor(context, command.actor);
  const { object, action } = worldObjectClassActionFor(context.state, command.objectId, command.actionId);
  if (action.eligibleActor !== 'either' && action.eligibleActor !== subject.profile.kind) {
    throw new EncounterRuleError('validation', `${action.label} is unavailable to ${subject.profile.kind}.`);
  }
  if (action.reach === 'adjacent' && gridDistance(token(context.state, command.actor).position, object.position) > 5) {
    throw new EncounterRuleError('validation', `${action.label} requires adjacency to ${object.name}.`);
  }
  spendCost(context, command.actor, action.cost, action.label);
  emit(context, {
    type: 'world_object_used', actor: command.actor, objectId: object.id,
    actionId: action.id, round: Math.max(1, context.state.round), authority: 'combatant_action',
  });
}

function overrideWorldObjectUse(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>,
): void {
  const { object, action } = worldObjectClassActionFor(context.state, command.objectId, command.actionId);
  if (action.dmOverride === undefined || action.dmOverride.actor !== command.actor) {
    throw new EncounterRuleError('validation', `${action.label} has no matching DM override control.`);
  }
  combatant(context.state, command.actor);
  emit(context, {
    type: 'adjudicated', target: command.actor,
    subject: `dm-override:world-object:${action.id}`,
    reasoning: action.dmOverride.reasoning,
    consequence: { kind: 'world_object_interaction', objectId: object.id, actionId: action.id },
  });
  emit(context, {
    type: 'world_object_used', actor: command.actor, objectId: object.id,
    actionId: action.id, round: Math.max(1, context.state.round), authority: 'dm_override',
  });
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

type DmDeathOverrideCommand = Extract<EncounterCommand, {
  readonly type:
    | 'dm_stabilize'
    | 'dm_revive_at_one_hit_point'
    | 'dm_set_death_save_counts'
    | 'dm_mark_dead';
}>;

function deathOverrideSnapshot(subject: EncounterCombatantState) {
  return {
    hitPoints: subject.hitPoints,
    lifeState: subject.life,
    successes: subject.deathSaves?.successes ?? 0,
    failures: subject.deathSaves?.failures ?? 0,
  };
}

function applyDmDeathOverride(context: ReductionContext, command: DmDeathOverrideCommand): void {
  const before = combatant(context.state, command.target);
  if (
    command.type === 'dm_set_death_save_counts' &&
    (
      !Number.isSafeInteger(command.successes) ||
      !Number.isSafeInteger(command.failures) ||
      command.successes < 0 || command.successes >= DEATH_SAVE_RESOLUTION_COUNT ||
      command.failures < 0 || command.failures >= DEATH_SAVE_RESOLUTION_COUNT
    )
  ) {
    throw new EncounterRuleError('validation', 'DM death-save counts must be safe integers from 0 through 2.');
  }
  const override = command.type === 'dm_stabilize'
    ? 'stabilize' as const
    : command.type === 'dm_revive_at_one_hit_point'
      ? 'revive_at_one_hit_point' as const
      : command.type === 'dm_set_death_save_counts'
        ? 'set_death_save_counts' as const
        : 'mark_dead' as const;
  const after: EncounterCombatantState = command.type === 'dm_stabilize'
    ? { ...before, hitPoints: 0, life: 'stable', deathSaves: null, turn: EMPTY_TURN }
    : command.type === 'dm_revive_at_one_hit_point'
      ? { ...before, hitPoints: 1, life: 'living', deathSaves: null }
      : command.type === 'dm_set_death_save_counts'
        ? {
            ...before,
            hitPoints: 0,
            life: 'dying',
            deathSaves: { successes: command.successes, failures: command.failures },
            turn: EMPTY_TURN,
          }
        : { ...before, hitPoints: 0, life: 'dead', deathSaves: null, turn: EMPTY_TURN };
  context.state = replaceCombatant(context.state, after);
  if (command.type !== 'dm_set_death_save_counts') {
    context.state = clearDeathSaveDecisions(context.state, command.target);
  }
  emit(context, {
    // Reuses D357's adjudicated subject/reasoning/consequence ruling-card envelope.
    type: 'adjudicated',
    target: command.target,
    subject: `dm-override:${override}`,
    reasoning: `DM authority override: ${override.replaceAll('_', ' ')}.`,
    consequence: {
      kind: 'death_override',
      override,
      before: deathOverrideSnapshot(before),
      after: deathOverrideSnapshot(after),
    },
  });
}

function processCommand(context: ReductionContext, command: EncounterCommand): void {
  switch (command.type) {
    case 'use_world_object':
      useWorldObject(context, command);
      return;
    case 'dm_use_world_object':
      overrideWorldObjectUse(context, command);
      return;
    case 'assume_wild_shape':
      assumeWildShape(context, command);
      return;
    case 'revert_wild_shape': {
      const subject = assertActiveActor(context, command.actor);
      if (subject.wildShape === undefined) {
        throw new WildShapeRuleError('not_wildshaped', null, `Combatant ${command.actor} is not using Wild Shape.`);
      }
      spendCost(context, command.actor, 'bonus_action', 'Revert Wild Shape');
      revertWildShape(context, command.actor, 'voluntary_bonus_action');
      return;
    }
    case 'drop_item':
    case 'pickup_item':
    case 'equip_item':
    case 'stow_item':
      processEquipmentCommand(context, command);
      return;
    case 'adjudicate': {
      if (command.reasoning.trim().length === 0) {
        throw new EncounterRuleError('validation', 'An adjudication requires DM reasoning.');
      }
      if (command.subject.trim().length === 0 || command.subject.length > 200) {
        throw new EncounterRuleError('validation', 'An adjudication subject must be non-empty and at most 200 characters.');
      }
      const subject = combatant(context.state, command.target);
      if (command.consequence.kind === 'no_effect') {
        emit(context, {
          type: 'adjudicated',
          target: command.target,
          subject: command.subject,
          reasoning: command.reasoning.trim(),
          consequence: { kind: 'no_effect' },
        });
        return;
      }
      if (command.consequence.kind === 'hit_point_delta') {
        if (!Number.isSafeInteger(command.consequence.amount)) {
          throw new EncounterRuleError('validation', 'An adjudicated Hit Point delta must be a safe integer.');
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
        throw new EncounterRuleError('validation', 'An adjudicated destination is outside the encounter grid.');
      }
      if (
        movementBlocked(context.state, consequence.to) ||
        context.state.tokens.some(
          (candidate) =>
            candidate.combatantId !== command.target &&
            cellKey(candidate.position) === cellKey(consequence.to),
        )
      ) {
        throw new EncounterRuleError('validation', 'An adjudicated destination must be unoccupied and unblocked.');
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
    case 'set_hidden_roll_category':
      context.state = {
        ...context.state,
        hiddenRolls: command.hidden
          ? [...new Set([...context.state.hiddenRolls, command.category])]
          : context.state.hiddenRolls.filter((category) => category !== command.category),
      };
      return;
    case 'dm_stabilize':
    case 'dm_revive_at_one_hit_point':
    case 'dm_set_death_save_counts':
    case 'dm_mark_dead':
      applyDmDeathOverride(context, command);
      return;
    case 'cast_spell':
      processSpellCast(context, command);
      return;
    case 'activate_sustained_effect':
      processSustainedEffectActivation(context, command);
      return;
    case 'roll_initiative': {
      if (context.state.initiative.length > 0) {
        throw new EncounterRuleError('validation', 'Initiative has already been rolled.');
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
      if (first === undefined) throw new EncounterRuleError('validation', 'Initiative order is empty.');
      startTurn(context, first.combatant, 1);
      return;
    }
    case 'move':
      processMove(context, command);
      return;
    case 'hide':
      processHide(context, command.actor);
      return;
    case 'search':
      processSearch(context, command);
      return;
    case 'reveal_hidden':
      assertActiveActor(context, command.actor);
      endHidden(context, command.actor, command.reason);
      return;
    case 'resolve_pending_decision': {
      const decision = context.state.pendingDecisions.find((candidate) => candidate.id === command.decisionId);
      if (decision === undefined) throw new PendingDecisionRuleError('unknown_decision');
      if (!decision.options.some((option) => option.id === command.optionId)) {
        throw new PendingDecisionRuleError('unknown_decision');
      }
      // Host-owned refusal prompts resolve through a typed DM override, never this reducer command.
      if (decision.kind === 'adjudication_prompt') throw new PendingDecisionRuleError('unknown_decision');
      context.state = {
        ...context.state,
        pendingDecisions: context.state.pendingDecisions.filter((candidate) => candidate.id !== decision.id),
      };
      emit(context, {
        type: 'pending_decision_resolved', decisionId: decision.id,
        combatant: decision.combatant, kind: decision.kind, optionId: command.optionId,
        boundary: { ...decision.boundary },
        reactionKind: decision.kind === 'reaction_offer' ? decision.reactionKind : null,
      });
      switch (decision.kind) {
        case 'reaction_offer':
          if (command.optionId === 'accept') {
            processAttack(
              context,
              decision.opportunityAttack.command,
              decision.opportunityAttack,
            );
          }
          return;
        case 'death_save':
          resolveDeathSave(context, decision.combatant);
          return;
        case 'legendary_action_window': {
          emit(context, {
            type: 'legendary_action_window_closed', combatant: decision.combatant,
            activeCombatant: decision.boundary.activeCombatant, round: decision.boundary.round,
          });
          if (command.optionId === 'pass') return;
          const actionId = command.optionId.slice('legendary_action:'.length);
          const action = combatant(context.state, decision.combatant).profile.rules.legendary?.actions
            .find((candidate) => candidate.id === actionId);
          if (action === undefined) throw new PendingDecisionRuleError('unknown_decision');
          executeLegendaryAction(context, decision.combatant, action);
          return;
        }
        case 'legendary_resistance':
          if (command.optionId === 'spend') {
            spendLegendaryResistance(
              context, decision.combatant, decision.failedSave.source,
              decision.failedSave.ability, decision.checkpoint,
            );
          }
          return;
      }
    }
    case 'create_persistent_area': {
      if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Create persistent area');
      if (command.featureEffectId !== undefined) {
        const feature = featureEffect(context.state, command.actor, command.featureEffectId);
        if (feature.payload.kind !== 'persistent_area') {
          throw new EncounterRuleError('validation', `Effect ${command.featureEffectId} does not create a persistent area.`);
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
          throw new EncounterRuleError('validation', `Effect ${command.featureEffectId} persistent-area declaration was altered.`);
        }
      }
      createPersistentArea(context, command.actor, command.area);
      return;
    }
    case 'move_persistent_area': {
      assertActiveActor(context, command.actor);
      const area = context.state.persistentAreas.find((candidate) => candidate.id === command.areaId);
      if (area === undefined) throw new EncounterRuleError('validation', `Unknown persistent area ${command.areaId}.`);
      if (area.owner !== command.actor || area.origin.kind !== 'fixed' || area.movable === null) {
        throw new EncounterRuleError('validation', `Persistent area ${command.areaId} is not movable by ${command.actor}.`);
      }
      const distance = Math.hypot(
        command.origin.point.x - area.origin.point.x,
        command.origin.point.y - area.origin.point.y,
      );
      if (distance > area.movable.maximumFeet) {
        throw new EncounterRuleError('validation', `Persistent area ${command.areaId} moved farther than allowed.`);
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
          throw new EncounterRuleError('validation', 'An encounter-authored world operation cannot spend a combatant resource.');
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
        throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot decline this Reaction.`);
      }
      if (context.state.activeCombatant !== command.mover) {
        throw new EncounterRuleError('validation', 'A declined Reaction must name the active mover.');
      }
      emit(context, {
        type: 'reaction_declined',
        combatant: command.actor,
        mover: command.mover,
      });
      return;
    }
    case 'force_save': {
      if (command.monsterFailureEffects !== undefined) {
        if (command.monsterActionId === undefined) {
          throw new EncounterRuleError('validation', 'Declared monster failure effects require their action id.');
        }
        const declared = declaredMonsterAction(context.state, command.actor, command.monsterActionId);
        if (
          declared.kind !== 'saving_throw' ||
          command.ability !== declared.savingThrow.ability ||
          command.dc !== declared.savingThrow.dc ||
          command.onSuccess !== (declared.success.kind === 'half_damage' ? 'half' : 'none') ||
          canonicalJson(command.damage) !== canonicalJson(declaredMonsterDamage(declared.failure.damage)) ||
          canonicalJson(command.monsterFailureEffects) !== canonicalJson(declared.failure.effects)
        ) {
          throw new EncounterRuleError('validation', `Combatant ${command.actor}'s monster save declaration was altered.`);
        }
      }
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
        'other',
        command.rollModifierEffectIds,
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
      if (save.outcome === 'failure' && command.monsterFailureEffects !== undefined) {
        applyMonsterOnHitEffects(
          context,
          command.actor,
          command.target,
          `save:${command.ability}:${String(command.dc)}`,
          command.monsterFailureEffects,
          null,
          amount,
        );
      }
      return;
    }
    case 'roll_ability_check': {
      assertActiveActor(context, command.actor);
      let escapeEffect: EncounterEffect | null = null;
      if (command.escapeEffectId !== undefined) {
        const candidate = context.state.effects.find((effect) => effect.id === command.escapeEffectId);
        if (
          candidate === undefined ||
          !candidate.targets.includes(command.actor) ||
          candidate.escapeCheck === undefined
        ) {
          throw new EncounterRuleError('validation', `Effect ${command.escapeEffectId} is not escapable by ${command.actor}.`);
        }
        escapeEffect = candidate;
        if (
          command.ability !== candidate.escapeCheck.ability ||
          command.skill !== candidate.escapeCheck.skill ||
          command.dc !== candidate.escapeCheck.dc
        ) {
          throw new EncounterRuleError('validation', 'An escape check must use the condition effect\'s declared ability, skill, and DC.');
        }
      }
      spendCost(context, command.actor, command.cost, 'Ability check');
      if (!Number.isFinite(command.bonus)) throw new EncounterRuleError('validation', 'Ability check bonus must be finite.');
      const modifier = effectDiceModifier(
        context.state, command.actor, 'ability_check', context.rng, command.skill,
      ) + rollDefenseTotalModifier(
        context, 'ability_checks', command.actor, null, 'other', command.rollModifierEffectIds,
      );
      const modifierModes = rollDefenseModes(
        context.state, 'ability_checks', command.actor, null, 'other', command.rollModifierEffectIds,
      );
      const roll = rollD20(context.rng, combineRollModes([
        abilityCheckRollMode(context.state, command.actor, command.rollMode), ...modifierModes.modes,
      ]));
      endEffects(context, modifierModes.consumed, 'trigger_consumed');
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
      if (check.outcome === 'success' && escapeEffect !== null) {
        removeEffectTarget(context, escapeEffect.id, command.actor, 'condition_removed');
      }
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
        throw new EncounterRuleError('validation', `Combatant ${command.actor} cannot react.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError('validation', `Combatant ${command.actor} has no Reaction available.`);
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
        throw new EncounterRuleError('validation', `Effect ${effect.id} does not grant a resource-fueled extra action.`);
      }
      if (subject.turn.action.kind !== 'spent') {
        throw new EncounterRuleError('validation', `Combatant ${command.actor} must spend its current action before gaining another.`);
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
        throw new EncounterRuleError('validation', `Effect ${effect.id} is not a resource-fueled timed spellcasting mode.`);
      }
      if (subject.turn.additionalLeveledSpellActionsRemaining === 1) {
        throw new EncounterRuleError('validation', 'The timed spellcasting mode is already active this turn.');
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
        throw new EncounterRuleError('validation', `Effect ${effect.id} is not a damage operation.`);
      }
      if (effect.trigger !== 'action' && effect.trigger !== 'bonus_action') {
        throw new EncounterRuleError('validation', `Effect ${effect.id} has no activatable damage cost.`);
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
        throw new EncounterRuleError('validation', `Effect ${effect.id} is not an armed weapon-hit rider.`);
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
        throw new EncounterRuleError('validation', 'Healing must be a non-negative safe integer.');
      }
      applyHealing(context, command.actor, command.target, command.amount);
      return;
    }
    case 'consume_healing_pool': {
      assertActiveActor(context, command.actor);
      const pool = context.state.effects.find((effect) => effect.id === command.effectId);
      if (pool === undefined || pool.payload.kind !== 'consumable_healing_pool') {
        throw new EncounterRuleError('validation', `Effect ${command.effectId} is not a consumable healing pool.`);
      }
      if (pool.payload.remainingUses < 1) {
        throw new EncounterRuleError('validation', `Healing pool ${command.effectId} is empty.`);
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
    case 'drink_healing_potion': {
      assertActiveActor(context, command.actor);
      const potion = context.state.effects.find((effect) => effect.id === command.effectId);
      if (potion === undefined || potion.payload.kind !== 'healing_potion') {
        throw new EncounterRuleError('validation', `Effect ${command.effectId} is not a healing potion.`);
      }
      if (potion.payload.remainingUses < 1) {
        throw new EncounterRuleError('validation', `Healing potion ${command.effectId} is empty.`);
      }
      spendCost(context, command.actor, potion.payload.activation, 'Drink Potion of Healing');
      const remaining = potion.payload.remainingUses - 1;
      context.state = {
        ...context.state,
        effects: context.state.effects.map((effect) => effect.id === potion.id
          ? { ...effect, payload: { ...potion.payload, remainingUses: remaining } }
          : effect),
      };
      let healing = potion.payload.dice.modifier;
      for (let index = 0; index < potion.payload.dice.count; index += 1) {
        healing += Math.floor(context.rng() * potion.payload.dice.sides) + 1;
      }
      applyHealing(context, command.actor, command.actor, healing);
      emit(context, {
        type: 'healing_potion_consumed',
        combatant: command.actor,
        effectId: potion.id,
        itemId: potion.payload.itemId,
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
      if (context.state.phase.kind === 'concluded') {
        throw new EncounterConcludedBoundaryError('encounter_concluded', context.state.phase);
      }
      if (context.state.activeCombatant !== command.actor) {
        throw new EncounterRuleError('validation', `Combatant ${command.actor} is not the active combatant.`);
      }
      if (context.state.pendingDecisions.some((decision) =>
        decision.boundary.activeCombatant === command.actor && decision.boundary.round === context.state.round)) {
        throw new PendingDecisionRuleError('turn_boundary_blocked');
      }
      if (queueLegendaryActionWindows(context, command.actor)) return;
      const currentIndex = context.state.activeInitiativeIndex;
      if (currentIndex === null) throw new EncounterRuleError('validation', 'Initiative is not active.');
      processBoundary(context, command.actor, 'end');
      emit(context, { type: 'turn_ended', combatant: command.actor, round: context.state.round });
      let nextIndex = nextLivingInitiativeIndex(context.state, currentIndex);
      const startsNewRound = nextIndex <= currentIndex;
      if (startsNewRound) {
        context.state = restoreInitiativeAfterDelayedRound(context.state);
        nextIndex = nextLivingInitiativeIndex(context.state, context.state.initiative.length - 1);
      }
      const next = context.state.initiative[nextIndex];
      if (next === undefined) throw new EncounterRuleError('validation', 'Next initiative entry is missing.');
      const round = startsNewRound ? context.state.round + 1 : context.state.round;
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
  options: EncounterReductionOptions = {},
): EncounterReduction {
  const context: ReductionContext = {
    state: { ...state, revision: state.revision + 1 },
    rng: transactionalRng(rng),
    events: [],
    reactionDecision: options.reactionDecision ?? null,
  };
  const resolvedDecision = command.type === 'resolve_pending_decision'
    ? state.pendingDecisions.find((decision) => decision.id === command.decisionId)
    : undefined;
  const deferredLegendaryBoundary = resolvedDecision?.kind === 'legendary_action_window';
  const resumedLegendaryBoundary = command.type === 'end_turn' &&
    resumesLegendaryTurnBoundary(state, command.actor);
  processCommand(context, command);
  const conclusion = deferredLegendaryBoundary
    ? null
    : encounterConclusionAfter(state, context.state) ??
      (resumedLegendaryBoundary
        ? encounterConclusionFromCurrentState(context.state)
        : null);
  if (conclusion !== null) context.state = { ...context.state, phase: conclusion };
  return { state: context.state, events: context.events };
}
